import collections,json,hashlib,bisect
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='XZUJR08FW801';PM=ROOT/'learner/runs/20261009-104301-postmortem'
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};checks=[]
def check(n,b):
 assert b,n
 checks.append(n)
S=[json.loads(s) for s in (O/N/'states.jsonl').open()];D=[json.loads(s) for s in (O/N/'decisions.jsonl').open()]
raw={r['_line']:r['state'] for r in (json.loads(s) for s in (PM/(N+'-states.jsonl')).open())}
new=[f for f in A['fights'] if f['run']==N]
check('14独立房、1实死、SL一房',len(new)==14 and sum(f['death'] for f in new)==1)
check('14房净损136',[f['loss'] for f in new]==[1,1,0,5,5,7,27,0,44,0,0,23,18,5])
check('全程资源闭合',56+42+49-11-sum(f['loss'] for f in new)==0)
check('前三SL同5血双原药',all(raw[a]['run']['current_hp']==raw[z]['run']['current_hp']==5 and raw[a]['run']['potions']==raw[z]['run']['potions'] for a,z in [(319507,319508),(319519,319520),(319530,319531)]))
check('完成表4饮0污浊',[x['potion']['id'] for x in A['potions'] if x['run']==N]==['CLARITY','STABLE_SERUM','MAZALETHS_GIFT','WEAK_POTION'])
for a,z,g in [(319230,319231,21),(319296,319297,21),(319348,319349,49)]:check('回复'+str(a),raw[z]['run']['current_hp']-raw[a]['run']['current_hp']==g)
def pw(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def enemy(s,key):return next(e for e in s['combat']['enemies'] if e['enemy_id']==key)
def damage(e):return sum(i.get('total_damage') or 0 for i in e['intents'])
cards=[x for x in A['cards'] if x['run']==N]
check('黑暗镣铐两次完整施放',all(any(x['card']=='DARK_SHACKLES' and x['floor']==f and x['turn']==t for x in cards) for f,t in [(17,9),(25,5)]))
for f,t,b,a in [(17,9,12,3),(25,5,15,8)]:
 x=next(x for x in cards if x['floor']==f and x['turn']==t and x['card']=='DARK_SHACKLES');target=x['target'];be=next(e for e in x['before']['enemies'] if e['index']==target);af=next(e for e in x['after']['enemies'] if e['index']==target)
 check('临时减9力'+str(f),be['powers'].get('STRENGTH_POWER',0)-af['powers']['STRENGTH_POWER']==9 and sum(i.get('total_damage') or 0 for i in be['intents'])==b and sum(i.get('total_damage') or 0 for i in af['intents'])==a)
check('实际5饮且无污浊',len([d for d in D if (d.get('chosen') or {}).get('action')=='use_potion'])==5 and sum(bool(p.get('potion_id')) for p in raw[319145]['run']['potions'])==1 and raw[319144]['run']['potions']!=raw[319145]['run']['potions'])
opening={}
for x in S:
 s=x['state']
 if s['run']['floor']==17 and (s.get('combat') or {}).get('action_readiness',{}).get('can_use_combat_actions'):opening.setdefault(s['turn'],s)
check('墨影逐轮毒3至19',[pw(enemy(opening[t],'VANTOM')).get('POISON_POWER',0) for t in range(2,11)]==list(range(3,20,2)))
check('临时力量恢复',pw(enemy(opening[10],'VANTOM'))['STRENGTH_POWER']==4 and damage(enemy(opening[10],'VANTOM'))==22)
check('卵孵化窗口',pw(enemy(raw[319477],'TOUGH_EGG'))['WEAK_POWER']==3 and pw(enemy(raw[319477],'TOUGH_EGG'))['HATCH_POWER']==1 and not any(p in pw(enemy(raw[319478],'TOUGH_EGG')) for p in ['WEAK_POWER','HATCH_POWER']))
check('幼虫攻击窗口无弱',all(e['current_hp']==20 and e['max_hp']==23 and not pw(e).get('WEAK_POWER') and damage(e)==5 for e in raw[319479]['combat']['enemies'] if e['enemy_id']=='TOUGH_EGG'))
end=raw[319546];dead=raw[319547]
check('末轮3覆甲10挡20攻',end['run']['current_hp']==5 and end['combat']['player']['block']==10 and pw(end['combat']['player'])['PLATING_POWER']==3 and sum(damage(e) for e in end['combat']['enemies'])==20)
check('需损7与死亡截断5分列',20-10-3==7 and dead['run']['current_hp']==0 and {(e['enemy_id'],e['current_hp']) for e in dead['combat']['enemies']}=={('THE_OBSCURA',67),('PARAFRIGHT',15)})
check('末雾2本轮不加毒',pw(end['combat']['player'])['NOXIOUS_FUMES_POWER']==2 and pw(enemy(end,'THE_OBSCURA'))['POISON_POWER']==6 and pw(enemy(dead,'THE_OBSCURA'))['POISON_POWER']==5)
check('新局无玩家力敏',not any(pw(s['state']['combat']['player']).get(k) for s in S if s['state'].get('combat') and s['state']['run']['floor'] in [25,27,29] for k in ['STRENGTH_POWER','DEXTERITY_POWER']))
sl=[x for x in A['attempts'] if x['run']==N and x['floor']==29];check('F29四试0赢',len(sl)==4 and [x['result'] for x in sl]==['predicted_death']*3+['died'])
check('28脑实际Codex',len([d for d in D if d.get('deepseek') and not d['deepseek'].get('reused')])==28 and all(d['deepseek']['brain']['engine']=='codex' for d in D if d.get('deepseek') and not d['deepseek'].get('reused')))
check('无DS推理',not (O/N/'deepseek-reasoning.jsonl').read_text())
param=[]
for c in C:
 e=c['after'];ev=e['evidence'];check(e['id']+'去重',len(set(ev))==e['n_support']);check(e['id']+'字段',len(e.get('contradicting',[]))==e['n_contradict'])
 for r in ev+e.get('contradicting',[]):check(e['id']+':'+r+'角色',R[r]['character'].lower()=='silent' and json.loads((O/r/'states.jsonl').open().readline())['state']['run']['character_id'].lower()=='silent')
 typ,key=e['scope'].split(':',1)
 cases=[x for x in A['cards'] if x['run'] in ev and x['card']==key] if typ=='card' else [x for x in A['potions'] if x['run'] in ev and (x.get('potion') or {}).get('id')==key] if typ=='potion' else [x for x in A['fights'] if x['run'] in ev and (typ not in ['boss','hallway','elite'] or key in x['enemies'])]
 param.append({'entry':e['id'],'support':e['n_support'],'contradict':e['n_contradict'],'asc':dict(collections.Counter(R[r]['ascension'] for r in ev)),'evidence':ev,'contradicting':e.get('contradicting',[]),'actions_or_rooms':len(cases),'parameter_runs':len({x['run'] for x in cases}),'parameter_cases':cases if typ in ['card','potion'] else []})
check('未改条目逐项保持',all(e==next(x for x in json.load(open(O/'experience-before.json'))['entries'] if x['id']==e['id']) for e in json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'))['entries'] if e['id'] not in {c['id'] for c in C}))
(O/'mechanism-evidence.json').write_text(json.dumps(param,ensure_ascii=False,indent=2)+'\n')
other=[];prev={r['file']:r for r in json.load(open(O.parent/'20261009-104303-experience-update/other-knowledge.json'))}
for p in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
 if p.name=='experience.json':continue
 key=str(p.relative_to(O.parents[2]));x=json.load(open(p));sha=hashlib.sha256(p.read_bytes()).hexdigest();other.append({'file':key,'sha256':sha,'same_as_previous':sha==prev[key]['sha256'],'keys':list(x)[:20],'assessment':'生成统计/模型自有截止与分母；双boss文件仅silent已观察A10。未见本局冲突手写知识，不以房净损覆盖模型校准或并行刷新。'})
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps({'checks':len(checks),'raw_checks':len(json.load(open(O/'raw-verification.json'))),'passed':checks},ensure_ascii=False,indent=2)+'\n');print('参数与角色核验',len(checks),'项通过')
