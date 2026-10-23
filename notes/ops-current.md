state: in-flight
issue: 36
updated: 2026-10-24T03:20:34+08:00

进行中的事: #36接续原恢复与正常双批验收。原11叶已镜像live e6debc3a13f4并由后续V6-R423继承；234301复盘原会话恢复后done/0，235635经验原会话恢复后仍failed/0（只读基线合并阻塞），旧75/原生绑定/失败原字节保留。verify→finish→finished及#20封存已核，原调度器01:55:03实际关闭两tab，未手关。234301五局dataset已rc0并提交bcce9fdf502e，17生成叶与五局has_postmortem=1核同；scratch仍等tested live经验，不代入库。原件paper/materials/20261024-issue36-recovery-ops/、20261024-234301-dataset-readback-ops/。

在等谁: 等原集成员完成#28最终main组合/唯一full，随后核精确受测输入后准备exp宿主基线；当前main与R423净组合仍有169源码/检查叶差异，不能以#50full冒main全检。235635新合并预览等main，11失败残留及原经验SHA不变，原exp树未改；保failed/0及学习沙箱，正常复盘+经验双批消费者/回收验收仍开放。回执paper/materials/20261024-issue50-r422-ops/experience-baseline-next-gate.json；#36评论6372554666。

下一步: 先核#36最新原评论与现有双批回执；28原组合full返回后核适用性，按原exp锁/无活动属主门host准备，仅处置已归档核同的11失败残留，不改学习权限、不改235635/211302 done、不重dataset/finish/模型或另起full。后续依原28→37→20父顺序；无可推进前置时等原事件。其他待验：50首自然5计划落盘/4后继读回已核，幕末/F48-F49/SL重启/学习收益仍开放；35学习消费待验，49rk非空场景待验，51/48沿原正常优先队列。23近24h16回收路径/111分配、plan0eligible，保留门不松，46完整窗至10-24 13:46:30，48至18:19:29；20最终kit观察至10-25 00:15:05，/new不启。27实际watcher01:49接收已核，formal ACK兼容/Roy可见回执仍缺；状态不变不再写主管收件箱，仅状态变化或需Roy裁决时一行，细节留issue。ops Fast实际请求回执待核，不热切；所有科学父保持原状态。

# 运维当前清单（调度器生成；索引模式）
生成：2026-10-22T18:38:22+08:00；原件索引：/home/dw/Projects/agent-sts2/ops/codex-ops/current.json SHA256 66d355e22260a795ce461c821c93eb15a96d84111e6042156ac05f9a8d155f3e
main dda4eed98e4ba57c7101f8c7c600437c4823a8a1
live 0cd3629d3a7f3a3bcacd22fa0a4206acc4d81e78；登记 release 见 current.json.release（不代表检查绿或实际采用）。
动态事实超出短清单预算，已完整保存在上述 SHA 的 current.json；没有截断授权、失败、任务或事件。
处理前必须核 SHA 并逐项读取以下字段及其原件；本清单不代表已经读过授权，不可沿用旧清单：
- restoration_context：完整 summary、authorization 路径/SHA、takeover_receipt、external_tasks；先核授权原文与失败回执，缺失或冲突时停止并保留待办。
- identity、home_selector、execution：原账号、pane/session、执行模式；不以默认配置推定实际生效。
- active_batches：在途 1；完整 owner/线程/PID/租约/路径，不重复派发或按旧 PID 操作。
- open_requests：开放父要求 7；不因本轮结束关闭。
- pending_notices：未确认 9；按本事件 notice id 核原件，不代其他角色 ACK，不把排队当送达。
- queued_events：队列 1；只处理本轮已提交事件，按路径及 sources 的字节数/SHA 核全文，不以 preview 代完整事件。
- not_marked_completed_transactions：未标 completed 191；保留未知/失败与原件引用，不推定活进程或成功。
- historical_lost：历史 8；不自行关闭；human_pace、transactions、recent_directives、inbox_tail、sources、missing：按事件定位未完成事务及指令的 offset/bytes/SHA，缺项不冒当前。
首次另读 AGENTS/README/最新 STATE/学习协议；历史 handoff/decision-log 只沿事务定位，摘要冲突查原件。
模型 gpt-6.1-sol；普通 ops/学习下次自然启动 high，专项有理由 xhigh，大脑 xhigh；实际档位须原生回执。不热切在途会话。
只处理原事件，不新增轮询/模型/局/计时器；STOP、恢复开局及角色授权必须按 restoration_context 原文核实，regent 保持暂停。
不读凭据/.env/游戏二进制，不改共享配置/账号/ops prompt，不推送。
H0/0332 等科学边界、精确宿主树、发布/兼容与 retention 沿原报告核实；索引不代验收、shipped、覆盖率或消费。
严格普通无源码成功仍须原调度器账本检查、唯一 dataset、受控记录提交及 ordinary-close 回执；异常/异议/缺证/人工决定正常唤醒。
普通记录300–500字并附原件路径；不复制报告，通关/升级照旧。
主管唤醒：需主管裁决/拍板、P0阻断超过20分钟无人能推进，或对局已停且按常备授权无法恢复时，向主检出 ops/codex-ops/inbox-claude.md 追加一行“HH:MM [ops] #N 一句话”；细节写 issue，后续ops会话照做。
