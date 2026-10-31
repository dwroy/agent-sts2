#36 接续核收（2026-10-25）

本轮补齐原停点的可核事项：021310 封存和 tab 回收现已独立核收，最新完整检查精确覆盖 #36，另补六个原待核批次、101312 普通自然终态与当前自然对局视图读回。未发现 #36 原补丁新的返工证据；101312 另有封存账号软链兼容缺口，已沿原 #20 修复链分账。工程原开发会话继续可恢复停止；父 issue 和 runtime 待办保留，交原 ops，不启动新模型或重跑 full。

021310 的 `ops-recovery` seal 于 08:04:02 落盘，SHA 与 ops 08:05:54 留件一致；seal 引用的 TUI、out、err、完成日志、native 和核验依据逐件 SHA 核同，完整批次摘要与新 wrapper 相同。原恢复监督及 native PID 均已退出；原调度 journal 记录 08:25:04 `done/reclaimed`，当前直接查询原 `w1H:tF1` 返回 `tab_not_found`，原 host label 已移除，尾日志保留。原 75 归档 SHA `130648492824e4dc20fcaa951d9b86679e188ed184ae9e44dcddd7b3994d3e70` 和原恢复完成记录不变。只核收实际 seal/tab 链，不补写当时按键授权或 fresh 采样，不代 checkout 删除、经验发布、消费者采用或科学父完成。原 scratch 仍沿 tested-live-experience retention 门保留，不再重复恢复、封存或关同一 tab。

六个待核批次均独立重建原 session/turn、完整提示、gpt-6.1-sol/high 和 task_complete，原日志/summary/session 与 75 分类相符；原监督均已退出，原 native PID/birth、pane/tab/terminal/workspace、短名/cwd 保留。逐批原日志均只有一个 120 秒 input_hold、无 resumed，summary 在截止后返回 75；deferral 不授权 finish/retirement/replay，learn 仍 awaiting_review、rc/finished 空，且均无 seal/退休 event。前次已核五批的原 TUI/deferral SHA 均未变。本轮增加对 060422 的同项核验；这是原批补证，不是新建任务。

| 原批次 | 本次屏幕读回 | 原 ops 下一步 |
| --- | --- | --- |
| 024302-fix-batch / pF8 | idle、empty | 保原树及未提交候选；fix 不在 recover-completed 支持范围，沿合法处置或审查后的原入口处理 |
| 024302-s2-strategy-proposal / pF7 | done、empty | strategy 不在现恢复范围，保留原 75，不换 task 套恢复 |
| 024302-strategy-proposal / pF6 | done、empty | 同上 |
| 031302-strategy-proposal / pF9 | idle、empty | 同上 |
| 060422-strategy-proposal / pFA | idle、empty | 同上；本轮补入原待核清单 |
| 071302-postmortem / pFB | idle，但配额选择框可见，composer=text | 当前不能证明空输入；保原额度/身份现场，原 ops 沿配额与恢复门核收 |

当前空输入不能追认历史 hold 是人工草稿；模态界面也不追认历史屏幕正文。011301 曾在 106764 ms 自然恢复的有界监督正例继续引用原证据，不重造人工输入场景。旧 080423/083104/084301 的主管显式退役和历史缺证结论保持，不重开已处置旧合同。

101312-strategy-proposal 的原生 sol/high、完整绑定、完成消息、out SHA 与 wrapper/完整批次摘要独立核同，native/监督均已退出，learn done/rc0、10:33 完成，TUI session-ended/stopped。此次采样无 seal/退休 event。原 ops 的 10:39 留件及公开 6392558810 已读回：封存实际被 `learner_tabs.seal_proof -> files -> safe_path` 的 `ValueError: symlink path retained` 拒绝。原封存失败通知（已由 queue 移入 delivered）、七项产物 SHA 和 `codex1/learner/sessions -> /home/dw/.codex1/sessions` 现场映射独立核同；对原 rollout 路径只读调用 safe_path 亦得到同一错误，未重试封存。原生完成与封存失败分账，交原 #20 兼容修复链，保留原 pane/日志/绑定/失败，不改路径绕门或新派模型；普通完成不替代六批异常处置或人工草稿验收，也不代知识正式上线。详见 `adjacent-seal-failure-readback.json` 及 [原 ops 报告](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6392558810)。

对局视图原 pane `w1H:pBA` / tab `w1H:tB7` 的实际标题为 `对局大脑 · H68P25KQ7JX4`，与最后自然 run-config 同局。原只读 view PID 2807136/birth12154544 在采样前后相同，命令指向 ROOT/ops/brain_view.py watch；现屏幕及三条原 brain 行的渲染样例通过 gitleaks。标题相对 03:58 的 RR2VYNL5FUUU 已更新，不据此推断两次采样之间的完整进程连续性或当前内存模块字节。本轮不重启视图、游戏或模型。

完整检查直接复用 #60 唯一 3490642/birth31846038 的 10:30:16 终态：687 文件、6689 过、0 败、2 跳，生产/runtime 双 tsc=0，完整 JSON SHA `37160e3d10cf64319982a4ea8b7caaedb8b83e6fe4e2149c1c3f03e41803ec01`。#36 原 17 个运行/测试叶逐项与当前 ROOT、main HEAD 和该次 2848 输入冻结相同，八 TS 套件 281 项全过；brain_view.py 及 brain-view 包装测试亦精确覆盖。Python 内嵌方法不重复累加，历史 679/6628 记录不改写。本轮新增 full=0，不把适用输入覆盖说成当前 main/live 整树或在途进程内代码已经核过。

原始证据摘要见 `batch-readback.json`、`full-coverage.json`、`game-view-readback.json`；两份 audit 脚本只读生产，只写本轮新材料和本地采样副本。#60 原 ops 的自然发布 worker、当前对局、DB/control、ACK/通知和其他角色状态均未操作。
