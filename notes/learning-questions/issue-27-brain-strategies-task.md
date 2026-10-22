---
title: Issue27 Silent 大脑首批情境策略
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
characters: silent
---

# 原请求 #27：学习者编写首批大脑文字策略

请求 github-issue-27-brain-strategies-20261022；任务 issue-27-brain-strategies-task；批次 {{batch}}；角色 {{character}}；工作树 {{worktree}}；只读原日志 {{logs_dir}}；输入 {{evidence}}；结果 {{scratch}}。本轮由原 ops 根据 #27 明确指令派发，自己完成、不派下级模型。模型 gpt-6.1-sol/high，保持原学习者沙箱和账号。此任务不恢复旧 Jev 拿牌学习，不启动模拟/MC、模型 API、对局或新实验。

先读 README、最新 STATE、docs/learning-protocol.md 第3/9节、docs/learning-requests.md、docs/learning-code-proposals.md、docs/brain-strategies.md 和 docs/v6-plan.md §13。目标是 #16 提供的 brain-strategies-v1 首批真实条目，不是重复写基础设施。#16、#24 已验收交付，#25 冻结知识亦可用；#26/#33 的生产上线与本任务内容形成分开记录。

## 冻结输入与知识边界

读取 manifest，核 request/issue/task/batch/character、文件 SHA 与字节数。files.path 是不可改的冻结副本，original_path 指原来源。不得以随后更新的主目录文件替代快照。全部已结束 Silent 局清单及日志各文件冻结上限在 manifest；原始 logs 只按索引/精确局号、offset/bytes/SHA 定位，禁止越过上限混入新局。整流未哈希照实标明，引用具体片段逐段哈希。缺失输入明确保留；历史材料稀疏检出缺失时按原存储恢复接口取精确 Git blob，不能声称原证据不存在。不要整库/原始 states 灌进模型。

**依据允许两类分账证据**：本系统已结束 Silent 对局；以及 Roy 已授权的协议第9节公开 STS2 数据（本批冻结 #24 sts2fun 聚合、#25 spire-codex 开卷）。不再使用“只能依据本系统对局”的旧限制。每条外部事实保留 URL、版本、样本口径、SHA、许可/Required Notice，external:来源名；不得把外部局当本系统局，也不能借其他角色验证 Silent。聚合数据无逐局编号时用 #42 external_aggregate 合同（docs/brain-strategies.md），不填 run/floor；保留 source/URL/version/dataset_sha256/downloaded_at/filters/statistic/denominator/design/limitations/license，有区间才填 interval，ref 追到精确表/行/快照。不能忠实表达则保留候选及说明，不伪造局号或 floor=0。

游戏知识由你核实证据得出，开发者/ops/计划举例/预训练知识不能供给机制或策略。既有经验/复盘需要追溯原局号与窗口。#16 数据集是观察性：接受答案不等实际执行，后续掉血不等选择因果效果；未知版本/缺帧/null 不补零、不回填最终牌组。首试按首次死亡/SL截断，与含SL分开，同局重试不增加独立分母。外部普通/升级/进阶/版本、玩家/局/候选槽分母分开；同名不能强行绑定，样本不足不提升可信度。既有争议与科学父保持，不用报告结束关闭它们。

## 内容、查重与交付

先做证据覆盖/缺口表：自有独立局、实际观察窗口、外部版本及独立分母、未读/排除项分别列。按 #27 优先核第一幕 Boss（issue 举例同族、墨影幻灵只作优先级、不是已知机制）、第二幕 Boss、拿牌与幕初方向。由你选择适量有证据条目；允许某主题缺证，没有固定非零数量门槛。

