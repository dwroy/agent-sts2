"""Anonymous fixed data only: no production tick, network, model, game or database."""
import copy
import gzip
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import external_stock as stock
import external_stock_source as data
import external_stock_cli as cli
import strategy_external_jobs as external
import strategy_backfill_jobs as shared
import test_strategy_external as external_fixture
import test_strategy_backfill as backfill_fixture
from test_strategy_backfill import STAMP


class Stock(unittest.TestCase):
    ref = backfill_fixture.Backfill.ref
    save_report = backfill_fixture.Backfill.save_report
    quota = external_fixture.External.quota
    save_config = external_fixture.External.save_config
    freeze = external_fixture.External.freeze
    dispatch = external_fixture.External.dispatch
    not_started = external_fixture.External.not_started
    retire_native = external_fixture.External.retire_native

    def setUp(self):
        external_fixture.External.setUp(self)
        self.config['plans'] = []
        self.save_config()
        self.rows = [self.row(i) for i in range(240)]
        self.configure(self.rows)

    def row(self, i, version='v0.111'):
        return dict(content_sha256=data.fingerprint(['anonymous', i]), version=version, build=version + '.0', win=i % 2,
            cluster=i % 4, window=[1, 2], terminal_deck={'FIXED_CARD': 1}, terminal_relics=[],
            timeline=[[1, 1, 1, [['monster', 'ENCOUNTER.FIXED', 2]], 50, 70, 0, 0, 0, [], [], [], [], [], [], [], [], False],
                      [2, 1 + i % 3, 2, [['boss', 'ENCOUNTER.FIXED', 3]], 20, 70, 30, 0, 0, [], [], [], [], [], [], [], [], False]])

    def configure(self, rows, legacy=()):
        refs = []
        for row in rows:
            key = data.record_key(row)
            artifact = data.immutable(self.root, 'data/external/stock/' + key + '.json', data.canonical(row))
            refs.append(dict(key=key, artifact=artifact, version=row['version'], build=row['build'], cluster=row['cluster'], win=row['win'],
                last_act=row['timeline'][-1][1], nodes=len(row['timeline']), content_sha256=row['content_sha256'], legacy_reserved=key in legacy))
        self.source = dict(schema=data.SCHEMA, source=data.SOURCE, character='silent', ascension=10, task_type=data.TASK,
            columns=data.COLUMNS, records=refs, contracts=[self.ref('frozen/contract.md', '冻结知识合同')],
            provenance=self.manifest['provenance'], cohorts={v: {'n': sum(r['version'] == v for r in rows)} for v in {r['version'] for r in rows}})
        self.cfg = dict(schema=data.SCHEMA, character='silent', task_type=data.TASK, enabled=True, hold=False,
            catalog=self.ref('frozen/catalog.json', self.source), target_records=40, ready_floor=3,
            max_input_bytes=256000, context_input_bytes=128000, max_page_bytes=24000, legacy_plans=stock.legacy_plans(self.root))
        self.save_control()

    def save_control(self):
        (self.root / stock.CONTROL).write_text(json.dumps(self.cfg))

    def writer(self, *args, **kwargs):
        self.tree = self.root / '.worktrees' / ('codex-strategy-silent-' + args[9])
        return backfill_fixture.Backfill.writer(self, *args, **kwargs)

    def maintain(self, **kwargs):
        return stock.maintain(self.state, self.root, lambda pid: pid == 10, **kwargs)

    def register(self, stamp=STAMP):
        self.maintain()
        result = self.dispatch(stamp=stamp, alive=lambda pid: pid == 10)
        self.assertIsNotNone(result)
        self.bid = result[0]; self.batch = self.state['batches'][self.bid]
        (self.directory / 'learn.json').write_text(json.dumps(self.state))
        return self.batch

    def native(self):
        plan = self.batch['external_source']
        marker = '[learner fixed stock]'
        prompt = marker + '\n' + self.bid + ' ' + plan + ' ' + self.batch['external_binding']['input_manifest']['sha256']
        rows = [dict(type='session_meta', payload=dict(id='stock-session', cwd=str(self.tree))),
            dict(type='event_msg', timestamp='2026-01-01T00:00:00Z', payload=dict(type='task_started', turn_id='stock-turn')),
            dict(type='turn_context', payload=dict(turn_id='stock-turn', cwd=str(self.tree), model='gpt-6.1-sol', effort='high', sandbox_policy=dict(type='workspace-write'))),
            dict(type='event_msg', payload=dict(type='user_message', message=prompt))]
        self.rollout = self.directory / 'stock-native.jsonl'
        self.rollout.write_text(''.join(json.dumps(r) + '\n' for r in rows))
        proof = dict(marker=marker, prompt_sha256=shared.digest(prompt.encode()))
        receipt = dict(label='learner-' + self.bid, pane='w1:p2', cwd=str(self.tree), session='stock-session', submitted=True,
            bindings=[dict(**proof, turn_id='stock-turn')], submissions=[proof], rollout=str(self.rollout))
        (self.directory / 'learner' / ('learner-' + self.bid + '.tui.json')).write_text(json.dumps(receipt))
        return rows

    def report(self, read=True):
        self.tree.mkdir(parents=True, exist_ok=True)
        scratch = self.tree / 'learner/runs/fixed'; scratch.mkdir(parents=True, exist_ok=True)
        refs = self.batch['external_binding']['stock']['records']
        report = dict(task='strategy-proposal', character='silent', batch=self.bid, base=self.base,
            runs=[], fixes=[], merged=None, tests=dict(tsc=None, vitest=None, cases=None),
            external_source=self.batch['external_source'], input_sha256=self.batch['external_binding']['input_manifest']['sha256'],
            report=str(scratch / 'report.md'), external_results=[dict(id=ident, state='waiting', reason='真实反证待提炼', destinations=[])
            for ident in self.batch['external_binding']['entry_ids']], external_reading=[dict(key=r['key'], status='read' if read else 'unread', reason='固定完整节点页') for r in refs])
        report['external_coverage'] = [dict(key=r['key'], state='pending', reason='固定证据尚待提炼', destinations=[]) for r in refs]
        Path(report['report']).write_text('```json\n' + json.dumps(report) + '\n```\n')
        return report

    def append_pages(self, *, event_type='response_item', turn=None, truncate=False, calls=True):
        rows = []
        if turn:
            rows.append(dict(type='event_msg', payload=dict(type='task_started', turn_id=turn)))
        for n, ref in enumerate(self.batch['external_binding']['stock']['records']):
            if calls:
                rows.append(dict(type='response_item', payload=dict(type='function_call', call_id=str(n), name='exec_command', arguments='fixed reader')))
            text = stock.page(self.root, self.bid, self.batch, ref['key']).decode()
            if truncate:
                text = text[:300] + '\n[truncated]'
            rows.append(dict(type=event_type, payload=dict(type='function_call_output', call_id=str(n), output=json.dumps(dict(output=text)))))
        with self.rollout.open('a') as stream:
            stream.write(''.join(json.dumps(r) + '\n' for r in rows))

    def test_exhausted_legacy_queue_refills_three_valid_plans_and_dispatches_once(self):
        before = (self.root / external.QUEUE).read_bytes()
        summary = self.maintain()
        self.assertEqual((summary['created'], summary['ready_plans'], summary['ready_records']), (3, 3, 120))
        self.assertEqual(summary['read_records'], 0)
        index = stock.load_index(self.root)
        for plan in index['plans']:
            binding, _ = external.source(self.root, plan)
            self.assertEqual(len(binding['stock']['records']), 40)
        self.assertIsNotNone(self.dispatch(alive=lambda pid: pid == 10))
        self.assertIsNone(self.dispatch(stamp='20260101-000002', alive=lambda pid: pid == 10))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual((self.root / external.QUEUE).read_bytes(), before)

    def test_restart_and_finish_refill_are_idempotent_and_next_window_is_disjoint(self):
        batch = self.register()
        first = {r['key'] for r in batch['external_binding']['stock']['records']}
        batch.update(state='done', rc=0, pid=None)
        self.not_started(self.bid, batch)
        self.state = json.loads(json.dumps(self.state))
        self.assertEqual(self.maintain()['created'], 1)
        raw = (self.directory / stock.INDEX).read_bytes()
        self.assertEqual(self.maintain()['created'], 0)
        self.assertEqual((self.directory / stock.INDEX).read_bytes(), raw)
        second = self.dispatch(stamp='20260101-000010', alive=lambda pid: pid == 10)
        self.assertIsNotNone(second)
        keys = {r['key'] for r in self.state['batches'][second[0]]['external_binding']['stock']['records']}
        self.assertFalse(first & keys)
        self.assertEqual(self.maintain()['read_records'], 0)

    def test_failed_and_unknown_native_lease_never_relearn_or_release_original(self):
        batch = self.register(); batch.update(state='failed', rc=1, pid=None)
        saved = copy.deepcopy(batch)
        summary = self.maintain()
        self.assertEqual(summary['stop_reason'], 'lane_owner')
        self.assertEqual(len(summary['workers']), 1)
        self.assertIsNone(self.dispatch(stamp='20260101-000010', alive=lambda pid: pid == 10))
        self.assertEqual(batch, saved)
        self.not_started(self.bid, batch)
        self.assertIsNotNone(self.dispatch(stamp='20260101-000011', alive=lambda pid: pid == 10))
        self.assertEqual(batch, saved)
        self.assertEqual(len(self.calls), 2)

    def test_hold_disable_and_publication_gate_leave_inventory_and_bindings_untouched(self):
        self.register(); raw = (self.directory / stock.INDEX).read_bytes(); batches = copy.deepcopy(self.state['batches'])
        for changes, reason in [({'hold': True}, 'hold'), ({'hold': False, 'enabled': False}, 'disabled')]:
            self.cfg.update(changes); self.save_control()
            self.assertEqual(self.maintain()['stop_reason'], reason)
            self.assertEqual(stock.overlay(self.root), [])
            self.assertIsNone(self.dispatch(stamp='20260101-000010'))
        self.cfg.update(hold=False, enabled=True); self.save_control()
        self.assertEqual(self.maintain(admission_reason='publication_hold')['stop_reason'], 'publication_hold')
        self.assertEqual(raw, (self.directory / stock.INDEX).read_bytes())
        self.assertEqual(batches, self.state['batches'])
        self.assertFalse(json.loads((self.root / stock.CONTROL).read_text())['hold'])

    def test_bytes_and_context_budget_split_whole_records_and_never_mix_versions(self):
        self.configure([self.row(i, 'v0.111' if i < 12 else 'v0.110') for i in range(70)])
        self.cfg.update(max_input_bytes=4000, context_input_bytes=2500); self.save_control()
        self.maintain()
        refs = []
        for plan in stock.overlay(self.root):
            binding, _ = external.source(self.root, plan)
            selected = stock.selected_records(self.root, binding['stock'])
            self.assertLess(len(selected), 40)
            self.assertLessEqual(len(data.canonical(selected)), 2500)
            self.assertEqual(len({r['version'] for r in selected}), 1)
            self.assertTrue(all(len(r['timeline']) == 2 for r in selected))
            refs += binding['stock']['records']
        self.assertEqual(len({r['key'] for r in refs}), len(refs))
        self.assertEqual(refs[0]['version'], 'v0.111')

    def test_complete_pages_in_original_native_tool_output_are_required(self):
        self.register(); self.native(); report = self.report()
        with self.assertRaisesRegex(ValueError, 'lacks complete'):
            shared.report_proof(report, self.batch, self.root)
        self.append_pages()
        proof = shared.report_proof(report, self.batch, self.root)
        self.assertEqual(len(proof['stock_reading']['read']), 40)
        self.batch.update(report=report, state='done', rc=0, pid=None, external_result=report['external_results'])
        summary = self.maintain()
        self.assertEqual(summary['read_records'], 40)
        self.assertEqual(summary['published_evidence_records'], 0)
        self.assertTrue(all(r['distillation'] == 'pending' for r in summary['coverage'].values()))
        self.batch['knowledge_publication'] = dict(version='K1-' + 'a' * 64)
        summary = self.maintain()
        self.assertEqual(summary['published_evidence_records'], 0)
        self.assertEqual(summary['published_batches'], 1)
        self.assertTrue(all(r['consumption'] == 'unknown' for r in summary['coverage'].values()))
        self.assertEqual(self.maintain()['read_records'], 40)

    def test_processed_counts_and_unread_reports_do_not_prove_reading(self):
        self.register(); self.native(); report = self.report(read=False)
        proof = shared.report_proof(report, self.batch, self.root)
        self.assertEqual(proof['stock_reading']['read'], [])
        self.batch.update(state='done', report=report, external_result=[dict(state='processed')], rc=0)
        self.state['strategy_external'] = dict(processed=10000)
        self.assertEqual(self.maintain()['read_records'], 0)

    def test_user_text_later_turn_truncation_and_unmatched_output_are_not_read_proof(self):
        self.register(); initial = self.native(); report = self.report()
        for kwargs in [dict(event_type='event_msg'), dict(turn='foreign-turn'), dict(truncate=True), dict(calls=False)]:
            self.rollout.write_text(''.join(json.dumps(r) + '\n' for r in initial))
            self.append_pages(**kwargs)
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                stock.reading_proof(self.root, self.bid, self.batch, report)

    def test_tampered_selected_record_and_aggregate_fail_original_validator(self):
        self.maintain(); plan = stock.overlay(self.root)[0]
        binding, _ = external.source(self.root, plan)
        ref = binding['stock']['records'][0]['artifact']
        (self.root / ref['path']).write_text('{}')
        with self.assertRaises(ValueError):
            external.source(self.root, plan)
        summary = self.maintain()
        self.assertEqual((summary['ready_plans'], len(summary['invalid_plans'])), (3, 1))
        self.assertEqual(summary['inventory_state'], 'source_invalid')
        self.assertIsNotNone(self.dispatch())  # An independent healthy sibling still uses its original source path.

    def test_quota_disk_exhaustion_and_missing_source_have_distinct_reasons(self):
        self.quota(95)
        self.assertEqual(self.maintain()['stop_reason'], 'ready')
        self.assertEqual(external.policy.snapshot(self.root, self.directory)['workers'], 3)
        self.assertNotIn('external_switch_requested', self.state)
        self.quota(); self.disk_mock.return_value.free = 1
        self.assertEqual(self.maintain()['stop_reason'], 'disk_capacity')
        self.disk_mock.return_value.free = 200 * (1 << 30)
        (self.root / self.cfg['catalog']['path']).unlink()
        self.assertEqual(self.maintain()['stop_reason'], 'source_missing')

    def test_legacy_scope_changes_block_stock_but_other_lanes_still_work(self):
        self.maintain()
        self.plan['lane'] = 'B'; self.config['plans'] = [self.plan]; self.save_config()
        self.assertEqual(self.maintain()['stop_reason'], 'ready')
        self.config['plans'].append({**self.plan, 'plan_id': 'new-unknown-a', 'lane': 'A'}); self.save_config()
        self.assertEqual(self.maintain()['stop_reason'], 'source_invalid')
        # The dispatcher must not expose old generated plans while the coverage baseline is unknown.
        self.assertEqual(stock.overlay(self.root), [])

    def test_catalog_duplicate_identity_rejected_and_legacy_reservations_not_counted_read(self):
        self.configure(self.rows[:5], legacy={data.record_key(r) for r in self.rows[:5]})
        summary = self.maintain()
        self.assertEqual((summary['ready_plans'], summary['read_records'], summary['legacy_reserved_records']), (0, 0, 5))
        self.assertEqual(summary['stop_reason'], 'data_exhausted')
        self.source['records'].append(self.source['records'][0])
        self.cfg['catalog'] = self.ref('frozen/catalog.json', self.source); self.save_control()
        self.assertEqual(self.maintain()['stop_reason'], 'source_invalid')

    def test_reader_is_bound_and_preserves_complete_node_page(self):
        self.register()
        args = type('Args', (), dict(root=self.root, batch=self.bid, plan=self.batch['external_source'],
                                   key=self.batch['external_binding']['stock']['records'][0]['key']))()
        result = json.loads(cli.read(args))
        self.assertEqual(len(result['record']['timeline']), 2)
        self.cfg['hold'] = True; self.save_control()
        with self.assertRaisesRegex(ValueError, 'held'):
            cli.read(args)


    def source_package(self, count=20):
        cache = []
        for i in range(count):
            row = self.row(i)
            points = []
            for p in row['timeline']:
                points.append(dict(node=p[0], act=p[1], point=p[2], rooms=[dict(kind=r[0], id=r[1], turns=r[2]) for r in p[3]],
                    hp=p[4], max_hp=p[5], damage=p[6], healed=p[7], gold_spent=p[8], choices=[], gained=[], removed=[],
                    transformed=[], upgraded=[], relic_picks=[], bought_relics=[], removed_relics=[]))
            value = dict(version='v0.111', build='v0.111.0', win=i % 2, deck=[dict(id='FIXED_CARD', added=i)], relics=[], nodes=points)
            value['content_sha256'] = data.fingerprint(value); cache.append(value)
        compressed = gzip.compress(data.canonical(cache), mtime=0)
        cache_ref = data.immutable(self.root, 'data/external/safe/runs.json.gz', compressed)
        package = dict(source=data.SOURCE, character='silent', ascension=10, player_identifiers_read=False, design='observational',
            provenance=self.manifest['provenance'], query_sha256='e' * 64, projection_code_sha256='f' * 64,
            model=dict(vocabulary={'FIXED_CARD': 1}, centers=[{'FIXED_CARD': 1}]), cohorts={'v0.111': {'n': count}}, limitations=['固定代理缺口'])
        receipt = dict(input=dict(database=dict(sha256='d' * 64), query_sha256='e' * 64, projection_code_sha256='f' * 64), cache_sha256=shared.digest(compressed))
        receipt_ref = self.ref('data/external/safe/receipt.json', receipt)
        examples = dict(provenance=package['provenance'], columns=data.COLUMNS, clusters=[dict(cluster=0, pairs=[dict(examples=[dict(
            safe_projection_sha256=c['content_sha256'], version=c['version'], win=c['win'], terminal_deck={'FIXED_CARD': 1}, terminal_relics=[],
            timeline=self.row(i)['timeline']) for i, c in enumerate(cache[:2])])])])
        package_files = {name: self.ref('frozen/package/' + name, value) for name, value in [('archetypes.json', package), ('representative-timelines.json', examples)]}
        manifest = dict(source=data.SOURCE, files={name: {k: v for k, v in ref.items() if k != 'path'} for name, ref in package_files.items()})
        package_ref = self.ref('frozen/package/manifest.json', manifest)
        return package_ref, receipt_ref, cache_ref, package, cache

    def test_import_only_existing_safe_cache_pins_contracts_and_reserves_old_representatives(self):
        package, receipt, cache, _, _ = self.source_package()
        contracts = [self.ref('docs/fixed-contract.md', '固定知识发布契约')]
        imported = data.import_catalog(self.root, package, contracts, 'data/external/catalog', receipt_ref=receipt, cache_ref=cache)
        catalog = json.loads(shared.artifact(self.root, imported))
        self.assertEqual(len(catalog['records']), 20)
        self.assertEqual(sum(r['legacy_reserved'] for r in catalog['records']), 2)
        self.assertEqual(len({r['key'] for r in catalog['records']}), 20)
        (self.root / contracts[0]['path']).write_text('later docs version')
        self.assertEqual(shared.artifact(self.root, catalog['contracts'][0]), '固定知识发布契约'.encode())
        # Re-importing the same bytes is idempotent; the old source is never regenerated.
        again = data.import_catalog(self.root, package, catalog['contracts'], 'data/external/catalog', receipt_ref=receipt, cache_ref=cache)
        self.assertEqual(imported, again)

    def test_cache_hash_origin_extra_fields_and_record_privacy_reject(self):
        package, receipt_ref, cache_ref, body, cache = self.source_package()
        wrong = {**cache_ref, 'sha256': '0' * 64}
        with self.assertRaises(ValueError):
            list(data.cached_records(self.root, receipt_ref, wrong, body))
        body['query_sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            list(data.cached_records(self.root, receipt_ref, cache_ref, body))
        body['query_sha256'] = 'e' * 64
        cache[0]['nodes'][0]['player_id'] = 'synthetic-forbidden'
        cache[0]['content_sha256'] = data.fingerprint({k: v for k, v in cache[0].items() if k != 'content_sha256'})
        raw = gzip.compress(data.canonical(cache), mtime=0)
        new_cache = data.immutable(self.root, 'data/external/unsafe/runs.json.gz', raw)
        receipt = json.loads(shared.artifact(self.root, receipt_ref)); receipt['cache_sha256'] = shared.digest(raw)
        new_receipt = self.ref('data/external/unsafe/receipt.json', receipt)
        with self.assertRaisesRegex(ValueError, 'non-projected'):
            list(data.cached_records(self.root, new_receipt, new_cache, body))
        row = self.row(100); row['terminal_deck'] = {'private@example.invalid': 1}
        with self.assertRaises(ValueError):
            data.validate_record(row)

    def test_exact_extraction_links_are_needed_before_counting_published_evidence(self):
        self.register(); self.native(); self.append_pages(); report = self.report()
        selected = self.batch['external_binding']['stock']['records'][0]
        path = Path(report['report']).parent / 'candidate.json'
        path.write_text(json.dumps(dict(source_window=selected['key'], formal_publication='pending')))
        target = dict(kind='knowledge', id='fixed-entry', path=str(path))
        report['external_results'][0].update(state='processed', destinations=[target])
        report['external_coverage'][0].update(state='candidate', destinations=[target])
        Path(report['report']).write_text('```json\n' + json.dumps(report) + '\n```\n')
        shared.report_proof(report, self.batch, self.root)
        candidate = Path(report['report']).parent / 'runtime-candidate.json'
        raw = data.canonical(dict(id=self.bid, files={'characters/silent/fixed.json': path.read_text()}))
        candidate.write_bytes(raw)
        report['knowledge_candidate'] = str(candidate)
        # Recompute the bound report proof after adding the original runtime candidate.
        Path(report['report']).write_text('```json\n' + json.dumps(report) + '\n```\n')
        shared.report_proof(report, self.batch, self.root)
        self.batch.update(report=report, external_result=report['external_results'], state='done', rc=0,
                          knowledge_publication=dict(version='K1-' + 'b' * 64, candidate_sha256=shared.digest(raw)))
        summary = self.maintain()
        self.assertEqual((summary['read_records'], summary['published_evidence_records'], summary['published_batches']), (40, 1, 1))
        path.write_text('{"source_window":"wrong"}')
        with self.assertRaisesRegex(ValueError, 'provenance'):
            stock.reading_proof(self.root, self.bid, self.batch, report)

    def test_low_inventory_original_tick_hook_preserves_own_and_other_lane_work(self):
        import learner_jobs as jobs
        with patch.object(stock, 'maintain', wraps=stock.maintain) as replenish, \
             patch.object(jobs.publication_gate, 'learners_held', return_value=True):
            result = jobs.check_jobs(self.state, str(self.root), str(Path(__file__).resolve().parents[1]), 'silent', lambda pid: False, STAMP)
            self.assertTrue(result['admission_hold'])
            self.assertEqual(replenish.call_count, 1)
            self.assertEqual(self.state['external_stock']['stop_reason'], 'publication_hold')
        self.assertFalse((self.directory / stock.INDEX).exists())


    def test_original_finish_callback_keeps_content_only_and_duplicate_callback_does_not_replenish_twice(self):
        import importlib.util
        import learner_checks as checks
        import proposal_dispatch as proposals
        from types import SimpleNamespace
        self.register(); self.native(); self.append_pages(); report = self.report()
        output = self.directory / 'learner' / (self.bid + '.out')
        output.write_text('```json\n' + json.dumps(report) + '\n```\n')
        spec = importlib.util.spec_from_file_location('stock_fixed_tick', Path(__file__).resolve().parents[1] / 'codex-ops-learn.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        events = []
        with patch.object(module, 'ROOT', str(self.root)), patch.object(module, 'DIR', str(self.directory)), \
             patch.object(module, 'load_state', return_value=self.state), patch.object(module, 'save_state'), \
             patch.object(module, 'account_draining', return_value=False), patch.object(module, 'enqueue', side_effect=lambda *a: events.append(a)), \
             patch.object(module, 'inbox'), patch.object(checks, 'proposal_tools', return_value=proposals), \
             patch.object(proposals.subprocess, 'check_output', side_effect=[self.base + '\n', '']), \
             patch.object(stock, 'maintain', wraps=stock.maintain) as refill:
            self.assertEqual(module.cmd_finish(SimpleNamespace(batch=self.bid, rc=0, character='silent')), 0)
            self.assertEqual(self.batch['state'], 'done')
            self.assertNotIn('knowledge_publication', self.batch)
            self.assertEqual(self.state['external_stock']['read_records'], 40)
            self.assertEqual(refill.call_count, 1)
            before = (self.directory / stock.INDEX).read_bytes()
            self.assertEqual(module.cmd_finish(SimpleNamespace(batch=self.bid, rc=0, character='silent')), 0)
            self.assertEqual(refill.call_count, 1)
            self.assertEqual((self.directory / stock.INDEX).read_bytes(), before)
        self.assertNotIn('checks_pending', self.batch)


    def test_disabled_original_queue_and_non_silent_tick_do_not_refill(self):
        self.config['enabled'] = False; self.save_config()
        self.assertEqual(self.maintain()['stop_reason'], 'queue_disabled')
        self.assertFalse((self.directory / stock.INDEX).exists())
        import learner_jobs as jobs
        self.state.pop('external_stock', None)
        with patch.object(stock, 'maintain') as replenish, patch.object(jobs.publication_gate, 'learners_held', return_value=True):
            jobs.check_jobs(self.state, str(self.root), str(Path(__file__).resolve().parents[1]), 'ironclad', lambda pid: False, STAMP)
            replenish.assert_not_called()
        self.assertNotIn('external_stock', self.state)

    def test_aligned_own_failure_priority_keeps_unknown_version_and_separate_denominator(self):
        package_ref, receipt, cache, body, _ = self.source_package()
        body['model']['sha256'] = '1' * 64
        self.ref('frozen/package/archetypes.json', body)
        # Refresh the package's frozen file reference after adding the synthetic model identity.
        manifest = json.loads(shared.artifact(self.root, package_ref))
        manifest['files']['archetypes.json'] = {k: v for k, v in self.ref('frozen/package/archetypes.json', body).items() if k != 'path'}
        package_ref = self.ref('frozen/package/manifest.json', manifest)
        own = dict(source='self:agent-sts2', character='silent', game_version='unknown',
            external_pin=dict(manifest_sha256=package_ref['sha256'], model_sha256='1' * 64),
            rows=[dict(ascension=10, cluster=0, victory=False), dict(ascension=9, cluster=1, victory=False)])
        own_ref = self.ref('frozen/own-index.json', own)
        result = data.import_catalog(self.root, package_ref, body.get('contracts', self.source['contracts']), 'data/external/with-own',
            receipt_ref=receipt, cache_ref=cache, own_index_ref=own_ref)
        cat = json.loads(shared.artifact(self.root, result))
        gap = json.loads(shared.artifact(self.root, cat['failure_gap']))
        self.assertEqual(gap['game_version'], 'unknown')
        self.assertEqual(gap['observed_failures_by_cluster'], {'0': 1})
        self.assertEqual(gap['external_denominator_contribution'], 0)
        own['external_pin']['model_sha256'] = '2' * 64
        with self.assertRaises(ValueError):
            data.import_catalog(self.root, package_ref, self.source['contracts'], 'data/external/wrong-own',
                receipt_ref=receipt, cache_ref=cache, own_index_ref=self.ref('frozen/wrong-own.json', own))

    def test_explicit_blocked_records_are_preserved_and_not_exposed_as_ready(self):
        self.maintain(); index = stock.load_index(self.root)
        blocked = index['selections'][index['plans'][0]['plan_id']][0]['key']
        self.cfg['blocked_records'] = [dict(key=blocked, reason='explicit operator hold')]; self.save_control()
        summary = self.maintain()
        self.assertEqual(summary['ready_plans'], 3)
        self.assertNotIn(index['plans'][0], stock.overlay(self.root))
        self.assertEqual(json.loads((self.root / stock.CONTROL).read_text())['blocked_records'][0]['key'], blocked)


    def test_loss_of_original_inventory_never_reallocates_registered_windows(self):
        batch = self.register(); saved = copy.deepcopy(batch)
        (self.directory / stock.INDEX).unlink()
        summary = self.maintain()
        self.assertEqual(summary['stop_reason'], 'source_invalid')
        self.assertIn('inventory missing', summary['error'])
        self.assertEqual(batch, saved)
        self.assertIsNone(self.dispatch(stamp='20260101-000010', alive=lambda pid: pid == 10))


    def test_complete_page_survives_native_code_mode_tool_result_envelope(self):
        self.register(); self.native(); self.append_pages(); report = self.report()
        rows = [json.loads(line) for line in self.rollout.read_text().splitlines()]
        for event in rows:
            if event.get('payload', {}).get('type') == 'function_call_output':
                event['payload']['output'] = 'Script completed\nWall time: 0.1 seconds\nOutput:\n' + event['payload']['output']
        self.rollout.write_text(''.join(json.dumps(r) + '\n' for r in rows))
        proof = stock.reading_proof(self.root, self.bid, self.batch, report)
        self.assertEqual(len(proof['read']), 40)


    def test_unconfigured_stock_keeps_original_scheduler_state_read_only(self):
        (self.root / stock.CONTROL).unlink()
        before = copy.deepcopy(self.state)
        self.assertEqual(self.maintain()['stop_reason'], 'not_configured')
        self.assertEqual(self.state, before)

    def test_single_unit_never_pools_two_builds_of_one_major_version(self):
        rows = [self.row(i) for i in range(70)]
        for i, row in enumerate(rows[12:]):
            row['build'] = 'v0.111.1'
            row['content_sha256'] = data.fingerprint(['anonymous-patch', i])
        self.configure(rows); self.maintain()
        sizes = []
        for plan in stock.overlay(self.root):
            binding, _ = external.source(self.root, plan)
            selected = stock.selected_records(self.root, binding['stock'])
            self.assertEqual(len({r['build'] for r in selected}), 1)
            sizes.append(len(selected))
        self.assertEqual(sizes[0], 12)  # Current build is not padded with the next build.

    def test_raw_database_name_is_rejected_before_any_source_bytes_are_read(self):
        (self.root / stock.CONTROL).unlink()
        args = type('Args', (), dict(root=self.root, cache='data/external/public.db', cache_receipt='data/external/receipt.json'))()
        with patch.object(cli, 'ref', side_effect=AssertionError('must not open a raw database')):
            with self.assertRaisesRegex(ValueError, 'raw databases'):
                cli.prepare(args)


    def test_initial_legacy_manifest_windows_are_reserved_without_inventing_reading(self):
        self.manifest['cohorts'][0]['aggregates'] = [self.ref('frozen/old-whole-window.json', self.rows[23])]
        self.plan['input_manifest'] = self.ref('frozen/old-whole-manifest.json', self.manifest)
        self.plan['lane'] = 'A'; self.config['plans'] = [self.plan]; self.save_config()
        proof = stock.legacy_reservations(self.root, self.source, stock.legacy_plans(self.root))
        self.assertEqual(proof['reserved_keys'], [data.record_key(self.rows[23])])
        self.assertTrue(proof['reading'].startswith('unknown'))
        value = {k: v for k, v in self.rows[23].items() if k != 'content_sha256'}
        self.manifest['cohorts'][0]['aggregates'] = [self.ref('frozen/unknown-window.json', value)]
        self.plan['input_manifest'] = self.ref('frozen/unknown-manifest.json', self.manifest)
        with self.assertRaisesRegex(ValueError, 'stable content identity'):
            stock.legacy_reservations(self.root, self.source, [self.plan])


    def test_prepare_registers_existing_cache_once_without_starting_workers_or_changing_old_queue(self):
        package, receipt, cache, _, _ = self.source_package()
        (self.root / stock.CONTROL).unlink()
        before = (self.root / external.QUEUE).read_bytes()
        args = type('Args', (), dict(root=self.root, package_manifest=package['path'], cache=cache['path'],
            cache_receipt=receipt['path'], contract=['frozen/contract.md'], own_index='frozen/absent-own.json'))()
        result = cli.prepare(args)
        self.assertEqual((result['state'], result['workers_started']), ('registered', 0))
        cfg = stock.control(self.root)
        self.assertTrue(cfg['enabled'])
        self.assertIn('legacy_scope', cfg)
        self.assertEqual(self.state['batches'], {})
        self.assertEqual((self.root / external.QUEUE).read_bytes(), before)
        with self.assertRaisesRegex(ValueError, 'existing control'):
            cli.prepare(args)


if __name__ == '__main__':
    unittest.main()
