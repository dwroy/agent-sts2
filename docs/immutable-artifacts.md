# 冻结输入与离线模拟结果的内容寻址

Roy 2026-10-18 批准磁盘治理第2项。`ops/content_store.py` 对**明确已冻结**的文件按原字节 SHA256 寻址，共享库在同一 Git common-dir 所属项目的 `ops/codex-ops/objects/v1/`。任务路径保持普通只读文件，通过同文件系统硬链共用一个 inode；每次再生成原路径都原子替换，不能原地 truncate 或 chmod 后修改共享数据。原始 logs、可变知识、账本、原生会话和在途计算文件不接入。

`learner/extract_evidence.py` 的 CLI 默认接入（可显式 `--object-store`）；保逐行来源、原 offset/bytes/SHA、源截点、输出字节和旧 manifest 字段，新增 content 恢复信息。重复提取无需再保两份相同载荷，新的提取不覆盖其他任务的旧内容。库函数不传 store 时保持原调用兼容。

`agent/tools/boss-sim/refresh-silent.py` 仅在原 completed/哈希检查通过后封存输入与结果缓存，写旁路 `<artifact>.content.json`。原输入/模型/知识/种子/切分/控制重放等复用判定、校准数值、completed 和发布经验字节不改；不是按“看起来相似”跳过模拟。完成后的同一缓存再次执行封存是幂等操作。

其他已结束、由原owner持租约确认不再写的离线缓存可用：

```bash
python3 ops/content_store.py --store ops/codex-ops/objects/v1 --file <逐个已核冻结文件>
```

输出逐文件内容引用供原留存清单记录；没有递归扫描活动工作树、后台模型或自动标完成。既有固定 archive 代码把硬链存为带独立SHA的 regular member，恢复不依赖原 inode。共享对象本身不因某个任务结束删除；沿原ops的引用、归档/解压/消费者证明门禁做生命周期处理，不能把 link count 单独当删除依据。此项不实施日志分段、论文历史重写或跨项目清理。

实际Codex沙箱固定探针已证实：独立绑定挂载间即使同盘也可能EXDEV，私有实例也不能向主池写入。生产者只对EXDEV/EROFS/EACCES/EPERM延期：保持原输出的完整只读字节并在原声明中标记pending_host_seal，不扩大模型权限、不伪报已去重。其他错误仍保留原失败。

原learner启动器在模型进程与stdio完全关闭、原工作树租约仍持有时调用 `--finalize <scratch>`。仅沿本scratch的明确证据/模拟缓存声明逐SHA验证并归并，保生产者原声明字节不改；实际终局写独立 `storage-finalization.json`。成功不入ops队列；失败保模型原返回码/报告，发原队列异常，不重跑模型。旧启动器/旧任务不冒已接入，新源码按下一自然启动生效；原ops可对已核退出的旧任务按原路径显式补归并，不新建模型或轮询。
