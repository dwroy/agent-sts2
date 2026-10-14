# 静默猎手策略提案消费报告

本批十项全部 waiting。两项头骨组合施毒的机制证据充分，但本分支对 live 的合并预检出现17个内容冲突；依任务第4节“有冲突就停下回报，不覆盖刷新数据”停止源码实施及合入。本批没有源码提交、测试、版本或 shipped 登记。

## 身份与基线

- batch：20261014-104302-strategy-proposal；角色：silent；reason=proposal；普通消费队列，十个原 proposal_ids 全部读取，未领取其他ID。
- 初始工作树干净，HEAD `31bddcc5fa17f56331238ca95f0e99dbc1ec7484`；按普通任务快进 main 后 base/最终 HEAD 为 `e1a5917174ea62adbba6c3d5ce82014a7dd507f4`。
- 根专题请求仍绑定另批20261010-150327；本批无 research_request/implementation_request，未读取专题 work_spec/manifest 或套用纯研究口径。
- 14个证据局均在根 runs.jsonl 核实为SILENT，早期三局A9、其余A10；十个派发锚点仅为本批 runs，另外四局来自已领取提案的原证据。没有读取其他角色知识。
- 原十个提案 Markdown 的SHA全部与专用队列一致；原文副本、本批队列快照和身份读回保存在本 scratch。
- 其他八项的游戏证据来源为已保存的本角色原提案/复盘；本批没有重做其全历史逐帧验证或认证完整候选执行。

## live 阻塞与停止范围

对 `b157504ec42b86fe716b8bfcb3c57d260a205bdd` 与 `e1a5917174ea62adbba6c3d5ce82014a7dd507f4` 执行 `git merge-tree --write-tree`，真实返回1，17个内容冲突。这里只做合并预检，未启动工作树merge，未提交知识刷新，未修改live文件，未进入上线锁或发布编号流程。全部诊断保存在 `live-merge-preflight.txt/json`。

冲突路径：
- `notes/fix-queue-v4.md`
- `notes/for-roy.md`
- `notes/lessons.md`
- `ops/inbox-dev.md`
- `paper/data/README.md`
- `paper/data/commits.csv`
- `paper/data/cost-curve-silent.csv`
- `paper/data/cost-silent.csv`
- `paper/data/cost-sources.json`
- `paper/data/cost-unattributed.csv`
- `paper/data/decisions_by_label.csv`
- `paper/data/learning-curve-silent.csv`
- `paper/data/runs.csv`
- `paper/data/summary.json`
- `paper/data/verification.json`
- `paper/materials/decision-log.md`
- `paper/materials/learning/ledger.jsonl`

这些是本分支与live已有历史/共享记录的冲突，不能认作待实现施毒补丁引入的冲突。没有覆盖任一侧记录或借本任务整合历史。由ops依原流程协调后，原两个ID可接续当前源码及消费者验证，不另建重复提案。

## 本批直接复核的施毒事实

七个已冻结状态与根 `logs/states.jsonl` 原字节逐SHA匹配，保存真实offset/bytes/sha256于 `poison-evidence.json`，原行在 `poison-evidence-raw.jsonl`：

- 7X0W3U8TVA2A F17 T3：普通蛇咬 base/current/enchanted均7，没有头骨。
- 同局F31 T1、T13：普通蛇咬base7/current8/enchanted7；当前已持有SNECKO_SKULL。前段两次0→8。T13前段12→4，未击杀。
- 同局F31 T13：饮毒药前后后段0→7毒、HP25与玩家1血14挡不变；结算后后段HP18，前段HP4，中段接续到25，玩家实际死亡。总来袭21，14挡仍需损7。
- 这是一个独立局、同局重复观察；7是该完整组合的施毒总量，不能再补一次头骨，不能反推未见基础药效或拟合早喝/持有价。

当前card-model普通蛇咬仍仅接dyn(PoisonPower)=7；combat-plan的observedPoison来源为已观察恶魔完整组合或特定连王，不覆盖这场千足虫。base与live三个源码blob不同，差异全文保存在 `source-diff.patch`；`source-audit.json` 保存独立blob和真实live祖先查询，未把子实现或注释归一化比较当整项消费者验证。

## 逐项处置

## silent-proposal-03754e1265894000

牌挡敏捷/脆弱/柔嫩逐张核；折扇被动挡、触发时点与持有能力分源

证据及账本：RC61MFQM63Y6，F17 T2/T11、F23 T3/T4、F29 T3/T4、F33 六试 T1/T4；账本 silent-0006, silent-0011, silent-0013, silent-0080, silent-0088, silent-0101, silent-0232, silent-0253。

