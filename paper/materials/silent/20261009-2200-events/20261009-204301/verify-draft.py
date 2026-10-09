import json,pathlib,collections,math,hashlib,datetime
p=pathlib.Path('learner/runs/20261009-204303-postmortem');r='54G5683J0E5S';ds=[json.loads(l) for l in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{r}-states.jsonl').open()];a=json.load((p/f'{r}-resources.json').open());checks=[]
def ck(name,actual,expected):
 checks.append({'项目':name,'实值':actual,'预期':expected,'通过':actual==expected})
si={s['_line']:s['state'] for s in ss}
ck('decision rows',len(ds),639);ck('states rows',len(ss),670);ck('combats',len(a['combats']),17);ck('final floor',si[329564]['run']['floor'],44);ck('entry HP',si[329543]['run']['current_hp'],36);ck('last hp',si[329563]['run']['current_hp'],21);ck('last block',si[329563]['combat']['player']['block'],8);ck('last turn',si[329564]['turn'],3)
ck('last attacks',sum(q.get('total_damage')or 0 for e in si[329563]['combat']['enemies'] if e['enemy_id']!='STABBOT' for q in e['intents']),32)
ck('frame Swift belt',[q['potion_id'] for q in si[328957]['run']['potions'] if q['occupied']],[])
ck('potions uses',sum(d.get('chosen',{}).get('action')=='use_potion' for d in ds),12);ck('potions discards',sum(d.get('chosen',{}).get('action')=='discard_potion' for d in ds),0);ck('guard swaps',sum('HP guard:' in d.get('rationale','') for d in ds),1)
crit=ds[589]['questions']['plan']['criteria'];c1=json.loads(crit['plan1']);c2=json.loads(crit['plan2']);ck('guard hp difference',c2['hp_lost']-c1['hp_lost'],14);ck('guard damage difference',c2['damage_dealt']-c1['damage_dealt'],14)
ck('cache rate rounded',round(4729088/6577001*100,4),71.9034)
ck('duration second',round((datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['ts'])).total_seconds(),3),2303.779)
ck('observed duration',round((datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['observed_ts'])).total_seconds(),3),2333.671)
ck('combined tokens',6577001+15503+561844+6183,7160531)
ck('Jev plans counted',sum('continuing the Jev-chosen plan' in d.get('rationale','') for d in ds),133)
for c in a['combats']:
 ck(f"F{c['floor']}入口T1",c['entry_is_turn_one'],True)
 for t in c['enemy_hp_audit']['turns']:
  ck(f"F{c['floor']}T{t['turn']}入口层",si[t['start_line']]['run']['floor'],c['floor'])
  ck(f"F{c['floor']}T{t['turn']}出口层",si[t['end_line']]['run']['floor'],c['floor'])
print('校验',len(checks),'失败',[c for c in checks if not c['通过']]);(p/'draft-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
for n,d in enumerate(ds,1):
 if d['floor']==18:print('F18',n,d.get('rationale','')[:400])
for name in ['GAMBLERS_BREW','DEXTERITY_POTION']:
 for x in ss:
  if x['state']['run']['floor']==42 and x['state'].get('in_combat'):
   if x['_line'] in [329499,329500]:print('F42 potion',x['_line'],x['state']['combat']['player']['powers'])
