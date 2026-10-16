import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web", "--output-dir", "dist-docs"],
  {
    env: { ...process.env, BKLIT_DOCS_PREVIEW: "1" },
    stdio: "inherit",
  }
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
