import { access, cp, mkdir, rm } from "node:fs/promises";

const source = new URL("../../native/dist-docs/", import.meta.url);
const destination = new URL("../public/native-preview/", import.meta.url);

// This directory contains only the generated Expo export, never source files.
await access(new URL("index.html", source));
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
