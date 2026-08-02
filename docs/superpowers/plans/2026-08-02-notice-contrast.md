# Notification Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Obsidian notifications use a dark background with light text in the light theme and a light background with dark text in the dark theme.

**Architecture:** Add paired notice foreground and background variables to each existing theme palette, then apply them only to Obsidian's `.notice` component. Extend the existing browser fixture so computed styles prove both themes use the intended inverse, high-contrast colors.

**Tech Stack:** CSS custom properties, HTML, browser `getComputedStyle`, Node.js built-in test runner script, headless Chrome/Chromium

## Global Constraints

- Light theme notices use a dark background and light text.
- Dark theme notices use a light background and dark text.
- Notification colors remain scoped to `.notice` and do not change menus, modals, tooltips, or other message-like components.
- The existing `node tests/validate-theme.mjs` command remains the single test command.
- Do not add dependencies.

---

### Task 1: Add Inverse Notification Colors

**Files:**
- Modify: `tests/render-fixture.html:56-101`
- Modify: `tests/render-fixture.html:208-212`
- Modify: `theme.css:47-53`
- Modify: `theme.css:128-134`
- Modify: `theme.css:213-230`

**Interfaces:**
- Consumes: Existing `.theme-light` and `.theme-dark` palette variables `--ln-text` and `--ln-canvas`; existing fixture helpers `expectStyle()` and `expectContrast()`.
- Produces: Theme variables `--ln-notice-background` and `--ln-notice-text`; scoped `.notice` foreground and background styles.

- [x] **Step 1: Write the failing browser fixture**

Add a notice beside the existing menu, modal, and tooltip fixtures in each theme root:

```html
      <div id="light-notice" class="notice">Light notification</div>
```

```html
      <div id="dark-notice" class="notice">Dark notification</div>
```

Add these assertions after the existing light tooltip assertion:

```javascript
      expectStyle("#light-notice", "backgroundColor", "rgb(29, 29, 31)");
      expectStyle("#light-notice", "color", "rgb(255, 255, 255)");
      expectStyle("#dark-notice", "backgroundColor", "rgb(245, 245, 247)");
      expectStyle("#dark-notice", "color", "rgb(28, 28, 30)");
      expectContrast("#light-notice", 4.5);
      expectContrast("#dark-notice", 4.5);
```

- [x] **Step 2: Run the validator and confirm the regression test fails**

Run:

```bash
node tests/validate-theme.mjs
```

Expected: FAIL in the desktop browser fixture because `.notice` does not yet have the expected background and foreground colors.

- [x] **Step 3: Define paired notice palette variables**

In `.theme-light`, add these declarations after `--ln-highlight`:

```css
  --ln-notice-background: var(--ln-text);
  --ln-notice-text: var(--ln-canvas);
```

Add the same semantic declarations after `--ln-highlight` in `.theme-dark`:

```css
  --ln-notice-background: var(--ln-text);
  --ln-notice-text: var(--ln-canvas);
```

Because the underlying palette values invert between themes, the light theme resolves to `#1d1d1f` on `#ffffff`, while the dark theme resolves to `#f5f5f7` on `#1c1c1e`.

- [x] **Step 4: Apply both colors only to Obsidian notices**

Add this component rule after the shared functional-layer blur rule and before `.titlebar`:

```css
.notice {
  color: var(--ln-notice-text);
  background-color: var(--ln-notice-background);
}
```

- [x] **Step 5: Run the complete validator**

Run:

```bash
node tests/validate-theme.mjs
```

Expected: PASS with `Theme validation passed`.

- [x] **Step 6: Review and commit the implementation**

Run:

```bash
git diff --check
git diff -- theme.css tests/render-fixture.html
git add theme.css tests/render-fixture.html
git commit -m "fix: correct notification theme contrast" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: The diff contains only the paired notice variables, scoped `.notice` rule, fixture elements, and computed-style assertions; the commit succeeds.
