"""Fixed logged faces, plus parser and evidence-boundary regressions."""
import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("card_upgrades", HERE / "build-card-upgrades.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
FIXTURE = HERE.parents[1] / "agent/tests/card-upgrade-data/logged-faces.jsonl"
IDS = {"AFTERIMAGE", "MALAISE", "CALCULATED_GAMBLE", "MIRAGE", "INFINITE_BLADES", "SPEEDSTER"}


class CardUpgradesTest(unittest.TestCase):
    def build_rows(self, rows):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "states.jsonl"
            path.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n")
            return builder.build(path)

    def test_all_six_actual_log_faces_and_sources_survive(self):
        result = builder.build(FIXTURE)
        self.assertEqual(result, json.loads((FIXTURE.parent / "upgrades.json").read_text()))
        self.assertEqual(set(result), IDS)
        rows = [json.loads(line) for line in FIXTURE.read_text().splitlines()]
        for row in rows:
            card = row["state"]["run"]["deck"][0]
            entry = result[card["card_id"]]
            self.assertEqual(entry["vars"], {})
            self.assertNotIn("cost", entry)
            face = entry["faces"][int(card["upgraded"])]
            self.assertEqual(face["card"], {k: v for k, v in card.items() if k in builder.FACE_FIELDS})
            self.assertEqual(face["evidence"]["run_id"], row["state"]["run_id"])
            self.assertEqual(face["evidence"]["off"], row["source"]["off"])
            self.assertEqual(face["evidence"]["sha256"], row["source"]["sha256"])
            self.assertEqual(face["n_runs"], 1)

    def test_field_order_and_long_rules_do_not_hide_a_numeric_upgrade(self):
        def row(upgraded, number):
            card = {"dynamic_values": [{"name": "FixtureValue", "base_value": number}],
                    "rules_text": "fixture " * 300, "energy_cost": 2,
                    "upgraded": upgraded, "card_id": "TEST_CARD", "name": "fixture"}
            return {"state": {"run": {"deck": [card]}}}
        result = self.build_rows([row(False, 3), row(True, 5)])
        self.assertEqual(result["TEST_CARD"]["vars"], {"FixtureValue": [3, 5]})

    def test_missing_side_or_modified_or_combat_only_faces_remain_unknown(self):
        rows = [json.loads(line) for line in FIXTURE.read_text().splitlines()]
        pair = [row for row in rows if row["state"]["run"]["deck"][0]["card_id"] == "MIRAGE"]
        self.assertEqual(self.build_rows(pair[:1]), {})
        pair[1]["state"]["run"]["deck"][0]["dynamic_values"][0]["is_modified"] = True
        self.assertEqual(self.build_rows(pair), {})
        for row in pair:
            row["state"]["in_combat"] = True
        self.assertEqual(self.build_rows(pair), {})

    def test_independent_run_counts_and_damaged_rows_are_audited(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "states.jsonl"
            good = FIXTURE.read_bytes()
            damaged = b'{"state": damaged}\n'
            path.write_bytes(good + good + damaged)
            audit = {}
            result = builder.build(path, audit=audit)
            self.assertEqual(len(audit["invalid_json"]), 1)
            self.assertEqual(audit["invalid_json"][0]["off"], len(good) * 2)
            self.assertTrue(all(face["n_runs"] == 1 for entry in result.values() for face in entry["faces"]))

    def test_partial_refresh_preserves_other_cards_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "upgrades.json"
            other = {"n": [7, 8], "vars": {"FixtureValue": [2, 4]}}
            path.write_text(json.dumps({"OTHER_FIXTURE_CARD": other}))
            command = [sys.executable, str(HERE / "build-card-upgrades.py"), str(FIXTURE),
                       "--cards", *sorted(IDS), "--out", str(path)]
            subprocess.run(command, check=True, capture_output=True)
            first = path.read_bytes()
            self.assertEqual(json.loads(first)["OTHER_FIXTURE_CARD"], other)
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(path.read_bytes(), first)


if __name__ == "__main__":
    unittest.main()
