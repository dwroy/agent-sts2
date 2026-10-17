import { createRequire as __replayCreateRequire } from 'node:module'; const require = __replayCreateRequire(import.meta.url);
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// src/core/paths.ts
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
function fromRoot(path) {
  return isAbsolute(path) ? path : resolve(PROJECT_ROOT, path);
}
var PROJECT_ROOT, AGENT_DIR, LOGS_DIR, DATA_DIR, KNOWLEDGE_DIR;
var init_paths = __esm({
  "src/core/paths.ts"() {
    "use strict";
    PROJECT_ROOT = resolve(dirname(fileURLToPath("file:///home/dw/Projects/agent-sts2/learner/runs/20261017-170120-62ee45ff-d6c7-407f-88be-efad3ce5199b-silent-boss-calibration/.published-model/agent/src/core/paths.ts")), "../../..");
    AGENT_DIR = join(PROJECT_ROOT, "agent");
    LOGS_DIR = join(PROJECT_ROOT, "logs");
    DATA_DIR = join(PROJECT_ROOT, "data");
    KNOWLEDGE_DIR = join(PROJECT_ROOT, "knowledge");
  }
});

// src/core/util/json.ts
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function str(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function num(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function numOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function bool(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}
function truncate(text, max) {
  text = iconsToText(text);
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}\u2026`;
}
function iconsToText(text) {
  const icon = (kind) => `(?:\\[img\\])?res:\\/\\/[^\\s\\[\\]]*?${kind}\\.png(?:\\[\\/img\\])?`;
  const run = (kind) => new RegExp(`(?:${icon(kind)}\\s*)*${icon(kind)}`, "g");
  const count2 = (match) => match.match(/\.png/g)?.length ?? 1;
  const numbered = (kind) => new RegExp(`(?:(\\d+)\u70B9?|(\u4E00)\u70B9)((?:\\[\\/?(?!img\\])[a-zA-Z_]+\\])*)${icon(kind)}(?!\\s*${icon(kind)})`, "g");
  const amountOf = (digits, one2) => digits ?? one2 ?? "";
  return text.replace(numbered("energy_icon"), (_m, digits, one2, markup = "") => `${amountOf(digits, one2)}${markup}\u70B9\u80FD\u91CF`).replace(numbered("star_icon"), (_m, digits, one2, markup = "") => `${amountOf(digits, one2)}${markup}\u9897\u661F`).replace(run("energy_icon"), (match) => `${count2(match)}\u70B9\u80FD\u91CF`).replace(run("star_icon"), (match) => `${count2(match)}\u9897\u661F`).replace(new RegExp(icon("[^\\s\\[\\]]*?"), "g"), "");
}
function stripMarkup(text) {
  return iconsToText(text).replace(/\[\/?[a-zA-Z_]+(?::[^\]]*)?\]/g, "").replace(/\\([\[\]{}])/g, "$1").replace(/\s+/g, " ").trim();
}
var init_json = __esm({
  "src/core/util/json.ts"() {
    "use strict";
  }
});

// src/knowledge/enchant-text.ts
function enchantEffect(name, amount) {
  const effect = ENCHANT_TEXT[name];
  return effect ? effect(amount) : "effect text unavailable";
}
function annotatePlating(text) {
  if (text.includes("[Plating: ")) return text;
  const stacks = [...new Set([...stripMarkup(text).matchAll(/(\d+)\s*层\s*覆甲/g)].map((match) => Number(match[1])))].filter((n) => n > 0);
  if (stacks.length === 0) return text;
  const sum = (n) => n <= 4 ? Array.from({ length: n }, (_, i) => n - i).join("+") : `${n}+${n - 1}+\u2026+1`;
  const totals = stacks.map((n) => `${n} stacks ${sum(n)} = ${n * (n + 1) / 2} block`).join(", ");
  return `${text} [Plating: block = stacks at your turn's end, then 1 stack less each turn; ${totals} in all, not ${stacks.length === 1 ? stacks[0] : "the same"} every turn]`;
}
var ENCHANT_TEXT;
var init_enchant_text = __esm({
  "src/knowledge/enchant-text.ts"() {
    "use strict";
    init_json();
    ENCHANT_TEXT = {
      // 「第一次打出时抽2张牌」 on every 迅速 card (Demon Form, Feel No Pain, Inflame, Pyre, Stone Armor …).
      \u8FC5\u901F: (n) => `the first time the card is played, draw ${n ?? "N"} cards (\u300C\u7B2C\u4E00\u6B21\u6253\u51FA\u65F6\u62BD${n ?? "N"}\u5F20\u724C\u300D)`,
      // Damage var +2 for 锋利2 (Bash, Twin Strike, Whirlwind, Setup Strike, Perfected Strike, Howl from Beyond).
      \u950B\u5229: (n) => `the card deals ${n ?? "N"} more damage (per hit)`,
      // Block var +2 for 灵巧2 (Flame Barrier, Shrug It Off).
      \u7075\u5DE7: (n) => `the card gives ${n ?? "N"} more Block`,
      // 「失去2点生命」 added; damage x1.5 (Bludgeon 32 -> 48, Twin Strike 5 -> 7, Sword Boomerang 3 -> 4).
      \u8150\u5316: () => "the card deals 50% more damage, and playing it costs 2 HP (\u300C\u5931\u53BB2\u70B9\u751F\u547D\u300D)",
      // 「这张牌的格挡值永久增加1点」「消耗」 added (Defend).
      \u9ECF\u7CCA: () => "each time the card is played its Block rises by 1 for the rest of the run, and it Exhausts (\u300C\u8FD9\u5F20\u724C\u7684\u683C\u6321\u503C\u6C38\u4E45\u589E\u52A01\u70B9\u3002\u6D88\u8017\u300D)",
      // 「保留」 added.
      \u7A33\u5B9A: () => "Retain: the card stays in hand at the end of the turn (\u300C\u4FDD\u7559\u300D)",
      // 「重放1」 added.
      \u6DA1\u65CB: () => "Replay 1: the card is played one extra time (\u300C\u91CD\u653E1\u300D)",
      \u534E\u5F69: () => "Replay 1: the card is played one extra time (\u300C\u91CD\u653E1\u300D)",
      // Strike: cost 1 -> 0, Damage +3, 「永恒」 added.
      \u7279\u5179\u5361\u5854\u62C9\u7684\u4F59\u70EC: () => "the card costs 0, deals 3 more damage, and is Eternal (\u300C\u6C38\u6052\u300D: cannot be removed from the deck)",
      // Damage var +8 (Whirlwind, Pommel Strike, Bash, Dismantle).
      \u6D3B\u529B: () => "the card deals 8 more damage"
    };
  }
});

// src/knowledge/potion-values.ts
function fillPotionText(potionId, text) {
  const values = POTION_VALUES[potionId] ?? {};
  const filled = text.replace(/\{([A-Za-z]+)(?::([A-Za-z]+)\((\d*)\))?\}/g, (_whole, name, format, arg2) => {
    const value = arg2 ? Number(arg2) : values[name];
    if (value === void 0) return UNKNOWN_VALUE;
    if (format === "energyIcons") return `${value}\u70B9\u80FD\u91CF`;
    if (format === "starIcons") return `${value}\u9897\u661F`;
    return String(value);
  });
  return annotatePlating(stripMarkup(filled));
}
var POTION_VALUES, UNKNOWN_VALUE;
var init_potion_values = __esm({
  "src/knowledge/potion-values.ts"() {
    "use strict";
    init_json();
    init_enchant_text();
    POTION_VALUES = {
      BEETLE_JUICE: { Repeat: 4, DamageDecrease: 30 },
      BLOCK_POTION: { Block: 12 },
      BLOOD_POTION: { HealPercent: 20 },
      BOTTLED_POTENTIAL: { Cards: 5 },
      CLARITY: { Cards: 1, ClarityPower: 3 },
      CURE_ALL: { Energy: 1, Cards: 2 },
      DEXTERITY_POTION: { DexterityPower: 2 },
      DISTILLED_CHAOS: { Repeat: 3 },
      ENERGY_POTION: { Energy: 2 },
      EXPLOSIVE_AMPOULE: { Damage: 10 },
      FIRE_POTION: { Damage: 20 },
      FLEX_POTION: { StrengthPower: 5 },
      FOUL_POTION: { Damage: 12 },
      FRUIT_JUICE: { MaxHp: 5 },
      FYSH_OIL: { StrengthPower: 1, DexterityPower: 1 },
      GLOWWATER_POTION: { Cards: 10 },
      HEART_OF_IRON: { PlatingPower: 7 },
      LIQUID_BRONZE: { ThornsPower: 3 },
      LUCKY_TONIC: { BufferPower: 1 },
      MAZALETHS_GIFT: { RitualPower: 1 },
      POTION_OF_BINDING: { WeakPower: 1, VulnerablePower: 1 },
      POTION_SHAPED_ROCK: { Damage: 15 },
      POWDERED_DEMISE: { Demise: 9 },
      RADIANT_TINCTURE: { Energy: 1, RadiancePower: 3 },
      REGEN_POTION: { RegenPower: 5 },
      SHACKLING_POTION: { StrengthPower: 7 },
      SHIP_IN_A_BOTTLE: { Block: 10 },
      SNECKO_OIL: { Cards: 7 },
      SPEED_POTION: { DexterityPower: 5 },
      STABLE_SERUM: { Repeat: 2 },
      STRENGTH_POTION: { StrengthPower: 2 },
      SWIFT_POTION: { Cards: 3 },
      VULNERABLE_POTION: { VulnerablePower: 3 },
      WEAK_POTION: { WeakPower: 3 }
    };
    UNKNOWN_VALUE = "?(\u6570\u503C\u672A\u77E5)";
  }
});

// src/knowledge/index.ts
function parseCard(entry) {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    type: str(obj["type"]),
    rarity: str(obj["rarity"]),
    cost: numOrNull(obj["cost"]),
    target: str(obj["target"]),
    description: stripMarkup(str(obj["description"])),
    keywords: asArray(obj["keywords"]).map((value) => str(value)).filter(Boolean),
    tags: asArray(obj["tags"]).map((value) => str(value)).filter(Boolean),
    damage: numOrNull(obj["damage"]),
    block: numOrNull(obj["block"]),
    color: str(obj["color"]),
    descriptionRaw: str(obj["description_raw"]),
    vars: asArray(obj["vars"]).map(asRecord),
    xCost: obj["is_x_cost"] === true
  };
}
function parseMonster(entry) {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    type: str(obj["type"]),
    min_hp: numOrNull(obj["min_hp"]),
    max_hp: numOrNull(obj["max_hp"]),
    moves: asArray(obj["moves"]).map((move) => str(asRecord(move)["id"] ?? asRecord(move)["name"] ?? move)).filter(Boolean)
  };
}
function parseRelic(entry) {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    description: stripMarkup(str(obj["description"])),
    rarity: str(obj["rarity"])
  };
}
function parsePotion(entry) {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    // The template's numbers filled in (potion-values.ts): the mod leaves them as {Name}.
    description: fillPotionText(id, str(obj["description"])),
    rarity: str(obj["rarity"]),
    usage: str(obj["usage"]),
    target_type: str(obj["target_type"])
  };
}
function parsePower(entry) {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    description: stripMarkup(str(obj["description"])),
    type: str(obj["type"])
  };
}
function parseEvent(entry) {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    description: stripMarkup(str(obj["description"])),
    options: asArray(obj["options"]).map((option) => {
      const item = asRecord(option);
      return {
        id: str(item["id"]),
        title: stripMarkup(str(item["title"])),
        description: stripMarkup(str(item["description"]))
      };
    })
  };
}
function buildIndex(entries, parse) {
  const map = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const parsed = parse(entry);
    if (parsed) map.set(String(parsed.id), parsed);
  }
  return map;
}
function makeKnowledge(collections, source) {
  const cards = buildIndex(collections.cards ?? [], parseCard);
  const monsters = buildIndex(collections.monsters ?? [], parseMonster);
  const relics = buildIndex(collections.relics ?? [], parseRelic);
  const potions = buildIndex(collections.potions ?? [], parsePotion);
  const powers = buildIndex(collections.powers ?? [], parsePower);
  const events = buildIndex(collections.events ?? [], parseEvent);
  return {
    card: (id) => id ? cards.get(id) ?? null : null,
    cards: () => [...cards.values()],
    monster: (id) => id ? monsters.get(id) ?? null : null,
    relic: (id) => id ? relics.get(id) ?? null : null,
    relics: () => [...relics.values()],
    potion: (id) => id ? potions.get(id) ?? null : null,
    power: (id) => id ? powers.get(id) ?? null : null,
    event: (id) => id ? events.get(id) ?? null : null,
    stats: {
      cards: cards.size,
      monsters: monsters.size,
      relics: relics.size,
      potions: potions.size,
      powers: powers.size,
      events: events.size,
      characters: asArray(collections.characters).length
    },
    source
  };
}
var init_knowledge = __esm({
  "src/knowledge/index.ts"() {
    "use strict";
    init_paths();
    init_json();
    init_potion_values();
  }
});

// src/hand/mod/schema.ts
function describe(value) {
  if (value === null) return "null";
  if (value === void 0) return "missing";
  if (Array.isArray(value)) return `array(${value.length})`;
  return typeof value;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecord2(value, path, checker) {
  if (!isRecord(value)) {
    checker.add(path, `expected an object, got ${describe(value)}`);
    return {};
  }
  return value;
}
function requireString(obj, key, path, checker) {
  const value = obj[key];
  if (typeof value === "string") return value;
  checker.add(`${path}.${key}`, `expected a string, got ${describe(value)}`);
  return "";
}
function optionalString(obj, key, path, checker) {
  const value = obj[key];
  if (value === void 0 || value === null) return null;
  if (typeof value === "string") return value;
  checker.add(`${path}.${key}`, `expected a string or null, got ${describe(value)}`);
  return null;
}
function requireNumber(obj, key, path, checker) {
  const value = obj[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  checker.add(`${path}.${key}`, `expected a number, got ${describe(value)}`);
  return 0;
}
function optionalNumber(obj, key, path, checker) {
  const value = obj[key];
  if (value === void 0 || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  checker.add(`${path}.${key}`, `expected a number or null, got ${describe(value)}`);
  return null;
}
function optionalBoolean(obj, key, path, checker) {
  const value = obj[key];
  if (value === void 0 || value === null) return null;
  if (typeof value === "boolean") return value;
  checker.add(`${path}.${key}`, `expected a boolean or null, got ${describe(value)}`);
  return null;
}
function requireArray(obj, key, path, checker) {
  const value = obj[key];
  if (Array.isArray(value)) return value;
  checker.add(`${path}.${key}`, `expected an array, got ${describe(value)}`);
  return [];
}
function requireStringArray(obj, key, path, checker) {
  const raw = requireArray(obj, key, path, checker);
  const out = [];
  raw.forEach((entry, index) => {
    if (typeof entry === "string") out.push(entry);
    else checker.add(`${path}.${key}[${index}]`, `expected a string, got ${describe(entry)}`);
  });
  return out;
}
function optionalObject(obj, key, path, checker) {
  const value = obj[key];
  if (value === void 0 || value === null) return null;
  return asRecord2(value, `${path}.${key}`, checker);
}
function parseSession(value, path, checker) {
  const obj = asRecord2(value, path, checker);
  return {
    mode: requireString(obj, "mode", path, checker),
    phase: requireString(obj, "phase", path, checker),
    control_scope: optionalString(obj, "control_scope", path, checker),
    raw: obj
  };
}
function parseRun(value, path, checker) {
  if (value === void 0 || value === null) return null;
  const obj = asRecord2(value, path, checker);
  const deck = obj["deck"];
  return {
    floor: optionalNumber(obj, "floor", path, checker),
    current_hp: optionalNumber(obj, "current_hp", path, checker),
    max_hp: optionalNumber(obj, "max_hp", path, checker),
    gold: optionalNumber(obj, "gold", path, checker),
    character_name: optionalString(obj, "character_name", path, checker),
    act_id: optionalString(obj, "act_id", path, checker),
    boss_id: optionalString(obj, "boss_id", path, checker),
    ascension: optionalNumber(obj, "ascension", path, checker),
    deck_size: Array.isArray(deck) ? deck.length : null,
    raw: obj
  };
}
function parseCombat(value, path, checker) {
  if (value === void 0 || value === null) return null;
  const obj = asRecord2(value, path, checker);
  const player = optionalObject(obj, "player", path, checker);
  const hand = obj["hand"];
  const enemies = obj["enemies"];
  const readiness = optionalObject(obj, "action_readiness", path, checker);
  const enemyList = Array.isArray(enemies) ? enemies : [];
  return {
    current_hp: player ? optionalNumber(player, "current_hp", `${path}.player`, checker) : null,
    max_hp: player ? optionalNumber(player, "max_hp", `${path}.player`, checker) : null,
    energy: player ? optionalNumber(player, "energy", `${path}.player`, checker) : null,
    block: player ? optionalNumber(player, "block", `${path}.player`, checker) : null,
    hand_count: Array.isArray(hand) ? hand.length : null,
    enemy_count: Array.isArray(enemies) ? enemyList.length : null,
    living_enemy_count: Array.isArray(enemies) ? enemyList.filter((enemy) => isRecord(enemy) && enemy["is_alive"] !== false).length : null,
    end_turn_will_kill_player: optionalBoolean(obj, "end_turn_will_kill_player", path, checker),
    can_use_combat_actions: readiness ? optionalBoolean(readiness, "can_use_combat_actions", `${path}.action_readiness`, checker) : null,
    readiness_reason: readiness ? optionalString(readiness, "reason", `${path}.action_readiness`, checker) : null,
    raw: obj
  };
}
function parseGameState(data) {
  const checker = new Checker("/state");
  const obj = asRecord2(data, "data", checker);
  const state = {
    state_version: requireNumber(obj, "state_version", "data", checker),
    screen: requireString(obj, "screen", "data", checker),
    session: parseSession(obj["session"], "data.session", checker),
    in_combat: optionalBoolean(obj, "in_combat", "data", checker) ?? false,
    turn: optionalNumber(obj, "turn", "data", checker),
    available_actions: requireStringArray(obj, "available_actions", "data", checker),
    run: parseRun(obj["run"], "data.run", checker),
    combat: parseCombat(obj["combat"], "data.combat", checker),
    raw: obj
  };
  checker.done();
  return state;
}
var PayloadShapeError, Checker;
var init_schema = __esm({
  "src/hand/mod/schema.ts"() {
    "use strict";
    PayloadShapeError = class extends Error {
      what;
      issues;
      constructor(what, issues) {
        super(`${what} did not match the expected shape:
${issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n")}`);
        this.name = "PayloadShapeError";
        this.what = what;
        this.issues = issues;
      }
    };
    Checker = class {
      constructor(what) {
        this.what = what;
      }
      what;
      issues = [];
      add(path, message) {
        this.issues.push({ path, message });
      }
      done() {
        if (this.issues.length > 0) throw new PayloadShapeError(this.what, this.issues);
      }
    };
  }
});

// src/reflex/continuation-value.ts
function continuationUtility(value, hp) {
  if (!value || !Number.isFinite(hp) || hp <= 0 || value.hp.length === 0) return 0;
  const points = value.hp;
  if (hp <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x, y] = points[i];
    if (hp <= x) {
      const [before, from] = points[i - 1];
      return from + (y - from) * (hp - before) / (x - before);
    }
  }
  return points.at(-1)[1];
}
function continuationCost(value, before, after) {
  return continuationUtility(value, before) - continuationUtility(value, after);
}
var init_continuation_value = __esm({
  "src/reflex/continuation-value.ts"() {
    "use strict";
  }
});

// src/core/util/data-version.ts
function dataVersion() {
  return version;
}
var version;
var init_data_version = __esm({
  "src/core/util/data-version.ts"() {
    "use strict";
    version = 0;
  }
});

// src/knowledge/files.ts
import { join as join2 } from "node:path";
function characterKey(raw) {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [id, names] of Object.entries(CHARACTER_NAMES)) {
    if (lower === id || text === names.zh || lower === names.en.toLowerCase()) return id;
  }
  return /^[a-z0-9_]+$/.test(lower) ? lower : null;
}
function knowledgeCharacter() {
  return activeCharacter ?? characterKey(process.env["CHARACTER"]) ?? DEFAULT_CHARACTER;
}
function setKnowledgeCharacter(id) {
  const before = knowledgeCharacter();
  activeCharacter = id === null ? null : characterKey(id) ?? id;
  const now = knowledgeCharacter();
  if (now !== before) for (const listener of listeners) listener(now);
  return now;
}
function onKnowledgeCharacterChange(listener) {
  listeners.push(listener);
}
function knowledgeDataDirs(dir = KNOWLEDGE_DIR, character2 = knowledgeCharacter()) {
  return [join2(dir, "common"), join2(dir, "characters", character2)];
}
function knowledgeSubdir(name, dir = KNOWLEDGE_DIR, character2 = knowledgeCharacter()) {
  return COMMON_FILES.has(name) ? join2(dir, "common") : join2(dir, "characters", character2);
}
function knowledgeFile(dir, name, character2 = knowledgeCharacter()) {
  return join2(knowledgeSubdir(name, dir, character2), name);
}
var DEFAULT_CHARACTER, CHARACTER_NAMES, activeCharacter, listeners, COMMON_FILES, MONSTER_RECORDS_FILE;
var init_files = __esm({
  "src/knowledge/files.ts"() {
    "use strict";
    init_paths();
    DEFAULT_CHARACTER = "ironclad";
    CHARACTER_NAMES = {
      ironclad: { zh: "\u94C1\u7532\u6218\u58EB", en: "Ironclad" },
      silent: { zh: "\u9759\u9ED8\u730E\u624B", en: "Silent" },
      regent: { zh: "\u50A8\u541B", en: "Regent" },
      necrobinder: { zh: "\u4EA1\u7075\u5951\u7EA6\u5E08", en: "Necrobinder" },
      defect: { zh: "\u6545\u969C\u673A\u5668\u4EBA", en: "Defect" }
    };
    activeCharacter = null;
    listeners = [];
    COMMON_FILES = /* @__PURE__ */ new Set(["monster-db.json", "move-model.json", "event-pages.json", "card-upgrades.json"]);
    MONSTER_RECORDS_FILE = "monster-records.json";
  }
});

// src/knowledge/monster-db.ts
import { readFileSync } from "node:fs";
function mergeMonsterRecords(common, records) {
  if (!records) return common;
  const threat2 = isObject(records["threat_by_asc"]) ? records["threat_by_asc"] : {};
  const monsters = {};
  for (const [id, entry] of Object.entries(isObject(common["monsters"]) ? common["monsters"] : {})) {
    if (!isObject(entry)) {
      monsters[id] = entry;
      continue;
    }
    const out = {};
    let placed = false;
    for (const [key, value] of Object.entries(entry)) {
      if (key === "threat_by_asc") continue;
      out[key] = value;
      if (key === "powers") {
        out["threat_by_asc"] = threat2[id] ?? {};
        placed = true;
      }
    }
    if (!placed) out["threat_by_asc"] = threat2[id] ?? {};
    monsters[id] = out;
  }
  const { meta, bosses: _bosses, encounters: _encounters, monsters: _monsters, ...rest } = common;
  return {
    ...meta !== void 0 ? { meta } : {},
    bosses: isObject(records["bosses"]) ? records["bosses"] : {},
    encounters: isObject(records["encounters"]) ? records["encounters"] : {},
    monsters,
    ...rest
  };
}
function readMonsterRecords(dir = KNOWLEDGE_DIR) {
  let text;
  try {
    text = readFileSync(knowledgeFile(dir, MONSTER_RECORDS_FILE), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const parsed = JSON.parse(text);
  if (!isObject(parsed)) throw new Error(`${knowledgeFile(dir, MONSTER_RECORDS_FILE)}: not an object`);
  return parsed;
}
function readMonsterDbJson(dir = KNOWLEDGE_DIR) {
  const parsed = JSON.parse(readFileSync(knowledgeFile(dir, "monster-db.json"), "utf8"));
  if (!isObject(parsed)) throw new Error(`${knowledgeFile(dir, "monster-db.json")}: not an object`);
  return mergeMonsterRecords(parsed, readMonsterRecords(dir));
}
function load() {
  if (cached) return cached;
  try {
    const parsed = readMonsterDbJson();
    cached = { bosses: parsed.bosses ?? {}, encounters: parsed.encounters ?? {}, monsters: parsed.monsters ?? {}, ...parsed.observed ? { observed: parsed.observed } : {} };
  } catch {
    cached = { bosses: {}, encounters: {}, monsters: {} };
  }
  return cached;
}
function monsterMoves() {
  return load().monsters;
}
function observedMechanics() {
  return load().observed;
}
function nearestAscension(byAsc, asc) {
  if (!byAsc) return null;
  const keys = Object.keys(byAsc).filter((key) => /^\d+$/.test(key));
  if (keys.length === 0) return null;
  if (keys.includes(String(asc))) return { key: String(asc), exact: true };
  const best = keys.sort((a, b) => Math.abs(Number(a) - asc) - Math.abs(Number(b) - asc) || Number(b) - Number(a))[0];
  return { key: best, exact: false };
}
function mode(counts) {
  if (!counts) return null;
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
function backAttackShare(move) {
  let behind = 0;
  let facing = 0;
  for (const counts of Object.values(move?.back_attack_by_asc ?? {})) {
    behind += counts.behind ?? 0;
    facing += counts.facing ?? 0;
  }
  return behind + facing > 0 ? behind / (behind + facing) : null;
}
function countsAt(byAsc, pooled, asc) {
  return countsAtAscension(byAsc, pooled, asc).counts;
}
function countsAtAscension(byAsc, pooled, asc) {
  const logged = Object.fromEntries(Object.entries(byAsc ?? {}).filter(([, counts]) => counts && Object.keys(counts).length > 0));
  const found = nearestAscension(logged, asc);
  return found ? { counts: logged[found.key], asc: Number(found.key), exact: found.exact } : { counts: pooled, asc: null, exact: false };
}
function regularEffect(move, counts) {
  if (!move || !counts) return true;
  const seen = countTotal(counts);
  const effects = [
    ...Object.values(move.self_powers_gained ?? {}).map(countTotal),
    ...Object.values(move.player_powers_applied ?? {}).map(countTotal),
    countTotal(move.block_gained)
  ];
  const most = Math.max(seen, ...effects);
  const uses = move.n_seen ?? 0;
  return seen >= REGULAR_EFFECT_SHARE * most && (uses <= 0 || seen >= REGULAR_EFFECT_MIN_USES * uses);
}
function selfGainAt(move, powerId, asc, where) {
  if (!regularEffect(move, move?.self_powers_gained?.[powerId])) return null;
  if (where) return moveAmountAt(where.monsters, where.monsterId, move, "self", powerId, asc)?.value ?? null;
  const value = mode(countsAt(moveAmountByAsc(move, "self", powerId), move?.self_powers_gained?.[powerId], asc));
  return value === null ? null : Number(value);
}
function moveAmountByAsc(move, kind, powerId) {
  if (!move) return void 0;
  if (kind === "block") return move.block_gained_by_asc;
  const split = kind === "self" ? move.self_powers_gained_by_asc : move.player_powers_applied_by_asc;
  return split ? Object.fromEntries(Object.entries(split).map(([key, powers]) => [key, powers?.[powerId]])) : void 0;
}
function movePooledAmount(move, kind, powerId) {
  if (kind === "block") return move?.block_gained;
  return kind === "self" ? move?.self_powers_gained?.[powerId] : move?.player_powers_applied?.[powerId];
}
function modeNumber(counts) {
  const value = mode(counts);
  return value === null || !Number.isFinite(Number(value)) ? null : Number(value);
}
function roomOf(monster) {
  return mode(monster?.rooms);
}
function amountSeries(monsters, kind, powerId) {
  let cache2 = amountSeriesCache.get(monsters);
  if (!cache2) amountSeriesCache.set(monsters, cache2 = /* @__PURE__ */ new Map());
  const key = `${kind}:${powerId}`;
  const cached7 = cache2.get(key);
  if (cached7) return cached7;
  const out = [];
  const logged = (byAsc) => Object.values(byAsc ?? {}).some((counts) => counts && Object.keys(counts).length > 0);
  for (const [monsterId, monster] of Object.entries(monsters)) {
    if (kind === "start") {
      const byAsc = monster.powers?.[powerId]?.amount_at_first_sight_by_asc;
      if (logged(byAsc)) out.push({ monsterId, byAsc });
      continue;
    }
    for (const move of Object.values(monster.moves ?? {})) {
      const byAsc = moveAmountByAsc(move, kind, powerId);
      if (logged(byAsc) && regularEffect(move, movePooledAmount(move, kind, powerId))) out.push({ monsterId, byAsc });
    }
  }
  cache2.set(key, out);
  return out;
}
function ascensionAmountChange(monsters, monsterId, kind, powerId, from, to) {
  const pairs = amountSeries(monsters, kind, powerId).flatMap(({ monsterId: id, byAsc }) => {
    const a = modeNumber(byAsc[String(from)]);
    const b = modeNumber(byAsc[String(to)]);
    return a === null || b === null ? [] : [{ id, a, b }];
  });
  if (pairs.length === 0) return null;
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const fit = (used2) => {
    const delta = sum(used2.map((pair) => pair.b - pair.a)) / used2.length;
    const atFrom = sum(used2.map((pair) => pair.a));
    return { delta, ratio: atFrom > 0 ? sum(used2.map((pair) => pair.b)) / atFrom : 1 };
  };
  const all = fit(pairs);
  const errAdd = sum(pairs.map((pair) => Math.abs(pair.a + all.delta - pair.b)));
  const errScale = sum(pairs.map((pair) => Math.abs(pair.a * all.ratio - pair.b)));
  const model2 = pairs.every((pair) => pair.a > 0 && pair.b > 0) && errScale < errAdd - 1e-9 ? "scale" : "add";
  const own = pairs.filter((pair) => pair.id === monsterId);
  const room = roomOf(monsters[monsterId]);
  const sameRoom = room === null ? [] : pairs.filter((pair) => roomOf(monsters[pair.id]) === room);
  const [used, basis] = own.length > 0 ? [own, "own"] : sameRoom.length >= ROOM_MIN_PAIRS ? [sameRoom, "room"] : [pairs, "all"];
  const measured = used === pairs ? all : fit(used);
  return { from, to, model: model2, delta: measured.delta, ratio: measured.ratio, n: used.length, basis, ...basis === "room" ? { room } : {} };
}
function loggedAmountAscensions(monsters, kind, powerId) {
  let cache2 = amountAscensionsCache.get(monsters);
  if (!cache2) amountAscensionsCache.set(monsters, cache2 = /* @__PURE__ */ new Map());
  const key = `${kind}:${powerId}`;
  const cached7 = cache2.get(key);
  if (cached7) return cached7;
  const seen = /* @__PURE__ */ new Set();
  for (const { byAsc } of amountSeries(monsters, kind, powerId)) {
    for (const [asc, counts] of Object.entries(byAsc)) if (/^\d+$/.test(asc) && modeNumber(counts) !== null) seen.add(Number(asc));
  }
  const out = [...seen].sort((a, b) => a - b);
  cache2.set(key, out);
  return out;
}
function chainedAmountChange(monsters, monsterId, kind, powerId, from, to) {
  const direct = ascensionAmountChange(monsters, monsterId, kind, powerId, from, to);
  if (direct) return { steps: [direct], reached: to };
  const up = to > from;
  const onTheWay = loggedAmountAscensions(monsters, kind, powerId).filter((asc) => up ? asc > from && asc <= to : asc < from && asc >= to).sort((a, b) => up ? a - b : b - a);
  let at2 = from;
  const steps = [];
  for (const next of onTheWay) {
    const step = ascensionAmountChange(monsters, monsterId, kind, powerId, at2, next);
    if (!step) continue;
    steps.push(step);
    at2 = next;
  }
  return at2 === from ? null : { steps, reached: at2 };
}
function applyAmountStep(value, step) {
  if (step.model === "add") return value + step.delta;
  return value > 0 ? value * step.ratio : value;
}
function amountAt(monsters, monsterId, kind, powerId, byAsc, pooled, asc) {
  const at2 = countsAtAscension(byAsc, pooled, asc);
  const logged = modeNumber(at2.counts);
  if (logged === null) return null;
  const n = countTotal(at2.counts);
  if (at2.asc === null || at2.exact) return { value: logged, estimated: false, from: at2.asc, logged, n };
  const chain = ascAmountOptions.enabled ? chainedAmountChange(monsters, monsterId, kind, powerId, at2.asc, asc) : null;
  if (!chain) return { value: logged, estimated: true, from: at2.asc, logged, n, steps: [], reached: at2.asc };
  return { value: Math.round(chain.steps.reduce(applyAmountStep, logged)), estimated: true, from: at2.asc, logged, n, steps: chain.steps, reached: chain.reached };
}
function moveAmountAt(monsters, monsterId, move, kind, powerId, asc) {
  if (!move) return null;
  return amountAt(monsters, monsterId, kind, powerId, moveAmountByAsc(move, kind, powerId), movePooledAmount(move, kind, powerId), asc);
}
function startAmountAt(monsters, monsterId, powerId, asc) {
  const power = monsters[monsterId]?.powers?.[powerId];
  if (!power) return null;
  return amountAt(monsters, monsterId, "start", powerId, power.amount_at_first_sight_by_asc, power.amount_at_first_sight, asc);
}
function signed(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}
function amountEstimateNote(at2, asc) {
  if (!at2.estimated || at2.from === null) return "";
  const basis = (step) => step.basis === "own" ? "\u672C\u602A" : step.basis === "room" ? `\u540C\u7C7B${ROOM_ZH[step.room ?? ""] ?? step.room}` : "\u5168\u4F53";
  const steps = (at2.steps ?? []).map((step) => `A${step.from}\u2192A${step.to} ${step.model === "add" ? signed(step.delta) : `\xD7${step.ratio.toFixed(2)}`}\uFF08${basis(step)} ${step.n} \u4F8B\uFF09`);
  const reached = at2.reached ?? at2.from;
  const short = reached !== asc ? `\uFF0CA${reached}\u2192A${asc} \u672A\u6D4B\u6309\u4E0D\u53D8` : "";
  return `A${asc}\u4F30: A${at2.from} ${at2.logged}${steps.length > 0 ? `\uFF0C${steps.join("\uFF0C")}` : ""}${short}`;
}
function appliedPowerIds(move, candidates) {
  const uses = (id) => countTotal(move.player_powers_applied?.[id]);
  const picks = candidates.filter((id) => uses(id) >= ALTERNATIVE_MIN_USES);
  const pooled = picks.reduce((sum, id) => sum + uses(id), 0);
  const choice = picks.length >= 2 && (move.n_seen ?? 0) > 0 && pooled <= 1.1 * move.n_seen;
  return { ids: choice ? picks : candidates.filter((id) => regularEffect(move, move.player_powers_applied?.[id])), choice };
}
function basePerHit(move, asc) {
  const base = mode(move?.damage_by_asc?.[asc]?.base_per_hit);
  return base === null ? null : Number(base);
}
function ascensionDamageRatio(monsters, monsterId, from, to) {
  const pairs = (ids) => ids.flatMap(
    (id) => Object.values(monsters[id]?.moves ?? {}).map((move) => [basePerHit(move, String(from)), basePerHit(move, String(to))]).filter((pair) => pair[0] !== null && pair[1] !== null && pair[0] > 0)
  );
  const own = pairs([monsterId]);
  const used = own.length > 0 ? own : pairs(Object.keys(monsters));
  if (used.length === 0) return null;
  const ratio = used.reduce((sum, pair) => sum + pair[1], 0) / used.reduce((sum, pair) => sum + pair[0], 0);
  return { ratio, n: used.length, own: own.length > 0 };
}
function loggedDamageAscensions(monsters) {
  const cached7 = loggedAscensionsCache.get(monsters);
  if (cached7) return cached7;
  const seen = /* @__PURE__ */ new Set();
  for (const monster of Object.values(monsters)) {
    for (const move of Object.values(monster.moves ?? {})) {
      for (const [asc, entry] of Object.entries(move.damage_by_asc ?? {})) {
        if (/^\d+$/.test(asc) && mode(entry.base_per_hit) !== null) seen.add(Number(asc));
      }
    }
  }
  const out = [...seen].sort((a, b) => a - b);
  loggedAscensionsCache.set(monsters, out);
  return out;
}
function chainedDamageRatio(monsters, monsterId, from, to) {
  const direct = ascensionDamageRatio(monsters, monsterId, from, to);
  if (direct) return { ...direct, reached: to };
  const up = to > from;
  const onTheWay = loggedDamageAscensions(monsters).filter((asc) => up ? asc > from && asc <= to : asc < from && asc >= to).sort((a, b) => up ? a - b : b - a);
  let at2 = from;
  let ratio = 1;
  let n = Infinity;
  let own = true;
  for (const next of onTheWay) {
    const step = ascensionDamageRatio(monsters, monsterId, at2, next);
    if (!step) continue;
    ratio *= step.ratio;
    n = Math.min(n, step.n);
    own = own && step.own;
    at2 = next;
  }
  return at2 === from ? null : { ratio, n, own, reached: at2 };
}
function moveDamageAt(monsters, monsterId, moveId, asc) {
  const move = monsters[monsterId]?.moves?.[moveId];
  const withBase = Object.fromEntries(Object.entries(move?.damage_by_asc ?? {}).filter(([, entry]) => mode(entry.base_per_hit) !== null));
  const found = nearestAscension(withBase, asc);
  if (!move || !found) return null;
  const logged = basePerHit(move, found.key);
  const hits = Number(mode(move.damage_by_asc[found.key].hits) ?? 1);
  const from = Number(found.key);
  const share = backAttackShare(move);
  const behind = (base2) => share === null ? {} : { base: base2, backAttackShare: share };
  const average = (base2) => share === null ? base2 : Math.round(base2 * (1 + 0.5 * share));
  if (found.exact) return { perHit: average(logged), hits, estimated: false, from, ratio: 1, ...behind(logged) };
  const measured = chainedDamageRatio(monsters, monsterId, from, asc);
  const ratio = measured?.ratio ?? 1;
  const base = Math.round(logged * ratio);
  return {
    perHit: average(base),
    hits,
    estimated: true,
    from,
    ratio,
    logged,
    ...measured ? { ratioN: measured.n, ratioOwn: measured.own } : {},
    ratioTo: measured?.reached ?? from,
    ...behind(base)
  };
}
function shownDamageAt(monsters, monsterId, moveId, asc) {
  const move = monsters[monsterId]?.moves?.[moveId];
  const withShown = Object.fromEntries(Object.entries(move?.damage_by_asc ?? {}).filter(([, entry]) => mode(entry.shown) !== null));
  const found = nearestAscension(withShown, asc);
  if (!move || !found) return null;
  const shown = /^(\d+)x(\d+)$/.exec(mode(move.damage_by_asc[found.key].shown) ?? "");
  if (!shown) return null;
  const from = Number(found.key);
  if (found.exact) return { perHit: Number(shown[1]), hits: Number(shown[2]), estimated: false, from, ratio: 1 };
  const measured = chainedDamageRatio(monsters, monsterId, from, asc);
  const ratio = measured?.ratio ?? 1;
  return {
    perHit: Math.round(Number(shown[1]) * ratio),
    hits: Number(shown[2]),
    estimated: true,
    from,
    ratio,
    logged: Number(shown[1]),
    ...measured ? { ratioN: measured.n, ratioOwn: measured.own } : {},
    ratioTo: measured?.reached ?? from
  };
}
function monsterDamageByTurn(monsterId, asc, turns, monsters = load().monsters) {
  const attack = monsterAttackByTurn(monsterId, asc, turns, monsters);
  return attack ? { perTurn: attack.perTurn, estimated: attack.estimated } : null;
}
function monsterAttackByTurn(monsterId, asc, turns, monsters = load().monsters) {
  const moves = monsters[monsterId]?.moves;
  if (!moves || turns <= 0) return null;
  const firsts = Object.entries(moves).map(([id, move]) => [id, move.turns_seen?.["1"] ?? 0]).filter(([, n]) => n > 0);
  const total = firsts.reduce((sum, [, n]) => sum + n, 0);
  if (total <= 0) return null;
  let dist2 = new Map(firsts.map(([id, n]) => [id, n / total]));
  const ongoing = (id) => Object.keys(moves[id]?.next ?? {}).length > 0;
  const damage = new Map(
    Object.keys(moves).map((id) => {
      const base = moveDamageAt(monsters, monsterId, id, asc);
      const shown = base ? null : shownDamageAt(monsters, monsterId, id, asc);
      return [id, base ?? (shown ? { ...shown, shown: true } : null)];
    })
  );
  const gains = new Map(
    Object.keys(moves).map((id) => {
      const move = moves[id];
      const gain = regularEffect(move, move?.self_powers_gained?.["STRENGTH_POWER"]) ? moveAmountAt(monsters, monsterId, move, "self", "STRENGTH_POWER", asc) : null;
      return [id, gain];
    })
  );
  const strengthOf = (id) => gains.get(id)?.value ?? 0;
  let strength = 0;
  let estimated = false;
  const perTurn = [];
  const hits = [];
  for (let t = 1; t <= turns; t += 1) {
    if (t > 1) {
      const next = /* @__PURE__ */ new Map();
      for (const [id, p] of dist2) {
        const successors = Object.entries(moves[id]?.next ?? {}).filter(([to]) => ongoing(to));
        const sum = successors.reduce((acc, [, n]) => acc + n, 0);
        if (sum <= 0) next.set(id, (next.get(id) ?? 0) + p);
        else for (const [to, n] of successors) next.set(to, (next.get(to) ?? 0) + p * n / sum);
      }
      dist2 = next;
    }
    let expected = 0;
    let expectedHits = 0;
    for (const [id, p] of dist2) {
      const hit = damage.get(id);
      if (!hit) continue;
      if (hit.estimated) estimated = true;
      expected += p * (hit.perHit + (hit.shown ? 0 : strength)) * hit.hits;
      expectedHits += p * hit.hits;
    }
    perTurn.push(expected);
    hits.push(expectedHits);
    for (const [id, p] of dist2) {
      strength += p * strengthOf(id);
      if (p > 0 && gains.get(id)?.estimated) estimated = true;
    }
  }
  return { perTurn, hits, estimated };
}
function bossHitsByTurn(bossId, asc, turns, only) {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const byAsc = load().bosses[id];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const hits = Array.from({ length: turns }, () => 0);
  let used = 0;
  for (const [part, range] of Object.entries(byAsc[found.key].parts ?? {})) {
    if (only && !only.includes(part)) continue;
    const own = monsterAttackByTurn(part, asc, turns);
    if (!own) continue;
    used += 1;
    const count2 = range.count_per_fight ?? 1;
    own.hits.forEach((value, t) => hits[t] += value * count2);
  }
  return used > 0 ? hits : null;
}
function bossDamageByTurn(bossId, asc, turns) {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const byAsc = load().bosses[id];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const parts = Object.entries(byAsc[found.key].parts ?? {});
  const perTurn = Array.from({ length: turns }, () => 0);
  let estimated = false;
  const used = [];
  for (const [part, range] of parts) {
    const own = monsterDamageByTurn(part, asc, turns);
    if (!own) continue;
    used.push(part);
    if (own.estimated) estimated = true;
    const count2 = range.count_per_fight ?? 1;
    own.perTurn.forEach((value, t) => perTurn[t] += value * count2);
  }
  return used.length > 0 ? { perTurn, estimated, parts: used } : null;
}
function phaseCountsWithoutRetries(id, counts) {
  if (id !== "TEST_SUBJECT") return counts;
  const out = {};
  for (const [sequence, n] of Object.entries(counts)) {
    const suffix = /\s*\(.*\)\s*$/.exec(sequence)?.[0] ?? "";
    const values = sequence.replace(/\s*\(.*\)\s*$/, "").split(">").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0);
    let attempt = [];
    let longest = [];
    for (const hp of values) {
      if (hp === values[0] && attempt.length > 0) {
        if (attempt.length > longest.length) longest = attempt;
        attempt = [];
      }
      attempt.push(hp);
    }
    if (attempt.length > longest.length) longest = attempt;
    if (longest.length === 0) continue;
    const key = longest.join(" > ") + suffix;
    out[key] = (out[key] ?? 0) + n;
  }
  return out;
}
function bossHpAt(bossId, asc, only) {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const byAsc = load().bosses[id];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const entry = byAsc[found.key];
  const parts = Object.entries(entry.parts ?? {}).filter(([part]) => !only || only.includes(part));
  if (parts.length === 0) return null;
  const hp = parts.reduce((sum, [, range]) => sum + (range.median ?? 0) * (range.count_per_fight ?? 1), 0);
  const phases = Object.keys(phaseCountsWithoutRetries(id, entry.phases ?? {})).map((sequence) => sequence.replace(/\s*\(.*\)\s*$/, "").split(">").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0)).sort((a, b) => b.length - a.length)[0] ?? [];
  const n = Math.min(...parts.map(([, range]) => range.n ?? 0));
  return { hp: Math.round(hp), phases, asc: Number(found.key), exact: found.exact, n };
}
function fillDbNumbers(text, asc, db = load().monsters) {
  const amountText = (at2) => at2 ? `${at2.estimated ? "\u2248" : ""}${at2.value}` : null;
  const fill = (kind, id, a, b) => {
    const monster = db[id];
    const move = a ? monster?.moves?.[a] : void 0;
    switch (kind) {
      case "HP": {
        const found = nearestAscension(monster?.hp_by_asc, asc);
        const median = found ? monster.hp_by_asc[found.key].median : void 0;
        return median === void 0 ? null : String(Math.round(median));
      }
      case "DMG":
      case "BEHIND": {
        if (!a) return null;
        const base = moveDamageAt(db, id, a, asc);
        const hit = base ?? shownDamageAt(db, id, a, asc);
        if (!hit) return null;
        const perHit = base ? base.base ?? base.perHit : hit.perHit;
        const mark = hit.estimated ? "\u2248" : "";
        if (kind === "BEHIND") return base?.backAttackShare !== void 0 ? `${mark}${Math.floor(perHit * 1.5)}` : null;
        return `${mark}${perHit}${hit.hits > 1 ? `\xD7${hit.hits}` : ""}`;
      }
      case "GAIN": {
        const gain = a && b && regularEffect(move, move?.self_powers_gained?.[b]) ? moveAmountAt(db, id, move, "self", b, asc) : null;
        return amountText(gain);
      }
      case "POWER":
        return a ? amountText(startAmountAt(db, id, a, asc)) : null;
      case "BLOCK":
        return amountText(moveAmountAt(db, id, move, "block", "BLOCK", asc));
      case "APPLIES":
        return b ? amountText(moveAmountAt(db, id, move, "applied", b, asc)) : null;
      default:
        return null;
    }
  };
  return text.replace(/\{(HP|DMG|BEHIND|GAIN|POWER|BLOCK|APPLIES):([A-Z0-9_]+)(?::([A-Z0-9_]+))?(?::([A-Z0-9_]+))?\}/g, (_, kind, id, a, b) => fill(kind, id, a, b) ?? "?");
}
function powerAmountByAscText(monsterId, powerId, monsters = load().monsters) {
  const byAsc = monsters[monsterId]?.powers?.[powerId]?.amount_at_first_sight_by_asc;
  const logged = Object.keys(byAsc ?? {}).filter((key) => /^\d+$/.test(key)).map(Number).sort((a, b) => a - b).map((asc) => ({ asc, amount: mode(byAsc[String(asc)]) })).filter((row) => row.amount !== null);
  if (logged.length === 0) return null;
  const runs = [];
  for (const row of logged) {
    const last = runs[runs.length - 1];
    if (last && last.amount === row.amount) last.to = row.asc;
    else runs.push({ from: row.asc, to: row.asc, amount: row.amount });
  }
  return runs.map((run) => `${run.from === run.to ? `A${run.from}` : `A${run.from}\u2013A${run.to}`} ${run.amount}`).join("\u3001");
}
function powerScheduleAt(monsterId, powerId, asc, monsters = load().monsters) {
  const monster = monsters[monsterId];
  const power = monster?.powers?.[powerId];
  const found = nearestAscension(power?.amount_at_first_sight_by_asc, asc);
  if (!power || !found) return null;
  const firstAt = startAmountAt(monsters, monsterId, powerId, asc);
  const firstTurn = Number(mode(power.turn_at_first_sight_by_asc?.[found.key]) ?? NaN);
  if (!firstAt || !Number.isFinite(firstTurn)) return null;
  const gains = {};
  let estimated = firstAt.estimated;
  for (const move of Object.values(monster.moves ?? {})) {
    const seen = Object.keys(move.turns_seen ?? {}).filter((key) => /^\d+$/.test(key)).map(Number);
    if (seen.length > 0 && seen.every((turn) => turn < firstTurn)) continue;
    const gain = moveAmountAt(monsters, monsterId, move, "self", powerId, asc);
    if (!gain) continue;
    if (gain.estimated) estimated = true;
    gains[String(gain.value)] = (gains[String(gain.value)] ?? 0) + gain.n;
  }
  const perTurn = Number(mode(gains) ?? NaN);
  if (!Number.isFinite(perTurn)) return null;
  return {
    first: firstAt.value,
    firstTurn,
    perTurn,
    asc: Number(found.key),
    exact: found.exact,
    n: firstAt.n,
    ...estimated ? { estimated: true, note: amountEstimateNote(firstAt, asc) } : {}
  };
}
function moveBaseDamages(monsterId, moveId, asc) {
  const byAsc = load().monsters[monsterId]?.moves?.[moveId]?.damage_by_asc;
  const withBase = Object.fromEntries(Object.entries(byAsc ?? {}).filter(([, entry]) => Object.keys(entry.base_per_hit ?? {}).length > 0));
  const found = nearestAscension(withBase, asc);
  if (!found) return [];
  return Object.keys(withBase[found.key].base_per_hit).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
}
function summonsAt(enemyId, move, asc, monsters = load().monsters) {
  if (enemyId !== "THE_OBSCURA" || move !== "ILLUSION_MOVE") return null;
  const monster = monsters["PARAFRIGHT"];
  const found = nearestAscension(monster?.hp_by_asc, asc);
  const hp = found ? monster.hp_by_asc[found.key].median : void 0;
  if (hp === void 0 || hp <= 0) return null;
  return [{ id: "PARAFRIGHT", name: monster?.name?.zh || "PARAFRIGHT", hp: Math.round(hp), count: 1, move: "SLAM_MOVE", illusion: true, minion: true }];
}
function spawnsAt(enemyId, asc, monsters = load().monsters) {
  const spawns = ON_DEATH_SPAWNS[enemyId];
  if (!spawns) return null;
  return spawns.map(({ id, count: count2 }) => {
    const monster = monsters[id];
    const found = nearestAscension(monster?.hp_by_asc, asc);
    const median = found ? monster.hp_by_asc[found.key].median : void 0;
    const moves = Object.keys(monster?.moves ?? {});
    return { id, name: monster?.name?.zh || id, hp: Math.round(median ?? SPAWN_FALLBACK_HP), count: count2, move: moves.includes("SPAWNED_MOVE") ? "SPAWNED_MOVE" : null };
  });
}
function moveTurns(id, moveId) {
  const seen = load().monsters[id]?.moves?.[moveId]?.turns_seen ?? {};
  return Object.keys(seen).filter((key) => /^\d+$/.test(key)).map(Number).sort((a, b) => a - b);
}
function danger(encounter, asc) {
  const deaths = Object.values(encounter.by_asc ?? {}).reduce((sum, entry) => sum + (entry.deaths ?? 0), 0);
  const found = nearestAscension(encounter.by_asc, asc);
  const p75 = found ? encounter.by_asc[found.key].hp_loss_won?.p75 ?? 0 : 0;
  return { deaths, p75 };
}
function actThreatIds(act, asc) {
  return [...new Set(actThreatKeys(act, asc).flatMap((key) => key.split("+")))];
}
function actThreatKeys(act, asc) {
  const encounters = Object.entries(load().encounters).filter(([, encounter]) => (encounter.acts?.[String(act)] ?? 0) > 0);
  const elites = encounters.filter(([, encounter]) => mode(encounter.rooms) === "elite");
  const hallways = encounters.filter(([, encounter]) => mode(encounter.rooms) === "hallway").map(([key, encounter]) => ({ key, ...danger(encounter, asc) })).filter((entry) => entry.deaths > 0 || entry.p75 >= DANGEROUS_HALLWAY_P75).sort((a, b) => b.deaths - a.deaths || b.p75 - a.p75).slice(0, MAX_HALLWAY_THREATS);
  return [...elites.map(([key]) => key), ...hallways.map((entry) => entry.key)];
}
function byDistance(keys, asc) {
  return keys.filter((key) => /^\d+$/.test(key)).sort((a, b) => Math.abs(Number(a) - asc) - Math.abs(Number(b) - asc) || Number(b) - Number(a));
}
function bossHpLoss(bossId, asc) {
  if (!bossId) return null;
  const byAsc = load().bosses[bossId.toUpperCase().replace(/_BOSS$/, "")];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const order = byDistance(Object.keys(byAsc), asc);
  const wonAt = order.find((key) => {
    const loss2 = byAsc[key].hp_loss_won;
    return !!loss2?.n && typeof loss2.median === "number";
  });
  const turnAt = order.find((key) => {
    const turn2 = byAsc[key].hp_loss_per_turn;
    return !!turn2?.n && typeof turn2.median === "number";
  });
  const loss = wonAt ? byAsc[wonAt].hp_loss_won : null;
  const turn = turnAt ? byAsc[turnAt].hp_loss_per_turn : null;
  const record = byAsc[found.key];
  return {
    won: loss && wonAt ? { median: loss.median, p75: typeof loss.p75 === "number" ? loss.p75 : loss.median, n: loss.n, asc: Number(wonAt) } : null,
    fights: record.fights ?? 0,
    winRate: record.win_rate ?? null,
    recordAsc: Number(found.key),
    perTurn: turn && turnAt ? { median: turn.median, n: turn.n, asc: Number(turnAt) } : null
  };
}
function bossPartIds(bossId) {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const logged = Object.values(load().bosses[id] ?? {}).flatMap((threat2) => Object.keys(threat2.parts ?? {}));
  return [.../* @__PURE__ */ new Set([id, ...KNOWN_BOSS_PARTS[id] ?? [], ...logged])];
}
function bossOnBoard(bossId, enemies) {
  if (!enemies || enemies.length === 0) return false;
  const parts = bossPartIds(bossId);
  return enemies.some((enemy) => {
    const bare = enemy.toUpperCase().replace(/_BOSS$/, "");
    return parts.some((part) => bare === part || bare.startsWith(`${part}_`));
  });
}
var isObject, cached, REGULAR_EFFECT_SHARE, REGULAR_EFFECT_MIN_USES, countTotal, ascAmountOptions, ROOM_MIN_PAIRS, amountSeriesCache, amountAscensionsCache, ROOM_ZH, ALTERNATIVE_MIN_USES, loggedAscensionsCache, ON_DEATH_SPAWNS, SPAWN_FALLBACK_HP, DANGEROUS_HALLWAY_P75, MAX_HALLWAY_THREATS, KNOWN_BOSS_PARTS;
var init_monster_db = __esm({
  "src/knowledge/monster-db.ts"() {
    "use strict";
    init_data_version();
    init_files();
    isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
    cached = null;
    REGULAR_EFFECT_SHARE = 0.5;
    REGULAR_EFFECT_MIN_USES = 0.2;
    countTotal = (counts) => Object.values(counts ?? {}).reduce((sum, n) => sum + n, 0);
    ascAmountOptions = { enabled: process.env["ASC_AMOUNTS"] !== "off" };
    ROOM_MIN_PAIRS = 3;
    amountSeriesCache = /* @__PURE__ */ new WeakMap();
    amountAscensionsCache = /* @__PURE__ */ new WeakMap();
    ROOM_ZH = { boss: "boss", elite: "\u7CBE\u82F1", hallway: "\u8D70\u5ECA", unknown_room: "\u95EE\u53F7\u623F" };
    ALTERNATIVE_MIN_USES = 3;
    loggedAscensionsCache = /* @__PURE__ */ new WeakMap();
    ON_DEATH_SPAWNS = {
      PHROG_PARASITE: [{ id: "WRIGGLER", count: 4 }],
      GREMLIN_MERC: [
        { id: "FAT_GREMLIN", count: 1 },
        { id: "SNEAKY_GREMLIN", count: 1 }
      ]
    };
    SPAWN_FALLBACK_HP = 15;
    DANGEROUS_HALLWAY_P75 = 20;
    MAX_HALLWAY_THREATS = 8;
    KNOWN_BOSS_PARTS = {
      KAISER_CRAB: ["CRUSHER", "ROCKET"],
      THE_KIN: ["KIN_PRIEST", "KIN_FOLLOWER"],
      QUEEN: ["QUEEN", "TORCH_HEAD_AMALGAM"]
    };
  }
});

// src/knowledge/move-model.ts
import { readFileSync as readFileSync2 } from "node:fs";
function load2() {
  if (model) return model;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "move-model.json");
    model = JSON.parse(readFileSync2(path, "utf8"));
  } catch {
    model = {};
  }
  return model;
}
function powerOf(holder, id) {
  return asArray(holder["powers"]).map(asRecord).filter((power) => str(power["power_id"]) === id).reduce((sum, power) => sum + (numOrNull(power["amount"]) ?? 1), 0);
}
function boardDamageContext(enemy, player, asc) {
  const temporary = TEMP_STRENGTH_LOSS_POWERS.reduce((sum, id) => sum + Math.max(0, powerOf(enemy, id)), 0);
  return { asc, strength: powerOf(enemy, "STRENGTH_POWER") + temporary, vulnerable: powerOf(player, "VULNERABLE_POWER") };
}
function moveDamage(enemyId, move, ctx, ahead = 1) {
  const pooled = load2()[enemyId]?.damage[move] ?? null;
  if (!ctx) return pooled;
  const db = monsterMoves();
  const base = moveDamageAt(db, enemyId, move, ctx.asc);
  if (base) {
    const vulnerable = (ctx.vulnerable ?? 0) > ahead ? 1.5 : 1;
    return Math.floor(Math.max(0, base.perHit + (ctx.strength ?? 0)) * vulnerable) * base.hits;
  }
  const shown = shownDamageAt(db, enemyId, move, ctx.asc);
  if (shown) return shown.perHit * shown.hits;
  return pooled;
}
function expectedNextDamage(enemyId, currentMove, ctx, exclude) {
  const entry = load2()[enemyId];
  if (!entry) return null;
  const successors = entry.next[currentMove];
  if (!successors) return null;
  let total = 0;
  let count2 = 0;
  for (const [move, n] of keptSuccessors(Object.entries(successors), exclude)) {
    const damage = moveDamage(enemyId, move, ctx, 1);
    if (damage === null) continue;
    total += damage * n;
    count2 += n;
  }
  return count2 > 0 ? total / count2 : null;
}
function keptSuccessors(successors, exclude) {
  if (!exclude || exclude.size === 0) return successors;
  const kept = successors.filter(([move]) => !exclude.has(move));
  return kept.length > 0 ? kept : successors;
}
function damageForecast(enemyId, currentMove, turns, sleepTurns = 0, ctx, exclude) {
  const entry = load2()[enemyId];
  if (!entry || turns <= 0) return null;
  const step = (dist3, skipSelf = false) => {
    const out2 = /* @__PURE__ */ new Map();
    for (const [move, p] of dist3) {
      const successors = keptSuccessors(Object.entries(entry.next[move] ?? {}).filter(([next]) => !skipSelf || next !== move), exclude);
      const total = successors.reduce((sum, [, n]) => sum + n, 0);
      if (total <= 0) {
        out2.set(move, (out2.get(move) ?? 0) + p);
        continue;
      }
      for (const [next, n] of successors) out2.set(next, (out2.get(next) ?? 0) + p * n / total);
    }
    return out2;
  };
  const expected = (dist3, ahead) => [...dist3].reduce((sum, [move, p]) => sum + p * (moveDamage(enemyId, move, ctx, ahead) ?? 0), 0);
  const out = [];
  let dist2 = /* @__PURE__ */ new Map([[currentMove, 1]]);
  for (let k = 1; k <= turns; k += 1) {
    if (k < sleepTurns) {
      out.push(0);
      continue;
    }
    dist2 = step(dist2, sleepTurns > 0 && k === sleepTurns);
    out.push(expected(dist2, k));
  }
  return out;
}
function usualMove(enemyId) {
  const entry = load2()[enemyId];
  if (!entry) return null;
  const counts = /* @__PURE__ */ new Map();
  for (const successors of Object.values(entry.next)) for (const [move, n] of Object.entries(successors)) counts.set(move, (counts.get(move) ?? 0) + n);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
function revivingForecast(enemyId, turns, ctx) {
  const entry = load2()[enemyId];
  const move = usualMove(enemyId);
  if (!entry || !move || turns <= 0) return null;
  const fresh = ctx ? { ...ctx, strength: 0 } : void 0;
  return [moveDamage(enemyId, move, fresh, 1) ?? 0, ...damageForecast(enemyId, move, turns - 1, 0, fresh) ?? []];
}
var model, TEMP_STRENGTH_LOSS_POWERS;
var init_move_model = __esm({
  "src/knowledge/move-model.ts"() {
    "use strict";
    init_json();
    init_monster_db();
    init_data_version();
    init_files();
    model = null;
    TEMP_STRENGTH_LOSS_POWERS = ["MANGLE_POWER", "SHACKLING_POTION_POWER", "DARK_SHACKLES_POWER", "PIERCING_WAIL_POWER"];
  }
});

// src/sl/draws.ts
function cardKey(cardId, upgraded) {
  return `${cardId}${upgraded ? "+" : ""}`;
}
function baseKey(key) {
  return key.endsWith("+") ? key.slice(0, -1) : key;
}
function knownTopIndices(keys, pile) {
  const used = /* @__PURE__ */ new Set();
  const out = [];
  for (const key of keys) {
    let at2 = pile.findIndex((card, i) => !used.has(i) && cardKey(card.cardId, card.upgraded) === key);
    if (at2 < 0) at2 = pile.findIndex((card, i) => !used.has(i) && card.cardId === baseKey(key));
    if (at2 < 0) return null;
    used.add(at2);
    out.push(at2);
  }
  return out;
}
function withAddedAtRandom(order, added, random) {
  const out = order.slice();
  for (const card of added) out.splice(Math.floor(random() * (out.length + 1)), 0, card);
  return out;
}
var init_draws = __esm({
  "src/sl/draws.ts"() {
    "use strict";
    init_json();
  }
});

// src/knowledge/card-upgrades.ts
import { readFileSync as readFileSync3 } from "node:fs";
function load3() {
  if (cached2) return cached2;
  try {
    cached2 = JSON.parse(readFileSync3(knowledgeFile(KNOWLEDGE_DIR, "card-upgrades.json"), "utf8"));
  } catch {
    cached2 = {};
  }
  return cached2;
}
function cardUpgrade(cardId) {
  return load3()[cardId] ?? null;
}
var cached2;
var init_card_upgrades = __esm({
  "src/knowledge/card-upgrades.ts"() {
    "use strict";
    init_data_version();
    init_files();
    cached2 = null;
  }
});

// src/reflex/silent-apotheosis.ts
function observedApotheosisUpgrade(card) {
  if (bool(card["upgraded"]) || num(card["energy_cost"]) !== 1 || bool(card["costs_x"])) return null;
  const pair = PAIRS[str(card["card_id"])];
  if (!pair || /重放|replay/i.test(str(card["resolved_rules_text"])) || card["enchantment"] != null) return null;
  const values = asArray(card["dynamic_values"]).map(asRecord);
  if (values.length !== Object.keys(pair.vars).length) return null;
  for (const [name, [plain]] of Object.entries(pair.vars)) {
    const value = values.find((entry) => entry["name"] === name);
    if (!value || value["base_value"] !== plain || value["enchanted_value"] !== plain || ![plain, ...name === "Damage" ? [plain + 1] : []].includes(num(value["current_value"], NaN))) return null;
  }
  return {
    ...card,
    upgraded: true,
    energy_cost: pair.cost?.[1] ?? card["energy_cost"],
    dynamic_values: values.map((value) => {
      const [plain, upgraded] = pair.vars[str(value["name"])];
      return {
        ...value,
        base_value: upgraded,
        enchanted_value: upgraded,
        current_value: num(value["current_value"]) + upgraded - plain
      };
    })
  };
}
var PAIRS;
var init_silent_apotheosis = __esm({
  "src/reflex/silent-apotheosis.ts"() {
    "use strict";
    init_json();
    PAIRS = {
      DEFEND_SILENT: { vars: { Block: [5, 8] } },
      STRIKE_SILENT: { vars: { Damage: [6, 9] } },
      DAGGER_SPRAY: { vars: { Damage: [4, 6] } },
      TOOLS_OF_THE_TRADE: { cost: [1, 0], vars: {} },
      SUCKER_PUNCH: { vars: { Damage: [8, 10], WeakPower: [1, 2] } },
      FASTEN: { vars: { ExtraBlock: [4, 6] } },
      PIERCING_WAIL: { vars: { StrengthLoss: [6, 8] } },
      // F43 T2's upgraded draw, paired with this run's plain two-point F45 copies.
      NOXIOUS_FUMES: { vars: { PoisonPerTurn: [2, 3] } },
      // F43 T4's later draw establishes two extra triggers; F45's plain copy establishes one.
      ACCELERANT: { vars: { Accelerant: [1, 2] } }
    };
  }
});

// src/reflex/card-model.ts
function etherealText(keywords, rendered) {
  return (keywords ?? []).some((keyword) => /ethereal/i.test(keyword)) || /(^|\s)虚无(\s|。|$)|\bEthereal\b/.test(rendered);
}
function handConditionOf(template, rendered = "") {
  const text = `${template} ${rendered}`;
  if (/如果你的手牌为空|if your hand is empty/i.test(text)) return "empty";
  if (/如果你的手牌中没有攻击牌|if you have no attacks? in your hand|if your hand (?:has|contains) no attacks?/i.test(text)) return "noAttack";
  return null;
}
function dynBase(card, name, enchanted = false) {
  for (const entry of asArray(card["dynamic_values"])) {
    const value = asRecord(entry);
    if (str(value["name"]) === name) return (enchanted ? numOrNull(value["enchanted_value"]) : null) ?? numOrNull(value["base_value"]);
  }
  return null;
}
function dyn(card, name) {
  for (const entry of asArray(card["dynamic_values"])) {
    const value = asRecord(entry);
    if (str(value["name"]) === name) {
      const current2 = numOrNull(value["current_value"]);
      return current2 ?? numOrNull(value["base_value"]);
    }
  }
  return null;
}
function ourAttackScaled(amount, weak, shrunk) {
  const weakened = weak ? amount * 0.75 : amount;
  return shrunk ? weakened * 7 / 10 : weakened;
}
function stripVigor(hand, vigor, weak, shrunk = false) {
  if (vigor <= 0) return;
  const shown = Math.floor(ourAttackScaled(vigor, weak, shrunk));
  for (const card of hand) {
    if (card.type === "Attack" && card.damage !== null) card.damage = Math.max(0, card.damage - shown);
  }
}
function stripPhantomBlades(hand, amount, strength, weak, shrunk = false) {
  if (amount !== 9) return false;
  let armed = false;
  for (const card of hand) {
    if (card.cardId !== "SHIV" || card.damage === null || card.damageBase === void 0) continue;
    const base = card.damageBase + strength;
    if (card.damage !== Math.floor(ourAttackScaled(base + amount, weak, shrunk))) continue;
    card.damage = Math.floor(ourAttackScaled(base, weak, shrunk));
    armed = true;
  }
  return armed;
}
function blockedByHook(card) {
  return str(card["unplayable_preventer_id"]) !== "" || /BlockedByHook/.test(str(card["unplayable_reason_raw"]));
}
function isPlayFirst(cardId, text = "") {
  return playFirstOptions.enabled && (PLAY_FIRST_CARDS.has(cardId) || PLAY_FIRST_TEXT.test(text));
}
function afterPlayFirst(card) {
  if (!playFirstOptions.enabled || !PLAY_FIRST_CARDS.has(str(card["unplayable_preventer_id"]))) return false;
  const reasons = str(card["unplayable_reason_raw"]).split(",").map((reason) => reason.trim()).filter((reason) => reason !== "");
  return reasons.every((reason) => reason === "BlockedByHook" || reason === "EnergyCostTooHigh");
}
function stripPenNib(hand, ready) {
  if (!ready) return;
  for (const card of hand) {
    if (card.type === "Attack" && card.damage !== null) card.damage = Math.floor(card.damage / 2);
  }
}
function conditionalPlaceholder(inner) {
  if (/^[A-Za-z_]*:(?:choose\(|show:|cond:|plural:)/.test(inner)) return true;
  let braces = 0;
  let parens = 0;
  for (const ch of inner) {
    if (ch === "{") braces += 1;
    else if (ch === "}") braces -= 1;
    else if (ch === "(") parens += 1;
    else if (ch === ")") parens -= 1;
    else if (ch === "|" && braces === 0 && parens === 0) return true;
  }
  return false;
}
function unconditionalText(template) {
  if (!template.includes("{")) return template;
  const known = unconditionalTexts.get(template);
  if (known !== void 0) return known;
  const text = withoutConditionals(template);
  if (unconditionalTexts.size < 4096) unconditionalTexts.set(template, text);
  return text;
}
function withoutConditionals(template) {
  let out = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] !== "{") {
      out += template[i];
      i += 1;
      continue;
    }
    let depth = 0;
    let end = i;
    for (; end < template.length; end += 1) {
      if (template[end] === "{") depth += 1;
      else if (template[end] === "}" && --depth === 0) break;
    }
    if (end >= template.length) return out + template.slice(i);
    if (!conditionalPlaceholder(template.slice(i + 1, end))) out += template.slice(i, end + 1);
    i = end + 1;
  }
  return out;
}
function targetMode(targetType, template, requiresTarget) {
  if (targetType === "AllEnemies") return "all";
  if (targetType === "RandomEnemy") return "random";
  if (requiresTarget || targetType === "AnyEnemy") return "single";
  const text = unconditionalText(template);
  if (text.includes("\u6240\u6709\u654C\u4EBA") || /all enemies/i.test(text)) return "all";
  if (text.includes("\u968F\u673A\u5BF9\u654C\u4EBA") || /random enem/i.test(text)) return "random";
  if (targetType === "Self" || targetType === "AnyAlly") return "self";
  return "none";
}
function heldPenaltyOf(rendered) {
  const held = /回合结束时[^。]*手牌中[^。]*?(?:受到|失去)(\d+)点(?:伤害|生命)/.exec(rendered) ?? /at the end of your turn[^.]*in your hand[^.]*?(?:take|lose) (\d+)/i.exec(rendered);
  const heldPenalty = held ? Number(held[1]) : 0;
  const heldHpLoss = held && /失去\d+点生命|lose \d+ hp/i.test(held[0]) ? heldPenalty : 0;
  return { heldPenalty, heldHpLoss };
}
function debuffWeakFirst(text) {
  const find = (patterns) => {
    const positions = patterns.map((pattern) => text.search(pattern)).filter((position) => position >= 0);
    return positions.length > 0 ? Math.min(...positions) : -1;
  };
  const weakAt = find([/虚弱/, /WeakPower/, /\bweak\b/i]);
  const vulnerableAt = find([/易伤/, /VulnerablePower/, /\bvulnerable\b/i]);
  return weakAt >= 0 && (vulnerableAt < 0 || weakAt < vulnerableAt);
}
function sentences(text) {
  return text.replace(/\[[^\]]*\]/g, "").split(/[。.\n]/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}
function playHpLossOf(rendered) {
  if (heldPenaltyOf(rendered).heldPenalty > 0) return 0;
  let total = 0;
  for (const sentence of sentences(rendered)) {
    const match = /^(?:你)?失去(\d+)点生命$/.exec(sentence) ?? /^lose (\d+) hp$/i.exec(sentence);
    if (match) total += Number(match[1]);
  }
  return total;
}
function playSelfDamageOf(rendered) {
  if (heldPenaltyOf(rendered).heldPenalty > 0) return 0;
  let total = 0;
  for (const sentence of sentences(rendered)) {
    const match = /^(?:你)?受到(\d+)点伤害$/.exec(sentence) ?? /^take (\d+) damage$/i.exec(sentence);
    if (match) total += Number(match[1]);
  }
  return total;
}
function energyOnExhaustOnly(template, rendered) {
  const exhaustClause = /被消耗时|when (?:this card is )?exhausted/i;
  const withVar = sentences(template.replace(/\{Energy[^}]*\}/g, "ENERGYVAR")).filter((sentence) => sentence.includes("ENERGYVAR"));
  if (withVar.length > 0) return withVar.every((sentence) => exhaustClause.test(sentence));
  const energySentences = sentences(rendered).filter((sentence) => /能量|energy/i.test(sentence));
  return energySentences.length > 0 && energySentences.every((sentence) => exhaustClause.test(sentence));
}
function nextTurnOnly(template, varName) {
  const nextTurn = /下个回合|下回合|next turn/i;
  const withVar = sentences(template.replace(new RegExp(`\\{${varName}[^}]*\\}`, "g"), "CARDVAR")).filter((sentence) => sentence.includes("CARDVAR"));
  return withVar.length > 0 && withVar.every((sentence) => nextTurn.test(sentence));
}
function turnStartOnly(template, varName) {
  const turnStart = /回合开始时|start of (?:your|each) turn/i;
  const withVar = sentences(template.replace(new RegExp(`\\{${varName}[^}]*\\}`, "g"), "CARDVAR")).filter((sentence) => sentence.includes("CARDVAR"));
  return withVar.length > 0 && withVar.every((sentence) => turnStart.test(sentence));
}
function replayOf(rendered) {
  const match = /(?:^|[。\s])重放\s*(\d+)\s*(?:。|$)/.exec(rendered) ?? /(?:^|\.\s+)replay\s+(\d+)\s*(?:\.|$)/i.exec(rendered);
  return match ? Number(match[1]) : 0;
}
function upgradeDelta(entry, knowledge) {
  const card = asRecord(entry);
  if (bool(card["upgraded"])) return null;
  const upgrade = cardUpgrade(str(card["card_id"]));
  if (!upgrade) return null;
  const moved = (value, delta2) => typeof value === "number" ? value + delta2 : value;
  const upgraded = {
    ...card,
    upgraded: true,
    energy_cost: upgrade.cost && !bool(card["costs_x"]) ? moved(card["energy_cost"], upgrade.cost[1] - upgrade.cost[0]) : card["energy_cost"],
    dynamic_values: asArray(card["dynamic_values"]).map((raw) => {
      const value = asRecord(raw);
      const change = upgrade.vars[str(value["name"])];
      if (!change) return value;
      const delta2 = change[1] - change[0];
      return { ...value, base_value: moved(value["base_value"], delta2), current_value: moved(value["current_value"], delta2), enchanted_value: moved(value["enchanted_value"], delta2) };
    })
  };
  const before = modelHandCard(card, 0, knowledge);
  const after = modelHandCard(upgraded, 0, knowledge);
  const delta = {};
  for (const field of UPGRADE_FIELDS) {
    const change = (after[field] ?? 0) - (before[field] ?? 0);
    if (change !== 0) delta[field] = change;
  }
  return Object.keys(delta).length > 0 ? delta : null;
}
function applyUpgrade(card, delta) {
  const add = (value, change) => (value ?? 0) + (change ?? 0);
  return {
    ...card,
    upgraded: true,
    name: card.name.endsWith("+") ? card.name : `${card.name}+`,
    damage: card.damage === null && !delta.damage ? null : add(card.damage ?? 0, delta.damage),
    ...card.damageBase !== void 0 && (delta.damageBase ?? delta.damage) ? { damageBase: card.damageBase + (delta.damageBase ?? delta.damage) } : {},
    hits: Math.max(0, add(card.hits, delta.hits)),
    ...card.maulIncrease !== void 0 || delta.maulIncrease !== void 0 ? { maulIncrease: add(card.maulIncrease, delta.maulIncrease) } : {},
    block: Math.max(0, add(card.block, delta.block)),
    ...delta.blockBase !== void 0 ? { blockBase: add(card.blockBase, delta.blockBase) } : {},
    ...delta.fasten !== void 0 ? { fasten: add(card.fasten, delta.fasten) } : {},
    ...delta.enemyTempStrengthLoss !== void 0 ? { enemyTempStrengthLoss: add(card.enemyTempStrengthLoss, delta.enemyTempStrengthLoss) } : {},
    ...delta.poisonPerTurn !== void 0 ? { poisonPerTurn: add(card.poisonPerTurn, delta.poisonPerTurn) } : {},
    ...delta.poisonExtraTriggers !== void 0 ? { poisonExtraTriggers: add(card.poisonExtraTriggers, delta.poisonExtraTriggers) } : {},
    vulnerable: add(card.vulnerable, delta.vulnerable),
    weak: add(card.weak, delta.weak),
    strength: add(card.strength, delta.strength),
    tempStrength: add(card.tempStrength, delta.tempStrength),
    draw: add(card.draw, delta.draw),
    energyGain: add(card.energyGain, delta.energyGain),
    hpLoss: Math.max(0, add(card.hpLoss, delta.hpLoss)),
    cost: card.xCost ? card.cost : Math.max(0, add(card.cost, delta.cost)),
    ...card.plating !== void 0 || delta.plating ? { plating: add(card.plating, delta.plating) } : {},
    ...card.retaliate !== void 0 || delta.retaliate ? { retaliate: add(card.retaliate, delta.retaliate) } : {},
    ...card.powerAmount !== void 0 || delta.powerAmount ? { powerAmount: add(card.powerAmount, delta.powerAmount) } : {}
  };
}
function applyApotheosisUpgrade(card) {
  const upgraded = card.type === "Potion" || card.upgraded || card.cardId === "ASCENDERS_BANE" ? card : card.apotheosisUpgrade ? applyUpgrade(card, card.apotheosisUpgrade) : { ...card, known: false };
  return card.drawn ? { ...upgraded, drawn: card.drawn.map(applyApotheosisUpgrade) } : upgraded;
}
function isStrikeCard(card) {
  return /STRIKE/.test(card.cardId) && !card.cardId.startsWith("GEN:");
}
function modelHandCard(entry, fallbackIndex, knowledge, character2 = "", ascension = null) {
  const card = asRecord(entry);
  const cardId = str(card["card_id"]);
  const info = knowledge.card(cardId);
  const template = unconditionalText(str(card["rules_text"]));
  const index = numOrNull(card["index"]) ?? fallbackIndex;
  const requiresTarget = bool(card["requires_target"]);
  const madExpertise = character2.toLowerCase() === "silent" && cardId === "MAD_SCIENCE" && !bool(card["upgraded"]) && dyn(card, "ExpertiseStrength") === 2 && dyn(card, "ExpertiseDexterity") === 2 && str(card["resolved_rules_text"]).replace(/\s+/g, "") === "\u83B7\u5F972\u70B9\u529B\u91CF\u3002\u83B7\u5F972\u70B9\u654F\u6377\u3002";
  const type = madExpertise ? "Power" : info?.type || "";
  const target = targetMode(str(card["target_type"]), template, requiresTarget);
  let damage = madExpertise ? null : dyn(card, "CalculatedDamage") ?? dyn(card, "Damage");
  let hits = dyn(card, "CalculatedHits") ?? dyn(card, "Repeat") ?? 1;
  if (dyn(card, "Repeat") === null && /伤害两次|damage twice/i.test(template)) hits = 2;
  const block = madExpertise ? 0 : dyn(card, "CalculatedBlock") ?? dyn(card, "Block") ?? 0;
  const mirage = character2.toLowerCase() === "silent" && ascension === 10 && cardId === "MIRAGE" && !bool(card["upgraded"]) && dyn(card, "CalculationBase") === 0 && dyn(card, "CalculationExtra") === 1;
  let vulnerable = dyn(card, "VulnerablePower") ?? 0;
  let weak = dyn(card, "WeakPower") ?? 0;
  let strength = madExpertise ? 2 : dyn(card, "StrengthPower") ?? 0;
  let tempStrength = 0;
  let strengthPerVulnerable = 0;
  const enemyStrength = dyn(card, "EnemyStrength") ?? 0;
  const enemyTempStrengthLoss = dyn(card, "StrengthLoss") ?? 0;
  const upgradedMalaise = cardId === "MALAISE" && character2.toLowerCase() === "silent" && bool(card["upgraded"]) && /^敌人失去X\+1点力量。给予X\+1层虚弱。(?:魂缚)?消耗。$/.test(str(card["resolved_rules_text"]).replace(/\s+/g, ""));
  const special = cardId === "MALAISE" && (!bool(card["upgraded"]) || upgradedMalaise) && bool(card["costs_x"]) ? "malaise" : SPECIAL[cardId] ?? (bool(card["costs_x"]) && /伤害X次|damage X times/i.test(`${template} ${str(card["resolved_rules_text"])}`) ? "whirlwind" : null);
  switch (cardId) {
    case "EXPOSE":
      if (!bool(card["upgraded"])) vulnerable = dyn(card, "Power") ?? vulnerable;
      break;
    case "UPPERCUT": {
      const amount = dyn(card, "Power") ?? 1;
      vulnerable = amount;
      weak = amount;
      break;
    }
    case "SETUP_STRIKE":
      tempStrength = strength;
      strength = 0;
      break;
    case "RUPTURE":
      strength = 0;
      break;
    case "BLAZE":
      strength = 0;
      break;
    case "DOMINATE":
      strengthPerVulnerable = dyn(card, "StrengthPerVulnerable") ?? 1;
      strength = 0;
      break;
    case "SPITE":
      hits = 1;
      break;
    default:
      break;
  }
  if (strength > 0 && turnStartOnly(template, "StrengthPower")) strength = 0;
  if (special === "body_slam") damage = dyn(card, "CalculatedDamage") ?? 0;
  if (special === "whirlwind") hits = 0;
  const renderedText = str(card["resolved_rules_text"]) || info?.description || "";
  const hpLoss = dyn(card, "HpLoss") ?? (type === "Power" ? 0 : playHpLossOf(renderedText));
  const energyGain = type === "Power" || energyOnExhaustOnly(template, renderedText) || nextTurnOnly(template, "Energy") ? 0 : dyn(card, "Energy") ?? 0;
  const shadowStep = cardId === "SHADOW_STEP" && !bool(card["upgraded"]);
  const calculatedGamble = cardId === "CALCULATED_GAMBLE" && !bool(card["upgraded"]);
  const hiddenDaggers2 = character2.toLowerCase() === "silent" && cardId === "HIDDEN_DAGGERS" && !bool(card["upgraded"]) && dyn(card, "Cards") === 2 && dyn(card, "Shivs") === 2;
  const metamorphosis = character2.toLowerCase() === "silent" && cardId === "METAMORPHOSIS" && !bool(card["upgraded"]) && dyn(card, "Cards") === 3;
  const daggerDraw = character2.toLowerCase() === "silent" && cardId === "DAGGER_THROW" && !bool(card["upgraded"]) && /抽1张牌/.test(renderedText.replace(/\s+/g, "")) ? 1 : 0;
  const draw = hiddenDaggers2 || shadowStep || metamorphosis || nextTurnOnly(template, "Cards") ? 0 : dyn(card, "Cards") ?? 0;
  const keywords = info?.keywords ?? [];
  const exhausts = keywords.some((keyword) => /exhaust/i.test(keyword));
  const delayedDamage = cardId === "THE_BOMB" ? dyn(card, "BombDamage") ?? 40 : 0;
  const snakebite = character2.toLowerCase() === "silent" && cardId === "SNAKEBITE" && !bool(card["upgraded"]) && dyn(card, "PoisonPower") === 7;
  const haze = character2.toLowerCase() === "silent" && cardId === "HAZE" && (bool(card["upgraded"]) ? dyn(card, "PoisonPower") === 6 : dyn(card, "PoisonPower") === 4);
  const poison = ["DEADLY_POISON", "POISONED_STAB", "BOUNCING_FLASK", "BUBBLE_BUBBLE", "OUTBREAK"].includes(cardId) || snakebite || haze ? dyn(card, "PoisonPower") ?? 0 : 0;
  const shadowmeld = cardId === "SHADOWMELD" && dyn(card, "Power") === 1;
  const burstSkills = dyn(card, "Skills");
  const burst = cardId === "BURST" && (bool(card["upgraded"]) ? burstSkills === 2 : burstSkills === 1);
  const corrosiveWave = cardId === "CORROSIVE_WAVE" && (!bool(card["upgraded"]) || dyn(card, "CorrosiveWave") === 3) ? dyn(card, "CorrosiveWave") ?? 0 : 0;
  const fasten = character2.toLowerCase() === "silent" && cardId === "FASTEN" ? !bool(card["upgraded"]) && dyn(card, "ExtraBlock") === 4 ? 4 : bool(card["upgraded"]) && ascension === 10 && dyn(card, "ExtraBlock") === 6 ? 6 : 0 : 0;
  const thorns = character2.toLowerCase() === "silent" && cardId === "CALTROPS" && !bool(card["upgraded"]) && dyn(card, "ThornsPower") === 3 ? 3 : 0;
  const anticipate = cardId === "ANTICIPATE" && dyn(card, "DexterityPower") !== null;
  const bulletTime = character2.toLowerCase() === "silent" && ascension === 10 && cardId === "BULLET_TIME" && !bool(card["upgraded"]) && template.replace(/\s+/g, "") === "\u4F60\u5728\u672C\u56DE\u5408\u5185\u4E0D\u80FD\u518D\u62BD\u724C\u3002\u4F60\u624B\u724C\u4E2D\u7684\u6240\u6709\u724C\u5728\u672C\u56DE\u5408\u514D\u8D39\u6253\u51FA\u3002";
  const hasModelledEffect = (
    // Dark Shackles' temporary Strength loss is applied by the solver (turn-solver tempStrengthLoss): not unknown.
    damage !== null || block > 0 || mirage || vulnerable > 0 || weak > 0 || strength > 0 || tempStrength > 0 || energyGain > 0 || draw > 0 || delayedDamage > 0 || enemyTempStrengthLoss > 0 || poison > 0 || anticipate || calculatedGamble || hiddenDaggers2 || bulletTime
  );
  let flatValue = 0;
  let known = hasModelledEffect;
  let immediatePlays;
  let adds;
  if (hiddenDaggers2) {
    const shiv = knowledge.card("SHIV");
    const base = shiv ? dyn({ dynamic_values: shiv.vars }, "Damage") ?? shiv.damage : null;
    known = shiv !== null && base !== null;
    if (shiv && base !== null) adds = Array.from({ length: 2 }, (_, i) => modelHandCard({
      index: i,
      card_id: "SHIV",
      name: shiv.name,
      upgraded: false,
      energy_cost: 0,
      playable: true,
      requires_target: true,
      target_type: "AnyEnemy",
      rules_text: shiv.descriptionRaw,
      resolved_rules_text: shiv.description,
      dynamic_values: [{ name: "Damage", base_value: base, current_value: base }]
    }, i, knowledge, character2));
  }
  if (type === "Power") {
    flatValue = POWER_VALUE[cardId] ?? 8;
    known = true;
  } else if (shadowmeld || burst || corrosiveWave > 0 || special === "frantic_escape" || special === "double_block" || special === "double_next_attacks" || special === "primal_force" || special === "malaise") {
    known = true;
  } else if (!hasModelledEffect && type !== "Status" && type !== "Curse") {
    flatValue = 3 + 2 * Math.max(0, num(card["energy_cost"]));
  }
  if (cardId === "KNIFE_TRAP") {
    flatValue = 0;
    const count2 = dyn(card, "CalculatedShivs");
    const shiv = knowledge.card("SHIV");
    const base = shiv ? dyn({ dynamic_values: shiv.vars }, "Damage") ?? shiv.damage : null;
    known = !bool(card["upgraded"]) && count2 !== null && Number.isInteger(count2) && count2 >= 0 && (count2 === 0 || base !== null);
    if (known && count2 > 0 && shiv && base !== null) {
      immediatePlays = { count: count2, card: modelHandCard({
        index: -1,
        card_id: "SHIV",
        name: shiv.name,
        upgraded: false,
        energy_cost: 0,
        playable: true,
        requires_target: true,
        target_type: "AnyEnemy",
        valid_target_indices: card["valid_target_indices"],
        rules_text: shiv.descriptionRaw,
        resolved_rules_text: shiv.description,
        dynamic_values: [{ name: "Damage", base_value: base, current_value: base }]
      }, -1, knowledge, character2) };
    }
  }
  const playFirst = isPlayFirst(cardId, renderedText);
  if (playFirst) known = true;
  const conditions = cardConditionOptions.enabled;
  const handCondition = conditions && (draw > 0 || energyGain > 0) ? handConditionOf(template, renderedText) : null;
  const rageBlock = conditions && cardId === "RAGE" ? dyn(card, "Power") ?? 3 : 0;
  if (rageBlock > 0) {
    known = true;
    flatValue = 0;
  }
  const perExhaustDamage = conditions && cardId === "ASHEN_STRIKE" ? dyn(card, "ExtraDamage") ?? 0 : 0;
  const perStrengthBlock = conditions && cardId === "EXPECT_A_FIGHT" ? dyn(card, "CalculationExtra") ?? 0 : 0;
  const hitPerHpLoss = conditions && cardId === "TEAR_ASUNDER";
  const rendered = renderedText;
  const weakFirst = weak > 0 && vulnerable > 0 && debuffWeakFirst(rendered || template);
  const { heldPenalty, heldHpLoss } = heldPenaltyOf(rendered);
  const heldHpLossPerCard = cardId === "REGRET" && /失去相当于[^。]*手牌数量[^。]*生命|lose hp equal to[^.]*cards? in your hand/i.test(rendered) ? 1 : 0;
  const selfDamage = playSelfDamageOf(rendered);
  if ((heldPenalty > 0 || heldHpLossPerCard > 0) && (type === "Status" || type === "Curse")) {
    damage = null;
    known = true;
  }
  const model2 = {
    index,
    key: `c${index}`,
    cardId,
    name: str(card["name"], info?.name ?? cardId),
    type,
    upgraded: bool(card["upgraded"]),
    cost: num(card["energy_cost"]),
    xCost: bool(card["costs_x"]),
    ...special === "malaise" && upgradedMalaise ? { malaiseBonus: 1 } : {},
    // Too expensive now is still in the search (it checks energy itself): energy gained this turn, or a
    // Touch of Insanity making it free, can pay for it.
    // The Gambit is never played: after it any unblocked hit is fatal (S780).
    // The Gambit is in the search now: the solver makes every later unblocked hit fatal and plays it
    // only when every other line dies (P78Z F17 T11: 3 HP, 17 block of 21, a 0-cost 50 block in hand).
    // But a card a power's hook locks reads not_enough_energy too when the energy is short as well, the hook named in
    // unplayable_preventer_id (raw "BlockedByHook, EnergyCostTooHigh"): Chains of Binding once a Soulbound card is
    // played, Sloth's and Ringing's card cap, Smoggy's one Skill. No energy unlocks it this turn (4JGPCH3WX6JV F48 T2: an
    // Energy Potion drunk at 0 energy for a Soulbound Defend+, blocked_by_hook after it; the turn ended, 10 HP lost).
    // A card Enthralled locks (preventer ENTHRALLED) is playable once Enthralled is played: in the search, the solver plays
    // Enthralled first (HYQW47E7CBSC F38 T4: 5 energy, Bludgeon, Evil Eye, Bash and Strike all blocked_by_hook by it; the
    // only line was end turn, 13 HP lost).
    playable: bool(card["playable"]) || str(card["unplayable_reason"]) === "not_enough_energy" && !blockedByHook(card) || afterPlayFirst(card),
    target,
    validTargets: asArray(card["valid_target_indices"]).map((value) => num(value)).filter((value) => Number.isFinite(value)),
    damage,
    ...character2.toLowerCase() === "silent" && cardId === "PRECISE_CUT" && !bool(card["upgraded"]) && dyn(card, "CalculationBase") === 13 && dyn(card, "ExtraDamage") === 2 && [3, 5, 7, 11].includes(damage ?? -1) && /你的手牌中每有一张牌，此牌的伤害就降低/.test(template) ? { preciseCutHandDamage: true } : {},
    ...immediatePlays ? { immediatePlays } : {},
    hits: Math.max(0, Math.round(hits)),
    ...character2.toLowerCase() === "silent" && cardId === "FLECHETTES" && !bool(card["upgraded"]) && dyn(card, "CalculatedHits") !== null && /^手牌中每有一张技能牌，造成/.test(template) ? { hitsLoseHandSkills: true } : {},
    ...cardId === "MAUL" && dyn(card, "Increase") !== null ? { maulIncrease: dyn(card, "Increase") } : {},
    ...shadowmeld ? { shadowmeld: true } : {},
    ...burst ? { burst: true, burstSkills } : {},
    ...bulletTime ? { bulletTime: true } : {},
    ...corrosiveWave > 0 ? { corrosiveWave } : {},
    block,
    ...character2.toLowerCase() === "silent" && ascension === 10 && cardId === "DODGE_AND_ROLL" && bool(card["upgraded"]) && dynBase(card, "Block", true) === 6 && template.replace(/\s+/g, "") === "\u83B7\u5F97{Block:diff()}\u70B9\u683C\u6321\u3002\u5728\u4E0B\u4E2A\u56DE\u5408\uFF0C\u83B7\u5F97{Block:diff()}\u70B9\u683C\u6321\u3002" ? { dodgeRollNextBlock: true } : {},
    ...mirage ? { blockFromPoison: true } : {},
    ...!madExpertise && dynBase(card, "Block", true) !== null ? { blockBase: dynBase(card, "Block", true) } : {},
    vulnerable,
    weak,
    ...weakFirst ? { weakFirst } : {},
    strength,
    ...fasten > 0 ? { fasten } : {},
    ...thorns > 0 ? { thorns } : {},
    ...madExpertise ? { dexterity: 2 } : cardId === "FOOTWORK" && dyn(card, "DexterityPower") !== null ? { dexterity: dyn(card, "DexterityPower") } : {},
    ...anticipate ? { temporaryDexterity: dyn(card, "DexterityPower") } : {},
    ...cardId === "AFTERIMAGE" && dyn(card, "AfterimagePower") !== null ? { afterImage: dyn(card, "AfterimagePower") } : {},
    // 5PM6JAQG6FNQ F33 T1, silent-0132: the generated plain power establishes four without hitting.
    ...character2.toLowerCase() === "silent" && ascension === 10 && cardId === "SERPENT_FORM" && !bool(card["upgraded"]) && dyn(card, "SerpentFormPower") === 4 ? { serpentForm: 4 } : {},
    tempStrength,
    ...strengthPerVulnerable > 0 ? { strengthPerVulnerable } : {},
    ...!madExpertise && dynBase(card, "Damage") !== null ? { damageBase: dynBase(card, "Damage") } : {},
    ...cardId === "FEEL_NO_PAIN" ? { feelNoPain: dyn(card, "Power") ?? 3 } : {},
    ...special === "double_next_attacks" ? { nextAttacks: dyn(card, "Attacks") ?? 1 } : {},
    enemyStrength,
    enemyTempStrengthLoss,
    // Beckon's HpLoss var is what holding it costs, not a price for playing it (PU21: every Beckon
    // played was charged 6 HP by the solver).
    hpLoss: heldPenalty > 0 ? 0 : hpLoss,
    energyGain,
    plating: dyn(card, "PlatingPower") ?? 0,
    draw,
    exhausts,
    special,
    ...shadowStep ? { discardsHand: true, doubleDamageNext: true } : {},
    ...calculatedGamble ? { discardsHand: true, drawDiscardedHand: true } : {},
    ...hiddenDaggers2 ? { discardCount: 2, ...adds ? { adds } : {} } : {},
    ...character2.toLowerCase() === "silent" && !bool(card["upgraded"]) && ["SURVIVOR", "DAGGER_THROW", "ACROBATICS"].includes(cardId) && /(?:丢弃|弃掉)1张牌/.test(rendered.replace(/\s+/g, "")) ? { discardAfterDraw: true, ...daggerDraw > 0 ? { discardDraw: daggerDraw } : {} } : {},
    ...poison > 0 ? { poison, ...cardId === "BUBBLE_BUBBLE" ? { poisonRequiresExisting: true } : {}, ...cardId === "OUTBREAK" ? { poisonNow: true } : {} } : {},
    ...cardId === "NOXIOUS_FUMES" && dyn(card, "PoisonPerTurn") !== null ? { poisonPerTurn: dyn(card, "PoisonPerTurn") } : {},
    ...cardId === "ACCELERANT" && dyn(card, "Accelerant") !== null ? { poisonExtraTriggers: dyn(card, "Accelerant") } : {},
    ...cardId === "ENVENOM" && !bool(card["upgraded"]) && dyn(card, "EnvenomPower") !== null ? { envenom: dyn(card, "EnvenomPower") } : {},
    ...cardId === "PHANTOM_BLADES" && !bool(card["upgraded"]) && dyn(card, "PhantomBladesPower") === 9 ? { phantomBlades: 9 } : {},
    known,
    flatValue,
    heldPenalty,
    heldHpLoss,
    ...heldHpLossPerCard > 0 ? { heldHpLossPerCard } : {},
    ...selfDamage > 0 ? { selfDamage } : {},
    retaliate: dyn(card, "DamageBack") ?? 0,
    delayedDamage,
    inferno: cardId === "INFERNO" ? dyn(card, "InfernoPower") ?? 6 : 0,
    ...POWER_AMOUNT_VARS[cardId] && dyn(card, POWER_AMOUNT_VARS[cardId]) !== null ? { powerAmount: dyn(card, POWER_AMOUNT_VARS[cardId]) } : {},
    ...replayOf(rendered) > 0 ? { replay: replayOf(rendered) } : {},
    soulbound: /(^|\s)魂缚(\s|。|$)|\bSoulbound\b/i.test(rendered),
    ...playFirst ? { playFirst: true } : {},
    ...etherealText(info?.keywords, rendered) ? { ethereal: true } : {},
    putsOnTop: /放到(?:你的)?抽牌堆(?:的)?顶部?|on top of your draw pile/i.test(rendered),
    drawsUntil: /抽牌直到|draw cards? until/i.test(rendered),
    // Thrash's random exhaust takes an Attack and adds its damage (special "thrash", solver), not any card
    // (MAHA F33 T7: played before Anger, which it ate; the boss was left at 1/321).
    randomExhaust: special !== "thrash" && /随机消耗|消耗[^。]*随机|exhausts? \d+ random|random card[^.]*exhaust/i.test(rendered),
    ...handCondition ? { handCondition } : {},
    ...rageBlock > 0 ? { rageBlock } : {},
    ...perExhaustDamage > 0 ? { perExhaustDamage } : {},
    ...perStrengthBlock > 0 ? { perStrengthBlock } : {},
    ...hitPerHpLoss ? { hitPerHpLoss } : {},
    text: str(card["resolved_rules_text"]) || info?.description || ""
  };
  if (character2.toLowerCase() === "silent" && ascension === 10) {
    if (cardId === "APOTHEOSIS" && !model2.upgraded && model2.cost === 2 && !model2.xCost && template === "\u5347\u7EA7\u4F60\u7684\u5168\u90E8\u5361\u724C\u3002" && str(card["resolved_rules_text"]).replace(/\s+/g, "") === "\u56FA\u6709\u3002\u5347\u7EA7\u4F60\u7684\u5168\u90E8\u5361\u724C\u3002\u6D88\u8017\u3002" && !model2.replay) {
      model2.apotheosis = true;
      model2.known = true;
      model2.flatValue = 0;
      model2.exhausts = true;
    }
    const rawUpgrade = observedApotheosisUpgrade(card);
    if (rawUpgrade) {
      const upgraded = modelHandCard(rawUpgrade, fallbackIndex, knowledge, character2, ascension);
      const fields = [...UPGRADE_FIELDS, "damageBase", "blockBase", "fasten", "enemyTempStrengthLoss", "poisonPerTurn", "poisonExtraTriggers"];
      model2.apotheosisUpgrade = {};
      for (const field of fields) {
        const change = (upgraded[field] ?? 0) - (model2[field] ?? 0);
        if (change) model2.apotheosisUpgrade[field] = change;
      }
    }
  }
  return model2;
}
function giantRockFrom(attack, upgraded, strengthNow, weak, shrunk = false) {
  const base = upgraded ? GIANT_ROCK.damageUpgraded : GIANT_ROCK.damage;
  const { shownShrunk: _attackShrunk, ...rest } = attack;
  return {
    ...rest,
    ...shrunk ? { shownShrunk: true } : {},
    key: `${attack.key}>rock`,
    cardId: "GIANT_ROCK",
    name: upgraded ? "\u5DE8\u77F3+" : "\u5DE8\u77F3",
    type: "Attack",
    upgraded,
    cost: GIANT_ROCK.cost,
    xCost: false,
    playable: true,
    target: "single",
    damage: Math.floor(ourAttackScaled(base + strengthNow, weak, shrunk)),
    damageBase: base,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: `\u9020\u6210${base}\u70B9\u4F24\u5BB3\u3002`
  };
}
function offHandCardModel(own, cardId, upgraded, index, knowledge, cost = null, powerExtraCost = 0, character2 = "", ascension = null) {
  const info = knowledge.card(cardId);
  const raw = own ?? {
    card_id: cardId,
    upgraded,
    name: info?.name ?? cardId,
    dynamic_values: info?.vars ?? [],
    rules_text: info?.descriptionRaw ?? "",
    resolved_rules_text: info?.description ?? "",
    energy_cost: info?.cost ?? 0,
    costs_x: info?.xCost ?? false
  };
  const model2 = modelHandCard({ ...raw, ...cost !== null ? { energy_cost: cost } : {}, target_type: info?.target ?? "", requires_target: info?.target === "AnyEnemy", playable: true, index }, index, knowledge, character2, ascension);
  const unplayable = (info?.keywords ?? []).some((keyword) => /unplayable/i.test(keyword));
  const relicCost = cost === null ? withPowerExtraCost(model2, powerExtraCost) : model2;
  return { ...relicCost, playable: !unplayable && (model2.xCost || model2.cost >= 0) };
}
function pilePowerExtraCost(relicIds) {
  return pileCostOptions.relics && relicIds.includes("SPIKED_GAUNTLETS") ? 1 : 0;
}
function withPowerExtraCost(card, powerExtraCost) {
  return powerExtraCost !== 0 && card.type === "Power" && !card.xCost && card.cost >= 0 ? { ...card, cost: card.cost + powerExtraCost } : card;
}
function potionPowerExtraCost(relicIds) {
  return potionCardCostOptions.relics && relicIds.includes("SPIKED_GAUNTLETS") ? 1 : 0;
}
function potionCardCost(card, powerExtraCost = 0) {
  if (card.xCost) return card.cost;
  return card.type === "Power" ? powerExtraCost : 0;
}
function expectedDraw(pile, slot) {
  if (pile.length === 0) return null;
  const n = pile.length;
  const played = pile.filter((card) => card.playable && card.type !== "Status" && card.type !== "Curse");
  const mean = (value) => played.reduce((sum, card) => sum + value(card), 0) / n;
  const damage = mean((card) => (card.damage ?? 0) * Math.max(1, card.hits));
  const targets = played.find((card) => card.target === "single")?.validTargets ?? [];
  return {
    index: 200 + slot,
    key: `g${slot}`,
    cardId: `GEN:GAMBLERS_BREW:${slot}`,
    name: "an average draw",
    type: Math.round(damage) > 0 ? "Attack" : "Skill",
    upgraded: false,
    cost: Math.round(played.length > 0 ? played.reduce((sum, card) => sum + Math.max(0, card.cost), 0) / played.length : 1),
    xCost: false,
    playable: true,
    target: Math.round(damage) > 0 && targets.length > 0 ? "single" : "self",
    validTargets: Math.round(damage) > 0 ? targets : [],
    damage: Math.round(damage) > 0 ? Math.round(damage) : null,
    hits: 1,
    block: Math.round(mean((card) => card.block)),
    vulnerable: Math.round(mean((card) => card.vulnerable)),
    weak: Math.round(mean((card) => card.weak)),
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: ""
  };
}
function pileCardPick(cards, incoming, enemies, free, board2 = {}, powerExtraCost = 0) {
  const playable = cards.filter((card) => card.playable && card.type !== "Status" && card.type !== "Curse" && card.cardId !== "THE_GAMBIT");
  if (playable.length === 0) return null;
  const scored = playable.map((card) => free ? { ...card, cost: potionCardCost(card, powerExtraCost) } : card);
  return scored.reduce((best, card) => thisTurnScore(card, incoming, enemies, board2) > thisTurnScore(best, incoming, enemies, board2) ? card : best);
}
function thisTurnScore(card, incoming, enemies, board2 = {}) {
  if (card.cardId === "THE_GAMBIT") return -100;
  const damage = thisTurnDamage(card, board2) * Math.max(1, card.hits) * (card.target === "all" ? enemies : 1);
  const block = Math.min(card.block, incoming) + 0.3 * Math.max(0, card.block - incoming);
  const score = damage + block + 2.5 * Math.min(card.vulnerable, 3) + 1.5 * Math.min(card.weak, 3) + 5 * card.strength + 2 * card.tempStrength + 3 * card.draw + 4 * card.energyGain + card.flatValue - 2 * Math.max(0, card.cost) - card.hpLoss;
  return Math.round(score);
}
function thisTurnDamage(card, board2 = {}) {
  if (card.cardId === "GRAND_FINALE" && board2.drawPileEmpty === false) return 0;
  if (card.cardId === "PACTS_END" && board2.exhaustReach !== void 0 && board2.exhaustReach < PACTS_END_CARDS) return 0;
  if (card.cardId === "BULLY") return (card.damage ?? 0) + BULLY_PER_VULNERABLE * (board2.vulnerable ?? 0);
  return card.damage ?? 0;
}
function freeCardPick(cards) {
  const worth = (card) => (card.damage ?? 0) * Math.max(1, card.hits) + card.block + card.flatValue + 5 * card.strength;
  const eligible = cards.filter((card) => card.type !== "Potion" && card.type !== "Status" && card.type !== "Curse" && !card.xCost && card.cost >= FREE_CARD_MIN_COST);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, card) => card.cost > best.cost || card.cost === best.cost && worth(card) > worth(best) ? card : best);
}
function modelPotion(potionId, name, slot, validTargets, ctx) {
  const effect = POTION_EFFECTS[potionId] ?? (potionId === "POISON_POTION" && (ctx?.observedPoison ?? 0) > 0 ? { target: "single", poison: ctx.observedPoison } : void 0);
  if (!effect) return null;
  const drawPotion = effect.special === "chaos" || effect.special === "glowwater" || effect.special === "gamble" || effect.special === "bottled";
  if (drawPotion && !ctx?.expectedDraw && !ctx?.pilesEmpty) return null;
  if (drawPotion && !ctx?.expectedDraw && effect.special === "gamble") return { ...potionShell(potionId, name, slot, validTargets), ...effect, special: null };
  const card = GENERATED_CARD_POTIONS[potionId];
  const pile = PILE_CARD_POTIONS[potionId];
  const pileCard = pile ? (pile.pile === "discard" ? ctx?.discardPick : ctx?.drawPick) ?? null : null;
  if (pile && !pileCard) return null;
  if (effect.special === "forge" && Object.keys(ctx?.upgrades ?? {}).length === 0) return null;
  const generates = effect.special === "gamble" || effect.special === "chaos" || effect.special === "glowwater" || effect.special === "bottled" ? ctx?.expectedDraw ?? void 0 : pileCard ? { ...pileCard, index: 200 + slot, key: `g${slot}`, cardId: `GEN:${potionId}:${slot}`, name: `${pileCard.name} from ${name}`, playable: true, pileCard: { cardId: pileCard.cardId, upgraded: pileCard.upgraded } } : card ? {
    index: 200 + slot,
    key: `g${slot}`,
    cardId: `GEN:${potionId}:${slot}`,
    name: `card from ${name}`,
    type: card.type,
    upgraded: false,
    // Free this turn; a Power under Spiked Gauntlets 1 (potionCardCost).
    cost: potionCardCost({ type: card.type, xCost: false, cost: 0 }, ctx?.powerExtraCost ?? 0),
    xCost: false,
    playable: true,
    target: card.target,
    validTargets: card.target === "single" ? ctx?.enemyTargets ?? validTargets : [],
    // Like a hand card's shown number: current Strength in, Weak applied.
    damage: card.damage === void 0 ? null : Math.floor((card.damage + (ctx?.strength ?? 0)) * (ctx?.weak ? 0.75 : 1)),
    hits: 1,
    block: card.block ?? 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: card.flatValue ?? 0,
    heldPenalty: 0,
    text: ""
  } : void 0;
  return {
    ...potionShell(potionId, name, slot, validTargets),
    ...effect,
    ...generates ? { generates } : {},
    ...effect.special === "forge" ? { upgrades: ctx?.upgrades ?? {} } : {},
    ...effect.special === "stew" ? { laterDamage: ctx?.strikePileDamage ?? 0 } : {}
  };
}
function potionShell(potionId, name, slot, validTargets) {
  return {
    index: 100 + slot,
    key: `p${slot}`,
    cardId: `POTION:${potionId}:${slot}`,
    name: `potion ${name}`,
    type: "Potion",
    upgraded: false,
    cost: 0,
    xCost: false,
    playable: true,
    target: "self",
    validTargets,
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: true,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: ""
  };
}
function potionEffect(potionId) {
  return POTION_EFFECTS[potionId] ?? null;
}
function randomPotionKind(potionId) {
  if (potionId in CHOICE_POTIONS) return "choice";
  if (potionId in DRAW_POTIONS) return "draw";
  return null;
}
var cardConditionOptions, PLAY_FIRST_CARDS, PLAY_FIRST_TEXT, playFirstOptions, POWER_VALUE, POWER_AMOUNT_VARS, SPECIAL, unconditionalTexts, UPGRADE_FIELDS, GIANT_ROCK, pileCostOptions, POTION_EFFECTS, GENERATED_CARD_POTIONS, potionCardCostOptions, PILE_CARD_POTIONS, PACTS_END_CARDS, BULLY_PER_VULNERABLE, FREE_CARD_MIN_COST, CHOICE_POTIONS, DRAW_POTIONS;
var init_card_model = __esm({
  "src/reflex/card-model.ts"() {
    "use strict";
    init_card_upgrades();
    init_silent_apotheosis();
    init_json();
    cardConditionOptions = { enabled: process.env["CARD_CONDITIONS"] !== "off" };
    PLAY_FIRST_CARDS = /* @__PURE__ */ new Set(["ENTHRALLED"]);
    PLAY_FIRST_TEXT = /你必须优先打出这张牌|must play this card first/i;
    playFirstOptions = { enabled: true };
    POWER_VALUE = {
      DEMON_FORM: 30,
      // 5 to every enemy at the start of each turn, +5 each time (5+10+15+20 over four turns); B6AC F33:
      // at the default 8 it was never played, not even on the Knowledge Demon's 0-damage curse turn.
      ROLLING_BOULDER: 26,
      INFLAME: 4,
      // the Strength itself is simulated; this is only the "earlier is better" nudge
      FEEL_NO_PAIN: 8,
      DARK_EMBRACE: 8,
      BARRICADE: 10,
      CORRUPTION: 14,
      CRIMSON_MANTLE: 16,
      INFERNO: 10,
      JUGGERNAUT: 14,
      JUGGLING: 6,
      PYRE: 16,
      RUPTURE: 6,
      STAMPEDE: 12,
      STONE_ARMOR: 14,
      UNMOVABLE: 8,
      VICIOUS: 6,
      CRUELTY: 8,
      AGGRESSION: 12,
      HELLRAISER: 10,
      TANK: 0
    };
    POWER_AMOUNT_VARS = {
      DEMON_FORM: "StrengthPower",
      JUGGERNAUT: "JuggernautPower",
      CRIMSON_MANTLE: "CrimsonMantlePower",
      PYRE: "Energy",
      RUPTURE: "StrengthPower",
      INFERNO: "InfernoPower",
      METALLICIZE: "MetallicizePower",
      ROLLING_BOULDER: "RollingBoulderPower"
    };
    SPECIAL = {
      DISMANTLE: "dismantle",
      // Thrash: 「造成4点伤害两次。消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌。」 (solver: hits for its printed
      // number, then an Attack from the hand is exhausted and its shown damage added to Thrash for later plays; 3SBPKG9603WD).
      THRASH: "thrash",
      BODY_SLAM: "body_slam",
      BULLY: "bully",
      // Entrench: doubles the block up when it is played (0 block: worth 0; RTF3 F17/F28).
      ENTRENCH: "double_block",
      MOLTEN_FIST: "molten_fist",
      WHIRLWIND: "whirlwind",
      // Volley: X hits at random enemies (LXB3 F33 T3: counted as one 10-damage hit at X=0, dealt 0).
      VOLLEY: "whirlwind",
      SPITE: "spite",
      FEED: "feed",
      RUPTURE: "rupture",
      COLOSSUS: "colossus",
      FIEND_FIRE: "fiend_fire",
      STOMP: "stomp",
      // Apparition: Intangible for the enemy turn, every hit to 1 (1LJF F42 T6: two exhausted unplayed
      // on the wind-up turn, the Heavy Cleave 45 killed us next turn).
      APPARITION: "intangible",
      SECOND_WIND: "second_wind",
      // exhausts every non-Attack in hand, its Block per card (solver) // costs 1 less per Attack played this turn (the shown cost counts the ones before planning) // exhausts the hand, one hit per card exhausted (solver)
      DOMINATE: "dominate",
      // Strength per Vulnerable on the target, after its own Vulnerable (solver)
      FRANTIC_ESCAPE: "frantic_escape",
      // The Insatiable: +1 Sandpit (the solver scores the countdown)
      // Primal Force: 「将手牌中的所有攻击牌变化为巨石」 (upgraded: 巨石+): every Attack in hand becomes a Giant Rock (solver).
      PRIMAL_FORCE: "primal_force",
      CRIMSON_MANTLE: "crimson_mantle",
      // 1 HP at the start of every turn (the solver checks it can afford it)
      // One-Two Punch: 「在这个回合，你打出的下{Attacks}张攻击牌会被额外打出一次。」 (Attacks 1, upgraded 2): the next
      // Attacks are played twice (solver duplicateAttacks, as ONE_TWO_PUNCH_POWER once it is up). Unmodelled in hand,
      // it was a 5-point unknown and the line it doubles read single.
      ONE_TWO_PUNCH: "double_next_attacks",
      // Unrelenting: 「造成{Damage}点伤害。 你打出的下一张攻击牌耗能变为0。」: the next Attack costs 0 (solver
      // freeAttacks, as FREE_ATTACK_POWER once it is up). In hand only its damage was modelled.
      UNRELENTING: "free_next_attack"
    };
    unconditionalTexts = /* @__PURE__ */ new Map();
    UPGRADE_FIELDS = ["damage", "hits", "maulIncrease", "block", "vulnerable", "weak", "strength", "tempStrength", "draw", "energyGain", "hpLoss", "cost", "plating", "retaliate", "powerAmount"];
    GIANT_ROCK = { cost: 1, damage: 20, damageUpgraded: 24 };
    pileCostOptions = { relics: true };
    POTION_EFFECTS = {
      FIRE_POTION: { target: "single", damage: 20 },
      // Foul Potion: 「对所有玩家和敌人造成{Damage}点伤害」, Damage 12 (potion-values.ts). It hits us too
      // (39J9: two drunk at 22 HP): the line's hp_lost carries it (turn-solver selfDamage, through our block).
      FOUL_POTION: { target: "all", damage: 12, selfDamage: 12 },
      // Exhausts any cards in hand: Howl from Beyond (it then replays every turn) and junk (H14T F39 T4:
      // Ashwater -> Howl was the lethal at 2 HP; unmodelled, every line "died").
      ASHWATER: { target: "self", special: "ashwater" },
      // 15 measured (states.jsonl V5S6 F12/F14, 2WUM, W6F4: 26 -> 11, 18 -> 3; potion damage ignores Vulnerable).
      POTION_SHAPED_ROCK: { target: "single", damage: 15 },
      EXPLOSIVE_AMPOULE: { target: "all", damage: 10 },
      BLOCK_POTION: { target: "self", block: 12 },
      STRENGTH_POTION: { target: "self", strength: 2 },
      FLEX_POTION: { target: "self", tempStrength: 5 },
      WEAK_POTION: { target: "single", weak: 3 },
      FEAR_POTION: { target: "single", vulnerable: 3 },
      FORTIFIER: { target: "self", special: "triple_block" },
      SPEED_POTION: { target: "self", special: "temp_dex" },
      // +5 Dexterity this turn (STS1 value, estimate)
      LUCKY_TONIC: { target: "self", special: "buffer" },
      DUPLICATOR: { target: "self", special: "duplicate_next" },
      // the next card is played twice // Buffer 1: the next HP loss is prevented
      VULNERABLE_POTION: { target: "single", vulnerable: 3 },
      // STS2 id (FEAR_POTION is the STS1 name)
      POTION_OF_BINDING: { target: "all", weak: 1, vulnerable: 1 },
      // Shackling Potion: 「所有敌人在这个回合失去{StrengthPower}点力量」, StrengthPower 7 (potion-values.ts): every
      // enemy's attacks this turn 7 less per hit, like Mangle's temporary loss (Artifact takes it). Unmodelled,
      // VQKX carried it from F11 through four -25 to -29 fights and gave it away at F28.
      SHACKLING_POTION: { target: "all", enemyTempStrengthLoss: 7 },
      SHIP_IN_A_BOTTLE: { target: "self", block: 10 },
      // Liquid Bronze: 「获得{ThornsPower}点荆棘」, THORNS_POWER +3 on each drink (states.jsonl, 24 drinks in 21 runs to
      // 09-29: 0 -> 3, or 3 -> 6 on a second), up until the fight's end (e.g. Q4JV F17 T1-T13, CWU9 F33 T4-T12): 3
      // back to the attacker per attack hit, this turn and the later ones (turn-solver retaliate, rollout thorns).
      // Unmodelled, VTRE listed it "effect not simulated" in 37 questions and V6TW in 29.
      LIQUID_BRONZE: { target: "self", thorns: 3 },
      // Stable Serum: 「保留你的手牌{Repeat}回合」 — RETAIN_HAND_POWER 2 on each drink (states.jsonl, 02L4 T9, 0YG4 T1,
      // 7UJ1 T7, 92MW T1: 2, then 1 on the next turn, gone after): the hand left at the end of this turn and of the next
      // stays in hand and the next turn draws on top of it (up to 10: 02L4 5 kept + 5 drawn). Nothing this turn; the
      // rollout keeps the hands (STABLE_SERUM_TURNS). Unmodelled, 66 questions listed it "effect not simulated".
      STABLE_SERUM: { target: "self", special: "retain_hand" },
      ENERGY_POTION: { target: "self", energyGain: 2 },
      SWIFT_POTION: { target: "self", draw: 3 },
      // Clarity: 「抽{Cards}张牌。在你的下{ClarityPower}个回合开始时，额外抽1张牌」. K7G9 F30 T7 (states.jsonl): hand
      // 3 -> 4 on the drink, CLARITY_POWER 3 after it. One card now; the three later draws are lasting value
      // (turn-solver CLARITY_LATER_DRAWS). Unmodelled, it was carried 35 floors in K7G9 (F1-F30, F39-F45).
      CLARITY: { target: "self", draw: 1, special: "clarity" },
      // Mazaleth's Gift: Ritual 1 (states.jsonl XMY2 F17 T9: RITUAL_POWER 1), +1 Strength at the end of
      // each of our turns: a small Demon Form (turn-solver RITUAL_VALUE). Unmodelled, it hung as a
      // "drink first" option from T1 to T9 of XMY2's act-1 boss.
      MAZALETHS_GIFT: { target: "self", special: "ritual" },
      FYSH_OIL: { target: "self", strength: 1 },
      // Debuff: Artifact negates it like any other (TQX5 T1: drunk into Artifact 3, nothing landed).
      // Demise 9 measured (states.jsonl DEMISE_POWER amount 9).
      POWDERED_DEMISE: { target: "single", demise: 9 },
      // Beetle Juice: 「敌人的攻击在下{Repeat}个回合中造成的伤害减少{DamageDecrease}%」 = SHRINK_POWER 4 on the target,
      // its attacks 30% less (states.jsonl: intents 23 -> 16, 20 -> 14, 14 -> 9; potion-values.ts). Unmodelled,
      // W8JD carried it from F29 to the 1-HP turn of F31 ("its effect is in no line's numbers").
      BEETLE_JUICE: { target: "single", shrink: 4 },
      // The next Attack deals triple damage (PLC F33: kept from T1 to death with Bludgeon in hand).
      GIGANTIFICATION_POTION: { target: "self", special: "triple_next_attack" },
      // A card in hand costs 0 for the rest of the combat, chosen on a combat_hand_select screen ("选择一张
      // 牌使其免费"). G8AQ T3: made Bludgeon+ free would have been lethal; spent on a 1-cost card instead.
      TOUCH_OF_INSANITY: { target: "self", special: "free_card" },
      // +2 Dexterity for the fight (DEXTERITY_POWER 2 in states.jsonl). Worth only the block cards it
      // raises: KFP1 T3 and 2WUM F33 T3 drank it with no block card left to play, 0 gained that turn.
      DEXTERITY_POTION: { target: "self", special: "dexterity" },
      // Heart of Iron: Plating 7 (states.jsonl, 20 drinks from 3MDJ to Z7D7: PLATING_POWER 7 each time,
      // not Metallicize): block at the end of this turn (turn-solver platingNow) and one less each later turn,
      // valued by what it can absorb of the later turns' forecast attacks (turn-solver platingAbsorbed).
      // Unmodelled, KGR6 carried it from F8 to the F27 event that took it, through two 1-3 HP turns.
      HEART_OF_IRON: { target: "self", plating: 7, special: "plating" },
      // Snecko Oil: 「抽{Cards}张牌。在本回合随机化你手牌中所有牌的耗能」. Drawn 7 up to the 10-card hand (24DP
      // 2 -> 9, 24HM 3 -> 10; 5 -> 10 elsewhere), costs 0-3 at random (states.jsonl): the hand's costs at their
      // expected SNECKO_COST. Unmodelled, K8TC carried it from F6 into the act boss that killed it.
      SNECKO_OIL: { target: "self", draw: 7, special: "snecko" },
      // Blood Potion: heals 20% of max HP (RVL2 F30: 25 -> 39 at 74 max; EN55 F8 T9: 7 -> 23 at 80). The
      // turn's HP loss is net of it (turn-solver BLOOD_POTION_HEAL). Unmodelled it stayed "its effect is in no
      // line's numbers" from T1 to the 7-HP turn of EN55's fatal elite.
      BLOOD_POTION: { target: "self", special: "heal" },
      // Gambler's Brew: 「丢弃任意张牌，然后抽相同数量的牌。」 Every hand card worse than an average draw is
      // discarded for one (turn-solver "gamble"; the expected draw from the draw pile: expectedDraw). 77UJ
      // F33 T5 and EN55 F8 T9: carried unmodelled to the death, each time a draw of the pile's block cards
      // would likely have lived.
      GAMBLERS_BREW: { target: "self", special: "gamble" },
      // Glowwater: 「消耗你的手牌。抽{Cards}张牌。」 the hand exhausted, then a new hand of the pile's expected
      // cards (turn-solver "glowwater"; logged drinks: 5 -> 10 cards, 3 -> 10).
      GLOWWATER_POTION: { target: "self", special: "glowwater" },
      // Regen Potion: 「获得{RegenPower}层再生」, REGEN_POWER 5 on the drink (states.jsonl PKB0 F17 T8); Regen heals
      // its amount at the end of our turn, before the enemy attacks, then drops by 1 (5+4+3+2+1 = 15 over five
      // turns). This turn's 5 is in the line's HP; the later heals are lasting value (turn-solver
      // REGEN_LATER_SHARE). Unmodelled, PKB0 F17 T4 read "its effect is in no line's numbers" at 15/80.
      REGEN_POTION: { target: "self", special: "regen", regen: 5 },
      // Distilled Chaos: 「打出你抽牌堆顶部的{Repeat}张牌」, 3 cards (YG3H F33 T7: the draw pile 21 -> 18 on the drink,
      // Strike + 2 Defend played). Each is the draw pile's expected card (expectedDraw), played for free at a
      // random enemy (turn-solver "chaos"). Unmodelled, YG3H carried it F1-F33 as "neutral: unclassified".
      DISTILLED_CHAOS: { target: "self", special: "chaos", playsTop: 3 },
      // Pile-card potions: a card from a pile into the hand (modelPotion builds it from PotionContext).
      // Liquid Memories: 「将你弃牌堆中的一张牌放入你的手牌。这张牌在本回合可以免费打出」 (PWSD: carried F2-F23 T4).
      // Droplet of Precognition: 「选择你抽牌堆中的一张牌加入你的手牌」 at its own cost (EGX7: carried F7-F31).
      LIQUID_MEMORIES: { target: "self" },
      DROPLET_OF_PRECOGNITION: { target: "self" },
      // Radiant Tincture: 「获得{Energy}。在你的下{RadiancePower}个回合开始时，额外获得1点能量。」 Energy 1,
      // RadiancePower 3 (potion-values.ts; states.jsonl Y3XT F48 T7: RADIANCE_POWER 3 on the drink, 2 the next
      // turn). One energy now; the three later ones are lasting value (turn-solver RADIANCE_LATER_ENERGY) and
      // the rollout's later turns' energy. Unmodelled, Y3XT's last boss never offered it T1-T3.
      RADIANT_TINCTURE: { target: "self", energyGain: 1, special: "radiance" },
      // Cure All: 「获得{Energy}。抽{Cards}张牌。」 Energy 1, draw 2 (potion-values.ts).
      CURE_ALL: { target: "self", energyGain: 1, draw: 2 },
      // Bottled Potential: 「将你的所有牌洗入你的抽牌堆。抽{Cards}张牌。」 the hand goes back into the pile (not
      // exhausted), then 5 cards (turn-solver "bottled"; priced like Glowwater's draw: expectedDraw).
      BOTTLED_POTENTIAL: { target: "self", special: "bottled" },
      // Blessing of the Forge: 「在本场战斗中升级你手牌中的所有牌。」 Every card in hand upgraded for the rest of the
      // fight: each hand card's logged upgrade numbers (upgradeDelta, knowledge/card-upgrades; modelPotion
      // takes them from PotionContext.upgrades), this turn's plays only (the upgraded cards' later draws are
      // not counted). Unmodelled, BXAZ offered it 7 times at 0.18-0.49 and QUG1/8V0H drank it at 0.39/0.13.
      BLESSING_OF_THE_FORGE: { target: "self", special: "forge" },
      // Soldier's Stew: 「在本场战斗中，所有名字中有“打击”的牌获得重放：1。」 Every Strike card is played once more
      // for the rest of the fight (turn-solver: this turn's Strikes; laterDamage: one more play of each Strike
      // in the draw and discard piles, lasting value). The hand then shows 「重放1。」 on each Strike (replayOf).
      // Unmodelled, QUG1 F23 T4 drank it at 0.08 on a turn with no Strike played.
      SOLDIERS_STEW: { target: "self", special: "stew" },
      // Card potions: drinking puts the card in hand (modelPotion builds it from GENERATED_CARD_POTIONS).
      ATTACK_POTION: { target: "self" },
      SKILL_POTION: { target: "self" },
      POWER_POTION: { target: "self" },
      COLORLESS_POTION: { target: "self" }
    };
    GENERATED_CARD_POTIONS = {
      ATTACK_POTION: { type: "Attack", target: "single", damage: 14 },
      SKILL_POTION: { type: "Skill", target: "self", block: 7 },
      POWER_POTION: { type: "Power", target: "self", flatValue: 12 },
      COLORLESS_POTION: { type: "Skill", target: "self", flatValue: 8 }
    };
    potionCardCostOptions = { relics: true };
    PILE_CARD_POTIONS = {
      LIQUID_MEMORIES: { pile: "discard", free: true },
      DROPLET_OF_PRECOGNITION: { pile: "draw", free: false }
    };
    PACTS_END_CARDS = 3;
    BULLY_PER_VULNERABLE = 2;
    FREE_CARD_MIN_COST = 2;
    CHOICE_POTIONS = {
      ATTACK_POTION: { pool: "character", types: ["Attack"], takeAll: false },
      SKILL_POTION: { pool: "character", types: ["Skill"], takeAll: false },
      POWER_POTION: { pool: "character", types: ["Power"], takeAll: false },
      COLORLESS_POTION: { pool: "colorless", types: ["Attack", "Skill", "Power"], takeAll: false },
      OROBIC_ACID: { pool: "character", types: ["Attack", "Skill", "Power"], takeAll: true }
    };
    DRAW_POTIONS = {
      SWIFT_POTION: { cards: 3 },
      CLARITY: { cards: 1 },
      CURE_ALL: { cards: 2 },
      SNECKO_OIL: { cards: 7 },
      GAMBLERS_BREW: { cards: 10 },
      GLOWWATER_POTION: { cards: 10 },
      DISTILLED_CHAOS: { cards: 3 },
      BOTTLED_POTENTIAL: { cards: 5 }
    };
  }
});

// src/knowledge/outcome-tables.ts
function hasAscensionTables(stats) {
  return isRecord2(stats.by_ascension);
}
function outcomeTables(stats) {
  if (!hasAscensionTables(stats)) return /* @__PURE__ */ new Map([[String(stats.ascension ?? "?"), stats]]);
  return new Map(Object.entries(stats.by_ascension ?? {}).map(([key, table2]) => [key, { generated: stats.generated, ...table2 }]));
}
function outcomeView(ascension, stats) {
  if (!hasAscensionTables(stats)) return { asc: null, table: stats, refs: [] };
  const tables = outcomeTables(stats);
  if (ascension === null || ascension === void 0 || !Number.isFinite(ascension) || ascension <= OUTCOME_BASE_ASC) {
    return { asc: null, table: tables.get(String(OUTCOME_BASE_ASC)) ?? { ascension: OUTCOME_BASE_ASC, generated: stats.generated }, refs: [] };
  }
  const table2 = tables.get(String(ascension)) ?? { ascension, generated: stats.generated, baseline: { runs: 0, boss_pass_by_act: {} } };
  const refs = [...tables.entries()].filter(([key]) => /^\d+$/.test(key) && Number(key) >= OUTCOME_BASE_ASC && Number(key) < ascension).sort((a, b) => Number(b[0]) - Number(a[0])).map(([, lower]) => lower);
  return { asc: ascension, table: table2, refs };
}
function rowThin(row) {
  return !row || !row.n || row.n < OUTCOME_MIN_N;
}
function pairThin(pair) {
  return rowThin(pair?.picked) || rowThin(pair?.offered_not_picked);
}
function pairHelps(own) {
  return (ref) => rowThin(own?.picked) && !rowThin(ref?.picked) || rowThin(own?.offered_not_picked) && !rowThin(ref?.offered_not_picked);
}
function referenceRow(refs, rowOf, helps) {
  for (const table2 of refs) {
    const row = rowOf(table2);
    if (row !== void 0 && helps(row)) return { table: table2, row };
  }
  return null;
}
function referenceNote(view, ref, text) {
  return `\uFF08A${view.asc ?? "?"} \u4E0D\u8DB3${OUTCOME_MIN_N}\u5C40\uFF0C\u53E6\u9644 A${ref.ascension ?? "?"}\uFF1A${text}\uFF09`;
}
var OUTCOME_BASE_ASC, OUTCOME_MIN_N, isRecord2;
var init_outcome_tables = __esm({
  "src/knowledge/outcome-tables.ts"() {
    "use strict";
    OUTCOME_BASE_ASC = 8;
    OUTCOME_MIN_N = 5;
    isRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  }
});

// src/knowledge/experience.ts
import { readFileSync as readFileSync4, statSync } from "node:fs";
function here(file) {
  return knowledgeFile(KNOWLEDGE_DIR, file);
}
function loadExperience() {
  if (experienceCache) return experienceCache;
  try {
    const parsed = JSON.parse(readFileSync4(here("experience.json"), "utf8"));
    experienceCache = Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    experienceCache = [];
  }
  return experienceCache;
}
function loadOutcomeStats() {
  if (statsOverride !== null) return statsOverride;
  const path = here("outcome-stats.json");
  let stamp = `${path}:missing`;
  try {
    const info = statSync(path);
    stamp = `${path}:${info.mtimeMs}:${info.size}`;
  } catch {
  }
  if (statsCache && statsStamp === stamp) return statsCache;
  try {
    statsCache = JSON.parse(readFileSync4(path, "utf8"));
  } catch {
    statsCache = {};
  }
  statsStamp = stamp;
  return statsCache;
}
function offeredOn(state, criteria = {}) {
  const offered = { cards: [], relics: [], potions: [], events: [], eventOptions: [], text: "" };
  const texts = [];
  const add = (list, id) => {
    if (id && !list.includes(id)) list.push(id);
  };
  const walk = (value, depth) => {
    if (depth > 6 || value === null || value === void 0) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (typeof value === "string") {
      if (value.length <= 60) texts.push(value);
      return;
    }
    if (typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const list = ID_KEYS[key];
      if (list && typeof child === "string") add(offered[list], child);
      else if (key === "text_key" && typeof child === "string") add(offered.eventOptions, child.split(".").at(-1) ?? "");
      else if (key === "title" || key === "name" || key === "description") walk(child, depth + 1);
      else if (typeof child === "object") walk(child, depth + 1);
    }
  };
  for (const section of SCREEN_SECTIONS) walk(state.raw[section], 0);
  for (const criterion of Object.values(criteria)) if (criterion) texts.push(criterion);
  offered.text = texts.join("\n");
  return offered;
}
function topicsFor(label, offered) {
  for (const [pattern, topics] of TOPICS) {
    if (!pattern.test(label)) continue;
    return offered?.events.some((id) => ANCIENT_EVENTS.has(id)) ? [...topics, "neow"] : topics;
  }
  return [];
}
function monsterMatch(scopeId, ids) {
  return !!ids && ids.some((id) => id === scopeId || id.startsWith(`${scopeId}_`));
}
function scopeParts(scope) {
  const at2 = scope.indexOf(":");
  return at2 < 0 ? [scope, ""] : [scope.slice(0, at2), scope.slice(at2 + 1)];
}
function relevance(entry, input) {
  if (entry.status !== "active") return null;
  const [lo, hi] = entry.asc ?? [0, 20];
  if (input.asc < lo || input.asc > hi) return null;
  const [kind, id] = scopeParts(entry.scope);
  const named = () => !!entry.name && entry.name.length >= 2 && input.offered.text.includes(entry.name);
  const boss = (input.bossId ?? "").toUpperCase().replace(/_BOSS$/, "");
  switch (kind) {
    case "card":
      return input.offered.cards.includes(id) ? 0 : null;
    case "relic":
      return input.offered.relics.includes(id) || input.offered.eventOptions.includes(id) || named() ? 0 : null;
    case "potion":
      return input.offered.potions.includes(id) || named() ? 0 : null;
    case "event":
      return input.offered.events.includes(id) ? 0 : null;
    case "boss":
      if (bossOnBoard(id, input.enemies)) return 0;
      return boss && id === boss ? input.enemies && input.enemies.length > 0 ? 0 : 1 : null;
    case "elite":
    case "hallway":
      if (monsterMatch(id, input.enemies)) return 0;
      if (!monsterMatch(id, input.threats)) return null;
      return ROUTE_LABELS.test(input.label) ? 2 : 4;
    case "act":
      return Number(id) === input.act ? 4 : null;
    case "general":
      return topicsFor(input.label, input.offered).includes(id) ? 3 : null;
    default:
      return null;
  }
}
function selectLessons(input, entries = loadExperience(), max = MAX_LESSONS) {
  const ranked = entries.map((entry) => ({ entry, tier: relevance(entry, input) })).filter((item) => item.tier !== null).sort(
    (a, b) => a.tier - b.tier || CONFIDENCE_RANK[a.entry.confidence] - CONFIDENCE_RANK[b.entry.confidence] || b.entry.n_support - a.entry.n_support || a.entry.n_contradict - b.entry.n_contradict || a.entry.id.localeCompare(b.entry.id)
  );
  const core = ranked.filter((item) => item.tier <= 1).slice(0, HARD_MAX_LESSONS);
  const rest = ranked.filter((item) => item.tier > 1).slice(0, Math.max(0, max - core.length));
  return [...core, ...rest].map((item) => item.entry);
}
function lessonText(entry, ascension) {
  return entry.lesson.includes("{") ? fillGuideFacts(entry.lesson, ascension) : entry.lesson;
}
var experienceCache, statsCache, statsStamp, statsOverride, SCREEN_SECTIONS, ID_KEYS, TOPICS, ANCIENT_EVENTS, ROUTE_LABELS, MAX_LESSONS, HARD_MAX_LESSONS, CONFIDENCE_RANK;
var init_experience = __esm({
  "src/knowledge/experience.ts"() {
    "use strict";
    init_boss_clock();
    init_json();
    init_monster_db();
    init_outcome_tables();
    init_data_version();
    init_files();
    experienceCache = null;
    statsCache = null;
    statsStamp = null;
    statsOverride = null;
    SCREEN_SECTIONS = ["reward", "shop", "event", "chest", "selection", "bundles", "capstone", "crystal_sphere", "rest"];
    ID_KEYS = {
      card_id: "cards",
      relic_id: "relics",
      potion_id: "potions",
      event_id: "events"
    };
    TOPICS = [
      [/^run-plan/, ["plan", "route", "deck", "elite", "rest", "shop", "potion"]],
      [/^fight-plan/, ["plan", "potion"]],
      [/^(map\/)?route|^map\//, ["route", "elite", "rest"]],
      [/^reward\//, ["deck"]],
      [/^shop\//, ["shop", "deck", "potion"]],
      // One-shot questions (BUILD_ONESHOT) also pick the deck card(s) their follow-up takes.
      [/^rest\/plan/, ["rest", "deck"]],
      [/^rest\//, ["rest"]],
      [/^selection\/upgrade/, ["rest", "deck"]],
      [/^selection\//, ["deck"]],
      [/^event\/plan/, ["event", "deck"]],
      // The act-start Ancient with the act's route (BUILD_ONESHOT): the route's topics too.
      [/^event\/act-plan/, ["event", "deck", "route", "elite", "rest"]],
      [/^event\//, ["event"]],
      [/^(chest|bundle|capstone)\//, ["deck"]],
      [/^combat\//, ["potion"]]
    ];
    ANCIENT_EVENTS = /* @__PURE__ */ new Set(["NEOW", "PAEL", "TEZCATARA", "VAKUU", "TANX", "NONUPEIPE"]);
    ROUTE_LABELS = /^(run-plan|map\/|route|rest\/|event\/act-plan)/;
    MAX_LESSONS = 25;
    HARD_MAX_LESSONS = 40;
    CONFIDENCE_RANK = { high: 0, med: 1, low: 2 };
  }
});

// src/knowledge/boss-phase.ts
var init_boss_phase = __esm({
  "src/knowledge/boss-phase.ts"() {
    "use strict";
    init_json();
  }
});

// src/knowledge/room-costs.ts
import { readFileSync as readFileSync5 } from "node:fs";
function load4() {
  if (cached3) return cached3;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "room-costs.json");
    cached3 = JSON.parse(readFileSync5(path, "utf8")).by_asc ?? {};
  } catch {
    cached3 = {};
  }
  return cached3;
}
function measuredRoomExact(asc, act, room) {
  return load4()[String(asc)]?.[String(act)]?.[room] ?? null;
}
var cached3;
var init_room_costs = __esm({
  "src/knowledge/room-costs.ts"() {
    "use strict";
    init_data_version();
    init_files();
    cached3 = null;
  }
});

// src/hand/screens/card-value.ts
var init_card_value = __esm({
  "src/hand/screens/card-value.ts"() {
    "use strict";
    init_boss_clock();
    init_files();
  }
});

// src/reflex/passive-pieces.ts
function solverFieldsOf(pieces, counts = {}) {
  if (!pieces) return {};
  return {
    ...pieces.orichalcum ? { orichalcum: pieces.orichalcum, orichalcumPlating: true } : {},
    ...pieces.rippleBasin ? { rippleBasin: pieces.rippleBasin } : {},
    ...pieces.letterOpener ? { letterOpener: { ...pieces.letterOpener, count: counts.letterOpener ?? 0 } } : {},
    ...pieces.ornamentalFan ? { ornamentalFan: { ...pieces.ornamentalFan, count: counts.ornamentalFan ?? 0 } } : {},
    ...pieces.parryingShield ? { parryingShield: { ...pieces.parryingShield } } : {}
  };
}
function liveSolverFields(runRaw, cardsPlayedThisTurn, attacksPlayedThisTurn = 0, enabled = passivePiecesOptions.enabled) {
  const relics = asArray(asRecord(runRaw)["relics"]).map(asRecord);
  const found = solverPiecesOf(relics.map((relic) => str(relic["relic_id"])), enabled);
  const fork = relics.find((relic) => str(relic["relic_id"]) === "TUNING_FORK");
  const tuning = enabled && str(asRecord(runRaw)["character_id"]).toLowerCase() === "silent" && fork ? { tuningFork: { every: 10, block: 7, count: num(fork["stack"]) % 10 } } : {};
  if (!found) return tuning;
  const { rippleBasin: _basin, ...rest } = found;
  const pieces = attacksPlayedThisTurn > 0 ? rest : found;
  const counter = (id, every) => {
    if (cardsPlayedThisTurn <= 0 || every <= 0) return 0;
    return num(relics.find((relic) => str(relic["relic_id"]) === id)?.["stack"]) % every;
  };
  return { ...tuning, ...solverFieldsOf(pieces, {
    ...pieces.letterOpener ? { letterOpener: counter("LETTER_OPENER", pieces.letterOpener.every) } : {},
    ...pieces.ornamentalFan ? { ornamentalFan: counter("ORNAMENTAL_FAN", pieces.ornamentalFan.every) } : {}
  }) };
}
function solverPiecesOf(relicIds, enabled = passivePiecesOptions.enabled) {
  if (!enabled) return null;
  const out = {};
  if (relicIds.includes("ORICHALCUM")) out.orichalcum = ORICHALCUM_BLOCK;
  if (relicIds.includes("RIPPLE_BASIN")) out.rippleBasin = RIPPLE_BASIN_BLOCK;
  if (relicIds.includes("LETTER_OPENER")) out.letterOpener = { ...LETTER_OPENER };
  if (relicIds.includes("ORNAMENTAL_FAN")) out.ornamentalFan = { ...ORNAMENTAL_FAN };
  if (relicIds.includes("PARRYING_SHIELD")) out.parryingShield = { ...PARRYING_SHIELD };
  return Object.keys(out).length > 0 ? out : null;
}
function clockRelicPieces(relicIds) {
  const damage = [];
  const block = [];
  const has2 = (id) => relicIds.includes(id);
  if (has2("MERCURY_HOURGLASS")) damage.push({ name: `Mercury Hourglass ${MERCURY_HOURGLASS_DAMAGE} to all`, amount: MERCURY_HOURGLASS_DAMAGE, from: 1, aoe: true });
  if (has2("BRONZE_SCALES")) damage.push({ name: `Bronze Scales Thorns ${BRONZE_SCALES_THORNS} a boss hit`, amount: BRONZE_SCALES_THORNS, from: 1, perHit: true });
  if (has2("LETTER_OPENER")) {
    const amount = LETTER_OPENER.damage * CLOCK_FIRE_RATE.letterOpener;
    damage.push({ name: `Letter Opener ${LETTER_OPENER.damage} to all every 3rd Skill (~${amount.toFixed(1)}/turn)`, amount, from: 1, aoe: true });
  }
  if (has2("PARRYING_SHIELD")) {
    const amount = PARRYING_SHIELD.damage * CLOCK_FIRE_RATE.parryingShield;
    damage.push({ name: `Parrying Shield ${PARRYING_SHIELD.damage} at 10+ block (~${amount.toFixed(1)}/turn)`, amount, from: 1 });
  }
  if (has2("SAI")) block.push({ name: `Sai ${SAI_BLOCK}`, amount: SAI_BLOCK * relicIds.filter((id) => id === "SAI").length, from: 1 });
  if (has2("GORGET")) block.push({ name: `Gorget Plating ${GORGET_PLATING}`, amount: GORGET_PLATING, from: 1, decays: true });
  if (has2("ANCHOR")) block.push({ name: `Anchor ${ANCHOR_BLOCK} on T1`, amount: ANCHOR_BLOCK, from: 1, only: true });
  if (has2("HORN_CLEAT")) block.push({ name: `Horn Cleat ${HORN_CLEAT_BLOCK} on T${HORN_CLEAT_TURN}`, amount: HORN_CLEAT_BLOCK, from: HORN_CLEAT_TURN, only: true });
  if (has2("CAPTAINS_WHEEL")) block.push({ name: `Captain's Wheel ${CAPTAINS_WHEEL_BLOCK} on T${CAPTAINS_WHEEL_TURN}`, amount: CAPTAINS_WHEEL_BLOCK, from: CAPTAINS_WHEEL_TURN, only: true });
  if (has2("ORICHALCUM")) block.push({ name: `Orichalcum ${ORICHALCUM_BLOCK} at no block (~${(ORICHALCUM_BLOCK * CLOCK_FIRE_RATE.orichalcumAttacked).toFixed(1)}/turn)`, amount: ORICHALCUM_BLOCK * CLOCK_FIRE_RATE.orichalcumAttacked, from: 1, attacked: true });
  if (has2("ORNAMENTAL_FAN")) block.push({ name: `Ornamental Fan ${ORNAMENTAL_FAN.block} every 3rd Attack (~${(ORNAMENTAL_FAN.block * CLOCK_FIRE_RATE.ornamentalFan).toFixed(1)}/turn)`, amount: ORNAMENTAL_FAN.block * CLOCK_FIRE_RATE.ornamentalFan, from: 1 });
  if (has2("RIPPLE_BASIN")) block.push({ name: `Ripple Basin ${RIPPLE_BASIN_BLOCK} with no Attack (~${(RIPPLE_BASIN_BLOCK * CLOCK_FIRE_RATE.rippleBasin).toFixed(1)}/turn)`, amount: RIPPLE_BASIN_BLOCK * CLOCK_FIRE_RATE.rippleBasin, from: 1 });
  return { damage, block };
}
function clockBlockAt(piece, turn) {
  if (turn < piece.from) return 0;
  if (piece.only) return turn === piece.from ? piece.amount : 0;
  if (piece.decays) return Math.max(0, piece.amount - (turn - piece.from));
  return piece.amount;
}
var passivePiecesOptions, SAI_BLOCK, MERCURY_HOURGLASS_DAMAGE, BRONZE_SCALES_THORNS, GORGET_PLATING, ANCHOR_BLOCK, ORICHALCUM_BLOCK, RIPPLE_BASIN_BLOCK, HORN_CLEAT_BLOCK, HORN_CLEAT_TURN, CAPTAINS_WHEEL_BLOCK, CAPTAINS_WHEEL_TURN, LETTER_OPENER, ORNAMENTAL_FAN, PARRYING_SHIELD, PASSIVE_SIM_RELICS, CLOCK_FIRE_RATE, CLOCK_PASSIVE_BLOCK_SHARE;
var init_passive_pieces = __esm({
  "src/reflex/passive-pieces.ts"() {
    "use strict";
    init_json();
    passivePiecesOptions = { enabled: process.env["PASSIVE_PIECES"] !== "off" };
    SAI_BLOCK = 7;
    MERCURY_HOURGLASS_DAMAGE = 3;
    BRONZE_SCALES_THORNS = 3;
    GORGET_PLATING = 4;
    ANCHOR_BLOCK = 10;
    ORICHALCUM_BLOCK = 6;
    RIPPLE_BASIN_BLOCK = 4;
    HORN_CLEAT_BLOCK = 14;
    HORN_CLEAT_TURN = 2;
    CAPTAINS_WHEEL_BLOCK = 18;
    CAPTAINS_WHEEL_TURN = 3;
    LETTER_OPENER = { every: 3, damage: 5 };
    ORNAMENTAL_FAN = { every: 3, block: 4 };
    PARRYING_SHIELD = { block: 10, damage: 6 };
    PASSIVE_SIM_RELICS = ["ORICHALCUM", "RIPPLE_BASIN", "LETTER_OPENER", "ORNAMENTAL_FAN", "PARRYING_SHIELD"];
    CLOCK_FIRE_RATE = { parryingShield: 48 / 130, orichalcumAttacked: 22 / 81, ornamentalFan: 31 / 113, rippleBasin: 15 / 135, letterOpener: 4 / 110 };
    CLOCK_PASSIVE_BLOCK_SHARE = 0.5;
  }
});

// src/sim/route-projection.ts
function baseRestHeal(maxHp) {
  return Math.floor(maxHp * 3 / 10);
}
function bossStartHealOf(relicIds) {
  return relicIds.reduce((sum, id) => sum + (BOSS_START_HEAL[id] ?? 0), 0);
}
function bossEntryHp(hp, max, bossStartHeal) {
  return hp > 0 && bossStartHeal > 0 ? Math.min(max, hp + bossStartHeal) : hp;
}
function restHealOf(relicIds, deckSize = 0) {
  const out = { bonus: 0, maxGain: 0, sources: [] };
  for (const id of relicIds) {
    const relic = REST_RELICS[id];
    if (!relic) continue;
    out.bonus += relic.heal ?? 0;
    out.maxGain += relic.maxHp ?? 0;
    out.sources.push(`${relic.name} ${relic.heal ? `+${relic.heal} HP` : `+${relic.maxHp} max HP`}`);
  }
  if (relicIds.includes("ETERNAL_FEATHER") && deckSize > 0) {
    const enter = ETERNAL_FEATHER_HEAL.heal * Math.floor(deckSize / ETERNAL_FEATHER_HEAL.cards);
    if (enter > 0) {
      out.enterHeal = enter;
      out.sources.push(`Eternal Feather +${enter} HP on entering (${deckSize} cards)`);
    }
  }
  return out;
}
function restedHp(hp, max, rest = NO_REST_RELICS, base = baseRestHeal(max)) {
  return { hp: Math.min(max, hp + (rest.enterHeal ?? 0) + base + rest.bonus) + rest.maxGain, max: max + rest.maxGain };
}
var REST_RELICS, ETERNAL_FEATHER_HEAL, NO_REST_RELICS, BOSS_START_HEAL;
var init_route_projection = __esm({
  "src/sim/route-projection.ts"() {
    "use strict";
    init_monster_db();
    init_room_costs();
    REST_RELICS = {
      REGAL_PILLOW: { heal: 15, name: "Regal Pillow" },
      STONE_HUMIDIFIER: { maxHp: 5, name: "Stone Humidifier" }
    };
    ETERNAL_FEATHER_HEAL = { cards: 5, heal: 3 };
    NO_REST_RELICS = { bonus: 0, maxGain: 0, sources: [] };
    BOSS_START_HEAL = { PANTOGRAPH: 25 };
  }
});

// src/sim/boss-clock.ts
import { readFileSync as readFileSync6 } from "node:fs";
function bossProfile(bossId) {
  const upper = bossId.toUpperCase();
  const key = Object.keys(BOSSES).find((id) => upper.includes(id));
  return key ? { ...BOSSES[key], id: key } : null;
}
function unblockedShare(bossKey2) {
  if (!unblockedCache) {
    try {
      unblockedCache = JSON.parse(readFileSync6(knowledgeFile(KNOWLEDGE_DIR, "boss-damage.json"), "utf8"));
    } catch {
      unblockedCache = {};
    }
  }
  return unblockedCache[bossKey2] ?? null;
}
function bossLossPerTurn(profile, ascension, turnBlock = 0, character2 = knowledgeCharacter()) {
  const damage = bossDamageByTurn(profile.id, ascension, profile.scriptTurns);
  const share = character2 === knowledgeCharacter() ? unblockedShare(profile.id) : null;
  const blockAt = (t) => typeof turnBlock === "number" ? turnBlock : (turnBlock.byTurn[t] ?? turnBlock.byTurn[turnBlock.byTurn.length - 1] ?? 0) * (turnBlock.share ?? 1);
  const turns = damage && damage.perTurn.length > 0 ? damage.perTurn.length : profile.scriptTurns;
  const meanBlock = typeof turnBlock === "number" ? turnBlock : Array.from({ length: Math.max(1, turns) }, (_, t) => blockAt(t)).reduce((sum, b) => sum + b, 0) / Math.max(1, turns);
  const less = typeof turnBlock === "number" ? turnBlock > 0 ? ` less ${turnBlock} block a turn from Sai` : "" : meanBlock > 0 ? ` less ~${Math.round(meanBlock * 10) / 10} a turn of passive block${(turnBlock.share ?? 1) !== 1 ? ` (counted at ${Math.round((turnBlock.share ?? 1) * 100)}%: the logged share has the average fight's in it)` : ""} (${turnBlock.names.join(", ")}; not cut by Frail)` : "";
  if (!damage || !share || damage.perTurn.length === 0) {
    if (character2 !== DEFAULT_CHARACTER) return { value: null, source: `\u5C1A\u65E0 ${character2} \u7684 boss \u6389\u8840\u7EDF\u8BA1`, estimated: false };
    const value2 = typeof turnBlock === "number" ? Math.max(0, profile.lossPerTurn - turnBlock) : Math.max(0, Math.round((profile.lossPerTurn - meanBlock) * 10) / 10);
    return { value: value2, source: `logged A8 HP loss a turn (no DB damage)${less}`, estimated: false };
  }
  const mean = damage.perTurn.reduce((sum, value2) => sum + value2, 0) / damage.perTurn.length;
  const value = meanBlock > 0 ? Math.round(damage.perTurn.reduce((sum, hit, t) => sum + Math.max(0, hit * share.unblocked_share - blockAt(t)), 0) / damage.perTurn.length * 10) / 10 : Math.round(mean * share.unblocked_share * 10) / 10;
  return {
    value,
    source: `its attack ~${Math.round(mean)}/turn at A${ascension}${damage.estimated ? " (moves unseen at this ascension: the nearest logged one's, scaled by the measured ratio up to the highest logged ascension; estimated)" : ""} x ${Math.round(share.unblocked_share * 100)}% unblocked (${share.fights} logged fights)${less}`,
    estimated: damage.estimated
  };
}
function bossHp(profile, ascension) {
  if (profile.id === "TEST_SUBJECT") return testSubjectPhases(ascension).reduce((sum, hp) => sum + hp, 0);
  const db = profile.id ? bossHpAt(profile.id, ascension, profile.hpParts) : null;
  if (db) return db.hp + (profile.addedHp ?? 0);
  return ascension >= 8 ? profile.hpA8 : profile.hp;
}
function bossHpParts(profile, ascension) {
  const db = profile.id && profile.id !== "TEST_SUBJECT" ? bossHpAt(profile.id, ascension, profile.hpParts) : null;
  if (!db) return { body: bossHp(profile, ascension), added: 0 };
  return { body: db.hp, added: profile.addedHp ?? 0 };
}
function bossHpSource(profile, ascension) {
  const db = profile.id ? bossHpAt(profile.id, ascension, profile.hpParts) : null;
  if (!db) return ascension >= 8 ? "(A8, hand-set)" : "(hand-set)";
  return db.exact ? `(A${db.asc})` : `(A${ascension} not logged: A${db.asc}'s)`;
}
function bossNote(profile, ascension) {
  if (knowledgeCharacter() !== DEFAULT_CHARACTER) return "";
  const part = (id) => profile.id ? bossHpAt(profile.id, ascension, [id])?.hp : void 0;
  const follower = part("KIN_FOLLOWER");
  const giant = giantNumbers(ascension);
  const beam = kinBeamT11(ascension);
  return fillDbNumbers(
    profile.note.replace("{KIN_PRIEST}", String(part("KIN_PRIEST") ?? (ascension >= 8 ? 199 : 190))).replace("{KIN_FOLLOWER}", String(follower !== void 0 ? Math.round(follower / 2) : ascension >= 8 ? 62 : 59)).replace("{KIN_BEAM_T11}", beam === null ? "?" : String(beam)).replace("{PHASES}", testSubjectPhases(ascension).join("/")).replace("{SIPHON}", `${giant.siphon} HP`).replace("{GUN}", giant.gun.join("/")).replace("{CRAB_KILLS}", () => crabKillRecord("en", ascension)),
    ascension
  ).replace(/\{(?:QUEEN_AMALGAM|SANDPIT_DEATHS)_EN\}/g, (placeholder) => fillGuideFacts(placeholder, ascension));
}
function bossMechanic(profile, ascension) {
  if (knowledgeCharacter() !== DEFAULT_CHARACTER) return "";
  return fillDbNumbers(
    profile.mechanic.replace("{ERUPTION}", eruptionFormula(ascension)).replace("{GIANT_KILLS}", giantKillRecord(ascension, "en")).replace("{GIANT_BLOCK}", giantBlockRecord("en", ascension)),
    ascension
  );
}
function giantBlockRecord(lang, ascension) {
  const kills = unblockedShare("WATERFALL_GIANT")?.kills ?? {};
  const band = recordBand(ascension);
  return band ? giantBlockBandText(kills, lang, band) : giantBlockText([...kills["8"] ?? [], ...kills["9"] ?? []], lang);
}
function giantBlockBuckets(rows) {
  const killed = rows.filter((row) => row.turn !== null && row.hp != null && row.stacks != null);
  const bucket = (test) => {
    const list = killed.filter((row) => test(row.stacks - row.hp));
    return { won: list.filter((row) => row.won).length, n: list.length };
  };
  return { killed: killed.length, low: bucket((need) => need <= 13), mid: bucket((need) => need > 13 && need < 20), high: bucket((need) => need >= 20) };
}
function giantBlockText(rows, lang) {
  const { killed, low, mid, high } = giantBlockBuckets(rows);
  if (killed === 0) return lang === "zh" ? "A8/A9 \u6CA1\u6709\u8BB0\u4E0B\u51FB\u6740\u65F6 HP \u7684\u5DE8\u517D\u5BF9\u5C40" : "no logged A8/A9 Giant kill with the HP at the kill";
  if (lang === "zh") {
    const parts2 = [`\u226413 \u7684 ${low.n} \u573A\u8D62 ${low.won}`, ...mid.n > 0 ? [`14\u201319 \u7684 ${mid.n} \u573A\u8D62 ${mid.won}`] : [], `\u226520 \u7684 ${high.n} \u573A\u8D62 ${high.won}`];
    return `A8/A9 \u6709\u51FB\u6740\u7684 ${killed} \u573A\uFF1A\u6240\u9700\u683C\u6321\uFF08\u5C42\u6570 \u2212 HP\uFF09${parts2.join("\uFF0C")}`;
  }
  const parts = [`13 or less ${low.won}/${low.n} won`, ...mid.n > 0 ? [`14-19 ${mid.won}/${mid.n}`] : [], `20 or more ${high.won}/${high.n}`];
  return `A8/A9 kills (${killed}): block needed (stacks - HP) ${parts.join(", ")}`;
}
function giantBlockBandText(kills, lang, band) {
  const zh = lang === "zh";
  const rows = band.map((asc) => {
    const { killed, low, mid, high } = giantBlockBuckets(kills[String(asc)] ?? []);
    if (killed === 0) return zh ? `A${asc} \u6CA1\u6709\u8BB0\u4E0B\u51FB\u6740\u65F6 HP \u7684\u5BF9\u5C40` : `A${asc} none logged`;
    if (zh) return `A${asc} ${killed} \u573A\u4E2D ${[`\u226413 \u7684 ${low.n} \u573A\u8D62 ${low.won}`, ...mid.n > 0 ? [`14\u201319 \u7684 ${mid.n} \u573A\u8D62 ${mid.won}`] : [], `\u226520 \u7684 ${high.n} \u573A\u8D62 ${high.won}`].join("\uFF0C")}`;
    return `A${asc} (${killed}) ${[`13 or less ${low.won}/${low.n} won`, ...mid.n > 0 ? [`14-19 ${mid.won}/${mid.n}`] : [], `20 or more ${high.won}/${high.n}`].join(", ")}`;
  });
  return zh ? `\u6709\u51FB\u6740\u7684\u5DE8\u517D\u6218\u6309\u6240\u9700\u683C\u6321\uFF08\u5C42\u6570 \u2212 HP\uFF09\u5206\uFF1A${rows.join("\uFF1B")}` : `Giant kills by block needed (stacks - HP): ${rows.join("; ")}`;
}
function factsAtAscension(text, ascension) {
  if (recordBand(ascension) === null || !text.includes("{")) return text;
  const marked = text.replace(BAND_TOKEN, (_, name) => `{@${ascension}:${name}}`);
  if ((ascension ?? 0) <= OUTCOME_BASE_ASC || !marked.includes("{CARD_OUTCOME:") || !hasAscensionTables(loadOutcomeStats())) return marked;
  return marked.replace(CARD_OUTCOME, (_, card) => `{@${ascension}:CARD_OUTCOME:${card}}`);
}
function fillGuideFacts(text, ascension) {
  let out = factsAtAscension(text, ascension);
  out = out.replace(BAND_MARKED, (marked, asc, name) => Object.hasOwn(BAND_FACTS, name) ? BAND_FACTS[name](Number(asc)) : marked);
  for (const [placeholder, fill] of Object.entries(GUIDE_FACTS)) if (out.includes(placeholder)) out = out.split(placeholder).join(fill());
  out = out.replace(/\{UNKNOWN_FIGHTS:(\d+):(\d)\}/g, (_, asc, act) => unknownFightsText([Number(asc)], [Number(act)]));
  out = out.replace(/\{BOSS_LOSS:([A-Z_]+):(\d+)\}/g, (_, boss, asc) => bossLossText(boss, Number(asc)));
  out = out.replace(/\{BOSS_RECORD:([A-Z_]+)\}/g, (_, boss) => bossRecord(boss));
  out = out.replace(CARD_OUTCOME, (_, card) => cardOutcomeText(card));
  out = out.replace(CARD_OUTCOME_MARKED, (_, asc, card) => cardOutcomeText(card, void 0, Number(asc)));
  return out.replace(/\{@(\d+):([A-Z]+:[A-Z0-9_:]+)\}/g, (_, asc, inner) => fillDbNumbers(`{${inner}}`, Number(asc)));
}
function cardOutcomeText(cardId, stats = loadOutcomeStats(), ascension) {
  const view = outcomeView(ascension, stats);
  const actsOf = (table2) => table2.cards?.[cardId]?.by_act ?? {};
  const pct3 = (value) => value == null ? "?" : `${Math.round(value * 100)}%`;
  const both = (pair) => Boolean(pair?.picked?.n && pair?.offered_not_picked?.n);
  const line = (act, pair) => `${act === "1" ? "\u4E00" : "\u4E8C"}\u5E55\u62FF\u4E86 ${pair?.picked?.n} \u5C40\u8FC7 boss ${pct3(pair?.picked?.boss_pass)}\u3001\u7ED9\u4E86\u6CA1\u62FF ${pair?.offered_not_picked?.n} \u5C40 ${pct3(pair?.offered_not_picked?.boss_pass)}`;
  const acts = ["1", "2"].flatMap((act) => {
    const own = actsOf(view.table)[act];
    const ref = view.refs.length > 0 && pairThin(own) ? referenceRow(view.refs, (table2) => actsOf(table2)[act], (ref2) => both(ref2) && pairHelps(own)(ref2)) : null;
    if (!both(own) && !ref) return [];
    const head = both(own) ? line(act, own) : `${act === "1" ? "\u4E00" : "\u4E8C"}\u5E55${FEW_RECORDS}`;
    return [`${head}${ref ? referenceNote(view, ref.table, line(act, ref.row)) : ""}`];
  });
  return acts.length > 0 ? `A${view.table.ascension ?? "?"} ${acts.join("\uFF1B")}` : FEW_RECORDS;
}
function recordBand(ascension) {
  if (ascension === void 0 || !Number.isFinite(ascension) || ascension < RECORD_BAND_FROM) return null;
  return [.../* @__PURE__ */ new Set([...RECORD_ASCENSIONS, ascension])].sort((a, b) => a - b);
}
function bossRecord(bossKey2, byAsc = unblockedShare(bossKey2)?.by_asc ?? {}) {
  return RECORD_ASCENSIONS.map((asc) => {
    const cell = byAsc[String(asc)];
    return cell && cell.fights > 0 ? `A${asc} ${cell.fights} \u573A\u8D62 ${cell.won}` : `A${asc} \u8FD8\u6CA1\u6709\u8BB0\u5F55`;
  }).join("\u3001");
}
function crabKillRecord(lang, ascension) {
  return crabKillText(unblockedShare("KAISER_CRAB")?.first_death ?? {}, lang, recordBand(ascension));
}
function crabFirst(rows, first) {
  const list = rows.filter((row) => row.first === first);
  return { n: list.length, won: list.filter((row) => row.won).length };
}
function crabKillText(byAsc, lang, band = null) {
  if (band) return crabKillBandText(byAsc, lang, band);
  const all = Object.values(byAsc).flat();
  if (all.length === 0) return lang === "zh" ? "\u6CA1\u6709\u8783\u87F9\u6218\u8BB0\u5F55" : "no logged crab fights";
  const rocket = crabFirst(all, "ROCKET");
  const crusher = crabFirst(all, "CRUSHER");
  const neither = crabFirst(all, null);
  if (lang === "en") {
    return `${all.length} logged crab fights: Rocket died first ${rocket.won}/${rocket.n} won, Crusher first ${crusher.won}/${crusher.n}, neither died first ${neither.won}/${neither.n}`;
  }
  const perAsc = RECORD_ASCENSIONS.map((asc) => {
    const rows = byAsc[String(asc)] ?? [];
    const first = crabFirst(rows, "ROCKET");
    const rest = { n: rows.length - first.n, won: rows.filter((row) => row.won).length - first.won };
    return rows.length > 0 ? `A${asc} \u706B\u7BAD\u5148\u6B7B ${first.won}/${first.n}\u3001\u5176\u4F59 ${rest.won}/${rest.n}` : null;
  }).filter(Boolean);
  return `\u6709\u8BB0\u5F55\u7684 ${all.length} \u573A\u8783\u87F9\u6218\uFF1A\u706B\u7BAD\u5148\u6B7B ${rocket.n} \u573A\u8D62 ${rocket.won}\uFF0C\u78BE\u788E\u722A\u5148\u6B7B ${crusher.n} \u573A\u8D62 ${crusher.won}\uFF0C\u6CA1\u6709\u54EA\u53EA\u5148\u6B7B\uFF08\u540C\u56DE\u5408\u4E00\u8D77\u6B7B\u6216\u6211\u65B9\u5148\u6B7B\uFF09${neither.n} \u573A\u8D62 ${neither.won}${perAsc.length > 0 ? `\uFF08${perAsc.join("\uFF1B")}\uFF09` : ""}`;
}
function crabKillBandText(byAsc, lang, band) {
  const zh = lang === "zh";
  const rows = band.map((asc) => {
    const list = byAsc[String(asc)] ?? [];
    if (list.length === 0) return zh ? `A${asc} \u8FD8\u6CA1\u6709\u8BB0\u5F55` : `A${asc} none`;
    const won = list.filter((row) => row.won).length;
    const [rocket, crusher, neither] = [crabFirst(list, "ROCKET"), crabFirst(list, "CRUSHER"), crabFirst(list, null)];
    if (zh) return `A${asc} ${list.length} \u573A\u8D62 ${won}\uFF0C\u706B\u7BAD\u5148\u6B7B ${rocket.n} \u573A\u8D62 ${rocket.won}\u3001\u78BE\u788E\u722A\u5148\u6B7B ${crusher.n} \u573A\u8D62 ${crusher.won}\u3001\u6CA1\u6709\u54EA\u53EA\u5148\u6B7B ${neither.n} \u573A\u8D62 ${neither.won}`;
    return `A${asc} ${list.length} (${won} won): Rocket died first ${rocket.won}/${rocket.n} won, Crusher first ${crusher.won}/${crusher.n}, neither died first ${neither.won}/${neither.n}`;
  });
  return zh ? `\u6709\u8BB0\u5F55\u7684\u8783\u87F9\u6218 ${rows.join("\uFF1B")}\uFF08\u6CA1\u6709\u54EA\u53EA\u5148\u6B7B = \u540C\u56DE\u5408\u4E00\u8D77\u6B7B\u6216\u6211\u65B9\u5148\u6B7B\uFF09` : `logged crab fights ${rows.join("; ")}`;
}
function crabKillShort(byAsc = unblockedShare("KAISER_CRAB")?.first_death ?? {}, band = null) {
  const short = (rows) => {
    const rocket = rows.filter((row) => row.first === "ROCKET");
    const rest = rows.filter((row) => row.first !== "ROCKET");
    return `Rocket died first ${rocket.filter((row) => row.won).length}/${rocket.length} won, otherwise ${rest.filter((row) => row.won).length}/${rest.length}`;
  };
  if (!band) return short(Object.values(byAsc).flat());
  return band.map((asc) => (byAsc[String(asc)] ?? []).length > 0 ? `A${asc} ${short(byAsc[String(asc)])}` : `A${asc} no logged fights`).join("; ");
}
function lagSleepRecord(lang, ascension) {
  return lagSleepText(unblockedShare("LAGAVULIN_MATRIARCH")?.sleep ?? {}, lang, recordBand(ascension));
}
function lagSleepText(byAsc, lang, band = null) {
  const won = (rows) => `${rows.filter((row) => row.won).length}/${rows.length}`;
  const at2 = (asc) => byAsc[String(asc)] ?? [];
  const noStrength = (rows) => rows.filter((row) => row.strength.length === 0);
  if (lang === "en") {
    return `decks without a lasting-Strength card won ${RECORD_ASCENSIONS.map((asc) => `A${asc} ${won(noStrength(at2(asc)))}`).join(", ")}`;
  }
  const strength = (asc) => {
    const rows = at2(asc);
    const without = noStrength(rows);
    const waited = without.filter((row) => !row.won && (row.woke_turn ?? 0) >= 3).map((row) => row.run ?? "?");
    const note = waited.length > 0 && waited.length <= 3 ? `\uFF08\u8F93\u7684 ${waited.join("\u3001")} \u90FD\u7B49\u5B83\u81EA\u7136\u9192\uFF0C\u524D\u4E24\u56DE\u5408\u6CA1\u6709\u4F24\u5BB3\u8FDB\u5B83\uFF09` : "";
    return `A${asc} \u6709\u6301\u7EED\u529B\u91CF\u724C ${won(rows.filter((row) => row.strength.length > 0))} \u8D62\u3001\u6CA1\u6709 ${won(without)} \u8D62${note}`;
  };
  const wake2 = (rows, sep) => {
    const early = rows.filter((row) => row.woke_turn !== null && row.woke_turn <= 2 && row.woke_pct !== null);
    const burst = early.filter((row) => row.woke_pct >= LAG_BURST_PCT);
    const chip = early.filter((row) => row.woke_pct < LAG_BURST_PCT);
    const burstRuns = burst.length > 0 && burst.length <= 3 ? `\uFF08${burst.map((row) => `${row.run ?? "?"} ${row.woke_pct}%`).join("\u3001")}\uFF09` : "";
    return `T1\u2013T2 \u4E00\u6B21\u6253\u6389 \u2265${LAG_BURST_PCT}% \u6253\u9192\u7684 ${burst.length} \u573A\u8D62 ${burst.filter((row) => row.won).length}${burstRuns}${sep}\u5C0F\u4F24\u5BB3\u6253\u9192\u7684 ${chip.length} \u573A\u8D62 ${chip.filter((row) => row.won).length}`;
  };
  if (band) return band.map((asc) => at2(asc).length === 0 ? `A${asc} \u8FD8\u6CA1\u6709\u8BB0\u5F55` : `${strength(asc)}\uFF0C${wake2(at2(asc), "\u3001")}`).join("\uFF1B");
  const parts = RECORD_ASCENSIONS.filter((asc) => at2(asc).length > 0).map(strength);
  return `${parts.join("\uFF1B")}\uFF1B${wake2(Object.values(byAsc).flat(), "\uFF0C")}`;
}
function laserT4Text() {
  const monsters = monsterMoves();
  return RECORD_ASCENSIONS.map((asc) => {
    const laser = moveDamageAt(monsters, "ROCKET", "LASER_MOVE", asc);
    const gain = selfGainAt(monsters["ROCKET"]?.moves?.["CHARGE_UP_MOVE"], "STRENGTH_POWER", asc, { monsters, monsterId: "ROCKET" }) ?? 0;
    if (!laser) return `A${asc} ?`;
    const front = (laser.base ?? laser.perHit) + gain;
    return `A${asc} ${front}\uFF08\u80CC\u540E ${Math.floor(front * 1.5)}\uFF09`;
  }).join("\u3001");
}
function act1EntryHp() {
  const cells = (bosses, asc) => bosses.map((boss) => unblockedShare(boss)?.by_asc?.[String(asc)]).filter((cell) => !!cell);
  const pooled = (list) => {
    const mean = (key, weight) => {
      const used = list.filter((cell) => cell[key] != null && weight(cell) > 0);
      const total = used.reduce((sum, cell) => sum + weight(cell), 0);
      return total > 0 ? Math.round(used.reduce((sum, cell) => sum + cell[key] * weight(cell), 0) / total) : null;
    };
    const fights = list.reduce((sum, cell) => sum + cell.fights, 0);
    const winPct = mean("entry_pct_won", (cell) => cell.won);
    const lossPct = mean("entry_pct_lost", (cell) => cell.fights - cell.won);
    const fmt2 = (value) => value === null ? "\u2014" : `${value}%`;
    return fights > 0 ? `${fmt2(winPct)}/${fmt2(lossPct)}\uFF08${fights} \u573A\uFF09` : "\u8FD8\u6CA1\u6709\u8BB0\u5F55";
  };
  const all = RECORD_ASCENSIONS.map((asc) => `A${asc} ${pooled(cells(ACT1_BOSSES, asc))}`).join("\uFF0C");
  const fysh = RECORD_ASCENSIONS.map((asc) => `A${asc} ${pooled(cells(["SOUL_FYSH"], asc))}`).join("\uFF0C");
  return `${all}\uFF1B\u7075\u9B42\u5F02\u9C7C ${fysh}`;
}
function unknownFightsText(ascensions = RECORD_ASCENSIONS, acts = [1, 2]) {
  const parts = [];
  for (const asc of ascensions) {
    for (const act of acts) {
      const unknown = measuredRoomExact(asc, act, "Unknown");
      const fight = measuredRoomExact(asc, act, "UnknownFight");
      const hallway = measuredRoomExact(asc, act, "Monster");
      if (!unknown || !fight || fight.fight_median === void 0 || fight.fight_p75 === void 0) continue;
      const vs = hallway?.fight_median !== void 0 && hallway.fight_p75 !== void 0 ? `\uFF08\u8D70\u5ECA ${hallway.fight_median}/${hallway.fight_p75}\uFF09` : "";
      const actName = act === 1 ? "\u4E00" : "\u4E8C";
      parts.push(`A${asc} ${actName}\u5E55 ${unknown.n} \u4E2A\u95EE\u53F7\u5F00\u51FA ${fight.n} \u573A\uFF08${Math.round(100 * fight.n / unknown.n)}%\uFF09\uFF0C\u6218\u5185\u6389\u8840\u4E2D\u4F4D/p75 ${fight.fight_median}/${fight.fight_p75}${vs}`);
    }
  }
  return parts.length > 0 ? parts.join("\uFF1B") : "\u95EE\u53F7\u5F00\u6218\u7684\u6570\u636E\u8FD8\u6CA1\u6709";
}
function bossLossText(bossKey2, ascension) {
  const loss = bossHpLoss(bossKey2, ascension)?.perTurn;
  return loss && loss.asc === ascension ? loss.median.toFixed(1) : "?";
}
function queenAmalgamRecord(lang, ascension) {
  return queenAmalgamText(unblockedShare("QUEEN")?.amalgam ?? {}, lang, recordBand(ascension));
}
function queenSplit(rows, lang) {
  const range = (list) => {
    const turns = list.map((row) => row.killed_turn).filter((turn) => turn !== null).sort((a, b) => a - b);
    const dash = lang === "zh" ? "\u2013" : "-";
    return turns.length === 0 ? "" : turns[0] === turns.at(-1) ? `T${turns[0]}` : `T${turns[0]}${dash}T${turns.at(-1)}`;
  };
  const wins = rows.filter((row) => row.won);
  const losses = rows.filter((row) => !row.won);
  const split = rows.filter((row) => row.t12_queen != null && row.t12_amalgam != null && row.t12_queen + row.t12_amalgam > 0);
  return {
    range,
    wins,
    losses,
    winsKilled: wins.filter((row) => row.killed_turn !== null),
    lossNever: losses.filter((row) => row.killed_turn === null),
    lossKilled: losses.filter((row) => row.killed_turn !== null),
    intoQueen: split.filter((row) => row.t12_queen > row.t12_amalgam),
    intoAmalgam: split.filter((row) => row.t12_queen <= row.t12_amalgam)
  };
}
function queenAmalgamText(byAsc, lang, band = null) {
  if (band) return queenAmalgamBandText(byAsc, lang, band);
  const all = Object.values(byAsc).flat();
  if (all.length === 0) return lang === "zh" ? "\u8FD8\u6CA1\u6709\u5973\u738B\u6218\u8BB0\u5F55" : "no logged Queen fights";
  const { range, wins, losses, winsKilled, lossNever, lossKilled, intoQueen, intoAmalgam } = queenSplit(all, lang);
  const won = (rows) => rows.filter((row) => row.won).length;
  if (lang === "en") {
    return `${all.length} logged Queen fights: ${winsKilled.length}/${wins.length} wins killed the Amalgam first${winsKilled.length > 0 ? ` (${range(winsKilled)})` : ""}; ${lossNever.length}/${losses.length} losses never did; turns 1-2 mostly into the Queen won ${won(intoQueen)}/${intoQueen.length}, into the Amalgam ${won(intoAmalgam)}/${intoAmalgam.length}`;
  }
  const a8 = byAsc["8"] ?? [];
  const a8Wins = a8.filter((row) => row.won && row.killed_turn !== null).map((row) => `${row.run ?? "?"} T${row.killed_turn}`);
  const a8Text = a8.length > 0 ? `\uFF08A8 ${a8.length} \u573A\u8D62 ${won(a8)}${a8Wins.length > 0 ? `\uFF1A${a8Wins.join("\u3001")} \u6253\u6B7B\u805A\u5408\u4F53` : ""}\uFF09` : "";
  const winPart = wins.length === 0 ? "\u8FD8\u6CA1\u6709\u8D62\u8FC7" : `\u8D62\u7684 ${wins.length} \u573A${winsKilled.length === wins.length ? "\u90FD" : `\u91CC ${winsKilled.length} \u573A`}\u5148\u6253\u6B7B\u805A\u5408\u4F53${winsKilled.length > 0 ? `\uFF08${range(winsKilled)}\uFF09` : ""}`;
  const lossPart = `\u8F93\u7684 ${losses.length} \u573A ${lossNever.length} \u573A\u6CA1\u6253\u6B7B${lossKilled.length > 0 ? `\u3001${lossKilled.length} \u573A ${range(lossKilled)} \u624D\u6253\u6B7B` : ""}`;
  return `\u6709\u8BB0\u5F55\u7684 ${all.length} \u573A\u5973\u738B\u6218\uFF1A${winPart}\uFF1B${lossPart}\uFF1BT1\u2013T2 \u4F24\u5BB3\u591A\u8FDB\u5973\u738B\u7684 ${intoQueen.length} \u573A\u8D62 ${won(intoQueen)}\u3001\u591A\u8FDB\u805A\u5408\u4F53\u7684 ${intoAmalgam.length} \u573A\u8D62 ${won(intoAmalgam)}${a8Text}`;
}
function queenAmalgamBandText(byAsc, lang, band) {
  const zh = lang === "zh";
  const won = (rows2) => rows2.filter((row) => row.won).length;
  const rows = band.map((asc) => {
    const list = byAsc[String(asc)] ?? [];
    if (list.length === 0) return zh ? `A${asc} \u8FD8\u6CA1\u6709\u8BB0\u5F55` : `A${asc} none`;
    const { range, wins, losses, winsKilled, lossNever, lossKilled, intoQueen, intoAmalgam } = queenSplit(list, lang);
    if (!zh) {
      const winPart2 = wins.length === 0 ? "no win yet" : `${winsKilled.length}/${wins.length} wins killed the Amalgam first${winsKilled.length > 0 ? ` (${range(winsKilled)})` : ""}`;
      const lossPart2 = losses.length === 0 ? "no loss" : `${lossNever.length}/${losses.length} losses never killed it`;
      return `A${asc} ${list.length} (${wins.length} won): ${winPart2}, ${lossPart2}, turns 1-2 mostly into the Queen won ${won(intoQueen)}/${intoQueen.length}, into the Amalgam ${won(intoAmalgam)}/${intoAmalgam.length}`;
    }
    const killedRuns = winsKilled.length > 0 && winsKilled.length <= 3 ? winsKilled.map((row) => `${row.run ?? "?"} T${row.killed_turn}`).join("\u3001") : range(winsKilled);
    const winPart = wins.length === 0 ? "\u8FD8\u6CA1\u6709\u8D62\u8FC7" : `\u8D62\u7684${winsKilled.length === wins.length ? "\u90FD" : `\u91CC ${winsKilled.length} \u573A`}\u5148\u6253\u6B7B\u805A\u5408\u4F53${winsKilled.length > 0 ? `\uFF08${killedRuns}\uFF09` : ""}`;
    const lossPart = losses.length === 0 ? "\u6CA1\u6709\u8F93\u5C40" : `\u8F93\u7684 ${losses.length} \u573A ${lossNever.length} \u573A\u6CA1\u6253\u6B7B${lossKilled.length > 0 ? `\u3001${lossKilled.length} \u573A ${range(lossKilled)} \u624D\u6253\u6B7B` : ""}`;
    return `A${asc} ${list.length} \u573A\u8D62 ${wins.length}\uFF0C${winPart}\uFF0C${lossPart}\uFF0CT1\u2013T2 \u4F24\u5BB3\u591A\u8FDB\u5973\u738B\u7684 ${intoQueen.length} \u573A\u8D62 ${won(intoQueen)}\u3001\u591A\u8FDB\u805A\u5408\u4F53\u7684 ${intoAmalgam.length} \u573A\u8D62 ${won(intoAmalgam)}`;
  });
  return zh ? `\u6709\u8BB0\u5F55\u7684\u5973\u738B\u6218 ${rows.join("\uFF1B")}` : `logged Queen fights ${rows.join("; ")}`;
}
function sandpitDeathRecord(lang, ascension) {
  return sandpitDeathText(unblockedShare("THE_INSATIABLE")?.deaths ?? {}, lang, recordBand(ascension));
}
function sandpitDeathText(byAsc, lang, band = null) {
  const count2 = (rows, death) => rows.filter((row) => !row.won && row.death === death).length;
  const lost = (rows) => rows.filter((row) => !row.won);
  if (band) {
    const zh = lang === "zh";
    const first = band.find((asc) => lost(byAsc[String(asc)] ?? []).length > 0);
    const rows = band.map((asc) => {
      const list = byAsc[String(asc)] ?? [];
      const n = lost(list).length;
      if (n === 0) return zh ? `A${asc} ${list.length > 0 ? "\u6CA1\u6709\u8F93\u5C40" : "\u8FD8\u6CA1\u6709\u8BB0\u5F55"}` : `A${asc} none`;
      if (zh) return `A${asc} ${n} \u573A\uFF1A\u6B7B\u5728 HP \u4E0A${asc === first ? "\uFF08\u6C99\u5751\u8FD8\u5269 \u22652\uFF09" : " "}${count2(list, "hp")}\u3001\u88AB\u6C99\u5751\u541E\u6389 ${count2(list, "sandpit")}\u3001\u4E24\u6761\u7EBF\u540C\u4E00\u56DE\u5408 ${count2(list, "both")}`;
      return asc === first ? `A${asc} ${n}: ${count2(list, "hp")} died on HP with the Sandpit at 2+, ${count2(list, "sandpit")} to the Sandpit, ${count2(list, "both")} both at once` : `A${asc} ${n}: ${count2(list, "hp")} on HP, ${count2(list, "sandpit")} to the Sandpit, ${count2(list, "both")} both at once`;
    });
    return zh ? `\u6709\u8BB0\u5F55\u7684\u6C99\u866B\u8F93\u5C40 ${rows.join("\uFF1B")}` : `logged losses ${rows.join("; ")}`;
  }
  const all = Object.values(byAsc).flat();
  if (lost(all).length === 0) return lang === "zh" ? "\u8FD8\u6CA1\u6709\u6C99\u866B\u8F93\u5C40\u7684\u8BB0\u5F55" : "no logged Insatiable losses";
  if (lang === "en") {
    return `${lost(all).length} logged losses: ${count2(all, "hp")} died on HP with the Sandpit at 2+, ${count2(all, "sandpit")} to the Sandpit, ${count2(all, "both")} both at once`;
  }
  const perAsc = RECORD_ASCENSIONS.map((asc) => {
    const rows = byAsc[String(asc)] ?? [];
    return lost(rows).length > 0 ? `A${asc} ${lost(rows).length} \u573A ${count2(rows, "hp")}/${count2(rows, "sandpit")}/${count2(rows, "both")}` : null;
  }).filter(Boolean);
  return `\u6709\u8BB0\u5F55\u7684\u6C99\u866B\u8F93\u5C40 ${lost(all).length} \u573A\uFF1A\u6B7B\u5728 HP \u4E0A\uFF08\u6C99\u5751\u8FD8\u5269 \u22652\uFF09${count2(all, "hp")}\u3001\u88AB\u6C99\u5751\u541E\u6389 ${count2(all, "sandpit")}\u3001\u4E24\u6761\u7EBF\u540C\u4E00\u56DE\u5408 ${count2(all, "both")}${perAsc.length > 0 ? `\uFF08${perAsc.join("\uFF0C")}\uFF09` : ""}`;
}
function giantKillRecord(ascension, lang) {
  const level = ascension >= 9 ? 9 : 8;
  return giantKillText(unblockedShare("WATERFALL_GIANT")?.kills?.[String(level)] ?? [], level, lang);
}
function giantKillText(rows, level, lang) {
  const zh = lang === "zh";
  if (rows.length === 0) return zh ? `A${level} \u6CA1\u6709\u5DE8\u517D\u7684\u5BF9\u5C40\u6570\u636E` : `A${level}: no logged Giant fights`;
  const bucket = (test) => {
    const list = rows.filter(test);
    return { won: list.filter((row) => row.won).length, n: list.length };
  };
  const early = bucket((row) => row.turn !== null && row.turn <= 10);
  const mid = bucket((row) => row.turn !== null && row.turn >= 11 && row.turn <= 15);
  const late = bucket((row) => row.turn !== null && row.turn >= 16);
  const none = bucket((row) => row.turn === null);
  const wins = rows.filter((row) => row.won);
  const winTurns = wins.map((row) => row.turn).filter((turn) => turn !== null).sort((a, b) => a - b);
  const earlyLosses = rows.filter((row) => !row.won && row.turn !== null && row.turn <= 10 && row.hp != null && row.stacks != null).sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0));
  const part = (label, b) => b.n > 0 ? `${label} ${b.won}/${b.n}` : null;
  if (zh) {
    const buckets2 = [part("T10 \u524D\u51FB\u6740\u8D62", early), part("T11\u2013T15", mid), part("T16 \u540E", late), part("\u6CA1\u6253\u6B7B", none)].filter(Boolean).join("\u3001");
    const winList2 = wins.length > 0 && wins.length <= 4 && winTurns.length > 0 ? `\uFF08${winTurns.map((turn) => `T${turn}`).join("\u3001")} \u51FB\u6740\uFF09` : "";
    const lossList2 = earlyLosses.length > 0 && earlyLosses.length <= 3 ? `\uFF1BT10 \u524D\u51FB\u6740\u8F93\u7684 ${earlyLosses.map((row) => `${row.run ?? "?"}\uFF08T${row.turn}\uFF09`).join("\u3001")}\u51FB\u6740\u65F6\u53EA\u5269 ${earlyLosses.map((row) => row.hp).join("\u3001")} \u8840\u5BF9 ${earlyLosses.map((row) => row.stacks).join("\u3001")} \u5C42\uFF0C\u6B7B\u4E8E\u81EA\u7206` : "";
    return `A${level} ${rows.length} \u573A\u8D62 ${wins.length} \u573A${winList2}\uFF1A${buckets2}${lossList2}`;
  }
  const partEn = (label, b) => b.n > 0 ? `${label} ${b.won}/${b.n} won` : null;
  const buckets = [partEn("killed by T10", early), partEn("T11-T15", mid), partEn("T16 or later", late), partEn("not killed", none)].filter(Boolean).join(", ");
  const winList = wins.length > 0 && wins.length <= 4 && winTurns.length > 0 ? ` (kills on ${winTurns.map((turn) => `T${turn}`).join(", ")})` : "";
  const lossList = earlyLosses.length > 0 && earlyLosses.length <= 3 ? `; lost after a kill by T10: ${earlyLosses.map((row) => `${row.run ?? "?"} (T${row.turn}) ${row.hp} HP against ${row.stacks} stacks`).join(", ")}, died to the blast` : "";
  return `A${level} (${rows.length} fights): ${wins.length} won${winList}; ${buckets}${lossList}`;
}
function kinBeamT11(ascension) {
  const monsters = monsterMoves();
  const beam = moveDamageAt(monsters, "KIN_PRIEST", "BEAM_MOVE", ascension);
  const ritual = selfGainAt(monsters["KIN_PRIEST"]?.moves?.["RITUAL_MOVE"], "STRENGTH_POWER", ascension, { monsters, monsterId: "KIN_PRIEST" });
  if (!beam || ritual === null) return null;
  return beam.hits * ((beam.base ?? beam.perHit) + 2 * ritual);
}
function giantNumbers(ascension) {
  const bases = moveBaseDamages("WATERFALL_GIANT", "PRESSURE_GUN_MOVE", ascension);
  const gaps = bases.slice(1).map((value, i) => value - bases[i]).filter((gap) => gap > 0);
  const first = bases[0] ?? GUN_FALLBACK.first;
  const step = gaps.length > 0 ? Math.min(...gaps) : GUN_FALLBACK.step;
  return {
    hp: bossHpAt("WATERFALL_GIANT", ascension)?.hp ?? (ascension >= 8 ? 250 : 240),
    siphon: ascension >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base,
    gun: [first, first + step, first + 2 * step]
  };
}
function turnBlockOf(relicIds) {
  return relicIds.filter((id) => id === "SAI").length * SAI_BLOCK;
}
function relicFlatStrength(relics) {
  const out = [];
  for (const { id, stack } of relics) {
    if (id === "VAJRA") out.push({ amount: 1, from: 1, name: "Vajra +1" });
    else if (id === "GIRYA" && stack > 0) out.push({ amount: stack, from: 1, name: `Girya +${stack} (${stack} lifts)` });
    else if (id === "EMBER_TEA" && stack > 0) out.push({ amount: 2, from: 1, name: "Ember Tea +2" });
    else if (id === "SPARKLING_ROUGE") out.push({ amount: 1, from: 3, name: "Sparkling Rouge +1 from T3" });
  }
  return out;
}
function calibrated(raw) {
  return raw > 0 ? ESTIMATE_BASE + ESTIMATE_SLOPE * raw : 0;
}
function dynValue(entry, name) {
  for (const value of asArray(asRecord(entry)["dynamic_values"])) {
    const record = asRecord(value);
    if (str(record["name"]) === name) return numOrNull(record["current_value"]) ?? numOrNull(record["base_value"]);
  }
  return null;
}
function deckProfileForBoss(state, knowledge) {
  const run = asRecord(state.run?.raw);
  const entries = asArray(run["deck"]);
  const cards = entries.map((entry, index) => {
    const model2 = modelHandCard(entry, index, knowledge, str(run["character_id"]));
    return { entry, model: model2.type ? model2 : { ...model2, type: str(asRecord(entry)["card_type"]) } };
  });
  if (cards.length === 0) return null;
  const relics = asArray(run["relics"]).map((relic) => ({ id: str(asRecord(relic)["relic_id"]), stack: num(asRecord(relic)["stack"]) }));
  const relicIds = relics.map((relic) => relic.id);
  const sealTurns = Math.floor(num(run["gold"]) / SEAL_OF_GOLD_COST);
  const seal = relicIds.includes("SEAL_OF_GOLD") ? Math.min(1, sealTurns / TYPICAL_FIGHT_TURNS) : 0;
  const energy = Math.max(3, num(run["max_energy"]) || 3) + relicIds.filter((id) => ENERGY_RELICS.has(id)).length + seal;
  const n = cards.length;
  let damage = 0;
  let aoe = 0;
  let cost = 0;
  let hits = 0;
  let flatStrength = 0;
  let demonForm = 0;
  let ruptureStrength = 0;
  let selfDamage = 0;
  const turnStartLoss = /* @__PURE__ */ new Set();
  let inferno = 0;
  let juggernaut = 0;
  let flameBack = 0;
  let mantleBlock = 0;
  let stoneArmor = 0;
  let blockCards = 0;
  let vulnerable = 0;
  let lateEnergy = 0;
  const growth = [];
  for (const { entry, model: card } of cards) {
    const playable = card.type !== "Curse" && card.type !== "Status" && (card.xCost || card.cost >= 0);
    if (!playable) continue;
    cost += card.xCost ? energy : Math.max(0, card.cost) + (card.type === "Power" && relicIds.includes("SPIKED_GAUNTLETS") ? 1 : 0);
    if (card.type === "Attack") {
      const cardHits = card.special === "whirlwind" ? energy : Math.max(1, card.hits);
      const cardDamage = (card.damage ?? 0) * cardHits;
      damage += cardDamage;
      if (card.target === "all") aoe += cardDamage;
      if ((card.damage ?? 0) > 0) hits += cardHits;
    }
    if (card.cardId === "DEMON_FORM") {
      const rate = dynValue(entry, "StrengthPower") ?? 3;
      demonForm += rate;
      growth.push(`Demon Form +${rate}/turn`);
    } else if (card.cardId === "RUPTURE") {
      ruptureStrength += dynValue(entry, "StrengthPower") ?? 1;
    } else {
      flatStrength += Math.max(0, card.strength);
    }
    if (card.type === "Power") {
      const income = dynValue(entry, "Energy") ?? 0;
      const template = unconditionalText(str(asRecord(entry)["rules_text"]) || knowledge.card(card.cardId)?.descriptionRaw || "");
      if (income > 0 && turnStartOnly(template, "Energy")) lateEnergy += income;
    }
    if (card.cardId === "INFERNO") {
      turnStartLoss.add("Inferno");
      inferno += dynValue(entry, "InfernoPower") ?? 6;
    } else if (card.cardId === "CRIMSON_MANTLE") {
      turnStartLoss.add("Crimson Mantle");
    } else if (card.hpLoss > 0) selfDamage += 1;
    if (card.cardId === "JUGGERNAUT") juggernaut += dynValue(entry, "JuggernautPower") ?? 6;
    if (card.cardId === "FLAME_BARRIER") flameBack += dynValue(entry, "DamageBack") ?? 4;
    if (card.cardId === "CRIMSON_MANTLE") mantleBlock += dynValue(entry, "CrimsonMantlePower") ?? 7;
    if (card.cardId === "STONE_ARMOR") stoneArmor += dynValue(entry, "PlatingPower") ?? 4;
    if (card.block > 0) blockCards += 1;
    if (card.vulnerable > 0) vulnerable += 1;
  }
  const playedShare = Math.min(1, energy / Math.max(1, HAND * cost / n));
  const perCard = HAND / n * playedShare;
  const lateEnergyScale = playedShare > 0 ? Math.min(1, (energy + lateEnergy) / Math.max(1, HAND * cost / n)) / playedShare : 1;
  if (lateEnergy > 0) growth.push(`+${lateEnergy} energy/turn from powers`);
  const relicFlat = relicFlatStrength(relics);
  for (const source of relicFlat) growth.push(source.name);
  const relicStrengthRate = (relicIds.includes("TOASTY_MITTENS") ? 1 : 0) + (relicIds.includes("BRIMSTONE") ? BRIMSTONE_STRENGTH : 0);
  if (relicIds.includes("TOASTY_MITTENS")) growth.push("Toasty Mittens +1/turn");
  if (relicIds.includes("BRIMSTONE")) growth.push(`Brimstone +${BRIMSTONE_STRENGTH}/turn`);
  const selfPlays = selfDamage * perCard;
  const lossEvents = selfPlays + turnStartLoss.size;
  const feeders = [...turnStartLoss.size > 0 ? [`${[...turnStartLoss].join(" + ")} each turn`] : [], ...selfDamage > 0 ? [`${selfDamage} self-damage cards`] : []].join(" + ");
  const ruptureRate = ruptureStrength * lossEvents;
  if (ruptureRate > 0) growth.push(`Rupture +${ruptureStrength} per HP loss, fed by ${feeders} (~+${ruptureRate.toFixed(1)}/turn)`);
  const passive = [];
  const infernoDamage = inferno * lossEvents;
  if (infernoDamage > 0) passive.push(`Inferno ${inferno} to all per HP loss, fed by ${feeders} (~${infernoDamage.toFixed(0)}/turn)`);
  const blockGains = blockCards * perCard + (turnStartLoss.has("Crimson Mantle") ? 1 : 0);
  const juggernautDamage = juggernaut * blockGains;
  if (juggernautDamage > 0) passive.push(`Juggernaut ${juggernaut} per block gain, ~${blockGains.toFixed(1)} gains a turn (~${juggernautDamage.toFixed(0)}/turn)`);
  const setupTurn = 1 + Math.round(n / (2 * HAND));
  const pieces = passivePiecesOptions.enabled ? passiveOfDeck(state, relicIds, { flameBack: flameBack * perCard, mantleBlock, stoneArmor, setupTurn }) : null;
  if (pieces) passive.push(...pieces.damageNames);
  const exempt = passivePiecesOptions.enabled && (pieces !== null || infernoDamage + juggernautDamage > 0);
  return {
    character: clockCharacter(state),
    size: n,
    energy,
    playedShare,
    plays: HAND * playedShare,
    damage: damage * perCard,
    aoeDamage: aoe * perCard,
    hits: hits * perCard,
    avgHit: hits > 0 ? damage / hits : 0,
    vulnerableSources: vulnerable,
    flatStrength,
    relicFlat: relicFlat.map(({ amount, from }) => ({ amount, from })),
    lateEnergy,
    lateEnergyScale,
    demonFormRate: demonForm,
    relicStrengthRate,
    ruptureRate,
    passiveDamage: infernoDamage + juggernautDamage,
    passiveAoe: infernoDamage,
    passive,
    ...exempt ? { passivePieces: true } : {},
    ...pieces ? { passiveStart: pieces.damage, passiveStartAoe: pieces.aoe, turnBlock: pieces.turnBlock, passiveBlock: pieces.blockNames } : {},
    setupTurn,
    growth
  };
}
function passiveOfDeck(state, relicIds, cards) {
  const relics = clockRelicPieces(relicIds);
  const damage = [...relics.damage];
  const block = [...relics.block];
  if (cards.flameBack > 0) damage.push({ name: `Flame Barrier back per boss hit (~${cards.flameBack.toFixed(2)} a hit/turn)`, amount: cards.flameBack, from: 1, perHit: true });
  if (cards.mantleBlock > 0) block.push({ name: `Crimson Mantle ${cards.mantleBlock} from T${cards.setupTurn + 1}`, amount: cards.mantleBlock, from: cards.setupTurn + 1 });
  if (cards.stoneArmor > 0) block.push({ name: `Stone Armor Plating ${cards.stoneArmor} from T${cards.setupTurn}`, amount: cards.stoneArmor, from: cards.setupTurn, decays: true });
  if (damage.length === 0 && block.length === 0) return null;
  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  const profile = bossProfile(bossId);
  const hitsByTurn = profile && damage.some((piece) => piece.perHit) ? bossHitsByTurn(profile.id, state.run?.ascension ?? 0, profile.scriptTurns, profile.hpParts) : null;
  const hitsPerTurn = hitsByTurn && hitsByTurn.length > 0 ? hitsByTurn.reduce((sum, h) => sum + h, 0) / hitsByTurn.length : 0;
  let total = 0;
  let aoe = 0;
  const damageNames = [];
  for (const piece of damage) {
    const amount = piece.perHit ? piece.amount * hitsPerTurn : piece.amount;
    if (amount <= 0) continue;
    total += amount;
    if (piece.aoe) aoe += amount;
    damageNames.push(piece.perHit ? `${piece.name} x ~${hitsPerTurn.toFixed(1)} boss hits a turn (~${amount.toFixed(1)}/turn)` : piece.name);
  }
  const turnBlock = Array.from({ length: PASSIVE_BLOCK_TURNS }, (_, t) => block.reduce((sum, piece) => sum + clockBlockAt(piece, t + 1), 0));
  return { damage: total, aoe, damageNames, turnBlock, blockNames: block.map((piece) => piece.name) };
}
function rampAverage(rate, from, turns) {
  const n = Math.max(0, turns - from + 1);
  return turns > 0 ? rate * n * (n + 1) / 2 / turns : 0;
}
function averageStrength(deck, turns) {
  const setup = deck.setupTurn;
  const flat = turns > 0 ? deck.flatStrength * Math.max(0, turns - setup + 1) / turns : 0;
  const demon = rampAverage(deck.demonFormRate, setup + 1, turns);
  const mittens = rampAverage(deck.relicStrengthRate, 1, turns);
  const rupture = rampAverage(deck.ruptureRate, setup + 1, turns);
  const relicFlat = turns > 0 ? (deck.relicFlat ?? []).reduce((sum, { amount, from }) => sum + amount * Math.max(0, turns - from + 1) / turns, 0) : 0;
  return flat + demon + mittens + rupture + relicFlat;
}
function rawDeckDamage(deck, bossId, turns) {
  const id = bossProfile(bossId)?.id ?? "";
  const bodies = id === "KAISER_CRAB" ? 2 : 1;
  const late = LATE_ENERGY_SHARE * (turns > 0 && (deck.lateEnergyScale ?? 1) > 1 ? (deck.lateEnergyScale - 1) * Math.max(0, turns - deck.setupTurn) / turns : 0);
  let perTurn = (1 + late) * (deck.damage + deck.aoeDamage * (bodies - 1) + averageStrength(deck, turns) * deck.hits);
  if (deck.vulnerableSources >= 2 && id !== "AEONGLASS") perTurn *= VULNERABLE_UPTIME;
  return perTurn + passiveDeckDamage(deck, bossId, turns);
}
function passiveDeckDamage(deck, bossId, turns) {
  const bodies = bossProfile(bossId)?.id === "KAISER_CRAB" ? 2 : 1;
  let out = 0;
  const passive = (deck.passiveDamage ?? 0) + (deck.passiveAoe ?? 0) * (bodies - 1);
  if (passive > 0 && turns > 0) out += passive * Math.max(0, turns - deck.setupTurn) / turns;
  out += (deck.passiveStart ?? 0) + (deck.passiveStartAoe ?? 0) * (bodies - 1);
  return out;
}
function deckEstimate(deck, bossId, turns) {
  if ((deck.character ?? knowledgeCharacter()) !== DEFAULT_CHARACTER) return null;
  const id = bossProfile(bossId)?.id ?? "";
  const raw = rawDeckDamage(deck, bossId, turns);
  if (!deck.passivePieces || raw <= 0) return Math.round(calibrated(raw) * mechanicFactor(id, deck, turns));
  const passive = passiveDeckDamage(deck, bossId, turns);
  return Math.round((ESTIMATE_BASE + ESTIMATE_SLOPE * (raw - passive)) * mechanicFactor(id, deck, turns) + ESTIMATE_SLOPE * passive);
}
function ringingTurns(turns) {
  return turns >= 6 ? Math.floor((turns - 6) / 3) + 1 : 0;
}
function mechanicFactor(id, deck, turns) {
  if (turns <= 0) return 1;
  switch (id) {
    case "CEREMONIAL_BEAST": {
      const ringing = ringingTurns(turns);
      const oneCard = 1 / Math.max(1, deck.plays);
      return (turns - ringing + ringing * oneCard) / turns;
    }
    case "KNOWLEDGE_DEMON": {
      const sloth = Math.min(1, 3 / Math.max(1, deck.plays));
      const mindRot = (HAND - 1) / HAND;
      const late = Math.max(0, turns - 5);
      return (sloth * (turns - late) + sloth * mindRot * late) / turns;
    }
    case "QUEEN":
      return (Math.min(turns, 2) + Math.max(0, turns - 2) * 0.75) / turns;
    // No explicit model yet: the logged A8 share of the calibrated estimate these fights realised
    // (Soul Fysh's Intangible turns and Beckons: 20.1 of 24.5; the Matriarch's Strength/Dexterity drain:
    // 20.3 of 26.1).
    case "SOUL_FYSH":
      return 0.82;
    case "LAGAVULIN_MATRIARCH":
      return 0.78;
    // The Insatiable: fitted on the 23 logged A8 fights (tools/boss-fights-extract.py THE_INSATIABLE,
    // tests/boss-fights/insatiable-a8.json), the realised damage a turn over the calibrated estimate at
    // the fight's real length has median 1.10 (LAD factor 1.04; median |log error| 0.28 at 1.0). Frantic
    // Escapes (median 3 a fight, ~0.45 a turn) do not show in it: they cost a card and an energy but the
    // fight's other turns are full-damage ones. The 0.50/0.51 of VNWR16YEJASM and 981WMX8MQ7DK (and
    // 69HWH6MD1S34's 0.41, 33 HP entry) were play, not the mechanic: Toasty Mittens exhausting Bludgeon /
    // Ultimate Strike / Bash+, 6 Escapes on 27 energy, the HP guard swapping out damage lines. A 0.54
    // factor would put the median |log error| at 0.71. So no discount.
    case "THE_INSATIABLE":
      return 1;
    // Kaiser Crab: fitted on the 23 logged A8 fights (tools/boss-fights-extract.py CRUSHER,ROCKET,
    // tests/boss-fights/kaiser-crab-a8.json), realised damage a turn over the calibrated estimate at the
    // fight's real length has median 0.96 (geometric mean 0.89, LAD factor 0.95, bootstrap 90% CI of the
    // median 0.76-1.05); median |log error| 0.26 at 1.0, 0.33 at 0.7. The two bodies are already in the
    // raw estimate (AoE counted per body). 0B5YKJFM0E8B (0.65) and RWWGRRYKD6LT (0.76) are in the low
    // half but not outliers (6HRZ 0.41 and M9PL 0.50 are lower, VE97 1.55 and ZWX5 1.60 higher), so the
    // ~0.7 the two suggested does not hold on the full data. No discount. (The last 7 fights, 09-28, sit at
    // a median 0.77: worth re-running the fit as more come in.)
    case "KAISER_CRAB":
      return 1;
    default:
      return 1;
  }
}
function slipperyTurns(deck, turns) {
  const hits = deck && deck.hits > 0 ? deck.hits : 2;
  return Math.min(turns, SLIPPERY_STACKS / Math.max(0.5, hits));
}
function extraHp(id, deck, turns, perTurn) {
  switch (id) {
    case "KNOWLEDGE_DEMON":
      return (turns > 4 ? PONDER_HEAL : 0) + (turns > 8 ? PONDER_HEAL : 0);
    case "VANTOM":
      return Math.max(0, Math.round(slipperyTurns(deck, turns) * perTurn - SLIPPERY_STACKS));
    default:
      return 0;
  }
}
function survivableTurns(profile, entryHp, lossPerTurn = profile.lossPerTurn) {
  return Math.max(1, Math.floor(entryHp / Math.max(1, lossPerTurn)));
}
function eruptionSchedule(ascension) {
  const db = powerScheduleAt("WATERFALL_GIANT", "STEAM_ERUPTION_POWER", ascension);
  if (!db) return { ...ERUPTION_FALLBACK, source: "logged A8 (no DB numbers)" };
  const estimate = db.note ? ` moved by the measured change (${db.note})` : "";
  return { first: db.first, firstTurn: db.firstTurn, perTurn: db.perTurn, source: db.exact ? `A${db.asc}, n=${db.n}` : `A${ascension} not logged: A${db.asc}'s, n=${db.n}${estimate}` };
}
function eruptionAt(turn, ascension, schedule = eruptionSchedule(ascension)) {
  return schedule.first + schedule.perTurn * (turn - schedule.firstTurn);
}
function eruptionFormula(ascension) {
  const schedule = eruptionSchedule(ascension);
  return `${eruptionAt(1, ascension, schedule)}+${schedule.perTurn}(T-1) when killed on turn T (${schedule.source})`;
}
function eruptionTurns(entryHp, lossPerTurn, ascension = 8) {
  const { first, firstTurn, perTurn } = eruptionSchedule(ascension);
  return Math.max(3, Math.floor((entryHp + ERUPTION_SURVIVAL_BLOCK - first + perTurn * firstTurn) / (perTurn + lossPerTurn)));
}
function testSubjectPhase2Loss(ascension, character2 = knowledgeCharacter()) {
  const claw = moveDamageAt(monsterMoves(), "TEST_SUBJECT", "MULTI_CLAW_MOVE", ascension);
  const share = character2 === knowledgeCharacter() ? unblockedShare("TEST_SUBJECT") : null;
  if (!claw || !share) return character2 === DEFAULT_CHARACTER ? { value: TEST_SUBJECT_PHASE2_LOSS_FALLBACK, source: "~15 a turn (D3X1, A8; no DB numbers)" } : { value: null, source: `\u5C1A\u65E0 ${character2} \u7684\u7B2C\u4E8C\u9636\u6BB5\u6389\u8840\u7EDF\u8BA1` };
  const hits = Array.from({ length: TEST_SUBJECT_PHASE2_CLAWS }, (_, use) => claw.hits + use);
  const mean = claw.perHit * hits.reduce((sum, n) => sum + n, 0) / hits.length;
  const value = Math.round(mean * share.unblocked_share * 10) / 10;
  return {
    value,
    source: `Multi Claw ${claw.estimated ? "\u2248" : ""}${claw.perHit}x${claw.hits}+ at A${ascension}${claw.estimated ? ` (A${claw.from}'s scaled, estimated)` : ""} x ${Math.round(share.unblocked_share * 100)}% unblocked = ~${value} a turn`
  };
}
function testSubjectIntangibleTurns(turns) {
  return Math.ceil(turns / 2);
}
function testSubjectPhases(ascension) {
  const phases = bossHpAt("TEST_SUBJECT", ascension)?.phases ?? [];
  if (phases.length >= 3) return [phases[0], phases[1], phases[2]];
  return ascension >= 8 ? [111, 212, 313] : [100, 200, 300];
}
function laterPhaseHps(maxHp, ascension) {
  const phases = testSubjectPhases(ascension);
  const at2 = phases.reduce((best, hp, i) => Math.abs(hp - maxHp) < Math.abs(phases[best] - maxHp) ? i : best, 0);
  if (Math.abs(phases[at2] - maxHp) <= phases[at2] * 0.15) return phases.slice(at2 + 1);
  return [Math.round(maxHp * 1.5)];
}
function restAheadOfBoss(state) {
  const floor = state.run?.floor ?? null;
  if (floor === null) return false;
  const boss = BOSS_FLOORS.find((entry) => entry >= floor);
  if (boss === void 0 || floor >= boss) return false;
  if (floor < boss - 1) return true;
  const rest = asRecord(state.raw["rest"]);
  return state.screen === "REST" && asArray(rest["options"]).map(asRecord).some((option) => option["is_enabled"] === true && str(option["option_id"]).toUpperCase() === "HEAL");
}
function expectedEntryHp(state) {
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  if (max === null || max <= 0) return hp ?? 70;
  const now = hp ?? max;
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const bossHeal = bossStartHealOf(relicIds);
  if (state.in_combat && BOSS_FLOORS.includes(state.run?.floor ?? -1)) return now;
  if (!restAheadOfBoss(state)) return bossEntryHp(now, max, bossHeal);
  const deckSize = state.screen === "REST" ? 0 : asArray(asRecord(state.run?.raw)["deck"]).length;
  const rested = restedHp(now, max, restHealOf(relicIds, deckSize));
  return bossEntryHp(rested.hp, rested.max, bossHeal);
}
function clockCharacter(state) {
  const run = asRecord(state.run?.raw);
  return characterKey(str(run["character_id"]) || str(run["character_name"])) ?? knowledgeCharacter();
}
function bossClock(state, knowledge, entryHpOverride) {
  const character2 = clockCharacter(state);
  if (character2 !== DEFAULT_CHARACTER) return null;
  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  const profile = bossProfile(bossId);
  if (!profile) return null;
  const ascension = state.run?.ascension ?? 0;
  const deck = deckProfileForBoss(state, knowledge);
  const entryHp = entryHpOverride ?? expectedEntryHp(state);
  const loss = bossLossPerTurn(
    profile,
    ascension,
    deck?.turnBlock && deck.turnBlock.some((b) => b > 0) ? { byTurn: deck.turnBlock, names: deck.passiveBlock ?? [], share: CLOCK_PASSIVE_BLOCK_SHARE } : turnBlockOf(asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]))),
    character2
  );
  if (loss.value === null) return null;
  const survive = survivableTurns(profile, entryHp, loss.value);
  const estimateAt = (turns) => deck ? deckEstimate(deck, bossId, turns) ?? 0 : 0;
  const base = {
    boss: profile.id,
    ascension,
    entryHp,
    survivableTurns: survive,
    mechanic: bossMechanic(profile, ascension),
    note: bossNote(profile, ascension),
    growth: deck?.growth ?? [],
    passive: deck?.passive ?? [],
    ...deck?.passiveBlock && deck.passiveBlock.length > 0 ? { passiveBlock: deck.passiveBlock } : {},
    ...deck?.passivePieces ? { passivePieces: true } : {},
    lossPerTurn: loss.value,
    lossNote: loss.source
  };
  if (profile.id === "TEST_SUBJECT") {
    const [p1, p2, p3] = testSubjectPhases(ascension);
    const est1 = Math.max(1, estimateAt(4));
    const turns1 = Math.max(2, Math.min(5, Math.ceil(p1 / est1)));
    const hpAt2 = Math.max(1, entryHp - TEST_SUBJECT_PHASE1_LOSS * turns1);
    const loss2 = testSubjectPhase2Loss(ascension, character2);
    if (loss2.value === null) return null;
    const turns2 = Math.max(3, Math.min(5, Math.round(hpAt2 / Math.max(1, loss2.value))));
    const turns3 = 6;
    const damageTurns3 = turns3 - testSubjectIntangibleTurns(turns3);
    const need2 = Math.round(p2 / turns2);
    const need3 = Math.round(p3 / damageTurns3);
    const fightTurns2 = turns1 + turns2 + turns3;
    const deckNow2 = estimateAt(turns1 + turns2);
    const need4 = Math.max(need2, need3);
    return {
      ...base,
      hp: p1 + p2 + p3,
      hpNote: `three phases ${p1}/${p2}/${p3} ${bossHpSource(profile, ascension)}`,
      fightTurns: fightTurns2,
      turnsNote: `phase 1 ~${turns1} turns at the deck's pace; phase 2 must die within ~${turns2} turns of Multi Claw at ~${hpAt2} HP (${loss2.source}); phase 3 assumed ${turns3}, ${damageTurns3} of them without Nemesis' Intangible`,
      need: need4,
      deck: deckNow2,
      gap: Math.max(0, need4 - deckNow2),
      phases: [
        { phase: 1, hp: p1, turns: turns1, need: Math.round(p1 / turns1) },
        { phase: 2, hp: p2, turns: turns2, need: need2 },
        { phase: 3, hp: p3, turns: turns3, need: need3 }
      ]
    };
  }
  let cap = profile.scriptTurns;
  let capWhy = `script ${profile.scriptTurns}`;
  if (profile.id === "WATERFALL_GIANT") {
    const eruption = eruptionTurns(entryHp, loss.value, ascension);
    if (eruption < cap) {
      cap = eruption;
      capWhy = `eruption kill by T${eruption}`;
    }
  }
  const fightTurns = Math.max(3, Math.min(cap, survive));
  const deckNow = estimateAt(fightTurns);
  const hp = bossHp(profile, ascension) + extraHp(profile.id, deck, fightTurns, deckNow);
  const need = Math.round(hp / fightTurns);
  const extra = hp - bossHp(profile, ascension);
  const parts = bossHpParts(profile, ascension);
  return {
    ...base,
    hp,
    hpNote: `${parts.body} ${bossHpSource(profile, ascension)}${parts.added > 0 ? ` + ${parts.added} (${profile.addedHpWhy ?? "what its mechanic adds"})` : ""}${extra > 0 ? ` + ${extra} (${profile.id === "VANTOM" ? `Slippery: ~${slipperyTurns(deck, fightTurns).toFixed(1)} turns of hits dealing 1` : "heals"})` : ""}`,
    fightTurns,
    turnsNote: `min(${capWhy}, survive ~${survive} at ${entryHp} HP losing ~${loss.value}/turn: ${loss.source})`,
    need,
    deck: deckNow,
    gap: Math.max(0, need - deckNow)
  };
}
function damageGap(state, knowledge) {
  if (BOSS_FLOORS.includes(state.run?.floor ?? 0)) return null;
  const clock = bossClock(state, knowledge);
  if (!clock) return null;
  return { boss: clock.boss, need: clock.need, deck: clock.deck, gap: clock.gap };
}
var BRIMSTONE_STRENGTH, BOSSES, unblockedCache, GUIDE_FACTS, BAND_FACTS, BAND_TOKEN, BAND_MARKED, CARD_OUTCOME, CARD_OUTCOME_MARKED, FEW_RECORDS, RECORD_ASCENSIONS, RECORD_BAND_FROM, LAG_BURST_PCT, ACT1_BOSSES, SIPHON_HEAL, PONDER_HEAL, GUN_FALLBACK, ENERGY_RELICS, SEAL_OF_GOLD_COST, TYPICAL_FIGHT_TURNS, LATE_ENERGY_SHARE, HAND, ESTIMATE_BASE, ESTIMATE_SLOPE, VULNERABLE_UPTIME, SLIPPERY_STACKS, PASSIVE_BLOCK_TURNS, ERUPTION_FALLBACK, ERUPTION_SURVIVAL_BLOCK, TEST_SUBJECT_PHASE1_LOSS, TEST_SUBJECT_PHASE2_LOSS_FALLBACK, TEST_SUBJECT_PHASE2_CLAWS, BOSS_FLOORS;
var init_boss_clock = __esm({
  "src/sim/boss-clock.ts"() {
    "use strict";
    init_experience();
    init_outcome_tables();
    init_boss_phase();
    init_monster_db();
    init_room_costs();
    init_json();
    init_card_model();
    init_card_value();
    init_passive_pieces();
    init_route_projection();
    init_data_version();
    init_files();
    BRIMSTONE_STRENGTH = 2;
    BOSSES = {
      // Crusher 209 + Rocket 199 (A8: 219 + 209). The two wins took 7-8 turns; Bug Sting -> Laser opener.
      KAISER_CRAB: { hp: 408, hpA8: 428, scriptTurns: 8, lossPerTurn: 10, note: "two claws: single-target damage into the Rocket first (Laser {DMG:ROCKET:LASER_MOVE}, {BEHIND:ROCKET:LASER_MOVE} from behind, plus Strength, on T4/T9), AoE into both; the survivor's +99 Block lasts one turn ({CRAB_KILLS}; experience crab-kill-order); Bug Sting then Laser from T3-T4", mechanic: "two bodies: single-target damage is split; AoE hits both" },
      // 379 (A8 399) plus two 30-HP Ponder heals; the T11 Overwhelming (12x3 and more) ends long fights (NZWR).
      KNOWLEDGE_DEMON: { hp: 379, hpA8: 399, scriptTurns: 11, lossPerTurn: 6.3, note: "heals 30 twice (Ponder), curses the deck on T1/T5/T9; Strength scaling wins", mechanic: "curses from T1: Sloth caps plays at 3 a turn, Mind Rot draws one less from T5; +60 HP of heals" },
      THE_INSATIABLE: { hp: 321, hpA8: 341, scriptTurns: 8, lossPerTurn: 8.9, note: "Sandpit starts at {POWER:THE_INSATIABLE:SANDPIT_POWER}, eaten at 0; each Frantic Escape adds a turn, which only helps while the Sandpit would end the fight before our HP does ({SANDPIT_DEATHS_EN}; experience insatiable-escape)", mechanic: "Sandpit: the fight ends around T7 unless Frantic Escapes push it back" },
      // 512 (A8 535) plus two 33-block Ebb turns (L34T: 48 a turn, left at 173; M6P7: 33 a turn, left at 234).
      AEONGLASS: { hp: 578, hpA8: 601, addedHp: 66, addedHpWhy: "Ebb's block", scriptTurns: 9, lossPerTurn: 8.6, note: "Artifact {POWER:AEONGLASS:ARTIFACT_POWER} at start; Ebb gains {BLOCK:AEONGLASS:EBB_MOVE} block every 3rd turn; a Wither every {POWER:AEONGLASS:WITHERING_PRESENCE_POWER} cards played: few big cards", mechanic: "Artifact eats Vulnerable; two Ebbs of {BLOCK:AEONGLASS:EBB_MOVE} block; small cards feed Withers" },
      // Queen 400 (A8 419) plus ~20 block a turn while the Amalgam lives (~60). The Amalgam (199, A8 211) leaves
      // when she dies (notes/bosses.md; VE97, CWU9 ended with the Queen alone): its HP only counts when it
      // is killed first for survival.
      QUEEN: { hp: 460, hpA8: 480, hpParts: ["QUEEN"], addedHp: 60, addedHpWhy: "her block", scriptTurns: 8, lossPerTurn: 13.3, note: "kill the Amalgam first, single-target damage from turn 1 too, the Queen takes only AoE ({QUEEN_AMALGAM_EN}; experience queen-plan); from her third turn the Amalgam hits {DMG:TORCH_HEAD_AMALGAM:BEAM_MOVE}/{DMG:TORCH_HEAD_AMALGAM:TACKLE_3_MOVE} base, each hit x1.5 under our 99 Vulnerable (Weak and Frail on us too); when the Amalgam dies she Enrages that enemy turn (+2 Strength, no attack) and the enemy turn after is Off With Your Head (base {DMG:QUEEN:OFF_WITH_YOUR_HEAD_MOVE}, each hit x1.5 plus her Strength: 35 at A8 the first time): end the turn after the kill with HP plus block above it (6 of the 11 losses that killed the Amalgam died to that first hit)", mechanic: '"You are mine" from her T3: Weak (-25% damage), Vulnerable and Frail for the rest of the fight; ~60 Queen block; the Amalgam ({HP:TORCH_HEAD_AMALGAM}) adds its HP only if killed first' },
      // Three phases, 100/200/300 (A8 111/212/313 as logged).
      TEST_SUBJECT: { hp: 600, hpA8: 636, scriptTurns: 12, lossPerTurn: 7.5, note: "three phases ({PHASES} HP); Painful Stabs Wounds on unblocked hits; Multi Claw grows each use", mechanic: "phase 2 is a race: Multi Claw starts {DMG:TEST_SUBJECT:MULTI_CLAW_MOVE} and gains a hit every turn (D3X1: dead on its 5th)" },
      LAGAVULIN_MATRIARCH: { hp: 222, hpA8: 233, scriptTurns: 12, lossPerTurn: 5.8, note: "sleeps two turns (play powers), then drains Strength/Dexterity", mechanic: "drains Strength and Dexterity each cycle after it wakes" },
      SOUL_FYSH: { hp: 211, hpA8: 221, scriptTurns: 12, lossPerTurn: 5.1, note: "shuffles Beckons into the deck, Intangible turns; Scream ({DMG:SOUL_FYSH:SCREAM_MOVE}) puts {APPLIES:SOUL_FYSH:SCREAM_MOVE:VULNERABLE_POWER} Vulnerable on us, and De-Gas ({DMG:SOUL_FYSH:DE_GAS_MOVE}) then hits x1.5", mechanic: "Intangible turns (each hit deals 1) and Beckons clogging the draw" },
      // Priest 190 (A8 199) plus two followers ~59 (A8 62/63); the fight ends with the priest, winners dealt
      // ~60 into the followers on the way.
      THE_KIN: { hp: 250, hpA8: 260, hpParts: ["KIN_PRIEST"], addedHp: 60, addedHpWhy: "the followers soaking hits", scriptTurns: 10, lossPerTurn: 10.1, note: "priest {KIN_PRIEST} plus two followers ~{KIN_FOLLOWER}: AoE; priest cycle Orb of Frailty, Orb of Weakness, Beam {DMG:KIN_PRIEST:BEAM_MOVE} plus Strength a hit on T3/T7/T11, Ritual (+{GAIN:KIN_PRIEST:RITUAL_MOVE:STRENGTH_POWER} Strength): be above the T11 Beam (~{KIN_BEAM_T11})", mechanic: "followers soak single-target damage; Ritual grows the Beam every cycle" },
      VANTOM: { hp: 173, hpA8: 183, scriptTurns: 11, lossPerTurn: 7.3, note: "{POWER:VANTOM:SLIPPERY_POWER} Slippery stacks: multi-hit", mechanic: "Slippery {POWER:VANTOM:SLIPPERY_POWER}: its next {POWER:VANTOM:SLIPPERY_POWER} HP losses are 1 each (64ZB: 9 damage in T1-T4); multi-hit strips it" },
      // 240 (A8 250) plus Siphon heals (~20: winners dealt 250-285).
      WATERFALL_GIANT: { hp: 260, hpA8: 270, addedHp: 20, addedHpWhy: "Siphon heals", scriptTurns: 14, lossPerTurn: 5.1, note: "Siphon heals {SIPHON}; Pressure Gun on T5/T10/T15 ({GUN}): block it fully; Steam Eruption explodes for its stacks when it dies", mechanic: "eruption {ERUPTION} explodes on the kill: HP at the kill plus that turn's block must cover the stacks ({GIANT_BLOCK}; ERPH: T14 kill, 51 into 25 HP); an earlier kill has fewer stacks but is lost too without the HP ({GIANT_KILLS}; experience giant-explode)" },
      // 252 (A8 262); Ringing turns allow one card (02L4 T6, T9: 0 damage).
      CEREMONIAL_BEAST: { hp: 252, hpA8: 262, scriptTurns: 12, lossPerTurn: 6.2, note: "stunned when HP first drops to {POWER:CEREMONIAL_BEAST:PLOW_POWER}; Ringing turns allow one card: keep block potions for them", mechanic: "Ringing: every third turn from T6 you play one card (02L4: T6 and T9 dealt 0)" }
    };
    unblockedCache = null;
    GUIDE_FACTS = {
      "{GIANT_BLOCK_RECORD}": () => giantBlockRecord("zh"),
      "{GIANT_KILLS_A8}": () => giantKillRecord(8, "zh"),
      "{GIANT_KILLS_A9}": () => giantKillRecord(9, "zh"),
      "{CRAB_KILL_ORDER}": () => crabKillRecord("zh"),
      "{CRAB_KILLS_EN}": () => crabKillShort(),
      "{LAG_SLEEP}": () => lagSleepRecord("zh"),
      "{LAG_NO_STRENGTH_EN}": () => lagSleepRecord("en"),
      "{BEAST_STUN}": () => powerAmountByAscText("CEREMONIAL_BEAST", "PLOW_POWER") ?? "?",
      "{LASER_T4}": () => laserT4Text(),
      "{ACT1_ENTRY_HP}": () => act1EntryHp(),
      "{UNKNOWN_FIGHTS}": () => unknownFightsText(),
      "{QUEEN_AMALGAM}": () => queenAmalgamRecord("zh"),
      "{QUEEN_AMALGAM_EN}": () => queenAmalgamRecord("en"),
      "{SANDPIT_DEATHS}": () => sandpitDeathRecord("zh"),
      "{SANDPIT_DEATHS_EN}": () => sandpitDeathRecord("en")
    };
    BAND_FACTS = {
      GIANT_BLOCK_RECORD: (ascension) => giantBlockRecord("zh", ascension),
      CRAB_KILL_ORDER: (ascension) => crabKillRecord("zh", ascension),
      CRAB_KILLS_EN: (ascension) => crabKillShort(void 0, recordBand(ascension)),
      LAG_SLEEP: (ascension) => lagSleepRecord("zh", ascension),
      QUEEN_AMALGAM: (ascension) => queenAmalgamRecord("zh", ascension),
      QUEEN_AMALGAM_EN: (ascension) => queenAmalgamRecord("en", ascension),
      SANDPIT_DEATHS: (ascension) => sandpitDeathRecord("zh", ascension),
      SANDPIT_DEATHS_EN: (ascension) => sandpitDeathRecord("en", ascension)
    };
    BAND_TOKEN = new RegExp(`\\{(${Object.keys(BAND_FACTS).join("|")})\\}`, "g");
    BAND_MARKED = /\{@(\d+):([A-Z_]+)\}/g;
    CARD_OUTCOME = /\{CARD_OUTCOME:([A-Z_]+)\}/g;
    CARD_OUTCOME_MARKED = /\{@(\d+):CARD_OUTCOME:([A-Z_]+)\}/g;
    FEW_RECORDS = "\u8FD8\u6CA1\u6709\u8DB3\u591F\u7684\u8BB0\u5F55";
    RECORD_ASCENSIONS = [8, 9];
    RECORD_BAND_FROM = 8;
    LAG_BURST_PCT = 25;
    ACT1_BOSSES = ["VANTOM", "CEREMONIAL_BEAST", "THE_KIN", "LAGAVULIN_MATRIARCH", "SOUL_FYSH", "WATERFALL_GIANT"];
    SIPHON_HEAL = { base: 10, a8: 15 };
    PONDER_HEAL = 30;
    GUN_FALLBACK = { first: 20, step: 5 };
    ENERGY_RELICS = /* @__PURE__ */ new Set([
      "BLESSED_ANTLER",
      "BLOOD_SOAKED_ROSE",
      "BREAD",
      "ECTOPLASM",
      "PAELS_FLESH",
      "PHILOSOPHERS_STONE",
      "PRISMATIC_GEM",
      "PUMPKIN_CANDLE",
      "SOZU",
      "SPIKED_GAUNTLETS",
      "VELVET_CHOKER",
      "WHISPERING_EARRING"
    ]);
    SEAL_OF_GOLD_COST = 3;
    TYPICAL_FIGHT_TURNS = 8;
    LATE_ENERGY_SHARE = 0.25;
    HAND = 5;
    ESTIMATE_BASE = 11;
    ESTIMATE_SLOPE = 0.92;
    VULNERABLE_UPTIME = 1.2;
    SLIPPERY_STACKS = 9;
    PASSIVE_BLOCK_TURNS = 30;
    ERUPTION_FALLBACK = { first: 15, firstTurn: 2, perTurn: 3 };
    ERUPTION_SURVIVAL_BLOCK = 12;
    TEST_SUBJECT_PHASE1_LOSS = 3;
    TEST_SUBJECT_PHASE2_LOSS_FALLBACK = 15;
    TEST_SUBJECT_PHASE2_CLAWS = 4;
    BOSS_FLOORS = [17, 33, 48];
  }
});

// src/reflex/fight-value.ts
import { readFileSync as readFileSync7 } from "node:fs";
function loadFightValueModel() {
  if (cached4 !== void 0) return cached4;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "fight-value.json");
    cached4 = JSON.parse(readFileSync7(path, "utf8"));
  } catch {
    cached4 = null;
  }
  return cached4;
}
function gbmRaw(model2, x) {
  let total = model2.base;
  for (const tree of model2.trees) {
    let node = tree;
    while (typeof node !== "number") node = (x[node[0]] ?? 0) < node[1] ? node[2] : node[3];
    total += model2.lr * node;
  }
  return total;
}
function gbmPredict(model2, x) {
  const raw = gbmRaw(model2, x);
  return model2.loss === "logloss" ? 1 / (1 + Math.exp(-raw)) : raw;
}
function encode(encoder, input) {
  const values = input.enemyIds.map((id) => encoder.monster[id]?.[0] ?? encoder.prior);
  return {
    mon_te_max: values.length > 0 ? Math.max(...values) : encoder.prior,
    mon_te_sum: values.reduce((sum, v) => sum + v, 0),
    enc_te: encoder.encounter[input.encounter]?.[0] ?? encoder.prior
  };
}
function supportKeys(input) {
  const ehp = Math.min(4, Math.floor((input.features["enemy_hp_frac"] ?? 0) * 5));
  const php = Math.min(3, Math.floor((input.features["hp_frac"] ?? 0) * 4));
  return [`k|${input.kind}|${input.act}|${ehp}|${php}`, `e|${input.encounter}|${ehp}|${php}`];
}
function valueOf(input, model2 = loadFightValueModel()) {
  if (!model2) return null;
  const named = { ...input.features };
  for (const [k, v] of Object.entries(encode(model2.encoders.loss, input))) named[`loss_${k}`] = v;
  for (const [k, v] of Object.entries(encode(model2.encoders.win, input))) named[`win_${k}`] = v;
  const x = model2.features.map((name) => named[name] ?? 0);
  let n = 0;
  for (const key of supportKeys(input)) {
    const cell = model2.support.hp_loss[key];
    if (cell && cell[1] > 0) n = cell[1];
  }
  if (input.features["n_living"] === 0) return { hpLoss: 0, winProb: 1, turns: 0, n, confidence: n / (n + model2.support.k) };
  return {
    hpLoss: Math.max(0, gbmPredict(model2.gbm.hp_loss, x)),
    winProb: gbmPredict(model2.gbm.win, x),
    turns: Math.max(0, gbmPredict(model2.gbm.turns, x)),
    n,
    confidence: n / (n + model2.support.k)
  };
}
var cached4;
var init_fight_value = __esm({
  "src/reflex/fight-value.ts"() {
    "use strict";
    init_files();
  }
});

// src/reflex/turn-solver.ts
function powerWent(power, enemy, start) {
  if (power === "STOCK_POWER") {
    const stock = start.stock ?? 0;
    return stock > 0 && enemy.alive === false ? stock <= 1 ? "removed" : "lowered" : null;
  }
  if (power === "CRAB_RAGE_POWER") return start.crabRage === true && enemy.crabRage !== true ? "removed" : null;
  const field = STRIP_COUNTERS[power];
  if (field === void 0) return null;
  const before = start[field] ?? 0;
  const after = enemy[field] ?? 0;
  if (before <= 0) return null;
  return after <= 0 ? "removed" : after < before ? "lowered" : null;
}
function ruledMove(enemy, start) {
  if (!enemy.moveOnStrip || !start) return null;
  for (const rule of enemy.moveOnStrip) if (powerWent(rule.power, enemy, start) === rule.how) return rule;
  return null;
}
function diedForGood(enemy, start) {
  if (!enemy || !start || start.hp <= 0 || enemy.alive !== false) return false;
  return !start.illusion && !((start.stock ?? 0) > 0) && !start.reattach && !start.revives && !((start.eruption ?? 0) > 0);
}
function deathMoved(enemy, sim, input) {
  if (!enemy.moveOnDeath || enemy.alive === false) return null;
  for (const rule of enemy.moveOnDeath) {
    if (diedForGood(sim.enemies.find((entry) => entry.index === rule.ally), input.enemies.find((entry) => entry.index === rule.ally))) return rule;
  }
  return null;
}
function strippedStun(enemy, start) {
  if (!enemy.stunOnStrip || !start) return null;
  for (const rule of enemy.stunOnStrip) {
    const field = STRIP_COUNTERS[rule.power];
    if (field === void 0) continue;
    if ((start[field] ?? 0) > 0 && (enemy[field] ?? 0) <= 0) return rule;
  }
  return null;
}
function reviveThrough(startHp, losses, revives) {
  let hp = startHp;
  const used = [];
  for (const loss of losses) {
    if (loss === 0) continue;
    hp -= loss;
    if (hp <= 0 && used.length < revives.length) {
      hp = revives[used.length].hp;
      used.push(revives[used.length]);
    }
  }
  return { hp, used };
}
function turnsLeftOf(input) {
  const limits = input.enemies.filter((enemy) => enemy.hp > 0 && (enemy.timeLimit ?? 0) > 0).map((enemy) => enemy.timeLimit);
  return limits.length > 0 ? Math.min(...limits) : null;
}
function quietTurn(input) {
  return input.enemies.every((enemy) => enemy.attacks.every((attack) => attack.damage * attack.hits <= 0));
}
function pileValue(pile, hpWeight, blockIsIdle = false) {
  if (!pile || pile.length === 0) return null;
  let withEnergy = 0;
  let withoutEnergy = 0;
  for (const card of pile) {
    const penalty = card.heldPenalty * hpWeight;
    if (penalty > 0) {
      withEnergy -= card.playable ? Math.min(DRAW_VALUE, penalty) : penalty;
      withoutEnergy -= penalty;
    } else if (blockIsIdle && card.block) {
    } else if (card.playable) {
      withEnergy += DRAW_VALUE;
    }
  }
  const strikes = pile.filter((card) => card.strike && card.playable && !(card.heldPenalty > 0)).length;
  return { size: pile.length, withEnergy: withEnergy / pile.length, withoutEnergy: withoutEnergy / pile.length, strikeShare: strikes / pile.length };
}
function drawOne(sim) {
  const pile = sim.pile;
  if (!pile || sim.pileDrawn >= pile.size) return { withEnergy: DRAW_VALUE, withoutEnergy: DRAW_IDLE_VALUE };
  sim.pileDrawn += 1;
  const hellraised3 = sim.hellraiser ? pile.strikeShare * DRAW_VALUE : 0;
  return { withEnergy: pile.withEnergy, withoutEnergy: Math.min(DRAW_IDLE_VALUE, pile.withoutEnergy) + hellraised3 };
}
function drawScoreAt(draws, energyLeft) {
  let spare = Math.max(0, energyLeft);
  let score = 0;
  for (const draw of draws) {
    const use = Math.min(1, spare);
    spare -= use;
    score += use * draw.withEnergy + (1 - use) * draw.withoutEnergy;
  }
  return score;
}
function isJunk(card) {
  return card.type === "Status" || card.type === "Curse";
}
function exhaustValue(card, weights) {
  if (isJunk(card)) return -(card.heldPenalty ?? 0) * weights.hp;
  if (card.cardId === "HOWL_FROM_BEYOND") return -HOWL_EXHAUST_VALUE;
  const damage = (card.damage ?? 0) * Math.max(1, card.hits) * weights.damage;
  const block = card.block * weights.hp * 0.5;
  const debuffs = weights.vulnerable * card.vulnerable + weights.weak * card.weak;
  const lasting = weights.strength * card.strength + card.flatValue;
  return Math.max(DRAW_IDLE_VALUE, damage + debuffs, block, lasting, DRAW_VALUE * card.draw);
}
function exhaustPick(cards, sandpit = false) {
  const weights = EXHAUST_WEIGHTS;
  let best = null;
  for (const card of cards) {
    if (card.type === "Potion") continue;
    if (sandpit && card.cardId === "FRANTIC_ESCAPE") continue;
    if (!best || exhaustValue(card, weights) < exhaustValue(best, weights)) best = card;
  }
  return best ?? (sandpit ? cards.find((card) => card.cardId === "FRANTIC_ESCAPE") ?? null : null);
}
function gambleWays(sim, brew) {
  const enemies = Math.max(1, sim.enemies.filter((enemy) => enemy.alive).length);
  const cards = sim.hand.filter((entry) => entry.type !== "Potion").sort((a, b) => thisTurnScore(a, 0, enemies) - thisTurnScore(b, 0, enemies)).slice(0, GAMBLE_MAX_CARDS);
  const ways = [];
  for (let mask = 1; mask < 1 << cards.length; mask += 1) ways.push({ ...brew, discards: cards.filter((_, bit) => mask & 1 << bit).map((entry) => entry.key) });
  return ways;
}
function hiddenDaggers(card) {
  return card.cardId === "HIDDEN_DAGGERS" && !card.upgraded && card.discardCount === 2;
}
function hiddenDaggerWays(sim, card) {
  const cards = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry !== card && entry.type !== "Potion");
  const ways = [];
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) ways.push({ ...card, discards: [cards[i].key, cards[j].key] });
  }
  return ways.length > 0 ? ways : [card];
}
function bandagesDiscard(sim, selection, player) {
  const pool = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry.type !== "Potion");
  const picked = selection === void 0 ? void 0 : pool.find((entry) => entry.key === selection || entry.cardId === selection);
  if (picked) {
    sim.hand = sim.hand.filter((entry) => entry !== picked);
    sim.held = sim.held.filter((entry) => entry !== picked);
    sim.locked = sim.locked.filter((entry) => entry !== picked);
    gainBlock(sim, player.toughBandagesBlock ?? 0, player);
    return picked.cardId;
  }
  if (pool.length + sim.drawnInHand - (sim.unresolvedDiscards ?? 0) <= 0) return null;
  sim.pendingSelection = true;
  sim.unknown = [...sim.unknown, "\u5F03\u724C\u9009\u62E9\u672A\u786E\u5B9A"];
  if (sim.drawnInHand > 0) {
    sim.drawnInHand -= 1;
    gainBlock(sim, player.toughBandagesBlock ?? 0, player);
  } else if (selection === void 0) {
    gainBlock(sim, player.toughBandagesBlock ?? 0, player);
    sim.unresolvedDiscards = (sim.unresolvedDiscards ?? 0) + 1;
  }
  return null;
}
function choiceWays(potion) {
  return (potion.choices ?? []).map((card) => {
    const { choices: _offer, ...rest } = potion;
    return { ...rest, generates: card, name: `${potion.name} (take ${card.name})` };
  });
}
function loseHp(sim, amount, player) {
  if (amount <= 0) return false;
  if (sim.buffer > 0) {
    sim.buffer -= 1;
    sim.bufferSpent += 1;
    return false;
  }
  if (!(player.demonTongue && !sim.hpLostThisTurn)) sim.hp -= amount;
  sim.hpLostThisTurn = true;
  sim.hpLossEvents += 1;
  redSkullCheck(sim, player);
  if (sim.rupture > 0) {
    sim.strength += sim.rupture;
    sim.permStrength += sim.rupture;
  }
  if (sim.inferno > 0) {
    const outer = sim.sweeping === true;
    sim.sweeping = true;
    for (const enemy of sim.enemies) if (enemy.alive) hitEnemyRaw(sim, enemy, sim.inferno);
    sim.sweeping = outer;
    if (!outer && sim.pendingRage) {
      sim.pendingRage = false;
      crabRage(sim);
    }
  }
  return true;
}
function redSkullCheck(sim, player) {
  const skull = player.redSkull ?? 0;
  if (skull <= 0) return;
  const low = sim.hp * 2 <= player.maxHp;
  if (low === sim.skullUp) return;
  sim.skullUp = low;
  sim.strength += low ? skull : -skull;
}
function applyDebuff(enemy, kind, amount) {
  if (amount <= 0) return 0;
  if (enemy.artifact > 0) {
    enemy.artifact -= 1;
    return 0;
  }
  if (kind === "vulnerable") enemy.vulnerable += amount;
  else if (kind === "strengthLoss") enemy.strengthDelta -= amount;
  else if (kind === "poison") enemy.poison = (enemy.poison ?? 0) + amount;
  else if (kind === "weak") {
    if (enemy.weak === 0) enemy.newlyWeak = true;
    enemy.weak += amount;
  } else if (kind === "shrink") {
    if ((enemy.shrink ?? 0) === 0) enemy.newlyShrunk = true;
    enemy.shrink = (enemy.shrink ?? 0) + amount;
  } else if (kind === "tempStrengthLoss") enemy.tempStrengthLoss = (enemy.tempStrengthLoss ?? 0) + amount;
  else enemy.demise = (enemy.demise ?? 0) + amount;
  return amount;
}
function attackShrunk(card, sim, player) {
  const carried = card.shownShrunk === true;
  if (card.type === "Potion" || !sim.shrunk && !carried) return null;
  const shown = card.damage ?? 0;
  const strengthNow = player.strengthNow ?? 0;
  if (card.damageBase !== void 0 && card.special !== "body_slam" && Math.floor(ourAttackScaled(card.damageBase + strengthNow, player.weak, carried)) === shown) {
    const pre = card.damageBase + strengthNow;
    return { perHit: ourAttackScaled(pre + sim.strength, player.weak, sim.shrunk), pre };
  }
  const now = carried === sim.shrunk ? shown : carried ? Math.ceil(shown * 10 / 7) : shown * 7 / 10;
  return { perHit: now + ourAttackScaled(sim.strength, player.weak, sim.shrunk), pre: null };
}
function hitEnemy(sim, enemy, perHitBase, hits, player, potion = false, attack = false) {
  let dealt = 0;
  for (let hit = 0; hit < hits && enemy.alive; hit += 1) {
    let amount = perHitBase;
    if (enemy.vulnerable > 0 && !potion) amount = Math.floor(amount * (player.vulnerableFactor ?? 1.5));
    if (enemy.slow) amount = Math.floor(amount * (1 + 0.1 * sim.played));
    if ((enemy.flutter ?? 0) > 0) {
      amount = Math.floor(amount * 0.5);
      enemy.flutter = (enemy.flutter ?? 0) - 1;
    }
    if (enemy.unmodelled) amount = Math.floor(amount * 0.8);
    if (enemy.halved) amount = Math.floor(amount * 0.5);
    amount = Math.floor(amount);
    if (enemy.perHitCap !== null && enemy.perHitCap !== void 0) amount = Math.min(amount, enemy.perHitCap);
    if (enemy.intangible) amount = Math.min(amount, 1);
    amount = Math.max(0, amount);
    if ((enemy.skittish ?? 0) > 0 && amount > 0) enemy.skittishHit = true;
    sim.dazedAdded += enemy.dazedPerHit ?? 0;
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    if (enemy.reflect && absorbed > 0) loseHp(sim, absorbed, player);
    let loss = amount - absorbed;
    if (loss > 0 && (enemy.slippery ?? 0) > 0) {
      loss = 1;
      enemy.slippery = (enemy.slippery ?? 0) - 1;
    }
    if (enemy.hpLossCap !== null && enemy.hpLossCap !== void 0) loss = Math.min(loss, Math.max(0, enemy.hpLossCap - enemy.lostThisTurn));
    loss = Math.min(enemy.hp, loss);
    enemy.hp -= loss;
    enemy.lostThisTurn += loss;
    dealt += loss;
    if (attack && loss > 0 && enemy.hp > 0 && sim.envenom > 0) applyDebuff(enemy, "poison", sim.envenom);
    if (loss > 0) wake(enemy);
    if ((enemy.thorns ?? 0) > 0) damagePlayer(sim, enemy.thorns ?? 0, player);
    if (amount > 0 && (enemy.curlUp ?? 0) > 0) {
      enemy.block += enemy.curlUp ?? 0;
      enemy.curlUp = 0;
    }
    if (enemy.hp <= 0) killEnemy(sim, enemy);
  }
  sim.damageDealt += dealt;
  return dealt;
}
function wake(enemy) {
  if ((enemy.asleep ?? 0) > 0) {
    enemy.sleepLost = (enemy.sleepLost ?? 0) + Math.max(0, (enemy.asleep ?? 0) - 1);
    enemy.asleep = 0;
  } else if ((enemy.slumber ?? 0) > 0) {
    enemy.sleepLost = (enemy.sleepLost ?? 0) + 1;
    enemy.slumber = (enemy.slumber ?? 0) - 1;
  }
}
function killEnemy(sim, enemy) {
  enemy.alive = false;
  if (enemy.shrinksUs && sim.shrunk && !sim.enemies.some((other) => other.alive && other.shrinksUs)) sim.shrunk = false;
  for (const other of sim.enemies) {
    if (other === enemy || !other.alive || (other.ravenous ?? 0) <= 0) continue;
    other.ravenousStunned = true;
    other.strengthDelta += other.ravenous ?? 0;
  }
  if (sim.sweeping) sim.pendingRage = true;
  else crabRage(sim);
}
function triggerPoison(sim, enemy, triggers, observedCap = Infinity) {
  for (let k = 0; k < triggers && enemy.alive && (enemy.poison ?? 0) > 0; k += 1) {
    let lost = Math.min(enemy.hp, enemy.intangible ? 1 : enemy.poison ?? 0, observedCap);
    if (lost > 0 && (enemy.slippery ?? 0) > 0) {
      lost = 1;
      enemy.slippery = (enemy.slippery ?? 0) - 1;
    }
    enemy.hp -= lost;
    enemy.poison = Math.max(0, (enemy.poison ?? 0) - 1);
    sim.damageDealt += lost;
    if (enemy.hp <= 0) killEnemy(sim, enemy);
  }
}
function crabRage(sim) {
  for (const other of sim.enemies) {
    if (!other.alive || !other.crabRage) continue;
    other.block += CRAB_RAGE_BLOCK;
    other.strengthDelta += CRAB_RAGE_STRENGTH;
    other.crabRage = false;
    sim.enraged += 1;
  }
}
function clone(sim) {
  return {
    ...sim,
    hand: sim.hand,
    enemies: sim.enemies.map((enemy) => ({ ...enemy, attacks: enemy.attacks })),
    steps: sim.steps,
    unknown: sim.unknown
  };
}
function playFirstHeld(sim) {
  return sim.hand.some((entry) => entry.playFirst === true && entry.type !== "Potion") || sim.held.some((entry) => entry.playFirst === true && entry.type !== "Potion");
}
function handConditionMet(sim, card, condition) {
  if (sim.drawnInHand > 0) return false;
  const others = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry !== card && entry.type !== "Potion");
  return condition === "empty" ? others.length === 0 : !others.some((entry) => entry.type === "Attack");
}
function unconditioned(card) {
  const { drawn: _drawn, ...rest } = card;
  return { ...rest, draw: 0, energyGain: 0, drawsUntil: false };
}
function play(sim, card, target, player, automatic = false) {
  if (sim.pendingSelection) return null;
  if (player.slothDefendReplay && card.type !== "Potion" && player.maxPlays != null && sim.slothPlays >= player.maxPlays) return null;
  const cost = card.type === "Attack" && sim.freeAttacks > 0 && !card.xCost ? 0 : card.xCost ? sim.energy : card.special === "stomp" ? Math.max(0, card.cost - sim.attacksPlayed) : card.cost;
  if (cost > sim.energy) return null;
  if (card.type !== "Potion" && card.playFirst !== true && playFirstHeld(sim)) return null;
  if (card.special === "free_card" && !freeCardPick(sim.hand)) return null;
  if (card.special === "ashwater" && ![...sim.hand, ...sim.held].some((entry) => entry !== card && entry.type !== "Potion" && (entry.cardId === "HOWL_FROM_BEYOND" || isJunk(entry)))) return null;
  if (!sim.noDraw && sim.topPlaced && (card.draw > 0 || card.drawsUntil || card.drawDiscardedHand) && (card.handCondition === void 0 || handConditionMet(sim, card, card.handCondition))) return null;
  const next = clone(sim);
  if (automatic && card.serpentForm !== void 0 && next.serpentForm !== null) {
    next.serpentForm = null;
    next.unknown = [...next.unknown, "\u7FA4\u86C7\u5F62\u6001\uFF08\u81EA\u52A8\u5EFA\u7ACB\u672A\u9A8C\u8BC1\uFF09"];
  }
  const hidden = hiddenDaggers(card);
  next.hand = sim.hand.filter((entry) => entry !== card && !((card.type === "Potion" || hidden) && entry.key === card.key));
  const discardPool = hidden ? [...next.hand, ...next.held, ...next.locked] : sim.hand;
  const discarded = card.discards ? discardPool.filter((entry) => card.discards.includes(entry.key)).map((entry) => entry.cardId) : [];
  if (hidden) {
    if (!card.adds || new Set(card.discards).size !== 2 || discarded.length !== 2) {
      next.pendingSelection = true;
      next.unknown = [...next.unknown, `${card.name}\uFF08\u5F03\u724C\u6216\u751F\u6210\u724C\u672A\u9A8C\u8BC1\uFF09`];
    } else {
      const leaves = new Set(card.discards);
      next.hand = next.hand.filter((entry) => !leaves.has(entry.key));
      next.held = next.held.filter((entry) => !leaves.has(entry.key));
      next.locked = next.locked.filter((entry) => !leaves.has(entry.key));
    }
  }
  let redraw = 0;
  if (card.discardsHand) {
    discarded.push(...[...next.hand, ...next.held, ...next.locked].filter((entry) => entry.type !== "Potion").map((entry) => entry.cardId));
    if ((player.toughBandagesBlock ?? 0) > 0) gainBlock(next, (discarded.length + next.drawnInHand) * player.toughBandagesBlock, player);
    if (card.drawDiscardedHand) redraw = discarded.length + next.drawnInHand;
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
    next.held = [];
    next.locked = [];
    next.drawnInHand = 0;
  }
  if (card.soulbound) {
    const locked = next.hand.filter((entry) => entry.soulbound && entry.type !== "Potion");
    next.hand = next.hand.filter((entry) => !entry.soulbound);
    if (locked.length > 0) next.locked = [...next.locked, ...locked];
  }
  next.energy -= cost;
  if ((player.helmetBlock ?? 0) > 0 && card.type !== "Potion" && cost >= HELMET_MIN_COST) gainBlock(next, player.helmetBlock ?? 0, player);
  if (card.target === "single" && !next.enemies.some((enemy) => enemy.index === target && enemy.alive)) return null;
  const twice = card.type !== "Potion" && next.duplicate > 0;
  if (twice) next.duplicate -= 1;
  const twiceAttack = card.type === "Attack" && next.duplicateAttacks > 0;
  if (twiceAttack) next.duplicateAttacks -= 1;
  const twiceSkill = card.type === "Skill" && next.duplicateSkills > 0;
  if (twiceSkill) next.duplicateSkills -= 1;
  const axe = card.type !== "Potion" && next.axeReplay;
  if (axe) next.axeReplay = false;
  const replays = card.type === "Potion" ? 0 : (card.replay ?? 0) + (isStrikeCard(card) ? next.strikeReplay : 0) + (axe ? 1 : 0);
  const plays = 1 + (twice ? 1 : 0) + (twiceAttack ? 1 : 0) + (twiceSkill ? 1 : 0) + replays;
  const unverifiedDodgeReplay = card.dodgeRollNextBlock && plays > 1;
  if (unverifiedDodgeReplay) next.unknown = [...next.unknown, `${card.name}\uFF08\u4E0B\u56DE\u5408\u683C\u6321\u91CD\u653E\u672A\u9A8C\u8BC1\uFF09`];
  if (player.slothDefendReplay && card.type !== "Potion") {
    const observed = card.cardId === "DEFEND_SILENT" && !card.upgraded && card.replay === 1 && plays === 2;
    next.slothPlays += observed ? 2 : 1;
    if (observed && player.maxPlays != null && next.slothPlays > player.maxPlays || !observed && plays > 1) {
      next.unknown = [...next.unknown, "\u61D2\u60F0\uFF08\u91CD\u653E\u540D\u989D\u8FB9\u754C\u672A\u9A8C\u8BC1\uFF09"];
    }
  }
  if (hidden && plays > 1) {
    next.pendingSelection = true;
    next.unknown = [...next.unknown, `${card.name}\uFF08\u91CD\u653E\u5F03\u724C\u672A\u9A8C\u8BC1\uFF09`];
  }
  if (card.bulletTime && (plays > 1 || automatic)) next.unknown = [...next.unknown, "\u5B50\u5F39\u65F6\u95F4\uFF08\u81EA\u52A8\u51FA\u724C\u6216\u91CD\u653E\u672A\u9A8C\u8BC1\uFF09"];
  for (let play2 = 0; play2 < plays; play2 += 1) {
    const serpent = next.serpentForm;
    const serpentTargets = next.enemies.filter((enemy) => enemy.alive);
    const effects = unverifiedDodgeReplay ? { ...card, dodgeRollNextBlock: false } : card;
    resolveEffects(next, card.handCondition !== void 0 && !handConditionMet(next, card, card.handCondition) ? unconditioned(effects) : effects, target, player, cost, plays === 1 && !automatic);
    if (card.type !== "Potion" && serpent !== null && serpent > 0) {
      if (serpent === 4 && plays === 1 && serpentTargets.length === 1 && !automatic && card.target !== "random" && card.serpentForm === void 0) {
        const victim = serpentTargets[0];
        if (victim.alive) hitEnemyRaw(next, victim, 4);
      } else next.unknown = [...next.unknown, "\u7FA4\u86C7\u5F62\u6001\uFF08\u968F\u673A\u76EE\u6807\u3001\u81EA\u52A8\u51FA\u724C\u3001\u91CD\u653E\u6216\u53E0\u52A0\u672A\u9A8C\u8BC1\uFF09"];
    }
    if ((player.toughBandagesBlock ?? 0) > 0 && card.discardAfterDraw) {
      const id = bandagesDiscard(next, card.discards?.[play2], player);
      if (id !== null) discarded.push(id);
    }
    if (card.type === "Attack") attackRelics(next, player);
    if (card.type === "Power" && (player.lostWisp ?? 0) > 0) sweepRaw(next, player.lostWisp ?? 0);
    if (card.type === "Power" && next.permafrostBlock > 0) {
      gainBlock(next, next.permafrostBlock, player);
      next.permafrostBlock = 0;
      if (plays > 1) next.unknown = [...next.unknown, "\u6C38\u51BB\u51B0\u6676\uFF08\u80FD\u529B\u91CD\u653E\u89E6\u53D1\u672A\u9A8C\u8BC1\uFF09"];
    }
    if (card.type === "Skill" && (player.letterOpener || player.tuningFork)) skillRelics(next, player);
  }
  if (redraw > 0) drawExpected(next, redraw, player);
  if (card.type !== "Potion") next.played += 1;
  if (card.type !== "Potion" && (player.tender ?? 0) > 0) {
    next.strength -= player.tender ?? 0;
    next.tempDex -= player.tender ?? 0;
  }
  if (card.type === "Skill") next.skillsPlayed += 1;
  if (card.type === "Attack") {
    next.attacksPlayed += 1;
    if (next.freeAttacks > 0) next.freeAttacks -= 1;
  }
  for (const enemy of next.enemies) {
    if (!enemy.skittishHit) continue;
    enemy.skittishHit = false;
    if (enemy.alive) enemy.block += enemy.skittish ?? 0;
    enemy.skittish = 0;
  }
  if (card.special === "duplicate_next") next.duplicate += 1;
  if (card.burst) next.duplicateSkills += card.burstSkills ?? 1;
  if (card.special === "double_next_attacks") next.duplicateAttacks += card.nextAttacks ?? 1;
  if (card.special === "free_next_attack") next.freeAttacks += 1;
  if (card.putsOnTop) next.topPlaced = true;
  const exhaustedBefore = next.exhausted.length;
  let randomBurned = 0;
  let drawnBurned = 0;
  if (card.special === "second_wind") {
    const taken = [...next.hand, ...next.held].filter((entry) => entry.type !== "Potion" && entry.type !== "Attack");
    next.exhausted = [...next.exhausted, ...taken];
    next.hand = next.hand.filter((entry) => !taken.includes(entry));
    next.held = next.held.filter((entry) => !taken.includes(entry));
    if (!next.noBlock && taken.length > 0) gainBlock(next, Math.max(0, card.block + next.tempDex) * taken.length, player);
  }
  if (card.special === "ashwater") {
    const taken = [...next.hand, ...next.held].filter((entry) => entry.type !== "Potion" && (entry.cardId === "HOWL_FROM_BEYOND" || isJunk(entry)));
    next.exhausted = [...next.exhausted, ...taken];
    next.hand = next.hand.filter((entry) => !taken.includes(entry));
    next.held = next.held.filter((entry) => !taken.includes(entry));
  }
  if (card.randomExhaust) {
    const pool = [...next.hand, ...next.held].filter((entry) => entry.type !== "Potion");
    if (pool.length > 0) {
      next.flat -= pool.reduce((sum, entry) => sum + Math.max(0, exhaustValue(entry, EXHAUST_WEIGHTS)), 0) / pool.length;
      next.exhaustedCount += 1;
      next.randomExhausts += 1;
      randomBurned = 1;
    }
    next.held = [...next.held, ...next.hand.filter((entry) => entry.type !== "Potion")];
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
  } else if (EXHAUST_PICKERS.has(card.cardId)) {
    const pick2 = exhaustPick([...next.held, ...next.hand], next.enemies.some((enemy) => enemy.alive && (enemy.sandpit ?? 0) > 0));
    if (pick2) {
      next.hand = next.hand.filter((entry) => entry !== pick2);
      next.held = next.held.filter((entry) => entry !== pick2);
      next.exhausted = [...next.exhausted, pick2];
    }
  } else if (card.special === "glowwater" || card.special === "bottled") {
    const bottled = card.special === "bottled";
    if (!bottled) drawnBurned = next.drawnInHand;
    next.drawnInHand = 0;
    if (!bottled) next.exhausted = [...next.exhausted, ...next.held, ...next.hand.filter((entry) => entry.type !== "Potion")];
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
    next.held = [];
    const room = bottled ? Number.POSITIVE_INFINITY : (player.drawable ?? Number.POSITIVE_INFINITY) - next.cardsDrawn;
    const count2 = next.noDraw ? 0 : Math.max(0, Math.min(bottled ? BOTTLED_DRAW : GLOWWATER_DRAW, player.handLimit ?? HAND_LIMIT, room));
    const draw = card.generates;
    if (card.drawn) drawCards(next, card.drawn.slice(0, count2), player, bottled);
    else if (draw) {
      next.hand = [...next.hand, ...Array.from({ length: count2 }, (_, i) => ({ ...draw, index: draw.index * 10 + i, key: `${draw.key}.${i}` }))];
      next.cardsDrawn += count2;
    }
  } else if (EXHAUST_HAND.has(card.cardId)) {
    drawnBurned = next.drawnInHand;
    next.drawnInHand = 0;
    next.exhausted = [...next.exhausted, ...next.held, ...next.hand.filter((entry) => entry.type !== "Potion")];
    next.hand = next.hand.filter((entry) => entry.type === "Potion");
    next.held = [];
  }
  const burned = next.exhausted.length - exhaustedBefore + drawnBurned;
  next.drawnExhausted += drawnBurned;
  next.exhaustedCount += burned + (card.exhausts && card.type !== "Potion" ? 1 : 0);
  if (next.feelNoPain > 0) {
    const count2 = burned + randomBurned + (card.exhausts && card.type !== "Potion" ? 1 : 0);
    if (count2 > 0) gainBlock(next, next.feelNoPain * count2, player);
  }
  exhaustDraws(next, burned + randomBurned + (card.exhausts && card.type !== "Potion" ? 1 : 0), player);
  if (card.feelNoPain) next.feelNoPain += card.feelNoPain;
  if (card.cardId === "HELLRAISER") next.hellraiser = true;
  if (card.cardId === "DARK_EMBRACE") next.darkEmbrace += 1;
  if (!card.known) next.unknown = [...next.unknown, card.name];
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target) ?? null;
  if (card.target === "single" && target !== null) next.facing = target;
  next.steps = [
    ...sim.steps,
    {
      cardIndex: card.index,
      cardId: card.cardId,
      upgraded: card.upgraded,
      cost: card.cost,
      name: card.name,
      target: card.target === "single" ? target : null,
      targetName: card.target === "single" && targetEnemy ? targetEnemy.name : null,
      ...hidden || card.discards || card.discardsHand ? { discards: discarded } : {},
      ...card.type === "Potion" && card.generates?.pileCard ? { takes: card.generates.pileCard } : {},
      ...card.pileCard ? { pileCard: card.pileCard } : {}
    }
  ];
  if (card.type === "Attack" && player.musicBox && player.musicBox.count + sim.attacksPlayed === 0) addToHand(next, [musicBoxCopy(card)], player.handLimit);
  return next;
}
function hpText(loss) {
  return loss < 0 ? `hp +${-loss}` : `hp -${loss}`;
}
function countedNames(names) {
  const counts = /* @__PURE__ */ new Map();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count2]) => count2 > 1 ? `${name} \xD7${count2}` : name);
}
function musicBoxCopy(card) {
  return { ...card, key: `${card.key}~mb`, index: MUSIC_BOX_INDEX + card.index, name: `${card.name}\uFF08\u97F3\u4E50\u76D2\u590D\u5236\uFF09`, ethereal: true };
}
function resolveEffects(next, card, target, player, cost, apotheosisAllowed = false) {
  const targetEnemy = target === null ? null : next.enemies.find((enemy) => enemy.index === target && enemy.alive) ?? null;
  if (card.target === "single" && targetEnemy === null) return;
  if (card.type !== "Potion" && next.afterImage > 0) gainBlock(next, next.afterImage, player);
  if (card.hpLoss > 0) loseHp(next, card.hpLoss, player);
  if (card.immediatePlays) {
    for (let i = 0; i < card.immediatePlays.count; i += 1) {
      if (next.hp <= 0 || !next.enemies.some((enemy) => enemy.alive)) break;
      const automatic = card.immediatePlays.card;
      const base = automatic.damageBase ?? automatic.damage;
      const generated = {
        ...automatic,
        key: `${card.key}~auto${i}`,
        cost: 0,
        damage: base === null ? null : Math.floor(ourAttackScaled(base + (player.strengthNow ?? 0), player.weak, false))
      };
      const resolved = play(next, generated, target, player, true);
      if (!resolved) break;
      const steps = next.steps;
      Object.assign(next, resolved, { steps });
    }
  }
  if (card.special === "rupture") next.rupture += card.powerAmount ?? 1;
  if (card.type === "Skill") {
    for (const enemy of next.enemies) if (enemy.alive && (enemy.enrage ?? 0) > 0) enemy.strengthDelta += enemy.enrage ?? 0;
  }
  if (card.type === "Skill") {
    for (const enemy of next.enemies) if (enemy.alive && (enemy.vitalSpark ?? 0) > 0) next.tainted += enemy.vitalSpark ?? 0;
  }
  if (card.special === "colossus") next.colossus = true;
  if (card.special === "frantic_escape") next.escapes += 1;
  if (card.special === "crimson_mantle") next.mantles += 1;
  if ((card.inferno ?? 0) > 0) {
    next.inferno += card.inferno ?? 0;
    next.infernos += 1;
  }
  if (card.energyGain > 0) next.energy += card.energyGain;
  if (card.bulletTime) {
    next.noDraw = true;
    next.hand = next.hand.map((entry) => entry.type !== "Potion" && entry.playable && !entry.xCost && entry.cost >= 0 ? { ...entry, cost: 0 } : entry);
  }
  const poisonBlock = card.blockFromPoison && !card.upgraded && !player.frail && (player.dexterityNow ?? 0) === 0 && next.tempDex === 0 && !player.unmovableArmed && !player.shadowmeldActive && !next.shadowmeld;
  const cardBlock = poisonBlock ? next.enemies.reduce((sum, enemy) => sum + (enemy.alive ? enemy.poison ?? 0 : 0), 0) : card.block;
  if (cardBlock > 0 && card.special !== "second_wind" && (card.type === "Potion" || !next.noBlock)) {
    let shown = cardBlock;
    if (card.cardId === "EVIL_EYE" && next.exhaustedCount > 0) shown *= 2;
    const unmovableDoubles = card.type !== "Potion" && player.unmovableArmed === true && !next.unmovableSpent;
    if (card.type !== "Potion" && player.unmovableArmed) {
      if (next.unmovableSpent) shown = Math.floor(shown / 2);
      next.unmovableSpent = true;
    }
    if ((card.perStrengthBlock ?? 0) > 0 && next.strength !== 0) shown = Math.max(0, shown + (card.perStrengthBlock ?? 0) * next.strength * (unmovableDoubles ? 2 : 1));
    let dexBlock = card.type === "Potion" ? 0 : next.tempDex + (card.cardId === "DEFEND_SILENT" ? next.fasten : 0);
    if (player.frail && dexBlock !== 0) {
      const raw = (card.blockBase ?? 0) + (player.dexterityNow ?? 0);
      const pre = card.blockBase !== void 0 && Math.floor(Math.max(0, raw) * 0.75) === card.block ? raw : Math.ceil(card.block / 0.75);
      dexBlock = Math.floor(Math.max(0, pre + dexBlock) * 0.75) - card.block;
    }
    const block = Math.max(0, shown + dexBlock);
    gainBlock(next, block * (next.shadowmeld && card.type !== "Potion" ? 2 : 1), player);
    if (card.dodgeRollNextBlock) {
      if (player.tender === 1 && !player.frail && !player.shadowmeldActive && !next.shadowmeld && !player.unmovableArmed && next.nextTurnBlock === 0 && [3, 5].includes(block)) next.nextTurnBlock = block;
      else next.unknown = [...next.unknown, `${card.name}\uFF08\u4E0B\u56DE\u5408\u683C\u6321\u6761\u4EF6\u672A\u9A8C\u8BC1\uFF09`];
    }
  }
  if (card.shadowmeld && !player.shadowmeldActive) next.shadowmeld = true;
  if (card.cardId === "PANIC_BUTTON") next.noBlock = true;
  if (card.special === "temp_dex") next.tempDex += 5;
  next.fasten += card.fasten ?? 0;
  next.tempDex += card.dexterity ?? 0;
  next.tempDex += card.temporaryDexterity ?? 0;
  if (card.special === "dexterity") {
    next.tempDex += DEX_POTION;
    if (!next.noBlock) next.flat += DEX_LASTING_PER_BLOCK_CARD * next.hand.filter((entry) => entry.type !== "Potion" && entry.block > 0).length;
  }
  if (card.special === "triple_next_attack") next.gigantic += 1;
  if (card.special === "clarity") next.flat += DRAW_VALUE * CLARITY_LATER_DRAWS;
  if (card.special === "ritual") next.flat += RITUAL_VALUE;
  if (card.special === "radiance") next.flat += RADIANCE_ENERGY_VALUE * RADIANCE_LATER_ENERGY;
  if (card.special === "heal") {
    const before = next.hp;
    next.hp = Math.min(player.maxHp, next.hp + Math.floor(player.maxHp * BLOOD_POTION_HEAL));
    next.potionHeal += next.hp - before;
    redSkullCheck(next, player);
  }
  if (card.special === "regen" && (card.regen ?? 0) > 0) {
    const amount = card.regen ?? 0;
    next.regen += amount;
    next.flat += REGEN_LATER_SHARE * ((amount - 1) * amount) / 2;
  }
  if (card.special === "primal_force") {
    next.hand = next.hand.map((entry) => entry.type === "Attack" ? giantRockFrom(entry, card.upgraded, player.strengthNow ?? 0, player.weak, next.shrunk) : entry);
  }
  if (card.special === "forge" && card.upgrades) {
    const upgrades = card.upgrades;
    next.hand = next.hand.map((entry) => entry.type === "Potion" || entry.upgraded || !upgrades[entry.cardId] ? entry : applyUpgrade(entry, upgrades[entry.cardId]));
  }
  if (card.apotheosis) {
    if (!apotheosisAllowed || player.weak || player.frail || next.shrunk || next.shadowmeld) {
      next.unknown = [...next.unknown, "\u795E\u5316\uFF08\u91CD\u653E\u3001\u81EA\u52A8\u51FA\u724C\u6216\u5C5E\u6027\u7EC4\u5408\u672A\u9A8C\u8BC1\uFF09"];
    } else {
      const upgrade = (entry) => {
        const upgraded = applyApotheosisUpgrade(entry);
        if (!upgraded.upgraded && entry.type !== "Potion" && entry.cardId !== "ASCENDERS_BANE") {
          next.unknown = [...next.unknown, `${entry.name}\uFF08\u795E\u5316\u5347\u7EA7\u672A\u9A8C\u8BC1\uFF09`];
        }
        return upgraded;
      };
      next.hand = next.hand.map(upgrade);
      next.held = next.held.map(upgrade);
      next.locked = next.locked.map(upgrade);
      next.known = next.known?.map(upgrade) ?? null;
      next.apotheosisApplied = true;
      if (!next.known) next.unknown = [...next.unknown, "\u795E\u5316\uFF08\u672A\u77E5\u540E\u7EED\u62BD\u724C\u5347\u7EA7\u672A\u9A8C\u8BC1\uFF09"];
    }
  }
  if (card.special === "stew") {
    next.strikeReplay += 1;
    next.flat += STEW_LATER_SHARE * (card.laterDamage ?? 0);
  }
  if (card.special === "plating") {
    next.plating += card.plating ?? 0;
  }
  if (card.adds && !next.pendingSelection && (card.discardCount === void 0 || hiddenDaggers(card))) {
    const adds = hiddenDaggers(card) ? card.adds.map((shiv, i) => ({
      ...shiv,
      index: 2e6 + next.steps.length * 2 + i,
      key: `${card.key}~shiv${next.steps.length}:${i}`,
      validTargets: next.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.index),
      damage: shiv.damageBase === void 0 ? shiv.damage : Math.floor(ourAttackScaled(shiv.damageBase + (player.strengthNow ?? 0), player.weak, false))
    })) : card.adds;
    addToHand(next, adds, player.handLimit);
  }
  if (card.drawn && card.special !== "gamble" && card.special !== "chaos" && card.special !== "glowwater" && card.special !== "bottled") drawCards(next, card.drawn, player);
  if (card.special === "snecko") next.hand = next.hand.map((entry) => entry.type === "Potion" || entry.xCost || entry.cost < 0 ? entry : { ...entry, cost: card.sneckoCosts?.[entry.key] ?? SNECKO_COST });
  if (card.special === "gamble") {
    const discards = new Set(card.discards ?? []);
    const draw = card.generates;
    const swapped = next.hand.filter((entry) => discards.has(entry.key)).length;
    next.hand = next.hand.filter((entry) => !discards.has(entry.key));
    if (card.drawn) drawCards(next, card.drawn.slice(0, swapped), player);
    else if (draw && !next.noDraw) next.hand = [...next.hand, ...Array.from({ length: swapped }, (_, i) => ({ ...draw, index: draw.index * 10 + i, key: `${draw.key}.${i}` }))];
  } else if (card.special === "chaos" && (card.generates || card.drawn)) {
    if ((next.serpentForm ?? 0) > 0) next.unknown = [...next.unknown, "\u7FA4\u86C7\u5F62\u6001\uFF08\u81EA\u52A8\u51FA\u724C\u672A\u9A8C\u8BC1\uFF09"];
    const tops = card.drawn ? card.drawn.slice(0, card.playsTop ?? 0) : Array.from({ length: card.playsTop ?? 0 }, () => card.generates);
    for (const drawn of tops) {
      if (!drawn.playable || drawn.type === "Status" || drawn.type === "Curse") continue;
      if (drawn.serpentForm !== void 0 && next.serpentForm !== null) {
        next.serpentForm = null;
        next.unknown = [...next.unknown, "\u7FA4\u86C7\u5F62\u6001\uFF08\u81EA\u52A8\u5EFA\u7ACB\u672A\u9A8C\u8BC1\uFF09"];
      }
      const top = { ...drawn, cost: 0, target: drawn.damage !== null ? "random" : "self", validTargets: [] };
      resolveEffects(next, top, null, player, 0);
    }
    next.pileDrawn += card.playsTop ?? 0;
  } else if (card.generates && card.special !== "glowwater" && card.special !== "bottled") next.hand = [...next.hand, card.generates];
  if (card.special === "free_card") {
    const pick2 = freeCardPick(next.hand);
    if (pick2) {
      next.hand = next.hand.map((entry) => entry === pick2 ? { ...entry, cost: 0 } : entry);
      next.flat += FREE_CARD_LASTING * pick2.cost;
    }
  }
  if ((card.retaliate ?? 0) > 0) next.retaliate += card.retaliate ?? 0;
  if ((card.thorns ?? 0) > 0) next.retaliate += card.thorns ?? 0;
  if (card.special === "buffer") next.buffer += 1;
  if (card.special === "intangible") next.intangible = true;
  if (card.type === "Attack" && (player.rage ?? 0) + next.rage > 0) gainBlock(next, (player.rage ?? 0) + next.rage, player);
  if ((card.rageBlock ?? 0) > 0) next.rage += card.rageBlock ?? 0;
  if (card.special === "triple_block") {
    next.blockGained += next.block * 2;
    next.block *= 3;
  }
  if (card.special === "double_block") {
    next.blockGained += next.block;
    next.block *= 2;
  }
  if (card.damage !== null || card.special === "whirlwind") {
    const weakFactor = player.weak ? 0.75 : 1;
    let shown = card.damage ?? 0;
    if (card.cardId === "PRECISE_CUT" && !card.upgraded && card.preciseCutHandDamage) {
      const handSize = [...next.hand, ...next.held, ...next.locked].filter((entry) => entry.type !== "Potion").length + next.drawnInHand + 1;
      const strengthNow = player.strengthNow ?? 0;
      const observed = strengthNow === 0 ? handSize === 5 ? 5 : handSize === 6 ? 3 : null : strengthNow === -2 ? handSize === 5 ? 3 : handSize === 4 ? 5 : null : strengthNow === 2 ? handSize === 5 ? 7 : handSize === 3 ? 11 : null : null;
      const recordedShown = strengthNow === 2 ? card.damage === 7 || card.damage === 11 : (strengthNow === 0 || strengthNow === -2) && (card.damage === 3 || card.damage === 5);
      if (observed !== null && recordedShown && !player.weak && !next.shrunk && next.strength === 0) {
        shown = observed;
      } else {
        next.unknown = [...next.unknown, `${card.name}\uFF08\u6B64\u624B\u724C\u6570\u6216\u4F24\u5BB3\u4FEE\u6B63\u672A\u9A8C\u8BC1\uFF09`];
      }
    }
    if (player.weak && card.damageBase !== void 0 && card.special !== "body_slam") {
      const exact = (card.damageBase + (player.strengthNow ?? 0)) * 0.75;
      if (Math.floor(exact) === shown) shown = exact;
    }
    const shrunkHit = attackShrunk(card, next, player);
    const shrinkNow = next.shrunk && card.type !== "Potion";
    let perHit = shrunkHit ? shrunkHit.perHit : shown + next.strength * weakFactor;
    if (card.cardId === "SHIV" && !next.phantomBladesSpent && next.phantomBlades > 0) {
      const base = card.damageBase === void 0 ? null : card.damageBase + (player.strengthNow ?? 0);
      perHit = base !== null && Math.floor(ourAttackScaled(base, player.weak, shrinkNow)) === (card.damage ?? 0) ? ourAttackScaled(base + next.strength + next.phantomBlades, player.weak, shrinkNow) : perHit + ourAttackScaled(next.phantomBlades, player.weak, shrinkNow);
    }
    if (card.cardId === "MAUL" && next.maulGrowth > 0) {
      perHit = shrunkHit && shrunkHit.pre !== null ? ourAttackScaled(shrunkHit.pre + next.strength + next.maulGrowth, player.weak, shrinkNow) : perHit + ourAttackScaled(next.maulGrowth, player.weak, shrinkNow);
    }
    let hits = card.hits;
    if (card.cardId === "FLECHETTES" && !card.upgraded && card.hitsLoseHandSkills && next.observedSkillKeys) {
      const stillHeld = new Set([...next.hand, ...next.held, ...next.locked].map((entry) => entry.key));
      hits = Math.max(0, hits - next.observedSkillKeys.filter((key) => !stillHeld.has(key)).length);
    }
    if (card.special === "body_slam") perHit = shrinkNow ? ourAttackScaled(next.block + next.strength, player.weak, true) : Math.floor((next.block + next.strength) * weakFactor);
    if (card.cardId === "PACTS_END" && (player.exhaustPile ?? 0) + next.exhausted.length < PACTS_END_EXHAUST) perHit = 0;
    if (card.special === "whirlwind") hits = cost;
    if (card.special === "fiend_fire") hits = next.hand.filter((entry) => entry.type !== "Potion").length + next.held.length + next.drawnInHand;
    if (card.special === "spite" && (next.hpLostThisTurn || player.hpLostThisTurn === true)) hits = 2;
    if (card.hitPerHpLoss === true) hits += next.hpLossEvents;
    if (card.special === "dismantle" && targetEnemy && targetEnemy.vulnerable > 0) hits = 2;
    let bonus = 0;
    if (card.special === "bully" && targetEnemy) {
      bonus = 2 * targetEnemy.vulnerable;
      if (!shrunkHit) perHit += bonus;
      else if (shrunkHit.pre !== null && perHit !== 0) perHit = ourAttackScaled(shrunkHit.pre + next.strength + bonus, player.weak, shrinkNow);
      else perHit += ourAttackScaled(bonus, player.weak, shrinkNow);
    }
    const lineExhausts = next.exhaustedCount - (player.exhaustedThisTurn ? 1 : 0);
    if ((card.perExhaustDamage ?? 0) > 0 && lineExhausts > 0) perHit += ourAttackScaled((card.perExhaustDamage ?? 0) * lineExhausts, player.weak, shrunkHit ? shrinkNow : false);
    let firstHit = perHit;
    if (card.type === "Attack" && next.vigor > 0) {
      if (!shrunkHit) firstHit += Math.floor(next.vigor * weakFactor);
      else if (shrunkHit.pre !== null && perHit !== 0 && card.special !== "body_slam") firstHit = ourAttackScaled(shrunkHit.pre + next.strength + bonus + next.vigor, player.weak, shrinkNow);
      else firstHit += ourAttackScaled(next.vigor, player.weak, shrinkNow);
      next.vigor = 0;
    }
    if (next.gigantic > 0 && card.type === "Attack") {
      perHit *= 3;
      firstHit *= 3;
      next.gigantic -= 1;
    }
    if (card.type === "Attack" && player.penNib !== void 0 && (player.penNib + next.relicAttacks) % PEN_NIB_EVERY === PEN_NIB_EVERY - 1) {
      perHit *= 2;
      firstHit *= 2;
    }
    if (card.target === "all") {
      for (let hit = 0; hit < hits; hit += 1) {
        next.sweeping = true;
        for (const enemy of next.enemies) if (enemy.alive) hitEnemy(next, enemy, hit === 0 ? firstHit : perHit, 1, player, card.type === "Potion", card.type === "Attack");
        next.sweeping = false;
        if (next.pendingRage) {
          next.pendingRage = false;
          crabRage(next);
        }
      }
    } else if (card.target === "random") {
      for (let hit = 0; hit < hits; hit += 1) {
        const victim = randomVictim(next);
        if (!victim) break;
        hitEnemy(next, victim, hit === 0 ? firstHit : perHit, 1, player, card.type === "Potion", card.type === "Attack");
      }
    } else if (targetEnemy) {
      const wasAlive = targetEnemy.alive;
      if (hits > 0) hitEnemy(next, targetEnemy, firstHit, 1, player, card.type === "Potion", card.type === "Attack");
      hitEnemy(next, targetEnemy, perHit, hits - 1, player, card.type === "Potion", card.type === "Attack");
      if (card.special === "feed" && wasAlive && !targetEnemy.alive) next.feedKills += 1;
      else if (card.special === "feed") next.flat -= 8;
      if (card.special === "molten_fist" && targetEnemy.alive) targetEnemy.vulnerable *= 2;
    }
  }
  if (card.cardId === "MAUL") next.maulGrowth += card.maulIncrease ?? 0;
  if (card.cardId === "SHIV") next.phantomBladesSpent = true;
  if (card.phantomBlades === 9 && next.phantomBlades === 0) next.phantomBlades = 9;
  thrashAbsorb(next, card, player);
  const poisoned = card.target === "all" ? next.enemies.filter((enemy) => enemy.alive) : targetEnemy ? [targetEnemy] : [];
  if ((card.poison ?? 0) > 0) {
    if (card.target === "random") {
      for (let k = 0; k < card.hits; k += 1) {
        const victim = randomVictim(next);
        if (victim) applyDebuff(victim, "poison", card.poison);
      }
    } else for (const enemy of poisoned) {
      if (enemy.alive && (!card.poisonRequiresExisting || (enemy.poison ?? 0) > 0)) applyDebuff(enemy, "poison", card.poison);
    }
  }
  if (card.poisonNow) for (const enemy of poisoned) triggerPoison(next, enemy, 1 + next.poisonExtraTriggers);
  next.poisonExtraTriggers += card.poisonExtraTriggers ?? 0;
  next.envenom += card.envenom ?? 0;
  const debuffTargets = card.target === "all" ? next.enemies.filter((enemy) => enemy.alive) : targetEnemy ? [targetEnemy] : [];
  for (const enemy of debuffTargets) {
    if (!enemy.alive) continue;
    if (card.special === "malaise") {
      const amount = cost + (card.malaiseBonus ?? 0);
      applyDebuff(enemy, "strengthLoss", amount);
      next.weakApplied += applyDebuff(enemy, "weak", amount);
    } else if (card.weakFirst) {
      next.weakApplied += applyDebuff(enemy, "weak", card.weak);
      next.vulnerableApplied += applyDebuff(enemy, "vulnerable", card.vulnerable);
    } else {
      next.vulnerableApplied += applyDebuff(enemy, "vulnerable", card.vulnerable);
      next.weakApplied += applyDebuff(enemy, "weak", card.weak);
    }
    if (card.enemyStrength > 0) enemy.strengthDelta += card.enemyStrength;
    applyDebuff(enemy, "tempStrengthLoss", card.enemyTempStrengthLoss ?? 0);
    applyDebuff(enemy, "demise", card.demise ?? 0);
    applyDebuff(enemy, "shrink", card.shrink ?? 0);
  }
  if (card.strength > 0) {
    next.strength += card.strength;
    next.permStrength += card.strength;
  }
  if (card.special === "dominate" && targetEnemy && targetEnemy.alive) {
    const gained = targetEnemy.vulnerable * (card.strengthPerVulnerable ?? 1);
    next.strength += gained;
    next.permStrength += gained;
  }
  if (card.tempStrength > 0) next.strength += card.tempStrength;
  if ((card.delayedDamage ?? 0) > 0) next.bombs += card.delayedDamage ?? 0;
  if (card.type === "Potion" && !turnOnlyDrink(card)) next.lastingDrinks += 1;
  if (card.type === "Potion") next.potionCost += card.potionCost ?? 0;
  else next.flat += card.flatValue;
  next.corrosiveWave = Math.max(next.corrosiveWave, card.corrosiveWave ?? 0);
  if (card.draw > 0) drawExpected(next, card.draw, player);
  else if ((player.toughBandagesBlock ?? 0) > 0 && card.discardAfterDraw && (card.discardDraw ?? 0) > 0) drawExpected(next, card.discardDraw, player);
  if ((card.selfDamage ?? 0) > 0) damagePlayer(next, card.selfDamage ?? 0, player);
  next.afterImage += card.afterImage ?? 0;
  if (card.serpentForm !== void 0 && next.serpentForm !== null) {
    if (next.serpentForm === 0) next.serpentForm = card.serpentForm;
    else {
      next.serpentForm = null;
      next.unknown = [...next.unknown, "\u7FA4\u86C7\u5F62\u6001\uFF08\u53E0\u52A0\u672A\u9A8C\u8BC1\uFF09"];
    }
  }
}
function damagePlayer(sim, amount, player) {
  const capped = player.intangible || sim.intangible ? Math.min(1, amount) : amount;
  const blocked = Math.min(sim.block, capped);
  sim.block -= blocked;
  loseHp(sim, capped - blocked, player);
}
function drawExpected(next, count2, player) {
  if (next.noDraw) return;
  if (next.known !== null && next.pileDrawn < next.known.length && count2 > 0) {
    const taken = next.known.slice(next.pileDrawn, next.pileDrawn + count2);
    drawCards(next, taken, player);
    count2 -= taken.length;
    if (count2 <= 0) return;
  }
  if (next.known !== null && count2 > 0) next.drewUnknown = true;
  const room = Math.max(0, (player.drawable ?? Number.POSITIVE_INFINITY) - next.cardsDrawn);
  const handSpace = Math.max(0, (player.handLimit ?? HAND_LIMIT) - next.hand.filter((entry) => entry.type !== "Potion").length - next.held.length - next.drawnInHand);
  poisonDraws(next, Math.min(count2, room, handSpace));
  next.drawnInHand += Math.min(count2, room, handSpace);
  next.cardsDrawn += count2;
  next.draws = [...next.draws];
  for (let drawn = 0; drawn < count2; drawn += 1) next.draws.push(drawOne(next));
}
function exhaustDraws(next, exhausted, player) {
  if (next.darkEmbrace > 0 && exhausted > 0) drawExpected(next, exhausted * next.darkEmbrace, player);
}
function thrashAbsorb(next, card, player) {
  if (card.special !== "thrash") return;
  const attacks = next.hand.filter((entry) => entry.type === "Attack");
  if (attacks.length === 0) return;
  const weakFactor = player.weak ? 0.75 : 1;
  const added = (entry) => Math.max(0, Math.floor((entry.damage ?? 0) + next.strength * weakFactor));
  const least = attacks.reduce((a, b) => added(b) < added(a) ? b : a);
  if (attacks.length === 1) {
    next.hand = next.hand.filter((entry) => entry !== least);
    next.exhausted = [...next.exhausted, least];
  } else {
    next.flat -= attacks.reduce((sum, entry) => sum + Math.max(0, exhaustValue(entry, EXHAUST_WEIGHTS)), 0) / attacks.length;
    next.thrashRandom = [...next.thrashRandom, { index: card.index, strength: next.strength * weakFactor, least: added(least) }];
    next.held = [...next.held, ...attacks];
    next.hand = next.hand.filter((entry) => entry.type !== "Attack");
  }
  next.exhaustedCount += 1;
  if (next.feelNoPain > 0) gainBlock(next, next.feelNoPain, player);
  exhaustDraws(next, 1, player);
  if (attacks.length === 1 && added(least) > 0) next.thrashGrowth = [...next.thrashGrowth, { index: card.index, amount: added(least) }];
}
function attackRelics(sim, player) {
  sim.relicAttacks += 1;
  if ((player.daughterWindBlock ?? 0) > 0) gainBlock(sim, player.daughterWindBlock, player);
  const kusa = player.kusarigama;
  if (kusa && kusa.every > 0 && (kusa.count + sim.relicAttacks) % kusa.every === 0) {
    const living = sim.enemies.filter((enemy) => enemy.alive).sort((a, b) => a.hp - b.hp);
    if (living[0]) hitEnemyRaw(sim, living[0], kusa.damage);
  }
  const shuriken = player.shuriken;
  if (shuriken && shuriken.every > 0 && (shuriken.count + sim.relicAttacks) % shuriken.every === 0) {
    sim.strength += shuriken.strength;
    sim.permStrength += shuriken.strength;
  }
  const fan = player.ornamentalFan;
  if (fan && fan.every > 0 && (fan.count + sim.relicAttacks) % fan.every === 0) gainBlock(sim, fan.block, player);
}
function skillRelics(sim, player) {
  sim.relicSkills += 1;
  const opener = player.letterOpener;
  if (opener && opener.every > 0 && (opener.count + sim.relicSkills) % opener.every === 0) sweepRaw(sim, opener.damage);
  const fork = player.tuningFork;
  if (fork && fork.every > 0 && (fork.count + sim.relicSkills) % fork.every === 0) gainBlock(sim, fork.block, player);
}
function sweepRaw(sim, amount) {
  const outer = sim.sweeping === true;
  sim.sweeping = true;
  for (const enemy of sim.enemies) if (enemy.alive) hitEnemyRaw(sim, enemy, amount);
  sim.sweeping = outer;
  if (!outer && sim.pendingRage) {
    sim.pendingRage = false;
    crabRage(sim);
  }
}
function hellraised(card) {
  return { ...card, cost: 0, xCost: false, playable: true, ...card.target === "single" ? { target: "random", validTargets: [] } : {} };
}
function addToHand(sim, cards, limit2 = HAND_LIMIT) {
  const space = Math.max(0, limit2 - sim.hand.filter((entry) => entry.type !== "Potion").length - sim.held.length - sim.drawnInHand);
  const fits = cards.slice(0, space);
  sim.hand = [...sim.hand, ...fits.filter((card) => card.playable)];
  sim.held = [...sim.held, ...fits.filter((card) => !card.playable)];
}
function drawCards(sim, cards, player, reshuffled = false) {
  if (sim.noDraw) return;
  const room = reshuffled ? cards.length : Math.max(0, (player.drawable ?? Number.POSITIVE_INFINITY) - sim.cardsDrawn);
  const taken = cards.slice(0, Math.min(cards.length, room)).map((card) => sim.hellraiser && isStrikeCard(card) ? hellraised(card) : card);
  const space = Math.max(0, (player.handLimit ?? HAND_LIMIT) - sim.hand.filter((entry) => entry.type !== "Potion").length - sim.held.length - sim.drawnInHand);
  poisonDraws(sim, Math.min(taken.length, space));
  addToHand(sim, taken, player.handLimit);
  sim.cardsDrawn += taken.length;
  sim.pileDrawn += taken.length;
}
function poisonDraws(sim, count2) {
  if (sim.corrosiveWave <= 0) return;
  for (let i = 0; i < count2; i += 1) {
    for (const enemy of sim.enemies) if (enemy.alive) applyDebuff(enemy, "poison", sim.corrosiveWave);
  }
}
function gainBlock(sim, amount, player) {
  sim.block += amount;
  sim.blockGained += amount;
  if ((player.juggernaut ?? 0) > 0) {
    const victim = randomVictim(sim);
    if (victim) hitEnemyRaw(sim, victim, player.juggernaut ?? 0);
  }
}
function randomVictim(sim) {
  let best;
  for (const enemy of sim.enemies) {
    if (!enemy.alive) continue;
    if (!best || enemy.hp + enemy.block > best.hp + best.block) best = enemy;
  }
  return best;
}
function hitEnemyRaw(sim, enemy, raw) {
  let amount = enemy.halved ? Math.floor(raw * 0.5) : raw;
  if (enemy.perHitCap !== null && enemy.perHitCap !== void 0) amount = Math.min(amount, enemy.perHitCap);
  if (enemy.intangible) amount = Math.min(amount, 1);
  amount = Math.max(0, amount);
  const absorbed = Math.min(enemy.block, amount);
  enemy.block -= absorbed;
  let loss = amount - absorbed;
  if (loss > 0 && (enemy.slippery ?? 0) > 0) {
    loss = 1;
    enemy.slippery = (enemy.slippery ?? 0) - 1;
  }
  if (enemy.hpLossCap !== null && enemy.hpLossCap !== void 0) loss = Math.min(loss, Math.max(0, enemy.hpLossCap - enemy.lostThisTurn));
  loss = Math.min(enemy.hp, loss);
  enemy.hp -= loss;
  enemy.lostThisTurn += loss;
  sim.damageDealt += loss;
  if (loss > 0) wake(enemy);
  if (amount > 0 && (enemy.curlUp ?? 0) > 0) {
    enemy.block += enemy.curlUp ?? 0;
    enemy.curlUp = 0;
  }
  if (enemy.hp <= 0) killEnemy(sim, enemy);
}
function backAttack(shown, enemyIndex, facingBefore, facingAfter) {
  if (facingAfter === null || facingAfter === facingBefore) return shown;
  if (facingBefore === null) return shown;
  const wasBehind = facingBefore !== enemyIndex;
  const isBehind = facingAfter !== enemyIndex;
  if (wasBehind && !isBehind) return Math.ceil(shown / 1.5);
  if (!wasBehind && isBehind) return Math.floor(shown * 1.5);
  return shown;
}
function stripStunOf(enemy, input) {
  if (!enemy.alive) return {};
  const start = input.enemies.find((entry) => entry.index === enemy.index);
  const stun = strippedStun(enemy, start);
  if (!stun) return {};
  const attack = (start?.attacks ?? []).reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  return { stunned: true, strippedStun: { power: stun.power, name: stun.name, attack } };
}
function moveRuleOf(enemy, input) {
  const start = input.enemies.find((entry) => entry.index === enemy.index);
  const rule = ruledMove(enemy, start);
  if (!rule) return {};
  const total = (attacks) => attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  return { movedTo: { power: rule.power, name: rule.name, how: rule.how, move: rule.move, moveName: rule.moveName, attack: total(rule.attacks), before: total(start?.attacks ?? []), n: rule.n, changed: rule.changed } };
}
function deathMoveOf(enemy, sim, input) {
  const rule = deathMoved(enemy, sim, input);
  if (!rule || rule.move === null && rule.next === null) return {};
  const total = (attacks) => attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  const start = input.enemies.find((entry) => entry.index === enemy.index);
  return {
    deathMove: {
      ally: rule.ally,
      allyName: rule.allyName,
      move: rule.move,
      moveName: rule.moveName,
      attack: total(rule.move !== null ? rule.attacks : start?.attacks ?? []),
      before: total(start?.attacks ?? []),
      next: rule.next,
      nextName: rule.nextName,
      nextAttack: rule.nextAttack,
      ...rule.nowCounts ? { nowCounts: rule.nowCounts } : {},
      ...rule.nextCounts ? { nextCounts: rule.nextCounts } : {}
    }
  };
}
function shownAttack(damage, enemyIndex, player, sim, input) {
  if (!player.surrounded) return damage;
  if (player.backAttackPair === true) {
    if (input.enemies.filter((enemy) => enemy.hp > 0).length < 2) return damage;
    if (sim.enemies.filter((enemy) => enemy.alive).length < 2) {
      const facing = player.facing ?? null;
      return facing !== null && facing !== enemyIndex ? Math.ceil(damage / 1.5) : damage;
    }
  }
  return backAttack(damage, enemyIndex, player.facing ?? null, sim.facing);
}
function incomingHits(sim, input) {
  const player = input.player;
  const hits = [];
  for (const enemy of sim.enemies) {
    const moved = enemy.moveOnStrip ? ruledMove(enemy, input.enemies.find((entry) => entry.index === enemy.index)) : null;
    if (!enemy.alive && !moved) continue;
    const died = !moved && enemy.moveOnDeath ? deathMoved(enemy, sim, input) : null;
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    if (enemy.alive && (enemy.shriek ?? 0) > 0 && enemy.hp <= (enemy.shriek ?? 0) && (start?.hp ?? 0) > (enemy.shriek ?? 0)) continue;
    if (enemy.alive && enemy.burrowed && (start?.block ?? 0) > 0 && enemy.block <= 0) continue;
    if (enemy.alive && enemy.ravenousStunned) continue;
    if (enemy.alive && strippedStun(enemy, start)) continue;
    const halvedByColossus = enemy.vulnerable > 0 && (sim.colossus ? !(player.colossus && (start?.vulnerable ?? 0) > 0) : player.colossus === true && (start?.vulnerable ?? 0) === 0);
    const retaliation = enemy.intangible ? Math.min(1, sim.retaliate) : sim.retaliate;
    let attackerHp = enemy.alive ? enemy.hp : enemy.maxHp;
    for (const attack of moved ? moved.attacks : died && died.move !== null ? died.attacks : enemy.attacks) {
      for (let hit = 0; hit < attack.hits; hit += 1) {
        if (retaliation > 0 && attackerHp <= 0) break;
        const shown = shownAttack(attack.damage, enemy.index, player, sim, input);
        const strengthChange = (enemy.strengthDelta - (enemy.tempStrengthLoss ?? 0)) * (player.vulnerable ? 1.5 : 1);
        let amount = Math.floor(shown + strengthChange);
        if (sim.tainted > 0) {
          const tainted = sim.tainted * (player.vulnerable ? 1.5 : 1);
          amount = enemy.weak > 0 && !enemy.newlyWeak ? Math.floor((Math.ceil((amount + 1) / 0.75) - 1 + tainted) * 0.75) : Math.floor(amount + tainted);
        }
        if (enemy.newlyWeak) amount = Math.floor(amount * 0.75);
        if (enemy.newlyShrunk) amount = Math.floor(amount * SHRINK_DAMAGE_FACTOR);
        if (halvedByColossus) amount = Math.floor(amount * 0.5);
        if (player.intangible || sim.intangible) amount = Math.min(amount, 1);
        hits.push({ enemy: enemy.index, amount: Math.max(0, amount) });
        attackerHp -= retaliation;
      }
    }
  }
  return hits;
}
function imbalanceStuns(sim, hits, block, buffer) {
  const negated = new Set(hits.map((hit, index) => ({ hit, index })).sort((a, b) => b.hit.amount - a.hit.amount).slice(0, buffer).map((entry) => entry.index));
  const unblocked = /* @__PURE__ */ new Set();
  let pool = block;
  hits.forEach((hit, index) => {
    if (negated.has(index)) return;
    if (hit.amount > pool) unblocked.add(hit.enemy);
    pool = Math.max(0, pool - hit.amount);
  });
  return sim.enemies.filter((enemy) => enemy.alive && (enemy.imbalanced ?? 0) > 0 && hits.some((hit) => hit.enemy === enemy.index) && !unblocked.has(enemy.index));
}
function bufferedLoss(amounts, block, buffer) {
  let pool = block;
  let stacks = buffer;
  let through = 0;
  for (const amount of amounts) {
    if (amount <= 0) continue;
    const absorbed = Math.min(pool, amount);
    pool -= absorbed;
    const rest = amount - absorbed;
    if (rest <= 0) continue;
    if (stacks > 0) {
      stacks -= 1;
      continue;
    }
    through += rest;
  }
  return through;
}
function sleepTurnDamage(enemy) {
  return Math.max(10, Math.round(enemy.maxHp * 0.08));
}
function nextHitShortfall(next, living, hpAfter, hpLoss) {
  const incoming = next.attacks.reduce((sum, attack) => {
    const enemy = living.find((e) => e.index === attack.index);
    return enemy ? sum + attack.damage * (enemy.weak > 1 ? 0.75 : 1) : sum;
  }, 0);
  const reach = incoming - next.handBlock;
  return Math.max(0, Math.min(hpLoss, reach - hpAfter));
}
function platingAbsorbed(plating, input) {
  if (plating <= 0) return 0;
  const existing = Math.max(0, input.player.endTurnBlock ?? 0);
  const steady = Math.max(
    input.enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, attack) => s + attack.damage * attack.hits, 0), 0),
    input.nextIncoming ?? 0
  );
  const forecast = input.laterIncoming && input.laterIncoming.length > 0 ? input.laterIncoming : [steady];
  let absorbed = 0;
  for (let k = 1; k < existing + plating; k += 1) {
    const incoming = Math.max(0, forecast[Math.min(k, forecast.length) - 1] ?? 0);
    absorbed += Math.min(existing + plating - k, incoming) - Math.min(Math.max(0, existing - k), incoming);
  }
  return absorbed;
}
function weightsFor(input) {
  const hpFraction = input.player.maxHp > 0 ? input.player.hp / input.player.maxHp : 1;
  let hp = 1 + 1.5 * Math.max(0, 0.6 - hpFraction) / 0.6;
  let damage = input.fightKind === "boss" ? 0.8 : input.fightKind === "elite" ? 0.7 : 0.45;
  if (input.enemies.some((enemy) => enemy.revives || (enemy.stock ?? 0) > 0)) hp *= NEXT_PHASE_HP;
  if (input.raceEruption) damage *= ERUPTION_RACE_DAMAGE;
  if (input.damageScale !== void 0) damage *= input.damageScale;
  if (input.hpScale !== void 0) hp *= input.hpScale;
  const vulnerable = 2.5 + Math.min(4, 1.5 * (input.vulnerablePayoffs ?? 0));
  return { hp, damage, killBase: 6, killPerIncoming: 1.2, vulnerable, weak: 1.5, strength: 5 };
}
function lastingValue(sim, weights) {
  return weights.strength * sim.permStrength + sim.flat;
}
function lastingScale(input) {
  if (turnsLeftOf(input) === 1) return 0;
  const fightLength = input.fightKind === "boss" ? 1.8 : input.fightKind === "elite" ? 1.4 : 0.8;
  const earliness = Math.max(0.4, 1 - 0.08 * ((input.turn ?? 1) - 1));
  return fightLength * earliness;
}
function lastingHpPerPoint(input) {
  return lastingScale(input) / weightsFor(input).hp;
}
function mantleHpCost(amount) {
  return amount > 0 ? Math.max(1, Math.floor(amount / 7)) : 0;
}
function infernoCopiesOf(amount, mostPerCopy = INFERNO_MOST_PER_COPY) {
  return amount > 0 ? Math.max(1, Math.ceil(amount / Math.max(1, mostPerCopy))) : 0;
}
function turnStartAoeAfter(sim, input) {
  return (input.player.turnStartAoe ?? 0) + Math.max(0, sim.inferno - (input.player.inferno ?? 0));
}
function endBlockParts(sim, input, winsFight) {
  const heldCards = [...sim.hand, ...sim.held];
  const etherealBlock = winsFight || sim.feelNoPain <= 0 ? 0 : sim.feelNoPain * heldCards.filter((card) => card.ethereal && card.type !== "Potion").length;
  const platingNow = sim.steps.reduce((sum, step) => sum + (input.hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId)?.plating ?? 0), 0);
  const claspBlock = (input.player.blockPerHeldCard ?? 0) * (heldCards.filter((card) => card.type !== "Potion").length + sim.drawnInHand);
  const beforeOrichalcum = sim.block + etherealBlock + (input.player.orichalcumPlating ? 0 : platingNow) + claspBlock;
  const orichalcumBlock = beforeOrichalcum <= 0 ? input.player.orichalcum ?? 0 : 0;
  const relicEndBlock = orichalcumBlock + (sim.attacksPlayed === 0 ? input.player.rippleBasin ?? 0 : 0);
  const blockAtEnd = sim.block + etherealBlock + (input.player.endTurnBlock ?? 0) + platingNow + claspBlock + relicEndBlock;
  return { etherealBlock, platingNow, claspBlock, orichalcumBlock, blockAtEnd };
}
function fightEnded(sim, input) {
  const pending = sim.enemies.some((enemy) => !enemy.alive && (enemy.revives || input.enemies.find((start) => start.index === enemy.index).hp > 0 && ((enemy.stock ?? 0) > 0 || enemy.spawnsOnDeath || (enemy.eruption ?? 0) > 0 && enemy.maxHp < 1e6)));
  const living = sim.enemies.filter((enemy) => enemy.alive);
  return !pending && (living.length === 0 || living.every((enemy) => enemy.minion) && sim.enemies.some((enemy) => !enemy.minion));
}
function evaluate(sim, input, weights) {
  const howls = sim.exhausted.filter((card) => card.cardId === "HOWL_FROM_BEYOND");
  if (howls.length > 0 && sim.enemies.some((enemy) => enemy.alive)) {
    sim = clone(sim);
    for (const howl of howls) {
      const perHit = attackShrunk(howl, sim, input.player)?.perHit ?? (howl.damage ?? 0) + sim.strength * (input.player.weak ? 0.75 : 1);
      for (const enemy of sim.enemies) if (enemy.alive) hitEnemy(sim, enemy, perHit, 1, input.player, false, howl.type === "Attack");
    }
  }
  const etherealHeld = [...sim.hand, ...sim.held].filter((card) => card.ethereal && card.type !== "Potion").length;
  if (etherealHeld > 0 && sim.feelNoPain > 0 && (input.player.juggernaut ?? 0) > 0 && sim.enemies.some((enemy) => enemy.alive)) {
    sim = clone(sim);
    for (let k = 0; k < etherealHeld; k += 1) {
      const victim = randomVictim(sim);
      if (victim) hitEnemyRaw(sim, victim, input.player.juggernaut ?? 0);
    }
  }
  const parry = input.player.parryingShield;
  if (parry && sim.enemies.some((enemy) => enemy.alive) && endBlockParts(sim, input, false).blockAtEnd >= parry.block) {
    sim = clone(sim);
    const victim = randomVictim(sim);
    if (victim) hitEnemyRaw(sim, victim, parry.damage);
  }
  const wonBeforePoison = fightEnded(sim, input);
  const heldCards = [...sim.hand, ...sim.held];
  const heldCount = heldCards.filter((card) => card.type !== "Potion").length + sim.drawnInHand;
  const heldLoss = (card) => (card.heldHpLoss ?? 0) + (card.heldHpLossPerCard ?? 0) * heldCount;
  const heldHpLoss = wonBeforePoison ? 0 : heldCards.reduce((sum, card) => sum + heldLoss(card), 0);
  const wither = input.wither;
  const withersAdded = wither && wither.every > 0 ? Math.floor((wither.played + sim.played - (input.cardsPlayedThisTurn ?? 0)) / wither.every) - Math.floor(wither.played / wither.every) : 0;
  const heldPenalty = wonBeforePoison ? 0 : heldCards.reduce((sum, card) => sum + (card.heldPenalty ?? 0) - (card.heldHpLoss ?? 0), 0) + withersAdded * (wither?.damage ?? 0);
  const { etherealBlock, platingNow, claspBlock, orichalcumBlock, blockAtEnd } = endBlockParts(sim, input, wonBeforePoison);
  const disintegration = wonBeforePoison ? 0 : input.player.endTurnHpLoss ?? 0;
  const blockLeft = Math.max(0, blockAtEnd - disintegration);
  const pendingPoison = sim.enemies.some((enemy) => enemy.alive && (enemy.poison ?? 0) > 0);
  const diesBeforePoison = pendingPoison && !wonBeforePoison && (() => {
    let room = input.player.hpLossCap ?? Infinity;
    const losses = [
      input.player.hp - sim.hp,
      heldHpLoss,
      Math.max(0, disintegration - blockAtEnd),
      bufferedLoss([heldPenalty], blockLeft, sim.buffer)
    ].map((loss) => {
      const landed = loss < 0 ? loss : Math.max(0, Math.min(loss, room));
      room -= landed;
      return landed;
    });
    return reviveThrough(input.player.hp, losses, input.player.revives ?? []).hp <= 0;
  })();
  if (!diesBeforePoison && pendingPoison) {
    sim = clone(sim);
    const triggers = 1 + sim.poisonExtraTriggers;
    for (const enemy of sim.enemies) triggerPoison(sim, enemy, triggers, triggers === 1 && enemy.perHitCap === 9 ? 9 : Infinity);
  }
  const living = sim.enemies.filter((enemy) => enemy.alive);
  const restocked = sim.enemies.filter((enemy) => !enemy.alive && (enemy.stock ?? 0) > 0 && input.enemies.find((start) => start.index === enemy.index).hp > 0);
  const spawning = sim.enemies.filter((enemy) => !enemy.alive && enemy.spawnsOnDeath && input.enemies.find((start) => start.index === enemy.index).hp > 0);
  const erupting = sim.enemies.filter((enemy) => !enemy.alive && (enemy.eruption ?? 0) > 0 && enemy.maxHp < 1e6 && input.enemies.find((start) => start.index === enemy.index).hp > 0);
  const explodesNext = erupting.reduce((sum, enemy) => sum + (enemy.eruption ?? 0), 0);
  const winsFight = !diesBeforePoison && fightEnded(sim, input);
  const heldDamageFrom = countedNames([
    ...heldCards.filter((card) => (card.heldPenalty ?? 0) - (card.heldHpLoss ?? 0) > 0).map((card) => card.name),
    ...wonBeforePoison || (wither?.damage ?? 0) <= 0 ? [] : Array.from({ length: withersAdded }, () => "Wither added by this turn's cards")
  ]);
  const heldHpLossFrom = countedNames(heldCards.filter((card) => heldLoss(card) > 0).map((card) => card.name));
  const hits = winsFight || diesBeforePoison ? [] : incomingHits(sim, input);
  const incomingRaw = hits.reduce((sum, hit) => sum + hit.amount, 0) + heldPenalty;
  const platingHp = winsFight ? 0 : platingAbsorbed(sim.plating, input);
  const platingValue = sim.plating > 0 ? weights.hp * platingHp : 0;
  const endTurnGuards = wonBeforePoison ? [] : [
    { what: "Plating/Metallicize block at the turn's end", amount: input.player.endTurnBlock ?? 0 },
    { what: "Plating played this turn, blocking at its end", amount: platingNow },
    { what: "Feel No Pain block for the Ethereal cards exhausted at the end", amount: etherealBlock },
    { what: "Cloak Clasp block for the cards held", amount: claspBlock },
    { what: "Orichalcum block at the turn's end", amount: orichalcumBlock },
    { what: "Regen healing before the enemy acts", amount: Math.max(0, Math.min(sim.regen, input.player.maxHp - sim.hp)) },
    { what: "Buffer stacks, each preventing a whole HP loss", amount: sim.buffer }
  ].filter((guard) => guard.amount > 0);
  const rodVerified = input.player.tungstenRod === true && (input.player.buffer ?? 0) === 0 && sim.buffer === 0 && sim.bufferSpent === 0 && sim.hpLossEvents === 0 && !input.player.intangible && !sim.intangible && input.player.hpLossCap == null && heldPenalty === 0 && heldHpLoss === 0 && disintegration === 0 && input.player.hp === sim.hp && (input.player.startTurnHpLoss ?? 0) + sim.mantles + sim.infernos === 0;
  let rodLosses = null;
  if (rodVerified) {
    let pool = blockLeft;
    rodLosses = hits.map((hit) => {
      const absorbed = Math.min(pool, hit.amount);
      pool -= absorbed;
      return Math.max(0, hit.amount - absorbed - 1);
    });
  }
  const incomingAfterBlock = rodLosses !== null ? rodLosses.reduce((sum, loss) => sum + loss, 0) : sim.buffer > 0 && !wonBeforePoison ? bufferedLoss([heldPenalty, ...hits.map((hit) => hit.amount)], blockLeft, sim.buffer) : Math.max(0, incomingRaw - blockLeft);
  const stunned = winsFight ? [] : imbalanceStuns(sim, hits, blockLeft, sim.buffer);
  const regenHeal = winsFight || diesBeforePoison ? 0 : Math.max(0, Math.min(sim.regen, input.player.maxHp - sim.hp));
  const selfLoss = input.player.hp - sim.hp - regenHeal;
  const startTurnLoss = winsFight || diesBeforePoison ? 0 : (input.player.startTurnHpLoss ?? 0) + sim.mantles + sim.infernos;
  const turnLoss2 = selfLoss + incomingAfterBlock + Math.max(0, disintegration - blockAtEnd) + heldHpLoss;
  const clayEvents = winsFight ? 0 : sim.hpLossEvents + heldCards.filter((card) => heldLoss(card) > 0).length + (disintegration > blockAtEnd ? 1 : 0) + (rodLosses !== null ? rodLosses.filter((loss) => loss > 0).length : lossesPast([heldPenalty, ...hits.map((hit) => hit.amount)], blockLeft, sim.buffer));
  const clayBlockNext = winsFight || (input.player.clayBlock ?? 0) <= 0 ? 0 : (input.player.clayPending ?? 0) + (input.player.clayBlock ?? 0) * clayEvents;
  const cap = input.player.hpLossCap;
  let hpLoss = (cap !== null && cap !== void 0 ? Math.min(turnLoss2, cap) : turnLoss2) + startTurnLoss;
  let hpAfter = input.player.hp - hpLoss;
  const sandpits = sim.enemies.filter((enemy) => enemy.alive && (enemy.sandpit ?? 0) > 0).map((enemy) => enemy.sandpit);
  const sandpitAfter = winsFight || sandpits.length === 0 ? null : Math.min(...sandpits) + sim.escapes - 1;
  const gambitPlayed = sim.steps.some((step) => step.cardId === "THE_GAMBIT");
  const otherDeath = (input.player.gambit === true || gambitPlayed) && incomingAfterBlock > 0 || sandpitAfter !== null && sandpitAfter <= 0;
  let revived;
  const revives = input.player.revives ?? [];
  if (hpAfter <= 0 && !otherDeath && revives.length > 0) {
    const enemyTurn = rodLosses !== null ? [...rodLosses] : [];
    if (rodLosses === null) {
      let pool = blockLeft;
      let stacks = wonBeforePoison ? 0 : sim.buffer;
      for (const amount of [heldPenalty, ...hits.map((hit) => hit.amount)]) {
        if (amount <= 0) continue;
        const absorbed = Math.min(pool, amount);
        pool -= absorbed;
        const rest = amount - absorbed;
        if (rest <= 0) continue;
        if (stacks > 0) {
          stacks -= 1;
          continue;
        }
        enemyTurn.push(rest);
      }
    }
    const turnLosses = [selfLoss, heldHpLoss, Math.max(0, disintegration - blockAtEnd), ...enemyTurn];
    let room = cap !== null && cap !== void 0 ? cap : Infinity;
    const capped = turnLosses.map((loss) => {
      const landed = Math.max(0, Math.min(loss, room));
      room -= landed;
      return landed;
    });
    const through = reviveThrough(input.player.hp, [...capped, startTurnLoss], revives);
    if (through.hp > 0 && through.used.length > 0) {
      const reviveHp = through.used.reduce((sum, revive) => sum + revive.hp, 0);
      revived = { names: through.used.map((revive) => revive.name), sources: through.used.map((revive) => revive.source), reviveHp, hp: through.hp, ownLoss: Math.max(0, Math.min(input.player.hp - 1, selfLoss)) };
      hpLoss = input.player.hp + reviveHp - through.hp;
      hpAfter = input.player.hp - hpLoss;
    }
  }
  const dies = hpAfter <= 0 && revived === void 0 || otherDeath;
  const allSegmentsDead = sim.enemies.every((enemy) => !enemy.reattach || !enemy.alive);
  const crabs = input.enemies.filter((start) => start.crabRage).map((start) => start.index);
  const allCrabsDead = sim.enemies.every((enemy) => !crabs.includes(enemy.index) || !enemy.alive);
  const kills = sim.enemies.filter(
    (enemy) => !enemy.alive && !enemy.illusion && !((enemy.stock ?? 0) > 0) && !(enemy.reattach && !allSegmentsDead) && !(crabs.includes(enemy.index) && !allCrabsDead) && input.enemies.find((start) => start.index === enemy.index).hp > 0
  );
  let score = 0;
  if (dies) score -= 1e5;
  const stunSaved = stunned.reduce((sum, enemy) => sum + (enemy.imbalanced ?? 0), 0);
  if (!dies) score += weights.hp * stunSaved;
  if (winsFight) score += 1e4;
  if (explodesNext > 0 && !dies) {
    const kept = input.player.keepsBlock ? Math.max(0, blockLeft - incomingRaw) : 0;
    const margin = hpAfter + kept - explodesNext;
    if (margin > 0) score += 1e4;
    else if (margin + ERUPTION_NEXT_BLOCK > 0) score += 5e3;
    else score -= weights.hp * -(margin + ERUPTION_NEXT_BLOCK);
  }
  score -= weights.hp * hpLoss;
  if (input.continuationValue && !dies) score -= weights.hp * continuationCost(input.continuationValue, input.player.hp, revived?.hp ?? hpAfter);
  if (input.nextHit && !winsFight && !dies && hpLoss > 0) score -= weights.hp * input.nextHit.weight * nextHitShortfall(input.nextHit, living, hpAfter, hpLoss);
  score -= weights.hp * sim.potionCost;
  if (!winsFight && withersAdded > 0) score -= weights.hp * withersAdded * ((wither?.damage ?? 0) + 3) * WITHER_FUTURE_REDRAWS;
  if (!winsFight && selfLoss > 0 && input.nextIncoming !== void 0 && input.nextIncoming > 0 && quietTurn(input) && hpAfter <= input.nextIncoming + NEXT_HIT_MARGIN) {
    score -= weights.hp * selfLoss * (QUIET_SELF_DAMAGE_WEIGHT - 1);
  }
  if (sandpitAfter === 1) score -= weights.hp * 15;
  if (!winsFight && sandpitAfter !== null) score += sim.escapes * weights.damage * SANDPIT_TURN_DAMAGE;
  if (sim.enraged > 0 && !winsFight) score -= weights.hp * sim.enraged * CRAB_RAGE_STRENGTH * 2;
  const startDamage = turnStartAoeAfter(sim, input);
  const startTurnKills = winsFight || startDamage <= 0 ? [] : living.filter((enemy) => enemy.hp <= startDamage);
  const survivors = living.filter((enemy) => !startTurnKills.includes(enemy));
  const rageNext = startTurnKills.some((enemy) => crabs.includes(enemy.index));
  if (rageNext) {
    const enragedNext = survivors.filter((enemy) => enemy.crabRage).length;
    score -= weights.hp * enragedNext * CRAB_RAGE_STRENGTH * 2;
  }
  const livingCrabs = living.filter((enemy) => enemy.crabRage && crabs.includes(enemy.index));
  if (!winsFight && livingCrabs.length === 2) {
    const [lower, higher] = [...livingCrabs].sort((a, b) => a.hp - b.hp);
    score -= weights.damage * CRAB_GAP_WEIGHT * Math.max(0, higher.hp - lower.hp - CRAB_GAP_FREE);
    if (!rageNext && lower.hp <= startDamage + CRAB_LOW_MARGIN && higher.hp > CRAB_HIGH_HP) score -= weights.hp * CRAB_RAGE_STRENGTH * 2;
  }
  const eruption = Math.max(0, ...sim.enemies.filter((enemy) => (enemy.eruption ?? 0) > 0).map((enemy) => enemy.eruption + (enemy.maxHp >= 1e6 || !enemy.alive ? 0 : 3)));
  const raceSafe = input.raceEruption === true && hpAfter >= (input.nextIncoming ?? 0) + 5;
  if (!winsFight && eruption > 0 && hpAfter < eruption - 12 && !raceSafe) score -= weights.hp * hpLoss;
  const retaliated = [];
  if (sim.retaliate > 0 && !winsFight) {
    let back = 0;
    for (const enemy of living) {
      const landed = hits.filter((hit) => hit.enemy === enemy.index).length;
      const each = enemy.intangible ? Math.min(1, sim.retaliate) : sim.retaliate;
      const slipperyUsed = Math.min(landed, Math.max(0, enemy.slippery ?? 0));
      let amount = slipperyUsed + (landed - slipperyUsed) * each;
      if (enemy.hpLossCap !== null && enemy.hpLossCap !== void 0) amount = Math.min(amount, enemy.hpLossCap);
      amount = Math.min(Math.max(0, enemy.hp), amount);
      back += amount;
      if (amount > 0) retaliated.push({ index: enemy.index, amount, ...slipperyUsed > 0 ? { slipperyUsed } : {} });
    }
    score += weights.damage * back;
  }
  let woundsAdded = 0;
  if (incomingAfterBlock > 0) {
    const punish = living.reduce((sum, enemy) => sum + (enemy.punishesUnblocked ?? 0), 0);
    score -= punish;
    let blockLeftForHits = blockLeft;
    for (const hit of hits) {
      const through = hit.amount - blockLeftForHits;
      blockLeftForHits = Math.max(0, blockLeftForHits - hit.amount);
      if (through <= 0) continue;
      const wounds = sim.enemies.find((enemy) => enemy.index === hit.enemy)?.woundsPerHit ?? 0;
      score -= WOUND_COST * wounds;
      woundsAdded += wounds;
    }
  }
  if (input.player.keepsBlock && !winsFight) score += 0.4 * Math.max(0, blockLeft - incomingRaw);
  const husk = sim.enemies.filter((enemy) => enemy.maxHp >= 1e6);
  const huskDamage = husk.reduce((sum, enemy) => {
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    return sum + Math.max(0, start.hp - enemy.hp);
  }, 0);
  const lostDamage = sim.enemies.reduce((sum, enemy) => {
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    const dealt = Math.max(0, start.hp - Math.max(0, enemy.hp));
    if (enemy.illusion) return sum + dealt;
    if (enemy.reattach && !enemy.alive && !allSegmentsDead) {
      const kept = Math.max(0, start.hp - (enemy.reattachHp ?? start.hp));
      return sum + Math.max(0, dealt - kept);
    }
    return sum;
  }, 0);
  const leaderAlive = living.some((enemy) => !enemy.minion);
  const minionChip = !leaderAlive ? 0 : sim.enemies.reduce((sum, enemy) => {
    if (!enemy.minion || !enemy.alive || enemy.illusion || enemy.index === input.focusIndex) return sum;
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    return sum + (1 - MINION_CHIP) * Math.max(0, start.hp - Math.max(0, enemy.hp));
  }, 0);
  score += weights.damage * (sim.damageDealt - huskDamage - lostDamage - minionChip);
  if (!winsFight && input.enemies.length > 1) {
    const perEnemy = sim.enemies.map((enemy) => Math.max(0, input.enemies.find((start) => start.index === enemy.index).hp - Math.max(0, enemy.hp)));
    score += weights.damage * CONCENTRATION_BONUS * Math.max(0, ...perEnemy);
  }
  if (input.focusIndex !== void 0 && !winsFight) {
    const focus = sim.enemies.find((enemy) => enemy.index === input.focusIndex);
    const start = input.enemies.find((entry) => entry.index === input.focusIndex);
    if (focus && start && !focus.crabRage && !focus.reattach) score += weights.damage * (input.focusWeight ?? FOCUS_BONUS) * Math.max(0, start.hp - Math.max(0, focus.hp));
  }
  if (sim.bombs > 0 && !winsFight) {
    const reach = living.filter((enemy) => enemy.maxHp < 1e6).reduce((sum, enemy) => sum + Math.min(enemy.hp, sim.bombs), 0);
    score += weights.damage * reach * (input.fightKind === "boss" || input.fightKind === "elite" ? BOMB_SURE : BOMB_SURE * 0.6);
  }
  for (const enemy of sim.enemies) {
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    if (start.scaling && !start.illusion) score += weights.damage * 0.6 * Math.max(0, start.hp - Math.max(0, enemy.hp));
  }
  for (const enemy of kills) {
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    const threat2 = start.attacks.reduce((sum, attack) => sum + attack.damage * attack.hits, 0);
    score += weights.killBase + weights.killPerIncoming * threat2;
  }
  let sleepCost = 0;
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    if (!enemy.sleepLost || start.attacks.length > 0) continue;
    if (start.hp - enemy.hp >= start.hp * SLEEP_BIG_HIT) continue;
    sleepCost += weights.hp * enemy.sleepLost * sleepTurnDamage(start);
  }
  score -= sleepCost;
  let enrageCost = 0;
  for (const enemy of living) {
    const start = input.enemies.find((entry) => entry.index === enemy.index);
    const addedVulnerable = Math.max(0, enemy.vulnerable - start.vulnerable);
    const addedWeak = Math.max(0, enemy.weak - start.weak);
    score += weights.vulnerable * Math.min(addedVulnerable, 3);
    const addedDemise = Math.max(0, (enemy.demise ?? 0) - (start.demise ?? 0));
    if (addedDemise > 0) score += weights.damage * Math.min(enemy.hp, addedDemise * DEMISE_TURNS);
    if (start.attacks.length > 0 || enemy.weak > 0) score += weights.weak * Math.min(addedWeak, 3);
    const addedShrink = Math.max(0, (enemy.shrink ?? 0) - (start.shrink ?? 0));
    if (addedShrink > 0) score += weights.weak * 1.2 * Math.min(addedShrink - 1, 3);
    const strengthCost = enemy.strengthDelta * ((enemy.enrage ?? 0) > 0 ? Math.max(3, weights.hp * ENRAGE_FUTURE_HITS) : 3);
    score -= strengthCost;
    if ((enemy.enrage ?? 0) > 0) enrageCost += strengthCost;
  }
  const later = turnsLeftOf(input) === 1 ? 0 : 1;
  if (!winsFight) {
    score += lastingValue(sim, weights) * lastingScale(input);
    score += platingValue * later;
    score += drawScoreAt(sim.draws, sim.energy);
    score += later * nextTurnEnergyOf(sim, input) * RADIANCE_ENERGY_VALUE;
    score -= later * sim.exhausted.reduce((sum, card) => sum + Math.max(0, exhaustValue(card, weights)), 0);
    if (sim.mantles > 0 && hpAfter <= 10) score -= sim.mantles * (MANTLE_VALUE * lastingScale(input) + weights.hp * 5);
  }
  if (gambitPlayed && !winsFight) score -= weights.hp * GAMBIT_COST;
  score += sim.feedKills * 12;
  if (!winsFight) score -= DAZED_COST * sim.dazedAdded * (input.drawPile !== void 0 && input.drawPile.length < 10 ? 2 : 1);
  return {
    steps: sim.steps,
    score,
    outcome: {
      winsFight,
      hpLoss,
      hpAfter,
      dies,
      // Dead on our own turn, by our own cards (Blood Wall's cost at 2 HP: JSA5K8YZ9RXV F48 T6), before the enemy acts.
      ...dies && !winsFight && (sim.hp <= 0 || diesBeforePoison) ? { diesOwnTurn: true } : {},
      ...revived ? { revived } : {},
      blockGained: sim.blockGained + etherealBlock,
      // Damage into a Giant husk is worth nothing (scored so above) and is not shown as dealt either (YQL8D59999AX
      // F17 T8: every line on the blast turn read "dmg 88", "瀑布巨兽 999999889 HP").
      damageDealt: sim.damageDealt - huskDamage,
      ...input.player.serpentForm !== void 0 ? { serpentFormAfter: sim.serpentForm } : {},
      kills: kills.map((enemy) => enemy.name),
      restocked: restocked.map((enemy) => enemy.name),
      ...spawning.length > 0 ? { spawns: spawning.map((enemy) => `${enemy.name}: ${enemy.spawnsOnDeath}`) } : {},
      enemyHpAfter: sim.enemies.filter((enemy) => input.enemies.find((start) => start.index === enemy.index).hp > 0).map((enemy) => ({
        index: enemy.index,
        name: enemy.name,
        hp: Math.max(0, enemy.hp),
        vulnerable: enemy.vulnerable,
        weak: enemy.weak,
        ...(enemy.poison ?? 0) > 0 || (input.enemies.find((start) => start.index === enemy.index)?.poison ?? 0) > 0 ? { poison: enemy.poison ?? 0 } : {},
        block: Math.max(0, enemy.block),
        artifact: enemy.artifact,
        slippery: enemy.slippery ?? 0,
        curlUp: enemy.curlUp ?? 0,
        flutter: enemy.flutter ?? 0,
        strengthGained: enemy.strengthDelta,
        shrink: enemy.shrink ?? 0,
        ...(enemy.demise ?? 0) > 0 ? { demise: enemy.demise } : {},
        ...enemy.ravenousStunned ? { stunned: true } : {},
        ...stripStunOf(enemy, input),
        ...enemy.moveOnStrip ? moveRuleOf(enemy, input) : {},
        ...enemy.moveOnDeath ? deathMoveOf(enemy, sim, input) : {},
        ...enemy.maxHp >= 1e6 ? { husk: true } : {}
      })),
      incomingAfterBlock,
      energyLeft: sim.energy,
      vulnerableApplied: sim.vulnerableApplied,
      weakApplied: sim.weakApplied,
      strengthGained: sim.permStrength,
      cardsDrawn: sim.cardsDrawn,
      ...sim.apotheosisApplied ? { apotheosisApplied: true } : {},
      unknownCards: [
        ...sim.unknown,
        ...sim.apotheosisApplied && sim.drewUnknown ? ["\u795E\u5316\uFF08\u672A\u77E5\u540E\u7EED\u62BD\u724C\u5347\u7EA7\u672A\u9A8C\u8BC1\uFF09"] : [],
        ...input.player.tungstenRod && !rodVerified && !winsFight ? ["\u94A8\u5408\u91D1\u68CD\uFF08\u81EA\u8EAB\u5931\u8840\u6216\u5176\u4ED6\u51CF\u635F\u4EA4\u4E92\u672A\u9A8C\u8BC1\uFF09"] : [],
        ...input.player.paelsLegionPreview && sim.tempDex !== 0 ? ["\u4F69\u5C14\u7684\u58EB\u5175\uFF08\u65B9\u6848\u5185\u65B0\u589E\u654F\u6377\u7EC4\u5408\u672A\u9A8C\u8BC1\uFF09"] : []
      ],
      sandpitAfter,
      ...stunned.length > 0 ? { stuns: stunned.map((enemy) => enemy.name), stunIndexes: stunned.map((enemy) => enemy.index), stunSaved } : {},
      ...sim.bufferSpent > 0 ? { bufferSpentBySelf: sim.bufferSpent } : {},
      startTurnKills: startTurnKills.map((enemy) => enemy.name),
      withersAdded,
      ...endTurnGuards.length > 0 ? { endTurnGuards } : {},
      ...sim.dazedAdded > 0 && !winsFight ? { dazedAdded: sim.dazedAdded } : {},
      ...woundsAdded > 0 ? { woundsAdded } : {},
      sleepCost,
      // Enrage's Strength is lasting too, the other way: a line feeding it cannot dominate on this axis.
      lasting: lastingValue(sim, weights) - enrageCost + platingValue,
      blockWasted: winsFight ? 0 : Math.max(0, blockLeft - incomingRaw),
      ...explodesNext > 0 ? { explodesNext, eruptionMargin: hpAfter + (input.player.keepsBlock ? Math.max(0, blockLeft - incomingRaw) : 0) - explodesNext } : {},
      ...sim.exhausted.length > 0 ? { exhausted: sim.exhausted.map((card) => card.index) } : {},
      ...sim.drawnExhausted > 0 ? { drawnExhausted: sim.drawnExhausted } : {},
      ...sim.randomExhausts > 0 ? { randomExhausts: sim.randomExhausts } : {},
      ...sim.thrashGrowth.length > 0 ? { thrashGrowth: sim.thrashGrowth } : {},
      ...sim.maulGrowth > 0 ? { maulGrowth: sim.maulGrowth } : {},
      ...sim.thrashRandom.length > 0 ? { thrashRandom: sim.thrashRandom } : {},
      ...sim.freeAttacks > 0 ? { freeAttacksLeft: sim.freeAttacks } : {},
      ...sim.relicAttacks > 0 ? { attackPlays: sim.relicAttacks } : {},
      ...input.player.tuningFork && input.player.tuningFork.every > 0 ? { tuningForkCount: (input.player.tuningFork.count + sim.relicSkills) % input.player.tuningFork.every } : {},
      ...input.player.permafrostBlock !== void 0 ? { permafrostBlockLeft: sim.permafrostBlock } : {},
      ...sim.lastingDrinks > 0 ? { lastingDrinks: sim.lastingDrinks } : {},
      ...sim.potionCost > 0 ? { potionCost: sim.potionCost } : {},
      ...sim.potionHeal > 0 ? { potionHeal: sim.potionHeal } : {},
      ...retaliated.length > 0 ? { retaliated } : {},
      ...clayBlockNext > 0 ? { clayBlockNext } : {},
      ...heldPenalty > 0 && !winsFight ? { heldDamage: heldPenalty, heldDamageFrom } : {},
      ...heldHpLoss > 0 ? { heldHpLoss, heldHpLossFrom } : {},
      ...!winsFight && nextTurnEnergyOf(sim, input) > 0 ? { nextTurnEnergy: nextTurnEnergyOf(sim, input) } : {},
      ...!winsFight && sim.nextTurnBlock > 0 ? { nextTurnBlock: sim.nextTurnBlock } : {}
    }
  };
}
function lossesPast(amounts, block, buffer) {
  let pool = block;
  let stacks = buffer;
  let count2 = 0;
  for (const amount of amounts) {
    if (amount <= 0) continue;
    const absorbed = Math.min(pool, amount);
    pool -= absorbed;
    if (amount - absorbed <= 0) continue;
    if (stacks > 0) {
      stacks -= 1;
      continue;
    }
    count2 += 1;
  }
  return count2;
}
function nextTurnEnergyOf(sim, input) {
  return (input.player.paelsTears ?? 0) > 0 && sim.energy > 0 ? input.player.paelsTears : 0;
}
function turnOnlyDrink(card) {
  if (card.type !== "Potion") return true;
  const lasting = (card.demise ?? 0) > 0 || (card.shrink ?? 0) > 0 || card.vulnerable > 0 || card.weak > 0 || card.strength !== 0 || card.enemyStrength !== 0 || (card.plating ?? 0) > 0 || (card.regen ?? 0) > 0 || (card.thorns ?? 0) > 0 || card.hpLoss > 0 || (card.adds ?? []).length > 0 || (card.drawn ?? []).length > 0 || card.generates !== void 0;
  return !lasting && TURN_ONLY_SPECIALS.has(card.special ?? "");
}
function simKey(sim) {
  const hand = sim.hand.map((card) => `${card.cardId}${card.upgraded ? "+" : ""}:${card.cost}`).sort().join(",") + (sim.duplicateSkills > 0 ? `#bs${sim.duplicateSkills}` : "") + (sim.slothPlays > 0 ? `#sloth${sim.slothPlays}` : "") + (sim.noDraw ? "#noDraw" : "") + (sim.apotheosisApplied ? "#apotheosis" : "");
  const enemies = sim.enemies.map((enemy) => `${enemy.hp}/${enemy.block}/${enemy.vulnerable}/${enemy.weak}/${enemy.artifact}/${enemy.strengthDelta}/${enemy.slippery ?? 0}/${enemy.curlUp ?? 0}/${enemy.flutter ?? 0}/${enemy.sleepLost ?? 0}/${enemy.tempStrengthLoss ?? 0}/${enemy.demise ?? 0}/${enemy.shrink ?? 0}/${enemy.ravenousStunned ? 1 : 0}`).join("|");
  const phantomKey = (sim.phantomBlades > 0 ? `#pb${sim.phantomBlades}/${sim.phantomBladesSpent ? 1 : 0}` : "") + (sim.serpentForm !== null ? `#sf${sim.serpentForm}` : "");
  const poisonKey = (sim.envenom > 0 ? `#env${sim.envenom}` : "") + (sim.enemies.some((enemy) => (enemy.poison ?? 0) > 0) || sim.poisonExtraTriggers > 0 ? `#p${sim.poisonExtraTriggers}:${sim.enemies.map((enemy) => enemy.poison ?? 0).join(",")}` : "");
  return `${hand}#${sim.energy}#${sim.hp}#${sim.block}#${sim.strength}#${sim.hpLostThisTurn ? 1 : 0}#${enemies}#${sim.flat}#${sim.tempDex}#${sim.buffer}#${sim.retaliate}#${sim.rupture}#${sim.facing}#${sim.colossus ? 1 : 0}#${sim.played}#${sim.draws.map((draw) => `${draw.withEnergy}/${draw.withoutEnergy}`).join(",")}#${sim.exhausted.length}/${sim.exhaustedCount > 0 ? 1 : 0}#${sim.escapes}#${sim.mantles}#${sim.enraged}#${sim.tainted}#${sim.inferno}#${sim.bombs}#${sim.gigantic}#${sim.topPlaced ? 1 : 0}#${sim.vigor}#${sim.noBlock ? 1 : 0}#${sim.attacksPlayed}/${sim.relicAttacks}/${sim.skillsPlayed}#${sim.freeAttacks}#${sim.duplicate}/${sim.duplicateAttacks}#${sim.drawnInHand}#${sim.bufferSpent}#${sim.regen}#${sim.pileDrawn}#${sim.plating}#${sim.strikeReplay}#${sim.hpLossEvents}#${sim.axeReplay ? 1 : 0}${sim.relicSkills > 0 ? `#${sim.relicSkills}` : ""}${sim.infernos > 0 ? `#i${sim.infernos}` : ""}${sim.rage > 0 ? `#r${sim.rage}` : ""}${sim.locked.length > 0 && sim.hand.some((card) => card.handCondition !== void 0) ? `#l${sim.locked.length}` : ""}${sim.hand.some((card) => (card.perExhaustDamage ?? 0) > 0) ? `#x${sim.exhaustedCount}` : ""}${poisonKey}${phantomKey}${sim.maulGrowth > 0 ? `#m${sim.maulGrowth}` : ""}${sim.shadowmeld ? "#sm" : ""}${sim.corrosiveWave > 0 ? `#cw${sim.corrosiveWave}` : ""}${sim.fasten > 0 ? `#fasten${sim.fasten}` : ""}${sim.nextTurnBlock > 0 ? `#nextBlock${sim.nextTurnBlock}` : ""}`;
}
function isFreeDraw(card) {
  return card.type !== "Potion" && card.cost === 0 && !card.xCost && card.draw > 0 && card.damage === null && card.block === 0 && card.hpLoss === 0 && !card.randomExhaust && !card.putsOnTop && !EXHAUST_PICKERS.has(card.cardId) && !EXHAUST_HAND.has(card.cardId) && // CARD_CONDITIONS: Restlessness draws only on an empty hand: when it is played matters.
  card.handCondition === void 0;
}
function drawsCards(card) {
  return card.draw > 0 || card.drawsUntil === true;
}
function replay(input, weights, steps) {
  let sim = rootSim(input, weights);
  for (const step of steps) {
    const card = sim.hand.find((entry) => entry.index === step.cardIndex);
    if (!card) return null;
    let chosen = card;
    if ((input.player.toughBandagesBlock ?? 0) > 0 && card.discardAfterDraw && step.discards) chosen = { ...card, discards: step.discards };
    if (hiddenDaggers(card) && step.discards) {
      const pool = [...sim.hand, ...sim.held, ...sim.locked].filter((entry) => entry.key !== card.key && entry.type !== "Potion");
      const discards = [];
      for (const id of step.discards) {
        const at2 = pool.findIndex((entry) => entry.cardId === id);
        if (at2 < 0) return null;
        discards.push(pool.splice(at2, 1)[0].key);
      }
      chosen = { ...card, discards };
    }
    const next = play(sim, chosen, step.target, input.player);
    if (!next) return null;
    sim = next;
  }
  return evaluate(sim, input, weights);
}
function drawFirst(plan, input, weights = weightsFor(input)) {
  const cardOf = (step) => input.hand.find((card) => card.index === step.cardIndex);
  const at2 = plan.steps.findIndex((step) => {
    const card = cardOf(step);
    return card !== void 0 && isFreeDraw(card);
  });
  if (at2 <= 0) return plan;
  const otherDraws = plan.steps.some((step, index) => {
    const card = cardOf(step);
    return index !== at2 && card !== void 0 && drawsCards(card);
  });
  if (otherDraws) return plan;
  const steps = [plan.steps[at2], ...plan.steps.slice(0, at2), ...plan.steps.slice(at2 + 1)];
  const moved = replay(input, weights, steps);
  if (!moved) return plan;
  const same = Math.abs(moved.score - plan.score) < 1e-6 && moved.outcome.hpLoss === plan.outcome.hpLoss && moved.outcome.damageDealt === plan.outcome.damageDealt && moved.outcome.kills.join(",") === plan.outcome.kills.join(",");
  return same ? moved : plan;
}
function rootSim(input, weights) {
  return {
    noDraw: input.player.noDraw === true,
    hand: input.hand.filter((card) => card.playable),
    energy: input.player.energy,
    hp: input.player.hp,
    block: input.player.block,
    strength: 0,
    permStrength: 0,
    hpLostThisTurn: false,
    skullUp: (input.player.redSkull ?? 0) > 0 && input.player.hp * 2 <= input.player.maxHp,
    hpLossEvents: 0,
    enemies: input.enemies.map((enemy) => ({ ...enemy, alive: enemy.hp > 0, newlyWeak: false, strengthDelta: 0, lostThisTurn: 0 })),
    shrunk: input.player.shrunk === true,
    steps: [],
    blockGained: 0,
    damageDealt: 0,
    vulnerableApplied: 0,
    weakApplied: 0,
    flat: 0,
    tempDex: 0,
    fasten: 0,
    shadowmeld: false,
    corrosiveWave: input.player.corrosiveWave ?? 0,
    envenom: input.player.envenom ?? 0,
    phantomBlades: input.player.phantomBlades ?? 0,
    phantomBladesSpent: input.player.phantomBladesSpent ?? false,
    intangible: false,
    buffer: input.player.buffer ?? 0,
    bufferSpent: 0,
    duplicate: input.player.duplicate ?? 0,
    duplicateAttacks: input.player.duplicateAttacks ?? 0,
    duplicateSkills: input.player.duplicateSkills ?? 0,
    retaliate: input.player.retaliate ?? 0,
    rupture: input.player.rupture ?? 0,
    facing: input.player.facing ?? null,
    // A Colossus already up is in the intents (2WUM T7: 10x7 shown as 5x7, then halved again to 2x7).
    colossus: false,
    played: input.cardsPlayedThisTurn ?? 0,
    slothPlays: 0,
    draws: [],
    cardsDrawn: 0,
    drawnInHand: 0,
    regen: input.player.regen ?? 0,
    plating: 0,
    nextTurnBlock: input.player.nextTurnBlock ?? 0,
    strikeReplay: input.player.strikeReplay ?? 0,
    axeReplay: input.player.firstCardReplay === true,
    unknown: [],
    feedKills: 0,
    dazedAdded: 0,
    escapes: 0,
    mantles: 0,
    infernos: 0,
    enraged: 0,
    tainted: 0,
    inferno: input.player.inferno ?? 0,
    feelNoPain: input.player.feelNoPain ?? 0,
    afterImage: input.player.afterImage ?? 0,
    serpentForm: input.player.serpentForm ?? null,
    poisonExtraTriggers: input.player.poisonExtraTriggers ?? 0,
    hellraiser: input.player.hellraiser === true,
    darkEmbrace: input.player.darkEmbrace ?? 0,
    lastingDrinks: 0,
    potionCost: 0,
    potionHeal: 0,
    attacksPlayed: 0,
    relicAttacks: 0,
    skillsPlayed: 0,
    relicSkills: 0,
    freeAttacks: input.player.freeAttacks ?? 0,
    unmovableSpent: false,
    permafrostBlock: input.player.permafrostBlock ?? 0,
    bombs: 0,
    gigantic: 0,
    pile: pileValue(input.drawPile, weights.hp, quietTurn(input) && !input.player.keepsBlock),
    pileDrawn: 0,
    known: input.knownTop && input.knownTop.length > 0 ? input.knownTop : null,
    exhausted: [],
    drawnExhausted: 0,
    randomExhausts: 0,
    thrashGrowth: [],
    maulGrowth: 0,
    thrashRandom: [],
    exhaustedCount: input.player.exhaustedThisTurn ? 1 : 0,
    held: input.hand.filter((card) => !card.playable),
    ...input.hand.some((card) => card.hitsLoseHandSkills) ? { observedSkillKeys: input.hand.filter((card) => card.type === "Skill").map((card) => card.key) } : {},
    rage: 0,
    locked: [],
    topPlaced: false,
    vigor: input.player.vigor ?? 0,
    noBlock: input.player.noBlock === true
  };
}
function replaySteps(input, steps) {
  return replay(input, weightsFor(input), steps);
}
function solveTurn(input) {
  const maxNodes = input.maxNodes ?? 6e4;
  const weights = weightsFor(input);
  const root = rootSim(input, weights);
  const seen = /* @__PURE__ */ new Set();
  const byOutcome = /* @__PURE__ */ new Map();
  let nodes = 0;
  let truncated = false;
  let drewUnknown = false;
  let knownDepth = 0;
  let drew = false;
  let timedOut = false;
  let lives = false;
  const watchedAlive = /* @__PURE__ */ new Set();
  const ownDeathEnds = input.stopAtOwnDeath === true && (input.player.revives ?? []).length === 0;
  const visit = (sim) => {
    nodes += 1;
    if (sim.drewUnknown) drewUnknown = true;
    if (sim.known !== null && sim.pileDrawn > knownDepth) knownDepth = sim.pileDrawn;
    if (sim.cardsDrawn > 0) drew = true;
    if (input.watch !== void 0 && sim.hp > 0 && sim.steps.length > 0) {
      const last = sim.steps[sim.steps.length - 1].cardIndex;
      if (input.watch.has(last)) watchedAlive.add(last);
    }
    const plan = evaluate(sim, input, weights);
    const o = plan.outcome;
    const potionSteps = sim.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId);
    const potionsDrunk = potionSteps.length;
    const signature = `${o.hpLoss}|${o.damageDealt}|${o.kills.join(",")}|${o.enemyHpAfter.map((enemy) => `${enemy.hp}:${enemy.vulnerable}:${enemy.weak}${enemy.poison ? `:p${enemy.poison}` : ""}`).join(",")}|${o.strengthGained}|${o.cardsDrawn}|${o.sandpitAfter ?? "-"}|${Math.round(plan.score)}|${[...potionSteps].sort().join(",")}${o.maulGrowth && !o.winsFight ? `|m${o.maulGrowth}` : ""}${sim.pendingSelection ? "|selection" : ""}`;
    const existing = byOutcome.get(signature);
    const tie = existing !== void 0 && Math.abs(plan.score - existing.score) < 1e-9;
    const fewerPotions = tie && potionsDrunk < potionStepCount(existing.steps);
    const samePotions = tie && potionsDrunk === potionStepCount(existing.steps);
    if (!existing || plan.score > existing.score + 1e-9 || fewerPotions || samePotions && plan.steps.length < existing.steps.length) {
      byOutcome.set(signature, plan);
    }
    if (input.stopOnLive === true && !o.dies) {
      lives = true;
      return;
    }
    if (nodes >= maxNodes) {
      truncated = true;
      return;
    }
    if (input.deadline !== void 0 && nodes % 64 === 0 && (input.deadlineNow ?? Date.now)() > input.deadline) {
      truncated = true;
      timedOut = true;
      return;
    }
    if (sim.enemies.every((enemy) => !enemy.alive) || plan.outcome.winsFight) return;
    if (ownDeathEnds && sim.hp <= 0) return;
    const tried = /* @__PURE__ */ new Set();
    const cardPlays = input.player.slothDefendReplay ? sim.slothPlays : sim.steps.filter((step) => !step.cardId.startsWith("POTION:")).length;
    const playsLeft = input.player.maxPlays === null || input.player.maxPlays === void 0 ? Infinity : input.player.maxPlays - cardPlays;
    const skillsLeft = input.player.maxSkills === null || input.player.maxSkills === void 0 ? Infinity : input.player.maxSkills - sim.skillsPlayed;
    for (const card of sim.hand.flatMap((entry) => hiddenDaggers(entry) ? hiddenDaggerWays(sim, entry) : entry.special === "gamble" ? gambleWays(sim, entry) : entry.choices ? choiceWays(entry) : [entry])) {
      if (card.type !== "Potion" && playsLeft <= 0) continue;
      if (card.type === "Skill" && skillsLeft <= 0) continue;
      if (input.firstKey !== void 0 && sim.steps.length === 0 && card.key !== input.firstKey) continue;
      const targets = card.target === "single" ? card.validTargets.filter((index) => sim.enemies.some((enemy) => enemy.index === index && enemy.alive)) : [null];
      for (const target of targets) {
        const dedupe = `${card.cardId}${card.upgraded ? "+" : ""}:${card.cost}@${target ?? "-"}${card.discards ? `/${card.discards.join(",")}` : ""}${card.generates ? `>${card.generates.cardId}` : ""}`;
        if (tried.has(dedupe)) continue;
        tried.add(dedupe);
        const next = play(sim, card, target, input.player);
        if (!next) continue;
        const key = simKey(next);
        if (seen.has(key)) continue;
        seen.add(key);
        visit(next);
        if (truncated || lives) return;
      }
    }
  };
  visit(root);
  const plans = [...byOutcome.values()].map((plan) => drawFirst(plan, input, weights)).sort((a, b) => b.score - a.score);
  const result = {
    plans,
    nodes,
    truncated,
    ...drewUnknown ? { drewUnknown: true } : {},
    ...root.known !== null ? { knownDepth } : {},
    ...drew ? { drew: true } : {},
    ...timedOut ? { timedOut: true } : {},
    ...lives ? { lives: true } : {},
    ...input.watch !== void 0 ? { watchedAlive: [...watchedAlive].sort((a, b) => a - b) } : {}
  };
  solveTap.onSolve?.(input, result);
  return result;
}
function potionStepCount(steps) {
  return steps.filter((step) => step.cardId.startsWith("POTION:")).length;
}
function effectiveLoss(plan) {
  return plan.outcome.hpLoss + (plan.outcome.potionCost ?? 0);
}
function enemyStrengthGained(outcome) {
  return outcome.enemyHpAfter.filter((enemy) => enemy.hp > 0).reduce((sum, enemy) => sum + (enemy.strengthGained ?? 0), 0);
}
function vector(plan) {
  const known = vectors.get(plan);
  if (known) return known;
  const out = outcomeVector(plan);
  vectors.set(plan, out);
  return out;
}
function outcomeVector(plan) {
  const o = plan.outcome;
  const debuffs = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).reduce((sum, enemy) => sum + Math.min(enemy.vulnerable, 3) + Math.min(enemy.weak, 3), 0);
  const living = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).length;
  const drawn = o.energyLeft > 0 ? o.cardsDrawn : 0;
  const eruption = (o.explodesNext ?? 0) > 0 ? o.eruptionMargin ?? -(o.explodesNext ?? 0) : 0;
  return [o.winsFight ? 1 : 0, -o.hpLoss, o.damageDealt, -living, debuffs, o.strengthGained, drawn, -potionStepCount(plan.steps), o.sandpitAfter ?? 0, -o.sleepCost, Math.floor(o.lasting / 5), o.stunSaved ?? 0, -(o.revived?.sources.length ?? 0), eruption, o.nextTurnEnergy ?? 0, o.winsFight ? 0 : o.maulGrowth ?? 0, o.winsFight ? 0 : -enemyStrengthGained(o)];
}
function dominates(a, b) {
  if (a.outcome.unknownCards.length > 0 || b.outcome.unknownCards.length > 0) return false;
  if (!a.outcome.winsFight && !b.outcome.winsFight) {
    for (const enemy of a.outcome.enemyHpAfter) {
      if (enemy.hp <= 0) continue;
      const other = b.outcome.enemyHpAfter.find((entry) => entry.index === enemy.index && entry.hp > 0);
      if (other && (enemy.poison ?? 0) !== (other.poison ?? 0)) return false;
    }
  }
  const va = vector(a);
  const vb = vector(b);
  let better = false;
  for (let index = 0; index < va.length; index += 1) {
    if (va[index] < vb[index]) return false;
    if (va[index] > vb[index]) better = true;
  }
  return better;
}
function paretoFront(plans) {
  const order = plans.map((plan, index) => ({ plan, index, v: vector(plan) }));
  if (order.some((entry) => entry.v.some((x) => !Number.isFinite(x)))) return plans.filter((plan) => !plans.some((other) => other !== plan && dominates(other, plan)));
  order.sort((a, b) => {
    for (let k = 0; k < a.v.length; k += 1) if (a.v[k] !== b.v[k]) return b.v[k] - a.v[k];
    return a.index - b.index;
  });
  const front = [];
  const kept = /* @__PURE__ */ new Set();
  for (const { plan } of order) {
    if (front.some((other) => dominates(other, plan))) continue;
    front.push(plan);
    kept.add(plan);
  }
  return plans.filter((plan) => kept.has(plan));
}
function distinctPlans(plans, limit2) {
  const front = paretoFront(plans);
  const picked = [];
  for (const plan of front) {
    if (picked.length >= limit2) break;
    const similar = picked.some(
      (other) => other.outcome.winsFight === plan.outcome.winsFight && Math.abs(other.outcome.hpLoss - plan.outcome.hpLoss) <= 2 && Math.abs(other.outcome.damageDealt - plan.outcome.damageDealt) <= 3 && other.outcome.kills.length === plan.outcome.kills.length && other.outcome.strengthGained === plan.outcome.strengthGained && enemyStrengthGained(other.outcome) === enemyStrengthGained(plan.outcome) && other.outcome.sandpitAfter === plan.outcome.sandpitAfter && (other.outcome.nextTurnEnergy ?? 0) === (plan.outcome.nextTurnEnergy ?? 0)
    );
    if (!similar) picked.push(plan);
  }
  const drinks2 = (plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));
  if (limit2 >= 2 && picked.length > 0 && picked.every(drinks2)) {
    const dry = plans.filter((plan) => !drinks2(plan));
    const keep2 = dry.find((plan) => !dry.some((other) => other !== plan && dominates(other, plan)));
    if (keep2) {
      if (picked.length >= limit2) picked.pop();
      picked.push(keep2);
    }
  }
  return picked;
}
var SHRINK_DAMAGE_FACTOR, SHRINKER, STRIP_COUNTERS, MOVE_RULE_POWERS, WITHER_FUTURE_REDRAWS, QUIET_SELF_DAMAGE_WEIGHT, NEXT_HIT_MARGIN, DRAW_VALUE, DRAW_IDLE_VALUE, EXHAUST_PICKERS, HOWL_EXHAUST_VALUE, EXHAUST_HAND, HAND_LIMIT, STABLE_SERUM_TURNS, GLOWWATER_DRAW, BOTTLED_DRAW, EXHAUST_WEIGHTS, GAMBLE_MAX_CARDS, BLOOD_POTION_HEAL, REGEN_LATER_SHARE, CRAB_RAGE_BLOCK, HELMET_MIN_COST, PEN_NIB_EVERY, FREE_CARD_LASTING, CRAB_RAGE_STRENGTH, MUSIC_BOX_INDEX, SLEEP_BIG_HIT, CONCENTRATION_BONUS, FOCUS_BONUS, MINION_CHIP, WOUND_COST, GAMBIT_COST, PACTS_END_EXHAUST, SANDPIT_TURN_DAMAGE, DAZED_COST, BOMB_SURE, ERUPTION_NEXT_BLOCK, ERUPTION_RACE_DAMAGE, NEXT_PHASE_HP, ENRAGE_FUTURE_HITS, DEX_POTION, DEX_LASTING_PER_BLOCK_CARD, CLARITY_LATER_DRAWS, RADIANCE_LATER_ENERGY, RADIANCE_ENERGY_VALUE, RITUAL_VALUE, STEW_LATER_SHARE, SNECKO_COST, DEMISE_TURNS, MANTLE_VALUE, CRAB_GAP_FREE, CRAB_GAP_WEIGHT, CRAB_LOW_MARGIN, CRAB_HIGH_HP, INFERNO_MOST_PER_COPY, TURN_ONLY_SPECIALS, solveTap, vectors;
var init_turn_solver = __esm({
  "src/reflex/turn-solver.ts"() {
    "use strict";
    init_card_model();
    init_continuation_value();
    SHRINK_DAMAGE_FACTOR = 0.7;
    SHRINKER = "SHRINKER_BEETLE";
    STRIP_COUNTERS = { FLUTTER_POWER: "flutter", SLIPPERY_POWER: "slippery", CURL_UP_POWER: "curlUp", ARTIFACT_POWER: "artifact" };
    MOVE_RULE_POWERS = /* @__PURE__ */ new Set([...Object.keys(STRIP_COUNTERS), "STOCK_POWER", "CRAB_RAGE_POWER"]);
    WITHER_FUTURE_REDRAWS = 1;
    QUIET_SELF_DAMAGE_WEIGHT = 3;
    NEXT_HIT_MARGIN = 5;
    DRAW_VALUE = 3;
    DRAW_IDLE_VALUE = 1;
    EXHAUST_PICKERS = /* @__PURE__ */ new Set(["BURNING_PACT", "TRUE_GRIT", "BRAND"]);
    HOWL_EXHAUST_VALUE = 50;
    EXHAUST_HAND = /* @__PURE__ */ new Set(["STOKE", "FIEND_FIRE"]);
    HAND_LIMIT = 10;
    STABLE_SERUM_TURNS = 2;
    GLOWWATER_DRAW = 10;
    BOTTLED_DRAW = 5;
    EXHAUST_WEIGHTS = { hp: 1, damage: 0.45, killBase: 0, killPerIncoming: 0, vulnerable: 2.5, weak: 1.5, strength: 5 };
    GAMBLE_MAX_CARDS = 6;
    BLOOD_POTION_HEAL = 0.2;
    REGEN_LATER_SHARE = 0.5;
    CRAB_RAGE_BLOCK = 99;
    HELMET_MIN_COST = 2;
    PEN_NIB_EVERY = 10;
    FREE_CARD_LASTING = 2;
    CRAB_RAGE_STRENGTH = 6;
    MUSIC_BOX_INDEX = 300;
    SLEEP_BIG_HIT = 0.25;
    CONCENTRATION_BONUS = 0.15;
    FOCUS_BONUS = 0.5;
    MINION_CHIP = 0.25;
    WOUND_COST = 2;
    GAMBIT_COST = 60;
    PACTS_END_EXHAUST = 3;
    SANDPIT_TURN_DAMAGE = 20;
    DAZED_COST = 1.5;
    BOMB_SURE = 0.8;
    ERUPTION_NEXT_BLOCK = 12;
    ERUPTION_RACE_DAMAGE = 1.5;
    NEXT_PHASE_HP = 1.25;
    ENRAGE_FUTURE_HITS = 3;
    DEX_POTION = 2;
    DEX_LASTING_PER_BLOCK_CARD = 1.5;
    CLARITY_LATER_DRAWS = 3;
    RADIANCE_LATER_ENERGY = 3;
    RADIANCE_ENERGY_VALUE = 4;
    RITUAL_VALUE = 10;
    STEW_LATER_SHARE = 0.45;
    SNECKO_COST = 1.5;
    DEMISE_TURNS = 3;
    MANTLE_VALUE = 16;
    CRAB_GAP_FREE = 30;
    CRAB_GAP_WEIGHT = 0.5;
    CRAB_LOW_MARGIN = 10;
    CRAB_HIGH_HP = 60;
    INFERNO_MOST_PER_COPY = 9;
    TURN_ONLY_SPECIALS = /* @__PURE__ */ new Set(["", "temp_dex", "triple_block", "heal"]);
    solveTap = { onSolve: null };
    vectors = /* @__PURE__ */ new WeakMap();
  }
});

// src/reflex/potion-mc.ts
function beatsDryLine(plan, dry, lastingHp = 0) {
  if (dry === null) return !plan.outcome.dies;
  if (plan.outcome.dies) return false;
  if (dry.outcome.dies) return true;
  if (plan.outcome.winsFight && !dry.outcome.winsFight) return true;
  const hpSaved = effectiveLoss(dry) - effectiveLoss(plan);
  const damageGained = plan.outcome.damageDealt - dry.outcome.damageDealt;
  return hpSaved + damageGained * MC_BEATS_HP / MC_BEATS_DAMAGE + lastingGainedHp(plan, dry, lastingHp) >= MC_BEATS_HP - 1e-9;
}
function lastingGainedHp(plan, dry, lastingHp) {
  if (plan.outcome.winsFight) return 0;
  return ((plan.outcome.lasting ?? 0) - (dry.outcome.lasting ?? 0)) * lastingHp;
}
function rng(seed2) {
  let a = seed2 >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(items, random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function pickDistinct(pool, k, random) {
  const out = [];
  const left = pool.slice();
  while (out.length < k && left.length > 0) {
    const at2 = Math.floor(random() * left.length);
    const card = left.splice(at2, 1)[0];
    if (!out.some((other) => other.cardId === card.cardId)) out.push(card);
  }
  return out;
}
function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
function knownTopOf(draw, top, addedAt) {
  if (!top.every((at2, i) => Number.isInteger(at2) && at2 >= 0 && at2 < draw.length && top.indexOf(at2) === i)) return null;
  const known = new Set(top);
  if (addedAt && addedAt.length > 0 && addedAt.every((at2, i) => Number.isInteger(at2) && at2 >= 0 && at2 < draw.length && !known.has(at2) && addedAt.indexOf(at2) === i)) {
    const out = new Set(addedAt);
    return { known: top.map((at2) => draw[at2]), rest: draw.filter((_, i) => !known.has(i) && !out.has(i)), added: addedAt.map((at2) => draw[at2]) };
  }
  return { known: top.map((at2) => draw[at2]), rest: draw.filter((_, i) => !known.has(i)), added: [] };
}
function samplePotion(source, hand, random) {
  const { draw: _evDraw, generates: _evCard, ...effect } = potionEffect(source.potionId) ?? { target: "self" };
  const shell = { ...potionShell(source.potionId, source.name, source.slot, []), ...effect, draw: 0, ...(source.cost ?? 0) > 0 ? { potionCost: source.cost } : {} };
  const own = (card, i, prefix, base) => ({ ...card, index: base + i, key: `${prefix}${source.slot}.${i}` });
  if (source.kind === "choice") {
    const spec = CHOICE_POTIONS[source.potionId];
    const pools = source.pools ?? {};
    if (spec.takeAll) {
      const adds = spec.types.flatMap((type) => pickDistinct(pools[type] ?? [], 1, random));
      return { ...shell, adds: adds.map((card, i) => own(card, i, "g", 200 + source.slot * 10)) };
    }
    const pool = spec.types.flatMap((type) => pools[type] ?? []);
    const offer = pickDistinct(pool, CHOICE_OFFERED, random);
    return { ...shell, choices: offer.map((card, i) => own(card, i, "g", 200 + source.slot * 10)) };
  }
  const count2 = DRAW_POTIONS[source.potionId]?.cards ?? 0;
  const piles = source.piles ?? { draw: [], discard: [] };
  const handCards = hand.filter((card) => card.type !== "Potion");
  const top = source.knownTop && source.knownTop.length > 0 && source.potionId !== "BOTTLED_POTENTIAL" ? knownTopOf(piles.draw, source.knownTop, source.knownAdded) : null;
  const order = source.potionId === "BOTTLED_POTENTIAL" ? shuffled([...handCards, ...piles.draw, ...piles.discard], random) : top ? top.added.length > 0 ? [...withAddedAtRandom([...top.known, ...shuffled(top.rest, random)], top.added, random), ...shuffled(piles.discard, random)] : [...top.known, ...shuffled(top.rest, random), ...shuffled(piles.discard, random)] : [...shuffled(piles.draw, random), ...shuffled(piles.discard, random)];
  const drawn = source.noDraw && source.potionId !== "DISTILLED_CHAOS" ? [] : order.slice(0, count2).map((card, i) => own(card, i, "d", 300 + source.slot * 20));
  const sample = { ...shell, drawn };
  if (source.potionId === "SNECKO_OIL") {
    const costs = {};
    for (const card of [...handCards, ...drawn]) costs[card.key] = Math.floor(random() * 4);
    sample.sneckoCosts = costs;
  }
  return sample;
}
function runPotionMc(input, source, dryBest, seed2, budgetMs, requested = potionMcOptions.samples) {
  const now = potionMcOptions.now ?? (() => performance.now());
  const start = now();
  const random = rng(seed2);
  const hand = input.hand.filter((card) => card.type !== "Potion");
  const plans = [];
  let degraded = false;
  const tap = solveTap.onSolve;
  solveTap.onSolve = null;
  try {
    let nodes = MC_NODES;
    const share = budgetMs / Math.max(1, requested);
    let lastTook = 0;
    for (let i = 0; i < requested; i += 1) {
      if (i >= MC_MIN_SAMPLES && now() - start + lastTook > budgetMs) {
        degraded = true;
        break;
      }
      const potion = samplePotion(source, hand, random);
      const began = now();
      const solved = solveTurn({ ...input, hand: [...hand, potion], firstKey: potion.key, maxNodes: nodes });
      const took = now() - began;
      lastTook = took;
      if (took > share && nodes > MC_MIN_NODES) {
        nodes = Math.max(MC_MIN_NODES, Math.floor(nodes * share / took));
        degraded = true;
      }
      plans.push(solved.plans.find((plan) => plan.steps[0]?.cardId === potion.cardId) ?? null);
    }
  } finally {
    solveTap.onSolve = tap;
  }
  const lines = plans.filter((plan) => plan !== null);
  const byScore = [...lines].sort((a, b) => a.score - b.score);
  const median = byScore.length > 0 ? byScore[Math.floor((byScore.length - 1) / 2)] : null;
  const lastingHp = lastingHpPerPoint(input);
  const beatsDry = lines.filter((plan) => beatsDryLine(plan, dryBest, lastingHp)).length;
  const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / Math.max(1, xs.length);
  const vsDry = dryBest !== null && lines.length > 0 ? {
    hpSaved: mean(lines.map((plan) => dryBest.outcome.hpLoss - plan.outcome.hpLoss)),
    damageGained: mean(lines.map((plan) => plan.outcome.damageDealt - dryBest.outcome.damageDealt)),
    lastingGained: mean(lines.map((plan) => lastingGainedHp(plan, dryBest, lastingHp)))
  } : null;
  const result = {
    source,
    samples: plans.length,
    requested,
    plans,
    median,
    hpLoss: spread(lines.map((plan) => plan.outcome.hpLoss)),
    damage: spread(lines.map((plan) => plan.outcome.damageDealt)),
    wins: lines.filter((plan) => plan.outcome.winsFight).length,
    dies: lines.filter((plan) => plan.outcome.dies).length,
    beats: beatsDry,
    vsDry,
    ms: now() - start,
    degraded
  };
  potionMcTap.onRun?.(result);
  return result;
}
function effectText(mc) {
  const { source } = mc;
  const n = `${mc.samples} sample${mc.samples === 1 ? "" : "s"}${mc.degraded ? ` (cut from ${mc.requested} to fit the time budget)` : ""}`;
  if (source.kind === "choice") {
    const spec = CHOICE_POTIONS[source.potionId];
    const pool = spec.types.reduce((sum, type) => sum + (source.pools?.[type]?.length ?? 0), 0);
    const free = (source.powerExtraCost ?? 0) > 0 ? `free this turn (a Power costs ${source.powerExtraCost}: Spiked Gauntlets)` : "free this turn";
    if (spec.takeAll) {
      return {
        does: `adds a random ${spec.types.join(", a random ")} card, ${free}`,
        simulated: `Monte Carlo, ${n}: one random card of each type from the ${source.poolName ?? "card"} pool (${pool} cards, uniform), the drink first`
      };
    }
    return {
      does: `offers ${CHOICE_OFFERED} random ${spec.types.join("/")} cards, take 1, ${free}`,
      simulated: `Monte Carlo, ${n}: ${CHOICE_OFFERED} random cards from the ${source.poolName ?? "card"} pool (${pool} cards, uniform), each solved with the best of the ${CHOICE_OFFERED} taken, the drink first`
    };
  }
  const piles = source.piles ?? { draw: [], discard: [] };
  const cards = DRAW_POTIONS[source.potionId]?.cards ?? 0;
  const what = source.potionId === "GAMBLERS_BREW" ? "discards any cards, draws as many" : source.potionId === "DISTILLED_CHAOS" ? `plays the top ${cards} cards of the draw pile` : source.potionId === "GLOWWATER_POTION" ? `exhausts the hand, draws ${cards}` : source.potionId === "BOTTLED_POTENTIAL" ? `shuffles every card into the draw pile, draws ${cards}` : `draws ${cards}${source.potionId === "SNECKO_OIL" ? ", every card in hand costs 0-3 at random this turn" : ""}`;
  const order = source.potionId === "BOTTLED_POTENTIAL" ? "the hand and both piles shuffled" : `the draw pile (${piles.draw.length} cards) in a random order, then the discard pile (${piles.discard.length}) reshuffled`;
  return { does: what, simulated: `Monte Carlo, ${n}: ${order}${source.potionId === "SNECKO_OIL" ? ", random costs" : ""}, the drink first${source.noDraw ? " (No Draw: nothing is drawn)" : ""}` };
}
function potionMcCriteria(mc, dryBest, stepText2, othersHeld) {
  const { does, simulated } = effectText(mc);
  const n = mc.samples;
  const lines = mc.plans.filter((plan) => plan !== null).length;
  const out = {
    plays: `drink ${mc.source.name} now (${does}), then re-plan the turn with the real cards${mc.median ? `; example, the median of ${n} samples: ${stepText2(mc.median)}` : ""}`,
    result: "result unknown until drunk; after drinking you will see the actual cards and choose the rest of the turn again",
    potion_text: mc.source.text,
    simulated
  };
  if (lines === 0) {
    out["samples"] = "no sample could be played";
    return out;
  }
  out["hp_lost"] = spreadText(mc.hpLoss);
  out["damage_dealt"] = spreadText(mc.damage);
  out["wins_fight_this_turn"] = `${mc.wins}/${n} samples`;
  if (mc.dies > 0) out["dies_this_turn"] = `${mc.dies}/${n} samples`;
  const signed2 = (x) => `${x >= 0 ? "+" : ""}${round1(x)}`;
  out["beats_best_potion_free_line"] = dryBest ? `${mc.beats}/${n} samples (best potion-free line: ${hpText(dryBest.outcome.hpLoss)}, dmg ${dryBest.outcome.damageDealt}${dryBest.outcome.dies ? ", dies" : ""}; a sample beats it by saving ${MC_BEATS_HP}+ HP${(mc.source.cost ?? 0) > 0 ? ` after the potion's cost (${round1(mc.source.cost)} HP)` : ""} or dealing ${MC_BEATS_DAMAGE}+ more damage (or a mix worth as much, the lasting value it sets up counted in HP), winning the fight, or living where it dies)` : `${mc.beats}/${n} samples (no potion-free line)`;
  if (dryBest && mc.vsDry) {
    const lasting = Math.abs(mc.vsDry.lastingGained) >= 0.05 ? `, mean lasting value ${signed2(mc.vsDry.lastingGained)} HP (Strength and powers set up, over the rest of the fight, as the plan scores rate them)` : "";
    out["vs_best_potion_free_line"] = `mean HP saved ${signed2(mc.vsDry.hpSaved)}, mean damage ${signed2(mc.vsDry.damageGained)}${lasting}`;
  }
  if (othersHeld) out["note"] = "the other potions held are not combined in these samples";
  return out;
}
function potionMcLog(mc) {
  return {
    potion: mc.source.potionId,
    kind: mc.source.kind,
    samples: mc.samples,
    requested: mc.requested,
    degraded: mc.degraded,
    ms: Math.round(mc.ms),
    wins: mc.wins,
    beats: mc.beats,
    ...mc.vsDry ? { hp_saved_mean: round1(mc.vsDry.hpSaved), dmg_gained_mean: round1(mc.vsDry.damageGained), lasting_gained_mean: round1(mc.vsDry.lastingGained) } : {},
    dies: mc.dies,
    hp_mean: round1(mc.hpLoss.mean),
    dmg_mean: round1(mc.damage.mean)
  };
}
var MC_SAMPLES, MC_MIN_SAMPLES, MC_NODES, MC_MIN_NODES, MC_BUDGET_MS, CHOICE_OFFERED, POOL_RARITIES, MC_BEATS_HP, MC_BEATS_DAMAGE, potionMcTap, potionMcOptions, spread, round1, spreadText;
var init_potion_mc = __esm({
  "src/reflex/potion-mc.ts"() {
    "use strict";
    init_draws();
    init_card_model();
    init_turn_solver();
    MC_SAMPLES = 12;
    MC_MIN_SAMPLES = 1;
    MC_NODES = 8e3;
    MC_MIN_NODES = 1500;
    MC_BUDGET_MS = 400;
    CHOICE_OFFERED = 3;
    POOL_RARITIES = /* @__PURE__ */ new Set(["Common", "Uncommon", "Rare"]);
    MC_BEATS_HP = 2;
    MC_BEATS_DAMAGE = 5;
    potionMcTap = { onRun: null };
    potionMcOptions = { now: null, budgetMs: MC_BUDGET_MS, samples: MC_SAMPLES };
    spread = (xs) => ({
      mean: xs.length > 0 ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0,
      min: xs.length > 0 ? Math.min(...xs) : 0,
      max: xs.length > 0 ? Math.max(...xs) : 0
    });
    round1 = (x) => Math.round(x * 10) / 10;
    spreadText = (s) => `mean ${round1(s.mean)} [${Math.round(s.min)}-${Math.round(s.max)}]`;
  }
});

// src/reflex/rollout.ts
import { readFileSync as readFileSync8 } from "node:fs";
function expectedNext(mm, id, move) {
  const entry = mm[id];
  if (!entry || !move) return null;
  const successors = entry.next[move];
  if (!successors) return null;
  let total = 0;
  let count2 = 0;
  for (const [m, n] of Object.entries(successors)) {
    const d = entry.damage[m];
    if (d === void 0 || d === null) continue;
    total += d * n;
    count2 += n;
  }
  return count2 ? total / count2 : null;
}
function featuresOf(meta, E, mm) {
  const pw = E.pw;
  const live = E.E.filter((e) => e[5]);
  const nonMinion = live.filter((e) => !e[6]);
  const main2 = nonMinion.length > 0 ? nonMinion : live;
  const deck = meta.deck;
  const f = {};
  f["hp"] = E.hp;
  f["max_hp"] = E.mhp || E.hp || 80;
  f["hp_frac"] = E.hp / Math.max(1, f["max_hp"]);
  f["block"] = E.blk;
  for (const p of PLAYER_POWERS) f[`p_${p.replace("_POWER", "").toLowerCase()}`] = pw[p] ?? 0;
  f["n_powers"] = Object.keys(pw).length;
  f["energy_per_turn"] = meta.max_en;
  f["hand"] = E.hand;
  f["potions"] = E.pots;
  f["relics"] = meta.relics;
  f["deck_n"] = deck.n;
  const n = Math.max(1, deck.n);
  f["deck_atk_frac"] = deck.atk / n;
  f["deck_pow"] = deck.pow;
  f["deck_junk"] = deck.junk;
  f["deck_dmg_per_card"] = deck.dmg / n;
  f["deck_blk_per_card"] = deck.blk / n;
  f["deck_up_frac"] = deck.up / n;
  f["act"] = meta.act || 1;
  f["turn"] = meta.t;
  f["asc"] = meta.asc || 0;
  f["kind_elite"] = meta.kind === "elite" ? 1 : 0;
  f["kind_boss"] = meta.kind === "boss" ? 1 : 0;
  f["n_living"] = live.length;
  f["n_minions"] = live.filter((e) => e[6]).length;
  f["enemy_hp_sum"] = main2.reduce((s, e) => s + Math.max(0, e[2]), 0);
  f["enemy_hp_max"] = main2.length > 0 ? Math.max(...main2.map((e) => e[2])) : 0;
  f["enemy_maxhp_sum"] = main2.reduce((s, e) => s + (e[3] || 0), 0);
  f["enemy_hp_frac"] = f["enemy_hp_sum"] / Math.max(1, f["enemy_maxhp_sum"]);
  f["enemy_block_sum"] = live.reduce((s, e) => s + e[4], 0);
  const strs = live.map((e) => e[9]["STRENGTH_POWER"] ?? 0);
  f["enemy_str_sum"] = strs.reduce((s, v) => s + v, 0);
  f["enemy_str_max"] = strs.length > 0 ? Math.max(...strs) : 0;
  f["enemy_vuln_max"] = Math.max(0, ...live.map((e) => e[9]["VULNERABLE_POWER"] ?? 0));
  f["enemy_weak_max"] = Math.max(0, ...live.map((e) => e[9]["WEAK_POWER"] ?? 0));
  f["enemy_artifact"] = live.reduce((s, e) => s + (e[9]["ARTIFACT_POWER"] ?? 0), 0);
  f["enemy_npowers"] = live.reduce((s, e) => s + Object.keys(e[9]).length, 0);
  const incoming = live.reduce((s, e) => s + e[7], 0);
  f["intent_dmg"] = incoming;
  f["intent_dmg_max"] = Math.max(0, ...live.map((e) => e[7]));
  f["incoming_after_block"] = Math.max(0, incoming - E.blk);
  let next = 0;
  let unknown = 0;
  for (const e of live) {
    let x = expectedNext(mm, e[1], e[8]);
    if (x === null) {
      unknown += 1;
      x = e[7];
    }
    next += x;
  }
  f["threat_next"] = next;
  f["threat_next_unknown"] = unknown;
  const cardsTurn = Math.min(5, meta.max_en * 1.4);
  const atkTurn = cardsTurn * deck.atk / n;
  const raw = cardsTurn * deck.dmg / n + atkTurn * (f["p_strength"] ?? 0);
  f["deck_dmg_turn"] = 9 + 1.04 * raw;
  f["turns_to_kill"] = f["enemy_hp_sum"] / Math.max(1, f["deck_dmg_turn"]);
  f["hp_minus_incoming"] = E.hp - f["incoming_after_block"];
  return f;
}
function clockWin(margin) {
  return 1 / (1 + Math.exp(-margin / 8));
}
function clockEstimate(f) {
  if ((f["n_living"] ?? 0) === 0 || (f["enemy_hp_sum"] ?? 0) <= 0) return { hpLoss: 0, winProb: 0.99, turns: 0 };
  const ttk = Math.min(15, Math.max(1, Math.ceil(f["turns_to_kill"] ?? 1)));
  const per = Math.max(0, (f["threat_next"] ?? 0) - 0.5 * (f["deck_blk_per_card"] ?? 0) * Math.min(5, (f["energy_per_turn"] ?? 3) * 1.4) * (1 - (f["deck_atk_frac"] ?? 0)));
  const loss = (f["incoming_after_block"] ?? 0) + per * (ttk - 1);
  const margin = (f["hp"] ?? 0) - loss;
  return { hpLoss: loss, winProb: clockWin(margin), turns: ttk - 1 };
}
function giantTerminal(clock, f, snap, meta, mm) {
  if (!eruptionOptions.blastTerminal) return clock;
  const live = snap.E.filter((e) => e[5]);
  if (live.length !== 1 || live[0][1] !== GIANT_ID) return clock;
  const giant = live[0];
  const hp = f["hp"] ?? 0;
  if (giant[3] >= HUSK_HP) {
    const blast2 = giant[7];
    if (!(blast2 > 0)) return clock;
    return { hpLoss: Math.max(0, blast2 - ERUPTION_NEXT_BLOCK), winProb: clockWin(hp + ERUPTION_NEXT_BLOCK - blast2), turns: 1 };
  }
  const schedule = eruptionSchedule(meta.asc);
  const stacks = giant[9]["STEAM_ERUPTION_POWER"] ?? 0;
  const blastAt = (k2) => stacks > 0 ? stacks + schedule.perTurn * k2 : eruptionAt(meta.t + k2, meta.asc, schedule);
  const damage = Math.max(1, f["deck_dmg_turn"] ?? 1);
  const heal = meta.asc >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base;
  const nextOf = (move2) => {
    const successors = move2 ? mm[GIANT_ID]?.next[move2] : void 0;
    const ranked = Object.entries(successors ?? {}).filter(([m]) => !(DEATH_MOVES[GIANT_ID] ?? []).includes(m)).sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[0] ?? move2;
  };
  let move = giant[8];
  let healed = 0;
  let k = 1;
  for (; k < GIANT_KILL_TURNS; k += 1) {
    if (move === SIPHON_MOVE) healed += heal;
    if (damage * k >= Math.max(0, giant[2]) + healed) break;
    move = nextOf(move);
  }
  const blast = blastAt(k);
  const perTurn = giantLossPerTurn(meta.asc);
  if (perTurn === null) return clock;
  const loss = (f["incoming_after_block"] ?? 0) + perTurn * (k - 1);
  return { hpLoss: loss + Math.max(0, blast - ERUPTION_NEXT_BLOCK), winProb: clockWin(hp - loss + ERUPTION_NEXT_BLOCK - blast), turns: k };
}
function giantLossPerTurn(asc) {
  const key = `${knowledgeCharacter()}:${asc}`;
  let loss = giantLossCache.get(key);
  if (loss === void 0) {
    const profile = bossProfile(GIANT_ID);
    loss = profile ? bossLossPerTurn(profile, asc).value : null;
    giantLossCache.set(key, loss);
  }
  return loss;
}
function loadFightValueGates() {
  if (gatesCache !== void 0) return gatesCache;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "fight-value-gates.json");
    gatesCache = JSON.parse(readFileSync8(path, "utf8"));
  } catch {
    gatesCache = null;
  }
  return gatesCache;
}
function gateFor(gates, enc, act, kind) {
  if (!gates) return { segment: "none", w: 0, n: 0, advantage: 0, ci: [null, null] };
  for (const key of [`enc:${enc}`, `ak:${act}|${kind}`, `k:${kind}`, "global"]) {
    const entry = gates.segments[key];
    if (!entry) continue;
    const used = gates.segments[entry.uses] ?? entry;
    return { segment: entry.uses, w: entry.w, n: used.n_rows, advantage: used.advantage, ci: used.ci };
  }
  return { segment: "none", w: 0, n: 0, advantage: 0, ci: [null, null] };
}
function logit(p) {
  const c = Math.min(1 - 1e-4, Math.max(1e-4, p));
  return Math.log(c / (1 - c));
}
function calibrate(cal, p) {
  if (!cal || cal.method === "none") return p;
  if (cal.method === "platt") return 1 / (1 + Math.exp(-(cal.ab[0] * logit(p) + cal.ab[1])));
  const knots = cal.knots;
  if (knots.length === 0) return p;
  if (p <= knots[0][0]) return knots[0][1];
  const last = knots[knots.length - 1];
  if (p >= last[0]) return last[1];
  let j = 1;
  while (j < knots.length && knots[j][0] <= p) j += 1;
  const [x0, y0] = knots[j - 1];
  const [x1, y1] = knots[j];
  return x1 === x0 ? y0 : y0 + (y1 - y0) * (p - x0) / (x1 - x0);
}
function solverHpWeight(hp, maxHp) {
  const frac = maxHp > 0 ? hp / maxHp : 1;
  return 1 + 1.5 * Math.max(0, 0.6 - frac) / 0.6;
}
function blend(w, model2, current2) {
  return w * model2 + (1 - w) * current2;
}
function terminal(ctx, snap, t) {
  const meta = { ...ctx.meta, t };
  const f = featuresOf(meta, snap, ctx.mm);
  const clock = giantTerminal(clockEstimate(f), f, snap, meta, ctx.mm);
  const live = snap.E.filter((e) => e[5]);
  const raw = ctx.model ? valueOf({ features: f, enemyIds: live.map((e) => e[1]), encounter: meta.enc, kind: meta.kind, act: meta.act }, ctx.model) : null;
  const model2 = raw ? { hpLoss: raw.hpLoss, winProb: calibrate(ctx.gates?.calibration[meta.kind], raw.winProb), turns: raw.turns } : null;
  const w = model2 ? ctx.w : 0;
  const gated = model2 ? { hpLoss: w * model2.hpLoss + (1 - w) * clock.hpLoss, winProb: w * model2.winProb + (1 - w) * clock.winProb, turns: w * model2.turns + (1 - w) * clock.turns } : clock;
  return { model: model2, clock, gated, n: raw?.n ?? 0 };
}
function turnSpreads(trajectories, horizon) {
  const out = [];
  const stats = (xs) => ({ mean: xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length), min: xs.length ? Math.min(...xs) : 0, max: xs.length ? Math.max(...xs) : 0 });
  for (let t = 1; t < horizon; t += 1) {
    const fighting = trajectories.filter((records) => records.length > t && !records.slice(0, t).some((r) => r.won || r.died || r.timeUp));
    out.push({
      turn: t + 1,
      fighting: fighting.length,
      loss: stats(fighting.map((records) => records[t].loss)),
      dmg: stats(fighting.map((records) => records[t].dmg)),
      alive: trajectories.filter((records) => !records.slice(0, t + 1).some((r) => r.died)).length,
      won: trajectories.filter((records) => records.slice(0, t + 1).some((r) => r.won)).length
    });
  }
  return out;
}
function rng2(seed2) {
  let a = seed2 >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(items, random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function sampledDrawPile(piles, random) {
  const top = piles.drawTop;
  if (!top || top.length === 0) return shuffle(piles.draw, random);
  const valid = top.every((at2, i) => Number.isInteger(at2) && at2 >= 0 && at2 < piles.draw.length && top.indexOf(at2) === i);
  if (!valid) return shuffle(piles.draw, random);
  const known = new Set(top);
  const added = piles.drawAdded;
  if (added && added.length > 0 && added.every((at2, i) => Number.isInteger(at2) && at2 >= 0 && at2 < piles.draw.length && !known.has(at2) && added.indexOf(at2) === i)) {
    const out = new Set(added);
    const rest2 = piles.draw.filter((_, i) => !known.has(i) && !out.has(i));
    return withAddedAtRandom([...top.map((at2) => piles.draw[at2]), ...shuffle(rest2, random)], added.map((at2) => piles.draw[at2]), random).reverse();
  }
  const rest = piles.draw.filter((_, i) => !known.has(i));
  return [...shuffle(rest, random), ...[...top].reverse().map((at2) => piles.draw[at2])];
}
function selectCandidates(plans, k = 6, include = []) {
  const picked = /* @__PURE__ */ new Map();
  const add = (plan, tag) => {
    if (!plan) return;
    const tags = picked.get(plan) ?? [];
    tags.push(tag);
    picked.set(plan, tags);
  };
  plans.slice(0, k).forEach((plan) => add(plan, "top"));
  const best = (key) => plans.reduce((a, b) => a === void 0 || key(b) > key(a) ? b : a, void 0);
  add(best((p) => p.outcome.damageDealt * 1e3 + p.score / 1e3), "damage");
  add(best((p) => -p.outcome.hpLoss * 1e3 + p.score / 1e3), "safe");
  const setup = best((p) => p.outcome.lasting + 5 * p.outcome.strengthGained + p.score / 1e3);
  if (setup && setup.outcome.lasting + setup.outcome.strengthGained > 0) add(setup, "setup");
  include.forEach((plan) => add(plan, "offered"));
  return [...picked.entries()].map(([plan, tags]) => ({ plan, tags }));
}
function hellraised2(card) {
  return { ...card, cost: 0, xCost: false, playable: true, ...card.target === "single" ? { target: "random", validTargets: [] } : {} };
}
function startTurnHpLossOf(player) {
  return player.otherStartLoss + mantleHpCost(player.mantle) + player.infernoCopies;
}
function startLossEvents(player) {
  return (player.inferno > 0 ? 1 : 0) + (player.mantle > 0 ? 1 : 0);
}
function turnStartAoeOf(player) {
  return player.relicAoe + player.inferno * startLossEvents(player) + player.boulder;
}
function moveAttack(enemy, table2, move, playerVulnerable, fight = { fullFight: false, faced: false }) {
  const m = move && table2 ? table2.moves[move] : void 0;
  const scale = (enemy.weak > 0 ? 0.75 : 1) * (enemy.shrink > 0 ? SHRINK_DAMAGE_FACTOR : 1) * (playerVulnerable ? 1.5 : 1);
  if (!m) return enemy.shown.map((a) => ({ damage: Math.floor(a.damage / (enemy.shownScale ?? 1) * scale), hits: a.hits }));
  if (m.damage <= 0) return [];
  const hits = Math.max(1, m.hits) + (move === GROWING_HITS[enemy.id] ? enemy.extraHits ?? 0 : 0);
  const grown = m.growth && move ? m.growth * (enemy.uses?.[move] ?? 0) : 0;
  const own = fight.faced && m.faceDamage !== void 0 ? m.faceDamage : null;
  if (m.shown && own === null) return [{ damage: Math.max(0, Math.floor((m.damage + grown + enemy.vigor) * (enemy.weak > 0 ? 0.75 : 1) * (enemy.shrink > 0 ? SHRINK_DAMAGE_FACTOR : 1))), hits }];
  return [{ damage: Math.max(0, Math.floor(((own ?? m.damage) + grown + enemy.strength + enemy.vigor) * scale)), hits }];
}
function gainsSelf(table2, power) {
  return Object.values(table2?.moves ?? {}).some((move) => (move.selfPowers?.[power] ?? 0) > 0);
}
function usualMove2(table2) {
  if (!table2) return null;
  const counts = /* @__PURE__ */ new Map();
  for (const successors of Object.values(table2.next)) for (const [move, n] of Object.entries(successors)) counts.set(move, (counts.get(move) ?? 0) + n);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
function nextMove(table2, move, random, exclude, allowed) {
  if (move === STUNNED_MOVE) {
    const successors2 = Object.entries(table2?.next[move] ?? {}).filter(([, n]) => n > 0);
    if (successors2.length === 0 || successors2.some(([m]) => !Number.isFinite(table2?.moves[m]?.damage))) {
      throw new MissingStunModel();
    }
  }
  if (!table2 || !move) return move;
  const successors = table2.next[move];
  if (!successors) return move;
  const all = Object.entries(successors);
  const kept = all.filter(([m]) => m !== exclude && (!allowed || allowed(m)));
  const entries = kept.length > 0 ? kept : all;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let r = random() * total;
  for (const [m, n] of entries) {
    r -= n;
    if (r < 0) return m;
  }
  return entries[entries.length - 1][0];
}
function fightNextMove(e, table2, random, enemies, exclude, learned) {
  if (e.id === "CEREMONIAL_BEAST" && e.move === "PLOW_MOVE" && e.shriekArmed) return "PLOW_MOVE";
  if (e.id === "QUEEN" && e.move === "BURN_BRIGHT_FOR_ME_MOVE" && !(e.base.moveOnDeath ?? []).length) return enemies.some((x) => x.alive && x.id === "TORCH_HEAD_AMALGAM") ? "BURN_BRIGHT_FOR_ME_MOVE" : "OFF_WITH_YOUR_HEAD_MOVE";
  const and = (allowed) => !learned ? allowed : !allowed ? learned : (m) => learned(m) && allowed(m);
  if (e.id === "KNOWLEDGE_DEMON" && (e.curses ?? 0) >= KNOWLEDGE_CURSES) {
    const next = nextMove(table2, e.move, random, exclude, and((m) => m !== "CURSE_OF_KNOWLEDGE_MOVE"));
    return next === "CURSE_OF_KNOWLEDGE_MOVE" ? "SLAP_MOVE" : next;
  }
  if (e.asleep !== void 0 && e.asleep > 0) {
    e.asleep = e.hurt ? 0 : e.asleep - 1;
    if (e.asleep > 0) return e.move;
    e.plating = 0;
    e.block = 0;
    const awake = nextMove(table2, e.move, random, exclude, and((m) => m !== e.move && m !== STUNNED_MOVE));
    return awake === e.move ? usualMove2(table2) : awake;
  }
  const dead = DEATH_MOVES[e.id] ?? [];
  const phase = PHASE_MOVES[e.id]?.[e.phase ?? 0];
  return nextMove(table2, e.move, random, exclude, and((m) => !dead.includes(m) && (!phase || phase.includes(m))));
}
function deathAllowed(e, enemies) {
  const rules = e.base.moveOnDeath;
  if (!rules || rules.length === 0) return void 0;
  const banned = /* @__PURE__ */ new Set();
  for (const allyId of new Set(rules.map((rule) => rule.allyId))) {
    const own = rules.filter((rule) => rule.allyId === allyId);
    const alive = enemies.some((x) => x.index !== e.index && x.id === allyId && x.alive);
    const dead = !alive && own.some((rule) => enemies.some((x) => x.index === rule.ally && deadForGood(x)));
    for (const rule of own) for (const move of alive ? rule.rule.exclusive : dead ? rule.rule.aliveOnly : []) banned.add(move);
  }
  return banned.size > 0 ? (move) => !banned.has(move) : void 0;
}
function deathNextOf(e, enemies, aliveBefore) {
  for (const rule of e.base.moveOnDeath ?? []) {
    if (!aliveBefore.has(rule.ally) || rule.rule.next === null || e.move === null || !rule.rule.after.includes(e.move)) continue;
    if (enemies.some((x) => x.index === rule.ally && deadForGood(x))) return rule.rule.next;
  }
  return null;
}
function deadForGood(x) {
  return !x.alive && !x.gone && x.reattachIn === void 0 && x.reviveIn === void 0;
}
function laterDeathMoves(e, enemies, table2, playerVulnerable, fight) {
  const rules = (e.base.moveOnDeath ?? []).filter((rule) => enemies.some((x) => x.index === rule.ally && x.alive));
  if (rules.length === 0) return void 0;
  return rules.map((rule) => {
    const move = e.move !== null ? rule.rule.now[e.move] ?? null : null;
    const end = move ?? e.move;
    const next = rule.rule.next !== null && end !== null && rule.rule.after.includes(end) ? rule.rule.next : null;
    return { ...rule, move, moveName: move, attacks: move !== null ? moveAttack(e, table2, move, playerVulnerable, fight) : [], next, nextName: next, nextAttack: null };
  });
}
function withStrength(card, player, index, targets) {
  const weak = player.weakTurns > 0;
  const baseBlock = card.block + (card.cardId === "DEFEND_SILENT" ? player.fasten : 0);
  return {
    ...card,
    index,
    damage: card.damage === null ? null : Math.floor((card.damage + player.strength) * (weak ? 0.75 : 1)) * (card.type === "Attack" && player.doubleDamage ? 2 : 1),
    // Unmovable: the hand shows every Block card doubled (the solver halves all but the first; combat-plan).
    // Frail: 25% less block from cards, after Dexterity.
    ...card.block > 0 ? { blockBase: baseBlock } : {},
    block: card.block > 0 ? Math.floor(Math.max(0, baseBlock + player.dexterity) * (player.frailTurns > 0 ? 0.75 : 1)) * (player.unmovable ? 2 : 1) : card.block,
    validTargets: card.target === "single" ? targets : []
  };
}
function snapshotOf(player, enemies, hpEnd, blockEnd, energyLeft, handLeft, playerPowers2) {
  const pw = { ...playerPowers2 };
  if (player.doubleDamageNext) pw["SHADOW_STEP_POWER"] = 1;
  else delete pw["SHADOW_STEP_POWER"];
  if (player.doubleDamage) pw["DOUBLE_DAMAGE_POWER"] = 1;
  else delete pw["DOUBLE_DAMAGE_POWER"];
  for (const [id, v] of [["STRENGTH_POWER", player.strength], ["DEXTERITY_POWER", player.dexterity], ["WEAK_POWER", player.weakTurns], ["VULNERABLE_POWER", player.vulnTurns], ["FRAIL_POWER", player.frailTurns], ["PLATING_POWER", player.plating]]) {
    if (v !== 0) pw[id] = v;
    else delete pw[id];
  }
  if (player.nextTurnBlock !== null) {
    if (player.nextTurnBlock > 0) pw["BLOCK_NEXT_TURN_POWER"] = player.nextTurnBlock;
    else delete pw["BLOCK_NEXT_TURN_POWER"];
  }
  return {
    hp: hpEnd,
    mhp: player.maxHp,
    blk: blockEnd,
    en: energyLeft,
    pw,
    hand: handLeft,
    pots: player.potions,
    E: enemies.map((e) => {
      const powers = { ...e.powers };
      for (const [id, v] of [["STRENGTH_POWER", e.strength], ["VIGOR_POWER", e.vigor], ["VULNERABLE_POWER", e.vulnerable], ["WEAK_POWER", e.weak], ["INTANGIBLE_POWER", e.intangibleTurns], ["POISON_POWER", e.poison]]) {
        if (v) powers[id] = v;
        else delete powers[id];
      }
      if (eruptionOptions.blastTerminal && (e.base.eruption ?? 0) > 0 && e.explodeAt === void 0 && e.maxHp < HUSK_HP) powers["STEAM_ERUPTION_POWER"] = e.base.eruption;
      const intent = e.base.attacks.reduce((s, a) => s + a.damage * a.hits, 0);
      if (e.explodeAt !== void 0) return [e.index, e.id, 1, e.maxHp, 0, e.alive, false, e.blast ?? intent, e.move, powers];
      return [e.index, e.id, e.hp, e.maxHp, e.block, e.alive && e.hp > 0, e.base.minion === true, intent, e.move, powers];
    })
  };
}
function spawnedEnemy(template, index) {
  const base = { index, name: template.name, hp: template.hp, maxHp: template.hp, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...template.illusion ? { illusion: true } : {}, ...template.minion ? { minion: true } : {} };
  return {
    index,
    id: template.id,
    move: template.move,
    hp: template.hp,
    maxHp: template.hp,
    block: 0,
    strength: 0,
    vigor: 0,
    vulnerable: 0,
    weak: 0,
    poison: 0,
    alive: true,
    intangibleTurns: 0,
    burrowed: false,
    artifact: 0,
    slippery: 0,
    curlUp: 0,
    flutter: 0,
    growth: 0,
    shrink: 0,
    demise: 0,
    shriekArmed: false,
    thorns: 0,
    halved: false,
    dazedPerHit: 0,
    vitalSpark: 0,
    moveBuffs: { thorns: false, soar: false },
    plating: 0,
    powers: { ...template.illusion ? { ILLUSION_POWER: 1 } : {}, ...template.minion ? { MINION_POWER: 1 } : {} },
    base,
    shown: []
  };
}
function clearPower(e, power) {
  if (power === "STRENGTH_POWER") e.strength = 0;
  else if (power === "VULNERABLE_POWER") e.vulnerable = 0;
  else if (power === "WEAK_POWER") e.weak = 0;
  if (power in e.powers) {
    const { [power]: _gone, ...rest } = e.powers;
    e.powers = rest;
  }
}
function enemyDown(e, turn, input, enemies, fullFight = false) {
  if ((e.base.eruption ?? 0) > 0 && e.maxHp < HUSK_HP && e.explodeAt === void 0) {
    e.hp = HUSK_HP;
    e.maxHp = HUSK_HP;
    e.blast = e.base.eruption ?? 0;
    e.explodeAt = turn + 1;
    e.move = "ABOUT_TO_BLOW";
    e.base = { ...e.base, hp: HUSK_HP, maxHp: HUSK_HP, attacks: [] };
  } else if ((e.base.stock ?? 0) > 0) {
    e.hp = e.maxHp;
    e.base = { ...e.base, stock: (e.base.stock ?? 1) - 1 };
  } else if (e.base.illusion) {
    e.hp = e.maxHp;
  } else if (e.base.revives) {
    const later = e.phasesLeft ?? laterPhaseHps(e.maxHp, input.meta.asc);
    const next = later[0] ?? e.maxHp;
    e.phasesLeft = later.slice(1);
    e.hp = next;
    e.maxHp = next;
    e.vulnerable = 0;
    e.weak = 0;
    e.poison = 0;
    e.strength = 0;
    if (e.phasesLeft.length === 0) {
      const { ADAPTABLE_POWER: _last, ...powers } = e.powers;
      e.powers = powers;
      if (e.id === "TEST_SUBJECT") {
        e.powers = { ...e.powers, NEMESIS_POWER: 1 };
        e.intangibleTurns = 1;
        e.nemesisIn = 1;
      }
    }
    e.base = { ...e.base, hp: next, maxHp: next, revives: e.phasesLeft.length > 0 };
    const phases = PHASE_MOVES[e.id];
    if (fullFight && phases) {
      e.phase = Math.min(phases.length - 1, (e.phase ?? 0) + 1);
      e.move = phases[e.phase][0] ?? e.move;
      e.extraHits = 0;
    }
  } else {
    e.alive = false;
    const spawns = e.base.spawnsOnDeath ? input.spawns?.[e.id] ?? [] : [];
    let next = Math.max(...enemies.map((x) => x.index)) + 1;
    const heir = e.carrier !== void 0 ? input.escapes?.heirs[e.id] : void 0;
    for (const template of spawns) {
      for (let k = 0; k < template.count; k += 1) {
        const spawn = spawnedEnemy(template, next++);
        if (heir !== void 0 && template.id === heir) spawn.carrier = e.carrier;
        enemies.push(spawn);
      }
    }
  }
}
function startOfTurn(turn, player, enemies, input, fullFight = false) {
  player.plating = Math.max(0, player.plating - 1);
  player.block += player.mantle;
  const fightTurn = (input.solver.turn ?? input.meta.t) + turn + 1;
  for (const relic of input.relicBlock ?? []) if (relic.turn === fightTurn) player.block += relic.amount;
  if (fullFight) {
    for (const relic of input.fightRelics?.block ?? []) if (relic.turn === fightTurn) player.block += relic.amount;
  }
  player.block += player.clayNext;
  player.clayNext = 0;
  if (player.nextTurnBlock !== null) {
    player.block += player.nextTurnBlock;
    player.nextTurnBlock = 0;
  }
  if (player.redSkull > 0 && player.hp * 2 <= player.maxHp !== player.skullUp) {
    player.skullUp = !player.skullUp;
    player.strength += player.skullUp ? player.redSkull : -player.redSkull;
  }
  player.strength += player.rupture * startLossEvents(player);
  if (player.poisonPerTurn > 0) for (const enemy of enemies) {
    if (!enemy.alive || enemy.explodeAt !== void 0) continue;
    if (enemy.artifact > 0) enemy.artifact -= 1;
    else enemy.poison += player.poisonPerTurn + (input.fumesPoisonBonus ?? 0);
  }
  const aoe = turnStartAoeOf(player);
  if (player.boulder > 0) player.boulder += BOULDER_STEP;
  if (aoe <= 0) return 0;
  let dealt = 0;
  for (const e of enemies) {
    if (!e.alive || e.explodeAt !== void 0) continue;
    let hit = e.halved ? Math.floor(aoe * 0.5) : aoe;
    if (e.base.perHitCap !== null && e.base.perHitCap !== void 0) hit = Math.min(hit, e.base.perHitCap);
    if (e.intangibleTurns > 0) hit = Math.min(1, hit);
    const blocked = Math.min(e.block, hit);
    e.block -= blocked;
    let through = hit - blocked;
    if (through > 0 && e.slippery > 0) {
      through = 1;
      e.slippery -= 1;
    }
    const lost = Math.min(e.hp, through);
    e.hp -= lost;
    dealt += lost;
    if (fullFight && lost > 0) e.hurt = true;
    if (e.hp <= (e.base.shriek ?? 0)) e.shriekArmed = false;
    if (e.hp <= 0) enemyDown(e, turn, input, enemies, fullFight);
  }
  return dealt;
}
function relicEnergyAt(input, turn) {
  return (input.relicEnergy ?? []).reduce((sum, relic) => sum + (turn >= relic.from ? relic.amount : 0), 0);
}
function fightRelicEnergyAt(input, turn) {
  return (input.fightRelics?.energy ?? []).reduce((sum, relic) => sum + (relic.turn === turn ? relic.amount : 0), 0);
}
function endBlockRelics(input) {
  const relics = input.fightRelics;
  return { ...relics?.orichalcum ? { orichalcum: relics.orichalcum } : {}, ...relics?.rippleBasin ? { rippleBasin: relics.rippleBasin } : {} };
}
function passiveSolverFields(input, from) {
  return solverFieldsOf(input.passive, { letterOpener: from?.letterOpener?.count ?? 0, ornamentalFan: from?.ornamentalFan?.count ?? 0 });
}
function fightRelicDrawsAt(input, turn) {
  return (input.fightRelics?.draws ?? []).reduce((sum, relic) => sum + (relic.turn === turn ? relic.amount : 0), 0);
}
function sampledPotions(potions, input, seed2, turn, hand, piles, player, targets, known) {
  const sources = input.randomPotions ?? [];
  if (sources.length === 0) return potions;
  return potions.map((card) => {
    const [, id, slotText] = card.cardId.split(":");
    const source = sources.find((entry) => entry.potionId === id && String(entry.slot) === slotText);
    if (!source) return card;
    if (source.kind === "choice") {
      const random = rng2((Math.imul(seed2, 668265263) ^ Math.imul(source.slot + 1, 374761393) ^ Math.imul(turn + 1, 2654435761)) >>> 0 || 1);
      const sample = samplePotion({ ...source, cost: 0 }, hand, random);
      return { ...sample, validTargets: card.validTargets, ...card.potionCost !== void 0 ? { potionCost: card.potionCost } : {} };
    }
    if (!PLAIN_DRAW_POTIONS.has(source.potionId) || !known || source.noDraw) return card;
    const count2 = Math.max(0, Math.round(card.draw));
    const drawn = [];
    for (let k = 0; k < count2 && known.size < piles.draw.length; k += 1) {
      const depth = known.size;
      const base = piles.draw[piles.draw.length - 1 - depth];
      const index = KNOWN_DRAW_INDEX + depth;
      const model2 = { ...withStrength(base, player, index, targets), key: `drawn${index}` };
      known.set(index, { card: model2, base });
      drawn.push(model2);
    }
    return drawn.length > 0 ? { ...card, drawn, draw: card.draw - drawn.length } : card;
  });
}
function turnsOf(amount) {
  return amount < 0 ? Infinity : amount;
}
function holds(player, id) {
  switch (id) {
    case "SLOTH_POWER":
      return player.playCap !== null;
    case "MIND_ROT_POWER":
      return player.mindRot > 0;
    case "WASTE_AWAY_POWER":
      return player.wasteAway > 0;
    case "DISINTEGRATION_POWER":
      return player.disintegration > 0;
    default:
      return false;
  }
}
function chosenDebuffs(move, player) {
  const powers = move.playerPowers ?? {};
  if (!move.playerPowerChoice) return powers;
  const pick2 = move.playerPowerChoice.find((id) => !holds(player, id) && (powers[id] ?? 0) !== 0);
  return pick2 ? { [pick2]: powers[pick2] } : {};
}
function applyPlayerDebuffs(player, powers) {
  player.vulnTurns += powers.VULNERABLE_POWER ?? 0;
  player.weakTurns += powers.WEAK_POWER ?? 0;
  player.frailTurns += powers.FRAIL_POWER ?? 0;
  player.strength += powers.STRENGTH_POWER ?? 0;
  player.dexterity += powers.DEXTERITY_POWER ?? 0;
  player.tender += powers.TENDER_POWER ?? 0;
  if ((powers.SMOGGY_POWER ?? 0) !== 0) player.smoggy = true;
  player.tangledNext += powers.TANGLED_POWER ?? 0;
  player.chains = Math.max(player.chains, powers.CHAINS_OF_BINDING_POWER ?? 0);
  if (powers.SHRINK_POWER) player.shrinkTurns = Math.max(player.shrinkTurns, turnsOf(powers.SHRINK_POWER));
  if ((powers.RINGING_POWER ?? 0) !== 0) player.ringingNext = true;
  if ((powers.SLOTH_POWER ?? 0) > 0) player.playCap = Math.min(player.playCap ?? Infinity, powers.SLOTH_POWER);
  player.disintegration += powers.DISINTEGRATION_POWER ?? 0;
  player.constrict += powers.CONSTRICT_POWER ?? 0;
  player.mindRot += powers.MIND_ROT_POWER ?? 0;
  player.wasteAway += powers.WASTE_AWAY_POWER ?? 0;
}
function applyLasting(card, player, playerPowers2) {
  if (card.phantomBlades === 9 && player.phantomBlades === 0) {
    player.phantomBlades = 9;
    playerPowers2["PHANTOM_BLADES_POWER"] = 9;
  }
  if (card.envenom) {
    player.envenom += card.envenom;
    playerPowers2["ENVENOM_POWER"] = player.envenom;
  }
  if (card.poisonPerTurn) {
    player.poisonPerTurn += card.poisonPerTurn;
    playerPowers2["NOXIOUS_FUMES_POWER"] = player.poisonPerTurn;
  }
  if (card.poisonExtraTriggers) {
    player.poisonExtraTriggers += card.poisonExtraTriggers;
    playerPowers2["ACCELERANT_POWER"] = player.poisonExtraTriggers;
  }
  if (card.doubleDamageNext) player.doubleDamageNext = true;
  const effect = POWER_EFFECTS[card.cardId];
  if (effect && card.type === "Power") {
    const amount = card.powerAmount ?? (card.inferno || void 0) ?? effect.amount[card.upgraded ? 1 : 0];
    if (effect.effect === "inferno") player.infernoCopies += 1;
    if (effect.effect === "keepsBlock") player.keepsBlock = true;
    else if (effect.effect === "unmovable") player.unmovable = true;
    else if (effect.effect === "hellraiser") player.hellraiser = true;
    else player[effect.effect] += amount;
    playerPowers2[effect.power] = (playerPowers2[effect.power] ?? 0) + amount;
  }
  if (card.feelNoPain) player.feelNoPain += card.feelNoPain;
  if (card.afterImage) {
    player.afterImage += card.afterImage;
    playerPowers2["AFTERIMAGE_POWER"] = (playerPowers2["AFTERIMAGE_POWER"] ?? 0) + card.afterImage;
  }
  if (card.fasten) {
    player.fasten += card.fasten;
    playerPowers2["FASTEN_POWER"] = player.fasten;
  }
  if (card.thorns && card.type === "Power") {
    player.thorns += card.thorns;
    playerPowers2["THORNS_POWER"] = player.thorns;
  }
  if (card.dexterity) {
    player.dexterity += card.dexterity;
    playerPowers2["DEXTERITY_POWER"] = (playerPowers2["DEXTERITY_POWER"] ?? 0) + card.dexterity;
  }
  if (card.temporaryDexterity) {
    player.dexterity += card.temporaryDexterity;
    player.tempDexterity += card.temporaryDexterity;
    playerPowers2["ANTICIPATE_POWER"] = (playerPowers2["ANTICIPATE_POWER"] ?? 0) + card.temporaryDexterity;
  }
  if (card.plating) player.plating += card.plating;
}
function knownDraws(hand, piles, player, targets) {
  const known = /* @__PURE__ */ new Map();
  let depth = 0;
  const out = hand.map((card) => {
    if (card.type === "Potion" || card.draw <= 0 || card.drawn || card.drawsUntil) return card;
    const drawn = [];
    for (let k = 0; k < card.draw && depth < piles.draw.length; k += 1, depth += 1) {
      const base = piles.draw[piles.draw.length - 1 - depth];
      const index = KNOWN_DRAW_INDEX + depth;
      const model2 = { ...withStrength(base, player, index, targets), key: `drawn${index}` };
      known.set(index, { card: model2, base });
      drawn.push(model2);
    }
    return drawn.length > 0 ? { ...card, drawn, draw: card.draw - drawn.length } : card;
  });
  return { hand: out, known };
}
function applyPlan(turn, plan, hand, handBase, player, enemies, piles, input, random, playerPowers2, fullFight = false, known) {
  const o = plan.outcome;
  const startHp = player.hp;
  const aliveBefore = new Set(enemies.filter((e) => e.alive).map((e) => e.index));
  const ownLoss = o.revived ? o.revived.ownLoss : Math.max(0, o.hpLoss - o.incomingAfterBlock);
  let regenDrunk = 0;
  const played = /* @__PURE__ */ new Set();
  const knownGone = /* @__PURE__ */ new Set();
  const knownPlayed = /* @__PURE__ */ new Set();
  const thrashPending = [];
  let apotheosisApplied = false;
  for (const step of plan.steps) {
    if (isPotion(step)) {
      player.potions = Math.max(0, player.potions - 1);
      if (step.cardId.startsWith("POTION:RADIANT_TINCTURE:")) player.radiance += RADIANCE_LATER_ENERGY;
      if (step.cardId.startsWith("POTION:SOLDIERS_STEW:")) player.strikeReplay += 1;
      const potion = hand.find((card2) => card2.type === "Potion" && card2.cardId === step.cardId);
      if (potion) {
        player.plating += potion.plating ?? 0;
        player.thorns += potion.thorns ?? 0;
        if (potion.special === "dexterity") player.dexterity += DEX_POTION;
        if (potion.special === "regen") regenDrunk += potion.regen ?? 0;
        if (potion.special === "ritual") player.ritual += 1;
        if (potion.special === "clarity") player.clarityTurns += CLARITY_LATER_DRAWS;
        if (potion.special === "retain_hand") player.retainTurns += STABLE_SERUM_TURNS;
      }
      continue;
    }
    const at2 = hand.findIndex((card2, i) => !played.has(i) && card2.index === step.cardIndex && card2.cardId === step.cardId);
    if (at2 < 0) {
      const drawn = known?.get(step.cardIndex);
      if (drawn && drawn.card.cardId === step.cardId && !knownPlayed.has(step.cardIndex)) {
        knownPlayed.add(step.cardIndex);
        const card2 = apotheosisApplied ? applyApotheosisUpgrade(drawn.card) : drawn.card;
        applyLasting(card2, player, playerPowers2);
        if (card2.apotheosis && o.apotheosisApplied) apotheosisApplied = true;
        if (drawn.card.exhausts || drawn.card.type === "Power") knownGone.add(drawn.base);
        continue;
      }
      const original = step.cardIndex >= MUSIC_BOX_INDEX ? hand.findIndex((card2) => card2.index === step.cardIndex - MUSIC_BOX_INDEX && card2.cardId === step.cardId) : -1;
      if (original >= 0 && !hand[original].exhausts) piles.discard.push(musicBoxCopy(handBase[original] ?? hand[original]));
      continue;
    }
    played.add(at2);
    const card = apotheosisApplied ? applyApotheosisUpgrade(hand[at2]) : hand[at2];
    applyLasting(card, player, playerPowers2);
    if (card.apotheosis && o.apotheosisApplied) apotheosisApplied = true;
    if (card.exhausts || card.type === "Power") continue;
    const back = handBase[at2] ?? card;
    const grown = (o.thrashGrowth ?? []).filter((growth) => growth.index === card.index).reduce((sum, growth) => sum + growth.amount, 0);
    const picks = (o.thrashRandom ?? []).filter((entry) => entry.index === card.index);
    if (picks.length > 0 && back.damage !== null) {
      thrashPending.push({ back, grown, picks });
      continue;
    }
    if (grown > 0 && back.damage !== null) {
      piles.discard.push({ ...back, damage: back.damage + grown, ...back.damageBase !== void 0 ? { damageBase: back.damageBase + grown } : {} });
      continue;
    }
    piles.discard.push(card.special === "frantic_escape" ? { ...back, cost: Math.max(back.cost, card.cost) + 1 } : back);
  }
  const exhausted = new Set(o.exhausted ?? []);
  const unplayed = hand.map((_card, i) => i).filter((i) => !played.has(i) && hand[i].type !== "Potion" && !exhausted.has(hand[i].index));
  for (const pending of thrashPending) {
    let added = 0;
    for (const pick2 of pending.picks) {
      const attacks = unplayed.filter((i) => hand[i].type === "Attack");
      if (attacks.length === 0) break;
      const taken = attacks[Math.floor(random() * attacks.length)];
      unplayed.splice(unplayed.indexOf(taken), 1);
      added += Math.max(0, Math.floor((hand[taken].damage ?? 0) + pick2.strength));
    }
    const total = pending.grown + added;
    const back = pending.back;
    piles.discard.push(total > 0 ? { ...back, damage: back.damage + total, ...back.damageBase !== void 0 ? { damageBase: back.damageBase + total } : {} } : back);
  }
  for (let k = 0; k < (o.randomExhausts ?? 0) && unplayed.length > 0; k += 1) unplayed.splice(Math.floor(random() * unplayed.length), 1);
  const keep2 = player.retainTurns > 0 && !o.winsFight;
  for (const i of unplayed) if (!hand[i].ethereal) (keep2 ? player.retained : piles.discard).push(handBase[i] ?? hand[i]);
  player.retainTurns = Math.max(0, player.retainTurns - 1);
  const exhaustedDraws = o.drawnExhausted ?? 0;
  const usedDraws = keep2 ? Math.max(0, Math.floor(o.energyLeft)) : Number.POSITIVE_INFINITY;
  for (let i = 0; i < o.cardsDrawn; i += 1) {
    const card = drawOne2(piles, random);
    if (!card || i < exhaustedDraws || knownGone.has(card)) continue;
    (i - exhaustedDraws < usedDraws || card.ethereal ? piles.discard : player.retained).push(card);
  }
  const etherealEnd = o.winsFight ? 0 : unplayed.filter((i) => hand[i].ethereal).length;
  for (let k = 0; k < etherealEnd * player.darkEmbrace; k += 1) {
    const card = drawOne2(piles, random);
    if (card) piles.discard.push(card);
  }
  if (apotheosisApplied) {
    piles.draw = piles.draw.map(applyApotheosisUpgrade);
    piles.discard = piles.discard.map(applyApotheosisUpgrade);
    player.retained = player.retained.map(applyApotheosisUpgrade);
  }
  const made = (id) => input.statusCards?.[id] ?? input.statusCards?.[UNKNOWN_STATUS];
  const addMade = (id, count2, pile) => {
    const card = count2 > 0 ? made(id) : void 0;
    if (card) addToPile(piles, card, count2, pile, random);
  };
  addMade("DAZED", o.dazedAdded ?? 0, "draw");
  addMade("WOUND", o.woundsAdded ?? 0, "discard");
  addMade("WITHER", o.withersAdded, "discard");
  player.strength += o.strengthGained;
  player.freeAttacks = o.freeAttacksLeft ?? 0;
  if (player.penNib !== void 0) player.penNib = (player.penNib + (o.attackPlays ?? 0)) % PEN_NIB_EVERY;
  if (o.tuningForkCount !== void 0) player.tuningForkCount = o.tuningForkCount;
  if (o.permafrostBlockLeft !== void 0) player.permafrostBlock = o.permafrostBlockLeft;
  player.paelsNext = o.nextTurnEnergy ?? 0;
  player.nextTurnBlock = o.nextTurnBlock ?? (player.nextTurnBlock !== null ? 0 : null);
  player.clayNext = o.clayBlockNext ?? 0;
  const after = new Map(o.enemyHpAfter.map((e) => [e.index, e]));
  const shrieked = /* @__PURE__ */ new Set();
  for (const e of enemies) {
    const a = after.get(e.index);
    const threshold = e.base.shriek ?? 0;
    if (e.shriekArmed && a && e.alive && threshold > 0 && e.hp > threshold && a.hp <= threshold && a.hp > 0) shrieked.add(e.index);
    if (a && a.hp <= threshold) e.shriekArmed = false;
    if (a?.stunned && a.hp > 0) shrieked.add(e.index);
  }
  const flutterBefore = input.escapes ? new Map(enemies.map((e) => [e.index, e.flutter])) : null;
  const retaliated = new Map((o.retaliated ?? []).map((r) => [r.index, r.amount]));
  const slipperyUsed = new Map((o.retaliated ?? []).map((r) => [r.index, r.slipperyUsed ?? 0]));
  for (const e of enemies) {
    const a = after.get(e.index);
    if (!a || !e.alive) continue;
    const hit = a.hp < e.hp;
    e.hp = a.hp - (a.hp > 0 && !a.husk ? Math.min(a.hp, retaliated.get(e.index) ?? 0) : 0);
    if (fullFight) e.hurt = e.hurt === true || hit || e.hp < a.hp;
    e.vulnerable = a.vulnerable;
    e.weak = a.weak;
    e.poison = a.poison ?? e.poison;
    if (a.artifact !== void 0) e.artifact = a.artifact;
    if (a.slippery !== void 0) e.slippery = Math.max(0, a.slippery - (slipperyUsed.get(e.index) ?? 0));
    if (a.curlUp !== void 0) e.curlUp = a.curlUp;
    if (a.flutter !== void 0) e.flutter = a.flutter;
    if (a.shrink !== void 0) e.shrink = a.shrink;
    e.demise = a.demise ?? e.demise;
    e.strength += a.strengthGained ?? 0;
    if (a.block !== void 0) e.block = a.block;
    else if (hit) e.block = 0;
    if (e.hp <= 0) enemyDown(e, turn, input, enemies, fullFight);
    if (a.movedTo && e.alive) {
      e.move = a.movedTo.move;
      const rule = e.base.moveOnStrip?.find((entry) => entry.power === a.movedTo.power && entry.how === a.movedTo.how);
      for (const power of rule?.clears ?? []) clearPower(e, power);
    }
    if (a.deathMove?.move && e.alive) e.move = a.deathMove.move;
  }
  if (o.sandpitAfter !== null) {
    for (const e of enemies) if ((e.base.sandpit ?? 0) > 0) e.base = { ...e.base, sandpit: o.sandpitAfter };
  }
  const segmentsLeft = enemies.some((e) => e.alive && e.base.reattach);
  for (const e of enemies) {
    if (e.alive || !e.base.reattach) continue;
    if (!segmentsLeft) e.reattachIn = void 0;
    else if (e.reattachIn === void 0) e.reattachIn = REATTACH_TURNS;
  }
  if ((o.maulGrowth ?? 0) > 0) {
    const grow = (card) => card.cardId !== "MAUL" || card.damage === null ? card : {
      ...card,
      damage: card.damage + o.maulGrowth,
      ...card.damageBase !== void 0 ? { damageBase: card.damageBase + o.maulGrowth } : {}
    };
    piles.draw = piles.draw.map(grow);
    piles.discard = piles.discard.map(grow);
    player.retained = player.retained.map(grow);
  }
  const handLeft = Math.max(0, hand.filter((c) => c.type !== "Potion").length - played.size + o.cardsDrawn);
  const blockEnd = player.block + o.blockGained;
  if (o.serpentFormAfter !== void 0) {
    player.serpentForm = o.serpentFormAfter;
    if (player.serpentForm !== null && player.serpentForm > 0) playerPowers2["SERPENT_FORM_POWER"] = player.serpentForm;
  }
  const snap = snapshotOf(player, enemies, startHp - ownLoss, blockEnd, o.energyLeft, handLeft, playerPowers2);
  const hpLeft = Object.fromEntries(enemies.map((e) => [e.index, remainingHp(e, input)]));
  player.regen = Math.max(0, player.regen + regenDrunk - 1);
  player.strength += player.ritual;
  player.strength -= player.tempStrength;
  player.dexterity -= player.tempDexterity;
  player.tempStrength = 0;
  player.tempDexterity = 0;
  delete playerPowers2["ANTICIPATE_POWER"];
  player.doubleDamage = player.doubleDamageNext;
  player.doubleDamageNext = false;
  const allDown = () => enemies.every((e) => !e.alive || e.base.illusion === true || e.base.minion === true && enemies.some((x) => !x.base.minion && !x.alive));
  let won = o.winsFight || allDown();
  player.hp = o.revived?.hp ?? o.hpAfter;
  if (o.revived) {
    const spent = o.revived.sources.length;
    player.potions = Math.max(0, player.potions - player.revives.slice(0, spent).filter((revive) => revive.source === "FAIRY_IN_A_BOTTLE").length);
    player.revives = player.revives.slice(spent);
  }
  player.block = player.keepsBlock || player.blurTurns > turn ? o.blockWasted ?? 0 : fullFight ? Math.min(input.fightRelics?.blockKeep ?? 0, o.blockWasted ?? 0) : 0;
  const died = !won && (o.dies || player.hp <= 0);
  if (!won && !died) {
    for (const e of enemies) if (e.alive && e.explodeAt === turn) e.alive = false;
    won = allDown();
  }
  if (!won && !died) {
    const applied = [];
    const blockStunned = new Set(o.stunIndexes ?? []);
    const summoned = [];
    for (const e of enemies) {
      if (!e.alive || e.explodeAt !== void 0) continue;
      const table2 = input.tables[e.id];
      const m = e.move && table2 ? table2.moves[e.move] : void 0;
      const stunned = e.burrowed && e.block <= 0 || shrieked.has(e.index);
      const learned = e.base.stunOnStrip?.some((rule) => rule.power === "FLUTTER_POWER") === true;
      const fluttered = flutterBefore !== null && !learned && (flutterBefore.get(e.index) ?? 0) > 0 && e.flutter <= 0;
      if (e.move !== null && input.escapes?.moves[e.id]?.includes(e.move) && !stunned && !fluttered) {
        e.alive = false;
        e.gone = true;
        continue;
      }
      if (stunned) e.burrowed = false;
      else {
        for (const template of e.move ? input.summons?.[e.id]?.[e.move] ?? [] : []) {
          if (enemies.some((other) => other.id === template.id && !other.gone) || summoned.some((other) => other.id === template.id)) continue;
          const first = Math.max(-1, ...enemies.map((other) => other.index), ...summoned.map((other) => other.index)) + 1;
          for (let k = 0; k < template.count; k += 1) summoned.push(spawnedEnemy(template, first + k));
        }
        if (e.base.attacks.some((attack) => attack.damage * attack.hits > 0)) e.vigor = 0;
        e.vigor += m?.vigor ?? 0;
        e.strength += m?.strength ?? 0;
        e.strength += e.growth;
        e.growth += m?.selfPowers?.RITUAL_POWER ?? 0;
        if (e.moveBuffs.thorns) e.thorns = 0;
        if (e.moveBuffs.soar) e.halved = (e.powers["GUARDED_POWER"] ?? 0) > 0;
        e.moveBuffs = { thorns: false, soar: false };
        const gained = m?.selfPowers ?? {};
        if (gained.THORNS_POWER) {
          e.thorns += gained.THORNS_POWER;
          e.moveBuffs.thorns = true;
        }
        if (gained.SOAR_POWER) {
          e.halved = true;
          e.moveBuffs.soar = true;
        }
        e.flutter += gained.FLUTTER_POWER ?? 0;
        e.dazedPerHit += gained.PERSONAL_HIVE_POWER ?? 0;
        e.vitalSpark += gained.VITAL_SPARK_POWER ?? 0;
        if (gained.STEAM_ERUPTION_POWER) e.base = { ...e.base, eruption: (e.base.eruption ?? 0) + gained.STEAM_ERUPTION_POWER };
        if (m?.heal) e.hp = Math.min(e.maxHp, e.hp + m.heal);
        const sandpitScripts = fullFight || input.options?.sandpitStart === true;
        for (const status of m?.statusCards ?? []) {
          const card = input.statusCards?.[status.cardId ?? UNKNOWN_STATUS] ?? input.statusCards?.[UNKNOWN_STATUS];
          const intoDraw = sandpitScripts && e.move ? Math.min(status.count, STATUS_INTO_DRAW[e.move] ?? 0) : 0;
          if (card && intoDraw > 0) addToPile(piles, card, intoDraw, "draw", random);
          if (card) addToPile(piles, card, status.count - intoDraw, status.pile, random);
        }
        if (sandpitScripts && m?.sandpit) e.base = { ...e.base, sandpit: m.sandpit };
        if (fullFight && e.id === "KNOWLEDGE_DEMON" && e.move === "CURSE_OF_KNOWLEDGE_MOVE") e.curses = (e.curses ?? 0) + 1;
        if (m?.playerPowers) applied.push(m);
        e.block = (e.burrowed ? e.block : 0) + (m?.block ?? 0);
        if (m?.burrows) e.burrowed = true;
        if (e.plating > 0 && input.meta.t + turn >= 2) e.plating -= 1;
        e.block += e.plating;
      }
      e.vulnerable = Math.max(0, e.vulnerable - 1);
      e.weak = Math.max(0, e.weak - 1);
      e.shrink = Math.max(0, e.shrink - 1);
      e.intangibleTurns = Math.max(0, e.intangibleTurns - 1);
      if (!stunned) e.intangibleTurns += m?.selfPowers?.INTANGIBLE_POWER ?? 0;
      if (e.nemesisIn !== void 0) {
        e.nemesisIn -= 1;
        if (e.nemesisIn <= 0) {
          e.intangibleTurns += 1;
          e.nemesisIn = 2;
        }
      }
      const imbalanced = (e.powers["IMBALANCED_POWER"] ?? 0) > 0;
      const pick2 = e.random ?? random;
      const deathNext = e.base.moveOnDeath ? deathNextOf(e, enemies, aliveBefore) : null;
      const learnedFilter = e.base.moveOnDeath ? deathAllowed(e, enemies) : void 0;
      const filtered = e.id === GIANT_ID ? eruptionOptions.deathMoveFilter : deathMoveOptions.others;
      const dead = filtered ? DEATH_MOVES[e.id] : void 0;
      const deathFilter = dead ? (m2) => !dead.includes(m2) && (!learnedFilter || learnedFilter(m2)) : learnedFilter;
      const living = dead ? (m2) => !dead.includes(m2) : void 0;
      if (stunned) e.move = table2?.next["STUNNED"] ? nextMove(table2, "STUNNED", pick2, void 0, living) : nextMove(table2, e.move, pick2, void 0, living);
      else if (imbalanced && blockStunned.has(e.index)) e.move = STUNNED_MOVE;
      else if (fullFight && !(e.burrowed && m && !m.burrows)) {
        if (e.move !== null && e.move === GROWING_HITS[e.id]) e.extraHits = (e.extraHits ?? 0) + 1;
        if (e.move !== null && m?.growth) e.uses = { ...e.uses, [e.move]: (e.uses?.[e.move] ?? 0) + 1 };
        e.move = fightNextMove(e, table2, pick2, enemies, imbalanced ? STUNNED_MOVE : void 0, deathFilter);
      } else if (!(e.burrowed && m && !m.burrows)) e.move = nextMove(table2, e.move, random, imbalanced ? STUNNED_MOVE : void 0, deathFilter);
      if (deathNext !== null) e.move = deathNext;
      e.hurt = false;
      const later = fullFight ? table2?.shriekFrom : void 0;
      if (later && !(e.base.shriek ?? 0) && (input.solver.turn ?? input.meta.t) + turn + 1 >= later.turn) {
        e.base = { ...e.base, shriek: later.amount };
        e.shriekArmed = e.hp > later.amount;
      }
    }
    enemies.push(...summoned);
    for (const e of enemies) {
      if (!e.alive || e.explodeAt !== void 0 || e.demise <= 0) continue;
      e.hp -= e.demise;
      if (e.hp <= 0) enemyDown(e, turn, input, enemies, fullFight);
    }
    won = allDown();
    for (const holder of enemies) {
      const rampart = holder.alive ? holder.powers["RAMPART_POWER"] ?? 0 : 0;
      if (rampart > 0) {
        for (const e of enemies) if (e.alive && e.id === RAMPART_TARGET) e.block += rampart;
      }
    }
    for (const e of enemies) {
      if (e.alive || e.reviveIn === void 0) continue;
      e.reviveIn -= 1;
      if (e.reviveIn > 0) continue;
      e.alive = true;
      e.reviveIn = void 0;
      e.hp = e.maxHp;
      e.block = 0;
      e.vulnerable = 0;
      e.weak = 0;
      e.artifact = e.base.artifact;
      e.slippery = e.base.slippery ?? 0;
      e.curlUp = e.base.curlUp ?? 0;
      e.flutter = e.base.flutter ?? 0;
      e.move = usualMove2(input.tables[e.id]) ?? e.move;
    }
    for (const e of enemies) {
      if (e.alive || e.reattachIn === void 0) continue;
      e.reattachIn -= 1;
      if (e.reattachIn > 0) continue;
      e.alive = true;
      e.reattachIn = void 0;
      e.hp = Math.min(e.maxHp, e.base.reattachHp || REATTACH_HP);
      e.block = 0;
      e.vulnerable = 0;
      e.weak = 0;
    }
    player.weakTurns = Math.max(0, player.weakTurns - 1);
    player.vulnTurns = Math.max(0, player.vulnTurns - 1);
    player.frailTurns = Math.max(0, player.frailTurns - 1);
    player.shrinkTurns = Math.max(0, player.shrinkTurns - 1);
    for (const move of applied) applyPlayerDebuffs(player, chosenDebuffs(move, player));
    player.strength += player.demonForm;
  }
  const carried = player.startDealt;
  player.startDealt = 0;
  if (!won && !died) {
    player.startDealt = startOfTurn(turn, player, enemies, input, fullFight);
    won = allDown();
  }
  const drunk = plan.steps.filter(isPotion).map((step) => step.cardId.split(":")[1] ?? "");
  const thieves = input.escapes && Object.keys(input.escapes.carriers).length > 0 ? thiefStatus(enemies) : null;
  const gone = input.escapes ? enemies.filter((e) => e.gone).map((e) => e.index) : [];
  return {
    loss: startHp - player.hp + (o.revived?.reviveHp ?? 0),
    ...input.captureResources || input.continuation || input.solver.continuationValue ? { resources: { hp: player.hp, revives: player.revives.slice(), drunkKeys: plan.steps.filter(isPotion).map((step) => step.cardId) } } : {},
    enemyPart: o.incomingAfterBlock,
    dmg: o.damageDealt + carried,
    snap,
    won,
    died,
    ...o.revived ? { revived: o.revived.sources.length } : {},
    hpLeft,
    ...drunk.length > 0 ? { drunk, potionCost: o.potionCost ?? 0 } : {},
    ...thieves ? { thieves } : {},
    ...gone.length > 0 ? { gone } : {},
    // Whole fights (B2's fight plan): the Powers played and the block gained this turn.
    ...fullFight ? {
      powers: plan.steps.map((step) => hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId) ?? known?.get(step.cardIndex)?.card).filter((card) => card?.type === "Power").map((card) => card.cardId),
      blockGained: o.blockGained
    } : {}
  };
}
function thiefStatus(enemies) {
  const out = {};
  for (const tag of new Set(enemies.map((e) => e.carrier).filter((tag2) => tag2 !== void 0))) {
    const holders2 = enemies.filter((e) => e.carrier === tag);
    out[tag] = holders2.some((e) => e.alive && !e.gone) ? "open" : holders2.some((e) => e.gone) ? "gone" : "back";
  }
  return out;
}
function addToPile(piles, card, count2, pile, random) {
  for (let k = 0; k < count2; k += 1) {
    if (pile === "discard") piles.discard.push(card);
    else piles.draw.splice(Math.floor(random() * (piles.draw.length + 1)), 0, card);
  }
}
function drawOne2(piles, random) {
  if (piles.draw.length === 0) {
    if (piles.discard.length === 0) return void 0;
    piles.draw = shuffle(piles.discard, random);
    piles.discard = [];
    if (piles.onShuffle) piles.draw.splice(Math.floor(random() * (piles.draw.length + 1)), 0, piles.onShuffle);
  }
  return piles.draw.pop();
}
function laterTurnSim(base) {
  const { asleep: _a, slumber: _s, imbalanced: _i, shriek: _sh, burrowed: _b, skittish: _sk, ...rest } = base;
  return rest;
}
function simulate(input, plan, horizon, seed2, budget, deadline = Infinity, order = null, used = { depth: 0 }, noPotions = false, fullFight = false) {
  if (Number.isFinite(deadline) && budget.now() - budget.start >= deadline) return null;
  const random = rng2(seed2);
  const s = input.solver;
  const opts = input.options ?? {};
  const handSize = opts.handSize ?? 5;
  const policyNodes = opts.policyNodes ?? 1500;
  const base = s.player;
  const player = {
    hp: base.hp,
    maxHp: base.maxHp,
    strength: base.strengthNow ?? input.playerPowers["STRENGTH_POWER"] ?? 0,
    dexterity: input.playerPowers["DEXTERITY_POWER"] ?? 0,
    fasten: input.playerPowers["FASTEN_POWER"] ?? 0,
    weakTurns: input.playerPowers["WEAK_POWER"] ?? (base.weak ? 1 : 0),
    vulnTurns: input.playerPowers["VULNERABLE_POWER"] ?? (base.vulnerable ? 1 : 0),
    frailTurns: input.playerPowers["FRAIL_POWER"] ?? 0,
    block: base.block,
    // Barricade for the fight; a Blur behind the decision's keepsBlock lasts its turns (blurTurns).
    keepsBlock: (input.playerPowers["BARRICADE_POWER"] ?? 0) > 0 || base.keepsBlock === true && (input.playerPowers["BLUR_POWER"] ?? 0) <= 0,
    demonForm: input.playerPowers["DEMON_FORM_POWER"] ?? 0,
    // The decision's end-of-turn block is Plating + Metallicize (combat-plan): Plating wears off, split it out.
    endTurnBlock: Math.max(0, (base.endTurnBlock ?? 0) - (input.playerPowers["PLATING_POWER"] ?? 0)),
    nextTurnBlock: base.nextTurnBlock ?? null,
    plating: Math.min(base.endTurnBlock ?? 0, input.playerPowers["PLATING_POWER"] ?? 0),
    juggernaut: base.juggernaut ?? 0,
    feelNoPain: base.feelNoPain ?? 0,
    afterImage: base.afterImage ?? input.playerPowers["AFTERIMAGE_POWER"] ?? 0,
    serpentForm: base.serpentForm ?? null,
    poisonPerTurn: input.playerPowers["NOXIOUS_FUMES_POWER"] ?? 0,
    poisonExtraTriggers: base.poisonExtraTriggers ?? input.playerPowers["ACCELERANT_POWER"] ?? 0,
    envenom: base.envenom ?? input.playerPowers["ENVENOM_POWER"] ?? 0,
    ...base.tuningFork ? { tuningForkCount: base.tuningFork.count } : {},
    ...base.permafrostBlock !== void 0 ? { permafrostBlock: base.permafrostBlock } : {},
    phantomBlades: (input.playerPowers["PHANTOM_BLADES_POWER"] ?? base.phantomBlades) === 9 ? 9 : 0,
    doubleDamage: (input.playerPowers["DOUBLE_DAMAGE_POWER"] ?? 0) > 0,
    doubleDamageNext: (input.playerPowers["SHADOW_STEP_POWER"] ?? 0) > 0,
    potions: input.potions,
    inferno: base.inferno ?? 0,
    // The decision's Infernos (combat-plan counts them off the state); without the count, from the power's amount.
    infernoCopies: base.infernoCopies ?? infernoCopiesOf(base.inferno ?? 0),
    mantle: input.playerPowers["CRIMSON_MANTLE_POWER"] ?? 0,
    rupture: base.rupture ?? 0,
    pyre: input.playerPowers["PYRE_POWER"] ?? 0,
    thorns: input.playerPowers["THORNS_POWER"] ?? 0,
    redSkull: base.redSkull ?? 0,
    skullUp: (base.redSkull ?? 0) > 0 && base.hp * 2 <= base.maxHp,
    clayNext: 0,
    radiance: input.playerPowers["RADIANCE_POWER"] ?? 0,
    strikeReplay: base.strikeReplay ?? 0,
    unmovable: (input.playerPowers["UNMOVABLE_POWER"] ?? 0) > 0,
    relicAoe: 0,
    boulder: input.playerPowers["ROLLING_BOULDER_POWER"] ?? 0,
    hellraiser: (input.playerPowers["HELLRAISER_POWER"] ?? 0) > 0,
    freeAttacks: 0,
    ...base.penNib !== void 0 ? { penNib: base.penNib } : {},
    paelsNext: 0,
    darkEmbrace: input.playerPowers["DARK_EMBRACE_POWER"] ?? 0,
    otherStartLoss: 0,
    startDealt: 0,
    playCap: (input.playerPowers["SLOTH_POWER"] ?? 0) > 0 ? input.playerPowers["SLOTH_POWER"] : null,
    intangibleTurns: input.playerPowers["INTANGIBLE_POWER"] ?? (base.intangible ? 1 : 0),
    blurTurns: input.playerPowers["BLUR_POWER"] ?? 0,
    // Shrink -1 (the Shrinker Beetle's, logged -1 every turn) is for the fight.
    shrinkTurns: turnsOf(input.playerPowers["SHRINK_POWER"] ?? (base.shrunk ? 1 : 0)),
    disintegration: input.playerPowers["DISINTEGRATION_POWER"] ?? 0,
    constrict: input.playerPowers["CONSTRICT_POWER"] ?? 0,
    // Tender's -1 a card played so far this turn is temporary too (logged Strength 6, 5, 4, 3 over a turn, 6 again next).
    tempStrength: sumOf(input.playerPowers, TEMP_STRENGTH_POWERS) - (base.tender ?? 0) * (s.cardsPlayedThisTurn ?? 0),
    tempDexterity: sumOf(input.playerPowers, TEMP_DEXTERITY_POWERS) - (base.tender ?? 0) * (s.cardsPlayedThisTurn ?? 0),
    tender: input.playerPowers["TENDER_POWER"] ?? base.tender ?? 0,
    smoggy: (input.playerPowers["SMOGGY_POWER"] ?? 0) > 0,
    tangledNext: 0,
    chains: input.playerPowers["CHAINS_OF_BINDING_POWER"] ?? 0,
    ringingNext: false,
    mindRot: input.playerPowers["MIND_ROT_POWER"] ?? 0,
    wasteAway: input.playerPowers["WASTE_AWAY_POWER"] ?? 0,
    regen: base.regen ?? input.playerPowers["REGEN_POWER"] ?? 0,
    ritual: input.playerPowers["RITUAL_POWER"] ?? 0,
    clarityTurns: input.playerPowers["CLARITY_POWER"] ?? 0,
    retainTurns: input.playerPowers["RETAIN_HAND_POWER"] ?? 0,
    retained: [],
    revives: base.revives ?? []
  };
  if (player.disintegration + player.constrict === 0) player.disintegration = base.endTurnHpLoss ?? 0;
  player.relicAoe = Math.max(0, (base.turnStartAoe ?? 0) - player.inferno * startLossEvents(player) - player.boulder);
  player.otherStartLoss = Math.max(0, (base.startTurnHpLoss ?? 0) - mantleHpCost(player.mantle) - player.infernoCopies);
  const byIndex = new Map(input.enemies.map((e) => [e.index, e]));
  const enemies = s.enemies.map((e) => {
    const info = byIndex.get(e.index);
    const shownBlast = e.attacks.reduce((sum, a) => sum + a.damage * a.hits, 0);
    const husk = e.maxHp >= HUSK_HP && ((e.eruption ?? 0) > 0 || shownBlast > 0);
    return {
      ...husk ? { explodeAt: shownBlast > 0 ? 0 : 1, blast: shownBlast > 0 ? shownBlast : e.eruption ?? 0 } : {},
      index: e.index,
      id: info?.id ?? e.name,
      move: info?.move ?? null,
      hp: e.hp,
      maxHp: e.maxHp,
      block: e.block,
      // A temporary loss (Mangle, Shackling Potion) is gone by its next move: the later turns hit at full Strength.
      strength: (info?.strength ?? 0) + sumOf(info?.powers, ENEMY_TEMP_STRENGTH_LOSS_POWERS),
      vigor: info?.powers?.["VIGOR_POWER"] ?? 0,
      vulnerable: e.vulnerable,
      weak: e.weak,
      poison: e.poison ?? info?.powers?.["POISON_POWER"] ?? 0,
      alive: e.hp > 0,
      // Intangible now lasts its stacks; Nemesis re-grants it at the end of every 2nd enemy turn, so it is
      // on every other turn (VQKX F48 T6: "win 88%" with Intangible never coming back, T7 212 -> 208).
      intangibleTurns: e.intangible ? Math.max(1, info?.powers?.["INTANGIBLE_POWER"] ?? 1) : 0,
      ...(info?.powers?.["NEMESIS_POWER"] ?? 0) > 0 ? { nemesisIn: e.intangible ? 2 : 1 } : {},
      burrowed: e.burrowed === true,
      artifact: e.artifact,
      slippery: e.slippery ?? 0,
      curlUp: e.curlUp ?? 0,
      flutter: e.flutter ?? 0,
      growth: sumOf(info?.powers, STRENGTH_GROWTH_POWERS),
      shrink: e.shrink ?? 0,
      demise: e.demise ?? 0,
      shriekArmed: (e.shriek ?? 0) > 0 && e.hp > (e.shriek ?? 0),
      plating: info?.powers?.["PLATING_POWER"] ?? 0,
      thorns: e.thorns ?? 0,
      halved: e.halved === true,
      dazedPerHit: e.dazedPerHit ?? 0,
      vitalSpark: e.vitalSpark ?? 0,
      // Thorns / Soar up now from one of its moves (its table has a move giving them): gone after its next move.
      moveBuffs: {
        thorns: (e.thorns ?? 0) > 0 && gainsSelf(input.tables[info?.id ?? ""], "THORNS_POWER"),
        soar: (info?.powers?.["SOAR_POWER"] ?? 0) > 0 && gainsSelf(input.tables[info?.id ?? ""], "SOAR_POWER")
      },
      powers: info?.powers ?? {},
      ...input.escapes?.carriers[e.index] !== void 0 ? { carrier: input.escapes.carriers[e.index] } : {},
      base: e,
      shown: e.attacks,
      shownScale: (e.weak > 0 ? 0.75 : 1) * ((e.shrink ?? 0) > 0 ? SHRINK_DAMAGE_FACTOR : 1) * (base.vulnerable ? 1.5 : 1),
      // Killed before this decision, it revives on this enemy turn (QUG1DSDARAXU F23 T3: the rollout left
      // it out and read "4.9 loss, win 97%"; it came back at 21 HP and T4 cost 12).
      ...e.illusion && e.hp <= 0 ? { reviveIn: 1 } : {},
      // A whole fight: a sleeper's Asleep turns, a phase boss's phase (from its max HP) and its growing move's hits.
      ...fullFight ? { ...fullFightState(info, e, input), random: rng2((Math.imul(seed2, 2654435761) ^ Math.imul(e.index + 1, 2246822507)) >>> 0) } : {}
    };
  });
  const piles = { draw: sampledDrawPile(input.piles, random), discard: input.piles.discard.slice(), ...input.onShuffle ? { onShuffle: input.onShuffle } : {} };
  const records = [];
  const powers = { ...input.playerPowers };
  let held = noPotions ? [] : s.hand.filter((card) => card.type === "Potion");
  const drink = (line) => {
    for (const step of line.steps) if (isPotion(step)) held = held.filter((card) => card.cardId !== step.cardId);
  };
  const limit2 = turnsLeftOf(s);
  const timeUp = (h) => {
    const last = records[records.length - 1];
    if (limit2 !== null && h + 1 >= limit2 && !last.won && !last.died) last.timeUp = true;
  };
  const cardPlays = (line) => line.steps.filter((step) => !isPotion(step)).length;
  let first = plan;
  let firstHand = s.hand;
  let firstBase = input.piles.handBase;
  let firstKnown;
  if (!first) {
    const targets = enemies.filter((e) => e.alive).map((e) => e.index);
    const cards = s.hand.filter((card) => card.type !== "Potion");
    const bases = s.hand.map((card, i) => [card, input.piles.handBase[i] ?? null]).filter(([card]) => card.type !== "Potion").map(([, b]) => b);
    for (let i = 0; i < (opts.drawFirst ?? 0) && cards.length < HAND_LIMIT; i += 1) {
      const card = drawOne2(piles, random);
      if (!card) break;
      bases.push(card);
      cards.push(withStrength(card, player, cards.length, targets));
    }
    const drawing = fullFight ? knownDraws(cards, piles, player, targets) : null;
    const potions = noPotions ? [] : fullFight ? sampledPotions(held, input, seed2, 0, cards, piles, player, targets, drawing?.known) : held;
    firstHand = [...drawing?.hand ?? cards, ...potions];
    firstBase = [...bases, ...potions.map(() => null)];
    firstKnown = drawing?.known;
    const { drawPile: _d, knownTop: _k, ...rest } = s;
    const ahead = fullFight ? lookaheadOf(opts, enemies, input, player, s.player.hp) : null;
    const solved = solveTurn({ ...rest, ...fullFight ? { player: { ...s.player, ...endBlockRelics(input), ...passiveSolverFields(input, s.player) } } : {}, ...withLookahead(policyWeights(opts, s.player, s.enemies), ahead), hand: firstHand, maxNodes: policyNodes });
    budget.policyTurns += 1;
    budget.policyNodes += solved.nodes;
    first = solved.plans[0] ?? null;
    if (!first) return records;
  }
  let witherPlayed = (s.wither?.played ?? 0) + cardPlays(first);
  let facing = s.player.facing ?? null;
  const turnTo = (line) => {
    for (const step of line.steps) if (typeof step.target === "number") facing = step.target;
  };
  records.push(applyPlan(0, first, firstHand, firstBase, player, enemies, piles, input, random, powers, fullFight, firstKnown));
  turnTo(first);
  timeUp(0);
  drink(first);
  for (let h = 1; h < horizon; h += 1) {
    const at2 = budget.now() - budget.start;
    if (at2 >= deadline) return null;
    if (budget.need !== void 0 && at2 > budget.need) budget.need = at2;
    const last = records[records.length - 1];
    if (last.won || last.died || last.timeUp) break;
    const hand = [];
    const handBase = [];
    const targets = enemies.filter((e) => e.alive).map((e) => e.index);
    const clarity = player.clarityTurns > 0 ? 1 : 0;
    player.clarityTurns = Math.max(0, player.clarityTurns - 1);
    for (const card of player.retained) {
      handBase.push(card);
      hand.push(withStrength(card, player, hand.length, targets));
    }
    player.retained = [];
    const relicDraws = fullFight ? fightRelicDrawsAt(input, (s.turn ?? input.meta.t) + h) : 0;
    for (let i = 0; i < Math.max(0, handSize + clarity + relicDraws - player.mindRot) && hand.length < HAND_LIMIT; i += 1) {
      const card = drawOne2(piles, random);
      if (!card) break;
      handBase.push(card);
      const drawn = withStrength(card, player, hand.length, targets);
      if (player.hellraiser && isStrikeCard(card)) {
        hand.push({ ...hellraised2(drawn), ...i < player.chains ? { soulbound: true } : {} });
        continue;
      }
      hand.push({
        ...drawn,
        ...player.tangledNext > 0 && drawn.type === "Attack" && !drawn.xCost && drawn.cost >= 0 ? { cost: drawn.cost + player.tangledNext } : {},
        ...i < player.chains ? { soulbound: true } : {}
      });
    }
    const single = base.backAttackPair === true && base.surrounded === true && enemies.filter((e) => e.alive).length < 2;
    const behind = (index, attacks) => fullFight && base.surrounded && !single && facing !== null && index !== facing ? attacks.map((a) => ({ ...a, damage: Math.floor(a.damage * 1.5) })) : attacks;
    const sims = enemies.filter((e) => e.alive).map((e) => ({
      ...laterTurnSim(e.base),
      intangible: e.intangibleTurns > 0,
      hp: e.hp,
      maxHp: e.maxHp,
      block: e.block,
      vulnerable: e.vulnerable,
      weak: e.weak,
      ...e.poison > 0 || e.base.poison !== void 0 ? { poison: e.poison } : {},
      artifact: e.artifact,
      slippery: e.slippery,
      curlUp: e.curlUp,
      flutter: e.flutter,
      thorns: e.thorns,
      halved: e.halved,
      shrink: e.shrink,
      demise: e.demise,
      dazedPerHit: e.dazedPerHit,
      vitalSpark: e.vitalSpark,
      // Burrowed is this simulated turn's own state, not the decision's (laterTurnSim drops the latter).
      burrowed: e.burrowed,
      // A whole fight's sleeper still asleep: the solver prices waking it (laterTurnSim drops the decision's).
      ...e.asleep !== void 0 && e.asleep > 0 ? { asleep: e.asleep } : {},
      // Shriek / Plow still to come (laterTurnSim drops the decision's).
      ...e.shriekArmed && (e.base.shriek ?? 0) > 0 ? { shriek: e.base.shriek } : {},
      // Hardened Shell: a new turn, the whole cap again (the decision's is what was left of that turn's).
      ...(e.powers["HARDENED_SHELL_POWER"] ?? 0) > 0 ? { hpLossCap: e.powers["HARDENED_SHELL_POWER"] } : {},
      ...e.base.timeLimit !== void 0 ? { timeLimit: Math.max(1, e.base.timeLimit - h) } : {},
      // MECH_DEATH_MOVE: its death rules re-read from the move it has now (laterTurnSim keeps the decision's).
      ...e.base.moveOnDeath ? { moveOnDeath: laterDeathMoves(e, enemies, input.tables[e.id], player.vulnTurns > 0, { fullFight, faced: fullFight && base.surrounded === true && facing !== null || single }) } : {},
      attacks: e.explodeAt !== void 0 ? e.explodeAt === h ? [{ damage: e.blast ?? 0, hits: 1 }] : [] : behind(e.index, moveAttack(e, input.tables[e.id], e.move, player.vulnTurns > 0, { fullFight, faced: fullFight && base.surrounded === true && facing !== null || single }))
    })).map((sim) => {
      const e = enemies.find((entry) => entry.index === sim.index);
      const imbalanced = e && (e.powers["IMBALANCED_POWER"] ?? 0) > 0 ? sim.attacks.reduce((sum, attack) => sum + attack.damage * attack.hits, 0) : 0;
      return imbalanced > 0 ? { ...sim, imbalanced } : sim;
    });
    for (const e of enemies) e.base = { ...e.base, attacks: sims.find((x) => x.index === e.index)?.attacks ?? [] };
    const carried = fullFight && input.fightRelics?.iceCream ? Math.max(0, Math.floor(last.snap.en)) : 0;
    const pSim = {
      ...base,
      // KV0JHNJCKXLS T1 -> T2: the transient lock expires; base pile cards retain their original costs.
      ...base.noDraw !== void 0 ? { noDraw: false } : {},
      ...base.tuningFork ? { tuningFork: { ...base.tuningFork, count: player.tuningForkCount ?? 0 } } : {},
      ...base.permafrostBlock !== void 0 ? { permafrostBlock: player.permafrostBlock ?? 0 } : {},
      // 10GPK5XGHCK3 F42, silent-0075: the decision turn's Shadowmeld has expired.
      shadowmeldActive: false,
      // 10GPK5XGHCK3 F37/F48, silent-0074: Wave never poisons later turns' draws.
      corrosiveWave: 0,
      hp: player.hp,
      block: player.block,
      ...player.nextTurnBlock !== null ? { nextTurnBlock: 0 } : {},
      energy: Math.max(0, input.meta.max_en + relicEnergyAt(input, (s.turn ?? input.meta.t) + h) + (fullFight ? fightRelicEnergyAt(input, (s.turn ?? input.meta.t) + h) + carried : 0) + player.pyre + (player.radiance > 0 ? 1 : 0) + player.paelsNext - player.wasteAway),
      weak: player.weakTurns > 0,
      vulnerable: player.vulnTurns > 0,
      frail: player.frailTurns > 0,
      dexterityNow: player.dexterity,
      strengthNow: player.strength,
      // FREE_ATTACK_POWER stays up across turns (Unrelenting as the last Attack): the last turn's leftover.
      freeAttacks: player.freeAttacks,
      // Pen Nib: the count as the turns before left it (the decision's is `base`'s).
      ...player.penNib !== void 0 ? { penNib: player.penNib } : {},
      // Self-Forming Clay: what the last turn owed is in this turn's block already; this turn's start losses (Crimson
      // Mantle's, Inferno's) owe the next turn's (2VW5 F17: SELF_FORMING_CLAY_POWER 3 at every turn start with the
      // Mantle up, 7 + 3 block at the next).
      clayPending: (base.clayBlock ?? 0) * startLossEvents(player),
      duplicate: 0,
      // 53FLQ68CETW0 F48 attempt 6 T3 -> T4, silent-0115: unused Burst expires.
      duplicateSkills: 0,
      buffer: 0,
      vigor: 0,
      regen: player.regen,
      facing: fullFight ? facing : null,
      ...fullFight ? endBlockRelics(input) : {},
      // PASSIVE_PIECES: Orichalcum, Ripple Basin, Letter Opener, Ornamental Fan, Parrying Shield (absent: none held, or off).
      ...passiveSolverFields(input),
      unmovableArmed: player.unmovable,
      strikeReplay: player.strikeReplay,
      exhaustedThisTurn: false,
      // CARD_CONDITIONS: Inferno's or Crimson Mantle's HP taken as this turn started (Spite hits twice from the first card).
      ...cardConditionOptions.enabled && startLossEvents(player) > 0 ? { hpLostThisTurn: true } : {},
      noBlock: false,
      tender: player.tender,
      maxSkills: player.smoggy ? 1 : null,
      revives: player.revives,
      // This turn's own state, by the game's rules, not the decision's (`...base`): Sloth's cap per turn
      // (Ringing was the decision turn's only), Intangible/Blur for the turns they last, Constrict while its
      // Strangler lives, a Shrink of -1 for the fight but, in a fight with the Shrinker Beetle, only while it lives
      // (another's for its turns). The hand's cards (withStrength) carry Strength and Weak, not Shrink: the solver shrinks
      // them once (a decision hand card kept or put back unbased carries its own: CardModel.shownShrunk).
      maxPlays: player.ringingNext ? Math.min(player.playCap ?? Infinity, 1) : player.playCap,
      slothDefendReplay: base.slothDefendReplay === true && player.playCap === 3 && !player.ringingNext,
      intangible: player.intangibleTurns > h,
      shrunk: player.shrinkTurns > 0 && (player.shrinkTurns !== Infinity || !enemies.some((e) => e.id === SHRINKER) || enemies.some((e) => e.alive && e.id === SHRINKER)),
      endTurnHpLoss: player.disintegration + (player.constrict > 0 && enemies.some((e) => e.alive && e.id === CONSTRICTOR) ? player.constrict : 0),
      keepsBlock: player.keepsBlock || player.blurTurns > h,
      endTurnBlock: player.endTurnBlock + player.plating,
      juggernaut: player.juggernaut,
      feelNoPain: player.feelNoPain,
      afterImage: player.afterImage,
      ...player.serpentForm !== null ? { serpentForm: player.serpentForm } : {},
      poisonExtraTriggers: player.poisonExtraTriggers,
      envenom: player.envenom,
      // UACFSW4VDDLD F33 T5 / F48 T9: each fresh turn has one bonus, before enemy damage caps.
      phantomBlades: player.phantomBlades,
      phantomBladesSpent: false,
      // Mid-turn draws: Hellraiser plays the Strikes, Dark Embrace draws for each exhaust (the solver's own turn).
      hellraiser: player.hellraiser,
      darkEmbrace: player.darkEmbrace,
      // Lasting powers up by now, played in the line or before (0B5Y F33 T1: Inferno was T1's 0 every turn).
      inferno: player.inferno,
      infernoCopies: player.infernoCopies,
      rupture: player.rupture,
      startTurnHpLoss: startTurnHpLossOf(player),
      turnStartAoe: turnStartAoeOf(player),
      drawable: piles.draw.length + piles.discard.length,
      rage: 0,
      colossus: false,
      gambit: false,
      // Thorns up by now (Liquid Bronze drunk in the line or before); Flame Barrier's was the decision turn's only.
      retaliate: player.thorns,
      ...base.kusarigama ? { kusarigama: { ...base.kusarigama, count: 0 } } : {},
      // Shuriken: a new turn, the count starts again (the Strength it gave is in player.strength already).
      ...base.shuriken ? { shuriken: { ...base.shuriken, count: 0 } } : {},
      // Music Box: a new turn, its first Attack card makes a copy again.
      ...base.musicBox ? { musicBox: { count: 0 } } : {},
      // Throwing Axe: the fight's first card was the decision turn's.
      firstCardReplay: false
    };
    player.radiance = Math.max(0, player.radiance - 1);
    player.ringingNext = false;
    player.tangledNext = 0;
    const started = budget.now();
    if (started - budget.start >= deadline) return null;
    const { drawPile: _d, wither: _w, focusIndex: _f, focusWeight: _fw, nextIncoming: _n, laterIncoming: _l, knownTop: _k, ...rest } = s;
    const potions = held.map((card) => ({ ...card, validTargets: card.target === "single" ? targets : [] }));
    const aim = order ? orderTarget(order, enemies) : null;
    if (aim) used.depth = Math.max(used.depth, aim.depth);
    const target = aim?.target;
    const focus = target === void 0 ? {} : { focusIndex: target, focusWeight: opts.orderFocusBonus ?? ORDER_FOCUS_BONUS };
    const wither = s.wither ? { wither: { ...s.wither, played: witherPlayed } } : {};
    const scale = withLookahead(policyWeights(opts, pSim, sims), fullFight ? lookaheadOf(opts, enemies, input, player, pSim.hp) : null);
    const drawing = fullFight ? knownDraws(hand, piles, player, targets) : null;
    const played = drawing?.hand ?? hand;
    const potionsNow = fullFight ? sampledPotions(potions, input, seed2, h, played, piles, player, targets, drawing?.known) : potions;
    const solved = solveTurn({
      ...rest,
      ...focus,
      ...wither,
      ...scale,
      hand: [...played, ...potionsNow],
      player: pSim,
      enemies: sims,
      turn: (s.turn ?? 1) + h,
      cardsPlayedThisTurn: 0,
      maxNodes: policyNodes,
      ...Number.isFinite(deadline) ? { deadline: budget.start + deadline, deadlineNow: budget.now } : {}
    });
    budget.policyMs += budget.now() - started;
    budget.policyTurns += 1;
    budget.policyNodes += solved.nodes;
    if (solved.timedOut || Number.isFinite(deadline) && budget.now() - budget.start >= deadline) return null;
    const best = solved.plans[0];
    if (!best) break;
    records.push(applyPlan(h, best, [...played, ...potionsNow], handBase, player, enemies, piles, input, random, powers, fullFight, drawing?.known));
    turnTo(best);
    witherPlayed += cardPlays(best);
    timeUp(h);
    drink(best);
  }
  if (Number.isFinite(deadline) && budget.now() - budget.start >= deadline) return null;
  return records;
}
function policyWeights(opts, player, enemies) {
  const out = {};
  if (opts.policyDamageScale !== void 0) out.damageScale = opts.policyDamageScale;
  const threat2 = opts.policyThreat ?? 0;
  if (opts.policyHpScale === void 0 && threat2 === 0) return out;
  const incoming = enemies.reduce((sum, e) => sum + (e.hp > 0 ? e.attacks.reduce((s, a) => s + a.damage * a.hits, 0) : 0), 0);
  out.hpScale = (opts.policyHpScale ?? 1) * (1 + threat2 * incoming / Math.max(1, player.hp));
  return out;
}
function nextAttacks(enemies, input, playerVulnerable) {
  const out = [];
  for (const e of enemies) {
    if (!e.alive || e.explodeAt !== void 0) continue;
    const table2 = input.tables[e.id];
    const now = e.move && table2 ? table2.moves[e.move] : void 0;
    const strength = e.strength + (now?.strength ?? 0) + e.growth;
    let total = 0;
    for (let k = 0; k < LOOKAHEAD_DRAWS; k += 1) {
      const u = (k + 0.5) / LOOKAHEAD_DRAWS;
      const copy = { ...e };
      const move = fightNextMove(copy, table2, () => u, enemies);
      total += moveAttack({ ...copy, move, strength, weak: 0, shrink: 0 }, table2, move, playerVulnerable, { fullFight: true, faced: false }).reduce((sum, a) => sum + a.damage * a.hits, 0);
    }
    out.push({ index: e.index, damage: total / LOOKAHEAD_DRAWS });
  }
  return out;
}
function lookaheadOf(opts, enemies, input, player, hp) {
  const look = opts.policyLookahead;
  if (!look || look.lethal === 0 && look.threat === 0) return null;
  const attacks = nextAttacks(enemies, input, player.vulnTurns > 1);
  const next = attacks.reduce((sum, a) => sum + a.damage, 0);
  return {
    fields: { ...next > 0 ? { nextIncoming: next } : {}, ...look.lethal > 0 ? { nextHit: { attacks, handBlock: ERUPTION_NEXT_BLOCK, weight: look.lethal } } : {} },
    hpFactor: 1 + look.threat * next / Math.max(1, hp)
  };
}
function withLookahead(scale, ahead) {
  if (!ahead) return scale;
  return { ...scale, ...ahead.fields, ...ahead.hpFactor !== 1 ? { hpScale: (scale.hpScale ?? 1) * ahead.hpFactor } : {} };
}
function fullFightState(info, e, input) {
  const id = info?.id ?? e.name;
  const phases = PHASE_MOVES[id];
  const asleep = info?.powers?.["ASLEEP_POWER"] ?? e.asleep ?? 0;
  const table2 = input.tables[id];
  const growing = GROWING_HITS[id];
  const shownHits = growing && info?.move === growing ? Math.max(0, ...e.attacks.map((a) => a.hits)) : 0;
  const baseHits = growing ? table2?.moves[growing]?.hits ?? 0 : 0;
  return {
    ...asleep > 0 ? { asleep } : {},
    ...phases ? { phase: Math.max(0, phases.length - 1 - laterPhaseHps(e.maxHp, input.meta.asc).length) } : {},
    ...growing ? { extraHits: Math.max(0, shownHits - baseHits) } : {},
    ...id === "KNOWLEDGE_DEMON" ? { curses: KNOWLEDGE_CURSE_POWERS.filter((power) => (input.playerPowers[power] ?? 0) > 0).length } : {}
  };
}
function simulateFight(input, plan, maxTurns, seed2, scripts2 = true, order = null) {
  const budget = { now: () => 0, start: 0, budgetMs: Infinity, policyTurns: 0, policyMs: 0, policyNodes: 0 };
  const records = simulate(input, plan, maxTurns, seed2, budget, Infinity, order, { depth: 0 }, false, scripts2) ?? [];
  return { records, policyTurns: budget.policyTurns, policyNodes: budget.policyNodes };
}
function costOf(records, n) {
  let cost = 0;
  for (let i = 0; i < Math.min(n, records.length); i += 1) cost += records[i].potionCost ?? 0;
  return cost;
}
function lootOf(last, lootHp, open) {
  if (!lootHp) return { loot: 0, lost: [] };
  let loot = 0;
  const lost = [];
  for (const [tag, hp] of Object.entries(lootHp)) {
    const status = last.thieves?.[tag];
    if (status === "gone" || open && status === "open") {
      loot += hp;
      lost.push(tag);
    }
  }
  return { loot, lost };
}
function thiefCounts(lasts) {
  if (!lasts.some((record) => record.thieves)) return null;
  const out = {};
  for (const record of lasts) {
    for (const [tag, status] of Object.entries(record.thieves ?? {})) {
      const entry = out[tag] ??= { back: 0, gone: 0 };
      if (status === "back") entry.back += 1;
      else if (status === "gone") entry.gone += 1;
    }
  }
  return out;
}
function enemyHpOf(record) {
  if (record.won) return 0;
  if (record.hpLeft) return Object.values(record.hpLeft).reduce((sum, hp) => sum + hp, 0);
  return record.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0);
}
function groupHpOf(record, indices) {
  if (record.won) return 0;
  return indices.reduce((sum, index) => {
    if (record.hpLeft) return sum + (record.hpLeft[index] ?? 0);
    const e = record.snap.E.find((x) => x[0] === index);
    return sum + (e && e[5] ? Math.max(0, e[2]) : 0);
  }, 0);
}
function remainingHp(e, input) {
  if (e.explodeAt !== void 0) return 0;
  if (e.base.illusion) return e.maxHp;
  if (!e.alive) return e.reattachIn !== void 0 ? Math.min(e.maxHp, e.base.reattachHp || REATTACH_HP) : 0;
  const phases = e.base.revives ? (e.phasesLeft ?? laterPhaseHps(e.maxHp, input.meta.asc)).reduce((sum, hp) => sum + hp, 0) : 0;
  const stock = Math.max(0, e.base.stock ?? 0) * e.maxHp;
  const spawns = e.base.spawnsOnDeath ? (input.spawns?.[e.id] ?? []).reduce((sum, spawn) => sum + spawn.hp * spawn.count, 0) : 0;
  return Math.max(0, e.hp) + phases + stock + spawns;
}
function valueAt(records, h, ctx, t0, lossCap, lootHp) {
  let loss = 0;
  const upto = Math.min(h, records.length);
  for (let i = 0; i < upto; i += 1) {
    const r = records[i];
    if (r.died) return { reserveCost: 0, loss: lossCap, win: 0, turns: i + 1, died: true, lossModel: lossCap, winModel: 0, n: 0, cost: 0, loot: 0, lost: [] };
    if (r.won) {
      loss += r.loss;
      return {
        reserveCost: ctx.continuation ? continuationCost(ctx.continuation.value, ctx.continuation.hp, r.resources?.hp ?? ctx.continuation.hp - loss) : 0,
        loss,
        win: 1,
        turns: i + 1,
        died: false,
        lossModel: loss,
        winModel: 1,
        n: 0,
        cost: costOf(records, i + 1),
        ...lootOf(r, lootHp, h > 1)
      };
    }
    if (r.timeUp) {
      loss += r.loss;
      return { reserveCost: 0, loss, win: 0, turns: i + 1, died: false, lossModel: loss, winModel: 0, n: 0, cost: costOf(records, i + 1), ...lootOf(r, lootHp, h > 1) };
    }
    if (i < upto - 1) loss += r.loss;
  }
  const last = records[upto - 1];
  const own = last.loss - last.enemyPart;
  const term = terminal(ctx, last.snap, t0 + upto - 1);
  const base = loss + Math.max(0, own);
  return {
    // No line loses more than the HP we have (GG0Y F33: 144.9 "further loss" at 59 HP), revives included.
    reserveCost: ctx.continuation ? continuationUtility(ctx.continuation.value, ctx.continuation.hp) - term.gated.winProb * continuationUtility(ctx.continuation.value, Math.max(0, ctx.continuation.hp - base - term.gated.hpLoss)) : 0,
    loss: Math.min(lossCap, base + term.gated.hpLoss),
    win: term.gated.winProb,
    turns: upto + term.gated.turns,
    died: false,
    lossModel: term.model ? Math.min(lossCap, base + term.model.hpLoss) : null,
    winModel: term.model ? term.model.winProb : null,
    n: term.n,
    cost: costOf(records, upto),
    ...lootOf(last, lootHp, h > 1)
  };
}
function illusionFocusOrders(plan, orders2, enemies) {
  const targets = plan.steps.filter((step) => step.target !== null).map((step) => step.target);
  if (targets.length === 0) return orders2;
  const own = orders2.filter((order) => order !== null && order.firstRevives === true && targets.every((target) => order.groups[0].includes(target)));
  if (own.length === 0) return orders2;
  const focus = own[0].groups[0];
  const after = new Map(plan.outcome.enemyHpAfter.map((enemy) => [enemy.index, enemy.hp]));
  const elsewhere = enemies.some((enemy) => !focus.includes(enemy.index) && enemy.hp > 0 && (after.get(enemy.index) ?? enemy.hp) < enemy.hp);
  return elsewhere ? orders2 : own;
}
function permutations(items) {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
function killOrders(groups, maxFull = MAX_FULL_ORDER_GROUPS) {
  if (groups.length < 2) return { orders: [], dropped: 0 };
  const nameOf3 = (group) => group.indices.length > 1 ? `${group.name} x${group.indices.length}` : group.name;
  const leader = groups.find((group) => group.leader);
  const make = (seq) => ({
    key: seq.map((group) => group.id).join(">"),
    label: seq.map(nameOf3).join(" > "),
    groups: seq.map((group) => group.indices.slice()),
    ...seq[0]?.illusion ? { firstRevives: true } : {},
    ...leader ? { leader: { indices: leader.indices.slice(), name: nameOf3(leader) } } : {}
  });
  if (groups.length <= maxFull) return { orders: permutations(groups).map(make), dropped: 0 };
  const byHp = [...groups].sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
  const orders2 = byHp.map((first) => make([first, ...byHp.filter((group) => group !== first)]));
  return { orders: orders2, dropped: factorial(groups.length) - orders2.length };
}
function orderTarget(order, enemies) {
  for (let i = 0; i < order.groups.length; i += 1) {
    const group = order.groups[i];
    const living = enemies.filter((e) => group.includes(e.index) && e.alive && e.hp > 0 && e.explodeAt === void 0);
    if (living.length > 0) return { target: living.reduce((a, b) => b.hp < a.hp || b.hp === a.hp && b.index < a.index ? b : a).index, depth: i + 1 };
  }
  return { target: void 0, depth: order.groups.length };
}
function rankOrders(entries) {
  const indexed = entries.map((entry, k) => ({ entry, k }));
  const byLeader = entries.length >= 2 && entries.every((entry) => entry.leader !== null && entry.wins === 0);
  if (!byLeader) return { ranked: indexed.sort((a, b) => b.entry.value - a.entry.value || a.k - b.k).map(({ entry }) => entry), byLeader };
  const leastLeft = Math.min(...entries.map((entry) => entry.leader.hpLeft));
  const key = (entry) => [entry.leader.hpLeft > leastLeft + LEADER_HP_TIE ? 1 : 0, -entry.value];
  const ranked = indexed.sort((a, b) => {
    const ka = key(a.entry);
    const kb = key(b.entry);
    for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return a.k - b.k;
  }).map(({ entry }) => entry);
  return { ranked, byLeader };
}
function samePrefix(a, b, depth) {
  for (let i = 0; i < depth; i += 1) if ((a.groups[i] ?? []).join(",") !== (b.groups[i] ?? []).join(",")) return false;
  return true;
}
function rolloutDecision(input) {
  try {
    return evaluateRollout(input);
  } catch (error) {
    if (!(error instanceof MissingStunModel)) throw error;
    return {
      unavailable: error.message,
      lines: [],
      orders: [],
      horizon: 0,
      samples: 0,
      elapsedMs: 0,
      degraded: ["missing stun model"],
      policyTurns: 0,
      policyMs: 0,
      policyNodes: 0
    };
  }
}
function evaluateRollout(input) {
  const opts = input.options ?? {};
  const now = opts.now ?? (() => performance.now());
  const budget = { now, start: now(), budgetMs: opts.budgetMs ?? 1500, policyTurns: 0, policyMs: 0, policyNodes: 0, need: 0 };
  const needs = (ms) => {
    if (ms > budget.need) budget.need = ms;
  };
  const maxHorizon = opts.horizon ?? 5;
  const maxSamples = opts.samples ?? 8;
  const seed2 = opts.seed ?? 1;
  const candidates = selectCandidates(input.plans, opts.k ?? 6, opts.include ?? []);
  const noPotionLine = opts.noPotionLine && !opts.noPotionLine.steps.some(isPotion) ? opts.noPotionLine : void 0;
  if (noPotionLine) {
    const at2 = candidates.findIndex((entry) => entry.plan === noPotionLine);
    if (at2 >= 0) candidates[at2] = { plan: noPotionLine, tags: [.../* @__PURE__ */ new Set([...candidates[at2].tags, "offered", "no-potion"])] };
    else candidates.push({ plan: noPotionLine, tags: ["offered", "no-potion"] });
  }
  const boardLeader = (opts.orders ?? []).find((order) => order.leader)?.leader?.indices ?? null;
  const gate = gateFor(input.gates, input.meta.enc, input.meta.act, input.meta.kind);
  const ctx = {
    meta: input.meta,
    mm: input.mm,
    model: input.model,
    gates: input.gates,
    w: gate.w,
    ...input.solver.continuationValue ? { continuation: { value: input.solver.continuationValue, hp: input.solver.player.hp } } : {}
  };
  const ctxModel = { ...ctx, w: 1 };
  const t0 = input.meta.t;
  const startHp = input.solver.player.hp;
  const lossCap = startHp + (input.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
  const hpWeight = solverHpWeight(startHp, input.solver.player.maxHp);
  const degraded = [];
  const lootHp = input.escapes?.lootHp && Object.keys(input.escapes.lootHp).length > 0 ? input.escapes.lootHp : void 0;
  const lostCounts = (vals) => {
    const out = Object.fromEntries(Object.keys(lootHp ?? {}).map((tag) => [tag, 0]));
    for (const v of vals) for (const tag of v.lost) out[tag] = (out[tag] ?? 0) + 1;
    return out;
  };
  const one2 = candidates.map(({ plan }) => {
    const records = simulate(input, plan, 1, seed2, budget);
    const v = valueAt(records, 1, ctx, t0, lossCap, lootHp);
    const vm = valueAt(records, 1, ctxModel, t0, lossCap, lootHp);
    const modelValue = vm.lossModel === null ? null : -vm.lossModel - v.cost - v.loot - vm.reserveCost - DEATH_HP * (1 - (vm.winModel ?? 0));
    const current2 = plan.score / hpWeight;
    return {
      cost: v.cost,
      reserveCost: v.reserveCost,
      modelReserveCost: vm.reserveCost,
      loot: v.loot,
      lost: v.lost,
      hpLoss: v.loss,
      winProb: v.win,
      turns: v.turns,
      modelValue,
      value: modelValue === null ? current2 : blend(gate.w, modelValue, current2),
      n: v.n,
      lossModel: vm.lossModel,
      winModel: vm.winModel,
      enemyHpLeft: enemyHpOf(records[0]),
      leaderHpLeft: boardLeader ? groupHpOf(records[0], boardLeader) : null,
      survived: v.died ? v.turns : 1,
      thieves: thiefCounts([records[0]])
    };
  });
  const orders2 = opts.orders && opts.orders.length >= 2 ? opts.orders : [null];
  const units = candidates.flatMap(
    ({ plan, tags }, line) => (orders2.length > 1 && !tags.includes("offered") ? [null] : illusionFocusOrders(plan, orders2, input.solver.enemies)).map((order) => ({ line, plan, order, noPotions: plan === noPotionLine }))
  );
  const trajectories = units.map(() => []);
  const shared2 = /* @__PURE__ */ new Map();
  const run = (unit, h, j) => {
    const key = `${unit.line}:${h}:${j}`;
    const done = unit.order ? shared2.get(key) ?? [] : [];
    const hit = unit.order ? done.find((entry) => samePrefix(entry.order, unit.order, entry.depth)) : void 0;
    if (hit) return hit.records;
    const used = { depth: 0 };
    const records = simulate(input, unit.plan, h, seed2 * 7919 + 1 + j, budget, budget.budgetMs, unit.order, used, unit.noPotions);
    if (unit.order && records) shared2.set(key, [...done, { order: unit.order, depth: used.depth, records }]);
    return records;
  };
  let horizon = maxHorizon;
  let samples2 = maxSamples;
  const elapsed = () => now() - budget.start;
  if (maxHorizon > 1) {
    const turnsBefore = budget.policyTurns;
    const t = now();
    let firstHorizon = maxHorizon;
    const first = [];
    for (const unit of units) {
      const records = run(unit, firstHorizon, 0);
      first.push(records);
      const rest = units.length - first.length;
      if (first.length === 1 && records !== null && rest > 0 && firstHorizon > SHORT_HORIZON) {
        const at2 = now();
        needs((at2 - t) * rest + (at2 - budget.start));
        if ((at2 - t) * rest > budget.budgetMs - (at2 - budget.start)) firstHorizon = SHORT_HORIZON;
      }
    }
    if (firstHorizon < maxHorizon) degraded.push(`first wave at ${firstHorizon} turns`);
    const waveMs = now() - t;
    const perTurn = waveMs / Math.max(1, budget.policyTurns - turnsBefore);
    const leftAt = elapsed();
    const left = budget.budgetMs - leftAt;
    const cost = (h, m) => (orders2.length > 1 ? waveMs * (h - 1) / Math.max(1, firstHorizon - 1) : perTurn * units.length * (h - 1)) * (m - 1);
    const base = orders2.length > 1 ? ORDER_SCHEDULE : SCHEDULE;
    const topSamples = base[0].samples;
    const more = maxSamples > topSamples ? [.../* @__PURE__ */ new Set([maxSamples, Math.round(maxSamples * 2 / 3), Math.round(maxSamples / 2)])].filter((m) => m > topSamples).map((m) => ({ horizon: maxHorizon, samples: m })) : [];
    const schedule = [...more, ...base].map((s) => ({ horizon: Math.min(s.horizon, firstHorizon), samples: Math.min(s.samples, maxSamples) })).concat(firstHorizon < maxHorizon ? [{ horizon: firstHorizon, samples: 1 }] : []).filter((s, i, all) => all.findIndex((t2) => t2.horizon === s.horizon && t2.samples === s.samples) === i);
    const fit = schedule.find((s) => cost(s.horizon, s.samples) <= left);
    if (schedule[0]) needs(cost(schedule[0].horizon, schedule[0].samples) + leftAt);
    const checked = (ms) => {
      needs(ms);
      return ms;
    };
    if (first.some((r) => r === null)) {
      horizon = 1;
      samples2 = 1;
      degraded.push("1-turn");
    } else if (checked(elapsed()) > budget.budgetMs || !fit) {
      first.forEach((records, i) => trajectories[i].push(records));
      horizon = firstHorizon;
      samples2 = 1;
      if (firstHorizon < maxHorizon) degraded.push(`horizon ${firstHorizon}`);
      degraded.push("samples 1 (clock)");
    } else {
      first.forEach((records, i) => trajectories[i].push(records));
      if (fit.horizon < maxHorizon) degraded.push(`horizon ${fit.horizon}`);
      if (fit.samples < maxSamples) degraded.push(orders2.length > 1 ? `samples ${fit.samples} per kill order` : `samples ${fit.samples}`);
      horizon = fit.horizon;
      samples2 = fit.samples;
      for (let j = 1; j < samples2; j += 1) {
        const wave = units.map((unit) => run(unit, horizon, j));
        if (wave.some((r) => r === null)) {
          samples2 = j;
          degraded.push(`samples ${samples2} (clock)`);
          break;
        }
        wave.forEach((records, i) => trajectories[i].push(records));
      }
    }
  } else {
    horizon = 1;
    samples2 = 1;
  }
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const estimate = (runs, order) => {
    const kept = runs.slice(0, samples2);
    const first = order?.groups[0] ?? [];
    const firstDown = order?.firstRevives ? null : kept.filter((records) => {
      const last = records[Math.min(horizon, records.length) - 1];
      const gone = new Set(last.gone ?? []);
      if (first.some((index) => gone.has(index))) return false;
      return last.won || first.every((index) => last.snap.E.every((e) => e[0] !== index || !e[5]));
    }).length;
    const wins = kept.filter((records) => records.slice(0, horizon).some((r) => r.won)).length;
    const timeUps = kept.filter((records) => records.slice(0, horizon).some((r) => r.timeUp)).length;
    const revived = kept.filter((records) => records.slice(0, horizon).some((r) => (r.revived ?? 0) > 0)).length;
    const leaderIndices = order?.leader?.indices;
    const leaderLeft = leaderIndices ? kept.map((records) => groupHpOf(records[Math.min(horizon, records.length) - 1], leaderIndices)) : null;
    const leader = leaderLeft ? { hpLeft: mean(leaderLeft), dead: leaderLeft.filter((hp) => hp <= 0).length } : null;
    const leaderHpLeft = boardLeader ? mean(kept.map((records) => groupHpOf(records[Math.min(horizon, records.length) - 1], boardLeader))) : null;
    const vals = kept.map((records) => valueAt(records, horizon, ctx, t0, lossCap, lootHp));
    const valsM = kept.map((records) => valueAt(records, horizon, ctxModel, t0, lossCap, lootHp));
    const loss = mean(vals.map((v) => v.loss));
    const win = mean(vals.map((v) => v.win));
    const alive = vals.filter((v) => !v.died);
    const dead = vals.filter((v) => v.died);
    const enemyHpLeft = mean(kept.map((records) => enemyHpOf(records[Math.min(horizon, records.length) - 1])));
    const turnsSurvived = mean(vals.map((v) => v.died ? v.turns : horizon));
    const model2 = valsM.every((v) => v.lossModel !== null) ? { hpLoss: mean(valsM.map((v) => v.lossModel)), winProb: mean(valsM.map((v) => v.winModel)) } : null;
    const cost = mean(vals.map((v) => v.cost));
    const reserveCost = mean(vals.map((v) => v.reserveCost));
    const modelReserveCost = mean(valsM.map((v) => v.reserveCost));
    const loot = lootHp ? mean(vals.map((v) => v.loot)) : 0;
    const laterDrinks = {};
    for (const records of kept) {
      const ids = new Set(records.slice(1, horizon).flatMap((record) => record.drunk ?? []));
      for (const id of ids) laterDrinks[id] = (laterDrinks[id] ?? 0) + 1;
    }
    const thieves = thiefCounts(kept.map((records) => records[Math.min(horizon, records.length) - 1]));
    return {
      potionCost: cost,
      ...ctx.continuation ? { continuationCost: reserveCost } : {},
      laterDrinks,
      ...thieves ? { thieves } : {},
      ...lootHp ? { thiefCost: loot, thiefLost: lostCounts(vals) } : {},
      hpLoss: loss,
      turnsToWin: alive.length > 0 ? mean(alive.map((v) => v.turns)) : null,
      deaths: dead.length,
      turnsToDeath: dead.length > 0 ? mean(dead.map((v) => v.turns)) : null,
      winProb: win,
      wins,
      timeUps,
      value: -loss - cost - loot - reserveCost - DEATH_HP * (1 - win),
      valueModelTerminal: model2 === null ? null : -model2.hpLoss - cost - loot - modelReserveCost - DEATH_HP * (1 - model2.winProb),
      modelForecast: model2,
      perTurn: turnSpreads(kept, horizon),
      firstDown,
      leader,
      enemyHpLeft,
      turnsSurvived,
      revived,
      leaderHpLeft
    };
  };
  const lines = candidates.map(({ plan, tags }, i) => {
    const current2 = plan.score / hpWeight;
    const o = one2[i];
    const basis = { rolloutSamples: horizon > 1 ? samples2 : 0, horizon, modelN: o.n, w: gate.w, segment: gate.segment, gateN: gate.n };
    const common = {
      plan,
      tags,
      ...plan === noPotionLine ? { noPotionFight: true } : {},
      score: plan.score,
      currentValue: current2,
      oneTurn: { hpLoss: o.hpLoss, winProb: o.winProb, turns: o.turns, modelValue: o.modelValue, value: o.value },
      horizon,
      samples: samples2,
      basis
    };
    if (horizon <= 1) {
      const wins = plan.outcome.winsFight ? 1 : 0;
      return {
        ...common,
        ...plan.outcome.revived ? { revived: 1 } : {},
        order: null,
        orders: [],
        ...o.thieves ? { thieves: o.thieves } : {},
        ...lootHp ? { thiefCost: o.loot, thiefLost: lostCounts([o]) } : {},
        hpLoss: o.hpLoss,
        potionCost: o.cost,
        laterDrinks: {},
        enemyHpLeft: o.enemyHpLeft,
        leaderHpLeft: o.leaderHpLeft,
        turnsSurvived: o.survived,
        turnsToWin: o.turns,
        deaths: 0,
        turnsToDeath: null,
        winProb: o.winProb,
        wins,
        ...ctx.continuation ? { continuationCost: o.reserveCost } : {},
        value: -o.hpLoss - o.cost - o.loot - o.reserveCost - DEATH_HP * (1 - o.winProb),
        valueModelTerminal: o.lossModel === null ? null : -o.lossModel - o.cost - o.loot - o.modelReserveCost - DEATH_HP * (1 - (o.winModel ?? 0)),
        modelForecast: { oneTurn: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 }, rollout: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 } },
        perTurn: []
      };
    }
    const { ranked: byOrder, byLeader } = rankOrders(
      units.map((unit, u) => ({ unit, u })).filter(({ unit }) => unit.line === i).map(({ unit, u }) => ({ order: unit.order, ...estimate(trajectories[u], unit.order) }))
    );
    const best = byOrder[0];
    return {
      ...common,
      order: best.order,
      orders: byOrder.filter((entry) => entry.order !== null),
      ...byLeader ? { ordersByLeader: true } : {},
      hpLoss: best.hpLoss,
      potionCost: best.potionCost,
      laterDrinks: best.laterDrinks,
      ...best.thieves ? { thieves: best.thieves } : {},
      ...best.thiefCost !== void 0 ? { thiefCost: best.thiefCost, thiefLost: best.thiefLost } : {},
      enemyHpLeft: best.enemyHpLeft,
      leaderHpLeft: best.leaderHpLeft,
      turnsSurvived: best.turnsSurvived,
      turnsToWin: best.turnsToWin,
      deaths: best.deaths,
      turnsToDeath: best.turnsToDeath,
      winProb: best.winProb,
      wins: best.wins,
      ...best.timeUps > 0 ? { timeUps: best.timeUps } : {},
      ...best.revived > 0 ? { revived: best.revived } : {},
      value: best.value,
      valueModelTerminal: best.valueModelTerminal,
      modelForecast: { oneTurn: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 }, rollout: best.modelForecast },
      perTurn: best.perTurn
    };
  });
  return { lines, orders: orders2.filter((order) => order !== null), horizon, samples: samples2, elapsedMs: elapsed(), degraded, budgetNeedMs: budget.need, policyTurns: budget.policyTurns, policyMs: budget.policyMs, policyNodes: budget.policyNodes };
}
var PLAYER_POWERS, eruptionOptions, GIANT_ID, SIPHON_MOVE, GIANT_KILL_TURNS, giantLossCache, gatesCache, DEATH_HP, UNKNOWN_STATUS, ENEMY_SELF_POWERS, STRENGTH_GROWTH_POWERS, PLAYER_DEBUFFS, isPotion, HUSK_HP, POWER_EFFECTS, BOULDER_STEP, REATTACH_TURNS, REATTACH_HP, RAMPART_TARGET, CONSTRICTOR, TEMP_STRENGTH_POWERS, TEMP_DEXTERITY_POWERS, ENEMY_TEMP_STRENGTH_LOSS_POWERS, sumOf, STUNNED_MOVE, MissingStunModel, DEATH_MOVES, deathMoveOptions, PHASE_MOVES, GROWING_HITS, KNOWLEDGE_CURSES, STATUS_INTO_DRAW, PLAIN_DRAW_POTIONS, KNOWN_DRAW_INDEX, LOOKAHEAD_DRAWS, KNOWLEDGE_CURSE_POWERS, MAX_FULL_ORDER_GROUPS, ORDER_FOCUS_BONUS, LEADER_HP_TIE, SCHEDULE, SHORT_HORIZON, ORDER_SCHEDULE;
var init_rollout = __esm({
  "src/reflex/rollout.ts"() {
    "use strict";
    init_continuation_value();
    init_move_model();
    init_draws();
    init_card_model();
    init_boss_clock();
    init_fight_value();
    init_passive_pieces();
    init_potion_mc();
    init_turn_solver();
    init_files();
    PLAYER_POWERS = [
      "STRENGTH_POWER",
      "DEXTERITY_POWER",
      "WEAK_POWER",
      "FRAIL_POWER",
      "VULNERABLE_POWER",
      "DEMON_FORM_POWER",
      "METALLICIZE_POWER",
      "PLATING_POWER",
      "BARRICADE_POWER",
      "FEEL_NO_PAIN_POWER",
      "REGEN_POWER",
      "INTANGIBLE_POWER",
      "BUFFER_POWER",
      "THORNS_POWER",
      "RAGE_POWER",
      "JUGGERNAUT_POWER"
    ];
    eruptionOptions = { blastTerminal: true, deathMoveFilter: true };
    GIANT_ID = "WATERFALL_GIANT";
    SIPHON_MOVE = "SIPHON_MOVE";
    GIANT_KILL_TURNS = 15;
    giantLossCache = /* @__PURE__ */ new Map();
    DEATH_HP = 40;
    UNKNOWN_STATUS = "WOUND";
    ENEMY_SELF_POWERS = ["RITUAL_POWER", "INTANGIBLE_POWER", "THORNS_POWER", "SOAR_POWER", "FLUTTER_POWER", "PERSONAL_HIVE_POWER", "VITAL_SPARK_POWER", "STEAM_ERUPTION_POWER"];
    STRENGTH_GROWTH_POWERS = ["RITUAL_POWER", "TERRITORIAL_POWER", "HIGH_VOLTAGE_POWER"];
    PLAYER_DEBUFFS = [
      "VULNERABLE_POWER",
      "WEAK_POWER",
      "FRAIL_POWER",
      "STRENGTH_POWER",
      "DEXTERITY_POWER",
      // Hunter Killer's Tender (for the fight: Strength and Dexterity -1 a card played), Living Fog's Smoggy (one
      // Skill a turn), Vine Shambler's Tangled (Attacks +1 next turn), the Queen's Chains of Binding (the first 3
      // cards drawn each turn Soulbound), the Shrinker's Shrink (-1: for the fight), the Beast's Ringing (one card
      // next turn), the Knowledge Demon's curses (Sloth, Disintegration, Mind Rot, Waste Away), Constrict.
      "TENDER_POWER",
      "SMOGGY_POWER",
      "TANGLED_POWER",
      "CHAINS_OF_BINDING_POWER",
      "SHRINK_POWER",
      "RINGING_POWER",
      "SLOTH_POWER",
      "DISINTEGRATION_POWER",
      "CONSTRICT_POWER",
      "MIND_ROT_POWER",
      "WASTE_AWAY_POWER"
    ];
    isPotion = (step) => step.cardId.startsWith("POTION:");
    HUSK_HP = 999999999;
    POWER_EFFECTS = {
      DEMON_FORM: { effect: "demonForm", power: "DEMON_FORM_POWER", amount: [3, 4] },
      METALLICIZE: { effect: "endTurnBlock", power: "METALLICIZE_POWER", amount: [3, 4] },
      JUGGERNAUT: { effect: "juggernaut", power: "JUGGERNAUT_POWER", amount: [6, 8] },
      BARRICADE: { effect: "keepsBlock", power: "BARRICADE_POWER", amount: [1, 1] },
      INFERNO: { effect: "inferno", power: "INFERNO_POWER", amount: [6, 9] },
      CRIMSON_MANTLE: { effect: "mantle", power: "CRIMSON_MANTLE_POWER", amount: [7, 10] },
      RUPTURE: { effect: "rupture", power: "RUPTURE_POWER", amount: [1, 2] },
      PYRE: { effect: "pyre", power: "PYRE_POWER", amount: [1, 2] },
      UNMOVABLE: { effect: "unmovable", power: "UNMOVABLE_POWER", amount: [1, 1] },
      ROLLING_BOULDER: { effect: "boulder", power: "ROLLING_BOULDER_POWER", amount: [5, 5] },
      HELLRAISER: { effect: "hellraiser", power: "HELLRAISER_POWER", amount: [1, 1] },
      // 「每当有一张牌被消耗时，抽1张牌」 (DARK_EMBRACE_POWER 1 a copy).
      DARK_EMBRACE: { effect: "darkEmbrace", power: "DARK_EMBRACE_POWER", amount: [1, 1] }
    };
    BOULDER_STEP = 5;
    REATTACH_TURNS = 2;
    REATTACH_HP = 25;
    RAMPART_TARGET = "TURRET_OPERATOR";
    CONSTRICTOR = "SLITHERING_STRANGLER";
    TEMP_STRENGTH_POWERS = ["SETUP_STRIKE_POWER", "FLEX_POTION_POWER", "REPTILE_TRINKET_POWER", "FEEDING_FRENZY_POWER", "COORDINATE_POWER"];
    TEMP_DEXTERITY_POWERS = ["SPEED_POTION_POWER", "ANTICIPATE_POWER"];
    ENEMY_TEMP_STRENGTH_LOSS_POWERS = TEMP_STRENGTH_LOSS_POWERS;
    sumOf = (powers, ids) => ids.reduce((sum, id) => sum + Math.max(0, powers?.[id] ?? 0), 0);
    STUNNED_MOVE = "STUNNED";
    MissingStunModel = class extends Error {
      constructor() {
        super("\u7729\u6655\u540E\u7EE7\u62DB\u5F0F\u6216\u4F24\u5BB3\u6570\u636E\u7F3A\u5931\uFF0C\u540E\u7EED\u9884\u6D4B\u672A\u77E5");
      }
    };
    DEATH_MOVES = {
      WATERFALL_GIANT: ["EXPLODE_MOVE"],
      TEST_SUBJECT: ["RESPAWN_MOVE"],
      DECIMILLIPEDE_SEGMENT_FRONT: ["DEAD_MOVE", "REATTACH_MOVE"],
      DECIMILLIPEDE_SEGMENT_MIDDLE: ["DEAD_MOVE", "REATTACH_MOVE"],
      DECIMILLIPEDE_SEGMENT_BACK: ["DEAD_MOVE", "REATTACH_MOVE"],
      EYE_WITH_TEETH: ["REVIVE_MOVE"]
    };
    deathMoveOptions = { others: true };
    PHASE_MOVES = {
      TEST_SUBJECT: [["BITE_MOVE", "SKULL_BASH_MOVE"], ["MULTI_CLAW_MOVE"], ["PHASE3_LACERATE_MOVE", "BIG_POUNCE", "BURNING_GROWL_MOVE"]]
    };
    GROWING_HITS = { TEST_SUBJECT: "MULTI_CLAW_MOVE" };
    KNOWLEDGE_CURSES = 3;
    STATUS_INTO_DRAW = { LIQUIFY_GROUND_MOVE: 3 };
    PLAIN_DRAW_POTIONS = /* @__PURE__ */ new Set(["SWIFT_POTION", "CLARITY", "CURE_ALL"]);
    KNOWN_DRAW_INDEX = 600;
    LOOKAHEAD_DRAWS = 8;
    KNOWLEDGE_CURSE_POWERS = ["SLOTH_POWER", "MIND_ROT_POWER", "WASTE_AWAY_POWER", "DISINTEGRATION_POWER"];
    MAX_FULL_ORDER_GROUPS = 3;
    ORDER_FOCUS_BONUS = 1.5;
    LEADER_HP_TIE = 5;
    SCHEDULE = [
      { horizon: 5, samples: 8 },
      { horizon: 3, samples: 8 },
      { horizon: 3, samples: 4 },
      { horizon: 3, samples: 2 }
    ];
    SHORT_HORIZON = 3;
    ORDER_SCHEDULE = [
      { horizon: 5, samples: 8 },
      { horizon: 5, samples: 6 },
      { horizon: 5, samples: 4 },
      { horizon: 3, samples: 4 },
      { horizon: 3, samples: 2 }
    ];
  }
});

// src/knowledge/render/data.ts
var KnowledgeLoadError, DEFAULT_KNOWLEDGE_DIR;
var init_data = __esm({
  "src/knowledge/render/data.ts"() {
    "use strict";
    init_boss_clock();
    init_paths();
    init_files();
    init_monster_db();
    KnowledgeLoadError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "KnowledgeLoadError";
      }
    };
    DEFAULT_KNOWLEDGE_DIR = KNOWLEDGE_DIR;
  }
});

// src/knowledge/potion-equivalents.ts
import { existsSync, readFileSync as readFileSync9, statSync as statSync2 } from "node:fs";
import { resolve as resolve2 } from "node:path";
function parsePotionEquivalents(text, path) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new KnowledgeLoadError(`\u836F\u6C34\u6362\u7B97\u8868\u4E0D\u662F\u5408\u6CD5 JSON ${path}: ${error.message}`);
  }
  const fail = (what) => {
    throw new KnowledgeLoadError(`\u836F\u6C34\u6362\u7B97\u8868 ${path} ${what}`);
  };
  if (!isRecord3(parsed)) return fail("\u9876\u5C42\u4E0D\u662F\u5BF9\u8C61");
  const meta = parsed["meta"];
  if (!isRecord3(meta) || typeof meta["generated"] !== "string" || !isNum(meta["min_n"])) fail("\u7F3A\u5C11 meta.generated / meta.min_n");
  const rates = parsed["rates"];
  if (!isRecord3(rates) || Object.keys(rates).length === 0) fail("\u7F3A\u5C11 rates \u6216\u4E3A\u7A7A");
  for (const [asc, acts] of Object.entries(rates)) {
    if (!isRecord3(acts) || Object.keys(acts).length === 0) fail(`rates.${asc} \u4E3A\u7A7A`);
    for (const [act, row] of Object.entries(acts)) {
      for (const field of ["fights", "T", "D", "L", "r", "h", "b", "v_card", "v_energy", "from_asc"]) {
        if (!isRecord3(row) || !isNum(row[field])) fail(`rates.${asc}.${act} \u7F3A\u5C11\u6570\u5B57\u5B57\u6BB5 ${field}`);
      }
    }
  }
  const potions = parsed["potions"];
  if (!isRecord3(potions) || Object.keys(potions).length === 0) fail("\u7F3A\u5C11 potions \u6216\u4E3A\u7A7A");
  for (const [id, entry] of Object.entries(potions)) {
    if (!isRecord3(entry) || typeof entry["name"] !== "string" || !POTION_CATEGORIES.includes(entry["category"]) || !isRecord3(entry["by_asc"]) || !isRecord3(entry["log"])) {
      fail(`potions.${id} \u7F3A\u5C11 name / category / by_asc / log`);
    }
    for (const [asc, acts] of Object.entries(entry["by_asc"])) {
      for (const [act, worth] of Object.entries(isRecord3(acts) ? acts : {})) {
        const ok = isRecord3(worth) && ["hp", "damage", "block", "hold_hp", "n"].every((field) => isNum(worth[field])) && (worth["source"] === "\u516C\u5F0F" || worth["source"] === "\u4F30") && typeof worth["formula"] === "string";
        if (!ok) fail(`potions.${id}.by_asc.${asc}.${act} \u7F3A\u5C11 hp/damage/block/hold_hp/n/source/formula`);
      }
    }
  }
  const gold = meta["gold_hp"];
  if (gold !== void 0 && !goldRatesOk(gold)) delete meta["gold_hp"];
  return parsed;
}
function goldRatesOk(value) {
  if (!isRecord3(value) || !isRecord3(value["price"]) || !isNum(value["price"]["median"]) || value["price"]["median"] <= 0 || !isRecord3(value["by_asc"])) return false;
  return Object.values(value["by_asc"]).every((acts) => isRecord3(acts) && Object.values(acts).every((cell) => isRecord3(cell) && isNum(cell["per_gold"]) && isNum(cell["hold_hp"])));
}
function loadPotionEquivalents(dir = DEFAULT_KNOWLEDGE_DIR) {
  const path = knowledgeFile(resolve2(dir), POTION_EQUIVALENTS_FILE);
  let stamp;
  try {
    const info = statSync2(path);
    stamp = `${info.mtimeMs}:${info.size}`;
  } catch (error) {
    throw new KnowledgeLoadError(`\u836F\u6C34\u6362\u7B97\u8868\u8BFB\u53D6\u5931\u8D25 ${path}: ${error.message}\uFF08\u7528 .cache/logdb-venv/bin/python tools/build-potion-equivalents.py \u751F\u6210\uFF09`);
  }
  const hit = cache.get(path);
  if (hit && hit.stamp === stamp) return hit.file;
  let text;
  try {
    text = readFileSync9(path, "utf8");
  } catch (error) {
    throw new KnowledgeLoadError(`\u836F\u6C34\u6362\u7B97\u8868\u8BFB\u53D6\u5931\u8D25 ${path}: ${error.message}`);
  }
  const file = parsePotionEquivalents(text, path);
  cache.set(path, { stamp, file });
  return file;
}
function loadPotionEquivalentsOrNull(dir = DEFAULT_KNOWLEDGE_DIR) {
  if (knowledgeCharacter() !== DEFAULT_CHARACTER && !existsSync(knowledgeFile(resolve2(dir), POTION_EQUIVALENTS_FILE))) return null;
  return loadPotionEquivalents(dir);
}
function tableAscension(file, ascension) {
  const ascs = Object.keys(file.rates).filter((key) => /^\d+$/.test(key)).map(Number).sort((a, b) => Math.abs(a - ascension) - Math.abs(b - ascension) || a - b);
  return ascs[0] ?? null;
}
function tableAct(act) {
  return !act || act < 1 ? 1 : act > 3 ? 3 : Math.floor(act);
}
function potionEquivalentFrom(file, id, act, ascension) {
  const entry = file.potions[id];
  const asc = tableAscension(file, ascension);
  if (!entry || asc === null) return null;
  const actKey = tableAct(act);
  const worth = entry.by_asc[String(asc)]?.[String(actKey)];
  if (!worth) return null;
  return {
    id,
    name: entry.name,
    category: entry.category,
    act: actKey,
    ascension,
    tableAscension: asc,
    inputsAscension: worth.inputs_asc ?? asc,
    hp: worth.hp,
    damage: worth.damage,
    block: worth.block,
    holdHp: worth.hold_hp,
    source: worth.source,
    n: worth.n,
    formula: worth.formula,
    timingFree: entry.timing_free,
    check: worth.check ?? null,
    mc: worth.mc ?? null
  };
}
function sourceLabel(eq, withAsc = false) {
  const asc = withAsc || eq.tableAscension !== eq.ascension ? `A${eq.tableAscension} ` : "";
  const borrowed = eq.inputsAscension !== eq.tableAscension ? `\uFF08\u8F93\u5165\u501F A${eq.inputsAscension}\uFF09` : "";
  return `${asc}${eq.source} n=${eq.n}${borrowed}`;
}
function worthText(eq) {
  const hp = eq.holdHp;
  const scale = eq.hp !== 0 ? hp / eq.hp : 0;
  return `\u7EA6\u7B49\u4E8E ${round12(hp)} \u8840 / ${round12(eq.damage * scale)} \u4F24\u5BB3 / ${round12(eq.block * scale)} \u683C\u6321`;
}
function heldPotionWorth(potionIds, act, ascension) {
  if (potionIds.length === 0) return {};
  let file;
  try {
    const loaded = loadPotionEquivalentsOrNull(potionWorthSource.dir);
    if (!loaded) return {};
    file = loaded;
  } catch (error) {
    return { potion_worth_error: (error instanceof Error ? error.message : String(error)).slice(0, 160) };
  }
  const lines = potionIds.map((id) => potionEquivalentFrom(file, id, act, ascension)).filter((eq) => eq !== null).map((eq) => `${eq.name}\uFF1A${worthText(eq)}\uFF08\u672C\u5E55 boss\uFF0C${sourceLabel(eq, true)}${eq.timingFree ? "\uFF0C\u4EC0\u4E48\u65F6\u5019\u559D\u90FD\u4E00\u6837" : ""}\uFF09`);
  return lines.length > 0 ? { [POTION_WORTH_KEY]: lines } : {};
}
var POTION_EQUIVALENTS_FILE, POTION_CATEGORIES, isRecord3, isNum, cache, round12, potionWorthSource, POTION_WORTH_KEY;
var init_potion_equivalents = __esm({
  "src/knowledge/potion-equivalents.ts"() {
    "use strict";
    init_potion_values();
    init_data();
    init_files();
    POTION_EQUIVALENTS_FILE = "potion-equivalents.json";
    POTION_CATEGORIES = ["damage", "block", "heal", "strength", "dexterity", "debuff", "energy", "draw", "random", "other"];
    isRecord3 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
    isNum = (value) => typeof value === "number" && Number.isFinite(value);
    cache = /* @__PURE__ */ new Map();
    round12 = (value) => String(Math.round(value * 10) / 10);
    potionWorthSource = { dir: void 0 };
    POTION_WORTH_KEY = "potion_worth_in_act_boss";
  }
});

// src/reflex/potion-cost.ts
function potionCostFrom(file, id, ascension, act, fightKind2, error, reserve) {
  const eq = file ? potionEquivalentFrom(file, id, act, ascension) : null;
  const base = { id, name: eq?.name ?? file?.potions[id]?.name ?? id, holdHp: eq ? eq.holdHp : null, source: eq ? sourceLabel(eq, true) : null };
  if (!potionCostOptions.enabled) return { ...base, hp: 0, zero: "off" };
  const next = reserve?.potionHp[id];
  if (fightKind2 === "boss" && next !== void 0 && Number.isFinite(next) && next >= 0) {
    return { ...base, hp: next, holdHp: next, source: reserve.source, continuation: reserve.source, zero: next > 0 ? null : "worthless" };
  }
  if (!file) return { ...base, hp: 0, zero: "no_table", ...error ? { error } : {} };
  if (!eq) return { ...base, hp: 0, zero: "no_value" };
  if (fightKind2 === "boss") return { ...base, hp: 0, zero: "boss" };
  const hp = Math.max(0, eq.holdHp);
  return { ...base, hp, zero: hp > 0 ? null : "worthless" };
}
function table() {
  try {
    return { file: loadPotionEquivalents(potionWorthSource.dir) };
  } catch (error) {
    return { file: null, error: (error instanceof Error ? error.message : String(error)).slice(0, 160) };
  }
}
function potionCost(id, ascension, act, fightKind2) {
  const { file, error } = table();
  return potionCostFrom(file, id, ascension, act, fightKind2, error);
}
function potionCosts(ids, ascension, act, fightKind2, reserve) {
  const { file, error } = table();
  return new Map([...new Set(ids)].map((id) => [id, potionCostFrom(file, id, ascension, act, fightKind2, error, reserve)]));
}
function potionIdOf(cardId) {
  return cardId.startsWith("POTION:") ? cardId.split(":")[1] ?? null : null;
}
function withPotionCost(card, costs) {
  const id = card.type === "Potion" ? potionIdOf(card.cardId) : null;
  const cost = id ? costs.get(id)?.hp ?? 0 : 0;
  return cost > 0 ? { ...card, potionCost: cost } : card;
}
function potionCostText(cost) {
  switch (cost.zero) {
    case "boss":
      return "0 (boss fight: potions cost nothing here)";
    case "no_value":
      return "0 (no conversion value in the potion table)";
    case "worthless":
      return `0 (held value 0 in the potion table${cost.source ? `, ${cost.source}` : ""})`;
    case "no_table":
      return "0 (the potion table did not load)";
    case "off":
      return "0 (potion cost switched off)";
    default:
      return `${round13(cost.hp)} HP (${cost.source ?? "potion table"})`;
  }
}
function drunkIds(plan) {
  return plan.steps.map((step) => potionIdOf(step.cardId)).filter((id) => id !== null);
}
function nameOf(id, costs, plan) {
  const step = plan?.steps.find((entry) => potionIdOf(entry.cardId) === id);
  return costs.get(id)?.name ?? step?.name.replace(/^potion /, "") ?? id;
}
function potionCostFact(plan, line, costs) {
  const now = drunkIds(plan);
  const later = line ? Object.entries(line.laterDrinks ?? {}).filter(([, n]) => n > 0) : [];
  const samples2 = line?.samples ?? 1;
  const count2 = now.length + later.reduce((sum, [, n]) => sum + n / samples2, 0);
  const each = (id) => `${nameOf(id, costs, plan)} ${shortCost(costs.get(id))}`;
  const parts = [
    ...now.length > 0 ? [`this turn: ${now.map(each).join(", ")}`] : [],
    ...later.length > 0 ? [`later turns: ${later.map(([id, n]) => `${nameOf(id, costs)} in ${n}/${samples2} samples`).join(", ")}`] : []
  ];
  const nowCost = now.reduce((sum, id) => sum + (costs.get(id)?.hp ?? 0), 0);
  const cost = line ? line.potionCost ?? 0 : nowCost;
  const loss = line ? line.hpLoss : plan.outcome.hpLoss;
  const head = !line ? "this turn HP loss (no rollout of the later turns)" : line.horizon > 1 ? "fight HP loss" : "fight HP loss (a rough estimate: no rollout of the later turns)";
  const used = count2 === 0 ? "potions used 0" : `potions used ${round13(count2)} (${parts.join("; ")})`;
  return `${head} ${round13(loss)}; ${used}; potion cost ${round13(cost)} HP (potion table, this act's held value${line && later.length > 0 ? ", later turns' drinks averaged over the samples" : ""}); total ${round13(loss + cost)}`;
}
function shortCost(cost) {
  if (!cost) return "0 (no conversion value)";
  switch (cost.zero) {
    case "boss":
      return "0 (boss fight)";
    case "no_value":
      return "0 (no conversion value)";
    case "worthless":
      return "0 (held value 0)";
    case "no_table":
      return "0 (potion table did not load)";
    case "off":
      return "0 (cost off)";
    default:
      return `${round13(cost.hp)} HP`;
  }
}
var potionCostOptions, round13;
var init_potion_cost = __esm({
  "src/reflex/potion-cost.ts"() {
    "use strict";
    init_potion_equivalents();
    potionCostOptions = { enabled: process.env["POTION_COST"] !== "off" };
    round13 = (value) => Math.round(value * 10) / 10;
  }
});

// src/sim/boss-trust.ts
import { readFileSync as readFileSync10 } from "node:fs";
function bossTrustPath() {
  return knowledgeFile(KNOWLEDGE_DIR, "boss-trust.json");
}
function loadBossTrust(path = bossTrustPath()) {
  try {
    const data = JSON.parse(readFileSync10(path, "utf8"));
    if (knowledgeCharacter() === "silent" && data.character !== "silent") return null;
    if (data.character && data.character !== knowledgeCharacter()) return null;
    return data.low_trust_b2 && data.low_confidence_b3 && data.criteria ? data : null;
  } catch {
    return null;
  }
}
function silentBossCalibration(start) {
  if (knowledgeCharacter() !== "silent") return null;
  const fit = activeTrust?.overall?.[start === "pre" ? "pre" : "t1"]?.platt;
  return fit && Number.isFinite(fit.a) && Number.isFinite(fit.b) && fit.b > 0 && (fit.c === void 0 || Number.isFinite(fit.c)) ? fit : null;
}
function bossTrustReason(key, use, asc, floor) {
  const low = use === "b2" ? LOW_TRUST_B2 : LOW_CONFIDENCE_B3;
  if (knowledgeCharacter() !== "silent") return low[key] ?? null;
  const scope = asc == null ? null : activeTrust?.ascension_low?.[use]?.[String(asc)] ?? (activeTrust?.source?.completed_max_asc !== void 0 && asc > activeTrust.source.completed_max_asc ? `A${asc} \u672C\u8FDB\u9636\u6682\u65E0\u9759\u9ED8\u9A8C\u8BC1\u6837\u672C` : null);
  const stage = floor == null ? null : activeTrust?.stage_low?.[use]?.[String(floor)];
  return [low[key], scope, stage].filter(Boolean).join("; ") || null;
}
function fillTrust() {
  const trust = loadBossTrust();
  activeTrust = trust;
  for (const table2 of [LOW_TRUST_B2, LOW_CONFIDENCE_B3]) for (const key of Object.keys(table2)) delete table2[key];
  Object.assign(
    LOW_TRUST_B2,
    trust ? trust.low_trust_b2 : Object.fromEntries(BOSS_KEYS.map((key) => [key, "the simulator's validation data (src/sim/boss-trust.json) could not be read"]))
  );
  Object.assign(LOW_CONFIDENCE_B3, trust ? trust.low_confidence_b3 : Object.fromEntries(BOSS_KEYS.map((key) => [key, "\u6A21\u62DF\u5668\u7684\u9A8C\u8BC1\u6570\u636E\uFF08src/sim/boss-trust.json\uFF09\u8BFB\u4E0D\u5230"])));
  if (knowledgeCharacter() === "silent") {
    if (!silentBossCalibration("start")) Object.assign(LOW_TRUST_B2, Object.fromEntries(BOSS_KEYS.map((key) => [key, "\u9759\u9ED8\u6574\u4F53\u6821\u51C6\u4E0D\u8DB3"])));
    if (!silentBossCalibration("pre")) Object.assign(LOW_CONFIDENCE_B3, Object.fromEntries(BOSS_KEYS.map((key) => [key, "\u9759\u9ED8\u6574\u4F53\u6821\u51C6\u4E0D\u8DB3"])));
  }
}
var BOSS_KEYS, BOSS_TRUST_PATH, LOW_TRUST_B2, LOW_CONFIDENCE_B3, activeTrust;
var init_boss_trust = __esm({
  "src/sim/boss-trust.ts"() {
    "use strict";
    init_files();
    BOSS_KEYS = [
      "AEONGLASS",
      "CEREMONIAL_BEAST",
      "KAISER_CRAB",
      "KNOWLEDGE_DEMON",
      "LAGAVULIN_MATRIARCH",
      "QUEEN",
      "SOUL_FYSH",
      "TEST_SUBJECT",
      "THE_INSATIABLE",
      "THE_KIN",
      "VANTOM",
      "WATERFALL_GIANT"
    ];
    BOSS_TRUST_PATH = bossTrustPath();
    LOW_TRUST_B2 = {};
    LOW_CONFIDENCE_B3 = {};
    activeTrust = null;
    fillTrust();
    onKnowledgeCharacterChange(fillTrust);
  }
});

// src/sim/boss-sim.ts
function bossPolicyThreat(input) {
  for (const e of input.enemies) {
    const own = BOSS_POLICY_THREAT[e.id];
    if (own !== void 0) return own;
  }
  return 0;
}
function sampleSeed(seed2, i) {
  return Math.imul(seed2 >>> 0, 739982445) + Math.imul(i + 1, 695872825) >>> 0 || 1;
}
function slimInput(input, policyNodes = BOSS_SIM_POLICY_NODES, damageScale2 = BOSS_SIM_DAMAGE_SCALE, hpScale2 = BOSS_SIM_HP_SCALE, threat2 = BOSS_SIM_THREAT, potionHold2 = BOSS_SIM_POTION_HOLD, holdHp = tableHoldHp) {
  const { handSize, drawFirst: drawFirst2 } = input.options ?? {};
  const policyThreat = threat2 + bossPolicyThreat(input);
  const hand = potionHold2 > 0 ? input.solver.hand.map((card) => {
    const id = card.type === "Potion" ? potionIdOf(card.cardId) : null;
    const hold = id ? holdHp(id, input) : null;
    return hold !== null && hold > 0 ? { ...card, potionCost: Math.max(card.potionCost ?? 0, potionHold2 * hold) } : card;
  }) : input.solver.hand;
  return {
    ...input,
    ...input.continuation ? { continuation: { ...input.continuation, variants: input.continuation.variants.map((v) => ({ ...v, input: slimInput(v.input, policyNodes, damageScale2, hpScale2, threat2, potionHold2, holdHp) })) } } : {},
    solver: hand === input.solver.hand ? input.solver : { ...input.solver, hand },
    plans: [],
    model: null,
    gates: null,
    mm: {},
    options: {
      policyNodes,
      ...damageScale2 !== 1 ? { policyDamageScale: damageScale2 } : {},
      ...hpScale2 !== 1 ? { policyHpScale: hpScale2 } : {},
      ...policyThreat !== 0 ? { policyThreat } : {},
      ...BOSS_SIM_LOOKAHEAD.lethal !== 0 || BOSS_SIM_LOOKAHEAD.threat !== 0 ? { policyLookahead: { ...BOSS_SIM_LOOKAHEAD } } : {},
      ...handSize !== void 0 ? { handSize } : {},
      ...drawFirst2 !== void 0 ? { drawFirst: drawFirst2 } : {}
    }
  };
}
function tableHoldHp(potionId, input) {
  return potionCost(potionId, input.meta.asc, input.meta.act, "elite").holdHp;
}
function singleFightSample(input, plan, seed2, maxTurns, scripts2, order) {
  const { records, policyTurns, policyNodes } = simulateFight(input, plan, maxTurns, seed2, scripts2, order);
  const startHp = input.solver.player.hp;
  const lossCap = startHp + (input.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
  const last = records[records.length - 1];
  const won = last?.won === true;
  const died = last?.died === true;
  const timeUp = !won && !died && last?.timeUp === true;
  const lost = records.reduce((sum, r) => sum + r.loss, 0);
  const enemyHpLeft = won || !last ? 0 : last.hpLeft ? Object.values(last.hpLeft).reduce((sum, hp) => sum + hp, 0) : last.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0);
  return {
    won,
    ...last?.resources ? { resources: { ...last.resources, drunkKeys: records.flatMap((r) => r.resources?.drunkKeys ?? []) } } : {},
    died,
    capped: !won && !died && !timeUp,
    timeUp,
    turns: records.length,
    hpLoss: died ? lossCap : Math.min(lossCap, Math.max(0, lost)),
    revived: records.reduce((sum, r) => sum + (r.revived ?? 0), 0),
    drunk: records.flatMap((r) => r.drunk ?? []),
    enemyHpLeft: Math.round(enemyHpLeft * 10) / 10,
    lossByTurn: records.map((r) => Math.round(r.loss * 10) / 10),
    dmgByTurn: records.map((r) => Math.round(r.dmg * 10) / 10),
    incomingByTurn: records.map((r) => r.snap.E.reduce((sum, e) => sum + (e[5] ? e[7] : 0), 0)),
    enemyLossByTurn: records.map((r) => Math.round(r.enemyPart * 10) / 10),
    enemyHpByTurn: records.map((r) => r.hpLeft ? Object.values(r.hpLeft).reduce((sum, hp) => sum + hp, 0) : r.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0)),
    blockByTurn: records.map((r) => Math.round(r.blockGained ?? 0)),
    powers: records.flatMap((r, t) => (r.powers ?? []).map((id) => [t + 1, id])),
    drinks: records.flatMap((r, t) => (r.drunk ?? []).map((id) => [t + 1, id])),
    kills: killsOf(input, records),
    policyTurns,
    policyNodes
  };
}
function continuationInput(input, first, template) {
  if (!input.continuation || !first.won || !first.resources || first.resources.hp <= 0) throw new Error("missing successful first-fight resources");
  const used = new Set(first.resources.drunkKeys);
  let fairies = (input.solver.player.revives ?? []).filter((r) => r.source === "FAIRY_IN_A_BOTTLE").length - first.resources.revives.filter((r) => r.source === "FAIRY_IN_A_BOTTLE").length;
  const remaining = input.continuation.potions.filter((p) => {
    if (used.has(p.key)) return false;
    if (p.id === "FAIRY_IN_A_BOTTLE" && fairies > 0) {
      fairies -= 1;
      return false;
    }
    return true;
  });
  const keys = new Set(remaining.map((p) => p.key));
  const hand = template.solver.hand.filter((p) => p.type !== "Potion" || keys.has(p.cardId));
  const randomPotions = template.randomPotions?.filter((p) => keys.has(`POTION:${p.potionId}:${p.slot}`));
  return { potions: [...keys], input: {
    ...template,
    continuation: void 0,
    solver: { ...template.solver, hand, player: { ...template.solver.player, hp: first.resources.hp, revives: first.resources.revives.slice() }, continuationValue: void 0 },
    piles: { ...template.piles, handBase: hand.map(() => null) },
    potions: keys.size,
    ...randomPotions ? { randomPotions } : {}
  } };
}
function fightSample(input, plan, seed2, maxTurns = BOSS_SIM_MAX_TURNS, scripts2 = true, order = null) {
  const first = singleFightSample(input, plan, seed2, maxTurns, scripts2, order);
  const next = input.continuation;
  if (!next) return first;
  const initial = { firstWon: first.won, firstHp: first.resources?.hp ?? null, firstPotions: [], secondBoss: null, firstTurns: first.turns, secondWon: null, secondDied: null };
  if (!first.won) return { ...first, sequence: initial };
  const total = next.variants.reduce((s, v) => s + v.count, 0);
  if (total <= 0) throw new Error("empty second-boss distribution");
  let position = sampleSeed(seed2, 0) / 4294967296 * total;
  const variant = next.variants.find((v) => (position -= v.count) < 0) ?? next.variants.at(-1);
  const transferred = continuationInput(input, first, variant.input);
  const second = singleFightSample(transferred.input, null, sampleSeed(seed2, 1), maxTurns, scripts2, null);
  return {
    ...second,
    turns: first.turns + second.turns,
    hpLoss: first.hpLoss + second.hpLoss,
    revived: first.revived + second.revived,
    drunk: [...first.drunk, ...second.drunk],
    policyTurns: first.policyTurns + second.policyTurns,
    policyNodes: first.policyNodes + second.policyNodes,
    lossByTurn: [...first.lossByTurn, ...second.lossByTurn],
    dmgByTurn: [...first.dmgByTurn, ...second.dmgByTurn],
    incomingByTurn: [...first.incomingByTurn, ...second.incomingByTurn],
    enemyLossByTurn: [...first.enemyLossByTurn, ...second.enemyLossByTurn],
    enemyHpByTurn: [...first.enemyHpByTurn ?? [], ...second.enemyHpByTurn ?? []],
    blockByTurn: [...first.blockByTurn ?? [], ...second.blockByTurn ?? []],
    powers: [...first.powers ?? [], ...(second.powers ?? []).map(([t, id]) => [t + first.turns, id])],
    drinks: [...first.drinks ?? [], ...(second.drinks ?? []).map(([t, id]) => [t + first.turns, id])],
    kills: [...first.kills ?? [], ...(second.kills ?? []).map(([t, id, index]) => [t + first.turns, id, index])],
    sequence: { ...initial, firstPotions: transferred.potions, secondBoss: variant.boss, secondWon: second.won, secondDied: second.died }
  };
}
function killsOf(input, records) {
  const out = [];
  const alive = new Set(input.solver.enemies.filter((e) => e.hp > 0).map((e) => e.index));
  records.forEach((r, t) => {
    for (const e of r.snap.E) {
      if (alive.has(e[0]) && !e[5]) {
        alive.delete(e[0]);
        out.push([t + 1, e[1], e[0]]);
      }
    }
  });
  return out;
}
function redealInput(input, opts = {}) {
  const s = input.solver;
  const cards = s.hand.map((card, i) => [card, input.piles.handBase[i] ?? null]).filter(([card]) => card.type !== "Potion");
  const back = cards.map(([card, base]) => base ?? card);
  const potions = s.hand.filter((card) => card.type === "Potion");
  const hp = opts.hp !== void 0 ? Math.max(1, Math.min(s.player.maxHp, opts.hp)) : s.player.hp;
  return {
    ...input,
    solver: { ...s, hand: potions, cardsPlayedThisTurn: 0, player: { ...s.player, hp } },
    plans: [],
    piles: {
      draw: opts.fresh ? [...input.piles.draw, ...input.piles.discard, ...back] : [...input.piles.draw, ...back],
      discard: opts.fresh ? [] : input.piles.discard.slice(),
      handBase: potions.map(() => null)
    },
    options: { ...input.options, drawFirst: cards.length }
  };
}
function quantile(sorted, q) {
  if (sorted.length === 0) return NaN;
  const at2 = (sorted.length - 1) * q;
  const lo = Math.floor(at2);
  const hi = Math.ceil(at2);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at2 - lo);
}
function dist(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const r = (x) => Math.round(x * 100) / 100;
  return {
    mean: r(sorted.reduce((sum, x) => sum + x, 0) / Math.max(1, sorted.length)),
    median: r(quantile(sorted, 0.5)),
    p25: r(quantile(sorted, 0.25)),
    p75: r(quantile(sorted, 0.75)),
    p90: r(quantile(sorted, 0.9)),
    min: sorted[0] ?? NaN,
    max: sorted[sorted.length - 1] ?? NaN
  };
}
function perTurnOf(outcomes) {
  const longest = Math.max(0, ...outcomes.map((o) => o.turns));
  const r1 = (x) => Math.round(x * 10) / 10;
  const out = [];
  for (let t = 1; t <= longest; t += 1) {
    const fighting = outcomes.filter((o) => o.turns >= t);
    out.push({
      turn: t,
      fighting: fighting.length,
      loss: r1(fighting.reduce((sum, o) => sum + (o.lossByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      dmg: r1(fighting.reduce((sum, o) => sum + (o.dmgByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      incoming: r1(fighting.reduce((sum, o) => sum + (o.incomingByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      enemyLoss: r1(fighting.reduce((sum, o) => sum + (o.enemyLossByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      alive: outcomes.filter((o) => !(o.died && o.turns <= t)).length,
      won: outcomes.filter((o) => o.won && o.turns <= t).length
    });
  }
  return out;
}
function summarizeLine(line, outcomes) {
  const won = outcomes.filter((o) => o.won);
  const dead = outcomes.filter((o) => o.died);
  const deathTurns = {};
  for (const o of dead) deathTurns[o.turns] = (deathTurns[o.turns] ?? 0) + 1;
  const potions = {};
  for (const o of outcomes) for (const id of new Set(o.drunk)) potions[id] = (potions[id] ?? 0) + 1;
  const unwon = outcomes.filter((o) => !o.won);
  return {
    line,
    ...outcomes.some((o) => o.sequence) ? { sequence: {
      firstWins: outcomes.filter((o) => o.sequence?.firstWon).length,
      firstWinSecondDeaths: outcomes.filter((o) => o.sequence?.firstWon && o.sequence.secondDied).length,
      secondUnfinished: outcomes.filter((o) => o.sequence?.firstWon && !o.won && !o.died).length
    } } : {},
    samples: outcomes.length,
    wins: won.length,
    deaths: dead.length,
    capped: outcomes.filter((o) => o.capped).length,
    timeUps: outcomes.filter((o) => o.timeUp).length,
    winProb: outcomes.length > 0 ? won.length / outcomes.length : 0,
    hpLoss: dist(outcomes.map((o) => o.hpLoss)),
    hpLossWon: won.length > 0 ? dist(won.map((o) => o.hpLoss)) : null,
    turns: dist(outcomes.map((o) => o.turns)),
    turnsWon: won.length > 0 ? dist(won.map((o) => o.turns)) : null,
    deathTurns,
    deathTurn: dead.length > 0 ? dist(dead.map((o) => o.turns)) : null,
    potions,
    enemyHpLeftUnwon: unwon.length > 0 ? Math.round(unwon.reduce((sum, o) => sum + o.enemyHpLeft, 0) / unwon.length * 10) / 10 : null,
    perTurn: perTurnOf(outcomes),
    policyTurns: outcomes.reduce((sum, o) => sum + o.policyTurns, 0),
    policyNodes: outcomes.reduce((sum, o) => sum + o.policyNodes, 0),
    outcomes
  };
}
function calibratedWinProb(winProb, samples2, start, asc = 0) {
  const eps = 0.5 / (samples2 + 1);
  const p = Math.min(1 - eps, Math.max(eps, winProb));
  const silent = knowledgeCharacter() === "silent";
  const fit = silent ? silentBossCalibration(start) : BOSS_SIM_PLATT[start];
  if (!fit) return winProb;
  const { a, b } = fit;
  const base = a + b * Math.log(p / (1 - p));
  const z = Math.max(-30, Math.min(30, silent ? base + (fit.c ?? 0) * (asc - 5) / 5 : base));
  return 1 / (1 + Math.exp(-z));
}
function compareLines(a, b) {
  const n = Math.min(a.outcomes.length, b.outcomes.length);
  const paired = (f) => {
    const d = Array.from({ length: n }, (_, i) => f(a.outcomes[i]) - f(b.outcomes[i]));
    const mean = d.reduce((sum, x) => sum + x, 0) / Math.max(1, n);
    const variance = n > 1 ? d.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1) : 0;
    return { mean, se: Math.sqrt(variance / Math.max(1, n)) };
  };
  const win = paired((o) => o.won ? 1 : 0);
  const loss = paired((o) => o.hpLoss);
  const r = (x) => Math.round(x * 1e4) / 1e4;
  let onlyA = 0;
  let onlyB = 0;
  for (let i = 0; i < n; i += 1) {
    if (a.outcomes[i].won && !b.outcomes[i].won) onlyA += 1;
    if (b.outcomes[i].won && !a.outcomes[i].won) onlyB += 1;
  }
  return { samples: n, winDiff: r(win.mean), winSe: r(win.se), hpLossDiff: r(loss.mean), hpLossSe: r(loss.se), onlyA, onlyB };
}
function settings(opts) {
  return {
    samples: Math.max(1, Math.floor(opts.samples ?? BOSS_SIM_SAMPLES)),
    seed: opts.seed ?? BOSS_SIM_SEED,
    maxTurns: Math.max(1, Math.floor(opts.maxTurns ?? BOSS_SIM_MAX_TURNS)),
    policyNodes: opts.policyNodes ?? BOSS_SIM_POLICY_NODES,
    scripts: opts.scripts ?? true,
    damageScale: opts.damageScale ?? BOSS_SIM_DAMAGE_SCALE,
    hpScale: opts.hpScale ?? BOSS_SIM_HP_SCALE,
    threat: opts.threat ?? BOSS_SIM_THREAT,
    potionHold: opts.potionHold ?? BOSS_SIM_POTION_HOLD,
    holdHp: opts.holdHp ?? tableHoldHp,
    order: opts.order ?? null
  };
}
function runBossSim(input, lines, opts = {}) {
  const started = performance.now();
  const s = settings(opts);
  const slim = slimInput(input, s.policyNodes, s.damageScale, s.hpScale, s.threat, s.potionHold, s.holdHp);
  const out = lines.map((plan, line) => summarizeLine(line, Array.from({ length: s.samples }, (_, i) => fightSample(slim, plan, sampleSeed(s.seed, i), s.maxTurns, s.scripts, s.order))));
  return { lines: out, samples: s.samples, maxTurns: s.maxTurns, seed: s.seed, policyNodes: s.policyNodes, scripts: s.scripts, damageScale: s.damageScale, hpScale: s.hpScale, threat: s.threat, potionHold: s.potionHold, workers: 0, elapsedMs: Math.round(performance.now() - started) };
}
function fightOrders(input) {
  const groups = [];
  for (const e of input.solver.enemies) {
    if (e.hp <= 0 || e.maxHp >= 1e6) continue;
    const id = input.enemies.find((x) => x.index === e.index)?.id ?? e.name;
    const group = groups.find((g) => g.id === id);
    if (group) {
      group.indices.push(e.index);
      group.hp += e.hp;
    } else groups.push({ id, name: e.name, indices: [e.index], hp: e.hp });
  }
  const minion = (g) => g.indices.every((i) => (input.enemies.find((x) => x.index === i)?.powers?.["MINION_POWER"] ?? 0) > 0);
  if (groups.length >= 2 && groups.filter((g) => !minion(g)).length === 1) {
    for (const g of groups) if (!minion(g)) g.leader = true;
  }
  return killOrders(groups).orders;
}
async function runBestOrder(run, input, lines, opts = {}, orders2 = fightOrders(input)) {
  const byOrder = [];
  for (const order of [null, ...orders2]) byOrder.push({ order: order?.label ?? null, result: await run(input, lines, { ...opts, order }) });
  const best = lines.map((_, i) => {
    let pick2 = byOrder[0];
    for (const one2 of byOrder.slice(1)) {
      const a = one2.result.lines[i];
      const b = pick2.result.lines[i];
      if (a.winProb > b.winProb || a.winProb === b.winProb && a.hpLoss.mean < b.hpLoss.mean) pick2 = one2;
    }
    return { ...pick2.result.lines[i], order: pick2.order };
  });
  return { lines: best, byOrder };
}
var BOSS_SIM_MAX_TURNS, BOSS_SIM_POLICY_NODES, BOSS_SIM_SAMPLES, BOSS_SIM_SEED, BOSS_SIM_DAMAGE_SCALE, BOSS_SIM_HP_SCALE, BOSS_SIM_THREAT, BOSS_POLICY_THREAT, BOSS_SIM_LOOKAHEAD, BOSS_SIM_POTION_HOLD, BOSS_SIM_MAX_WORKERS, BOSS_SIM_PLATT;
var init_boss_sim = __esm({
  "src/sim/boss-sim.ts"() {
    "use strict";
    init_rollout();
    init_potion_cost();
    init_files();
    init_boss_trust();
    BOSS_SIM_MAX_TURNS = 30;
    BOSS_SIM_POLICY_NODES = 1500;
    BOSS_SIM_SAMPLES = 100;
    BOSS_SIM_SEED = 1;
    BOSS_SIM_DAMAGE_SCALE = 0.5;
    BOSS_SIM_HP_SCALE = 1;
    BOSS_SIM_THREAT = 0;
    BOSS_POLICY_THREAT = {};
    BOSS_SIM_LOOKAHEAD = { lethal: 1, threat: 1 };
    BOSS_SIM_POTION_HOLD = 0.5;
    BOSS_SIM_MAX_WORKERS = 24;
    BOSS_SIM_PLATT = {
      // Refitted after B5 (the Kaiser Crab's faced hit, the policy's one-turn lookahead; docs/boss-sim.md §14) on the same tune
      // fights. B4's (the Insatiable's Sandpit, the Knowledge Demon's three curses): start (0.7875, 0.5587), mid (0.5682,
      // 0.8221), pre (0.7573, 0.5783); with the Crab's and the Queen's fixes (branch v4-sim-crabqueen): start (0.6695, 0.602),
      // mid (0.4478, 0.8537), pre (0.6425, 0.6369). B2's: start (0.5534, 0.5036), mid (0.5624, 0.8224), pre (0.5236, 0.5219);
      // B1.5's: start (0.7295, 0.498), mid (0.7482, 0.8635), pre (0.7084, 0.5189).
      start: { a: 0.7496, b: 0.5992 },
      mid: { a: 0.6491, b: 0.8506 },
      pre: { a: 0.7007, b: 0.6174 }
    };
  }
});

// src/core/config.ts
import { accessSync, constants as fsConstants, readFileSync as readFileSync11, statSync as statSync3 } from "node:fs";
import { delimiter, dirname as dirname2, isAbsolute as isAbsolute2, join as join3 } from "node:path";
function parseEngine(raw, field, problems) {
  const value = raw.toLowerCase();
  if (ENGINES.includes(value)) return value;
  problems.push({ field, message: `expected one of ${ENGINES.join(", ")}, got "${raw}"` });
  return null;
}
function parseOnOff(raw, field, problems) {
  if (raw === null) return null;
  const value = raw.toLowerCase();
  if (["on", "true", "1", "yes"].includes(value)) return true;
  if (["off", "false", "0", "no"].includes(value)) return false;
  problems.push({ field, message: `expected on or off, got "${raw}"` });
  return null;
}
function isExecutableFile(path) {
  try {
    if (!statSync3(path).isFile()) return false;
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}
function resolveClaudeBin(env) {
  const set2 = readEnv(env, "BRAIN_CLAUDE_BIN");
  if (set2 !== null) return set2;
  for (const dir of (env["PATH"] ?? "").split(delimiter)) {
    if (!dir || !isAbsolute2(dir)) continue;
    const candidate = join3(dir, "claude");
    if (isExecutableFile(candidate)) return candidate;
  }
  const home = env["HOME"];
  if (home && isAbsolute2(home)) {
    const installed = join3(home, ".local", "bin", "claude");
    if (isExecutableFile(installed)) return installed;
  }
  return "claude";
}
function resolveCodexBin(env) {
  const set2 = readEnv(env, "BRAIN_CODEX_BIN");
  if (set2 !== null) return set2;
  for (const dir of (env["PATH"] ?? "").split(delimiter)) {
    if (!dir || !isAbsolute2(dir)) continue;
    const candidate = join3(dir, "codex");
    if (isExecutableFile(candidate)) return candidate;
  }
  const home = env["HOME"];
  if (home && isAbsolute2(home)) {
    const installed = join3(home, ".local", "node", "bin", "codex");
    if (isExecutableFile(installed)) return installed;
  }
  return "codex";
}
function resolveCodexHome(env) {
  return readEnv(env, "BRAIN_CODEX_HOME") ?? readEnv(env, "CODEX_HOME") ?? join3(env["HOME"] ?? "", ".codex");
}
function maxCallsOf(env, name, problems) {
  if (name === "deepseek") return null;
  const field = `BRAIN_${name.toUpperCase()}_MAX_CALLS`;
  const raw = readEnv(env, field);
  if (raw === null) return name === "claude" ? DEFAULT_CLAUDE_MAX_CALLS : null;
  if (["off", "none"].includes(raw.toLowerCase())) return null;
  return parseInteger(raw, field, problems, { min: 0, max: 1e6 });
}
function readBrainConfig(env, problems) {
  const engine = parseEngine(readEnv(env, "BRAIN_ENGINE") ?? "deepseek", "BRAIN_ENGINE", problems) ?? "deepseek";
  const byPrefix = {};
  for (const key of Object.keys(env).sort()) {
    const m = /^BRAIN_ENGINE_([A-Z0-9_]+)$/.exec(key);
    const raw = readEnv(env, key);
    if (!m || raw === null) continue;
    const name = parseEngine(raw, key, problems);
    if (name) byPrefix[m[1]] = name;
  }
  const fallbackRaw = readEnv(env, "BRAIN_FALLBACK");
  const fallback = fallbackRaw === null || fallbackRaw.toLowerCase() === "none" ? null : parseEngine(fallbackRaw, "BRAIN_FALLBACK", problems);
  const engines = {};
  for (const name of ENGINES) {
    const upper = name.toUpperCase();
    const timeoutRaw = readEnv(env, `BRAIN_${upper}_TIMEOUT_MS`);
    const effortRaw = readEnv(env, `BRAIN_${upper}_EFFORT`);
    let effort = name === "codex" ? DEFAULT_CODEX_EFFORT : null;
    if (effortRaw !== null) {
      if (EFFORTS.includes(effortRaw.toLowerCase())) effort = effortRaw.toLowerCase();
      else problems.push({ field: `BRAIN_${upper}_EFFORT`, message: `expected one of ${EFFORTS.join(", ")}, got "${effortRaw}"` });
    }
    const defaultTimeout = name === "deepseek" ? null : name === "claude" ? DEFAULT_CLAUDE_TIMEOUT_MS : name === "codex" ? DEFAULT_CODEX_TIMEOUT_MS : 3e5;
    const modelByPrefix = {};
    for (const key of Object.keys(env).sort()) {
      const m = new RegExp(`^BRAIN_${upper}_MODEL_([A-Z0-9_]+)$`).exec(key);
      const raw = readEnv(env, key);
      if (m && raw !== null) modelByPrefix[m[1]] = raw;
    }
    engines[name] = {
      model: readEnv(env, `BRAIN_${upper}_MODEL`) ?? (name === "claude" ? DEFAULT_CLAUDE_MODEL : name === "codex" ? DEFAULT_CODEX_MODEL : null),
      modelByPrefix,
      timeoutMs: timeoutRaw === null ? defaultTimeout : parseInteger(timeoutRaw, `BRAIN_${upper}_TIMEOUT_MS`, problems, { min: 1e3, max: 36e5 }),
      effort,
      reask: parseOnOff(readEnv(env, `BRAIN_${upper}_REASK`), `BRAIN_${upper}_REASK`, problems),
      tools: parseOnOff(readEnv(env, `BRAIN_${upper}_TOOLS`), `BRAIN_${upper}_TOOLS`, problems),
      maxCalls: maxCallsOf(env, name, problems)
    };
  }
  const budgetRaw = readEnv(env, "BRAIN_CLAUDE_MAX_BUDGET_USD");
  const maxBudgetUsd = budgetRaw === null ? null : Number(budgetRaw);
  if (maxBudgetUsd !== null && !(Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0)) problems.push({ field: "BRAIN_CLAUDE_MAX_BUDGET_USD", message: `expected a positive number, got "${budgetRaw}"` });
  const log = readEnv(env, "BRAIN_LOG");
  const schemaRaw = (readEnv(env, "BRAIN_CLAUDE_SCHEMA") ?? "kind").toLowerCase();
  if (schemaRaw !== "kind" && schemaRaw !== "question") problems.push({ field: "BRAIN_CLAUDE_SCHEMA", message: `expected kind or question, got "${schemaRaw}"` });
  const schemaMode = schemaRaw === "question" ? "question" : "kind";
  const summaryRaw = (readEnv(env, "BRAIN_CODEX_SUMMARY") ?? "auto").toLowerCase();
  if (!["auto", "concise", "detailed", "none"].includes(summaryRaw)) problems.push({ field: "BRAIN_CODEX_SUMMARY", message: `expected auto, concise, detailed or none, got "${summaryRaw}"` });
  const stallRaw = readEnv(env, "BRAIN_CODEX_STALL_MS");
  const stallMs = stallRaw === null ? DEFAULT_CODEX_STALL_MS : ["off", "none", "0"].includes(stallRaw.toLowerCase()) ? null : parseInteger(stallRaw, "BRAIN_CODEX_STALL_MS", problems, { min: 1e3, max: 36e5 });
  const maxAnswerRaw = readEnv(env, "BRAIN_CODEX_MAX_ANSWER_CHARS");
  const maxAnswerChars = maxAnswerRaw === null ? 2e3 : ["off", "none", "0"].includes(maxAnswerRaw.toLowerCase()) ? null : parseInteger(maxAnswerRaw, "BRAIN_CODEX_MAX_ANSWER_CHARS", problems, { min: 200, max: 1e6 });
  const blanksRaw = readEnv(env, "BRAIN_CODEX_MAX_ANSWER_BLANKS");
  const maxAnswerBlanks = blanksRaw === null ? DEFAULT_CODEX_MAX_ANSWER_BLANKS : ["off", "none", "0"].includes(blanksRaw.toLowerCase()) ? null : parseInteger(blanksRaw, "BRAIN_CODEX_MAX_ANSWER_BLANKS", problems, { min: 20, max: 1e6 });
  const schemaFieldsRaw = (readEnv(env, "BRAIN_CODEX_SCHEMA_FIELDS") ?? DEFAULT_CODEX_SCHEMA_FIELDS).toLowerCase();
  if (schemaFieldsRaw !== "all" && schemaFieldsRaw !== "used") problems.push({ field: "BRAIN_CODEX_SCHEMA_FIELDS", message: `expected all or used, got "${schemaFieldsRaw}"` });
  const reasonLast = parseOnOff(readEnv(env, "BRAIN_CODEX_REASON_LAST"), "BRAIN_CODEX_REASON_LAST", problems) ?? DEFAULT_CODEX_REASON_LAST;
  const acceptCut = parseOnOff(readEnv(env, "BRAIN_CODEX_ACCEPT_CUT"), "BRAIN_CODEX_ACCEPT_CUT", problems) ?? DEFAULT_CODEX_ACCEPT_CUT;
  const routePattern = parseOnOff(readEnv(env, "BRAIN_CODEX_ROUTE_PATTERN"), "BRAIN_CODEX_ROUTE_PATTERN", problems) ?? DEFAULT_CODEX_ROUTE_PATTERN;
  const routeReasonRaw = (readEnv(env, "BRAIN_CODEX_ROUTE_REASON") ?? "drop").toLowerCase();
  if (routeReasonRaw !== "drop" && routeReasonRaw !== "keep") problems.push({ field: "BRAIN_CODEX_ROUTE_REASON", message: `expected drop or keep, got "${routeReasonRaw}"` });
  const fieldRaw = readEnv(env, "BRAIN_CODEX_MAX_FIELD_CHARS");
  const maxFieldChars = fieldRaw === null ? 600 : ["off", "none", "0"].includes(fieldRaw.toLowerCase()) ? null : parseInteger(fieldRaw, "BRAIN_CODEX_MAX_FIELD_CHARS", problems, { min: 100, max: 1e5 });
  const modeRaw = (readEnv(env, "BRAIN_CODEX_MODE") ?? "exec").toLowerCase();
  if (modeRaw !== "exec" && modeRaw !== "session") problems.push({ field: "BRAIN_CODEX_MODE", message: `expected exec or session, got "${modeRaw}"` });
  const firstRaw = readEnv(env, "BRAIN_CODEX_FIRST_TOKEN_MS");
  const firstTokenMs = firstRaw === null || ["off", "none", "0"].includes(firstRaw.toLowerCase()) ? null : parseInteger(firstRaw, "BRAIN_CODEX_FIRST_TOKEN_MS", problems, { min: 1e3, max: 36e5 });
  const stallRetriesRaw = readEnv(env, "BRAIN_CODEX_STALL_RETRIES");
  const stallRetries = stallRetriesRaw === null ? 1 : parseInteger(stallRetriesRaw, "BRAIN_CODEX_STALL_RETRIES", problems, { min: 0, max: 5 });
  const usageInt = (field, fallback2, range) => {
    const raw = readEnv(env, field);
    return raw === null ? fallback2 : parseInteger(raw, field, problems, range);
  };
  const codexUsage = {
    stopPct: usageInt("BRAIN_CODEX_USAGE_STOP_PCT", DEFAULT_CODEX_USAGE_STOP_PCT, { min: 1, max: 100 }),
    everyCalls: usageInt("BRAIN_CODEX_USAGE_EVERY_CALLS", DEFAULT_CODEX_USAGE_EVERY_CALLS, { min: 1, max: 1e3 }),
    everyMin: usageInt("BRAIN_CODEX_USAGE_EVERY_MIN", DEFAULT_CODEX_USAGE_EVERY_MIN, { min: 1, max: 1440 }),
    required: parseOnOff(readEnv(env, "BRAIN_CODEX_USAGE_REQUIRED"), "BRAIN_CODEX_USAGE_REQUIRED", problems) ?? false
  };
  const prefixRaw = (readEnv(env, "KNOWLEDGE_PREFIX") ?? "off").toLowerCase();
  if (prefixRaw !== "off" && prefixRaw !== "full") problems.push({ field: "KNOWLEDGE_PREFIX", message: `expected off or full, got "${prefixRaw}"` });
  const knowledgePrefix = prefixRaw === "full" ? "full" : "off";
  return {
    engine,
    byPrefix,
    fallback,
    reask: parseOnOff(readEnv(env, "BRAIN_REASK"), "BRAIN_REASK", problems),
    tools: parseOnOff(readEnv(env, "BRAIN_TOOLS"), "BRAIN_TOOLS", problems),
    // BRAIN_LOG=off (or "-") disables the log.
    log: log === null ? null : log === "off" || log === "-" ? "" : fromRoot(log),
    engines,
    knowledgePrefix,
    claude: {
      bin: resolveClaudeBin(env),
      schema: schemaMode,
      maxBudgetUsd: maxBudgetUsd !== null && Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0 ? maxBudgetUsd : null
    },
    codex: {
      bin: resolveCodexBin(env),
      home: resolveCodexHome(env),
      summary: ["auto", "concise", "detailed", "none"].includes(summaryRaw) ? summaryRaw : "auto",
      serviceTier: CODEX_SERVICE_TIER,
      stallMs,
      firstTokenMs,
      mode: modeRaw === "session" ? "session" : "exec",
      maxAnswerChars,
      maxAnswerBlanks,
      routeReason: routeReasonRaw === "keep" ? "keep" : "drop",
      schemaFields: schemaFieldsRaw === "used" ? "used" : "all",
      reasonLast,
      acceptCut,
      routePattern,
      maxFieldChars,
      stallRetries: stallRetries ?? 1,
      usage: codexUsage
    }
  };
}
function readEnv(env, key) {
  const raw = env[key];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function parseCount(raw, field, problems) {
  const match = /^(\d+(?:\.\d+)?)\s*([kKmMbB])?$/.exec(raw.trim());
  if (!match) {
    problems.push({ field, message: `expected a number, optionally with a K/M/B suffix, got "${raw}"` });
    return 0;
  }
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ""] ?? 1;
  return Number(match[1]) * scale;
}
function parseInteger(raw, field, problems, range) {
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    problems.push({ field, message: `expected an integer, got "${raw}"` });
    return range.min;
  }
  if (value < range.min || value > range.max) {
    problems.push({ field, message: `expected ${range.min}..${range.max}, got ${value}` });
    return range.min;
  }
  return value;
}
function parseRatio(raw, field, problems) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    problems.push({ field, message: `expected a number in 0..1, got "${raw}"` });
    return 0;
  }
  return value;
}
function parseBoolean(raw, field, problems) {
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  problems.push({ field, message: `expected true/false, got "${raw}"` });
  return false;
}
function parsePortRange(raw, field, problems) {
  const text = raw.trim();
  if (!text.includes("-")) {
    const port = parseInteger(text, field, problems, { min: 1, max: 65535 });
    return { from: port, to: port };
  }
  const bounds = text.split("-", 2);
  const from = parseInteger((bounds[0] ?? "").trim(), field, problems, { min: 1, max: 65535 });
  const to = parseInteger((bounds[1] ?? "").trim(), field, problems, { min: 1, max: 65535 });
  if (from > to) {
    problems.push({ field, message: `range start ${from} is greater than end ${to}` });
    return { from: to, to: from };
  }
  return { from, to };
}
function parseUrl(raw, field, problems) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      problems.push({ field, message: `expected an http(s) URL, got "${raw}"` });
    }
    return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
  } catch {
    problems.push({ field, message: `not a valid URL: "${raw}"` });
    return raw;
  }
}
function pick(overrides, env, key, envKey) {
  const override = overrides[key];
  if (typeof override === "string" && override.trim().length > 0) return override.trim();
  return readEnv(env, envKey);
}
function loadConfig(env = process.env, overrides = {}) {
  const problems = [];
  const warnings = [];
  const baseUrl = parseUrl(
    pick(overrides, env, "sts2BaseUrl", "STS2_BASE_URL") ?? DEFAULTS.sts2BaseUrl,
    "STS2_BASE_URL",
    problems
  );
  const portScan = parsePortRange(readEnv(env, "STS2_PORT_SCAN") ?? DEFAULTS.sts2PortScan, "STS2_PORT_SCAN", problems);
  const sts2TimeoutMs = parseInteger(
    readEnv(env, "STS2_TIMEOUT_MS") ?? String(DEFAULTS.sts2TimeoutMs),
    "STS2_TIMEOUT_MS",
    problems,
    { min: 250, max: 12e4 }
  );
  const jevApiKey = pick(overrides, env, "jevApiKey", "TYPESAFE_API_KEY");
  const jevBaseUrlRaw = readEnv(env, "TYPESAFE_BASE_URL");
  const jevBaseUrl = jevBaseUrlRaw ? parseUrl(jevBaseUrlRaw, "TYPESAFE_BASE_URL", problems) : null;
  const jevModel = pick(overrides, env, "jevModel", "JEV_MODEL") ?? DEFAULTS.jevModel;
  const modesRaw = (pick(overrides, env, "mode", "MODE") ?? DEFAULTS.mode).toLowerCase();
  if (!MODES.includes(modesRaw)) {
    problems.push({ field: "MODE", message: `expected one of ${MODES.join(", ")}, got "${modesRaw}"` });
  }
  const mode3 = MODES.includes(modesRaw) ? modesRaw : DEFAULTS.mode;
  const runStartRaw = (readEnv(env, "RUN_START") ?? DEFAULTS.runStart).toLowerCase();
  if (!RUN_STARTS.includes(runStartRaw)) {
    problems.push({ field: "RUN_START", message: `expected one of ${RUN_STARTS.join(", ")}, got "${runStartRaw}"` });
  }
  const runStart = RUN_STARTS.includes(runStartRaw) ? runStartRaw : DEFAULTS.runStart;
  const character2 = readEnv(env, "CHARACTER");
  const characterId = character2 === null ? DEFAULT_CHARACTER : characterKey(character2);
  if (characterId === null) {
    problems.push({ field: "CHARACTER", message: `expected a character id such as IRONCLAD or SILENT, got "${character2}"` });
  }
  const shopDiscardPotions = (readEnv(env, "SHOP_DISCARD_POTIONS") ?? DEFAULTS.shopDiscardPotions).split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  const allowFtueModals = parseBoolean(
    readEnv(env, "ALLOW_FTUE_MODALS") ?? String(DEFAULTS.allowFtueModals),
    "ALLOW_FTUE_MODALS",
    problems
  );
  const strictJev = overrides.allowFallback === true ? false : parseBoolean(readEnv(env, "STRICT_JEV") ?? String(DEFAULTS.strictJev), "STRICT_JEV", problems);
  let deepseekKey = readEnv(env, "DEEPSEEK_API_KEY") ?? "";
  const deepseekKeyFile = readEnv(env, "DEEPSEEK_API_KEY_FILE");
  if (!deepseekKey && deepseekKeyFile) {
    try {
      deepseekKey = readFileSync11(fromRoot(deepseekKeyFile.replace(/^~(?=\/)/, process.env["HOME"] ?? "~")), "utf8").trim();
    } catch {
      problems.push({ field: "DEEPSEEK_API_KEY_FILE", message: "could not read the key file" });
    }
  }
  const deepseek = deepseekKey ? {
    apiKey: deepseekKey,
    baseUrl: readEnv(env, "DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com",
    model: readEnv(env, "DEEPSEEK_MODEL") ?? "deepseek-chat",
    // BUILD_DECIDER=deepseek: ~25 (act-1 death) to ~80 (full run) build/route/rest questions a run,
    // plus run plans; 300 leaves room for restarts within a run.
    maxCalls: Number(readEnv(env, "DEEPSEEK_MAX_CALLS") ?? "300") || 300,
    timeoutMs: Number(readEnv(env, "DEEPSEEK_TIMEOUT_MS") ?? "30000") || 3e4,
    // The played character's own guide and handbook (a character without them has none: llm/deepseek.ts reads them optionally).
    guideFile: fromRoot(readEnv(env, "DEEPSEEK_GUIDE_FILE") ?? knowledgeFile(KNOWLEDGE_DIR, `${characterId ?? DEFAULT_CHARACTER}-guide.md`, characterId ?? DEFAULT_CHARACTER)),
    handbookFile: fromRoot(readEnv(env, "DEEPSEEK_HANDBOOK_FILE") ?? knowledgeFile(KNOWLEDGE_DIR, "ds-handbook.md", characterId ?? DEFAULT_CHARACTER)),
    reasoningEffort: readEnv(env, "DEEPSEEK_REASONING_EFFORT") ?? "off",
    combatReasoningEffort: readEnv(env, "DEEPSEEK_COMBAT_REASONING_EFFORT") ?? "",
    // Per-label tiers, "label-prefix=effort,…"; unset = DEFAULT_EFFORT_BY_LABEL (llm/deepseek.ts); "-" = none.
    ...readEnv(env, "DEEPSEEK_EFFORT_BY_LABEL") === null ? {} : { effortByLabel: readEnv(env, "DEEPSEEK_EFFORT_BY_LABEL") },
    reasoningLog: fromRoot(readEnv(env, "DEEPSEEK_REASONING_LOG") ?? "logs/deepseek-reasoning.jsonl"),
    // The day's guide/handbook with their data facts filled (llm/deepseek.ts frozenGuideFacts); "" = fill at every start.
    factsSnapshotDir: fromRoot(readEnv(env, "DEEPSEEK_FACTS_SNAPSHOT_DIR") ?? "logs/guide-facts")
  } : null;
  const chainRaw = (readEnv(env, "ESCALATION_CHAIN") ?? "claude,deepseek").toLowerCase();
  const escalation = {
    chain: chainRaw.split(",").map((entry) => entry.trim()).filter((entry) => entry === "claude" || entry === "deepseek"),
    claudeDir: fromRoot(readEnv(env, "CLAUDE_ESCALATION_DIR") ?? "./logs/escalation"),
    claudeTimeoutMs: Number(readEnv(env, "CLAUDE_ESCALATION_TIMEOUT_MS") ?? "90000") || 9e4,
    claudeMaxCalls: Number(readEnv(env, "CLAUDE_MAX_CALLS") ?? "60") || 60
  };
  const combatPlannerRaw = (readEnv(env, "COMBAT_PLANNER") ?? DEFAULTS.combatPlanner).toLowerCase();
  if (combatPlannerRaw !== "turn" && combatPlannerRaw !== "card") {
    problems.push({ field: "COMBAT_PLANNER", message: `expected turn or card, got "${combatPlannerRaw}"` });
  }
  const combatPlanner = combatPlannerRaw === "card" ? "card" : "turn";
  const jevContextRaw = (readEnv(env, "JEV_CONTEXT") ?? "off").toLowerCase();
  if (jevContextRaw !== "off" && jevContextRaw !== "v1") {
    problems.push({ field: "JEV_CONTEXT", message: `expected off or v1, got "${jevContextRaw}"` });
  }
  const jevContext = jevContextRaw === "v1" ? "v1" : "off";
  const fightPlanRaw = (readEnv(env, "FIGHT_PLAN") ?? "off").toLowerCase();
  if (fightPlanRaw !== "off" && fightPlanRaw !== "v1") {
    problems.push({ field: "FIGHT_PLAN", message: `expected off or v1, got "${fightPlanRaw}"` });
  }
  const fightPlan = fightPlanRaw === "v1" ? "v1" : "off";
  const fightPlanLog = fromRoot(readEnv(env, "FIGHT_PLAN_LOG") ?? "logs/fight-plans.jsonl");
  const runPlanRaw = (readEnv(env, "RUN_PLAN") ?? "off").toLowerCase();
  if (runPlanRaw !== "off" && runPlanRaw !== "v1") {
    problems.push({ field: "RUN_PLAN", message: `expected off or v1, got "${runPlanRaw}"` });
  }
  const runPlan = runPlanRaw === "v1" ? "v1" : "off";
  const runPlanLog = fromRoot(readEnv(env, "RUN_PLAN_LOG") ?? "logs/run-plans.jsonl");
  const runPlanMergeProblems = [];
  const runPlanMerge = parseOnOff(readEnv(env, "RUN_PLAN_MERGE"), "RUN_PLAN_MERGE", runPlanMergeProblems) ?? true;
  for (const problem of runPlanMergeProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const buildDeciderRaw = (readEnv(env, "BUILD_DECIDER") ?? "deepseek").toLowerCase();
  if (buildDeciderRaw !== "deepseek" && buildDeciderRaw !== "jev") {
    problems.push({ field: "BUILD_DECIDER", message: `expected deepseek or jev, got "${buildDeciderRaw}"` });
  }
  const buildDecider = buildDeciderRaw === "jev" ? "jev" : "deepseek";
  const buildOneshotRaw = (readEnv(env, "BUILD_ONESHOT") ?? "on").toLowerCase();
  if (buildOneshotRaw !== "on" && buildOneshotRaw !== "off") {
    problems.push({ field: "BUILD_ONESHOT", message: `expected on or off, got "${buildOneshotRaw}"` });
  }
  const buildOneshot = buildOneshotRaw === "off" ? "off" : "on";
  const bossSimBuildRaw = (readEnv(env, "BOSS_SIM_BUILD") ?? "on").toLowerCase();
  if (bossSimBuildRaw !== "on" && bossSimBuildRaw !== "off") {
    problems.push({ field: "BOSS_SIM_BUILD", message: `expected on or off, got "${bossSimBuildRaw}"` });
  }
  const bossSimBuild = bossSimBuildRaw === "off" ? "off" : "on";
  const combatDeepseekRaw = (readEnv(env, "COMBAT_DEEPSEEK") ?? "off").toLowerCase();
  if (combatDeepseekRaw !== "off" && combatDeepseekRaw !== "on") {
    problems.push({ field: "COMBAT_DEEPSEEK", message: `expected off or on, got "${combatDeepseekRaw}"` });
  }
  const combatDeepseek = combatDeepseekRaw === "on" ? "on" : "off";
  const thiefFactsProblems = [];
  const thiefFacts = parseOnOff(readEnv(env, "THIEF_FACTS"), "THIEF_FACTS", thiefFactsProblems) ?? true;
  for (const problem of thiefFactsProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const thiefCostProblems = [];
  const thiefCost = parseOnOff(readEnv(env, "THIEF_COST"), "THIEF_COST", thiefCostProblems) ?? true;
  for (const problem of thiefCostProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const mechRulesProblems = [];
  const mechRules = parseOnOff(readEnv(env, "MECH_RULES"), "MECH_RULES", mechRulesProblems) ?? true;
  for (const problem of mechRulesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const mechMoveRulesProblems = [];
  const mechMoveRules = parseOnOff(readEnv(env, "MECH_MOVE_RULES"), "MECH_MOVE_RULES", mechMoveRulesProblems) ?? true;
  for (const problem of mechMoveRulesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const mechDeathMoveProblems = [];
  const mechDeathMove = parseOnOff(readEnv(env, "MECH_DEATH_MOVE"), "MECH_DEATH_MOVE", mechDeathMoveProblems) ?? true;
  for (const problem of mechDeathMoveProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const passivePiecesProblems = [];
  const passivePieces = parseOnOff(readEnv(env, "PASSIVE_PIECES"), "PASSIVE_PIECES", passivePiecesProblems) ?? true;
  for (const problem of passivePiecesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const sandpitStartProblems = [];
  const sandpitStart = parseOnOff(readEnv(env, "SANDPIT_START"), "SANDPIT_START", sandpitStartProblems) ?? true;
  for (const problem of sandpitStartProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const cardConditionsProblems = [];
  const cardConditions = parseOnOff(readEnv(env, "CARD_CONDITIONS"), "CARD_CONDITIONS", cardConditionsProblems) ?? true;
  for (const problem of cardConditionsProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const decisionLog = fromRoot(readEnv(env, "DECISION_LOG") ?? DEFAULTS.decisionLog);
  const slLogRaw = readEnv(env, "SL_LOG");
  const sl = {
    enabled: parseOnOff(readEnv(env, "SL_ENABLED"), "SL_ENABLED", problems) ?? true,
    bossRetries: parseInteger(readEnv(env, "SL_BOSS_RETRIES") ?? "5", "SL_BOSS_RETRIES", problems, { min: 0, max: 20 }),
    eliteRetries: parseInteger(readEnv(env, "SL_ELITE_RETRIES") ?? "3", "SL_ELITE_RETRIES", problems, { min: 0, max: 20 }),
    act3LowHp: parseOnOff(readEnv(env, "SL_ACT3_LOW_HP"), "SL_ACT3_LOW_HP", problems) ?? true,
    act3LowHpPct: parseInteger(readEnv(env, "SL_ACT3_LOW_HP_PCT") ?? "50", "SL_ACT3_LOW_HP_PCT", problems, { min: 0, max: 100 }),
    act2LowHp: parseOnOff(readEnv(env, "SL_ACT2_LOW_HP"), "SL_ACT2_LOW_HP", problems) ?? true,
    act2LowHpPct: parseInteger(readEnv(env, "SL_ACT2_LOW_HP_PCT") ?? "50", "SL_ACT2_LOW_HP_PCT", problems, { min: 0, max: 100 }),
    retryShowSim: parseOnOff(readEnv(env, "SL_RETRY_SHOW_SIM"), "SL_RETRY_SHOW_SIM", problems) ?? true,
    retryMemo: parseOnOff(readEnv(env, "SL_RETRY_MEMO"), "SL_RETRY_MEMO", problems) ?? true,
    retryKnownDraws: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_DRAWS"), "SL_RETRY_KNOWN_DRAWS", problems) ?? true,
    retryCompute: parseOnOff(readEnv(env, "SL_RETRY_COMPUTE"), "SL_RETRY_COMPUTE", problems) ?? true,
    judgeKnownDraws: parseOnOff(readEnv(env, "SL_JUDGE_KNOWN_DRAWS"), "SL_JUDGE_KNOWN_DRAWS", problems) ?? true,
    judgeAnyDraw: parseOnOff(readEnv(env, "SL_JUDGE_ANY_DRAW"), "SL_JUDGE_ANY_DRAW", problems) ?? true,
    reloadEarly: parseOnOff(readEnv(env, "SL_RELOAD_EARLY"), "SL_RELOAD_EARLY", problems) ?? true,
    reloadOnRevive: parseOnOff(readEnv(env, "SL_RELOAD_ON_REVIVE"), "SL_RELOAD_ON_REVIVE", problems) ?? false,
    retryKnownInserts: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_INSERTS"), "SL_RETRY_KNOWN_INSERTS", problems) ?? true,
    retryKnownTop: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_TOP"), "SL_RETRY_KNOWN_TOP", problems) ?? true,
    retryExplore: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE"), "SL_RETRY_EXPLORE", problems) ?? true,
    retryExploreB2: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_B2"), "SL_RETRY_EXPLORE_B2", problems) ?? true,
    retryExploreBossPotions: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_BOSS_POTIONS"), "SL_RETRY_EXPLORE_BOSS_POTIONS", problems) ?? true,
    retryExploreOrder: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_ORDER"), "SL_RETRY_EXPLORE_ORDER", problems) ?? true,
    retryExploreReplay: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY"), "SL_RETRY_EXPLORE_REPLAY", problems) ?? true,
    retryExploreReplayPlays: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_PLAYS"), "SL_RETRY_EXPLORE_REPLAY_PLAYS", problems) ?? true,
    retryExploreReplayDeviate: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_DEVIATE"), "SL_RETRY_EXPLORE_REPLAY_DEVIATE", problems) ?? true,
    retryExploreKeyCounters: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_KEY_COUNTERS"), "SL_RETRY_EXPLORE_KEY_COUNTERS", problems) ?? true,
    retryExploreSecond: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_SECOND"), "SL_RETRY_EXPLORE_SECOND", problems) ?? true,
    retryExploreReplayOrder: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_ORDER"), "SL_RETRY_EXPLORE_REPLAY_ORDER", problems) ?? true,
    retryExploreReplayCode: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REPLAY_CODE"), "SL_RETRY_EXPLORE_REPLAY_CODE", problems) ?? true,
    retryExploreTargetTurn: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_TARGET_TURN"), "SL_RETRY_EXPLORE_TARGET_TURN", problems) ?? true,
    retryExploreRearm: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_REARM"), "SL_RETRY_EXPLORE_REARM", problems) ?? true,
    retryExploreWasted: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_WASTED"), "SL_RETRY_EXPLORE_WASTED", problems) ?? true,
    retryExploreAnchor: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_ANCHOR"), "SL_RETRY_EXPLORE_ANCHOR", problems) ?? true,
    retryExploreCanon: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_CANON"), "SL_RETRY_EXPLORE_CANON", problems) ?? true,
    retryExploreTurn: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_TURN"), "SL_RETRY_EXPLORE_TURN", problems) ?? true,
    retryExploreWhole: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_WHOLE"), "SL_RETRY_EXPLORE_WHOLE", problems) ?? true,
    retryExploreWhere: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_WHERE"), "SL_RETRY_EXPLORE_WHERE", problems) ?? true,
    retryExplorePotion: parseOnOff(readEnv(env, "SL_RETRY_EXPLORE_POTION"), "SL_RETRY_EXPLORE_POTION", problems) ?? true,
    retryKnownPicks: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_PICKS"), "SL_RETRY_KNOWN_PICKS", problems) ?? true,
    retryKnownOffTop: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_OFF_TOP"), "SL_RETRY_KNOWN_OFF_TOP", problems) ?? true,
    retryKnownHandOrder: parseOnOff(readEnv(env, "SL_RETRY_KNOWN_HAND_ORDER"), "SL_RETRY_KNOWN_HAND_ORDER", problems) ?? true,
    log: slLogRaw === null ? join3(dirname2(decisionLog), "sl-attempts.jsonl") : /^(off|none|false|0)$/i.test(slLogRaw) ? null : fromRoot(slLogRaw),
    stepTimeoutMs: parseInteger(readEnv(env, "SL_STEP_TIMEOUT_MS") ?? "60000", "SL_STEP_TIMEOUT_MS", problems, { min: 1e3, max: 6e5 })
  };
  const brain = readBrainConfig(env, problems);
  const logLevelRaw = (readEnv(env, "LOG_LEVEL") ?? DEFAULTS.logLevel).toLowerCase();
  if (!LOG_LEVELS.includes(logLevelRaw)) {
    problems.push({ field: "LOG_LEVEL", message: `expected one of ${LOG_LEVELS.join(", ")}, got "${logLevelRaw}"` });
  }
  const logLevel = LOG_LEVELS.includes(logLevelRaw) ? logLevelRaw : DEFAULTS.logLevel;
  const confidenceAct = parseRatio(readEnv(env, "CONFIDENCE_ACT") ?? String(DEFAULTS.confidenceAct), "CONFIDENCE_ACT", problems);
  const confidenceStrong = parseRatio(
    readEnv(env, "CONFIDENCE_STRONG") ?? String(DEFAULTS.confidenceStrong),
    "CONFIDENCE_STRONG",
    problems
  );
  if (confidenceAct > confidenceStrong) {
    warnings.push(
      `CONFIDENCE_ACT (${confidenceAct}) is above CONFIDENCE_STRONG (${confidenceStrong}); the strong tier is unreachable`
    );
  }
  const maxRequests = parseInteger(
    readEnv(env, "MAX_REQUESTS") ?? String(DEFAULTS.maxRequests),
    "MAX_REQUESTS",
    problems,
    { min: 1, max: 1e6 }
  );
  const maxTokens = parseCount(readEnv(env, "MAX_TOKENS") ?? DEFAULTS.maxTokens, "MAX_TOKENS", problems);
  const enricherEnabled = parseBoolean(
    readEnv(env, "ENRICHER_ENABLED") ?? String(DEFAULTS.enricherEnabled),
    "ENRICHER_ENABLED",
    problems
  );
  const enricherBaseUrlRaw = readEnv(env, "ENRICHER_BASE_URL");
  const enricherBaseUrl = enricherBaseUrlRaw ? parseUrl(enricherBaseUrlRaw, "ENRICHER_BASE_URL", problems) : null;
  const enricherApiKey = readEnv(env, "ENRICHER_API_KEY");
  const enricherModel = readEnv(env, "ENRICHER_MODEL");
  const enricherTasks = (readEnv(env, "ENRICHER_TASKS") ?? DEFAULTS.enricherTasks).split(",").map((task) => task.trim()).filter((task) => task.length > 0);
  if (enricherEnabled && !enricherBaseUrl) {
    problems.push({ field: "ENRICHER_BASE_URL", message: "required when ENRICHER_ENABLED=true" });
  }
  if (enricherEnabled && !enricherModel) {
    problems.push({ field: "ENRICHER_MODEL", message: "required when ENRICHER_ENABLED=true" });
  }
  if (problems.length > 0) throw new ConfigError(problems);
  return {
    sts2: { baseUrl, portScan, timeoutMs: sts2TimeoutMs },
    jev: {
      apiKey: jevApiKey,
      baseUrl: jevBaseUrl,
      model: jevModel,
      timeoutMs: DEFAULTS.jevTimeoutMs,
      maxRetries: DEFAULTS.jevMaxRetries
    },
    enricher: {
      enabled: enricherEnabled,
      baseUrl: enricherBaseUrl,
      apiKey: enricherApiKey,
      model: enricherModel,
      tasks: enricherTasks
    },
    thresholds: { act: confidenceAct, strong: confidenceStrong },
    budgets: { maxRequests, maxTokens },
    run: { start: runStart, character: character2, characterId: characterId ?? DEFAULT_CHARACTER },
    shop: { discardPotions: shopDiscardPotions },
    allowFtueModals,
    strictJev,
    combatPlanner,
    jevContext,
    fightPlan,
    fightPlanLog,
    runPlan,
    runPlanLog,
    runPlanMerge,
    buildDecider,
    buildOneshot,
    bossSimBuild,
    combatDeepseek,
    thiefFacts,
    thiefCost,
    mechRules,
    mechMoveRules,
    mechDeathMove,
    passivePieces,
    sandpitStart,
    cardConditions,
    sl,
    brain,
    deepseek,
    escalation,
    mode: mode3,
    log: { level: logLevel, decisionLog, ...jevPromptLogConfig(readEnv(env, "JEV_PROMPT_LOG")), ...runConfigLogConfig(readEnv(env, "RUN_CONFIG_LOG")) },
    warnings
  };
}
function jevPromptLogConfig(raw) {
  if (raw === null) return {};
  return /^(off|none|false|0)$/i.test(raw) ? { jevPromptLog: null } : { jevPromptLog: fromRoot(raw) };
}
function runConfigLogConfig(raw) {
  if (raw === null) return {};
  return /^(off|none|false|0)$/i.test(raw) ? { runConfigLog: null } : { runConfigLog: fromRoot(raw) };
}
var DEFAULT_CLAUDE_MODEL, DEFAULT_CLAUDE_TIMEOUT_MS, DEFAULT_CLAUDE_MAX_CALLS, DEFAULT_CODEX_MODEL, DEFAULT_CODEX_EFFORT, CODEX_SERVICE_TIER, DEFAULT_CODEX_TIMEOUT_MS, DEFAULT_CODEX_STALL_MS, DEFAULT_CODEX_MAX_ANSWER_BLANKS, DEFAULT_CODEX_SCHEMA_FIELDS, DEFAULT_CODEX_REASON_LAST, DEFAULT_CODEX_ACCEPT_CUT, DEFAULT_CODEX_ROUTE_PATTERN, DEFAULT_CODEX_USAGE_STOP_PCT, DEFAULT_CODEX_USAGE_EVERY_CALLS, DEFAULT_CODEX_USAGE_EVERY_MIN, ENGINES, EFFORTS, ConfigError, DEFAULTS, MODES, LOG_LEVELS, RUN_STARTS;
var init_config = __esm({
  "src/core/config.ts"() {
    "use strict";
    init_paths();
    init_files();
    DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";
    DEFAULT_CLAUDE_TIMEOUT_MS = 12e4;
    DEFAULT_CLAUDE_MAX_CALLS = 150;
    DEFAULT_CODEX_MODEL = "gpt-6.1-sol";
    DEFAULT_CODEX_EFFORT = "xhigh";
    CODEX_SERVICE_TIER = "priority";
    DEFAULT_CODEX_TIMEOUT_MS = 6e5;
    DEFAULT_CODEX_STALL_MS = 12e4;
    DEFAULT_CODEX_MAX_ANSWER_BLANKS = 100;
    DEFAULT_CODEX_SCHEMA_FIELDS = "used";
    DEFAULT_CODEX_REASON_LAST = false;
    DEFAULT_CODEX_ACCEPT_CUT = true;
    DEFAULT_CODEX_ROUTE_PATTERN = true;
    DEFAULT_CODEX_USAGE_STOP_PCT = 80;
    DEFAULT_CODEX_USAGE_EVERY_CALLS = 3;
    DEFAULT_CODEX_USAGE_EVERY_MIN = 10;
    ENGINES = ["deepseek", "claude", "codex", "dsh"];
    EFFORTS = ["low", "medium", "high", "xhigh", "max"];
    ConfigError = class extends Error {
      problems;
      constructor(problems) {
        super(problems.map((problem) => `${problem.field}: ${problem.message}`).join("\n"));
        this.name = "ConfigError";
        this.problems = problems;
      }
    };
    DEFAULTS = {
      sts2BaseUrl: "http://127.0.0.1:8080",
      sts2PortScan: "8080-8090",
      sts2TimeoutMs: 1e4,
      jevModel: "jev-1.13.0",
      jevTimeoutMs: 2e4,
      jevMaxRetries: 2,
      confidenceAct: 0.55,
      confidenceStrong: 0.75,
      maxRequests: 2e3,
      maxTokens: "20M",
      mode: "shadow",
      logLevel: "info",
      decisionLog: "./logs/decisions.jsonl",
      enricherEnabled: false,
      enricherTasks: "run_brief",
      runStart: "auto",
      allowFtueModals: false,
      strictJev: true,
      combatPlanner: "turn",
      shopDiscardPotions: "FOUL_POTION"
    };
    MODES = ["shadow", "play", "record", "replay"];
    LOG_LEVELS = ["debug", "info", "warn", "error"];
    RUN_STARTS = ["auto", "continue", "new"];
  }
});

// src/knowledge/relic-values.ts
function fillRelicText(relicId, text) {
  const values = RELIC_VALUES[relicId] ?? {};
  const filled = text.replace(/\{([A-Za-z]+)(?::([A-Za-z]+)\((\d*)\))?\}/g, (_whole, name, format, arg2) => {
    const value = arg2 ? Number(arg2) : values[name];
    if (value === void 0) return UNKNOWN_VALUE;
    if (format === "energyIcons") return `${value}\u70B9\u80FD\u91CF`;
    if (format === "starIcons") return `${value}\u9897\u661F`;
    return String(value);
  });
  return stripMarkup(filled);
}
var RELIC_VALUES;
var init_relic_values = __esm({
  "src/knowledge/relic-values.ts"() {
    "use strict";
    init_json();
    init_potion_values();
    RELIC_VALUES = {
      BURNING_BLOOD: { Heal: 6 },
      BAG_OF_MARBLES: { VulnerablePower: 1 },
      TOASTY_MITTENS: { StrengthPower: 1 },
      LANTERN: { Energy: 1 },
      PAELS_FLESH: { Energy: 1 },
      PARRYING_SHIELD: { Block: 10, Damage: 6 },
      ROYAL_POISON: { Damage: 4 },
      RED_SKULL: { HpThreshold: 50, StrengthPower: 3 },
      SELF_FORMING_CLAY: { BlockNextTurn: 3 },
      SHURIKEN: { Cards: 3, StrengthPower: 1 },
      CAPTAINS_WHEEL: { Block: 18 }
    };
  }
});

// src/memory/deck.ts
function enchantsByDeckIndex(state) {
  const out = /* @__PURE__ */ new Map();
  const lines = asArray(asRecord(asRecord(state.raw["agent_view"])["run"])["deck"]).map(asRecord);
  const deck = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  const squash = (text) => iconsToText(text).replace(/\s+/g, "");
  for (const line of lines) {
    const mods = asArray(line["mods"]).map((mod) => str(mod));
    const at2 = mods.indexOf("Enchantment");
    if (at2 < 0) continue;
    const name = mods.slice(at2 + 1).find((mod) => /[^\x00-\x7f]/.test(mod)) ?? mods[at2 + 1];
    if (!name) continue;
    const cardId = str(asArray(line["card_ids"])[0]);
    const text = squash(str(line["line"]).split("\uFF1A").slice(1).join("\uFF1A"));
    deck.forEach((card, i) => {
      const index = numOrNull(card["index"]) ?? i;
      if (str(card["card_id"]) === cardId && !out.has(index) && squash(str(card["resolved_rules_text"])) === text) out.set(index, name);
    });
  }
  return out;
}
function deckEntries(state, knowledge) {
  const run = asRecord(state.run?.raw);
  const enchants = enchantsByDeckIndex(state);
  return asArray(run["deck"]).map((entry, fallbackIndex) => {
    const obj = asRecord(entry);
    const cardId = str(obj["card_id"]);
    const info = knowledge.card(cardId);
    const upgraded = bool(obj["upgraded"]);
    const rendered = iconsToText(str(obj["resolved_rules_text"]) || info?.description || "");
    return {
      index: numOrNull(obj["index"]) ?? fallbackIndex,
      card_id: cardId,
      name: str(obj["name"], info?.name ?? cardId),
      upgraded,
      type: str(obj["card_type"], info?.type ?? ""),
      rarity: str(obj["rarity"], info?.rarity ?? ""),
      cost: numOrNull(obj["energy_cost"]) ?? info?.cost ?? null,
      description: truncate(rendered.split(".")[0] ?? rendered, 90),
      ...enchants.has(numOrNull(obj["index"]) ?? fallbackIndex) ? { enchant: `${enchants.get(numOrNull(obj["index"]) ?? fallbackIndex)}: ${enchantEffect(enchants.get(numOrNull(obj["index"]) ?? fallbackIndex), null)}` } : {}
    };
  });
}
function deckStats(entries) {
  const costCurve = {};
  let costTotal = 0;
  let costCount = 0;
  let attacks = 0;
  let skills = 0;
  let powers = 0;
  let curses = 0;
  let upgraded = 0;
  for (const entry of entries) {
    const type = entry.type.toLowerCase();
    if (type === "attack") attacks += 1;
    else if (type === "skill") skills += 1;
    else if (type === "power") powers += 1;
    else if (type === "curse" || type === "status") curses += 1;
    if (entry.upgraded) upgraded += 1;
    if (entry.cost !== null) {
      const bucket = entry.cost >= 3 ? "3+" : String(entry.cost);
      costCurve[bucket] = (costCurve[bucket] ?? 0) + 1;
      costTotal += entry.cost;
      costCount += 1;
    }
  }
  return {
    total: entries.length,
    attacks,
    skills,
    powers,
    curses,
    upgraded,
    average_cost: costCount > 0 ? Number((costTotal / costCount).toFixed(2)) : null,
    cost_curve: costCurve
  };
}
function summarizeDeck(stats) {
  const parts = [
    `${stats.total} cards`,
    `${stats.attacks} attacks / ${stats.skills} skills / ${stats.powers} powers`
  ];
  if (stats.upgraded > 0) parts.push(`${stats.upgraded} upgraded`);
  if (stats.curses > 0) parts.push(`${stats.curses} curses/statuses`);
  if (stats.average_cost !== null) parts.push(`avg cost ${stats.average_cost}`);
  return parts.join(" | ");
}
function describeRunRelics(state, knowledge) {
  return asArray(asRecord(state.run?.raw)["relics"]).map((entry) => {
    const obj = asRecord(entry);
    const id = str(obj["relic_id"]);
    return str(obj["name"], knowledge.relic(id)?.name ?? id);
  });
}
function describeRunRelicEffects(state, knowledge, max = 10) {
  return asArray(asRecord(state.run?.raw)["relics"]).map((entry) => {
    const obj = asRecord(entry);
    const id = str(obj["relic_id"]);
    const info = knowledge.relic(id);
    const name = str(obj["name"], info?.name ?? id);
    const description = fillRelicText(id, info?.description || str(obj["description"]));
    return description ? `${name}: ${truncate(description, 80)}` : null;
  }).filter((entry) => entry !== null).slice(0, max);
}
function describeRunPotions(state, knowledge) {
  return asArray(asRecord(state.run?.raw)["potions"]).map((entry) => {
    const obj = asRecord(entry);
    if (!bool(obj["occupied"])) return null;
    const id = str(obj["potion_id"]);
    const name = str(obj["name"], knowledge.potion(id)?.name ?? id);
    const description = fillPotionText(id, knowledge.potion(id)?.description || str(obj["description"]));
    return `${name}: ${truncate(description, 70)}`;
  }).filter((entry) => entry !== null);
}
var init_deck = __esm({
  "src/memory/deck.ts"() {
    "use strict";
    init_enchant_text();
    init_potion_values();
    init_relic_values();
    init_json();
  }
});

// src/memory/run-brief.ts
function buildRunBrief(state, knowledge, previousNotes = []) {
  const entries = deckEntries(state, knowledge);
  const stats = deckStats(entries);
  const run = asRecord(state.run?.raw);
  const hp = state.run?.current_hp ?? null;
  const maxHp = state.run?.max_hp ?? null;
  const hpPct = hp !== null && maxHp !== null && maxHp > 0 ? Math.round(hp / maxHp * 100) : null;
  return {
    character: state.run?.character_name ?? null,
    // act_id counts from 0; the models read it as the act number (W6F4: "act 1" at F31).
    act: state.run?.act_id != null && /^\d+$/.test(state.run.act_id) ? String(Number(state.run.act_id) + 1) : state.run?.act_id ?? null,
    floor: state.run?.floor ?? null,
    hp: hp === null ? "unknown" : `${hp}/${maxHp ?? "?"}${hpPct === null ? "" : ` (${hpPct}%)`}`,
    gold: state.run?.gold ?? numOrNull(run["gold"]),
    ascension: state.run?.ascension ?? 0,
    deck: summarizeDeck(stats),
    relics: describeRunRelics(state, knowledge),
    relic_effects: describeRunRelicEffects(state, knowledge),
    potions: describeRunPotions(state, knowledge),
    notes: previousNotes.slice(-MAX_NOTES)
  };
}
function briefJson(brief) {
  const json = {
    character: brief.character,
    act: brief.act,
    floor: brief.floor,
    hp: brief.hp,
    gold: brief.gold,
    ascension: brief.ascension,
    deck: brief.deck,
    relics: brief.relics,
    relic_effects: brief.relic_effects,
    potions: brief.potions,
    notes: brief.notes
  };
  if (brief.plan) json["run_plan"] = brief.plan;
  if ([...brief.relic_effects, ...brief.potions].some((entry) => entry.includes(UNKNOWN_VALUE))) {
    json["relic_effects_note"] = `${UNKNOWN_VALUE} marks a value the mod does not expose; the effect text around it is accurate`;
  }
  return json;
}
function isCombatRelic(relicId) {
  return COMBAT_RELICS.has(relicId);
}
function combatRelicEffects(state, knowledge) {
  return asArray(asRecord(state.run?.raw)["relics"]).map(asRecord).filter((relic) => isCombatRelic(str(relic["relic_id"]))).map((relic) => {
    const id = str(relic["relic_id"]);
    const info = knowledge.relic(id);
    const name = str(relic["name"], info?.name ?? id);
    const description = fillRelicText(id, info?.description || str(relic["description"]));
    return description ? `${name}: ${truncate(description, 80)}` : name;
  });
}
function combatBriefJson(brief, state, knowledge) {
  const relics = combatRelicEffects(state, knowledge);
  const json = {
    character: brief.character,
    act: brief.act,
    floor: brief.floor,
    hp: brief.hp,
    ascension: brief.ascension,
    combat_relics: relics,
    potions: brief.potions
  };
  if (brief.notes.length > 0) json["notes"] = brief.notes;
  if ([...relics, ...brief.potions].some((entry) => entry.includes(UNKNOWN_VALUE))) {
    json["relic_effects_note"] = `${UNKNOWN_VALUE} marks a value the mod does not expose; the effect text around it is accurate`;
  }
  return json;
}
var MAX_NOTES, SOLVER_MODELLED_RELICS, COMBAT_TRIGGER_RELICS, COMBAT_RELICS;
var init_run_brief = __esm({
  "src/memory/run-brief.ts"() {
    "use strict";
    init_potion_values();
    init_relic_values();
    init_json();
    init_deck();
    MAX_NOTES = 8;
    SOLVER_MODELLED_RELICS = ["MERCURY_HOURGLASS", "INTIMIDATING_HELMET", "DEMON_TONGUE", "TOASTY_MITTENS", "FIDDLE"];
    COMBAT_TRIGGER_RELICS = [
      "SHURIKEN",
      "PEN_NIB",
      "MINIATURE_CANNON",
      "CENTENNIAL_PUZZLE",
      "SPARKLING_ROUGE",
      "PENDULUM",
      "MR_STRUGGLES",
      "LOST_WISP",
      "HORN_CLEAT",
      "ART_OF_WAR",
      "REPTILE_TRINKET",
      "CROSSBOW",
      "RED_SKULL",
      "BEATING_REMNANT",
      "PAPER_PHROG",
      "TUNING_FORK",
      "CLOAK_CLASP",
      "CANDELABRA",
      "GAME_PIECE",
      "PAELS_FLESH",
      "HAPPY_FLOWER",
      "UNSETTLING_LAMP",
      "LIZARD_TAIL",
      "SCREAMING_FLAGON",
      "BURNING_STICKS",
      "STRIKE_DUMMY",
      "RAINBOW_RING",
      "ORICHALCUM",
      "PERMAFROST",
      "MYSTIC_LIGHTER",
      "RAZOR_TOOTH",
      "CHEMICAL_X",
      "RIPPLE_BASIN",
      "NUNCHAKU",
      "BELT_BUCKLE",
      "VAMBRACE",
      "KUNAI",
      "ORNAMENTAL_FAN",
      "LETTER_OPENER",
      "SELF_FORMING_CLAY",
      "BRILLIANT_SCARF",
      "CAPTAINS_WHEEL",
      "CHARONS_ASHES",
      "DAUGHTER_OF_THE_WIND",
      "DIAMOND_DIADEM",
      "FORGOTTEN_SOUL",
      "HAND_DRILL",
      "HISTORY_COURSE",
      "ICE_CREAM",
      "IVORY_TILE",
      "KUSARIGAMA",
      "MUMMIFIED_HAND",
      "MUSIC_BOX",
      "PAELS_TEARS",
      "PAELS_LEGION",
      "PAPER_KRANE",
      "PARRYING_SHIELD",
      "POCKETWATCH",
      "RUNIC_PYRAMID",
      "STONE_CALENDAR",
      "STURDY_CLAMP",
      "THE_BOOT",
      "TINGSHA",
      "TOUGH_BANDAGES",
      "UNCEASING_TOP",
      "VELVET_CHOKER",
      "FAKE_ORICHALCUM",
      "FAKE_STRIKE_DUMMY",
      "BOOKMARK",
      "BRIMSTONE",
      "UNDYING_SIGIL",
      "REGALITE"
    ];
    COMBAT_RELICS = /* @__PURE__ */ new Set([...SOLVER_MODELLED_RELICS, ...COMBAT_TRIGGER_RELICS]);
  }
});

// src/memory/types.ts
function createScreenMemory(screen = "") {
  return { screen, shopOpened: false, cardRewardSkipped: false, combatPlan: null };
}
var init_types = __esm({
  "src/memory/types.ts"() {
    "use strict";
  }
});

// src/reflex/jev/questions.ts
function choiceQ(instructions, criteria) {
  assertChoiceSize(instructions, criteria);
  return { type: "choice", instructions, criteria };
}
function assertChoiceSize(instructions, criteria) {
  const size = Object.keys(criteria).length;
  if (size === 0) throw new Error(`choice question has no options: ${instructions}`);
  if (size > MAX_CHOICE_OPTIONS) {
    throw new Error(`choice question has ${size} options, above the ${MAX_CHOICE_OPTIONS} limit: ${instructions}`);
  }
}
var MAX_CHOICE_OPTIONS;
var init_questions = __esm({
  "src/reflex/jev/questions.ts"() {
    "use strict";
    MAX_CHOICE_OPTIONS = 255;
  }
});

// src/reflex/silent-phase-reference.ts
function silentPhaseReference(state, shown) {
  const facts = /* @__PURE__ */ new Map();
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent") return facts;
  const living = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy2) => num(enemy2["current_hp"]) > 0);
  if (living.length !== 1) return facts;
  const enemy = living[0];
  if (enemy["enemy_id"] !== "TEST_SUBJECT" || !asArray(enemy["powers"]).map(asRecord).some((power) => power["power_id"] === "ADAPTABLE_POWER" && num(power["amount"]) > 0)) return facts;
  const ends = (plan) => {
    const o = plan.outcome;
    const after = o.enemyHpAfter.find((entry) => entry.index === num(enemy["index"]));
    return !o.winsFight && !o.dies && after !== void 0 && after.hp <= 0;
  };
  const ending = shown.filter(({ plan }) => ends(plan) && !plan.outcome.revived && Number.isFinite(plan.outcome.hpLoss));
  if (ending.length === 0) return facts;
  const least = Math.min(...ending.map(({ plan }) => plan.outcome.hpLoss));
  const references = ending.filter(({ plan }) => plan.outcome.hpLoss === least);
  const keys = references.map(({ key }) => key).join("\u3001");
  for (const { plan } of shown) {
    facts.set(plan, {
      current_phase_ends: ends(plan),
      phase_end_reference: `\u5F53\u524D\u9636\u6BB5\u7ED3\u675F\u53C2\u8003\uFF1A${keys}\uFF0C\u672C\u56DE\u5408\u9884\u6D4B\u635F\u8840${least}\u3002\u4EC5\u6309\u5DF2\u5217\u51FA\u7684\u9636\u6BB5\u7ED3\u675F\u7EBF\u7684\u672C\u56DE\u5408\u635F\u8840\u6BD4\u8F83\uFF1B${references.length > 1 ? "\u8FD9\u4E9B\u53C2\u8003\u7EBF\u5728\u8BE5\u6307\u6807\u4E0A\u5E76\u5217\uFF1B" : ""}\u540E\u7EED\u9636\u6BB5\u4ECD\u9700\u6218\u6597\uFF0C\u6574\u573A\u80DC\u8D1F\u672A\u9A8C\u8BC1\u3002\u4E0E\u957F\u7A0B\u63A8\u6F14\u4E00\u8D77\u4EA4\u7531Jev\u9009\u62E9\u3002`,
      ...references.some((entry) => entry.plan === plan) ? { phase_end_min_loss: true } : {}
    });
  }
  return facts;
}
var init_silent_phase_reference = __esm({
  "src/reflex/silent-phase-reference.ts"() {
    "use strict";
    init_json();
  }
});

// src/reflex/silent-loss-reference.ts
function silentLossReference(state, shown, tied) {
  const facts = /* @__PURE__ */ new Map();
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent") return facts;
  const comparable = shown.filter(({ plan }) => tied.includes(plan) && Number.isFinite(plan.outcome.hpLoss) && !plan.outcome.dies && !plan.outcome.revived && plan.outcome.cardsDrawn === 0 && plan.outcome.unknownCards.length === 0);
  if (comparable.length < 2) return facts;
  const least = Math.min(...comparable.map(({ plan }) => plan.outcome.hpLoss));
  const references = comparable.filter(({ plan }) => plan.outcome.hpLoss === least);
  const keys = references.map(({ key }) => key).join("\u3001");
  for (const { plan } of comparable) {
    const extra = plan.outcome.hpLoss - least;
    facts.set(plan, {
      tied_hp_loss_rank: 1 + comparable.filter((entry) => entry.plan.outcome.hpLoss < plan.outcome.hpLoss).length,
      tied_hp_loss_extra: extra,
      tied_hp_loss_reference: `\u957F\u7A0B\u63A8\u6F14\u5E76\u5217\u7EC4\u7684\u5373\u65F6\u635F\u8840\u53C2\u8003\uFF1A${keys}\uFF0C\u5355\u56DE\u5408\u6A21\u578B\u51C0\u635F\u8840${least}\uFF1B\u672C\u7EBF\u591A\u635F${extra}\u3002${references.length > 1 ? "\u6700\u4F4E\u635F\u8840\u53C2\u8003\u5728\u8BE5\u6307\u6807\u4E0A\u5E76\u5217\uFF1B" : ""}\u53EA\u6BD4\u8F83\u5DF2\u5217\u51FA\u4E14\u65E0\u672A\u77E5\u724C\u6216\u5F85\u62BD\u724C\u3001\u4E0D\u82B1\u590D\u6D3B\u7684\u5F53\u8F6E\u5B58\u6D3B\u7EBF\u3002\u5373\u65F6\u635F\u8840\u4E0D\u540C\u4E0D\u4EE3\u8868\u6574\u573A\u80DC\u7387\u4E0D\u540C\uFF1B\u8F93\u51FA\u3001\u6210\u957F\u53CA\u957F\u7A0B\u5E76\u5217\u4ECD\u4E00\u8D77\u4EA4\u7531Jev\u5224\u65AD\u3002`
    });
  }
  return facts;
}
var init_silent_loss_reference = __esm({
  "src/reflex/silent-loss-reference.ts"() {
    "use strict";
    init_json();
  }
});

// src/reflex/silent-simulation-reference.ts
function silentSimulationReference(state, shown, rollout, potions) {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent") return {};
  const active = rollout?.available ? rollout : null;
  const fallback = active !== null && active.result.degraded.includes("1-turn");
  const forecast = active !== null && active.result.horizon > 1 && !fallback;
  const best = forecast ? shown.find(({ plan }) => plan === active.best)?.key ?? null : null;
  const peers = forecast ? shown.filter(({ plan }) => active.tied.includes(plan)).map(({ key }) => key) : [];
  const tied = forecast && active.tied.length >= 2 ? peers : [];
  const ranking = forecast && active.best !== null ? best !== null ? "best" : "outside_shown" : forecast && active.tied.length >= 2 ? "tied" : "not_compared";
  return {
    note: "\u9009\u9879\u6570\u5B57\u662F\u4EE3\u7801\u6A21\u578B\u53C2\u8003\uFF0C\u53D7\u672A\u5EFA\u6A21\u6548\u679C\u3001\u62BD\u724C\u91CD\u7B97\u548C\u63A8\u6F14\u8303\u56F4\u9650\u5236\u3002\u4F9D\u636E\u5F53\u8F6E\u4EE3\u4EF7\u3001\u6210\u957F\u4E0E\u540E\u7EED\u8BC1\u636E\u9009\u62E9\u6574\u573A\u6253\u6CD5\uFF1Bsimulation_reference\u5206\u5217\u8FD9\u4E9B\u9650\u5236\uFF0C\u65E0\u672A\u77E5\u6807\u8BB0\u4E5F\u4E0D\u4EE3\u8868\u5DF2\u7ECF\u6821\u51C6\u3002",
    simulation_reference: {
      rollout: {
        available: active !== null,
        scope: forecast ? "sampled_horizon" : active ? "current_turn_and_clock" : "unavailable",
        horizon: active?.result.horizon ?? null,
        samples: active?.result.samples ?? null,
        elapsed_ms: rollout?.elapsedMs ?? null,
        random_potion_shared_ms: active?.spentMs ?? null,
        degraded: active ? [...active.result.degraded] : [],
        ranking,
        best,
        tied,
        tied_total: forecast ? active.tied.length : 0,
        ...!active ? { reason: rollout && !rollout.available ? rollout.reason : "\u672A\u8FD0\u884C\u540E\u7EED\u63A8\u6F14" } : {},
        note: forecast ? "\u4EC5\u8868\u793A\u6240\u5217\u56DE\u5408\u53CA\u6837\u672C\u7684\u6A21\u578B\u7ED3\u679C\uFF1B\u5168\u8D25\u6837\u672C\u4E0D\u8BC1\u660E\u5B9E\u76D8\u5FC5\u8D25\uFF0C\u76EE\u6807\u987A\u5E8F\u4E0D\u662F\u5B9E\u9645\u51FB\u6740\u8BB0\u5F55\u3002\u6392\u540D\u4EC5\u6307rollout\uFF0C\u6574\u573Aboss\u6A21\u62DF\u53E6\u5217\uFF1Bbest/tied\u53EA\u5217\u5DF2\u5C55\u793A\u7684\u9009\u9879\u952E\uFF0Ctied_total\u4FDD\u7559\u539F\u5E76\u5217\u7EBF\u6570\u3002" : "\u672A\u5F62\u6210\u53EF\u6BD4\u8F83\u7684\u540E\u7EED\u62BD\u6837\u63A8\u6F14\uFF1B\u65F6\u949F\u5269\u4F59\u635F\u8840\u4F30\u8BA1\u5373\u4F7F\u5C01\u9876\u4E5F\u4E0D\u8868\u793A\u5B9E\u9645\u6B7B\u4EA1\u3002\u6CA1\u6709\u6700\u4F73\u7EBF\u4E0D\u7B49\u4E8E\u9009\u9879\u5E76\u5217\u3002"
      },
      options: shown.map(({ key, plan }) => {
        const line = active?.byPlan.get(plan);
        const sampled = forecast && line !== void 0 && line.horizon > 1 && line.samples > 0;
        return {
          key,
          unmodelled_cards: [...plan.outcome.unknownCards],
          cards_drawn: plan.outcome.cardsDrawn,
          draw_replan: plan.outcome.cardsDrawn > 0,
          evaluated: line !== void 0,
          horizon: line?.horizon ?? null,
          samples: line?.samples ?? null,
          // A clock fallback's synthetic deaths/wins must not be presented as sampled fight outcomes.
          sampled_wins: sampled ? line.wins : null,
          sampled_deaths: sampled ? line.deaths : null,
          note: plan.outcome.cardsDrawn > 0 ? "\u5F53\u8F6E\u5305\u542B\u62BD\u724C\uFF0C\u5B9E\u9645\u724C\u9762\u53D8\u5316\u540E\u91CD\u65B0\u6838\u9A8C\uFF1B\u62BD\u6837\u4E2D\u7684\u540E\u7EED\u51FA\u724C\u4E0D\u7B49\u4E8E\u5DF2\u5B9E\u6253\u3002" : plan.outcome.unknownCards.length > 0 ? "\u5F53\u8F6E\u542B\u672A\u5EFA\u6A21\u724C\uFF0C\u6570\u5B57\u672A\u8986\u76D6\u5176\u5168\u90E8\u6548\u679C\u3002" : "\u5F53\u8F6E\u6309\u73B0\u6709\u6A21\u578B\u8BA1\u7B97\uFF1B\u4E0D\u7531\u65E0\u672A\u77E5\u724C\u6807\u8BB0\u63A8\u5B9A\u6574\u573A\u7ED3\u8BBA\u53EF\u4FE1\u3002"
        };
      }),
      random_potions: potions.map((mc) => ({
        slot: mc.source.slot,
        potion: mc.source.potionId,
        samples: mc.samples,
        requested: mc.requested,
        elapsed_ms: mc.ms,
        degraded: mc.degraded,
        note: "\u672C\u680F\u662F\u836F\u6C34\u5F53\u8F6E\u62BD\u6837\uFF0C\u5B9E\u9645\u4F7F\u7528\u540E\u4F9D\u636E\u771F\u5B9E\u6548\u679C\u91CD\u7B97\uFF1B\u6837\u672C\u5B8C\u6210\u4E0D\u7B49\u4E8E\u6574\u573A\u80DC\u7387\u5DF2\u9A8C\u8BC1\u3002"
      }))
    }
  };
}
var init_silent_simulation_reference = __esm({
  "src/reflex/silent-simulation-reference.ts"() {
    "use strict";
    init_json();
  }
});

// src/memory/narrow.ts
function describeIntents(enemy) {
  const intents = asArray(enemy["intents"]).map(asRecord);
  let incoming = 0;
  const parts = [];
  for (const intent of intents) {
    const kind = str(intent["intent_type"]);
    const label = str(intent["label"]);
    const total = numOrNull(intent["total_damage"]);
    const hits = numOrNull(intent["hits"]);
    if (total !== null) incoming += total;
    const detail = label || (total !== null ? `${total}` : kind);
    parts.push(
      total !== null && hits !== null && hits > 1 ? `${kind} ${detail} (${hits} hits, ${total} total)` : `${kind} ${detail}`
    );
  }
  if (parts.length === 0) {
    const legacy = str(enemy["intent"]);
    if (legacy) parts.push(legacy);
  }
  return { text: parts.join(", ") || "unknown", incoming };
}
function powerLines(holder) {
  return asArray(holder["powers"]).map(asRecord).map((power) => ({ id: str(power["power_id"]), amount: numOrNull(power["amount"]) })).filter((power) => power.id.length > 0);
}
function attackIntents(enemy) {
  return asArray(enemy["intents"]).map(asRecord).flatMap((intent) => {
    const damage = numOrNull(intent["damage"]);
    if (damage === null) return [];
    return [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
  });
}
function enemyPowerText(power, knowledge) {
  const id = str(power["power_id"]);
  const info = knowledge.power(id);
  const amount = numOrNull(power["amount"]);
  const name = str(power["name"], info?.name ?? "");
  const debuff = bool(power["is_debuff"]) || info?.type === "Debuff";
  const text = [name, debuff ? "[debuff]" : ""].filter(Boolean).join(" ");
  const effect = info?.description ? truncate(info.description, 140) : "";
  return `${id}${amount === null ? "" : ` ${amount}`}${text || effect ? ` = ${text}${text && effect ? ": " : ""}${effect}` : ""}`;
}
function describePowers(holder, knowledge) {
  return asArray(holder["powers"]).map(asRecord).map((power) => {
    const id = str(power["power_id"]);
    const info = knowledge.power(id);
    const name = str(power["name"], info?.name ?? id);
    const amount = numOrNull(power["amount"]);
    const debuff = bool(power["is_debuff"]);
    const effect = info?.description ? ` (${truncate(info.description, 90)})` : "";
    return `${name}${amount === null ? "" : ` ${amount}`}${debuff ? " [debuff]" : ""}${effect}`;
  }).slice(0, 8);
}
function enemyViews(state, knowledge) {
  return asArray(state.raw["enemies"]).map((entry, fallbackIndex) => {
    const enemy = asRecord(entry);
    const id = str(enemy["enemy_id"]);
    const info = knowledge.monster(id);
    const { text, incoming } = describeIntents(enemy);
    return {
      key: `e${numOrNull(enemy["index"]) ?? fallbackIndex}`,
      index: numOrNull(enemy["index"]) ?? fallbackIndex,
      name: str(enemy["name"], info?.name ?? id),
      hp: numOrNull(enemy["current_hp"]),
      max_hp: numOrNull(enemy["max_hp"]),
      block: num(enemy["block"]),
      alive: enemy["is_alive"] !== false,
      powers: describePowers(enemy, knowledge),
      power_lines: powerLines(enemy),
      intents: text,
      attacks: attackIntents(enemy),
      incoming
    };
  });
}
function enemyJson(view) {
  return {
    key: view.key,
    name: view.name,
    hp: view.hp,
    block: view.block,
    alive: view.alive,
    intents: view.intents,
    powers: view.powers
  };
}
function dynamicValue(card, names) {
  for (const name of names) {
    for (const entry of asArray(card["dynamic_values"])) {
      const value = asRecord(entry);
      if (str(value["name"]) === name) {
        const current2 = numOrNull(value["current_value"]);
        if (current2 !== null) return { value: current2, isPreview: true };
        return { value: numOrNull(value["base_value"]), isPreview: false };
      }
    }
  }
  return { value: null, isPreview: false };
}
function handViews(state, knowledge) {
  return asArray(state.raw["hand"]).map((entry, fallbackIndex) => {
    const card = asRecord(entry);
    const cardId = str(card["card_id"]);
    const info = knowledge.card(cardId);
    const index = numOrNull(card["index"]) ?? fallbackIndex;
    const damage = dynamicValue(card, ["Damage", "CalculatedDamage", "DamagePerHit"]);
    const hits = Math.max(1, Math.round(dynamicValue(card, ["Repeat", "Hits"]).value ?? 1));
    const block = dynamicValue(card, ["Block", "CalculatedBlock"]).value;
    return {
      index,
      key: `c${index}`,
      card_id: cardId,
      name: str(card["name"], info?.name ?? cardId),
      type: info?.type ?? "",
      upgraded: bool(card["upgraded"]),
      cost: num(card["energy_cost"]),
      playable: bool(card["playable"]),
      unplayable_reason: typeof card["unplayable_reason"] === "string" ? str(card["unplayable_reason"]) : null,
      requires_target: bool(card["requires_target"]),
      valid_targets: asArray(card["valid_target_indices"]).map((value) => num(value)).filter((value) => Number.isFinite(value)),
      text: truncate(str(card["resolved_rules_text"]) || info?.description || "", 180),
      damage: damage.value,
      damageIsPreview: damage.isPreview,
      hits,
      block
    };
  });
}
function handCardJson(view) {
  return {
    key: view.key,
    name: view.name,
    type: view.type,
    upgraded: view.upgraded,
    cost: view.cost,
    playable: view.playable,
    unplayable_reason: view.unplayable_reason,
    text: view.text
  };
}
function potionViews(state, knowledge) {
  return asArray(state.raw["potions"]).map(asRecord).filter((potion) => bool(potion["occupied"])).map((potion, fallbackIndex) => {
    const slot = numOrNull(potion["index"]) ?? fallbackIndex;
    const id = str(potion["potion_id"]);
    const info = knowledge.potion(id);
    return {
      slot,
      key: `p${slot}`,
      potion_id: id,
      name: str(potion["name"], info?.name ?? id),
      text: truncate(fillPotionText(id, str(potion["description"]) || info?.description || ""), 140),
      can_use: bool(potion["can_use"]),
      can_discard: bool(potion["can_discard"]),
      requires_target: bool(potion["requires_target"]),
      valid_targets: asArray(potion["valid_target_indices"]).map((value) => num(value))
    };
  });
}
function playerJson(player, knowledge) {
  return {
    hp: numOrNull(player["current_hp"]),
    max_hp: numOrNull(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    stars: num(player["stars"]),
    powers: describePowers(player, knowledge),
    cards_played_this_turn: num(player["cards_played_this_turn"]),
    attacks_played_this_turn: num(player["attacks_played_this_turn"]),
    skills_played_this_turn: num(player["skills_played_this_turn"])
  };
}
function playerPowers(holder) {
  return powerLines(holder);
}
var init_narrow = __esm({
  "src/memory/narrow.ts"() {
    "use strict";
    init_potion_values();
    init_json();
  }
});

// src/knowledge/jev-hints.ts
import { readFileSync as readFileSync12 } from "node:fs";
function loadHints() {
  if (cached5) return cached5;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "jev-hints.json");
    cached5 = JSON.parse(readFileSync12(path, "utf8")).hints;
  } catch {
    cached5 = [];
  }
  return cached5;
}
function hintMatches(hint, query) {
  const w = hint.when;
  if (w.enemies && !w.enemies.some((id) => query.enemyIds.includes(id))) return false;
  if (w.fight && !w.fight.includes(query.fight)) return false;
  if (w.act && (query.act === null || !w.act.includes(query.act))) return false;
  if (w.hp_below_pct !== void 0 && !(query.hpPct < w.hp_below_pct)) return false;
  if (w.enemy_powers && !w.enemy_powers.some((id) => query.enemyPowers.includes(id))) return false;
  if (w.no_attack !== void 0 && w.no_attack !== query.noAttack) return false;
  return true;
}
function specificity(hint) {
  const w = hint.when;
  return (w.enemies ? 10 : 0) + Object.keys(w).length;
}
function selectHints(query, hints = loadHints(), max = MAX_HINTS) {
  return hints.map((hint, order) => ({ hint, order })).filter(({ hint }) => hintMatches(hint, query)).sort((a, b) => specificity(b.hint) - specificity(a.hint) || a.order - b.order).slice(0, max).map(({ hint }) => hint);
}
function hintText(hint, ascension) {
  return fillGuideFacts(fillDbNumbers(hint.text, ascension), ascension);
}
var MAX_HINTS, cached5;
var init_jev_hints = __esm({
  "src/knowledge/jev-hints.ts"() {
    "use strict";
    init_boss_clock();
    init_monster_db();
    init_files();
    MAX_HINTS = 5;
    cached5 = null;
  }
});

// src/reflex/start-loss.ts
function infernoCopies(state, amount) {
  if (amount <= 0) return 0;
  let most = INFERNO_MOST_PER_COPY;
  const cards = [...asArray(asRecord(state.raw["run"])["deck"]), ...asArray(asRecord(state.raw["combat"])["hand"])].map(asRecord);
  for (const card of cards.filter((entry) => str(entry["card_id"]) === "INFERNO")) {
    for (const value of asArray(card["dynamic_values"]).map(asRecord).filter((entry) => str(entry["name"]) === "InfernoPower")) {
      most = Math.max(most, num(value["base_value"]), num(value["current_value"]), num(value["enchanted_value"]));
    }
  }
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  for (const entry of ["draw", "discard", "exhaust"].flatMap((pile) => asArray(view[pile]).map(asRecord))) {
    if (!asArray(entry["card_ids"]).includes("INFERNO")) continue;
    for (const hit of str(entry["line"]).matchAll(/造成(\d+)点伤害|deal (\d+) damage/gi)) most = Math.max(most, Number(hit[1] ?? hit[2]));
  }
  return infernoCopiesOf(amount, most);
}
function startTurnHpLossOf2(state, inferno, mantle) {
  return infernoCopies(state, inferno) + mantleHpCost(mantle);
}
var init_start_loss = __esm({
  "src/reflex/start-loss.ts"() {
    "use strict";
    init_json();
    init_turn_solver();
  }
});

// src/reflex/jev/answers.ts
function topAlternatives(answer, limit2) {
  return Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a).slice(0, limit2).map(([option, probability]) => ({ option, probability }));
}
var init_answers = __esm({
  "src/reflex/jev/answers.ts"() {
    "use strict";
    init_json();
  }
});

// src/reflex/damage.ts
function has(powers, id) {
  return powers.some((power) => power.id === id && (power.amount === null || power.amount > 0));
}
function resolveDamage(input) {
  const vulnerable = has(input.targetPowers, VULNERABLE);
  const weak = has(input.attackerPowers, WEAK);
  const intangible = has(input.targetPowers, INTANGIBLE);
  const modifiers = [];
  if (vulnerable) modifiers.push("target is Vulnerable: x1.5");
  if (weak) modifiers.push("attacker is Weak: x0.75");
  if (intangible) modifiers.push("target is Intangible: each hit reduced to 1");
  const hits = Math.max(1, Math.floor(input.hits));
  let block = Math.max(0, input.targetBlock);
  let hpLoss = 0;
  let total = 0;
  for (let index = 0; index < hits; index += 1) {
    let hit = input.perHit;
    if (vulnerable) hit = Math.floor(hit * 1.5);
    if (weak) hit = Math.floor(hit * 0.75);
    if (intangible) hit = Math.min(hit, 1);
    if (hit < 0) hit = 0;
    total += hit;
    const absorbed = Math.min(block, hit);
    block -= absorbed;
    hpLoss += hit - absorbed;
  }
  return { hpLoss, blockAfter: block, total, modifiers };
}
var VULNERABLE, WEAK, INTANGIBLE;
var init_damage = __esm({
  "src/reflex/damage.ts"() {
    "use strict";
    VULNERABLE = "VULNERABLE_POWER";
    WEAK = "WEAK_POWER";
    INTANGIBLE = "INTANGIBLE_POWER";
  }
});

// src/reflex/combat.ts
function describeOption(summary) {
  return summary;
}
function planCombat(env) {
  const { state, knowledge, brief, thresholds } = env;
  const strict = env.strictJev;
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  if (readiness["can_use_combat_actions"] === false) return null;
  if (!state.available_actions.includes("play_card") && !state.available_actions.includes("end_turn")) return null;
  const player = asRecord(combat["player"]);
  const energy = num(player["energy"]);
  const stars = num(player["stars"]);
  const playerBlock = num(player["block"]);
  const playerHp = numOrNull(player["current_hp"]);
  const playerMaxHp = numOrNull(player["max_hp"]);
  const enemies = enemyViews({ raw: combat }, knowledge);
  const living = enemies.filter((enemy) => enemy.alive);
  const ourPowers = playerPowers(player);
  const incomingOutcome = (() => {
    let block = playerBlock;
    let hpLoss = 0;
    let total = 0;
    const modifiers = /* @__PURE__ */ new Set();
    for (const enemy of living) {
      for (const attack of enemy.attacks) {
        const outcome = resolveDamage({
          perHit: attack.damage,
          hits: attack.hits,
          targetBlock: block,
          // The intent number already includes our Vulnerable and the enemy's Weak (WY41 F48 T4: the
          // intent showed 22, this path said 33).
          targetPowers: ourPowers.filter((power) => power.id !== "VULNERABLE_POWER"),
          attackerPowers: enemy.power_lines.filter((power) => power.id !== "WEAK_POWER")
        });
        block = outcome.blockAfter;
        hpLoss += outcome.hpLoss;
        total += outcome.total;
        for (const note of outcome.modifiers) modifiers.add(note);
      }
    }
    return { hpLoss, total, modifiers: [...modifiers], blockAfter: block };
  })();
  const heldModels = asArray(combat["hand"]).map((entry, fallbackIndex) => modelHandCard(entry, fallbackIndex, knowledge, str(asRecord(state.run?.raw)["character_id"])));
  const heldPenaltyOf2 = new Map(heldModels.map((model2) => [model2.index, model2.heldPenalty ?? 0]));
  const heldHpLoss = heldModels.reduce((sum, model2) => sum + (model2.heldHpLoss ?? 0), 0);
  const heldDamage = heldModels.reduce((sum, model2) => sum + Math.max(0, (model2.heldPenalty ?? 0) - (model2.heldHpLoss ?? 0)), 0);
  const mantle = ourPowers.find((power) => power.id === "CRIMSON_MANTLE_POWER")?.amount ?? 0;
  const inferno = ourPowers.find((power) => power.id === "INFERNO_POWER")?.amount ?? 0;
  const startTurnHpLoss = startTurnHpLossOf2(state, inferno, mantle);
  const incoming = incomingOutcome.hpLoss + Math.max(0, heldDamage - incomingOutcome.blockAfter) + heldHpLoss + startTurnHpLoss;
  const endTurnWouldKill = bool(combat["end_turn_will_kill_player"]) || playerHp !== null && incoming >= playerHp;
  const hand = handViews({ raw: combat }, knowledge);
  const potions = potionViews({ raw: asRecord(state.run?.raw) }, knowledge);
  const candidates = [];
  const enemyByIndex = new Map(enemies.map((enemy) => [enemy.index, enemy]));
  const hpCostByIndex = new Map(
    asArray(combat["hand"]).map((entry, fallbackIndex) => {
      const model2 = modelHandCard(entry, fallbackIndex, knowledge, str(asRecord(state.run?.raw)["character_id"]));
      return [model2.index, model2.hpLoss];
    })
  );
  const pushCard = (card, targetIndex, into = candidates, budget = energy) => {
    const target = targetIndex === null ? null : enemyByIndex.get(targetIndex) ?? null;
    const perHit = card.damage;
    const outcome = perHit === null || target === null ? null : resolveDamage({
      perHit,
      hits: card.hits,
      targetBlock: target.block,
      targetPowers: target.power_lines,
      attackerPowers: card.damageIsPreview ? ourPowers.filter((power) => power.id !== "WEAK_POWER") : ourPowers
    });
    const totalDamage = outcome?.total ?? (perHit === null ? null : perHit * card.hits);
    const damageAfterBlock = outcome?.hpLoss ?? null;
    const hpAfter = damageAfterBlock === null || target?.hp === null || target?.hp === void 0 ? null : target.hp - damageAfterBlock;
    const kills = hpAfter !== null && hpAfter <= 0;
    const isLastEnemy = kills && living.length === 1;
    const blockGain = card.block ?? 0;
    const hpCost = hpCostByIndex.get(card.index) ?? 0;
    const incomingAfter = Math.max(0, incoming - (heldPenaltyOf2.get(card.index) ?? 0) - blockGain) + hpCost;
    if (hpCost > 0 && playerHp !== null && hpCost >= playerHp) return;
    const key = targetIndex === null ? card.key : `${card.key}->e${targetIndex}`;
    const summary = {
      action: target === null ? `Play ${card.name}` : `Play ${card.name} on ${target.name}`,
      cost: `${card.cost} energy`,
      text: card.text
    };
    if (totalDamage !== null) {
      summary["damage"] = totalDamage;
      if (card.hits > 1) summary["hits"] = card.hits;
    }
    if (damageAfterBlock !== null && target?.hp !== null && target?.hp !== void 0) {
      summary["target_hp"] = `${target.hp} -> ${Math.max(0, hpAfter ?? 0)}`;
      summary["damage_after_block"] = damageAfterBlock;
      summary["kills_target"] = kills;
      if (outcome && outcome.modifiers.length > 0) summary["modifiers"] = outcome.modifiers.join("; ");
    }
    if (card.hits > 1 && totalDamage !== null) summary["total_damage"] = totalDamage;
    if (blockGain > 0) summary["block_gained"] = blockGain;
    if (hpCost > 0) summary["hp_cost"] = hpCost;
    summary["incoming_damage_after_this"] = incomingAfter;
    if (card.cost > budget) summary["warning"] = "costs more energy than you have";
    if (stars > 0) summary["stars_after"] = stars;
    const score = (isLastEnemy ? 1e5 : 0) + (kills ? 500 : 0) + (damageAfterBlock ?? 0) * 3 + (incoming > 0 ? blockGain * 2 : 0) + (card.cost > budget ? -1e3 : 0) - hpCost * 3;
    into.push({ key, intent: targetIndex === null ? { action: "play_card", card_index: card.index } : { action: "play_card", card_index: card.index, target_index: targetIndex }, summary, score, isEndTurn: false, lethal: kills });
  };
  for (const card of hand) {
    if (!card.playable) continue;
    if (card.requires_target) {
      for (const targetIndex of card.valid_targets) pushCard(card, targetIndex);
    } else {
      pushCard(card, null);
    }
  }
  const rawHand = asArray(combat["hand"]).map(asRecord);
  const locked = hand.filter((card) => !card.playable && rawHand.some((entry) => numOrNull(entry["index"]) === card.index && afterPlayFirst(entry)));
  const first = locked.length > 0 ? hand.find((card) => card.playable && isPlayFirst(card.card_id, card.text)) : void 0;
  if (first) {
    const left = energy - first.cost;
    const after = [];
    for (const card of locked) {
      if (card.requires_target) {
        for (const targetIndex of card.valid_targets) pushCard(card, targetIndex, after, left);
      } else {
        pushCard(card, null, after, left);
      }
    }
    const best2 = Math.max(...after.map((candidate) => candidate.score));
    for (const candidate of candidates.filter((entry) => entry.intent.action === "play_card" && entry.intent.card_index === first.index)) {
      candidate.summary["unlocks"] = `nothing else can be played while it is in the hand; once it is played: ${[...new Set(locked.map((card) => card.name))].join(", ")} (${left} energy left)`;
      if (best2 > candidate.score) candidate.score = best2;
    }
  }
  for (const potion of potions) {
    if (!potion.can_use) continue;
    const targets = potion.requires_target ? potion.valid_targets : [null];
    for (const targetIndex of targets) {
      const target = targetIndex === null ? null : enemyByIndex.get(targetIndex) ?? null;
      const key = targetIndex === null ? potion.key : `${potion.key}->e${targetIndex}`;
      candidates.push({
        key,
        intent: targetIndex === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: targetIndex },
        summary: {
          action: target === null ? `Drink ${potion.name}` : `Drink ${potion.name} on ${target.name}`,
          text: potion.text,
          simulated: "no: this potion's effect is not in any number here",
          note: endTurnWouldKill ? "emergency: the mod reports that ending the turn would be lethal" : "uses a consumable; only worth it if it changes the outcome"
        },
        // A consumable is never the code-side default unless the turn is lethal, and even then it only
        // has to beat `end_turn` — a real play (block or a kill) still outranks it. Jev may pick a
        // potion whenever it judges one worthwhile.
        score: endTurnWouldKill ? 5 : -50,
        isEndTurn: false,
        lethal: false
      });
    }
  }
  const endTurnScore = endTurnWouldKill ? -1e6 : incoming === 0 ? 10 : -incoming;
  candidates.push({
    key: "end_turn",
    intent: { action: "end_turn" },
    summary: {
      action: "End the turn",
      incoming_damage: incoming,
      hp_after_enemy_turn: playerHp === null ? null : playerHp - incoming,
      block: playerBlock,
      lethal: endTurnWouldKill,
      note: endTurnWouldKill ? "the mod reports that ending the turn now would kill the player" : incoming === 0 ? "no incoming damage is visible" : "the enemy turn will resolve"
    },
    score: endTurnScore,
    isEndTurn: true,
    lethal: endTurnWouldKill
  });
  const safeCandidates = !strict && endTurnWouldKill && candidates.length > 1 ? candidates.filter((candidate) => !candidate.isEndTurn) : candidates;
  if (safeCandidates.length === 0) return null;
  if (safeCandidates.length === 1 && safeCandidates[0]?.isEndTurn) {
    return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
  }
  const byKey = new Map(safeCandidates.map((candidate) => [candidate.key, candidate]));
  const criteria = {};
  for (const candidate of safeCandidates) criteria[candidate.key] = JSON.stringify(describeOption(candidate.summary));
  const questionState = {
    run_brief: briefJson(brief),
    situation: {
      screen: "COMBAT",
      turn: state.turn,
      hp: playerHp === null ? null : `${playerHp}/${playerMaxHp ?? "?"}`,
      block: playerBlock,
      energy,
      stars,
      enemies_alive: living.length,
      incoming_damage_if_turn_ends: incoming,
      ending_turn_would_kill_me: endTurnWouldKill,
      warning: endTurnWouldKill ? "the mod reports that ending the turn now would kill the player" : null,
      cards_played_this_turn: num(player["cards_played_this_turn"])
    },
    player: playerJson(player, knowledge),
    enemies: living.map(enemyJson),
    hand: hand.map(handCardJson),
    potions: potions.map((potion) => ({ key: potion.key, name: potion.name, text: potion.text, can_use: potion.can_use })),
    note: "Each option below already states its computed effect. Do not recompute it.",
    // SL (docs/sl.md): how the earlier attempts at this fight went (a retried fight only).
    ...env.sl ? { previous_attempts: env.sl.previousAttempts } : {}
  };
  const best = (pool) => pool.reduce((a, b) => b.score > a.score ? b : a);
  const fallbackResolve = (why, confidence) => {
    const choice = best(safeCandidates);
    return {
      intent: choice.intent,
      rationale: `${why}; deterministic fallback chose ${choice.key} (${str(choice.summary["action"])})`,
      confidence,
      fallback: true
    };
  };
  return {
    kind: "ask",
    label: "combat/play",
    state: questionState,
    questions: {
      play: choiceQ("Which single action should I take right now?", criteria),
      survival: choiceQ("If the enemy turn starts after my action, what is the worst realistic outcome?", {
        safe: "I take little or no damage",
        manageable: "I take damage but stay comfortably alive",
        dangerous: "I could drop low enough that the next turn is a problem",
        lethal: "I would probably die"
      })
    },
    resolve(answers) {
      const answer = answers["play"];
      const unusable = (why) => strict ? { intent: null, rationale: `${why} (trust-jev: waiting to ask again instead of choosing in code)`, confidence: null, fallback: false } : fallbackResolve(why, null);
      if (!answer || answer.type !== "choice") return unusable("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return unusable(`Jev chose unknown option "${answer.choice}"`);
      if (strict) {
        return {
          intent: chosen.intent,
          rationale: `Jev chose ${chosen.key} (${str(chosen.summary["action"])}) with confidence ${answer.confidence.toFixed(2)}`,
          confidence: answer.confidence,
          fallback: false
        };
      }
      const survival = answers["survival"];
      const survivalChoice = survival?.type === "choice" ? survival.choice : null;
      if (chosen.isEndTurn && endTurnWouldKill) {
        return fallbackResolve("end_turn would be lethal and the mod flagged it, overriding", answer.confidence);
      }
      if (chosen.isEndTurn && survivalChoice === "lethal" && survival.confidence >= thresholds.strong) {
        const alternative = best(safeCandidates.filter((candidate) => !candidate.isEndTurn));
        return {
          intent: alternative.intent,
          rationale: `Jev rated the incoming turn as lethal (${survival.confidence.toFixed(2)}) instead of ending the turn`,
          confidence: answer.confidence,
          fallback: true
        };
      }
      if (answer.confidence < thresholds.act && safeCandidates.length > 2) {
        const keys = [];
        const seen = /* @__PURE__ */ new Set();
        for (const entry of topAlternatives(answer, 3)) {
          if (byKey.has(entry.option) && !seen.has(entry.option)) {
            seen.add(entry.option);
            keys.push(entry.option);
          }
        }
        for (const candidate of [...safeCandidates].sort((a, b) => b.score - a.score)) {
          if (keys.length >= 4) break;
          if (!seen.has(candidate.key)) {
            seen.add(candidate.key);
            keys.push(candidate.key);
          }
        }
        const shortlist = keys.map((key) => byKey.get(key)).filter((candidate) => candidate !== void 0);
        if (shortlist.length >= 2) {
          return {
            intent: null,
            rationale: `confidence ${answer.confidence.toFixed(2)} is below the act threshold; re-asking on the shortlist`,
            confidence: answer.confidence,
            fallback: false,
            reask: {
              instructions: "Which single action should I take right now? (shortlist)",
              criteria: Object.fromEntries(shortlist.map((candidate) => [candidate.key, JSON.stringify(candidate.summary)])),
              map: Object.fromEntries(shortlist.map((candidate) => [candidate.key, candidate.intent])),
              fallbackIntent: best(safeCandidates).intent,
              fallbackRationale: "shortlist answer was still below the act threshold; using the code choice",
              actThreshold: thresholds.act
            }
          };
        }
      }
      if (answer.confidence < thresholds.act) {
        return fallbackResolve(`confidence ${answer.confidence.toFixed(2)} is below the act threshold`, answer.confidence);
      }
      return {
        intent: chosen.intent,
        rationale: `Jev chose ${chosen.key} (${str(chosen.summary["action"])}) with confidence ${answer.confidence.toFixed(2)}`,
        confidence: answer.confidence,
        fallback: false
      };
    }
  };
}
var init_combat = __esm({
  "src/reflex/combat.ts"() {
    "use strict";
    init_answers();
    init_questions();
    init_narrow();
    init_narrow();
    init_run_brief();
    init_card_model();
    init_damage();
    init_start_loss();
    init_json();
  }
});

// src/memory/deck-profile.ts
var init_deck_profile = __esm({
  "src/memory/deck-profile.ts"() {
    "use strict";
    init_card_model();
    init_json();
    init_deck();
  }
});

// src/memory/run-plan.ts
var RUN_PLAN_BRIEF, RUN_PLAN_FORMAT, RUN_PLAN_TASK;
var init_run_plan = __esm({
  "src/memory/run-plan.ts"() {
    "use strict";
    init_deck();
    init_deck_profile();
    init_boss_clock();
    init_boss_phase();
    init_json();
    RUN_PLAN_BRIEF = [
      "You set the STRATEGY for the rest of this act and run; code and a small model will apply it to card rewards, shops,",
      "removals, map routes and rest sites, and will play every card themselves. Look at the deck, relics, HP, gold, potions,",
      "the act boss and the map ahead (memory.lookahead). Name what this deck needs to beat the act boss and survive the act.",
      "act_boss_clock gives the boss's HP at this ascension (heals and wasted hits included), the turns you survive at its",
      "logged damage and so the turns the fight can last, the damage a turn that needs, and code's estimate of this deck's",
      "damage a turn in that fight (calibrated on logged A8 boss fights; Strength growth and the boss mechanic in harder_because",
      "counted). If gap_per_turn > 0, closing it comes first: want Strength/scaling and high-damage cards (AoE for two-part",
      "bosses), remove Strikes/Defends that dilute them, smith attacks; state the gap in the summary. A gap of 0 is not a reason",
      "to stop adding damage: the estimate's typical error is ~25%."
    ].join(" ");
    RUN_PLAN_FORMAT = [
      '{"archetype": "<the deck direction, max 12 words>",',
      '"want": [card ids to pick when offered, most important first, max 6],',
      '"avoid": [card ids not to take, max 6], "remove": [card ids in the deck to remove first, max 3],',
      '"block_target": <number of block cards the deck should hold by the act boss>,',
      '"elites": "seek" | "normal" | "avoid", "rest": "heal" | "smith" | "auto",',
      '"boss_prep": "<max 30 words: what to have ready for the act boss>",',
      '"summary": "<max 40 words: the plan in plain words>"}'
    ].join(" ");
    RUN_PLAN_TASK = [
      "TASK: run plan (not an option choice; ignore the {choice, reason} reply format for this one).",
      RUN_PLAN_BRIEF,
      `Reply with JSON only: ${RUN_PLAN_FORMAT}`
    ].join(" ");
  }
});

// src/memory/run-journal.ts
var init_run_journal = __esm({
  "src/memory/run-journal.ts"() {
    "use strict";
    init_experience();
    init_monster_db();
    init_files();
    init_boss_clock();
    init_run_plan();
    init_json();
    init_deck();
    init_deck_profile();
  }
});

// src/memory/fight-plan.ts
function fightKey(state) {
  return `${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
}
function fightPlanJson(plan) {
  return {
    approach: plan.approach,
    setup_first: plan.setup,
    kill_first: plan.focus ?? "",
    potions: plan.potions,
    dangerous_turns: plan.keyTurns,
    summary: plan.summary
  };
}
function planOffersPotion(plan, potionId, ctx) {
  const use = plan?.potions[potionId];
  if (!use || use === "any") return null;
  if (use === "big_hit" && ctx.offensive) return null;
  if (ctx.pressed) return true;
  if (ctx.costly && use !== "save" && use !== "big_hit") return true;
  if (use === "early") return ctx.turn <= 2 ? true : null;
  if (use === "big_hit") return ctx.bigHit;
  return false;
}
function planFit(plan, steps, focusDamage) {
  const parts = [];
  const setup = steps.filter((step) => plan.setup.includes(step.cardId)).map((step) => step.name);
  if (setup.length > 0) parts.push(`plays planned setup ${setup.join(", ")}`);
  if (plan.focus && focusDamage !== null && focusDamage > 0) parts.push(`${focusDamage} damage to the kill-first enemy`);
  const drinks2 = steps.filter((step) => step.cardId.startsWith("POTION:"));
  for (const step of drinks2) {
    const use = plan.potions[step.cardId.split(":")[1] ?? ""];
    if (use === "save" || use === "emergency") parts.push(`drinks ${step.name.replace(/^potion /, "")} the plan keeps for ${use === "save" ? "a later fight" : "an emergency"}`);
  }
  return parts.length > 0 ? parts.join("; ") : "neutral";
}
var FIGHT_PLAN_TASK;
var init_fight_plan = __esm({
  "src/memory/fight-plan.ts"() {
    "use strict";
    init_deck();
    init_run_journal();
    init_json();
    init_potion_values();
    FIGHT_PLAN_TASK = [
      "TASK: fight plan (not an option choice; ignore the {choice, reason} reply format for this one).",
      "An elite or boss fight is starting. Every turn will be played by code (an exact one-turn solver) and a small model;",
      "both only see the current turn. Give them the plan for the WHOLE fight: the things one-turn play misses",
      "(when to set up powers vs. race, which enemy to kill first, which potion is for which moment, the turns to fear).",
      "Use the enemies' move cycles and your knowledge of this fight. Keep HP: the run continues after this fight.",
      'Reply with JSON only: {"approach": "race" | "setup" | "defend",',
      '"setup_cards": [card ids from the deck to play in the first turns, most important first, max 3; [] for none],',
      '"focus_enemy": "<enemy_id to kill first, or empty>",',
      '"potions": {"<potion id>": "early" | "big_hit" | "emergency" | "save" | "any"} for EVERY potion listed',
      "(early = drink in turns 1-2; big_hit = drink on the turn of a big attack; emergency = only if HP gets low;",
      "save = keep for a later fight; any = no preference),",
      '"key_turns": "<max 30 words: the dangerous turns and what to do on them>",',
      '"summary": "<max 40 words: the plan in plain words>"}'
    ].join(" ");
  }
});

// src/reflex/permafrost.ts
function observePermafrost(memory, state) {
  const previous = JSON.stringify(memory.permafrost);
  const run = asRecord(state.run?.raw);
  const runId = str(state.raw["run_id"]);
  if (!runId || runId === "run_unknown") return false;
  if (!state.in_combat || str(run["character_id"]).toLowerCase() !== "silent" || !asArray(run["relics"]).some((entry) => str(asRecord(entry)["relic_id"]) === "PERMAFROST")) {
    memory.permafrost = void 0;
    return previous !== JSON.stringify(memory.permafrost);
  }
  if (state.combat?.can_use_combat_actions === false || state.turn === null) return false;
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const counter = (key) => {
    const n = player[key];
    return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
  };
  const cards = counter("cards_played_this_turn");
  const attacks = counter("attacks_played_this_turn");
  const skills = counter("skills_played_this_turn");
  const fight = `${runId}:${fightKey(state)}`;
  const last = memory.permafrost;
  if (!last || last.fight !== fight || state.turn < last.turn || state.turn === 1 && last.turn === 1 && cards !== null && cards < (last.cards ?? 0)) {
    memory.permafrost = { fight, turn: state.turn, cards, status: state.turn === 1 && cards === 0 ? "armed" : "unknown" };
  }
  const memo = memory.permafrost;
  if (memo.status === "armed" && (cards === null || attacks === null || skills === null || cards !== attacks + skills || state.turn > memo.turn + 1)) {
    memo.status = "unknown";
  }
  memo.turn = state.turn;
  memo.cards = cards;
  return previous !== JSON.stringify(memory.permafrost);
}
function permafrostBlock(memory, state) {
  observePermafrost(memory, state);
  return memory.permafrost?.status === "armed" ? PERMAFROST_BLOCK : void 0;
}
var PERMAFROST_BLOCK;
var init_permafrost = __esm({
  "src/reflex/permafrost.ts"() {
    "use strict";
    init_json();
    init_fight_plan();
    init_card_model();
    PERMAFROST_BLOCK = 7;
  }
});

// src/reflex/fight-plays.ts
function observedWither(state) {
  return state.in_combat && str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && asArray(asRecord(state.raw["combat"])["enemies"]).some((entry) => {
    const enemy = asRecord(entry);
    return enemy["is_alive"] !== false && asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "WITHERING_PRESENCE_POWER" && num(asRecord(power)["amount"]) > 0);
  });
}
function observedSlothReplay(state) {
  const run = asRecord(state.run?.raw);
  return state.in_combat && str(run["character_id"]).toLowerCase() === "silent" && num(run["ascension"]) === 10 && asArray(asRecord(asRecord(state.raw["combat"])["player"])["powers"]).some((entry) => {
    const power = asRecord(entry);
    return str(power["power_id"]) === "SLOTH_POWER" && num(power["amount"]) === 3;
  });
}
function recordStateFightPlays(memory, state, played) {
  const fight = `${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
  const runId = str(state.raw["run_id"]);
  const tracked = observedWither(state) || observedSlothReplay(state);
  const previous = memory.fightCards;
  const last = previous?.last;
  const actionable = state.combat?.can_use_combat_actions !== false && state.turn !== null;
  const restarted = tracked && actionable && last && (state.turn < last.turn || state.turn === last.turn && played < last.played);
  if (!previous || previous.fight !== fight || tracked && previous.runId && previous.runId !== runId || restarted) {
    memory.fightCards = { fight, perTurn: {}, witherDamage: 3 };
  }
  const memo = memory.fightCards;
  if (tracked && !actionable) return memo;
  const turn = String(state.turn ?? "?");
  memo.perTurn[turn] = Math.max(memo.perTurn[turn] ?? 0, played);
  if (tracked) {
    memo.runId = runId;
    memo.last = { turn: state.turn, played };
    for (const entry of asArray(asRecord(state.raw["combat"])["hand"])) {
      const card = asRecord(entry);
      if (str(card["card_id"]) === "WITHER") {
        memo.witherDamage = Math.max(memo.witherDamage, heldPenaltyOf(str(card["resolved_rules_text"])).heldPenalty);
      }
    }
  }
  return memo;
}
var init_fight_plays = __esm({
  "src/reflex/fight-plays.ts"() {
    "use strict";
    init_json();
    init_card_model();
  }
});

// src/knowledge/outcome-facts.ts
var init_outcome_facts = __esm({
  "src/knowledge/outcome-facts.ts"() {
    "use strict";
    init_experience();
    init_outcome_tables();
  }
});

// src/brain/labels.ts
var init_labels = __esm({
  "src/brain/labels.ts"() {
    "use strict";
  }
});

// src/hand/screens/potion-discard.ts
var init_potion_discard = __esm({
  "src/hand/screens/potion-discard.ts"() {
    "use strict";
    init_questions();
    init_potion_values();
    init_json();
  }
});

// src/hand/screens/pick.ts
var init_pick = __esm({
  "src/hand/screens/pick.ts"() {
    "use strict";
    init_questions();
    init_outcome_facts();
    init_json();
    init_labels();
    init_potion_discard();
  }
});

// src/knowledge/double-boss.ts
import { readFileSync as readFileSync13 } from "node:fs";
function loadDoubleBossModel() {
  if (!doubleBossSource.enabled || knowledgeCharacter() !== "silent") return null;
  const path = knowledgeFile(doubleBossSource.dir, "double-boss.json");
  if (cached6?.path === path) return cached6.model;
  let model2 = null;
  try {
    const raw = JSON.parse(readFileSync13(path, "utf8"));
    if (raw.character === "silent" && raw.ascension === 10 && raw.act === 3 && raw.firstFloor === 48 && raw.secondFloor === 49 && raw.effect === "LEVEL_10" && raw.evidence?.length > 0 && typeof raw.value?.source === "string" && raw.value.hp?.length > 1 && raw.value.hp.every(([x, y], i, xs) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && (i === 0 || x > xs[i - 1][0] && y >= xs[i - 1][1])) && raw.secondBosses?.length > 0 && raw.secondBosses.every((b) => typeof b.boss === "string" && Number.isInteger(b.count) && b.count > 0) && raw.potionHp && Object.values(raw.potionHp).every((v) => Number.isFinite(v) && v >= 0) && Number.isFinite(raw.poisonPotionAmount) && raw.poisonPotionAmount > 0) model2 = raw;
  } catch {
  }
  cached6 = { path, model: model2 };
  return model2;
}
function doubleBossFor(state, model2 = loadDoubleBossModel()) {
  const run = asRecord(state.run?.raw);
  if (!model2 || str(run["character_id"]).toLowerCase() !== model2.character || state.run?.ascension !== model2.ascension || Number(run["act_id"]) + 1 !== model2.act || !asArray(run["ascension_effects"]).some((e) => str(asRecord(e)["id"]) === model2.effect)) return null;
  return model2;
}
function firstDoubleBoss(state, model2 = loadDoubleBossModel()) {
  const scoped = doubleBossFor(state, model2);
  return scoped && state.run?.floor === scoped.firstFloor ? scoped : null;
}
var doubleBossSource, cached6;
var init_double_boss = __esm({
  "src/knowledge/double-boss.ts"() {
    "use strict";
    init_json();
    init_files();
    doubleBossSource = { dir: KNOWLEDGE_DIR, enabled: true };
  }
});

// src/brain/build-facts.ts
var init_build_facts = __esm({
  "src/brain/build-facts.ts"() {
    "use strict";
    init_relic_values();
    init_potion_values();
    init_deck_profile();
    init_json();
    init_boss_clock();
    init_double_boss();
    init_boss_phase();
    init_fight_plan();
    init_run_plan();
  }
});

// src/hand/screens/oneshot.ts
var init_oneshot = __esm({
  "src/hand/screens/oneshot.ts"() {
    "use strict";
    init_card_upgrades();
    init_outcome_facts();
    init_enchant_text();
    init_deck();
    init_json();
  }
});

// src/hand/screens/selection.ts
var init_selection = __esm({
  "src/hand/screens/selection.ts"() {
    "use strict";
    init_json();
    init_run_plan();
    init_deck();
    init_run_brief();
    init_pick();
    init_build_facts();
    init_card_value();
    init_move_model();
    init_card_model();
    init_combat_plan();
    init_oneshot();
    init_outcome_facts();
    init_card_model();
  }
});

// src/sim/route-map.ts
var init_route_map = __esm({
  "src/sim/route-map.ts"() {
    "use strict";
    init_route_projection();
  }
});

// src/hand/screens/route-plan.ts
var init_route_plan = __esm({
  "src/hand/screens/route-plan.ts"() {
    "use strict";
    init_json();
    init_route_map();
    init_route_projection();
  }
});

// src/hand/screens/map.ts
var STATUE_ROUTE_LOST, STATUE_ROUTE_NOTE, STATUE_DRINK_ONLY_NOTE;
var init_map = __esm({
  "src/hand/screens/map.ts"() {
    "use strict";
    init_questions();
    init_json();
    init_run_plan();
    init_run_brief();
    init_pick();
    init_build_facts();
    init_route_projection();
    init_route_map();
    init_route_plan();
    init_oneshot();
    init_potion_discard();
    init_route_plan();
    STATUE_ROUTE_LOST = "\u767D\u517D\u96D5\u50CF\uFF1A\u6BCF\u573A\u6218\u6597\u540E\u5FC5\u6389\u4E00\u74F6\u836F\u6C34\uFF0C\u836F\u6C34\u680F\u5DF2\u6EE1\u4E14\u5956\u52B1\u754C\u9762\u4E0D\u80FD\u6254\u836F\u6C34\uFF0C\u6240\u4EE5\u8DEF\u7EBF\u7B2C\u4E00\u6B65\u82E5\u662F\u6218\u6597\uFF08\u6216\u95EE\u53F7\u623F\u91CC\u7684\u6218\u6597\uFF09\uFF0C\u90A3\u74F6\u836F\u6C34\u4F1A\u4E22\u5931\uFF0C";
    STATUE_ROUTE_NOTE = `${STATUE_ROUTE_LOST}\u9664\u975E\u5148\u6254\uFF1A\u53EF\u4EE5\u5728\u56DE\u7B54\u91CC\u52A0 "discard": [\u836F\u6C34\u69FD\u7F16\u53F7]\uFF08\u89C1 discardable_potions\uFF09\uFF0C\u4EE3\u7801\u5148\u6254\u518D\u8D70\uFF1B\u4E0D\u6254\u5C31\u4E0D\u5199\u3002`;
    STATUE_DRINK_ONLY_NOTE = `${STATUE_ROUTE_LOST}\u9664\u975E\u5148\u559D\u6389\u4E00\u74F6\u5730\u56FE\u4E0A\u80FD\u559D\u7684\u836F\u6C34\uFF1A\u5728\u56DE\u7B54\u91CC\u52A0 "drink": [\u836F\u6C34\u69FD\u7F16\u53F7]\uFF08\u4E00\u4E2A\uFF0C\u89C1 drinkable_potions\uFF09\uFF0C\u4EE3\u7801\u5148\u559D\u518D\u8D70\uFF1B\u4E0D\u559D\u5C31\u4E0D\u5199\u3002`;
  }
});

// src/hand/screens/route-review.ts
var init_route_review = __esm({
  "src/hand/screens/route-review.ts"() {
    "use strict";
    init_json();
    init_route_map();
    init_map();
    init_oneshot();
    init_route_plan();
  }
});

// src/hand/screens/rest.ts
function forcedEliteWithin(memory, state, roomTypes, depth) {
  const map = memory.lastMap;
  const floor = state.run?.floor ?? null;
  if (!map || map.runId !== str(state.raw["run_id"]) || floor === null || map.floor !== floor - 1) return false;
  const nodeAt = (point) => map.nodes.find((node) => node.row === point.row && node.col === point.col);
  const rooms = map.available.filter((node) => roomTypes.includes(node.type)).map(nodeAt);
  if (rooms.length === 0) return false;
  const reaches = (node, left) => node.children.length > 0 && node.children.every((child) => {
    const next = nodeAt(child);
    if (!next) return false;
    if (next.type === "Elite") return true;
    if (ELITE_ESCAPES.includes(next.type) || left <= 1) return false;
    return reaches(next, left - 1);
  });
  return rooms.every((room) => room !== void 0 && reaches(room, depth));
}
var ELITE_ESCAPES;
var init_rest = __esm({
  "src/hand/screens/rest.ts"() {
    "use strict";
    init_json();
    init_boss_clock();
    init_run_plan();
    init_deck();
    init_run_brief();
    init_pick();
    init_build_facts();
    init_oneshot();
    init_selection();
    init_map();
    init_route_review();
    init_route_plan();
    init_route_projection();
    init_potion_discard();
    init_outcome_facts();
    ELITE_ESCAPES = ["RestSite", "Rest", "Shop"];
  }
});

// src/sim/compute-memo.ts
import { createHash } from "node:crypto";
import { deserialize, serialize } from "node:v8";
function computeMemoFor(scope) {
  if (!computeMemoOptions.enabled) return null;
  if (current?.scope !== scope) current = new ComputeMemo(scope);
  return current;
}
function dropComputeMemo() {
  current = null;
}
function identityToken(value) {
  if (value === null || value === void 0) return null;
  let token = tokens.get(value);
  if (token === void 0) {
    token = nextToken;
    nextToken += 1;
    tokens.set(value, token);
  }
  return token;
}
function switches() {
  return `${[ascAmountOptions.enabled, playFirstOptions.enabled, pileCostOptions.relics, potionCardCostOptions.relics, passivePiecesOptions.enabled, potionCostOptions.enabled, cardConditionOptions.enabled].map((on) => on ? 1 : 0).join("")}:${dataVersion()}`;
}
function canonicalText(value) {
  const seen = /* @__PURE__ */ new Map();
  return JSON.stringify(value, function(key, v) {
    const raw = this[key];
    if (raw !== null && typeof raw === "object") {
      const at2 = seen.get(raw);
      if (at2 !== void 0) return { [TAG]: "ref", at: at2 };
      seen.set(raw, seen.size);
    }
    if (raw instanceof Map) return { [TAG]: "map", entries: [...raw.entries()] };
    if (raw instanceof Set) return { [TAG]: "set", values: [...raw.values()] };
    if (raw instanceof Date) return { [TAG]: "date", time: raw.getTime() };
    if (ArrayBuffer.isView(raw)) return { [TAG]: raw.constructor.name, values: Array.from(raw) };
    if (v === void 0) return { [TAG]: "undefined" };
    if (typeof v === "number") {
      if (Number.isNaN(v)) return { [TAG]: "NaN" };
      if (v === Infinity) return { [TAG]: "+Infinity" };
      if (v === -Infinity) return { [TAG]: "-Infinity" };
      if (Object.is(v, -0)) return { [TAG]: "-0" };
    }
    if (typeof v === "function" || typeof v === "symbol" || typeof v === "bigint") throw new Error(`not memoisable: a ${typeof v} at ${key || "the top"}`);
    return v;
  });
}
function memoKey(kind, value) {
  try {
    return `${kind}:${createHash("sha256").update(switches()).update(TAG).update(canonicalText(value)).digest("hex")}`;
  } catch {
    return null;
  }
}
var COMPUTE_MEMO_MAX_BYTES, computeMemoOptions, ComputeMemo, current, tokens, nextToken, TAG;
var init_compute_memo = __esm({
  "src/sim/compute-memo.ts"() {
    "use strict";
    init_monster_db();
    init_card_model();
    init_passive_pieces();
    init_potion_cost();
    init_data_version();
    COMPUTE_MEMO_MAX_BYTES = 512 * 1024 * 1024;
    computeMemoOptions = {
      enabled: process.env["SL_RETRY_MEMO"] !== "off",
      maxBytes: COMPUTE_MEMO_MAX_BYTES
    };
    ComputeMemo = class {
      scope;
      entries = /* @__PURE__ */ new Map();
      bytes = 0;
      /** Counters for the log and the tests. */
      hits = 0;
      misses = 0;
      stores = 0;
      constructor(scope) {
        this.scope = scope;
      }
      /** The stored value and its meta (a fresh copy each time: the caller may change it), or null. */
      get(key) {
        const entry = this.entries.get(key);
        if (!entry) {
          this.misses += 1;
          return null;
        }
        return { value: deserialize(entry.bytes), meta: entry.meta };
      }
      /** A hit taken (get() then the caller's own condition). */
      took() {
        this.hits += 1;
      }
      /** Stores `value` (structured-clone copy) under `key`; false when it cannot be cloned or is larger than the cap. */
      set(key, value, meta) {
        let bytes;
        try {
          bytes = serialize(value);
        } catch {
          return false;
        }
        if (bytes.length > computeMemoOptions.maxBytes) return false;
        const old = this.entries.get(key);
        if (old) {
          this.bytes -= old.bytes.length;
          this.entries.delete(key);
        }
        this.entries.set(key, { bytes, meta });
        this.bytes += bytes.length;
        this.stores += 1;
        for (const [k, entry] of this.entries) {
          if (this.bytes <= computeMemoOptions.maxBytes) break;
          this.entries.delete(k);
          this.bytes -= entry.bytes.length;
        }
        return true;
      }
      get size() {
        return this.entries.size;
      }
      get storedBytes() {
        return this.bytes;
      }
    };
    current = null;
    tokens = /* @__PURE__ */ new WeakMap();
    nextToken = 1;
    TAG = "\0";
  }
});

// src/sim/thief-card-hp.ts
function cardValueText(v) {
  const trust = v.lowTrust ? `; low trust: the simulator is not validated on ${v.bossName} (${v.lowTrust})` : "";
  const head = v.hp === null ? `${v.card}: no HP value` : `${v.card} \u2248 ${one(v.hp)} HP`;
  const m = v.measures;
  if (!m) return `${head} (${v.why ?? v.status})${trust}`;
  const samples2 = `${v.samples} samples${v.timedOut ? ", cut by the time budget" : ""}`;
  const boss = `boss (${v.bossName}, entry ${v.entryHp} HP)`;
  let numbers;
  if (v.route === "progress") {
    numbers = `${boss} HP left ${Math.round(m.bossLeft.with)} with it \u2192 ${Math.round(m.bossLeft.with + m.bossLeft.card.value)} without (+${fmt(m.bossLeft.card.value)} \xB1 ${fmt(m.bossLeft.card.se)}), 1 HP of entry \u2248 ${fmt(m.bossLeft.perHp.value)} boss HP (win ${pct(m.win.with)}; ${samples2})`;
  } else if (v.route === "hp") {
    numbers = `${boss} won ${pct(m.win.with)}: HP lost ${Math.round(m.hpLost.with)} with it \u2192 ${Math.round(m.hpLost.with + m.hpLost.card.value)} without (${fmt(m.hpLost.card.value)} \xB1 ${fmt(m.hpLost.card.se)}; ${samples2})`;
  } else {
    numbers = `${boss} win ${pct(m.win.with)} with it \u2192 ${pct(m.win.without)} without (${m.cardDiff.value >= 0 ? "\u2212" : "+"}${pp(Math.abs(m.cardDiff.value))} \xB1 ${pp(m.cardDiff.se)} points), ${v.step} HP less \u2192 ${pct(m.win.lower)}: 1 HP \u2248 ${pp(m.perHp.value)} points (${samples2})`;
  }
  const partial = v.partial ? "; its effect is only partly modelled in the simulation: its worth may be understated" : "";
  return `${head}: ${numbers}${v.why && v.route === "win" ? `; ${v.why}` : v.why && v.route !== "win" ? ` [${v.why}]` : ""}${partial}${trust}`;
}
var pct, pp, one, fmt;
var init_thief_card_hp = __esm({
  "src/sim/thief-card-hp.ts"() {
    "use strict";
    pct = (p) => `${Math.round(p * 100)}%`;
    pp = (x) => `${Math.round(x * 1e3) / 10}`;
    one = (x) => Math.round(x * 10) / 10;
    fmt = (x) => String(Math.round(x * 10) / 10);
  }
});

// src/reflex/thief.ts
function thiefFightOf(state) {
  return `${str(state.raw["run_id"])}:${fightKey(state)}`;
}
function deckOf(state) {
  return asArray(asRecord(state.run?.raw)["deck"]).map(asRecord).filter((card) => str(card["card_id"]) !== "").map((card) => ({ id: `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`, name: str(card["name"], str(card["card_id"])) }));
}
function missingCards(memory, state) {
  const start = memory.thiefStart;
  if (!start || start.fight !== thiefFightOf(state)) return null;
  const now = deckOf(state).map((card) => `${card.id}|${card.name}`);
  const missing = [];
  for (const key of start.deck) {
    const at2 = now.indexOf(key);
    if (at2 >= 0) now.splice(at2, 1);
    else missing.push(key.slice(key.indexOf("|") + 1));
  }
  return missing;
}
function goldTaken(memory, state) {
  const start = memory.thiefStart;
  if (!start || start.fight !== thiefFightOf(state) || start.gold === null) return null;
  const now = numOrNull(asRecord(state.run?.raw)["gold"]);
  return now === null ? null : Math.max(0, start.gold - now);
}
function powerOf2(enemy, id) {
  for (const entry of asArray(enemy["powers"])) {
    const power = asRecord(entry);
    if (str(power["power_id"]) === id) return numOrNull(power["amount"]) ?? 1;
  }
  return 0;
}
function turnsLeftOf2(id, move, escapeArtist) {
  if (id === "THIEVING_HOPPER") {
    if (move === STUNNED) return Math.max(2, escapeArtist);
    if (move === LEAVE_MOVES[id]) return 1;
    return escapeArtist > 0 ? escapeArtist : null;
  }
  if (id === "FAT_GREMLIN") return move === LEAVE_MOVES[id] ? 1 : 2;
  return null;
}
function thievesOf(state, memory, names = /* @__PURE__ */ new Map()) {
  const out = [];
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord);
  enemies.forEach((enemy, fallback) => {
    if (enemy["is_alive"] === false || num(enemy["current_hp"]) <= 0) return;
    const id = str(enemy["enemy_id"]);
    const index = numOrNull(enemy["index"]) ?? fallback;
    const move = str(enemy["move_id"]);
    const base = {
      index,
      id,
      name: names.get(index) ?? str(enemy["name"], id),
      hp: num(enemy["current_hp"]),
      maxHp: num(enemy["max_hp"]),
      block: num(enemy["block"]),
      flutter: powerOf2(enemy, FLUTTER)
    };
    if (id === "THIEVING_HOPPER" && powerOf2(enemy, SWIPE) > 0) {
      out.push({ ...base, cards: missingCards(memory, state), turnsLeft: turnsLeftOf2(id, move, powerOf2(enemy, ESCAPE_ARTIST)) });
    } else if (id === "FAT_GREMLIN" && powerOf2(enemy, HEIST) > 0) {
      out.push({ ...base, gold: powerOf2(enemy, HEIST), turnsLeft: turnsLeftOf2(id, move, 0) });
    } else if (id === "GREMLIN_MERC" && powerOf2(enemy, THIEVERY) > 0) {
      const taken = goldTaken(memory, state);
      if (taken === null ? (state.turn ?? 1) >= 2 : taken > 0) out.push({ ...base, gold: taken, turnsLeft: null, stealsPerAttack: powerOf2(enemy, THIEVERY) });
    }
  });
  return out;
}
function actOf2(state) {
  const id = state.run?.act_id;
  return id != null && /^\d+$/.test(id) ? Number(id) + 1 : 1;
}
function goldLoot(gold, act, ascension, file, error) {
  if (gold === null || gold === void 0) return { hp: null, text: "no HP value: how much gold it carries is unknown (the fight's start was not seen)", short: "gold unknown" };
  if (!file) return { hp: null, text: `no HP value: the potion table did not load${error ? ` (${error})` : ""}`, short: "no potion table" };
  const rates = file.meta.gold_hp;
  const asc = tableAscension(file, ascension);
  const cell = rates && asc !== null ? rates.by_asc[String(asc)]?.[String(tableAct(act))] : void 0;
  if (!rates || !cell) return { hp: null, text: "no HP value: the potion table has no gold rate (meta.gold_hp: rebuild it with tools/build-potion-equivalents.py)", short: "no gold rate" };
  const hp = round14(gold * cell.per_gold);
  const how = `${rates.price.median} gold a potion (median shop price, A${rates.price.min_asc}+ n=${rates.price.n}), a potion's held value ${cell.hold_hp} HP in act ${tableAct(act)} (A${asc})`;
  return { hp, text: `${gold} gold \u2248 ${hp} HP: ${gold} \xF7 ${how}`, short: `${gold} gold \xF7 ${rates.price.median} a potion \xD7 ${cell.hold_hp} HP` };
}
function cardLoot(value, fight) {
  if (!value || value.fight !== fight) return { hp: null, text: "no HP value: the stolen card's worth has not been computed for this fight", short: "not computed" };
  const text = cardValueText(value);
  const m = value.measures;
  const pct3 = (p) => `${Math.round(p * 100)}%`;
  const short = !m || value.route === null ? value.status : value.route === "progress" ? `boss HP left +${round14(m.bossLeft.card.value)} without it, 1 HP \u2248 ${round14(m.bossLeft.perHp.value)} boss HP` : value.route === "hp" ? `boss fight HP lost +${round14(m.hpLost.card.value)} without it` : `boss win ${pct3(m.win.with)} \u2192 ${pct3(m.win.without)} without it, 1 HP \u2248 ${round14(m.perHp.value * 100)} points`;
  return { hp: value.hp, text, short: `${short}${value.partial ? ", effect partly modelled" : ""}${value.lowTrust ? ", low trust" : ""}` };
}
function withLoot(thieves, state, cardValue2) {
  let file = null;
  let error;
  if (thieves.some((thief) => thief.cards === void 0)) {
    try {
      file = loadPotionEquivalents(potionWorthSource.dir);
    } catch (caught) {
      error = (caught instanceof Error ? caught.message : String(caught)).slice(0, 160);
    }
  }
  const fight = thiefFightOf(state);
  return thieves.map((thief) => ({
    ...thief,
    loot: thief.cards !== void 0 ? cardLoot(cardValue2, fight) : goldLoot(thief.gold, actOf2(state), state.run?.ascension ?? 0, file, error)
  }));
}
function lootHpOf(thieves) {
  return Object.fromEntries(thieves.filter((thief) => (thief.loot?.hp ?? 0) > 0).map((thief) => [thiefTag(thief), thief.loot.hp]));
}
function lastTurnLoot(plan, thieves) {
  return thieves.reduce((sum, thief) => thief.turnsLeft === 1 && (thief.loot?.hp ?? 0) > 0 && !killsThief(plan, thief) && !stunsThief(plan, thief) ? sum + thief.loot.hp : sum, 0);
}
function lootText(thief) {
  if (thief.cards !== void 0) {
    if (thief.cards === null || thief.cards.length === 0) return "one card from your deck (which one is unknown: the fight's start was not seen)";
    return thief.cards.length === 1 ? thief.cards[0] : `one of ${thief.cards.join(", ")}`;
  }
  return thief.gold === null || thief.gold === void 0 ? "the gold it stole (amount unknown: the fight's start was not seen)" : `${thief.gold} gold`;
}
function leavesText(turnsLeft, turn) {
  if (turnsLeft <= 1) return "at the end of this turn";
  if (turnsLeft === 2) return "at the end of next turn";
  return turn === null ? `at the end of the turn ${turnsLeft - 1} turns from now` : `at the end of turn ${turn + turnsLeft - 1}`;
}
function thiefContextJson(thieves, turn, heirName = "\u80D6\u5730\u7CBE") {
  const out = {};
  for (const thief of thieves) {
    const entry = { hp: `${thief.hp}/${thief.maxHp}`, block: thief.block };
    if (thief.cards !== void 0) {
      entry["carries"] = `${lootText(thief)}: the card it stole from your deck on turn 1; back in the deck if it is killed, gone for the run if it leaves`;
    } else if (thief.id === "GREMLIN_MERC") {
      entry["carries"] = `${lootText(thief)} stolen so far (it takes ${thief.stealsPerAttack ?? 20} more on each attack); when it dies the gold goes to the ${heirName} it spawns: back if that one is killed, gone if it flees`;
    } else {
      entry["carries"] = `${lootText(thief)}: back if it is killed, gone if it flees`;
    }
    if (thief.turnsLeft === null) {
      entry["turns_left"] = `it does not leave; the ${heirName} it spawns on death flees at the end of the turn after it appears (that turn and the next to kill it)`;
    } else {
      const flee = thief.id === "FAT_GREMLIN" ? "it flees" : "it leaves (Escape)";
      entry["turns_left"] = thief.turnsLeft === 1 ? `1: this turn is the last, ${flee} at the end of this turn` : `${thief.turnsLeft}, this one included: ${flee} ${leavesText(thief.turnsLeft, turn)}`;
    }
    if (thief.flutter > 0) entry["flutter"] = `${thief.flutter}: each attack hit removes one; at 0 it is stunned and this turn's move is cancelled${thief.turnsLeft === 1 ? " (its Escape too: it leaves a turn later)" : ""}`;
    if (thief.loot) entry["loot_hp"] = thief.loot.text;
    out[thief.name] = entry;
  }
  out["rollout"] = "the rollout plays the escape: an enemy whose Escape/Flee resolves is gone (no kill, nothing comes back), and with no enemy left the fight is over (its 'fight over' counts that end too)";
  if (thieves.some((thief) => thief.loot)) {
    out["loot_cost"] = "the rollout's ranking counts the loot like a potion's cost (deaths first, then further HP loss + potion cost + loot cost): a sample that ends with the thief gone, or still in the fight at the horizon's end, pays the loot's HP (loot_hp); one that gets it back or dies pays nothing; each option's thief fact gives its loot cost";
  }
  return out;
}
function afterOf(plan, index) {
  return plan.outcome.enemyHpAfter.find((entry) => entry.index === index);
}
function killsThief(plan, thief) {
  if (plan.outcome.winsFight) return true;
  const after = afterOf(plan, thief.index);
  return after !== void 0 && after.hp <= 0;
}
function stunsThief(plan, thief) {
  if (thief.flutter <= 0 || killsThief(plan, thief)) return false;
  return (afterOf(plan, thief.index)?.flutter ?? thief.flutter) <= 0;
}
function thiefTag(thief) {
  return `${thief.id}@${thief.index}`;
}
function backShare(samples2) {
  return Math.max(samples2.back, samples2.order?.back ?? 0) / Math.max(1, samples2.samples);
}
function thiefFact(plan, thieves, samplesOf, turn, heirName = "\u80D6\u5730\u7CBE", lostOf = () => null) {
  const parts = [];
  for (const thief of thieves) {
    let now;
    if (killsThief(plan, thief)) {
      now = thief.id === "GREMLIN_MERC" ? `kills ${thief.name}: its ${lootText(thief)} goes to the ${heirName} it spawns, which flees at the end of next turn` : thief.cards !== void 0 ? `kills ${thief.name}: ${thief.cards && thief.cards.length > 0 ? lootText(thief) : "the stolen card"} comes back` : `kills ${thief.name}: its ${lootText(thief)} comes back`;
    } else {
      const hp = Math.max(0, afterOf(plan, thief.index)?.hp ?? thief.hp);
      const stunned = stunsThief(plan, thief);
      const left = thief.turnsLeft === null ? null : stunned && thief.turnsLeft === 1 ? 2 : thief.turnsLeft;
      const leaves = left === null ? `it keeps the ${lootText(thief)}` : `${thief.id === "FAT_GREMLIN" ? "flees" : "leaves"} ${leavesText(left, turn)}${left === 1 ? ` with ${lootText(thief)}` : ""}`;
      now = `${thief.name} left at ${hp} HP, ${leaves}`;
      const counted = afterOf(plan, thief.index)?.strippedStun === void 0;
      if (stunned) now += `; its last Flutter stripped: stunned, this turn's move cancelled${thief.turnsLeft === 1 ? " (its Escape: one more turn)" : counted ? " (hp_lost above still counts its attack)" : " (hp_lost above leaves its attack out)"}`;
    }
    const samples2 = samplesOf(thief);
    if (samples2 && !(killsThief(plan, thief) && thief.id !== "GREMLIN_MERC")) {
      const what = thief.id === "GREMLIN_MERC" ? `its gold back (the ${heirName} killed before it flees)` : "killed before it leaves";
      now += `; rollout: ${what} in ${samples2.back}/${samples2.samples} samples, left with it in ${samples2.gone}/${samples2.samples}${samples2.order ? ` (its best order; with the later turns aiming ${samples2.order.label}: ${samples2.order.back}/${samples2.samples})` : ""}`;
    }
    if (thief.loot) now += `; ${lootCostText(plan, thief, lostOf(thief))}`;
    parts.push(now);
  }
  return parts.join("; ");
}
function lootCostText(plan, thief, lost) {
  const loot = thief.loot;
  if (loot.hp === null) return `loot cost 0 (${loot.text})`;
  const what = `${thief.cards !== void 0 ? lootText(thief) : `${thief.gold ?? "?"} gold`} \u2248 ${round14(loot.hp)} HP (${loot.short})`;
  if (lost) return `loot cost ${round14(loot.hp * lost.lost / Math.max(1, lost.samples))} HP: ${what} \xD7 lost in ${lost.lost}/${lost.samples} samples`;
  const now = lastTurnLoot(plan, [thief]);
  return `loot cost ${round14(now)} HP: ${what}${thief.turnsLeft === 1 ? now > 0 ? ", lost at the end of this turn" : ", kept from leaving this turn" : ", no rollout of the later turns"}`;
}
function lastTurnKillLine(plans, shown, thieves, drinks2) {
  for (const thief of thieves) {
    if (thief.turnsLeft !== 1) continue;
    if (shown.some((plan) => killsThief(plan, thief))) continue;
    const kills = plans.filter((plan) => killsThief(plan, thief));
    const line = kills.find((plan) => !drinks2(plan)) ?? kills[0];
    if (line) return line;
  }
  return null;
}
function shownKillLine(shown, thieves) {
  for (const thief of thieves) {
    if (thief.turnsLeft !== 1) continue;
    const line = shown.find((plan) => killsThief(plan, thief));
    if (line) return line;
  }
  return null;
}
function escapeInput(thieves, db) {
  const moves = {};
  for (const [id, entry] of Object.entries(db)) {
    const leaving = Object.entries(entry.moves ?? {}).filter(([, move]) => (move.intents?.["Escape"] ?? 0) > 0).map(([move]) => move);
    if (leaving.length > 0) moves[id] = leaving;
  }
  for (const [id, move] of Object.entries(LEAVE_MOVES)) if (!(moves[id] ?? []).includes(move)) moves[id] = [...moves[id] ?? [], move];
  return {
    moves,
    carriers: Object.fromEntries(thieves.map((thief) => [thief.index, thiefTag(thief)])),
    heirs: { ...LOOT_HEIRS }
  };
}
var ESCAPE_ARTIST, SWIPE, THIEVERY, HEIST, FLUTTER, STUNNED, LOOT_HEIRS, LEAVE_MOVES, round14;
var init_thief = __esm({
  "src/reflex/thief.ts"() {
    "use strict";
    init_potion_equivalents();
    init_thief_card_hp();
    init_json();
    init_fight_plan();
    ESCAPE_ARTIST = "ESCAPE_ARTIST_POWER";
    SWIPE = "SWIPE_POWER";
    THIEVERY = "THIEVERY_POWER";
    HEIST = "HEIST_POWER";
    FLUTTER = "FLUTTER_POWER";
    STUNNED = "STUNNED";
    LOOT_HEIRS = { GREMLIN_MERC: "FAT_GREMLIN" };
    LEAVE_MOVES = { THIEVING_HOPPER: "ESCAPE_MOVE", FAT_GREMLIN: "FLEE_MOVE" };
    round14 = (value) => Math.round(value * 10) / 10;
  }
});

// src/reflex/rollout-live.ts
import { readFileSync as readFileSync14 } from "node:fs";
function shriekFromOf(id, asc, db) {
  for (const power of LATER_SHRIEK_POWERS) {
    const entry = db[id]?.powers?.[power];
    const found = nearestAscension(entry?.amount_at_first_sight_by_asc, asc);
    if (!entry || !found) continue;
    const amount = startAmountAt(db, id, power, asc)?.value ?? null;
    const turn = mode2(entry.turn_at_first_sight_by_asc?.[found.key]);
    if (amount !== null && amount > 0 && turn !== null && turn > 1) return { amount, turn };
  }
  return void 0;
}
function growthOf(id, move, asc) {
  if (!GROWING_DAMAGE_MOVES[id]?.includes(move)) return 0;
  const bases = moveBaseDamages(id, move, asc);
  const steps = {};
  for (let i = 1; i < bases.length; i += 1) steps[String(bases[i] - bases[i - 1])] = (steps[String(bases[i] - bases[i - 1])] ?? 0) + 1;
  return Math.max(0, mode2(steps) ?? 0);
}
function readJson(name, fallback) {
  try {
    return JSON.parse(readFileSync14(knowledgeFile(KNOWLEDGE_DIR, name), "utf8"));
  } catch {
    return fallback;
  }
}
function monsterMoves2() {
  if (dbCache) return dbCache;
  try {
    dbCache = readMonsterDbJson().monsters ?? {};
  } catch {
    dbCache = {};
  }
  return dbCache;
}
function moveModelData() {
  return mmCache ??= readJson("move-model.json", {});
}
function mode2(counts) {
  if (!counts) return null;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? Number(best[0]) : null;
}
function playerPowersOf(entry, asc, where) {
  const found = nearestAscension(entry.player_powers_applied_by_asc, asc);
  const counts = found ? entry.player_powers_applied_by_asc[found.key] : entry.player_powers_applied ?? {};
  const all = {};
  for (const id of PLAYER_DEBUFFS) {
    const logged = mode2(counts[id]);
    const amount = logged && where && found && !found.exact ? moveAmountAt(where.monsters, where.monsterId, entry, "applied", id, asc)?.value ?? logged : logged;
    if (amount) all[id] = amount;
  }
  if (Object.keys(all).length === 0) return {};
  const uses = (id, table2) => Object.values(table2?.[id] ?? {}).reduce((sum, n) => sum + n, 0);
  const applied = appliedPowerIds(entry, Object.keys(all));
  const alternatives = applied.choice;
  const ids = applied.ids;
  const out = Object.fromEntries(ids.map((id) => [id, all[id]]));
  if (ids.length === 0) return {};
  if (!alternatives) return { playerPowers: out };
  const order = [...ids].sort((a, b) => uses(b, counts) - uses(a, counts) || uses(b, entry.player_powers_applied) - uses(a, entry.player_powers_applied));
  return { playerPowers: out, playerPowerChoice: order };
}
function selfPowersOf(entry, asc, where) {
  const out = {};
  for (const id of ENEMY_SELF_POWERS) {
    const amount = selfGainAt(entry, id, asc, where);
    if (amount) out[id] = amount;
  }
  return Object.keys(out).length > 0 ? { selfPowers: out } : {};
}
function healOf(id, move, entry, asc) {
  const counts = countsAt(entry?.heal_by_asc, void 0, asc);
  const logged = Object.entries(counts ?? {}).map(([amount, n]) => [Number(amount), n]).filter(([amount]) => Number.isFinite(amount)).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];
  if (logged) return logged;
  if (id === "WATERFALL_GIANT" && move === "SIPHON_MOVE") return asc >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base;
  if (id === "KNOWLEDGE_DEMON" && move === "PONDER_MOVE") return PONDER_HEAL;
  return 0;
}
function statusCardsOf(entry) {
  const count2 = mode2(entry.status_cards);
  if (!count2) return {};
  const cardId = Object.entries(entry.status_card_ids ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const pile = (entry.status_card_pile?.["draw"] ?? 0) > (entry.status_card_pile?.["discard"] ?? 0) ? "draw" : "discard";
  return { statusCards: [{ cardId, count: count2, pile }] };
}
function statusCardModel(cardId, knowledge, index) {
  return { ...offHandCardModel(null, cardId, false, index, knowledge), validTargets: [] };
}
function enemyTable(id, asc, db, mm) {
  const moves = db[id]?.moves;
  const learned = mm[id];
  if (!moves && !learned) return void 0;
  const table2 = { moves: {}, next: {} };
  const where = { monsters: db, monsterId: id };
  for (const [move, entry] of Object.entries(moves ?? {})) {
    const logged = moveDamageAt(db, id, move, asc);
    const shown = logged ? null : shownDamageAt(db, id, move, asc);
    const hits = logged?.hits ?? shown?.hits ?? 1;
    const avg = learned?.damage[move] ?? entry.avg_total_shown ?? 0;
    const sandpit = selfGainAt(entry, "SANDPIT_POWER", asc, where);
    const block = regularEffect(entry, entry.block_gained) ? moveAmountAt(db, id, entry, "block", "BLOCK", asc) : null;
    const strength = regularEffect(entry, entry.self_powers_gained?.["STRENGTH_POWER"]) ? moveAmountAt(db, id, entry, "self", "STRENGTH_POWER", asc) : null;
    const vigor = selfGainAt(entry, "VIGOR_POWER", asc, where);
    table2.moves[move] = {
      damage: logged?.perHit ?? shown?.perHit ?? (avg > 0 ? avg / hits : 0),
      hits,
      ...shown ? { shown: true } : {},
      // B4, read by whole fights only: a Surrounded move's faced hit, a Sandpit it starts.
      ...logged?.backAttackShare !== void 0 && logged.base !== void 0 ? { faceDamage: logged.base } : {},
      ...sandpit ? { sandpit } : {},
      // Buffs at this ascension (A9 Ritual/Charge Up/Salivate +3 where A8 is +2), not pooled; not logged here, the
      // nearest logged one's moved by the measured change, the move marked estimated.
      strength: strength?.value ?? 0,
      block: block?.value ?? 0,
      ...entry.self_powers_gained?.["BURROWED_POWER"] ? { burrows: true } : {},
      ...vigor ? { vigor } : {},
      ...selfPowersOf(entry, asc, where),
      ...healOf(id, move, entry, asc) > 0 ? { heal: healOf(id, move, entry, asc) } : {},
      ...statusCardsOf(entry),
      ...playerPowersOf(entry, asc, where),
      ...logged?.estimated || shown?.estimated || strength?.estimated || block?.estimated ? { estimated: true } : {},
      ...growthOf(id, move, asc) > 0 ? { growth: growthOf(id, move, asc) } : {}
    };
  }
  for (const [move, damage] of Object.entries(learned?.damage ?? {})) {
    if (!table2.moves[move]) table2.moves[move] = { damage, hits: 1, strength: 0, block: 0 };
  }
  table2.next = learned?.next ?? Object.fromEntries(Object.entries(moves ?? {}).map(([m, e]) => [m, e.next ?? {}]));
  const shriekFrom = shriekFromOf(id, asc, db);
  if (shriekFrom) table2.shriekFrom = shriekFrom;
  return table2;
}
function summonThreatAt(enemyId, move, asc, present, vulnerable, db = monsterMoves2(), mm = moveModelData()) {
  return (summonsAt(enemyId, move, asc, db) ?? []).filter((spawn) => !present.includes(spawn.id)).reduce((sum, spawn) => {
    const attack = spawn.move ? enemyTable(spawn.id, asc, db, mm)?.moves[spawn.move] : void 0;
    return sum + (attack ? Math.floor(attack.damage * (vulnerable ? 1.5 : 1)) * attack.hits * spawn.count : 0);
  }, 0);
}
function powersOf(holder) {
  const out = {};
  for (const p of asArray(holder["powers"])) {
    const power = asRecord(p);
    const id = str(power["power_id"]);
    if (id) out[id] = typeof power["amount"] === "number" ? power["amount"] : 1;
  }
  return out;
}
function relicEnergyOf(runRaw) {
  return asArray(runRaw["relics"]).map(asRecord).filter((relic) => ENERGY_RELICS.has(str(relic["relic_id"])) && !(str(relic["relic_id"]) === "PUMPKIN_CANDLE" && relic["stack"] === 0)).map((relic) => ({ amount: 1, from: RELIC_ENERGY_FROM[str(relic["relic_id"])] ?? 1 }));
}
function relicBlockOf(runRaw, upto = 40, passive = passivePiecesOptions.enabled) {
  const out = [];
  for (const relic of asArray(runRaw["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    if (id === "CAPTAINS_WHEEL") out.push({ amount: CAPTAINS_WHEEL_BLOCK, turn: CAPTAINS_WHEEL_TURN });
    else if (id === "SAI") for (let turn = 1; turn <= upto; turn += 1) out.push({ amount: SAI_BLOCK, turn });
    else if (id === "HORN_CLEAT" && passive) out.push({ amount: HORN_CLEAT_BLOCK, turn: HORN_CLEAT_TURN });
  }
  return out;
}
function fightRelicsOf(runRaw, turn, upto = 40, passive = passivePiecesOptions.enabled) {
  const energy = [];
  const block = [];
  const draws = [];
  let orichalcum = 0;
  let rippleBasin = 0;
  let blockKeep = 0;
  let iceCream = false;
  for (const relic of asArray(runRaw["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    if (id === "CANDELABRA") energy.push({ amount: 2, turn: 2 });
    else if (id === "CHANDELIER") energy.push({ amount: 3, turn: 3 });
    else if (id === "HORN_CLEAT" && !passive) block.push({ amount: HORN_CLEAT_BLOCK, turn: HORN_CLEAT_TURN });
    else if (id === "HAPPY_FLOWER") {
      const counted = typeof relic["stack"] === "number" ? Math.max(0, Math.min(2, relic["stack"])) : 0;
      for (let t = turn + 3 - counted; t <= upto; t += 3) energy.push({ amount: 1, turn: t });
    } else if (id === "PENDULUM") {
      const counted = typeof relic["stack"] === "number" ? Math.max(0, Math.min(2, relic["stack"])) : 0;
      for (let t = turn + 3 - counted; t <= upto; t += 3) draws.push({ amount: PENDULUM_DRAW, turn: t });
    } else if (id === "ORICHALCUM") orichalcum = ORICHALCUM_BLOCK;
    else if (id === "RIPPLE_BASIN") rippleBasin = RIPPLE_BASIN_BLOCK;
    else if (id === "STURDY_CLAMP") blockKeep = STURDY_CLAMP_BLOCK;
    else if (id === "ICE_CREAM") iceCream = true;
  }
  return {
    energy,
    block,
    ...draws.length > 0 ? { draws } : {},
    ...orichalcum > 0 ? { orichalcum } : {},
    ...rippleBasin > 0 ? { rippleBasin } : {},
    ...blockKeep > 0 ? { blockKeep } : {},
    ...iceCream ? { iceCream } : {}
  };
}
function deckSummary(runRaw) {
  const out = { n: 0, atk: 0, skl: 0, pow: 0, junk: 0, dmg: 0, blk: 0, up: 0 };
  for (const entry of asArray(runRaw["deck"])) {
    const card = asRecord(entry);
    if (Object.keys(card).length === 0) continue;
    out.n += 1;
    const type = card["card_type"];
    if (type === "Attack") out.atk += 1;
    else if (type === "Skill") out.skl += 1;
    else if (type === "Power") out.pow += 1;
    else out.junk += 1;
    if (card["upgraded"] === true) out.up += 1;
    for (const raw of asArray(card["dynamic_values"])) {
      const value = asRecord(raw);
      const amount = value["current_value"];
      if (typeof amount !== "number") continue;
      if (value["name"] === "Damage") out.dmg += amount;
      else if (value["name"] === "Block") out.blk += amount;
    }
  }
  return out;
}
function deckModels(state, knowledge) {
  const powerExtraCost = pilePowerExtraCost(asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
  return asArray(asRecord(state.run?.raw)["deck"]).map((raw, i) => {
    const own = asRecord(raw);
    return offHandCardModel(own, str(own["card_id"]), own["upgraded"] === true, 900 + i, knowledge, null, powerExtraCost, str(asRecord(state.run?.raw)["character_id"]), state.run?.ascension ?? null);
  });
}
function fightId(state) {
  return `${str(state.raw["run_id"])}:${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
}
function fightMetaOf(state, knowledge, memory) {
  const combat = asRecord(state.raw["combat"]);
  const all = asArray(combat["enemies"]).map(asRecord).map((e) => str(e["enemy_id"])).filter((id) => id !== "");
  const fight = fightId(state);
  if (memory.rolloutEncounter?.fight !== fight) memory.rolloutEncounter = { fight, enc: [...all].sort().join("+") };
  const enc = memory.rolloutEncounter.enc;
  const types = enc.split("+").map((id) => knowledge.monster(id)?.type ?? "");
  const kind = types.includes("Boss") ? "boss" : types.includes("Elite") ? "elite" : "hallway";
  const runRaw = asRecord(state.run?.raw);
  const actRaw = str(runRaw["act_id"]);
  const maxEn = runRaw["max_energy"];
  return {
    act: /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : 1,
    t: state.turn ?? 1,
    asc: state.run?.ascension ?? 0,
    kind,
    enc,
    deck: deckSummary(runRaw),
    relics: asArray(runRaw["relics"]).length,
    max_en: typeof maxEn === "number" && maxEn > 0 ? maxEn : 3
  };
}
function seedOf2(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
function noEffectTwin(plan, plans) {
  if (!drinks(plan)) return null;
  if ((plan.outcome.lastingDrinks ?? 0) > 0) return null;
  const cards = (line) => line.steps.filter((step) => !step.cardId.startsWith("POTION:")).map((step) => `${step.cardId}|${step.cardIndex}|${step.target ?? "-"}`).join(">");
  const turn = (line) => JSON.stringify({ ...line.outcome, potionCost: void 0 });
  return plans.find((other) => other !== plan && !drinks(other) && cards(other) === cards(plan) && turn(other) === turn(plan)) ?? null;
}
function pickRolloutBest(lines, startHp) {
  if (lines.length === 0) return { best: null, saturated: false };
  const saturated = lines.every((line) => line.samples >= SATURATED_MIN_SAMPLES && line.wins === 0 && line.hpLoss >= startHp - SATURATED_HP);
  const costs = lines.some((line) => (line.potionCost ?? 0) > 0 || (line.thiefCost ?? 0) > 0);
  const fewestDead = Math.min(...lines.map((line) => line.deaths));
  const pool = costs && !saturated ? lines.filter((line) => line.deaths === fewestDead) : lines;
  const top = Math.max(...pool.map((line) => line.value));
  let contenders = saturated ? lines.filter((line) => line.deaths === fewestDead) : pool.filter((line) => line.value === top);
  if (contenders.every((line) => line.leaderHpLeft !== null && line.leaderHpLeft !== void 0)) {
    const leastLeader = Math.min(...contenders.map((line) => line.leaderHpLeft));
    contenders = contenders.filter((line) => line.leaderHpLeft <= leastLeader + LEADER_HP_TIE);
  }
  const least = Math.min(...contenders.map((line) => line.enemyHpLeft));
  const near = contenders.filter((line) => line.enemyHpLeft < least + ROLLOUT_ENEMY_HP_TIE).sort((a, b) => b.turnsSurvived - a.turnsSurvived);
  if (!saturated) return { best: near[0], saturated };
  const alive = near.filter((line) => near[0].turnsSurvived - line.turnsSurvived < ROLLOUT_TURNS_TIE);
  const leastLoss = Math.min(...alive.map(turnLoss));
  const last = alive.filter((line) => turnLoss(line) === leastLoss);
  return last.length >= 2 ? { best: null, saturated, tied: last } : { best: last[0], saturated };
}
function sameShownResult(a, b) {
  return round15(effectiveFightLoss(a)) === round15(effectiveFightLoss(b)) && a.deaths * b.samples === b.deaths * a.samples && winPercent(a) === winPercent(b);
}
function rankingNote(line, deathsFirst = false) {
  const cost = line.potionCost ?? 0;
  const loot = line.thiefCost !== void 0 ? ` + loot cost ${round15(line.thiefCost)}` : "";
  const why = line.thiefCost !== void 0 ? "some line pays a potion or loot cost" : "some line pays a potion cost";
  return `; ranked on ${deathsFirst ? `fewest dead first (${why}), then ` : ""}-(further loss${cost > 0 ? " + potion cost" : ""}${loot}) - ${DEATH_HP} x (1 - win chance): win chance ~${winPercent(line)}% (fights won in the samples, the others by the end-of-horizon estimate), value ${round15(line.value)}`;
}
function effectiveFightLoss(line) {
  return line.hpLoss + (line.potionCost ?? 0) + (line.thiefCost ?? 0);
}
function rolloutTies(picked, eligible, shown) {
  const best = picked.best;
  if (picked.saturated) {
    const shownTies2 = (picked.tied ?? []).filter((line) => shown.includes(line.plan));
    if (best === null && shownTies2.length >= 2) return { best: null, tied: shownTies2 };
    if (best === null && shownTies2.length === 1) return { best: shownTies2[0], tied: [] };
    return { best, tied: [] };
  }
  if (best === null) return { best, tied: [] };
  const ties = eligible.filter((line) => sameShownResult(line, best));
  if (ties.length < 2) return { best, tied: [] };
  const shownTies = ties.filter((line) => shown.includes(line.plan));
  if (shownTies.length >= 2) return { best: null, tied: shownTies };
  return { best: shownTies[0] ?? best, tied: [] };
}
function boardRolloutInput(state, knowledge, solverInput, asc, db = monsterMoves2(), mm = moveModelData()) {
  const combat = asRecord(state.raw["combat"]);
  const raw = asArray(combat["enemies"]).map(asRecord);
  const leaderAlive = raw.some((e) => e["is_alive"] !== false && !powersOf(e)["MINION_POWER"]);
  const reviving = (e) => e["is_alive"] === false && (powersOf(e)["ILLUSION_POWER"] ?? 0) > 0 && leaderAlive;
  const enemies = raw.map((e, i) => ({ e, i })).filter(({ e }) => e["is_alive"] !== false || reviving(e)).map(({ e, i }) => {
    const powers = powersOf(e);
    return { index: typeof e["index"] === "number" ? e["index"] : i, id: str(e["enemy_id"]), move: e["move_id"] ? str(e["move_id"]) : null, strength: powers["STRENGTH_POWER"] ?? 0, powers };
  });
  const revivers = raw.map((e, i) => ({ e, i })).filter(({ e }) => reviving(e) && !solverInput.enemies.some((sim) => sim.index === (typeof e["index"] === "number" ? e["index"] : -1))).map(({ e, i }) => ({
    index: typeof e["index"] === "number" ? e["index"] : i,
    name: str(e["name"], str(e["enemy_id"])),
    hp: 0,
    maxHp: typeof e["max_hp"] === "number" ? e["max_hp"] : 0,
    block: 0,
    vulnerable: 0,
    weak: 0,
    artifact: 0,
    intangible: false,
    illusion: true,
    minion: (powersOf(e)["MINION_POWER"] ?? 0) > 0,
    attacks: []
  }));
  const solver = revivers.length > 0 ? { ...solverInput, enemies: [...solverInput.enemies, ...revivers] } : solverInput;
  const tables = {};
  const spawns = {};
  const summons = {};
  for (const e of enemies) {
    const found = spawnsAt(e.id, asc, db);
    if (found) spawns[e.id] = found;
    const living = summonsAt(e.id, "ILLUSION_MOVE", asc, db)?.filter((spawn) => !enemies.some((other) => other.id === spawn.id));
    if (living?.length) summons[e.id] = { ILLUSION_MOVE: living };
  }
  for (const id of /* @__PURE__ */ new Set([...enemies.map((e) => e.id), ...Object.values(spawns).flatMap((list) => list.map((spawn) => spawn.id)), ...Object.values(summons).flatMap((moves) => Object.values(moves).flatMap((list) => list.map((spawn) => spawn.id)))])) {
    const table2 = enemyTable(id, asc, db, mm);
    if (table2) tables[id] = table2;
  }
  const statusIds = /* @__PURE__ */ new Set([UNKNOWN_STATUS, "DAZED", "WOUND", "WITHER"]);
  for (const table2 of Object.values(tables)) for (const move of Object.values(table2.moves)) for (const status of move.statusCards ?? []) if (status.cardId) statusIds.add(status.cardId);
  const hug = asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "BIIIG_HUG");
  if (hug) statusIds.add("SOOT");
  const statusCards = Object.fromEntries([...statusIds].map((id, k) => [id, statusCardModel(id, knowledge, 800 + k)]));
  const baseByKey = new Map(deckModels(state, knowledge).map((c) => [cardKey2(c), c]));
  const passive = solverPiecesOf(asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
  const skull = str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "SNECKO_SKULL");
  return {
    solver,
    enemies,
    tables,
    statusCards,
    relicEnergy: relicEnergyOf(asRecord(state.run?.raw)),
    ...relicBlockOf(asRecord(state.run?.raw)).length > 0 ? { relicBlock: relicBlockOf(asRecord(state.run?.raw)) } : {},
    ...Object.keys(spawns).length > 0 ? { spawns } : {},
    ...Object.keys(summons).length > 0 ? { summons } : {},
    ...hug && statusCards["SOOT"] ? { onShuffle: statusCards["SOOT"] } : {},
    ...passive ? { passive } : {},
    playerPowers: powersOf(asRecord(combat["player"])),
    ...skull ? { fumesPoisonBonus: 1 } : {},
    potions: asArray(asRecord(state.run?.raw)["potions"]).filter((p) => asRecord(p)["occupied"]).length,
    handBase: solverInput.hand.map((card) => card.type === "Potion" ? null : baseByKey.get(cardKey2(card)) ?? null)
  };
}
function liveRollout(args) {
  const now = rolloutLiveOptions.now ?? (() => performance.now());
  const start = now();
  const elapsed = () => now() - start;
  if (!args.piles) return { available: false, reason: "no draw/discard piles in the state", elapsedMs: elapsed() };
  if (args.plans.length === 0) return { available: false, reason: "no line to roll out", elapsedMs: elapsed() };
  try {
    const { state, knowledge } = args;
    const meta = fightMetaOf(state, knowledge, args.memory);
    const board2 = boardRolloutInput(state, knowledge, args.solver, meta.asc);
    const model2 = args.model !== void 0 ? args.model : loadFightValueModel();
    const gates = args.gates !== void 0 ? args.gates : loadFightValueGates();
    const budgetMs = Math.max(0, (args.budgetMs ?? rolloutLiveOptions.budgetMs) - ROLLOUT_MARGIN_MS - (args.spentMs ?? 0) - elapsed());
    const { handBase, ...boardInput } = board2;
    const input = {
      ...boardInput,
      // THIEF_COST: each thief's loot HP (thief.loot, set only with the switch on) is a cost in the value.
      ...args.thieves ? { escapes: { ...escapeInput(args.thieves, monsterMoves2()), ...Object.keys(lootHpOf(args.thieves)).length > 0 ? { lootHp: lootHpOf(args.thieves) } : {} } } : {},
      plans: args.plans,
      piles: { draw: args.piles.draw, discard: args.piles.discard, handBase, ...args.drawTop && args.drawTop.length > 0 ? { drawTop: args.drawTop, ...args.drawAdded && args.drawAdded.length > 0 ? { drawAdded: args.drawAdded } : {} } : {} },
      meta,
      mm: moveModelData(),
      model: model2,
      gates,
      options: {
        horizon: ROLLOUT_HORIZON,
        samples: args.samples ?? ROLLOUT_SAMPLES,
        budgetMs,
        seed: seedOf2(`${fightId(state)}:${state.turn ?? "?"}${rolloutLiveOptions.seedSalt ?? ""}`),
        now,
        include: args.shown,
        ...args.orders && args.orders.length >= 2 ? { orders: args.orders } : {},
        ...rolloutLiveOptions.orderFocusBonus !== void 0 ? { orderFocusBonus: rolloutLiveOptions.orderFocusBonus } : {},
        ...args.noPotion ? { noPotionLine: args.noPotion.line } : {},
        ...args.sandpitStart ?? rolloutLiveOptions.sandpitStart ? { sandpitStart: true } : {}
      }
    };
    const memoKeyed = args.memo ? rolloutMemoKey(input) : null;
    const memoed = args.memo && memoKeyed ? recallRollout(args.memo, memoKeyed, input, budgetMs) : null;
    const result = memoed ?? rolloutDecision(input);
    if (result.unavailable) return { available: false, reason: result.unavailable, elapsedMs: elapsed() };
    if (args.memo && memoKeyed && !memoed) storeRollout(args.memo, memoKeyed, input, result);
    rolloutTap.onRollout?.(input, result);
    let noPotion = null;
    if (args.noPotion) {
      const base = result.lines.find((line) => line.plan === args.noPotion.base);
      const merged = base !== void 0 && Object.keys(base.laterDrinks ?? {}).length === 0;
      if (merged) result.lines = result.lines.filter((line) => line.plan !== args.noPotion.line);
      if (merged || result.lines.some((line) => line.plan === args.noPotion.line)) noPotion = { ...args.noPotion, merged };
    }
    const plans = result.lines.map((line) => line.plan).filter((plan) => plan !== args.noPotion?.line);
    const reused = result.lines.map((line) => {
      const twin = noEffectTwin(line.plan, plans);
      const dry = twin ? result.lines.find((other) => other.plan === twin) : void 0;
      if (!dry) return line;
      const cost = line.potionCost ?? 0;
      return { ...dry, plan: line.plan, tags: line.tags, score: line.score, currentValue: line.currentValue, sameAsDry: twin, potionCost: cost, laterDrinks: line.laterDrinks ?? {}, value: dry.value + (dry.potionCost ?? 0) - cost };
    });
    if (reused.some((line, i) => line !== result.lines[i])) result.lines = reused;
    const byPlan = new Map(result.lines.map((line) => [line.plan, line]));
    const eligible = result.lines.filter((line) => args.shown.includes(line.plan) || !drinks(line.plan));
    const lossCap = args.solver.player.hp + (args.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
    const picked = result.degraded.includes(FALLBACK_TAG) ? { best: null, saturated: false } : pickRolloutBest(eligible, lossCap);
    const ties = rolloutTies(picked, eligible, args.shown);
    return {
      available: true,
      result,
      byPlan,
      best: ties.best?.plan ?? null,
      tied: ties.tied.map((line) => line.plan),
      saturated: picked.saturated,
      meta,
      gate: gateFor(gates, meta.enc, meta.act, meta.kind),
      encounterN: gates?.segments[`enc:${meta.enc}`]?.n_rows ?? 0,
      minRows: gates?.params.min_rows ?? Infinity,
      potionsHeld: args.solver.hand.some((card) => card.type === "Potion"),
      potionCostsHeld: args.solver.hand.some((card) => card.type === "Potion" && (card.potionCost ?? 0) > 0),
      revives: (args.solver.player.revives ?? []).map((revive) => revive.name),
      lossCap,
      ordersDropped: args.ordersDropped ?? 0,
      noPotion,
      spentMs: args.spentMs ?? 0,
      elapsedMs: elapsed(),
      ...memoed ? { memo: { ms: memoed.elapsedMs } } : {}
    };
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 120)}`, elapsedMs: elapsed() };
  }
}
function rolloutRefs(input) {
  const opts = input.options ?? {};
  return [...input.plans, ...opts.include ?? [], ...opts.noPotionLine ? [opts.noPotionLine] : []];
}
function rolloutMemoKey(input) {
  try {
    const { now: _now, budgetMs: _budget, ...options } = input.options ?? {};
    return memoKey("rollout", { ...input, model: identityToken(input.model), gates: identityToken(input.gates), mm: identityToken(input.mm), options });
  } catch {
    return null;
  }
}
function recallRollout(memo, key, input, budgetMs) {
  try {
    const hit = memo.get(key);
    if (!hit || budgetMs < hit.meta.needMs) return null;
    const refs = rolloutRefs(input);
    if (hit.value.lines.some((line) => refs[line.plan] === void 0)) return null;
    memo.took();
    return { ...hit.value, lines: hit.value.lines.map((line) => ({ ...line, plan: refs[line.plan] })) };
  } catch {
    return null;
  }
}
function storeRollout(memo, key, input, result) {
  try {
    if (result.degraded.length > 0 || result.budgetNeedMs === void 0) return;
    const refs = rolloutRefs(input);
    const index = /* @__PURE__ */ new Map();
    refs.forEach((plan, i) => {
      if (!index.has(plan)) index.set(plan, i);
    });
    if (result.lines.some((line) => !index.has(line.plan))) return;
    memo.set(key, { ...result, lines: result.lines.map((line) => ({ ...line, plan: index.get(line.plan) })) }, { needMs: result.budgetNeedMs, ms: result.elapsedMs });
  } catch {
  }
}
function saturatedNote(line, r) {
  if (!r.saturated) return "";
  const leader = r.result.orders.find((order) => order.leader)?.leader?.name;
  const leaderText = leader && line.leaderHpLeft !== null && line.leaderHpLeft !== void 0 ? `${leader} HP left ~${Math.round(line.leaderHpLeft)} (its death ends the fight), ` : "";
  return `; every line loses all our HP here, so the expected loss does not separate them: the lines are ranked by fewest dead within ${line.horizon} turns (this line ${line.deaths}/${line.samples}), then the fight's progress: ${leaderText}least enemy HP left (this line ~${Math.round(line.enemyHpLeft)}, at T${line.horizon} or at our death), then most turns alive (this line ~${round15(line.turnsSurvived)}), then least HP lost this turn (this line ${turnLoss(line) < 0 ? `gains ${-turnLoss(line)}` : turnLoss(line)}${line.plan.outcome?.potionHeal ? `, before the ${line.plan.outcome.potionHeal} HP its potion heals` : ""})`;
}
function rolloutFacts(plan, r) {
  if (!r.available) return { rollout: `rollout unavailable (${r.reason})` };
  const line = r.byPlan.get(plan);
  if (!line) return { rollout: "rollout unavailable (line not evaluated)" };
  const { horizon, samples: samples2 } = line;
  const fallback = r.result.degraded.includes(FALLBACK_TAG);
  const capped = line.hpLoss >= r.lossCap - SATURATED_HP;
  const mcShare = r.spentMs >= 1 ? `, ${Math.round(r.spentMs)} ms of it taken by the random potions' Monte Carlo` : "";
  const fallbackText = `no rollout (it ran past its time budget${mcShare}; a fallback, not a forecast): this turn as shown, then a rough clock estimate of the rest of the fight, further HP loss ~${round15(line.hpLoss)}${capped ? " (the estimate's cap, our HP now: it does not mean this line dies, and does not tell the lines apart)" : ""}`;
  const cut = r.result.degraded.length > 0 ? ` [cut to fit the time budget: ${r.result.degraded.join(", ")}]` : "";
  const head = horizon > 1 ? `${horizon}-turn rollout (${samples2} sample${samples2 === 1 ? "" : "s"})` : "1-turn estimate (no rollout)";
  const potions = line.noPotionFight ? " (the no-potion line: its later turns drink no potion)" : r.potionsHeld ? r.potionCostsHeld ? " (later turns may drink the potions still held, each when its turn gains more than the potion's cost)" : " (later turns may use the potions still held)" : "";
  const facts = {
    rollout: fallback ? fallbackText : `${head}${potions}: expected further HP loss ${round15(line.hpLoss)}, fight over within ${horizon} turn${horizon === 1 ? "" : "s"} in ${line.wins}/${samples2}${line.turnsToWin === null ? "" : `, expected turns to the end (surviving samples) ~${round15(line.turnsToWin)}`}${line.deaths > 0 ? `, dead within ${horizon} turns in ${line.deaths}/${samples2} (~turn ${round15(line.turnsToDeath ?? 0)})` : ""}${line.timeUps ? `, out of time (the turn limit ended it unwon) in ${line.timeUps}/${samples2}` : ""}${line.revived ? `, spends ${r.revives.join(" / ") || "a revive"} (back from 0 HP) in ${line.revived}/${samples2} (the loss then counts all our HP now, and after the revive only what it loses)` : ""}${r.saturated ? saturatedNote(line, r) : rankingNote(line, r.result.lines.some((other) => (other.potionCost ?? 0) > 0 || (other.thiefCost ?? 0) > 0))}${cut}`,
    rollout_turns: turnsText(plan, line, samples2)
  };
  if (line.order && !fallback) {
    const first = (entry) => entry.order.label.split(" > ")[0];
    const firstFate = (entry) => entry.firstDown === null ? `${first(entry)} is an illusion (revives at full HP; never dead for good)` : `${first(entry)} dead ${entry.firstDown}/${samples2}`;
    const leaderName = line.order.leader?.name ?? null;
    const leaderFate = (entry) => entry.leader && leaderName ? `, ${leaderName} HP left at T${horizon} ~${Math.round(entry.leader.hpLeft)} (dead ${entry.leader.dead}/${samples2})` : "";
    const numbers = (entry) => `further HP loss ${round15(entry.hpLoss)}, over ${entry.wins}/${samples2}, dead ${entry.deaths}/${samples2}, ${firstFate(entry)}${leaderFate(entry)}`;
    const merged = [];
    for (const entry of line.orders) {
      const text = numbers(entry);
      const same = merged.find((m) => m.text === text);
      if (same) same.labels.push(entry.order.label);
      else merged.push({ labels: [entry.order.label], entry, text });
    }
    const [best, ...others] = merged;
    const dropped = r.ordersDropped > 0 ? `; ${r.ordersDropped} other orders not tried` : "";
    const sameLeader = (m) => Math.abs((m.entry.leader?.hpLeft ?? 0) - (best.entry.leader?.hpLeft ?? 0)) < 0.5;
    const tied = others.length > 0 && others.every((m) => Math.abs(m.entry.value - best.entry.value) < 0.05 && sameLeader(m)) ? "; the orders came out the same here" : "";
    const leaderNote = leaderName && best.entry.leader ? `; ${leaderName}'s death ends the fight (the others are minions): HP left at T${horizon} ~${Math.round(best.entry.leader.hpLeft)}, dead ${best.entry.leader.dead}/${samples2}${line.ordersByLeader ? `; no order ends the fight within ${horizon} turns, so the orders are ranked by least ${leaderName} HP left, then HP lost and deaths` : ""}` : "";
    const kept = line.order.firstRevives === true && line.orders.length < r.result.orders.length;
    const compared = kept ? `this line aims only at ${first(best.entry)} now, so its later turns keep aiming at it first (what doing this again each turn costs)` : `best of ${line.orders.length} kill orders compared`;
    facts["rollout_kill_order"] = `${best.labels.join(" | ")}: the later turns aim at ${first(best.entry)} first (${best.entry.firstDown === null ? `${first(best.entry)} is an illusion: it revives at full HP, so it is never dead for good` : `${first(best.entry)} dead by T${horizon} in ${best.entry.firstDown}/${samples2}`}); ${compared}${dropped}${tied}${leaderNote}`;
    if (others.length > 0) facts["rollout_other_orders"] = others.map((m) => `${m.labels.join(" | ")}: ${m.text}`).join("; ");
  }
  const forecast = line.modelForecast.rollout;
  if (!forecast) facts["history_estimate"] = "unavailable (no fight-value model)";
  else {
    const source = r.gate.segment === `enc:${r.meta.enc}` ? "" : `; estimate from ${segmentName(r.gate.segment)} n=${r.gate.n}`;
    const few = r.encounterN < r.minRows ? "; few similar states for this encounter" : "";
    facts["history_estimate"] = `further HP loss ${Math.round(forecast.hpLoss)}, win ${Math.round(forecast.winProb * 100)}% (this encounter n=${r.encounterN}${source}, typical error \xB1${HISTORY_MAE[r.meta.kind]}${few})`;
  }
  return facts;
}
function turnsText(plan, line, samples2) {
  const o = plan.outcome;
  const first = `T1 exact: ${hpText(o.hpLoss)}, dmg ${o.damageDealt}${o.winsFight ? ", won" : o.dies ? ", dead" : o.revived ? `, revived at ${o.revived.hp} HP` : ""}`;
  const later = line.perTurn.map(
    (t) => t.fighting === 0 ? `T${t.turn}: over (alive ${t.alive}/${samples2}, won ${t.won}/${samples2})` : `T${t.turn}: ${hpText(round15(t.loss.mean))} [${Math.round(t.loss.min)}-${Math.round(t.loss.max)}], dmg ${round15(t.dmg.mean)} [${Math.round(t.dmg.min)}-${Math.round(t.dmg.max)}], alive ${t.alive}/${samples2}, won ${t.won}/${samples2}`
  );
  return [first, ...later].join("; ");
}
function segmentName(segment) {
  const ak = /^ak:(\d+)\|(\w+)$/.exec(segment);
  if (ak) return `act-${ak[1]} ${ak[2]} fights`;
  const k = /^k:(\w+)$/.exec(segment);
  if (k) return `${k[1]} fights`;
  if (segment.startsWith("enc:")) return `encounter ${segment.slice(4)}`;
  return segment === "global" ? "all fights" : segment;
}
function rolloutLog(r, bestKey, added, tiedKeys = [], noPotionKey = null) {
  if (!r.available) return { available: false, reason: r.reason, ms: Math.round(r.elapsedMs) };
  return {
    available: true,
    // This call's own wall clock (an SL retry memo hit: the lookup's; the decision row's timing.memo says so).
    ms: Math.round(r.elapsedMs),
    horizon: r.result.horizon,
    samples: r.result.samples,
    degraded: r.result.degraded,
    lines: r.result.lines.length,
    best: bestKey,
    best_added: added,
    // The options tied for the best (no single best): their keys.
    ...tiedKeys.length > 0 ? { tied: tiedKeys } : {},
    ...r.saturated ? { saturated: true } : {},
    // Potion costs in play (potion-cost.ts): some line pays for a drink; the no-potion line's option and whether it
    // was merged into a shown line.
    ...r.result.lines.some((line) => (line.potionCost ?? 0) > 0) ? { potion_costs: true } : {},
    ...r.noPotion ? { no_potion: { key: noPotionKey, merged: r.noPotion.merged } } : {},
    ...r.result.orders.length > 0 ? {
      orders: r.result.orders.length,
      orders_dropped: r.ordersDropped,
      best_order: r.best ? r.byPlan.get(r.best)?.order?.label ?? null : null
    } : {}
  };
}
function thiefSamples(line, thief) {
  const tag = thiefTag(thief);
  const counts = line?.thieves?.[tag];
  if (!line || !counts) return null;
  const others = line.orders.filter((entry) => entry.order !== line.order && (entry.thieves?.[tag]?.back ?? 0) > counts.back);
  const most = others.reduce((a, b) => a === null || (b.thieves?.[tag]?.back ?? 0) > (a.thieves?.[tag]?.back ?? 0) ? b : a, null);
  return { ...counts, samples: line.samples, ...most ? { order: { label: most.order.label, back: most.thieves[tag].back } } : {} };
}
function rolloutKillLine(lines, eligible, shown, thieves) {
  for (const thief of thieves) {
    if (thief.turnsLeft === 1) continue;
    const pool = lines.filter((line) => eligible(line) && thiefSamples(line, thief) !== null);
    if (pool.length === 0) continue;
    const back = (line) => backShare(thiefSamples(line, thief));
    const most = Math.max(...pool.map(back));
    if (most <= 0) continue;
    const top = pool.filter((line) => back(line) === most);
    const inShown = shown.find((plan) => top.some((line) => line.plan === plan));
    if (inShown) return inShown;
    return [...top].sort((a, b) => b.value - a.value)[0].plan;
  }
  return null;
}
var ROLLOUT_BUDGET_MS, ROLLOUT_MARGIN_MS, ROLLOUT_HORIZON, ROLLOUT_SAMPLES, HISTORY_MAE, rolloutLiveOptions, rolloutTap, GROWING_DAMAGE_MOVES, LATER_SHRIEK_POWERS, dbCache, mmCache, RELIC_ENERGY_FROM, STURDY_CLAMP_BLOCK, PENDULUM_DRAW, cardKey2, drinks, FALLBACK_TAG, SATURATED_HP, SATURATED_MIN_SAMPLES, ROLLOUT_ENEMY_HP_TIE, ROLLOUT_TURNS_TIE, turnLoss, winPercent, round15, DRINK_FIRST_ROLLOUT;
var init_rollout_live = __esm({
  "src/reflex/rollout-live.ts"() {
    "use strict";
    init_compute_memo();
    init_monster_db();
    init_json();
    init_boss_clock();
    init_card_model();
    init_fight_value();
    init_passive_pieces();
    init_rollout();
    init_thief();
    init_turn_solver();
    init_files();
    ROLLOUT_BUDGET_MS = 1500;
    ROLLOUT_MARGIN_MS = 100;
    ROLLOUT_HORIZON = 5;
    ROLLOUT_SAMPLES = 8;
    HISTORY_MAE = { hallway: 5.5, elite: 11, boss: 9.9 };
    rolloutLiveOptions = {
      enabled: process.env["ROLLOUT_FACTS"] !== "off",
      now: null,
      budgetMs: ROLLOUT_BUDGET_MS,
      // SANDPIT_START's default when the decision's env does not say (DecisionEnv.sandpitStart: the loop passes config's; tests,
      // tools): on unless SANDPIT_START=off. rollout.ts RolloutOptions.sandpitStart, tests/insatiable-sandpit.test.ts.
      sandpitStart: process.env["SANDPIT_START"] !== "off"
    };
    rolloutTap = { onRollout: null };
    GROWING_DAMAGE_MOVES = { WATERFALL_GIANT: ["PRESSURE_GUN_MOVE"] };
    LATER_SHRIEK_POWERS = ["PLOW_POWER", "SHRIEK_POWER"];
    RELIC_ENERGY_FROM = { PAELS_FLESH: 3, BREAD: 2 };
    STURDY_CLAMP_BLOCK = 10;
    PENDULUM_DRAW = 1;
    cardKey2 = (c) => `${c.cardId}${c.upgraded ? "+" : ""}`;
    drinks = (plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));
    FALLBACK_TAG = "1-turn";
    SATURATED_HP = 1;
    SATURATED_MIN_SAMPLES = 2;
    ROLLOUT_ENEMY_HP_TIE = 1;
    ROLLOUT_TURNS_TIE = 0.1;
    turnLoss = (line) => (line.plan.outcome?.hpLoss ?? 0) + (line.plan.outcome?.potionHeal ?? 0);
    winPercent = (line) => Math.round((line.winProb ?? 0) * 100);
    round15 = (x) => Math.round(x * 10) / 10;
    DRINK_FIRST_ROLLOUT = "not rolled out: this potion's effect is not modelled, the turn is re-planned after drinking";
  }
});

// src/knowledge/mechanics.ts
function isStripStun(stats) {
  if (!stats) return false;
  const n = count(stats.n);
  const stunned = count(stats.move_after?.[STUN_MOVE]);
  if (n < STRIP_STUN_MIN_N || stunned < STRIP_STUN_MIN_SHARE * n) return false;
  const before = count(stats.attack_before);
  if (before >= STRIP_CANCEL_MIN_N && count(stats.attack_cancelled) < STRIP_CANCEL_MIN_SHARE * before) return false;
  const checked = count(stats.hp_check?.n);
  if (checked >= STRIP_CANCEL_MIN_N && count(stats.hp_check?.landed) > STRIP_LANDED_MAX_SHARE * checked) return false;
  return true;
}
function stripStunRules(observed) {
  const out = /* @__PURE__ */ new Map();
  for (const [power, stats] of Object.entries(observed?.powers_stripped ?? {}).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (!isStripStun(stats)) continue;
    out.set(power, {
      power,
      n: count(stats.n),
      fights: count(stats.fights),
      stunned: count(stats.move_after?.[STUN_MOVE]),
      cancelled: [count(stats.attack_cancelled), count(stats.attack_before)],
      landed: [count(stats.hp_check?.landed), count(stats.hp_check?.n)],
      evidence: [...stats.evidence ?? []],
      monsters: { ...stats.monsters ?? {} }
    });
  }
  return out;
}
function moveChangeOf(stats) {
  if (!stats) return null;
  const n = count(stats.n);
  if (n < MOVE_RULE_MIN_N || count(stats.move_changed) < MOVE_RULE_MIN_SHARE * n) return null;
  const top = Object.entries(stats.changed_to ?? {}).filter(([move]) => move !== STUN_MOVE).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  if (!top || top[1] < MOVE_RULE_MIN_SHARE * n) return null;
  return { move: top[0], changed: top[1] };
}
function moveRules(monsters) {
  const out = /* @__PURE__ */ new Map();
  for (const monster of sortedKeys(monsters ?? {})) {
    const observed = monsters[monster]?.observed;
    const rules = [];
    for (const [how, table2] of [["removed", observed?.powers_stripped], ["lowered", observed?.powers_lowered]]) {
      for (const power of sortedKeys(table2)) {
        const stats = table2[power];
        const change = moveChangeOf(stats);
        if (!change) continue;
        rules.push({
          monster,
          power,
          how,
          move: change.move,
          n: count(stats.n),
          fights: count(stats.fights),
          changed: change.changed,
          next: { ...stats.changed_next ?? {} },
          revived: count(stats.revived),
          coRemoved: how === "removed" ? { ...stats.co_removed ?? {} } : {},
          evidence: [...stats.changed_evidence ?? []]
        });
      }
    }
    if (rules.length > 0) out.set(monster, rules);
  }
  return out;
}
function moveRulesOf(db) {
  return moveRules(db?.monsters);
}
function clearedWith(rule, rules) {
  return [...new Set(rules.filter((other) => other.how === "removed" && other.move === rule.move && other.power !== rule.power).map((other) => other.power))].sort();
}
function deathRuleOf(monster, ally, stats, moves) {
  if (!stats) return null;
  const now = {};
  for (const before of sortedKeys(stats.by_move)) {
    const by = stats.by_move[before];
    const top2 = topMove(by.changed_to, before);
    if (count(by.n) >= DEATH_RULE_MIN_N && top2 && top2[1] >= DEATH_RULE_MIN_SHARE * count(by.n)) now[before] = { move: top2[0], changed: top2[1], n: count(by.n) };
  }
  const aliveTurns = count(stats.alive?.turns);
  const ownMove = (move) => aliveTurns >= DEATH_ALIVE_MIN_TURNS && count(stats.alive?.moves?.[move]) === 0;
  let next = null;
  const nextN = count(stats.next_n);
  const top = topMove(stats.next_move);
  if (nextN >= DEATH_RULE_MIN_N && top && top[1] >= DEATH_RULE_MIN_SHARE * nextN) {
    let weight = 0;
    let miss = 0;
    for (const [end, after2] of Object.entries(stats.next_after ?? {})) {
      const base = stats.alive?.next?.[end] ?? {};
      const total = Object.values(base).reduce((sum, n) => sum + count(n), 0);
      if (total < DEATH_BASELINE_MIN_N) continue;
      const c = Object.values(after2).reduce((sum, n) => sum + count(n), 0);
      weight += c;
      miss += c * (1 - count(base[top[0]]) / total);
    }
    const ownCycle = weight >= DEATH_BASELINE_MIN_N && miss / weight < DEATH_BASELINE_MISS;
    const after = sortedKeys(stats.next_after).filter((end) => end !== "?");
    const changesModel = after.some((end) => {
      const successors = moves?.[end]?.next;
      const total = Object.values(successors ?? {}).reduce((sum, n) => sum + count(n), 0);
      return moves !== void 0 && (total === 0 || count(successors?.[top[0]]) < DEATH_MODEL_SHARE * total);
    });
    if ((ownMove(top[0]) || weight >= DEATH_BASELINE_MIN_N && !ownCycle) && changesModel) next = { move: top[0], count: top[1], n: nextN, after };
  }
  if (Object.keys(now).length === 0 && !next) return null;
  const ruleMoves = [.../* @__PURE__ */ new Set([...Object.values(now).map((entry) => entry.move), ...next ? [next.move] : []])].sort();
  const aliveOnly = count(stats.dead?.turns) >= DEATH_ALIVE_MIN_TURNS ? sortedKeys(stats.alive?.moves).filter((move) => move !== "?" && count(stats.dead?.moves?.[move]) === 0) : [];
  return {
    monster,
    ally,
    n: count(stats.n),
    fights: count(stats.fights),
    now,
    next,
    exclusive: ruleMoves.filter(ownMove),
    aliveOnly,
    aliveTurns,
    evidence: [.../* @__PURE__ */ new Set([...stats.changed_evidence ?? [], ...stats.next_evidence ?? []])].slice(0, 3)
  };
}
function deathRules(monsters) {
  const out = /* @__PURE__ */ new Map();
  for (const monster of sortedKeys(monsters ?? {})) {
    const table2 = monsters[monster]?.observed?.ally_deaths;
    const rules = sortedKeys(table2).map((ally) => deathRuleOf(monster, ally, table2[ally], monsters[monster]?.moves ?? {})).filter((rule) => rule !== null);
    if (rules.length > 0) out.set(monster, rules);
  }
  return out;
}
function deathRulesOf(db) {
  return deathRules(db?.monsters);
}
var STUN_MOVE, STRIP_STUN_MIN_N, STRIP_STUN_MIN_SHARE, STRIP_CANCEL_MIN_N, STRIP_CANCEL_MIN_SHARE, STRIP_LANDED_MAX_SHARE, count, MOVE_RULE_MIN_N, MOVE_RULE_MIN_SHARE, sortedKeys, DEATH_RULE_MIN_N, DEATH_RULE_MIN_SHARE, DEATH_ALIVE_MIN_TURNS, DEATH_BASELINE_MIN_N, DEATH_BASELINE_MISS, DEATH_MODEL_SHARE, topMove;
var init_mechanics = __esm({
  "src/knowledge/mechanics.ts"() {
    "use strict";
    STUN_MOVE = "STUNNED";
    STRIP_STUN_MIN_N = 5;
    STRIP_STUN_MIN_SHARE = 0.8;
    STRIP_CANCEL_MIN_N = 3;
    STRIP_CANCEL_MIN_SHARE = 0.8;
    STRIP_LANDED_MAX_SHARE = 0.2;
    count = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
    MOVE_RULE_MIN_N = 5;
    MOVE_RULE_MIN_SHARE = 0.8;
    sortedKeys = (record) => Object.keys(record ?? {}).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    DEATH_RULE_MIN_N = 3;
    DEATH_RULE_MIN_SHARE = 0.9;
    DEATH_ALIVE_MIN_TURNS = 10;
    DEATH_BASELINE_MIN_N = 3;
    DEATH_BASELINE_MISS = 0.5;
    DEATH_MODEL_SHARE = 0.9;
    topMove = (counts, skip) => Object.entries(counts ?? {}).filter(([move]) => move !== skip && move !== STUN_MOVE && move !== "?").sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? null;
  }
});

// src/reflex/jev-experience.ts
function potionMentions(text) {
  return text.match(POTION_WORD)?.length ?? 0;
}
function scopeParts2(scope) {
  const at2 = scope.indexOf(":");
  return at2 < 0 ? [scope, ""] : [scope.slice(0, at2), scope.slice(at2 + 1)];
}
function applies(entry, asc) {
  if (entry.status !== "active") return false;
  const [lo, hi] = entry.asc ?? [0, 20];
  return asc >= lo && asc <= hi;
}
function byStrength(a, b) {
  return CONFIDENCE_RANK2[a.confidence] - CONFIDENCE_RANK2[b.confidence] || b.n_support - a.n_support || a.n_contradict - b.n_contradict || a.id.localeCompare(b.id);
}
function rank(entries, tier, within = () => 0) {
  return entries.map((entry) => ({ entry, tier: tier(entry) })).filter((item) => item.tier !== null).sort((a, b) => a.tier - b.tier || within(a.entry, b.entry) || byStrength(a.entry, b.entry)).map((item) => item.entry);
}
function withinBudget(ranked, maxCount, maxChars) {
  const out = [];
  let chars = 0;
  for (const entry of ranked) {
    if (out.length >= maxCount) break;
    if (out.length > 0 && chars + entry.lesson.length > maxChars) continue;
    out.push(entry);
    chars += entry.lesson.length;
  }
  return out;
}
function jevLessonLine(entry, ascension) {
  return `[${entry.scope} | confidence ${entry.confidence}, n=${entry.n_support}${entry.n_contradict > 0 ? `, against ${entry.n_contradict}` : ""}] ${lessonText(entry, ascension)}`;
}
function heldPotions(state) {
  return asArray(asRecord(state.run?.raw)["potions"]).map(asRecord).filter((slot) => bool(slot["occupied"]) && str(slot["potion_id"])).map((slot) => ({ id: str(slot["potion_id"]), name: str(slot["name"]) }));
}
function actBossScopeId(state) {
  return (state.run?.boss_id ?? str(asRecord(state.run?.raw)["boss_id"])).toUpperCase().replace(/_BOSS$/, "");
}
function powersOf2(holder) {
  return asArray(holder["powers"]).map(asRecord).map((power) => ({ id: str(power["power_id"]), name: str(power["name"]), debuff: bool(power["is_debuff"]) })).filter((power) => power.id);
}
function board(state, knowledge) {
  const run = asRecord(state.run?.raw);
  const combat = asRecord(state.combat?.raw ?? state.raw["combat"]);
  const cards = /* @__PURE__ */ new Set();
  const powerCards = /* @__PURE__ */ new Set();
  for (const card of [...asArray(run["deck"]), ...asArray(combat["hand"])].map(asRecord)) {
    const id = str(card["card_id"]);
    if (!id) continue;
    cards.add(id);
    const type = str(card["card_type"]) || (knowledge?.card(id)?.type ?? "");
    if (type === "Power") powerCards.add(id);
  }
  const actRaw = str(run["act_id"]);
  return {
    asc: state.run?.ascension ?? 0,
    act: /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : 1,
    potions: heldPotions(state),
    cards,
    powerCards,
    relics: new Set(asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"])).filter(Boolean)),
    ours: powersOf2(asRecord(combat["player"])),
    theirs: asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).flatMap(powersOf2)
  };
}
function holdsItem(kind, id, at2) {
  if (kind === "card") return at2.cards.has(id);
  if (kind === "relic") return at2.relics.has(id);
  if (kind === "potion") return at2.potions.some((potion) => potion.id === id);
  return false;
}
function potionWords(potions) {
  const words = /* @__PURE__ */ new Set();
  for (const potion of potions) {
    if (potion.name.length >= 2) words.add(potion.name.toLowerCase());
    if (!/_POTION$/.test(potion.id) && potion.id.length >= 4) words.add(potion.id.replace(/_/g, " ").toLowerCase());
  }
  return [...words];
}
function planPotionClauses(texts, potions = []) {
  const names = potionWords(potions);
  const out = [];
  let chars = 0;
  for (const text of texts) {
    for (const raw of text.split(/[;；。，|]|\.(?=\s)|\s—\s/)) {
      const clause = raw.trim().replace(/^boss prep:\s*/i, "");
      if (!clause || out.includes(clause)) continue;
      const lower = clause.toLowerCase();
      if (potionMentions(clause) === 0 && !names.some((name) => lower.includes(name))) continue;
      if (out.length > 0 && chars + clause.length > MAX_PLAN_POTION_CHARS) continue;
      out.push(clause);
      chars += clause.length;
    }
  }
  return out;
}
function planTexts(runPlan, briefPlan) {
  if (runPlan) return { floor: runPlan.floor, texts: [runPlan.bossPrep, runPlan.summary].filter(Boolean) };
  return briefPlan ? { floor: null, texts: [briefPlan] } : null;
}
function potionLessons(input, at2 = board(input.state, input.knowledge ?? null)) {
  const entries = (input.entries ?? loadExperience()).filter((entry) => applies(entry, at2.asc) && !(input.shown ?? []).includes(entry.id));
  const boss = actBossScopeId(input.state);
  const inBoss = input.kind === "boss";
  const isBoss = (entry) => {
    const [kind, id] = scopeParts2(entry.scope);
    return kind === "boss" && !!boss && id === boss && potionMentions(entry.lesson) > 0;
  };
  const tier = (entry) => {
    const [kind, id] = scopeParts2(entry.scope);
    if (entry.scope === "general:potion") return inBoss ? 2 : 0;
    if (isBoss(entry)) return inBoss ? 0 : 1;
    if (kind === "potion" && (at2.potions.some((potion) => potion.id === id) || !!entry.name && at2.potions.some((potion) => potion.name === entry.name))) return inBoss ? 1 : 2;
    return null;
  };
  const density = (entry) => isBoss(entry) ? potionMentions(entry.lesson) / Math.max(1, entry.lesson.length) : 0;
  return withinBudget(rank(entries, tier, (a, b) => density(b) - density(a)), MAX_POTION_LESSONS, MAX_POTION_LESSON_CHARS);
}
function mechanicLessons(input, at2 = board(input.state, input.knowledge ?? null), skip = []) {
  const all = (input.entries ?? loadExperience()).filter((entry) => applies(entry, at2.asc));
  const entries = all.filter((entry) => !(input.shown ?? []).includes(entry.id) && !skip.includes(entry.id));
  const monsters = input.monsters ?? monsterMoves();
  const monsterNames = Object.values(monsters).map((monster) => monster.name?.zh ?? "").filter((name) => name.length >= 2);
  const mentions = (lesson, word) => monsterNames.filter((name) => name !== word && name.includes(word)).reduce((text, name) => text.split(name).join(""), lesson).includes(word);
  const distinctive = (word) => word.length >= 2 && all.filter((entry) => entry.lesson.includes(word)).length <= all.length * MECHANIC_WORD_MAX_SHARE;
  const wordsOf = (power) => [.../* @__PURE__ */ new Set([power.name, ...MECHANIC_ALIASES[power.id] ?? []])].filter(distinctive);
  const theirs = at2.theirs.filter((power) => !power.debuff);
  const ours = at2.ours.filter((power) => !power.debuff);
  const onBoard = new Set([...at2.ours, ...at2.theirs].map((power) => power.id));
  const tier = (entry) => {
    const [kind, id] = scopeParts2(entry.scope);
    if (kind === "power") return onBoard.has(id) ? 0 : null;
    if (kind === "card" && at2.powerCards.has(id)) return 1;
    const held = holdsItem(kind, id, at2);
    const general = kind === "general" || kind === "act" && Number(id) === at2.act;
    const monster = kind === "boss" || kind === "elite" || kind === "hallway";
    const named = (power) => wordsOf(power).some((word) => mentions(entry.lesson, word));
    if (theirs.some((power) => named(power) && (held || general || monster && monsters[id]?.powers?.[power.id] !== void 0))) return 2;
    if ((held || kind === "general") && ours.some(named)) return 3;
    return null;
  };
  return withinBudget(rank(entries, tier), MAX_MECHANIC_LESSONS, MAX_MECHANIC_LESSON_CHARS);
}
function jevExperience(input) {
  const at2 = board(input.state, input.knowledge ?? null);
  const potion = potionLessons(input, at2);
  const mechanics = mechanicLessons(input, at2, potion.map((entry) => entry.id));
  const plan = planTexts(input.runPlan, input.briefPlan);
  const clauses = plan ? planPotionClauses(plan.texts, at2.potions) : [];
  const inBoss = input.kind === "boss";
  const legacyData = str(asRecord(input.state.run?.raw)["character_id"]).toLowerCase() !== "silent";
  const potionBlock = {
    note: inBoss ? POTION_NOTE_BOSS : POTION_NOTE_HALLWAY,
    ...inBoss || !legacyData ? {} : { data: POTION_BOSS_DATA.map((data) => `[data: ${data.source}] ${data.text}`) },
    ...clauses.length > 0 ? { run_plan_on_potions: `DeepSeek's run plan${plan?.floor != null ? ` (F${plan.floor})` : ""}, its words on potions: ${clauses.join(" | ")}` } : {},
    ...potion.length > 0 ? { lessons: potion.map((entry) => jevLessonLine(entry, at2.asc)) } : {}
  };
  return {
    // A boss fight with nothing to say about potions gets no block (the note alone adds nothing).
    potion: inBoss && clauses.length === 0 && potion.length === 0 ? null : potionBlock,
    mechanics: mechanics.length > 0 ? { note: MECHANICS_NOTE, lessons: mechanics.map((entry) => jevLessonLine(entry, at2.asc)) } : null,
    ids: { potion: potion.map((entry) => entry.id), mechanics: mechanics.map((entry) => entry.id) }
  };
}
var MAX_POTION_LESSONS, MAX_POTION_LESSON_CHARS, MAX_MECHANIC_LESSONS, MAX_MECHANIC_LESSON_CHARS, MAX_PLAN_POTION_CHARS, POTION_BOSS_DATA, POTION_NOTE_HALLWAY, POTION_NOTE_BOSS, MECHANICS_NOTE, JEV_EXPERIENCE_TEXTS, MECHANIC_ALIASES, MECHANIC_WORD_MAX_SHARE, POTION_WORD, CONFIDENCE_RANK2;
var init_jev_experience = __esm({
  "src/reflex/jev-experience.ts"() {
    "use strict";
    init_experience();
    init_monster_db();
    init_json();
    MAX_POTION_LESSONS = 6;
    MAX_POTION_LESSON_CHARS = 1400;
    MAX_MECHANIC_LESSONS = 3;
    MAX_MECHANIC_LESSON_CHARS = 600;
    MAX_PLAN_POTION_CHARS = 400;
    POTION_BOSS_DATA = [
      {
        // §5.2 (and conclusion 4): A8 all versions, 218 boss fights; 0 potions 9/27, 1+ 115/191; at 75%+ HP 8/21 and 103/149;
        // act 2 at 75%+ HP 0/6 and 19/37.
        source: "notes/potion-drinks-2026-09-29.md \xA75.2",
        text: "A8, 218 boss fights (all code versions): won 9/27 (33%) entering with no potion, 115/191 (60%) with 1+; at 75%+ HP 8/21 (38%) vs 103/149 (69%); act 2 boss at 75%+ HP 0/6 vs 19/37. Observational: no-potion runs often had weaker decks too."
      },
      {
        // §2(c) and appendix A (差距): the 7 A9 deaths where keeping one potion would likely have been enough.
        source: "notes/a9-analysis-2026-09-29.md \xA72(c)",
        text: "A9, 40 runs: 7 deaths where one more potion would likely have been enough: TYZH (1 HP short), 0H1X (4), 9Q7V (6), XMK1 (6), 2ZCK (11), 7MDJ, PHMV."
      }
    ];
    POTION_NOTE_HALLWAY = "Past runs on keeping potions for the act boss (experience base, logged data): evidence, not orders. The options' rollout numbers cover this fight only (a line that drinks nothing now may drink later in it); a potion still held when the fight ends counts for nothing in them.";
    POTION_NOTE_BOSS = "This is the act boss fight, the one potions are kept for. Past runs on potions (experience base): evidence, not orders.";
    MECHANICS_NOTE = "lessons from past runs about the mechanics in this fight: our power cards and buffs, the enemies' own powers (experience base): evidence, not orders";
    JEV_EXPERIENCE_TEXTS = [POTION_NOTE_HALLWAY, POTION_NOTE_BOSS, MECHANICS_NOTE, ...POTION_BOSS_DATA.map((data) => data.text)];
    MECHANIC_ALIASES = {
      ILLUSION_POWER: ["\u590D\u6D3B"],
      ADAPTABLE_POWER: ["\u590D\u6D3B"],
      REATTACH_POWER: ["\u590D\u6D3B"],
      STOCK_POWER: ["\u590D\u6D3B", "\u53EC\u5524"],
      INFESTED_POWER: ["\u53EC\u5524"],
      SURPRISE_POWER: ["\u53EC\u5524"],
      SUMMON_NEXT_TURN_POWER: ["\u53EC\u5524"],
      STEAM_ERUPTION_POWER: ["\u55B7\u53D1", "\u81EA\u7206"]
    };
    MECHANIC_WORD_MAX_SHARE = 0.05;
    POTION_WORD = /药|potion/gi;
    CONFIDENCE_RANK2 = { high: 0, med: 1, low: 2 };
  }
});

// src/sim/sim-pools.ts
function claimSimCores(owner, kind, release) {
  for (const [other, entry] of [...holders]) {
    if (entry.kind === kind) continue;
    holders.delete(other);
    entry.release();
  }
  holders.set(owner, { kind, release });
}
function leaveSimCores(owner) {
  holders.delete(owner);
}
var holders;
var init_sim_pools = __esm({
  "src/sim/sim-pools.ts"() {
    "use strict";
    holders = /* @__PURE__ */ new Map();
  }
});

// src/sim/double-boss-start.ts
function withDoubleBossStart(state, knowledge, input, model2 = doubleBossFor(state), opts = {}) {
  if (!model2 || state.run?.floor == null || state.run.floor > model2.firstFloor) return input;
  const linesEnabled = bossLinesOptions.enabled;
  let variants;
  bossLinesOptions.enabled = false;
  try {
    variants = model2.secondBosses.map(({ boss, count: count2 }) => {
      const raw = JSON.parse(JSON.stringify(state.raw));
      const run = asRecord(raw["run"]);
      run["floor"] = model2.secondFloor;
      run["boss_id"] = `${boss}_BOSS`;
      const secondState = parseGameState(raw);
      const second = syntheticBossStart(secondState, knowledge, `${boss}_BOSS`, input.solver.player.hp, opts).input;
      const targets2 = second.solver.enemies.map((e) => e.index);
      const ctx = { enemyTargets: targets2, strength: 0, weak: false, observedPoison: model2.poisonPotionAmount };
      const sources = [];
      const potions = second.solver.hand.slice();
      const relics = asArray(run["relics"]).map((r) => str(asRecord(r)["relic_id"]));
      for (const potion of potionViews({ raw: run }, knowledge)) {
        const source = randomPotionSource(potion, secondState, knowledge, ctx, relics.includes("FIDDLE"));
        const card = modelPotion(potion.potion_id, potion.name, potion.slot, targets2, ctx);
        if (!card || potions.some((p) => p.cardId === card.cardId)) continue;
        potions.push({ ...card, potionCost: 0 });
        if (source) sources.push({ ...source, cost: 0 });
      }
      return { boss, count: count2, input: {
        ...second,
        solver: { ...second.solver, hand: potions, continuationValue: void 0 },
        piles: { ...second.piles, handBase: potions.map(() => null) },
        ...sources.length > 0 ? { randomPotions: sources } : {},
        captureResources: true
      } };
    });
  } finally {
    bossLinesOptions.enabled = linesEnabled;
  }
  const belt = asArray(asRecord(state.run?.raw)["potions"]).map(asRecord).filter((p) => p["occupied"] === true);
  const hand = input.solver.hand.map((card) => card.type === "Potion" && model2.potionHp[card.cardId.split(":")[1] ?? ""] !== void 0 ? { ...card, potionCost: model2.potionHp[card.cardId.split(":")[1]] } : card);
  const handBase = input.piles.handBase.slice();
  const targets = input.solver.enemies.map((e) => e.index);
  for (const potion of belt) {
    if (potion["potion_id"] !== "POISON_POTION") continue;
    const card = modelPotion(
      "POISON_POTION",
      str(potion["name"]),
      Number(potion["index"]),
      targets,
      { enemyTargets: targets, strength: 0, weak: false, observedPoison: model2.poisonPotionAmount }
    );
    if (card && !hand.some((p) => p.cardId === card.cardId)) {
      hand.push({ ...card, potionCost: model2.potionHp["POISON_POTION"] ?? 0 });
      handBase.push(null);
    }
  }
  return { ...input, solver: { ...input.solver, hand, continuationValue: model2.value }, piles: { ...input.piles, handBase }, continuation: {
    variants,
    potions: belt.map((p) => ({ key: `POTION:${str(p["potion_id"])}:${p["index"]}`, id: str(p["potion_id"]) })),
    source: model2.value.source,
    limitation: model2.limitation
  } };
}
var init_double_boss_start = __esm({
  "src/sim/double-boss-start.ts"() {
    "use strict";
    init_json();
    init_double_boss();
    init_schema();
    init_narrow();
    init_card_model();
    init_combat_plan();
    init_boss_start();
    init_boss_lines();
  }
});

// src/sim/boss-lines.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync as existsSync2, readdirSync, readFileSync as readFileSync15 } from "node:fs";
import { join as join4 } from "node:path";
import { availableParallelism } from "node:os";
import { MessageChannel, receiveMessageOnPort, Worker } from "node:worker_threads";
function wonLoss(line) {
  return line.hpLossWon?.median ?? Infinity;
}
function envWorkers() {
  const n = Number(process.env["BOSS_SIM_WORKERS"]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}
function bossKeyOf(enemyIds) {
  const ids = new Set(enemyIds);
  if (ids.has("CRUSHER") || ids.has("ROCKET")) return "KAISER_CRAB";
  if (ids.has("KIN_PRIEST")) return "THE_KIN";
  if (ids.has("QUEEN")) return "QUEEN";
  const known = ["AEONGLASS", "CEREMONIAL_BEAST", "KNOWLEDGE_DEMON", "LAGAVULIN_MATRIARCH", "SOUL_FYSH", "TEST_SUBJECT", "THE_INSATIABLE", "VANTOM", "WATERFALL_GIANT"];
  return known.find((id) => ids.has(id)) ?? null;
}
function lowTrustOfState(state) {
  const enemies = state.raw["combat"]?.enemies;
  const ids = Array.isArray(enemies) ? enemies.map((e) => String(e?.["enemy_id"] ?? "")) : [];
  const boss = bossKeyOf(ids);
  return boss ? bossTrustReason(boss, "b2", state.run?.ascension, state.run?.floor) : null;
}
function bossSimInput(args) {
  const meta = fightMetaOf(args.state, args.knowledge, args.memory);
  const { handBase, ...board2 } = boardRolloutInput(args.state, args.knowledge, args.solver, meta.asc);
  const runRaw = args.state.run?.raw ?? {};
  const input = {
    ...board2,
    plans: [],
    piles: { draw: args.piles.draw, discard: args.piles.discard, handBase, ...args.piles.drawTop && args.piles.drawTop.length > 0 ? { drawTop: args.piles.drawTop, ...args.piles.drawAdded && args.piles.drawAdded.length > 0 ? { drawAdded: args.piles.drawAdded } : {} } : {} },
    meta: { ...meta, kind: "boss" },
    mm: {},
    model: null,
    gates: null,
    fightRelics: fightRelicsOf(runRaw, args.solver.turn ?? meta.t),
    ...args.randomPotions.length > 0 ? { randomPotions: args.randomPotions.map((source) => ({ ...source, cost: args.solver.continuationValue ? source.cost ?? 0 : 0 })) } : {}
  };
  const model2 = firstDoubleBoss(args.state);
  return model2 ? withDoubleBossStart(args.state, args.knowledge, input, model2) : input;
}
function workerDataSignature() {
  try {
    const hash = createHash2("sha256");
    for (const dir of knowledgeDataDirs()) {
      if (!existsSync2(dir)) continue;
      for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) hash.update(name).update("\0").update(readFileSync15(join4(dir, name))).update("\0");
    }
    return hash.digest("hex").slice(0, 32);
  } catch {
    return null;
  }
}
function bossLinesPool() {
  return shared ??= new BossLinesPool();
}
function bossLinesPoolData() {
  return shared && shared.live > 0 ? shared.data : null;
}
function releaseBossLinesPool() {
  const pool = shared;
  shared = null;
  if (pool) void pool.close();
}
function runPairsSerial(input, pairs, samples2, seed2, deadlineMs = Infinity, now = () => performance.now()) {
  const started = now();
  const outcomes = pairs.map(() => new Array(samples2));
  let timedOut = false;
  let done = 0;
  for (let i = 0; i < samples2 && !timedOut; i += 1) {
    for (let pair = 0; pair < pairs.length; pair += 1) {
      if (now() - started > deadlineMs) {
        timedOut = true;
        break;
      }
      outcomes[pair][i] = fightSampleOf(input, pairs[pair], sampleSeed(seed2, i));
      done += 1;
    }
  }
  const complete = [];
  for (let i = 0; i < samples2; i += 1) if (outcomes.every((row) => row[i] !== void 0)) complete.push(i);
  return { outcomes, complete, timedOut, elapsedMs: Math.round(now() - started), workers: 0, done };
}
function fightSampleOf(input, pair, seed2) {
  return fightSample(input, pair.plan, seed2, BOSS_SIM_MAX_TURNS, true, pair.order);
}
function linesInput(input, holdHp = bossLinesOptions.holdHp ?? tableHoldHp) {
  return slimInput(input, BOSS_SIM_POLICY_NODES, BOSS_SIM_DAMAGE_SCALE, BOSS_SIM_HP_SCALE, BOSS_SIM_THREAT, BOSS_SIM_POTION_HOLD, holdHp);
}
function runLines(input, lines, opts) {
  const orders2 = fightOrders(input);
  const pairs = lines.flatMap((plan) => [null, ...orders2].map((order) => ({ plan, order })));
  const slim = linesInput(input, opts.holdHp);
  const now = opts.now ?? (() => performance.now());
  const run = opts.serial ? runPairsSerial(slim, pairs, opts.samples, opts.seed, opts.deadlineMs, now) : bossLinesPool().run(slim, pairs, opts.samples, opts.seed, opts.deadlineMs, now);
  const per = orders2.length + 1;
  const out = lines.map((_, li) => {
    let pick2 = null;
    for (let k = 0; k < per; k += 1) {
      const pair = li * per + k;
      const res = { ...summarizeLine(li, run.complete.map((i) => run.outcomes[pair][i])), order: k === 0 ? null : orders2[k - 1].label };
      if (!pick2 || res.winProb > pick2.winProb || res.winProb === pick2.winProb && wonLoss(res) < wonLoss(pick2)) pick2 = res;
    }
    return pick2;
  });
  return {
    lines: out,
    samples: run.complete.length,
    requested: opts.samples,
    timedOut: run.timedOut,
    elapsedMs: run.elapsedMs,
    workers: run.workers,
    orders: orders2.length,
    pairs: pairs.length,
    done: run.done,
    ...input.continuation ? { continuation: { source: input.continuation.source, limitation: input.continuation.limitation } } : {}
  };
}
function rankLines(lines, tieSe = BOSS_LINES_TIE_SE, eligible = () => true, second = wonLoss) {
  const idx = lines.map((_, i) => i).filter(eligible);
  if (idx.length === 0) return { best: -1, tied: [], vsBest: lines.map(() => null), winTied: lines.map(() => false) };
  let top = idx[0];
  for (const i of idx) {
    const a = lines[i];
    const b = lines[top];
    if (a.winProb > b.winProb || a.winProb === b.winProb && second(a) < second(b)) top = i;
  }
  const winTied = lines.map((line, i) => {
    if (!idx.includes(i)) return false;
    if (i === top) return true;
    const c = compareLines(line, lines[top]);
    return c.winDiff >= -tieSe * c.winSe && !(c.winSe === 0 && c.winDiff < 0);
  });
  let best = top;
  for (const i of idx) {
    if (!winTied[i]) continue;
    const a = lines[i];
    const b = lines[best];
    if (second(a) < second(b) || second(a) === second(b) && a.winProb > b.winProb) best = i;
  }
  const shown = (line) => `${Math.round(line.winProb * 1e3)}|${Math.round(second(line) * 10)}`;
  const tied = idx.filter((i) => winTied[i] && shown(lines[i]) === shown(lines[best]));
  return { best, tied: tied.length >= 2 ? tied : [], vsBest: lines.map((line, i) => i === best ? null : compareLines(line, lines[best])), winTied };
}
function modeOf(counts) {
  let best = null;
  for (const [key, n] of Object.entries(counts)) if (best === null || n > (counts[best] ?? 0) || n === counts[best] && Number(key) < best) best = Number(key);
  return best;
}
function lineSimText(line, calibrated2, vs, run, turnNow, flags) {
  if (line.sequence) return `\u4F4E\u53EF\u4FE1\u8FDE\u6218\u6A21\u62DF\uFF1AF48\u2192F49\u8FDE\u7EED\u901A\u5173 ${pct2(line.winProb)}%\uFF08\u539F\u59CB\u3001\u672A\u6821\u51C6\uFF09\uFF1B\u80DCF48 ${line.sequence.firstWins}/${line.samples}\uFF0C\u5176\u4E2D\u6B7BF49 ${line.sequence.firstWinSecondDeaths}\u3001\u672A\u5B8C\u6210F49 ${line.sequence.secondUnfinished}\uFF1B\u6BCF\u6761\u6837\u672C\u4F20\u9012\u5B9E\u9645\u5269\u4F59HP/\u836F\u6C34\uFF0C${line.samples}\u6837\u672C\uFF1B\u4E0D\u662F\u5FC5\u6B7B\u6216SL\u5224\u636E\u3002`;
  const vsText = vs === null ? flags.lowTrust ? "the simulation's best line" : "the best line" : `vs the ${flags.lowTrust ? "simulation's " : ""}best line ${pts(vs.winDiff)} \xB1 ${Math.max(1, Math.round(vs.winSe * 100))} pts${flags.winTied ? ", tied on win rate" : ""}`;
  const won = line.hpLossWon ? `HP lost when won median ${Math.round(line.hpLossWon.median)}` : "no winning sample";
  const turns = line.turnsWon ? `, ~${Math.round(line.turnsWon.median)} turn${Math.round(line.turnsWon.median) === 1 ? "" : "s"} to win (this one included)` : "";
  const death = modeOf(line.deathTurns);
  const dies = line.deaths > 0 && death !== null ? `; the losing samples die most often on T${turnNow + death - 1} (dead in ${pct2(line.deaths / Math.max(1, line.samples))}%)` : "";
  const capped = line.capped > 0 ? `; ${line.capped} unfinished after ${BOSS_SIM_MAX_TURNS} turns` : "";
  const n = run.timedOut ? `${run.samples} of ${run.requested} samples (time limit)` : `${run.samples} samples`;
  const order = "order" in line && typeof line.order === "string" ? `; later turns kill ${line.order}` : "";
  return `${flags.lowTrust ? "low confidence: " : ""}win ${pct2(calibrated2)}% (${vsText}), ${won}${turns}${dies}${capped}${order}; ${n}`;
}
function namesOf(input) {
  const cards = /* @__PURE__ */ new Map();
  for (const card of [...input.solver.hand, ...input.piles.draw, ...input.piles.discard]) if (!cards.has(card.cardId)) cards.set(card.cardId, card.name);
  const potion = (id) => input.solver.hand.find((card) => card.cardId.startsWith(`${id}:`))?.name.replace(/^potion /, "") ?? id.split(":")[1].toLowerCase().replace(/_/g, " ");
  return { card: (id) => cards.get(id) ?? (id.startsWith("POTION:") ? potion(id) : id) };
}
function fightPlanText(input, line, turnNow) {
  if (line.sequence) return null;
  const won = line.outcomes.filter((o) => o.won);
  const base = won.length >= 10 ? won : line.outcomes;
  if (base.length === 0) return null;
  const share = (n) => n / base.length >= BOSS_LINES_PLAN_SHARE;
  const names = namesOf(input);
  const T = (rel) => `T${turnNow + rel - 1}`;
  const median = (xs) => Math.round(quantile(xs.slice().sort((a, b) => a - b), 0.5));
  const parts = [];
  const powerTurns = /* @__PURE__ */ new Map();
  for (const o of base) {
    const firsts = /* @__PURE__ */ new Map();
    for (const [t, id] of o.powers ?? []) if (!firsts.has(id)) firsts.set(id, t);
    for (const [id, t] of firsts) powerTurns.set(id, [...powerTurns.get(id) ?? [], t]);
  }
  const powers = [...powerTurns.entries()].filter(([, ts]) => share(ts.length)).map(([id, ts]) => ({ id, t: median(ts) })).sort((a, b) => a.t - b.t);
  if (powers.length > 0) {
    const last = powers[powers.length - 1].t;
    parts.push(`${powers[0].t === last ? T(last) : `${T(powers[0].t)}\u2013${T(last)}`} play ${powers.map((p) => names.card(p.id)).join(", ")}`);
  }
  const byTurn = /* @__PURE__ */ new Map();
  for (const o of base) o.incomingByTurn.forEach((inc, k) => byTurn.set(k + 1, [...byTurn.get(k + 1) ?? [], inc]));
  const turns = [...byTurn.entries()].filter(([, inc]) => share(inc.length)).map(([t, inc]) => ({ t, inc: inc.reduce((s, x) => s + x, 0) / inc.length }));
  const typical = quantile(turns.map((x) => x.inc).sort((a, b) => a - b), 0.5);
  const hp = input.solver.player.hp;
  const big = turns.filter((x) => x.t > 1 && x.inc >= Math.max(1.5 * typical, 0.25 * hp) && x.inc >= 10).slice(0, 3);
  if (big.length > 0) parts.push(`${big.map((x) => T(x.t)).join(", ")} the enemies hit hardest (incoming ~${big.map((x) => Math.round(x.inc)).join(", ~")})`);
  if (input.solver.enemies.filter((e) => e.hp > 0).length >= 2) {
    const killT = /* @__PURE__ */ new Map();
    for (const o of base) for (const [t, , index] of o.kills ?? []) killT.set(index, [...killT.get(index) ?? [], t]);
    const kills = [...killT.entries()].filter(([, ts]) => share(ts.length)).map(([index, ts]) => ({ index, t: median(ts) })).sort((a, b) => a.t - b.t);
    const nameOf3 = (index) => input.solver.enemies.find((e) => e.index === index)?.name ?? `enemy ${index}`;
    if (kills.length > 0) parts.push(`kill ${kills.map((k) => `${nameOf3(k.index)} ~${T(k.t)}`).join(", then ")}`);
  }
  const drinkT = /* @__PURE__ */ new Map();
  for (const o of base) {
    const firsts = /* @__PURE__ */ new Map();
    for (const [t, id] of o.drinks ?? []) if (!firsts.has(id)) firsts.set(id, t);
    for (const [id, t] of firsts) drinkT.set(id, [...drinkT.get(id) ?? [], t]);
  }
  const drinks2 = [...drinkT.entries()].filter(([, ts]) => share(ts.length)).map(([id, ts]) => ({ id, t: median(ts), n: ts.length }));
  if (drinks2.length > 0) parts.push(`drink ${drinks2.map((d) => `${names.card(`POTION:${d.id}`)} ~${T(d.t)}`).join(", ")}`);
  const end = median(base.map((o) => o.turns));
  parts.push(won.length >= 10 ? `the boss dies ~${T(end)} (median of ${won.length} winning samples)` : `no plan wins in most samples: ${won.length}/${line.outcomes.length} won, the fight ends ~${T(end)}`);
  return parts.join("; ");
}
function bossLineSim(args) {
  const now = bossLinesOptions.now ?? (() => performance.now());
  const started = now();
  const ms = () => Math.round(now() - started);
  try {
    if (args.lines.length === 0) return { available: false, reason: "no line", ms: ms() };
    const fight = `${String(args.state.raw["run_id"] ?? "")}:${args.state.run?.floor ?? "?"}`;
    if (failed.fight === fight && failed.count >= BOSS_LINES_MAX_FAILURES) return { available: false, reason: `off for this fight: ${failed.count} questions in a row got no sample from the worker pool`, ms: ms() };
    const turnKey = `${fight}:${args.turn ?? "?"}`;
    const memo = args.memory.bossLines?.turn === turnKey ? args.memory.bossLines : { turn: turnKey, spentMs: 0 };
    const left = Math.min(bossLinesOptions.deadlineMs, bossLinesOptions.turnBudgetMs - memo.spentMs);
    if (left < bossLinesOptions.minMs) return { available: false, reason: `this turn's ${Math.round(bossLinesOptions.turnBudgetMs / 1e3)} s for the simulation is spent`, ms: ms() };
    const input = bossSimInput(args);
    const boss = bossKeyOf(input.enemies.map((e) => e.id));
    const lowTrust = input.continuation?.limitation ?? (boss ? bossTrustReason(boss, "b2", args.state.run?.ascension, args.state.run?.floor) : null);
    const samples2 = args.samples ?? bossLinesOptions.samples;
    const memoed = args.memo ? recallLines(args.memo, input, args.lines, samples2, left) : null;
    let run;
    if (memoed) run = { ...memoed, memo: { wallMs: ms() } };
    else {
      try {
        run = runLines(input, args.lines, { samples: samples2, seed: bossLinesOptions.seed, deadlineMs: left, serial: bossLinesOptions.serial, now });
      } catch (error) {
        releaseBossLinesPool();
        failed = { fight, count: failed.fight === fight ? failed.count + 1 : 1 };
        throw error;
      }
      if (args.memo) storeLines(args.memo, input, args.lines, samples2, run);
    }
    args.memory.bossLines = { turn: turnKey, spentMs: memo.spentMs + run.elapsedMs };
    if (run.samples === 0) {
      releaseBossLinesPool();
      failed = { fight, count: failed.fight === fight ? failed.count + 1 : 1 };
      return { available: false, reason: `no sample finished within ${Math.round(left / 1e3)} s`, ms: ms() };
    }
    failed = { fight, count: 0 };
    const eligible = (i) => args.eligible ? args.eligible(args.lines[i]) : true;
    const rank2 = rankLines(run.lines, BOSS_LINES_TIE_SE, eligible);
    const dryRank = rankLines(run.lines, BOSS_LINES_TIE_SE, (i) => eligible(i) && !args.drinks(args.lines[i]));
    const turnNow = args.turn ?? 1;
    const start = turnNow <= 1 ? "start" : "mid";
    const byPlan = /* @__PURE__ */ new Map();
    run.lines.forEach((line, i) => {
      const calibrated2 = line.sequence ? line.winProb : calibratedWinProb(line.winProb, line.samples, start, args.state.run?.ascension ?? 0);
      const vsBest = rank2.vsBest[i] ?? null;
      const winTied = rank2.winTied[i] ?? false;
      byPlan.set(args.lines[i], { result: line, calibrated: calibrated2, vsBest, winTied, text: lineSimText(line, calibrated2, rank2.best === i ? null : vsBest, run, turnNow, { best: rank2.best === i, winTied, lowTrust }) });
    });
    const key = (i) => rank2.winTied[i] ? [0, wonLoss(run.lines[i]), -run.lines[i].winProb] : [1, -run.lines[i].winProb, wonLoss(run.lines[i])];
    const cmp = (x, y) => x === y ? 0 : x < y ? -1 : 1;
    const order = run.lines.map((_, i) => i).sort((a, b) => cmp(key(a)[0], key(b)[0]) || cmp(key(a)[1], key(b)[1]) || cmp(key(a)[2], key(b)[2]) || a - b).map((i) => args.lines[i]);
    const showPlan = args.turn === null || args.turn <= 1 || (args.turn - 1) % BOSS_LINES_PLAN_EVERY === 0;
    const plan = showPlan && rank2.best >= 0 ? fightPlanText(input, run.lines[rank2.best], turnNow) : null;
    const sim = {
      available: true,
      byPlan,
      best: lowTrust || rank2.best < 0 || rank2.tied.length > 0 ? null : args.lines[rank2.best],
      tied: lowTrust ? [] : rank2.tied.map((i) => args.lines[i]),
      bestDry: lowTrust || dryRank.best < 0 ? null : args.lines[dryRank.best],
      boss,
      lowTrust,
      run,
      plan,
      order
    };
    bossLinesOptions.onSim?.(sim);
    return sim;
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 160)}`, ms: ms() };
  }
}
function linesWhere() {
  if (bossLinesOptions.serial) return "main";
  const data = bossLinesPoolData() ?? workerDataSignature();
  return data ? `pool:${data}` : null;
}
function linesMemoKey(input, lines, samples2, where) {
  return memoKey("b2", { input, lines, samples: samples2, seed: bossLinesOptions.seed, holdHp: identityToken(bossLinesOptions.holdHp ?? tableHoldHp), maxTurns: BOSS_SIM_MAX_TURNS, where });
}
function recallLines(memo, input, lines, samples2, left) {
  try {
    const where = linesWhere();
    const key = where ? linesMemoKey(input, lines, samples2, where) : null;
    const hit = key ? memo.get(key) : null;
    if (!hit || hit.value.timedOut || hit.meta.elapsedMs > left) return null;
    memo.took();
    return hit.value;
  } catch {
    return null;
  }
}
function storeLines(memo, input, lines, samples2, run) {
  try {
    if (run.timedOut || run.samples < samples2 || run.samples === 0) return;
    const where = linesWhere();
    const key = where ? linesMemoKey(input, lines, samples2, where) : null;
    if (key) memo.set(key, run, { elapsedMs: run.elapsedMs });
  } catch {
  }
}
function simCompare(sim, plan, than) {
  const a = sim?.available ? sim.byPlan.get(plan) : void 0;
  const b = sim?.available ? sim.byPlan.get(than) : void 0;
  return a && b ? compareLines(a.result, b.result) : null;
}
function simWinsLess(sim, plan, pick2) {
  const a = sim?.available ? sim.byPlan.get(plan) : void 0;
  const b = sim?.available ? sim.byPlan.get(pick2) : void 0;
  if (!a || !b) return false;
  const c = compareLines(a.result, b.result);
  return c.winDiff < -BOSS_LINES_TIE_SE * c.winSe;
}
function simNote(sim) {
  if (!sim.available) return `whole-fight simulation unavailable (${sim.reason})`;
  if (sim.run.continuation) return `F48\u2192F49\u8FDE\u7EED\u901A\u5173\u6A21\u62DF\uFF1A\u6BCF\u6761\u7B2C\u4E00\u6218\u80DC\u5229\u6837\u672C\u4EE5\u5B9E\u9645\u5269\u4F59HP\u3001\u836F\u6C34\u548C\u590D\u6D3B\u8D44\u6E90\u8FDB\u5165\u7B2C\u4E8C\u6218\uFF0C\u7B2C\u4E8Cboss\u6309\u5DF2\u89C2\u5BDF\u5206\u5E03\u62BD\u6837\uFF1B${sim.run.samples}\u914D\u5BF9\u6837\u672C\uFF0C\u672A\u7ECF\u4E24\u6218\u6821\u51C6\u3002${sim.run.continuation.limitation}\uFF1B\u4E0D\u662F\u5FC5\u6B7B\u6216SL\u5224\u636E\u3002\u8BC1\u636E\uFF1A${sim.run.continuation.source}`;
  const how = `each option's whole_fight_sim: that line this turn, then the simulator's own play to the fight's end, ${sim.run.samples} samples per line on the same random numbers (${sim.run.timedOut ? `cut from ${sim.run.requested} by the time limit, ` : ""}${(sim.run.elapsedMs / 1e3).toFixed(1)} s); the win rate is calibrated on logged boss fights, the difference to the best line is paired (\xB1 standard error)`;
  return `${how}. rollout_best is the line with the highest simulated win rate (lines within ${BOSS_LINES_TIE_SE} standard errors of it count as tied), then the least HP lost when won (median); the 5-turn rollout's numbers stay for reference`;
}
function simLog(sim, keyOf, extra = {}) {
  if (!sim.available) return { available: false, reason: sim.reason, ms: sim.ms, ...extra };
  const lines = {};
  for (const [plan, line] of sim.byPlan) {
    const key = keyOf(plan);
    if (!key) continue;
    lines[key] = {
      win: Math.round(line.result.winProb * 1e3) / 1e3,
      cal: Math.round(line.calibrated * 1e3) / 1e3,
      d: line.vsBest ? Math.round(line.vsBest.winDiff * 1e3) / 1e3 : 0,
      se: line.vsBest ? Math.round(line.vsBest.winSe * 1e3) / 1e3 : 0,
      loss: line.result.hpLoss.mean,
      won_loss: line.result.hpLossWon?.median ?? null,
      order: line.result.order,
      ...line.result.sequence ? { sequence: { first_wins: line.result.sequence.firstWins, won_first_died_second: line.result.sequence.firstWinSecondDeaths, second_unfinished: line.result.sequence.secondUnfinished } } : {}
    };
  }
  return {
    available: true,
    ...sim.run.continuation ? { objective: "F48_F49_continuous", calibration: "none", continuation: { source: sim.run.continuation.source, limitation: sim.run.continuation.limitation } } : {},
    // The question's own wall clock (an SL retry memo hit: the lookup's; the decision row's timing.memo has the stored run's).
    ms: sim.run.memo ? sim.run.memo.wallMs : sim.run.elapsedMs,
    samples: sim.run.samples,
    requested: sim.run.requested,
    timed_out: sim.run.timedOut,
    orders: sim.run.orders,
    workers: sim.run.workers,
    boss: sim.boss,
    low_trust: sim.lowTrust !== null,
    best: sim.best ? keyOf(sim.best) : null,
    tied: sim.tied.map((plan) => keyOf(plan) ?? "?"),
    ranked: sim.order.map((plan) => keyOf(plan) ?? "?"),
    lines,
    ...sim.plan ? { plan: sim.plan } : {},
    ...extra
  };
}
var BOSS_LINES_SAMPLES, BOSS_LINES_DEADLINE_MS, BOSS_LINES_TURN_BUDGET_MS, BOSS_LINES_MIN_MS, BOSS_LINES_WORKERS, BOSS_LINES_SEED, BOSS_LINES_TIE_SE, BOSS_LINES_PLAN_EVERY, BOSS_LINES_PLAN_SHARE, bossLinesOptions, BossLinesPool, shared, pct2, pts, BOSS_LINES_MAX_FAILURES, failed;
var init_boss_lines = __esm({
  "src/sim/boss-lines.ts"() {
    "use strict";
    init_rollout_live();
    init_boss_sim();
    init_files();
    init_boss_trust();
    init_compute_memo();
    init_sim_pools();
    init_double_boss_start();
    init_double_boss();
    BOSS_LINES_SAMPLES = 600;
    BOSS_LINES_DEADLINE_MS = 25e3;
    BOSS_LINES_TURN_BUDGET_MS = 3e4;
    BOSS_LINES_MIN_MS = 3e3;
    BOSS_LINES_WORKERS = 20;
    BOSS_LINES_SEED = 7;
    BOSS_LINES_TIE_SE = 2;
    BOSS_LINES_PLAN_EVERY = 3;
    BOSS_LINES_PLAN_SHARE = 0.5;
    bossLinesOptions = {
      enabled: process.env["BOSS_SIM_LINES"] !== "off",
      lowTrust: process.env["BOSS_SIM_LOW_TRUST"] === "always" ? "always" : "retry",
      samples: BOSS_LINES_SAMPLES,
      deadlineMs: BOSS_LINES_DEADLINE_MS,
      turnBudgetMs: BOSS_LINES_TURN_BUDGET_MS,
      minMs: BOSS_LINES_MIN_MS,
      workers: envWorkers() ?? BOSS_LINES_WORKERS,
      seed: BOSS_LINES_SEED,
      serial: false,
      now: null,
      onSim: null,
      holdHp: null
    };
    BossLinesPool = class {
      size;
      workers = [];
      signal = new SharedArrayBuffer(8);
      flag = new Int32Array(this.signal);
      job = 0;
      /** The data its workers loaded (workerDataSignature at their start; null: not started, or unreadable). */
      data = null;
      constructor(size = bossLinesOptions.workers) {
        this.size = Math.max(1, Math.min(BOSS_SIM_MAX_WORKERS, availableParallelism() - 2, Math.floor(size)));
      }
      start() {
        if (this.workers.length > 0) return this.workers;
        const ts = "file:///home/dw/Projects/agent-sts2/learner/runs/20261017-170120-62ee45ff-d6c7-407f-88be-efad3ce5199b-silent-boss-calibration/.published-model/agent/src/sim/boss-lines.ts".endsWith(".ts");
        const url = new URL(ts ? "./boss-lines-worker.ts" : "./boss-lines-worker.js", "file:///home/dw/Projects/agent-sts2/learner/runs/20261017-170120-62ee45ff-d6c7-407f-88be-efad3ce5199b-silent-boss-calibration/.published-model/agent/src/sim/boss-lines.ts");
        claimSimCores(this, "boss-lines", () => {
          if (shared === this) shared = null;
          void this.close();
        });
        this.data = workerDataSignature();
        for (let k = 0; k < this.size; k += 1) {
          const { port1, port2 } = new MessageChannel();
          const worker = new Worker(url, { workerData: { port: port2, signal: this.signal }, transferList: [port2], ...ts ? { execArgv: ["--import", "tsx"] } : {} });
          worker.unref();
          port1.unref();
          this.workers.push({ worker, port: port1, busy: false });
        }
        return this.workers;
      }
      /** Every (pair, sample) to the fight's end, sample-major, until done or `deadlineMs` of wall clock. */
      run(input, pairs, samples2, seed2, deadlineMs, now = () => performance.now()) {
        const started = now();
        const workers = this.start();
        const job = this.job += 1;
        Atomics.store(this.flag, 1, job);
        const tasks = [];
        for (let i = 0; i < samples2; i += 1) for (let pair = 0; pair < pairs.length; pair += 1) tasks.push([pair, i, sampleSeed(seed2, i)]);
        const chunk = Math.max(1, Math.ceil(tasks.length / (workers.length * 8)));
        const chunks = [];
        for (let k = 0; k < tasks.length; k += chunk) chunks.push(tasks.slice(k, k + chunk));
        const outcomes = pairs.map(() => new Array(samples2));
        for (const w of workers) w.worker.postMessage({ type: "input", job, input, pairs, maxTurns: BOSS_SIM_MAX_TURNS });
        let pending = chunks.length;
        let done = 0;
        let error = null;
        const give = (w) => {
          const next = chunks.shift();
          if (!next) return;
          w.busy = true;
          w.worker.postMessage({ type: "run", job, tasks: next });
        };
        for (const w of workers) if (!w.busy) give(w);
        let timedOut = false;
        while (pending > 0 && error === null) {
          const seen = Atomics.load(this.flag, 0);
          let got = false;
          for (const w of workers) {
            for (let msg = receiveMessageOnPort(w.port); msg; msg = receiveMessageOnPort(w.port)) {
              got = true;
              w.busy = false;
              const reply = msg.message;
              if (reply.job === job) {
                if ("error" in reply) error = reply.error;
                else {
                  for (const [pair, i, result] of reply.results) outcomes[pair][i] = result;
                  done += reply.results.length;
                  pending -= 1;
                }
              }
              if (error === null) give(w);
            }
          }
          if (pending === 0 || error !== null) break;
          const left = deadlineMs - (now() - started);
          if (left <= 0) {
            timedOut = true;
            break;
          }
          if (!got) Atomics.wait(this.flag, 0, seen, Math.min(left, 250));
        }
        Atomics.store(this.flag, 1, 0);
        for (const w of workers) w.worker.postMessage({ type: "drop", job });
        if (error !== null) throw new Error(`boss-lines worker: ${error}`);
        const complete = [];
        for (let i = 0; i < samples2; i += 1) if (outcomes.every((row) => row[i] !== void 0)) complete.push(i);
        return { outcomes, complete, timedOut, elapsedMs: Math.round(now() - started), workers: workers.length, done };
      }
      /** Workers running now (0 before the first run and after close()). */
      get live() {
        return this.workers.length;
      }
      async close() {
        const workers = this.workers;
        this.workers = [];
        leaveSimCores(this);
        await Promise.all(workers.map((w) => w.worker.terminate()));
      }
    };
    shared = null;
    pct2 = (x) => Math.round(x * 100);
    pts = (x) => `${x > 0 ? "+" : x < 0 ? "\u2212" : "\xB1"}${Math.abs(Math.round(x * 100))}`;
    BOSS_LINES_MAX_FAILURES = 2;
    failed = { fight: "", count: 0 };
  }
});

// src/sl/explore.ts
function lineText(steps) {
  return steps.map((step) => step.targetName ? `${step.name} -> ${step.targetName}` : step.name).join(", ") || "end turn";
}
function playKey(play2, target) {
  const what = "potion" in play2 ? `potion:${play2.potion}` : `${play2.card}${play2.upgraded ? "+" : ""}`;
  return target ? `${what}>${target}` : what;
}
function turnCanon(plays) {
  return plays.length === 0 ? "nothing" : [...plays].sort().join(", ");
}
function summaryPlay(step) {
  return step.targetName && !step.potion ? `${step.name} -> ${step.targetName}` : step.name;
}
function triedHas(tried, line) {
  return triedHow(tried, line) !== null;
}
function triedHow(tried, line) {
  if (!tried) return null;
  if (line.canon !== void 0 && tried.canon.includes(line.canon) || line.loose !== void 0 && tried.loose.includes(line.loose)) return "exact";
  const byCards = (tried.cards ?? []).some((entry) => {
    const key = entry.loose === true ? line.loose : line.canon;
    return key !== void 0 && cardsRepeat(entry, key);
  });
  return byCards ? "cards" : null;
}
function canonPlays(canon) {
  return canon === "nothing" || canon === "" ? [] : canon.split(", ");
}
function potionOfPlay(play2) {
  if (play2.startsWith("potion:")) return play2.slice("potion:".length).split(">")[0] ?? "";
  if (play2.startsWith("potion ")) return play2.slice("potion ".length);
  return null;
}
function cardsOf(canon) {
  return turnCanon(canonPlays(canon).filter((play2) => potionOfPlay(play2) === null));
}
function potionsOf(canon) {
  return canonPlays(canon).map(potionOfPlay).filter((potion) => potion !== null).sort();
}
function cardsRepeat(entry, key) {
  return cardsOf(key) === entry.cards && multisetWithin(potionsOf(key), entry.drunk);
}
function multisetWithin(part, whole) {
  const left = /* @__PURE__ */ new Map();
  for (const item of whole) left.set(item, (left.get(item) ?? 0) + 1);
  for (const item of part) {
    const n = left.get(item) ?? 0;
    if (n === 0) return false;
    left.set(item, n - 1);
  }
  return true;
}
function canonWithin(part, whole) {
  return multisetWithin(canonPlays(part), canonPlays(whole));
}
function mayRepeat(tried, line) {
  if (!tried || line.open !== true || line.committed === void 0) return false;
  const committed = line.committed;
  if (tried.canon.some((turn) => canonWithin(committed, turn))) return true;
  const cards = cardsOf(committed);
  const potions = potionsOf(committed);
  return (tried.cards ?? []).some((entry) => entry.loose !== true && canonWithin(cards, entry.cards) && multisetWithin(potions, entry.drunk));
}
function replayChoice(pick2, pickDies, shown, replay2) {
  const at2 = replay2.point.split(",")[0];
  if (pick2.text === replay2.line) return { line: null, reason: `the answer is attempt ${replay2.reference}'s line` };
  if (pick2.wins) return { line: null, reason: "the answer wins the fight this turn: never changed" };
  const sameText = shown.find((line) => line.text === replay2.line);
  const canon = replay2.canon;
  if (!sameText && canon !== void 0 && pick2.canon === canon) return { line: null, reason: `the answer plays attempt ${replay2.reference}'s turn here (its cards and targets, in another order or text)` };
  const ref = sameText ?? (canon !== void 0 ? shown.find((line) => line.canon === canon) : void 0);
  if (!ref) return { line: null, reason: `attempt ${replay2.reference}'s line is not among the options` };
  if (ref.dies && !pickDies) return { line: null, reason: `attempt ${replay2.reference}'s line dies this turn, the answer does not` };
  return { line: ref, reason: `attempt ${replay2.reference}'s line on this board, replayed to reach ${at2}` };
}
function exploreAlternatives(pick2, shown, drinks2 = false) {
  const seen = /* @__PURE__ */ new Set([pick2.text]);
  const out = [];
  for (const line of shown) {
    if (seen.has(line.text) || !drinks2 && !line.potions.every((id) => pick2.potions.includes(id))) continue;
    seen.add(line.text);
    out.push(line);
  }
  return out.some((line) => !line.dies) ? out.filter((line) => !line.dies) : out;
}
function explorePoint(line, shown, opts) {
  const alternatives = exploreAlternatives(line, shown, opts.drinks === true);
  const round = (x) => Math.round(x * 1e3) / 1e3;
  const dead = Object.fromEntries(
    [...line.plan ? [{ text: line.text, plan: line.plan }] : [], ...alternatives].flatMap((entry) => {
      const share = opts.deathShare(entry.plan);
      return share !== null ? [[entry.text, round(share)]] : [];
    })
  );
  const rated = line.plan ?? line.rated ?? null;
  const b2 = opts.b2 && rated !== null && opts.b2.win(rated) !== null ? opts.b2 : null;
  const b2Record = b2 ? {
    win: Object.fromEntries(
      [{ text: line.text, plan: rated }, ...alternatives].flatMap((entry) => {
        const win = b2.win(entry.plan);
        return win !== null ? [[entry.text, round(win)]] : [];
      })
    ),
    notWorse: alternatives.filter((entry) => b2.notWorse(entry.plan, rated) === true).map((entry) => entry.text),
    ...b2.won ? {
      won: Object.fromEntries(
        [{ text: line.text, plan: rated }, ...alternatives].flatMap((entry) => {
          const won = b2.won(entry.plan);
          return won !== null ? [[entry.text, round(won)]] : [];
        })
      )
    } : {}
  } : null;
  const canon = line.canon !== void 0 ? Object.fromEntries([line, ...alternatives].flatMap((entry) => entry.canon !== void 0 ? [[entry.text, entry.canon]] : [])) : null;
  return { line: line.text, alternatives: alternatives.map((entry) => entry.text), ...Object.keys(dead).length > 0 ? { dead } : {}, ...b2Record ? { b2: b2Record } : {}, ...canon ? { canon } : {} };
}
function exploreReplacement(args) {
  const { pick: pick2 } = args;
  if (pick2.wins) return { replacement: null, reason: "the line wins the fight this turn: never changed", gate: null };
  const excluded = new Set(args.excluded);
  const tried = args.tried ?? null;
  const isTried = (line) => excluded.has(line.text) || triedHas(tried, line);
  const repeats = (line) => args.whole === true && !isTried(line) && mayRepeat(tried, line);
  const safe = (line) => !isTried(line) && !repeats(line);
  const unknown = !isTried(pick2) && (tried?.unknown?.length ?? 0) > 0 ? tried.unknown : null;
  if (!isTried(pick2) && !unknown) {
    if (repeats(pick2)) {
      const may = MAY_REPEAT;
      const candidates = exploreAlternatives(pick2, args.shown, args.drinks === true).filter((line) => safe(line) && !line.dies);
      const choice2 = candidates.length > 0 ? replacementAmong(args, candidates, { notWorseOnly: true }) : null;
      if (choice2?.replacement) return { ...choice2, reason: `${may}; ${choice2.reason}` };
      return {
        replacement: null,
        reason: `${may}, but ${candidates.length === 0 ? "no shown line that survives this turn is known to end it otherwise" : `none known to end it otherwise is not worse (${choice2.reason})`}: played as answered, the rest of the turn kept off the failed turns`,
        gate: choice2?.gate ?? null
      };
    }
    return { replacement: null, reason: args.avoid ? "the pick does not end the turn as a failed attempt's did through the deviation point: played as answered" : "the pick was not played on this board before: played as answered", gate: null };
  }
  const byCards = !excluded.has(pick2.text) && triedHow(tried, pick2) === "cards" ? `; ${POTION_ONLY}` : "";
  const untried = exploreAlternatives(pick2, args.shown, args.drinks === true).filter((line) => !isTried(line));
  if (untried.length === 0) return { replacement: null, reason: `${args.avoid ? "no shown line left that ends the turn otherwise than a failed attempt's" : "no shown line left that no failed attempt played here"}${byCards}`, gate: null };
  const known = unknown ? `; attempt${unknown.length === 1 ? "" : "s"} ${unknown.join(", ")} may have played the pick here (plays logged without their card)` : "";
  const choice = replacementAmong(args, untried, args.whole === true ? { prefer: safe } : {});
  return { ...choice, reason: `${choice.reason}${known}${byCards}` };
}
function replacementAmong(args, untried, opts = {}) {
  const { pick: pick2 } = args;
  const rated = pick2.plan ?? pick2.rated ?? null;
  const b2 = args.b2 && rated !== null && args.b2.win(rated) !== null ? args.b2 : null;
  const narrow = (pool2) => {
    const preferred = opts.prefer ? pool2.filter(opts.prefer) : [];
    return preferred.length > 0 && preferred.length < pool2.length ? { pool: preferred, note: "; of them, one whose turn cannot end as a failed attempt's after a draw" } : { pool: pool2, note: "" };
  };
  if (b2) {
    const notWorse2 = untried.filter((line) => b2.notWorse(line.plan, rated) === true);
    if (opts.notWorseOnly && notWorse2.length === 0) return { replacement: null, reason: `B2 rates every such line worse (win rate more than ${b2.rule} below the pick's)`, gate: "b2" };
    const { pool: pool2, note: note2 } = narrow(notWorse2.length > 0 ? notWorse2 : untried);
    const ranked2 = args.rank(pool2.map((line) => line.plan));
    const replacement2 = pool2.find((line) => line.plan === ranked2) ?? pool2[0];
    const why2 = notWorse2.length > 0 ? `the best untried line by the question's ranking, among those B2 rates no worse (win rate at most ${b2.rule} below the pick's)` : `the best untried line by the question's ranking (B2 rates every untried line worse: win rate more than ${b2.rule} below the pick's; the pick is known to fail)`;
    return { replacement: replacement2, reason: `${why2}${note2}`, gate: "b2" };
  }
  const own = pick2.plan === null ? null : args.deathShare(pick2.plan);
  const notWorse = own === null ? [] : untried.filter((line) => {
    const share = args.deathShare(line.plan);
    return share !== null && share <= own + 1e-9;
  });
  if (opts.notWorseOnly && notWorse.length === 0) return { replacement: null, reason: own === null ? "no rollout numbers for the pick" : "every such line dies more often in the rollout", gate: "rollout" };
  const { pool, note } = narrow(notWorse.length > 0 ? notWorse : untried);
  const ranked = args.rank(pool.map((line) => line.plan));
  const replacement = pool.find((line) => line.plan === ranked) ?? pool[0];
  const why = notWorse.length > 0 ? "the best untried line by the question's ranking, among those the rollout does not see dying more often" : own === null ? "the best untried line by the question's ranking" : "the best untried line by the question's ranking (every untried line dies more often in the rollout; the pick is known to fail)";
  return { replacement, reason: `${why}${note}`, gate: "rollout" };
}
function rankByOrder(plans, order, keyOf, byRollout) {
  const first = order.find((plan) => plans.includes(plan));
  if (first === void 0) return byRollout([...plans]);
  const key = keyOf(first);
  const tied = key === null ? [] : plans.filter((plan) => keyOf(plan) === key);
  return tied.length >= 2 ? byRollout(tied) ?? first : first;
}
var POTION_ONLY, MAY_REPEAT;
var init_explore = __esm({
  "src/sl/explore.ts"() {
    "use strict";
    init_json();
    POTION_ONLY = "the pick plays a failed attempt's cards here and drinks no potion that attempt did not drink from here on";
    MAY_REPEAT = "the pick's turn may end as a failed attempt's after its draw (its plays up to the draw are within one)";
  }
});

// src/sl/random-target.ts
function randomTargetOnly(text) {
  return RANDOM.test(text) && !RANDOM.test(text.replace(RANDOM_ENEMY, ""));
}
function randomTargets(state) {
  return asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false && enemy["is_hittable"] !== false).length;
}
var RANDOM, RANDOM_ENEMY;
var init_random_target = __esm({
  "src/sl/random-target.ts"() {
    "use strict";
    init_json();
    RANDOM = /随机|random/i;
    RANDOM_ENEMY = /随机(?:对|给予)?(?:一名|一个)?敌人|(?:对|给予)(?:一名|一个)?随机(?:一名|一个)?敌人|(?:a )?random enem(?:y|ies)|enemies at random/gi;
  }
});

// src/sl/judge.ts
var ANY_DRAW_BUDGET_MS, MODELLED_POWERS;
var init_judge = __esm({
  "src/sl/judge.ts"() {
    "use strict";
    init_combat_plan();
    init_card_model();
    init_passive_pieces();
    init_start_loss();
    init_turn_solver();
    init_json();
    init_random_target();
    ANY_DRAW_BUDGET_MS = 2e3;
    MODELLED_POWERS = /* @__PURE__ */ new Set([
      "BARRICADE_POWER",
      "BLUR_POWER",
      "BUFFER_POWER",
      "COLOSSUS_POWER",
      "CONSTRICT_POWER",
      "CRIMSON_MANTLE_POWER",
      "DARK_EMBRACE_POWER",
      "DEXTERITY_POWER",
      "DISINTEGRATION_POWER",
      "DUPLICATION_POWER",
      "FEEL_NO_PAIN_POWER",
      "FLAME_BARRIER_POWER",
      "FREE_ATTACK_POWER",
      "INFERNO_POWER",
      "INTANGIBLE_POWER",
      "JUGGERNAUT_POWER",
      "METALLICIZE_POWER",
      "NO_BLOCK_POWER",
      "NO_DRAW_POWER",
      "ONE_TWO_PUNCH_POWER",
      "PLATING_POWER",
      "PLATED_ARMOR_POWER",
      "RAGE_POWER",
      "REGEN_POWER",
      "RINGING_POWER",
      "ROLLING_BOULDER_POWER",
      "RUPTURE_POWER",
      "SELF_FORMING_CLAY_POWER",
      "SHRINK_POWER",
      "SLOTH_POWER",
      "SMOGGY_POWER",
      "STRENGTH_POWER",
      "SURROUNDED_POWER",
      "TENDER_POWER",
      "THE_GAMBIT_POWER",
      "THORNS_POWER",
      "UNMOVABLE_POWER",
      "VIGOR_POWER",
      "VULNERABLE_POWER",
      "WEAK_POWER"
    ]);
  }
});

// src/reflex/combat-plan.ts
import { loadavg } from "node:os";
function spawnText(enemy, asc) {
  if (powerAmount(enemy, "INFESTED_POWER") <= 0 && powerAmount(enemy, "SURPRISE_POWER") <= 0) return void 0;
  const spawns = spawnsAt(str(enemy["enemy_id"]), asc);
  if (!spawns) return "more enemies (what spawns is not logged)";
  return spawns.map((spawn) => `${spawn.count} x ${spawn.name} (~${spawn.hp} HP${spawn.count > 1 ? " each" : ""})`).join(" + ");
}
function unmodelledEnemyPowers(enemy) {
  return asArray(enemy["powers"]).map((power) => str(asRecord(power)["power_id"])).filter((id) => id !== "" && !MODELLED_ENEMY_POWERS.has(id));
}
function drinksPotion(plan) {
  return plan.steps.some((step) => step.cardId.startsWith("POTION:"));
}
function potionIdsOf(plan) {
  return plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.cardId.split(":")[1] ?? "");
}
function withPotionLines(options, plans, potionIds, limit2) {
  const out = [...options];
  for (const id of [...new Set(potionIds)]) {
    if (out.some((plan) => potionIdsOf(plan).includes(id))) continue;
    const line = plans.find((plan) => potionIdsOf(plan).includes(id));
    if (!line) continue;
    if (out.length >= limit2) {
      const removable = (plan, index) => {
        if (index === 0) return false;
        const others = out.filter((other) => other !== plan);
        if (!drinksPotion(plan) && !others.some((other) => !drinksPotion(other))) return false;
        return potionIdsOf(plan).every((own) => others.some((other) => potionIdsOf(other).includes(own)));
      };
      for (let index = out.length - 1; index > 0; index -= 1) {
        if (removable(out[index], index)) {
          out.splice(index, 1);
          break;
        }
      }
    }
    out.push(line);
  }
  return out;
}
function dryFirst(plans) {
  return plans.find((plan) => !drinksPotion(plan)) ?? plans[0];
}
function speedProbeMs() {
  const started = performance.now();
  let x = 2654435769 | 0;
  for (let i = 0; i < 2e6; i += 1) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
  }
  const ms = performance.now() - started;
  return x === 0 ? ms + 0 : ms;
}
function plannerTimingOf(t) {
  const plannedMs = performance.now() - t.planStart;
  const cpu = process.cpuUsage(t.cpuStart);
  const mcMs = t.mcShown.reduce((sum, mc) => sum + mc.ms, 0);
  const rolloutMs = t.rollout?.elapsedMs ?? 0;
  const sim = t.bossSim?.available ? t.bossSim : null;
  const simMs = sim ? sim.run.memo?.wallMs ?? sim.run.elapsedMs : t.bossSim && !t.bossSim.available ? t.bossSim.ms : 0;
  const rolloutMemo = t.rollout?.available && t.rollout.memo ? t.rollout.memo.ms : null;
  const simMemo = sim?.run.memo ? sim.run.elapsedMs : null;
  return {
    planner_ms: Math.round(plannedMs),
    solve_ms: Math.round(t.solveMs),
    mc_ms: Math.round(mcMs),
    rollout_ms: Math.round(rolloutMs),
    boss_sim_ms: Math.round(simMs),
    other_ms: Math.round(plannedMs - t.solveMs - mcMs - rolloutMs - simMs),
    cpu_ms: Math.round((cpu.user + cpu.system) / 1e3),
    load1: Math.round((loadavg()[0] ?? 0) * 100) / 100,
    probe_ms: Math.round(speedProbeMs() * 100) / 100,
    ...sim && !sim.run.memo && sim.run.pairs !== void 0 && sim.run.done !== void 0 ? { boss_sim: { pairs: sim.run.pairs, sims_done: sim.run.done, samples: sim.run.samples, workers: sim.run.workers } } : {},
    ...t.computeMemo ? { memo: { ...rolloutMemo !== null ? { rollout_ms: Math.round(rolloutMemo) } : {}, ...simMemo !== null ? { boss_sim_ms: Math.round(simMemo) } : {}, hits: t.computeMemo.hits, stored: t.computeMemo.size } } : {}
  };
}
function killGroups(combat, enemies) {
  const idOf = /* @__PURE__ */ new Map();
  const nameOf3 = /* @__PURE__ */ new Map();
  asArray(combat["enemies"]).map(asRecord).forEach((enemy, fallbackIndex) => {
    const index = numOrNull(enemy["index"]) ?? fallbackIndex;
    idOf.set(index, str(enemy["enemy_id"]));
    if (str(enemy["name"])) nameOf3.set(index, str(enemy["name"]));
  });
  const groups = [];
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.maxHp >= 1e6) continue;
    if (enemy.illusion && enemy.attacks.length === 0) continue;
    const id = idOf.get(enemy.index) || enemy.name;
    const group = groups.find((entry) => entry.id === id);
    if (group) {
      group.indices.push(enemy.index);
      group.hp += enemy.hp;
    } else groups.push({ id, name: nameOf3.get(enemy.index) || enemy.name, indices: [enemy.index], hp: enemy.hp, ...enemy.illusion ? { illusion: true } : {} });
  }
  distinctNames(groups).forEach((name, i) => {
    groups[i].name = name;
  });
  const isMinions = (group) => group.indices.every((index) => enemies.find((enemy) => enemy.index === index)?.minion === true);
  const leaders = groups.filter((group) => !isMinions(group));
  const exempt = (group) => LEADER_RULE_EXEMPT.has(group.id);
  if (groups.length >= 2 && leaders.length === 1 && !leaders[0].illusion && !exempt(leaders[0])) leaders[0].leader = true;
  return groups;
}
function damageInto(plan, indices, enemies) {
  return indices.reduce((sum, index) => {
    const before = enemies.find((enemy) => enemy.index === index);
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === index);
    return before && after ? sum + Math.max(0, before.hp - Math.max(0, after.hp)) : sum;
  }, 0);
}
function focusLines(plans, groups, enemies) {
  const out = /* @__PURE__ */ new Map();
  const dry = plans.filter((plan) => !drinksPotion(plan));
  for (const group of groups) {
    const pool = dry.some((plan) => damageInto(plan, group.indices, enemies) > 0) ? dry : plans;
    let best = null;
    let bestDamage = 0;
    for (const plan of pool) {
      const damage = damageInto(plan, group.indices, enemies);
      if (damage <= 0) continue;
      if (best === null || damage > bestDamage || damage === bestDamage && (plan.score > best.score || plan.score === best.score && plan.outcome.hpLoss < best.outcome.hpLoss)) {
        best = plan;
        bestDamage = damage;
      }
    }
    if (best) out.set(group, best);
  }
  return out;
}
function groupName(group) {
  return group.indices.length > 1 ? `${group.name} x${group.indices.length}` : group.name;
}
function fightLessons(state, max = JEV_FIGHT_LESSONS) {
  const combat = asRecord(state.raw["combat"]);
  const enemyIds = asArray(combat["enemies"]).map((enemy) => str(asRecord(enemy)["enemy_id"])).filter(Boolean);
  if (enemyIds.length === 0) return [];
  const actRaw = str(asRecord(state.run?.raw)["act_id"]);
  const act = /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : 1;
  const asc = state.run?.ascension ?? 0;
  const input = {
    label: "combat/plan",
    act,
    asc,
    bossId: state.run?.boss_id ?? (str(asRecord(state.run?.raw)["boss_id"]) || null),
    offered: offeredOn(state),
    threats: actThreatIds(act, asc),
    enemies: enemyIds
  };
  const matches = (entry) => {
    const [kind, id] = [entry.scope.slice(0, entry.scope.indexOf(":")), entry.scope.slice(entry.scope.indexOf(":") + 1)];
    if (kind !== "boss" && kind !== "elite" && kind !== "hallway") return false;
    if (kind === "boss") return bossOnBoard(id, enemyIds);
    return enemyIds.some((enemy) => enemy === id || enemy.startsWith(`${id}_`));
  };
  return selectLessons(input).filter(matches).slice(0, max);
}
function currentRunPlan(env) {
  const runId = str(env.state.raw["run_id"]);
  return env.screenMemory.runPlan && env.screenMemory.runPlan.runId === runId ? env.screenMemory.runPlan : null;
}
function deepseekPlanLine(env) {
  const plan = currentRunPlan(env);
  if (!plan) return env.brief.plan ? `DeepSeek's run plan (advice, not orders): ${env.brief.plan}` : null;
  const line = [plan.archetype, plan.summary].filter(Boolean).join(" \u2014 ");
  const prep = plan.bossPrep ? ` | boss prep: ${plan.bossPrep}` : "";
  if (!line && !prep) return null;
  return `DeepSeek's run plan (F${plan.floor}; advice, not orders): ${line}${prep}`.replace(/\s+/g, " ").trim();
}
function potionContextJson(env, kind) {
  const { state } = env;
  const run = asRecord(state.run?.raw);
  const belt = asArray(run["potions"]).map(asRecord);
  const used = belt.filter((slot) => bool(slot["occupied"])).length;
  const out = {
    slots: `${used}/${belt.length} used${belt.length > 0 && used >= belt.length ? " (belt full: a potion reward after this fight is wasted unless one is drunk)" : ""}`
  };
  const floor = state.run?.floor ?? null;
  const bossFloor = floor === null ? null : BOSS_FLOORS2.find((entry) => entry >= floor) ?? null;
  if (kind === "boss") out["act_boss"] = "this fight";
  else if (floor !== null && bossFloor !== null) out["act_boss"] = `in ${bossFloor - floor} floors (floor ${bossFloor})`;
  const elite = eliteAhead(env);
  const continuation = firstDoubleBoss(state);
  if (continuation) out["continuation_objective"] = `F48\u540E\u4ECD\u8981\u6253F49\uFF1AHP/\u836F\u6C34\u8FDE\u7EED\uFF0C\u7559\u5B58\u8D44\u6E90\u6309F49\u4F30\u503C\uFF1B${continuation.limitation}\u3002\u8BC1\u636E\uFF1A${continuation.value.source}`;
  if (elite) out["elite_ahead"] = elite;
  if (kind !== "boss") {
    const gap = damageGap(state, env.knowledge);
    if (gap) out["act_boss_clock"] = `needs ~${gap.need} damage a turn, deck ~${gap.deck}${gap.gap > 0 ? ` (short ${gap.gap})` : " (enough)"}`;
  }
  const actId = str(run["act_id"]);
  const held = belt.filter((slot) => bool(slot["occupied"])).map((slot) => str(slot["potion_id"])).filter(Boolean);
  Object.assign(out, heldPotionWorth(held, /^\d+$/.test(actId) ? Number(actId) + 1 : null, state.run?.ascension ?? 0));
  return out;
}
function potionCostContext(costs, kind, noDryLine) {
  if (costs.size === 0 || !potionCostOptions.enabled) return {};
  const out = {
    potion_cost: [...costs.values()].some((cost) => cost.continuation !== void 0) ? "F48\u662F\u5DF2\u89C2\u5BDF\u53CCboss\u7684\u7B2C\u4E00\u6218\uFF1A\u836F\u6C34\u6309F49\u7684\u5269\u4F59\u4EF7\u503C\u8BA1\u4EF7\uFF0C\u80DCF48\u4E0D\u7B49\u4E8E\u901A\u5173\uFF1B\u4FDD\u547D\u9009\u9879\u548C\u6240\u6709\u53EF\u559D\u836F\u6C34\u4ECD\u4FDD\u7559\u3002" : kind === "boss" ? "boss fight: potions cost 0 here (the fight they are kept for)" : "a potion drunk now is HP paid later: each option's potion_cost counts its potions (this turn and the rollout's later turns) at their held value (the \u8840 of the worth lines: HP worth in this act's boss); total = fight HP loss + that. Ranked by deaths, then total. Boss fights: 0."
  };
  const none = [...costs.values()].filter((cost) => cost.zero === "no_value" || cost.zero === "no_table").map((cost) => `${cost.name}: ${potionCostText(cost)}`);
  if (none.length > 0) out["potion_cost_zero"] = none;
  if (noDryLine) out["no_potion_line"] = "none: every potion-free line dies this turn";
  return out;
}
function eliteAhead(env) {
  const { state, screenMemory } = env;
  const runId = str(state.raw["run_id"]);
  const map = screenMemory.lastMap;
  const route = screenMemory.routePlan;
  const floor = state.run?.floor ?? null;
  const act = floor === null ? null : floor <= 17 ? 1 : floor <= 33 ? 2 : 3;
  if (route && route.runId === runId && route.act === act && map && map.runId === runId && map.current && floor !== null && map.floor === floor - 1) {
    const here2 = map.current.row + 1;
    const next = route.path.find((step) => step.row > here2 && step.type === "Elite");
    if (next) return `Elite in ${next.row - here2} floor${next.row - here2 === 1 ? "" : "s"} (route plan)`;
  }
  return forcedEliteWithin(screenMemory, state, FIGHT_NODES, ELITE_LOOKAHEAD) ? `forced Elite within ${ELITE_LOOKAHEAD} nodes` : null;
}
function hpGuardSlack(hp, kind = "unknown", extraSoFar = 0) {
  if (extraSoFar > HP_GUARD_FIGHT_BUDGET) return 0;
  if (kind === "boss" || kind === "elite") return Math.max(HP_GUARD_MIN_SLACK, hp * 0.1);
  return Math.max(HP_GUARD_MIN_SLACK, hp * 0.2);
}
function hpGuardReplacement(chosen, options, hp, slack = hpGuardSlack(hp), eligible = () => true) {
  if (chosen.outcome.winsFight || options.length === 0) return null;
  const minLoss = Math.min(...options.map(guardLoss));
  const bound = minLoss + slack;
  if (guardLoss(chosen) <= bound) return null;
  const pool = options.filter((plan) => plan === chosen || eligible(plan));
  const found = pool.find((plan) => guardLoss(plan) <= bound) ?? pool.find((plan) => guardLoss(plan) === minLoss) ?? null;
  return found === chosen ? null : found;
}
function focusTargets(plan, enemies) {
  const live = enemies.filter((enemy) => enemy.hp > 0);
  const damage = live.map((enemy) => ({ index: enemy.index, dealt: damageInto(plan, [enemy.index], enemies) }));
  const most = Math.max(0, ...damage.map((entry) => entry.dealt));
  return most > 0 ? damage.filter((entry) => entry.dealt === most).map((entry) => entry.index) : [];
}
function guardKeepsPick(pick2, plan, enemies, deathsOf = () => null) {
  if (enemies.filter((enemy) => enemy.hp > 0).length >= 2) {
    const focus = focusTargets(pick2, enemies);
    if (!focus.every((index) => damageInto(plan, [index], enemies) >= damageInto(pick2, [index], enemies))) return false;
  }
  const mine = deathsOf(pick2);
  const theirs = deathsOf(plan);
  return mine === null || theirs === null || theirs <= mine;
}
function setupKept(picked, replacement, ctx) {
  if (picked.setups <= replacement.setups) return false;
  const room = ctx.kind === "boss" ? Math.max(ctx.maxHp * 0.2, ctx.nextIncoming + 5) : Math.max(ctx.maxHp * 0.35, ctx.nextIncoming);
  if (picked.hpAfter < room) return false;
  return !ctx.bigHit || picked.deaths === null || replacement.deaths === null || picked.deaths <= replacement.deaths;
}
function lootSwapOk(pick2, plan, lootOf2) {
  const extraLoot = lootOf2(plan) - lootOf2(pick2);
  return extraLoot <= 0 || extraLoot <= guardLoss(pick2) - guardLoss(plan);
}
function hpGuardExtra(env) {
  const memo = env.screenMemory.hpGuard;
  if (!memo || memo.fight !== hpGuardFight(env)) return 0;
  return Object.values(memo.turns).reduce((sum, extra) => sum + extra, 0);
}
function hpGuardFight(env) {
  return `${str(asRecord(env.state.run?.raw)["act_id"])}:${env.state.run?.floor ?? "?"}`;
}
function recordHpGuard(env, turn, extra) {
  const fight = hpGuardFight(env);
  if (env.screenMemory.hpGuard?.fight !== fight) env.screenMemory.hpGuard = { fight, turns: {} };
  env.screenMemory.hpGuard.turns[String(turn ?? "?")] = extra;
}
function powerAmount(holder, id) {
  for (const entry of asArray(holder["powers"])) {
    const power = asRecord(entry);
    if (str(power["power_id"]) === id) return numOrNull(power["amount"]) ?? 1;
  }
  return 0;
}
function distinctNames(items) {
  return items.map((item) => {
    const same = items.filter((other) => other.name === item.name);
    if (same.length < 2) return item.name;
    const ids = same.map((other) => other.id);
    if (new Set(ids).size === ids.length && ids.every((id) => id !== "")) {
      const parts = ids.map((id) => id.split("_"));
      let common = 0;
      while (parts.every((p) => p.length > common + 1 && p[common] === parts[0][common])) common += 1;
      const tail = item.id.split("_").slice(common).join("_");
      return `${item.name} (${tail || item.id})`;
    }
    return `${item.name} #${same.indexOf(item) + 1}`;
  });
}
function enemySims(combat, asc) {
  const ctxOf = (enemy) => asc === void 0 ? void 0 : boardDamageContext(enemy, asRecord(combat["player"]), asc);
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const names = distinctNames(living.map((enemy) => ({ name: str(enemy["name"], str(enemy["enemy_id"])), id: str(enemy["enemy_id"]) })));
  return living.map((enemy, fallbackIndex) => ({
    index: numOrNull(enemy["index"]) ?? fallbackIndex,
    name: names[fallbackIndex],
    hp: num(enemy["current_hp"]),
    maxHp: num(enemy["max_hp"]),
    block: num(enemy["block"]),
    vulnerable: powerAmount(enemy, "VULNERABLE_POWER"),
    weak: powerAmount(enemy, "WEAK_POWER"),
    ...powerAmount(enemy, "POISON_POWER") > 0 ? { poison: powerAmount(enemy, "POISON_POWER") } : {},
    artifact: powerAmount(enemy, "ARTIFACT_POWER"),
    intangible: powerAmount(enemy, "INTANGIBLE_POWER") > 0,
    slippery: powerAmount(enemy, "SLIPPERY_POWER"),
    hpLossCap: powerAmount(enemy, "HARDENED_SHELL_POWER") > 0 ? powerAmount(enemy, "HARDENED_SHELL_POWER") : null,
    thorns: powerAmount(enemy, "THORNS_POWER"),
    curlUp: powerAmount(enemy, "CURL_UP_POWER"),
    flutter: powerAmount(enemy, "FLUTTER_POWER"),
    perHitCap: powerAmount(enemy, "HARD_TO_KILL_POWER") > 0 ? powerAmount(enemy, "HARD_TO_KILL_POWER") : null,
    slow: powerAmount(enemy, "SLOW_POWER") > 0,
    illusion: powerAmount(enemy, "ILLUSION_POWER") > 0,
    minion: powerAmount(enemy, "MINION_POWER") > 0,
    reattach: powerAmount(enemy, "REATTACH_POWER") > 0,
    reattachHp: powerAmount(enemy, "REATTACH_POWER"),
    crabRage: powerAmount(enemy, "CRAB_RAGE_POWER") > 0,
    eruption: powerAmount(enemy, "STEAM_ERUPTION_POWER"),
    sandpit: powerAmount(enemy, "SANDPIT_POWER"),
    asleep: powerAmount(enemy, "ASLEEP_POWER"),
    slumber: powerAmount(enemy, "SLUMBER_POWER"),
    // Waterfall Giant shows Buff on every move, but that is only Steam Eruption stacking: racing it
    // is what lost G7EJ and WQTRX (the explosion is modelled through `eruption` instead).
    // Any Strength already, not just this turn's Buff intent (6A36: Sludge Spinner's Rage +3 every
    // third turn went to Strength 9 while damage stayed at hallway weight). A Buff move anywhere in
    // the cycle was too broad: 56 of 101 enemies, most of whose buffs are not Strength.
    scaling: str(enemy["enemy_id"]) !== "WATERFALL_GIANT" && (asArray(enemy["intents"]).some((intent) => str(asRecord(intent)["intent_type"]) === "Buff") || powerAmount(enemy, "RITUAL_POWER") > 0 || powerAmount(enemy, "TERRITORIAL_POWER") > 0 || powerAmount(enemy, "HIGH_VOLTAGE_POWER") > 0 || powerAmount(enemy, "STRENGTH_POWER") > 0),
    halved: powerAmount(enemy, "GUARDED_POWER") > 0 || powerAmount(enemy, "SOAR_POWER") > 0,
    skittish: powerAmount(enemy, "SKITTISH_POWER"),
    reflect: powerAmount(enemy, "REFLECT_POWER") > 0,
    demise: powerAmount(enemy, "DEMISE_POWER"),
    shrink: powerAmount(enemy, "SHRINK_POWER"),
    ...str(enemy["enemy_id"]) === SHRINKER ? { shrinksUs: true } : {},
    punishesUnblocked: (powerAmount(enemy, "SUCK_POWER") > 0 ? 4 : 0) + (powerAmount(enemy, "PAPER_CUTS_POWER") > 0 ? 5 : 0),
    woundsPerHit: powerAmount(enemy, "PAINFUL_STABS_POWER"),
    enrage: powerAmount(enemy, "ENRAGE_POWER"),
    vitalSpark: powerAmount(enemy, "VITAL_SPARK_POWER"),
    revives: powerAmount(enemy, "ADAPTABLE_POWER") > 0,
    stock: powerAmount(enemy, "STOCK_POWER"),
    // Plow (Ceremonial Beast): stunned the first time HP drops to its amount (150), like Shriek (RAWT
    // F17 T6: a Strike crossed 150 and cancelled a 26 Plow the solver had counted).
    shriek: Math.max(powerAmount(enemy, "SHRIEK_POWER"), powerAmount(enemy, "PLOW_POWER")),
    burrowed: powerAmount(enemy, "BURROWED_POWER") > 0,
    ravenous: powerAmount(enemy, "RAVENOUS_POWER"),
    ...spawnText(enemy, asc ?? 0) ? { spawnsOnDeath: spawnText(enemy, asc ?? 0) } : {},
    dazedPerHit: powerAmount(enemy, "PERSONAL_HIVE_POWER"),
    // Imbalanced: a fully blocked attack stuns it; what that saves is its next move's hit.
    ...asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "IMBALANCED_POWER") ? { imbalanced: Math.round(expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), ctxOf(enemy)) ?? asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0)) } : {},
    unmodelled: unmodelledEnemyPowers(enemy).length > 0,
    ...powerAmount(enemy, "BATTLEWORN_DUMMY_TIME_LIMIT_POWER") > 0 ? { timeLimit: powerAmount(enemy, "BATTLEWORN_DUMMY_TIME_LIMIT_POWER") } : {},
    attacks: asArray(enemy["intents"]).map(asRecord).flatMap((intent) => {
      const damage = numOrNull(intent["damage"]);
      if (damage === null) return [];
      return [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
    })
  }));
}
function learnedStunRules(env) {
  if (env.mechRules === false) return /* @__PURE__ */ new Map();
  try {
    return stripStunRules(observedMechanics());
  } catch {
    return /* @__PURE__ */ new Map();
  }
}
function applyStripStuns(enemies, combat, rules) {
  if (rules.size === 0) return;
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const byIndex = new Map(living.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, enemy]));
  for (const enemy of enemies) {
    const source = byIndex.get(enemy.index);
    if (!source) continue;
    const stuns = /* @__PURE__ */ new Map();
    for (const power of asArray(source["powers"]).map(asRecord)) {
      const id = str(power["power_id"]);
      if (rules.has(id) && id in STRIP_COUNTERS && num(power["amount"]) > 0 && !stuns.has(id)) stuns.set(id, str(power["name"]) || id);
    }
    if (stuns.size > 0) enemy.stunOnStrip = [...stuns].map(([power, name]) => ({ power, name }));
  }
}
function mechMoveOn(env) {
  return env.mechRules !== false && env.mechMoveRules !== false;
}
function learnedMoveRules(env) {
  if (!mechMoveOn(env)) return /* @__PURE__ */ new Map();
  return moveRulesOf({ monsters: monsterMoves() });
}
function ruleMoveAttacks(monster, move, asc, enemy, player, cleared, extraStrength = 0) {
  const db = monsterMoves();
  const logged = moveDamageAt(db, monster, move, asc);
  if (logged) {
    if (logged.perHit <= 0) return [];
    const base = logged.base ?? logged.perHit;
    const strength = (cleared.includes("STRENGTH_POWER") ? 0 : powerAmount(enemy, "STRENGTH_POWER")) + extraStrength;
    const weak = !cleared.includes("WEAK_POWER") && powerAmount(enemy, "WEAK_POWER") > 0;
    const damage = Math.max(0, Math.floor((base + strength) * (weak ? 0.75 : 1) * (powerAmount(player, "VULNERABLE_POWER") > 0 ? 1.5 : 1)));
    return [{ damage, hits: Math.max(1, logged.hits) }];
  }
  const shown = shownDamageAt(db, monster, move, asc);
  return shown && shown.perHit > 0 ? [{ damage: Math.round(shown.perHit), hits: Math.max(1, shown.hits) }] : [];
}
function applyMoveRules(enemies, combat, rules, asc) {
  if (rules.size === 0) return;
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const byIndex = new Map(living.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, enemy]));
  const player = asRecord(combat["player"]);
  for (const enemy of enemies) {
    const source = byIndex.get(enemy.index);
    if (!source) continue;
    const monster = str(source["enemy_id"]);
    const own = rules.get(monster) ?? [];
    const moved = [];
    for (const rule of own) {
      if (!MOVE_RULE_POWERS.has(rule.power) || powerAmount(source, rule.power) <= 0) continue;
      const power = asArray(source["powers"]).map(asRecord).find((entry) => str(entry["power_id"]) === rule.power);
      moved.push({
        power: rule.power,
        name: str(power?.["name"]) || rule.power,
        how: rule.how,
        move: rule.move,
        moveName: monsterMoves()[monster]?.moves?.[rule.move]?.name || rule.move,
        attacks: ruleMoveAttacks(monster, rule.move, asc, source, player, clearedWith(rule, own)),
        n: rule.n,
        changed: rule.changed,
        ...clearedWith(rule, own).length > 0 ? { clears: clearedWith(rule, own) } : {}
      });
    }
    if (moved.length > 0) enemy.moveOnStrip = moved;
  }
}
function mechDeathOn(env) {
  return env.mechRules !== false && env.mechDeathMove !== false;
}
function learnedDeathRules(env) {
  if (!mechDeathOn(env)) return /* @__PURE__ */ new Map();
  return deathRulesOf({ monsters: monsterMoves() });
}
function applyDeathRules(enemies, combat, rules, asc) {
  if (rules.size === 0) return;
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const byIndex = new Map(living.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, enemy]));
  const player = asRecord(combat["player"]);
  const total = (attacks) => attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0);
  const moveName = (monster, move) => monsterMoves()[monster]?.moves?.[move]?.name || move;
  for (const enemy of enemies) {
    const source = byIndex.get(enemy.index);
    if (!source) continue;
    const monster = str(source["enemy_id"]);
    const shown = str(source["move_id"]);
    const entries = [];
    for (const rule of rules.get(monster) ?? []) {
      for (const ally of enemies) {
        const allySource = byIndex.get(ally.index);
        if (ally.index === enemy.index || !allySource || str(allySource["enemy_id"]) !== rule.ally || ally.hp <= 0) continue;
        const now = shown ? rule.now[shown] ?? null : null;
        const end = now?.move ?? shown;
        const next = rule.next && end && rule.next.after.includes(end) ? rule.next : null;
        const entry = now ? monsterMoves()[monster]?.moves?.[now.move] : void 0;
        const gained = entry && regularEffect(entry, entry.self_powers_gained?.["STRENGTH_POWER"]) ? moveAmountAt(monsterMoves(), monster, entry, "self", "STRENGTH_POWER", asc)?.value ?? 0 : 0;
        entries.push({
          ally: ally.index,
          allyId: rule.ally,
          allyName: ally.name,
          move: now?.move ?? null,
          moveName: now ? moveName(monster, now.move) : null,
          attacks: now ? ruleMoveAttacks(monster, now.move, asc, source, player, []) : [],
          next: next?.move ?? null,
          nextName: next ? moveName(monster, next.move) : null,
          nextAttack: next ? total(ruleMoveAttacks(monster, next.move, asc, source, player, [], gained)) : null,
          ...now ? { nowCounts: [now.changed, now.n] } : {},
          ...next ? { nextCounts: [next.count, next.n] } : {},
          rule: {
            now: Object.fromEntries(Object.entries(rule.now).map(([from, change]) => [from, change.move])),
            next: rule.next?.move ?? null,
            after: rule.next?.after ?? [],
            exclusive: rule.exclusive,
            aliveOnly: rule.aliveOnly
          }
        });
      }
    }
    if (entries.length > 0) enemy.moveOnDeath = entries;
  }
}
function deathOnlyMoves(enemies) {
  const out = /* @__PURE__ */ new Map();
  for (const enemy of enemies) {
    const moves = new Set((enemy.moveOnDeath ?? []).flatMap((rule) => rule.rule.exclusive));
    if (moves.size > 0) out.set(enemy.index, moves);
  }
  return out;
}
function deathRuleNote(enemy) {
  const own = (enemy?.moveOnDeath ?? []).filter((rule) => rule.move !== null || rule.next !== null);
  if (own.length === 0) return "";
  const named = (name, id) => name && name !== id ? `${name} (${id}, ` : `${id} (`;
  const parts = own.map((rule) => {
    const now = rule.move !== null ? `its move changes at once to ${named(rule.moveName, rule.move)}${rule.attacks.length > 0 ? `attack ${rule.attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0)}` : "no attack"} this turn; ${rule.nowCounts?.[0]} of ${rule.nowCounts?.[1]} logged)` : "";
    const next = rule.next !== null ? `its next move is ${named(rule.nextName, rule.next)}${rule.nextAttack ? `attack ~${rule.nextAttack}` : "no attack"}; ${rule.nextCounts?.[0]} of ${rule.nextCounts?.[1]} logged)` : "";
    return `when ${rule.allyName} dies on my turn ${[now, next].filter(Boolean).join(", then ")}`;
  });
  return `observed in the logs, not in its text: ${parts.join("; ")}; the options' numbers and the rollout already count it`;
}
function backAttackPairNote(env, powerId, living) {
  if (!mechMoveOn(env)) return "";
  if (powerId === "CRAB_RAGE_POWER" && living >= 2) return " (observed in the logs: once its partner is dead its attacks no longer get the +50% from behind, whatever you face; the options' numbers already count it)";
  if (/^BACK_ATTACK_(LEFT|RIGHT)_POWER$/.test(powerId) && living < 2) return " (its partner is dead: no back attack any more, whatever you face; the intent shown is what lands: 152 of 152 logged one-claw intents)";
  return "";
}
function moveRuleNote(enemy, powerId) {
  const own = (enemy?.moveOnStrip ?? []).filter((rule) => rule.power === powerId);
  if (own.length === 0) return "";
  const parts = own.map((rule) => `${rule.how === "removed" ? "when it is removed" : "when a stack of it is taken"} on my turn its move changes at once to ${rule.moveName} (${rule.move}, ${rule.attacks.length > 0 ? `attack ${rule.attacks.reduce((sum, hit) => sum + hit.damage * hit.hits, 0)}` : "no attack"}), ${rule.changed} of ${rule.n} times`);
  return ` (observed in the logs, not in its text: ${parts.join("; ")}; the options' numbers already count it)`;
}
function stripStunNote(enemy, powerId, rules) {
  const rule = rules.get(powerId);
  if (!rule || !enemy?.stunOnStrip?.some((stun) => stun.power === powerId)) return "";
  return ` (observed in the logs, not in its text: when its last stack is stripped on my turn it is stunned at once and its move this turn is cancelled, ${rule.stunned} of ${rule.n} strips in ${rule.fights} fights; the options' numbers already count it)`;
}
function carryHpLossCaps(memory, key, enemies) {
  if (!enemies.some((enemy) => enemy.hpLossCap !== null && enemy.hpLossCap !== void 0)) return;
  if (memory.turnStartHp?.key !== key) memory.turnStartHp = { key, hp: {} };
  const start = memory.turnStartHp.hp;
  for (const enemy of enemies) {
    if (enemy.hpLossCap === null || enemy.hpLossCap === void 0) continue;
    const first = start[String(enemy.index)];
    if (first === void 0) start[String(enemy.index)] = enemy.hp;
    else enemy.hpLossCap = Math.max(0, enemy.hpLossCap - Math.max(0, first - enemy.hp));
  }
}
function siphonSchedule() {
  const turns = moveTurns("WATERFALL_GIANT", "SIPHON_MOVE");
  if (turns.length === 0) return SIPHON_FALLBACK;
  const gaps = turns.slice(1).map((turn, i) => turn - turns[i]).filter((gap) => gap > 0);
  return { first: turns[0], period: gaps.length > 0 ? Math.min(...gaps) : SIPHON_FALLBACK.period };
}
function giantTurnsToKill(hp, perTurn, turn, heal, schedule = siphonSchedule()) {
  const siphons = (t) => t >= schedule.first && (t - schedule.first) % schedule.period === 0;
  let left = hp;
  let turns = 0;
  for (let t = turn; left > 0 && turns < 60; t += 1) {
    left -= perTurn;
    turns += 1;
    if (left > 0 && siphons(t)) left += heal;
  }
  return turns;
}
function eruptionRace(enemy, playerHp, turn, asc = 0, lossPerTurn) {
  if (str(enemy["enemy_id"]) !== "WATERFALL_GIANT" || enemy["is_alive"] === false) return false;
  const hp = num(enemy["current_hp"]);
  const maxHp = num(enemy["max_hp"]);
  if (hp <= 0 || maxHp >= 1e6) return false;
  const stacks = powerAmount(enemy, "STEAM_ERUPTION_POWER");
  const eruption = eruptionSchedule(asc);
  const eruptionNow = stacks > 0 ? stacks : Math.max(eruptionAt(1, asc, eruption), eruptionAt(turn, asc, eruption));
  const heal = asc >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base;
  const schedule = siphonSchedule();
  let healed = 0;
  for (let t = schedule.first; t < turn; t += schedule.period) healed += heal;
  const perTurn = turn > 1 ? Math.max(5, (maxHp - hp + healed) / (turn - 1)) : ERUPTION_FALLBACK_DAMAGE;
  const enemyTurns = giantTurnsToKill(hp, perTurn, turn, heal, schedule) - 1;
  const eruptionAtKill = eruptionNow + eruption.perTurn * enemyTurns;
  const loss = lossPerTurn ?? bossLossPerTurn(bossProfile("WATERFALL_GIANT"), asc).value;
  if (loss === null) return false;
  const hpAtKill = playerHp - loss * enemyTurns;
  return eruptionAtKill >= hpAtKill + ERUPTION_BLOCK;
}
function fightKind(combat, env) {
  let kind = "unknown";
  for (const entry of asArray(combat["enemies"])) {
    const type = env.knowledge.monster(str(asRecord(entry)["enemy_id"]))?.type ?? "";
    if (type === "Boss") return "boss";
    if (type === "Elite") kind = "elite";
    else if (type === "Normal" && powerAmount(asRecord(entry), "STOCK_POWER") > 0) kind = "elite";
    else if (type === "Normal" && HALLWAY_ELITES.has(str(asRecord(entry)["enemy_id"])) && asRecord(entry)["is_alive"] !== false) kind = "elite";
    else if (type === "Normal" && kind === "unknown") kind = "monster";
  }
  return kind;
}
function handSignature(hand) {
  return hand.map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`).sort().join(",");
}
function stepText(step) {
  return step.targetName ? `${step.name} -> ${step.targetName}` : step.name;
}
function describePlan(plan, playerHp) {
  const o = plan.outcome;
  const summary = {
    plays: plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map(stepText).join(", then "),
    result: o.winsFight ? "wins the fight this turn" : o.dies ? "I DIE at the end of the turn" : o.revived ? `drops to 0 HP: ${o.revived.names.join(" then ")} brings me back, I end the turn at ${o.revived.hp}/${playerHp} HP and ${o.revived.names.length > 1 ? "they are" : "it is"} used up (hp_lost counts all my HP now as lost, then what the revived ${o.revived.reviveHp} HP lose)` : (o.explodesNext ?? 0) > 0 ? `kills it but the fight is NOT over: it explodes for ${o.explodesNext} at the end of my next turn, against that turn's block; I have ${o.hpAfter}/${playerHp} HP after this turn, so next turn needs ${Math.max(0, (o.explodesNext ?? 0) - o.hpAfter + 1)}+ block to live` : `survives with ${o.hpAfter}/${playerHp} HP before healing`,
    hp_lost: o.hpLoss,
    damage_dealt: o.damageDealt
  };
  if (o.revived) summary["revive_spent"] = o.revived.names.join(", ");
  if (o.kills.length > 0) summary["kills"] = o.kills.join(", ");
  if (o.restocked.length > 0) summary["revives_from_stock"] = `${o.restocked.join(", ")}: back at full HP with +3 Strength, NOT a kill`;
  if ((o.spawns ?? []).length > 0) summary["spawns_on_death"] = `${o.spawns.join("; ")}: they arrive as it dies, the fight is NOT over`;
  if (!o.winsFight) summary["enemies_after"] = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).map((enemy) => `${enemy.name} ${enemy.husk ? "husk (cannot be killed, it explodes; damage into it counts for nothing)" : `${enemy.hp} HP`}${enemy.vulnerable ? `, Vulnerable ${enemy.vulnerable}` : ""}${enemy.weak ? `, Weak ${enemy.weak}` : ""}${enemy.poison ? `, \u4E2D\u6BD2 ${enemy.poison}` : ""}${enemy.demise ? `, Demise ${enemy.demise} (loses ${enemy.demise} HP at the end of each of its turns)` : ""}`).join("; ");
  if (o.blockGained > 0) summary["block_gained"] = o.blockGained;
  if (o.strengthGained > 0) summary["strength_gained"] = o.strengthGained;
  if (o.cardsDrawn > 0) summary["cards_drawn"] = o.cardsDrawn;
  if (o.energyLeft > 0) summary["energy_unused"] = o.energyLeft;
  if ((o.nextTurnEnergy ?? 0) > 0) summary["next_turn_energy"] = `+${o.nextTurnEnergy} energy next turn (Pael's Tear: this line ends the turn with energy unspent)`;
  if (o.startTurnKills.length > 0) summary["mercury_hourglass_kills_next_turn"] = o.startTurnKills.join(", ");
  if (o.withersAdded > 0) summary["withers_added"] = o.withersAdded;
  if (o.sleepCost > 0) summary["wakes_sleeping_enemy"] = "yes: its free turns are lost";
  if (o.lasting >= 5) summary["lasting_value"] = `sets up a power worth about ${Math.round(o.lasting)} score over the fight (a few HP now is often worth it in a long fight)`;
  if (!o.winsFight && (o.freeAttacksLeft ?? 0) > 0) summary["free_attacks_kept"] = `${o.freeAttacksLeft} free Attack${o.freeAttacksLeft === 1 ? "" : "s"} (Unrelenting) left unused: ${o.freeAttacksLeft === 1 ? "it stays" : "they stay"} up into next turn (the next Attack played costs 0)`;
  if ((o.stuns ?? []).length > 0) summary["stuns"] = `${o.stuns.join(", ")}: its attack fully blocked (Imbalanced), it skips its next move (~${o.stunSaved ?? 0} damage saved next turn)`;
  const stripped = o.winsFight ? [] : o.enemyHpAfter.filter((enemy) => enemy.strippedStun && enemy.hp > 0);
  if (stripped.length > 0) {
    summary["stripped_stun"] = stripped.map((enemy) => {
      const stun = enemy.strippedStun;
      return `stuns ${enemy.name} (its last ${stun.name} stripped): ${stun.attack > 0 ? `its attack this turn (${stun.attack}) is cancelled, already left out of hp_lost` : "its move this turn is cancelled"}`;
    }).join("; ");
  }
  const moved = o.winsFight ? [] : o.enemyHpAfter.filter((enemy) => enemy.movedTo);
  if (moved.length > 0) {
    summary["move_change"] = moved.map((enemy) => {
      const change = enemy.movedTo;
      const attack = change.attack > 0 ? `attack ${change.attack}` : "no attack";
      const instead = change.before !== change.attack ? ` instead of the ${change.before > 0 ? `${change.before} shown` : "move shown"}` : "";
      return `${change.how === "removed" ? "removes" : "takes a stack of"} ${enemy.name}'s ${change.name}: its move becomes ${change.moveName} (${change.move}, ${attack} this turn${instead}; ${change.changed} of ${change.n} logged), already in hp_lost`;
    }).join("; ");
  }
  const deaths = o.winsFight ? [] : o.enemyHpAfter.filter((enemy) => enemy.deathMove && enemy.hp > 0);
  if (deaths.length > 0) {
    summary["death_move"] = deaths.map((enemy) => {
      const change = enemy.deathMove;
      const named = (name, id) => name && name !== id ? `${name} (${id}, ` : `${id} (`;
      const now = change.move !== null ? `${enemy.name}'s move becomes ${named(change.moveName, change.move)}${change.attack > 0 ? `attack ${change.attack}` : "no attack"} this turn${change.before !== change.attack ? ` instead of the ${change.before > 0 ? `${change.before} shown` : "move shown"}` : ""}; ${change.nowCounts?.[0]} of ${change.nowCounts?.[1]} logged) at once, already in hp_lost` : "";
      const next = change.next !== null ? `next turn ${enemy.name} uses ${named(change.nextName, change.next)}${change.nextAttack ? `attack ~${change.nextAttack} as priced now` : "no attack"}; ${change.nextCounts?.[0]} of ${change.nextCounts?.[1]} logged), not in hp_lost (the rollout counts it)` : "";
      return `kills ${change.allyName}: ${[now, next].filter(Boolean).join("; ")}`;
    }).join("; ");
  }
  if ((o.bufferSpentBySelf ?? 0) > 0) summary["buffer_used_by_own_hp_loss"] = o.bufferSpentBySelf;
  if (o.sandpitAfter !== null) summary["sandpit_after_enemy_turn"] = o.sandpitAfter <= 0 ? `${o.sandpitAfter} (eaten: I DIE)` : o.sandpitAfter;
  if (o.unknownCards.length > 0) summary["unmodelled_cards"] = o.unknownCards.join(", ");
  return summary;
}
function planFacts(plan, ctx) {
  const o = plan.outcome;
  const cards = plan.steps.map((step) => ctx.hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId));
  const powers = plan.steps.filter((step, i) => !step.cardId.startsWith("POTION:") && cards[i]?.type === "Power").map((step) => step.name);
  const potions = plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.name.replace(/^potion /, ""));
  const key = new Set(ctx.enemies.filter((enemy) => !enemy.minion && !enemy.illusion).map((enemy) => enemy.name));
  const keyKills = o.kills.filter((name) => key.has(name));
  let threat2 = 0;
  let known = false;
  for (const enemy of ctx.enemies) {
    const after = o.enemyHpAfter.find((entry) => entry.index === enemy.index);
    if (o.winsFight) continue;
    const killed = after !== void 0 && after.hp <= 0;
    if (killed && !enemy.illusion) continue;
    const summoned = ctx.summonedThreat?.get(enemy.index) ?? 0;
    if (summoned > 0 && !killed && !after?.strippedStun) {
      known = true;
      threat2 += summoned;
    }
    const next = killed ? ctx.revivingThreat?.get(enemy.index) : ctx.nextThreat.get(enemy.index);
    if (next === null || next === void 0) continue;
    known = true;
    threat2 += next * (!killed && (after?.weak ?? 0) >= 2 ? 0.75 : 1);
  }
  if (!o.winsFight && ctx.revivedThreat !== void 0 && ctx.revivedThreat !== null) {
    known = true;
    threat2 += ctx.revivedThreat;
  }
  const scaling = [];
  if (o.strengthGained > 0) scaling.push(`+${o.strengthGained} permanent Strength`);
  if (powers.length > 0) scaling.push(`plays power ${powers.join(", ")}`);
  if (o.lasting >= 1) scaling.push(`lasting value ${Math.round(o.lasting)}`);
  const hpAfter = o.revived?.hp ?? o.hpAfter;
  return {
    hp_after: hpAfter,
    hp_after_pct: ctx.maxHp > 0 ? Math.round(hpAfter / ctx.maxHp * 100) : null,
    dmg: o.damageDealt,
    lethal_now: o.winsFight ? "wins the fight" : keyKills.length > 0 ? `kills ${keyKills.join(", ")}${(o.explodesNext ?? 0) > 0 ? ` (explodes for ${o.explodesNext} at the end of my next turn)` : ""}` : "no",
    enemy_threat_next: o.winsFight ? 0 : known ? Math.round(threat2) : "unknown",
    setup_turn: ctx.noAttack && powers.length > 0,
    scaling_gained: scaling.length > 0 ? scaling.join("; ") : "none",
    block_wasted: o.blockWasted ?? 0,
    potions_used: potions.length > 0 ? potions.join(", ") : "none"
  };
}
function cardFor(step, hand) {
  const cardId = step.pileCard?.cardId ?? step.cardId;
  const upgraded = step.pileCard?.upgraded ?? step.upgraded;
  return hand.find((entry) => entry.cardId === cardId && entry.upgraded === upgraded && step.cost !== void 0 && entry.cost === step.cost && entry.playable) ?? hand.find((entry) => entry.cardId === cardId && entry.upgraded === upgraded && entry.playable) ?? hand.find((entry) => entry.cardId === cardId && entry.playable);
}
function takeSignature(card) {
  return `${card.cardId}${card.upgraded ? "+" : ""}`;
}
function withCard(signature, card) {
  return [...signature === "" ? [] : signature.split(","), card].sort().join(",");
}
function notePotionTake(env, turn, step) {
  if (step.takes) env.screenMemory.potionTake = { turn, cardId: step.takes.cardId, upgraded: step.takes.upgraded };
}
function intentFor(step, hand) {
  if (step.cardId.startsWith("POTION:")) {
    const slot = Number(step.cardId.split(":")[2]);
    return step.target === null ? { action: "use_potion", option_index: slot } : { action: "use_potion", option_index: slot, target_index: step.target };
  }
  const card = cardFor(step, hand);
  if (!card) return null;
  if (step.target === null) return { action: "play_card", card_index: card.index };
  if (!card.validTargets.includes(step.target)) return null;
  return { action: "play_card", card_index: card.index, target_index: step.target };
}
function firstIntent(plan, hand, env) {
  const first = plan.steps[0];
  if (!first) return { action: "end_turn" };
  const intent = intentFor(first, hand) ?? { action: "end_turn" };
  if (env) noteIntent(env, intent, intent.action === "play_card" ? cardFor(first, hand) : void 0);
  return intent;
}
function noteFacing(memory, state, intent) {
  if (!state.in_combat || !intent) return;
  const target = intent.target_index;
  if (typeof target !== "number") return;
  memory.facing = target;
  memory.facingFight = facingFightOf(state);
}
function facingFightOf(state) {
  return `${str(state.raw["run_id"])}:${fightKey(state)}`;
}
function boulderSettling(memory, fight, turn, amount, cardsPlayed, now) {
  const seen = memory.boulder;
  if (turn !== null && amount > 0 && seen && seen.fight === fight && turn > seen.turn && cardsPlayed === 0 && amount <= seen.amount) {
    if (seen.waitTurn !== turn) {
      seen.waitTurn = turn;
      seen.since = now;
    }
    if (now - (seen.since ?? now) < BOULDER_SETTLE_MS) return true;
  }
  memory.boulder = turn !== null && amount > 0 ? { fight, turn, amount } : void 0;
  return false;
}
function noteIntent(env, intent, card) {
  noteFacing(env.screenMemory, env.state, intent);
  if (card && card.hpLoss > 0) env.screenMemory.demonTongueTurn = `${hpGuardFight(env)}:${env.state.turn}`;
}
function turnStartAoe(relicIds, player) {
  const hourglass = relicIds.includes("MERCURY_HOURGLASS") ? MERCURY_HOURGLASS_DAMAGE2 : 0;
  const inferno = powerAmount(player, "INFERNO_POWER");
  const lossEvents = inferno > 0 ? 1 + (powerAmount(player, "CRIMSON_MANTLE_POWER") > 0 ? 1 : 0) : 0;
  return hourglass + inferno * lossEvents + powerAmount(player, "ROLLING_BOULDER_POWER");
}
function recordFightPlays(env, playedThisTurn) {
  return recordStateFightPlays(env.screenMemory, env.state, playedThisTurn);
}
function witherInput(env, combat, hand, playedThisTurn) {
  const every = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).reduce((found, enemy) => found || (powerAmount(enemy, "WITHERING_PRESENCE_POWER") > 0 ? WITHER_EVERY : 0), 0);
  if (every === 0) return void 0;
  const memo = recordFightPlays(env, playedThisTurn);
  const held = hand.filter((card) => card.cardId === "WITHER").map((card) => card.heldPenalty);
  if (held.length > 0) memo.witherDamage = Math.max(memo.witherDamage, ...held);
  const axe = asArray(asRecord(env.state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "THROWING_AXE");
  const replayed = Object.values(memo.replays ?? {}).reduce((sum, count2) => sum + count2, 0);
  const played = Object.values(memo.perTurn).reduce((sum, count2) => sum + count2, 0) + replayed + (axe ? 1 : 0);
  return { every, played, damage: memo.witherDamage };
}
function exhaustedSinceTurnStart(env) {
  const size = exhaustPileSize(env.state.raw);
  if (size === void 0) return false;
  const start = env.screenMemory.turnStartExhaust;
  if (noteTurnStartExhaust(env.screenMemory, env.state)) return false;
  return size > start.size;
}
function noteTurnStartExhaust(memory, state) {
  if (!state.in_combat) return false;
  const size = exhaustPileSize(state.raw);
  if (size === void 0) return false;
  const key = `${fightKey(state)}:${state.turn ?? "?"}`;
  if (memory.turnStartExhaust?.key === key) return false;
  memory.turnStartExhaust = { key, size };
  return true;
}
function hpLostSinceTurnStart(env) {
  if (!cardConditionOptions.enabled) return false;
  noteTurnStartHp(env.screenMemory, env.state);
  const start = env.screenMemory.turnStartPlayerHp;
  if (!start || start.key !== `${fightKey(env.state)}:${env.state.turn ?? "?"}`) return false;
  return start.startLoss || num(asRecord(asRecord(env.state.raw["combat"])["player"])["current_hp"]) < start.hp;
}
function noteTurnStartHp(memory, state) {
  if (!state.in_combat) return false;
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  if (player["current_hp"] === void 0) return false;
  const key = `${fightKey(state)}:${state.turn ?? "?"}`;
  if (memory.turnStartPlayerHp?.key === key) return false;
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const startLoss = (powerAmount(player, "INFERNO_POWER") > 0 || powerAmount(player, "CRIMSON_MANTLE_POWER") > 0) && !relicIds.includes("TUNGSTEN_ROD");
  memory.turnStartPlayerHp = { key, hp: num(player["current_hp"]), startLoss };
  return true;
}
function exhaustPileSize(raw) {
  return pileSize(raw, "exhaust");
}
function drawablePileSize(raw) {
  const draw = pileSize(raw, "draw");
  const discard = pileSize(raw, "discard");
  return draw === void 0 && discard === void 0 ? void 0 : (draw ?? 0) + (discard ?? 0);
}
function pileSize(raw, which) {
  const pile = asRecord(asRecord(raw["agent_view"])["combat"])[which];
  if (pile === void 0) return void 0;
  return asArray(pile).reduce((sum, entry) => sum + Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(str(asRecord(entry)["line"]))?.[1] ?? 1), 0);
}
function thisTurnIncoming(combat) {
  const attacks = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).reduce((sum, enemy) => sum + asArray(enemy["intents"]).map(asRecord).reduce((s, intent) => s + (numOrNull(intent["damage"]) ?? 0) * Math.max(1, numOrNull(intent["hits"]) ?? 1), 0), 0);
  return Math.max(0, attacks - (numOrNull(asRecord(combat["player"])["block"]) ?? 0));
}
function forgeUpgrades(state, knowledge) {
  const out = {};
  const entries = [...asArray(asRecord(state.raw["combat"])["hand"]), ...asArray(asRecord(state.run?.raw)["deck"])].map(asRecord);
  for (const entry of entries) {
    const cardId = str(entry["card_id"]);
    if (!cardId || out[cardId] || bool(entry["upgraded"])) continue;
    const delta = upgradeDelta(entry, knowledge);
    if (delta) out[cardId] = delta;
  }
  return out;
}
function entropicBrewPotions(state) {
  return 1 + asArray(asRecord(state.run?.raw)["potions"]).filter((slot) => asRecord(slot)["occupied"] === false).length;
}
function deckDrawPool(state, knowledge, ctx, hand) {
  const inHand = hand.filter((card) => card.type !== "Potion").map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`);
  const powerExtraCost = pilePowerExtraCost(runRelicIds(state));
  return asArray(asRecord(state.run?.raw)["deck"]).flatMap((raw, position) => {
    const own = asRecord(raw);
    const cardId = str(own["card_id"]);
    if (!cardId) return [];
    const key = `${cardId}${bool(own["upgraded"]) ? "+" : ""}`;
    const at2 = inHand.indexOf(key);
    if (at2 >= 0) {
      inHand.splice(at2, 1);
      return [];
    }
    const model2 = offHandCardModel(own, cardId, bool(own["upgraded"]), 900 + position, knowledge, null, powerExtraCost, str(asRecord(state.run?.raw)["character_id"]), state.run?.ascension ?? null);
    return [{ ...model2, validTargets: model2.target === "single" ? ctx.enemyTargets : [], damage: model2.damage === null ? null : Math.floor((model2.damage + ctx.strength) * (ctx.weak ? 0.75 : 1)) }];
  });
}
function runRelicIds(state) {
  return asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
}
function pileCardModels(state, knowledge, pile, ctx) {
  return pileEntries(state, knowledge, pile, ctx).flatMap((entry) => Array.from({ length: entry.count }, () => entry.card));
}
function pileEntries(state, knowledge, pile, ctx) {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const deck = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  const powerExtraCost = pilePowerExtraCost(runRelicIds(state));
  return asArray(view[pile]).flatMap((raw, position) => {
    const entry = asRecord(raw);
    const cardId = str(asArray(entry["card_ids"])[0]);
    if (!cardId) return [];
    const line = str(entry["line"]);
    const upgraded = /^[^[*：:]*?\+\s*(?:\*\d+\s*)?\[/.test(line);
    const own = deck.find((card2) => str(card2["card_id"]) === cardId && bool(card2["upgraded"]) === upgraded) ?? deck.find((card2) => str(card2["card_id"]) === cardId) ?? null;
    const lineCost = /\[(-?\d+)费\]/.exec(line)?.[1];
    const model2 = offHandCardModel(own, cardId, upgraded, 900 + position, knowledge, own === null && lineCost !== void 0 ? Number(lineCost) : null, powerExtraCost, str(asRecord(state.run?.raw)["character_id"]), state.run?.ascension ?? null);
    const card = {
      ...model2,
      validTargets: model2.target === "single" ? ctx.enemyTargets : [],
      damage: model2.damage === null ? null : Math.floor((model2.damage + ctx.strength) * (ctx.weak ? 0.75 : 1))
    };
    const count2 = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
    const vars = own ? asArray(own["dynamic_values"]).map((value) => str(asRecord(value)["name"])) : (knowledge.card(cardId)?.vars ?? []).map((value) => str(asRecord(value)["name"]));
    return [{ card, raw: model2, count: Math.max(1, count2), line, mods: asArray(entry["mods"]).map((mod) => str(mod)), lineCost: lineCost !== void 0 ? Number(lineCost) : null, calculated: vars.some((name) => name.startsWith("Calculated")) }];
  });
}
function rolloutPiles(state, knowledge, enemyTargets) {
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view["draw"]) && !Array.isArray(view["discard"])) return null;
  const ctx = { enemyTargets, strength: 0, weak: false };
  return { draw: pileCardModels(state, knowledge, "draw", ctx), discard: pileCardModels(state, knowledge, "discard", ctx) };
}
function drawPileCards(raw) {
  const view = asRecord(asRecord(raw["agent_view"])["combat"]);
  const parse = (pile) => asArray(pile).flatMap((entry) => {
    const line = str(asRecord(entry)["line"]);
    const count2 = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
    const cost = /\[(-?\d+|X)费\]/.exec(line)?.[1];
    const playFirst = asArray(asRecord(entry)["card_ids"]).some((id) => typeof id === "string" && isPlayFirst(id));
    const playable = cost !== "-1" && !/不能被打出|unplayable/i.test(line) && !playFirst;
    const text = line.replace(/\[[^\]]*\]/g, "");
    const block = /获得\d+点格挡|gain \d+ block/i.test(text) && !/造成\d+点伤害|deal \d+ damage/i.test(text);
    const strike = asArray(asRecord(entry)["card_ids"]).some((id) => typeof id === "string" && isStrikeCard({ cardId: id }));
    const card = { playable, heldPenalty: heldPenaltyOf(line).heldPenalty, ...block ? { block } : {}, ...strike ? { strike } : {} };
    return Array.from({ length: count2 }, () => card);
  });
  const draw = parse(view["draw"]);
  if (draw.length > 0) return draw;
  const discard = parse(view["discard"]);
  return discard.length > 0 ? discard : void 0;
}
function beltSignature(raw) {
  return asArray(asRecord(raw["run"])["potions"]).map(asRecord).filter((slot) => bool(slot["occupied"])).map((slot) => `${num(slot["index"])}:${str(slot["potion_id"])}`).join("|");
}
function beltAfter(step, raw) {
  if (!step.cardId.startsWith("POTION:")) return void 0;
  const slot = step.cardId.split(":")[2];
  return beltSignature(raw).split("|").filter((entry) => entry !== "" && entry.split(":")[0] !== slot).join("|");
}
function expectedHandAfterFirst(plan, hand, musicBox) {
  const first = plan.steps[0];
  if (!first) return handSignature(hand);
  return handSignature(handAfterPlay(cardFor(first, hand), hand, musicBox));
}
function musicBoxArmed(state) {
  const held = asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "MUSIC_BOX");
  return held && num(asRecord(asRecord(state.raw["combat"])["player"])["attacks_played_this_turn"]) === 0;
}
function handAfterPlay(played, hand, musicBox) {
  const left = hand.filter((card) => card !== played);
  if (played?.type === "Attack" && musicBox) return [...left, musicBoxCopy(played)];
  if (played?.special !== "primal_force") return left;
  return left.map((card) => card.type === "Attack" ? { ...card, cardId: "GIANT_ROCK", upgraded: played.upgraded } : card);
}
function commit(env, turn, plan, hand, via) {
  slCommitted = plan;
  const first = plan.steps[0];
  const drawsOrRandom = (first ? cardFor(first, hand)?.draw ?? 0 : 0) + (first?.discards ? 1 : 0);
  env.screenMemory.plannedAfter = { turn, steps: plan.steps.slice(1), lethal: plan.outcome.winsFight };
  if (first?.discards) env.screenMemory.gambleDiscards = { turn, cardIds: first.discards };
  if (first) notePotionTake(env, turn, first);
  const potions = first ? beltAfter(first, env.state.raw) : void 0;
  env.screenMemory.combatPlan = (plan.steps.length > 1 || plan.steps.length === 1 && via !== "code") && drawsOrRandom === 0 ? {
    turn,
    lethal: plan.outcome.winsFight,
    remaining: plan.steps.slice(1),
    expectedHand: expectedHandAfterFirst(plan, hand, musicBoxArmed(env.state)),
    handLen: handLenAfter(first, hand, musicBoxArmed(env.state)),
    ...upgradesHand(first) ? { upgradeAll: true } : {},
    ...first.takes ? { take: takeSignature(first.takes) } : {},
    via,
    enemies: livingEnemySignature(env.state.raw),
    ...potions !== void 0 ? { potions } : {}
  } : null;
}
function leftByChoice(memo, hand) {
  const expected = memo.expectedHand === "" ? [] : memo.expectedHand.split(",").map((id) => id.replace(/\+$/, ""));
  for (const card of hand) {
    const at2 = expected.indexOf(card.cardId);
    if (at2 < 0) return false;
    expected.splice(at2, 1);
  }
  let left = hand;
  for (const step of memo.remaining) {
    if (step.cardId.startsWith("POTION:")) continue;
    const card = cardFor(step, left);
    if (!card) return false;
    left = left.filter((entry) => entry !== card);
  }
  return true;
}
function upgradesHand(step) {
  return step.cardId.startsWith("POTION:BLESSING_OF_THE_FORGE:");
}
function withoutUpgrades(signature) {
  return signature === "" ? "" : signature.split(",").map((id) => id.replace(/\+$/, "")).sort().join(",");
}
function handLenAfter(step, hand, musicBox) {
  const card = cardFor(step, hand);
  return card ? hand.length - 1 + (card.type === "Attack" && musicBox ? 1 : 0) : hand.length;
}
function lineDone(memo, combat, available) {
  return memo.remaining.length === 0 && memo.via !== "code" && available.includes("end_turn") && !bool(combat["end_turn_will_kill_player"]);
}
function lineStepExpect(memo, step, now) {
  const potion = step.cardId.startsWith("POTION:") ? step.cardId.split(":")[1] ?? "" : null;
  const loose = memo.afterSelection === true || memo.upgradeAll === true;
  const hand = memo.expectedHand === now ? memo.expectedHand : memo.take !== void 0 && withCard(memo.expectedHand, memo.take) === now ? now : null;
  const aimed = step.target === null ? void 0 : (memo.enemies ?? "").split("|").find((entry) => entry !== "" && Number(entry.slice(0, entry.indexOf(":"))) === step.target);
  const target = aimed === void 0 ? void 0 : aimed.slice(aimed.indexOf(":") + 1);
  return {
    from: "line",
    ...potion !== null ? { potion: { id: potion } } : { card: { id: step.pileCard?.cardId ?? step.cardId, ...loose ? {} : { upgraded: step.pileCard?.upgraded ?? step.upgraded } } },
    ...target ? { target: { id: target } } : {},
    ...memo.turn !== null ? { turn: memo.turn } : {},
    ...hand !== null && !loose ? { hand } : {},
    ...memo.enemies !== void 0 ? { enemies: memo.enemies } : {}
  };
}
function livingEnemySignature(raw) {
  return asArray(asRecord(raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).map((enemy) => `${num(enemy["index"])}:${str(enemy["enemy_id"])}`).join("|");
}
function guardSandpit(env, decision) {
  if (!decision) return decision;
  const combat = asRecord(env.state.raw["combat"]);
  const sandpits = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).map((enemy) => powerAmount(enemy, "SANDPIT_POWER")).filter((amount) => amount > 0);
  if (sandpits.length === 0 || Math.min(...sandpits) - 1 > 0) return decision;
  const energy = num(asRecord(combat["player"])["energy"]);
  const hand = asArray(combat["hand"]).map(asRecord);
  const escape = hand.filter((card) => str(card["card_id"]) === "FRANTIC_ESCAPE" && card["playable"] !== false && num(card["energy_cost"]) <= energy).sort((a, b) => num(a["energy_cost"]) - num(b["energy_cost"]))[0];
  if (!escape) return decision;
  const intent = { action: "play_card", card_index: num(escape["index"]) };
  const why = `Sandpit ${Math.min(...sandpits)} would reach 0 at the enemy turn (death regardless of HP/block)`;
  if (decision.kind === "act") {
    const after = env.screenMemory.plannedAfter;
    const lethalContinuation = decision.label === "combat/plan-continue" && after?.turn === (env.state.turn ?? null) && after.lethal === true;
    if (decision.intent.action === "play_card" && decision.label !== "combat/lethal" && !lethalContinuation) {
      const played = hand.find((card) => num(card["index"]) === decision.intent.card_index);
      const escapeNext = after !== void 0 && after.turn === (env.state.turn ?? null) && after.steps.some((step) => step.cardId === "FRANTIC_ESCAPE");
      const cost = played ? bool(played["costs_x"]) ? energy : num(played["energy_cost"]) : 0;
      if (!played || str(played["card_id"]) === "FRANTIC_ESCAPE" || escapeNext || energy - cost >= num(escape["energy_cost"])) return decision;
      env.screenMemory.combatPlan = null;
      return { kind: "act", label: "combat/sandpit-guard", intent, rationale: `${why}: playing Frantic Escape before ${str(played["name"], str(played["card_id"]))}, which would leave too little energy for it` };
    }
    if (decision.intent.action !== "end_turn") return decision;
    env.screenMemory.combatPlan = null;
    return { kind: "act", label: "combat/sandpit-guard", intent, rationale: `${why}: playing Frantic Escape instead of ending the turn` };
  }
  const resolve3 = decision.resolve.bind(decision);
  return {
    ...decision,
    resolve(answers) {
      const resolved = resolve3(answers);
      if (resolved.intent?.action !== "end_turn") return resolved;
      return {
        ...resolved,
        apply: () => {
          env.screenMemory.combatPlan = null;
        },
        intent,
        rationale: `${resolved.rationale}; overridden: ${why}, playing Frantic Escape`
      };
    }
  };
}
function endTurnLethalNote(endNow, modSaysLethal, hp) {
  if (!endNow) return "";
  const endReachesZero = endNow.outcome.dies || endNow.outcome.revived !== void 0;
  if (endReachesZero === modSaysLethal) return "";
  const heldDamage = endNow.outcome.heldDamage ?? 0;
  const enemyPart = Math.max(0, endNow.outcome.incomingAfterBlock - heldDamage);
  const endOnlyByOwnLosses = endNow.outcome.dies && !modSaysLethal && enemyPart < hp;
  if (modSaysLethal && !endReachesZero) {
    const guards = endNow.outcome.endTurnGuards ?? [];
    const left = `the enemy turn takes ${endNow.outcome.incomingAfterBlock} of ${hp} HP`;
    return guards.length > 0 ? ` [calc mismatch: solver says ending now does not kill, mod says lethal: the mod's flag counts the intents against the block up now; the solver also counts ${guards.map((guard) => `${guard.what} ${guard.amount}`).join(", ")} (${left})]` : ` [calc mismatch: solver says ending now does not kill, mod says lethal: no end-of-turn block, Regen or Buffer the flag leaves out; the solver's enemy hits differ from the intents (${left})]`;
  }
  if (!endOnlyByOwnLosses) return ` [calc mismatch: solver says ending now ${endNow.outcome.dies ? "kills" : "does not kill"}, mod says ${modSaysLethal ? "lethal" : "safe"}]`;
  const sandpit = endNow.outcome.sandpitAfter !== null && endNow.outcome.sandpitAfter <= 0;
  const from = endNow.outcome.heldDamageFrom ?? [];
  const heldHpLoss = endNow.outcome.heldHpLoss ?? 0;
  const lossFrom = endNow.outcome.heldHpLossFrom ?? [];
  const losses = `${endNow.outcome.hpLoss} HP lost in all, ${enemyPart} of it the enemy hits after block${heldDamage > 0 ? `, ${heldDamage} damage from cards held${from.length > 0 ? ` (${from.join(", ")})` : ""}` : ""}${heldHpLoss > 0 ? `, ${heldHpLoss} HP lost to cards held${lossFrom.length > 0 ? ` (${lossFrom.join(", ")})` : ""}` : ""}`;
  return sandpit ? ` [ending now kills by what the mod's lethal flag does not count: the Sandpit reaches 0 on the enemy turn and eats you whatever the HP (${losses})]` : ` [ending now kills by what the mod's lethal flag does not count: ${losses}]`;
}
function hardRuleLines(plans, enemies) {
  let kept = plans;
  if (enemies.some((enemy) => (enemy.sandpit ?? 0) > 0)) {
    const deep = (plan) => plan.outcome.winsFight || plan.outcome.sandpitAfter === null || plan.outcome.sandpitAfter >= 2;
    if (kept.some((plan) => !plan.outcome.winsFight && deep(plan))) kept = kept.filter(deep);
  }
  if (enemies.some((enemy) => (enemy.asleep ?? 0) > 0 || (enemy.slumber ?? 0) > 0)) {
    const asleep = (plan) => plan.outcome.winsFight || plan.outcome.sleepCost <= 0;
    if (kept.some((plan) => !plan.outcome.winsFight && asleep(plan))) kept = kept.filter(asleep);
  }
  return kept;
}
function planCombatTurn(env) {
  const explore = env.sl?.explore !== void 0 || env.slRecord !== void 0;
  if (explore) {
    slCommitted = null;
    slAvoidFailed = null;
    slReplayedCode = null;
  }
  let decision = withMechFallback(env, (mechEnv) => withSlRetryFallback(mechEnv, (planEnv) => guardSandpit(planEnv, planTurn(planEnv))));
  if (explore && decision?.kind === "act" && CODE_POINTS.has(decision.label) && slCommitted) {
    try {
      const steps = slCommitted.steps;
      const keys = turnKeys((env.sl?.explore ?? env.slRecord)?.played, steps);
      const failed2 = slAvoidFailed && slAvoidFailed.plan === slCommitted ? { line: lineText(steps), reason: slAvoidFailed.reason } : null;
      if (failed2) {
        const avoid = env.sl?.explore?.avoid;
        decision = { ...decision, log: { ...decision.log ?? {}, sl_explore: { avoid_failed: { point: avoid?.point ?? null, played_in: avoid?.attempts ?? [], ...failed2, ...keys.canon !== void 0 ? { turn: keys.canon } : {} } } } };
      }
      const replayed = slReplayedCode && slReplayedCode.plan === slCommitted ? slReplayedCode : null;
      if (replayed) decision = { ...decision, log: { ...decision.log ?? {}, sl_explore: { replay: { ...replayed.log } } } };
      slPoints.set(decision, { kind: "code", label: decision.label, line: lineText(steps), ...keys.canon !== void 0 ? { canon: { [lineText(steps)]: keys.canon } } : {}, ...failed2 ? { avoidFailed: failed2 } : {}, ...replayed ? { replay: { overridden: true, reason: replayed.reason, logged: true } } : {} });
    } catch {
    }
  } else if (explore && decision?.kind === "act" && decision.intent.action === "end_turn" && env.sl?.explore?.whole === true && env.sl.explore.avoid && env.sl.explore.played) {
    try {
      const avoid = env.sl.explore.avoid;
      const keys = turnKeys(env.sl.explore.played, []);
      if (triedHas(avoid.tried, { text: "", ...keys })) {
        const failed2 = { line: "end turn", reason: "nothing can be played this turn" };
        decision = { ...decision, log: { ...decision.log ?? {}, sl_explore: { avoid_failed: { point: avoid.point, played_in: avoid.attempts, ...failed2, ...keys.canon !== void 0 ? { turn: keys.canon } : {} } } } };
        slAvoidFails.set(decision, failed2);
      }
    } catch {
    }
  }
  return decision;
}
function stepPlay(step) {
  if (step.cardId.startsWith("POTION:")) return playKey({ potion: step.cardId.split(":")[1] ?? "" }, step.targetName);
  const card = step.pileCard ?? { cardId: step.cardId, upgraded: step.upgraded };
  return playKey({ card: card.cardId, upgraded: card.upgraded }, step.targetName);
}
function loggedLine(input, plays) {
  const used = /* @__PURE__ */ new Set();
  const steps = [];
  for (const play2 of plays) {
    const at2 = play2.indexOf(">");
    const what = at2 < 0 ? play2 : play2.slice(0, at2);
    const targetName = at2 < 0 ? null : play2.slice(at2 + 1);
    const potion = what.startsWith("potion:") ? what.slice("potion:".length) : null;
    const upgraded = potion === null && what.endsWith("+");
    const id = potion ?? (upgraded ? what.slice(0, -1) : what);
    const card = input.hand.find((entry) => !used.has(entry.index) && (potion !== null ? entry.type === "Potion" && entry.cardId.split(":")[1] === potion : entry.type !== "Potion" && entry.cardId === id && entry.upgraded === upgraded));
    if (!card) return null;
    const enemy = targetName === null ? null : input.enemies.find((other) => other.name === targetName);
    if (targetName !== null && !enemy) return null;
    used.add(card.index);
    steps.push({ cardIndex: card.index, cardId: card.cardId, upgraded: card.upgraded, name: card.name, target: enemy?.index ?? null, targetName: enemy?.name ?? null });
  }
  const plan = replaySteps(input, steps);
  if (!plan || plan.steps.length !== plays.length || plan.steps.some((step, i) => stepPlay(step) !== plays[i])) return null;
  return plan;
}
function turnKeys(played, steps, extra) {
  if (!played) return {};
  return {
    canon: turnCanon([...played.canon, ...steps.map(stepPlay), ...extra ? [extra.canon] : []]),
    loose: turnCanon([...played.text, ...steps.map((step) => summaryPlay({ name: step.name, targetName: step.targetName, potion: step.cardId.startsWith("POTION:") })), ...extra ? [extra.text] : []])
  };
}
function followsPlays(steps, plays, hand) {
  const order = steps.map(stepPlay);
  if (!plays.every((play2, i) => order[i] === play2)) return false;
  if (order.length === plays.length) return true;
  if (plays.length === 0) return false;
  const last = steps[plays.length - 1];
  if (last.cardId.startsWith("POTION:")) return false;
  const card = cardFor(last, hand);
  return card !== void 0 && drawsCards(card);
}
function turnOpen(played, steps, hand, extra) {
  if (!played) return {};
  if (extra) return { open: true, committed: turnCanon([...played.canon, ...steps.map(stepPlay), extra.canon]) };
  const at2 = steps.findIndex((step) => {
    if (step.cardId.startsWith("POTION:")) return false;
    const card = cardFor(step, hand);
    return card !== void 0 && drawsCards(card);
  });
  const sure = at2 < 0 ? steps : steps.slice(0, at2 + 1);
  return { open: at2 >= 0, committed: turnCanon([...played.canon, ...sure.map(stepPlay)]) };
}
function withSlRetryFallback(env, plan) {
  const sl = env.sl;
  if (!sl || sl.knownDraws === void 0 && sl.compute === void 0) return plan(env);
  try {
    return plan(env);
  } catch {
    const { knownDraws: _known, compute: _compute, ...plain } = sl;
    return plan({ ...env, sl: plain });
  }
}
function noteLeastLoss(decision, facts, bound) {
  try {
    const noted = facts();
    leastLossFacts.set(decision, noted);
    if (bound) {
      let memo;
      drawBounds.set(noted, () => memo ??= bound());
    }
  } catch {
  }
}
function cardChance(card, targets) {
  if (!card.known) return `${card.name} is not modelled`;
  const randomText = /随机|random/i.test(card.text);
  const loneTarget = targets <= 1 && (!randomText || randomTargetOnly(card.text));
  if (card.target === "random" && !loneTarget || card.randomExhaust === true || RANDOM_SPECIALS.has(card.special ?? "") || randomText && !loneTarget) return `${card.name} has a random effect`;
  if ((card.playsTop ?? 0) > 0 || card.generates !== void 0 || card.choices !== void 0 || card.adds !== void 0) return `${card.name} plays or makes a card nobody knows`;
  if (card.drawsUntil === true) return `${card.name} draws an unknown number of cards`;
  return null;
}
function leastLossFactsFor(line, solved, input, knownTop, exact, hand, player, randomPotions, targets) {
  const solverHand = input?.hand ?? hand;
  const knownUsed = knownTop !== null && knownTop.added.length === 0 && input?.knownTop !== void 0 ? knownTop.cards.length : 0;
  const exactUsed = Math.min(knownUsed, exact ?? knownUsed);
  const depth = solved.knownDepth ?? 0;
  const drawnKnown = knownTop?.cards.slice(0, Math.min(depth, knownUsed)) ?? [];
  const playable = [...solverHand.filter((card) => card.playable || card.type === "Potion"), ...drawnKnown];
  const pileCard = playable.find((card) => card.type !== "Potion" && DRAW_TEXT.test(card.text) && (card.draw <= 0 || card.drawsUntil === true || PILE_TEXT.test(card.text)));
  const potionDraws = solverHand.some((card) => card.type === "Potion" && (card.draw > 0 || card.drawsUntil === true || card.generates !== void 0 || RANDOM_SPECIALS.has(card.special ?? "")));
  const drawsKnown = exactUsed > 0 && !solved.truncated && solved.drewUnknown !== true && depth <= exactUsed && pileCard === void 0 && !potionDraws && !randomPotions.some((source) => source.kind === "draw");
  const draws = solved.drew === true;
  let chance = null;
  if (randomPotions.length > 0) chance = `a random potion (${randomPotions.map((source) => source.name).join(", ")}): its samples`;
  else if (draws && !drawsKnown) chance = "a line draws cards not exactly known";
  else {
    for (const card of playable) {
      chance = cardChance(card, targets);
      if (chance) break;
    }
  }
  const several = targets > 1;
  if (chance === null && several && (player.juggernaut ?? 0) > 0) chance = "Juggernaut hits a random enemy";
  if (chance === null && several && player.kusarigama && playable.some((card) => card.type === "Attack")) chance = "Kusarigama hits a random enemy";
  if (chance === null && several && player.hellraiser === true && draws) chance = "Hellraiser plays a drawn Strike at a random enemy";
  return { knownDraws: exactUsed, drawsKnown, draws, line: line.steps.map(stepText), chance };
}
function anyDrawInexact(card, targets) {
  if (!card.known) return `${card.name} is not modelled`;
  const randomText = /随机|random/i.test(card.text);
  const loneTarget = targets <= 1 && (!randomText || randomTargetOnly(card.text));
  if (card.target === "random" && !loneTarget || card.randomExhaust === true || RANDOM_SPECIALS.has(card.special ?? "") || randomText && !loneTarget) return `${card.name} has a random effect`;
  if ((card.playsTop ?? 0) > 0 || card.generates !== void 0 || card.choices !== void 0 || card.adds !== void 0) return `${card.name} plays or makes a card`;
  if (HAND_TEXT.test(card.text) || HAND_SPECIALS.has(card.special ?? "") || EXHAUST_PICKERS.has(card.cardId) || EXHAUST_HAND.has(card.cardId) || card.discards !== void 0) return `${card.name} reads or changes the hand`;
  if (PILE_TEXT.test(card.text) || card.putsOnTop === true) return `${card.name} touches the draw pile`;
  if (ON_DRAW_TEXT.test(card.text)) return `${card.name} acts on draws`;
  if (HP_SAVE_TEXT.test(card.text) && card.special !== "heal" && card.special !== "buffer") return `${card.name} may heal or shield us beyond the planner's model`;
  return null;
}
function chanceBesidesDraws(playable, player, randomPotions, targets) {
  if (randomPotions.length > 0) return `a random potion (${randomPotions.map((source) => source.name).join(", ")}): its samples`;
  for (const card of playable) {
    const chance = cardChance({ ...card, drawsUntil: false }, targets);
    if (chance) return chance;
  }
  const several = targets > 1;
  if (several && (player.juggernaut ?? 0) > 0) return "Juggernaut hits a random enemy";
  if (several && player.kusarigama && playable.some((card) => card.type === "Attack")) return "Kusarigama hits a random enemy";
  return null;
}
function textNumbers(text) {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0])).sort((a, b) => a - b);
}
function pileCardNow(entry, ctx) {
  const body = entry.line.replace(/^[^：:]*[：:]/, "");
  const raw = entry.raw;
  const damage = /造成(\d+)点伤害|deal (\d+) damage/i.exec(body);
  const hits = /造成\d+点伤害(\d+)次|deal \d+ damage (\d+) times/i.exec(body);
  const block = /获得(\d+)点格挡|gain (\d+) block/i.exec(body);
  const lineDamage = damage ? Number(damage[1] ?? damage[2]) : null;
  const lineHits = hits ? Number(hits[1] ?? hits[2]) : null;
  const lineBlock = block ? Number(block[1] ?? block[2]) : null;
  const rawDamage = raw.damage === null ? lineDamage : Math.max(raw.damage, lineDamage ?? 0);
  const card = {
    ...entry.card,
    damage: rawDamage === null ? null : Math.floor((rawDamage + ctx.strength) * (ctx.weak ? 0.75 : 1)),
    hits: Math.max(entry.card.hits, lineHits ?? 0),
    block: Math.max(raw.block, lineBlock ?? 0) + (Math.max(raw.block, lineBlock ?? 0) > 0 ? Math.max(0, ctx.dexterity) : 0)
  };
  const drop = (numbers, ...gone) => {
    const left = [...numbers];
    for (const value of gone) {
      if (value === null) continue;
      const at2 = left.indexOf(value);
      if (at2 >= 0) left.splice(at2, 1);
    }
    return left.join(",");
  };
  const deckText = raw.text;
  const deckDamage = /造成(\d+)点伤害|deal (\d+) damage/i.exec(deckText);
  const deckHits = /造成\d+点伤害(\d+)次|deal \d+ damage (\d+) times/i.exec(deckText);
  const deckBlock = /获得(\d+)点格挡|gain (\d+) block/i.exec(deckText);
  const numOf = (match) => match ? Number(match[1] ?? match[2]) : null;
  const differs = drop(textNumbers(body), lineDamage, lineHits, lineBlock) !== drop(textNumbers(deckText), numOf(deckDamage), numOf(deckHits), numOf(deckBlock));
  return { card, differs };
}
function pileCardInexact(entry, current2, targets, relicIds, knowledge) {
  const card = entry.card;
  const relic = relicIds.find((id) => CARD_NUMBER_RELICS[id]?.(card) === true);
  return anyDrawInexact(card, targets) ?? // A card whose effect is set per copy (Mad Science: 「？？？？？？」 in the game data, its numbers for every mode).
  (/？？|\?\?\?/.test(knowledge?.card(card.cardId)?.description ?? "") ? `${card.name}'s effect is set per card` : null) ?? (entry.mods.some((mod) => /enchant/i.test(mod)) ? `${card.name} is enchanted` : null) ?? (current2.differs ? `${card.name}'s numbers in the pile differ from the deck's` : null) ?? (entry.calculated && card.special !== "body_slam" ? `${card.name}'s number is worked out in play` : null) ?? (relic ? `${relic} changes ${card.name}` : null);
}
function pileCardCost(entry, knowledge, relicIds = []) {
  const card = entry.card;
  if (card.xCost) return card.cost;
  if (relicIds.includes("JEWELED_MASK") && card.type === "Power") return 0;
  const data = knowledge.card(card.cardId)?.cost;
  const base = typeof data === "number" && data >= 0 ? withPowerExtraCost({ type: card.type, xCost: false, cost: data }, pilePowerExtraCost(relicIds)).cost : card.cost;
  return Math.min(card.cost, entry.lineCost ?? card.cost, base);
}
function anyDrawBound(ctx) {
  const started = Date.now();
  const deadline = started + anyDrawOptions.budgetMs;
  const { input } = ctx;
  const playable = input.hand.filter((card) => card.playable || card.type === "Potion");
  const drawers = playable.filter((card) => drawsCards(card) || DRAW_TEXT.test(card.text));
  const chance = chanceBesidesDraws(playable, input.player, ctx.randomPotions, ctx.targets);
  const base = { drawing: drawers.map((card) => card.name), chance };
  const done = (bound) => ({ ...base, ...bound, ms: Date.now() - started });
  if (drawers.length === 0) return done({ refused: "no playable card or potion that draws in the planner's hand" });
  if (ctx.noDraw) {
    const notPlain = drawers.find((card) => PILE_TEXT.test(card.text) || HAND_TEXT.test(card.text) || ON_DRAW_TEXT.test(card.text));
    if (notPlain) return done({ refused: `${notPlain.name} is not a plain draw (No Draw may not stop it)` });
    return done({ refused: null, noDraw: ctx.relicIds.includes("FIDDLE") ? "Fiddle" : "No Draw" });
  }
  const player = asRecord(asRecord(ctx.state.raw["combat"])["player"]);
  const hp = input.player.hp;
  const rod = ctx.relicIds.includes("TUNGSTEN_ROD");
  if (ctx.relicIds.includes("BEATING_REMNANT")) return done({ refused: "Beating Remnant caps the HP lost this turn: the solver's own-turn losses are not exact" });
  const intangible = [...playable].find((card) => card.special === "intangible");
  if (intangible) return done({ refused: `${intangible.name} may give Intangible (the solver does not cap an HP loss with it)` });
  const watch = new Set(drawers.map((card) => card.index));
  const solveWith = (extra) => solveTurn({ ...input, stopAtOwnDeath: true, stopOnLive: true, watch, deadline, maxNodes: anyDrawOptions.maxNodes, ...extra });
  const others = playable.filter((card) => !watch.has(card.index));
  const saver = others.find((card) => HP_SAVE_TEXT.test(card.text) && card.special !== "heal" && card.special !== "buffer");
  const costFirst = (card) => {
    const loss = /失去\d+点生命|lose \d+ hp/i.exec(card.text);
    const draw = /抽|draw/i.exec(card.text);
    return loss !== null && (draw === null || loss.index < draw.index);
  };
  const ownKill = drawers.every((card) => card.type !== "Potion" && card.hpLoss - (rod ? 1 : 0) >= hp && costFirst(card));
  if (ownKill && !saver) {
    const solved2 = solveWith({});
    if (!solved2.truncated && solved2.lives !== true && solved2.plans.every((plan) => plan.outcome.dies) && (solved2.watchedAlive ?? []).length === 0) {
      return done({ refused: null, fatal: drawers.map((card) => ({ name: card.name, hpLoss: card.hpLoss })) });
    }
  }
  if (ctx.randomPotions.length > 0) return done({ refused: `a random potion (${ctx.randomPotions.map((source) => source.name).join(", ")}): its samples are not redone with every draw` });
  if (rod) return done({ refused: "Tungsten Rod takes 1 off each HP loss: the solver's own-turn losses are not exact" });
  if ((input.player.darkEmbrace ?? 0) > 0 || playable.some((card) => card.cardId === "DARK_EMBRACE")) return done({ refused: "Dark Embrace draws on exhausts (not through the drawing cards)" });
  for (const power of asArray(player["powers"]).map(asRecord)) {
    const id = str(power["power_id"]);
    if (!ON_DRAW_KNOWN.has(id) && ON_DRAW_TEXT.test(ctx.knowledge.power(id)?.description ?? "")) return done({ refused: `${str(power["name"], id)} acts when a card is drawn` });
  }
  const view = asRecord(asRecord(ctx.state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view["draw"])) return done({ refused: "the draw pile is not listed" });
  const blockWhenHeld = (input.player.feelNoPain ?? 0) > 0 || (input.player.blockPerHeldCard ?? 0) > 0 || playable.some((card) => (card.feelNoPain ?? 0) > 0);
  const now = { strength: ctx.pileContext.strength, weak: ctx.pileContext.weak, dexterity: asArray(player["powers"]).map(asRecord).filter((power) => str(power["power_id"]) === "DEXTERITY_POWER").reduce((sum, power) => sum + num(power["amount"]), 0) };
  const numberPowers = asArray(player["powers"]).map(asRecord).filter((power) => !MODELLED_POWERS.has(str(power["power_id"])) && !NUMBER_LOWERING_POWERS.has(str(power["power_id"]))).filter((power) => {
    const text = ctx.knowledge.power(str(power["power_id"]))?.description ?? "";
    return text === "" || /伤害|格挡|耗能|damage|block|cost/i.test(text);
  }).map((power) => str(power["name"], str(power["power_id"])));
  const entries = pileEntries(ctx.state, ctx.knowledge, "draw", ctx.pileContext);
  const drawPile = entries.reduce((sum, entry) => sum + entry.count, 0);
  const inexact = [];
  const excluded = [];
  const pool = [];
  const drawCount = (card) => card.drawsUntil === true || card.draw <= 0 ? HAND_LIMIT : card.draw;
  let maxDraws = drawers.reduce((sum, card) => sum + drawCount(card), 0);
  for (const entry of entries) {
    const card = entry.card;
    const unplayable = !card.playable || card.type === "Status" || card.type === "Curse";
    if (unplayable) {
      const hurts = card.heldPenalty > 0 || (card.heldHpLoss ?? 0) > 0 || HAND_TEXT.test(card.text) || ON_DRAW_TEXT.test(card.text);
      if (hurts && ON_DRAW_TEXT.test(card.text) && !/失去|lose/i.test(card.text)) return done({ refused: `${card.name} in the draw pile acts when drawn` });
      if (hurts && blockWhenHeld) return done({ refused: `${card.name} in the draw pile hurts when drawn, but Feel No Pain or Cloak Clasp may give block for it` });
      if (hurts) {
        excluded.push(`${card.name}${entry.count > 1 ? ` x${entry.count}` : ""}`);
        continue;
      }
    }
    const current2 = pileCardNow(entry, now);
    const why = card.playable ? pileCardInexact(entry, current2, ctx.targets, ctx.relicIds, ctx.knowledge) : null;
    if (why) inexact.push(why);
    if (!unplayable && drawsCards(card)) maxDraws += drawCount(card) * entry.count;
    if (!unplayable && card.draw <= 0 && !card.drawsUntil && DRAW_TEXT.test(card.text) && !PILE_TEXT.test(card.text)) maxDraws += HAND_LIMIT * entry.count;
    const cost = pileCardCost(entry, ctx.knowledge, ctx.relicIds);
    const shown = !unplayable && input.player.unmovableArmed === true && current2.card.block > 0 ? { ...current2.card, block: current2.card.block * 2 } : current2.card;
    for (let copy = 0; copy < entry.count; copy += 1) {
      const k = pool.length;
      pool.push({ ...unplayable ? card : shown, cost, index: ANY_DRAW_INDEX + k, key: `anydraw${k}`, draw: 0, drawsUntil: false });
    }
  }
  if (maxDraws > drawPile) inexact.push(`a draw may reach the reshuffle (up to ${maxDraws} draws, ${drawPile} in the draw pile)`);
  if (numberPowers.length > 0 && pool.length > 0) inexact.push(`${numberPowers.join(", ")} may change the pile cards' numbers`);
  const several = ctx.targets > 1;
  if (several && (input.player.hellraiser === true || playable.some((card) => card.cardId === "HELLRAISER"))) inexact.push("Hellraiser plays drawn Strikes at a random enemy");
  if (several && (input.player.juggernaut ?? 0) > 0) inexact.push("Juggernaut hits a random enemy");
  if (several && input.player.kusarigama) inexact.push("Kusarigama hits a random enemy");
  const unmovable = asArray(player["powers"]).some((power) => str(asRecord(power)["power_id"]) === "UNMOVABLE_POWER");
  const doubler = ctx.relicIds.includes("VAMBRACE") ? "Vambrace" : unmovable ? "Unmovable" : null;
  if (doubler && (input.player.unmovableArmed !== true || unmovable && ctx.relicIds.includes("VAMBRACE")) && pool.some((card) => card.block > 0)) {
    inexact.push(`${unmovable && ctx.relicIds.includes("VAMBRACE") ? "Vambrace and Unmovable" : doubler} may double the first card Block`);
  }
  for (const card of playable) {
    const why = anyDrawInexact(card, ctx.targets);
    if (why && !(watch.has(card.index) && why === `${card.name} draws an unknown number of cards`)) inexact.push(why);
  }
  const hand = input.hand.map((card) => watch.has(card.index) ? { ...card, draw: 0, drawsUntil: false, drawn: pool } : card);
  const solved = solveTurn({
    ...input,
    hand,
    player: { ...input.player, drawable: pool.length, handLimit: Number.MAX_SAFE_INTEGER },
    knownTop: void 0,
    stopAtOwnDeath: true,
    stopOnLive: true,
    watch,
    deadline,
    maxNodes: anyDrawOptions.maxNodes
  });
  const aliveAfter = new Set(solved.watchedAlive ?? []);
  return done({
    refused: null,
    superset: {
      cards: pool.length,
      drawPile,
      excluded,
      inexact: [...new Set(inexact)],
      allDie: solved.lives !== true && solved.plans.every((plan) => plan.outcome.dies),
      aliveAfterDraw: [...new Set(drawers.filter((card) => aliveAfter.has(card.index)).map((card) => card.name))],
      truncated: solved.truncated,
      timedOut: solved.timedOut === true,
      nodes: solved.nodes
    }
  });
}
function slKnownTop(env, state, ctx) {
  const known = env.sl?.knownDraws;
  if (!known || known.cards.length === 0) return null;
  try {
    const pile = pileCardModels(state, env.knowledge, "draw", ctx);
    const addedKeys = known.added?.cards ?? [];
    const all = knownTopIndices([...known.cards, ...addedKeys], pile);
    if (!all) return null;
    const indices = all.slice(0, known.cards.length);
    const cards = indices.map((at2, k) => ({ ...pile[at2], index: SL_KNOWN_DRAW_INDEX + k, key: `known${k}` }));
    return { indices, cards, names: known.names.slice(0, indices.length), attempts: [...known.attempts], added: all.slice(known.cards.length), addedNames: (known.added?.names ?? []).slice(0, addedKeys.length) };
  } catch {
    return null;
  }
}
function knownDrawsFact(names, attempts, added = []) {
  const named = names.slice(0, KNOWN_DRAWS_NAMED).join(", ") + (names.length > KNOWN_DRAWS_NAMED ? ", ..." : "");
  if (added.length > 0) {
    const counts = /* @__PURE__ */ new Map();
    for (const name of added) counts.set(name, (counts.get(name) ?? 0) + 1);
    const addedText = [...counts].map(([name, n]) => n > 1 ? `${name} x${n}` : name).join(", ");
    return `SL retry: the next ${names.length} card${names.length === 1 ? "" : "s"} of the draw pile's own, in the order they come (the next first), are known from attempt ${attempts.join(", ")}: ${named}; ${addedText} added to the pile ${added.length === 1 ? "is" : "are"} at random places among them. The rollout draws them so; this turn's options and past them the draws are random.`;
  }
  return `SL retry: the next ${names.length} card${names.length === 1 ? "" : "s"} of the draw pile, in the order they come (the next first), are known from attempt ${attempts.join(", ")}: ${named}. The options' numbers and the rollout draw these first; past them the draws are random.`;
}
function withMechFallback(env, plan) {
  if (env.mechRules === false) return plan(env);
  try {
    return plan(env);
  } catch {
    if (env.mechDeathMove !== false) {
      try {
        return plan({ ...env, mechDeathMove: false });
      } catch {
      }
    }
    if (env.mechMoveRules !== false) {
      try {
        return plan({ ...env, mechMoveRules: false, mechDeathMove: false });
      } catch {
      }
    }
    return plan({ ...env, mechRules: false });
  }
}
function planTurn(env) {
  const planStart = performance.now();
  const cpuStart = process.cpuUsage();
  plannerTiming.last = null;
  const { state } = env;
  const exhaustedEarlier = exhaustedSinceTurnStart(env);
  const hpLostEarlier = hpLostSinceTurnStart(env);
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  if (readiness["can_use_combat_actions"] === false) return null;
  if (!state.available_actions.includes("play_card") && !state.available_actions.includes("end_turn")) return null;
  const player = asRecord(combat["player"]);
  if (boulderSettling(env.screenMemory, fightKey(state), state.turn ?? null, powerAmount(player, "ROLLING_BOULDER_POWER"), num(player["cards_played_this_turn"]), Date.now())) return null;
  const freeAttacks = powerAmount(player, "FREE_ATTACK_POWER");
  const shrunk = powerAmount(player, "SHRINK_POWER") !== 0;
  const hand = asArray(combat["hand"]).map((entry, index) => {
    const modelled = modelHandCard(entry, index, env.knowledge, str(asRecord(state.run?.raw)["character_id"]), state.run?.ascension ?? null);
    const model2 = shrunk && modelled.damage !== null ? { ...modelled, shownShrunk: true } : modelled;
    const base = env.knowledge.card(model2.cardId)?.cost ?? null;
    return freeAttacks > 0 && model2.type === "Attack" && model2.cost === 0 && base !== null && base > 0 ? { ...model2, cost: base } : model2;
  });
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const exhaustsEveryTurn = relicIds.includes("TOASTY_MITTENS");
  const exhaustedThisTurn = exhaustsEveryTurn || num(player["cards_exhausted_this_turn"]) > 0 || exhaustedEarlier;
  const noDraw = relicIds.includes("FIDDLE") || powerAmount(player, "NO_DRAW_POWER") > 0;
  if (noDraw) {
    for (const card of hand) {
      card.draw = 0;
      card.drawsUntil = false;
    }
  }
  const penNib = relicIds.includes("PEN_NIB") ? relicStack(state.run?.raw, "PEN_NIB") % PEN_NIB_EVERY : void 0;
  stripPenNib(hand, penNib === PEN_NIB_EVERY - 1);
  const vigor = powerAmount(player, "VIGOR_POWER");
  stripVigor(hand, vigor, powerAmount(player, "WEAK_POWER") > 0, shrunk);
  const phantomBlades = powerAmount(player, "PHANTOM_BLADES_POWER");
  const phantomBladesArmed = stripPhantomBlades(hand, phantomBlades, powerAmount(player, "STRENGTH_POWER"), powerAmount(player, "WEAK_POWER") > 0, shrunk);
  const ascension = state.run?.ascension ?? 0;
  const enemies = enemySims(combat, ascension);
  const mechRules = learnedStunRules(env);
  applyStripStuns(enemies, combat, mechRules);
  applyMoveRules(enemies, combat, learnedMoveRules(env), ascension);
  applyDeathRules(enemies, combat, learnedDeathRules(env), ascension);
  carryHpLossCaps(env.screenMemory, `${fightKey(state)}:${state.turn ?? "?"}`, enemies);
  if (enemies.length === 0) {
    const since = env.screenMemory.noEnemiesSince ??= Date.now();
    if (Date.now() - since <= 4e3) return null;
    const keepsBlock = powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0;
    const setup = state.available_actions.includes("play_card") ? phaseSetupCard(hand, num(player["energy"]), keepsBlock) : null;
    if (setup) {
      return { kind: "act", label: "combat/phase-setup", intent: { action: "play_card", card_index: setup.card.index }, rationale: `no living enemy (boss phase change): ${setup.why} before ending the turn` };
    }
    if (state.available_actions.includes("end_turn")) {
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no living enemy but combat continues (boss phase change): ending the turn" };
    }
    return null;
  }
  env.screenMemory.noEnemiesSince = void 0;
  const legionPreview = paelsLegionPreview(state.run?.raw, combat);
  const firstPowerBlock = permafrostBlock(env.screenMemory, state);
  const playerSim = {
    ...str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && ascension === 10 && powerAmount(player, "NO_DRAW_POWER") > 0 ? { noDraw: true } : {},
    ...firstPowerBlock !== void 0 ? { permafrostBlock: firstPowerBlock } : {},
    freeAttacks,
    exhaustPile: exhaustPileSize(state.raw),
    ...drawablePileSize(state.raw) !== void 0 ? { drawable: drawablePileSize(state.raw) } : {},
    // A Duplicator drunk earlier this turn: its next card is played twice (11LC F17 T2).
    duplicate: powerAmount(player, "DUPLICATION_POWER"),
    // One-Two Punch played earlier this turn: its next Attack(s) are played an extra time (9Q7V F17 T14).
    duplicateAttacks: powerAmount(player, "ONE_TWO_PUNCH_POWER"),
    // 53FLQ68CETW0 F48 T12: one Skill; VN7RQJMJEFMX F27 T6, silent-0115: the upgrade arms two Skills.
    ...[1, 2].includes(powerAmount(player, "BURST_POWER")) ? { duplicateSkills: powerAmount(player, "BURST_POWER") } : {},
    regen: powerAmount(player, "REGEN_POWER"),
    // Buffer already up (a Lucky Tonic drunk earlier this turn or before): the next HP losses are prevented.
    buffer: powerAmount(player, "BUFFER_POWER"),
    hp: num(player["current_hp"]),
    maxHp: num(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    weak: powerAmount(player, "WEAK_POWER") > 0,
    vulnerable: powerAmount(player, "VULNERABLE_POWER") > 0,
    frail: powerAmount(player, "FRAIL_POWER") > 0,
    dexterityNow: powerAmount(player, "DEXTERITY_POWER"),
    intangible: powerAmount(player, "INTANGIBLE_POWER") > 0,
    // -1 on us, never above 0: `> 0` never turned it on (XC4TNGZU4KT9 F9 T3 planned 16 and a kill, dealt 14).
    shrunk,
    juggernaut: powerAmount(player, "JUGGERNAUT_POWER"),
    kusarigama: kusarigamaOf(state.run?.raw),
    ...relicIds.includes("SHURIKEN") ? { shuriken: { every: SHURIKEN_ATTACKS, strength: SHURIKEN_STRENGTH, count: relicStack(state.run?.raw, "SHURIKEN") % SHURIKEN_ATTACKS } } : {},
    // Silent evidence only: CSBR5CRDWQNB F33 attempt 6 T1/T2/T4, ledger silent-0061/0063. Ironclad stays unchanged.
    ...str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && relicIds.includes("DAUGHTER_OF_THE_WIND") ? { daughterWindBlock: 1 } : {},
    // L704TLETMZBM F48 T3/T4, silent-0193/0194: three Block per observed explicit discard.
    ...str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && relicIds.includes("TOUGH_BANDAGES") ? { toughBandagesBlock: 3 } : {},
    // Music Box: the turn's first Attack card comes back as an Ethereal copy (armed while none is played yet).
    ...relicIds.includes("MUSIC_BOX") ? { musicBox: { count: num(player["attacks_played_this_turn"]) } } : {},
    rage: powerAmount(player, "RAGE_POWER"),
    keepsBlock: powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0,
    gambit: powerAmount(player, "THE_GAMBIT_POWER") > 0,
    endTurnBlock: powerAmount(player, "PLATING_POWER") + powerAmount(player, "METALLICIZE_POWER"),
    rupture: powerAmount(player, "RUPTURE_POWER"),
    // Sloth caps cards per turn; Disintegration deals its amount at the end of every turn.
    maxPlays: playCap(player, env),
    ...observedSlothReplay(state) && powerAmount(player, "RINGING_POWER") === 0 ? { slothDefendReplay: true } : {},
    // Smoggy: one Skill a turn, less the Skills already played.
    maxSkills: powerAmount(player, "SMOGGY_POWER") > 0 ? Math.max(0, 1 - num(player["skills_played_this_turn"])) : null,
    // Constrict (Slithering Strangler) is the same end-of-turn damage (BHMP F6: 12 HP unpredicted).
    endTurnHpLoss: powerAmount(player, "DISINTEGRATION_POWER") + powerAmount(player, "CONSTRICT_POWER"),
    surrounded: powerAmount(player, "SURROUNDED_POWER") > 0,
    facing: env.screenMemory.facing ?? startFacing(combat),
    // MECH_MOVE_RULES (class C): the back attack only while both claws live (turn-solver PlayerSim.backAttackPair).
    ...powerAmount(player, "SURROUNDED_POWER") > 0 && mechMoveOn(env) ? { backAttackPair: true } : {},
    colossus: powerAmount(player, "COLOSSUS_POWER") > 0,
    // Inferno takes 1 HP for each copy up at the start of each turn (and that loss is what makes it hit every enemy; one
    // sweep): two Inferno+ (18) took 2 (C4F14F3XPN0N F33), the planner had counted 1 whatever the copies.
    startTurnHpLoss: startTurnHpLossOf2(state, powerAmount(player, "INFERNO_POWER"), powerAmount(player, "CRIMSON_MANTLE_POWER")),
    retaliate: powerAmount(player, "FLAME_BARRIER_POWER") + powerAmount(player, "THORNS_POWER"),
    turnStartAoe: turnStartAoe(relicIds, player),
    ...relicIds.includes("CLOAK_CLASP") ? { blockPerHeldCard: CLOAK_CLASP_BLOCK } : {},
    ...relicIds.includes("PAELS_TEARS") ? { paelsTears: PAELS_TEARS_ENERGY } : {},
    ...relicIds.includes("RED_SKULL") ? { redSkull: RED_SKULL_STRENGTH } : {},
    ...relicIds.includes("SELF_FORMING_CLAY") ? { clayBlock: CLAY_BLOCK, clayPending: powerAmount(player, "SELF_FORMING_CLAY_POWER") } : {},
    inferno: powerAmount(player, "INFERNO_POWER"),
    infernoCopies: infernoCopies(state, powerAmount(player, "INFERNO_POWER")),
    feelNoPain: powerAmount(player, "FEEL_NO_PAIN_POWER"),
    afterImage: powerAmount(player, "AFTERIMAGE_POWER"),
    // 5PM6JAQG6FNQ F33 T1-T3, silent-0132: only the observed Silent A10 scope is enabled.
    ...str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && state.run?.ascension === 10 ? { serpentForm: powerAmount(player, "SERPENT_FORM_POWER") } : {},
    shadowmeldActive: powerAmount(player, "SHADOWMELD_POWER") > 0,
    corrosiveWave: powerAmount(player, "CORROSIVE_WAVE_POWER"),
    poisonExtraTriggers: powerAmount(player, "ACCELERANT_POWER"),
    envenom: powerAmount(player, "ENVENOM_POWER"),
    ...phantomBlades === 9 ? { phantomBlades, phantomBladesSpent: !phantomBladesArmed } : {},
    // Mid-turn draws: a Strike drawn plays itself (Hellraiser); each exhaust draws (Dark Embrace).
    hellraiser: powerAmount(player, "HELLRAISER_POWER") > 0,
    darkEmbrace: powerAmount(player, "DARK_EMBRACE_POWER"),
    strengthNow: powerAmount(player, "STRENGTH_POWER"),
    // No card Block yet this turn (block 0 is the proxy): Unmovable's doubling is still to come.
    // Vambrace doubles the first card Block of the fight, the same way: every Block card shows the doubled
    // number until one is played (G8YY F30 T3: Defend 12 and Shrug It Off 18 planned, 12 + 9 gained).
    unmovableArmed: powerAmount(player, "UNMOVABLE_POWER") > 0 && num(player["block"]) === 0 || vambraceArmed(relicIds, asArray(combat["hand"]), powerAmount(player, "DEXTERITY_POWER"), powerAmount(player, "FRAIL_POWER") > 0) || legionPreview,
    ...legionPreview ? { paelsLegionPreview: true } : {},
    demonTongue: relicIds.includes("DEMON_TONGUE") && env.screenMemory.demonTongueTurn !== `${hpGuardFight(env)}:${state.turn}`,
    helmetBlock: relicIds.includes("INTIMIDATING_HELMET") ? INTIMIDATING_HELMET_BLOCK : 0,
    hpLossCap: relicIds.includes("BEATING_REMNANT") ? BEATING_REMNANT_CAP : null,
    // silent-0177/0178: only Silent enemy-hit evidence; keep Ironclad's model unchanged.
    ...str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && relicIds.includes("TUNGSTEN_ROD") ? { tungstenRod: true } : {},
    vigor,
    ...penNib !== void 0 ? { penNib } : {},
    noBlock: powerAmount(player, "NO_BLOCK_POWER") > 0,
    tender: powerAmount(player, "TENDER_POWER"),
    // 61E2QS63Y9WU F28 T2-T3, silent-0232: preserve already captured Block when replanning.
    ...str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" && state.run?.ascension === 10 && powerAmount(player, "TENDER_POWER") === 1 && [3, 5].includes(powerAmount(player, "BLOCK_NEXT_TURN_POWER")) ? { nextTurnBlock: powerAmount(player, "BLOCK_NEXT_TURN_POWER") } : {},
    exhaustedThisTurn,
    // CARD_CONDITIONS: HP already lost this turn before this decision (Spite's second hit; hpLostSinceTurnStart).
    ...hpLostEarlier ? { hpLostThisTurn: true } : {},
    // Fairy in a Bottle and Lizard Tail: a line that reaches 0 HP goes on at their HP (JR66CJ9T8H7W F48).
    revives: revivesOf(state, env.screenMemory, num(player["max_hp"])),
    ...relicIds.includes("PAPER_PHROG") ? { vulnerableFactor: PAPER_PHROG_VULNERABLE } : {},
    ...relicIds.includes("LOST_WISP") ? { lostWisp: LOST_WISP_DAMAGE } : {},
    // Throwing Axe: the fight's first card is played twice (FSPKJAYY3ET6 F39 T1: Inflame, Strength +6 and Galvanic's 6
    // twice). Known only on turn 1 with no card played yet: the relic shows no used state and the state has no count of
    // the fight's plays (a fight whose turn 1 played nothing is left out).
    ...relicIds.includes("THROWING_AXE") && state.turn === 1 && num(player["cards_played_this_turn"]) === 0 ? { firstCardReplay: true } : {},
    // PASSIVE_PIECES (passive-pieces.ts): Orichalcum, Ripple Basin, Letter Opener, Ornamental Fan, Parrying Shield on this
    // turn too, the counters from the relics (none held, or off: nothing, the solver as before).
    ...liveSolverFields(state.run?.raw, num(player["cards_played_this_turn"]), num(player["attacks_played_this_turn"]))
  };
  const kind = fightKind(combat, env);
  recordFightPlays(env, num(player["cards_played_this_turn"]));
  const wither = witherInput(env, combat, hand, num(player["cards_played_this_turn"]));
  const memo = env.screenMemory.combatPlan;
  const handGrew = memo !== null && hand.length > memo.handLen + (memo.take ? 1 : 0);
  const sameEnemies = memo?.enemies === void 0 || memo.enemies === livingEnemySignature(state.raw);
  const drunk = memo?.potions === void 0 || memo.potions === beltSignature(state.raw);
  const sameHand = memo !== null && (memo.expectedHand === handSignature(hand) || memo.afterSelection === true && leftByChoice(memo, hand) || memo.upgradeAll === true && withoutUpgrades(memo.expectedHand) === withoutUpgrades(handSignature(hand)) || memo.take !== void 0 && withCard(memo.expectedHand, memo.take) === handSignature(hand));
  const asExpected = memo !== null && !handGrew && sameEnemies && drunk && memo.turn === state.turn && sameHand;
  const lineEnded = memo !== null && asExpected && lineDone(memo, combat, state.available_actions) ? memo.via : null;
  if (memo && asExpected && memo.remaining.length > 0) {
    const next = memo.remaining[0];
    const found = intentFor(next, hand);
    const intent = found ? { ...found, expect: lineStepExpect(memo, next, handSignature(hand)) } : null;
    const takePending = !intent && memo.take !== void 0 && next.pileCard !== void 0 && takeSignature(next.pileCard) === memo.take && memo.expectedHand === handSignature(hand);
    if (takePending) {
      const since = env.screenMemory.takeWaitSince ??= Date.now();
      if (Date.now() - since <= TAKE_WAIT_MS) return null;
    }
    env.screenMemory.takeWaitSince = void 0;
    if (intent) {
      const nextCard = cardFor(next, hand);
      noteIntent(env, intent, nextCard);
      if (next.discards) env.screenMemory.gambleDiscards = { turn: memo.turn, cardIds: next.discards };
      notePotionTake(env, memo.turn, next);
      env.screenMemory.plannedAfter = { turn: memo.turn, steps: memo.remaining.slice(1), lethal: memo.lethal };
      const { potions: _checked, afterSelection: _resumed, upgradeAll: _forged, take: _taken, ...kept } = memo;
      const potions2 = beltAfter(next, state.raw);
      env.screenMemory.combatPlan = (memo.remaining.length > 1 || memo.via !== "code") && (nextCard?.draw ?? 0) === 0 && nextCard?.discardCount === void 0 ? {
        ...kept,
        remaining: memo.remaining.slice(1),
        expectedHand: handSignature(handAfterPlay(nextCard, hand, musicBoxArmed(state))),
        handLen: handLenAfter(next, hand, musicBoxArmed(state)),
        ...upgradesHand(next) ? { upgradeAll: true } : {},
        ...next.takes ? { take: takeSignature(next.takes) } : {},
        ...potions2 !== void 0 ? { potions: potions2 } : {}
      } : null;
      return {
        kind: "act",
        label: "combat/plan-continue",
        intent,
        rationale: `continuing the ${memo.via === "jev" ? "Jev-chosen" : memo.via === "deepseek" ? "DeepSeek-chosen" : memo.via === "claude" ? "Claude-chosen" : "code-chosen"} plan: ${stepText(next)}`
      };
    }
  }
  env.screenMemory.combatPlan = null;
  env.screenMemory.takeWaitSince = void 0;
  const potionsAll = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use);
  const continuation = kind === "boss" ? firstDoubleBoss(state) : null;
  const observedDouble = kind === "boss" ? doubleBossFor(state) : null;
  const costs = potionCosts(
    potionsAll.map((potion) => potion.potion_id),
    state.run?.ascension ?? 0,
    Number(str(asRecord(state.run?.raw)["act_id"]) || 0) + 1,
    kind,
    continuation ? { potionHp: continuation.potionHp, source: continuation.value.source } : void 0
  );
  const playable = hand.filter((card) => card.playable);
  if (playable.length === 0) {
    const rescue = noPlayRescuePotion(env, enemies, playerSim);
    if (rescue) return rescue;
    if (potionsAll.length === 0 || !state.available_actions.includes("use_potion")) {
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
    }
  }
  const juice = potionsAll.find((potion) => potion.potion_id === "FRUIT_JUICE");
  if (juice) {
    return { kind: "act", label: "combat/potion-now", intent: { action: "use_potion", option_index: juice.slot }, rationale: `drinking ${juice.name} (permanent max HP, no reason to wait)` };
  }
  const attackers = enemies.filter((enemy) => enemy.attacks.length > 0).length;
  const pressed = playerSim.maxHp > 0 && playerSim.hp < playerSim.maxHp * 0.4 && (kind === "elite" || kind !== "boss" && attackers >= 2);
  const nowIncoming = enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((s, a) => s + a.damage * a.hits, 0), 0);
  const deathExcluded = deathOnlyMoves(enemies);
  const presentIds = asArray(combat["enemies"]).map((enemy) => str(asRecord(enemy)["enemy_id"]));
  const summonThreat = (enemy) => summonThreatAt(str(enemy["enemy_id"]), str(enemy["move_id"]), ascension, presentIds, playerSim.vulnerable);
  const nextIncoming = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).reduce((sum, enemy, i) => sum + summonThreat(enemy) + (multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), boardDamageContext(enemy, player, ascension), deathExcluded.get(numOrNull(enemy["index"]) ?? i)) ?? 0), 0) + revivingIllusions(combat).reduce((sum, enemy) => sum + (revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? 0), 0);
  const laterIncoming = laterIncomingOf(combat, ascension, deathExcluded);
  const fightPlan = activeFightPlan(env);
  const bigHit = nowIncoming - playerSim.block >= Math.max(12, playerSim.hp * 0.25);
  const focusIndex = fightPlan?.focus ? numOrNull(
    asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false && str(enemy["enemy_id"]) === fightPlan.focus).sort((a, b) => num(a["current_hp"]) - num(b["current_hp"]))[0]?.["index"]
  ) : null;
  const focusInput = focusIndex !== null && enemies.length > 1 ? { focusIndex } : {};
  const notBlunting = (potionId) => OFFENSIVE_POTIONS.has(potionId) || !BLUNTS_HIT.test(potionsAll.find((potion) => potion.potion_id === potionId)?.text ?? "");
  const drawPile = drawPileCards(state.raw);
  const raceEruption = asArray(combat["enemies"]).some((enemy) => eruptionRace(asRecord(enemy), playerSim.hp, state.turn ?? 1, state.run?.ascension ?? 0));
  const enemyTargets = enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.index);
  const pileContext = { enemyTargets, strength: playerSim.strengthNow ?? 0, weak: playerSim.weak };
  const powerExtraCost = potionPowerExtraCost(relicIds);
  const knownTop = slKnownTop(env, state, pileContext);
  const beltIds = new Set(potionsAll.map((potion) => potion.potion_id));
  const pickFrom = (pile, free) => pileCardPick(pileCardModels(state, env.knowledge, pile, pileContext), thisTurnIncoming(combat), Math.max(1, enemyTargets.length), free, {
    ...exhaustPileSize(state.raw) === void 0 ? {} : { exhaustReach: (exhaustPileSize(state.raw) ?? 0) + hand.filter((card) => card.exhausts).length },
    vulnerable: Math.max(0, ...enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.vulnerable))
  }, powerExtraCost);
  const drawSlot = potionsAll.find((potion) => potion.potion_id === "GAMBLERS_BREW" || potion.potion_id === "DISTILLED_CHAOS" || potion.potion_id === "GLOWWATER_POTION" || potion.potion_id === "BOTTLED_POTENTIAL")?.slot;
  const potionContext = {
    ...pileContext,
    ...observedDouble && (state.run?.floor === observedDouble.firstFloor || state.run?.floor === observedDouble.secondFloor) ? { observedPoison: observedDouble.poisonPotionAmount } : {},
    ...powerExtraCost > 0 ? { powerExtraCost } : {},
    ...beltIds.has("BLESSING_OF_THE_FORGE") ? { upgrades: forgeUpgrades(state, env.knowledge) } : {},
    ...beltIds.has("SOLDIERS_STEW") ? { strikePileDamage: [...pileCardModels(state, env.knowledge, "draw", pileContext), ...pileCardModels(state, env.knowledge, "discard", pileContext)].filter(isStrikeCard).reduce((sum, card) => sum + (card.damage ?? 0) * Math.max(1, card.hits), 0) } : {},
    ...beltIds.has("LIQUID_MEMORIES") ? { discardPick: pickFrom("discard", true) } : {},
    ...beltIds.has("DROPLET_OF_PRECOGNITION") ? { drawPick: pickFrom("draw", false) } : {},
    // Drawn from the draw pile, or the discard pile reshuffled when it is empty; the deck less the hand when the state
    // has neither pile. Both known and empty: nothing to draw (pilesEmpty).
    ...drawSlot !== void 0 ? (() => {
      const draw = pileCardModels(state, env.knowledge, "draw", pileContext);
      const discard = pileCardModels(state, env.knowledge, "discard", pileContext);
      const unknown = drawablePileSize(state.raw) === void 0;
      const pool = draw.length > 0 ? draw : discard.length > 0 ? discard : unknown ? deckDrawPool(state, env.knowledge, pileContext, hand) : [];
      return { expectedDraw: expectedDraw(pool, drawSlot), ...!unknown && pool.length === 0 ? { pilesEmpty: true } : {} };
    })() : {}
  };
  const mcSources = /* @__PURE__ */ new Map();
  for (const potion of potionsAll) {
    const plainSource = randomPotionSource(potion, state, env.knowledge, pileContext, noDraw);
    const source = plainSource && knownTop && plainSource.kind === "draw" ? { ...plainSource, knownTop: knownTop.indices, ...knownTop.added.length > 0 ? { knownAdded: knownTop.added } : {} } : plainSource;
    const cost = costs.get(potion.potion_id)?.hp ?? 0;
    if (source) mcSources.set(potion.slot, cost > 0 ? { ...source, cost } : source);
  }
  const modelledIds = new Set(
    potionsAll.filter((potion) => !mcSources.has(potion.slot) && modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionContext) !== null).map((potion) => potion.potion_id)
  );
  const isModelledPotion = (potionId) => modelledIds.has(potionId);
  let solvedInput = null;
  const solve = () => solveTurn(solvedInput = {
    hand: [
      ...hand,
      ...potionsAll.filter((potion) => !mcSources.has(potion.slot)).map(
        (potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionContext)
      ).filter((card) => card !== null).map((card) => withPotionCost(noDraw ? { ...card, draw: 0, drawsUntil: false } : card, costs))
    ],
    player: playerSim,
    enemies,
    fightKind: kind,
    ...continuation ? { continuationValue: continuation.value } : {},
    turn: state.turn ?? 1,
    cardsPlayedThisTurn: num(player["cards_played_this_turn"]),
    raceEruption,
    wither,
    ...focusInput,
    // Distinct payoff cards, not copies (VHLZ F21: two Bully doubled Bash+'s weight, 16.5 vs 7.5).
    vulnerablePayoffs: new Set(asArray(asRecord(state.run?.raw)["deck"]).map((card) => str(asRecord(card)["card_id"])).filter((id) => VULNERABLE_PAYOFFS.has(id))).size,
    drawPile,
    // SL_RETRY_KNOWN_INSERTS: with cards added at random places the next draws are not certain: the solver draws as before.
    ...knownTop && knownTop.added.length === 0 ? { knownTop: knownTop.cards } : {},
    ...nextIncoming > 0 ? { nextIncoming } : {},
    ...laterIncoming ? { laterIncoming } : {}
  });
  const solveStart = performance.now();
  const solved = solve();
  const solveMs = performance.now() - solveStart;
  if (thiefTrace.enabled) thiefTrace.last = { plans: solved.plans, surviving: [], shown: [], rollout: null, thieves: [], lastTurnLine: null, rolloutLine: null };
  const dryBest = solved.plans.find((plan) => !drinksPotion(plan) && !plan.outcome.dies) ?? solved.plans.find((plan) => !drinksPotion(plan)) ?? null;
  let mcResults = null;
  const slCompute = env.sl?.compute;
  const randomPotions = () => mcResults ??= runRandomPotions([...mcSources.values()], solvedInput, dryBest, `${fightKey(state)}:${state.turn ?? "?"}:${handSignature(hand)}`, slCompute ? { samples: slCompute.mcSamples, budgetMs: slCompute.mcBudgetMs } : {});
  const minLossAfter = (plans) => Math.max(...plans.map((plan) => plan.outcome.hpAfter));
  const costly = solved.plans.length > 0 && playerSim.maxHp > 0 && (playerSim.hp - minLossAfter(solved.plans) >= playerSim.hp * 0.3 || minLossAfter(solved.plans) < playerSim.maxHp * 0.25);
  const drinksKeptPotion = (plan) => fightPlan !== null && plan.steps.some((step) => {
    const use = step.cardId.startsWith("POTION:") ? fightPlan.potions[step.cardId.split(":")[1] ?? ""] : void 0;
    return use === "save" || use === "emergency" || use === "big_hit" && !bigHit && !pressed;
  });
  const best = solved.plans[0];
  if (!best) return planCombat(env);
  const endNow = solved.plans.find((plan) => plan.steps.length === 0);
  const modSaysLethal = bool(combat["end_turn_will_kill_player"]);
  const calcNote = endTurnLethalNote(endNow, modSaysLethal, playerSim.hp);
  let allDie = null;
  if (best.outcome.dies) {
    const fightId3 = fightKey(state);
    if (relicIds.includes("PAELS_EYE") && num(player["cards_played_this_turn"]) === 0 && env.screenMemory.paelsEyeFight !== fightId3) {
      env.screenMemory.paelsEyeFight = fightId3;
      return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "every line dies: ending the turn with no card played for Pael's Eye's extra turn" };
    }
    const potionsNow = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use && !isModelledPotion(potion.potion_id) && !mcSources.has(potion.slot));
    const randomLives = mcSources.size > 0 && randomPotions().some((mc) => mc.plans.some((plan) => plan !== null && !plan.outcome.dies));
    if (potionsNow.length > 0 && !randomLives) return planCombat(env);
    if (randomLives) allDie = leastLossPlan(solved.plans, hand, playerSim.hp);
  }
  if (best.outcome.dies && allDie === null) {
    const leastLoss = leastLossPlan(solved.plans, hand, playerSim.hp);
    const drawing = leastLoss.steps[0] !== void 0 && hand.some((card) => card.index === leastLoss.steps[0].cardIndex && drawsCards(card));
    commit(env, state.turn, leastLoss, hand, "code");
    const decision = {
      kind: "act",
      label: "combat/least-loss",
      intent: firstIntent(leastLoss, hand, env),
      rationale: drawing ? `every simulated line dies; drawing first for a kill or block the hand does not have (then re-planning), on the most-damage line (dmg ${leastLoss.outcome.damageDealt}): ${leastLoss.steps.map(stepText).join(", ")}` : `every simulated line dies; playing the one that keeps the most HP (${leastLoss.outcome.hpAfter}): ${leastLoss.steps.map(stepText).join(", ") || "end turn"}`
    };
    const boundInput = solvedInput;
    noteLeastLoss(
      decision,
      () => leastLossFactsFor(leastLoss, solved, solvedInput, knownTop, env.sl?.knownDraws?.exact, hand, playerSim, [...mcSources.values()], randomTargets(state)),
      boundInput ? () => anyDrawBound({ input: boundInput, state, knowledge: env.knowledge, pileContext, targets: randomTargets(state), noDraw, relicIds, randomPotions: [...mcSources.values()] }) : void 0
    );
    return decision;
  }
  const planOffer = (potionId) => planOffersPotion(fightPlan, potionId, { turn: state.turn ?? 1, bigHit, pressed, costly, offensive: notBlunting(potionId) });
  const potions = potionsAll.filter(
    (potion) => !isModelledPotion(potion.potion_id) && !mcSources.has(potion.slot) && (!potion.requires_target || potion.valid_targets.length > 0)
  );
  const planPotionNow = potions.some((potion) => planOffer(potion.potion_id) === true);
  const dangerous = best.outcome.hpLoss >= Math.max(12, playerSim.hp * 0.4) || kind !== "monster" && kind !== "unknown" && best.outcome.hpLoss >= 10;
  const lethalLines = best.outcome.winsFight ? solved.plans.filter((plan) => plan.outcome.winsFight) : [];
  const dryLethal = lethalLines.find((plan) => !drinksPotion(plan));
  if (dryLethal) {
    commit(env, state.turn, dryLethal, hand, "code");
    return { kind: "act", label: "combat/lethal", intent: firstIntent(dryLethal, hand, env), rationale: `lethal: ${dryLethal.steps.map(stepText).join(", ")}${calcNote}` };
  }
  const potionLethal = potionLethalLines(lethalLines);
  const surviving = allDie ? [allDie] : hardRuleLines(solved.plans.filter((plan) => !plan.outcome.dies), enemies);
  const options = withPotionLines(distinctPlans(surviving, MAX_OPTIONS), surviving, potionsAll.filter((potion) => isModelledPotion(potion.potion_id)).map((potion) => potion.potion_id), MAX_OPTIONS);
  for (const line of potionLethal) if (!options.includes(line)) options.push(line);
  const drySurvives = surviving.some((plan) => !drinksPotion(plan));
  const top = options.includes(best) ? best : options.find((plan) => dominates(plan, best)) ?? options[0] ?? best;
  if (modSaysLethal && top.steps.length === 0 && allDie === null && top.outcome.revived === void 0) {
    const anyPlayed = surviving.filter((plan) => plan.steps.length > 0);
    const dryPlayed = anyPlayed.filter((plan) => !drinksPotion(plan));
    const played = dryPlayed.length > 0 ? dryPlayed : anyPlayed;
    if (played.length > 0) {
      const safest = played.reduce((a, b) => b.outcome.hpAfter > a.outcome.hpAfter || b.outcome.hpAfter === a.outcome.hpAfter && b.outcome.blockGained > a.outcome.blockGained ? b : a);
      commit(env, state.turn, safest, hand, "code");
      return {
        kind: "act",
        label: "combat/mod-lethal",
        intent: firstIntent(safest, hand, env),
        rationale: `mod says ending the turn is lethal, solver disagrees; not ending it: ${safest.steps.map(stepText).join(", ")}${calcNote}`
      };
    }
  }
  const setupStep = (step) => fightPlan === null ? (kind === "elite" || kind === "boss") && cardFor(step, hand)?.type === "Power" : fightPlan.setup.includes(step.cardId) && !(() => {
    const model2 = cardFor(step, hand);
    return model2 !== void 0 && model2 !== null && model2.type === "Attack" && model2.vulnerable === 0 && model2.weak === 0 && step.cardId !== "MOLTEN_FIST" && step.cardId !== "DOMINATE";
  })() && !((step.cardId === "MOLTEN_FIST" || step.cardId === "DOMINATE") && (enemies.find((enemy) => enemy.index === step.target)?.vulnerable ?? 0) === 0);
  const actNumber = Number(str(asRecord(state.run?.raw)["act_id"]) || 0) + 1;
  const hallwayGuard = (kind === "monster" || kind === "unknown") && (actNumber >= 2 || (state.run?.ascension ?? 0) >= 5) && playerSim.hp < playerSim.maxHp * 0.6;
  const hallwayGuardSlack = hpGuardSlack(playerSim.hp, "monster");
  const setupCount = (plan) => new Set(plan.steps.filter(setupStep).map((step) => step.cardId)).size;
  const laterPhases = (enemy) => !enemy.revives ? 0 : laterPhaseHps(enemy.maxHp, state.run?.ascension ?? 0).reduce((sum, hp) => sum + hp, 0);
  const bossHpLeft = enemies.filter((enemy) => !enemy.minion).reduce((sum, enemy) => sum + enemy.hp + laterPhases(enemy), 0);
  const realDamage = (plan) => enemies.filter((enemy) => !enemy.minion && !enemy.illusion).reduce((sum, enemy) => sum + Math.max(0, enemy.hp - Math.max(0, plan.outcome.enemyHpAfter.find((after) => after.index === enemy.index)?.hp ?? enemy.hp)), 0);
  const winsRace = (picked, replacement) => {
    const illusionFight = enemies.some((enemy) => enemy.illusion);
    if (kind !== "boss" && kind !== "elite" && !illusionFight || replacement === null) return false;
    const extraLoss = guardLoss(picked) - guardLoss(replacement);
    const extraDamage = illusionFight ? realDamage(picked) - realDamage(replacement) : picked.outcome.damageDealt - replacement.outcome.damageDealt;
    return extraLoss > 0 && extraDamage > 0 && extraDamage / extraLoss >= bossHpLeft / Math.max(1, playerSim.hp) && picked.outcome.hpAfter >= nextIncoming + 5;
  };
  const guardKeepsSetup = (picked, replacement, deathsOf = () => null) => winsRace(picked, replacement) || replacement !== null && setupKept(
    { setups: setupCount(picked), hpAfter: picked.outcome.hpAfter, deaths: deathsOf(picked) },
    { setups: setupCount(replacement), deaths: deathsOf(replacement) },
    { kind, maxHp: playerSim.maxHp, nextIncoming, bigHit }
  );
  const maxHpNow = enemies.filter((enemy) => !enemy.minion && enemy.hp > 0).reduce((sum, enemy) => sum + enemy.maxHp, 0);
  const fightId2 = fightKey(state);
  if (!env.screenMemory.fightStart || env.screenMemory.fightStart.fight !== fightId2) env.screenMemory.fightStart = { fight: fightId2, maxHp: maxHpNow };
  const laterPhase = maxHpNow > env.screenMemory.fightStart.maxHp;
  const setupLine = (
    // Hallway fights set up only when the plan says so (MX1Q F23 T2: Inflame lines at 24/26 damage over
    // 44/54 at the same HP, pulled in as "planned setup" against a Chomper pair).
    fightPlan && fightPlan.setup.length > 0 && (state.turn ?? 1) <= 3 && !laterPhase && (kind === "elite" || kind === "boss" || fightPlan.approach === "setup") ? surviving.filter((plan) => setupCount(plan) > setupCount(top)).sort((a, b) => setupCount(b) - setupCount(a) || b.score - a.score)[0] : void 0
  );
  const setupClose = setupLine !== void 0 && effectiveLoss(setupLine) <= effectiveLoss(top) + hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env));
  if (setupClose && !options.includes(setupLine)) options.push(setupLine);
  const stopLine = lineEnded !== null && top.steps.length > 0 && endNow !== void 0 && surviving.includes(endNow) ? endNow : null;
  if (stopLine && !options.includes(stopLine)) options.push(stopLine);
  const thiefOn = env.thiefFacts !== false;
  let thieves = [];
  let thiefKill = null;
  let thiefFailed = false;
  if (thiefOn && allDie === null) {
    try {
      thieves = thievesOf(state, env.screenMemory, new Map(enemies.map((enemy) => [enemy.index, enemy.name])));
      thiefKill = thieves.length > 0 ? lastTurnKillLine(surviving, options, thieves, drinksPotion) : null;
    } catch {
      thieves = [];
      thiefKill = null;
      thiefFailed = true;
    }
  }
  if (env.thiefCost === true && thieves.length > 0) {
    try {
      thieves = withLoot(thieves, state, env.screenMemory.thiefCardValue);
    } catch {
      thieves = thieves.map(({ loot: _loot, ...thief }) => thief);
    }
  }
  const lootOn = () => thieves.some((thief) => (thief.loot?.hp ?? 0) > 0);
  if (thiefKill && !options.includes(thiefKill)) options.push(thiefKill);
  const second = options.find((plan) => plan !== top);
  const groups = allDie === null && targetOptions.enabled ? killGroups(combat, enemies) : [];
  const focusOf = /* @__PURE__ */ new Map();
  if (groups.length >= 2) {
    for (const [group, line] of focusLines(surviving, groups, enemies)) focusOf.set(line, [...focusOf.get(line) ?? [], groupName(group)]);
  }
  const beatsOnTargets = (a, b) => groups.length < 2 || groups.every((group) => damageInto(a, group.indices, enemies) >= damageInto(b, group.indices, enemies));
  let avoidsTop = false;
  const avoidOf = env.sl?.explore?.avoid;
  const endsTried = (plan) => {
    try {
      return avoidOf !== void 0 && triedHas(avoidOf.tried, { text: "", ...turnKeys(env.sl?.explore?.played, plan.steps) });
    } catch {
      return false;
    }
  };
  const avoidWhole = avoidOf !== void 0 && env.sl?.explore?.whole === true;
  const avoidFailReason = (line) => {
    const others = surviving.filter((plan) => plan !== line);
    if (others.length === 0) return solved.plans.some((plan) => plan !== line) ? "every other line dies this turn" : "nothing else can be played this turn";
    if (others.every(endsTried)) return "every other line that survives this turn ends it as a failed attempt's too";
    return "every other line that survives this turn and ends it otherwise drinks a potion this one does not";
  };
  if (avoidOf && env.sl?.explore?.played && endsTried(top)) {
    const anyDrink = env.sl.explore.bossPotions === true && kind === "boss";
    const topPotions = potionIdsOf(top);
    const keepsOff = (plan) => plan !== top && !plan.outcome.dies && (anyDrink || potionIdsOf(plan).every((id) => topPotions.includes(id))) && !endsTried(plan);
    avoidsTop = options.some(keepsOff);
    if (!avoidsTop && avoidWhole) {
      const other = surviving.find(keepsOff);
      if (other) {
        options.push(other);
        avoidsTop = true;
      }
    }
  }
  const clear = (!second || options.every((plan) => plan === top || dominates(top, plan))) && [...options, ...focusOf.keys()].every((plan) => plan === top || beatsOnTargets(top, plan)) && !setupClose && !(drySurvives && drinksPotion(top)) && potionLethal.length === 0 && stopLine === null && !avoidsTop;
  const mcForces = mcSources.size > 0 && randomPotions().some((mc) => mc.beats > 0);
  if (clear && !mcForces && potions.length === 0) {
    const autoGuardLines = surviving.filter((plan) => !drinksKeptPotion(plan) && (!drySurvives || !drinksPotion(plan)));
    const autoLootOk = (plan) => !lootOn() || lootSwapOk(top, plan, (line) => lastTurnLoot(line, thieves));
    let guarded = (kind === "elite" || kind === "boss") && !top.outcome.winsFight ? hpGuardReplacement(top, autoGuardLines, playerSim.hp, hpGuardSlack(playerSim.hp, kind, hpGuardExtra(env)), autoLootOk) : hallwayGuard && !top.outcome.winsFight ? hpGuardReplacement(top, autoGuardLines, playerSim.hp, hallwayGuardSlack, autoLootOk) : null;
    if (guarded && guardKeepsSetup(top, guarded)) guarded = null;
    if (raceEruption) guarded = null;
    if (guarded && avoidOf && endsTried(guarded) && !endsTried(top)) guarded = null;
    const codeLine = guarded ?? top;
    if (avoidWhole && endsTried(codeLine)) slAvoidFailed = { plan: codeLine, reason: avoidFailReason(codeLine) };
    const replay2 = env.sl?.explore?.replay;
    if (replay2?.code === true && replay2.plays && solvedInput && !codeLine.outcome.winsFight) {
      try {
        const logged = lineText(codeLine.steps) === replay2.line ? null : loggedLine(solvedInput, replay2.plays);
        if (logged && !(logged.outcome.dies && !codeLine.outcome.dies)) {
          const plays = replay2.plays.length > 0 ? replay2.plays.join(", ") : "end turn";
          const at2 = replay2.point.split(",")[0];
          const reason = `code's own line (${lineText(codeLine.steps)}) is not attempt ${replay2.reference}'s here: its plays from this board (${plays}), replayed to reach ${at2}`;
          slReplayedCode = { plan: logged, reason, log: { point: replay2.point, reference: replay2.reference, line: replay2.line, original: lineText(codeLine.steps), overridden: true, reason, logged: true, code: true, plays: [...replay2.plays] } };
          commit(env, state.turn, logged, hand, "code");
          return {
            kind: "act",
            label: "combat/plan",
            intent: firstIntent(logged, hand, env),
            rationale: `SL explore: replaying attempt ${replay2.reference}'s plays from this board, ${lineText(logged.steps)}, instead of code's ${lineText(codeLine.steps)} before ${at2}${calcNote}`
          };
        }
      } catch {
      }
    }
    if (guarded) {
      commit(env, state.turn, guarded, hand, "code");
      return {
        kind: "act",
        label: "combat/plan-guarded",
        intent: firstIntent(guarded, hand, env),
        rationale: `${guardedText(top, guarded)}${calcNote}`
      };
    }
    commit(env, state.turn, top, hand, "code");
    const margin = second ? "dominates every other line" : surviving.length === 1 ? "only line" : top === best ? "only distinct line" : "dominates the score-best line";
    return {
      kind: "act",
      label: "combat/plan",
      intent: firstIntent(top, hand, env),
      rationale: `code plan (${margin}): ${top.steps.length ? top.steps.map(stepText).join(", ") : "end turn"}; ${hpText(top.outcome.hpLoss)}, dmg ${top.outcome.damageDealt}${calcNote}`
    };
  }
  const focusDamage = (plan) => {
    if (focusIndex === null) return null;
    const before = enemies.find((enemy) => enemy.index === focusIndex);
    const after = plan.outcome.enemyHpAfter.find((entry) => entry.index === focusIndex);
    return before && after ? Math.max(0, before.hp - after.hp) : null;
  };
  const fitOf = (plan) => fightPlan ? { fight_plan_fit: planFit(fightPlan, plan.steps, focusDamage(plan)) } : {};
  for (const line of focusOf.keys()) if (!options.includes(line)) options.push(line);
  const kill = killOrders(groups);
  const focusNote = (plan) => focusOf.has(plan) ? { focus: focusOf.get(plan).join(", ") } : {};
  const mcShown = mcSources.size > 0 ? randomPotions() : [];
  const mcMedians = mcShown.map((mc) => mc.median).filter((plan) => plan !== null);
  const rolloutSolver = solvedInput === null ? null : {
    ...solvedInput,
    hand: [
      ...solvedInput.hand,
      ...potionsAll.filter((potion) => mcSources.has(potion.slot)).map((potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionContext)).filter((card) => card !== null).map((card) => withPotionCost(card, costs))
    ]
  };
  const retryTurn = slCompute ? `${fightKey(state)}:${env.sl?.attempt ?? "?"}:${state.turn ?? "?"}` : null;
  const retrySpent = retryTurn !== null && env.screenMemory.slRetryCompute?.turn === retryTurn ? env.screenMemory.slRetryCompute.spentMs : 0;
  const retryBudgetMs = slCompute ? Math.max(rolloutLiveOptions.budgetMs, Math.min(slCompute.rolloutBudgetMs, slCompute.turnBudgetMs - retrySpent)) : rolloutLiveOptions.budgetMs;
  const costsOn = potionCostOptions.enabled && potionsAll.length > 0;
  const computeMemo = env.sl ? computeMemoFor(`${String(state.raw["run_id"] ?? "")}:${fightKey(state)}`) : null;
  if (!env.sl) dropComputeMemo();
  const noPotionBase = costsOn && kind !== "boss" && allDie === null ? options.find((plan) => !drinksPotion(plan)) : void 0;
  const noPotionCopy = noPotionBase ? { ...noPotionBase } : void 0;
  const runRollout = (escapes) => rolloutLiveOptions.enabled && rolloutSolver !== null ? liveRollout({
    state,
    knowledge: env.knowledge,
    memory: env.screenMemory,
    solver: rolloutSolver,
    plans: surviving,
    shown: [...options, ...mcMedians, ...noPotionCopy ? [noPotionCopy] : []],
    piles: rolloutPiles(state, env.knowledge, enemyTargets),
    ...knownTop ? { drawTop: knownTop.indices, ...knownTop.added.length > 0 ? { drawAdded: knownTop.added } : {} } : {},
    ...slCompute ? { samples: slCompute.rolloutSamples, budgetMs: retryBudgetMs } : {},
    spentMs: mcShown.reduce((sum, mc) => sum + mc.ms, 0),
    orders: kill.orders,
    ordersDropped: kill.dropped,
    ...noPotionBase && noPotionCopy ? { noPotion: { line: noPotionCopy, base: noPotionBase } } : {},
    // THIEF_FACTS: an enemy whose Escape / Flee resolves leaves the rollout's fight; the loot back or gone per sample.
    ...escapes ? { thieves } : {},
    // SANDPIT_START: the Sandpit the Insatiable's Liquify Ground starts, in the later turns too (absent: rollout-live's default).
    ...env.sandpitStart !== void 0 ? { sandpitStart: env.sandpitStart } : {},
    ...computeMemo ? { memo: computeMemo } : {}
  }) : null;
  let rollout = runRollout(thiefOn && !thiefFailed);
  const rolloutCharged = (r) => (r?.elapsedMs ?? 0) + (r?.available && r.memo ? r.memo.ms : 0);
  if (retryTurn !== null) env.screenMemory.slRetryCompute = { turn: retryTurn, spentMs: retrySpent + mcShown.reduce((sum, mc) => sum + mc.ms, 0) + rolloutCharged(rollout) };
  if (thiefOn && !thiefFailed && rollout !== null && !rollout.available && rollout.reason.startsWith("error")) {
    thieves = [];
    thiefFailed = true;
    rollout = runRollout(false);
  }
  let thiefRollout = null;
  let thiefKept = [];
  let thiefFacts = /* @__PURE__ */ new Map();
  let thiefContext = null;
  if (thieves.length > 0) {
    try {
      const rolled = rollout?.available ? rollout : null;
      thiefRollout = rolled ? rolloutKillLine(rolled.result.lines, (line) => line.plan !== noPotionCopy && (options.includes(line.plan) || !drinksPotion(line.plan)), options, thieves) : null;
      thiefKept = [shownKillLine(thiefRollout && !options.includes(thiefRollout) ? [...options, thiefRollout] : options, thieves), thiefRollout].filter((plan) => plan !== null);
      for (const plan of /* @__PURE__ */ new Set([...options, ...thiefRollout ? [thiefRollout] : [], ...mcMedians, ...rolled ? rolled.result.lines.map((line) => line.plan) : []])) {
        const line = rolled?.byPlan.get(plan);
        const lostOf = (thief) => line?.thiefLost && line.thiefLost[thiefTag(thief)] !== void 0 ? { lost: line.thiefLost[thiefTag(thief)], samples: line.samples } : null;
        thiefFacts.set(plan, thiefFact(plan, thieves, (thief) => thiefSamples(line, thief), state.turn ?? null, void 0, lostOf));
      }
      thiefContext = thiefContextJson(thieves, state.turn ?? null);
    } catch {
      thieves = [];
      thiefFailed = true;
      thiefRollout = null;
      thiefKept = [];
      thiefFacts = /* @__PURE__ */ new Map();
      thiefContext = null;
      rollout = runRollout(false);
    }
  }
  const thiefRolloutAdded = thiefRollout !== null && !options.includes(thiefRollout);
  if (thiefRollout && thiefRolloutAdded) options.push(thiefRollout);
  const noPotionRolled = rollout?.available ? rollout.noPotion : null;
  const noPotionOwn = noPotionRolled && !noPotionRolled.merged ? noPotionRolled.line : null;
  const rolloutTiedAll = rollout?.available ? rollout.tied : [];
  const rolloutBest = rollout?.available ? rollout.best : null;
  const rolloutBestIsPotion = rolloutBest !== null && mcMedians.includes(rolloutBest);
  const offerPotions = potions.length > 0;
  const unsimulatedKeys = offerPotions ? potions.reduce((sum, potion) => sum + (potion.requires_target ? Math.min(2, potion.valid_targets.length) : 1), 0) : 0;
  const keep2 = /* @__PURE__ */ new Set([top, ...potionLethal, ...setupClose && setupLine ? [setupLine] : [], ...focusOf.keys(), ...noPotionBase ? [noPotionBase] : [], ...thiefKept]);
  const planOptions = trimForPotionOptions(options, mcShown.length + unsimulatedKeys + (noPotionOwn ? 1 : 0), keep2);
  options.splice(0, options.length, ...planOptions);
  const shown = [...options, ...noPotionOwn ? [noPotionOwn] : [], ...rolloutBest && !rolloutBestIsPotion && !options.includes(rolloutBest) && rolloutBest !== noPotionOwn ? [rolloutBest] : []];
  if (kind !== "boss") releaseBossLinesPool();
  const lowTrustSkipped = bossLinesOptions.lowTrust === "retry" && kind === "boss" && env.sl?.showSim !== true && lowTrustOfState(state) !== null;
  const bossPiles = kind === "boss" && bossLinesOptions.enabled && !lowTrustSkipped && rolloutSolver !== null ? rolloutPiles(state, env.knowledge, enemyTargets) : null;
  const bossSim = kind === "boss" && bossLinesOptions.enabled && rolloutSolver !== null ? lowTrustSkipped ? { available: false, reason: `low-trust boss (${lowTrustOfState(state)}): simulated on SL retries only (BOSS_SIM_LOW_TRUST=retry)`, ms: 0 } : bossPiles ? bossLineSim({
    state,
    knowledge: env.knowledge,
    memory: env.screenMemory,
    solver: rolloutSolver,
    piles: knownTop ? { ...bossPiles, drawTop: knownTop.indices, ...knownTop.added.length > 0 ? { drawAdded: knownTop.added } : {} } : bossPiles,
    randomPotions: [...mcSources.values()],
    lines: [...shown, ...mcMedians],
    turn: state.turn ?? null,
    drinks: drinksPotion,
    ...slCompute ? { samples: slCompute.bossSimSamples } : {},
    ...computeMemo ? { memo: computeMemo } : {}
  }) : { available: false, reason: "no draw/discard piles in the state", ms: 0 } : null;
  const simRanks = bossSim?.available && !bossSim.lowTrust ? bossSim : null;
  const slLowTrustSim = env.sl?.showSim === true && bossSim?.available === true && bossSim.lowTrust !== null ? bossSim.lowTrust : null;
  const simShown = bossSim !== null && ((bossSim.available ? bossSim.lowTrust : lowTrustOfState(state)) === null || slLowTrustSim !== null);
  const simFact = (plan) => {
    const line = simShown && bossSim?.available ? bossSim.byPlan.get(plan) : void 0;
    return line ? { whole_fight_sim: line.text } : {};
  };
  const costNote = (plan) => costsOn ? { potion_cost: potionCostFact(plan, rollout?.available ? rollout.byPlan.get(plan) ?? null : null, costs) } : {};
  const thiefNote = (plan) => thiefFacts.has(plan) ? { thief: thiefFacts.get(plan) } : {};
  const noPotionNote = (plan) => {
    if (noPotionOwn && plan === noPotionOwn) {
      const base = noPotionRolled.base;
      const at2 = shown.indexOf(base);
      return { no_potion_fight: `the no-potion line: the same turn as ${at2 >= 0 ? `plan${at2 + 1}` : lineLabel(base)}, and no potion for the rest of this fight (its rollout's later turns drink none${at2 >= 0 ? `; plan${at2 + 1}'s may` : ""})` };
    }
    if (noPotionBase && plan === noPotionBase && !noPotionOwn) {
      return { no_potion_fight: noPotionRolled ? "the no-potion line: no potion this turn, and the rollout's later turns drink none either" : "the no-potion line: no potion this turn (no rollout of the later turns)" };
    }
    return {};
  };
  const shownOrder = (plan) => shown.includes(plan) ? shown.indexOf(plan) : shown.length + mcMedians.indexOf(plan);
  const rolloutTied = (simRanks ? simRanks.tied : rolloutTiedAll).filter((plan) => shown.includes(plan) || mcMedians.includes(plan)).sort((a, b) => shownOrder(a) - shownOrder(b));
  const mcKey = (mc) => potionsAll.find((potion) => potion.slot === mc.source.slot)?.key ?? `p${mc.source.slot}`;
  const keyOfShown = (plan) => mcMedians.includes(plan) ? mcKey(mcShown.find((mc) => mc.median === plan)) : `plan${shown.indexOf(plan) + 1}`;
  const tiedKeys = rolloutTied.length >= 2 ? rolloutTied.map(keyOfShown) : [];
  const bestShown = rolloutTied.length === 1 ? rolloutTied[0] : simRanks ? simRanks.best : rolloutBest;
  const bestShownIsPotion = bestShown !== null && mcMedians.includes(bestShown);
  const tieNote = (plan) => {
    if (tiedKeys.length === 0 || !rolloutTied.includes(plan)) return {};
    const others = tiedKeys.filter((key) => key !== keyOfShown(plan));
    if (simRanks) return { rollout_tied: `tied for the best whole-fight simulation numbers with ${others.join(", ")} (the same simulated win rate and HP lost when won); the ranking picks none of them` };
    const same = rollout?.available && rollout.saturated ? "every line loses all our HP; the same deaths, enemy HP left, turns alive and HP lost this turn" : "the same expected further HP loss, deaths and win chance";
    return { rollout_tied: `tied for the best rollout numbers with ${others.join(", ")} (${same}); the rollout picks none of them` };
  };
  const phaseFacts = silentPhaseReference(state, shown.map((plan, index) => ({ key: `plan${index + 1}`, plan })));
  const lossFacts = silentLossReference(state, shown.map((plan, index) => ({ key: `plan${index + 1}`, plan })), rolloutTied);
  const factsOf = (plan) => ({
    ...rollout ? { ...rolloutFacts(plan, rollout), ...plan === bestShown ? { rollout_best: true } : {}, ...tieNote(plan) } : {},
    ...simFact(plan),
    ...phaseFacts.get(plan),
    ...lossFacts.get(plan)
  });
  const criteria = {};
  const byKey = /* @__PURE__ */ new Map();
  shown.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify({ ...focusNote(plan), ...describePlan(plan, playerSim.maxHp), ...potionLethalNote(plan), ...noEffectNote(plan, surviving), ...noPotionNote(plan), ...fitOf(plan), ...factsOf(plan), ...costNote(plan), ...thiefNote(plan) });
    byKey.set(key, { plan, label: `${focusOf.has(plan) ? `focus: ${focusOf.get(plan).join(", ")} \u2014 ` : ""}${plan.steps.map(stepText).join(", ") || "end turn"}${plan === noPotionOwn ? " \u2014 no potion this fight" : ""}` });
  });
  const rolloutRecord = rollout ? rolloutLog(rollout, bestShown ? keyOfShown(bestShown) : null, bestShown !== null && !bestShownIsPotion && !options.includes(bestShown) && bestShown !== noPotionOwn, tiedKeys, noPotionRolled ? shown.includes(noPotionOwn ?? noPotionRolled.base) ? keyOfShown(noPotionOwn ?? noPotionRolled.base) : null : null) : null;
  const othersHeld = potionsAll.length > 1;
  for (const mc of mcShown) {
    const key = mcKey(mc);
    const rolled = rollout && mc.median ? rolloutFacts(mc.median, rollout) : null;
    const facts = {
      ...rolled ? { ...rolled, rollout: `the median sample's line: ${String(rolled["rollout"])}`, ...mc.median === bestShown ? { rollout_best: true } : {}, ...mc.median ? tieNote(mc.median) : {} } : {},
      ...mc.median ? simFact(mc.median) : {}
    };
    const mcCost = !costsOn ? {} : mc.median ? { potion_cost: potionCostFact(mc.median, rollout?.available ? rollout.byPlan.get(mc.median) ?? null : null, costs) } : { potion_cost: `drinking it costs ${costs.get(mc.source.potionId) ? potionCostText(costs.get(mc.source.potionId)) : "0 (no conversion value in the potion table)"}` };
    criteria[key] = JSON.stringify({ ...potionMcCriteria(mc, dryBest, lineLabel, othersHeld), ...facts, ...mcCost, ...mc.median ? thiefNote(mc.median) : {} });
    byKey.set(key, { potion: { action: "use_potion", option_index: mc.source.slot }, label: `drink ${mc.source.name}, then re-plan` });
  }
  if (offerPotions) {
    for (const potion of potions) {
      const targets = potion.requires_target ? potion.valid_targets : [null];
      for (const target of targets.slice(0, 2)) {
        const key = target === null ? potion.key : `${potion.key}->e${target}`;
        const enemyName = target === null ? null : enemies.find((enemy) => enemy.index === target)?.name ?? `enemy ${target}`;
        const keptBy = planOffer(potion.potion_id) === false ? fightPlan?.potions[potion.potion_id] : void 0;
        const brewGives = potion.potion_id === "ENTROPIC_BREW" ? entropicBrewPotions(state) : null;
        criteria[key] = JSON.stringify({
          plays: brewGives !== null ? `drink ${potion.name} first: ${potion.text} (${brewGives} random potion${brewGives === 1 ? "" : "s"}: its own slot and the ${brewGives - 1} empty one${brewGives === 2 ? "" : "s"}), then re-plan the turn with them` : `drink ${potion.name}${enemyName ? ` on ${enemyName}` : ""} first: ${potion.text}; effect not simulated, then re-plan the turn`,
          simulated: brewGives !== null ? "not this turn: which potions it gives is random, so no HP or damage numbers until they are in hand (the re-planned turn simulates them)" : "no: this potion's effect is not simulated, so no HP or damage numbers for it",
          offered: UNSIMULATED_OFFERED,
          note: `the cheapest card plan alone: ${hpText(Math.min(...options.map((plan) => plan.outcome.hpLoss)))} this turn`,
          ...keptBy ? { fight_plan: `keeps it (${keptBy})` } : planOffer(potion.potion_id) === true ? { fight_plan: "says now" } : {},
          ...costsOn ? { potion_cost: `drinking it costs ${costs.get(potion.potion_id) ? potionCostText(costs.get(potion.potion_id)) : "0 (no conversion value in the potion table)"}` } : {},
          ...rollout ? { rollout: brewGives !== null ? "not rolled out: the potions it gives are random; the turn is re-planned with them after drinking" : DRINK_FIRST_ROLLOUT } : {}
        });
        byKey.set(key, {
          potion: target === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: target },
          label: `drink ${potion.name}`
        });
      }
    }
  }
  const deepseekPlan = deepseekPlanLine(env);
  const lessons = fightLessons(state);
  const questionState = {
    run_brief: briefJson(env.brief),
    fight: kind,
    situation: {
      turn: state.turn,
      hp: `${playerSim.hp}/${playerSim.maxHp}`,
      block: playerSim.block,
      energy: playerSim.energy,
      incoming_if_i_do_nothing: endNow?.outcome.incomingAfterBlock ?? null
    },
    player: playerJson(player, env.knowledge),
    enemies: asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false).map((enemy, i, living) => ({
      // The names the options use (distinctNames: same-named enemies told apart).
      name: distinctNames(living.map((other) => ({ name: str(other["name"], str(other["enemy_id"])), id: str(other["enemy_id"]) })))[i],
      hp: `${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`,
      block: num(enemy["block"]),
      intents: asArray(enemy["intents"]).map((intent) => `${str(asRecord(intent)["intent_type"])} ${str(asRecord(intent)["label"])}`).join(", "),
      // Id and amount, the game's name and description (46 of 62 logged enemy powers reached Jev as a bare
      // id), then code's note where the id alone misleads (POWER_NOTES).
      powers: asArray(enemy["powers"]).map((entry) => {
        const power = asRecord(entry);
        const sim = enemies.find((other) => other.index === (numOrNull(enemy["index"]) ?? i));
        return `${enemyPowerText(power, env.knowledge)}${POWER_NOTES[str(power["power_id"])] ?? ""}${stripStunNote(sim, str(power["power_id"]), mechRules)}${moveRuleNote(sim, str(power["power_id"]))}${backAttackPairNote(env, str(power["power_id"]), living.length)}`;
      }),
      // MECH_DEATH_MOVE: what an ally's death does to its move, as the logs show it (none with the switch off).
      .../* @__PURE__ */ ((note) => note ? { observed: note } : {})(deathRuleNote(enemies.find((other) => other.index === (numOrNull(enemy["index"]) ?? i)))),
      // Powers the solver does not model: the options' damage into this enemy is counted at 80% (to stay safe).
      ...unmodelledEnemyPowers(enemy).length > 0 ? { not_modelled: `${unmodelledEnemyPowers(enemy).join(", ")}: not simulated, so the options count damage into this enemy at 80%` } : {}
    })),
    note: "Each option is a whole turn, already simulated by code; its numbers are exact for this turn. Choose the one that is best for winning the whole fight, not just this turn.",
    ...silentSimulationReference(state, [
      ...shown.map((plan, index) => ({ key: `plan${index + 1}`, plan })),
      ...mcShown.flatMap((mc) => mc.median ? [{ key: mcKey(mc), plan: mc.median }] : [])
    ], rollout, mcShown),
    // Facts for judging a potion (Jev's call): belt, act boss, Elite ahead, boss clock, run plan.
    potion_context: { ...potionContextJson(env, kind), ...potionCostContext(costs, kind, costsOn && kind !== "boss" && noPotionBase === void 0) },
    // THIEF_FACTS: who carries our card or gold, how many turns are left to kill it, its HP and block (thief.ts).
    ...thiefContext ? { thief_context: thiefContext } : {},
    // B2: how to read each option's whole_fight_sim, and the fight plan from the best line's winning samples (information).
    ...bossSim && simShown ? { whole_fight_sim: simNote(bossSim), ...bossSim.available && bossSim.plan ? { whole_fight_plan: `the simulation's best line, from its samples (information, not an order): ${bossSim.plan}` } : {} } : {},
    ...slLowTrustSim !== null ? { whole_fight_sim_trust: `\u4F4E\u53EF\u4FE1 (low trust): the simulator is not validated on this boss (${slLowTrustSim}). Its numbers are shown only because this fight is an SL retry, to help find another approach; no option is ranked by them.` } : {},
    // SL (docs/sl.md): how the earlier attempts at this fight went (a retried fight only).
    ...env.sl ? { previous_attempts: env.sl.previousAttempts } : {},
    // SL_RETRY_KNOWN_DRAWS: the next cards of the draw pile, known from the earlier attempt (one fact line).
    ...knownTop ? { known_draws: knownDrawsFact(knownTop.names, knownTop.attempts, knownTop.addedNames) } : {},
    // Heads the advice below (run plan, lessons, fight plan, fight hints): the data wins over hand-written advice.
    knowledge_rule: JEV_DATA_OVER_GUIDES,
    ...deepseekPlan ? { deepseek_plan: deepseekPlan } : {},
    ...lessons.length > 0 ? {
      experience: {
        note: "lessons from past runs about these enemies (experience base): evidence, not orders",
        lessons: lessons.map((entry) => jevLessonLine(entry, state.run?.ascension ?? void 0))
      }
    } : {},
    ...fightPlan ? { fight_plan: fightPlanJson(fightPlan) } : {}
  };
  let jevView;
  if (env.jevContext === "v1") {
    const liveEnemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
    const nextThreat = new Map(
      liveEnemies.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, multiClawNext(enemy) ?? expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"]), boardDamageContext(enemy, player, ascension), deathExcluded.get(numOrNull(enemy["index"]) ?? fallbackIndex))])
    );
    const illusions = liveEnemies.filter((enemy) => powerAmount(enemy, "ILLUSION_POWER") > 0);
    const dead = revivingIllusions(combat).map((enemy) => revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? null).filter((hit) => hit !== null);
    const ctx = {
      maxHp: playerSim.maxHp,
      hand,
      enemies,
      nextThreat,
      summonedThreat: new Map(liveEnemies.map((enemy, fallbackIndex) => [numOrNull(enemy["index"]) ?? fallbackIndex, summonThreat(enemy)])),
      noAttack: enemies.every((enemy) => enemy.attacks.length === 0),
      ...illusions.length > 0 ? { revivingThreat: new Map(illusions.map((enemy) => [numOrNull(enemy["index"]) ?? liveEnemies.indexOf(enemy), revivingForecast(str(enemy["enemy_id"]), 1, boardDamageContext(enemy, player, ascension))?.[0] ?? null])) } : {},
      ...dead.length > 0 ? { revivedThreat: dead.reduce((sum, hit) => sum + hit, 0) } : {}
    };
    const jevCriteria = { ...criteria };
    shown.forEach((plan, index) => {
      jevCriteria[`plan${index + 1}`] = JSON.stringify({ ...focusNote(plan), ...describePlan(plan, playerSim.maxHp), ...potionLethalNote(plan), ...noEffectNote(plan, surviving), ...noPotionNote(plan), ...planFacts(plan, ctx), ...fitOf(plan), ...factsOf(plan), ...costNote(plan), ...thiefNote(plan) });
    });
    const actRaw = state.run?.act_id;
    const hints = selectHints({
      enemyIds: liveEnemies.map((enemy) => str(enemy["enemy_id"])),
      fight: kind,
      act: actRaw != null && /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : null,
      hpPct: playerSim.maxHp > 0 ? playerSim.hp / playerSim.maxHp * 100 : 100,
      enemyPowers: liveEnemies.flatMap((enemy) => asArray(enemy["powers"]).map((power) => str(asRecord(power)["power_id"]))),
      noAttack: ctx.noAttack
    });
    const jevState = { ...questionState, run_brief: combatBriefJson(env.brief, state, env.knowledge) };
    if (hints.length > 0) jevState["fight_hints"] = hints.map((hint) => hintText(hint, state.run?.ascension ?? 0));
    const extra = jevExperience({ state, kind, runPlan: currentRunPlan(env), ...env.brief.plan ? { briefPlan: env.brief.plan } : {}, knowledge: env.knowledge, shown: lessons.map((entry) => entry.id) });
    if (extra.potion) jevState["potion_experience"] = extra.potion;
    if (extra.mechanics) jevState["mechanics_experience"] = extra.mechanics;
    jevView = {
      state: jevState,
      questions: { plan: choiceQ("Which plan should I play this turn?", jevCriteria) },
      context: "v1",
      hints: hints.map((hint) => hint.id)
    };
  }
  const simFallback = simRanks?.bestDry ?? null;
  const lootFallback = lootOn() && rollout?.available && rollout.result.lines.some((line) => (line.thiefCost ?? 0) > 0) && bestShown !== null && options.includes(bestShown) && !drinksPotion(bestShown) ? bestShown : null;
  const autoTop = stopLine ?? simFallback ?? lootFallback ?? (drinksPotion(top) ? dryFirst(options) ?? top : top);
  const explore = env.sl?.explore ?? env.slRecord;
  const picks = /* @__PURE__ */ new WeakMap();
  const notePick = (resolved, pick2) => {
    if (explore) picks.set(resolved, pick2);
    return resolved;
  };
  const fallback = (why, line = autoTop) => notePick({
    intent: firstIntent(line, hand, env),
    rationale: `${why}; ${line === stopLine ? "ending the turn where the chosen line ended" : simFallback !== null && line === simFallback ? "using the whole-fight simulation's best potion-free plan" : lootFallback !== null && line === lootFallback ? "using the rollout's best plan (its ranking counts the thief's loot)" : `using the code-best ${line === top ? "plan" : "potion-free plan"}`}`,
    confidence: null,
    fallback: true,
    apply: () => commit(env, state.turn, line, hand, "code")
  }, { plan: line, text: lineText(line.steps), potions: potionIdsOf(line), wins: line.outcome.winsFight, via: "code" });
  const explored = (resolved, label) => {
    const noted = explore ? picks.get(resolved) : void 0;
    if (!explore || !noted) return { resolved, log: null, info: null };
    try {
      const played = explore.played;
      const drinkOf = (slot, targetIndex, potionId) => {
        const potion = potionsAll.find((entry) => entry.slot === slot);
        const id = potionId ?? potion?.potion_id;
        if (id === void 0) return void 0;
        const target = targetIndex === void 0 ? null : enemies.find((enemy) => enemy.index === targetIndex)?.name ?? null;
        return { canon: playKey({ potion: id }, target), text: `potion ${potion?.name ?? id}` };
      };
      const pickDrink = noted.plan === null && resolved.intent?.action === "use_potion" ? drinkOf(resolved.intent.option_index, resolved.intent.target_index) : void 0;
      const whole = explore.whole === true && played !== void 0;
      const openOf = (steps, extra) => whole ? turnOpen(played, steps, hand, extra) : {};
      const pick2 = !played ? noted : { ...noted, ...noted.plan ? turnKeys(played, noted.plan.steps) : pickDrink ? turnKeys(played, [], pickDrink) : {}, ...noted.plan ? openOf(noted.plan.steps) : pickDrink ? openOf([], pickDrink) : {} };
      const drinks2 = explore.bossPotions === true && kind === "boss";
      const mcOf = new Map(drinks2 ? mcShown.flatMap((mc2) => mc2.median ? [[mc2.median, mc2]] : []) : []);
      const mcLine = (plan, mc2, potions2) => {
        const drink = drinkOf(mc2.source.slot, void 0, mc2.source.potionId);
        return { plan, text: `drink ${mc2.source.name}, then re-plan`, dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potions2, ...turnKeys(played, [], drink), ...openOf([], drink ?? { canon: playKey({ potion: mc2.source.potionId }, null) }) };
      };
      const lines = [
        ...shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps), ...openOf(plan.steps) })),
        ...[...mcOf].map(([plan, mc2]) => mcLine(plan, mc2, [.../* @__PURE__ */ new Set([mc2.source.potionId, ...potionIdsOf(plan)])]))
      ];
      const estimate = (plan) => rollout?.available ? rollout.byPlan.get(plan) : void 0;
      const deathShare = (plan) => {
        const line = estimate(plan);
        return line && line.samples > 0 ? line.deaths / line.samples : null;
      };
      const simOf = (plan) => simRanks?.byPlan.get(plan);
      const b2 = explore.b2Gate === true && simRanks ? {
        notWorse: (plan, than) => simOf(plan) && simOf(than) ? !simWinsLess(simRanks, plan, than) : null,
        win: (plan) => simOf(plan)?.calibrated ?? null,
        rule: `${BOSS_LINES_TIE_SE} paired standard errors`,
        won: (plan) => simOf(plan)?.result.winProb ?? null
      } : null;
      const pointOf = (line) => explorePoint(line, lines, { drinks: drinks2, deathShare, b2 });
      const asPick = (line, mc2) => ({ plan: mc2 ? null : line.plan, text: line.text, potions: line.potions, wins: line.wins, rated: mc2 ? line.plan : null, ...line.canon !== void 0 ? { canon: line.canon, loose: line.loose } : {} });
      const info = { kind: "question", label, ...pointOf(pick2) };
      const playInstead = (line, mc2, why) => {
        const { guard: _guard, ...rest } = resolved;
        const rationale = `${resolved.rationale}; ${why}`;
        return mc2 ? { ...rest, intent: { action: "use_potion", option_index: mc2.source.slot }, rationale, apply: () => void (env.screenMemory.combatPlan = null) } : {
          ...rest,
          intent: firstIntent(line.plan, hand, env),
          rationale,
          apply: () => {
            commit(env, state.turn, line.plan, hand, pick2.via);
            if (pick2.guardExtra) recordHpGuard(env, state.turn, pick2.guardExtra(line.plan));
          }
        };
      };
      let deviate = explore.deviate;
      let fellBack = null;
      const replay2 = explore.replay;
      if (!deviate && replay2) {
        const mcAll = new Map(mcShown.flatMap((mc2) => mc2.median ? [[mc2.median, mc2]] : []));
        const all = [
          ...shown.map((plan) => ({ plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps) })),
          ...[...mcAll].map(([plan, mc2]) => mcLine(plan, mc2, [mc2.source.potionId]))
        ];
        const pickDies = (pick2.plan ?? pick2.rated ?? null)?.outcome.dies ?? false;
        const choiceNow = replayChoice(pick2, pickDies, all, replay2);
        let ref = choiceNow.line;
        let reason = choiceNow.reason;
        const at2 = replay2.point.split(",")[0];
        const notShown = ref === null && reason === `attempt ${replay2.reference}'s line is not among the options`;
        let logged = false;
        if (notShown && replay2.plays && solvedInput) {
          const plan = loggedLine(solvedInput, replay2.plays);
          const plays = replay2.plays.length > 0 ? replay2.plays.join(", ") : "end turn";
          if (!plan) reason = `${reason}, and its plays from this board (${plays}) cannot be played here`;
          else if (plan.outcome.dies && !pickDies) reason = `${reason}, and its plays from this board (${plays}) die this turn, the answer does not`;
          else {
            ref = { plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps) };
            reason = `${reason}: its plays from this board (${plays}), replayed to reach ${at2}`;
            logged = true;
          }
        }
        let reordered = false;
        if (!logged && replay2.order === true && replay2.plays && solvedInput && pick2.text !== replay2.line) {
          const canonMatch = ref !== null && ref.text !== replay2.line && !mcAll.has(ref.plan) ? ref.plan : ref === null && replay2.canon !== void 0 && pick2.canon === replay2.canon ? pick2.plan : null;
          if (canonMatch && !followsPlays(canonMatch.steps, replay2.plays, hand)) {
            const plan = loggedLine(solvedInput, replay2.plays);
            const plays = replay2.plays.length > 0 ? replay2.plays.join(", ") : "end turn";
            if (plan && !(plan.outcome.dies && !pickDies)) {
              ref = { plan, text: lineText(plan.steps), dies: plan.outcome.dies, wins: plan.outcome.winsFight, potions: potionIdsOf(plan), ...turnKeys(played, plan.steps) };
              reason = `${reason}; in another order than its plays from this board (${plays}): those replayed in their order to reach ${at2}`;
              logged = true;
              reordered = true;
            }
          }
        }
        const loggedTag = logged ? { logged: true } : {};
        const loggedLog = logged ? { logged: true, plays: [...replay2.plays], ...reordered ? { reordered: true } : {} } : {};
        const log2 = { replay: { point: replay2.point, reference: replay2.reference, line: replay2.line, original: pick2.text, overridden: ref !== null, reason, ...loggedLog } };
        const stuck = ref === null && (notShown || reason === `attempt ${replay2.reference}'s line dies this turn, the answer does not`);
        if (stuck && replay2.fallback && !pick2.wins) {
          deviate = replay2.fallback;
          fellBack = reason;
        } else {
          if (!ref) return { resolved, log: log2, info: { ...info, replay: { overridden: false, reason } } };
          const mc2 = mcAll.get(ref.plan);
          const out2 = playInstead(ref, mc2, logged ? `SL explore: replaying attempt ${replay2.reference}'s plays from this board, ${ref.text}, instead of ${pick2.text} before ${at2} (${reordered ? `its line ${replay2.line} is shown with its plays in another order` : `its line ${replay2.line} is not among the options`})` : `SL explore: replaying attempt ${replay2.reference}'s ${ref.text} instead of ${pick2.text} before ${at2}`);
          return { resolved: out2, log: log2, info: { kind: "question", label, ...pointOf(asPick(ref, mc2)), replay: { overridden: true, reason, ...loggedTag } } };
        }
      }
      const fellBackLog = fellBack !== null ? { fallback: true, replay_stopped: fellBack } : {};
      const fellBackInfo = fellBack !== null ? { replay: { overridden: false, reason: `${fellBack}: deviated here instead` } } : {};
      const avoid = deviate ? void 0 : explore.avoid;
      if (!deviate && !avoid) return { resolved, log: null, info };
      const rank2 = (plans) => {
        const byRollout = (among) => {
          const estimates = among.map(estimate).filter((line) => line !== void 0);
          if (!rollout?.available || estimates.length === 0) return null;
          const best2 = pickRolloutBest(estimates, rollout.lossCap);
          return best2.best?.plan ?? among.find((plan) => (best2.tied ?? []).some((line) => line.plan === plan)) ?? null;
        };
        if (!simRanks) return byRollout(plans);
        const simKey2 = (plan) => {
          const line = simRanks.byPlan.get(plan)?.result;
          return line ? `${Math.round(line.winProb * 1e3)}|${Math.round(wonLoss(line) * 10)}` : null;
        };
        return rankByOrder(plans, simRanks.order, simKey2, byRollout);
      };
      const choice = exploreReplacement({
        pick: pick2,
        shown: lines,
        excluded: deviate ? deviate.excluded : [],
        deathShare,
        drinks: drinks2,
        b2,
        rank: rank2,
        ...deviate?.tried ? { tried: deviate.tried } : avoid ? { tried: avoid.tried, avoid: true } : {},
        ...whole ? { whole: true } : {}
      });
      const numbers = (plan) => {
        if (!plan) return null;
        const line = estimate(plan);
        const sim = bossSim?.available ? bossSim.byPlan.get(plan) : void 0;
        const parts = [
          ...line ? [`rollout dead ${line.deaths}/${line.samples}, further loss ${Math.round(line.hpLoss * 10) / 10}, win ~${Math.round(line.winProb * 100)}%`] : [],
          ...sim ? [`whole-fight sim win ${Math.round(sim.result.winProb * 1e3) / 10}%`] : [],
          `this turn hp -${plan.outcome.hpLoss}, dmg ${plan.outcome.damageDealt}`
        ];
        return parts.join("; ");
      };
      const rep = choice.replacement;
      const rated = pick2.plan ?? pick2.rated ?? null;
      const versus = rep && rated ? simCompare(simRanks, rep.plan, rated) : null;
      const gateLog = kind === "boss" && (explore.b2Gate === true || explore.bossPotions === true) ? {
        gate: choice.gate,
        ...choice.gate === "b2" && rep && rated ? { b2: { original: Math.round((simOf(rated)?.calibrated ?? 0) * 1e3) / 1e3, replacement: Math.round((simOf(rep.plan)?.calibrated ?? 0) * 1e3) / 1e3, ...versus ? { diff: versus.winDiff, se: versus.winSe } : {} } } : {}
      } : {};
      const numbersLog = rep ? { numbers: { original: numbers(Object.keys(gateLog).length > 0 ? rated : pick2.plan), replacement: numbers(rep.plan) } } : {};
      const mc = rep ? mcOf.get(rep.plan) : void 0;
      if (avoid) {
        const avoided = { original: pick2.text, replacement: rep?.text ?? null, reason: choice.reason };
        const turnLog = { ...pick2.canon !== void 0 ? { turn: pick2.canon } : {}, ...rep?.canon !== void 0 ? { turn_instead: rep.canon } : {} };
        const failed2 = whole && !rep && !pick2.wins && triedHas(avoid.tried, pick2) ? { line: pick2.text, reason: choice.reason } : null;
        const log2 = { avoid: { point: avoid.point, ...avoided, played_in: avoid.attempts, ...turnLog, ...numbersLog, ...gateLog }, ...failed2 ? { avoid_failed: { point: avoid.point, played_in: avoid.attempts, ...failed2, ...turnLog } } : {} };
        if (!rep) return { resolved, log: log2, info: { ...info, avoided, ...failed2 ? { avoidFailed: failed2 } : {} } };
        const ends = whole && choice.reason.startsWith(MAY_REPEAT) ? "which may end the turn after its draw with the plays" : "which ends the turn with the plays";
        const out2 = playInstead(rep, mc, `SL explore (the deviation's turn, ${avoid.point.split(",")[0]}): playing ${rep.text} instead of ${pick2.text}, ${ends} attempt${avoid.attempts.length === 1 ? "" : "s"} ${avoid.attempts.join(", ")} had through the deviation point (${choice.reason})`);
        return { resolved: out2, log: log2, info: { kind: "question", label, ...pointOf(asPick(rep, mc)), explored: true, avoided } };
      }
      const point = deviate;
      const log = {
        point: point.point,
        original: pick2.text,
        replacement: rep?.text ?? null,
        reason: choice.reason,
        played_in: point.attempts,
        ...point.replayed !== void 0 ? { replayed: point.replayed } : {},
        ...numbersLog,
        ...gateLog,
        ...point.tried && pick2.canon !== void 0 ? { turn: pick2.canon, ...rep?.canon !== void 0 ? { turn_instead: rep.canon } : {} } : {},
        ...fellBackLog
      };
      const deviation = { original: pick2.text, replacement: rep?.text ?? null, reason: choice.reason };
      if (!rep) return { resolved, log, info: { ...info, deviation, ...fellBackInfo } };
      const mayEnd = whole && choice.reason.startsWith(MAY_REPEAT);
      const out = playInstead(rep, mc, `SL explore (${point.point}): playing ${rep.text} instead of ${pick2.text}, ${mayEnd ? "whose turn may end after its draw as it did on this board" : "played on this board"} in attempt${point.attempts.length === 1 ? "" : "s"} ${point.attempts.join(", ")} (${choice.reason})`);
      return { resolved: out, log, info: { kind: "question", label, ...pointOf(asPick(rep, mc)), explored: true, deviation, ...fellBackInfo } };
    } catch {
      return { resolved, log: null, info: null };
    }
  };
  const resolvePlan = (answers) => {
    {
      const answer = answers["plan"];
      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`);
      const hallway = !(kind === "elite" || kind === "boss" || dangerous);
      const escalatedBy = answer.raw === void 0 ? void 0 : answer.raw.escalated;
      const fromJev = answer.raw !== void 0 && !escalatedBy;
      if (chosen.potion) {
        const drink = chosen.potion;
        return notePick({
          intent: drink,
          rationale: `Jev chose to ${chosen.label} (confidence ${answer.confidence.toFixed(2)})`,
          confidence: answer.confidence,
          fallback: false,
          apply: () => {
            env.screenMemory.combatPlan = null;
          }
        }, { plan: null, text: chosen.label, potions: potionsAll.filter((potion) => potion.slot === drink.option_index).map((potion) => potion.potion_id), wins: false, via: escalatedBy ?? "jev", rated: mcShown.find((mc) => mc.source.slot === drink.option_index)?.median ?? null });
      }
      const chosenPotions = potionIdsOf(chosen.plan);
      const noNewDrink = (plan2) => potionIdsOf(plan2).every((id) => chosenPotions.includes(id));
      const coversTargets = (plan2) => groups.length < 2 || groups.every((group) => group.indices.every((index) => damageInto(plan2, [index], enemies) >= damageInto(chosen.plan, [index], enemies)));
      const lootOf2 = (plan2) => {
        const line = rollout?.available ? rollout.byPlan.get(plan2) : void 0;
        return line?.thiefCost !== void 0 ? line.thiefCost : lastTurnLoot(plan2, thieves);
      };
      const keepsLoot = (plan2) => !lootOn() || lootOf2(plan2) <= lootOf2(chosen.plan);
      const dominator = !hallway && fromJev && answer.confidence < 0.4 ? options.find((plan2) => plan2 !== chosen.plan && noNewDrink(plan2) && dominates(plan2, chosen.plan) && coversTargets(plan2) && keepsLoot(plan2)) : void 0;
      const picked = dominator ?? chosen.plan;
      const memo2 = env.screenMemory.hpGuard;
      const thisTurn = memo2 && memo2.fight === hpGuardFight(env) ? memo2.turns[String(state.turn ?? "?")] ?? 0 : 0;
      const slack = hpGuardSlack(playerSim.hp, kind, hallway ? 0 : hpGuardExtra(env) - thisTurn);
      const guardOptions = [...options.filter((plan2) => plan2 === picked || !drinksKeptPotion(plan2) && noNewDrink(plan2)), ...options.includes(picked) ? [] : [picked]];
      const rolloutDeaths = (plan2) => rollout?.available ? rollout.byPlan.get(plan2)?.deaths ?? null : null;
      const keepsPick = (plan2) => guardKeepsPick(picked, plan2, enemies, rolloutDeaths) && !simWinsLess(simRanks, plan2, picked) && (!lootOn() || lootSwapOk(picked, plan2, lootOf2));
      const proposed = hallway ? hallwayGuard && !picked.outcome.winsFight ? hpGuardReplacement(picked, guardOptions, playerSim.hp, hallwayGuardSlack, keepsPick) : null : hpGuardReplacement(picked, guardOptions, playerSim.hp, slack, keepsPick);
      const raceKept = proposed !== null && winsRace(picked, proposed);
      const replacement = proposed && (guardKeepsSetup(picked, proposed, rolloutDeaths) || raceEruption) ? null : proposed;
      const plan = replacement ?? picked;
      const extra = plan.outcome.winsFight ? 0 : Math.max(0, guardLoss(plan) - Math.min(...guardOptions.map(guardLoss)));
      const rank2 = shown.indexOf(plan) + 1;
      const guardNote = replacement ? hpGuardNote(shown.indexOf(picked) + 1, picked, slack, rank2, plan) : "";
      return notePick({
        intent: firstIntent(plan, hand, env),
        rationale: `Jev chose ${pickNote(shown, chosen.plan, picked)} with confidence ${answer.confidence.toFixed(2)}; code rank ${options.includes(picked) ? options.indexOf(picked) + 1 : "- (rollout's best line, added)"}${guardNote}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
        ...replacement ? { guard: { kind: "hp", choice: `plan${rank2}`, plan: plan.steps.map(stepText).join(", ") || "end turn" } } : {},
        apply: () => {
          commit(env, state.turn, plan, hand, escalatedBy ?? "jev");
          if (!hallway) recordHpGuard(env, state.turn, raceKept ? 0 : extra);
        }
      }, { plan, text: lineText(plan.steps), potions: potionIdsOf(plan), wins: plan.outcome.winsFight, via: escalatedBy ?? "jev", ...hallway ? {} : { guardExtra: (line) => line.outcome.winsFight ? 0 : Math.max(0, guardLoss(line) - Math.min(...guardOptions.map(guardLoss))) } });
    }
  };
  if (thiefTrace.enabled) thiefTrace.last = { plans: solved.plans, surviving, shown, rollout, thieves, lastTurnLine: thiefKill, rolloutLine: thiefRollout, kind, mcShown, simRanks };
  plannerTiming.last = plannerTimingOf({ planStart, cpuStart, solveMs, mcShown, rollout, bossSim, computeMemo });
  const questionLabel = potionLethal.length > 0 ? "combat/plan-choice+potion-lethal" : offerPotions || mcShown.length > 0 ? "combat/plan-choice+potion" : "combat/plan-choice";
  return {
    kind: "ask",
    label: questionLabel,
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    ...jevView ? { jevView } : {},
    // No DeepSeek escalation in combat (Dai 2026-09-28): the turn's line is Jev's call.
    resolve(answers) {
      const { resolved, log: exploreLog, info: exploreInfo } = explored(resolvePlan(answers), questionLabel);
      const noted = (out) => {
        if (exploreInfo) slPoints.set(out, exploreInfo);
        return out;
      };
      const potionsRecord = mcShown.length > 0 || potions.length > 0 ? { random: mcShown.map(potionMcLog), unsimulated_offered: potions.map((potion) => potion.potion_id), fight_plan_now: planPotionNow } : null;
      const ruled = enemies.filter((enemy) => (enemy.stunOnStrip ?? []).length > 0);
      const moveRuled = enemies.filter((enemy) => (enemy.moveOnStrip ?? []).length > 0);
      const deathRuled = enemies.filter((enemy) => (enemy.moveOnDeath ?? []).length > 0);
      if (!rolloutRecord && !potionsRecord && focusOf.size === 0 && !bossSim && thieves.length === 0 && ruled.length === 0 && moveRuled.length === 0 && deathRuled.length === 0 && exploreLog === null) return noted(resolved);
      const answer = answers["plan"];
      const pick2 = answer?.type === "choice" ? byKey.get(answer.choice) : void 0;
      const setsOff = (plan) => plan.outcome.enemyHpAfter.some((enemy) => enemy.strippedStun !== void 0 && enemy.hp > 0);
      const movesOff = (plan) => plan.outcome.enemyHpAfter.some((enemy) => enemy.movedTo !== void 0);
      const deathsOff = (plan) => !plan.outcome.winsFight && plan.outcome.enemyHpAfter.some((enemy) => enemy.deathMove !== void 0 && enemy.hp > 0);
      const mechRecord = ruled.length > 0 || moveRuled.length > 0 || deathRuled.length > 0 ? {
        ...ruled.length > 0 ? {
          rules: ruled.flatMap((enemy) => enemy.stunOnStrip.map((stun) => ({ enemy: enemy.name, power: stun.power, n: mechRules.get(stun.power)?.n ?? null }))),
          stuns_now: [...shown, ...mcMedians].filter(setsOff).map(keyOfShown),
          chosen_stuns: pick2?.plan ? setsOff(pick2.plan) : null
        } : {},
        ...moveRuled.length > 0 ? {
          move_rules: moveRuled.flatMap((enemy) => enemy.moveOnStrip.map((rule) => ({ enemy: enemy.name, power: rule.power, how: rule.how, move: rule.move, n: rule.n }))),
          moves_now: [...shown, ...mcMedians].filter(movesOff).map(keyOfShown),
          chosen_moves: pick2?.plan ? movesOff(pick2.plan) : null
        } : {},
        ...deathRuled.length > 0 ? {
          death_rules: deathRuled.flatMap((enemy) => enemy.moveOnDeath.map((rule) => ({ enemy: enemy.name, ally: rule.allyName, move: rule.move, next: rule.next }))),
          deaths_now: [...shown, ...mcMedians].filter(deathsOff).map(keyOfShown),
          chosen_deaths: pick2?.plan ? deathsOff(pick2.plan) : null
        } : {}
      } : null;
      const thiefRecord = (() => {
        if (thieves.length === 0) return null;
        try {
          return {
            thieves: thieves.map((thief) => ({ name: thief.name, id: thief.id, carries: lootText(thief), turns_left: thief.turnsLeft, ...thief.loot ? { loot_hp: thief.loot.hp } : {} })),
            kills_now: shown.filter((plan) => thieves.some((thief) => killsThief(plan, thief))).map(keyOfShown),
            ...thiefKill && shown.includes(thiefKill) ? { last_turn_line: keyOfShown(thiefKill) } : {},
            ...thiefRollout && shown.includes(thiefRollout) ? { rollout_line: keyOfShown(thiefRollout), rollout_line_added: thiefRolloutAdded } : {},
            chosen_kills: pick2?.plan ? thieves.some((thief) => killsThief(pick2.plan, thief)) : null,
            // THIEF_COST: each shown line's expected loot cost (HP) and the chosen line's.
            ...lootOn() && rollout?.available ? {
              loot_cost: Object.fromEntries(shown.flatMap((plan) => rollout.byPlan.get(plan)?.thiefCost !== void 0 ? [[keyOfShown(plan), Math.round(rollout.byPlan.get(plan).thiefCost * 10) / 10]] : [])),
              chosen_loot_cost: pick2?.plan ? rollout.byPlan.get(pick2.plan)?.thiefCost ?? null : null
            } : {}
          };
        } catch {
          return null;
        }
      })();
      const bestKeys = tiedKeys.length > 0 ? tiedKeys : bestShown !== null ? [keyOfShown(bestShown)] : [];
      const rolloutBestChosen = bestKeys.length === 0 || pick2 === void 0 || answer?.type !== "choice" ? null : bestKeys.includes(answer.choice);
      const chosenOrder = rollout?.available && pick2?.plan ? rollout.byPlan.get(pick2.plan)?.order?.label ?? null : null;
      return noted({
        ...resolved,
        log: {
          ...rolloutRecord ? { rollout: rolloutRecord, rollout_best_chosen: rolloutBestChosen, ...chosenOrder ? { chosen_order: chosenOrder } : {} } : {},
          ...potionsRecord ? { potions: potionsRecord } : {},
          ...focusOf.size > 0 ? { focus: Object.fromEntries([...byKey.entries()].filter(([, entry]) => entry.plan && focusOf.has(entry.plan)).map(([key, entry]) => [key, focusOf.get(entry.plan).join(", ")])) } : {},
          ...thiefRecord ? { thief: thiefRecord } : {},
          ...mechRecord ? { mech: mechRecord } : {},
          // SL_RETRY_KNOWN_DRAWS / SL_RETRY_COMPUTE on this question (docs/sl.md §10).
          ...knownTop || slCompute ? { sl_retry: { known_draws: knownTop ? knownTop.names.length : 0, ...knownTop && knownTop.added.length > 0 ? { added: knownTop.added.length } : {}, ...slCompute ? { compute: { rollout_samples: slCompute.rolloutSamples, rollout_budget_ms: retryBudgetMs, turn_spent_ms: Math.round(retrySpent), mc_samples: slCompute.mcSamples, boss_sim_samples: slCompute.bossSimSamples } } : {} } } : {},
          // With the 5-turn rollout's own best (or ties), which rollout.best no longer is where the simulation ranks.
          ...bossSim ? {
            boss_sim: simLog(bossSim, (plan) => shown.includes(plan) || mcMedians.includes(plan) ? keyOfShown(plan) : null, {
              rollout_own_best: rolloutBest && (shown.includes(rolloutBest) || mcMedians.includes(rolloutBest)) ? keyOfShown(rolloutBest) : null,
              rollout_own_tied: rolloutTiedAll.filter((plan) => shown.includes(plan) || mcMedians.includes(plan)).map(keyOfShown)
            })
          } : {},
          // SL_RETRY_EXPLORE: the deviation point's line, replaced or not, and why (docs/sl.md §11).
          ...exploreLog !== null ? { sl_explore: exploreLog } : {}
        }
      });
    }
  };
}
function trimForPotionOptions(options, reserved, keep2, limit2 = MAX_OPTIONS) {
  const out = [...options];
  while (out.length + reserved > limit2) {
    let removed = false;
    for (let index = out.length - 1; index > 0; index -= 1) {
      const plan = out[index];
      if (keep2.has(plan)) continue;
      const others = out.filter((other) => other !== plan);
      if (!drinksPotion(plan) && !others.some((other) => !drinksPotion(other))) continue;
      if (!potionIdsOf(plan).every((id) => others.some((other) => potionIdsOf(other).includes(id)))) continue;
      out.splice(index, 1);
      removed = true;
      break;
    }
    if (!removed) break;
  }
  return out;
}
function poolCardModel(info, knowledge, ctx) {
  const cost = potionCardCost({ type: info.type, xCost: info.xCost, cost: 0 }, ctx.powerExtraCost ?? 0);
  const raw = {
    card_id: info.id,
    name: info.name,
    dynamic_values: info.vars,
    rules_text: info.descriptionRaw,
    resolved_rules_text: info.description,
    target_type: info.target,
    requires_target: info.target === "AnyEnemy",
    playable: true,
    energy_cost: cost,
    costs_x: info.xCost,
    upgraded: false,
    index: 0
  };
  const model2 = modelHandCard(raw, 0, knowledge);
  return {
    ...model2,
    cost,
    playable: true,
    validTargets: model2.target === "single" ? ctx.enemyTargets : [],
    damage: model2.damage === null ? null : Math.floor((model2.damage + ctx.strength) * (ctx.weak ? 0.75 : 1))
  };
}
function randomPotionSource(potion, state, knowledge, ctx, noDraw) {
  const kind = randomPotionKind(potion.potion_id);
  if (kind === null) return null;
  const base = { potionId: potion.potion_id, name: potion.name, slot: potion.slot, text: potion.text, kind };
  if (kind === "choice") {
    const spec = CHOICE_POTIONS[potion.potion_id];
    const character2 = str(asRecord(state.run?.raw)["character_id"]).toLowerCase();
    const color = spec.pool === "colorless" ? "colorless" : character2;
    if (!color) return null;
    const all = knowledge.cards();
    const powerExtraCost = potionPowerExtraCost(asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
    const pools = {};
    for (const type of spec.types) {
      pools[type] = all.filter((card) => card.color === color && card.type === type && POOL_RARITIES.has(card.rarity)).map((card) => poolCardModel(card, knowledge, { ...ctx, ...powerExtraCost > 0 ? { powerExtraCost } : {} }));
    }
    if (spec.types.some((type) => (pools[type] ?? []).length === 0)) return null;
    const powersCost = powerExtraCost > 0 && spec.types.includes("Power") ? { powerExtraCost } : {};
    return { ...base, pools, poolName: `${color} ${spec.types.join("/")}`, ...powersCost };
  }
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  if (!Array.isArray(view["draw"]) && !Array.isArray(view["discard"])) return null;
  const piles = { draw: pileCardModels(state, knowledge, "draw", ctx), discard: pileCardModels(state, knowledge, "discard", ctx) };
  if (piles.draw.length + piles.discard.length === 0 && potion.potion_id !== "BOTTLED_POTENTIAL") return null;
  return { ...base, piles, ...noDraw ? { noDraw } : {} };
}
function runRandomPotions(sources, solver, dryBest, boardKey, opts = {}) {
  if (solver === null || sources.length === 0) return [];
  const dry = { ...solver, hand: solver.hand.filter((card) => card.type !== "Potion") };
  const out = [];
  let spent = 0;
  const total = opts.budgetMs ?? potionMcOptions.budgetMs;
  sources.forEach((source, index) => {
    const budget = Math.max(0, (total - spent) / (sources.length - index));
    const mc = opts.samples !== void 0 ? runPotionMc(dry, source, dryBest, seedOf(`${boardKey}:${source.potionId}:${source.slot}`), budget, opts.samples) : runPotionMc(dry, source, dryBest, seedOf(`${boardKey}:${source.potionId}:${source.slot}`), budget);
    spent += mc.ms;
    out.push(mc);
  });
  return out;
}
function potionLethalLines(lethal) {
  if (lethal.length === 0 || lethal.some((plan) => !drinksPotion(plan))) return [];
  const bySet = /* @__PURE__ */ new Map();
  for (const plan of lethal) {
    const set2 = [...potionIdsOf(plan)].sort().join("+");
    if (!bySet.has(set2)) bySet.set(set2, plan);
  }
  return [...bySet.values()].sort((a, b) => potionIdsOf(a).length - potionIdsOf(b).length || b.score - a.score).slice(0, MAX_POTION_LETHAL_LINES);
}
function noEffectNote(plan, plans) {
  const twin = noEffectTwin(plan, plans);
  if (!twin) return {};
  const potions = plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.name.replace(/^potion /, ""));
  return { potion_no_effect: `${potions.join(", ")}: no effect in this line (this turn is the same as ${twin.steps.map(stepText).join(", ") || "ending the turn"} without it)` };
}
function potionLethalNote(plan) {
  if (!plan.outcome.winsFight || !drinksPotion(plan)) return {};
  const names = plan.steps.filter((step) => step.cardId.startsWith("POTION:")).map((step) => step.name.replace(/^potion /, ""));
  return { potion_lethal: `WINS THE FIGHT THIS TURN, spending ${names.join(" + ")}; no potion-free line wins this turn` };
}
function lineLabel(plan) {
  return plan.steps.map(stepText).join(", ") || "end turn";
}
function guardedText(top, guarded) {
  return `code plan ${lineLabel(top)} (${lossText(top)}) is over the HP guard bound; playing ${lineLabel(guarded)} instead (${lossText(guarded)}, dmg ${guarded.outcome.damageDealt})`;
}
function lossText(plan) {
  return hpText(guardLoss(plan));
}
function hpGuardNote(pickedNo, picked, slack, rank2, plan) {
  return `; HP guard: plan ${pickedNo} (${lineLabel(picked)}; ${lossText(picked)}) is more than ${slack.toFixed(0)} HP over the cheapest line${slack === 0 ? ` (this fight already took ${HP_GUARD_FIGHT_BUDGET}+ extra HP)` : ""}, playing plan ${rank2} (${lineLabel(plan)}; ${lossText(plan)}) instead`;
}
function pickNote(shown, chosen, picked) {
  const head = `plan ${shown.indexOf(chosen) + 1}/${shown.length} (${lineLabel(chosen)})`;
  return picked === chosen ? head : `${head}; plan ${shown.indexOf(picked) + 1} (${lineLabel(picked)}) is as good or better on every axis, playing it`;
}
function leastLossPlan(allPlans, hand, hp = Infinity) {
  const reachEnd = allPlans.filter((plan) => !plan.outcome.diesOwnTurn);
  const pool = reachEnd.length > 0 ? reachEnd : allPlans;
  const pitSafe = (plan) => plan.outcome.sandpitAfter === null || plan.outcome.sandpitAfter > 0;
  const deadline = pool.some(pitSafe) && pool.some((plan) => !pitSafe(plan));
  const plans = deadline ? pool.filter(pitSafe) : pool;
  const picked = leastLossOf(plans, hand, hp);
  const escape = deadline ? picked.steps.findIndex((step) => step.cardId === "FRANTIC_ESCAPE") : -1;
  return escape > 0 ? stepFirst(picked, escape, hand) : picked;
}
function stepFirst(plan, at2, hand) {
  const playFirst = (step) => !step.cardId.startsWith("POTION:") && (hand.find((card) => card.index === step.cardIndex)?.playFirst === true || isPlayFirst(step.cardId));
  const lead = plan.steps.slice(0, at2).reduce((last, step, i) => playFirst(step) ? i + 1 : last, 0);
  if (at2 <= lead) return plan;
  return { ...plan, steps: [...plan.steps.slice(0, lead), plan.steps[at2], ...plan.steps.slice(lead, at2), ...plan.steps.slice(at2 + 1)] };
}
function leastLossOf(plans, hand, hp) {
  const drawAt = (plan) => plan.steps.findIndex((step) => hand.some((card) => card.index === step.cardIndex && drawsCards(card) && card.hpLoss < hp && card.handCondition === void 0));
  const drawing = plans.filter((plan) => drawAt(plan) >= 0);
  if (drawing.length === 0) return plans.reduce((a, b) => b.outcome.hpAfter > a.outcome.hpAfter ? b : a);
  const most = drawing.reduce(
    (a, b) => b.outcome.damageDealt > a.outcome.damageDealt || b.outcome.damageDealt === a.outcome.damageDealt && b.outcome.hpAfter > a.outcome.hpAfter ? b : a
  );
  const at2 = drawAt(most);
  if (at2 === 0) return most;
  return stepFirst(most, at2, hand);
}
function phaseSetupCard(hand, energy, keepsBlock) {
  const first = hand.find((card) => card.playFirst === true);
  if (first) {
    if (!first.playable || first.cost > energy) return null;
    const after = phaseSetupCard(hand.filter((card) => card !== first), energy - first.cost, keepsBlock);
    return after ? { card: first, why: `playing ${first.name} first (nothing else can be played before it), then ${after.why}` } : null;
  }
  const affordable = hand.filter((card) => card.playable && !card.xCost && card.cost <= energy && card.target !== "single");
  const junk = hand.filter((card) => card.type === "Status" || card.type === "Curse");
  if (junk.length > 0) {
    const picker = affordable.find(
      (card) => EXHAUST_PICKERS2.has(card.cardId) || card.cardId === "TRUE_GRIT" && (card.upgraded || hand.every((other) => other === card || other.type === "Status" || other.type === "Curse"))
    );
    if (picker) return { card: picker, why: `playing ${picker.name} to exhaust ${junk[0].name}` };
  }
  const power = affordable.find((card) => card.type === "Power");
  if (power) return { card: power, why: `playing the power ${power.name}` };
  const status = affordable.find((card) => card.type === "Status");
  if (status) return { card: status, why: `playing ${status.name} to clear it` };
  if (keepsBlock) {
    const block = affordable.find((card) => card.block > 0 && card.damage === null);
    if (block) return { card: block, why: `playing ${block.name} (block carries over)` };
  }
  return null;
}
function playCap(player, env) {
  const caps = [];
  if (powerAmount(player, "SLOTH_POWER") > 0) {
    let extra = 0;
    if (observedSlothReplay(env.state)) {
      const memo = recordFightPlays(env, num(player["cards_played_this_turn"]));
      extra = Object.entries(memo.slothReplays ?? {}).filter(([key]) => key.startsWith(`${env.state.turn}:`)).reduce((sum, [, count2]) => sum + count2, 0);
    }
    caps.push(Math.max(0, powerAmount(player, "SLOTH_POWER") - extra));
  }
  if (powerAmount(player, "RINGING_POWER") > 0) caps.push(1);
  if (caps.length === 0) return null;
  return Math.max(0, Math.min(...caps) - num(player["cards_played_this_turn"]));
}
function activeFightPlan(env) {
  if (env.fightPlan !== "v1") return null;
  const plan = env.screenMemory.fightPlan;
  if (!plan) return null;
  return plan.fight === hpGuardFight(env) && plan.runId === str(env.state.raw["run_id"]) ? plan : null;
}
function startFacing(combat) {
  const enemy = asArray(combat["enemies"]).map(asRecord).find((entry) => entry["is_alive"] !== false && powerAmount(entry, "BACK_ATTACK_RIGHT_POWER") > 0);
  return enemy ? numOrNull(enemy["index"]) : null;
}
function noPlayRescuePotion(env, enemies, player) {
  const incoming = Math.max(0, enemies.reduce((sum, enemy) => sum + enemy.attacks.reduce((total, attack) => total + attack.damage * attack.hits, 0), 0) - player.block);
  if (incoming < player.hp) return null;
  const potions = potionViews({ raw: asRecord(env.state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use);
  const artifactUp = enemies.some((enemy) => enemy.hp > 0 && (enemy.artifact ?? 0) > 0);
  const useful = (potion) => !(artifactUp && /虚弱|weak|易伤|vulnerable/i.test(potion.text) && !/格挡|block/i.test(potion.text));
  const pick2 = potions.filter(useful).find((potion) => BLUNTS_HIT.test(potion.text)) ?? potions.find((potion) => /抽|draw/i.test(potion.text));
  if (!pick2) return null;
  const target = pick2.requires_target ? pick2.valid_targets[0] : void 0;
  if (pick2.requires_target && target === void 0) return null;
  return {
    kind: "act",
    label: "combat/potion-now",
    intent: target === void 0 ? { action: "use_potion", option_index: pick2.slot } : { action: "use_potion", option_index: pick2.slot, target_index: target },
    rationale: `no playable cards and ${incoming} incoming at ${player.hp} HP: drinking ${pick2.name} first`
  };
}
function revivingIllusions(combat) {
  const enemies = asArray(combat["enemies"]).map(asRecord);
  if (!enemies.some((enemy) => enemy["is_alive"] !== false && powerAmount(enemy, "MINION_POWER") <= 0)) return [];
  return enemies.filter((enemy) => enemy["is_alive"] === false && powerAmount(enemy, "ILLUSION_POWER") > 0);
}
function laterIncomingOf(combat, asc, exclude) {
  const out = Array.from({ length: LATER_TURNS }, () => 0);
  let known = false;
  const ctxOf = (enemy) => asc === void 0 ? void 0 : boardDamageContext(enemy, asRecord(combat["player"]), asc);
  for (const enemy of revivingIllusions(combat)) {
    const forecast = revivingForecast(str(enemy["enemy_id"]), LATER_TURNS, ctxOf(enemy));
    if (!forecast) continue;
    known = true;
    for (let k = 0; k < LATER_TURNS; k += 1) out[k] += forecast[k] ?? 0;
  }
  for (const [i, enemy] of asArray(combat["enemies"]).map(asRecord).filter((entry) => entry["is_alive"] !== false).entries()) {
    const forecast = damageForecast(str(enemy["enemy_id"]), str(enemy["move_id"]), LATER_TURNS, powerAmount(enemy, "ASLEEP_POWER"), ctxOf(enemy), exclude?.get(numOrNull(enemy["index"]) ?? i));
    const shown = asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + num(intent["damage"]) * Math.max(1, num(intent["hits"])), 0);
    if (forecast) known = true;
    const special = multiClawNext(enemy);
    for (let k = 0; k < LATER_TURNS; k += 1) out[k] += k === 0 && special !== null ? special : forecast ? forecast[k] : shown;
  }
  return known ? out.map((value) => Math.round(value * 10) / 10) : null;
}
function multiClawNext(enemy) {
  if (str(enemy["enemy_id"]) === "KIN_PRIEST" && /ORB_OF_WEAKNESS/i.test(str(enemy["move_id"]))) {
    return (3 + powerAmount(enemy, "STRENGTH_POWER")) * 3;
  }
  if (!/MULTI_CLAW/i.test(str(enemy["move_id"]))) return null;
  const intent = asArray(enemy["intents"]).map(asRecord).find((entry) => num(entry["damage"]) > 0);
  if (!intent) return null;
  return num(intent["damage"]) * (Math.max(1, num(intent["hits"])) + 1);
}
function vambraceArmed(relicIds, hand, dexterity, frail = false) {
  if (!relicIds.includes("VAMBRACE")) return false;
  return hand.some((entry) => {
    const block = asArray(asRecord(entry)["dynamic_values"]).map(asRecord).find((value) => str(value["name"]) === "Block");
    if (!block) return false;
    const own = (numOrNull(block["enchanted_value"]) ?? numOrNull(block["base_value"]) ?? 0) + dexterity;
    const shown = numOrNull(block["current_value"]) ?? own;
    return own > 0 && shown >= 2 * own * (frail ? 0.75 : 1) - 1;
  });
}
function paelsLegionPreview(runRaw, combat) {
  const run = asRecord(runRaw);
  if (str(run["character_id"]).toLowerCase() !== "silent") return false;
  const relics = asArray(run["relics"]).map(asRecord);
  const legion = relics.find((relic) => str(relic["relic_id"]) === "PAELS_LEGION");
  if (!legion || num(legion["stack"]) > 0 || relics.some((relic) => str(relic["relic_id"]) === "VAMBRACE")) return false;
  const player = asRecord(combat["player"]);
  if (["FRAIL_POWER", "SHADOWMELD_POWER", "UNMOVABLE_POWER"].some((id) => powerAmount(player, id) > 0)) return false;
  const dexterity = powerAmount(player, "DEXTERITY_POWER");
  return asArray(combat["hand"]).map(asRecord).some((card) => {
    if (str(card["card_id"]) !== "DEFEND_SILENT" || card["upgraded"] === true || dexterity !== 0 && dexterity !== 3) return false;
    const block = asArray(card["dynamic_values"]).map(asRecord).find((value) => str(value["name"]) === "Block");
    return block !== void 0 && num(block["base_value"]) === 5 && num(block["enchanted_value"]) === 5 && num(block["current_value"]) === 2 * (5 + dexterity);
  });
}
function fairiesHeld(runRaw) {
  return asArray(runRaw["potions"]).map(asRecord).filter((slot) => bool(slot["occupied"]) && str(slot["potion_id"]) === "FAIRY_IN_A_BOTTLE");
}
function revivesOf(state, memory, maxHp) {
  const runRaw = asRecord(state.run?.raw);
  const fairies = fairiesHeld(runRaw).map((slot) => ({ source: "FAIRY_IN_A_BOTTLE", name: str(slot["name"], "Fairy in a Bottle"), hp: Math.max(1, Math.floor(maxHp * FAIRY_REVIVE_SHARE)) }));
  const tail = asArray(runRaw["relics"]).map(asRecord).find((relic) => str(relic["relic_id"]) === "LIZARD_TAIL");
  const spent = memory.lizardTail?.runId === str(state.raw["run_id"]) && memory.lizardTail.used;
  return [...fairies, ...tail && !spent ? [{ source: "LIZARD_TAIL", name: str(tail["name"], "Lizard Tail"), hp: Math.max(1, Math.floor(maxHp * LIZARD_TAIL_REVIVE_SHARE)) }] : []];
}
function relicStack(run, relicId) {
  return num(asArray(asRecord(run)["relics"]).map(asRecord).find((entry) => str(entry["relic_id"]) === relicId)?.["stack"]);
}
function kusarigamaOf(run) {
  const relic = asArray(asRecord(run)["relics"]).map(asRecord).find((entry) => str(entry["relic_id"]) === "KUSARIGAMA");
  return relic ? { every: 3, damage: 6, count: num(relic["stack"]) % 3 } : void 0;
}
var MODELLED_ENEMY_POWERS, POWER_NOTES, VULNERABLE_PAYOFFS, BEATING_REMNANT_CAP, FIGHT_NODES, ELITE_LOOKAHEAD, BOSS_FLOORS2, OFFENSIVE_POTIONS, BLUNTS_HIT, LEADER_RULE_EXEMPT, targetOptions, plannerTiming, thiefTrace, JEV_DATA_OVER_GUIDES, JEV_FIGHT_LESSONS, MAX_OPTIONS, HP_GUARD_FIGHT_BUDGET, HP_GUARD_MIN_SLACK, guardLoss, ERUPTION_BLOCK, ERUPTION_FALLBACK_DAMAGE, SIPHON_FALLBACK, HALLWAY_ELITES, BOULDER_SETTLE_MS, INTIMIDATING_HELMET_BLOCK, PAPER_PHROG_VULNERABLE, CLOAK_CLASP_BLOCK, PAELS_TEARS_ENERGY, RED_SKULL_STRENGTH, CLAY_BLOCK, MERCURY_HOURGLASS_DAMAGE2, SHURIKEN_ATTACKS, SHURIKEN_STRENGTH, LOST_WISP_DAMAGE, WITHER_EVERY, slAvoidFails, slPoints, slCommitted, slAvoidFailed, slReplayedCode, CODE_POINTS, leastLossFacts, drawBounds, RANDOM_SPECIALS, DRAW_TEXT, PILE_TEXT, ANY_DRAW_INDEX, anyDrawOptions, HAND_TEXT, ON_DRAW_TEXT, HP_SAVE_TEXT, HAND_SPECIALS, ON_DRAW_KNOWN, NUMBER_LOWERING_POWERS, CARD_NUMBER_RELICS, SL_KNOWN_DRAW_INDEX, KNOWN_DRAWS_NAMED, TAKE_WAIT_MS, UNSIMULATED_OFFERED, MAX_POTION_LETHAL_LINES, EXHAUST_PICKERS2, LATER_TURNS, FAIRY_REVIVE_SHARE, LIZARD_TAIL_REVIVE_SHARE, FIGHT_END_HEALS;
var init_combat_plan = __esm({
  "src/reflex/combat-plan.ts"() {
    "use strict";
    init_questions();
    init_silent_phase_reference();
    init_silent_loss_reference();
    init_silent_simulation_reference();
    init_narrow();
    init_run_brief();
    init_jev_hints();
    init_move_model();
    init_card_model();
    init_potion_mc();
    init_turn_solver();
    init_json();
    init_passive_pieces();
    init_start_loss();
    init_combat();
    init_fight_plan();
    init_permafrost();
    init_fight_plays();
    init_relic_values();
    init_rest();
    init_boss_clock();
    init_rollout_live();
    init_experience();
    init_potion_equivalents();
    init_potion_cost();
    init_monster_db();
    init_mechanics();
    init_jev_experience();
    init_boss_lines();
    init_double_boss();
    init_compute_memo();
    init_thief();
    init_draws();
    init_explore();
    init_judge();
    init_random_target();
    MODELLED_ENEMY_POWERS = /* @__PURE__ */ new Set([
      "VULNERABLE_POWER",
      "WEAK_POWER",
      "STRENGTH_POWER",
      "ARTIFACT_POWER",
      "INTANGIBLE_POWER",
      "SLIPPERY_POWER",
      // silent-0216: poison is already carried by enemySims and resolved by the solver.
      "POISON_POWER",
      "HARDENED_SHELL_POWER",
      "THORNS_POWER",
      "CURL_UP_POWER",
      "FLUTTER_POWER",
      "HARD_TO_KILL_POWER",
      "SLOW_POWER",
      "ILLUSION_POWER",
      "MINION_POWER",
      "TERRITORIAL_POWER",
      "PLOW_POWER",
      "ESCAPE_ARTIST_POWER",
      "PLATING_POWER",
      "SLUMBER_POWER",
      "INFESTED_POWER",
      "SWIPE_POWER",
      "IMBALANCED_POWER",
      "RITUAL_POWER",
      "SHRINK_POWER",
      "GUARDED_POWER",
      "SOAR_POWER",
      "SKITTISH_POWER",
      "REFLECT_POWER",
      "SUCK_POWER",
      "PAINFUL_STABS_POWER",
      "PAPER_CUTS_POWER",
      "CRAB_RAGE_POWER",
      "BURROWED_POWER",
      "RAMPART_POWER",
      "STEAM_ERUPTION_POWER",
      "REATTACH_POWER",
      "SANDPIT_POWER",
      "ASLEEP_POWER",
      "ENRAGE_POWER",
      "ADAPTABLE_POWER",
      "NEMESIS_POWER",
      // Infested Prism: every Skill gives us Tainted (`vitalSpark`); left unmodelled it cut our damage by 20%.
      "VITAL_SPARK_POWER",
      // Surrounded's back attack is in the intents (backAttack in turn-solver.ts); left unmodelled, it cut
      // our damage by 20% (PLC F33 T8: Twin Strike 11x2 planned as 8x2, Crusher left at 2 not 8).
      "BACK_ATTACK_LEFT_POWER",
      "BACK_ATTACK_RIGHT_POWER",
      "WITHERING_PRESENCE_POWER",
      "DEMISE_POWER",
      // Terror Eel: stunned at half HP (`shriek`); left unmodelled it cut our damage by 20%.
      "SHRIEK_POWER",
      // Axebot: revives from Stock (`stock`); left unmodelled it cut our damage by 20% and a kill that only
      // revived it read as lethal three times (U6W7 F39).
      "STOCK_POWER",
      // Entomancer: a Dazed per hit (`dazedPerHit`); left unmodelled it cut our damage by 20% (M812 F28).
      "PERSONAL_HIVE_POWER",
      // Terror Eel: Vigor adds to its own next attack (in the intent when that is this turn's; the rollout
      // carries it to later turns). Left unmodelled it cut our damage by 20% (XLJQ6FPQAU7N F7: T3/T5/T6
      // predicted 26/16/19, dealt 33/21/26).
      "VIGOR_POWER",
      // Battleworn Dummy event: turns left to kill it (`timeLimit`); left unmodelled it cut our damage by 20%
      // (SK1USHSB1U7U F43: 144 of 150 in the 3 turns).
      "BATTLEWORN_DUMMY_TIME_LIMIT_POWER",
      // Coverage review 2026-09-29 #3: the 0.8 cut fired on 6% of logged turns, damage then 1.16-1.2x the plan.
      // Corpse Slug: stunned and stronger when another enemy dies (`ravenous`).
      "RAVENOUS_POWER",
      // No number of this turn's fight in them: gold stolen and given back (Gremlin Merc, Fat Gremlin), the Tough
      // Egg's hatch countdown (its moves after it are the move model's), our Strength/Dexterity given back on
      // death (The Lost, The Forgotten; its stolen Dexterity is its block, not our damage).
      "THIEVERY_POWER",
      "HEIST_POWER",
      "HATCH_POWER",
      "POSSESS_STRENGTH_POWER",
      "POSSESS_SPEED_POWER",
      "DEXTERITY_POWER",
      // Galvanic (Globe Head): not a number-free power after all. Its 「受到6点伤害」 is in every Power's own text in hand, and
      // the solver now takes it from there (card-model playSelfDamageOf -> selfDamage, through our block). It was read as
      // nothing: playing Powers under it read free, +1.04 a turn on 70 logged turns (+1.68 on those not won), 30 of 31
      // plays lost 6 of HP + block (notes/mechanics-proposals.md §4).
      "GALVANIC_POWER",
      // Our temporary Strength loss on it (Mangle, Dark Shackles, Shackling Potion, Piercing Wail): already in its
      // STRENGTH_POWER and intents, and the rollout gives it back after the turn.
      "MANGLE_POWER",
      "DARK_SHACKLES_POWER",
      "SHACKLING_POTION_POWER",
      "PIERCING_WAIL_POWER",
      // Zapbot: +2 Strength at the end of its turn, like Territorial (scaling; the rollout grows it).
      "HIGH_VOLTAGE_POWER",
      // Gremlin Merc: on death a Fat and a Sneaky Gremlin (`spawnsOnDeath`, like the Phrog's Infested).
      "SURPRISE_POWER"
    ]);
    POWER_NOTES = {
      SANDPIT_POWER: " (countdown: -1 every enemy turn; at 0 I die whatever my HP and block; each Frantic Escape played +1)",
      ASLEEP_POWER: " (asleep, no attacks: the first HP damage wakes it at once, block damage does not; set up powers instead of chipping it)",
      SLUMBER_POWER: " (sleeping, no attacks: -1 each turn and -1 per hit that takes HP; wakes at 0)",
      CRAB_RAGE_POWER: " (when its partner dies it gains 99 Block and +6 Strength: the Block lasts one turn: past runs won 9/12 when the Rocket died first and 8/39 with both alive to the end, so put single-target damage into the Rocket and block the turn after it dies; start-of-turn damage to all enemies (Mercury Hourglass 3, Inferno) kills a partner left that low; enemy Block you see now is gone by the start of your next turn)",
      // Test Subject (2WUMK6PK5QHD): three phases, 100 / 200 / 300 HP.
      ADAPTABLE_POWER: " (another phase follows: at 0 HP it spends one turn reviving (no attack), then returns at full, higher max HP with Vulnerable/Strength cleared; killing this phase does NOT end the fight, keep HP for the next one)",
      ENRAGE_POWER: " (+N Strength every time I play a Skill, raising this turn's attack too: prefer Attacks)",
      PAINFUL_STABS_POWER: " (every unblocked hit shuffles a Wound into my discard pile; Test Subject's Multi Claw gains 1 hit every turn: block it fully)",
      NEMESIS_POWER: " (gains 1 Intangible at the end of every 2nd turn)",
      // Nemesis gives Intangible only every 2nd turn (ZANM F48: "many small hits" misled every turn).
      INTANGIBLE_POWER: " (while it lasts every hit and HP loss is reduced to 1: block or set up now, save big hits for the turns without it)",
      WITHERING_PRESENCE_POWER: " (every 6 cards I play, counted across turns, add an unplayable Wither to my hand: it deals its damage at the end of my turn while held, blockable, +3 each Increasing Intensity; play fewer, bigger cards)",
      ARTIFACT_POWER: " (each stack negates one debuff: Vulnerable, Weak, Demise, Strength loss; strip it with cheap debuffs before a debuff potion)",
      // XJWF F22: seven turns killing the Parafright, the Obscura 96 -> 76, dead at 13 HP.
      ILLUSION_POWER: " (illusion: back at full HP next turn even if killed; damage into it is wasted, killing it only cancels this turn's attack; it leaves when its summoner dies: hit the summoner)",
      STOCK_POWER: " (revives left: at 0 HP it comes straight back at full, higher max HP with Stock -1, and that turn does Boot Up (10 Block, +3 Strength, no attack), then attacks harder every turn; a kill with Stock left does NOT end the fight: its real HP is current HP + Stock x max HP, so block rather than race it)",
      SHRIEK_POWER: " (the first time its HP drops to this or below it is stunned: this turn's attack is cancelled)",
      BATTLEWORN_DUMMY_TIME_LIMIT_POWER: " (turns left to kill it, this one included: when they run out the fight ends without the reward; it never attacks, so only damage counts, and setup that pays after the last turn is worth nothing)",
      VIGOR_POWER: " (its next attack deals this much more per hit: already in the intent when that attack is this turn's, else it waits for the next one)",
      RAVENOUS_POWER: " (when another enemy dies it eats the corpse: stunned for the rest of this turn, so its attack now is cancelled, and it gains this much Strength for the fight)",
      INFESTED_POWER: " (when it dies it spawns more enemies (Phrog Parasite: 4 Wrigglers); they do not attack the turn they arrive; killing it does NOT end the fight)",
      SURPRISE_POWER: " (when it dies a Fat Gremlin and a Sneaky Gremlin appear; killing it does NOT end the fight)"
    };
    VULNERABLE_PAYOFFS = /* @__PURE__ */ new Set(["DISMANTLE", "BULLY", "MOLTEN_FIST", "DOMINATE"]);
    BEATING_REMNANT_CAP = 20;
    FIGHT_NODES = ["Monster", "Unknown", "Elite"];
    ELITE_LOOKAHEAD = 3;
    BOSS_FLOORS2 = [17, 33, 48];
    OFFENSIVE_POTIONS = /* @__PURE__ */ new Set([
      "FIRE_POTION",
      "EXPLOSIVE_AMPOULE",
      "STRENGTH_POTION",
      "FLEX_POTION",
      "VULNERABLE_POTION",
      "FEAR_POTION",
      "ATTACK_POTION",
      "POWDERED_DEMISE",
      "GIGANTIFICATION_POTION",
      "DUPLICATOR",
      "ENERGY_POTION",
      "POTION_SHAPED_ROCK"
    ]);
    BLUNTS_HIT = /格挡|block|无实体|intangible|伤害减少|less damage|荆棘|thorns|虚弱|weak/i;
    LEADER_RULE_EXEMPT = /* @__PURE__ */ new Set(["QUEEN"]);
    targetOptions = { enabled: true };
    plannerTiming = { last: null };
    thiefTrace = { enabled: false, last: null };
    JEV_DATA_OVER_GUIDES = "When a fight hint, the run plan or a guide conflicts with the experience base (experience) or measured data (the options' numbers, rollouts, outcome statistics), go with the data.";
    JEV_FIGHT_LESSONS = 4;
    MAX_OPTIONS = 10;
    HP_GUARD_FIGHT_BUDGET = 24;
    HP_GUARD_MIN_SLACK = 8;
    guardLoss = (plan) => plan.outcome.hpLoss;
    ERUPTION_BLOCK = 12;
    ERUPTION_FALLBACK_DAMAGE = 16;
    SIPHON_FALLBACK = { first: 4, period: 5 };
    HALLWAY_ELITES = /* @__PURE__ */ new Set(["SLUMBERING_BEETLE", "LOUSE_PROGENITOR", "FROG_KNIGHT"]);
    BOULDER_SETTLE_MS = 2500;
    INTIMIDATING_HELMET_BLOCK = 4;
    PAPER_PHROG_VULNERABLE = 1.75;
    CLOAK_CLASP_BLOCK = 1;
    PAELS_TEARS_ENERGY = 2;
    RED_SKULL_STRENGTH = 3;
    CLAY_BLOCK = 3;
    MERCURY_HOURGLASS_DAMAGE2 = 3;
    SHURIKEN_ATTACKS = 3;
    SHURIKEN_STRENGTH = 1;
    LOST_WISP_DAMAGE = 8;
    WITHER_EVERY = 6;
    slAvoidFails = /* @__PURE__ */ new WeakMap();
    slPoints = /* @__PURE__ */ new WeakMap();
    slCommitted = null;
    slAvoidFailed = null;
    slReplayedCode = null;
    CODE_POINTS = /* @__PURE__ */ new Set(["combat/plan", "combat/plan-guarded", "combat/lethal", "combat/least-loss", "combat/mod-lethal"]);
    leastLossFacts = /* @__PURE__ */ new WeakMap();
    drawBounds = /* @__PURE__ */ new WeakMap();
    RANDOM_SPECIALS = /* @__PURE__ */ new Set(["thrash", "gamble", "chaos", "snecko", "glowwater", "bottled"]);
    DRAW_TEXT = /抽|draw/i;
    PILE_TEXT = /抽牌堆|draw pile/i;
    ANY_DRAW_INDEX = 2e3;
    anyDrawOptions = { maxNodes: 15e4, budgetMs: ANY_DRAW_BUDGET_MS };
    HAND_TEXT = /手牌|your hand|in hand|into hand/i;
    ON_DRAW_TEXT = /抽到|when (?:this card is )?drawn|whenever you draw|draw a card/i;
    HP_SAVE_TEXT = /回复|恢复|治疗|heal|缓冲|buffer|无实体|intangible|最大生命|max hp/i;
    HAND_SPECIALS = /* @__PURE__ */ new Set(["thrash", "fiend_fire", "second_wind", "primal_force", "free_card", "gamble", "snecko", "glowwater", "bottled", "ashwater", "chaos"]);
    ON_DRAW_KNOWN = /* @__PURE__ */ new Set(["HELLRAISER_POWER", "CHAINS_OF_BINDING_POWER"]);
    NUMBER_LOWERING_POWERS = /* @__PURE__ */ new Set(["FRAIL_POWER"]);
    CARD_NUMBER_RELICS = {
      STRIKE_DUMMY: (card) => isStrikeCard(card),
      FAKE_STRIKE_DUMMY: (card) => isStrikeCard(card),
      MINIATURE_CANNON: (card) => card.type === "Attack" && card.upgraded,
      MYSTIC_LIGHTER: (card) => card.type === "Attack",
      CHEMICAL_X: (card) => card.xCost,
      // Pael's Legion doubles one card's Block; Vitruvian Minion doubles the Minion cards; Paper Krane makes Weak take 40%.
      PAELS_LEGION: (card) => card.block > 0,
      VITRUVIAN_MINION: (card) => card.name.includes("\u4EC6\u4ECE") || /minion/i.test(card.name),
      PAPER_KRANE: (card) => card.weak > 0,
      // Ghost Seed makes Strikes and Defends Ethereal: Feel No Pain's block for them when held.
      GHOST_SEED: (card) => isStrikeCard(card) || /DEFEND/.test(card.cardId),
      // Reptile Trinket: Strength when a potion is drunk (a line drinking one after the draw).
      REPTILE_TRINKET: () => true
    };
    SL_KNOWN_DRAW_INDEX = 700;
    KNOWN_DRAWS_NAMED = 10;
    TAKE_WAIT_MS = 4e3;
    UNSIMULATED_OFFERED = "always: every potion that can be drunk is an option (a 0-cost one-shot card); its effect is not in the numbers";
    MAX_POTION_LETHAL_LINES = 4;
    EXHAUST_PICKERS2 = /* @__PURE__ */ new Set(["BURNING_PACT"]);
    LATER_TURNS = 8;
    FAIRY_REVIVE_SHARE = 0.3;
    LIZARD_TAIL_REVIVE_SHARE = 0.5;
    FIGHT_END_HEALS = { BURNING_BLOOD: RELIC_VALUES["BURNING_BLOOD"]?.["Heal"] ?? 6, MEAT_ON_THE_BONE: 12 };
  }
});

// src/sim/boss-start.ts
import { readFileSync as readFileSync16 } from "node:fs";
function passiveSimRelic(id, enabled = passivePiecesOptions.enabled) {
  return enabled && PASSIVE_SIM_RELICS.includes(id);
}
function loadMonsterDb() {
  if (dbCache2) return dbCache2;
  try {
    const parsed = readMonsterDbJson();
    dbCache2 = { bosses: parsed.bosses ?? {}, encounters: parsed.encounters ?? {}, monsters: parsed.monsters ?? {} };
  } catch {
    dbCache2 = { bosses: {}, encounters: {}, monsters: {} };
  }
  return dbCache2;
}
function loadMoveModel() {
  if (mmCache2) return mmCache2;
  try {
    mmCache2 = JSON.parse(readFileSync16(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8"));
  } catch {
    mmCache2 = {};
  }
  return mmCache2;
}
function isRandomPotion(id) {
  return id !== null && (id in CHOICE_POTIONS || id in DRAW_POTIONS);
}
function bossKey(bossId) {
  return bossId.toUpperCase().replace(/_BOSS$/, "");
}
function modeKey(counts) {
  const best = Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : null;
}
function nameOf2(id, db, knowledge) {
  return knowledge?.monster(id)?.name || db.monsters[id]?.name?.zh || id;
}
function bossOpening(bossId, asc, db, knowledge) {
  const key = bossKey(bossId);
  const byAsc = db.bosses[key];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const entry = byAsc[found.key];
  const fightsAt = (key2) => byAsc[key2]?.fights ?? 0;
  const counts = Object.entries(entry.parts ?? {}).map(([id, range]) => ({ id, count: Math.max(1, Math.round(range.count_per_fight ?? 1)) }));
  if (counts.length === 0) return null;
  const order = BOSS_POSITIONS[key] ?? [];
  const minion = (id) => Object.keys(db.monsters[id]?.powers ?? {}).includes("MINION_POWER");
  const ids = order.length > 0 && order.every((id) => counts.some((c) => c.id === id)) ? order : counts.sort((a, b) => Number(minion(b.id)) - Number(minion(a.id)) || a.id.localeCompare(b.id)).flatMap((c) => Array.from({ length: c.count }, () => c.id));
  const seen = /* @__PURE__ */ new Map();
  const parts = ids.map((id, index) => {
    const nth = seen.get(id) ?? 0;
    seen.set(id, nth + 1);
    const mon = db.monsters[id];
    const hpAt = nearestAscension(mon?.hp_by_asc, asc);
    const range = hpAt ? mon.hp_by_asc[hpAt.key] : entry.parts?.[id];
    const median = range?.median ?? range?.min ?? 0;
    const hp = Number.isInteger(median) ? median : nth % 2 === 0 ? Math.ceil(median) : Math.floor(median);
    const firsts = Object.entries(mon?.moves ?? {}).map(([move2, m]) => [move2, m.turns_seen?.["1"] ?? 0]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([move2]) => move2);
    const powers = {};
    const estimated = {};
    for (const [powerId, power] of Object.entries(mon?.powers ?? {})) {
      if (OUR_DEBUFFS.has(powerId)) continue;
      const byTurn = Object.entries(power.turn_at_first_sight_by_asc ?? {}).filter(([key2]) => fightsAt(key2) > 0);
      const onTurn1 = byTurn.reduce((sum, [, turns]) => sum + (turns["1"] ?? 0), 0);
      const fights = byTurn.reduce((sum, [key2]) => sum + fightsAt(key2), 0);
      if (fights === 0 || onTurn1 < INNATE_POWER_SHARE * fights) continue;
      const at2 = startAmountAt(db.monsters, id, powerId, asc);
      const amount = at2?.value ?? Number(modeKey(power.amount_at_first_sight) ?? 1);
      powers[powerId] = Number.isFinite(amount) ? amount : 1;
      if (at2?.estimated) estimated[powerId] = amountEstimateNote(at2, asc);
    }
    const move = firsts.length > 0 ? firsts[nth % firsts.length] : null;
    return { index, id, name: nameOf2(id, db, knowledge), hp, move, powers, ...Object.keys(estimated).length > 0 ? { estimated } : {} };
  });
  return { key, name: BOSS_NAMES[key] ?? nameOf2(key, db, knowledge), asc: Number(found.key), exact: found.exact, parts };
}
function fightStartRelics(runRaw, knowledge) {
  const total = { strength: 0, dexterity: 0, block: 0, vigor: 0, thorns: 0, plating: 0, energy: 0, draw: 0, enemyVulnerable: 0, enemyWeak: 0, enemyStrength: 0 };
  const applied = [];
  const unmodelled = [];
  for (const raw of asArray(runRaw["relics"]).map(asRecord)) {
    const id = str(raw["relic_id"]);
    const name = str(raw["name"], knowledge?.relic(id)?.name ?? id);
    const rule = FIGHT_START_RELICS[id];
    if (rule) {
      const effect = rule(typeof raw["stack"] === "number" ? raw["stack"] : null);
      if (effect) {
        for (const [k, v] of Object.entries(effect)) total[k] += v;
        applied.push(name);
      }
      continue;
    }
    if (MODELLED_ELSEWHERE.has(id) || passiveSimRelic(id)) continue;
    if (id === "DAUGHTER_OF_THE_WIND" && str(runRaw["character_id"]).toLowerCase() === "silent") continue;
    if (id === "TUNING_FORK" && passivePiecesOptions.enabled && str(runRaw["character_id"]).toLowerCase() === "silent") continue;
    const text = knowledge?.relic(id)?.description ?? str(raw["description"]);
    if (FIGHT_TEXT.test(text)) unmodelled.push(name);
  }
  return { total, applied, unmodelled };
}
function handEntry(raw, index, targets, knowledge) {
  const info = knowledge.card(str(raw["card_id"]));
  const single = info?.target === "AnyEnemy";
  return { ...raw, index, target_type: info?.target ?? "", requires_target: single, valid_target_indices: single ? targets : [], playable: true, can_play_result: true };
}
function powerList(powers) {
  return Object.entries(powers).filter(([, amount]) => amount !== 0).map(([power_id, amount], index) => ({ index, power_id, name: power_id, amount }));
}
function syntheticBossState(state, knowledge, opening, entryHp, db, mm) {
  const raw = JSON.parse(JSON.stringify(state.raw));
  const run = asRecord(raw["run"]);
  if (Array.isArray(run["potions"])) {
    run["potions"] = run["potions"].map((slot) => {
      const entry = asRecord(slot);
      return str(entry["potion_id"]) === "FRUIT_JUICE" ? { ...entry, potion_id: null, name: null, occupied: false, can_use: false } : slot;
    });
  }
  const maxHp = typeof run["max_hp"] === "number" ? run["max_hp"] : entryHp;
  const hp = Math.max(1, Math.min(maxHp, Math.round(entryHp)));
  run["current_hp"] = hp;
  const relics = fightStartRelics(run, knowledge);
  const r = relics.total;
  for (const relic of asArray(run["relics"]).map(asRecord)) {
    if (str(relic["relic_id"]) === "HAPPY_FLOWER") relic["stack"] = ((typeof relic["stack"] === "number" ? relic["stack"] : 0) + 1) % 3;
  }
  const asc = state.run?.ascension ?? opening.asc;
  const maxEnergy = typeof run["max_energy"] === "number" && run["max_energy"] > 0 ? run["max_energy"] : 3;
  const energy = maxEnergy + relicEnergyOf(run).filter((e) => e.from <= 1).length + r.energy;
  const playerPowers2 = { STRENGTH_POWER: r.strength, DEXTERITY_POWER: r.dexterity, VIGOR_POWER: r.vigor, THORNS_POWER: r.thorns, PLATING_POWER: r.plating };
  if (opening.parts.some((part) => (part.powers["BACK_ATTACK_LEFT_POWER"] ?? 0) > 0 || (part.powers["BACK_ATTACK_RIGHT_POWER"] ?? 0) > 0)) playerPowers2["SURROUNDED_POWER"] = 1;
  const targets = opening.parts.map((p) => p.index);
  const enemies = opening.parts.map((part) => {
    const powers = { ...part.powers };
    for (const [powerId, amount] of [["VULNERABLE_POWER", r.enemyVulnerable], ["WEAK_POWER", r.enemyWeak]]) {
      if (amount <= 0) continue;
      if ((powers["ARTIFACT_POWER"] ?? 0) > 0) powers["ARTIFACT_POWER"] = powers["ARTIFACT_POWER"] - 1;
      else powers[powerId] = (powers[powerId] ?? 0) + amount;
    }
    if (r.enemyStrength) powers["STRENGTH_POWER"] = (powers["STRENGTH_POWER"] ?? 0) + r.enemyStrength;
    const table2 = enemyTable(part.id, asc, db.monsters, mm);
    const tableMove = part.move ? table2?.moves[part.move] : void 0;
    const logged = part.move ? moveDamageAt(db.monsters, part.id, part.move, asc) : null;
    const behind = (part.powers["BACK_ATTACK_LEFT_POWER"] ?? 0) > 0 ? 1.5 : 1;
    const move = tableMove && tableMove.damage > 0 && logged ? { damage: Math.floor((logged.base ?? logged.perHit) * behind), hits: logged.hits } : tableMove;
    const kinds = (modeKey(part.move ? db.monsters[part.id]?.moves?.[part.move]?.intents : void 0) ?? (move && move.damage > 0 ? "Attack" : "Unknown")).split("+");
    const strength = powers["STRENGTH_POWER"] ?? 0;
    const hit = move ? Math.max(0, Math.floor((move.damage + strength) * ((powers["WEAK_POWER"] ?? 0) > 0 ? 0.75 : 1))) : 0;
    const intents = kinds.map(
      (kind, index) => kind === "Attack" && move && move.damage > 0 ? { index, intent_type: "Attack", damage: hit, hits: move.hits, total_damage: hit * move.hits } : { index, intent_type: kind, damage: null, hits: null }
    );
    return {
      index: part.index,
      enemy_id: part.id,
      name: part.name,
      current_hp: part.hp,
      max_hp: part.hp,
      base_max_hp: part.hp,
      // A sleeper's Plating is up as block from the start (the Matriarch: 12 block on every logged first frame).
      block: powers["ASLEEP_POWER"] ? powers["PLATING_POWER"] ?? 0 : 0,
      is_alive: true,
      is_hittable: true,
      powers: powerList(powers),
      intent: part.move,
      move_id: part.move,
      intents
    };
  });
  for (const potion of asArray(run["potions"]).map(asRecord)) {
    if (potion["occupied"] !== true) continue;
    potion["can_use"] = str(potion["usage"]) !== "Automatic";
    const aimed = str(potion["target_type"]) === "AnyEnemy";
    potion["requires_target"] = aimed;
    potion["valid_target_indices"] = aimed ? targets : [];
  }
  const deck = asArray(run["deck"]).map(asRecord);
  const draw = OPENING_HAND + r.draw;
  const hand = deck.slice(0, Math.min(OPENING_HAND, deck.length)).map((card, i) => handEntry(card, i, targets, knowledge));
  raw["screen"] = "COMBAT";
  raw["in_combat"] = true;
  raw["turn"] = 1;
  raw["available_actions"] = ["end_turn", "play_card", "use_potion"];
  for (const key of ["shop", "rest", "reward", "event", "selection", "map", "chest", "bundles", "capstone", "modal", "agent_view", "crystal_sphere", "game_over"]) raw[key] = null;
  raw["combat"] = {
    action_readiness: { can_use_combat_actions: true },
    player: {
      current_hp: hp,
      max_hp: maxHp,
      block: r.block + relicBlockOf(run).filter((b) => b.turn === 1).reduce((sum, b) => sum + b.amount, 0),
      energy,
      stars: 0,
      focus: 0,
      powers: powerList(playerPowers2),
      cards_played_this_turn: 0,
      attacks_played_this_turn: 0,
      skills_played_this_turn: 0
    },
    hand,
    enemies
  };
  return { state: parseGameState(raw), draw, relics };
}
function moveRulesSwitch() {
  const config = loadConfig({ MECH_RULES: process.env["MECH_RULES"], MECH_MOVE_RULES: process.env["MECH_MOVE_RULES"] });
  return config.mechRules && config.mechMoveRules;
}
function deathMoveSwitch() {
  const config = loadConfig({ MECH_RULES: process.env["MECH_RULES"], MECH_DEATH_MOVE: process.env["MECH_DEATH_MOVE"] });
  return config.mechRules && config.mechDeathMove;
}
function syntheticBossStart(state, knowledge, bossId, entryHp, opts = {}) {
  const db = opts.db ?? loadMonsterDb();
  const mm = opts.mm ?? loadMoveModel();
  const asc = state.run?.ascension ?? 0;
  const opening = bossOpening(bossId, asc, db, knowledge);
  if (!opening) throw new Error(`no boss ${bossId} in the monster DB`);
  const synth = syntheticBossState(state, knowledge, opening, entryHp, db, mm);
  const s = synth.state;
  const env = {
    state: s,
    knowledge,
    brief: buildRunBrief(s, knowledge),
    screenMemory: createScreenMemory("COMBAT"),
    thresholds: loadConfig({}).thresholds,
    // MECH_MOVE_RULES (the Kaiser Crab's back attack needing both claws, the learned move changes) as the loop runs it
    // (its .env is in process.env), off with MECH_RULES off; the rest of this start does not read the config.
    mechMoveRules: moveRulesSwitch(),
    // MECH_DEATH_MOVE (the learned "an ally's death changes my move" rules: the Queen once the Amalgam dies) likewise.
    mechDeathMove: deathMoveSwitch(),
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
    jevContext: "off",
    fightPlan: "off"
  };
  let captured = null;
  const rollout = rolloutLiveOptions.enabled;
  solveTap.onSolve = (input2, result) => {
    captured ??= { input: input2, result };
  };
  rolloutLiveOptions.enabled = false;
  try {
    planCombatTurn(env);
  } finally {
    solveTap.onSolve = null;
    rolloutLiveOptions.enabled = rollout;
  }
  const cap = captured;
  if (!cap) throw new Error("the planner built no board for the synthetic boss frame");
  const board2 = boardRolloutInput(s, knowledge, cap.input, asc, db.monsters, mm);
  const { handBase: _handBase, solver, ...boardInput } = board2;
  const potions = solver.hand.filter((card) => card.type === "Potion" && !isRandomPotion(potionIdOf(card.cardId)));
  const meta = { ...fightMetaOf(s, knowledge, createScreenMemory("COMBAT")), kind: "boss", t: 1 };
  const input = {
    ...boardInput,
    solver: { ...solver, hand: potions, cardsPlayedThisTurn: 0, turn: 1, player: { ...solver.player, hp: s.run?.current_hp ?? entryHp } },
    plans: [],
    piles: { draw: deckModels(s, knowledge), discard: [], handBase: potions.map(() => null) },
    meta,
    mm,
    model: null,
    gates: null,
    fightRelics: fightRelicsOf(asRecord(s.run?.raw), 1),
    options: { drawFirst: synth.draw }
  };
  return { input, boss: opening, relics: { applied: synth.relics.applied, unmodelled: synth.relics.unmodelled }, entryHp: s.run?.current_hp ?? entryHp, maxHp: s.run?.max_hp ?? entryHp };
}
var OPENING_HAND, INNATE_POWER_SHARE, OUR_DEBUFFS, FIGHT_START_RELICS, MODELLED_ELSEWHERE, FIGHT_TEXT, BOSS_NAMES, BOSS_POSITIONS, dbCache2, mmCache2;
var init_boss_start = __esm({
  "src/sim/boss-start.ts"() {
    "use strict";
    init_config();
    init_monster_db();
    init_schema();
    init_run_brief();
    init_types();
    init_combat_plan();
    init_boss_clock();
    init_card_model();
    init_passive_pieces();
    init_potion_cost();
    init_rollout_live();
    init_turn_solver();
    init_json();
    init_files();
    OPENING_HAND = 5;
    INNATE_POWER_SHARE = 0.8;
    OUR_DEBUFFS = /* @__PURE__ */ new Set(["VULNERABLE_POWER", "WEAK_POWER", "POISON_POWER", "FRAIL_POWER", "SHRINK_POWER", "DEMISE_POWER", "DOOM_POWER", "STRENGTH_POWER"]);
    FIGHT_START_RELICS = {
      VAJRA: () => ({ strength: 1 }),
      GIRYA: (stack) => stack && stack > 0 ? { strength: stack } : null,
      EMBER_TEA: (stack) => stack && stack > 0 ? { strength: 2 } : null,
      TOASTY_MITTENS: () => ({ strength: 1 }),
      BRIMSTONE: () => ({ strength: 2, enemyStrength: 1 }),
      ODDLY_SMOOTH_STONE: () => ({ dexterity: 1 }),
      ANCHOR: () => ({ block: 10 }),
      GORGET: () => ({ plating: 4 }),
      BRONZE_SCALES: () => ({ thorns: 3 }),
      AKABEKO: () => ({ vigor: 8 }),
      BAG_OF_MARBLES: () => ({ enemyVulnerable: 1 }),
      RED_MASK: () => ({ enemyWeak: 1 }),
      LANTERN: () => ({ energy: 1 }),
      VENERABLE_TEA_SET: () => ({ energy: 2 }),
      SEAL_OF_GOLD: () => ({ energy: 1 }),
      VERY_HOT_COCOA: () => ({ energy: 4 }),
      // Its counter ticks at the start of each turn: 1 energy on turn 1 when it stands at 2 before the fight.
      HAPPY_FLOWER: (stack) => ((stack ?? 0) + 1) % 3 === 0 ? { energy: 1 } : null,
      BAG_OF_PREPARATION: () => ({ draw: 2 }),
      PAELS_BLOOD: () => ({ draw: 1 })
    };
    MODELLED_ELSEWHERE = /* @__PURE__ */ new Set([
      ...ENERGY_RELICS,
      "CAPTAINS_WHEEL",
      "CANDELABRA",
      "CHANDELIER",
      "HORN_CLEAT",
      "SHURIKEN",
      "MUSIC_BOX",
      "CLOAK_CLASP",
      "PAELS_TEARS",
      "RED_SKULL",
      "SELF_FORMING_CLAY",
      "DEMON_TONGUE",
      "INTIMIDATING_HELMET",
      "BEATING_REMNANT",
      "PAPER_PHROG",
      "FIDDLE",
      "KUSARIGAMA",
      "VAMBRACE",
      "MERCURY_HOURGLASS",
      "LIZARD_TAIL",
      "BIIIG_HUG",
      "PEN_NIB",
      "SAI",
      "LOST_WISP"
    ]);
    FIGHT_TEXT = /战斗开始时|战斗中|回合开始时|回合结束时|每回合|每当|第\s*\d+\s*回合|打出|格挡|力量|敏捷|能量|抽|伤害|at the start of|each turn|whenever|combat/i;
    BOSS_NAMES = { THE_KIN: "\u540C\u65CF", KAISER_CRAB: "\u5E1D\u738B\u87F9", TEST_SUBJECT: "\u5B9E\u9A8C\u4F53" };
    BOSS_POSITIONS = {
      THE_KIN: ["KIN_FOLLOWER", "KIN_FOLLOWER", "KIN_PRIEST"],
      QUEEN: ["TORCH_HEAD_AMALGAM", "QUEEN"],
      KAISER_CRAB: ["CRUSHER", "ROCKET"]
    };
  }
});

// tools/boss-sim/backtest-board.ts
function randomPotionsOf(state, knowledge, solver) {
  const relics = (Array.isArray(asRecord3(state.run?.raw)["relics"]) ? asRecord3(state.run?.raw)["relics"] : []).map((r) => String(asRecord3(r)["relic_id"] ?? ""));
  const ctx = { enemyTargets: solver.enemies.filter((e) => e.hp > 0).map((e) => e.index), strength: solver.player.strengthNow ?? 0, weak: solver.player.weak };
  const cards = [];
  const sources = [];
  for (const potion of potionViews({ raw: asRecord3(state.run?.raw) }, knowledge).filter((p) => p.can_use)) {
    const source = randomPotionSource(potion, state, knowledge, ctx, relics.includes("FIDDLE"));
    const card = source ? modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, ctx) : null;
    if (!source || !card) continue;
    cards.push(card);
    sources.push(source);
  }
  return { cards, sources };
}
function boardOf(state, knowledge, encounter, db, mm, opts = {}) {
  const config = loadConfig(process.env);
  const env = {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
    jevContext: "off",
    fightPlan: "off",
    // MECH_MOVE_RULES as configured (MECH_MOVE_RULES=off in the environment: the backtest as before it).
    mechMoveRules: config.mechRules && config.mechMoveRules,
    // MECH_DEATH_MOVE likewise (MECH_DEATH_MOVE=off: the backtest as before it).
    mechDeathMove: config.mechRules && config.mechDeathMove
  };
  bossLinesOptions.enabled = false;
  let captured = null;
  solveTap.onSolve = (input2, result2) => {
    captured ??= { input: input2, result: result2 };
  };
  try {
    planCombatTurn(env);
  } finally {
    solveTap.onSolve = null;
  }
  const cap = captured;
  if (!cap || cap.result.plans.length === 0) throw new Error("no solve");
  const { input: solved, result } = cap;
  const asc = state.run?.ascension ?? 0;
  const random = opts.randomPotions === false ? { cards: [], sources: [] } : randomPotionsOf(state, knowledge, solved);
  const solver = random.cards.length > 0 ? { ...solved, hand: [...solved.hand, ...random.cards] } : solved;
  const board2 = boardRolloutInput(state, knowledge, solver, asc, db, mm);
  const targets = solver.enemies.filter((e) => e.hp > 0).map((e) => e.index);
  const pileCtx = { enemyTargets: targets, strength: 0, weak: false };
  const view = asRecord3(asRecord3(state.raw["agent_view"])["combat"]);
  const hasPiles = Array.isArray(view["draw"]) || Array.isArray(view["discard"]);
  let draw = hasPiles ? pileCardModels(state, knowledge, "draw", pileCtx) : [];
  const discard = hasPiles ? pileCardModels(state, knowledge, "discard", pileCtx) : [];
  if (!hasPiles) {
    const left = deckModels(state, knowledge);
    for (const card of solver.hand) {
      const at2 = left.findIndex((c) => cardKey3(c) === cardKey3(card));
      if (at2 >= 0) left.splice(at2, 1);
    }
    draw = left;
  }
  const { handBase, ...boardInput } = board2;
  const meta = { ...fightMetaOf(state, knowledge, createScreenMemory("COMBAT")), enc: encounter, kind: "boss" };
  const fightRelics = fightRelicsOf(asRecord3(state.run?.raw), solver.turn ?? meta.t);
  const input = { ...boardInput, plans: result.plans, piles: { draw, discard, handBase }, meta, mm, model: null, gates: null, fightRelics, ...random.sources.length > 0 ? { randomPotions: random.sources } : {} };
  return { input, solver, plans: result.plans, piles: hasPiles ? "logged" : "deck-minus-hand" };
}
function queenOrder(input) {
  const amalgam = input.enemies.filter((e) => e.id === "TORCH_HEAD_AMALGAM" && (input.solver.enemies.find((x) => x.index === e.index)?.hp ?? 0) > 0).map((e) => e.index);
  const queen = input.enemies.filter((e) => e.id === "QUEEN").map((e) => e.index);
  if (amalgam.length === 0 || queen.length === 0) return null;
  return { key: "TORCH_HEAD_AMALGAM>QUEEN", label: "Torch Head Amalgam > Queen", groups: [amalgam, queen] };
}
var asRecord3, cardKey3;
var init_backtest_board = __esm({
  "tools/boss-sim/backtest-board.ts"() {
    "use strict";
    init_config();
    init_narrow();
    init_run_brief();
    init_types();
    init_combat_plan();
    init_boss_lines();
    init_card_model();
    init_rollout_live();
    init_turn_solver();
    asRecord3 = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
    cardKey3 = (c) => `${c.cardId}${c.upgraded ? "+" : ""}`;
  }
});

// tools/boss-sim/pre-fight.ts
function preFightState(t1) {
  const raw = JSON.parse(JSON.stringify(t1));
  const run = raw["run"];
  for (const relic of run["relics"] ?? []) {
    const stack = typeof relic["stack"] === "number" ? relic["stack"] : null;
    if (relic["relic_id"] === "HAPPY_FLOWER") relic["stack"] = ((stack ?? 0) + 2) % 3;
    if (relic["relic_id"] === "EMBER_TEA" && stack !== null) relic["stack"] = stack + 1;
  }
  raw["combat"] = null;
  raw["in_combat"] = false;
  raw["screen"] = "MAP";
  raw["available_actions"] = [];
  return parseGameState(raw);
}
var init_pre_fight = __esm({
  "tools/boss-sim/pre-fight.ts"() {
    "use strict";
    init_schema();
  }
});

// tools/boss-sim/calibration-board.ts
function normalizeCalibrationOpening(raw, opening, db, asc) {
  const provenance = [];
  const combat = raw["combat"];
  const parts = [...opening.parts];
  for (const enemy of combat.enemies) {
    const at2 = parts.findIndex((p) => p.id === enemy["enemy_id"]);
    if (at2 < 0) throw new Error("missing boss part");
    const part = parts.splice(at2, 1)[0];
    enemy["current_hp"] = part.hp;
    enemy["max_hp"] = part.hp;
    enemy["base_max_hp"] = part.hp;
    const hit = moveDamageAt(db.monsters, part.id, String(enemy["move_id"] ?? ""), asc);
    const powers = enemy["powers"] ?? [];
    const power = (id) => powers.find((p) => p.power_id === id)?.amount ?? 0;
    const behind = power("BACK_ATTACK_LEFT_POWER") > 0 ? 1.5 : 1;
    const base = hit ? Math.floor((hit.base ?? hit.perHit) * behind) : 0;
    const shown = Math.max(0, Math.floor((base + power("STRENGTH_POWER")) * (power("WEAK_POWER") > 0 ? 0.75 : 1)));
    provenance.push({
      id: part.id,
      hp: part.hp,
      hpAsc: nearestAscension(db.monsters[part.id]?.hp_by_asc, asc)?.key,
      openingAsc: opening.asc,
      exactOpening: opening.exact,
      hit,
      shown
    });
    if (hit) for (const intent of enemy["intents"]) {
      if (intent["damage"] != null) {
        intent["damage"] = shown;
        intent["hits"] = hit.hits;
        intent["total_damage"] = shown * hit.hits;
      }
    }
  }
  return provenance;
}
var init_calibration_board = __esm({
  "tools/boss-sim/calibration-board.ts"() {
    "use strict";
    init_monster_db();
  }
});

// tools/boss-sim/backtest-runner.ts
var backtest_runner_exports = {};
import { appendFileSync, mkdirSync, readFileSync as readFileSync17, writeFileSync } from "node:fs";
import { join as join5 } from "node:path";
function arg(name, fallback) {
  const at2 = process.argv.indexOf(`--${name}`);
  return at2 >= 0 && process.argv[at2 + 1] !== void 0 ? process.argv[at2 + 1] : fallback;
}
function killOrderOf(input) {
  return orders ? queenOrder(input) : null;
}
function simFacts(line) {
  return {
    samples: line.samples,
    wins: line.wins,
    deaths: line.deaths,
    capped: line.capped,
    winProb: r2(line.winProb),
    hpLoss: line.hpLoss,
    hpLossWon: line.hpLossWon,
    turns: line.turns,
    turnsWon: line.turnsWon,
    deathTurn: line.deathTurn,
    deathTurns: line.deathTurns,
    potions: line.potions,
    enemyHpLeftUnwon: line.enemyHpLeftUnwon,
    // B4: + the mean enemy HP left and block gained at the end of the turn (samples still fighting it).
    perTurn: line.perTurn.slice(0, 16).map((t, k) => {
      const fighting = line.outcomes.filter((o) => o.turns > k);
      const mean = (f) => r2(fighting.reduce((sum, o) => sum + f(o), 0) / Math.max(1, fighting.length));
      return [t.fighting, t.loss, t.dmg, t.incoming, t.enemyLoss, mean((o) => o.enemyHpByTurn?.[k] ?? 0), mean((o) => o.blockByTurn?.[k] ?? 0)];
    }),
    policyTurns: line.policyTurns,
    policyNodes: line.policyNodes,
    // Per sample (won, turns, HP lost), compact: for re-scoring without re-running.
    outcomes: line.outcomes.map((o) => [o.won ? 1 : o.died ? -1 : 0, o.turns, Math.round(o.hpLoss)])
  };
}
async function main() {
  mkdirSync(outDir, { recursive: true });
  const out = join5(outDir, `results-${shard}.jsonl`);
  writeFileSync(out, "");
  const knowledge = makeKnowledge(JSON.parse(readFileSync17(arg("game-data", fromRoot("data/game-data.json")), "utf8")).collections, "cache");
  const mm = JSON.parse(readFileSync17(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8"));
  const db = (character === "silent" ? readMonsterDbJson() : JSON.parse(readFileSync17(knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"), "utf8"))).monsters;
  const monsterDb = loadMonsterDb();
  const model2 = withRollout ? loadFightValueModel() : null;
  const gates = withRollout ? loadFightValueGates() : null;
  const rows = readFileSync17(inPath, "utf8").split("\n").filter((line) => line.trim() !== "");
  let done = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (index % shards !== shard) continue;
    if (limit && done >= limit) break;
    const row = JSON.parse(rows[index]);
    if (character && row.character !== character) throw new Error(`foreign character in ${row.key}`);
    if (keep && !keep.has(row.key)) continue;
    if (encs.length > 0 && !encs.some((e) => row.encounter.includes(e))) continue;
    for (const start of starts) {
      const point = start === "t5" ? row.t5 : row.t1;
      if (!point) continue;
      const base = { key: row.key, start, run: row.run_id, asc: row.asc, act: row.act, floor: row.floor, enc: row.encounter, fightTurns: row.turns, ...character ? { character } : {} };
      const pre = start === "pre" || start === "syn";
      const startHp = pre ? row.entry_hp : point.hp;
      const actual = { won: row.outcome === "won", hp: startHp, turnsLeft: row.turns - (point.turn - 1), hpLoss: startHp - row.end_hp, endHp: row.end_hp };
      let board2;
      let state;
      try {
        const raw = character === "silent" ? structuredClone(point.state) : point.state;
        const provenance = [];
        if (character === "silent") {
          const key = row.encounter.includes("CRUSHER") ? "KAISER_CRAB" : row.encounter.includes("KIN_PRIEST") ? "THE_KIN" : row.encounter.includes("QUEEN") ? "QUEEN" : row.encounter;
          const opening = bossOpening(key, row.asc, monsterDb, knowledge);
          if (!opening) throw new Error(`missing monster-db opening: ${key}`);
          provenance.push(...normalizeCalibrationOpening(raw, opening, monsterDb, row.asc));
        }
        state = parseGameState(raw);
        if (character === "silent") state.raw["calibration_boss_source"] = provenance;
        board2 = boardOf(state, knowledge, row.encounter, db, mm, { randomPotions: !flag("no-random-potions") });
      } catch (error) {
        appendFileSync(out, JSON.stringify({ ...base, actual, error: `board: ${String(error).slice(0, 300)}` }) + "\n");
        continue;
      }
      const line = board2.plans[0];
      let simInput = pre ? redealInput(board2.input, { fresh: true, hp: row.entry_hp }) : board2.input;
      if (start === "syn") {
        try {
          simInput = syntheticBossStart(preFightState(point.state), knowledge, String(state.run?.boss_id ?? ""), row.entry_hp, { db: monsterDb, mm }).input;
        } catch (error) {
          appendFileSync(out, JSON.stringify({ ...base, actual, error: `synthetic: ${String(error).slice(0, 300)}` }) + "\n");
          continue;
        }
      }
      const simLine = pre || startLine === "policy" ? null : line;
      const record = { ...base, ...character ? { character, bossSource: state.raw["calibration_boss_source"] } : {}, actual, piles: board2.piles, hp: simInput.solver.player.hp, drawN: simInput.piles.draw.length, nPlans: board2.plans.length };
      try {
        const t = performance.now();
        const simOpts = { samples, seed: seed + index * 101, scripts, damageScale, hpScale, threat, potionHold };
        if (bestOrder) {
          const res = await runBestOrder(runBossSim, simInput, [simLine], simOpts);
          record["order"] = res.lines[0].order;
          record["orders"] = res.byOrder.map((o) => [o.order, r2(o.result.lines[0].winProb)]);
          record["sim"] = { ...simFacts(res.lines[0]), ms: Math.round(performance.now() - t) };
        } else {
          const order = killOrderOf(board2.input);
          const res = runBossSim(simInput, [simLine], { ...simOpts, order });
          if (order) record["order"] = order.label;
          record["sim"] = { ...simFacts(res.lines[0]), ms: Math.round(performance.now() - t) };
        }
      } catch (error) {
        record["simError"] = String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 600);
      }
      if (withRollout && !pre) {
        try {
          const t = performance.now();
          const res = rolloutDecision({ ...board2.input, model: model2, gates, options: { budgetMs: 1e9, seed: seed + index * 101, k: 1, include: [line] } });
          const l = res.lines.find((x) => x.plan === line) ?? res.lines[0];
          record["rollout"] = {
            hpLoss: r2(l.hpLoss),
            winProb: r2(l.winProb),
            turnsToWin: r2(l.turnsToWin),
            deaths: l.deaths,
            wins: l.wins,
            horizon: l.horizon,
            samples: l.samples,
            w: l.basis.w,
            modelHpLoss: r2(l.modelForecast.rollout?.hpLoss),
            modelWinProb: r2(l.modelForecast.rollout?.winProb),
            ms: Math.round(performance.now() - t)
          };
        } catch (error) {
          record["rolloutError"] = String(error).slice(0, 300);
        }
      }
      if (start === "t1" || pre) {
        try {
          const clock = bossClock(state, knowledge, startHp);
          if (clock) {
            record["clock"] = {
              boss: clock.boss,
              deck: r2(clock.deck),
              need: clock.need,
              gap: clock.gap,
              hp: clock.hp,
              fightTurns: clock.fightTurns,
              survivableTurns: clock.survivableTurns,
              lossPerTurn: clock.lossPerTurn
            };
          }
        } catch (error) {
          record["clockError"] = String(error).slice(0, 300);
        }
      }
      appendFileSync(out, JSON.stringify(record) + "\n");
    }
    done += 1;
  }
  console.error(`boss-sim backtest shard ${shard}/${shards}: ${done} fights -> ${out}`);
}
var flag, character, inPath, outDir, shard, shards, samples, seed, limit, starts, withRollout, scripts, damageScale, hpScale, threat, potionHold, startLine, orders, bestOrder, set, encs, keyFile, keep, r2;
var init_backtest_runner = __esm({
  async "tools/boss-sim/backtest-runner.ts"() {
    "use strict";
    init_knowledge();
    init_schema();
    init_boss_sim();
    init_boss_clock();
    init_fight_value();
    init_rollout();
    init_boss_start();
    init_monster_db();
    init_backtest_board();
    init_pre_fight();
    init_calibration_board();
    init_paths();
    init_files();
    flag = (name) => process.argv.includes(`--${name}`);
    character = arg("character", "");
    if (character) setKnowledgeCharacter(character);
    inPath = arg("in", fromRoot("experiments/boss-sim/raw/fights.jsonl"));
    outDir = arg("out-dir", fromRoot("experiments/boss-sim/raw"));
    shard = Number(arg("shard", "0"));
    shards = Number(arg("shards", "1"));
    samples = Number(arg("samples", "100"));
    seed = Number(arg("seed", "1"));
    limit = Number(arg("limit", "0"));
    starts = arg("starts", "t1,t5").split(",");
    withRollout = !flag("no-rollout");
    scripts = !flag("no-scripts");
    damageScale = Number(arg("damage-scale", String(BOSS_SIM_DAMAGE_SCALE)));
    hpScale = Number(arg("hp-scale", String(BOSS_SIM_HP_SCALE)));
    threat = Number(arg("threat", String(BOSS_SIM_THREAT)));
    potionHold = Number(arg("potion-hold", String(BOSS_SIM_POTION_HOLD)));
    startLine = arg("start-line", "policy");
    orders = !flag("no-orders");
    bestOrder = !flag("no-best-order");
    set = arg("set", "");
    encs = arg("enc", "").split(",").filter((x) => x !== "");
    if (process.argv.includes("--boss-threat")) {
      for (const key of Object.keys(BOSS_POLICY_THREAT)) delete BOSS_POLICY_THREAT[key];
      for (const pair of arg("boss-threat", "").split(",").filter((x) => x !== "")) {
        const [id, value] = pair.split("=");
        if (id && value !== void 0 && Number(value) !== 0) BOSS_POLICY_THREAT[id] = Number(value);
      }
    }
    if (process.argv.includes("--lookahead")) {
      BOSS_SIM_LOOKAHEAD.lethal = 0;
      BOSS_SIM_LOOKAHEAD.threat = 0;
      for (const pair of arg("lookahead", "").split(",").filter((x) => x !== "")) {
        const [name, value] = pair.split("=");
        if (name === "lethal" || name === "threat") BOSS_SIM_LOOKAHEAD[name] = Number(value);
      }
    }
    keyFile = arg("keys", "");
    keep = keyFile ? new Set(JSON.parse(readFileSync17(keyFile, "utf8"))) : set ? new Set(JSON.parse(readFileSync17(fromRoot("experiments/boss-sim/split.json"), "utf8"))[set]) : null;
    r2 = (x) => x === null || x === void 0 || !Number.isFinite(x) ? null : Math.round(x * 100) / 100;
    await main();
  }
});

// tools/boss-sim/backtest.ts
var at = process.argv.indexOf("--character");
if (at >= 0 && process.argv[at + 1] !== void 0) process.env["CHARACTER"] = process.argv[at + 1];
await init_backtest_runner().then(() => backtest_runner_exports);
