# H1 自然验收阻塞报告：0/2，首局选择题超时后无法前进

本轮未完成两局终局验收，不能称 H1 自然验收通过。首个真实 R380 自然候选 `5H83F3J0XSTE` 于 2026-10-17 11:00:49.152 CST/F1 启动，原 code=dbd416164、human_pace-h1-v1、Silent/play/auto/非restart，729条已落决策全部有实际预算字段；50条原生Codex记录均为 gpt-6.1-sol/xhigh。发布前启动的 JKDUL0AL0TW6 排除。

截至一次性 >90分钟节点读回 12:31:34.803789 CST，本局仅有运行截点，没有 runs.jsonl 终局：已运行至少90.761分钟，最后决策在12:03:59.219/F48/T1/第3试，距读回27.593分钟无新决策。第二局尚未启动。所有以下新数据都是未完局前缀，不是两局完整结论。

## 卡局证据与原因

1. 最后已落决策 time_budget 为 retry/10000ms，entry剩余1399.425ms，该条实际1042ms、回合累计9643ms；随后进入同回合 CARD_SELECTION。
2. `logs/jev-prompts.jsonl` 原始失败记录 ts=12:04:00.039、label=selection/choose，latency_ms=357，error=`human-pace budget exhausted: Jev`。原始 offset/len/SHA 在 `5H83F3J0XSTE/over90-last-jev-row.json`，request_id=null，不伪称服务成功或另一次有效决策。
3. R380 精确发布源码 `agent/src/hand/loop.ts:1527` 的超时分支使用 decision.resolve(firstAnswers)；`:1345` 的零预算分支使用 decision.resolve({})。`agent/src/hand/screens/pick.ts:186` 的 strictJev 分支对空答案返回 intent=null，而该文件已有的确定性 fallback 位于其外。
4. `agent/src/hand/loop.ts:1552` 遇到空intent只等待并continue；`agent/src/core/decision-budget.ts` 的同key账本保留已耗尽预算。下一轮无法再取得Jev答案，strict解析器又不给合法兜底，形成不能自行恢复的等待循环。该路径没有生成新的 DecisionRecord，故仅统计已落决策会漏掉这次卡局和无效兜底。
5. 控制台12:04:00明确记录 no usable answer / trust-jev waiting；12:04:10记录 stuck for 25 polls on CARD_SELECTION，合法动作仅save_and_quit/select_deck_card，之后无新日志。原controller PID3319441和原inotify监听PID3307923/birth109774449都仍存活；没有终局不是监听丢事件。

这是 H1 预算出口和既有 strictJev 解析器的接口缺陷，证据不是模型推理慢、B2长期计算或机器负载推测。控制台原尾段、四个 R380 原始源码blob及SHA均冻结在该局目录；root当前四叶与发布blob相同。未证明其他等待路径均正确，也不将该问题归为silent-0332资源结算修复。

## 部分运行指标与旧五局

旧五局按正式发布实际时间10:50:56之前已结束的最后五局冻结。JKDUL是旧版重叠局，56.016分钟/F33败，另留原件；以首个H1开局之前最近五旧局作敏感性窗口可加入JK、移出YZW，未偷换主窗口。

| 组 | 局 | 总用时/截点分钟 | 终局/观测层 | 已落决策 | L2题/原生记录 |
| --- | --- | --- | --- | --- | --- |
| 旧5 | YZWV37N2MU6N | 97.410 | F49败 | 1010 | 51/51 |
| 旧5 | N9GKED3PMEV3 | 138.686 | F48败 | 1187 | 47/49 |
| 旧5 | CVJ4MLQF4CSY | 443.303 | F48败 | 918 | 48/48 |
| 旧5 | DC32RW0A80V1 | 150.320 | F48败 | 1216 | 49/49 |
| 旧5 | 2Q6ZYZ6JHM0M | 11.170 | F8败 | 158 | 8/8 |
| H1未完 | 5H83F3J0XSTE | >=90.761，无终局 | 最后观测F48 | 729 | 50/50 |

旧五局总用时中位数138.686分钟，4局超过90分钟。H1当前前缀不能计算完整局总时长中位数。CVJ4有重启分段及两条历史坏行，调用数仅合法记录下界。

