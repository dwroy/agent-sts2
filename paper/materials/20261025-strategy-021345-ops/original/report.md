# 簇0：探寻转富足的混合构筑候选

5个局部情境：1新增、4补充复用；5文字及5rk候选已落scratch，3rk格式通过、2研究型不可加载，双百比较0。正式发布、消费者读回与自然采用均pending；未形成完整验证剧本。

本批候选身份为 `20261025-021345-strategy-proposal`，plan=`issue51-remaining-build-005-20261024-r56-stock`。HEAD保持`8b949d199aeac240a8ce16ae9f732558a936cd4d`；learn.json external_source、candidate_mode.merge=no、独立工作树及dispatch_base核同。绑定清单12291字节/SHA `01d09977b216feee993baba5894f969aacca13284099648f935582209102352c`、work_spec5191字节/SHA `023803d9564c5af217861497daa885e5fe0df37cf8633dffd86c8b0ec242d24c`及冻结契约逐项核同；#54三manifest与132文件完整大小/SHA核同，见scratch/input-verification.json、binding-verification.json。历史材料按精确Git路径展开，无输入改写。

仅处理本单元簇0，未重开簇4/7/毒1/刀6或旧Boss主题。簇号只定位；本次核实原牌文和顺序，只采用“探寻转富足的混合构筑”描述，不认证为单一刀/毒玩法。正式部署模型SHA/几何未核，所有文字trigger只用已有题型/幕，现场细条件放正文；没有archetype触发或未来牌组/胜负触发。

## 情境与去重

逻辑情境共5：1项新增、4项补充复用。策略物理上3个新投影ID、2个既有策略同ID更新；新投影中2个沿既有经验ID，不算新机制。新知识机制0、逐字节复用0、别名计新增0。5条正文各含方向、数值幅度、样本和范围，完整支持/限制见对应文件与来源账本。现有知识、旧证据、置信度及原HP信号保持；旧策略正文完整保存在prior_entry_attachment，原机制经验保存在reused_knowledge_attachment。

|情境|处置|方向、幅度与样本|策略ID / rkID|
|---|---|---|---|
|C0-1|补充复用|探寻任务、生成能力、已建能力分核；5问号任务，富足1费；外部所选10/10于记录节点8–15变化（5胜5败），非总体完成率；自有A10 1局。|`silent-dowsing-rod-question-task` / `silent-rk-c0-dowsing-stage-research`|
|C0-2|补充复用|勒紧只对防御的用途进入购物比较；5张防御、83+73+37=193金，247→54；1局1店，后继52→40且用了火焰药水。|`silent-fasten-defend-extra-block` / `silent-rk-c0-fasten-shop-target`|
|C0-3|补充复用|潜在复制目标不等未来施放；3费、次轮三复制品；新增1局1次，旧4局原样保留不算本批验证。|`silent-brain-b003-next-turn-copy-or-attack` / `silent-rk-b003-next-turn-copy-or-attack`|
|C0-4|新增|失血升级同时核下一段资源；62→52血、夜魇3→2费；1局1机会；另一项原文回复25并加羽化，反事实未知。|`silent-brain-c0-upgrade-hp-trade` / `silent-rk-c0-hp-upgrade-research`|
|C0-5|补充复用|问号不作安全空档；40/77血放弃面板23回复而升级，后问号开战终败；1局1窗口，不宣称休息本可赢。|`silent-route-hp-observation` / `silent-rk-c0-unknown-room-rest`|

具体处置：C0-1复用silent-dowsing-rod-question-task，C0-2复用silent-fasten-defend-extra-block，二者旧机制本就引用这两场自有局，不能冒新发现。C0-3更新silent-brain-b003-next-turn-copy-or-attack；C0-5更新silent-route-hp-observation，保留其全部旧证据。C0-4新增“失血升级夜魇”的事件取舍情境，机制本身仍指向silent-nightmare-next-turn-copies。商店预算与精密瞄准不另拆泛句凑新增；没有引入出牌/药水/SL/终局价值规则或代码提案。

## 覆盖与证据分账

