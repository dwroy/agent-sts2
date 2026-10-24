# 休息／锻造与路线：冻结外部批候选报告

本批仅处理 external-decision-rest-route-001。实际新增 **2 条候选：1 strategy + 1 描述性 knowledge**；更新0、复用0、rk0。达到两侧上传分母≥100的候选1条；附表24个版本/build/幕比较中18组满足，不能把18组计作18条策略或累加成独立局。正式发布0、消费者读回0、自然采用0、验证因果收益0，科学父保持开放。

两份真实候选分别为 `rest-strategy-candidate.json` 和 `route-knowledge-candidate.json`；均为 formal_publication=pending、consumer_readback=pending。路线条目只是限定样本内的方向性描述，不是完整流派剧本或正式StrategyEntry。

## 身份、授权与来源

- batch=20261024-121311-strategy-proposal，plan=issue51-decision-rest-route-20261024-001；learn.json对应行、工作树、external_source、external_binding均相符。HEAD实际=fba9cd72d0a407edc34442a4cea4c1c0d481e647，与dispatch_base相同。
- 输入清单39302字节、SHA256=4b9303b9ac358c280a576bd495ea2921dfd3733132bd3c5190f7ec061114aaee；work_spec4885字节、SHA256=d638f956e6d38aece12b6abee9e376a5d13344df8557164d64a36ea5fcb1a711。清单、契约、三份manifest及其所列绑定文件共149项核SHA/大小，见binding-audit.json；缺省折叠文件按基线blob物化，没有改输入。
- #27/#42按brain-strategies及learning-protocol §9.1，#28按jev-encounter-reflex合同核边界。既有休息条目限具体Boss备战代价，未发现同场景HEAL/SMITH选择混杂条目；无rest用途rk。保留原ID及本系统证据，不覆盖、不把相邻题型当同场景复用，见dedup-audit.json。
- source=external:sts2fun；URL=https://sts2.fun/static/sts2_public.db.zst，采集/下载日2026-10-21；原数据库SHA256=1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5。公开FAQ未发现明确再分发许可，仅署名聚合和授权匿名派生证据，不分发原库。
- 外部Silent/A10、单人、有效、非弃局、无modifiers；5版本原分母2932/683/583/411/1739上传，共6348。上传行不是独立玩家，SL未知。没有机制改动对照，按5版本及8build分列，**未把未知补成机制未改，也未混并版本或build**。
- 决策统计SHA256=4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d；代表轨迹SHA256=dfde8d6ec66f58fca63ca30d45d86d47c2d822e807e9f77f65cb3c4c65268eda。每条来源、原分母、反例、代理、适用范围详source-ledger.json。

## 真实字段入口与读取范围

先用原build_stats_view readiness --limit 3，回执为partial_proxy；再按field/version读取12字段×5版本，共60个availability查询/96个build-field记录。休息选择5版本共130cell、7页全部读出；代表局按原sts2fun_build_view、cluster0/v0.111、offset0..9、每页一对，完整保存20个投影883节点。合计78页，均≤32768字节，保留artifact SHA、offset/total/next_offset，见page-index.json；派生脚本derive.py只读这些页，可复算统计。

模型完整逐节点阅读的是pair offset0的2个投影98节点；另外18个投影785节点由脚本统计且全节点原样保存，**没有冒称模型逐节点通读**。路线候选只用可复算节点计数，不解释这18局未阅读的意图/玩法。其余140个外部代表投影未读；其他决策字段仅核可用性、未展开条目统计。没有从模型预训练知识补机制或牌值。

| 类别 | 实际available/partial | unavailable/unknown与代理 |
|---|---|---|
| 休息／锻造 | rest_site_choices有38454选择/37295非空节点；upgraded_cards有31941牌次 | 真实选择前HP不可用；前节点末HP仅代理；升级与选择非逐动作一一对应 |
| 开局祝福 | ancient_choice按幕/选项/实选记录 | 第一幕只为祝福代理，未核每局实际首节点；本批不扩冷启动结论 |
| 商店 | bought_colorless/relics/potions有显式记录 | bought_cards在207997节点全缺失，不当作零购买；普通商店所得牌仅取得代理 |
| 删牌 | cards_removed有记录 | 付费来源未知，房间只为来源代理 |
| 事件 | event_choices有title定位键/表 | 完整备选/变量/意图未知，event房间不等同地图问号 |
| 药水 | 获得/实选/使用/丢弃为节点级 | 即时HP/时机/真实持药机会分母不可用；不扩本批用药结论 |

