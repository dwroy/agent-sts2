import collections
import json
import math
from pathlib import Path
import statistics
P=Path(__file__).resolve().parent
RAW=P.parents[2]/'.artifacts/issue53-20261024/extracted'
def read(n):return json.loads(((RAW if n in ['brain-evidence.json', 'jev-evidence.json', 'frames-extract.json', 'decisions-extract.json', 'run-config-readback.json'] else P)/n).read_text())
def save(n,x):(P/n).write_text(json.dumps(x,ensure_ascii=False,indent=2,default=str)+'\n')
B=read('brain-evidence.json');J=read('jev-evidence.json');F=read('frames-extract.json');D=read('decisions-extract.json');C=read('cohorts.json');defs=read('cohort-definition.json')
# Preserve the original exact-match extraction; apply the separately recorded data-placeholder audit.
audit={x['off']:x['after'] for x in read('jev-placeholder-audit.json')['placeholder_aware_changes']}
for x in J:
 if x['off'] in audit:x['returned_ids']=audit[x['off']]
runs=C['pre']+C['post'];byrun={x['run_id']:x for x in runs}
def hp(f):return f['player_hp'] if f['player_hp'] is not None else f['hp']
result=[]
for run in runs:
 rid=run['run_id'];fs=[x for x in F if x['run_id']==rid];ds=[x for x in D if x['run_id']==rid];bs=[x for x in B if x['run_id']==rid];js=[x for x in J if x['run_id']==rid]
 fights=[]
 for floor in sorted({x['floor'] for x in fs if x['in_combat'] and x['floor'] is not None}):
  group=[x for x in fs if x['in_combat'] and x['floor']==floor and hp(x) is not None]
  if not group:continue
  first=[];prev=0;resets=0
  for f in group:
   if prev>1 and f['turn']==1:resets+=1
   if not resets:first.append(f)
   prev=f['turn'] or prev
  first=first or group[:1];start=first[0];end=first[-1]
  fights.append(dict(floor=floor,act=start['act'],enemy_ids=[x['id'] for x in start['enemies'] or []],entry_hp=hp(start),max_hp=start['max_hp'],first_observed_end_hp=hp(end),min_hp=min(hp(x) for x in first),net_observed_loss=hp(start)-hp(end),turn_resets=resets,entry_off=start['off'],end_off=end['off'],entry_ts=start['ts']))
 rest=[x for x in ds if x['action']=='choose_rest_option']
 actual=[]
 for b in bs:
  if not (b['returned_ids'] or b['label'].startswith('rest') or b['label']=='map/route-plan'):continue
  # Match the accepted answer to the final recorded action by run/label/floor
  # and the next chronological record, within this one decision window.
  ts=b['ts'].replace('T',' ').removesuffix('Z')
  candidates=[d for d in ds if d['label']==b['label'] and d['floor']==b['floor'] and d['ts']>=ts]
  d=min(candidates,key=lambda x:x['ts']) if candidates else None
  answer=b['answer'] or {}
  actual.append(dict(floor=b['floor'],label=b['label'],hp=b['hp'],brain_off=b['off'],accepted=b['accepted'],returned_ids=b['returned_ids'],choice=answer.get('choice'),reason=answer.get('reason'),run_plan=answer.get('run_plan'),route=answer.get('route'),final_action={k:d[k] for k in ['off','ts','action','option_index','chosen','rationale','result']} if d else None))
 death=next((x for x in fights if x['floor']==run['floor']),None)
 result.append(dict(run_id=rid,floor=run['floor'],death_fight=run.get('death_fight'),ended=run['ended'],death_entry=death,
  largest_observed_losses=sorted(fights,key=lambda x:x['net_observed_loss'],reverse=True)[:3],fights=fights,
  rests=[{k:x[k] for k in ['off','floor','option_index','hp','max_hp','rationale','result']} for x in rest],
  act1_rests=sum(x['floor']<=16 for x in rest),act1_heals=sum(x['floor']<=16 and 'HEAL' in (x['rationale'] or '') for x in rest),
  act1_smiths=sum(x['floor']<=16 and 'SMITH' in (x['rationale'] or '') for x in rest),
  brain_calls=len(bs),brain_with_changed=sum(bool(x['returned_ids']) for x in bs),jev_calls=len(js),jev_with_changed=sum(bool(x['returned_ids']) for x in js),
  system_pairs=dict(collections.Counter(str(x['system_chars'])+':'+str(x['system_sha']) for x in bs)),
  decisions=actual))
save('run-evidence.json',result)
byid={x['run_id']:x for x in result}
summary={}
for name,ids in [('issue_pre27',defs['actual_pre26']+defs['actual_post15'][:1]),('issue_post14',defs['issue14']),('actual_pre26',defs['actual_pre26']),('actual_post15',defs['actual_post15'])]:
 selected=[byid[x] for x in ids];boss1=[f for x in selected for f in x['fights'] if f['floor']==17];boss2=[f for x in selected for f in x['fights'] if f['floor']==33]
 summary[name]=dict(n=len(ids),act2_pass=sum(x['floor']>33 for x in selected),median_floor=statistics.median(x['floor'] for x in selected),act1_rest_mean=statistics.mean(x['act1_rests'] for x in selected),act1_heal_mean=statistics.mean(x['act1_heals'] for x in selected),act1_smith_mean=statistics.mean(x['act1_smiths'] for x in selected),f17_n=len(boss1),f17_entry_hp_pct_mean=statistics.mean(x['entry_hp']/x['max_hp'] for x in boss1),f33_n=len(boss2),f33_entry_hp_pct_mean=statistics.mean(x['entry_hp']/x['max_hp'] for x in boss2) if boss2 else None,brain_calls=sum(x['brain_calls'] for x in selected),jev_calls=sum(x['jev_calls'] for x in selected))
def fisher(a,b,c,d):
 n=a+b+c+d;k=a+c;r=a+b
 p=lambda x:math.comb(k,x)*math.comb(n-k,r-x)/math.comb(n,r)
 observed=p(a);return sum(p(x) for x in range(max(0,r-(n-k)),min(r,k)+1) if p(x)<=observed+1e-14)
summary['fisher_two_sided_issue_9_27_vs_0_14']=fisher(9,18,0,14)
summary['fisher_two_sided_actual_9_26_vs_0_15']=fisher(9,17,0,15)

for key in ['issue_pre27','actual_pre26']:summary[key]['jev_calls']=None
summary['jev_coverage_note']='Only actual_post15 Jev requests were extracted; pre-period counts are unknown.'
save('statistics.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
print('\nPOST RUNS')
for rid in defs['issue14']:
 x=byid[rid];print(rid,x['floor'],x['death_fight'],x['death_entry'],[(f['floor'],f['net_observed_loss']) for f in x['largest_observed_losses']],x['act1_rests'],x['act1_heals'],x['brain_with_changed'],x['jev_with_changed'])
