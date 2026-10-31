"""Real source closures, source publication transactions and fixed-data consumer boundaries."""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ops'))
sys.path.insert(0, str(ROOT))
from ops.tests.fixed_producer_fixture import install, review
from fixed_producer_methods import manifest, method
import fixed_method_admission as admission
import publication_gate as gate
from learning_runtime_store import Store, packed, sha


class FixedMethodTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='fixed-method-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        install(self.root)

    def test_all_declared_producers_are_closed_on_real_sources(self):
        declaration = json.loads((ROOT / 'ops/fixed-producer-dependencies.json').read_text())
        for producer in declaration['producers']:
            with self.subTest(producer=producer):
                self.assertTrue(manifest(ROOT, producer, ROOT)['inputs'])

    def test_unrelated_live_release_keeps_outcome_identity(self):
        old = method(self.root, 'outcome', self.root)
        path = self.root / 'agent/src/brain/unrelated.ts'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('export const unrelated = true;\n')
        self.assertEqual(method(self.root, 'outcome', self.root), old)
        path.write_text('export const unrelated = false;\n')
        self.assertEqual(method(self.root, 'outcome', self.root), old)
        self.assertNotIn('code:agent/src/brain/unrelated.ts', manifest(self.root, 'outcome', self.root)['inputs'])
        self.assertIn('code:agent/src/knowledge/runtime/stats-store.ts', manifest(self.root, 'outcome', self.root)['inputs'])

    def test_actual_input_edit_requires_explicit_review_then_changes_method(self):
        old = method(self.root, 'outcome', self.root)
        name = 'knowledge/builders/build-outcome-stats.py'
        with (self.root / name).open('a') as out:
            out.write('\n# Synthetic method revision.\n')
        with self.assertRaisesRegex(ValueError, 'engineering declaration'):
            method(self.root, 'outcome', self.root)
        review(self.root, name)
        self.assertNotEqual(method(self.root, 'outcome', self.root), old)

    def test_reviewed_hash_alone_cannot_bless_a_new_opaque_dependency_site(self):
        name = 'knowledge/builders/build-outcome-stats.py'
        with (self.root / name).open('a') as out:
            out.write('\n__import__("new_" + "helper")\n')
        review(self.root, name)
        with self.assertRaisesRegex(ValueError, 'opaque dependency site'):
            method(self.root, 'outcome', self.root)

    def test_root_validator_is_not_borrowed_from_code_root(self):
        code = self.root / '.worktrees/live'
        install(code)
        old = method(code, 'outcome', self.root)
        name = 'ops/learning_runtime_store.py'
        (code / name).unlink()
        self.assertEqual(method(code, 'outcome', self.root), old)
        (self.root / name).unlink()
        with self.assertRaises(ValueError):
            method(code, 'outcome', self.root)

    def test_nested_root_validator_import_cannot_escape_static_closure(self):
        name = 'ops/learning_runtime_store.py'
        with (self.root / name).open('a') as out:
            out.write('\ndef synthetic_validator():\n    import unreviewed_validator_dependency\n')
        review(self.root, name)
        with self.assertRaisesRegex(ValueError, 'undeclared Python import'):
            method(self.root, 'outcome', self.root)

    def test_missing_leaf_or_unresolved_new_import_is_rejected(self):
        name = 'knowledge/builders/build-outcome-stats.py'
        with (self.root / name).open('a') as out:
            out.write('\nimport unreviewed_dynamic_helper\n')
        review(self.root, name)
        with self.assertRaisesRegex(ValueError, 'undeclared Python import'):
            method(self.root, 'outcome', self.root)
        install(self.root)
        (self.root / 'knowledge/builders/characters.py').unlink()
        with self.assertRaises(ValueError):
            method(self.root, 'outcome', self.root)

    def test_opaque_change_without_new_declaration_is_rejected(self):
        name = 'knowledge/builders/build-outcome-stats.py'
        with (self.root / name).open('a') as out:
            out.write('\n__import__("new_" + "helper")\n')
        with self.assertRaisesRegex(ValueError, 'engineering declaration'):
            method(self.root, 'outcome', self.root)

    def test_static_edge_cannot_be_removed_from_reviewed_closure(self):
        path = self.root / 'ops/fixed-producer-dependencies.json'
        declaration = json.loads(path.read_text())
        declaration['producers']['outcome']['inputs']['code:knowledge/builders/build-outcome-stats.py']['dependencies'] = []
        path.write_text(json.dumps(declaration))
        with self.assertRaisesRegex(ValueError, 'undeclared static dependency'):
            method(self.root, 'outcome', self.root)

    def test_calibration_new_actual_read_leaf_requires_declaration(self):
        install(self.root, 'silent-boss-calibration')
        method(self.root, 'silent-boss-calibration', self.root)
        (self.root / 'agent/src/new-model.ts').write_text('export const model = 0;\n')
        with self.assertRaisesRegex(ValueError, 'read family'):
            method(self.root, 'silent-boss-calibration', self.root)


class PublicationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='method-publication-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.live = self.root / '.worktrees/live'
        self.dest = self.root / 'ops/codex-ops'
        self.dest.mkdir(parents=True)
        self.directory = self.root / 'data/learning-runtime'
        Store(self.directory).close()
        self.control = self.dest / 'learning-runtime.json'
        self.control.write_text(packed(dict(schema='operational-runtime-control-v1', root=str(self.root), enabled=True,
            directory=str(self.directory), entries=[], refresh=['outcome'], methods={'outcome': '0' * 64})) + '\n')
        for tree in (self.root, self.live):
            install(tree)
            (tree / '.gitignore').write_text('data/\n.worktrees/\nops/codex-ops/\n')
            for args in (('init', '-q'), ('add', '.'), ('commit', '-qm', 'Fixed method fixture')):
                self.git(tree, *args)
        self.w, self.g = self.root / '.worktrees/checked-root', self.root / '.worktrees/checked-live'
        install(self.w)
        install(self.g)
        self.changed = 'knowledge/builders/build-outcome-stats.py'
        with (self.g / self.changed).open('a') as out:
            out.write('\n# Synthetic reviewed producer update.\n')
        shutil.copyfile(self.g / self.changed, self.w / self.changed)
        review(self.w, self.changed)
        self.after = admission.inputs(self.g, self.w, ['outcome'])
        candidate = admission.head(self.root)
        files = lambda tree: {str(p.relative_to(tree)): dict(sha256=sha(p.read_bytes())) for p in tree.rglob('*') if p.is_file()}
        evidence = dict(exit_code=0, checks={k: 'passed' for k in admission.CHECKS}, full_runs=1,
                        job=dict(candidate=candidate), assembly=dict(root=str(self.w), runtime=str(self.g), candidate=candidate,
                        live=str(self.live), live_commit=admission.head(self.live), live_before=dict(files=files(self.live)),
                        root_inputs=dict(files=files(self.w)), runtime_inputs=dict(files=files(self.g))))
        self.evidence = self.root / 'checks.json'
        self.evidence.write_text(packed(evidence))
        self.ticket = admission.prepare(self.root, self.dest, self.w, self.g, self.evidence)
        self.ticket_path = self.root / 'ticket.json'
        self.ticket_path.write_text(packed(self.ticket))
        self.marker = gate.begin(self.root, self.dest, 'issue84', os.getpid())
        self.no_games = patch.object(gate, 'active_games', return_value=False)
        self.no_games.start()
        self.addCleanup(self.no_games.stop)

    def git(self, tree, *args):
        return subprocess.check_output(['git', '-C', str(tree), *args], stderr=subprocess.PIPE)

    def writing(self, ticket=True, resume=False):
        return gate.writing(self.root, self.dest, 'issue84', self.marker['token'], os.getpid(), self.ticket_path if ticket else None, resume)

    def deploy(self):
        shutil.copyfile(self.g / self.changed, self.live / self.changed)
        shutil.copyfile(self.w / self.changed, self.root / self.changed)
        shutil.copyfile(self.w / 'ops/fixed-producer-dependencies.json', self.root / 'ops/fixed-producer-dependencies.json')

    def test_missing_material_rejects_before_deployment(self):
        with self.assertRaisesRegex(ValueError, 'engineering admission material'):
            with self.writing(ticket=False):
                self.fail('deployment must not start')
        self.assertEqual(json.loads(self.control.read_text())['methods']['outcome'], '0' * 64)

    def test_source_deployment_admission_and_release_are_one_transaction(self):
        original = self.control.read_bytes()
        with self.writing():
            self.deploy()
            self.assertEqual(self.control.read_bytes(), original)
        body = json.loads(self.control.read_text())
        self.assertEqual(body['methods'], self.ticket['methods'])
        self.assertEqual(body['refresh'], ['outcome'])
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())
        self.assertFalse((self.dest / gate.MARKER).exists())

    def test_terminal_consumer_details_are_accepted_without_rewriting_the_receipt(self):
        evidence = json.loads(self.evidence.read_text())
        evidence['checks'].update({f'consumer-{n}': 'passed' for n in range(10)})
        raw = packed(evidence).encode()
        self.evidence.write_bytes(raw)
        self.ticket = admission.prepare(self.root, self.dest, self.w, self.g, self.evidence)
        self.ticket_path.write_text(packed(self.ticket))
        self.assertEqual(self.ticket['evidence']['sha256'], sha(raw))
        self.assertEqual(self.evidence.read_bytes(), raw)
        # Successful detail checks remain bound by the original receipt hash.
        self.evidence.write_bytes(raw + b'\n')
        with self.assertRaisesRegex(ValueError, 'receipt changed'):
            with self.writing():
                self.fail('must retain the exact final receipt')
        self.evidence.write_bytes(raw)
        with self.writing():
            self.deploy()
        self.assertEqual(json.loads(self.control.read_text())['methods'], self.ticket['methods'])
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())
        self.assertEqual(self.evidence.read_bytes(), raw)

    def test_nonpassing_consumer_details_reject_the_otherwise_successful_receipt(self):
        evidence = json.loads(self.evidence.read_text())
        evidence['checks'].update({f'consumer-{n}': 'passed' for n in range(10)})
        original = self.control.read_bytes()
        for status in ('failed', 'unavailable', 'running', 'cancelled', 'skipped', None, True):
            with self.subTest(status=status):
                evidence['checks']['consumer-7'] = status
                self.evidence.write_text(packed(evidence))
                with self.assertRaisesRegex(ValueError, 'engineering combination'):
                    admission.checked_evidence(self.root, self.evidence, self.w, self.g, self.after)
                self.assertEqual(self.control.read_bytes(), original)

    def test_every_required_check_is_mandatory_even_with_passing_consumer_details(self):
        evidence = json.loads(self.evidence.read_text())
        evidence['checks'].update({f'consumer-{n}': 'passed' for n in range(10)})
        for required in ('root-tsc', 'runtime-tsc', 'live-tsc', 'host', 'consumers', 'full'):
            with self.subTest(required=required):
                incomplete = copy.deepcopy(evidence)
                del incomplete['checks'][required]
                self.evidence.write_text(packed(incomplete))
                with self.assertRaisesRegex(ValueError, 'engineering combination'):
                    admission.checked_evidence(self.root, self.evidence, self.w, self.g, self.after)

    def test_checks_must_be_a_mapping(self):
        evidence = json.loads(self.evidence.read_text())
        for invalid in (None, [], 'passed'):
            with self.subTest(checks=invalid):
                evidence['checks'] = invalid
                self.evidence.write_text(packed(evidence))
                with self.assertRaisesRegex(ValueError, 'engineering combination'):
                    admission.checked_evidence(self.root, self.evidence, self.w, self.g, self.after)

    def test_interrupted_deployment_retains_marker_and_resumes_installed_only(self):
        with self.assertRaisesRegex(RuntimeError, 'fixed interruption'):
            with self.writing():
                self.deploy()
                raise RuntimeError('fixed interruption')
        with self.assertRaises(ValueError):
            gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())
        with self.assertRaisesRegex(ValueError, 'may have run'):
            with self.writing():
                self.fail('must not replay original command')
        with self.writing(resume=True):
            pass
        with self.writing(resume=True):
            pass
        receipts = list((self.dest / 'fixed-method-publications').glob('*.json'))
        self.assertEqual(len(receipts), 1)
        self.assertEqual(json.loads(receipts[0].read_text())['phase'], 'admitted')
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())

    def test_control_cas_conflict_does_not_overwrite_concurrent_control(self):
        with self.assertRaisesRegex(ValueError, 'CAS conflict'):
            with self.writing():
                self.deploy()
                body = json.loads(self.control.read_text())
                body['entries'] = ['postmortem']
                self.control.write_text(packed(body))
        self.assertEqual(json.loads(self.control.read_text())['entries'], ['postmortem'])
        self.assertEqual(json.loads(self.control.read_text())['methods']['outcome'], '0' * 64)

    def test_unchecked_or_drifted_final_inputs_cannot_be_admitted(self):
        body = json.loads(self.evidence.read_text())
        body['checks']['full'] = 'failed'
        self.evidence.write_text(packed(body))
        with self.assertRaisesRegex(ValueError, 'engineering combination'):
            admission.prepare(self.root, self.dest, self.w, self.g, self.evidence)
        with self.assertRaisesRegex(ValueError, 'receipt changed'):
            with self.writing():
                self.fail('must not deploy')

    def test_postinstall_mismatch_retains_original_admission(self):
        with self.assertRaises(ValueError):
            with self.writing():
                pass
        self.assertEqual(json.loads(self.control.read_text())['methods']['outcome'], '0' * 64)
        self.assertTrue((self.dest / gate.MARKER).exists())

    def test_crash_after_control_cas_recovers_one_original_receipt(self):
        original_atomic = admission.atomic
        def interrupted(path, raw):
            if path.parent.name == 'fixed-method-publications' and json.loads(raw).get('phase') == 'admitted':
                raise OSError('fixed post-CAS interruption')
            return original_atomic(path, raw)
        with self.assertRaises(OSError):
            with patch.object(admission, 'atomic', side_effect=interrupted), self.writing():
                self.deploy()
        self.assertEqual(json.loads(self.control.read_text())['methods'], self.ticket['methods'])
        with self.assertRaises(ValueError):
            gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())
        with self.writing(resume=True):
            pass
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())

    def test_disabling_control_cannot_bypass_original_required_admission(self):
        with self.assertRaises(RuntimeError):
            with self.writing():
                raise RuntimeError('fixed interruption')
        body = json.loads(self.control.read_text())
        body['enabled'] = False
        self.control.write_text(packed(body))
        with self.assertRaisesRegex(ValueError, 'admission incomplete'):
            gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())

    def test_legacy_transaction_is_not_silently_converted(self):
        path = self.dest / gate.MARKER
        body = json.loads(path.read_text())
        body.pop('fixed_method_contract')
        path.write_text(packed(body))
        with self.assertRaisesRegex(ValueError, 'legacy publication retained'):
            with self.writing():
                self.fail('cannot retrofit a legacy publication')
        self.assertNotIn('fixed_method_transaction', json.loads(path.read_text()))
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())

    def test_following_unrelated_publication_keeps_method_and_allows_real_d1_consumer(self):
        import learning_runtime_data as data
        with self.writing():
            self.deploy()
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())
        old_method = method(self.live, 'outcome', self.root)
        evidence = json.loads(self.evidence.read_text())
        for identity, digest in admission.snapshots(self.root, self.after).items():
            scope, name = identity.split(':', 1)
            if scope == 'code':
                evidence['assembly']['live_before']['files'][name] = dict(sha256=digest) if digest else None
        self.evidence.write_text(packed(evidence))
        ticket = admission.prepare(self.root, self.dest, self.w, self.g, self.evidence)
        self.ticket_path.write_text(packed(ticket))
        self.marker = gate.begin(self.root, self.dest, 'issue84', os.getpid())
        with self.writing():
            path = self.live / 'agent/src/unrelated.ts'
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('export const unrelated = true;\n')
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], os.getpid())
        self.assertEqual(method(self.live, 'outcome', self.root), old_method)
        name = 'characters/silent/outcome-stats.json'
        output = self.live / 'knowledge' / name
        output.parent.mkdir(parents=True)
        output.write_text('{}')
        store = Store(self.directory)
        first = store.publish('old-D1', None, {name: b'{}'}, dict(producer='outcome'))
        store.close()
        with data.refresh_step(self.root, self.live, 'outcome:silent', ['silent'], 'after-unrelated') as result:
            output.write_text('{"character":"silent","by_ascension":{"10":{"baseline":{"runs":2}}}}')
            result['rc'] = 0
        self.assertNotEqual(result['version'], first)
        self.assertEqual(result['status'], 'published')
        selected = data.current_file(self.root, self.dest, name)
        self.assertEqual(json.loads(selected.read_text())['by_ascension']['10']['baseline']['runs'], 2)
        store = Store(self.directory, readonly=True)
        try:
            self.assertEqual(store.db.execute('SELECT count(*) FROM data_releases').fetchone()[0], 2)
            self.assertEqual(store.db.execute('SELECT body FROM objects WHERE digest=?', (store.manifest(first)[name],)).fetchone()[0], b'{}')
        finally:
            store.close()
        # A completed request reads its original durable result even after a
        # later source edit needs a new declaration. A fresh request still fails.
        with (self.live / self.changed).open('a') as out:
            out.write('\n# Later undeclared source, after the completed data request.\n')
        with data.refresh_step(self.root, self.live, 'outcome:silent', ['silent'], 'after-unrelated') as replay:
            self.assertTrue(replay['already_completed'])
            self.assertEqual(replay['version'], result['version'])
        with self.assertRaises(ValueError):
            with data.refresh_step(self.root, self.live, 'outcome:silent', ['silent'], 'fresh-after-source-edit'):
                self.fail('fresh computation needs engineering declaration')


if __name__ == '__main__':
    unittest.main()
