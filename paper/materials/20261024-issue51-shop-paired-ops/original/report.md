# 商店购买与删牌：本批候选交付

生成时间：2026-10-24T19:00:00+08:00。真实批次 `20261024-184318-strategy-proposal`，角色 Silent。

已落盘6个商店购买/删牌情境及对应knowledge、文字策略和描述性rk候选；另逐字节复用1条既有满药栏换购策略。自有冻结证据补外部价格/金币/货架缺口；稀疏、反向和代理限制逐项保留，正式发布、生产读回及收益均未发生。

## 身份和输入

HEAD、learn.json本批external_source/工作树/external_binding、manifest大小/SHA及work_spec大小/SHA均核同；HEAD保持dispatch_base。详见 本run目录 `input-verification.json`。未修改请求、登记、共享统计、正式库或源码，未提交/合入 main/live。

冻结#54的三manifest+129叶=132文件均核原大小/SHA；11个只读parquet初核通过，结束前再次核验。只查原506名单，排除Z2、KF9、BP9及切点之后对局。DuckDB为内存、threads=2、显式11片列表；未init/sync共享logdb。输入材料只按精确Git blob恢复。

manifest SHA `5e861dbb105284a3708a46d9cbcdb044ebbf3a88801b44062595d5d4de45c7b3`；work_spec SHA `03a01f34d2cc1f8b8244b42ba0d085e627c500234b6c45d4bc6aaf1b1b7b5d08`。版本unknown的自有日志与external v0.107—v0.111八build独立列数，没有机制未改证据，故不合并版本。

已读#27/#42冻结brain-strategies、#28 rk来源/回放、#55情境检索和学习要求/代码提案契约。rk用途为shop的描述tag；未扩schema，未用archetype绑定。manifest中paired_outputs_required=false与正文同产要求的冲突保留，按明确正文产出六对。

## 六个不同情境

每行计一个情境；knowledge、strategy、rk三个表示不重复计新成果。完整逐情境来源、分层和限制在 `scratch/candidates/*.json`、`scratch/source-ledger.json`。

### joint-budget

购买与删牌各自买得起时，先比较同一笔金币能完成的整套方案，再决定把预算给哪边。证据局100金币买51金币翻越撑击后剩49，原100删牌已不可付；另一局162金币先删100后仍能买52药。A10无重试证据购买互斥125机会/84局、选择删牌28/27；重试或判死组522/280、142/127。
范围：Silent A10/自有版本unknown；只证明预算互斥与实际执行，不证明买牌或删牌更好，不固定删牌优先。

处置：new；knowledge `silent-shop-joint-budget`；strategy `silent-brain-shop-joint-budget`；rk `silent-rk-shop-joint-budget`。formal_publication=pending；consumer_readback=pending。

### affordable-stop

有可负担商品时也把离店留金列入比较，先分清库存为空、报价超金币和主动不买，别把打折当购买理由。证据局42金币面对25金币打折群蛇仍离店，金币保持42；113金币面对100删牌和37精准仍离店。A10无重试证据可负担价格代理离店74机会/53局、全价不可负担143/82；重试或判死组328/188、650/300；明确留金理由子集分别9/8、32/30。
范围：Silent A10/自有版本unknown；价格代理不保证药栏等合法条件。原理由仅表意图，未证留金收益，也非打折牌一律不买。

处置：new；knowledge `silent-shop-affordable-stop`；strategy `silent-brain-shop-affordable-stop`；rk `silent-rk-shop-affordable-stop`。formal_publication=pending；consumer_readback=pending。

### golden-reserve

已持SEAL_OF_GOLD时，把保留金币的战斗用途与本店补强一起比较，避免因为商品买得起就花尽，也不设统一留金线。证据局76金币原样离店；同局另一店仍先买78金币残影，203→125。A10无重试证据有可负担价格代理仍离店5机会/3局、实购2/2；重试或判死组57/24、97/27。
范围：仅Silent A10/自有版本unknown且实际持黄金印；原遗物牌文含花金币获能量但数值占位未知，不能算固定回合预算。两组局重叠，未证留金胜率收益。

处置：new；knowledge `silent-shop-golden-reserve`；strategy `silent-brain-shop-golden-reserve`；rk `silent-rk-shop-golden-reserve`。formal_publication=pending；consumer_readback=pending。

### curse-removal

