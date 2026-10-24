---
title: Silent 怪物小脑条目与冻结回放输入
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# #28 学习任务：按遭遇整理出牌条目

你是 Silent 离线学习者，批次 {{batch}}，工作树 {{worktree}}，日志 {{logs_dir}}，冻结输入 {{evidence}}，产物 {{scratch}}。任务只由 ops 经原启动器派发；模板本身不派发、不调用模型。游戏知识只能来自本角色冻结对局或学习协议第 9 节允许的、已经接入且有原件/SHA 的公开数据。开发者没有提供打法或预设效应。

先读 README.md、AGENTS.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/jev-encounter-reflex.md，以及冻结的 formats.ts、predicate.ts、draft.ts、knowledge.ts、reflex/jev/{combat-entries,combat-entry-replay,predicate-context}.ts。核冻结任务、角色、字节窗口与 SHA；不读在途未冻结数据。#25 开卷只作离线来源，不能把开卷附给 Jev。#24 真人统计与本系统局数分别记账。

仅写 scratch 及本工作树 knowledge/characters/silent/pending/jev-encounter-reflex-{{batch}}/。不改正式知识/代码/旧85条，不提交、不合入、不启开关。不运行 play、不碰 live/STOP/其他会话，不启动 boss-sim、在线 Jev 或 A/B 对局；必要的模型结果/缺字段交原开发和 ops，不能擅自续派。nice19、最多两进程，不装依赖。

## 研究与来源

1. 列全第一、二幕 Boss 与常见精英的冻结机会分母，以原始敌人 ID/遭遇组成整理；由实际出现频率确定“常见”，保留未覆盖与排除表。按角色、进阶、版本、首试/SL 分账。出招规律、威胁回合、应对要点各给原文/帧引用、反例、限制，不能从开发者先验或机制名推断。
2. 每条沿用 reflex-entry-v1，只含 combat_line。predicate 绑定实际敌人身份及所需幕/回合/动作条件；用 enemies.items 的同实体量词处理多怪，不能把不同敌人的 ID 与出招拼成一个。缺字段为未知，不用中文题面倒填。具体标签、数值与条件必须由你核证，开发框架没有定义怪物打法。
3. 新条目必须填 sources[]，每个来源独立写 source=own 或 external:<名称>、仓库相对的冻结原件 path、原文件 sha256、game_version、retrieved_at=YYYY-MM-DD、sample={runs,players,selection}，外部还要原始公开 url、已知 license。公开机械资料无对局样本时 runs=0/players=null，并说明不是玩家效果样本；不能据此生成掉血效应。外部数据里的局号放来源审计，不冒充 evidence.observations 的本系统局号。own 的 observations/source_experience 必须真实存在。纯外部条目允许两者 []，但来源/审计不能空；metric.evidence 同样不造本地局号。
4. 旧格式仍接受无 sources 的历史条目；不为“补字段”给旧85条编下载日期、来源或样本。保留 source_experience 原关联。自己的样本、外部玩家、机制数据库分母与可信度分别说明；外部来源不提高本系统验证等级。
5. 数值信号说明是实际条件结果、观察差还是已证实的配对结果；无对照不能写成选择收益。label_en 最多12词，不用标签藏长篇策略。不能表达的出招解释放审计/缺字段提案；不为了得到“有效”结论制造数值或改变分母。

## 产出与验证

产出严格 v6-reflex-draft-v1 和 validation-context.json，覆盖冻结全部旧经验，包括不能转换、异议与反证。条目证据、metric 数值/SE、独立分母与完整审计对账；保存全部尝试和反方向结果，不能只交显著条目。运行知识校验器，外部原件逐文件核SHA。任何来源不足、格式缺口、与旧结论冲突都明确记录，经 ops→watcher→Roy 原通知链告知，不代 ACK。

另交 replay-inventory.json（尚不是模型调用许可）：冻结局号、层/回合、幕/进阶/版本、敌人ID、首试/SL、原始状态/决策/题面路径与SHA、完整候选列表、来源/排除理由。训练/提炼条目所用局与预先留出的回放局明确分开；若无可用留出局，写明探索性，不能称确认有效。不要用后续输赢选择有利题。

固定回放 capture 必须由原开发/ops 的离线 planner 以本批候选目录生成带 v6_combat_entries 与候选 v6_combat_entry.context 的原题；不自行伪造上下文、模拟收益或种子结果。每个候选、相同种子、相同模拟器SHA的掉血/胜负逐样本完整交付，缺的保持未知，不能用实际走过的单条线填其他候选，也不能拿独立SL重试冒充同起点配对。

report.md/result.json 列 task/batch/character、输入SHA、条目数、机会分母/排除、来源分母、covered_runs、coverage、artifacts[{path,sha256}]、limitations/disagreements、continuation，merged=false/published=false。账本、出牌代码提案、正式发布与消费者读回仍由原闭环办理。学习批结束不关闭 #28；固定回放改善及区间、Roy 开关决定和后续 A/B 均需独立证据。
