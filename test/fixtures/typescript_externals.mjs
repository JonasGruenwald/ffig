import { ComplexType$OtherVariantOne, GenericType$GenericVariantOne, SimpleType$VariantOne, SimpleType$VariantThree, SimpleType$VariantTwo, } from "./gleam_types.mjs";
import { Result$Error, Result$Ok } from "../gleam.mjs";
export function getSimpleGleamType(target) {
    switch (target) {
        case 1:
            return SimpleType$VariantOne();
        case 2:
            return SimpleType$VariantTwo();
        case 3:
            return SimpleType$VariantThree();
    }
}
export function getComplexGleamType(input) {
    return ComplexType$OtherVariantOne(input, 123);
}
export function getGenericGleamTypeString(input) {
    return GenericType$GenericVariantOne("wibble", input);
}
export function getGenericGleamTypeNumber(input) {
    return GenericType$GenericVariantOne("wibble", input);
}
export function getGleamResult() {
    if (Math.random() > 0.5) {
        return Result$Ok("Oh yes!");
    }
    else {
        return Result$Error("Oh no!");
    }
}
export function setAndGetNumber(input) {
    return input;
}
export function setAndGetBool(input) {
    return input;
}
export function setAndGetString(input) {
    return input;
}
export function getPromise() {
    return Promise.resolve("wobble");
}
export function getVoidPromise() {
    return Promise.resolve();
}
class MyClass {
}
export function getClass() {
    return new MyClass();
}
export function getTuple() {
    return ["woble", 321, false];
}
export function getArray(length) {
    const output = [];
    for (let i = 0; i < length; i++) {
        output.push(i);
    }
    return output;
}
export function getUnion() {
    return 1;
}
// deliberately using snake_case here to make sure it gets handled right
export const exported_arrow_function = () => 42;
const wobble = (input) => {
    return Promise.resolve("Hello");
};
export { wobble as declaredAndLaterExported };
export const numberToString = (input) => `${input}`;
export const shuffleMyTuple = ([a, b, c]) => [c, b, a];
export const returnMyResult = () => Result$Ok("Good news everyone!");
export const iPromiseYouAnArray = () => Promise.resolve([1, 2, 3]);
export const getMyType = () => ({
    name: "wibble",
});
export const whatWillItBe = () => "I don't know";
export const neverReturn = () => {
    process.exit();
};
export const returnUnknown = () => {
    return "?";
};
/**
 * This function has some jsdoc documentation
 */
export function documentedFunction() {
    return "Hello Joe!";
}
export function returnAny() { }
export function returnObject() {
    return Object.create(null);
}
export const returnUndefined = () => undefined;
