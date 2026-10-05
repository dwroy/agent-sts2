"""Fixed logged turn openings for silent-0040; no mutable knowledge files or network."""
import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("boss_attempts", ROOT / "knowledge/builders/build-boss-damage.py")
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)


def frames(run_id, floor, boss, turns, husk_turn=None, stacks=0, character="SILENT"):
    result = []
    for turn, (hp, shown) in enumerate(turns, 1):
        husk = husk_turn is not None and turn >= husk_turn
        result.append({"state": {"run_id": run_id, "turn": turn, "in_combat": True,
            "run": {"floor": floor, "ascension": 0, "character_id": character},
            "combat": {"player": {"current_hp": hp, "max_hp": 80}, "enemies": [{
                "enemy_id": boss, "current_hp": 999999999 if husk else 100,
                "max_hp": 999999999 if husk else 100, "is_alive": True,
                "powers": [{"power_id": "STEAM_ERUPTION_POWER", "amount": stacks}] if husk else [],
                "intents": [{"damage": shown, "hits": 1}]}]}}})
    return result


class BossAttemptsTest(unittest.TestCase):
    def build(self, states, runs, character="silent"):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / "states.jsonl").write_text("".join(json.dumps(s, separators=(",", ":")) + "\n" for s in states))
            (path / "runs.jsonl").write_text("".join(json.dumps(r) + "\n" for r in runs))
            argv = ["build-boss-damage.py", "--logs", directory, "--character", character,
                    "--out", str(path / "out.json"), "--fights", str(path / "fights.jsonl")]
            with patch.object(sys, "argv", argv), contextlib.redirect_stdout(io.StringIO()):
                db.main()
            return json.loads((path / "out.json").read_text()), [json.loads(line) for line in (path / "fights.jsonl").read_text().splitlines()]

    def test_test_subject_does_not_splice_first_third_and_sixth_attempt(self):
        first = [(80, 20), (67, 14), (67, 36), (49, 15), (49, 29), (49, 30), (41, 40), (21, 50), (2, 42)]
        third = [(80, 20), (67, 14), (64, 33), (48, 13), (48, 27), (48, 30), (48, 40), (26, 50), (9, 42), (4, 49)]
        sixth = [(80, 20), (67, 14), (64, 33), (48, 13), (48, 27), (48, 30), (48, 40), (33, 50), (15, 42), (15, 30), (6, 33)]
        states = [s for turns in (first, third, sixth) for s in frames("T082DRCUHRRD", 48, "TEST_SUBJECT", turns)]
        out, rows = self.build(states, [{"run_id": "T082DRCUHRRD", "character_id": "SILENT", "floor": 48, "victory": False}])
        self.assertEqual(out["TEST_SUBJECT"]["hp_lost"], 80)  # Previously 84 from spliced turns.
        self.assertEqual(out["TEST_SUBJECT"]["shown"], sum(shown for _, shown in sixth))
        self.assertEqual(out["TEST_SUBJECT"]["fights"], 1)
        self.assertEqual(rows[0]["turns"], 11)
        self.assertEqual(rows[0]["final_hp"], 0)

    def test_winning_giant_attempt_drops_failed_turns_and_kill_metadata(self):
        first = [(53, 0), (53, 15), (49, 10), (49, 0), (49, 20), (45, 13), (45, 15), (41, 10), (41, 0), (41, 25), (36, 13), (34, 15), (34, 10), (32, 0), (32, 30), (29, 13), (29, 15), (25, 10), (25, 63)]
        final = [(53, 0), (53, 15), (53, 10), (53, 0), (53, 20), (46, 13), (46, 15), (39, 10), (39, 0), (39, 25), (34, 13), (34, 15), (34, 10), (34, 0), (34, 51)]
        states = frames("C48LLXBGKXQ9", 17, "WATERFALL_GIANT", first, 18, 63)
        states += frames("C48LLXBGKXQ9", 17, "WATERFALL_GIANT", final, 14, 51)
        out, rows = self.build(states, [{"run_id": "C48LLXBGKXQ9", "character_id": "SILENT", "floor": 33, "victory": False}])
        self.assertEqual(rows[0]["turns"], 15)
        self.assertEqual(rows[0]["final_hp"], 34)
        self.assertEqual(rows[0]["outcome"], "won")
        self.assertEqual(out["WATERFALL_GIANT"]["kills"]["0"][0],
                         {"run": "C48L", "turn": 14, "hp": 34, "stacks": 51, "won": True})

    def test_interleaved_rooms_and_same_turn_replans_do_not_reset(self):
        states = frames("WIN", 48, "QUEEN", [(70, 10)])
        states += frames("OTHER", 33, "THE_INSATIABLE", [(60, 20)])
        states += frames("WIN", 48, "QUEEN", [(65, 99)])  # Same turn, not a reload.
        states += frames("WIN", 48, "QUEEN", [(70, 10), (65, 10)])[1:]
        out, rows = self.build(states, [{"run_id": "WIN", "character_id": "SILENT", "floor": 48, "victory": True},
                                       {"run_id": "OTHER", "character_id": "SILENT", "floor": 33, "victory": False}])
        self.assertEqual(out["QUEEN"]["hp_lost"], 5)
        self.assertEqual(out["QUEEN"]["shown"], 10)
        self.assertEqual(next(r for r in rows if r["key"] == "WIN")["entry_hp"], 70)

    def test_incomplete_reload_does_not_borrow_previous_entry(self):
        states = frames("PARTIAL", 48, "TEST_SUBJECT", [(80, 20), (60, 20), (40, 20)])
        states += frames("PARTIAL", 48, "TEST_SUBJECT", [(80, 20), (65, 20)])[1:]
        out, rows = self.build(states, [{"run_id": "PARTIAL", "character_id": "SILENT", "floor": 48, "victory": False}])
        self.assertEqual(rows, [])
        self.assertEqual(out, {})

    def test_single_attempt_ironclad_keeps_existing_values(self):
        states = frames("IRON", 48, "QUEEN", [(70, 10), (65, 10)], character="IRONCLAD")
        out, rows = self.build(states, [{"run_id": "IRON", "floor": 48, "victory": True}], "ironclad")
        self.assertEqual(out["QUEEN"]["hp_lost"], 5)
        self.assertEqual(out["QUEEN"]["shown"], 10)
        self.assertEqual(rows[0]["loss_per_turn"], 2.5)


if __name__ == "__main__":
    unittest.main()
