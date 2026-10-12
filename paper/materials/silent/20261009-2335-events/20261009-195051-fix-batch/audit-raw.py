import sys,json,hashlib,pathlib,collections
root=pathlib.Path.cwd();p=root/'learner/runs/20261009-195053-boss-sim-batch';sys.path.insert(0,str(root/'agent/tools/logdb'));import query,sync
fs=[json.loads(l) for l in (p/'dataset/fights.jsonl').read_text().splitlines()];sources=[json.loads(l) for l in (p/'dataset/sources.jsonl').read_text().splitlines()];e=json.loads((p/'dispatch-evidence.json').read_text());tune=set(e['split']['tune']);q=[r for r in fs if 'QUEEN' in r['encounter']]
assert set(e['logged_keys'])=={r['key'] for r in q}
assert all(r['character']=='silent' for r in sources if r.get('character'))
with sync.read_lock('/home/dw/Projects/agent-sts2/data/logdb',shared=True):
 c=query.connect('/home/dw/Projects/agent-sts2/data/logdb',threads=1)
 offsets=c.execute('SELECT off,len,run_id,floor,turn,observed FROM frames WHERE run_id IN (SELECT unnest(?::VARCHAR[])) ORDER BY off',[list({r['run_id'] for r in q})]).fetchall()
by=collections.defaultdict(list)
for off,n,r,f,t,o in offsets: by[(r,f)].append((off,n,t,o))
records=[];opening=[]
with open('/home/dw/Projects/agent-sts2/logs/states.jsonl','rb') as h:
 for r in q:
  h.seek(r['source']['t1_off']);raw=h.read(r['source']['t1_len']);assert hashlib.sha256(raw).hexdigest()==r['source']['t1_sha256'];assert json.loads(raw)['state']==r['t1']['state'];opening.append({'key':r['key'],'off':r['source']['t1_off'],'len':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
  for off,n,t,o in by[(r['run_id'],r['floor'])]:
   if not r['source']['first_off']<=off<=r['source']['last_off']:continue
   h.seek(off);raw=h.read(n);s=json.loads(raw)['state'];assert s['run']['character_id']=='SILENT'
   combat=s.get('combat') or {};en=[]
   for v in combat.get('enemies') or []:
    en.append({k:v.get(k) for k in ['enemy_id','current_hp','block','move_id','intents','powers','is_alive']})
   records.append({'key':r['key'],'split':'tune' if r['key'] in tune else 'val','off':off,'len':n,'sha256':hashlib.sha256(raw).hexdigest(),'turn':t,'observed':o,'player':s.get('player'),'enemies':en})
(p/'queen-raw-frames.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in records));(p/'opening-verification.json').write_text(json.dumps(opening,indent=1)+'\n')
# Diagnostics selected only from frozen tuning fights.
out=[]
for r in q:
 if r['key'] not in tune: continue
 print(r['key'],r['outcome'])
 own=[v for v in records if v['key']==r['key']];first={}
 for v in own:
  if v['turn'] and not v['observed']:first.setdefault(v['turn'],v)
 for t,v in first.items():
  short=[(x['enemy_id'],x['current_hp'],x['move_id'],[(a.get('damage'),a.get('hits')) for a in x['intents'] or []],[(a.get('power_id'),a.get('amount')) for a in x['powers'] or []]) for x in v['enemies']]
  print(t,short)
counts=collections.Counter(r.get('excluded') or r.get('outcome') for r in sources if 'QUEEN' in r.get('encounter',''))
print('Queen source outcomes/exclusions',dict(counts))
(p/'queen-source-counts.json').write_text(json.dumps(dict(counts),ensure_ascii=False,indent=1)+'\n')
