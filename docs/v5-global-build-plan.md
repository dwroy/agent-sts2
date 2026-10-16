# V5 全局构筑方向：实施计划

请求：`roy-20261016-global-build`。Roy 于 2026-10-16 在与 Claude 的对话中批准，经 herdr prompt 直接派给 watcher Codex。讨论与数据见 [2026-10-16 讨论记录](../paper/materials/discussions/2026-10-16-v5-global-build-direction.md) 和 `paper/materials/20261016-global-build-gap/`。前序计划：[V5 S 决策](v5-s-decision-plan.md)（已于 2026-10-15 完成）、[V5 构筑模块](v5-construction.md)、[V5 架构](v5-architecture.md)。

## 0. 目标

V5 的核心目的是让大脑有一个**全局的构筑方向和方法**；S 作为优化公式，也是为了引导构筑。现状：方向声明和单题局部评估已接上，但全局评估这一层基本为零。

- 每道构筑题只针对下一个 Boss 评估，第一幕题全部针对第一幕 Boss（已有约 95% 过关率）。
- 第三幕构筑题全部低可信，S 不可用；最终连续 Boss 的 S 为未知。
- 前瞻成型概率一直是 shadow，从未通过校准，大脑看不到。
- 排序不看大脑声明的方向，选路不考虑构筑缺口，模板只有 4 套候选且未验证。

本计划按依赖顺序补齐这些部分，使构筑选择针对**剩余所有 Boss**，并与大脑声明的方向互相检验。

## 1. 摘要

| 阶段 | 内容 | 改变对局行为 | 负责 | 依赖 |
|---|---|---|---|---|
| G1a | 第三幕与最终 Boss 的模拟可信度：低可信 Boss 依据真实对局证据校准；连续 Boss 支持 | 通过校准后才改变 | 学习者（知识）+ watcher（接口） | 无，最先做 |
| G1b | S 真实预测力验证：离线检验 S 能否在模拟胜率之外预测真实 Boss 胜负 | 否 | watcher | 无，与 G1a 并行 |
| G1c | 固定分段漏斗报表：按发布段 / 每 10 局，含首试与 SL、死因；ops 每 10 局存档 | 否 | watcher 实现，ops 运行 | 无 |
| G2 | 跨 Boss 全局评估（扩展原 P5）：每个构筑选项对剩余全部 Boss 评估并汇总；整局准备度跟踪 | shadow → on | watcher | G1a、G1b |
| G3 | 方向接入：排序显示方向进度与冲突；前瞻成型概率按既有流程校准，通过才转 advisory；计划题按方向汇总全局评估 | 是 | watcher（G3b 校准由 ops 发布） | G2 |
| G4 | 模板扩充与核心资格验证 | 知识更新 | 学习者 | 可与 G1 并行 |
| G5 | 路线配合构筑：比较各路线对方向缺口的补件机会与风险 | shadow → on | watcher | G3 |

每个改变行为的阶段单独发布、单独登记编号，并在 run-config 写分段边界，保证 G1c 报表能按发布切段。

## 2. 阶段说明

### G1a 第三幕与最终 Boss 模拟可信度

- 2026-10-16 截点：P2 启用后第三幕 55 道构筑题全部 `low_trust`，涉及 TEST_SUBJECT、AEONGLASS、QUEEN 等。以当前 `boss-trust.json` 和 Boss 校准表为准，列出低可信 Boss 与原因。
- 校准沿既有 Boss 校准流程（S1.boss-calibration 系列）进行，只用真实结局；不放宽可信度门槛，不手调。属于游戏知识的部分按[学习要求闭环](learning-requests.md)交给学习者，学习者必须附证据局。
- 连续 Boss（F48→F49）：在 `double-boss.json` 等学习者已确认的机制基础上，提供两场连战的组合评估（第一场结束后的 HP 与资源带入第二场），使 B3 与 S 能对最终连战输出可比较的值。机制缺失就保持 unknown，不补造。
- 验收：低可信 Boss 逐个给出“已通过 / 证据不足及缺多少”；连战评估有固定测试和一局自然消费读回。

### G1b S 真实预测力验证（离线）

