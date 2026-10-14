# 静默猎手本批策略处置报告

记录时间：2026-10-14 09:31:01 CST（写入前已执行 date）。
批次：20261014-091302-strategy-proposal；任务：strategy-proposal；角色：silent。
base：61abbbe2f0171061b913f4d6cecd0d903e63fd1a。

本批十项已领取提案全部保留 waiting。局部同盘成本、实际槽位变化和巨兽阶段已核；缺完整候选归属、同输入同预算的受控整战及独立后期校准。没有充分理由从本批证据确定统一血价、药水持有价或新参考排序，因此没有改源码、提交、合入或发布版本。既有诊断子实现的live祖先已核，不能把它们当十项宽提案全部implemented/duplicate，更不能冒记shipped。

详细逐项证据、反例、旧规则、后续行为目标及验证方法见本目录 proposal.md；完整机器回报见 report.json。原十份Markdown的SHA256一致，另保存 `<id>-original.md`。所有临时材料位于本任务scratch，源logs只读，其他角色知识未读取。

## 派发与输入

开工git status干净；普通任务执行git merge --no-edit main，返回Already up to date，HEAD保持上述完整base。只读取本批learn.json行，其character/worktree/runs/proposal_ids相符，没有research_request、implementation_request或proposal_repair。普通deck-size专题请求绑定旧批次，本批不进入专题，也不扩领整条队列。

| 本角色局号 | 进阶 | 状态原行 | 决策原行 | SL原行 | 日志原code |
| --- | --- | ---: | ---: | ---: | --- |
| 751FN9QM9MHQ | A10 | 624 | 615 | 6 | 79bee0fc+dirty |
| KV0JHNJCKXLS | A10 | 686 | 669 | 7 | 70c8352b+dirty |
| YQL8RZ8BWN1E | A10 | 582 | 571 | 6 | b0b0e679+dirty |
| L9SGRBB5R698 | A10 | 653 | 635 | 6 | 4fb81b17+dirty |
| PU80F84P6HPN | A10 | 1064 | 1033 | 12 | 0581ecb3+dirty |
| KEN58SH9SLZ6 | A10 | 558 | 548 | 6 | f9db52c1+dirty |

另有6条runs、6条config，共8293原行。各局runs角色、逐状态character_id/ascension与决策计数均核；原行offset/bytes/SHA见source-lines.json，提取文件和单局输入SHA见evidence-manifest.json。43条SL包括不同战斗/尝试，只作日志行数，不当43个独立实验。原dirty历史保持未知，不声称恢复原执行源码。

## 消费者与证据结果

使用本base现有learner/audit-selection.ts，经agent目录的本地Node/tsx入口、固定单局JSON运行，没有LLM、网络或刷新知识输入。

- 751完整输入exit0。
- KV/YQL/L9/PU/KEN完整输入各exit1，原因是原路线记录缺decision_id，拒绝原件完整保留。六个缺ID源行：272938、273191、273668、243739、246622、274207。
- 五局另保存明确排除这些行的限定输入，保留所有剩余原始行号，不填ID、不跨缺口拼接；限定输入各exit0。成功仅属限定材料消费，不报完整输入全通过。
- 共消费4065决策、861题段、2336个可见相邻观测区间、415个整轮端点；另有1729区间和362轮窗未知。各题段完整候选结果为null，含义是消费者未认证，不能据此判定原候选没执行。

同盘配对精确核验：

| 局号 / 层 / 回合 / 尝试 | 原/换观测净损 | 原/换敌净扣 | 解释边界 |
| --- | --- | --- | --- |
| 751 / F17 / T2 / 1→3 | 13→18 | 9→18 | 多9净扣同时多损5；不是整战因果 |
| 751 / F17 / T7 / 2→4 | 13→23 | 12→18 | 多6净扣同时多损10；共同保守误差另记 |
| 751 / F17 / T13 / 1→6 | 8→2 | 17→11 | 省6血同时少6净扣，反驳只看当轮保血 |
| KEN / F17 / T10 / 4→5 | 15→21 | 2→4 | B2 .385→.127、diff -.2583、SE .0132；后轮也变 |
| KEN / F17 / T5 / 4→6 | 7→5 | 1→2 | 追加小刀续问单列，敏捷建立T5→T9 |

所有表中配对均核原决策fingerprint相同，五组连续原始轮窗可见；表中净扣包含实际轮内机制，不标成候选牌伤或新策略收益。KEN第4/6试首次可见2敏捷分别state280569/T5、280702/T9；第6试T8/state280697的两张防御牌文均5挡。

KV F33 T5第4/5试同指纹：原状态279460→279465/279511→279515，玩家均30→30，敌334→298/305。273451续问另阻止补打毒药，不能省略。现消费者对两轮仍turn_end_unverified，手工端点不改写消费者结果。第6试T4帧279553—279560敌342→336→330→327→342，净差0不能当毛伤0；完整毒/回血归属和整战反事实仍欠缺。

KEN七次耗药逐槽位核对，三个回执pending而后帧槽位改变：274131、274237、274272。槽位变空可记消耗事实，pending本身不证明生效或完整候选。随机选牌、发光水续问及七瓶任一留到boss的受控收益没有认证。751 F13 T3肌肉药水消费与五轮无药模型参考已核，8/8属于抽样而非未饮用实盘。

YQL F17 T10原状态280160/280161：毒2→8，HP26、挡13、EXPLODE_MOVE的DeathBlow41均未变，原current/max HP999999999保留；不把新增毒当减伤或本体进度。L9原SL681、PU717、YQL960—963的占位血原始anchor亦已核，详见evidence-supplement.json。PU旧胜线不验证另一新参考排序或提前喝药收益。

