W3 eddfc1ee 的“已知构筑评估 → Jev”真实请求烟测：**不通过**。2026-10-20 10:32–10:35 CST，9 个构筑题均没有已知加权选项，正式安全门函数全部要求转交大脑；数据准备均超过 5 秒。另行对原题面发送的 9 次 Nova 请求全部 HTTP 200，无 400、超时或非法选项，但不能据此认定已知数值决策可用，也不能据本报告放行上线。

评估代码为 `eddfc1ee1c057814025f99653f596ff6bb7dba88`，分支 `v6-projection-target-progress-20261020`；独立工作树 `v6-known-jev-smoke-20261020`。Jev 使用只读 live `c351dbe7b5603bbb591e0f63d88be32fa60df56f` 的 `JevClient`、Nova 适配器和构筑题 5000ms 预算。候选与 live 的 client/Nova 文件 SHA256 相同，精确哈希及知识包哈希见 [evidence/report.json](evidence/report.json)。没有改 W3 工作树、生产代码、知识、live、STOP 或对局；无游戏 HTTP 请求、无动作执行、无大脑模型请求。

**样本与方法。** 从指定两局 MWMR855QHTWR、T12TSEMGUU7F 的 `logs/states.jsonl` 提取 Silent A10 原始帧，保留字节偏移、时间和 SHA256，见 [manifest.json](manifest.json) 与 [frozen/](frozen/)。每题使用其时间之前最后一份真实 run-plan/route-plan。MWMR F8、F13 的历史计划没有 V6 方向权重，工厂沿生产路径使用默认等权，题面中的历史权重为空；没有自行补写大脑计划。其余计划及来源见 report.json。

使用正式 `productionV6Projection` → 请求工厂 → `BuildSimPool(1)` → `buildV6CardPick` / `planDecision + prepareV6RoomDecision` → `constructionQuestion`。调用 `recordConstructionHandover` 保存正式格式的安全门事件；没有执行循环中的大脑决定或 `resolve/apply`。计算与 Jev 配额分别 5000ms，进程 `nice -n 15`，单模拟 worker。每局按题序复用运行时；没有幕初或空闲预计算暖机，也没有同一局面反复追加预算。首题/换局含冻结快照初始化，结果不能外推为已完成预热的 live 效果。

两局 F17 都是 Boss 战斗，因而取各自 F16 休息点作为 Boss 前局面。覆盖 3 个拿牌、4 个商店（其中 3 个局面含买药，F14 还含丢药）、2 个 F16 休息题。T12 的两个 F4 商店样本为同一次访问购买前后不同库存，不能算两个独立房间。检索到的 141 个去重非战斗局面中没有独立 W6 选药题；3 个真实空槽药水奖励仍为代码直接领取。因此独立选药题“至少 3 个”的要求本轮**未覆盖**，商店药水不能替代这项验收。 只读核查还确认 `construction-safety.ts` 的 W6 分支注明暂无逐槽构筑评估提供方，直接用无 table 的 `constructionCoverage(ids)`；即使找到独立选药冻结题，该实现也会转交大脑，不能仅凭 W3 候选验成 W6 已知值 Jev 路径。

**逐题结果。** 下表“Jev”列均为隔离的请求协议检查，生产安全门本应转大脑。字节为 UTF-8 JSON，线上的请求字节含模型字段；耗时为墙钟毫秒，数据准备含工厂、评估和题面生成。所有题已知率 0%，均记录 `v6_unknown_to_brain`，原因为 `insufficient_known_options`、阈值 50%。

| 局面 | 局号 / 层 | 已知选项 | 数据准备 ms | state / 请求 B | Jev ms | Jev 回答（未执行） |
| --- | --- | --- | ---: | ---: | ---: | --- |
| card-041 | MWMR / F8 | 0/4 | 7342.7 | 5792 / 6185 | 934.2 | card0 |
| card-057 | MWMR / F13 | 0/4 | 5694.9 | 5800 / 6201 | 450.1 | card1 |
| card-119 | T12 / F12 | 0/4 | 7957.5 | 5748 / 6150 | 421.5 | skip |
| shop-061 | MWMR / F14 | 0/22 | 5468.6 | 15751 / 16960 | 1066.3 | leave |
| shop_potion-086 | T12 / F4 | 0/15 | 6445.3 | 12896 / 13769 | 700.2 | leave |
| shop_potion-087 | T12 / F4 | 0/8 | 5972.4 | 8310 / 8846 | 554.0 | leave |
| shop_potion-129 | T12 / F14 | 0/24 | 6082.0 | 18913 / 20214 | 634.9 | buy_potion1 |
| preboss_rest-070 | MWMR / F16 | 0/14 | 5530.1 | 12568 / 13324 | 509.2 | o0 |
| preboss_rest-138 | T12 / F16 | 0/13 | 5447.0 | 12046 / 12762 | 535.3 | o0 |

数据准备 min / p50 / max 为 **5447.0 / 5972.4 / 7957.5ms**，9/9 超过 5000ms。仅评估引擎内部计时与完整准备耗时不同：三个拿牌题引擎分别约 4654、4790、5262ms，不能以内部计时替代端到端准备耗时。缓存命中均为 0。商店/休息的 6 个题没有交回有效 table；该轮工具未额外保存 `roomProjectionReason`，所以不能把缺表确定归因于某个异常。生产 provider 在剩余预算或 signal 失效时会丢弃结果，需要 watcher 结合此处限时边界进一步定位。部分房间题仍有模拟批次记录，见 report.json；未捕获模拟 worker 错误。

空槽奖励 `potion_auto-015/023/055` 的规划耗时分别 0.378 / 0.065 / 0.132ms，返回代码动作，未请求 Jev、未执行领取。它们说明空槽直领行为仍在，但不能证明 W6 选药题可用。

