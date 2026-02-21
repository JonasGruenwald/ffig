import gleam/io
import gleam/javascript/array.{type Array}

pub type ExecutionError {
  NoConfigFile
  SourceFileNotFound
}

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

pub type Parameter {
  Parameter(name: String, parameter_type: Type)
}

pub type ExternalFunction {
  ExternalFunction(
    name: String,
    parameters: Array(Parameter),
    return_type: Type,
  )
}

pub fn main() -> Nil {
  io.println("Hello from ffig!")
}

@external(javascript, "./ffig_ffi.mjs", "resolve_external_types")
pub fn resolve_external_types(file_path: String) -> Result(Array(ExternalFunction), ExecutionError)