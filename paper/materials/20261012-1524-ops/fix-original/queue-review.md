# 队列核对

main合并基线e52a5a4ac4365d89cbc86366bf9292b358b83667，工作区开工干净，merge main返回Already up to date。
根队列与上一批最终快照逐字相同，SHA及159条已修条目映射见queue-commits.json。已修来源159/159是本次只读live切点祖先，149/159也是main基线祖先，其余沿旧等价集成回执；24个相关路径去重后的23个与上一审计字节相同，见source-recheck.json。旧策略/独立功能/缺证事项保留原范围，见skipped.json。不更改队列，不另派下级agent。

本批新增修复范围仅ops-stall-recovery-test-subprocess-timeout。来源131301-strategy-proposal组合树f1e8a6cda3f1b37f20f78bdf650e0e3ce2a997b9宿主检查4175过/2败/2跳过，原失败decision见根paper/materials/20261012-1411-ops/host-failure-decision.json；没有对应游戏run/floor/turn。当前check使用spawnSync(timeout=5000)，固定延迟6秒可复现status=null；这证明测试预算对该延迟敏感，不证明原宿主两次失败的精确负载来源。

修复仅测试执行器：异步execFile、每子进程10秒上限（测试外层仍为仓库原15秒），原真实脚本/固定决策及控制台时间/告警断言不变。补充6秒启动延迟仍执行真实脚本、stdout为OK但退出9仍拒绝、挂起进程按显式短期限终止三项。exec sleep只留下一个子PID用于超时终止。fixture的curl与pgrep仍是本地固定桩，不接触LLM、网络、生产日志或刷新知识。

撤修复验证仅把执行器及其import恢复成旧spawnSync/5000ms，保留新增夹具与断言。指定新增延迟用例5.011秒失败、status=null、退出1；恢复后1文件6项通过、退出0。对应日志stall-without-fix.log和stall-restored.log，第一次修复验证另保留stall-green-initial.log。未把人为红灯当偶发失败重跑。原生产ops/stall-check.sh、轮询规则、角色行为及知识均未改变。

ledger.py find --kind bug-infra --text ops-stall-recovery无对应项；按检查批131301查询仅找到无关游戏条目，因此不新建或更新游戏账本，无代码提案/游戏版本。

提交前沙箱入口一次通过：tsc0、336+1文件/3365+11用例，共337文件3376例；没有偶发失败重跑。源码95e7f050ef2abe5c85a0367555392652ad73fbfe，仅1测试文件，gitleaks0。

合入在live-merge.lock内执行：等待刷新后知识目录已干净，本批无需新建刷新提交；与分支知识路径重叠为空。合并前live为a1a0e0aa04a131abdb1711aee319742c9c13b423，普通merge产生20个既有记录冲突，详live-conflicts.paths。已git merge --abort并核HEAD不变、原两份脏notes SHA不变，未改知识生成脚本/数据、未运行合后自测、未登记上线/version/shipped；交运维调用方按原完成事件兜底。
