import { MyExampleType$ExampleOne, MyExampleType$ } from "./example_gleam_type.mjs"

export function greet(name: string, age: number): string {
  return `Hello ${name}, you are ${age} years old`;
}

export const add = (a: number, b: number): number => {
  return a + b;
}

export function processData(items: string[], count: number): boolean {
  return items.length === count;
}

export function returnExampleType(): MyExampleType$ {
  return MyExampleType$ExampleOne("Hello")
}

export function returnExampleTypeInferred() {
  return MyExampleType$ExampleOne("Hello")
}