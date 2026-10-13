# 策略提案续办报告

记录时间：2026-10-14 02:52:34 CST（写前已执行date）。

本批十项全部waiting，没有新增源码、知识、提交、live合入或发布版本；未将现有局部实现登记成整提案duplicate。

## 身份、基线与范围

开工git status干净，初始HEAD为`0bc9aea31fa4f45103f895960b4815820cad0d5d`。只读根learn.json对应本批：task=strategy-proposal、character=silent、reason=proposal，10个proposal_ids，工作树匹配，无research_request、implementation_request或proposal_repair。普通专题请求属于另一批，故按已领取队列处理。按任务merge main快进成功，只有运维记录两文件，完整base为`970489e268d9f99c27d73cf8bdd5eb9782789801`。

已读README、最新STATE-2026-10-12、decision-log末尾、学习协议和代码提案闭环；没有转普通fix队列另选题或扩展研究。logs只读、原始对局全部SILENT/A10；不启动play、不联网、不调用模型、不派下级。

## 原始证据核验

通过已有日志库--no-sync取得12个原始字节范围，再逐行从原JSONL读取；核run_id、角色、进阶、行数、每行SHA与整范围SHA。六局合计4,062状态帧、3,941决策，全部按决策ts找到原状态。限定原提案相关楼层提取1,071战斗帧和986战斗决策；不把这一步说成六局全部策略主题的全量研究。

| 对局 | 状态帧 | 决策 | 主要核验楼层 |
|---|---:|---:|---|
| DUZUBAJ3A8GP | 623 | 602 | F27 |
| 5PM6JAQG6FNQ | 660 | 638 | F38/F39 |
| CA5KE8GFJ9X2 | 282 | 265 | F13 |
| 8JRE1C4H4Z2W | 676 | 659 | F17/F33 |
| YF0LXT1QSTGG | 1091 | 1065 | F33/F48 |
| XP2SL33HT0D9 | 730 | 712 | F31/F33 |

四组同指纹配对：沙虫首/第三试T2损3/15、扣10/17；实验体第二/第三试T1损0/9、扣45/38；双蟹首/第二试T3损9/14、扣24/27；双蟹首/末试T1损2/10、扣25/34。全部只确认当轮血价，后继抽序、生成、重规划和资源未控制，没有独立整战胜线。

另复核棱柱火花3→6与污染、蚌0/4/8力和11/15/19喷水、电击2→4力和17→19攻、实验体清毒/触媒2零毒、后取得敏捷不倒补23挡、双蟹轮初14/镣铐−9→0及57→38→28朝向/弱。源偏移、SHA与有限范围结果在raw-manifest.json、evidence-frames.json、evidence-actions.json、evidence-turn-starts.json、paired-and-mechanism-verification.json。净敌血差只记观测进度，未当逐来源总伤害。

## 既有消费者与剩余缺口

已核下列代码提交是实际live祖先，且对应当前源码SHA相同：候选审计`9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`、单动作派发回执`fdaf787a372880b0438e73bcac7e6d2168b038ed`、实验体当前阶段事实`aad2700abed6dff1d66e87fb36aaa6fedb39adf3`。它们分别明确actual_turn=null、whole_plan_executed=null、poison_damage_already_dealt=null，覆盖的是候选/单动作/当前帧事实，不能代替跨抽弃牌的整线归属及累计收益。

静态源码可见技能污染、VITAL_SPARK自增、高电压growth、船夹板T2/14、当前进阶第一样本读取以及房间代价五样本门槛。不是本次新增实现，也没有运行新固定消费者验收。live初始读回HEAD为`bc8ac5b44a6acae03dec148f552790009df3a4c2`；部分大型模拟文件与base字节不同，source-inspection.json已逐项如实记录，不把base源码整体等同当前live或旧局+dirty树。尤其不能用刷新知识或人工拼表复原旧局实际输入。

原提案578e415a259e6835把金刚杵经验关联silent-0016，而当前silent-0016 claim讨论覆甲；其追加支持证据中虽有本局力量观察，不能把不同主张的账本当完整归源。保留原记录，不自行改claim；通过本次CLI note及handoff交ops→watcher→Roy明确转达，未声称已送达或对方ACK。

## 逐项处置

