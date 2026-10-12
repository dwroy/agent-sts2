import json,sys
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-151301-postmortem')
keys={299391,299392,299440,299447,299449,299450,299493,299495,299496,299507,299512,299517,299519,299530,299541,299552,299558,299559,299560,299561,299562,299563,299564,299565}
rows=[]
for raw in sys.stdin:
 line,payload=raw.split(':',1);line=int(line)
 if line not in keys:continue
 data=json.loads(payload);s=data['state']
 if s.get('run_id')!='AD3QSC3P41JU':continue
 c=s.get('combat') or {};pl=c.get('player') or {}
 rows.append({'行':line,'时间':data['ts'],'层':s['run']['floor'],'回合':s['turn'],'血':s['run']['current_hp'],'挡':pl.get('block'),'敌':[(e['enemy_id'],e['current_hp'],e['max_hp'],[(a['power_id'],a['amount']) for a in e['powers']],e.get('intents')) for e in c.get('enemies',[])],'屏幕':s['screen']})
assert {r['行'] for r in rows}==keys
(p/'after-append-source-check.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for r in rows:print(r['行'],r['层'],r['回合'],r['血'],r['挡'],[(e[0],e[1]) for e in r['敌']],r['屏幕'])
print('追加后原日志grep复核',len(rows),'个关键帧齐全')