付费删牌可用且当前确有可删诅咒时，把其当前牌文造成的限制与基础牌、购物的取舍一起比较，别默认删打击。两局实际各付100移除NORMALITY，151→51与189→89；牌文记录每回合不能打出超过3张牌。A10无重试证据删诅咒5机会/5局；重试或判死组24/24。持其他诅咒却删非诅咒另有8/8与31/28，说明目标不可一概而论。
范围：Silent A10/自有版本unknown，先核实际可删目标；不含不可删诅咒的假设。NORMALITY两例均终败，未证删诅咒因果收益或必优先。

处置：new；knowledge `silent-shop-curse-removal`；strategy `silent-brain-shop-curse-removal`；rk `silent-rk-shop-curse-removal`。formal_publication=pending；consumer_readback=pending。

### nonbasic-removal

当前非基础牌的费用、条件或用途不再合适时，也把它列入付费删牌比较，和基础牌、购买及离店一起审查。实际各付100删TORIC_TOUGHNESS或TACTICIAN，328→228、204→104；前者当前2费，后者当前3费且牌文有奇巧，不据名字补机制。A10无重试证据非基础非诅咒移除1机会/1局；重试或判死组9/9，十局最终均败。
范围：Silent A10/自有版本unknown，仅提示扩展真实目标比较，不固定删除这些牌、不把旧理由或模型推断当收益。基本牌删除另账，不用稀疏样本排名。

处置：new；knowledge `silent-shop-nonbasic-removal`；strategy `silent-brain-shop-nonbasic-removal`；rk `silent-rk-shop-nonbasic-removal`。formal_publication=pending；consumer_readback=pending。

### upgrade-aware-removal

同时持有升级和未升级打击、准备付费删牌时，按每张实际费用与牌文分别比较目标，不只按同一ID或升级号决定。证据局付100删未升级打击而留升级版，牌文6/9伤；反例局当前打击却为0费9/12伤并删了MEMENTO_MORI。A10无重试证据混持后删牌4机会/3局，均删未升级打击；重试或判死组20/17中13/10删未升级打击，另7机会选择其他目标。
范围：Silent A10/自有版本unknown，费用和牌文以当前快照为准；样本终局均败，未证保留升级牌或删打击的收益。

处置：new；knowledge `silent-shop-upgrade-aware-removal`；strategy `silent-brain-shop-upgrade-aware-removal`；rk `silent-rk-shop-upgrade-aware-removal`。formal_publication=pending；consumer_readback=pending。

## 统计口径及反证

|情境|A10无重试证据：机会/独立局|A10重试或判死：机会/独立局|
|---|---|---|
|joint_budget_purchase|125/84|522/280|
|joint_budget_remove|28/27|142/127|
|close_affordable_price_proxy|74/53|328/188|
|close_no_affordable_price_proxy|143/82|650/300|
|close_empty_stock_no_remove|0/0|3/2|
|active_affordable_keep_rationale|9/8|32/30|
|golden_affordable_close|5/3|57/24|
|golden_affordable_purchase|2/2|97/27|
|paid_curse_removal|5/5|24/24|
|curse_present_other_removal|8/8|31/28|
|paid_nonbasic_removal|1/1|9/9|
|paid_basic_removal|30/27|134/117|
|mixed_strike_removal|4/3|20/17|
|mixed_strike_plain_removed|4/3|13/10|
|sale_affordable_close|59/42|239/158|

其他进阶仍逐级保留在shop-statistics.json，未用于A10方向。no_retry_evidence不保证没SL，retry_or_predicted_death也不是逐动作已在SL；首次尝试窗口未重建，因此不报告首试因果收益。同局多次动作/不同情境可重复；机会与run-floor位置、独立局、最终赢家局均分列，不相加。下一场战斗首记录状态仅为资源代理，不等于原子入场或这次购物的效果。

两个情境的粗描述比较组在同一A10重试/判死分层各有≥100独立局：预算互斥购买280 vs删牌127；价格可付仍离店188 vs全价不可付离店300。它们不是随机或同题对照，不给因果比较。留金意图子集、黄金印、诅咒、非基础牌、升级混持分层均须保留稀疏限制；有效因果/收益对照达到100门槛数为0。本批不是单牌20—30张批，不借合并版本或重叠cell补门槛。

程序提取4209道商店plan/buy题，459局；4209/4209精确observed_ts对齐，非时序近邻代理。2576个购买动作在后继中同时核到按价扣款及目标入库，47个没有通过该严格条件，不能当购买失败；232次移除核到返回商店后的单牌减少与按价扣款，12次未证为按价付费移除，另账。进入CARD_SELECTION但尚未扣款的帧不算删牌已完成。

