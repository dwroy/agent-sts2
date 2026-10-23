# #20 postmortem 后缀合同修复

依据 [watcher 6356340003](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6356340003)。本次仅补原学习 tab 回收子类；父 c17842f8c，#36 P0 来源 0933ea0ef60304bfe4634d4bfb4ad35e32015f09。原 #20 整体功能仍遵守 #37→#20 门，本差量不改排位，不带父功能上线。

旧实现错误地把 batch key 同时当 label：真实 postmortem 的 batch=20261023-032433，原 host/receipt label=learner-20261023-032433-postmortem。新增同原 #36 writer 一致的 batch_label：task=postmortem（旧记录缺 task 时同样默认postmortem）加后缀，其他任务保持原无额外后缀。current/seal/reclaim/receipt_path共用该推导；封存回执名和成功后host删除键同时使用此label。batch key、out/err路径、事件key、原回执/产物与终态/空闲/处置权门均保持原合同，不扫描猜旧文件名或改原件。

固定验证 nice19、串行，无真实pane/模型/游戏动作：

- 修前新增真实timestamp-only零模型夹具，seal稳定抛KeyError: learner-20261023-032433，退出1，原日志before.log保留。
- 修后53项通过，final.log；28项timestamp-only postmortem、25项原非postmortem边界。使用#36精确0933ea0的真实verify_native；pane/proc使用原固定夹具。明确验证原后缀TUI读取与后缀封存文件、batch key不改、supervisor仍活时queued、退出后tick关一次并删除正确host键、原回执/out/err/learn.json字节不改。正常完成/取消/零模型、人工输入/失权/坏产物等原边界双类覆盖。awaiting_review同批去掉finished/rc，保留pane、零close/零pane-get，原state/回执不改，running-panes仍拒绝；缺task默认一致，不存在正确后缀回执时不猜无后缀文件。
- 生产tsc退出0，tsc.log为空；PATH包含~/.local/node/bin。未跑完整Vitest，最终组合唯一完整检查仍归原集成员/ops窗口。

仅改ops/learner_tabs.py、ops/tests/test_learner_tabs.py、docs/learner-tab-reclamation.md，另加本材料及decision-log。输入与日志SHA见inputs.json/checks.json；staged差量/材料/外发正文发前gitleaks。

影响 live 启动：否（此回收子类差量；#20父启动发布交付仍为是）。未改.agents/board.yaml或任何brain-view保护配置；集成员按原精确差量组合，必须保main现有brain-view永久保护，不能整叶覆盖旧c178配置。未改#36 writer、ops临时learner_tui=off、main/live/STOP、生产journal/回执/收件箱，未关真实tab，不重排/重派任何旧批。旧九叶full不代本P0最终组合绿；新组合/安装/自然批次绑定→完成→释放槽位→下一批采用仍待原角色核验。
