# 本批策略学习回报

本批十项原提案均waiting；没有新增源码、提交或合入。已核实六局原日志的四组同指纹当轮血价及23项机制事实，保持原选择规则。逐项证据／层／回合／账本／反例／缺口／验证方案见[proposal.md](proposal.md)。

- task：strategy-proposal；character：silent；batch：20261013-064302-s2-strategy-proposal。
- base：e0d25c8991758f846edad1e2f641112ff4a9dc72；初始干净，main合并无改动；最终仍按原HEAD核验。
- 实际读取live快照：e42018c10c8ddda4225ccd273e824425dbd94250；仅作现状比较，没有本批live操作。
- fixes=[]；merged=null；implementation_domains=[]；版本=null。
- 原十个code_proposals为既有CLI id；没有新增或重复登记id，不改原队列状态或原文。最终proposal_results逐项waiting，由调用方保存并等待新证据。
- 新生产源码为零；撤源码失败／恢复通过、tsc、vitest、生产cases均不适用，tests各字段null。本批脚本是任务scratch中的核证辅助，不作为生产代码或测试通过回执。

## 核实结果

| 局号 | 层／回合 | 配对实损 | 本体净进度 | 差值（替线减原线） |
|---|---|---|---|---|
|8JRE1C4H4Z2W|F33首／三试T2|3→15|10→17|血价+12，进度+7|
|YF0LXT1QSTGG|F48二／三试T1|0→9|45→38|血价+9，进度−7|
|XP2SL33HT0D9|F33首／二试T3|9→14|24→27|血价+5，进度+3|
|XP2SL33HT0D9|F33首／末试T1|2→10|25→34|血价+8，进度+9|

四组均逐字相同fingerprint，使用decision的sl_attempt、observed_ts与原状态匹配。实际玩家净损与敌本体净进度含已观察结算，不能拆成未经观察的单来源伤害。paired-turns.json保留起末帧、全轮动作与SL候选。evidence-verification.json的23项是日志算术及现场一致性核验，不计生产测试cases。

棱柱污染／火花、负力敏与失落返力、下水道蚌加压／弱、电击增长及index重排、沙虫死亡截断、实验体换阶段清毒与后取敏不倒补、双蟹临时减力／朝向／轮初格挡均有原帧定位。完整捕获六局8086条原始记录，逐行SHA／偏移见capture-manifest.json及六类index，计数见run-summary.json。当前配置只有前缀摘要及经验日期版本，不是旧局实际读取的移动表冻结内容；六局code均为+dirty，未冒称复原当时执行源码。

## 原处置及未实现原因

1. `silent-proposal-c20b5139dd0dff71`：waiting。证据：DUZUBAJ3A8GP F27 T4—T6；silent-0168；states 274830—274839。run-config只记录知识前缀摘要，未给当局实际读取的A10移动表内容；缺火花成长、清污染、迷雾施毒与防御收益联合生产回放，不能由实损9拟统一技能惩罚。

2. `silent-proposal-ae9e692d680e3819`：waiting。证据：5PM6JAQG6FNQ F39 首试T4—T6、末试T4；silent-0183、silent-0005；states 274351—274362、274391—274397。缺遗忘死亡返敏的连续帧、同属性多来源及临时增益混合返还、稳定实例身份；失落单次返4力不支持一般返还模型或固定击杀顺序。

3. `silent-proposal-52f1e1bd2e7db0ed`：waiting。证据：CA5KE8GFJ9X2 F13 T1—T5；silent-0231；states 273237—273269。首样本HP／攻击读取与五样本房间代价门槛已有源码；缺旧局实际移动表输入及覆甲减层来源隔离，不能认证加压／弱／覆甲联合重放或拟房间成本。

4. `silent-proposal-6dd8bbff876be528`：waiting。证据：5PM6JAQG6FNQ F38 T3—T4；silent-0233、silent-0209；states 274308—274317。缺新旧同种电击并存／替换时的稳定实例标识、连续召唤帧及当局实际移动表；index重排不能当实体ID，通用growth路径不证明整个提案完成。

