import bisect, collections, hashlib, json
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
RUN = 'Z91JN3S3PQX2'
A = json.load(open(O/'audit.json'))
E = json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
S = [json.loads(l)['state'] for l in (O/RUN/'states.jsonl').open()]
checks = []
def check(label, ok):
    assert ok, label
    checks.append(label)
def powers(entity): return {p['power_id']:p['amount'] for p in entity.get('powers',[])}
def round_states(floor, turn): return [s for s in S if s['run']['floor']==floor and s.get('turn')==turn and s.get('combat')]
def enemy(s): return s['combat']['enemies'][0]
def intent(s): return sum((i.get('damage') or 0)*(i.get('hits') or 1) for e in s['combat']['enemies'] for i in e['intents'])
F = [f for f in A['fights'] if f['run']==RUN]
check('新13独立房/十二胜一实死', len(F)==13 and sum(f['death'] for f in F)==1)
check('逐房净损', [f['loss'] for f in F]==[1,1,3,4,-1,1,1,42,-1,22,19,3,79])
check('十二胜净耗95',sum(f['loss'] for f in F if not f['death'])==95)
rests=[r for r in A['rests'] if r['run']==RUN]
gains=[r['after']-r['before'] for r in rests if r['after']>r['before']]
check('五火实回113/三锻造无回',len(rests)==8 and gains==[21,22,23,23,24] and sum(gains)==113)
check('进场资源闭合',56-95+113-29+34==79)
check('所有新状态均本角色本局',all(s['run']['character_id'].lower()=='silent' and s['run_id']==RUN for s in S))
attempts=[x for x in A['attempts'] if x['run']==RUN]
check('没有实际重打/恢复',[(x['floor'],x['attempt'],x['result']) for x in attempts]==[(17,1,'won'),(33,1,'died')])
q=round_states(33,2)
check('尖啸T2无弱双击18→6',intent(q[0])==18 and intent(q[-1])==6 and not powers(enemy(q[0])).get('WEAK_POWER'))
check('尖啸后钨棍实损4/下一轮力恢复',q[-1]['run']['current_hp']-round_states(33,3)[0]['run']['current_hp']==4 and not powers(enemy(round_states(33,3)[0])).get('PIERCING_WAIL_POWER'))
check('三逃离续3但实损16',powers(enemy(round_states(33,6)[0]))['SANDPIT_POWER']==1 and powers(enemy(round_states(33,6)[-1]))['SANDPIT_POWER']==4 and round_states(33,7)[0]['run']['current_hp']==56)
check('步法T7才建3敏/零挡损24',powers(round_states(33,7)[-1]['combat']['player'])['DEXTERITY_POWER']==3 and round_states(33,7)[-1]['combat']['player']['block']==0 and round_states(33,8)[0]['run']['current_hp']==32)
check('滚石T9建10未当步伤害',powers(round_states(33,9)[-1]['combat']['player'])['ROLLING_BOULDER_POWER']==10)
windows=[]
for t,damage,layer in [(10,10,15),(11,15,20),(12,20,25),(13,25,30)]:
    a=round_states(33,t-1)[-1];z=round_states(33,t)[0]
    expected=damage+t+(6 if t==13 else 0)
    check('轮初滚石/抱抱/上一轮毒合核T'+str(t),enemy(a)['current_hp']-enemy(z)['current_hp']==expected and powers(z['combat']['player'])['ROLLING_BOULDER_POWER']==layer)
    windows.append(dict(turn=t,rolling=damage,struggles=t,prior_poison=6 if t==13 else 0,observed_net=expected))
check('四次滚石70/抱抱46',sum(w['rolling'] for w in windows)==70 and sum(w['struggles'] for w in windows)==46)
last=round_states(33,13);a=last[-2];z=last[-1]
check('末行动17血8挡/26双击/沙坑1',a['run']['current_hp']==17 and a['combat']['player']['block']==8 and intent(a)==26 and powers(enemy(a))['SANDPIT_POWER']==1)
check('仅攻击预算需16可余1',(13-8-1)+(13-1)==16 and 17-16==1)
check('实际沙坑归零死/挡仍8/毒结5/敌45',z['run']['current_hp']==0 and z['combat']['player']['block']==8 and not powers(enemy(z)).get('SANDPIT_POWER') and enemy(a)['current_hp']==50 and enemy(z)['current_hp']==45)
check('巨兽末轮两防御各8挡16',any(s['combat']['player']['block']==16 and intent(s)==33 for s in round_states(17,11)))
newcards=[x for x in A['cards'] if x['run']==RUN]
check('步法实建delta3',len([x for x in newcards if x['card']=='FOOTWORK'])>=2 and all(x['after']['powers'].get('DEXTERITY_POWER',0)-x['before']['powers'].get('DEXTERITY_POWER',0)==3 for x in newcards if x['card']=='FOOTWORK'))
afterimage=[x for x in newcards if x['card']=='AFTERIMAGE']
check('能力药生余像且实际建立',len(afterimage)==1 and afterimage[0]['floor']==12 and afterimage[0]['after']['powers'].get('AFTERIMAGE_POWER')==1)
potions=[x for x in A['potions'] if x['run']==RUN]
decisions=[json.loads(l) for l in (O/RUN/'decisions.jsonl').open()]
drinks=[d for d in decisions if (d.get('chosen') or {}).get('action')=='use_potion']
check('九completed饮用另一次pending能力药实效',len(potions)==9 and len(drinks)==10 and len([d for d in drinks if not d['result'].startswith('completed')])==1)
raw=[json.loads(l) for l in (O/RUN/'states.jsonl').open()]
stamps=[s['ts'] for s in raw]
for ident in ['POWER_POTION','CURE_ALL']:
    d=next(d for d in drinks if (d.get('expect',{}).get('potion') or {}).get('id')==ident)
    i=bisect.bisect_left(stamps,d['ts']);a=raw[i]['state'];z=raw[i+1]['state']
    if ident=='POWER_POTION':check('pending能力药槽移除并选择余像',a['run']['potions'][0]['potion_id']=='POWER_POTION' and z['run']['potions'][0]['potion_id'] is None and any(c['card_id']=='AFTERIMAGE' for c in raw[i+2]['state']['combat']['hand']))
    else:check('新痊愈能1/抽2/HP不变',z['combat']['player']['energy']==a['combat']['player']['energy']+1 and len(z['combat']['hand'])==len(a['combat']['hand'])+2 and z['run']['current_hp']==a['run']['current_hp'])
