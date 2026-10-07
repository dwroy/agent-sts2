import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
SCRATCH = pathlib.Path(__file__).resolve().parent
FLOORS = {
    '5PM6JAQG6FNQ': {33, 38, 39},
    'DUZUBAJ3A8GP': {27},
    'CA5KE8GFJ9X2': {9, 13},
    '8JRE1C4H4Z2W': {17, 33},
    'YF0LXT1QSTGG': {33, 48},
    'XP2SL33HT0D9': {33},
}
manifest = {}
for filename in ['states.jsonl', 'decisions.jsonl']:
    command = ['nice', '-n', '19', 'rg', '-n', '-F']
    for run in FLOORS:
        command.extend(['-e', run])
    command.append(str(ROOT / 'logs' / filename))
    process = subprocess.Popen(command, stdout=subprocess.PIPE, text=True)
    records = []
    for numbered in process.stdout:
        line_number, line = numbered.split(':', 1)
        row = json.loads(line)
        state = row.get('state', {})
        run = row.get('run_id') or state.get('run_id')
        floor = row.get('floor') if filename == 'decisions.jsonl' else state.get('run', {}).get('floor')
        if run not in FLOORS or floor not in FLOORS[run]:
            continue
        records.append({'line': int(line_number), 'sha256': hashlib.sha256(line.encode()).hexdigest(), 'row': row})
    assert process.wait() == 0
    target = SCRATCH / ('selected-' + filename)
    with target.open('w') as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + '\n')
    manifest[filename] = {'rows': len(records), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
(SCRATCH / 'evidence-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest))
