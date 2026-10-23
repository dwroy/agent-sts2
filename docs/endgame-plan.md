# Silent A10 终局计划

Roy 的 [#50](https://github.com/dwroy/agent-sts2/issues/50) 第 1–3 条：从第一幕起明确 F48→F49 连续两战目标，在每道大脑构筑题更新本局核心、缺口和终局方案。第 4 条的达标线仍由学习者沿 #48 原经验提炼流水线处理，开发不生成知识或数值门槛。

生产知识工具模式下，只对 mod 实际 `character_id=SILENT`、`ascension=10` 生效。基础指令及构筑 facts 带终局目标。复用 #35 的构筑题范围：拿/跳牌、商店、休息、非战斗选牌、事件、bundle/capstone、幕初/路线计划和运行计划；代码执行的后续步骤及 Jev 独立作答的题不额外请求大脑。其他角色、其他进阶及历史非工具适配器沿原链路。

每道适用题在原请求内携带 `state.run_plan_task.endgame_plan_required=true`，答案的 `run_plan` 必填，原字段与 `construction` / 可选 V6 更新合同继续有效；新增必填 `endgame`：

| 字段 | 内容 |
|---|---|
| `core` | 本题选择之后的核心及当前成型判断 |
| `gaps` | 还缺什么，以及缺证部分 |
| `scaling_damage` | 成长性输出方案及依据 |
| `sustainable_defense` | 持续防御方案及依据 |
| `resources` | 两战 HP / 药水预算及未知 |
| `win_condition` | 连续赢两战的假设与限制 |
| `checkpoint` | 仅题面给出幕末检查时作答，其余题为空字符串 |

每字段最多 240 Unicode 字符，前六项必须非空，未知须明确写未知。计划是本局假设，不能充当正式经验；已有策略/rk 工具提供实际知识，缺失或预算耗尽后照原规则用已有信息回答。原工具数、调用/时间预算、修复与故障处理保留。无效计划不能覆盖原计划；不造默认核心或虚假达标判断。

幕末检查只出现在当前幕 Boss 前两层的适用构筑题：第一幕 F15–16、第二幕 F31–32、第三幕 F46–47。题面 `run_plan_task.endgame_checkpoint` 给当前幕和 Boss 层数，要求明确回答核心成型状态、缺口、本幕 Boss 与终局两战差距。Boss 当层奖励、幕中题和战斗选牌不触发；没有自然对应题时不补造请求。

答案沿原 `parseRunPlan` → screen memory → `run-plans.jsonl` / journal 存储，下一题 `facts.your_run_plan.endgame` 读回。没有 facts 的原题沿 `run_plan_task.previous_plan` 显示原计划。进程重启可从原计划日志恢复；向更早层数回退时排除未来层的计划，缺记录保持空。日志仍保留放弃尝试；同层旧计划是可修订假设，不作为已执行选择，实际构筑记录继续由 #35 的牌组差分与 SL 快照维护。

当前楼层上限须贯穿首次日志恢复、旧 RUN_PLAN 配置的懒加载及构筑题 `currentRunPlan` 二次读回；后者同时校验缓存与日志。只有同局未来层记录时，重复读取仍为空；有同局过去计划才恢复过去计划。此限制仅传给本功能适用范围，其他角色沿原无上限默认合同。固定回归覆盖冷重启、缓存未来计划、实际两引擎 F9/F10→F2 回退及异局负控。

这条每题更新链独立于旧 `RUN_PLAN` / `RUN_PLAN_MERGE` 开关，适用范围内不再为旧地图检查点单独发运行计划请求；每道构筑题本身承担更新。原方向权重通过既有 `acceptDirectionRide` 保留，已有转向条件仍可改变，不改 Jev 战斗出牌。

集成顺序为 #49 查询引导 → 本补丁；实际发布还须先核 #35 已进入 live。ops 沿原发布锁、最新知识叶、完整联合检查和自然开局边界发布，分配正式 release_id，并追加旧/新行为、证据及回退通知；候选开发不改 live/STOP。

核验修订基于 main `dbacc557f6f4c013380af140a3b9f89b80dcef69`，保留已修正 #49/#26：`brain-query-cues-v2` 的 rk 对应 `kb_reflex`，经验对应 `kb_experience`，Silent 工具合同为15项。早期依赖 `6290300d8` 和原14工具断言只保留为历史交付记录，不作为本版组装来源。

自然验收使用冻结的同角色/进阶/脑来源局号，沿已有工具读回：

```bash
cd agent
nice -n 19 node node_modules/tsx/dist/cli.mjs tools/brain-agent-report.ts <冻结brain.jsonl> <局号...>
```

新增 `endgame_groups` 按引擎/幕列旧计划非空率、accepted 更新率、检查点请求/回答数及 question_id。首次题旧计划为空是预期；必须再核相同 question_id 的 `run-plans.jsonl` 落盘及下一题真实读回，不能仅凭 accepted 或非空断言成功。没有题的分组为空，不冒充 100%。F48/F49 到达局数与结果继续由原实盘统计核对，首试、SL、最终结果分开，未结束保持未知，不沿用 issue 的旧分母，不做 A/B 或追加实验局。

回退只撤本 #50 代码差量，保留 #49 / #35、原计划日志与失败证据。旧解析器忽略新增 `endgame`；不删除历史，未发布的达标线和自然验收继续开放。
