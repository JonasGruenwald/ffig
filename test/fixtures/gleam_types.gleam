//// Declaring some types here, which we will then use in typescript via 
//// the Gleam generated functions

pub type TypeWithoutConstructors

pub type SimpleType {
  VariantOne
  VariantTwo
  VariantThree
}

pub type ComplexType {
  OtherVariantOne(wibble: String, wobble: Int)
  OtherVariantTwo(wibble: String)
  OtherVariantThree
}

pub type GenericType(variable) {
  GenericVariantOne(wibble: String, wobble: variable)
  GenericVariantTwo(wibble: String, wobble: variable)
}
