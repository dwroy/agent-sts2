本批四项均为已授权纯运维修复：broker在执行前预留回执容量，保留请求及结果，持久化失败隔离后续队列且不自动重放动作；autoplay在终止标记无法持久化时保留退出码并显式退出；JSONL在旧尾行缺换行时保留旧字节、追加独立新行并审计边界偏移/SHA；普通通知ACK先验证原角色、来源SHA和阶段，仅登记真实回执而不查不存在的父要求。

原学习者 merged=null/state=failed/rc=0、八处全分支合并预检冲突、临时TS初稿/夹具失败及去修复失败均保留。仅取四源码提交；现有回收机制、知识刷新、角色差异和并行记录保持。策略类、双boss异常、历史无stderr通知以及上游沙箱竞态不作完成。

源码撤回须沿本批 integration.json 的四个实际 live 叶子从后向前 revert（672e→9b072→db072→a136对应实际叶子），再测后按原实例集成；不reset刷新/历史，不回退别人的对局或学习成果。不改游戏规则、模型/账号/权限、prompt、发布号，不推送或重启对局。当前运行进程保留；新运维入口/下一控制器正常启动时加载源码，不冒称所有既有进程已热更新。

实际宿主完整检查完成：Test Files  411 passed (411); Tests  4287 passed | 2 skipped (4289); Duration  743.08s (transform 14.79s, setup 23.77s, import 74.84s, tests 1327.36s, environment 46ms)；详见host-check-acceptance.json。
