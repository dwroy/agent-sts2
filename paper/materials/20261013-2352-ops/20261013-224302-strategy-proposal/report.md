# 静默猎手本批策略提案完成回报

本批 `20261013-224302-strategy-proposal` 普通队列的十项全部核验。新增离线整轮审计源码候选 `c719bc048fa848119f217ba0e966aac7e2671ddf`，已自测和原局消费者读回；实际未合入live。一个暂死接续提案确认已有实现，另八个宽提案仍缺完整证据/联合消费者，新审计提案因合入记录冲突保持waiting。没有新增提案id或把候选标implemented/shipped。

完整base/source_parent：`b85432e091d1ef152ed633303bfee1a38e1dd024`；源码候选为其直接子提交。启动时工作树干净，merge main为Already up to date，末尾源码工作树干净；源码提交只含helper、离线入口、说明和两份固定测试材料五个文件。全部原提案Markdown指纹匹配。身份/角色、原队列行与账本快照见dispatch.json、run-identities.json、dispatched-proposals.json、linked-ledger.json。详细逐项证据、账本与反例见proposal.md。

## 证据和实际读回

派发十锚点均为静默，HMV/F4Q/G403实际A9，其余A10。另7X0W3U8TVA2A仅用于原0f提案自带A10证据，未充作锚点或独立胜率样本。原9Z F48共180决策、228状态重新核根日志，状态按原offset逐对象读回，保留原line/offset/SHA；测试投影41决策/59帧只保留消费者实际字段及原SHA。十锚点16对跨幕HP转换全部复核支持既有floor(缺血×80%)，7X另1对单列，不扩大十局分母。另核220个机制/接续状态和10条关键决策，见scope-*及act-transition-pairs.json。

生产离线入口learner/audit-selection.ts输出新增observed_turns，逐题预测和整轮观测分别保留。9Z第二/三试T7玩家20→9/11、敌393→344/322，实际净−11/−9、敌−49/−71；原答/SL预测8/15及42/58另列。第三试T8原状态11→0→20，恢复20与整轮净+9分列，敌净−53，未推毛伤或候选因果。T10开场预测余血16，后续least-loss重问文本−9，实18→3；差12不绑定开场题，也未定位历史dirty模型根因。T11结束观测.151Z和runs.152Z不相同，严格终态保持unknown。

完整原局消费者实跑exit0：180动作、89题段、28轮窗口，22轮端点可核、6轮缺边界；五项关键值断言通过。消费者报告9Z-full-consumer.json、consumer-verification.json。0f既有代码再由本批直接调用live源码读取五个7X固定入口，禁读知识JSON/不调用LLM或游戏，exit0；T5/T8/T10/T11/T13暂死体均保留零血/25恢复/阶段身份且不入当前攻击或目标。见reattach-live-consumer.json及既有silent-reattach测试；不是修模后实盘胜线。

## 实现、负对照与检查

入口只在原离线silent/A10校验后新增整轮窗口：原决策连续、同层/轮/尝试/重载、唯一匹配状态、前后结束回合边界；中间缺行/缺帧/重复或跨尝试时unknown。敌方全部决策端点类型唯一、名单/最大HP相同才可比较；连续原状态另记中间HP与药栏，因果与未截断伤害始终null。原动作选线、SL、规则、其他角色及未知进阶接口保持原样；没有知识生成脚本或经验库修改。

原源码副本为selection-execution.before.txt/.after.txt；撤掉入口，固定15用例为14失败/1通过，exit1，negative-source-withdrawn.txt保留。恢复后联合9文件94项通过，restored-targeted.txt。最终沙箱bash tools/test-sandbox.sh exit0：tsc通过、374文件3578项＋paths一文件11项，共375文件3589项；sandbox-source-retry.txt。首次入口因新helper未使用回调参数tsc失败，修正后复跑成功，sandbox-source.txt原件保留；不是把首次失败改写成通过。未运行沙箱外完整套件。

提交前gitleaks protect --staged --redact exit0，扫描约540963字节、无泄漏，gitleaks-source.txt/.json。源码提交英文，Co-Authored-By为Codex GPT-6.1 Sol；未设仓库user.*、未推送。原启动的实际命令为gpt-6.1-sol、xhigh、default服务档；任务文字high与原启动xhigh有差异，未更改原线程或降低强度，不自报成high。

## 实际live边界

在ops/live-merge.lock内对候选提交做merge-tree --write-tree：exit1，19个已有记录冲突，无本次源码冲突、无本次路径与刷新知识重叠。live前后均`0b07f43b3bdf54138e922cb84f2fd41dce9db139`，status SHA前后完全一致。按“有冲突就停下回报”，未执行实际merge、未覆盖刷新知识、未提交live刷新。原ops可依据候选五文件与固定检查材料兜底；本批不绕过全分支冲突把它登记上线。

