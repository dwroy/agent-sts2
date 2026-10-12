---
title: Roy 最高优先 A10 回退排查
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# 独立批次：静默猎手 A10 回退排查

Roy 2026-10-08 08:36、08:51 明确要求最高优先调查并授权：找到有害改动就按 live 流程回退或修正，上线后通知 Roy。不是普通 fix 队列批次，不与 boss 校准、B4/B5 或策略批次混用。只做这项调查及有证据的修正，不扩大为打法优化。运维只派发、核实和登记，游戏知识由你从本项目对局证据得出。

工作树 {{worktree}}；根目录 {{project_root}}；角色 {{character}}；只读日志 {{logs_dir}}；临时材料 {{scratch}}。开工读 README、最新 STATE、decision-log 尾部、docs/learning-protocol.md、docs/learning-code-proposals.md，以及根目录 notes/fix-queue-v4.md 最后「A10 回退排查」授权原节；确认工作树干净，先合 {{base_branch}}。目标分支 {{merge}}、目录 {{merge_dir}}。

## 原请求与调查范围

观察者的初步拆分：静默 A10 共 83 局，以 S1.double-boss1 上线 2026-10-07 14:11 为界，到 F48 10/38（26%）→7/45（16%），到 F33 55%→42%，二幕路上死亡 13%→24%；熟睡甲虫/盛碗虫四次等。数字和「同期其他改动」都是待核实线索，不能直接当因果结论。

1. 用 eval/metrics.py（--character silent --ascension 10 --group-by version / config）和日志库，按实际上线版本、配置分段定位到 F33/F48 比例从哪段下降。冻结统计切点并列纳入/排除局号、分母、各组样本量及置信区间；区分同局 SL 与独立局。按每局真正启动时间、run-config、源码/版本、实际答题引擎归组，不用完局时间或日志标签臆测上线暴露。dirty 历史完整树缺失、未知版本/配置如实列限制。DeepSeek 大脑局按已有 Codex-only 统计规则单列，不能混入默认战绩。小样本下不要把相关性说成因果，也不要仅凭不显著断言正常波动。
2. 核对 S1.double-boss1 的三幕路线、营火、构筑与连续两战资源估值是否实际影响一、二幕：调用条件、传参、提示及权重，比较精英数、休息/升级、拿牌、入二幕牌组/HP/药水和资源消耗链。核查相关局的赢战耗损，缺反事实不声称可转胜。
3. 核对取消 DeepSeek 兜底前后 Codex 答题失败、暂停/恢复的真实记录，以及失败时 Jev/代码代答的题数、类型和成功执行证据。区分历史统计字段与实际引擎，不把正常程序执行当大脑替答；如仍有代答违背 Roy 的 Codex-only 规则，保留原帧、错误、回答和执行证据并修正。
4. 按版本检查同期出牌层修正，重点 S1.fix45（铁蒺藜/HAZE）、S1.bullet-time1、S1.sloth-replay1、毒相关修复：二幕走廊战执行闸拒绝、求解失败、预测/实打偏差，注明首次发生局/层/回合与实际源码是否可还原。分清既有已知 bug、修复是否生效、新回归与单纯战斗失败。
5. 回溯经验 S1.exp70→S1.exp90 的实际上线 blob、条目新增/改写和实际题面暴露，重点二幕走廊与构筑；目前已有后续经验版本也单列，不能把当前内容当过去题面。逐条依据日志核实，未知机制/跨角色数据不补。记录改变决策的证据与未改变/无法判断的对照。

先形成版本时间线、样本表和可核证据，再判断。调查期间保存阶段报告，以便超时仍能交接；不要仅跑统计后结束而漏掉上述代码/配置核查。

## 有害改动的处理与边界

确认有害改动后，Roy 已授权你直接在本独立工作树做局部回退或修正，无须再请 Roy 拍板。必须说明旧行为、新行为、自己核实的数据/局号/层/回合、因果证据强弱、预期影响和回退方法。只撤有证据的改动，不把 live 整体退回旧版本，不覆盖其他并行功能或知识刷新；铁甲及无关范围保持等价。证据不足就保留行为和待证项；若归于随机波动，写清数据、置信区间及排除 bug 的实际核查范围。

涉及出牌、药水、SL、终局价值或结构不一致，按 docs/learning-code-proposals.md 保存提案 Markdown/JSON，并只经 `python3 {{project_root}}/learner/code_proposals.py add --character {{character}}` 登记关联证据。已经实现的提案只有实际源码成为 live 祖先才登记 implemented；游戏台账只按原证据及 CLI，不造架构/派发游戏知识或无证据 shipped。

只在分配工作树与 {{scratch}} 写源码、测试和工作报告。最终结论同时保存根目录 paper/materials/silent/a10-regression-2026-10-08.md（存在时保留历史再追加）、{{scratch}}/report.md 和 report.json。先 date，在根目录 ops/inbox-dev.md 写一句给 Roy 的结论；任何实际规则修改上线时，notes/for-roy.md 与收件箱同时追加旧规则、新规则、数据、证据局号、预期影响、回退方法。这些报告、提案 CLI 和通知是本任务明确授权的根目录记录例外，不覆盖无关/并行记录。

不读取游戏包、key/.env，不安装依赖、不推送、不运行 play、不停止对局或调度，不改生产配置或 ops prompt。不启动子学习者。后台统计/测试一律 nice，每个最多四进程；测试只用冻结夹具，不调用真实大脑。

## 测试、发布和真实回报

代码修改先固定实盘帧做回归验证，保存初稿失败、撤源码红/原字节恢复绿及检查树。每次代码提交前在 agent/ 原 `bash tools/test-sandbox.sh`（含 tsc、固定排除）通过，PATH 加 ~/.local/node/bin、TMPDIR 指向 scratch，SANDBOX_WORKERS≤4；不得削弱断言、改排除名单或把沙箱限制当代码失败。全局 Git 身份，提交前 gitleaks，提交尾带实际引擎/模型 Co-Authored-By。

按项目 live 流程自行合入：根目录 ops/live-merge.lock 内核对最新 live 与刷新/并行代码，保存全部刷新（含新增未跟踪知识）、预检重叠并记录合前 SHA。合后原沙箱通过再登记唯一 eval/versions.json 行为发布与 decision-log（先 date）。失败保留原日志，只撤本次改动并保留刷新；提交/合入受阻在回报明确交运维兜底。仅调查/记录无源码改动时，不冒造代码提交、游戏版本、shipped 或完整补测。

最终 JSON 沿 fix-batch 完成通道，task=fix-batch；fixes.item 写 silent-a10-regression，不当普通 bug 队列。列 base、实际源码 commit、test、fails_without_fix、skipped、merged/null、tests（仅实际执行结果）、报告/固定树/原日志路径；带 code_proposals（CLI id 字符串数组）与 implementation_domains（combat/potion/sl/terminal/structure，只填实际涉及，报告可空）。所有失败原件与缺数据保留，未执行或未合入如实报告。
