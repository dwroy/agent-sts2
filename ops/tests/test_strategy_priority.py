"""Fixed deferred-demand gates, two source consumers and original dispatch recovery."""
import copy
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'ops'))
import ascension_audit as audit
import learner_jobs as jobs
import strategy_backfill_jobs as shared
import test_strategy_backfill as own_fixtures
import test_strategy_external as external_fixtures

BID = own_fixtures.BID
RUN = own_fixtures.RUN


@contextmanager
def source_fixture(kind):
    case = (external_fixtures.External if kind == 'external' else own_fixtures.Backfill)('runTest')
    case.setUp()
    try:
        with patch.dict(os.environ, {'CODEX_OPS_LOGS': str(case.root / 'logs')}):
            yield case
    finally:
        case.doCleanups()


def request():
    return {'key': 'silent:A11', 'character': 'silent', 'level': 11, 'previous': 10,
            'state': 'queued', 'attempts': 0, 'anchor_run': 'SILENT000000', 'requested_at': 'fixed'}


def ended(case, rows=None):
    path = case.root / 'logs/runs.jsonl'; path.parent.mkdir(exist_ok=True)
    rows = rows if rows is not None else [{'run_id': RUN, 'character': 'SILENT', 'ascension': 11, 'ended': 'fixed'}]
    path.write_text(''.join(json.dumps(row) + '\n' for row in rows))
    return rows


def hold(case, normal=None, alive=lambda pid: False):
    return shared.priority_hold(case.state, 'silent', alive, normal or {}, root=str(case.root))


