# 静默猎手策略提案批次报告

记录时间：2026-10-13T05:16:18+08:00。批次20261013-050343-strategy-proposal。

本批逐项完成十个已领取提案的证据与当前实现复核，全部 waiting；没有新源码或知识数据改动，fixes=[]、merged=null。保留当前SL、HP护栏、持药价值及巨兽参考排序。本批不宣称任何新规则、经验入库、消费者自然采用、通关改善、implemented、duplicate或shipped；不关闭量化父请求。

## 身份、基线和证据

开工git status干净，HEAD=a77d86dff0b917dc731b99ac6bd2721b60100647；普通批次执行git merge --no-edit main返回Already up to date，基线未变。根learn.json对应行task=strategy-proposal、character=silent、reason=proposal，工作树与本任务一致，proposal_ids恰为本批十项，没有research_request/implementation_request/proposal_repair。按普通批次条件只读根notes/strategy-research-silent.json，绑定其他batch，因此保持原队列任务；未读取其他专题work_spec或合入其他研究。

runs.jsonl的六条唯一记录全部SILENT/A10，行号与原字节SHA见run-identities.json。来源局的code字段都带dirty，未恢复历史脏树，不将当前源码冒作当时完整源码。六局都是最终败局；PU80局F17第五试巨兽赢余2是局中战斗胜利，并非最终通关。751与KEN各六次异鱼SL依旧只算各一独立局，不能拆成训练/留出样本。

原生会话01a131ed-f41b-7613-ba8f-232c6875db1c的turn_context行8实为gpt-6.1-sol/xhigh，SHA见native-model-receipt.json；实际启动command同时为service_tier=default。任务模板写high，宿主实际传xhigh，本批按现有运行身份执行，未修改模型配置或冒称发生切换；没有派下级agent。

共保存/核对8,308条本角色原记录：4,167状态、4,071决策、43 SL、6配置、21计划。fight-plans.jsonl按六局原局号没有匹配记录，F13无药参考直接来自decision题面。日志只读，逐记录原路径、冻结字节切点、行号、偏移、字节SHA和选取文件SHA见evidence-manifest.json；不把全日志最新长度当作本批证据。原提案Markdown十份均核首次登记SHA，相关12条silent经验保存为related-experience.json，只用来核既有范围/链接，未重算其中全历史分母或扩展研究新局。

| 局号 | states | decisions | SL记录 | 原配置 | 计划记录 |
|---|---:|---:|---:|---:|---:|
| 751FN9QM9MHQ | 624 | 615 | 6 | 1 | 2 |
| KV0JHNJCKXLS | 686 | 669 | 7 | 1 | 5 |
| YQL8RZ8BWN1E | 582 | 571 | 6 | 1 | 3 |
| L9SGRBB5R698 | 653 | 635 | 6 | 1 | 3 |
| PU80F84P6HPN | 1064 | 1033 | 12 | 1 | 5 |
| KEN58SH9SLZ6 | 558 | 548 | 6 | 1 | 3 |


## 证据结论与反例

七组同日志指纹配对都复核了实际下一轮起点的HP/敌HP净差：751 F17 T2多扣9多损5；T7多扣6多损10；T13少扣6少损6；KEN F17 T10多扣2多损6；T5多扣1省2，但步法T5延到T9，T8两防御仍各5。KV0 F33 T5删除致命毒药+少扣7且双方零损；首/末T1删究极打击少扣14且双方零损。这些是同题面局部取舍，不能证明单步导致整战输赢；不同后继、未知随机数流及被判死截断轮保持未知。audit.json保存两边SL/决策原行、动作、B2误差、净差及controlled_whole_fight=false。

751 F13 T3 plan2饮用、plan3当轮无药、plan5全战无药必须分开：三者均预测损8，plan3后继7/8样本仍饮用；plan5才有无药完整模型线，8/8样本胜不是实际留药证据。成本0源于缺表，不是持有价值已知为0。

YQL F17 T10毒水真实2→8毒，而HP26、挡13、来袭41不变，下一状态死亡为0；26+13−41=−2与死亡截断分列。L9与PU80旧占位血anchor也核实。PU80局中巨兽胜线的施弱、时点和后轮动作都不同，不能由它证明新排序改善。占位体本体剩血0、自爆待结算的诊断已有实现，原参考排序仍比较原始占位残血，不能将展示完成写作排序提案完成。

KEN七次药槽饮用及0丢弃全部连状态核实；六次F17 T1都是75/86空药。发光水后实际重问，技能药进入选牌并再出牌；这些后继归属必须与第一次药水动作分开。缺F15无药/留药完整实盘支线，零损胜战不证明无药零损，也不能用空药boss败局拟留药价值。

## 十项处置

每项原文、逐局/层/回合证据、账本id、反例、预期行为、验证及等待条件完整见[proposal.md](proposal.md)。本批不重建原id、不覆盖原提案、不重复复盘。

