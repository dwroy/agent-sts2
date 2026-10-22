# #20 补充 5：主管收件箱

接续 [18:05 补充要求](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6338136890)，公共父提交 `6d358727981e057fc7992425dee7072594790809`，上游 kit 从 `63f1dde60fb70f38cb46982e040210eb8ab0818c` 更新到 **`86cdf3b594967e50e8b85bf11d633286d0e927c1`**；通过既有 Windows ssh.exe 推送并核远端 main 同 SHA。开发用 kit 在本工作树忽略目录，未更换主运行根生产安装。

**本轮增量影响 live 启动：否。** 只改派单通知、会话提示、固定测试及文档。父交付影响 live 启动仍为是，原启动发布/pin/首局 source 与 run-config、实际机器级申领/派发/回收等验收继续保留。

## 实现

- `.agents/board.yaml` 新增 `dispatcher.claude_inbox: ops/codex-ops/inbox-claude.md`。各项目独立配置；未配置的旧项目保持兼容。session.prompt 用主运行根 `{root}` 明确写入路径，列主管裁决、P0阻断超过20分钟无人推进、停局且常备授权不能恢复三种人工上报条件；细节写 issue。
- kit 在原 tick 为开放且由本仓 owner 创建的 issue 的 owner:claude、needs:roy 标签写一行，按 labeled event ID 去重，移除重贴是新事件。首次接入已有的有效标签各补一次；外部作者/PR/已关闭项不触发。格式 `HH:MM [board] #N 一句话`。
- 看门狗观测失败、三次接续后完整回应窗口仍无进展，以及本项目重任务排队达到原 heavy.warn_minutes，各生成一条。原事件反复观察不重写；重试耗尽与其新增 needs:roy 是不同事件。重任务只通知自身项目，无 issue 的项目级任务用 #0，不抄命令/终端/issue 原文。
- 原 journal 增加 claude_notices：sending先落盘，单次追加/文件flock/fsync后记done；中断保留sending/uncertain，不自动重复。原 --resolve 接受 claude:摘要，操作者核本地文件后登记done或确认未写才retry；resolve本身不追加。路径必须在本项目内、无软链接且不复用配置/journal/digest/普通inbox。dry-run不写文件、不消费事件。

## 检查

| 检查 | 结果 |
| --- | --- |
| 生产 `agent/node_modules/.bin/tsc -p tsconfig.json --noEmit`（PATH含既有Node） | 退出0；与原npx入口使用相同编译器及生产配置 |
| kit定向 `python3 -m unittest test_claude_inbox test_board test_watchdog test_project_contract` | 86项通过，其中新增9项 |
| 公共生命周期定向 `python3 -m unittest test_issue_session` | 64项通过，含主运行根路径/三种上报条件实际格式化测试 |
| 公共/私有diff检查、源码及完整增量gitleaks | 通过；明文日志和发前正文另扫 |

测试均nice19、串行运行；未跑完整Vitest、未新增重任务等待者。定向范围覆盖原投递/停滞/区域/前缀契约，完整组合核验仍由原集成员沿原窗口完成，不能据本轮150项或旧full认定最终组合通过。原#41完整时钟修复与#40组合合同、原失败记录均保留。

输入文件与日志SHA见 inputs.json / verification.json，原日志见本目录。公共变更3份：.agents/board.yaml、docs/github-issues-workflow.md、ops/tests/test_issue_session.py；另追加本材料与decision-log。私有变更4份：board.py、watchdog.py、test_claude_inbox.py、README.md；machine.py/heavy.py协议未改。

## 交接

集成员核本公共补交与精确kit；由原ops在既有项目实例升级流程中安装同版board/watchdog，保留原journal/uncertain/控制与资源门，再核原tick真实追加及Monitor实际唤醒。新会话提示随本项目配置采用，不热改在途会话。其他项目由其原owner决定安装/启用，版本同步到炉石#24不代其实际采用。

回退先沿原入口暂停新增派单，核无在途动作后恢复此前受检配置/kit；保留claude_notices、原文件与不确定记录，不删除历史后重发。未配置可关闭后续收件箱通知；已写内容不撤回。本轮未写真实收件箱/共享队列、未安装/启用/pin或修改main/live/STOP/账号/ops prompt/其他会话；真实送达和原发布待验不关闭。
