# Fullscreen Sidebar Stability Design

## Problem

In macOS fullscreen mode, Obsidian changes the native translucent window
material beneath the workspace. Liquid Notes currently renders the ribbon
with a transparent background while each side split uses a separate
semi-transparent background and `backdrop-filter`. These independent
compositing layers can show different colors and repeatedly repaint, making
the sidebar appear detached and flicker.

Windowed mode does not exhibit the problem and must retain its current glass
appearance.

## Behavior

- Fullscreen ribbon and left and right sidebars use one opaque semantic
  sidebar color.
- Fullscreen ribbon and sidebars do not use backdrop blur.
- Windowed mode keeps its existing translucent backgrounds and blur.
- Menus, modals, tooltips, title bars, and content controls are unchanged.

## Design

Add a narrowly scoped `.is-fullscreen` rule for `.workspace-ribbon`,
`.workspace-split.mod-left-split`, and `.workspace-split.mod-right-split`.
Set both `--ribbon-background` and `background-color` to
`--background-secondary-alt`, then disable standard and WebKit backdrop
filters.

Using the existing opaque semantic sidebar token keeps light and dark themes
adaptive without introducing new colors. Scoping the override to fullscreen
sidebar surfaces avoids changing the working windowed appearance or unrelated
glass components.

## Testing

Mark the dark browser fixture as fullscreen and assert that its ribbon and
sidebar:

- Resolve to the same opaque background color.
- Resolve both backdrop-filter properties to `none`.

Keep the light fixture windowed and assert that its sidebar still has a blur
filter. The existing `node tests/validate-theme.mjs` command remains the
single validation entry point.
