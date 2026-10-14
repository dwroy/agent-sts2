# 原 V5 固定题复验 R1/R2 接续报告

记录时间：2026-10-14T15:26:19.965448+08:00（写前已由 shell 执行 date）。

本轮结果：**continue**。30 道冻结题保留，27 道数值支持，3 道结构不支持，缺失必需数值输入 0；54/54 组 11 秒测量完成，1000 配对参照完成 24/54 组。

此轮是 114302 已批准后继阶段。原 1dd 五叶已由 ops 精确集成；旧报告、failed/rc0/null、五共享记录冲突和旧范围结论均未改写。没有重查旧修复队列。

## 冻结输入与当前模型

- 本 WT 基线：`40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57`；实际 live 冻结源码：`093c68ac658980f53b9940756b3df925adfb49bb`；tree：`cc740ccd201c51fb3dde6dabbe79cff35ce08fa6`。
- 保存 225 个原件，WT/live 有 62 项 SHA 差异，其中源码 52 项；逐项列于 model-manifest.json。测量使用 live 原件，不用 WT 较旧源码或旧 7e1193 模型。
- 直接解压并核 150 个 r2 原压缩/解压 SHA；未重新抽日志。24 个 strict choice 与 6 个商店尾部 leave 使用已接受绑定，旧 r1 失败保留在原位置。
- 原分层：13 低样本、3 零样本、11 DPR、3 无 DPR；题目和种子均未按新结果挑换。原 offered 共 365 个，26 个当前 gate 不可用商店候选保留；310 个原候选支持数值，55 个原候选不支持数值，共展开 362 个数值键。支持题仅表示至少一个原候选受模型支持，不冒称每个 offered 都有 DPR。
- 原 rendered journal、逐题 prior plan/SL 原件保留。数值路线恢复读取原 payload 或原 journal 的剩余房型；未记录坐标明确未知。无坐标题的 row 仅作为保序 ahead 过滤占位，派生 floor 标签不是已核实路线节点，HP 投影只消费原剩余房型。全部题的内部 journal 历史并非完整重建，不复原无记录 transient cache 或历史 dirty 树。route-recovery-audit.json 单列这一边界。
- 公开生产配置与当前源码分列：配置取最后公开 Silent run-config，代码标签可能早于冻结 HEAD；未读取运行进程私有状态或凭据。只保存本角色、通用 knowledge 与 game-data。
- esbuild 离线转译；仅增加私有 adapter 检查导出及委托原 fightSample 的被动耗时/GC 观测。原 TS 完整保留，数值模型未修改；编译及初次 V8 字节等价检查失败原件保留于 initial-validation-failure 和 compile-*failure.log。V8 字节不等来自对象共享表示，严格值等价 2 样本通过。27 题请求构造严格值等价另有 same-input-audit.json。

## 11 秒实际结果

|种子|达到原 300 配对门槛|支持题覆盖|全部固定题覆盖|零完整配对|1000 参照已完成|
|---|---:|---:|---:|---:|---:|
|7|4|4/27|4/30|2|24/27|
|20261014|5|5/27|5/30|1|0/27|

≥90% 仍是固定集工程目标，不是本轮已测覆盖或真实胜率。生产 300 最低/1000 目标/11000ms/24 worker 规则未变。所有离线模拟 nice，单个进程最多 4 simulation worker；本轮不是生产 24 worker 的吞吐重现。

## 每题进度（分母保持 30）

