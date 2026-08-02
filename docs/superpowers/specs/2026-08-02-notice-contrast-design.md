# Notification Contrast Design

## Problem

Obsidian notices currently inherit a near-white message background and white
accent text in Liquid Notes light mode, making notification content unreadable.
The theme does not define a paired foreground and background treatment for the
`.notice` component.

## Behavior

- Light theme notices use a dark background and light text.
- Dark theme notices use a light background and dark text.
- Notification colors remain scoped to `.notice` and do not change menus,
  modals, tooltips, or other message-like components.

## Design

Define `--ln-notice-background` and `--ln-notice-text` in both theme palettes.
The light palette derives the notice background from the dark primary text
color and the notice text from the light canvas color. The dark palette
reverses those roles, deriving the notice background from the light primary
text color and the notice text from the dark canvas color.

Apply both variables to `.notice` in the functional-layer component styles.
Using paired semantic variables prevents foreground and background colors from
drifting independently while keeping the rule isolated from Obsidian's global
message variables.

## Testing

Add a `.notice` element to each theme root in the browser render fixture.
Computed-style assertions verify that:

- The light notice has a dark background and light foreground.
- The dark notice has a light background and dark foreground.
- The two themes reverse foreground and background roles.

The existing theme validator remains the single test command.
