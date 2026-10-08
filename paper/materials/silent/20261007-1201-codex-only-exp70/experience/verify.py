import collections,json
from pathlib import Path
O=Path(__file__).parent;out={}
def ehp(s):return sum(e['current_hp'] for e in (s.get('combat') or {}).get('enemies',[]) if e['is_alive'])
for N in ['2Y27VAYZDA02','TDLBRNA0R05B']:
 S=[json.loads(l) for l in (O/N/'states.jsonl').open()];D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()];SM={x['ts']:x['state'] for x in S};SL=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()]
 groups=collections.defaultdict(list)
 for d in D:
  if d['screen']=='COMBAT' and d.get('chosen'):groups[(d['floor'],d.get('sl_attempt') or 1,d['turn'])].append(d)
 turns=[]
 for sl in SL:
  f=sl['floor'];a=sl['attempt'];gg=[(t,ds) for (ff,aa,t),ds in groups.items() if ff==f and aa==a];starts=[SM[ds[0]['ts']] for t,ds in sorted(gg)]
  turns.append(dict(floor=f,attempt=a,result=sl['result'],needs=[ehp(x) for x in starts],dealt_between_turns=[ehp(starts[i])-ehp(starts[i+1]) if ehp(starts[i+1])<=ehp(starts[i]) else None for i in range(len(starts)-1)],loss_between_turns=[starts[i]['run']['current_hp']-starts[i+1]['run']['current_hp'] for i in range(len(starts)-1)],entry_hp=starts[0]['run']['current_hp'],terminal_turn=sl['turns']))
 contrasts=[]
 for f in sorted({x['floor'] for x in SL if x['attempt']>1}):
  xs=[x for x in SL if x['floor']==f];draws=[x['draws'] for x in xs];m=min(x['clean'] for x in draws);order=0;when=0
  for i in range(m):
   if len({d['order'][i] for d in draws})==1:order+=1
   else:break
  for i in range(order):
   if len({str(d['turns'][i]) for d in draws})==1:when+=1
   else:break
  contrasts.append(dict(floor=f,attempts=len(xs),wins=sum(x['result']=='won' for x in xs),common_initial_order=order,common_arrival_turn_prefix=when))
 flags=[]
 for d in D:
  x=d.get('sl_explore') or {};p=x.get('replay') or {};v=x.get('avoid') or {}
  if x.get('replacement') or p.get('overridden') or v.get('replacement'):
   flags.append(dict(ts=d['ts'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt'),kind='replay' if p else 'explore',detail=x))
 out[N]=dict(turns=turns,sl_draw_comparisons=contrasts,sl_overrides=flags)
 if N=='2Y27VAYZDA02':
  assert collections.Counter(x['kind'] for x in flags)=={'replay':6,'explore':4}
  last=next(x for x in turns if x['floor']==22 and x['attempt']==4);assert last['needs']==[177,148,131,119,103] and last['dealt_between_turns']==[29,17,12,16] and last['loss_between_turns']==[0,0,5,6]
  assert SM[D[-1]['ts']]['run']['current_hp']==0 and ehp(SM[D[-1]['ts']])==89
 else:
  assert collections.Counter(x['kind'] for x in flags)=={'replay':1,'explore':7}
  queen=next(x for x in turns if x['floor']==48 and x['attempt']==4);assert queen['needs']==[612,556,531,501,464,413,352,269,184,81] and queen['loss_between_turns']==[0,0,25,0,9,15,0,15,0]
  subject=next(x for x in turns if x['floor']==49 and x['attempt']==6);assert subject['needs']==[102,50] and subject['dealt_between_turns']==[52] and subject['entry_hp']==4
  assert SM[D[-1]['ts']]['run']['current_hp']==0 and ehp(SM[D[-1]['ts']])==29
  first=SM[groups[(48,2,3)][0]['ts']];second=SM[groups[(48,4,3)][0]['ts']];assert first['combat']==second['combat'] and first['run']['current_hp']==second['run']['current_hp']==66
  for a,loss,damage in [(2,10,25),(4,25,30)]:
   x=next(x for x in turns if x['floor']==48 and x['attempt']==a);assert x['dealt_between_turns'][2]==damage and x['loss_between_turns'][2]==loss
(O/'verified-battles.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('两局末试逐轮、同盘SL血价、初抽序/到手轮和覆盖勘误均核对通过')
