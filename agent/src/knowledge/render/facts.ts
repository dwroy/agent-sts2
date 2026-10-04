/**
 * The data facts written into the hand-written knowledge texts: fillGuideFacts' placeholders in the guide, the
 * handbook and the experience lessons ({GIANT_KILLS_A8}, {BOSS_RECORD:…}, {UNKNOWN_FIGHTS:9:2}, …), and the
 * monster-DB numbers in Jev's hints ({DMG:…}), filled fresh or frozen for the day.
 *
 * KNOWLEDGE_PREFIX=full puts those texts in the system prompt ahead of the monster DB and the statistics (the prefix's
 * blocks go from the one that changes least to the one that changes most). The data behind the placeholders is
 * rebuilt after every run, so filled fresh the old-knowledge and experience blocks changed with every refresh and
 * DeepSeek's cached prefix broke there, not at the monster block, the first one a refresh has to change. v3 8546fde
 * froze its own system prompt's guide and handbook per day for the same reason (llm/deepseek.ts frozenGuideFacts,
 * whole texts, KNOWLEDGE_PREFIX=off). Here each placeholder's value is frozen instead, in one table a day
 * (`<dir>/<YYYY-MM-DD>-prefix-facts.json`, key -> value): the first render of a local day fills what it meets and
 * writes it; every later render that day (the next run's process, another block) reads the same values, so a
 * record the guide and a lesson both quote is one count. A placeholder first met later in the day (a learner edit)
 * is filled then and kept. The numbers are at most a day old; the statistics and the monster DB further down the
 * prefix are always fresh and win on a conflict (the prefix header says so). Other days' tables are removed when a
 * new one is written; v3's snapshots in the same directory are left to v3's own clean-up. No dir: filled fresh (kb_*
 * tools, gkb-dump, replays, tests).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Fills a text's data placeholders. `fill` computes a value from the data now (fillGuideFacts, or the hints' fill);
 * `scope` separates keys whose value depends on more than the placeholder (a monster-DB number's ascension).
 */
export type FactFiller = (text: string, fill: (text: string) => string, scope?: string) => string;

/** Filled from the data now (v3's behaviour for everything outside the system prompt). */
export const freshFacts: FactFiller = (text, fill) => fill(text);

/** A data placeholder as fillGuideFacts and fillDbNumbers write them: {GIANT_KILLS_A8}, {@9:DMG:X:Y}, {BOSS_LOSS:X:9}. */
const PLACEHOLDER = /\{@?[A-Z0-9][A-Z0-9_]*(?::[A-Z0-9_]+)*\}/g;

const TABLE = /^(\d{4}-\d{2}-\d{2})-prefix-facts\.json$/;

function localDay(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readTable(file: string): Record<string, string> {
  try {
    if (!existsSync(file)) return {};
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    // unreadable: filled again (and rewritten)
    return {};
  }
}

function writeTable(dir: string, file: string, day: string, table: Record<string, string>): void {
  try {
    mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(table, Object.keys(table).sort(), 1)}\n`, "utf8");
    renameSync(tmp, file);
    for (const name of readdirSync(dir)) {
      const match = TABLE.exec(name);
      if (match && match[1] !== day) rmSync(join(dir, name), { force: true });
    }
  } catch {
    // a table that cannot be written costs the cache, never the text
  }
}

/**
 * The day's frozen values from `dir` (freshFacts without one). The table is read once per day per filler and
 * written when a render adds to it; `now` is the clock (tests).
 */
export function frozenFacts(dir: string | undefined, now: () => Date = () => new Date()): FactFiller {
  if (!dir) return freshFacts;
  let held: { day: string; table: Record<string, string> } | null = null;
  return (text, fill, scope = "") => {
    const tokens = [...new Set(text.match(PLACEHOLDER) ?? [])];
    if (tokens.length === 0) return text;
    const day = localDay(now());
    const file = join(dir, `${day}-prefix-facts.json`);
    if (!held || held.day !== day) held = { day, table: readTable(file) };
    const table = held.table;
    let added = false;
    let out = text;
    for (const token of tokens) {
      const key = scope ? `${scope}|${token}` : token;
      let value = table[key];
      if (value === undefined) {
        const filled = fill(token);
        // Not a placeholder the fill knows: left as written, not recorded.
        if (filled === token) continue;
        value = filled;
        table[key] = filled;
        added = true;
      }
      out = out.split(token).join(value);
    }
    if (added) writeTable(dir, file, day, table);
    return out;
  };
}
