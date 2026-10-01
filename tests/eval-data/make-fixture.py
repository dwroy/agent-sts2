#!/usr/bin/env python3
"""Writes the fixed log sample for tools/eval/metrics.py (tests/eval_metrics_test.py), in the shape of the real logs
(the helpers of tests/logdb-data/make-fixture.py). Acts are short so no boss sits on floor 17:

  RUNC00000003  A9, code 17ac095 (version V3): F1 Neow -> F2 act-1 elite entered at 60/80 (below 78%; one potion
                drunk) -> F3 rest site -> F4 act-1 boss in a Boss node (deck INFLAME+, relic VAJRA, Strength 2 on
                the first frame; two potions held) -> F5 act-2 hallway, died (no act-2 rest site reached).
  RUND00000004  A9, code 0c93138+dirty (version V3.oneshot): F1 Neow -> F2 act-1 elite at 63/80 (not below 78%;
                one potion) -> F3 act-1 boss whose map node says Monster (the boss is inferred: the run reached
                act 2; one potion drunk in it, Strength only from turn 2) -> F4 act-2 rest site -> F5 act-2
                hallway, died.
Model calls: two DeepSeek calls in run C (the router's brain.jsonl row repeats one: a duplicate), one Claude
brain call in run D. Configuration (run-config.jsonl): run D started with DeepSeek plus Claude Opus for rest
questions and the full knowledge prefix; run C has none (a run from before that log). SL (sl-attempts.jsonl): run
D's act-1 boss was reloaded once (a certain death foreseen on attempt 1, won on attempt 2).

Run it again after changing it: python3 tests/eval-data/make-fixture.py
"""
import importlib.util
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("logdb_fixture", os.path.join(HERE, "..", "logdb-data", "make-fixture.py"))
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)


def deck(*extra):
    return [fx.card("STRIKE_IRONCLAD"), fx.card("DEFEND_IRONCLAD"), fx.card("BASH")] + [fx.card(c.rstrip("+"), c.endswith("+")) for c in extra]


def part(asc, floor, act, hp, potions, cards=(), relics=()):
    run = fx.run_part(asc, floor, act, hp, 80, 99, potions, deck(*cards))
    run["relics"] += [{"index": i + 1, "relic_id": r, "name": r} for i, r in enumerate(relics)]
    return run


def potion_fp(run_id, hp, potions):
    slots = "|".join(f"{p}:true:true" if p else ":false:false" for p in potions)
    return fx.fingerprint(run_id, "COMBAT", hp, 80, 99, hand="0:STRIKE_IRONCLAD:true", potions=slots, combat=True)


def neow(run_id, t, asc, next_type):
    fx.state(t + "00.000Z", run_id, "EVENT", part(asc, 1, 1, 80, [None, None]), event={"event_id": "NEOW"})
    fx.decision(t + "00.000Z", run_id, "EVENT", 1, None, "event/choose", {"action": "choose_event_option", "option_index": 0})
    fx.state(t + "01.000Z", run_id, "MAP", part(asc, 1, 1, 80, [None, None]), themap=fx.the_map(0, 3, "Ancient", [(2, next_type)]))
    fx.decision(t + "01.000Z", run_id, "MAP", 1, None, "map/route", {"action": "choose_map_node", "option_index": 0})


def fight(run_id, t, sec, asc, floor, act, hp, potions, enemy, cards=(), relics=(), powers=(), drink=False, turns=1, dies=False):
    """A fight from second `sec`: turn 1 (a potion drunk first when `drink`), more turns, then a reward or death."""
    run = part(asc, floor, act, hp, potions, cards, relics)
    fp = potion_fp(run_id, hp, potions)
    fx.state(f"{t}{sec:02d}.000Z", run_id, "COMBAT", run, turn=1, in_combat=True, fp=fp,
             combat=fx.combat_part(hp, 0, [fx.enemy(0, enemy, 100, 100, 20, 1)], powers=powers))
    if drink:
        fx.decision(f"{t}{sec:02d}.000Z", run_id, "COMBAT", floor, 1, "combat/plan-potion", {"action": "use_potion", "option_index": 0, "target_index": 0}, fp=fp)
    else:
        fx.decision(f"{t}{sec:02d}.000Z", run_id, "COMBAT", floor, 1, "combat/plan-choice", {"action": "end_turn"}, decider="jev", fp=fp)
    held = [None] + list(potions[1:]) if drink else list(potions)
    for turn in range(2, turns + 1):
        sec += 1
        run = part(asc, floor, act, hp - 5 * (turn - 1), held, cards, relics)
        fx.state(f"{t}{sec:02d}.000Z", run_id, "COMBAT", run, turn=turn, in_combat=True,
                 combat=fx.combat_part(hp - 5 * (turn - 1), 0, [fx.enemy(0, enemy, 50, 100, 20, 1)], powers=("STRENGTH_POWER",)))
        fx.decision(f"{t}{sec:02d}.000Z", run_id, "COMBAT", floor, turn, "combat/plan-choice", {"action": "end_turn"}, decider="jev")
    sec += 1
    if dies:
        fx.state(f"{t}{sec:02d}.000Z", run_id, "GAME_OVER", part(asc, floor, act, 0, held, cards, relics), game_over={"is_victory": False, "floor": floor})
        fx.decision(f"{t}{sec:02d}.000Z", run_id, "GAME_OVER", floor, None, "run/game-over", {"action": "continue_game_over"})
    else:
        fx.state(f"{t}{sec:02d}.000Z", run_id, "REWARD", part(asc, floor, act, hp - 5, held, cards, relics))
        fx.decision(f"{t}{sec:02d}.000Z", run_id, "REWARD", floor, None, "reward/claim", {"action": "claim_reward", "option_index": 0})
    return sec + 1, held


