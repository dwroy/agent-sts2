# Boss遭遇分组：独立候选批次报告

批次 `20261024-221312-strategy-proposal`；外部plan `issue51-boss-group-002-20261024-r56`；基线 `522197cfb8b29eea4d640032532731642a223a0d`。

已完成三种未覆盖Boss的6个新增情境及6对文字策略/rk候选；132冻结叶与11分片SHA通过，正式发布、生产读回和自然采用均为0，完整Plan回放待补。

本批仅scratch；没有提交、源码修改、正式知识修改、main/live合入或新模型/游戏/模拟调用。发布锁未使用。学习父与旧安全阈值/双Boss父保持开放。

## 身份与冻结验证

- learn.json本批external_source、external_binding、request、unit_ids、HEAD、manifest与work_spec均核同；详 `scratch/identity-verification.json`。输入SHA `792f465bc599754131cd0e15603d6a884f9ddc64f61310802c98488ca1f61a52`。
- #54三manifest共132个冻结叶大小/SHA全部一致；11个授权parquet大小/SHA全部一致。只读内存DuckDB、threads=2、显式分片列表、先按506名单过滤再聚合；原六流切点未扩。未读外部数据库/玩家标识、未下载、未同步共享logdb。
- Z2/KF9排除由冻结506名单继承，BP9及以后不在名单；没有写硬链接片。原始seek逐行保存offset/bytes/SHA与截止验证，见 `scratch/all-raw-seek-audit.json`。
- materialize第一次混入已存在的knowledge路径被工具拒绝（only exact cold evidence files）；改为仅恢复缺失冷材料后成功，未改源件/登记。

## 选题与去重

只从冻结表明示boss的记录选取；按v0.111各独立终局簇内不重叠上传行求该Boss合计。不同Boss与版本不相加为独立局。自然局重复上传/玩家依赖不可核，故从未将上传行冒作已认证独立自然局。

排除第三幕全部旧双Boss范围；排除已有Kin/Vantom/Crab/Knowledge Demon具名策略；通用首Boss准备条目保留，本批只增加具体当下动作窗口。前三为 THE_INSATIABLE 338、LAGAVULIN_MATRIARCH 257、CEREMONIAL_BEAST 251；SOUL_FYSH同251时按原ID升序选CEREMONIAL_BEAST。全排名及原ID在 `scratch/coverage.json`。旧211311的20卡/8对只作覆盖索引，不计新证据或新情境。

## 六个情境及配对

### 1. insatiable-bite-block-and-weaken

无厌沙虫当前扑咬且中和、防御可打时，比较补挡兼减攻的整条线，再重算施毒余力。0CLP16ZR4ZZC F33 T3一次机会：76血/10挡面对31攻，实打防御、毒雾+、致命毒药+、中和、后空翻；来袭31→23、挡10→25，T4仍76血。不能把零掉血单归中和，后空翻实际费用/额外效果按当帧重核。
范围：Silent A10、自有版本unknown、1局1窗口；KHECCYUJ7K48同Boss终败为反例索引，未核同手牌反事实。外部v0.111仅338上传记录的整战背景；不定安全血线、固定顺序或因果收益。

策略 `silent-brain-insatiable-bite-block-and-weaken`；rk `silent-encounter-rk-insatiable-bite-block-and-weaken`（combat_line描述tag）。新增，非同ID更新/逐字节复用/别名。独立自有支持1局、1次机会；formal_publication=pending，consumer_readback=pending。
适用信息：当前实际扑咬、两张牌合法；后空翻费用和额外效果只依原帧，不把外部均值当阈值。 外部幅度仅作整战背景；完整证据、分母、反例、原帧/回执/后继SHA保留在 `scratch/paired-candidates.json`。

### 2. insatiable-salivate-escape

无厌沙虫当前SALIVATE_MOVE且狂乱逃离可打时，把改变沙坑与推进输出分开比较，不因本轮无攻击就忽略下轮资源。0CLP16ZR4ZZC F33 T4一次机会：实打1费狂乱逃离，沙坑2→3、能量3→2，再打冲刺；T5仍76血但已显示24攻。灵动步法也在手却未打，不能据此否定建立敏捷。
范围：Silent A10/版本unknown、1局1窗口；只核本次计数变化，不推沙坑全机制、固定逃离次数或长期收益。KHECCYUJ7K48的SALIVATE后仍失败是边界反例；外部v0.111的338上传记录没有逐回合证据。

策略 `silent-brain-insatiable-salivate-escape`；rk `silent-encounter-rk-insatiable-salivate-escape`（combat_line描述tag）。新增，非同ID更新/逐字节复用/别名。独立自有支持1局、1次机会；formal_publication=pending，consumer_readback=pending。
适用信息：仅观察到的SALIVATE及狂乱逃离/冲刺合法窗口；不拿未来胜负、最终牌组或簇号触发。 外部幅度仅作整战背景；完整证据、分母、反例、原帧/回执/后继SHA保留在 `scratch/paired-candidates.json`。

