# 策略提案批次报告

时间：2026-10-13T21:27:18+08:00。角色silent，批次20261013-210730-s2-strategy-proposal。

十项均waiting，fixes=[]、merged=null。没有源码/知识/规则修改，没有提交、live合入、eval发布编号或shipped登记；tsc/vitest/撤源码失败与恢复通过均不适用，tests三项为null。证据不足不作实现成功；本批不关闭经验/量化父要求。

base：`2a92800f92b4954b15f6cd08ce2a0baddb22426b`。工作树启动干净；按普通批次同步main后HEAD未变。dispatch与原文SHA见dispatch-and-proposal-manifest.json；对应队列原行见assigned-proposal-rows.json。本批没有专题研究或实现请求绑定，不适用research_complete或其冻结专题字段。

## 已核证据

| 局号/层/回合 | 原实伤/损血 | 替线实伤/损血 | 结论边界 |
|---|---:|---:|---|
| 751FN9QM9MHQ F17 T2 | 9/13 | 18/18 | 后续动作不同：3,4,5,6,7,8,9,10,11,12,13 |
| 751FN9QM9MHQ F17 T7 | 12/13 | 18/23 | 后续动作不同：10,11,12,13,14,15 |
| 751FN9QM9MHQ F17 T13 | 17/8 | 11/2 | 后续摘要动作相同，但首试末轮判死未结算、末试实死；两试都未赢 |
| KV0JHNJCKXLS F33 T5 | 36/0 | 29/0 | 后续动作不同：6,8 |
| KEN58SH9SLZ6 F17 T10 | 2/15 | 4/21 | 后续动作不同：13 |
| KEN58SH9SLZ6 F17 T5 | 1/7 | 2/5 | 后续动作不同：6,8,9,10,11,12,13 |

表中实伤是该轮到下一轮已结算的本体净扣血，可含毒/反伤，不是牌面攻击；各组仍只属于一个独立局。五组决策同指纹本批重核，751 T13仅复核SL摘要配对，未再核原决策指纹，不冒称全部六组都做了指纹检查。

KEN T5省2血却让步法T5→T9建立；末试T8两防御各5，T9建立2敏捷后T10防御7。末试T6无敌攻击仍持一呼唤失6，T10攻击需损8再呼唤6合14；末T13清呼唤后仍6血承9死亡，死亡帧归零及敌剩35与完整需损9分账。七次耗药按实际use_potion动作与槽位前后帧逐项核实；F15生成/重问的整条收益和未饮用/留药支线未记录。

751 F13 T3模型有/无药均损8、伤26/16，五轮均8/8；无药候选明确后续不喝药，但仅为抽样。实际饮用肌肉药后建5力量，下一轮HP50；缺留药至boss完整对照。缺表成本0不能被当作已证持有价值零。

YQL F17 T10毒药使占位体毒2→8、血26/挡13/自爆41均未变。L9 sl681.target.anchor含本体结束后的999999999；PU sl717.target.anchor按同T17的999999981/999999989比较；YQL sl960.target.anchor同T13仍用占位血。PU F17五试末试胜属于原线证据，未验证新的参考排名或药时。三个局分账，YQL六试不当六个独立留出样本。

## 现有live覆盖与缺口

只读核验live提交：`7d5b95142bbb89ed71279791786f40d312eed61c`。源码祖先与字节SHA详见current-source-lineage.json。

- `05cd292c6f01bb31e406473d3a9843e659d62b93`：呼唤/未决弃牌题面拆项。
- `a8b1f8be153fe4f3a34146117546c2178f2e446b`：SL原/替线候选及即时资源预测；actual_turn_result明确null。
- `04921bd785ac6838066522f91ea0bb6ab95cb6a1`：持有价未知、同题无药/整战无药抽样参考。
- `d5e20aa4dd44168ce30944dfcce74f8322144953`：巨兽阶段与残壳毒药单次观察。
- `0d092f6b928a6221eabf3516abad25c48ceaac9c`：限定阶段/最终资源诊断。anchorRank仍用原始HP作为同轮平局键。

以上提交均核为读取时live实际祖先，相关独立模块与本工作树一致。combat-plan.ts与explore.ts整文件字节不同，因此消费者与排序另从冻结live提交直接读回核验；没有声称整棵main/live树相同。五个诊断函数都有实际调用，但静态调用不等于自然局采用、完整执行归属或整战收益验证。不能仅据局部模块给原宽提案duplicate。

