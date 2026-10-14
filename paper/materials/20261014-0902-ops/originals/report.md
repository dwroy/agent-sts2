# 本批策略学习报告

时间：2026-10-14T08:55:43+08:00。角色silent，batch=20261014-084222-strategy-proposal。

结论：十个已领取提案逐项waiting。已核实的机制子实现及诊断审计保留，尚无充分证据改神化优先级、MC预算、药水持有价、HP护栏、SL范围、focus或构筑/终局权重。本批没有源码或知识改动、没有提交、没有合入或版本，不声称shipped、经验入库、策略收益或胜率提升。

## 身份及基线

根learn.json对应本批task=strategy-proposal、character=silent、reason=proposal，工作树与派发完全一致，proposal_ids为本文十个id；没有research_request或implementation_request。只核普通专题请求，其running/batch仍绑定20261010批次，因此不套用专题，不读其他专题。开工git status干净；git merge --no-edit main返回Already up to date。report.base=f99d9d0ea2cff14c827c3ac7f689d8048675d8e1，保持该HEAD及跟踪工作树零差异。

原派发与原提案保存dispatch.json、assigned-proposals.json、proposal-history.jsonl及十份Markdown副本；全部角色与SHA匹配。原账本只读本批涉及26个silent id，官方fold保存ledger-before.json；本批只经根ledger.py补note/where追溯，保留原claim、证据、status及version，不重写复盘，不新增机制或提案id，不标shipped。

## 原始证据覆盖

六局runs.jsonl均为SILENT A10，全部原决策数量与局报相符，均败；不把29条SL记录当29个独立样本。完整冻结并逐offset/bytes/SHA256/JSON正文读回：3432状态、3306决策、29条SL、6条配置、6条runs，共6779行。完整计数见extraction-summary.json，源定位见各*-locators.jsonl及proof.log。

| 局号 | 状态帧 | 决策原行 | 消费决策 | 整轮端点 | 未知轮窗 |
|---|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 729 | 699 | 699 | 10 | 97 |
| 8JRE1C4H4Z2W | 676 | 659 | 659 | 44 | 67 |
| CA5KE8GFJ9X2 | 282 | 265 | 264 | 0 | 46 |
| 5PM6JAQG6FNQ | 660 | 638 | 638 | 25 | 76 |
| 61E2QS63Y9WU | 462 | 443 | 442 | 14 | 59 |
| DUZUBAJ3A8GP | 623 | 602 | 599 | 28 | 68 |

五条map/route-change记录没有原decision_id，保存于facts.json的missing_decision_identity；分别CA一条、61一条、DU三条。原行保留，消费者显式排除，没有补造id。3301个消费决策、476个题目片段、859个相邻观测区间、121个整轮端点及413个未知轮窗来自既有auditSelectionExecution，不是476个完整候选执行或独立实验。CA的attempt未知，使该严格消费者不认证观测区间；不等于CA原状态没有机制证据。整轮端点只给净HP/敌血观测，不能归因候选、SL替换或药水。

## 已有源码与消费者边界

只读核对live HEAD=65763022bbb3a5571671e8fab4ae0c92c52b2fd5，12个相关源码路径的最近实际live祖先提交、工作树和committed字节见existing-source-proof.json。9个路径与base逐字相同，card-model/turn-solver/rollout另3个差异仅历史Roy/Dai注释拼写，原diff保存*.live-difference.patch，两checkout均保持原字节。现有神化升级表源码a11dd870b09f3f1b67fcb5d6c08af6573fd809e0、神化候选事实3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17、单步派发bade647f9fe4c9103b40e2f26b26296692ad24b7、整轮/执行审计9b87d54f097d84521152e6cca8d6072af8140394均已证实际live祖先，只有子范围，不足以把十个宽提案登记duplicate。

