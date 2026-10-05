# A8首胜复盘归档

- 2026-10-06 03:08 CST：learner-done 20261006-024301/LLYSRQQ35AVW，调度器exit0、学习者success。A8/F48首次尝试通关、无读档；通关提醒已于02:48事件处理，本轮不重复汇报。
- 复盘原文追加15478字节，SHA256 fcaafdbf9c378da883db18b0e2470aeaa28b321b833e4789684008124793016d；回报SHA256 04992e5a88445344e31c9d0018343834a3bdefd369552c9ef2b43d1ed38158f0，完整事件流learner/runs/20261006-024301-postmortem.jsonl。只提交这一个新节及对应账本原行，其他任务输出保留。
- 原账本11项11行：silent-0010,silent-0023,silent-0027,silent-0037,silent-0044,silent-0053,silent-0072,silent-0138,silent-0144,silent-0145,silent-0146。0144/0145/0146新增observed，前8项仅补证、无repeat；0144的learner原标签bug-infra/prior=no/first_run=KAY522KT5NXR原样保留，0145/0146 prior=unknown/first_run=LLYSRQQ35AVW。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 146 item(s), 0 problem(s)。运维不改原标签、经验或shipped状态。
- 学习者报告的新bug位于agent/src/reflex/card-model.ts:815，属于静默猎手升级牌的机制模型覆盖；按学习协议交学习者处理，未发现让本局停止的阻塞证据。现读代码明确MALAISE只在!upgraded入口，记录的对局源码bf63ab40+dirty不作重建；旧0051/S1.fix5仅未升级模型，升级证据不能沿用旧已修状态。0146机制观察与0144代码入口证据分别保留。
- 转录学习者证据：本局A8 F33 T3零能量升级萎靡显示unmodelled，CRUSHER减1力/加1虚弱，意图18→6、7挡覆盖、HP63不变；F38 T1花2能量减3力/加3虚弱；F48 T2花3能量，TORCH_HEAD_AMALGAM力0→−4、虚弱1→5，攻击13→10，TUNING_FORK另给7挡、HP69→66。学习者的最早原帧证据是KAY522KT5NXR A0 F31 T1，未建立受控全战反事实，不把所有推演差额或胜负归因于此缺口。详复盘和原账本。
- 其他学习者观察及“未记录”项保留原文；没有Roy新待定或账本缺失。无本轮ascension-up事件，不新增A8升级小结、版本或上线标签，不修改对局/调度进程。本轮后续运行paper_dataset.py --no-raw并记录结果。