正式文件只创建/更新 knowledge/characters/silent/strategy-entries.json，遵守当前运行时 parseStrategyLibrary 与 schema；不迁移/改写 experience.json。每条稳定ID/version、trigger、具体策略、可追溯evidence、source/confidence；标 design=observational，保留反例、适用边界、独立分母及未知值（可用 schema 允许的额外元数据/可追溯 sidecar）。同一结论可在 evidence 中混合两类记录，但 source=mixed，evidence_status 明确 aligned/conflict/unassessed；各来源、版本和分母分账，不加总。只有外部支持（自有仅反证也算）confidence≤0.49；有真实自有支持才可赋更高值，不能由样本数自动提级。发现冲突须保留双方原证据、role=contradict 并标 conflict，按原通知流程转达。无支持的不发布；不能照抄旧大脑理由、把 combat_line 改名 card_pick 或以单卡胜率证明拿牌收益。

查重已有正式库、经验/账本和本批候选。仅经 learner/ledger.py CLI 登记 observed/proposed 或关联已有ID，不手改账本/不标 shipped；纯外部 ledger add 不填 first_run/asc/prior_runs（筛选进阶放 filters），填 confidence 并使用同一 external_aggregate 对象；混合证据须 evidence_status 和真实自有元数据。用 show/find --json/check 读回核自有独立局、外部分母与冲突，update 只追加不覆盖。CLI不能表示就明确报告，不伪造局号/层数。若需要改消费者/格式/规则，先沿原 code_proposals.py CLI 记录证据和阻塞，不把架构修复扩进本内容批次。

固定自测至少包括真实新库 parseStrategyLibrary、每条正例/不匹配/事实未知/其他角色不读取、原最多3条/4096B序列化预算；使用已有五题回放或调用实际消费者核命中ID/version/source/evidence与输出字节，不伪造游戏后果。以本树当前 main 中 #33 工具查询与兼容检索路径分别说明实际覆盖；既有测试样例不是本批自然消费。只改数据/记录按现行规则无须重跑全部代码测试；如确改代码则 tools/test-sandbox.sh 并保留其固定排除/失败证据，宿主 full 由原 ops 补，不在沙箱绕开限制。不安装依赖、不新增在线请求。所有计算 nice，优先单进程，每任务最多4进程，不启动多worker full。

## 提交、发布与反馈

你可依证据完成内容、自测、gitleaks后提交本工作树（全局 Git 身份；Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>）。按原学习流程可自行合入 main，持原锁、检查并保留并行知识刷新、只集成本任务精确文件；冲突/权限受阻保留提交、diff与错误由ops兜底。主目录仅集成，不在其中开发；不要推送。正式内容产物和必要审计 sidecar 可写本工作树 paper/materials/20261022-issue27-brain-strategies/；共享根只允许 ledger/code_proposals 既有CLI追加，其他根记录由ops完成。只读所有其他角色与共享配置/ops prompt，不读凭据/.env/游戏二进制。

**live 发布由原 ops 接续**：提供 main/source commit、逐文件SHA、自测原件、消费者固定回放、回退点。不要自行修改 .worktrees/live、开局/移除STOP/切换decider/启用REFLEX或方向；Regent暂停保持。#27 第一项需实际 live，第二项需发布后首个自然大脑问题真实命中相关ID/version；固定回放/空库/文件可加载不替代自然命中，也不证明收益。不为验收多开局、不做A/B或前后检查点比较。

有不同意见/反证/旧知识冲突，逐项记录原观点、证据、结论差异、影响ID、下一步，供原 ops→watcher→Roy 实际转达；不得代其他角色ACK。保留初稿/失败/被拒条目及理由，不强行完成。只此一批，不自行续批或新增学习调度。任务结束由原启动器给ops事件，不能据退出关闭#27。

报告 report.md、result.json、coverage.json、evidence-refs.jsonl、entry-dispositions.json、自测/消费者原始输出及SHA写 {{scratch}}。最终JSON至少有：task/request_id/issue/batch/character/input_sha256、source_commit/main_commit/live_commit（未知null）、entries（ID/version/source/evidence/limits）、ledger_ids、changed_files与SHA、tests原命令/退出码、consumer_readback、questions（prior/finding/evidence/affected_ids/next_step）、report、continuation。分开 main_merged/live_published/natural_brain_readback，禁止把候选/提交/排队记作完成。
