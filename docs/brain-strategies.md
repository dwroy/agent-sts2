# 大脑文字策略库 v1（#16）

范围依据 `docs/v6-plan.md` 第 13 节（main `c57f78a49`）和 #16 新验收：大脑继续拿牌，检索只补充情境匹配的文字策略；策略内容由学习者 #27 维护。开发者只维护数据管道、格式、校验和检索。旧 Jev 模仿试验见 `paper/materials/2026-10-21-issue-16-brain-distillation/report.md`，已停止，不再作为发布依据。

## 存储与条目

新增 `knowledge/characters/silent/strategy-entries.json`，与 `experience.json` 并列，**不扩展或迁移 experience.json**。旧经验的消费者保持原样；新文件只有本文的检索消费者读取，不会自动从经验生成策略。本次不放置游戏策略或默认示例库；文件缺失等价空库。学习者发布真实内容时创建文件：

```json
{"schema":"brain-strategies-v1","character":"silent","entries":[]}
```

机器格式见 `knowledge/schemas/brain-strategies-v1.schema.json`，TS 类型和运行时校验见 `agent/src/knowledge/strategy-entries.ts`。每条必须有：

| 字段 | 含义 |
| --- | --- |
| id / version | 库内唯一稳定编号 / 学习者维护的条目版本（非行为 release_id） |
| trigger.question_types | card_reward、event、rest、shop、act_plan 的非空数组；任一命中 |
| trigger.acts / floor / bosses | 幕号数组、全局楼层闭区间、当前幕 Boss 原始 ID 数组；不同字段全部满足 |
| trigger.hp_ratio | 当前 HP / 最大 HP，闭区间 0–1 |
| trigger.deck_size | 当前牌组张数闭区间 |
| trigger.deck_cards | 每个 `{name,count:{min,max}}` 都要满足；精确匹配展示行中括号/冒号前的牌名，保留 ID、中文名及升级号；前缀 `Nx ` 按张数展开，不推断构筑标签 |
| strategy | 情境成立时给大脑的策略文字，最多 1200 UTF-8 字节 |
| evidence | 1–20 个 `{run,floor,ref?}`，自有证据必须可追溯到局号/全局楼层；ref 可指向账本/窗口 |
| source | own 或 external:来源名；不同来源不混算独立分母 |
| confidence | 学习者给出的 0–1 可信度；检索不根据结果自行推断可信度 |
| provenance | 外部来源必填 `{url,version,sha256,license}`；外部局号属于外部命名空间 |

区间可只给一端，不允许空区间、反向区间、未知 trigger 字段。trigger 需要的事实缺失就不匹配。其他扩展元数据可以保留；最多 500 条、整个文件最多 1 MiB，重复 ID 或任一无效条目会使整库本次不注入。JSON Schema 用于编辑器；运行时还检查空白文字、ID 唯一、min≤max 和字节限制。

牌名示例仅是格式说明：`2x CARD_ID 展示名+ (Skill, 1 energy): …` 的匹配名为 `CARD_ID 展示名+`；奖励题存在无 ID 牌组展示时，以 facts.deck 为优先，否则使用 payload.deck。不得把名称相似当成机制相同。

## 检索和 prompt

五类大脑请求在 `Brain.request` 中统一处理，发生在 full knowledge prefix 构建之前，因此普通调用、full prefix 和上下文溢出回退都带同一检索结果。模型及工具路由不变。

- reward/card → card_reward；event/* → event；rest/* → rest；shop/* → shop。
- event/act-plan 同时匹配 event 和 act_plan。
- run-plan 的 run_state.trigger 为 start/act，或任意题携带 run_plan_task.trigger=start/act 时，也匹配 act_plan。hp_drop/age 的独立重规划不计幕初规划。
- 只读取静默角色文件。其他角色及无规划任务的战斗题不会读取它。
- 上下文取 facts → payload 根 → run_state → run_plan_task → run_brief，数值幕号兼容旧字符串。HP 允许尾随百分比。
- 排序：触发字段数＋指定牌条件数更多优先，再按 confidence 降序、id 升序。同一条即使匹配多个题型也只注入一次。
- 最多 3 条；`{schema,entries}` 整块序列化后最多 4096 UTF-8 字节，包含策略、触发器、证据和来源。装不下的条目跳过，不截断证据。
- 注入位置为 payload.strategy_entries；不改问题指令和原选项。无命中、空库、文件缺失、损坏或超限时返回原请求，原 prompt 字节不变。
- 每次提问先 stat，按路径＋mtime＋size 缓存解析结果；文件变化后重校验，不等待进程重启。库内容来自学习者，开发者不把大脑旧理由直接提升成策略。

学习者 #27 发布真实库后，按匹配题目读回 `logs/brain.jsonl` 的 `payload.strategy_entries.entries[].id/version`，核对实际消费的条目和证据；文件落盘或离线匹配不代替 live 采用/收益验收。坏库会保持原题面，发布前应先调用 `parseStrategyLibrary` 校验。

## 决策数据与标签

`knowledge/builders/brain_decision_dataset.py` 接收冻结的 `grep -F` 预筛，不读取游戏或调用模型。保留旧 reward 数据集每条内容/ID/split，再补充事件、休息、商店、幕初规划。每行含 run、全局 floor、act、时间、题目要点、牌组、选项事实、大脑原答案/理由、模型和代码提交、后续结果、原记录 SHA。扩展题目的选项采用事实字段 allowlist，去掉历史统计和模拟输出；拿牌档案保留原件。

`question_type` 是互斥主类型（event/act-plan 和独立幕初规划归 act_plan）；`question_types` 是可重叠的检索类型（带幕初规划的事件同时属于两类），分母不得混用。同层多次提问保留，仅去掉完全相同的日志行。原 reward 记录有实际 dispatch 验证；新增记录只验证大脑接受答案，`observation=brain_accepted_dispatch_unverified`，不能当作已执行动作的因果证据。

结果沿 #12/#15 的**第一次轨迹**口径：首次 SL 死亡截断，之后问题不入集；final_floor 是该轨迹终层，不是复活后的最终楼层。remaining_hp_loss 是提问后同幕战斗的净掉血之和（包含事件触发的同层后续战斗），不含事件扣血或休息治疗，不是累计受击伤害。需 Boss/终局端点及战斗 inventory 覆盖才填；observed_hp_loss 只是已观察部分。已打完本幕 Boss 的奖励题 boss_pass/remaining_hp_loss 置未知。只有整局失败、无本幕死亡/后续幕证据时，Boss 仍未知。没有记录或快照不足一律 null，不补零。它是描述性标签，不是选择的因果收益。

版本从提问时刻之前最近的 run-config 取 SHA；独立规划没有角色字段时，也只用该时刻之前配置确认静默。后续运行结果与当前问题信息分开存放，供学习者做观察和反证，不自动生成策略。扩展集未重新划训练/测试；原拿牌 split 为历史原件，新增记录不属于旧 Jev 回放。

## 固定验收

`agent/tests/strategy-entries.test.ts` 覆盖全部条件、边界、排序、字节上限、无命中等价、跨角色隔离、文件刷新、三条请求路径；`brain-decision-dataset.test.ts` 调用固定 Python 测试检查五类抽取、版本时点、SL 截断和未知值。

`agent/tools/replay-brain-strategies.ts <固定输入.json> <空目录输出路径>` 在本机离线生成五题 prompt、命中及无命中字节核对、冷/热检索加序列化耗时；测试条目使用明确标识的占位文字，放在报告 fixture 中，不进入真实知识目录。无 API、无 Jev、一进程运行。交付报告提供输入、输出、哈希和测量边界。