- notes/fix-queue-v4.md
- notes/for-roy.md
- notes/lessons.md
- notes/ops-handoff.md
- ops/inbox-dev.md
- paper/data/README.md
- paper/data/commits.csv
- paper/data/cost-curve-silent.csv
- paper/data/cost-silent.csv
- paper/data/cost-sources.json
- paper/data/cost-unattributed.csv
- paper/data/decisions_by_label.csv
- paper/data/learning-curve-silent.csv
- paper/data/runs.csv
- paper/data/summary.json
- paper/data/verification.json
- paper/materials/decision-log.md
- paper/materials/learning/ledger.jsonl
- paper/materials/silent/cost.md

回执live-source-preflight.json/.txt保留。merged=null、version=null；本次只补离线审计，本身没有行为发布号。没有实际部署通知或shipped；实际入库/自然消费者采用、规则收益、原量化父要求和其他宽项继续保留。回退仅撤候选源码五文件对应差量，原日志/失败/并行知识和记录保留。

## 十项proposal_results

| 原id | 处置 | 理由/实际live源码 |
|---|---|---|
| silent-proposal-03754e1265894000 | waiting | RC F23 T3/T4、F29 T3/T4原帧已核；八组件的完整联合生产回放及临时敏捷清退/首次小刀/被动挡事件归属未齐，未知升级和叠层不补规则。 |
| silent-proposal-e5ea36df117ca9b7 | waiting | X F49 T1为接管后的首可行动帧；内部动作、顺序与耗能缺失，未发现当前题面误称自主启动的确定源码错误，不由失败禁止遗物。 |
| silent-proposal-ab055ef7dfbb44e5 | waiting | 幽灵单层子项96f17377a331e50ea5b6a3fe8d2b605932ed1bd4已为live祖先并回放通过；缺夜魇存活/复制支付兑现的完整消费者和延后饮药同后继整战对照，复合项继续等待。 |
| silent-proposal-0129c465c6f5bd79 | waiting | 普通单弃bf423c173d3be348a4ad714e1d26516df619ff41与毒胜保血222445a9bb6bf56cb4f3ceea2cc8b20fba54128f已live；接管内部动作、复制存活兑现和同条件SL整战后继仍缺，子项不关闭宽项。 |
| silent-proposal-abe9d5d0be109a9f | waiting | 连续双boss资源e1a467e18a0dfa8d99046a24ff4c0e1af59278c8已live；缺路线/休息/SL分源完整联合消费者及同资源改线、留药、锻造后继，不拟新安全血线。 |
| silent-proposal-f16527e59b5cc1e0 | waiting | 敏捷/脆弱/覆甲、临时减力、钳子留挡的全部联合消费者未齐；六次T1饮幽灵没有延后同条件整战对照，不修改时机或药价。 |
| silent-proposal-8f62129d7da70b94 | waiting | 整轮离线审计候选c719bc048fa848119f217ba0e966aac7e2671ddf已完成源码负对照、自测和完整原局消费者读回；锁内预检19个既有记录冲突，尚非live祖先，等待原ops整合和live读回。历史dirty源码/未截断毛伤仍未知，不改规则。 |
| silent-proposal-7a8e9ccb7e646538 | waiting | 本批已分列T7预测/重问/实轮、T8零血恢复和T10分题；历史dirty完整源码、逐击毛伤归属和受控替线整战仍缺，复合机制/策略项等待，不用局部审计替代量化收益。 |
| silent-proposal-cd9f76184de6e29a | waiting | 十锚点16对跨幕原帧全部支持既有缺血80%公式；缺跨幕/营火/赢战消耗/上限变化/SL复药完整联合消费者及同条件路线后继，保持现有公式和分母。 |
| silent-proposal-0f0904256806281a | duplicate | c915888d0fabf3c8f1b5d466fe75729161b16835为实际live祖先；本批直接调用live入口核7X F31 T5/T8/T10/T11/T13五个固定暂死输入，保留零血身份/接续阶段且不进入当前目标/攻击；既有接续固定套件覆盖71后继敌HP、再死/恢复、全归零和未知边界。自然收益未知。 |

只通过根learner/ledger.py update追加本批报告/提案/候选追溯；既有claim、first_run、status、version和分母保持，不把旧shipped知识状态当成新候选已上线。CLI输入及回执见ledger-updates.jsonl、ledger-update-receipt.txt和ledger-check.txt。原code_proposals id沿用实际CLI登记；未修改原Markdown/队列，也未另建重复id。