### 3. matriarch-sleep-setup

乐加维林族母当前SLEEP_MOVE且毒雾、灵动步法可打时，比较先建立持续输出和防护的线，再按真实醒转重算。U1QYLX1AE1WX F17 T3一次机会：实打毒雾+与灵动步法+，毒雾0→3、敏捷0→3；T4转SLASH_MOVE，仍51血并显示21攻。不能承诺还能睡几轮或推固定唤醒阈值。
范围：Silent A10/版本unknown、1局1窗口；173ARCPHRVSS也经历沉睡准备但重试/预判组终败，非同动作对照。外部v0.111为216/257延续代理，胜者代表前节点34血、Boss后6血，不能当安全入场线。

策略 `silent-brain-matriarch-sleep-setup`；rk `silent-encounter-rk-matriarch-sleep-setup`（combat_line描述tag）。新增，非同ID更新/逐字节复用/别名。独立自有支持1局、1次机会；formal_publication=pending，consumer_readback=pending。
适用信息：原帧睡眠、毒雾与步法均合法；不是从Boss名字推睡眠机制。 外部幅度仅作整战背景；完整证据、分母、反例、原帧/回执/后继SHA保留在 `scratch/paired-candidates.json`。

### 4. matriarch-reduced-stats-block

族母当前SLASH_MOVE且己方力量或敏捷已变化时，用现牌文重算挡和伤害，不沿用睡前数值。U1QYLX1AE1WX F17 T8一次机会：力量-2、敏捷1，防御显示6挡、打击4伤；实打三张防御得18挡，面对23攻，T9由50→45血。已有25毒不代替本轮防护。
范围：Silent A10/版本unknown、1局1窗口；不将这5点视作最优损失或推固定三防。173ARCPHRVSS能力下降后仍终败为反例索引，首预判与实际死亡不混。外部v0.111总受伤均24.35/257上传，非本窗口损失。

策略 `silent-brain-matriarch-reduced-stats-block`；rk `silent-encounter-rk-matriarch-reduced-stats-block`（combat_line描述tag）。新增，非同ID更新/逐字节复用/别名。独立自有支持1局、1次机会；formal_publication=pending，consumer_readback=pending。
适用信息：当前SLASH_MOVE、防御合法且至少一项能力非零变化；幅度须读当前牌文。 外部幅度仅作整战背景；完整证据、分母、反例、原帧/回执/后继SHA保留在 `scratch/paired-candidates.json`。

### 5. ceremonial-plow-weaken-block

仪式兽当前PLOW_MOVE且突然一拳、防御可打时，比较减攻、补挡及推进输出的组合，动作后重读实际来袭。Q3R929GHT14R F17 T3一次机会：实打防御、突然一拳、防御，来袭22→13、挡0→13，T4仍51血；同时存在横冲直撞、余像及中毒，不能把9点降幅全归虚弱。扫腿也可打但未选，优劣未知。
范围：Silent A10/版本unknown、1局1窗口；3UPY3BP2LVS7同Boss终败，未核同条件对照。外部v0.111为218/251延续代理，不证明这条线的收益或固定打断阈值。

策略 `silent-brain-ceremonial-plow-weaken-block`；rk `silent-encounter-rk-ceremonial-plow-weaken-block`（combat_line描述tag）。新增，非同ID更新/逐字节复用/别名。独立自有支持1局、1次机会；formal_publication=pending，consumer_readback=pending。
适用信息：实际PLOW、合法减攻牌与防御；不推横冲直撞阈值或下一回合必定行为。 外部幅度仅作整战背景；完整证据、分母、反例、原帧/回执/后继SHA保留在 `scratch/paired-candidates.json`。

### 6. ceremonial-cry-output-versus-next-defense

仪式兽当前BEAST_CRY_MOVE不显示攻击且致命毒药、坚韧之环可打时，比较追加输出与为后轮建立格挡的代价，不把本轮零攻击当持续安全。1913SE84AXQF F17 T5一次机会：实打打击和致命毒药，坚韧之环未选；T6由41→42血（原有再生），敌140→111血并显示17攻。不能把回血归施毒，亦未证放弃坚韧之环更好。
范围：Silent A10/版本unknown、1局1窗口；本局首Boss通过后F33终败，另3UPY3BP2LVS7在本Boss失败。外部v0.111总受伤均26.04/251上传只作整战背景，不定固定周期或出牌顺序。

