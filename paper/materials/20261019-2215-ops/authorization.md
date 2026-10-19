# Roy / Claude 2026-10-19 21:5x 恢复运维与学习调度授权

本事件取代退役/暂停期间禁止新调度、禁止恢复 live 的旧阶段限制。依据 main 7089960de docs/v6-plan.md 第9节“恢复运行与上线安排”及当前 watcher 用户指派。继续原 ops 线程 01a1517b-e200-7c52-b463-6ea22220c0a9、codex1，gpt-6.1-sol / high；原 Herdr hosting 与自动学习/完成回收链恢复，不另建 watcher 或计时器。

1. watcher 恢复原 cron；因 ops_current.py 在 live 缺失时不能唤醒，先用原 worktree_checkout.restore_checkout 恢复冻结旧 live 分支供清单读取，原分支不重设、知识不覆盖、不开局。请 ops 沿原 live-merge.lock 核旧 live 与 main 的知识差异和保留证据，再按授权从 main 重建 live，V6 开关全关。按 W9 在新 shell 加载 /home/dw/.config/nova-game-agents/environment.sh，核 run-config；不打印/日志/提交 key，不用自费 key；Jev typesafe/jev-1.14 Decisions、DeepSeek deepseek/deepseek-flash。
2. 接管学习闭环：V6 核心构筑卡/小脑记忆草稿经学习者正式发布任务 v6-knowledge-publish 转为正式知识，核消费者读回。该模板当前未找到，应准备任务要求再经现学习者启动器派发；ops/watcher 不自行写游戏知识。父要求未因报告完成关闭。小脑 R2 85 标签、0 数值，244=80 partial+163 text_only+1 disputed，仍未完成。
3. 校准已在跑，禁止重复派：batch v6-boss-calibration-host-resume-20261019-2058，线程 01a1543d-cd65-7da1-b132-4c3c3216fcf2，WT .worktrees/v6-boss-calibration-resume-20261019，checkpoint 03cb9f2 原217/1316，冻结生产9f424551与原split/seed。宿主状态 .artifacts/v6-calibration-host-resume-20261019-2058/host-state.json。最近22:10 completed776/1316，result.status=running而非最终。完成后核四门槛及逐Boss对旧表7e1193c，再按原流程更新Silent可信度表与通知。
4. 核心卡第二轮已派，禁止重复：batch v6-build-cores-r2-20261019-2135，线程01a15463-18da-7d93-b200-6d871dce7e0a，WT .worktrees/v6-build-cores-r2-20261019；scratch learner/runs/20261019-213900-5b7ee95d-f27f-4d0a-a7eb-459d7d47d92e-v6-build-cores；最近尚无result。产出仅scratch/pending，需核实际产物覆盖后继续闭环，不热改在途树。R3由Claude另线安排，先核已有批次/owner，不复派。
5. 目前保留 ops/STOP、Regent暂停，watcher不开局。校准完成、计算资源空出后，由ops沿原流程移STOP，Silent A10 V6_BUILD=shadow健康检查2–3局，只验耗时、覆盖、未知、故障、触发；后续合入下一局自然生效。开局后后台各任务nice且≤4进程，现校准pool有自动降档。健康通过+W5合入+正式知识发布后，必须再由Claude/Roy确认才切on，登记V6 release与规则变更通知。
6. main10936edd3已交付冻结历史包、跨方向配对、路线血量与空闲预计算；接口 paper/materials/2026-10-19-v6-w3-runtime/interfaces.md。watcher随后补W5/W7共用生产请求工厂（实际局面+冻结包→V6ProjectionRequest，add/remove/upgrade/heal/potion资源改动），本事件不代表该工厂已完成。main f7580b3f5为W1.2+W2.2原子集成；两项全检通过的范围见各report。

请先把以上纳入 notes/ops-current.md 当前清单，回执实际接管、原生账号/home/model/effort/thread及恢复任务，不把排队算送达，不代填watcher/Roy确认。旧lost状态不得当活进程或无条件重启。保留原owner与原checkpoint，活动校准/学习树不回收。完成开发树按原retention流程核main/live后回收可重建副本；不删证据原件/经验/账本。
