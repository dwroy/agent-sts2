from pathlib import Path
from collections import Counter
import hashlib
import json
import sqlite3
import subprocess
from datetime import datetime

R = Path('/home/dw/Projects/agent-sts2')
O = R / 'paper/materials/20261025-issue60-natural1408-ops'
M = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda x: json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
load = lambda n: json.loads((O / n).read_text())
d = load('natural-window-readback.json')
s = load('natural-successor-same-window.json')
db = load('database-and-business-readback.json')
c = load('natural-config-readback.json')
K = 'K1-04b03e8483afb3061eb9a060055313cfc614cab79a0928b7c14bdf4c3853e7a4'

def original(ref):
    with (R / ref['path']).open('rb') as f:
        f.seek(ref['offset'])
        b = f.read(ref['bytes'])
    assert len(b) == ref['bytes'] and sha(b) == ref['sha256'], ref
    return json.loads(b)

snapshots = {}
for name, ref in d['source_snapshots'].items():
    b = (R / ref['path']).read_bytes()
    assert sha(b) == ref['sha256'] and len(b) == ref['bytes']
    snapshots[name] = {x['id']: x for x in json.loads(b)['entries']}
    assert len(snapshots[name]) == ref['entries']
assert snapshots['121'] == snapshots['bound']
new114 = set(snapshots['114']) - set(snapshots['114before'])
changed121 = {k for k, v in snapshots['121'].items() if snapshots['114'].get(k) != v}
assert len(new114) == 8 and len(changed121) == 5
assert new114 | changed121 == set(d['exact_new_targets'])
for key, target in d['exact_new_targets'].items():
    entry = snapshots['bound'][key]
    assert entry['version'] == target['version'] and sha(canonical(entry)) == target['entry_sha256']

start, end = d['frozen_brain_start'], d['frozen_brain_end']
with (R / 'logs/brain.jsonl').open('rb') as f:
    f.seek(start)
    frozen = f.read(end - start)
assert len(frozen) == end - start and frozen.endswith(b'\n')
raw = [json.loads(x) for x in frozen.splitlines()]
old = [x for x in raw if x.get('run_id') == d['run']]
successor = [x for x in raw if x.get('run_id') == s['run']]
assert len(old) == 32 and len(successor) == 2
for refs, rows in [(d['brain_rows'], old), (s['accepted_rows'], successor)]:
    assert {x['question'] for x in refs} == {x['question_id'] for x in rows}
    for ref in refs:
        row = original(ref['source'])
        assert row['accepted'] and row['question_id'] == ref['question']
assert all('runtime_version' not in r['knowledge'] for r in old)

def queries(rows):
    result = []
    for row in rows:
        assert not any(t in json.dumps(row['answer'], ensure_ascii=False) for t in d['exact_new_targets'])
        for index, call in enumerate(row['tool_calls']):
            if not call['name'].startswith('kb_'):
                continue
            out = json.loads(call['output']) if isinstance(call['output'], str) else call['output']
            assert out['knowledge_version'] == K and out['status'] == 'ok'
            entries = out.get('entries', [])
            assert not any(e.get('id') in d['exact_new_targets'] and e.get('version') == d['exact_new_targets'][e['id']]['version'] for e in entries)
            assert not any(z.get('entry_id') in d['exact_new_targets'] for z in out.get('sources', []))
            result.append(dict(question=row['question_id'], index=index, name=call['name'], input=call['input'], version=out['knowledge_version'], output_sha256=sha(call['output'].encode()) if isinstance(call['output'], str) else sha(canonical(call['output'])), returned=len(entries)))
    return result