自有506终局/114代表的冻结身份与排除契约已核，**未逐局读取自有完整局，不产own-only结论**。自有game_version=unknown，no_retry_evidence不等无SL；Z2手动整局、KF9末态缺失排除，BP9不在本冻结。runs=[]、own_support_runs=[]，外部分母未加入本系统局号。

## 候选1：第一幕休息的资源混杂

情境→做法：当前第一幕休息题中HEAL/SMITH均合法时，按当前真实HP与后继风险比较，不凭SMITH组较高终局胜率排掉回血。

方向／幅度／样本：v0.111.0/A10第一幕，HEAL/SMITH前节点末HP代理均值23.75/41.60，相差17.85血，原选择条目2071/2990次；组内上传去重分母1254/1458，获胜上传372/465，比例29.67%/31.89%、差2.23pp。这里重新用winning_uploads/distinct_uploaded_runs计算，**不同于原条目加权590/2071、1030/2990**。HP均值按条目加权，不是上传等权，也不是选择前真实HP。两组可能来自同一上传，不相加、不称同HP对照或升级收益。

一行适用范围：仅Silent A10/v0.111.0第一幕；当前题面提供真实HP与合法选项，其余版本、进阶未验证；没有数据支持固定回血线或固定升级命令。

目标ID=silent-brain-act1-rest-smith-resource-proxy。附表不是追加策略：每个build/幕两组原分母、资源代理与反向结果如下（比例差为SMITH−HEAL，非因果）：

| build | 幕 | HEAL获胜/上传 | SMITH获胜/上传 | 比例差pp | 前节点HP代理差 | 两侧n≥100 |
|---|---:|---:|---:|---:|---:|---|
| v0.107.0 | 1 | 199/761 | 255/871 | +3.127 | +19.566 | 是 |
| v0.107.0 | 2 | 181/502 | 243/531 | +9.707 | +21.905 | 是 |
| v0.107.0 | 3 | 178/308 | 227/354 | +6.332 | +17.984 | 是 |
| v0.107.1 | 1 | 353/1416 | 420/1473 | +3.584 | +18.598 | 是 |
| v0.107.1 | 2 | 347/874 | 415/870 | +7.999 | +20.335 | 是 |
| v0.107.1 | 3 | 308/528 | 403/612 | +7.516 | +18.057 | 是 |
| v0.108.0 | 1 | 146/485 | 199/547 | +6.277 | +19.126 | 是 |
| v0.108.0 | 2 | 152/334 | 177/325 | +8.953 | +20.266 | 是 |
| v0.108.0 | 3 | 133/211 | 170/237 | +8.697 | +19.299 | 是 |
| v0.109.0 | 1 | 85/321 | 118/379 | +4.655 | +20.305 | 是 |
| v0.109.0 | 2 | 89/219 | 117/232 | +9.792 | +22.815 | 是 |
| v0.109.0 | 3 | 85/140 | 110/169 | +4.374 | +21.284 | 是 |
| v0.109.1 | 1 | 31/94 | 41/111 | +3.958 | +20.422 | 否，仅留描述 |
| v0.109.1 | 2 | 35/78 | 41/79 | +7.027 | +21.895 | 否，仅留描述 |
| v0.109.1 | 3 | 30/54 | 37/57 | +9.357 | +22.048 | 否，仅留描述 |
| v0.110.0 | 1 | 0/9 | 1/10 | +10.000 | +23.045 | 否，仅留描述 |
| v0.110.0 | 2 | 1/7 | 1/8 | -1.786 | +21.189 | 否，仅留描述 |
| v0.110.0 | 3 | 0/3 | 0/2 | +0.000 | +14.000 | 否，仅留描述 |
| v0.110.1 | 1 | 72/297 | 102/327 | +6.950 | +18.311 | 是 |
| v0.110.1 | 2 | 75/196 | 102/210 | +10.306 | +21.584 | 是 |
| v0.110.1 | 3 | 75/130 | 96/151 | +5.884 | +19.372 | 是 |
| v0.111.0 | 1 | 372/1254 | 465/1458 | +2.228 | +17.849 | 是 |
| v0.111.0 | 2 | 349/893 | 433/945 | +6.738 | +19.924 | 是 |
| v0.111.0 | 3 | 341/607 | 414/650 | +7.514 | +19.556 | 是 |

