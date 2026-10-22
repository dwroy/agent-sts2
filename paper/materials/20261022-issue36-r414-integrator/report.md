# #36 R414 R3 组合：完整检查失败，禁止发布

2026-10-23T00:09:10+08:00。按主管6344172214/ops6344270818，以实际R414 `fdae435795f41d771da6df3457eb890e50d8ffeb` 精确组装原R3 `1b0aeb68f70876809e761ea563f2b1195318a32a`，受测树 `dbf16fff0546aece14b637acb809d641f0023570`。唯一full于23:41启动，00:05:55结束，tsc0、Vitest1：644文件/642过2败；6103项过、2败、2跳。原full-failed/完整日志和JSON保留，driver因full非零跳过其后的独立Python检查；未启动main兼容定向、未合main、未实际发布、未重复full。独立追加核验2509枚举输入前后SHA/字节全同，受测暂存树未变，见failure-audit.json和failure-inputs-after.json，不回写原失败checks.json。

## 两个失败与需要裁决的下一步

1. `agent/tests/boss-sim-home.test.ts` 包装的 `ops/tests/test_boss_sim_home.py` 第48行仍把herdr响应mock为 `pane 123` 并期待 `(123, "pane")`。本次R3改为无LEARNER_CMD时 `open-pane` 返回 `w1:p2` 形式并另起已mock的/实际supervisor；旧mock不符合新协议，走setsid，得到短命 `/fixture/wrapper` 子进程PID（该PID读回已不存在）。旧测试没有mock Popen。原R414两个测试文件均未变，触发路径是本次修改的ops/learner_jobs.py，不能因“旧测试”跳过。建议原dev #36补对新路径的真实pane/PID/Popen/env断言，保留LEARNER_CODEX_HOME选择与转交原断言及显式LEARNER_CMD旧固定命令路径覆盖；不通过伪造通用响应或放宽生产pane身份检查躲过。尚未改测试/生产代码，等主管按原派单流程安排修复。
2. `agent/tests/v6-brain-card-value-loop.test.ts` 第97行 T0TP8S9MMU9Q F2 `actual.tables.at(-1)` 为undefined，与#44已有首败相同症状。该测试文件与R414原blob一致；本轮没有采到内部预算异常，450ms/资源争用仍只是待证假设。#40的特别同树重跑许可只针对40，本轮不援引。交原#44/issue-41修复与主管裁决，不称重跑绿色等于稳定。

需主管裁决修复归属、#36是否等#44以及下一唯一full窗口；当前full已结束释放，队列原顺序40热修→36→完整33+26含R413启动→42余项→35→28→37，37→20不自行改序。

## 精确范围及已过前件

原R3真实功能并集37路径，R414移植31、六个未上线消费者叶保留deferred-six-consumers-source.patch；不重放候选合并带入的其他任务。ToolHost R414 observer第四参数，main保原knowledgeAudit第四、observer第五；R414不引未上线#33/#17协议/MCP/Board，原Board缺失测试显式skip，稳定标题测试仍执行，main保完整原断言。纳入40生产两叶及R414原包装器仅新增入口的一行，不整叶复制main包装器。delivery.json及两个独立patch只作失败候选保存，明确NOT FOR RELEASE；预像/新blob及隔离index核同见patch-verification.json。

exec按题回退：原R3同局session流后exec-q2被streaming旗标吞掉已固定日志复现，exec-fallback-red原红保留；只读viewer始终显示完成题摘要，两项回归及既有流/标题/脱敏/TUI检查通过。原开发46输入、10原日志SHA核同，R2红/R3绿生命周期反例保留。第一次复制main旧测试包装器因四个R414不存在文件失败，8文件103项通过/包装器2过4败；改R414原包装器只加新入口后该文件2过、tsc0、Pythonview15过1跳/TUI18过、四shell语法通过；原首败不删除，不冒称全9文件重跑。

## 数据与生产边界

R414从当时实际live冻结468非builder知识叶，原发布463集合的462份加6份知识Markdown，另核builder JSON配置；完整检查输入不热改。main兼容候选已从622b298a前移到1be00b7e，保留#27第二批策略提交3f642143及并行运维记录131路径，运行代码37叶未变，尚未执行定向检查。严禁把冻结知识回盖main/live；发布时仍保最新知识/策略/catalog并核实际消费者。后续可复用main-parallel-data-rebase.json等原件，不能把不同main组合冒称受测full。

实际live仍R414；主根brain_view=off。未碰live/STOP/账号配置/运维prompt，未启动游戏或模型。service_tier纯隔离前件不代实际session/high；首自然局滚动/换局标题与下一原学习批TUI、任务/线程/档位/原生绑定/产物/处置权/退场关tab仍待ops。#40实际发布与下一自然刷新资源/训练消费者、#44稳定性、CLI兼容以及学习/科学父要求保持开放。本分支是失败证据与待修候选，不能直接合main或交waiting-release。