for ident,delta in [('DEXTERITY_POTION',2),('FYSH_OIL',1)]:
    x=next(x for x in potions if (x.get('potion') or {}).get('id')==ident)
    check(ident+'实际加敏',x['after']['powers'].get('DEXTERITY_POWER',0)-x['before']['powers'].get('DEXTERITY_POWER',0)==delta)
    if ident=='FYSH_OIL':check('异鱼油另加1力',x['after']['powers'].get('STRENGTH_POWER',0)-x['before']['powers'].get('STRENGTH_POWER',0)==1)
for scope,power,delta in [('card:FOOTWORK','DEXTERITY_POWER',{2,3}),('card:ROLLING_BOULDER','ROLLING_BOULDER_POWER',{5,10}),('card:AFTERIMAGE','AFTERIMAGE_POWER',{1}),('card:PIERCING_WAIL','unused',set())]:
    entry=next(e for e in E['entries'] if e['scope']==scope and e['status']=='active')
    observations=[x for x in A['cards'] if x['run'] in entry['evidence'] and x['card']==scope.split(':')[1]]
    valid=[];exceptions=[]
    for x in observations:
        if scope=='card:PIERCING_WAIL':
            changes=[b['powers'].get('STRENGTH_POWER',0)-a['powers'].get('STRENGTH_POWER',0) for a,b in zip(x['before']['enemies'],x['after']['enemies'])]
            ok=any(d in [-6,-8] for d in changes)
        else:ok=x['after']['powers'].get(power,0)-x['before']['powers'].get(power,0) in delta
        (valid if ok else exceptions).append(dict(run=x['run'],floor=x['floor'],turn=x['turn'],ts=x['ts']))
    check(scope+'实帧支持新局',any(x['run']==RUN for x in valid))
    (O/(scope.split(':')[1].lower()+'-history.json')).write_text(json.dumps(dict(valid=valid,exceptions=exceptions,n_support=entry['n_support'],note='动作增量核验不扩大整条支持局数；重放/制品/退出等例外窗口单列，不当整条反例。'),ensure_ascii=False,indent=2)+'\n')
for ident in ['DEXTERITY_POTION','POISON_POTION','CURE_ALL']:
    entry=next(e for e in E['entries'] if e['scope']=='potion:'+ident)
    xs=[x for x in A['potions'] if x['run'] in entry['evidence'] and (x.get('potion') or {}).get('id')==ident]
    for x in xs:
        if ident=='DEXTERITY_POTION':check(ident+x['ts'],x['after']['powers'].get('DEXTERITY_POWER',0)-x['before']['powers'].get('DEXTERITY_POWER',0)==2)
        elif ident=='CURE_ALL':check(ident+x['ts'],x['after']['energy']-x['before']['energy']==1 and x['after']['hp']==x['before']['hp'])
        else:
            i=x['chosen'].get('target_index',0);a=next(e for e in x['before']['enemies'] if e['index']==i);z=next(e for e in x['after']['enemies'] if e['index']==i)
            d=z['powers'].get('POISON_POWER',0)-a['powers'].get('POISON_POWER',0)
            check(ident+x['ts'],d in [0,6,7] and a['hp']==z['hp'] and (d!=0 or a['powers'].get('ARTIFACT_POWER',0)-z['powers'].get('ARTIFACT_POWER',0)==1))
    (O/(ident.lower()+'-history.json')).write_text(json.dumps(dict(drinks=len(xs),runs=len({x['run'] for x in xs}),observations=xs),ensure_ascii=False,indent=2)+'\n')
for e in E['entries']:
    check(e['id']+'证据数字/角色',len(set(e['evidence']))==e['n_support'] and all(r in R and R[r]['character'].lower()=='silent' for r in e['evidence']))
    check(e['id']+'反例数字',len(e.get('contradicting',[]))==e['n_contradict'])
    check(e['id']+'scope',e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event'])
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:check(e['id']+'中文名',bool(e.get('name')))
check('预算小于55000',sum(len(e['lesson']) for e in E['entries'] if e['status']=='active')<55000)
others=[]
for p in sorted((ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*')):
    if not p.is_file() or p.name=='experience.json':continue
    obj=json.load(p.open()) if p.suffix=='.json' else None
    others.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),fields=list(obj)[:12] if isinstance(obj,dict) else [],note='生成统计/模型/证据，截止点与模型口径另核；未发现需要改写的手写知识。'))
(O/'other-knowledge.json').write_text(json.dumps(others,ensure_ascii=False,indent=2)+'\n')
(O/'numbers-checked.json').write_text(json.dumps(dict(n=len(checks),checks=checks,windows=windows,new_fights=F),ensure_ascii=False,indent=2)+'\n')
print('原帧、历史、字段校验通过',len(checks))
