import { asArray, asRecord, bool, numOrNull, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import { deckEntries } from "../memory/deck.js";
import { deckBudget, permanentCardGain } from "../memory/run-constraints.js";
import type { Decision, DecisionEnv } from "../memory/types.js";
import { actPlan, mapActOf } from "../hand/screens/route-plan.js";
import { actFirstFloor } from "../sim/route-map.js";
import { deckCards, selectableCards } from "../hand/screens/oneshot.js";
import { restHealHere } from "../hand/screens/rest.js";
import { restedHp } from "../sim/route-projection.js";
import { loadConstructionData } from "./data.js";
import { applyBuildAction, forecastConstruction } from "./planner.js";
import type { BuildAction, BuildState, PathStep } from "./types.js";

export type ConstructionMode = "off" | "shadow" | "advisory";
export function constructionMode(character: string, env = process.env): ConstructionMode {
  if (character !== "silent") return "off";
  const mode = env["CONSTRUCTION_MODE"] ?? "shadow";
  return mode === "advisory" || mode === "off" ? mode : "shadow";
}

export function constructionState(env: DecisionEnv): BuildState {
  const raw = asRecord(env.state.run?.raw);
  return { cards: deckEntries(env.state, env.knowledge).map((c) => ({ id: c.card_id, upgraded: c.upgraded })),
    relics: asArray(raw["relics"]).map((r) => str(asRecord(r)["relic_id"])),
    hp: env.state.run?.current_hp ?? 0, maxHp: env.state.run?.max_hp ?? 0,
    gold: env.state.run?.gold ?? 0, floor: env.state.run?.floor ?? 0, cap: deckBudget(env.state)?.maximum ?? null };
}

/** Project only actions whose inventory/resource effects are present in the actual question. */
export function constructionOptions(decision: Decision, env: DecisionEnv, initial: BuildState): { key: string; state: BuildState | null; why?: string }[] {
  if (decision.kind !== "ask") return [];
  const result: { key: string; state: BuildState | null; why?: string }[] = [];
  const raw = env.state.raw;
  for (const option of decision.deepseek?.options?.() ?? []) {
    const intent = option.intent, index = intent.option_index;
    const summary = asRecord(option.summary), price = numOrNull(summary["price"]);
    const at = (rows: unknown) => asArray(rows).map(asRecord).find((r, i) => (numOrNull(r["index"]) ?? i) === index);
    const group = (kind: "remove" | "upgrade", cost: number): void => {
      const follow = { task: kind, count: 1, upTo: false, text: kind };
      const eligible = selectableCards(env.state, deckCards(env.state, env.knowledge), follow).listed;
      const specified = /(?:^|[|:])(c\d+)$/.exec(option.key)?.[1];
      for (const card of eligible) {
        if (specified && card.key !== specified) continue;
        const position = deckEntries(env.state, env.knowledge).findIndex((c) => `c${c.index}` === card.key);
        if (position >= 0) result.push({ key: specified ? option.key : `${option.key}|${card.key}`,
          state: applyBuildAction(initial, { kind, index: position, price: cost }) });
      }
    };
    let action: BuildAction | null = null;
    if (intent.action === "skip_reward_cards" || /^(skip|leave)$/.test(option.key)) action = { kind: "skip" };
    else if (intent.action === "choose_reward_card" || intent.action === "buy_card") {
      const card = at(intent.action === "buy_card" ? asRecord(raw["shop"])["cards"] : asRecord(raw["reward"])["card_options"]);
      const copies = permanentCardGain(env.state, intent);
      const cost = intent.action === "buy_card" ? price ?? numOrNull(card?.["price"]) : 0;
      if (card && copies !== null && cost !== null) action = { kind: "add", card: { id: str(card["card_id"]), upgraded: bool(card["upgraded"]) }, copies, price: cost };
    } else if (intent.action === "remove_card_at_shop") {
      const cost = price ?? numOrNull(asRecord(asRecord(raw["shop"])["card_removal"])["price"]);
      if (cost !== null) group("remove", cost);
      continue;
    } else if (decision.label.startsWith("rest/")) {
      const head = Number(option.key.split(":")[0]!.replace(/^o/, ""));
      const entry = asArray(asRecord(raw["rest"])["options"]).map(asRecord).find((r, i) => (numOrNull(r["index"]) ?? i) === head);
      const kind = str(entry?.["option_id"]).toUpperCase();
      if (kind === "SMITH") { group("upgrade", 0); continue; }
      if (kind === "HEAL") {
        const heal = restHealHere(str(entry?.["description"]), initial.maxHp, initial.relics);
        const after = restedHp(initial.hp, initial.maxHp, heal.rest, heal.base);
        result.push({ key: option.key, state: { ...structuredClone(initial), hp: after.hp, maxHp: after.max } }); continue;
      }
    } else if (intent.action === "select_deck_card") {
      const selected = at(asRecord(raw["selection"])["cards"]);
      const entries = deckEntries(env.state, env.knowledge);
      const position = entries.findIndex((c) => c.card_id === str(selected?.["card_id"]) && c.upgraded === bool(selected?.["upgraded"]));
      const kind = decision.label === "selection/upgrade" ? "upgrade" : decision.label === "selection/remove" ? "remove" : null;
      if (kind && position >= 0) action = { kind, index: position, price: 0 };
    }
    result.push({ key: option.key, state: action ? applyBuildAction(initial, action) : null,
      ...(!action ? { why: "该选项的完整资源/牌组增量尚未接入，不按不变或零成本估计。" } : {}) });
  }
  return result;
}

export function constructionRoute(env: DecisionEnv): PathStep[] | null {
  const act = mapActOf(env.state), plan = actPlan(env, act);
  if (!plan) return null;
  const floor = env.state.run?.floor ?? 0, steps: PathStep[] = [];
  for (const node of plan.path) {
    const next = actFirstFloor(act) + node.row;
    if (next <= floor) continue;
    if (node.type === "Boss") { steps.push({ floor: next, kind: "fight" }); break; }
    if (["Monster", "Elite"].includes(node.type)) steps.push({ floor: next, kind: "fight" }, { floor: next, kind: "reward" });
    else steps.push({ floor: next, kind: node.type === "Shop" ? "shop" : /^(Rest|RestSite)$/.test(node.type) ? "rest" : "unknown" });
  }
  return steps;
}

/** Shadow forecasts use the real consumer, but never add probabilities to the model prompt. */
export function withConstruction(decision: Decision, env: DecisionEnv, setup: { mode?: ConstructionMode; data?: ReturnType<typeof loadConstructionData>; samples?: number; asOf?: string } = {}): { decision: Decision; record?: Record<string, JsonValue> } {
  const started = performance.now();
  const character = str(asRecord(env.state.run?.raw)["character_id"]).toLowerCase();
  const mode = setup.mode ?? constructionMode(character);
  if (character !== "silent" || mode === "off" || decision.kind !== "ask" || env.state.in_combat
    || !/^(reward\/card|shop\/|selection\/|rest\/|event\/|map\/)/.test(decision.label)) return { decision };
  const data = setup.data === undefined ? loadConstructionData(character) : setup.data;
  const base: Record<string, JsonValue> = { schema: "construction-v1", architecture: "V5", mode,
    run: str(env.state.raw["run_id"]), floor: env.state.run?.floor ?? null, label: decision.label };
  if (!data) return { decision, record: { ...base, status: "missing_evidence", reason: "本角色模板或机会资料不可用；保留原决策。" } };
  const steps = constructionRoute(env), state = constructionState(env), ascension = env.state.run?.ascension ?? 0;
  if (!steps?.length) return { decision, record: { ...base, status: "missing_route", data: data.signature } };
  const options = [{ key: "current", state }, ...constructionOptions(decision, env, state)];
  const forecasts = Object.fromEntries(options.map((option) => [option.key, option.state ? data.templates.filter((c) => c.ascensions.includes(ascension)).map((core) => forecastConstruction({
    state: option.state!, core, model: data.model, steps, act: mapActOf(env.state), ascension,
    currentRun: str(env.state.raw["run_id"]), asOf: setup.asOf ?? new Date().toISOString(), samples: setup.samples ?? 128,
  })) : null]));
  const record = { ...base, status: "predicted", data: data.signature, horizon: steps.at(-1)!.floor, ms: Math.round(performance.now() - started),
    policy: "补齐原学习者共现签名；不预支未来金币、遗物、未观察组件或战斗存活。", forecasts: toJsonValue(forecasts) };
  if (mode === "shadow") return { decision, record };
  const spec = decision.deepseek, question = spec ? decision.questions[spec.question] : undefined;
  if (!spec || question?.type !== "choice") return { decision, record };
  const facts = asRecord(decision.state["facts"]);
  return { record, decision: { ...decision,
    state: { ...decision.state, facts: toJsonValue({ ...facts, construction: record }) },
    questions: { ...decision.questions, [spec.question]: { ...question,
      instructions: question.instructions + " 构筑模块提供各方向在给定机会下的组件签名概率。目标为整局通关，不能只选集齐率最高者；结合伤害/回合、启动时间、升级、稀释和过渡存活比较。signature不代表可运转；aliveAndFunctional或terminalWin为null时不得编造成型/通关率。给出主方向、备用方向、当前取舍及转向条件；如本题同时更新run_plan，在其construction字段填写{primary,alternatives,checkpoint,reason,pivot_if}，方向使用模块core ID。" } } } };
}
