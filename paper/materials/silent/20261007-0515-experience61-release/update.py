import collections, copy, json, re
from pathlib import Path

O=Path(__file__).parent
FILE=Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
RUN='8R5CXD5C8PW8'
B=json.load(open(O/'experience-before.json'));N=copy.deepcopy(B)
A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'))
TEXT={
'silent-footwork-block':'步法普通/升级建2/3敏捷，收益逐挡牌兑现、不补旧挡。机制：基础挡加现场敏捷，再逐牌核脆弱；被动挡另算。搭配：多挡牌重复获益，持有未施放不预支。决定胜负的战斗：{n}支持局、整战胜因未控（n={n}）。典型案例：8R5CXD5C8PW8 A10知识恶魔两试T2各建2敏，已有9挡不变；重打T3防御5→7使27攻击损20，首试未打防御损27；雕刻师步法到手却未建、整战0敏，不能补2敏收益。',
'silent-strength-weak-observation':'力量逐击改攻击，敏捷逐挡牌；弱化与被动分核。机制：2力三击多6，虚弱逐击取整，减力不关闭独立成长，敏捷不补旧挡。搭配：多段放大力、多挡牌兑现敏，持牌伤另核。决定胜负的战斗：{n}支持局、各子公式与胜因分账（n={n}）。典型案例：8R5CXD5C8PW8 A10雕刻师T4萎靡+使18→14力、33→21攻，后续力23/32/41、弱后28/35/42；末玩家弱下打击6→4、冲刺10→7。',
'silent-frail-card-block':'脆弱逐牌缩减格挡，被动挡另核。机制：先加敏捷/牌专属增量，再逐牌乘0.75向下取整，不能先合挡再折减。搭配：重放逐次核，余像/覆甲不当卡牌挡。决定胜负的战斗：{n}支持局、整战未隔离（n={n}）。典型案例：8R5CXD5C8PW8 A10雕刻师T6末持羞耻，T7脆弱1、0敏，防御/冲刺/偏折5/10/4→3/7/3，19→13少6挡；即补回6挡，6血对42−19仍缺17血，不定单咒败因。',
'silent-doubt-end-turn-weak':'疑虑持牌回合末给予虚弱，下一轮攻击逐牌减少。机制：已见文本给1虚弱，无其他修正时打击6→4、冲刺10→7；攻击伤与毒/反伤分账。搭配：抽牌、持咒和实际攻防共同核，不由单个差额认定整战败因。决定胜负的战斗：{n}支持局、均无删咒受控胜局（n={n}）。典型案例：FH2HB2X17F2H A6雾菇三打击18→12仍不足47血；8R5CXD5C8PW8 A10雕刻师T6末持疑虑，T7虚弱1，打击/冲刺16→11，末敌仍29/172血。',
'silent-malaise-x-debuff':'萎靡普通按X、升级按X+1减力并加虚弱，普通零X无自身减益、升级零X各1。机制：尖啸临时减力撤回后萎靡减力保留，独立敌成长继续，阶段另核。搭配：减力逐击、虚弱另算，能量和实际牌挡一起核。决定胜负的战斗：{n}支持局、时点胜因未控（n={n}）。典型案例：8R5CXD5C8PW8 A10雕刻师T4萎靡+用剩3能量各施4，力18→14、33→21攻击；中和再补1弱，后续仍每轮加9力至23/32/41，末42攻击杀6血13挡。',
'silent-devoted-sculptor-ritual-growth':'雕刻师仪式持续加力，减力/虚弱/玩家无实体不关闭成长。机制：禁忌唱诵建立{@10:GAIN:DEVOTED_SCULPTOR:FORBIDDEN_INCANTATION_MOVE:RITUAL_POWER}仪式，猛烈攻击基础{@10:DMG:DEVOTED_SCULPTOR:SAVAGE_MOVE}加现场力再核弱；已见每轮加9，其他进阶核现场。搭配：实际输出、挡和保护到期一起核，未来收益不抵当前致死来袭。决定胜负的战斗：{n}支持局、胜败皆有且构筑未控（n={n}）。典型案例：8R5CXD5C8PW8 A10 T2开场仪式9、T3/4力9/18；萎靡后14继长23/32/41，灵体三轮只损1但扣45，末需损42−13=29、6血差23，敌余29/172。',
'silent-grand-finale-empty-draw':'华丽收场零费仍须空抽牌堆，过牌规划不算已兑现伤害。机制：空堆可打/非空不可；普通60、升级75，负力/敌减伤/剩血另核。搭配：后空翻等须实际形成窗口，持有不能当随时输出。决定胜负的战斗：{n}支持局、购牌与整战胜因未控（n={n}）。典型案例：ZZMYZ5UBCG72 A2空堆56斩36血族母；8R5CXD5C8PW8 A10知识恶魔重打T6空堆收场+实扣75，敌304→229，本轮含14毒/3荆棘合92、损12后T14赢；首试收场0次，防御/到手轮亦变，不单归转胜。雕刻师T3非空不可打、整战0伤。',
'silent-bronze-scales-per-hit-thorns':'铜质鳞片在已见战斗开场给3荆棘，敌每次实际攻击分别反伤。机制：单击3、三击9，全挡仍触发；实际敌减伤/剩血与其他结算另核，不外推全部特殊交互。搭配：格挡保护玩家且不取消已见反伤，未攻击不预支。决定胜负的战斗：{n}支持局、遗物整战胜因未控（n={n}）。典型案例：R0HEV5E3QT6G A0三击全挡仍反9；8R5CXD5C8PW8 A10雕刻师T2—T7各反3合18、T2全挡亦反3；末12毒另3荆棘敌44→29、玩家死亡，不把反伤归牌伤或预支下一击。',
'silent-pumpkin-candle-charge-energy':'南瓜蜡烛额外能量只在实际正充能时兑现，续火计划与执行分账。机制：初5充能，已见正数轮初基础3+1=4、每战后扣1，归零轮初3；添火实增5且HP不变，回血/锻造不续火。搭配：额外能量共同支付攻击/挡/能力，持有不等实际支付，不规定营火优先级。决定胜负的战斗：{n}支持局、未有单遗物受控转胜（n={n}）。典型案例：ZVYUL2YP3518 A10添火0→5/1→6；8R5CXD5C8PW8 A10 F29添火HP28不变，后知识恶魔/雕刻师轮初基础4能量，侧步另补次轮1；雕刻师T3/T7为5能量，步法/群蛇仍未建。',
'silent-giant-explosion-window':'巨兽本体归零后仍须承受自爆，击杀时点与当轮血挡共同验收。机制：蒸汽/现场自爆分核，不定成长公式；血{@2:HP:WATERFALL_GIANT}，残壳999999999不计新需伤。搭配：本体毒伤与残壳防御分账，回复另核。决定胜负的战斗：{n}支持局、重打变化未隔离单因（n={n}）。典型案例：8R5CXD5C8PW8 A10两试69/70，首T8本体清、T10的41自爆对24血14挡差3，未结束而读档；重打T8清、T9的28爆炸对13挡实损15，剩17过关。抽序/行动不同，不能由早清本体认定已赢。',
'silent-knowledge-demon-healing-sl-observation':'观察：知识恶魔回血增加实际需伤，重打输出与损血窗口分别核。机制：历史A6的379本体加三次27回血需460；新A10首血399，净扣已抵消回血、不当完整毛需伤。搭配：持续输出须跨回血轮，空堆收场与敏捷牌挡只计实际兑现。决定胜负的战斗：{n}支持局，真正SL两场四试两赢、整战多组件未控（n={n}）。典型案例：UACFSW4VDDLD A6重打T14扣460胜；8R5CXD5C8PW8 A10两试70/70，首T13的8血7挡对15恰判死、97敌血/28毒未结算即读档；重打T6收场75、本轮净扣92，T14毒收12敌血、剩20赢；初抽序31项同，到手轮/防御与后续动作不同。',
'silent-deck-burst-observation':'观察：取得/建立/保护/触发/足额输出分别核，单轮保血不定整战胜因。机制：能力须实际支付，保护不自动建立能力，敌成长不停；未来毒/敏捷/群蛇不预支。搭配：费用、抽牌、启动与保护到期一起核。决定胜负的战斗：{n}支持局、无单组件整战因果（n={n}）。典型案例：8R5CXD5C8PW8 A10雕刻师三灵体保护轮只损1/扣45，T2群蛇在手、后空翻抽步法却整战未建；F8/F17护栏预计合省23血/少26当轮伤并推迟施毒，原线整战未知。知识恶魔收场75兑现而抽牌/防御也变，不能单归转胜。',
}
bands={ (r['asc'],r['act'],r['type'],r['band']):r for r in A['bands'] }
b1=bands[(10,3,'Monster','<25%')];b2=bands[(10,3,'Monster','≥60%')]
fs=[r for r in A['fights'] if r['asc']==10];rr=R[10]
TEXT['silent-route-hp-observation']=(f'观察：首COMBAT→同房末结算净损，回复/实死分账，問号不算Monster，不定安全线。75静默局{len(A["fights"])}房{sum(r["death"] for r in A["fights"])}死；A8一局25/0死、A9三局48/2死、A10三十五局{len(fs)}/{sum(r["death"] for r in fs)}死，各格见第61节。A10三幕<25%走廊{b1["n"]}房{b1["runs"]}局{b1["deaths"]}死={100*b1["deaths"]/b1["n"]:.2f}%、活损中位{b1["median_win"]}；≥60%{b2["n"]}房{b2["runs"]}局{b2["deaths"]}死={100*b2["deaths"]/b2["n"]:.2f}%、中位{b2["median_win"]}。典型案例：8R5CXD5C8PW8 A10二幕避精英仍三虫损28；F34改线增加精英前营火，F35走廊62/70起仍死，商店删咒与未来火未到；未选线未实打（n=75）。').replace('問号','问号')
TEXT['silent-rest-buffer-observation']=(f'观察：已回复增加血池，未来营火/模拟优势不预支。A8一局9火8回血7非回血动作回111、后战7/0死/中位10；A9三局21火16回血5非回血回341、后战15/1死/中位34；A10三十五局{rr["rests"]}火{rr["heal"]}回血{rr["smith"]}非回血回{sum(rr["gains"])}，去重后战{rr["nexts"]}/{rr["deaths"]}死={100*rr["deaths"]/rr["nexts"]:.2f}%、活损中位{rr["median"]}。典型案例：8R5CXD5C8PW8 A10三回血各21合63，F16回23→44、缩放仪另回25到69；F32锻造HP48不变、缩放仪另回22到70，重打boss过关仍死下一走廊；回血/遗物/未来火分核，未选锻造/路线未实打（n=75）。')
changes=[]
for e in N['entries']:
    if e['id'] not in TEXT:continue
    old=copy.deepcopy(e)
    if RUN not in e['evidence']:e['evidence'].append(RUN)
    e['n_support']=len(e['evidence']);e['last_seen']='2026-10-07'
    e['confidence']='high' if e['n_support']>=5 and e['n_contradict']<=e['n_support']/3 else ('med' if e['n_support']>=2 else 'low')
    if e['id']=='silent-pumpkin-candle-charge-energy' and e['n_support']>=4 and not e['n_contradict']:e['confidence']='high'
    e['lesson']=TEXT[e['id']].replace('{n}',str(e['n_support']))
    for sentence in re.split(r'(?<=。)',old['lesson']):
        if re.search('药水|药瓶|喝药|留药|药栏|用药',sentence):e['lesson']+=' '+sentence
    changes.append(dict(id=e['id'],before_n=old['n_support'],after_n=e['n_support'],before_chars=len(old['lesson']),after_chars=len(e['lesson'])))
