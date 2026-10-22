# high + #40：R412 组合交 ops 发布

2026-10-22T19:53:48+08:00：候选 `326d5636f974c57b1a594ae78d75d68feaba838c`，tree `4fd9abc0af1a7227879f765d20e3a0947069764c`，相对实际 live/R412 `b9c9fdfdc3a8eb823ba274fa2b5022f38e85a1aa` 仅29代码/测试路径。分支 integrator-high40-compat-20261022 已通过 Windows SSH 推送并核远端 SHA。集成员未修改生产、暂停或发布编号；由原 ops 实际发布。

按主管 #40 comment6339963519 和 Roy 本轮提醒，复用 bb1c16 完整结果，R412 只做定向检查。原始回执与逐项 SHA 见 review.json、pre-r412-review.json、prepared-r412.json。

- bb1c16 完整检查19:25:29→19:48:36，tsc0/full0，637文件、6010过2跳0败；1640是含嵌套suite数。2488冻结输入前后相同，462份原实际live知识核同。原件 full-timeout-compatible-first/；旧源码提交62ccce2bb0d98fc94d76018e056d621f471dd39c。
- R412 新组合19:50:52→19:50:58，生产tsc0；策略库、catalog消费者、#40增量管线三个测试文件14项通过，内层Python固定管线12项及catalog5项通过。兼容策略消费者对真实5711B策略执行3正例、每项5错配/未知与4其他角色隔离、5题面字节回放、2条2992B预算均通过。没有调用模型、执行游戏动作或运行训练。
- 独立隔离fixture使用候选 refresh_driver.main 的真实 catalog step 执行候选 build-catalog，复现R412来源行，策略字节不变。仅空的固定角色运行列表隔离训练分支，实际生产刷新、首局自然采用及尚未发布的 #33 knowledge-tool 不在本回执范围。原件 targeted-r412-first/catalog-pipeline-readback.json。
- 新2489冻结输入前后同；相对被复用full，差异严格只有 eval/versions.json、knowledge/catalog.json 和新增 knowledge/characters/silent/strategy-entries.json，所有运行源码和测试原字节保持。29交付预像在旧/新live核同。463份知识在K→L短锁内与实际live、冻结快照和候选逐项核同，释放锁后提交。新增策略SHA 9df3740b4254daade365a4c3cf48b25b2d840e9f656bcda50e64735a79b3d95e，其他461JSON旧字节保留。
- 原ops27叶full1（6008过6败2跳）、459699的full1（6009过1败2跳）、18:46漏带知识而18:56主动中断/143均原件保留，不改写为绿。运行源码与原失败9e53树相同；仅4测试叶修版本/前件错配及测试watchdog。唯一status=null原失败没有spawn错误记录，5秒超时只记疑似；修复保全部断言，child watchdog5s→10s并抛spawn错误，37项定向通过后另跑上述full。旧四项未发布wrapper前件仍保留main，不冒称在窄live组合通过。

交原 ops：采用326d5636f的29路径清单和上述分层回执，不重复full。旧27/28叶或0cd硬编码脚本不能重放。沿原最新知识、精确预像、绑定及自然边界门发布，仅交付29代码路径，保留R412策略/catalog/versions及独立知识、日志、账号、绑定。按主管最新明确指令，由ops发布后解除Roy检查窗口暂停；其它角色/运行限制按原restoration_context核实，集成员不解除。原ops分配release_id、登记decision-log/versions、双通知；首局读回high/codex3、增量刷新消费者/模型SHA和cold/warm/training/锁耗时，科学父保持open。代码变化必须重新评估适用范围。

此窄live候选不能整包合main，以免回退main其它功能。原feature早已合main；这次watchdog测试修补须在后续main集成中精确核入，当前仍待；下次必要完整检查覆盖。#35须保整包#33/#26门和#40共享测试，旧67叶未准入；#28未提交合并准备、#37/#36静态冲突核对均不代完整检查，顺序仍high→40→35→28→37→36。#20heavy保持off。

#27三项限制已实读并向Roy转达，正式CLI兼容阻塞保留，未代填ACK、不声称Roy已读。首三条现已独立发布V6-R412，#42实际合入后才由ops续第二批；自然命中与科学父不因上线关闭。历史通知/原生字节及SHA见issue27-notice-intake/；最新实际发布读回见r412-issue27-readback.json。
