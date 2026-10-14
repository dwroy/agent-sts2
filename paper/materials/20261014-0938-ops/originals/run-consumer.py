import json
import os
import subprocess
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
WORKTREE = OUT.parents[2]
manifest = json.loads((OUT / 'evidence-manifest.json').read_text())
environment = dict(os.environ)
environment['PATH'] = str(Path.home() / '.local/node/bin') + ':' + environment['PATH']
environment['TMPDIR'] = str(OUT)
environment['TSX_DISABLE_CACHE'] = '1'
results = []
for run in manifest['runs']:
    original = OUT / (run + '-input.json')
    target = OUT / (run + '-consumer-full.json')
    error = OUT / (run + '-consumer-full.stderr')
    command = ['node', '--import', 'tsx', '../learner/audit-selection.ts', str(original)]
    with target.open('wb') as stdout, error.open('wb') as stderr:
        full = subprocess.run(command, cwd=WORKTREE / 'agent', env=environment, stdout=stdout, stderr=stderr)
    row = {'run_id': run, 'full_exit_code': full.returncode, 'full_input': str(original),
           'full_output': str(target), 'full_stderr': str(error)}
    inp = json.loads(original.read_text())
    excluded = [x['_line'] for x in inp['decisions'] if not x.get('decision_id')]
    if excluded:
        assert full.returncode != 0
        inp['decisions'] = [x for x in inp['decisions'] if x.get('decision_id')]
        bounded = OUT / (run + '-valid-decisions-input.json')
        bounded.write_text(json.dumps(inp, ensure_ascii=False) + '\n')
        target = OUT / (run + '-consumer-valid-decisions.json')
        error = OUT / (run + '-consumer-valid-decisions.stderr')
        command[-1] = str(bounded)
        with target.open('wb') as stdout, error.open('wb') as stderr:
            result = subprocess.run(command, cwd=WORKTREE / 'agent', env=environment, stdout=stdout, stderr=stderr)
        row.update({'bounded_exit_code': result.returncode, 'bounded_input': str(bounded),
                    'bounded_output': str(target), 'bounded_stderr': str(error), 'excluded_source_lines': excluded})
        assert result.returncode == 0, error.read_text()
    else:
        assert full.returncode == 0, error.read_text()
        row['excluded_source_lines'] = []
    audit = json.loads(target.read_text())
    assert audit['run_id'] == run
    assert all(x['actual_full_candidate_result'] is None for x in audit['segments'])
    row['counts'] = {'decisions': len(inp['decisions']), 'segments': len(audit['segments']),
        'observed_intervals': dict(Counter(x['observed_interval']['status'] for x in audit['observed_actions'])),
        'observed_turns': dict(Counter(x['status'] for x in audit['observed_turns'])),
        'unknown_turn_reasons': dict(Counter(x['reason'] for x in audit['observed_turns'] if x['status'] == 'unknown')),
        'full_candidate_results_unknown': len(audit['segments'])}
    row['consumer_output'] = str(target)
    results.append(row)
    (OUT / 'consumer-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(row, ensure_ascii=False), flush=True)
