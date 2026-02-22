import ts from "typescript";
import {
  type Type$,
  type ExternalFunction$,
  type ExecutionError$,
  ExecutionError$NoConfigFile,
  Parameter$Parameter,
  ExternalFunction$ExternalFunction,
  Type$GleamString,
  Type$GleamFloat,
  Type$GleamBool,
  Type$GleamNil,
  Type$GleamTuple,
  Type$GleamDynamic,
  Type$JavaScriptArray,
  Type$GleamCustomType,
  Type$JavaScriptPromise,
  Type$OpaqueExternal,
} from "./ffig.mjs";
import { Result$Ok, Result$Error, type Result } from "./gleam.mjs";
import { writeFileSync } from "node:fs";

const GLEAM_BUILD_ENTRY = "/build/dev/javascript/";

const format_module_path = (input: string) => {
  const parts = input.split(GLEAM_BUILD_ENTRY);
  const after_entry = parts[parts.length - 1].replace(".d.mts", "");
  // remove the module folder name itself from the path
  return after_entry.split("/").slice(1).join("/");
};

const format_type_name = (input: string) =>
  input.split("<")[0].replace("$", "");

const resolve_type = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  currentFile?: string,
): Type$ => {
  const type_string = typeChecker.typeToString(
    type,
    undefined,
    ts.TypeFormatFlags.NoTruncation,
  );
  const type_ref = type as ts.TypeReference;
  const type_arguments = [
    ...(type_ref.typeArguments ?? type.aliasTypeArguments ?? []),
  ].map((t) => resolve_type(t, typeChecker, currentFile));
  const symbol = type.getSymbol() || type.aliasSymbol;
  // Check if this is a Gleam custom type
  if (symbol && symbol.declarations && symbol.declarations.length > 0) {
    const declaration = symbol.declarations[0];
    const sourceFile = declaration.getSourceFile();
    if (
      sourceFile &&
      sourceFile.fileName &&
      sourceFile.fileName.includes(GLEAM_BUILD_ENTRY)
    ) {
      return Type$GleamCustomType(
        format_module_path(sourceFile.fileName),
        format_type_name(type_string),
        type_arguments,
      );
    }
  }

  if (type.flags & ts.TypeFlags.String) {
    return Type$GleamString();
  } else if (type.flags & ts.TypeFlags.Number) {
    return Type$GleamFloat();
  } else if (type.flags & ts.TypeFlags.Boolean) {
    return Type$GleamBool();
  } else if (
    type.flags & ts.TypeFlags.Void ||
    type.flags & ts.TypeFlags.Undefined
  ) {
    return Type$GleamNil();
  } else if (type.flags & ts.TypeFlags.Null) {
    return Type$GleamDynamic();
  } else if (type.flags & ts.TypeFlags.Union) {
    return Type$GleamDynamic();
  } else if (type.flags & ts.TypeFlags.Intersection) {
    return Type$GleamDynamic();
  } else if (type.flags & ts.TypeFlags.Object) {
    const objectType = type as ts.ObjectType;

    if (typeChecker.isTupleType(type)) {
      const element_types = typeChecker
        .getTypeArguments(type as ts.TypeReference)
        .map((t) => resolve_type(t, typeChecker, currentFile));
      return Type$GleamTuple(element_types);
    } else if (typeChecker.isArrayType(type)) {
      const element_types = typeChecker
        .getTypeArguments(type as ts.TypeReference)
        .map((t) => resolve_type(t, typeChecker, currentFile));
      if (element_types.length === 1) {
        return Type$JavaScriptArray(element_types[0]);
      } else {
        console.warn("Array type without single type argument", type);

        return Type$GleamDynamic();
      }
    } else if (objectType.objectFlags & ts.ObjectFlags.Reference) {
      if (type_string.startsWith("Promise<") && type_arguments.length === 1) {
        return Type$JavaScriptPromise(type_arguments[0]);
      }
    }
  }
  return Type$OpaqueExternal(type_string);
};

