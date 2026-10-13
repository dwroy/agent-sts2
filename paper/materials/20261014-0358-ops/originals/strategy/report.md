# 本批静默策略提案处置报告

任务：strategy-proposal；角色：silent；batch：20261014-033425-strategy-proposal。

完整 base：`02d1e183dd84b67c2c12a9a6ccfe25502a7eac49`。

十个派发原提案全部 **waiting**。`fixes=[]`、`merged=null`。没有生产源码或经验库改动、源码提交、合入、新行为版本或 shipped。原提案、原复盘、限定证据、失败记录及消费者读回均保留。

## 身份与边界

开工工作树干净；普通批次按要求执行 `git merge --no-edit main`，返回 `Already up to date.`。本批 learn 行 task=strategy-proposal、character=silent、reason=proposal，worktree与本树一致，带十个 proposal_ids，无 research_request、implementation_request 或 proposal_repair。普通专题请求绑定另一个旧批次，本批没有读取它的冻结专题输入或转成专题。结束前再次核身份，HEAD未变；详见 dispatch-identity.json。

已读 README、最新 STATE-2026-10-12、decision-log 末尾、学习协议及代码提案闭环。只分析六局 Silent A10 原日志、各局既有复盘、本角色关联经验与账本及相关实现源码；不从其他角色知识补游戏结论。旧运行 code 带 dirty，不能以当前源码复原当时完整运行输入。

## 原证据与实际消费者

六局共 4,062 条原状态和 3,941 条原决策。目标房间提取 1,060 帧、185 个观测回合边界，另逐字核验 11 条关键候选决策。仅四条无 decision_id 的原元数据行从消费者输入排除：CA 267143；DUZ 268789、268818、268864。行号保持原始日志位置；排除理由见 consumer-input-exclusions.json。

现有 `learner/audit-selection.ts` 在六个冻结单局输入均实际退出 0。共消费 3,937 条动作、641 个候选片段和 636 个整轮窗口：186 个可核实端点，450 个 unknown。完整候选执行、实际最佳线、逐来源因果及未截断完整入伤仍为未知。这是离线证据消费者读回，不是大脑自然采用或胜率收益验收。

| 来源局 | 原状态 | 消费动作 | 候选片段 | 整轮端点 | 整轮未知 |
|---|---:|---:|---:|---:|---:|
| DUZUBAJ3A8GP | 623 | 599 | 77 | 28 | 68 |
| 5PM6JAQG6FNQ | 660 | 638 | 83 | 25 | 76 |
| CA5KE8GFJ9X2 | 282 | 264 | 41 | 0 | 46 |
| 8JRE1C4H4Z2W | 676 | 659 | 113 | 44 | 67 |
| YF0LXT1QSTGG | 1091 | 1065 | 204 | 54 | 106 |
| XP2SL33HT0D9 | 730 | 712 | 123 | 35 | 87 |

各输入/输出真实 SHA256、计数及退出码见 consumer-validation.json。原日志行号/字节 SHA 见 raw-evidence-provenance.json；十份原提案正文指纹见 proposal-input-manifest.json；六局既有复盘原字节见 existing-review-manifest.json。本批没有重写历史复盘。

## 当轮配对与机制端点

以下四组原观测 fingerprint 逐字相同。扣敌指同一观测轮至下一玩家轮的敌本体净 HP 差，含已结算效果，不是逐牌因果或未截断毛伤。

| 对照 | 原线实损 / 扣敌 | 替线实损 / 扣敌 | 替线 − 原线 |
|---|---:|---:|---|
| 8JRE F33 首/第三试 T2 | 3 / 10 | 15 / 17 | 多损12，多扣7 |
| YF F48 第二/第三试 T1 | 0 / 45 | 9 / 38 | 多损9，少扣7 |
| XP F33 首/第二试 T3 | 9 / 24 | 14 / 27 | 多损5，多扣3 |
| XP F33 首/末试 T1 | 2 / 25 | 10 / 34 | 多损8，多扣9 |

另核 DUZ F27 污染3/3/6与后轮6/12/18；CA F13 加压4/8力与喷射11/15/19；5PM F38 电击2/4力、17/19攻且临时 index4→3；YF F48 阶段4/111→212/212、后来取得敏捷不倒补既有23挡；XP F33 轮初14挡、临时−9力及火箭57→38→28。详见 verified-frames.json。临时 index 不认证跨帧实例身份，缺终态的观测边界记 null。

YF末战恢复挡续步仍败，但F33重打实胜；XP付血换线包含永久力量成长；8JRE末试偏保血延至T11仍死。反例保留，不据当轮血价禁止全部探索、强制保血或认定某能力无价值。

## 十项处置

完整旧请求、每项全部原账本、层/回合、反例、预期行为及验证方法见 [proposal.md](proposal.md)；机器处置见 proposal-results.json。

