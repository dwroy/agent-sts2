# #36 收尾核验超时：6378554785

300秒发生在交互传输器已经退出后。wrapper 重试 `verified-code`，但 `verify` 明确要求 session-ended、实际退场、retirement_authorized、原summary/绑定；已经封成 needs-attention/75/stopped=false 的旧producer不会因模型后来完成而自动重写。因此这是缺处置权后的空等，不是等待 task_complete 的计时器，也没有证据表明两批并发串绑。

|批次|实际断点|后续与本次结论|
|---|---|---|
|234301复盘、235635经验|午夜原生 harness 环境项被旧guard当foreign|8ce3dd6cb修复；ops6371374921已核实际恢复、原75归档，分别done/0、failed/0，tab由原调度回收。本次不重复操作。|
|080423策略|原submitted=false/bindings0、未捕获birth；启动约120.7秒退出，再等300秒|ops原件定位外部tier的ROOT守卫，main61596985b已补export。没有绑定，不能算原生完成或伪造not-started。|
|083104策略|08:35:29.839传输器因屏幕文字保留75；当时native尚open，最后工具时间08:35:28.819|完整native唯一turn在08:31:42.723开始、08:39:10.513完成；wrapper08:40:29待核。只读重建accepted/successful、foreign=false、binding1。旧回执没有包含后来完成行，不能冒称完成当时核验竞态。|
|084301策略|原submitted=false/bindings0、未捕获birth；约120.9秒退出，再等300秒|同缺ROOT导出现场，main已有修复；原75/待核/空shell不改变。|

083104当时的ANSI屏幕未留存，ops后来读到空composer不能证明此前是假草稿。旧代码遇一次text就丢失监督，再用retirement-unverified覆盖原原因，是可复现的脆弱边界；本次不宣称已经证实有人输入、渲染误判或tier故障。三策略批旧回执的终态日志SHA与summary75均核同，可识别应待核。原件路径、SHA及时间见evidence.json；原始提示/native/屏幕留在本树忽略的`.artifacts/issue36-finish/`。

本补丁做三项：

1. composer有文字时保留对原轮的只读监督，最多120秒，较短任务期限/取消优先；屏幕明确空且原轮身份未变后才恢复普通观察。期间无prompt/续接/按键/finish；新人工native turn、租约变化仍拒绝。持续文字或未知屏幕到期保留75，不能靠task_complete清除草稿。增加屏幕SHA/时间/原生open状态的日志及input_hold回执，避免下次只剩猜测。
2. 启动PID在捕获birth前已消失时立即保留75，原因startup-process-unavailable，不再空等120秒；不伪造零模型或退场授权。所有未证退场的结果仍retirement-unverified/75，另存failure_reason，保留foreign、排队、文字期限等原原因。
3. wrapper核验失败后，在同一剩余截止预算内识别已最终封成75且原summary/SHA/session匹配的producer；仅沿原deferral立即转待核、通知原ops并释放逻辑槽位，不再轮询300秒。reason为terminal-unverified-receipt。未知/缺件或分类器阻塞仍走原有界超时；deferral不再次读取可能阻塞的日志。这个识别从不授权成功、退场或重派。

旧源码五个新增TS回归全失败；Python新增入口在旧源码缺失，真实wrapper在首次轮询等待陷阱被停（1error/1failure），原日志留存。补丁tsc0、TS定向7文件280过；Python核心/恢复/环境/wrapper62方法过，含新分类器阻塞不延长截止、保持旧75、failed/rc0、原空fix门和原deferral准入。测试只用固定输入及无害sleep子进程，nice19、单worker，无full/模型/游戏重跑。

运行增量仅`learner/lib/herdr.ts`、`ops/learner_tui.py`、`ops/codex-ops-learner.sh`；集成须保留main已有#48/#51注册字段/外部环境/tier、ROOT导出、seal及既有夹具，勿整文件覆盖main/live。ROOT修复来源61596985b是现有必需基线，本提交不重复运输旧策略宿主功能。其他批次完整检查不能替本增量的定向，完整列车仍归集成员协调。

没有对生产执行apply、prompt、按键、finish、seal或关闭；三个策略原回执SHA仍同。原083104已完成策略的恢复入口及两个未提交策略的处置，仍须原合同owner建立有来源的恢复合同，当前postmortem/experience入口不扩权、不改task套用。此交付修新监督/核验行为，不宣称旧策略已收尾、入库或回收；科学父及自然验收开放。
