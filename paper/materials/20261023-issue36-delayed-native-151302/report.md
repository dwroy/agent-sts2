# #36：151302-s2 原生确认延迟

依据 ops 评论 6359677330、6359841317 及 15:29 原件，仅离线冻结和回放两批既有记录，没有重跑模型或修改原事务。原件 SHA、观察结果及定向检查见同目录 evidence.json、checks.json；含完整任务文本的原生快照只保存在本工作树忽略目录 `.artifacts/issue36-delayed-native-151302/`。

二组原监督于 15:13:16.980 已因 `unsent human draft` 退出，原生 task_started 的时间为 15:13:47.628，完整任务 response_item 为 15:13:49.366，比原监督结束晚 32.386 秒。任务 SHA 与原 receipt 的 `055ac5…677ed` 一致。主组同一时间附近才产生 task_started 和完整任务消息，但其监督仍在，成功登记绑定。

现有 NativeBatch 解析器无需修改即可从两批冻结原件各核出唯一 session/turn、原任务完整 SHA 和一条 bootstrap prelude，foreign_activity=false。交换二组 receipt 与主组 native 则拒绝（75）。两批 cwd 严格不同，固定并发候选在文件名两种顺序下也不会串绑。这些证据指向过早退出的监督窗口，没有发现并发识别串绑。原始出错时的 ANSI 屏幕未保存，不能追认当时 text 一定是自身 paste，也不能由之后的空占位反写旧告警。

补丁只改 learner/lib/herdr.ts 的未确认提交阶段：一次 prompt 发出后，屏幕 text 不再立即撤掉原生观察；最多等待 120 秒，严格由原始完整 prompt SHA、marker、cwd 和原生 turn 建立绑定。该阶段只读轮询，不重发、不发按键、不释放/退场。超时告警并保留原会话，仍经原 wrapper 的 300 秒 verify/defer 合同处理；空输入框同样不能无限等待。显式 continuation 每次独立计时，receipt 记录该次 deadline。

绑定后的真实草稿门禁、租约/pane/terminal/PID 检查、外来原生回合拒绝、完整失败/空修复验收和 finished 合同保持。新测试覆盖延迟 35 秒、两种并发文件顺序、缺确认时的 paste/真实草稿/空占位、绑定后的真实草稿，以及等待期间 lease/pane 改变。前六项在旧生产源码下全部失败；修复后含原有 ownership/prelude/reconciliation 的四文件 183 项通过，tsc=0。nice 19，Vitest 单线程 worker；没有 full。

二组冻结原件仅证明原任务已被原生消费，观察时该 turn 仍 open；不是完成、退场或补写旧 receipt 的权限。原 rc75、bindings=[]、awaiting_review、告警及现场全部保留，由 ops 沿原任务处理完成归属。main/live 发布及自然双批验收仍交集成员与 ops，本补丁未改生产。
