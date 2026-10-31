# 本轮16条learning-attention原文与转达

核验时间：2026-10-25T03:46:39+08:00。本文件保留16条完整原message；原文中的prior/finding/evidence/affected_ids/next_step不改写。证据链和正式阶段见verification.json。本角色未写ACK、未重试CLI，未关闭科学父。

差异与进展：旧外部run/floor合同障碍已有#42 external_aggregate固定验证覆盖；B2四条已V6-R433发布并有固定消费者读回，但未证明自然查询/采用/收益。旧冻结账本rc1、结构检查rc0和后来的授权当前清单rc0分账，不能覆盖原失败。原67来源/回执窗口逐SHA复核，科学结论沿前审计保留；本轮另读13份实质证据的正文或指定字段及5个原始帧，不冒称新实验或全历史重新验收；本轮独立核16原message、47源文件SHA、32实际投递窗口及当前正式阶段。

## 1. b40a4420f889d3e759a627c0 — github-issue-27-brain-strategies-20261022

原文SHA256：`08b47c14d33d91feb9a6b627ca07536cdc7f35cad30074f87a2a920616d4e825`

```text
{
  "id": "q27-b2-ledger-frozen-inventory-boundary",
  "prior": "共享账本全量check应全通过。",
  "finding": "新增五条show/find均0自有局、外部分母正确。使用本批冻结runs检查共享575项时，有3条其他并行记录引用0VBCQS9V0N87，超出本批冻结清单；原check rc1保留。LEDGER_RUNS=none结构检查575项0问题，并非这些新局的来源验证。",
  "evidence": [
    "ledger-check.stdout.txt",
    "ledger-shape-check.stdout.txt",
    "ledger-commands.json"
  ],
  "affected_ids": [
    "silent-0571",
    "silent-0572",
    "silent-0573",
    "silent-0574",
    "silent-0575"
  ],
  "next_step": "原ops用其授权当前局清单核三条并行记录；本批不越冻结上限读取新局、不修改他人记录，不代全量来源验证通过。"
}
```

## 2. 99a933ce6b140f81db812b16 — silent-elite-simulation-pessimism-20261021

原文SHA256：`ce50f6e190527fc088325b20a4d5a26de10df654058a0b2b7a6d0a40db34b105`

```text
{
  "id": "D1",
  "prior": "原审计称真实开场保留可用牌堆；缺显式牌堆时才deck-minus-hand。",
  "finding": "显式牌堆在原字节中存在；是冻结提取主动剥离。ET1一场还造成六张重复身份和升级失配。保留原结果作原管线诊断，不称完整真实开场控制。",
  "evidence": [
    "ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2",
    "source-excerpts.md: parse_state_line / boardOf / findIndex"
  ],
  "affected_ids": [
    "silent-elite-simulation-pessimism-20261021",
    "issue-4",
    "silent-proposal-e76e895381da5bfc"
  ],
  "next_step": "原ops接收本异议，沿原通知CLI实际写入watcher与Roy收件箱并取得各角色真实回执；先做无MC输入保真回归。"
}
```

## 3. a2c843430ed6f492ea2eb1b0 — github-issue-27-brain-strategies-20261022

原文SHA256：`a1619b7d6e1595d9cc03e60f1f50101886ebcb5f3ccfc457d86a1839e0584ef1`

```text
{"id": "q27-card-causal-gap", "prior": "#27期望首批包含拿牌与幕初方向；公开数据可以用。", "finding": "本批没有足够证据发布单卡收益排名，三条仅为备战计划。公开数据允许使用，但不把相关性/最终牌组聚类变成决策时可用的因果收益。", "evidence": ["external-review.json", "coverage.json", "entry-dispositions.json"], "affected_ids": ["candidate-external-sts2fun-card-ranking"], "next_step": "原ops→watcher→Roy转达保留的拿牌缺口；不为本批自行开实验或续派。"}
```

## 4. f9a02febd8602a4ab46d685f — silent-elite-simulation-pessimism-20261021

原文SHA256：`ed404bb139f3bd9d08bc2f51539363a0bb99fbad1b446bcf7233dabe2034db52`

```text
{
  "id": "D2",
  "prior": "原授权：“当前不影响R407运行：拿牌比较用同种子配对差。”",
  "finding": "不否定原调度决定，但拒绝把其理由外推为配对增量已校准或排名可靠。本窗口只比较绝对结果，无候选反事实，且有状态/牌身份相关偏差。",
  "evidence": [
    "issue输入内elite-learning-authorization-original.md，SHA25ae2141a16fa4fc61c48d00943240a0a5fb3340bd6627d663c2d17606a34d25",
    "ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2"
  ],
  "affected_ids": [
    "silent-elite-simulation-pessimism-20261021",
    "issue-4",
    "R407论证边界"
  ],
  "next_step": "原ops→watcher→Roy实际告知，单独验证候选增量；保持CARDbrain/REFLEXoff，不将CEN或预测器子项完成当本issue完成。"
}
```

