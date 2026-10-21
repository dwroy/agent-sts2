"""Render research-only deliverables from verified static evidence."""
import hashlib
import json
import pathlib
import re
import subprocess

OUT = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
AUDIT = ROOT/'paper/materials/2026-10-21-v6-elite-bias-audit'
inv = json.load(open(OUT/'fight-inventory.json'))
summary = json.load(open(OUT/'static-summary.json'))
by_id = {r['id']:r for r in inv}


def sha(b):
    return hashlib.sha256(b).hexdigest()


def save(name,obj):
    (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')


def ref(x):
    return f"{x['path']} offset={x['offset']} bytes={x['bytes']} SHA256={x['sha256']}"


def cite(id):
    x=by_id[id]
    return f"{id}（Silent A10/F{x['floor']}/T1可行动），{ref(x['ready_source'])}"


queue=ROOT/'paper/materials/learning/code-proposals.jsonl'
selected=['silent-proposal-e76e895381da5bfc','silent-proposal-ecbd4b68c5fad954','silent-proposal-c51468c5e8ba6668',
          'silent-proposal-da9575b27ac37dbb','silent-proposal-04cbbf6b3a547aea','silent-proposal-1b9e29122364fa68']
adds={};updates={};queue_refs=[]
off=0
for line in queue.open('rb'):
    d=json.loads(line)
    if d['id'] in selected:
        queue_refs.append({'id':d['id'],'path':str(queue),'offset':off,'bytes':len(line),'sha256':sha(line),'op':d['op']})
        updates.setdefault(d['id'],{}).update(d)
        if d['op']=='add':adds[d['id']]=d
    off+=len(line)
dedup=[]
for id,d in adds.items():
    p=pathlib.Path(d['proposal'])
    e={'id':id,'ledger':d.get('ledger',[]),'summary':d.get('summary'),'queue_latest_state':updates[id].get('state'),
       'queue_latest_reason':updates[id].get('reason'),'proposal':str(p),'source_bytes_available':p.exists()}
    if p.exists():
        b=p.read_bytes();e.update(bytes=len(b),sha256=sha(b),original_registered_sha256=d.get('proposal_sha256'))
    else:e['limitation']='原文件缺失；只引用队列身份，不恢复其他工作树，不把 pending 当实现证明。'
    dedup.append(e)
save('existing-proposal-index.json',{'queue_sha256':sha(queue.read_bytes()),'scope':'元数据去重，不借其他局机制证据验证本窗口',
    'search_fields':['summary','ledger','id'],'terms':['精英模拟/悲观','蛇之戒/首轮抽牌','紧勒/凌虐/首见/开场能力','棱柱/阶段','0332/随机药水'],
    'selected':dedup,'raw_queue_references':queue_refs})

# A transparent derivation from the pinned JSON, not an execution of model code.
head='cf3372505b85e8df72e99cb9b5455c9f42b25e1a'
common_bytes=subprocess.check_output(['git','show',head+':knowledge/common/monster-db.json'])
record_bytes=subprocess.check_output(['git','show',head+':knowledge/characters/silent/monster-records.json'])
common=json.loads(common_bytes);records=json.loads(record_bytes)
power_selection=[]
for enemy in ['PHROG_PARASITE','BYRDONIS']:
    for power in ['MANGLE_POWER','STRANGLE_POWER']:
        p=common['monsters'][enemy]['powers'].get(power)
        if p is None:continue
        by_asc=records['encounters'][enemy]['by_asc']
        selected_asc={a:v for a,v in p['turn_at_first_sight_by_asc'].items() if by_asc.get(a,{}).get('fights',0)>0}
        numerator=sum(v.get('1',0) for v in selected_asc.values())
        denominator=sum(by_asc[a]['fights'] for a in selected_asc)
        power_selection.append({'enemy':enemy,'power':power,'common_first_sight_by_asc':p['turn_at_first_sight_by_asc'],
            'silent_encounter_fights_by_asc':{a:d['fights'] for a,d in by_asc.items()},'selected_asc':list(selected_asc),
            'builder_numerator':numerator,'builder_denominator':denominator,'threshold_unchanged':0.8,
            'A10_common_first_sight':p['turn_at_first_sight_by_asc'].get('10'),
            'scope_warning':'公共首见分子与角色 encounter 分母及仅含已见该power进阶的筛选，不能解释为本窗口A10天生概率；不据其他角色统计学习机制。'})
save('component-findings.json',{'head':head,'sources':[{'path':'knowledge/common/monster-db.json','sha256':sha(common_bytes)},
    {'path':'knowledge/characters/silent/monster-records.json','sha256':sha(record_bytes)}], 'power_selection':power_selection,
    'raw_view_loss':53,'raw_view_cause':'extract.py -> parse_state_line removes agent_view; boardOf sees no logged piles',
    'draw_multiset_differences':summary['draw_multiset_mismatches'],
    'historical_replay_knowledge_identical_to_git':771,'historical_per_run_dynamic_knowledge':'unknown'})

hypotheses=[
 {'id':'H1','hypothesis':'原统计悲观残差存在','status':'supported_descriptive','support':['52首试/33局，死4；合成30.2885%，实战7.6923%，掉血+10.8882'],
  'counterevidence':['四次真实死亡保留；DECIMILLIPEDE模拟33.59%低于实战2/4，不是各组同向'], 'unknown':['选择进入精英的条件偏差','泛化及因果收益'],'evidence':'static-summary.json'},
 {'id':'H2','hypothesis':'敌人第一招攻击抬高是全部主因','status':'not_supported_as_general_explanation',
  'support':['冻结共同52开场incoming一致'], 'counterevidence':['PHROG七场与BYRDONIS三场开场能力存在额外项；相同incoming不代表同模型'],
  'unknown':['后续阶段、意图转移与动作固定后的单项误差'],'evidence':'fight-inventory.json/opening_differences'},
 {'id':'H3','hypothesis':'开场首见能力选择存在条件/来源混用','status':'supported_representation_gap_effect_unknown',
  'support':['PHROG七个A10原帧仅INFESTED4，合成另MANGLE10/STRANGLE2；BYRDONIS三帧仅TERRITORIAL1，合成另MANGLE5',
             '源码以公共首见记录在出现该能力的进阶筛选后除Silent encounter分母，缺A10观察仍跨阶带入'],
  'counterevidence':['低残差BXU同样有额外能力；STRANGLE文本给玩家逐牌输出，移除可能使模拟更差'],
  'unknown':['单项修正对残差方向/量级','全条件天生规则'],'evidence':'component-findings.json; source-excerpts.md'},
 {'id':'H4','hypothesis':'蛇戒的开场抽牌覆盖缺口足以解释全部偏差','status':'count_gap_supported_sufficiency_rejected',
  'support':['53场持蛇戒，51场合成抽数与真实T1手牌数相差2；48场5→7、2场7→9、1场6→8，另两场带海螺5→9差4'],
  'counterevidence':['53场无不持戒对照；Eel抽数单改个例更差；棱柱实开场仍高残差'],
  'unknown':['隔离蛇戒后确切规则','额外张数与其他开场效果归属'],'evidence':'fight-inventory.json'},
 {'id':'H5','hypothesis':'真实开场回放保留了原日志可用牌堆','status':'refuted_for_frozen_pipeline',
  'support':['53/53原帧有agent_view牌堆，冻结输入53/53删除；52成功回放标签都是deck-minus-hand'],
  'counterevidence':['51/52成功场的draw牌ID/升级多重集恰好相等；缺视图不必然改变这些场的牌数'],
  'unknown':['卡面mods/动态值完整等价','真实抽序'],'evidence':'fight-inventory.json/pile_comparison'},
 {'id':'H6','hypothesis':'回放牌身份在战内升级后仍守恒','status':'refuted_one_observed_case',
  'support':['ET1QAZCV8GUP F31T1原28牌=手7+抽21；冻结手7+抽27=34；按ID与upgraded扣牌只扣LEG_SWEEP+'],
  'counterevidence':['其余51成功场未见ID/升级多重集失配；no-solve场不可检'],
  'unknown':['修正后的结果方向与卡面完整性','战内升级的机制归属'],'evidence':'fight-inventory.json/ET1QAZCV8GUP-f31-fight11'},
 {'id':'H7','hypothesis':'模拟完全不用药导致全部偏差','status':'refuted_general_claim',
  'support':['合成排除CHOICE/DRAW，实际开场存在随机来源；MPW F11T1实饮POWER后生成/出ABRASIVE，合成无该随机来源'],
  'counterevidence':['共同51合成仍平均饮0.627瓶；无药BXU低残差与无药Eel高残差共存'],
  'unknown':['留药/早饮整战反事实','随机结果和策略各自归属'],'evidence':'fight-inventory.json; turn-alignment.jsonl'},
 {'id':'H8','hypothesis':'未来代码策略与实战动作不同，改damageScale即可校准','status':'policy_difference_supported_weight_fix_not_supported',
  'support':['25MF F28T1实DEFLECT/FLICK_FLACK/MALAISE，32真实开场样本均额外首轮FOOTWORK；0NMF实际首轮POISONED_STAB/SHIP和样本首轮集合不同'],
  'counterevidence':['Eel七场0.5→1平均死亡仅25%→23.21%；低残差BXU T1集合全匹配但非完整顺序证明'],
  'unknown':['匹配抽序/动作之后的机制误差','不同策略持续执行整战收益'],'evidence':'fight-inventory.json/T1_policy_comparison'},
 {'id':'H9','hypothesis':'净损血/治疗/删失能单独解释残差','status':'measurement_limits_supported_not_full_explanation',
  'support':['原52场净损27.2308、帧采样累计受伤27.7115、模拟38.1190；两场最后战斗帧到退出还少3/6HP，退出口径27.4038；死亡hpLoss被定义为血量上限'],
  'counterevidence':['按退出口径仍+10.7151；四次SL并非四独立死亡'],
  'unknown':['帧间及最后战斗帧到退出的损伤/治疗归属','删失首试真实结局'],'evidence':'static-summary.json; source-excerpts.md'},
 {'id':'H10','hypothesis':'同种子配对差自动抵消模型偏差并保证拿牌排名','status':'unestablished',
  'support':['同种子可控制部分模拟随机波动'], 'counterevidence':['本53战没有候选拿牌/skip的真实反事实；状态相关偏差可不相消'],
  'unknown':['候选增量校准','自然采用及实战收益'],'evidence':'原授权限定与本窗口设计；没有额外收益样本'}]
save('hypotheses.json',hypotheses)

disagreements=[
 {'id':'D1','prior':'原审计称真实开场保留可用牌堆；缺显式牌堆时才deck-minus-hand。',
  'finding':'显式牌堆在原字节中存在；是冻结提取主动剥离。ET1一场还造成六张重复身份和升级失配。保留原结果作原管线诊断，不称完整真实开场控制。',
  'evidence':[cite('ET1QAZCV8GUP-f31-fight11'),'source-excerpts.md: parse_state_line / boardOf / findIndex'],
  'affected_ids':['silent-elite-simulation-pessimism-20261021','issue-4','silent-proposal-e76e895381da5bfc'],
  'next_step':'原ops接收本异议，沿原通知CLI实际写入watcher与Roy收件箱并取得各角色真实回执；先做无MC输入保真回归。'},
 {'id':'D2','prior':'原授权：“当前不影响R407运行：拿牌比较用同种子配对差。”',
  'finding':'不否定原调度决定，但拒绝把其理由外推为配对增量已校准或排名可靠。本窗口只比较绝对结果，无候选反事实，且有状态/牌身份相关偏差。',
  'evidence':['issue输入内elite-learning-authorization-original.md，SHA25ae2141a16fa4fc61c48d00943240a0a5fb3340bd6627d663c2d17606a34d25',cite('ET1QAZCV8GUP-f31-fight11')],
  'affected_ids':['silent-elite-simulation-pessimism-20261021','issue-4','R407论证边界'],
  'next_step':'原ops→watcher→Roy实际告知，单独验证候选增量；保持CARDbrain/REFLEXoff，不将CEN或预测器子项完成当本issue完成。'},
 {'id':'D3','prior':'原审计将净损描述为入场至终局；实际使用fight.hp_loss，两场胜利只覆盖到最后COMBAT帧。',
  'finding':'ET1 F9最后战斗42到退出39、2XCG F9最后战斗25到退出19；合9HP未纳原“净损”。保留原统计并并列退出口径均值27.4038、模拟残差+10.7151，原因不补值。',
  'evidence':[cite('ET1QAZCV8GUP-f9-fight4'),ref(by_id['ET1QAZCV8GUP-f9-fight4']['close_source']),
              cite('2XCG8LXUZLRE-f9-fight5'),ref(by_id['2XCG8LXUZLRE-f9-fight5']['close_source'])],
  'affected_ids':['silent-elite-simulation-pessimism-20261021','issue-4','原审计净掉血口径'],
  'next_step':'原ops沿通知链实际告知，固定索引补核两段跨界HP事件；不得用无归因9HP拟伤害参数。'}]
save('disagreements.json',disagreements)

base_context='''适用角色仅 Silent、已观察 A10；实战为V5、多版本/脏数据现场，回放固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。不得外推铁甲、其他角色或未观察进阶。来源任务issue-4-elite-calibration，批次issue-4-elite-calibration-20261021-104312，父要求silent-elite-simulation-pessimism-20261021。本轮只草稿，ledger未新增、CLI未调用、无实现任务批次，不填写伪造登记ID。所有下一步由原ops单点安排；本轮预算新MC=0、真实模型=0、测试=null。\n'''
proposals=[
 {'local_key':'input-fidelity','path':'proposal-input-fidelity.md','state':'waiting','existing_ids':[],
  'evidence_ids':['ET1QAZCV8GUP-f31-fight11','BXU0CKWKH2RU-f15-fight6','BXU0CKWKH2RU-f46-fight20','ET1QAZCV8GUP-f9-fight4','2XCG8LXUZLRE-f9-fight5'],
  'summary':'先恢复有来源哈希的原agent_view，并验证手牌与牌堆身份守恒；不以当前知识覆盖原输入。',
  'body':'''旧行为：extract/prepare调用parse_state_line去agent_view；boardOf按cardId+upgraded从常驻deck扣手。ET1有6张手牌战内升级与常驻deck不匹配，冻结34张大于原28。拟新行为：专用审计入口按已知offset/bytes恢复完整原帧；保留原件与来源SHA，缺视图显式unknown，牌堆直接用可读原视图，不用“按ID随便扣”掩盖升级/mod差异。这里是候选数据/表示修复，不修改生产或游戏参数。

固定回归：ET1应恢复手7/抽21/弃0/耗0=28；七张手牌升级身份保留，特别LEG_SWEEP+可扣、其余六张旧deck扣不动的反例保留。BXU F15低残差样本恢复后多重集等价；SOUL_NEXUS的no-solve原异常仍须显式保留，不补0。回归核卡ID/升级、卡面、mods、pile大小与原字节，而非只核死亡率。

撤源负控：移除agent_view时必须显式标fallback及身份不守恒，不能悄悄得到“同输入”；撤走原SHA匹配应拒收。低残差BXU是已阅负控，不是独立留出。独立留出：本轮53场均已阅，全部只作诊断集；后续冻结后未读Silent A10新局按run留出，至少8个不同新局各首个精英，未齐前waiting，不借SL或种子补分母。

最小下一步预算：只做53个原T1输入的静态转换及8个固定断言，同时保留两处最后COMBAT到非战斗退出少3/6HP的端点断言；1进程nice19/ionice3、≤10分钟、0MC/0模型/0完整测试；不启动此实验。先过这一关才谈模拟残差复测。消费者：离线审计、boardOf回放输入；未来A消费者须另核生产路径。误差/限制：51成功场ID/升级多重集相等不证明mods等价；分组牌堆无抽序；修正方向未知。回放helper未在771清单中，Git cf337代码可解释冻结差异，但原运行时helper逐字身份未独立冻结，不能冒称该叶SHA已核。回退：撤回专用输入转换提交，原99文件与原结果全部保留。''',
 },
 {'local_key':'opening-powers','path':'proposal-opening-powers.md','state':'waiting','existing_ids':['silent-proposal-04cbbf6b3a547aea','silent-proposal-1b9e29122364fa68'],
  'evidence_ids':['JKDUL0AL0TW6-f9-fight4','MPWMW6P91U0B-f11-fight5','BXU0CKWKH2RU-f15-fight6','0NMF36KX3F7Y-f9-fight5','9W38TRGPJW9Q-f8-fight4'],
  'summary':'核开场能力首见统计的条件和分母一致性；拒绝将稀疏受施加能力直接当本角色A10天生能力。',
  'body':'''旧行为：bossOpening把common首见回合统计在“出现过该power且本角色encounter有局”的进阶内相加，除该部分Silent局分母；随后startAmountAt跨进阶带入A10。PHROG七战合成有MANGLE10/STRANGLE2，原A10 T1只有INFESTED4；BYRDONIS三战多MANGLE5。初始incoming相同并不能排除该输入错误。

拟新行为：先输出每项天生能力候选的角色/进阶/原首帧身份、首动作前后条件、独立局分子分母及跨阶估计；缺同条件分母和源角色身份则unknown，不无条件继承首见能力。只在本角色本进阶核证的固定窗口提供原开场能力，不硬编码“所有PHROG永久为零”，不修改0.8门槛反推目标。普通紧勒真实逐牌触发沿原silent-proposal-04cbbf6b3a547aea/1b9e29122364fa68核边界；它们的接线已实现/duplicate身份不等于本开场选择问题实现，不重复造普通紧勒bug。

固定回归：七PHROG与三BYRDONIS的真实T1能力投影；INFESTED/VITAL_SPARK/TERRITORIAL等原帧能力不能误删。固定源码common首见/角色分母推导见component-findings.json，公共统计只用于定位程序，不作为本角色机制验证。撤源负控：删除A10原首帧证据即降unknown；给定一个有真实紧勒的既有提案固定帧必须仍保留效果，负控沿原owner核源，本轮不借其局号统计。独立留出：后续至少8个新Silent A10独立局，覆盖遇到目标与未目标精英，按新run冻结不调门槛；未获得前waiting。

最小下一步：10个既有T1转换+2个条件负控，0MC、1进程≤10分钟；保持其他开场分量原样。如还需量化单项影响，另由ops冻结预算，不由本报告启动。预计消费者：prepareElite→v6ProjectionStart→bossOpening及A原始可信度；不直接修改拿牌排序。误差/限制：额外STRANGLE在原文本表示玩家打牌令敌失血，去掉可能使模拟更悲观；MANGLE效果方向也不从标签补值。本提案是输入准确性，不承诺降低残差或收益。回退：还原限定的选择逻辑/条件数据，保留unknown与诊断原件，不回退已有紧勒接线子实现。''',
 },
 {'local_key':'relic-potion-opening','path':'proposal-relic-potion-opening.md','state':'waiting','existing_ids':['silent-proposal-c51468c5e8ba6668'],
  'evidence_ids':['MPWMW6P91U0B-f11-fight5','0NMF36KX3F7Y-f9-fight5','76VEDXJJ2PFL-f8-fight5','BXU0CKWKH2RU-f15-fight6'],
  'summary':'分开首抽数量、具体起手与随机药表示；缺无戒及同药后继对照时保留机制/药价待证。',
  'body':'''旧行为：合成首抽5/6/7，实际手牌7/8/9；53场全持蛇戒，51场差2、另两场带BOOMING_CONCH差4，FIGHT_START_RELICS无蛇戒ID。CHOICE/DRAW药被合成入口剔除，真实开场helper却可携randomPotions。拟新行为：先按原帧明确各开场分量覆盖/未知；为有实见条件的蛇戒首抽建立候选+2规则并保留未隔离限制，海螺差4另留条件未知，随机药使用相同表示合同或显式unknown，不能把“可算”当“可靠”。当前只准备候选，不改抽牌参数、药水价格或上线。药水实际收益与跨战持有价值复用silent-proposal-c51468c5e8ba6668，不重复造同类资源定价项。

固定回归：53场抽数逐一保留，51差2与两场海螺差4分开；MPW F11T1实饮POWER_POTION并打ABRASIVE的原前缀；0NMF实际首轮喝SHIP但合成仍会在后续喝，反证“完全不用药”；无药BXU低死亡残差和无药76VED F8高残差同时回归。撤源负控：移除蛇戒不能依本材料继续+2；缺药水生成原件则结果标unknown而非假定同生成。补现有已核规则需要原owner提供撤戒固定输入，合成无戒只作程序负控，不算实盘机制证据。

独立留出：新Silent A10按run、真实开始时间后留至少8局，不与本53场混合；必须等待具有可隔离首抽条件/药水生成后继的新证据，否则waiting。最小下一步不需MC：4个T1实际前缀每个最多3个动作、≤12转换；抽牌或随机选择无已知原后继即停止，1进程nice19/ionice3、≤10分钟。将来要量化药/抽牌贡献时ops原单点另批固定同输入一分量对照，不重用历史死亡率拟+2或药价。预计消费者：合成开场/A标签与独立校准，不动CARDbrain/REFLEXoff。回退：撤回已证条件下的开场子改动、保留原始未建模标签与正式药价。局限：无不持戒实战负控，无药反事实；不能报告因果收益。''',
 },
 {'local_key':'policy-phase-alignment','path':'proposal-policy-phase-alignment.md','state':'waiting','existing_ids':['silent-proposal-e76e895381da5bfc','silent-proposal-c51468c5e8ba6668','silent-proposal-da9575b27ac37dbb'],
  'evidence_ids':['25MFNPAE37R2-f28-fight14','76VEDXJJ2PFL-f30-fight15','ET1QAZCV8GUP-f31-fight11','0NMF36KX3F7Y-f9-fight5','76VEDXJJ2PFL-f8-fight5','34XTHUP4433X-f24-fight13'],
  'summary':'沿既有棱柱阶段/药水/删失提案，先核相同实际前缀的状态转移，权重和校准保持waiting。',
  'body':'''复用原ID：棱柱阶段与完整候选用silent-proposal-e76e895381da5bfc（silent-0167/0168等），药水归属用c51468c5e8ba6668（silent-0019），一血SL删失用da9575b27ac37dbb（silent-0019/0125/0276）。本文件只给本窗口补固定索引，不造同题CLI id，也不把旧局证据算本窗口实战分母。

旧行为：1500节点、damageScale0.5的未来代码策略，从开场自行选线；冻结只有T1首用集合和逐轮汇总，无完整动作/抽序。拟新行为：在相同原开场强制已经实打的有限前缀，记录每步前后HP/敌HP、能力/意图、牌身份及药栏；只有此时的首分歧才可归机制。另将自由策略分支与该原前缀并列，区别策略偏好和执行错误。25MF原DEFLECT/FLICK_FLACK/MALAISE而32实际开场样本T1均额外FOOTWORK，已经证明T1选线集合不同；并未证明加步法导致后续死亡。棱柱T5能力由3到6的观察存在，但模拟没有对应逐步能力轨迹，阶段根因waiting。保持权重0.5/阈值/预算，不从死亡率推拟新系数。

固定回归与撤源负控：先修input-fidelity；选择上述三棱柱、0NMF、76VED F8、低残差BXU F15、9W38 F8及删失34X F24共8窗，各最多3个已执行动作、共24步。单动作若随机生成/抽牌无法按原件唯一映射，立刻unknown/停止，不预支未执行后继；撤掉原后帧或SHA失败必须无法给“匹配”。32样本全死与hpLoss满血同一定义，不能当两份独立回归。SOUL_NEXUS no-solve保留单独异常负控，不用重试补齐。

独立留出：本53场全部已阅、无盲留出；固定窗口只能开发/负控。后续首8个未阅Silent A10独立完局、每局首精英且含失败，作为时间后留出；未齐前waiting。最小实验预算：上述24个确定转移、1进程nice19/ionice3、≤15分钟、0MC/0模型/0full；ops若之后安排模拟，只冻结不超过8窗×2输入×4个固定旧seed=64样本、保持30回合/1500节点、一分量一比较、不增池，原单点另行记录许可与预算，本轮没有启动。独立留出至少8局只是数据收集下限，不是自动通过精度门槛，样本不足不宣称收益。

预计消费者：离线fightSample诊断、A模型可信度和既有阶段/药水候选审计；自然Jev/大脑采用与拿牌排名另验。与0332/CEN的成功死亡/资源接续纯bug、P4和拿牌预测器去重，它们子实现不关闭此父。回退：仅撤回新增诊断或限定机制修正的实际提交，保留已有资源接续/成功死亡bug修正；本轮没有源码可回退。误差：同种子仅降部分方差，不能消状态相关绝对偏差；任何全线因果/收益/最佳牌排序仍unknown。''',
 }]
for p in proposals:
    evidence='\n'.join('- '+cite(id) for id in p['evidence_ids'])
    (OUT/p['path']).write_text('# 候选提案：'+p['summary']+'\n\n'+base_context+'\n状态：waiting；local_key只是scratch目录索引，不是正式提案ID。\n\n'+evidence+'\n\n'+p['body']+'\n')
save('proposal-drafts.json',[{k:v for k,v in p.items() if k!='body'} for p in proposals])

review=['# 53场逐场核查去向','', '每场均核原帧、原动作、冻结回放；后续机制归因均未闭合。原字节全SHA索引见source-index.jsonl。以下首次可行动T1为起手/能力对齐点，不把未就绪入房帧当可行动起手。','']
for x in inv:
    s=x['variants']['synthetic'];a=x['variants']['actual-opening'];p=x['pile_comparison']
    review += [f"## {x['id']}",'',f"角色silent A10，V5，实战commit {x['historical_commit']}（dirty={x['historical_dirty']}）；F{x['floor']}，fight{x['fight_no']}，{x['encounter']}。",
        f"入场HP{x['entry_hp']}/{x['max_hp']}，常驻牌{x['deck'].__len__()}；实际起手{len(x['ready']['hand'])}，合成首抽{s['draw_first']}；遗物{','.join(x['relics'])}。",
        f"首试结局{x['observed']['outcome']}，净掉血{x['observed']['net_hp_loss']}，SL记录{x['sl_count']}；去向{x['disposition']}。",
        f"合成死亡率{s['death_rate']}，掉血{s['hp_loss']}；真实开场状态{a['status']}，死亡率{a['death_rate']}，掉血{a['hp_loss']}。",
        '入房：'+ref(x['state_source']), 'T1可行动：'+ref(x['ready_source']),
        '首试末战斗帧：'+ref(x['first_attempt_last_source']), '终局/退出帧：'+ref(x['close_source']) if x['close_source'] else '终局未知',
        '最早已定位：T1自由策略执行前合成首抽数量与实战手数不同；具体敌人HP/能力/能量/药表示差异详见fight-inventory.json该id。',
        f"原agent_view有牌堆，冻结缺失；ID/升级多重集 draw_equal={p.get('draw_multiset_equal','unknown/no-solve')}；原抽数{p.get('draw_raw_size','unknown')}，回放抽数{p.get('draw_sim_size','unknown')}。",
        'T1实打ID集合：'+','.join(x['T1_policy_comparison']['observed_T1_unique_ids']),
        '回放T1集合相同样本数（集合相同也不证明顺序相同）：'+str({v:sum(y['same_id_set'] for y in z) for v,z in x['T1_policy_comparison']['variants'].items()}),
        f"核过原状态{x['raw_frames_verified']}条、动作{x['raw_decisions_verified']}条；逐T1—T{x['observed']['turns']}投影及32种子序列见turn-alignment.jsonl。",
        '未知：真实抽序、未执行替线、各历史动态知识字节、模拟逐步动作/能力全轨迹、机制与策略因果贡献。后续按四份候选提案固定核验，不删难例。','']
(OUT/'fight-review.md').write_text('\n'.join(review))

table=['| 精英 | 首试场/独立局 | 实死 | 合成死亡率 | 实开场死亡率 | 实战净损→合成损 |','|---|---:|---:|---:|---:|---:|']
for enemy,vs in summary['by_encounter'].items():
    s=vs['synthetic'];a=vs['actual-opening'];short=enemy.replace('DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE','DECIMILLIPEDE三段').replace('PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER','PHANTASMAL_GARDENER×4')
    actual_rate=f"{100*a['sim_rate']:.2f}%" if a['sim_rate'] is not None else 'unknown'
    table.append(f"| {short} | {s['fights']}/{len(s['independent_run_ids'])} | {s['deaths']} | {100*s['sim_rate']:.2f}% | {actual_rate} | {s['observed_loss']:.2f}→{s['sim_loss']:.2f} |")
focus=['| 局/层/战 | 实净损 | 合成死亡率→实开场死亡率 | 最早可定位分歧/反例 |','|---|---:|---:|---|']
for x in inv:
    if x['encounter'] not in ['BYRDONIS','PHROG_PARASITE','INFESTED_PRISM']:continue
    s=x['variants']['synthetic'];a=x['variants']['actual-opening']
    reason='T1抽数与开场能力；低残差反例也有同缺口' if x['encounter'] in ['BYRDONIS','PHROG_PARASITE'] else 'T1策略集合；后续阶段未有动作匹配'
    if x['id']=='ET1QAZCV8GUP-f31-fight11':reason='T1牌身份：7+27对原7+21；策略也不同'
    if x['id']=='76VEDXJJ2PFL-f30-fight15':reason='同组低死亡残差；换真实开场掉血48.09→54.78反而增加'
    focus.append(f"| {x['id']} | {x['observed']['net_hp_loss']} | {100*s['death_rate']:.2f}%→{100*a['death_rate']:.2f}% | {reason} |")

report='''# Issue #4：Silent 精英模拟悲观偏差核查

结论：原52战统计可以重现，但尚不足以校准死亡概率或调整权重。本轮定位了比总残差更早的输入/选线差异：原日志牌堆被提取流程剥离；一场棱柱因战内升级身份扣不掉手牌而凭空多出六张抽牌；PHROG与BYRDONIS合成开场带入原T1未见能力。它们是可固定复现的表示缺口，不是已证明的悲观偏差因果解释。四份候选提案全部waiting，先由原ops安排有界固定核验。

## 身份、授权与完整性

- 唯一父问题：silent-elite-simulation-pessimism-20261021；issue=4；batch=issue-4-elite-calibration-20261021-104312。原issue仍OPEN，报告不能关闭父项。
- 本WT基线994cbfb26a7fe27ea491f87c6200f8b44a1db8d5，与输入base一致。原审计source66ff0722c53ce4606ee86a8d4374baf680231a42；其回放源码/知识固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。771份运行时/知识SHA逐一与该Git blob相符；不归档/展开整仓。
- 输入manifest SHA256=a51a989ddff82b615e3185c06f7f6d3bb8bc97abddfebe26ed43795b956ee011。全部99项路径、字节、SHA匹配，含53完整回放、7个敏感性原件、pilot、所有冻结输入及issue原文/原授权；不是只读三个分组或汇总。详input-verification.json。
- 原授权原件25ae2141a16fa4fc61c48d00943240a0a5fb3340bd6627d663c2d17606a34d25，问题注册冻结a71b80e35fe362a4abdd80cb66968095dc7d69b9d6c6c95cf4afaae5d9344f71；两者与issue描述绑定。没有新建同题学习要求、续批或agent。
- 按已知索引有界seek核回2345条状态、1546条动作、4条SL，合83,614,970字节；每条offset/bytes/SHA在source-index.jsonl。未遍历共享大日志、未查询/重建DB。106条入房/可行动帧逐字SHA相符；去掉原agent_view后其余内容和冻结帧完全相同。
- 所有计算nice19/ionice3，单Python进程，需Git读blob时最多再一子进程。本轮未执行MC、真实模型、网络、play、生产刷新、paper_dataset、tsc/vitest/full，也未改源码/知识/账本/配置/STOP/live/其他WT，未提交/上线。未修改或声称本原生会话档位生效。模型/账号/沙箱保持原样。

## 分母与条件

40局全部Silent A10，42份冻结run-config（含2份重启）覆盖40局且全部V5，29个不同config commit；dirty明细留run-inventory.json。run-config原行没有给出offset，本轮不扫描该共享日志；配置身份为冻结元数据已核，不冒称42原行重新seek核过。19局brain_source=codex、21局unknown（其中18局有精英）；未知不偷换成纯Codex战绩，不删除诊断样本。其brain原题原文无已知offset，本轮只复核冻结身份元数据，不扫描brain日志补证明。

33局有53场精英，另7局没有精英仍在run-inventory.json，不计作精英胜负。剔除34XTHUP4433X F24/fight13首试结局未知后52场、33个独立局ID、实死4场（7.6923%），合成均值30.2885%；实净损27.2308、模拟38.1190，差+10.8882 HP。模拟种子、回合、SL都是同局条件重复，不作独立实战或置信区间。这里描述的是已选择并实际进入精英的条件分布，不是所有路线/候选牌泛化概率。

34X F24原T2 predicted_death后回合重置，4条SL均实际reload成功；首试未执行到死亡，最终死不能倒记首死，全部尝试保留。BXU0CKWKH2RU F46 SOUL_NEXUS真实开场helper Error:no solve保留，合成仍可算。两组共同可用且未删失为51战、仍33局，实死4/51，合成30.8824%、真实开场17.4632%；净损误差+10.4969→+3.9737。不能把52战分母替换成51而不说明。

所有场均固定实战入场HP/牌组，不补未来拿牌；SOUL_NEXUS入房73到首个可行动75的2HP差记录为入场与就绪边界差异，原因未核，不把其算共同52组“开场HP全同”的反例。历史每局动态知识原字节仍unknown；本轮验证的是审计后时点快照与原实战的比较，不是历史同版本校准。40局起止、逐场历史提交、入场HP/牌组/升级/药栏、首试/SL均有完整清单。

## 全部精英结果与反例

'''+ '\n'.join(table)+'''

ENTOMANCER另有1删失场未计表中首试；SOUL_NEXUS真实开场unknown。DECIMILLIPEDE实死2/4高于模拟33.59%，旧日雕像实死2/9也高于模拟19.10%；不支持统一“所有敌人都悲观”的规则。四个实死原件为2Q6ZYZ6JHM0M F8、MRJ4E5HL3ZA9 F8（BYGONE），S5GZG328S1LN F28、U6JELGQTBMHN F28（三段虫）。原合成全死而实赢4场全部保留。

重点13场全部如下，逐场T1精确原字节引用在fight-review.md相同id及fight-inventory.json；另外40场也逐一有去向，无跳过no-solve、低残差或难例。这里的同组低残差主要指死亡率；BXU F15与76VED F30的合成掉血残差仍分别约+30.13/+30.09，不能称所有指标低误差。

'''+ '\n'.join(focus)+'''

## 最早分歧及归因边界

1. 原件到冻结输入：53/53原T1都有agent_view.combat.draw/discard/exhaust；extract.py调用parse_state_line主动切掉agent_view，prepare.py同样。成功的52场真实开场全部piles:deck-minus-hand。第一处可定位差异在回放输入构造之前，而不是抽到哪张后的策略。51场ID/升级多重集恰好相等，不能把剥离视图说成每场数值一定变，也不能称完整牌面等价；分组牌堆本身无抽序，未来抽序unknown。parse_state_line与backtest helper在原771源码/知识清单之外，本轮Git cf337有界代码对照与冻结结果吻合，但原helper运行时叶字节未知；原始字段丢失和34对28的事实不依赖该源码同一性推断。

2. ET1QAZCV8GUP F31T1：原常驻牌28、实际手7、原抽21、弃/耗0。手7均升级，但常驻deck仅其中LEG_SWEEP已升级。helper用ID+upgraded扣手，只扣掉它，得到抽27，加手7变34；STRIKE与SHADOWMELD战内升级也未正确表示。完整原视图有这些身份。此为同输入声明被直接反证；修复后的死亡率/方向未知，不能由0.75反推修正幅度。精确来源见下原件锚点与proposal-input-fidelity.md。

3. 开场敌人能力：七PHROG原可行动T1仅INFESTED_POWER4；合成还带MANGLE_POWER10、STRANGLE_POWER2。三BYRDONIS原仅TERRITORIAL_POWER1，合成另MANGLE_POWER5。源码使用common首见分子、Silent encounter分母，并只在见过该power的进阶内筛选，再跨进阶估计到A10；A10对应首见字段为空。component-findings.json静态复现选择条件，未借公共其他角色数据作为本角色游戏事实。STRANGLE原文本令敌逐牌失血，移除可能反而更悲观；不能将额外能力统称敌人伤害被抬高。后续阶段/意图仍需同动作前缀回归，不能从初始incoming52场相同排除。

4. 实战开场与起手：53场全部蛇戒，51场合成首抽比原手数少2；48场5→7、2场7→9、1场6→8，另2Q6ZYZ6JHM0M F8与79421JK2WBA9 F14持BOOMING_CONCH两场5→9、差4（共48个七手、4个九手、1个八手）。这是覆盖候选，但53场无无戒实战负控，不能仅由手数把所有差额无条件归蛇戒，海螺叠加条件也未隔离。45场3能7手的原描述与这份细分不冲突。遗物/药/敌HP/具体手牌同时换时不能称单因果。

5. 药水表示：合成仅排CHOICE/DRAW，不是全部不用药。实战MPW F11T1喝POWER并实打生成ABRASIVE；合成无对应随机来源，真实开场helper有来源但不保证同生成、同后继。0NMF实T1喝SHIP，冻结真实开场样本0到T7才喝。无药BXU F15低残差与无药76VED F8高残差同时保留。跨战药价与不喝反事实仍unknown，沿c514既有提案不重复登记。

6. 后续策略：用coreWindow.byCard.firstPlay只能证明T1首用ID集合，不证明顺序/次数完整匹配。25MF F28原T1是DEFLECT、FLICK_FLACK、MALAISE；32个真实开场模拟T1都额外FOOTWORK，最迟T1选线集合已经分歧。0NMF首轮实际POISONED_STAB/SHIP与样本集合也不同。BXU F15低残差样本32/32集合相同，仍不能当整战策略等价。340个首试回合的实帧投影/实际动作与32样本逐轮序列全部对齐到turn-alignment.jsonl；没有缺失的模拟全动作/能力轨迹就不能进一步指明哪一步执行机制错。

7. 阶段：25MF F28及ET1 F31都可见棱柱VITAL_SPARK从3到6、意图按原帧前进；但自由策略、药、毒及资源已不同，冻结汇总没有同动作逐步能力轨迹，不能把棱柱高残差直接定为阶段伤害参数错误。76VED F30同组低死亡残差，改实开场平均掉血反增6.69，尤其不能只调到低死亡率。

8. 测量：原净HP与帧采样累计伤害相差0.4808HP，仍解释不了约10.9差；原累计伤害残差+10.4075。另核得两个端点缺口：ET1 F9最后COMBAT42HP到首个非战斗39HP；2XCG F9从25到19。原净损分别4/35，按入场到退出为7/41；52战退出口径均值27.4038、残差+10.7151（仍悲观）。这9HP的事件/治疗归属unknown，若把它算累计损伤也须注明是跨边界净差而非完整事件总伤；未改原审计数值。死亡hpLoss按入场血和复活容量封顶，death_rate=1及hpLoss满血不是两项独立异常。死亡提前截断，不能用平均回合少说明策略好。治疗、尸体/召唤与净敌HP伤害口径不同，turn-alignment保留原敌人逐体投影，不把总敌HP突变归武断输出错误。

## 原敏感性结果、候选与下一步

七Eel旧实验全部核原件并保留：基线25%/34.183HP；只换首抽19.196%/31.491；只换能量不变；damageScale1为23.214%/33.790；真实开场禁随机药15.625%/30.045，含随机药14.732%/29.504。76VED F8原无药、48HP、7轮实赢净损29，合成81.25%、首抽单改84.375%、权重单改78.125%，是反对“一补抽/换权重就够”的固定反例。本轮未新增样本，也未将敏感性结果当新的实战分母。

四份scratch候选见proposal-drafts.json及各Markdown：输入保真、开场能力条件、蛇戒/药水表示、同前缀策略/阶段对齐。状态均waiting：待原ops原单点安排固定复现，不登记队列/账本，不启动任何模拟。每份带角色/进阶/版本、证据局层回合、旧/拟新行为、负控、按run独立时间后留出、消费者、误差/回退与预算。

优先顺序：先0MC恢复53个原T1输入与身份守恒；再最多8个窗口×3实际动作=24个确定转移，遇到无法识别抽序/随机后继即unknown停止。两个步骤各单进程、nice19/ionice3，分别10/15分钟预算，不跑full。之后若原ops确需量化，候选上限8窗×2输入×4固定旧seed=64样本、30轮/1500节点、单项一比较；本轮没有启动或新增许可。所有53场已阅，不能事后称某低残差场是盲留出；真正留出须后续未读独立Silent A10新局，至少8局是收集下限而非精度通过门槛。

棱柱阶段沿silent-proposal-e76e895381da5bfc，药水收益沿silent-proposal-c51468c5e8ba6668，删失/SL沿silent-proposal-da9575b27ac37dbb。普通紧勒接线沿04cbbf6b3a547aea/1b9e29122364fa68，其implemented/duplicate不等于本开场选择问题完成。0332接续诊断沿ecbd4b68c5fad954（原文件不可用，未读取其他WT补写）；CEN成功死亡优先/资源接续纯bug、P4、拿牌预测器都不替本issue因果核查或消费者验收。去重索引保留原提案身份和逐条队列SHA，本轮没有新正式ID。

## 异议、交付与开放状态

disagreements.json有三项明确prior/finding/evidence/affected_ids/next_step：D1纠正“真实开场保留原可用牌堆”的方法声明；D2限定“同种子配对故不影响”的外推，拒绝把它当候选增量已校准；D3纠正两场损血的终点定义，保留原数值并列退出口径。逐假设支持/反证/未知见hypotheses.json。其余新缺口不强行包装成对原审计的反对：原审计本来就没有认定单一机制根因。

宿主仍须沿既有CLI登记提案/异议并实际ops→watcher→Roy告知，保留各角色实际回执；本轮未写通知、未发issue、未ACK。issue评论排队或他人ACK不代本学习者已收到或Roy已知。ops发公开issue前再扫正文；issue-comment-draft.md仅放可公开结论，不含账号/内部主机信息。当前CARDbrain/REFLEXoff、P2移出均保持，本轮没有检改开关。

tests=null；merged=false；published=false。可复现的是静态字节核对、统计、输入差异与有限首轮集合分歧；机制因果贡献、校准参数、拿牌排名、自然采用和实战收益均未验收。父要求/issue继续开放，后续须实际知识发布、live祖先、内容SHA与消费者读回，再按原各角色通知回执验收；不能以本报告或CEN子修复完成关闭。

## 原件锚点与产物

'''
for id in ['ET1QAZCV8GUP-f31-fight11','JKDUL0AL0TW6-f9-fight4','BXU0CKWKH2RU-f15-fight6','MPWMW6P91U0B-f11-fight5','0NMF36KX3F7Y-f9-fight5','25MFNPAE37R2-f28-fight14','76VEDXJJ2PFL-f30-fight15','76VEDXJJ2PFL-f8-fight5','34XTHUP4433X-f24-fight13','BXU0CKWKH2RU-f46-fight20']:
    report+='- '+cite(id)+'\n'
report+='''
全部53场人读核查见[fight-review.md](fight-review.md)，机器完整清单[fight-inventory.json](fight-inventory.json)与CSV；全部40局见run-inventory.json；原件SHA/source-index.jsonl、input-verification.json、source-snapshot-check.json；统计static-summary.json、340回合turn-alignment.jsonl；代码解释source-excerpts.md、component-findings.json；提案/异议各有JSON及Markdown。result.json与artifact-index.json给最终产物哈希。原99件保持原路径，不重复展开历史仓库。gitleaks及最终WT核验回执在final-checks.json与扫描原件；任何误报按精确公开局号局部处理，原失败保留。
'''
(OUT/'report.md').write_text(report)
(OUT/'issue-comment-draft.md').write_text('''已复核40局/53场完整清单，原52战悲观残差可重现；尚不能据此校准或关闭 #4。

发现原日志牌堆被提取流程删除；一场棱柱回放因战内升级身份不匹配多出六张抽牌，部分合成开场还带入实际T1未见能力。四份固定复现候选均waiting，保留低残差、首试删失和no-solve。

报告与result.json：learner/runs/20261021-104418-def3aea5-81a4-47a6-85d4-5dd8fb129249-issue-4-elite-calibration-task/。
无源码修改、测试、提交、合入、发布或新增MC。实际知识发布与消费者读回仍待原闭环；三项科学异议须沿原通知链实际送达并取得角色回执。
''')
save('analysis-run-notes.json',{'method':'静态分析脚本自身断言，不是项目测试','tests':None,
    'initial_assertion':'原完整state与冻结state不相等；检查发现唯一删除的根字段是agent_view，106帧逐条一致；显式保留发现后核去除此字段相等',
    'noncombat_check':'非COMBAT原件仍有旧combat对象；compact有意置player字段null，未将其当战斗字段错误；COMBAT字段逐条核同',
    'repeated_static_runs':'修正分析断言与加入证据投影后重读相同已知偏移，无模拟、无原件修改',
    'current_run_model_effort_verification':'未读取原生turn_context，不声称档位生效，未修改模型/配置',
    'no_held_out_history':'53场全已阅，不作为未阅留出'})
print('rendered report, 53-fight review, hypotheses, four draft proposals, three disagreements; no production changes')
