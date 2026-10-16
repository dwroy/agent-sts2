# G3b：原前瞻预测的后继原帧核实（只离线、同原 owner/thread）

父项 `roy-20261016-global-build`，本次由 Claude 经 Roy 授权指派 watcher 的 G3b。只补本阶段报告所需的实际结果；不是新全历史研究，不启 G3a/G3c/G5，不重开局、模拟、模型实验或源码实现。请原 ops 沿 `docs/v5-construction.md` 的原量化/构筑 owner、已有学习要求及线程接续，冻结这份输入并记录真实启动；原 `roy-20261011-silent-core-cycle-quantitative-learning` / `roy-20261012-concrete-core-decklists` 和宽父保持。正在运行的旧 revision 不热改；缺槽按原 lease 等待，不扩槽。

## 已冻结的预测输入

- 目录 `paper/materials/20261016-global-build-g3b/inputs/`，`manifest.json` 列出原行 offset/length/SHA、文件截点和导出 SHA；先核 SHA 再使用。
- 截点 `2026-10-16T05:43:17.052214+00:00`（13:43:17 CST）；仅使用 manifest 各源的 `complete_prefix_bytes` 以内原行，不读取截点后数据补本轮终点。
- R328 `4391d1d38bf658747c37ab1d56d53e648ae97167` 以来实际日志，41 局、1371 条 `boss_sim.construction`，其中 1180 条 predicted、191 条 missing_route；145264 行是选项×核心×四指标展开，绝非独立样本数。2454 条 unsupported option 原空值保留。
- `construction-records.jsonl.gz` 是原 construction、角色/进阶/代码配置和决策元数据投影；原完整行（含 route_review 等未投影字段）依 `_source` 回读并验 SHA。`predictions.jsonl.gz` 每行保留原预测身份、option、source、概率记录和 preparation_gaps。不得重新运行预测，不倒填早期缺失的 model/policy/template/as_of。
- `runs.json` / `run-config.json` / `run-plans.json` / `sl-attempts.json` 是所选局的原件投影和字节索引；states/brain/decisions 的原后继帧按 manifest 边界只读，并为实际引用保存原行及 offset/length/SHA。

## 核实内容和原件约束

重点是具备原生四项绑定且概率为数值的 `conditionalSignature`。四核心 P/D/S/R，A10，截止层17/33/48分别有34/28/17个潜在预测局；尚无任何“符合条件结果”的判定。按锚点和窗口共享原件，勿对145264展开行重复读取或做重复研究。

1. **初始实际选项**：核原决策、accepted答案、执行 journal/后继帧，精确对应 logged option。`current` 是反事实基准，不能自动当实际 skip。商店多步购买、remove/upgrade 的 `|cN` 子项若不能精确匹配，标 unknown。不能按最终库存反选一个预测最好的候选。未选候选只保留为 unselected，不能配实际结果。
2. **实际路线**：核本题已保存 actPlan、原 constructionRoute 转换规则及同局后继节点。计划声明不能代替实际走过；变线/缺路线证据排除。原完整 construction 未记显式 route 时，以本题当时已保存原计划及源代码重建条件输入，并保留原件链；不能读取未来计划倒填。
3. **实际后续选择政策**：`forecast_policy=completion-choice-v1` 的真实算法见历史 `agent/src/construction/planner.ts:completionChoice`，仅看当时揭示选项、签名缺口、合法资源和价格。逐窗口核真实后续选择是否符合该政策；run_plan 的主方向或自然大脑总体倾向不是政策遵从证据。无法判断、其他合理政策、分支变更均如实列为未知/偏离，不能为了凑数认定符合。未知事件改变牌组/金币等条件是否仍成立也须核实。
4. **SL 与身份**：预测 `attempt` 是原日志 `[sl_attempt,sl_reloads]` 的 JSON 字符串。非战斗时原生 sl_attempt=null 是无活动战斗，不是第一尝试；不能填1。核窗口后的 SL/回滚/分支，不能拼接不同 attempt 的路线/牌组，无法闭合就排除；保留真实分支理由。
5. **截止终点**：按原 forecast 的截止节点/计算语义核同局签名终点（原模板/升级/数量/替代件/遗物），`observed_at` 必须来自原帧且晚于 logged as_of。死亡、未到截止、缺帧、事件影响未闭合、路线或政策偏离标 censored/unknown，不能当 conditionalSignature=false；完整达点但未集齐才可false。原模板 SHA 必须与原预测一致，不能用当前模板替换。
6. **指标分开**：分别列组件持有（签名）、具名牌实际施放、截止存活、整局结果及其原证据；实际施放只是代理，不推导核心可运转。四模板 candidate / 无完整资格验证器的 functional unknown；`aliveAndFunctional`、`terminalWin` 原概率为null仍为null，不能用存活/组件齐备补数，不将过幕Boss当整局胜。保留 G4 异议及当前生产模型未校准边界。

