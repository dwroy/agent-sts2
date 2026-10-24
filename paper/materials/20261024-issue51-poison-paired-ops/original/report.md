# 本批毒流整局剧本候选报告

生成时间：2026-10-24T17:59:21+08:00。batch=20261024-174311-strategy-proposal；external_source=issue51-whole-run-poison-003-20261024。

冻结身份通过：learn.json角色/工作树/plan/base、manifest 14120字节/SHA、work_spec 5240字节/SHA、HEAD=ed16b914658e72a4f69e84588dea88f72af1e131；三manifest与全部132项原字节核同。11个自有只读冻结parquet大小/SHA核同。未改请求/登记、源码、正式库、共享统计、main/live或旧008输入/结果。未提交，HEAD保持基线，source-diff.patch为空。

交付7个不同文字情境（3个新ID、4个同ID更新），同一毒流父剧本沿旧ID更新1份、不另计新情境；6个真实reflex-entry-v1标签候选、1个副本数条件缺口waiting。新增文字只有3条，未达5条新增；没有把7个总情境说成7条新增。既有宽场景/统计证据保留，不用新ID重复包装。完整正文见scratch/poison-playbook.md；每项的原题、动作、反例、停线和去向见scratch/paired-output-map.json。

| 情境 | 文字处置 | rk处置 | 主证据 |
|---|---|---|---|
| defense-draw | update：silent-brain-backflip-external-prefix-context | candidate | 自有0CLP F13原题；外部方向另账 |
| cheap-source | new：silent-brain-poison-cheap-source-with-snakebite | candidate | 自有0CLP F19原题；外部方向另账 |
| amplifier-after-source | update：silent-brain-accelerant-external-prefix-context | candidate | 自有0CLP F21原题；外部方向另账 |
| recurring-group-source | update：silent-brain-noxious-fumes-external-prefix-context | candidate | 自有0CLP F30原题；外部方向另账 |
| flexible-skill-copy | update：silent-brain-burst-external-prefix-context | candidate | 自有0CLP F33原题；外部方向另账 |
| third-costly-source | new：silent-brain-poison-third-snakebite-review | waiting | 自有0CLP F35原题；外部方向另账 |
| late-mitigation | new：silent-brain-poison-late-piercing-wail-review | candidate | 自有0CLP F46原题；外部方向另账 |

本地原牌文已核并与持有/奖励的时点区分：触媒是毒额外触发，爆发复制的是本回合下一张技能，不能从名称填机制，也不复制能力牌触媒。附魔灵动步法+额外抽牌与普通升级牌原文分别保存。当前条件只用实际已持牌/本题选项；终局簇、赢家身份和最终牌组不作触发。

本批完整读了有界reader的外部页0..4共10条轨迹/309完整节点（5胜5负），包含全18列与全部记录选项。程序另存页5..9的10条，但模型未读，不充通读数。自有0CLP16ZR4ZZC四section游戏内容通读：144快照、24战斗、252题、66计划；计划内容字段多null，不补构筑意图。模型读无损增量展示，逐行时间/off/len是程序检查，未冒逐字通读元数据。F6XY4QJMS5RC仅战斗/资源及奖励题对照，其他section部分读，不能称第二个完整通读局。原始行共64次有界seek，逐项记录offset/bytes/SHA，未越原切点；7个奖励输入都匹配原决策指纹且不晚于原决策。初次按observed_ts得到的pre-claim窗口保留在audit，但不作为合法奖励选项；只使用后续核同指纹的原窗口。

外部来源external:sts2fun、采集2026-10-21，数据库SHA和各输入SHA见source-ledger.json。簇1五版本分别59/360、18/85、19/89、8/68、42/223胜，逐版分账；未核机制未改，不能合并。自有游戏版本unknown；A10/no_retry_evidence为3/48、A10/retry_or_predicted_death为3/134，其他进阶原分母逐项另列。缺重试证据不证明从未SL；本批支持局与外部上传局不混分母，Z2/KF9/BP9及后续不纳入。

外部27对终局组合中触媒+致命毒药、触媒+毒雾各为8/27对11/27、5/27对8/27（均-11.11pp，q=1）；保留反向。旧四个文字ID原先>=100的比较组保持，但新具体情境达到100比较门槛为0，不继承样本；每个具体候选只有1个独立本地支持局，多个机会不变成多局。41个还原一致外部赢家的幕末正block代理8→9、核心3→4只是事后参照，不能作为安全门槛。玩家独立性/上传偏差、幸存选择、终局聚类及版本未知均保留。

赢家也核成本：0CLP F14赢精英仍净损30、F22净损15、F30净损20、F46群战净损24。F48末战斗59HP但post51，原净损35保留；F49首记录76HP、末12、净损64。GAME_OVER最终HP0/victory=true与前奖励12HP、finalize胜利并列，不误判成战斗死亡。F6在有多张毒牌/防护下F33仍实际死亡；没有把某牌早晚或另一Boss赢家当作反事实收益。

候选验证：现有parseStrategyLibrary接受7条；原严格loadV6Knowledge及词表引用接受6条rk；从7个原题中为6个可表达情境用生产cardPickPredicateFacts求值，各精确匹配1个原候选。隔离scratch的真实kb_reflex函数返回6条构筑摘要，predicate_evaluation=not_evaluated；这是固定候选接口检查，不是生产读回或采用。第三张蛇咬需要两份同ID实体计数，现行物理牌DTO/谓词不能可靠表达，故rk waiting，不伪造card.count。6个标签无比较信号/区间，现行cardPickReflex不会把它们发成可执行拿牌建议；可执行比较数0。具体Boss回合、药水时机、Plan/逐候选完整结果与留出回放缺失，沿已有Boss文字ID引用，不开新Boss/冷启动/休息任务，不启#28/两臂/A-B。

