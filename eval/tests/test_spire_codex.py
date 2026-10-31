"""Fixed intake/projection fixtures; never contact the public API."""
import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.parse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import spire_codex as cli
import spire_codex_download as dl
import spire_codex_projection as pr

SALT = b'x' * 32
META = dict(run_hash='private-run-hash', character='SILENT', ascension=10, build_id='v0.111.0', win=1)


def fixture():
    return [
        dict(t='header', s=0, floor=0, replay_version=7, character='SILENT', ascension=10,
             player_count=1, seed='private-seed', build_id='v0.111.0', username='private-name',
             starting_deck=[dict(c=1, id='TEST_CARD', up=1, player_token='private-token')]),
        dict(t='combat_start', combat_id='1.17:TEST_BOSS', floor=17, act=1, attempt_id=0, encounter='TEST_BOSS'),
        dict(t='energy', energy=3), dict(t='draw', c=1, id='TEST_CARD'),
        dict(t='intent', src='TEST_ENEMY', id='TEST_MOVE', dmg=5, hits=1),
        dict(t='turn', n=1, side='player'),
        dict(t='decision', decision_id=1, decision_type='test', options=[
            dict(option_index=0, option_id='TEST_A', selectable=True, username='private-name'),
            dict(option_index=1, option_id='TEST_B', selectable=True, nested={'steam_id': 'private-steam'})]),
        dict(t='outcome', decision_id=1, option_index=1, option_id='TEST_B'),
        dict(t='play', c=1, id='TEST_CARD', up=1, target='TEST_ENEMY', turn=1, cost_paid=1),
        dict(t='hit', src='TEST_CARD', dst='TEST_ENEMY', dmg=5, blocked=0),
        dict(t='potion_start', id='TEST_POTION', target='TEST_ENEMY'),
        dict(t='potion_used', id='TEST_POTION', target='TEST_ENEMY'),
        dict(t='combat_end', combat_id='1.17:TEST_BOSS', attempt_id=0, turns=1, result='victory', hp_lost_total=2),
        dict(t='end', capture_status='complete', terminal_reason='win', final_deck=[dict(id='TEST_CARD', up=1)], final_relics=['TEST_RELIC']),
    ]


def bundle(rows=None):
    return pr.replay_bundle(rows or fixture(), META, SALT, 'a' * 64)


class ProjectionTests(unittest.TestCase):
    def test_white_list_nested_and_identifier_values(self):
        rows = fixture()
        rows[6]['options'][0]['label'] = 'hello private-name private-seed private-run-hash'
        rows[8]['unexpected'] = {'discord_id': 'private-discord'}
        value = bundle(rows)
        text = json.dumps(value)
        for bad in ['private-name', 'private-seed', 'private-run-hash', 'private-token', 'username', 'steam_id', 'player_token', 'discord_id', 'unexpected']:
            self.assertNotIn(bad, text)
        self.assertEqual(value['events'][6]['event']['options'][1]['option_id'], 'TEST_B')
        self.assertEqual(value['run']['run_id'], pr.pseudonym(SALT, 'run', META['run_hash']))
        self.assertNotEqual(value['run']['run_id'], pr.pseudonym(b'y' * 32, 'run', META['run_hash']))

    def test_player_names_matching_game_ids_only_redact_free_text(self):
        rows = fixture()
        rows[6]['options'][0].update(label='SILENT TEST_CARD', option_id='TEST_CARD')
        value = pr.replay_bundle(rows, dict(META, redaction_values=['SILENT', 'TEST_CARD']), SALT, 'a' * 64)
        self.assertEqual(value['run']['character'], 'SILENT')
        self.assertEqual(value['events'][8]['event']['id'], 'TEST_CARD')
        option = value['events'][6]['event']['options'][0]
        self.assertEqual(option['option_id'], 'TEST_CARD')
        self.assertEqual(option['label'], '[REDACTED] [REDACTED]')

    def test_first_zero_retry_and_unknown(self):
        for attempt, expected in [(0, 'first'), (1, 'first'), (None, 'unknown'), (-1, 'unknown')]:
            rows = fixture()
            rows[1]['attempt_id'] = rows[-2]['attempt_id'] = attempt
            c = bundle(rows)['combats'][0]
            self.assertEqual(c['attempt_kind'], expected)
            self.assertEqual(c['default_eligible'], expected == 'first')

    def test_resume_is_not_a_win_or_a_new_first_attempt(self):
        rows = fixture()
        rows.insert(9, dict(t='resume', combat_id='1.17:TEST_BOSS', reloads=1))
        rows.insert(10, dict(t='remap', cards=[{'from': 1, 'to': 2, 'player_id': 123}], exact=True))
        value = bundle(rows)
        self.assertTrue(value['combats'][0]['default_eligible'])
        self.assertTrue(value['combats'][0]['missing_end'])
        self.assertIsNone(value['events'][11]['combat_key'])
        remap = value['events'][10]['event']
        self.assertEqual(remap['cards'], [{'from': 1, 'to': 2}])

    def test_missing_end_and_mismatched_identity(self):
        rows = fixture()
        rows[-2]['combat_id'] = 'wrong'
        c = bundle(rows)['combats'][0]
        self.assertTrue(c['identity_mismatch'])
        self.assertFalse(c['default_eligible'])
        self.assertTrue(bundle(rows[:-2])['combats'][0]['default_eligible'])

    def test_global_attempt_id_does_not_turn_a_new_fight_into_retry(self):
        rows = fixture()[:-1]
        rows += [dict(t='resume', combat_id='1.17:TEST_BOSS', reloads=1),
                 dict(t='combat_start', combat_id='1.17:TEST_BOSS', floor=17, act=1, attempt_id=1, encounter='TEST_BOSS'),
                 dict(t='combat_end', combat_id='1.17:TEST_BOSS', attempt_id=1, result='win'),
                 dict(t='combat_start', combat_id='2.19:NEXT', floor=19, act=2, attempt_id=1, encounter='NEXT')]
        fights = bundle(rows)['combats']
        self.assertEqual([x['attempt_kind'] for x in fights], ['first', 'retry', 'first'])
        self.assertEqual([x['after_run_reload'] for x in fights], [False, True, True])
        rows[0]['s'] = 300
        self.assertEqual(bundle(rows)['combats'][0]['attempt_kind'], 'unknown')

    def test_future_header_never_replaces_run_origin(self):
        rows = fixture()
        rows.insert(-1, dict(t='header', s=900, floor=20, character='SILENT', ascension=10, seed='other-private-seed'))
        value = bundle(rows)
        self.assertFalse(value['run']['prefix_missing'])
        self.assertEqual(value['run']['seed_id'], pr.pseudonym(SALT, 'seed', 'private-seed'))

    def test_reject_non_solo_or_mismatched_version(self):
        for field, val in [('character', 'OTHER'), ('ascension', 9), ('player_count', 2), ('build_id', 'old')]:
            rows = fixture()
            rows[0][field] = val
            with self.assertRaises(ValueError):
                bundle(rows)

    def test_unknown_event_is_counted_without_caching_unknown_data(self):
        rows = fixture() + [dict(t='username', player_token='private-token')]
        value = bundle(rows)
        self.assertEqual(value['run']['unknown_event_counts'], {'unsupported_events': 1})
        self.assertNotIn('username', json.dumps(value))

    def test_turn_order_options_and_partial_hand(self):
        tables = cli.table_rows(bundle())
        self.assertEqual(tables['turns'][0][3:5], [1, 3])
        self.assertEqual(json.loads(tables['turns'][0][5])[0]['id'], 'TEST_CARD')
        self.assertEqual(tables['turns'][0][6], 'observed_draws_partial')
        self.assertEqual(tables['plays'][0][3:9], [1, 1, 'TEST_CARD', 'TEST_ENEMY', 1, 1])
        self.assertEqual(len(json.loads(tables['decisions'][0][6])), 2)
        self.assertEqual(json.loads(tables['decisions'][0][7])[0]['option_index'], 1)
        self.assertEqual(len(tables['potions']), 2)

    def test_export_filter_projection_and_shared_salted_id(self):
        raw = dict(META, seed='private-seed', player_token='private-token', players=[dict(
            character='SILENT', username='private-name', deck=[dict(id='TEST_CARD', current_upgrade_level=1, player_id=3)],
            relics=[dict(id='TEST_RELIC', discord_id='private-discord')])],
            map_point_history=[[dict(rooms=[dict(model_id='TEST_BOSS', room_type='boss', turns_taken=1, username='private-name')],
                                     player_stats=[dict(player_id=99, current_hp=40, card_choices=[dict(card=dict(id='TEST_CARD'), was_picked=True)])])]])
        value = pr.export_run(raw, SALT, 'a' * 64)
        self.assertEqual(value['run_id'], bundle()['run']['run_id'])
        self.assertEqual(value['history'][0]['stats']['current_hp'], 40)
        for bad in ('private-', 'player_id', 'player_stats', 'player_token', 'username', 'discord_id'):
            self.assertNotIn(bad, json.dumps(value))
        raw['players'].append(raw['players'][0])
        self.assertIsNone(pr.export_run(raw, SALT, 'a' * 64))

    def test_plain_and_gzip(self):
        with tempfile.TemporaryDirectory() as tmp:
            for compressed in (False, True):
                p = Path(tmp) / str(compressed)
                content = b'{"t":"end"}\n'
                p.write_bytes(gzip.compress(content) if compressed else content)
                self.assertEqual(list(pr.json_lines(p)), [{'t': 'end'}])


class DownloadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.client = dl.Client(self.root)
        self.calls = []

    def reply(self, content, status=200, h=None, rc=0):
        def request(url, body, headers=None):
            self.calls.append(headers)
            Path(body).write_bytes(content)
            response = h or {'content-length': str(len(content)), 'etag': 'test-etag'}
            Path(str(body) + '.headers').write_text(
                f'HTTP/1.1 {status} Test\n' + ''.join(f'{k}: {v}\n' for k, v in response.items()) + '\n')
            return status, response, rc
        return request

    def test_resume_and_digest(self):
        dest = self.root / 'dump'
        digest = __import__('hashlib').sha256(b'abcdef').hexdigest()
        Path(str(dest) + '.part').write_bytes(b'abc')
        dl.save(str(dest) + '.part.json', dict(url=dl.BASE + '/api/test', expected_sha256=digest, expected_bytes=6, validator='test-etag'))
        with patch.object(self.client, 'request', self.reply(b'def', 206, {'content-range': 'bytes 3-5/6', 'etag': 'test-etag'})):
            receipt = self.client.download(dl.BASE + '/api/test', dest, digest, 6)
        self.assertEqual(dest.read_bytes(), b'abcdef')
        self.assertEqual(self.calls, [{'Range': 'bytes=3-', 'If-Range': 'test-etag'}])
        self.assertTrue(receipt['manifest_verified'])

    def test_range_ignored_restarts(self):
        dest = self.root / 'dump'
        Path(str(dest) + '.part').write_bytes(b'old')
        dl.save(str(dest) + '.part.json', dict(url=dl.BASE + '/api/test', expected_sha256=None, expected_bytes=None, validator='old'))
        with patch.object(self.client, 'request', self.reply(b'new')):
            self.client.download(dl.BASE + '/api/test', dest)
        self.assertEqual(dest.read_bytes(), b'new')

    def test_bad_resume_range_rejected(self):
        with patch.object(self.client, 'request', self.reply(b'bad', 206, {'content-range': 'bytes 9-11/12'})):
            with self.assertRaisesRegex(ValueError, 'Content-Range'):
                self.client.download(dl.BASE + '/api/test', self.root / 'dump')

    def test_digest_mismatch_and_dedup(self):
        dest = self.root / 'dump'
        with patch.object(self.client, 'request', self.reply(b'good')) as request:
            self.client.download(dl.BASE + '/api/test', dest)
            self.client.download(dl.BASE + '/api/test', dest)
        self.assertEqual(len(self.calls), 1)
        with patch.object(self.client, 'request', self.reply(b'bad')):
            with self.assertRaisesRegex(ValueError, 'SHA mismatch'):
                self.client.download(dl.BASE + '/api/test', self.root / 'other', '0' * 64)

    def test_incremental_conditional_revalidation(self):
        dest = self.root / 'dump'
        with patch.object(self.client, 'request', self.reply(b'original')):
            self.client.download(dl.BASE + '/api/test', dest)
        original_receipt = Path(str(dest) + '.receipt.json').read_bytes()
        with patch.object(self.client, 'request', self.reply(b'', 304, {'etag': 'test-etag'})):
            self.client.download(dl.BASE + '/api/test', dest, refresh=True)
        self.assertEqual(dest.read_bytes(), b'original')
        self.assertEqual(self.calls[-1], {'If-None-Match': 'test-etag'})
        before_replacement = Path(str(dest) + '.receipt.json').read_bytes()
        with patch.object(self.client, 'request', self.reply(b'updated')):
            receipt = self.client.download(dl.BASE + '/api/test', dest, refresh=True)
        self.assertEqual(dest.read_bytes(), b'updated')
        self.assertEqual(receipt['sha256'], dl.sha(dest))
        previous = receipt['previous_revision']
        self.assertEqual((dest.parent / previous['body_path']).read_bytes(), b'original')
        self.assertEqual((dest.parent / previous['receipt_path']).read_bytes(), before_replacement)
        # Conditional checks may update checked_at, but preserve the download timestamp.
        archived = dl.load(dest.parent / previous['receipt_path'])
        self.assertEqual(archived['downloaded_at'], json.loads(original_receipt)['downloaded_at'])
        self.assertEqual(archived['sha256'], __import__('hashlib').sha256(b'original').hexdigest())

    def test_corrupt_revision_archive_cannot_replace_the_current_original(self):
        dest = self.root / 'dump'
        with patch.object(self.client, 'request', self.reply(b'original')):
            self.client.download(dl.BASE + '/api/test', dest)
        digest = dl.sha(dest)
        archive = dest.parent / 'revisions' / digest / dest.name
        archive.parent.mkdir(parents=True)
        archive.write_bytes(b'corrupt')
        with patch.object(self.client, 'request', self.reply(b'updated')):
            with self.assertRaisesRegex(ValueError, 'archive is corrupt'):
                self.client.download(dl.BASE + '/api/test', dest, refresh=True)
        self.assertEqual(dest.read_bytes(), b'original')

    def test_backoff_and_no_retry_forbidden(self):
        good = self.reply(b'ok')
        responses = [(429, {'retry-after': '3'}, 0), (503, {}, 0)]
        def request(url, body, headers=None):
            if responses:
                return responses.pop(0)
            return good(url, body, headers)
        with patch.object(self.client, 'request', request), patch.object(dl.time, 'sleep') as sleep:
            self.client.download(dl.BASE + '/api/test', self.root / 'dump')
        self.assertEqual([x.args[0] for x in sleep.call_args_list], [3, 4])
        with patch.object(self.client, 'request', self.reply(b'no', 403)), patch.object(dl.time, 'sleep') as sleep:
            with self.assertRaises(ValueError):
                self.client.download(dl.BASE + '/api/test', self.root / 'blocked')
            sleep.assert_not_called()

    def test_private_origin_and_page_denied(self):
        for url in ('https://elsewhere.test/api/a', 'http://spire-codex.com/api/a', '/runs/abc', '//user@spire-codex.com/api/a', '/api/../terms', '/exports/%2e%2e/terms'):
            with self.assertRaises(ValueError):
                dl.public_url(url)

    def test_persisted_rate_limiter(self):
        dl.save(self.root / 'rate.json', {'time': 100})
        def run(args, **kwargs):
            Path(args[args.index('--dump-header') + 1]).write_text('HTTP/1.1 200 OK\nContent-Length: 0\n\n')
            return type('Result', (), {'stdout': b'200', 'returncode': 0})()
        with patch.object(dl.time, 'time', return_value=100.2), patch.object(dl.time, 'sleep') as sleep, patch.object(dl.subprocess, 'run', run):
            self.client.request(dl.BASE + '/api/test', self.root / 'body')
        self.assertAlmostEqual(sleep.call_args.args[0], 3.9)

    def test_interrupted_curl_body_is_resumed(self):
        dest = self.root / 'dump'
        digest = __import__('hashlib').sha256(b'abcdef').hexdigest()
        Path(str(dest) + '.chunk').write_bytes(b'abc')
        Path(str(dest) + '.chunk.headers').write_text('HTTP/1.1 200 OK\nContent-Length: 6\nETag: test-etag\n\n')
        dl.save(str(dest) + '.part.json', dict(url=dl.BASE + '/api/test', expected_sha256=digest, expected_bytes=6,
                                             inflight={'url': dl.BASE + '/api/test', 'offset': 0}))
        with patch.object(self.client, 'request', self.reply(b'def', 206, {'content-range': 'bytes 3-5/6', 'etag': 'test-etag'})):
            self.client.download(dl.BASE + '/api/test', dest, digest, 6)
        self.assertEqual(dest.read_bytes(), b'abcdef')
        self.assertEqual(self.calls, [{'Range': 'bytes=3-', 'If-Range': 'test-etag'}])

    def test_interrupted_append_is_idempotent_and_complete_body_needs_no_request(self):
        dest = self.root / 'dump'
        digest = __import__('hashlib').sha256(b'abcdef').hexdigest()
        Path(str(dest) + '.part').write_bytes(b'abcd')
        Path(str(dest) + '.chunk').write_bytes(b'def')
        Path(str(dest) + '.chunk.headers').write_text('HTTP/1.1 206 Partial Content\nContent-Range: bytes 3-5/6\nETag: test-etag\n\n')
        dl.save(str(dest) + '.part.json', dict(url=dl.BASE + '/api/test', expected_sha256=digest, expected_bytes=6,
                                             validator='test-etag', inflight={'url': dl.BASE + '/api/test', 'offset': 3}))
        with patch.object(self.client, 'request') as request:
            self.client.download(dl.BASE + '/api/test', dest, digest, 6)
            request.assert_not_called()
        self.assertEqual(dest.read_bytes(), b'abcdef')

    def test_curl_inherits_the_same_download_lock(self):
        with dl.locked(self.root) as lease:
            client = dl.Client(self.root, lease.fileno())
            def run(args, **kwargs):
                self.assertEqual(kwargs['pass_fds'], (lease.fileno(),))
                return type('Result', (), {'stdout': b'200', 'returncode': 0})()
            with patch.object(dl.subprocess, 'run', run):
                client.request(dl.BASE + '/api/test', self.root / 'body')

    def scan(self, page_function, max_pages=None):
        def metadata(client, url, tag):
            if tag == 'manifest':
                return {'versions': {'v0.111.0': {}}}, 'a' * 64
            return page_function(urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)), 'b' * 64
        def download(client, url, dest, *args, **kwargs):
            Path(dest).parent.mkdir(parents=True, exist_ok=True)
            Path(dest).write_bytes(b'fixture')
            return {'sha256': dl.sha(dest)}
        with patch.object(dl.Client, 'json', metadata), patch.object(dl.Client, 'download', download):
            return dl.sync(self.root, ['v0.111.0'], max_pages, ())

    def test_lower_bound_not_termination_empty_page_and_duplicate_runs(self):
        calls = []
        def page(q):
            n = int(q['page'][0]); calls.append(n)
            return dict(total=1, total_is_lower_bound=True, runs=[META, META] if n == 1 else [])
        result = self.scan(page)
        self.assertTrue(result['complete'])
        self.assertEqual(result['runs_downloaded'], 1)
        self.assertEqual(calls, [1, 2])

    def test_capped_build_splits_win_and_failure_cannot_masquerade_complete(self):
        calls = []
        def page(q):
            calls.append(q.get('win', ['all'])[0])
            return dict(total=10000 if 'win' not in q else 0, runs=[])
        self.assertTrue(self.scan(page)['complete'])
        self.assertEqual(calls, ['all', 'true', 'false'])
        with self.assertRaisesRegex(ValueError, 'intake incomplete'):
            self.scan(lambda q: dict(total=10000, runs=[]))

    def test_budget_resume_cursor_and_new_cycle(self):
        seen = []
        def page(q):
            n = int(q['page'][0]); seen.append(n)
            return dict(total=1, runs=[META] if n == 1 else [])
        self.assertFalse(self.scan(page, 1)['complete'])
        self.assertTrue(self.scan(page, 1)['complete'])
        self.assertEqual(seen, [1, 2])
        self.assertTrue(self.scan(page)['complete'])
        self.assertEqual(seen, [1, 2, 1, 2])

    def test_failed_run_does_not_advance_page(self):
        with patch.object(dl.Client, 'download', side_effect=ValueError('fixture failure')):
            # Metadata bypasses download in this isolated failure fixture.
            with patch.object(dl.Client, 'json', side_effect=[({'versions': {'v0.111.0': {}}}, 'a'), ({'runs': [META], 'total': 1}, 'b')]):
                with self.assertRaises(ValueError):
                    dl.sync(self.root, ['v0.111.0'], None, ())
        index = dl.load(self.root / 'private-index.json')
        self.assertEqual(index['cycle']['shards'][0]['page'], 1)
        self.assertFalse(index['cycle']['complete'])

    def seed_cycle(self, count=200):
        path = self.root / 'raw/replays/verified.ndjson'
        path.parent.mkdir(parents=True)
        path.write_bytes(b'verified')
        index = dict(schema=1, runs={f'good-{i}': dict(META, run_hash=f'good-{i}',
                     path=f'raw/replays/good-{i}.ndjson', sha256=dl.sha(path), checked_cycle='original')
                     for i in range(count)}, cycle=dict(id='original', versions=['v0.111.0'],
                     complete=False, next=0, shards=[dict(version='v0.111.0', win=None, page=8)]))
        for meta in index['runs'].values():
            (self.root / meta['path']).write_bytes(b'verified')
        dl.save(self.root / 'private-index.json', index)
        return index

    def tombstone_scan(self, rows, response=None, max_pages=1, max_tombstone_ratio=.10):
        cycle = dl.load(self.root / 'private-index.json', {}).get('cycle', {})
        start = cycle['shards'][cycle['next']]['page'] if cycle and not cycle.get('complete') else 1
        def metadata(client, url, tag):
            if tag == 'manifest':
                return {'versions': {'v0.111.0': {}}}, 'a' * 64
            page = int(urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)['page'][0])
            return dict(total=len(rows), runs=rows if page == start else []), 'b' * 64
        handler = response or self.reply(b'{"detail":"Replay not found"}', 404)
        with patch.object(dl.Client, 'json', metadata), patch.object(dl.Client, 'request', side_effect=handler):
            return dl.sync(self.root, max_pages=max_pages, export_versions=(), max_tombstone_ratio=max_tombstone_ratio)

    def legacy_page8_resume(self, controlled_status=None):
        index = self.seed_cycle(782)
        export = self.root / 'raw/exports/original.gz'
        export.parent.mkdir(parents=True)
        export.write_bytes(b'original export')
        dl.save(str(export) + '.receipt.json', dict(url=dl.BASE + '/exports/original.gz',
                sha256=dl.sha(export), expected_sha256=dl.sha(export), expected_bytes=export.stat().st_size,
                manifest_verified=True))
        index['exports'] = {'v0.111.0': str(export.relative_to(self.root))}
        # Default resume must retain the original shard list despite a newer manifest.
        remaining = [f'v0.fixture-{i}' for i in range(38)] + [None]
        index['cycle']['versions'].extend(remaining)
        index['cycle']['shards'].extend(dict(version=v, win=None, page=1) for v in remaining)
        dl.save(self.root / 'private-index.json', index)
        dest = self.root / 'raw/replays/private-run-hash.ndjson'
        body = b'{"detail":"Replay not found"}'
        self.reply(body, 404)(dl.BASE + '/api/runs/private-run-hash/replay', Path(str(dest) + '.chunk'))
        dl.save(str(dest) + '.part.json', dict(url=dl.BASE + '/api/runs/private-run-hash/replay',
                expected_sha256=None, expected_bytes=None,
                inflight=dict(url=dl.BASE + '/api/runs/private-run-hash/replay', offset=0)))
        if controlled_status is not None:
            Path(str(dest) + '.chunk.headers').write_text('HTTP/1.1 404 Not Found\nTransfer-Encoding: chunked\n\n')
        original = {name: Path(str(dest) + suffix).read_bytes() for name, suffix in (
            ('body', '.chunk'), ('headers', '.chunk.headers'), ('journal', '.part.json'))}
        (self.root / 'salt').write_bytes(SALT)
        cache = self.root / 'cache/exports/original.jsonl'
        cache.parent.mkdir(parents=True)
        cache.write_bytes(b'old cache')
        preserved = {p: dl.sha(p) for p in [export, Path(str(export) + '.receipt.json'), self.root / 'salt', cache]
                     + [self.root / meta['path'] for meta in index['runs'].values()]}
        rows = [dict(META, run_hash=f'good-{i}') for i in range(84)] + [META]
        def metadata(client, url, tag):
            self.assertEqual(tag, 'list')
            self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)['page'], ['8'])
            return {'runs': rows, 'total': 900}, 'b' * 64
        response = self.reply(body, 404) if controlled_status == 404 else self.reply(b'restored', 200)
        self.calls.clear()
        with patch.object(dl.Client, 'json', metadata), patch.object(dl.Client, 'request', side_effect=response) as request:
            result = dl.sync(self.root, max_pages=1)
            self.assertEqual(request.call_count, int(controlled_status is not None))
        self.assertEqual({p: dl.sha(p) for p in preserved}, preserved)
        self.assertEqual((result['runs_downloaded'], result['tombstones'], result['processed_records']),
                         (783, 0, 783) if controlled_status == 200 else (782, 1, 783))
        after = dl.load(self.root / 'private-index.json')
        self.assertEqual((after['cycle']['next'], after['cycle']['shards'][0]['page']), (0, 9))
        self.assertEqual(after['cycle']['versions'], ['v0.111.0'] + remaining)
        self.assertEqual(len(after['cycle']['shards']), 40)
        if controlled_status is not None:
            record = dl.load(self.root / 'legacy-404-recheck.json')
            self.assertEqual(self.calls, [{}])
            self.assertEqual((record['status'], record['curl_rc']), (controlled_status, 0))
            self.assertLessEqual(record['started_at'], record['completed_at'])
            for name, content in original.items():
                self.assertEqual((self.root / record['originals'][name]['path']).read_bytes(), content)
            for entry in record['response'].values():
                self.assertEqual(dl.sha(self.root / entry['path']), entry['sha256'])
        if controlled_status == 200:
            self.assertEqual(dest.read_bytes(), b'restored')
            self.assertEqual(after['runs'][META['run_hash']]['sha256'], dl.sha(dest))
        else:
            tomb = after['tombstones'][META['run_hash']]['observations'][0]
            self.assertEqual((tomb['page'], tomb['position_in_page'], tomb['shard']), (8, 85, 1))
            for name in ('body', 'headers'):
                self.assertEqual(dl.sha(self.root / tomb[name + '_path']), tomb[name + '_sha256'])
            self.assertEqual(tomb['list_sha256'], 'b' * 64)
            self.assertIn('observed_at', tomb)
            self.assertEqual(tomb['curl_rc'], 0 if controlled_status else None)

    def test_legacy_page8_resume_reuses_782_and_export_and_frozen_404(self):
        self.legacy_page8_resume()

    def test_incomplete_legacy_page8_single_recheck_404_preserves_782_export_cache_salt(self):
        self.legacy_page8_resume(404)

    def test_incomplete_legacy_page8_single_recheck_200_preserves_782_export_cache_salt(self):
        self.legacy_page8_resume(200)

    def test_only_listed_exact_complete_404_is_a_tombstone(self):
        for body, status, rc, headers in [
            (b'{"detail":"Replay not found"}', 404, 0, None),
            (b'Replay not found', 404, 0, None),
            (b'{"detail":"Something else"}', 404, 0, None),
            (b'{"detail":"Replay not found","extra":true}', 404, 0, None),
            (b'{"detail":"Replay not found"}', 404, 28, None),
            (b'{"detail":"Replay not found"}', 404, 0, {'content-length': '999'}),
            (b'{"detail":"Replay not found"}', 503, 0, None),
            (b'{"detail":"Replay not found"}', 429, 0, None),
            (b'{"detail":"Replay not found"}', 0, 28, None),
        ]:
            with self.subTest(body=body, status=status, rc=rc, headers=headers):
                dest = self.root / ('case-' + str(len(self.calls)))
                with patch.object(self.client, 'request', self.reply(body, status, headers, rc)), patch.object(dl.time, 'sleep'):
                    error = dl.ReplayNotFound if status == 404 and not rc and headers is None and body in (
                        b'{"detail":"Replay not found"}', b'Replay not found') else ValueError
                    with self.assertRaises(error) as caught:
                        self.client.download(dl.BASE + '/api/runs/test/replay', dest, listed_cycle='test')
                    self.assertEqual(isinstance(caught.exception, dl.ReplayNotFound), error is dl.ReplayNotFound)
        for url, cycle in ((dl.BASE + '/api/runs/test/replay', None), (dl.BASE + '/api/other', 'test')):
            with patch.object(self.client, 'request', self.reply(b'{"detail":"Replay not found"}', 404)):
                with self.assertRaises(ValueError) as caught:
                    self.client.download(url, self.root / ('unlisted-' + str(len(self.calls))), listed_cycle=cycle)
                self.assertNotIsInstance(caught.exception, dl.ReplayNotFound)

        redirected = [self.reply(b'', 302, {'location': '/api/runs/other/replay'}),
                      self.reply(b'{"detail":"Replay not found"}', 404)]
        def redirect_response(url, body, headers=None):
            return redirected.pop(0)(url, body, headers)
        with patch.object(self.client, 'request', redirect_response):
            with self.assertRaises(ValueError) as caught:
                self.client.download(dl.BASE + '/api/runs/test/replay', self.root / 'redirect', listed_cycle='test')
            self.assertNotIsInstance(caught.exception, dl.ReplayNotFound)

    def test_missing_response_journal_survives_before_index_commit_and_next_cycle_retries(self):
        dest = self.root / 'missing'
        with patch.object(self.client, 'request', self.reply(b'{"detail":"Replay not found"}', 404)):
            with self.assertRaises(dl.ReplayNotFound) as first:
                self.client.download(dl.BASE + '/api/runs/test/replay', dest, listed_cycle='one')
        with patch.object(self.client, 'request') as request:
            with self.assertRaises(dl.ReplayNotFound):
                self.client.download(dl.BASE + '/api/runs/test/replay', dest, listed_cycle='one')
            request.assert_not_called()
        with patch.object(self.client, 'request', self.reply(b'{"detail":"Replay not found"}', 404)):
            with self.assertRaises(dl.ReplayNotFound):
                self.client.download(dl.BASE + '/api/runs/test/replay', dest, listed_cycle='two')
        self.assertEqual(len(self.calls), 2)
        # A later successful curl must not mutate the archived 404 inode.
        with patch.object(self.client, 'request', self.reply(b'now available')):
            self.client.download(dl.BASE + '/api/runs/test/replay', dest, listed_cycle='three')
        evidence = first.exception.evidence
        self.assertEqual(dl.sha(self.root / evidence['body_path']), evidence['body_sha256'])

    def test_duplicate_missing_rows_and_resume_do_not_recount_or_retry(self):
        self.seed_cycle()
        self.assertEqual(self.tombstone_scan([META, META])['tombstones'], 1)
        self.assertEqual(len(self.calls), 1)
        index = dl.load(self.root / 'private-index.json')
        index['cycle']['shards'][0]['page'] = 8  # Simulate interruption before the page commit.
        dl.save(self.root / 'private-index.json', index)
        self.assertEqual(self.tombstone_scan([META])['processed_records'], 201)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(len(dl.load(self.root / 'private-index.json')['tombstones'][META['run_hash']]['observations']), 1)

    def test_ratio_breaker_is_strict_and_sticky_on_resume(self):
        self.seed_cycle(9)
        result = self.tombstone_scan([META])
        self.assertEqual(result['tombstone_ratio'], .10)
        index = dl.load(self.root / 'private-index.json')
        index['cycle']['shards'][0]['page'] = 8
        dl.save(self.root / 'private-index.json', index)
        with self.assertRaisesRegex(ValueError, 'circuit breaker'):
            self.tombstone_scan([META, dict(META, run_hash='missing-two')])
        index = dl.load(self.root / 'private-index.json')
        self.assertFalse(index['cycle']['complete'])
        self.assertEqual(index['cycle']['shards'][0]['page'], 8)
        with patch.object(dl.Client, 'json') as metadata, patch.object(dl.Client, 'request') as request:
            with self.assertRaisesRegex(ValueError, 'circuit breaker'):
                dl.sync(self.root, export_versions=())
            metadata.assert_not_called()
            request.assert_not_called()

    def test_five_consecutive_tombstones_trip_below_one_percent(self):
        self.seed_cycle(600)
        with self.assertRaisesRegex(ValueError, 'circuit breaker'):
            self.tombstone_scan([dict(META, run_hash=f'missing-{i}') for i in range(6)])
        summary = dl.tombstone_summary(dl.load(self.root / 'private-index.json'))
        self.assertEqual((summary['tombstones'], summary['consecutive_tombstones']), (5, 5))
        self.assertLess(summary['tombstone_ratio'], .01)
        self.assertEqual(len(self.calls), 5)

    def test_a_new_success_resets_streak_but_replayed_prefix_does_not(self):
        self.seed_cycle(1000)
        def request(url, body, headers=None):
            return self.reply(b'success' if '/new-success/' in url else b'{"detail":"Replay not found"}',
                              200 if '/new-success/' in url else 404)(url, body, headers)
        rows = [dict(META, run_hash=f'missing-{i}') for i in range(4)]
        rows += [dict(META, run_hash='new-success')]
        rows += [dict(META, run_hash=f'missing-{i}') for i in range(4, 8)]
        result = self.tombstone_scan(rows, request)
        self.assertEqual((result['tombstones'], result['consecutive_tombstones']), (8, 4))
        index = dl.load(self.root / 'private-index.json')
        index['cycle']['shards'][0]['page'] = 9
        dl.save(self.root / 'private-index.json', index)
        with self.assertRaisesRegex(ValueError, 'circuit breaker'):
            self.tombstone_scan([dict(META, run_hash='good-0'), dict(META, run_hash='missing-8')])
        self.assertEqual(dl.tombstone_summary(dl.load(self.root / 'private-index.json'))['consecutive_tombstones'], 5)

    def test_page_half_gate_counts_success_and_is_sticky_across_resume(self):
        self.seed_cycle(200)
        def response(url, body, headers=None):
            missing = '/missing-' in url
            return self.reply(b'Replay not found' if missing else b'verified', 404 if missing else 200)(url, body, headers)
        # Five nonconsecutive missing rows among nine are admissible until the
        # tenth (successful) row makes the observed page exactly 50% missing.
        rows = [dict(META, run_hash=f'{kind}-{i}') for i in range(5) for kind in ('missing', 'new')]
        first = self.tombstone_scan(rows[:9], response)
        self.assertEqual((first['pages'][0]['processed_records'], first['pages'][0]['tombstones']), (9, 5))
        index = dl.load(self.root / 'private-index.json')
        index['cycle']['shards'][0]['page'] = 8
        dl.save(self.root / 'private-index.json', index)
        with self.assertRaisesRegex(ValueError, 'circuit breaker'):
            self.tombstone_scan(rows + [dict(META, run_hash='never-requested')], response)
        summary = dl.tombstone_summary(dl.load(self.root / 'private-index.json'))
        self.assertEqual((summary['pages'][0]['processed_records'], summary['pages'][0]['tombstones']), (10, 5))
        self.assertEqual(summary['consecutive_tombstones'], 0)
        self.assertEqual(len(self.calls), 10)
        with patch.object(dl.Client, 'json') as metadata, patch.object(dl.Client, 'request') as request:
            with self.assertRaisesRegex(ValueError, 'circuit breaker'):
                dl.sync(self.root, export_versions=())
            metadata.assert_not_called()
            request.assert_not_called()

    def test_page_below_half_and_duplicate_resume_counts(self):
        self.seed_cycle(200)
        def response(url, body, headers=None):
            missing = '/missing-' in url
            return self.reply(b'Replay not found' if missing else b'verified', 404 if missing else 200)(url, body, headers)
        rows = [dict(META, run_hash=f'{kind}-{i}') for i in range(4) for kind in ('new', 'missing')]
        rows += [dict(META, run_hash='new-4'), dict(META, run_hash='new-5')]
        first = self.tombstone_scan(rows + rows, response)
        self.assertEqual((first['pages'][0]['processed_records'], first['pages'][0]['tombstones']), (10, 4))
        index = dl.load(self.root / 'private-index.json')
        index['cycle']['shards'][0]['page'] = 8
        dl.save(self.root / 'private-index.json', index)
        second = self.tombstone_scan(rows, response)
        self.assertEqual(first['pages'], second['pages'])
        self.assertEqual(first['processed_records'], second['processed_records'])
        self.assertEqual(len(self.calls), 10)
        self.assertNotIn('missing-0', json.dumps(second))

    def test_ratio_override_and_invalid_values_fail_before_network(self):
        self.seed_cycle(9)
        with self.assertRaisesRegex(ValueError, 'circuit breaker'):
            self.tombstone_scan([META], max_tombstone_ratio=.09)
        self.assertEqual(self.tombstone_scan([META], max_tombstone_ratio=.10)['tombstones'], 1)
        for value in (-.1, 1.1, float('inf'), float('nan')):
            with patch.object(dl.Client, 'json') as metadata:
                with self.assertRaisesRegex(ValueError, 'max-tombstone-ratio'):
                    dl.sync(self.root, max_tombstone_ratio=value)
                metadata.assert_not_called()

    def test_cli_ratio_default_and_explicit_override(self):
        for options, expected in (([], .10), (['--max-tombstone-ratio', '.25'], .25)):
            with patch.object(sys, 'argv', ['spire_codex', 'download', '--no-export'] + options), \
                    patch.object(cli, 'sync', return_value={}) as sync, patch('builtins.print'):
                self.assertEqual(cli.main(), 0)
                self.assertEqual(sync.call_args.kwargs['max_tombstone_ratio'], expected)

    def test_legacy_page_progress_does_not_invent_denominators(self):
        self.seed_cycle(200)
        self.tombstone_scan([META])
        index = dl.load(self.root / 'private-index.json')
        del index['cycle']['page_progress']
        index['cycle']['shards'][0]['page'] = 8
        dl.save(self.root / 'private-index.json', index)
        summary = dl.tombstone_summary(index)
        self.assertIsNone(summary['pages'][0]['processed_records'])
        result = self.tombstone_scan([META, META])
        self.assertEqual((result['pages'][0]['processed_records'], result['pages'][0]['tombstones']), (1, 1))
        self.assertEqual(len(self.calls), 1)

    def test_original_thirteen_legacy_tombstones_resume_under_ten_percent(self):
        index = self.seed_cycle(1208)
        index['cycle']['shards'][0]['page'] = 13
        index['cycle']['tombstone_streak'] = 1
        index['tombstones'] = {f'missing-{i}': dict(active=True, checked_cycle='original',
            observations=[dict(cycle='original', shard=1, version='v0.111.0', win=None, page=10+i%4)])
            for i in range(13)}
        dl.save(self.root / 'private-index.json', index)
        original = (self.root / 'private-index.json').read_bytes()
        for _ in range(2):
            restored = dl.load(self.root / 'private-index.json')
            dl.check_tombstone_breaker(restored)
            result = dl.tombstone_summary(restored)
            self.assertEqual((result['tombstones'], result['processed_records'], result['consecutive_tombstones']), (13, 1221, 1))
            self.assertEqual(sum(p['tombstones'] for p in result['pages']), 13)
            self.assertTrue(all(p['processed_records'] is None for p in result['pages']))
            with self.assertRaisesRegex(ValueError, 'circuit breaker'):
                dl.check_tombstone_breaker(restored, .01)
        self.assertEqual((self.root / 'private-index.json').read_bytes(), original)

    def test_corrupt_original_export_stops_without_network_or_cursor_changes(self):
        index = self.seed_cycle(1)
        export = self.root / 'raw/export.gz'
        export.write_bytes(b'corrupt')
        dl.save(str(export) + '.receipt.json', dict(url=dl.BASE + '/exports/original.gz',
                sha256='a' * 64, expected_sha256='a' * 64, expected_bytes=7, manifest_verified=True))
        index['exports'] = {'v0.111.0': str(export.relative_to(self.root))}
        dl.save(self.root / 'private-index.json', index)
        before = dl.sha(self.root / 'private-index.json')
        with patch.object(dl.Client, 'request') as request, patch.object(dl.Client, 'json') as metadata:
            with self.assertRaisesRegex(ValueError, 'bytes/SHA mismatch'):
                dl.sync(self.root)
            request.assert_not_called()
            metadata.assert_not_called()
        self.assertEqual(dl.sha(self.root / 'private-index.json'), before)

    def test_next_full_rechecks_missing_once_and_recovers_historical_success(self):
        index = self.seed_cycle()
        index['runs'][META['run_hash']] = dict(index['runs']['good-0'], run_hash=META['run_hash'], checked_cycle='older')
        dl.save(self.root / 'private-index.json', index)
        self.tombstone_scan([META])
        self.assertTrue(dl.active_tombstone(dl.load(self.root / 'private-index.json'), META['run_hash']))
        for response, active in ((self.reply(b'{"detail":"Replay not found"}', 404), True), (self.reply(b'restored'), False)):
            index = dl.load(self.root / 'private-index.json')
            index['cycle']['complete'] = True
            # Prior checked successes are not counted in a fresh cycle; provide
            # 100 actual listed successes before the missing row in this fixture.
            dl.save(self.root / 'private-index.json', index)
            def request(url, body, headers=None):
                if '/private-run-hash/' in url:
                    return response(url, body, headers)
                return self.reply(b'verified')(url, body, headers)
            rows = [dict(META, run_hash=f'good-{i}') for i in range(100)] + [META, META]
            result = self.tombstone_scan(rows, request)
            index = dl.load(self.root / 'private-index.json')
            self.assertEqual(dl.active_tombstone(index, META['run_hash']), active)
            self.assertEqual(result['tombstones'], int(active))
            self.assertEqual(result['consecutive_tombstones'], int(active))
        self.assertEqual(len(index['tombstones'][META['run_hash']]['observations']), 2)

    def test_incomplete_legacy_404_is_not_retried_or_classified(self):
        dest = self.root / 'missing'
        Path(str(dest) + '.chunk').write_bytes(b'{"detail":"Replay not found"}')
        Path(str(dest) + '.chunk.headers').write_text('HTTP/1.1 404 Not Found\nContent-Length: 999\n\n')
        dl.save(str(dest) + '.part.json', dict(url=dl.BASE + '/api/runs/test/replay', expected_sha256=None,
                expected_bytes=None, inflight=dict(url=dl.BASE + '/api/runs/test/replay', offset=0)))
        with patch.object(self.client, 'request') as request:
            with self.assertRaises(ValueError) as caught:
                self.client.download(dl.BASE + '/api/runs/test/replay', dest, listed_cycle='one')
            self.assertNotIsInstance(caught.exception, dl.ReplayNotFound)
            request.assert_not_called()

    def seed_legacy_failure(self, key='test', body=b'{"detail":"Replay not found"}', headers=None, rc=None):
        url = dl.BASE + f'/api/runs/{key}/replay'
        dest = self.root / 'raw/replays' / (key + '.ndjson')
        dest.parent.mkdir(parents=True, exist_ok=True)
        Path(str(dest) + '.chunk').write_bytes(body)
        Path(str(dest) + '.chunk.headers').write_text(
            'HTTP/1.1 404 Not Found\n' + (headers or 'Transfer-Encoding: chunked\n') + '\n')
        inflight = dict(url=url, offset=0)
        if rc is not None:
            inflight['response_rc'] = rc
        dl.save(str(dest) + '.part.json', dict(url=url, expected_sha256=None, expected_bytes=None, inflight=inflight))
        return url, dest

    def test_legacy_recheck_other_results_stop_once_and_keep_cursor_and_failure(self):
        root = self.root
        for i, (body, status, headers, rc) in enumerate([
            (b'rate limited', 429, None, 0), (b'unavailable', 503, None, 0),
            (b'', 0, None, 28), (b'{"detail":"Replay not found"}', 404, None, 28),
            (b'{"detail":"Different"}', 404, None, 0),
            (b'{"detail":"Replay not found","extra":true}', 404, None, 0),
            (b'redirect', 302, {'location': '/api/runs/other/replay'}, 0),
            (b'partial', 206, {'content-range': 'bytes 0-6/7'}, 0),
            (b'short', 200, {'content-length': '999'}, 0), (b'body', 200, None, 28),
            (b'{"detail":"Replay not found"}', 404, {'content-length': '999'}, 0),
        ]):
            with self.subTest(status=status, rc=rc, body=body):
                self.root = root / str(i)
                self.seed_cycle()
                _, dest = self.seed_legacy_failure(META['run_hash'])
                originals = {p: p.read_bytes() for p in (Path(str(dest) + suffix) for suffix in ('.chunk', '.chunk.headers', '.part.json'))}
                index_before = (self.root / 'private-index.json').read_bytes()
                self.calls.clear()
                with patch.object(dl.time, 'sleep') as sleep:
                    with self.assertRaises(ValueError) as caught:
                        self.tombstone_scan([META], self.reply(body, status, headers, rc))
                    self.assertNotIsInstance(caught.exception, dl.ReplayNotFound)
                    sleep.assert_not_called()
                self.assertEqual(len(self.calls), 1)
                with patch.object(dl.Client, 'request', side_effect=AssertionError('second request')):
                    with self.assertRaises(ValueError):
                        self.tombstone_scan([META])
                self.assertEqual((self.root / 'private-index.json').read_bytes(), index_before)
                self.assertEqual({p: p.read_bytes() for p in originals}, originals)
                record = dl.load(self.root / 'legacy-404-recheck.json')
                self.assertEqual((record['status'], record['curl_rc']), (status, rc))
                self.assertIn('completed_at', record)
                self.assertFalse(dest.exists())

    def test_legacy_recheck_interrupted_request_consumes_allowance(self):
        url, dest = self.seed_legacy_failure()
        with patch.object(self.client, 'request', side_effect=RuntimeError('interrupted')) as request:
            with self.assertRaisesRegex(RuntimeError, 'interrupted'):
                self.client.download(url, dest, listed_cycle='original')
            self.assertEqual(request.call_count, 1)
        with patch.object(self.client, 'request') as request:
            with self.assertRaisesRegex(ValueError, 'outcome unknown'):
                self.client.download(url, dest, listed_cycle='original')
            request.assert_not_called()
        self.assertNotIn('completed_at', dl.load(self.root / 'legacy-404-recheck.json'))

    def test_legacy_recheck_completed_response_recovers_without_network(self):
        root = self.root
        for status in (200, 404):
            with self.subTest(status=status):
                self.root = root / str(status)
                url, dest = self.seed_legacy_failure()
                client = dl.Client(self.root)
                save = dl.save
                def interrupt(path, value):
                    save(path, value)
                    if Path(path).name == 'legacy-404-recheck.json' and 'completed_at' in value:
                        raise RuntimeError('after completed response')
                response = self.reply(b'restored' if status == 200 else b'Replay not found', status)
                with patch.object(client, 'request', response), patch.object(dl, 'save', interrupt):
                    with self.assertRaisesRegex(RuntimeError, 'after completed response'):
                        client.download(url, dest, listed_cycle='original')
                with patch.object(client, 'request') as request:
                    if status == 404:
                        with self.assertRaises(dl.ReplayNotFound) as caught:
                            client.download(url, dest, listed_cycle='original')
                        self.assertEqual(caught.exception.evidence['curl_rc'], 0)
                    else:
                        client.download(url, dest, listed_cycle='original')
                        receipt = Path(str(dest) + '.receipt.json').read_bytes()
                        # Even loss of the old journal after publication cannot
                        # cause a repeat while the index commit is outstanding.
                        client.download(url, dest, refresh=True, listed_cycle='original')
                        self.assertEqual(dest.read_bytes(), b'restored')
                        self.assertEqual(Path(str(dest) + '.receipt.json').read_bytes(), receipt)
                    request.assert_not_called()

    def test_legacy_recheck_corrupt_evidence_cannot_be_re_requested(self):
        url, dest = self.seed_legacy_failure()
        with patch.object(self.client, 'request', self.reply(b'busy', 503)):
            with self.assertRaises(ValueError):
                self.client.download(url, dest, listed_cycle='original')
        record = dl.load(self.root / 'legacy-404-recheck.json')
        (self.root / record['response']['body']['path']).write_bytes(b'changed')
        with patch.object(self.client, 'request') as request:
            with self.assertRaisesRegex(ValueError, 'digest mismatch'):
                self.client.download(url, dest, listed_cycle='original')
            request.assert_not_called()

    def test_legacy_recheck_allowance_is_not_per_record_or_cycle(self):
        url, dest = self.seed_legacy_failure()
        with patch.object(self.client, 'request', self.reply(b'Replay not found', 404)):
            with self.assertRaises(dl.ReplayNotFound):
                self.client.download(url, dest, listed_cycle='original')
        # A different old failure, or an old failure in a new cycle, cannot
        # claim another migration allowance from the same private root.
        other_url, other_dest = self.seed_legacy_failure('other')
        with patch.object(self.client, 'request') as request:
            for target_url, target, cycle in ((other_url, other_dest, 'original'), (other_url, other_dest, 'next')):
                with self.assertRaisesRegex(ValueError, 'allowance already used'):
                    self.client.download(target_url, target, listed_cycle=cycle)
            request.assert_not_called()
        # Natural next-cycle handling of the original tombstone stays unchanged.
        with patch.object(self.client, 'request', self.reply(b'restored')):
            self.client.download(url, dest, refresh=True, listed_cycle='next')
        self.assertEqual(dest.read_bytes(), b'restored')

    def test_legacy_recheck_does_not_apply_to_other_old_failures(self):
        for i, (body, headers, rc, cycle, endpoint) in enumerate([
            (b'different', None, None, 'one', None),
            (b'{"detail":"Replay not found"}', None, 28, 'one', None),
            (b'Replay not found', 'Content-Length: 999\n', None, 'one', None),
            (b'Replay not found', None, None, None, None),
            (b'Replay not found', None, None, 'one', '/api/other'),
        ]):
            with self.subTest(i=i):
                url, dest = self.seed_legacy_failure(str(i), body, headers, rc)
                if endpoint:
                    state_path = Path(str(dest) + '.part.json')
                    state = dl.load(state_path)
                    state['url'] = state['inflight']['url'] = url = dl.BASE + endpoint
                    dl.save(state_path, state)
                with patch.object(self.client, 'request') as request:
                    with self.assertRaises(ValueError) as caught:
                        self.client.download(url, dest, listed_cycle=cycle)
                    self.assertNotIsInstance(caught.exception, dl.ReplayNotFound)
                    request.assert_not_called()
                self.assertFalse((self.root / 'legacy-404-recheck.json').exists())

    def test_legacy_recheck_200_still_requires_pinned_sha(self):
        url, dest = self.seed_legacy_failure()
        state_path = Path(str(dest) + '.part.json')
        state = dl.load(state_path)
        state['expected_sha256'] = '0' * 64
        dl.save(state_path, state)
        with patch.object(self.client, 'request', self.reply(b'wrong body')):
            with self.assertRaisesRegex(ValueError, 'SHA mismatch'):
                self.client.download(url, dest, expected_sha='0' * 64, listed_cycle='original')
        with patch.object(self.client, 'request') as request:
            with self.assertRaisesRegex(ValueError, 'SHA mismatch'):
                self.client.download(url, dest, expected_sha='0' * 64, listed_cycle='original')
            request.assert_not_called()
        self.assertFalse(dest.exists())

    def test_legacy_recheck_200_still_requires_pinned_size(self):
        url, dest = self.seed_legacy_failure()
        state_path = Path(str(dest) + '.part.json')
        state = dl.load(state_path)
        state['expected_bytes'] = 999
        dl.save(state_path, state)
        with patch.object(self.client, 'request', self.reply(b'wrong size')):
            with self.assertRaisesRegex(ValueError, 'unsuccessful'):
                self.client.download(url, dest, expected_bytes=999, listed_cycle='original')
        with patch.object(self.client, 'request') as request:
            with self.assertRaisesRegex(ValueError, 'unsuccessful'):
                self.client.download(url, dest, expected_bytes=999, listed_cycle='original')
            request.assert_not_called()
        self.assertFalse(dest.exists())

    def test_legacy_recheck_200_matching_old_raw_cleans_failed_journal(self):
        url, dest = self.seed_legacy_failure()
        # The old successful revision and failed refresh can coexist.
        dest.write_bytes(b'restored')
        dl.save(str(dest) + '.receipt.json', dict(url=url, sha256=dl.sha(dest), downloaded_at='old'))
        receipt = Path(str(dest) + '.receipt.json').read_bytes()
        with patch.object(self.client, 'request', self.reply(b'restored')):
            self.client.download(url, dest, refresh=True, listed_cycle='original')
        self.assertEqual(Path(str(dest) + '.receipt.json').read_bytes(), receipt)
        self.assertFalse(Path(str(dest) + '.part.json').exists())
        with patch.object(self.client, 'request', self.reply(b'next revision')):
            self.client.download(url, dest, refresh=True, listed_cycle='next')
        self.assertEqual(dest.read_bytes(), b'next revision')


