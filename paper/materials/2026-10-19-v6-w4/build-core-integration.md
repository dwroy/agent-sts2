# W4：build-core-v1 多组合适配

记录时间：2026-10-19 18:42:53 +0800。会话 v6-w4w6，Codex gpt-6.1-sol。此轮承接 main `877be78dc` 中 Roy 确认的多组合设计；原 report.md 的实现与验证记录保留为历史。

## 题面与答案

当前角色、进阶的正式方向读取 `build-cores.json`，每个方向保留所有组合。组合摘要保留具体牌及数量、升级要求、可替代牌、组合类型、适用目标、证据，以及对应进阶的实战/模拟指标；首试与含 SL、版本口径不合并。旧 `direction-card-v1` 不再作为 W4 组合来源。

正式核心构筑卡尚未发布时，过渡适配器只读原 construction 模板：原要求的数量、升级、遗物、替代项和 distinct 原样保留为一个最小组合；support 不提升为必需件，缺测指标为 null。不生成、提升或发布游戏知识。

大脑题面字段 `build_cores` 按方向列出组合及其 `projection-entry-v1` 数据：拿/跳过的凑齐概率、凑齐与凑不齐胜率、组合期望、方向值、配对差、指标快照及可信度。缺少投影的组合×目标补完整 unknown 行，并计入 T6 的未知占比；提供方显式 null 的指标仍为 null，不拿其他值填充。题面不自行重算概率、胜率、最大组合或加权值。

答案仍为 `direction-weights-v1`，只输出完整目录的方向权重及原有药水、路线、休息、复查字段。`ideal_overrides` 是该方向的临时组合，`source=brain`、稳定 ID `<方向>:brain`；只允许目录内或本局出现过的牌。它不替换正式组合，不写知识文件。规划重启恢复后先还原临时组合再校验投影，且不能跨局携带。

## W3 固定数据契约

在原 `projection-entry-v1` 上只追加可选字段，旧条目不补新键：

| 字段 | 含义 |
|---|---|
| `combo_id` | 对应摘要中存在的组合 ID |
| `combo_source` | `build-core-v1` / `construction-transition` / `brain`，须匹配摘要来源 |
| `win_complete` / `win_incomplete` | nullable `{value,se,n}` 条件胜率 |
| `incomplete_source` | `empirical` / `unknown`；非空未凑齐胜率必须来自 empirical |
| `expected_win` | nullable 组合期望；非空时须同时有凑齐概率和两个条件胜率 |
| `direction_value` | nullable 提供方方向值 |
| `combo_metrics` | nullable、有界 JSON 指标快照，保留采样口径与证据；数值须有限 |

仍沿用原 `availability.take/skip`、`target_id`、配对差和 trust。组合数据通过 W1 校验后，还按当前角色方向、组合 ID、来源过滤；未知 ID 或错误来源不进入大脑题面与构筑日志。日志读取相同追加式 schema，完整保留合法测量。

固定数据仅用 `TEST_*` 和 `FIXTURE_RUN`，包括一方向两个正式组合、独立首试/含 SL 指标、临时 brain 组合与明确缺测。W3 生产提供方尚未合入；此契约须在 W3 合入后对齐实际输出并补真实提供方集成测试。不能把固定数据通过算作完成投影集成或收益验证。

### W3 未提交草稿的字段分歧（交 Claude 协调）

19:06:42 +0800 只读参考 `.worktrees/v6-w3-20261019/agent/src/sim/v6-projection.ts` 与 v6-completion.ts，未写该工作树。读取版本 SHA256 分别为 `926e920d466ee6fa399a4df87966d874a414ce8c197df7c104ca6b68fb17925c`、`b58c58a4f90d08988f560b002cb63656c2f0aee93f4c73f30df193b8b8db8f83`。草稿尚非发布接口；正式 BuildCore/BuildCombo 和 cores 加载已按 W1.1 接入。

W4 当前薄适配为 `directionSummaries` / `directionTask`：只读正式核心卡或过渡要求签名，将经过 W1 校验的组合投影按方向整理成题面，不实现 W3 的概率或胜率计算。固定投影采用上表的可选追加字段；目前**不直接消费 W3 的包装对象**。下列差异须在 W3 正式接口发布后统一映射，不能把 table.entries 的方向最大值当作所有组合：

