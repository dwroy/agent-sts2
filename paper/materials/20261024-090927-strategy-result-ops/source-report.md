# 改进版单牌：25卡逐项重核

25卡已核：新增0、更新复用旧ID21、跳过4；每侧100门按真实单位分账，21卡有合格runs或offers比较，其中4卡有双方100独立上传局原格，其他宽代理合并局数未知；正式发布/读回/自然采用均0。连续两批新增0，本外部线不续派，停线通知待原ops经watcher转Roy；未改调度登记。

批次 `20261024-090927-strategy-proposal`；HEAD `6b013cb487ccdd5cf6fd3f439537ec9cb9851f8d`。learn.json 的 external_source、external_binding、manifest/work_spec 与全部冻结引用逐份字节/SHA核同；共27份冻结引用，输入台账见 input-ledger.json。

来源 external:sts2fun；下载/采集 2026-10-21；数据库 SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`。只读冻结聚合与合同，没有原库/逐玩家访问、下载、模型或游戏实验。许可未知的限制保留在每条外部证据。

## 方法与分母

五版本各自 cohort 分母为 v0.107=2932、v0.108=683、v0.109=583、v0.110=411、v0.111=1739；这些不是单卡比较分母，版本之间也不累加。冻结card-metadata-catalog只是存储索引，未提供逐牌机制改版对照，机制是否未改记unknown；没有以未知当未改合池。

先按同版本/同幕/同奖励前缀原格比较，存在双方各100独立上传局时优先用原格。否则先放宽为同幕双方共有的前缀张数集合，再必要时放宽跨幕的明确组合；只加互斥的选择记录、对应最终胜标签记录及后续Boss访问记录。版本内按范围/支持数选择，不按胜率方向或差值挑格；主文优先使用可用的最高版本。

**100门槛按真实统计单位报告**：21卡候选有双方各100以上的runs或offers比较；其中仅4卡在至少一个版本存在双方各100独立上传局的原格。其余17卡只过100选择记录门，不能称100独立局通过。即使是原格，拿/不拿两臂也可能同局重叠；独立上传局不证明独立玩家。宽代理合并独立局数一律null，另给严格上下界与各原格计数，既不相加成独立n，也不以边界代替实测分母。若正式准入要求100独立局，当前只有这4卡具备相应原格，其余候选的该门保持未建立。

宽代理的胜率是选择记录携带最终胜标签的比例，非独立局胜率；两臂前缀构成可能不同且跨幕混杂。只保留双方都存在的n10导出格，故结论只覆盖明确支持集；删除格未知不填0。presence格可能重叠，不合加；原格反向结果、低n结果和完整版本组成保留在 statistics.json，不将低n反例冒充本批合格比较。

奖励前缀是代理，不是完整当前牌组。当前卡/幕/已获取奖励前缀才是范围条件，最终胜与后续Boss访问只是未来结果标签。Boss访问指同幕或更晚幕到达机会，不代表Boss通过率、幕内准备度或收益。无聚类区间、无因果收益/固定拿牌命令。

## 候选、复用和逐卡处置

candidate_new=0，candidate_updated=21，candidate_reused=0（原样未改数），candidate_skipped=4；复用旧ID总数21，qualified_new_ids=[]。旧25候选、冻结main/live同场景已核；DEADLY_POISON沿已有正式同ID，其余沿旧scratch ID。旧证据完整保存在 preserved-prior-evidence.json，不以旧频率分歧或旧小样本作为新支持。跨版本/代理方向冲突保留，未转成本系统支持；runs=[]、confidence=0.25。

所有候选 formal_publication=pending、consumer_readback=pending。#27/#42策略schema及生产解析器通过，#28为战斗回放合同，本批未生产rk/战斗条目或开展回放。当前schema只可按题型/幕机器触发，奖励卡与前缀条件在正文；不把缺机器前缀谓词冒成已正确自然消费。

| 卡 | 处置 | 主统计 / 缺证理由 |
|---|---|---|
| ACCURACY | updated，旧ID `silent-brain-accuracy-external-prefix-context` | ACCURACY的拿牌观察关联偏正：v0.111拿60/140、不拿69/163最终胜，差+0.53个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕2前缀张数∈{7–13}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| POISONED_STAB | updated，旧ID `silent-brain-poisoned-stab-external-prefix-context` | POISONED_STAB的拿牌观察关联偏负：v0.111拿32/141、不拿244/869最终胜，差-5.38个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–4}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| INFINITE_BLADES | updated，旧ID `silent-brain-infinite-blades-external-prefix-context` | INFINITE_BLADES的拿牌观察关联偏正：v0.111拿82/234、不拿77/299最终胜，差+9.29个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–7}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| BUBBLE_BUBBLE | updated，旧ID `silent-brain-bubble-bubble-external-prefix-context` | BUBBLE_BUBBLE的拿牌观察关联偏正：v0.107拿43/133、不拿135/537最终胜，差+7.19个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{0–6}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| MALAISE | updated，旧ID `silent-brain-malaise-external-prefix-context` | MALAISE的拿牌观察关联偏正：v0.107拿50/116、不拿57/169最终胜，差+9.38个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{4–8}；幕2前缀张数∈{11–12}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| PHANTOM_BLADES | updated，旧ID `silent-brain-phantom-blades-external-prefix-context` | PHANTOM_BLADES的拿牌观察关联偏正：v0.111拿84/209、不拿79/287最终胜，差+12.67个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–7}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| MIRAGE | skipped，旧ID `silent-brain-mirage-external-prefix-context` | v0.107:43/272 offers；v0.108:无双方共有保留格；v0.109:10/14 offers；v0.110:无双方共有保留格；v0.111:36/166 offers。放宽仍无每侧100记录组；缺失格非0，不补池/补局。 |
| BLADE_OF_INK | updated，旧ID `silent-brain-blade-of-ink-external-prefix-context` | BLADE_OF_INK的拿牌观察关联偏正：v0.107拿82/193、不拿61/159最终胜，差+4.12个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{5–8}；幕2前缀张数∈{11–14}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| SKEWER | skipped，旧ID `silent-brain-skewer-external-prefix-context` | v0.107:63/380 offers；v0.108:无双方共有保留格；v0.109:无双方共有保留格；v0.110:无双方共有保留格；v0.111:20/87 offers。放宽仍无每侧100记录组；缺失格非0，不补池/补局。 |
| BLUR | updated，旧ID `silent-brain-blur-external-prefix-context` | BLUR的拿牌观察关联偏负：v0.111拿36/139、不拿67/255最终胜，差-0.38个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–6}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| BOUNCING_FLASK | updated，旧ID `silent-brain-bouncing-flask-external-prefix-context` | BOUNCING_FLASK的拿牌观察关联偏正：v0.111拿35/121、不拿69/245最终胜，差+0.76个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–5}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| KNIFE_TRAP | updated，旧ID `silent-brain-knife-trap-external-prefix-context` | KNIFE_TRAP的拿牌观察关联偏正：v0.107拿60/117、不拿90/219最终胜，差+10.19个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{4–8}；幕2前缀张数∈{11,13–14}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| HAZE | updated，旧ID `silent-brain-haze-external-prefix-context` | HAZE的拿牌观察关联偏负：v0.107拿48/205、不拿140/523最终胜，差-3.35个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{0–7}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| LEADING_STRIKE | updated，旧ID `silent-brain-leading-strike-external-prefix-context` | LEADING_STRIKE的拿牌观察关联偏正：v0.111拿190/567、不拿218/699最终胜，差+2.32个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–7}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| NOXIOUS_FUMES | updated，旧ID `silent-brain-noxious-fumes-external-prefix-context` | NOXIOUS_FUMES的拿牌观察关联偏负：v0.111拿77/245、不拿75/206最终胜，差-4.98个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–7}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| WELL_LAID_PLANS | updated，旧ID `silent-brain-well-laid-plans-external-prefix-context` | WELL_LAID_PLANS的拿牌观察关联偏正：v0.107拿129/404、不拿125/472最终胜，差+5.45个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{0–7}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| DEADLY_POISON | updated，旧ID `silent-brain-act1-deadly-poison-prefix-context` | DEADLY_POISON的拿牌观察关联偏负：v0.111拿66/257、不拿309/949最终胜，差-6.88个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–6}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| ACCELERANT | updated，旧ID `silent-brain-accelerant-external-prefix-context` | ACCELERANT的拿牌观察关联偏负：v0.111拿37/119、不拿148/452最终胜，差-1.65个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{2–6}；幕2前缀张数∈{9–11}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| BURST | updated，旧ID `silent-brain-burst-external-prefix-context` | BURST的拿牌观察关联偏负：v0.107拿34/103、不拿104/228最终胜，差-12.60个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{4–8}；幕2前缀张数∈{13–14}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| SUCKER_PUNCH | updated，旧ID `silent-brain-sucker-punch-external-prefix-context` | SUCKER_PUNCH的拿牌观察关联偏正：v0.107拿63/246、不拿427/1724最终胜，差+0.84个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{0–5}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| ABRASIVE | updated，旧ID `silent-brain-abrasive-external-prefix-context` | ABRASIVE的拿牌观察关联偏负：v0.107拿87/209、不拿80/165最终胜，差-6.86个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.107奖励出现此卡，幕1前缀张数∈{5–9}；幕2前缀张数∈{11–14}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| SHADOWMELD | skipped，旧ID `silent-brain-shadowmeld-external-prefix-context` | v0.107:79/168 offers；v0.108:无双方共有保留格；v0.109:无双方共有保留格；v0.110:无双方共有保留格；v0.111:13/33 offers。放宽仍无每侧100记录组；缺失格非0，不补池/补局。 |
| OUTBREAK | skipped，旧ID `silent-brain-outbreak-external-prefix-context` | v0.107:92/755 offers；v0.108:无双方共有保留格；v0.109:无双方共有保留格；v0.110:无双方共有保留格；v0.111:46/71 offers。放宽仍无每侧100记录组；缺失格非0，不补池/补局。 |
| BACKFLIP | updated，旧ID `silent-brain-backflip-external-prefix-context` | BACKFLIP的拿牌观察关联偏正：v0.111拿56/126、不拿58/138最终胜，差+2.42个百分点；样本单位为独立上传局（两臂可重叠）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕2、已拿奖励前缀含LEADING_STRIKE（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |
| DAGGER_SPRAY | updated，旧ID `silent-brain-dagger-spray-external-prefix-context` | DAGGER_SPRAY的拿牌观察关联偏负：v0.111拿69/262、不拿231/860最终胜，差-0.52个百分点；样本单位为选择记录（重复局；合并独立局数未知）。<br>范围：仅Silent A10/v0.111奖励出现此卡，幕1前缀张数∈{0–5}（奖励获取前缀代理）。观察非因果，不能视为完整牌组、固定拿牌命令或外推到其他版本；反向/小样本见证据附件。 |

## 去向与停点

唯一unit external-improved-card-contexts-001=processed：21个真实scratch去向见下方完整JSON；4张卡局部跳过不使整个unit等待。merged-into只指旧ID候选改进，不代表Git合并。未新增正式知识、源码、学习登记或版本；实际发布0、消费者读回0、自然采用0，科学父仍开放。

冻结基线连续0为1，本批真实新增0，现连续0为2。**本会话停本外部线，不再派批、不扩大范围、不恢复旧Boss任务。** supervisor-notice.json交原ops核结果后执行宿主停线并经watcher告Roy；未写调度状态、未代填其他角色ACK，也没有将草稿通知称已送达。其他学习及Roy STOP保持独立。

固定统计重算、全部冻结SHA复核、schema与生产parseStrategyLibrary通过；未改源码，因此tsc/vitest/cases=null。生产解析只是格式检查，不是消费者读回。HEAD保持dispatch_base，git diff --binary为空。原生模型档位、服务档位/用量/耗时本会话未核原回执，不以请求或启动参数回填。

## 规范任务回执

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261024-090927-strategy-proposal",
  "base": "6b013cb487ccdd5cf6fd3f439537ec9cb9851f8d",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/report.md",
  "external_source": "issue51-improved-card-picks-007",
  "input_sha256": "cce019af6fb764248d83098d4e629d735db4ea9be7defa371aed5f9ab8e0c5df",
  "reason": "25卡已核：新增0、更新复用旧ID21、跳过4；每侧100门按真实单位分账，21卡有合格runs或offers比较，其中4卡有双方100独立上传局原格，其他宽代理合并局数未知；正式发布/读回/自然采用均0。连续两批新增0，本外部线不续派，停线通知待原ops经watcher转Roy；未改调度登记。",
  "counts": {
    "cards_total": 25,
    "candidate_new": 0,
    "candidate_updated": 21,
    "candidate_reused": 0,
    "candidate_skipped": 4,
    "reused_ids_total": 21,
    "cards_reaching_100_in_reported_unit": 21,
    "cards_with_exact_100_independent_uploaded_runs_per_arm": 4,
    "strict_100_run_cards": [
      "LEADING_STRIKE",
      "DEADLY_POISON",
      "BACKFLIP",
      "DAGGER_SPRAY"
    ],
    "qualified_new_ids": [],
    "actual_published": 0,
    "consumer_readbacks": 0,
    "natural_adoptions": 0
  },
  "artifacts": {
    "dispositions": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/dispositions.json",
    "statistics": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/statistics.json",
    "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/input-ledger.json",
    "validation": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/validation.json",
    "supervisor_notice": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/supervisor-notice.json"
  },
  "zero_guard": {
    "previous_consecutive_zero": 1,
    "current_consecutive_zero": 2,
    "stop_external_line": true,
    "next_batch_dispatched": false,
    "scheduler_changed": false,
    "supervisor_delivery": "pending"
  },
  "external_results": [
    {
      "id": "external-improved-card-contexts-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "merged-into",
          "id": "silent-brain-accuracy-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-poisoned-stab-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-infinite-blades-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-bubble-bubble-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-malaise-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-phantom-blades-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-blade-of-ink-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-blur-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-bouncing-flask-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-knife-trap-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-haze-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-leading-strike-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-noxious-fumes-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-well-laid-plans-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-act1-deadly-poison-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-accelerant-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-burst-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-sucker-punch-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-abrasive-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-backflip-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-dagger-spray-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-090927/learner/runs/20261024-090959-1da4150d-ce5c-4da9-8574-9cadc5269339-strategy-proposal/candidates.json"
        }
      ],
      "reason": "21条同ID改进候选已落scratch；五版本分别重算，缺机制对照不合池。MIRAGE/SKEWER/SHADOWMELD/OUTBREAK放宽后仍不足每侧100记录，逐卡及版本分母见dispositions.json；所有正式发布与消费者读回pending。merged-into仅表示scratch复用旧ID，非main/live合并。"
    }
  ]
}
```
