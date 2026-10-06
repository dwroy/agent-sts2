import collections,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json');RUN='VPW8YH7A4QFM';old=json.load(open(O/'experience-before.json'));d=json.load(open(P));E={e['id']:e for e in d['entries']};B={e['id']:e for e in old['entries']};A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))}
assert (O/'mechanisms.json').exists()
append={
'silent-strength-weak-observation':' VPW8YH7A4QFM A10死亡战无玩家力/永久敏；T4双尖啸让三敌42→6、省36当轮威胁，后轮撤负力且电击力2→4、17→19；T6临时2敏在脆弱下防御3→5只多2牌挡，另余像1不归敏捷。',
'silent-afterimage-per-card-block':' VPW8YH7A4QFM A10组装师T4建立本身0挡，其后五牌各1共5＋斗篷4＝9，42被双尖啸降6后零损；T5五触发5＋脆弱生存者6＝11，对25仍损14；T6五触发5＋防御5＝10，5血对21需11、差6，真实被动收益不保整战。',
'silent-accelerant-triggers':' VPW8YH7A4QFM A10 F39 T3建2，电击8血4毒以4+3+1截清、取消19攻击，15挡盖戳刺12零损；本体119→116只扣流星锤3，T4又召电击22，清一次爪牙不保证本体输出或关闭召唤。',
'silent-piercing-wail-temporary-strength':' VPW8YH7A4QFM A10 F39 T4两张普通各−6，三敌12/13/17→0/1/5，合42→6、省36威胁，9挡零损；T5临时负力撤回、电击力2→4、17→19。T2减力后总威胁仍22、零挡实损22，不作永久防御。',
'silent-anticipate-temporary-dexterity':' VPW8YH7A4QFM A10组装师T6无常驻敏，普通建2敏/2临时层，已有3挡→4为余像1；脆弱防御由零敏3到5，施放使4→10为牌挡5＋余像1，敏捷只多2。整轮5余像＋5牌挡＝10仍少6存活血。',
'silent-burst-next-skills-replay':' VPW8YH7A4QFM A10组装师T3普通爆发1层，后空翻两次5挡使5→15、爆发层清；重抽后重问再建触媒毒杀电击而零损。原线尚未执行的第二后空翻不补算，重复收益与整场胜因分核。',
'silent-noxious-fumes-growth':' VPW8YH7A4QFM A10墨影T1实建升级3层、十一轮胜；新战组装师T4升级毒雾在手未施放、全战无该能力，触媒的旧爪牙毒不能算本体已建立毒成长。',
'silent-grand-finale-empty-draw':' VPW8YH7A4QFM A10 F25以三后空翻/逃脱计划/爆发设想取牌，F27复审列移除但未删；F39 T1抽堆33、生成收场牌面60却不可打、全轮无抽牌且贡献0，条件与持有/过牌规划分别核。'
}
for ident,text in append.items():E[ident]['lesson']+=text
rests=json.load(open(O/'rest-summary.json'))[-1];fights=[f for f in A['fights'] if f['asc']==10]
E['silent-route-hp-observation']['lesson']='观察：血档/净损/回复按原首COMBAT→末结算口径，开场遗物与操作损分账，问号不算Monster；不定安全线。68静默局1076房58死；A8一局25房0死、A9三局48房2死、A10二十八局362房28死，完整分档/节点见第56节。A10三幕40–60%走廊6房5局1死=16.67%、活损中位15，≥60%21房10局0死、中位23。典型案例：VPW8YH7A4QFM F37茶38→80，F38首帧80→47损33（开场净损2、操作31），F39首47→0损47（开场净损2、操作45），避精英仍未到下火；替路线未实打，不作因果（n=68）。'
E['silent-rest-buffer-observation']['lesson']=f'观察：已回复增加血池，未来营火与遗物回血不预支。A8一局9火8回血7非回血（帐篷双动作）回111、后战7/0死/中位10；A9三局21火16回血5非回血回341、后战15/1死/中位34；A10二十八局{rests["rests"]}火{rests["heal"]}回血{rests["smith"]}非回血回{sum(rests["gains"])}、去重后战{rests["nexts"]}/{rests["deaths"]}死={100*rests["deaths"]/rests["nexts"]:.2f}%、活损中位{rests["median"]}。典型案例：VPW8YH7A4QFM七火五回血39/39/33/39/37共187、两锻造，F32的43→80后蟹损57至23；三幕茶42回复后两次开场净损4，计划下火未到。未选锻造/不同节点无受控对照（n=68）。'
E['silent-deck-burst-observation']['lesson']='观察：取得/建立/触发/足额输出与新战分核，不以牌数或单组件断因。机制：力逐击、敏逐挡牌，能力须实建并活到触发；额外毒结算按目标/剩血截断，召唤新敌另核。搭配：费用/抽到/初毒/防御和本体输出一起验收。决定胜负的战斗：63支持局，A8一/A9三/A10二十四、低阶仅背景（n=63）。典型案例：ZVYUL2YP3518 A10女王十轮630胜后实验体新212段仅88仍缺124；VPW8YH7A4QFM A10终40张五打击四防御/贪婪/进阶之灾、3升级，未得步法；组装师六轮本体扣36/0/3/11/0/0合50、余105/155，T3触媒毒杀爪牙保血但毒雾/神化/毒性爆发/2力2敏疯狂科学未施放，爪牙再召。T3题面8/8赢样本未兑现，无替卡/目标/构筑实胜，不把组件持有当已成长。'
for clause in re.split(r'(?<=[。；])',B['silent-deck-burst-observation']['lesson']):
 if '药' in clause and clause.strip() not in E['silent-deck-burst-observation']['lesson']:E['silent-deck-burst-observation']['lesson']+=' '+clause.strip()
