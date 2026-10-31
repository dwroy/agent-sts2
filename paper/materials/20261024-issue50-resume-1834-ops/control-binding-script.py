from pathlib import Path
import datetime,json,hashlib,subprocess
R=Path.cwd();A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue50-resume-1834-ops';cfg=[json.loads(x) for x in (A/'run-config.jsonl').read_bytes().splitlines()];rows=[]
for c in cfg:
 if 'brain_native_receipt' in c:continue
 run=c['run_id'];pid=c['process']['pid'];started=datetime.datetime.fromisoformat(c['process']['started'].replace('Z','+00:00')).astimezone();choices=[]
 for p in (R/'logs/console').glob('20261024-*.log'):
  try:stamp=datetime.datetime.strptime(p.name[:15],'%Y%m%d-%H%M%S').replace(tzinfo=started.tzinfo)
  except ValueError:continue
  if abs((stamp-started).total_seconds())<=30:choices.append(p)
 refs=[]
 for p in choices:
  with p.open('rb') as f:raw=f.read(65536)
  key=p.name[16:].split('+')[0].split('.')[0]
  try:commit=subprocess.check_output(['git','rev-parse','--verify',key+'^{commit}'],text=True,stderr=subprocess.PIPE).strip()
  except subprocess.CalledProcessError:commit=None
  ancestor=bool(commit and subprocess.run(['git','merge-base','--is-ancestor','5c29110623be69100580809127752e5b333ed932',commit],capture_output=True).returncode==0)
  refs.append({'path':str(p.relative_to(R)),'prefix_bytes':len(raw),'prefix_sha256':hashlib.sha256(raw).hexdigest(),'run_marker_present':run.encode() in raw,'process_marker_present':str(pid).encode() in raw,'filename_commit_prefix':key,'resolved_commit':commit,'R423_behavior_ancestor':ancestor});(A/(p.name+'.prefix')).write_bytes(raw)
 rows.append({'run':run,'process':c['process'],'restart':c['restart'],'code_original':c['code'],'console_candidates':refs,'code_null_not_backfilled':True})
source=[]
for leaf in ['agent/src/memory/endgame-plan.ts','agent/src/memory/run-plan.ts','agent/src/memory/run-plan-merge.ts','agent/tools/brain-agent-report.ts']:
 p=R/'.worktrees/live'/leaf;source.append({'path':str(p.relative_to(R)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(M/'control-binding.json').write_text(json.dumps({'rows':rows,'actual_live_readonly_consumers':source,'timestamp_nearby_console_alone_not_pid_proof':True,'new_models_games':0},ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False))
