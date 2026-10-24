# events_004：三个冻结事件的局部候选

批次 `20261025-004302-strategy-proposal`；base `ebe5bfc38d80694f6ec5a4f2e0c8ebf0bb2c3bf5`；merge=no。仅本批scratch产物，HEAD不变，无源码/正式知识/共享统计/账本/调度状态写入。

6个新增情境、0更新、0逐字节复用、6对应rk研究意图、0可加载rk；OROBAS局部waiting。达到每单元5～10个独立情境目标；不是完整剧本。正式发布/生产读回/自然查询/采用均0，收益未知，科学父保持开放。

## 身份、范围与验证

learn.json本批external_source、external_binding、candidate_mode merge=no/worktree/dispatch_base与宿主一致；input manifest `be116277d4bc5cc5a9de5ff7332bc7132784edec343fb277ef69e28c5a2a6ba9`，work_spec SHA `f7d6f5eb61b8c8cb257b2ab1c97c8f285b2fdf6cc8dfb9dbd2108d69273e0f4a`，均先核字节/SHA再读。
固定OROBAS/ABYSSAL_BATHS/SELF_HELP_BOOK与003、已发布六事件、失败002预留前六互斥。三manifest加129数据叶、共132冻结文件全SHA核同（input-verification.json），11个授权parquet全字节/SHA核同；仅:memory: DuckDB/threads=2，显式分片名单、先JOIN该506 run allowlist并限制off+len<=原切点，未init/sync/扫描外部数据库。
只用freeze包与本worktree base正式库去重（114策略/245经验/160rk，dedup-audit.json均无同场景命中）；未读旧候选作新证据。冻结#27/#42 brain-strategies与#28来源/回放合同和#55策略检索合同已核。仅题型/幕trigger；事件ID/选项语义须在正文核对，未扩schema/未绑定archetype几何。

## 六个情境

### 1. bath_initial

浴场初页先比较当前回血缺口与换最大HP的即时余量；缺血时把敬而远之作为实质备选，再决定是否换上限。 当前题面回血10；本批4次回血均HP+10/上限不变，2次投身均HP−1/上限+2（题面伤害3，不能将伤害3直接当净HP变化）。 样本：自有A10/no_retry_evidence 6独立局/6初页机会；实选回血4、投身2。外部v0.111.0分别29/96与1/17整局赢家，差24.33pp，非回血因果收益。
适用范围：仅第一幕ABYSSAL_BATHS初页，当前原题确有“+2最大HP/受3伤”和“回复10”；不承诺其他版本/遗物下净值，不设生存HP阈值。
反例/缺口：两个无重试证据局仍选择投身；全部6局最终失败，不能用回血或换上限推定胜负。外部赢家选择与进入资源混杂。

文字策略在strategy-candidates.json；对应rk-candidates.json为不可加载研究候选，正式发布和消费者读回均pending。

### 2. bath_continue

浴场已入水后，每次沉溺重新比较这一次的递增代价与离开；保留离开备选，不把初页回血带入后续。 两个原生序列继续项受伤4→5→6（另一局再至7），每次题面仍+2上限；实际继续净HP−2/−3/−4，离开2次均HP和上限不变。 样本：自有A10/no_retry_evidence 2独立局/7继续页决策，5继续+2离开；外部v0.111.0沉溺55选择次数来自17上传局，离开17次/17局，不是72独立局。
适用范围：仅第一幕ABYSSAL_BATHS已入水的ALL页；以当前选项代价和实际HP为准；不把这两局停止处写为通用安全阈值。
反例/缺口：0DJ在题面受6伤处退出，GWE先接受受6伤、到受7伤处退出；反对固定沉溺次数。2局均败，不支持长期收益。

文字策略在strategy-candidates.json；对应rk-candidates.json为不可加载研究候选，正式发布和消费者读回均pending。

### 3. book_attack

自助指南能给已持有的多段攻击附魔时，把每段牌文的增幅与技能/能力附魔一起比较；按当前目标牌段数计增量。 原生匕首雨4×2→6×2（已有升级的6×2→8×2），扑灭4×4→6×4；牌文每段+2，即每目标+4或+8的条件算术，不是实测伤害。 样本：自有A10/no_retry_evidence 6独立局/6已选多段攻击的前后快照；无随机/同牌拒选反事实。外部第一幕封底31赢家/91上传局仅作方向对照。
适用范围：仅SELF_HELP_BOOK当前可选的DAGGER_SPRAY/EXTERMINATE实例及对应段数；同卡其他副本不自动受益，护甲/伤害修正及未来命中不在估计内。
反例/缺口：同样的书本也实选技能和能力；6局支持的是牌文变化，不是攻击附魔压倒其他选项；外部不含被附魔目标。

文字策略在strategy-candidates.json；对应rk-candidates.json为不可加载研究候选，正式发布和消费者读回均pending。

