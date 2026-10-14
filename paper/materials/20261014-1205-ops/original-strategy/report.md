# 静默猎手策略提案消费报告

本批10个原提案均为waiting。已核局部机制/代价，不新增策略源码或经验知识；没有新提交、合入、发布号、shipped或整项duplicate。完整处置与反例见[proposal.md](proposal.md)。

批次：20261014-114302-s2-strategy-proposal。base：`8ae20b998c2bdbebefae82a72dbcd0883d457312`；开工git status干净，普通任务git merge --no-edit main返回Already up to date。本批reason=proposal、角色/工作树/原十ID匹配，无纯研究或授权实现绑定，未读取其他专题或扩展队列。

六个锚点均由runs.jsonl、run-config和每条状态核为SILENT A10。冻结4167 states、4071 decisions、43 SL attempts、6 runs、6 run-config，共8293条原行，逐offset/长度/SHA及原字节读回一致。states只扫描至281000行、decisions至275000行，其余三文件按初始大小冻结；只声称这六个已结束来源局的选定日志，不声称全历史或其他局完备。原来源版本均带dirty，run-config只列脏路径，未还原当时完整dirty源码树。

七组实盘同盘对照核实：751 F17 T2为净损13→18/敌净扣9→18；T7为13→23/12→18；T13为8→2/17→11。KV F33 T5为0→0/36→29，T1为0→0/28→14。KEN F17 T10为15→21/2→4，T5为7→5/1→2且步法延迟。四组原行精确指纹检查及additional-fingerprints.json另三组均相同；这些是局部观察端点，后轮动作/抽序未固定，敌净扣不等于毛伤。

YQL F17 T10 states280160→280161毒2→8、HP26/挡13/自爆41未变，state280162死亡截断0。末态算术−2不是另一个死亡HP样本。KEN七次饮用逐槽位核验；274131/274237/274272回执为pending且后帧进入选牌，保留原回执与实际槽位变化分别解释；不能把pending改成completed，也不能把消费记录当完整候选收益。六次boss入口均75血空药。

38项固定日志断言通过（evidence-verification.json），八条现有消费者有界读回完成（consumer-readback.json）：三条YQL巨兽状态、三局旧SL占位HP/排序、一个明确控制输入的派发回执、一个显式null药水表控制输入。仅现有函数读回，不是新源码测试、完整战斗模拟、当前自然大脑采用或策略验收。控制回执不是历史真实completed；holdHp=null不是实际零价值。

source-coverage.json核12个相关源码提交均是实际live祖先；9文件与当前live逐字节相同，explore/controller/combat-plan三文件有字节差，原差分另存.patch，不笼统宣称整树等价。已核子范围：持牌未决/未知药价/候选资源/B2差/选择和单动作回执/巨兽快照展示。selection_audit.actual_turn及单动作实际整轮仍null；anchorRank同轮仍用raw enemyHpLeft。既有源提交和字段不认证这10个原宽提案已完整实现，因此均不登记duplicate。所有本角色已观察规则、其他角色及未观察等级保持原行为。