处置：waiting。原提案的逐牌窗口有支持；八组件联合回放、首刀及折扇被动挡事件归属尚未验证。本批live预检17个内容冲突，依任务停止源码实现及生产消费者验证。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-024302-experience-update/proposal-mechanisms.md；SHA256 `518c139723decc4238c7ea5641e671c8738ec240118ff5140ca503612295599f`，逐字节副本 `silent-proposal-03754e1265894000.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-e5ea36df117ca9b7

核接管首轮与自主启动的事实边界；已有明确实现则duplicate，未记录自动过程保持未知，不由一败禁取遗物。

证据及账本：XTSV1U9JD34T，F34/F36/F49 T1；账本 silent-0164。

处置：waiting。首个稳定可行动状态已在原复盘记录；接管内部顺序及耗能轨迹未记录，尚未确立当前题面的具体误述或整项覆盖实现。本批live预检17个内容冲突，停止实现。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-031301-postmortem/proposal-controlled-opening.md；SHA256 `a305a121a184c84264ac5434fddaaeb75941c0a96a350abda85418824725c9ea`，逐字节副本 `silent-proposal-e5ea36df117ca9b7.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-ab055ef7dfbb44e5

验证夜魇收益的存活兑现条件，并只建模本局已观察的幽灵一层无实体；延后饮用整场效果不足，保留旧时点与药价规则。

证据及账本：XTSV1U9JD34T，F49 T1/T3/T4；账本 silent-0140, silent-0069, silent-0005, silent-0206。

处置：waiting。一层幽灵已有窄入口；复制收益能否在死亡前兑现的联合消费者验证、延后喝药同条件整战对照仍缺。本批live预检17个内容冲突；不能把子机制当整项duplicate。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-031301-postmortem/proposal-survival-and-ghost.md；SHA256 `c5490a44836c3900e1d03b59370dea8c076a8b5435236f7a5e575e4c0b516b17`，逐字节副本 `silent-proposal-ab055ef7dfbb44e5.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-0129c465c6f5bd79

强制弃牌后候选重核、毒胜保血候选及夜魇/接管首轮兑现边界

证据及账本：BTSRF7JL1W1Y F31 T2；XTSV1U9JD34T F48 T8/F49 T4；账本 silent-0009, silent-0021, silent-0024, silent-0057, silent-0079, silent-0090, silent-0140, silent-0164, silent-0205, silent-0268, silent-0271。

处置：waiting。单弃、毒胜保血、复制及接管属于复合提案；仍缺全部组件的联合生产回放与同条件SL后继。本批live预检17个内容冲突，停止实现；窄源码不关闭父提案。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-033315-experience-update/proposal-replay.md；SHA256 `bf425049a5868e3bec28ff845f0dcc2f5560594b3b85b4380a378ab2295bdcdc`，逐字节副本 `silent-proposal-0129c465c6f5bd79.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-abe9d5d0be109a9f

赢战血价、真实回复与存档恢复接续，连王剩血按实到资源

证据及账本：BTSRF7JL1W1Y F30/F31；XTSV1U9JD34T F47/F48 T8/F49 T1；账本 silent-0019、silent-0020。

处置：waiting。原复盘记录前战余血到连王；改线、留药、锻造的同资源完整后继及分源联合消费者验收未验证。本批live预检17个内容冲突，不拟新安全血线。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-033315-experience-update/proposal-resources.md；SHA256 `21263e5782fa17b030141cf5d79a9968115beeb1a99dc66f6309cbac9b51957b`，逐字节副本 `silent-proposal-abe9d5d0be109a9f.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-f16527e59b5cc1e0

敏捷/脆弱/覆甲分源、毒与临时减力时点及留挡上限按实帧核

证据及账本：BTSRF7JL1W1Y F17 T5/F31 T2；XTSV1U9JD34T F48 T8/F49 T1-T4；账本 silent-0005, silent-0006, silent-0011, silent-0013, silent-0016, silent-0027, silent-0046, silent-0069, silent-0095, silent-0128, silent-0196, silent-0241。

处置：waiting。原提案有局部分源帧，敏捷/脆弱/覆甲、临时减力及钳子留挡的联合生产回放未完成；延后幽灵整战对照仍缺。本批live预检17个内容冲突，停止实现。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-033315-experience-update/proposal-mechanisms.md；SHA256 `a71d6c87441d33115c5a8f4d3e0103673fd07798805978646f3a3961fb749079`，逐字节副本 `silent-proposal-f16527e59b5cc1e0.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-7a8e9ccb7e646538

毒/倍率挡/持牌伤及荆棘按实结算，SL换线预测与整轮实差分账

