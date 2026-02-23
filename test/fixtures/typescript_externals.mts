import {
  ComplexType$OtherVariantOne,
  GenericType$GenericVariantOne,
  SimpleType$VariantOne,
  SimpleType$VariantThree,
  SimpleType$VariantTwo,
} from "./gleam_types.mjs";

import { Result, Result$Error, Result$Ok } from "../gleam.mjs";

export function getSimpleGleamType(target: number) {
  switch (target) {
    case 1:
      return SimpleType$VariantOne();
    case 2:
      return SimpleType$VariantTwo();
    case 3:
      return SimpleType$VariantThree();
  }
}

export function getComplexGleamType(input: string) {
  return ComplexType$OtherVariantOne(input, 123);
}

export function getGenericGleamTypeString(input: string) {
  return GenericType$GenericVariantOne("wibble", input);
}

export function getGenericGleamTypeNumber(input: number) {
  return GenericType$GenericVariantOne("wibble", input);
}

export function getGleamResult(): Result<string, string> {
  if (Math.random() > 0.5) {
    return Result$Ok("Oh yes!");
  } else {
    return Result$Error("Oh no!");
  }
}

export function setAndGetNumber(input: number) {
  return input;
}

export function setAndGetBool(input: boolean) {
  return input;
}

export function setAndGetString(input: string) {
  return input;
}

export function getPromise() {
  return Promise.resolve("wobble");
}

export function getVoidPromise() {
  return Promise.resolve();
}

class MyClass {}

export function getClass() {
  return new MyClass();
}

export function getTuple(): [string, number, boolean] {
  return ["woble", 321, false];
}

export function getArray(length: number) {
  const output: number[] = [];
  for (let i = 0; i < length; i++) {
    output.push(i);
  }
  return output;
}

export function getUnion(): boolean | string | number {
  return 1;
}

// deliberately using snake_case here to make sure it gets handled right
export const exported_arrow_function = () => 42;

const wobble = (input: boolean) => {
  return Promise.resolve("Hello");
};

export { wobble as declaredAndLaterExported };

export const numberToString = (input: number) => `${input}`;

export const shuffleMyTuple = ([a, b, c]: [number, string, boolean]): [
  boolean,
  string,
  number,
] => [c, b, a];

export const returnMyResult = (): Result<string, string> =>
  Result$Ok("Good news everyone!");

export const iPromiseYouAnArray = (): Promise<Array<number>> =>
  Promise.resolve([1, 2, 3]);

type MyJavaScriptType = {
  name: string;
};

export const getMyType = (): MyJavaScriptType => ({
  name: "wibble",
});

export const whatWillItBe = (): string | boolean | number => "I don't know";

export const neverReturn = (): never => {
  process.exit();
};

export const returnUnknown = (): unknown => {
  return "?";
};

/**
 * This function has some jsdoc documentation
 */
export function documentedFunction() {
  return "Hello Joe!";
}

export function returnAny(): any {}

export function returnObject(): Object {
  return Object.create(null);
}

export const returnUndefined = (): undefined => undefined;

export const addSomeHandler = (
  channel: string,
  callback: (event: Event) => void,
) => {
  if (channel === "news") {
    callback(new CustomEvent("newsflash"));
  }
};
