import json,collections,re,datetime
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-034303-postmortem')
def rows(name):
 out=[]
 for z in (P/(name+'.lines')).open():
  n,l=z.split(':',1);x=json.loads(l);x['_line']=int(n);out.append(x)
 return out
D=rows('decisions');S=rows('states');B=rows('brain');R=json.loads((P/'456MRNGCPD8E-resources.json').read_text());draft=(P/'lesson-draft.md').read_text();checks=[]
def verify(name,ok):
 if not ok:raise AssertionError(name)
 checks.append(name)
verify('十八场资源窗口',len(R['combats'])==18)
for c in R['combats']:
 a,b=c['entry'],c['exit'];verify('F'+str(c['floor'])+'首轮及离场存在',a['turn']==1 and b is not None)
 line=next(l for l in draft.splitlines() if l.strip().startswith('| F'+str(c['floor'])+' '))
 verify('F'+str(c['floor'])+'HP及净损',f"{a['hp']}→{b['hp']}；{a['hp']-b['hp']}" in line)
 verify('F'+str(c['floor'])+'行号及时间',f"s{a['line']}／{b['line']}" in line and a['ts'][11:-1] in line and b['ts'][11:-1] in line)
verify('634决策655状态',len(D)==634 and len(S)==655)
low=[x for x in D if x['decider']=='jev' and isinstance(x.get('confidence'),(float,int)) and x['confidence']<.35]
verify('19低信心，7选线12选择',len(low)==19 and sum(x['label'].startswith('combat/') for x in low)==7)
rc=[x for x in D if type(x.get('rollout_best_chosen')) is bool];verify('最优192/199',len(rc)==199 and sum(x['rollout_best_chosen'] for x in rc)==192)
for f,win,total in [(29,14,15),(30,16,16),(31,14,14)]:
 ar=[x for x in rc if x['floor']==f];verify('F'+str(f)+'最优回答',len(ar)==total and sum(x['rollout_best_chosen'] for x in ar)==win)
verify('十二次使用无丢弃',sum((x.get('chosen') or {}).get('action')=='use_potion' for x in D)==12 and not any((x.get('chosen') or {}).get('action')=='discard_potion' for x in D))
by={x['_line']:x for x in S};last=by[312177]['state'];dead=by[312178]['state']
verify('死亡末轮2血14挡',last['run']['current_hp']==2 and last['combat']['player']['block']==14 and dead['run']['current_hp']==0)
verify('死亡后仅甲虫19血16攻',len(dead['combat']['enemies'])==1 and dead['combat']['enemies'][0]['enemy_id']=='SLUMBERING_BEETLE' and dead['combat']['enemies'][0]['current_hp']==19 and dead['combat']['enemies'][0]['intents'][0]['damage']==16)
expected={29:([140,129,114,105,93,61,31],[11,15,9,12,32,30,31],[0,0,23,0,0,17,0]),30:([126,84,77,68,59,39,14],[42,7,9,9,20,25,14],[0,11,0,0,1,8,0]),31:([179,138,118,112,106,59],[41,20,6,6,47,40],[0,1,0,0,1,2])}
for f,(needs,progress,hploss) in expected.items():
 xs=[x for x in S if x['state']['run'].get('floor')==f];ts=collections.defaultdict(list)
 for x in xs:
  if x['state'].get('in_combat'):ts[x['state']['turn']].append(x)
 def enemyhp(x):return sum(v['current_hp'] for v in (x['state'].get('combat') or {}).get('enemies',[]) if v['is_alive'])
 ns=[];ps=[];hs=[]
 for t,arr in ts.items():
  nxt=xs[xs.index(arr[-1])+1];ns.append(enemyhp(arr[0]));ps.append(enemyhp(arr[0])-enemyhp(nxt));hs.append(arr[0]['state']['run']['current_hp']-nxt['state']['run']['current_hp'])
 verify('F'+str(f)+'逐轮需/净进度/HP损',ns==needs and ps==progress and hs==hploss)
verify('大脑30次均Codex',len(B)==30 and all(x['engine']=='codex' for x in B))
verify('脑token含独立计划',sum(x['usage'].get('inputTokens',0) for x in B)==4178282 and sum(x['usage'].get('outputTokens',0) for x in B)==8996 and sum(x['usage'].get('cacheHitTokens',0) for x in B)==2098560)
verify('源码SL排除定位',"const changed = living.map" in Path('/home/dw/Projects/agent-sts2/.worktrees/live/agent/src/sl/judge.ts').read_text().splitlines()[1411])
if '--appended' in __import__('sys').argv:
 text=Path('/home/dw/Projects/agent-sts2/notes/lessons.md').read_text();verify('追加字节和标题唯一',text.count('## 456MRNGCPD8E（')==1 and draft in text)
print(json.dumps({'核验':'通过','项数':len(checks),'项目':checks},ensure_ascii=False,indent=2))