策略 `silent-brain-ceremonial-cry-output-versus-next-defense`；rk `silent-encounter-rk-ceremonial-cry-output-versus-next-defense`（combat_line描述tag）。新增，非同ID更新/逐字节复用/别名。独立自有支持1局、1次机会；formal_publication=pending，consumer_readback=pending。
适用信息：实际BEAST_CRY与无攻击意图、两张牌合法；本轮收益不外推下一轮安全。 外部幅度仅作整战背景；完整证据、分母、反例、原帧/回执/后继SHA保留在 `scratch/paired-candidates.json`。

## 分账与反向结果

| Boss | 版本 | 上传行/已知结局 | 延续代理 | 总受伤均值（HP） |
|---|---|---:|---:|---:|
| THE_INSATIABLE_BOSS | v0.107 | 527/527 | 446/527 | 25.97 |
| THE_INSATIABLE_BOSS | v0.108 | 138/138 | 121/138 | 24.77 |
| THE_INSATIABLE_BOSS | v0.109 | 114/114 | 99/114 | 24.43 |
| THE_INSATIABLE_BOSS | v0.110 | 71/71 | 60/71 | 24.24 |
| THE_INSATIABLE_BOSS | v0.111 | 338/338 | 303/338 | 25.45 |
| LAGAVULIN_MATRIARCH_BOSS | v0.107 | 393/393 | 319/393 | 23.12 |
| LAGAVULIN_MATRIARCH_BOSS | v0.108 | 88/88 | 69/88 | 25.72 |
| LAGAVULIN_MATRIARCH_BOSS | v0.109 | 82/82 | 62/82 | 23.32 |
| LAGAVULIN_MATRIARCH_BOSS | v0.110 | 61/61 | 50/61 | 23.84 |
| LAGAVULIN_MATRIARCH_BOSS | v0.111 | 257/257 | 216/257 | 24.35 |
| CEREMONIAL_BEAST_BOSS | v0.107 | 386/386 | 317/386 | 28.55 |
| CEREMONIAL_BEAST_BOSS | v0.108 | 69/69 | 61/69 | 25.45 |
| CEREMONIAL_BEAST_BOSS | v0.109 | 86/86 | 74/86 | 25.14 |
| CEREMONIAL_BEAST_BOSS | v0.110 | 55/55 | 45/55 | 28.58 |
| CEREMONIAL_BEAST_BOSS | v0.111 | 251/251 | 218/251 | 26.04 |

各版独立保留；机制是否变化未知，不补成“未改”。上表是Boss延续代理/记录总受伤，非真实单战胜率或净失血；分母单位上传行（玩家未知），未做因果推断或置信区间。外部每条原分簇/build交叉数据在 `scratch/external-matched-rows.json`。

| 自有A10，版本unknown | 重试层 | 独立局/已知 | 胜记录 | 净损有效n/均值 |
|---|---|---:|---:|---:|
| THE_INSATIABLE_BOSS | no_retry_evidence | 14/14 | 8 | 14/50.93 |
| THE_INSATIABLE_BOSS | retry_or_predicted_death | 66/66 | 49 | 32/37.41 |
| LAGAVULIN_MATRIARCH_BOSS | no_retry_evidence | 8/8 | 8 | 8/27.38 |
| LAGAVULIN_MATRIARCH_BOSS | retry_or_predicted_death | 60/60 | 46 | 40/28.93 |
| CEREMONIAL_BEAST_BOSS | no_retry_evidence | 4/4 | 4 | 4/39.75 |
| CEREMONIAL_BEAST_BOSS | retry_or_predicted_death | 56/56 | 45 | 44/33.86 |

自有各Boss内部去重；各Boss之间重叠不累加。其他进阶原样列 `scratch/own-summary.json`，不算A10验证。SL触及战的单次净损未知，不把最终赢局视为首试赢局；first_attempt_end仅预判截止代理。外部总受伤、自有首记录帧净损不是同一个指标，不能相减宣称模型误差或收益。

外部已通读的相近失败代表不是同Boss匹配对照：cluster0失败代表一幕为KIN；cluster3失败代表止于二幕千足虫；cluster5失败代表止于二幕ENTOMANCER。因此不把它们计作本Boss失败机会或因果反证。真正该Boss的自有失败/预判重试索引分别为KHECCYUJ7K48、173ARCPHRVSS、3UPY3BP2LVS7，仍非相同手牌反事实。

## 阅读范围、当前可得性和限制

