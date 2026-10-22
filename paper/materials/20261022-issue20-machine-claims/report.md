# #20：每项目实例与机器级重任务申领

按 [Roy 最新架构决定](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6335710125) 改写旧项目内队列，沿原分支公共父提交 bfcb85bd0。上游 kit 最终 **63f1dde60fb70f38cb46982e040210eb8ab0818c**（ba7a9c39d → 22e6ca2 → 63f1dde，正常快进推送并用 Windows ssh.exe 核远端 main）。私有协议原件是 kit 的 MACHINE-PROTOCOL.md；公共/私有精确输入见 inputs.json。

**影响 live 启动：是。** 新 run.sh 通过随 live 发布的固定 board_heavy.py game 桥接登记本项目对局进程后原地执行原命令；heavy=false 时直接原地执行原命令，不创建共享目录。新 pin 将 board_heavy.py、issue_session_support.py 纳入关键输入，main helper 更新不穿透旧发布；live 更新后未 pin 拒绝混用。兼容原 v1 pin 升级，不改游戏默认配置、规则、预算、实际账号或 STOP。未实际发布/pin/启用；首次采用仍由原 ops 在自然边界按 #39 原启动协议核 source/run-config 与安全接续。

## 架构与边界

| 层级 | 状态与责任 |
| --- | --- |
| 每个项目 | 自己的固定 kit 安装/版本、原定时/维护入口、维护锁、开关、会话/派单账本和 area 门。STS2 接入器启用及执行前要求登记表只含自身主根，固定 --project；非 dry-run 另核自己的有效开关。不登记/启用/安装其他项目。 |
| 全机协议 | 默认 ~/.local/state/agent-board；各参与实例可约定同一绝对 machine_state。queue.lock 串行 FIFO 号/记录/准入，records/ 保存全机请求，leases/ 保存请求存活锁，slots/0 与 slots/1 各有实际资源位 flock。没有中心派单实例。 |
| 优先级/容量 | 跨项目 ops > integrator > learner/experiment > dev/other，同级全机 FIFO。任一有效对局声明时1位、全部停止时2位，实例不能提高。开始对局只限制后续准入，不抢占已跑任务。 |
| 存活与唤醒 | 执行进程持请求与位置两把锁，CLI exec 同传 FD，不加常驻队列包装进程。正常/异常退出关闭锁，历史 JSON 不当成功回执。等位使用共享目录 inotify 和所有上报游戏/旧测试 pidfd，无轮询、心跳回收、信号或杀进程。 |
| 对局/旧任务 | 项目只探测自身根并上报 projects/；game-running/ 保存启动时 PID/start/boot。PID退出、start变化、旧boot失效；身份读取/协议错误保留任务，不猜停局。探针在全机短锁外执行，观察未变不写；排序不同也不产生自唤醒写循环。 |
| 汇总 | 每个实例的原 digest 都显示同一机器级项目/角色/任务、running/queued、等待秒数和 overdue；dry-run/只读 snapshot 不建目录、发表状态或取位。 |

会话/角色前缀、area 互斥、分支前缀、maintenance/--project 以及旧 host pass 跳过自维护项目的四项兼容契约保留；这是路由兼容，不恢复旧共享派单器部署。增加 machine-heavy-v1 能力声明。STS2 候选 area/heavy 仍显式 false，旧项目内 state 配置改为采用默认共享协议根，不解释或搬运旧 board-heavy-v1 记录。

## 固定验收