**未知的证据与数值检查。** 三个拿牌题分别有 780 个选项×组合×目标行，已知期望仅 **5、4、4 行**（未知率 99.36%、99.49%、99.49%）。正常 worker 已完成 20 种子的模拟，计数跨选项/组合共享，不能当作数百独立对局。`simulation_failed` 没有出现在本次有效运行；大量行为是 `formation_unknown`、低于 5% 不模拟、`budget_remaining_unknown` 和连战连续值未知。完整原因计数见 report.json；一种行可能有多个原因，计数不能相加当总样本量。

此外，三个表的连战目标都有 `f48:then:f49:unknown`，历史质量 **0.6885245901639344**，原因为 `ordered_pair_unobserved_in_first_boss_cohort`。这部分质量必须保留未知；不能重归一化剩余目标或把它记为零。它是完整连战混合值缺失的独立障碍，但并不单独解释本幕 Boss 值缺失。当前所有 option 的 `current_gate` / `clearance` 混合值均 null、known_mass=0。

13 个已知组合行的 `P_k×W_k` 算术全部一致，`W_k=0, n=20`，所以期望全部为 0。例如 MWMR F8 的 P-toxin-footwork 在 AEONGLASS→TEST_SUBJECT 下，skip 的 P=0.32848、FOOTWORK 的 P=0.46094，而 W 均为 0；MWMR F13 的 DEADLY_POISON 使同一远期组合 P 从 0.35800 到 0.44971，W 仍为 0。仅凭 P 较大不能推出它的期望更高。原始行与样本 ID 的精简诊断见 [evidence/diagnostics.json](evidence/diagnostics.json)。这些是冻结输入的计算输出，不新增游戏知识或机制结论。

三个拿牌题经限额函数后，每选项实际仅保留一个本幕 Boss 组合条目，`win_complete`、`expected_win` 均 null；少量已知远期行没有进入最终题面。这是消费端的信息可见性限制，需与评估吞吐一起复核。协议回答为 FOOTWORK、DEADLY_POISON、skip；没有完整可比较的 P/W/期望，因此**不能认定这些选择在数值上合理或不合理**，也不能把 skip 归咎于忽略了题面中的高期望牌。商店的 leave / 买 BLOCK_POTION 和休息的 heal 同样没有已知加权值供验证。没有得到已知数值情况下 Jev 能正确权衡的证据。

**真实 Nova 请求。** 正式安全门阻止了 9 个生产 Jev 调用后，独立 [nova-probe.mts](nova-probe.mts) 对保存的原题面各发送一次请求，明确标 `request_only_protocol_probe`，不改安全门、不解析成动作。仅允许 `https://llm-proxy.tapsvc.com/api/alpha/decisions`，实发模型 `typesafe/jev-1.14`，choice 候选均在 criteria 对象；`maxRetries=0`，没有模型重试。Key 只读公司文件，无日志、提交或自费回退。

9/9 HTTP 200；耗时 min / p50 / max **421.5 / 554.0 / 1066.3ms**，均在 5000ms 内；state 5748–18913B，线上完整请求 6150–20214B。所有 choice 都在合法候选内。原回答、概率、置信度、请求体哈希、实际 bytes 与延迟见 [evidence/nova-report.json](evidence/nova-report.json)。未测 Nova 最大容量边界，不能据此提高体积上限。HTTP 通过只代表本次 9 个题面的协议与大小可接受。

**复现与原件。** 有效运行目录 `.artifacts/known-real-1792463549223`；独立 Nova 检查目录 `.artifacts/known-nova-probe-20261020`。完整表以 `evidence/*-table.json.gz` 保留，未删完整 metrics；未压缩和压缩 SHA256 见 diagnostics.json。保存了全部原题面、安全门日志、保护文件前后哈希。之前从工作树根目录运行的 `.artifacts/known-real-1792463412560` 因 worker 无法解析 `--import tsx` 而失败，是**无效工具运行**，不计候选工程失败；其报告另存 `evidence/invalid-cwd-report.json`。有效工具已按 `ops/run.sh` 改为 agent/ cwd，原件未覆盖。

仅准备题面并评估（无 HTTP）：

```bash
PATH="$HOME/.local/node/bin:$PATH" TMPDIR=/var/tmp nice -n 15   agent/node_modules/.bin/tsx paper/materials/2026-10-20-v6-known-jev-smoke/smoke.mts
```

原执行带 `--real`，但因正式安全门 9/9 回退，评估脚本自身实际 HTTP 为 0。隔离协议检查要显式运行 nova-probe.mts 并提供有效评估目录、单独输出目录；每次会产生真实付费/计量请求，本轮已完成，不需要重试。本轮脚本退出 0、归档哈希/原始帧哈希已核；未改生产代码，不重复完整 tsc/vitest。密钥扫描结果另见 gitleaks.txt。

**交付与建议。** 已向既有 `sts2-watcher` 发送不通过结论，请其转 ops；CLI 接受不等于 ops 已读回。建议先核商店/休息限时丢表与工厂/摘要开销，并用有来源的幕初/空闲预计算条件重现至少两个可比较加权选项，再做已知题真实 Jev 验收；连战未知质量保持未知。本轮不建议绕开安全门、降低未知阈值或以延长预算冒称质量通过。生产暂停/开关处置仍由 Claude/ops 按原授权决定。

10:40 CST 交付复核时，既有 live 已由外部流程更新到 `2cdb7b3dc8043180bfecec74e6b23c58d3f87a5e`；本轮实发请求记录的 live 基线仍为上述 c351dbe7，没有用新提交倒填旧结果。本会话未改 live。密钥扫描含压缩原表展开共 191.18MB，0 泄漏。
