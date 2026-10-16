import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(packageRoot, "src");
const testFilePattern = /\.test\.(?:mjs|ts)$/;

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTests(path);
    }
    return entry.isFile() && testFilePattern.test(entry.name) ? [path] : [];
  });
}

const tests = collectTests(sourceRoot).sort();
if (tests.length === 0) {
  console.error(`No test files found under ${sourceRoot}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...tests],
  {
    stdio: "inherit",
    cwd: packageRoot,
  }
);

process.exit(result.status ?? 1);
