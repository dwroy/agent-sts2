# 静默策略学习回报

回报时间：2026-10-14 17:09:25 CST。批次20261014-164302-strategy-proposal；本批普通队列十个原提案逐项完成处置，宽范围全部waiting。本地只完成药槽观测子项；合入live因六处记录冲突失败，已成功abort，未上线。

## 源码、验证与合入

- 完整基线：f2e63a4085672b2948f6a7ff2c10b4da651da09a；源码提交：621843e15e15c4e96bbe9671c58cfcbfb7220661；当前工作树干净，scratch材料为忽略项，未推送。
- 新增离线药槽观测：原动作快照保留药栏，连续同尝试端点核唯一槽ID变化，单列显式用药/丢药请求与身份/回执。null保留未知，不认证变化来源、完整候选或真实用药效果；其他角色原拒绝边界保持。
- 固定GXN F45T2/T3证据六决策/六状态，source SHA见夹具及evidence。撤去两源码文件：exit1、4失败/1过；恢复后：exit0、原8＋新5共13过。日志cases-source-removed.txt、cases-source-restored.txt。
- 源码侧bash tools/test-sandbox.sh exit0：tsc0；Vitest391文件3817项＋paths1文件11项＝392文件3828项全过。固定排除名单沿原脚本；不声称宿主完整suite。新提交前gitleaks对确切暂存diff扫描exit0。源码撤/恢复、工具准备失败和全部测试原日志保留。
- live锁内刷新路径为空、与五个源码路径零重叠；无刷新数据提交。premerge=c268cf3a5b1a299c2da52edeb5748ace5ea2a566。git merge SOURCE产生六记录冲突，git merge --abort exit0；最终live仍同premerge，源码不是实际live祖先。未执行live合后tsc/vitest、未登记shipped、没有eval版本或游戏规则双通知；合入失败原件git-live-merge.txt/live-merge-result.json保留。
- 具体冲突：notes/fix-queue-v4.md、notes/strategy-v5-dpr-health-20261013-dispatch.json、ops/inbox-dev.md、paper/materials/20261014-v5-boss-revalidation/ops-binding.json、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl。按任务冲突就停止的要求不解冲突/不盖刷新/不整叶替换；交ops沿实际源码接续，不能提前将父提案implemented。

## 证据及消费者读回

四局runs.jsonl均SILENT A10。4489原行逐流source_size与逐行offset/bytes/SHA/JSON回核通过：2194状态、2105决策、21SL、4config、24run计划、137真实Codex脑行、4runs；fight-plans本截点筛选0行不是缺日志结论。源流末端无未完整行，states/decisions各2及brain1非法行属于全源扫描统计，不能当这四局缺帧。

两全量消费者因4条无decision_id路线元数据拒绝的exit1及stderr保留；在缺行处分为连续跨度，原行号不重排、不跨缺行连接。两无缺ID局全量、另两局的原行跨度共8次消费者exit0；共2101有效动作、483题段，594可见/1507未知相邻区间、70可见/282未知整轮。33次无来源归因药槽变化、29显式请求，完整候选结果全部null是尚未认证，不是证明没有候选完整执行。31项固定材料断言为证据校验，不能冒作生产测试；其结果material-checks.json。

同局SL为相关探索，不拆独立局、不拟合安全血线、药水持有价或终局权重。历史dirty源码标识及runs里的旧deepseek字段原样保留，不拿本次新模型重建旧执行树；所有137脑行实际engine=codex。当前启动命令核gpt-6.1-sol，不自行改运行设置。

既有源码十提交均核实际live祖先，11个相关源码路径逐Git blob/物理SHA核实；card-model/passive-pieces原角色注释分歧保持，本次未触碰。现有Demon输入、阶段选择/单动作回执/HP护栏/SL资源/整轮消费者等都是子域，不能关闭宽父。原f54的“完整护栏实线省8血/20伤”与弃连续反弹后重问原帧不相符，异议保留；既有abf63faa通知的ops/watcher/Roy三回执均实际读SHA相符，不另造通知或代ACK。

## 逐项结论、反例与缺数据

