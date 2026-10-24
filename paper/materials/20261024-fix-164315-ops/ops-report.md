# 164315修复批次核验 2026-10-24T17:00:50+08:00

164315修复批次原退出0，但登记为failed、merged=null，fixes为空；本轮核原out、report/result、原生终态和封存SHA一致，工作树干净且HEAD仍为e8dd51b基线，没有新增源码或可兜底提交。18项既有基线源码逐项核blob，不能把提交在main或祖先关系当实库采用；补链waiting_repair与数据集atomic_output在宿主main已含、实际live仍缺，沿原发布owner接续。tsc0，固定6文件28项实际通过，仅定向；最初EROFS及未知cacheDir参数两次加载退出1未执行用例，失败原件保留，不重跑full。无改动完成门仍返回空：基线与当前live有174个源码路径差异，不归因为174项回归，也不空合并整个main。原state/retry_at及旧科学父不改；回收请求原deferred，原因为scratch归属未绑定，不代通过、不手删或重finish。ENOBUFS、账本回退、预算/监控及策略等原候选和owner不重复实现，本轮不分配发布号、不新开模型/对局或数据集。

原件：verification.json、source-guard.json、artifact-readback.json、original-retention-request.json、original-tab-retirement.json；原报告及三次测试日志/最终JSON均在同目录原字节留存。
