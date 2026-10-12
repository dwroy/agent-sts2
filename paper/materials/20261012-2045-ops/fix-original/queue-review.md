# 队列核对与本批范围

开工工作区干净，先执行 git merge --no-edit main，Already up to date；基线 257c41df88157b59e520232dae1210662b08d8e6。
已读 README、最新 STATE、decision-log 末尾、learning-protocol、learning-code-proposals 和 AGENTS。

前一批完整队列与本次快照逐行比较，仅新增 batch-c-fixed-fixture-timeout 及同树补验通过的限制说明。沿前一批历史索引重新核对 161 个修复来源，全部是本次基线和只读 live 切点的祖先；30 个重点源码/测试路径 SHA256 完全一致。相对前一批基线，agent/ops/learner/builders 的唯一变化为 ops/inbox-dev.md，没有实现变化。逐条提交、来源指纹和当前源码指纹见 queue-commits.json、audit-summary.json、source-recheck.json。此复用不声称重新执行全部历史用例或核实游戏策略效果。

本批唯一新增修改为普通测试基础设施：batch-c 固定 ZY3992X5VEVS F23 T3–T5 回归。使用既有 tests 下日志和固定模型，不读取角色生成知识来构造新夹具；没有引入任何游戏机制。原测试为了完整模拟把预算置为1e9，后续策略求解376次，真实计时仍来自主机；固定工作时钟及原1500ms预算下为76次，仍以多样本覆盖T4/T5，原排名和持续目标顺序断言全部保留，额外限制计算量并覆盖0/10000ms主机计时跳变。源码仅3个测试文件，默认15000ms测试超时、全部生产代码和游戏行为不改。

测试修复不等于证明原17.2秒宿主超时的具体时序或根因；原完整rc1和原单项1731.689115ms补验通过记录均保留。撤掉夹具时钟/预算修复、保留固定模型和新断言后2例失败，恢复修复后2文件4例通过；25例为筛选未运行，不当作通过。详细红绿与固定引用SHA见regression-proof.json。

按batch-c及ZY3992X5VEVS查根账本bug-infra均0项，故不新建或修改账本。机制/策略、具名卡其余入口、量化/全漏斗、缓存专项继续原strategy-proposal/独立任务；没有新的游戏经验或代码提案，不重复登记、不派下级agent。其他缺数据条目保留，详见skipped.json。
