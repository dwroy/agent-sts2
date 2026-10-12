"""Reproducible abstract card-flow models, not STS2 evidence or a learned policy."""

import json
import math
import random
import statistics
from fractions import Fraction


TURNS = 12
BASE_DRAW = 5
SAMPLES = 10000


def value(x):
    x = Fraction(x)
    return {"fraction": str(x), "decimal": float(x)}


def simulate(n, draw_cards, draw_cost, core_cost, energy, action_cap, seed):
    # C is one reusable output card; D draws two; F has no modeled effect.
    # Cards resolving an effect are unavailable to that effect's reshuffle.
    rng = random.Random(seed)
    draw = ["C"] + ["D"] * draw_cards + ["F"] * (n - draw_cards - 1)
    rng.shuffle(draw)
    discard = []
    hand = []
    counts = {"core_plays": 0, "core_draws": 0, "reshuffles": 0,
              "actual_draws": 0, "actions": 0, "guard_hit": 0}

    def take(count):
        for _ in range(count):
            if not draw:
                if not discard:
                    break
                draw.extend(discard)
                discard.clear()
                rng.shuffle(draw)
                counts["reshuffles"] += 1
            card = draw.pop()
            hand.append(card)
            counts["actual_draws"] += 1
            counts["core_draws"] += card == "C"

    for _ in range(TURNS):
        remaining_energy = energy
        actions = 0
        take(BASE_DRAW)
        while actions < action_cap:
            # A fixed disclosed policy, not an optimal-policy search.
            if "C" in hand and remaining_energy >= core_cost:
                hand.remove("C")
                remaining_energy -= core_cost
                discard.append("C")
                counts["core_plays"] += 1
            elif "D" in hand and remaining_energy >= draw_cost + core_cost:
                hand.remove("D")
                remaining_energy -= draw_cost
                take(2)
                discard.append("D")
            else:
                break
            actions += 1
        counts["actions"] += actions
        # Cap 100 is a numerical guard; smaller caps are explicit scenario rules.
        counts["guard_hit"] += action_cap == 100 and actions == 100
        discard.extend(hand)
        hand.clear()
    return counts


def sample(label, n, draw_cards=0, draw_cost=0, core_cost=1, energy=3, action_cap=100):
    samples = [simulate(n, draw_cards, draw_cost, core_cost, energy, action_cap, seed)
               for seed in range(SAMPLES)]
    plays = [x["core_plays"] for x in samples]
    se = statistics.stdev(plays) / math.sqrt(SAMPLES)
    return {"label": label, "cards": n, "draw_two_cards": draw_cards,
            "draw_card_cost": draw_cost, "core_cost": core_cost,
            "energy_per_turn": energy, "action_cap": action_cap,
            "samples": SAMPLES, "seed_range": [0, SAMPLES - 1],
            "mean_counts": {k: statistics.mean(x[k] for x in samples) for k in samples[0]},
            "core_plays_mean_95pct_mc_interval": [statistics.mean(plays) - 1.96 * se,
                                                   statistics.mean(plays) + 1.96 * se]}


def loop_witness(core_cards=1):
    # Two differently named draw-two cards alternate. Both available cards are
    # drawn, so random order cannot change this return to the identical state.
    core = [f"C{i + 1}" for i in range(core_cards)]
    start = {"hand": core + ["D1"], "draw": [], "discard": ["D2"], "energy": 0}
    hand, discard = start["hand"].copy(), start["discard"].copy()
    trace = [{"action": "start", "hand": hand.copy(), "discard": discard.copy(), "plays": 0}]
    plays = 0
    for action in core + ["D1"] + core + ["D2"]:
        hand.remove(action)
        if action in core:
            plays += 1
        else:
            assert len(discard) == core_cards + 1
            hand.extend(discard)
            discard.clear()
        discard.append(action)
        trace.append({"action": action, "hand": sorted(hand), "discard": discard.copy(), "plays": plays})
    assert sorted(hand) == sorted(start["hand"]) and discard == start["discard"]
    return {"all_costs_zero": True, "no_action_or_draw_cap": True,
            "identical_state_return": True, "net_core_plays": plays,
            "core_component_count": core_cards, "net_complete_combos": 2,
            "each_D_draws": core_cards + 1, "deck_cards": core_cards + 2,
            "draw_order_irrelevant_because_all_available_cards_drawn": True,
            "trace": trace,
            "meaning": "Positive-output cycle exists in this abstract model only; no actual STS2 combination claimed."}


baseline_rate = Fraction(BASE_DRAW, 20)
balance_cases = [("skip", 20, 0), ("remove_one_inert", 19, 0),
                 ("remove_five_inert", 15, 0), ("add_one_inert", 21, 0),
                 ("add_one_draw_one", 21, 1), ("add_one_draw_two", 21, 2)]