| 提案id | 账本id | 处置与具体缺口 |
|---|---|---|
| silent-proposal-366288801d9150d9 | silent-0079、silent-0176 | waiting：751 F17 T2/T7/T13同指纹血价已核；缺续问后实际整轮归属及保持后继一致的整战支线，不能拟探索门槛。 |
| silent-proposal-85929bdfc8a3fc1b | silent-0019、silent-0021、silent-0005、silent-0007、silent-0129、silent-0176 | waiting：持牌未知/持药未知已有诊断；F13 plan5只是无药模型参考，缺实际不喝/留药整战和抽弃重问后的收益归属。 |
| silent-proposal-efd9f83ee9e1a6dc | silent-0079、silent-0176 | waiting：已有SL候选血价子项；751六试相关且全败，缺完整执行归属、受控胜线与时间靠后的独立验证。 |
| silent-proposal-131042659448ae74 | silent-0019、silent-0020、silent-0021、silent-0005、silent-0006、silent-0007、silent-0046、silent-0129、silent-0176 | waiting：力量/敏捷/毒/荆棘分项不证明联合收益；缺实际无药、留药整战及续问后的药水/能力联合归属。 |
| silent-proposal-990f054036609447 | silent-0102、silent-0019、silent-0020 | waiting：KV0 F33 T5删毒净扣36→29、两线零损；毒与回血同帧，缺完整实测分账及同后继整战对照。 |
| silent-proposal-e18d3f18e6cac2a0 | silent-0017、silent-0250、silent-0011、silent-0027、silent-0046 | waiting：巨兽阶段/占位展示已有实现，原残血仍参与同轮参考排序；缺替代排序的受控完整后继和独立验证。 |
| silent-proposal-9733bb80f445aeae | silent-0017、silent-0019、silent-0020、silent-0250 | waiting：YQL末轮毒2→8而HP26/挡13/自爆41不变；缺提前喝、不喝、留药及阶段改序的完整对照。 |
| silent-proposal-c51468c5e8ba6668 | silent-0019 | waiting：KEN七次饮用和六次75血空栏入口已核；缺随机选牌/重问整轮收益归属、F15不喝和留药到boss的整战支线。 |
| silent-proposal-86a7db08d1a31976 | silent-0079、silent-0021、silent-0125、silent-0005、silent-0176 | waiting：KEN T10多损6仅多扣2、T5省2血却延步法至T9；缺受控能力后继及新独立局验证，不拟统一血价或关闭探索。 |
| silent-proposal-e282a9131b99129a | silent-0021、silent-0079、silent-0125、silent-0176 | waiting：候选/持牌/首次派发已有子项；缺续问完整执行归属、保持后继一致的整战与后期独立验证，不将子项登记整项完成。 |


## 当前live已有部分与未完成边界

固定捕获live HEAD=83d43cc1ee9f66cbcd65d952db00ec8ad8ce1d96。11份相关源码保存原字节/source SHA/实际live祖先源码commit，见audit.json。持牌预测05cd292c6f01bb31e406473d3a9843e659d62b93，未知持药/无药参考04921bd785ac6838066522f91ea0bb6ab95cb6a1，SL候选成本a8b1f8be153fe4f3a34146117546c2178f2e446b，首次派发bade647f9fe4c9103b40e2f26b26296692ad24b7，巨兽药水展示d5e20aa4dd44168ce30944dfcce74f8322144953与阶段终态记录0d092f6b928a6221eabf3516abad25c48ceaac9c，均通过捕获live祖先校验。它们是旧实现，未登记为本批实现。

selection_audit、candidate_comparison的actual_turn仍null；selection_dispatch仅单动作receipt，state_effect_verified=false、whole_plan_executed/actual_turn=null，不能当续问后完整整轮归属。explore.ts的enemyHpLeft/anchorRank仍以末轮原始敌HP同轮比较，阶段展示不等于改排序。三个共用文件与base的字节差仅Roy→Dai作者名称，保存live-source-delta.json与原diff；没有冒称全树一致，也没覆盖其他live变化。

## 验证、记录、限制与回退

audit-evidence.txt只核固定证据和历史源码，不是生产测试。最终审计退出0，七配对数字、全部原记录SHA、原角色/A10、七次饮用、巨兽末轮快照及源码祖先断言均通过。首轮抽取忽略states内嵌run_id而出现0计数，保留v1脚本/清单后更正；审计两次分别因run-plans使用run字段与判死记录无chosen字段失败，原v1/v2脚本和stderr均保留，修正后通过。这些失败是本批取证工具处理格式的问题，不是游戏代码失败或撤源码红绿。

未改生产代码，无撤源码失败/恢复通过，未运行tsc、vitest或沙箱源码检查，不复用旧批成功来造本批成功；tests={"tsc":null,"vitest":null,"cases":null}。无新提交，故没有Co-Authored-By、合入commit、eval版本或Roy规则变更通知。root账本只经ledger.py update追加本批报告/提案链接，保持既有claim/evidence/status/version，不降级shipped、不代ops登记；原队列状态由调度器消费proposal_results，学习者不手写队列。

没有新行为可回退。后续仅沿原十个id补数据，控制后继并按独立局/真实开始时间划分训练与后期验证；不拿本批既调参又报独立胜率，不借其他角色知识，不删除合法选项，不运行play/联网/LLM/模拟池。若已有完整归属但无法核实证据也继续waiting。保留所有原局、失败、初稿与未知项；下一步是补缺失支线/消费者整轮归属，不将等待当已入库或已上线。

结构化最终回报另存[report.json](report.json)，逐项结果与本报告一致。实际工作树与材料完整性最终核验见final-integrity.json。

最终核验：root账本CLI16条追加逐原行SHA核实，仅where/note/by及CLI时间字段，无status/evidence/claim/version/effect变更；gitleaks dir材料扫描退出0、152.05 MB无泄漏。报告及十项JSON字段校验通过，git status干净、HEAD未变；这些材料检查不填作tsc/vitest/cases成功。
