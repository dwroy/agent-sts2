# #77：主管裁决收尾的受控入口

按主管 [6519962379](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6519962379) 优先处理七旧批次作废收尾。裁决原文为 [6519584366](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6519584366)，ops 缺口与现场为 6519860562、6519961296。本批交原集成员，在 `issue-83-boss-tools-r3` 实际采用之后、账号作用域第二批 `issue-77-r3` 之前；只准备独立小批，不自行 submit、部署或占原唯一集成检查。

原工作树继续开发；干净的账号作用域交付 `1684480c4670e53df517388043517663589ab543` 和原 `refs/heads/issue-77-own-learning-slot`/本地 delivery-77-r3 请求不动。此次在同一树切 `issue-77-supervisor-close`，基于 main `9711fd5e2f18b1b1ae972b547af74a0b662dfc8e`，不夹带未采用的账号五叶，也不覆盖 ops 在唯一检查中的 selected_home 差量。原交付 2eee93f7b、default 后继及所有旧线程、原生日志、首红与未完成科学父均保留。

## 行为和边界

原 `ops/codex-ops-learn.py` 新增 `close --verdict <#77评论URL> --batch <id>`。仅接原 `awaiting_review` 且仍在 own-learning blocker/pending_review 的批次；running/launching 继续原恢复。GitHub API 核评论 ID/URL、dwroy、`[Claude]` 前缀、本批明确“作废收尾”裁决行并固定内容 SHA；反应数/头像变化不影响同一原文幂等性。

沿原 learn.lock 非阻塞事务，原 game-admission/K/live/ordinary-close 与各 D1 publication 锁全部非阻塞；发布写事务、未终态 D1 journal、未知 attempt、其他工作树命令/测试/写入及身份不明都拒绝。不会清 publication/STOP/PAUSE/外部计划等门，也不为这项入口恢复额度或 generation。

pane 缺席保存 `pane_absent`。071302 的原 learn.json PID 与后来的 deferral 恢复监督器不同，只允许缺席且其他注册字段完全一致、两个 PID 均退出的例外；两份原身份和原 SHA 都入回执。其他注册差异仍拒绝。

原生仍活时核 PID/birth、原会话/cwd、最近 turn 结束且超过 30 分钟、无排队输入、原 pane 和空输入，再核整个子树的 UID/session/独占进程组；包含 code-mode 独立子组也可处理。先保存 prepared 原登记/裁决/原件 SHA/原生日志/进程组快照，再复核，按数字进程组 TERM 子组和原生组，最多等 10 秒确认全退；活动 turn、陌生进程、复用或超时拒绝，保存 attention 和重试历史，不升级 KILL。原报告提示绑定曾报 foreign input 的事实保留；此回执只证明主管作废和最新 turn 空闲，`prompt_verified=false`、`report_accepted=false`，不会冒认原报告通过。

终态回执 `learner/<batch>.supervisor-close.json` 为 `supervisor_voided`，原 batch 仅增带 SHA 的 `supervisor_close` 指针；原 state/rc/TUI/deferral/研究和父要求不变。own-learning 投影单列 closed 并释放计算槽，原需求和原复盘局仍禁止重派，迟到 finish 返回保留。准备后失败仍占槽；完成回执已持久化但 state-save 中断可用同一裁决补指针；重复命令不重复 TERM/保存。

不发成功/发布/回收 ACK，不关 learner tab/工作树，不调用 complete，不跑 play 或启动新学习。tab 仍归 #65；新自有学习首批时间由 ops 沿自然入口实际读回，工程绿不代运行验收。

## 独立生产叶与检查

仅三 ROOT/host 叶：`ops/codex-ops-learn.py`、`ops/own_learning_slot.py`、新增 `ops/learner_supervisor_close.py`。LIVE 零叶，无共享 config、账号/home、默认 service tier、workers、权限、角色或游戏知识变更。前后 blob/mode/SHA 在 `delivery-leaves.json`；文档与 launcher 登记同三叶，不能只装 CLI 或投影。所需消费者见 `required-checks.json`。

最终生产 tsc 与完整开发 sandbox 退出 0：653 文件 / 6032 项通过，随后 paths 1 文件 / 11 项通过。源码五个检查输入与开测切逐 SHA 一致；完整日志 sandbox-final.log，结构结果 verification.json。最终固定 Python 新增 16 项通过，原 own-learning-slot 13 项、原恢复 10 项通过。最终定向 Vitest 5 文件 59 项通过；原生 TERM 用假进程表/假信号，固定 D1 数据库字节核不变。覆盖主管校验、缺席、共享 ROOT/恢复监督器差异、空闲带子组、活动/排队 turn、30 分钟、写事务/D1、陌生 PID/换 pane/空输入、TERM 超时不升级、原件不变、幂等与 state-save 恢复、迟到 finish 和原 CLI learn 锁忙。

首轮新测试 12 项中 1 项红：PID 复用投影夹具没有把假 birth 探针传入原投影默认参数；显式注入后通过。首红/后续结果分文件保留。初次开发 sandbox 在最终 review-state 保护补齐前主动以已核本测试 PID TERM 停止（143），不是验收；过程与原部分日志保留。最终源码切固定于 `source-check-cut.json`，新 sandbox 全绿结果见 `verification.json`，不得拿初次中断或旧账号批绿替代。

## 原现场只读预检与 ops 接续

`verdict-check.json` 已核原评论逐项授权全部七 ID。`original-evidence-preflight.json` 只读核七条原生 session/cwd/最近 turn，均已结束超过 30 分钟；pFX 原 PID 2498429 下实见四个进程、两组（2498429、2567504）。`pane-read-only-preflight.json` 现场读回前六 pane 均缺席，pFX 原四重身份/空输入/独占子树通过。预检没有取生产写锁、发信号、改 learn.json、关闭 pane 或恢复学习；实际执行仍必须鲜核原写门，不把预检冒运行全门。

原集成先等 #83 r3 实际采用，在其新 main 上规范化本三叶和检查合同；本地候选 `issue-77-supervisor-close`，P0（仅表示先于原 P1 账号批，仍服从 #83 顺序）。保持原唯一检查/发布锁，不沿旧 source 或旧 full 冒本组合通过。

合入并登记 ROOT 后，由原 ops 对下列七 ID 逐个执行 close，`--verdict` 均用 6519584366 原 URL：024302-strategy-proposal、024302-s2-strategy-proposal、024302-fix-batch、031302-strategy-proposal、060422-strategy-proposal、071302、234303-strategy-proposal（均带完整 `20261025-` 前缀）。每条确认原件/回执 SHA 和 closed 投影；pFX 须实际确认全部退出且未 KILL。然后沿原自然节拍读回第一批自有学习开跑时间；34 个外部计划 ready=false 的原 generation/retry 限制和 4 槽/21% 诊断分账，不重置计划。

回退仅逆转本三源码差量、保留原回执和原 batch 指针/失败/裁决，不运行 finish 重放或手改 state/旗。已有主管作废是业务事实，源码回退不撤销裁决；旧投影不识别新回执会重新保守占槽，交原 ops/主管协调，不能据此重派旧需求。原账号作用域批继续保在原分支，待本批之后另按原交付集成。
