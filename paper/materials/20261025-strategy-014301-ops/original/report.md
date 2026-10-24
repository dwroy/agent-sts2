# events_003 三事件候选交付

本批 `20261025-014301-strategy-proposal`，外部计划 `issue51-remaining-events-003-20261024-r56-stock`。按6385924090只处理 `INFESTED_AUTOMATON`、`BATTLEWORN_DUMMY`、`BYRDONIS_NEST`。新增 **5个不同情境、5条文字策略、5个配对rk研究候选**；同ID更新、逐字节复用、别名各0。文字情境达到5～10目标；**正式可加载rk为0**，5个事件条件/消费者子项仍waiting。候选完成不代表科学父完成，不自行派下一单元。

## 身份、输入与权限

- learn.json本批 `external_source`、external_binding、manifest/work_spec SHA、candidate_mode.merge=no、工作树和实际HEAD均核同。HEAD持续为 `6fca07a41446bda2acec25b61ab42af437ba5df1`；未提交、合并或写main/live、正式库、共享统计/账本/请求。`source_commit=null`。固定源码差异见scratch/baseline.diff（0字节）。
- input manifest：12298字节，SHA `7050c77dad45b18f5095dfead90fd365cb20e07f909febda0854ae9469bb0099`；work_spec：5190字节，SHA `b5eb735c62a93738c5b2d40d39d7a4e3ba4fe315312761743a6c26f8588e9030`。精确恢复缺少的Git材料，未因稀疏工作树缺文件而判缺证。
- #54三份manifest及其129个叶文件全部核字节/SHA；合计132份。11个授权只读冻结parquet全部核大小/SHA，以字节为准不以nlink判坏。详scratch/input-verification.json、own-shard-verification.json。
- 冻结506局名单先过滤；DuckDB仅内存、threads=2、显式11片名单，不init/sync共享logdb。全部452次原始行seek留offset/bytes/SHA并逐项核原六流切点；未扫描/复制17GB状态流。原始行引用索引为scratch/raw-refs.json；其中重复引用去重，不增加独立样本。
- 无联网/下载、外部原库/玩家标识读取、模型/MC/Jev/游戏/full/tick/两臂/A-B。外部只读脱敏聚合及有界代表reader。任务启动参数和learn.external_policy不是原生已采用档位；此处未核原生tier/model/effort回执，不报告生效档位、使用量或推算耗时。未改启动参数、账号、home/config或权限。

## 五个情境与处置

每条策略采用现有 `brain-strategies-v1` 的event+幕号触发，正文写具体事件/当前条件，不扩event_id trigger或绑定事后簇。同一事件内两条情境分别是“输出可行性/奖励机会成本”和“即时生命/延后孵化”，不是把同一句话拆开凑数。逐项mapping见scratch/mapping.json，正文与证据在scratch/strategy-candidates.json。

| 情境 | 当前条件→做法 | 幅度与样本 | 处置 |
|---|---|---|---|
| automaton-random-pools | 当前机械两菜单原文相符→比较随机能力/随机0费池，拿到真实牌面后重评，不预支指定成长 | 自有39局39机会均只加1牌且HP当下不变；36学习/3触核，A10共37局 | 新文字1；rk研究1 |
| dummy-three-turn-feasibility | 当前只支持低档输出、高档未知→先核3回合期限，再保留75目标，不为奖励直接升档 | 75/150/300；第1档自有27/31通过、4失败；A10 25/29，A4/A6各1通过 | 新文字1；rk研究1 |
| dummy-random-upgrades-tradeoff | 另有当前150输出依据且需要升级→再比较第2档随机两升级与第1档药水 | A9 1机会通过，实际打击/防御各升1；A10 1机会失败，分账不合成成功率 | 新文字1；rk研究1 |
| nest-immediate-health | 当前需要下一段即时生命→比较吃蛋；满血也不把收益写成0 | 吃蛋31局31机会当前/最大HP各+7；A10 29、A4/A7各1；满血70/70→77/77 | 新文字1；rk研究1 |
| nest-hatching-opportunity | 当前考虑带蛋且有已知可达营火→比较孵化与休息/锻造需求，不把蛋预先当可用攻击 | 3局3取得机会HP不变；3次营火HATCH完成、蛋移除、取得异鸟宝宝与0费14伤异鸟扑击 | 新文字1；rk研究1 |

