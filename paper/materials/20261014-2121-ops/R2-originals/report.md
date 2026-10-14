# 原固定输入未完参照接续报告

记录时间：2026-10-14T21:03:27.250336+08:00（写前已执行 date）。

结果：**complete**。跳过此前 50 组完整 1000 参照，本 attempt 新完成 4 组；累计 54/54，未完 0。30 道原题保留：27 数值支持、3 结构不支持。

仅执行冻结 resume.mjs 的唯一 attempt `ops-20261014-202300-r2`。原报告/failed/rc0/null、616 与 184 部分组及截止后回复未改写或拼接。本轮不重做原 11 秒测量、不合 main、不更新源码/模型/知识/配置/种子/候选。

本 WT HEAD `40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57`；使用原生产快照 `093c68ac658980f53b9940756b3df925adfb49bb` / tree `cc740ccd201c51fb3dde6dabbe79cff35ce08fa6`。225 原件和 205 派生 JS 由冻结清单绑定，本轮重新核 SHA，不把刷新后的生产状态替代原基线。

启动时间：2026-10-14T20:25:33+0800；资源窗 130 分钟，实际 elapsed 28.34 分钟，nice 19 / 单 Node / 4 worker。生产最低 300、目标 1000、11 秒、24 worker 原值保留，离线耗时不是生产 24 worker 重现。

原分层 13 低 / 3 零 / 11 DPR / 3 无 DPR，以及全部 offered/skip/remove/upgrade、合法性标识和不支持原因保留。原 365 offered、310 数值支持原候选、55 不支持、362 展开数值键及 26 当前 gate 不可用项保持。路线/内部 journal 缺失边界沿用冻结登记，不猜坐标或未记录历史。

## 每题真实进度

|题目|来源|offered/数值键|seed7参照|seed20261014参照|
|---|---|---:|---|---|
|41ab7b9a-3ae0-45c5-8094-7183f41207e5|LKC9YXKZWTKR F19 reward/card|5/5|1000|1000|
|d98f1d44-2b13-44f5-9c55-300d78211c4a|32VSST9UX7MN F2 reward/card|4/4|1000|1000|
|b2aab20d-e0b1-48bf-befa-9f3ba04f7e82|YP428GT9ZLL3 F6 reward/card|4/4|1000|1000|
|72f3b88e-7e04-4da1-92c6-ecdf3c7c4a1a|WA7FRJ7UABCV F17 reward/card|4/0|不支持|不支持|
|ad0a4679-fe21-4f94-860f-a3ff9218e975|4U3WNL3JRRCX F19 reward/card|4/4|1000|1000|
|f11d4d91-0185-4fb1-abe3-4a894d7380bc|1269Y20SKHUM F33 reward/card|4/0|不支持|不支持|
|e76fe23a-fc90-4c1d-84df-d55fba0c1413|E5L15SK6ZHZB F35 reward/card|4/4|1000|1000|
|85470380-9835-42ea-9204-2f6f190e00e0|YP428GT9ZLL3 F14 reward/card|4/4|1000|1000|
|f3cc6eaa-3b1c-4e9a-8d29-1ed1b7217937|4YPGHGJD393H F2 reward/card|4/4|1000|1000|
|c496f8db-2a9d-476a-9e3d-0d4b1f4f9a48|8AGEGLG40SV3 F2 reward/card|4/4|1000|1000|
|57c76043-d985-4161-a835-682881c6305b|1269Y20SKHUM F47 rest/plan|21/21|1000|1000|
|7db570b5-db49-46e2-b9ba-107955726a79|32VSST9UX7MN F27 rest/plan|19/19|1000|1000|
|1e4f3831-110f-4266-b507-f9b6ba2f5238|WA7FRJ7UABCV F32 rest/plan|17/17|1000|1000|
|e5b1c402-bab3-4f7a-b518-eedfd5512975|E5L15SK6ZHZB F32 rest/plan|20/20|1000|1000|
|4ca80dad-edf5-4242-90bf-e60dae3df647|6ZGMGEQ5YDVK F40 rest/plan|17/17|1000|1000|
|c8df4f70-dd1b-4931-8476-e712cd63aeeb|8AGEGLG40SV3 F16 rest/plan|17/17|1000|1000|
|eaa7cf27-ce3b-466e-8ca2-8ba9fd36a74a|Q9FM7A80E4BZ F13 rest/plan|15/15|1000|1000|
|9c4485fe-5e66-4eeb-89a7-9ae6875cc42c|EEVP0QTLMSX9 F32 rest/plan|13/13|1000|1000|
|df919f2c-e22d-49ff-883d-ec4749d35ed0|EEVP0QTLMSX9 F40 shop/plan|18/32|1000|1000|
|1765c568-77cb-4401-b2c7-174ff84a9658|E5L15SK6ZHZB F9 shop/plan|17/7|1000|1000|
|a99e6bca-c1cb-4ffe-8abc-0d409eb3b2db|32VSST9UX7MN F6 shop/plan|17/17|1000|1000|
|a59f70f7-886e-411e-91c7-2c0f26f21899|LKC9YXKZWTKR F5 shop/plan|16/16|1000|1000|
|8a4e3d81-ad1d-4988-9b3b-d076d1b15c82|4U3WNL3JRRCX F29 shop/plan|17/30|1000|1000|
|5c258cc4-4fd2-43c9-beaf-71ed175868f8|6ZGMGEQ5YDVK F31 shop/plan|16/10|1000|1000|
|8346108e-f972-427b-a448-d2852b0e6dfd|1269Y20SKHUM F40 selection/remove|25/25|1000|1000|
|a64050d1-557f-4746-bcbe-f5ef7925c1fc|LKC9YXKZWTKR F46 selection/remove|25/25|1000|1000|
|a3972427-a5e0-4b04-ac7d-d2069888fd11|1269Y20SKHUM F44 selection/remove|25/25|1000|1000|
|2e4d4c83-93df-4965-98f4-2074fbce59b2|LKC9YXKZWTKR F23 event/choose|4/0|不支持|不支持|
|3e158b45-2504-465a-a0e3-4a15330b43c4|YP428GT9ZLL3 F1 event/choose|3/1|1000|1000|
|0c2e148c-e10c-4788-9dc7-a19772732d42|WA7FRJ7UABCV F43 event/choose|2/2|1000|1000|

