/**
 * The offline learner after the repository layout changed (docs/layout.md): the key files it redacts from its logs are
 * found in every place an .env can now be (the workspace, its agent/, the old sibling worktrees, .worktrees/<name>/ and
 * their agent/), and its Bash deny list stops every way of starting the game loop from the project root or agent/.
 * Fake keys in a temp directory; nothing real is read.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { BASH_DENY, claudePermissions } from "../../learner/lib/engines.js";
import { collectSecrets, secretFilesOf } from "../../learner/lib/launcher.js";

const tmp = mkdtempSync(join(tmpdir(), "learner-paths-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("secret files", () => {
  it("covers the workspace's .env files wherever they now sit, and the home key files", () => {
    const home = join(tmp, "home");
    const ws = join(tmp, "workspace");
    const keys: Record<string, string> = {
      [join(ws, ".env")]: "sk-root-0123456789abcdef",
      [join(ws, "agent", ".env")]: "sk-agent-0123456789abcdef",
      [join(ws, "jev-sts2-v3", ".env")]: "sk-v3-0123456789abcdefgh",
      [join(ws, "jev-sts2-v4run", "agent", ".env")]: "sk-old-agent-0123456789ab",
      [join(ws, ".worktrees", "fix7", "agent", ".env")]: "sk-wt-agent-0123456789abc",
      [join(ws, ".worktrees", "fix7", ".env")]: "sk-wt-root-0123456789abcd",
      [join(ws, "agent", "deepseek.env")]: "sk-named-0123456789abcdef",
    };
    for (const [file, key] of Object.entries(keys)) {
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, `TARGET_ASCENSION=9\nDEEPSEEK_API_KEY=${key}\n`);
    }
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, ".jev_api_keys"), "ts-home-0123456789abcdef\n");
    writeFileSync(join(home, ".sts2-jev-env.openrouter.bak"), "OPENROUTER_KEY=sk-or-0123456789abcdefgh\n");
    // .env.example is documentation, not a key file.
    writeFileSync(join(ws, "agent", ".env.example"), "DEEPSEEK_API_KEY=sk-example-0123456789abcdef\n");

    const files = secretFilesOf(ws, home);
    for (const file of Object.keys(keys)) expect(files).toContain(file);
    expect(files).toContain(join(home, ".jev_api_keys"));
    expect(files).toContain(join(home, ".deepseek_api_key"));
    expect(files).toContain(join(home, ".sts2-jev-env.openrouter.bak"));
    expect(files).not.toContain(join(ws, "agent", ".env.example"));
    const secrets = collectSecrets(files, {}, []);
    for (const key of [...Object.values(keys), "ts-home-0123456789abcdef", "sk-or-0123456789abcdefgh"]) expect(secrets).toContain(key);
    expect(secrets).not.toContain("sk-example-0123456789abcdef");
  });
});

/** Claude Code's Bash rule "Bash(P:*)": the command, or each part of a compound one, starts with P. */
function denied(command: string, rules: string[]): boolean {
  const prefixes = rules.filter((rule) => rule.startsWith("Bash(")).map((rule) => rule.slice(5, -1).replace(/:\*$/, ""));
  return command.split(/&&|\|\||;|\|/).map((part) => part.trim()).some((part) => prefixes.some((prefix) => part === prefix || part.startsWith(`${prefix} `)));
}

describe("the Bash deny list", () => {
  const rules = claudePermissions(["Read", "Bash"], "/p", false).disallowed;

  it("is the list a Bash task gets", () => {
    for (const rule of BASH_DENY) expect(rules).toContain(rule);
  });

  it("stops every way of starting the game loop, from agent/ or the project root", () => {
    for (const command of [
      "npx tsx src/index.ts play",
      "npx tsx src/index.ts play --max-runs 1",
      "npx tsx agent/src/index.ts play",
      "npx tsx src/core/index.ts play",
      "npx tsx agent/src/core/index.ts play",
      "cd agent && npx tsx src/index.ts play",
      "tsx src/index.ts play",
      "npm run play",
      "npm run dev -- play",
      "npm --prefix agent run play",
      "node --import tsx agent/src/index.ts play",
      "git clean -fdx",
    ]) expect(denied(command, rules), command).toBe(true);
  });

  it("leaves the offline commands alone", () => {
    for (const command of ["npx tsx tools/decision-replay.ts --last 5", "npx vitest run tests/sl.test.ts", "git status", "python3 ../knowledge/builders/build-room-costs.py --out /tmp/x.json"]) {
      expect(denied(command, rules), command).toBe(false);
    }
  });
});
