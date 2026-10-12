import json,hashlib,collections,re
from pathlib import Path
p=Path(__file__).parent
D={r['_line']:r for r in map(json.loads,(p/'decisions.jsonl').open())};S={r['_line']:r for r in map(json.loads,(p/'states.jsonl').open())}
checks=[]
def check(name,ok):
 if not ok:raise AssertionError(name)
 checks.append(name)
check('decision/state counts',len(D)==812 and len(S)==838)
for n,hp in [(370814,64),(370864,3),(370872,3),(371032,1),(371039,1),(371040,0),(370639,52),(370699,52),(370771,19),(370779,64)]:check(f's{n} HP={hp}',S[n]['state']['run']['current_hp']==hp)
last=S[371039]['state']['combat'];check('death boundary T6 block9 intent36',S[371039]['state']['turn']==6 and last['player']['block']==9 and last['enemies'][0]['intents'][0]['total_damage']==36)
check('poison13 before death and enemy118 after',last['enemies'][0]['current_hp']==131 and last['enemies'][0]['powers'][0]['amount']==13 and S[371040]['state']['combat']['enemies'][0]['current_hp']==118)
check('two HP guards',sum(bool(d.get('hp_guard')) for d in D.values())==2)
check('Jev best proportion',sum(d.get('rollout_best_chosen') is True for d in D.values())==187 and sum(type(d.get('rollout_best_chosen'))==bool for d in D.values())==194)
check('potion drink10 discard0',sum(d['chosen'].get('action')=='use_potion' for d in D.values())==10 and not any(d['chosen'].get('action')=='discard_potion' for d in D.values()))
for a,b,damage in [(370967,370968,15),(370968,370969,9),(370969,370970,13),(371022,371023,9),(371023,371024,13)]:check(f'actual attack s{a}->{b}={damage}',S[a]['state']['combat']['enemies'][0]['current_hp']-S[b]['state']['combat']['enemies'][0]['current_hp']==damage)
check('different discard answers',D[360485]['expect']['option']['id']=='DEFEND_SILENT' and D[360540]['expect']['option']['id']=='PREDATOR')
check('zero-cost power available before discard',any(c['card_id']=='SERPENT_FORM' and c['energy_cost']==0 for c in S[370647]['state']['combat']['hand']) and S[370647]['state']['combat']['player']['energy']==1)
check('power absent first and established second',not any(v['power_id']=='SERPENT_FORM_POWER' for r in S.values() if 370647<=r['_line']<=370698 for v in (r['state'].get('combat') or {}).get('player',{}).get('powers',[])) and any(v['power_id']=='SERPENT_FORM_POWER' and v['amount']==4 for v in S[370706]['state']['combat']['player']['powers']))
# Match the selected copies directly against their original byte ranges.
root=p.parents[2]
for name in ['decisions','states','brain','run-plans','sl-attempts']:
 count=0
 with (root/'logs'/f'{name}.jsonl').open('rb') as src:
  for row in map(json.loads,(p/f'{name}.jsonl').open()):
   src.seek(row['_offset']);raw=json.loads(src.readline());own={k:v for k,v in row.items() if k not in ['_line','_offset']}
   if raw!=own:raise AssertionError((name,row['_line']))
   count+=1
 checks.append(f'{name} 原偏移逐条一致 {count}')
check('single heading / three lessons',p.joinpath('lesson-draft.md').read_text().count('## K643VJCTQT0J')==1 and len(re.findall(r'^- \[(?!记录)',p.joinpath('lesson-draft.md').read_text(),re.M))==3)
(p/'validation.json').write_text(json.dumps({'checks':checks,'ok':True},ensure_ascii=False,indent=2)+'\n')
print('validated',len(checks),'checks')