|题目|来源|offered / 数值展开|支持性|seed7：11秒 / 1000参照|seed20261014：11秒 / 1000参照|
|---|---|---:|---|---|---|
|41ab7b9a-3ae0-45c5-8094-7183f41207e5|LKC9YXKZWTKR F19 reward/card|5 / 5|supported|16 / 1000|115 / pending|
|d98f1d44-2b13-44f5-9c55-300d78211c4a|32VSST9UX7MN F2 reward/card|4 / 4|supported|554 / 1000|581 / pending|
|b2aab20d-e0b1-48bf-befa-9f3ba04f7e82|YP428GT9ZLL3 F6 reward/card|4 / 4|supported|37 / 1000|37 / pending|
|72f3b88e-7e04-4da1-92c6-ecdf3c7c4a1a|WA7FRJ7UABCV F17 reward/card|4 / 0|structurally_unsupported|不支持|不支持|
|ad0a4679-fe21-4f94-860f-a3ff9218e975|4U3WNL3JRRCX F19 reward/card|4 / 4|supported|701 / 1000|730 / pending|
|f11d4d91-0185-4fb1-abe3-4a894d7380bc|1269Y20SKHUM F33 reward/card|4 / 0|structurally_unsupported|不支持|不支持|
|e76fe23a-fc90-4c1d-84df-d55fba0c1413|E5L15SK6ZHZB F35 reward/card|4 / 4|supported|49 / 1000|117 / pending|
|85470380-9835-42ea-9204-2f6f190e00e0|YP428GT9ZLL3 F14 reward/card|4 / 4|supported|23 / 1000|34 / pending|
|f3cc6eaa-3b1c-4e9a-8d29-1ed1b7217937|4YPGHGJD393H F2 reward/card|4 / 4|supported|916 / 1000|1000 / pending|
|c496f8db-2a9d-476a-9e3d-0d4b1f4f9a48|8AGEGLG40SV3 F2 reward/card|4 / 4|supported|31 / 1000|51 / pending|
|57c76043-d985-4161-a835-682881c6305b|1269Y20SKHUM F47 rest/plan|21 / 21|supported|8 / 1000|8 / pending|
|7db570b5-db49-46e2-b9ba-107955726a79|32VSST9UX7MN F27 rest/plan|19 / 19|supported|104 / 1000|136 / pending|
|1e4f3831-110f-4266-b507-f9b6ba2f5238|WA7FRJ7UABCV F32 rest/plan|17 / 17|supported|8 / 1000|16 / pending|
|e5b1c402-bab3-4f7a-b518-eedfd5512975|E5L15SK6ZHZB F32 rest/plan|20 / 20|supported|40 / 1000|48 / pending|
|4ca80dad-edf5-4242-90bf-e60dae3df647|6ZGMGEQ5YDVK F40 rest/plan|17 / 17|supported|136 / 1000|144 / pending|
|c8df4f70-dd1b-4931-8476-e712cd63aeeb|8AGEGLG40SV3 F16 rest/plan|17 / 17|supported|0 / 1000|2 / pending|
|eaa7cf27-ce3b-466e-8ca2-8ba9fd36a74a|Q9FM7A80E4BZ F13 rest/plan|15 / 15|supported|121 / 1000|160 / pending|
|9c4485fe-5e66-4eeb-89a7-9ae6875cc42c|EEVP0QTLMSX9 F32 rest/plan|13 / 13|supported|167 / 1000|264 / pending|
|df919f2c-e22d-49ff-883d-ec4749d35ed0|EEVP0QTLMSX9 F40 shop/plan|18 / 32|supported|0 / 1000|0 / pending|
|1765c568-77cb-4401-b2c7-174ff84a9658|E5L15SK6ZHZB F9 shop/plan|17 / 7|supported|174 / 1000|328 / pending|
|a99e6bca-c1cb-4ffe-8abc-0d409eb3b2db|32VSST9UX7MN F6 shop/plan|17 / 17|supported|136 / 1000|136 / pending|
|a59f70f7-886e-411e-91c7-2c0f26f21899|LKC9YXKZWTKR F5 shop/plan|16 / 16|supported|256 / 1000|296 / pending|
|8a4e3d81-ad1d-4988-9b3b-d076d1b15c82|4U3WNL3JRRCX F29 shop/plan|17 / 30|supported|88 / 1000|96 / pending|
|5c258cc4-4fd2-43c9-beaf-71ed175868f8|6ZGMGEQ5YDVK F31 shop/plan|16 / 10|supported|143 / 1000|190 / pending|
|8346108e-f972-427b-a448-d2852b0e6dfd|1269Y20SKHUM F40 selection/remove|25 / 25|supported|8 / 1000|8 / pending|
|a64050d1-557f-4746-bcbe-f5ef7925c1fc|LKC9YXKZWTKR F46 selection/remove|25 / 25|supported|19 / 1000|8 / pending|
|a3972427-a5e0-4b04-ac7d-d2069888fd11|1269Y20SKHUM F44 selection/remove|25 / 25|supported|8 / 中断：已观察 616（目标1000，未交付完整参考）|1 / pending|
|2e4d4c83-93df-4965-98f4-2074fbce59b2|LKC9YXKZWTKR F23 event/choose|4 / 0|structurally_unsupported|不支持|不支持|
|3e158b45-2504-465a-a0e3-4a15330b43c4|YP428GT9ZLL3 F1 event/choose|3 / 1|supported|488 / pending|533 / pending|
|0c2e148c-e10c-4788-9dc7-a19772732d42|WA7FRJ7UABCV F43 event/choose|2 / 2|supported|109 / pending|116 / pending|

