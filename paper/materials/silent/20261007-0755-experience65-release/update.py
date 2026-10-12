import json,collections,re
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');F=ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'
B=json.load(open(O/'experience-before.json'));E=json.loads(json.dumps(B));by={e['id']:e for e in E['entries']};old={e['id']:e for e in B['entries']}
A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};RS=json.load(open(O/'rest-summary.json'));r10=RS[10]
NEW=['02HB4L0C3C67','T3FW7R2R2306'];changed=[]
def put(eid,runs,lesson):
 e=by[eid]
 for run in runs:
  assert R[run]['character'].lower()=='silent'
  if run not in e['evidence']:e['evidence'].append(run)
 e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07';e['lesson']=lesson
 e['n_contradict']=len(e.get('contradicting',[]));n=e['n_support'];c=e['n_contradict']
 e['confidence']='high' if n>=5 and c<=n/3 else 'med' if n>=2 else 'low';changed.append(eid)
put('silent-strength-weak-observation',NEW,old['silent-strength-weak-observation']['lesson'].replace('76支持局','78支持局').replace('(n=76)','(n=78)')+' 典型案例：02HB4L0C3C67 A10佣兵同招力量0/2/4时8×2/10×2/12×2；骇鳗24攻虚弱后18、10挡损8。T3FW7R2R2306 A10异鸟T4的7×3弱后5×3，三段逐段取整，成长未停止。')
put('silent-noxious-fumes-growth',[NEW[1]],old['silent-noxious-fumes-growth']['lesson'].replace('39支持局','40支持局').replace('(n=39)','(n=40)')+' 典型案例：T3FW7R2R2306 A10异鸟T1建2，T2—6结算2/3/4/5/6毒共20、直接攻击57，90血敌仍13；末余5毒不预支。藤蔓T2建、T3—6结算2/3/4/5后过关；毒成长真实，不保证压过敌力量成长。')
put('silent-terror-eel-vigor-vulnerable',[NEW[0]],'骇鳗跨惊叫阈值取消当前攻击，仍须完成剩余击杀。机制：撞击基伤随进阶（A0 {@0:DMG:TERROR_EEL:CRASH_MOVE}、A1 {@1:DMG:TERROR_EEL:CRASH_MOVE}、A10 {@10:DMG:TERROR_EEL:CRASH_MOVE}），活力加到当前攻击后核虚弱/易伤；已见A0/A1阈值70、A10为75，随后恐吓施99易伤。搭配：虚弱/实际挡、剩敌血与可活轮共同验收，不将眩晕当结束。决定胜负的战斗：6支持局，前5场过、本次败，公式成立的败局非反例（n=6）。典型案例：JQPT83P8KDSZ A10九轮需150并赢、净损46；02HB4L0C3C67 A10 T6敌96→72眩晕取消12攻保6血，T8易伤将18→27、15挡需损12，玩家6血死、敵仍36；八轮实扣114不足150，不证明更早越阈值必胜。'.replace('敵','敌'))
put('silent-byrdonis-strength-multihit-observation',[NEW[1]],'观察：领地意识持续存在时力量随轮数增加，防御回合也未停止；具体成长触发条件未隔离。机制：啄击基伤按进阶（A7 {@7:DMG:BYRDONIS:PECK_MOVE}、A10 {@10:DMG:BYRDONIS:PECK_MOVE}）加现场力量后每段核虚弱，三击分别取整；飞扑同核。搭配：已建毒雾/虚弱和牌挡一起核可活轮，毒成长不抵消敌加力。决定胜负的战斗：8支持局7过1死，缺单项胜因对照（n=8）。典型案例：4D4J8USKCPAV A10六轮0—5力量、净损41过关；T3FW7R2R2306 A10同样0—5力量，T2三防御无攻击后仍增力，三击15→21→27；T6已有20已结算毒、敌余13，16血10挡需损17而死，虚弱只减当前攻击。')
f10=[f for f in A['fights'] if f['asc']==10];n10=sum(r['ascension']==10 for r in R.values());deaths=sum(f['death'] for f in f10)
bands={(b['act'],b['type'],b['band']):b for b in A['bands'] if b['asc']==10};lo=bands[(1,'Elite','40–60%')];hi=bands[(1,'Elite','≥60%')]
put('silent-route-hp-observation',NEW,f'观察：先核营火前实际血价，未来回复与改线预测不预支。首COMBAT→同房末结算净损、实死/回复分账、Unknown不算Monster；{len(R)}静默局{len(A["fights"])}房{sum(f["death"] for f in A["fights"])}死。A8一局25/0死、A9三局48/2死；A10 {n10}局{len(f10)}房{deaths}死，一幕精英40–60% {lo["n"]}房{lo["deaths"]}死={100*lo["deaths"]/lo["n"]:.2f}%、≥60% {hi["n"]}房{hi["deaths"]}死={100*hi["deaths"]/hi["n"]:.2f}%，非安全线。典型案例：02HB4L0C3C67首火前五战损52、预计到火44实4；T3FW7R2R2306休息后61血保留精英线而死、飞靴仍3次，另一跳线未实打（n={len(R)}）。')
put('silent-rest-buffer-observation',NEW,f'观察：实际回复增加当前血池，未来火与boss投影不作下一战生命。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10 {n10}局{r10["rests"]}火{r10["heal"]}回血/{r10["smith"]}非回血动作回{sum(r10["gains"])}，去重后战{r10["nexts"]}/{r10["deaths"]}死={100*r10["deaths"]/r10["nexts"]:.2f}%、活损中位{r10["median"]}。典型案例：02HB4L0C3C67两火实回42、两事件付10，36血进骇鳗死；T3FW7R2R2306回21到61仍死于下一精英、F9火未达。源血档节点可指同战，不推拒事件/锻造/跳线必胜（n={len(R)}）。')
put('silent-deck-burst-observation',NEW,'观察：能力建立、当轮保血与整战足额输出分别验收。机制：未取得/未支付的成长收益为0；毒雾已建立则只算已结算毒，不预支未到轮。搭配：能量、抽序、实际可活轮与敌力量增长一起核，单组件未受控。决定胜负的战斗：77支持局，局部收益非整战胜因（n=77）。典型案例：02HB4L0C3C67 A10终17张0升级、未得步法/毒雾，骇鳗八轮实扣114缺36；T3FW7R2R2306 A10毒雾T1实建、T2—6毒20加攻击57仍缺13，敌力0→5。T1护栏保毒雾、省8当轮血少6伤，仍T6死亡，原攻击线未实打，不写保血必赚或原线必胜。')
E['version']='2026-10-07.11';E['_about']='静默经验只来自本角色复盘与日志。第65次增量截至T3FW7R2R2306结束2026-10-06T22:57:51.524Z，82完局；旧80局七数组/血档/节点/回血/SL逐行复算一致。新增11房2死、总1244房72死。骇鳗阈值取消攻击与后段易伤、异鸟逐段力量/虚弱、毒雾实结算、营火前血价及未兑现路线分别核；护栏局部保血非整场因果，中毒模型折扣纯bug不进经验，无新用药规则。'
for e in E['entries']:
 assert len(e['evidence'])==e['n_support'] and len(set(e['evidence']))==e['n_support']
 assert all(len(r)==12 and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
 assert e['n_contradict']==len(e.get('contradicting',[]))
 if e['scope'].startswith(('potion:','general:potion')):assert e==old[e['id']]
 if e['id'] in changed:
  for sentence in re.split(r'(?<=[。；])',old[e['id']]['lesson']):
   if '药' in sentence:assert sentence in e['lesson'],(e['id'],sentence)
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
F.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
C=dict(added=[],updated=changed,retired=[],before_active=sum(e['status']=='active' for e in B['entries']),after_active=len(active),before_chars=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),after_chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={a:dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]},rows=[dict(id=i,n_before=old[i]['n_support'],n_after=by[i]['n_support'],chars_before=len(old[i]['lesson']),chars_after=len(by[i]['lesson'])) for i in changed])
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n');print(C)
