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
            return status, h or {'content-length': str(len(content)), 'etag': 'test-etag'}, rc
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
                                                expected_sha256=digest, expected_bytes=path.stat().st_size))
        self.index['exports']['v0.111.0'] = 'raw/export.gz'
        dl.save(self.root / 'private-index.json', self.index)

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
