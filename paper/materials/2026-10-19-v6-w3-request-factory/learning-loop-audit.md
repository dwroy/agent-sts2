# V6 学习闭环接线核查

核查时间：2026-10-19 22:33 CST。检查当前 main 601160a34 与既有学习器实现，只记录工程接线，不生成游戏知识。ops 已在原线程接管 v2 直接 on 授权，STOP、Regent 暂停继续由原线管理。

## 已有入口

- `learner/lib/launcher.ts` 将 logs_dir 指向项目原日志目录，三个常规任务都能只读访问；Jev 的 chosen、rationale、fallback 等已有 `decisions.jsonl` 路径。
- V6 构筑日志由 `agent/src/v6/log.ts` 写入 `logs/v6-build.jsonl`，带 run_id；完整 Jev 请求记录在 `logs/jev-prompts.jsonl`。目录可读不等于任务已经纳入这两条流。
- main 370f8cde8 已有 `learner/tasks/v6-knowledge-publish.md`，由 ops 沿原学习流程发布已验收草稿并核消费者读回；本会话不重复派发、不代发布。
- W2.2 的 `knowledge/builders/build-combo-metrics.py` 和 W3 的 `knowledge/builders/build-v6-history.py` 已存在；冻结包是按角色开局读取的快照，不应在对局内重算。

## 给 ops/学习调度的待办

1. **提证与复盘接入两条 V6 流。** `learner/extract_evidence.py` 的 STREAMS 只有 states、decisions、sl-attempts、run-config、run-plans、brain、runs、fight-plans；`v6-build`、`jev-prompts` 尚不能由共用 CLI 提取。`learner/evidence_summary.py` 只索引 runs 与 decisions。postmortem、strategy-proposal、experience-update 模板未明确要求 V6 构筑日志和完整 Jev 记录。需扩展按真实 run_id/decision_id 的索引、截点和 offset/bytes/SHA，并让三种任务实际读取；不可仅按正文或邻近时间串局。已有 decisions 可提供部分 Jev 决策证据，完整题面与 V6 条目覆盖仍未闭环。
2. **局间刷新。** 搜索 ops 下 Python/shell 调用，尚无 build-combo-metrics/build-v6-history 调用钩子。需在原局间任务里，按角色冻结已结束日志，先生成合并口径组合指标，再生成并校验历史包；成功后原子替换该角色产物、记录哈希/时间，失败保留旧包并报告。现有局保持开局快照，下一局自然加载；不新增调度器、不进入游戏中重算。
3. **发布闭环。** 草稿、ledger proposed、报告和学习批次退出不关闭父要求。由既有发布模板正式发布后核 live 消费者实际读回；校准出新表后按原流程处理可信度，不因本批接口交付自动发布。

本核查没有启动真实请求或对局，不代表 V6 局上的耗时、覆盖、故障与触发次数已经验收。首批直接 V6 仍由 Claude 监督，ops 按 v2 授权和 W5+B/Nova/资源条件开局。

## 三份历史异议的送达与登记

0baef634d02e1ff85843c10a、f619c26f4bfa10970591beb5、b5b53e0d8bebe1df7fb30468 的原文与 ops_forwarded 双收件箱回执已核。本 watcher 已于 22:25 的原生用户可见消息转达 Roy；实际消息和行哈希见主检出 `.artifacts/v6-learning-notice-watcher-20261019/native-roy-notification.json`。

原 `ops/learning_requests.py ack` 拒绝第一份 watcher_received：`unknown learning request; ordinary notification scope must be explicit`。三份历史手动通知均缺新版来源/通知范围字段，当前尚不能登记 watcher_received/roy_notified；保留原件和 pending，不直接修改 ACK。已沿原 Herdr ops 通道报告兼容性问题；收到不代表 Roy 认可，经验正式发布和父要求仍未完成。

## 原 ops 续接回执（2026-10-19 22:54，原通道）

上述提证、任务与局间刷新缺口已由原启动器接入 `v6-learning-loop-20261019-223658`；ops 已核 codex1 / gpt-6.1-sol high 原生首回复。当前仍在途，尚未验收，不能据此关闭待办或宣称正式入库。自动复盘 224302、双策略 224304 的实际 codex1/high 由原 ops 核实；正式知识发布另批 223156 仍在途，本会话不重复派发。

