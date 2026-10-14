import collections
import hashlib
import json
import pathlib
import subprocess

scratch = pathlib.Path(__file__).resolve().parent
root = pathlib.Path('/home/dw/Projects/agent-sts2')
runs = set(json.loads((scratch / 'dispatch.json').read_text())['runs'])
pattern = '"(run_id|run)"[[:space:]]*:[[:space:]]*"(' + '|'.join(sorted(runs)) + ')"'
manifest = {}
for name in ['runs', 'run-config', 'sl-attempts', 'run-plans', 'decisions', 'states']:
    source = root / 'logs' / (name + '.jsonl')
    cutoff = source.stat().st_size
    matched = scratch / (name + '.matched.txt')
    with matched.open('wb') as dest:
        result = subprocess.run(['rg', '-n', '-b', '-e', pattern, str(source)], stdout=dest)
    assert result.returncode in [0, 1]
    locators = []
    counts = collections.Counter()
    selected = scratch / (name + '.jsonl')
    with matched.open('rb') as src, selected.open('wb') as dest:
        for line in src:
            line_number, offset, raw = line.split(b':', 2)
            offset = int(offset)
            if offset + len(raw) > cutoff:
                continue
            row = json.loads(raw)
            run = row.get('run_id', row.get('run', row.get('state', {}).get('run_id')))
            if run not in runs:
                continue
            counts[run] += 1
            dest.write(raw)
            locators.append({'run_id': run, 'source_line': int(line_number), 'offset': offset,
                             'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    manifest[name] = {'source': str(source), 'cutoff': cutoff, 'counts': dict(counts),
                      'selected_sha256': hashlib.sha256(selected.read_bytes()).hexdigest(),
                      'rows': locators}
    (scratch / 'evidence-index.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(name, dict(counts), flush=True)
