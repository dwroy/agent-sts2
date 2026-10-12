# 静默猎手策略批次回报

记录时间：2026-10-13T06:13:46+08:00。本批10项均waiting；没有新增源码、提交、合入、版本、implemented/duplicate或shipped。

## 身份与范围

工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-060422。task=strategy-proposal，character=silent，batch=20261013-060422-strategy-proposal。根learn.json精确对应本树、派发六局和十个proposal_ids；reason=proposal，没有research_request、implementation_request或proposal_repair。普通专题绑定不成立，未读取其他专题来替代身份。先核干净树，git merge --no-edit main返回Already up to date；HEAD仍为完整40位基线652f39b79f7c07ae70e7988d920f134d32362243。

runs.jsonl每局唯一且均SILENT/A10；751、KV0、YQL、L9、PU80、KEN均终局失败，其中PU80曾通过F17巨兽，不能把最终败局误记F17未胜。原运行code均含+dirty，当前源码不能复原当时完整脏树。未派下级agent，未运行play、LLM、网络或知识构建器。没有把任务参数说明冒写为实际原生模型已核实；本批未读取原生凭据或会话文件。

## 原始证据与核验

六局decisions共4071行、states共4167行、sl-attempts共43行、runs及run-config各6行，均只保存本角色本批局。每行保留原字节，索引包含根日志行号、字节偏移、长度和SHA256，见evidence-manifest.json及各*-index.jsonl。大日志只流式扫描至本批最后来源行，不修改原日志。根状态最后边界为280723，决策为274640，SL为969。复盘保留本树六个完整对应章节，不追加历史复盘。全部十项原提案SHA与队列一致，全部16个关联账本属于silent。

首次capture.py漏取嵌套state.run_id，得到0状态；该错误只在本批分析脚本，非生产缺陷。capture-initial.py.txt、capture-initial.log、evidence-manifest-initial.json保留；修正为嵌套取值后重抽并逐局核对。不覆盖初稿或把首次0行写成成功。两轮源码定位中不存在的main.ts/jev/combat.ts/core/loop.ts命令错误仅为工具定位，已改查实际hand/loop.ts和reflex/combat-plan.ts；没有测试成功声明。

analysis.json保留七对原始盘面及下一轮/死亡状态，observed-context-check.json除决策指纹外还对照完整原始手牌、玩家HP/挡/能量/能力、敌HP/意图/能力及药栏，七对所列字段均一致。初次手牌投影包含不存在的cost/current_cost字段，已保留初始回执并改为完整原始卡牌比较，实际energy_cost/star_cost/upgraded/playable、规则文本及动态数值全部一致。它不证明隐藏抽序或随机状态完全相同。

| 局、层、轮与尝试 | 决策行 | 状态起点→下一轮 | 原→替线实际净损血 | 原→替线实际敌HP净扣 |
|---|---|---|---|---|
| 751FN9QM9MHQ F17 T2 尝试1→3 | 272434 / 272575 | 278479→278483 / 278620→278623 | 13→18 | 9→18 |
| 751FN9QM9MHQ F17 T7 尝试2→4 | 272531 / 272652 | 278576→278581 / 278697→278702 | 13→23 | 12→18 |
| 751FN9QM9MHQ F17 T13 尝试1→6 | 272483 / 272820 | 278528→278532 / 278865→278869 | 8→2 | 17→11 |
| KEN58SH9SLZ6 F17 T10 尝试4→5 | 274505 / 274568 | 280588→280592 / 280651→280655 | 15→21 | 2→4 |
| KEN58SH9SLZ6 F17 T5 尝试4→6 | 274484 / 274601 | 280567→280572 / 280684→280689 | 7→5 | 1→2 |
| KV0JHNJCKXLS F33 T5 尝试4→5 | 273400 / 273450 | 279460→279465 / 279511→279515 | 0→0 | 36→29 |
| KV0JHNJCKXLS F33 T1 尝试1→6 | 273242 / 273474 | 279298→279309 / 279535→279545 | 0→0 | 28→14 |

以上敌HP数字是所列单敌同阶段窗口的净变化；含实际已结算毒/反伤等，不能泛称卡牌直伤或毛伤害。被SL截断末轮没有敌回合结算，不补成死亡实损；死亡HP归零与完整来袭预算分开。

751 T7原与替线题面各保守多计一张呼唤6血，实际损13/23；差额10仍成立，绝对保守边界不认作新pure bug。T2两线B2 .195/.193且差-.0025、SE .0135；T7 .103/.013、差-.09、SE .0088；T13 .256/.203、差-.0533、SE .0129，数字属模型，不是实际胜率。

751 F13 T3原题272361：plan2喝药预测8损/26牌伤，plan3本轮不喝预测8损/16牌伤且后轮可能喝，plan5明确整战不喝参考8损/16牌伤、5轮8/8模拟赢；plan2/3/5并列标签保留。plan5没有真实执行，不能据此定留药HP价值。本次不重跑旧模拟或调用模型。

