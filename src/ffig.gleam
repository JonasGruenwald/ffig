import filepath
import gleam/io
import gleam/javascript/array.{type Array}
import gleam/list
import gleam/result
import gleam/set.{type Set}
import gleam/string
import justin

@internal
pub type ExecutionError {
  NoConfigFile
  SourceFileNotFound
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
    output_path: String,
  )
}

pub fn main() -> Nil {
  io.println("Hello from ffig!")
}

@internal
pub fn generate_module(
  external_file_path: String,
  target_file_name: String,
  functions_array: Array(ExternalFunction),
) {
  let external_file_directory = filepath.directory_name(external_file_path)
  let output_path =
    filepath.join(external_file_directory, target_file_name <> ".gleam")
  array.to_list(functions_array)
  |> list.fold(
    GeneratedModule(
      imports: set.new(),
      external_types: set.new(),
      external_functions: [],
      output_path:,
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

      let external_file_name = filepath.base_name(external_file_path)
      let external_file_extension =
        filepath.extension(external_file_name) |> result.unwrap("")
      let external_file_name =
        string.replace(external_file_name, "." <> external_file_extension, "")
      let external_target_file_name = "./" <> external_file_name <> ".mjs"
      let external_definition =
        build_external_attribute(external_target_file_name, current.name)
      let function_name = justin.snake_case(current.name)
      let parameter_definitions =
        list.map(parameters, fn(parameter) {
          justin.snake_case(parameter.name)
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

fn expand_types(input: List(Type), accumulator: List(Type)) {
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

fn build_external_attribute(external_file_name: String, name: String) {
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
      case arguments {
        [] -> {
          module_name <> "." <> name
        }
        arguments -> {
          module_name
          <> "."
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

fn module_name(module_path: String) {
  let parts =
    string.split(module_path, "/")
    |> list.reverse()

  case parts {
    [name, ..] -> name
    [] -> ""
  }
}

@external(javascript, "./ffig_ffi.mjs", "resolve_external_functions")
@internal
pub fn resolve_external_functions(
  file_path: String,
) -> Result(Array(ExternalFunction), ExecutionError)
