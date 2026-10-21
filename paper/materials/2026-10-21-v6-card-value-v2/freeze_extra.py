"""Bounded read-only historical cohort; no game/API calls."""
import gzip,hashlib,json,pathlib,os,sys
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2'); OUT=pathlib.Path(__file__).resolve().parent/'frozen-extra'; OUT.mkdir(exist_ok=True)
RUNS={'Y427BMQH8AU6','T15WXHPTM0ET','CSBNU2H9LXKD','1ZZHM2MV19YB'}
receipt={'runs':sorted(RUNS),'sources':{}}
for name in ([] if '--prepare-only' in sys.argv else ['states','decisions','run-plans']):
 p=ROOT/'logs'/f'{name}.jsonl'; size=p.stat().st_size; h=hashlib.sha256(); rows=[]; offset=0
 with p.open('rb') as f, gzip.open(OUT/f'{name}.jsonl.gz','wb') as dest:
  while offset<size:
   line=f.readline(size-offset);offset+=len(line);h.update(line)
   if not any(r.encode() in line for r in RUNS):continue
   try:r=json.loads(line)
   except ValueError:continue
   run=r.get('run_id',r.get('run',r.get('state',{}).get('run_id')))
   if run not in RUNS:continue
   dest.write(line);rows.append(r)
 receipt['sources'][name]={'bytes':size,'sha256':h.hexdigest(),'rows':len(rows)}
 print(name,len(rows),flush=True)
if receipt['sources']:(OUT/'sources.json').write_text(json.dumps(receipt,indent=2)+'\n')
def lines(n):
 with gzip.open(OUT/f'{n}.jsonl.gz','rt') as f:return [json.loads(x) for x in f]
states=lines('states'); decisions=lines('decisions');qs=[]; rejected=[]; seen=set()
for d in decisions:
 if d.get('label')!='reward/card' or not str(d.get('result','')).startswith('completed'):continue
 if d.get('decider') not in ('codex','deepseek','brain'):continue
 run=d['run_id'];floor=d['floor'];ts=d.get('observed_ts',d['ts'])
 pool=[s for s in states if s['state'].get('run_id')==run and s['state'].get('run',{}).get('floor')==floor and s.get('observed_ts',s['ts'])<=ts]
 reward=[s for s in pool if s['state'].get('screen')=='REWARD' and len(s['state'].get('reward',{}).get('card_options',[]))==3]
 combat=[s for s in pool if s['state'].get('in_combat')]
 if not reward or not combat:rejected.append({'run':run,'floor':floor,'reward':bool(reward),'combat':bool(combat)});continue
 if (run,floor) in seen:rejected.append({'run':run,'floor':floor,'reason':'repeated_floor_first_completed_only'});continue
 seen.add((run,floor))
 frame=max(reward,key=lambda s:s.get('observed_ts',s['ts'])); c=max(combat,key=lambda s:s.get('observed_ts',s['ts']))
 action=d.get('chosen',{});choice='skip' if action.get('action')=='skip_reward_cards' else 'card'+str(action.get('option_index'))
 if choice not in ('card0','card1','card2','skip'):rejected.append({'run':run,'floor':floor,'choice':choice});continue
 qs.append({'key':f'{run}-f{floor}','run':run,'floor':floor,'frame':frame,'combat':c,'decision':d,'brain_choice':choice,'nova_selected':False})
with gzip.open(OUT/'questions.json.gz','wt') as f:json.dump(qs,f)
(OUT/'cohort.json').write_text(json.dumps({'questions':len(qs),'rejected':rejected,'per_run':{r:sum(q['run']==r for q in qs) for r in sorted(RUNS)}},indent=2)+'\n')
print('questions',len(qs),'rejected',rejected,flush=True)
