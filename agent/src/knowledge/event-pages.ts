/**
 * Which event pages are an event's last question (event-pages.json, knowledge/builders/build-event-pages.py): the route block
 * rides on an event's last question only (M2, notes/v4-dev-brief.md item 2.5). An option counts as opening another
 * choice page when the logs saw it do so more often than end the event; a page is not the last one when every
 * option on it does. A page never logged counts as the last one (the block rides; at worst it rides twice).
 */

import { readFileSync } from "node:fs";

import { asArray, asRecord, bool, str } from "../core/util/json.js";
import { bumpDataVersion } from "../core/util/data-version.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "./files.js";

/** Per event id: option text_key -> [continues, ends]. */
export type EventPages = Record<string, Record<string, [number, number]>>;

let cache: EventPages | null = null;
let override: EventPages | null = null;

/** The logged event pages (empty when the file is missing or broken: every page then counts as the last one). */
export function eventPages(): EventPages {
  if (override) return override;
  if (!cache) {
    try {
      const data = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "event-pages.json"), "utf8")) as { events?: EventPages };
      cache = data.events ?? {};
    } catch {
      cache = {};
    }
  }
  return cache;
}

/** Tests: fixed data instead of the refreshed file (null restores it). */
export function setEventPagesForTests(data: EventPages | null): void {
  bumpDataVersion();
  override = data;
}

/** Whether an event option (its text_key) opened another choice page more often than it ended the event. */
export function optionContinues(eventId: string, textKey: string, pages: EventPages = eventPages()): boolean {
  const seen = pages[eventId]?.[textKey];
  return Boolean(seen && seen[0] > seen[1]);
}

/**
 * Whether this EVENT state's page is the event's last question: false only when every option on it (proceed and
 * locked ones aside) is known to open another choice page.
 */
export function isLastEventPage(event: Record<string, unknown>, pages: EventPages = eventPages()): boolean {
  const eventId = str(event["event_id"]);
  const options = asArray(event["options"]).map(asRecord).filter((option) => !bool(option["is_proceed"]) && !bool(option["is_locked"]));
  if (!eventId || options.length === 0) return true;
  return !options.every((option) => optionContinues(eventId, str(option["text_key"]), pages));
}
