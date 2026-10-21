#!/usr/bin/env python3
"""Read-only issue #18 gate comparison; stdout is evidence, never an apply authorization."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'ops'))
import worktree_retention as w


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--baseline-ref', default='518cca239')
    args = parser.parse_args()
    root = args.root.resolve()
    directory = root / 'ops/codex-ops'
    source = 'paper/materials/20261021-worktree-backlog/inventory.json'
    raw = w.git(root, 'show', args.baseline_ref + ':' + source)
    baseline = json.loads(raw)
    result = {'schema': 'issue23-readonly-gate-comparison-v1', 'at': w.retention.stamp(), 'apply': False,
              'root': str(root), 'baseline_ref': w.git(root, 'rev-parse', args.baseline_ref).decode().strip(),
              'baseline_file': source, 'baseline_sha256': hashlib.sha256(raw).hexdigest(),
              'main_at_start': w.git(root, 'rev-parse', 'main').decode().strip(),
              'live_at_start': w.git(root / '.worktrees/live', 'rev-parse', 'HEAD').decode().strip(),
              'implementation_sha256': {name: w.retention.sha_file(Path(w.__file__).parent / name) for name in
                                        ['worktree_retention.py', 'learner_retention.py', 'worktree_storage.py']},
              'rows': []}
    for old in baseline['rows']:
        if old['gate'] not in ('persistent game instance retained', 'learner workspace source unpublished'):
            continue
        tree = Path(old['worktree'])
        row = {key: old.get(key) for key in ('worktree', 'head', 'branch', 'allocated_bytes', 'gate')}
        row['baseline_main_only'] = all(subprocess.run(
            ['git', '-C', str(root), 'merge-base', '--is-ancestor', old['head'], published],
            capture_output=True).returncode == expected for published, expected in
            [(baseline['main_at_inventory_end'], 0), (baseline['live_at_end'], 1)])
        try:
            row['current_head'] = w.git(tree, 'rev-parse', 'HEAD').decode().strip()
            proof, files = w.admission(root, directory, tree)
            row.update(state='eligible', proof=proof, unique_file_count=len(files),
                       unique_file_bytes=sum(item.stat().st_size for item in files))
            if w.git(tree, 'rev-parse', 'HEAD').decode().strip() != row['current_head']:
                row.update(state='retained', reason='HEAD changed during read-only audit')
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            row.update(state='retained', reason=str(error))
        result['rows'].append(row)
        print(tree.name + ': ' + row.get('reason', row['state']), file=sys.stderr, flush=True)
    result.update(completed_at=w.retention.stamp(), main_at_end=w.git(root, 'rev-parse', 'main').decode().strip(),
                  live_at_end=w.git(root / '.worktrees/live', 'rev-parse', 'HEAD').decode().strip())
    result['counts'] = dict(Counter(row.get('reason', row['state']) for row in result['rows']))
    result['groups'] = {gate: dict(Counter(row.get('reason', row['state']) for row in result['rows'] if row['gate'] == gate))
                        for gate in sorted({row['gate'] for row in result['rows']})}
    result['binding_locations'] = {}
    for name, tree in [('main', root), ('live', root / '.worktrees/live')]:
        path = w.retention.safe_path(root, tree / 'ops/instance-binding.json')
        result['binding_locations'][name] = {'present': path.is_file(),
                                             'sha256': w.retention.sha_file(path) if path.is_file() else None}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
