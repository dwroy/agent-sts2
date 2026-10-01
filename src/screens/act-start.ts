/**
 * Act start in one question (BUILD_DECIDER=deepseek, BUILD_ONESHOT; Dai 2026-09-29): the act-start
 * Ancient's options and the act's route are decided together, since an option can change the route
 * (gold for shops, max HP and heals for elites and rests, removals and upgrades for rest use).
 *
 * Where the map comes from: at acts 2 and 3 the MAP screen before the Ancient shows the new act's whole map
 * with the Ancient as its only available node (screenMemory.lastMap; the EVENT state itself has no map).
 * At act 1 the run opens on Neow before any map is shown, so Neow and the route stay two questions.
 *
 * M2: the brain gets the act's whole map (state.act_route, strategy/route-map.ts) standing on the Ancient and answers
 * {"choice": <option key>, "route": "<node ids from the Ancient's next nodes to the boss>"}; code takes the option (and
 * the deck card(s) it names, as other one-shot events), stores the route as the act's route plan and follows it from
 * the first map. The route is checked like map/route-plan's (the AnswerSpec re-asks once with the errors); a route
 * still missing or illegal then does not block the option: it is taken, and the first map asks for the route. When
 * the option's outcome was not known in advance (random relics, cards chosen later), the brain reviews the route
 * once at that first map (keep or change; default keep).
 */

import { eventHpCost } from "./event.js";
import { checkRoute, routeIds } from "../strategy/route-map.js";
import { actPlan, actStartMap, makeRoutePlan, routeBlockState, routeCosts, runSnapshot, type RoutePlan } from "./route-plan.js";
import { buildPickDecision, type PickOption, type PlanAnswer, type PlannedOption } from "./pick.js";
import { deckCards, deckFollowUp, selectableCards, nextPlanRef, planOnly, visitKey, withFollowUp } from "./oneshot.js";
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
  // Sentence by sentence: a sentence about every fight or turn, or the hand, is an effect known now however
  // random its draw (Choices Paradox 「在每场战斗开始时，从5张随机牌中选择1张放入你的手牌」, 7XK6DUJYMYY3 F34: read
  // as "picked from cards it reveals later" and a route review was asked for nothing).
  const sentences = clean(description)
    .split(/(?<=[。.!！])/)
    .filter((sentence) => !IN_FIGHT.test(sentence));
  for (const text of sentences) {
    if (/获得[^。]{0,8}随机|随机获得|随机[^。]{0,6}(?:遗物|药水|无色牌|诅咒|牌)[^。]{0,8}(?:加入|添加)|(?:obtain|gain|add)[^.]{0,20}random (?:relic|potion|card|curse)/i.test(text)) return "its outcome is random";
    if (/从\s*(?:\d+|[一两二三四五六])\s*(?:张|个)[^。]{0,10}中选择|choose [^.]{0,20}from \d+/i.test(text)) return "what it gives is picked from cards it reveals later";
  }
  return null;
}

/** A sentence about each fight or turn, or the hand: a recurring in-fight effect, not a one-time outcome. */
const IN_FIGHT = /每场战斗|每回合|(?:战斗|回合)(?:开始|结束)时|手牌|(?:each|every) (?:combat|fight|turn)|into your hand/i;

/** The instructions of the joint question. */
export const ACT_START_NOTE =
  "幕初：远古的选项和本幕路线一起定。state.act_route 是本幕完整地图（你在远古节点上，节点 id 规则见 map_legend）。" +
  '回答 JSON：{"choice": "<选项 key>", "route": "<节点 id，用空格分隔：从 next_nodes 之一出发，沿连线（或用飞行靴）一直到 boss>", "reason": "<30 字以内>"}' +
  '（选项列出 eligible_cards 时再加 "cards"）。选项改变 HP、最大生命或金币时写在它的 route_effect 里。代码先执行选项，再按路线逐个节点走，' +
  "只在路线走不通时再问你；选项结果随机时，揭晓后在第一张地图问一次保留还是换路线；之后的选牌、休息点和事件的最后一问也会附上路线让你保留或修改。";

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
  const map = actStartMap(env);
  // The act already has a route plan (a restart after the joint question): the event is asked on its own.
  if (!map || map.bosses.length === 0 || actPlan(env, map.act)) return null;
  const { state } = env;
  const ref = nextPlanRef(env, "act");
  const cards = deckCards(state, env.knowledge);
  const hp = state.run?.current_hp ?? 0;
  const maxHp = state.run?.max_hp ?? 0;
  const gold = state.run?.gold ?? 0;
  const costs = routeCosts(env, map.act);
  const offered = new Set<string>();
  const effects = new Map<string, RouteEffect>();

  /**
   * The option with the route: a legal route in the answer becomes the act's plan (projected from the HP the option
   * leaves); a missing or illegal one does not block the option (the first map asks for the route).
   */
  const withRoute = (option: PickOption, base: PickOption, effect: RouteEffect | null, later: string | null): PickOption => ({
    ...option,
    summary: {
      ...(asRecord(option.summary) as Record<string, JsonValue>),
      ...(effect ? { route_effect: effect.text } : {}),
      ...(later ? { outcome: `${later}: you review the route once after it resolves` } : {}),
    },
    plan: (answer: PlanAnswer) => {
      const inner = option.plan?.(answer) ?? null;
      if (inner && "invalid" in inner) return inner;
      const steps = inner ? asArray(inner.steps).map((step) => str(step)) : [option.key];
      const ids = routeIds(answer.route);
      const legal = ids !== null && checkRoute(map, ids).length === 0;
      const plan: RoutePlan | null = legal
        ? {
            ...makeRoutePlan(env, map, ids, effect ? { hp: effect.hp, max: effect.maxHp } : { hp, max: maxHp }, costs),
            // The first map move comes after the option and its card picks.
            oneshot: { ref, firstStep: steps.length + 1, firstPending: true },
            ...(later ? { review: { why: `${base.label ?? base.key}: ${later}`, before: runSnapshot(state) } } : {}),
          }
        : null;
      return {
        id: ref,
        steps: plan ? [...steps, ids!.join(" ")] : steps,
        journal: `${inner?.journal ?? base.label ?? base.key}; ${plan ? `route ${plan.summary}` : `no legal route (${answer.route ? "illegal" : "none given"}): the first map asks for it`}`,
        // A "discard potion(s), then …" option plays its first discard now.
        ...(inner?.intent ? { intent: inner.intent } : {}),
        apply: () => {
          inner?.apply?.();
          if (plan) env.screenMemory.routePlan = plan;
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
    if (follow) for (const card of selectableCards(env.state, cards, follow).listed) offered.add(card.identity.card_id);
    const parts = follow ? withFollowUp(env, option, follow, cards, ref, "event", followUpTargetScore(env, follow.task)) : [planOnly(env, option, ref)];
    return parts.map((part) => withRoute(part, option, effect, later));
  });
  return buildPickDecision({
    ...inputs.params,
    label: "event/act-plan",
    instructions: "Which of the Ancient's options should I take, and which route should I follow this act?",
    state: { ...inputs.state, act_route: routeBlockState({ map, start: { hp, max: maxHp }, costs }) },
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
