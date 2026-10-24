# #50 终局目标与本局计划开发交付

开发范围为 issue 第 1–3 条：Silent A10 从第一幕明确双 Boss 终局目标，每道大脑构筑题随原请求更新计划，幕末自然构筑题明确答检查点。第 4 条知识达标线沿 ops 已登记的 #48 首批 `issue48-boss-elite-001`，本候选不新增知识条目、不复用 issue 中的旧分母。

原基线 `3f6320d78eaeaf57b93961a6ce2c4947219e261b`。先接入已冻结 #49 源提交 `6290300d8ba6fe170706aa1e7fea7c0ff53f4173`，本树对应 `3c263a24a`；唯一冲突为 decision-log 追加段，两侧记录均保留。#50 源码独立在它之后交付，集成员可沿已审 #49 顺序接入，不能把本树依赖重放当 #49 已 main/live 发布。#35 已在基线 main，GitHub 状态仍 waiting-release，实际发布由原 ops 核实。

实现合同见 `docs/endgame-plan.md`。新增 `run_plan.endgame` 六个非空文本字段和条件检查点，每字段上限 240 Unicode 字符；严格 schema 及实际答案校验均覆盖。采用原运行计划解析、screen memory、run-plans/journal 持久化与下一题 `facts.your_run_plan`；没有 facts 的题沿既有 previous_plan 位置显示。第一次可以没有旧计划；正常答案必有新计划。重启加载原日志，向更早层回退排除未来层，不把同层假设当已确认构筑选择；#35 原差分/SL链继续负责实际动作。

检查点为当前幕 Boss 前两层的适用题：F15–16、F31–32、F46–47；不在幕中、Boss 当层奖励、战斗选牌出现。没有自然对应题不制造模型请求。适用范围内每题更新取代旧地图独立运行计划请求，独立于旧 RUN_PLAN/MERGE 开关；不改工具数、调用/时间预算或 Jev 战斗执行，原构筑/方向条件保留。其他角色、其他进阶与历史适配器沿原链路。

固定验证：

- 生产 tsc 退出 0；`tsc-final.log`。
- 定向 7 文件 / 104 项通过；`targeted-final.log`。覆盖第一幕目标、全构筑标签、三幕检查点正反例、必填/长度/strict schema、Codex 与 DeepSeek 的早幕及第二幕末三题连续更新、下一题读回、进程重启、#35短理由、#49线索/14工具和原 Boss 计算门。测试用固定完成计算记录、脚本化答案与内存 ModClient，未联网模型/游戏；Silent 原构筑 shadow 的模拟 Jev 请求仍每题一次。
- 初次夹具未供原 Boss 计算结果导致两项超时；第二次缺原 construction 字段；第三次误把原构筑 shadow 调用也断言为零。三轮均退出 1，结果及原日志/原生会话保留，未改生产门禁为测试放行。第四次 5 文件 / 63 项通过，扩展后最终 7 文件 / 104 项通过。
- 原 sandbox 脚本启动后发现 shell + with-temp + Vitest 合计三进程，精准终止本树 Vitest PID，退出 143；没有终止其他会话。随后按脚本原排除名单直接执行单 worker Vitest，利用原 vitest.config.ts 的独立临时目录以满足 ≤2 进程；原 argv 在 `sandbox-direct-argv.json`，检查终局另记。沙箱外完整联合检查仍由集成员/ops 沿原流程负责。

沙箱终局为分批核验：原大批退出 1，617 文件 / 5651 项中 5649 通过、2 失败；`ordinary-close-isolation` 原 Python spawnSync 15秒限时后 status=null，`check-imports` 缺稀疏树未展开的 #29 历史材料。恢复 `HEAD:paper/materials/issue29-brain-speed/results.jsonl` 原字节后，独立按原命令重跑这两个文件退出 0 / 2 项通过（原 Python 用例 13.921 秒，未改超时或断言）。历史材料 Git blob 与 HEAD 同为 `b84d95c5185941eec143cbcf2966d5770309cca5`，没有新增或修改该证据。原脚本第二阶段 `paths` 单 fork 退出 0 / 11 项通过。大批的原失败仍保留，不称整条原命令退出 0；相同源码的全部沙箱用例已有通过记录。未重跑 23分钟大批，不拿这个分批结果代替沙箱外完整联合检查。见 `sandbox-direct.log`、`sandbox-recheck.log`、`paths.log` 及 `checks.json`。

输入冻结 `input-manifest.json`：2251 个源码/固定测试/知识叶 SHA，最终逐项复核均未变化，基线与依赖分开。后补历史材料单独记录 SHA，不冒称一开始已展开。它只标识检查输入，不据此声称知识成立、消费者自然采用或实际发布。

自然验收交接：

- 沿原发布锁核真实 live 与最新知识，先落实 #49 和 #35 发布依赖，再按自然开局边界发布本差量、登记 release_id、decision-log 和规则变更双通知。
- 冻结首批自然局的原脑日志和局号，运行既有 `brain-agent-report.ts`，读新增 `endgame_groups` 的按引擎/幕非空率、更新率和检查点回答数；再用 question_id 核 run-plans 落盘及下一题实际内容，不能仅凭 accepted 替代读回。
- F48 / F49 到达与结果按同角色/进阶/脑来源、首试/SL/最终结果分列，未结束与缺失保持未知，不抄 issue 旧分母；不做 A/B、不额外开局。
- #48 学习达标线实际上线、来源与独立样本数、真实消费者与收益仍开放。本开发交付不关闭 issue 或科学父要求。

回退只撤本 #50 源码差量，保留 #49 / #35 和原日志；旧解析器忽略新增 endgame 字段。本会话不合 main/live、不改 STOP、不操作其他会话、不登记未实际发布的 release_id，也不申请自身工作树回收。
