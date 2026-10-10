"""Verify the learner's frozen winner frames against raw offsets without syncing LogDB."""
import collections
import datetime
import hashlib
import json
from pathlib import Path
import sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
SOURCE = ROOT / 'learner/runs/20261010-214303-postmortem'
RUN = '7S8HCC0M6G9W'
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query
import sync

def sha(b):
    return hashlib.sha256(b).hexdigest()

def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

with sync.read_lock(str(ROOT / 'data/logdb'), wait=False) as got:
    assert got, 'Read lock unavailable; no sync attempted'
    manifest = (ROOT / 'data/logdb/manifest.json').read_bytes()
    con = query.connect(str(ROOT / 'data/logdb'), threads=2)
    offsets = con.execute('SELECT off,len FROM frames WHERE run_id=? ORDER BY off', [RUN]).fetchall()
    con.close()
selected = []
for line in (SOURCE / 'states-selected.txt').read_bytes().splitlines(keepends=True):
    n, raw = line.split(b':', 1)
    selected.append((int(n), raw))
assert len(offsets) == len(selected) == 963
proof = []
keep = {350202,350238,350239,350240,350242,350325,350326,350355,350356,350385,350386,350391,350392,350393,350394,350398,350399,350400,350402}
with (ROOT / 'logs/states.jsonl').open('rb') as f:
    for (off, length), (n, expected) in zip(offsets, selected):
        f.seek(off)
        raw = f.read(length)
        assert raw == expected, (off, n)
        row = json.loads(raw)
        assert row['state']['run_id'] == RUN
        proof.append({'line': n, 'offset': off, 'length': length, 'sha256': sha(raw)})
        if n in keep:
            (OUT / f'state-{n}.json').write_bytes(raw)
        if n == 350402:
            final = row
            final_ref = proof[-1]
state = final['state']
assert state['game_over']['is_victory'] is True
cards = state['run']['deck']
assert len(cards) == 39
write('final-deck.json', {'run_id': RUN, 'timestamp': final['ts'], 'source': final_ref,
     'deck_size': len(cards), 'cards': cards, 'counts': dict(collections.Counter(c['name'] for c in cards)),
     'relics': state['run']['relics'], 'max_hp': state['run']['max_hp'],
     'note': 'GAME_OVER current_hp=0 is not combat ending HP; actual F49 exit was 50/122.'})
choices = []
for line in (SOURCE / 'decisions-selected.txt').read_bytes().splitlines(keepends=True):
    n, raw = line.split(b':',1)
    row = json.loads(raw)
    if row.get('decider') == 'codex' and row.get('journal',{}).get('reason'):
        choices.append({'source_line': int(n), 'source_row_sha256': sha(raw), **{k: row.get(k) for k in ['ts','floor','label','decider','journal','chosen','expect','result']}})
write('brain-choices.json', choices)
(OUT / 'learner-lesson-original.md').write_bytes((SOURCE / 'lesson-section.md').read_bytes())
(OUT / 'learner-report-original.json').write_bytes((SOURCE / 'report.json').read_bytes())
write('raw-verification.json', {'run_id': RUN, 'verified_at': datetime.datetime.now().astimezone().isoformat(),
    'frames': len(proof), 'all_learner_frames_equal_original_bytes': True, 'frame_provenance': proof,
    'database_manifest_sha256': sha(manifest), 'database_sync_performed': False,
    'sources': {str(p.relative_to(ROOT)): {'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}
        for p in [SOURCE/'states-selected.txt',SOURCE/'decisions-selected.txt',SOURCE/'lesson-section.md',SOURCE/'report.json']}})
print(json.dumps({'frames_verified':len(proof),'cards':len(cards),'relics':len(state['run']['relics']),'choices':len(choices)}))
