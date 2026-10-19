# 稀疏工作树和只读工具共享

Roy 2026-10-18 批准磁盘治理第4项。继续使用原 `ops/worktree_checkout.py` 的稀疏分配，历史paper/raw/materials/experiments不展开；当前STATE/决策与学习账本仍保留，原Git/主目录历史不删。此项不把已有数百历史目录直接判为可回收。

新分配结束前调用 `ops/shared_tools.py`：Node需目标和provider的package.json/package-lock逐字相同、已安装包锁元数据相符；Python需相同requirements及已安装版本/解释器元数据。记录实际Node ABI/平台/架构、Python解释器身份和锁SHA。只有同机原工具provider可共享；没有自动安装或复制依赖。不同锁、未知安装、外国链接和私有依赖副本都拒绝覆盖，交原owner处理。

共享的是原provider工具目录；不chmod正在运行的provider，不共享可变知识/日志/账本/锁/队列。学习者的实际Codex文件系统规则把存在的两种工具真实路径设只读并保.env屏蔽，不添加不存在的glob路径。Vitest生成缓存落本工作树 `.cache/vitest`，不会写共享node_modules。ops宿主仍遵守只读工具约定，不能通过宿主绕过来安装/修改。

旧闲置树可先由原owner核租约，再显式运行 `python3 ops/shared_tools.py <本通道root> <tree>`；不在本次实现里扫描或热改活动工作树。原恢复/retention继续保护原件，修复/合入由原ops处理。
