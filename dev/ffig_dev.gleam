import gleam/io
import ffig
import pprint

pub fn main(){
   ffig.resolve_external_types("src/test_example.ts")
   |> pprint.format()
   |> io.println
}