import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFile(path.join(root, name), "utf8");

const manifest = JSON.parse(await read("manifest.json"));
assert.deepEqual(manifest, {
  name: "Liquid Notes",
  version: "1.0.0",
  minAppVersion: "1.12.7",
  author: "qxbyte",
  authorUrl: "https://github.com/qxbyte",
});

const css = await read("theme.css");
assert.doesNotMatch(css, /@import|https?:\/\//i, "theme.css must not load remote resources");
assert.doesNotMatch(css, /\/Users\/|[A-Z]:\\/i, "theme.css must not contain private paths");

console.log("Theme validation passed");
