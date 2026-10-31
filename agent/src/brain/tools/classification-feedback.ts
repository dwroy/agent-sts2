/** Diagnostics describe original selector stages; counts never become applicable knowledge. */
import { questionFacts } from "./query-guidance.js";
import { deckCounts } from "../../knowledge/strategy-entries.js";
import type { ToolContext } from "./types.js";
import type { IndexedItem } from "../../knowledge/runtime/reader.js";
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

export function dynamicFeedback(type: string, items: IndexedItem[], selected: IndexedItem[], ctx: ToolContext) {
 if (!["experience", "strategy", "reflex"].includes(type)) return { status: "not_evaluated", rejected: null, unknown: null };
 if (type !== "strategy") return { status: "selector_only", rejected: items.length - selected.length, unknown: null,
  limitation: type === "reflex" ? "仅题型过滤；predicate未求值" : "仅原经验适用性/相关性选择；未证明正文条件成立" };
 const p = record(ctx.payload), contexts = [questionFacts(ctx), p, record(p["run_state"]), record(p["run_plan_task"]), record(p["run_brief"])];
 const get = (k: string) => contexts.map(c => c[k]).find(v => v !== undefined && v !== null);
 const number = (k: string) => typeof get(k) === "number" && Number.isFinite(get(k)) || typeof get(k) === "string" && /^\d+$/.test(String(get(k)));
 const kept = new Set(selected.map(e => e.item));
 let unknown = 0;
 for (const e of items) {
  if (kept.has(e.item)) continue;
  const t = e.value.trigger, hp = /^(\d+)\s*\/\s*(\d+)(?:\s|$)/.exec(String(get("hp")));
  // Missing/invalid facts and unexamined archetype state stay unknown, never known-false.
  if (t.acts && !number("act") || t.floor && !number("floor") || t.bosses && !get("act_boss") && !get("boss")
   || t.hp_ratio && (!hp || Number(hp[2]) <= 0) || t.deck_size && !number("deck_size") && !deckCounts(get("deck"))
   || t.deck_cards && !deckCounts(get("deck")) || t.archetype) unknown++;
 }
 return { status: "evaluated", rejected: items.length - selected.length - unknown, unknown,
  limitation: "只验证原trigger；正文额外条件未求值，流派未知保留未知" };
}
