/**
 * The offline learner per character (2026-10-04, multi-character): {{character}} and the other character built-ins,
 * {{#is_ironclad}} / {{^is_ironclad}} sections that leave no trace when hidden (an Ironclad brief renders as before),
 * --character / CHARACTER, the per-character post-mortem backlog, run ids of another character refused, and
 * TARGET_ASCENSION=climb. Temp files only; no LLM.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { checkRunCharacters, defaultAscension, parseArgs, resolveCharacter, toolServerSpec } from "../../learner/lib/launcher.js";
import { headingCharacter, highestAscension, pendingRuns, runCharacters } from "../../learner/lib/runs.js";
import { LearnerUsageError, characterBuiltins, loadTask, parseTask, renderSections, renderTask } from "../../learner/lib/task.js";

const TASKS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "learner", "tasks");
const BUILTINS = { cwd: "/p/wt", worktree: "/p/wt", project_root: "/p", logs_dir: "/p/logs", scratch: "/p/learner/runs/x", task: "t" };
const SETS: Record<string, Record<string, string>> = { postmortem: { runs: "AAAAAAAAAAAA" }, "experience-update": { runs: "AAAAAAAAAAAA" }, smoke: { run: "AAAAAAAAAAAA" } };
const NAMES = ["postmortem", "experience-update", "experience-asc-audit", "fix-batch", "mechanics-audit", "smoke"];

const tmp = mkdtempSync(join(tmpdir(), "learner-character-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("sections", () => {
  const flags = { is_ironclad: "yes", other: "" };
  it("keeps or drops a section; a marker alone on its line takes the line with it", () => {
    const text = "a\n{{#is_ironclad}}\nb\n{{/is_ironclad}}\n{{^is_ironclad}}\nc\n{{/is_ironclad}}\nd {{^other}}e{{/other}}{{#other}}f{{/other}}\n";
    expect(renderSections(text, flags)).toBe("a\nb\nd e\n");
    expect(renderSections(text, { is_ironclad: "", other: "x" })).toBe("a\nc\nd f\n");
  });
  it("an unknown flag or an unmatched marker is an error", () => {
    expect(() => renderSections("{{#nope}}x{{/nope}}", flags)).toThrow(LearnerUsageError);
    expect(() => renderSections("{{#is_ironclad}}x", flags)).toThrow(/没有配对/);
  });
});

describe("the task files per character", () => {
  for (const name of NAMES) {
    it(`${name}: the Ironclad brief is the same with no character given, and has no section marker left`, () => {
      const spec = loadTask(name, TASKS);
      const plain = renderTask(spec, SETS[name] ?? {}, BUILTINS).prompt;
      expect(renderTask(spec, SETS[name] ?? {}, { ...BUILTINS, ...characterBuiltins("ironclad") }).prompt).toBe(plain);
      expect(plain).not.toMatch(/\{\{|静默猎手/);
    });
  }

  it("a Silent brief points at characters/silent and never at the Ironclad's files", () => {
    for (const name of NAMES.filter((task) => task !== "experience-asc-audit")) {
      const prompt = renderTask(loadTask(name, TASKS), SETS[name] ?? {}, { ...BUILTINS, ...characterBuiltins("silent") }).prompt;
      expect(prompt).not.toMatch(/\{\{|characters\/ironclad|ironclad-guide/);
    }
    const experience = renderTask(loadTask("experience-update", TASKS), SETS["experience-update"]!, { ...BUILTINS, ...characterBuiltins("silent") }).prompt;
    expect(experience).toContain("`knowledge/characters/silent/experience.json`");
    expect(experience).toContain("/p/wt/knowledge/characters/silent/experience.json");
    expect(experience).toContain("从空开始");
    const postmortem = renderTask(loadTask("postmortem", TASKS), SETS["postmortem"]!, { ...BUILTINS, ...characterBuiltins("silent") }).prompt;
    expect(postmortem).toContain("`## <run id>（A几，静默猎手，第N层，死因）`");
  });

  it("experience-asc-audit is the Ironclad's only; the character built-ins cannot be --set", () => {
    expect(() => renderTask(loadTask("experience-asc-audit", TASKS), {}, { ...BUILTINS, ...characterBuiltins("silent") })).toThrow(/只给这些角色用/);
    expect(() => renderTask(loadTask("experience-update", TASKS), { runs: "A", character: "silent" }, BUILTINS)).toThrow(/启动器决定/);
    expect(() => parseTask("---\ntools: Read\ncharacters: 静默猎手, x y\n---\nbody", "t", "t.md")).toThrow(/角色 id/);
  });
});

describe("the character and the ascension", () => {
  const runs = join(tmp, "runs.jsonl");
  writeFileSync(
    runs,
    [
      { run_id: "IRONLEGACY01", ascension: 9 },
      { run_id: "IRONNEW00001", character: "IRONCLAD", ascension: 8 },
      { run_id: "SILENT000001", character: "SILENT", ascension: 0 },
      { run_id: "SILENT000002", character: "SILENT", ascension: 2 },
    ].map((row) => JSON.stringify(row)).join("\n") + "\nnot json\n",
  );

  it("--character, else CHARACTER, else ironclad; ids are lower-cased", () => {
    expect(parseArgs(["--engine", "claude", "--task", "t", "--cwd", ".", "--character", "SILENT"]).character).toBe("silent");
    expect(() => parseArgs(["--engine", "claude", "--task", "t", "--cwd", ".", "--character", "x y"])).toThrow(LearnerUsageError);
    expect(resolveCharacter({ character: "silent" }, { CHARACTER: "IRONCLAD" })).toBe("silent");
    expect(resolveCharacter({}, { CHARACTER: "SILENT" })).toBe("silent");
    expect(resolveCharacter({}, {})).toBe("ironclad");
    expect(parseArgs(["--engine", "claude", "--task", "t", "--cwd", ".", "--with-tools", "--ascension", "0"]).ascension).toBe(0);
  });

  it("TARGET_ASCENSION: a number as before, unset 9, climb = the character's highest played (0 when none)", () => {
    expect(defaultAscension({}, "silent", runs)).toBe(9);
    expect(defaultAscension({ TARGET_ASCENSION: "8" }, "silent", runs)).toBe(8);
    expect(defaultAscension({ TARGET_ASCENSION: "climb" }, "silent", runs)).toBe(2);
    expect(defaultAscension({ TARGET_ASCENSION: "climb" }, "ironclad", runs)).toBe(9);
    expect(defaultAscension({ TARGET_ASCENSION: "climb" }, "defect", runs)).toBe(0);
    expect(highestAscension(join(tmp, "missing.jsonl"), "silent")).toBeUndefined();
  });

  it("refuses run ids of another character; a row without character is an Ironclad run; unknown ids pass", () => {
    expect(runCharacters(runs).get("IRONLEGACY01")).toBe("ironclad");
    expect(() => checkRunCharacters({ runs: "IRONLEGACY01,IRONNEW00001,UNKNOWN00001" }, "ironclad", runs)).not.toThrow();
    expect(() => checkRunCharacters({ runs: "SILENT000001,IRONLEGACY01" }, "silent", runs)).toThrow(/IRONLEGACY01=ironclad/);
    expect(() => checkRunCharacters({ run: "SILENT000002" }, "ironclad", runs)).toThrow(LearnerUsageError);
  });

  it("the tool server is told the character unless it is the default Ironclad", () => {
    const options = parseArgs(["--engine", "claude", "--task", "t", "--cwd", ".", "--with-tools"]);
    expect(toolServerSpec(options, tmp, {}).env).toEqual({ KNOWLEDGE_LESSONS_FILE: join(tmp, "notes", "lessons.md") });
    const silent = toolServerSpec({ ...options, character: "silent" }, tmp, { TARGET_ASCENSION: "climb" });
    expect(silent.env["CHARACTER"]).toBe("silent");
    expect(silent.args.join(" ")).toContain("--ascension 0");
  });
});

describe("the post-mortem backlog per character", () => {
  it("counts each character's post-mortems among its own runs only", () => {
    const dir = join(tmp, "ws");
    mkdirSync(join(dir, "live", "knowledge", "characters", "ironclad"), { recursive: true });
    writeFileSync(join(dir, "runs.jsonl"), [{ run_id: "IRON00000001" }, { run_id: "SLNT00000001", character: "SILENT" }].map((row) => JSON.stringify(row)).join("\n"));
    writeFileSync(
      join(dir, "lessons.md"),
      "<!--\n## OLDA00000000（A0）\n-->\n## IRON00000001（A9，第17层，死于 X）\n## IRON00000002（A9，第3层，…）\n## IRON00000003（A9，F12，…）\n" +
        "## SLNT00000001（A0，静默猎手，第5层，…）\n## SLNT00000002（A1，Silent，第9层，…）\n## IRON00000001（重复）\n",
    );
    writeFileSync(join(dir, "live", "knowledge", "characters", "ironclad", "experience.json"), JSON.stringify({ entries: [{ evidence: ["IRON00000002"], contradicting: null }] }));
    writeFileSync(join(dir, "changelog.md"), "folded SLNT00000002\n");
    const pending = (character: string): string[] =>
      pendingRuns({ lessonsFile: join(dir, "lessons.md"), runsFile: join(dir, "runs.jsonl"), liveDir: join(dir, "live"), changelogFile: join(dir, "changelog.md"), character });
    expect(pending("ironclad")).toEqual(["IRON00000001", "IRON00000003"]);
    expect(pending("silent")).toEqual(["SLNT00000001"]);
    expect(headingCharacter("（A9，F12，…）")).toBeNull();
    expect(headingCharacter("（A0，静默猎手，第5层）")).toBe("silent");
  });
});
