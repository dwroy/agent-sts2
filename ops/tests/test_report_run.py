"""Fixed interrupted-run recovery fixtures; no model, mod, production logs or refresh processes."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
from report_run import Recovery, rows_for
from llm_handoff import locked

RUN = "AAA000000001"


class ReportRecovery(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ("ops/codex-ops", "logs/console", "notes"):
            (self.root / name).mkdir(parents=True)
        shutil.copy(ROOT / "ops/report.py", self.root / "ops/report.py")
        self.end = {"is_victory": False, "floor": 2, "character_id": "SILENT", "phase": "summary_animating"}
        self.state = {"run_id": RUN, "screen": "GAME_OVER", "run": {"character_id": "SILENT"},
                      "game_over": {**self.end, "phase": "finished"}}
        decisions = []; states = []
        for i, screen in enumerate(("EVENT", "EVENT", "GAME_OVER")):
            ts = f"2026-10-11T10:0{i}:00.000Z"
            decisions.append({"ts": ts, "mode": "play", "screen": screen, "floor": 2, "label": "fixture",
                              "decider": "code", "rationale": "fixture", "confidence": 1,
                              "fingerprint": json.dumps({"run": RUN, "hp": 0})})
            states.append({"ts": ts, "state": {"run_id": RUN, "screen": screen, "in_combat": False,
                           "run": {"character_id": "SILENT", "ascension": 10},
                           "game_over": self.end if screen == "GAME_OVER" else None}})
        self.decisions = decisions
        for name, rows in (("decisions", decisions), ("states", states)):
            (self.root / "logs" / (name + ".jsonl")).write_text("\n".join(map(json.dumps, rows)) + "\n")
        (self.root / "logs/runs.jsonl").write_text("")
        (self.root / "logs/console/20261011-180000-abcdef1.log").write_text(f"run {RUN} started\ninterrupted\n")
        (self.root / "logs/console/20261011-180100-abcdef2+dirty.log").write_text(f"run {RUN} in progress\nstopped: run 1 ended (defeat)\n")
        (self.root / "logs/console/20261011-180200-abcdef3.log").write_text("another run; stopped: run 1 ended (victory)\n")
        self.recovery = Recovery(self.root, lambda: self.state, lambda _: [])
        self.refresh = Mock(return_value={"exit": 0, "fight_value": "background"})
        self.cost = Mock(); self.boss = Mock()
        render = self.recovery.render
        def wrapped(*args):
            module, character = render(*args)
            module.refresh_knowledge = self.refresh
            module.refresh_costs = self.cost
            module.boss_sim_check = self.boss
            return module, character
        p = patch.object(self.recovery, "render", side_effect=wrapped)
        p.start(); self.addCleanup(p.stop)
        p = patch.dict(os.environ); p.start(); self.addCleanup(p.stop)

    def test_full_segments_historical_code_and_idempotent_refresh(self):
        result = self.recovery.run(RUN)
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["summary"]["decisions"], 3)
        self.assertEqual(result["summary"]["code"], "abcdef2+dirty")
        self.assertEqual(result["summary"]["character"], "SILENT")
        self.assertEqual(len(result["sources"]["consoles"]), 2)
        self.assertEqual(result["sources"]["decisions"]["selected_rows"], 3)
        self.assertEqual(len(result["sources"]["states"]["byte_ranges"]), 3)
        self.assertTrue(Path(result["report"]).is_file())
        self.state["run_id"] = "ANOTHER00001"
        self.assertTrue(self.recovery.run(RUN)["reused"])
        self.refresh.assert_called_once_with("silent")
        self.cost.assert_called_once(); self.boss.assert_called_once_with("silent")
        self.assertEqual(len(rows_for(self.root / "logs/runs.jsonl", RUN)), 1)

    def test_busy_or_mismatched_or_unfinished_refuses_without_writes(self):
        for changes in ({"run_id": "OTHER0000001"}, {"screen": "COMBAT"}, {"game_over": None}):
            old = dict(self.state); self.state.update(changes)
            with self.assertRaises(ValueError): self.recovery.run(RUN)
            self.state = old
        with patch.object(self.recovery, "inventory", return_value=[123]):
            with self.assertRaisesRegex(ValueError, "still active"): self.recovery.run(RUN)
        self.assertEqual((self.root / "logs/runs.jsonl").read_text(), "")
        self.refresh.assert_not_called()

    def test_admission_flags_and_concurrent_recovery_are_preserved(self):
        for flag in ("LLM_DRAIN", "PAUSE"):
            path = self.recovery.runtime / flag; path.write_text("owner")
            with self.assertRaises(ValueError): self.recovery.run(RUN)
            self.assertEqual(path.read_text(), "owner"); path.unlink()
        with locked(self.recovery.runtime / "report-run.lock"):
            with self.assertRaises(BlockingIOError): self.recovery.run(RUN)

    def test_missing_terminal_console_does_not_invent_historical_code(self):
        (self.root / "logs/console/20261011-180100-abcdef2+dirty.log").unlink()
        with self.assertRaisesRegex(ValueError, "terminal console"): self.recovery.run(RUN)
        self.assertEqual((self.root / "logs/runs.jsonl").read_text(), "")

    def test_existing_index_is_not_refreshed_and_duplicates_are_rejected(self):
        path = self.root / "logs/runs.jsonl"
        row = json.dumps({"run_id": RUN}) + "\n"; path.write_text(row)
        self.assertEqual(self.recovery.run(RUN)["status"], "already_indexed")
        self.refresh.assert_not_called()
        path.write_text(row * 2)
        with self.assertRaisesRegex(ValueError, "duplicate"): self.recovery.run(RUN)

    def test_refresh_failure_preserves_report_and_does_not_repeat_side_effects(self):
        self.refresh.return_value = {"exit": 1}
        with self.assertRaisesRegex(ValueError, "refresh"): self.recovery.run(RUN)
        self.assertEqual(len(rows_for(self.root / "logs/runs.jsonl", RUN)), 1)
        with self.assertRaisesRegex(ValueError, "partial report"): self.recovery.run(RUN)
        self.refresh.assert_called_once()
        self.cost.assert_not_called(); self.boss.assert_not_called()

    def test_invalid_id_cannot_select_paths(self):
        for run in ("../escape", "AAA000000001,AAA000000002", "short"):
            with self.assertRaises(ValueError): self.recovery.run(run)


if __name__ == "__main__": unittest.main()