## 交付格式（无需改线上）

材料放本目录下 `learner-results/`（可在原 WT 形成后由 ops 原样归档），提供 `report.md`、可执行确定性提取脚本、原件 manifest、`outcomes.jsonl` 和 `coverage.json`，含输入 manifest SHA、原 owner/thread/batch/source/实际命令与 rc。允许一个窗口复用同一组原件，禁止把共享帧计作独立对局。

`outcomes.jsonl` 每条对应 **`[source.off, option, core, metric]`**，不得丢 option：

```json
{"source_off":123,"option":"原预测key","core":"P","metric":"conditionalSignature","disposition":"matched|unselected|missing_binding|censored|route_changed|policy_changed|sl_unknown|unverified","reason":"具体原因","outcome":{"character":"silent","run":"原局","decision":"原决策","core":"P","metric":"conditionalSignature","horizon":17,"model":"原记录","policy":"原记录","attempt":"[null,0]","ascension":10,"template_sha256":"原64位SHA","complete":true,"followed_policy":true,"followed_route":true,"value":false,"observed_at":"原终点ISO含时区","evidence":[{"path":"...","off":1,"len":2,"sha256":"..."}]},"observations":{"components":{},"actual_casts":{},"survival":{},"run_result":{}},"verification":{"initial_option":[],"route":[],"policy":[],"sl":[],"endpoint":[]}}
```

示例值仅说明结构，不能直接作标签；无法证明的 true/false 必须 unknown/不提供 outcome。可将同一锚点、窗口或连续 option 排除压缩为 `coverage.json` 中明确可重建的规则和精确 source_off 清单；须覆盖全部1371锚点，不能只报看起来可通过的窗口。未完成核验要明确未完成，不能伪称全部否定。至少列每核心/进阶/指标/截止层/模型/政策/模板的候选数、实际匹配数、独立局、各排除原因和证据缺口；不要求新补样本，不放宽任何门槛。

原 evaluator 的 identity **没有 option 维度**，因此只能实际选项获 outcome，未选不能抢占同一 identity；同局重复决策交原 evaluator 去重，不重命名 decision 制造样本。watcher 汇总原预测与结果后运行原 `eval/construction.py`。

## 入场线与停止边界

精确组为角色×核心×进阶×指标×截止层×模型×政策×模板；至少10个独立局、正负结果均有、Brier严格优于组内常数基线、|bias|≤0.1，只有 conditionalSignature 可晋级。缺绑定/政策偏离/不完整窗口排除。不得拟合新模型、改变切点或策略、不另造研究父项；不同意见/反证由原 ops→watcher→Roy 原链告知。没有通过组不创建通过文件、不改 construction-calibration.json 或线上配置。交本轮实际核验报告后停止，宽父不因这份报告关闭。

离线每项 `nice -n 19` 且最多4进程，禁止 play、游戏API、额外模型API或新模拟/研究；账号/模型/home/prompt不变。G2整合及其宿主交原ops，本项不监听自然局或启动其他阶段。
