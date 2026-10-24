/** Read-only #24 aggregate lookups. Registration and engine mounting belong to #33. */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { knowledgeCharacter } from "../../knowledge/files.js";
import type { JsonSchema, ToolContext, ToolDef, ToolResult } from "./types.js";
import { validateInput } from "./validate.js";

export const EXTERNAL_STATS_MAX_BYTES = 16_000;
export const EXTERNAL_STATS_DATA_SHA256 = "88eef1cd8b875ab27d47c3abc39335f271705672b53bd71a0f4b30286168ac07";
export const EXTERNAL_STATS_FILE = "external/sts2fun/silent-a10.json";
const SOURCE = "external:sts2fun";
const VERSIONS = ["v0.107", "v0.108", "v0.109", "v0.110", "v0.111"];
const CLUSTER_CAUTION = "现有样本无法区分流派优劣、不作方向依据";
type Input = Record<string, unknown>;
type Row = Record<string, unknown>;
type Table = "card" | "skip" | "deck_size" | "encounter" | "clusters" | "cooccurrence";
interface Dataset {
  schema_version: number;
  source: string;
  cohorts: Record<string, { runs: number; players: number; wins: number; builds: Record<string, number> }>;
  provenance: Row;
  input_sha256: Record<string, string>;
  tables: Record<Table, { columns: string[]; rows: unknown[][] }>;
}

const COMMON_LIMITATIONS = [
  "自选上传偏差：可能只上传胜局；区间不能纠正缺失对局，不能代表全体玩家。",
  "描述性关联，非因果；未控制牌组、HP、替代选项、路线、玩家水平等全部混杂。",
  "口径不同：仅外部 Silent A10 单人有效、未弃局、无 modifiers 的上传；与本系统自有统计分账，不计入自有分母或实盘验证。",
  "版本分别统计，不池化；邻近版本不能直接套用当前机制。区间为95%；null为未知，零/全胜的退化区间不表示确定性。",
];
const NOTES: Record<Table, string[]> = {
  card: [
    "offered/picked/not_picked 是保留奖励机会数，同局可重复；players 是贡献玩家数，逐行独立局数未提供（未知）。只含单room战斗3/4张且至多选1张的奖励，不含商店/事件或无法拆分的多奖励。",
    "pick_rate_cluster_ci、picked_win_cluster_ci、not_picked_win_cluster_ci、win_difference_cluster_ci 为玩家整簇bootstrap；win_difference 是拿后整局胜率减不拿整局胜率。",
    "player_act_adjusted_difference/adjusted_cluster_ci 只在玩家×幕内两边都有观察的 strata 做重叠权重调整；只提供调整后的差值，分别调整后的两组胜率无数据。matched_players/strata/offers 是重叠覆盖，不能当总样本。调整仍非因果；逐卡未做多重比较校正。",
  ],
  skip: [
    "screens/skipped 是保留奖励点数/跳过点数；同局重复，独立局数及逐行玩家数未提供（未知）。cluster_ci 为玩家整簇bootstrap；不是固定跳过门槛。只含单room战斗可识别的3/4张奖励。",
  ],
  deck_size: [
    "size 是结束牌组张数分箱，n 是局数，players 是贡献玩家数；all 为全体，reached_act3 为已到第三幕。两范围重叠，不能相加。cluster_ci 为玩家簇bootstrap，wilson 未处理玩家相关。",
    "结束张数受死亡时点和未来取牌影响，存在存活偏差；不能据此推荐增大牌组。",
  ],
  encounter: [
    "fights 是场次，independent_runs/independent_players 是独立局数/玩家数；同局可贡献多场。各指标另列 n、unknown、independent_runs/units，units 为玩家。",
    "gross_damage 是外部总受伤，不是本系统HP净损失，不能当模拟伤害真值；回合被死亡截断。death_events 是死亡场数，death_mean 是死亡率，death_cluster_ci/turns_cluster_ci 为按玩家整簇的场次加权区间。",
    "只保留可归属的单room记录；SL政策未知，只看到上传尝试；缺进场条件匹配。按原生遭遇ID查，不猜怪物映射；不返回本系统对照行。",
  ],
  clusters: [
    CLUSTER_CAUTION,
    "仅v0.111，最终牌组二元TF-IDF+球面k-means，半数玩家发现、另一半评估；标签由数据产生，不是已验证流派。默认k=4/seed=24/reached_act3；cluster编号不跨模型对齐。",
    "n/wins/players 为该簇评估局/胜局/玩家，train_n/evaluation_n 为该模型范围的训练/评估局；玩家可跨簇，不能求和当独立玩家。distinctive_cards 的n为簇内含该卡局数，lift只描述常一起出现。cluster_ci 为玩家簇区间，wilson 未处理玩家相关。",
    "第三幕主模型六对比较及k=3/4/5、三个初始化的57对比较均无法分辨；不等于流派等效。区间未包括重新训练不确定性；最终牌组含未来信息和存活偏差，不支持早期方向选择。",
  ],
  cooccurrence: [
    CLUSTER_CAUTION,
    "仅v0.111；n 是共现局数，total 是范围总局数，a_n/b_n 是各卡出现局数；逐行玩家数未提供（未知）。按原表lift降序、相同lift保持原序，支持至少20局且排除出现超过90%的卡。",
    "lift/Jaccard 只描述常一起出现，不是协同收益或拿第二张的增益；最终牌组有未来信息和存活偏差。",
  ],
};

