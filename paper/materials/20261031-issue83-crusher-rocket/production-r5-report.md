# #83 P0 生产窄修与工具 r4 组合交付

主管原件 83/6543650548；原集成员已在 83/6543677604 确认 r4 未 submit 且独立请求作废。固定基线 f2d8e742776751620a675fae168c04b4323421f7。本次原自有工程检查已完成（pipeline rc0），固定 HEAD 以包含本报告的保留分支为准，实际集成/发布仍由原 owner 执行。

## 修复及证据边界

自有 first-tune 9TG1RP5LFAAK F33 T7→T8，Rocket 出牌结束时仍活、敌方回合毒杀后 Crusher 已获得力量 +6/格挡 99。turn-solver 的结果正确；applyPlan 随后按出招清格挡，令下一玩家回合误见 0。本批在共享 applyPlan 保留这一种已核晚触发的新格挡，整场 simulateFight 和 5 回合 rolloutDecision 同时受修复。

签名严格限 Silent、A10、第二幕、两个存活敌人 Crusher/Rocket、219/209 最大血量、双方 Rage=1、Crusher 当前 Enlarge 且原格挡 0；solver 结果须是 Rocket 0HP、Crusher 存活且刚得 +6/99；重放出牌步骤必须完整且无未知/待选择，Rocket 在出牌后仍活而毒足以致死。存在额外不可核回合末伤害时不适用。卡牌提前杀死、A9、错误幕/血量、无 Rage、别的出招、无毒、禁用标记均保持旧路径；下一敌方回合格挡照常过期。不改 A8 另案 1HP，不扩大角色或 Boss。

## 生产入口

- B3 构筑 `act_boss_sim`/选项 `boss_sim`：withBossSim → compareOptions/BuildSimPool（SIM_ADAPTIVE 为采样分配分支）→ fightSample → simulateFight → applyPlan。
- B2 局中整场：bossLineSim → runLines/adaptive → boss-lines-worker → fightSample → simulateFight → applyPlan。
- 5 回合：rolloutDecision → simulate(fullFight=false) → applyPlan，同一种 reset 同签名修复。
- 单回合 solveTurn 已正确算出 +6/99，本批没有改它。

实际 LIVE 只读回查详 production-impact-readback.json。低可信入口的题面显示/排名限制仍按原消费者；不把“调用计算”写成所有自然题都展示了该数字，也不将本工程样本视为胜率收益。

## 与 r4 合并的工具差量

包含 c7e4252a 的双蟹 Boss/条目选择和合法 target:null 离线回放适配。其他 r3 叶已由原集成采用，不重复部署。当前生产叶 ROOT 5、LIVE 3，精确 SHA 见 production-r5-deployment-map.json。依赖声明按 main caa8a545 规范化，仅 v6-history、silent-boss-calibration 两方法受本批三个源码叶影响，其余 11 方法核同；实际集成须鲜核并保留 #77/#87 及其他 owner 的后继变更，不整文件覆盖新登记。

## 检查状态

定向 50 项（22 项新整场/短程 rollout API 正负 guard +28 项选择测试；guard 用 horizon=2 捕获紧邻下一题面，生产 5 回合走同一 applyPlan）、producer/consumer 54 项已经通过。唯一工程 pipeline 已注册原 dev 资源入口；已完成 tsc rc0、sandbox 653 文件/6076 项全绿（1425.53s）、paths 1 文件/11 项全绿（3.61s），事务 rc0，8 个冻结源码/测试/声明叶前后 SHA 核同；本批自有 full 仅这一次。238 行/3 seed 对差只有 9TG T7 三行变化（下一板 Crusher 格挡 0→99），其余 235 行逐字对象一致；差量逐路径和原日志 SHA 见 production-r5-checks.json。最初定向检查曾因测试回调 structuredClone 含 deadlineNow 函数报 DataCloneError；只修测试快照去掉时钟字段后 50 项通过，原红日志 targeted.log 与后继 targeted-r2/r3.log 均保，未把此失败当生产差异。原单独等待请求 full=0 退出 143 的替换回执保存在 .artifacts/issue83/production-repair/queued-full-replacement.json，不是重跑已执行的 full。

B3 回放预先固定 first-tune 入场资源，受控 skip 构筑题（不是原自然构筑题），32 samples/seed7、before 源归档2a43add7a vs 本批 after；通过真实 withBossSim 格式化读取 act_boss_sim/record.base，不调用大脑、不变参数、不挑后验题。两个视图的全部 569 个共用知识 JSON 逐字节核同（本树额外 25 文件是其他角色/外部与构建数据，不计本题输入），catalog 显式用同一冻结 SHA。固定题前后数值相同：raw 胜率 0，现有映射 win_cal=0.3118，hp_loss_won=null，平均 turns=4，boss_left=294.5。act_boss_sim 全对象和选项格式分别保在 production-r5-B3-before/after.json；未另挑题，不将此工程题当自然效果或收益证明，也不能用相同读数否认签名状态 bug。

## 发布与其他工作

工程排序 #77 → #87（固定请求 issue87-r1，集成员现按 main159cfa750 规范化）→ 本组合 HEAD → #86 A1，原集成员核收/原 ops 发布；开发不改 live、STOP 或生产开关。V6_COMBAT_ENTRIES 保持 off，模型参数、概率映射和可信准入标准均未改；回退由原事务回退本批三个 LIVE 源叶及对应 ROOT 叶到其记录的鲜核 preimage，保其他 owner 的并行发布，不重置整个分支。

C 仍为 2ea70cb1 固定预注册的唯一 raw 候选、已看过 val 的一次复验。首跑因隔离 catalog 缺失零输出 rc1，原件完整保；83/6544100940 批准仅恢复 SHA8973610b 的 catalog 后手动重跑一次，已准备、待合并批之后启动，不借工程批换候选/seed/val；再失败停报，通过也先报 Roy。以后源码交付以合并批组合检查为最终 full，不再自开 full。机制事实由 6eeb9f2f 正常候选另账发布；原 ops 已于 83/6544040936 回实际 K1-0924d4ea 与两 ID 工具读回，开发逐份核原件 SHA，见 ops-K1-and-epochA-readback.json。自然采用及父验收继续。

原 Aeonglass 研究源/测试及 patch 已完整停放在 .artifacts/issue83/production-repair/prior-research/ 并留 receipt；本工程批没有混入，不能用旧文件覆盖窄修。
