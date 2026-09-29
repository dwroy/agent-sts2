/**
 * Knowledge-base tools (docs/v4-architecture.md §3): the same renderers as the system-prompt prefix
 * (src/knowledge/render), one entry or table at a time, plus the post-mortems and the run log. Read-only and
 * deterministic for the same files. A bad input or a lookup that finds nothing returns isError with the reason
 * and the values that are available.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { KnowledgeLoadError, KnowledgeLookupError, lessonsPath, loadKnowledgeData, loadPostmortems, type RenderContext } from "../knowledge/render/data.js";
import { EXPERIENCE_THEMES, THEME_KEYS, queryExperience, type ThemeKey } from "../knowledge/render/experience-text.js";
import { monsterNameOf, renderEncounter, renderMonster } from "../knowledge/render/monster-text.js";
import { OLD_SOURCE_KEYS, queryOldKnowledge } from "../knowledge/render/old-knowledge.js";
import { STATS_TABLES, renderStatsTable } from "../knowledge/render/stats-text.js";
import { cmp } from "../knowledge/render/format.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";
import { validateInput } from "./validate.js";

type Input = Record<string, unknown>;

function error(text: string): ToolResult {
  return { text, isError: true };
}

/**
 * A tool whose input is checked against its schema first, and whose lookup errors (nothing found, a knowledge
 * file that failed to load) come back as isError with the reason; anything else is a bug and throws.
 */
function tool(def: Omit<ToolDef<Input>, "run"> & { run(input: Input, ctx: ToolContext): string }): ToolDef {
  return {
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    run(input, ctx) {
      const problems = validateInput(def.inputSchema, input);
      if (problems.length > 0) return error(`输入不合法：${problems.join("；")}`);
      try {
        return { text: def.run(input ?? {}, ctx) };
      } catch (caught) {
        if (caught instanceof KnowledgeLookupError) return error(caught.message);
        if (caught instanceof KnowledgeLoadError) return error(`知识文件加载失败：${caught.message}`);
        throw caught;
      }
    },
  };
}

const renderCtx = (ctx: ToolContext): RenderContext => ({ ascension: ctx.ascension, knowledgeDir: ctx.knowledgeDir, ...(ctx.act !== undefined ? { act: ctx.act } : {}) });

const ROOMS = ["hallway", "elite", "boss", "unknown_room"];

const kbMonster = tool({
  name: "kb_monster",
  description:
    "查一个怪物在本局进阶的数据：血量、每个招式的伤害×段数、给自己加的能力、给我们上的减益、塞的牌、出现回合和下一招的转移、特殊机制（复活、召唤、喷发、滑溜等），每个数带样本数 n；本进阶没记录的按相邻进阶推算并标「估」。另附它所在遭遇各进阶的战绩。按 id（如 KIN_PRIEST）或中文名（如 同族神官）查。",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "怪物 id（KIN_PRIEST）或中文名（同族神官）" } },
    required: ["id"],
    additionalProperties: false,
  },
  run: (input, ctx) => renderMonster(String(input["id"]), renderCtx(ctx)),
});

const kbEncounter = tool({
  name: "kb_encounter",
  description:
    "查遭遇和 boss 战的战绩：各进阶的场数、胜率、死亡数、赢局战内掉血中位/p75（boss 另有赢局回合和每回合掉血）。query 可以是遭遇 key（CRUSHER+ROCKET）、boss id（KAISER_CRAB）、或怪物 id/中文名（列出它参与的全部遭遇）；可按幕和房间类型筛选。",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "遭遇 key、boss id、怪物 id 或中文名" },
      act: { type: "integer", minimum: 1, description: "只看这一幕" },
      room: { type: "string", enum: ROOMS, description: "只看这种房间：hallway 走廊、elite 精英、boss、unknown_room 问号房" },
    },
    required: ["query"],
    additionalProperties: false,
  },
  run: (input, ctx) =>
    renderEncounter(String(input["query"]), renderCtx(ctx), {
      ...(typeof input["act"] === "number" ? { act: input["act"] } : {}),
      ...(typeof input["room"] === "string" ? { room: input["room"] } : {}),
    }),
});

const kbExperience = tool({
  name: "kb_experience",
  description: `查经验库里本局进阶适用的有效条目：结论、支持/反对局数、置信度、典型案例（run id + 复盘标题一句话）。按主题（${EXPERIENCE_THEMES.map((theme) => `${theme.key}=${theme.title}`).join("，")}）、条目 id 或关键词（在 id、范围、名称、结论里找）查，至少给一个；给了几个就要同时满足。`,
  inputSchema: {
    type: "object",
    properties: {
      theme: { type: "string", enum: THEME_KEYS, description: "主题" },
      id: { type: "string", description: "条目 id（如 vantom-multihit）" },
      keyword: { type: "string", description: "关键词（中文名、卡牌/怪物 id、boss:VANTOM 之类的范围）" },
    },
    additionalProperties: false,
  },
  run: (input, ctx) => {
    const theme = input["theme"] as ThemeKey | undefined;
    const id = typeof input["id"] === "string" ? input["id"].trim() : "";
    const keyword = typeof input["keyword"] === "string" ? input["keyword"].trim() : "";
    if (!theme && !id && !keyword) throw new KnowledgeLookupError(`至少给 theme、id、keyword 之一。可用的主题: ${THEME_KEYS.join(", ")}`);
    return queryExperience(renderCtx(ctx), { ...(theme ? { theme } : {}), ...(id ? { ids: [id] } : {}), ...(keyword ? { keyword } : {}) }, loadPostmortems(lessonsPath()));
  },
});

