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
