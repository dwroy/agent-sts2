# #16 大脑文字策略库基础设施交付

按 Roy 2026-10-21 调整后的 #16 正文交付：保留大脑奖励数据，扩展五类决策，提供条目 schema、机器检索及大脑 prompt 接入。基于 `518cca239` 开发；新范围参照 main `c57f78a49` 的 v6-plan §13 与 learning-protocol §9。大脑继续决定拿牌，策略正文由学习者 #27 维护。本轮模型/API 调用为 **0**，没有运行 play、修改 live/STOP、V6_CARD_DECIDER 或发布配置。

## 数据覆盖

冻结集 **11,735 题 / 410 局**，仅 Silent，时间 2026-10-04T13:42:35.508Z 至 2026-10-21T07:10:20.619Z。原先 **5,275** 道奖励题逐字段不变，包括 ID、原理由、结果和历史 split（审计见 dataset-audit.json）；扩展 6,460 条，不复用旧 Jev 训练/测试划分。

| 互斥主类型 | 题数 | 独立局数 | 提交未知 | 掉血 / Boss / 终层缺失 |
| --- | ---: | ---: | ---: | ---: |
| card_reward | 5275 | 397 | 281 | 2324 / 443 / 7 |
| event | 2471 | 410 | 154 | 956 / 42 / 14 |
| rest | 2461 | 403 | 161 | 884 / 32 / 16 |
| shop | 1066 | 377 | 69 | 429 / 13 / 7 |
| act_plan | 462 | 310 | 25 | 275 / 6 / 3 |

每行都有局号、整数全局楼层、幕号、题面要点、牌组、选项、大脑答案与理由、原记录规范化 SHA 和版本来源。全部五类的牌组、Boss、HP 均不缺失；独立 run-plan 是自由任务，1 题无选项，保留 null。理由缺失 0。

主类型互斥，总数可相加；检索类型可重叠：card_reward 5,275、event 2,925、rest 2,461、shop 1,066、act_plan **834**。其中 454 道 event/act-plan 的主类型为 act_plan；幕初任务还合并在普通事件及其他题目中。另 7 道 map/route-plan 或 selection/upgrade 携带幕初任务，也按 act_plan 纳入，不能只 grep 五种 label 后漏掉。每类独立局数不能相加。

原奖励题要求 Codex 成功回答、战斗上下文及实际选择派发验证；新增题保留大脑的各种历史引擎：Codex 6,401、DeepSeek 59；模型 gpt-6.1-sol 6,044、gpt-6-astra 357、deepseek-flash 59。新增题 `observation=brain_accepted_dispatch_unverified`，只证实大脑接受答案，不能当已执行动作或因果收益。成功判定沿原日志 accepted/problems/error；同层多次问题保留，仅去除完全相同的日志行。

先对 1.2 GB brain 用 `grep -F` 预筛再解析，复用原拿牌阶段已先 grep 再解析的 3.3 GB decisions 战斗 inventory。新预筛来自固定 1,212,476,201 字节原前缀，最终预筛 861,626,178 字节、SHA 见 source-capture.json。宽预筛有 1 个追加中坏行，最终题型预筛未包含它；最终拒绝其他/未知角色 2,173、失败回答 112。没有读取游戏二进制、外部游戏知识或从牌名编造构筑规则。

扩展集选项只投影事实字段和原牌面文字，剔除模拟输出和历史统计；原题、完整原答案与理由保留，不把大脑旧理由自动提升为正确策略。冻结后的新日志不追加到本次样本。完整预筛、run-config/runs/SL 快照和 inventory 保留本地，提交精简数据及每个输入的字节数/SHA；复查输入必须核对 manifest，不能拿当前追加中的日志冒充冻结输入。

## 版本与缺失口径

共 **304 个已知代码提交**，690 题提交未知，完整逐 SHA 以及每个主类型的逐 SHA 分布均在 manifest.json。取提问之前最近的同局 run-config，不用当前版本倒填；源码提交不等于精确 release_id 或逐题上线回执。下面只展示题数最多的十项（含 unknown）：

