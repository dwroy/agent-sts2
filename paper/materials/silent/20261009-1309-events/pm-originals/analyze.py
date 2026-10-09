import json,pathlib,collections,datetime,re
p=pathlib.Path(__file__).parent
d=json.loads((p/'decisions.json').read_text());s=json.loads((p/'states.json').read_text());rc=json.loads((p/'RMNXHZKV716Y-resources.json').read_text())
smap={x['_line']:x for x in s}; names={}
for x in s:
 st=x['state'];c=st.get('combat') or {}
 for e in c.get('enemies',[]):names[e['enemy_id']]=e['name']
 for a in st['run'].get('potions',[]):
  if a.get('occupied'):names[a['potion_id']]=a['name']
 for a in st['run'].get('relics',[]):names[a['relic_id']]=a['name']
 for a in st['run'].get('deck',[]):names[a['card_id']]=a['name']
(p/'names.json').write_text(json.dumps(names,ensure_ascii=False,indent=2))
def belt(a):return '、'.join(f"槽{i}{names.get(k,k)} {k}" for i,k in a) or '空'
att=collections.Counter();tables=[];turntables=[]
for c in rc['combats']:
 f=c['floor'];att[f]+=1;c['attempt']=att[f];e=c['entry'];z=c['exit'] or c['last'];seq=c['sequence']
 cs=[x for x in s if e['line']<=x['_line']<=z['line']]
 ended=c['end']=='observed_exit';out='获胜' if ended and smap[z['line']]['state']['screen'] in ['REWARD','EVENT'] else '阵亡' if ended and smap[z['line']]['state']['screen']=='GAME_OVER' else '判死后SL（无退出帧）'
 tables.append(f"| F{f}/{att[f]} {'／'.join(names[k]+' '+k for k in c['enemies'])} | {e['hp']}/{e['max_hp']}；{belt(e['potions'])} → {z['hp']}/{z['max_hp']}；{belt(z['potions'])} | {z['hp']-e['hp']:+d}；{out} | s{e['line']}→s{z['line']}；{e['ts']}→{z['ts']} |")
 if f not in [17,33,37,48,49]:continue
 grouped=[]
 for x in cs:
  t=x['state']['turn']
  if t is None:continue
  if not grouped or grouped[-1][0]['state']['turn']!=t:grouped.append([])
  grouped[-1].append(x)
 for gi,g in enumerate(grouped):
  a=g[0];pre=g[-1];b=grouped[gi+1][0] if gi+1<len(grouped) else pre
  st=a['state'];en=(st.get('combat') or {}).get('enemies') or []
  if not en:continue
  ac=pre['state'].get('combat') or {};be=(b['state'].get('combat') or {}).get('enemies')
  start=sum(x['current_hp'] for x in en if x['is_alive']);end=sum(x['current_hp'] for x in be if x['is_alive']) if be is not None else None
  row={'floor':f,'attempt':att[f],'turn':st['turn'],'start_line':a['_line'],'last_action_line':pre['_line'],'after_line':b['_line'],'hp_start':st['run']['current_hp'],'hp_after':b['state']['run']['current_hp'],'block':(ac.get('player') or {}).get('block'),'intent':sum((i.get('total_damage') or 0) for e2 in ac.get('enemies',[]) for i in e2.get('intents',[])),'enemy_start':start,'enemy_after':end,'enemy_net_hp_loss':start-end if end is not None else None,'needed':[(x['name'],x['enemy_id'],x['current_hp']) for x in en if x['is_alive']],'pre_powers':{x['power_id']:x['amount'] for x in (ac.get('player') or {}).get('powers',[])},'wither':[(x['card_id'],x.get('resolved_rules_text')) for x in ac.get('hand',[]) if x['card_id']=='WITHER'],'gaps':[]}
  if gi+1==len(grouped) and not ended:row['gaps'].append('仅至判死最后帧，未结束回合')
  if end is None:row['gaps'].append('退出帧缺敌人，终结剩血不能算实际伤害')
  turntables.append(row)
(p/'resource-table.md').write_text('\n'.join(tables)+'\n');(p/'critical-turns.json').write_text(json.dumps(turntables,ensure_ascii=False,indent=2))
auto=[r for r in d if r['decider']=='code' and r['label'].startswith('combat/') and 'Jev-chosen' not in r['rationale'] and r['label']!='combat/plan-continue']
def window(r):
 for c in rc['combats']:
  z=c['exit'] or c['last']
  if c['entry']['ts']<=r['ts']<=z['ts'] and r['floor']==c['floor']:return c['sequence']
 return None
metrics={'decisions':len(d),'states':len(s),'ranks':dict(collections.Counter(re.search(r'code rank (\d+)',r['rationale']).group(1) for r in d if re.search(r'code rank (\d+)',r['rationale']))),'rollout':dict(collections.Counter(str(r.get('rollout_best_chosen')) for r in d if 'rollout_best_chosen' in r)),'low_conf':sum(r['decider']=='jev' and r.get('confidence') is not None and r['confidence']<.35 for r in d),'code_combat_decisions':len(auto),'code_combat_turns':len(set((window(r),r['turn']) for r in auto)),'code_labels':dict(collections.Counter(r['label'] for r in auto)),'elapsed_decision_seconds':(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds(),'elapsed_observation_seconds':(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['observed_ts'].replace('Z','+00:00'))).total_seconds(),'not_completed':[(r['_line'],r['result']) for r in d if not r['result'].startswith('completed')],'token_jev':{k:sum(r.get('usage',{}).get(k,0) for r in d if r['decider']=='jev') for k in ['input_tokens','output_tokens']},'token_brain':{k:sum(r.get('usage',{}).get(k,0) for r in d if r['decider']=='codex') for k in ['input_tokens','output_tokens','cache_hit_tokens']},'guards':[r['_line'] for r in d if 'HP guard:' in r['rationale']]}
(p/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
print(json.dumps(metrics,ensure_ascii=False))
for t in turntables:
 if t['attempt'] in ([3] if t['floor']==48 else [6] if t['floor']==49 else [1]):print(json.dumps(t,ensure_ascii=False))
