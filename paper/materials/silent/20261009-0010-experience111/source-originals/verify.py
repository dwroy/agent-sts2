import collections,json,hashlib
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');RUN='M0GY0A4M2F7H';A=json.load(open(O/'audit.json'));B=json.load(open(O/'experience-before.json'));E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};S=[json.loads(x) for x in (O/RUN/'states.jsonl').open()];D=[json.loads(x) for x in (O/RUN/'decisions.jsonl').open()];checks=[]
def check(label,value):
 assert value,label
 checks.append(label)
def pow(ent):return {p['power_id']:p['amount'] for p in ent.get('powers',[])}
F=[f for f in A['fights'] if f['run']==RUN];check('新9房/8胜1实死',[f['loss'] for f in F]==[5,4,8,3,19,21,20,3,29] and sum(f['death'] for f in F)==1);check('八胜战净耗83',sum(f['loss'] for f in F if not f['death'])==83)
rests=[x for x in A['rests'] if x['run']==RUN];check('三营火各21合63',[(x['before'],x['after']) for x in rests]==[(36,57),(31,52),(8,29)])
check('新局同角色状态',all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==RUN for s in S));check('六试0胜五次读档',len([x for x in A['attempts'] if x['run']==RUN])==6 and not any(x['result']=='won' for x in A['attempts'] if x['run']==RUN))
foot=[x for x in A['cards'] if x['run']==RUN and x['floor']==17 and x['card']=='FOOTWORK'];check('五次步法当步建2敏',len(foot)==5 and all(x['after']['powers'].get('DEXTERITY_POWER',0)-x['before']['powers'].get('DEXTERITY_POWER',0)==2 for x in foot))
last=[x for x in S if x['state']['run']['floor']==17][-1]['state'];check('末实际死亡0/敌126',last['run']['current_hp']==0 and last['combat']['enemies'][0]['current_hp']==126)
# Recover round windows from reload timestamps; a replay is not an independent run.
combat=[x for x in S if x['state']['run']['floor']==17 and x['state'].get('combat')];groups=[]
for x in combat:
 if not groups or (x['state']['turn']==1 and x['state']['run']['current_hp']==29 and groups[-1][-1]['state']['turn']>1):groups.append([])
 groups[-1].append(x)
check('实际六次状态窗口',len(groups)==6)
for attempt in [2,3,4,5,6]:
 rs=[x['state'] for x in groups[attempt-1] if x['state']['turn']==1];z=rs[-1];en=z['combat']['enemies'][0]
 check(str(attempt)+'T1连续反弹滑溜9→5/183→179',en['current_hp']==179 and pow(en).get('SLIPPERY_POWER')==5)
a=[x['state'] for x in groups[0] if x['state']['turn']==2][-1];z=next(x['state'] for x in groups[0] if x['state']['turn']==3)
check('首试蛇咬7毒建层不扣血',a['combat']['enemies'][0]['current_hp']==177 and pow(a['combat']['enemies'][0]).get('POISON_POWER')==7)
check('首试毒限1血且层减1',z['combat']['enemies'][0]['current_hp']==176 and pow(z['combat']['enemies'][0]).get('POISON_POWER')==6 and pow(z['combat']['enemies'][0]).get('SLIPPERY_POWER')==2)
for i,expected in [(1,(19,19,19)),(2,(19,19,19)),(3,(19,10,25))]:
 q=[x['state'] for x in groups[i] if x['state']['turn']==9];a=q[0];z=next(x['state'] for x in groups[i] if x['state']['turn']==10)
 check('T9同盘实际血价'+str(i+1),(a['run']['current_hp'],z['run']['current_hp'],a['combat']['enemies'][0]['current_hp']-z['combat']['enemies'][0]['current_hp'])==expected)
q=[x['state'] for x in groups[5] if x['state']['turn']==7];check('末T7牌挡20/现8血/来袭32',any(x['combat']['player']['block']==20 and x['run']['current_hp']==8 and sum((t.get('damage') or 0)*(t.get('repeats') or 1) for t in x['combat']['enemies'][0]['intents'])==32 for x in q))
# Check the complete historical Fishing Rod support set, without using other characters.
rod=next(e for e in E['entries'] if e['id']=='silent-fishing-rod-random-upgrade');hist=[]
for run in rod['evidence']:
 states=[json.loads(x)['state'] for x in (O/run/'states.jsonl').open()];count=0
 for f in [f for f in A['fights'] if f['run']==run and f['type'] in ['Monster','Unknown']]:
  ss=[s for s in states if s['run']['floor']==f['floor']];c=[s for s in ss if s['screen']=='COMBAT' and s.get('combat')];
  if not c or not any(r['relic_id']=='FISHING_ROD' for r in c[0]['run']['relics']):continue
  count+=1;after=next((s for s in ss if s['screen']=='REWARD'),None)
  if after:
   old=sum(bool(x['upgraded']) for x in c[0]['run']['deck']);new=sum(bool(x['upgraded']) for x in after['run']['deck']);delta=new-old
   check(run+'钓鱼竿序号'+str(count),delta==int(count%3==0))
   if delta:hist.append(dict(run=run,asc=R[run]['ascension'],floor=f['floor'],ordinary=count,upgrades=delta))
check('钓鱼竿6局17次',len(hist)==17 and len({x['run'] for x in hist})==6)
for e in E['entries']:
 if e['status']!='active':continue
 check(e['id']+'支持数字/角色/置信度',e['n_support']==len(set(e['evidence'])) and all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']))
 if e['scope'].split(':')[0] in ['card','relic','potion','event']:check(e['id']+'中文name',bool(e.get('name')))
 check(e['id']+'反例数',len(e.get('contradicting',[]))==e['n_contradict'])
active=[e for e in E['entries'] if e['status']=='active'];check('预算未动且总字低于55000',sum(len(e['lesson']) for e in active)<55000)
others=[]
for p in sorted((ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json')):
 if p.name=='experience.json':continue
 d=json.load(open(p));others.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),fields=list(d)[:14],note='生成统计/模型/证据，与当前日志截止不同不直接判冲突；本局未到其他幕，未修改手写知识。'))
(O/'other-knowledge.json').write_text(json.dumps(others,ensure_ascii=False,indent=2)+'\n');(O/'rod-history.json').write_text(json.dumps(hist,ensure_ascii=False,indent=2)+'\n');(O/'numbers-checked.json').write_text(json.dumps(dict(checks=checks,n=len(checks),new_fights=F),ensure_ascii=False,indent=2)+'\n');print('原帧/历史/经验校验通过',len(checks))
