# #51 固定24张单牌末批：覆盖完成，候选0，单元waiting

批次 `20261024-233358-strategy-proposal`；plan `issue51-single-card-004-final-20261024-r56-stock`；unit `external-single-card-004-final-r56-stock`。只处理stock-selection.cards，无旧008/009/Boss复跑，无下一单元。本报告及scratch是本批唯一交付，HEAD保持`f6361397f0d96b8dd20d9e108e0b69261396dfbd`，source_commit=null，不提交/合并/发布、不改正式知识/统计/源码/共享队列。

本批24张逐项跳过，真实新增0、更新0、复用0、策略/rk候选0/0，100门槛达标0。目标5～10条未达，不能拆泛句凑数。waiting是候选证据不足，不表示未做覆盖。完整逐卡处置在[scratch/dispositions.json](scratch/dispositions.json)，空候选文件不算去向；external_results.destinations=[]。已发布的4条相关战斗rk只作去重，既有机制不是本次拿牌结论。

## 身份与输入完整性

已核learn.json本批external_source、external_binding、work_spec、input SHA及实际HEAD=dispatch_base。manifest `e51055e2087c1862c04067906c0bc1e05abcc0635c8364f1a8377645cc30cfff`；work_spec `28f9e1fb3197ffd5f40111e81eed45ecf0d11c97a8838b1d9e60972d25428afd`；固定选择 `12de5684d41c62656b9d36796504c55d1a671adfc010a96c704c51813e3c66ec`。

#54三manifest＋129产物叶=132项全部按原大小/SHA核同，不能称132产物叶。另核12个冻结合同、work_spec、scope及11只读parquet，详见[scratch/verification.json](scratch/verification.json)。工作树缺失的冻结材料经`git ls-tree HEAD -- 精确路径`核未列入基线，读取宿主原冻结文件并核SHA，没有复制/扩展历史树或改请求。

已读README、最新STATE-2026-10-19、decision-log末尾、学习协议含§9，以及冻结#27/#42策略、#28rk、#55检索/剧本、own统计与scope合同。STATE旧停机文字与后续恢复的decision-log时间线并存，以本批冻结授权为具体范围，未自行改状态。冻结合同与现行读取说明中策略查询引导存在历史表述差异，本批无消费者改动，不把说明当已部署回执。

## 逐张处置

下表五版本数字依次为v0.107/108/109/110/111的cards_gained**条目次数代理**，不是独立局数、奖励机会或因果价值。版本原样分账；同一版本下build仍在附表分别保留。没有机改对照，标unknown，不假定未改。最大cell为v0.111原distinct_uploaded_runs，跨cell不相加成独立局。取得次数只给取得记录独立上传数的上界，不能当真实局数。

| 卡ID | 五版本取得次数代理 | v0.111最大cell上传数 | 自有持有代理局 | 其中A10 | 处置 |
| --- | --- | --- | --- | --- | --- |
| TAUNT | 10/1/3/7/11 | 5 | 1 | 1 | 跳过；比较组不足100 |
| TREMBLE | 14/7/3/1/11 | 6 | 2 | 2 | 跳过；比较组不足100 |
| STONE_ARMOR | 5/1/3/0/10 | 8 | 1 | 1 | 跳过；比较组不足100；已有战斗rk仅去重 |
| BODY_SLAM | 13/2/0/3/8 | 4 | 3 | 3 | 跳过；比较组不足100 |
| TRUE_GRIT | 9/2/1/0/8 | 4 | 1 | 1 | 跳过；比较组不足100 |
| PACTS_END | 8/5/1/0/7 | 3 | 2 | 2 | 跳过；比较组不足100 |
| POMMEL_STRIKE | 5/3/2/3/7 | 2 | 2 | 2 | 跳过；比较组不足100 |
| SETUP_STRIKE | 8/7/1/2/7 | 3 | 1 | 0 | 跳过；比较组不足100 |
| DEMON_FORM | 6/0/0/1/6 | 6 | 1 | 1 | 跳过；比较组不足100 |
| JUGGERNAUT | 5/1/4/0/6 | 3 | 3 | 3 | 跳过；比较组不足100；已有战斗rk仅去重 |
| DOMINATE | 4/3/1/3/5 | 4 | 2 | 1 | 跳过；比较组不足100 |
| FORGOTTEN_RITUAL | 3/0/3/2/4 | 2 | 3 | 3 | 跳过；比较组不足100 |
| IMPERVIOUS | 7/1/0/3/4 | 3 | 1 | 1 | 跳过；比较组不足100 |
| IRON_WAVE | 10/0/0/0/4 | 3 | 1 | 1 | 跳过；比较组不足100 |
| PYRE | 6/1/2/0/4 | 4 | 1 | 1 | 跳过；比较组不足100 |
| EVIL_EYE | 5/4/1/1/3 | 2 | 1 | 1 | 跳过；比较组不足100 |
| INFLAME | 7/1/1/1/3 | 2 | 1 | 1 | 跳过；比较组不足100 |
| OFFERING | 10/1/1/0/3 | 3 | 3 | 3 | 跳过；比较组不足100；已有战斗rk仅去重 |
| BLUDGEON | 0/0/0/0/2 | 2 | 1 | 1 | 跳过；比较组不足100 |
| COLOSSUS | 3/0/0/0/2 | 1 | 1 | 1 | 跳过；比较组不足100 |
| FIGHT_ME | 4/2/1/0/2 | 1 | 2 | 2 | 跳过；比较组不足100；已有战斗rk仅去重 |
| UPPERCUT | 2/2/1/0/2 | 1 | 1 | 1 | 跳过；比较组不足100 |
| BLOODLETTING | 7/2/0/0/1 | 1 | 1 | 1 | 跳过；比较组不足100 |
| INFERNO | 1/0/1/0/1 | 1 | 1 | 1 | 跳过；比较组不足100 |

