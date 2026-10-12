import json,collections,re,datetime
from pathlib import Path
p=Path('learner/runs/20261007-221303-postmortem')
def rows(n):
 for line in (p/n).open():
  num,s=line.split(':',1);d=json.loads(s);d['_line']=int(num);yield d
D=list(rows('decisions-lines.jsonl'));S=list(rows('states-lines.jsonl'));R=json.loads((p/'WQZVENQ7DTRP-resources.json').read_text());A=list(rows('sl-lines.jsonl'))
byts={s['observed_ts']:s for s in S}
print('SCOUNT',len(S),S[0]['_line'],S[-1]['_line'],'DCOUNT',len(D),D[0]['_line'],D[-1]['_line'])
print('SL')
for a in A:
 print(a['_line'],{k:v for k,v in a.items() if k not in ['summary','initial','decisions','turns','evidence','judge','reload']})
 print('summary keys',list((a.get('summary') or {})))
 for k in ['judge','reload']:print(k,json.dumps(a.get(k),ensure_ascii=False)[:2500])
print('COMBATS')
for c in R['combats']:
 entry=c['entry'];last=c.get('exit') or c['last'];frames=[s for s in S if entry['line']<=s['_line']<=last['line']]
 ids={e['enemy_id']:e['name'] for s in frames for e in (s['state'].get('combat') or {}).get('enemies',[])}
 print(c['sequence'],c['floor'],ids,'HP',entry['hp'],last['hp'],'max',entry['max_hp'],last['max_hp'],'P',entry['potions'],last['potions'],'L',entry['line'],last['line'],'T',entry['turn'],c['last']['turn'],'TS',entry['ts'],last['ts'],'end',c['end'])
 turn_groups={}
 for s in frames:
  if s['state']['in_combat']:turn_groups.setdefault(s['state']['turn'],[]).append(s)
 for t,group in turn_groups.items():
  first=group[0];fin=group[-1];nxt=next((x for x in frames if x['_line']>fin['_line']),None)
  st=first['state'];nd=(nxt or fin)['state'];en=(st.get('combat') or {}).get('enemies',[]);ef=(nd.get('combat') or {}).get('enemies',[])
  hp=sum(e['current_hp'] for e in en);left=sum(e['current_hp'] for e in ef);loss=st['run']['current_hp']-nd['run']['current_hp']
  end=(fin['state'].get('combat') or {});pl=end.get('player',{})
  print('ROUND',c['sequence'],c['floor'],t,'need',hp,'dealt',hp-left,'loss',loss,'startline',first['_line'],'endline',fin['_line'],'endplayer',json.dumps(pl,ensure_ascii=False),'endenemy',json.dumps([{k:e.get(k) for k in ['enemy_id','current_hp','block','powers','intents','move_id']} for e in end.get('enemies',[])],ensure_ascii=False))
print('RESOURCE_EVENTS')
for x in R['resource_changes']:
 print('CHANGE',x['combat_sequence'],x['restart_boundary'],x['from']['line'],x['to']['line'],x['to']['ts'],'F/T',x['to']['floor'],x['to']['turn'],'HP',x['from']['hp'],x['to']['hp'],'P',x['from']['potions'],x['to']['potions'])
print('POTIONS')
for d in D:
 if 'potion' in d['chosen']['action']:
  s=byts.get(d.get('observed_ts'));pot=next((x for x in s['state']['run']['potions'] if x['index']==d['chosen'].get('option_index')),{}) if s else {}
  print(d['_line'],d['ts'],d['floor'],d['turn'],'attempt',d.get('sl_attempt'),d['chosen'],pot.get('name'),pot.get('potion_id'),'result',d.get('result'))
print('GUARDS')
for d in D:
 if re.search(r'guard|safer|least-loss|explor|HP|rank',d.get('rationale',''),re.I) and (re.search(r'guard|safer|explor',d.get('rationale',''),re.I) or d['label']=='combat/least-loss'):
  print('GUARD',d['_line'],d['floor'],d['turn'],d.get('sl_attempt'),d['rationale'])
  print('KEYS',list(d));print('SIM',json.dumps({k:v for k,v in d.items() if k not in ['questions','fingerprint','rationale','journal']},ensure_ascii=False)[:9000])
print('STATS')
for key in ['rollout_best_chosen','focus','hp_guard','rollout','sl_explore']:
 print(key,collections.Counter(type(d[key]).__name__ for d in D if key in d))
print('D_KEYS',collections.Counter(k for d in D for k in d if re.search('roll|guard|focus|sim|plan',k)))
print('END DECK',json.dumps(S[-1]['state']['run']['deck'],ensure_ascii=False))
print('END RELICS',json.dumps(S[-1]['state']['run']['relics'],ensure_ascii=False))
