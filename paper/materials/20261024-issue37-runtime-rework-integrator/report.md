# #37 实际组合核验：未通过

#37 本轮 full 未通过，退回验证返工；唯一检查锁已独立核释放，窗口接 #20。

实际 R433＋已部署宿主冻结树 a0736855cb204bf579b264b40441db3936192eee，本轮 full 17:10:01–17:33:49：673文件、6585过、13败、2原跳，rc1，两tsc0。原始JSON SHA 8b699fe607a09a986242f07ba13155529d65603a43ea3c3421f951d5510cd6ed。2763输入/1417依赖字节与验证tree同；index字节变但write-tree仍13079fcf68ecf105886c75a01d8d334d9084ac47，字节变原因未定，不冒全部字节同。worker已退，检查锁另进程非阻塞实际取得。

13败分账：11项 paths.test.ts 的 process.chdir 不支持来自本角色误设 --pool=threads，属检查器错误，不归开发；改 --pool=forks 对原冻结输入三文件复核后，paths全过，合计69过/2败。另两项稳定复现：
1. external-strategy-evidence.test.ts:109：published库已含 silent-brain-act1-rest-smith-resource-proxy 外部条目，retrieveStrategies按合同添加 evidence_summary/limitation_notice，原字段逐项不变；测试却将其也套入“自有经验逐字节不变”。请用固定数据分别保自有逐字节与外部提示/独立分母断言，勿倒覆R430–R433库或删除限制提示来过测试。
2. run-plan-merge.test.ts:480 “the real client reads the run plan from the answer, or from its own object after it”：stats.deepseekCalls 预期1、实际0。forks同名复现，根因仍待定位；请保实际请求/计划合并断言，不放宽为0。

复现工作树 .worktrees/integrator37-runtime-rework-20261024-1707 保留，三文件复核原始JSON SHA cabf90011047c00ca14ed49a9d030a692c06e0f6b22fd5851a790dc2360f0347。在该树agent目录，用 PATH含 ~/.local/node/bin、nice19、node node_modules/vitest/vitest.mjs run --pool=forks --maxWorkers=1 --no-file-parallelism tests/paths.test.ts tests/external-strategy-evidence.test.ts tests/run-plan-merge.test.ts 可复现两败。完整配方、冻结输入与诊断在 .artifacts/integrator37-runtime-rework-20261024/，核验 paper/materials/20261024-issue37-runtime-rework-integrator/。不编辑本轮原件；新修复另存。开发端full0，避免与#20唯一窗口冲突。

本轮测试增量未合main，九产品叶仍未发布；不重启旧publisher。full期间live有72叶自然知识刷新，原469冻结不改写，后续须重冻实际知识并保持R430–R433/刀刃新版/新增四条。091302 source=null/原failed/净12/.2排除，原16通知ACK/自然采用、真实24h、39/43及科学父仍待原owner。

首轮定向7过1败及两次8过复验均保留，见各state和原始JSON；不得以之后通过覆盖首轮。
