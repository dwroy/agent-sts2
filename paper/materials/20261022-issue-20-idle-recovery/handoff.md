# #20：空闲接续与生命周期恢复

沿原开发分支，父提交 `466e54561dc23e09321826d55af39c5abedd4aef`。本批落实 [Roy 经 Claude 转达的自动接续需求](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6324894427) 和 [两处生命周期缺陷](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6325415161)。通用派单引擎在私有 agent-board-kit，STS2 更新项目配置、原生命周期/分配工具及流程。精确 kit 为 `95f1efb3251a27f3f702540773a2b466920821e9`，源码及检查日志 SHA 见同目录 `verification.json`；父持久开关补交已由集成员核收，见 [原回执](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6325362410)。

## 行为

- 接收方 `idle/done` 可送达；`working/blocked/unknown`、身份缺失或不唯一继续排队。每个 pane 每 tick 最多尝试一条提醒，包括第一条回执丢失的情况。
- 原 stall tick 内观察有活的角色：集成员 review、ops waiting-release、已登记开发者 owner:dev/in-progress。默认连续观察 idle/done 30 分钟；配置位于 `dispatcher.watchdog`。只从首次实际观察计时，工作/缺席/身份变化重新计时，idle↔done 连续；无活不读尾屏、不恢复会话。
- 普通接续为一行 `#N 轮到你：上次停在中途，请接着做`。同 issue+角色至少两小时一次，即使中间有进展重置也保留间隔。
- 有活且可输入时，本地只读约 40 行，在内存匹配可配正则。默认容量、限流和网络错误样式，大小写不敏感；十分钟退避后发一行 `#N 轮到你：上一轮因模型/网络错误中断，请接着做`，后续快速重试也至少十分钟一次。空样式列表关闭快速路径；轮询间隔影响实际观察/发送时间。
- 普通/快速共用连续三次无进展上限。新角色评论、标签集/事件或相关提交重置连续次数；共享 main/live 上不相关提交不算本 issue 进展，pane 更换也不算。Git 扫描每 ref 最多 64 条，保留已见 SHA，不因相关提交滑出窗口而误报进展。
- 空闲后新增本角色评论会抑制该次空闲段的提醒，直到实际再次工作或另一个任务送达。第三次提醒后再观察完整的普通空闲阈值（默认三十分钟）或快速退避（十分钟）供回应；仍无进展则加 `needs:roy` 并列入 digest 的“卡住”节，停止第四次提醒，两小时提醒间隔不延迟这次标签升级。已观察到该标签后明确移除可重新启用接续。
- 提醒和加标签都先写 pending/sending，再核 done/uncertain。保留收件 pane、时间、尝试身份等元数据，绝不记录尾屏或子进程错误原文。同 issue+角色任何不确定提醒/升级都会保留接续，跨进展变化也不重发。核原现场后用原 `--resolve`；done 从核实时间计下一间隔，retry 明确允许重试原事件。

## 生命周期修复

回收先核 Codex 的已知叶辅助进程，再检查其他前台进程。新例外严格匹配 Codex 直接父进程、`/init` exe、完整 WSL PowerShell argv 和固定剪贴板循环脚本 SHA `d6735db7931c303c1e1b5f456eb3e400cf9903dacc7c6986bc8714ca84f63641`，并要求没有 Linux 子进程；未读取剪贴板内容。脚本不同、增加参数、其他父进程或任务子进程继续保留，不按 powershell/init 名字放宽。该 argv 来源于本机同版本 Codex 辅助进程的只读元数据采样；#31 原现场已由主管手工绕过，本批用相同结构的固定 `/proc` 回放验证，不冒充实际回收。

`spawn` 遇到 allocating/allocated/creating-tab/tab-created 的旧登记会返回精确 `resume` argv。显式 CLI 核 issue、账号、容量、主机进程可见性、无既有 agent、同仓工作树/分支/base/干净状态和原 tab/terminal 后继续；prepare 需幂等，启动后仍先命名再单次发送任务。starting/prompt 不确定仍只用原 `register`，不能 resume 重发。

```bash
# 在原获准主运行根，按 spawn 返回的相同 config/state-dir 使用；N/slug 替换为登记值。
nice -n 19 python3 ops/issue_session.py --root "$PWD" resume N slug
```

creating-tab 优先从实际唯一 tab/pane 补回回执，缺席不自动重建。只有操作者核实原创建未发生，才显式加 `--retry-tab-create --reason '<本地证据引用>'`；有身份冲突、多 pane、进程、脏改动或既有 agent 都保留。allocated 意外发现 tab 则先记身份保留，核后再 resume。自定义配置/登记目录沿 CLI 返回的 argv，不擅自换根。派单器原 uncertain 仍需核实际单次送达后显式 `--resolve ... --outcome done`，不因生命周期恢复自动清除。

