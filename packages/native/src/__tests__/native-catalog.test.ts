import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  createNativeChartSpec,
  nativeChartCatalog,
} from "../../../../apps/native/lib/native-catalog";
import {
  chartSlugs,
  generateNativeCode,
  parseChartSpec,
} from "../../../chart-spec/src/index";
import { validChartSlugs } from "../../../studio/src/chart-slugs";

test("every web chart family has a round-trippable native catalog configuration", () => {
  assert.deepEqual(new Set(chartSlugs), new Set(validChartSlugs));
  assert.equal(nativeChartCatalog.length, validChartSlugs.length);
  assert.deepEqual(
    new Set(nativeChartCatalog.map((entry) => entry.slug)),
    new Set(chartSlugs)
  );
  for (const entry of nativeChartCatalog) {
    const spec = createNativeChartSpec(entry.slug);
    assert.deepEqual(parseChartSpec(JSON.stringify(spec)), spec, entry.slug);
  }
});

test("area catalog default uses the Area stroke without a duplicate Line layer", () => {
  const spec = createNativeChartSpec("area-chart");
  assert.deepEqual(
    spec.layers.map((layer) => layer.type),
    ["area"]
  );
});

test("Studio-generated examples for all 17 families compile against the public native API", () => {
  const files = new Map(
    nativeChartCatalog.map((entry) => [
      path.resolve("src/__tests__/generated", `${entry.slug}.tsx`),
      generateNativeCode(createNativeChartSpec(entry.slug)),
    ])
  );
  const options: ts.CompilerOptions = {
    allowImportingTsExtensions: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    types: ["react", "react-native"],
    paths: {
      "@bklitui/native": [path.resolve("src/index.ts")],
      "@bklitui/native/*": [path.resolve("src/*")],
    },
  };
  const host = ts.createCompilerHost(options);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (name) => files.has(name) || fileExists(name);
  host.readFile = (name) => files.get(name) ?? readFile(name);
  host.getSourceFile = (
    name,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  ) => {
    const source = files.get(name);
    return source === undefined
      ? getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(
          name,
          source,
          languageVersion,
          true,
          ts.ScriptKind.TSX
        );
  };
  const program = ts.createProgram([...files.keys()], options, host);
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((item) => item.category === ts.DiagnosticCategory.Error);
  const message = ts.formatDiagnosticsWithColorAndContext(errors.slice(0, 30), {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });
  assert.equal(errors.length, 0, message);
});
