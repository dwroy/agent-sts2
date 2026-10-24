# #36 原生 agent 名长度修复

依据 [ops 6348039423](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6348039423)，沿原开发分支 `f0a967266` 修复控制面命名。真实失败原件是 41 字符的 `learner-20261023-021302-strategy-proposal` 被 herdr 以 `invalid_agent_name` 拒绝；原标签、批次和登记键继续完整保留。

## 名称合同

- `learner/lib/herdr.ts` 新增确定函数：`learner-` + 紧凑 JSON `[完整 label, pane_id, 绝对 cwd]` 的 SHA256 前 24 位十六进制，恰好 32 个 ASCII 字符。96 位摘要避免截断主/s2/类型后缀造成别名；不同 pane/cwd 也分账。命名冲突仍保留现场，不尝试别名或启动另一个模型。
- 每次原回执保存 `agent_name` 和 `agent_name_version=1`，首次命名前 fsync 保存完整绑定。命名前先核原租约、完整 pane 身份、PID birth、前台/cwd 与空输入框；CLI 返回成功后仍要读回同一短名，才可发送原始提示。续接和所有退出按键均按同一短名检查。label/批次/回收命令保持完整原值。
- `ops/learner_tui.py` 独立重算新回执的名称绑定；既有无该字段的 R3 回执继续走原身份、原生提示与退场合同。未修改 NativeBatch 的一次性 marker、正文 SHA、原生 turn 接受规则，未降低人工草稿/失权/75 保留门。
- `agent/tests/learner-herdr.test.ts` 的 mock rename 使用真实 CLI 的字符及 1–32 长度合同；真实 CLI 错误原件 SHA 留在 `recovery-assessment.json`。只用固定回执，无真实 herdr/模型操作。主/s2/fix/复盘完整标签各完成一次命名→原生任务→正常退场；另核命名未应用、回执不确定、外来名字、命名前失权/草稿/前台/cwd 变化、接续前改名的保留行为。Python 与 TypeScript 共用固定中文 cwd 哈希向量，并有新回执篡改反例；原审查 ownership 文件未修改。

## 检查

原 HEAD 运行源码配合严格 CLI 长度 mock，原成功场景先复现失败（75/stopped=false、任务未提交）；源码已恢复后再验证修复。最终生产 tsc 0，定向 7 文件/86 项通过；Python 20 项另有原件，已被其中一个 Vitest 包装入口调用，不重复加算。Boss-home 包装入口同理。全部 nice 19，检查串行、Vitest 单线程 worker。源码与检查输入 SHA、原红/初轮绿/最终绿日志的 SHA 与命令见 `checks.json`；未跑 full，原 R414 的 6109 绿不覆盖本修复。集成员仍须在当前精确组合核实际源码与兼容。

## 原未提交会话恢复回执

`20261023-021302-strategy-proposal` 的原 02:15 快照为 submitted=false、bindings=[]、75/stopped=false。只读核了原件，没有改原 pane、PID、租约、配置、任务或回执。

现有代码**没有**在原 TypeScript launcher 已退出后接管该 TUI 的受控入口：存活的 shell supervisor 只等待原 verify 且仍保存 rc=75；普通 launcher 和 resume-thread 会启动另一个 TUI，import 重试也不适用。单补名字或手工改 submitted/bindings 既不能恢复原生接受证明，也不能交接原输出/summary/退出码。故本补丁只修后续自然启动，**不声称旧批恢复或完成**；旧批仍由原 ops 保留原监督/租约/原件，恢复待办保持开放。

若要在同一旧进程继续，须先实现基于原回执/lease/PID birth/原提示 SHA 的明确接管入口及原 supervisor 退出码和产物交接，并验证一次性发送与原退场门后才执行；本轮没有提供或执行这样的恢复命令。机器回执见 `recovery-assessment.json`，其中记录来源原件 SHA、当前入口限制与后续恢复前件。没有把“需补接管入口”改成未经证明的恢复通过。

文档更新 `docs/codex-ops.md` 的名称合同和旧 TUI 保留边界。没有游戏知识/决策行为变更，不分配行为发布编号；未改 main/live/STOP/hosting/共享账号或普通服务档，未关其他会话，未运行 play、重派原批或调用模型。
