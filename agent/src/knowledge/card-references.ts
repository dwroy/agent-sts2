/** Resolve only cards referenced by visible game text; catalogue facts confer no model eligibility. */
import { asArray, asRecord, numOrNull, str, stripMarkup, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { CardInfo, Knowledge } from "./index.js";

interface Reference { identity: string; by: "id" | "name"; upgraded: boolean }
export interface CardReferenceContext {
  character: string;
  run: string;
  floor: number | null;
  source: string;
  modVersion?: string;
  cardIds?: string[];
  previews?: Record<string, unknown>[];
  maxCards?: number;
  maxDepth?: number;
}

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function references(text: string, cards: CardInfo[]): Reference[] {
  const plain = stripMarkup(text);
  const marked = new Set([...text.matchAll(/\[([a-z]+)\]([^\[\]]+)\[\/\1\]/gi)].map((match) => stripMarkup(match[2]!)));
  const matches: { start: number; end: number; ref: Reference }[] = [];
  for (const card of cards) {
    for (const [identity, by] of [[card.id, "id"], [card.name, "name"]] as const) {
      if (!identity) continue;
      // Short localized names require markup or an explicit card-count phrase.
      const explicit = marked.has(identity) || marked.has(`${identity}+`) || new RegExp(`张\\s*${escape(identity)}`).test(plain);
      if (by === "name" && identity.length < 3 && !explicit) continue;
      const latin = /^[\w +'-]+$/.test(identity);
      const pattern = new RegExp(`${latin ? "(?<![\\w])" : ""}${escape(identity)}(\\+)?${latin ? "(?![\\w])" : ""}`, "g");
      for (const match of plain.matchAll(pattern)) matches.push({ start: match.index!, end: match.index! + match[0].length, ref: { identity, by, upgraded: !!match[1] } });
    }
  }
  // A contained short name must not turn a longer named card into two cards.
  const kept = matches.filter((match) => !matches.some((other) => other.start <= match.start && other.end >= match.end && other.end - other.start > match.end - match.start));
  const result = kept.map((match) => match.ref);
  // Unknown marked names are card references only when the source identifies them as cards.
  for (const name of marked) {
    if (!new RegExp(`张\\s*${escape(name)}`).test(plain)) continue;
    if (!result.some((ref) => ref.identity === name || `${ref.identity}+` === name)) result.push({ identity: name.replace(/\+$/, ""), by: "name", upgraded: name.endsWith("+") });
  }
  return result;
}

/** Bounded recursive facts. The original clause preserves quantity, destination and temporary conditions. */
export function namedCardFacts(text: string, knowledge: Knowledge, context: CardReferenceContext): Record<string, JsonValue> {
  const cards = knowledge.cards();
  const previews = context.previews ?? [];
  const initial = [
    ...(context.cardIds ?? []).map((id): Reference => ({ identity: id.replace(/\+$/, ""), by: "id", upgraded: id.endsWith("+") })),
    ...previews.flatMap((preview): Reference[] => {
      const id = str(preview["card_id"], str(preview["id"]));
      return id ? [{ identity: id, by: "id", upgraded: preview["is_upgraded"] === true }] : [];
    }),
    ...references(text, cards),
  ];
  if (!initial.length) return {};
  const maxCards = Math.max(1, Math.min(24, context.maxCards ?? 12));
  const maxDepth = Math.max(0, Math.min(3, context.maxDepth ?? 2));
  const queue = initial.map((ref) => ({ ref, depth: 0, via: context.source }));
  const seen = new Set<string>();
  const facts: JsonValue[] = [];
  const gaps = new Map<string, JsonValue>();
  const modVersion = knowledge.catalog?.modVersion ?? null;
  const stale = !!context.modVersion && !!modVersion && context.modVersion !== modVersion;
  const unknown = (identity: string, fields: string[], reason: string, via: string, candidates: string[] = []) => {
    const key = JSON.stringify([context.character, modVersion, identity, [...fields].sort()]);
    if (!gaps.has(key)) gaps.set(key, { key, identity, missing_fields: fields, reason, candidates, source: via, run_id: context.run, floor: context.floor });
  };
  for (let at = 0; at < queue.length; at++) {
    const { ref, depth, via } = queue[at]!;
    const candidates = cards.filter((card) => ref.by === "id" ? card.id === ref.identity : card.name === ref.identity);
    // An explicit id or visible preview can disambiguate a name, but never an unrelated name.
    const identified = candidates.filter((card) => initial.some((item) => item.by === "id" && item.identity === card.id));
    const chosen = identified.length === 1 ? identified : candidates;
    if (chosen.length > 1) {
      unknown(ref.identity, ["identity"], "同名卡无法唯一对应，未猜测效果", via, chosen.map((card) => card.id));
      continue;
    }
    const info = chosen[0];
    const id = info?.id ?? ref.identity;
    const key = `${id}${ref.upgraded ? "+" : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const preview = previews.find((card) => str(card["card_id"], str(card["id"])) === id && (card["is_upgraded"] === true) === ref.upgraded);
    if (!info && !preview) {
      unknown(key, ["definition"], "已有mod资料未提供该牌定义", via);
      continue;
    }
    if (facts.length >= maxCards || depth > maxDepth) {
      unknown(key, ["reference_expansion"], "关联展开达到数量或层数上限", via);
      continue;
    }
    const upgrade = asRecord(info?.upgrade);
    // Upgrade data is a partial preview. Never substitute base cost/effect for missing upgraded values.
    const variant = preview ?? (ref.upgraded ? upgrade : null);
    const description = variant ? str(variant["description"]) : info?.description ?? "";
    const cost = variant ? numOrNull(variant["cost"]) : info?.cost ?? null;
    const xCost = variant ? typeof variant["is_x_cost"] === "boolean" ? variant["is_x_cost"] : null : info?.xCost ?? null;
    const keywords = variant && Array.isArray(variant["keywords"]) ? asArray(variant["keywords"]).map(String) : variant ? null : info?.keywords ?? null;
    const missing = [...(!description ? ["description"] : []), ...(cost === null && xCost !== true ? ["cost"] : [])];
    if (missing.length) unknown(key, missing, "现场或对应版本资料缺字段，保持未知", via);
    if (stale && !preview) unknown(key, ["version"], "缓存mod版本与现场不符，以下资料待核", via);
    facts.push({
      id, name: str(preview?.["name"], info?.name ?? id), upgraded: ref.upgraded,
      cost, is_x_cost: toJsonValue(xCost), type: str(variant?.["type"], info?.type ?? "") || null,
      rarity: info?.rarity || null, target: str(variant?.["target"], info?.target ?? "") || null,
      description: description || null,
      description_raw: variant ? str(variant["description_raw"]) || null : info?.descriptionRaw || null,
      keywords, tags: toJsonValue(info?.tags),
      vars: toJsonValue(variant ? variant["vars"] : info?.vars),
      star_cost: variant ? numOrNull(variant["star_cost"]) : info?.starCost ?? null,
      is_x_star_cost: toJsonValue(variant ? variant["is_x_star_cost"] : info?.xStarCost),
      upgrade: toJsonValue(info?.upgrade), source: preview ? "本题现场预览" : `mod /data/cards (${knowledge.source})`,
      verification: preview ? "本题现场资料" : stale ? "版本不符，待核" : modVersion ? "mod版本匹配的牌面资料" : "资料版本未知，待核",
      referenced_by: via,
    });
    for (const child of references(description, cards)) queue.push({ ref: child, depth: depth + 1, via: key });
  }
  return { card_references: {
    source_text: text, cards: facts, unknowns: [...gaps.values()],
    catalog: { source: knowledge.source, mod_version: modVersion, fetched_at: knowledge.catalog?.fetchedAt ?? null, current_mod_version: context.modVersion ?? modVersion, game_version: null },
    coverage: "本题具名牌及其规则文本中的关联牌；数量、获得位置和临时条件以source_text原文为准。未标记且无法识别的名称覆盖未知。",
    knowledge_status: "仅传递已有牌面资料；效果实测、模拟支持和打法验证另行取证，不能据此认定已实现或推荐选牌。",
  } };
}