- 外部仅经manifest核SHA的有界reader，一对一页、完整节点不截断：程序8对/16匿名代表；模型完整通读cluster0/3/5的3对6例，共245节点（147赢家节点、98失败节点），另5对只作位置筛查，未冒称全部通读。逐页SHA/匿名摘要见 `scratch/reading-coverage.json`。未读取终局遗物明细；终局牌组只核轨迹末态，不作触发。
- 本批没有声称完整流派剧本，没有读取自有完整四section；只读9局目标战帧索引、6原始当下窗口、实际动作回执及所选后继投影，完整路线/拿牌/计划仍未读。对局知识结论限定为6个局部情境，不推毒/刀流派语义或构筑模板。
- 真实手牌、费用、能力、敌人意图来自当前状态；结局只供事后核验。没有archetype trigger、未来牌组/胜负/SL层硬触发、固定必拿/必喝/杀序、安全血线或模拟收益。动作标签只描述需比较的线，不给HP/胜率数值信号。
- strategy仅fight_plan+幕+当前Boss筛选；更细的出牌窗口在正文写明。rk以敌人ID/当前move、合法手牌及实际动作限定。缺字段不匹配，数值未知不补零。

## 数量、验证与交付边界

- 真新增情境6；文字策略6、配对rk6及6个标签；更新0、逐字节复用0、别名0、knowledge剧本0。统计行不计条目。当前动作的独立样本达到100者0；v0.111整战背景上传分母达到100者3，不能替代6条动作样本。
- 正式发布0、正式经验消费者0、生产工具读回0、自然查询0、实际采用0、测得收益0；全为pending，科学父不关闭。
- 已用现有生产parseStrategyLibrary、validateReflexEntry、validateReflexVocab核6+6+词表，并用parseGameState/combatPredicateFacts核6个真实状态的当前条件及换敌负控；这只验证格式和当前条件，不是完整Plan、Jev回放或生产消费者读回。完整Plan回放、效果区间与正式消费者仍缺。
- tsx CLI因沙箱IPC管道EPERM未运行；使用node --import同一tsx loader的无IPC入口后校验通过。没有安装依赖；未跑tsc/vitest，结果tests保持null（本批无源码）。
- 发布后仍需原owner按既有发布锁、账本、消费者读回、自然采用/收益流程核验；本批不触发发布或下一单元。
- 服务档位、周额度与用量/耗时未获原生turn_context/请求回执核实，均不报告“已生效”；未修改启动配置或账户。

全部来源见 `scratch/source-ledger.json`；逐情境mapping见 `scratch/context-mapping.json`；数量见 `scratch/decision-output-counts.json`。

最终核验：HEAD保持dispatch_base，tracked diff为空；70条原始seek引用的SHA/506名单/流截止核验通过；gitleaks扫描约3.70 MB无泄露。报告末尾JSON与result.json字节一致。回执见 `scratch/final-verification.json`。

## 最终机器结果

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-221312-strategy-proposal",
  "base": "522197cfb8b29eea4d640032532731642a223a0d",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/report.md",
  "external_source": "issue51-boss-group-002-20261024-r56",
  "input_sha256": "792f465bc599754131cd0e15603d6a884f9ddc64f61310802c98488ca1f61a52",
  "external_results": [
    {
      "id": "external-boss-group-002-r56",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-insatiable-bite-block-and-weaken",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-insatiable-salivate-escape",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-matriarch-sleep-setup",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-matriarch-reduced-stats-block",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-ceremonial-plow-weaken-block",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-ceremonial-cry-output-versus-next-defense",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-encounter-rk-insatiable-bite-block-and-weaken",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-encounter-rk-insatiable-salivate-escape",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-encounter-rk-matriarch-sleep-setup",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-encounter-rk-matriarch-reduced-stats-block",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-encounter-rk-ceremonial-plow-weaken-block",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-encounter-rk-ceremonial-cry-output-versus-next-defense",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221312/learner/runs/20261024-221830-c8d35716-6b15-44d5-b35f-297e2d57303b-strategy-proposal/scratch/paired-candidates.json"
        }
      ],
      "reason": "已完成三种未覆盖Boss的6个新增情境及6对文字策略/rk候选；132冻结叶与11分片SHA通过，正式发布、生产读回和自然采用均为0，完整Plan回放待补。"
    }
  ],
  "own_support_runs": [
    "0CLP16ZR4ZZC",
    "1913SE84AXQF",
    "Q3R929GHT14R",
    "U1QYLX1AE1WX"
  ],
  "decision_output_counts": {
    "new_contexts": 6,
    "updated_contexts": 0,
    "byte_reused_contexts": 0,
    "aliases": 0,
    "strategy_candidates": 6,
    "rk_candidates": 6,
    "knowledge_candidates": 0,
    "statistic_rows_external": 15,
    "at_least_100_independent_action_samples": 0,
    "v0111_context_groups_at_least_100_uploads": 3,
    "formal_publications": 0,
    "production_tool_readbacks": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "measured_benefits": 0,
    "full_playbooks": 0
  },
  "reason": "已完成三种未覆盖Boss的6个新增情境及6对文字策略/rk候选；132冻结叶与11分片SHA通过，正式发布、生产读回和自然采用均为0，完整Plan回放待补。"
}
```
