import ffig
import gleam/io
import pprint

pub fn main() {
  ffig.resolve_external_functions("test/test_example.ts")
  |> pprint.format()
  |> io.println
}