class DeferredPriority(unittest.TestCase):
    def test_both_sources_ignore_only_nonlaunchable_markers_and_consume_native_once(self):
        for kind in ('backfill', 'external'):
            for markers in ('calibration', 'audit', 'both'):
                with self.subTest(kind=kind, markers=markers), source_fixture(kind) as case:
                    if markers != 'audit': case.state['calibration_ready'] = {'silent': 'fixed-calibration'}
                    if markers != 'calibration': case.state['ascension_audits'] = {'silent:A11': request()}
                    retained = copy.deepcopy({k:v for k,v in case.state.items() if k != 'batches'})
                    manifest = (case.root / case.plan['input_manifest']['path']).read_bytes()
                    self.assertFalse(hold(case))
                    self.assertEqual(case.dispatch(), (BID, 10))
                    for key, value in retained.items(): self.assertEqual(case.state[key], value)
                    batch = case.state['batches'][BID]
                    self.assertEqual(batch[kind + '_binding']['input_manifest'], case.plan['input_manifest'])
                    self.assertEqual((case.root / case.plan['input_manifest']['path']).read_bytes(), manifest)
                    original = copy.deepcopy(batch)
                    shared.reconcile(case.state, case.directory, kind)
                    self.assertEqual(case.state['strategy_' + kind]['cursor'], 0)
                    case.native()
                    shared.reconcile(case.state, case.directory, kind)
                    count = len(batch[kind + '_binding']['entry_ids'])
                    self.assertEqual(case.state['strategy_' + kind]['cursor'], count)
                    shared.reconcile(case.state, case.directory, kind)
                    self.assertEqual(case.state['strategy_' + kind]['cursor'], count)
                    self.assertEqual(batch, original)
                    self.assertIsNone(case.dispatch(stamp='20260101-000002'))
                    self.assertEqual(len(case.calls), 1)

    def test_runnable_audit_blocks_backfill_but_external_has_its_own_lane(self):
        for kind in ('backfill', 'external'):
            with self.subTest(kind=kind), source_fixture(kind) as case:
                original = request(); case.state['ascension_audits'] = {original['key']: original}
                before = copy.deepcopy(original)
                self.assertIsNone(audit.dispatch(case.state, str(case.root), str(REPO/'ops'), 'silent', [], lambda p: False,
                    'empty', lambda *args: self.fail('no evidence'), lambda tree: True))
                self.assertEqual(original, before)
                rows = ended(case)
                lock = case.directory/'learner/ascension-audit-silent-a11.lock'
                lock_before = lock.stat()
                self.assertTrue(hold(case))
                result = case.dispatch()
                if kind == 'external': self.assertIsNotNone(result)
                else: self.assertIsNone(result)
                self.assertEqual(original, before)
                self.assertEqual((lock.stat().st_ino, lock.stat().st_mtime_ns), (lock_before.st_ino, lock_before.st_mtime_ns))
                result = audit.dispatch(case.state, str(case.root), str(REPO/'ops'), 'silent', rows, lambda p: False,
                    'audit-ready', lambda *args: (20, None), lambda tree: True)
                self.assertEqual(result, ('audit-ready-ascension-audit', 20))
                self.assertEqual(original['key'], before['key'])
                self.assertEqual(original['anchor_run'], before['anchor_run'])
                self.assertEqual(original['attempts'], 1)

    def test_calibration_preempts_backfill_but_external_remains_independent(self):
        for kind in ('backfill', 'external'):
            with self.subTest(kind=kind), source_fixture(kind) as case:
                case.state['calibration_ready'] = {'silent': 'fixed-calibration'}
                (case.root/'.worktrees/silent-boss-calibration').mkdir(parents=True)
                with patch.object(jobs, 'available_worktree', return_value=True):
                    self.assertTrue(hold(case))
                    result = case.dispatch()
                    if kind == 'external': self.assertIsNotNone(result)
                    else: self.assertIsNone(result)
                self.assertEqual(len(case.calls), 1 if kind == 'external' else 0)

    def test_audit_backoff_exhaustion_and_tree_gates_match_dispatch(self):
        for mode in ('backoff', 'exhausted', 'dirty', 'occupied', 'wrong-level', 'wrong-character', 'invalid-run'):
            with self.subTest(mode=mode), source_fixture('external') as case:
                req = request(); case.state['ascension_audits'] = {req['key']: req}; rows = ended(case)
                tree = case.root/'.worktrees/ascension-audit-silent-a11-1'
                if mode == 'backoff': req.update(state='failed', retry_at=audit.time.time()+3600, last_failure='fixed retained error')
                if mode == 'exhausted': req.update(attempts=3)
                if mode == 'dirty': tree.mkdir(parents=True)
                if mode == 'occupied': case.state['batches']['old'] = {'worktree': str(tree), 'state': 'running', 'pid': 99}
                if mode == 'wrong-level': rows[0]['ascension'] = 10
                if mode == 'wrong-character': rows[0]['character'] = 'IRONCLAD'
                if mode == 'invalid-run': rows[0]['run_id'] = 'invalid'
                ended(case, rows)
                before = copy.deepcopy(case.state)
                with patch.object(jobs, 'available_worktree', return_value=False):
                    self.assertFalse(hold(case))
                    self.assertEqual(case.state, before)
                    self.assertIsNone(audit.candidate(case.state, str(case.root), 'silent', req, rows, lambda tree: False))
                self.assertIsNone(audit.dispatch(case.state, str(case.root), str(REPO/'ops'), 'silent', rows, lambda p: False,
                    'never-start', lambda *args: self.fail('must keep dispatch gates'), lambda tree: False))
                self.assertEqual(req['attempts'], before['ascension_audits'][req['key']]['attempts'])

    def test_original_audit_lock_and_active_heavy_hold_without_new_evidence(self):
        with source_fixture('external') as case:
            req = request(); case.state['ascension_audits'] = {req['key']: req}
            lock = case.directory/'learner/ascension-audit-silent-a11.lock'; lock.touch()
            with lock.open('r') as original:
                fcntl.flock(original, fcntl.LOCK_EX | fcntl.LOCK_NB)
                self.assertTrue(hold(case))
                self.assertIsNotNone(case.dispatch())
                self.assertTrue(jobs.external_learning_policy.own_busy(case.state, lambda pid: False, case.directory))
            self.assertFalse(hold(case))
            for status in ('running', 'launching'):
                req['state'] = status; self.assertTrue(hold(case))
            case.state.pop('ascension_audits')
            for status in ('running', 'launching', 'awaiting_review'):
                case.state['batches'] = {'active': {'state': status, 'pid': 20}}
                self.assertTrue(hold(case, alive=lambda pid: pid == 20))
            self.assertFalse(hold(case, alive=lambda pid: False))
            case.state['batches']['active']['state'] = 'launching'
            self.assertTrue(hold(case))

    def test_calibration_producer_and_consumer_share_real_tree_and_retry_gates(self):
        with source_fixture('external') as case:
            live = case.root/'.worktrees/live/knowledge/characters/silent'; live.mkdir(parents=True)
            (live/'boss-trust.json').write_text(json.dumps({'character':'silent','refresh':{'keys':[],'max_asc':10}}))
            ended(case); (case.root/'logs/sl-attempts.jsonl').write_text('')
            case.state['calibration_ready'] = {'silent':'legacy-marker'}
            with patch.object(jobs, 'available_worktree', return_value=True), patch.object(jobs, 'start_learner', return_value=(20,None)) as start, \
                    patch.object(jobs, 'requested_feature', wraps=jobs.requested_feature) as requested:
                def tick(stamp):
                    return jobs.calibration_job(case.state, str(case.root), str(REPO/'ops'), 'silent', lambda pid: pid == 20, stamp)
                self.assertIsNone(tick('missing-tree'))
                self.assertFalse(case.state['calibration_ready'].get('silent'))
                self.assertFalse(hold(case)); start.assert_not_called()
                original_request = copy.deepcopy(requested.call_args.kwargs['request'])
                tree = case.root/'.worktrees/silent-boss-calibration'; tree.mkdir(parents=True)
                self.assertEqual(tick('restored-tree'), ('restored-tree-fix-batch',20))
                ident = case.state['batches']['restored-tree-fix-batch']['feature_request']
                self.assertEqual(case.state['calibration_ready']['silent'], ident)
                self.assertEqual(original_request['request_id'], ident)
                self.assertTrue(hold(case, alive=lambda pid: pid == 20))
                start.assert_called_once()
            case.state['batches'] = {}; case.state['calibration_ready'] = {'silent':ident}
            with patch.object(jobs, 'available_worktree', return_value=True):
                self.assertTrue(hold(case))
                for status in ('done','awaiting_review','backoff','exhausted'):
                    batch = {'feature_request':ident,'state':'failed','retry_at':0}
                    if status in ('done','awaiting_review'): batch['state'] = status
                    if status == 'backoff': batch['retry_at'] = jobs.time.time()+3600
                    case.state['batches'] = {'prior':batch}
                    if status == 'exhausted': case.state['batches'].update(prior2=dict(batch),prior3=dict(batch))
                    before = copy.deepcopy(case.state)
                    self.assertFalse(hold(case)); self.assertEqual(case.state,before)
                case.state['batches'] = {}
            with patch.object(jobs, 'available_worktree', return_value=False): self.assertFalse(hold(case))

    def test_normal_wait_and_other_pending_learning_requests_still_hold_backfill(self):
        with source_fixture('backfill') as case:
            for normal in ({'backfill_hold':True},{'experience':True},{'fixes':True},{'disk_capacity_hold':True}):
                self.assertTrue(hold(case, normal)); self.assertIsNone(case.dispatch(normal))
            for status in ('pending','running'):
                case.state['learning_requests'] = {'other':{'character':'silent','state':status}}
                self.assertTrue(hold(case)); self.assertIsNone(case.dispatch())
            self.assertEqual(case.calls, [])


if __name__ == '__main__':
    unittest.main()
