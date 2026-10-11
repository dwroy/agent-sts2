"""Read-only recent forty-run F48 deck-size audit; no database sync."""
import collections, datetime, hashlib, json, sys
from pathlib import Path
OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path[:0] = [str(ROOT / 'agent/tools/logdb'), str(ROOT / 'eval')]
import query, sync, brain_source

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

runs_raw = (ROOT / 'logs/runs.jsonl').read_bytes()
ends = {r['run_id']: r for line in runs_raw.splitlines()
        if (r := json.loads(line)).get('character') == 'SILENT' and r.get('ascension') == 10}
recent = sorted(ends.values(), key=lambda r: r['ended'], reverse=True)[:50]
ids = [r['run_id'] for r in recent]
with sync.read_lock(str(ROOT / 'data/logdb'), wait=False) as got:
    assert got, 'Read lock busy'
    manifest = (ROOT / 'data/logdb/manifest.json').read_bytes()
    (OUT / 'logdb-manifest.json').write_bytes(manifest)
    con = query.connect(str(ROOT / 'data/logdb'), threads=2)
    def select(sql):
        cur = con.execute(sql, [ids])
        names = [c[0] for c in cur.description]
        return [{k: query.plain(v) for k, v in zip(names, row)} for row in cur.fetchall()]
    brain_refs = select("SELECT run_id,off,len FROM llm_calls_raw WHERE src='brain' AND list_contains(?,run_id) ORDER BY off")
    final_refs = select("SELECT run_id,off,len FROM frames WHERE list_contains(?,run_id) AND deck_size>0 QUALIFY row_number() OVER(PARTITION BY run_id ORDER BY off DESC)=1")
    f48_refs = select("SELECT run_id,off,len FROM frames WHERE list_contains(?,run_id) AND floor=48 AND screen='COMBAT' AND deck_size>0 AND len(enemies)>0 QUALIFY row_number() OVER(PARTITION BY run_id ORDER BY off ASC)=1")
    con.close()
proof = []
def read_refs(name, refs):
    out = collections.defaultdict(list)
    with (ROOT / 'logs' / name).open('rb') as f:
        for ref in refs:
            f.seek(ref['off']); raw = f.read(ref['len']); r = json.loads(raw)
            rid = r['state']['run_id'] if name == 'states.jsonl' else r['run_id']
            assert rid == ref['run_id']
            proof.append(dict(file=name, run_id=rid, off=ref['off'], len=ref['len'], sha256=sha(raw)))
            out[rid].append(r)
    return out
brains = read_refs('brain.jsonl', brain_refs)
finals = read_refs('states.jsonl', final_refs)
f48s = read_refs('states.jsonl', f48_refs)
rows = []
for end in recent:
    rid = end['run_id']; state = finals[rid][-1]['state']; run = state['run']
    assert state['screen'] == 'GAME_OVER', (rid, state['screen'])
    assert run['floor'] == end['floor']
    assert state['game_over']['is_victory'] == end['victory']
    reached = end['floor'] >= 48
    assert reached == bool(f48s[rid]), (rid, reached, len(f48s[rid]))
    f48 = f48s[rid][0]['state'] if reached else None
    rows.append(dict(run_id=rid, ended=end['ended'], victory=end['victory'], final_floor=end['floor'],
                     final_deck_size=len(run['deck']), final_deck=run['deck'],
                     reached_f48=reached, f48_entry_deck_size=len(f48['run']['deck']) if f48 else None,
                     f48_entry_deck=f48['run']['deck'] if f48 else None,
                     brain_source=brain_source.classify(brains[rid])))
pure = [r for r in rows if r['brain_source']['eligible']][:40]
raw = rows[:40]
assert len(pure) == len(raw) == 40
snapshot = dict(recorded_at=datetime.datetime.now().astimezone().isoformat(),
                runs_source_sha256=sha(runs_raw), manifest_sha256=sha(manifest), sync_performed=False,
                source_policy_sha256=sha((ROOT / 'eval/brain_source.py').read_bytes()),
                pure_latest40_ids=[r['run_id'] for r in pure], raw_latest40_ids=[r['run_id'] for r in raw],
                rows=rows, raw_provenance=proof)
save('snapshot.json', snapshot)
def stats(group):
    large = [r for r in group if r['final_deck_size'] >= 32]
    small = [r for r in group if r['final_deck_size'] < 32]
    reached = [r for r in group if r['reached_f48']]
    return dict(n=len(group), wins=sum(r['victory'] for r in group), reached_f48=len(reached),
                final_32_plus_n=len(large), final_32_plus_reached=sum(r['reached_f48'] for r in large),
                final_under32_n=len(small), final_under32_reached=sum(r['reached_f48'] for r in small),
                f48_rows=[{k:r[k] for k in ['run_id','ended','final_floor','victory','final_deck_size','f48_entry_deck_size']} for r in reached],
                counterexamples=[r['run_id'] for r in reached if r['final_deck_size'] < 32],
                entry_counterexamples=[r['run_id'] for r in reached if r['f48_entry_deck_size'] < 32])
summary = dict(pure=stats(pure), raw=stats(raw))
save('summary.json', summary)
print(json.dumps(summary, ensure_ascii=False, indent=2))
