import json,pathlib,collections
p=pathlib.Path(__file__).parent
load=lambda n:[json.loads(l) for l in (p/f'{n}.jsonl').open()]
d=load('decisions');s=load('states'); rc=json.load((p/'833ZM0MJGWHC-resources.json').open())
with (p/'summary.txt').open('w') as f:
 def pr(*a): print(*a,file=f)
 pr('首末',d[0]['ts'],d[-1]['ts']);pr('来源',load('run-config'))
 for c in rc['combats']:
  e=c['entry'];x=c['exit'];l=c['last'];pr('战斗',c['sequence'],c['floor'],c['enemies'],'入口',e,'末帧',l,'出口',x,'结尾',c['end'],'净损',c['observed_net_hp_loss'])
 for r in load('sl-attempts'):
  pr('SL',{k:r.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','turns','end_hp','end_block','incoming','judge','give_up_reason']})
 pr('药水动作')
 for r in d:
  if 'potion' in json.dumps(r.get('chosen',{})):pr(r['_line'],r['ts'],r['floor'],r['turn'],r['chosen'],r['rationale'])
 pr('HP护栏')
 for r in d:
  if 'guard' in json.dumps({k:v for k,v in r.items() if k not in ('questions',)}).lower():pr({k:v for k,v in r.items() if k not in ('questions','fingerprint')})
 pr('策略')
 for r in d:
  if r['decider']=='codex':pr(r['_line'],r['ts'],r['floor'],r['turn'],r['label'],r['chosen'],r['rationale'],r.get('journal'))
with (p/'turns.txt').open('w') as f:
 for c in rc['combats']:
  if c['floor']<42:continue
  print('战斗',c['sequence'],c['floor'],file=f)
  frames=[r for r in s if c['entry']['ts']<=r['ts']<=c['last']['ts']]
  groups={}
  for r in frames:groups.setdefault(r['state'].get('turn'),[]).append(r)
  for t,rs in groups.items():
   for lab,r in [('初',rs[0]),('末',rs[-1])]:
    st=r['state'];cb=st.get('combat') or {};pl=cb.get('player') or {}; print(t,lab,r['_line'],r['ts'],'HP',st['run']['current_hp'],'挡',pl.get('block'),'力量/敏捷等',pl.get('powers'),'敌',[(e['index'],e['enemy_id'],e['name'],e['current_hp'],e['max_hp'],e.get('block'),e.get('is_alive'),e.get('move_id'),e.get('intents'),e.get('powers')) for e in cb.get('enemies',[])],file=f)
