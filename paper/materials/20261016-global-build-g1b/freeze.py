#!/usr/bin/env python3
"""Freeze existing records only; no model, simulator, game, or source-log writes."""
import datetime as dt
import hashlib
import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / 'inputs'
START, END = 1543954084, 1823764592


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    OUT.mkdir(exist_ok=True)
    if (OUT / 'manifest.json').exists():
        raise SystemExit('already frozen: preserve inputs; use a new dated export directory')
    sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
    import query
    import sync as logsync
    gap = ROOT / 'paper/materials/20261016-global-build-gap/inputs'
    exported = json.loads((gap / 'runs-since-20261012.json').read_text())
    rows = [dict(zip(exported['columns'], row)) for row in exported['rows']]
    runs = [row for row in rows if row['finished'] and row['character'] == 'SILENT' and row['ascension'] == 10]
    ids = sorted({r['run_id'] for r in runs})
    # IDs originate in the frozen export, not from user-entered SQL fragments.
    in_ids = ','.join("'" + rid.replace("'", "''") + "'" for rid in ids)
    db = str(ROOT / 'data/logdb')
    exports = {}
    with logsync.read_lock(db, shared=True):
        con = query.connect(db, threads=2)
        manifest_bytes = (Path(db) / 'manifest.json').read_bytes()
        (OUT / 'logdb-manifest.json').write_bytes(manifest_bytes)
        for table, order in [('fights', 'run_id,fight_no'), ('sl_attempts', 'run_id,ts,off'),
                             ('floors', 'run_id,floor'), ('run_config', 'run_id,ts,off')]:
            sql = f'SELECT * FROM {table} WHERE run_id IN ({in_ids}) ORDER BY {order}'
            result = query.run_query(con, sql, max_rows=20000, timeout=60)
            if result.get('error') or result.get('truncated'):
                raise SystemExit(f'incomplete {table} export: {result}')
            path = OUT / f'{table}.json'
            path.write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n')
            exports[table] = {'sql': sql, 'rows': result['row_count'], 'sha256': digest(path)}
        con.close()
    source = ROOT / 'logs/decisions.jsonl'
    window_hash = hashlib.sha256()
    index = []
    selected = OUT / 'decisions.jsonl.gz'
    selected_hash = hashlib.sha256()
    with source.open('rb') as handle, selected.open('wb') as compressed, gzip.GzipFile(fileobj=compressed, mode='wb', mtime=0) as target:
        handle.seek(START)
        while handle.tell() < END:
            offset = handle.tell()
            raw = handle.readline()
            if not raw or handle.tell() > END or not raw.endswith(b'\n'):
                raise SystemExit(f'incomplete fixed byte window at {offset}')
            window_hash.update(raw)
            if b'"boss_sim"' not in raw:
                continue
            row = json.loads(raw)
            bs = row.get('boss_sim')
            if not isinstance(bs, dict) or not (bs.get('s_ranking') or bs.get('build_ranking')):
                continue
            # Keep only structured simulation/selection facts; never copy prompts or credentials.
            keep = {key: row.get(key) for key in ('ts', 'run_id', 'floor', 'turn', 'sl_attempt',
                     'decision_id', 'boss_sim', 'answers', 'selection_audit', 'result')}
            keep['_source'] = {'off': offset, 'len': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
            frozen = (json.dumps(keep, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
            target.write(frozen)
            selected_hash.update(frozen)
            index.append({'off': offset, 'len': len(raw), 'sha256': keep['_source']['sha256']})
    for name in ('runs-since-20261012.json', 'sl-first-failed-attempt.json'):
        (OUT / name).write_bytes((gap / name).read_bytes())
    manifest = {'at': dt.datetime.now().astimezone().isoformat(), 'source': str(source.relative_to(ROOT)),
                'window': [START, END], 'window_sha256': window_hash.hexdigest(),
                'selected_rows': len(index), 'selected_sha256': selected_hash.hexdigest(),
                'selected_compression': {'path': selected.name, 'sha256': digest(selected),
                                         'uncompressed_sha256': selected_hash.hexdigest(), 'format': 'gzip deterministic mtime=0'},
                'logdb_manifest_sha256': hashlib.sha256(manifest_bytes).hexdigest(), 'exports': exports,
                'frozen_run_ids': ids, 'raw_row_index': index, 'no_sync_no_new_games_no_models': True}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({k: manifest[k] for k in ('at', 'window', 'selected_rows', 'window_sha256')}))


if __name__ == '__main__':
    main()