| 原ID | 证据及主要账本 | 具体未完成范围 |
|---|---|---|
| silent-proposal-c20b5139dd0dff71 | DUZ F27 T4–T5；silent-0168 | 已有污染路径；缺实际移动表及火花/污染/毒/挡联合生产回放，替线后继未实打。 |
| silent-proposal-ae9e692d680e3819 | 5PM F39 T4–T6；silent-0183/0005 | 遗忘未死，缺返敏与混合来源归属、返还后同轮续牌；失落返力不能验收双属性完整实现。 |
| silent-proposal-52f1e1bd2e7db0ed | CA F13 T1–T5；silent-0231 | 首样本HP/攻击读取已有；缺实际A10输入与加压/弱/覆甲/荆棘联合回放，减层条件未隔离。 |
| silent-proposal-6dd8bbff876be528 | 5PM F38 T3–T4；silent-0233/0209 | 成长路径已有；缺新旧同类召唤者身份隔离及冻结模板，index重排不证明替换不继承成长。 |
| silent-proposal-578e415a259e6835 | 8JRE F33 T2/T5/T11、F17 T6；原12账本 | 缺跨重规划完整候选归属、逐来源累计兑现及SL恢复资源联合分账；原0016来源勘误保留。 |
| silent-proposal-c0767768bf6a7ab1 | YF F48 第二/第三试T1；silent-0079 | 预测比较/单动作回执已有；缺完整候选归属及同起点、抽序、资源预算的独立完整对照。 |
| silent-proposal-a46bdb7fe711d79a | YF F48 末试T3–T5；silent-0021/0027/0028/0085 | 阶段/零毒触媒事实已被消费者读回；逐来源累计毒伤/挡和跨重问候选归属仍缺。 |
| silent-proposal-1044224808015e5c | XP F33 T1/T3；silent-0079 | 两组当轮血价已核；缺整线归属、成长净贡献及独立后置A10双蟹整战对照，不能拟血价权重。 |
| silent-proposal-7cbc6005db712ba9 | XP F33 末试T2–T5；原7账本 | 单项机制已有；缺额外挡来源隔离、混合意图及未知条件下联合候选消费者验收。 |
| silent-proposal-c59f592f1427a67e | YF F48、XP F33；原22账本 | 缺全部组件联合验收、跨续问整线归属、累计来源收益及SL资源分账，局部子项不关闭综合父项。 |

发现/固定验收只用六个原局。同存档SL尝试按 run 分组，不增加独立局分母。未来参数变化需保存同起点、抽序与资源预算完整对照，并用之后结束的本角色A10局后置验证；本批没有此类独立验证，不拟任何新策略系数或强制优先级。

## 既有实现与验证边界

核验时实际 live：`60d5206de96389c3430370c0dbb8704f32714d7a`。13处相关源码最新提交均为实际live祖先；10处逐字节相同，turn-solver、rollout、passive-pieces三处仅各两行既有Roy/Dai注释拼写差异，归一后字节相同。未修改任一checkout。完整源码commit与SHA见 source-readback.json、source-comment-differences.json及保存的差异。

现有候选快照、SL当轮资源比较、单动作回执、阶段现场事实与离线整轮端点属于已实现子范围。完整候选归属及累计来源收益仍未知，不能将十个宽提案登记为 implemented/duplicate。实际live祖先证明确认现状，不表示本批有新合入。

32项固定证据核验通过，逐项清单和日志保存于 fixed-evidence-verification.json/.log；六局消费者退出0见 consumer-validation.json。未改生产源码，未运行tsc/vitest，未撤源码做红绿，`tests={"tsc":null,"vitest":null,"cases":null}`。本批不复用历史测试结果报成功。

## 追溯、异议和交付

十份原CLI输入经根目录 code_proposals.py add --character silent 原样去重验证，均返回原ID；没有新增ID、覆盖原文或改变队列处置。账本只经根目录 ledger.py update 追加本批 proposal/report 链接与限定处置 note，不重复写历史证据、不改 claim/status/version，不把既有 shipped 回退为 proposed；原 proposed 状态保持。CLI输入、结果及逐物理行读回见 ledger-update-input.jsonl、ledger-cli-readback.json和 code-proposals-cli-readback.json。

原综合提案金刚杵→silent-0016与该账本覆甲claim不一致，是此前已经记录并通知的来源勘误；本批不改原claim，不重复通知，也不把它当作新游戏反证。未发现需新增转达的异议或机制反证。未实际改变策略规则，因此没有新版本、旧新规则双通知或 shipped。学习父要求继续由原链验收，waiting均保留原ID。

提案绝对路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-033425/learner/runs/20261014-033438-strategy-proposal/proposal.md`。

报告绝对路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-033425/learner/runs/20261014-033438-strategy-proposal/report.md`。最终机械JSON为 result.json；结束状态和扫描结果见 final-verification.json。

## 失败记录保留

一次shell沙箱构建因并行s2工作树路径消失发生bubblewrap/rg ENOENT，同权限重试后成功；不是生产代码失败。只读探索中不存在的agent/test、monster-db-context.ts、learner/*audit*.py、根.gitleaks.toml，以及nice不能运行shell内建command，均保留探查失败并使用实际路径。git diff --no-index退出1仅表示已核注释差异。

报告生成初稿有一处f-string未转义JSON花括号，写出proposal.md后、写report.md/result.json前失败；保留错误转录并改用明确文档写入，没有改动源码或倒写测试结果。详见 material-read-diagnostics.txt。原失败、原件与本批证据均未清理。