## 5. fc89900f81f276e48a4ec214 — github-issue-27-brain-strategies-20261022

原文SHA256：`9d2a09345800f235021605f91d71a2bfdd7f8757e68b55796f996e468836d1f9`

```text
{
  "id": "q27-b2-hard-fight-metric-boundary",
  "prior": "外部硬仗受伤可直接用为本系统安全HP门槛或证明模拟错误。",
  "finding": "知识恶魔p90=51和实验体p90=62是外部总受伤分位，非净损、置信界或安全线。上传SL未知、死亡截断，第三幕后场未知；不能与自有净损/预测判死直接比值推因果。已有机制与H0/G1a质量限制保留，没有发现足以推翻其原证据的新反证。",
  "evidence": [
    "evidence-refs.jsonl#combat_distribution:45",
    "evidence-refs.jsonl#combat_distribution:66",
    "dedup-review.json"
  ],
  "affected_ids": [
    "silent-brain-knowledge-demon-external-tail-budget",
    "silent-brain-test-subject-external-tail-budget"
  ],
  "next_step": "只作为低可信备战参照；自然发布/命中与收益分别跟踪，原校准/机制父不关闭。"
}
```

## 6. 7430982d1c28981e46d44d75 — github-issue-13-silent-learning-20261021

原文SHA256：`273ea4e784db58721a32125f41b2a93df14b1d1a3d066d0d514847c7648f7855`

```text
{
  "prior": "Issue #13 列出EXPOSE 208、SPORE_MIND 60等unknown标签，容易被理解为独立实盘覆盖。",
  "finding": "重算完全复现原标签计数；EXPOSE的208只来自1局13道题的候选/目标槽，SPORE_MIND的60只来自1局3题。其余卡A标签为11/4/4，不是施放分母。",
  "evidence": [
    "shadow-unknown-inventory.json",
    "coverage.csv"
  ],
  "affected_ids": [
    "github-issue-13-silent-learning-20261021"
  ],
  "next_step": "保留R409原结果；发布与消费者验收按逐卡独立局/真实施放和分支重新计数，不关闭父要求。"
}
```

## 7. 7dcddb0749fa60e0f2f78f3f — github-issue-13-silent-learning-20261021

原文SHA256：`ff2b01ce50e5e74166b788b67cac21788d77d00f3e37c97718e233f0836c9d62`

```text
{
  "prior": "旧钢铁风暴升级手牌边界已implemented，可能被读作完整生成/自动效果已实现。",
  "finding": "旧71e742提案原文明确只清旧手牌并停线，known仍false；普通0费69776提案也明确尚无完整生成。实际12次施放见N-1刀转换，但32VS净6挡、K643净11挡、其他0挡，不能实现固定格挡或未知奇巧顺序。",
  "evidence": [
    "prior-proposal-boundary.md",
    "prior-proposal-sly.md",
    "effect-audit.json",
    "r410-consumer-replay.json"
  ],
  "affected_ids": [
    "silent-0455",
    "silent-0456",
    "silent-0458",
    "silent-proposal-71e742c6453608bf",
    "silent-proposal-c1dd614cdf7bfc37",
    "silent-proposal-69776c308a3b298e"
  ],
  "next_step": "复用原ID；生成与自动交互分开，先验动态张数和原手牌离手保护，再沿原闭环实现。"
}
```

## 8. 751e5b79d972608c69f79626 — github-issue-14-silent-learning-20261021

原文SHA256：`ecba3cac0f1ae6eb530409b1c9b6f4ca8510628851675ac03fb5eca91deb21ec`

```text
{
  "kind": "scope-limitation",
  "prior": "当前整战源码将给定firstPlan直接交applyPlan；初始候选计划不一定覆盖实盘同回合后续补牌。",
  "finding": "SVBEFF首试T1原四步后，实盘另打基础防御及精准切割，25→31挡、预计损1而实际净损0；这是局部可核策略路径差异，尚未证明R410固定回放或整体4.40倍误差的机制根因。",
  "evidence": [
    "/home/dw/Projects/agent-sts2/learner/runs/20261021-111653-dbbc4dc0-8ef7-4421-8395-2c1621797aec-issue-14-act3-calibration-task/policy-prefix-case.json",
    "/home/dw/Projects/agent-sts2/learner/runs/20261021-111653-dbbc4dc0-8ef7-4421-8395-2c1621797aec-issue-14-act3-calibration-task/verified-raw-refs.jsonl"
  ],
  "affected_ids": [
    "silent-0559",
    "silent-proposal-40be025a2ec4528e",
    "roy-20261017-human-pace-h0",
    "issue-14"
  ],
  "next_step": "原owner固定R410单案例逐步轨迹对照；旧验证已读只作诊断/回归，正式候选验收另用未读新局留出。"
}
```

