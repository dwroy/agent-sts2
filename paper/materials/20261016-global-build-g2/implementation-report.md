# G2 shadow 源实现交付范围

当前是 Roy 经 Claude 收窄后的两项派活之一，原父 `roy-20261016-global-build`、原 owner `01a13dcd-83d4-7c63-b233-f93cf878ecf4` 保留；没有 Codex goal。这里只实现 shadow 与固定测试，后续自然验收、on、G3/G5 等待 Claude/herdr 明确派发。

源码在隔离 `global-build-g2-shadow-20261016`，直接继承 S shadow source `655e1bb7967dcd9161eee96fe35cad2257e7af40`，没有重做 S 实现。16 个新增/修改文件及逐字节 SHA、staged tree 见 `source-validation/source-before-full.json`。当前源 full 仍运行，源提交、main/live、宿主完成均不先认定。

实现包含 Silent/精确进阶的观察池、可见 Boss 优先、同题配对前缀和未知传播，复用现有 runner/C2、独立 memo 名空间及本局历史，接在原 B3 成功记录之后。只增加 `boss_sim.global_build` 与 run-config 字段、原 module_health 报告，不加入题面或 P2 排序。补充 lane 的进展回调及 120 秒无进展守卫沿现有 runner；原 C1 失败/降级、当前 B3 采样和 C2 完成线保持。新 future lane 胜率为主，S 只计算记录，不用于裁剪/排序。

第三幕质量闸及当前生产可信度不合格/未知，目标记录为 unknown；最终连战在 G1a 自然消费闸前不接入。没有未来奖励、回血或牌组成长模型，后续幕只评估当前 HP/牌组/资源的条件快照。观察池含重试，只是观察频率，不是游戏生成概率。完整汇总因未知阶段为 null，已知子集单列；快照概率乘积不称真实整局联合率，零基准比值不补 epsilon。

固定验证：`wired-fixed-r1` 的 tsc0、8 个未变文件 47 个 TS case0；其新增高层夹具的角色防混用/闭包身份比较失败原件保留。仅调整新测试的夹具构造和序列化比较，`wired-fixed-r3` tsc0、12 个高层 case0，覆盖奖励/休息/升级/商店题面与 off 逐字相等、当前 C1/C2/P2 记录相等、其他角色 worker 请求相等，以及新 lane 失败不替换原已完成题目。观察器/纯聚合测试另覆盖池来源、同进阶隔离、实际身份优先、成对前缀、伪造 complete_adaptive 拒绝、零基准、缓存失效和本局历史。`global-build-health` 包含 4 个 Python 固定用例，区分 unknown、重复观察、缓存耗时及服务失败。

健康报告按真实 observation_id 去重，分别给补充计算、缓存命中和 future target 的 wall-clock p50/p90；`boss_sim.ms` 仍只计原当前 B3，合并等待耗时另写 `b3_plus_shadow_wall_ms`。本次没有自然运行样本，因此生产 p50/p90、卡局率、自然采用及胜率收益均未知。原来的两完整自然 shadow 与实际后继 Boss 对照仍是后续 on 门槛，不在本轮执行。

唯一完整检查以 `source-validation/full.json` 真实终局为准。不得用 S 源或旧组合的全检结果代替 G2 新树；原固定失败不删除、不修改时限，不重跑未变源 full。之后如交原 ops 集成，应独立于 S 行为发布，保知识/并行记录和当前局；不得自行开启 on 或下一阶段。


## 2026-10-16 13:08:46 CST 精度边界修正

S键shadow已由原ops持锁实际发布V5-R369，source655e1bb→main8ecbe935/live1ddaba4b/treecb2128，行为5e89b118；本人13叶/源祖先/统一编号/根双通知逐SHA读回，live config仅历史Roy/Dai文字差保留，原075726精确宿主RUN pending，不借旧绿。G2复核发现仅新聚合器将四位小数配对差加到精确前缀基准可能越0/1，13:06只停自己原Vitest PID4046312并保full143/292.81s，未动ops宿主；改为读取选项自身前缀概率、Σ项用原配对差，补0/1边界题。最新tsc0、5 G2文件30项/内含4Python0，新16叶treec19c9c从13:07:58唯一full-r2/session94174运行。原失败/精确中断源/新固定结果分目录保持；无G2提交或上线声称，不做新阶段/自然等待。

最终冻结清单改为 `source-validation-r2/source-before-full.json`，原 `source-validation/full.json` 明确 rc143。当前5个G2文件30个TS项及4个Python用例均通过；另4个未变相邻文件30个TS项沿已有固定回执。原测试夹具错误及本次中断均保持，full-r2仍pending。


## 2026-10-16 13:32:05 CST 实际源检查终局

本轮两项窄派活源实现/检查交付：S已实际R369/source655e1bb→live1ddaba4b/treecb2128，原075726 canonical tsc/vitest0、491文件4930过2跳/1241.67s与原logSHA9d9bfd逐字核，源full1/原题补验0仍保留。G2仅shadow sourcee9922a6008b35c3b4427c423830f015252a3bcde/treec19c9c，tsc0、最终497文件4962过2跳/1158.06s，16叶和staged tree全程未变，gitleaks0；原full143及旧夹具失败原件保持。精确源已交原ops串行窄集成/新组合宿主，不预称main/live或借R369绿。第三幕/最终连战/生产校准/自然p50p90仍unknown；G2自然0，后续on及G3/G5等待Claude/herdr，无Codex goal/新观察器。cf9d71a363c299b6d24ae236来源勘误本人读原文/runs/报告并明确告知Roy，两个watcher CLI0，只更正7Z A7→A10来源，不改机制/账本claim或代Roy ACK。S回收complete注册因config历史文字叶差保留，未强制清理。
