import json,collections,re,datetime,subprocess
from pathlib import Path
p=Path('learner/runs/20261007-221303-postmortem')
def rows(n):
 for l in (p/n).open():
  no,s=l.split(':',1);r=json.loads(s);r['_line']=int(no);yield r
D=list(rows('decisions-lines.jsonl'));S=list(rows('states-lines.jsonl'));A=list(rows('sl-lines.jsonl'));R=json.loads((p/'WQZVENQ7DTRP-resources.json').read_text())
by={s['observed_ts']:s for s in S};ind={s['_line']:i for i,s in enumerate(S)}
for i in [275894,275960,276139]:
 d=next(x for x in D if x['_line']==i);print('BOARD',i,d['observed_ts'],by[d['observed_ts']]['_line'],'F/T',d['floor'],d['turn'],d['fingerprint'])
for fn,fl,turn in [('prior-SADL-states.jsonl',8,1),('prior-NB8-states.jsonl',31,5)]:
 SS=list(rows(fn));dd=list(rows(fn.replace('states','decisions')));ii={s['observed_ts']:i for i,s in enumerate(SS)}
 for d in dd:
  if d['chosen']['action']=='use_potion' and d['floor']==fl and d['turn']==turn and '狡诈' in d['rationale']:
   ix=ii[d['observed_ts']];be=SS[ix];af=SS[ix+1];print('PRIORGEN',fn,'decision',d['_line'],'states',be['_line'],af['_line'],'hand',len(be['state']['combat']['hand']),len(af['state']['combat']['hand']),'shivs',sum(c['card_id']=='SHIV' for c in be['state']['combat']['hand']),sum(c['card_id']=='SHIV' for c in af['state']['combat']['hand']))
for c in R['combats']:
 seq=c['sequence'];frames=[s for s in S if c['entry']['line']<=s['_line']<=(c.get('exit') or c['last'])['line']];before=None;kill=[]
 for s in frames:
  enemies={e['enemy_id']:e for e in (s['state'].get('combat') or {}).get('enemies',[]) if e['current_hp']>0}
  if before and s['state']['in_combat']:
   gone=set(before)-set(enemies)
   if gone:kill.append((s['_line'],s['state']['turn'],[(i,before[i]['name']) for i in sorted(gone)]))
  before=enemies
 print('KILL',seq,c['floor'],kill,'final enemies',[(e['enemy_id'],e['current_hp']) for e in (frames[-1]['state'].get('combat') or {}).get('enemies',[])])
C=[d for d in D if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'];halt=[d for d in C if 'reload' in d.get('result','') or 'SL' in d.get('result','')]
print('CODE_HALTS',[(d['_line'],d.get('result')) for d in halt]);print('CODE_RESULTS',collections.Counter(d.get('result') for d in C))
L=[d for d in D if d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35];print('LOWLABELS',collections.Counter(d['label'] for d in L))
print('DURATION',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds());print('CACHE',2076160/3956592*100)
for seq in [11,14,15,16,17,18,19]:
 c=R['combats'][seq-1];end=S[ind[c['last']['line']]];st=end['state'];co=st['combat'];print('ENDING',seq,'hp',st['run']['current_hp'],'block',co['player']['block'],'enemy',[(e['current_hp'],[(x['power_id'],x['amount']) for x in e['powers']],e['intents']) for e in co['enemies']],'risks',co.get('lethal_risks'))
for i in [275712,276150,275628]:
 d=next(x for x in D if x['_line']==i);print('GUARD',i,d['rationale'])
for s in S:
 st=s['state']
 if st['in_combat'] and st['run']['floor']==33 and 282242<=s['_line']<=282299:
  co=st['combat'];w=[x for x in co['player']['powers'] if x['power_id']=='WELL_LAID_PLANS_POWER']
  if w:print('RETAIN',s['_line'],st['turn'],len(co['hand']),w)
print('ARTIFACTS',[(f.name,f.stat().st_size) for f in p.iterdir() if f.is_file()])
