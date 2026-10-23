# #20 brain-view 旧夹具兼容补交

依据[watcher6356938843](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6356938843)及[主管6356904617](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6356904617)。#36最小P0不带#20，不受本补交或#20完整检查阻挡；本任务不改变发布顺序。

原main的brain-view测试用正则protected board role识别受保护pane；#20 running-panes分支虽然正确拒绝操作，却改成另一文案。只把本分支ValueError恢复兼容分类前缀，保留具体原因：`protected board role or pane: running learner pane retained`。不改异常类型/门禁条件、不删除旧测试断言，旧调用者和新具体原因都继续可见。新增定向回归同时核missing/running/awaiting_review拒绝且兼容旧分类，done/failed/rejected/cancelled仍沿原terminal门；不以改文案放宽回收。

精确重放main原test_brain_view.py、brain_view.py、herdr_titles.py到本仓忽略目录，只叠候选issue_session_support及原learner_jobs。main配置保留brain-view与所有其他字段，仅将learner-*整类保护按原#20改成running-panes。原测试/模块/配置Git SHA与组合SHA见inputs.json；没有修改主检出、生产配置或真实pane。旧brain-view夹具源码不改。

nice19、串行定向：

- 修前真实原Python夹具15项，14过/1败，before.log保留；失配即watcher报告的protected board role正则。
- 修后同一原夹具15项通过，brain-view.log；brain-view永久保护断言仍执行。原host读取ResourceWarning两轮均保留，本任务未改无关资源读取。
- 学习tab55项通过，learner-tabs.log，实际0933ea0 verify_native和固定pane/proc；生产tsc退出0，tsc.log为空。
- 未运行Vitest JS包装器或完整Vitest；未新增full/等位者，未把本定向绿写成原失败组合的full绿。原e9e3009f9281及ordinary-close-isolation 15s失败均不改写，后者归主管原判。

仅改ops/issue_session_support.py的一行异常文案与ops/tests/test_learner_tabs.py回归，另加本材料及decision-log。差量/材料/正文发前gitleaks。影响live启动：否；原#20父交付为是。未改main/live/STOP、生产安装/开关/journal/回执/收件箱、brain-view配置/运维prompt或其他会话，未关闭真实tab；#20整体仍在#37后，实际采用与原发布门保留。
