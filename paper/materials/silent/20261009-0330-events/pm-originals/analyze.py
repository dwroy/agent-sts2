import json,pathlib,subprocess,datetime,collections
root=pathlib.Path('/home/dw/Projects/agent-sts2');out=root/'learner/runs/20261009-031301-postmortem'
d=json.loads((out/'decisions.json').read_text());s=json.loads((out/'states.json').read_text());r=json.loads((out/'FU8ZUQHBHNV9-resources.json').read_text())
brain=[]
p=subprocess.Popen(['rg','-n','-F','FU8ZUQHBHNV9',str(root/'logs/brain.jsonl')],stdout=subprocess.PIPE,text=True)
for raw in p.stdout:
 n,t=raw.split(':',1);v=json.loads(t);v['_line']=int(n);brain.append(v)
p.wait();(out/'brain.json').write_text(json.dumps(brain,ensure_ascii=False,indent=2)+'\n')
print('BRAIN',[(x['_line'],x['engine'],list(x)) for x in brain[:1]],len(brain))
path=root/'logs/deepseek-reasoning.jsonl';offset=max(0,path.stat().st_size-4*1024*1024);tail=[];matches=[]
with path.open('rb') as f:
 f.seek(offset)
 if offset:f.readline()
 for raw in f:
  try:v=json.loads(raw)
  except:continue
  tail.append(v.get('ts'))
  if d[0]['ts']<=v.get('ts','')<=d[-1]['ts']:matches.append(v)
proof={'offset':offset,'size':path.stat().st_size,'rows_in_tail':len(tail),'first_ts':tail[0] if tail else None,'last_ts':tail[-1] if tail else None,'window':[d[0]['ts'],d[-1]['ts']],'matches':matches}
(out/'reasoning-window.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n');print('REASONING',proof)
byline={x['_line']:x for x in s};turns=[]
for combat in r['combats']:
 rows=[x for x in s if combat['entry']['line']<=x['_line']<=combat['exit']['line']]
 ts=collections.OrderedDict()
 for row in rows:
  st=row['state'];t=st.get('turn');ts.setdefault(t,[]).append(row)
 for t,group in ts.items():
  a=group[0];z=group[-1];nextrows=[x for x in rows if x['_line']>z['_line']];end=nextrows[0] if nextrows else z
  # Include enemy aftermath from next frame; net decreases are progress, not damage source totals.
  enemies=(a['state'].get('combat') or {}).get('enemies',[])
  final=(end['state'].get('combat') or {}).get('enemies',[])
  need=sum(e['current_hp'] for e in enemies if e['is_alive']);left=sum(e['current_hp'] for e in final if e['is_alive'])
  hp=a['state']['run']['current_hp'];hp_end=end['state']['run']['current_hp']
  v={'floor':combat['floor'],'turn':t,'first_line':a['_line'],'end_line':end['_line'],'hp':hp,'hp_end':hp_end,'hp_loss':hp-hp_end,'need':need,'live_hp_left':left,'net_progress':need-left}
  turns.append(v)
 print('TURNS',combat['floor'],[x for x in turns if x['floor']==combat['floor']])
(out/'turns.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2)+'\n')
print('TIMING', (datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds(),(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['observed_ts'])).total_seconds())
for typ in ['jev','codex']:
 a=[x for x in d if x['decider']==typ];print('USAGE',typ,{k:sum(x.get('usage',{}).get(k,0) for x in a) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
for labels in [['combat/plan','combat/lethal','combat/least-loss'],['combat/plan','combat/lethal','combat/least-loss','combat/end_turn']]:
 a=[x for x in d if x['decider']=='code' and x['label'] in labels];print('CODE-TURN',len(a),len(set((x['floor'],x.get('turn')) for x in a)))
for x in d:
 if x['_line'] in [303637,303656]:print('INSPECT',x['_line'],json.dumps(x.get('questions'),ensure_ascii=False)[:10000])
for x in brain:
 if x['label'] in ['rest/plan','map/route-plan']:print('BRAININPUT',x['_line'],str(x.get('user',x.get('prompt',x.get('input'))))[:17000])
