import json,pathlib
P=pathlib.Path('learner/runs/20261008-231302-postmortem')
for run in ['M0GY0A4M2F7H','Z91JN3S3PQX2']:
 d=json.loads((P/(run+'-subset.json')).read_text());f=json.loads((P/(run+'-facts.json')).read_text());names={p['potion_id']:p['name'] for x in d['states'] for p in x['state']['run'].get('potions',[]) if p.get('occupied')}
 def belt(b):return '空' if not b else '；'.join(f'槽{i} {names.get(q,q)} {q}' for i,q in b)
 out=['  全战斗实盘资源（HP／最大HP；时间均为日志UTC，s为states.jsonl行号；净变化不是敌人总伤害）：','', '  | 层／尝试 | 敌人 | 进场 → 离场或截断末态 | 带槽药水：进 → 出 | 净HP变化／结局 | 证据行／时间 |','  |---|---|---|---|---|---|']
 for w in f['combats']:
  a=w['entry'];b=w['exit'] or w['last'];attempt=w['sequence']-8 if run.startswith('M') and w['floor']==17 else 1
  end='判死截断、退出帧未记录' if not w['exit'] else '实死' if b['hp']==0 else '胜（战后奖励已核）'
  net=b['hp']-a['hp'];out.append(f"  | F{w['floor']}／{attempt} | {'／'.join(n+' '+i for i,n in w['names'])} | {a['hp']}/{a['max_hp']} → {b['hp']}/{b['max_hp']} | {belt(a['potions'])} → {belt(b['potions'])} | {net:+d}{'（仅至截断帧）' if not w['exit'] else ''}；{end} | s{a['line']}→s{b['line']}；{a['ts'][11:]}→{b['ts'][11:]} |")
 out += ['','  各场首帧均为T1；首次首帧能量可能尚在过场，不据其0能量推定已出牌。前五次墨影退出缺失时，表内末态只到读档前，未执行的最少损失方案和未结算毒不补算。' if run.startswith('M') else '  各场首帧均为T1，资源退出帧均存在；工具的胜负需另核奖励／SL，本表已核。战后天选芝士 CHOSEN_CHEESE 的HP与最大HP增长包含在净变化中，不将胜战净损当敌人总伤害。']
 (P/(run+'-resource-table.md')).write_text('\n'.join(out)+'\n')
 out=['  药水逐步链（新增取得、实饮和SL恢复分列，s行／UTC时间，d为decisions.jsonl行号）：','', '  | 变化 | 槽位／药水 | 证据 |','  |---|---|---|']
 for e in f['potions']:
  a,b=e['from'],e['to'];actions=e['actions'];drink=[x for x in actions if x['chosen']['action']=='use_potion'];disc=[x for x in actions if x['chosen']['action']=='discard_potion']
  label='SL恢复' if e['restart'] else '实饮' if drink else '丢弃' if disc else '取得／补充'
  vals=e['removed'] if drink or disc else e['added'];evid='；'.join('d'+str(x['line']) for x in actions if x['chosen']['action'] in ['use_potion','discard_potion','claim_reward','buy_potion'])
  out.append(f"  | {label} F{b['floor']}{'T'+str(a['turn']) if drink or disc else ''} | {belt(vals)} | s{a['line']}→s{b['line']}；{b['ts'][11:]}{('；'+evid) if evid else ''} |")
 (P/(run+'-potion-table.md')).write_text('\n'.join(out)+'\n')
 out=['  关键战斗逐轮实况：数组按T1起排列，“净清进度”是可见存活敌血的前后变化，含已结算毒、增益与死亡退场；不是攻击毛伤，独立死亡帧／过量伤缺失不补算。','']
 for w in f['combats']:
  if w['floor'] not in ([11,13,14,17] if run.startswith('M') else [21,28,33]):continue
  ts=w['turns'];vals=[t['net_progress'] for t in ts];hp=[t['hp_net'] for t in ts];last=w['exit'] or w['last'];attempt=w['sequence']-8 if run.startswith('M') and w['floor']==17 else 1
  if w['exit'] is None:
   vals[-1]=str(vals[-1])+'（仅已执行行动，结束未结算）' if ts[-1]['start_line']!=ts[-1]['after_line'] else '未执行／未结算'
   hp[-1]='结束未结算'
  out.append(f"  F{w['floor']}第{attempt}次：净清进度{json.dumps(vals,ensure_ascii=False,separators=(',',':'))}；HP净变化{json.dumps(hp,ensure_ascii=False,separators=(',',':'))}；最后可见存活敌血{ts[-1]['enemy_after']}。逐轮s起→结算后行{[(t['start_line'],t['after_line']) for t in ts]}。\n")
 (P/(run+'-turn-table.md')).write_text('\n'.join(out)+'\n')
