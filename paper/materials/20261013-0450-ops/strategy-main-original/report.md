# 静默猎手策略提案核验报告

本批已逐项处理领取的十个提案，均为 waiting。已有诊断子项确为实际 live 源码祖先，但剩余的实际整轮归属、完整后继对照和独立验证没有补足，不能把部分字段记为整项 implemented/duplicate。本批无新增源码、知识条目、提交、合入或行为发布；不声称经验库已入库、大脑已采用或通关率改善。

## 身份与范围

- task=strategy-proposal，character=silent，batch=20261013-041242-strategy-proposal。
- 工作树：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-041242`。
- 开工 HEAD：`39f5d913477d2d3ec1834388f66c1793c3feb48b`，工作树干净。按普通任务要求 `git merge --no-edit main` 成功快进；报告 base/最终 HEAD：`6a4a4e1f171df830903d5fe60b6511ff11983e3b`。
- 本批派发行 reason=proposal，含十个 proposal_ids，不带 research_request、implementation_request 或 proposal_repair。普通身份核对读取根 `notes/strategy-research-silent.json`，其 batch/worktree 不匹配，保持普通提案任务；没有承接、读入或改写其他专题。
- 已读 README、最新 STATE、decision-log 末尾、learning-protocol、learning-code-proposals；未派下级 agent，未联网、调用模型、运行 play、读取游戏二进制或其他角色知识。
- 十份原提案按队列 SHA256 核字节并原样保存为 `<id>.md`。来源、证据、账本与本批补充集中在 [proposal.md](proposal.md)；dispatch.json/dispatched-proposals.json 保存领取身份。不新增重复提案 id，不改原提案或根调度状态。

## 原始证据

六个 runs.jsonl 唯一记录均为 SILENT、A10。历史开局均有 dirty 标记；本批不声称还原开局 dirty 源码。总体败局不能替代某场战斗的结果：PU80F84P6HPN 的 F17 第五试胜余2血，最终在 F33败。

| 局号 | 决策 | 状态 | SL记录 | 计划 |
| --- | ---: | ---: | ---: | ---: |
| 751FN9QM9MHQ | 615 | 624 | 6 | 2 |
| KV0JHNJCKXLS | 669 | 686 | 7 | 5 |
| YQL8RZ8BWN1E | 571 | 582 | 6 | 3 |
| L9SGRBB5R698 | 635 | 653 | 6 | 3 |
| PU80F84P6HPN | 1033 | 1064 | 12 | 5 |
| KEN58SH9SLZ6 | 548 | 558 | 6 | 3 |
| 合计 | 4071 | 4167 | 43 | 21 |

加六条 runs 和六条 run-config，共8314条原始记录。所有原行保留行号/字节偏移；raw-evidence-index.json 逐条记录长度及 SHA256，并重新从只读根 logs seek 验证。run-plans 实际身份键为 run，states 实际身份键为 state.run_id；首次按通用 run_id 抽计划为0，已按真实结构补齐，未把0当不存在。

### 同盘血价与反向取舍

以下是下一回合状态的净HP差，包含毒、反伤、选择和续问；候选题面的牌伤与它分开。六次 SL 是同一局的相关尝试，不能当六个独立验证样本。六组原指纹逐字一致，已通过 observed_ts 对应各自原帧。

| 局/层/回合 | 决策行 | 实际玩家净损 原→换 | 实际敌HP净削 原→换 | 可支持的范围 |
| --- | --- | ---: | ---: | --- |
| 751 F17 T2 | 272434/272575 | 13→18 | 9→18 | 多9净削付5血；B2差在配对误差内不消除血价 |
| 751 F17 T7 | 272531/272652 | 13→23 | 12→18 | 多6净削付10血；未决弃呼唤两线都有保守误差 |
| 751 F17 T13 | 272483/272820 | 8→2 | 17→11 | 省6血也少6输出，不能由省血推整战更好 |
| KEN F17 T10 | 274505/274568 | 15→21 | 2→4 | 无实体下多付6血仅多2净削；B2差−0.2583，SE 0.0132 |
| KEN F17 T5 | 274484/274601 | 7→5 | 1→2 | 省2血、追加小刀后多1净削，却把步法从T5延到T9 |
| KV F33 T5 | 273400/273450 | 0→0 | 36→29 | 删毒没有实际保血收益，次轮毒20→13 |

详见 same-board-pairs.json。KEN 末试首次2敏捷观测为 states:280702/T9；T8双防御没有提前获得这笔增益。KV 第五试随后仍出现重问273451，不能只用第一次替线题目断定后续全轮动作；后续记录一并保留。

这些双向取舍支持把当前已付HP、已兑现输出、持牌及能力建立分开。它们没有保持其余后继一致的整战胜负对照，不足以拟合固定血价、关闭所有较差未试线或修改既有HP护栏。

### 药水

751 F13 T3 decisions:272361：有药 plan2 与整战无药 plan5 的题面即时损血均8，牌伤26/16，各8/8模型样本赢；预计终结轮分别约2.3/2.9。plan3 只是本轮无药，后续7/8样本仍用 FLEX_POTION，不能混作无药整战。肌肉药水实际在272362、states:278403→278404消耗槽0；不存在实际无药整战或留药boss对照。题面缺表成本0并未证明持有价值为0。clam-candidate-facts.json 保留原题各支线。

KEN 的实际饮用行274131/274156/274185/274235/274237/274267/274272对应攻击、稳定血清、速度、虚弱、攻击、发光水、技能药水，均逐槽核前后消耗；实际七次喝、零次丢弃，六次F17入口均75血空药栏。F15的随机选牌、发光水后重问与后来实际动作有不同来源，不能将零净损全部归给一瓶药。没有F15不喝、留到boss或随机选择相同的受控分支。详见 potion-observations.json/ken-potion-summary.json。

### 巨兽阶段

YQL 六试首次占位帧回合为13/12/12/12/13/10；首次 DeathBlow 自爆意图回合为13/13/12/13/13/10。第2/4试先有带 STEAM_ERUPTION_POWER 的 Stun 占位态，首次占位不能一概称已经显示自爆；本体最后观测、首次占位及首次自爆意图分别存入 giant-stage-facts.json。现有 giantPhaseAtTurnStart 也要求 EXPLODE_MOVE、DeathBlow、无 STEAM_ERUPTION_POWER。

YQL 末试F17 T10 states:280160→280161直接显示毒2→8，但HP26、挡13、自爆41不变。只能支持该次残壳用药的局部观察；没有提前喝、不喝或留药的完整结果。L9/PU/YQL 的原 anchor 占位数以及对应失败/胜利记录保留在 attempt-facts.json，不能把近十亿占位扣血称本体进度。PU 的已有胜线也伴随其他动作变化，不能独自证明抹零或换排序有效。

### 恶魔回血：直接观测与重建

KV末试原始连续帧最终敌399→223，直接净削176。逐帧下降之和191、上升之和15；states:279559→279560从327/15毒到342/14毒，含 Heal 意图，毒结算和回血共用一个状态跳变。

依本角色既有 silent-0007/0102 的正常一次毒结算15，可重建回血30、毛削206；没有独立捕到312血中间帧。因此206/30标为机制条件下的重建，191/15/176标为直接观测，不能混称逐帧直接捕到的分项实测。demon-healing-facts.json 保存全部窗口及这个限制。前五试被SL截断的结算不补写。

## 已有 live 子项与剩余缺口

源码核验时固定 live HEAD=`9a411a54cfad66e4abdea2df71877e73b9e2c924`。以下提交均同时为 base 与该 live 的祖先；具体路径、源字节 SHA 和差异见 source-ancestry.json。记录祖先不等于本批新上线或自然消费者收益验收。

| 子项 | 实际源码提交 | 已存在的范围 |
| --- | --- | --- |
| 持牌保守损血/选线审计 | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 区分模型持牌失血与未决弃牌；候选及SL前后预测 |
| 药水持有未知参考 | c4670f4f416c7d93e192e889c5080e7e4e0e733f | hold_hp=null、成本来源；本轮无药与抽样整战无药分列 |
| SL候选资源比较 | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 当前回合预测血价、输出、成长及抽样范围 |
| 首次派发回执 | fdaf787a372880b0438e73bcac7e6d2168b038ed | requested/gated action与返回状态；不是完整执行 |
| 残壳毒药观察 | 40168f4a903ae1d8c48bd03006f8fea19fd3aa3c | 已观察自爆阶段与毒2→8的范围说明 |
| 阶段/末态展示 | b01edf46b4b619f217d070a196e161df9fe716a0 | 本体已结束、仍待爆；特定已验证末态资源展示 |

上述诊断模块在 base/live 字节相同；combat-plan、loop、turn-solver、explore 等集成大文件仍有已有跨树差异，保留并分别保存两份 `.source.txt`，未宣称整树等价。

live 的 selection_audit.actual_turn、candidate_comparison.actual_turn_result 和 selection_dispatch.actual_turn 仍为空；单次返回稳定也不证明完整选线执行。原始状态可用于离线核观测差额，但无法凭这六局填出未执行原线的实际整战结果。live anchorRank 仍用原始占位HP作同回合次排序；直接改成0会改变选择，缺少完整受控后继，不能把展示已补齐当排序已验证。

## 逐项处置

| 提案 id | 结果与具体缺证 |
| --- | --- |
| silent-proposal-366288801d9150d9 | waiting：同盘血价已核；缺续问整轮归属、未执行原线与一致整战后继，不能拟探索门槛。 |
| silent-proposal-85929bdfc8a3fc1b | waiting：已有未决持牌/持药未知诊断；缺实际无药、留药后继和联合兑现。 |
| silent-proposal-efd9f83ee9e1a6dc | waiting：已有候选血价子项；实际整轮结果仍空，六试全败，缺受控胜线及后期独立验证。 |
| silent-proposal-131042659448ae74 | waiting：单项机制支持不等联合因果；缺跨续问收益归属、实际无药及留药整战。 |
| silent-proposal-990f054036609447 | waiting：删毒两线零损、净削36→29；复合回血需条件重建，缺完整归属与相同后继整战。 |
| silent-proposal-e18d3f18e6cac2a0 | waiting：已有阶段展示，占位血仍参与次排序；缺替代排序完整后继及独立验证。 |
| silent-proposal-9733bb80f445aeae | waiting：残壳用药局部观察已核；缺提前喝、不喝、留药及改序对照。 |
| silent-proposal-c51468c5e8ba6668 | waiting：七次消耗与空栏入口已核；缺随机选牌/续问归属、F15不喝及留药boss分支。 |
| silent-proposal-86a7db08d1a31976 | waiting：省血/输出/能力有双向代价；缺受控能力后继及新独立局验证，不定统一血价。 |
| silent-proposal-e282a9131b99129a | waiting：预测/持牌/派发子项已有；缺完整执行归属、同后继整战与时间靠后验证。 |

原来源任务、每项账本和证据局号/层/回合见 proposal.md 及保存的原Markdown。不新增重复账本发现；只经根 ledger.py update 为16个既有 silent 账本追加本批报告链接和限制说明，保留原已上线经验的 status/version/evidence。原提案父状态留给调度器按 proposal_results 处理，不将报告完成当学习要求关闭。

## 验证与交付

证据字节/身份/六组配对/槽位/无源码差异验收由 verify-evidence.py 执行，退出0，见 evidence-verification.json/log。它是证据核验，不是生产测试。

分账分析三次初始断言失败均保留 analysis-first-failed.log：第一次仅按 COMBAT 漏掉选择与死亡帧；第二次把复合毒/回血的净变化误当毛分项；第三次混同首次占位和首次自爆意图。已纠正分析口径，最终分列验收退出0，见 analysis-corrected-check.json。没有改写旧日志或把失败称源码失败。

无源码改动，未运行撤源码/恢复测试、tsc、vitest 或模拟器；对应 tests={tsc:null,vitest:null,cases:null}。fixes=[]、merged=null、implementation_domains=[]。没有新提交、eval版本、shipped、live合入或规则变更双通知。

交运维的提案路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-041242/learner/runs/20261013-041302-strategy-proposal/proposal.md`。最终机器回执在 result.json，报告在本文件；材料扫描与最终干净状态验收见 final-verification.json。
