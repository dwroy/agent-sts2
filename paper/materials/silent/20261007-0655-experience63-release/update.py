import json, re, collections, copy
from pathlib import Path

O=Path(__file__).parent
P=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B=json.load(open(O/'experience-before.json')); E=copy.deepcopy(B)
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
S=json.load(open(O/'mechanism-supports.json'))
H='HSX4HYATB4E2'; W='WYB0NCD6W83J'
by={e['id']:e for e in E['entries']}
changed=[]
def confidence(n,c=0):return 'high' if (n>=5 and c<=n/3) or (n>=4 and c==0) else 'med' if n>=2 else 'low'
def update(id,rs,lesson=None,case=None):
    x=by[id]
    for r in rs:
        if r not in x['evidence']:x['evidence'].append(r)
    x['n_support']=len(x['evidence']);x['confidence']=confidence(x['n_support'],x['n_contradict'])
    x['last_seen']='2026-10-07'
    if lesson:x['lesson']=lesson.format(n=x['n_support'])
    else:
        x['lesson']=re.sub(r'\(n=\d+\)',f"(n={x['n_support']})",x['lesson'])
        x['lesson']=re.sub(r'（n=\d+）',f"（n={x['n_support']}）",x['lesson'])
        x['lesson']=re.sub(r'\d+支持局',f"{x['n_support']}支持局",x['lesson'])
        if case:x['lesson']+=' '+case
    changed.append(id)