## 9. 3d4cc7af851a72e5bc47a3f8 — github-issue-27-brain-strategies-20261022

原文SHA256：`a799bbbc632dcb262d87f776274bf54151453567efacf577e4f3af4ca77341e9`

```text
{
  "id": "q27-b2-card-disagreement-causal-gap",
  "prior": "#24拿取率分歧可能提供固定拿牌优先级。",
  "finding": "精确Git旧表确认刀刃之舞本系统22/189=11.64%，外部411/1054=38.99%；此为不同局面的频率分歧。外部原始胜率差+5.20pp，经玩家/幕重叠调整约+0.27pp且区间跨零。只发布情境比较提醒，不指示照外部比例补拿；旧自有汇总未逐局核回，不作为mixed支持或提高confidence。致命毒药、步法及报告最大分歧牌亦无因果优先级。",
  "evidence": [
    "supplemental-git-context.json",
    "external-review.json#card_choices:2902",
    "entry-dispositions.json"
  ],
  "affected_ids": [
    "silent-brain-act1-blade-dance-choice-context",
    "candidate-external-sts2fun-card-ranking"
  ],
  "next_step": "原ops→watcher→Roy保留因果缺口及分歧；不在本批启动实验/模拟或续派。"
}
```

## 10. 4d4fd8d8ebbbf1b709b759fc — silent-elite-simulation-pessimism-20261021

原文SHA256：`88f1696322d273f158364393f51f90e28bc34ce1974ac5dfd89d7e51106616c7`

```text
{
  "id": "D3",
  "prior": "原审计将净损描述为入场至终局；实际使用fight.hp_loss，两场胜利只覆盖到最后COMBAT帧。",
  "finding": "ET1 F9最后战斗42到退出39、2XCG F9最后战斗25到退出19；合9HP未纳原“净损”。保留原统计并并列退出口径均值27.4038、模拟残差+10.7151，原因不补值。",
  "evidence": [
    "ET1QAZCV8GUP-f9-fight4（Silent A10/F9/T1可行动），logs/states.jsonl offset=14287839500 bytes=30795 SHA256=b4622465a1aeb30caece92f41cf74f007f199358cb33710f2d933b6c68db6469",
    "logs/states.jsonl offset=14288657897 bytes=20832 SHA256=e6fc793496976edde0a4815b23ab8d0bebfc30cc0ce946349bc440d93a779a90",
    "2XCG8LXUZLRE-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14516553453 bytes=30452 SHA256=9de6174c27382f0546c6348a5e2b0a5078caa8374aff1b708d05166ec10d08fd",
    "logs/states.jsonl offset=14517771530 bytes=20474 SHA256=fbd7cdd050b057e3a47517fb9173ae9c51eac0473cab8015aa52498ce09c7223"
  ],
  "affected_ids": [
    "silent-elite-simulation-pessimism-20261021",
    "issue-4",
    "原审计净掉血口径"
  ],
  "next_step": "原ops沿通知链实际告知，固定索引补核两段跨界HP事件；不得用无归因9HP拟伤害参数。"
}
```

## 11. 8418097488ff1ad810b15b1f — github-issue-27-brain-strategies-20261022

原文SHA256：`ca4e6a5b80cb7ee17d275bcbfc6e28ed5487bcb65b60f85aa6cbaeda19ed34e3`

```text
{"id": "q27-one-fight-boundaries", "prior": "既有boss经验含更多历史支持与高confidence。", "finding": "本批只独立核回3局4个窗口，三条各n=1；不继承旧条目20/22等支持分母，不以观察成功/SL次数证明策略收益。没有推翻既有机制，只限制本批应用与收益声明。", "evidence": ["evidence-refs.jsonl", "observed-frames.json", "coverage.json"], "affected_ids": ["silent-brain-kin-priest-exit-window", "silent-brain-vantom-two-stage-preparation", "silent-brain-crab-surviving-part-budget"], "next_step": "保留既有科学父；原ops发布后等首个自然问题真实查询/命中，不代其他角色ACK。"}
```

## 12. 43652bbc1deb15d9a437af88 — github-issue-27-brain-strategies-20261022

原文SHA256：`3f842425460eb79ca1b084a11edc9f2639dfb9f9756cebd0fa719252f500df66`

