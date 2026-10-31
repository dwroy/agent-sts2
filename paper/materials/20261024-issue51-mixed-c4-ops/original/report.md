# 剩余簇4单元候选报告

完成记录：2026-10-24T21:59:33+08:00。batch=`20261024-214314-strategy-proposal`。簇4完成10赢家与2失败完整外部轨迹、两局自有四section核读；交6个局部情境（2新增、4沿既有ID补充）及6对文字/rk候选。未证单一机制流派或完整可执行剧本；新比较组达100门槛0，正式发布/生产读回/自然采用/收益均0，科学父保持开放。

## 身份、冻结与边界

learn.json本批external_source/worktree/runs及external_binding已核；HEAD=cf2460be8d7f099875e2a8f4a933045fde6c9da1=dispatch_base。输入manifest 12084字节/SHA 64f3b65494b981c7634fcda842ef554664dfbe8a0d4eb99054f613312af7d9a9；work_spec 4967字节/SHA 9bb5918f923fa466f06ea78cfd99b7eab730c6fb0c9f50d79e86635ad5b113c6。裁剪缺文件按精确路径从本HEAD物化，返回blob及大小核同，没有更改冻结请求或登记。

三manifest和129产物合计132叶大小/SHA均同；9份冻结发布/学习契约与正式schema同当前已读文件。11个自有只读parquet逐片大小/SHA同，以冻结字节判断，不以nlink=1判坏。自有仅内存DuckDB、threads=2，显式原片名单，先join506准入名单再过滤查询；24次原始行seek均未越原六流截止。未读外部数据库/标识，未下载，未sync/init共享logdb，未读后续局。核验详见scratch/input-verification.json、shard-verification.json、raw-seek-ledger.json。一次CREATE VIEW参数绑定不支持，改用内存临时表完成相同先过滤查询；未变更共享数据。

旧毒174311：簇1程序保存10对，但模型仅通读0–4对/309节点；旧刀181311：簇6通读10对/772节点。按实际语义已核范围排除1、6，不声称毒另5对已通读。其余簇按v0.111样本量降序、簇号升序为4(350)、7(246)、5(238)、3(224)、0(129)、2(57)，本批只处理首个簇4。旧211311二十卡/八对仅作coverage，未计新学习。

## 实际覆盖与语义

外部以manifest核SHA的有界reader一对一页保存10对/20轨迹；模型通读全部10个赢家490节点、配对0和9的两个失败44节点，合12轨迹/534节点。其余8个失败仅程序保存、模型未通读。全部18列在压缩读视图保留，零/空/false省略规则可逆，程序逐节点roundtrip全等。不是全字段原生快照。完整终局牌组/质量字段亦读；匿名projection摘要不冒本系统run。

自有HLAW四section148/20/261/13、177AS四section14/4/28/2，共490投影记录，游戏内容通读，牌组以副本计数显示；元数据/原序列保存在原页，程序核对而未冒模型逐字符阅读。raw只抽核12个拿牌原题及12个同指纹且不晚于决定的状态。候选牌文、完整选项、已持牌与之后实变均可追溯；其他原始行、原Plan和全量原生prompt未读，不冒完整。

簇4仅定位，不是玩法名称。已核牌文与时序显示即时攻防/后续补强的多种混合路径：10个赢家终局6有匕首雨、7有扫腿、7有蛇咬；68个还原一致赢家仅11观察三牌齐备。HLAW最终簇4却未持匕首雨，外部赢家也有毒/刀/攻击混合。未证单一机制流派，故只交6个不同局部情境及一个观察性父文档，不冒完整可执行剧本。archetype字段未使用，#55测试几何未部署。

## 情境与去重

|情境|处置|文字ID|对应rk|
|---|---|---|---|
|G1|new|silent-brain-mixed-costly-poison-before-rest-review|silent-rk-mixed-c4-g1|
|G2|new|silent-brain-mixed-immediate-aoe-review|silent-rk-mixed-c4-g2|
|G3|update|silent-brain-early-block-after-attack-prefix|silent-rk-mixed-c4-g3|
|G4|update|silent-grand-finale-empty-draw|silent-rk-mixed-c4-g4|
|G5|update|silent-brain-backflip-external-prefix-context|silent-rk-mixed-c4-g5|
|G6|update|silent-brain-blade-flexible-formation-review|silent-rk-mixed-c4-g6|

G1是扫腿+猎杀者、火前持续失血下新毒源的具体比较；已有snakebite机制不重学。G2是已有单体/刀源时即时群伤与毒源/过牌的比较。G3合到原早期补挡，原反证、conflict和置信度保留。G4沿已有grand-finale知识ID增加拿牌投影，不计新机制或新情境。G5合到原后空翻，G6合到刀源成型复核，不为簇4再造同义ID。新增情境2、更新复用4；新增策略文件ID3中1个是旧知识的首次文字投影；已有策略ID更新3；新rk投影6不计6个新发现。逐字节复用0、别名0；统计行分账见decision-output-counts.json。

每条含一句方向、已观察幅度/样本、适用范围；原单牌外部比较的旧数字仅随原证据保留，不计本批新样本/新达到门槛。六个新情境的比较两组均达100数为0。G1/G2实盘各1独立局/1机会，G6一局2机会不是两局；均保留终局失败和不隔离因果的限制。G3旧反向结果不能用新例覆盖；通知/发布owner应连同原conflict读回，不把候选更新当消除反证。

## 统计、反例和限制

