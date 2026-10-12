import json,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-041302-postmortem')
r=json.loads((p/'9Z9H2EXKLF3T-resources.json').read_text())
names={};turns={};selected={}
for line in (p/'states.jsonl').open():
 x=json.loads(line);s=x['state'];run=s.get('run') or {};c=s.get('combat') or {}
 for arr,k in [(run.get('deck',[]),'card_id'),(run.get('relics',[]),'relic_id'),(run.get('potions',[]),'potion_id'),(c.get('enemies',[]),'enemy_id')]:
  for v in arr:
   if v.get(k):names[v[k]]=v.get('name','')
 for b in r['combats']:
  if b['entry']['line']<=x['_line']<=(b['exit'] or b['last'])['line'] and s.get('in_combat'):
   turns.setdefault(b['sequence'],{}).setdefault(s['turn'],run.get('current_hp'))
 if x['_line'] in [287619,287620,287621,287990,287991,288000,288001,288002,288004,288007,288008]:selected[x['_line']]=x
belt=lambda z:'空' if not z else '／'.join('槽'+str(i)+':'+k for i,k in z)
chains=[];arrays=[]
for b in r['combats']:
 a=b['entry'];e=b['exit'];end=e or b['last'];enemies=[]
 for k in b['enemies']:enemies.append(names[k]+'（'+k+'）')
 if b['floor']==9:enemies.append('后出现扭动虫（WRIGGLER）')
 if b['floor']==39:enemies.extend(names[k]+'（'+k+'）' for k in ['NOISEBOT','STABBOT','GUARDBOT','ZAPBOT'])
 tag='F'+str(b['floor'])+('第'+str(b['sequence']-19)+'次' if b['floor']==48 else '')
 outcome='死亡' if b['floor']==48 and e else '中断，退出帧缺失' if not e else '获胜'
 delta=a['hp']-end['hp']
 text=f'{tag}{"／".join(enemies)}：{a["hp"]}/{a["max_hp"]}〔{belt(a["potions"])}〕→{end["hp"]}/{end["max_hp"]}〔{belt(end["potions"])}〕，{outcome}，'+('仅截至最后帧净损' if not e else '净损')+str(delta)+f'；首帧T{a["turn"]}，states:{a["line"]}→{end["line"]}，UTC{a["ts"].split("T")[1]}→{end["ts"].split("T")[1]}'
 chains.append(text)
 if b['floor'] in [17,31,33,35,38,39,45,48]:
  hp=list(turns[b['sequence']].values());needs=[v['live_enemy_hp_start'] for v in b['enemy_hp_audit']['turns']];damage=[v['net_live_enemy_hp_loss'] for v in b['enemy_hp_audit']['turns']];loss=[a-b for a,b in zip(hp,hp[1:]+[end['hp']])]
  suffix='（末项仅动作到截断，未结算）' if not e else ''
  arrays.append(f'{tag}需{needs}／扣{damage}／净血损{loss}{suffix}')
parts=(p/'record-parts.txt').read_text().strip().splitlines()
parts.insert(1,'全战实盘资源链：'+'；'.join(chains)+'。各段首帧均T1；后两次首帧为in_combat=true的CARD_SELECTION，未错分成非战斗。F17／31／33／38／39／45的SL跟踪分别为sl-attempts:1027—1032，均第1次即won、无reload；其余获胜由退出REWARD帧确认。F48分别见1033—1035，两次reload成功、末次died。')
idx=next(i for i,s in enumerate(parts) if s.startswith('关键战逐回合'))
parts.insert(idx+1,'；'.join(arrays)+'。')
idx=next(i for i,s in enumerate(parts) if s.startswith('药水正常'))
parts.insert(idx+1,'饮用逐项（括号为states完成帧／decisions动作行，槽位由动作及药栏交叉核对）：F3T2槽0格挡287039／280689；F6T3槽0能量287088／280736；F9T1槽0能量287116／280762；F15T1槽0消亡粉末287197／280839；F19T4槽0技能287287／280927；F23T1槽0敏捷287323／280961；F30T1槽0火焰287453／281088；F31T1槽0易伤287481／281115；F33T1槽0力量287520／281153；F38T3槽1精炼混沌287645／281265，T4槽0癫狂之触287650／281270；F39T3槽0能力287682／281299；F45T1槽1火焰287744／281358。F48三次分别技能槽1T1／T5／T5（287790／287877／287960），混沌槽0均T7（287837／287896／287983），熔炉槽1T7／T8／T10（287839／287904／288001）；混沌补充的精灵槽0／熔炉槽1均在上述混沌完成帧可见。获得证据：奖励states:287024／287068／287097／287263／287442／287470／287506／287609／287657／287769，商店287105／287186／287316／287624／287707／287708；没有discard_potion，SL恢复药栏单列如上。')
text=(p/'lessons-head.md').read_text()
lines=text.splitlines();lines[1]='## 9Z9H2EXKLF3T（A10，静默猎手，第48层，永世沙漏 AEONGLASS 末次T11：3血0挡对24×2攻击阵亡，双触发毒77与荆棘3后敌剩32/535，未到F49）'
text='\n'.join(lines)+'\n- [记录] '+' '.join(parts)+'\n'
text=text.replace('的切割／早有准备／触媒包','的切割（SLICE）／早有准备（PREPARED）／触媒（ACCELERANT）')
text=text.replace('“后空翻、切割、究极防御、生存者”','后空翻（BACKFLIP）、切割（SLICE）、究极防御（ULTIMATE_DEFEND）、生存者（SURVIVOR）')
text=text.replace('小刀（SHIV）后','小刀（SHIV）后')
text=text.replace('全段','全段')
(p/'lessons-draft.md').write_text(text)
(p/'selected-evidence.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
print('复盘字数',len(text),'资源段',len(chains),'关键回合段',len(arrays),'经验行',sum(x.startswith('- [') and not x.startswith('- [记录]') for x in text.splitlines()))
print('\n'.join(text.splitlines()[:5]))