正式发布0、生产工具读回0、自然查询0、实际采用0、收益测量0，formal_publication/consumer_readback均pending，科学父开放。父剧本knowledge消费者不自动扫描scratch；文字策略及rk也需原发布链同批交付、账本/生产工具/自然读回分别验收。没有源码修改，tsc/vitest/cases按本批结果置null；未调用full、模型、MC、Jev或游戏。gitleaks对scratch约5.64MB扫描无泄漏。档位、服务层级、耗时与用量未核原生启动回执，不把requested ultrafast或任务参数报成实际生效，亦未改账号/home/config/权限。下一单元交原调度器，本批不派发。

报告附录中的JSON与result.json原字节一致，最终回复必须复用相同字节。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-174311-strategy-proposal",
  "base": "ed16b914658e72a4f69e84588dea88f72af1e131",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/report.md",
  "external_source": "issue51-whole-run-poison-003-20261024",
  "input_sha256": "34c003dbe92be41087406af75a7cfec60bfea50d40a7ff3d9c553ed52cc61ee3",
  "external_results": [
    {
      "id": "external-whole-run-poison-003",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-external-poison-build-playbook-c1",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/poison-playbook-candidate.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-backflip-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-poison-cheap-source-with-snakebite",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-accelerant-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-noxious-fumes-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-burst-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-poison-third-snakebite-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-poison-late-piercing-wail-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-poison-rk-defense-draw",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/isolated-knowledge/characters/silent/reflex.json"
        },
        {
          "kind": "rk",
          "id": "silent-poison-rk-cheap-source",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/isolated-knowledge/characters/silent/reflex.json"
        },
        {
          "kind": "rk",
          "id": "silent-poison-rk-amplifier-after-source",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/isolated-knowledge/characters/silent/reflex.json"
        },
        {
          "kind": "rk",
          "id": "silent-poison-rk-recurring-group-source",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/isolated-knowledge/characters/silent/reflex.json"
        },
        {
          "kind": "rk",
          "id": "silent-poison-rk-flexible-skill-copy",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/isolated-knowledge/characters/silent/reflex.json"
        },
        {
          "kind": "rk",
          "id": "silent-poison-rk-late-mitigation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/isolated-knowledge/characters/silent/reflex.json"
        }
      ],
      "reason": "毒流整局候选已落盘：文字3新4同ID更新，rk6候选及1项副本数谓词缺口waiting；通读外部10轨迹及自有1局四section，失败局部分对照。新增文字仅3未达5；新情境达100比较门槛0，可执行拿牌rk0，正式发布/生产读回0。"
    }
  ],
  "own_support_runs": [
    "0CLP16ZR4ZZC"
  ],
  "own_contrast_runs": [
    "F6XY4QJMS5RC"
  ],
  "source": "mixed",
  "decision_output_counts": {
    "distinct_decision_contexts": 7,
    "text_strategy_candidates": 7,
    "new_text_ids": 3,
    "same_id_text_updates": 4,
    "parent_playbook_updates": 1,
    "parent_counted_as_new_context": 0,
    "byte_identical_strategy_reuse": 0,
    "boss_reference_reuse": 4,
    "new_aliases": 0,
    "statistical_rows_counted_as_decisions": 0,
    "rk_candidates": 6,
    "rk_waiting": 1,
    "paired_candidates": 6,
    "paired_with_explicit_gap": 1,
    "brain_rk_schema_loadable": 6,
    "executable_card_pick_rk": 0,
    "new_contexts_with_comparison_groups_ge100": 0,
    "retained_old_entries_with_groups_ge100": 4,
    "new_qualified100_claims": 0,
    "formal_publications": 0,
    "production_readbacks": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "measured_benefits": 0,
    "scientific_parents_closed": 0,
    "frozen_predecessor_new": 4,
    "zero_new_streak_this_batch": 0,
    "isolated_fixed_brain_tool_readbacks": 6,
    "new_text_ids_ge5": false,
    "total_decision_contexts_ge5": true,
    "count_caveat": "新增文字ID仅3、未达5；7为3新+4同ID更新情境，旧成果不冒新增"
  },
  "paired_output_map": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/paired-output-map.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/source-ledger.json",
  "candidate_validation": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/candidate-validation.json",
  "waiting": [
    {
      "context": "third-costly-source",
      "disposition": "waiting",
      "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-174311/learner/runs/20261024-174403-e4b98dd3-2432-4a85-ae0e-f26d7c15257e-strategy-proposal/scratch/rk-waiting.json",
      "reason": "现行card_pick物理牌player.deck无聚合count，any重复条件不能证明两份同ID；原局两张均未升级，不能以两种升级状态代替。缺可靠副本数谓词；不扩schema，不用card.count伪造DTO。下一步由原合同owner提供实际可得计数字段后补精确rk。"
    },
    {
      "context": "comparative-rk-and-combat-replay",
      "disposition": "waiting",
      "reason": "6份rk仅描述性tag；缺同题拿/不拿独立局对照及可信区间，现行比较消费者不接收。具体出牌缺原Plan/逐候选结果及留出回放；本批未调用模型/MC/Jev，不伪造可执行动作或收益。"
    },
    {
      "context": "formal-publication-and-consumption",
      "disposition": "waiting",
      "reason": "沿原正式通道同批发布文字与rk、登记账本并做生产工具读回；scratch隔离读回不代正式发布、自然查询、实际采用或收益，科学父开放。"
    }
  ],
  "formal_publication": "pending",
  "consumer_readback": "pending",
  "native_model_effort_service_tier": "unknown; no native receipt inspected"
}
```