KV0 F33 T5两线当轮均零损，替线删致命毒药+净扣少7且后轮毒较少；T1去究极打击净扣少14也没有保血收益。T4末敌327/15毒到T5敌342/14毒包含毒结算与回血，已有复盘分账不意味着日志记录了两者的全部独立事件时点。尚无固定后继的整战效果比较。

YQL F17 T10的s280160/280161及d274087实喝槽0毒水：毒2→8，HP26、挡13、自爆41不变，本体已结束且占位max_hp=999999999。新增6毒不能写减伤6；提前喝、不喝、留药整战仍未知。L9的SL第681行和PU80第717行、YQL第960—962行存在旧占位血参考；PU80第719行明确第五试F17获胜。它是多处路径共同变化的一次胜局，不能验证新的参考排序。

KEN六次F17入口均75/86空药栏，步法2敏捷实际建立轮为3/5/5/5/5/9，对应s280396/280452/280506/280569/280632/280702。T5预测省2血实际兑现，但追加小刀产生额外1扣与能力延迟分开；不能说少血价恒优。T10换线原B2 .385、替.127、差-.2583、SE .0132，实际只多扣2却多损6；T13仍6血0挡对9死，不能由已建敏捷补出无牌格挡。

KEN七次用药已用独立槽位前后帧确认，而不只信completed：d274131/s280206→280207攻击；d274156/s280232→280233稳定；d274185/s280262→280263速度；d274235/s280313→280314虚弱；d274237/s280315→280316攻击；d274267/s280348→280349发光；d274272/s280354→280355技能。三条返回pending/unstable但随后确已消耗；随机选牌、重问及整轮收益归属不等于槽位消失。本批未观测F15不喝或留到boss的完整分支。

## 实际live源码与实现边界

捕获live提交：a2cee596182af746c5e1e1c18783a5e0f21fe83e。source-manifest.json保存15个限定路径的base/live字节SHA、源提交与对捕获live的祖先检查，15项祖先exit0。9个路径两树相同、6个不同；不能冒称所有执行源码相同。只读live状态存在知识自动刷新，未提交、覆盖或合入该数据。

| 既有子项 | 真实live祖先源码commit | 尚未覆盖 |
|---|---|---|
| silent-selection-audit.ts | 05cd292c6f01bb31e406473d3a9843e659d62b93 | predicted_candidates，actual_turn=null |
| silent-selection-dispatch.ts | bade647f9fe4c9103b40e2f26b26296692ad24b7 | single_action_receipt，state_effect_verified=false，whole_plan_executed/actual_turn=null |
| silent-held-loss.ts | 05cd292c6f01bb31e406473d3a9843e659d62b93 | 当前模型持牌分账；实际持牌失血null，不把剩余差额叫确定敌伤 |
| silent-sl-comparison.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b | candidate_forecast，actual_turn_result=null |
| silent-sl-resource-comparison.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b | current_turn_prediction，execution=unverified |
| silent-potion-reference.ts | 04921bd785ac6838066522f91ea0bb6ab95cb6a1 | 同题模型/整战无药参考；没有真实不喝或留药整战 |
| silent-giant-potion.ts | d5e20aa4dd44168ce30944dfcce74f8322144953 | 本帧阶段及一次已观察饮用；不改参考排序 |
| attempts.ts | 0d092f6b928a6221eabf3516abad25c48ceaac9c | 阶段和有限已观察末态资源；未覆盖本批所有完整末态 |

生产引用已只读核到combat-plan.ts的候选组装及hand/loop.ts的执行回执。explore.ts的enemyHpLeft注释和实现保留原占位血作为legacy tie-break；anchorRank仍按存活轮数、原敌血排序，notWorseOnly未强制时仍能试模拟更差线。本批没有自然消费者新记录，也未将静态调用点核对称为生产消费者采用或整场收益验证。

缺新规则效果证据不等于诊断必须有胜局才能做：本批已有可用的预测/本帧/单步诊断，无需重复；仍缺的是跨抽弃/药水重问的完整实际归属与可验证策略目标。不会只把null填上题面预测就叫真实实测，也不改未授权架构来兜齐宽提案。

## 十项处置

