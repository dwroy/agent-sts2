import contextlib,io,json,collections,sys,bisect,datetime
from pathlib import Path
p=Path('learner/runs/20261007-081301-postmortem');sys.path.insert(0,str(p))
with contextlib.redirect_stdout(io.StringIO()):import analyze as a
ds=a.ds;ss=a.ss;groups=a.groups
for (f,attempt),keys in __import__('itertools').groupby(groups,lambda k:k[:2]):
 keys=list(keys);need=[];damage=[];loss=[]
 for j,k in enumerate(keys):
  rows=groups[k];s=rows[0][2];last=rows[-1][2];init=sum(e['current_hp'] for e in s['combat']['enemies']);need.append(init)
  if j+1<len(keys):end=groups[keys[j+1]][0][2]
  elif f==17 and attempt<6:end=last
  else:
   i,d,_=rows[-1];end=a.state(ds[i+1])
  c=end.get('combat') or {};remaining=sum(e['current_hp'] for e in c.get('enemies',[]));damage.append(init-remaining)
  endhp=(c.get('player') or {}).get('current_hp',end['run']['current_hp']);loss.append(s['combat']['player']['current_hp']-endhp)
 print('数组',f,attempt,'需',need,'扣',damage,'损',loss,'合',sum(damage),sum(loss),'末血',end['run']['current_hp'],'末敌',remaining)
 print('初敌',[(e['name'],e['enemy_id'],e['current_hp']) for e in groups[keys[0]][0][2]['combat']['enemies']])
print('路线脑')
for line in (p/'brain.jsonl').open():
 d=json.loads(line);facts=d.get('payload',{}).get('facts',{});f=facts.get('floor');
 if d['label']=='rest/plan':
  print('营火',f,'当前',facts.get('hp'),'字段',list(facts));print('路线',json.dumps(facts.get('route',facts.get('route_projection')),ensure_ascii=False)[:2800]);print('选项',[(k,json.loads(v).get('hp_after'),json.loads(v).get('route_projection'),json.loads(v).get('boss_sim')) for k,v in d.get('options',{}).items() if k=='o0'])
print('喝药',[(d['floor'],d['turn'],d.get('sl_attempt'),d.get('expect',{}).get('potion',{}).get('id')) for d in ds if d['chosen']['action']=='use_potion'])
print('所有SL')
for line in (p/'sl.jsonl').open():
 d=json.loads(line);print(d['attempt'],d['result'],d['turns'],d['end_hp'],d['end_block'],d['incoming'],'末前',d['summary']['turns'][-1]['enemies'],'前序',d['draws']['order'][:24])
print('时间差',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('最优比例',116/127*100,16/17*100,'缓存比',998912/1930806*100)
