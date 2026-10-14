import collections
import hashlib
import json
from pathlib import Path

root = Path('/home/dw/Projects/agent-sts2')
scratch = Path(__file__).resolve().parent
prior = root / '.worktrees/codex-strategy-silent-20261014-050124/learner/runs/20261014-050136-strategy-proposal'
bundle = json.loads((scratch / 'dispatch-and-proposals.json').read_text())
batch = bundle['dispatch']
runs = batch['runs']
assert batch['task'] == 'strategy-proposal' and batch['character'] == 'silent'
assert batch['worktree'] == str(scratch.parents[2])
assert len(runs) == len(set(runs)) == 6
assert len(batch['proposal_ids']) == len(set(batch['proposal_ids'])) == 10
assert not any(key in batch for key in ('research_request', 'implementation_request', 'proposal_repair'))

inputs = {run: {'run': None, 'decisions': [], 'states': []} for run in runs}
with (root / 'logs/runs.jsonl').open() as source:
    for line in source:
        row = json.loads(line)
        if row.get('run_id') in inputs:
            assert row['character'] == 'SILENT' and row['ascension'] == 10
            assert inputs[row['run_id']]['run'] is None
            inputs[row['run_id']]['run'] = row
assert all(item['run'] for item in inputs.values())

proposals = []
ledger = json.loads((scratch / 'ledger-before.json').read_text())
for number, ident in enumerate(batch['proposal_ids'], 1):
    item = bundle['proposals'][ident]
    path = Path(item['proposal'])
    raw = path.read_bytes()
    assert item['character'] == 'silent' and set(item['runs']) <= set(runs)
    assert all(ledger[key]['character'] == 'silent' for key in item['ledger'])
    assert hashlib.sha256(raw).hexdigest() == item['proposal_sha256']
    (scratch / f'original-{number:02d}.txt').write_bytes(raw)
    proposals.append({'id': ident, 'path': str(path), 'sha256': item['proposal_sha256'], 'bytes': len(raw)})

manifest = {}
excluded = []
special = {'decisions': {}, 'states': {}, 'sl-attempts': {}}
decision_lines = {272361, 272362, 272434, 272575, 272531, 272652, 272483, 272820,
                  274087, 274131, 274156, 274185, 274235, 274237, 274267, 274272,
                  274354, 274484, 274601, 274505, 274568, 274604}
state_lines = {280160, 280161, 280206, 280207, 280232, 280233, 280262, 280263,
               280313, 280314, 280315, 280316, 280348, 280349, 280354, 280355}
old_manifest = json.loads((prior / 'source-manifest.json').read_text())
for name in ('decisions', 'states', 'sl-attempts', 'run-config'):
    index_path = prior / (name + '.source-index.json')
    index_bytes = index_path.read_bytes()
    index = json.loads(index_bytes)
    counts = collections.Counter()
    digest = hashlib.sha256()
    source_path = root / 'logs' / (name + '.jsonl')
    with source_path.open('rb') as source:
        for entry in index:
            source.seek(entry['source_offset'])
            raw = source.read(entry['source_bytes'])
            assert hashlib.sha256(raw).hexdigest() == entry['sha256'], (name, entry['source_line'])
            row = json.loads(raw)
            run = row['state']['run_id'] if name == 'states' else row['run_id']
            assert run in inputs
            if name == 'states':
                info = row['state']['run']
                assert info['character_id'] == 'SILENT' and info['ascension'] == 10
            counts[run] += 1
            digest.update(raw)
            if name in ('decisions', 'states'):
                item = {'_line': entry['source_line'], **row}
                if name == 'decisions' and not row.get('decision_id'):
                    excluded.append({'run_id': run, 'source_line': entry['source_line'],
                                     'reason': '原路线元数据缺decision_id，不伪造决策身份'})
                else:
                    inputs[run][name].append(item)
            if (name == 'decisions' and entry['source_line'] in decision_lines
                or name == 'states' and entry['source_line'] in state_lines
                or name == 'sl-attempts' and entry['source_line'] in {681, 717, 960, 961, 962, 963}):
                special[name][str(entry['source_line'])] = row
    assert dict(counts) == old_manifest[name]['per_run']
    assert digest.hexdigest() == old_manifest[name]['matched_raw_sha256']
    (scratch / (name + '.source-index.json')).write_bytes(index_bytes)
    manifest[name] = {'source': str(source_path), 'rows': len(index), 'per_run': dict(counts),
                      'matched_raw_sha256': digest.hexdigest(), 'locator': str(index_path),
                      'locator_sha256': hashlib.sha256(index_bytes).hexdigest(),
                      'verification': '本批逐原日志offset/length/SHA重新读取，未复用旧消费者输出'}
    print(name, len(index), flush=True)

old_inputs = json.loads((prior / 'consumer-input-manifest.json').read_text())
input_manifest = {}
for run in runs:
    payload = json.dumps(inputs[run], ensure_ascii=False, separators=(',', ':')).encode() + b'\n'
    digest = hashlib.sha256(payload).hexdigest()
    assert digest == old_inputs[run]['sha256'], run
    path = scratch / (run + '.input.json')
    path.write_bytes(payload)
    input_manifest[run] = {'path': str(path), 'sha256': digest,
                           'decisions': len(inputs[run]['decisions']), 'states': len(inputs[run]['states'])}
for name, data in [('source-verification', {'sources': manifest, 'proposals': proposals, 'input_manifest': input_manifest}),
                   ('excluded-metadata-rows', excluded), ('key-original-records', special),
                   ('run-metadata', {run: inputs[run]['run'] for run in runs})]:
    (scratch / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'rows': sum(x['rows'] for x in manifest.values()), 'excluded': len(excluded),
                  'input_manifest': input_manifest}, ensure_ascii=False))
