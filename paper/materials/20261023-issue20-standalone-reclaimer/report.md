# #20 学习 tab 回收子类独立交付

按本会话 Claude 最新指令：此子类提前单独发布，不再等 #37/#20 父功能；自测后交集成员排 #47 之后定向核验。原父功能与 kit 发布仍在旧开发线，本次不附带。

独立分支 `issue-20-learner-tabs-release`，基线为开工后核远端的 main `0a9e87763b80dd3fee3af52a3a1a3bd9c50c6a91`，受测源码提交 `3f449fc6d8c651e429f71830d8ffe28117db5d51`。原分支保留在 6eb822280。仅重组 c17842f8/fc37ac1f/6eb82228 的回收子类叶，在当前 main 恢复 wrapper seal 与原 stall tick。main 已以整合提交含 d1f523bb 的已核 finish/no-seal 变更、59a1dc80 的原生确认延迟；后一运行源码字节逐项核同，未重放旧 wrapper/原生绑定源。同步保留 main 新 max_parallel=20、brain-view 永久保护、原生完成审计、待核降级及所有现有开关。

wrapper 在原 finished 审计成功后调用已交付 learner_tabs.py seal，不自行关 tab；seal 缺失/失败则保留原 done/failed/rejected 结果及回执，单独报告交接失败，不进入回收或重跑原任务。原 stall 在 drain 前串行 tick，不等 ops 模型/GitHub或父 kit；保留原暂停/RETENTION=off，正常等待不报故障，真实异常按原子类主管通知。postmortem timestamp key/后缀、awaiting_review、处置权/空闲/原件SHA、尾日志、sending/done 与原 checkout 保留门沿已交付实现，未降级。

发布脚本完整性：扩展 main 原 learner-wrapper-scripts.test.ts，在受测 HEAD 的 Git tree 内核 wrapper 全部字面 ROOT/OPS 脚本均已发布且存在；新增一项核 wrapper seal/stall tick 配对及 adapter 的项目依赖。负例删除 adapter 即明确失败，不能靠工作树未跟踪文件满足。wrapper-scripts.json 保存实际脚本清单/SHA。新增 learner-tabs.test.ts 将 Python 回收边界纳入原 Vitest 测试入口；原 wrapper 固定夹具由“不调用未发布模块”更新为“核原 finish→seal handoff”，同时测缺失/失败必须保留并通知。

检查均 nice19、串行定向、无真实 Herdr/模型/游戏调用：

- wrapper Python 17项过；回收+原Scheduler+brain-view Python 72项过（含回收55项），原host文件ResourceWarning原样保留。
- 受测提交的Vitest仅3文件66项全过：wrapper脚本完整性、回收Python入口、原#36 learner-herdr（包括确认延迟）。其中回收55项会由包装入口再次执行，不能与上项重复相加。Vitest原始日志字节以vitest-targeted.log.gz保留，未裁剪其结尾空行；解压后SHA见checks.json。
- 生产tsc退出0，bash -n两入口通过。没有完整Vitest、heavy排队、组合发布、安装或自然采用操作。
- 13个功能/说明/测试叶的blob/SHA、保留来源与全部日志SHA见inputs.json/checks.json。发前差量/材料/正文gitleaks。最终材料提交只加记录，不改变此受测源码。

影响 live 启动：否（本独立子类）；影响学习批次交接/退场：是。集成员请在 #47 后按此新main分支精确核验，仅发布此子类并与wrapper/tick/保护规则同组合，不重放旧#20父分支。ops 原自然边界安装/下一真实批次 seal→stall关闭→槽位释放读回待验；不据固定测试声称已回收生产pane。原 parent大功能的启动发布结论仍单独保留。

未改生产main/live/STOP、安装/控制/账号/原journal/真实收件箱/运维prompt，未关闭其他会话或重派原任务。工作树中旧#20原材料/夹具因换基线成为未跟踪历史副本，原样保留且不加入本发布；旧分支/原失败原件均保留，不清理或覆盖。
