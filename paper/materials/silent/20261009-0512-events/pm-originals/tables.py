import json
from pathlib import Path
p=Path(__file__).parent;S=[json.loads(l) for l in (p/'states.jsonl').open()];D=[json.loads(l) for l in (p/'decisions.jsonl').open()];R=json.loads((p/'J8PHG72DGD90-resources.json').read_text())
short={'FIRE_POTION':'火','POWDERED_DEMISE':'粉','REGEN_POTION':'再','POISON_POTION':'毒','BOTTLED_POTENTIAL':'潜','WEAK_POTION':'弱','SWIFT_POTION':'迅'}
def belt(a):return '空' if not a else '、'.join(str(i)+short[j] for i,j in a)
def live(s):return sum(e['current_hp'] for e in (s.get('combat') or {}).get('enemies',[]) if e['is_alive'])
with (p/'tables.md').open('w') as f:
 f.write('\n  | 层／尝试；敌人中文名＋ID | 进→离／末HP；最大HP；净损 | 进→离／末药槽 | s进／离末行；UTC时间 |\n  | --- | --- | --- | --- |\n')
 for c in R['combats']:
  rows=[x for x in S if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']];names={e['enemy_id']:e['name'] for x in rows for e in (x['state'].get('combat') or {}).get('enemies',[])}
  label='／'.join(n+' '+i for i,n in names.items());e=c['entry'];z=c['exit'] or c['last'];attempt=1 if c['floor'] not in [31,33] else (c['sequence']-12 if c['floor']==31 else c['sequence']-14)
  tag='；截' if c['exit'] is None else ''
  f.write(f"  | F{c['floor']}／第{attempt}试；{label} | {e['hp']}→{z['hp']}；{e['max_hp']}；{e['hp']-z['hp']}{tag} | {belt(e['potions'])}→{belt(z['potions'])} | {e['line']}／{z['line']}；{e['ts'][11:23]}→{z['ts'][11:23]} |\n")
 f.write('\n  逐回合表按T1开始：需＝该轮首帧存活敌人本体HP合计；净进度＝到下一轮／退出／截断末帧该合计的下降，包含毒、回血、召唤、退场及复活，按剩血截断，不等完整逐击毛伤。负数为本体存量净增长；截断末项只计已发生动作，没有执行的敌方回合不填为零伤。F30 T2新出现21血寄生惧魔、后段再次出现，故尤其不能把存量变化当全部伤害。完整逐击伤害与过量伤害未记录。\n\n  | 层／尝试 | 每轮需 | 每轮净进度 | 每轮净HP损 |\n  | --- | --- | --- | --- |\n')
 metrics=[]
 for c in R['combats']:
  rows=[x for x in S if c['entry']['line']<=x['_line']<=(c['exit'] or c['last'])['line']];first={}
  for x in rows:
   if x['state'].get('in_combat'):first.setdefault(x['state']['turn'],x)
  fs=list(first.values());end=rows[-1];need=[live(x['state']) for x in fs];progress=[];loss=[]
  for a,b in zip(fs,fs[1:]+[end]):progress.append(live(a['state'])-live(b['state']));loss.append(a['state']['run']['current_hp']-b['state']['run']['current_hp'])
  att=(c['sequence']-12 if c['floor']==31 else c['sequence']-14 if c['floor']==33 else 1)
  f.write(f"  | F{c['floor']}／{att} | {need} | {progress} | {loss} |\n")
  metrics.append({'sequence':c['sequence'],'floor':c['floor'],'attempt':att,'need':need,'progress':progress,'loss':loss,'first_lines':[x['_line'] for x in fs]})
 f.write('\n  | 实际饮用位置 | d行；药槽与药水 | s前→后行；UTC时间 |\n  | --- | --- | --- |\n')
 for d in D:
  if d['chosen'].get('action')!='use_potion':continue
  slot=d['chosen']['option_index'];es=[e for e in R['resource_changes'] if e['from']['potions']!=e['to']['potions'] and not e['restart_boundary'] and e['to']['floor']==d['floor'] and e['to']['turn']==d['turn'] and e['to']['ts']>=d['ts']]
  e=min(es,key=lambda x:x['to']['ts']);ident=next(j for i,j in e['from']['potions'] if i==slot)
  f.write(f"  | F{d['floor']}／第{d.get('sl_attempt') or 1}试T{d['turn']} | {d['_line']}；{slot}{short[ident]} {ident} | {e['from']['line']}→{e['to']['line']}；{e['to']['ts'][11:23]} |\n")
(p/'numbers-audit.json').write_text(json.dumps({'turns':metrics,'resources':R['combats'],'potions':[d['_line'] for d in D if d['chosen'].get('action')=='use_potion']},ensure_ascii=False,indent=2)+'\n')
x=(p/'draft-v1.md').read_text().replace('silent-0079，S1.exp112','silent-0079，S1.exp115');(p/'draft-v2.md').write_text(x+(p/'tables.md').read_text())
