/**
 * The learner's view of the finished runs, per character (2026-10-04, multi-character). logs/runs.jsonl rows carry
 * `character` (the game's character_id, "IRONCLAD"); a row without one is a legacy Ironclad run. Post-mortems in
 * notes/lessons.md are headed "## <RUN_ID>（A9，第17层，…）"; a non-Ironclad run's heading names the character as its
 * second item ("## <RUN_ID>（A0，静默猎手，第17层，…）"), and a heading without a character name is the Ironclad's.
 *
 * pendingRuns is ops/experience-pending.py per character: the post-mortems not yet folded into that character's
 * experience.json, counted among that character's runs only (the learner folds them in every 10, Roy 2026-10-03).
 * For the Ironclad it gives what the Python script gives.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CHARACTER_NAMES, DEFAULT_CHARACTER, characterKey } from "../../agent/src/knowledge/files.js";

interface RunRow {
  character: string;
  ascension?: number;
}

function readRows(runsFile: string): Map<string, RunRow> {
  const rows = new Map<string, RunRow>();
  if (!existsSync(runsFile)) return rows;
  for (const line of readFileSync(runsFile, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row: unknown;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    if (typeof record["run_id"] !== "string") continue;
    const character = characterKey(typeof record["character"] === "string" ? record["character"] : null) ?? DEFAULT_CHARACTER;
    const ascension = typeof record["ascension"] === "number" && Number.isFinite(record["ascension"]) ? record["ascension"] : undefined;
    rows.set(record["run_id"], { character, ...(ascension !== undefined ? { ascension } : {}) });
  }
  return rows;
}

/** run id -> knowledge id of its character, for every run in runs.jsonl (empty when the file is missing). */
export function runCharacters(runsFile: string): Map<string, string> {
  return new Map([...readRows(runsFile)].map(([id, row]) => [id, row.character]));
}

/** The highest ascension `character` has played in runs.jsonl, or undefined when it has played none. */
export function highestAscension(runsFile: string, character: string): number | undefined {
  let best: number | undefined;
  for (const row of readRows(runsFile).values()) {
    if (row.character === character && row.ascension !== undefined && (best === undefined || row.ascension > best)) best = row.ascension;
  }
  return best;
}

/** The character a lessons.md heading names as its second item ("静默猎手", "Silent"); null = none (the Ironclad). */
export function headingCharacter(heading: string): string | null {
  const summary = /[（(]([^）)]*)/.exec(heading)?.[1];
  const second = summary?.split(/[，,]/)[1]?.trim();
  if (!second) return null;
  const id = characterKey(second);
  return id && id in CHARACTER_NAMES ? id : null;
}

export interface PendingOptions {
  /** notes/lessons.md */
  lessonsFile: string;
  /** logs/runs.jsonl */
  runsFile: string;
  /** The checkout whose knowledge/characters/<character>/experience.json counts as folded (the live worktree). */
  liveDir: string;
  /** paper/materials/experience-changelog.md (a run id named there counts as folded). */
  changelogFile: string;
  character: string;
}

/** Run ids of `character` with a post-mortem not yet folded into its experience base, oldest first. */
export function pendingRuns(options: PendingOptions): string[] {
  // Runs listed inside <!-- --> have no post-mortem (the pre-learning-loop A0 runs).
  const lessons = readFileSync(options.lessonsFile, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const known = runCharacters(options.runsFile);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of lessons.matchAll(/^## ([0-9A-Z]{12})(.*)$/gm)) {
    const id = match[1]!;
    if (seen.has(id)) continue;
    seen.add(id);
    const character = known.get(id) ?? headingCharacter(match[2]!) ?? DEFAULT_CHARACTER;
    if (character === options.character) ids.push(id);
  }
  const folded = new Set<string>();
  const experience = join(options.liveDir, "knowledge", "characters", options.character, "experience.json");
  if (existsSync(experience)) {
    const parsed = JSON.parse(readFileSync(experience, "utf8")) as { entries?: { evidence?: string[] | null; contradicting?: string[] | null }[] };
    for (const entry of parsed.entries ?? []) for (const id of [...(entry.evidence ?? []), ...(entry.contradicting ?? [])]) folded.add(id);
  }
  if (existsSync(options.changelogFile)) for (const id of readFileSync(options.changelogFile, "utf8").match(/[0-9A-Z]{12}/g) ?? []) folded.add(id);
  return ids.filter((id) => !folded.has(id));
}