def map_after(run_id, t, sec, asc, floor, act, hp, potions, current, next_type, cards=(), relics=()):
    fx.state(f"{t}{sec:02d}.000Z", run_id, "MAP", part(asc, floor, act, hp, potions, cards, relics), themap=fx.the_map(floor - 1, 3, current, [(3, next_type)]))
    fx.decision(f"{t}{sec:02d}.000Z", run_id, "MAP", floor, None, "map/route", {"action": "choose_map_node", "option_index": 0})
    return sec + 1


def rest(run_id, t, sec, asc, floor, act, hp, potions, next_type, cards=(), relics=()):
    fx.state(f"{t}{sec:02d}.000Z", run_id, "REST", part(asc, floor, act, hp, potions, cards, relics), extra_state={"rest": {"options": [{"index": 0, "option_id": "HEAL"}]}})
    fx.decision(f"{t}{sec:02d}.000Z", run_id, "REST", floor, None, "rest/choose", {"action": "choose_rest_option", "option_index": 0})
    return map_after(run_id, t, sec + 1, asc, floor, act, hp + 20, potions, "RestSite", next_type, cards, relics)


def main():
    fx.states.clear()
    fx.decisions.clear()

    c, t = "RUNC00000003", "2026-09-21T10:00:"
    cards, relics = ("INFLAME+",), ("VAJRA",)
    neow(c, t, 9, "Elite")
    sec, held = fight(c, t, 2, 9, 2, 1, 60, ["FIRE_POTION", "BLOCK_POTION"], "TERROR_EEL", cards, relics, drink=True)
    sec = map_after(c, t, sec, 9, 2, 1, 55, ["BLOCK_POTION", "FLEX_POTION"], "Elite", "RestSite", cards, relics)
    sec = rest(c, t, sec, 9, 3, 1, 55, ["BLOCK_POTION", "FLEX_POTION"], "Boss", cards, relics)
    sec, held = fight(c, t, sec, 9, 4, 1, 75, ["BLOCK_POTION", "FLEX_POTION"], "VANTOM", cards, relics, powers=("STRENGTH_POWER",), turns=2)
    sec = map_after(c, t, sec, 9, 4, 2, 70, held, "Boss", "Monster", cards, relics)  # after the boss: already act 2
    fight(c, t, sec, 9, 5, 2, 30, held, "SEAPUNK", cards, relics, dies=True)

    d, t = "RUND00000004", "2026-09-21T11:00:"
    neow(d, t, 9, "Elite")
    sec, held = fight(d, t, 2, 9, 2, 1, 63, ["FIRE_POTION", "BLOCK_POTION"], "TERROR_EEL", drink=True)
    sec = map_after(d, t, sec, 9, 2, 1, 58, ["BLOCK_POTION", None], "Elite", "Monster")  # the boss node reads Monster
    sec, held = fight(d, t, sec, 9, 3, 1, 58, ["BLOCK_POTION", None], "CEREMONIAL_BEAST", drink=True, turns=2)
    sec = map_after(d, t, sec, 9, 3, 2, 50, [None, None], "Monster", "RestSite")
    sec = rest(d, t, sec, 9, 4, 2, 50, [None, None], "Monster")
    fight(d, t, sec, 9, 5, 2, 70, [None, None], "SEAPUNK", dies=True)

    with open(os.path.join(HERE, "states.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(fx.states) + "\n")
    with open(os.path.join(HERE, "decisions.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(fx.decisions) + "\n")
    runs = [
        {"run_id": c, "ended": "2026-09-21T10:00:40.000Z", "victory": False, "floor": 5, "character": "IRONCLAD", "ascension": 9, "code": "17ac095",
         "death_fight": ["海盗"]},
        {"run_id": d, "ended": "2026-09-21T11:00:40.000Z", "victory": False, "floor": 5, "character": "IRONCLAD", "ascension": 9, "code": "0c93138+dirty",
         "death_fight": ["海盗"]},
    ]
    with open(os.path.join(HERE, "runs.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(json.dumps(r, ensure_ascii=False) for r in runs) + "\n")
    calls = [
        {"ts": "2026-09-21T10:00:01.500Z", "model": "deepseek-flash", "label": "map/route-plan", "latency_ms": 3000,
         "usage": {"input_tokens": 20000, "cache_hit_tokens": 15000, "output_tokens": 500, "reasoning_tokens": 400}},
        {"ts": "2026-09-21T10:00:08.000Z", "model": "deepseek-flash", "label": "rest/plan", "latency_ms": 5000,
         "usage": {"input_tokens": 22000, "cache_hit_tokens": 16000, "output_tokens": 700, "reasoning_tokens": 600}},
    ]
    with open(os.path.join(HERE, "deepseek-reasoning.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(json.dumps(x) for x in calls) + "\n")
    brain = [
        {"ts": "2026-09-21T10:00:08.004Z", "label": "rest/plan", "engine": "deepseek", "model": "deepseek-flash", "system_sha": "s1", "system_chars": 9000,
         "question": "Rest?", "payload": {}, "tools": [], "tool_calls": [], "answer": {"choice": "heal"}, "problems": [], "reasks": 0, "attempts": 1,
         "latency_ms": 5000, "usage": {"inputTokens": 22000, "cacheHitTokens": 16000, "outputTokens": 700}},
        {"ts": "2026-09-21T11:00:12.000Z", "label": "rest/plan", "engine": "claude", "model": "claude-opus-5-5", "system_sha": "s2", "system_chars": 18000,
         "question": "Rest?", "payload": {}, "tools": [], "tool_calls": [], "answer": {"choice": "heal"}, "problems": [], "reasks": 0, "attempts": 1,
         "latency_ms": 9000, "usage": {"inputTokens": 30000, "cacheHitTokens": 18000, "cacheWriteTokens": 12000, "outputTokens": 900}},
    ]
    with open(os.path.join(HERE, "brain.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(json.dumps(x) for x in brain) + "\n")
    opus = fx.engine("claude-opus-5-5", True, 150, 300000)
    config = fx.run_config("2026-09-21T11:00:00.001Z", d, 9, 1, "0c93138+dirty", {"REST": "claude"}, "full", "dddd77778888", claude=opus)
    with open(os.path.join(HERE, "run-config.jsonl"), "w", encoding="utf8") as out:
        out.write(json.dumps(config, ensure_ascii=False) + "\n")
    # SL (docs/sl.md §5): run D's act-1 boss (F3) foresaw a certain death on attempt 1, was reloaded and won on attempt 2,
    # so its first attempts' run ends at F3 without passing act 1.
    def sl_row(ts, attempt, result, **extra):
        row = {"ts": ts, "run_id": d, "act": "1", "floor": 3, "encounter": "TEST_SUBJECT", "enemies": ["Test Subject"], "fight_kind": "boss",
               "elite": None, "attempt": attempt, "max_attempts": 4,
               "from": "first play of the fight" if attempt == 1 else "reloaded from the game's room-entry save of F3 (save_and_quit, continue_run)",
               "started_at": ts, "ended_at": ts, "result": result, "turns": 5, "end_hp": None, "end_block": None, "incoming": None,
               "judge": None, "reload": None, "give_up_reason": None, "summary": {"turns": [], "potions": [], "killers": []}}
        row.update(extra)
        return row
    sl = [sl_row("2026-09-21T11:00:20.000Z", 1, "predicted_death", end_hp=4, end_block=0, incoming=20,
                 judge={"tier": "rules", "reason": "nothing left to play or drink"}, reload={"ok": True, "ms": 20000, "resumed_turn": 1}),
          sl_row("2026-09-21T11:00:30.000Z", 2, "won", end_hp=30)]
    with open(os.path.join(HERE, "sl-attempts.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(json.dumps(x, ensure_ascii=False) for x in sl) + "\n")
    with open(os.path.join(HERE, "strength-sets.json"), "w", encoding="utf8") as out:
        out.write(json.dumps({"cards": ["FIGHT_ME", "INFLAME"], "relics": ["GIRYA", "VAJRA"]}) + "\n")


if __name__ == "__main__":
    main()
