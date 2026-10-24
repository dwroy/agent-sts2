# 冷启动决策单元 external-decision-cold-start-001

本批新增 **2条候选：1 strategy、1 grouped descriptive knowledge**；更新/复用0、rk0。达到两臂各100上传局的**比较组6个**，其中5个v0.107.1、1个v0.111.0；不是6条知识，也不是6个独立总体。正式发布0、消费者真实读回0、自然采用0。科学父继续开放。

## 身份与边界

- batch：20261024-124312-strategy-proposal；角色Silent；plan：issue51-decision-cold-start-20261024-001。
- learn.json实际external_source、external_binding的清单/规格/dispatch_base已核；HEAD=3a0759222655f4cd35e44f1debc2e2bb288fb3f2，始末相同。
- 冻结manifest SHA：d97152b0440e2abab398dcfa9412d0084f2be3cc012dc16f922205bb209ee109（39298字节）；work_spec SHA：cb41036e7ddf7b0c39871fcadbe14097b04cffd0081eae1774e5def2c6fa9efa（4909字节）。
- 三manifest、three-input-freeze及实际读取路径按绑定核字节/SHA。149次引用校验（含重复引用）只证明字节，不证明通读/完整剧本。见scratch/identity-verification.json。
- 原始来源 https://sts2.fun/static/sts2_public.db.zst ，下载/采集2026-10-21；数据库SHA=1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5；来源 external:sts2fun；observational。公开FAQ未找到明确数据再分发许可，只保署名聚合与既授权脱敏投影，不发布原库/玩家标识。
- 本次没有联网、原库/玩家数据/游戏二进制读取、模型调用、对局、源码/正式知识改动、main/live合入或共享状态登记。候选与来源账本均在本run/scratch；runs=[]、own_support_runs=[]。
- 原生模型档位、服务档与token/耗时没有本批实际请求回执核证，均不从启动参数推定。本报告不报采用档位、费用或累计运行时间。

## 读取范围及字段入口

先用指定reader读取readiness(limit=3)，随后保存143个manifest核SHA的有界页：readiness 1、availability 5、ancient_choice decisions 133、完整代表配对2、timeline 2。页文件均≤32768字节，offset/total/next_offset、原artifact SHA与页SHA保存在scratch/page-index.json。没有截断单节点或代表轨迹。

程序分页覆盖5版本的1575条ancient统计行，第一幕419行形成220个build/item单元；用于产出的6个单元共12条原记录已逐项核对。其他低样本/缺臂单元与所有负向差保存在scratch/ancient-act1-comparisons.json，不把未合格214个单元删成不存在。模型只对候选所需行及历史反向行作游戏结论核读，其余第二/三幕行不解释。

字段覆盖104个build/field单元已按版本读回：ancient_choice、cards_removed、event_choices、药水获得/使用/丢弃、rest_site_choices及upgraded_cards有记录；普通bought_cards在207997节点全部missing/null，状态“不可用”，不能当零次购买。无色牌/遗物/药水显式购买字段仅部分节点有值，cards_gained仅是所得代理。缺失不是没有动作。祝福仅首幕ancient代理，事件只有title定位信息，药水只有节点级而无机会分母/即时资源，休息前HP未知。没有扩展至另两决策单元。

外部原分母为6348上传行，版本分别v0.107=2932、v0.108=683、v0.109=583、v0.110=411、v0.111=1739，8个build仍分列。独立玩家数未知；同玩家相关性未调整。没有机制未改的冻结依据，所有版本/build保持分开，不把unknown写成未改。

## 候选与统计

