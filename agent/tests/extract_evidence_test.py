"""Fixed coverage for the 141302 run-plans identity omission; no live knowledge."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('extract_evidence', ROOT / 'learner/extract_evidence.py')
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)
RUN = 'K3676LU8B0UH'
OTHER = 'SADL3CGYTGSR'


class ExtractEvidenceTest(unittest.TestCase):
    def test_plan_run_field_preserves_exact_raw_evidence(self):
        # The real run-plans schema carries run, not run_id (K3676LU8B0UH F1).
        rows = [{'run': OTHER, 'summary': RUN}, {'run': RUN, 'floor': 1, 'summary': '原计划'},
                {'run': RUN, 'floor': 6, 'summary': '同局后继'}]
        raw = [(json.dumps(row, ensure_ascii=False) + '\n').encode() for row in rows]
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / 'run-plans.jsonl', Path(directory) / 'evidence.jsonl'
            source.write_bytes(b''.join(raw))
            manifest = evidence.extract(source, output, [RUN])
            extracted = [json.loads(line) for line in output.read_bytes().splitlines()]
            self.assertEqual(manifest['counts'], {RUN: 2})
            self.assertEqual(manifest['source_size'], sum(map(len, raw)))
            self.assertEqual([item['line'] for item in extracted], [2, 3])
            for item, original, offset in zip(extracted, raw[1:], [len(raw[0]), len(raw[0]) + len(raw[1])]):
                self.assertEqual(item['row'], json.loads(original))
                self.assertEqual((item['offset'], item['bytes']), (offset, len(original)))
                self.assertEqual(item['sha256'], hashlib.sha256(original).hexdigest())
                self.assertEqual(source.read_bytes()[offset:offset + item['bytes']], original)
            self.assertEqual(manifest['output_sha256'], hashlib.sha256(output.read_bytes()).hexdigest())

    def test_other_stream_identities_remain_available(self):
        for row in ({'run_id': RUN}, {'state': {'run_id': RUN, 'run': {'floor': 1}}},
                    {'fingerprint': json.dumps({'run': RUN})}, {'fingerprint': {'run': RUN}},
                    {'run_id': RUN, 'run': RUN, 'state': {'run_id': RUN}}):
            with self.subTest(row=row):
                self.assertEqual(evidence.run_identity(row), RUN)

    def test_foreign_mentions_and_conflicting_identities_are_not_selected(self):
        for row in ({'summary': RUN}, {'run_id': OTHER, 'summary': RUN}, {'run': {'run_id': RUN}},
                    {'run_id': RUN, 'run': OTHER}, {'run': RUN, 'state': {'run_id': OTHER}},
                    {'run': RUN, 'fingerprint': json.dumps({'run': OTHER})}, [], None):
            with self.subTest(row=row):
                self.assertNotEqual(evidence.run_identity(row), RUN)

    def test_original_cutoff_does_not_include_later_appends_or_partial_lines(self):
        raw = (json.dumps({'run': RUN}) + '\n').encode()
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / 'run-plans.jsonl', Path(directory) / 'evidence.jsonl'
            source.write_bytes(raw * 2 + b'{broken\n' + raw[:-1])
            manifest = evidence.extract(source, output, [RUN], len(raw))
            self.assertEqual(manifest['counts'], {RUN: 1})
            self.assertEqual(manifest['source_size'], len(raw))
            full = evidence.extract(source, output, [RUN])
            self.assertEqual(full['counts'], {RUN: 2})
            self.assertEqual((full['invalid_lines'], full['incomplete_lines']), (1, 1))

    def test_invalid_cutoff_does_not_overwrite_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / 'run-plans.jsonl', Path(directory) / 'evidence.jsonl'
            source.write_bytes(b'{}\n')
            output.write_bytes(b'original')
            for limit in (-1, 4, True):
                with self.subTest(limit=limit), self.assertRaises(ValueError):
                    evidence.extract(source, output, [RUN], limit)
                self.assertEqual(output.read_bytes(), b'original')


if __name__ == '__main__':
    unittest.main()
