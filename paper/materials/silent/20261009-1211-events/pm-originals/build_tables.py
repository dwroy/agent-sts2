from analyze import *
import datetime,re,hashlib
# 所有大日志均已按局号抽取；本脚本只处理该局的中间文件。
names={e['enemy_id']:e['name'] for s in S for e in (s['state'].get('combat') or {}).get('enemies',[])}
pnames={p['potion_id']:p['name'] for s in S for p in s['state']['run'].get('potions',[]) if p.get('occupied')}
def belt(ps):return '空' if not ps else '、'.join(f"槽{i}{pnames.get(p,p)} {p}" for i,p in ps)
def resc(x):return f"{x['hp']}/{x['max_hp']}；{belt(x['potions'])}"
with (P/'resource-table.md').open('w') as f:
 f.write('| 层／尝试／敌人 | 进场→离场或最后帧资源 | 净HP变化／结局 | 原始状态行、UTC时间 |\n|---|---|---|---|\n')
 for c in R['combats']:
  en='／'.join(f"{names.get(e,e)} {e}" for e in c['enemies']);e,l,x=c['entry'],c['last'],c['exit'];a=next((a['attempt'] for a in A if a['floor']==c['floor'] and a['started_at']<=e['ts']<=a['ended_at']),1)
  end=x or l;net=end['hp']-e['hp'];status='获胜（奖励帧）' if x and x['screen']=='REWARD' else '阵亡（GAME_OVER）' if x else '判死／SL前最后帧，退出未记录'
  f.write(f"| F{c['floor']}／{a}／{en} | {resc(e)} → {resc(end)} | {net:+d}；{status} | s{e['line']}→s{end['line']}，{e['ts']}→{end['ts']} |\n")
with (P/'potion-table.md').open('w') as f:
 f.write('| 槽位／实际获得来源 | 实際饮用、重载或留存 | 状态证据／UTC时间 |\n|---|---|---|\n')
 gains=[]
 for ch in R['resource_changes']:
  a,b=ch['from'],ch['to'];old,new=dict(a['potions']),dict(b['potions'])
  if ch['restart_boundary']:continue
  for slot,ident in new.items():
   if old.get(slot)==ident:continue
   nextloss=None
   for later in R['resource_changes']:
    if later['from']['line']<b['line']:continue
    la,lb=dict(later['from']['potions']),dict(later['to']['potions'])
    if la.get(slot)==ident and lb.get(slot)!=ident:
     nextloss=later;break
   origin=f"F{b['floor']}T{b['turn']}补充" if ch['combat_sequence'] else f"F{b['floor']}{b['screen']}取得"
   outcome='终局留存／去向未记录'
   evidence=f"s{a['line']}→{b['line']}，{b['ts']}"
   if nextloss:
    at=nextloss['to'];prev=nextloss['from'];ds=[d for d in D if prev['ts']<=d['ts']<=at['ts'] and (d.get('chosen') or {}).get('action') in ('use_potion','discard_potion')]
    if nextloss['restart_boundary']:outcome=f"F{prev['floor']}T{prev['turn']}后SL重载移除，未饮用／未丢弃"
    elif ds:outcome=f"F{ds[0]['floor']}T{ds[0]['turn']}饮用（d{ds[0]['_line']}）"
    else:outcome=f"F{at['floor']}T{at['turn']}槽位消失，动作尚需核对"
    evidence+=f"；s{prev['line']}→{at['line']}，{at['ts']}"
   f.write(f"| 槽{slot}{pnames.get(ident,ident)} {ident}；{origin} | {outcome} | {evidence} |\n")
# 回合净血池减少只在该局同一战斗窗口内比较；末击移除不能当毛伤。
with (P/'turn-table.md').open('w') as f:
 f.write('| 关键战／尝试 | T1起每轮玩家净HP损失 | T1起每轮可见敌血池净减少 | 证据 |\n|---|---|---|---|\n')
 for c in R['combats']:
  if c['floor'] not in (17,33,45,48,49):continue
  e,l,x=c['entry'],c['last'],c['exit'];ss=[s for s in S if e['line']<=s['_line']<=(x or l)['line']];tt=collections.defaultdict(list)
  for s in ss:tt[s['state']['turn']].append(s)
  ts=sorted(t for t in tt if isinstance(t,int));losses=[];deltas=[]
  for i,t in enumerate(ts):
   before=tt[t][0];after=tt[ts[i+1]][0] if i+1<len(ts) else tt[t][-1];st,st2=before['state'],after['state'];loss=st['run']['current_hp']-st2['run']['current_hp'];losses.append(str(loss) if i+1<len(ts) or x else '未结算')
   es=(st.get('combat') or {}).get('enemies',[]);es2=(st2.get('combat') or {}).get('enemies',[]);hp=lambda es:sum(z['current_hp'] for z in es if z['is_alive']);delta=hp(es)-hp(es2)
   if not es2:deltas.append(f"退场前剩{hp(es)}（末击未记录）")
   elif delta<0:deltas.append(f"增血{-delta}（复活跨帧，实伤须另核）")
   else:deltas.append(str(delta))
  a=next((a['attempt'] for a in A if a['floor']==c['floor'] and a['started_at']<=e['ts']<=a['ended_at']),1)
  f.write(f"| F{c['floor']}／{a} | {'／'.join(losses)} | {'／'.join(deltas)} | s{e['line']}—s{(x or l)['line']} |\n")
# 旧DeepSeek推理日志末尾在本局窗口之前；按字节seek流式检查末尾。
path=pathlib.Path('logs/deepseek-reasoning.jsonl');size=path.stat().st_size;selected=[];last=None
with path.open('rb') as h:
 h.seek(max(0,size-1024*1024));h.readline()
 for raw in h:
  try:d=json.loads(raw)
  except ValueError:continue
  last=d['ts']
  if D[0]['ts']<=d['ts']<=D[-1]['ts']:selected.append(d)
(P/'deepseek-window.jsonl').write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in selected))
(P/'deepseek-window-audit.json').write_text(json.dumps({'offset':max(0,size-1024*1024),'last_ts':last,'decision_start':D[0]['ts'],'decision_end':D[-1]['ts'],'selected':len(selected),'limitation':'仅流式检查旧日志尾部；本局实际大脑为Codex，原话引用decisions/run-plans'},ensure_ascii=False,indent=2)+'\n')
print('药水表条数',len(gains),'已生成资源、药水与逐轮核验表；推理窗口',len(selected),last)
