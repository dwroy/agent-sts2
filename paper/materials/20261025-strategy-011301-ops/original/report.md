# WATERFALL_GIANT_BOSS 外部单元 004 候选报告

本批已完成5个不同窗口的文字/rk配对候选：真实新增情境3、既有情境补充2。5对不是5个全新经验，也不是正式发布。只有scratch产物，merge=no，HEAD保持dispatch_base；没有改源码、正式库、共享统计、main/live或开卷，没有新模型、MC、Jev、游戏、full或强制tick。

身份为20261025-011301-strategy-proposal，角色Silent。learn.json本批external_source、external_binding、candidate_mode与工作树、冻结manifest/work_spec大小及SHA均核同。详细原件见scratch/identity-verification.json。原生模型/推理档位/tier未独立读取，不把启动参数、任务文字或额度策略当成实际回执。

## 输入、主题与契约

只处理精确boss字段 `ENCOUNTER.WATERFALL_GIANT_BOSS`；overlap_with引用到该Boss的其他行不计本单元。精确选择得到40行、五版本各8终局簇。stock-selection.json按绑定SHA核过，但该文件未另列Boss清单；本单元选择依据冻结work_spec的唯一主题原文，不改原输入、不扩范围。

#27/#28/#42/#55相关冻结契约大小及SHA核同，阅读了策略、来源、reflex和检索条款。三包冻结清单实际是3个manifest与129个产物叶，共132项，全部核同；任务简称“132叶”与实物有口径差，本报告保留差异、不补造叶。11个只读Parquet大小/SHA也均核同，不以nlink变化判坏。inputs核验见scratch/input-verification.json与own-shard-verification.json。

外部来源统一external:sts2fun，URL https://sts2.fun/static/sts2_public.db.zst ，下载2026-10-21，原库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`。输入manifest SHA为 `4db3c98f608b7f758f81a38667a0d2c5a3459b83086a898cfc0f1e4f71a0b1d2`。未读原始外部数据库、玩家标识或重新下载。许可无明确再分发授权，保留署名，仅聚合与已授权匿名投影；详见每条evidence中的license和限制。

## 逐情境结果

| 窗口与处置 | 一句方向、幅度、样本 | 当前适用范围 |
| --- | --- | --- |
| PRESSURIZE建立，新增 | 比较跨轮建立与当轮输出；2K4 F17 T1敌250→212，毒雾0→2、下轮抽牌0→2，次轮HP66不变；1独立局/1机会。 | 当前巨兽PRESSURIZE、毒雾与猎杀者确实合法；次轮已有16攻，不能承诺继续零伤。 |
| STOMP建立兼防护，新增 | 同线比较建立与防护；2K4 T2毒雾2→5、敏捷0→2、来袭16→12、挡0→14、次轮HP不变；1局/1机会。 | 当前STOMP、生存者/偏折/步法/毒雾与实际虚弱药均合法；T3已有敏捷仍损1血，非单牌/用药因果效应。 |
| EXPLODE生存，既有同ID补充 | 依据当前可用挡/减攻保留生存线；2K4和456两局两机会后继分别净损17/14血；ATP边界1局1机会26→0。 | 当前EXPLODE及实手牌/HP；原36局机制与14场58试另账，原经验/反证不覆盖，不定安全HP或药时。 |
| 末火取舍，既有同ID更新 | 比较真实HP缓冲与具名升级；A10无重试证据16局/16末火，14个HEAL至首战斗净增代理均21.93（16—27），2个SMITH为0。 | 旧第一幕rest触发保持；本补充仅巨兽F16合法选项。0DJ 39→61实核；ATP 53不变且后败不归因升级。 |
| 末店步法预算，新增 | 比较当下持续防护、即时减攻/输出和留金，买入与建立分开；2K4 F14花77金至0，T2才建2敏捷；1局/1店。 | 巨兽前F13—16、已持毒雾且步法在售并可付；当时尖啸24、飞镖76可付，替代购买未执行，不能排最优顺序。 |

当前trigger不含未来结局、终局牌组、簇号或未来SL。strategy无法静态表达的move/可打/价钱等条件明确放正文，rk用现白名单表达已有字段；购物rk不能比较动态价格与金币，保留正文人工复核，未扩schema。标签是描述性提醒，不改出牌/药水/SL或终局数值规则，因而无源码提案。