证据及账本：9Z9H2EXKLF3T F35、F48 末试 T2/T4/T8/T10/T11；账本 silent-0005, silent-0006, silent-0011, silent-0021, silent-0024, silent-0027, silent-0034, silent-0077, silent-0079, silent-0123, silent-0129, silent-0180, silent-0221。

处置：waiting。原末试T10的18→3与37挡是局部实帧；缺原dirty完整源码、逐击/持牌伤/复活/截断事件归属及同条件整战对照。本批live预检17个内容冲突，保留SL及必死规则。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-044250-experience-update/proposal-combat.md；SHA256 `e365da8858d06c845b8f83b662fad011721eeab59fd4e0dce4c46aa3925b640f`，逐字节副本 `silent-proposal-7a8e9ccb7e646538.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-cd9f76184de6e29a

跨幕缺血80%回复与营火/胜战消耗/SL资源接续按实到节点分账

证据及账本：原提案十局 A9/A10 的十六对跨幕状态，含本批六个早期锚点及9Z9H2EXKLF3T F17→18/F33→34；账本 silent-0019、silent-0020、silent-0243。

处置：waiting。十局十六对跨幕支持属于原提案已保存核验，本批未重做全历史；跨幕/营火/胜战耗血/上限变化/SL复药联合消费者验收及同条件路线后继仍缺。本批live预检17个内容冲突，不登记整项duplicate。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-044250-experience-update/proposal-resources.md；SHA256 `54f562100db0a2dbc72c07a5b1411e42838e3370221a23ea4b769795196c66aa`，逐字节副本 `silent-proposal-cd9f76184de6e29a.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-292f6731bdb9b669

核对静默A10头骨组合毒药水实加7毒与现有窄范围上下文，未知持有价不当已校准零值，不拟合早喝规则

证据及账本：7X0W3U8TVA2A A10 F31 T13，states:288470→288471→288472；账本 silent-0087、silent-0020。

处置：waiting。本批原始日志复核头骨组合毒药实加7机制充分；现有窄入口不覆盖本场景。live预检17个内容冲突，按任务停止接线，生产消费者未验证；早喝与持有价另缺可比后继，不能将阻塞误称机制缺证。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem/proposal-poison-potion.md；SHA256 `2f943d1aee2e7ed6d1ddfa07b469a4488d27525bad4714cec58f6a94917a8c63`，逐字节副本 `silent-proposal-292f6731bdb9b669.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## silent-proposal-e09a3905a3922b95

核对普通蛇咬base7/current8的头骨组合，扩展当前仅七毒数值边界，避免重复加遗物；不冒称旧修复覆盖全部增益

证据及账本：7X0W3U8TVA2A A10 F17 T3、F31 T1/T13，states:288203/288402/288405/288467/288470；账本 silent-0087。

处置：waiting。本批原始日志复核普通蛇咬base7/current8及两次0→8机制充分；当前七毒边界未覆盖该组合。live预检17个内容冲突，停止扩展；组合入模及重抽不重复加头骨的消费者验证未完成。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-044302-postmortem/proposal-snakebite-skull.md；SHA256 `5066561d71de499c27dba55e8cea63e220d95809a0f6091a31dcb31b136492f5`，逐字节副本 `silent-proposal-e09a3905a3922b95.md`。

旧行为、新行为、反例、验证及回退沿该原提案；本批未更改提案原文或扩大边界。

## 验证、记录与接续

本批没有改源码或知识，撤源码失败/恢复通过、tsc、vitest和cases均未运行，统一为null。日志原字节匹配与提案SHA核验是材料核验，不是生产测试。没有模型调用、网络、play、游戏操作、提交、推送、eval版本或已上线双通知。

只通过根learner/ledger.py update追加本批处置和proposal/report路径，不改已有claim、证据、prior、status或version，不新造账本/提案ID。根队列处置交最终proposal_results及原调度器，未直接改code-proposals.jsonl或learn.json。implementation_domains表示本批已领取并分析提案的领域，未声称这些领域有上线实现。

两次旧编号日志首行解析错误已保存在inspection-errors.json，随后按“原行号:JSON”正确拆分，七个目标状态均从根原日志seek读回匹配。错误及原件保留。

停止前后的工作树均须保持干净、HEAD等于报告base；临时材料均在本批learner/runs目录。ops从本报告和proposal.md逐项接续，不把本批报告结束当量化父要求完成或已入库/消费者采用。


本批收尾读回：根ledger CLI update实际退出0、9条note/by/where追加逐物理行SHA匹配、旧账本前缀字节保持；根ledger check实际退出0，468项0问题。scratch gitleaks实际退出0、未发现泄漏。最终HEAD与base一致、git status干净；这些记录检查不替代源码测试。