## 逐项处置与验证入口

每项的局号/层/回合、原Markdown SHA、账本id、反例、当前/预期行为、缺口和验证方法见本目录proposal.md；十个原id不新建或改写。

- `silent-proposal-366288801d9150d9`：waiting；缺跨抽弃牌重问后的完整执行归属及保持后继一致的整战对照；现有候选对照不覆盖实际整线血价，不能拟SL额外失血门槛。
- `silent-proposal-85929bdfc8a3fc1b`：waiting；缺F13无药实打或受控完整回放、留药至F17的后场结果，以及未决弃牌续问后的实际损血归属；不能把缺表0或8/8样本当留药价值。
- `silent-proposal-efd9f83ee9e1a6dc`：waiting；缺六次相关失败之外的独立验证、单一改线且后继受控的完整结果及实际持牌归属；不能设固定血价阈值或关闭更差线探索。
- `silent-proposal-131042659448ae74`：waiting；缺跨续问整线执行、能力逐轮兑现与无药/留药完整支线的联合验收；局部公式和来源提示不能关闭组合提案。
- `silent-proposal-990f054036609447`：waiting；缺毛伤、回血与净伤的完整执行归属、保持其余后继一致的整战对照及路线休息反事实；删毒同零损少7净伤不是已证保血收益。
- `silent-proposal-e18d3f18e6cac2a0`：waiting；SL同轮平局仍使用原始占位血；缺新参考目标的完整受控后继、最终资源校准和独立验证，阶段提示已有不等于指标/排序整项已修复。
- `silent-proposal-9733bb80f445aeae`：waiting；缺阶段参考路径改序的完整对照、提前用药/留药整战结果及独立验证；当前提示和原胜线不能证明新排序或药时有效。
- `silent-proposal-c51468c5e8ba6668`：waiting；七次真实耗药已核；缺重问/随机选牌后完整候选收益归属，以及不饮用或留至boss的受控整战支线，不能校准跨战持有价。
- `silent-proposal-86a7db08d1a31976`：waiting；T10多损6仅多2实伤、T5省2却延迟步法均已核；缺保持其余后继一致的整战重放、完整能力收益归属和独立后期验证，不能制定统一门槛。
- `silent-proposal-e282a9131b99129a`：waiting；原经验和局部成本已核，但六试相关且后继动作同变；缺完整兑现归属、受控整战后继和独立后期样本，不能将局部拆项作宽提案完成。

## 验证与失败保留

只读证据断言81项最终全部通过（evidence-audit.json/evidence-audit.log），覆盖原文/账本链接、六局角色、局部配对、七次实际用药、能力时点、残壳毒与live消费者/原排序。它们不是生产测试，不将81写成tests.cases。

初版断言误将清除呼唤当作手空而exit1；精确原脚本和失败日志保留，核原帧后仅改断言范围、最终exit0。没有改生产源码，所以撤源码负对照不适用。另三条命令在bubblewrap构建前因其他并行工作树回收产生ENOENT，失败原因首段另存sandbox-entry-failures.txt、完整输出保留于原工具回执；原执行入口重试后成功；它们不是git冲突或代码测试失败，也没有通过扩大权限规避。开工merge有一次该类失败，随后的同命令返回Already up to date。

未运行tsc/vitest、gitleaks或git commit；本批只保存忽略的材料和既有账本追溯，不把未运行检查标成功。未调用LLM/网络或play，未读取key、.env、游戏二进制，未派下级agent，未改变模型/权限/运维prompt。

## 账本与交付

只经根learner/ledger.py update给既有16条账本追加本批proposal.md追溯和waiting限制；不新造发现、机制或提案id，不修改原claim/first_run/status/version，不标shipped。CLI输入及回执保存ledger-updates.jsonl、ledger-cli-receipt.txt，读回检查另存final-verification.json。对应实际实现与效果仍由后续新证据及运维沿原链验收。

proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-210730-s2/learner/runs/20261013-210744-strategy-proposal/proposal.md
report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-210730-s2/learner/runs/20261013-210744-strategy-proposal/report.md
机器回报：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-210730-s2/learner/runs/20261013-210744-strategy-proposal/report.json
