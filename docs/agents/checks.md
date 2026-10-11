# Check coverage

Run `bun run checks:coverage` to see the workspace Turbo task graph for lint, typecheck, and test. Pass task names to summarize a different set, such as `bun run checks:coverage build`.

The summary uses every task Turbo returns in its dry-run JSON, including dependency tasks, with task IDs, directories, and commands. Turbo marks missing scripts with `<NONEXISTENT>`, shown here as `Missing script`. An empty task list can be intentional when no workspace tasks match the request. The command does not run checks.

Dependency tasks such as `topo` can intentionally have no script: Turbo uses them to order other tasks. A `Missing script` row is evidence about the graph, not by itself a defect.

This covers workspace tasks scheduled by Turbo. Root-only checks such as `sherif` and `format:check`, along with CI e2e steps, are separate and do not appear in this graph.
