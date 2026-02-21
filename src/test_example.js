import { MyExampleType$ExampleOne, MyGenericExampleType$Wobblerone } from "./example_gleam_type.mjs";
export function greet(name, age) {
    return `Hello ${name}, you are ${age} years old`;
}
export const add = (a, b) => {
    return a + b;
};
export function processData(items, count) {
    return items.length === count;
}
export function returnExampleType() {
    return MyExampleType$ExampleOne("Hello");
}
export function returnExampleTypeInferred() {
    return MyExampleType$ExampleOne("Hello");
}
export function returnFunction() {
    return new Promise((resolve, reject) => {
        resolve(42);
    });
}
export function returnPromise() {
    return Promise.resolve();
}
export function nestedPromise() {
    return Promise.resolve(MyExampleType$ExampleOne("nested"));
}
export function promiseOfArray() {
    return Promise.resolve([1, 2, 3]);
}
export function mapExample() {
    return new Map();
}
export function otherExample() {
    return new Map();
}
export function myTuple() {
    return [1, "two"];
}
class Wobble {
    foo;
    constructor() {
        this.foo = "hey!";
    }
}
export function myObject() {
    return new Wobble();
}
export function genericGleamType() {
    return MyGenericExampleType$Wobblerone("foo");
}
