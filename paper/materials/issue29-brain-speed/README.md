# #29 大脑引擎速度对比

2026-10-21。基线 `c57f78a49e3ad047bde212b0011fccd35d498d0e`。任务与补充要求：[issue #29](https://github.com/dwroy/agent-sts2/issues/29)。

追加实验已完成：[DeepSeek 超时追查与官方接口对比](deepseek-followup/README.md)。该实验将等待预算放宽到 300 秒，另存流式原始回执；下文保留原 30 秒实验的结果与边界。

32 道真实题、160 次顺序请求已完成：**DeepSeek 在双方都成功的配对上更快，但现行 30 秒超时下失败 15/64；建议保留现行 GPT xhigh，继续验证完成率与对局质量后再考虑切换。** 本次只给建议，没有切换引擎。

## 结果与建议

完整分题型表、token、费用口径、一致率和分轮结果见 [tables.md](tables.md)。以下延迟包含失败在停止时的耗时，不能将超时视为已完成答案。

|组|成功/请求|均值秒|p50秒|p90秒|主决策同轮 A|
|---|---:|---:|---:|---:|---:|
|A：GPT xhigh|64/64|35.53|30.47|60.38|基线|
|B：DeepSeek|49/64|14.45|9.19|30.00|38/49（77.6%）|
|C：GPT high，单轮参考|32/32|15.73|13.89|23.91|27/32（84.4%）|

双方成功的 49 个 A/B 配对中，B/A 耗时比中位数为 **0.301**，配对总耗时比 **0.333**（约少 66.7%）。这是成功子集的速度比较，不包括 B 未能完成的 15 次。B 超时分布为事件 2/8、商店 4/8、路线 3/8、act-plan 6/8；拿牌、休息、加删牌选择本批均无失败。当前不能用全组均值直接推断“完成所有请求能快多少”。

C 相对第一轮 A 的配对总耗时比为 **0.447**（约少 55.3%），但只做一轮，也未验证对局质量。全部动作字段与 A 的精确一致率为 B 31/49、C 25/32；A 自身两轮主决策一致 30/32、全部字段一致 28/32，说明 A 也不是固定正确答案。B 两轮均成功的 24 题主决策一致 24/24、全部字段一致 23/24。

本次两边均未观察到容量/限流报错、HTTP 429/5xx、修复重问或 Codex 传输重试；B 的 15 次失败全部是请求超时。这不能替代长期可靠性评测，近七天对局日志另有 4 次 Codex 容量事件，见下文。

按现行平均 27.8 次请求/局估算，大脑一次尝试总耗时均值为 **A 15.61、B 5.29、C 7.31 分钟/局**。B 数字包含 15 次未完成答案的截断耗时，不是生产可用答案的完成时间，也不是整局游戏时长。Nova 实扣与 Codex 订阅边际费用未知；B 已知 usage 按客户端旧费率合计约 **$0.352639**，缺少 15 次超时的 usage，不是完整账单。

建议保持现行 xhigh。若后续推进 DeepSeek，先在保持 effort 的前提下另测超时/恢复策略，重点覆盖商店、路线、act-plan，再由对局实验评估质量；拿牌等无失败类型可以作为后续局部比较候选。C 可作为独立后续实验候选，本批单轮结果不足以改变大脑保持 xhigh 的政策。历史 DeepSeek 108 条不同题面均值 31.22 秒、p50 17.07 秒、p90 71.40 秒，只作背景参考。

## 设计与边界

从近期 Silent A10 真实大脑题冻结 32 道：拿牌 8、事件 4、休息 4、商店 4、路线 4、act-plan 4、选择 4。休息题包含逐张具名升级选项，因此包含升级选择；选择题为 1 道删牌和 3 道加牌，没有另造独立 upgrade 题。act-plan 的题面约 3.95—4.39 万字符；本批最长题面约 22.8 万字符，出现在其他题型，不能预设 act-plan 在本批一定最慢。

每类在最新 `4*n` 个历史已接受候选中取等距中点；先冻结后调用。候选窗口共 839 条匹配 Silent A10 和系统提示 SHA 的记录。它不是随机抽样，也没有覆盖历史失败题。完整 system、question、options、memory、payload 在 [fixtures.jsonl](fixtures.jsonl)，来源局号、原日志字节偏移、题面 SHA 在 [sample.json](sample.json)。系统提示 SHA-256：`38986474dcec38ab1fd5289dacc345b4bec39e973d803bae1c892df65644b653`。不补入开发者的游戏知识，不从外部获取游戏机制或强弱结论。

|组|引擎与请求模型|推理强度|轮数|
|---|---|---|---:|
|A|现有 CodexEngine，`gpt-6.1-sol`|xhigh|2|
|B|现有 DeepSeekEngine/DeepSeekClient，经授权网关，`deepseek/deepseek-flash`|按现行 label 路由；act-plan 保持 max|2|
|C|现有 CodexEngine，`gpt-6.1-sol`|high，仅参考|1|

**相对 issue 的唯一轮数调整：C 只做第一轮。** 32 题三组两轮需 128 次 Codex 调用，与约 100 次的边界冲突；保留 A/B 两轮及 C 一轮，计划 96 次 Codex 调用，留 4 次原生重试空间。第一轮逐题 ABC、BCA、CAB 轮换；第二轮 BA、AB 轮换。共 160 个逻辑请求，所有模型调用顺序执行，没有并发压测。C 不具备双轮时段复核能力。

Codex 使用独立本地 home，只复制开发会话认证，未改共享配置、对局账号或 live/STOP。启动命令及子进程继承 nice 19；压测进程树在 Codex 调用时观察到 4 个进程（runner、tsx 的 esbuild、Codex launcher、原生 Codex），DeepSeek 调用时为 2 个。轻量辅助读取曾与压测重叠，可能有少量资源干扰；完整测试在压测退出后执行。持久化预算 wrapper 在每次 `exec` 前原子写入 claim，达到 100 次即拒绝；中断续跑不返还 claim。开发会话不运行 play。没有切换生产引擎、降低 DeepSeek effort 或上线行为版本。

Codex 模式为 exec、工具关闭、strict schema、schema fields=used、summary=auto、默认 service tier、600 秒请求上限、120 秒 stall 检测、最多 1 次 stall 重试，保留订阅用量守卫。最终档位以 [codex-calls.jsonl](codex-calls.jsonl) 的原生 `model_reasoning_effort` 为准，不能只看启动参数。

B 请求模型和返回模型都记录网关 alias；没有足够原生证据把 alias 再确定为某个底层发布日期或具体 checkpoint。现行客户端按题型选择 effort，act-plan、商店和路线保持 max，普通拿牌、事件、休息、加删牌等为 high。单次 HTTP 超时保留现行 30 秒；从实际对局 run-config 回读的允许字段见 [configuration-receipt.json](configuration-receipt.json)。返回 token、finish_reason、首答与 reasoning 在 [deepseek-calls.jsonl](deepseek-calls.jsonl)；未记录请求头、密钥、网关地址或错误响应正文。

同一 fixture 经生产 `userMessage`/DeepSeek 消息构造发送，系统提示、题面、记忆和选项相同。原生输出协议有差异：Codex 使用 strict schema，DeepSeek 沿原客户端 JSON 与修复路径。测量包含这些差异，因此比较的是现有客户端组合的端到端速度，不是剥离协议后的纯模型生成速度。

为限制调用与等待，本实验直接调用 engine，保留 engine 内部修复/原生重试，不进入生产 router 的故障等待与 L1 兜底。未重跑超时题来覆盖原失败，失败也保留在分位数中。生产 H1 的 90 秒预算、无限期故障恢复、实际点击与后续对局结果不在本次计时内。`specFor` 复用通用 spec 和随题字段校验，没有重新执行每个界面的私有回调；通过表示离线格式/选项校验通过，不能等同整局可执行性已验收。

## 指标口径

总耗时从 engine 调用前到返回并校验后，含 Codex 进程启动、网络、原生重试和客户端处理。B 为记录响应使用 response clone，少量解析开销也计入。两轮复用题面，可能受到缓存与服务时段影响；没有主动清缓存，已知缓存命中 token 与分轮延迟一并保留。p50/p90 使用线性插值；每个小题型 A/B 只有 8 次、C 只有 4 次，尾部分位数只描述这批样本。

“首答通过”要求首个响应严格 JSON 可解析、原始对象通过同一 spec、最终接受，且无需额外修复调用或 Codex 重启。离线回读使用 [raw-validation.json](raw-validation.json)。引擎可进行本地字段规范化；规范化后的接受率与未经规范化的首答通过率分开。修复调用、Codex 传输重试和 HTTP 错误另列，不把它们当成同一件事。

一致率以同题同轮的 A 为基线，分母只含两组都被接受的配对。主决策按 choice、plan、route 的优先顺序取首个存在的字段；全部动作字段另比较 choice、cards、route、plan、discard、drink，忽略解释和可选 V6 建议。route 的逗号字符串规范为列表；缺省字段与显式空值仍算不同。冗余 cards 或缺省值差异也会降低字段精确一致率，因此该列不代表实际点击动作一定不同。不一致例子及完整原答在 [summary.json](summary.json)，逐题耗时/接受状态/最终答案在 [per-question.csv](per-question.csv)。A 不是正确答案标签，两轮 A 自身的重复一致率也会单列。

token 读取原生返回，不按字符估算。推理 token 包含在输出 token 内，不重复相加。缺失 usage 的失败调用保留“未知”，已知 token 合计不是完整账单。B 客户端内置旧费率为输入 cache miss/hit/output 每百万 token $0.3/$0.006/$1.2，只用于注明口径的估算，未核为当前网关费率。Nova 实扣与 Codex 订阅边际费用未返回，因此实际费用未知，不据此作成本高低结论。

## 不一致例子

以下固定展示第一轮，名称只抄自冻结题面的选项，不引入开发者判断。完整回答与理由见逐题 CSV 和 summary JSON；本表不是正确性评测。

|题号|类型|A：xhigh|B：DeepSeek|C：high|
|---|---|---|---|---|
|q04|拿牌|card2：回响斩击|card0：蛇咬|同 A|
|q16|休息/升级|o2：HATCH|o1:c10：升级中和|同 B|
|q18|商店|buy_card4|buy_card4 + buy_card3|同 A|
|q30|加牌|card4：切割|card5：致命毒药|同 B|

## 整局估算与历史参考

[historical.json](historical.json) 冻结最近 20 局已结束 Silent A10（结束时间 2026-10-20 19:45:26Z 至 2026-10-21 07:11:44Z）的题型计数，共 556 个独立问题，平均 27.8 次/局。另回读原日志确认每局无重复 question_id。逐局估算为 `Σ(该局某类请求数 × 本次该组该类平均耗时)`，再对 20 个逐局估算值汇总。

未单独抽中的 event/plan 41 次用 event/choose 代理，bundle/choose 1 次用拿牌代理，selection/choose 2 次用已测加删牌选择代理。它们不是完全相同的题面；估算存在类型代理误差。失败按停止时间计，因而 B 的整局预测是“一次尝试耗时”，不是承诺都获得有效答案的完整完成时间。估算不含战斗计算、Jev、动画、SL、对局点击、生产故障等待，也不能把 20 局预测值的 p90 解释为线上实测整局 p90。

历史 DeepSeek 为 2026-10-06 04:05:47Z 至 23:38:26Z 的 108 条 Silent A10 记录。其题面、系统提示、客户端与当时服务状态不同；历史延迟独立汇总，不和本次配对数据合并，不由历史与现在的差异推断同题提速。

## 近七天对局可用性

冻结窗口为 **2026-10-14 07:24:46Z 至 2026-10-21 07:24:46Z**。读取主运行日志的固定字节前缀并保存 SHA；三个来源是 `logs/brain.jsonl`、`logs/codex-calls.jsonl`、`logs/brain-wait.jsonl`。抽取数据在 [availability.json](availability.json)，含原日志偏移和分类正则，不含错误正文。窗口内 brain 有 3,850 行、Codex 物理调用 trace 3,838 行、等待事件 910 行；这些是各自的日志行分母，不能相加成独立请求数。窗口内没有 DeepSeek 调用，DeepSeek 近七天错误率是 **0/0、无样本**。

|类别|去重事件/问题|brain 行数|Codex trace 行数|等待/重试结果|
|---|---:|---:|---:|---|
|容量 overloaded / at capacity|4|4|4|每个事件 1 次重试调度；1 次恢复，3 次 90 秒预算退出|
|HTTP 429 / rate-limit 字样|0|0|0|本窗口未观察到，不证明不会发生|
|本地订阅配额守卫|2|47|0|36+9 次重试调度，两个事件最终取消；不是 47 次物理生成，也不混算成容量错误|

按 `(run_id, question_id, since)` 合并 heartbeat。4 个容量事件从首次尝试到最后状态合计 **457.461 秒（7.624 分钟）**：一次 187.455 秒后恢复，另外三次约 90 秒预算退出。它包含失败请求、恢复等待与成功重试，不是纯 cooldown；brain 中失败调用累计 76.459 秒与 trace 中的 73.224 秒是同批事件的不同层记录，不能再相加。配额守卫两个等待事件共 11,347.982 秒（189.133 分钟），只表示观察到的暂停区间，不能全归为服务端处理时间。原始 `suspended_ms` 是累计字段，不逐行相加。[availability-episodes.json](availability-episodes.json) 保留逐事件账本。

进一步查 `logs/decisions.jsonl`：没有找到直接携带这些大脑 question_id 的决策行，保留该负结果 [availability-decisions.json](availability-decisions.json)。按局号、事件结束时刻和预算回执回查，在三次 budget 结束后 0.001/0.001/0.873 秒分别找到 `time_budget.fallback=L2_deadline_existing_L1`：

|局号|容量事件结束后动作|实际 decider|
|---|---|---|
|9U1E3V6XQAZ9|map/route-fallback|code|
|T749HZSY80X6|map/route-fallback|code|
|5YKZ3TXFACN9|reward/card|jev|

一次恢复事件 YUWMCVH6MFUH 在结束后 0.002 秒有 reward/card 的 codex 决策。上述为**局号与时间邻近关联，不是问题 ID 精确联表**；邻近的其他动作也原样保留在 [availability-action-neighbors.json](availability-action-neighbors.json)。brain 的 `fell_back_from` 未观察到 L2 跨大脑引擎转移；它不表示没有上述 L1 兜底。仅有 4 次容量事件，不能据此推断长期 SLA，亦不能用无 DeepSeek 分母的历史窗口比较两者可靠性。

## 复核与产物

只读重算，不产生模型调用：

```bash
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 node --import tsx tools/issue29-brain-speed.ts validate  # cwd=agent
nice -n 19 python3 agent/tools/issue29-brain-speed-report.py  # cwd=仓库根目录
nice -n 19 python3 agent/tools/issue29-brain-speed-test.py
```

`run` 是实际模型压测命令，会使用认证与预算；不是复核报告所必需。它使用已冻结 fixtures，按结果键恢复，不能删除 claim 来重置额度。`prepare` 和七天可用性 collector 在证据已存在时拒绝覆盖；原始记录与派生 summary 分开。可用性 collector 支持 `--decisions`、`--neighbors`，仅在主运行日志仍存在相应固定前缀时回查，不将后续变化倒填为当时证据。

原始执行回执：[results.jsonl](results.jsonl)、[codex-calls.jsonl](codex-calls.jsonl)、[deepseek-calls.jsonl](deepseek-calls.jsonl)。完整机器汇总和证据 SHA：[summary.json](summary.json)；[summary.csv](summary.csv) 可直接筛选题型。预算核对为 96 个持久化 exec claim、96 条原生 trace，见 [budget-receipt.json](budget-receipt.json)；160 个结果键齐全，13 份测量证据 SHA 全部读回匹配。

验证详见 [verification.json](verification.json)：生产 tsc、工具独立 strict TypeScript 检查、6 项固定数据边界测试均通过；仓库既定沙箱入口 `SANDBOX_WORKERS=1 bash tools/test-sandbox.sh --reporter=verbose` 退出 0，含 tsc、589 文件/5,237 用例和独立 paths 1 文件/11 用例，合计 590 文件/5,248 用例通过。排除范围沿用原脚本，未改排除名单。

另一次包含沙箱排除用例的 Vitest 尝试约 6 分钟只有 RUN banner、CPU 持续运行、无文件级回执，主动终止本任务自己的 Vitest PID，退出 143；原因未定位，不能计为完整检查通过。原日志保持在本地 `data/issue29-checks/vitest-full.log`，验证回执保留其 SHA。完整套件仍待集成员联合检查补跑。代码、测量产物和交付评论公开前经 gitleaks 扫描；本次无生产代码或行为版本变化。
