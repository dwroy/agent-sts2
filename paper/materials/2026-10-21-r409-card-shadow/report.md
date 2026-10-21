# R409 大脑拿牌局的 Jev 影子评估

本轮不支持把“Nova 正常返回”当作拿牌质量通过。所有真实帧均完成 A/B 回放，真实 Nova 请求未超过 60 次；以下数值用于 Roy 决策，不构成实际拿牌收益或线上自然缓存命中率的证明。CARD 保持 brain，未执行任何游戏动作。

## 范围与复现

- 原指派：Claude 2026-10-21 07:5x，原 owner v6-w4w6 / codex1 / native thread 01a15382-68eb-7093-b677-040c9b45767f。
- R409 实际 live 基线 `cf4aff4ceebd958ad70b1512cc886c45bd8092aa`，行为提交 `6242b3a7381944436ef6d62f1a3901c1036369e7`。运行其独立代码镜像，未改生产源码。
- 日志冻结截止 `2026-10-21T00:00:18.519431+00:00`（北京时间 08:00:18）；CESK 仅含截止前已发生的奖励题。85 条 reward/card 中，严格战后三选一 83 题全部回放；7XS 的 F22、F43 不符合三选一/战斗来源门，保留排除记录。
- 六局合计超过 60 题，因此真实请求按每局题量比例、最大余数分配，再等距抽取题序（含首尾）；抽样不读 A/B、选择结果或胜负。全部 83 题有离线指标，60 题有真实 Jev 回答。
- 真实 Nova：`typesafe/jev-1.14`，项目 JevClient / Decisions 协议，choice 候选在 criteria；独立请求预算 5000 ms、零重试。没有 ModClient、动作派发或 live 日志写入。
- 数据用当前 live 知识的只读冻结快照，而非倒填历史时点知识。逐文件按实际读到的字节冻结，未持发布锁，不能证明跨文件原子快照；冻结后独立校验其 SHA。源码、原始帧、实际大脑动作、完整题面/响应、A/B 审计均保留。
- 回放前按真实历史状态重建 routePlan/lastMap 和战后来源；六局没有可恢复的合法 V6 方向计划，题面 direction_weights 保持生产缺省 `{}`，未编造方向权重。
- B 使用 R409 的 `startCardBackground`：在每道题原有大脑等待窗口内最多给 5000 ms，再由纯缓存 getter 读取；A 使用 `evaluateCard`，随后原 `buildV6CardPick` 和 `constructionQuestion`。这是受控的奖励大脑等待回放，并非重演原局全部后台调度；若切 CARD=jev，该奖励脑等待本身会消失，不能据此声称相同线上 B 命中率。
- 安全门已判 unknown 的题也做了只请求影子观察；实际生产会交回大脑，不会采用该影子 Jev 选择。所有下列可排序分母均排除缺失指标的题，不把未知计零。

| 局号 | 全部合格题 | 真实 Nova | 生产安全门通过 | A 可完整诊断/已答 | Jev 与脑同选 |
|---|---:|---:|---:|---:|---:|
| 7XS2Y920KA6E | 23 | 17/17 | 9 | 7 | 10/17 |
| SVBEFF7YAZMA | 21 | 15/15 | 21 | 14 | 9/15 |
| BQXQJQ9GN51L | 8 | 6/6 | 8 | 6 | 3/6 |
| MGB1D1T0Y8G0 | 5 | 4/4 | 5 | 3 | 1/4 |
| CLCR3DUH66HK | 13 | 9/9 | 13 | 5 | 2/9 |
| CESK0EFSJ2C4 | 13 | 9/9 | 13 | 7 | 2/9 |

## 五指标诊断规则

只比较题面已经给出的同种子 option−skip 配对差；本幕 Boss 权重 1/2，本幕精英池均分另外 1/2。这是诊断汇总，不是新增生产公式，不是精英出现概率，不乘凑齐概率 P。另列 Boss 权重 0、1/4、1/2、3/4、1 的敏感性。