| 派发 id | 证据局/层/回合 | 既有账本 | 处置及缺口 |
|---|---|---|---|
| silent-proposal-366288801d9150d9 | 751FN9QM9MHQ / F17 T2、T7、T13 | silent-0079, silent-0176 | waiting：751 F17 T2/T7/T13同盘血价已核；已有候选及首次派发诊断，缺抽弃重问后的整轮执行归属、保持后继一致的整战支线，不能定探索门槛。 |
| silent-proposal-85929bdfc8a3fc1b | 751FN9QM9MHQ / F13 T3；F17 T7、T13、T17 | silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176 | waiting：751 F13 T3的plan5仅整战无药模型参考；持牌/持药未知已有live诊断，缺实际不喝、留药整战与抽弃重问后的药水收益归属。 |
| silent-proposal-efd9f83ee9e1a6dc | 751FN9QM9MHQ / F17 T2、T7、T13；六次尝试 | silent-0079, silent-0176 | waiting：751六次相关尝试均未胜；现有SL字段仍是候选预测及单步回执，缺完整实际分账、受控完整支线和后期独立验证。 |
| silent-proposal-131042659448ae74 | 751FN9QM9MHQ / F13 T3；F17 T3、T5、T7、T17 | silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176 | waiting：力量、敏捷、毒、荆棘与呼唤分项支持已核；现有栏不证明联合收益或确定敌伤，缺实际无药/留药整战及续问后的联合归属。 |
| silent-proposal-990f054036609447 | KV0JHNJCKXLS / F33 T1、T4、T5、T8 | silent-0102, silent-0019, silent-0020 | waiting：KV0 F33 T5删毒净扣36→29、两线零损，T1删攻击净扣28→14也未省血；毒和回血同帧，缺完整实测来源分账及同后继整战对照。 |
| silent-proposal-e18d3f18e6cac2a0 | YQL8RZ8BWN1E / F17 T9—10；L9SGRBB5R698 / F17 T14；PU80F84P6HPN / F17 T17 | silent-0017, silent-0250, silent-0011, silent-0027, silent-0046 | waiting：巨兽本体/自爆及占位血说明已有live实现；原占位血仍作同轮参考排序，缺改序的受控完整后继和独立验证，不能直接归零并称改善。 |
| silent-proposal-9733bb80f445aeae | YQL8RZ8BWN1E / F17 T9—10；L9SGRBB5R698、PU80F84P6HPN / F17 | silent-0017, silent-0019, silent-0020, silent-0250 | waiting：YQL F17 T10喝毒后毒2→8而血26/挡13/来袭41不变；缺提前喝、不喝、留药及阶段参考改序的完整对照，不能拟药水或终局权重。 |
| silent-proposal-c51468c5e8ba6668 | KEN58SH9SLZ6 / F3 T2、F4 T1、F5 T2、F11 T1—2、F15 T1、F17 T1 | silent-0019 | waiting：KEN七次饮用和六次75/86空药栏入口已核；随机选牌、发光水重问后的整轮收益归属不全，缺F15不喝或留药到boss的完整支线。 |
| silent-proposal-86a7db08d1a31976 | KEN58SH9SLZ6 / F17 T2、T5、T8—10、T12—13 | silent-0079, silent-0021, silent-0125, silent-0005, silent-0176 | waiting：KEN F17 T10多损6仅多扣2、T5省2却把步法延到T9已核；缺受控能力后继及后期独立局验证，不拟统一血价或关闭探索。 |
| silent-proposal-e282a9131b99129a | KEN58SH9SLZ6 / F17 T2、T5、T8—10、T12—13 | silent-0021, silent-0079, silent-0125, silent-0176 | waiting：已有候选、持牌和首次派发子项；完整actual_turn仍空，缺续问后执行链归属、保持后继一致的整战与独立后期验证，不能将子项当整项完成。 |

逐项code_proposals沿用派发CLI id，原Markdown/JSON不改，不新建重复id，不手写队列。根ledger CLI追加这16条旧账本的proposal/report链接与本批限定说明，保持旧claim、status、version以及已shipped历史；不替ops标shipped。输出存ledger-update-input.jsonl、ledger-update.log与ledger-update.err。提案文件：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-060422/learner/runs/20261013-060437-strategy-proposal/proposal.md。

## 验证、限制与交付

这是记录与证据核验批次，未改agent/learner/eval/ops生产源码或knowledge。未运行tsc、vitest或源码撤回/恢复实验，两项软件测试及cases均null；analysis脚本exit0不算生产测试通过。没有待提交源码，未作git commit，不产生Co-Author、eval版本或双上线通知。材料密钥扫描另存gitleaks.log和gitleaks.json，其结果以实际退出码为准。

后续验证需限定本角色/已观察进阶，冻结相同随机输入和完整后继，记录原答、护栏、SL、首次派发、抽弃/药水选择重问和每轮真实边界；历史局只用于核验，参数拟合要按独立局时间切分并保留后期新局。六次相关SL不是六个独立局，原未执行选择无真实反事实，胜率/自然采用及量化父要求不在本批完成范围。其他角色保持等价，没有读取其知识。

本批最终fixes=[]、merged=null、tests={"tsc":null,"vitest":null,"cases":null}；HEAD不变、git工作树保持干净，scratch由既有ignore规则忽略。等待项保留原队列，交调度器根据新证据续派；本报告不宣称已学习入库或大脑采用。最终机器回报见result.json。

## 最终材料核验

2026-10-13T06:19:12+08:00：verify.py实际exit0，8293条保存记录逐行seek回根只读日志并核原字节/偏移/长度/SHA一致；10原Markdown一致，16旧账本claim/status/version保持且CLI链接读回全部存在。HEAD仍652f39b79f7c07ae70e7988d920f134d32362243，tracked diff空、工作树干净。第一次gitleaks实际exit0，扫描146.52 MB、no leaks found；新增核验脚本与末段再经gitleaks-final.log验收。上述属于材料核验，不替代生产tsc/vitest或实际对局效果。

最终gitleaks扫描已实际exit0且JSON为空。收尾首次提前读取尚未完成的扫描结果得到FileNotFoundError，原失败保留final-probe-initial.json；等待原进程完成后读回通过，没有重复启动扫描或冒称测试。
