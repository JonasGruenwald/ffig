//// Here we are testing the functions of fixtures/generated_module.gleam directly.
//// Kind of a sanity check to ensure the generated modules actually work.

import fixtures/generated_module

pub fn arrow_function_test() {
  assert generated_module.exported_arrow_function() == 42.0
}

pub fn bool_test() {
  assert generated_module.set_and_get_bool(True) == True
}

pub fn string_test() {
  assert generated_module.set_and_get_string("Hello Joe!") == "Hello Joe!"
}
