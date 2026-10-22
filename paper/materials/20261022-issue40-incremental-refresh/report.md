# #40 开发交付：局间增量刷新与短时发布

基线 `d3b2a747453bba3ac6b2488dd518731651f54e98`，分支 `issue-40-task`。开发实现与固定数据验证完成，交集成员 review；尚未合 main/live、未上线。自然对局耗时/持锁、重任务优先级与下一局实际模型读回仍由原 ops 验收，不据开发结果关闭 issue。

## 结果

1. fight-value 续接原 reducer 的稳定 rows 前缀及 open/pending carry，只解释新增原始帧。旧 EOF 暂定尾段可修正；日志轮转/截断/前缀改写、晚到或修订终局、实现/角色/游戏数据变化、产物或检查点损坏时重建，原因落 timing。索引代号跨进程持久化：即使 monster-db 已先重建共享索引，也会使后续旧 card/fight 聚合失效。
2. 每局抽取，默认每10个本角色新增已结束局训练，N可配置；显式空闲边界或 train 可提前/强制训练。首次无训练回执或旧产物损坏时先建完整模型。未达周期沿用完整旧模型；完整拟合三份候选后才发布，拟合失败不动旧模型/gates/报告或推进周期。
3. card-upgrades 改为持续聚合新增见证，保留 Counter 平票顺序、牌面、原 offset/SHA 和坏行；其他步骤沿已有分段/分区缓存。严格旧前缀SHA、monster统计回放、V6包组装等残余线性工作和增长估算见 `docs/knowledge-refresh.md`，没有把这些工作称为已经消除。
4. 所有常规知识输出在候选写完后才经原 live-merge 锁 rename；catalog 候选生成与 fsync 移到锁外，V6原发布检查保留。新增cycle/origin_pid跨队列身份及完整等位/总耗时、发布锁等待/持有时长回执；原 knowledge 锁仍是串行计算 worker 锁，不是发布锁。
5. report 在实际live含driver时只启动一个combined后台worker、不等刷新；live未发时保留旧参数。driver在所有锁之前使用 #20 `board_heavy.py / queued_argv`，角色other，低于ops/integrator/learner。adapter未部署或开关关闭明确单列，不冒生产队列已开启。

没有修改 Jev/大脑决策逻辑、模型公式/训练超参、经验或角色知识数据。铁甲在同一冻结样本下的抽取/拟合保持等价；训练时点也从每局改为默认10局，可能使用旧模型更久，这是 #40 对统一刷新基础设施的授权范围，角色已结束局分母独立，未把 Silent 证据计作铁甲验证。

## 固定验证与限制

- 生产 tsc 退出0。开发不跑完整 Vitest，按 issue 的分工交集成员在最终组合树做一次完整检查。
- 定向 Vitest：11文件、55项通过，threads单worker、nice19；日志 `vitest-post-generation.log`；随后补充cycle/PID追踪的2文件6项再验通过（`vitest-cycle-trace.log`），包含真实shell回执关联断言。原先两组及代号补强前的全定向日志保留。
- 新 Python 固定测试12项：跨多个原合成战斗闭合点续接逐字节等价、晚到/修订终局、轮转/截断/改写/坏rows回退、card原见证与坏行保留、前缀复用、独立局数/idle/force周期、失败训练留旧模型、发布锁边界、heavy适配、main/live不同时发布兼容、跨步骤先重建索引后的失效传播。
- 用原合成证据的8份独立标识副本，得到72行训练样本；两条抽取路径的rows完全一致，再实际运行原训练器（2 trees），model/gates JSON逐字节一致。报告只忽略原有运行耗时行。它验证算法/数据等价，不代表生产模型精度或改善；小样本门控表无选线配对，不冒生产gates收益。
- 旧增量11项、V6链17项、原fight/monster/card/目录/药水/报告定向均在上述Vitest内验证。补充 combo/opening/card/catalog 共54项Python测试通过；精确文件SHA见 `verification.json`。
- 初次Vitest命令用了当前版本不支持的minWorkers，测试未启动即exit1；修正命令后通过，故障说明保留 `vitest-cli-failed.txt`。未安装依赖或修改共用配置。

## 集成与上线交接

改动源文件以 `verification.json` 为准。核心是 `fight_value_incremental.py`、`incremental_evidence.py`、`legacy_incremental.py`、`build-fight-value.py`、`build-card-upgrades.py`；调度是 `refresh.sh`、`refresh_driver.py`、`ops/report.py`；发布是 `refresh_publish.py` 以及各原builder/catalog/V6的原子写入调用。两项测试入口及V6临时fixture复制清单同步更新。文档在 `docs/knowledge-refresh.md` / `docs/layout.md`。

**与 #20 同改 ops/report.py：** 保留 #20 的 ablation 与成本统计队列；combined刷新只在driver内入队一次，不能保留旧report外层队列导致单槽自等。#20未在本基线上合入，未复制其kit或启用其生产开关；实际优先级验收依赖其精确部署。锁规则沿 #38，不另改检查方。

新入口/所有helper和原builder必须完整发布，不能只发shell。启动脚本与下一局决策参数未改；report的后处理入口在实际live具备driver后切换。所有发布文件仍按逐文件原子读取，没有新增跨三文件读事务。

ops自然边界后分列冷缓存、暖缓存及触发训练的局，核每步时长、worker锁/发布锁等待和持有、解码/前缀字节、模型SHA和消费者实读，对比 #40 背景33分钟/960s/460s等原口径。严格前缀SHA仍随原始日志字节数增长，新局持续写入可能让多个步骤重新校验；不承诺仅靠本次改动得到具体生产提速倍数。

本会话未运行play、未修改live/STOP、未关其他会话、未启动完整测试或生产重建；不登记已发布版本，不申请完成回收。回退保留日志/模型/证据与原失败，按文档等原worker自然退出后退回源码组合。
