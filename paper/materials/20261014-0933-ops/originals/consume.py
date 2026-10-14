import json
import os
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
node = Path.home() / '.local/node/bin/node'
loader = ROOT / 'agent/node_modules/tsx/dist/loader.mjs'
env = dict(os.environ, TMPDIR=str(HERE))
results = []
for run in json.loads((HERE / 'dispatch.json').read_text())['runs']:
    inp = HERE / (run + '.input.json')
    data = json.loads(inp.read_text())
    variants = [(run, inp, '全部冻结行')]
    missing = [d['_line'] for d in data['decisions'] if not d.get('decision_id')]
    if missing:
        scoped = dict(data)
        scoped['decisions'] = [d for d in data['decisions'] if d['floor'] in [22, 23]]
        scoped['states'] = [s for s in data['states'] if s['state']['run']['floor'] in [22, 23]]
        limited = HERE / (run + '.bounded.json')
        limited.write_text(json.dumps(scoped, ensure_ascii=False) + '\n')
        variants.append((run + '-bounded', limited, '仅F22/F23，保留原行号，不跨缺行续链'))
    for name, path, scope in variants:
        with (HERE / (name + '.audit.json')).open('w') as stdout, (HERE / (name + '.audit.stderr')).open('w') as stderr:
            call = subprocess.run([str(node), '--import', str(loader), str(ROOT / 'learner/audit-selection.ts'), str(path)],
                                  stdout=stdout, stderr=stderr, env=env)
        record = {'run': run, 'name': name, 'scope': scope, 'exit': call.returncode,
                  'missing_decision_ids': missing if scope == '全部冻结行' else []}
        if call.returncode == 0:
            audit = json.loads((HERE / (name + '.audit.json')).read_text())
            record.update(actions=len(audit['observed_actions']), segments=len(audit['segments']),
                          full_candidate_results=sum(s['actual_full_candidate_result'] is not None for s in audit['segments']),
                          turns=len(audit['observed_turns']))
            statuses = {}
            for action in audit['observed_actions']:
                status = action['observed_interval']['status']
                statuses[status] = statuses.get(status, 0) + 1
            record['interval_statuses'] = statuses
        results.append(record)
        print(json.dumps(record, ensure_ascii=False), flush=True)
(HERE / 'consumer-summary.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
