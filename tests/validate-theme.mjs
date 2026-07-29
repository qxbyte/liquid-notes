import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
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

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
].filter(Boolean);

let chromeBinary;
const runBrowserFixture = (label, extraArguments = []) => {
  let browserResult;
  const candidates = chromeBinary ? [chromeBinary] : chromeCandidates;

  for (const candidate of candidates) {
    const result = spawnSync(candidate, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      ...extraArguments,
      "--dump-dom",
      `file://${path.join(root, "tests/render-fixture.html")}`,
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 10_000 });

    if (!result.error || result.error.code !== "ENOENT") {
      browserResult = result;
      chromeBinary = candidate;
      break;
    }
  }

  assert.ok(chromeBinary, "A Chrome or Chromium binary is required for computed-style tests");
  assert.notEqual(browserResult.error?.code, "ETIMEDOUT", `${label}: Chrome computed-style fixture timed out`);
  assert.equal(browserResult.status, 0, browserResult.stderr || `${label}: Chrome fixture failed`);

  const resultMatch = browserResult.stdout.match(/<output id="test-results">([^<]+)<\/output>/);
  assert.ok(resultMatch, `${label}: Browser fixture did not emit test results`);
  const computedStyleResult = JSON.parse(resultMatch[1].replaceAll("&quot;", "\"").replaceAll("&amp;", "&"));
  assert.deepEqual(computedStyleResult.failures, [], `${label}\n${computedStyleResult.failures.join("\n")}`);
};

runBrowserFixture("desktop", ["--window-size=1280,900"]);
runBrowserFixture("mobile", ["--window-size=760,900"]);
runBrowserFixture("reduced motion", ["--force-prefers-reduced-motion"]);

const thirdPartyNotices = await read("THIRD_PARTY_NOTICES.md");
assert.match(thirdPartyNotices, /Lucide/i, "Icon notice must identify Lucide");
assert.match(thirdPartyNotices, /ISC License/i, "Icon notice must include Lucide's ISC license");

const showcase = await read("tests/showcase.md");
for (const language of ["swift", "javascript", "python", "json", "bash", "css"]) {
  assert.ok(showcase.includes("```" + language), `Showcase must include a ${language} code fence`);
}
for (const markdownPattern of [/^# /m, /^> /m, /^- \[[ x]\] /m, /^\|.+\|$/m, /^> \[!\w+\]/m]) {
  assert.match(showcase, markdownPattern, `Showcase is missing Markdown fixture ${markdownPattern}`);
}

for (const requiredFile of [
  "README.md",
  "CHANGELOG.md",
  "scripts/install-local.sh",
  ".github/workflows/validate.yml",
]) {
  await access(path.join(root, requiredFile));
}

for (const imageFile of [
  "screenshot.png",
  "assets/preview-light.png",
  "assets/preview-dark.png",
  "assets/code-dark.png",
]) {
  const image = await readFile(path.join(root, imageFile));
  assert.deepEqual(
    [...image.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${imageFile} must be an actual PNG file`,
  );
}

const installerFixture = await mkdtemp(path.join(tmpdir(), "liquid-notes-installer-"));
try {
  const invalidVault = path.join(installerFixture, "not-a-vault");
  await mkdir(invalidVault);
  const rejectedInstall = spawnSync("bash", [path.join(root, "scripts/install-local.sh"), invalidVault], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(rejectedInstall.status, 0, "Installer must reject directories without .obsidian");
  assert.match(rejectedInstall.stderr, /Not an Obsidian vault/, "Installer rejection must explain the invalid vault");

  const validVault = path.join(installerFixture, "vault");
  await mkdir(path.join(validVault, ".obsidian"), { recursive: true });
  const acceptedInstall = spawnSync("bash", [path.join(root, "scripts/install-local.sh"), validVault], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(acceptedInstall.status, 0, acceptedInstall.stderr || "Installer must accept a valid vault");
  assert.equal(
    await readFile(path.join(validVault, ".obsidian/themes/Liquid Notes/manifest.json"), "utf8"),
    await read("manifest.json"),
    "Installed manifest must match the repository",
  );
  assert.equal(
    await readFile(path.join(validVault, ".obsidian/themes/Liquid Notes/theme.css"), "utf8"),
    await read("theme.css"),
    "Installed CSS must match the repository",
  );
} finally {
  await rm(installerFixture, { recursive: true, force: true });
}

console.log("Theme validation passed");
