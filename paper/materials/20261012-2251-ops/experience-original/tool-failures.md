# 本批工具原失败

- 只读诊断一次多余右括号：`SyntaxError: unmatched )`，未写数据；同诊断修正后得到旧SL日志12场50试7赢。
- 一次工具构建失败：`error building bubblewrap command: Fatal error: ripgrep unreadable glob scan failed for /home/dw: rg: /home/dw/Projects/agent-hearthstone/.aws: No such file or directory (os error 2); .codex: No such file or directory (os error 2)`。未执行命令，同权限原命令重试成功，未读所列外部目录。
- 首次切片调用早于样本生成，slices-before.log仅为空数组；不作验证，保留为slices-before-premature.log并等样本齐全后重跑。
- 原树test-sandbox入口tsc完成、Vitest仅打印RUN后超过数分钟无用例输出；向本次执行会话13746发送中断退出130，保留test-source-direct.log。不能把未收集完当测试通过或代码断言失败。按前批方法在逐SHA一致的跟踪源码副本使用原入口重跑，避免历史learner/runs目录扫描；未改脚本/固定排除/预算。原初失败rc未产生，由执行工具确认130后落盘。
- 首次复盘副本比对断言`AssertionError: states`，因为postmortem每行附加_line/_offset/_sha256，不是源日志字节副本；四类文件逐对象去除这三个元字段后核相等，并逐原行SHA核其_sha256，不改原件。原失败为<stdin>:14。
- 只读定位首次使用调度批名212419、实际目录是212420-postmortem；两个试探源码路径sim/potion.ts、sim/cards.ts不存在，未读取；改按现有reflex/sl入口定位，无代码修改。

- 补充勘误：前批成功的Vitest日志也是只在最终汇总输出，343文件3410例历时约505秒（2 workers）。故本批静默运行不能据此断定卡在收集/扫描；直接调用的130仅是主动中断，不能声称已定位扫描故障。隔离副本1 worker继续等原600秒期限，若超时按固定入口以2 workers重跑，保留全部日志。
- 隔离首轮SANDBOX_WORKERS=1在600秒外部期限退出124，日志只见RUN且无最终用例数，不能算通过/代码断言失败。随后2026-10-12T22:37:20+08:00以相同原入口、相同源码/最终经验、2 workers及1200秒外部期限重跑；原日志与exit文件分别保留。前一段的“若超时”现已实际发生。