update('silent-footwork-block',[H],lesson='步法普通/升级建2/3敏捷，逐挡牌兑现，不追补已有挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算。搭配：多张挡牌重复获益，能力须先支付。决定胜负的战斗：{n}支持局，局部挡收益不等整战胜因（n={n}）。典型案例：HSX4HYATB4E2 A10沙漏首试两步法建4敏、防御9；末试仅2敏，T7爆发防御两次各7，加余像两次2、先前1及后两牌2共19挡，2血仍不足26攻加18凋萎。')
update('silent-strength-weak-observation',[H,W],case='典型案例：HSX4HYATB4E2 A10沙漏T1金刚杵1力使撕咬基础每段5→6，两击12；共享成长后第二张每段8、两击16，共28。末T7实扣撕咬24、中和4，不计仍在手的攻击。WYB0NCD6W83J末战无力敏，敌原27血一只力量3→6、攻击到11；1血10挡仍死。')
update('silent-expose-vulnerable',['53FLQ68CETW0',H],lesson='暴露施易伤，并在已验证组合中同一步清敌挡与全部人工制品；清制品不只逐层消耗。机制：普通/升级易伤2/3，随后攻击再核1.5倍与剩血；清挡/制品子机制2局0反例，不拆重放内部顺序。搭配：暴露后施毒可实际启毒，顺序优势不等整战胜线。决定胜负的战斗：易伤及清除合计{n}支持局，单牌胜因未控（n={n}）。典型案例：53FLQ68CETW0 A6沙漏首/第六试T5重放暴露+使33挡/2制品→0/0、6易伤，血不变；HSX4HYATB4E2 A10第二试T2普通暴露使33挡/3制品→0/0、2易伤、498血不变，随后毒9实际扣至483；首试先施毒只消制品、未建毒，两试均败。')
update('silent-maul-shared-growth',[H],case='典型案例：HSX4HYATB4E2 A10沙漏六试均T1先两击12，再共享增2使第二张两击16；1力对四段共多4伤，不能把成长当只加本牌。末试T7已打24，未打的后续每段14不计输出；六次0赢，共享成长真实不等必胜。')
update('silent-rolling-boulder-start-growth',[H],case='典型案例：HSX4HYATB4E2 A10仪式兽T2建立5，T3—9轮初实际5/10/15/20/25/30/31（末按剩血截断），合136；沙虫胜试T1建5，T2—8轮初5/10/15/20/25/30/35合140，另开场9与行动及毒192共341。沙漏六试均未施放滚石，贡献0，不能预支牌组能力。')
update('silent-burst-next-skills-replay',[H],case='典型案例：HSX4HYATB4E2 A10沙漏末T7仅2敏/1余像，爆发本身补1、防御本体7重放7且余像各1，使挡1→17；再两牌到19。普通重复下一技能，不把两次防御当两张原始牌，末2血仍死。')
update('silent-afterimage-per-card-block',[H],case='典型案例：HSX4HYATB4E2 A10沙漏末T5建立本身0挡，双尖啸各补1合2；T7爆发1、重放防御两次各1、撕咬与中和各1合5，被动5加敏捷防御14得19。按实际施放次数而非撕咬两段算挡。')
update('silent-piercing-wail-temporary-strength',[H],case='典型案例：HSX4HYATB4E2 A10沙漏末T5双尖啸令4→−2→−8力、26→8攻；余像仅2挡，另6凋萎，14→2实损12。T6恢复4力、T7成长9，中和后仍26，不把临时减力当永久关成长。')
update('silent-beating-remnant-loss-cap',[H],lesson='律动残余截断一回合失血20，不回血，不保证少于20血时存活。机制：攻击/挡/持牌惩罚与20上限分别核，死亡实际扣血又受剩余HP截断。搭配：已建格挡和实际毒结算一起核，未来轮不预支。决定胜负的战斗：{n}支持局、0反例，局部限损非安全血线（n={n}）。典型案例：1HC609GTLGN3 A0零挡对22/28各实损20、后来1血仍死；HSX4HYATB4E2 A10沙漏六试T1零挡对26均39→19，末T7的26攻+18凋萎−19挡=25、限损20仍超过2血，实扣2死亡。')
update('silent-wither-end-turn-loss',[H],case='典型案例：HSX4HYATB4E2 A10沙漏凋萎3→6→9按现场持牌核；末T7两张各9、26攻击与19挡，未限损完整需25、律动残余限20仍差18血，实际2→0，毒13结算后敌377；不由死亡截断称仅受2伤或补造致死先后。')
update('silent-aeonglass-artifact-growth-sl',[H],lesson='观察：沙漏制品、敌成长、格挡、凋萎和实际启毒一起核，血池及持有能力不保过关。机制：暴露已见可同时清挡/制品，其他施毒被制品阻挡；临时减力不关成长，状态伤另计。搭配：只算已建毒/敏捷及活到的结算，不预支滚石。决定胜负的战斗：13局56试3赢，真正重打11场54试2赢，A10五场30试0赢（n={n}）。典型案例：HSX4HYATB4E2 A10六试均39/87，首/第二T2先施毒/先暴露，T3敌498/483；末扣158余377，前五T7/7/5/5/7判死、末T7实死。首与末初始39项抽序同但到手轮/动作变；第二/第四T4同19血445敌血，三防御损2扣7，换线损16扣48，多付14血多打41、下一轮3血判死，无同抽胜线或单因对照。')
update('silent-insatiable-dual-clock',[H],lesson='沙虫的沙坑与攻击分别核，延长沙坑不等挡攻击；未来能力/毒不预支。机制：沙坑归零判死、逃离实加1，毒在真实结算扣血，滚石仅已建后的轮初贡献。搭配：当前来袭、血池和输出窗口共同验收。决定胜负的战斗：11支持局32试8赢，真正重打7场28试4赢，单组件胜因未控（n={n}）。典型案例：HSX4HYATB4E2 A10三试均30血、初28项抽序同，首T1未建滚石、第2/胜试T1建5，首两次T6以12/18血对12/24判死，末T8行动及毒结束余1。胜试滚石实扣140、开场9另计、行动与毒192合341；与第二试还改变施毒/防御等动作，不能单归滚石或运气。')
update('silent-construct-artifact-growth',[H],case='典型案例：HSX4HYATB4E2 A10 F43两试33血，首T3判死、重打T4余2胜；T1施毒目标由两方柱转拳击，后续动作与原始抽序也变，分别2次1赢，无同抽单目标胜因；去制品/施毒/方柱后轮力量分账。')
update('silent-deadly-poison-application',[H,W],case='典型案例：WYB0NCD6W83J A10花园T8原28血敌已余4/5毒，实际仅扣4取消其21攻击，另敌11攻击对10挡仍杀1血；不能按5全扣或毒杀一只认定全场斩杀。HSX4HYATB4E2沙漏首T2施毒被3制品阻挡，第二先暴露再建9毒；未结算毒不补实伤。')
update('silent-bouncing-flask-poison',[H],case='典型案例：HSX4HYATB4E2 A10沙漏首T2普通三次各3只耗3制品、0毒；第二先暴露同时清3制品/33挡后药瓶建9毒，498血在施毒动作不变，中和扣6与末毒9后余483；之后仍败，不单归顺序。')
update('silent-accelerant-triggers',[H],case='典型案例：HSX4HYATB4E2 A10沙虫首两试T2建立、胜试T6才建立，毒及防御同变；沙漏仅首T6/第3试T5建立，末试全场未建，T7的13毒只实扣13。晚建不追补旧轮触发，不能将持有当全程倍毒。')

