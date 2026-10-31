# 刀流整局剧本：本批独立候选交付

完成时间：2026-10-24T18:37:58+08:00。批次 `20261024-181311-strategy-proposal`，仅处理 `external-whole-run-blade-003`，plan=`issue51-whole-run-blade-003-20261024`。旧刀009保持held，本批没有改请求、登记、旧失败或任何运行参数。

本批产出6个有区别的情境：真实新增2、沿已有知识更新4；交6条文字策略和6条窄条件rk描述tag。5个情境有配对，B3含两个rk分支仍只计一个更新情境。B1整局成型判断的combat_line动作证据不足，单列waiting。6+6是消费者投影数量，不能计作12条新增学习；不拆统计行、别名或泛句凑数。

## 身份、冻结与方法

- 已核learn.json本批external_source、worktree、runs=[]及external_binding；HEAD=`33733c9dd031d1c69be1985918a7001dca051fe8`等于dispatch_base。
- manifest 14116字节，SHA `453b5f28d9030a8c4b9fba8834308e2d609773c7e410e9d67fff292155f076d1`；work_spec 5134字节，SHA `b6d2fd46eb02706df44efb442714b5e9c78dbbc743c249fcc8446a7da393073f`。
- #54三份manifest与129个产物，共132叶全部原大小/SHA一致；另核冻结契约与506准入范围。原称132并非132个数据产物。input-verification.json共144项核验，不能误报144个#54叶。
- 11个只读冻结parquet逐片大小/SHA一致；仅内存DuckDB、threads=2、显式文件名单、先join506名单且off+len不越原六流截点。不读外部原库/玩家数据、不下载、不读未冻结新局、不复制状态全流。无共享logdb init/sync。
- 原始自有行只seek被引用窗口，保留stream/offset/bytes/SHA与原切点；242个当前使用窗口回读逐字节同。较早observed_ts配对跨了多张牌，初稿作为not-isolated保留；当前以执行decision.ts之前最近帧及其后首帧配对，81次均核同回合、原卡身份与出牌数+1。该检查不把伴随遗物/能力混入单卡效果。
- 固定源码、任务及正式知识均未改，git diff --binary为空。没有提交、main/live合并或行为发布；只有scratch。

## 实际阅读覆盖

外部代表只经manifest校验的有界reader，一对一页保留完整节点。已逐页通读簇6的10对/20条v0.111匿名代表：10赢家490节点、10败局282节点，共772节点；终局牌组、遗物、质量字段与完整节点都读。它们是投影摘要号，不是本系统局号。其他簇完整代表未读，未冒“全部外部数据已通读”。

自有完整通读9ZERN492CSHX四section：22 snapshots、5 fights、37 questions、9 plans；9R916WW0V65N四section：138、21、274、6，共512条投影。后者用无损逐记录changes视图减少重复字段；程序逐条重建后与55页原reader输出完全同值，全部439条被模型读完。保存程序全页与实际模型阅读分开记在coverage.json。其他六个同簇自有局只读聚合分层，506其余局仅准入索引，不算完整复盘。

原始行并非所有字段都通读：模型读完精准12、刀扇4、刀舞3、后空翻12、SHIV7次结果摘要，另抽核斗篷6、余像3；六条rk当前手牌/敌人/能力/牌文窗口均核。七份奖励原题额外读真实选项，缺失原生全prompt和完整Plan不补造。

## 剧本与反例

刀语义以真实牌文和执行为依据：普通刀舞添加3张SHIV，精准建立4点小刀增伤，刀扇建立小刀群伤并添4刀；不由簇号/名字预设。整局文字在scratch/playbook.md；逐段正式格式候选在strategy-candidates.json。

第一幕不将刀扇＋精准＋刀舞当必要成型组合：外部v0.111还原一致赢家仅25/101观察齐全，首幕齐全7/101；剩余不是自动失败。所选赢家中2局未终局保留精准、3局未保留刀舞；bd278赢家N40还移除了刀舞。代表是按胜负选择的10对，不能推总体胜率或固定排序。

第二幕并列功能、费用、防护与过牌。外部赢家首/次幕正block副本均8.09/9.63（各101，代理，不能设目标张数）。9R早期实际是免费打击/苦无/步法/余像等混合路径，刀扇F33、精准F36、刀舞F45才首次入组；早期计划的want不等已持牌。自有act_end_snapshots中首幕69血项实际是F17开战帧，战后42血另在真实轨迹，绝不作同口径幕末HP差值。

