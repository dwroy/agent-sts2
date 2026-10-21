import gzip,json,pathlib,hashlib,shutil,collections,tarfile,datetime
P=pathlib.Path(__file__).resolve().parent;ROOT=P.parents[2];LIVE=pathlib.Path('/home/dw/Projects/agent-sts2/.worktrees/live');F=P/'frozen'; R=ROOT/'.artifacts/runtime'
read=lambda n:[json.loads(x) for x in gzip.open(F/(n+'.jsonl.gz'),'rt')]
states=read('states');decisions=read('decisions');brains=read('brain'); questions=[];skipped=[]
for d in decisions:
 if d.get('label')!='reward/card' or not str(d.get('result','')).startswith('completed:'):continue
 cand=[(i,s) for i,s in enumerate(states) if s['state'].get('run_id')==d['run_id'] and s.get('observed_ts')==d.get('observed_ts') and s['state'].get('run',{}).get('floor')==d['floor']]
 if not cand:cand=[(i,s) for i,s in enumerate(states) if s['state'].get('run_id')==d['run_id'] and s.get('ts')==d['ts']]
 if not cand:raise RuntimeError(('no frame',d['run_id'],d['floor']))
 i,s=cand[-1];raw=s['state'];reward=raw.get('reward')or{};run=raw['run'];acts=raw.get('available_actions',[])
 combat=next((v for v in states[:i][::-1] if v['state'].get('run_id')==d['run_id'] and v['state'].get('run',{}).get('floor')==d['floor'] and v['state'].get('in_combat')),None)
 if not combat or len(reward.get('card_options',[]))!=3:skipped.append({'run':d['run_id'],'floor':d['floor'],'reason':'no combat provenance or not three options'});continue
 b=next((b for b in brains if b['run_id']==d['run_id'] and b['label']=='reward/card' and abs(datetime.datetime.fromisoformat(b['ts'].replace('Z','+00:00')).timestamp()-datetime.datetime.fromisoformat(d['ts'].replace('Z','+00:00')).timestamp())<2),None)
 if not b:raise RuntimeError(('no brain',d['run_id'],d['floor']))
 key=f"{d['run_id']}-f{d['floor']}";chosen=d['chosen']; choice='skip' if chosen['action']=='skip_reward_cards' else 'card'+str(chosen['option_index'])
 questions.append({'key':key,'run':d['run_id'],'floor':d['floor'],'frame':s,'combat':combat,'decision':d,'brain':b,'brain_choice':choice})
# Deterministic proportional allocation, preserve each run's first/last and near Boss checkpoints.
by=collections.defaultdict(list)
for q in questions:by[q['run']].append(q)
N=min(60,len(questions)); allocation={r:int(len(v)*N/len(questions)) for r,v in by.items()}
while sum(allocation.values())<N:
 r=max(by,key=lambda r:(len(by[r])*N/len(questions)-allocation[r],r));allocation[r]+=1
for run,qs in by.items():
 k=allocation[run];chosen=set(round(i*(len(qs)-1)/(k-1)) for i in range(k)) if k>1 else {0}
 for i,q in enumerate(qs):q['nova_selected']=i in chosen
with gzip.open(F/'questions.json.gz','wt') as f:json.dump(questions,f,ensure_ascii=False)
(F/'cohort.json').write_text(json.dumps({'eligible':len(questions),'excluded':skipped,'per_run':{r:len(v) for r,v in by.items()},'nova_allocation':allocation,'selection':'Per-run proportional largest remainder; evenly spaced chronological ranks including endpoints, deterministic. No outcome or A/B used.'},indent=2))
(R/'agent/tests/logged-states').mkdir(parents=True,exist_ok=True)
shutil.copytree(ROOT/'agent/src',R/'agent/src',dirs_exist_ok=True)
shutil.copy2(ROOT/'agent/tests/logged.ts',R/'agent/tests/logged.ts');shutil.copy2(ROOT/'agent/tests/logged-states/game-data.json',R/'agent/tests/logged-states/game-data.json')
shutil.copy2(ROOT/'agent/package.json',R/'agent/package.json')
if not (R/'agent/node_modules').exists():(R/'agent/node_modules').symlink_to((ROOT/'agent/node_modules').resolve())
# Freeze bytes as read; no publication/knowledge-directory mutation.
manifest=[]
for base,pattern,dest in [(LIVE/'knowledge','**/*',R/'knowledge'),(LIVE/'data','game-data.json',R/'data')]:
 for f in sorted(base.glob(pattern)):
  if not f.is_file() or f.is_symlink():continue
  rel=f.relative_to(base); target=dest/rel;target.parent.mkdir(parents=True,exist_ok=True);data=f.read_bytes();target.write_bytes(data)
  manifest.append({'source':str(f),'snapshot':str(target.relative_to(R)),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
(F/'runtime-data-manifest.json').write_text(json.dumps(manifest,indent=2))
with tarfile.open(F/'runtime-data.tar.gz','w:gz') as tar:
 for n in ['knowledge','data']:tar.add(R/n,arcname=n)
print(json.dumps({'eligible':len(questions),'excluded':skipped,'per_run':{r:len(v) for r,v in by.items()},'nova':allocation,'data_files':len(manifest)},ensure_ascii=False))