反向结果与限制：v0.110.0第二幕HEAL1/7、SMITH1/8为−1.786pp，第三幕两组均0胜；不并入v0.111、不隐藏小样本。v0.111第一幕HEAL也有372个获胜上传，SMITH有993个非获胜上传。自选上传、玩家/打法、牌组、资源、重复选择加权及生存混杂均未控制；因缺真实选择前HP不能计算HP条件选择效应，但已产出合格的宽代理方向性条目，没有让整批waiting。

## 候选2：所选轨迹每幕精英暴露的方向性描述

目标ID=silent-external-selected-route-exposure-001。固定cluster0仅作抽样标签，**未命名玩法，也不将终局簇作为在线事实**。10胜10负是原代表配额、前5节点近邻选择；不是总体胜率抽样。本候选保留一条整合观察，不按三幕拆三条。

一句方向＋幅度＋样本：所选v0.111/A10轨迹中，赢家相对输家的首次Boss前精英数均值差第一幕+0.50、第二幕−0.10、第三幕+0.40个（分别10/10、10/10、10/6上传），方向随幕改变。

情境→做法：幕初审查路线时，把精英个数作为暴露描述，并核当前资源、实际可选后继节点；这些数值不产生固定每幕精英目标或路线优劣排序。

一行适用范围：仅冻结簇0所选20匿名投影的观察关联；首次Boss前累计，未到Boss则计至终止，死亡删失与胜负配额保留，不外推6348总体或一般进阶。

| 幕 | 整局结局组 | 已观察本幕上传 | Boss到达代理/上传 | Boss前或终止前精英均值 | 范围 |
|---|---|---:|---:|---:|---|
| 1 | 非获胜 | 10 | 10/10 | 1.30 | [0, 2] |
| 1 | 获胜 | 10 | 10/10 | 1.80 | [1, 3] |
| 2 | 非获胜 | 10 | 8/10 | 2.10 | [1, 3] |
| 2 | 获胜 | 10 | 10/10 | 2.00 | [0, 3] |
| 3 | 非获胜 | 6 | 3/6 | 1.50 | [0, 3] |
| 3 | 获胜 | 10 | 10/10 | 1.90 | [1, 3] |

反例与删失：第二幕方向反转（2.0 vs 2.1）；第一幕输家10/10也见Boss，不能把到达当通过。第三幕非获胜只有6个上传可观察；早死截短精英暴露，不能把较少精英解释为主动绕开。完整锚点pair0中赢家三幕Boss前精英1/3/3、输家2/2/1，两者均到第三幕Boss，且输家第三幕末节点HP0；不是同牌组、同资源或路线反事实。两条投影是匿名内容摘要，不是本系统局号或真实入场全字段快照。

## 低血绕精英／问号与后继Boss：代理已算，选择结论局部待证

没有真实选择前HP，也没有未走地图分支。已用可计算代理继续：各幕Boss前记录转换，按前节点末HP/最大HP的经验P25分箱，每上传每幕只取首个合格转换；然后列已实现elite/event/other房间及以后是否记录首次Boss。分位值是事后描述，不作为当前触发或安全阈值；event仅实际房间，不冒问号或主动绕路。完整转换审计见low-hp-route-proxy.json。

| 幕 | 描述P25资源代理 | 已实现下一房间代理 | 上传分母 | 后续Boss记录数 |
|---|---:|---|---:|---:|
| 1 | 0.485714 | elite | 1 | 1 |
| 1 | 0.485714 | event | 2 | 2 |
| 1 | 0.485714 | other | 14 | 14 |
| 2 | 0.553191 | elite | 0 | 0 |
| 2 | 0.553191 | event | 3 | 3 |
| 2 | 0.553191 | other | 13 | 11 |
| 3 | 0.586667 | elite | 0 | 0 |
| 3 | 0.586667 | event | 4 | 4 |
| 3 | 0.586667 | other | 7 | 4 |

