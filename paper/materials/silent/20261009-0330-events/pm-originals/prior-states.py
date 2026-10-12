import json,subprocess,pathlib
out=pathlib.Path('learner/runs/20261009-031301-postmortem');ds=json.loads((out/'prior-blade-decisions.json').read_text());sample=next(r for r in ds if r.get('expect',{}).get('card',{}).get('id')=='BLADE_DANCE');print('ACTION',sample['_line'],sample['ts'],sample['floor'],sample['turn'])
rows=[];p=subprocess.Popen(['rg','-n','-F','C48LLXBGKXQ9','logs/states.jsonl'],stdout=subprocess.PIPE,text=True)
for raw in p.stdout:
 n,t=raw.split(':',1);r=json.loads(t)
 if r.get('state',{}).get('run',{}).get('floor')==sample['floor'] and r.get('state',{}).get('turn')==sample['turn']:
  r['_line']=int(n);rows.append(r)
p.wait();(out/'prior-blade-states.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for r in rows:
 c=r['state'].get('combat') or {};print(r['_line'],r['ts'],'hand',[(x['card_id'],x['energy_cost']) for x in c.get('hand',[])],'piles',[(k,len(c.get(k,[])) if isinstance(c.get(k),list) else c.get(k)) for k in ['draw_pile','discard_pile']])
