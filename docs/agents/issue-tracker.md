# Issue tracker: Linear

Issues and specs for CoinsLite live in Linear: workspace **MuseumLite**, team **CoinsLite** (key `COIN`), project **CoinsLite**. Use the Linear MCP tools (`mcp__claude_ai_Linear__*`) for all operations.

The workspace also holds the MuseumLite team (`MUS`), which belongs to another product. Create and query CoinsLite issues in team `COIN` only, and never apply the `module/*` or `phase/*` labels; they belong to MuseumLite.

CoinsLite issues were numbered `MUS-675` to `MUS-774` until 2026-10-11, when they moved to `COIN-1` to `COIN-96`. Old identifiers and links still redirect, so commits, PRs and docs that mention them stay valid.

Linear syncs the COIN team's issues to this repo's GitHub Issues, so the same issue also appears on GitHub. Linear is the source of truth: create and update issues there only, and never create GitHub issues directly.

## Conventions

- **Create an issue**: `save_issue` with `team: "COIN"`, `project: "CoinsLite"`, `title`, and a Markdown `description`. New issues start in `Backlog`. Add a type label (`Feature`, `Bug`, `Improvement`, `Task`, `Chore`, `Docs`) and, when known, a `milestone`.
- **Read an issue**: `get_issue` with the identifier (e.g. `COIN-12`; add `includeRelations: true` for blockers), plus `list_comments` for the discussion.
- **List issues**: `list_issues` with `team: "COIN"` and filters such as `label`, `state`, `assignee`, `parentId` or `milestone`.
- **Comment on an issue**: `save_comment` with `issueId` and `body`.
- **Apply / remove labels**: `save_issue` with `id` and `addLabels` / `removeLabels`. Avoid `labels`, which replaces the whole set.
- **Change status**: `save_issue` with `id` and `state` (`Todo`, `In Progress`, `In Review`, `Done`, `Canceled`, `Duplicate`).
- **Close**: comment with the reason first, then set `state: "Done"`, or `"Canceled"` for won't-do.
- **Milestones**: the CoinsLite project's milestones group the build phases. List them with `list_milestones`, and create them with `save_milestone` if they're missing.
- **Code links**: name branches with the issue's `gitBranchName`, and put the identifier (`COIN-12`) in commit and PR titles.

Issue content describes CoinsLite's own requirements, using the vocabulary in `CONTEXT.md`.

## When a skill says "publish to the issue tracker"

Create a Linear issue in team `COIN`, project `CoinsLite`.

## When a skill says "fetch the relevant ticket"

Run `get_issue` with the identifier (e.g. `COIN-12`), then `list_comments` for the issue.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: an issue in the CoinsLite project labelled `wayfinder:map` (create the label if it's missing), holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: a native sub-issue of the map (`parentId: <map>`), labelled `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: Linear's native relations, set with `save_issue` `blockedBy` / `blocks`. A ticket is unblocked when every blocker is `Done` or `Canceled`.
- **Frontier query**: `list_issues` with `parentId: <map>`, keeping open issues (not Done/Canceled/Duplicate) that have no assignee. Drop any whose `get_issue` (`includeRelations: true`) shows an open blocker. The first in map order wins.
- **Claim**: `save_issue` with `assignee: "me"` and `state: "In Progress"`, the session's first write.
- **Resolve**: `save_comment` with the answer, then `save_issue` `state: "Done"`, then append a context pointer (gist + link) to the map's Decisions-so-far (`save_issue` `patch` on the map).
