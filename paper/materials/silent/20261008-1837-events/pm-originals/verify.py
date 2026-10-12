import json,pathlib,re,collections,datetime
P=pathlib.Path(__file__).parent
R=json.load((P/'4XLZURXMD872-resources.json').open())
def rows(k):
 with (P/(k+'-lines.jsonl')).open() as h:
  for l in h:
   n,v=l.split(':',1);r=json.loads(v);r['_line']=int(n);yield r
D=list(rows('decisions'));S=list(rows('states'));B=list(rows('brain'));I={r['_line']:r for r in S}
with (P/'resource-audit.md').open('w') as h:
 h.write('每场实盘资源；药栏为槽位:ID，HP变化是净值，所有时间为UTC。胜负经奖励／GAME_OVER／SL逐项核对。\n\n|序／层|敌人ID|进场HP/max、药栏；状态行／时间|离场HP/max、药栏；状态行／时间|净变化；结局|\n|---|---|---|---|---|\n')
 for c in R['combats']:
  def fmt(s):return '未记录' if s is None else str(s['hp'])+'/'+str(s['max_hp'])+' '+str(s['potions'])+'；s'+str(s['line'])+'／'+s['ts']
  if c['exit']:out='阵亡' if I[c['exit']['line']]['state']['screen']=='GAME_OVER' else '获胜'
  else:out='判死读档，退出帧未记录；末可见 '+fmt(c['last'])
  loss=c['observed_net_hp_loss'];h.write('|'+str(c['sequence'])+'／F'+str(c['floor'])+'|'+','.join(c['enemies'])+'|'+fmt(c['entry'])+'|'+fmt(c['exit'])+'|'+('未记录' if loss is None else str(-loss))+'；'+out+'|\n')
 h.write('\nSL恢复独立列在资源JSON的restart_boundary中；未加入回血。F29新出现／孵化的同ID卵／幼虫没有持久实例身份，不能从总存活HP差推总伤。\n')
J=[r for r in D if r['decider']=='jev'];Q=[r for r in J if r['label'].startswith('combat/plan-choice')];best=avail=0;ranks=[]
for r in Q:
 keys=[]
 for k,v in (r.get('questions') or {}).get('plan',{}).get('criteria',{}).items():
  try:a=json.loads(v)
  except:continue
  if a.get('rollout_best'):keys.append(k)
 m=re.search(r'chose plan (\d+)/',r['rationale'])
 if keys:
  avail+=1;best+=bool(m and 'plan'+m.group(1) in keys)
 m=re.search(r'code rank (\d+|-)',r['rationale'])
 if m:ranks.append(m.group(1))
T=collections.defaultdict(set)
for r in D:
 if r['label'].startswith('combat/'):
  T[(r['floor'],r.get('sl_attempt') or 1,r['turn'])].add('jev-plan' if 'continuing the Jev-chosen plan:' in r['rationale'] else r['decider'])
metrics={'决策':len(D),'状态帧':len(S),'脑请求':len(B),'脑引擎':dict(collections.Counter(r['engine'] for r in B)),'Jev调用':len(J),'低信心全部':sum(r['confidence']<.35 for r in J),'低信心战斗':sum(r['confidence']<.35 and r['label'].startswith('combat/') for r in J),'低信心F33':sum(r['confidence']<.35 and r['floor']==33 for r in J),'选线题':len(Q),'代码rank':dict(collections.Counter(ranks)),'rollout_best选择':[best,avail],'SL改写所有':sum('SL explore' in r['rationale'] for r in D),'SL改写选线':sum('SL explore' in r['rationale'] for r in Q),'有代码自主的战斗轮':sum('code' in s for s in T.values()),'纯代码战斗轮':sum(s=={'code'} for s in T.values()),'所有战斗轮':len(T),'脑用量':{k:sum(r.get('usage',{}).get(k,0) for r in B) for k in ['input_tokens','output_tokens','cache_hit_tokens']},'Jev用量':{k:sum(r.get('usage',{}).get(k,0) for r in J) for k in ['input_tokens','output_tokens']},'HP护栏替换':sum('HP guard' in r['rationale'] for r in D),'饮药动作':sum(r.get('chosen',{}).get('action')=='use_potion' for r in D),'弃药动作':sum(r.get('chosen',{}).get('action')=='discard_potion' for r in D)}
(P/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n');print(json.dumps(metrics,ensure_ascii=False))
f=pathlib.Path('logs/deepseek-reasoning.jsonl');cut=f.stat().st_size;offset=0;count=total=0;minimum=maximum=None;decreases=0;last=None
with f.open('rb') as h,(P/'reasoning-window-full.jsonl').open('w') as out:
 h.seek(offset)
 while h.tell()<cut:
  line=h.readline();total+=1
  m=re.search(rb'"ts"\s*:\s*"([^"]+)"',line)
  if not m:continue
  ts=m.group(1).decode();minimum=min(minimum,ts) if minimum else ts;maximum=max(maximum,ts) if maximum else ts
  if last and ts<last:decreases+=1
  last=ts
  if D[0]['ts']<=ts<=D[-1]['ts']:out.write(line.decode());count+=1
summary={'offset':offset,'cutoff':cut,'lines':total,'min_ts':minimum,'max_ts':maximum,'decreases':decreases,'in_window':count}
(P/'reasoning-audit.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print('按偏移流式核查',summary)
assert len(D)==591 and len(S)==610 and len(B)==33
assert metrics['饮药动作']==15 and metrics['弃药动作']==0
assert R['combats'][-1]['entry']['hp']==23 and R['combats'][-1]['exit']['hp']==0
print('固定数字断言通过')