- 数据：已记录的真实 Boss 战（开战时局面、B2/B3 输出、S、实际首试结果），以及 P2/P3 的排序记录。只用固定导出，不新开局、不调用模型。
- 检验：
  1. 控制模拟胜率后，S 是否还能预测首试胜负（例如以 Brier / 对数损失比较“仅胜率”和“胜率 + S”两种模型，按 Boss、幕分层，报告置信区间）；
  2. 胜率并列组里，S 较高的方案或选项是否真的赢得更多；
  3. P2 启用前后 Boss 结果的描述性对比，标注同期其他发布。
- 输出报告与原始题身份。**判定**：若 S 没有增量预测力，按异议流程经 ops → watcher → Roy 通知，并建议把 P2/P3 的 S 键退回 shadow，由 Roy 决定；有预测力则继续 G2，并把结果作为 G2 汇总方式的依据。

### G1c 固定分段漏斗报表

- 把 `paper/materials/20261016-global-build-gap/scripts/funnel_segments.py` 的口径整理进 `eval/`：按发布段和每 10 局切分，含最终（含 SL）与首试两套漏斗、各 Boss 过关率、各幕路上存活率、死因房间类型。首试口径与 ops V5 战绩快照一致。
- ops 每满 10 局运行一次，输出存入 `paper/materials/` 并在 decision-log 记一行。这是论文的长期指标序列。

### G2 跨 Boss 全局评估

- 对 B3 支持的每个构筑选项，分别对以下对象做配对评估：当前幕 Boss；后续各幕 Boss（可见时用实际 Boss，不可见时用本角色已观察到的该幕候选 Boss 池及其观察频率，数据只来自本角色对局）；最终连战（依赖 G1a）。
- 每个选项输出逐 Boss 的配对胜率差 ΔW 和 ΔS（仅限可信 Boss），以及全局汇总值。汇总方式先同时记录两种：原 P5 的 `Σ Δp_i / p_i`，以及“逐个通过各 Boss 的概率乘积”。选用哪种由 G1b 和 shadow 数据决定。低可信 Boss 明确标 unknown，不填零。
- 整局准备度跟踪（原 P5）：每次 B3 计算后，把层数、逐 Boss 胜率与缺口写入本局记忆，供计划题读取趋势。
- 计算复用 B3 runner、C2 按需采样和结果复用；报告 p50/p90 耗时，不得造成卡局（C1 故障出口照常）。
- 开关 `GLOBAL_BUILD_EVAL=off|shadow|on`。shadow 只写日志；至少 2 局完整自然 shadow，并报告与之后真实 Boss 结果的对照，之后才切 on。on 时题面增加紧凑的 `facts.global_build`，P2 排序可以用全局值作为排序键，但这一步须附 G1b 与 shadow 证据，并经规则变更通知。

### G3 方向接入排序与前瞻校准

- **G3a**：`build_ranking` 逐选项显示它对大脑已声明方向的模板完成度变化（来自同题 `construction_evaluation` 的组件计数），并在最佳组与声明方向冲突时标出冲突。大脑选择时须在理由中回应冲突。不设固定权重。
- **G3b**：用 R328 以来积累的 shadow 预测，按 [V5 构筑模块](v5-construction.md) 既定的前瞻校准流程（`eval/construction.py`，学习者核实际结果，ops 发布 `construction-calibration.json`）执行。只有通过入场线的组才转 advisory；没有组通过时，报告缺口和还需要的数据量。
- **G3c**：计划题到复查层时，按方向汇总 G2 的全局评估，供大脑决定坚持还是转向。

### G4 模板扩充与核心资格（学习者）

- 学习者核实 4 套候选模板的核心资格，分析 R 方向从未被选的原因，只依据证据局新增或修订模板。属于游戏知识，按学习协议和学习要求闭环进行。

### G5 路线配合构筑

- 基于出牌机会模型，比较各条路线对已声明方向缺口的补件机会（商店、精英、事件等）与风险。先 shadow 记录，至少 2 局完整自然对局并报告后，才进入题面。

## 3. 约束

