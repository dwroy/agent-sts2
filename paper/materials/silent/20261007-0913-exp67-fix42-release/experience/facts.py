import bisect,collections,json,pathlib
O=pathlib.Path(__file__).parent;P=O/'KQQELQSZ382Z'
S=[json.loads(x) for x in (P/'states.jsonl').open()];D=[json.loads(x) for x in (P/'decisions.jsonl').open()]
SM={s['observed_ts']:s['state'] for s in S};TS={s['ts']:s['state'] for s in S};times=[s['ts'] for s in S]
def st(d):return SM.get(d['observed_ts']) or TS[d['ts']]
def pw(p):return {x['power_id']:x['amount'] for x in p.get('powers',[])}
def brief(s):
 c=s.get('combat') or {};p=c.get('player',{})
 return dict(hp=p.get('current_hp',s['run']['current_hp']),block=p.get('block'),energy=p.get('energy'),powers=pw(p),enemies=[dict(id=e['enemy_id'],hp=e['current_hp'],block=e['block'],powers=pw(e),intents=e['intents']) for e in c.get('enemies',[])])
assert all(st(d)==TS[d['ts']] for d in D)
F=[];groups=collections.OrderedDict()
for i,d in enumerate(D):
 s=st(d)
 if d['screen']=='COMBAT':groups.setdefault((d['floor'],d.get('sl_attempt') or 0,d['turn']),[]).append((i,d,s))
 if d['chosen']['action']=='play_card' and d.get('expect',{}).get('card',{}).get('id') in ['SNAKEBITE','PIERCING_WAIL','DASH','DEFEND_SILENT','DEFLECT']:
  card=d['expect']['card']['id'];played=next(c for c in s['combat']['hand'] if c['card_id']==card)
  z=S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state']
  F.append(dict(floor=d['floor'],attempt=d.get('sl_attempt') or 0,turn=d['turn'],ts=d['ts'],card=card,text=played.get('resolved_rules_text'),dynamic=played.get('dynamic_values'),before=brief(s),after=brief(z)))
sl=[json.loads(x) for x in (P/'sl-attempts.jsonl').open()]
assert len(sl)==6 and [x['result'] for x in sl]==['predicted_death']*5+['died']
assert all(x['draws']['order'][:24]==sl[0]['draws']['order'][:24] for x in sl)
final=[(k,v) for k,v in groups.items() if k[0]==17 and k[1]==6]
turns=[]
for j,(key,rows) in enumerate(final):
 s=rows[0][2]
 end=final[j+1][1][0][2] if j+1<len(final) else S[-1]['state']
 turns.append(dict(turn=key[2],start=brief(s),end=brief(end),damage=sum(e['current_hp'] for e in s['combat']['enemies'])-sum(e['current_hp'] for e in (end.get('combat') or {}).get('enemies',[])),loss=brief(s)['hp']-brief(end)['hp']))
assert [x['damage'] for x in turns]==[0,0,6,18,17,24,16,24,26,22,12,16,20]
assert [x['loss'] for x in turns]==[0,0,0,16,0,5,0,6,18,1,0,13,5]
poison=[x['before']['enemies'][0]['powers'].get('POISON_POWER',0) for x in F if x['floor']==17 and x['attempt']==6 and x['card']=='SNAKEBITE']
assert poison==[5,9]
for x in F:
 if x['floor']==17 and x['attempt']==6 and x['card']=='SNAKEBITE':
  assert x['before']['energy']-x['after']['energy']==2
  assert x['after']['enemies'][0]['powers']['POISON_POWER']-x['before']['enemies'][0]['powers']['POISON_POWER']==7
  assert x['after']['enemies'][0]['hp']==x['before']['enemies'][0]['hp']
quotes=[dict(ts=d['ts'],floor=d['floor'],label=d['label'],rationale=d['rationale']) for d in D if d['label'] in ['rest/plan','reward/card','reward/select','map/route-plan','run/plan'] or '尖啸对多段精英' in d['rationale']]
brain=[json.loads(x) for x in (P/'brain.jsonl').open()]
(O/'new-facts.json').write_text(json.dumps(dict(frames=len(S),decisions=len(D),cards=F,turns=turns,sl=sl,brain=dict(collections.Counter(x['engine'] for x in brain))),ensure_ascii=False,indent=2)+'\n')
(O/'journal-quotes.json').write_text(json.dumps(quotes,ensure_ascii=False,indent=2)+'\n')
print('指纹/状态',len(D),'一致；帧',len(S),'六次相同初24抽序均败；末201伤/64实损；脑',collections.Counter(x['engine'] for x in brain))
print('新蛇咬',[(x['floor'],x['attempt'],x['turn'],x['before']['energy'],x['after']['energy']) for x in F if x['card']=='SNAKEBITE'])
