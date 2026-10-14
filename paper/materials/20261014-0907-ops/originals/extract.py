import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
LOGS = Path('/home/dw/Projects/agent-sts2/logs')
RUNS = set(json.loads((OUT / 'dispatch.json').read_text())['runs'])
TOKENS = [run.encode() for run in RUNS]


def extract(name, start=0):
    counts = {run: 0 for run in RUNS}
    index = []
    with (LOGS / name).open('rb') as source, (OUT / name).open('wb') as destination:
        source.seek(start)
        relative = 0
        while True:
            offset = source.tell()
            raw = source.readline()
            if not raw:
                break
            relative += 1
            if any(token in raw for token in TOKENS):
                row = json.loads(raw)
                run = row.get('run_id') or row.get('state', {}).get('run_id')
                if run not in RUNS:
                    continue
                if 'state' in row:
                    info = row['state'].get('run', {})
                    assert info.get('character_id') == 'SILENT' and info.get('ascension') == 10
                local_offset = destination.tell()
                destination.write(raw)
                index.append({'source': str(LOGS / name), 'offset': offset, 'bytes': len(raw),
                              'sha256': hashlib.sha256(raw).hexdigest(), 'run_id': run,
                              'line': relative if start == 0 else None, 'relative_line': relative,
                              'local_offset': local_offset, 'ts': row.get('observed_ts', row.get('ts'))})
                counts[run] += 1
            if relative % 100 == 0 or any(token in raw for token in TOKENS):
                timestamp = json.loads(raw).get('ts', '')
                if timestamp > '2026-10-07T10:11:00.000Z':
                    break
    (OUT / (name + '.index.json')).write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(name, counts, 'saved_rows', len(index), 'last_source_offset', offset, flush=True)


if __name__ == '__main__':
    import sys
    if sys.argv[1] == 'states':
        extract('states.jsonl', 8403755994)
    else:
        extract(sys.argv[1] + '.jsonl')
