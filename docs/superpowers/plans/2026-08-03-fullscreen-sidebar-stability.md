# Fullscreen Sidebar Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make fullscreen sidebars visually unified and stable without changing the existing windowed glass appearance.

**Architecture:** Simulate Obsidian's `.is-fullscreen` state in the existing browser fixture and assert opaque, blur-free sidebar surfaces. Add one narrowly scoped CSS override that unifies the ribbon and both side splits on the existing semantic sidebar color.

**Tech Stack:** CSS custom properties, HTML, browser `getComputedStyle`, Node.js built-in test script, headless Chrome/Chromium

## Global Constraints

- Fullscreen ribbon and left and right sidebars use one opaque semantic sidebar color.
- Fullscreen ribbon and sidebars do not use backdrop blur.
- Windowed mode keeps its existing translucent backgrounds and blur.
- Menus, modals, tooltips, title bars, and content controls are unchanged.
- The existing `node tests/validate-theme.mjs` command remains the single validation entry point.
- Do not add dependencies.

---

### Task 1: Stabilize Fullscreen Sidebar Surfaces

**Files:**
- Modify: `tests/render-fixture.html:164`
- Modify: `tests/render-fixture.html:489-510`
- Modify: `theme.css:237-255`

**Interfaces:**
- Consumes: Obsidian's `.is-fullscreen` state class and existing `--background-secondary-alt` semantic color.
- Produces: A fullscreen-only sidebar surface rule for `.workspace-ribbon`, `.workspace-split.mod-left-split`, and `.workspace-split.mod-right-split`.

- [ ] **Step 1: Write the failing fullscreen computed-style test**

Change the dark fixture root to simulate Obsidian fullscreen mode:

```html
    <main id="dark-root" class="theme-dark workspace is-fullscreen">
```

Add a minimal right sidebar before the dark fixture footer:

```html
      <aside id="dark-right-sidebar" class="workspace-split mod-right-split">Right sidebar</aside>
```

After the existing tooltip assertion, add fullscreen expectations and a guarded windowed regression assertion:

```javascript
      expectStyle("#dark-root .workspace-ribbon", "backgroundColor", "rgb(36, 36, 38)");
      expectStyle("#dark-sidebar", "backgroundColor", "rgb(36, 36, 38)");
      expectStyle("#dark-right-sidebar", "backgroundColor", "rgb(36, 36, 38)");
      expectStyle("#dark-root .workspace-ribbon", "backdropFilter", "none");
      expectStyle("#dark-root .workspace-ribbon", "webkitBackdropFilter", "none");
      expectStyle("#dark-sidebar", "backdropFilter", "none");
      expectStyle("#dark-sidebar", "webkitBackdropFilter", "none");
      expectStyle("#dark-right-sidebar", "backdropFilter", "none");
      expectStyle("#dark-right-sidebar", "webkitBackdropFilter", "none");
      if (!matchMedia("(prefers-reduced-transparency: reduce)").matches) {
        expectStyleIncludes("#light-sidebar", "backdropFilter", "blur(");
      }
```

- [ ] **Step 2: Run the validator and confirm the fullscreen test fails**

Run:

```bash
node tests/validate-theme.mjs
```

Expected: FAIL in the desktop fixture because the fullscreen ribbon is transparent and the fullscreen sidebar still has a translucent background and blur.

- [ ] **Step 3: Add the fullscreen-only sidebar override**

Add this rule after the base side-split styles and before the macOS window chrome section:

```css
.is-fullscreen .workspace-ribbon,
.is-fullscreen .workspace-split.mod-left-split,
.is-fullscreen .workspace-split.mod-right-split {
  --ribbon-background: var(--background-secondary-alt);
  background-color: var(--background-secondary-alt);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
```

- [ ] **Step 4: Run the complete validator**

Run:

```bash
node tests/validate-theme.mjs
```

Expected: PASS with `Theme validation passed`.

- [ ] **Step 5: Review and commit the implementation**

Run:

```bash
git diff --check
git diff -- theme.css tests/render-fixture.html
git add theme.css tests/render-fixture.html
git commit -m "fix: stabilize fullscreen sidebar surfaces" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: The implementation diff contains the fullscreen fixture state, a minimal right sidebar, fullscreen/windowed computed-style assertions, and one scoped CSS rule; the commit succeeds.

- [ ] **Step 6: Back up and synchronize the local theme**

Run:

```bash
backup="$HOME/.copilot/session-state/11e7dae7-b73f-430e-857b-3f23359ba7fe/files/liquid-notes-before-fullscreen-fix-20260803"
target="/Users/xueqiang/Obsidian/Notes/.obsidian/themes/Liquid Notes"
mkdir -p "$backup"
cp "$target/manifest.json" "$backup/manifest.json"
cp "$target/theme.css" "$backup/theme.css"
./scripts/install-local.sh --force "/Users/xueqiang/Obsidian/Notes"
cmp -s manifest.json "$target/manifest.json"
cmp -s theme.css "$target/theme.css"
```

Expected: The local theme files match the latest feature branch byte for byte, and the pre-fix local files remain in the session backup directory.