以下延迟均为 n / p50 / p90 / 最大（秒）；同回合可比计算代理=pre+planner+plan+jev+deepseek，排除action，按连续局/层/回合/SL片段聚合；与精确预算内部计时分列。地图/SL房型优先，H1预算kind补足；少数普通房按既有策略使用elite预算，档位明细在JSON。L2题按question_id，含失败原生trace；call_ms累计不能跨重试相加。

| 局 | 普通回合 | 精英回合 | Boss首试回合 | SL重试回合 | L2整题 |
| --- | --- | --- | --- | --- | --- |
| YZWV37N2MU6N | 78 / 1.677 / 3.530 / 7.552 | 11 / 1.528 / 3.357 / 3.590 | 35 / 4.157 / 28.783 / 99.186 | 42 / 1.492 / 58.764 / 93.081 | 51 / 23.555 / 58.228 / 92.819 |
| N9GKED3PMEV3 | 96 / 1.695 / 3.768 / 8.538 | 6 / 1.822 / 2.849 / 3.220 | 34 / 5.421 / 242.490 / 428.532 | 50 / 7.130 / 24.036 / 31.039 | 47 / 26.399 / 83.264 / 201.536 |
| CVJ4MLQF4CSY | 66 / 1.159 / 5.620 / 17.053 | 6 / 1.393 / 1.631 / 1.638 | 31 / 4.322 / 135.324 / 575.046 | 43 / 311.922 / 914.145 / 1411.403 | 48 / 34.867 / 70.227 / 82.858 |
| DC32RW0A80V1 | 101 / 1.807 / 3.821 / 10.037 | 10 / 1.759 / 3.150 / 3.913 | 29 / 15.572 / 129.805 / 502.319 | 61 / 12.915 / 70.108 / 460.377 | 49 / 25.568 / 56.401 / 68.794 |
| 2Q6ZYZ6JHM0M | 27 / 0.710 / 1.492 / 3.613 | 0 / unknown / unknown / unknown | 0 / unknown / unknown / unknown | 0 / unknown / unknown / unknown | 8 / 27.982 / 40.895 / 46.618 |
| 5H83F3J0XSTE | 72 / 1.381 / 3.705 / 9.935 | 9 / 0.803 / 2.221 / 3.283 | 19 / 2.123 / 21.789 / 29.751 | 6 / 3.466 / 9.893 / 10.100 | 50 / 24.568 / 51.424 / 67.059 |

H1实际预算内回合计时（仅已落记录；当前卡住的选择题没有终值）：

| 普通 | 精英 | Boss首试 | SL重试 |
| --- | --- | --- | --- |
| 72 / 1.367 / 3.940 / 11.017 | 9 / 0.785 / 2.178 / 3.254 | 19 / 2.114 / 22.080 / 32.028 | 6 / 3.382 / 9.822 / 10.002 |

已落729条决策预算字段覆盖729/729：超预算标记14条、4个连续回合片段；记录到的预算兜底5次（Jev_deadline_current_candidate=3、deadline_current_code_candidate=2）。另有本次 selection/choose 的357ms超时和无intent等待，未产生决策落行，不能把它计为成功兜底或未超预算。已落回合最大超出档位2028ms；仅记录值不保证同步清理零开销。

L2前缀50题/50原生记录，p50=24.568s、p90=51.4243s、max=67.059s，累计24.743分钟，原生超过90s为0。调用次数软上限属于H2，尚未实施，不能以本局已经调用50次判作H1没限时。

B2/B3根样本分布为 n / p50 / p90 / 最大（样本数，非秒）。C2完成与低可信200采样上限不当预算截断；缓存行不是独立重算。旧局未采预算状态，因此旧截断率unknown。

