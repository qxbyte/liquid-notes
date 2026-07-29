#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
vault_root=${1:?Usage: scripts/install-local.sh <vault-root>}
config_dir="$vault_root/.obsidian"
target_dir="$config_dir/themes/Liquid Notes"

if [[ ! -d "$config_dir" ]]; then
  echo "Not an Obsidian vault: $vault_root" >&2
  exit 1
fi

if [[ ! -f "$repo_root/manifest.json" || ! -f "$repo_root/theme.css" ]]; then
  echo "Theme release files are missing from: $repo_root" >&2
  exit 1
fi

mkdir -p "$target_dir"
install -m 0644 "$repo_root/manifest.json" "$target_dir/manifest.json"
install -m 0644 "$repo_root/theme.css" "$target_dir/theme.css"

echo "Installed Liquid Notes to $target_dir"
