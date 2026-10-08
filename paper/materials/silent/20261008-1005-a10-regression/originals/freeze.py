import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

ROOT = Path('/home/dw/Projects/agent-sts2')
TASK = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query

cutoff = '2026-10-08T01:05:21Z'
db = TASK / 'scratch/frozen-db'
db.mkdir(parents=True, exist_ok=True)
with (ROOT / 'data/logdb/read.lock').open('rb') as lock:
    fcntl.flock(lock, fcntl.LOCK_SH)
    for source in (ROOT / 'data/logdb').rglob('*.parquet'):
        target = db / source.relative_to(ROOT / 'data/logdb')
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            try:
                os.link(source, target)
            except OSError:
                shutil.copyfile(source, target)
    shutil.copyfile(ROOT / 'data/logdb/manifest.json', db / 'manifest.json')
con = query.connect(str(db), threads=2)
def rows(sql, args=[]):
    cur = con.execute(sql, args)
    names = [d[0] for d in cur.description]
    return [dict(zip(names, r)) for r in cur.fetchall()]
def save(name, obj):
    (TASK / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2, default=str) + '\n')
runs = rows("SELECT * FROM runs WHERE character='SILENT' AND ascension=10 ORDER BY started")
save('db-runs.json', runs)
ids = [r['run_id'] for r in runs if r['finished'] and r['ended'].isoformat() < cutoff.rstrip('Z')]
save('fights.json', rows('SELECT * FROM fights WHERE list_contains(?, run_id) ORDER BY run_id, fight_no', [ids]))
save('floors.json', rows('SELECT * FROM floors WHERE list_contains(?, run_id) ORDER BY run_id, floor', [ids]))
save('sl.json', rows('SELECT * FROM sl_attempts WHERE list_contains(?, run_id) ORDER BY off', [ids]))
save('frame-index.json', rows('SELECT off, len, ts, run_id, act, floor, turn, screen, hp, max_hp, deck, relics, potions, player_hp, block, energy, player_powers, enemies, incoming FROM frames WHERE list_contains(?, run_id) ORDER BY off', [ids]))
save('decision-index.json', rows('SELECT * FROM decisions WHERE list_contains(?, run_id) ORDER BY off', [ids]))
logs = TASK / 'scratch/frozen-logs'
logs.mkdir(exist_ok=True)
manifest = {'cutoff_utc': cutoff, 'base': os.popen('git rev-parse HEAD').read().strip(), 'source_logs': str(ROOT / 'logs'), 'eligible_finished_run_ids': ids, 'raw': {}, 'db_manifest_sha256': hashlib.sha256((db / 'manifest.json').read_bytes()).hexdigest()}
for name in ['runs.jsonl', 'run-config.jsonl', 'brain.jsonl', 'codex-calls.jsonl', 'brain-wait.jsonl', 'sl-attempts.jsonl']:
    source = ROOT / 'logs' / name
    size = source.stat().st_size
    kept = []
    digest = hashlib.sha256()
    off = 0
    with source.open('rb') as h, (logs / name).open('wb') as out:
        for raw in h:
            if off + len(raw) > size or not raw.endswith(b'\n'):
                break
            digest.update(raw)
            x = json.loads(raw)
            if x.get('run_id') in ids and x.get('ts', x.get('ended', '')) <= cutoff:
                out.write(raw)
                kept.append({'off': off, 'len': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
            off += len(raw)
    manifest['raw'][name] = {'frozen_prefix_bytes': off, 'prefix_sha256': digest.hexdigest(), 'retained_rows': kept}
save('freeze-manifest.json', manifest)
print(json.dumps({'runs': len(ids), 'excluded_unfinished': [r['run_id'] for r in runs if not r['finished']], 'cutoff': cutoff}))
