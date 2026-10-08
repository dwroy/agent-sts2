import json,collections,datetime
from pathlib import Path
p=Path(__file__).parent
D=json.loads((p/'decisions.jsonl').read_text());S=json.loads((p/'states.jsonl').read_text());R=json.loads((p/'LYBHQ1X230ZB-resources.json').read_text());P=json.loads((p/'plans.jsonl').read_text());L=json.loads((p/'sl.jsonl').read_text())
def say(x):print(json.dumps(x,ensure_ascii=False))
for c in R['combats']:
 say({'战场':c['sequence'],'层':c['floor'],'入':c['entry'],'末':c['last'],'出':c.get('exit'),'结束':c['end'],'净损':c['observed_net_hp_loss'],'敌':c['enemies']})
print('资源变动')
for c in R['resource_changes']:
 if c['from']['potions']!=c['to']['potions'] or c['from']['floor']!=c['to']['floor'] and c['from']['hp']!=c['to']['hp']:say(c)
print('战略')
for d in D:
 if d['decider']=='codex':say({k:d.get(k) for k in ['_line','ts','floor','label','chosen','rationale','boss_sim','usage']})
print('计划')
for x in P:say({k:x.get(k) for k in ['_line','floor','trigger','plan']})
print('SL')
for x in L:say({k:x.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','end_hp','end_block','incoming','judge','reload','explore','summary']})
print('药水动作')
for d in D:
 if any('potion' in str(d.get(k)) for k in ['chosen','label']):say({k:d.get(k) for k in ['_line','floor','turn','chosen','rationale','journal','result']})
print('末战决策')
for d in D:
 if d['floor']>=29 and d['label'].startswith('combat/'):
  say({k:d.get(k) for k in ['_line','ts','floor','turn','label','decider','chosen','expect','rationale','confidence','journal']})
print('统计')
say(collections.Counter((d['decider']+':'+d['label']) for d in D));say({'耗时秒':(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds(),'usage':{k:sum((d.get('usage') or {}).get(k,0) or 0 for d in D) for k in ['input_tokens','output_tokens','cache_read_input_tokens']}})
for d in D:
 if d['decider']=='jev' and (d.get('confidence') or 0)<.35:say({k:d.get(k) for k in ['_line','floor','turn','label','confidence','rationale']})
