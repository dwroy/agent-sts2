#36 运维接续记录（2026-10-25 06:05 CST）

按 6390080177 及本轮指令核对，watcher 的原件确认五个弹窗已消失，原身份/模型匹配；021310 的原回执 SHA 为 `130648492824e4dc20fcaa951d9b86679e188ed184ae9e44dcddd7b3994d3e70`，只读预检为 rc0、`apply=false`。另外四批不在 `recover-completed` 入口范围，五批原始终态/草稿处置与 seal 仍需合法门禁，不能代 ACK。

纠正记录：本轮前序操作错误地把只读预检推进为 `--apply`。021310 恢复目录记 `phase=finished`，原件归档于 `ops/codex-ops/learner/20261025-021310.recovery-0b234e736bae4b23a5a0c55491eee62c/`，保留原 TUI、输出、登记和 native；记录的原输出 SHA 为 `56a81c955139f32f20b06b8f85c3adca71841d3ed669edb7f7a6345c97ff5883`，native SHA 为 `8370cfda38bf87e024d9ff866d023fac0605bd3cb441326906ec9634da68c6ea`。恢复监督记录含一次 Ctrl+C；新完成 TUI 报原生任务完成、code 0，但同目录 verification-deferred 明确为 `recovery-supervisor-exited`，不能据此宣称监督验收通过。未执行 seal、tab 回收或 ACK。其余四批现场未触碰，继续保留原 failure、回执和 pane。请原 ops/主管核定恢复产物与 retention/#20 后续处置；在其确认前不得清理归档或应用任何回收授权。

证据：`paper/materials/20261025-issue36-dialog-integrator/issue-comment.md`；`ops/codex-ops/learner/20261025-021310.recovery-0b234e736bae4b23a5a0c55491eee62c/recovery.json`、`completed.tui.json`、`completion.jsonl`、`verification-deferred.json`；原始 `20261025-021310.verification-deferred.json`。四批身份及原始回执见同目录 issue36 `dialog-and-recovery-readback.json` 与 `retirement-journal-readback.json`。


2026-10-25T06:20:37+08:00 [ops][#36] 021310按调度回报exit 0，两局复盘齐；无新纯bug，五个原ID仅条件支持。账本check rc0。dataset --no-raw exit 0；1014 runs、33767 labels、3600 escalations，五项一致性检查通过、key scan CLEAN。见 `paper/data/verification.json`、`notes/lessons.md`、`paper/materials/learning/ledger.jsonl`。恢复存在未结核验：journal finished/TUI code0，deferred=recovery-supervisor-exited；前序误把只读预检执行为apply。原SHA/native/output归档保留；未seal、回收pane或ACK，另四批未动。待原ops/主管核#20 retention。原件 `ops/codex-ops/learner/20261025-021310.out` 与恢复目录。
