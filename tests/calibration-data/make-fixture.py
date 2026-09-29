#!/usr/bin/env python3
"""Writes the fixed log sample for tools/eval/calibration.py (tests/eval_calibration_test.py), in the shape of the real
logs (the helpers of tests/logdb-data/make-fixture.py). Two finished runs:

  RUNE00000005  A9, code 17ac095 (V3). F1: the act-1 route plan (map/route-plan) at 64/80: F2 Monster 0.80, F3 Monster
                0.75, F4 RestSite 0.70, F5 Boss 1.00 (x 80: 64 / 60 / 56 / 80), followed node by node.
                F2 hallway: T1 plays plan1 (hp_lost 5; a 3-turn rollout: T2 -4 over 8/8 fighting, won 4/8, T3 over;
                expected further loss 9), T2 re-planned (an HP-guard swap first, then plan1 hp_lost 2); the last
                combat frame 57, the reward 63 (Burning Blood). F3 hallway: T1 code's own line (code-fallback),
                T2 plan1 hp_lost 6 from 45, the fight ends at 34 (reward 40). F4 rest 40 -> 64. F5 boss VANTOM
                (183 HP): T1 64 -> T2 57 (hp_lost 7 each turn), last frame 50 with VANTOM at 20, reward 56: won in
                2 turns. F6 act-2 hallway: T1 hp_lost 10 from 56, died.
  RUNF00000006  A8, code 0c93138+dirty (V3.oneshot). F1: route plan at 80/80: F2 Monster 1.00, F3 Elite 0.95, F4
                RestSite 0.60, F5 Boss 0.90. F2 hallway: T1 escalated (Jev plan1, the escalation's plan2, hp_lost 4),
                ends at 76. F3 elite: T1 at 80, T2 at 30, died on T2 (the plan's F4 rest never reached).

Run it again after changing it: python3 tests/calibration-data/make-fixture.py
"""
import importlib.util
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("logdb_fixture", os.path.join(HERE, "..", "logdb-data", "make-fixture.py"))
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)


def run(asc, floor, act, hp, boss="VANTOM_BOSS"):
    part = fx.run_part(asc, floor, act, hp, 80, 99, [None, None])
    part["boss_id"] = boss
    return part


def criteria(**lines):
    return {"plan": {"type": "choice", "instructions": "Which plan should I play this turn?", "criteria": {k: json.dumps(v) for k, v in lines.items()}}}


def answer(choice, confidence=0.8):
    return {"plan": {"type": "choice", "choice": choice, "probabilities": {choice: confidence}, "confidence": confidence, "raw": {}}}


def combat(ts, run_id, asc, floor, act, turn, hp, enemies, label="combat/plan-choice", decide=True, **extra):
    fp = fx.fingerprint(run_id, "COMBAT", hp, 80, 99, hand="0:STRIKE_IRONCLAD:true", combat=True)
    fx.state(ts, run_id, "COMBAT", run(asc, floor, act, hp), turn=turn, in_combat=True, fp=fp, combat=fx.combat_part(hp, 0, enemies))
    if decide:
        fx.decision(ts, run_id, "COMBAT", floor, turn, label, {"action": "end_turn"}, decider=extra.pop("decider", "jev"), fp=fp, **extra)


def reward(ts, run_id, asc, floor, act, hp):
    fx.state(ts, run_id, "REWARD", run(asc, floor, act, hp))
    fx.decision(ts, run_id, "REWARD", floor, None, "reward/claim", {"action": "claim_reward", "option_index": 0})


def map_choice(ts, run_id, asc, floor, act, hp, row, current, next_type, label="map/route-follow", **extra):
    fx.state(ts, run_id, "MAP", run(asc, floor, act, hp), themap=fx.the_map(row, 3, current, [(3, next_type)]))
    fx.decision(ts, run_id, "MAP", floor, None, label, {"action": "choose_map_node", "option_index": 0},
                fp=fx.fingerprint(run_id, "MAP", hp, 80, 99), **extra)


def plan(run_id, act, floor, hp_pct, steps):
    return {"runId": run_id, "act": act, "floor": floor, "hpPct": hp_pct, "summary": " -> ".join(t for _, t, _ in steps),
            "path": [{"row": row, "col": 3, "type": t, "hpOnArrival": f} for row, t, f in steps]}