support=list(append)+['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation']
for ident in support:
 e=E[ident];assert RUN not in e['evidence'];e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
 e['lesson']=re.sub(r'（n=\d+',f'（n={e["n_support"]}',e['lesson'])
 e['lesson']=re.sub(r'\d+支持局',f'{e["n_support"]}支持局',e['lesson'])
 n=e['n_support'];bad=e['n_contradict'];rule=ident=='silent-grand-finale-empty-draw';e['confidence']='high' if (n>=5 and bad<=n/3) or (n>=4 and rule and bad==0) else 'med' if n>=2 else 'low'
new=dict(id='silent-royal-poison-blood-vial-opening-net',scope='relic:ROYAL_POISON',name='王室猛毒',asc=[0,20],lesson='观察：王室猛毒与小血瓶同持时，两场开战在出牌前各净失2血，逐战计入血池。机制：仅有组合前后帧，缺两遗物各自扣/回中间帧及内部顺序，不能拆成独立数值、不能外推缺任一遗物时净值。搭配：实际开场净变化与休息/茶回复分账，未发生的恢复不计当前血。决定胜负的战斗：A10一局两场确认净值，但未有不取遗物的受控胜负（n=1）。典型案例：VPW8YH7A4QFM F37茶38→80，F38开场80→78、操作损31至47；F39开场47→45、T6剩5血10挡对21需11、差6阵亡。更早67静默局未持有本遗物，无可比反例，不归遗物选择唯一败因。',evidence=[RUN],n_support=1,n_contradict=0,confidence='low',last_seen='2026-10-07',status='active')
d['entries'].append(new);d['version']='2026-10-07.2'
changed=[e['id'] for e in d['entries'] if e['id'] in B and e!=B[e['id']]]
for ident in changed:
 olde=B[ident];newe=E[ident]
 assert olde['evidence']==newe['evidence'][:len(olde['evidence'])]
 assert olde.get('contradicting',[])==newe.get('contradicting',[])
 if olde['scope'].startswith('potion:') or olde['scope']=='general:potion':assert olde==newe
 for clause in re.split(r'(?<=[。；])',olde['lesson']):
  if '药' in clause:assert clause.strip() in newe['lesson'],(ident,clause)
active=[e for e in d['entries'] if e['status']=='active'];size=sum(len(e['lesson']) for e in active);assert size<=60000
for e in d['entries']:
 assert e['n_support']==len(set(e['evidence'])) and all(re.fullmatch('[A-Z0-9]{12}',r) and R[r]['character'].lower()=='silent' for r in e['evidence'])
 assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
 if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
summary=dict(old_version=old['version'],version=d['version'],added=[new['id']],updated=changed,support=support,numbers_only=[],compressed_only=[i for i in changed if i not in support],retired=[],before_active=sum(e['status']=='active' for e in old['entries']),active=len(active),before_chars=sum(len(e['lesson']) for e in old['entries'] if e['status']=='active'),chars=size,confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=len([e for e in active if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]},rows=[dict(id=i,before_n=B[i]['n_support'],after_n=E[i]['n_support'],before_chars=len(B[i]['lesson']),after_chars=len(E[i]['lesson'])) for i in changed])
(O/'changes.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');P.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
mechanisms=[E[k] for k in append]+[E['silent-deck-burst-observation'],new]
(O/'mechanism-entries.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k!='rows'},ensure_ascii=False))
