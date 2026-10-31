# 定向检查原件及本地环境补正

记录时间：2026-10-24T18:42:56+08:00。首次13文件114项结果113过/1败，完整原件directed.json及directed-state.json保留，不改写通过。失败精确为check-imports对v6-build-core.test.ts及v6-infrastructure.test.ts两处../../.cache/的new URL目录引用；独立固定夹具在目录不存在时重现相同两项，创建目录后为零项，实际冻结树创建生成缓存后扫描亦为零，见cache-precondition-probe.json。只准备隔离缓存，没有修改候选源码、测试断言、冻结输入或依赖。

首次收尾捕获80961条Git索引时触发Node默认stdout缓冲上限ENOBUFS，原始测试结果仍有效保留。原worker退出且原锁独立核空闲，全部2764输入、1417依赖、tree、索引完整条目/标志及原字节均不变，见directed-terminal-supplement.json和directed-index-forensics.json。修复仅将Git读取maxBuffer明确为64MiB，旧收尾脚本存finalize-first.mjs，新运行使用check-next.py与finalize.mjs。复验另记directed2；本时点full未启动。旧R433组合的历史index字节失败仍保持原终态，不以本次补正倒改。