| W4 固定数据 / 消费字段 | W3 只读草稿 | 后续对齐事项 |
|---|---|---|
| 组合数据放在 ProjectionEntry 可选字段 | table.combinations 中的 V6CombinationProjection 包装 entry；table.entries 是方向最佳组合的聚合 | 从 combinations 逐组合适配；聚合表仅供方向值，不复制成每个组合的测量 |
| combo_id | combination_id（可为 null） | 空 ID 保持未知，不凭空生成正式组合 |
| combo_source：build-core-v1 / construction-transition / brain | completion_source：build_core / construction_adapter / brain / unknown | 仅做已确认的来源枚举映射，unknown 不冒充正式来源 |
| 过渡 ID `<方向>:minimal` | 过渡 ID `<方向>:signature` | 由 Claude 协调统一 ID 或明确只读别名，不能靠同名方向猜匹配 |
| win_complete / win_incomplete / incomplete_source | completed_win / general_win / general_source=empirical | 保留 `{value,se,n}`；未测量仍为 null |
| expected_win 为 nullable 数值；direction_value 独立 | 组合 entry.win 为期望估计，方向 table.entries[*].win 为最大组合估计 | 取值时保留原 se/n/缺测语义，不在 W4 重新计算最大值 |
| 当前按 target_id 展示组合投影 | completed_joint_win / general_joint_win 与 entry.joint_win、joint_paired_delta 独立保存 | 连战须读 joint 字段，不能用首战期望或两次单战胜率相乘替代 |
| combo_metrics 快照或当前进阶的正式组合指标 | summary 为组合指标；formation_se/n、sample IDs、model_labels、unknown_reasons 单列 | 正式适配保留分层、置信区间、来源与未知原因，不以快照覆盖缺测 |
| Boss ID 与 joint 必有缺测占位；T6 计数据条目 | targets 明确 current/future/chain，实际 target ID 由提供方定义 | 对齐实际目标 ID 及 chain 标识，避免虚增占位；W6 可信度查询也需联验 |
| DirectionEvaluation 的 id/comparisons/coreCompletion/pivotMatched/危险线 | act_evaluations[*].versus、table.telemetry 等，尚无最终环境接线 | 核对评估身份、比较方向与符号、连战字段、n/SE 和 T1/T4/T5 数据，固定数据通过不代真实触发集成 |

W3 合入后以正式接口为准增加薄映射及真实提供方集成测试；本轮不要求 watcher 改未提交草稿，也不将当前固定字段宣称为共同确定的正式 W3 契约。

## 验证状态

W1.1 正式格式提交 `6e39eb2dc` 已进入 main。正式加载器、组合格式和 W4/W6 接线定向测试先以 6 文件、80 项通过，主代码 tsc 退出 0。首次定向中有一条断言尚按“只返回已提供条目”检查，补齐 unknown 行后失效；断言现检查合法实测条目保持原样、错误组合及来源被拒绝、缺测行完整保留。原失败日志 build-core-targeted.log 不覆盖，修正重跑见 build-core-targeted-rerun.log。

18:55 复核时补齐部分提供方的目标边界：本幕 boss_id（未知时 unknown_boss）与 joint 始终列出，再并入提供方的其他目标；不能因某目标没有返回条目而让它从表中消失。上轮全量用已核实的本工作树 Vitest PID 发 SIGINT，退出 130、源码未在进程内修改，原件保留为 build-core-vitest-cancelled-target-coverage.log；终止后才改代码。补齐用例时一次多余括号导致定向转换失败，原件 build-core-target-coverage.log 保留，修正后 6 文件、81 项通过（build-core-target-coverage-rerun.log），覆盖只提供 Boss 或只提供 joint 两种情况。药水连续兜底 T6 用例提供全部组合×目标，确保不是由 unknown 占比间接触发。

离线合成题面冻结为 build-core-fixture.json；verify-build-core-fixture.mts 只读正式格式并重建题面与答案 schema，不调用模型或游戏。独立读回精确一致，SHA256 `4e0722654e4ea87c8dbf076b85018cad32a0708b995a059858fa3c5add020d56`，71315 bytes，网络请求 0；回执见 build-core-fixture-readback.json。