确定一个可复核“最优”集合：先最小化死亡率差，再最小化掉血差；若所有选项、目标的样本都输，再依次最小化输时剩敌血、最大化每回合伤害、最大化存活回合；若全赢，则最大化每回合伤害、最小化回合。混合胜负时，输时剩血是条件量、回合优劣方向不统一，不强行并入全局顺序。没有任一所需指标或 n<2 则记不可排序。报告同时给 Pareto 相容率，避免把词典序偏好当作唯一游戏价值。

“均值严格逆指标”指另一个选项在全部适用指标均不差、至少一项严格更好；死亡/掉血/输时剩血越小越好，DPT 越大越好，回合按上述全输/全赢条件判断。另列仅死亡/掉血/DPT 三指标的支配情况，不藏掉条件指标冲突。

上述支配比较使用明确权重汇总。另做不加权的更严格检查：每一个 Boss/精英目标的适用字段都不得更差、至少一处更好，才记“逐目标支配”，避免把目标之间的取舍也称为没有任何依据的逆选。

不把两个候选各自对 skip 的 SE 拼成已知的候选间配对 SE。只做保守敏感性筛查：汇总 SE 上界为加权 SE 之和；候选间上界再相加，全部指标的差加 2 倍上界仍不劣、至少一项严格优，才列“2SE 仍支配”。该规则不是已校准置信区间；很多目标仅 n=2，零例死亡/全死的 SE=0 也不等于真实风险确定。

B 作为独立长期证据，不与 A 或 P 相乘，也不构造 A/B 总分。A 的支配或词典序不一致不等同于整体错误；逐例保留候选推进的组合和 B，供判断是否存在长期取舍。

## 选择结果

- Nova 已答 60/60；错误 0。生产安全门通过 69/83（83.1%），已请求子集中通过 50/60。
- A 可完整诊断 42/60；Jev 命中上述最优 17/42（40.5%），同一子集大脑 16/42（38.1%）。Jev Pareto 相容 35/42（83.3%）。
- 仅生产安全门通过的已答题：Jev 命中诊断最优 17/42（40.5%），大脑 16/42（38.1%）；适用字段汇总均值支配 8/50 题，2SE 仍支配 0 题。双方同选 19/50（38.0%）；Jev/脑跳过分别 1/50、8/50。
- 五指标中适用字段的汇总均值支配 8/60 题，其中全部选项可完整诊断的 7/42 题；保守 2SE 筛查后 0 题；仅三主指标支配 10 题。另有选项缺值不妨碍已知两个候选之间出现支配，但不把该题放入全题最优分母。均值反例不能因 2SE 筛查不显著而抹去。
- 不依赖 Boss/精英权重的逐目标均值支配：4 题，原件键 `['7XS2Y920KA6E-f12', 'CESK0EFSJ2C4-f24', 'CESK0EFSJ2C4-f30', 'SVBEFF7YAZMA-f29']`。
- Jev 与大脑实际同选 27/60（45.0%）。不一致题按 A 的关系：`{"metric_tradeoff": 16, "brain_mean_better": 3, "unknown": 6, "jev_mean_better": 8}`。取舍或未知没有强判谁更优。
- 同一真实请求子集：Jev 跳过 7/60（11.7%），大脑跳过 12/60（20.0%）；对应拿牌分别 53、48。全部 83 题大脑跳过 17。
- Jev 跳过时存在五指标均值支配 skip 的牌：0 题；2SE 仍支配 0 题。
- 全部选项本幕 Boss 样本死亡率都为 1：51/83；可诊断已答题中全部 Boss/精英样本都输 11/42。这保留了先前精英偏差诊断的限制，不能拿这些均值证明真实胜负或选牌收益。

| Boss 诊断权重（精英均分余量） | Jev 最优一致 | 大脑最优一致（相同题） |
|---|---:|---:|
| 0 | 14/42 | 16/42 |
| 0.25 | 16/42 | 16/42 |
| 0.5 | 17/42 | 16/42 |
| 0.75 | 18/42 | 17/42 |
| 1 | 23/47 | 22/47 |

## B 与耗时

- 缓存有 n≥2 且掉血结果的题 69/83（83.1%）；实际 criteria 出现数值 B 的题 28/83（33.7%）。前者 4450 行 / 13872 个理论组合×未来目标槽位，未计算和缺模型均不补零；后者只展示本选项推进的组合，故可低于缓存有值率。
- 生产安全门通过题内：B 缓存有值 69/69；criteria 有值 28/69。