const PAGING: Record<string, JsonSchema> = {
  limit: { type: "integer", minimum: 1, maximum: 10, description: "最多返回几行，默认4；最多10，另受16000字节上限约束" },
  offset: { type: "integer", minimum: 0, maximum: 10_000, description: "分页起点，默认0；按返回的next_offset继续" },
};
const VERSION: JsonSchema = { type: "string", enum: VERSIONS, description: "外部游戏版本，默认v0.111（其build全为v0.111.0）；其他版本分账" };
const ACT: JsonSchema = { type: "integer", minimum: 1, maximum: 3, description: "幕；省略返回all及各幕已有行（遭遇只分幕）" };
const SCOPE: JsonSchema = { type: "string", enum: ["all", "reached_act3"], description: "全体或已到第三幕；牌组张数省略列两范围，聚类/共现默认reached_act3" };

function load(ctx: ToolContext): Dataset {
  const path = join(ctx.knowledgeDir, EXTERNAL_STATS_FILE);
  if (statSync(path).size > 2_000_000) throw new Error("oversize");
  const bytes = readFileSync(path);
  // Pin the reviewed projection: damaged or replaced data must not become plausible statistics.
  if (createHash("sha256").update(bytes).digest("hex") !== EXTERNAL_STATS_DATA_SHA256) throw new Error("checksum");
  return JSON.parse(bytes.toString("utf8")) as Dataset;
}

function id(input: Input, key: string, prefix: string): string | undefined {
  const raw = input[key];
  if (raw === undefined) return undefined;
  const normalized = (raw as string).trim().toUpperCase().replace(new RegExp(`^${prefix}\\.`), "");
  if (!/^[A-Z0-9_-]{1,100}$/.test(normalized)) throw new Error("ID应为1–100位字母、数字、下划线或连字符；不支持路径或模糊猜测");
  return normalized;
}

