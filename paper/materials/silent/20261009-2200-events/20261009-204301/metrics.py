import json,pathlib,collections,datetime
p=pathlib.Path('learner/runs/20261009-204303-postmortem');r='54G5683J0E5S';ds=[json.loads(l) for l in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{r}-states.jsonl').open()];a=json.load((p/f'{r}-resources.json').open());idx={s['_line']:s for s in ss}
with (p/'combat-tables.md').open('w') as f:
 f.write('| 层 | 敌人（中文名 ID，含后续实见） | 进→离HP／上限；净变化 | 药栏进→离 | 结果／states证据／UTC时间 |\n|---|---|---|---|---|\n')
 for c in a['combats']:
  ent=c['entry'];ext=c['exit'];names={e['enemy_id']:e.get('name') for s in ss if ent['line']<=s['_line']<=ext['line'] for e in (s['state'].get('combat') or {}).get('enemies',[])}
  def pots(x):return '、'.join(f'槽{v[0]}={v[1]}' for v in x) or '空'
  f.write(f"| F{c['floor']}／1 | {'／'.join(n+' '+i for i,n in names.items())} | {ent['hp']}/{ent['max_hp']}→{ext['hp']}/{ext['max_hp']}；{ext['hp']-ent['hp']:+} | {pots(ent['potions'])}→{pots(ext['potions'])} | {'获胜（奖励帧）' if ext['screen']=='REWARD' else '阵亡（GAME_OVER）'}；s{ent['line']}→s{ext['line']}；{ent['ts']}→{ext['ts']} |\n")
 f.write('\n| 层 | 每轮首帧存活敌HP合计（当前需要伤害） | 每轮实见扣血下界 | 每轮玩家净HP变化 | 缺口 |\n|---|---|---|---|---|\n')
 for c in a['combats']:
  ts=c['enemy_hp_audit']['turns'];join=lambda key:'／'.join(str(t[key]) for t in ts)
  hps=[idx[t['end_line']]['state']['run']['current_hp']-idx[t['start_line']]['state']['run']['current_hp'] for t in ts]
  gaps=sorted({g for t in ts for g in t['gaps']})
  f.write(f"| F{c['floor']} | {join('live_enemy_hp_start')} | {join('visible_enemy_hp_loss_lower_bound')} | {'／'.join(str(x) for x in hps)} | {'、'.join(gaps) or '无HP帧缺口；内部来源未拆分'} |\n")
jev=[d for d in ds if d['decider']=='jev'];top=[d for d in ds if isinstance(d.get('rollout_best_chosen'),bool)];codes=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/')];code_turns=sorted({(d['floor'],d['turn']) for d in codes if d['label'] not in ['combat/plan-continue','combat/end_turn']});allturns={(s['state']['run']['floor'],s['state']['turn']) for s in ss if s['state'].get('in_combat') and s['state'].get('turn')}
print('metric',len(jev),'best',sum(d['rollout_best_chosen'] for d in top),len(top),'codecombatdecision',len(codes),'codeautoturns',len(code_turns),'allturns',len(allturns));print('code labels',collections.Counter(d['label'] for d in codes));print('code autonomy turns',code_turns)
for tag,rows in [('jev',jev),('brain',[d for d in ds if d.get('deepseek',{}).get('brain',{}).get('engine')=='codex'])]:print(tag,collections.Counter({k:sum(d.get('usage',{}).get(k,0) or 0 for d in rows) for k in ['input_tokens','output_tokens','cache_hit_tokens']}))
print('duration seconds',(datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['ts'])).total_seconds())
print('plans',[(x['floor'],x['plan']['archetype'],x['plan']['rest'],x['plan']['elites'],x['plan']['blockTarget']) for x in map(json.loads,(p/f'{r}-run-plans.jsonl').open())])
for d in ds:
 if 'route changed' in d.get('rationale','') or d['label']=='map/route-change':print('route',d['_line'],d['rationale'])
print('agent_view keys',[(s['state']['run']['floor'],s['state'].get('agent_view',{}).keys()) for s in ss if s['state'].get('agent_view')][:2])
