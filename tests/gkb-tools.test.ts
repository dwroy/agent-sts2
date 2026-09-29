/**
 * V4 knowledge-base tools (src/tools/kb-tools.ts via buildTools): every tool's normal and error paths, on the
 * fixed data in tests/gkb-data.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildTools } from "../src/tools/registry.js";
import type { ToolContext, ToolDef, ToolResult } from "../src/tools/types.js";
import { validateInput } from "../src/tools/validate.js";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "gkb-data");
const ctx: ToolContext = { ascension: 9, knowledgeDir: join(DATA, "knowledge"), logsDir: join(DATA, "run-logs") };
const tools = buildTools(ctx);
const byName = (name: string): ToolDef => tools.find((item) => item.name === name)!;
const call = async (name: string, input: unknown, context: ToolContext = ctx): Promise<ToolResult> => byName(name).run(input as Record<string, unknown>, context);

let savedLessons: string | undefined;
beforeAll(() => {
  savedLessons = process.env["KNOWLEDGE_LESSONS_FILE"];
  process.env["KNOWLEDGE_LESSONS_FILE"] = join(DATA, "lessons.md");
});
afterAll(() => {
  if (savedLessons === undefined) delete process.env["KNOWLEDGE_LESSONS_FILE"];
  else process.env["KNOWLEDGE_LESSONS_FILE"] = savedLessons;
});

describe("the tool list", () => {
  it("seven read-only knowledge tools with stable snake_case names, a description and an object schema", () => {
    expect(tools.map((item) => item.name)).toEqual(["kb_monster", "kb_encounter", "kb_experience", "kb_stats", "kb_old_knowledge", "kb_postmortem", "kb_runs"]);
    for (const item of tools) {
      expect(item.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(item.description.length).toBeGreaterThan(40);
      expect(item.inputSchema.type).toBe("object");
      expect(item.inputSchema.additionalProperties).toBe(false);
      for (const property of Object.values(item.inputSchema.properties ?? {})) expect(property.description).toBeTruthy();
    }
    expect(buildTools({ ...ctx, ascension: 3 }).map((item) => item.name)).toEqual(tools.map((item) => item.name));
  });

  it("the same call gives the same text (deterministic)", async () => {
    const a = await call("kb_monster", { id: "CLAW" });
    const b = await call("kb_monster", { id: "CLAW" });
    expect(a).toEqual(b);
  });

  it("rejects unknown parameters, wrong types, enums and ranges with the reason and what is allowed", async () => {
    const unknown = await call("kb_monster", { id: "CLAW", extra: 1 });
    expect(unknown).toMatchObject({ isError: true });
    expect(unknown.text).toMatch(/不认识的参数 extra（可用: id）/);
    expect((await call("kb_monster", {})).text).toMatch(/缺少 id/);
    expect((await call("kb_monster", { id: 7 })).text).toMatch(/id 应为 string/);
    expect((await call("kb_stats", { table: "x" })).text).toMatch(/table 只能是 "room_costs", "fights", "rest"/);
    expect((await call("kb_runs", { limit: 0 })).text).toMatch(/limit 不能小于 1/);
    expect((await call("kb_runs", { ascension: 1.5 })).text).toMatch(/ascension 应为 integer/);
    expect((await call("kb_monster", null)).text).toMatch(/缺少 id/);
    expect(validateInput({ type: "object", properties: { a: { type: "array", items: { type: "string" }, maxItems: 1 } } }, { a: ["x", 2] })).toEqual(["a 最多 1 项", "a[1] 应为 string，收到 number"]);
  });
});

describe("kb_monster", () => {
  it("one monster at the context's ascension, with its encounters' records", async () => {
    const result = await call("kb_monster", { id: "钳子怪" });
    expect(result.isError).toBeFalsy();
    expect(result.text).toContain("### 钳子怪 CLAW");
    expect(result.text).toContain("血量 A9: 42 (n=5");
    expect(result.text).toContain("所在遭遇的战绩:");
    expect(result.text).toContain("CLAW+CLAW");
    expect((await call("kb_monster", { id: "CLAW" }, { ...ctx, ascension: 8 })).text).toContain("血量 A8: 42 (n=6)");
  });

  it("unknown or ambiguous: isError with the ids that exist", async () => {
    const unknown = await call("kb_monster", { id: "ZZZ" });
    expect(unknown.isError).toBe(true);
    expect(unknown.text).toMatch(/可用的 id: .*BOSSY/);
    expect((await call("kb_monster", { id: "小喽啰" })).text).toMatch(/MINI_A（小喽啰甲）, MINI_B（小喽啰乙）/);
  });

  it("a knowledge file that fails to load is an error, not an empty answer", async () => {
    const broken = await call("kb_monster", { id: "CLAW" }, { ...ctx, knowledgeDir: join(DATA, "no-such-dir") });
    expect(broken.isError).toBe(true);
    expect(broken.text).toMatch(/知识文件加载失败/);
  });
});

describe("kb_encounter", () => {
  it("by encounter key, boss id and monster, narrowed by act and room", async () => {
    expect((await call("kb_encounter", { query: "claw+claw" })).text).toContain("A9 4场 胜75% 死1");
    expect((await call("kb_encounter", { query: "BOSSY_BOSS" })).text).toContain("- boss BOSSY（大老板 BOSSY）");
    const claw = (await call("kb_encounter", { query: "钳子怪" })).text;
    expect(claw).toContain("CLAW+CLAW");
    expect(claw).toContain("CLAW+SLIME");
    const question = (await call("kb_encounter", { query: "CLAW", room: "unknown_room" })).text;
    expect(question).toContain("CLAW+SLIME");
    expect(question).not.toContain("CLAW+CLAW");
  });

  it("nothing found: isError with the bosses and encounters that exist; an empty filter says so", async () => {
    const none = await call("kb_encounter", { query: "NOTHING" });
    expect(none.isError).toBe(true);
    expect(none.text).toMatch(/可用的 boss: BOSSY；遭遇: .*CLAW\+CLAW/);
    const filtered = await call("kb_encounter", { query: "CLAW", act: 2 });
    expect(filtered.isError).toBe(true);
    expect(filtered.text).toMatch(/幕 2/);
    expect((await call("kb_encounter", { query: "CLAW", room: "shop" })).isError).toBe(true);
  });
});

describe("kb_experience", () => {
  it("by theme, id or keyword, with cases from the post-mortems", async () => {
    const theme = await call("kb_experience", { theme: "monster" });
    expect(theme.text).toContain("### 经验：怪物/boss（1 条）");
    expect(theme.text).toContain("RUNAAAAAAAA1（A9，第33层，死于二幕 boss 大老板 BOSSY）");
    expect((await call("kb_experience", { id: "potion-keep" })).text).toContain("鲜血药水留给 boss。");
    expect((await call("kb_experience", { keyword: "BASH" })).text).toContain("card-bash");
  });

  it("no filter, a retired id, an id outside this ascension, a keyword found nowhere, a bad theme: isError with the reason", async () => {
    expect((await call("kb_experience", {})).text).toMatch(/至少给 theme、id、keyword 之一/);
    expect((await call("kb_experience", { id: "old-retired" })).text).toMatch(/已退役/);
    expect((await call("kb_experience", { id: "rest-low" })).text).toMatch(/不含当前 A9/);
    expect((await call("kb_experience", { keyword: "没有这个词" })).isError).toBe(true);
    expect((await call("kb_experience", { theme: "boss" })).text).toMatch(/theme 只能是 "monster"/);
  });
});

describe("kb_stats", () => {
  it("each table, one act or all", async () => {
    expect((await call("kb_stats", { table: "room_costs", act: 2 })).text).toContain("| A9（本局） | 10/18/30 死25% n=8 |");
    expect((await call("kb_stats", { table: "fights", act: 2 })).text).toContain("boss BOSSY");
    expect((await call("kb_stats", { table: "fights", act: 2 })).text).not.toContain("SLIME");
    expect((await call("kb_stats", { table: "rest" })).text).toContain("锻造 SMITH");
  });

  it("an act with no data: isError with the acts that exist", async () => {
    const result = await call("kb_stats", { table: "room_costs", act: 3 });
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/可用的幕: 1, 2/);
    expect((await call("kb_stats", { table: "fights", act: 3 })).text).toMatch(/可用的幕: 1, 2/);
  });
});

describe("kb_old_knowledge", () => {
  it("a source whole or by keyword, always under the note that the data wins", async () => {
    const whole = await call("kb_old_knowledge", { source: "handbook" });
    expect(whole.text).toContain("和数据冲突时以数据为准");
    expect(whole.text).toContain("连续三场战斗的路线不走");
    expect(whole.text).not.toContain("删打击");
    expect((await call("kb_old_knowledge", { keyword: "Snip" })).text).toContain("Snip hits for 12.");
    expect((await call("kb_old_knowledge", {})).text).toContain("### 旧知识：Jev 战斗提示");
  });

  it("an unknown source or a keyword found nowhere: isError", async () => {
    expect((await call("kb_old_knowledge", { source: "wiki" })).text).toMatch(/source 只能是 "guide", "handbook", "jev_hints"/);
    const none = await call("kb_old_knowledge", { source: "guide", keyword: "没有" });
    expect(none.isError).toBe(true);
    expect(none.text).toMatch(/不带关键词可取整份/);
  });
});

describe("kb_postmortem", () => {
  it("the whole section by run id or a unique prefix of 4+ characters", async () => {
    const full = await call("kb_postmortem", { run_id: "RUNAAAAAAAA1" });
    expect(full.text.startsWith("## RUNAAAAAAAA1（A9，第33层")).toBe(true);
    expect(full.text).toContain("### 小节\n- 细节二");
    expect(full.text).not.toContain("RUNBBBBBBBB2");
    expect((await call("kb_postmortem", { run_id: "runb" })).text).toContain("## RUNBBBBBBBB2（A8，第17层");
  });

  it("ambiguous, unknown, malformed, or no post-mortem file: isError with the reason", async () => {
    expect((await call("kb_postmortem", { run_id: "RUNA" })).text).toMatch(/对应多局.*RUNAAAAAAAA1, RUNAAAAAAAB9/);
    expect((await call("kb_postmortem", { run_id: "ZZZZ" })).text).toMatch(/没有以「ZZZZ」开头的局（共 3 局有复盘/);
    expect((await call("kb_postmortem", { run_id: "AB" })).text).toMatch(/4–12 位/);
    expect((await call("kb_postmortem", { run_id: "RUN-AAAA" })).isError).toBe(true);
    process.env["KNOWLEDGE_LESSONS_FILE"] = join(DATA, "missing-lessons.md");
    try {
      const missing = await call("kb_postmortem", { run_id: "RUNAAAAAAAA1" });
      expect(missing.isError).toBe(true);
      expect(missing.text).toMatch(/找不到复盘文件 .*missing-lessons\.md/);
    } finally {
      process.env["KNOWLEDGE_LESSONS_FILE"] = join(DATA, "lessons.md");
    }
  });
});

describe("kb_runs", () => {
  it("filters by ascension, floors, death and outcome; newest first; bad lines counted", async () => {
    const a9 = (await call("kb_runs", { ascension: 9 })).text;
    expect(a9).toContain("符合（A9）的对局 3 局：赢 1，终层中位 33；死因最多: 史莱姆 1，大老板 1（跳过 1 行坏记录）");
    expect(a9.indexOf("RUNAAAAAAAB9")).toBeLessThan(a9.indexOf("RUNAAAAAAAA1"));
    expect(a9).toContain("- RUNWIN000001 2026-09-27 A9 第48层 赢（代码 abd）");
    expect((await call("kb_runs", { death: "BOSSY" })).text).toContain("对局 1 局");
    expect((await call("kb_runs", { death: "钳子" })).text).toContain("- RUNBBBBBBBB2 2026-09-28 A8 第17层 输，死于 钳子怪+钳子怪");
    expect((await call("kb_runs", { floor_min: 10, floor_max: 40 })).text).toContain("对局 2 局");
    expect((await call("kb_runs", { victory: true })).text).toContain("RUNWIN000001");
    expect((await call("kb_runs", { limit: 1 })).text).toContain("最近 1 局");
  });

  it("no match, inverted floors or no run log: isError with the reason", async () => {
    const none = await call("kb_runs", { ascension: 5 });
    expect(none.isError).toBe(true);
    expect(none.text).toMatch(/记录共 4 局，进阶有 A8, A9/);
    expect((await call("kb_runs", { floor_min: 20, floor_max: 10 })).text).toMatch(/floor_min 20 大于 floor_max 10/);
    const missing = await call("kb_runs", {}, { ...ctx, logsDir: join(DATA, "no-such-logs") });
    expect(missing.isError).toBe(true);
    expect(missing.text).toMatch(/读不到对局记录/);
  });
});
