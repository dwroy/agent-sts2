# A7复盘、无新增修复与经验 .23 正式补测确认

记录时间 2026-10-05 23:13 CST；23:08三件事件。

fix-batch 20261005-223518 exit0，fixes为空、merged=null源于没有新增修复，不是提交/合入受阻。基线e0b5efd890f5ae997973d379b99c395fff1bb333；99项既有修复/子项经不可变提交核实均为main/live祖先，学习者映射/源码审计保留learner/runs/20261005-223518-fix-batch/。基线固定沙箱tsc0，179文件2030例exit0、无重跑；原baseline-sandbox.log与exit文件已核对。无需兜底提交或合并，不登记新版本/新shipped，不把基线检查冒记新发布或完整外部测试。策略项沿既有独立任务，单次mod超时和缓存命中缺证据、boss模拟性能缺独立基准，均不在运维修复范围，无新增Roy待定。

正式learner-checks 20261005-220458-experience-update与上一轮23:08归档ba729182一致：固定发布256b0eee715750c1851f85274885a0770c85977f/树5a02c2fd115d11fecf795e9759d8d7be8d708d7a，完整外部tsc+vitest exit0、229文件2821通过/2跳过，22:53:41开始530.85秒，原日志ops/codex-ops/learner/20261005-220458-experience-update.fallback-5a02c2fd115d11fecf795e9759d8d7be8d708d7a.checks.log和main/live祖先核实。本轮只确认，不重复合并、测试、版本或15项shipped，旧预检/失败历史保留。

复盘20261005-224301 exit0，3KME36ADUE4U静默A7 F27走廊三虫，三次均23/70进场、前两次判死读档/SL2；末次T4以4血7挡对虚弱后15伤阵亡，理论需损8差4血，实际仅扣现存4、丝虫先被毒杀，甲虫剩38/86。首末1575.844秒/26.26分钟。原复盘与23:02:31追加勘误完整保存：迅捷药水F4取得、F6 T4使用，保留原F6 T1误写；先石后丝随后攻击甲虫不等于杀掉甲虫。旧3737642字节前缀SHA256 56ed26316f4fb8374426d4a1c617982f94efb8eeaea01190a5082c136b8d392d保留，新段SHA256 d32b41b042ef3110cad133e09805bec1c0fcd68b055fd6e3aa8c676cc947799d。

台账7条learner CLI原行精准归档：新增0127 bug-infra（first_run=53FLQ68CETW0/A6/prior=no）和0128 mechanic（first_run=R0HEV5E3QT6G/A0/prior=partly），五旧0005/0019/0020/0021/0046只补support、无repeat或新shipped，check129项0问题。0127是无后继眩晕在推演中沿用当前无攻击的非阻塞缺陷，源码位置1386/1356及两局证据追加fix-queue-v4，交学习者；0128机制观察不由运维处理，不新增证据、状态或打法。回报无Roy待定，修复后受控胜负、替代路线/构筑、召唤孵化总需伤、boss时钟比值保持未记录。

本轮运行nice19 python3 ops/paper_dataset.py --no-raw，结果另追加。只提交本轮复盘/原账本/队列和自身记录、生成论文表，其他批次的changelog与proposed、在线刷新、工作区修改保留；记录数据免代码测试，不停对局、不运行play或派重复测试。

- 2026-10-05 23:14 论文数据刷新完成：`nice -n 19 python3 ops/paper_dataset.py --no-raw` exit0，切点2026-10-05T15:10:28.004Z，五项一致性通过、决策计数差异空、key scan CLEAN；行数{"commits.csv": 2530, "decisions_by_label.csv": 17300, "escalations.csv": 3600, "fight_plans.csv": 1461, "runs.csv": 518}。本轮复盘/7条原账本/非阻塞0127证据队列已提交cddae3a519403ae50eebd3e6baeb118eff4f5ff6；生成组件成本表保留Roy订阅配置和缺价/覆盖未知，不补游戏知识。只提交本轮生成表和自身记录，其他经验批次changelog/台账及工作区差异保留；记录数据免代码测试，没有停止对局或请求重复补测。
