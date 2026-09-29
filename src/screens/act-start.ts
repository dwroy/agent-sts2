/**
 * Act start in one question (BUILD_DECIDER=deepseek, BUILD_ONESHOT; Dai 2026-09-29): the act-start
 * Ancient's options and the act's route are decided together, since an option can change the route
 * (gold for shops, max HP and heals for elites and rests, removals and upgrades for rest use).
 *
 * Where the map comes from: at acts 2 and 3 the MAP screen before the Ancient shows the new act's whole map
 * with the Ancient as its only available node (screenMemory.lastMap; the EVENT state itself has no map).
 * At act 1 the run opens on Neow before any map is shown, so Neow and the route stay two questions.
 *
 * DeepSeek answers {"choice": <option key>, "route": <route key>}; code takes the option (and the deck
 * card(s) it names, as other one-shot events), stores the route as the act's route plan and follows it from
 * the first map. When the option's outcome was not known in advance (random relics, cards chosen later),
 * DeepSeek reviews the route once at that first map (keep or change; default keep). An answer without a
 * valid route falls back to the two questions of before (the event, then the route plan at the map).
 */

import { eventHpCost } from "./event.js";
import { actStartRoutes, runSnapshot, type RoutePlan } from "./map.js";
import { buildPickDecision, type PickOption, type PlanAnswer, type PlannedOption } from "./pick.js";
import { deckCards, deckFollowUp, eligibleCards, nextPlanRef, planOnly, visitKey, withFollowUp } from "./oneshot.js";
import { followUpTargetScore } from "./selection.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { asArray, asRecord, str, type JsonValue } from "../util/json.js";

/** How an option's own numbers change the act's start: HP, max HP, gold (from its text). */
export interface RouteEffect {
  hp: number;
  maxHp: number;
  text: string;
}

const clean = (text: string): string => text.replace(/\[[^\]]*\]/g, "");

/** The HP, max HP and gold an option's text says it changes, or null when it names none. */
export function routeEffect(description: string, hp: number, maxHp: number, gold: number): RouteEffect | null {
  const text = clean(description);
  const cost = eventHpCost(description);
  const maxGain = [...text.matchAll(/获得(\d+)点最大生命|gain (\d+) max hp/gi)].reduce((sum, match) => sum + Number(match[1] ?? match[2]), 0);
  const heal = [...text.matchAll(/回复(\d+)点?生命|heal (\d+)(?! max)/gi)].reduce((sum, match) => sum + Number(match[1] ?? match[2]), 0);
  const fullHeal = /回复(?:全部|所有)生命|heal to full|heal all/i.test(text);
  const goldGain = [...text.matchAll(/获得(\d+)金币|gain (\d+) gold/gi)].reduce((sum, match) => sum + Number(match[1] ?? match[2]), 0);
  const goldPaid = [...text.matchAll(/支付(\d+)金币|pay (\d+) gold/gi)].reduce((sum, match) => sum + Number(match[1] ?? match[2]), 0);
  const loseAllGold = /失去所有金币|lose all (?:your )?gold/i.test(text);
  const newMax = maxHp + maxGain - cost.maxHp;
  const newHp = Math.max(0, Math.min(newMax, fullHeal ? newMax : hp + maxGain + heal - cost.hp));
  const newGold = loseAllGold ? 0 : gold + goldGain - goldPaid;
  const parts = [
    ...(newHp !== hp || newMax !== maxHp ? [`HP ${hp}/${maxHp} -> ${newHp}/${newMax}`] : []),
    ...(newGold !== gold ? [`gold ${gold} -> ${newGold}`] : []),
  ];
  return parts.length > 0 ? { hp: newHp, maxHp: newMax, text: parts.join(", ") } : null;
}

/**
 * Why an option's outcome is not known in advance, or null: it gives random relics, potions or cards
 * ("获得2件随机遗物", "随机获得一瓶药水", "将2张随机诅咒牌…加入"), or a pick among cards or packs it reveals
 * ("从3张稀有牌中选择1张", "从2个卡牌包中选择1包"). A pick from your own deck, or a random effect later in a
 * fight, is known now.
 */
export function revealsLater(description: string): string | null {
  const text = clean(description);
  if (/获得[^。]{0,8}随机|随机获得|随机[^。]{0,6}(?:遗物|药水|无色牌|诅咒|牌)[^。]{0,8}(?:加入|添加)|(?:obtain|gain|add)[^.]{0,20}random (?:relic|potion|card|curse)/i.test(text)) return "its outcome is random";
  if (/从\s*(?:\d+|[一两二三四五六])\s*(?:张|个)[^。]{0,10}中选择|choose [^.]{0,20}from \d+/i.test(text)) return "what it gives is picked from cards it reveals later";
  return null;
}

/** The instructions of the joint question. */
export const ACT_START_NOTE =
  "Act start: choose the Ancient's option and this act's route together. state.act_routes are whole paths from the first map node " +
  "to the act boss with code's route facts at your HP now (an option that changes HP or max HP shows its effect in route_effect, " +
  'and each route its hp_at_boss_if_option). Reply with JSON only: {"choice": "<option key>", "route": "<route key from act_routes>", ' +
  '"reason": "<max 30 words>"} (and "cards" when the option lists eligible_cards). Code takes the option, then follows the route node ' +
  "by node; you are asked again only if the route breaks, and once after an option whose outcome is random, to keep or change the route; " +
  "card rewards and rest sites also show the route to keep or change.";