基线 `6e39eb2dc` 上的稳定源码全量：主代码 tsc 退出 0，Vitest 567 文件、5462 通过、2 跳过，367.92 秒，见 build-core-tsc-final.log / build-core-vitest-final.log。随后变基到 main `288c2ad29`（相对前基线仅材料和 decision-log 更新），当时实现提交 `0239932e7`，tsc 退出 0，代码范围 gitleaks 无泄漏。其全量检查运行中 main 新增 W8 的 `a600fcb58`；19:06 核实本工作树 Vitest PID 1814923 后发 SIGINT，退出 130，原件保留为 build-core-vitest-cancelled-main-advance.log，终止后才变基。共享 formats.ts 自动合并，保留 W8 的 cores/combos 字段；当时实现提交 `0014770bb`，代码范围再次 gitleaks 退出 0、无泄漏。变基后的完整检查通过：tsc 退出 0，Vitest 568 文件、5505 通过、2 跳过，316.27 秒，见 build-core-tsc-after-w8.log / build-core-vitest-after-w8.log。全量运行期间源码和测试保持固定。

随后变基至 main `d0e485d80`（Nova 要求文档），当时实现提交 `846ebde22`；该稳定源码最终全量通过：tsc 退出 0，Vitest 568 文件、5505 通过、2 跳过，350.57 秒，见 build-core-tsc-after-nova-doc.log / build-core-vitest-after-nova-doc.log。期间 main 新增 `509fa7940`，仅 learner/tasks/v6-reflex-distill-r2.md 文档，agent 树对象与 d0e485d80 完全相同：`793538eaedb33c5b98b57835f60de357af17c3f5`。完整检查结束后变基到最新 main `509fa7940`，最终实现 `787cb5243`。变基前后受测 agent 树均为 `b9d1910427ec2b1fe2ba944a73ace759adddaf95`，可执行路径未变；仅学习任务文档更新，沿用相同源码树的全量结果，不重复运行。最终代码范围 gitleaks 退出 0、无泄漏，见 build-core-gitleaks-final.log；结构化验收回执见 build-core-final-validation.json。材料暂存扫描单独保留为 build-core-gitleaks-materials.log。

W4 的 T1–T7、同回合合并、每局 15 次软上限与例外、请求前持久化预约、拿牌路由开关保持原实现；本轮同时保留 W6 的实际连续药水兜底计数接入。默认关闭；不触及模拟实现、Jev 客户端、出牌提示日志、正式或待发布知识。

仅集成 main，不上线 live、不分配行为发布号。`ops/worktree_retention.py complete` 要求本运行环境中 main/live 双方的真实提交与祖先关系；当前 live 不存在，不能生成有效完成回收回执，保留两棵工作树供原调度器后续验收。未开局、移除 STOP、恢复 Regent、派学习批次或修改共享配置。

## Nova 协议离线复核

19:11:18 +0800 按 Roy 的网关要求只读复核 W6 已冻结题和既有真实请求回执，见 nova-protocol-readback.json。唯一 choice 的两个候选位于 criteria 对象，逐槽丢弃仍为 noul；wire SHA256 与原回执一致，Nova `/api/alpha/decisions` 实际 selector 为 `typesafe/jev-1.14`，HTTP 200，所有答案格式有效。本次复核网络请求与凭据文件读取均为 0，没有重发请求、调整客户端或改环境。原真实请求 1486ms 超过生产 1000ms 预算；既有报告的格式验收与延迟限制保持不变，生产预算和超时兜底不变。DeepSeek 网关由 main 既有适配器处理，本包不新增该客户端。

最终集成记录时间：2026-10-19 19:18:38 +0800。W4 原实现 `3a6f5eadf`，本轮多组合追加实现 `787cb5243`；W6 `35ed7015e` 已在 main。所有检查均 nice -n 10，PATH 含 ~/.local/node/bin 与 ~/.local/bin。受测角色关闭开关的题面及动作字节等价断言通过，冻结基准未改。无新增须 Roy 决策项；W3 上表字段分歧交 Claude 协调，正式接口合入后补提供方与触发/药水可信度集成测试。
