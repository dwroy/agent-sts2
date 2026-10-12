# 用户指定的学习入库要求

Roy 2026-10-12：要求学习入库时，必须认真研究并最终进入经验库。若学习者不同意建议、证据不支持或与已有知识冲突，要明确质疑，经ops告知watcher，再让Roy知道。已有的证据、自测、自行上线授权保持；通知不是新增审批。

## 任务与批次分开

用户要求使用唯一request id。学习者进程/报告批次可以结束，父要求不能因此完成。普通研究报告仍可独立结案；指定“学习入库”的要求必须注册`notes/learning-requests/<id>.json`，沿已存在的owner/thread接续。首次研究的历史记录不改写；补充提高revision并冻结新输入SHA。正在运行的旧revision先完成，新revision接着做。

状态是pending → running → awaiting_delivery → completed。中间产物outcome=continue会按同thread继续；缺证、不同意见或技术阻塞进入questioned/blocked并通知。批次退出无回执、重复无进度、输入损坏、账号变化均显式报阻塞，不假装running，也不另开相同研究。

只有实际live祖先、逐项经验ID/内容SHA/局号，以及消费者读取回执通过后才进入awaiting_delivery。ops、watcher、Roy的通知回执齐全才completed。固定消费者回放只证明可读取，不证明自然采用或胜率改善。失败原件和旧done保留。

## 注册格式与归属

schema=`learning-request-v1`；authorized_by=`Roy`；goal=`experience-live`；id与文件名一致；revision为正整数；character按角色隔离；original_batch、worktree、thread_id绑定原批；learner_home绑定原学习者账号；original_log={path,sha256}指向原始learner JSONL（必须含对应launch cwd和thread.started）；input={path,sha256}是本次要求；requirements为不可空的验收ID列表。

只有已授权的项目操作会话登记要求。学习者不能自行编辑注册、调度状态或通知ACK。文件变更不提升revision会被拒绝。补充原任务时不要删除原批或另造请求ID绕过去重。原线程不在当前学习者账号时由ops做显式恢复，禁止--last或扩大沙箱权限。

现有learn tick调用`ops/learning_requests.py`，共用两个策略槽、learn.lock及原工作树租约，无新增定时器。继续使用learner/run.ts的引擎/密钥隔离预检及项目账号；续跑仅增加明确的resume thread。

## 异议和交付通知

学习者questions逐项写原观点、不同结论、证据、影响的经验ID、建议下一步。反证可以入库为否定或限定经验；证据不足不能硬写正确。足够证据的授权修正可继续，其通知不得省略。

每项异议生成持久`ops/codex-ops/learning-notices/<id>.json`和原ops队列事件。ops先追加`ops/inbox-dev.md`、`notes/for-roy.md`，再发送给现有watcher；watcher在本会话明确告诉Roy。各阶段提供实际发送/接收/用户可见回复的项目内回执：

```bash
python3 ops/learning_requests.py ack --notice <id> --stage ops_forwarded --receipt <真实发送回执>
python3 ops/learning_requests.py ack --notice <id> --stage watcher_received --receipt <watcher接收记录>
python3 ops/learning_requests.py ack --notice <id> --stage roy_notified --receipt <用户可见回复记录>
```

不可代填后续角色的ACK；queued不算发送。通知未完成时，原learn tick每30分钟重提ops事件，不新建watcher或另一个调度器。watcher每次接续先查未确认通知；没有可发送的watcher通道时ops必须报告阻塞并保留通知。

ACK回执为JSON：notice_id、stage、actor（ops_forwarded为ops，其余为watcher）、status=delivered，以及evidence={path,sha256}指向实际发送/接收/用户可见回复原件。不能拿任意说明文件当通知完成。消费者回执同样必须有evidence数组，逐项冻结真实探针输入/输出，只有passed字段不通过验收。

blocked/questioned经ops核查有可行下一步后，保存说明再沿原线程继续：`python3 ops/learning_requests.py retry --request <id> --receipt <恢复理由>`。这不是用户审批；新的范围/输入必须升revision。有异议但证据充分的修正不必等Roy再次批准。