| 分段（p50 / p90 / 最大） | 实测 |
|---|---|
| A 提供方（含输入准备） | 4605.5 / 5539.7 / 6023.2 ms；超过 5 s：26/83 |
| 题面构造 | 212.9 / 401.3 / 18736.2 ms；超过 5 s：1/83 |
| 前台 A+题面 | 4855.6 / 5858.8 / 24631.0 ms；超过 5 s：34/83 |
| B 后台窗口，独立计时 | 5004.3 / 5010.9 / 6097.7 ms；超过 5 s：69/83 |
| 真实 Nova 请求 | 665.8 / 1088.6 / 1555.1 ms；超过 5 s：0/60 |
| 安全门通过题的前台 A+题面 | 4957.8 / 5894.2 / 24631.0 ms；超过 5 s：34/69 |

实际 wire 最大 23944 B，限额 24,000 B；A/B 所有已展示指标按生产有效数字格式与原审计严格核对，差异 0。无放宽精度或新增样本预算。前台时间不包含历史日志重建，也不包含单列的 B 后台窗口；包含生产输入准备、A 计算和题面压缩，不能只用 A 内部模拟时间声称满足 5 秒。
最慢题为 MGB1D1T0Y8G0 F12：A 5894.9 ms、题面构造 18736.2 ms，前台合计 24631.0 ms；CLCR F5 题面构造 2601.9 ms。未采性能栈/同期进程 CPU，不把墙钟异常确定归因为算法或机器负载；原段计时与完整输入保留。本任务只读，没有借此改生产实现或追加请求。

unknown 原因是条目标签计数，非独立对局、非互斥归因：

```json
{
  "A": {
    "unmodelled_card:SPORE_MIND": 60,
    "baseline_unmodelled_card:SPORE_MIND": 60,
    "insufficient_samples": 346,
    "unmodelled_card:NIGHTMARE": 11,
    "unmodelled_card:EXPOSE": 208,
    "baseline_unmodelled_card:EXPOSE": 208,
    "unmodelled_card:SHADOW_STEP": 4,
    "unmodelled_card:MIRAGE": 4,
    "unmodelled_card:SIDESTEP": 4,
    "unmodelled_card:STORM_OF_STEEL": 4
  },
  "B": {
    "insufficient_samples": 2443,
    "core_prerequisite_or_required_resource_unavailable": 1137,
    "core_prerequisite_not_met": 1137,
    "no_terminal_samples": 22,
    "unmodelled_card:SPORE_MIND": 378,
    "baseline_unmodelled_card:SPORE_MIND": 459,
    "ordered_pair_unobserved_in_first_boss_cohort": 323,
    "unmodelled_card:EXPOSE": 868,
    "baseline_unmodelled_card:EXPOSE": 1054,
    "background_preparation_budget_exhausted": 1,
    "background_sampling_budget_exhausted": 17
  }
}
```

## 均值反例与分歧原件

### 7XS2Y920KA6E-f12

大脑 skip；Jev card0，confidence=0.28；五指标均值支配方 ['card1', 'card2']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card0 `{"index": 0, "card_id": "LEADING_STRIKE", "name": "先制打击", "upgraded": false, "card_type": "Attack", "rarity": "Common", "energy_cost": 1, "rules_text": "造成{Damage:diff()}点伤害。 将{Shivs:diff()}张小刀加入你的手牌。", "resolved_rules_text": "造成3点伤害。 将2张小刀加入你的手牌。", "dynamic_values": [{"name": "Damage", "base_value": 3, "current_value": 3, "enchanted_value": 3, "is_modified": false, "was_just_upgraded": false}, {"name": "Shivs", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}]}` | -0.00833333 / 0.175 / 2.47997 / -0.341667 / unknown |
| skip `"skip"` | 0 / 0 / 0 / 0 / unknown |
| card1 `{"index": 1, "card_id": "HAZE", "name": "迷雾", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 2, "rules_text": "给予所有敌人{PoisonPower:diff()}层中毒和{WeakPower:diff()}层虚弱。", "resolved_rules_text": "给予所有敌人4层中毒和1层虚弱。", "dynamic_values": [{"name": "PoisonPower", "base_value": 4, "current_value": 4, "enchanted_value": 4, "is_modified": false, "was_just_upgraded": false}, {"name": "WeakPower", "base_value": 1, "current_value": 1, "enchanted_value": 1, "is_modified": false, "was_just_upgraded": false}]}` | -0.05 / -1.38333 / 4.09163 / -0.158333 / unknown |
| card2 `{"index": 2, "card_id": "BLADE_DANCE", "name": "刀刃之舞", "upgraded": false, "card_type": "Skill", "rarity": "Common", "energy_cost": 1, "rules_text": "添加{Cards:diff()}张小刀到你的手牌。", "resolved_rules_text": "添加3张小刀到你的手牌。 消耗。", "dynamic_values": [{"name": "Cards", "base_value": 3, "current_value": 3, "enchanted_value": 3, "is_modified": false, "was_just_upgraded": false}]}` | -0.225 / -1.95 / 3.54214 / 0.0166667 / unknown |

