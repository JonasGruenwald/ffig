import { MyExampleType$ExampleOne, MyExampleType$, MyGenericExampleType$, MyGenericExampleType$Wobblerone$0, MyGenericExampleType$Wobblerone } from "./example_gleam_type.mjs"

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


export function returnFunction(): Promise<number> {
  return new Promise((resolve, reject) => {
    resolve(42)
  })
}

export function returnPromise() {
  return Promise.resolve()
}

export function nestedPromise(): Promise<MyExampleType$> {
  return Promise.resolve(MyExampleType$ExampleOne("nested"))
}

export function promiseOfArray(): Promise<number[]> {
  return Promise.resolve([1, 2, 3])
}

export function mapExample(): Map<string, MyExampleType$> {
  return new Map()
}

export function otherExample(): Map<string, Promise<MyExampleType$>> {
  return new Map()
}

export function myTuple(): [number, string] {
  return [1, "two"]
}

class Wobble {
  foo: string
  constructor() {
    this.foo = "hey!"
  }
}

export function myObject() {
  return new Wobble()
}

export function genericGleamType() {
  return MyGenericExampleType$Wobblerone("foo")
}