| 局 | lane | 输出行 | 预算partial/显式预算行 | 占显式预算行 | 占全部输出行 | 根样本数分布 |
| --- | --- | --- | --- | --- | --- | --- |
| YZWV37N2MU6N | B2 | 105 | 0/0 | unknown | unknown | 105 / 600 / 1200 / 1200 |
| YZWV37N2MU6N | B3 | 48 | 0/0 | unknown | unknown | 42 / 1000 / 1000 / 1000 |
| N9GKED3PMEV3 | B2 | 171 | 0/0 | unknown | unknown | 171 / 600 / 1200 / 1200 |
| N9GKED3PMEV3 | B3 | 45 | 0/0 | unknown | unknown | 40 / 1000 / 1000 / 1000 |
| CVJ4MLQF4CSY | B2 | 105 | 0/0 | unknown | unknown | 105 / 1200 / 1200 / 1200 |
| CVJ4MLQF4CSY | B3 | 46 | 0/0 | unknown | unknown | 41 / 1000 / 1000 / 1000 |
| DC32RW0A80V1 | B2 | 126 | 0/0 | unknown | unknown | 126 / 900 / 1200 / 1200 |
| DC32RW0A80V1 | B3 | 45 | 0/0 | unknown | unknown | 40 / 300 / 1000 / 1000 |
| 2Q6ZYZ6JHM0M | B2 | 0 | 0/0 | unknown | unknown | 0 / unknown |
| 2Q6ZYZ6JHM0M | B3 | 8 | 0/0 | unknown | unknown | 7 / 300 / 1000 / 1000 |
| 5H83F3J0XSTE | B2 | 29 | 4/27 | 14.8% | 13.8% | 29 / 200 / 200 / 400 |
| 5H83F3J0XSTE | B3 | 47 | 19/42 | 45.2% | 40.4% | 42 / 246.5 / 983.8 / 1000 |

当前B2状态22 complete_budget /4 partial /2 pending /1 degraded；B3为23 complete_budget /19 partial /5无completion字段。候选/配对分布、各样本数直方图、requested、低可信与缺失明细见 diagnostic-analysis-open-r2.json。零产出行仍在分母，unknown不填成0；未对未知记录补模型结果。

## G1c 与超过90分钟归因

原G1c已完成58局、归档边界50；本局是第59个启动候选，尚不能计为第59个完成局。当前仅观察到F17 SOUL_FYSH与F33 CRUSHER+ROCKET都首试过；F48 TEST_SUBJECT首试和第二试失败，第三试卡在T1。F48最终结果unknown，F49未到；首试漏斗已经停在F48，含SL最终漏斗未定。两完整局的G1c比较尚无数据，不能称没明显变差。

超过90分钟的直接原因包括已证实的选择题等待：12:04:00.039至12:31:34.803为27.579分钟。卡住前从启动到最后决策约63.168分钟；其中已落记录计算代理42.364分钟，L2 24.743、B2 1.943、B3 5.695分钟（这些子项与计算代理重叠，不相加），dispatch 6.761分钟。这些是前缀描述，不把全部剩余时间自动归为动画，也不以当前load倒填历史IO。

## 宿主与可复现证据

原ops精确d68e817/R380宿主tsc0、Vitest0，519文件5108过2跳/919.81s，canonical日志SHA已读回。见host-readback.json；后继fixture/知识树不借本绿，原回执的知识变化及输入不可证明完全冻结边界保留。工程检查通过未覆盖这次真实超时等待路径，不能充自然验收。

baseline-r2 与 partial-5H83F3J0XSTE 的每个有效选中原字节范围均已逐SHA核回；前者11452条、后者1615条，前者另保两坏行。data-cut.json冻结原五局、初始日志和后续读取下界；原终局/旧稿/旧失败不改。复现：nice19运行freeze-inputs.py（新局用--new-only）、verify-projections.py，再运行analyze.py --inputs baseline-r2 partial-5H83F3J0XSTE --partial-cut 2026-10-17T12:31:34.803789+08:00 --output diagnostic-analysis-open-r2.json。该partial-cut只是观测时间，脚本保留finished=false/ended=null/duration=null，不造终局。

## 下一步需要Claude决定

建议另派同H1最小修复：为需要Jev的选择题提供明确、可校验的现有确定性超时兜底接口，同时覆盖“入场预算已为0”和“调用中超时”两出口；不能仅设fallback=true但仍返回null intent。保持普通strictJev策略、其他角色、合法性/身份闸、SL和药水规则；不通过重置预算或无限重问掩盖。固定回归应复现retry预算已耗9643ms、选择题只剩357ms、超时后无下一次Jev预算且必须向前执行的控制路径。源码/新行为发布和对局恢复均不在本只读任务内，须Claude明确派活、原ops处理。

两局验收保持pending/blocked，未验收通过。原一次性监听仍保留，仅记录真实新配置/终局，不自动做科学准入；若修复或受控恢复改变本局版本分段，需另行判断本局可否计入，不凑2/2。不运行play/模型/模拟，不改线上或重启。Roy11:37决定计划仍为V5（a49d8c435），编号沿用，H2+未启动。