完整结果/criteria：`results/7XS2Y920KA6E-f12.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card0": [],
  "card1": [],
  "card2": [
    {
      "direction": "S",
      "core": "S-dance-accuracy",
      "advanced": 1,
      "cards_missing": 3,
      "results": [
        {
          "target": 7,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              13.875,
              1.62,
              2
            ],
            [
              4,
              0,
              2
            ],
            [
              0.87033,
              0.0152,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -8.875,
              3.38,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              0.082944,
              0.0315,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.171192，高于整体 0.107560 的 1.25 倍 0.134451; 模拟每回合被打穿的血是实际的 1.33 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 8,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              18.967,
              0.367,
              2
            ],
            [
              9.5,
              0.5,
              2
            ],
            [
              0.69925,
              0.015,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -4.3111,
              0.911,
              2
            ],
            [
              -0.5,
              0.5,
              2
            ],
            [
              0.12907,
              0.0113,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "模拟每回合被打穿的血是实际的 1.38 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 9,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              14.143,
              3.57,
              2
            ],
            [
              7,
              0,
              2
            ],
            [
              0.70968,
              0.0733,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -2.4286,
              1.71,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              0.049853,
              0.0352,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.139196，高于整体 0.107560 的 1.25 倍 0.134451",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 10,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              66,
              0,
              2
            ],
            [
              6.7857,
              2.07,
              2
            ],
            [
              7,
              0,
              2
            ],
            [
              0.91121,
              0.0271,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              1.6857,
              5.17,
              2
            ],
            [
              2,
              0,
              2
            ],
            [
              -0.041121,
              0.0561,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.198755，高于整体 0.107560 的 1.25 倍 0.134451; 偏乐观：预测平均胜率 67%，实际 48%; 模拟每回合被打穿的血是实际的 4.41 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        }
      ],
      "unknown": [],
      "numeric_targets_omitted": 1
    },
    {
      "direction": "S",
      "core": "S-dance-afterimage",
      "advanced": 1,
      "cards_missing": 2,
      "results": [
        {
          "target": 7,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              15.5,
              3,
              2
            ],
            [
              4,
              0,
              2
            ],
            [
              0.85514,
              0.028,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -7.25,
              4.75,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              0.067757,
              0.0444,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.171192，高于整体 0.107560 的 1.25 倍 0.134451; 模拟每回合被打穿的血是实际的 1.33 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 8,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              18.85,
              5.65,
              2
            ],
            [
              10,
              0,
              2
            ],
            [
              0.67794,
              0.142,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -4.4278,
              4.37,
              2
            ],
            [
              0,
              1,
              2
            ],
            [
              0.10777,
              0.168,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "模拟每回合被打穿的血是实际的 1.38 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 9,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              20.071,
              3.07,
              2
            ],
            [
              6.5,
              0.5,
              2
            ],
            [
              0.6129,
              0.088,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              3.5,
              1.21,
              2
            ],
            [
              -0.5,
              0.5,
              2
            ],
            [
              -0.046921,
              0.0499,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.139196，高于整体 0.107560 的 1.25 倍 0.134451",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 10,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              66,
              0,
              2
            ],
            [
              5.2,
              0.8,
              2
            ],
            [
              6,
              1,
              2
            ],
            [
              0.94019,
              0.0187,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              0.1,
              3.9,
              2
            ],
            [
              1,
              1,
              2
            ],
            [
              -0.01215,
              0.0477,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.198755，高于整体 0.107560 的 1.25 倍 0.134451; 偏乐观：预测平均胜率 67%，实际 48%; 模拟每回合被打穿的血是实际的 4.41 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        }
      ],
      "unknown": [],
      "numeric_targets_omitted": 1
    },
    {
      "direction": "S",
      "core": "S-observed-union-35f60a95",
      "advanced": 1,
      "cards_missing": 4,
      "results": [],
      "unknown": [],
      "numeric_targets_omitted": 4
    }
  ]
}
```