A=json.load(open(O/'audit.json' if (O/'audit.json').exists() else O/'audit-initial.json'))
RS=json.load(open(O/'rest-summary.json')); SS=json.load(open(O/'sl-summary.json'))
a10=[x for x in A['fights'] if x['asc']==10]
el=[x for x in a10 if x['act']==1 and x['type']=='Elite' and x['band']=='≥60%']
import statistics
update('silent-route-hp-observation',[H,W],lesson=f'观察：首COMBAT→同房末结算净损，回复/实死分账，问号不算Monster，不定安全线。78静默局1217房68死；A8一局25/0死、A9三局48/2死、A10三十八局{len(a10)}房38死。A10一幕≥60%精英{len(el)}房{len(set(x["run"] for x in el))}局{sum(x["death"] for x in el)}死={100*sum(x["death"] for x in el)/len(el):.2f}%、活损中位{statistics.median(x["loss"] for x in el if not x["death"])}。典型案例：WYB0NCD6W83J F12回21/F14事件回10后66/70进强制花园仍死，未来boss胜率不是下一精英胜率；HSX4HYATB4E2 F9改更早火实到F12为69、旧线预测44未实打，不认定省25血（n={{n}}）。')
t=RS[-1]
update('silent-rest-buffer-observation',[H,W],lesson=f'观察：已回复增加血池，未来火与模拟优势不预支。A8一局9火8回血回111、后战7/0死；A9三局21火16回血回341、后战15/1死；A10三十八局{t["rests"]}火{t["heal"]}回血/{t["smith"]}非回血动作回{sum(t["gains"])}，去重后战{t["nexts"]}/{t["deaths"]}死={100*t["deaths"]/t["nexts"]:.2f}%、活损中位{t["median"]}。典型案例：HSX4HYATB4E2十回血实际合223、无锻造，仅两牌已升级，F47的13→39后六次沙漏败；WYB0NCD6W83J F9锻造不回、F12回21、事件另10，66进精英仍死，没有未选锻造或改线的受控结果（n={{n}}）。')
update('silent-deck-burst-observation',[H,W],lesson='观察：取得、支付、触发、穿挡、足额输出分别核，单轮优势不等整战胜因。机制：能力须实际建立，未建敏捷/触媒/滚石/保留不预支。搭配：费用、抽牌、建立轮数和实际可活轮共同验收。决定胜负的战斗：{n}支持局，缺单组件整战对照（n={n}）。典型案例：HSX4HYATB4E2 A10终39张、十次回血无锻造，滚石在仪式兽/沙虫实际贡献136/140，但六次沙漏施放0；末次有2敏/1余像，T7两张重放防御本体14、被动5合19仍不足。WYB0NCD6W83J终21张、十基础牌、仅冒泡升级、无步法/毒雾/触媒，已持计划妥当在死亡战未建；按钮局部30挡不等后轮持续防御。')

