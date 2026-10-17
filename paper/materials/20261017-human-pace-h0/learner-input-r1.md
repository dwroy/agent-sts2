# H0：从实盘定位第三幕/最终 Boss 模型偏差并修正、重新校准

请求 roy-20261017-human-pace-h0 / revision 1；父 roy-20261017-human-pace。
Roy 2026-10-17 09:49 CST 批准 docs/human-pace-plan.md（commit 54e36d0830ab640130557b62a078b25954912ff4），Claude 逐项派活，原ops于 2026-10-17 09:57:17 CST 实际接收并冻结。冻结清单：paper/materials/20261017-human-pace-h0/inputs-r1/manifest.json，SHA256 7bdcf916f6ff77e5ff1d88a58662a51a9b97aac4db380552470d2e66105cdb84。这是新批准 H0 的原 Boss 校准 owner/thread 接续；旧 G1a 已完成记录原样保留，不重开旧研究父、不热改旧 revision。

## 问题与证据边界

Roy 要求检验 boss-trust.json 的失败项：TEST_SUBJECT、AEONGLASS、QUEEN、KAISER_CRAB、KNOWLEDGE_DEMON、THE_INSATIABLE。失败指标是诊断线索，不是开发补写的游戏机制或必须支持的假设。逐 Boss 的冻结 B2/T1、B3/pre、样本数、原失败原因和原 criteria 见 inputs-r1/{main,live}-boss-trust.json 与 model-input-boundaries.json。人类描述名与原表名有差别时自行核对原战斗身份，不由ops添加映射事实。允许反证、异议、部分修正和证据不足。

1. 从已结束 SILENT 实盘按 run/进阶/Boss/层/attempt/turn/代码与数据版本提取原帧，逐项保存原 path/offset/len/SHA；SL 试次不增加独立局分母。核对招式/目标/阶段/伤害结算与资源逐轮轨迹，定位首次模型—日志分歧。缺完整输入、真实结算或后继帧就明确缺口，不凭rationale或汇总比例猜机制。
2. 复用既有 docs/boss-sim.md、learner/tasks/silent-boss-calibration.md、agent/tools/boss-sim 与原 G1a 已核材料。先比对固定旧校准的 simulator_base/model/data 指纹与本轮生产边界，不以旧 R366 校准表证明当前生产可信，也不把全库版本变化当经验对象改变。现有冻结叶是各自观测，不是运行全树原子快照；log-source-bounds.json 是元数据/尾段 SHA，不冒全前缀 SHA。只读指定 cut 以内已完整结束的本角色证据；新追加数据另列下一轮，不热改本输入。
3. 游戏知识必须由你从证据得出，每条附局号/回合；支持、限定、反证经验均去重进入 Silent 经验与 CLI 账本。对证据支持的招式/机制建模错误作针对性源码修正、固定回归；不得只堆样本或为过闸改预测标签、门槛/系数/验证分组。其他角色与未观察条件保持等价；共用怪物模型必须给隔离与等价证据。
4. 修正后的新对象沿原固定 split/tuning keys/Platt/B2/B3 校准流程重新校准，验证集不用来拟合；旧固定样本与旧结果能复用则复用，不重复未变 full 或旧全历史模拟。确有新源/输入后才运行必要重新校准，nice19、至多4进程，不安装依赖、不调用真实游戏/额外模型 API。逐 Boss 报修前/后 Brier、预测/实胜差、穿透比、验证独立场数、缺失与 A0–4/A5–9/A10 残差。原 criteria 必须保留：min_fights=10、Brier<=整体1.25倍、胜率差<=0.15、leak在[0.7,1.3]；原 B2 T1/B3 pre 起点不变。达标才准入，不承诺全部一定能过。F49/联合率及未修目标缺证保持 low-trust/unknown，不能拿单 Boss 的改善替代连战验收。

## H1 与 silent-0332 边界及优先级

H0 与 silent-0332 同列最优先，走既有 learning_requests reconcile 和最多两个策略槽，不抢占运行任务/扩槽。0332 原 owner/thread/revision3 和失败历史保持；其完整资源封套、缺失原输入及根修复不因本 H0 关闭。H0 若发现共享叶/锁/证据依赖冲突，立即明确给ops，以便告知Roy，不静默覆盖0332或宣称已解决资源问题。

H1 已由原 watcher 在 .worktrees/human-pace-h1-20261017 实现时间预算/B2B3有限前缀/C2/C1/低可信采样/SL计算复用/L2截止；H0只修证据支持的伤害/招式模型，不实现或夹带 H1 的预算、采样策略、SL/药水规则、排序/题面调整。H1 新预算模式未来是否可用本轮校准必须分列适用边界，不冒本轮全样本校准覆盖未发布的部分采样。H2+未派，不启用S新排序/新构筑阶段。撤回的0e4f暂停源禁止带入；不改当前局、home/账号/模型/prompt/env，不运行play/重启/新自然监听。

## 六项交付与闭环

- h0-target-boss-mechanism-evidence：六目标逐项原帧、机制分歧/反证或具体缺口。
- h0-frozen-inputs-and-residual-diagnosis：旧固定校准与当前生产逐SHA边界、分组残差与首次分歧。
- h0-evidence-backed-model-repair：实际证据支持的修正/固定测试/角色隔离；不能修的列原因，不虚构源码。
- h0-fixed-split-recalibration-and-gates：新对象原流程逐Boss B2/B3四闸实测，低可信与unknown保留。
- h0-live-experience-source-consumer：真实 live 经验/源码祖先、逐对象 canonical SHA、账本/提案及实际固定消费者输入输出回执。
- h0-limitations-and-objections：与旧知识/原建议差异、限制和下一步；原文与证据经ops→watcher→Roy各自真实回执，不代ACK。

按 learning-followup.md 的 learning_result 协议回报 request_id/revision/input_sha256，coverage 按上述 requirements 引用实际 live 经验对象。无实际入库/消费者不报 complete；questioned/blocked/continue写具体可执行缺口。程序 completed 也不等于 H0 全目标可信/自然验收，更不关闭0332或human-pace宽父。不要把报告/退出0/merge为空误当研究失败或自动再开模型。

先核本原WT干净与当前main/live差异，保并行知识/记录/index；必要适配自测后沿原 live 锁流程，不另设人工审核，提交/合入受阻给ops精确源及失败原件。行为发布由ops核实际commit分配独立release_id、根规则双通知与唯一精确新组合宿主检查，不能借旧树绿。所有源 full/补验各自rc原样保留，不改原断言/时限凑绿。

权限仍原学习者workspace-write/networkfalse/never；gpt-6.1-sol/xhigh普通服务档保持且核实际请求；禁止读凭据、游戏二进制、其他角色知识，禁止改ops prompt、注册文件或角色ACK。所有中间产物在原WT scratch，根ledger/提案仅原CLI例外。