每牌原因、版本/build、行索引、赢家/非赢家条目数、原独立分母、own真实局号与进阶/重试分层均在dispositions.json。程序筛选并保存外部312行（234获得、73升级、5移除）；模型已读24卡五版本次数/单cell概览及1条完整聚合行示例，未逐行通读312行，不能称已逐行审阅全部原统计。完整聚合证据保存在[external-card-rows.json](scratch/external-card-rows.json)。升级/移除不能补成奖励拒选；未见行不补成0次实际动作。combinations.json筛选24ID命中0行，输出保存在external-combination-rows.json；0是该发布表无条目，不是证明牌无用。

## 可计算代理与原始行核查

DuckDB仅内存、threads=2；显式读取scope的11片中2片decisions与2片frames，按506名单join并在聚合前过滤off+len到原切点。共305743决策行/506局、321328状态行/506局；selected ID命中296决策行与11498持有状态行。后两数均为重复观测行，不能充作独立局。其余7片核SHA但未查询；不init/sync，不读原始外部数据库，不复制17GB状态流。

每牌放宽到“某时已持有”代理后只有1～3独立自有局；SETUP_STRIKE唯一局是A0，不能充A10支持。A10/其他进阶、retry_or_predicted_death/no_retry_evidence、胜/败在own_coverage.strata逐项分账，游戏版本均unknown，不与外部v0.111混算。没有本批候选，own_support_runs=[]；覆盖局号另列source-ledger.json，不能把这些局宣称支持尚不存在的建议。

已从原states流按off/len有界seek抽核24行（覆盖24牌，少量一行多牌），每次核原cutoff、行字节数、SHA与run_id，账见[own-card-text-audit.json](scratch/own-card-text-audit.json)。模型已逐张读回24牌所选card object的名称与resolved_rules_text，未通读其余字段；程序另保存完整card object及dynamic_values。完整原始状态只为该局牌文定位而解析，未称模型读过整个状态、整局或完整剧本。图标URI不还原成未观察机制，升级版不当基础版；已持有不反推来源、卡色、奖励是否出现或取得时点。

