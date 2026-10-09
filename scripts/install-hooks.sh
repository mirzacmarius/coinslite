#!/usr/bin/env bash
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
project_root="$(CDPATH= cd -- "$script_dir/.." && pwd -P)"

chmod +x "$project_root/.githooks/pre-commit" "$project_root/.githooks/pre-push"

if [ -n "${CI:-}" ]; then
  exit 0
fi

git_root="$(git -C "$project_root" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$git_root" ] || [ "$(CDPATH= cd -- "$git_root" && pwd -P)" != "$project_root" ]; then
  exit 0
fi

current="$(git -C "$project_root" config --get core.hooksPath || true)"
if [ -n "$current" ] && [ "$current" != ".githooks" ]; then
  printf 'Keeping existing core.hooksPath: %s\n' "$current"
  exit 0
fi

git -C "$project_root" config --local core.hooksPath .githooks