- kit **100/100**：原87项保留，13项新机器协议测试。两份临时独立安装、两个真实进程竞争一个共享队列，核跨项目优先级；同级 FIFO、任一项目游戏限制、容量下降不抢占、全停两位也覆盖。
- 真实 exec 测试在命令运行时核实际位置仍锁住，异常退出93后请求/位置均释放；游戏声明真实持有者退出后 pidfd 唤醒第二位，不靠等待 tick。另核陈旧 start、旧 boot、协议错误、symlink/权限、越权容量及不变探针无心跳写入。
- **STS2 实际 .agents/board.yaml 模板 + 临时第二项目**独立回放09:37：仅在临时根把 admission/probe 改为固定夹具，保留其他配置；旧 #36 dummy 进程自然退出，ops #33 先于另一项目开发 #35 入场。无 play/model/API/真实宿主 tick。命令：`nice -n 19 python3 paper/materials/20261022-issue20-machine-claims/replay_machine.py --kit ops/codex-ops/agent-board-kit --config .agents/board.yaml`；原日志含模板与4份引擎 SHA。
- 公共生命周期/接入 **63/63**；游戏桥接 **4/4**（开关关闭无 kit 也执行原命令、PID不变、参数保留、启用路由、本地安装缺失拒绝）；启动 **20/20**，包括新 helper 发布隔离与旧 pin 升级。
- 生产 tsc 退出0；单 fork/单 worker Vitest **4文件19/19**：board-resources、launch-environment、v6-card-option-loop、learner-self-check。桥接内 Python 共36项；原启动核验脚本原样复跑 **23/23**（当前20基类+原3反例）。Bash语法0，消费者盘点329源码/285键/未分类0。
- `v6-card-option-loop.test.ts` 逐字节采用已独立核过的 #41 c6428609c 完整来源，保留八终局、真实结果/逐格精度、内外预算对照，不覆盖回旧 engine-only 时钟。原161/162失败及 #41 冻结原件继续沿原材料，不因本轮定向绿认定历史唯一根因。

原始日志压缩和明文/压缩 SHA 在 logs.json；verification.json 列全部结果。初期97项的09:37反例失败定位到“把 queued runner 祖先误当 managed”并修正为只有 running 可免重复计数；另一次新增测试引用字符串错误造成导入失败，原件保留，修后最终100通过。中间通过也保留。源码/完整增量、日志明文、材料和发前正文均用 gitleaks 扫描；不以扫描压缩件代替明文扫描。

**最终精确组合 full 仍待原集成员/原窗口。** 本轮没有新增 full 或等位者，不拿本轮定向、旧6167/6177或诊断绿代完整准入。#37→#20 同文件顺序及 #41 完整来源保留；#39不关闭，集成员仍需沿先合结果处理组合、核最终受测树。

## 安装、迁移与未完成验收

由原集成员核本轮公共＋私有组合后，各项目原 owner 在各自目录安装精确上游版本；STS2 不安装炉石、不修改其原实例/当前开关或读取其工作树。炉石已自建实例的最新架构事实取代早先“保持off等共用安装”的旧交接，升级/去掉兼容补丁仍由炉石原角色办理。相同 kit SHA 将同步 #20 与炉石 #24。

在启用机器级重任务前，各 owner 必须约定同一共享目录/兼容协议，并在自己的自然边界部署对局启动声明、用自己的原入口补报既有游戏/旧任务，再启用本项目申领。未声明/尚未接入的项目不会被跨仓扫描，不宣称其游戏已自动纳入容量。旧队列任务先自然结束，不复制/重解释其活锁；保留旧记录。协议/身份损坏失败保留，不降回本项目独占队列。回退也先停新申领、待执行任务自然结束，保留全机槽锁/对局记录与原证据；不能删除活锁文件或替其他实例关开关。

公共改动14份源/配置/文档清单及SHA见inputs.json：.agents/board.yaml、AGENTS.md、两份架构/流程文档、ops/agent_board.py、ops/board_heavy.py、ops/run.sh、ops/launch_runtime.py、ops/launch_environment_audit.py、三份ops测试及两份agent测试。私有改动8份（README、协议文档、board/heavy/machine、三份测试）；watchdog/area主体未改。

本轮没有改 main/live/STOP、真实共享资源目录、生产安装/注册/控制、账号/共享环境/ops prompt 或其他会话；未跑play、未pin、未修改游戏知识。发布/首局读回、真实跨项目申领/对局状态、自然派发/送达/回收仍由原角色验收；技术交付不替这些未完成项。

已实读集成员新架构接续及 #40 最新合同：#40 来源8f09b8426/候选c255682f5尚未合入；本轮没有把其旧 kit 临时合同当新协议证明。最终与 #40 精确组合须保留 #20 的 ablation/cost 入队、新 combined 由 driver 恰好入队一次、旧 live 分支保留外层 learner 入队，并重新核组合。该集成验收继续由原角色办理。
