"""Use the shared ledger CLI only; never edit the ledger file directly."""
import json
import os
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
CLI = '/home/dw/Projects/agent-sts2/learner/ledger.py'
ENV = {**os.environ, 'LEDGER_RUNS': '/home/dw/Projects/agent-sts2/.artifacts/ops-issue27-batch2-20261022/frozen/runs.jsonl'}
RESUME = (HERE / 'ledger-add.stdout.txt').exists()
COMMANDS = json.loads((HERE / 'ledger-commands.json').read_text()) if RESUME else []


def run(args, name, data=None, runs=None):
    cmd = ['nice', '-n', '10', 'python3', CLI, *args]
    effective = {**ENV, **({'LEDGER_RUNS': runs} if runs else {})}
    result = subprocess.run(cmd, input=data, text=True, capture_output=True, env=effective)
    (HERE / (name + '.stdout.txt')).write_text(result.stdout)
    (HERE / (name + '.stderr.txt')).write_text(result.stderr)
    COMMANDS.append({'argv': cmd, 'env': {'LEDGER_RUNS': effective['LEDGER_RUNS']},
                     'exit_code': result.returncode, 'stdout': name + '.stdout.txt', 'stderr': name + '.stderr.txt'})
    (HERE / 'ledger-commands.json').write_text(json.dumps(COMMANDS, indent=2) + '\n')
    assert result.returncode == 0, result.stderr
    return result.stdout


entries = json.loads((HERE / 'proposed-entries.json').read_text())
items = []
for e in entries:
    if not RESUME:
        found = json.loads(run(['find', '--character', 'silent', '--text', e['id'], '--json'], e['id'] + '.find-before'))
        assert found == [], 'Existing claim must be linked/reviewed instead of duplicated'
    items.append({'character': 'silent', 'kind': 'other', 'claim': e['id'] + '：' + e['strategy'],
                  'evidence': e['evidence'], 'confidence': e['confidence'], 'prior': 'partly',
                  'prior_note': 'Frozen first-batch external-review already identified observational limits. This batch adds bounded strategy wording under #42; related mechanics are not card-choice benefit evidence.',
                  'status': 'proposed', 'by': 'learner:issue-27-brain-strategies-batch2-20261022-224403',
                  'where': {'knowledge': ['knowledge/characters/silent/strategy-entries.json#' + e['id']],
                            'proposal': ['paper/materials/20261022-issue27-brain-strategies/batch2/report.md']},
                  'note': 'Pure external support; no first_run/asc/prior_runs; no causal gain or own validation. Publication and natural readback pending original ops.'})
raw = ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in items)
(HERE / 'ledger-add-input.jsonl').write_text(raw)
ids = (HERE / 'ledger-add.stdout.txt').read_text().split() if RESUME else run(['add'], 'ledger-add', raw).split()
assert len(ids) == len(entries)
mapped = []
for key, e in zip(ids, entries):
    shown = json.loads(run(['show', key], key + '.show'))
    assert shown['status'] == 'proposed'
    assert not any(k in shown for k in ['first_run', 'asc', 'prior_runs'])
    evidence = [{k: v for k, v in ev.items() if k != 'added'} for ev in shown['evidence']]
    assert evidence == e['evidence']
    # Derived accounting differs in field names across CLI and TS; retain the whole original show output.
    mapped.append({'entry_id': e['id'], 'ledger_id': key, 'status': shown['status'],
                   'show': key + '.show.stdout.txt'})
run(['find', '--character', 'silent', '--text', 'silent-brain-', '--json'], 'ledger-find-after')
run(['check'], 'ledger-shape-check', runs='none')
(HERE / 'ledger-ids.json').write_text(json.dumps(mapped, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(mapped, ensure_ascii=False))
