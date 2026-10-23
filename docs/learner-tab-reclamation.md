# 学习 tab 回收合同

依据 [#20 6355664194](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6355664194)。本实例项目 adapter 为 `ops/learner_tabs.py`，沿原 `ops/codex-ops.sh tick stall` 回收步骤、在 drain 之前运行。没有新 cron/模型/调度器，不经 ops 模型 wake，也不等待 GitHub 或 board 开关。PAUSE/LLM_DRAIN、`CODEX_OPS_RETENTION=off` 与原 tick 锁仍有效。

## wrapper 交接

#36 的原 wrapper 在完成原 finish 事务、输出/回执 flush 后，原 supervisor 退出前调用：

```bash
nice -n 19 python3 ops/learner_tabs.py seal --root "$ROOT" --state-dir "$DIR" --batch "$batch"
```

seal 只封存回执，不关 tab、不发模型提示、不改 learn.json 的结果或重试安排。调用者的直接父 PID 必须是 learn.json 的本批原 supervisor，核 `/proc` birth；终态为 done/failed/rejected/cancelled，必须有 finished 与整数 rc，75/124 不视为安全终态。原 pane 唯一绑定本批、herdr.json 的 learner-BATCH、sts2-run 与单 pane tab。永久保护角色及 live 仍拒绝。

输入是 `learner/learner-BATCH.tui.json`、`BATCH.out`、`BATCH.err`。TUI 回执须有原 pane/label/cwd/identity（pane_id/tab_id/workspace_id/terminal_id）。正常/取消任务另核 session-ended/turn-ended、retirement_authorized=true、agent_name v1、pid/birth、原 native bindings/submissions；调用 #36 的 `learner_tui.verify_native`，核原 summary/session/exit、learner log SHA 和本批最后原生回合确已 task_complete/turn_aborted。只看到 idle 不代原生回合结束。所有路径限项目内非软链接、非凭据；产物原件仍保留。

零模型失败只接受 not-started、models_started=0、code3、未 submitted/无 bindings 或 submissions、原身份齐全；允许原 launcher 明确的 code3→learn.rc1 失败映射，或 rc3，绝不写成成功。out 可为空，out/err 必须存在。未知失败、缺身份或没有原终态保留，不靠空 bash 猜完成。取消同样须原回合终结和本批处置权。

seal 生成 `learner/learner-BATCH.tab-retirement.json`（schema `learner-tab-retirement-v1`）：root/state_file/batch、原批次 binding、owner PID/birth、authority=batch、原 label/cwd、pane/tab/workspace/terminal、shell PID/birth、tab 标题与 pane activity revision、每份原件 path/SHA。回执原子落盘；重封存只允许字节意义相同的身份/证据，不覆盖旧证明。新增回执由本 helper 生成，wrapper 无需手拼 schema。#36 wrapper 变更及其真实终态/回执合同是采用前置；旧在途回执不改写，历史 tab 缺封存证明仍保留并报主管，不能从冻结测试推断历史已回收。

## 原 tick 回收

```bash
nice -n 19 python3 ops/learner_tabs.py tick --root "$ROOT" --state-dir "$DIR" --dry-run
```

去掉 dry-run 才允许动作；开发固定测试不对生产调用此入口。learn.lock、herdr.json.lock、learner-tabs.lock 非阻塞串行；动作前锁忙 queued/0，不写故障。supervisor 尚在退出时 queued/0。非终态 running 只报告 running、不核输入/关 tab/发通知。终态的回执、批次身份、host 登记、落盘 SHA、原 shell 与输入状态在保存尾日志后、关 tab 前再次核同。

空 shell 需要前台 group=shell PID、无额外前台/后台子进程、可见空标准 bash 提示符；未知自定义提示符保留。Codex 须本批原 agent/PID birth、done/idle、空 composer、原 native 回合已结束。seal 后 pane revision 改变（包括后来输入）保留，不能把人执行完命令后又回到空提示符当作本批未被碰过。

成功顺序为尾日志持久化→learner-tabs.json 写 sending→关已核 tab→成功 list 读回原 tab 不存在→移除同一 herdr host 记录→记 done/reclaimed。learn.json 与产物不删除、不重写，checkout 原保留门不变。动作或读回失联保留 sending、禁止重关，写主管收件箱交原 ops 明确对账；即使后来观察到 tab 已消失也不冒造成功回执。

缺回执/身份/绑定/产物、人工输入、失权等保留，以身份+原因去重只追加 `ops/codex-ops/inbox-claude.md` 一行；细节在原 journal 和本地结果。坏主 journal 不覆盖，用独立 failure notice 兜底。异常通知追加中断保留 sending、不自动重写。dry-run 不落锁/状态/尾日志/通知，不消费事件。

关 tab 释放的是学习运行槽位；学习产物入库、实际合入/发布、完整检查、科学父与原 retention 的 checkout/scratch 删除门均分别验收。