这24条状态证明可以找到实际牌文，因此不以“所有牌文缺失”为理由；真正未满足的是拿/拒选机会、比较组分母与样本门槛。匹配决策的label全为combat/*，战斗使用无法当card_reward选择。牌组代理仍稀疏；终局关联表也未提供这些ID的组合行。没有因缺因果证明而否决合格统计组：本批没有可供发布的至少100/组比较。

查询方法：read_parquet(显式scope路径列表) JOIN allowed506 USING(run_id)，WHERE off+len<=原切点；decisions在label/card_id/chosen/choice/options/questions匹配`(?<![A-Z_])卡ID(?![A-Z_])`等价边界，frames在deck匹配。所选行引用、实际选项/选择字段、正则与扫描字段在own-card-search.json，schema另存own-schema.json。不声称已扫描所有原生奖励题，文本字段可能缺失/抽取截断；未知选择机会不估分母。

## 来源、反证与消费边界

外部统一external:sts2fun，URL https://sts2.fun/static/sts2_public.db.zst ，采集2026-10-21，原库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`；statistics SHA `4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d`。版本上传总分母2932/683/583/411/1739只作总体背景，不给每张牌借分母。玩家数未知，不读取玩家标识，无法验证跨上传玩家独立性。来源许可未发现明确数据集再分发授权，只留署名聚合，不发布原库。完整来源账本在[source-ledger.json](scratch/source-ledger.json)。

赢家与非赢家原统计同时保留，无选择效应/收益推断。自愿上传、玩家水平、版本/流程差异、存活与终局信息、SL删失及代理缺失均可能混杂；同局重复条目不当独立证据。未提出方向性拿牌建议，不能伪造“反向拿牌收益”，也不把旧战斗rk的机制换成拿牌排序。24牌实际牌文与已有rk只用于定位与去重，不凭预训练补齐机制。

本批未读外部代表时间线（0页），未读自有完整局四section，未产完整剧本。不是流派批，无archetype触发、无#55几何部署声称。策略/rk候选各0、正式发布0、生产工具读回0、自然查询0、采用0、收益测量0；knowledge/rk正式消费者与回放均未验，本批不运行Jev/两臂/A-B/MC/游戏/full。所有科学父保持开放，#54工程完成不关闭#51。

## 未达标通知与停点

主管原文和本批数目/缺口/下一步在[supervisor-notice.md](scratch/supervisor-notice.md)。本轮网络关闭且只许写scratch，故该文件是**待宿主投递**原#51的具体通知，不声称已发GitHub评论或主管已读；也不改共享调度停道状态。按6385924090原文，本单元后原范围素材穷尽，要求宿主停B，本学习者不扩数据、不自行派下一单元。新增0未冒达标；连续零新增的前一批真实计数基线未核，不编造“两批0”判定。此处停道依据是本批固定清单耗尽的明确指令。

未修改代码/正式知识，无提交、无行为发布，因此tsc/vitest/cases均null。使用量、耗时与实际模型/tier不由启动参数推定，本报告不声称原生档位已生效。HEAD及正式文件保持基线。产物完整性另核JSON原字节嵌入及解析相等；gitleaks只扫描本批产物，不读密钥或.env。

## 完整机器结果

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-233358-strategy-proposal",
  "base": "f6361397f0d96b8dd20d9e108e0b69261396dfbd",
  "runs": [],
  "own_support_runs": [],
  "fixes": [],
  "source_commit": null,
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-233358/learner/runs/20261024-233505-33a4b586-2fed-41ff-8399-9e3618798160-strategy-proposal/report.md",
  "external_source": "issue51-single-card-004-final-20261024-r56-stock",
  "input_sha256": "e51055e2087c1862c04067906c0bc1e05abcc0635c8364f1a8377645cc30cfff",
  "external_results": [
    {
      "id": "external-single-card-004-final-r56-stock",
      "state": "waiting",
      "destinations": [],
      "reason": "固定24张已逐张核查并跳过：v0.111取得次数代理1～11，最大单cell独立上传1～8；自有已持有代理每牌1～3局且决策命中均为战斗出牌，无至少100/比较组的拿牌证据。新增策略/rk为0；详见scratch/dispositions.json。需宿主转报#51并停B，通知草稿已落盘，送达与停道未确认。"
    }
  ],
  "decision_output_counts": {
    "cards_reviewed": 24,
    "cards_skipped": 24,
    "cards_with_qualifying_comparison_groups_ge100": 0,
    "new_contexts": 0,
    "same_id_updates": 0,
    "byte_reuses": 0,
    "aliases": 0,
    "strategy_candidates": 0,
    "rk_candidates": 0,
    "knowledge_candidates": 0,
    "statistical_rows_retained": 312,
    "existing_related_rk_references_only": 4,
    "formal_published": 0,
    "production_consumer_readbacks": 0,
    "natural_queries": 0,
    "natural_adoptions": 0,
    "measured_benefits": 0
  },
  "coverage": {
    "cards": 24,
    "frozen_manifests": 3,
    "frozen_artifact_leaves": 129,
    "verified_package_items": 132,
    "own_scoped_runs": 506,
    "raw_state_rows_audited": 24,
    "external_representative_timelines_read": 0,
    "complete_playbooks": 0,
    "dispositions_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-233358/learner/runs/20261024-233505-33a4b586-2fed-41ff-8399-9e3618798160-strategy-proposal/scratch/dispositions.json",
    "mapping_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-233358/learner/runs/20261024-233505-33a4b586-2fed-41ff-8399-9e3618798160-strategy-proposal/scratch/context-mapping.json"
  },
  "formal_publication": "pending",
  "consumer_readback": "pending",
  "supervisor_notification": {
    "state": "pending-host-delivery",
    "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-233358/learner/runs/20261024-233505-33a4b586-2fed-41ff-8399-9e3618798160-strategy-proposal/scratch/supervisor-notice.md"
  },
  "lane_after_unit": "B-exhausted-stop-requested; scheduler-confirmation-pending"
}
```
