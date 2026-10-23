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
| trigger.question_types | card_reward、event、rest、shop、act_plan、fight_plan 的非空数组；任一命中（fight_plan 为 #49 备战查询入口，旧条目不自动扩用） |
| trigger.acts / floor / bosses | 幕号数组、全局楼层闭区间、当前幕 Boss 原始 ID 数组；不同字段全部满足 |
| trigger.hp_ratio | 当前 HP / 最大 HP，闭区间 0–1 |
| trigger.deck_size | 当前牌组张数闭区间 |
| trigger.deck_cards | 每个 `{name,count:{min,max}}` 都要满足；精确匹配展示行中括号/冒号前的牌名，保留 ID、中文名及升级号；前缀 `Nx ` 按张数展开，不推断构筑标签 |
| strategy | 情境成立时给大脑的策略文字，最多 1200 UTF-8 字节 |
| evidence | 1–20 个自有证据或 external_aggregate（下文）；自有 `{type?:"own",run,floor,ref?,role?}` 保持兼容，floor≥1 |
| source | 单来源 own / external:来源名；多来源 mixed，必须与 evidence 实际来源一致 |
| confidence | 0–1；只有外部支持（自有仅反证也算）最高 0.49，不自动因样本量提升 |
| evidence_status | 多来源必填 aligned（一致）/conflict（冲突）/unassessed（未评估）；任一外部相关反证 role=contradict 时强制 conflict |

### 外部聚合证据（#42）

`evidence` 用判别字段 `type:"external_aggregate"` 与自有记录分开。外部记录禁止出现 `run/floor`（包括 null、虚构局号和 floor=0）；不能把原外部来源加一个 provenance 再贴到自有局号上。旧自有条目无须迁移。每条外部记录必填：

- `source: external:<名称>`、公开 `url`、游戏 `version`、`dataset_sha256`（64位小写十六进制）、`downloaded_at`（YYYY-MM-DD）、`license`（许可/Required Notice 或明确未知限制）。
- `filters:{character:"silent",ascension:0..20,criteria:"完整筛选口径"}`；版本内小版本、单/多人、是否弃局、模组等写 criteria。外部证据范围不等于已验证可外推范围。
- `statistic:{name,value,unit}`（有限数值）与 `denominator:{unit,n}`（正安全整数）；unit 为 runs/players/offers/fights/rooms/rewards/cards。多种统计量、分母或版本分别列证据，不把奖励屏幕当作局数。
- `design:"observational"`、非空 `limitations` 字符串数组，明确自选上传、非因果、与本系统的口径差异。
- 可选 `interval:{low,high,method}`，有限且 low≤high；没有区间就省略，不补零。可选 `ref` 定位精确表/行；`role` 为 support（默认）或 contradict。外部不能登记成本系统 repeat。

证据可放在同一个数组，但每项类型/来源独立；检索与题面为含外部条目派生 `evidence_summary:{own_runs,own_support_runs,external:[{source,version,dataset_sha256,statistic,denominator}]}` 和一句 `limitation_notice`。自有局号去重；外部分母逐条列，不加总（表、版本、玩家可能重叠）。字段由消费者计算，不能靠手写 summary 提升验证数。自有原条目题面保持原字节。

可信度分级：0–0.49 为“外部观察/低可信”；大于 0.49 且不超过 1 为“有本系统支持才可赋值”，仍由学习者说明可信度，n=1 并不自动高可信。自有仅反证不能解锁更高档；冲突保留双方原证据，不用新来源覆盖旧结论。`unassessed` 不能冒称一致；机械校验不能发现未明确记录的语义冲突，学习者须核查并标注。

账本沿 `learner/ledger.py add/update/show/find/check` 使用同一个 external_aggregate 对象。纯外部 add 省略 `first_run/asc/prior_runs`（进阶在 filters），仍填 character/kind/claim/evidence/prior/status/by，新增 confidence；混合证据须填 evidence_status，有自有证据仍要求真实 first_run/asc。update 只追加证据，按折叠后的所有反证、来源与可信度校验；后来补自有局时同次更新 first_run/asc。show/find --json 派生独立分账；find 文本显示 runs=0 与外部分母，外部数据不进入 repeat/本系统发布后验证计数。现有自有账本规则不变。

可复制的纯格式示例：`agent/tests/external-strategy-data/external-strategy.json` 引用 #24 的 v0.111/第一幕 skip 行，只描述 1456/13307，不是正式游戏知识。固定测试贯通独立临时账本登记→show→真实检索→兼容题面及生产 kb_strategies 工具；不写正式库或真实学习账本、不代 live 采用。

区间可只给一端，不允许空区间、反向区间、未知 trigger 字段。trigger 需要的事实缺失就不匹配。其他扩展元数据可以保留；最多 500 条、整个文件最多 1 MiB，重复 ID 或任一无效条目会使整库本次不注入。JSON Schema 用于编辑器；运行时还检查空白文字、ID 唯一、min≤max 和字节限制。

牌名示例仅是格式说明：`2x CARD_ID 展示名+ (Skill, 1 energy): …` 的匹配名为 `CARD_ID 展示名+`；奖励题存在无 ID 牌组展示时，以 facts.deck 为优先，否则使用 payload.deck。不得把名称相似当成机制相同。

## 检索和 prompt

历史适配器在 `Brain.request` 中检索并附加正文；生产知识工具模式只给查询线索，正文由 `kb_strategies` 返回，见 [查询引导](brain-agent-mode.md#查询引导49)。普通历史调用、full prefix 和上下文溢出回退沿原检索路径。

- reward/card → card_reward；event/* → event；rest/* → rest；shop/* → shop。
- event/act-plan 同时匹配 event 和 act_plan。
- map/act-start 匹配 act_plan；fight-plan 匹配 fight_plan，供已明确声明该触发题型的条目查询。
- run-plan 的 run_state.trigger 为 start/act，或任意题携带 run_plan_task.trigger=start/act 时，也匹配 act_plan。hp_drop/age 的独立重规划不计幕初规划。
- 只读取静默角色文件。其他角色及无规划任务的普通战斗题不会读取它；独立 fight-plan 备战题有专用触发类型。
- 上下文取 facts → payload 根 → run_state → run_plan_task → run_brief，数值幕号兼容旧字符串。HP 允许尾随百分比。
- 排序：触发字段数＋指定牌条件数更多优先，再按 confidence 降序、id 升序。同一条即使匹配多个题型也只注入一次。
- 最多 3 条；`{schema,entries}` 整块序列化后最多 4096 UTF-8 字节，包含策略、触发器、证据和来源、派生分账及局限。装不下的条目跳过，不截断证据。
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