缺失的分配副本通过可选 `worktree.resume_allocate` 适配器恢复，STS2 指向原 `worktree_checkout.py ... --resume --require-node`。严格核原 allocation receipt、base、分支与现有副本，保存失败/恢复历史；不覆盖源码、外来副本或其他进程。issue 分配显式使用并持久保留 `--require-node`，其他任务的共享工具仍可选。Node 包缺共享 provider 或非交互 PATH 缺既有 Node 时，allocate 自己失败并保存明确原因；生命周期只转达固定安全原因，不复制 stderr 原文。不安装依赖；修好原环境后再显式恢复。

## 固定模拟

`test_watchdog.Recovery.test_capacity_incident_replay_2158_done_reviews_31_and_20` 将 #20/#31 设为已收到普通提醒的 review，使用固定时钟和假的 Herdr/GitHub/Git 观察，无实际 pane 提示或 issue 标签动作。

| 时间（上海） | 固定输入 | 结果 |
| --- | --- | --- |
| 10-21 21:58 | 集成员 done，容量错误，#20/#31 review | 首次观察，开始快速退避 |
| 22:03 | 仍 done、无进展 | 不发 |
| 22:08 | 仍 done、无进展 | 一条 #20 快速重试，done 回执；#31 本 tick 保留排队 |

重试时间距首次观察正好十分钟。此结果是回放验收，不是生产送达；不回填此前 5.5 小时记录。同目录 `replays.json` 还记录了剪贴板辅助进程的精确 argv/父进程/叶节点正反例、prepare 失败停 allocating 后单次 resume（一次 start、一次 prompt、一次 tab create）。独立 allocator 固定测试验证无 Node/provider 时 allocate 就失败、保留失败回执，再按精确记录恢复共享链接。

固定测试共 147 项：kit 59、生命周期/入口 62、共享工具/分配 11、原回收器 15。更多覆盖阈值、两小时间隔、三次升级、角色/外部评论、提交/标签进展、读取失败、末尾原文不落盘、共享 pane、uncertain、显式恢复和 dry-run 零写入。最终生产 tsc 退出 0；完整 Vitest 647 文件、6090 通过、2 既有跳过，退出 0。源码完成时逐项 Git blob 核同，结果及日志 SHA 见 `verification.json`。新增生命周期要求及收窄 Node 必需校验到 issue 入口时，分别中止了两次尚在运行的完整 Vitest（均退出 130）；日志和原因保留在 `interrupted-check.json` 及本地 `vitest-interrupted.*` / `vitest-scope-adjustment.*`，不计为完整通过，最终源码另跑完整套件。随后完整套件 6089 过/1 败/2 跳过：Python 11 项实际通过，旧 Vitest 包装仍断言 Ran 6 tests；改为校验非零测试数后，包装两项定向通过，再重跑完整套件。原结果保存为本地 vitest-count-failure.*，SHA 见 verification。

## 集成和安装

1. 集成员核 STS2 本提交；父 `466e54561` 已核入 main，保留原回执。按 verification 中 kit 精确 SHA 核私有仓远端和全部文件。新的 Python 模块 `watchdog.py` 必须与 `board.py` 同目录，不能只拷旧四文件。
2. 原 ops 在获准主运行根沿原流程保持/设置有效 off（同时核显式环境覆盖），确认没有正在执行的 kit tick，保留宿主/项目锁及原 journal。确认安装检出干净后，经原 Windows ssh.exe 拉取并检出精确 kit SHA，核文件 SHA，再跑 kit 固定测试。若有在途 tick 或安装改动，保留现场后协调，不强行覆盖或删锁。
3. 原宿主登记、各项目 owner 授权、既有会话绑定和唯一消费者流程不变。原 ops 只读 dry-run 核计划，主管确认范围后，原 ops 才设置持久 on，核下一原 stall 首 tick、done 送达、普通/快速接续、升级与账本。测试通过不代运行验收；不能用真实故障或重复任务制造验收。
4. 回退用有效 off，保留 journal、uncertain、登记和汇总。旧 journal 可直接升级；新账本已有 escalate 事件时，不把旧引擎降级后打开，不删除事件来绕过校验。修复后沿原显式恢复语义接续。

本批没有实际生产 on、派发/重试/升级其他 issue、Herdr 识别或配置变更；没有改 live/STOP、对局、Codex 配置、cron、ops prompt 或其他会话。技术提交交 review；生产安装、唯一入口和首 tick 分项继续由原角色验收。
