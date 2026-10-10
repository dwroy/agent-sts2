# 静默猎手策略任务回报

生成时间：2026-10-08 01:34:47 +0800。batch 20261008-010309-strategy-proposal；完整base 4bc20104aa872bf7cc367773024055c878bb67f2。本批七局均已核runs.jsonl为SILENT A10。工作树同步main无冲突后创建独立功能分支。

源码提交：790b76d00dc23dedb970cb82a00cb3db6ff1cbb7。实现懒惰额度中的普通防御重放1；源码及固定输入共7路径。领域combat。其余9项逐项保留waiting，不冒认已有子模型完成完整提案。原队列ID已由code_proposals.py add复验去重，返回silent-proposal-a0853bed869d77fa，没有重复制造待办。所有原稿、证据、账本快照和失败日志保留。

## 证据和范围

KV0JHNJCKXLS A10 F33末试T8，states279574—279577、decisions273512—273514；账本silent-0245（模型缺口）/silent-0247（机制观察），来源postmortem/20261007-194301、实现strategy-proposal/20261008-010309。旧日志计划“防御、打击、中和；hp -0/dmg34”，现场防御重放14挡后打击，手动计数2而中和被锁，1血对16/14挡实死，总伤31。

新模型将该已观察额度与手动计数分开，在求解、固定序列、重规划/重启以及后续五轮/整场模拟传播。只适用silent A10懒惰3与普通防御重放1；最后一名额重放及其他自动牌边界标未知并保留选项。原慢速/柔嫩/凋萎和其他角色/进阶路径保持等价，固定铁甲元数据等价及原凋萎回归通过。没有证据宣称另一合法先手能赢整场；SL权重、喝药/留药、终局权重和架构均未改。

另外按原始offset/SHA直接核验5PM/DUZ/CA5相关66帧，XP/751原复盘指定范围225帧、YF指定范围124帧分别保存。不同尝试不扩独立样本分母；未来新结束的silent A10局作按时间后置验证。详见proposal.md、other-raw-proof.json、paired-source-summary.json、yf-source-summary.json。

## 验证

- 最终14例固定回归：撤生产源码7失败/7通过、退出1；恢复14通过/退出0。日志target-final-withdrawn.log与target-final-restored.log完整保存。原凋萎重放10例另与新14例合跑24通过，target-ready.log保存。
- 初稿夹具漏state_version/session造成12例失败，补回原帧必需字段；随后有1条断言误把最后名额未知线当成已确定非法，按原提案范围核“无未知标记的非法线”，保留未知选项。两次初始失败target-first.log/target-second.log完整保留，未放宽实际前缀、名额、死亡或撤源码红绿断言。
- 提交前原入口bash tools/test-sandbox.sh、SANDBOX_WORKERS=1：tsc0/vitest0/总退出0，共243文件、2554例；pre-commit-sandbox.log/rc保存。未因高负载超时重跑；不冒称沙箱外完整套件通过。
- 暂存diff经过gitleaks，退出0、无泄漏；未读key/.env、未联网/调用LLM、未运行play、未安装依赖或推送。

## 合入与交接

源码尚未实际合入live，merged=null；合后测试未执行，没有新eval版本或Roy规则上线通知，不登记shipped。

整枝合入预检冲突；保留并行记录和知识刷新，未执行merge。。锁内等知识刷新并保存刷新数据；合前提交号见live-before-merge.txt，刷新回执见live-refresh-commit.log；知识重叠清单见knowledge-overlap.txt，整枝预检见live-merge-preview.txt。发现冲突即停止，未覆盖记录或撤回刷新。冲突路径：notes/fix-queue-v4.md, notes/for-roy.md, notes/lessons.md, notes/ops-handoff.md, ops/inbox-dev.md, paper/data/README.md, paper/data/commits.csv, paper/data/cost-curve-silent.csv, paper/data/cost-silent.csv, paper/data/cost-sources.json, paper/data/cost-unattributed.csv, paper/data/decisions_by_label.csv, paper/data/learning-curve-silent.csv, paper/data/runs.csv, paper/data/summary.json, paper/data/verification.json, paper/materials/decision-log.md, paper/materials/experience-changelog-silent.md, paper/materials/learning/ledger.jsonl, paper/materials/silent/cost.md。

