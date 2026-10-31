# 剩余流派第二组：簇7有界观察剧本候选

记录时间：2026-10-24T22:42:37+08:00。真实调度ID：20261024-223228-strategy-proposal；角色silent；独立批，不续写旧代回执。

## 身份与证据门

learn.json本批external_source、external_binding、工作树HEAD均核同。HEAD保持68df0e5c53eca31e2a18f525d1745c97ba9ceb75。输入清单12084字节/SHA 80838e59720689b8bae444d53b4ba813eab5a59193b3835c379ee92612b7cec0；work_spec4935字节/SHA 29ecc9640dabd20b424881bb8bf8859aacf251b2ed95d458636c7086882bce12。

三包冻结表实际列132个校验对象（3 manifest及129产物），132/132大小及SHA核同；并非额外凭空有132个叶加3 manifest。10份合同/范围、附加包及coverage引用均核同，见scratch/input-verification.json、contract-audit.json、binding-audit.json。11份只读parquet也按冻结大小/SHA核同，未写片、未跑DuckDB或同步共享logdb。8个本批具名问题原始行seek均在decisions冻结截止4638939179内，offset/bytes/SHA见seek-ledger.json；只用真实牌文/选项，不采用旧模型估值或旧理由为游戏真理。首次探查与其后复读为同一F3行，来源字节哈希相同；原行未改。

仅恢复精确合同及旧selection文件，不读取外部原始数据库、逐玩家数据或标识，不下载、不运行游戏/MC/Jev/模型，不改共享统计、源码或正式库。共享learn登记未改。本批代码提案为空，因为仅描述构筑选项比较，不修改出牌、药水、SL或终局价值规则。未确认原生模型/effort/tier，用量与耗时不从启动要求推断。

输入冲突保留：manifest的paired_outputs_required=false与较新work_spec“文字策略与对应rk一起交”不一致，本批按后者交付双候选。未开#28开关/两臂/A-B；未用#55测试几何作为部署证明。

## 选题、去重及语义

首组冻结selection明确按v0.111样本数降序、簇号升序，排除已做毒1/刀6，顺序[4,7,5,3,0,2]。首组取4，本批取第二个7；旧selection只作coverage，未计新证据。后续未处理簇不扩题。当前正式策略/经验/rk只作覆盖和保留旧证据，源文件均未改变，见formal-unchanged.json。

簇7仅作证据定位。本批谨慎称“抽弃与即时攻防混合路线”，不称已验证循环。实际牌文显示早有准备抽1弃1、杂技抽3弃1、后空翻挡5抽2、计算下注全弃等抽并消耗；连续反弹为随机3伤4次。核心UNTOUCHABLE未在本批核到牌文，保留ID而不解释。五个赢家的后续含刀源、毒、防御、其他角色牌，不能从簇号推定单一路线或固定拿牌顺序。

## 阅读覆盖与完整性的限度

外部仅由manifest核SHA的有界reader一对一页取得；模型实际通读offset0–4共5赢家+5败者、319完整节点及每例终局/遗物/还原质量，没有截断节点。其余offset5–9虽程序保存，**未被模型通读，不计本批证据或样本扩充**。这些是脱敏投影，仍缺真实初始快照、每回合动作、所有决策时手牌。最终还原一致不等于每个中途状态准确。

自有通读4YPGHGJD393H的40快照/9战斗/70问题/3计划，以及CLA89Q59WMF7的24快照/6战斗/42问题/7计划，共201投影记录；四section全部读完。CLA89的7计划内容字段均null，不补计划。完整原生prompt未逐份通读；8个相关原问题只抽核牌文/选项，完整原行哈希留存。其余13个同簇代表局未通读。

自有仅能提供败局对照：簇7 A10/no_retry_evidence为0胜/4局，A10/retry_or_predicted_death为0/10，A0/retry_or_predicted_death为0/1。版本全部unknown；未将“无重试证据”当没有SL，未将预判截止当实际死。本批选读的2局均A10/no_retry_evidence，结局真实败；不拿其他进阶/版本混入。Z2/KF9/BP9及后续不在授权名单，未读。

因此交付的是有完整所选投影支撑的有界候选，**完整打法有效性仍未证明**。未取得同流派自有赢家、第二/三幕新情境的自有完整证据或留出回放，不把候选写成验证完成的通关剧本。

## 分账统计与反例

外部source统一external:sts2fun，公开地址https://sts2.fun/static/sts2_public.db.zst，采集日2026-10-21，原数据库SHA 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5。许可未发现明确再分发授权；仅用已冻结署名聚合与授权匿名轨迹，不分发原库。build查询为issue54-decision-fields-v1+own-build-statistics-v1-frozen-a5db4d0f9。

