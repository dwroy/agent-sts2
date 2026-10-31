import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import stats_launch as launch
import stats_shadow as shadow
from stats_runtime import SCHEMA, packed, sha


class StatsLaunchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        for name in launch.CAPABILITIES:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('synthetic capability input: ' + name)
        (self.root / 'agent/src/knowledge/stats-required.ts').write_text('export const STATS_REQUIRED = false;\n')
        self.state = self.root / 'ops/codex-ops'
        self.state.mkdir(parents=True)
        self.runtime = self.root / 'data/stats'
        self.runtime.mkdir(parents=True)
        self.control = dict(schema=SCHEMA, root=str(self.root), enabled=True, directory=str(self.runtime),
                            backend='shadow', methods={'outcome': 'a' * 64}, retired_git_data=False)
        self.save()
        self.bundle = dict(schema='knowledge-resource-bundle-v1', stats_version='S1-' + 'b' * 64,
                           k1_version='K1-' + 'c' * 64, operational_view_sha=None,
                           capabilities_sha=launch.capabilities(self.root), dependencies={})
        ready = dict(schema='stats-ready-v1', root=str(self.root), directory=str(self.runtime),
                     bundle_sha=sha(packed(self.bundle).encode()), bundle=self.bundle, methods=self.control['methods'])
        (self.runtime / 'ready.json').write_text(packed(ready) + '\n')
        self.log = self.root / 'logs/run-config.jsonl'

    def save(self):
        (self.state / 'stats-runtime.json').write_text(packed(self.control))

    def call(self, screen='MAIN_MENU', session='session-1', run='FIXTURE00001'):
        with patch.dict(os.environ, {'CODEX_OPS_DIR': str(self.state)}), \
                patch.object(launch, 'call', side_effect=AssertionError('boundary must not open a DB or run Node')):
            return launch.launch(self.root, self.root, screen, run, session, self.log, 'd' * 40, ['original-command'])

    def test_boundary_pins_ready_bundle_and_backend_with_only_small_durable_files(self):
        command, env = self.call()
        selected = json.loads(env['STS2_ASSETS_SELECTION'])
        self.assertEqual(command, ['original-command'])
        self.assertEqual(selected['mode'], 'shadow')
        self.assertEqual(env['STS2_ASSETS_K1_VERSION'], self.bundle['k1_version'])
        self.control['backend'] = 'sqlite'
        self.save()
        self.assertEqual(self.call()[1]['STS2_ASSETS_SELECTION'], env['STS2_ASSETS_SELECTION'])
        next_selection = json.loads(self.call(session='session-2')[1]['STS2_ASSETS_SELECTION'])
        self.assertEqual(next_selection['mode'], 'sqlite')

    def test_disabled_legacy_launcher_keeps_unknown_mod_identity_without_selecting_S1(self):
        (self.state / 'stats-runtime.json').unlink()
        self.assertNotIn('STS2_ASSETS_SELECTION', self.call(screen='', run='')[1])
        self.save()
        with self.assertRaisesRegex(ValueError, 'unknown existing run'):
            self.call(screen='', run='')

    def test_resume_uses_original_record_when_current_control_is_disabled_and_rejects_tampering(self):
        selected = json.loads(self.call()[1]['STS2_ASSETS_SELECTION'])
        self.log.parent.mkdir(parents=True, exist_ok=True)
        self.log.write_text(packed({'run_id': 'FIXTURE00001', 'knowledge': {'assets': selected}}) + '\n')
        self.control['enabled'] = False
        self.save()
        self.assertEqual(json.loads(self.call('COMBAT', 'new-process')[1]['STS2_ASSETS_SELECTION']), selected)
        selected['binding']['code_sha'] = 'e' * 40
        self.log.write_text(packed({'run_id': 'FIXTURE00001', 'knowledge': {'assets': selected}}) + '\n')
        with self.assertRaisesRegex(ValueError, 'binding differs'):
            self.call('COMBAT', 'new-process')

    def test_disabled_original_choice_does_not_hot_enable_and_unbound_legacy_run_is_not_rebound(self):
        self.control['enabled'] = False
        self.save()
        self.assertNotIn('STS2_ASSETS_SELECTION', self.call()[1])
        self.control['enabled'] = True
        self.save()
        self.assertNotIn('STS2_ASSETS_SELECTION', self.call()[1])
        self.log.parent.mkdir(parents=True, exist_ok=True)
        self.log.write_text(packed({'run_id': 'FIXTURE00001', 'knowledge': {}}) + '\n')
        self.assertNotIn('STS2_ASSETS_SELECTION', self.call('COMBAT')[1])
        self.control['retired_git_data'] = True
        self.save()
        with self.assertRaisesRegex(ValueError, 'original legacy'):
            self.call('COMBAT')

    def test_capability_change_or_incomplete_preparation_holds_instead_of_reading_latest(self):
        (self.root / launch.CAPABILITIES[0]).write_text('changed fixture capability')
        with self.assertRaisesRegex(ValueError, 'no longer matches'):
            self.call()
        (self.runtime / 'ready.json').unlink()
        with self.assertRaises(ValueError):
            self.call(session='not-ready')


