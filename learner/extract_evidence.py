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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from evidence_identity import run_identity, scan, associate, decision_index, frozen_sizes

STREAMS = ('states', 'decisions', 'sl-attempts', 'run-config', 'run-plans', 'brain', 'runs', 'fight-plans', 'v6-build', 'jev-prompts')


def extract(source, output, runs, source_size=None, store=None, index=None, frozen_missing=False):
    """Freeze the scan boundary; retain raw rows and exact identity provenance."""
    source, output = Path(source), Path(output)
    limit = None if frozen_missing else ((source.stat().st_size if source.exists() else None)
                                        if source_size is None else source_size)
    counts = dict.fromkeys(runs, 0 if limit is not None else None)
    info = {}
    unknown = {}
    unknown_refs = []
    digest = hashlib.sha256()
    fd, name = tempfile.mkstemp(prefix='.' + output.name + '-', dir=output.parent)
    temporary = Path(name)
    try:
        with os.fdopen(fd, 'wb') as destination:
            for row, ref in scan(source, limit, info):
                run, association = associate(row, index)
                if run is None:
                    status = association['status']
                    unknown[status] = unknown.get(status, 0) + 1
                    unknown_refs = (unknown_refs + [{**ref, 'identity': association}])[-5:]
                if run not in counts:
                    continue
                counts[run] += 1
                item = {**ref, 'run_id': run, 'identity': association, 'row': row}
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
        temporary.unlink(missing_ok=True)
    result = {**info, 'stream': source.stem, 'counts': counts, 'identity_gaps': unknown,
              'identity_gap_refs': unknown_refs, 'identity_gap_refs_limit': 5,
              'selection_status': {run: 'missing' if count is None else 'matched' if count else 'no_match'
                                   for run, count in counts.items()},
              'output_sha256': digest.hexdigest(), 'consumption_or_benefit': None}
    if content:
        result['content'] = content
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--logs', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runs', required=True, help='comma-separated observed run IDs')
    parser.add_argument('--streams', choices=STREAMS, nargs='+', default=list(STREAMS[:6]) + list(STREAMS[-2:]))
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
    cuts = frozen_sizes(args.logs, list(dict.fromkeys([*args.streams, 'decisions'])))
    if args.source_size is not None:
        cuts[args.streams[0]] = args.source_size
    index, decision_source = decision_index(args.logs / 'decisions.jsonl', runs, cuts['decisions']) if 'jev-prompts' in args.streams else ({}, None)
    manifest = []
    for name in args.streams:
        item = extract(args.logs / (name + '.jsonl'), args.output / (name + '.evidence.jsonl'),
                       runs, cuts[name], store, index if name == 'jev-prompts' else None, frozen_missing=cuts[name] is None)
        if name == 'jev-prompts':
            item['decision_identity_source'] = decision_source
        manifest.append(item)
    (args.output / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == '__main__':
    main()
