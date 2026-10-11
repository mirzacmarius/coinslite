import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const cli = join(import.meta.dir, "checks-coverage.mjs");
const tempDirs = new Set();

afterEach(async () => {
  await Promise.all(
    [...tempDirs].map((path) => rm(path, { recursive: true, force: true })),
  );
  tempDirs.clear();
});

async function fakeBun({
  stdout = '{"tasks":[]}',
  stderr = "",
  status = 0,
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), "checks-coverage-"));
  tempDirs.add(directory);
  const shim = join(directory, "bun");
  const payload = JSON.stringify({ stdout, stderr, status });
  await writeFile(
    shim,
    `#!${process.execPath}\nconst { stdout, stderr, status } = ${payload};\nprocess.stdout.write(stdout);\nprocess.stderr.write(stderr);\nprocess.exit(status);\n`,
  );
  await chmod(shim, 0o755);
  return directory;
}

function runCli(path, args = []) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${path}${delimiter}${process.env.PATH}` },
  });
}

describe("checks coverage CLI", () => {
  test("summarizes Turbo tasks, including dependencies and missing scripts, in task ID order", async () => {
    const shimPath = await fakeBun({
      stdout: JSON.stringify({
        tasks: [
          { taskId: "z#test", directory: "packages/z", command: "run test" },
          { taskId: "a#build", directory: "packages/a", command: "run build" },
          {
            taskId: "a#custom",
            directory: "packages/a",
            command: "<NONEXISTENT>",
          },
        ],
      }),
    });
    const result = runCli(shimPath, ["custom"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("a#custom\tpackages/a\tMissing script");
    expect(result.stdout.indexOf("a#build")).toBeLessThan(
      result.stdout.indexOf("z#test"),
    );
    expect(result.stdout).toContain("a#build\tpackages/a\trun build");
  });

  test("rejects malformed tasks and task fields", async () => {
    for (const stdout of [
      "invalid JSON",
      "{}",
      JSON.stringify({ tasks: [{ taskId: "x#lint" }] }),
    ]) {
      const shimPath = await fakeBun({ stdout });
      const result = runCli(shimPath);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Turbo dry-run");
    }
  });

  test("forwards requested task names and uses bun x --no-install turbo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "checks-argv-"));
    tempDirs.add(directory);
    const shim = join(directory, "bun");
    const log = join(directory, "args.json");
    await writeFile(
      shim,
      `#!${process.execPath}\nconst fs = require("node:fs");\nfs.writeFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)));\nprocess.stdout.write('{"tasks":[]}');\n`,
    );
    await chmod(shim, 0o755);
    const result = runCli(directory, ["build", "custom"]);
    expect(result.status).toBe(0);
    const args = await Bun.file(log).json();
    expect(args).toEqual([
      "x",
      "--no-install",
      "turbo",
      "run",
      "build",
      "custom",
      "--dry=json",
    ]);
  });

  test("preserves Turbo stderr and failure exit status", async () => {
    const shimPath = await fakeBun({ status: 7, stderr: "turbo failed\n" });
    const result = runCli(shimPath);
    expect(result.status).toBe(7);
    expect(result.stderr).toBe("turbo failed\n");
  });

  test("preserves Turbo warnings on a successful dry-run", async () => {
    const shimPath = await fakeBun({ stderr: "turbo warning\n" });
    const result = runCli(shimPath);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("turbo warning\n");
  });

  test("integrates with local Turbo and includes requested workspace tasks", () => {
    const result = spawnSync(process.execPath, [cli], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("@coinslite/e2e#lint");
    expect(result.stdout).toContain("@coinslite/e2e#typecheck");
    expect(result.stdout).toContain(
      "@coinslite/e2e#lint\ttooling/e2e\tbiome lint",
    );
    expect(result.stdout).toContain(
      "@coinslite/e2e#typecheck\ttooling/e2e\ttsc --noEmit",
    );
    expect(result.stdout).toContain("Turbo workspace task graph");
  });
});
