# #20 上线检查优先窗口

Roy 2026-10-22 批准补充需求 3。沿原 issue 分支快进 main `2bb0a9cffafa568858a3b7a62311235b6bc61adc` 后实现，保留开发并发上限 10。通用引擎在私有 agent-board-kit；STS2 仅追加原队列读取配置与协作说明。

原 stall tick 直接读取 ops 既有 `paper/materials/*-live-ops/checks.json`，包括等原内核事务锁的 queued、等待原检查退出及 running；核 runner PID、内核启动时间与非僵尸状态。窗口日志只记提醒送达，不另建发布队列。旧终局、缺文件与退出/复用 PID 不冒在途；损坏或身份读取失败保留本轮动作，不发送释放。

同一连续窗口，每个原登记开发会话及集成员各一次一行暂缓提醒。queued→running、重叠检查不重发；后来加入的会话可收到。忙碌会话沿原 idle/done 门排队；窗口内集成员核验派单保留，开发/集成等待不算停滞，ops 接续正常。终局后仅对确认收到暂缓的同一会话各发一次释放；未送出的暂缓作废，不冒送达；不确定回执沿原显式 resolve，不自动补发。每 pane 每 tick 至多一条，提醒不杀进程、不发信号、不替用户开停测试。释放不等于检查通过或已经发布。

## 固定验证与现场回放

- kit 原 59 项与新增 13 项，共 72 项固定测试通过；覆盖排队暂缓、结束释放、无队列无提醒、busy/done、窗口/会话变化、uncertain/retry、集成员排后与等待不升级、dry-run、PID 复用/僵尸及安全路径。
- `replay-fixture.json` 引用 09:37 原现场路径/字节/SHA，原 PID3113069/start5712502、09:29排队和09:37资源门终局保持；原重建/tsc/full 未启动，不改写为源码失败或通过。`replay.py` 仅固定假 gh/herdr/内核读取，结果见 `replay-result.json`。这是修后反事实回放，不是当时已发送提醒，也不保证纯提醒消除一切并发竞态。
- 本轮 tsc 退出0；导入预检最初因稀疏检出缺旧 #29 fixture退出1，按 HEAD 精确恢复后退出0，见 `sparse-precheck.json`。源码未为测试改动。
- 完整 Vitest：待终局后登记。启动前只读核原 #33 检查已写终局、无上线检查队列且无其他 Vitest，见 `pre-full.json`。nice19、单 fork、无文件并行；没有干预 #33 或其他会话。

## 集成与运维接续

安装须同时带 kit `board.py`、`watchdog.py`、新增 `release_window.py`，及固定测试/README；精确提交、源码 SHA、全检终局与扫描见交付清单。保留当前生产 on/off、host registry、原 journal 和 uncertain，不清空旧状态，不新增 cron/daemon/ops prompt。STS2 在当前主运行根读取原回执；新增发布驱动仍沿该回执约定，路径/状态改变时同步配置。

技术交付不替代原 ops 升级后的自然 stall 首次暂缓/释放实际送达验收。若回退，沿原持久 off 入口停用派单，保留 journal/控制/登记与待办，不能用旧引擎消费新增待送窗口事件。开发未改生产开关、main/live/STOP、其他会话、游戏或学习知识；无行为发布编号。
