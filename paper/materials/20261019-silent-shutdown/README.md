# Silent 停用与源码归并（2026-10-19）

Roy 授权：所有代码汇入 main，回收 Silent 的 tab、任务与工作树，释放磁盘；游戏保持暂停。Regent 工作树与无关服务保留。本目录记录本次实际执行，不关闭学习父要求、不虚报上线或科学验收。

## 源码

两组已批准的磁盘与知识库分层代码已由 `df21d3b4d` 归入 main；保留 main 的后续修正。直接把旧 live 树合入会回退大量历史资料且出现冲突，尝试已完整 abort；见 merge-live.log。

所有尚未成为 main 祖先的本地分支源码差异均按 HEAD/merge-base 保存为 `sources/*.patch.gz`，索引 `source-index.json` 记录原始 SHA256、路径、refs 与来源。解压后可按索引基线重建候选。未提交的源码另存工作补丁与 `working-source-objects/*.gz`；逐工作树索引于归档完成时汇总。所有原分支保留，待回收树的 HEAD 同时固定为 `refs/silent-shutdown-20261019/<HEAD>`。

这些历史包含被拒绝、被替代和未验证的候选。保存源码不把候选自动启用，也不通过 ours merge 改写未来合并的祖先判断。活动实现维持 main；没有开新研究、启动游戏、重跑 full 或发布新行为版本。

## 资料与回收

`cleanup-scope.json` 固定回收/保留范围。独有的未提交文件、日志和证据按 SHA256 去重压缩，私有原件放在 `ops/codex-ops/retention/silent-shutdown-20261019/objects/`，逐树 manifest 给出原路径、模式、修改时间、对象哈希或主检出的相同原件。压缩对象写入后解压校验原始 SHA256；共享 node_modules 与可重建缓存不复制。干净的 tracked 文件由固定 git HEAD 重建。符号链接按链接保存、不跟随共享目标；入向链接已另存目标并重定向，见 incoming-link-preservation.json。

停止的任务保持原退出码、原失败和原 owner；调度队列事件移到同一私有归档的 retired-events，原调度器保持 PAUSE、STOP 且 cron 已移除。学习父要求和未 ACK 通知保留，不能把取消执行当作完成。原 live 分支与发布号仍保留，工作树回收不代表发布回滚或新上线。

原始进程/工作树盘点、密钥扫描结果与清理回执在本目录。source-gitleaks.json 的 8 个初始命中均为 evidence_key/source_evidence_key 的 SHA256 标识；精确放行这些标识后源码补丁复扫为零。工作源码另行扫描后才提交。
