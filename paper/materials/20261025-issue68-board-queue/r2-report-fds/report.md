# #68 r2：后台统计继承资源FD

父交付813c4679d7346093dd4339ab0c59f6380e7ec49b保留。原集成6397167262实证：queued_argv在合法机器租约下复用原argv，background_statistics的Popen却默认close_fds，统计子只保刷新锁；父关句柄后lease/slot早释。独核原件及SHA另存independent-failure-original.json、original-source.json。

最小执行差量仅ops/report.py一处：同时导入resource_fds，并把resource_fds(ROOT)传入Popen.pass_fds。原nice19/ionice/flock-F/锁前准入、环境和session设置保持；disabled仍传空tuple。无其他运行接线、kit/config变化，67共享叶无新差量。

新增真实后台子回归，验证父关句柄后子身份仍活、资源FD在子内、lease/slot均拒绝非阻塞重取，实际子退出后两锁可取。该项在旧函数下失败原件regression-before.log保留。新项目54项通过(project-targeted.log)；生产tsc exit0(production-tsc.log)；原statistics/component usage、report-plan-costs与源码检查3个Vitest文件8项通过(affected-vitest.log)。

独立实际进程探针report-lease-probe.py从完整51c289c十四叶校验安装取固定函数AST，使用实际Popen/nice/ionice/flock，未mock校验或内核锁：real-before.json对应旧固定函数，子1651935/birth见原件、父关句柄后两资源锁可取；real-after.json对应本次新源码，子1652137/birth见原件、两个FD目标/inode/FLOCK核同，父关句柄后两锁均不可取。两子最终rc0、原PID缺席、两锁均释放。夹具与log保留本树.cache/report-fds-*；没有操作生产共享状态，不冒项目shadow/full。

新完整叶冻结delivery-map.json覆盖原30叶，保基线旧blob/SHA/模式并更新本次源像；原813清单不改写，固定旧记录沿Git对象及原目录复用。相对813的实际执行源仅report两行，测试一叶和决策/接续材料另列。完整pin/显式gitlink/config/其余已核字节保持；开发原5900+11沙箱只作原范围证据，本次未重复完整沙箱或原66唯一full，不能把原绿冒为新组合全过。原集成仍按66优先核本新固定提交和实际ROOT/LIVE组合。

安装仍默认关闭，LIVE安装叶0；未改main/live/STOP/生产库/共享声明、账号权限容量或其他会话。不分配游戏发布号。原集成核收后原ops沿已批三阶段继续；可选scanner、67全包或新游戏窗口不新增为本次最小修复前置。
