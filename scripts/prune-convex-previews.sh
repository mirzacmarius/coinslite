#!/usr/bin/env bash
# Deletes CoinsLite's Convex preview deployments that no open pull request
# uses any more. Every Vercel preview build creates one per branch, and the
# team's deployment quota is shared by all its projects, so stale ones block
# new previews long before Convex expires them.
#
# Needs CONVEX_TEAM_TOKEN (a Convex team access token) and an authenticated
# `gh`. Pass --dry-run to only list what would go.
set -euo pipefail

project_id="${CONVEX_PROJECT_ID:-3175523}" # Convex project "coinslite"
api="https://api.convex.dev/v1"
dry_run=false
[ "${1:-}" = "--dry-run" ] && dry_run=true

: "${CONVEX_TEAM_TOKEN:?Set CONVEX_TEAM_TOKEN to a Convex team access token}"
auth=(-H "Authorization: Bearer $CONVEX_TEAM_TOKEN")

open_branches=$(gh pr list --state open --limit 500 --json headRefName \
  --jq '.[].headRefName')
previews=$(curl -fsS "${auth[@]}" "$api/projects/$project_id/list_deployments" |
  jq -r '.[] | select(.deploymentType == "preview") | "\(.name) \(.previewIdentifier)"')

kept=0
deleted=0
while read -r name branch; do
  [ -z "$name" ] && continue
  if grep -qxF "$branch" <<<"$open_branches"; then
    kept=$((kept + 1))
    continue
  fi
  if $dry_run; then
    echo "Would delete $name ($branch)"
  else
    curl -fsS -X POST "${auth[@]}" "$api/deployments/$name/delete" >/dev/null
    echo "Deleted $name ($branch)"
  fi
  deleted=$((deleted + 1))
done <<<"$previews"

$dry_run && verb="would remove" || verb="removed"
echo "Kept $kept preview(s) with an open pull request; $verb $deleted."
