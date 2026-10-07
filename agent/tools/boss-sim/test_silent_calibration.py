"""Fixed fixtures only: isolation, censoring, chronological holdout, calibration and refresh."""
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from character_extract import attempt_frames, finished_runs
from silent_calibration import cadence, calibrate, fit, frozen_split, prediction, residuals, select_model
from trust import judge


def rows(n=60):
    fights, results, turns = [], [], {}
    for i in range(n):
        key = f"RUN{i // 2:09}:17:{i % 2 + 1}"
        r = {"key": key, "run_id": key.split(":")[0], "character": "silent", "first_ts": f"2026-10-{i // 12 + 1:02}T{i % 12:02}:00:00",
             "asc": 0 if i < 20 else 7 if i < 40 else 10, "floor": 17, "attempt": i % 2 + 1, "turns": 8, "code": "fixture",
             "outcome": "won" if i % 3 else "died"}
        fights.append(r)
        for start in ("t1", "pre"):
            results.append({"key": key, "run": r["run_id"], "character": "silent", "start": start,
                            "enc": "WATERFALL_GIANT", "asc": r["asc"], "floor": r["floor"], "actual": {"won": i % 3 != 0, "hpLoss": 3},
                            "sim": {"winProb": 0.15 + 0.7 * (i % 3 != 0), "samples": 200,
                                    "perTurn": [[1, 3, 5, 8, 3]] * 8}})
        turns[key] = {t: [t, 40, 40, 3, 8, 3] for t in range(1, 9)}
    return fights, results, turns