第三幕按实际已建能力与合法后继算兑现。9R F42机甲68→37且药用尽，F43制造机37→1，F44回血至23，F45斧头23→3，F46买三药、F47回25。F48首次预判必死后二次重载到第三试过，最终12血空药入F49女王＋火炬头，六试败。F48净损13是合并记录视图，不能当首试成本；药水重复恢复不记新获得。完整剧本是跨三幕候选叙述与投影阅读完成，尚缺同簇自有赢家及正式消费者/回放，不冒完整科学验收。

Boss只给本批当前状态足够的窄边界：实验体有无实体1时，三张群伤9刀各扣1而非共27；另核余像各1挡。NO_DRAW_POWER=1时后空翻不兑现抽2，但该步仍得牌面14挡及余像1挡。外部Boss延续/终止、前节点HP均只是代理，没有战斗时序，不编其他Boss的固定杀序、机制或安全血线。

## 逐情境处置与同产

|情境|处置|文字ID|rk候选/缺口|
|---|---|---|---|
|B1 当前刀源分工/成型复核|new|silent-brain-blade-flexible-formation-review|waiting：整局/拿牌判断无对应原combat_line动作，不能把簇统计当执行|
|B2 刀扇启动与产刀兑现|update旧fan经验|silent-fan-of-knives-capacity|fan-setup-test-subject|
|B3 精准已有刀与敌限伤|update旧accuracy/phantom经验|silent-accuracy-shiv-scaling|accuracy-held-shivs；intangible-shivs，两个分支只计一情境|
|B4 斗篷兼顾挡/刀但仍有缺口|update旧core经验|silent-core-shiv-defense-observation|cloak-mecha-defense|
|B5 余像已建后的生成/出牌分账|update旧afterimage经验|silent-afterimage-per-card-block|afterimage-generation|
|B6 抽牌锁下后空翻的实际用途|new|silent-brain-blade-no-draw-backflip-review|no-draw-backflip|

rk短名均以前缀silent-rk-blade-组成完整ID。每条“一句方向＋幅度＋独立局/机会＋适用范围”在真实strategy-candidates.json，完整数字、版本、SHA和反向结果在evidence-statistics.json。对应现行reflex-entry-v1、vocab、metrics在rk-draft.json；状态逐条在publication-status.json。paired_output_map.json同证据连接文字ID与rk ID/path。B1 waiting不阻B2—B6候选落盘。

同场景以dispatch HEAD的47条策略、245经验和既有rk核重，dedup-audit.json保留相关原行；原单牌拿牌前缀/版本统计不被此整局批覆盖，旧证据/分母未重计，逐字节复用0、别名0。外部“精准＋刀扇”63对终局匹配24/63 vs27/63，差-4.76pp、q=1；保留反向，不与旧单牌前缀方向强行合并。未发现需要覆写旧机制的反证；跨来源、版本和选择条件的效果关系保持unassessed。

## 样本、格式与交付门

- 外部簇6：v0.107 418局/155胜，v0.108 101/48，v0.109 75/30，v0.110 45/15，v0.111 272/103。逐版本核心/三牌时序/正反组合另存；机改比较未知，未合并任何版本。以上是上传记录，独立玩家未知。
- 自有unknown版本：A10无重试证据4局0胜，A10重试/预判必死3局0胜，A6重试1局0胜。A10/其他进阶、最终/首截止、SL/无重试分账；没有拿8局汇总当单一验证组。
- 达到“比较两组各至少100”的条目0。当前63对组合不足此门，只有赢家检查点/还原描述组101；不把101复用多表当新增局，也不将本流派候选改称合格单牌拿牌效应条目。小样本的当前机械事实仍可候选交付，不整批waiting。
- 6文字格式通过，6 rk draft格式通过；隔离候选知识目录由真实loader读入6条；六个原状态条件真实匹配。由于没有原Plan，六个完整谓词均unknown，不能报可执行动作/回放通过。合法原Plan数0、完整逐候选矩阵0、回放0、模型/Jev/MC调用0。
- format可消费6文字/6 rk；带合法原Plan和回放的可执行消费0。正式发布0、生产工具读回0、自然查询0、实际采用0、收益验证0。每条formal_publication=pending、consumer_readback=pending，科学父保持开放。
- 无源码批，tsc/vitest/cases均null；candidate-validation.json是离线格式与原状态条件核验，不替代生产消费者读回或完整测试。
- 本批没有新源码规则提案：code_proposals/implementation_domains/proposal_results/fixes=[]；merged=null。本批只交描述tag/备战比较与证据，不登记上线/关闭父，也不自行开下一单元。
- 原启动档位/服务速度只以原生回执为准，本会话未核原生turn_context，不报请求档位已采用，也未改账号/home/config/启动参数。使用量/耗时不自行估计；交宿主原记录。