外部严格经manifest核SHA有界reader，一页一胜负对，完整节点保存。选择v0.111/c0 offset0–4，模型通读5赢家+5失败、共458节点；pair0原页，pair1–4按明确默认值无损显示全部18列。程序另保存offset5–9，但模型未读、未用于结论。每轨迹摘要SHA、转换、升级、资源与终态见selected-external-observations.json；前5节点Jaccard仅代表配对条件，不是相同开局。完整指原投影节点覆盖，不补事件未选项、药水时机、真实入场快照或玩家意图。

自有同簇仅两局，均已通读四section的全部708行（经有界reader保存后，无损列式/字典展示，并程序逆变换核回原行）：

|run|进阶/尝试层|版本|快照/战斗/题目/计划|结局与用途|
|---|---|---|---|---|
|P5HT1272P5SB|A10 / no_retry_evidence|unknown|73 / 12 / 131 / 4|F25败；本批5情境主证1独立局，5种机会不算5独立局。|
|2L1BNN9ZJEFU|A6 / retry_or_predicted_death|unknown|135 / 22 / 324 / 7|F48末态败；首试仅09:15:28.879预判截止代理，非已核实际死亡；只作独立反例背景，不计A10支持。|

原名单506与六流截止保持，Z2手动/KF9缺末态/BP9及之后局未纳入。8次具名原日志seek（6决策+2状态）都核offset+bytes≤原截止、逐段SHA留在raw-window-receipts.json；只读该两局相关字段，没有扫整流、查询原库、读外部玩家标识、下载或使用DuckDB/Parquet，也没有init/sync共享logdb。11分片未用于新查询，未写或因nlink变化判坏。此前快照牌组、首战帧HP均按代理使用；A6末Boss重试合并的HP/药水字段不当单次代价。

## 外部统计、反向与缺口

统一来源external:sts2fun，地址https://sts2.fun/static/sts2_public.db.zst，采集2026-10-21，数据库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`。原FAQ未找到明确再分发许可，保留署名聚合使用限制，不发布原库/玩家标识。游戏机制跨版本是否不变缺实据，保持各组独立：

|版本|簇0上传记录|胜/败|
|---|---:|---:|
|v0.107|129|39 / 90|
|v0.108|18|4 / 14|
|v0.109|38|11 / 27|
|v0.110|21|10 / 11|
|v0.111|129|45 / 84|

这是上传记录分母，玩家独立性未知。v0.111簇0共129局，不能把所选10代表再加进去；自有A10 1局与A6 1局也不能并入外部分母。核心ABUNDANCE在45/129终局出现不等于“45赢家都靠富足”；本批没有从两项边际统计推交集。

v0.111深度匹配仅21对：ACCURACY+LEADING_STRIKE赢家12/21、败者10/21，差+9.52pp；v0.107为4/17对10/17，反向-35.29pp。FOOTWORK+LEADING_STRIKE v0.111为9/21对6/21（+14.29pp），v0.107为5/17对7/17（-11.76pp）。本簇v0.111的899组合无q≤0.05；这些差异只作探索性终局关联，不能转固定拿牌排序。ABUNDANCE未进入这些组合的候选牌集合，空结果不是零关联。

质心前三牌ABUNDANCE+PANACHE+LEADING_STRIKE的描述性bundle只在3/45个一致还原的v0.111赢家观察成型；42/45未观察成型，反对把质心标签当必要成型条件。更早版本成型0/39、0/4、0/11、0/9（v0.110另1赢家还原排除），不能把未知机改补成未改。所有比较组均未达双方各100；簇总体129不是合格比较组。此限制不否决有原牌文/真实行动支撑的描述性情境。

赢家也有高资源代价：所选bea301在第二幕ENTOMANCER记录伤害62，仍终胜；失败6b921拿夜魇后仍败；两例都保留，不能写“买/升级夜魇必败”或“富足/步法齐备保证安全”。所有自有局部选择都来自失败整局，不能反向证明这些选择造成失败。

## 消费者、检查与交接

5文字候选经冻结基线生产parseStrategyLibrary校验通过，正文570/532/560/540/581字节以内（精确值以文件重算为准）。3rk用既有reflex-entry-v1描述tag、既有predicate白名单，通过validateReflexEntry；不修改silent-r2-card-fasten的旧数值信号。2rk因event/act_plan不在适用题型中保留runtime_entry=null研究稿，没有伪装combat_line。rk新词表候选单列，仍需原发布owner核正式合入及消费者路径。无原始逐候选DTO/capture/结果矩阵，不做#28两臂或收益回放，也不开开关。

