"""Spire Codex offline intake/query CLI. Never used by the live brain."""
import argparse
import collections
import json
import os
from pathlib import Path
import sys

try:
    from .spire_codex_download import DEFAULT_ROOT, load, locked, save, sha, sync
    from .spire_codex_projection import VERSION, json_lines, project
except ImportError:
    from spire_codex_download import DEFAULT_ROOT, load, locked, save, sha, sync
    from spire_codex_projection import VERSION, json_lines, project


def js(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


SCHEMA = {
    'runs': 'run_id VARCHAR PRIMARY KEY, build_id VARCHAR, character VARCHAR, ascension INTEGER, win BOOLEAN, prefix_missing BOOLEAN, capture_status VARCHAR, final_deck JSON, final_relics JSON, details JSON',
    'export_runs': 'run_id VARCHAR PRIMARY KEY, build_id VARCHAR, win BOOLEAN, final_deck JSON, final_relics JSON, details JSON',
    'combats': 'run_id VARCHAR, combat_key VARCHAR PRIMARY KEY, combat_id VARCHAR, encounter VARCHAR, floor INTEGER, act INTEGER, attempt_id INTEGER, attempt_kind VARCHAR, result VARCHAR, turns INTEGER, hp_lost INTEGER, default_eligible BOOLEAN, details JSON',
    'turns': 'run_id VARCHAR, combat_key VARCHAR, line INTEGER, turn INTEGER, energy INTEGER, hand JSON, hand_basis VARCHAR, enemies JSON, details JSON',
    'plays': 'run_id VARCHAR, combat_key VARCHAR, line INTEGER, turn INTEGER, play_order INTEGER, card_id VARCHAR, target VARCHAR, cost_paid INTEGER, upgrade INTEGER, details JSON',
    'potions': 'run_id VARCHAR, combat_key VARCHAR, line INTEGER, turn INTEGER, kind VARCHAR, potion_id VARCHAR, target VARCHAR, details JSON',
    'decisions': 'run_id VARCHAR, combat_key VARCHAR, line INTEGER, segment INTEGER, decision_id INTEGER, decision_type VARCHAR, options JSON, outcomes JSON, details JSON',
    'events': 'run_id VARCHAR, combat_key VARCHAR, line INTEGER, turn INTEGER, kind VARCHAR, details JSON',
}


def table_rows(bundle):
    out = {k: [] for k in SCHEMA}
    r = bundle['run']
    out['runs'].append([r['run_id'], r['build_id'], r['character'], r['ascension'], r['win'],
                        r['prefix_missing'], r['capture_status'], js(r['final_deck']), js(r['final_relics']), js(r)])
    for c in bundle['combats']:
        out['combats'].append([c['run_id'], c['combat_key'], c['combat_id'], c['encounter'], c['floor'], c['act'],
                               c['attempt_id'], c['attempt_kind'], c['result'], c['turns'], c['hp_lost'], c['default_eligible'], js(c)])
    hand, energy, intents, current = {}, None, {}, None
    decisions = {}
    order = collections.Counter()
    for row in bundle['events']:
        e, key = row['event'], row['combat_key']
        t, line, turn = e['t'], row['line'], row['turn']
        base = [row['run_id'], key, line, turn]
        out['events'].append(base + [t, js(e)])
        if key != current or t in ('resume', 'remap', 'combat_start'):
            hand, energy, intents, current = {}, None, {}, key
        if t == 'energy':
            energy = e.get('energy')
        if t == 'draw' and 'c' in e:
            hand[e['c']] = {k: e[k] for k in ('c', 'id', 'up') if k in e}
        if t in ('play', 'discard', 'exhaust'):
            hand.pop(e.get('c'), None)
        if t == 'flush':
            keep = set(e.get('retained_c', []))
            hand = {k: v for k, v in hand.items() if k in keep}
        if t == 'intent':
            intents[str(e.get('src_cid', e.get('src')))] = e
        if t == 'turn' and e.get('side') == 'player':
            out['turns'].append(base + [e.get('energy', energy), js(e.get('hand', list(hand.values()))),
                                       'snapshot' if 'hand' in e else 'observed_draws_partial',
                                       js(e.get('enemies', list(intents.values()))), js(e)])
        if t == 'play':
            order[(key, turn)] += 1
            out['plays'].append(base + [order[(key, turn)], e.get('id'), e.get('target'), e.get('cost_paid'), e.get('up'), js(e)])
        if t.startswith('potion_'):
            out['potions'].append(base + [t, e.get('id'), e.get('target'), js(e)])
        did = (row['segment'], e.get('decision_id'))
        if t == 'decision':
            item = [row['run_id'], key, line, row['segment'], e.get('decision_id'), e.get('decision_type'),
                    js(e.get('options')), [], js(e)]
            out['decisions'].append(item)
            decisions[did] = item
        elif e.get('decision_id') is not None and did in decisions:
            decisions[did][7].append(e)
    for row in out['decisions']:
        row[7] = js(row[7])
    return out


def audit_cache(cache):
    """Audit recursive keys and schema. Raw URL/hash/seed/player columns are forbidden."""
    import re
    denied = re.compile(r'username|player_token|^player_id$|^players$|^player_stats$|steam|discord|account|email|run_hash|^seed$|rng_state', re.I)
    count = 0

    def check(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if denied.search(k):
                    raise ValueError('identifier field in learning cache')
                check(v)
        elif isinstance(x, list):
            for v in x:
                check(v)
    for path in sorted(Path(cache).rglob('*')):
        if path.suffix not in ('.json', '.jsonl'):
            continue
        for x in json_lines(path):
            check(x)
            count += 1
    return {'contains_player_identifiers': False, 'documents_audited': count}


def build_db(root):
    import duckdb
    root = Path(root)
    with locked(root):
        cache = root / 'cache'
        receipt = load(cache / 'projection.json')
        if not receipt or receipt['schema'] != VERSION:
            raise ValueError('current projection receipt is required')
        audit = audit_cache(cache)
        tmp = cache / 'replays.build.duckdb'
        tmp.unlink(missing_ok=True)
        con = duckdb.connect(str(tmp), config={'threads': 1, 'memory_limit': '512MB'})
        counts = collections.Counter()
        try:
            con.execute('BEGIN')
            for name, columns in SCHEMA.items():
                con.execute(f'CREATE TABLE {name} ({columns})')
            for path in sorted((cache / 'replays').glob('run_*.json')):
                bundle = load(path)
                if bundle.get('schema') != VERSION:
                    raise ValueError('mixed projection versions')
                for name, rows in table_rows(bundle).items():
                    if rows:
                        con.executemany(f'INSERT INTO {name} VALUES ({",".join("?" for _ in rows[0])})', rows)
                        counts[name] += len(rows)
            for export in receipt['exports'].values():
                path = cache / export['path']
                if sha(path) != export['sha256']:
                    raise ValueError('projected export digest mismatch')
                batch = []
                for row in json_lines(path):
                    batch.append([row['run_id'], row['build_id'], row['win'], js(row['final_deck']), js(row['final_relics']), js(row)])
                    if len(batch) == 1000:
                        con.executemany('INSERT INTO export_runs VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING', batch)
                        batch = []
                if batch:
                    con.executemany('INSERT INTO export_runs VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING', batch)
            con.execute('CREATE VIEW first_combats AS SELECT * FROM combats WHERE default_eligible')
            con.execute('CREATE VIEW first_plays AS SELECT p.* FROM plays p JOIN first_combats c USING(combat_key)')
            con.execute('COMMIT')
            con.execute('CHECKPOINT')
        finally:
            con.close()
        os.replace(tmp, cache / 'replays.duckdb')
        result = dict(schema=VERSION, counts=dict(counts), audit=audit, database_sha256=sha(cache / 'replays.duckdb'))
        save(cache / 'database.json', result)
        return result


def query(root, sql, limit=200):
    import duckdb
    con = duckdb.connect(str(Path(root) / 'cache/replays.duckdb'), read_only=True,
                         config={'threads': 1, 'memory_limit': '512MB', 'enable_external_access': False})
    try:
        statements = con.extract_statements(sql)
        if len(statements) != 1 or statements[0].type != duckdb.StatementType.SELECT:
            raise ValueError('one SELECT statement is required')
        cur = con.execute(sql)
        rows = cur.fetchmany(limit + 1)
        return dict(columns=[x[0] for x in cur.description], rows=rows[:limit], truncated=len(rows) > limit)
    finally:
        con.close()


def report(root):
    index = load(Path(root) / 'private-index.json', {})
    downloaded = collections.Counter()
    for meta in index.get('runs', {}).values():
        path = Path(root) / meta['path']
        downloaded['replays'] += 1
        downloaded['wins'] += int(bool(meta['win']))
        downloaded['v0.111_replays'] += int(str(meta['build_id']).startswith('v0.111.'))
        downloaded['replay_bytes'] += path.stat().st_size
    exports = {}
    for version, relative in index.get('exports', {}).items():
        path = Path(root) / relative
        receipt = load(Path(str(path) + '.receipt.json'))
        exports[version] = {k: receipt[k] for k in ('bytes', 'sha256', 'expected_sha256', 'expected_bytes', 'manifest_verified')}
        downloaded['export_bytes'] += receipt['bytes']
    downloaded['total_bytes'] = downloaded['replay_bytes'] + downloaded['export_bytes']
    return dict(
        downloaded=dict(downloaded), export_verification=exports,
        scan_complete=index.get('cycle', {}).get('complete', False),
        scan_versions=index.get('cycle', {}).get('versions'),
        runs=query(root, 'SELECT build_id,count(*) AS runs,count(*) FILTER(WHERE win) AS wins FROM runs GROUP BY 1', 100),
        combats=query(root, 'SELECT encounter,attempt_kind,count(*) AS combats,count(*) FILTER(WHERE default_eligible) AS default_eligible FROM combats GROUP BY 1,2 ORDER BY 1,2', 1000),
        attempts=query(root, 'SELECT count(*) AS total,count(*) FILTER(WHERE attempt_kind=\'first\') AS first,count(*) FILTER(WHERE attempt_kind=\'retry\') AS retry,count(*) FILTER(WHERE attempt_kind=\'unknown\') AS unknown,count(*) FILTER(WHERE result IS NULL) AS missing_result FROM combats'),
        exports=query(root, 'SELECT build_id,count(*) AS runs,count(*) FILTER(WHERE win) AS wins FROM export_runs GROUP BY 1', 100),
        projection=load(Path(root) / 'cache/projection.json'),
        database=load(Path(root) / 'cache/database.json'))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    sub = p.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('download')
    d.add_argument('--version', action='append', help='replay build shard (default: all manifest builds)')
    d.add_argument('--export-version', action='append', help='default v0.111.0')
    d.add_argument('--no-export', action='store_true')
    d.add_argument('--max-pages', type=int)
    sub.add_parser('project')
    sub.add_parser('build-db')
    sub.add_parser('audit')
    sub.add_parser('report')
    q = sub.add_parser('query')
    q.add_argument('sql')
    q.add_argument('--limit', type=int, default=200)
    args = p.parse_args()
    try:
        if args.cmd == 'download':
            result = sync(args.root, args.version, args.max_pages,
                          () if args.no_export else (args.export_version or ('v0.111.0',)))
        elif args.cmd == 'project':
            result = project(args.root)
        elif args.cmd == 'build-db':
            result = build_db(args.root)
        elif args.cmd == 'audit':
            result = audit_cache(args.root / 'cache')
        elif args.cmd == 'report':
            result = report(args.root)
        else:
            if not 1 <= args.limit <= 10000:
                raise ValueError('limit must be 1..10000')
            result = query(args.root, args.sql, args.limit)
        print(js(result))
    except Exception as e:
        # No raw URLs, source rows or player fields in a public CLI failure.
        print(js({'error': type(e).__name__, 'message': str(e) if isinstance(e, ValueError) else 'operation failed; inspect private local state'}), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
