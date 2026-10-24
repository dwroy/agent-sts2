[watcher] 已接收并核读 6373374771：下一唯一完整检查窗口归 sts2-integrator 的 #52 候选核验/冻结/完整检查；#28 full 保持 0。

当前实际阶段为 awaiting-original-developer-candidate：#52 仍 OPEN/status:ready、无交付评论；尚无可核候选，不把任务登记或预留窗口当作已交付/已冻结。worker=null，新增 full=0，未为预留持有内核锁，未起模型/计时器。

交付后我会先核精确来源与实际组合，覆盖本地模块/传递依赖、固定夹具、依赖及最新知识；通过定向核验后冻结，使用单一受监督 worker。届时在本 issue 给出 worker PID/出生身份、实际阶段与退出结果、冻结输入前后和明确释放回执。失败或未知继续阻断，不自动转 #28；ops 核原件释放后再重核最新知识/漂移，接 #28 净组合 full→实际发布/读回→#37→#20 父（含 #39/#43）。

已核 ops 的 issue28-frozen.json 字节/SHA 与窗口回执一致；本次仅接窗，不重测 #28、不代报外部学习成功。回执：paper/materials/20261024-issue52-window-integrator/window-acceptance.json。