export const resolve_external_functions = (
  filepath: string,
): Result<Array<ExternalFunction$>, ExecutionError$> => {
  const configPath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists,
    "tsconfig.json",
  );

  if (!configPath) {
    return Result$Error(ExecutionError$NoConfigFile());
  }

  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => {
        // TODO: handle this properly
        console.error("Unrecoverable config file diagnostics!");
      },
    },
  );

  const file_names = new Set(parsedCommandLine.fileNames);
  file_names.add(filepath);
  const program = ts.createProgram({
    rootNames: Array.from(file_names),
    options: parsedCommandLine.options,
  });

  const source_file = program.getSourceFile(filepath);
  if (!source_file) {
    throw new Error(`Could not find source file: ${filepath}`);
  }

  const type_checker = program.getTypeChecker();
  const results: ExternalFunction$[] = [];

  ts.forEachChild(source_file, (node) => {
    // Re-exported declarations (e.g., export { fn as alias })
    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      node.exportClause.elements.forEach((specifier) => {
        const local_name = specifier.propertyName ?? specifier.name;
        const exported_name = specifier.name;
        const symbol = type_checker.getSymbolAtLocation(local_name);
        if (symbol) {
          const type = type_checker.getTypeOfSymbolAtLocation(
            symbol,
            local_name,
          );
          const signatures = type.getCallSignatures();
          if (signatures.length > 0) {
            const signature = signatures[0];
            const parameters = signature.getParameters().map((param) => {
              const param_type = type_checker.getTypeOfSymbolAtLocation(
                param,
                local_name,
              );
              return Parameter$Parameter(
                param.getName(),
                resolve_type(param_type, type_checker, filepath),
              );
            });
            const return_type = signature.getReturnType();
            results.push(
              ExternalFunction$ExternalFunction(
                exported_name.text,
                parameters,
                resolve_type(return_type, type_checker, filepath),
              ),
            );
          }
        }
      });
      return;
    }

    const is_exported =
      (ts.getCombinedModifierFlags(node as ts.Declaration) &
        ts.ModifierFlags.Export) !==
      0;

    if (!is_exported) return;

    // Exported function declarations (e.g. export function wobble(){})
    if (ts.isFunctionDeclaration(node) && node.name) {
      const signature = type_checker.getSignatureFromDeclaration(node);
      if (signature) {
        const parameters = signature.getParameters().map((param) => {
          const param_type = type_checker.getTypeOfSymbolAtLocation(
            param,
            node,
          );
          return Parameter$Parameter(
            param.getName(),
            resolve_type(param_type, type_checker, filepath),
          );
        });

        const return_type = signature.getReturnType();

        results.push(
          ExternalFunction$ExternalFunction(
            node.name.text,
            parameters,
            resolve_type(return_type, type_checker, filepath),
          ),
        );
      }
    }

    // Exported function expressions (e.g., export const fn = () => {})
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer)) &&
          ts.isIdentifier(declaration.name)
        ) {
          const symbol = type_checker.getSymbolAtLocation(declaration.name);
          if (symbol) {
            const type = type_checker.getTypeOfSymbolAtLocation(
              symbol,
              declaration.name,
            );
            const signatures = type.getCallSignatures();

            if (signatures.length > 0) {
              const signature = signatures[0];
              const parameters = signature.getParameters().map((param) => {
                const param_type = type_checker.getTypeOfSymbolAtLocation(
                  param,
                  declaration.name,
                );
                return Parameter$Parameter(
                  param.getName(),
                  resolve_type(param_type, type_checker, filepath),
                );
              });

              const return_type = signature.getReturnType();

              results.push(
                ExternalFunction$ExternalFunction(
                  declaration.name.text,
                  parameters,
                  resolve_type(return_type, type_checker, filepath),
                ),
              );
            }
          }
        }
      });
    }
  });

  return Result$Ok(results);
};

export const exit = (code: number) => {
  process.exit(code);
};
