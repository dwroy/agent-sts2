import json,re,collections,datetime
from pathlib import Path
O=Path('learner/runs/20261009-161301-postmortem')
D=[]
for l in (O/'decisions.numbered.jsonl').open():
 n,t=l.split(':',1);x=json.loads(t);x['_line']=int(n);D.append(x)
S=[json.loads(l) for l in (O/'states.selected.jsonl').open()]
R=json.loads((O/'C6Z8ATNBNHZ7-resources.json').read_text()); rounds=json.loads((O/'rounds.json').read_text())
for l in (O/'brain.selected.jsonl').open():
 x=json.loads(l);b=x['data'];p=b.get('payload') or {};f=p.get('facts') or {}
 if 'act_boss_clock' in f:print('clock',x['line'],f['act_boss_clock'])
 route=p.get('route_review') or p.get('act_route')
 if isinstance(route,dict):
  print('route',x['line'],route.get('plan_facts',{}).get('arrival'),route.get('vs_plan'))
for d in D:
 if d['floor']==16 and d.get('boss_sim'):print('F16sim',d['boss_sim']['samples'],d['boss_sim']['entry_hp'],d['boss_sim']['options']['o0'])
 printline=d['label']=='combat/least-loss' or re.search('hp.guard|HP guard|guard override|loss guard',d['rationale'])
 if printline:print('code/control',d['_line'],d['floor'],d['turn'],d['rationale'])
print('战斗总回合',sum(len(r['rounds']) for r in rounds))
counts=collections.Counter()
for c in R['combats']:
 dd=[d for d in D if c['entry']['ts']<=d['ts']<=(c['exit'] or c['last'])['ts']]
 # end-turn completion can be later than last combat state on reload; include until next restart
 end=R['combats'][c['sequence']]['entry']['ts'] if c['sequence']<len(R['combats']) else '9999'
 dd=[d for d in D if c['entry']['ts']<=d['ts']<end and d['floor']==c['floor']]
 for rr in next(r for r in rounds if r['seq']==c['sequence'])['rounds']:
  ds=[d for d in dd if d['turn']==rr['turn']]
  if not any(d['decider']=='jev' for d in ds):counts['无Jev回合']+=1
print(counts)
print('OLDLESSON HEADERS')
# Stream lessons only retain matching character sections with chosen claims.
current=None; buf=[]; found=[]
for line in Path('notes/lessons.md').open():
 if line.startswith('## '):
  if current and '静默猎手' in current and any('啃咬机' in q or '人工制品' in q or '狡诈药水' in q for q in buf[:4]):
   found.append((current.strip(),[q.strip() for q in buf[:4] if any(k in q for k in ['啃咬机','人工制品','狡诈药水'])]))
  current=line;buf=[]
 elif len(buf)<4:buf.append(line)
print('匹配标题数',len(found))
for h,ls in found:
 for l in ls:
  if '啃咬机' in l:print(h,l[:250])
(O/'earlier-lessons-matches.json').write_text(json.dumps(found,ensure_ascii=False,indent=2))
for x in S:
 if x['line'] in [325193,325194,325195,325196,325197,325198,325199,325200,325201,325202,325203,325204,325205,325206,325207,324952,324953,324954,324955,324956]:
  c=x['data']['state']['combat'];print('状态',x['line'],'hp',x['data']['state']['run']['current_hp'],'挡',c['player']['block'],'powers',[(p['power_id'],p['amount']) for p in c['player']['powers']],'ene',[(e['current_hp'],[(p['power_id'],p['amount']) for p in e['powers']]) for e in c['enemies']])
print('time', (datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds())
