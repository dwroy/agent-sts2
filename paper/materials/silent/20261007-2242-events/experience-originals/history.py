import collections,json
from pathlib import Path
O=Path(__file__).parent;A=json.load(open(O/'audit.json'));E=json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'));C=json.load(open(O/'changes.json'));R={x['run_id']:x for x in json.load(open(O/'run-metadata.json'))};B={x['id']:x for x in E['entries']};F={}
for eid in C['updated']+C['added']:
 e=B[eid];F[eid]=dict(evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc_support=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),asc_contradict=dict(collections.Counter(R[r]['ascension'] for r in e.get('contradicting',[]))))
 if e['scope'].startswith('card:') and eid not in ['silent-beckon-held-end-turn-loss','silent-survivor-neutralize-discard']:
  card=e['scope'].split(':')[1];plays=[x for x in A['cards'] if x['card']==card];actual={x['run'] for x in plays};support=set(e['evidence']);assert support<=actual,(eid,support-actual)
  F[eid].update(actual_runs=len(actual),actual_plays=len(plays),actions=[x for x in plays if x['run'] in support])
 if e['scope'].startswith(('boss:','hallway:','elite:')):
  enemy=e['scope'].split(':')[1];cases=[x for x in A['fights'] if x['run'] in e['evidence'] and (enemy in x['enemies'] or (enemy=='KAISER_CRAB' and {'CRUSHER','ROCKET'}<=set(x['enemies'])) or (enemy=='ZAPBOT' and any(y['run']==x['run'] and y['floor']==x['floor'] for y in json.load(open(O/'new-mechanism-history.json'))['silent-zapbot-high-voltage-growth']['cases'])))];assert set(e['evidence'])<=set(x['run'] for x in cases)
  groups=collections.defaultdict(list)
  for x in A['attempts']:
   if any(f['run']==x['run'] and f['floor']==x['floor'] for f in cases):groups[(x['run'],x['floor'])].append(x)
  multi=[v for v in groups.values() if max(x['attempt'] for x in v)>1]
  F[eid].update(fights=cases,attempts=sum(map(len,groups.values())),wins=sum(x['result']=='won' for v in groups.values() for x in v),sl_fights=len(multi),sl_attempts=sum(map(len,multi)),sl_wins=sum(x['result']=='won' for v in multi for x in v),sl_multi=multi)
for eid,v in F.items():
 e=B[eid]
 if e['scope'].startswith('relic:'):
  relic=e['scope'].split(':')[1]
  for run in e['evidence']:
   assert any(('\"relic_id\":\"'+relic+'\"') in line or ('\"relic_id\": \"'+relic+'\"') in line for line in (O/run/'states.jsonl').open()),(eid,run,relic)
  v['actual_holder_runs']=len(e['evidence'])
(O/'historical-facts.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
for eid,v in F.items():print(eid,v['asc_support'],{k:v[k] for k in ['actual_runs','actual_plays','attempts','wins','sl_fights','sl_attempts','sl_wins'] if k in v})
print('逐支持局/角色/进阶/实际施放及SL统计核对通过')