1. **silent-brain-opening-golden-pearl-external-comparison**：scratch/strategy-candidate.json 为完整brain-strategies-v1结构，纯外部confidence=0.25。情境→做法：Silent A10/v0.111.0首幕开局题实际含GOLDEN_PEARL时，把它保留为值得比较的候选，按现场牌文和本局计划核用途。选择34/111、出现未选24/110，整局胜率30.63%对21.82%，观察差 **+8.81个百分点**。适用范围只到该版本/首幕祝福代理，未知机制/备选/玩家/路线使它不能成为必选命令、因果收益或首Boss通过率。
2. **silent-external-cold-start-ancient-build-associations**：scratch/knowledge-candidate.json 是1条分版本的描述知识候选，以下6个比较组作为完整证据子表；未把6行拆成6条新增。旧版本达到门槛的5组已实际交付，不因版本机制未知而整组停产，也不外推当前版本。

| build | 原始TextKey | 选择：整局胜/上传局 | 出现未选：整局胜/上传局 | 差百分点 |
| --- | --- | --- | --- | --- |
| v0.107.1 | CURSED_PEARL | 37/112 | 19/110 | +15.76 |
| v0.107.1 | KALEIDOSCOPE | 22/143 | 28/102 | -12.07 |
| v0.107.1 | LEAD_PAPERWEIGHT | 25/101 | 29/133 | +2.95 |
| v0.107.1 | NEOWS_BONES | 10/108 | 26/124 | -11.71 |
| v0.107.1 | SILVER_CRUCIBLE | 33/136 | 37/132 | -3.77 |
| v0.111.0 | GOLDEN_PEARL | 34/111 | 24/110 | +8.81 |

逐行适用范围：只限表内原build、Silent A10、单人/有效/未弃局/无modifiers、第一幕EVENT.NEOW的对应ancient选项。分母取distinct_uploaded_runs，且这12臂item_occurrences各等于其本臂分母；跨臂/跨item交集未知，不能求和充当独立局。存在未选是有明确was_chosen=0的提供选项，不以缺字段作对照。

GOLDEN_PEARL反向结果：v0.108.0选择8/31、出现未选14/42，差-7.53点；v0.110.1为4/20对8/31，差-5.81点，均小样本。v0.107.0、v0.107.1、v0.109.0、v0.109.1的原臂也保留，v0.110.0缺选择臂不补0。完整同ID各build统计与旧五项反例见knowledge候选all_same_item_build_cells及全量比较文件。策略标evidence_status=conflict，并指向该反证文件，保留历史异质性；当前两臂证据没有被当作跨版本一致。

这些是未控制备选组合/玩家/开局牌组/后续路线的观察关联，未作ancient比较族多重校正，不报显著性或置信区间。原四表组合族BH显著0的结论未改，也不把它当本批祝福收益验证。节点末金币/HP没有拿来充当决策前事实。

## 三个局部缺证子项与代理

详scratch/subitem-dispositions.json与cold-start-trajectory-diagnostics.json。

- **前三战拿牌类型：partial-waiting。** 读取cluster0与3各offset0的一整对，共4匿名轨迹/172完整节点，保原safe_projection_sha256、原列与全部节点。前三个“已记录单战斗节点”是边界代理，不能保证包含所有未记录事件战；实际实选ID/顺序已输出，不凭名称补攻击/防御/技能机制分类。缺历史版本对齐的类型与总体早期比较，故不发固定类型/张数策略。簇仅作索引，不命名玩法。
- **跳过与第一幕Boss：partial-waiting。** fbf4ba3c208a6374前三战节点2/3/6实选BLADE_DANCE、CLOAK_AND_DAGGER、全未选且无所得；后继第二幕已见，是“跳过代理仍有首Boss通过代理”的1例。另3例前三战均实选也各有后继第二幕。四例首Boss通过代理：skip组1/1、无skip组3/3，缺失败对照且按终局簇/胜负配对选例，不能算收益或总体通过率。商店all-false但另有cards_gained的节点没有被当作奖励skip。
- **Boss前牌组：partial-waiting。** 四例已严格取boss_node之前的实选奖励前缀代理，明确排除同Boss节点的奖励；实际战前牌组快照填null。原timeline只对已观察下一幕的赢家给幕末事后还原，包含首Boss后奖励，不代战前快照或最低可行牌组。前缀漏初始/商店/取得/删改/升级，前节点末HP只标代理。当前触发不引用终局牌组、终局簇或未来胜负。