离店类在A10另保留当前库存空且无可付删牌3机会/2局。价格可付是stocked且price≤gold代理，未保证药栏等执行条件；主动留金只在原计划明确留金且有可付价格代理时识别，不把其余离店都解释为策略动机。未验证的历史模型理由/模拟排序不会成为候选收益证据。

## 外部证据及版本分账

来源统一 external:sts2fun；公开URL https://sts2.fun/static/sts2_public.db.zst；取得2026-10-21；数据库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`；统计输入SHA `4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d`。仅Silent A10/单人/有效/未放弃/无modifiers上传；玩家数未知，不查询标识。许可说明沿冻结provenance：未找到明确数据再分发许可，只交署名聚合/授权脱敏投影，不再分发原库。

v0.111的bought_cards在59587节点全部缺失；商店cards_gained不能证实普通牌购买。无购买前金币、逐物价格和完整未选货架，外部不适合本批精确购买/留金/付费删牌比较，故六条采用自有主证而非伪称mixed。外部5651个商店聚合cell另存，不将其distinct_uploaded_runs求和。

|外部第一幕商店删STRIKE来源代理|独立上传数|其中整局赢家|牌次/赢家牌次|
|---|---:|---:|---:|
|v0.107.0|162|45|165/45|
|v0.107.1|339|80|354/81|
|v0.108.0|95|24|96/25|
|v0.109.0|73|21|75/22|
|v0.109.1|31|8|31/8|
|v0.110.0|1|0|1/0|
|v0.110.1|73|28|74/28|
|v0.111.0|300|97|304/99|

这些是移除来源代理，非付费证据；没有同台未删组的机会分母，不计算提升。大多数版本均有赢家和失败，v0.110.0仅1败；不由赢家常见选择写成当前固定排序，旧版本小样本仍保留。没有机制变更对照，不把版本未知补成未改。

有界reader按manifest核SHA后只读c0/offset0一对，页保留完整节点；赢家projection-fbf4ba3c208a6374与失败projection-5ed8689256202508各49节点，共98节点已通读。赢家节点21/38商店删打击并终胜；失败节点7/25商店也删打击并终败，节点43消费217取得HIDDEN_DAGGERS仍不证明购买带来失败。节点的gold_spent是节点总花费，不能拆逐物价格；card_choices不能冒充完整货架/购买拒选；终局牌组不作当前触发。两代表不是独立随机对照，不称流派剧本、不据簇号命名玩法。

## 复用、coverage和消费边界

已核冻结正式策略/经验/rk：满药栏场景复用既有silent-brain-potion-full-shop-replacement，原JSON对象逐字节保存并核同；计0新增，不增加别名。五条Boss备战shop触发关注Boss窗口/尾部代价，与本批具体购物/删牌场景不同，保留既有ID；不重开Boss单元。silent-deck-burst-observation的“删牌计金币及过渡损失”作为既有广义原则保留，本批给的是具体现状/备选/实际执行，未覆盖旧知识或重复计那条旧原则。

coverage详见scratch/coverage.json：程序覆盖4209局部原状态；选定15条情境见证、14道唯一题、12局、42条唯一原始行均留offset/bytes/SHA和原截止。模型核目标/费用/牌文/金币/删牌及库存后继，部分全货架已读；其余完整牌组/货架只程序保存，不冒模型通读。自有整局四section读取0，故不交完整剧本。外部其余158条代表未读；SHA核验不计内容学习。

六份rk采用描述tag，并配六个vocab候选；predicate只筛已支持的当前事实，动态预算/可删资格仍须读正文核验，不能当评分或执行命令。knowledge来源ID也只是scratch候选，正式消费者尚缺。策略触发只用shop，正文带A10/现状限制；tool按ID细查可看全六条，粗触发不保证每条情境成立。未启#28开关、两臂、A/B，未做真实回放。

产出计数：{"new_contexts": 6, "updated_existing_contexts": 0, "byte_reused_contexts": 1, "aliases": 0, "new_knowledge_entries": 6, "new_strategy_entries": 6, "new_rk_descriptive_entries": 6, "rk_numeric_or_effect_entries": 0, "statistical_group_definitions": 16, "statistical_stratum_rows": 122, "external_version_contrast_rows": 8, "descriptive_contexts_with_two_ge100_groups_same_stratum": 2, "efficacy_comparisons_ge100": 0, "formal_published": 0, "production_consumer_readbacks": 0, "natural_queries_observed": 0, "actual_adoption_verified": 0, "benefit_estimates": 0}