## 继续沿原通道的缺口

1. B1成型判断先保留合法文字候选；需要真正拿牌/整局rk消费者时由原owner提供合同与原输入，不能转换统计预算为执行条目。
2. B2—B6须由原正式通道同批接文字/rk，核账本与发布锁，逐条生产工具读回。scratch隔离loader的6条仅格式消费，不代生产。
3. 出牌消费/比较需要冻结完整原Plan、同候选同种子原结果、模拟器SHA及留出局；现在仅有原状态与已执行chosen，禁止据此补造Plan或收益。
4. 新自然同流派自有赢家、版本字段、同口径幕末/入场资源仍缺；局部小样本不认证安全阈值。旧科学父/旧刀009不关闭。计数基线为冻结前驱4新增，本批2新增，未触发连续两批0新增停线。

全部路径和结论均由下方同一JSON回报。source-ledger.json仅本批scratch来源账本，未写共享学习账本或伪造shipped。

## 最终机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-181311-strategy-proposal",
  "base": "33733c9dd031d1c69be1985918a7001dca051fe8",
  "runs": [],
  "own_support_runs": [
    "9R916WW0V65N"
  ],
  "own_counterexample_runs": [
    "9ZERN492CSHX",
    "9R916WW0V65N"
  ],
  "source": "mixed",
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/report.md",
  "external_source": "issue51-whole-run-blade-003-20261024",
  "input_sha256": "453b5f28d9030a8c4b9fba8834308e2d609773c7e410e9d67fff292155f076d1",
  "reason": "已落盘6个情境（2新、4更新）、6条文字策略及6条rk描述tag候选；5个情境已候选配对，整局成型审查的rk局部waiting。原Plan/完整回放缺失，正式发布与消费者读回均pending，HEAD保持派发基线。",
  "external_results": [
    {
      "id": "external-whole-run-blade-003",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-whole-run-blade-003",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/playbook.md"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-blade-flexible-formation-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-blade-fan-setup-test-subject",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/rk-draft.json"
        }
      ],
      "reason": "已落盘6个情境（2新、4更新）、6条文字策略及6条rk描述tag候选；5个情境已候选配对，整局成型审查的rk局部waiting。原Plan/完整回放缺失，正式发布与消费者读回均pending，HEAD保持派发基线。"
    }
  ],
  "decision_output_counts": {
    "contexts": 6,
    "real_new_contexts": 2,
    "updated_existing_contexts": 4,
    "byte_identical_reuse": 0,
    "aliases": 0,
    "new_strategy_projection_ids": 6,
    "text_candidates": 6,
    "rk_candidates": 6,
    "paired_contexts": 5,
    "paired_candidates": 6,
    "rk_waiting_contexts": 1,
    "numeric_effect_rk": 0,
    "format_consumable_text_candidates": 6,
    "format_consumable_rk_candidates": 6,
    "executable_rk_with_original_plan_and_replay": 0,
    "comparison_groups_both_at_least_100": 0,
    "external_descriptive_winner_checkpoint_n": 101,
    "external_matched_comparison_n_each": 63,
    "formal_publications": 0,
    "production_consumer_readbacks": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "benefits_validated": 0,
    "scientific_parent_closed": false,
    "previous_batch_real_new_contexts": 4,
    "consecutive_zero_new_batches": 0
  },
  "coverage": {
    "frozen_package_leaves_verified": 132,
    "own_shards_verified": 11,
    "external_complete_trajectories": 20,
    "external_nodes": 772,
    "own_complete_projected_games": 2,
    "own_projected_records": 512,
    "own_raw_rows_verified": 242,
    "coverage_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/coverage.json"
  },
  "scenario_mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/scenario-mapping.json",
  "paired_output_map": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/paired_output_map.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-181311/learner/runs/20261024-181408-c699f2dc-5057-406c-90f0-e8f8dbf9c51f-strategy-proposal/scratch/source-ledger.json",
  "limitations": [
    "外部v0.111观察统计与自有unknown版本分账；版本机改未知，旧版本未合并。",
    "终局簇及还原牌组只作离线定位/代理；不作当前触发。自有簇6八局均败，缺同簇自有赢家。",
    "六条rk格式及原状态条件通过；缺原Plan/完整候选结果/留出回放，可执行消费数0，生产读回0。",
    "仅scratch候选；正式发布、自然查询、实际采用/收益及科学父保持开放。"
  ]
}
```