四个代表局原投影：projection-fbf4ba3c208a6374(49节点)、projection-5ed8689256202508(49)、projection-7f11e27082146136(49)、projection-854cbe948c146a68(25)。cluster3对前三战实选ID相同、第一幕Boss均有后继，但整局胜负不同；没有把相同前缀解释为充分条件或拿牌因果。仅读2/80配对，不称10–20轨迹的流派研究，更不称三输入完整剧本。

自有506终局/114代表局manifest仅做冻结字节核验，没有自有game四section语义通读或自有支持/反证升级；本批不称own-only结果、无SL或与外部一致。自有game_version仍unknown，no_retry_evidence不等无SL。Z2/KF9排除沿原冻结，BP9和后续局未纳。没有把自有局号或终局分母加入外部。

## #27/#28/#42合同、完整性与后续状态

已核brain-strategies/schema、learning-protocol 9.1及#28来源/固定回放合同。dispatch_base策略库30条、reflex85条无同一祝福场景；原ID与SHA保存在scratch/contract-overlap-audit.json。BLADE_DANCE早期拿牌、同族/墨影备战旧ID只有相关性，缺本批新比较证据，不强称更新或复用；原证据保持。

#28没有回合/原Plan/逐候选结果/capture，不造rk、不回放模型、不改开关。本批无源码/规则实现提案，code_proposals、implementation_domains、proposal_results为空。

策略候选经现有生产parseStrategyLibrary及JSON Schema固定数据校验，模拟事件题命中；完整检索包3603/4096字节，第二幕与card_reward不匹配，own_runs/own_support_runs均0。它只是离线格式/容量检查，consumer_readback仍pending。初次校验脚本落盘用了错误相对工作目录，未执行校验；改为正确路径后实际通过，不隐去该命令失败。没有源码改动，tsc/vitest/cases均null；未跑全套代码测试。gitleaks扫描及最终JSON/页SHA核验见scratch/final-validation.json。

scratch/source-ledger.jsonl逐候选记source、版本/采集日/SHA、各臂分母、反例/限制、目标ID与路径；formal_publication=pending、consumer_readback=pending、natural_adoption=pending。知识候选没有自动StrategyEntry消费者，不冒格式验收即发布。后续仍由原owner沿发布锁、正式账本、live消费者真实读回和自然采用接续；当前阶段不关闭#51科学父。本批数值连续零基线未提供；实际新增2，不扩批次。

## 最终机器回执

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-124312-strategy-proposal",
  "base": "3a0759222655f4cd35e44f1debc2e2bb288fb3f2",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-124312/learner/runs/20261024-124411-8d06fb87-5615-4697-95e0-977b5c6c5801-strategy-proposal/report.md",
  "external_source": "issue51-decision-cold-start-20261024-001",
  "input_sha256": "d97152b0440e2abab398dcfa9412d0084f2be3cc012dc16f922205bb209ee109",
  "external_results": [
    {
      "id": "external-decision-cold-start-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-opening-golden-pearl-external-comparison",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-124312/learner/runs/20261024-124411-8d06fb87-5615-4697-95e0-977b5c6c5801-strategy-proposal/scratch/strategy-candidate.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-external-cold-start-ancient-build-associations",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-124312/learner/runs/20261024-124411-8d06fb87-5615-4697-95e0-977b5c6c5801-strategy-proposal/scratch/knowledge-candidate.json"
        }
      ],
      "reason": "已落盘1条开局策略与1条描述知识候选，保留6个两臂样本均≥100的版本内比较组及反向结果；前三战类型、跳过与首Boss结果、Boss前牌组仅有代理诊断，三子项partial-waiting。正式发布/消费者读回/自然采用均0，科学父保持开放。"
    }
  ]
}
```
