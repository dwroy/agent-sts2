# #65 已完成普通 fix 学习会话的回收兼容

普通 `fix-batch` 原任务不引用 `{{batch}}`，启动器按模板引用集合生成 params，所以合法原日志没有 batch 字段。#63 的 sessions 映射入口把这个缺字段判为原账号/线程绑定不足，导致已有终态和处置权的 UI 不能封存。依据 #65 原任务及 ops 6394485809 交接，本次只补这个普通布局；原四叶产品候选留 #59，#64 检查/上线优先。

## 实现

生产差量只有 `ops/learner_tabs.py`。显式 batch 的原合同不变；字段缺席时，原 learn.json 登记必须和唯一原 launch 的 task、engine、transport、角色、项目根、pane、cwd 及按批次命名的独立 codex-fix 工作树相符。中央原日志和 scratch 必须具有启动器的同一 timestamp/UUID stem；唯一对应的 learner_tui_session 还须对应 receipt 第一项 bindings/submissions 的 marker。专题任务、其他任务缺 batch、显式错误/null batch、未知布局均保留。具体合同见 `docs/learner-tab-sessions.md`。

新证明只在 fallback 的 sessions_mapping 增加 `launch_binding.kind=ordinary-fix-v1`；旧显式 batch 和无软链证明格式不变。复核仍走原 files、seal_proof 和关闭前重核；通用 safe_path、账号/profile、no-follow、native prompt/turn、wrapper/监督 PID、终态、处置权、原产物和空输入/前后台进程门保持。缺字段的旧类型继续沿原绑定不足分类，避免改变原本地保留/通知分界。

## 原证据

已核原交接 manifest SHA `1b233098aba446b79d52d8d1b0dac6a03427116b986f6f0af23228dff1929192`、handoff SHA `155e776cfffb33c614cb6972955002d1cbccc696782312760a678207b03dc3f3`、六份引用材料及五份原件/备份长度/SHA。原业务行 SHA `16231cbab0833782b417fe6308eb269365516c64007ac39f8e5e37b321574a56`，仍 failed/rc0。

`readback.py` 只消费冻结副本核新绑定和现有 native verifier，原件只作字节核同；实际核验结果见 `frozen-original-readback.json`。只向本开发树临时目录写隔离登记，未调用生产 seal/reclaim/Herdr，也未修改原 launch/receipt、状态、账号、产物、树或失败历史。完整 seal/recover/tick 仅在合成固定夹具验证，不能冒称真实 UI 已释放。

## 验证

固定回归覆盖 wrapper 封存、ops 只读预检/恢复及重复恢复、scheduler 自动封存/回收；重建 worker 后只关闭一次，原业务行/原回执/原生流/日志/out/err/report 字节相同。覆盖新增普通 fix 与旧两失败投影、第三后继样式、s2 strategy、timestamp postmortem、无软链布局及原封存记录。负例包含错 task/batch/cwd/pane/terminal/角色、重复 launch/session、缺 marker/params/绑定、专题、错账号/profile/目标、软链/路径替换、原 SHA 变化、未终态、忙输入和额外进程；原不确定关闭门继续保留。

基线 `de78668debde8814cbadfc312efa8efb53e6dd2a` 的原 reader 在新普通 fix 夹具上：wrapper/ops 精确拒绝 `native sessions original account/thread binding missing`，scheduler 保留。原输出在 `.artifacts/issue65/baseline-reproduction.log`；首个复现 harness 把 scheduler 的保留误期待成异常，修正断言后核同，首输出保留于 `baseline-harness-first.log`。

项目自测及固定核验的终态、数量和日志 SHA 见 `checks.json`。预检发现 allocator 稀疏树缺既有 issue29 输入和尚未创建的 .cache，已从原 HEAD 恢复 `paper/materials/issue29-brain-speed/results.jsonl` 原 blob 并创建可重建 .cache；不改 fixture 或增加排除。只运行本开发树规定的 sandbox 自测，一个 worker/nice19；实际部署组合的唯一完整检查仍归原集成员，不借本树检查替代或夹入 #64 已冻结包。

## 部署、回退和运行验收

原集成员按 #64 优先顺序接本项固定提交及届时实际部署组合检查。原 ops 在原调度边界安装新 `ops/learner_tabs.py`，同时读回实际宿主 OPS 与 `ops/learner_tui.py` SHA；verifier 继续依赖已部署 #63 的 source stream 接口，本次不覆盖其叶子，也不改 live/STOP、wrapper、账号配置或游戏知识，不分配游戏 release_id。

适用组合核收后，原 ops 接同一134331原 pane/receipt，鲜核监督/native 退出、处置权、身份、原 SHA、空输入和无后台工作，沿原 recover-seal 预检及 --apply、原 stall tick 逐项实际验封存/关闭/退出/tab缺席/host映射移除。重复预检不写，重复恢复不改原 seal，重复 tick 不重复关闭；sending 不确定事件须沿原处置核清。原 #63 三例和已释放开发登记不重放、不伪重开。实际运行核收仍待原 ops，科学父和学习/发布验收不由 UI 回收关闭，原树删除仍交 retention。

回退只恢复部署前 tabs 叶，保留 #63 verifier 和新旧 seal/journal/原失败及全部材料。旧 reader 对新分支证明继续保守保留；不删除证明或重派学习来绕过。未向其他会话发送控制、不关闭本开发或其他会话。