- **学习协议**：开发会话不写入任何牌、怪物、机制或数值事实。Boss 校准与模板只由学习者从对局证据得出；阈值沿用现有常量或相对值。
- **角色隔离**：只改 Silent；其他角色默认关闭，铁甲战士逐题等价。
- **测试与流程**：一个功能一个工作树；`npx tsc` 与 `npx vitest run`（沙箱内用 `bash tools/test-sandbox.sh`）；不运行 `play`；提交前 gitleaks；不修改运维 prompt；live 合入由 ops 串行持锁。
- **额度**：codex1 当前靠 credits 运行（10-15 13:00 约 43k，近期约每小时 480，10/20 12:58 重置）。未改动的树不重复全量测试，不另开研究会话；对局运行时离线计算每项最多 4 个进程并 `nice`。
- **不在范围**：P4 Jev 平局仲裁；精英战的 S 排序（原 V5-S 第 9 节）。

## 4. 论文资料

每个阶段都要留下可复现的材料，统一放在 `paper/materials/2026101x-global-build-<阶段>/`：

- 设计与实现说明，以及与本计划的偏差；
- 输入截点（logdb 导出时间、日志字节窗口、SHA）、脚本和输出；
- 发布前后的分段漏斗（G1c 报表）、Boss 过关率与耗时；
- 失败、异议和未知原样保留，不倒填；
- 各阶段在本文追加接续章节；结束时写 `completion.md`，格式参照 V5-S。

决定与上线照常写 decision-log、`eval/versions.json` 和根目录双通知。

## 5. 交接、完成条件与异议

- **执行**：watcher Codex 作为 owner，负责 G1b、G1c、G2、G3、G5 的实现及阶段验收。G1a 和 G4 的知识部分经 ops 按学习要求闭环派给学习者。发布由原 ops 负责。
- **完成条件**：
  - G1a 每个低可信 Boss 有结论；
  - G1b 报告交付并得到 Roy 对 S 去留的决定；
  - G1c 报表进入 ops 例行流程；
  - G2 shadow 验收，并且已启用或 Roy 另行决定；
  - G3a 启用，G3b 校准报告发布（通过或注明缺口），G3c 启用；
  - G4 学习者报告；
  - G5 shadow 验收。
  - 测试通过、回放通过或批次结束都不等于完成。
- **异议**：实现者或学习者如发现某项不成立（例如 S 没有预测力、多 Boss 评估太慢或不可信），按学习要求闭环记录，经 ops → watcher → Roy 告知，不要硬做。

## 6. 2026-10-16 08:12:36 CST G1并行起步与G1b证据停点

原watcher同一owner/thread接续本父。原ops已实际实收并在既有两槽、原线程启动G1a r1及G4旧请求r3；原r2及历史验收保持，回执见 `paper/materials/20261016-global-build-control/ops-dispatch-readback.json`。G1b固定窗口离线报告见 `paper/materials/20261016-global-build-g1b/report.md`：B2/B3均未证明S在模拟胜率之外有增量，终局/SL预测停止分列，已双通知建议仅S键回shadow；**Roy决定pending，未改live**。G1c固定分段工具与原局末钩子已实现，精确源码full仍在运行；原快照24已结束局首试层/通关一致，旧过幕布尔字段差异及修正前测试中断均原样保留。控制档 `paper/materials/20261016-global-build-control/{requirements,checkpoint}.json`。G2/G5自然shadow均0/2，后续阶段及总父继续active。

## 7. 2026-10-16 08:31:45 CST G4源报告交付及异议本人闭环

原模板请求r3的075639批已rc0交付，但experience-live要求仍blocked：源f79983e1c四原经验已完成源端231库存/12新段/15旧段及负对照，自测无源码变化，实际live/编号/消费者仍缺。watcher已完整读取原报告和精确单叶发布包，向Roy本原生会话明确转达“R零主选不识别无效”和“方向声明/持有签名不等于合格核心”；标准notice 48648a0af1e3e62eaf8bca9d、823a7d336ca57361b5f99faf的两个watcher阶段均实际CLI0，不代Roy ACK。原报告143个证据/脚本文件按字节归档到 `paper/materials/20261016-global-build-g4/learner-archive-r3.tar.gz` 并逐SHA核，旧失败/原r2保持。原ops继续原合入阻塞事件，未派新研究；G4及总父未关闭。


### 2026-10-16 08:37:51 CST G1c实际源检查与G4上线接续

