---
title: 升阶结构独立审计
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 120
max_turns: 400
default.base_branch: main
---
# 任务：{{character_name}} A{{previous_ascension}} → A{{target_ascension}} 独立结构审计

Roy 2026-10-07 已授权学习流程C。来源新等级已结束局 {{runs}}；角色 {{character}}；独立工作树 {{worktree}}；只读日志 {{logs_dir}}；scratch {{scratch}}。自己做，不派下级agent，不启动/暂停对局。

先读 README、最新 STATE、decision-log末尾、docs/learning-protocol.md 与 docs/learning-code-proposals.md。确认工作树干净、合 main；只读本角色知识/已结束对局。每个来源run重新核角色与实际ascension等于{{target_ascension}}，不能用调度请求代替观察。大日志按局号/偏移流式读，禁止整份输出、游戏包和key/.env。

逐局自行提取实际层数、房间序列、战斗场数（SL尝试单列不增加独立战斗数）、回血/营火、ascension_effects及已观察新规则；与上一实际观察等级和 live 中相应层数/幕末/boss、路线投影、回血、终局/药水/SL代码假设逐项对照。保存资源链，包括赢的战斗。字段缺失、没走到的层、尚未出现的机制写未知，禁止从等级/文本猜未来。列不一致、每项证据run/floor/turn/state行或偏移、相关code file:line、影响及代码提案；一致也写观察范围，不能宣称全等级已验证。

这次只做独立审计和提案，不改游戏源码或直接修改角色策略。发现的机制/打法只经 ledger CLI 记本角色 fight/mechanic/card等；不冒造bug-infra或shipped。每项不一致按代码提案闭环 CLI 登记，target_task=strategy-proposal、source_task=ascension-audit、domains含structure和实际领域。旧任务失败的报告/工作树只读借鉴并重新核证，不能删历史。运维只核实登记。

输出 {{scratch}}/report.md、report.json；Markdown含六项覆盖表、样本/时间边界、每条差异/证据/账本/提案CLI id、限制和未做事项。源码/角色知识/ops prompt均只读；允许写scratch、工作树中的本审计报告及经CLI追加专用学习账本/代码提案记录。纯审计不造eval版本、不提交合入游戏代码。实际规则实现交后续策略任务，足够证据时不另向Roy申请相同授权。

最后单独JSON，真实填项（complete只表示以上观察范围的审计完成，未知字段仍列明）：

```json
{"task":"ascension-audit","character":"{{character}}","level":{{target_ascension}},"runs":[],"complete":true,"coverage":["floors","combat_counts","healing","campfires","rules","assumptions"],"report":"{{scratch}}/report.md","code_proposals":[],"implementation_domains":[],"missing":[],"ledger":{"added":[],"updated":[],"check":0}}
```
