# 运维会话交接单

运维会话开工前和每轮学习闭环开始前先读这里。**主会话**（和 Dai 讨论的那个）还在做的事列在“进行中”，这些运维会话不要重复做。主会话做完一项就从这里删掉。

## 进行中（主会话负责）
（无：9 局复盘已写完并提交，交接完成）

## 交给运维会话的
- **A8 窗口（Dai 2026-09-29 21:26）**：jev-sts2-v3/.env 的 TARGET_ASCENSION 已改成 8。现在这局 ULQPBK1211FG 还是 A9，从下一局起打 A8，**打满 20 局 A8**（以 runs.jsonl 里 ascension=8、且在 2026-09-29 21:26 之后结束的局计数）。
  - 这 20 局里赢了也不要改 TARGET_ASCENSION，胜利照常提醒 Dai。
  - 满 20 局时在会话里通知 Dai，附上这 20 局的平均层数、各阶段通过率、胜局，并和 V3 在 A8 的 10 局（09-29 03:58 的对比报告）、以及 A9 的 41 局并排比较；之后**对局会自动停止**（Dai：20 局完成后就停止游戏）：独立脚本 ops/stop-after-a8.sh（日志 ops/stop-after-a8.log）在第 20 局开始时创建 ops/STOP，autoplay 打完这局就退出。停下后不要重启 autoplay，也不要删 ops/STOP；卡死检查看到 STOP 会自动返回 OK。
- **知识库一视同仁（Dai 2026-09-29）**：攻略（ironclad-guide.md）、DeepSeek 手册（ds-handbook.md）、Jev 提示（jev-hints.json）、代码的卡牌参考分（card-value.ts 的 TIER 表和角色分类）、boss 笔记，和经验库（experience.json）一样都算知识库，不区分来源，只分新旧。每次更新经验库时，同时核对这些内容：和我们的复盘数据冲突的，改成数据版本（写明局数）；数据说明无效的就删掉；还没有数据覆盖的先保留。改动记在 paper/materials/experience-changelog.md。
- 给 DeepSeek 和 Jev 的提示里加一句：攻略或手册和经验库、实测数据冲突时，以数据为准。这条算小改动，随下一批修复一起做。
- C 批已于 16:45 合入 v3（54d6d9e，1036 个测试全过）。step1-bugfix 已空出来，fix-queue.md 里还开着的条目（从“From the route-review work”那一段起）归运维会话的下一批修复。
- 上面“进行中”清空以后，学习闭环全部由运维会话负责。
- fix-queue.md 里还没被派出去修的条目，归运维会话的下一批修复。

更新：2026-09-29 21:26

## 运维 codex 待合入（2026-10-05 05:57）
- 经验批次`20261005-053531-experience-update`：提交`4f429c0c7ff6b3eda9046781d64341f2e1943243`（exp-silent，经验2026-10-05.6）已自测tsc 0、145文件1888用例通过，因decision-log冲突由运维兜底；本轮先机械同步main并归档第六次增量，live仍待合入。交接在`learner/runs/20261005-053531-experience-update/handoff-ops.md`。
- live的`ops/live-merge.lock`正被`20261005-053531-fix-batch`使用，本轮非阻塞取锁失败，不等待；已用`learner-merge exp-silent`白名单动作发送新合入兜底事件。下一轮该事件到来时，按不可变提交`4f429c0c7ff6b3eda9046781d64341f2e1943243`处理：保留双方decision-log及刷新数据，锁内合入、跑固定沙箱入口；通过后登记新eval版本、同步main，再经ledger.py以by=ops登记`silent-0006/0007/0017/0018/0019/0020/0021/0036/0046/0053/0054/0055`为shipped。本轮这12项保持proposed。完成时在本节后追加已处理状态，保留历史。
- 本轮没有复盘或新纯bug，不改经验内容，不另设审核；合入后完整沙箱外检查缺少补跑动作的既有请求仍在收件箱，待后续回报处理。

- 2026-10-05 06:04 已处理上述待合入：固定提交4f429c0c已于锁内合入live 2398da63，tsc 0、沙箱vitest147文件1892用例通过；c4c7ad97登记S1.exp7（经验2026-10-05.6），12项账本经ledger.py以by=ops登记shipped、check55条0问题，main正在同步同一已测内容。本节保留为历史，经验合入待办已完成；完整沙箱外检查等待后续回报，既有补跑请求保留。

## 运维 codex 待提交 live 合并（2026-10-05 07:08）