class DatabaseTests(unittest.TestCase):
    def test_offline_database_default_first_attempt_and_safe_query(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cache = root / 'cache'
            value = bundle()
            path = cache / 'replays/run_test.json'
            dl.save(path, value)
            dl.save(cache / 'projection.json', {'schema': pr.VERSION, 'exports': {}, 'replays': {
                value['run']['run_id']: {'path': 'replays/run_test.json', 'sha256': dl.sha(path)}}})
            result = cli.build_db(root)
            self.assertEqual(result['counts']['plays'], 1)
            self.assertEqual(cli.query(root, 'SELECT card_id,cost_paid FROM first_plays')['rows'], [('TEST_CARD', 1)])
            self.assertEqual(cli.query(root, 'SELECT count(*) FROM decisions')['rows'], [(1,)])
            self.assertEqual(len(cli.boss_plays(root, 'TEST_BOSS')['rows']), 1)
            self.assertEqual(cli.boss_plays(root, "TEST_BOSS' OR 1=1 --")['rows'], [])
            with self.assertRaises(ValueError):
                cli.query(root, 'DELETE FROM runs')
            with self.assertRaises(Exception):
                cli.query(root, "SELECT * FROM read_json_auto('/etc/passwd')")
            cli.build_db(root)
            self.assertEqual(cli.query(root, 'SELECT count(*) FROM plays')['rows'], [(1,)])
            self.assertFalse(cli.audit_cache(cache)['contains_player_identifiers'])


class ProjectTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.index = {'runs': {}, 'exports': {}}
        self.add_replay('single', fixture())

    def add_replay(self, key, events):
        path = self.root / 'raw' / f'{key}.ndjson'
        path.parent.mkdir(exist_ok=True)
        path.write_text(''.join(json.dumps(e) + '\n' for e in events))
        self.index['runs'][key] = dict(META, run_hash=key, path=str(path.relative_to(self.root)), sha256=dl.sha(path))
        dl.save(self.root / 'private-index.json', self.index)

    def add_export(self, rows):
        path = self.root / 'raw/export.gz'
        path.write_bytes(gzip.compress(''.join(json.dumps(row) + '\n' for row in rows).encode()))
        digest = dl.sha(path)
        dl.save(str(path) + '.receipt.json', dict(manifest_verified=True, sha256=digest,
                                                expected_sha256=digest, expected_bytes=path.stat().st_size, bytes=path.stat().st_size))
        self.index['exports']['v0.111.0'] = 'raw/export.gz'
        dl.save(self.root / 'private-index.json', self.index)

    def partial_cycle(self):
        self.index['cycle'] = dict(id='current', complete=False, next=0,
                                   shards=[dict(version='v0.111.0', win=None, page=13)])
        for meta in self.index['runs'].values():
            meta['checked_cycle'] = 'current'
        dl.save(self.root / 'private-index.json', self.index)

    def test_partial_cycle_quarantines_build_mismatch_and_excludes_unverified_inputs(self):
        mismatch = fixture()
        mismatch[0]['build_id'] = '0.1.0'
        self.add_replay('mismatch', mismatch)
        for key in ('stale', 'inflight', 'corrupt', 'absent', 'missing'):
            self.add_replay(key, fixture())
        self.partial_cycle()
        self.index['runs']['stale']['checked_cycle'] = 'old'
        self.index['tombstones'] = {'missing': dict(active=True, checked_cycle='current')}
        dl.save(self.root / 'private-index.json', self.index)
        (self.root / 'raw/inflight.ndjson.part.json').write_text('{}')
        (self.root / 'raw/corrupt.ndjson').write_text('changed')
        (self.root / 'raw/absent.ndjson').unlink()
        before = dl.sha(self.root / 'private-index.json')
        receipt = pr.project(self.root, partial=True)
        self.assertEqual(receipt['replay_count'], 1)
        self.assertTrue(receipt['partial'])
        self.assertEqual(receipt['cutoff_cursor'], dict(shard=1, shards=1, page=13))
        self.assertEqual(receipt['exclusions'], dict(active_tombstone=1, replay_index_build_mismatch=1,
            not_checked_in_current_cycle=1, inflight_replay=1, raw_digest_mismatch=1, missing_raw=1))
        self.assertEqual(dl.sha(self.root / 'private-index.json'), before)
        cli.build_db(self.root)
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM runs')['rows'], [(1,)])
        for result in (cli.audit_cache(self.root / 'cache'), cli.report(self.root)):
            self.assertTrue(result['partial'])
            self.assertEqual(result['exclusions'], receipt['exclusions'])
            self.assertEqual(result['cutoff_cursor'], receipt['cutoff_cursor'])
        self.assertEqual(pr.project(self.root, partial=True)['new_replays'], 0)
        with self.assertRaisesRegex(ValueError, 'build mismatch'):
            pr.replay_bundle(mismatch, META, SALT, 'a' * 64)

    def test_partial_exports_only_include_eligible_replays_and_full_stays_strict(self):
        mismatch = fixture()
        mismatch[0]['build_id'] = '0.1.0'
        self.add_replay('mismatch', mismatch)
        raw = dict(run_hash='single', ascension=10, win=True, build_id='v0.111.0',
                   players=[dict(character='SILENT', deck=[], relics=[])])
        self.add_export([raw, dict(raw, run_hash='mismatch'), dict(raw, run_hash='not-downloaded')])
        self.partial_cycle()
        self.index['tombstones'] = {'absent': dict(active=True, checked_cycle='current')}
        dl.save(self.root / 'private-index.json', self.index)
        with self.assertRaisesRegex(ValueError, 'requires project --partial'):
            pr.project(self.root)
        partial = pr.project(self.root, partial=True)
        self.assertEqual(partial['exports']['v0.111.0']['runs'], 1)
        cli.build_db(self.root)
        # A later manifest cannot silently reuse the old database scope.
        pr.project(self.root, partial=True)
        with self.assertRaisesRegex(ValueError, 'current projection receipt'):
            cli.report(self.root)
        self.index['cycle']['complete'] = True
        dl.save(self.root / 'private-index.json', self.index)
        with self.assertRaisesRegex(ValueError, 'build mismatch'):
            pr.project(self.root)

    def test_partial_requires_cycle_and_never_replaces_original_salt(self):
        with self.assertRaisesRegex(ValueError, 'identified current cycle'):
            pr.project(self.root, partial=True)
        self.partial_cycle()
        pr.project(self.root, partial=True)
        salt = (self.root / 'private-salt').read_bytes()
        pr.project(self.root, partial=True)
        self.assertEqual((self.root / 'private-salt').read_bytes(), salt)

    def test_partial_to_complete_projection_requires_fresh_database(self):
        self.partial_cycle()
        partial = pr.project(self.root, partial=True)
        cli.build_db(self.root)
        self.assertTrue(cli.report(self.root)['partial'])
        self.index['cycle']['complete'] = True
        dl.save(self.root / 'private-index.json', self.index)
        complete = pr.project(self.root)
        self.assertFalse(complete['partial'])
        self.assertEqual(complete['replays'], partial['replays'])
        with self.assertRaisesRegex(ValueError, 'current projection receipt'):
            cli.report(self.root)
        cli.build_db(self.root)
        self.assertFalse(cli.report(self.root)['partial'])

    def test_idempotence_multiplayer_exclusion_and_exact_database_inputs(self):
        multi = fixture()
        multi[0]['player_count'] = 2
        self.add_replay('multi', multi)
        first = pr.project(self.root)
        second = pr.project(self.root)
        self.assertEqual((first['new_replays'], second['new_replays']), (1, 0))
        self.assertEqual(second['exclusions'], {'multiplayer_not_projected': 1})
        self.assertEqual((second['raw_replay_count'], second['replay_count']), (2, 1))
        # A previous generation must not become a second run through globbing.
        dl.save(self.root / 'cache/replays/run_stale.json', bundle())
        cli.build_db(self.root)
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM runs')['rows'], [(1,)])
        self.assertFalse(cli.audit_cache(self.root / 'cache')['contains_player_identifiers'])

    def test_projected_corruption_fails_build_and_project_repairs_it(self):
        receipt = pr.project(self.root)
        entry = next(iter(receipt['replays'].values()))
        path = self.root / 'cache' / entry['path']
        original = path.read_bytes()
        cli.build_db(self.root)
        old_db = dl.sha(self.root / 'cache/replays.duckdb')
        path.write_bytes(original + b' ')
        with self.assertRaisesRegex(ValueError, 'digest mismatch'):
            cli.build_db(self.root)
        self.assertEqual(dl.sha(self.root / 'cache/replays.duckdb'), old_db)
        self.assertEqual(pr.project(self.root)['new_replays'], 1)
        self.assertEqual(path.read_bytes(), original)

    def test_later_replay_failure_keeps_published_database_and_receipt(self):
        pr.project(self.root)
        cli.build_db(self.root)
        old_db = dl.sha(self.root / 'cache/replays.duckdb')
        old_receipt = (self.root / 'cache/database.json').read_bytes()
        self.add_replay('second', fixture())
        pr.project(self.root)
        insert = cli.insert_rows
        seen = []
        def fail_second(con, name, rows, conflict=False):
            if name == 'runs':
                seen.append(rows[0][0])
                if len(seen) == 2:
                    raise ValueError('fixed later replay failure')
            return insert(con, name, rows, conflict)
        with patch.object(cli, 'insert_rows', side_effect=fail_second):
            with self.assertRaisesRegex(ValueError, 'fixed later replay failure'):
                cli.build_db(self.root)
        self.assertEqual(len(seen), 2)
        self.assertEqual(dl.sha(self.root / 'cache/replays.duckdb'), old_db)
        self.assertEqual((self.root / 'cache/database.json').read_bytes(), old_receipt)
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM runs')['rows'], [(1,)])
        cli.build_db(self.root)
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM runs')['rows'], [(2,)])

    def test_large_fixed_export_rows_fit_bounded_memory_and_keep_dedup(self):
        import duckdb
        con = duckdb.connect(config={'threads': 1, 'memory_limit': '128MB'})
        try:
            con.execute('CREATE TABLE export_runs (' + cli.SCHEMA['export_runs'] + ')')
            details = cli.js({'fixed_padding': 'x' * 16384})
            rows = [[f'run_fixed_{i}', 'v0.111.0', True, '[]', '[]', details] for i in range(1000)]
            cli.insert_rows(con, 'export_runs', rows, conflict=True)
            cli.insert_rows(con, 'export_runs', rows, conflict=True)
            self.assertEqual(con.execute('SELECT count(*) FROM export_runs').fetchone()[0], 1000)
            self.assertEqual(con.execute("SELECT min(length(details->>'fixed_padding')) FROM export_runs").fetchone()[0], 16384)
        finally:
            con.close()

    def test_changed_metadata_has_a_new_immutable_projection(self):
        old = pr.project(self.root)
        self.index['runs']['single']['win'] = 0
        dl.save(self.root / 'private-index.json', self.index)
        new = pr.project(self.root)
        old_path = next(iter(old['replays'].values()))['path']
        new_path = next(iter(new['replays'].values()))['path']
        self.assertNotEqual(old_path, new_path)
        self.assertTrue((self.root / 'cache' / old_path).exists())
        cli.build_db(self.root)
        self.assertEqual(cli.query(self.root, 'SELECT win FROM runs')['rows'], [(False,)])

    def test_original_salt_is_required(self):
        pr.project(self.root)
        (self.root / 'private-salt').unlink()
        with self.assertRaisesRegex(ValueError, 'original salt'):
            pr.project(self.root)

    def test_missing_header_fails_without_publishing_a_new_manifest(self):
        pr.project(self.root)
        before = dl.sha(self.root / 'cache/projection.json')
        self.add_replay('broken', [dict(t='end')])
        with self.assertRaisesRegex(ValueError, 'missing replay header'):
            pr.project(self.root)
        self.assertEqual(dl.sha(self.root / 'cache/projection.json'), before)

    def test_export_dedup_shared_identity_nested_privacy_and_manifest_verification(self):
        raw = dict(run_hash='single', seed='private-seed', ascension=10, win=True, build_id='v0.111.0',
                   players=[dict(character='SILENT', deck=[dict(id='TEST_CARD')], relics=[dict(id='TEST_RELIC')])],
                   map_point_history=[[dict(rooms=[dict(model_id={'username': 'nested-private'})], player_stats=[dict(
                       current_hp={'steam_id': 'nested-private'}, card_choices=[dict(card=dict(id='TEST_CARD'), was_picked={'player_token': 'nested-private'})],
                       relic_choices=[dict(choice={'discord_id': 'nested-private'}, was_picked=True)])])]])
        other = dict(raw, ascension=9)
        self.add_export([raw, raw, other])
        result = pr.project(self.root)
        self.assertEqual(result['exports']['v0.111.0']['runs'], 1)
        text = (self.root / 'cache' / result['exports']['v0.111.0']['path']).read_text()
        self.assertNotIn('nested-private', text)
        cli.build_db(self.root)
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM export_runs JOIN runs USING(run_id)')['rows'], [(1,)])
        self.assertEqual(pr.project(self.root)['new_replays'], 0)
        path = self.root / 'raw/export.gz.receipt.json'
        receipt = dl.load(path)
        receipt['expected_sha256'] = '0' * 64
        dl.save(path, receipt)
        before = dl.sha(self.root / 'cache/projection.json')
        with self.assertRaisesRegex(ValueError, 'verification'):
            pr.project(self.root)
        self.assertEqual(dl.sha(self.root / 'cache/projection.json'), before)

    def test_cache_path_cannot_read_private_raw(self):
        with self.assertRaises(ValueError):
            pr.cached_path(self.root / 'cache', '../private-index.json')

    def test_tombstones_exclude_prior_replay_and_export_cache_and_report_denominators(self):
        raw = dict(run_hash='single', seed='private-seed', ascension=10, win=True, build_id='v0.111.0',
                   players=[dict(character='SILENT', deck=[], relics=[])])
        self.add_export([raw, dict(raw, run_hash='other')])
        original = pr.project(self.root)
        old_path = self.root / 'cache' / original['exports']['v0.111.0']['path']
        self.index['cycle'] = dict(id='test', complete=True)
        self.index['tombstones'] = {'single': dict(active=True, checked_cycle='test', observations=[{'private': 'not learner input'}])}
        dl.save(self.root / 'private-index.json', self.index)
        result = pr.project(self.root)
        self.assertEqual((result['replay_count'], result['raw_replay_count']), (0, 0))
        self.assertEqual(result['exports']['v0.111.0']['runs'], 1)
        self.assertNotEqual(result['exports']['v0.111.0']['path'], str(old_path.relative_to(self.root / 'cache')))
        self.assertTrue(old_path.exists())
        self.assertEqual(len(list(pr.json_lines(old_path))), 2)
        cli.build_db(self.root)
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM runs')['rows'], [(0,)])
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM combats')['rows'], [(0,)])
        self.assertEqual(cli.query(self.root, 'SELECT count(*) FROM export_runs')['rows'], [(1,)])
        with patch.object(cli, 'query', return_value={}):
            report = cli.report(self.root)
        self.assertEqual(report['downloaded'].get('replays', 0), 0)
        self.assertEqual(report['replay_availability']['tombstones'], 1)
        self.assertNotIn('single', json.dumps(report))
        self.index['tombstones']['single']['active'] = False
        dl.save(self.root / 'private-index.json', self.index)
        recovered = pr.project(self.root)
        self.assertEqual(recovered['replay_count'], 1)
        self.assertEqual(recovered['exports']['v0.111.0']['runs'], 2)

    def test_list_only_player_label_is_redacted_and_does_not_enter_cache(self):
        events = fixture()
        events[0].pop('username')
        events[6]['options'][0]['label'] = 'visible listed-private-name'
        self.add_replay('single', events)
        meta = dl.metadata_row(dict(META, run_hash='single', username='listed-private-name', player_token='listed-private-token'))
        self.index['runs']['single'].update(meta)
        dl.save(self.root / 'private-index.json', self.index)
        result = pr.project(self.root)
        path = self.root / 'cache' / next(iter(result['replays'].values()))['path']
        self.assertNotIn('listed-private', path.read_text())
        self.assertNotIn('redaction_values', path.read_text())

    def test_audit_rejects_nested_identifier(self):
        with tempfile.TemporaryDirectory() as tmp:
            dl.save(Path(tmp) / 'bad.json', {'a': [{'steam_id': 'private'}]})
            with self.assertRaises(ValueError):
                cli.audit_cache(tmp)


if __name__ == '__main__':
    unittest.main()