scratch/experience-strategy-rk-map.json给逐情境ID、来源、统计、去向、disposition与限制。末火沿用 `silent-brain-act1-rest-smith-resource-proxy`，原evidence与confidence=0.4均保留；新条目confidence=0.3仅学习者低可信描述赋值，不是收益校准。EXPLODE指向原 `silent-giant-explosion-window`，保留原高可信机制记录，不给旧经验重新加分。两项均不算新增情境。新策略ID4/同ID更新1，新rk5，知识ID新增0/补充1。旧成果的表示转换不冒新增科学发现；没有逐字节复用计数。

## 分母、版本、反例与代理

外部精确Boss统计如下，原输入是上传行/记录战斗；相同自然局重复上传和独立玩家数未知。各行只在该版本互斥终局簇内做描述汇总，不把overlap单元相加。没有依据证明版本机制未改，因此不跨版本汇总；旧major桶的subbuild原分母保留，不解释为已核跨patch机制等价。

| 版本 | 该Boss上传/战斗记录 | 延续/胜代理 | 总受伤均值HP | 原subbuild分母 |
| --- | ---: | ---: | ---: | --- |
| v0.107 | 401 | 319/401 | 28.69 | {"v0.107.0": 146, "v0.107.1": 255} |
| v0.108 | 89 | 64/89 | 26.71 | {"v0.108.0": 89} |
| v0.109 | 86 | 68/86 | 30.00 | {"v0.109.0": 63, "v0.109.1": 23} |
| v0.110 | 57 | 51/57 | 25.82 | {"v0.110.1": 56, "v0.110.0": 1} |
| v0.111 | 242 | 193/242 | 27.66 | {"v0.111.0": 242} |

v0.111原总体1739上传不作为本Boss动作分母；242条中193条为延续/胜代理、49条终止非正HP，均非已认证单战胜率。gross_damage不是净掉血，前节点末HP也非真实入场快照。五个候选中外部数据都只作整战方向背景；实际动作窗口的主证据来自自有，不混分母，不拿242当各窗口样本。没有双方比较组各≥100的新动作比较（0条）；≥100的v0.111 Boss背景组1个，不冒单牌或因果门槛。

自有查询DuckDB仅内存、threads=2、nice、显式11片名单，先按506名单及off+len≤原各流截止过滤。91局曾见一幕该目标，78局有实际WATERFALL_GIANT战斗帧；未到遭遇的13局另列，不算战斗成功。A10无重试证据16局、重试/预判证据52局；其余A0=2/A1=1/A2=1/A4=1/A5=1/A6=4分别留账。无重试证据不证明无SL；首记录战斗HP/药栏为代理；SL触及不报单次净损或首试胜率。自有版本均unknown，可能含不同脑引擎，未当成同版本/纯Codex收益。Z2、KF9、BP9及后续均未纳入；结果身份runs=[]，自有支持局另列own_support_runs。

已读外部v0.111完整匿名轨迹四例、两个一对一页：f9ea…49节点赢家、92f2…25节点整局失败但过巨兽、2b5a…17节点巨兽末HP0，以及配对附带2e5b…49节点赢家。最后一例首Boss为其他遭遇，虽然完整阅读，但从本主题结论排除。前三例提供反向边界：赢家可有大量治疗，整局失败也可过此Boss，末火回血仍可能在此Boss终止。比如2b5a的7→28后Boss 28伤/0治疗到0，不能把“休过”当安全。外部累计受伤/治疗与卡牌奖励前缀不补成真实牌组、开场资源或逐回合时机。

## 覆盖与交付边界

程序核132项输入、11冻结分片，并在允许范围提取28221目标帧、27264条决策、134条SL记录；这是程序覆盖，不是模型通读。模型实际通读上述四外部代表的全部140节点，其中本主题三代表91节点；实际抽核2K4 T1/T2/T3/T9/T10、456 T9、ATP T12共7个原始战斗窗口及每窗三个前后投影。原始seek33条另有初始试读1条，各有offset/bytes/SHA/截止；首次相对日志路径不存在时未读到字节，后改用原项目logs，不扩截止。四个原始休息/商店问题完整保存在scratch，但模型只读相关选项、执行和后继，未通读全部问题原文或模拟附件。其余轨迹、手牌、原始题目与自有整局四section未模型通读。具体read/unread清单见scratch/coverage.json。

