import json,collections
from pathlib import Path
p=Path(__file__).parent
D=json.loads((p/'decisions.jsonl').read_text());S=json.loads((p/'states.jsonl').read_text());R=json.loads((p/'LYBHQ1X230ZB-resources.json').read_text());dm={d['ts']:d for d in D}
report=[]
for c in R['combats']:
 if c['floor'] not in [8,12,17,22,23,29,30]:continue
 lo=c['entry']['line'];hi=(c.get('exit') or c['last'])['line'];frames=[s for s in S if lo<=s['_line']<=hi]
 groups=collections.defaultdict(list)
 for s in frames:
  if (s['state'].get('combat') or {}).get('enemies'):groups[s['state']['turn']].append(s)
 turns=[];ts=list(groups)
 for j,t in enumerate(ts):
  ss=groups[t];start=next((x for x in ss if x['ts'] in dm and dm[x['ts']]['label'].startswith('combat/')),ss[0]);end=next((x for x in frames if x['state'].get('turn')==ts[j+1]),ss[-1]) if j+1<len(ts) else frames[-1]
  st=start['state'];et=end['state'];en=(st.get('combat') or {}).get('enemies',[]);ee=(et.get('combat') or {}).get('enemies',[])
  need=sum(a['current_hp'] for a in en if a.get('is_alive'));left=sum(a['current_hp'] for a in ee if a.get('is_alive'))
  turns.append({'回合':t,'开始行':start['_line'],'结束行':end['_line'],'需血':need,'敌活体血减少':need-left,'玩家净损':st['run']['current_hp']-et['run']['current_hp'],'敌入':[(a['enemy_id'],a['current_hp']) for a in en if a.get('is_alive')],'敌出':[(a['enemy_id'],a['current_hp']) for a in ee if a.get('is_alive')],'缺退出':c.get('exit') is None and j==len(ts)-1})
 report.append({'层':c['floor'],'尝试序':c['sequence'],'turns':turns})
(p/'turn-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
for a in report:
 if a['尝试序'] in [15,16]:continue
 print('F',a['层'],'seq',a['尝试序'],'需',[t['需血'] for t in a['turns']],'净活体减少',[t['敌活体血减少'] for t in a['turns']],'损',[t['玩家净损'] for t in a['turns']])
