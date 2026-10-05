# 成本、升级爆发、TMPDIR 修复与经验 .22 分阶段发布

- 2026-10-05 22:01 CST处理21:50 manual / experience-done，main同步3c06417b3530824fb9c81f4b3c5013a42a965bef，固定发布d5a4f6fcbdb444ee026de83d7507d8dc8c6fb53b；代码、eval、知识逐树相同，只decision-log冲突保留双方全部行。main独有的额度与21:20完整测试失败档案保留；不跟随尚在运行的学习者后续HEAD，不修改其工作树、不停对局或调度。
- 经验源df989e0920c4aa6ba49ae9ff27967f127cd4bd2d→实际合入aea750c95b48223254b28b5dc40f847aaaf48fb9→发布06a463ca80102dd86656b993b1bd81f020580e84/S1.exp22，来源2SU6XN2AEJRD SILENT A6首试胜/无SL及旧28局复算，29局508房22实死。新增2/补证更新13/退役0、active86→88，42817→45653字，高33/中24/低31；A8/A9各79项37573字，实战样本0。240配对切片中位+201/max6726→7400。源初版与最终两轮176文件2006例/tsc0，因数据校正复测而非失败/负载重跑，合后177文件2010例/tsc0。预检0、刷新空、知识重叠空；无经验源码/生成器变更或重建，铁甲等价。incoming包含已经同步的main记录，知识incoming仅静默experience，不假记全incoming只有经验。
- 16条learner proposed、16条ops shipped/S1.exp22精准归档；另以ops经ledger.py登记0115独立S1.fix21代码链，共33行；check120项0问题。0119/0120沿用复盘id，0114完全不动，0115历史经验与代码发布均保留。第二十二节原文归档，旧620310字节前缀SHA256=39c4b46b95c1016687fc24aecf04ab3d5a0e02b3ea868031ea2342270215cc4c保持。不提供游戏知识、不另设审核；冒泡同期10伤、沙漏12尝试等采用学习者校正，未记录因果维持未知。
- 成本源637ed9dc0ef71177cdb480eceacbf7ab2c8988e4→live 48f2bf5a95dae915c263b993f9d4f86784bc30e2；源/合后177文件2007例/tsc0，源码撤除1失败、恢复6个Python固定用例通过。组件×进阶×局归集缓存/推理子集，累计水位去重、学习者按服务局等分、运维/观察按时间归属；Codex500/Claude200美元每月取Roy授权，Jev TypeSafe价、Claude实时额度、早期调用记录缺口按代码保留未知/部分覆盖，不自行估价。现有paper_dataset --no-raw调用成本报表。日志库入口、logs/codex-usage.jsonl规范名、每局后刷新仍在同批继续，不记最终完成。
- 升级爆发源dafd280bc04f10573cf4205d55e5b80e1400be03→live e7370f88e7f855ae1a57f03ffbf023630ea190d2→发布32948742c6ae12255f6d651f60d9d269ae101e77/S1.fix21；学习者证据VN7RQJMJEFMX SILENT A6 F27 T6、机制0115。源/合后177文件2010例/tsc0，撤源码2失败/7通过、恢复9通过，仅纳入已观测升级2层，普通0114的S1.fix20历史不重置。在线刷新00b83dd9和b3f7f2b0已随固定发布保留，没有运维自行重建。
- 临时目录源6bfbe3d2e2aa6e5e8c1969d5ee1cca08671ae02a→live d5a4f6fcbdb444ee026de83d7507d8dc8c6fb53b；本轮一次读取时合后exit0已落盘，源/合后177文件2012例/tsc0。撤目录修复2失败/4通过、恢复6通过；Node tmpdir及Python tempfile默认API兼容未设置/已设置，成功/失败追加、脱敏和成本断言保留，不给完整命令补TMPDIR掩盖、不新增排除。21:20旧发布c3f0410c/树ba54713b完整exit1及原日志不改，本轮只确认修复已合入与沙箱通过，修后完整套件待fix-batch最终事件。
- main现有五分钟tick使用已测exec nice采样代码，按10080/300分钟识别周/5h，缓存43%仍未知，真实采样已在此前21:15成功，历史保持。本轮不等待下一tick。经验独立完整检查待learner-checks，整批fix-done尚未到来；不重复派修复或提前占live锁补全套。原回报/证据/红绿与合后日志位于learner/runs/20261005-211301-experience-update/及learner/runs/20261005-204301-fix-batch/。

## 本轮论文刷新与已完成定时采样（2026-10-05 22:05确认）

`nice -n 19 python3 ops/paper_dataset.py --no-raw` exit0；日志切点2026-10-05T14:02:07.885Z、五项一致性检查通过、决策计数差异空、key scan CLEAN，原执行日志/tmp/sts2-2150-paper-dataset.log。组件成本由已测eval/cost.py生成，订阅配置Codex500/Claude200美元每月保持；来源字节切点/缺失与坏行按cost-sources.json保留，不补估未知价或早期日志，也不把本轮生成当成成本分层后续已完成。

现有五分钟tick已完成21:55和22:00采样，白名单日志分别fresh周45%与46%，10080分钟窗口、重置2026-10-11 15:07:58 CST；只有周窗口、5h仍未知。旧缓存43%、首条fresh44%及原始失败历史保留。本轮仅一次读取已落盘证据，不等待下一tick，不自行联网/读取认证。安全原行：

```json
{"schema_version":1,"captured_at":"2026-10-05T13:55:02.640Z","provider":"codex","scope":"shared_subscription","source":"account/rateLimits/read","sample_observed_at":"2026-10-05T13:55:01.630Z","freshness":"fresh","error_code":null,"windows":[{"bucket":"codex/primary","kind":"weekly","used_percent":45,"window_minutes":10080,"resets_at":"2026-10-11T07:07:58.000Z","stale":false}]}
{"schema_version":1,"captured_at":"2026-10-05T14:00:02.803Z","provider":"codex","scope":"shared_subscription","source":"account/rateLimits/read","sample_observed_at":"2026-10-05T14:00:01.898Z","freshness":"fresh","error_code":null,"windows":[{"bucket":"codex/primary","kind":"weekly","used_percent":46,"window_minutes":10080,"resets_at":"2026-10-11T07:07:58.000Z","stale":false}]}
```

本轮归档提交04b6175ae3c299f867f5266d4c9ff4af64f9544e含16learner proposed+16ops经验shipped及0115独立代码1行，共33行；check120项0问题是登记时快照，其后并行学习者复盘/账本追加留未提交，论文表按生成时输入统计。本轮不代处理未收到的复盘事件。经验独立外部检查及fix-batch最终完整检查仍待后续事件；21:20旧失败没有删改。
