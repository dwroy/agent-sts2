# 静默猎手指定提案核验报告

记录时间：2026-10-12T21:13:07+08:00（写入前date）。批次：20261012-210134-s2-strategy-proposal。

本批10项均已逐项处理：1项duplicate、9项waiting，无新增源码或合入。proposal.md含逐项证据局号/层/回合/账本、旧规则与现实现、反例、预期行为及验证；原10份Markdown按登记SHA完整保存，未修改原文或生成重复id。

## 身份和结果

- base与当前HEAD：`e859c259ff4514fc4d84a00e7a55ebe8a5f2f357`；开工干净，普通批次merge main为Already up to date。
- 本批reason=proposal、character=silent，工作树与本次派发相符；没有research_request、implementation_request或proposal_repair。另一专题的请求不匹配本批，未读取其正文或承接研究。
- 新提交：无；fixes=[]、merged=null、version=null。不冒称原父提案都完成、经验已入库或本批shipped。
- 核验live：`44e82b09e670af9144e6e7d6f697cb0ac19f69b3`。取整实际源`ec29ea34b919344b707e57ba472ea210f9c39d62`是该live和本base祖先。原183755-s2报告当时因29处合入预检冲突waiting；后续运维已集成，故现在记duplicate，不改写当时失败。
- 核9条既有源码来源均为base/live祖先；13个相关路径工作文件等于base，7路径与live逐字一致，其余仅注释Roy/Dai署名。完整blob/SHA及差异见source-ancestry.json/base-live-source.patch；专用取整源码、测试和证据文件相对原源提交未变。

## 本次核验与限制

16条runs身份唯一且均为SILENT。原偏移回读主索引3352状态/3746决策并通过28项数值断言；容量9局42饮逐饮核验，底值26观测逐原字节核验；总计去重7222原记录、126157021字节，实际覆盖15局。K367仅身份和来源核对，不宣称本批复核其历史动作。具体行号、偏移和SHA见raw-evidence-union.json；同局SL不拆独立样本。

容量仍为37次添3、2次添2、3次满手添0；完整保留/用药策略缺后继。TXZ T6少损3但少伤9，首胜4血仍续战死亡；WQ T9多损9换15伤，T7付4血换沙坑一轮构成反例；NHA T1替线多损6、多16跨轮净伤但没有击杀。Q6精英胜后2血接走廊死亡，1913营火由计划回血变实际锻造，不能直接当同条件路线误差。这些观察不足拟固定权重或阈值。

当前resource_chain消费六局固定原帧，108项容量/开场/候选断言通过。这是数据核验，不是108项生产回归。保留restart/missing_exit/unclassified；未输入SL事件时间，不声称完整SL资源归因或反事实整战验证。

取整固定测试通过当前planCombatTurn→enemySims→replaySteps/describePlan消费者：六次NHA转向、15/16挡损7/6；其他角色/等级/未知组合/缺库或估计库保留旧路径，后续模拟轮不继承该精度标记。21个固定夹具状态逐对象等于本批重新核SHA的原日志。无胜率改善结论，也未调整SL资格、持药价或终局权重。

## 测试和失败保存

- 当前既有定向vitest：1文件、10项通过，exit0，见crusher-current-vitest-retry.log。
- 首次命令误用该Vitest版本不支持的--minWorkers，exit1且未进入测试；只删除该参数，未修改源码/夹具/断言，原失败日志crusher-current-vitest.log保留。
- 本批没有源码改动，不执行撤源码红绿、tsc或完整沙箱套件，tsc=null；不把已有修复的历史红绿/全套结果冒作本批运行。
- 原glob读取瞬态ENOENT、错误rollout查询路径、全树索引查询中止及源码署名规范化初败均记录read-errors.txt。规范化初败是将Roy子串误命中Royal，后来改完整单词并逐行检查差异都为注释；没有修改源码。

## 逐项处置

- silent-proposal-08eaa60bcc449852：waiting。缺同入口不饮药或留药到boss的完整后继对照；不能由F15零损校准持药价。
- silent-proposal-92920295a648b540：waiting。缺相同抽序及后续动作受控的连续通关对照；少损3同时少伤9不能用于校准SL或终局权重。
- silent-proposal-a327449c331efbc1：waiting。缺完整受控后继和独立后移胜负样本；不能把9血换15伤拟成阈值，付4血延长沙坑的反例也不支持一律保血。
- silent-proposal-a099e89437e942bb：waiting。容量42饮已核，但缺计划妥当跨轮保留选择、饮药复合触发及完整后继验证；不能用同轮生成子项关闭宽提案。
- silent-proposal-47910f82a1fdd98f：waiting。缺未知回复/复活组合的中间相位，以及SL血价和留药的完整后继；不能把有限开场子项当作全部资源策略完成。
- silent-proposal-f1374df72d8e6a25：waiting。缺同入口早饮/留药及相同营火条件的完整后继；当前观测不足调整高血护栏、药价或终局权重。
- silent-proposal-38a49e6c97f31eea：waiting。宽机制包仍缺致死轮逐击中间相位、复活/反伤和阈值/SL组合验证；不能由紧勒和重接子项关闭整包。
- silent-proposal-ef0e38a5dbd3bc07：waiting。缺同入口换线、休息/锻造和用药的完整后继对照；两条败局资源链不足校准统一路线或终局门槛。
- silent-proposal-cfecb5580938873d：duplicate。限定取整提案已有实际live祖先源码ec29ea34b919344b707e57ba472ea210f9c39d62；当前原帧固定回放10项通过，专用源码/测试/证据文件与原提交一致。旧waiting为当时合入冲突，现按真实部署更新为duplicate。
- silent-proposal-7f820c02d39bfaea：waiting。缺同抽序受控完整后继、可追溯击杀/存活推进与独立胜负样本；不能由多付6血、多16净伤确定SL筛选门槛。

## 交接

提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-210134-s2/learner/runs/20261012-210155-strategy-proposal/proposal.md`；机器结果：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-210134-s2/learner/runs/20261012-210155-strategy-proposal/report.json`。本批仅经根ledger.py给25条原账本追加报告/提案链接和处置说明，不重复旧support、不降级既有shipped、不改claim/prior/version。无需运行play、创建新版本或再次合并既有源。后续九项保留等待各项指定缺失证据；不得由运维补游戏结论。

最终干净HEAD、材料清单、账本前缀/CLI回执、密钥扫描结果分别见final-verification.json、artifact-manifest.json、ledger-update-receipt.txt、gitleaks.log。若最终核验失败，另存失败并据实回报，不宣称完成。