本批实际运行既有消费者（node --import本地tsx loader，无网络/LLM/知识刷新输入）：consumers.mjs读取六个冻结输入；结果保存六份*-consumer-output.json、consumer-summary.json及consumer.log。实际返回exit0。输出完整候选结果为null是该消费者明确的保守语义，不能当“已统计没有候选完成”，也不能按它构造策略效果。四个VLZ神化帧的参考消费者施放前后均actual_cast_this_fight=null；已观测实打升级成立，但不能称生产持续施放身份已实现。

## 十项处置

详proposal.md，逐项含证据局/层/回合、全部原账本id、反例、下一步验证与回退。原提案Markdown与SHA均保存，未改原文。

- silent-proposal-89354805ee4d7e77：waiting。缺实际施放跨抽牌、选择、药水、SL、换战及会话接续的持续身份；扑击减费、反射弃牌触发、猎杀者延迟抽牌与升级传播联动尚未由本批冻结生产调用验证。

- silent-proposal-f2bfceddb1898dca：waiting。缺同起点、同模型覆盖、同总预算、同固定随机池的分阶段MC配对及候选稳定性曲线；缺神化等覆盖补齐后的同题对照。

- silent-proposal-283a164780d11e69：waiting。独立经验链仍缺实际施放持续身份、SL/换战/接续消费者，以及减费、弃牌触发、延迟抽牌与升级传播的配对验收。

- silent-proposal-ebbfe3b97548756d：waiting。缺十五条机制逐路完整冻结生产输入、升级联动、状态期限和资源/路线消费者验收；既有子公式、文本及经验版本不足以关闭整组。

- silent-proposal-e5b87be50f28f311：waiting。候选、单步派发、观测区间及整轮端点已有子审计；缺抽牌/选择/药水/SL后整条候选持续归属、未执行原线及独立完整后继。

- silent-proposal-49632bc4878fb597：waiting。缺本角色同一冻结生产调用下力量、正负敏捷、逐击虚弱和独立成长四路复合校准；本局没有正敏捷实证。

- silent-proposal-66532328a585941f：waiting。缺同HP、牌组、药水和完整抽序下另一启动/构筑顺序的整场对照及可复现收益函数，不能拟合启动或构筑阈值。

- silent-proposal-43a76a31ba7bdcfa：waiting。缺A10吸取/负敏捷/毒与历史移动模型的完整冻结生产验收，以及同资源、同完整抽序的另一完整SL线路。

- silent-proposal-5264153a4a4b0e5c：waiting。缺A10召唤、航行及复生联动的完整冻结生产调用与另一focus完整后继，召唤子项不能登记整个提案duplicate。

- silent-proposal-bddfa690a84e03d0：waiting。缺当前A10睡眠、伤害唤醒、眩晕和成长完整冻结消费者验收，以及同抽换序的完整后继。

## 验证、失败材料与上线口径

未改生产源码，因此tsc=null、vitest=null、cases=null；没有撤源码红/恢复绿实验，消费者核验exit0不是生产测试成功。没有源码提交、merged=null、fixes=[]，没有eval版本或规则通知，也不执行live合入及play。Gitleaks实际exit0，扫描约309.87MB、没有发现泄漏；原账本CLI检查466项、0问题。26条本批CLI更新仅note/where/by，原claim/证据/status/version与开工前相同；十份原提案SHA未变、HEAD等于base且git status为空。完整验收保存final-record-validation.json及final-checks.json。

保留第一次同权限shell构建的bubblewrap .codex ENOENT失败，其后同命令重试成功，未换权限。证据抽取初稿将state的run_id误按顶层取值得到states={}；原extraction.log和extraction-initial-summary.json保留，修正为state.run_id后单独重抽3432帧并全部原字节读回，不将初稿零帧当证据不足。一次读取测试文件路径误用src目录，原错误保持；实际文件在agent/tests，未改输入/源码或降低消费者校验。

缺数据范围具体到每个原id；未执行候选、完整抽序、历史dirty模型、受控预算和完整后继未知。保留本批大材料和原始失败，交原调度器等待新增证据，不自行清理仍未闭环的研究。

运维交付路径：proposal.md及report.md为本批scratch中的真实绝对路径；没有源码待登记shipped。
