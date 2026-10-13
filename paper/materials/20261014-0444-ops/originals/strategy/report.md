# 静默猎手策略批次报告

记录时间：2026-10-14T04:29:59+08:00。批次：20261014-041302-strategy-proposal。

十项均保留waiting，未修改源码/知识/任务模板，未提交、未合入live，未发布版本；没有新implemented/duplicate/shipped。已有子实现不能关闭完整父提案。

完整基线：`4454bd24d1331c7eca756d302e5686a2d023f6f7`；开工干净，普通队列身份匹配，git merge --no-edit main返回Already up to date。无research_request/implementation_request，普通专题文件绑定另一批，因此没有承接专题或额外选题。

五个runs均经原runs.jsonl核为SILENT/A10；本批派发锚点与实际分析局相同：NHA2KW0RB7VP、P74C04AEPL1F、G33HU22H2543、RC61MFQM63Y6、BTSRF7JL1W1Y。只读原提案、静默复盘/经验及实际原日志，没有读取其他角色知识或游戏二进制。

原日志按有界字节seek提取3238帧状态、3138条决策、31条SL记录、26条本局计划；全部状态保存原字节gzip及源offset/line/SHA，十份原Markdown指纹逐一匹配。未把多次SL或逐帧检查当独立胜率样本。

逐项证据、账本、反例、旧/新行为边界和后续验证均见proposal.md；原提案链接见dispatch-and-proposals.json。

| 派发ID | 状态 | 具体缺口 |
|---|---|---|
| silent-proposal-9952ee8e8df9a0fe | waiting | 现有SL资源比较入口仅列当前回合预测并标execution=unverified，缺受控完整后继、同预算逐样本轨迹及连续资源消费者校准，不能据T1差额新设SL/终局门槛。 |
| silent-proposal-47be799a87af03be | waiting | 计划事实与手牌快照已有入口；缺每个合法弃牌分支的触发、动态精确切击伤害、逐敌格挡/剩血及实打校准，不能把选择帧7伤固定成保留线的伤害。 |
| silent-proposal-3a5274da3c42672a | waiting | 逐敌失衡、翻挡、毒与滑溜有既有模型/经验；缺主怪末归零中间帧、复活完整毛伤归属及多来源预测/实际校准，未定位可独立修复的新模型差额。 |
| silent-proposal-bc4b92d590f2c4ce | waiting | 首牌子项已有实现，但原宽项还包含动态弃牌后继、能力支付/实建层数/存活窗口及消费者验证；缺这些完整数据，不能把整个ID登记duplicate。 |
| silent-proposal-f52fbbab4dccc3b4 | waiting | 缺未走路线、休息/锻造和跨战留药的条件匹配完整结果及连续资源消费者校准；实际资源观察不能直接拟一般路线血价或药水持有阈值。 |
| silent-proposal-10f37c0edd3d24a6 | waiting | 观察支持已登记的临时力量、毒结算、翻挡和实际回复；缺内部逐次结算、去组件对照和未观察组合，未找到新增确定模型差额或一般药价依据。 |
| silent-proposal-3f82387e2e179703 | waiting | 缺纠正可达性后的同预算逐样本轨迹、受控完整后继与独立校准；资源预测日志已有子入口，但实际首/末对照不是SL对象原线/替线的成对反事实，不改饱和SL门槛。 |
| silent-proposal-aee21084c991abd3 | waiting | 缺最终执行线逐样本完整轨迹、同起点分支对照及独立校准；题面已包含1/4死亡，单次实际死亡不能识别模型失配、调权重或固定杀序。 |
| silent-proposal-df37594e9b12debf | waiting | 普通唯一单弃已有子实现；完整多选、目标、能力兑现、持牌自损及饱和SL存活窗口的消费者验证仍缺，不能将整个宽项登记duplicate。 |
| silent-proposal-42e81c83b2e1e56b | waiting | 缺另一条路线、休息/锻造、留药的条件匹配完整结果及连续资源消费者校准；旧投影70与实际52不构成同条件误差，不能确定一般安全血线。 |

## 当前消费者与已有实现

e784dd9f043bf87c29109573f48975f9903280d3（投斧首牌）和bf423c173d3be348a4ad714e1d26516df619ff41（普通生存者单弃），以及5b56a452bb9be14d620b368ec46974c1b57901ca、66283dd9982bdd7f480da7a4d9bfefea0572a9ac的计划/快照/SL预测信息子项均核为实际live祖先。仅作为部分覆盖引用，不登记整项duplicate。

冻结P74 F23末T3的生产选择入口保留四合法候选，card2仍可选择，保留手牌投影与真实284818一致；每分支仍无hp_after/block_after。原计划内存没有原快照，本次没有伪造该内存来冒称历史完整消费者已验证。投斧首牌键读回确实区分顺序；SL资源字段标为current_turn_prediction、execution=unverified。

上述是当前基线的固定入口读回，不是LLM调用、自然局收益、完整策略验收或源码测试。三个信息模块与live同字节；其余核验的card-model/turn-solver/sl模块只有保留的Roy/Dai注释字节不同，移除注释的TypeScript转译输出相同。精确SHA、live HEAD、祖先检查及执行等价核验见verification.json。

RC61 F33首/末实线损4/8、净伤30/23支持即时血价有差；但279197的SL原对象是Jev火箭/无药线，不是首试爪/带药线。故两组数据分账，不能把原对象预测差直接宣称实际省血或胜率收益。BTS F31最终279854候选明确3/4胜、1/4死，不因实死一次就调出牌权重。