每条保留 `formal_publication=pending`、`consumer_readback=pending`、source=mixed、confidence=0.45及来源账本。该置信度不是因样本大自动提高的。第1/4/5条来源一致性留unassessed；第2/3条显式保留反证并标conflict。对最低档/高档“必过”的反例不被删掉；反证针对安全/收益外推，不否认原菜单数值。

## 外部统计与反向结果

来源统一 `external:sts2fun`，公开地址 `https://sts2.fun/static/sts2_public.db.zst`，下载/采集2026-10-21，数据库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`；实际统计输入SHA `4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d`。6348条冻结上传记录的版本总分母分别2932/683/583/411/1739（v0.107～v0.111），不是本事件机会分母。筛选Silent/A10/单人/有效/非弃局/无modifier；统计不按终局簇筛。玩家独立性与玩家数未知，不能称已核独立玩家样本。

原51个事件cell逐build写在scratch/external-event-rows.json和source-ledger.json；没有把跨选项/重叠cell累加为局数。全体实际提供事件选项机会未知，外部title记录不构成未选对照。版本机制改动对照缺失，因此v0.107.0/.1等build也逐项保留，不声称机制未改、不跨版本合并。

| v0.111事件 | 选项上传局分母/整局赢家 | 描述关联与限制 |
|---|---|---|
| 自动机械 | 学习101/39；触核19/8 | 触核42.11%与学习38.61%，高3.49个百分点；非选择收益。v0.109.0触核0/9、学习11/24反向，v0.109.1又反向。 |
| 假人 | 第1档17/10；第2档100/62；第3档5/2 | 第2档整局胜率高第1档3.18个百分点；非本事件通过率。v0.107.0第2档22/38、第1档10/14方向相反。 |
| 异鸟巢 | 吃蛋100/29；带蛋22/7 | 吃蛋整局胜率低2.82个百分点；v0.107.0吃蛋13/45、带蛋1/12方向相反。不能由此抹去即时+7事实，或保证孵化提高胜率。 |

有3个v0.111独立cell各达到n≥100（学习、第2档、吃蛋），**双臂均≥100的比较为0**；本批不是单牌比较批，不把这些cell门槛冒成5条策略全有百局对照。节点HP变化仅代理：吃蛋组前节点末45.48→当前节点末52.53，差均值+7.05；不将其写成纯事件治疗、当前入场HP或安全阈值。全文只写观察方向/实际菜单及本系统后继变化，不写因果提升、固定拿牌顺序。

公开FAQ未找到明确数据集再分发许可：只保存署名聚合与授权匿名有界派生页，不再分发原库，不补玩家标识。各结论的版本、日期、SHA、原分母、限制、反向结果均见source-ledger，且每条策略有evidence定位。

## 自有补证与信息时点

95个独立本系统局有106个独立事件机会：机械39、假人33、巢34；跨事件同局不重复称106局。初始同层决策预筛786行，其中116条event/choose有界seek，指纹严格匹配后106条，另10条相邻事件排除；没有将其变成本批主题。每个初始选择均核completed回执、对应原状态指纹与第一后继；假人另核33个最终事件页，3个孵化另核rest/plan完成及营火前后状态。

自有游戏版本全unknown，A10与其他进阶、no_retry_evidence与retry_or_predicted_death分别保留：

| 事件 | A10无重试证据 | A10重试/预判必死证据 | 其他进阶 |
|---|---|---|---|
| 机械 | 4局，均学习；终局1胜3败 | 33局：学习30、触核3，终局均败 | A0/A6各1学习，均有重试证据、终局败 |
| 假人 | 5局第1档，事件4过1败；终局1胜4败 | 第1档24局事件21过3败、第2档1局事件败；终局第1档1胜23败、第2档败 | A4/A6各1第1档通过；A9 1第2档通过且最终胜，均有重试证据 |
| 巢 | 吃蛋9、带蛋1，最终均败 | 吃蛋20、带蛋2，最终均败 | A4吃蛋1最终败（有重试证据）；A7吃蛋1最终胜（无重试证据） |

“无重试证据”不证明没有SL；重试/预判必死局的最终胜负不是首试胜率。假人结果由明确的最终事件页“通过训练/羞辱”判定，不从整局胜负或最后一张未死敌人帧猜。A9成功不冒A10验证，第3档自有0机会。原Z2手动、KF9缺末态、BP9和后续局排除，原六流切点保持。

机械学习实际观察7种奖励ID，触核3次实际为SIDESTEP/PRECISE_CUT/BACKSTAB，面板0费；这不是完整随机池分布。机械获取后无需当下HP成本的观察不证明以后施放无成本或必补短板。蛋孵化3次独立完成，产物牌文/遗物正文有原件；未核宝宝整场效果/收益，不从预训练补机制。

当前触发只用当前题型、幕与正文条件：已持牌、当前菜单、当前路线/营火需求及当前可得输出依据；未来孵化结果、终局牌组、胜负、统计簇号均仅作证据/结果，不作决策时条件。“支持150”的条件本批不捏造可计算DPR或安全HP阈值；实际缺这个依据时保持未知。

## 代表轨迹、去重及覆盖

所有外部代表只经 `eval/sts2fun_build_view.py` 的核manifest有界reader读取，limit=1对/页、≤32768字节、完整节点不截断。程序定位v0.111的80对；模型实际完整读了c0/pair2、pair7、pair8三对（3赢家+3失败、263节点），其余77对只程序定位，未声称模型通读。reader全部页/各页SHA、模型阅读标记在scratch/external-pages-index.json。

pair8赢家在巢节点4记录HP41→48/max70→77，在假人节点46第2档两回合、记录升级防御和后空翻；相近失败例节点41第2档3回合无升级记录，最终死于后续精英，事件通过与否在外部投影未知。pair2失败例节点20机械取得INFINITE_BLADES，后续仍败；pair7赢家节点21取得ANTICIPATE，但终局128张ABUNDANCE、取得日期覆盖仅9.52%，不把异常终局/赢家例当标准模板或卡池/胜率证据。代表页原本就缺事件完整选项，不从中补造未选项或当前完整牌组。

模型通读代表完整节点不等于所有全字段真快照。自有模型读了106机会的选项/变化/分层摘要、三菜单全文及选定原题/前后页；没有逐字通读全部原生prompt或自有完整局四section。**本批不声称完整流派剧本**，未启动毒/刀或旧Boss主题。

冻结#27/#28/#42及#55合同已核；正式strategy/experience/reflex/common库按SHA和事件语义去重，三个事件无同场景旧ID。BYRDONIS精英不是异鸟巢事件；已有 `silent-brain-relic-whetstone-eligible-attack-pool` 是商店磨刀石随机攻击升级，假人具有不同当前菜单、战斗期限和代价，保留相关引用但不当复用或新增旧成果。排除已发布六事件和旧失败002预留六事件；没有更改旧processed/failed/rc0，也没把旧失败当学成。详scratch/dedup.json及coverage.json。

## 交付、缺口与核验

- 文字候选：scratch/strategy-candidates.json，5条，各520～613 UTF-8字节，均以真实#42外部证据和本系统证据分账。现有生产parseStrategyLibrary实际通过5条；仅格式校验，未运行匹配题回放/工具消费者，未发布。
- rk候选：scratch/rk-candidates.json，5条配对研究内容，**不是可加载reflex-entry-v1**。原格式applies_to只有combat_line/card_pick/potion/rest/shop；本轮是事件菜单条件，缺事件身份/选项/期限与资源条件的正式谓词/消费映射。即使正文谈营火，其原事件条件也不能借rest标签绕过。逐条predicate/signal=null、正式消费者waiting；未来独立rest场景是否可映射由原owner按证据另核，不冒“所有休息都没消费者”。
- knowledge/剧本：仅来源账本与情境证据附件，无正式knowledge条目、完整剧本消费者或读回。#28无真实capture/逐候选结果矩阵/两臂回放，本批不触碰开关或A/B。文字格式通过不补这些缺口。
- ledger为本批scratch/source-ledger.json，未写共享学习账本；正式登记/原发布锁/消费者读回/自然查询/实际采用/收益均pending，正式发布数0，科学父保持。merge=no优先于通用“自测后上线”流程，交原owner沿授权发布线处理。
- 证据审计全部通过：132输入份、11片、452原始seek逐SHA/截止、106初始+3孵化completed、33假人终页、5条策略解析、HEAD及tracked diff空。详scratch/evidence-audit.json。未改源码，因此tsc/vitest/cases=null；不运行full、不安装依赖。
- 过程限制：首次脚本fetchdf因环境无numpy失败，改为原DuckDB fetchall，不安装依赖；tsx CLI因沙箱IPC EPERM失败，改现有node --import loader调用同一parser后通过。这些不是游戏失败或已完成生产回放。
- 本批真实新增5，不触发连续两批新增0停产条件；只引用work_spec predecessor的4新/1更，不推造其他批次零计数或自行扩批。

下列唯一result.json原字节同时嵌入本报告并作为最终回复。外部调度runs=[]，本系统95个支持/对照局另列own_support_runs；source=mixed的结论没有计作纯外部或本系统百局验证。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261025-014301-strategy-proposal",
  "base": "6fca07a41446bda2acec25b61ab42af437ba5df1",
  "runs": [],
  "own_support_runs": [
    "0B2567HG3T4D",
    "0CLP16ZR4ZZC",
    "0DJ6GFZZ0TG9",
    "1303HVDLVMGR",
    "16UDD0430SXT",
    "1913SE84AXQF",
    "32VSST9UX7MN",
    "4H1T5UB23GEP",
    "4U3WNL3JRRCX",
    "4Y94N8RDPGPM",
    "5BU7ZE1PWLSX",
    "5PM6JAQG6FNQ",
    "6ANZJ6XRKV4P",
    "79421JK2WBA9",
    "7S8HCC0M6G9W",
    "833ZM0MJGWHC",
    "8FP19V1W4SRQ",
    "8XVMBYRD8R8D",
    "9YBKCNBFP0X5",
    "AD3QSC3P41JU",
    "ARKQLHG6RS4W",
    "BJLTVSYXCSGS",
    "C6Z8ATNBNHZ7",
    "C7LERZPCRFZ1",
    "CVJ4MLQF4CSY",
    "D9XJAX5KCSU2",
    "DC32RW0A80V1",
    "DUB5VQQ6D6D1",
    "DXF5L8WH8X12",
    "E6DYYXRX7GVE",
    "EEVP0QTLMSX9",
    "ENKYQMS9W4ZD",
    "FGKZALWSTQQ1",
    "G403VCZ3BH1B",
    "GWE810ZD014M",
    "GXNKW8X1XYJP",
    "H9ERYJLBL4UC",
    "HSX4HYATB4E2",
    "HUM35281S668",
    "J8PHG72DGD90",
    "JBX9JLH46KVN",
    "JH49PP3EYJH8",
    "JKDUL0AL0TW6",
    "JLZCE665J9LD",
    "JWJLSQXDKUA2",
    "JYTQSFJ96MG2",
    "KDBWARERSGYW",
    "KUHYZBFFLALU",
    "KV0JHNJCKXLS",
    "KYJMB7ELM6FN",
    "L6745E2ND5CT",
    "LS8035TB32P3",
    "LY83ZMTFVKJH",
    "MRJ4E5HL3ZA9",
    "MWQ1RY3E14ZT",
    "NBJBVSBNPYQB",
    "NEPESJXEV9V3",
    "NG1FBJTSRLHS",
    "NGP83Z1W5GYR",
    "P33MKRP6S4Q4",
    "P5HT1272P5SB",
    "PYE4VXNSLGSS",
    "Q10YYQ5DUPJA",
    "QHK1XQ928TTM",
    "QNTW139MGECA",
    "R0HEV5E3QT6G",
    "R3AJCGQGGMR4",
    "RC61MFQM63Y6",
    "REEBQHPHSWGK",
    "RMNXHZKV716Y",
    "SPC7NVA5K4RL",
    "SV2GP9NX4HQD",
    "SVK97F9E4N56",
    "SWXESN56U1QJ",
    "T15WXHPTM0ET",
    "T4PL60Z0DZV3",
    "TDLBRNA0R05B",
    "TU3XB4CAEDAW",
    "TXZ6RVMQA09D",
    "UJ0K3G10609Y",
    "UZ1T7AH49WMB",
    "V3PJA3FV92BG",
    "VAC6Z1PZ1QJG",
    "VNSXWCWXR3VW",
    "WCDTYJKUDS4T",
    "WJ0LTVSSDY61",
    "WQB3YYNTRB2L",
    "XL4ENZG3N7Y3",
    "XW8B5CHJ814J",
    "Y0EMJR6MKWYW",
    "Y8GDTNWG4R3X",
    "YF0LXT1QSTGG",
    "YUWMCVH6MFUH",
    "YXY2RL1E83HM",
    "ZVYUL2YP3518"
  ],
  "fixes": [],
  "merged": null,
  "source_commit": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "reason": "三个固定事件已处理：新增5个不同情境文字候选及5个配对rk研究候选；rk均不可加载，缺正式事件谓词/消费者。正式发布、消费者读回与自然采用均未完成。HEAD保持dispatch_base。",
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-014301/learner/runs/20261025-014408-67b768ca-2220-48c1-a414-61df93f6ddd7-strategy-proposal/report.md",
  "external_source": "issue51-remaining-events-003-20261024-r56-stock",
  "input_sha256": "7050c77dad45b18f5095dfead90fd365cb20e07f909febda0854ae9469bb0099",
  "external_results": [
    {
      "id": "external-remaining-events-003-r56-stock",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-events003-strategy-candidates",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-014301/learner/runs/20261025-014408-67b768ca-2220-48c1-a414-61df93f6ddd7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-events003-rk-candidates",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-014301/learner/runs/20261025-014408-67b768ca-2220-48c1-a414-61df93f6ddd7-strategy-proposal/scratch/rk-candidates.json"
        }
      ],
      "reason": "INFESTED_AUTOMATON 1情境、BATTLEWORN_DUMMY 2情境、BYRDONIS_NEST 2情境已落盘；复用/更新0。外部51统计行逐build分账，自有95独立局106机会另账。rk五项均research_only_waiting_consumer，不能作正式reflex发布或已消费。"
    }
  ],
  "decision_output_counts": {
    "distinct_new_contexts": 5,
    "new_strategy_entries": 5,
    "same_id_updates": 0,
    "byte_reuses": 0,
    "aliases": 0,
    "rk_research_candidates": 5,
    "production_loadable_rk_entries": 0,
    "external_statistics_rows": 51,
    "v0111_unique_cells_with_n_ge_100": 3,
    "comparisons_with_both_arms_n_ge_100": 0,
    "own_event_comparison_arms_n_ge_100": 0,
    "formal_published": 0,
    "consumer_readback": 0,
    "natural_queries": 0,
    "actual_adoption": 0,
    "benefit_verified": 0,
    "target_min": 5,
    "target_max": 10,
    "target_met_for_text_contexts": true,
    "paired_research_rk_delivered": true,
    "paired_formal_rk_complete": false
  },
  "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-014301/learner/runs/20261025-014408-67b768ca-2220-48c1-a414-61df93f6ddd7-strategy-proposal/scratch/mapping.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-014301/learner/runs/20261025-014408-67b768ca-2220-48c1-a414-61df93f6ddd7-strategy-proposal/scratch/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-014301/learner/runs/20261025-014408-67b768ca-2220-48c1-a414-61df93f6ddd7-strategy-proposal/scratch/source-ledger.json"
}
```