class StatsShadowTests(unittest.TestCase):
    def setUp(self):
        self.cap = 'a' * 64
        self.runs = [{'run_id': 'FIXTURE' + str(i).zfill(5), 'ended': '2026-10-31T00:00:00Z'} for i in range(7)]
        self.selection = {'mode': 'shadow', 'binding': {'run_key': 'fixture-run', 'bundle_sha': 'b' * 64,
                          'bundle': {'capabilities_sha': self.cap}}}
        self.configs = {r['run_id']: [{'loop': {'mode': 'play'}, 'knowledge': {'assets': self.selection}}] for r in self.runs}
        self.latency = dict(schema='stats-latency-v1', capabilities_sha=self.cap, exact_values=True,
                            independent_cases=200, noise_ms=1, p95_increment_upper_ms=.1, p99_increment_upper_ms=.2)

    def audit(self, selected):
        identity = dict(run_key=selected['binding']['run_key'], bundle_sha=selected['binding']['bundle_sha'], session='fixture')
        return [dict(identity, schema='stats-resource-shadow-v1', sequence=1,
                     equal=True, error_type=None, json_ns='1', sqlite_ns='2'),
                dict(identity, schema='stats-shadow-session-v1', reads=1, write_failures=0)]

    def test_exactly_five_natural_zero_difference_runs_and_latency_are_both_required(self):
        self.assertFalse(shadow.assess(self.runs[:4], self.configs, self.audit, self.latency, self.cap)['eligible_for_ops_boundary_switch'])
        good = shadow.assess(self.runs[:5], self.configs, self.audit, self.latency, self.cap)
        self.assertTrue(good['eligible_for_ops_boundary_switch'])
        self.assertFalse(good['production_switch_performed'])
        self.latency['p99_increment_upper_ms'] = 1.01
        self.assertFalse(shadow.assess(self.runs[:5], self.configs, self.audit, self.latency, self.cap)['eligible_for_ops_boundary_switch'])

    def test_difference_unknown_binding_and_capability_fix_reset_the_streak(self):
        self.configs[self.runs[4]['run_id']][0]['loop']['mode'] = 'replay'
        value = shadow.assess(self.runs, self.configs, self.audit, self.latency, self.cap)
        self.assertEqual(value['consecutive_count'], 2)
        self.assertFalse(value['eligible_for_ops_boundary_switch'])
        def different(selected):
            return [{**self.audit(selected)[0], 'equal': False}]
        self.assertEqual(shadow.assess(self.runs, self.configs, different, self.latency, self.cap)['consecutive_count'], 0)
        self.assertEqual(shadow.assess(self.runs, self.configs, self.audit, self.latency, 'new-capability')['consecutive_count'], 0)

    def test_empty_audit_and_repeated_run_do_not_prove_five_runs(self):
        self.assertEqual(shadow.assess(self.runs, self.configs, lambda _: [], self.latency, self.cap)['consecutive_count'], 0)
        repeated = [self.runs[0]] * 6
        self.assertEqual(shadow.assess(repeated, self.configs, self.audit, self.latency, self.cap)['consecutive_count'], 1)

    def test_partial_or_failed_audit_cannot_pass_from_a_successful_prefix(self):
        for events in [self.audit(self.selection)[:-1],
                       [self.audit(self.selection)[0], {**self.audit(self.selection)[1], 'write_failures': 1}],
                       [{**self.audit(self.selection)[0], 'sequence': 2}, self.audit(self.selection)[1]]]:
            self.assertFalse(shadow.complete_audit(events, self.selection['binding']))


if __name__ == '__main__':
    unittest.main()
