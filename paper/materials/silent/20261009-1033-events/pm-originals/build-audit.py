import json,hashlib
from pathlib import Path
p=Path(__file__).parent
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];R=json.load((p/'E6DYYXRX7GVE-resources.json').open());byline={x['_source']['line']:x for x in S}
turns=[]
for c in R['combats']:
 rows=[x for x in S if c['entry']['line']<=x['_source']['line']<=c['last']['line']];first={}
 for x in rows:
  a=x['state'];co=a.get('combat') or {}
  if co.get('hand') and a['turn'] not in first:first[a['turn']]=x
 vals=[]
 for i,(t,x) in enumerate(first.items()):
  nextx=list(first.values())[i+1] if i+1<len(first) else byline[c['exit']['line']] if c['exit'] else rows[-1]
  a=x['state'];b=nextx['state']; hp=lambda s:sum(z['current_hp'] for z in (s.get('combat') or {}).get('enemies',[]) if z['is_alive'])
  vals.append({'turn':t,'line':x['_source']['line'],'to_line':nextx['_source']['line'],'need':hp(a),'enemy_hp_net_reduction':hp(a)-hp(b),'player_hp_net_loss':a['run']['current_hp']-b['run']['current_hp']})
 turns.append({'sequence':c['sequence'],'floor':c['floor'],'turns':vals})
(p/'turn-audit.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2)+'\n')
with (p/'tables.md').open('w') as f:
 f.write('  全战实盘资源链（s＝states.jsonl行号；时间均为2026-10-09 UTC，药水数字为槽位；净HP变化不是敌人毛伤；只有F33首试退出帧缺失）：\n\n  | 层／尝试；敌人中文名与ID | HP进→出；最大HP进→出；净变化 | 药栏进→出 | 证据行；进→出时间 |\n  | --- | --- | --- | --- |\n')
 for c in R['combats']:
  a=c['entry'];b=c.get('exit') or c['last'];end=c['exit'] is not None
  names={z['enemy_id']:z['name'] for x in S if a['line']<=x['_source']['line']<=b['line'] for z in (x['state'].get('combat') or {}).get('enemies',[])}
  pots=lambda a:'、'.join(str(n)+':'+v for n,v in a['potions']) or '空'
  attempt=2 if c['sequence']==16 else 1
  delta=b['hp']-a['hp']
  f.write(f"  | F{c['floor']}／{attempt}；"+'／'.join(n+' '+id for id,n in names.items())+f" | {a['hp']}→{b['hp']}；{a['max_hp']}→{b['max_hp']}；{delta:+}"+('（末观察，非退出）' if not end else '')+f" | {pots(a)}→{pots(b)} | s{a['line']}→{b['line']}；{a['ts'][11:]}→{b['ts'][11:]} |\n")
 f.write('\n  每回合核对（数组由T1起，需＝可行动首帧活敌HP总量；净扣＝到下一轮首个可行动帧／退出帧的敌血池净减少，含已结算毒、敌回血与新增身体，末击按剩血截断，不是攻击牌毛伤；损＝玩家HP净减少，负值为净恢复。F33首试T11只到判死前末帧，未实际结算。具体逐轮证据行保存本任务turn-audit.json）：\n\n  | 层／尝试 | 需 | 敌血池净扣 | 玩家HP净损 |\n  | --- | --- | --- | --- |\n')
 for c in turns:
  compact=lambda k:json.dumps([x[k] for x in c['turns']],separators=(',',':'))
  f.write(f"  | F{c['floor']}／{2 if c['sequence']==16 else 1} | {compact('need')} | {compact('enemy_hp_net_reduction')} | {compact('player_hp_net_loss')} |\n")
print('资源表20行、逐轮',sum(len(x['turns']) for x in turns))
