import json,pathlib,collections,datetime
p=pathlib.Path(__file__).resolve().parent

def rows(name):
 out=[]
 for line in (p/name).open():
  n,s=line.split(':',1);r=json.loads(s);r['_line']=int(n);out.append(r)
 return out
ss=rows('states-lines.jsonl');ds=rows('decisions-lines.jsonl');bs=rows('brain-lines.jsonl');rr=json.loads((p/'WZL2AMEY85S7-resources.json').read_text())
turns=[]
for c in rr['combats']:
 end=(c['exit'] or c['last'])['line'];fs=[s for s in ss if c['entry']['line']<=s['_line']<=end]
 groups=collections.defaultdict(list)
 for s in fs:
  if s['state'].get('in_combat') and s['state'].get('combat',{}).get('enemies'): groups[s['state']['turn']].append(s)
 for t,g in groups.items():
  a,z=g[0],g[-1];following=next((s for s in fs if s['_line']>z['_line']),None)
  def enemy(s):
   return [{k:e.get(k) for k in ['index','enemy_id','name','current_hp','max_hp','block','powers','intents','move_id']} for e in s['state']['combat']['enemies']]
  relevant=[d for d in ds if d.get('observed_ts') and a['observed_ts']<=d['observed_ts']<=z['observed_ts']]
  turns.append({'sequence':c['sequence'],'floor':c['floor'],'turn':t,'start':a['_line'],'last':z['_line'],'next':following['_line'] if following else None,'hp_start':a['state']['run']['current_hp'],'hp_end':(following or z)['state']['run']['current_hp'],'player_start':a['state']['combat']['player'],'player_last':z['state']['combat']['player'],'enemy_start':enemy(a),'enemy_last':enemy(z),'enemy_next':enemy(following) if following and following['state'].get('combat') else None,'decisions':[{'line':d['_line'],'label':d['label'],'rationale':d.get('rationale'),'chosen':d.get('chosen'),'result':d.get('result')} for d in relevant]})
(p/'turn-audit.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2)+'\n')
print('result_sample',json.dumps(ds[1]['result'],ensure_ascii=False)); print('jev sample keys',ds[3]['result'].keys() if isinstance(ds[3].get('result'),dict) else None)
for c in rr['combats']:
 print('F',c['floor'],'seq',c['sequence'],'turns')
 for t in [x for x in turns if x['sequence']==c['sequence']]:
  def e(es): return [(v['enemy_id'],v['current_hp'],v['block'],[(x['power_id'],x['amount']) for x in v.get('powers',[])],v.get('intents')) for v in (es or [])]
  print(t['turn'],'s',t['start'],t['last'],t['next'],'HP',t['hp_start'],t['hp_end'],'lastblock',t['player_last']['block'],'enemy',e(t['enemy_start']),'last',e(t['enemy_last']),'next',e(t['enemy_next']))
print('resources')
for ch in rr['resource_changes']: print(ch)
print('SL')
for r in rows('sl-lines.jsonl'): print({k:r.get(k) for k in ['_line','attempt','turns','end_hp','end_block','incoming','judge','result','give_up_reason']})
