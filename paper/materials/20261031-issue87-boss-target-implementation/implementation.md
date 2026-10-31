# #87 V5 Boss目标档案工程候选

依据[主管批准与四点补充](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6542249263)，在原分支/原工作树实现。基线`8581aa5ff761a576fbc89b3b57237fed5a8ef0c8`；第一阶段方案固定在`19b6789e0f9e2318718daac1e3dc210c1d78044c`。本候选没有发布号，工程接收、实际部署、10局行为和每30局效果分别核收。

## 结果

- Silent A10非战斗构筑题从第一幕必带紧凑Boss事实档案，六个二/三幕Boss各给实测身体/首相HP和已有招式，揭晓目标优先补统计/机制；第三幕已观察有序路径与本局身份分列。完整JSON封装硬限1500B，不截断数值、句子或把未知补成0。
- 必填`boss_target={boss_ids,gap,reason}`，本题规范ID/去重/数量/Unicode长度校验沿原重问。空ID须说明取舍，代码不替大脑选牌、判断能力缺口或增加打分。普通、stable、Codex strict及dsh答案入口和动作日志均保留该字段。
- 首见/揭晓变化显式复核endgame的`win_condition/gaps/resources`，允许沿用原文，其余增量合并、实际改线仍写理由。服务端观察身份随原计划日志保存，跨局和未来楼层元数据不带入。未确认F49不猜组合，也不把F48入战血药当作F49资源。
- 仅本单范围的构筑题去掉`BOSS_MARGIN_NOTE`/`boss_margin_objective`，其它`act_boss_sim`事实逐字保留，S计算及战斗规划未改。
- #83接口先交：已核数据须经现有strategy文档正常K1发布、按本局绑定精确读回；own和各external来源/版本独立保实际胜、实际死、预测截止、未知与重试。未发布草稿不进题面；多个有效profile不自行合并。隔离测试确实走原submit→validate→publish→绑定读回，不能冒生产采用。
- K只给已绑定发布的策略目录，不复制正文，`strategy_bodies=0`；原触发、B−和3次曝光门继续由原消费者负责。构筑需求没有已发布结构时unknown，大脑可依机制提出带依据的本局假设。

代码/接口说明见[docs/boss-target-dossier.md](../../../docs/boss-target-dossier.md)。不凭模型知识补Boss事实；未运行模型/游戏、未改main/live/STOP、配置、发布票、别的线程或会话。

## 三题完整前后题面

`full-prompts-final/*.before.json`/`*.after.json`各自保存**完整system、user、实际Codex schema、工具目录、分项字节及SHA**；[report.json](full-prompts-final/report.json)给来源原件窗口、SHA、K1成员和限制。[replay-input.json](replay-input.json)是可重跑固定输入，CLI使用生产消息/任务/schema构造器，不调用模型。

| 原题 | 原局/楼层 | 档案封装B | 完整消息新增B | 固定温缓存投影p95 ms |
| --- | --- | ---: | ---: | ---: |
| event/choose | 48LJUVW34AHT / F1 | 1483 | 2022 | 0.2564 |
| rest/plan，原pick入口 | TBFLR466YFJG / F32 | 1496 | 2017 | 0.4347 |
| reward/card | 8CHJ5W30Q7Z8 / F35 | 1498 | 2012 | 0.5357 |

每题100次温缓存固定投影；首次事实缓存构造约61–96ms单列，不冒每题增量/自然模型延迟。原日志system只保存12位短SHA和JS字符数；重建值逐题匹配，不声称原日志有完整SHA。raw上下文只还原原题记录的run/act/floor/boss及必要脚手架，不称完整mod快照。选项、记忆、工具目录来自原题；模拟除目标文字键外相等。

初轮整题新增2219–2250B，超过方案建议2KB；压短重复指令后复验。迭代报告留在[iterations/](iterations/)，旧完整输出保留在本树`data/issue87-implementation/full-prompts-r1`与`full-prompts-r2`。最终三题均≤1500B档案、≤2048B整题增量、固定投影p95≤5ms；这些固定检查不代上线10局验收。

## 来源与边界

审计逐题写M/O/K/E路径、完整SHA、版本和分母；M/O经原兼容读取门，K1无Git/current策略兜底，外部两份数据按已审SHA核验。M只展示A10已观察值；首相HP和首见能力不扩成总HP/天生机制，阶段HP仅列观察集合。O含重试的聚合不当首试胜率，E上传受伤分位不是净损/安全线/因果收益。死因和无证构筑能力unknown，完整原工具仍可查。

