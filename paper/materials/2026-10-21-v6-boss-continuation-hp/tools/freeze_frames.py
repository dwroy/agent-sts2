import datetime
import gzip
import hashlib
import json
from pathlib import Path

root = Path('/home/dw/Projects/agent-sts2')
out = Path('paper/materials/2026-10-21-v6-boss-continuation-hp/evidence')
digest = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda s: json.dumps(s, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()
questions = []
for source in json.loads((out / 'sources.json').read_text()):
    j = json.loads(gzip.decompress((out / (source['name'] + '.gz')).read_bytes()))
    questions.append({'source': source['name'], 'state_sha256': digest(canonical(j['question']['state'])), 'matches': []})
by_state = {}
for q in questions:
    by_state.setdefault(q['state_sha256'], []).append(q)
path = root / 'logs/states.jsonl'
cutoff = path.stat().st_size
start = max(0, cutoff - 64 * 1024 * 1024)
frames = []
with path.open('rb') as f:
    f.seek(start)
    if start:
        f.readline()
    while f.tell() < cutoff:
        offset = f.tell()
        raw = f.readline()
        if offset + len(raw) > cutoff or not raw.endswith(b'\n'):
            break
        if b'CEN1Z8HEU7NM' not in raw:
            continue
        j = json.loads(raw)
        s = j.get('state', {})
        if s.get('run_id') != 'CEN1Z8HEU7NM':
            continue
        sha = digest(canonical(s))
        meta = {'offset': offset, 'bytes': len(raw), 'sha256': digest(raw), 'state_sha256': sha,
                'ts': j.get('ts'), 'screen': s.get('screen'), 'floor': s.get('run', {}).get('floor')}
        frames.append(meta)
        matches = by_state.get(sha, [])
        if matches:
            name = f'states-{offset}.jsonl.gz'
            (out / name).write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
            for q in matches:
                q['matches'].append({**meta, 'file': name})
console = root / 'logs/console/20261021-080646-cf4aff4ce+dirty.log'
with console.open('rb') as f:
    size = console.stat().st_size
    raw = f.read(size)
(out / 'console-prefix.log.gz').write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
report = {'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'states': {'path': str(path.relative_to(root)), 'cutoff_bytes': cutoff, 'scan_start': start,
                     'rows': len(frames), 'first': frames[0] if frames else None, 'last': frames[-1] if frames else None},
          'questions': questions,
          'console': {'path': str(console.relative_to(root)), 'prefix_bytes': len(raw), 'sha256': digest(raw),
                      'nonpositive_hp_error_lines': sum(b'worker: Error: missing successful first-fight resources: nonpositive-hp' in l for l in raw.splitlines())}}
(out / 'frames-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'states_rows': len(frames), 'questions': len(questions),
                  'matched': sum(bool(q['matches']) for q in questions), 'console': report['console']}, ensure_ascii=False))