- `silent-proposal-c20b5139dd0dff71`：waiting；缺该局实际使用的冻结A10移动表，以及火花增长、污染、迷雾施毒和格挡的联合生产回放；替线后继未实打。
- `silent-proposal-ae9e692d680e3819`：waiting；缺遗忘死亡返敏与混合来源返还后同轮续牌的连续证据；失落返力端点不能证明双属性同轮归源。
- `silent-proposal-52f1e1bd2e7db0ed`：waiting；首样本HP/攻击读取已有；缺历史A10移动表及加压、虚弱、覆甲来源隔离的联合生产回放，未观察减层条件不补规则。
- `silent-proposal-6dd8bbff876be528`：waiting；缺同类型新旧召唤者的连续身份隔离与历史召唤模板/移动表输入；已有growth路径不能验证替换实体不继承旧成长。
- `silent-proposal-578e415a259e6835`：waiting；缺跨抽弃牌重规划的完整候选执行归属、逐来源累计兑现及SL恢复资源联合分账；且原提案金刚杵→silent-0016关联与该账本当前覆甲claim不一致。
- `silent-proposal-c0767768bf6a7ab1`：waiting；缺完整候选执行归属，以及同起点、抽序和资源预算的独立完整尝试对照；已有候选/单动作回执不能证明整线完成或新探索规则有效。
- `silent-proposal-a46bdb7fe711d79a`：waiting；当前阶段与零毒触媒已有事实消费者；缺逐来源累计毒伤/格挡兑现及跨重规划候选归属，不能用本帧零毒关闭整阶段请求。
- `silent-proposal-1044224808015e5c`：waiting；当轮两组血价已核；缺整线执行、成长净贡献和独立后置A10双蟹整战对照，不能从零胜/零差拟定排序或血价权重。
- `silent-proposal-7cbc6005db712ba9`：waiting；局部机制已有模型；缺额外格挡来源隔离与混合意图/未知条件下的联合候选消费者验收，单项公式不能代表完整提案实现。
- `silent-proposal-c59f592f1427a67e`：waiting；缺全部组件的联合消费者验收、跨续问整线归属、逐来源累计收益及SL恢复资源分账；局部阶段/派发字段不关闭综合父项。

逐项证据局号、层、回合、账本、反例、预期行为、验证及回退见本目录proposal.md；原提案字段与SHA在dispatch-proposals.json，详细处置在proposal-details.json和report.json。全部10个id保留waiting待新数据重派，不新建重复提案。

## 校验、失败与记录边界

首次内联配对/机制核验exit1，原因是生存者下一帧仍为弃牌选择，污染效果尚未完成；四组配对本身均相符。按选择完成后的防御前状态核污染6，其他技能再12/18，修正后的verify-evidence.py退出0；原失败与说明分别保留。这个失败/通过是日志分析脚本校验，不是撤生产源码红/恢复绿。

一次未限定扩展名的源码检索命中了含其他角色静态游戏数据的测试JSON；该输出全部排除于证据和结论，未据其补任何规则，后续检索限定.ts。本批学习结论只来自上述静默原日志、原提案及静默账本。

未修改生产源码/知识，不提交、不执行live合并，不生成eval版本；tsc、vitest、cases全部null，撤源码失败与恢复通过不适用，未冒报测试成功。账本只经根learner/ledger.py update追加本批提案/报告追溯及限制，不增新机制claim，不重置旧status/version，不标shipped；队列状态由本批终JSON交宿主处理，不直接写专用队列。工作树应保持HEAD=base、tracked diff零、git status干净；过程材料保留在git忽略的本批scratch。

运维请核本报告和proposal.md，保持十项原父范围与waiting；核silent-0016关联差异并沿ops→watcher→Roy记录转达，未收到确认前不填已知ACK。本批不关闭学习入库或量化父请求，不声称经验已发布/大脑已采用或胜率改善。

最终记录核验：根ledger.py update退出0、30条追溯追加已读回，旧claim/status/version全部保持；ledger.py check退出0（459条、0问题），gitleaks dir退出0（6.99MB、无泄漏）。首次账本读回误将CLI空格分隔id按行解析而失败，改为split后通过，未重复update；两次分析/读回失败均留档，均不属于生产代码测试。