| 代码提交前缀 | 题数 |
| --- | ---: |
| 56268f61928e | 788 |
| unknown | 690 |
| 9f4245511181 | 157 |
| e716bd28fd8e | 129 |
| a9e687d9f0ac | 113 |
| 5de5d5182c05 | 97 |
| 8e74493d92f7 | 92 |
| cfa1c0be8814 | 91 |
| 3fb989e95d29 | 91 |
| 8d79fd5bfb9b | 89 |

结果沿 #12/#15 第一次轨迹：首次 SL 死亡或更早 run end 截断，复活后的题和结局不混入。final_floor 为该轨迹终层；Boss 已完成的问题没有“未来本幕 Boss”，相应标签未知。剩余掉血为提问之后本幕战斗的逐战净掉血之和，含同层后续强制战斗，不含事件扣血、休息治疗，也不是总受击伤害。扩展题使用问题与开战时间定位；奖励档案保持原先“奖励之后楼层”口径。

完整掉血需 Boss/终局端点及对应战斗 inventory 覆盖，否则 null；observed_hp_loss 仅是已观察部分。总缺失：剩余掉血 **4,868**，未来本幕 Boss **536**，终层 **47**。inventory、开战记录、结果快照有各自覆盖窗口；brain 预筛比原结果快照新，部分问题自然缺少未来结果。完整性只相对记录下来的战斗清单，未记录任何决策的战斗仍可能漏检。缺失不补零、不视为输。只有 run end 失败、却无当前幕死亡/后续幕证据时，Boss 标签仍保留未知，不把整局失败当成本幕失败。所有结果都是观察标签，不能归因于该次选择。

## 格式及消费者

新文件 `knowledge/characters/silent/strategy-entries.json` 与 experience.json 并列，旧经验格式和消费者保留。机器 schema：`knowledge/schemas/brain-strategies-v1.schema.json`；使用说明：`docs/brain-strategies.md`。触发字段覆盖题型、幕、全局楼层段、Boss、HP 比率段、牌组张数和精确牌名/张数；字段之间全部满足，题型数组任一满足。没有手写游戏策略或从名称推断流派。

每条含稳定 ID、条目版本、策略正文、局号/楼层证据、own 或 external:来源名、confidence；外部来源另需 URL/版本/SHA/许可。严格拒绝未知 trigger 字段及不合法区间，避免拼写错误扩大适用范围。学习者负责证据真实性、反证和可信度。

`Brain.request` 统一检索后再构建 full knowledge prefix，普通调用和上下文回退都保留同一策略块；命中按条件具体程度、可信度、ID 排序，最多 **3 条 / 4096 UTF-8 字节**（包括证据和元数据），单条正文最多 1200 字节。装不下跳过，不截断证据。库最多 500 条 / 1 MiB。文件变化按路径、mtime、size 重读校验。

只启用 Silent 对应文件；没有文件、空库、无匹配、无效或超限时返回原请求，prompt 字节不变。未提交真实策略文件，集成这段代码也不会凭空注入内容。后续 #27 创建并发布真实库后才产生匹配；由集成员/ops 按既有流程核验上线。

## 五类固定离线回放

replay-input.json 从冻结日志选择五道真实问题（均为局 C48LLXBGKXQ9，楼层 2/1/8/14/18），保留原请求题面；示例条目只含“验证检索和传输的占位文字”，证据明确标 FIXTURE_ONLY，不是知识内容，不进入真实库。输出位于 replay/，每题均命中对应条目，event 和 act_plan 的交叠匹配也正确；五道无命中对照全部逐字节相同。

| 主类型 | user prompt 字节（前 → 后） | 增量 | 策略块字节 | 冷准备 ms | 热中位 / p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| card_reward | 11879 → 12244 | 365 | 345 | 0.855 | 0.040 / 0.072 |
| event | 7768 → 8416 | 648 | 628 | 6.902 | 0.034 / 0.072 |
| rest | 15899 → 16250 | 351 | 331 | 0.386 | 0.036 / 0.083 |
| shop | 11954 → 12305 | 351 | 331 | 0.316 | 0.056 / 0.091 |
| act_plan | 16180 → 16828 | 648 | 628 | 0.455 | 0.044 / 0.084 |

