import json,pathlib
O=pathlib.Path(__file__).resolve().parent
P=json.load(open(O/'assigned-proposals.json')); proof=json.load(open(O/'live-source-verification.json'))
base=proof['base']; when=(O/'report-time.txt').read_text().strip()
details=[
('89354805ee4d7e77','VLZ6CCT8AQ0A F35 T1、F43 T1/T4/T5、F45 T1/T4/T5',
 'F43神化已实现的同线/后续抽牌升级有固定回归；F45持有而未施放仍不能算已经升级。',
 '已核神化基础、六项升级、萎靡及候选说明均为live祖先；本战实际施放字段仍为null。其余卡的费用/下轮抽牌/弃牌自动执行交互缺完整配对验收，不能把已有子项关闭为整案完成。',
 '后续须冻结施放回执、战斗/SL边界及升级后副效应前后帧；未覆盖附魔、重放、费用恢复和跨轮效果保持unknown。'),
('f2bfceddb1898dca','VLZ6CCT8AQ0A F45 T1/T4，decisions269748/269754/269770',
 'T1药水MC 707ms、1/12；另题12/12不代表同一总预算对照。T4少损线13损/24伤；三条攻击线31损/32伤被列为并列全败。',
 '成熟度说明已有live源码；缺同状态、同模型覆盖、固定随机输入和同一总预算的配对结果及排名稳定性，无法从707ms个案校准预算/留药价格/目标顺序。',
 '保留原预算、药水与目标规则；预期验证采用独立进程固定随机输入的成本曲线，按局号切分，不能将不同题的1/12与12/12当处理组/对照组。'),
('283a164780d11e69','VLZ6CCT8AQ0A F35 T1、F43 T1/T4/T5、F45 T1',
 '与89354805同一实盘问题，来源任务是experience-update；原经验链接保留。',
 '同源升级与候选说明子项已上线，但实际施放消费链及未覆盖副效应/未知交互验收仍缺；不能仅凭经验链接或已有部分源码标整案duplicate。',
 '沿89354805原证据核验，不新建重复代码提案；后续须同时验实际施放、模型覆盖与消费者事实。'),
('ebbfe3b97548756d','VLZ6CCT8AQ0A F43 T1—T5、F45 T3—T5',
 'F43已建立能力与F45只持有能力分列；T5现场20挡、覆甲0、32血仍需39，未见敌退场。',
 '神化、毒/减力等子项及观察字段已有实现；缺整个复合条件的同输入生产消费者联合验收、唯一敌实体跟踪和另一focus/休息的受控整场结果，不能拟合统一攻防或路线权重。',
 '逐源保留字段，先固定同一盘面的力量/敏捷/毒触发/覆甲/临时恢复；没有真实实体身份与未选路线结局时记录未知，不推断因果收益。'),
('e5b87be50f28f311','8JRE1C4H4Z2W F33首/三试T2、T1/T4能力、末试T11',
 '现离线消费者实读46条原决策：首/三试轮末净HP分别−3/−15，余像1/敏捷2/触媒1出现可追溯；末轮净损5与显示37−22=15分列。',
 '相邻观测与终局审计已验证，但缺重规划/自动动作全过程及同抽序未选线的完整执行结果；端点差不能认证整候选收益或拟合SL/护栏血价，父提案仍waiting。',
 '已完成的观测能力不再重复实现；未来补完整派发—响应—状态链并保留全部中断。0/24与5/24不同，净HP截断不当完整入伤。'),
('49632bc4878fb597','CA5KE8GFJ9X2 F13 T1—T5（重点T5）',
 '末T5两血、10挡，当前8力量喷水19、虚弱后14；完整需损4，当前2血差2。该战没有已建立的正敏捷。',
 '本局能验证力量/虚弱/独立成长的观测，缺正敏捷与这些修正在相同局面下的联合实际调用输入；不把别局单项回归当此宽提案完整验证，也不拟合攻防权重。',
 '保留现有公式；未来同角色带正敏捷和逐击修正的配对盘面验收，未观察组合继续标范围限制。'),
('66532328a585941f','5PM6JAQG6FNQ F33 T2、F39末试T2',
 'F33已建毒雾3/触媒1/群蛇4；F39未建毒雾，向无毒目标冒泡没有增毒。两战敌人和存活条件不同。',
 '缺同入口HP、同构筑和完整抽序下不同启动顺序的整场结果；F33已建并胜与F39未建而败不能给出启动/构筑阈值或可复现收益函数。',
 '持有、计划、实际能力分别记；观察审计子项不当启动收益学习完成，后续按局分组验证。'),
('43a76a31ba7bdcfa','61E2QS63Y9WU F17 T5/T6/T7',
 '吸取后玩家敏捷−2；T6两防御共6，触媒1和毒17仍在，毒结算与力量/敏捷分源。首试获胜。',
 '缺吸取负属性与毒的完整联合消费者对照、相同入口HP/构筑/抽序的可救活SL另线；首试胜不能校准SL范围或换线偏好。',
 '冻结实际负属性和毒，保留SL阈值；不将不同起点的旧失败套作本局反事实。'),
('5264153a4a4b0e5c','61E2QS63Y9WU F23 T1—T5（重点T4）',
 'T4本体线结束前幻象仍2血且15攻；后续退场与当轮净扣分开。39伤零损的另一focus仅为候选。',
 '现有召唤子项不覆盖本批A10航行成长/索引变化的全链联合验收；缺另一focus的后续实际线路，无法证明固定首杀或整场排序收益。',
 '所有目标选项保留、相同推演值并列；须按当前A10样本冻结召唤HP/伤害及实体变化，不借其他进阶样本补数。'),
('bddfa690a84e03d0','DUZUBAJ3A8GP F30 T1—T6，四次尝试',
 '自然睡3/2/1后醒，T6力量4、攻击22；四次相关尝试均败。',
 '该来源缺提前唤醒后STUNNED接续的配对帧和同抽序完整获胜另线；自然醒与四败不足拟合输出血价、固定杀序或SL偏好。',
 '按当前进阶、自然睡眠/醒来/成长记录，不把未观察提前唤醒分支补成确定脚本；SL尝试不扩独立样本分母。')]
