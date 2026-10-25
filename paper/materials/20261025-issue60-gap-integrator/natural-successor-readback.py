from pathlib import Path
import hashlib, json, subprocess
from collections import Counter

R = Path('/home/dw/Projects/agent-sts2')
O = R/'paper/materials/20261025-issue60-natural1454-ops'
M = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
x = json.loads((O/'incremental-natural-readback.json').read_text())
v = json.loads((O/'new-vakuu-literal-scope.json').read_text())
frozen = json.loads((R/'.artifacts/ops-issue60-gap-20261025/frozen-input.json').read_text())
targets = set(frozen['targets'])
assert len(targets) == 13
originals = {}
def raw(s):
    with (R/s['path']).open('rb') as f:
        f.seek(s['offset']); b = f.read(s['bytes'])
    assert len(b) == s['bytes'] and sha(b) == s['sha256']
    return json.loads(b)
for row in x['rows']:
    r = raw(row['source'])
    assert r['question_id'] == row['q'] and r['run_id'] == row['run'] and r['accepted']
    originals[row['q']] = r
assert len(originals) == x['accepted'] == 40
calls = []
for c in x['actual_kb_calls']:
    r = originals[c['q']]; original = r['tool_calls'][c['tool_index']]
    assert original['name'] == c['name'] and original['input'] == c['input']
    assert sha(original['output'].encode()) == c['output_sha256']
    output = json.loads(original['output'])
    assert output['status'] == c['status'] == 'ok'
    assert output['knowledge_version'] == c['knowledge_version'] == frozen['version']
    assert not c['target_matches'] and not any(t in original['output'] for t in targets)
    calls.append((c['q'],c['name'],json.dumps(c['input'],ensure_ascii=False,sort_keys=True)))
assert len(calls) == 39 and len(set(calls)) == x['unique_question_name_input_calls'] == 38
for r in originals.values():
    assert not any(t in json.dumps(r['answer'],ensure_ascii=False) for t in targets)
for report in x['natural_reports']:
    raw(report['source'])
assert len(x['natural_reports']) == 1
cat = v['catalog_source']; b = (R/cat['path']).read_bytes(); assert sha(b) == cat['sha256']
entries = json.loads(b)['entries']
literal = {term:[e['id'] for e in entries if term.lower() in (e['id']+' '+e['strategy']).lower()] for term in ['VAKUU','瓦库']}
assert literal == v['diagnostic_literal_search_only_not_product_query'] == {'VAKUU':[],'瓦库':[]}
assert v['actual_call'] in x['actual_kb_calls'] and v['actual_call']['input'] == {'query':'VAKUU','limit':3}
result = dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),ops_comment=6394629557,
              frozen_offsets=[x['previous_frozen_end'],x['current_single_frozen_end']],
              original_slices=40,accepted=40,runs=dict(Counter(r['run_id'] for r in originals.values())),
              actual_kb_calls=39,unique_question_name_input_calls=38,all_outputs_ok_bound_K=True,
              target_id_presence_in_actual_outputs=0,explicit_target_id_presence_in_answers=0,
              natural_report_slices_verified=1,vakuu_literal_only=literal,
              ops_candidate_status=[dict(id=c['id'],status=c['status']) for c in x['all_candidates']],
              candidate_and_binding_limit='Original ops bounded SQL receipt retained; no new database read or historical binding rewrite in this independent slice verification.',
              old_34_semantic_verdicts_not_extended=True,selector_reruns=0,model_or_product_queries=0,
              issue64_priority_unchanged=True,issue65_scope_unchanged=True)
(M/'natural-successor-independent-readback.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['at','original_slices','runs','actual_kb_calls','unique_question_name_input_calls','vakuu_literal_only']},ensure_ascii=False))
