from pathlib import Path
import datetime as dt
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent
W = R / '.worktrees/integrator46-20261023'
S = 'a213612c65d6262bf4e90ab968b22cb305bed156'
P = 'paper/materials/20261023-issue46-allocation/'
env = dict(os.environ, PATH=str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'], PYTHONDONTWRITEBYTECODE='1')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=R)

def source_json(name):
    return json.loads(git('show', S+':'+P+name))

def run(label, argv, cwd=W):
    with (B/(label+'.log')).open('wb') as out:
        proc = subprocess.run(['nice','-n','19',*argv], cwd=cwd, env=env, stdout=out, stderr=subprocess.STDOUT)
    raw = (B/(label+'.log')).read_bytes()
    row = dict(command=argv, exit=proc.returncode, log=label+'.log', bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
    print(json.dumps(row), flush=True)
    checks[label] = row
    return proc.returncode

assert git('-C',str(W),'rev-parse','HEAD').decode().strip() == S
validation = source_json('validation.json')
inputs = []
for row in validation['source']:
    raw = (W/row['path']).read_bytes()
    assert raw == git('show',S+':'+row['path'])
    assert hashlib.sha256(raw).hexdigest() == row['sha256']
    inputs.append(row)
checks = {}
run('tsc', ['node_modules/.bin/tsc','-p','tsconfig.json','--noEmit'], W/'agent')
for name in ['proposal_recheck','strategy_concurrency','cadence_no_change','strategy_research_scheduling','strategy_implementation']:
    run(name, ['python3','-B',f'ops/tests/test_{name}.py'])
run('vitest-proxy', ['node_modules/.bin/vitest','run','tests/proposal-recheck.test.ts','--pool=forks','--maxWorkers=1'], W/'agent')

sys.path.insert(0,str(W/'ops'))
import proposal_dispatch as policy
import worktree_allocation_report as report
baseline = source_json('baseline-allocations.json')
actual = report.report(R/'ops/codex-ops',report.timestamp(baseline['since']),report.timestamp(baseline['until']))
assert actual == baseline
frozen = source_json('traffic-replay.json')
state = {}; kept = deferred = 0
last = None
for row in frozen['batches']:
    if row['class'] != 'waiting-only':
        continue
    stamp = row['batch'].removesuffix('-strategy-proposal')
    identity = stamp.removesuffix('-s2')
    at = dt.datetime.strptime(stamp[:15],'%Y%m%d-%H%M%S').replace(tzinfo=dt.timezone(dt.timedelta(hours=8))).timestamp()
    count = row['finished_runs_at_dispatch']
    independent = last is None or (count >= last['count'] and at >= last['at'] and
        ((identity == last['id'] and last['slots'] < 2) or
         (identity != last['id'] and (count-last['count'] >= 10 or at-last['at'] >= 21600))))
    assert policy.waiting_round(state,'silent',count,stamp,at) == independent
    if independent:
        if last is None or last['id'] != identity:
            last = dict(id=identity, at=at, count=count, slots=0)
        last['slots'] += 1
        policy.record_waiting_round(state,'silent',count,stamp,at,row['batch'])
        kept += 1
    else:
        deferred += 1
assert (kept,deferred)==(8,51)
provenance = {}
for name, meta in frozen['inputs'].items():
    with (R/name).open('rb') as handle:
        prefix=handle.read(meta['bytes'])
    provenance[name] = dict(recorded=meta, current_prefix_matches=hashlib.sha256(prefix).hexdigest()==meta['sha256'])
for row in inputs:
    assert hashlib.sha256((W/row['path']).read_bytes()).hexdigest() == row['sha256']
main=git('rev-parse','HEAD').decode().strip()
preview=subprocess.run(['nice','-n','19','git','merge-tree','--write-tree',main,S],cwd=R,capture_output=True)
(B/'merge-tree.stdout.txt').write_bytes(preview.stdout)
(B/'merge-tree.stderr.txt').write_bytes(preview.stderr)
receipt = dict(at=subprocess.check_output(['date','-Iseconds'],text=True).strip(),source=S,main=main,
    live=git('-C',str(R/'.worktrees/live'),'rev-parse','HEAD').decode().strip(),
    source_inputs=inputs, checks=checks, original_allocation_report_reproduced=actual==baseline,
    replay=dict(kept=kept,deferred=deferred,estimated=119-deferred,scaled128=128*(119-deferred)/119),
    frozen_input_provenance=provenance, merge_tree_exit=preview.returncode,
    conflicts=[line for line in preview.stdout.decode().splitlines() if line.startswith('CONFLICT')],
    full_started=False, full_waiter_started=False, source_merged=False,production_changed=False)
(B/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
assert all(row['exit']==0 for row in checks.values())
print(json.dumps({k:receipt[k] for k in ['at','replay','original_allocation_report_reproduced','conflicts']}),flush=True)