def add(id,scope,name,rs,lesson):
    e=dict(id=id,scope=scope)
    if name:e['name']=name
    e.update(asc=[0,20],lesson=lesson.format(n=len(rs)),evidence=rs,n_support=len(rs),n_contradict=0,confidence=confidence(len(rs)),last_seen='2026-10-07',status='active')
    E['entries'].append(e);by[id]=e
add('silent-gardener-skittish-shield','elite:PHANTASMAL_GARDENER',None,S['GARDENER'],
    '花园幽灵鳗的胆小加挡与实际退场分别核；净扣血不等减少攻击源。机制：已见非致死命中步骤后增现场胆小6/7挡，后续攻击先过盾；毒结算可在有挡时按剩血扣尽，敌增力另核，不外推所有触发。搭配：即时攻击与已结算毒核各敌剩血、盾及尚存攻击，不定固定分散/集火规则。决定胜负的战斗：{n}局确认加挡、0反例，击杀早晚与构筑混杂（n={n}）。典型案例：T082DRCUHRRD A0 F8 T1刺击使31→25、挡0→6；R0HEV5E3QT6G A0 T2首杀/T4胜仅损3。WYB0NCD6W83J A10 T1两目标各扣6各增7挡，T3分打18仍四只；T5首杀，T8毒截扣4取消21攻，余11攻对10挡杀1血，未实打另一目标序。')
add('silent-panic-button-card-block-lock','card:PANIC_BUTTON','应急按钮',[W],
    '应急按钮已得30挡与随后的卡牌禁挡分账，当前保命不等持续防御。机制：本局0费/消耗，补30且NO_BLOCK_POWER为2；下一轮1、再下一轮消失，旧挡不追溯删除，已见防御期间不补挡；只核这些时点，不扩到所有被动挡。搭配：已建毒在禁挡窗口真实结算，保留能力须实际建立，不由持有预支。决定胜负的战斗：一局两战一次胜一次败，无改时机或不用的受控对照（n={n}）。典型案例：WYB0NCD6W83J A10 F13 T3按钮30挡、已有毒后T4毒杀蚌损1过关；F15 T6斗篷6再按钮30=36盖33不损，T7防御0挡损22至1，T8恢复两牌各5仍死，计划妥当整战未建。')

E['version']='2026-10-07.9'
E['_about']='静默经验只来自本角色复盘与日志。第63次增量截至WYB0NCD6W83J结束2026-10-06T22:05:33.373Z，78完局；旧76局七数组及血档/节点/回血/SL逐行复算一致，TD1同房重启沿原抽取脚本。新28房2实死、总1217房68死。暴露清挡清制品、胆小盾与毒/退场、应急卡牌禁挡、力敏/重放/余像、滚石实建立及SL换线血价分别核；未执行路线/能力不预支，无新用药规则。'
active=[x for x in E['entries'] if x['status']=='active']
C=dict(old_version=B['version'],version=E['version'],added=[x['id'] for x in E['entries'] if x['id'] not in {x['id'] for x in B['entries']}],updated=changed,retired=[],old_active=sum(x['status']=='active' for x in B['entries']),active=len(active),old_chars=sum(len(x['lesson']) for x in B['entries'] if x['status']=='active'),chars=sum(len(x['lesson']) for x in active),confidence=dict(collections.Counter(x['confidence'] for x in active)),applicable={str(a):dict(entries=sum(x['asc'][0]<=a<=x['asc'][1] for x in active),chars=sum(len(x['lesson']) for x in active if x['asc'][0]<=a<=x['asc'][1])) for a in [8,9,10]})
assert C['chars']<=60000
for old in B['entries']:
    new=by[old['id']]
    if old['scope'].startswith('potion:') or old['scope']=='general:potion':assert old==new
    for clause in re.split(r'(?<=[。；])',old['lesson']):
        if any(w in clause for w in ['药水','喝药','留药','药栏']):assert clause in new['lesson'],(old['id'],clause)
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(C,ensure_ascii=False,indent=2))
