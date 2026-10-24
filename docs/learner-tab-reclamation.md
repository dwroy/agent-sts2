# 学习 tab 回收合同

依据 [#20 6355664194](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6355664194)。本实例项目 adapter 为 `ops/learner_tabs.py`，沿原 `ops/codex-ops.sh tick stall` 回收步骤、在 drain 之前运行。没有新 cron/模型/调度器，不经 ops 模型 wake，也不等待 GitHub 或 board 开关。PAUSE/LLM_DRAIN、`CODEX_OPS_RETENTION=off` 与原 tick 锁仍有效。

## 独立发布

主管2026-10-23改为单独发布此子类，不再等#37/#20父功能；集成员排#47之后定向核验。以当前main为基线，保留#36 d1f523bb所对应的当前finish审计与59a1dc80原生确认延迟修复，仅恢复已发布adapter对应的seal调用和原stall tick调用。wrapper、adapter、保护规则及测试同一组合交付，不提前安装kit或启用父功能。旧失败回执保留，实际自然批次退场与槽位释放仍由ops核读。

`agent/tests/learner-wrapper-scripts.test.ts`从受测HEAD枚举实际发布脚本，核wrapper所有字面ROOT/OPS脚本均已发布且实际存在，同时要求seal/tick配对及adapter项目依赖齐全；模拟删除adapter的组合必须失败，不能用开发树上偶然存在的未跟踪文件补齐缺叶。新Python回收定向亦由`agent/tests/learner-tabs.test.ts`纳入原测试入口。

## wrapper 交接

#36 的原 wrapper 在完成原 finish 事务、输出/回执 flush 后，原 supervisor 退出前调用：

```bash
nice -n 19 python3 ops/learner_tabs.py seal --root "$ROOT" --state-dir "$DIR" --batch "$batch"
```

seal 只封存回执，不关 tab、不发模型提示、不改 learn.json 的结果或重试安排。调用者的直接父 PID 必须是 learn.json 的本批原 supervisor，核 `/proc` birth；终态为 done/failed/rejected/cancelled，必须有 finished 与整数 rc，75/124 不视为安全终态。原 pane 唯一绑定本批、herdr.json 的本批 LABEL、sts2-run 与单 pane tab。永久保护角色及 live 仍拒绝。

原 batch key 不变；label 按原批次 task 确定：postmortem（含旧记录缺 task 的默认值）为 `learner-BATCH-postmortem`，其他任务为 `learner-BATCH`。回执读取、封存路径及 host 删除键都使用同一 label，不扫描/猜测其他文件名、不改旧原件。输入是 `learner/LABEL.tui.json`、`BATCH.out`、`BATCH.err`。TUI 回执须有原 pane/label/cwd/identity（pane_id/tab_id/workspace_id/terminal_id）。正常/取消任务另核 session-ended/turn-ended、retirement_authorized=true、agent_name v1、pid/birth、原 native bindings/submissions；调用 #36 的 `learner_tui.verify_native`，核原 summary/session/exit、learner log SHA 和本批最后原生回合确已 task_complete/turn_aborted。只看到 idle 不代原生回合结束。所有路径限项目内非软链接、非凭据；产物原件仍保留。

零模型失败只接受 not-started、models_started=0、code3、未 submitted/无 bindings 或 submissions、原身份齐全；允许原 launcher 明确的 code3→learn.rc1 失败映射，或 rc3，绝不写成成功。out 可为空，out/err 必须存在。未知失败、缺身份或没有原终态保留，不靠空 bash 猜完成。取消同样须原回合终结和本批处置权。

seal 生成 `learner/LABEL.tab-retirement.json`（schema `learner-tab-retirement-v1`）：root/state_file/batch、原批次 binding、owner PID/birth、authority=batch、原 label/cwd、pane/tab/workspace/terminal、shell PID/birth、tab 标题与 pane activity revision、每份原件 path/SHA。回执原子落盘；重封存只允许字节意义相同的身份/证据，不覆盖旧证明。新增回执由本 helper 生成，wrapper 无需手拼 schema。#36 wrapper 变更及其真实终态/回执合同是采用前置；旧在途回执不改写。历史 tab 缺封存时，先按下述 10-24 自理规则核原证据、自动补封存；证据不足保留。显式 ops 恢复入口继续可用，不能从固定测试推断历史已回收。

## 旧终态的显式 ops 恢复封存

依据 [#20 6361965194](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6361965194)，这是 10-23 的显式例外入口；10-24 起原 tick 优先按下文自理规则自动补 seal，无需 ops 逐批复核常见情况。先只读检查，再显式 `--apply` 仅封存；两种调用都不关 tab、不改原 TUI/learn.json/产物或 checkout：

```bash
nice -n 19 python3 ops/learner_tabs.py recover-seal --root "$ROOT" --state-dir "$DIR" \
  --batch "$batch" --evidence paper/materials/20261023-issue20-old-tabs-ops/old-tabs-review.json
# 实际恢复时使用同一命令并追加 --apply；之后仍等原 stall tick。
```

`--evidence` 必须是本仓库内现存、非软链接、非凭据的本地核验文件。恢复重新核当前状态，不用该文件中的旧快照代替现场。除共享原 seal 的所有处置权、原生绑定/末回合、summary/exit、产物 SHA、身份、前后台空闲及空输入门外，还要求原 TUI 的 `wrapper.version=1`、batch/state/rc/finished、supervisor PID/原始 birth、完整 canonical 批次 SHA 全部匹配，且原 supervisor 和 native PID 当前均不存在（PID 复用同样保留）。输出也须匹配原 TUI 的 output path/SHA；session 未结束、无 wrapper birth 的旧回执和任何 sending/done 事件均拒绝恢复。锁内封存前再核完整批次、host、原件 SHA、证据文件与当前 pane/input。

恢复证明沿原 schema 单列 `authority=ops-recovery`，`owner_pid/owner_birth` 保留原 wrapper 身份；`recovery` 记录 version、实际执行者 PID/birth、本地证据 path/SHA，`sealed_at` 是本次恢复时间。不冒原 supervisor 调用、不覆写旧证明；重复恢复仍须核当前门，完全一致才幂等返回。原 tick 接受这类证明时再次核 provenance、wrapper 完整批次摘要、原输出和证据 SHA、两个旧 PID 均不存在，并在关闭前复核。

默认只读不建锁/回执/通知；符合门返回 eligible。`--apply` 沿原 learn→host→learner-tabs 三锁串行，锁忙 queued/0；证据缺失或安全门未过 retained/0，真实 I/O/格式异常沿原 failed/收件箱路径。`--apply` 与 `--dry-run` 不能并用。显式入口仍要求历史 wrapper birth；缺 birth 的旧批次可由下文自动路径另证已结束，不捏造历史 birth。pCC 的 awaiting_review/在跑原生进程不变；sending 不确定须原 ops 对账，不能通过恢复入口解开。实际首个自然封存→关闭只证明 tab 与槽位链，不代批次成功、checkout 回收或父功能验收。

## 原 tick 回收

```bash
nice -n 19 python3 ops/learner_tabs.py tick --root "$ROOT" --state-dir "$DIR" --dry-run
```

去掉 dry-run 才允许动作；开发固定测试不对生产调用此入口。learn.lock、herdr.json.lock、learner-tabs.lock 非阻塞串行；动作前锁忙 queued/0，不写故障。supervisor 尚在退出时 queued/0。非终态 running 只报告 running、不核输入/关 tab/发通知。终态的回执、批次身份、host 登记、落盘 SHA、原 shell 与输入状态在保存尾日志后、关 tab 前再次核同。

空 shell 需要前台 group=shell PID、无额外前台/后台子进程、可见空标准 bash 提示符；未知自定义提示符保留。Codex 须本批原 agent/PID birth、done/idle、空 composer、原 native 回合已结束。seal 后 pane revision 改变（包括后来输入）保留，不能把人执行完命令后又回到空提示符当作本批未被碰过。

成功顺序为尾日志持久化→learner-tabs.json 写 sending→关已核 tab→成功 list 读回原 tab 不存在→移除同一 herdr host 记录→记 done/reclaimed。learn.json 与产物不删除、不重写，checkout 原保留门不变。动作或读回失联保留 sending、禁止重关，写主管收件箱交原 ops 明确对账；即使后来观察到 tab 已消失也不冒造成功回执。

缺证和输入/资源保留门不直接唤醒 ops；绑定失败且原生仍活、回执/进程/产物矛盾和关闭回执不确定才以身份+固定原因去重追加 `ops/codex-ops/inbox-claude.md` 一行。细节只在本地结果。坏主 journal 不覆盖，用独立 failure notice 兜底。异常通知追加中断保留 sending、不自动重写。dry-run 不落锁/状态/尾日志/通知，不消费事件。

关 tab 释放的是学习运行槽位；学习产物入库、实际合入/发布、完整检查、科学父与原 retention 的 checkout/scratch 删除门均分别验收。

## 常见情况自理（Roy 2026-10-24）

依据 [#20 评论6378554518](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6378554518)，原五分钟 stall 的回收子任务自行处理，不改分钟派单器、不新增调度。回执或产物文件尚缺时，前两轮返回 queued，连续第三轮及以后 retained 并在本地结果列出缺证；每次仍自动重试。中间成功或遇到其他已知保留门会重置连续计数，重启进程不丢计数。纯缺证不满足异常介入条件，因此三轮后的“报”是本地回收报告，不向 ops 收件箱反复提醒。

缺少 `LABEL.tab-retirement.json` 时，自动路径要求：安全终态和唯一 pane 所有权；宿主进程视图；原 supervisor 及原 native PID 均已退出（复用 PID 也保留）；`scheduler.log` 恰有一条本批 exit 行且 rc 与批次一致；原 TUI 的原生绑定、末回合、summary、产物、处置权与空输入等原 seal 门全部通过。零模型批次另要求没有任何 native PID/session/turn/rollout。已有 output SHA 和 wrapper 批次摘要不能矛盾。已有 wrapper 缺历史 birth、或历史没有 wrapper 时，可用这些独立证据恢复；原 TUI、learn.json、输出及原日志均不改写。原生身份/产物原件本身缺失不能靠空 pane 重建。

新证明沿原 schema 增加 `authority=scheduler-recovery`、`owner_birth=null`，明确只证明此刻退出，绝不伪造原 supervisor 身份；`scheduler` 记录原路径、匹配结束行 SHA 和完整 canonical 批次 SHA。scheduler 后续正常追加其他批次不使证明失效，原结束行重复/改动或批次改变会阻止关闭。补 seal 前、保存尾日志后关 tab 前重新核退出、证据 SHA 和空闲身份。证明落盘后仍沿 sending→关 tab→读回消失→移除 host→done；uncertain 仍只留现场给 ops，不重关。

`--dry-run` 包含自动重建的所有验证，只返回 eligible，不落封存、计数、锁或通知。部署后由原 ops 记实际 T 和源码 SHA，用原 journal 的真实动作核 **[T,T+24h)**：

```bash
nice -n 19 python3 ops/learner_tabs.py report --root "$ROOT" --state-dir "$DIR" \
  --since '<T，含时区>' --until '<T+24h，含时区>'
```

只读输出 `inbox_reminders`（确已追加的提醒）、`automatic_tabs_closed`（关闭并读回的 tab）、`cases_needing_ops`（去重异常介入请求）、当前 `overdue_missing` 与 `uncertain_inbox_deliveries`。介入请求数不冒作 ops 实际处理次数；旧版动作不倒填，一天未满不验收。全局 journal/IO 真异常仍用原独立失败通知，须与该计数并列核原失败 notice，不把它冒作零异常。回退 adapter 的本次差量后，旧代码会保留新 authority 的证明，不能删除 journal 或伪造旧证明来回退。
