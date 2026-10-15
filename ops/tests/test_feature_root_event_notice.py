"""Fixed launcher root-log layout; no real notices, ACKs, models or network."""
import copy
import json
import unittest

from test_feature_notice_registration import FeatureNoticeRegistration, flow


class FeatureRootEventNotice(unittest.TestCase):
    def setUp(self):
        self.fixture = FeatureNoticeRegistration(methodName='runTest')
        self.addCleanup(self.fixture.doCleanups)
        self.fixture.setUp()
        self.feature = self.fixture.fixture
        self.f = self.fixture.f
        self.scratch = self.f.root / 'learner/runs/fixed-root-feature'
        self.scratch.mkdir(parents=True)
        self.log = self.scratch.with_suffix('.jsonl')
        self.launch = {'type': 'learner_launch', 'engine': 'codex', 'cwd': str(self.feature.tree),
                       'task': 'silent-boss-calibration',
                       'params': {'scratch': str(self.scratch), 'worktree': str(self.feature.tree),
                                  'character': 'silent'}}
        self.message = self.scratch / 'message.md'
        self.message.write_text(self.f.notice['message'])
        self.batch = self.f.state['batches'][self.feature.batch]
        self.batch['report']['report'] = str(self.scratch / 'report.md')
        self.fixture.source['original_message'] = self.feature.ref(self.message)
        self.write_launch()

    def write_launch(self, launch=None, thread=None):
        self.log.write_text('\n'.join(json.dumps(event) for event in [
            self.launch if launch is None else launch,
            {'type': 'thread.started', 'thread_id': thread or self.feature.thread}]) + '\n')
        self.fixture.source['original_log'] = self.feature.ref(self.log)
        self.save()

    def save(self):
        self.fixture.source_ref = self.f.artifact('producer-source.json', self.fixture.source)
        flow.atomic(self.f.state_path, self.f.state)

    def reject(self):
        before = self.f.state_path.read_bytes()
        with self.assertRaises(SystemExit):
            self.fixture.register()
        self.assertEqual(self.f.state_path.read_bytes(), before)
        self.assertFalse(self.fixture.path.exists())
        self.assertFalse((self.fixture.path.parent / 'sources').exists())

    def test_registered_root_event_log_is_idempotent_and_keeps_independent_ack_stages(self):
        # Reuse the full registration, original-text, delivery and idempotency assertions.
        self.fixture.test_producer_registers_original_native_id_and_existing_actor_receipts_without_resending()

    def test_root_log_rejects_wrong_launch_scratch_owner_task_cwd_and_thread(self):
        for key, value in [('scratch', str(self.scratch.parent / 'other')),
                           ('scratch', str(self.feature.tree / 'learner/runs/other')),
                           ('scratch', None), ('worktree', str(self.f.root / '.worktrees/other')),
                           ('character', 'ironclad')]:
            with self.subTest(param=key, value=value):
                launch = copy.deepcopy(self.launch)
                launch['params'][key] = value
                self.write_launch(launch)
                self.reject()
        for changes in ({'params': None}, {'params': {}}, {'params': {'scratch': 123}},
                        {'task': 'strategy-proposal'}, {'cwd': str(self.f.root)}, {'engine': 'other'}):
            with self.subTest(launch=changes):
                self.write_launch({**self.launch, **changes})
                self.reject()
        self.write_launch(thread='01a13753-c032-73f0-aa3f-ddc0e14809ce')
        self.reject()

    def test_root_layout_keeps_source_character_sha_and_native_transport_guards(self):
        self.fixture.test_registration_rejects_forged_native_provenance_without_partial_notice_or_state()
        self.fixture.source['original_log']['sha256'] = 'a' * 64
        self.save()
        self.reject()

    def test_root_layout_rejects_unbound_report_log_and_message_paths(self):
        original = copy.deepcopy(self.fixture.source)
        for path in (self.scratch.parent / 'other/report.md',
                     self.f.root / 'notes/fixed-root-feature/report.md',
                     self.scratch / 'nested/report.md'):
            with self.subTest(report=str(path)):
                self.batch['report']['report'] = str(path)
                self.save()
                self.reject()
        self.batch['report']['report'] = str(self.scratch / 'report.md')
        for path in (self.scratch.parent / 'other.jsonl', self.f.root / 'outside.jsonl'):
            with self.subTest(log=str(path)):
                path.write_bytes(self.log.read_bytes())
                self.fixture.source['original_log'] = self.feature.ref(path)
                self.save()
                self.reject()
        self.fixture.source = copy.deepcopy(original)
        outside = self.scratch.parent / 'outside-message.md'
        outside.write_bytes(self.message.read_bytes())
        self.fixture.source['original_message'] = self.feature.ref(outside)
        self.save()
        self.reject()
        link = self.scratch / 'linked-message.md'
        link.symlink_to(outside)
        self.fixture.source['original_message'] = self.feature.ref(link)
        self.save()
        self.reject()


if __name__ == '__main__':
    unittest.main()
