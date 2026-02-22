import birdie
import ffig
import gleeunit
import pprint

pub fn main() -> Nil {
  gleeunit.main()
}

pub fn resolve_external_functions_test() {
  let assert Ok(external_functions) =
    ffig.resolve_external_functions("test/fixtures/typescript_externals.mts")

  external_functions
  |> pprint.format()
  |> birdie.snap("external_functions")
}

pub fn generate_module_test() {
  let external_path = "test/fixtures/typescript_externals.mts"
  let target_filename = "typescript_externals_bindings"
  let assert Ok(external_functions) =
    ffig.resolve_external_functions("test/fixtures/typescript_externals.mts")

  ffig.generate_module(external_path, target_filename, external_functions)
  |> pprint.format()
  |> birdie.snap("generated_module_abstract")
}
