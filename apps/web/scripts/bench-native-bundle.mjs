import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const entry = new URL("../../../packages/native/src/index.ts", import.meta.url)
  .pathname;
const external = [
  "react",
  "react/*",
  "react-native",
  "react-native/*",
  "react-native-svg",
  "react-native-reanimated",
  "react-native-gesture-handler",
  "react-native-worklets",
];
const results = [];
for (const [name, code] of [
  [
    "line-only-public-entry",
    `import { LineChart } from ${JSON.stringify(entry)}; export { LineChart };`,
  ],
  ["all-public-exports", `export * from ${JSON.stringify(entry)};`],
]) {
  const result = await build({
    stdin: { contents: code, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true,
    minify: true,
    treeShaking: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    target: "es2022",
    jsx: "automatic",
    external,
    write: false,
    metafile: true,
  });
  const output = result.outputFiles[0];
  const modules = Object.values(result.metafile.outputs).flatMap((item) =>
    Object.entries(item.inputs)
      .filter(([, info]) => info.bytesInOutput > 0)
      .map(([path]) => path)
  );
  results.push({
    name,
    minifiedBytes: output.contents.length,
    gzipBytes: gzipSync(output.contents).length,
    retainedModules: modules.length,
    includesWorldAtlas: modules.some((path) => path.includes("world-atlas")),
  });
}
process.stdout.write(
  `${JSON.stringify({ tool: "esbuild with native/React peers external; not a Metro/Hermes install-size measurement", results }, null, 2)}\n`
);
