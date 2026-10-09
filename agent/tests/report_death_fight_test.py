"""silent-0254: TXZ6RVMQA09D A10 F48 reward -> F49 opening death, no action."""
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("report_death_fight", ROOT / "ops/report.py")
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


def frame(floor, hp, enemy=None, run_id="TXZ6RVMQA09D"):
    return {"run_id": run_id, "screen": "COMBAT" if enemy else "REWARD", "in_combat": bool(enemy),
            "run": {"floor": floor, "current_hp": hp, "max_hp": 62, "relics": []},
            "combat": {"player": {"current_hp": hp}, "enemies": [
                {"enemy_id": enemy, "name": enemy, "is_alive": True}]} if enemy else None}


class ReportDeathFightTest(unittest.TestCase):
    def test_opening_death_without_decisions_is_the_last_fight(self):
        recs = [{"ts": "01", "screen": "COMBAT", "floor": 48},
                {"ts": "02", "screen": "REWARD", "floor": 48},
                {"ts": "05", "screen": "GAME_OVER", "floor": 49}]
        states = {"01": frame(48, 4, "AEONGLASS"), "02": frame(48, 4),
                  "03": frame(49, 4, "TEST_SUBJECT"), "04": frame(49, 0, "TEST_SUBJECT"),
                  "05": {**frame(49, 0), "screen": "GAME_OVER"}}
        fights = report.fights_of(recs, states, died=True)
        self.assertEqual([f["floor"] for f in fights], [48, 49])
        self.assertEqual((fights[-1]["hp_start"], fights[-1]["hp_end"]), (4, 0))
        self.assertEqual(fights[-1]["enemies"], {"TEST_SUBJECT"})
        self.assertEqual(fights[-1]["enemy_ids"], {"TEST_SUBJECT"})
        self.assertEqual(fights[-1]["records"], [])
        self.assertEqual(len(fights[0]["records"]), 1)

    def test_stream_retains_same_run_frames_without_crossing_runs(self):
        rows = [json.dumps({"ts": str(i), "state": s}, separators=(",", ":")) for i, s in enumerate([
            frame(49, 4, "TEST_SUBJECT"), frame(49, 0, "TEST_SUBJECT"),
            {**frame(1, 80, "OTHER", "OTHER_RUN"), "note": "TXZ6RVMQA09D"}])]
        with patch("builtins.open", return_value=io.StringIO("\n".join(rows))):
            states = report.load_run_states("fixed.jsonl", "TXZ6RVMQA09D", set())
        self.assertEqual(set(states), {"0", "1"})
        self.assertEqual(states["1"]["run"]["current_hp"], 0)

    def test_existing_fight_and_post_combat_heal_contracts(self):
        report.selftest()


if __name__ == "__main__":
    unittest.main()
