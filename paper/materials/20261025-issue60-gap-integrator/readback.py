from pathlib import Path
import hashlib, json, subprocess

R = Path('/home/dw/Projects/agent-sts2')
O = R / 'paper/materials/20261025-issue60-gap-ops'
M = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
manifest = json.loads((O / 'source-and-input-manifest.json').read_text())
diagnosis = json.loads((O / 'gap-diagnosis.json').read_text())
matrix = json.loads((O / 'offline-trigger-matrix.json').read_text())
verified = []
for item in [manifest['frozen_input'], manifest['bound_snapshot'], manifest['offline_selector_worker'], manifest['diagnosis_result']]:
    b = (R / item['path']).read_bytes()
    assert sha(b) == item['sha256'], item['path']
    verified.append(dict(path=item['path'], bytes=len(b), sha256=sha(b)))
for item in manifest['bound_source']:
    b = (R / item['retained_copy']).read_bytes()
    relative = item['path'].removeprefix('.worktrees/live/')
    committed = subprocess.check_output(['git', 'show', item['bound_commit'] + ':' + relative], cwd=R)
    assert sha(b) == sha(committed) == item['sha256']
    verified.append(dict(path=item['retained_copy'], sha256=sha(b), commit=item['bound_commit']))
frozen = json.loads((R / manifest['frozen_input']['path']).read_text())
assert len(frozen['rows']) == len(matrix['rows']) == 34
sources = {}
for row in frozen['rows']:
    s = row['source']
    with (R / s['path']).open('rb') as f:
        f.seek(s['offset']); b = f.read(s['bytes'])
    assert len(b) == s['bytes'] and sha(b) == s['sha256'], row['question_id']
    sources[row['question_id']] = s
for item in diagnosis['metadata']:
    b = (R / item['path']).read_bytes(); entries = json.loads(b)['entries']
    assert sha(b) == item['sha256'] and len(entries) == item['entries']
    assert sum(bool(e.get('topics')) for e in entries) == item['entries_with_any_explicit_topics'] == 0
actual_empty = []
for row in frozen['rows']:
    for call in row['tool_calls']:
        if call['name'] == 'kb_strategies':
            output = json.loads(call['output'])
            assert call['input']['topic'] == 'startup' and output['status'] == 'ok' and output['returned'] == 0
            actual_empty.append(dict(question=row['question_id'], input=call['input'], returned=0))
assert len(actual_empty) == 3
rests = []
by_id = {r['question_id']: r for r in frozen['rows']}
for item in diagnosis['four_rest_opportunities']:
    row = by_id[item['question']]
    assert row['source'] == item['source'] and row['strategy_hint_count'] == 4
    assert not any(c['name'] == 'kb_strategies' for c in row['tool_calls'])
    assert item['legal_HEAL_and_SMITH'] and item['offline_rank'] == 1
    rests.append(dict(question=item['question'], floor=item['floor'], actual_strategy_calls=0, stored_diagnostic_rank=1))
assert len(rests) == 4
for item in diagnosis['original_fight_plan_configs']:
    s = item['source']
    with (R / s['path']).open('rb') as f:
        f.seek(s['offset']); b = f.read(s['bytes'])
    assert len(b) == s['bytes'] and sha(b) == s['sha256']
    x = json.loads(b)
    assert x['loop']['fight_plan'] == item['fight_plan'] == 'off'
assert 'config.fightPlan === "v1"' in (R / '.artifacts/ops-issue60-gap-20261025/bound-source/agent/src/hand/loop.ts').read_text()
assert len(diagnosis['per_target_semantic_disposition']) == 13
assert not diagnosis['actual_returned_but_unreferenced_cases']
result = dict(at=subprocess.check_output(['date','-Is'],text=True).strip(), authority=6394486093, ops_comment=6394570207,
              verified_inputs=verified, original_brain_slices=34, original_configs_verified=4,
              metadata_counts=[dict(entries=x['entries'], explicit_topics=0) for x in diagnosis['metadata']],
              actual_empty_topic_calls=actual_empty, rest_opportunities=rests,
              consumer_config='off', source_gate_verified=True, stored_semantic_dispositions=13,
              offline_selector_reruns=0, product_queries=0, model_calls=0, source_writes=0,
              limits='Stored offline ranks/semantic classifications audited against frozen sources; no new selector run and no offline result claimed as an actual tool return. No target returned-but-unused instance proven.',
              owner_workitems=json.loads((O/'owner-workitems.json').read_text())['items'],
              issue64_not_blocked=True, issue65_scope_unchanged=True)
(M / 'independent-readback.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['at','original_brain_slices','original_configs_verified','metadata_counts','consumer_config','offline_selector_reruns','issue64_not_blocked']},ensure_ascii=False))
