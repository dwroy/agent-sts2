Roy 2026-10-18 19:39 CST授权 / roy-20261018-regent-adapt。

按Roy19:39批准沿原retention归档已结束超过48小时的过程副本，净释放28.227GiB，根盘普通可用160.332GiB。18:14至回收前净写速3.813GiB/h，扣回收校正后-2.580GiB/h，均为共享根盘净值，df另含并行写入与回收。单nice19/ionice-idle压缩worker，原锁逐文件SHA/解压读回、原路径恢复及真实audit-selection输出一致；另4组扫描/索引经Git消费者读回。≤100GiB禁新大提取/研究/通道，≤60GiB自然局末暂停下一局并告警；regent仍暂停，须≥200GiB、实际净写速可撑48h及Claude明确指派。19:37并行记录冲突保原件，未重dataset或合入，状态见普通收尾处置回执。原日志/知识/账本、当前局/worker及未完成研究保留，无新行为号或父项关闭。证据paper/materials/20261018-1937-ops/。

提取与过程JSON恢复：查 verified-manifest-index.json，以原路径检索manifest，再运行 `nice -n 19 python3 paper/materials/20261018-1937-ops/restore-compressed-copies.py.txt --manifest <项目内manifest路径>`。原恢复器拒绝覆盖变化文件，校验归档、成员及SHA。扫描副本归档清单见 scan-reclamation.json；恢复运行同目录restore-ops-copies.py.txt --manifest <项目内manifest路径>，只投影缺失的原SHA成员，拒绝覆盖变化文件。所有大归档在原retention/storage忽略目录，Git只收精确脚本、清单和回执。
