"""Read existing view and bounded log tails; never contact a model or game."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys

R = Path('/home/dw/Projects/agent-sts2')
M = Path(__file__).resolve().parent
A = R / '.artifacts/integrator36-ui-handoff-20261025'
sys.dont_write_bytecode = True
sys.path.insert(0, str(R / 'ops'))
import brain_view

H = lambda b: hashlib.sha256(b).hexdigest()


def run(*args):
    return subprocess.check_output(args, cwd=R, timeout=40)


def proof(p, b=None, offset=None):
    p = Path(p)
    b = p.read_bytes() if b is None else b
    r = dict(path=str(p.relative_to(R)), bytes=len(b), sha256=H(b))
    if offset is not None:
        r['offset'] = offset
    return r


def tail(p):
    with p.open('rb') as f:
        size = f.seek(0, 2)
        f.seek(max(0, size - 4 * 1024 * 1024))
        if f.tell():
            f.readline()
        offset = f.tell()
        for line in f:
            if not line.endswith(b'\n'):
                break
            try:
                value = json.loads(line)
            except json.JSONDecodeError:
                value = None
            if value is not None:
                yield value, proof(p, line, offset)
            offset += len(line)


at = run('date', '-Is').decode().strip()
pane = json.loads(run('herdr', 'pane', 'get', 'w1H:pBA'))['result']['pane']
tab = json.loads(run('herdr', 'tab', 'get', pane['tab_id']))['result']['tab']
process = json.loads(run('herdr', 'pane', 'process-info', '--pane', pane['pane_id']))['result']['process_info']
assert pane['label'] == 'brain-view' and pane['workspace_id'] == 'w1H'
configs = list(tail(R / 'logs/run-config.jsonl'))
config, config_proof = configs[-1]
run_id = config['run_id']
assert tab['label'] == '对局大脑 · ' + run_id
pid = process['foreground_process_group_id']
stat = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
birth = stat[19]
assert len(process['foreground_processes']) == 1
assert process['foreground_processes'][0]['argv'][1:] == [str(R / 'ops/brain_view.py'), '--root', str(R), '--logs', str(R / 'logs'), '--state-dir', str(R / 'ops/codex-ops'), 'watch']
screen = run('herdr', 'pane', 'read', pane['pane_id'], '--source', 'visible', '--format', 'ansi')
(A / 'game-view-visible.ansi').write_bytes(screen)
brains = [(v, p) for v, p in tail(R / 'logs/brain.jsonl') if v.get('run_id') == run_id][-3:]
assert brains
sample = '\n'.join(brain_view.render_brain(v) for v, _ in brains).encode()
scan = subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=screen + b'\n' + sample,
    capture_output=True, env={**os.environ, 'GOMAXPROCS': '1'})
(A / 'game-view-gitleaks.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
(M / 'game-view-sample.txt').write_bytes(sample + b'\n')
final_stat = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
assert final_stat[19] == birth and final_stat[0] not in ('X', 'Z')
rows = []
for v, p in brains:
    rows.append(dict(window=p, summary={k: v.get(k) for k in ('run_id', 'question_id', 'ts', 'label', 'engine', 'model', 'requested_effort', 'accepted')}))
prior = json.loads((R / 'paper/materials/20261025-issue36-natural-hold-integrator/game-view.json').read_bytes())
source = proof(R / 'ops/brain_view.py')
context = json.loads((R / 'paper/materials/20261025-issue59-production-trap-combination-integrator/source-inputs.json').read_bytes())
frozen = {r['path']: r for r in context}
assert source['sha256'] == frozen['ops/brain_view.py']['sha256']
full = json.loads((R / 'paper/materials/20261025-issue59-production-trap-combination-integrator/full.json').read_bytes())
suites = [dict(path=s['name'], status=s['status'], assertions=len(s['assertionResults'])) for s in full['testResults'] if 'brain-view' in s['name']]
assert suites and all(s['status'] == 'passed' for s in suites)
result = dict(at=at, run_id=run_id, config_window=config_proof, pane=pane, tab=tab,
    view_process=dict(pid=pid, birth=birth, stable_during_readback=True, process=process),
    source=source, source_exact_full_input=True, view_suites=suites,
    screen_sha256=H(screen), rows=rows, sample=proof(M / 'game-view-sample.txt'),
    gitleaks_rc=0, prior_run_id=prior['run_id'], title_changed_since_prior_readback=prior['run_id'] != run_id,
    view_restarted_by_this_audit=False, interrupted_continuity_since_prior_readback_not_inferred=True,
    current_process_loaded_source_bytes_proven=False, models_or_game_calls=0)
(M / 'game-view-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(run_id=run_id, view_pid=pid, view_birth=birth, source_exact_full_input=True, view_suites=suites), ensure_ascii=False))
