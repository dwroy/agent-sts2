from pathlib import Path
import json,re,subprocess,os,fcntl
R=Path('/home/dw/Projects/agent-sts2');A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue37-20-r434-integrator';s=json.loads((M/'full-state.json').read_bytes());p=Path('/proc')/str(s['worker_pid']);same=p.exists() and p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==s['worker_birth'];log=(A/'full-console.log').read_text(errors='replace');files=re.findall(r'^\s*([✓❯↓]) (tests/[^\n]+)',log,re.M)
with(R/'ops/integrator-full-check.lock').open('a') as lock:
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);busy=False
 except BlockingIOError:busy=True
r=dict(at=subprocess.check_output(['date','-Is'],text=True).strip(),phase=s['phase'],worker_pid=s['worker_pid'],worker_birth=s['worker_birth'],same_worker_active=same,nice=os.getpriority(os.PRIO_PROCESS,s['worker_pid']) if same else None,check_lock_busy=busy,reported_files=len(files),reported_failed_files=sum(x[0]=='❯' for x in files),last_files=[x[1] for x in files[-3:]],new_full_runs=s['new_full_runs'])
with(M/'progress.jsonl').open('a') as f:f.write(json.dumps(r)+'\n')
print(json.dumps(r))
