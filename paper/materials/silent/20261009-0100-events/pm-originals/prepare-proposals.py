import json,subprocess
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-001302-postmortem')
ids=json.loads((P/'ledger-result.json').read_text())['added']
texts={
'proposal-strangle':'''# 普通紧勒逐牌失血的实盘补证与推演接线

角色：静默猎手 silent。直接证据进阶A10；已有首证Y6GM2CHWJBEY为A0，升级与其他角色不外推。来源任务postmortem（20261009-001302-postmortem），实现任务strategy-proposal。账本silent-0260（旧bug、observed）与silent-0261（机制文字已上线S1.exp102）。授权关联Roy-2026-10-07-learning。本任务不改源码，不登记implemented或shipped。

证据：LY83ZMTFVKJH，运行049dff24+dirty，F21虱虫之祖LOUSE_PROGENITOR。T7 d300482原完整紧勒STRANGLE→偏折DEFLECT报8伤，s308030→308031→308032敌77→69→67，实10。T10 d300493原完整紧勒→匕首雨+ DAGGER_SPRAY+→偏折报20，s308041→308042→308043→308044敌40→32→18→16，实24。T7后s308033、T10后s308045紧勒层消失。本局两次都是无敌挡、普通未升级紧勒；药水、叠层、穿挡或重放没有隔离实盘。原机制证据Q6M2Y34MWKRE F8T4、Y6GM2CHWJBEY F4T1用于回归，账本保持其原首证、先验与历史。

当前只读live基准3541bc5477eda9604f7aec4c1ea46476570a2f79：agent/src/reflex/card-model.ts:1036卡牌效果对象，agent/src/reflex/combat-plan.ts:745敌能力读取，agent/src/reflex/turn-solver.ts:1734逐牌resolveEffects及后续触发区，未见普通STRANGLE效果/STRANGLE_POWER读取/牌完成后扣血接线。这些行号不是对当时dirty源码的复原。notes/fix-queue-v4.md:793已有silent-0260，关联原silent-proposal-1b9e29122364fa68；新登记是本局补证，独立实现任务应先核该既有链，合并证据处理，不重复造成功或另开平行实现。

旧行为：紧勒当作本体攻击，后续技能或攻击附加失血漏出候选伤害与多轮推演。拟议行为：普通未升级紧勒的本体攻击结算后建立本局观察到的2层，后续单次手动攻击/技能完成各触发2；紧勒自身不吃新建层，下一轮清除，接续真实帧已有STRANGLE_POWER时也读取。抽牌/弃牌选择完成前不能虚构触发完成，药水不当卡牌；尚未覆盖的穿挡、叠层、升级、自动出牌、重放、定制疯狂科学MAD_SCIENCE标未知、保留原边界，不能照搬普通2。

拟合方法与切分：本项修复不拟合游戏常量，数值只取观察字段及已有机制证据。Y6、Q6为较早固定回归，本局T7/T10作为后来保留验证；同一局两轮不是独立整场胜负样本。先固定帧复现8→10和20→24，再验证中途真实层读取、技能选择完成时点和轮末清除。采用已核实无挡范围；缺穿挡等证据时不扩建完整通用规则。

反例与限制：定制MAD_SCIENCE曾给6层，不属于普通紧勒2；本局T12敌有18挡且只剩4血，没有实打紧勒穿挡的反事实线。不能因为T10少算4便声称修后必胜。另T6先预测损7后重算/实损9、T12预测损23对现场需24尚未定位，不能并入该bug。

验证与预期影响：固定日志候选伤害与实盘对应，防止技能附加伤害遗漏影响杀线和Jev题面；对没有普通紧勒及无对应层的牌组保持原行为，铁甲战士保持等价。实现任务按仓库沙箱测试要求验证，不能运行play。回退：独立实现提交可整体回退，保留本提案、账本和失败输出，不删除既有证据。实际上线后才由实现任务记录唯一eval版本并按授权双通知Roy。
''',
'proposal-unknown-card-value':'''# 顺走牌的未知HP换算与可见构筑损失分开表达

角色：静默猎手 silent，直接规则证据A10。来源任务postmortem（20261009-001302-postmortem），实现任务strategy-proposal。账本{flat}（新的正卡值但HP斜率负的估值案例）、{swipe}（顺走/返还机制）。授权Roy-2026-10-07-learning。规则域combat、terminal、structure。本任务只登记，当前选择规则保留至独立验证；不标implemented或shipped。

本局证据LY83ZMTFVKJH，运行049dff24+dirty，F20偷窃草蜢THIEVING_HOPPER：T1 s307971→307972出现SWIPE_POWER1、升级无休手斧THRUMMING_HATCHET+离开永久牌组；T2 d300426题面已知道携牌和4轮后逃走。知识恶魔KNOWLEDGE_DEMON估值1000样本，bossLeft.with336.507，移除卡牌多21.464±0.9731至357.971；进场HP斜率−0.2843±0.0417，hp=null/status=flat。候选显示loot cost 0，Jev以原推演最优选直接结束；另一同题肾上腺素+ ADRENALINE+→匕首雨+ DAGGER_SPRAY+预计12伤，但各线都0/8击杀、8/8带牌逃走。T5 s307987→307993实际50→44→38→30，s307994奖励帧为逃脱结算，手斧直到s308053死亡不返还。

只读live基准3541bc5477eda9604f7aec4c1ea46476570a2f79：agent/src/sim/thief-card-hp.ts:124给负/无有效HP斜率flat、hp=null；agent/src/reflex/thief.ts:314通过(hp ?? 0)>0筛掉未知，agent/src/reflex/thief.ts:460将null输出loot cost 0。这里是既定HP目标表示与已测卡进度不一致的规则/结构问题，没有独立定位为新的纯bug；不冒称重建运行dirty代码。

旧行为：只有可换算正HP价值进入失窃代价；未知换算在题面与评分入口呈现零。拟议新行为：区分已证零值（不显著/卡值为负等原分类）与hp未知；未知题面同时显示失窃卡、可见卡进度差与误差、预计逃脱概率和未能换算HP的原因。保留三者各自单位，不能把21.464敌血当21.464玩家HP，也不造固定保牌价格。候选推演需检查失窃携带卡是否在逃脱后从后续模拟牌组去除；暂缺、战后返还与逃脱后持续缺牌分别记录。若当前后续推演已正确去牌，就只修信息表达和审计，不能无证据重复罚分。

策略修改作为待验证假设：在相同显式HP成本、相同已观察信息下，检查带来更多可见进度且能改变携牌退场窗口的方案；本局所有展示线都预计逃脱，不能据12预测伤就优先强制打这条线。有HP代价差的救牌线缺受控数据，暂保持现有选择行为，只把未知保留到题面/排序诊断中。独立任务不能凭事后虱虫死亡向在线模型补下一场敌人信息或规定恒定必保手斧。

先验证同角色的更早反例：PU80F84P6HPN F19T2 d247224的普通FOOTWORK为worse_with，卡进度−3.338而HP斜率0.7332；5X2GHKJ89PN1 F19T2 d248287的SKEWER为worse_with，卡进度−7.752、HP斜率1.7829；不能把这种已测非正价值混为本局flat正卡值。NB8KCF6HRGVF F21T2 d247822的BOUNCING_FLASK+为正常hp20.7，并在T6战结束后返还；不能把暂缺当永久丢牌。三个旧局是时间较早的分类回归，本局作较晚保留验证；它们不是本局救牌反事实，也不用于估计固定牌价。

拟合/时间切分：先无参数分类与单位检查，不基于本局死亡拟合惩罚权重；固定原估值及候选，验证null不等于0、负卡值分类保持、正常换算保持、临时牌与最终永久牌差保持。若要改变排序，须独立任务用已有同角色多局按时间分训练/保留验证并说明未知状态，数据不足保持原选择。多条候选的8样本和同一局不是独立总体胜率；该知识恶魔没有本局实打，不能把模拟21.464视为因果卡值。

预期影响与验证：先让Jev/策略看到“血价未知且进度损失可测”，避免把未知误读为没有损失；审核不重复计失窃损失、逃脱不是击杀、后续牌组与实盘一致。铁甲战士及其他未观察进阶保持等价。按固定数据与仓库沙箱测试验证，不运行play。回退用独立提交整体回退，不删提案及观察；实际上线后再登记版本和双通知Roy。缺完整dirty源码、可赢救牌实盘、未到知识恶魔及手斧对虱虫胜负的受控证据，均保留限制。
''',
'proposal-retirement-resources':'''# 同族退场窗口、SL弃牌重算与相邻战斗资源分账

角色：静默猎手 silent，直接证据A10。来源任务postmortem（20261009-001302-postmortem），实现任务strategy-proposal。账本silent-0209（退场窗口的support，既有S1.exp109）、silent-0019（资源/路线的support，当前知识版本S1.exp111并非开局版本）、{grow}（虱虫成长机制）。授权Roy-2026-10-07-learning。领域combat、sl、structure。本任务不改排名常量或源码、不标implemented或shipped。

战斗证据LY83ZMTFVKJH，运行049dff24+dirty。F17同族KIN_FOLLOWER／KIN_PRIEST第2/3试T5均50血、信徒38、神官147。d300335原plan6手斧THRUMMING_HATCHET打神官，SL替为plan4打信徒，预计两线20伤、损11/10、calwin0.2%/1.2%。两试SURVIVOR后都弃STRIKE_SILENT，重算中和NEUTRALIZE目标与防御DEFEND_SILENT；实际各14伤、损5。s307815→307821与s307878→307884轮末分别信徒35/24、神官136/147。第三试T6结束信徒、第二试T7才结束；对应T7实损0/10、下轮HP36/26。第三试T14胜出11。后续行动和药水手位不同，不能把胜负归于手斧一次目标调整。

当前live基准3541bc5477eda9604f7aec4c1ea46476570a2f79已有focusLines（agent/src/reflex/combat-plan.ts:392）、SL explore与替换路径（:2050），不是“没有集火或SL”bug。旧审计口径容易把原候选、SL替代候选、弃牌后重算、实际派发与继续步骤当同一整线；本局20预测与14实际就是需要阶段关联的证据，不认定现有重算本身失败。

拟议新行为：把决策/SL替代/抽弃选择/重新推演/实际行动按同一尝试和回合关联；题面保存目标每个敌的剩HP、挡、预计退场窗口与对应HP价，标明候选是否完整执行。退场时间及当轮伤害分别展示；待验证的候选评价只检验是否减少下一轮存活威胁，不写“永远先杀信徒”。若抽弃改变计划，原B2/伤害不当实际执行评估；续步重算保留已有正确逻辑。

SL规则限制：首试T10、第二试T13判死，sl-attempts:1236/1237在结束回合前恢复；相应HP6→77、11→77，恢复槽0同一CUNNING_POTION，不计回血或再获药。第三试T14胜；本局没有F21 SL尝试，不能据此改判死或准入阈值。实现任务只给探索记录和执行血价核验补关联，除非固定实证验证了候选排序改动；不得增加无证据强制SL。

资源证据：第三试F17离场11/77；s307933→307934跨幕实回52至63；F19 EXOSKELETON从63因BLOOD_VIAL补2至65、无战损并得槽0 SKILL_POTION；F20从65补2至67、损6离场61，喝技能药且手斧失窃，敌30逃脱；F21 LOUSE_PROGENITOR首帧61、空药、无手斧，血瓶补至63后死亡。d300390路线F19/20/21投影63/52/41，后b9352更新F21为54、b9353为61，实际首帧61。准确到达血量没有保证战胜成长敌。本局虱虫四次成长力量7/14/21/28、补挡18，末猛扑44被中和+降33，玩家1血9挡、敌仍4。此前A6成长5/10仅为机制首证，不能换成本局数字。

结构提案：资源记录按每一场（包括赢战和逃脱）保存入/出HP、max HP、带槽药、实际回血触发、净HP、永久牌组差、奖励、休息和跨幕；SL恢复独立类别。投影对照附制定时间、条件和后续更新，缺boss时钟就保持null。已有resource_chain.py已能提取，本任务保留其JSON与原帧校核；实现任务先检查已有数据接口是否已满足，已满足只补诊断关联，不重复实现。这里没有药水新规则，不设置potion域；没有给F48→F49或未到boss补数据。

拟合与样本切分：不以第2/3试同seed当独立训练与验证，它们共享前缀且后续受干预。LY只作成对过程检查；silent-0209较早四花园幽灵鳗旧证据用于退场窗口的概念回归，不能套其数值或固定目标排序。机制首证2SU6XN2AEJRD A6与更早R3AJCGQGGMR4 A10短战用于进阶分层对照，本局长期窗口保留验证。若要拟合排名项，需在独立任务检查更多本角色同条件局、按时间留出验证；没有足够数据时保留现有排名，仅补事实诊断。

验证与预期影响：固定重放只验证同族T5计划/执行阶段、T6退场与T7损血的关联，以及11→63→65→61→0每段资源（最终入场触发63另列），不声称反事实必胜。检验SL同瓶恢复不重复计、逃脱不当击杀、净HP不当总受伤、未走点不当实到；当前其他角色与铁甲战士保持等价，按仓库沙箱检查，不运行play。回退独立提交并保留全部提案与原始记录；实际策略上线后才登记唯一eval版本与双通知Roy。缺完整dirty源码、前两次退出帧、两线完全同后续的整战对照和可执行最优线比例，不补造。
'''
}
links={
'proposal-strangle':(['silent-0260','silent-0261'],['combat'],'补普通紧勒真实2层与逐牌失血接线；核本局T7预测8实10、T10预测20实24，先合并既有bug提案链，未知边界保留。'),
'proposal-unknown-card-value':([ids['失窃卡未知血价'],ids['顺走与返还机制']],['combat','terminal','structure'],'失窃卡hp未知与已测构筑进度损失分开表达、核逃脱后牌组；本局正卡进度21.464但负HP斜率，先分类与题面验证，不设固定HP牌价。'),
'proposal-retirement-resources':(['silent-0209','silent-0019',ids['虱虫蜷身成长机制']],['combat','sl','structure'],'关联同族SL目标调整、弃牌重算和实际退场血价，保留每场胜战/逃脱/跨幕/SL资源链；无受控胜负证据时保留当前排名及准入规则。')
}
for name,body in texts.items():
 path=P/(name+'.md')
 path.write_text(body.format(flat=ids['失窃卡未知血价'],swipe=ids['顺走与返还机制'],grow=ids['虱虫蜷身成长机制']))
 ledger,domains,summary=links[name]
 payload={'character':'silent','ledger':ledger,'runs':['LY83ZMTFVKJH'],'source_task':'postmortem','target_task':'strategy-proposal','domains':domains,'summary':summary,'proposal':str(path),'rule_changes':True,'authorization':'Roy-2026-10-07-learning'}
 (P/(name+'.json')).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 print('已保存',name)
