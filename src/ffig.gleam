import argv
import filepath
import gleam/io
import gleam/javascript/array.{type Array}
import gleam/list
import gleam/result
import gleam/set.{type Set}
import gleam/string
import justin
import simplifile

@internal
pub type ExecutionError {
  NoConfigFile
  SourceFileNotFound
  FailedToWriteOutput(error: simplifile.FileError)
}

@internal
pub type Type {
  GleamBool
  GleamFloat
  GleamString
  GleamNil
  GleamDynamic
  JavaScriptArray(element: Type)
  JavaScriptPromise(value: Type)
  GleamTuple(items: Array(Type))
  GleamCustomType(
    module_path: String,
    name: String,
    type_arguments: Array(Type),
  )
  OpaqueExternal(name: String)
}

@internal
pub type Parameter {
  Parameter(name: String, parameter_type: Type)
}

@internal
pub type ExternalFunction {
  ExternalFunction(
    name: String,
    parameters: Array(Parameter),
    return_type: Type,
  )
}

@internal
pub type ExternalFunctionDefinition {
  ExternalFunctionDefinition(target: ExternalFunction, name: String)
}

@internal
pub type GeneratedModule {
  GeneratedModule(
    imports: Set(String),
    external_types: Set(String),
    external_functions: List(String),
    directory: String,
    input_filename: String,
    output_filename: String,
  )
}

pub fn main() -> Nil {
  let argv.Argv(arguments:, ..) = argv.load()

  case arguments {
    [target_file, output_name] -> {
      case run(target_file, output_name) {
        Ok(module) -> {
          io.println(
            "✨ Generated "
            <> filepath.join(module.directory, module.output_filename),
          )
          exit(0)
        }
        Error(NoConfigFile) -> {
          io.println(
            "Error resolving typescript config, make sure you have a tsconfig.json in the current directory",
          )
          exit(1)
        }
        Error(SourceFileNotFound) -> {
          io.println(
            "Error loading source file, make sure " <> target_file <> " exists!",
          )
          exit(1)
        }
        Error(FailedToWriteOutput(error)) -> {
          io.println(
            "Error writing output file: " <> simplifile.describe_error(error),
          )
        }
      }
    }
    _ -> {
      io.println("Usage:\n")
      io.println(
        "gleam run -m ffig ./path/to/external_file.mts output_module_name\n",
      )
      exit(1)
    }
  }
}

fn run(
  target_file: String,
  output_name: String,
) -> Result(GeneratedModule, ExecutionError) {
  use external_functions <- result.try(resolve_external_functions(target_file))
  let module = generate_module(target_file, output_name, external_functions)
  let output = module_to_string(module)
  let output_file_path = filepath.join(module.directory, module.output_filename)

  case simplifile.write(output_file_path, output) {
    Ok(_) -> Ok(module)
    Error(error) -> Error(FailedToWriteOutput(error))
  }
}

@internal
pub fn module_to_string(generated_module: GeneratedModule) -> String {
  let source_path =
    filepath.join(generated_module.directory, generated_module.input_filename)
  let plain_output_name =
    string.replace(generated_module.output_filename, ".gleam", "")
  let header =
    "//// This module contains bindings to the external functions defined in\n//// `"
    <> source_path
    <> "`  \n"
    <> "//// > This module was generated automatically by **ffig**, do not edit it manually!  \n"
    <> "//// > To re-generate, run `gleam run -m ffig "
    <> source_path
    <> " "
    <> plain_output_name
    <> "`\n"

  let import_declarations =
    set.fold(generated_module.imports, "", fn(accumulator, current) {
      accumulator <> "import " <> current <> "\n"
    })

  let type_declarations =
    set.fold(generated_module.external_types, "", fn(accumulator, current) {
      accumulator <> "pub type " <> current <> "\n"
    })

  let external_declarations =
    generated_module.external_functions |> string.join("\n\n")

  header
  <> "\n"
  <> import_declarations
  <> "\n"
  <> type_declarations
  <> "\n"
  <> external_declarations
}