5. `silent-proposal-578e415a259e6835`：waiting。证据：8JRE1C4H4Z2W F33 首／三试T2、二试T5、末试T11；原账本12项见proposal-items.json；decisions 270216／270282／270264；states 276429—276434。候选审计、HP护栏快照及首动作回执已在live；仍缺跨抽牌／弃牌／用药重规划的完整候选执行归属、中间事件和能力累计收益分账，不能将单动作回执记为整轮完成。

6. `silent-proposal-c0767768bf6a7ab1`：waiting。证据：YF0LXT1QSTGG F48 二／三试T1、第四试T5，F33成功SL反例；silent-0079；decisions 271309／271348／271354。缺弃牌／用药重问后的整轮归属及保持后继一致的完整胜线；全败并列不能直接改成拒绝探索或全局血价常数，当前候选预测也不能填实际收益。

7. `silent-proposal-a46bdb7fe711d79a`：waiting。证据：YF0LXT1QSTGG F48 末试T3—T5；silent-0021、silent-0027、silent-0028、silent-0085；states 277512—277528。live现场事实已区分持有、已建能力与当前毒；缺跨阶段逐伤害来源事件、抽弃牌后完整候选执行链及能力累计收益归因，本帧事实不证明整场持续价值已校准。

8. `silent-proposal-1044224808015e5c`：waiting。证据：XP2SL33HT0D9 F33 首／二试T3、首／末试T1、第三试T4；silent-0079；decisions 271992／272040、271982／272195、272076。缺同盘完整后继、未执行原线结果及时间后移的独立A10双蟹验证；不能校准先保血的窄探索策略或终局权重，也不能忽略力量收益。

9. `silent-proposal-7cbc6005db712ba9`：waiting。证据：XP2SL33HT0D9 F33 末试T2—T5；silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242；states 278236—278261。当前朝向／减力／轮初挡路径存在；缺额外格挡来源隔离、混合意图缺值语义与联合候选收益验证，不能改持续价值权重或认证全部机制包。

10. `silent-proposal-c59f592f1427a67e`：waiting。证据：YF0LXT1QSTGG F48、XP2SL33HT0D9 F33；原账本22项、20经验见proposal-items.json；复用上述逐帧定位。缺逐来源累计收益、跨续问完整执行、恢复资源全链及20条经验逐项消费者验证；不能关闭整包或量化父请求，已有有限子项不是整包duplicate。

## 历史与身份限制

捕获初稿只读取顶层run_id，误把嵌套state.run_id的状态计成0；保留capture-initial.txt、capture-manifest-initial.json及原样本，修正后重抽4062帧，未将0当作游戏缺帧。账本初稿浅合并会覆盖evidence，保留ledger-before-initial.json，之后按原ledger.py的fold规则只折本批30个silent账本，已有证据与状态正确保留。两类是核证辅助错误，不是生产bug。早期搜索的不存在路径报错保留在原工具转录，后定位hand/loop.ts及实际文件，不冒称首次搜索完整成功。

实际宿主learner_launch记录为gpt-6.1-sol、xhigh、default；题面要求high，两者不一致，runtime-identity.json保存真实启动参数。未改运行配置或账号，也未仅据默认配置声称核验了原生请求模型。沙箱内未能读取宿主PID的对应/proc参数，原生请求验证仍未知。

本批不关闭任何量化或学习入库父要求，不声明经验新入库、大脑采用、自然收益、shipped或整包implemented。结论与旧原提案一致，没有新增机制反证；YF F33成功SL及已建毒雾仍败、XP付血同时获力、原候选未完整执行作为既有反例保留。

## 台账与交接

仅经根learner/ledger.py update给本批30个既有silent账本追加本提案／回报链接及限制说明，by=learner:strategy-proposal；不新增知识断言，不更改已有claim、evidence、status或version，不标shipped。原CLI输入／输出和范围读回在本目录保留；具体完成回执见ledger-link-verification.json。既有原提案状态waiting保持，不通过重复CLI add改变原文／SHA。

交运维的提案路径和报告路径均位于本批scratch。无源码提交、不推送、不运行play、不修改logs、其他角色知识、根专题请求或ops prompt。没有行为上线，所以不追加eval版本、decision-log上线行或双通知。
最终工作树／HEAD、原提案SHA、账本范围读回及材料密钥扫描见final-verification.json；材料逐文件SHA见artifacts-manifest.json。
