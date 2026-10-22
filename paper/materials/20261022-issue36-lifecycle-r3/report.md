# #36 生命周期第三次交付

基于原分支 `4500cdb50f55db695ab9afb12604c78270abec88` 修复集成员评论 [6332627007](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6332627007) 的两类阻断。对局流式直播源码沿上次交付，本轮修改学习 TUI 的处置权和原生回合绑定；未合入 main/live。

## 处置权与退场

- 初次发送、接续发送和所有退场原因均检查原监督租约、本批 PID/birth、pane/tab/terminal/workspace、前台进程组、Codex 身份/cwd 和空输入框。每个 Esc/Ctrl-C 前重读。正常完成、超时、取消、原生报错和传输异常均受同一退场门约束。
- 租约失效、启动回执不确定、人类草稿、未知屏幕、外来前台/回合或观察失败，均返回 `75 / stopped=false`，保留原会话、回执和监管租约；原 wrapper 的核验等待继续禁止 finish/关 tab/回收。不另开模型或重送原任务。
- 按键回执不确定也停止自动退出；删除强杀升级。已核原 PID 退出时进入只读等待，核 shell 恢复前台后才持久化 `retirement_authorized=true`。补充固定案例覆盖 PID 已结束而前台元数据延迟的窗口，避免把这类正常退场误判为不确定。

## 原生回合绑定

- `task_started` 清除本回合接受状态；先前 accepted 不延续到新回合。每次发送前持久化唯一一次性 marker 和完整提示 SHA，原生用户消息按首行 marker 与完整正文哈希匹配，绑定原始 turn 或明确发送的 continuation。
- continuation 编号独立递增，不因工具进展重置而复用 marker。旧 marker、前缀碰撞、正文改变、任意人类新回合和未核接收的续跑均不能完成批次；同一 turn 的 event_msg/response_item 重复表示可接受。usage 仅累计已绑定回合。
- 原生尾部未换行时继续等待，不将半行当成已读完。Python wrapper 独立从原生记录重建相同的提示/turn 顺序、正文 SHA、session/cwd 和最后完成消息；失败/超时也检查绑定与处置授权。

## 核验与原件

最终生产 tsc 退出 0；定向 8 文件 146 项通过（包含原样审查 4 项）；Python 原生回执/关 tab/托管启动 18 项通过（也由定向集的一项 wrapper 调用，不重复计入 146）。46 个输入 SHA 读回一致。详情见 `checks.json`；源码/文档/测试输入见 `tested-inputs.json` 和 `input-readback.json`。检查全部 nice 19、单 fork worker、文件串行，使用固定回执、mock herdr 和测试自建 sleep 子进程。

审查反例原样复制到 `agent/tests/learner-herdr-ownership.test.ts`，SHA 与原审查文件相同，记录在 `reviewer-test-sha.txt`。先在 4500 源码上复现四项全败，原件 `checks/reviewer-before.log`；修复后四项通过。另补齐真实 foreground_cwd 的成功夹具，并断言原提示已发送后再模拟租约丢失，避免仅因严格元数据前置拒绝而掩盖生命周期缺陷。新增草稿/未知屏幕/外来前台、Esc 后输入或租约变化、取消/错误、按键不确定、不能退出、明确续跑及 Python 人类回合替换等案例。

过程记录保留：`checks/targeted-first.log` 的 Python 旧夹具缺少新授权字段；`checks/targeted-final.log` 的两项正常退场偶发失败，经 PID 退出/前台元数据滞后固定案例修复。最终重跑原件 `checks/targeted-race-fixed.log`；单独生命周期检查 `checks/lifecycle-final.log`。原日志位于本地忽略目录，`checks.json` 保存摘要、命令与 SHA，公开仓库保留可复现测试。

按 Claude 指示，未重跑完整 Vitest；初版完整绿仅覆盖初版源码。当前完整组合检查仍待原集成员/ops 在 #33 独占窗口后协调。真实 TUI 的原任务/原账号/实际档位/原生产物/退场关 tab，以及 #33 后自然对局直播滚动和换局仍 pending，不以固定测试代自然验收。

未运行 play，未修改 live/STOP、共享配置、账号或 hosting，未关闭其他会话；生产 brain_view 沿原 off 门。本工作树与分支保留交 review，由原集成员集成并交原 ops 自然验收。