G1c精确源9579e378f已交原ops（未合main/live）：tsc0；492文件full为490过/2失败、4920过/2失败/4跳、1315.51s。原超时固定题0s/1s正则及新WT缺原项目venv分别为两失败；只补现有venv链接，不改源码/断言/限时，两失败原题窄补验各0，原full rc1保留，不称full0；按原失败处置交ops给明确集成决定，不重复未变源full。13项新固定检查通过；精确SHA、原失败/中断和补验同G1c/reviewed-checks目录。G4实际R367已live86a4a119/treeadb0266，四对象与源相等、四模板字节保持已本人核；同owner083055固定live消费者与原071301精确宿主仍pending。G1b S决定仍仅Roy待回，不自行改；原其他父保持。


## 8. 2026-10-16 09:00:43 CST G1a接口新源码与G1c/G4实际读回

G1a知识原发布3394e7912已由原ops独立补登V5-R368，0494 shipped，不重排旧版本；当前版本2026-10-16.2的同逻辑新实际probe5/5与隔离通过，本人逐SHA读回，旧receipt/failed保留，原owner同线程技术completion仍在原两槽pending，不当作已实收。三项科学异议44fc95c93f6df419f94e2314已绑定之前本原生三项告知，两watcher CLI0，不重发或代Roy ACK。

通用接口在独立global-build-g1a-interface-20261016实现continuous-boss-result-v1：同一首战样本的实际HP、药槽、剩余复活资源和已知开场扣除随原worker流程进入次战；首战/次战条件/联合原始结果分列，缺样本/截断/无首胜分母及联合S/校准保持unknown。只增加B2/B3日志，不改变当前题面、排序、采样/C2完成或其他角色；奖励后状态与真实次战可操作状态明确未知。tsc0及12固定题通过，新源码full运行中，尚未源提交/合入或自然消费；旧RQ只作基线。

G1c五叶已实际合main c50387b8/live298e74fd/treebea85e8，由原ops只调用已部署helper一次，真实归档paper/materials/20261016-085400-global-build-g1c-through-000040，四个10局块及尾2、manifest/state/唯一marker1和根局末hook逐SHA核；本人25项校验一致。原full1/两补验原件不改，未重跑report.py或旧source full。未来下一边界的自动调用尚未观察；最终G1a+G1c宿主待原刷新WIP完成后原075726唯一通道，不借adb0绿。

G4同owner083055实际live固定消费者原件96文件已精确归档（learner-live-readback-r3.tar.gz），17证据SHA、231库存/12新段/15旧段通过；交付notice78536182bb2bb9c78390cd34的本人两CLI0，非Roy ACK。原adb0精确full0仅结其树，不能给后继树。G4固定经验交付不称自然采用或收益。G1b S决定仍pending，不自行改S或越过G2依赖，总父及0332/更宽父保持active。


2026-10-16 09:04:20 CST 补读原learn.json机械结果：G4 r3已completed；原071301 fallback_checks明确adb0/86a4 rc0，原终局日志490文件/4924测试过2跳，737.27s。本人冻结host-adb0-terminal.log并记录phase-acceptance.json，G4范围完成，不关闭全局父/原宽父，不将该绿借给G1a+G1c后继树。


### 2026-10-16 09:17:27 CST G1a知识原owner完成、工程门槛保持

原090514已同thread完成，仅复用ops真实当前5/5回执及五对象，不重做探针/研究/模拟/full。watcher完整读completion/verification、重核原始native context Sol6.1/xhigh及所有SHA/生产src无差，10原件精确归档learner-technical-closure-r1.tar.gz。新增交付c6b11205b8914ac254145bd9本人两个CLI0，原要求程序completed；不代Roy ACK。知识验收见G1a/knowledge-phase-acceptance.json。通用接口及新自然消费者仍active；原ops723482独立full已真实RUN，新接口自身full26653继续，已观察一个brain router timeout固定case失败，终局/断言证据待全检结束，不先称通过、不改测试/时限。新原件扫描的唯一generic-api-key命中已核为protected-artifacts-before中secret-scan-receipt.json文件的真实SHA值，原扫描rc1保留，仅该fingerprint例外复扫0；不打印或更改凭据。G4窄阶段完成、G1c部署归档已核，S待Roy仍不越G2依赖，原0332/宽父不关。
