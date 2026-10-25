"""Main metadata cannot bypass source checks or overwrite parallel append history."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import board_queue_records as records
from board_queue_pin import sha


class RecordRequest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.env = patch.dict(os.environ, dict(GIT_AUTHOR_NAME='Record fixture', GIT_COMMITTER_NAME='Record fixture',
                              GIT_AUTHOR_EMAIL='fixture@localhost', GIT_COMMITTER_EMAIL='fixture@localhost'))
        self.env.start()
        self.addCleanup(self.env.stop)
        self.git('init', '-q', '-b', 'main')
        self.put('.gitignore', '.state/\n.worktrees/\n')
        self.put('paper/materials/decision-log.md', 'original decision\n')
        self.old_versions = dict(doc='fixed history', versions=[dict(name='old', commit='a' * 40)])
        self.put('eval/versions.json', json.dumps(self.old_versions))
        self.commit()
        self.base = self.git('rev-parse', 'HEAD')
        self.git('worktree', 'add', '--detach', str(self.root / '.worktrees/live'), self.base)
        self.put('.state/deploy.json', '{"fixture":"already deployed; do not replay"}\n')
        self.value = dict(schema='sts2-main-record-request-v1', id='record-1', epoch='fixed-epoch',
                          expected_main=self.base, head='', head_ref='refs/heads/record',
                          deployment=dict(path='.state/deploy.json', sha256=sha((self.root / '.state/deploy.json').read_bytes()),
                                          release_id='V6-R1', live_commit=self.base))

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)

    def git(self, *args):
        return subprocess.check_output(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
                                       '-C', str(self.root), *args], text=True, stderr=subprocess.PIPE).strip()

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'fixed record fixture')

    def delivery(self, name='paper/materials/decision-log.md', data='original decision\nnew fixed decision\n'):
        self.git('checkout', '-qb', 'record', self.base)
        self.put(name, data)
        self.commit()
        self.value['head'] = self.git('rev-parse', 'HEAD')
        self.git('checkout', '-q', 'main')
        return self.value

    def validate(self, value):
        # Real Git/receipt checks; scanner return semantics are separately probed
        # without placing test secrets in source or public test output.
        real = subprocess.run
        def run(argv, **kwargs):
            if argv[0] == 'gitleaks':
                return subprocess.CompletedProcess(argv, 0, stdout=b'', stderr=b'')
            return real(argv, **kwargs)
        with patch.object(records.subprocess, 'run', side_effect=run):
            return records.validate(self.root, value)

    def test_append_request_binds_deployment_without_mutating_main_or_live(self):
        value = self.delivery()
        result = self.validate(value)
        self.assertEqual(result['paths'], ['paper/materials/decision-log.md'])
        self.assertEqual(result['deployment'], value['deployment'])
        self.assertEqual(self.git('rev-parse', 'main'), self.base)
        self.assertEqual((self.root / 'paper/materials/decision-log.md').read_text(), 'original decision\n')

    def test_source_code_and_knowledge_cannot_be_disguised_as_metadata(self):
        value = self.delivery('ops/new.py', 'value = 42\n')
        with self.assertRaisesRegex(ValueError, 'source/knowledge'):
            self.validate(value)

    def test_history_replacement_is_rejected(self):
        value = self.delivery(data='replacement that loses parallel history\n')
        with self.assertRaisesRegex(ValueError, 'append only'):
            self.validate(value)

    def test_receipt_mutation_and_symbolic_or_moved_heads_are_rejected(self):
        value = self.delivery()
        changed = copy.deepcopy(value)
        changed['head'] = 'HEAD'
        with self.assertRaises(ValueError):
            self.validate(changed)
        (self.root / '.state/deploy.json').write_text('changed receipt')
        with self.assertRaisesRegex(ValueError, 'receipt changed'):
            self.validate(value)

    def test_version_append_matches_original_live_receipt(self):
        value = copy.deepcopy(self.old_versions)
        value['versions'].append(dict(name='new', family='fixture', commit=self.base, release_id='V6-R1'))
        request = self.delivery('eval/versions.json', json.dumps(value))
        self.assertEqual(self.validate(request)['paths'], ['eval/versions.json'])

    def test_version_history_cannot_be_renumbered(self):
        value = copy.deepcopy(self.old_versions)
        value['versions'][0]['name'] = 'renumbered'
        request = self.delivery('eval/versions.json', json.dumps(value))
        with self.assertRaisesRegex(ValueError, 'history'):
            self.validate(request)

    def test_failed_scanner_retains_both_refs_and_original_request(self):
        request = self.delivery()
        real = subprocess.run
        def run(argv, **kwargs):
            return subprocess.CompletedProcess(argv, 2) if argv[0] == 'gitleaks' else real(argv, **kwargs)
        with patch.object(records.subprocess, 'run', side_effect=run):
            with self.assertRaisesRegex(ValueError, 'secret scan'):
                records.validate(self.root, request)
        self.assertEqual(self.git('rev-parse', 'main'), self.base)
        self.assertEqual(self.git('rev-parse', 'record'), request['head'])


if __name__ == '__main__':
    unittest.main()
