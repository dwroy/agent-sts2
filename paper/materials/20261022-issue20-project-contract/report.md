# #20 补充需求 4：多项目契约合并交付

开发来源沿原分支，公共父提交 `459366bac49b7a959d3fd59b92bffcb12360aebe`；私有 kit 从 `f1cc7285de2f14aeea33cebb8e6eba4ce618af01` 改写为 **`ba7a9c39d9786e4c31256d63ea5b57d03b7db58f`**，已用 Windows ssh.exe 推送 `dwroy/agent-board-kit` main 并核远端同 SHA。私有源码、公共候选配置与文档 SHA 见 inputs.json。

**本轮增量影响 live 启动：否。** 父提交 #39 的启动隔离修复仍影响 live 启动，原发布/pin/首局读回门禁不变；本轮不覆盖其验收。#39 已补交评论并转 review，独立复核/最终组合 full 仍待集成员，不关闭。原启动修复材料位于相邻 `20261022-issue20-sim-startup/`。

## 改写范围与契约

只读核对炉石 `4aa2e250e744c0d383492273524e32f1a8a629c8:ops/agent_board_kit_compat.patch` 与工作树原件同 SHA；没有直接套补丁、修改炉石仓库或共享生产安装。原补丁及其 14 项交付口径保留，以本次 18 项契约测试和全部 69 项既有回归做等价覆盖。

| 要求 | 合并后的行为与固定证据 |
| --- | --- |
| 项目会话/角色名 | `roles.dev.agent_prefix` 默认 issue-，支持 hs-issue-；只统计本项目命名开发者及本项目不完整登记。开发者须同时匹配登记 pane/名字/引擎；角色名须唯一，指定 pane 和 agent 时两者都匹配。测试容量隔离、名字解析、重复名字、错名/错 pane、非法配置。 |
| 统一 area 门 | 沿原 claimed_areas、waiting_for 和 digest 实现，无第二套互斥。in-progress/review、ready 已登记、同 tick 预约均阻止重叠区域；多 area 任一冲突就等。foreign/closed 不占普通预约，普通 waiting-release 释放。测试优先级、真实/只读 tick、缺区域策略、原队列关闭仍可采用区域门、digest 不带正文。 |
| 不确定分配 | sending 前持久化原 areas，回执不确定后即使状态/标签改变也保留；旧分配区域不可知时暂停新派发直到核证据 resolve。新 ready 标签事件不能绕过同 issue 的旧 uncertain。无区域失败在同 tick 也保守保留；未知分配计入容量。未自动重发或删除原账本。 |
| 分支进展 | 生命周期登记仍是逻辑 issue-N-slug，按 `worktree.branch_prefix` 选 codex/、嵌套项目路径等；拒绝路径穿越/非法前缀。main/live 仍须关联 #N，不将别的项目分支算进展。 |
| 消费权边界 | `consumer` 默认 host，maintenance 由本项目原入口消费。无 --project 的宿主 tick 在项目锁/账本/探针/API 之前返回 delegated；--project 只选唯一已登记主根，不触碰其他项目。固定双项目测试中 STS2 真实 fixture 派发成功，登记但 off 的炉石零 API/提醒/派发/项目锁或账本写入，文件逐字节不变。另测单项目选择不加载其他无效配置、未知根拒绝、dry-run 零写入。 |

`CAPABILITIES` 提供炉石接入器要求的 project-consumer、agent-prefix、area-mutex、branch-prefix 四项字面能力声明。能力存在不代 owner 授权或启用。

通用区域门 `dispatcher.area_mutex` 默认 true，独立于 `heavy.enabled`；`require_area` 默认 false，炉石原候选 true 可直接采用，缺区域的 ready 保持排队。为保留 STS2 上次交付的上线边界，本分支 `.agents/board.yaml` 明确增加 `area_mutex:false`，heavy 仍 false；原 ops 在原资源/冲突上线自然边界一并启用。此次仅修改候选配置，未动主检出配置。非法布尔值、require_area=true 且 mutex=false 拒绝。

maintenance 项目的原适配器负责主根校验、自己的有效 on/off、维护锁、时限和原回收分工，再以 --project /主根 --no-reclaim 调 kit。--project 是路由接口，不是授权或开关；宿主不能借遍历替代这一流程。共享登记锁仍串行各原入口，不新增 timer、daemon、模型或权限。项目同名冲突须由各 owner 在登记前分配全局唯一前缀/角色名。

## 检查与材料

- kit 最终 **87/87**（原 69 + 新 18）；公开生命周期/接入 **62/62**；生产 tsc 退出 0；单 fork、单 worker Vitest 定向 **2 文件 10/10**，退出 0。
- 新增契约测试在私有 kit `test_project_contract.py`；复验：`nice -n 19 python3 -m unittest discover -s <kit> -p 'test_*.py'`。原队列、done、停滞/快速重试、uncertain 与生命周期回归均保留。
- 公共复验：`nice -n 19 python3 ops/tests/test_issue_session.py`；在 agent/ 用原 PATH 跑 tsc，以及 `nice -n 19 npx vitest run tests/board-resources.test.ts tests/learner-self-check.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism`。
- 本轮未另起 full/队列等待，不占 #37 → #20 原组合检查窗口；上轮完整测试只作历史证据，不能代本交付最终组合树。受测输入和日志压缩/明文 SHA 见 inputs.json、logs.json，检查状态见 verification.json。83/86 项中间通过记录保留。一次从 agent/ 使用错误相对路径的 kit 编辑/检查命令在改动前失败，已修正目录并按最终源码跑 87 项，不将该次视为测试结果。
- 源码/增量、日志明文、公共材料和发前评论均经 gitleaks；压缩件另存对应明文 hash。未读取环境/凭据内容。

## 交接、安装与未完成项

本轮私有改动：board.py、watchdog.py、README.md、新 test_project_contract.py；heavy.py 未变。公共增量：.agents/board.yaml、docs/github-issues-workflow.md、decision-log、本目录材料。前轮源码与原失败/待办不覆盖。

由原集成员在 #37 后按最终组合核验，之后原 ops 在自然边界安装上述精确 kit（board.py、watchdog.py、heavy.py 连同其余受审文件），保留各项目原控制/账本/uncertain。不能降回旧引擎读取已升级账本；按原 README 回退开关并保留现场。STS2 的 area/heavy 维持显式 false，直到原资源/冲突流程核验并获原 ops 启用；不会因 kit 能力声明自动开启。

交付将相同 kit SHA 同步至 STS2 #20 和炉石 #24。炉石由原 owner 在获准版本安装后按原维护协议核登记、dry-run、启用、实际原 tick 回执；此前保持 off、不登记 host。本会话没有安装到共享生产位置、登记任何项目、启用派单器、pin、运行 play、修改 main/live/STOP、ops prompt、账号/共享配置或其他会话。固定测试与源码交付不代自然派发/送达/回收、首局或生产队列实际验收，不提前关闭父任务。
