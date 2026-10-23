"""Fixed mechanical regression through the real evidence and after-run entry points."""
import hashlib
import importlib.util
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
sys.path.insert(0, str(ROOT / 'learner'))
sys.path.insert(0, str(ROOT / 'knowledge/builders'))
from evidence_identity import decision_index, associate
from extract_evidence import extract
from evidence_summary import summarize
from incremental_evidence import FrozenLogIndex
spec = importlib.util.spec_from_file_location('refresh_v6', ROOT / 'knowledge/builders/refresh-v6-history.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)
RUN, OTHER = 'AAAAAAAAAAAA', 'BBBBBBBBBBBB'

def raw(row):
    return (json.dumps(row, ensure_ascii=False) + '\n').encode()


def put(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw(value))


def retain(label, value):
    directory = os.environ.get('V6_LOOP_TEST_ARTIFACTS')
    if directory:
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        put(path / (label + '.json'), value)


def call_evidence(receipt):
    return dict(receipt=receipt, output_streams=[dict(name=s['name'],
        stdout=Path(s['stdout']['path']).read_text(), stderr=Path(s['stderr']['path']).read_text())
        for s in receipt['steps'] if 'stdout' in s],
        fixed_inputs=True, production_consumption=None)


class IdentityTest(unittest.TestCase):
    def test_exact_decision_join_never_prompt_mentions_or_time(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            decision = {'decision_id': 'd1', 'fingerprint': json.dumps({'run': RUN})}
            put(d / 'decisions.jsonl', decision)
            rows = [{'decision_id': 'unmatched', 'request': {'state': RUN}, 'ts': 'same'},
                    {'decision_id': 'd1', 'run_id': None, 'request': {'state': OTHER}},
                    {'run_id': OTHER, 'request': {'state': RUN}},
                    {'run_id': RUN, 'fingerprint': json.dumps({'run': OTHER}), 'decision_id': 'd1'}]
            source = d / 'jev-prompts.jsonl'
            source.write_bytes(b''.join(map(raw, rows)))
            index, origin = decision_index(d / 'decisions.jsonl', [RUN], (d / 'decisions.jsonl').stat().st_size)
            info = extract(source, d / 'out', [RUN], index=index)
            selected = list(map(json.loads, (d / 'out').read_text().splitlines()))
            self.assertEqual(info['counts'], {RUN: 1})
            self.assertEqual(selected[0]['row'], rows[1])
            self.assertEqual(selected[0]['identity']['status'], 'exact_decision_id')
            ref = selected[0]['identity']['decision_ref']
            self.assertEqual(ref['source_size'], origin['source_size'])
            self.assertEqual(ref['sha256'], hashlib.sha256(raw(decision)).hexdigest())
            self.assertEqual(info['identity_gaps'], {'unmatched_decision_id': 1, 'conflicting_run_fields': 1})
            self.assertEqual(selected[0]['source_size'], source.stat().st_size)
            self.assertIsNone(info['consumption_or_benefit'])

    def test_ambiguous_decision_identity_rejected_even_with_direct_run(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'decisions.jsonl'
            p.write_bytes(raw({'run_id': RUN, 'decision_id': 'd'}) + raw({'run_id': OTHER, 'decision_id': 'd'}))
            index, _ = decision_index(p, [RUN], p.stat().st_size)
            self.assertEqual(associate({'decision_id': 'd'}, index)[1]['status'], 'conflicting_decision_identity')
            self.assertIsNone(associate({'decision_id': 'd', 'run_id': RUN}, index)[0])
            with self.assertRaisesRegex(ValueError, 'index limit'):
                decision_index(p, [RUN], p.stat().st_size, max_entries=0)

    def test_historical_missing_streams_and_cutoff_partial(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            put(d / 'runs.jsonl', {'run_id': RUN, 'ended': '2020-01-01T00:00:00Z', 'character': 'SILENT'})
            put(d / 'decisions.jsonl', {'run_id': RUN})
            summary = summarize(d, [RUN])
            self.assertEqual(summary['runs'][RUN]['decision_count'], 1)
            self.assertNotIn('construction_log', summary['runs'][RUN])
            abandoned = raw({'run_id': RUN, 'entries': [{'action': '拿', 'cards': 'future'}], 'omitted': 0})
            restored = raw({'run_id': RUN, 'entries': [], 'omitted': 0})
            foreign = raw({'run_id': OTHER, 'entries': [RUN], 'omitted': 7})
            (d / 'construction-log.jsonl').write_bytes(abandoned + restored + foreign)
            latest = summarize(d, [RUN])['runs'][RUN]['construction_log']
            self.assertEqual((latest['entry_count'], latest['omitted']), (0, 0))
            self.assertEqual(latest['ref']['offset'], len(abandoned))
            self.assertEqual(latest['ref']['bytes'], len(restored))
            self.assertEqual(latest['ref']['sha256'], hashlib.sha256(restored).hexdigest())
            for s in ('jev-prompts', 'v6-build'):
                self.assertEqual(summary['runs'][RUN][s]['status'], 'missing')
                self.assertIsNone(summary['runs'][RUN][s]['count'])
            missing = extract(d / 'v6-build.jsonl', d / 'out', [RUN])
            self.assertEqual(missing['selection_status'][RUN], 'missing')
            source = d / 'v6-build.jsonl'
            first = raw({'run_id': RUN, 'question_id': 'q'})
            source.write_bytes(first * 3)
            m = extract(source, d / 'out', [RUN], source_size=len(first) * 2 - 2)
            self.assertEqual(m['counts'][RUN], 1)
            self.assertEqual(m['incomplete_lines'], 1)
            self.assertEqual(m['gap_refs'][0]['offset'], len(first))
            self.assertEqual(m['gap_refs'][0]['bytes'], len(first) - 2)
            self.assertEqual(m['gap_refs'][0]['sha256'], hashlib.sha256(first[:-2]).hexdigest())
            self.assertEqual(m['source_sha256'], hashlib.sha256(source.read_bytes()[:len(first)*2-2]).hexdigest())
            self.assertEqual(len((d / 'out').read_text().splitlines()), 1)
            self.assertEqual(summarize(d, [RUN])['runs'][RUN]['v6-build']['count'], 3)

    def test_real_evidence_cli_and_summary_keep_raw_rows(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            put(d / 'decisions.jsonl', {'run_id': RUN, 'decision_id': 'd'})
            put(d / 'jev-prompts.jsonl', {'decision_id': 'd', 'request': {'full': '完整题面'}, 'answers': {'x': 'a'}})
            put(d / 'v6-build.jsonl', {'run_id': RUN, 'question_id': 'q', 'unknown': {'count': 1}})
            output = d / 'output'
            command = [sys.executable, str(ROOT / 'learner/extract_evidence.py'), '--logs', str(d), '--output', str(output),
                       '--runs', RUN, '--streams', 'v6-build', 'jev-prompts', '--object-store', str(d / 'objects')]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = json.loads((output / 'evidence-manifest.json').read_text())
            self.assertEqual([m['counts'][RUN] for m in manifest], [1, 1])
            self.assertEqual(json.loads((output / 'jev-prompts.evidence.jsonl').read_text())['row']['request']['full'], '完整题面')
            result = subprocess.run([sys.executable, str(ROOT / 'learner/evidence_summary.py'), '--logs', str(d),
                                     '--runs', RUN, '--out', str(d / 'summary.json')], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads((d / 'summary.json').read_text())['runs'][RUN]['jev-prompts']['count'], 1)
            retain('evidence-cli', dict(argv=command, exit_code=result.returncode, manifest=manifest,
                summary=json.loads((d / 'summary.json').read_text()), fixed_inputs=True))


def fixture(root):
    b = root / 'knowledge/builders'
    b.mkdir(parents=True)
    for name in ('build-combo-metrics.py', 'combo_metrics.py', 'combo_pooled.py', 'combo_normalization.py', 'history_boundary.py', 'appearance_stats.py', 'incremental_evidence.py', 'combo-prerequisites.mts', 'check-v6-refresh.mts', 'build-v6-history.py', 'refresh-v6-history.py', 'refresh.sh', 'refresh-step.py', 'refresh_driver.py', 'refresh_publish.py', 'characters.py'):
        shutil.copy2(ROOT / 'knowledge/builders' / name, b / name)
    # Production Node CLI and schemas are used read-only; no copy of a checkout.
    (root / 'agent').symlink_to(ROOT / 'agent', target_is_directory=True)
    (root / 'learner').symlink_to(ROOT / 'learner', target_is_directory=True)
    (root / 'ops').mkdir()
    logs = root / 'logs'
    logs.mkdir()
    ended = '2020-01-01T00:10:00.000Z'
    ts = '2020-01-01T00:01:00.000Z'
    logs.joinpath('runs.jsonl').write_bytes(raw({'run_id': RUN, 'character': 'SILENT', 'ended': ended, 'ascension': 10, 'victory': False, 'code': 'fixture'})
        + raw({'run_id': OTHER, 'character': 'REGENT', 'ended': ended, 'ascension': 10, 'victory': True}))
    logs.joinpath('sl-attempts.jsonl').write_bytes(b'')
    logs.joinpath('decisions.jsonl').write_bytes(raw({'run_id': RUN, 'ts': ts, 'decision_id': 'd'}))
    state = {'ts': ts, 'state': {'run_id': RUN, 'screen': 'MAP', 'in_combat': False, 'turn': None,
        'run': {'character_id': 'SILENT', 'floor': 1, 'act_id': '0', 'current_hp': 20, 'max_hp': 50, 'gold': 10,
                'deck': [{'card_id': 'FIXTURE_CARD', 'upgraded': False}]}}}
    logs.joinpath('states.jsonl').write_bytes(raw(state))
    own = root / 'knowledge/characters/silent'
    sys.path.insert(0, str(ROOT / 'knowledge/builders'))
    from combo_metrics import METRICS
    stat = dict(n=0, unit='independent_run', method='synthetic missing observation', value=None, se=None,
                distribution=[], evidence=[], unknown_reason='no fixed observations', small_sample=True)
    metrics = [dict(attempt=a, target_ascension=10, sources=[],
                    raw_counts=dict(runs=0, formed_runs=0, cleared_runs=0, chain_reached=0, chain_won=0, bosses={}),
                    observed={k: stat for k in METRICS}, bosses={}, availability=[], simulation=[], regression=[], shrinkage=[])
               for a in ('first', 'including_sl')]
    obs = [dict(run_id=RUN, floor=1)]
    core = dict(schema='build-core-v1', direction='FIXTURE_DIRECTION', name='fixed parser fixture', status='candidate',
                scope=dict(character='silent', ascensions=[10]),
                card_pool=dict(FIXTURE_CARD=dict(roles=['fixture_role'], contribution='fixed parser fixture',
                    upgraded_matters=False, combos=['fixture_combo'], evidence=obs)),
                combos=[dict(id='fixture_combo', types=['common'], boss=None,
                    cards=[dict(id='FIXTURE_CARD', count=1, upgraded=False)], prerequisites=None, metrics=metrics,
                    fits=dict(bosses_positive=[], bosses_negative=[], routes=[], situations=[]), evidence=obs,
                    confidence='low', linked_experience=[])],
                pivot_signals=[], failure_modes=[], linked_experience=[], linked_reflex=[])
    put(own / 'build-cores.json', dict(schema='build-cores-v1', character='silent', entries=[core]))
    put(own / 'construction-opportunities.json', {'schema': 'construction-opportunities-v1', 'character': 'silent',
        'generated': ended, 'cutoff': ended, 'digest': 'a' * 64, 'rows': [], 'limitations': ['fixed empty observed opportunity table']})
    (own / 'v6-history.json').write_bytes(b'OLD_PACKET')
    regent = root / 'knowledge/characters/regent/v6-history.json'
    regent.parent.mkdir(parents=True)
    regent.write_bytes(b'REGENT_PACKET')
    return own / 'v6-history.json'


class RefreshTest(unittest.TestCase):
    def test_append_index_and_cache_invalidation_use_original_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            logs = root / 'logs'; logs.mkdir()
            path = logs / 'states.jsonl'
            first = raw(dict(run_id=RUN, value=1))
            second = raw(dict(run_id=OTHER, value=2))
            path.write_bytes(first)
            index = FrozenLogIndex(root / 'cache', logs)
            try:
                index.update('states', len(first))
                key = index.run_signature(RUN, ['states'])
                self.assertEqual(index.stats['decoded_rows'], 1)
                self.assertEqual(index.cached('fixed', key, lambda: [1]), [1])
                with path.open('ab') as out: out.write(second)
                index.update('states', path.stat().st_size)
                self.assertEqual(index.stats['decoded_rows'], 2)
                self.assertEqual(index.run_signature(RUN, ['states']), key)
                self.assertEqual(index.cached('fixed', key, lambda: self.fail('old run recomputed')), [1])
                with path.open('ab') as out: out.write(first)
                index.update('states', path.stat().st_size)
                self.assertNotEqual(index.run_signature(RUN, ['states']), key)
                # Equal-length in-place rewrites must invalidate the old index.
                path.write_bytes(path.read_bytes().replace(b'"value": 1', b'"value": 3'))
                index.update('states', path.stat().st_size)
                self.assertEqual(next(index.rows('states', [RUN]))[0]['value'], 3)
                before = index.metadata('states')
                with path.open('ab') as out: out.write(b'{partial')
                with self.assertRaisesRegex(ValueError, 'incomplete frozen'):
                    index.update('states', path.stat().st_size)
                self.assertEqual(index.metadata('states'), before)
                for entry in (root / 'cache/objects').rglob('*.gz'): entry.write_bytes(b'broken')
                self.assertEqual(index.cached('fixed', key, lambda: [4]), [4])
            finally:
                index.close()

    def test_warm_freeze_matches_full_and_only_new_run_misses(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); fixture(root)
            index = FrozenLogIndex(root / 'cache', root / 'logs')
            try:
                def freeze(name, cached):
                    directory = root / name; directory.mkdir()
                    receipt = {}
                    inputs, _ = refresh.freeze(root, 'silent', directory, '2020-01-02T00:00:00.000Z', receipt, cached)
                    return {key: Path(ref['path']).read_bytes().replace(str(directory).encode(), b'OUTPUT') if ref else None
                            for key, ref in inputs.items()}, receipt
                cold, _ = freeze('cold', index)
                decoded = index.stats['decoded_rows']; misses = index.stats['cache_misses']
                warm, _ = freeze('warm', index)
                full, _ = freeze('full', None)
                self.assertEqual(cold, warm)
                self.assertEqual(warm, full)
                self.assertEqual(index.stats['decoded_rows'], decoded)
                self.assertEqual(index.stats['cache_misses'], misses)
                new_run = 'CCCCCCCCCCCC'
                with (root / 'logs/runs.jsonl').open('ab') as out:
                    out.write(raw(dict(run_id=new_run, character='SILENT', ended='2020-01-01T00:10:00.000Z', ascension=10, victory=False)))
                row = json.loads((root / 'logs/states.jsonl').read_bytes())
                row['state']['run_id'] = new_run
                with (root / 'logs/states.jsonl').open('ab') as out: out.write(raw(row))
                incremental, receipt = freeze('incremental', index)
                full, _ = freeze('full-new', None)
                self.assertEqual(incremental, full)
                self.assertEqual(index.stats['decoded_rows'] - decoded, 2)
                self.assertEqual(index.stats['cache_misses'] - misses, 2)
                self.assertEqual(receipt['ended_runs'], [RUN, new_run])
            finally:
                index.close()

    def test_terminal_rows_share_inclusive_boundary_and_exact_source_exclusions(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            target = fixture(root)
            ended = '2020-01-01T00:10:00.000Z'
            later = '2020-01-01T00:16:04.176Z'
            states = root / 'logs/states.jsonl'
            state = json.loads(states.read_bytes())
            original = {}
            expected = []
            for name, row, reason in [('states', state, 'frame_after_run_end'),
                                     ('decisions', dict(run_id=RUN, decision_id='after'), 'decision_after_run_end')]:
                path = root / 'logs' / (name + '.jsonl')
                first = path.read_bytes()
                # An equivalent timezone spelling at the exact boundary is retained.
                equal = raw(dict(row, ts='2020-01-01T08:10:00.000+08:00'))
                after = raw(dict(row, ts=later))
                data = first + equal + after
                path.write_bytes(data)
                original[name] = data
                offset = len(first) + len(equal)
                expected.append(dict(source=str(path), source_size=len(data), line=3, offset=offset,
                    bytes=len(after), sha256=hashlib.sha256(after).hexdigest(), reason=reason,
                    run_id=RUN, ts=later, run_ended=ended,
                    byte_range=dict(start=offset, end_exclusive=offset + len(after))))
            receipt, code = refresh.refresh(root, root, 'silent')
            self.assertEqual(code, 0, receipt)
            actual = list(map(json.loads, Path(receipt['source_exclusions']['path']).read_bytes().splitlines()))
            self.assertEqual(actual, expected)
            self.assertEqual(receipt['excluded'], {'frame_after_run_end': 1, 'decision_after_run_end': 1})
            self.assertEqual(receipt['source_exclusions']['counts_by_stream'], {'states': 1, 'decisions': 1})
            refs = list(map(json.loads, Path(receipt['frame_sources']['path']).read_bytes().splitlines()))
            self.assertEqual(len(refs), 2)
            from combo_metrics import read_rows
            spec = importlib.util.spec_from_file_location('boundary_combo_cli', ROOT / 'knowledge/builders/build-combo-metrics.py')
            builder = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(builder)
            manifest = json.loads((Path(receipt['directory']) / 'logs.json').read_bytes())
            exclusions = builder.source_exclusions(manifest, root / 'logs', receipt['log_byte_limits'])
            for name, data in original.items():
                path = root / 'logs' / (name + '.jsonl')
                self.assertEqual(path.read_bytes(), data)
                rows = list(read_rows(path, len(data), exclusions=exclusions, terminal_ends={RUN: ended}))
                self.assertEqual(len(rows), 2)
                self.assertEqual(rows[-1][0]['ts'], '2020-01-01T08:10:00.000+08:00')
            self.assertEqual([c['id'] for c in json.loads(target.read_bytes())['data']['combo_metrics']], ['fixture_combo'])
            retain('terminal-boundary-exclusions', dict(exclusions=actual, **call_evidence(receipt)))

    def test_combo_reader_rejects_forged_terminal_boundary_proofs(self):
        from combo_metrics import read_rows
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'decisions.jsonl'
            ended = '2020-01-01T00:10:00.000Z'
            row = dict(run_id=RUN, ts='2020-01-01T00:10:00.001Z')
            data = raw(row)
            path.write_bytes(data)
            entry = dict(source_size=len(data), bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                reason='decision_after_run_end', run_id=RUN, ts=row['ts'], run_ended=ended)
            key = (str(path), 0)
            self.assertEqual(list(read_rows(path, len(data), exclusions={key: entry}, terminal_ends={RUN: ended})), [])
            for changed in [dict(run_id=OTHER), dict(ts=ended), dict(run_ended=row['ts']),
                            dict(reason='frame_after_run_end'), dict(reason='invalid_json')]:
                with self.subTest(changed=changed), self.assertRaisesRegex(ValueError, 'invalid run-end exclusion'):
                    list(read_rows(path, len(data), exclusions={key: dict(entry, **changed)}, terminal_ends={RUN: ended}))
            for ends in ({}, {RUN: row['ts']}):
                with self.subTest(ends=ends), self.assertRaisesRegex(ValueError, 'invalid run-end exclusion'):
                    list(read_rows(path, len(data), exclusions={key: entry}, terminal_ends=ends))

    def test_sl_terminal_guard_is_not_relaxed(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            target = fixture(root)
            put(root / 'logs/sl-attempts.jsonl', dict(run_id=RUN, ts='2020-01-01T00:10:00.001Z'))
            receipt, code = refresh.refresh(root, root, 'silent')
            self.assertEqual(code, 1)
            self.assertEqual(target.read_bytes(), b'OLD_PACKET')
            self.assertIn('SL summary after its recorded run end', receipt['error'])

    def test_both_real_generator_failures_keep_old_packet_and_original_error(self):
        for fail in ('combo-metrics', 'v6-history'):
            with self.subTest(fail=fail), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                old = fixture(root)
                def runner(argv, **kwargs):
                    if ('build-combo-metrics.py' if fail == 'combo-metrics' else 'build-v6-history.py') in Path(argv[1]).name:
                        kwargs['stderr'].write(b'ORIGINAL_FIXED_FAILURE')
                        return subprocess.CompletedProcess(argv, 47)
                    return subprocess.run(argv, **kwargs)
                receipt, code = refresh.refresh(root, root, 'silent', runner)
                self.assertEqual(code, 1, receipt)
                self.assertEqual(old.read_bytes(), b'OLD_PACKET')
                self.assertIsNone(receipt['published'])
                self.assertEqual(receipt['steps'][-1]['exit_code'], 47)
                self.assertEqual(Path(receipt['steps'][-1]['stderr']['path']).read_bytes(), b'ORIGINAL_FIXED_FAILURE')
                self.assertEqual(len(list((root / 'ops/codex-ops/queue').glob('*-knowledge-refresh-failed.md'))), 1)
                retain(fail + '-failure', call_evidence(receipt))

    def test_real_generators_publish_only_own_ended_cut_and_keep_future_appends_out(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            target = fixture(root)
            def runner(argv, **kwargs):
                if 'build-combo-metrics.py' in Path(argv[1]).name:
                    self.assertEqual(argv[argv.index('--simulation') + 1], 'off')
                    # New ended run after freeze must not enter this packet or metrics.
                    with (root / 'logs/runs.jsonl').open('ab') as out:
                        out.write(raw({'run_id': 'CCCCCCCCCCCC', 'character': 'SILENT', 'ended': '2020-01-01T00:20:00.000Z',
                                       'victory': True, 'ascension': 10}))
                return subprocess.run(argv, **kwargs)
            receipt, code = refresh.refresh(root, root, 'silent', runner)
            self.assertEqual(code, 0, receipt)
            pack = json.loads(target.read_bytes())
            self.assertEqual([c['run_id'] for c in pack['data']['coverage']], [RUN])
            self.assertEqual([h['run'] for h in pack['data']['histories']], [RUN])
            self.assertEqual(pack['data']['combo_metrics'][0]['id'], 'fixture_combo')
            combo = json.loads((Path(receipt['directory']) / 'combo-metrics.json').read_bytes())
            self.assertEqual(combo['ended_runs'], [RUN])
            self.assertEqual(combo['simulation']['reason'], 'explicitly_disabled')
            self.assertEqual((root / 'knowledge/characters/regent/v6-history.json').read_bytes(), b'REGENT_PACKET')
            self.assertIsNone(receipt['production_consumption'])
            self.assertEqual(receipt['output']['sha256'], hashlib.sha256(target.read_bytes()).hexdigest())
            self.assertEqual(Path(receipt['rollback_copy']['path']).read_bytes(), b'OLD_PACKET')
            retain('frozen-refresh-cli', call_evidence(receipt))
            before = target.read_bytes()
            self.assertEqual(refresh.refresh(root, root, 'regent')[0]['status'], 'unchanged_other_character')
            self.assertEqual(target.read_bytes(), before)

    def test_malformed_rows_are_fully_excluded_without_changing_original_logs(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            target = fixture(root)
            original = {}
            expected = []
            for stream in refresh.STREAMS:
                path = root / 'logs' / (stream + '.jsonl')
                first = path.read_bytes()
                gaps = [b'{broken-' + str(i).encode() + b'\n' for i in range(7)] if stream == 'states' else [b'\xff\n']
                # A valid frame after the malformed rows must retain its original offset.
                data = first + b''.join(gaps) + (first if stream == 'states' else b'')
                path.write_bytes(data)
                original[stream] = data
                offset = len(first)
                for i, gap in enumerate(gaps):
                    expected.append(dict(source=str(path), source_size=len(data), line=first.count(b'\n') + i + 1,
                        offset=offset, bytes=len(gap), sha256=hashlib.sha256(gap).hexdigest(), reason='invalid_json',
                        byte_range=dict(start=offset, end_exclusive=offset + len(gap))))
                    offset += len(gap)
            receipt, code = refresh.refresh(root, root, 'silent')
            self.assertEqual(code, 0, receipt)
            manifest = receipt['source_exclusions']
            content = Path(manifest['path']).read_bytes()
            self.assertEqual(manifest['count'], 10)
            self.assertEqual(manifest['counts_by_stream'], {'runs': 1, 'sl-attempts': 1, 'states': 7, 'decisions': 1})
            self.assertEqual(manifest['sha256'], hashlib.sha256(content).hexdigest())
            actual = list(map(json.loads, content.splitlines()))
            self.assertEqual(sorted(actual, key=lambda r: (r['source'], r['offset'])),
                             sorted(expected, key=lambda r: (r['source'], r['offset'])))
            self.assertEqual(len(receipt['sources']['states']['gap_refs']), 5)
            for stream, data in original.items():
                self.assertEqual((root / 'logs' / (stream + '.jsonl')).read_bytes(), data)
                self.assertEqual(receipt['sources'][stream]['source_sha256'], hashlib.sha256(data).hexdigest())
            refs = list(map(json.loads, Path(receipt['frame_sources']['path']).read_bytes().splitlines()))
            self.assertEqual(len(refs), 2)
            self.assertEqual(refs[-1]['source']['offset'], len(original['states']) - refs[-1]['source']['bytes'])
            pack = json.loads(target.read_bytes())
            self.assertEqual([c['id'] for c in pack['data']['combo_metrics']], ['fixture_combo'])
            self.assertEqual([c['run_id'] for c in pack['data']['coverage']], [RUN])
            report = json.loads((Path(receipt['directory']) / 'combo-metrics.json').read_bytes())
            self.assertEqual(report['inputs']['source_exclusions'], manifest)
            self.assertEqual((root / 'knowledge/characters/regent/v6-history.json').read_bytes(), b'REGENT_PACKET')
            retain('malformed-row-exclusions', dict(exclusions=actual, **call_evidence(receipt)))

    def test_excluded_row_or_manifest_mutation_keeps_previous_packet(self):
        for case in ('raw_row', 'manifest'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                target = fixture(root)
                states = root / 'logs/states.jsonl'
                with states.open('ab') as out:
                    out.write(b'{broken-0\n')
                def runner(argv, **kwargs):
                    if case == 'manifest' and 'build-combo-metrics.py' in Path(argv[1]).name:
                        manifest = json.loads(Path(argv[argv.index('--manifest') + 1]).read_bytes())
                        Path(manifest['source_exclusions']['path']).write_bytes(b'')
                    result = subprocess.run(argv, **kwargs)
                    if case == 'raw_row' and 'build-v6-history.py' in Path(argv[1]).name:
                        states.write_bytes(states.read_bytes().replace(b'{broken-0', b'{broken-1'))
                    return result
                receipt, code = refresh.refresh(root, root, 'silent', runner)
                self.assertEqual(code, 1, receipt)
                self.assertEqual(target.read_bytes(), b'OLD_PACKET')
                self.assertIsNone(receipt['published'])
                if case == 'raw_row':
                    self.assertIn('frozen source changed', receipt['error'])
                else:
                    step = receipt['steps'][-1]
                    self.assertEqual(step['name'], 'combo-metrics')
                    self.assertIn('source exclusion manifest SHA/size mismatch', Path(step['stderr']['path']).read_text())

    def test_combo_reader_requires_exact_explicit_malformed_row_exclusion(self):
        sys.path.insert(0, str(ROOT / 'knowledge/builders'))
        from combo_metrics import read_rows
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'states.jsonl'
            data = b'{broken-0\n'
            path.write_bytes(data)
            key = (str(path.resolve()), 0)
            entry = dict(source_size=len(data), bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            with self.assertRaisesRegex(ValueError, 'unlisted or changed'):
                list(read_rows(path, len(data)))
            self.assertEqual(list(read_rows(path, len(data), exclusions={key: entry})), [])
            for field, value in [('sha256', '0' * 64), ('bytes', len(data) - 1), ('source_size', len(data) + 1)]:
                with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'unlisted or changed'):
                    list(read_rows(path, len(data), exclusions={key: dict(entry, **{field: value})}))
            path.write_bytes(b'{}\n')
            with self.assertRaisesRegex(ValueError, 'excluded row is valid'):
                list(read_rows(path, 3, exclusions={key: dict(source_size=3, bytes=3, sha256=hashlib.sha256(b'{}\n').hexdigest())}))

    def test_no_core_and_missing_or_truncated_logs_are_explicit(self):
        for case in ('no_core', 'empty_core', 'missing', 'partial', 'foreign_state'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                target = fixture(root)
                if case == 'no_core':
                    (target.parent / 'build-cores.json').unlink()
                elif case == 'empty_core':
                    put(target.parent / 'build-cores.json', dict(schema='build-cores-v1', character='silent', entries=[]))
                elif case == 'missing':
                    (root / 'logs/states.jsonl').unlink()
                elif case == 'partial':
                    with (root / 'logs/states.jsonl').open('ab') as out:
                        out.write(b'{"state":')
                else:
                    state = json.loads((root / 'logs/states.jsonl').read_bytes())
                    state['state']['run']['character_id'] = 'REGENT'
                    put(root / 'logs/states.jsonl', state)
                receipt, code = refresh.refresh(root, root, 'silent')
                if case in ('no_core', 'empty_core'):
                    self.assertEqual(code, 0, receipt)
                    self.assertEqual(receipt['combo_metrics']['status'], 'unavailable')
                    self.assertEqual(json.loads(target.read_bytes())['data']['combo_metrics'], [])
                else:
                    self.assertEqual(code, 1)
                    self.assertEqual(target.read_bytes(), b'OLD_PACKET')

    def test_frozen_prefix_mutation_and_bad_formal_core_keep_old_packet(self):
        for case in ('mutation', 'bad_core'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                target = fixture(root)
                if case == 'bad_core':
                    put(target.parent / 'build-cores.json', {'schema': 'build-cores-v1', 'character': 'regent', 'entries': []})
                def runner(argv, **kwargs):
                    result = subprocess.run(argv, **kwargs)
                    if case == 'mutation' and 'build-v6-history.py' in Path(argv[1]).name:
                        states = root / 'logs/states.jsonl'
                        states.write_bytes(states.read_bytes().replace(b'"gold": 10', b'"gold": 11'))
                    return result
                receipt, code = refresh.refresh(root, root, 'silent', runner)
                self.assertEqual(code, 1, receipt)
                self.assertEqual(target.read_bytes(), b'OLD_PACKET')
                self.assertIsNone(receipt['published'])
                if case == 'mutation':
                    self.assertIn('frozen source changed', receipt['error'])
                else:
                    self.assertEqual(receipt['steps'][-1]['name'], 'validate-cores')

    def test_real_report_to_shell_entry_routes_to_same_helper(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            target = fixture(root)
            # Stub unrelated historical refresh steps; execute the real shell and V6 helper/CLIs.
            b = root / 'knowledge/builders'
            for name in ('build-monster-db.py', 'monster-db-check.py', 'build-card-upgrades.py', 'build-outcome-stats.py',
                         'build-construction-opportunities.py', 'build-room-costs.py', 'build-boss-damage.py', 'build-catalog.py', 'build-fight-value.py'):
                (b / name).write_text('pass\n')
            potion = b / 'refresh-potion-equivalents.sh'
            potion.write_text('#!/bin/sh\nexit 0\n')
            potion.chmod(0o755)
            py = root / 'data/logdb-venv/bin/python'
            py.parent.mkdir(parents=True)
            # Unrelated legacy sync must never follow the agent symlink to real logs.
            py.write_text('#!/bin/sh\nexit 0\n')
            py.chmod(0o755)
            (root / 'ops/refresh.log').touch()
            # Read only the entry function's AST to avoid report module's real project globals/logs.
            import ast
            tree = ast.parse((ROOT / 'ops/report.py').read_text())
            fun = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'refresh_knowledge')
            import re, shlex
            namespace = dict(ROOT=str(root), LIVE=str(root), os=os, re=re, shlex=shlex, json=json)
            exec(compile(ast.Module(body=[fun], type_ignores=[]), '<real report.refresh_knowledge>', 'exec'), namespace)
            original = subprocess.Popen
            spawned = []
            from types import SimpleNamespace
            from unittest.mock import Mock
            waits = []
            def popen(argv, **kw):
                if '--fight-value' in argv[-1]:
                    argv = [sys.executable, '-c', 'pass']
                child = original(argv, **kw)
                spawned.append(child)
                wait = Mock(side_effect=AssertionError('admission waited for refresh'))
                waits.append(wait)
                return SimpleNamespace(pid=child.pid, wait=wait)
            with patch.dict(os.environ, {'REFRESH_WAIT': '1', 'REFRESH_WAIT_S': '60'}), patch.object(subprocess, 'Popen', popen):
                result = namespace['refresh_knowledge']('silent')
            self.assertTrue(all(wait.call_count == 0 for wait in waits))
            for child in spawned:
                child.wait(timeout=60)
            self.assertIsNone(result['exit'])
            self.assertEqual(result['status'], 'background')
            self.assertFalse(result['admission_wait'])
            cycles = [json.loads(line) for line in (root/'ops/refresh-timing.jsonl').read_text().splitlines()
                      if json.loads(line)['schema'] == 'knowledge-refresh-cycle-v1']
            self.assertEqual(len(cycles), 1)
            self.assertEqual(cycles[0]['origin_pid'], result['pid'])
            self.assertTrue(cycles[0]['cycle'])
            self.assertGreaterEqual(cycles[0]['wall_seconds'], cycles[0]['seconds'])
            publications = [json.loads(line) for line in (root/'ops/refresh-publication-timing.jsonl').read_text().splitlines()]
            self.assertEqual({row['cycle'] for row in publications}, {cycles[0]['cycle']})
            self.assertEqual(json.loads(target.read_bytes())['data']['character'], 'silent')
            receipts = list((root / 'ops/codex-ops/v6-refresh/silent').glob('*/receipt.json'))
            self.assertEqual(len(receipts), 1)
            self.assertEqual([s['exit_code'] for s in json.loads(receipts[0].read_text())['steps']], [0, 0, 0, 0])
            retain('report-shell-entry', dict(report_result=result, refresh_log=(root / 'ops/refresh.log').read_text(),
                **call_evidence(json.loads(receipts[0].read_text()))))


if __name__ == '__main__':
    unittest.main()
