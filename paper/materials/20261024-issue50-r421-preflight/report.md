# #50 R421 接续定向核验

核验时间：2026-10-24T00:45:04+08:00。来源 `c72ff784553306f9a67fd27b0223e1b8b9534fa0`，原开发分支仍同此提交；GitHub 最近三条无新补交。基线 main `354122bd849fc5413b1dd8f73c31c062a4ee543a`，实际 live `cd8769fca4aa2e208591a2db88d405fa3f86457a`。

#42 两叶实际发布 V6-R421：原 ops publication-state.json 已 published/registered/readback/notified/admission-released；原 full SHA a6337a06baf75ec1ae159dddec158177f092c1c7029870a9be58727e22f8866a，6420过/2跳过/0败仅归 #42，不当 #50 full。两叶在 main/live/本候选逐 blob 一致。现库外部策略匹配数仍0，不冒称学习达标或自然采用。

原十叶中八叶仍同旧独立审查。brain.ts 与 R420 新按需提示冲突：保 main 精确提示，仅叠加 #50 原五处编辑；report 自动合并，去掉原 #50 添加后逐字节回到当前 main，保留中位耗时字段。原始 merge-tree 冲突及产品外账本冲突留在 merge-preview.log。最终测试兼容再改一叶，故最终七叶同旧审查；详见逐 blob 表及 test-compatibility.patch。

新发现的过期测试合同已修在隔离候选：首轮5文件93过/10败（期待v2，实际v3）；中间轮93过/10败（v3空线索不再恒带tool）；两轮原件均保留，不归因环境。最终按 v3 正匹配才带tool/input、空/缺/错误无建议工具，保相关rk摘要、经验分路、15工具、#35记录及两引擎计划回读/重启/回退断言。最终 tsc0，5文件103过/0败，2363份已实体化跟踪输入SHA前后同。一个worker、nice19，未开full或模型/游戏。源码组合 `b0988d7c1bb49b701fd65af801e7439a9c4cca4c`，隔离锚 `46b493c48aed2b8478ee8f1328d4caa9d1344424`，工作树 `/home/dw/Projects/agent-sts2/.worktrees/integrator50-r421-20261024`。

旧117过＋1环境败及单项补验、开发原失败、R419丢失结果均原样保留。本轮初始组装脚本语法/索引断言错误留在本地原记录，发生在定向测试前，未动主树产品。中间补验 supplement-checks.json 所列tree沿用初始组合，实际测试文件另有断言修改；intermediate 文件 SHA 以本轮补充记录为准，不冒称初始tree全绿。

当前 #35 原 ops 已接续 R421 冻结，仍等原 knowledge-refresh 锁，未看到实际发布。#50 只完成可复核候选与定向验证，未合 main 产品、未写live，等待35实际live后按当时main/live/最新知识重组，协调唯一full及原ops发布。学习第4条沿48/51：实际策略入库/来源样本/消费者与自然计划检查点/F48-F49验收保持开放；不关闭科学父。
