[dev #68] 已按6396081585锁边界实现：第二处full不在已持L内排队，改由 `board_heavy.source_lock(root)` 在进入原with前申领/复用机器位。

原 `fcntl.flock(lock, LOCK_EX)`、源码见证/pin/full/结果的整个L作用域保留；子检查继承机器租约、唯一full锁及L的FD。初次检查是queued_argv外包“唯一full锁→L→原bash命令”。已有受管祖先经真实kernel FD/record/boot/父子核同后复用；若祖先已持learn/game/K/L而尚无机器位，写前拒绝并留给无锁原source-check owner接续，不持锁等待槽。67纯运营/K1/D1早返回不改。

已通过新增资源/映射/元数据47个固定项（含原minute入口9项），另与原源码补测和报告回归组合57项通过；真实Node父子四FD继承与双方退出/四锁释放另核，不冒生产影子或最终组合full。两处窄hunk和run.sh外包待67固定提交后逐差量对齐，保data_launch前缀。