const kbStats = tool({
  name: "kb_stats",
  description:
    "查统计表：room_costs = 各幕各进阶每种房间的掉血（中位/p75/p90、死亡率、n）；fights = 精英和 boss 各进阶的战绩；rest = 休息点回血/锻造按到达血量段的结果（均终层、过本幕 boss 比例）。room_costs 和 fights 可以只看一幕。",
  inputSchema: {
    type: "object",
    properties: {
      table: { type: "string", enum: [...STATS_TABLES], description: "表名" },
      act: { type: "integer", minimum: 1, description: "只看这一幕（rest 表不分幕）" },
    },
    required: ["table"],
    additionalProperties: false,
  },
  run: (input, ctx) => renderStatsTable(String(input["table"]), renderCtx(ctx), typeof input["act"] === "number" ? input["act"] : undefined),
});

const kbOldKnowledge = tool({
  name: "kb_old_knowledge",
  description:
    "查旧知识（早期手写，待数据验证；和数据冲突时以数据为准）：guide = 铁甲战士攻略，handbook = DeepSeek 经验手册，jev_hints = Jev 战斗提示。给 keyword 只返回含关键词的行（带所在小标题）；不给就返回整份。",
  inputSchema: {
    type: "object",
    properties: {
      source: { type: "string", enum: OLD_SOURCE_KEYS, description: "来源；不给则查全部" },
      keyword: { type: "string", description: "关键词" },
    },
    additionalProperties: false,
  },
  run: (input, ctx) =>
    queryOldKnowledge(renderCtx(ctx), typeof input["source"] === "string" ? input["source"] : undefined, typeof input["keyword"] === "string" ? input["keyword"] : undefined),
});

/** A run id prefix shorter than this is ambiguous by design (the lessons cite 4-character prefixes: "ZGZ0"). */
const MIN_RUN_PREFIX = 4;

const kbPostmortem = tool({
  name: "kb_postmortem",
  description: "按 run id 取那一局的复盘原文（notes/lessons.md 里「## <run id>（…）」那一节）。可以只给前 4 位以上的唯一前缀（经验里常写 ZGZ0 这样的简写）。",
  inputSchema: {
    type: "object",
    properties: { run_id: { type: "string", description: "run id（12 位）或其唯一前缀（至少 4 位）" } },
    required: ["run_id"],
    additionalProperties: false,
  },
  run: (input) => {
    const query = String(input["run_id"]).trim().toUpperCase();
    if (!/^[0-9A-Z]+$/.test(query) || query.length < MIN_RUN_PREFIX || query.length > 12) throw new KnowledgeLookupError(`run id 应为 ${MIN_RUN_PREFIX}–12 位数字或大写字母，收到「${input["run_id"]}」`);
    const postmortems = loadPostmortems(lessonsPath());
    if (!postmortems.sections) throw new KnowledgeLookupError(postmortems.missing ?? `读不到复盘文件 ${postmortems.path}`);
    const ids = [...postmortems.sections.keys()].filter((id) => id.startsWith(query)).sort(cmp);
    if (ids.length === 0) throw new KnowledgeLookupError(`复盘里没有以「${query}」开头的局（共 ${postmortems.sections.size} 局有复盘；用 kb_runs 查 run id）`);
    if (ids.length > 1) throw new KnowledgeLookupError(`「${query}」对应多局，请给更长的前缀: ${ids.join(", ")}`);
    return postmortems.sections.get(ids[0]!)!.map((section) => section.text).join("\n\n");
  },
});

interface RunRow {
  run_id: string;
  ended?: string;
  victory?: boolean;
  floor?: number;
  ascension?: number | null;
  code?: string;
  death_fight?: string[] | null;
}

function loadRuns(logsDir: string): { runs: RunRow[]; bad: number } {
  const path = join(logsDir, "runs.jsonl");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (caught) {
    throw new KnowledgeLookupError(`读不到对局记录 ${path}（${(caught as Error).message}）`);
  }
  const runs: RunRow[] = [];
  let bad = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as RunRow;
      if (typeof row.run_id === "string") runs.push(row);
      else bad += 1;
    } catch {
      bad += 1;
    }
  }
  return { runs, bad };
}

/** Death-fight names a query stands for: a boss id's parts, a monster id's name, else the text itself. */
function deathNames(ctx: ToolContext, query: string): { names: Set<string> | null; text: string } {
  const upper = query.toUpperCase().replace(/_BOSS$/, "");
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const boss = data.monsterDb.bosses[upper];
  if (boss) {
    const parts = new Set(Object.values(boss).flatMap((threat) => Object.keys(threat.parts ?? {})));
    return { names: new Set([...parts].map((id) => monsterNameOf(data, id))), text: query };
  }
  if (data.monsterDb.monsters[upper]) return { names: new Set([monsterNameOf(data, upper)]), text: query };
  return { names: null, text: query };
}

