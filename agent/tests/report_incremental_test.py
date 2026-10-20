"""Fixed report selector equivalence, original offsets and append-only identities."""
import importlib.util
import fcntl
import json
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops'))
import report_log_cache as cache
spec = importlib.util.spec_from_file_location('incremental_report', ROOT / 'ops/report.py')
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class ReportCacheTest(unittest.TestCase):
    def test_states_warm_append_foreign_timestamp_and_busy_fallback_match_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'logs/states.jsonl'; path.parent.mkdir()
            ts = '2026-01-01T00:00:00.000Z'
            rows = [dict(ts=ts,state=dict(run_id='A',current_hp=42)),
                    dict(ts=ts,state=dict(run_id='B',current_hp=7)),
                    dict(ts='other',state=dict(run_id='A',in_combat=True))]
            path.write_text(''.join(json.dumps(r)+'\n' for r in rows)+'bad\n')
            wanted={ts}
            expected=cache.scan_states(path,'A',wanted)
            self.assertEqual(cache.states(path,'A',wanted),expected)
            cache.warm_states(path)
            self.assertEqual(cache.states(path,'A',wanted),expected)
            with path.open('a') as out:
                out.write(json.dumps(dict(ts='new',state=dict(run_id='A',current_hp=3)))+'\n')
                # JSON-escaped identifiers were rejected by the original text prefilter.
                out.write('{"ts":"escaped","state":{"run_id":"\\u0041"}}\n')
            expected=cache.scan_states(path,'A',wanted)
            self.assertEqual(cache.states(path,'A',wanted),expected)
            with (path.parents[1]/'ops/report-state-cache/worker.lock').open('a') as lock:
                fcntl.flock(lock,fcntl.LOCK_EX)
                self.assertEqual(cache.states(path,'A',wanted),expected)

    def test_cost_and_funnel_share_one_low_priority_background_slot(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); (root/'ops').mkdir(); marker=root/'entered.json'
            with (root/'ops/knowledge-refresh.lock').open('a') as lock, (root/'worker.log').open('w') as log:
                fcntl.flock(lock, fcntl.LOCK_EX)
                code = ('import json,os,sys; from pathlib import Path; '
                        'Path(sys.argv[1]).write_text(json.dumps([os.nice(0),'
                        'os.environ["OMP_NUM_THREADS"],os.environ["OPENBLAS_NUM_THREADS"]]))')
                with patch.object(report,'ROOT',str(root)):
                    child=report.background_statistics([sys.executable,'-c',code,str(marker)],log)
                try:
                    with self.assertRaises(subprocess.TimeoutExpired): child.wait(timeout=.2)
                    self.assertFalse(marker.exists())
                finally:
                    fcntl.flock(lock, fcntl.LOCK_UN)
                self.assertEqual(child.wait(timeout=20),0)
            self.assertEqual(json.loads(marker.read_text()),[19,'1','1'])

    def test_default_run_and_legacy_foreign_game_over_match_original_selector(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'logs/decisions.jsonl'; path.parent.mkdir()
            rows = [dict(ts=str(i), mode='play', screen=screen,
                         fingerprint=json.dumps({'run': run}) if run else '{}')
                    for i, (run, screen) in enumerate([
                        ('A','MAP'),('A','COMBAT'),(None,'GAME_OVER'),
                        ('B','MAP'),('B','GAME_OVER'),('C','COMBAT')])]
            rows.append(dict(ts='9', mode='snapshot', screen='MAP', fingerprint='{"run":"IGNORED"}'))
            path.write_text(''.join(json.dumps(r)+'\n' for r in rows))
            self.assertEqual(cache.decisions(path, ''), ('', [], []))
            self.assertEqual(cache.last_run(path), 'IGNORED')
            for chosen in ('A','B','C','MISSING',None):
                decisions = [r for r in rows if r['mode']=='play']
                rid = chosen or next((report.run_of(r) for r in reversed(decisions) if report.run_of(r)), None)
                recs = [r for r in decisions if report.run_of(r)==rid]
                tail = [] if any(r['screen']=='GAME_OVER' for r in recs) else [
                    r for r in decisions if r['ts'] > (recs[-1]['ts'] if recs else '') and r['screen']=='GAME_OVER'][:1]
                self.assertEqual(cache.decisions(path, chosen), (rid,recs,tail))
            with path.open('a') as out:
                out.write(json.dumps(dict(ts='8',mode='play',screen='MAP',fingerprint='{"run":"D"}'))+'\n')
            self.assertEqual(cache.decisions(path)[0], 'D')
            path.write_text(json.dumps(rows[0])+'\n')
            self.assertEqual(cache.decisions(path)[0], 'A')

    def test_plan_ambiguity_keeps_original_line_numbers_and_does_not_decode_old_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'logs/brain.jsonl'; path.parent.mkdir()
            row = dict(run_id='A',label='run-plan',question_id='',engine='codex',usage={})
            path.write_text('bad\n\n'+json.dumps(row)+'\n')
            self.assertEqual(report.standalone_plan_costs(path,'A')['unresolved'], ['line:3:missing-question-id'])
            original = cache.JsonlCache
            captured = []
            def reader(*args):
                obj = original(*args); captured.append(obj); return obj
            with patch.object(cache,'JsonlCache',side_effect=reader):
                self.assertEqual(report.standalone_plan_costs(path,'A')['unresolved'], ['line:3:missing-question-id'])
            self.assertEqual(captured[0].decoded,0)
            with path.open('a') as out: out.write(json.dumps(row)+'\n')
            self.assertEqual(report.standalone_plan_costs(path,'A')['unresolved'],
                             ['line:3:missing-question-id','line:4:missing-question-id'])


if __name__ == '__main__': unittest.main()