簇7各版终局胜/上传分母分别：v0.107 160/785；v0.108 32/154；v0.109 34/123；v0.110 22/103；v0.111 62/246。上传不等于去重玩家，独立性未证明。缺机制改动对照，版本逐项保留，不合并。v0.111的62个可还原赢家只有25个出现质心前三牌组合（UNTOUCHABLE/RICOCHET/PREPARED），37个未观察齐备；这是事后组合出现统计，不是当前成型条件。首幕与第二幕赢家正block牌副本代理均值7.9677/9.8871，各n=62，不能变成安全张数。

具名反向保留：v0.111终局后空翻+步法在配对赢家15/27、败者11/27（+14.81pp，q=0.8329）；后空翻+反弹10/27对15/27（-18.52pp，q=1）；步法+翻越撑击5/27对9/27（-14.81pp，q=1）。这些是近深度配对后的组合出现率，**不是拿该组合后的胜率或效应**。旧版同一具名组合及异质性在external-combinations.json逐行保留，缺cell不补零。原先已保存的极值行只是探索记录，最终账本改为四个预先列明组合的全部导出版本，未按显著性筛选。

本批两个自有完整局终败，不反证每一次局部选择都错误；既有旧统计正向也不能压掉本批败例。涉及反向的候选保留conflict及原支持/反证；其他来源未作效果对齐时标unassessed。每个情境主证据为可计算的自有选项、前置快照代理与后继；外部是方向对照，runs=[]仍仅表示外部调度身份。

## 五个情境及双候选

每条采用一句方向、实际幅度/分母与范围；完整统计见evidence-ledger.json、decision-evidence.json及scenario-mapping.json。

### C7-1：new → silent-brain-discard-exchange-after-flick-flack

已有翻越撑击时，奖励出现计算下注，应把整手交换与保留可用攻防比较，不把“奇巧”或未来抽牌当已兑现循环。原牌文0费、弃全部手牌后等量抽牌并消耗；4YPG F3在下注/斗篷/预判中选下注，下一战51→51，随后F5仍51→31（1局1次选择）。
范围：Silent A10、版本unknown，当前牌组为此前快照代理；未核弃牌触发链或替代收益。外部同簇赢家组合并不固定，旧版下注组合存在反向，不能据此必拿。

对应rk：silent-rk-c7-c7-1；card_pick描述性标签，非数值收益。正式发布=pending；消费者读回=pending。

### C7-2：same_id_update → silent-brain-backflip-external-prefix-context

后空翻应按当前攻防缺口比较，不把更多抽牌当产出已够。4YPG已有翻越撑击/下注，F4、F5、F9连续拿后空翻（1局3次），牌文1费5挡抽2；F8赢战仍49→21，F13赢战29→2，F14败。
范围：Silent A10、自有版本unknown；当前牌组用此前快照代理，无固定副本数或安全线。保留旧外部v0.111幕2前缀含LEADING_STRIKE：56/126对58/138胜，+2.42pp（两臂可能同局）；旧自有0CLP F13、HLAW F24的补挡过牌场景仍有效且非收益证明。新外部簇7后空翻+步法赢家/败者15/27对11/27，而后空翻+反弹10/27对15/27，方向相反。

对应rk：silent-rk-c7-c7-2；card_pick描述性标签，非数值收益。正式发布=pending；消费者读回=pending。

### C7-3：same_id_update → silent-brain-sucker-punch-external-prefix-context

已有两张后空翻和下注时，突然一拳应与继续抽弃、随机攻击逐项比较，不能只追抽牌数量。4YPG F6在突然一拳/早有准备/连续反弹中选前者；原牌文1费8伤1虚弱，对照为0费抽1弃1、2费随机3伤4次。1局1次，随后休息28→49、下一战49→21，不能归因于该牌。
范围：Silent A10、自有版本unknown；按现场费用/目标核实，不推奇巧或虚弱时长。旧外部v0.107幕1前缀0–5：拿63/246、不拿427/1724终胜，+0.84pp，单位为重复选择记录；不外推v0.111，也非固定拿牌命令。

对应rk：silent-rk-c7-c7-3；card_pick描述性标签，非数值收益。正式发布=pending；消费者读回=pending。

### C7-4：new → silent-brain-discard-skewer-versus-shiv-support

已持后空翻与下注、缺直接攻击时，串刺应与先制打击及幻影之刃的实际用途比较，不将面板0费当免费固定伤害。4YPG F8原文为造成8伤X次；另两项是1费3伤添2刀、1费使刀保留且每回合首刀额外9伤。1局1次选串刺后，下一战21→8。
范围：Silent A10、自有版本unknown、此前牌组快照代理；X的支付规则、实际剩能和刀兑现率未核，不规定出牌顺序。外部五赢家仍有多种后续路线，不能用终局簇预测当前必拿或因果收益。

对应rk：silent-rk-c7-c7-4；card_pick描述性标签，非数值收益。正式发布=pending；消费者读回=pending。

### C7-5：same_id_update → silent-brain-act1-footwork-prefix-context

