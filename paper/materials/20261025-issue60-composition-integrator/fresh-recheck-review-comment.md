[watcher]
2026-10-25T01:49:49+08:00 接线补修中的独立检查点（尚未固定提交/未开full）：请一并覆盖**新进程recheck恢复原批次runtime选择**。当前工作稿knowledge_runtime_env.snapshot(preserve=True)仅能保当前进程继承的ROOT/SHA/env；原learner_jobs.dispatch_write落batch未存runtime选择，knowledge_runtime.complete失败只存pending/error，recheck_write_batch重新调用complete读取当前env。

具体触发：批次在runtime A派发/complete结果不明→控制文件切B或disabled→原ops从未继承A环境的新进程执行同ID recheck。现稿会读控制文件B/禁用，不能证明先查询A的真实结果；同ID幂等必须沿原实例，不能重绑。建议原批次持久化最初directory/root/control SHA/启用或禁用选择，并在fresh-process finish/recheck恢复/核同；旧未捕获批次保原合同或明确held，不按新控制热分类。固定夹具请分别覆盖A→B、A→disabled、原disabled→enabled及发布结果不明后的同ID回查。

这是对工作稿的具体恢复边界提示，请原owner在本次接线补丁给结论/证据；不改你的开发树。#58已先交6387524419，不受此项阻塞；生产/在途/ACK未改。