程序覆盖与模型实读分账见coverage.json；schema-validation.json仅格式核验，不算生产读回。未改源码或正式库，未跑模型/MC/Jev/游戏/full/tick；tsc/vitest/cases均null，source_commit=null，merge=null。实际服务档位/原生请求回执未在本批核实，不把fast参数、模型说明或额度声明当实际tier；使用量/耗时沿启动器原运行记录，不补造。

正式发布、正式knowledge/剧本消费者、rk真实DTO回放、生产工具读回、自然查询、实际采用/收益、科学父分别pending。候选完成现在交原owner进入原发布锁及学习账本流程，不等待2小时/代码full，不自行开下一单元，不写main/live。任务未给出本主题前批连续零新增基线；本批真实新增1，未触发连续两批0新增停产。

来源账本source-ledger.json、逐情境dedup-and-mapping.json、完整统计external-statistics.json与132输入核验文件均在scratch。所有候选formal_publication=pending、consumer_readback=pending。报告末JSON与result.json使用同一原字节，结束前再解析核同。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261025-021345-strategy-proposal",
  "base": "8b949d199aeac240a8ce16ae9f732558a936cd4d",
  "runs": [],
  "own_support_runs": [
    "P5HT1272P5SB"
  ],
  "source": "mixed",
  "source_commit": null,
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/report.md",
  "reason": "5个局部情境：1新增、4补充复用；5文字及5rk候选已落scratch，3rk格式通过、2研究型不可加载，双百比较0。正式发布、消费者读回与自然采用均pending；未形成完整验证剧本。",
  "external_source": "issue51-remaining-build-005-20261024-r56-stock",
  "input_sha256": "01d09977b216feee993baba5894f969aacca13284099648f935582209102352c",
  "decision_output_counts": {
    "distinct_contexts": 5,
    "new_contexts": 1,
    "updated_or_reused_contexts": 4,
    "new_strategy_projection_ids": 3,
    "same_strategy_id_updates": 2,
    "new_knowledge_mechanisms": 0,
    "byte_for_byte_reuses": 0,
    "aliases_counted_as_new": 0,
    "strategy_candidates": 5,
    "rk_candidates": 5,
    "rk_schema_candidates": 3,
    "rk_research_only": 2,
    "comparison_groups_both_ge100": 0,
    "formal_publications": 0,
    "production_consumer_readbacks": 0,
    "natural_queries": 0,
    "natural_adoptions": 0,
    "causal_benefits": 0,
    "full_playbooks": 0
  },
  "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/dedup-and-mapping.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/source-ledger.json",
  "external_results": [
    {
      "id": "external-remaining-build-005-r56-stock",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-c0-dowsing-to-abundance-context-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/knowledge-candidate.json"
        },
        {
          "kind": "strategy",
          "id": "silent-dowsing-rod-question-task",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/strategy/silent-dowsing-rod-question-task.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c0-dowsing-stage-research",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/rk/silent-rk-c0-dowsing-stage-research.json"
        },
        {
          "kind": "strategy",
          "id": "silent-fasten-defend-extra-block",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/strategy/silent-fasten-defend-extra-block.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c0-fasten-shop-target",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/rk/silent-rk-c0-fasten-shop-target.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-next-turn-copy-or-attack",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/strategy/silent-brain-b003-next-turn-copy-or-attack.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-next-turn-copy-or-attack",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/rk/silent-rk-b003-next-turn-copy-or-attack.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-c0-upgrade-hp-trade",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/strategy/silent-brain-c0-upgrade-hp-trade.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c0-hp-upgrade-research",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/rk/silent-rk-c0-hp-upgrade-research.json"
        },
        {
          "kind": "strategy",
          "id": "silent-route-hp-observation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/strategy/silent-route-hp-observation.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c0-unknown-room-rest",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-021345/learner/runs/20261025-021443-41ad5aa7-4a88-4f67-97a0-8cc882b5bed6-strategy-proposal/scratch/rk/silent-rk-c0-unknown-room-rest.json"
        }
      ],
      "reason": "5个局部情境：1新增、4补充复用；5文字及5rk候选已落scratch，3rk格式通过、2研究型不可加载，双百比较0。正式发布、消费者读回与自然采用均pending；未形成完整验证剧本。"
    }
  ]
}
```
