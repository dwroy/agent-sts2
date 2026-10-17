"""Read back the exact publication tree and the actual source leaves without changing live."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
state = json.loads((HERE/'publication.json').read_text())
assert state['sandbox_exit'] == 0 and state['publication'] and not state.get('rolled_back')

def git(*args):
    return subprocess.check_output(['git','-C',str(LIVE),*args])

def tree(commit):
    return {line.split('\t',1)[1]:line.split('\t',1)[0]
            for line in git('ls-tree','-r',commit).decode().splitlines()}

source, before, published = (tree(state[k]) for k in ('source','before_code','publication'))
assert all(published[p] == source[p] for p in state['paths'])
allowed = set(state['paths']) | {'eval/versions.json','paper/materials/decision-log.md'}
assert {p:v for p,v in before.items() if p not in allowed} == {p:v for p,v in published.items() if p not in allowed}
assert git('rev-parse',state['publication']+'^{tree}').decode().strip() == state['publication_tree']
assert subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',state['source'],state['publication']]).returncode == 0
previous = json.loads((HERE/'previous-trust.json').read_text())
changes = []
for name, expected in previous['source']['input_files'].items():
    if name.startswith('/'):
        actual = hashlib.sha256(Path(name).read_bytes()).hexdigest()
    else:
        result = subprocess.run(['git','-C',str(LIVE),'show',state['publication']+':'+name],capture_output=True)
        actual = hashlib.sha256(result.stdout).hexdigest() if result.returncode == 0 else None
    if actual != expected:
        changes.append({'path':name,'pinned':expected,'actual_publication':actual})
(HERE/'live-model-changes.json').write_text(json.dumps(changes,indent=1)+'\n')
receipt = {'source':state['source'],'merged':state['merged'],'publication':state['publication'],
           'publication_tree':state['publication_tree'],'source_paths_exact':len(state['paths']),
           'all_other_git_blobs_preserved':True,'source_actual_live_ancestor':True,
           'pinned_model_inputs_different_in_publication':len(changes),
           'current_production_model_recalibrated':False,
           'working_refresh_scope':state.get('postcheck_runtime_dirty',{}),
           'scope':'Exact Git publication and consumer source/data; natural-game adoption and benefit remain unclaimed.'}
(HERE/'deployment-readback.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=1)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k != 'working_refresh_scope'},ensure_ascii=False))