interface Inputs {
  params: Parameters<typeof buildPickDecision>[0];
  /** The event's options as DeepSeek sees them (HP facts added). */
  options: PickOption[];
  state: Record<string, JsonValue>;
  facts: Record<string, JsonValue>;
  note: string;
  rawOf: (option: PickOption) => Record<string, unknown> | undefined;
}

/**
 * The joint question when this event is the act-start Ancient and the act's map is known (acts 2 and 3);
 * null otherwise (the event is then asked on its own).
 */
export function actStartPlan(env: DecisionEnv, inputs: Inputs): Decision | null {
  const routes = actStartRoutes(env);
  if (!routes) return null;
  const { state } = env;
  const ref = nextPlanRef(env, "act");
  const cards = deckCards(state, env.knowledge);
  const hp = state.run?.current_hp ?? 0;
  const maxHp = state.run?.max_hp ?? 0;
  const gold = state.run?.gold ?? 0;
  const offered = new Set<string>();
  const effects = new Map<string, RouteEffect>();
  const byKey = new Map(routes.routes.map((route) => [route.key, route]));

  /** The option with the route: the answer must name one; choosing it stores the route as the act's plan. */
  const withRoute = (option: PickOption, base: PickOption, effect: RouteEffect | null, later: string | null): PickOption => ({
    ...option,
    summary: {
      ...(asRecord(option.summary) as Record<string, JsonValue>),
      ...(effect ? { route_effect: effect.text } : {}),
      ...(later ? { outcome: `${later}: you review the route once after it resolves` } : {}),
    },
    plan: (answer: PlanAnswer) => {
      const route = answer.route ? byKey.get(answer.route) : undefined;
      if (!route) return { invalid: `the answer names no route from act_routes (route: ${answer.route ?? "missing"})` };
      const inner = option.plan?.(answer) ?? null;
      if (inner && "invalid" in inner) return inner;
      const steps = inner ? asArray(inner.steps).map((step) => str(step)) : [option.key];
      const plan: RoutePlan = {
        ...route.plan,
        // The first map move comes after the option and its card picks.
        oneshot: { ref, firstStep: steps.length + 1, firstPending: true },
        ...(later ? { review: { why: `${base.label ?? base.key}: ${later}`, before: runSnapshot(state) } } : {}),
      };
      return {
        id: ref,
        steps: [...steps, route.key],
        journal: `${inner?.journal ?? base.label ?? base.key}; route ${route.plan.summary}`,
        apply: () => {
          inner?.apply?.();
          env.screenMemory.routePlan = plan;
        },
      } satisfies PlannedOption;
    },
  });

  const expanded = inputs.options.flatMap((option) => {
    const description = str(inputs.rawOf(option)?.["description"]);
    const effect = routeEffect(description, hp, maxHp, gold);
    if (effect) effects.set(option.key, effect);
    const later = revealsLater(description);
    const follow = deckFollowUp(description);
    if (follow) for (const card of eligibleCards(cards, follow)) offered.add(card.identity.card_id);
    const parts = follow ? withFollowUp(env, option, follow, cards, ref, "event", followUpTargetScore(env, follow.task)) : [planOnly(env, option, ref)];
    return parts.map((part) => withRoute(part, option, effect, later));
  });
  // Routes whose code_value reads the same share a rank (consistency R9), as in the DeepSeek pick.
  const shownValue = (value: number): number => Number(value.toFixed(2));
  const rankOf = (route: (typeof routes.routes)[number]): number => 1 + routes.routes.filter((other) => shownValue(other.value) > shownValue(route.value)).length;
  const actRoutes: Record<string, JsonValue> = Object.fromEntries(
    routes.routes.map((route) => [
      route.key,
      {
        ...route.facts,
        code_value: Number(route.value.toFixed(2)),
        code_rank: rankOf(route),
        why: "sum of code's node weights along the path at the projected HP (elites valued by HP and act, rests by HP, shops by gold, fight chains penalised)",
        ...(effects.size > 0 ? { hp_at_boss_if_option: Object.fromEntries([...effects].map(([key, effect]) => [key, routes.hpAtBoss(route.key, effect.hp, effect.maxHp)])) } : {}),
      },
    ]),
  );
  return buildPickDecision({
    ...inputs.params,
    label: "event/act-plan",
    instructions: "Which of the Ancient's options should I take, and which route should I follow this act?",
    state: { ...inputs.state, act_routes: actRoutes, route_note: `Each route is a full path from the first node to the boss. ${routes.note}` },
    options: expanded,
    deepseek: {
      facts: inputs.facts,
      note: `${inputs.note} ${ACT_START_NOTE}`,
      // Without DeepSeek: the event's own Jev/code question, then the route at the map as before.
      baseline: buildPickDecision({ ...inputs.params, state: inputs.state, options: inputs.options }),
      oneshot: { fallback: () => (env.screenMemory.oneshotFailed = visitKey(env, "event")) },
      offeredCards: [...offered],
    },
  });
}