| 原提案 | 证据定位 | 处置/缺口 |
|---|---|---|
| silent-proposal-366288801d9150d9 | 751FN9QM9MHQ F17 T2/T7/T13；账本silent-0079、silent-0176 | waiting：751 F17三组局部血价充分；缺跨抽弃/续问的完整候选归属、保持后继一致的整战及独立后期校准，不能拟额外失血门槛。 |
| silent-proposal-85929bdfc8a3fc1b | 751FN9QM9MHQ F13 T3、F17 T7/T13/T17；账本silent-0019、silent-0021、silent-0005、silent-0007、silent-0129、silent-0176 | waiting：751持牌未决和药水未知展示已有；缺F13无药或留到F17的完整支线，以及毒/荆棘/重问后归属，不能校准药价或弃牌规则。 |
| silent-proposal-efd9f83ee9e1a6dc | 751FN9QM9MHQ F17 T2/T7/T13；账本silent-0079、silent-0176 | waiting：751经验提案局部成本已核；完整实际资源归属、受控整战与独立后期验证不足，已有子诊断不能关闭原经验提案。 |
| silent-proposal-131042659448ae74 | 751FN9QM9MHQ F13 T3、F17 T3/T5/T7/T17；账本silent-0019、silent-0020、silent-0021、silent-0005、silent-0006、silent-0007、silent-0046、silent-0129、silent-0176 | waiting：751能力与资源结构展示已有；跨重问完整执行、逐轮能力兑现和无药/留药跨战支线未联合验证，不能登记整项duplicate。 |
| silent-proposal-990f054036609447 | KV0JHNJCKXLS F33 T1/T4/T5；账本silent-0102、silent-0019、silent-0020 | waiting：KV F33两组同盘净资源已核；缺敌回血/毛伤的完整归属、候选末端认证、受控完整后继及路线/休息反事实。 |
| silent-proposal-e18d3f18e6cac2a0 | YQL8RZ8BWN1E F17 T10/T13；L9SGRBB5R698 F17 T14；PU80F84P6HPN F17 T17；账本silent-0017、silent-0250、silent-0011、silent-0027、silent-0046 | waiting：三局巨兽阶段事实充分且展示已有；anchorRank仍比较原占位血，缺新排名的受控完整后继、最终资源适用校准和独立验证。 |
| silent-proposal-9733bb80f445aeae | YQL8RZ8BWN1E F17 T10；L9SGRBB5R698 F17 T14；PU80F84P6HPN F17 T15/T17；账本silent-0017、silent-0019、silent-0020、silent-0250 | waiting：YQL残壳增毒而HP/格挡/自爆不变已核；缺提前喝/不喝/留药与新参考排序的整战对照，PU旧胜线不能认证新策略。 |
| silent-proposal-c51468c5e8ba6668 | KEN58SH9SLZ6 F3 T2/F4 T1/F5 T2/F11 T1,T2/F15 T1；账本silent-0019 | waiting：KEN七次耗药充分；随机选牌/重问后的完整候选净收益及F15不喝、留药到boss的受控支线不足，不能校准跨战预算。 |
| silent-proposal-86a7db08d1a31976 | KEN58SH9SLZ6 F17 T2/T5/T6/T8/T9/T10/T12/T13；账本silent-0079、silent-0021、silent-0125、silent-0005、silent-0176 | waiting：KEN T10血价与T5能力延迟已核；缺完整伤源/能力归属、保持后继一致的整战及独立校准，保留HP护栏与探索规则。 |
| silent-proposal-e282a9131b99129a | KEN58SH9SLZ6 F17 T2/T5/T10，经验关联项；账本silent-0021、silent-0079、silent-0125、silent-0176 | waiting：KEN双向取舍充分；六试相关，缺完整后继反事实和独立后期校准，不能由子诊断关闭原经验提案或拟统一血价。 |

新增/修改源码为零，故tsc/vitest/cases均null；未执行撤生产源码失败/恢复测试，未跑沙箱源码套件，不引用旧批测试作本批绿。本批证据脚本初稿错误把历史result字符串当对象，原AttributeError及包装cat返回0的区别保存在verification-initial-failure.txt；修正后Python实际exit0/38断言通过，失败原件保留。这是本批取证脚本问题，不是生产策略回归。

学习台账仅经根ledger.py update追加本批proposal/report链接及逐项waiting说明；不改旧claim/status/evidence/version/first_run/effect，不重复增加历史支持，不把原账本shipped状态当原宽提案完成。code_proposals沿原十个CLI id；未add重复id。原规则没有实际上线变更，未制造eval版本或规则上线通知。

交运维：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-114302-s2/learner/runs/20261014-114327-strategy-proposal/proposal.md；/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-114302-s2/learner/runs/20261014-114327-strategy-proposal/report.md。所有waiting保留，需同角色新证据补足完整候选后继、同资源受控整战/留药分支与独立后期验证。当前框架和局部事实充分，不代表量化学习父要求闭合。

最后机械核验见completion-verification.json与ledger-update-receipt.json；最终JSON见report.json。生产工作树保持干净、HEAD保持上述完整40位base，fixes=[]，merged=null。

补充最终读回：16条旧支持字段SHA均保持，提案/报告路径和notes中的本批注记均读回；十原id角色/SHA/链接机械校验无问题，git status干净且HEAD未变。gitleaks实际exit0，扫描约140.85MB未发现泄漏。最终读回初稿曾查note而非fold的notes，原诊断保存在completion-initial-failure.txt；只修校验读回，没有重复更新台账。