- f54e8de2381c1250（silent-0125）：MTQ0 F11T1原候选14/6损、14/16伤已被现有审计保留，但d282139实际丢连续反弹，d282140重问走迷雾；整轮损6/敌90→70含已结毒且有残毒3。原稿将此视完整护栏实线20伤、省8血依据不足。不能把候选伤16对整轮20当模拟bug或实省8。既有abf63faa通知链保留，不重复异议/代ACK；完整执行/实线最优比例仍未知。
- 763a4b9d9f17b815（silent-0005/0006/0011/0013/0044/0046/0053/0080/0087/0189/0214/0222/0235/0253）：MTQ0 F23T3速度建5敏、19/29挡分条件；7X0 F31能力/阶段等与已核公式分时点，当前模型和新磨蚀接口有真实live子实现；十四机制整包/未知修饰/完整消费者校准未完成，不把子项当全部duplicate。
- 19a5cff2094e2d8f（silent-0021/0064/0079/0133/0125）：MTQ0 F23末T3损0→8、候选扣13→19，T5实死；7X0 F31阶段血池和重接必须分账。缺同抽完整原线/替线受控终结及校准，不由24/24饱和死亡拟阈值。
- 3540bf4360bf80af（silent-0019/0020/0243）：MTQ0 F17→18 19→59、7X0 28→61已到回复和SL恢复分源；缺路线/休息实际题面的完整消费者对照及替路线/休息锻造结果，不改安全血线。
- 0ea5c0b9c030fdd6（silent-0274/0247/0027/0016）：KFR F33T7三牌用满后奇巧爆发剩1能仍锁、毒37→43当步敌159不动、后85结毒至74；现有奇巧额度与同组合毒6输入源码真实live祖先。完整合法后继/排序条件仍continuation_verified=false，没有换对象/提前喝毒整战结果；不能整项duplicate。
- f915ec544ab94b6e（silent-0079/0125）：KFR F33首/三试T6同15血/228敌/36毒/3覆甲，后9/3血、敌145/135；多伤10多损6而两线都败。F12护栏候选0损在斗篷生成小刀后重问，实际换线损6；已有阶段/单动作/整轮审计，缺完整执行归属及成对整战，不能调权重。
- 8fb51933639faf90（silent-0005/0006/0027/0189/0276/0277/0278）：KFR F28T2敏捷药及F33覆甲/触媒/肉/力量/毒药，窄毒6已实现，不再沿用旧只覆盖双boss的理由；七项联合模型读回和覆甲完整减层条件/未见修饰仍缺证，宽项waiting。
- b3bc0eb09211af6c（silent-0021/0079/0102/0247/0274）：KFR F33合法兑现、SL血价及最终敌74未终结已核；奇巧事实/窄药/阶段/资源比较已有，完整合法序列/真实终结/换对象和顺序反事实未认证，保持终局规则。
- fdc3a505fe5e1a55（silent-0019/0020/0243）：KFR F29后赢战血价，F32入36、F33可操作38，计划投影70不能当实到；有回血六次仍敗不证明休息选择错。缺路线/休息题面的分源消费闭环及受控对照，SL恢复不算路线回血。
- 5a95725089f53cd8（silent-0019/0079，辅助0005/0016/0087/0027/0030）：GXN F45两次T2同盘3/13血、0/7带挡及敌8血差与两线都敗；原least-loss−2是13−15，现有代码正确。本次只交药槽观测子项，尚缺逐击复活帧、完整候选归属、非战斗奖励/丢药/SL恢复全资源来源、整战及路线反事实；宽父保持waiting。

以上十个ID的原Markdown及队列状态不修改；source-preflight.json/ existing-source-ancestry.json记录实际源码blob及live祖先。没有把既有shipped机制改回proposed，没有代ops登记shipped。最终proposal_results逐项如实waiting，子项代码/实际合入另记。


## 台账与后续边界

只经根learner/ledger.py update追加本批提案/报告及本地源码链接，旧claim/status/version/evidence/首证/prior不改，不新建重复代码提案ID。未标accepted/shipped，未修改原十Markdown或根请求/dispatch。旧经验库数据未修改，未冒称量化学习入库/大脑采用或收益。code_proposals仍为十个原CLI ID；父项仅waiting。

运维材料：本工作树proposal.md、report.json、live-merge-result.json、git-live-merge.txt、source-preflight.json、existing-source-ancestry.json。合入接续时保留刷新/并行记录，实际live祖先/合后固定检查通过再登记；不将本地commit当已发布。回退本地增量只撤五个本次叶，原日志/证据/失败及其他知识不删。未完成研究和工作树保留，不自回收。

验收补记：根ledger CLI实际31条update均按物理行/offset/bytes/SHA逐一读回；全账本475项0问题。本批新增行仅by/where/note（及CLI op/id/ts），没有改claim/status/version/evidence/首证/prior。live合并abort后11个核查源码物理SHA与合前完全相同，新增测试不存在、工作树status与合前相同；当前学习者HEAD为621843e15且干净。