### 4. book_skill

自助指南当前需要防御且有可附魔技能时，把灵巧附魔作为攻击附魔的备选；逐张检查它改变了哪些格挡数值。 斗篷与匕首6→8、后空翻5→7；坚韧之环当前及接下来2回合的牌文均5→7，完整触发时算术总增6，实际到达/存活未验证。 样本：自有A10/no_retry_evidence 3独立局/3实选技能前后快照；外部第一幕段落20/93为整局赢家上传数，仅作背景，不能当格挡收益。
适用范围：仅第一幕SELF_HELP_BOOK可附魔的CLOAK_AND_DAGGER/BACKFLIP/TORIC_TOUGHNESS等已核目标；以当前目标的格挡牌文为准，不保证重复格挡兑现。
反例/缺口：其他书本机会实选攻击/能力；不能由防御需求直接定固定技能优先级；外部第三幕段落10/14与整本28/49的赢家关联反向。

文字策略在strategy-candidates.json；对应rk-candidates.json为不可加载研究候选，正式发布和消费者读回均pending。

### 5. book_power

自助指南有可附魔能力牌时，将迅速的首次打出抽牌与攻击/格挡附魔比较；评估当前牌能否及时打出及抽牌容量。 18个原生后继均在选中的能力牌末尾增加“第一次打出时抽2张牌”；不是降费、每回合抽2或给小刀附魔。 样本：自有A10/no_retry_evidence 18独立局/18实选能力前后快照；外部第一幕整本26/57、段落20/93，整本高24.11pp；第三幕整本28/49、段落10/14，整本低14.29pp。
适用范围：仅SELF_HELP_BOOK当前未锁且能附魔的能力目标；打出前效果不计已兑现，保持原费用与手牌信息；外部关联不支持固定“必选整本”。
反例/缺口：同版本第三幕赢家关联反向；当前目标/到达深度/是否有能力牌造成强选择混杂。能力附魔抽牌已写入牌文，不等于战斗实际抽到/收益。

文字策略在strategy-candidates.json；对应rk-candidates.json为不可加载研究候选，正式发布和消费者读回均pending。

### 6. book_power_locked

自助指南整本选项当前锁定时，只在实际可选的攻击/技能目标间比较；不为追求外部整本关联而等待未来拿到能力牌。 7个原题明确“没有任何可以附魔的能力牌”，is_locked=true；这7题当前牌组均无Power，故能力备选为0，而非潜在未来目标。 样本：自有A10/no_retry_evidence 第一幕7独立局/7锁定题面；同分层另14个初页能力选项未锁，两组不作因果收益比较。
适用范围：仅第一幕SELF_HELP_BOOK.READ_ENTIRE_BOOK_LOCKED的当前题面；“有能力牌但不能附魔”的原因与跨版本可用性未知，不能反推机制。
反例/缺口：同分层14个初页未锁、第二幕8个和第三幕2个也未锁；不能把早期7例无目标推广为书本总是无能力备选。

文字策略在strategy-candidates.json；对应rk-candidates.json为不可加载研究候选，正式发布和消费者读回均pending。

## OROBAS局部waiting

OROBAS自有506名单内0局；外部只有标题/选中标志/节点聚合，无真实代价、完整未选项或牌文。已查可计算代理：上一节点末HP、当前事件末HP、所获遗物和匿名轨迹均可用，但不能还原选项代价/当前可选集合，故该子项机制与情境做法waiting，保留39条v0.111选项统计行及旧版原分母；不据终局胜率造拿法。
外部v0.111古代选择ARCHAIC_TOOTH选中101局/35赢家，而event_choices标题仅97局/33赢家，字段不等价；TOUCH_OF_OROBAS未选157、已选46，不能求和成与其他cell独立的203局。未知的备选或代价不从遗物名解释。原代表败局在节点18记录回血33和ELECTRIC_SHRYMP，仍不能还原该页完整选择或机制。
下一步：由原owner补授权匿名完整OROBAS选项/代价，或自然自有机会；本批不扩大/下载/自行续派。

## 版本、反向与代理