已有多张后空翻时，可比较灵动步法的部署与即时补强，不能把持有能力牌当已安全。4YPG F11已有3后空翻、8/70血，五选一选1费2敏捷的步法；F12休至29，F13仍29→2，终F14败（1局1次）。CLA89 F7也拿步法、F8锻造后56血进精英仍败，保留反例。
范围：Silent A10、自有版本unknown；未核能力实际启动和替代路线，不定回血线。旧v0.111幕1奖励前缀5张拿11/40、不拿9/19胜；前缀含斗篷拿8/44、不拿6/16，原重叠/代理限制保留。新簇7步法+后空翻赢家15/27、败者11/27，但步法+翻越撑击5/27对9/27；不固定排序。

对应rk：silent-rk-c7-c7-5；card_pick描述性标签，非数值收益。正式发布=pending；消费者读回=pending。

## 计数、验收与未完成项

实际5个不同情境，达到5–10目标；2新建策略ID、3同ID补充、0逐字节复用、0别名、5新rk及5相应词表标签。一个knowledge父候选是组织这些段落，不另算第6情境。与首组簇4的蛇咬/即时AOE/刀源后空翻情境有明确前置条件差别，本批后空翻/步法/突然一拳合入旧ID；旧证据保留不计新增验证。不是将统计行或标签拆成新情境。连续两批新增0的停止条件本批未触发（实际新增2）；不启动下一单元。

新决策比较组双方各>=100为0。本批是流派情境批，单局描述没有伪装成百局选牌结论。旧BACKFLIP策略的126/138等统计仅继承原证据，不能计本批达标；其余旧v0.107/0.111组也不冒新发布。所有组及效应分母在账本分别列出。

5文字/5rk/词表均通过当前生产格式解析器；tsx CLI首次因沙箱IPC EPERM未能启动，改用node --import同一tsx loader重试，解析5/5与词表通过。仅固定数据格式验证，没有源码变更，不跑tsc/vitest；tests各null。正式知识、源码、HEAD未改，未commit或合入。格式通过不代生产工具读回或真实决策采用。

正式发布0；生产工具读回0；自然查询0；实际采用0；已验证收益0。knowledge完整剧本消费者未知；文字库需原发布锁合入后再由kb_strategies核SHA/ID；rk需词表配套、原card_pick渠道固定回放与生产读回。当前候选不动开关；不造source_commit。待发布者保留本批/旧证据、按发布锁做原子去重更新，不能直接全文件覆盖当前库；科学父保持开放。本报告无需向外发消息或改共享收件箱，宿主由external_results接续。

敏感信息扫描：gitleaks对本批输出目录扫描通过，0发现；没有提交、推送或外发。

## 机器回报

以下JSON与result.json使用同一原字节；完整性核对见scratch/completion-integrity.json。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-223228-strategy-proposal",
  "base": "68df0e5c53eca31e2a18f525d1745c97ba9ceb75",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/report.md",
  "external_source": "issue51-remaining-build-002-20261024-r56",
  "input_sha256": "80838e59720689b8bae444d53b4ba813eab5a59193b3835c379ee92612b7cec0",
  "own_support_runs": [
    "4YPGHGJD393H",
    "CLA89Q59WMF7"
  ],
  "decision_output_counts": {
    "distinct_scenarios": 5,
    "target_min": 5,
    "target_max": 10,
    "new_contexts": 2,
    "same_id_updates": 3,
    "byte_identical_reuse": 0,
    "aliases": 0,
    "new_strategy_ids": 2,
    "updated_strategy_ids": 3,
    "new_rk_ids": 5,
    "new_rk_tags_are_not_additional_scenarios": true,
    "new_knowledge_playbook_parents": 1,
    "decision_groups_meeting_100_per_arm": 0,
    "old_inherited_groups_not_counted_new": true,
    "formal_published": 0,
    "production_readbacks": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "verified_benefits": 0,
    "scientific_parent_closed": false
  },
  "external_results": [
    {
      "id": "external-remaining-build-002-r56",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-external-remaining-build-c7-playbook",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/knowledge-candidate.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-discard-exchange-after-flick-flack",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-backflip-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-sucker-punch-external-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-discard-skewer-versus-shiv-support",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "merged-into",
          "id": "silent-brain-act1-footwork-prefix-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c7-c7-1",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c7-c7-2",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c7-c7-3",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c7-c7-4",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-c7-c7-5",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-223228/learner/runs/20261024-223342-d9777500-471e-4515-b34d-08ced4db52a4-strategy-proposal/scratch/rk-candidates.json"
        }
      ],
      "reason": "已按同一冻结排序选第2个未核验簇7，与首组簇4不重叠；通读5对外部完整轨迹319节点及2个自有完整局四section，形成5个情境（2新建、3同ID更新）与5个描述性rk。自有决策比较组达100门槛为0；完整打法有效性、正式发布、生产读回、自然采用及收益均未验证。候选和来源账本已落本批scratch，所有发布/读回pending，HEAD未改。"
    }
  ]
}
```
