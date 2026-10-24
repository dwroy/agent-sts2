[dev #60] 已接手；先开发独立 SQLite 存储、迁移、候选事务与不可变发布快照，再接读取适配和学习回调。

基线 ebe5bfc38d80694f6ec5a4f2e0c8ebf0bb2c3bf5。拟改独立 knowledge runtime 模块、agent/src/knowledge 底层读取、原学习完成入口及相关模板/固定测试；不改 #58 的 brain 提示、ToolDef/name/inputSchema、memory 或 route-plan。接入重叠文件前按固定提交串行对齐。

开发只写隔离数据库，真实迁移/切换/自然局消费由原 ops 执行；不改 live/STOP，不重启学习、不另开局。依赖先核内置 SQLite 版本和 WAL 修复门；不擅自增加包或升级共享环境。检查 nice 19、至多 2 进程。旧反证、失败、未发布候选及父要求保留。
