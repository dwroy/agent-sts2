import json,pathlib,collections,datetime
p=pathlib.Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()]
# Keep each attempt distinct and use logged frames, including the last frame before reload.
groups=[];prevfloor=None;prevturn=0
for x in S:
 s=x['state'];c=s.get('combat');t=s.get('turn');f=s['run']['floor']
 if not c or not t:continue
 if f!=prevfloor or t<prevturn:groups.append([])
 groups[-1].append(x);prevfloor=f;prevturn=t
report=[]
for gi,g in enumerate(groups):
 floor=g[0]['state']['run']['floor'];a=sum(1 for old in groups[:gi+1] if old[0]['state']['run']['floor']==floor)
 turns=collections.defaultdict(list)
 for x in g:turns[x['state']['turn']].append(x)
 rows=[]
 for t,frames in turns.items():
  st=frames[0]['state'];en=frames[-1]['state'];cp=st['combat']['player'];ep=en['combat']['player'];es=st['combat']['enemies'];ee=en['combat']['enemies']
  # First frame of the next turn carries the actual enemy-phase result.
  nxt=turns.get(t+1);after=nxt[0]['state'] if nxt else en
  loss=cp['current_hp']-after['combat']['player']['current_hp'];need=sum(e['current_hp'] for e in es if e['is_alive']);left=sum(e['current_hp'] for e in after['combat']['enemies'] if e['is_alive'])
  lastd=[d for d in D if d['floor']==floor and d['turn']==t and (d.get('sl_attempt') or 1)==a and d.get('chosen') and d['label'].startswith('combat/')]
  rows.append({'t':t,'hp':cp['current_hp'],'need':need,'扣':need-left,'损':loss,'末血':ep['current_hp'],'末挡':ep['block'],'末敌':[(e['current_hp'],e.get('block'),e.get('powers'),e.get('intents')) for e in ee], '玩家增益':cp.get('powers'), '末增益':ep.get('powers'),'截断':bool(lastd and lastd[-1]['result'].startswith('not dispatched'))})
 summary={'floor':floor,'attempt':a,'entry':g[0]['state']['combat']['player']['current_hp'],'enemies':[(e['name'],e['enemy_id'],e['current_hp']) for e in g[0]['state']['combat']['enemies']],'turns':rows}
 report.append(summary)
with (p/'fights.json').open('w') as f:json.dump(report,f,ensure_ascii=False,indent=2)
for r in report:
 print('战斗',r['floor'],r['attempt'],'进场',r['entry'],r['enemies'])
 print('轮初血',[x['hp'] for x in r['turns']],'需',[x['need'] for x in r['turns']],'扣',[x['扣'] for x in r['turns']],'损',[x['损'] for x in r['turns']],'截断',[x['t'] for x in r['turns'] if x['截断']])
 print('末轮',r['turns'][-1])
print('Jev',sum(d['decider']=='jev' for d in D),'低信心',[(d['floor'],d['turn'],d.get('sl_attempt'),d['confidence']) for d in D if d['decider']=='jev' and d['confidence']<.35])
rb=[d for d in D if isinstance(d.get('rollout_best_chosen'),bool)];print('最优',sum(d['rollout_best_chosen'] for d in rb),len(rb))
print('护栏',[(d['floor'],d['turn'],d['rationale']) for d in D if 'HP guard' in d.get('rationale','')])
print('代码自主',sum(d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue' for d in D))
print('SL替换')
for d in D:
 if d.get('sl_explore'):print(d['sl_attempt'],d['turn'],d['label'],d.get('sl_explore'),d.get('result'))
print('药水动作')
for d in D:
 if d.get('chosen',{}).get('action') in ['use_potion','discard_potion'] or 'potion' in d.get('label',''):print(d['floor'],d['turn'],d.get('sl_attempt'),d.get('chosen'),d.get('expect'))
