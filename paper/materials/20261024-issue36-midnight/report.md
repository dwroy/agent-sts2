# #36：午夜环境更新与原会话收尾恢复

依据评论6369156059、6369420221、6369442769。234301复盘、235635经验的午夜用户项来自原生 `environments.environment_context` / `harness, hook=false`，带原turn_id/create_time；真正任务项标为 `user.text`。旧guard将所有未匹配用户项判foreign，监督先返回75，后续原生完成不能自动补回旧finish合同。60300e8bf与23:46主线d23925417的NativeBatch正文逐字相同，不把本边界归因于#51新增的环境过滤/登记字段。

TS/Python同时新增严格例外：必须原session/cwd、已绑定且打开的turn，原可信bootstrap来源；单个input_text、原生环境类型/harness非hook、匹配turn/消息ID/create_time，合法原时区日期与单日递增、时钟不倒退。workspace roots、managed/restricted及每条filesystem权限须与启动原文完全相同，approval/sandbox不得变化。额外文本/字段、普通user.text、错误来源、新turn、重放ID或未知格式拒绝；元数据不消费prompt或增加绑定。新传输器独立持久化环境证明，Python从原生记录重建并核对，不人工给旧75补完成。

两个真实原件在旧guard下都75/foreign；新TS/Python各重建一条相同证明，原binding1不变。首次复盘冻结时仍open，另冻后续终局窗口后才核到00:08:44.416完成；经验完成00:05:28.185。不能把首次复盘快照追认为完成。来源、窗口、SHA和回放见evidence.json；原始任务/日志只存本树忽略目录`.artifacts/issue36-midnight/`。

## 接续与完成恢复

只读监督通过reconcile-tui.ts的显式watch模式核原回执SHA、登记、原生前缀、fresh pane/tab/terminal/workspace、agent/cwd与前台PID/birth，只写新0600产物。实际经验批为completed-observed，旧75/finish/retirement权限未变；复盘canonical为lost，观察模式拒绝接管。只读对账不能代完成生产者。

新增`ops/learner_tui.py recover-completed ROOT DIR BATCH ORIGINAL_RECEIPT_SHA256`，默认只读预检。两个真实预检均通过；开发没有执行`--apply`或生产按键。发布后由原ops显式apply，且只支持已经原生完成、旧监督已退出的复盘/经验批。先归档旧75回执、输出、登记和原生完整窗口，再登记新恢复监督；原绑定原样保留。逐次核原PID/birth、pane、短名/cwd、空闲/空composer/无Queued及原证据不变，只向已完成的原TUI发送Ctrl-C，不发任务/Enter/Esc或新模型。

只有原生真实退出并回同pane shell后才生成新producer epoch、完成日志/回执，原输出仅追加核实的原生最终回报，旧前缀另存。canonical切换带recovery来源的新回执，旧75按原SHA/原字节保留，不能说原监督返回了成功；旧部分用量不当作最终用量。仍调用原verify、finish产物审计、finished的真实注册PID/父进程合同，native0可仍是语义failed，不放宽原失败或空fix验收。恢复监督退出后的封存/关tab交原#20门，入口不自行seal/回收。

不确定阶段保留journal，不重复apply。登记前预先持久化存活保护：监督活着时原调度器跳过；监督被杀且登记仍running时，在lost/重试前沿原deferral转待核并发recovery attention。旧deferral不覆盖，原局号/请求/外部绑定保留；已经发生的退出或finish不回写成未发生。若原owner/原件已变，拒绝接管。

## 检查和运输

tsc=0，7个TS定向文件275项过，Python核心42方法过（内含49条共享反例、恢复事务和原verify）；既有wrapper17项在本轮59方法组合中过，随后Python改动仅在恢复入口。旧源码五个正向回归全失败、两个真实对账都75；旧Python拒绝午夜输入。完整午夜更新→原轮完成→退场、人工草稿/Queued、身份/证据变化、未知退出、语义failed/rc0、恢复监督中断均有固定回归。nice19/单线程worker，无full/新模型/对局。

首轮一条旧虚拟时钟夹具早于真实child close的失败保留；同步main已有有界退出等待及三条正/反例后通过，生产退场门没改。恢复告警开发时的stage白名单首败也保留，补精确recovery stage。命令/日志SHA见checks.json，Python subtests不重复算分母。

运行叶为`learner/lib/herdr.ts`、`learner/lib/tui-reconciliation.ts`、`learner/reconcile-tui.ts`、`ops/learner_tui.py`。新共享fixture在默认忽略目录，已显式纳入Git；测试/文档须一并集成。恢复调用的issue_session/support及原finish脚本都是已有Git源码，无新依赖或缺失脚本。仅取本次增量，保留main的#51环境过滤、#48/#51登记字段及既有child夹具；不整文件/整树覆盖新主线或live知识。

原ops发布后再次预检并核fresh身份，再决定apply。原SHA：复盘`e6edf32143a6676cafe68ccd17149c64cdefbeff035d485e246eab1b6432c471`；经验`272131577eeca950e963fce256992cfbdd6ac7855927dc7b830b57cd7b38ff68`。详细命令/合同见docs/codex-ops.md。#36/科学父及实际发布、恢复、自然验收开放；本交付不宣称生产收尾已经恢复。