单个 nice 19 Node 进程，热准备每题 1,000 次；冷准备含固定 fixture JSON 解析、schema 校验、检索及 userMessage 序列化，热准备含检索与序列化。**不含系统 prefix、文件 I/O、模型或网络耗时**；冷样本仅一次，event 的 6.902 ms 含运行时初始开销，不用作稳定延迟估计。prompt 文件额外末尾换行不计入表内实际 userMessage 字节。没有重新测 Jev 一致率。

## 验证与复现

固定测试覆盖条件交集、闭区间边界、缺失事实、外部来源字段、重复 ID、五种题型与合并规划、排序、条数/完整块字节上限、文件变化、损坏/缺失库、Silent/铁甲隔离，以及 Brain.choose/choosePlan/askJson 请求路径。Python 固定夹具检查题面投影、时间之前版本、首次 SL 截断、同层未来战斗和缺失不补零。所有测试只用固定数据，无 API。

正式 `tsconfig.json` 与新增回放工具独立类型检查通过；固定 Python 2 项通过。首轮完整 Vitest 有 1 个未修改的运维隔离测试超过 15 秒（643 文件 / 6063 项通过，2 跳过），原失败保留；该文件和新增测试单独复验 3 文件 / 9 项通过。最终完整复验 **644 文件 / 6064 项通过，2 跳过**，退出码 0，耗时 1528.57 秒，单 worker、允许失败项重试一次（`--retry=1`），没有排除文件或改无关测试。

额外的 `tsconfig.tools.json` 全工具检查在未修改的 tools/eval 文件中报错；未核对其基线，不把该扩展检查记为通过或声称已证明历史遗留。新增工具独立检查通过。首次独立配置缺少 node 类型路径的失败也留档，配置补充 typeRoots 后通过。命令、结果和原始日志见 validation.json / validation/，原日志解压 SHA 见 validation-archive.json。数据审计逐字段验证 5,275 条历史奖励保留、11,735 个 ID 唯一、每条 run/floor 完整。压缩产物解压后另行 gitleaks，暂存内容和公开评论分别扫描。

```sh
# 冻结日志先 grep-F；同时保留合并的幕初任务。兼容 JSON 空格形式。
nice -n 19 grep -F -e '"label": "event/' -e '"label":"event/' \
  -e '"label": "rest/' -e '"label":"rest/' -e '"label": "shop/' -e '"label":"shop/' \
  -e '"label": "run-plan"' -e '"label":"run-plan"' -e '"run_plan_task":' \
  "$FROZEN_BRAIN" > "$FILTERED_BRAIN"
nice -n 19 python3 -B knowledge/builders/brain_decision_dataset.py \
  --rewards "$ARCHIVED_REWARDS" --brain "$FILTERED_BRAIN" --logs "$FROZEN_LOGS" \
  --openings "$FROZEN_OPENINGS" --inventory "$FROZEN_INVENTORY" --out "$NEW_OUTPUT"
# agent/ 内，输出目录必须尚不存在。
nice -n 19 node --import tsx tools/replay-brain-strategies.ts \
  ../paper/materials/2026-10-21-issue-16-strategy-library/replay-input.json "$NEW_REPLAY_OUTPUT"
```

## 旧 Jev 试验留档

原提交 `9f759cd9d952002551a19784330327f004f2a919` 及 [旧报告](../2026-10-21-issue-16-brain-distillation/report.md)完整保留。已完成的历史试验第一幕 621 题：裸题首选一致 37.4%，加案例/统计 52.7%；跳过二分类反而 87.4%→84.5%。正式回放 1,992 次有回执，输入 8,609,756 / 输出 97,699 token；连同被弃旧试验，保存回执用量下界 11,692,759 / 132,093 token，金额和未落盘中断请求未知。

旧结果只作归档。本次方向变更后没有 Jev 请求，也没有启动影子或接管 A/B；旧报告内的“第二期建议”是当时记录，后续以本报告和新 issue 目标为准。
