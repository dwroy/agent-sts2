# 组合实战指标生成器（W2.2）

`build-combo-metrics.py` 是离线、只用标准库的生成器。输入学习者给出的组合定义和实际日志，输出 `combo-metrics-report-v1`；其中 `combos[].metrics` 可交给 W1.1 的 `build-core-v1` 校验器。它不发布知识、不调用模型、不运行游戏或投影模拟，也没有运行时挂接。

```bash
nice -n 10 python3 knowledge/builders/build-combo-metrics.py \
  --logs /path/to/logs --character silent \
  --spec /path/to/learner-combos.json \
  --manifest /path/to/frozen-inputs.json \
  --run-inventory /path/to/run-inventory.json \
  --coverage /path/to/run-coverage.json \
  --witnesses /path/to/combo-run-witnesses.json \
  --output /path/to/scratch/combo-metrics.json
```

`--spec` 接受 `build-cores-v1`、`build-core-v1` 或单个 `{id,cards}` 组合。只处理对应角色已结束的局，`--run` 可重复指定子集。牌要求支持 `id`/`any_of`、`count`、`upgraded`；按学习者当前约定，`upgraded:false` 表示不要求升级，`true` 必须有现场升级证据。同一张牌不能满足两个所需副本。

`--manifest` 使用 `log_byte_limits` 冻结日志字节上限；不提供时在启动时捕获当前长度。`--run-inventory` 用每局 `stream_ranges` 限定状态、SL 和决策读取范围；重叠范围合并一次。输入截断半行、坏 JSON、身份冲突、角色不符或缺少指定已结束局均报错，不默默修补。输出同时保存读取范围和 SHA256，每个保留的观察附原文件、偏移、行字节数和 SHA256。生成器拒绝直接输出正式角色知识路径，建议总是写 scratch 或材料目录。

默认版本层是原始 `runs.code`（缺失明确标 unknown），不能恢复短 SHA/dirty 的精确构建。加 `--coverage` 时还必须给 inventory，版本按学习者的 `code;records=...;accepted=...;config=...` 原始复合标签分层。角色、进阶、版本、`first`/`including_sl` 分账，未知进阶单列原因。

## 持有、生效与学习者见证

同时持有所需牌只作 `audit.first_holding`。指标的成型要求同场实际生效，不能用最终牌组回填早期状态。

推荐给出学习者的 `--witnesses`：每个组合 × 选中局都必须有一行 `activation_witnesses`，空数组是该冻结审计未发现生效的明确记录，缺行会报错。程序重读原始字节核 SHA，核对局/层/回合/时间和当时持有状态；逐张贡献见证核同回合单次出牌计数、手牌唯一移除、现场升级和费用，额外状态不得跨局/层或晚于生效。**这些检查核来源与时序；具体牌为何构成贡献仍由学习者的 `definition` 负责。** 代码不内置卡牌、敌人或遗物机制。

也可用 `--rules` 传入学习者给出的 `{combo_id:{activation,required_relics,evidence}}`。`activation` 只支持有界 `all`/`any` 和 `played`、`player_power`、`enemy_power` 原子（`{id,at_least}`），不执行表达式或任意代码。`played` 只计实际完成、能从精确前置手牌识别身份的动作。缺状态保持 unknown。未给规则或见证时成型指标也保持 unknown，不能由持有推定生效。

## 指标口径

所有 27 个 observed 槽均输出，缺观察为 `n:0,value:null,unknown_reason`。局内先汇总，每局最多贡献一个独立样本；SL/回合/多敌不增加独立局数。连续量默认局间中位数及 p25/p75；中位数 SE 为固定种子 20261019、400 次独立局 bootstrap（n≥3），均值 SE 需要 n≥2，比例用二项插件 SE（边界为零不表示确定），计数/极值 SE 未知。n<10 标 `small_sample`，启动回合另有分布。

| 字段 | 从日志重算的可见量与边界 |
|---|---|
| `dpr_boss/elite/normal`、`dpr_turns_1_3/4_6/7_plus`、`peak_turn_damage` | 生效回合之后，从稳定且未出牌的就绪状态到下一连续回合同类状态，敌 HP 推进。先每局均值，再跨局中位；最高值先取局内最高。排除终末缺下一回合、缺帧、回血、变身、实体消失/身份歧义。包含全部伤源和余血截断，不能归因组合本身。分段按战斗回合编号。 |
| `aoe_damage` | 现有多敌 HP 推进不能区分群伤与多次单攻等伤源，保留未知；多敌观察留 audit。 |
| `block_per_turn`、`hp_loss_per_turn` | 同回合可见正格挡增量下界；无可见回血的玩家 HP 首尾损失（含自损）。不是事件级总格挡或敌人毛伤。 |
| `startup_turn/energy/draw`、`first_completed_floor` | 每局最早可核生效的回合/层；能量是该见证必需贡献施放的现场费用合计，不是理论最低预算或全部过渡牌开销。缺累计实际抽牌计数时抽牌数未知。 |
| `formed_runs/formation_rate`、`cleared_runs/mean_reached_floor` | 全部分层局的已观察生效数量/比例下界；生效局的实际通关计数、可见到达层均值。first 在首条已记录判死/实死/重载或重试起点截尾，后续胜利不能算首试。 |
| `bosses.*`、`chain_reached/won/win_rate` | 生效以后、入口仍持有要求的各 Boss 到达/胜利/比例；每局同 Boss/层 SL 去重。F48→F49 只在该进阶有显式 F49 结构时统计；F48 赢而 F49 缺失是未知，不能补失败。 |
| `availability[].offered_rate` | 每张所需牌 × 幕，有完整实际奖励/在售商店供给的独立局中，至少看到一次要求版本牌的比例；重复访问和 SL 按局幕去重。不是掉率或买得起的概率。 |
| `deck_size_min/max/scaling` | 生效场入口牌组规模的逐局极值再跨局极值；scaling 按学习者口径，在同局同战斗类型内取战斗 DPR 对牌组张数的 OLS 斜率，局内各类型中位后再跨局中位。没有至少两种规模时未知；敌人、层和资源未控，仅描述相关，不能当加牌收益。原规模/DPR 和斜率保留 audit。 |
| `potion_dependency/sl_dependency/key_relic_dependency` | 原始资源与重试观察留 audit；没有可比反事实，依赖指标未知。遗物作为学习者给出的入组条件不等于因果依赖。 |

含 SL 的连续表现每层取时间最早的合格生效尝试，完整原尝试与排除原因仍在 audit。战斗分类只用实际 SL summary 或地图节点，不用预训练怪物分类。`simulation:[]`，模拟样本不能混入实战分母。

固定数据测试：`python3 knowledge/builders/test_combo_metrics.py`。`agent/tests/v6-combo-metrics.test.ts` 另验证实际 CLI 输出能通过公开 `validateBuildCore`。真实只读对照及历史差异见 `paper/materials/2026-10-19-v6-w2.2/`。