- 批次`20261005-063057-experience-update`，固定源`0d469a227c080f8dd460e40352ee10dfee3770b2`（exp-silent，经验2026-10-05.7）。本轮main已集成源经验并随本节归档第七次增量、17项proposed和自测；不另设内容审核。
- live当前HEAD=`9e0fda2e5057e199b05e2b55397499518f12fe52`，MERGE_HEAD=`0d469a227c080f8dd460e40352ee10dfee3770b2`，暂存树=`c603f398ef5152b6e50dbdd83fedd37cd9e1af0c`。这是本轮运维发起且已解完decision-log冲突的未提交合并；11个暂存文件包含经验与源历史记录，已逐文件核对，保留刷新数据及既有S1.fix5/S1.fix6。没有未暂存live改动。请勿当作其他学习者的冲突盲目abort或reset。
- 固定沙箱入口tsc 0、150文件1901用例通过，日志`/tmp/sts2-exp7-live-sandbox-tests.log`，原始摘要已归档本批fallback-checks.md。临时脚本的CSV CRLF检查已改为`git -c core.whitespace=cr-at-eol diff --cached --check`；被它误拦前完整沙箱入口已成功，未重跑。当前锁被其他任务占用，本轮不等锁。
- `bash ops/codex-ops-do.sh learner-merge exp-silent` exit128、输出“（超过 30 秒，已终止）”，尚未确认兜底事件入队；`learner-status`同样超时。收件箱及for-dai请求在锁释放后补一个manual事件。
- 下一轮先非阻塞取得`ops/live-merge.lock`并确认没有report.py/知识刷新。若HEAD、MERGE_HEAD与暂存树均仍等同上述值，可用已通过的相同内容检查，运行`nice -n 19 python3 /tmp/sts2-exp7-fallback-live.py --resume-tested`（文件仍在时）；它会核对树、接受CRLF、gitleaks扫描、提交合并并登记S1.exp8。若代码或数据已变，重新核对并测试后处理；不要合移动的分支头。实际live提交后同步main、登记eval版本，经ledger.py以by=ops将下列17项shipped并刷新论文表。
- 待登记：`silent-0005,silent-0007,silent-0006,silent-0019,silent-0020,silent-0021,silent-0057,silent-0011,silent-0030,silent-0046,silent-0053,silent-0050,silent-0058,silent-0024,silent-0059,silent-0060,silent-0025`；目前保持proposed，未登记shipped或S1.exp8。完整沙箱外补测动作缺口的既有请求仍保留。完成后追加处理状态，不删本节。

- 2026-10-05 08:02 已完成07:08待提交live合并：源0d469a22锁内保留新自动刷新、固定沙箱150文件1901用例通过，合入0f34d1c43820371749920bde8e378b598f67fa33、发布fe4b466fc17a9bd41a3b1d1a2b82c5d389fd0de1，登记S1.exp8及17项shipped。随后本轮源267128cd经验.8也按同一流程合入972303c55c0b1ab55453c8f44d967ccf5f53a3f6、发布62faa08a848fa97d38c810dd1294e2511db17dfe，登记S1.exp9及16项shipped；两批已机械同步main 446fd6c406c8763b3fa9872da14e1feb0f753537，原待提交交接完成，保留全部历史。旧/tmp恢复脚本不得重跑；完整外部补测待后续事件或既有权限请求处理。

## 运维 codex 待合入经验第十次增量（2026-10-05 09:44）

- 批次20261005-085844-experience-update，固定学习者源`c2ece69c8c6d342ab7d55e10d8aca6af1ace25bc`（exp-silent，经验2026-10-05.10）；只改silent/experience.json，新增2/更新15/退役0、active62、19242字符；来源10GPK5XGHCK3 A3及此前十二局静默。学习者自测tsc0、152文件1906用例exit0，检查原文learner/runs/20261005-085845-experience-update/test-exp.log及test-exp.exit。main本轮先集成固定源及第十次changelog、17行proposed，生产live仍为经验.9；不是已上线，无S1.exp11或本批shipped。
- 本轮非阻塞取得ops/live-merge.lock失败（busy），未创建live MERGE_HEAD或冲突索引，不等待、不重试。`bash ops/codex-ops-do.sh learner-merge exp-silent`也超时，exit128、输出“（超过 30 秒，已终止）”；未确认manual事件入队，完整命令与原因已写收件箱/for-dai，请锁释放后补manual事件。
- 下一次合入事件只用上述不可变源，不用exp-silent移动分支头。先非阻塞取锁，确认无report.py/知识构建器及其他未提交合并，保留刷新数据，保留双方decision-log和版本表所有条目（包括已上线S1.fix9/fix10、S1.high和eval-metrics工具）。锁内合入后跑固定沙箱入口；通过再登记新的经验eval版本（预期S1.exp11，必须查重），经ledger.py以by=ops将本批17项shipped，同步main并刷新论文表。`/tmp/sts2-0935-live.py`尚未改live，若仍保留可核对后使用；结果文件不存在时才首次运行。
- 待登记17项：silent-0005,silent-0006,silent-0007,silent-0010,silent-0019,silent-0020,silent-0021,silent-0027,silent-0028,silent-0030,silent-0037,silent-0046,silent-0053,silent-0063,silent-0064,silent-0076,silent-0077。0074/0075代码模型提案不属于本经验批次；0076的first_run/asc字段更正请求只转录给学习者工具任务，不手改旧账本或把旧无抽牌案例计成施毒观察。完成后追加状态，保留本节。

- 2026-10-05 10:01 处理fix-done/learner-checks 20261005-084301：main已同步71e677e2，S1.fix9/fix10实际live发布7efeed50已核实，外部完整tsc/vitest exit0、208文件2747通过/2跳过。silent-0040/0066/0074/0075/0076/0077按对应模型/统计修复追加shipped，登记提交a42a5d9d；其中0076/0077虽已模型上线，经验.10的17项JSON增量仍未合入live，保留09:44待合入任务，下一manual成功后再按经验版本登记，不将模型状态误作经验已上线。未改live自动刷新，不重复跑完整检查。

- 2026-10-05 10:20 已完成09:44经验.10待办及本批.11兜底：固定源a1d6ccc2在live保留ab5218d5的七项刷新blob后合入1b4c4c64c0fc7fd05d36296d038129d5700794bf，合后固定沙箱157文件1939用例/tsc通过；发布536e37d9f86b19ffc7afcfa11d71a41803a7cc09登记S1.exp11（经验.9直接到.11，包含.10，不存在单独.10上线时刻），main同步085d287ba1c55962a7475a456b28ce4581410fdf，两个经验批次合计21个不同条目以by=ops追加shipped，模型bug0078仍observed。旧/tmp/sts2-0935-live.py不得重跑；原.10 manual合入请求已由本轮继承合入完成，不再待补发。完整沙箱外补测仍需白名单入口或有权限执行方，已写收件箱；不改变对局/配置，保留上述所有历史。
