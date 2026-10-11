#!/usr/bin/env bun

import { spawnSync } from "node:child_process";

const requestedTasks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["lint", "typecheck", "test"];
const result = spawnSync(
  "bun",
  ["x", "--no-install", "turbo", "run", ...requestedTasks, "--dry=json"],
  { encoding: "utf8" },
);

if (result.error) {
  process.stderr.write(`${result.stderr ?? ""}${result.error.message}\n`);
  process.exit(result.status ?? 1);
}

process.stderr.write(result.stderr);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

let dryRun;
try {
  dryRun = JSON.parse(result.stdout);
} catch {
  process.stderr.write("Turbo dry-run returned invalid JSON.\n");
  process.exit(1);
}

if (!dryRun || !Array.isArray(dryRun.tasks)) {
  process.stderr.write("Turbo dry-run JSON must contain a tasks array.\n");
  process.exit(1);
}
for (const [index, task] of dryRun.tasks.entries()) {
  if (
    !task ||
    typeof task.taskId !== "string" ||
    typeof task.directory !== "string" ||
    typeof task.command !== "string"
  ) {
    process.stderr.write(
      `Turbo dry-run task at index ${index} must contain string taskId, directory, and command fields.\n`,
    );
    process.exit(1);
  }
}

process.stdout.write(
  "Turbo workspace task graph (scheduled tasks; this does not indicate check results):\n",
);
for (const task of dryRun.tasks.toSorted((a, b) =>
  a.taskId.localeCompare(b.taskId),
)) {
  const command =
    task.command === "<NONEXISTENT>" ? "Missing script" : task.command;
  process.stdout.write(`${task.taskId}\t${task.directory}\t${command}\n`);
}