new=dict(id='silent-apparition-player-intangible',scope='card:APPARITION',name='灵体',asc=[0,20],lesson='灵体的无实体压低已见敌攻击，但零挡仍掉血且不停止敌成长。机制：本局每张1费、建立1无实体并消耗；雕刻师15/24攻击变现场1，挡再吸收，三张逐轮保护不当永久减伤，其他伤源未验。搭配：可提供实际攻防支付窗口，但持有步法/群蛇不等已建立。决定胜负的战斗：一局支持零反例，保护三轮损1但扣45，未有提前铺能力实打胜局（n=1）。典型案例：8R5CXD5C8PW8 A10 F35 T2后空翻5挡全盖1、HP62不变；T3零挡62→61，T4敌仍18力，T7保护已无、42攻对6血13挡阵亡。',evidence=[RUN],n_support=1,n_contradict=0,confidence='low',last_seen='2026-10-07',status='active')
N['entries'].append(new);N['version']='2026-10-07.7'
N['_about']='静默猎手经验只来自本角色复盘及日志。第61次增量截至8R5CXD5C8PW8结束2026-10-06T20:36:22.482Z，75完局；旧74局七数组及血档/节点/回血/SL逐局重算一致。净损按首COMBAT→同房末结算，回复/实死/判死/SL分账。灵体减伤与敌仪式、能力持有与实际建立、华丽收场空堆窗口与实际75伤分别核；同初抽序而到手轮/动作不同不定单组件整战因果，无新用药规则。'
FILE.write_text(json.dumps(N,ensure_ascii=False,indent=2)+'\n')
active=[e for e in N['entries'] if e['status']=='active'];before=[e for e in B['entries'] if e['status']=='active']
c=dict(old_version=B['version'],version=N['version'],added=[new['id']],updated=list(TEXT),retired=[],old_active=len(before),active=len(active),old_chars=sum(len(e['lesson']) for e in before),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),rows=changes,applicable={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert c['chars']<=60000
(O/'changes.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in c.items() if k!='rows'},ensure_ascii=False))