def neow(ts, run_id, asc):
    fx.state(ts, run_id, "EVENT", run(asc, 1, 1, 80), event={"event_id": "NEOW"})
    fx.decision(ts, run_id, "EVENT", 1, None, "event/choose", {"action": "choose_event_option", "option_index": 0})


def main():
    fx.states.clear()
    fx.decisions.clear()
    nibbit = lambda hp: [fx.enemy(0, "NIBBIT", hp, 30, 5, 1)]  # noqa: E731

    e, t = "RUNE00000005", "2026-09-22T10:00:"
    neow(t + "00.000Z", e, 9)
    map_choice(t + "01.000Z", e, 9, 1, 1, 64, 0, "Ancient", "Monster", label="map/route-plan",
               route_plan=plan(e, 1, 1, 0.8, [(1, "Monster", 0.8), (2, "Monster", 0.75), (3, "RestSite", 0.7), (4, "Boss", 1.0)]))
    # F2 hallway.
    turns = "T1 exact: hp -5, dmg 10; T2: hp -4 [0-8], dmg 10 [5-15], alive 8/8, won 4/8; T3: over (alive 8/8, won 8/8)"
    combat(t + "02.000Z", e, 9, 2, 1, 1, 64, nibbit(30), questions=criteria(
        plan1={"plays": "Strike", "hp_lost": 5, "rollout": "3-turn rollout (8 samples): expected further HP loss 9, fight over within 3 turns in 8/8", "rollout_turns": turns},
        plan2={"plays": "Defend", "hp_lost": 0}), answers=answer("plan1"),
        rollout={"available": True, "ms": 30, "horizon": 3, "samples": 8, "degraded": [], "lines": 2, "best": "plan1", "best_added": False})
    combat(t + "03.000Z", e, 9, 2, 1, 2, 59, nibbit(20), questions=criteria(plan1={"hp_lost": 1}, plan2={"hp_lost": 9}), answers=answer("plan2", 0.5),
           rationale="Jev chose plan 2/2 (Strike) with confidence 0.50; code rank 2; HP guard: plan 2 (Strike) loses 9 HP, more than 3 over the cheapest line, playing plan 1 (Defend; hp -1) instead")
    combat(t + "04.000Z", e, 9, 2, 1, 2, 59, nibbit(12), questions=criteria(plan1={"hp_lost": 2}, plan2={"hp_lost": 8}), answers=answer("plan1"))
    combat(t + "05.000Z", e, 9, 2, 1, 2, 57, nibbit(4), decide=False)
    reward(t + "06.000Z", e, 9, 2, 1, 63)
    map_choice(t + "07.000Z", e, 9, 2, 1, 63, 1, "Monster", "Monster")
    # F3 hallway: T1 by code, T2 predicted 6, lost 11.
    combat(t + "08.000Z", e, 9, 3, 1, 1, 63, nibbit(30), decider="code-fallback", questions=criteria(plan1={"hp_lost": 18}),
           rationale="no usable answer from Jev; using the code-best plan")
    combat(t + "09.000Z", e, 9, 3, 1, 2, 45, nibbit(15), questions=criteria(plan1={"hp_lost": 6}), answers=answer("plan1"))
    combat(t + "10.000Z", e, 9, 3, 1, 2, 34, nibbit(3), decide=False)
    reward(t + "11.000Z", e, 9, 3, 1, 40)
    map_choice(t + "12.000Z", e, 9, 3, 1, 40, 2, "Monster", "RestSite")
    # F4 rest site.
    fx.state(t + "13.000Z", e, "REST", run(9, 4, 1, 40), extra_state={"rest": {"options": [{"index": 0, "option_id": "HEAL"}]}})
    fx.decision(t + "13.000Z", e, "REST", 4, None, "rest/choose", {"action": "choose_rest_option", "option_index": 0})
    map_choice(t + "14.000Z", e, 9, 4, 1, 64, 3, "RestSite", "Boss")
    # F5 boss: VANTOM 183 -> 100 -> 20, won in 2 turns.
    combat(t + "15.000Z", e, 9, 5, 1, 1, 64, [fx.enemy(0, "VANTOM", 183, 183, 7, 1)], questions=criteria(plan1={"hp_lost": 7}), answers=answer("plan1"))
    combat(t + "16.000Z", e, 9, 5, 1, 2, 57, [fx.enemy(0, "VANTOM", 100, 183, 7, 1)], questions=criteria(plan1={"hp_lost": 7}), answers=answer("plan1"))
    combat(t + "17.000Z", e, 9, 5, 1, 2, 50, [fx.enemy(0, "VANTOM", 20, 183, 7, 1)], decide=False)
    reward(t + "18.000Z", e, 9, 5, 1, 56)
    # Act 2: the map after the boss is the next act's.
    map_choice(t + "19.000Z", e, 9, 5, 2, 56, 0, "Ancient", "Monster")
    combat(t + "20.000Z", e, 9, 6, 2, 1, 56, nibbit(30), questions=criteria(plan1={"hp_lost": 10}), answers=answer("plan1"))
    fx.state(t + "21.000Z", e, "GAME_OVER", run(9, 6, 2, 0), game_over={"is_victory": False, "floor": 6})
    fx.decision(t + "21.000Z", e, "GAME_OVER", 6, None, "run/game-over", {"action": "continue_game_over"})

    f, t = "RUNF00000006", "2026-09-22T11:00:"
    neow(t + "00.000Z", f, 8)
    map_choice(t + "01.000Z", f, 8, 1, 1, 80, 0, "Ancient", "Monster", label="map/route-plan",
               route_plan=plan(f, 1, 1, 1.0, [(1, "Monster", 1.0), (2, "Elite", 0.95), (3, "RestSite", 0.6), (4, "Boss", 0.9)]))
    combat(t + "02.000Z", f, 8, 2, 1, 1, 80, nibbit(30), decider="deepseek", questions=criteria(plan1={"hp_lost": 3}, plan2={"hp_lost": 4}), answers=answer("plan1", 0.2),
           escalation={"by": "deepseek", "jev_choice": "plan1", "jev_confidence": 0.2, "deepseek_choice": "plan2", "choice": "plan2", "reason": "block"},
           rationale="DeepSeek overrode Jev (plan1 @0.20 -> plan2; monster fight): block | Jev chose plan 2/2 (Defend) with confidence 1.00; code rank 2")
    combat(t + "03.000Z", f, 8, 2, 1, 1, 76, nibbit(0), decide=False)
    reward(t + "04.000Z", f, 8, 2, 1, 80)
    map_choice(t + "05.000Z", f, 8, 2, 1, 80, 1, "Monster", "Elite")
    combat(t + "06.000Z", f, 8, 3, 1, 1, 80, [fx.enemy(0, "TERROR_EEL", 140, 140, 50, 1)], questions=criteria(plan1={"hp_lost": 50}), answers=answer("plan1"))
    combat(t + "07.000Z", f, 8, 3, 1, 2, 30, [fx.enemy(0, "TERROR_EEL", 100, 140, 60, 1)], questions=criteria(plan1={"hp_lost": 30}), answers=answer("plan1"))
    fx.state(t + "08.000Z", f, "GAME_OVER", run(8, 3, 1, 0), game_over={"is_victory": False, "floor": 3})
    fx.decision(t + "08.000Z", f, "GAME_OVER", 3, None, "run/game-over", {"action": "continue_game_over"})

    with open(os.path.join(HERE, "states.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(fx.states) + "\n")
    with open(os.path.join(HERE, "decisions.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(fx.decisions) + "\n")
    runs = [
        {"run_id": e, "ended": "2026-09-22T10:00:22.000Z", "victory": False, "floor": 6, "character": "IRONCLAD", "ascension": 9, "code": "17ac095",
         "death_fight": ["啃兽"]},
        {"run_id": f, "ended": "2026-09-22T11:00:09.000Z", "victory": False, "floor": 3, "character": "IRONCLAD", "ascension": 8, "code": "0c93138+dirty",
         "death_fight": ["骇鳗"]},
    ]
    with open(os.path.join(HERE, "runs.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(json.dumps(r, ensure_ascii=False) for r in runs) + "\n")
    # The boss clock as tools/eval/boss-clock-recompute.ts prints it (the test does not run tsx).
    with open(os.path.join(HERE, "boss-clocks.jsonl"), "w", encoding="utf8") as out:
        out.write(json.dumps({"key": f"{e}#3", "boss": "VANTOM", "ascension": 9, "entry_hp": 64, "deck": 61, "need": 50, "gap": 0, "hp": 183,
                              "fight_turns": 4, "survivable_turns": 8, "loss_per_turn": 8, "loss_note": "fixture", "deck_at_turns": 80}) + "\n")


if __name__ == "__main__":
    main()