## 验证与未上线原因

3272项证据/读回核验全部通过，包含3238帧原字节读回、局部伤血/副本/复活/营火事实和实际live祖先。这个计数不是tsc/vitest cases。未改源码，tsc/vitest/cases固定null，撤源码失败→恢复通过不适用，未跑沙箱全套或冒报测试成功。

临时CLI IPC EPERM、过宽数据屏蔽、注释字节核验失败及初稿战斗窗口修正均保留原件，见verification-history.json；它们不是生产策略失败。没有代码提交，所以未进行提交前密钥扫描或生产合入检查；没有依赖安装、网络调用或play。

本次只经根learner/ledger.py update补既有账本的本批报告/提案追溯和waiting缺口；不重复新增学习事实/证据样本，不改变旧claim/version/effect或既有shipped状态。已有proposed条目保持proposed，其他条目仅补链接/注记。原十ID继续等待新角色局，不新建重复提案、不覆盖原文、不修改learn.json或请求。

运维接收proposal.md、report.json和对应提案处置即可；本批没有actual live新提交、release_id或shipped请求。根CLI回执保存在ledger-update.log与ledger-verification.json；本工作树HEAD及git diff保持基线，scratch被现有忽略规则覆盖。

## 机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261014-041302-strategy-proposal",
  "base": "4454bd24d1331c7eca756d302e5686a2d023f6f7",
  "runs": [
    "NHA2KW0RB7VP",
    "P74C04AEPL1F",
    "G33HU22H2543",
    "RC61MFQM63Y6",
    "BTSRF7JL1W1Y"
  ],
  "fixes": [],
  "skipped": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-9952ee8e8df9a0fe",
    "silent-proposal-47be799a87af03be",
    "silent-proposal-3a5274da3c42672a",
    "silent-proposal-bc4b92d590f2c4ce",
    "silent-proposal-f52fbbab4dccc3b4",
    "silent-proposal-10f37c0edd3d24a6",
    "silent-proposal-3f82387e2e179703",
    "silent-proposal-aee21084c991abd3",
    "silent-proposal-df37594e9b12debf",
    "silent-proposal-42e81c83b2e1e56b"
  ],
  "implementation_domains": [],
  "proposal_results": [
    {
      "id": "silent-proposal-9952ee8e8df9a0fe",
      "state": "waiting",
      "reason": "现有SL资源比较入口仅列当前回合预测并标execution=unverified，缺受控完整后继、同预算逐样本轨迹及连续资源消费者校准，不能据T1差额新设SL/终局门槛。"
    },
    {
      "id": "silent-proposal-47be799a87af03be",
      "state": "waiting",
      "reason": "计划事实与手牌快照已有入口；缺每个合法弃牌分支的触发、动态精确切击伤害、逐敌格挡/剩血及实打校准，不能把选择帧7伤固定成保留线的伤害。"
    },
    {
      "id": "silent-proposal-3a5274da3c42672a",
      "state": "waiting",
      "reason": "逐敌失衡、翻挡、毒与滑溜有既有模型/经验；缺主怪末归零中间帧、复活完整毛伤归属及多来源预测/实际校准，未定位可独立修复的新模型差额。"
    },
    {
      "id": "silent-proposal-bc4b92d590f2c4ce",
      "state": "waiting",
      "reason": "首牌子项已有实现，但原宽项还包含动态弃牌后继、能力支付/实建层数/存活窗口及消费者验证；缺这些完整数据，不能把整个ID登记duplicate。"
    },
    {
      "id": "silent-proposal-f52fbbab4dccc3b4",
      "state": "waiting",
      "reason": "缺未走路线、休息/锻造和跨战留药的条件匹配完整结果及连续资源消费者校准；实际资源观察不能直接拟一般路线血价或药水持有阈值。"
    },
    {
      "id": "silent-proposal-10f37c0edd3d24a6",
      "state": "waiting",
      "reason": "观察支持已登记的临时力量、毒结算、翻挡和实际回复；缺内部逐次结算、去组件对照和未观察组合，未找到新增确定模型差额或一般药价依据。"
    },
    {
      "id": "silent-proposal-3f82387e2e179703",
      "state": "waiting",
      "reason": "缺纠正可达性后的同预算逐样本轨迹、受控完整后继与独立校准；资源预测日志已有子入口，但实际首/末对照不是SL对象原线/替线的成对反事实，不改饱和SL门槛。"
    },
    {
      "id": "silent-proposal-aee21084c991abd3",
      "state": "waiting",
      "reason": "缺最终执行线逐样本完整轨迹、同起点分支对照及独立校准；题面已包含1/4死亡，单次实际死亡不能识别模型失配、调权重或固定杀序。"
    },
    {
      "id": "silent-proposal-df37594e9b12debf",
      "state": "waiting",
      "reason": "普通唯一单弃已有子实现；完整多选、目标、能力兑现、持牌自损及饱和SL存活窗口的消费者验证仍缺，不能将整个宽项登记duplicate。"
    },
    {
      "id": "silent-proposal-42e81c83b2e1e56b",
      "state": "waiting",
      "reason": "缺另一条路线、休息/锻造、留药的条件匹配完整结果及连续资源消费者校准；旧投影70与实际52不构成同条件误差，不能确定一般安全血线。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-041302/learner/runs/20261014-041322-strategy-proposal/report.md"
}
```
