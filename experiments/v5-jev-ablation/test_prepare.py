"""Fixed-data checks for experiment integrity; no provider or game calls."""
import copy
import json
import unittest
from prepare import compact, direct_choice, encoded, request_variant, select, unlabel


def fixture():
    options = {
        "plan1": {"plays": "synthetic action", "hp_lost": 1, "damage_dealt": 2, "dmg": 2,
                  "rollout_best": True, "quantitative_turn": {"unknown_cards": ["UNKNOWN"],
                  "realization": {"actions": [{"cost": 1}], "energy_paid": 1, "limits": "unknown", "complete_combinations": None}}},
        "plan2": {"plays": "synthetic end", "hp_lost": 0, "damage_dealt": 0, "rollout": "4 samples, not calibrated"}}
    return {"model": "jev-latest", "state": {"simulation_reference": {"rollout": {
        "best": "plan1", "tied": [], "ranking": "best", "samples": 4, "degraded": ["timeout"]}},
        "experience": "synthetic evidence only", "whole_fight_sim_trust": "low"},
        "questions": {"plan": {"type": "choice", "instructions": "Choose", "criteria": {
            k: encoded(v).decode() for k, v in options.items()}}}}


class ProtocolTest(unittest.TestCase):
    def test_blinding_keeps_limits_and_numbers(self):
        source = fixture()
        result = unlabel(source)
        ref = result["state"]["simulation_reference"]["rollout"]
        self.assertNotIn("best", ref)
        self.assertEqual(ref["samples"], 4)
        self.assertEqual(ref["degraded"], ["timeout"])
        self.assertEqual(result["state"]["whole_fight_sim_trust"], "low")
        self.assertNotIn("rollout_best", json.loads(result["questions"]["plan"]["criteria"]["plan1"]))
        self.assertIn("rollout_best", source["questions"]["plan"]["criteria"]["plan1"])

    def test_compact_keeps_unknowns_and_payment(self):
        result = compact(fixture())
        p = json.loads(result["questions"]["plan"]["criteria"]["plan1"])["quantitative_turn"]
        self.assertEqual(p["unknown_cards"], ["UNKNOWN"])
        self.assertEqual(p["realization"], {"energy_paid": 1, "limits": "unknown", "complete_combinations": None})

    def test_no_best_and_ties_abstain(self):
        source = fixture()
        self.assertEqual(direct_choice(source)["choice"], "plan1")
        self.assertIsNone(direct_choice(unlabel(source))["choice"])
        p = json.loads(source["questions"]["plan"]["criteria"]["plan2"])
        p["rollout_tied"] = "tied for the best rollout numbers with plan1"
        source["questions"]["plan"]["criteria"]["plan2"] = json.dumps(p)
        self.assertIsNone(direct_choice(source)["choice"])

    def test_order_changes_only_insertion(self):
        source = fixture()
        result = request_variant(source, "full", "reversed")
        self.assertEqual(list(result["questions"]["plan"]["criteria"]), ["plan2", "plan1"])
        self.assertEqual(result["questions"], source["questions"])
        self.assertEqual(result["model"], "jev-1.13.0")

    def test_sampling_not_input_order_dependent_and_fights_unique(self):
        cases = []
        for g, (cat, matched) in enumerate([("unique_best", True), ("unique_best", False), ("tied_best", True), ("no_declared_best", None)]):
            for i in range(12):
                cases.append({"run": str(i % 6), "floor": 20 * g + i, "category": cat,
                              "matched": matched, "source": {"sha256": str(i + 100 * g)}})
        runs = {str(i) for i in range(6)}
        selected = select(cases, runs)
        self.assertEqual(selected, select(list(reversed(cases)), runs))
        self.assertEqual(len({(c['run'], c['floor']) for c in selected}), 32)
        with self.assertRaises(ValueError):
            select(cases[:4], runs)


if __name__ == "__main__":
    unittest.main()
