import json,collections
from pathlib import Path
p=Path(__file__).parent
for run in ['HXCY44VD9QWU','N8A2W8LH39N0']:
 rc=json.load((p/f'{run}-resources.json').open());ss=[json.loads(l) for l in (p/f'{run}-states.jsonl').open()];ds=[json.loads(l) for l in (p/f'{run}-decisions.jsonl').open()]
 names={e['enemy_id']:e['name'] for row in ss for e in (row['state'].get('combat') or {}).get('enemies',[])}
 state_by_ts={row['ts']:row for row in ss}; times=collections.Counter();lines=[]
 def pots(a):return '、'.join(f'槽{i}={v}' for i,v in a) or '空'
 lines.extend(['| 层／尝试 | 敌人（中文名 ID） | 进→离HP／上限；净变化 | 药栏进→离 | 结果／原始states行／UTC时间 |','|---|---|---|---|---|'])
 for w in rc['combats']:
  entry,last=w['entry'],w['last'];ex=w['exit'];times[w['floor']]+=1
  target=ex or last
  hp=f"{entry['hp']}/{entry['max_hp']}→{target['hp']}/{target['max_hp']}" if ex else f"{entry['hp']}/{entry['max_hp']}→未记录；末帧{last['hp']}/{last['max_hp']}"
  delta=f"{ex['hp']-entry['hp']:+d}" if ex else f"未记录；到末帧{last['hp']-entry['hp']:+d}"
  result=('获胜（奖励帧）' if ex['screen']=='REWARD' else '阵亡（GAME_OVER）') if ex else '判死读档；缺退出帧'
  lines.append(f"| F{w['floor']}／{times[w['floor']]} | {'／'.join(names.get(e,e)+' '+e for e in w['enemies'])} | {hp}；{delta} | {pots(entry['potions'])}→{pots(target['potions'])} | {result}；s{entry['line']}→s{target['line']}；{entry['ts']}→{target['ts']} |")
 lines+=['','逐轮核对：每个列表从T1顺序对应；“需要伤害”是该轮首帧存活敌人HP合计，不含未记录的后续格挡、过量伤害或未知新实体。“实见扣血”是逐帧已证HP下降的下界，含实际毒结算；缺敌归零帧的末击不能补齐。末轮“HP变化”只到该段末帧或退出，不把SL恢复混入。','', '| 层／尝试 | 每轮需要伤害 | 每轮实见扣血下界 | 每轮玩家净HP变化 | 缺口／证据 |','|---|---|---|---|---|']
 times=collections.Counter()
 for w in rc['combats']:
  times[w['floor']]+=1; turns=w['enemy_hp_audit']['turns'];obs=w['enemy_hp_audit']['observations']; hpchanges=[]
  for t in turns:
   before=next(o for o in obs if o['line']==t['start_line']);after=next(o for o in obs if o['line']==t['end_line'])
   a=state_by_ts[before['ts']]['state']['run']['current_hp'];b=state_by_ts[after['ts']]['state']['run']['current_hp'];hpchanges.append(str(b-a))
  gap='末击敌归零帧缺失' if any(t['gaps'] for t in turns) else '无HP帧缺口；伤害来源分解未记录'
  if not w['exit']:gap+='；最后一轮截断未结算'
  lines.append(f"| F{w['floor']}／{times[w['floor']]} | {'／'.join(str(t['live_enemy_hp_start']) for t in turns)} | {'／'.join(str(t['visible_enemy_hp_loss_lower_bound']) for t in turns)} | {'／'.join(hpchanges)} | {gap}；s{w['entry']['line']}—s{(w['exit'] or w['last'])['line']} |")
 (p/f'{run}-tables.md').write_text('\n'.join(lines)+'\n')
 print(run,'表格生成')
