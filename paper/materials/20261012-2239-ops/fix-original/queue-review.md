# 本批核对范围

开工工作树干净，先合并 main，结果 Already up to date；阅读 README、AGENTS、最新 STATE、decision-log 末尾、学习协议和代码提案闭环。
队列完整快照与上一批最终快照逐字节相同。既有索引用于定位；本批重新验证162条来源均为当前基线和只读live切点的祖先，30个重点路径中29个SHA相同。唯一变化launcher.ts新增明确thread接续及ACK，原会话前恢复逻辑保持。
从前批到当前基线的源码变化为已上线学习要求连续性（launcher/engines/learner_jobs/learning_requests及其固定测试），其余是任务与版本/收件箱记录。已核额度基线恢复仍要求同账户窗口推进和两次新鲜稳定余额；进阶事件仍取实际ascension；blocked空经验区分与普通策略批原提案回写仍存在；core通知保留原幂等回执并记后续stderr；双boss资源异常已保存分支/seed/资源诊断。没有新增待修纯bug。
本批tsc退出0；固定vitest两文件4项通过：batch-c-illusion固定模型/工作时钟与0/10000ms暂停，learning-requests明确会话/沙箱参数及原Python持久请求固定场景。没有源码变更或提交，未跑全套test-sandbox；没有本批撤修复测试，不将历史红绿验证算成本批验证。
队列策略项与独立功能继续既有任务；证据不足项按skipped.json保留，不复派、不新登记旧提案、不回退既有shipped。无新增代码可合入，未触碰live/刷新数据/队列/账本/版本。原main/live差异导致严格verify_empty_fix返回null，差异不来自本批，完整路径见no-change-proof.json，交调用方核收真实空产出。
