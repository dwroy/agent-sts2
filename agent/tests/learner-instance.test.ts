import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { learnerGitRules, main } from "../../learner/lib/launcher.js";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, readFileSync: vi.fn(actual.readFileSync) };
});

const root = mkdtempSync(join(tmpdir(), "learner-instance-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const lane = join(root, ".worktrees/regent-climb");
mkdirSync(join(lane, "tasks"), { recursive: true });
writeFileSync(join(lane, "tasks/lane.md"), `---
tools: Read, Bash, Edit, Write
default.base_branch: main
default.merge_dir: {{project_root}}/.worktrees/live
---
BASE={{base_branch}}
MERGE={{merge_dir}}
ROLE={{character}}
`);

async function preview(env: NodeJS.ProcessEnv, sets: string[] = []) {
  const output: string[] = [];
  const errors: string[] = [];
  const code = await main(["--engine", "codex", "--task", "lane", "--cwd", lane, "--character", "regent", "--dry-run", ...sets], {
    projectRoot: lane, tasksDir: join(lane, "tasks"), runsDir: join(lane, "runs"), env,
    secretFiles: [], out: (s) => output.push(s), err: (s) => errors.push(s),
  });
  expect(code, errors.join("")).toBe(0);
  return output.join("");
}

describe("learner targets for an independent worktree lane", () => {
  it("keeps the primary lane defaults when overrides are absent", async () => {
    const text = await preview({ PATH: "" });
    expect(text).toContain("BASE=main");
    expect(text).toContain(`MERGE=${lane}/.worktrees/live`);
  });

  it("renders the lane baseline and own live checkout without borrowing primary live", async () => {
    const text = await preview({ PATH: "", STS2_LIVE: lane, LEARNER_BASE_REF: "regent-climb" });
    expect(text).toContain("BASE=regent-climb");
    expect(text).toContain(`MERGE=${lane}\n`);
    expect(text).toContain("ROLE=regent");
    expect(text).not.toContain(`MERGE=${root}/.worktrees/live`);
  });

  it("honors explicitly frozen task targets before environment defaults", async () => {
    const text = await preview({ PATH: "", STS2_LIVE: lane, LEARNER_BASE_REF: "regent-climb" },
      ["--set", "base_branch=frozen-source", "--set", `merge_dir=${lane}/review`]);
    expect(text).toContain("BASE=frozen-source");
    expect(text).toContain(`MERGE=${lane}/review`);
  });

  it("grants the shared git metadata needed by a lane learner but protects hooks and config", () => {
    // A synthetic Git pointer must not borrow the enclosing TMPDIR worktree's identity.
    const fixtureRoot = "/fixture/project";
    const fixtureLane = join(fixtureRoot, ".worktrees/regent-climb");
    const child = join(fixtureLane, ".worktrees/exp");
    const childGit = join(fixtureRoot, ".git/worktrees/exp-regent");
    vi.mocked(readFileSync).mockImplementationOnce(() => `gitdir: ${childGit}\n`);
    const rules = learnerGitRules(fixtureLane, child);
    expect(rules[join(fixtureRoot, ".git")]).toBe("write");
    expect(rules[childGit]).toBe("write");
    expect(rules[join(fixtureRoot, ".git/hooks")]).toBe("read");
    expect(rules[join(fixtureRoot, ".git/config")]).toBe("read");
    expect(rules[join(fixtureLane, ".git")]).toBeUndefined();
  });
});
