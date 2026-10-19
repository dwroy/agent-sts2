# V6 小脑单次批次验收与 W3 停点

请求 `roy-20261019-v6`，批次 `v6-reflex-distill-20261019-1704`。本记录验收来源、覆盖与格式；不发布知识、不验收机制正确性或自然收益。

学习者 2026-10-19 17:41:42 CST 正常退出 0，未超时、未取消。原生线程 `01a1536c-f80e-7043-8daa-94d16f0810fa` 首条 turn_context 实际为独立 codex1 learner home、`gpt-6.1-sol/high`。未热切或续派；正式方向卡仍仅任务模板。

## 独立核验

- 431 份冻结输入、84 份产物引用、回报内引用的实际字节与 SHA256 全通过；244 个正式经验 ID 与原对象逐条完全一致。正式角色知识与冻结输入一致，学习树没有 tracked 改动或提交。
- 8,483 份原始证据共 315,167,335 字节，逐份核 SHA、源日志对应 offset/长度的全部字节及冻结边界，全部一致。没有再次重算七个完整日志前缀的多 GB 哈希；学习者前缀核验原件保留。学习者 17:31 的早期验证为 8,481 份，后加两条 malformed brain 原行后最终为 8,483 份；未改写早期原件。
- 初版、第二版、最终版三份草稿，用未修改的 W2 校验入口及原 context 重跑均退出 0；最终 draft SHA256 `0db54eb0c2dae18b4729d17dc30e060778c3e3bb15b41a6905ae5f871ae0d1b8`。原 `tsx` IPC/EPERM 失败保留；本次和学习者改用 Node `--import tsx` 执行同一入口，未放宽 schema、词表或 predicate。
- 账本 CLI 实际读回 `silent-0524`，状态仅 `proposed`，未 shipped、未合入或发布。scratch 的 code-proposal.md 是后续消费说明，没有派实施或进入自动修复队列。

## 实际覆盖和缺口

244 条正式经验：21 partial、222 text_only、1 disputed（已有 retired 重复身份，未反证原事实），converted 为 0。13 条均是 Silent A10 的 combat_line 描述标签；词表 15 个成员。没有 numeric signal，13 个 effect_size/SE 均为 null，不可给因果收益或按频率乘效应排序。拿牌、药水、休息、商店各为 0 条。

372 个冻结已结束局完成 inventory，原状态详细取证涉及 29 局；不能称 244 条机制全量重新验证。近期 20 个 A10 完局的首试、首个可行动稳定回合帧共 1,385 帧，条件频率只适用于此分母。235,333 条 decisions 解析成功；另有两条 decisions、两条 brain 坏行保留原始字节并维持 unknown/incomplete。

32 项 DTO/predicate 缺口见 scratch/missing-field-impact.json 和最终 draft.missing_fields。消费者投影、其余题型和配对效应仍未完成；字段扩展及续批等待 Claude/Roy 指派，后续学习档位依指示为 xhigh。本批格式通过不等于 W2 知识内容验收、实际消费或正式入库。

学习者三项异议原文和来源 SHA 已通过现有 `learning_requests.notify` 程序送入 ops/inbox-dev.md 与 notes/for-roy.md，通知 `f619c26f4bfa10970591beb5`。ops_forwarded 有真实落盘回执；watcher_received、roy_notified 仍 pending，本会话未代填。异议均保留原限制，不关闭原 owner 要求。

## W3 与并行集成停点

按“学习批次有结果即停下回报”暂停后续开发。W3 未合入：`.worktrees/v6-w3-20261019` 保存两个模拟草稿文件与 W1 projection 格式最小可选字段追加，文件 SHA 见 w3-checkpoint.json。当前仅单次 tsc 退出 0，未完成 vitest/gitleaks 或功能验收。尚缺具体历史输入/目标构造、固定数据回归和离线历史回放；不能当作 W3 完成。

拟议对外接口（未冻结，W4 暂勿据此宣称完成接入）：`V6ProjectionEngine.evaluate(request)` / `precompute(request)` 返回 `v6-projection-table-v1`；`entries` 为 W1 `projection-entry-v1[]`，含可选来源/样本/模型与未知标签；`act_evaluations` 为方向×目标的 win/joint_win、availability、trust、档位及与其他方向的配对差；另有 continuous 与 telemetry。实现集中 sim/，没有改大脑、触发、药水路由或 reflex/jev/。

W4/W6（pane wJ:p1GX）和 W8（pane wJ:p1GY）沿各自工作树继续；各自合入后，本会话仍负责整合 main 的完整检查。该后续检查尚未发生，恢复 W3 与集成核验等待 Claude 接续。STOP 保持，未开局、恢复 Regent/live、改正式知识或共享配置。

## 原件位置

- scratch：`learner/runs/20261019-171010-c702c588-a5c6-445c-838d-fd94eb877532-v6-reflex-distill/`，含 result.json/report.md、experience-mapping.json、candidate-audits.json、32 项缺口、continuation 与逐份原始证据。
- pending：`.worktrees/v6-reflex-distill-20261019/knowledge/characters/silent/pending/v6-reflex-distill-v6-reflex-distill-20261019-1704/`。
- 本次独立核验机器回执：[audit.json](audit.json)；通知回执：[delivery.json](delivery.json)；账本实际读回：[ledger-readback.json](ledger-readback.json)；W3 未完文件检查点：[w3-checkpoint.json](w3-checkpoint.json)。原学习树与冻结 W2 输入继续保留，不回收未完产物。