### 7XS2Y920KA6E-f3

大脑 card1；Jev card2，confidence=0.31；五指标均值支配方 ['card1']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card2 `{"index": 2, "card_id": "CLOAK_AND_DAGGER", "name": "斗篷与匕首", "upgraded": false, "card_type": "Skill", "rarity": "Common", "energy_cost": 1, "rules_text": "获得{Block:diff()}点格挡。 将{Cards:diff()}张小刀添加到你的手牌。", "resolved_rules_text": "获得6点格挡。 将1张小刀添加到你的手牌。", "dynamic_values": [{"name": "Block", "base_value": 6, "current_value": 6, "enchanted_value": 6, "is_modified": false, "was_just_upgraded": false}, {"name": "Cards", "base_value": 1, "current_value": 1, "enchanted_value": 1, "is_modified": false, "was_just_upgraded": false}]}` | -0.0416667 / 0 / -0.599466 / 0.1 / unknown |
| card1 `{"index": 1, "card_id": "HAZE", "name": "迷雾", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 2, "rules_text": "给予所有敌人{PoisonPower:diff()}层中毒和{WeakPower:diff()}层虚弱。", "resolved_rules_text": "给予所有敌人4层中毒和1层虚弱。", "dynamic_values": [{"name": "PoisonPower", "base_value": 4, "current_value": 4, "enchanted_value": 4, "is_modified": false, "was_just_upgraded": false}, {"name": "WeakPower", "base_value": 1, "current_value": 1, "enchanted_value": 1, "is_modified": false, "was_just_upgraded": false}]}` | -0.0416667 / -0.416667 / 0.330322 / -0.383333 / unknown |

完整结果/criteria：`results/7XS2Y920KA6E-f3.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card2": [
    {
      "direction": "S",
      "core": "S-cloak-phantom",
      "advanced": 1,
      "cards_missing": 3,
      "results": [
        {
          "target": 7,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              6.875,
              0.875,
              2
            ],
            [
              4,
              0,
              2
            ],
            [
              0.93575,
              0.00818,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -2.5,
              2.5,
              2
            ],
            [
              0.5,
              0.5,
              2
            ],
            [
              0.010514,
              0.0105,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "校准 Brier 0.171192，高于整体 0.107560 的 1.25 倍 0.134451; 模拟每回合被打穿的血是实际的 1.33 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        },
        {
          "target": 8,
          "result": [
            [
              1,
              0,
              2
            ],
            [
              57,
              0,
              2
            ],
            [
              10.04,
              1.4,
              2
            ],
            [
              10,
              1,
              2
            ],
            [
              0.89098,
              0.00125,
              2
            ]
          ],
          "vs_current_deck": [
            [
              0,
              0,
              2
            ],
            [
              0,
              0,
              2
            ],
            [
              -3.5628,
              4.23,
              2
            ],
            [
              2,
              2,
              2
            ],
            [
              0.04386,
              0.0589,
              2
            ]
          ],
          "trust": {
            "value": "low_optimistic",
            "labels": [
              "模拟每回合被打穿的血是实际的 1.38 倍",
              "bias_sign_from_own_pre_fight_validation_mean"
            ]
          }
        }
      ],
      "unknown": []
    }
  ],
  "card1": []
}
```

### CESK0EFSJ2C4-f24

