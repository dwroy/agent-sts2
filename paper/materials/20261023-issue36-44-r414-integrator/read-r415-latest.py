from pathlib import Path
import fcntl,hashlib,json,subprocess
R=Path('/home/dw/Projects/agent-sts2'); B=Path(__file__).resolve().parent; L=R/'.worktrees/live'
def git(*args,cwd=R):return subprocess.check_output(['git',*args],cwd=cwd)
def sha(x):return hashlib.sha256(x).hexdigest()
a=json.loads((B/'assembly.json').read_text());pub=json.loads((R/'paper/materials/20261023-issue40-hotfix-publication-ops/publication.json').read_text())
with (R/'ops/live-merge.lock').open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_SH|fcntl.LOCK_NB)
 head=git('rev-parse','HEAD',cwd=L).decode().strip();assert head==pub['registrations']['live']['commit']
 delta=git('diff','--name-only',a['live_base'],head,'--','agent','ops','learner','knowledge','eval','tools','.agents').decode().splitlines()
 assert set(delta)==set(pub['behavior']['paths']+['eval/versions.json'])
 rows=[]
 for v in pub['paths']:
  p=v['path'];raw=(L/p).read_bytes();tested=git('show',a['tree']+':'+p)
  assert raw==tested==git('show',head+':'+p)
  assert sha(raw)==v['sha256']
  rows.append({'path':p,'sha256':sha(raw),'bytes':len(raw),'same_as_inflight_full':True})
 knowledge=[]
 for v in a['knowledge_manifest']:
  raw=(L/v['path']).read_bytes();cur={'path':v['path'],'bytes':len(raw),'sha256':sha(raw)}
  cur['same_as_full_snapshot'] = cur == v
  if not cur['same_as_full_snapshot']: cur['frozen_full_sha256']=v['sha256']
  knowledge.append(cur)
 versions=json.loads((L/'eval/versions.json').read_text()); vr=versions if isinstance(versions,list) else versions.get('versions',[])
 assert any(x.get('release_id')=='V6-R415' for x in vr)
 assert git('rev-parse','HEAD',cwd=L).decode().strip()==head
 at=subprocess.check_output(['date','-Is'],text=True).strip()
 out={'at':at,'authority_comment':6346048873,'actual_live':head,'release_id':'V6-R415','behavior':pub['behavior']['commit'],'inflight_full_tree':a['tree'],'delta_from_frozen_R414_base':delta,'three_prerequisites':rows,'knowledge_manifest':knowledge,'knowledge_count':len(knowledge),'knowledge_same_as_full_snapshot':all(v['same_as_full_snapshot'] for v in knowledge),'changed_knowledge':[v for v in knowledge if not v['same_as_full_snapshot']],'production_written':False,'full_restarted':False,'new_full':False,'ops_natural_refresh_training':'pending; original natural refresh only','preserve_latest_live_on_future_publication':True}
 (B/'r415-readback.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in out.items() if k!='knowledge_manifest'},ensure_ascii=False))
