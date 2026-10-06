import json,collections,bisect,hashlib,pathlib
O=pathlib.Path(__file__).parent; ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
NEW=['87LCSDR5P3DL','TKXQ6L4N9A6U']
selected=['FOOTWORK','NOXIOUS_FUMES','PIERCING_WAIL','TOXIC','SERPENT_FORM']
facts=[x for x in A['cards'] if x['card'] in selected]
(O/'mechanism-actions.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
support={k:sorted({x['run'] for x in facts if x['card']==k},key=lambda r:R[r]['ended']) for k in selected}
paid=[x for x in facts if x['card']=='TOXIC']
assert all('5' in x['text'] and x['before']['energy']-x['after']['energy']==1 for x in paid)
support['TOXIC'].insert(0,'C48LLXBGKXQ9')
(O/'mechanism-supports.json').write_text(json.dumps(support,ensure_ascii=False,indent=2)+'\n')
for k,rs in support.items():print(k,len(rs),dict(collections.Counter(R[r]['ascension'] for r in rs)))
for run in NEW:
 S=[json.loads(l) for l in (O/run/'states.jsonl').open()];D=[json.loads(l) for l in (O/run/'decisions.jsonl').open()]
 stamps={s['observed_ts']:s for s in S}
 assert all(d['observed_ts'] in stamps and d['fingerprint']==stamps[d['observed_ts']]['fingerprint'] for d in D)
 print('指纹',run,len(S),len(D))
 print('战斗房',run,[{k:v for k,v in f.items() if k!='enemies'} for f in A['fights'] if f['run']==run])
 print('营火',run,[(f['floor'],f['action'],f['before'],f['after']) for f in A['rests'] if f['run']==run])
 print('SL',run,[(x['floor'],x['attempt'],x['result']) for x in A['attempts'] if x['run']==run])
 if run==NEW[1]:
  d=next(d for d in D if d['floor']==22 and d['turn']==6 and d['chosen']['action']=='end_turn')
  b=stamps[d['observed_ts']]['state'];t=[c for c in b['combat']['hand'] if c['card_id']=='TOXIC']
  assert len(t)==2 and all(c['energy_cost']==1 and '5' in c['resolved_rules_text'] for c in t)
  assert b['run']['current_hp']==7 and b['combat']['player']['block']==0
  last=S[-1]['state'];assert last['run']['current_hp']==0
  assert [(e['current_hp'],next(p['amount'] for p in e['powers'] if p['power_id']=='POISON_POWER')) for e in last['combat']['enemies']]==[(6,11),(1,14)]
  (O/'toxic-death-proof.json').write_text(json.dumps(dict(decision=d,before=b,after=last),ensure_ascii=False,indent=2)+'\n')
case_runs=['C48LLXBGKXQ9','T082DRCUHRRD','CSBR5CRDWQNB','TKXQ6L4N9A6U'];windows=[]
for run in case_runs:
 S=[json.loads(l) for l in (O/run/'states.jsonl').open()]
 for i,x in enumerate(S):
  s=x['state'];h=(s.get('combat') or {}).get('hand',[])
  if run==case_runs[0] and s['run']['floor']==31 and s.get('turn')==2 and any(c['card_id']=='TOXIC' for c in h):windows.append(dict(run=run,kind='最早牌面',state=x));break
  if run==case_runs[2] and s['run']['floor']==29 and s.get('turn') in [2,3] and any(c['card_id']=='TOXIC' for c in h):windows.append(dict(run=run,kind='持牌窗口',state=x))
(O/'toxic-historical-windows.json').write_text(json.dumps(windows,ensure_ascii=False,indent=2)+'\n')
assert any(x['kind']=='最早牌面' for x in windows)
out=[]
for f in (ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json'):
 if f.name=='experience.json':continue
 data=json.load(open(f));out.append(dict(file=f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),meta=data.get('meta'),generated=data.get('generated'),baselines={k:v.get('baseline') for k,v in data.get('by_ascension',{}).items()}))
(O/'other-knowledge.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
ds=[]
for run in NEW:
 row=R[run]; start=json.loads(next((O/run/'decisions.jsonl').open()))['ts']; ds.append(dict(run=run,start=start,end=row['ended'],seek=376968438,count=0))
 with (ROOT/'logs/deepseek-reasoning.jsonl').open('rb') as f:
  f.seek(376968438)
  for l in f:
   x=json.loads(l)
   if start<=x['ts']<=row['ended']:ds[-1]['count']+=1
   if x['ts']>row['ended']:break
(O/'deepseek-window-check.json').write_text(json.dumps(ds,ensure_ascii=False,indent=2)+'\n')
print('DeepSeek时间窗',ds)
