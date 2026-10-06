import json,collections,datetime
root='learner/runs/20261007-051302-postmortem/'
a=[json.loads(x) for x in open(root+'decisions.jsonl')];ss=[json.loads(x) for x in open(root+'states.jsonl')];byts={d['observed_ts']:d for d in ss}
for fl in [5,8,13,17,22,28]:
 ds=[d for d in a if d['floor']==fl and d['screen']=='COMBAT'];ts=sorted(set(d['turn']for d in ds));starts=[byts[next(d for d in ds if d['turn']==t)['observed_ts']]['state']['combat'] for t in ts];after=next(s['state'] for s in ss if s['ts']>ds[-1]['ts'] and (s['state'].get('run')or{}).get('floor')==fl and s['screen']!='COMBAT');c=after.get('combat')
 need=[sum(e['current_hp'] for e in st['enemies'] if e['is_alive'])for st in starts];ph=[st['player']['current_hp']for st in starts];endhp=after['run']['current_hp'];enemyleft=sum(e['current_hp']for e in c['enemies'])if c else 0
 dmg=[v-(need+[enemyleft])[i+1]for i,v in enumerate(need)];loss=[v-(ph+[endhp])[i+1]for i,v in enumerate(ph)]
 print('F',fl,'需',need,'净扣',dmg,'损',loss,'合',sum(dmg),sum(loss),'末',enemyleft,endhp)
print('能力在手')
for d in a:
 if d['floor'] in [22,28] and d['screen']=='COMBAT':
  st=byts[d['observed_ts']]['state']['combat'];hand=[c for c in st['hand']if c['card_id']=='SERPENT_FORM'];
  if hand and d['label']!='combat/plan-continue':print(d['floor'],d['turn'],d['label'],[(c['energy_cost'],c.get('can_play'),c.get('unplayable_reason'))for c in hand])
print('羽毛房间变化')
for fl in [12,16,27]:
 for s in ss:
  r=s['state'].get('run')or{};f=r.get('floor')
  if f in [fl-1,fl] and s['screen']in['MAP','REST_SITE','REST']:
   print(fl,s['ts'],f,s['screen'],r.get('current_hp'),len(r.get('deck',[])))
print('击杀顺序')
for fl in [2,5,7,11,13,19]:
 seq=[];prev={}
 for d in a:
  if d['floor']!=fl or d['screen']!='COMBAT':continue
  c=byts[d['observed_ts']]['state']['combat'];cur={e['index']:e for e in c['enemies']if e['is_alive']}
  for ix,e in prev.items():
   if ix not in cur:seq.append((d['turn'],ix,e['name'],e['enemy_id']))
  prev=cur
 seq+= [('终轮',ix,e['name'],e['enemy_id'])for ix,e in prev.items()]
 print(fl,seq)
print('boss时钟字段')
for d in a:
 if 'questions'in d:
  vals=[v for q in d['questions'].values() for v in q.get('criteria',{}).values()]
  for v in vals:
   if '时钟' in v or 'clock' in v:
    loc=v.find('时钟') if '时钟'in v else v.find('clock');print(d['floor'],d['label'],v[max(0,loc-80):loc+250]);break
print('缓存',2690048/3934086*100,'最优',103/106*100,103/105*100,102/106*100,'终战',12/13*100)
