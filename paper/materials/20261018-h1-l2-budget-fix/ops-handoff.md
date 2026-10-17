# H1 L2 独立预算修复交原 ops

2026-10-18T00:49:58.643489+08:00。Roy 本轮经 Claude 指派的纯实现修复，请沿原主线正常事件处理，不跨号 resume / 重启当前局。

source `ef092f1c9189bdbb549e46fd604eb342cb025bdf`，tree `7b97eaf6587108ed2389701d515ba91658025527`，parent `9f3d5745be89496398555a5a1eeda2abb995a438`；独立 WT `.worktrees/h1-l2-budget-fix-20261018`。source 提交仅八个源码/固定测试叶，精确 SHA 见 source-manifest.json。

旧：整题90秒先被 B3/G2/构筑消耗，L2拿余量。新：Silent 每次 L2 路由调用独立90秒，同次验证/重问/等待保同一截止；shadow独立扣时，真实父余量恢复，B3原截止/样本/C1C2/SL药水、模型和其他角色保持。H2/Jev本来就在真实动作之后，不改其顺序或60/5/1额度。

六局冻结217题/14截止全部定位并逐题固定时钟重放217过。G2在BXU0 F11用56.905秒，原L2只剩19.076秒；J5E F7休息56.918秒/升级66.034秒、F8拿牌50.878秒，修复后每题90秒。P1旧独立计时保留，P2历史unknown未倒填；H2/Jev本题共享扣款0。

tsc0；完整沙箱原入口483文件4429过/0，固定32/0，源码和解压证据gitleaks0。见 report.md、per-question.csv、audit.json、verification.json（含原logSHA）；初稿漏配baseline标签/CJS材料脚本失败均保留。

请按原live锁先保并行知识、八叶窄合main/live，核真实行为并分配新发布号，根for-roy/inbox-dev双通知、原唯一精确组合宿主与原retention链闭环；不要借本源码绿作live绿，不重未变源full，不新增自然监听或学习/模型。日志actual_ms包含共享+独立总计算；阶段上限分别验收，新增shared_actual_ms/independent_actual_ms及stage.scope，不能把总actual_ms单独与父共享90秒比较。

回退只反向此八叶预算增量，保知识、其他发布及历史，实际回退再依行为规则编号。没有新游戏知识或账本shipped；H0/0332/human-pace宽父不关闭。watcher交付后停止等Claude指派。运输成功不冒作ops实收/已发布，请沿本目录写本人实收及实际处置。