results=[];parts=[]
for suffix,site,fact,reason,next_step in details:
 ident='silent-proposal-'+suffix; p=P[ident]
 results.append({'id':ident,'state':'waiting','reason':reason})
 parts += [f'## {ident}',f'来源：{p["source_task"]} → strategy-proposal；领域：{", ".join(p["domains"])}。',f'原文：{p["proposal"]}；已核SHA256={p["proposal_sha256"]}。',f'证据：{site}。账本：{", ".join(p["ledger"])}。',f'本次核实：{fact}',f'处置：waiting。{reason}',f'预期行为及验证：{next_step}','']
header=f'''# 静默策略队列逐项复核

记录时间：{when}
批次：20261012-144302-strategy-proposal。工作树：{O.parents[2]}。
基线：{base}。角色：silent；实际进阶A10。

仅处理派发的十个原ID。learn.json实际reason=proposal，含proposal_ids，无research_request/implementation_request/proposal_repair；根deck-size请求属于另一批。普通任务已执行git merge --no-edit main，Already up to date。开工工作树干净。未读其他角色知识、未启动游戏、未联网、未派下级。

## 证据与实际源码

六局runs.jsonl身份均为SILENT/A10且各一条。十份原Markdown全部SHA匹配，逐份原文保存在本目录*.original.md。26个原账本的角色、claim、历史链接已核，原始历史快照为ledger-history.json。

本批重点原始日志按字节偏移回读687条：VLZ状态146/决策139，8JRE状态46/决策46，CA5状态32，61E状态52，5PM状态109，DUZ状态117。不是完整六局全量分析。raw-manifest.json给出日志文件、偏移、SHA及可用行号；state-facts.json保留场景。全部字节/保存字段一致。既有夹具为字段投影，初版核验误用整对象相等而退出1；原脚本、失败原因保留，修正为递归逐字段及数组长度核验后通过，未降低SHA条件。

冻结live={proof['live_head']}。live-source-verification.json中八个源码提交全部为该live真实祖先，七条相关源码路径base/live逐blob一致。它们是既有子项，不是本批提交：

- 神化基础772b839f8ada31664cb764ea9ad3bdb03da27f64；六升级6e233ede76e5dd849f0d40760be64e7cdacf78b1；萎靡b2805be4ba44b7375c7908d873889372cc3cfe6c。
- 神化候选说明f98a929f24901c20efed462b29591e25ebb85451；模拟成熟度45161a51c2c6b7e4a499b13cf749c4108193bbf5。
- 相邻观测dc0e6080cb20c508d94c006648cc3edf0188d306；终局83512ddcd2c70fd9b983dc38524ff25c8970c1d3；护栏审计f1542578594462e9f9f4e175488795fc480a8a13。

## 神化未覆盖范围的补充核对

VLZ F43 T1场外猎杀者15基伤，T4手中升级为20基伤、当前2力量显示22；本轮没打猎杀者，不能把22记实扣。F45 T4普通猎杀者实打1770号决策的完整原行号为269770，敌48→31、能量3→1，新增DRAW_CARDS_NEXT_TURN_POWER=2，T5该能力消失。猛扑F43 T5 states275701→275702实扣16、能量3→1并出现FREE_SKILL_POWER=1；生存者后275703给15挡、该能力消失且能量仍1。F35 T2也看到猛扑使技能费用变0。它们说明仅添加数值升级表不足以认证完整机制。未把这些有限观察扩为未知费用修饰、跨轮持续/叠加或自动出牌规则；原神化未覆盖标记保持。当前副效应消费者缺口与缺证边界明确分列，不声称所有缺口都只是没有普通/升级配对数值。

''' 
header=header.replace('实打1770号决策的完整原行号为269770','实打决策269770')
footer='''## 样本、反例与验证口径

六局均为发现/复核样本，逐局而非SL次数计分母。本批不拟合常数、胜率或固定优先级；没有独立时间后置验证集。F43神化施放后仍损血、F45未施放败；F33能力已建立胜与F39没建立败；8JRE延长生存仍败，均不能隔离单一动作因果。未选方案只有预测时不当实际胜线。未观察进阶及其他角色保持原行为。

现有固定回归13文件99例通过（existing-fixed-tests.log/.rc），覆盖十个神化文件、观察端点、终局端点和护栏审计；知识读取由各既有固定测试隔离。本批未改任何源码，未运行完整tsc/完整vitest，也没有撤源码红绿实验；不能把既有测试通过说成本批新实现验收。

既有真实CLI learner/audit-selection.ts以冻结8JRE输入运行exit0，产出13段、46动作（audit-output-8JRE.json）。能力出现、首/三试轮末净损和末轮零血截断均可读；完整候选结果和因果归属保持null。没有更改消费者来迎合结果。

## 处置与回退

十个ID全部waiting，保留原提案和经验链接，不新建重复ID，不登记implemented/duplicate/shipped。只经根ledger.py为本批提案追加报告链接，status=proposed、by=learner:strategy-proposal，已有上线历史不删除。代码、知识、经验库、选择策略和游戏版本无变更；fixes=[]、merged=null。没有源码可回退；本次报告与既有失败历史保留。后续由原队列携具体补证/实现范围接续，不能以这份报告关闭量化父请求或其他研究请求。
'''
(O/'proposal.md').write_text(header+'\n'.join(parts)+footer)
report={'task':'strategy-proposal','character':'silent','batch':'20261012-144302-strategy-proposal','base':base,'runs':['VLZ6CCT8AQ0A','8JRE1C4H4Z2W','CA5KE8GFJ9X2','5PM6JAQG6FNQ','61E2QS63Y9WU','DUZUBAJ3A8GP'],'fixes':[],'skipped':[],'merged':None,'tests':{'tsc':None,'vitest':0,'cases':99},'code_proposals':list(P),'implementation_domains':[],'proposal_results':results,'report':str(O/'report.md')}
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text('# 本批完成报告\n\n'+f'时间：{when}。基线：{base}。\n\n'+'十个派发ID均已逐项复核，全部保留waiting。没有新源码、提交、合入或版本；工作树应保持干净。详细证据、反例、原账本、实际live祖先源码及逐项限制见 [proposal.md](proposal.md)。\n\n'+'已核原始记录687条；13个既有固定测试文件、99例通过，tsc未运行；未改源码所以没有撤源码失败/恢复实验。既有离线消费者以冻结原始输入运行exit0。初次证据核验的投影比较错误与修正原件完整保留。\n\n'+'本报告不宣称策略收益或完整父提案实现，不新建重复ID，不登记shipped。源码修改为零，故跳过合入流程、版本和上线通知。由运维核收本报告与逐项waiting理由；不将旧源码祖先记成本批提交。\n\n'+'```json\n'+json.dumps(report,ensure_ascii=False,indent=2)+'\n```\n')
updates=[]
for ident in sorted({x for p in P.values() for x in p['ledger']}):
 links=[pid for pid,p in P.items() if ident in p['ledger']]
 updates.append({'id':ident,'status':'proposed','by':'learner:strategy-proposal','where':{'proposal':[str(O/'proposal.md'),str(O/'report.md')]},'note':'20261012-144302-strategy-proposal逐项复核；原ID '+','.join(links)+' 保持waiting。原日志687条核验、既有固定99例通过；无新增源码/合入/版本，不关闭宽提案，不重复添加历史证据。具体限制见本批proposal.md；既有子项上线历史保留。'})
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
print('written',len(results),'results;',len(updates),'ledger links')
