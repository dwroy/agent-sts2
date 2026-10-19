#!/usr/bin/env python3
"""Extract run-scoped JSONL evidence with reproducible byte offsets and hashes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'ops'))
from content_store import Store, default_directory

STREAMS = ('states', 'decisions', 'sl-attempts', 'run-config', 'run-plans', 'brain', 'runs', 'fight-plans')


def run_identity(row):
    """Read explicit identities only; conflicting fields cannot establish a run."""
    if not isinstance(row, dict):
        return None
    state = row.get('state')
    values = [row.get('run_id'), state.get('run_id') if isinstance(state, dict) else None,
              row.get('run')]
    fingerprint = row.get('fingerprint')
    if isinstance(fingerprint, str):
        try:
            fingerprint = json.loads(fingerprint)
        except ValueError:
            fingerprint = None
    if isinstance(fingerprint, dict):
        values.append(fingerprint.get('run'))
    identities = {value for value in values if isinstance(value, str) and value and value != 'run_unknown'}
    return next(iter(identities)) if len(identities) == 1 else None


def extract(source, output, runs, source_size=None, store=None):
    """Freeze the scan boundary before reading; preserve raw line bytes, including LF."""
    source, output = Path(source), Path(output)
    counts = dict.fromkeys(runs, 0)
    invalid = incomplete = 0
    with source.open('rb') as handle:
        size = os.fstat(handle.fileno()).st_size
        limit = size if source_size is None else source_size
        if type(limit) is not int or not 0 <= limit <= size:
            raise ValueError('source size must be within the observed file')
        digest = hashlib.sha256()
        temporary = None
        try:
            fd, name = tempfile.mkstemp(prefix='.' + output.name + '-', dir=output.parent)
            temporary = Path(name)
            destination = os.fdopen(fd, 'wb')
            with destination:
                number = offset = 0
                while offset < limit:
                    raw = handle.readline(limit - offset)
                    if not raw:
                        raise ValueError('source truncated during extraction')
                    number += 1
                    start = offset
                    offset += len(raw)
                    if not raw.endswith(b'\n'):
                        incomplete += 1
                        continue
                    try:
                        row = json.loads(raw)
                    except (ValueError, UnicodeDecodeError):
                        invalid += 1
                        continue
                    run = run_identity(row)
                    if run not in counts:
                        continue
                    counts[run] += 1
                    item = {'source': str(source), 'line': number, 'offset': start, 'bytes': len(raw),
                            'sha256': hashlib.sha256(raw).hexdigest(), 'run_id': run, 'row': row}
                    encoded = (json.dumps(item, ensure_ascii=False) + '\n').encode('utf8')
                    destination.write(encoded)
                    digest.update(encoded)
                destination.flush()
                os.fsync(destination.fileno())
            if store:
                content = store.publish_view(temporary, output)
            else:
                content = None
                os.replace(temporary, output)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
    result = {'stream': source.stem, 'source_size': limit, 'counts': counts,
              'invalid_lines': invalid, 'incomplete_lines': incomplete, 'output_sha256': digest.hexdigest()}
    if content:
        result['content'] = content
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--logs', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runs', required=True, help='comma-separated observed run IDs')
    parser.add_argument('--streams', choices=STREAMS, nargs='+', default=list(STREAMS[:6]))
    parser.add_argument('--source-size', type=int, help='earlier byte cutoff; requires one stream')
    parser.add_argument('--object-store', type=Path, help='shared immutable store; default is this repository object directory')
    args = parser.parse_args()
    runs = args.runs.split(',')
    if len(set(runs)) != len(runs) or any(not re.fullmatch('[A-Z0-9]{12}', run) for run in runs):
        parser.error('runs must be distinct 12-character run IDs')
    if args.source_size is not None and len(args.streams) != 1:
        parser.error('source-size requires exactly one stream')
    if len(set(args.streams)) != len(args.streams):
        parser.error('streams must be distinct')
    args.output.mkdir(parents=True, exist_ok=True)
    store = Store(args.object_store or default_directory(args.output))
    manifest = [extract(args.logs / (name + '.jsonl'), args.output / (name + '.evidence.jsonl'),
                        runs, args.source_size, store) for name in args.streams]
    (args.output / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == '__main__':
    main()
