import json,pathlib,collections,re,datetime
P=pathlib.Path(__file__).resolve().parent
RUNS=['UZ1T7AH49WMB','7BNC8QX746YP']
def rows(name):
 with (P/(name+'-selected.txt')).open() as h:
  for line in h:
   n,s=line.split(':',1);d=json.loads(s);d['_line']=int(n);yield d
def rid(d):return d.get('run_id') or d.get('run') or (d.get('state') or {}).get('run_id')
D={r:[] for r in RUNS};S={r:[] for r in RUNS};B={r:[] for r in RUNS}
for name,bag in [('decisions',D),('states',S),('plans',B)]:
 for d in rows(name):
  if rid(d) in bag:bag[rid(d)].append(d)
for run in RUNS:
 lines=[]
 def out(*args):lines.append(' '.join(str(x) for x in args))
 ds,ss,bs=D[run],S[run],B[run]
 resources=json.loads((P/(run+'-resources.json')).read_text())
 out('RUN',run,'D',len(ds),'S',len(ss),'WINDOW',ds[0]['ts'],ds[-1]['ts'],'seconds',(datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['ts'])).total_seconds())
 out('LABELS',collections.Counter((d['decider'],d['label']) for d in ds))
 out('USAGE', {k:sum((d.get('usage') or {}).get(k,0) or 0 for d in ds) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
 for engine in ['jev','codex']:
  dd=[d for d in ds if d['decider']==engine];out(engine,'USAGE',{k:sum((d.get('usage') or {}).get(k,0) or 0 for d in dd) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
 out('PLANS')
 for b in bs:out('b'+str(b['_line']),json.dumps({k:v for k,v in b.items() if k not in ['ts','run','_line']},ensure_ascii=False))
 out('STRATEGIC')
 for d in ds:
  if d['decider']=='codex':out('d'+str(d['_line']),'F'+str(d['floor']),d['label'],d.get('chosen'),d.get('expect'),d.get('rationale'))
 out('COMBATS')
 for c in resources['combats']:
  e=c['entry'];x=c.get('exit') or c['last'];out('seq',c['sequence'],'F',c['floor'],'enemy',c['enemies'],'hp',e['hp'],x['hp'],'max',e['max_hp'],x['max_hp'],'pot',e['potions'],x['potions'],'frames',e['line'],x['line'],'time',e['ts'],x['ts'],'end',c['end'],'T1',c['entry_is_turn_one'])
  sf=[s for s in ss if e['line']<=s['_line']<=x['line']]
  starts=[]
  for s in sf:
   st=s['state']
   if st.get('in_combat') and (not starts or starts[-1]['state']['turn']!=st.get('turn')):starts.append(s)
  for i,a in enumerate(starts):
   z=starts[i+1] if i+1<len(starts) else sf[-1];st=a['state'];zt=z['state'];en=(st.get('combat') or {}).get('enemies') or [];ze=(zt.get('combat') or {}).get('enemies') or []
   hp=sum(e['current_hp'] for e in en if e['is_alive']);zh=sum(e['current_hp'] for e in ze if e['is_alive'])
   out(' T',st['turn'],'need',hp,'net_enemy',hp-zh,'player',st['run']['current_hp'],zt['run']['current_hp'],'frames',a['_line'],z['_line'],'enemies',[(e['enemy_id'],e['current_hp']) for e in en if e['is_alive']])
 out('RESOURCES')
 for change in resources['resource_changes']:
  a,b=change['from'],change['to'];out('s'+str(a['line'])+'->s'+str(b['line']),'F'+str(b['floor']),'T'+str(b['turn']),'seq'+str(change['combat_sequence']),'hp',a['hp'],b['hp'],'max',a['max_hp'],b['max_hp'],'pot',a['potions'],b['potions'],'restart',change['restart_boundary'])
 out('SL')
 for x in resources['sl_events']:out(x)
 out('LOW CONFIDENCE')
 for d in ds:
  if d['decider']=='jev' and (d.get('confidence') or 0)<.35:out('d'+str(d['_line']),'F'+str(d['floor']),'T'+str(d['turn']),d['confidence'],d['rationale'])
 out('CODE PRIMARY',collections.Counter(d['label'] for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'))
 out('GUARD')
 for d in ds:
  if any(k in json.dumps({k:v for k,v in d.items() if k not in ['questions','fingerprint','journal']}).lower() for k in ['guard','护栏']):out('d'+str(d['_line']),d['rationale'],d.get('chosen'))
 (P/(run+'-summary.txt')).write_text('\n'.join(lines)+'\n')
 with (P/(run+'-frames.jsonl')).open('w') as h:
  for s in ss:
   st=s['state'];c=st.get('combat') or {};p=c.get('player') or {}
   h.write(json.dumps({'line':s['_line'],'ts':s['ts'],'floor':st['run']['floor'],'turn':st.get('turn'),'screen':st['screen'],'hp':st['run']['current_hp'],'max':st['run']['max_hp'],'player':p,'hand':c.get('hand'),'enemies':c.get('enemies')},ensure_ascii=False)+'\n')
 print(run,len(lines),'summary lines')