逐候选 DPR、胜/死分母、paired difference/SE、未配对、capped/time_up、HP/回合/逐轮分母、候选排序完整存于 results、analysis-progress 和 analysis/*paired-budget.json。partial-results 另存截止后回复及资源中断的真实候选完成数与指标，不替换原 deadline 交付。native 全候选完成交集与 terminal DPR 分母分开，0 完成的统计不可用；未跑样本在 lossless V8 中保持 undefined，不伪造结果。未选方案均为条件模拟，不是实际执行。

已完成对照 24 组；同顺序共享样本数值差异总数 0，可比较点估计首位变化 4 组。无完整终局 DPR 的排序标为不可用，不把空排序当稳定。分列不同击杀顺序、原截止 IDs 在 1000 参照中的子集、其他 IDs，避免将策略顺序差异与截止样本选择混为一项。1000 只检模型内收敛，不是实盘真相或胜率校准。

## Profiling、失败及限制

保留每阶段 order-search/comparison 原预算、实际分母、queue/preparation/first reply/chunk/冷暖/load，截止后返回单列。worker 记录实际 policyNodes/policyTurns、fightSample wall 与 GC，主线程 GC 另列；solver 与 transition 的独立 wall 未隔离，不用合计 fight wall 冒称纯 solver 时间。process.cpuUsage 的原字段 main_cpu_us 实为整个 Node 进程累计 CPU（包含 worker），不等同主线程 CPU。观测和压缩存在开销，没有无观测对照或生产 24 worker 外推。
本轮预登记资源界限 130 分钟；运行结束 checkpoint 实际 elapsed 130.00 分钟。资源界限仅限制本次离线任务时长，没有扩模拟期限或缩短整场。未完成参考的真实回复和进度保留，不把部分样本填成 1000。

## 可执行接续

仅在原测量已结束后执行，使用同一快照和冻结 seed，跳过已完成 1000 组；未完参考在新 attempt 从全部原 IDs 重算，保留旧 partial，不将其拼成完整结果：

```bash
cd /home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-114302
date
export PATH=$HOME/.local/node/bin:$PATH
export TMPDIR=/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-114302/learner/runs/20261014-123935-fix-batch
nice -n 19 node /home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-114302/learner/runs/20261014-123935-fix-batch/resume.mjs r1 --verify-only
nice -n 19 node /home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-114302/learner/runs/20261014-123935-fix-batch/resume.mjs r1
```

同一个 attempt ID 不可覆盖；如已有现场，使用新的 ID。原固定集顺序不换题，不启动第二并发模拟池。R3 实轨校准仍归 061302 原 owner；宽 P1/P2 归 024317 原 owner，R4 等价优化、自然采用和收益仍待后续证据。

## 源码、测试与合入

本轮没有 repository source 修改或新提交；scratch adapter、快照、数据和失败原件保留。git 工作区干净。tsc/vitest/cases 均为 null，未借用旧 3816 或宿主套件；无自己的新提交需扫描或合入。merged=null 表示本轮未产生源码发布，不倒改原 1dd 集成状态。没有代码提案或机制规则修改。

完整机器回报：result.json；所有输入/模型/种子/结果/profiling 文件及 SHA 由清单相互绑定。补充输入 bb429a… 为启动器冻结 binding，本地新 input-manifest 的实际 SHA 单列，不冒充同一文件。
