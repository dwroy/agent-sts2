/**
 * Knowledge check 2026-09-29 (Dai: the guide, the handbook, Jev's hints, the card tiers and the boss notes are
 * knowledge like the experience base; where our data says otherwise, the data's version, with its ascension and
 * n; counts filled from the data, not hand-written). See paper/materials/experience-changelog.md「知识库核对」.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DeepSeekClient } from "../src/llm/deepseek.js";
import { knowledgeFile } from "../src/knowledge/files.js";

const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge");
const read = (name: string) => readFileSync(knowledgeFile(KNOWLEDGE, name), "utf8");

describe("the guides: conflicts with the data rewritten, counts as placeholders", () => {
  it("no hand-written count or single-ascension number the data contradicts is left", () => {
    const guide = read("ironclad-guide.md");
    const handbook = read("ds-handbook.md");
    for (const text of [guide, handbook]) {
      expect(text).not.toMatch(/51 场螃蟹战|39 场只赢 8|5 局死在它手上|6 局死在它手上|2 胜 2 负|49 激光|（141 场）/);
      expect(text).not.toMatch(/慢打是输法|要赢靠早杀/);
    }
    // The Beast's stun line: 150 up to A8, 160 at A9 (monster DB PLOW_POWER).
    expect(guide).not.toMatch(/150 (HP|以下)/);
    expect(guide.split("{BEAST_STUN}").length - 1).toBe(3);
    expect(guide).toContain("证据（经验 crab-kill-order）：{CRAB_KILL_ORDER}");
    // Low HP: ? rooms are not safe squares.
    const route = guide.split("\n").find((line) => line.startsWith("- 路线："))!;
    expect(route).not.toContain("走问号/商店");
    expect(route).toContain("{UNKNOWN_FIGHTS}");
    expect(route).toContain("不开战斗的只有商店和休息点");
    // The Matriarch without Strength cards; Taunt out of the A grade; True Grit+ for Withers.
    expect(guide).toContain("{LAG_SLEEP}");
    expect(guide.split("\n").find((line) => line.startsWith("- 好牌(A)"))).not.toContain("挑衅");
    expect(guide).toContain("挑衅 Taunt(我们 A8 的数据");
    expect(guide).toContain("坚毅+/燃烧契约可以消耗凋萎");
    // The handbook: Foul Potion is no longer banned by code; the Vantom exception to "don't trade HP".
    expect(handbook.split("\n").find((line) => line.includes("已由代码强制执行"))).not.toContain("污浊药水");
    expect(handbook).not.toContain("代码不会喝，只能卖钱");
    expect(handbook).toContain("例外：墨影幻灵的滑溜还在时");
    expect(handbook).toContain("{LASER_T4}");
  });

  it("the DeepSeek system prompt carries none of the placeholders", () => {
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000, guideFile: knowledgeFile(KNOWLEDGE, "ironclad-guide.md"), handbookFile: knowledgeFile(KNOWLEDGE, "ds-handbook.md") });
    expect(client.systemPrompt).not.toMatch(/\{(?:[A-Z][A-Z0-9_]*(?::[A-Z0-9_]+)*|@\d+:[A-Z0-9_:]+)\}/);
  });
});

