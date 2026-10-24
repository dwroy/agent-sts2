# #47 对局大脑详细直播交付

开发工作树 `issue-47-task`，基线 `8a241eb7b3f72d6d6f4c996030e5917ef90b1194`。按 #47 的目标与边界交付源码，部署与自然局验收交集成员和 ops。本任务未运行 play、未改 live/STOP、未关会话，未改学习者。

## 改动

- `agent/src/brain/live-view.ts` 默认详细模式：按局/SHA 展示系统提示预览；从引擎共用用户消息生成完整题面，含状态、选项、投影、本局记忆和重问，JSON 仅展示缩进；查询结束后已有资料作答的题面也展示。默认题面 16 KiB、参数/工具返回/来源各 4 KiB，按段落/行保留首尾，省略标记含字节数和位置，标记计入上限，不拆 UTF-8。
- 推理摘要、正文和检索按原事件顺序展示。工具开始前刷新未完成段，返回附原文字节、耗时与来源/版本，缺失明确未知。完成时无公开摘要会明确提示；本次尝试与路由接受/拒绝保留完整答案与理由。
- `codex-session.ts` 仅新增旁路观察：保留现有公开增量，补仅 completed 事件提供的公开 summary/正文，按 item 去重；raw reasoning text/content 不广播。`knowledge-agent.ts` 仅补作答阶段题面观察；工具 observer 传递已有来源字段。不改变答题、题面、预算、引擎或强度。
- `ops/brain_view.py` 保留已脱敏长行和 SHA，不再二次截为 1600 字，同时保留 `key_turns` 游戏字段。旧 brain.jsonl 完成行仍按原样式作为兼容摘要。
- 脱敏先于截断：结构化敏感字段、转义值、已知外部标识的自由文本回显、分块凭据和终端控制符均测试；最终答案复用本题工具发现的敏感标识。未分句流段最多 256 KiB，超限明确折叠；展示队列 8 MiB，满或写盘失败不影响答案。

## 设置、发布与回退

详细模式默认开启；下一控制器自然启动点读取 `BRAIN_LIVE_MODE=compact` 可恢复旧简洁展示。`BRAIN_LIVE_QUESTION_BYTES=16384`、`BRAIN_LIVE_TOOL_BYTES=4096`、`BRAIN_LIVE_SYSTEM_BYTES=2048` 可配置；每项合法范围 256–1048576，非法值退默认。系统预览前 12 行，原文字节数/SHA 不受预览截断影响。

每局 `current.txt` 与 `previous.txt` 各上限 64 MiB，总计最多 128 MiB；异步写盘，无新增模型/连接/工具执行。本补丁不改对局决策，不自行分配行为发布号。最终组合检查、main/live 集成与开局边界沿原集成员/ops 流程；源码回退限本补丁的产品叶子，保留记录与原日志。

## 中断前自测与历史记录

固定输入，无真实模型或对局。命令使用 nice 19，Vitest 单 worker。

- 生产 TypeScript 类型检查通过。
- 直播写入定向测试 11 项通过；MCP/知识模式组合 3 文件 32 项通过；Codex 真实适配器 + 假 app-server/工具集成通过，证明 completed 公开摘要与已有增量只展示一次，raw reasoning canary 不出现。
- Python 只读 viewer 16 项通过；原 `learner_jobs.py` 未关闭 hosting 文件的 ResourceWarning 单列保留，与本补丁无关。
- 定向开发过程初轮出现一个 512 B 截断夹具失败：消息前段是嵌套 state，测试却要求中段 question 的开头也保留；改为最小 state 的固定夹具后通过，并加强省略标记计入上限的断言。另一次类型检查发现临时替换误在 interrupt 中多声明未使用变量，已移除并重新通过。以上不抹除为首次全绿。
- 沙箱自测在 11:18 按 Roy/原 watcher 协调中断，为 #36 P0 让出唯一完整检查窗口；本轮退出 143，不计产品失败、不计完整绿。核同本工作树 Vitest PID 4096544 后只向该 PID 发 SIGTERM，随后 shell/wrapper/Vitest 原四 PID 均退出。原日志 `.artifacts/issue47/sandbox-tests.log`，中断回执 `.artifacts/issue47/sandbox-interrupted.json`，公开释放回执 https://github.com/dwroy/agent-sts2/issues/47#issuecomment-6356557128 。#36 原 owner 明确释放前不再启动完整检查。

## 最终开发自测与交付

12:15 原会话收到 Claude 明确指示：开发只跑 tsc 和定向测试（nice 19、单 worker），不占唯一 full 窗口；完整检查由集成员做。此指示替代本报告前两次等待窗口的续验安排。已恢复 `status:in-progress` 并完成最新源码验证，随后交 `status:review`。

- 生产 tsc 退出 0。
- 定向 Vitest 7 文件、71 项通过，0 失败，单 threads worker；包含直播写入、Codex 假 app-server/实际适配器、dsh/知识工具模式、原预算/路由、MCP 及 Python viewer 包装。Python viewer 16 项包含在包装测试内，不与 71 相加。
- 最后补强的跨片段 apostrophe/escaped quote、空白公开摘要、external 来源裸逐局 ID（包括最终答案回显）均已验证；完整题面/选项/本局记录/模拟事实、参数及返回的首尾截断/省略字节与位置、完整答案、公开摘要 completed-only 与增量去重、原只读/失败隔离继续通过。
- 验证输入、命令、退出码及日志 SHA 见 `validation.json`。原始终局日志 `.artifacts/issue47/directed-final/` 留原工作树；原 sandbox SIGTERM/143 不覆写，不称产品失败或完整绿，本轮没有重启 sandbox/full。
- 修改补丁已通过 gitleaks；公开交付评论单独扫描通过后发送。完整回归由集成员在最终组合执行；上线、实际 tab 内容与自然局消费者读回由 ops 核验。本交付不修改学习者、live、STOP、决策逻辑或模型预算。

原等待检查点已由本节取代，原输入快照 `.artifacts/issue47/checked-inputs.json` 与 `.artifacts/issue47/resume-inputs-1151.json` 保留，最终输入另列 `validation.json`，不覆盖历史原件。

## 尚待自然验收

本工作树的固定测试不代表已发布或自然采用。集成后由 ops 在下一自然局核对 tab：选择一道拿牌题，记录局号/题号、完整题面、公开摘要（若提供方未提供则明确缺失）、至少一次工具的完整参数与返回/来源版本/耗时、最终答案；同时核同一 tab、只读身份和换局标题。不为验收额外开局或请求模型。该项仍开放，issue 保持 review 交接，不自行关闭或回收工作树。

- 历史停点（已由 12:15 指示取代）：11:51 接续实读 #47 watcher 评论6356939167与 #36 6356938532：首轮完整检查失败，主管6356904617已授权最小P0组合重检，唯一窗口继续归#36，尚未释放。本轮无tsc/Vitest/sandbox/模型/生产操作；仅审阅、补上述防泄露边界和落盘续跑输入快照 `.artifacts/issue47/resume-inputs-1151.json`，原快照、SIGTERM/143日志保留。窗口释放后恢复in-progress续验，不把提醒当释放凭证。
