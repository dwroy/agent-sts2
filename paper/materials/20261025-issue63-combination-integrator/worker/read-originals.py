"""Read the three original samples through the exact candidate pair, without saving or reclaiming."""
from pathlib import Path
import sys,json,hashlib,subprocess
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent
M=R/'paper/materials/20261025-issue63-combination-integrator';a=json.loads((M/'assembly.json').read_text());W=Path(a['worktree'])
sys.path.insert(0,str(W/'ops'))
import learner_tabs as tabs
import learner_tui as tui
tabs.native_verifier=lambda root:tui.verify_native
expected={x['batch']:x['source_receipt_sha256'] for x in json.loads((W/'ops/tests/fixtures/issue63-seal-failures.json').read_text())['samples']}
expected['20261025-121312-strategy-proposal']='71ab83f4dc00dff3e05c223810bf03d07670d2a495382c58bfb57ff952a45dc5'
production={str(R/n):tabs.sha(R/n) for n in ('ops/learner_tabs.py','ops/learner_tui.py')};results=[]
for batch,h in expected.items():
 worker=tabs.LearnerTabs(R,R/'ops/codex-ops',dry=True);row,host=worker.current(batch);path=worker.receipt_path(batch,'.tui.json',row)
 assert tabs.sha(path)==h
 receipt=tabs.load(path);tracked=[worker.state,worker.host,path,worker.path];before={str(p):tabs.sha(p) for p in tracked}
 proof=worker.seal_proof(batch,row,host,receipt['wrapper']['supervisor']['birth'])
 after={str(p):tabs.sha(p) for p in tracked};assert before==after
 assert tabs.birth(receipt['pid']) is None and tabs.birth(row['pid']) is None
 results.append(dict(batch=batch,pane=row['pane'],read_only=True,apply=False,candidate_pair_verifier=True,actual_production_installed=False,receipt_sha256=h,state=row['state'],rc=row['rc'],artifact_count=len(proof['files']),native_and_supervisor_exited=True,identity_terminal_and_empty_input='passed',candidate_seal_proof='passed',state_host_tui_journal_unchanged=True))
assert production=={n:tabs.sha(Path(n)) for n in production}
out=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),candidate=a['candidate_commit'],samples=results,production_pair_unchanged=True,production_mutations=0,seal_tick_reclaim_close_calls=0)
(M/'original-samples-readonly.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
