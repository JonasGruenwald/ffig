# `ffig` – Generate Gleam Externals from Typescript

> [!CAUTION]
> This is a work in progress and might break at any point!
> Notably there is no proper error handling for typescript files yet, typescript files with problems will just generate bad output

## Setup

### Typescript Configuration

Install the `typescript` package in your project, using your preferred js package manager.

Set up your project with a `tsconfig.json`. For an application (not a library!) that might look something like this:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "esnext",
    "allowJs": true,
    "baseUrl": ".",
    "outDir": "build/dev/javascript/wobble",
    "rootDirs": ["src", "dev", "test", "build/dev/javascript/wobble"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

With the `outDir` set to the directory where Gleam puts its output files as well, and included in `rootDirs` like that you'll be able to import functions from Gleam into your typescript files without typescript complaining, and all the build
output will go into `build/dev/javascript/wobble`.  
Run **first** the Gleam build and **second** the Typescript build.

This won't work for a published library (like this one) because your project can't be built by the Gleam build tool alone that way.  
For a published library the simplest way is likely to include the typescript build output in the `src` directory.

## Usage

Create a typescript file with exported functions that you want to generate bindings to, name it something like `wobble_ffi.mts`

When you run `ffig` without any arguments, it will find all files in `src`, `dev` and `test` ending in `_ffi.mts` and generate bindings for them in a gleam module by the same name without `_ffi`.

```sh
gleam run -m ffig
```

You can also run `ffig` manually for each typescript file that you want to generate bindings to, it takes two arguments:

1.  The path to the typescript file, like `src/wobble_ffi.mts`
2.  The name of the gleam module that should be generated, like `wobble` (without the `.gleam` file extension!)

So the command would be

```sh
gleam run -m ffig src/wobble_ffi.mts wobble
```

This generates a Gleam module in `src/wobble.gleam` that contains public functions binding to the exported typescript funtions.

## Supported Bindings

### Primitive Types

`ffig` translates primitive JS types to Gleam wherever possible, note that it will never produce a Gleam Int for a number because all numbers are floats in JS

`wobble_ffi.mts`

```ts
export const numberToString = (input: number) => `${input}`;
```

`wobble.gleam`

```gleam
@external(javascript, "./wobble_ffi.mjs", "numberToString")
pub fn number_to_string(input: Float) -> String
```

### Tuples

When tuples are explicitlty declared in typescript, `ffig` will turn them into Gleam tuples.

`wobble_ffi.mts`

```ts
// Note the explicitly declared tuple return type!
// Without that, typescript would infer the type as an array of number | string | boolean
export const shuffleMyTuple = ([a, b, c]: [number, string, boolean]): [
  boolean,
  string,
  number,
] => [c, b, a];
```

`wobble.gleam`

```gleam
@external(javascript, "./wobble_ffi.mjs", "shuffleMyTuple")
pub fn shuffle_my_tuple(arg_0: #(Float, String, Bool)) -> #(Bool, String, Float)
```

### Gleam Types

When you construct Gleam types in your FFI code using the appropriate constructors as described in [the externals guide](https://gleam.run/documentation/externals/#Gleam-data-in-JavaScript), either from your own modules or from the Gleam prelude, ffig should recognize them as Gleam types and import them appropriately.

`wobble_ffi.mts`

```ts
import { Result, Result$Ok } from "./gleam.mjs";

export const returnMyResult = (): Result<string, string> =>
  Result$Ok("Good news everyone!");
```

`wobble.gleam`

```gleam
@external(javascript, "./wobble_ffi.mjs", "returnMyResult")
pub fn return_my_result() -> Result(String, String)
```

### Arrays and Promises

Arrays and promises are supported by `gleam_javascript`, so when used `ffig` will declare them as such in the generated module.

`wobble_ffi.mts`

```ts
export const iPromiseYouAnArray = (): Promise<Array<number>> =>
  Promise.resolve([1, 2, 3]);
```

`wobble.gleam`

```gleam
import gleam/javascript/array
import gleam/javascript/promise

@external(javascript, "./wobble_ffi.mjs", "iPromiseYouAnArray")
pub fn i_promise_you_an_array() -> promise.Promise(array.Array(Float))
```

### External Types

It's common practice to declare external types that can't be represented in Gleam and should only be used via FFI as types without any constructors. `ffig` will add such types to the module when it encounters typed JS objects and classes.

`wobble_ffi.mts`

```ts
type MyJavaScriptType = {
  name: string;
};

export const getMyType = (): MyJavaScriptType => ({
  name: "wibble",
});
```

`wobble.gleam`

```gleam
pub type MyJavaScriptType

@external(javascript, "./wobble_ffi.mjs", "getMyType")
pub fn get_my_type() -> MyJavaScriptType
```

### And the Rest

For typescript types that can't otherwise be represented in Gleam, such as unions, intersections and null, `ffig` will set the type to dynamic. You can then decode them on the Gleam side if desired.

The same is done for the `any` type from typescript, so if you explicitly want something to be generated as dynamic in Gleam, you can just set the type to `any` on the typescript side.

`wobble_ffi.mts`

```ts
export const whatWillItBe = (): string | boolean | number => "I don't know";
```

`wobble.gleam`

```gleam
import gleam/dynamic

@external(javascript, "./wobble_ffi.mjs", "whatWillItBe")
pub fn what_will_it_be() -> dynamic.Dynamic
```

## References

- [Externals in the Gleam tour](https://tour.gleam.run/advanced-features/externals/)
- [Gleam Externals Guide](https://gleam.run/documentation/externals/#Gleam-data-in-JavaScript)
