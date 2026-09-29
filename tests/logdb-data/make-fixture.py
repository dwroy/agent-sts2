#!/usr/bin/env python3
"""Writes the small fixed log sample in this directory (tests/logdb_test.py, tests/logs-query.test.ts).

Two runs in the shape of the real logs (states.jsonl lines carry an agent_view copy at the end, decisions
share their state's ts, fingerprints are JSON strings):
  RUNA00000001  A9: Neow (floor 1) -> hallway fight on floor 2 (won; a card selection inside the fight;
                Burning Blood heals after) -> elite on floor 3 (a potion drunk, died on turn 2): in runs.jsonl.
  RUNB00000002  A8: floor 2 hallway fight (won) -> floor 3 rest site (heal): still going, not in runs.jsonl.
Plus a main-menu frame between them, one broken states line, two DeepSeek calls (one logged a few ms before
run A's first frame, like the Neow question), one brain.jsonl call, one run plan.

Run it again after changing it: python3 tests/logdb-data/make-fixture.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

states, decisions = [], []


def fingerprint(run_id, screen, hp, max_hp, gold, hand="", potions="", actions=(), combat=False):
    return json.dumps({"actions": list(actions), "combat": combat, "enemies": "", "gold": gold, "hand": hand, "hp": hp, "maxHp": max_hp,
                       "nodes": "", "pendingCard": False, "player": "0:0:0", "potions": potions, "powers": "", "rewards": "",
                       "run": run_id, "screen": screen, "selection": "null:false", "shopOpen": False, "shopStock": "", "turn": None},
                      separators=(",", ":"))


def card(card_id, upgraded=False):
    return {"index": 0, "card_id": card_id, "name": card_id.lower(), "upgraded": upgraded, "card_type": "Attack", "rules_text": "造成6点伤害。"}


def run_part(asc, floor, act, hp, max_hp, gold, potions, deck=None):
    deck = deck or [card("STRIKE_IRONCLAD"), card("STRIKE_IRONCLAD"), card("DEFEND_IRONCLAD"), card("BASH", True)]
    slots = [{"index": i, "potion_id": p, "occupied": p is not None} for i, p in enumerate(potions)]
    return {"character_id": "IRONCLAD", "character_name": "铁甲战士", "ascension": asc, "floor": floor, "current_hp": hp, "max_hp": max_hp,
            "gold": gold, "max_energy": 3, "act_id": str(act - 1), "boss_id": "VANTOM_BOSS", "deck": deck,
            "relics": [{"index": 0, "relic_id": "BURNING_BLOOD", "name": "燃烧之血"}], "players": [], "potions": slots}


def enemy(index, eid, hp, max_hp, damage=None, hits=None, alive=True, powers=()):
    intents = [{"index": 0, "intent_type": "Attack" if damage else "Buff", "damage": damage, "hits": hits}]
    return {"index": index, "enemy_id": eid, "name": eid, "current_hp": hp, "max_hp": max_hp, "block": 0, "is_alive": alive,
            "powers": [{"power_id": p, "amount": 1} for p in powers], "move_id": f"{eid}_MOVE", "intents": intents}


def state(ts, run_id, screen, run=None, turn=None, in_combat=False, combat=None, themap=None, event=None, game_over=None,
          observed=False, fp=None, extra_state=None):
    body = {"state_version": 16, "native_profile_id": 1, "run_id": run_id, "screen": screen,
            "session": {"mode": "singleplayer", "phase": "run" if run else "menu", "control_scope": "local_player"},
            "in_combat": in_combat, "turn": turn, "available_actions": [], "combat": combat, "run": run, "map": themap,
            "selection": None, "event": event, "game_over": game_over, **(extra_state or {})}
    body["agent_view"] = {"version": 11, "screen": screen, "run_id": run_id, "combat": {"draw": [], "discard": [], "exhaust": [], "enemies": []}}
    line = {"ts": ts}
    if observed:
        line.update({"observed_ts": ts, "observed": True})
    line.update({"fingerprint": fp or fingerprint(run_id, screen, (run or {}).get("current_hp"), (run or {}).get("max_hp"), (run or {}).get("gold")),
                 "screen": screen, "session": "singleplayer/run" if run else "singleplayer/menu", "state": body})
    states.append(json.dumps(line, ensure_ascii=False, separators=(",", ":")))


def combat_part(hp, block, enemies, cards_played=0, energy=3, powers=()):
    return {"player": {"current_hp": hp, "max_hp": 80, "block": block, "energy": energy, "powers": [{"power_id": p, "amount": 2} for p in powers],
                       "cards_played_this_turn": cards_played}, "hand": [], "enemies": enemies}


def the_map(row, col, current_type, avail):
    nodes = [{"row": row, "col": col, "node_type": current_type}]
    return {"current_node": {"row": row, "col": col}, "nodes": nodes,
            "available_nodes": [{"index": i, "row": row + 1, "col": c, "node_type": t} for i, (c, t) in enumerate(avail)]}


def decision(ts, run_id, screen, floor, turn, label, chosen, decider="code", fp=None, **extra):
    record = {"ts": ts, "mode": "play", "screen": screen, "session": "singleplayer/run", "floor": floor, "turn": turn, "label": label,
              "decider": decider, "fingerprint": fp or fingerprint(run_id, screen, 70, 80, 99), "chosen": chosen, "rationale": extra.pop("rationale", "code"),
              "confidence": extra.pop("confidence", None), "fallback": False, "reasked": False, "no_jev": False, "reused_answer": False,
              "request_ids": [], "latency_ms": {"plan": 1, "jev": 0, "action": 50}, "usage": {"input_tokens": 0, "output_tokens": 0},
              "run_id": run_id, "observed_ts": ts, "result": "completed: Action completed."}
    record.update(extra)
    decisions.append(json.dumps(record, ensure_ascii=False, separators=(",", ":")))


def main():
    a = "RUNA00000001"
    t = "2026-09-20T10:00:"
    # Floor 1: Neow, then the map with two choices.
    state(t + "00.000Z", a, "EVENT", run_part(9, 1, 1, 80, 80, 99, [None, None]), event={"event_id": "NEOW", "title": "涅奥"})
    decision(t + "00.000Z", a, "EVENT", 1, None, "event/choose", {"action": "choose_event_option", "option_index": 0}, decider="deepseek",
             deepseek={"by": "deepseek", "direct": True, "choice": "o0", "reason": "free relic", "latency_ms": 900, "tokens": 1200, "effort": "max"})
    state(t + "01.000Z", a, "MAP", run_part(9, 1, 1, 80, 80, 99, [None, None]), themap=the_map(0, 3, "Ancient", [(2, "Monster"), (5, "Unknown")]))
    decision(t + "01.000Z", a, "MAP", 1, None, "map/route", {"action": "choose_map_node", "option_index": 0})
    # Floor 2: hallway fight, two turns; a card selection inside turn 1.
    hand = "0:STRIKE_IRONCLAD:true|1:BASH:true|2:DEFEND_IRONCLAD:true"
    run2 = run_part(9, 2, 1, 80, 80, 99, ["FIRE_POTION", None])
    fp = fingerprint(a, "COMBAT", 80, 80, 99, hand=hand, potions="FIRE_POTION:true:true|:false:false", combat=True)
    state(t + "02.000Z", a, "COMBAT", run2, turn=1, in_combat=True, fp=fp,
          combat=combat_part(80, 0, [enemy(0, "NIBBIT", 40, 44, 12, 1), enemy(1, "NIBBIT", 44, 44)]))
    decision(t + "02.000Z", a, "COMBAT", 2, 1, "combat/plan-choice", {"action": "play_card", "card_index": 1, "target_index": 0}, decider="jev", fp=fp,
             confidence=0.62, questions={"plan": {"type": "choice", "instructions": "Which plan?", "criteria": {"plan1": "{}", "plan2": "{}"}}},
             answers={"plan": {"type": "choice", "choice": "plan2", "probabilities": {"plan1": 0.38, "plan2": 0.62}, "confidence": 0.62, "raw": {}}},
             rollout={"available": True, "ms": 40, "horizon": 5, "samples": 8, "degraded": [], "lines": 4, "best": None, "best_added": False, "tied": ["plan1", "plan2"]},
             rollout_best_chosen=True, jev_context="v1", jev_hints=["vulnerable-trade"],
             rationale="Jev chose plan 2 (sk-FAKEFAKEFAKEFAKEFAKE0000 is key-shaped: never stored)")
    state(t + "03.000Z", a, "CARD_SELECTION", run2, turn=1, in_combat=True,
          combat=combat_part(80, 0, [enemy(0, "NIBBIT", 32, 44, 12, 1), enemy(1, "NIBBIT", 44, 44)], cards_played=1))
    decision(t + "03.000Z", a, "CARD_SELECTION", 2, 1, "selection/add", {"action": "select_deck_card", "option_index": 0})
    fp = fingerprint(a, "COMBAT", 80, 80, 99, hand="0:STRIKE_IRONCLAD:true|1:DEFEND_IRONCLAD:true", potions="FIRE_POTION:true:true|:false:false", combat=True)
    state(t + "04.000Z", a, "COMBAT", run2, turn=1, in_combat=True, fp=fp,
          combat=combat_part(80, 0, [enemy(0, "NIBBIT", 32, 44, 12, 1), enemy(1, "NIBBIT", 44, 44)], cards_played=1, energy=1))
    decision(t + "04.000Z", a, "COMBAT", 2, 1, "combat/plan-continue", {"action": "play_card", "card_index": 1}, fp=fp)
    state(t + "05.000Z", a, "COMBAT", run2, turn=1, in_combat=True, observed=True,
          combat=combat_part(80, 5, [enemy(0, "NIBBIT", 32, 44, 12, 1), enemy(1, "NIBBIT", 44, 44)], cards_played=2, energy=0))
    fp = fingerprint(a, "COMBAT", 73, 80, 99, hand="0:STRIKE_IRONCLAD:true", combat=True)
    run2b = run_part(9, 2, 1, 73, 80, 99, ["FIRE_POTION", None])
    state(t + "06.000Z", a, "COMBAT", run2b, turn=2, in_combat=True, fp=fp,
          combat=combat_part(73, 0, [enemy(0, "NIBBIT", 5, 44, 6, 2), enemy(1, "NIBBIT", 0, 44, alive=False)], powers=("STRENGTH_POWER",)))
    decision(t + "06.000Z", a, "COMBAT", 2, 2, "combat/plan-choice", {"action": "play_card", "card_index": 0, "target_index": 0}, decider="jev", fp=fp,
             confidence=0.9, rollout={"available": True, "ms": 12, "horizon": 5, "samples": 8, "degraded": ["horizon 3"], "lines": 2, "best": "plan1", "best_added": False},
             rollout_best_chosen=True)
    state(t + "07.000Z", a, "REWARD", run_part(9, 2, 1, 79, 80, 120, ["FIRE_POTION", None]), turn=2)
    decision(t + "07.000Z", a, "REWARD", 2, 2, "reward/claim", {"action": "claim_reward", "option_index": 0})
    state(t + "08.000Z", a, "MAP", run_part(9, 2, 1, 79, 80, 120, ["FIRE_POTION", None]), themap=the_map(1, 2, "Monster", [(1, "Elite"), (3, "RestSite")]))
    decision(t + "08.000Z", a, "MAP", 2, None, "map/route", {"action": "choose_map_node", "option_index": 0})
    # Floor 3: elite; a potion on turn 1, dead on turn 2 (no map frame after: the room comes from the choice).
    run3 = run_part(9, 3, 1, 79, 80, 120, ["FIRE_POTION", None])
    fp = fingerprint(a, "COMBAT", 79, 80, 120, hand="0:STRIKE_IRONCLAD:true", potions="FIRE_POTION:true:true|:false:false", combat=True)
    state(t + "09.000Z", a, "COMBAT", run3, turn=1, in_combat=True, fp=fp, combat=combat_part(79, 0, [enemy(0, "TERROR_EEL", 140, 140, 30, 1)]))
    decision(t + "09.000Z", a, "COMBAT", 3, 1, "combat/plan-potion", {"action": "use_potion", "option_index": 0, "target_index": 0}, fp=fp)
    run3b = run_part(9, 3, 1, 79, 80, 120, [None, None])
    fp = fingerprint(a, "COMBAT", 79, 80, 120, hand="0:STRIKE_IRONCLAD:true", combat=True)
    state(t + "10.000Z", a, "COMBAT", run3b, turn=1, in_combat=True, fp=fp, combat=combat_part(79, 0, [enemy(0, "TERROR_EEL", 120, 140, 30, 1)]))
    decision(t + "10.000Z", a, "COMBAT", 3, 1, "combat/plan-choice", {"action": "end_turn"}, decider="jev", fp=fp, confidence=0.3,
             escalation={"jev_choice": "plan1", "jev_confidence": 0.3, "deepseek_choice": "plan2", "reason": "block", "latency_ms": 500, "tokens": 800, "effort": "max"})
    run3c = run_part(9, 3, 1, 49, 80, 120, [None, None])
    state(t + "11.000Z", a, "COMBAT", run3c, turn=2, in_combat=True, combat=combat_part(49, 0, [enemy(0, "TERROR_EEL", 120, 140, 60, 1)]))
    decision(t + "11.000Z", a, "COMBAT", 3, 2, "combat/plan-choice", {"action": "end_turn"}, decider="jev", confidence=0.5)
    state(t + "12.000Z", a, "GAME_OVER", run_part(9, 3, 1, 0, 80, 120, [None, None]), turn=2, game_over={"is_victory": False, "floor": 3})
    decision(t + "12.000Z", a, "GAME_OVER", 3, 2, "run/game-over", {"action": "continue_game_over"})
    # Between runs: the main menu, and one line cut short (a crash while writing).
    state(t + "20.000Z", "run_unknown", "MAIN_MENU")
    states.append('{"ts":"2026-09-20T10:00:21.000Z","fingerprint":"{}","screen":"MAIN_MENU","sta')

    b = "RUNB00000002"
    t = "2026-09-20T11:00:"
    state(t + "00.000Z", b, "MAP", run_part(8, 1, 1, 80, 80, 99, [None, None]), themap=the_map(0, 3, "Ancient", [(1, "Monster")]))
    decision(t + "00.000Z", b, "MAP", 1, None, "map/route", {"action": "choose_map_node", "option_index": 0})
    fp = fingerprint(b, "COMBAT", 80, 80, 99, hand="0:BASH:true|1:DEFEND_IRONCLAD:true", combat=True)
    state(t + "01.000Z", b, "COMBAT", run_part(8, 2, 1, 80, 80, 99, [None, None]), turn=1, in_combat=True, fp=fp,
          combat=combat_part(80, 0, [enemy(0, "SEAPUNK", 30, 30, 9, 1)]))
    decision(t + "01.000Z", b, "COMBAT", 2, 1, "combat/plan-choice", {"action": "play_card", "card_index": 0, "target_index": 0}, decider="jev", fp=fp, confidence=0.8)
    state(t + "02.000Z", b, "COMBAT", run_part(8, 2, 1, 71, 80, 99, [None, None]), turn=2, in_combat=True, combat=combat_part(71, 0, [enemy(0, "SEAPUNK", 8, 30, 9, 1)]))
    decision(t + "02.000Z", b, "COMBAT", 2, 2, "combat/plan-choice", {"action": "play_card", "card_index": 0, "target_index": 0}, decider="jev", confidence=0.95)
    state(t + "03.000Z", b, "REWARD", run_part(8, 2, 1, 77, 80, 110, ["BLOCK_POTION", None]), turn=2)
    decision(t + "03.000Z", b, "REWARD", 2, 2, "reward/card", {"action": "skip_reward_cards"}, decider="deepseek",
             usage={"input_tokens": 20000, "output_tokens": 300, "cache_hit_tokens": 15000, "reasoning_tokens": 250},
             deepseek={"by": "deepseek", "direct": True, "choice": "skip", "reason": "lean deck", "latency_ms": 4000, "tokens": 20300, "effort": "max"})
    state(t + "04.000Z", b, "MAP", run_part(8, 2, 1, 77, 80, 110, ["BLOCK_POTION", None]), themap=the_map(1, 1, "Monster", [(1, "RestSite")]))
    decision(t + "04.000Z", b, "MAP", 2, None, "map/route", {"action": "choose_map_node", "option_index": 0})
    state(t + "05.000Z", b, "REST", run_part(8, 3, 1, 77, 80, 110, ["BLOCK_POTION", None]), extra_state={"rest": {"options": [{"index": 0, "option_id": "HEAL"}]}})
    decision(t + "05.000Z", b, "REST", 3, None, "rest/choose", {"action": "choose_rest_option", "option_index": 0})
    state(t + "06.000Z", b, "MAP", run_part(8, 3, 1, 80, 80, 110, ["BLOCK_POTION", None]), themap=the_map(2, 1, "RestSite", [(0, "Monster")]))

    with open(os.path.join(HERE, "states.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(states) + "\n")
    with open(os.path.join(HERE, "decisions.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(decisions) + "\n")
    with open(os.path.join(HERE, "runs.jsonl"), "w", encoding="utf8") as out:
        out.write(json.dumps({"run_id": a, "ended": "2026-09-20T10:00:13.000Z", "victory": False, "floor": 3, "character": "IRONCLAD", "ascension": 9,
                              "code": "abc1234", "decisions": 14, "jev_calls": 5, "deepseek_calls": 1, "claude_calls": 0, "tokens": 5000,
                              "deciders": {"jev": 5, "code": 8, "deepseek": 1}, "death_fight": ["恐怖鳗鱼"]}, ensure_ascii=False) + "\n")
    calls = [
        # Logged 2 ms before run A's first frame (the Neow question): belongs to run A.
        {"ts": "2026-09-20T09:59:59.998Z", "model": "deepseek-flash", "effort": "max", "guide": "", "latency_ms": 900, "question": "Which option?",
         "options": ["o0", "o1"], "choice": "o0", "reason": "free relic", "reasoning": "Neow gives a relic." * 5},
        {"ts": "2026-09-20T11:00:03.500Z", "model": "deepseek-flash", "label": "reward/card", "effort": "max", "guide": "g1", "latency_ms": 4000,
         "question": "Which card?", "options": ["card1", "skip"], "choice": "skip", "reason": "lean deck", "reasoning": "x" * 120,
         "memory": {"now": "现状"}, "memory_chars": 2, "answer": {"summary": "skip"},
         "usage": {"input_tokens": 20000, "cache_hit_tokens": 15000, "output_tokens": 300, "reasoning_tokens": 250}},
    ]
    with open(os.path.join(HERE, "deepseek-reasoning.jsonl"), "w", encoding="utf8") as out:
        out.write("\n".join(json.dumps(c, ensure_ascii=False) for c in calls) + "\n")
    with open(os.path.join(HERE, "brain.jsonl"), "w", encoding="utf8") as out:
        out.write(json.dumps({"ts": "2026-09-20T11:00:05.200Z", "label": "rest/choose", "engine": "claude", "model": "opus", "system_hash": "abcd",
                              "question": "Heal or smith?", "answer": {"choice": "o0", "reason": "low HP"}, "attempts": 1, "latencyMs": 7000,
                              "usage": {"inputTokens": 30000, "outputTokens": 400}, "toolCalls": [{"name": "kb_stats", "input": {}, "output": "…", "ms": 3}]},
                             ensure_ascii=False) + "\n")
    with open(os.path.join(HERE, "run-plans.jsonl"), "w", encoding="utf8") as out:
        out.write(json.dumps({"ts": "2026-09-20T11:00:00.500Z", "run": b, "floor": 1, "trigger": "start",
                              "plan": {"archetype": "strength", "summary": "take strength", "want": ["INFLAME"], "avoid": ["CLASH"]},
                              "latency_ms": 5000, "input_tokens": 10000, "output_tokens": 800, "cache_hit_tokens": 8000, "reasoning_tokens": 700, "effort": "max"},
                             ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
