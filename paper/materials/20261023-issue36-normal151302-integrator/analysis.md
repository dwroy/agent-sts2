# #36 普通151302二组独立核验

2026-10-23 15:29:45 +08:00 只读快照，接 ops 评论6359677330。未启动、重派、继续或终止模型，未操作 pane，未写生产状态。

原 pane w1H:pCC / tab w1H:tC9 / terminal term_65e7cb60e43f0105、native host PID1034144/birth16412055、cwd 与原回执完全一致，Herdr 原 agent 仍 working。原生 session 01a1679b-4956-7843-88b8-99d2c695ef69、turn 01a1679b-d263-7281-8953-bf119b7cf9b4、gpt-6.1-sol/high/workspace-write 已独立核实。前十行经现有 NativeBatch 离线重放，精确匹配原单次提交 marker 与完整 prompt SHA，accepted=true / pending=false / foreignActivity=false / bindings1；它是独立证明，不回写原 bindings0 或 code75，也不授权 finish/retirement。

初始 attention 原因是 unsent human draft; keep original session and supervision。现行 learner/lib/herdr.ts 在提交后 readNative 再读 composer，composer 为 text 即丢失所有权并退出；原日志 summary 07:13:16.980Z，原生首行记录 timestamp 07:13:47.627Z，精确提示 07:13:49.366Z。session_meta payload 的创建 timestamp 更早，为07:13:12.581Z，不用记录 timestamp 推断文件此前不存在。原屏幕没有保存，不能证明真实人工输入，也不能直接宣称自身粘贴误判。

请原 #36 owner 针对“自身提交仍显示/逐渐消退、原生记录稍后可读”与“真实人工草稿、外来 turn”分别补固定回归。保留真实人工输入保护、单次提交/身份/lease 门，不通过忽略所有 composer text、伪造 bindings、再发 prompt 或自动关闭规避问题。没有新增完整检查；修复范围仍按主管定向检查及组合自查门。

300秒降级已实际落地：15:18:18.116918+08:00 journal 持久化、inbox_notice=written、canonical batch=awaiting_review / tui-verification-timeout；距 summary 301.137秒。原监督PID1033180已不存在，lease一次排他非阻塞探测为空闲并即时释放；原生PID同birth仍在。finish/retirement/automatic_replay_authorized 全为 false，降级是待人工核验，不是安全退出或完成。

live d1f523bb166b02e4ab11a93ec5e14883c6c954a6 未变。主组通过及二组部分证明分开；#36/20/科学父开放，#46 原 [2026-10-23 13:46:30, 2026-10-24 13:46:30) 不变。原141301学习候选与旧失败原件沿原链，不混入工程验收。

readback.json 保存原件窗口、SHA、上下文、PID/birth、降级与状态投影；offline-native-binding.json 保存离线回放结果。原始 prompt/终端屏幕不公开。
