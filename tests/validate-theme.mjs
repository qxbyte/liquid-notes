import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
assert.doesNotMatch(css, /!important/i, "theme.css must remain user-overridable without !important");
assert.doesNotMatch(css, /:has\(/i, "theme.css must avoid expensive :has() selectors");
for (const hoverRule of css.matchAll(/([^{}]*:hover[^{}]*)\{([^{}]*)\}/g)) {
  assert.doesNotMatch(
    hoverRule[2],
    /\b(?:width|height|min-width|max-width|min-height|max-height|margin(?:-[\w-]+)?|padding(?:-[\w-]+)?|border(?:-[\w-]+)?-width)\s*:/i,
    `Hover rule must not change layout geometry: ${hoverRule[1].trim()}`,
  );
}
const reducedTransparencyStart = css.indexOf("@media (prefers-reduced-transparency: reduce)");
const reducedMotionStart = css.indexOf("@media (prefers-reduced-motion: reduce)", reducedTransparencyStart);
assert.ok(reducedTransparencyStart >= 0 && reducedMotionStart > reducedTransparencyStart, "Reduced-transparency fallback block must exist");
const reducedTransparencyBlock = css.slice(reducedTransparencyStart, reducedMotionStart);
for (const selector of [
  ".workspace-split.mod-left-split",
  ".canvas-controls",
  ".canvas-card-menu",
  ".graph-controls",
  ".pdf-toolbar",
  ".pdf-sidebar-container",
]) {
  assert.ok(reducedTransparencyBlock.includes(selector), `Reduced-transparency fallback must cover ${selector}`);
}
assert.match(reducedTransparencyBlock, /-webkit-backdrop-filter:\s*none;/, "Reduced-transparency fallback must disable WebKit blur");
assert.match(reducedTransparencyBlock, /(?:^|\n)\s*backdrop-filter:\s*none;/, "Reduced-transparency fallback must disable standard blur");

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
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      ...extraArguments,
      "--dump-dom",
      `file://${path.join(root, "tests/render-fixture.html")}`,
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 30_000 });

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
  if (label === "reduced motion") assert.equal(computedStyleResult.media.reducedMotion, true, "Chrome must emulate reduced motion");
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

const storeScreenshot = await readFile(path.join(root, "screenshot.png"));
assert.equal(storeScreenshot.readUInt32BE(16), 512, "screenshot.png must be 512 pixels wide");
assert.equal(storeScreenshot.readUInt32BE(20), 288, "screenshot.png must be 288 pixels high");
for (const imageFile of ["assets/preview-light.png", "assets/preview-dark.png", "assets/code-dark.png"]) {
  const image = await readFile(path.join(root, imageFile));
  assert.equal(image.readUInt32BE(16), 912, `${imageFile} must be 912 pixels wide`);
  assert.equal(image.readUInt32BE(20), 513, `${imageFile} must be 513 pixels high`);
  assert.ok(image.byteLength >= 32 * 1024, `${imageFile} must retain enough detail for README presentation`);
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

  const installedTheme = path.join(validVault, ".obsidian/themes/Liquid Notes/theme.css");
  await writeFile(installedTheme, "local customization\n");
  const protectedInstall = spawnSync("bash", [path.join(root, "scripts/install-local.sh"), validVault], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(protectedInstall.status, 0, "Installer must not overwrite a customized existing theme by default");
  assert.match(protectedInstall.stderr, /already exists with different content/i, "Installer must explain how to update an existing theme");
  assert.equal(await readFile(installedTheme, "utf8"), "local customization\n", "Rejected install must preserve customized theme CSS");

  const forcedInstall = spawnSync("bash", [path.join(root, "scripts/install-local.sh"), "--force", validVault], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(forcedInstall.status, 0, forcedInstall.stderr || "--force must update an existing theme intentionally");
  assert.equal(await readFile(installedTheme, "utf8"), await read("theme.css"), "--force must install current theme CSS");

  const outsideTarget = path.join(installerFixture, "outside-theme.css");
  await writeFile(outsideTarget, "outside file\n");
  await rm(installedTheme);
  await symlink(outsideTarget, installedTheme);
  const symlinkInstall = spawnSync("bash", [path.join(root, "scripts/install-local.sh"), "--force", validVault], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(symlinkInstall.status, 0, "Installer must reject symlinked release targets");
  assert.match(symlinkInstall.stderr, /symbolic link/i, "Symlink rejection must explain the unsafe target");
  assert.equal(await readFile(outsideTarget, "utf8"), "outside file\n", "Installer must not follow a symlink outside the theme directory");

  const linkedThemesVault = path.join(installerFixture, "linked-themes-vault");
  const outsideThemes = path.join(installerFixture, "outside-themes");
  await mkdir(path.join(linkedThemesVault, ".obsidian"), { recursive: true });
  await mkdir(outsideThemes);
  await symlink(outsideThemes, path.join(linkedThemesVault, ".obsidian/themes"));
  const linkedThemesInstall = spawnSync("bash", [path.join(root, "scripts/install-local.sh"), linkedThemesVault], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(linkedThemesInstall.status, 0, "Installer must reject a symlinked themes directory");
  assert.match(linkedThemesInstall.stderr, /symbolic link/i, "Themes-directory rejection must explain the unsafe target");
} finally {
  await rm(installerFixture, { recursive: true, force: true });
}

console.log("Theme validation passed");