运维交接：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-010309-strategy-proposal/proposal.md。如需兜底，仅移植该源码提交的7路径，并保留live并行数据/记录；实际合入后再跑合后入口、登记唯一行为版本与Roy双通知，再由运维核祖先及CLI shipped。当前本批仅经根目录learner/ledger.py追加proposed、提案/提交链接，不直接改账本或标shipped。原首证/先验/支持/重复/历史版本保持。

## 每个派发ID的处置

| ID | 状态 | 账本 | 理由及限制 |
|---|---|---|---|
| silent-proposal-60930500313a651d | waiting | silent-0132 | 本次按原始offset/SHA核5PM F33T1/2，单敌防御后有4伤；仍缺新建后的起效时点、重放/控制动作触发边界和多敌随机目标独立事件，不推通用触发规则。 |
| silent-proposal-c20b5139dd0dff71 | waiting | silent-0168 | 原始DUZ F27T4/5火花3→6及污染6/12/18已核；缺完整增长/消失模型固定输入和同资源/抽序下迷雾与少技能完整胜线，不从9血损定少技能规则。 |
| silent-proposal-ae9e692d680e3819 | waiting | silent-0183, silent-0005 | 原始5PM F39抢夺与负力敏已核；缺同轮返力后继续出牌、遗忘死亡返敏、多来源独立返还帧；GAME_OVER清场不能证明返还，不定击杀序。 |
| silent-proposal-246daedaa3021847 | waiting | silent-0211, silent-0209 | 原始CA5 F9T1/2非致死扣血后7盾/能力仍7，T4后续攻击只消已有盾；缺同敌同轮连续第二次非致死失血的触发/消费序列。 |
| silent-proposal-c59f592f1427a67e | waiting | silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242 | YF F48及XP F33原答/替换的局部资源差和临时能力可核；整项仍缺原答→替换→抽弃重规划→最终完整执行的结构关联、独立后置完整胜线；已有子模型不认领整个事实展示。 |
| silent-proposal-366288801d9150d9 | waiting | silent-0079, silent-0176 | 751 F17T2/T7/T13同盘换线血价成立，六试全败；缺结构化完整原答/最终实际线及配对B2成本审计和独立完整胜线，不拟5/10血价门槛。 |
| silent-proposal-85929bdfc8a3fc1b | waiting | silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176 | 751 F13T3只实打有药线，F17T7存在未决弃呼唤的保守损失；完整确定/未决损血和holdHp未知展示仍缺，缺同盘无药实战/留药后续，不能把null拟为0价值。 |
| silent-proposal-efd9f83ee9e1a6dc | waiting | silent-0079, silent-0176 | 与3662同来源血价证据但经验链接另保留；原答/最终实际线、配对B2的结构化审计尚未实现，完整受控胜线缺失；两个待办不能互称已有实现。 |
| silent-proposal-131042659448ae74 | waiting | silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176 | 与8592证据重叠、经验链保留；完整确定/未决损血、holdHp未知及无药候选对照未实现，缺同盘无药/留药完整实战和后置独立验证，不冒报duplicate。 |
| silent-proposal-a0853bed869d77fa | waiting | silent-0245, silent-0247, silent-0102, silent-0005, silent-0006, silent-0013 | 已按KV0JHNJCKXLS F33T8与silent-0245/0247实现并固定验证懒惰额度；SL权重仍缺完整受控胜线，保持原规则。 本地源码790b76d00dc23dedb970cb82a00cb3db6ff1cbb7尚非实际live实现：整枝合入预检冲突；保留并行记录和知识刷新，未执行merge。；保留源码及原失败，交运维保留并行记录兜底后再核祖先，不登记implemented/shipped。 |

最终JSON见report.json。源码、初稿、缺数据和失败日志均保留。
