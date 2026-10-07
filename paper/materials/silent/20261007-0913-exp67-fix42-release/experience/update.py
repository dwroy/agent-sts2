import collections,copy,json,re
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');FILE=ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json';RUN='KQQELQSZ382Z'
B=json.load(open(O/'experience-before.json'));E=copy.deepcopy(B);A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};by={e['id']:e for e in E['entries']}
texts={}
for eid in ['silent-strength-weak-observation','silent-piercing-wail-temporary-strength','silent-lagavulin-siphon-poison-sl']:
 e=by[eid];n=e['n_support']+1;text=e['lesson'].replace(str(e['n_support'])+'支持局',str(n)+'支持局').replace('n='+str(e['n_support']),'n='+str(n))
 if eid=='silent-strength-weak-observation':text+=' KQQELQSZ382Z A10族母T7/T11吸取后玩家力/敏各−2/−4，冲刺8伤8挡→6伤6挡、防御仅1、偏折0；负力下蛇咬仍加7毒，毒与卡牌攻防分核。'
 if eid=='silent-piercing-wail-temporary-strength':text+=' KQQELQSZ382Z A10族母末试T5尖啸力0→−6，20双击→8、生存者8挡零损；T6力恢复0、14攻击穿9挡损5。F11精英T4配中和把24双击压8、双防御10挡零损，T5恢复4力后20攻仍损12。'
 if eid=='silent-lagavulin-siphon-poison-sl':
  text=text.replace('真正重打三场18次1赢；新局首试赢不增加重打分母','真正重打四场24次1赢；本局六次零赢')
  text+=' KQQELQSZ382Z A10六次64/75同初24抽序，后抽时点/动作改变；首次蛇咬到手T4/5/4/4/4/4、首次施放T7/6/7/4/7/4，均非沉睡期到手。末试毒结算130＋直接71＝201/233，T13余5血6挡对20需损14、差9而死，敌余32/9毒未兑现；无赢线及受控单卡因果。'
 texts[eid]=text
rest=json.load(open(O/'rest-summary.json'))[-1];fs=[f for f in A['fights'] if f['asc']==10]
assert len(A['runs'])==84 and len(A['fights'])==1265 and sum(x['death'] for x in A['fights'])==74
assert len(fs)==551 and sum(x['death'] for x in fs)==44
texts['silent-route-hp-observation']=f'观察：高血进场与回血路线仍须核敌成长和实际输出，不作胜利保证。首COMBAT→同房末结算净损、实死/回复分账、Unknown不算Monster；84静默局1265房74死。A8一局25/0死、A9三局48/2死；A10 44局551房44死，一幕boss≥60%进场31场5死=16.13%。典型案例：KQQELQSZ382Z A10 F7事件付14后35血、F8回56，F11精英53→26后芝士27，三火回血终64/75、族母六败；没有未选路线或同血不同节点的受控对照（n=84）。'
texts['silent-rest-buffer-observation']=f'观察：实际回血扩大当前血池，不证明足够跨过boss成长窗口。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 44局{rest["rests"]}火{rest["heal"]}回血/{rest["smith"]}非回血动作回{sum(rest["gains"])}，去重后战{rest["nexts"]}/{rest["deaths"]}死={100*rest["deaths"]/rest["nexts"]:.2f}%、活损中位{rest["median"]}。典型案例：KQQELQSZ382Z A10 F8的35→56、F12的27→48、F16的42→64，共回64；末64/75进族母六败，F16原始592模拟样本零胜而校准0.0474，不能读成已有赢样本；未锻造线未实打（n=84）。'
texts['silent-deck-burst-observation']='观察：想要的能力须实际取得建立；短暂减伤与已结算毒不代整场输出。机制：负力/负敏分别压卡牌伤挡，施毒另算；临时减力次轮恢复，可活轮限制毒结算。搭配：保留牌到手时点、能量、实际攻防与敌成长一起核。决定胜负的战斗：79支持局，单卡或替构筑胜因未控（n=79）。典型案例：KQQELQSZ382Z A10原计划增加毒与敏捷，但全局未建玩家正力量/敏捷或能力；族母六次64血均败，末试T3—13毒130加直接71仍缺32，T5尖啸零损不关闭T7/T11吸取，T13的5血6挡对20致死。未取得能力、未执行原线和更早施毒均不计已获收益。'
old={e['id']:e for e in B['entries']}
for eid,text in texts.items():
 e=by[eid]
 for clause in re.split(r'(?<=[。；])',e['lesson']):
  if '药' in clause:assert clause in text,(eid,clause)
 e['lesson']=text;e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