末尾JSON为本批结构化回报，完整独立副本report.json：

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261013-224302-strategy-proposal",
  "base": "b85432e091d1ef152ed633303bfee1a38e1dd024",
  "runs": [
    "RC61MFQM63Y6",
    "XTSV1U9JD34T",
    "BTSRF7JL1W1Y",
    "9Z9H2EXKLF3T",
    "HMVJKM56S4Q8",
    "F4QKG4J1AJJZ",
    "G403VCZ3BH1B",
    "25226ZFLNR1J",
    "JLN5SK17W4FQ",
    "JMH5C51RLN4E"
  ],
  "fixes": [
    {
      "item": "silent-proposal-8f62129d7da70b94:整轮离线审计",
      "commit": "c719bc048fa848119f217ba0e966aac7e2671ddf",
      "source_parent": "b85432e091d1ef152ed633303bfee1a38e1dd024",
      "test": "agent/tests/silent-selection-turn.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "live-merge",
      "reason": "锁内merge-tree返回1：19个既有记录冲突；无本次源码冲突、无刷新知识重叠，按任务要求停止，保留并行记录。"
    }
  ],
  "merged": null,
  "version": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 3589,
    "files": 375
  },
  "code_proposals": [
    "silent-proposal-03754e1265894000",
    "silent-proposal-e5ea36df117ca9b7",
    "silent-proposal-ab055ef7dfbb44e5",
    "silent-proposal-0129c465c6f5bd79",
    "silent-proposal-abe9d5d0be109a9f",
    "silent-proposal-f16527e59b5cc1e0",
    "silent-proposal-8f62129d7da70b94",
    "silent-proposal-7a8e9ccb7e646538",
    "silent-proposal-cd9f76184de6e29a",
    "silent-proposal-0f0904256806281a"
  ],
  "implementation_domains": [
    "combat",
    "sl"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-03754e1265894000",
      "state": "waiting",
      "reason": "RC F23 T3/T4、F29 T3/T4原帧已核；八组件的完整联合生产回放及临时敏捷清退/首次小刀/被动挡事件归属未齐，未知升级和叠层不补规则。"
    },
    {
      "id": "silent-proposal-e5ea36df117ca9b7",
      "state": "waiting",
      "reason": "X F49 T1为接管后的首可行动帧；内部动作、顺序与耗能缺失，未发现当前题面误称自主启动的确定源码错误，不由失败禁止遗物。"
    },
    {
      "id": "silent-proposal-ab055ef7dfbb44e5",
      "state": "waiting",
      "reason": "幽灵单层子项96f17377a331e50ea5b6a3fe8d2b605932ed1bd4已为live祖先并回放通过；缺夜魇存活/复制支付兑现的完整消费者和延后饮药同后继整战对照，复合项继续等待。"
    },
    {
      "id": "silent-proposal-0129c465c6f5bd79",
      "state": "waiting",
      "reason": "普通单弃bf423c173d3be348a4ad714e1d26516df619ff41与毒胜保血222445a9bb6bf56cb4f3ceea2cc8b20fba54128f已live；接管内部动作、复制存活兑现和同条件SL整战后继仍缺，子项不关闭宽项。"
    },
    {
      "id": "silent-proposal-abe9d5d0be109a9f",
      "state": "waiting",
      "reason": "连续双boss资源e1a467e18a0dfa8d99046a24ff4c0e1af59278c8已live；缺路线/休息/SL分源完整联合消费者及同资源改线、留药、锻造后继，不拟新安全血线。"
    },
    {
      "id": "silent-proposal-f16527e59b5cc1e0",
      "state": "waiting",
      "reason": "敏捷/脆弱/覆甲、临时减力、钳子留挡的全部联合消费者未齐；六次T1饮幽灵没有延后同条件整战对照，不修改时机或药价。"
    },
    {
      "id": "silent-proposal-8f62129d7da70b94",
      "state": "waiting",
      "reason": "整轮离线审计候选c719bc048fa848119f217ba0e966aac7e2671ddf已完成源码负对照、自测和完整原局消费者读回；锁内预检19个既有记录冲突，尚非live祖先，等待原ops整合和live读回。历史dirty源码/未截断毛伤仍未知，不改规则。"
    },
    {
      "id": "silent-proposal-7a8e9ccb7e646538",
      "state": "waiting",
      "reason": "本批已分列T7预测/重问/实轮、T8零血恢复和T10分题；历史dirty完整源码、逐击毛伤归属和受控替线整战仍缺，复合机制/策略项等待，不用局部审计替代量化收益。"
    },
    {
      "id": "silent-proposal-cd9f76184de6e29a",
      "state": "waiting",
      "reason": "十锚点16对跨幕原帧全部支持既有缺血80%公式；缺跨幕/营火/赢战消耗/上限变化/SL复药完整联合消费者及同条件路线后继，保持现有公式和分母。"
    },
    {
      "id": "silent-proposal-0f0904256806281a",
      "state": "duplicate",
      "reason": "c915888d0fabf3c8f1b5d466fe75729161b16835为实际live祖先；本批直接调用live入口核7X F31 T5/T8/T10/T11/T13五个固定暂死输入，保留零血身份/接续阶段且不进入当前目标/攻击；既有接续固定套件覆盖71后继敌HP、再死/恢复、全归零和未知边界。自然收益未知。",
      "commit": "c915888d0fabf3c8f1b5d466fe75729161b16835"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-224302/learner/runs/20261013-224324-strategy-proposal/report.md"
}
```