class Calibration(unittest.TestCase):
    def test_strict_finished_character_not_legacy_or_live(self):
        base = {"run_id": "finished", "character": "SILENT", "ended": "date", "ascension": 10}
        got = finished_runs([base, {**base, "run_id": "iron", "character": "IRONCLAD"},
                             {**base, "run_id": "unknown", "character": None}, {**base, "run_id": "live", "ended": None}], "silent", range(11))
        self.assertEqual(list(got), ["finished"])

    def test_sl_intervals_include_pretracking_opening_but_never_duplicate(self):
        frame = {"run_id": "run", "floor": 17, "screen": "COMBAT", "enemies": [{"id": "WATERFALL_GIANT"}], "turn": 1}
        fs = [{**frame, "off": i, "ts": dt.datetime(2026, 10, 1, 0, 0, i)} for i in range(5)]
        es = [{"run_id": "run", "floor": 17, "started_at": "2026-10-01T00:00:01Z", "ended_at": "2026-10-01T00:00:02Z"},
              {"run_id": "run", "floor": 17, "started_at": "2026-10-01T00:00:02Z", "ended_at": "2026-10-01T00:00:04Z"}]
        got = attempt_frames(fs, es)
        self.assertEqual([[f["off"] for f in mine] for mine, _ in got], [[0, 1, 2], [3, 4]])

    def test_whole_run_temporal_split_and_frozen_extension(self):
        fs, _, _ = rows()
        s = frozen_split(fs)
        self.assertEqual((s["tune_n"], s["val_n"]), (40, 20))
        self.assertEqual(frozen_split(list(reversed(fs)), s), s)
        self.assertFalse({k.split(":")[0] for k in s["tune"]} & {k.split(":")[0] for k in s["val"]})
        extended = frozen_split(fs + [{**fs[-1], "key": "NEW:17:1", "run_id": "NEW", "first_ts": "2026-11-01T00:00:00"}], s)
        self.assertEqual(extended["tune"], s["tune"])
        self.assertEqual(extended["val_n"], 21)
        with self.assertRaisesRegex(ValueError, "before frozen cutoff"):
            frozen_split(fs + [{**fs[0], "key": "OLD:17:1", "run_id": "OLD"}], s)
        with self.assertRaisesRegex(ValueError, "data missing"):
            frozen_split([r for r in fs if r["key"] != s["val"][0]], s)

    def test_validation_labels_cannot_fit_or_select_parameters(self):
        fs, rs, ts = rows()
        s = frozen_split(fs)
        data = calibrate(rs, fs, ts, s, {})
        changed = [{**r, "actual": {**r["actual"], "won": not r["actual"]["won"]}} if r["key"] in s["val"] else r for r in rs]
        other = calibrate(changed, fs, ts, s, {})
        for start in ("t1", "pre"):
            self.assertEqual(data["overall"][start]["platt"], other["overall"][start]["platt"])
            self.assertEqual(data["selection"][start], other["selection"][start])
        self.assertNotEqual(data["overall"]["t1"]["brier"], other["overall"]["t1"]["brier"])

    def test_platt_endpoints_and_monotonicity(self):
        _, rs, _ = rows()
        m = fit(rs)
        self.assertIsNotNone(m)
        a, b = {**rs[0], "sim": {"winProb": 0, "samples": 200}}, {**rs[0], "sim": {"winProb": 1, "samples": 200}}
        self.assertTrue(0 < prediction(a, m) < prediction(b, m) < 1)
        self.assertIsNone(fit([r for r in rs if r["actual"]["won"]]))

    def test_ascension_bias_is_one_global_model_selected_without_holdout(self):
        tune = []
        for i in range(120):
            asc = 0 if i < 60 else 10
            won = i % 10 < (2 if asc == 0 else 8)
            tune.append({"key": f"run{i // 3}:{i}", "start": "t1", "run": f"run{i // 3}", "asc": asc, "actual": {"won": won},
                         "sim": {"winProb": 0.4 + (i % 2) * 0.2, "samples": 200}})
        # The raw predictor here is uninformative within a band but positively associated overall.
        tune = [{**r, "sim": {**r["sim"], "winProb": r["sim"]["winProb"] + (0.02 if r["actual"]["won"] else 0)}} for r in tune]
        model, selection = select_model(tune, {})
        self.assertTrue(selection["systematic"])
        self.assertTrue(selection["selected_ascension"])
        self.assertGreater(model["c"], 0)
        self.assertEqual(set(model), {"a", "b", "c"})

    def test_all_criteria_and_sample_shortage_not_just_count(self):
        b = {"n": 9, "brier": 0.1, "mean_pred": 0.5, "actual_win": 0.5, "leak": {"enemy_ratio": 1.0}}
        self.assertEqual([f[0] for f in judge(b, 0.1)], ["n"])
        self.assertEqual(judge({**b, "n": 10}, 0.1), [])
        bad = {**b, "n": 10, "brier": 0.2, "mean_pred": 0.8, "leak": {"enemy_ratio": 1.31}}
        self.assertEqual({f[0] for f in judge(bad, 0.1)}, {"brier", "gap", "leak"})
        fs, rs, _ = rows()
        d = calibrate(rs, fs, {}, frozen_split(fs), {})
        self.assertEqual(d["trusted_b2"], [])
        self.assertIn("leak_missing", d["bosses"]["WATERFALL_GIANT"]["t1"]["failed"])
        self.assertEqual(d["bosses"]["AEONGLASS"]["t1"]["missing"], 10)

    def test_new_ascension_is_included_but_insufficient_validation_stays_low(self):
        fs, rs, ts = rows()
        s = frozen_split(fs)
        fs[-1]["asc"] = 11
        for r in rs:
            if r["key"] == fs[-1]["key"]:
                r["asc"] = 11
        d = calibrate(rs, fs, ts, s, {"completed_max_asc": 12})
        self.assertIn("验证 n=1", d["ascension_low"]["b2"]["11"])
        self.assertIn("验证 n=1", d["ascension_low"]["b3"]["11"])
        self.assertIn("验证 n=0", d["ascension_low"]["b2"]["12"])

    def test_f49_scope_stays_low_when_boss_overall_can_pass(self):
        fs, rs, ts = rows()
        old = fs[-1]["key"]
        new = old.replace(":17:", ":49:")
        fs[-1].update(key=new, floor=49)
        ts[new] = ts.pop(old)
        for r in rs:
            if r["key"] == old:
                r.update(key=new, floor=49)
        d = calibrate(rs, fs, ts, frozen_split(fs), {})
        self.assertEqual(d["trusted_b2"], ["WATERFALL_GIANT"])
        self.assertEqual(d["stage_metrics"]["t1"]["F49"]["val"]["n"], 1)
        self.assertIn("至少要 10", d["stage_low"]["b2"]["49"])
        self.assertIn("至少要 10", d["stage_low"]["b3"]["49"])

    def test_result_character_isolation_and_run_leakage(self):
        fs, rs, ts = rows()
        with self.assertRaisesRegex(ValueError, "foreign"):
            frozen_split([{**fs[0], "character": "ironclad"}, *fs[1:]])
        with self.assertRaisesRegex(ValueError, "foreign"):
            calibrate([{**rs[0], "character": "ironclad"}, *rs[1:]], fs, ts, frozen_split(fs), {})
        with self.assertRaisesRegex(ValueError, "foreign"):
            calibrate([r for r in rs if r["key"] != fs[0]["key"]],
                      [{**fs[0], "character": "ironclad"}, *fs[1:]], ts, frozen_split(fs), {})
        incomplete = frozen_split(fs)
        incomplete["val"].pop()
        with self.assertRaisesRegex(ValueError, "cover"):
            calibrate(rs, fs, ts, incomplete, {})
        s = frozen_split(fs)
        s["val"].append(s["tune"][0])
        with self.assertRaisesRegex(ValueError, "overlap"):
            calibrate(rs, fs, ts, s, {})

    def test_threshold_idempotence_and_character_isolation(self):
        runs = [{"run_id": "s", "character": "SILENT", "ended": "date", "ascension": 9},
                {"run_id": "i", "character": "IRONCLAD", "ended": "date", "ascension": 10}]
        events = [{"run_id": "s", "floor": n, "attempt": 1, "ended_at": str(n), "fight_kind": "boss", "result": "won"} for n in range(20)]
        old = {"keys": [], "max_asc": 9}
        self.assertFalse(cadence(runs, events[:19], old)["due"])
        c = cadence(runs, events + [events[-1], {**events[-1], "run_id": "i"}, {**events[-1], "result": "predicted_death"}], old)
        self.assertEqual(c["new_completed_boss_attempts"], 20)
        self.assertTrue(c["due"])
        self.assertFalse(cadence(runs, events, c)["due"])
        self.assertTrue(cadence([{**runs[0], "ascension": 10}], events, c)["due"])

    def test_refresh_creates_immutable_artifacts_and_identical_input_skips_fitting(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location("refresh_silent", Path(__file__).with_name("refresh-silent.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fs, rs, ts = rows()
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            dataset = root / "dataset"
            dataset.mkdir()
            def jl(path, values):
                path.write_text("".join(json.dumps(v) + "\n" for v in values))
            jl(dataset / "fights.jsonl", fs)
            jl(dataset / "sources.jsonl", fs)
            jl(dataset / "turns.jsonl", [{"key": k, "turns": list(t.values())} for k, t in ts.items()])
            jl(dataset / "runs-snapshot.jsonl", [{"run_id": r["run_id"], "character": "SILENT", "ended": "date", "ascension": r["asc"]} for r in fs])
            jl(dataset / "sl-snapshot.jsonl", [])
            jl(dataset / "runs.jsonl", [])
            jl(dataset / "sl-attempts.jsonl", [])
            (dataset / "extraction.json").write_text(json.dumps({"finished_runs": 30, "attempts": 60, "written": 60, "exclusions": {}}))
            jl(root / "results.jsonl", rs)
            (root / "provenance.json").write_text(json.dumps({"fixed_fixture": True, "samples": 200, "seed": 1}))
            args = ["--scratch", str(root / "artifacts"), "--dataset", str(dataset), "--results", str(root / "results.jsonl"),
                    "--provenance", str(root / "provenance.json"), "--logs", str(dataset), "--db", "unused", "--game-data", "unused",
                    "--out", str(root / "silent-trust.json"), "--report", str(root / "report.md")]
            self.assertEqual(module.main(args), 0)
            trust_bytes = (root / "silent-trust.json").read_bytes()
            data = json.loads(trust_bytes)
            self.assertEqual(data["trusted_b2"], ["WATERFALL_GIANT"])
            (root / "silent-trust.json").unlink()
            (root / "report.md").unlink()
            with patch.object(module.subprocess, "run") as child:
                self.assertEqual(module.main(args), 0)
                child.assert_not_called()
            self.assertEqual((root / "silent-trust.json").read_bytes(), trust_bytes)
            self.assertTrue((root / "report.md").exists())
            self.assertEqual(len(list((root / "artifacts").glob("*/completed.json"))), 1)
            for target in ("other-worktree/knowledge/characters/ironclad/boss-trust.json", "knowledge/common/monster-db.json",
                           "other-worktree/knowledge/characters/silent/boss-trust.json"):
                foreign = args[:]
                foreign[foreign.index("--out") + 1] = str(root / target)
                with self.assertRaises(SystemExit) as failure:
                    module.main(foreign)
                self.assertEqual(failure.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