const MAX_RUNS = 100;
const DEFAULT_RUNS = 20;
const TOP_DEATHS = 8;

const kbRuns = tool({
  name: "kb_runs",
  description:
    "按进阶、结束层数、死因、胜负筛选对局记录（logs/runs.jsonl），返回摘要：局数、胜局数、终层中位数、最常见死因，以及最近的若干局（run id、日期、进阶、层数、死因、代码版本）。死因可给怪物中文名、怪物 id 或 boss id。",
  inputSchema: {
    type: "object",
    properties: {
      ascension: { type: "integer", minimum: 0, description: "进阶" },
      floor_min: { type: "integer", minimum: 0, description: "结束层数下限（含）" },
      floor_max: { type: "integer", minimum: 0, description: "结束层数上限（含）" },
      death: { type: "string", description: "死因：怪物中文名（部分即可）、怪物 id 或 boss id" },
      victory: { type: "boolean", description: "只看赢（true）或输（false）的局" },
      limit: { type: "integer", minimum: 1, maximum: MAX_RUNS, description: `列出最近几局，默认 ${DEFAULT_RUNS}` },
    },
    additionalProperties: false,
  },
  run: (input, ctx) => {
    const { runs, bad } = loadRuns(ctx.logsDir);
    const asc = input["ascension"] as number | undefined;
    const lo = input["floor_min"] as number | undefined;
    const hi = input["floor_max"] as number | undefined;
    const victory = input["victory"] as boolean | undefined;
    const death = typeof input["death"] === "string" ? input["death"].trim() : "";
    if (lo !== undefined && hi !== undefined && lo > hi) throw new KnowledgeLookupError(`floor_min ${lo} 大于 floor_max ${hi}`);
    const wanted = death ? deathNames(ctx, death) : null;
    const died = (row: RunRow) => {
      if (!wanted) return true;
      const fights = row.death_fight ?? [];
      return wanted.names ? fights.some((name) => wanted.names!.has(name)) : fights.some((name) => name.includes(wanted.text));
    };
    const matched = runs
      .filter((row) => (asc === undefined || row.ascension === asc) && (lo === undefined || (row.floor ?? -1) >= lo) && (hi === undefined || (row.floor ?? Infinity) <= hi))
      .filter((row) => (victory === undefined || row.victory === victory) && died(row))
      .sort((a, b) => cmp(b.ended ?? "", a.ended ?? "") || cmp(a.run_id, b.run_id));
    const conditions = [asc !== undefined ? `A${asc}` : "", lo !== undefined || hi !== undefined ? `结束于第 ${lo ?? 0}–${hi ?? "∞"} 层` : "", death ? `死因「${death}」` : "", victory !== undefined ? (victory ? "赢" : "输") : ""].filter(Boolean).join("，");
    if (matched.length === 0) {
      const ascs = [...new Set(runs.map((row) => row.ascension).filter((value): value is number => typeof value === "number"))].sort((a, b) => a - b);
      throw new KnowledgeLookupError(`没有符合（${conditions || "无条件"}）的对局。记录共 ${runs.length} 局，进阶有 ${ascs.map((value) => `A${value}`).join(", ")}`);
    }
    const floors = matched.map((row) => row.floor ?? 0).sort((a, b) => a - b);
    const median = floors.length % 2 === 1 ? floors[(floors.length - 1) / 2]! : (floors[floors.length / 2 - 1]! + floors[floors.length / 2]!) / 2;
    const causes = new Map<string, number>();
    for (const row of matched) if (!row.victory) {
      const cause = (row.death_fight ?? []).join("+") || "未知";
      causes.set(cause, (causes.get(cause) ?? 0) + 1);
    }
    const top = [...causes].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, TOP_DEATHS);
    const limit = (input["limit"] as number | undefined) ?? DEFAULT_RUNS;
    const lines = [
      `符合（${conditions || "全部"}）的对局 ${matched.length} 局：赢 ${matched.filter((row) => row.victory).length}，终层中位 ${median}；死因最多: ${top.map(([cause, n]) => `${cause} ${n}`).join("，") || "无"}${bad > 0 ? `（跳过 ${bad} 行坏记录）` : ""}`,
      `最近 ${Math.min(limit, matched.length)} 局（新→旧）:`,
      ...matched.slice(0, limit).map((row) => `- ${row.run_id} ${(row.ended ?? "?").slice(0, 10)} A${row.ascension ?? "?"} 第${row.floor ?? "?"}层 ${row.victory ? "赢" : `输，死于 ${(row.death_fight ?? []).join("+") || "未知"}`}（代码 ${row.code ?? "?"}）`),
    ];
    return lines.join("\n");
  },
});

/** The knowledge-base tools, in a fixed order. */
export function knowledgeTools(): ToolDef[] {
  return [kbMonster, kbEncounter, kbExperience, kbStats, kbOldKnowledge, kbPostmortem, kbRuns];
}