外部统一external:sts2fun，2026-10-21采集，DB SHA、统计输入SHA逐条保留；玩家数未知，许可无明确再分发许可，只保署名聚合及授权匿名投影。v0.107.0/.1、v0.108.0、v0.109.0/.1、v0.110.0/.1、v0.111.0均保留原分母；机制未改依据缺失，完全不合并。各选择/幕/字段cell、item_occurrences与distinct_uploaded_runs不可混算。
v0.111第一幕书本整本26/57=45.61%、段落20/93=21.51%，差24.11pp；第三幕整本28/49=57.14%、段落10/14=71.43%，差−14.29pp。v0.107.0第三幕也反向（20/41对5/7），v0.107.1第三幕转正（40/57对8/15）；保留异质性，不能固定排序。浴场外部上一节点末HP仅入场代理，沉溺55条选择来自17上传局；不拿重复选择增加独立分母。全部原选项统计在external-version-statistics.json，其他字段原聚合在external-event-rows.json。
自有506名单中浴场35局、书本131局；A10/其他进阶、no_retry_evidence/retry_or_predicted_death和幕分别列own-scenario-statistics.json。原生当前选项/后继牌文作缺列主证据，非最终牌组或簇触发；自有版本unknown，不能冒本系统v0.111验证；外部与自有不混分母。外部调度runs=[]，真实自有支持另列own_support_runs。
无每比较臂>=100的情境比较组，计0；本批是固定事件单元而非20～30张单牌统计批。候选可信度0.30为保守描述赋值，不是收益校准。

## 覆盖与消费者

{
  "unit_ids": [
    "external-remaining-events-004-r56-stock"
  ],
  "fixed_events": [
    "OROBAS",
    "ABYSSAL_BATHS",
    "SELF_HELP_BOOK"
  ],
  "fixed_events_disjoint_from_003_and_reserved_and_published": true,
  "frozen_files_verified_including_three_manifests": 132,
  "data_artifacts_verified": 129,
  "own_frozen_shards_verified": 11,
  "own_run_allowlist": 506,
  "own_event_frames": 387,
  "own_event_decisions": 407,
  "exact_fingerprint_current_state_matches": 369,
  "unmatched_decisions_not_used_as_current_state_evidence": 38,
  "native_adjacent_event_transitions": 202,
  "external_selected_rows": 1193,
  "external_representative_reader_pair_pages_scanned": 80,
  "external_representative_model_complete_pairs_read": 1,
  "external_representative_model_complete_examples_read": [
    {
      "id": "projection-bea30138378eddf4",
      "nodes": 49,
      "win": 1
    },
    {
      "id": "projection-b71db4c4714ed462",
      "nodes": 36,
      "win": 0
    }
  ],
  "model_read_scope": "12种完整事件选项签名；A10/no_retry浴场13次转移；书本攻击10/技能3/能力18个原生前后牌文摘要，5个含完整变化卡字段示例；7锁定题面；外部选定一对49+36节点全文及逐build统计反例。",
  "not_model_read": [
    "其余79个代表对仅程序有界定位扫描；c0-p0赢家曾全文读取但未作为情境证据",
    "387个原生状态的完整全牌组/407个问题正文没有逐一模型通读",
    "其他自有完整局四section未读；本任务不声称完整流派剧本"
  ],
  "full_playbook": false,
  "formal_publication": "pending",
  "consumer_readback": "pending"
}

程序对80个匿名代表对逐对通过manifest核SHA的有界reader定位；模型完整通读所选c0 offset2一对赢家49节点/败局36节点。该对显示书本赢家并不含选项/附魔目标，浴场回血败局仍能过首幕但终败；只能限制外推，不能补出动作因果。其余程序定位页不冒模型通读，未读自有整局四section，不称完整流派剧本。
387状态/407决策的每次原始seek均保存offset/bytes/SHA/截止（raw-read-receipts.json），369决策按相同fingerprint且state.ts<=decision.ts链接当前状态，其余38条不用于当前选项结论。202条同事件相邻状态转移只作后继描述，不作未来条件。
策略候选可用现有brain-strategies格式表达；正式工具仅读正式库，scratch不被读取。事件ID/页/锁定不在现有trigger中，正文条件需模型核对，rk事件消费者/谓词及原题回放缺失逐项写在rk-candidates.json，未伪造card_pick/combat_line入口、未运行Jev/MC/游戏/full/模型/两臂/A-B。knowledge仅局部文字事实；正式经验消费者缺失，生产工具读回/自然采用/收益均待。

本批新增6，不触发连续两批新增0停产门；冻结predecessor是冷启动历史而非events004零批基线，未重置或改写旧批计数，不自行开下一单元。未声称请求fast或high已被原生采用；实际tier/用量/耗时本批未另核原生回执，保持unknown。

## 产物

strategy-candidates.json / rk-candidates.json / knowledge-candidates.json：真实候选；scenario-evidence.json：逐情境原生证据及原分母；source-ledger.json：来源账；experience-strategy-rk-map.json：逐情境去向与OROBAS缺证；coverage.json / decision-output-counts.json：覆盖与分账。
无源码提交，不运行tsc/vitest；仅做候选格式、来源SHA/边界、唯一ID/去重和result/report一致性检查，具体结果另存validation.json。所有正式发布、消费者与科学父状态pending。

