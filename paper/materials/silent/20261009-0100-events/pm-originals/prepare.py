import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from analyze import P,D,S,R,SL,hp,live
byline={s['_line']:s for s in S}
# 先核对核心证据，再准备只追加的正文。
assert len(D)==538 and len(S)==556 and len(R['combats'])==13
assert [hp(byline[n]) for n in [307941,307942,307966,307967,307994,307999,308000,308048,308052,308053]]==[63,65,65,67,61,61,63,1,1,0]
assert [byline[n]['state']['combat']['enemies'][0]['current_hp'] for n in [308041,308042,308043,308044,308048,308052,308053]]==[40,32,18,16,4,4,4]
assert [byline[n]['state']['combat']['player']['block'] for n in [308048,308049,308050,308051,308052]]==[0,3,6,9,9]
assert byline[308052]['state']['combat']['enemies'][0]['intents'][0]['damage']==33
assert byline[307993]['state']['combat']['enemies'][0]['current_hp']==30
assert byline[307993]['state']['combat']['enemies'][0]['move_id']=='ESCAPE_MOVE'
assert all(not any(c['card_id']=='THRUMMING_HATCHET' for c in s['state']['run'].get('deck',[])) for s in S if s['_line']>=307972)
names={}
for s in S:
 for e in (s['state'].get('combat') or {}).get('enemies',[]):names[e['enemy_id']]=e['name'].split(' #')[0]
names['KIN_FOLLOWER']='同族信徒';names['WRIGGLER']='扭动虫';names['EXOSKELETON']='外骨骼虫'
def drug(x):return '空' if not x else '；'.join('槽'+str(n)+' '+{'SNECKO_OIL':'异蛇之油','BLOCK_POTION':'格挡药水','EXPLOSIVE_AMPOULE':'爆炸安瓿','REGEN_POTION':'再生药水','CUNNING_POTION':'狡诈药水','SKILL_POTION':'技能药水'}[i]+' '+i for n,i in x)
rows=[];turns=[]
for c in R['combats']:
 a=c['entry'];b=c.get('exit') or c['last'];ss=[s for s in S if a['line']<=s['_line']<=b['line']]
 ids=list(dict.fromkeys(e['enemy_id'] for s in ss for e in (s['state'].get('combat') or {}).get('enemies',[])))
 label='／'.join(names[i]+' '+i for i in ids)
 outcome='胜，奖励／推进已核'
 if c['sequence'] in [8,9]:outcome='判死读档；退出帧未记录'
 elif c['floor']==20:outcome='逃脱结算，未击杀；手斧未返还'
 elif c['floor']==21:outcome='实死'
 seq=('／第'+str(c['sequence']-7)+'试') if c['floor']==17 else ''
 rows.append(f"| F{c['floor']}{seq}，{label} | {a['hp']}/{a['max_hp']}→{b['hp']}/{b['max_hp']} | {b['hp']-a['hp']:+d}；{outcome} | {drug(a['potions'])}→{drug(b['potions'])} | s{a['line']}→s{b['line']}；{a['ts'][11:]}→{b['ts'][11:]} |")
 if c['floor'] in [12,14,15,17,19,20,21]:
  first=[];seen=set()
  for s in ss:
   t=s['state'].get('turn')
   if s['state'].get('in_combat') and t not in seen:seen.add(t);first.append(s)
  need=[live(s) for s in first];progress=[];deltas=[];evid=[]
  for i,s in enumerate(first):
   e=first[i+1] if i+1<len(first) else ss[-1]
   progress.append(live(s)-live(e));deltas.append(hp(e)-hp(s));evid.append([s['_line'],e['_line']])
  turns.append(f"F{c['floor']}{seq}：轮初需清本体血{need}；可见存活敌血净减少{progress}；玩家HP净变化{deltas}；逐轮s起→结算后{evid}。")
(P/'resource-table.md').write_text('\n'.join(rows)+'\n')
(P/'turn-records.md').write_text('\n\n'.join(turns)+'\n')
(P/'core-verified.json').write_text(json.dumps({'run':'LY83ZMTFVKJH','decisions':538,'states':556,'combat_windows':13,'death':{'turn':12,'hp':1,'block':9,'incoming':33,'complete_hp_need':24,'minimum_extra_hp':24,'enemy_hp':4,'enemy_max_hp':138},'strangle':{'turn7':[8,10],'turn10':[20,24]},'hopper':{'card':'THRUMMING_HATCHET','lost_at_state':307972,'escape_turn':5,'escape_hp':30,'actual_hp_damage':54},'table':rows,'turns':turns},ensure_ascii=False,indent=2)+'\n')
print('核心数字核验通过；资源表、逐轮记录已保存。')