plays=[x for x in A['cards'] if x['card']=='SNAKEBITE']
snake_runs=list(dict.fromkeys(x['run'] for x in plays));assert len(snake_runs)==9 and snake_runs[0]=='KAY522KT5NXR'
for x in plays:
 assert '保留' in x['text']
 n=10 if '10层' in x['text'] else 7
 target=x['target']
 before=next(e for e in x['before']['enemies'] if e['index']==target);after=next(e for e in x['after']['enemies'] if e['index']==target)
 assert after['hp']==before['hp'] and after['powers'].get('POISON_POWER',0)-before['powers'].get('POISON_POWER',0)==n
new=dict(id='silent-snakebite-retained-poison',scope='card:SNAKEBITE',name='蛇咬',asc=[0,20],lesson='蛇咬保留并施毒，不即时扣本体血；施毒不吃玩家负力量。机制：普通/升级实加7/10毒，已见普通基础2费；免费个例不外推来源。毒触发按现层扣后减1、剩血/敌限制另核。搭配：保留只允许到手后等待，须付能量并存活到毒结算；抽序相同不保证同轮到手。决定胜负的战斗：9支持局，普通8局、升级2局有重叠；单卡胜因未控（n=9）。典型案例：KAY522KT5NXR A0 F14 T1牌面0费且能量0不变，加7毒后25→18余6，F15实花2费；VN7RQJMJEFMX A6巨兽升级6→16毒、即时179血不变。KQQELQSZ382Z A10族母末T4/T7各花2费，毒5→12/9→16，末各扣12/16余11/15；首T11负2力量仍加7，六次零赢，末余9毒不预支。',evidence=snake_runs,n_support=len(snake_runs),n_contradict=0,confidence='high',last_seen='2026-10-07',status='active')
E['entries'].append(new);by[new['id']]=new
E['version']='2026-10-07.13';E['_about']='静默经验只来自本角色复盘与日志。第67次增量截至KQQELQSZ382Z结束2026-10-06T23:52:17.960Z，84完局；旧83局七数组/血档/源节点/回血/SL逐行复算一致。新增9房1死，总1265房74死。蛇咬保留施毒与即时血量、普通/升级和免费个例分账；尖啸临时减力、族母吸取、负力/负敏与实际毒窗口复核。六次同开场失败不当独立局或单卡因果，三火实际回复不保证转胜；模型bug分账，不加用药规则。'
def stats(obj):
 aa=[e for e in obj['entries'] if e['status']=='active']
 return dict(active=len(aa),chars=sum(len(e['lesson']) for e in aa),confidence=dict(collections.Counter(e['confidence'] for e in aa)),by_asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in aa),chars=sum(len(e['lesson']) for e in aa if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
for e in E['entries']:
 assert e['n_support']==len(e['evidence']) and e['n_contradict']==len(e.get('contradicting',[]))
 assert all(len(r)==12 and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
 if e['scope'].startswith(('potion:','general:potion')):assert e==old[e['id']]
 if e['id'] not in texts and e['id']!=new['id']:assert e==old[e['id']]
assert stats(E)['chars']<=60000
C=dict(added=[new['id']],updated=list(texts),retired=[],before=stats(B),after=stats(E),rows=[dict(id=i,before_n=old.get(i,{}).get('n_support',0),after_n=by[i]['n_support'],before_chars=len(old.get(i,{}).get('lesson','')),after_chars=len(by[i]['lesson']),evidence_added=[r for r in by[i]['evidence'] if r not in old.get(i,{}).get('evidence',[])]) for i in [*texts,new['id']]])
FILE.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(C,ensure_ascii=False))