## 逐项结果

| 派发ID（silent-proposal-前缀） | 账本 | 证据与waiting条件 |
| --- | --- | --- |
| 366288801d9150d9 | 0079、0176 | 751 F17 T2/T7/T13成本已核；缺完整执行归属、受控整战及独立后期校准，不能拟额外失血门槛 |
| 85929bdfc8a3fc1b | 0019、0021、0005、0007、0129、0176 | 751 F13 T3/F17；未决持牌/未知持有价展示已有，缺无药/留到boss完整支线和毒/反伤归属 |
| efd9f83ee9e1a6dc | 0079、0176 | 751三组差额；诊断子项不覆盖原经验提案的完整实际血价和整战校准 |
| 131042659448ae74 | 0019、0020、0021、0005、0006、0007、0046、0129、0176 | 751能力/药水/持牌综合项；缺跨续问联合兑现与跨战受控支线 |
| 990f054036609447 | 0102、0019、0020 | KV F33 T5零净损而少7净扣，T4净差掩盖期间变化；缺毛伤回血归属、受控后继及路线/休息反事实 |
| e18d3f18e6cac2a0 | 0017、0250、0011、0027、0046 | YQL/L9/PU F17；阶段展示已有，缺新排名完整后继、自爆最终资源及独立验证 |
| 9733bb80f445aeae | 0017、0019、0020、0250 | 同三巨兽局；缺提前喝/留药及新参考的整战受控结果，PU旧胜线不能代证 |
| c51468c5e8ba6668 | 0019 | KEN F3/F4/F5/F11/F15七次消耗已核；随机选择/重问完整收益与F15不喝或留到boss支线不足 |
| 86a7db08d1a31976 | 0079、0021、0125、0005、0176 | KEN F17 T10/T5/T2；缺后继一致整战、能力和伤源完整归属及独立后期验证 |
| e282a9131b99129a | 0021、0079、0125、0176 | 同KEN取舍；相关六试不拟统一6血/2伤阈值，缺完整反事实和独立验证 |

上述账本全部为silent前缀。十项原ID保留，没有另建重复ID，也没有把旧机制条目已shipped的状态改为proposed或将本批waiting覆写其旧claim/status/version/首证/evidence。只经根目录ledger.py update追加本批note/by/where，将16个唯一账本条目关联本批proposal.md/report.md；CLI输入、输出和前缀指纹落盘，读回结果见acceptance.json。

## 已有子实现核验

核验时实际live HEAD为6c8eed9f4b6f95a09d259fe9089dcdcc4c1f39c6。source-provenance.json列13个相关源码叶的base/live SHA、实际live提交及祖先检查；所读live叶均与其HEAD blob一致。

- 持牌失血来源与未决弃牌：05cd292c6f01bb31e406473d3a9843e659d62b93。
- 未知持有价/整战无药参考及终态观测：04921bd785ac6838066522f91ea0bb6ab95cb6a1。
- SL候选与资源预测比较：a8b1f8be153fe4f3a34146117546c2178f2e446b。
- 巨兽当前阶段和已观察毒药事实：d5e20aa4dd44168ce30944dfcce74f8322144953。
- 巨兽阶段/限定末态资源：0d092f6b928a6221eabf3516abad25c48ceaac9c。
- 离线逐轮与原候选记录：9b87d54f097d84521152e6cca8d6072af8140394；相邻能力与HP观测：8698c581dac6c7e957f50a381586960a6d0c9b57。

这些源码提交是实际live祖先，但只覆盖相应子诊断。当前anchorRank同存活轮仍比较原enemyHpLeft，阶段展示不会改变排序；改变这点需完整验证。combat-plan.ts/explore.ts的本base/live差异原件保存为.diff.txt，所见为Roy/Dai注释拼写，保持各自原字节，没有借此导入或改写历史。

## 失败保留与交付

初次冻结因decisions.jsonl:373494无法解析而exit1，stderr和初次过程文件保留。该行仅引用本批KV局号，其literal_run_id不是本批六局；没有用于游戏结论。重做时记录offset/bytes/SHA与原片段，结构排除，六局解析计数仍与runs声明相符，不把它误报为本批缺失决策。五个完整消费者拒绝亦分别保留，不降断言、不伪造ID、不将限定输入成功冒称原输入成功。

交付材料校验的初稿有一处括号未闭合，Python在解析阶段拒绝；verification.stderr.initial.txt与verify-delivery.initial.txt保留。修正该语法及未执行的计数写法后重新校验，结果记录于verification.exit-code.txt/acceptance.json。该失败属于本批scratch材料校验脚本，不是生产源码或策略测试失败；根账本CLI检查单列。

无新生产源码，所以撤源码失败/恢复通过、生产tsc/vitest和合后测试不适用，JSON tests={"tsc":null,"vitest":null,"cases":null}。材料消费者退出码和指纹检查另列，不作为生产测试。fixes=[]、merged=null；没有源码提交、eval版本、live行为修改或新经验入库。工作树HEAD保持base，跟踪文件与索引无改动，scratch按既有ignore保留。

gitleaks针对本批scratch的扫描exit0，stdout/stderr和JSON报告保留；不是源码自测。没有新的规则上线，因此不写规则上线双通知或伪造运维shipped。运维接续用本报告、proposal.md和原十个ID，保留具体waiting条件，等待新的本角色完整证据。