q, sq = queries(old), queries(successor)
assert len(q) == 23 and len(sq) == 3
assert Counter(x['name'] for x in q) == dict(kb_strategies=2, kb_experience=15, kb_open_book=5, kb_vocab=1)
unique = {(x['question'], x['name'], canonical(x['input'])) for x in q}
assert len(unique) == 21
strategies = [x for x in q if x['name'] == 'kb_strategies']
assert len({(x['question'], canonical(x['input'])) for x in strategies}) == 1
assert all(x['question'] == old[0]['question_id'] and x['returned'] == 0 for x in strategies)
assert sum(x['label'] == 'rest/plan' for x in old) == 8
for proof, actual in zip(d['actual_kb_queries'], q):
    assert proof['question'] == actual['question'] and proof['name'] == actual['name'] and proof['input'] == actual['input']
    assert proof['tool_index'] == actual['index'] and proof['output_sha256'] == actual['output_sha256']
terminal = original(d['natural_run_result'][0]['source'])
assert terminal == d['natural_run_result'][0]['record'] and terminal['floor'] == 33 and not terminal['victory']

con = sqlite3.connect('file:' + str(R / db['database']) + '?mode=ro', uri=True)
con.row_factory = sqlite3.Row
con.execute('PRAGMA query_only=ON')
con.execute('BEGIN')
assert con.execute("select value from metadata where key='current'").fetchone()[0] == K
for table, key, proofs in [('releases', 'version', db['three_knowledge_releases']), ('candidates', 'id', db['original_two_candidates']), ('events', 'request', db['exact_original_publish_events']), ('run_bindings', 'run_id', db['current_run_bindings'] + s['SQL_binding'])]:
    for proof in proofs:
        rows = con.execute(f'SELECT * FROM {table} WHERE {key}=?', (proof[key],)).fetchall()
        assert len(rows) == 1
        actual = dict(rows[0])
        assert all(actual[k] == v for k, v in proof.items()), (table, proof[key])
for proof in c['configs']:
    row = original(proof['source'])
    assert row['run_id'] == proof['run_id'] and row['knowledge'] == proof['knowledge']
    knowledge = row['knowledge']
    assert knowledge['runtime_version'] == K
    binding = con.execute('SELECT version,code FROM run_bindings WHERE run_id=?', (knowledge['runtime_binding'],)).fetchone()
    assert binding['version'] == K and binding['code'] == 'e9a468882a4fe1da2b1b721f0271b82f6083b002'
con.rollback()
con.close()
proc = Path('/proc/106717')
assert proc.exists()
stat = (proc / 'stat').read_text().split(') ', 1)[1].split()
assert stat[19] == '33091291' and 'autoplay.sh' in (proc / 'cmdline').read_bytes().decode().replace('\0', ' ')
assert not Path('/proc/107318').exists()
result = dict(at=datetime.now().astimezone().isoformat(), ops_receipt=6394272248, read_only=True, frozen_window=dict(start=start, end=end, sha256=sha(frozen)), source_proofs={p.name:sha(p.read_bytes()) for p in O.glob('*.json')}, original_slices_verified=32+2+len(c['configs'])+1, snapshots_verified=4, target_payloads_verified=13, terminal=terminal, accepted=32, physical_queries=23, query_groups=21, strategy_calls=2, strategy_opportunities=1, rest_plan_questions=8, no_later_strategy_queries=True, target_correct_version_hits=0, explicit_target_ID_answer_references=0, tool_versions={K:23}, queries=q, successor=dict(run=s['run'], accepted=2, physical_queries=3, target_hits=0, queries=sq), sql_old_bindings_and_publish_events_equal=True, original_autoplay_identity_verified=True, old_play_absent=True, live_head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R/'.worktrees/live').decode().strip(), limitations=['Original brain runtime_version absent; version checked from original output/config/SQL.', 'Original run-config ENOBUFS and terminal code=current preserved.', 'Zero explicit IDs does not prove absence of implicit use; no causal adoption or benefit established.', 'Frozen successor two-question window only; later natural turns not polled.', 'No product query, model, game, publish, close, retry, or full-check operation.'])
(M / 'independent-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['queries','source_proofs','terminal','successor']},ensure_ascii=False))