/** Availability/identity cues only, using the very pinned aggregate and exact IDs the tools accept. */
export function externalStatsQueryHints(ctx: ToolContext) {
  const reward = ctx.label === "reward/card", shop = ctx.label?.startsWith("shop/") === true;
  if ((!reward && !shop) || knowledgeCharacter() !== "silent" || ctx.ascension !== 10) return null;
  const object = (v: unknown): Row => !!v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
  const raw = object(ctx.state), p = object(ctx.payload), facts = object(p["facts"]);
  const screen = object(raw[reward ? "reward" : "shop"] ?? p[reward ? "reward" : "shop"]);
  const offered = screen[reward ? "card_options" : "cards"];
  const ids = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v !== "string") return;
    try { const value = id({ id: v }, "id", "CARD"); if (value) ids.add(value); } catch { /* No guessed names or mappings. */ }
  };
  if (Array.isArray(offered)) for (const entry of offered) {
    const row = object(entry); if (!shop || row["is_stocked"] !== false) add(row["card_id"]);
  }
  else for (const [key, value] of Object.entries(ctx.options ?? {})) {
    if (shop && !key.startsWith("buy_card") || !value) continue;
    try { const row = object(JSON.parse(value)); add(row["id"] ?? row["card_id"]); } catch { /* Display prose is not an ID. */ }
  }
  let data: Dataset;
  try { data = load(ctx); } catch { return null; }
  const act = Number(ctx.act ?? facts["act"] ?? p["act"]);
  const byAct = Number.isInteger(act) && act >= 1 && act <= 3 ? { act } : {};
  const tables = new Map<Table, Row[]>();
  const rows = (table: Table) => {
    let view = tables.get(table);
    if (!view) { view = data.tables[table].rows.map(values => Object.fromEntries(data.tables[table].columns.map((key, i) => [key, values[i]])))
      .filter(row => row["version"] === "v0.111"); tables.set(table, view); }
    return view;
  };
  const matching = (row: Row) => byAct.act === undefined || row["act"] === byAct.act;
  const cards = [...ids].map(card => ({ id: card, count: rows("card").filter(r => r["card"] === card && matching(r)).length,
    input: { id: card, ...byAct } })).filter(card => card.count > 0);
  const make = (table: Table, input: Input, count: number) => ({ tool: `external_stats_${table}`, count, ...(count ? { input } : {}) });
  const boss = object(raw["run"])["boss_id"] ?? facts["act_boss"];
  const encounters = typeof boss === "string" ? rows("encounter").filter(r => r["encounter_id"] === `ENCOUNTER.${boss.replace(/^ENCOUNTER\./, "")}` && matching(r)) : [];
  const cooccurrence = [...ids].map(card => ({ card, count: rows("cooccurrence").filter(r => r["scope"] === "reached_act3" && (r["a"] === card || r["b"] === card)).length })).find(r => r.count > 0);
  return { source: SOURCE, version: "v0.111", status: "ok", optional: true, dataset_sha256: EXTERNAL_STATS_DATA_SHA256,
    candidate_cards: ids.size, matched_cards: cards.length, cards: cards.slice(0, 6), omitted_cards: Math.max(0, cards.length - 6),
    tools: [make("card", cards[0]?.input ?? {}, cards[0]?.count ?? 0),
      make("skip", byAct, rows("skip").filter(matching).length),
      make("deck_size", { scope: "all" }, rows("deck_size").filter(r => r["scope"] === "all").length),
      make("encounter", { id: boss, ...byAct }, encounters.length),
      make("clusters", { scope: "reached_act3", k: 4, seed: 24 }, rows("clusters").filter(r => r["scope"] === "reached_act3" && r["k"] === 4 && r["seed"] === 24).length),
      make("cooccurrence", { card: cooccurrence?.card, scope: "reached_act3" }, cooccurrence?.count ?? 0)],
    note: "外部Silent A10真人样本背景，由你自行决定是否查询；卡牌/跳过表是奖励机会统计，不是商店购买率。仅描述关联、非因果，与自有验证分账；聚类/共现不作构筑方向依据。" };
}

function makeTool(table: Table, description: string, properties: Record<string, JsonSchema>, required: string[],
  select: (row: Row, input: Input) => boolean): ToolDef {
  const schema: JsonSchema = { type: "object", properties: { version: VERSION, ...properties, ...PAGING }, required, additionalProperties: false };
  return {
    name: `external_stats_${table}`, description: `${description} 仅external:sts2fun；Silent A10，默认v0.111；只读聚合，与自有分母分账。返回来源、版本、样本、区间、下载日期和SHA；有分页和16000字节硬上限。`,
    inputSchema: schema,
    run(input, ctx) {
      let version = "v0.111";
      let data: Dataset | undefined;
      const envelope = (error?: string): Row => ({
        source: SOURCE, version, character: "silent", ascension: 10,
        downloaded_at: "2026-10-21",
        url: "https://sts2.fun/static/sts2_public.db.zst",
        database_sha256: "1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5",
        dataset_sha256: EXTERNAL_STATS_DATA_SHA256,
        cohort: data?.cohorts[version] ?? null,
        ...(data ? { provenance: data.provenance, aggregate_sha256: data.input_sha256 } : {}),
        limitations: [...COMMON_LIMITATIONS, ...NOTES[table]],
        ...(error ? { status: "无数据", reason: error, rows: [] } : { status: "ok" }),
      });
      const fail = (reason: string): ToolResult => ({ text: JSON.stringify(envelope(reason.slice(0, 500))), isError: true });
      // Bound validation errors too; never echo arbitrary/oversized input into the response.
      if (input === null || typeof input !== "object" || Array.isArray(input)) return fail("输入不合法：需要object");
      try {
        if (Buffer.byteLength(JSON.stringify(input)) > 2048) return fail("输入不合法：最多2048字节");
      } catch { return fail("输入不合法：需要可序列化JSON"); }
      const problems = validateInput(schema, input);
      if (problems.length) return fail(`输入不合法：${problems.join("；")}`);
      version = (input["version"] as string | undefined) ?? version;
      if (knowledgeCharacter() !== "silent" || ctx.ascension !== 10) return fail("仅有Silent A10外部样本；当前角色/进阶不适用，不回退到其他角色或进阶");
      if ((table === "clusters" || table === "cooccurrence" || table === "encounter") && version !== "v0.111") return fail("此表仅有v0.111聚合，无该版本数据");
      try { data = load(ctx); } catch { return fail("聚合文件缺失、不可读或SHA校验失败；无数据，不回退到原库、自有统计或网络"); }
      const packed = data.tables[table];
      let rows: Row[];
      try {
        rows = packed.rows.map((values) => Object.fromEntries(packed.columns.map((key, index) => [key, values[index]])))
          .filter((row) => row["version"] === version && select(row, input));
      } catch (caught) { return fail(caught instanceof Error ? caught.message : "输入不合法"); }
      const offset = (input["offset"] as number | undefined) ?? 0;
      const limit = (input["limit"] as number | undefined) ?? 4;
      if (!rows.length || offset >= rows.length) return fail("无匹配数据或分页已到末尾；未观察不等于零。请核ID、幕、范围、模型或offset");
      const page = rows.slice(offset, offset + limit);
      const response = (): Row => ({ ...envelope(), table, total_rows: rows.length, offset,
        returned_rows: page.length, next_offset: offset + page.length < rows.length ? offset + page.length : null,
        rows: page });
      let text = JSON.stringify(response());
      // Drop whole rows, never truncate a statistic, its interval or its source/caution.
      while (Buffer.byteLength(text) > EXTERNAL_STATS_MAX_BYTES && page.length) {
        page.pop();
        text = JSON.stringify(response());
      }
      return page.length ? { text } : fail("单行超出返回上限；无数据，未截断数值或来源");
    },
  };
}