9组最大14上传；0分母保留为无观测，不作0风险/0%到达率。幕内每局只入一个组，幕间仍可重叠。没有可选精英/问号的机会分母、地图投影或当前决策状态，不能辨认“有分支而选择绕开”，所以该子项不造策略；这不是因缺因果证明否定方向性统计。每幕精英计数和Boss记录的可核描述已经单独保留为候选2。

## 去向、检查及保留边界

- rest-smith-recorded-choice：candidate；真实选择字段与逐cell上传去重分母可用；当前第一幕两组均>=100；构成一条策略，不按三幕/旧版本重复拆条。
- rest-real-pre-choice-hp：waiting；选择前真实HP不可用；已给previous_node_end_hp_proxy与每项n/missing_n，不能学同HP条件效应/安全回血线。
- per-act-elite-exposure：descriptive-candidate；通过一对一页reader保存20局883完整节点，脚本可重算每幕Boss前精英数；胜负配额/死亡删失分列，不外推总体。
- low-hp-elite-event-boss-arrival：proxy-descriptive-local-waiting；已算每幕前节点HP比例P25及每上传首个合格转换，9组0..14上传；event非问号、无可选分支与拒选机会，不能识别主动绕路。0组分母不是零风险；保留观察表，不造路线选择策略。
- rk：waiting；无冻结的原状态/候选Plan/完整结果矩阵或同资源反事实；仅保留#28来源与两臂回放要求，未造predicate/开关或启模型。
- full-archetype-playbook：not_claimed；本任务是决策单元；未核三输入同流派完整自有局与四表偏离，不冒完整流派剧本。

无源码、正式知识、main/live、运行状态或请求登记改动；source.diff为空，HEAD保持dispatch_base。没有调用游戏、网络、模拟或模型，无下级模型。tsc/vitest/cases均null；生产parser与固定离线检索检查通过，正文506 UTF-8字节，实际含证据与派生分母的检索块3835字节，小于4096。act2、缺act不匹配；Ironclad角色保护保持原请求。**此为离线格式/可消费结构检查，不是正式消费者读回或收益。** 首次scratch校验相对导入多一级而失败，修正scratch导入后通过，原失败见validation-attempts.json；未改生产代码。

正式发布仍需原发布锁、学习账本与实际消费者读回，之后再核自然采用/收益；本批只写scratch来源账本，不改正式账本或发布编号。#28缺冻结state/Plan/候选完整结果与两臂留出回放，不造rk或自行开关。科学父不关闭；没有重新派旧Boss/刀009/药水/冷启动任务。冻结规格未给连续零新增数值基线，保持unknown，不自行补0；本批新增2。

使用档位、使用量和耗时没有核原生turn_context/服务回执，不把启动参数当已生效档位。gitleaks与最终字节一致性结果另存final-integrity.json；可核产物SHA另存artifacts.json。

以下回执由result.json原字节嵌入，最终输出使用同一JSON。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-121311-strategy-proposal",
  "base": "fba9cd72d0a407edc34442a4cea4c1c0d481e647",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-121311/learner/runs/20261024-121403-664f2816-d205-452a-87fa-ff4d0f919454-strategy-proposal/report.md",
  "external_source": "issue51-decision-rest-route-20261024-001",
  "input_sha256": "4b9303b9ac358c280a576bd495ea2921dfd3733132bd3c5190f7ec061114aaee",
  "external_results": [
    {
      "id": "external-decision-rest-route-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-act1-rest-smith-resource-proxy",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-121311/learner/runs/20261024-121403-664f2816-d205-452a-87fa-ff4d0f919454-strategy-proposal/rest-strategy-candidate.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-external-selected-route-exposure-001",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-121311/learner/runs/20261024-121403-664f2816-d205-452a-87fa-ff4d0f919454-strategy-proposal/route-knowledge-candidate.json"
        }
      ],
      "reason": "新增1条休息策略和1条路线描述性知识候选。24组休息比较按版本/build分列，18组两侧上传分母均≥100；策略仅覆盖v0.111.0第一幕。路线20条配额代表投影保留删失与代理限制；真实休息前HP、可选分支/问号及绕路效应局部waiting。正式发布、消费者读回、自然采用均为0。"
    }
  ]
}
```
