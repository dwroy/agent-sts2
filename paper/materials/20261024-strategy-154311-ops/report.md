# 20261024-154311 休息/锻造与路线资源补证

本单元 `decision-rest-route-own-fallback-002` 已形成 **5个不同情境的既有ID更新候选：新增0、更新5、复用重发0**。按稳定目标ID去重达到5～10个情境候选的数量目标；这不是“新增5条”，也不是科学验收、正式入库或自然收益。源码、正式知识、main/live和共享状态未改，HEAD仍为dispatch_base。只保留本批scratch产物，不提交。

## 身份与证据边界

- 已核原 `ops/codex-ops/learn.json` 本批external_source、external_binding、manifest/work_spec字节及SHA、实际HEAD。manifest SHA `7b1858a744400cc9ea8d3c7b131a899981d5e7c2fd50105da746aeda4f62d964`；work_spec SHA `f7289dc303c1627cbf49ae96e81605b9cff31af5f2a145b93fb19f1537a9446a`。恢复的两份历史材料均来自该HEAD的精确blob，未改登记/请求。
- 按新授权，自有原冻结506个Silent已结束局作为本单元主证据，A10为466局，其他进阶40局保留分账；Z2/KF9排除，BP9及后续局未入列。自有游戏版本unknown，不补成v0.111。收集/核证日期2026-10-24；外部采集日期2026-10-21。
- `own-506-scope.json` SHA `da915311f233ba0c350f5278a630a61fee1ab9540c520d407f6227e9c87e3478`；transport SHA `fa5462f45d7ffcf6e99fc7444010f5c816328a850f63fea9bf6225d850f6f588`。11个冻结分片逐片大小/SHA前后相同；只读访问，未chmod或写入。底层文件部分mode=0644、当前来源可能已被压实解除硬链接，这些实际属性保存在identity-verification中；并未冒称操作系统权限均为只读，冻结内容核同。
- 六流原始前缀SHA1/head_len及原切点均已核。decisions 4638939179、states 17026867203、sl-attempts 61282656、run-config 3320082、run-plans 12781782、runs 455331字节。每个被读取原始行均按冻结索引off/len受单流source_size约束并留SHA256，未越切点；未扫描/复制完整17GB状态流。
- 仅用既有logdb-venv、内存DuckDB、threads=2、memory_limit=1GB、nice=10、显式11片名单，并先过滤506局。未init/sync共享logdb、联网、装依赖、运行模型/MC/Jev/游戏/full或tick。源码对照为固定HEAD；`git diff --binary`为空，未归档/展开整仓源码。
- 外部仅用已冻结脱敏JSON：来源external:sts2fun，URL `https://sts2.fun/static/sts2_public.db.zst`，DB SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`，decision statistics SHA `4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d`。未读外部原库、玩家数据/标识或下载数据。8个build的130个休息统计cell独立保留，缺机制对照，未合并版本；实际用于候选的是v0.111.0第一幕HEAL/SMITH两组。许可未知限制沿原聚合署名保留，不能重新分发原始数据。

## 五个去重情境

每行都是一个既有稳定目标ID的更新。4个经验目标提供同ID的现行StrategyEntry文字投影，与经验合并共算一个成果；不另造别名或新知识数。全量统计、局号、来源SHA、SL分层、offset/bytes/SHA见 `scratch/source-ledger.json`、`context-statistics.json`、`per-context-mapping.json`。

| 目标ID（均update） | 一句方向、幅度与样本 | 一行适用范围 |
| --- | --- | --- |
| silent-brain-act1-rest-smith-resource-proxy | 第一幕按真实资源比较回血/升级：自有题前HP均33.53/48.97，差15.44血，1039/474次、451/309个组内独立局；联合459局，组间重叠。外部前节点末HP代理差17.85血，赢家372/1254、465/1458，差2.23pp，仅作方向对照。 | Silent A10；自有版本unknown，外部v0.111.0另账；两项当前合法，不解释为升级因果收益。 |
| silent-rest-buffer-observation | 缺血小于面板回复时核实际缺口和附带收益：565次/258局；实选HEAL163次/128局，其中上限未变145次/118局均只回复当前缺口，2次回0；另18次上限变化。 | Silent A10/unknown；当前HEAL/SMITH合法；最大HP及产药等收益另核，不凭HP回0判选项无用。 |
| silent-pumpkin-candle-charge-energy | 添火与当前回血分账：8局11次KINDLE，动作后HP净增均0；题面加5充能，包含28/70与40/86血情境。 | Silent A10/unknown第二、三幕合法添火；全部有SL记录、小样本，不给添火优先级或能量整战收益。 |
| silent-route-hp-observation | 先确认当前分支与到火资源：精英/火同时可选524次/280局，走火475次后继均净增14.50，走精英15次中14有后继均净减25，1缺失；当前HP均37.32/63.27。960个首次多分支窗口中90未见下火；831个已到火且地图标记战斗≥2段均净减23.26，亦有净增。 | Silent A10/unknown；幕初或带路线复核题；跨节点净变化/地图战斗数为代理，不作毛伤、绕路因果或安全线，实际备选条件须再核。 |
| silent-miniature-tent-two-rest-options | 已持微型帐篷时执行后复核剩余选项：14局70火实际HEAL+SMITH；70次升级均有牌组变化、当步净回0；70次HEAL均净回22.01，范围0—50，2次0，两种顺序均见。 | Silent A10/unknown，当前遗物及剩余动作确实可用；允许额外动作但不承诺重复同项，不证最佳顺序。 |

## 分母、反向结果和代理

休息以run/floor的营火访问为机会单位，共2981火/498局，A10为2675火；3067个原动作另外保留。同火连续不同动作不是重试重复：逐动作取执行后的首个REST/MAP状态，锻造中间CARD_SELECTION不当最终升级后继；整火收益与单动作收益分账。全部15239个地图决策覆盖506局，A10为13728个；仅有一条可走节点不计为多备选的选择机会。全局结果胜负只作终局标签，未用于在线触发或因果排序。

A10按日志证据分为342局确认reload、1局仅predicted_death无确认reload、123局无重试证据；其他进阶独立保存在own-run-strata。首次attempt=1的won/died日志不自动当SL，absence不证明未SL。各候选的分层机会/独立局数/当前记录sl_reloads/后继变化均在统计文件逐组保留。第一幕比较为1202次/342个reload局、3次/1个predicted-only局、308次/116个无重试证据局；不把后继SL结果冒成首次轨迹。

反向与限制实际保留：QVDR4R3UWKXU F8只有35/77仍选择升级，单一HP阈值不能解释所有选择。L704TLETMZBM F40满血HEAL回0，但题面另列小邮箱药水、皇家枕头，不能由净HP0断言总收益0；UMVLWER4CD98 F7为52/70→75/75，旧上限缺口18而实际回23，增上限不可遗漏。8R5CXD5C8PW8 F29添火28→28；YF0LXT1QSTGG F44先升步法HP54不变，再HEAL至70，F47先HEAL4→25再升级，不能把后继回血归给锻造。

路线中JMH5C51RLN4E F8有火备选仍走精英，48→后继18；9ZERN492CSHX F7有火备选走精英后未见下一地图，缺失不补成完整净损/安全成功。UJ0K3G10609Y F34多分支到F40火前84→27净减57；D4LJ9QMGFB8Q F1到F7火前56→62净增6，不能把地图标记战斗数直接线性换算损血。Unknown节点可能有战斗，标记数不等真实全部战斗数。段窗口不跨幕、不含Boss/Ancient转换；到火与未到火分母分别保存，入火资源取真实休息动作前HP，不是前节点末HP。对尚未执行的未来路径不使用这些实际后继值作触发事实。

同一局可出现多个营火、多个幕窗口；不把机会数或重叠cell求和为独立局。每局每幕只取首次多备选窗口，仍是观察性样本；从当前地图到下一休息选择前的净变化包括事件、药水、遗物/恢复、问号战斗与SL，不能当纯战斗掉血或安全界限。小样本添火8局、帐篷14局没有强套外部100门槛；独立自有样本≥100的情境3个，另有一个实际使用的外部比较两组≥100，均不等于自然验证。

## 实读范围、去重和消费者

程序查询六类冻结索引覆盖：decisions305743行、frames321328行、run_config570、sl_attempts2826、runs_raw506、run_plans7653；各类均只在506名单内聚合。按索引回取最终引用表的24359个去重原始行，共993606147字节（探索性旧统计和重复I/O不作额外样本），仅保留必要资源投影和行引用，未保存完整状态流。脚本做聚合不代表模型逐行通读：模型实际核读14份完整的被选资源投影/13局，含真实休息选项、HP/maxHP、升级前后、动作顺序与地图备选，另读汇总/分层及原候选；原始巨大决策行只抽核相关字段，未声称通读全部原题/模拟字段。70个双动作火的遗物与动作链由程序逐项核，14/70的完整名单留审计，模型只逐条核读两种顺序的代表。原始未选行/其余资源投影没有模型实读声明。

本批新读外部完整匿名代表轨迹0，自有代表四section整局0；不声称完整流派剧本。外部原121311两候选及既有三单元1/2/2均保留，本批不修改旧processed/failed/rc0。前驱route候选 `silent-external-selected-route-exposure-001` 原SHA不变，仅引用，不复制算新条。先核#27策略/经验稳定ID、#28来源与回放边界、#42外部聚合合同、#55当前消费者：五个情境均已存在目标，故新增0、更新5；路线即时分支与段统计合并同一目标，不拆两条。前驱该单元新增2，本批是首个零新增批；不扩大/续派旧Boss或刀009。

五份文件及总库可按冻结StrategyEntry合同校验，正文459—622 UTF-8字节。现合同不支持进阶、遗物和实时路线备选的全部谓词，这些必须由正文明确限制并由消费者检查，未虚造trigger字段或把终局/未来事实作触发。4个经验目标的同ID文字投影不表示已变更经验消费者；发布owner仍须精确合并、保留原内容/证据，分别核知识/策略/rk通道。缺知识/rk消费者与固定回放不阻止提交有真实范围的策略候选，但不冒称那些通道已经消费。#28开关、两臂、AB未启用。

正式publication锁/学习账本/生产工具读回和后续自然采用均沿原owner继续。每条formal_publication、consumer_readback、natural_adoption均pending；科学父不关闭。没有本任务源码提案，code_proposals、implementation_domains、proposal_results、fixes为空，merged=null，tsc/vitest/cases均null。未读取native请求回执核档位/服务层/用量，不把启动说明high当作实际采用。

## 检查与交接

冻结SHA、506白名单、原六流切点及原始前缀核同，候选逐条存在且目标ID唯一。生产parseStrategyLibrary离线格式入口成功解析5条；首次tsx CLI受沙箱Unix socket EPERM限制，改用node --import tsx后成功，仅格式检查、不算生产工具读回。scratch的gitleaks扫描约144.74MB、0泄漏；最终报告/结果再扫描与一致性回执见scratch/final-validation.json。未运行源码测试，原因是只写scratch与报告。完整输入/过程审计均保留，不替换原产物和失败历史。

交原ops转主管的原文：本休息/路线补证产出5个去重情境候选，均为已有稳定目标更新（新增0/更新5），不是5条新增。数量目标按更新情境达到；正式发布0、生产消费者0、自然采用/收益未证。路线反事实/安全HP、跨版本机制与非策略消费缺口继续waiting；请沿原owner发布/读取，不据本批关闭科学父或重开旧任务。本文件是交接材料，不代替消息已送达、角色ACK或Roy接收。

最后一个JSON块与result.json使用同一原始字节；最终回复亦使用该结果，不另写reason。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-154311-strategy-proposal",
  "base": "4a38ebf3ebe0e32b8d93ba87b91ca4d899f89b7a",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/report.md",
  "external_source": "issue51-decision-rest-route-own-20261024-002",
  "input_sha256": "7b1858a744400cc9ea8d3c7b131a899981d5e7c2fd50105da746aeda4f62d964",
  "external_results": [
    {
      "id": "decision-rest-route-own-fallback-002",
      "state": "processed",
      "destinations": [
        {
          "kind": "merged-into",
          "id": "silent-brain-act1-rest-smith-resource-proxy",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/act1-candidate.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-rest-buffer-observation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/heal_clipping-candidate.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-pumpkin-candle-charge-energy",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/kindle-candidate.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-route-hp-observation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/route-candidate.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-miniature-tent-two-rest-options",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/two_rest_actions-candidate.json"
        }
      ],
      "reason": "5个不同情境的既有ID更新候选已落盘，真实新增0、更新5；4条own、1条mixed，自有证据与外部分母分账。正式发布和消费者读回均pending；路线反事实、跨版本机制及自然收益仍缺证。"
    }
  ],
  "own_support_runs": [
    "8R5CXD5C8PW8",
    "9ZERN492CSHX",
    "D4LJ9QMGFB8Q",
    "EQLB6SK9W9H7",
    "JLN5SK17W4FQ",
    "JMH5C51RLN4E",
    "KDBWARERSGYW",
    "L704TLETMZBM",
    "MGA0CZDDKC0P",
    "QVDR4R3UWKXU",
    "UJ0K3G10609Y",
    "UMVLWER4CD98",
    "YF0LXT1QSTGG"
  ],
  "own_support_runs_basis": "13个原文资源投影抽核见证局；完整聚合样本、独立分母、SL分层和反例逐候选见source_ledger，不将调度runs=[]解释为无自有证据。",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/source-ledger.json",
  "context_mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/per-context-mapping.json",
  "decision_output_counts": {
    "new": 0,
    "update": 5,
    "reuse": 0,
    "unique_contexts": 5,
    "target_min5": 5,
    "target_max10": 10,
    "under3_report_required": false,
    "target_met": true,
    "target_basis": "5个不同情境的既有稳定ID更新；不是新增5条，段落/统计行/同ID策略投影不重复计数",
    "gaps": [
      "真实新增ID为0；前驱本单元新增2，本批为首个零新增批，不自动扩大选题。",
      "路线未走分支的同局结果、精确安全HP与跨版本机制对照仍未知。",
      "正式发布、知识/策略/rk消费者读回、自然采用和收益均未完成。"
    ],
    "own_contexts_with_at_least_100_independent_runs": 3,
    "external_comparisons_with_both_groups_at_least_100_uploads": 1,
    "candidate_count": 5,
    "formal_publication_count": 0,
    "production_consumer_readback_count": 0,
    "natural_adoption_count": 0,
    "previous_batch_new": 2,
    "consecutive_zero_new_batches": 1,
    "dispositions": [
      {
        "id": "silent-brain-act1-rest-smith-resource-proxy",
        "disposition": "update"
      },
      {
        "id": "silent-rest-buffer-observation",
        "disposition": "update"
      },
      {
        "id": "silent-pumpkin-candle-charge-energy",
        "disposition": "update"
      },
      {
        "id": "silent-route-hp-observation",
        "disposition": "update"
      },
      {
        "id": "silent-miniature-tent-two-rest-options",
        "disposition": "update"
      }
    ]
  }
}
```