W5 精确接口的 Herdr prompt 被 `agent_blocked` 拒绝，W7 显示 queued question。两者均未认定送达，不绕过受阻 prompt；请 Claude 沿原会话协调。冻结接口为同目录 `interfaces.md`。

另有 7 项历史学习请求由原调度报告原工作树缺失或路径不符。watcher 已读取原文并实际转达 Roy，原 CLI 已接受各自 watcher_received/roy_notified 回执；回读确认 7 项父要求仍为 blocked，未重建旧批次或代记完成。证据在主检出 `.artifacts/v6-legacy-learning-notice-watcher-20261019/`。这与上节三份旧 V6 异议的 ACK 格式兼容问题不同，后者仍保留 pending。

## 原件与接续绑定阻塞（2026-10-19 23:11 CST）

实际读取原 ops 的 `.artifacts/ops-wake-20261019-2303/legacy-worktree-blockers.json`（23:10:32 版本，SHA256 `af5ae932c160b40bf76cafb553d8e35b11b7624e010751c63fc988d418b6475d`，同目录 notice-delivery 保留冻结副本）。14:47:05 退役回执确认五棵原树已删除、临时归档丢弃，thin storage 不是还原归档；具体核心与校准 ref 已前移。experience 恢复、具体核心、support 三项缺原注册日志；H0、0332 和 support 的实际旧消费 codex3 与当前 codex1 请求存在绑定差异。已在本会话用户可见消息实际转达 Roy：先恢复精确原件、协调原 owner/账号绑定，再走原 CLI retry。七父继续 blocked，不用新 checkout 冒原现场，不跨号 resume、不重复在途校准；本核查未恢复、重派或改绑定。

原 ops 224302 复盘无新 bug、ledger 检查 0 问题；224304-s2 dataset 2667324 仍持锁，待原完成事件核结，不重复启动或冒完成。v2/STOP 与 Regent 暂停不变。

## 机械补接已合 main，运行验收仍待（2026-10-19 23:14 CST）

原批次 223658 已提交 `7bfae61f7`：两条 V6 流进入提证入口，显式身份与字节证据，三常规模板明确读取；原 report/refresh 链增加按角色局间刷新及校验/失败保旧。已只读核查实际源码，不能再把这些列作“尚无代码”；尚需精确集成树检查、真实局间执行回执以及下一局加载/常规任务实际读取，父要求未完成。正式知识 `de4e1deee` 只有19 reflex 标签与7枚举，244经验原字节未改；其余小脑、核心卡及 live/自然消费者仍未闭环。

核心卡R2已独立核验868冻结输入、195产物、17结果引用和372局/244经验/12648见证行；当前格式通过，仍只pending，详细报告为 `2026-10-19-v6-build-cores-r2-audit/`。未重跑完整统计或全部8.4GB原始段。六项异议和限制已读并实际用户可见转达，通知CLI不冒登记。

原 ops 已于23:18实际回执（main `77006d053`，`paper/materials/20261019-2314-ops/receipt.json`）：读取 R2 原result/report及六异议、17引用SHA，保留本watcher验收归属并挂回原223156发布线；未另派、未发布、未填ACK。此为 accepted 后新增的实际收件证据。

## 原 live 读回与显式出牌开关（2026-10-19 23:26 CST）

已实际读取原 ops 23:22:19 回执 `.artifacts/ops-wake-20261019-2315/live-verification.json`，SHA256 `c1d36ad36b76655e257ba50afb630536b0fc2fd014722d0a2c8ab7969b0409b9`，原字节副本见 notice-delivery。`de4e1deee` 已为 main/live 祖先，实际 live `b0c86240d` 的四文件状态与 main 相同：核心卡缺失，244经验原字节保留，正式19标签/7枚举。原锁内实际 live 路径的19条消费者 true/false/unknown 通过，仅为固定离线题面，未证明自然采用或收益。原未变 live 源码已有宿主 tsc/full 5573通过、2跳过以及93项精确组合检查，本会话不重跑该 live full；原学习者 sandbox full 的15失败/3errors及中断保留。新增 main 学习链源码不借用该旧回执称 full 通过，待原完成事件。

core R1、66标签/14枚举和真实任务名提案注册 exit2 invalid task link 仍 pending；R2新草稿已挂原发布待办但未派批。未代ACK、未关父，STOP/Regent及v2门槛保持。最终授权 on 边界必须向原 Herdr actor 显式传 `V6_COMBAT_ENTRIES=on`，不能只传 `V6_REFLEX`；本批没有启用开关或开局。
