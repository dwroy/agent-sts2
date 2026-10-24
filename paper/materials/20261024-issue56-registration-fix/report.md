# #56 P0 注册锁超时修正

接 [ops 6385006635](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6385006635) 与 [主管6385018900](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6385018900)。基线 `55754e1c4276094bc78856adf05427ac8ce12008`，不改写前两轮交付、退回或旧运行失败。当前材料是开发验证，不冒原214311自然事务或生产恢复结论。

## 根因与修改

原父 tick 持全局 learn.lock，依次做来源校验、创建 wrapper，最后才整体 save_state。已创建的 wrapper 在 learner_entry 前等待同一全局锁120秒；后续大来源校验不结束，原 wrapper 无法看到注册。每轮 eager list(candidates) 又重复验证全部待派源，四道使持锁时间扩大。加长原生/TUI核验时间不能解决这个前置阻塞。

- 原全局锁继续串行化调度、派发和 finish。父进程只在该事务中为每批预持独立注册屏障，监督进程创建后取得真实 PID，先填全原 batch 身份/来源/档位等字段，再原子保存 learn.json，fsync 文件与目录后才释放对应 batch 的屏障。模型入口仍必须取得原保存的监督 PID/出生身份和完整行租约。
- 新 wrapper 只接受与自己的根目录、batch 精确匹配的屏障路径，启动 ready/prepare/learner_entry 都走该屏障；120秒不变。没有受协调新屏障的旧/手动 wrapper 保留原全局等待语义，不通过环境继承伪造新注册。
- 每个外部批次在 binding/lane/policy 齐全后立即 checkpoint；自有复盘在其 runs/attempts 等字段齐全后立即 checkpoint。普通写任务在其调用者补完元数据后 checkpoint。后续保存其他批次不会改写已经放行的 batch 行，避免整行租约变化。
- 外部派发改为按空道惰性挑选，不再为每道 eager 校验整个队列。一次原事务内缓存每份已验 source 的 metadata/spec 与依赖文件身份；每次命中先核 dev/inode/size/mtime/ctime，变化就按原 SHA/来源/隐私/版本合同重验。返回 binding 独立复制，避免筛选污染缓存。事务结束即丢弃；wrapper 另一个进程仍独立验证源，不带入父缓存。
- 四道与自有独立、同道退役、额度与实际tier分账、磁盘/沙箱/未送草稿/retention 门均保留，不修改已在途行、不增超时或权限、不增模型或调度器。

## 固定验证

新 `test_learner_registration_pipeline.py` 通过实际父 state_lock / cmd_tick / check_jobs / dispatch / start_learner / wrapper / learner_entry 路径，在固定小来源、假CLI、隔离 checkout 身份和假 finish 下派一批自有＋A/B/C/D。全局锁全程仍由父持有，每进入下一个来源校验前就要求所有已派 wrapper 观察到完整持久注册，单次等待上限5秒（实际原门120秒），同时核原 PID/行内容一致。该测试用顺序观察控制固定子进程负载，不调用模型、生产调度或真实游戏。

补充固定检查包括：未完整 external metadata 不能释放屏障；父持久化失败不伪造注册且收回自身屏障；同一窗口四个选中源各验一次、binding副本不互相污染；冻结源发生变化和下一事务必须重验；原手动全局注册屏障与超时拒绝仍通过。夹具搭建中出现的 Clock mock、固定磁盘 snapshot 字段、fake git PATH/checkout 可用性及spy计数问题均在测试布置修正，不冒生产根因；早期调试原文保留在原开发会话，最终固定回执另存本目录。

源码冻结和完整检查回执见同目录。 最终生产tsc/沙箱脚本退出0；632文件、5845项全部通过，单独paths 11/11，相关Python 445项全部通过，冻结9叶SHA逐件一致。完整脚本两阶段stdout另提取为vitest.json/paths.json，原文sandbox.log保留。旧额外 broad tools 的52诊断非绿记录不重写，本轮不将其冒记为通过。

## 发布与23:30兜底

1. 由原 ops 等21:43原自然 tick 退出/退锁，逐个核214311等 wrapper 是否确实未启动；保原注册、rc、错误、pane、草稿与输入/世代，不改成模型完成/原生退休失败，不补写在途行。
2. 集成员精确核新组合并在23:30前合入；父模块、新 `learner_registration.py`、wrapper、来源模块及相关调用必须同组合安装。原已载入内存的旧父 tick 不热切；新自然事务才采用屏障。
3. 原队列按原零模型启动、失败/租约/世代门续接；不强tick、重学已有211311产物或以另一模型掩盖。自然读回每批注册时刻、wrapper过屏障时刻、原生实际ultrafast以及四道+自有槽，源码/固定测试不代运行验收。
4. 若23:30前未实际合入，由原 ops 按主管6385018900回退到 #56 之前的调度恢复原两槽；保最新知识和在途 owner 历史。不擅改截止时间、两小时窗口或声称本开发已执行回退。

本开发不部署、不改 live/STOP、不signal原事务或关闭其他会话；学习、自然吞吐、实际档位和科学父要求继续开放。

提交收尾只移除固定pipeline测试的10行行尾空格，Python AST严格相同；原沙箱冻结保存在source-freeze-tested.json，最终冻结另存source-freeze.json，format-only.json逐行记录可重建原空格及前后SHA。该纯格式变更后单独复验两项真实wrapper测试，不重跑或冒报另一轮full。
