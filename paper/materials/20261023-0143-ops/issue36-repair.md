[ops]
01:43 两路策略初始化拒绝已核；本轮已修复仓库内 codex3 learner 的冗余本地配置，未另开模型/重派原批或回收 pane。

两份原 `.tui.json` 均 `state=not-started/models_started=0`，原日志 SHA 与回执一致；原 `learner_tui_result` code3、reason=`inherited-tui-config-not-isolated`、stopped=true，调度器仍 rc1/failed。原 `out_pending_wrapper_flush=true` 字段保留，另已读回实际最终 stdout/空 stderr，不伪造启动或完成。原 pane w1H:pB3、w1H:pB4、工作树、原 retry_at 和失败保留。

此前我把清理此本地冗余项也列为重新审批，范围收得过窄。本次按原 learner 初始化排障及仓库内可逆运维修复范围处理：独立核两份原启动命令已显式传 `-c service_tier=…`，值与本地设置一致；先备份 `ops/codex-ops/accounts/codex3/learner/config.toml`，仅删除顶层 `service_tier` 一行，其他 TOML 字段、文件0600、原账号/home/模型、普通服务档和 sandbox 权限保持。没有扩大此前 brain 例外到其他账号，没有改共享/brain 配置或原隔离器。

- 原文件 SHA `8e5182ecb5cceb6e5b172724e83eea2d944c9505f0621100e6a63b1d24d901c5`；新 SHA `21d164b93a2078e41bb50f58e9720968d393b859a00afefcbd6ff711ccfb6ecc`。
- 修改前备份：`ops/codex-ops/learner-config-backups/20261023-0143/config-before.toml`，0600，目录0700、Git忽略；原字节/SHA相同，不输出或提交配置内容。
- 原 `learnerTuiConfigSafe` 对主根、本次两树及36候选树均通过；原 `configProblems` 返回空。零模型/原生线程，不宣称实际 TUI 已启动或 high 已由原生证明。

本轮只处理四个原事件，不即时重试失败批、不跑 dataset/full、不发布36、不动当前局/hosting/live。36的43叶候选及原 full 保留，已清除“待再次批准本地冗余键清理”阻塞；K→L最新知识/绑定/消费者及自然TUI/直播验收仍按原发布门，live R415、brain_view=off。学习/量化父不关闭。回退可恢复备份，但会重新触发已知隔离拒绝；不作无理由回退。

原件：`paper/materials/20261023-0143-ops/config-repair.json`、`config-preflight-after.json`、`failure-audit.json`。01:13四批及本次两批相关失败与早前hold决定不改写，以本次更正接续。
