#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
force=0

if [[ ${1:-} == "--force" ]]; then
  force=1
  shift
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/install-local.sh [--force] <vault-root>" >&2
  exit 2
fi

vault_root=$1
config_dir="$vault_root/.obsidian"
themes_dir="$config_dir/themes"
target_dir="$config_dir/themes/Liquid Notes"

if [[ ! -d "$config_dir" ]]; then
  echo "Not an Obsidian vault: $vault_root" >&2
  exit 1
fi

if [[ ! -f "$repo_root/manifest.json" || ! -f "$repo_root/theme.css" ]]; then
  echo "Theme release files are missing from: $repo_root" >&2
  exit 1
fi

if [[ -L "$themes_dir" ]]; then
  echo "Refusing to install through a symbolic link: $themes_dir" >&2
  exit 1
fi

if [[ -L "$target_dir" ]]; then
  echo "Refusing to install into a symbolic link: $target_dir" >&2
  exit 1
fi

if [[ -e "$target_dir" && ! -d "$target_dir" ]]; then
  echo "Theme target exists but is not a directory: $target_dir" >&2
  exit 1
fi

for release_file in manifest.json theme.css; do
  if [[ -L "$target_dir/$release_file" ]]; then
    echo "Refusing to overwrite a symbolic link: $target_dir/$release_file" >&2
    exit 1
  fi
done

if [[ -f "$target_dir/manifest.json" && -f "$target_dir/theme.css" ]] &&
   cmp -s "$repo_root/manifest.json" "$target_dir/manifest.json" &&
   cmp -s "$repo_root/theme.css" "$target_dir/theme.css"; then
  echo "Liquid Notes is already up to date in $target_dir"
  exit 0
fi

if [[ -e "$target_dir" && $force -ne 1 ]]; then
  echo "Liquid Notes already exists with different content: $target_dir" >&2
  echo "Review the local files, then rerun with --force to update them intentionally." >&2
  exit 1
fi

mkdir -p "$themes_dir"
mkdir -p "$target_dir"

manifest_tmp=$(mktemp "$target_dir/.manifest.json.XXXXXX")
theme_tmp=$(mktemp "$target_dir/.theme.css.XXXXXX")
cleanup() {
  rm -f -- "$manifest_tmp" "$theme_tmp"
}
trap cleanup EXIT

install -m 0644 "$repo_root/manifest.json" "$manifest_tmp"
install -m 0644 "$repo_root/theme.css" "$theme_tmp"
mv -f -- "$manifest_tmp" "$target_dir/manifest.json"
mv -f -- "$theme_tmp" "$target_dir/theme.css"
trap - EXIT

echo "Installed Liquid Notes to $target_dir"
