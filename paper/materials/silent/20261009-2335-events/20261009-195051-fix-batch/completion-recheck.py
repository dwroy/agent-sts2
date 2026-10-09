import hashlib
import json
from pathlib import Path
import subprocess

p = Path(__file__).resolve().parent
e = Path('/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261009-195051-fix-batch.boss-evidence.json')
assert e.read_bytes() == (p / 'dispatch-evidence.json').read_bytes()
d = json.loads(e.read_text())
payload = {k: v for k, v in d.items() if k not in ['key', 'dispatch_base']}
assert hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest() == d['key']
assert (d['character'], d['boss'], d['mode']) == ('silent', 'QUEEN', 'b4')
assert d['dispatch_base'] == 'eaf3ac162afe487705d5b46ab049871308022173'
head = (p / 'source-commit.txt').read_text().strip()
subprocess.run(['git', 'merge-base', '--is-ancestor', head, 'HEAD'], check=True)
assert not subprocess.check_output(['git', 'diff', '--name-only', head, 'HEAD', '--', 'agent/src', 'agent/tools', 'agent/tests', 'learner', 'ops', 'eval', 'knowledge/builders'], text=True).strip()
assert not subprocess.check_output(['git', 'status', '--porcelain', '--', 'agent/src', 'agent/tools', 'agent/tests'], text=True).strip()
b = json.loads((p / 'before-trust.json').read_text())
a = json.loads((p / 'after-trust.json').read_text())
assert b['split'] == a['split'] and b['criteria'] == a['criteria'] and b['split']['tune'] == d['split']['tune']
assert set(d['split']['val']) <= set(b['split']['val'])
assert b['split']['cutoff_ts'] == '2026-10-06T02:46:11.648000'
for k in ['dataset_sha256', 'sources_sha256', 'turns_sha256', 'split_sha256']:
    assert b['source'][k] == a['source'][k]
read = lambda n: [json.loads(l) for l in (p / n).read_text().splitlines()]
old, new = read('before-results.jsonl'), read('after-results.jsonl')
assert len(old) == len(new) == 654
order_output_changes = []
for x, y in zip(old, new):
    # These are whole-fight output scores/selections; fixed solver input plans have separate hash proofs.
    output_fields = {'sim', 'order', 'orders'}
    assert {k: v for k, v in x.items() if k not in output_fields} == {k: v for k, v in y.items() if k not in output_fields}
    changed = [k for k in ('order', 'orders') if x.get(k) != y.get(k)]
    if changed:
        assert 'QUEEN' in x['enc']
        order_output_changes.append({'key': x['key'], 'start': x['start'], 'fields': changed})
coverage = json.loads((p / 'paired-coverage.json').read_text())
for s in ('t1', 'pre'):
    assert coverage[s]['before_joint_log_sim_survivor_counts'] == coverage[s]['after_joint_log_sim_survivor_counts']
    assert coverage[s]['before_leak_turns'] == coverage[s]['after_leak_turns'] == 57
ledger = json.loads(subprocess.check_output(['python3', '/home/dw/Projects/agent-sts2/learner/ledger.py', 'show', 'silent-0346'], text=True))
assert (ledger['character'], ledger['kind'], ledger['status']) == ('silent', 'fight', 'rejected')
assert any(ev['run'] in {k.split(':')[0] for k in d['logged_keys']} and isinstance(ev.get('turn'), int) for ev in ledger['evidence'])
gate = json.loads((p / 'acceptance.json').read_text())
assert not gate['accepted'] and gate['isolation']['passed']
for side in ('before', 'after'):
    assert hashlib.sha256((p / f'{side}-trust.json').read_bytes()).hexdigest() == gate['inputs'][side]['sha256']
result = {'evidence_sha256': hashlib.sha256(e.read_bytes()).hexdigest(), 'evidence_key': d['key'],
          'dispatch_base': d['dispatch_base'], 'source_head': head,
          'branch_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'same_frozen_input_labels_all_records': True, 'whole_fight_order_output_changes': order_output_changes,
          'target_validation_coverage_identical': True, 'source_committed_unchanged': True, 'source_ancestor': True,
          'ledger_id': 'silent-0346', 'ledger_kind': 'fight', 'ledger_status': 'rejected',
          'acceptance_exit': int((p / 'acceptance.rc').read_text()), 'acceptance_reasons': gate['reasons'],
          'merged': None, 'version': ''}
(p / 'completion-recheck.json').write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n')
(p / 'completion-recheck.rc').write_text('0\n')
print(json.dumps({k: v for k, v in result.items() if k != 'whole_fight_order_output_changes'}, ensure_ascii=False))
