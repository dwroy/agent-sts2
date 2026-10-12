import json,collections,hashlib,bisect,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='JBX9JLH46KVN'
sys.path.insert(0,str(ROOT/'learner/runs/20261009-114302-postmortem'))
from analyze import S,D,A as SL
raw={s['_line']:s['state'] for s in S};ds={d['_line']:d for d in D}
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};checks=[]
def check(n,b):
 assert b,n
 checks.append(n)
def pw(e):return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def foe(s):return s['combat']['enemies'][0]
fights=[f for f in A['fights'] if f['run']==N]
check('22独立房/1实际死',[f['loss'] for f in fights]==[9,7,0,0,10,16,0,15,0,2,13,13,49,26,2,4,3,14,34,1,70,8] and sum(f['death'] for f in fights)==1)
check('三幕七房耗84',sum(f['loss'] for f in fights if f['floor'] in [35,36,38,39,43,45,46])==84)
check('6休息实回166',sum(x['after']-x['before'] for x in A['rests'] if x['run']==N)==166)
check('跨幕两对80%',raw[319759]['run']['current_hp']==71 and raw[319970]['run']['current_hp']==9 and 9+(80-9)*80//100==65)
cards=[c for c in A['cards'] if c['run']==N];final=[c for c in cards if (c['floor'],c['attempt']) in [(48,5),(49,6)]]
def card(key,f,t):return next(x for x in final if x['card']==key and x['floor']==f and x['turn']==t)
check('两步法6敏',card('FOOTWORK',48,2)['after']['powers']['DEXTERITY_POWER']==3 and card('FOOTWORK',48,5)['after']['powers']['DEXTERITY_POWER']==6)
check('蜃景20毒6敏26挡',card('MIRAGE',48,7)['before']['enemies'][0]['powers']['POISON_POWER']==20 and card('MIRAGE',48,7)['after']['block']==26)
x=card('OUTBREAK',48,8);check('毒爆20加12三结93',x['before']['enemies'][0]['hp']-x['after']['enemies'][0]['hp']==93 and x['after']['enemies'][0]['powers']['POISON_POWER']==29)
check('下一毒结84合177',raw[320564]['combat']['enemies'][0]['current_hp']==62 and 239-62==93+29+28+27)
check('胜轮持牌9仍损9',raw[320566]['run']['current_hp']==17 and raw[320567]['run']['current_hp']==8)
check('第二boss清前战能力',not raw[320570]['combat']['player']['powers'])
check('技能逐次+3',[pw(foe(raw[x])).get('STRENGTH_POWER',0) for x in [320615,320616,320617,320618,320620]]==[0,3,6,9,12])
check('能力药不加力',[pw(foe(raw[x]))['STRENGTH_POWER'] for x in [320625,320626,320627]]==[15,15,15])
check('旧挡不倒补',raw[320626]['combat']['player']['block']==raw[320627]['combat']['player']['block']==8 and pw(raw[320627]['combat']['player'])['DEXTERITY_POWER']==5)
check('翻滚当前9未来9',card('DODGE_AND_ROLL',49,2)['after']['block']==17 and card('DODGE_AND_ROLL',49,2)['after']['powers']['BLOCK_NEXT_TURN_POWER']==9)
check('末需损8存活差1',raw[320628]['run']['current_hp']==8 and foe(raw[320628])['intents'][0]['total_damage']==25 and 25-17==8 and raw[320629]['run']['current_hp']==0)
check('卷轴22挡对24/上限降2',raw[320006]['combat']['player']['block']==22 and sum(i.get('total_damage') or 0 for e in raw[320006]['combat']['enemies'] for i in e['intents'])==24 and raw[320007]['run']['max_hp']==78 and raw[320006]['run']['max_hp']==80)
check('毒药7到13/不扣512血',pw(foe(raw[320529]))['POISON_POWER']==7 and pw(foe(raw[320530]))['POISON_POWER']==13 and foe(raw[320529])['current_hp']==foe(raw[320530])['current_hp']==512)
T=[s['ts'] for s in S];alchemy=[]
slots=lambda s:[p.get('potion_id') for p in s['run'].get('potions',[]) if p.get('occupied')]
for d in D:
 if (d.get('expect') or {}).get('card',{}).get('id')=='ALCHEMIZE':
  i=bisect.bisect_left(T,d['ts']);a,z=S[i]['state'],S[i+1]['state'];alchemy.append({'line':d['_line'],'floor':d['floor'],'attempt':d.get('sl_attempt') or 1,'turn':d['turn'],'before':slots(a),'after':slots(z),'hp_before':a['run']['current_hp'],'hp_after':z['run']['current_hp']})
check('炼制16施放14入槽2满槽无变',len(alchemy)==16 and sum(len(x['after'])>len(x['before']) for x in alchemy)==14 and [x['floor'] for x in alchemy if x['after']==x['before']]==[38,43] and all(x['hp_before']==x['hp_after'] for x in alchemy))
(O/'alchemy-parameters.json').write_text(json.dumps(alchemy,ensure_ascii=False,indent=2)+'\n')
comparisons=[]
for floor in [48,49]:
 aa=[a for a in SL if a['floor']==floor];orders=[a['draws']['order'] for a in aa];prefix=0
 for xs in zip(*orders):
  if len(set(xs))>1:break
  prefix+=1
 lines=[]
 for a in aa:
  dd=[d for d in D if d['floor']==floor and (d.get('sl_attempt') or 1)==a['attempt'] and d['screen']=='COMBAT']
  lines.append({'attempt':a['attempt'],'result':a['result'],'turns':a['turns'],'draws':a['draws'],'explore':a.get('explore'),'sl_explore_decisions':[{'line':d['_line'],'turn':d['turn'],'rationale':d['rationale']} for d in dd if 'SL explore' in d['rationale']],'plays':[{'line':d['_line'],'turn':d['turn'],'card':(d.get('expect') or {}).get('card',{}).get('id'),'potion':(d.get('expect') or {}).get('potion',{}).get('id'),'chosen':d['chosen']} for d in dd]})
 comparisons.append({'run':N,'floor':floor,'fights':1,'attempts':len(aa),'wins':sum(a['result']=='won' for a in aa),'same_prefix':prefix,'attempt_details':lines,'limitation':'同资源及已记录抽序前缀，不等后续生成药水/抽弃受控；胜败差异多处变化，不确定单因。'})
check('两场重打11试1赢',sum(x['attempts'] for x in comparisons)==11 and sum(x['wins'] for x in comparisons)==1)
(O/'sl-comparisons.json').write_text(json.dumps(comparisons,ensure_ascii=False,indent=2)+'\n')
param=[]
for c in C:
 e=c['after'];ev=e['evidence'];check(e['id']+'去重',len(set(ev))==e['n_support']);check(e['id']+'反例字段',len(e.get('contradicting',[]))==e['n_contradict'])
 for r in ev+e.get('contradicting',[]):check(e['id']+':'+r+'角色',R[r]['character'].lower()=='silent' and json.loads((O/r/'states.jsonl').open().readline())['state']['run']['character_id'].lower()=='silent')
 typ,key=e['scope'].split(':',1)
 cases=[x for x in A['cards'] if x['run'] in ev and x['card']==key] if typ=='card' else [x for x in A['potions'] if x['run'] in ev and (x.get('potion') or {}).get('id')==key] if typ=='potion' else [x for x in A['fights'] if x['run'] in ev and (typ not in ['boss','hallway','elite'] or key in x['enemies'])]
 param.append({'entry':e['id'],'support':e['n_support'],'contradict':e['n_contradict'],'asc':dict(collections.Counter(R[r]['ascension'] for r in ev)),'evidence':ev,'contradicting':e.get('contradicting',[]),'actions_or_rooms':len(cases),'parameter_runs':len({x['run'] for x in cases}),'parameter_cases':cases if typ in ['card','potion'] else []})
B=json.load(open(O/'experience-before.json'));E=json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'))
check('未改条目全等',all(e==next(x for x in B['entries'] if x['id']==e['id']) for e in E['entries'] if e['id'] not in {c['id'] for c in C}))
other=[];prev={r['file']:r for r in json.load(open(O.parent/'20261009-111625-experience-update/other-knowledge.json'))}
for p in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
 if p.name=='experience.json':continue
 key=str(p.relative_to(O.parents[2]));x=json.load(open(p));sha=hashlib.sha256(p.read_bytes()).hexdigest();other.append({'file':key,'sha256':sha,'same_as_previous':sha==prev[key]['sha256'],'keys':list(x)[:20],'assessment':'逐份核对生成统计自有截止/分母和双boss适用限制，无与实帧冲突的手写知识；模型模拟值非实测血价，不覆盖并行刷新。'})
for p in (O/'slice-knowledge-before').rglob('*.json'):
 rel=p.relative_to(O/'slice-knowledge-before')
 if str(rel)=='characters/silent/experience.json':continue
 check('切片其他数据不变:'+str(rel),(O.parents[2]/'knowledge'/rel).read_bytes()==p.read_bytes())
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n');(O/'mechanism-evidence.json').write_text(json.dumps(param,ensure_ascii=False,indent=2)+'\n')
(O/'verification.json').write_text(json.dumps({'checks':len(checks),'passed':checks,'sl_prefixes':[(x['floor'],x['same_prefix']) for x in comparisons]},ensure_ascii=False,indent=2)+'\n');print('核验通过',len(checks),'SL共同抽序前缀',[(x['floor'],x['same_prefix']) for x in comparisons])