不声称完整流派剧本，不命名终局簇，不以测试几何绑定archetype。晚段奖励可算出43题/16无重试证据局、5跳过，但不足支持具名排序，列为局部waiting而未硬凑第六条。安全HP、清体时机、必喝药及因果比较亦缺同起点证据。交付5不同情境中仅3新增、2补充，已达到5窗口下限；未声称5新增。没有连续两批零新增情形，本批不自行开下一单元。

可发布候选分别在scratch/strategy-candidates.json、rk-candidates.json、rk-vocab-candidates.json，经验补充在knowledge-candidate.json；来源账本source-ledger.json、逐版本/自有分层与raw-seek-ledger.json可核。所有条目的formal_publication与consumer_readback逐项pending。旧成果反证与差异在dedup-audit.json保留，mixed证据状态unassessed，不把不同端点误写aligned。

最终parseStrategyLibrary、5个validateReflexEntry、validateReflexVocab及隔离真实loader全部通过；只是候选格式核验，不是生产消费者读回。原tsx CLI曾因沙箱IPC EPERM失败，改用node --import原loader后可校验；第一次格式检查发现一个英文label超12词，已缩至10词后重过。gitleaks扫描约70.89MB无泄露。无源码变更，不跑tsc/vitest/full，tests各null。没有git提交或source_commit，Git状态干净，HEAD仍为冻结base。

原经验补充正式消费者、5策略生产kb_strategies读回、5rk/词表生产kb_reflex读回均待原发布者沿发布锁/学习账本处理。具体战斗原题与逐候选计划/结果未冻结，#28固定两臂回放未完成；未开开关或A/B。自然查询、实际采用、收益/耗时与科学父分别pending；候选完成不关闭父项。未在本会话发送外部消息或启动下一单元。

## 最终结果（与result.json原字节相同）

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261025-011301-strategy-proposal",
  "base": "58ccd1293983a7e984743e7acbdd8b61e3a9df3b",
  "runs": [],
  "own_support_runs": [
    "0DJ6GFZZ0TG9",
    "2K4H3JEJHRSB",
    "456MRNGCPD8E",
    "5ZEPCTQKKXE4",
    "6321RUR647FH",
    "ATP5MCMJDMQY",
    "FZT053H9PSC5",
    "G3TD6JEN47KT",
    "MR7EBRYRJ5R6",
    "SVK97F9E4N56",
    "TKXQ6L4N9A6U",
    "UV5YK5721RPB",
    "V3PJA3FV92BG",
    "VVFH7BULZZR6",
    "Y5H4CFAQ2WTG",
    "Z91JN3S3PQX2"
  ],
  "fixes": [],
  "source_commit": null,
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/report.md",
  "external_source": "issue51-boss-group-004-20261024-r56-stock",
  "input_sha256": "4db3c98f608b7f758f81a38667a0d2c5a3459b83086a898cfc0f1e4f71a0b1d2",
  "decision_output_counts": {
    "distinct_delivered_contexts": 5,
    "new_contexts": 3,
    "updated_existing_contexts": 2,
    "byte_reused_contexts": 0,
    "new_strategy_ids": 4,
    "updated_strategy_ids": 1,
    "new_rk_ids": 5,
    "new_knowledge_ids": 0,
    "updated_knowledge_ids": 1,
    "new_archetype_names": 0,
    "playbooks": 0,
    "comparison_pairs_with_both_groups_ge100": 0,
    "v0111_boss_background_uploaded_fights_ge100": 1,
    "formal_publications": 0,
    "production_consumer_readbacks": 0,
    "natural_queries": 0,
    "adoption_or_benefit": 0
  },
  "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/experience-strategy-rk-map.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/coverage.json",
  "external_results": [
    {
      "id": "external-boss-group-004-r56-stock",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-waterfall-pressurize-fumes-predator",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-waterfall-004-1",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-waterfall-stomp-setup-defense",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-waterfall-004-2",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-giant-explosion-window",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-waterfall-004-3",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-act1-rest-smith-resource-proxy",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-waterfall-004-4",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-waterfall-last-shop-footwork-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-waterfall-004-5",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-giant-explosion-window",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261025-011301/learner/runs/20261025-011355-69bf16c6-d01e-4f2c-b841-9fa1440adf5e-strategy-proposal/scratch/knowledge-candidate.json"
        }
      ],
      "reason": "已落盘5对文字/rk候选：3个新增情境、2个既有情境补充；4新策略ID/1同ID更新、5新rk。正式发布、生产读回、自然采用与收益均待核；仅scratch，HEAD保持dispatch_base。"
    }
  ]
}
```