三题绑定同K1-753af285…7fec，M/O是本候选明确冻结的聚合，不能冒历史时刻反事实。原run-config源码捕获有ENOBUFS，不能用`code=current`猜R461–R463身份。

#83前稿[来源评论](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6542415950)固定`816ead1e616a93969ffd8918b4b7c9c674f5b233`，读回SHA见[upstream-receipts.json](upstream-receipts.json)。新外部独立分母更正取代旧first标签盘点；旧数留历史，本文不混加自有、外部或sts2fun独立源，也未将新机制/候选策略冒K1发布。本候选不等#83科学父项结束。

后续[首轮校准/草案修订](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6543214664)固定`c7e4252a`也已读回登记：准备建议为未发布假设、能力需求unknown；上游称校准未过且107只作诊断、批准拟合仍70。保来源与更正，不把其模型输出、候选策略或效果写入运行档案。

## 自检与集成

当前交付按主管本轮直接指示：**“现在就按已冻结的实现和三题前后完整题面交付……最终全量检查用合并批的组合检查代替”**。不再等待第二次自有全量；首轮rc1保留，最终组合全量尚未执行。[validation.json](validation.json)列实际检查、授权和日志SHA。冻结受测源码和部署建议见[source-freeze.json](source-freeze.json)；新旧方法和新增静态边见[declaration-delta.json](declaration-delta.json)。本单相对基线13个声明闭包已静态核实，仅v6-history和silent-boss-calibration身份变化，其余11个不变。这是工程声明，不能沿旧生产方法票放行。

定向8文件111项、固定方法准入24项已过。首轮完整沙箱rc1：659/660文件、6118/6119项过，唯一是稀疏树缺少历史`issue29-brain-speed/results.jsonl`。已恢复原Git字节，blob/SHA见[sparse-fixture-receipt.json](sparse-fixture-receipt.json)，导入检查定向绿，未改生产代码/测试/排除名单。原rc1保留。

交付前短复验2文件8项通过，包含实际导入检查及报告CLI全部7项（含让位期间新增的查询覆盖/effort来源两项）。两新增CLI连同全部生产源码的隔离tsc通过；生产tsc亦在首轮canonical进入Vitest前通过。广域`tsconfig.tools.json`在既有工具路径报类型诊断，原件保留，不将其宣称绿或扩修本单无关工具。

按[集成员#77优先要求](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6543026385)，本单第二轮未获槽runner已核身份后退出，暂停追加heavy/full，待该组合检查完成。仅记录回执已推`8d9d5281`；[resource-deferral.json](resource-deferral.json)保机器记录与本单入口，历史ROOT锁归属缺同刻FD证据为unknown，不以当前机器running字段代历史锁证明。

ROOT+LIVE需要本单agent/src差量，ROOT另保工程声明、工具、测试和材料。#86至少共享`ops/fixed-producer-dependencies.json`；最终ROOT/LIVE叶交集、同批组合和唯一完整检查由集成员核，不能整文件覆盖双方差量。这里未自动合main/live，也未申请生产准入或抢唯一组合full。新方法的实际双根/终态/CAS准入仍交原owner，切换只在自然局间。

## runtime接管和未完成项

原ops冻结匹配发布的首10自然Silent A10局及R461–R463对照身份，运行只读`agent/tools/boss-target-report.ts`：按引擎/模型/effort原生回执/请求服务档/题型/查询/重问分层报具体目标比例、空ID解释、失败/重问、实际Boss查询、完整原生消息字节和决策时延。静态展示不计主动查询，格式通过不计自然采用。p50/p95**相对涨幅严格>10%或绝对>2000ms，任一告警**，阈值不调；历史缺字节保unknown。

历史题没有本单context/别名时，CLI的Boss调用匹配覆盖不足，不能把匹配0当作实际零查询；旧对照的原调用交原ops按冻结来源另核。本单10局有必带context与审计别名，旧日志不回写。

只读报告的`boss_query_scope`显式保已映射/未知题数及complete/partial/unknown；effort仅在回执实际有该字段时标native，并按来源分层，回退不冒原生证明。这两项在让位等待时补齐，增加旧题/混合窗口及effort来源两条固定测试，已短定向复验；运行源码和三题回放未变，前一份冻结见`iterations/source-freeze-before-query-scope.json`。最终整轮由合并批承担。

每30个结束局沿原战斗/SL原件看F33/F48/F49首试结果：实际胜/实际死/预测截止/unknown/未到场分开，更早首试截止后路线及重试胜不补首试；同时报全窗口与到场且已知分母，F49条件于F48首试已过且实际到场。未满窗口不关科学父项。发布号、真实K1数据读回、10/30局及收益目前均待原ops/学习者接管，不冒工程检查已完成。
