# #85 schema5现场：迁移与绑定只读对账

依据 [ops 6515894303](https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6515894303)核迁移路径和新增历史。当前无需回拷旧schema4库；已保存schema5库的全部146绑定可保全后前向接续。没有操作生产库写口、LIVE、STOP、PAUSE、保存局或原publication门；没有运行play/模型、放门、重full或重新交付已采用源码。

## 已证实的启动链

1. main reflog显示 `672b7019` 于13:27:29采用。ROOT的store/typed-schema/reader文件ctime同为该时刻；ROOT新store具有schema4→5默认构造迁移。`knowledge-runtime.ts`的launch不在readonly命令集合，执行case之前已 `new KnowledgeStore(...readOnly:false)`，因此普通launch就可能迁移，不需要等K1 publish。
2. 原 `ops/run.sh:110` 从LIVE/agent工作目录执行 **ROOT绝对路径**的knowledge CLI，再启动相对路径的LIVE `src/index.ts`。`--code`来自该目录的git HEAD，故绑定里的 `f6ccd3fcc` 是LIVE消费者提交，不能用它推断writer也来自旧LIVE。
3. 原13:32:50 console首个Node PID是1482327；绑定 `launch:20261030-133250-f6ccd3fcc+dirty` 于北京时间13:32:55.919写入；生产主库mtime为13:32:55.986，本次记录到WAL为0字节。子进程1482465开始于13:32:59.379；run-config在13:33:02.874将该绑定、原K1和实际局号BHG5U9E55SYN连在一起。
4. LIVE旧reader实际字节仍只接受schema3/4，13:33:08首题抛 `typed knowledge schema requires owner migration`，与原故障完全一致。ROOT新reader接受schema5。

据此，导致本次ROOT/LIVE版本错配的具体入口已定位为13:32这次ROOT launch；与父Node1482327、最新绑定和落盘时刻高度吻合。现有库没有逐DDL的PID迁移回执，WAL也已清空，**没有独立的内核级记录证明首次DDL一定由该PID执行**；不伪造首次迁移者的独占证明或将13:39备份改称schema4迁移前备份。源码、ctime、reflog、console哈希、run-config原偏移及本轮只读快照见 `runtime-evidence.json`。

这是本交付未覆盖的ROOT先采用、LIVE后发布的启动边界：原部署文字要求ops先备份再迁移，但默认可写构造器也会被普通ROOT launch提前调用。问题在发布边界/自动迁移路径，不在分级候选或原对局数据。当前应沿原发布门配齐已核兼容组合，不临时热补旧reader、改control或回拷旧库掩盖现场；启动前兼容/迁移防错项保留给主管后续收口，本轮不夹入#84已在途的方法票修复。

## 备份逐表对账

`reconciliation-v2.json` 是最终核查；v1只做逻辑行比较，原件也保留。输入为开发阶段schema4备份（SHA `79ad8d00d41a0728ed9262fe03dedf12994673ff23b97ca402d7c0f918edf5cd`）和ops已保的schema5一致备份（SHA `cf695e9eba118380832a7992bd6fd3ab674f5925b6b63532706e47ba31e88f5c`），均301465600字节，readonly+immutable打开，前后文件SHA未变。

- 42张表逻辑行按全列排序逐行哈希：40张完全相同，仅metadata和run_bindings不同。
- metadata只从schema4变5；current仍为 `K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46`。
- sqlite_master只变strategy_details的建表定义；confidence的NOT NULL解除，策略投影行数据不变，两库null confidence均0。没有已发布#85分级候选的迹象。
- 旧140绑定逐列原样保留，无删除、无改写，新增6绑定均为同一原K1与原LIVE code；两库integrity_check均ok。
- releases16、revisions1993、candidates19及其内容完全一致，不是只比数量。

| 新绑定的launch时间 | created（北京时间） |
|---|---|
| 10:12:01 | 10:12:05.969 |
| 11:03:52 | 11:03:56.855 |
| 11:16:28 | 11:16:34.140 |
| 12:13:40 | 12:13:45.525 |
| 13:04:38 | 13:04:42.893 |
| 13:32:50 | 13:32:55.919 |

完整key/版本/code/时间在reconciliation-v2。末核生产只读快照仍为schema5/current原K1、16/1993/146/19，主库mtime仍13:32:55.986；旧schema4备份不是最新迁移前备份，直接回拷会丢6绑定。

## 保存局与隔离前向证明

保存局BHG5U9E55SYN在run-config中的原绑定是 `launch:20261030-133250-f6ccd3fcc+dirty`；原K1如上，原D1为 `D1-436eaf6e43c5c541aa368ea7878705c9abdcc5a4151f118186f5b1cff8ff93be`。直接只读调用原 `run_key` 恢复算法可找回完全相同的key，没有改配置/环境、调用launch或启动游戏。恢复时继续原绑定，不为采用新候选重绑保存局；新源码/旧K1的恢复局应分账，不冒成新K1自然30局样本。

`reproduce.mjs`仅允许新建本工作树.artifacts目录，对ops schema5备份的隔离副本运行：

- 用实际LIVE旧reader复现完全相同错误；用实际ROOT新reader读取旧K1正常。
- 正常submit→validate→publish原#85候选，得到预期 `K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec`，typed173/null68。
- 再以不同代码标识调用原保存局key的bind，仍返回原K1/原code；所有146绑定逐列无变化，未新增审计用假绑定。
- 输入备份及候选SHA前后不变；只写隔离目录，生产未写。

结果见 `forward-proof.json`。该证明不代实际生产发布、方法准入、分号或消费者读回；本轮没有重复最终组合full。

## 原ops可接续的检查点

保留当前schema5一致备份及146绑定，把它准确记为“LIVE部署前的schema5保全备份”，不称已完成schema4前备份。原#84方法票小批核收后，在既有publication门和原锁序中配齐19叶兼容LIVE、核schema5和旧K1读回，再以原base做正常CAS K1发布；K1候选未变，不需要清库或重新分级。备份schema5后再打开新writer不再执行4→5 DDL，但仍须核实际ROOT/LIVE组合和发布回执。

原ops继续编号、通知、消费者/曝光账本读回与outcome新request单次补算；保存局恢复由原ops显式处置，原门不因本报告自动放行。若实际库/绑定/current较本快照推进，沿原事务重新核对，不套用旧counts。后续源码回退仍需配套schema兼容与完整历史，不以旧140绑定库覆盖当前库。

本轮仅审计材料、readonly比较程序和隔离复现实验，无运行源码改动，因此未新增研发队列或跑tsc/Vitest。两个脚本的实际断言已执行通过；科学父及自然30局保持开放。
