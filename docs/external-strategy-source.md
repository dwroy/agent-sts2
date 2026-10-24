# #51 外部来源的统一策略入口

这是 #48 开发会话交付的机械入口；不生成游戏结论。科学父仍是 #51（双 Boss 同时关联 #50 第4条），父请求沿用 ops 的 `github-issue-51-external-boss-learning-20261023`，原计划见 `paper/materials/20261023-issue51-intake-ops/launch-plan.json`。

## 派发与输入冻结

原 ops 在主运行根的 `notes/strategy-external-silent.json` 登记来源；默认 `enabled=false, plans=[]`，没有可用冻结输入时不会开启模型。已有 #48 旧经验开关与冻结副本不变。新入口不是旧四专题，`runs=[]`，不注册虚构的本系统局号、旧批次或旧研究请求。

配置固定 `schema=1, authorized_by=Roy, character=silent, request_id=上述父请求`。`plans` 按优先顺序排列；每项包含：

| 字段 | 约束 |
| --- | --- |
| plan_id | 非空小写字母/数字/点/下划线/短横线ID，最多120字符；首两批沿 ops 的 issue51-dual-boss-001、issue51-act-boss-002 |
| retry_generation | 初始0；恢复时显式递增，不改原批次；同plan最多3次 |
| work_spec / input_manifest | 各为 `{path,sha256,bytes?}`，路径相对主运行根、SHA为精确64位小写哈希 |

每份 input_manifest 必须包含：

- `request_id`、`batch_plan_id`、`character=silent`、`source=external:sts2fun`、`contains_player_identifiers=false`、与配置完全相同的 `work_spec` 引用。
- `topic` 为 dual-boss / act-boss / card-picks / map-resources / encounter-rk / knowledge；`unit_ids` 为1至6个不重复的有界工作单元ID。跨plan复用ID意味着同一工作单元，不按版本或重试制造重复条目。
- `provenance={url,downloaded_at,database_sha256,query_version}`：sts2.fun 的 HTTPS 公共来源、下载日期、原数据库SHA和安全聚合导出/查询版本；额外保留压缩SHA、筛选条件、SQL/导出SHA、限制和删失计数。不得复制引言样本数充当本批分母。
- `cohorts` 是非空数组，精确区分 v0.107、v0.108、v0.109、v0.110、v0.111；每个版本仅一项。各有 `version,sample_count,sample_denominator,collected_at,contains_player_identifiers=false,aggregates`。计数为正整数，分母不小于样本数；聚合中的实际表分母/缺失率仍由学习者复核。v0.111 与旧版本不混算。
- `aggregates` 只接受冻结 JSON 引用；`contracts` 是非空冻结引用列表，包含 #27/#28/#42 对应发布/回放合同。所有引用先核 SHA/字节，再按精确路径消费；契约更新需新冻结文件，不改在途字节。

聚合导出在入口之前由原 ops 使用显式安全列完成；入口不读取原始DB、玩家级明细或玩家标识。聚合JSON若出现玩家标识键或 columns/fields 中的标识列会拒收。此检查不能替代导出者的安全列审计。首两批若缺入场快照/幕末队列，需要另行安全聚合；已有拿牌/掉血表不自动满足这些字段。输入缺失或漂移保留错误与现场，不降级到普通选题。

## 顺序、身份与恢复

仍由原 learn tick、learn.lock、disk admission、账户/工作树lease和两个原 writer 槽派发。Roy 2026-10-24 晨更新（#51 6377338624）：有可派外部单元时，先派外部，再派自有经验更新、复盘和修复，不再交替。仅尚未启动的普通任务让位；既有运行任务与真实 writer/audit 租约不被抢占，普通待办不清空。外部未启用、没有可派输入或角色不符时，原正常流水线保持。第1/2/5项各自冻结成批，缺字段只限制对应特征/子项，不整批等待；实际候选、发布、消费者与科学父分开。

`external_priority_hold` 表示本次新派发让位；旧字段 `external_alternation_hold` 作为原消费者的兼容别名保留，不再表示交替。

批次使用真实 `strategy-proposal` ID、`reason=external`、`external_source` 与不可变 `external_binding`；单独 `strategy_external` 与 `strategy-external-progress.json` 记录。登记/请求档位不推进游标，只有核实同一批次、原账号原生会话/首次提示、高推理和 workspace-write 上下文后，才首次消费各 unit_id。重启tick不重复消费；未核启动、丢失进程、失败、waiting均保留。显式新generation还须核原会话退出或宿主零模型证据，单凭PID死亡不能重派。自动启动前失败重试仍沿原有限恢复，不扩展槽或重绑线程。

`strategy-external.md` 是专用模板；首两批分别追加 dual-boss/act-boss 小节以及冻结 work_spec。生成文件仍叫 strategy-proposal.md 以沿用原 scratch、报告和关闭流程；不加载旧四专题或普通自有局提证任务。候选文件只落本工作树 scratch，逐unit报告 processed/waiting。processed仅表示真实候选落盘；正式知识/策略/rk发布、原发布锁/回放门、消费者读回与自然采用仍按原流程推进，不因此关闭父要求。

## 启动档位与回执

只对已绑定的 Silent 外部批次，宿主传 `--service-tier fast`（Roy 2026-10-24 P0 6377773695：先恢复产出；ultrafast 暂停，原因另核）。启动器对原选定 learner Codex home 做一次有界 `account/rateLimits/read`，不使用无账户绑定的 ops 缓存；取所有有效周窗口的最大用量：严格 >70% 降 fast，严格 >85% 降 default 并追加 notes/for-roy 与原 ops queue 提醒；缺失/过期/失效读数请求 default 并报原 ops 核验。70与85这两个端点不提前降档。

请求经过 stdio/TUI 与原生包装器，只以 `-c service_tier="..."` 参数传入；包装器另核原外部登记。无新共用config、账号、服务档或权限。普通任务清除继承的外部标记，继续原 default 策略。读取额度期间失去原租约则不启动。

`<batch>.external-launch.json` 与 learner_launch 保留请求/有效请求档位、周读数、采样时刻与原因；这是请求凭据。原生 `turn_context.service_tier` 实际存在才记观察档位，缺失为unknown，不用请求值回填。进度投影保留原生证据SHA、实际开始/结束耗时、档位决策及原usage日志指针。真实token使用保留在原 learner_summary/TUI日志；ops按这些原件统计吞吐与档位用量，不把测试或参数当已上线/实际加速。

回退：原 ops 关闭外部队列的 enabled，保留在途批次及全部输入/回执/游标。已运行的会话不热切档位。开发交付仅跑tsc与定向测试，不启动full、真实模型或对局；合入和运行根启用交集成员/原ops。
