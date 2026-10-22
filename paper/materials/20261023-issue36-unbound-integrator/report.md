# #36 未绑定活动窗口修复：集成审查

核验时间：2026-10-23T05:05:19+08:00；角色 `[watcher]`。审查依据为 dev6351129721，对照先前 P1 6350284670；发布顺序仍服从 ops6349675684。

本次 P1 已修复，独立定向审查通过；不是完整检查或源码合入结论。精确源为 `c8ff9caf5edefd3c21e73b60386202a3d90920ed`，远端原分支核同；待集成必须同时取 `6a5d049f043d7c530a13850a0fde915ccddea25b`、`76b41d6d7ef4df6a2423210eb4a2780a686ed159`、`c8ff9caf5edefd3c21e73b60386202a3d90920ed` 三枚差量。不可整包重放旧分支。审查时 main 为 `a4401c94d5345242c6a47122738d8ad13a1cefbc`，实际 live 为 V6-R416 `3849fcb8a35940315422f64b16fbc104a6cb8b8b`。

## P1 复核

两处运行守卫现在覆盖活动 task_started 至原 marker/完整提示 SHA 接受之前的整个未绑定窗口，不依赖 AGENTS 前缀是否出现。调用/返回、reasoning 和 assistant 活动会持续保留拒绝；后来出现的合法提示不会洗掉 foreign。已绑定的正常工作、TS 初始 EOF 前历史和 Python 首绑定 turn 前历史仍按原边界隔离。原身份、草稿、lease/PID、退场和75保护保留；原 ownership 审查文件字节未改。

原审查提交 `e1084908d1ee90120f5c034630ee52154a57b7e0` 的两个固定复现程序逐字节核同后，在最终源码原样重放。TS NativeBatch 与只读对账、独立 Python verify_native 都拒绝三类前缀前及三类前缀后负例，干净正例接受。此结果见 `original-counterexample-replay.json`、`reviewer-ts.json`、`reviewer-python.json`；旧失败原件未覆盖。开发者新增7类×6位置矩阵及已绑定/历史正例也已读核，CLI负例75且输入不变。

## 独立检查

独立 tsc 退出0；9文件205项通过，Python26项已在包装入口内，不重复加算，矩阵 subtests 亦不另加。检查 nice19、单 worker、串行；2597受测输入前后 SHA 相同。`directed-checks.json` 与 `directed.log` 留存命令/结果；完整本地输入清单及其SHA见 `review.json`。开发者13份日志及20输入独立逐SHA核同，见 `source-audit.json`。未启动 full，R416旧6123绿不覆盖这三枚新补丁。

三枚差量相对 `6ec71c313fe113b107b44867c0aca2352a1a59ea` 的9个功能/测试/文档叶，在当前main/live的已有叶均与原基线逐blob核同，新叶均不存在；生产差量精确4路径，记录在 `source-audit.json`。这只说明当前前像可精确组装，到位后仍须重核最新live数据与最终组合，不能据此跳过唯一full。

## 四个冻结会话

只使用与前次相同的四份原档案和冻结 JSONL，逐SHA核对后，最终只读CLI四次退出0，独立Python纯native重建四份通过，原 session/turn/marker、完整提示SHA与前缀SHA均核同；18原文件前后未变。结果见 `four-session-independent-audit.json`。未新读当前会话正文、连herdr、发提示或开模型。

原状态差异保持：fix为submitted/无result，另三为75，bindings均空；冻结快照里fix与主策略complete，复盘与s2仍open。这不是当前状态，不证明产物/退场/finish，未重核当前pane/PID/lease。已消费任务不得重送、再次重排或另开同任务模型；原75/监督/控制与后续实际产物、身份和退场门归ops接续。

## 后续门

本轮仅技术复核与记录，不合源码，不改live、生产控制或会话；issue维持review，等待原队列给出精确组合的完整检查与合入窗口。完整33+26（含R413启动）→42工具余项→35→28→37及37→20保持，新36修复不自行插队。无新增主管裁决问题。

保留R416实际发布与四旧批各恢复一次的事实；自然验收、四批最终完成、学习/科学父与#27正式ACK CLI兼容仍开放。
