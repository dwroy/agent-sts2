"""Fixed metadata fixtures only; no game, refresh, learner or network is started."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
import boss_sim_jobs as jobs
sys.path.insert(0, str(ROOT / "agent/tools/boss-sim"))
import acceptance as gate


def trust():
    block = {"n": 10, "brier": .25, "mean_pred": .6, "actual_win": .2, "leak_ratio": 2., "leak_turns": 30}
    return {"character": "silent", "criteria": gate.CRITERIA, "split": {"tune": ["old"], "val": ["new"]},
            "source": {"dataset_sha256": "fixed", "sources_sha256": "fixed"},
            "refresh": {"artifact": "a" * 64, "keys": []},
            "overall": {s: {"n": 20, "brier": .1} for s in ("t1", "pre")},
            "bosses": {"AEONGLASS": {"name": "永世沙漏", "t1": dict(block), "pre": dict(block)}},
            "low_trust_b2": {"AEONGLASS": "bias"}, "trusted_b2": []}


def data():
    runs = [{"run_id": f"{i:012}", "character": "SILENT", "ended": f"{i:03}", "ascension": 10,
             "victory": False, "death_fight": ["永世沙漏"]} for i in range(8)]
    attempts = [{"run_id": r["run_id"], "floor": 48, "attempt": 1, "ended_at": r["ended"],
                 "fight_kind": "boss", "result": "died", "enemies": ["永世沙漏"]} for r in runs]
    sources = [{"run_id": r["run_id"], "character": "silent", "key": r["run_id"] + ":48:1:123",
                "encounter": "AEONGLASS", "excluded": None} for r in runs]
    turns = [{"key": r["key"], "turns": [[1], [2]]} for r in sources]
    return runs, attempts, sources, turns


def evidence():
    return jobs.candidates("silent", trust(), *data(), 10)[0]


class Trigger(unittest.TestCase):
    def call(self, t=None, d=None, done=()):
        return jobs.candidates("silent", t or trust(), *(d or data()), 10, done)

    def test_b4_all_three_conditions(self):
        e = self.call()[0]
        self.assertEqual((e["mode"], len(e["logged_keys"]), len(e["death_runs"])), ("b4", 8, 8))
        for index in (0, 2):
            d = list(data()); d[index] = d[index][:2]
            self.assertFalse(any(e["mode"] == "b4" for e in self.call(d=d)))

    def test_sample_only_is_b5(self):
        t = trust(); t["bosses"]["AEONGLASS"]["t1"].update(n=3, brier=.1, mean_pred=.2, leak_ratio=1.)
        self.assertEqual([e["mode"] for e in self.call(t=t)], ["b5"])

    def test_b5_requires_b4_or_only_samples(self):
        self.assertEqual([e["mode"] for e in self.call()], ["b4"])
        self.assertEqual([e["mode"] for e in self.call(done={"AEONGLASS"})], ["b4", "b5"])
        d = list(data()); d[0] = d[0][:2]
        self.assertFalse(self.call(d=d, done={"AEONGLASS"}))

    def test_recent_twenty_at_current_level(self):
        d = list(data())
        d[0] += [{"run_id": f"{i:012}", "character": "SILENT", "ended": f"{i:03}", "ascension": 10,
                  "victory": False, "death_fight": ["corridor"]} for i in range(8, 29)]
        self.assertEqual(self.call(d=d)[0]["recent_death_runs"], [])
        self.assertEqual([e["mode"] for e in self.call(d=d, done={"AEONGLASS"})], ["b4"])

    def test_recent_three_can_trigger_without_five_total(self):
        d = list(data()); d[0] = [dict(r, victory=True, death_fight=None) if i>=3 else r for i,r in enumerate(d[0])]
        self.assertEqual(len(self.call(d=d)[0]["death_runs"]), 3)

    def test_foreign_character_cannot_supply_evidence(self):
        d = list(data()); d[0] = [dict(r, character="IRONCLAD") for r in d[0]]
        self.assertFalse(self.call(d=d))
        t = trust(); t["character"] = "ironclad"; self.assertFalse(self.call(t=t))

    def test_null_legacy_character_cannot_crash_or_supply_evidence(self):
        d=list(data());d[0] += [{"run_id":"UNKNOWN00001","character":None,"ended":"later"}]
        self.assertEqual(self.call(d=d)[0]["death_runs"],self.call()[0]["death_runs"])

    def test_censored_unlogged_and_duplicate_sources(self):
        d=list(data()); d[2] += d[2]; self.assertEqual(len(self.call(d=d)[0]["logged_keys"]),8)
        d[2][0]["excluded"]="censored"; self.assertFalse(self.call(d=d))

    def test_single_turn_actual_fights_are_valid_turn_logs(self):
        d=list(data());d[3]=[dict(r,turns=r["turns"][:1]) for r in d[3]]
        self.assertEqual(len(self.call(d=d)[0]["logged_keys"]),8)

    def test_missing_bias_numbers_fail_closed(self):
        for field in ("brier", "leak_ratio", "actual_win", "mean_pred"):
            t=trust(); t["bosses"]["AEONGLASS"]["t1"][field]=None; self.assertFalse(self.call(t=t))

    def test_thresholds_are_inclusive_and_model_bias_strict(self):
        t=trust(); t["bosses"]["AEONGLASS"]["t1"].update(brier=.125, mean_pred=.35, leak_ratio=1.3)
        self.assertFalse(self.call(t=t))
        t["bosses"]["AEONGLASS"]["t1"]["brier"]+=.0001
        self.assertEqual(self.call(t=t)[0]["bias"], ["brier"])

    def test_evidence_changes_have_different_keys(self):
        a=self.call()[0]; t=trust(); t["bosses"]["AEONGLASS"]["t1"]["brier"]+=.01
        self.assertNotEqual(a["key"], self.call(t=t)[0]["key"])


class Lifecycle(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name); (self.root/"agent").mkdir(); self.state={"batches":{}}
        environment=patch.dict(jobs.os.environ,{"CODEX_OPS_DIR":str(self.root/"ops/codex-ops")});environment.start();self.addCleanup(environment.stop)
        self.start=lambda *args: (12345,None)

    def dispatch(self, e=None, now=100, alive=lambda pid:False, stamp="20261007-140000"):
        def create_tree(argv, **kwargs):
            if "worktree" in argv:
                (Path(argv[-2])/"agent").mkdir(parents=True,exist_ok=True)
            return subprocess.CompletedProcess(argv,0,stdout="f"*40)
        with patch.object(jobs.subprocess,"run",side_effect=create_tree), patch.object(jobs,"pid_birth",return_value="birth"):
            return jobs.dispatch_candidates(self.state, e or [evidence()], str(self.root), "/scripts", alive, stamp, self.start,now)

    def test_actual_batch_pid_and_evidence_file(self):
        bid,pid=self.dispatch()
        b=self.state["batches"][bid]; self.assertEqual(pid,12345)
        self.assertEqual(json.loads(Path(b["evidence_path"]).read_text()), b["boss_sim"])
        self.assertIn("boss-sim-silent-aeonglass",b["worktree"])
        self.assertEqual(b["base"],"f"*40)
        self.assertEqual(b["boss_sim"]["dispatch_base"],b["base"])

    def test_global_b4_b5_mutex_and_alive_expired_lease(self):
        self.dispatch(); e=dict(evidence(),mode="b5",key="other")
        self.assertIsNone(self.dispatch([e],now=20000,alive=lambda p:True,stamp="20261007-140001"))
        self.assertEqual(len(self.state["batches"]),1)

    def test_boss_batch_does_not_borrow_the_normal_fix_queue_lease(self):
        from learner_jobs import busy
        self.dispatch();self.assertFalse(busy(self.state,"fix-batch",lambda pid:True))
        self.state["batches"]["normal"]={"task":"fix-batch","learner_task":"fix-batch","state":"running","pid":1}
        self.assertTrue(busy(self.state,"fix-batch",lambda pid:True))

    def test_lost_lease_retry_retains_failure(self):
        bid,_=self.dispatch(); self.dispatch(now=101,stamp="20261007-140001")
        self.assertEqual(self.state["batches"][bid]["state"],"lost")
        self.assertIsNone(self.dispatch(now=3600,stamp="20261007-140002"))
        new=self.dispatch(now=3701,stamp="20261007-140003")
        self.assertTrue(new); self.assertEqual(self.state["batches"][bid]["state"],"lost")

    def test_pid_reuse_does_not_keep_lease(self):
        bid,_=self.dispatch()
        with patch.object(jobs,"pid_birth",return_value="different"):
            jobs.dispatch_candidates(self.state,[],str(self.root),"/scripts",lambda p:True,"new",self.start,101)
        self.assertEqual(self.state["batches"][bid]["state"],"lost")

    def test_late_completion_retains_lost_history_and_is_idempotent(self):
        bid,_=self.dispatch();b=self.state["batches"][bid];b.update(state="lost",failure="lease lost",finished_epoch=101)
        events=[]
        with patch("learner_checks.read_report") as read:
            for _ in range(2):jobs.finish(self.state,bid,0,str(self.root),str(self.root),lambda *a:events.append(a))
        read.assert_not_called();self.assertEqual(len(events),1)
        self.assertEqual((b["state"],b["failure"],b["finished_epoch"]),("lost","lease lost",101))
        self.assertEqual(b["late_completion"]["rc"],0)

    def test_evidence_change_cannot_reset_retry_or_three_attempt_limit(self):
        for index in range(3):
            e=dict(evidence(),key=f"new-{index}")
            bid,_=self.dispatch([e],now=100+index*4000,stamp=f"20261007-14000{index}")
            self.state["batches"][bid].update(state="failed",retry_at=100+index*4000+3600)
            self.assertEqual(self.state["batches"][bid]["boss_sim"]["key"],"new-0")
        self.assertIsNone(self.dispatch(now=13000,stamp="20261007-140009"))
        self.assertEqual(next(iter(self.state["boss_sim_cooldown"].values()))["outcome"],"retry-exhausted")

    def test_cooldown_requires_ten_new_and_new_calibration_including_them(self):
        bid,_=self.dispatch(); self.state["batches"][bid]["state"]="done"
        jobs.terminal(self.state,bid,"done",101)
        e=evidence(); e["fight_keys"] += [f"new{i}" for i in range(9)]; e["calibration"]="next"
        e["calibrated_keys"]=list(e["fight_keys"])
        self.assertIsNone(self.dispatch([e],200,stamp="20261007-140001"))
        e["fight_keys"].append("new9")
        self.assertIsNone(self.dispatch([e],201,stamp="20261007-140002"))
        e["calibrated_keys"].append("new9"); e["calibration"]=evidence()["calibration"]
        self.assertIsNone(self.dispatch([e],202,stamp="20261007-140003"))
        e["calibration"]="next"; self.assertTrue(self.dispatch([e],203,stamp="20261007-140004"))

    def test_missing_end_snapshot_blocks_retrigger(self):
        self.state["boss_sim_cooldown"]={"silent:AEONGLASS:b4":{"snapshot_missing":True}}
        self.assertIsNone(self.dispatch())

    def test_launch_failure_is_recorded_and_retried(self):
        self.start=lambda *a: (_ for _ in ()).throw(OSError("failed start"))
        self.assertIsNone(self.dispatch()); b=next(iter(self.state["batches"].values()))
        self.assertEqual(b["state"],"failed"); self.assertIn("failed start",b["failure"])

    def test_finish_accepted_verifies_release_and_schedules_full_checks(self):
        bid,_=self.dispatch(); b=self.state["batches"][bid]
        report={"task":"fix-batch","merged":"a"*40,"boss_sim":{"evidence_key":b["key"],"outcome":"accepted","acceptance":"receipt"}}
        receipt={"character":"silent","boss":"AEONGLASS","mode":"b4","isolation":{"base":b["base"],"head":"b"*40}}
        events=[]
        with patch("learner_checks.read_report",return_value=report), patch.object(jobs,"load_gate",return_value=(receipt,{"accepted":True})), patch.object(jobs.subprocess,"run"), patch.object(jobs,"verify_publication"), patch.object(jobs,"completion_evidence",return_value=b["boss_sim"]):
            jobs.finish(self.state,bid,0,str(self.root),str(self.root),lambda *a:events.append(a))
        self.assertEqual(b["state"],"done"); self.assertTrue(b["checks_pending"]); self.assertEqual(events[0][0],"fix-done")

    def test_finish_rejection_requires_ledger_and_never_claims_merged(self):
        for ledger,merged,expected in ((True,None,"rejected"),(False,None,"failed"),(True,"a"*40,"failed")):
            with self.subTest(ledger=ledger,merged=merged):
                bid=next(iter(self.state["batches"]),None)
                if bid is None: bid,_=self.dispatch()
                b=self.state["batches"][bid]
                report={"task":"fix-batch","merged":merged,"boss_sim":{"evidence_key":b["key"],"outcome":"rejected","acceptance":"receipt","ledger_ids":["silent-0001"]}}
                receipt={"character":"silent","boss":"AEONGLASS","mode":"b4","isolation":{"base":b["base"]}}
                with patch("learner_checks.read_report",return_value=report), patch.object(jobs,"load_gate",return_value=(receipt,{"accepted":False,"reasons":["bias"]})), patch.object(jobs,"ledger_rejection",return_value=ledger), patch.object(jobs,"completion_evidence",return_value=b["boss_sim"]):
                    jobs.finish(self.state,bid,0,str(self.root),str(self.root),lambda *a:None)
                self.assertEqual(b["state"],expected)

    def test_finish_bad_receipt_evidence_or_exit_is_failure(self):
        bid,_=self.dispatch(); b=self.state["batches"][bid]
        with patch("learner_checks.read_report",return_value={"task":"fix-batch","boss_sim":{"evidence_key":"wrong"}}):
            jobs.finish(self.state,bid,0,str(self.root),str(self.root),lambda *a:None)
        self.assertEqual(b["state"],"failed"); self.assertIn("evidence",b["failure"])

    def test_finish_cannot_substitute_candidate_for_dispatch_baseline(self):
        bid,_=self.dispatch();b=self.state["batches"][bid]
        report={"task":"fix-batch","merged":"a"*40,"boss_sim":{"evidence_key":b["key"],"outcome":"accepted","acceptance":"receipt"}}
        receipt={"character":"silent","boss":"AEONGLASS","mode":"b4","isolation":{"base":"b"*40,"head":"b"*40}}
        with patch("learner_checks.read_report",return_value=report),patch.object(jobs,"load_gate",return_value=(receipt,{"accepted":True})),patch.object(jobs,"verify_publication") as publish:
            jobs.finish(self.state,bid,0,str(self.root),str(self.root),lambda *a:None)
        self.assertEqual(b["state"],"failed");self.assertIn("baseline",b["failure"]);publish.assert_not_called()


class Acceptance(unittest.TestCase):
    isolation={"passed":True,"base":"a"*40,"head":"b"*40,"output_sha256":"c"*64}
    def good(self):
        old=trust(); new=copy.deepcopy(old)
        for start in ("t1","pre"):
            new["bosses"]["AEONGLASS"][start].update(brier=.12,mean_pred=.3,leak_ratio=1.3)
        new.update(low_trust_b2={},trusted_b2=["AEONGLASS"])
        return old,new
    def evaluate(self,old,new,mode="b4",iso=None):
        return gate.evaluate(old,new,"silent","AEONGLASS",mode,self.isolation if iso is None else iso)
    def test_accepts_improved_bias(self):
        self.assertTrue(self.evaluate(*self.good())["accepted"])

    def test_brier_must_enter_the_candidate_global_standard(self):
        old,new=self.good()
        for start in ("t1","pre"):
            new["overall"][start]["brier"]=.05
            new["bosses"]["AEONGLASS"][start].update(mean_pred=.6,leak_ratio=2.)
        self.assertFalse(self.evaluate(old,new)["accepted"])
        for start in ("t1","pre"):new["bosses"]["AEONGLASS"][start]["brier"] = .06
        self.assertTrue(self.evaluate(old,new)["accepted"])
    def test_global_boundary(self):
        old,new=self.good()
        for start in ("t1","pre"):
            new["overall"][start]["brier"]=.105
        self.assertTrue(self.evaluate(old,new)["accepted"])
        new["overall"]["pre"]["brier"]+=.000001
        self.assertFalse(self.evaluate(old,new)["accepted"])
    def test_any_other_metric_worsening_rejects(self):
        for field,value in (("brier",.251),("mean_pred",.601),("leak_ratio",2.001)):
            old,new=self.good(); new["bosses"]["AEONGLASS"]["pre"][field]=value
            self.assertFalse(self.evaluate(old,new)["accepted"])
    def test_near_has_reproducible_boundary(self):
        old=trust();new=copy.deepcopy(old)
        new["bosses"]["AEONGLASS"]["t1"]["leak_ratio"]=1.33
        self.assertTrue(self.evaluate(old,new)["accepted"])
        new["bosses"]["AEONGLASS"]["t1"]["leak_ratio"]=1.33001
        self.assertFalse(self.evaluate(old,new)["accepted"])
    def test_near_brier_boundary(self):
        old=trust();new=copy.deepcopy(old)
        new["bosses"]["AEONGLASS"]["t1"]["brier"]=.1375
        self.assertTrue(self.evaluate(old,new)["accepted"])
        new["bosses"]["AEONGLASS"]["t1"]["brier"]+=.00001
        self.assertFalse(self.evaluate(old,new)["accepted"])
    def test_unchanged_is_rejected(self):
        self.assertFalse(self.evaluate(trust(),trust())["accepted"])
    def test_missing_nan_coverage_and_foreign_data_fail_closed(self):
        for mutation in (lambda t:t["bosses"]["AEONGLASS"]["t1"].pop("leak_turns"),
                         lambda t:t["bosses"]["AEONGLASS"]["t1"].update(brier=float("nan")),
                         lambda t:t.update(character="ironclad"),lambda t:t["overall"]["t1"].update(n=19),
                         lambda t:t["source"].update(dataset_sha256="new"),lambda t:t["split"].update(tune=["new"]),
                         lambda t:t.update(criteria={})):
            old,new=self.good();mutation(new);self.assertFalse(self.evaluate(old,new)["accepted"])
    def test_isolation_is_mandatory(self):
        for iso in ({},{"passed":False},dict(self.isolation,output_sha256="")):
            self.assertFalse(self.evaluate(*self.good(),iso=iso)["accepted"])
    def test_b5_original_admission_unchanged(self):
        self.assertTrue(self.evaluate(*self.good(),mode="b5")["accepted"])
        for mutation in (lambda t:t["bosses"]["AEONGLASS"]["t1"].update(n=9),
                         lambda t:t["bosses"]["AEONGLASS"]["t1"].update(leak_ratio=1.31),
                         lambda t:t.update(low_trust_b2={"AEONGLASS":"low"}),lambda t:t.update(trusted_b2=[])):
            old,new=self.good();mutation(new);self.assertFalse(self.evaluate(old,new,mode="b5")["accepted"])
    def test_protected_source_change_is_rejected_before_runner(self):
        for source in ("agent/src/reflex/turn-solver.ts","ops/boss_sim_jobs.py","ops/codex-ops-learn.py",
                       "agent/tools/boss-sim/acceptance.py","learner/tasks/boss-sim-batch.md"):
            with self.subTest(source=source),tempfile.TemporaryDirectory() as td, patch.object(gate,"git",side_effect=["a"*40,"b"*40,source]):
                result=gate.isolate(td,"base","head",td)
                self.assertFalse(result["passed"])
                self.assertEqual(result["protected_changes"],[source])

    def test_cli_rejects_baseline_substitution_before_isolation(self):
        import contextlib,io
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);before,after=self.good()
            for name,value in (("before",before),("after",after),("evidence",{"character":"silent","boss":"AEONGLASS","mode":"b4","dispatch_base":"a"*40})):
                (root/(name+".json")).write_text(json.dumps(value))
            argv=["acceptance","--before",str(root/"before.json"),"--after",str(root/"after.json"),"--evidence",str(root/"evidence.json"),
                  "--character","silent","--boss","AEONGLASS","--mode","b4","--base","candidate","--head","candidate",
                  "--root",td,"--scratch",td,"--out",str(root/"receipt.json")]
            with patch.object(sys,"argv",argv),patch.object(gate,"git",return_value="b"*40),patch.object(gate,"isolate") as isolate,contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(gate.main(),1)
            isolate.assert_not_called();receipt=json.loads((root/"receipt.json").read_text())
            self.assertFalse(receipt["accepted"]);self.assertIn("dispatch evidence",receipt["reasons"][0])

    def test_extension_keeps_dispatch_tune_cutoff_and_all_old_validation(self):
        before=trust();e=dict(evidence(),dispatch_base="a"*40)
        before["split"]["val"].append("new-only-validation")
        gate.verify_dispatch(e,before,"silent","AEONGLASS","b4","a"*40)
        for mutation in (lambda t:t["split"].update(tune=["new-only-validation"]),
                         lambda t:t["split"].update(cutoff="moved"),lambda t:t["split"].update(val=["new-only-validation"])):
            candidate=copy.deepcopy(before);mutation(candidate)
            with self.assertRaises(ValueError):gate.verify_dispatch(e,candidate,"silent","AEONGLASS","b4","a"*40)
        with self.assertRaises(ValueError):gate.verify_dispatch(dict(e,split=None),before,"silent","AEONGLASS","b4","a"*40)


class Integration(unittest.TestCase):
    def test_host_process_check_includes_background_knowledge_writers(self):
        # Extract the actual host filter and apply it to fixed process records.
        import re
        script=(ROOT/"ops/codex-ops-actions.sh").read_text()
        pattern=re.search(r"pgrep -af '([^']+)'",script).group(1)
        records=["91 python3 /project/ops/report.py RUN",
                 "92 python3 /project/.worktrees/live/knowledge/builders/build-fight-value.py all --character silent",
                 "93 bash /project/.worktrees/live/knowledge/builders/refresh.sh --character silent",
                 "94 node unrelated.js"]
        matched=[line.split()[0] for line in records if re.search(pattern,line)]
        self.assertEqual(matched,["91","92","93"])

    def test_check_reads_only_the_matching_character_archive(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); live=root/".worktrees/live"; t=trust()
            (live/"eval").mkdir(parents=True)
            versions=live/"eval/versions.json"
            versions.write_text(json.dumps({"versions":[{"name":jobs.RELEASE_VERSION,"commit":"f"*40}]}))
            archive=live/"experiments/boss-sim/silent"/("a"*64); archive.mkdir(parents=True)
            path=live/"knowledge/characters/silent/boss-trust.json";path.parent.mkdir(parents=True);path.write_text(json.dumps(t))
            (archive/"boss-trust.json").write_text(json.dumps(t));d=data()
            for filename,values in (("sources.jsonl",d[2]),("turns.jsonl",d[3])):
                (archive/filename).write_text("".join(json.dumps(r)+"\n" for r in values))
            for filename in ("fights.jsonl","results.jsonl","split.json"):
                (archive/filename).write_text("[]")
            t["source"].update(sources_sha256=jobs.file_hash(archive/"sources.jsonl"),dataset_sha256=jobs.file_hash(archive/"fights.jsonl"))
            path.write_text(json.dumps(t));(archive/"boss-trust.json").write_text(json.dumps(t))
            names=("boss-trust.json","sources.jsonl","turns.jsonl","fights.jsonl","results.jsonl","split.json")
            (archive/"completed.json").write_text(json.dumps({"artifact":"a"*64,"files_sha256":{n:jobs.file_hash(archive/n) for n in names}}))
            (root/"logs").mkdir()
            for filename,values in (("runs.jsonl",d[0]),("sl-attempts.jsonl",d[1]),("run-config.jsonl",[{"character":"SILENT","target_ascension":10}])):
                (root/"logs"/filename).write_text("".join(json.dumps(r)+"\n" for r in values))
            state={"batches":{}}
            with patch.object(jobs,"dispatch_candidates",return_value=("batch",123)) as dispatch, patch.object(jobs.subprocess,"run",return_value=subprocess.CompletedProcess([],0)):
                self.assertEqual(jobs.check(state,td,"/scripts","silent",lambda pid:False,"stamp",lambda *a:None),("batch",123))
                self.assertEqual(dispatch.call_args.args[1][0]["boss"],"AEONGLASS")
                self.assertIsNone(jobs.check(state,td,"/scripts","ironclad",lambda pid:False,"stamp",lambda *a:None))
                self.assertEqual(dispatch.call_count,1)
                versions.write_text(json.dumps({"versions":[]}))
                self.assertIsNone(jobs.check(state,td,"/scripts","silent",lambda pid:False,"stamp",lambda *a:None))
                self.assertEqual(dispatch.call_count,1)
                versions.write_text(json.dumps({"versions":[{"name":jobs.RELEASE_VERSION,"commit":"f"*40}]}))
                (archive/"boss-trust.json").write_text("{}")
                self.assertIsNone(jobs.check(state,td,"/scripts","silent",lambda pid:False,"stamp",lambda *a:None))
                self.assertEqual(dispatch.call_count,1)

    def test_safe_artifacts_reject_other_paths(self):
        for path in ("/home/dw/.codex/auth.json","/tmp/out.json","/project/learner/runs/private.env"):
            with self.assertRaises(ValueError):jobs.safe_artifact("/project","/project/.worktrees/batch",path)
        self.assertEqual(str(jobs.safe_artifact("/project","/project/.worktrees/batch","/project/learner/runs/batch/acceptance.json")),"/project/learner/runs/batch/acceptance.json")

    def test_publication_requires_matching_archive_and_unique_actual_version(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);live=root/".worktrees/live";t=trust()
            path=live/"knowledge/characters/silent/boss-trust.json";path.parent.mkdir(parents=True);path.write_text(json.dumps(t))
            archive=live/"experiments/boss-sim/silent"/("a"*64);archive.mkdir(parents=True);(archive/"boss-trust.json").write_text(json.dumps(t))
            (live/"eval").mkdir();v={"name":"S1.b4-fixture","commit":"f"*40}
            (live/"eval/versions.json").write_text(json.dumps({"versions":[v]}))
            report={"version":v["name"],"merged":v["commit"]}
            replay={"published_validation":jobs.digest({k:t[k] for k in ("character","criteria","split","source","bosses","overall")})}
            jobs.verify_publication(td,report,evidence(),replay)
            for mutation in ([v,v],[dict(v,commit="e"*40)],[]):
                (live/"eval/versions.json").write_text(json.dumps({"versions":mutation}))
                with self.assertRaises(ValueError):jobs.verify_publication(td,report,evidence(),replay)
            (live/"eval/versions.json").write_text(json.dumps({"versions":[v]}));t["overall"]["t1"]["brier"]+=.01;path.write_text(json.dumps(t))
            with self.assertRaises(ValueError):jobs.verify_publication(td,report,evidence(),replay)

    def test_git_launch_failure_is_a_bounded_tracked_batch(self):
        with tempfile.TemporaryDirectory() as td,patch.dict(jobs.os.environ,{"CODEX_OPS_DIR":str(Path(td)/"ops/codex-ops")}),patch.object(jobs.subprocess,"run",side_effect=subprocess.CalledProcessError(1,["git"])):
            state={"batches":{}};start=lambda *a: self.fail("must not start")
            self.assertIsNone(jobs.dispatch_candidates(state,[evidence()],td,"/scripts",lambda p:False,"20261007-140000",start,100))
            b=next(iter(state["batches"].values()));self.assertEqual(b["state"],"failed")
            self.assertEqual(json.loads((Path(td)/"ops/codex-ops/learn.json").read_text())["batches"],state["batches"])

    def test_report_hook_uses_live_locked_dispatch_and_logs_failure(self):
        spec=importlib.util.spec_from_file_location("ops_report",ROOT/"ops/report.py")
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as td:
            (Path(td)/"ops").mkdir()
            with patch.object(module,"ROOT",td),patch.object(module,"LIVE","/live"),patch.object(module.subprocess,"run") as run:
                module.boss_sim_check("SILENT")
                self.assertEqual(run.call_args.args[0][-3:],["boss-check","--character","silent"])
                self.assertIn("/live/ops/codex-ops-learn.py",run.call_args.args[0])
                run.side_effect=subprocess.TimeoutExpired("dispatch",120);module.boss_sim_check("silent")
                self.assertIn("TimeoutExpired",(Path(td)/"ops/boss-sim-dispatch.log").read_text())


if __name__=="__main__": unittest.main()