外部v0.107为110/514胜，v0.108为33/122，v0.109为23/93，v0.110为10/52，v0.111为69/350。没有实际机改对照，版本不合并。v0.111三牌描述bundle11/68；64对深度匹配中匕首雨+扫腿19/64 vs17/64（+3.125pp，q=.8855），扫腿+蛇咬25/64 vs25/64（0pp，q=.9938），匕首雨+蛇咬16/64 vs17/64（−1.5625pp，q=1）。没有确认组合；终局共现不是拿牌收益。各版本原数与异质性见version-statistics.json/combination-selected.json，未池化。

自有版本unknown：A10/no_retry_evidence25局0胜、retry_or_predicted_death78局0胜；A0/A1/A6/A7/A9重试分层分别1/1/1/2/1局，均0胜。不得混分母或把缺重试证据叫作纯首试。外部与自有无混算；Z2/KF9/BP9及后续不纳入。前节点结束HP/拿牌前缀是外部代理；own当前状态真实，但具体拿牌净收益未知。总体无独立玩家校正，赢家/上传/生存/终局簇选择偏差存在。

反例：177AS F2扫腿、F3猎杀者、F4蛇咬后F5三鼠28→0；HLAW F17 77→9、F27 65→36、F40 62→7，F48通过后空药77进F49仍败。正例也耗资源：外部bd04 N40损56、N42损22后靠后续恢复获胜。没有把拿牌后的胜败当该牌因果，没有以未来终局/规划want/历史大脑理由代当时已持牌、实际机制或可行选项。

## 候选校验与交付门

现行parseStrategyLibrary接受6文字；严格loadV6Knowledge接受6rk及词表，实际原状态经parseGameState和cardPickPredicateFacts后各恰好匹配1选项，清空牌组6负例通过。仅描述tag；现行cardPickReflex不会将它们当受控contrast执行推荐。无Plan/逐候选结果/留出回放，回放0。tsx CLI最初受沙箱IPC限制，改node --import加载；随后修正验证脚本相对路径，并由格式校验发现旧反证需conflict，已恢复原冲突状态，最终6/6通过。失败和最终口径均保留，不作源码失败。

formal_publication=pending、consumer_readback=pending逐情境见publication-status.json。knowledge父无正式消费者；文字与rk需原发布锁/账本/生产工具逐项读回；候选落盘和本地loader不代生产消费。正式发布/生产读回/自然查询/实际采用/收益各0；科学父开放。不合main/live、不改源码/正式库/共享统计、不启#28/两臂/游戏/模型/MC/Jev/full。git diff --binary为空、HEAD不变。无源码批tsc/vitest/cases=null。gitleaks对scratch扫描3.78MB无泄漏，最终含报告目录扫描3.84MB亦无泄漏。原生模型/effort/tier与额度/耗时未独立核验，不将请求high/ultrafast当已生效。

下一步仅交原owner按候选路径审核缺口并执行既有发布与通知链；本批不自行开下一单元。本次非0新增，未触发连续两批0新增停线；前驱冻结4新增/1更新不改写。

## 最终机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-214314-strategy-proposal",
  "base": "cf2460be8d7f099875e2a8f4a933045fde6c9da1",
  "runs": [],
  "own_support_runs": [
    "177AS39M1UPW",
    "HLAWCGM3KHVB"
  ],
  "own_counterexample_runs": [
    "177AS39M1UPW",
    "HLAWCGM3KHVB"
  ],
  "source": "mixed",
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/report.md",
  "external_source": "issue51-remaining-build-001-20261024-r56",
  "input_sha256": "64f3b65494b981c7634fcda842ef554664dfbe8a0d4eb99054f613312af7d9a9",
  "reason": "簇4完成10赢家与2失败完整外部轨迹、两局自有四section核读；交6个局部情境（2新增、4沿既有ID补充）及6对文字/rk候选。未证单一机制流派或完整可执行剧本；新比较组达100门槛0，正式发布/生产读回/自然采用/收益均0，科学父保持开放。",
  "decision_output_counts": {
    "candidate_contexts": 6,
    "new_situations": 2,
    "updated_or_reused_situations": 4,
    "byte_identical_reuse": 0,
    "aliases": 0,
    "new_strategy_ids": 3,
    "updated_strategy_ids": 3,
    "new_strategy_id_from_existing_knowledge": 1,
    "strategy_candidates": 6,
    "rk_candidates": 6,
    "paired_contexts": 6,
    "knowledge_parent_documents": 1,
    "new_comparison_contexts_meeting_100_per_group": 0,
    "statistical_rows": {
      "version_groups": 5,
      "pair_combination_rows": 8,
      "own_strata": 7,
      "representative_presence_rows": 7
    },
    "formal_published": 0,
    "production_consumer_readback": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "validated_benefits": 0
  },
  "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/paired-output-map.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/source-ledger.json",
  "external_results": [
    {
      "id": "external-remaining-build-001-r56",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-mixed-route-c4-r56",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/playbook.md"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-mixed-costly-poison-before-rest-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-mixed-c4-g1",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/rk-draft.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-mixed-immediate-aoe-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-mixed-c4-g2",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/rk-draft.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-early-block-after-attack-prefix",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-mixed-c4-g3",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/rk-draft.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-grand-finale-empty-draw",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-mixed-c4-g4",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/rk-draft.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-backflip-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-mixed-c4-g5",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/rk-draft.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-blade-flexible-formation-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-mixed-c4-g6",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214314/learner/runs/20261024-214947-4ffac8b1-2eb8-46c3-93a3-cdbc651a44a1-strategy-proposal/scratch/rk-draft.json"
        }
      ],
      "reason": "簇4完成10赢家与2失败完整外部轨迹、两局自有四section核读；交6个局部情境（2新增、4沿既有ID补充）及6对文字/rk候选。未证单一机制流派或完整可执行剧本；新比较组达100门槛0，正式发布/生产读回/自然采用/收益均0，科学父保持开放。"
    }
  ]
}
```
