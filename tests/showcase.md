---
cssclasses:
  - liquid-notes-showcase
tags:
  - design
  - obsidian
---

# Liquid Notes

一套为专注写作设计的 macOS 风格 Obsidian 主题。A calm workspace for notes, code, and connected ideas.

## Typography and links

正文应当保持清晰、稳定，并同时支持 **粗体**、*斜体*、==高亮==、[内部链接](#liquid-notes)、[外部链接](https://obsidian.md) 与 `inline code`。

### Tasks

- [x] Adaptive light and dark palettes
- [x] Finder-like navigation
- [ ] Community review

#### Structured information

| Element | Purpose | Status |
| --- | --- | --- |
| Glass controls | Navigation and actions | Ready |
| Content canvas | Reading and editing | Ready |
| Code palette | Semantic syntax | Ready |

> A content-first theme uses glass to clarify controls, not to decorate every surface.

> [!info] Design principle
> Liquid Glass belongs to the functional layer. The note itself stays calm and readable.

> [!warning] Compatibility
> Unsupported blur effects fall back to solid semantic surfaces.

##### Swift

```swift
import SwiftUI

struct SettingsView: View {
    @AppStorage("accentColor") private var accentColor = "systemBlue"

    var body: some View {
        Form {
            Section("Appearance") {
                Text("Liquid Notes")
                Toggle("Follow system appearance", isOn: .constant(true))
            }
        }
    }
}
```

##### JavaScript

```javascript
const theme = {
  name: "Liquid Notes",
  modes: ["light", "dark"],
  accent: "#007AFF",
};

export function resolveMode(prefersDark) {
  return prefersDark ? theme.modes[1] : theme.modes[0];
}
```

##### Python

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Palette:
    accent: str
    surface: str

LIGHT = Palette(accent="#007AFF", surface="#FFFFFF")
```

##### JSON

```json
{
  "name": "Liquid Notes",
  "version": "1.0.0",
  "minAppVersion": "1.12.7",
  "author": "qxbyte"
}
```

##### Bash

```bash
vault_root=${1:?Usage: install-local.sh <vault-root>}
target_dir="$vault_root/.obsidian/themes/Liquid Notes"
mkdir -p "$target_dir"
```

##### CSS

```css
.theme-light {
  --interactive-accent: #007aff;
}

.theme-dark {
  --interactive-accent: #0a84ff;
}
```

###### Details

Tags use semantic color and compact geometry: #obsidian #theme #liquid-glass.

Footnotes remain visually quiet while staying discoverable.[^1]

[^1]: This fixture contains only public, synthetic content for theme verification.
