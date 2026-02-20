import ts from "typescript";

interface FunctionTypeInfo {
  name: string;
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
}

const resolve_export_types = (filepath: string): FunctionTypeInfo[] => {
  // Read tsconfig.json if available
  // TODO: change this as its silly
  const fileDir = filepath.substring(0, filepath.lastIndexOf("/"));
  const configPath = ts.findConfigFile(
    fileDir,
    ts.sys.fileExists,
    "tsconfig.json"
  );

  let program: ts.Program;

  if (configPath) {
    const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
      configPath,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: () => { },
      }
    );

    if (parsedCommandLine) {
      const fileNames = new Set(parsedCommandLine.fileNames);
      fileNames.add(filepath);

      program = ts.createProgram({
        rootNames: Array.from(fileNames),
        options: parsedCommandLine.options,
      });
    } else {
      // TODO: handle error here
    }
  } else {
    // No tsconfig found, use defaults
    program = ts.createProgram([filepath], {});
  }

  const sourceFile = program.getSourceFile(filepath);
  if (!sourceFile) {
    throw new Error(`Could not find source file: ${filepath}`);
  }

  const typeChecker = program.getTypeChecker();
  const results: FunctionTypeInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    const isExported = (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
    if (!isExported) return;
    if (ts.isFunctionDeclaration(node) && node.name) {
      const signature = typeChecker.getSignatureFromDeclaration(node);
      if (signature) {
        const parameters = signature.getParameters().map((param) => {
          const paramType = typeChecker.getTypeOfSymbolAtLocation(param, node);
          return {
            name: param.getName(),
            type: typeChecker.typeToString(paramType),
          };
        });

        const returnType = signature.getReturnType();
        const returnTypeString = typeChecker.typeToString(
          returnType,
          undefined,
          ts.TypeFormatFlags.NoTruncation
        );

        results.push({
          name: node.name.text,
          parameters,
          returnType: returnTypeString,
        });
      }
    }

    // Handle variable declarations with function expressions (e.g., export const fn = () => {})
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) &&
          ts.isIdentifier(declaration.name)
        ) {
          const symbol = typeChecker.getSymbolAtLocation(declaration.name);
          if (symbol) {
            const type = typeChecker.getTypeOfSymbolAtLocation(symbol, declaration.name);
            const signatures = type.getCallSignatures();

            if (signatures.length > 0) {
              const signature = signatures[0];
              const parameters = signature.getParameters().map((param) => {
                const paramType = typeChecker.getTypeOfSymbolAtLocation(param, declaration.name);
                return {
                  name: param.getName(),
                  type: typeChecker.typeToString(paramType),
                };
              });

              const returnType = signature.getReturnType();
              const returnTypeString = typeChecker.typeToString(
                returnType,
                undefined,
                ts.TypeFormatFlags.NoTruncation
              );

              results.push({
                name: declaration.name.text,
                parameters,
                returnType: returnTypeString,
              });
            }
          }
        }
      });
    }
  });

  return results;
}

// Run when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Usage: node src/ffig_ffi.mts <typescript-file>");
    process.exit(1);
  }

  const result = resolve_export_types(targetFile);
  console.log(JSON.stringify(result, null, 2));
}