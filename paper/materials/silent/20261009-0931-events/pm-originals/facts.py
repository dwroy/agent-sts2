import json,collections,datetime
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-091302-postmortem')
for r in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']:
 ds=[json.loads(l) for l in (p/f'{r}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{r}-states.jsonl').open()];sm={s['_line']:s for s in ss};res=json.loads((p/f'{r}-resources.json').read_text());out=[]
 out+=['  每场实盘资源（s为states.jsonl行号；时间均UTC；药栏采用槽位:ID；净变化不是敌人毛伤）：','','  | 层／尝试，敌人 | HP进→出／上限；净变化 | 药栏进→出 | 证据行；进→出时间 |','  | --- | --- | --- | --- |']
 seen=collections.Counter()
 for c in res['combats']:
  seen[c['floor']]+=1;a=c['entry'];b=c.get('exit') or c['last']; names={}
  for s in ss:
   if a['line']<=s['_line']<=b['line']:
    for e in (s['state'].get('combat') or {}).get('enemies',[]):names[e['enemy_id']]=e['name']
  enemies='／'.join(f'{n} {i}' for i,n in names.items())
  net=f'{b["hp"]-a["hp"]:+}' if c.get('exit') else f'观察到{b["hp"]-a["hp"]:+}，最终净变化未记录'
  belt=lambda q:'空' if not q else '，'.join(f'{i}:{x}' for i,x in q)
  out.append(f'  | F{c["floor"]}／{seen[c["floor"]]}，{enemies} | {a["hp"]}→{b["hp"]}／{a["max_hp"]}；{net} | {belt(a["potions"])}→{belt(b["potions"])} | s{a["line"]}→{b["line"]}；{a["ts"]}→{b["ts"]} |')
 out+=['','  每回合核对：下表从T1起逐项对应。需＝轮初活敌HP合计；扣＝逐帧可见敌HP下降下界，包含已兑现毒／荆棘等、排除敌挡；不是卡牌毛输出；HP净损负数表示本轮净回升，不等于负敌伤。末击退场缺独立帧、重复ID与生成／复活都会使下界不完整，不能以需的下降冒充实伤。','','  | 层／尝试 | 需 | 可见扣血下界 | 玩家HP净损 |','  | --- | --- | --- | --- |']
 seen=collections.Counter()
 for c in res['combats']:
  seen[c['floor']]+=1;ts=c['enemy_hp_audit']['turns']; hp=[]; need=[]; dmg=[]
  for t in ts:
   a=sm[t['start_line']]['state']['run']['current_hp'];b=sm[t['end_line']]['state']['run']['current_hp']
   hp.append(a-b if not(t is ts[-1] and not c.get('exit')) else '未结算');need.append(t['live_enemy_hp_start']);dmg.append(t['visible_enemy_hp_loss_lower_bound'])
  fm=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
  out.append(f'  | F{c["floor"]}／{seen[c["floor"]]} | {fm(need)} | {fm(dmg)} | {fm(hp)} |')
 out+=['','  药水事件（按实物状态变更核来源，SL恢复另列）：']
 additions=[]
 for e in res['resource_changes']:
  if e['restart_boundary']:continue
  a,b=e['from'],e['to'];before=set(map(tuple,a['potions']));after=set(map(tuple,b['potions']))
  if after-before:additions.extend(after-before);out.append(f'  补充F{b["floor"]}，槽位{list(after-before)}，s{a["line"]}→{b["line"]}，{b["ts"]}。')
 for x in ds:
  if x.get('chosen',{}).get('action') in ['use_potion','discard_potion','buy_potion']:
   out.append(f'  d{x["_line"]}，F{x["floor"]}T{x["turn"]}／尝试{x.get("sl_attempt") or 1}，{dict(use_potion='饮用',discard_potion='丢弃',buy_potion='购买')[x['chosen']['action']]}，槽{x['chosen']['option_index']}；{x["ts"]}。')
 out.append('  药水计数：'+json.dumps({'实物补充':len(additions),'饮用动作':sum(x.get('chosen',{}).get('action')=='use_potion' for x in ds),'丢弃动作':sum(x.get('chosen',{}).get('action')=='discard_potion' for x in ds),'购买动作':sum(x.get('chosen',{}).get('action')=='buy_potion' for x in ds)},ensure_ascii=False))
 (p/f'{r}-tables.md').write_text('\n'.join(out)+'\n')
 print(r,'added bottles',len(additions),'time secs',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
