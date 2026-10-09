import json,pathlib,collections,re,hashlib,datetime
p=pathlib.Path(__file__).parent;runid='9663Y88TYK73'
D=[json.loads(l) for l in (p/'decisions.jsonl').open()];S=[json.loads(l) for l in (p/'states.jsonl').open()];R=json.load((p/(runid+'-resources.json')).open());SD={r['_line']:r for r in S}
names={}
for r in S:
 for e in (r['state'].get('combat') or {}).get('enemies',[]):names[e['enemy_id']]=e['name']
 for x in r['state']['run'].get('potions',[]):
  if x.get('occupied'):names[x['potion_id']]=x['name']
def belt(x):return '、'.join('槽'+str(slot)+' '+names.get(pid,pid)+'（'+pid+'）' for slot,pid in x['potions']) or '空'
def evidence(x):return 's'+str(x['line'])+'／'+x['ts'][11:23]+'Z'
lines=['| 层／尝试、敌人（中文名 ID） | HP／上限、药栏：进→离（截断用末帧） | 净HP变化 | 进／离或末证据（states行／UTC） | 结果与缺帧 |','|---|---|---|---|---|']
for c in R['combats']:
 a=c['entry'];b=c['exit'] or c['last'];all_ids=set(c['enemies'])
 for r in S:
  if a['line']<=r['_line']<=b['line']:
   all_ids.update(e['enemy_id'] for e in (r['state'].get('combat') or {}).get('enemies',[]))
 enemies='、'.join(names[x]+' '+x for x in sorted(all_ids))
 seq= c['sequence']-17 if c['floor']==46 else 1
 delta=str(-c['observed_net_hp_loss']) if c['observed_net_hp_loss'] is not None else '未记录；入口至末帧'+str(b['hp']-a['hp'])
 result='胜，奖励帧核实' if c['floor']<46 else '实死' if seq==4 else '判死读档；退出帧缺失'
 lines.append('| F'+str(c['floor'])+'／'+str(seq)+' '+enemies+' | '+str(a['hp'])+'/'+str(a['max_hp'])+'，'+belt(a)+' → '+str(b['hp'])+'/'+str(b['max_hp'])+'，'+belt(b)+' | '+delta+' | '+evidence(a)+' → '+evidence(b)+' | '+result+'；首帧T1 |')
(p/'resource-table.md').write_text('\n'.join(lines)+'\n')
lines=['| 层／尝试 | 各轮首活敌HP总和（尚需伤害的现场量） | 各轮实见扣敌HP下界 | 各轮玩家净HP变化 | 缺口 |','|---|---|---|---|---|']
for c in R['combats']:
 ts=c['enemy_hp_audit']['turns'];values=[]
 for t in ts:
  a=SD[t['start_line']]['state']['run']['current_hp'];b=SD[t['end_line']]['state']['run']['current_hp'];values.append(b-a)
 gaps=set(g for t in ts for g in t['gaps']);gs=[]
 if 'body_removed_without_death_frame' in gaps:gs.append('敌退场缺归零帧')
 if 'ambiguous_enemy_identity' in gaps:gs.append('同ID实体对应不明')
 if c['floor']==31:gs.append('T1新见21血寄生惧魔')
 seq=c['sequence']-17 if c['floor']==46 else 1
 lines.append('| F'+str(c['floor'])+'／'+str(seq)+' | '+'／'.join(str(t['live_enemy_hp_start']) for t in ts)+' | '+'／'.join(str(t['visible_enemy_hp_loss_lower_bound']) for t in ts)+' | '+'／'.join(str(x) for x in values)+' | '+'；'.join(gs or ['无'])+' |')
(p/'damage-table.md').write_text('\n'.join(lines)+'\n')
# Physical acquisition is separate from SL restoration.
acq=[]
for e in R['resource_changes']:
 if e['restart_boundary']:continue
 old=set(map(tuple,e['from']['potions']));new=set(map(tuple,e['to']['potions']))
 for slot,pid in sorted(new-old):acq.append((e['to'],slot,pid))
lines=['| 实得药水／槽 | 获得证据（层、states行／UTC） | 实饮证据（层、回合、decisions行／UTC；饮后状态） |','|---|---|---|']
for a,slot,pid in acq:
 drinks=[]
 for d in D:
  if d['chosen'].get('action')!='use_potion' or d['chosen'].get('option_index')!=slot:continue
  before=[s for s in S if s['ts']<=d['ts'] and s['state']['run']['floor']==d['floor']][-1]
  pot=next((x for x in before['state']['run']['potions'] if x['index']==slot and x['occupied']),None)
  if not pot or pot['potion_id']!=pid or d['ts']<a['ts']:continue
  # Distinguish the two identical poison bottles by slot and their acquisition.
  after=next((s for s in S if s['_line']>before['_line']),None)
  drinks.append('F'+str(d['floor'])+'T'+str(d['turn'])+(('第'+str(d['sl_attempt'])+'次') if d['floor']==46 else '')+'，d'+str(d['_line'])+'／'+d['ts'][11:23]+'Z；s'+str(after['_line']))
 lines.append('| '+names[pid]+' '+pid+'／'+str(slot)+' | F'+str(a['floor'])+'；'+evidence(a)+' | '+'；'.join(drinks)+' |')
(p/'potion-table.md').write_text('\n'.join(lines)+'\n')
print('实得',len(acq),'饮用动作',sum(d['chosen'].get('action')=='use_potion' for d in D),'丢弃',sum(d['chosen'].get('action')=='discard_potion' for d in D))
# Recheck each extracted physical line against the original byte offset.
verified=0
for name,source in [('decisions','decisions'),('states','states'),('plans','run-plans'),('sl','sl-attempts')]:
 with open(pathlib.Path('logs')/(source+'.jsonl'),'rb') as h:
  for l in (p/(name+'-indexed.jsonl')).open():
   n,b,s=l.split(':',2);h.seek(int(b));assert h.readline().decode()==s;verified+=1
for n,hp in [(330123,70),(330124,66),(330161,55),(330162,51),(330198,9),(330199,5),(330303,5),(330307,5),(330310,0)]:assert SD[n]['state']['run']['current_hp']==hp
assert SD[330307]['state']['combat']['player']['block']==3
assert SD[330303]['state']['combat']['enemies'][0]['intents'][0]['damage']==12
assert SD[330304]['state']['combat']['enemies'][0]['intents'][0]['damage']==8
assert SD[330309]['state']['combat']['enemies'][0]['powers'][1]['amount']==33
assert SD[330310]['state']['combat']['enemies'][0]['current_hp']==49
assert SD[330310]['state']['combat']['enemies'][0]['powers'][1]['amount']==32
assert 12-6-3==3 and 8-3==5
out={'run':runid,'verified_original_rows':verified,'decisions':len(D),'states':len(S),'acquired':len(acq),'drunk_actions':sum(d['chosen'].get('action')=='use_potion' for d in D),'key_checks':'通过','limits':['dirty源码未完整封存','前三次SL没有退出结算帧','未执行替路线/用药/出牌整场反事实']}
(p/'audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(out)
with open('notes/lessons.md','rb') as h:
 raw=h.read();(p/'lessons-before.json').write_text(json.dumps({'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})+'\n')
