#!/usr/bin/env python3
"""One registered fixed revalidation, two OS processes including this coordinator."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

TREE = Path(__file__).resolve().parents[3]
MATERIAL = TREE / 'paper/materials/20261031-issue83-crusher-rocket'
OUT = TREE / '.artifacts/issue83/crusher-rocket/C-raw-once'
SOURCE = TREE / '.artifacts/issue83/crusher-rocket/transition-candidate-source'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prereg-commit', required=True)
    args = parser.parse_args()
    prereg = MATERIAL / 'C-raw-preregistration.json'
    fixed = subprocess.check_output(['git', '-C', str(TREE), 'show',
        args.prereg_commit+':paper/materials/20261031-issue83-crusher-rocket/C-raw-preregistration.json'])
    assert fixed == prereg.read_bytes(), 'Preregistration changed after commit'
    manifest = json.loads(fixed)
    candidate = json.loads((MATERIAL / manifest['candidate_source_manifest']).read_text())
    assert manifest['fit'] is None and manifest['iterations'] == 1
    assert not any(os.environ.get(k) for k in ('STS2_KNOWLEDGE_SNAPSHOT', 'STS2_DATA_SNAPSHOT', 'STS2_DATA_RUNTIME'))
    for name, ref in manifest['inputs'].items():
        assert digest(TREE / name) == ref['sha256'], 'Frozen input changed: '+name
    for name, ref in manifest['runner_files'].items():
        assert digest(TREE / name) == ref['sha256'], 'Frozen runner changed: '+name
    source_before = {name: digest(SOURCE / name) for name in candidate['source_files']}
    assert all(source_before[name] == ref['after_sha256'] for name, ref in candidate['source_files'].items())
    knowledge_before = {str(p.relative_to(SOURCE / 'knowledge')): digest(p)
                        for p in (SOURCE / 'knowledge').rglob('*.json')}
    with (OUT / 'started.json').open('x') as handle:
        json.dump({'schema': 'issue83-C-once-start-v1', 'prereg_commit': args.prereg_commit,
            'prereg_sha256': hashlib.sha256(fixed).hexdigest(), 'started_unix': time.time(),
            'pid': os.getpid(), 'source': source_before, 'knowledge': knowledge_before,
            'target_n': 52, 'pool_threads': 2, 'max_OS_processes': 2}, handle, indent=2)
        handle.write('\n')
    node = shutil.which('node')
    assert node
    stages = [('old51', '.artifacts/issue83/model-pair/first-actual-fights.jsonl', 'old-keys.json'),
              ('new1', '.artifacts/issue83/crusher-rocket/formal-model/new-first-val.jsonl', 'new-keys.json')]
    receipts = []
    for stage, source, keys in stages:
        directory = OUT / stage
        directory.mkdir()
        command = [node, '--import', 'tsx', str(SOURCE / 'agent/tools/boss-sim/backtest-C.ts'),
            '--character', 'silent', '--in', str(TREE / source), '--keys', str(OUT / keys),
            '--out-dir', str(directory), '--samples', '200', '--seed', '1', '--starts', 't1,pre', '--no-rollout']
        started = time.time()
        with (directory / 'stdout.log').open('xb') as stdout, (directory / 'stderr.log').open('xb') as stderr:
            # The registered parent remains alive; the single Node child uses two worker threads.
            # Original admitted request/slot descriptors remain inherited, with no second resource claim.
            result = subprocess.run(command, cwd=SOURCE / 'agent', env={**os.environ,
                'CHARACTER': 'silent', 'MODE': 'replay', 'V6_COMBAT_ENTRIES': 'off'},
                stdout=stdout, stderr=stderr, close_fds=False)
        receipts.append({'stage': stage, 'command': command, 'exit': result.returncode,
            'started': started, 'ended': time.time(), 'output': str(directory / 'results-0.jsonl'),
            'output_sha256': digest(directory / 'results-0.jsonl') if (directory / 'results-0.jsonl').exists() else None})
        (OUT / 'progress.json').write_text(json.dumps(receipts, indent=2)+'\n')
        if result.returncode:
            raise RuntimeError('Fixed C stage failed; preserve partial outputs, no automatic retry')
    source_after = {name: digest(SOURCE / name) for name in source_before}
    knowledge_after = {str(p.relative_to(SOURCE / 'knowledge')): digest(p)
                       for p in (SOURCE / 'knowledge').rglob('*.json')}
    assert source_after == source_before and knowledge_after == knowledge_before, 'Source/knowledge drift'
    results = [json.loads(line) for stage, _, _ in stages
               for line in (OUT / stage / 'results-0.jsonl').read_text().splitlines()]
    expected = {(k, s) for k in manifest['target_keys'] for s in ('t1', 'pre')}
    assert len(results) == len(expected) and {(r['key'], r['start']) for r in results} == expected
    (OUT / 'completed.json').write_text(json.dumps({'schema': 'issue83-C-once-complete-v1',
        'prereg_commit': args.prereg_commit, 'source_unchanged': True, 'knowledge_unchanged': True,
        'result_records': len(results), 'sim_failed': sum(not r.get('sim') for r in results),
        'stages': receipts, 'ended_unix': time.time(), 'production_admitted': False}, indent=2)+'\n')
    print(json.dumps({'state': 'completed', 'records': len(results), 'production_admitted': False}))


if __name__ == '__main__':
    main()
