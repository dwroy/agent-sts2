# 永冻首次能力格挡修复运维交接

任务20261007-014302-fix-batch，来源fix-queue-v4 2026-10-06 11:33、账本silent-0172；独立机制0173保持原shipped/S1.exp42。
源码157d635cd9e9880d7396e76a15594c6e7f0b0253（fix-batch-20261007-014302），实际live代码da3250d3646a0530b0febe14e8a1a18766567e76，固定发布ebd920b46668fc63babae6a79359d926d3c620ad，唯一eval S1.fix39。

请据fix-done完成事件核实实际合入及版本，再经learner/ledger.py/by=ops仅将silent-0172登记shipped，并追加实际live/发布提交去向。学习者仅追加proposed和源码提交。0172 first_run=25226ZFLNR1J/A10、prior=no、claim/evidence/原历史均保持。0173 first_run=10GPK5XGHCK3/A3、prior=yes及旧shipped/S1.exp42完全未改，不混登记。完整沙箱外tsc + vitest由本批调度器补跑；此处只声明沙箱套件通过。

证据25226ZFLNR1J SILENT A10 F29 T1首次Footwork 0→7挡；PJ2LL9KU7FHD SILENT A10 F17第3次T4首次Phantom Blades 0→7，敏捷药水后两防御各7，共21抵21、57HP不变。测试夹具为这两局18帧，固定知识和模型数据；不依赖刷新的knowledge。跨帧、续行、日志回放、SL重置及跨回合rollout携带首次触发状态；续行不重算已有格挡。历史不完整/计数缺失/跨过未观察回合时不给未验证奖励，重放触发显式列未知。未验证重复触发和整场转胜，不添加自己的游戏知识或策略。

最终撤掉6处生产接线及推演源码后6失败6通过/exit1；恢复新12例及相关3文件28例通过。源码与合后沙箱tsc0/vitest0，各211文件2266例首轮通过（若发生超时重跑，以live-merge.json为准）。初稿类型导入、断言字段及抽牌夹具错误、第一轮红5失败和最终红6失败日志原样保留；未把初稿失败报成通过。

锁内先提交刷新0f256b60287f52305c0d0b7dbe1f75b00851822c，合前0f256b60287f52305c0d0b7dbe1f75b00851822c，incoming knowledge为空、重叠0，知识所有blob保持，无生成器改动不重建。合入无冲突，live后台notes未覆盖。9个修复源码/夹具/测试blob与已测发布完全相同；gitleaks源码/刷新/发布均0。铁甲与无遗物数值保持等价，不修改保血、留药、时钟、路线、休息、SL策略、选项过滤或最优/并列规则。

127项旧修复逐项提交见already-fixed.md/json；其余mod自愈与缓存实测证据不足、boss性能太大及策略事项见skipped.json，交调用方处理。队列未编辑；git合入的队列历史仅来自授权main基线。工作树干净，不停对局、不运行play、不推送。源码、红绿、沙箱、刷新、合入、上线记录、eval版本、账本核对和原历史均保存在本任务目录。