## 分母、误差与 profiling

每个完整组的原 0..999 IDs 与所有数值候选计算交集均验证为 1000；这不等于每个候选有 1000 完整终局 DPR。逐候选 DPR、胜/死、HP/轮数、逐轮递减分母、capped/time_up、paired 差/SE 与未配对数保存在完整 quantitative 结果及 analysis-progress.json。缺测量保留不可用，未跑样本不补 0 或伪造完成。

原 11 秒与完整参照同 ID 对照共 54 组；同顺序时数值不一致 0，有可用 DPR 的点估计首位变化 13 组。不同击杀顺序、截止选中 ID 子集/其余 ID、无完整终局 DPR 排序不可用均分列；独立重复 seed 的排序及均值 Monte Carlo SE 保存，不当行为建议。

1000 只检查冻结模型内收敛，不是真实胜率、实轨机制校准或已执行候选。原 11 秒门槛通过率仍为 seed7 4/27、repeat 5/27（全 30 题为 4/30、5/30）；没有重测。90% 是支持固定集工程目标，不是已测覆盖率或胜率。

本 attempt 捕获 6 个阶段，raw replies、每 deck/order 分母与 IDs、order-search/comparison、queue/preparation/first-reply/chunk/cold-warm、worker policyNodes/Turns、fight wall、GC 及耗时清单保存于 profiling-manifest.json。solver 独立 wall 未隔离；fight wall 是各 worker 的累计 wall，包含求解和 transition，不是本 attempt 的 elapsed。原 main_cpu_us 实为整个 Node 进程 CPU（包含 worker），不称主线程独立 CPU。观测压缩开销保留，无生产 24 worker 外推。

核 1236 个原文件最终 SHA 与启动前一致。原失败、原源码和所有部分结果保留。原 checkpoint 与本 attempt checkpoint 各自独立 SHA 记录。

原 616 与 184 部分组另存同 ID 对照于 prior-partial-comparison-index.json：重现原部分统计、逐候选配对差/SE、完整参照在原部分 IDs 与其余 IDs 上的分母/指标分开。此前中断的 comparison 请求未交付击杀顺序元数据，明确未知，不猜相同顺序或把部分结果拼成完整参照。

初次 JSON 回复与 V8 对象直比出现 617/529 个对象差异，全部定位到 coreWindow: undefined 的属性存在性：原 JSON 省略该字段，V8 保留。初次原件保留于 partial-comparisons-initial，严格确认其余原字段相等，再按原 JSON 编码对比后数值差异为 0；原部分统计严格重现，DPR/HP/轮数配对差也为 0。没有修改模拟规则或放松样本完成断言。

补充诊断时 apply_patch 一次写入失败，读取原文件确认未应用后，按授权用 shell 写入相同 scratch 文件；错误保留于 edit-failure.log。

## 接续边界

R3 实轨校准仍沿 061302 原 owner；量化 P1/P2 沿 024317 原 owner。未读取或回放新 Jev pilot 的 144 请求，不把它混入原 30 题，不跳准确率/收益门禁，也不关闭 R3/R4 或宽父。没有机制学习、规则拟合、代码提案、通知 ACK 或源码发布。

源码未变，tsc/vitest/cases 三个 null，merged=null；没有自己的新提交需要 gitleaks 扫描，不借旧自测或宿主套件冒称本轮通过。完整 JSON 在 result.json，各清单绑定真实路径及 SHA。