候选格式已用固定生产解析器/隔离loader检查；不等于正式发布或生产kb_strategies/kb_reflex读回。未改源码，tsc/vitest/cases均null，未跑full。正式发布、生产工具读回、自然查询、实际采用和收益均0/未观察，学习账本/发布锁/后续自然采用交原owner；科学父保持开放。本批完成后不自行派下一单元。

原external-launch记录fast请求、52%周用量，observed_service_tier=null；原生模型、effort、实际tier和使用量/耗时均未核，不把参数当采用。未改账号/home/config/权限或在途参数。scratch提取曾有变量遮蔽TypeError，纠正后复核；黄金印初次ID拼写错产生的0组已纠正，旧错误事实记在limitations.json。

## 机器回报
```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-184318-strategy-proposal",
  "base": "a2f5c84819a5d761dec6ce17b9ce292b8379679e",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/report.md",
  "external_source": "issue51-decision-shop-001-20261024",
  "input_sha256": "5e861dbb105284a3708a46d9cbcdb044ebbf3a88801b44062595d5d4de45c7b3",
  "reason": "已落盘6个商店购买/删牌情境及对应knowledge、文字策略和描述性rk候选；另逐字节复用1条既有满药栏换购策略。自有冻结证据补外部价格/金币/货架缺口；稀疏、反向和代理限制逐项保留，正式发布、生产读回及收益均未发生。",
  "own_support_runs": [
    "0QDRNCRMC8BU",
    "0YQJ9D1MC4NK",
    "25226ZFLNR1J",
    "9663Y88TYK73",
    "FETDVL1P59B9",
    "HSX4HYATB4E2",
    "MGA0CZDDKC0P",
    "NB8KCF6HRGVF",
    "PZRSP3EL4K6B",
    "QNTW139MGECA",
    "VPW8YH7A4QFM",
    "YF0LXT1QSTGG"
  ],
  "own_support_runs_scope": "12个逐例抽核/策略证据引用局；459个统计查询局的完整清单另见own_statistics_runs_path，各组独立分母见source-ledger。",
  "own_statistics_runs_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/own-statistics-runs.json",
  "source_accounting": {
    "own": 6,
    "mixed": 0,
    "external": 0,
    "external_direction_contrast": "external:sts2fun，单独分账"
  },
  "decision_output_counts": {
    "new_contexts": 6,
    "updated_existing_contexts": 0,
    "byte_reused_contexts": 1,
    "aliases": 0,
    "new_knowledge_entries": 6,
    "new_strategy_entries": 6,
    "new_rk_descriptive_entries": 6,
    "rk_numeric_or_effect_entries": 0,
    "statistical_group_definitions": 16,
    "statistical_stratum_rows": 122,
    "external_version_contrast_rows": 8,
    "descriptive_contexts_with_two_ge100_groups_same_stratum": 2,
    "efficacy_comparisons_ge100": 0,
    "formal_published": 0,
    "production_consumer_readbacks": 0,
    "natural_queries_observed": 0,
    "actual_adoption_verified": 0,
    "benefit_estimates": 0
  },
  "context_mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/context-mapping.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/source-ledger.json",
  "limitations": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/limitations.json",
  "formal_publication": "pending",
  "consumer_readback": "pending",
  "external_results": [
    {
      "id": "external-decision-shop-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-shop-joint-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/joint-budget.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-joint-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/joint-budget.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-joint-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/joint-budget.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-shop-affordable-stop",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/affordable-stop.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-affordable-stop",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/affordable-stop.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-affordable-stop",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/affordable-stop.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-shop-golden-reserve",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/golden-reserve.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-golden-reserve",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/golden-reserve.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-golden-reserve",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/golden-reserve.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-shop-curse-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/curse-removal.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-curse-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/curse-removal.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-curse-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/curse-removal.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-shop-nonbasic-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/nonbasic-removal.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-nonbasic-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/nonbasic-removal.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-nonbasic-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/nonbasic-removal.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-shop-upgrade-aware-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/upgrade-aware-removal.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-upgrade-aware-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/upgrade-aware-removal.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-upgrade-aware-removal",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-184318/learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch/candidates/upgrade-aware-removal.json"
        }
      ],
      "reason": "已落盘6个商店购买/删牌情境及对应knowledge、文字策略和描述性rk候选；另逐字节复用1条既有满药栏换购策略。自有冻结证据补外部价格/金币/货架缺口；稀疏、反向和代理限制逐项保留，正式发布、生产读回及收益均未发生。"
    }
  ]
}
```