/** #33 adds this list to its knowledge-only registry; legacy tool lists and prompts stay unchanged here. */
export function externalStatsTools(): ToolDef[] {
  return [
    makeTool("card", "查卡牌按幕的提供/拿取、拿取率与区间、拿/不拿整局胜率与区间、玩家/幕调整胜率差及重叠覆盖。",
      { id: { type: "string", description: "精确卡牌ID，如SNAKEBITE；可带CARD.，不接受中文猜映射" }, act: ACT }, ["id"],
      (r, i) => r["card"] === id(i, "id", "CARD") && (i["act"] === undefined || r["act"] === i["act"])),
    makeTool("skip", "查按幕保留奖励点的跳过次数、跳过率和玩家簇区间。",
      { act: ACT }, [], (r, i) => i["act"] === undefined || r["act"] === i["act"]),
    makeTool("deck_size", "查结束牌组张数分箱与胜率（全体/已到第三幕），有存活偏差，不据此推荐张数。",
      { scope: SCOPE }, [], (r, i) => i["scope"] === undefined || r["scope"] === i["scope"]),
    makeTool("encounter", "查遭遇ID的外部总受伤、回合和死亡分布、独立局/玩家数（仅v0.111）。",
      { id: { type: "string", description: "精确遭遇ID，如DECIMILLIPEDE_ELITE；可带ENCOUNTER.，不猜怪物/本系统映射" }, act: ACT }, ["id"],
      (r, i) => r["encounter_id"] === `ENCOUNTER.${id(i, "id", "ENCOUNTER")}` && (i["act"] === undefined || r["act"] === i["act"])),
    makeTool("clusters", `查数据产生的簇、标签、评估胜率和区间。${CLUSTER_CAUTION}。`,
      { scope: SCOPE, k: { type: "integer", enum: [3, 4, 5], description: "聚类数量，默认4" },
        seed: { type: "integer", enum: [24, 240, 2400], description: "模型初始化，默认24；编号不跨模型对齐" } }, [],
      (r, i) => r["scope"] === (i["scope"] ?? "reached_act3") && r["k"] === (i["k"] ?? 4) && r["seed"] === (i["seed"] ?? 24)),
    makeTool("cooccurrence", "查常一起出现的卡对及lift/Jaccard，仅为描述，不是收益或方向依据。",
      { scope: SCOPE, card: { type: "string", description: "可选卡牌ID，筛选包含该卡的共现对" },
        with_card: { type: "string", description: "可选另一卡ID，必须同时给card，精确查一对" } }, [],
      (r, i) => {
        const a = id(i, "card", "CARD");
        const b = id(i, "with_card", "CARD");
        if (b && !a) throw new Error("with_card必须同时给card");
        return r["scope"] === (i["scope"] ?? "reached_act3") && (!a || r["a"] === a || r["b"] === a)
          && (!b || r["a"] === b || r["b"] === b) && (!b || a !== b);
      }),
  ];
}
