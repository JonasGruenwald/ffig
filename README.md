# `ffig` – Generate Gleam Externals from Typescript

## Usage

1. Set up your project with a `tsconfig.json`
2. Write some exported functions in a typescript file like `externals_ffi.mts`
3. Generate a Gleam module with bindings to those functions:

```sh
gleam run -m ffig src/externals_ffi.mts externals
```

An `externals.gleam` file should be generated for you.
