# 经验批次20261005-121301完成及修复完整补测

核对时间：2026-10-05 12:50 CST。

- 固定学习者源7cff846db518f2d505f471e2fccd185ab7724c93仅改静默experience.json；实际合入103fd5ff1d7e592a6ab1b1817e1188b5747fba9c，发布a6900b81adb92a0af2a9a1e9d1b95d853a3cd377、S1.exp14，均为live祖先。main只同步这一不可变完成提交，保留既有S1.fix14、全部历史与三项刷新数据，不合移动分支头。
- 经验.13→.14：新增1、更新12、退役0，active70→71、25785字符；A8/A9各66条22403字符，实际样本0。证据1LMBFGSMCWKU A4及十六局此前静默，药水勘误10瓶取得/9次使用，未新增用药规则。第十四次changelog原样归档312行。
- 15项台账经ledger.py/by=ops追加shipped，归档15proposed+15shipped，ID：silent-0005,silent-0013,silent-0091,silent-0006,silent-0017,silent-0007,silent-0010,silent-0011,silent-0072,silent-0068,silent-0090,silent-0021,silent-0019,silent-0020,silent-0092；0089模型修复不在本经验范围，已有S1.fix14状态保留。检查：/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 92 item(s), 0 problem(s)。不改经验正文或补机制/打法知识，不另设审核。
- 自测源tsc0、167文件1961例，合后tsc0、168文件1964例；首次额外CHARACTER=silent导致41文件158例环境失配，回退保留刷新后恢复源自测环境，完整重跑一次通过，未改代码，全部失败历史保留。
- 本轮独立完整外部检查归fix-batch 20261005-121301：固定live 103fd5ff1d7e592a6ab1b1817e1188b5747fba9c，树277d9eb82a6321ddcf5458dc7ccd6f6bbbf3e2bd，tsc/vitest exit0，219文件2772通过/2跳过，总2774，开始12:36:59、耗时432.33秒，日志`ops/codex-ops/learner/20261005-121301-fix-batch.fallback-277d9eb82a6321ddcf5458dc7ccd6f6bbbf3e2bd.checks.log`。该树包含本经验源，main代码/知识与此固定树相同，发布仅记录变化，不重复自测；经验独立完整检查事件尚未到达，按后续事件归档。
- 无Dai待定事项，不改配置或停对局，不处理未到达批次。论文数据随后刷新，本轮仅登记学习者的已完成产出。