## 最终回报（与result.json及最终回复逐字段、原字节一致）

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261025-004302-strategy-proposal",
  "base": "ebe5bfc38d80694f6ec5a4f2e0c8ebf0bb2c3bf5",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/report.md",
  "external_source": "issue51-remaining-events-004-20261024-r56-stock",
  "input_sha256": "be116277d4bc5cc5a9de5ff7332bc7132784edec343fb277ef69e28c5a2a6ba9",
  "external_results": [
    {
      "id": "external-remaining-events-004-r56-stock",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-events004-baths-initial-resource",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-events004-baths-initial-resource",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-events004-baths-linger-marginal-cost",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-events004-baths-linger-marginal-cost",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-events004-book-multihit-enchant",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-events004-book-multihit-enchant",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-events004-book-block-enchant",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-events004-book-block-enchant",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-events004-book-first-play-draw",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-events004-book-first-play-draw",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-events004-book-power-locked",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-events004-book-power-locked",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/rk-candidates.json"
        }
      ],
      "reason": "两个固定事件产出6个新增情境文字策略及6个对应rk研究候选，达到5～10条目标；OROBAS因自有0局且外部缺完整选项/代价局部waiting。rk事件用途/字段消费者缺失，6候选均不可加载，正式发布/读回pending；无源码、合入或收益声明。"
    }
  ],
  "source_commit": null,
  "own_support_runs": [
    "0CLP16ZR4ZZC",
    "0DJ6GFZZ0TG9",
    "0YQJ9D1MC4NK",
    "2Q6ZYZ6JHM0M",
    "456MRNGCPD8E",
    "4AA19CXDKQK6",
    "7BNC8QX746YP",
    "7X0W3U8TVA2A",
    "87LCSDR5P3DL",
    "9U1E3V6XQAZ9",
    "A3X30TN54LSH",
    "AF76L5UTPP8U",
    "AR523ATD2G4W",
    "ATP5MCMJDMQY",
    "CDXCWKNSBN8M",
    "CRK2HNYKSCZC",
    "G2XYF48GKAUW",
    "GWE810ZD014M",
    "HLAWCGM3KHVB",
    "HTXMNBS3PPF5",
    "LKC9YXKZWTKR",
    "MGB1D1T0Y8G0",
    "MR7EBRYRJ5R6",
    "NTMAU4XZ2NN2",
    "PYE4VXNSLGSS",
    "Q3R929GHT14R",
    "SWXESN56U1QJ",
    "T1XWKCUQW4T3",
    "T3FW7R2R2306",
    "V3PJA3FV92BG",
    "WG8GK5B9D7YH",
    "WYB0NCD6W83J",
    "Y5H4CFAQ2WTG",
    "YLYLZWHA0GKU",
    "YUWMCVH6MFUH",
    "YXY2RL1E83HM"
  ],
  "decision_output_counts": {
    "target_min": 5,
    "target_max": 10,
    "new_contexts": 6,
    "new_strategy_ids": 6,
    "updated_existing_contexts": 0,
    "byte_reused_contexts": 0,
    "aliases": 0,
    "rk_research_candidates": 6,
    "rk_loadable_candidates": 0,
    "knowledge_local_candidates": 6,
    "waiting_event_subitems": 1,
    "external_statistical_cells": 356,
    "comparable_groups_reaching_100_per_arm": 0,
    "formal_publication": 0,
    "production_consumer_readback": 0,
    "natural_queries": 0,
    "actual_adoption": 0,
    "measured_benefit": null,
    "new_zero_batch": false,
    "consecutive_zero_new_batches": 0,
    "previous_counter_limit": "未从旧冷启动predecessor推造events004连续零新增基线；本批有6新增，连续零计数为0。"
  },
  "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/experience-strategy-rk-map.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-004302/learner/runs/20261025-004418-c8f0cf38-5d63-4e63-9401-ca47b4b1ab15-strategy-proposal/source-ledger.json",
  "formal_publication": "pending",
  "consumer_readback": "pending",
  "limitations": [
    "自有版本unknown；A10/no_retry_evidence仅表示未观察到重试证据，不能证明从无SL；其他进阶与retry_or_predicted_death另账。",
    "当前题面/原生后继牌文用于局部事实；不是伤害实测、整局因果收益、最佳选择或安全阈值。后继只作验证标签，不作触发。",
    "外部自愿上传、玩家水平/选择偏差、路线/遗物/牌组与到达深度混杂；玩家数未知；上传记录不是已按玩家去重的独立实验。",
    "外部仅定位键/节点聚合，缺完整未选项、代价和入场快照；前节点末HP为代理。不同cell会重叠，独立局并集未知，不能累加。",
    "v0.107～v0.111缺机制未改的核对依据，逐build/幕分账，不合并版本；未知不补成未改。",
    "rk现行applies_to无event，predicate无event_id/options/locked/enchantment，故对应rk是不可加载的研究意图候选，不是假造reflex-entry-v1。"
  ]
}
```