```text
{"id": "q27-external-schema-floor", "prior": "外部聚合或机械参考可进入同一策略schema。", "finding": "所选外部资料无真实逐局ID及精确全局楼层；当前evidence要求run与非空整数floor。可用aggregate命名空间保留候选，但本批不伪造floor=0或本系统局号。未改schema/消费者。", "evidence": ["external-review.json", "docs/brain-strategies.md"], "affected_ids": ["candidate-external-sts2fun-card-ranking", "candidate-external-spire-codex-boss-plans"], "next_step": "原owner若要正式表达这些资料，先明确非对局证据合同；本批不扩大架构。ledger CLI也只接受12位真实局号，外部候选未登记伪造账本。"}
```

## 13. 3d8e3359ffe4d6992bd3960e — github-issue-13-silent-learning-20261021

原文SHA256：`d922795f5727d1bc379e0a0f916a85efd111e85ce0a5442040bc27e926788f1f`

```text
{
  "prior": "空rules_text、空dynamic_values且只显示消耗的SPORE_MIND可能可以按零效果known。",
  "finding": "本批仅10行真实手牌、4个局/层/回合键、1独立局，0施放；另有显示昏眩版本。不能证实零效果，也未绑定其生成来源。索引唯一同名施放是非Silent，已拒绝。",
  "evidence": [
    "shadow-card-observations.json",
    "historical-index-discovery.json"
  ],
  "affected_ids": [
    "github-issue-13-silent-learning-20261021"
  ],
  "next_step": "继续unmodelled，等待Silent真实选择/施放与状态后继，不按卡名或其他角色补机制。"
}
```

## 14. 9cb62c98e778f565d5954f73 — github-issue-27-brain-strategies-20261022

原文SHA256：`ceef0e30deb5fb39ee0efc7742434503c74119174b5afd80c4ad3b0cb05639ca`

```text
{
  "id": "q27-b2-external-contract-progress",
  "prior": "首批外部聚合因run/floor必填无法正式表达。",
  "finding": "#42学习合同已提供external_aggregate；本批5条及CLI读回通过，旧格式障碍已被实际固定验证覆盖。机械参考仍不等于策略；这不代通知ACK、live或自然消费，也不关闭原科学父。",
  "evidence": [
    "content-verification.json",
    "consumer-output/summary.json",
    "ledger-ids.json"
  ],
  "affected_ids": [
    "silent-brain-act2-reward-skip-comparison",
    "silent-brain-act3-reward-skip-comparison",
    "silent-brain-act1-blade-dance-choice-context",
    "silent-brain-knowledge-demon-external-tail-budget",
    "silent-brain-test-subject-external-tail-budget"
  ],
  "next_step": "原ops按原通知链转达进展；原问题原件保留，后续完成状态由owner核真实回执。"
}
```

## 15. 99c134c7850ae5bae9fb64c9 — github-issue-13-silent-learning-20261021

原文SHA256：`42d69f2b504b997bdc5eb5b061c5c699a1670cf015ab92f1513c6a675e82482f`

```text
{
  "prior": "silent-0066已shipped；普通EXPOSE在当前消费者known=true。",
  "finding": "这仅覆盖普通Power→易伤。R410升级EXPOSE仍known=false且vulnerable=0；当前CardModel也没有清格挡/全部人工制品的字段。7XS普通清8挡、升级清18挡/1制品/加3易伤均直接兑现。silent-0217修预览消耗，与这些缺口独立。",
  "evidence": [
    "r410-consumer-replay.json",
    "effect-audit.json"
  ],
  "affected_ids": [
    "silent-0066",
    "silent-0073",
    "silent-0208",
    "silent-0217",
    "silent-proposal-00a6a10b15a62b38"
  ],
  "next_step": "复用原机制提案补CardModel/solver/rollout及离手物化、目标语义测试；旧shipped状态不代表本新增范围已发布。"
}
```

## 16. 0ca61b2ba10a18ca2e12f5b3 — ops-20261013-experience-000402-merge-recovery

原文SHA256：`3fa7d253407b212cae26a35328fd7ff0853be2fc133a34e9fe52af891d432199`

```text
[Errno 2] No such file or directory: '/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261013-000403-experience-update.jsonl'
```

## 当前下一步

原CLI owner处理15条身份范围兼容性，保留request/task/character/thread/scope真实绑定和原rc2；不绕校验、不当宿主沙箱错误。000402由原owner找回原wrapper/log，缺失期间不伪造替代。学习者沿原任务完成无MC输入保真、候选增量、终局HP边界及逐卡真实施放/消费者缺口；已有发布与本批原始问题分别保留，当前机制状态由原owner沿后续正式回执核收。自然采用/收益与通知ACK分别追踪；本轮对Roy的用户可见转达不证明Roy已读或同意。

补充边界：R410消费者缺口为原版本的历史结论，不证明当前版本仍未修；需沿原owner后续正式回执核收。额外733e通知是alias_only、superseded_by=b07c96b10b1facb9f887a710，未混入本轮16条。正式watcher/Roy字段均保留0，CLI原拒绝不重试，Roy本人已读/ACK没有证据。