@internal
pub fn generate_module(
  external_file_path: String,
  target_file_name: String,
  functions_array: Array(ExternalFunction),
) -> GeneratedModule {
  let external_file_name = filepath.base_name(external_file_path)
  let external_file_extension =
    filepath.extension(external_file_name) |> result.unwrap("")
  let external_file_name_without_extension =
    string.replace(external_file_name, "." <> external_file_extension, "")
  let external_target_file_name = external_file_name_without_extension <> ".mjs"

  let external_file_directory = filepath.directory_name(external_file_path)
  let output_filename = target_file_name <> ".gleam"
  array.to_list(functions_array)
  |> list.fold(
    GeneratedModule(
      imports: set.new(),
      external_types: set.new(),
      external_functions: [],
      output_filename: output_filename,
      input_filename: external_file_name,
      directory: external_file_directory,
    ),
    fn(module: GeneratedModule, current: ExternalFunction) {
      let parameters = array.to_list(current.parameters)
      let all_types =
        [
          current.return_type,
          ..list.map(parameters, fn(parameter) { parameter.parameter_type })
        ]
        |> expand_types([])

      let imports =
        list.filter_map(all_types, fn(type_item) {
          case type_item {
            // Types from the prelude - we don't need an import
            GleamCustomType(module_path: "", name: _, type_arguments: _) -> {
              Error(Nil)
            }
            GleamCustomType(module_path:, name: _, type_arguments: _) -> {
              Ok(module_path)
            }
            JavaScriptArray(_) -> {
              Ok("gleam/javascript/array")
            }
            JavaScriptPromise(_) -> {
              Ok("gleam/javascript/promise")
            }
            GleamDynamic -> {
              Ok("gleam/dynamic")
            }
            _ -> Error(Nil)
          }
        })

      let external_types =
        list.filter_map(all_types, fn(type_item) {
          case type_item {
            OpaqueExternal(name:) -> Ok(name)
            _ -> Error(Nil)
          }
        })
      let external_definition =
        build_external_attribute(external_target_file_name, current.name)
      let function_name = format_function_name(current.name)
      let parameter_definitions =
        list.map(parameters, fn(parameter) {
          format_parameter_name(parameter.name)
          <> ": "
          <> build_type_definition(parameter.parameter_type)
        })
        |> string.join(", ")

      let return_definition = build_type_definition(current.return_type)
      let function_definition =
        "pub fn "
        <> function_name
        <> "("
        <> parameter_definitions
        <> ") -> "
        <> return_definition

      let external_function = external_definition <> "\n" <> function_definition

      GeneratedModule(
        ..module,
        external_functions: [external_function, ..module.external_functions],
        imports: set.union(module.imports, set.from_list(imports)),
        external_types: set.union(
          module.external_types,
          set.from_list(external_types),
        ),
      )
    },
  )
}

fn expand_types(input: List(Type), accumulator: List(Type)) -> List(Type) {
  case input {
    [] -> accumulator
    [current, ..rest] -> {
      case current {
        JavaScriptArray(element:) ->
          expand_types([element, ..rest], [current, ..accumulator])
        JavaScriptPromise(value:) ->
          expand_types([value, ..rest], [current, ..accumulator])

        GleamTuple(items:) -> {
          expand_types(list.append(array.to_list(items), rest), [
            current,
            ..accumulator
          ])
        }
        GleamCustomType(module_path: _, name: _, type_arguments:) -> {
          expand_types(list.append(array.to_list(type_arguments), rest), [
            current,
            ..accumulator
          ])
        }
        _ -> expand_types(rest, [current, ..accumulator])
      }
    }
  }
}

fn build_external_attribute(external_file_name: String, name: String) -> String {
  "@external(javascript, \"./"
  <> external_file_name
  <> "\", \""
  <> name
  <> "\")"
}

fn build_type_definition(input: Type) -> String {
  case input {
    GleamBool -> "Bool"
    GleamFloat -> "Float"
    GleamString -> "String"
    GleamNil -> "Nil"
    GleamDynamic -> "dynamic.Dynamic"
    JavaScriptArray(element:) ->
      "array.Array(" <> build_type_definition(element) <> ")"
    JavaScriptPromise(value:) ->
      "promise.Promise(" <> build_type_definition(value) <> ")"
    GleamTuple(items:) ->
      "#("
      <> list.map(array.to_list(items), build_type_definition)
      |> string.join(", ")
      <> ")"
    GleamCustomType(module_path:, name:, type_arguments:) -> {
      let module_name = module_name(module_path)
      let arguments = array.to_list(type_arguments)
      let prefix = case module_name {
        "" -> ""
        module_name -> module_name <> "."
      }
      case arguments {
        [] -> {
          prefix <> name
        }
        arguments -> {
          prefix
          <> name
          <> "("
          <> list.map(arguments, build_type_definition) |> string.join(", ")
          <> ")"
        }
      }
    }
    OpaqueExternal(name:) -> name
  }
}

fn module_name(module_path: String) -> String {
  let parts =
    string.split(module_path, "/")
    |> list.reverse()

  case parts {
    [name, ..] -> name
    [] -> ""
  }
}

fn format_function_name(name) {
  // TODO: properly ensure gleam-safe name here
  string.trim(name)
  |> justin.snake_case()
}

fn format_parameter_name(name) {
  // TODO: properly ensure gleam-safe name here
  let name = string.trim(name) |> justin.snake_case
  case name {
    "0" <> _
    | "1" <> _
    | "2" <> _
    | "3" <> _
    | "4" <> _
    | "5" <> _
    | "6" <> _
    | "7" <> _
    | "8" <> _
    | "9" <> _ -> {
      "arg_" <> name
    }
    _ -> name
  }
}

@external(javascript, "./ffig_ffi.mjs", "resolve_external_functions")
@internal
pub fn resolve_external_functions(
  file_path: String,
) -> Result(Array(ExternalFunction), ExecutionError)

@external(javascript, "./ffig_ffi.mjs", "exit")
fn exit(exit_code: Int) -> Nil