大脑 card2；Jev card1，confidence=0.15；五指标均值支配方 ['skip']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card1 `{"index": 1, "card_id": "ESCAPE_PLAN", "name": "逃脱计划", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 0, "rules_text": "抽1张牌。 如果抽到的是技能牌，则获得{Block:diff()}点格挡。", "resolved_rules_text": "抽1张牌。 如果抽到的是技能牌，则获得3点格挡。", "dynamic_values": [{"name": "Block", "base_value": 3, "current_value": 3, "enchanted_value": 3, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / -3.15 / -0.25 / 0.0445692 |
| card2 `{"index": 2, "card_id": "LEG_SWEEP", "name": "扫腿", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 2, "rules_text": "给予{WeakPower:diff()}层虚弱。 获得{Block:diff()}点格挡。", "resolved_rules_text": "给予2层虚弱。 获得11点格挡。", "dynamic_values": [{"name": "Block", "base_value": 11, "current_value": 11, "enchanted_value": 11, "is_modified": false, "was_just_upgraded": false}, {"name": "WeakPower", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / -4.2 / -0.15 / 0.0334668 |
| skip `"skip"` | 0 / 0 / 0 / 0 / 0 |

完整结果/criteria：`results/CESK0EFSJ2C4-f24.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card1": [],
  "skip": []
}
```

### CESK0EFSJ2C4-f30

大脑 skip；Jev card0，confidence=0.28；五指标均值支配方 ['card1', 'card2']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card0 `{"index": 0, "card_id": "CLOAK_AND_DAGGER", "name": "斗篷与匕首", "upgraded": false, "card_type": "Skill", "rarity": "Common", "energy_cost": 1, "rules_text": "获得{Block:diff()}点格挡。 将{Cards:diff()}张小刀添加到你的手牌。", "resolved_rules_text": "获得6点格挡。 将1张小刀添加到你的手牌。", "dynamic_values": [{"name": "Block", "base_value": 6, "current_value": 6, "enchanted_value": 6, "is_modified": false, "was_just_upgraded": false}, {"name": "Cards", "base_value": 1, "current_value": 1, "enchanted_value": 1, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / -7.2875 / 0.45 / -0.07998 |
| skip `"skip"` | 0 / 0 / 0 / 0 / 0 |
| card1 `{"index": 1, "card_id": "SPEEDSTER", "name": "速行者", "upgraded": false, "card_type": "Power", "rarity": "Uncommon", "energy_cost": 2, "rules_text": "每当你在回合进行中抽到一张牌时，对所有敌人造成{SpeedsterPower:diff()}点伤害。", "resolved_rules_text": "每当你在回合进行中抽到一张牌时，对所有敌人造成2点伤害。", "dynamic_values": [{"name": "SpeedsterPower", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / -1.4375 / 0.5 / -0.115611 |
| card2 `{"index": 2, "card_id": "DASH", "name": "冲刺", "upgraded": false, "card_type": "Attack", "rarity": "Uncommon", "energy_cost": 2, "rules_text": "获得{Block:diff()}点格挡。 造成{Damage:diff()}点伤害。", "resolved_rules_text": "获得10点格挡。 造成10点伤害。", "dynamic_values": [{"name": "Block", "base_value": 10, "current_value": 10, "enchanted_value": 10, "is_modified": false, "was_just_upgraded": false}, {"name": "Damage", "base_value": 10, "current_value": 10, "enchanted_value": 10, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / -1.4375 / 0.5 / -0.115611 |

完整结果/criteria：`results/CESK0EFSJ2C4-f30.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card0": [],
  "card1": [],
  "card2": []
}
```

### CESK0EFSJ2C4-f6

大脑 card1；Jev card0，confidence=0.36；五指标均值支配方 ['card1']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card0 `{"index": 0, "card_id": "PINPOINT", "name": "精密瞄准", "upgraded": false, "card_type": "Attack", "rarity": "Uncommon", "energy_cost": 3, "rules_text": "造成{Damage:diff()}点伤害。 你在本回合中每打出过一张技能牌，其耗能减少1{energyPrefix:energyIcons(1)}。", "resolved_rules_text": "造成15点伤害。 你在本回合中每打出过一张技能牌，其耗能减少1res://images/packed/sprite_fonts/silent_energy_icon.png。", "dynamic_values": [{"name": "Damage", "base_value": 15, "current_value": 15, "enchanted_value": 15, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / 0.400272 / 0.256484 / -0.0190544 |
| card1 `{"index": 1, "card_id": "CLOAK_AND_DAGGER", "name": "斗篷与匕首", "upgraded": false, "card_type": "Skill", "rarity": "Common", "energy_cost": 1, "rules_text": "获得{Block:diff()}点格挡。 将{Cards:diff()}张小刀添加到你的手牌。", "resolved_rules_text": "获得6点格挡。 将1张小刀添加到你的手牌。", "dynamic_values": [{"name": "Block", "base_value": 6, "current_value": 6, "enchanted_value": 6, "is_modified": false, "was_just_upgraded": false}, {"name": "Cards", "base_value": 1, "current_value": 1, "enchanted_value": 1, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / 0.412254 / 0.557405 / -0.0446592 |

完整结果/criteria：`results/CESK0EFSJ2C4-f6.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card0": [],
  "card1": [
    {
      "direction": "S",
      "core": "S-cloak-phantom",
      "advanced": 1,
      "cards_missing": 3,
      "results": [],
      "unknown": [],
      "numeric_targets_omitted": 7
    }
  ]
}
```

### CLCR3DUH66HK-f23

大脑 card1；Jev card2，confidence=0.28；五指标均值支配方 ['card0']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card2 `{"index": 2, "card_id": "PREDATOR", "name": "猎杀者", "upgraded": false, "card_type": "Attack", "rarity": "Common", "energy_cost": 2, "rules_text": "造成{Damage:diff()}点伤害。 在下个回合抽2张牌。", "resolved_rules_text": "造成15点伤害。 在下个回合抽2张牌。", "dynamic_values": [{"name": "Damage", "base_value": 15, "current_value": 15, "enchanted_value": 15, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / 2.39208 / -0.677778 / 0.0197539 |
| card1 `{"index": 1, "card_id": "BACKFLIP", "name": "后空翻", "upgraded": false, "card_type": "Skill", "rarity": "Common", "energy_cost": 1, "rules_text": "获得{Block:diff()}点格挡。 抽2张牌。", "resolved_rules_text": "获得5点格挡。 抽2张牌。", "dynamic_values": [{"name": "Block", "base_value": 5, "current_value": 5, "enchanted_value": 5, "is_modified": false, "was_just_upgraded": false}, {"name": "Cards", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / 0.524213 / -0.288888 / 0.0132963 |
| card0 `{"index": 0, "card_id": "EXPOSE", "name": "暴露", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 0, "rules_text": "去除敌人身上的所有格挡值和人工制品。 并给予{Power:diff()}层易伤。", "resolved_rules_text": "去除敌人身上的所有格挡值和人工制品。 并给予2层易伤。 消耗。", "dynamic_values": [{"name": "Power", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}]}` | 0 / 0 / 3.38275 / -0.620372 / 0.00573435 |

完整结果/criteria：`results/CLCR3DUH66HK-f23.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card2": [],
  "card0": []
}
```

### SVBEFF7YAZMA-f29

大脑 card0；Jev card2，confidence=0.28；五指标均值支配方 ['card0', 'card1', 'skip']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card2 `{"index": 2, "card_id": "TACTICIAN", "name": "战术大师", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 3, "rules_text": "获得{Energy:energyIcons()}。", "resolved_rules_text": "奇巧。 获得res://images/packed/sprite_fonts/silent_energy_icon.png。", "dynamic_values": [{"name": "Energy", "base_value": 1, "current_value": 1, "enchanted_value": 1, "is_modified": false, "was_just_upgraded": false}]}` | 0.0833333 / 0.416667 / -10.3532 / 0.116667 / unknown |
| card0 `{"index": 0, "card_id": "ANTICIPATE", "name": "预判+", "upgraded": true, "card_type": "Skill", "rarity": "Common", "energy_cost": 0, "rules_text": "在本回合获得{DexterityPower:diff()}点敏捷。", "resolved_rules_text": "在本回合获得4点敏捷。", "dynamic_values": [{"name": "DexterityPower", "base_value": 4, "current_value": 4, "enchanted_value": 4, "is_modified": false, "was_just_upgraded": false}]}` | 0.0833333 / 0.416667 / -9.05002 / 0.316667 / unknown |
| card1 `{"index": 1, "card_id": "DODGE_AND_ROLL", "name": "闪躲翻滚", "upgraded": false, "card_type": "Skill", "rarity": "Common", "energy_cost": 1, "rules_text": "获得{Block:diff()}点格挡。 在下个回合，获得{Block:diff()}点格挡。", "resolved_rules_text": "获得4点格挡。 在下个回合，获得4点格挡。", "dynamic_values": [{"name": "Block", "base_value": 4, "current_value": 4, "enchanted_value": 4, "is_modified": false, "was_just_upgraded": false}]}` | 0.0833333 / 0.416667 / -10.031 / 0.416667 / unknown |
| skip `"skip"` | 0 / 0 / 0 / 0 / unknown |

完整结果/criteria：`results/SVBEFF7YAZMA-f29.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card2": [],
  "card0": [],
  "card1": [],
  "skip": []
}
```

### SVBEFF7YAZMA-f42

大脑 card1；Jev card0，confidence=0.17；五指标均值支配方 ['skip']；2SE 仍支配 []。

| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |
|---|---|
| card0 `{"index": 0, "card_id": "BOUNCING_FLASK", "name": "弹跳药瓶", "upgraded": false, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 2, "rules_text": "随机给予敌人{PoisonPower:diff()}层中毒{Repeat:diff()}次。", "resolved_rules_text": "随机给予敌人3层中毒3次。", "dynamic_values": [{"name": "PoisonPower", "base_value": 3, "current_value": 3, "enchanted_value": 3, "is_modified": false, "was_just_upgraded": false}, {"name": "Repeat", "base_value": 3, "current_value": 3, "enchanted_value": 3, "is_modified": false, "was_just_upgraded": false}]}` | 0.0833333 / 1.08333 / -2.17667 / -0.4 / unknown |
| card1 `{"index": 1, "card_id": "HIDDEN_DAGGERS", "name": "隐秘匕首+", "upgraded": true, "card_type": "Skill", "rarity": "Uncommon", "energy_cost": 0, "rules_text": "丢弃{Cards:diff()}张牌。 将{Shivs:diff()}张{IfUpgraded:show:小刀+|小刀}加入你的手牌。", "resolved_rules_text": "丢弃2张牌。 将2张小刀+加入你的手牌。", "dynamic_values": [{"name": "Cards", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}, {"name": "Shivs", "base_value": 2, "current_value": 2, "enchanted_value": 2, "is_modified": false, "was_just_upgraded": false}]}` | 0.0833333 / 1.08333 / -4.46143 / -0.15 / unknown |
| skip `"skip"` | 0 / 0 / 0 / 0 / unknown |

完整结果/criteria：`results/SVBEFF7YAZMA-f42.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。

所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：

```json
{
  "card0": [],
  "skip": []
}
```

## 判断与限制

本轮证实 R409 criteria 与 B 缓存消费能够运行，真实 Nova 请求和字节预算可接受；仍有均值支配反例、低样本/模型偏差、缺模型题及准备超 5 秒问题。不建议仅凭本次一致率自动切回 Jev；保持 CARD=brain，由 Roy 结合逐题证据决定。未改设计口径、知识、阈值、配置或 live。

这不是随机选牌干预实验，不证明 Jev 或大脑造成后续早死；同一模型指标是诊断参照而非真实质量标签。六局内题目相关，83/60 不是独立局样本。不将 B 再计算当作自然采用或收益。

复现：先按 `frozen/runtime-data.tar.gz` 和 `frozen/runtime-data-manifest.json` 恢复私有数据镜像，再用精确 R409 代码与生产 test helper；`shadow.mts` 默认会发真实请求，不应为核报告重复运行。离线核对只需 `python3 analyse.py`、`python3 verify.py`、`python3 write_report.py`。脚本、原件 SHA、逐题 CSV 和敏感性在同目录；完整网络原件不含鉴权头或 key。

本次仅材料和只读回放脚本，未跑产品全检；除本次授权的最多 60 次 Nova 请求，没有额外模型请求、学习派发、对局或发布动作。