balance = []
for label, n, generated_draws in balance_cases:
    burden = n - generated_draws
    rate = Fraction(BASE_DRAW, burden)
    balance.append({"label": label, "N": n, "G": generated_draws,
                    "base_draws_needed_per_equivalent_pass": burden,
                    "equivalent_turns_per_pass": value(Fraction(burden, BASE_DRAW)),
                    "equivalent_passes_in_12_turns": value(TURNS * rate),
                    "rate_change": value(rate / baseline_rate - 1)})

single = [{"cards": n, "actual_start_draw": min(BASE_DRAW, n),
           "expected_plays_in_12_turns": value(Fraction(TURNS * min(BASE_DRAW, n), n)),
           "reason": "Uniform card labels; only start-turn draw; one C; no draw effects; C affordable."}
          for n in (30, 25, 20, 19, 15, 10, 5, 3, 1)]

pair = []
for n in (30, 20, 15, 10, 5, 3):
    hand = min(BASE_DRAW, n)
    p = Fraction(math.comb(hand, 2), math.comb(n, 2))
    # Enumerate positions of two distinct core cards to verify the formula.
    favorable = sum(a < hand and b < hand for a in range(n) for b in range(a + 1, n))
    assert p == Fraction(favorable, math.comb(n, 2))
    pair.append({"cards": n, "probability_A_and_B_in_same_hand": value(p),
                 "expected_complete_pair_plays_in_12_turns": value(TURNS * p)})

sampled = [sample("20_card_baseline", 20),
           sample("19_after_removing_inert", 19),
           sample("21_with_one_free_draw_two", 21, draw_cards=1),
           sample("21_with_one_cost_one_draw_two", 21, draw_cards=1, draw_cost=1),
           sample("20_card_core_cost_three", 20, core_cost=3),
           sample("21_with_draw_two_and_core_cost_three", 21, draw_cards=1, draw_cost=1, core_cost=3),
           sample("one_card_only", 1),
           sample("two_cards_C_and_D_free", 2, draw_cards=1, core_cost=0),
           sample("three_cards_energy_3", 3, draw_cards=2),
           sample("three_cards_cost_one_draw", 3, draw_cards=2, draw_cost=1),
           sample("three_cards_energy_6", 3, draw_cards=2, energy=6),
           sample("three_cards_free_but_six_actions", 3, draw_cards=2, core_cost=0, action_cap=6)]

by_label = {row["label"]: row for row in sampled}
for label, expected in (("20_card_baseline", 3), ("one_card_only", 12),
                        ("two_cards_C_and_D_free", 24), ("three_cards_energy_3", 36),
                        ("three_cards_cost_one_draw", 24), ("three_cards_energy_6", 72),
                        ("three_cards_free_but_six_actions", 36)):
    assert by_label[label]["mean_counts"]["core_plays"] == expected
assert all(row["mean_counts"]["guard_hit"] == 0 for row in sampled)

result = {
    "kind": "ops_abstract_cycle_quantification_not_game_evidence",
    "learned_game_policy": False,
    "actual_game_counterfactuals": None,
    "horizon_turns": TURNS,
    "assumptions": [
        "One reusable core C unless the exact A+B table is being considered.",
        "Cards are initially uniformly shuffled; turns start with up to five draws and refreshed energy.",
        "Empty draw pile refills from discard; cards held or resolving are excluded.",
        "Played C returns to discard; D returns only after its draw effect; other hand cards discard at turn end.",
        "C is played first when affordable; otherwise play D only if energy remains for one C.",
        "No retain, exhaust, powers, statuses, costs of acquiring/removing cards, enemy, damage, death or win modeling.",
        "N-G is steady flow bookkeeping, not an exact finite-turn reshuffle or combo-count predictor.",
        "Its assumptions fail at small piles, impossible draws, energy limits or unavailable return paths.",
        "The pair table requires both cards in the same hand, no retain or persistent setup, no draw effects, ample energy.",
        "Monte Carlo intervals quantify sampling uncertainty in this toy model, not model error or real-game uncertainty."
    ],
    "flow_balance": balance,
    "exact_thinning_without_extra_draw": single,
    "exact_two_component_coavailability": pair,
    "discrete_card_flow_samples": sampled,
    "repeatable_free_cycle_witnesses": [loop_witness(k) for k in (1, 2)],
    "three_card_loop_energy_bound": "k <= floor((E + draw_cost)/(core_cost + draw_cost)), positive denominator; first core already in hand",
    "three_card_loop_action_bound": "k <= floor((A + 1)/2), one core plus one draw action per extra repetition",
    "multi_component_loop_bound": {
        "energy": "complete_combos <= floor((E + draw_cost)/(total_combo_cost + draw_cost))",
        "actions": "complete_combos <= floor((action_cap + 1)/(component_count + 1))",
        "assumptions": "All core components initially held; each legal redraw retrieves the full combo and a reusable D; no setup fee, energy gain, retain or other restrictions. These are resource upper bounds for the witness architecture only."
    },
    "verification": "Exact pair enumeration, deterministic scenario assertions and no numerical guard hits passed."
}
print(json.dumps(result, ensure_ascii=False, indent=2))
