---
title: 原学习要求接续至经验入库
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
effort.codex: xhigh
---
# 原任务接续：学习、验证、经验入库和交付

这是同一学习者线程的后续输入。以下新授权和补充优先于旧轮的“只交报告”范围；旧报告、输入、失败、对局和台账历史均保留。
自己完成，不另派子agent。先读项目当前 AGENTS.md、docs/learning-protocol.md、docs/learning-code-proposals.md、docs/learning-requests.md。
游戏知识只能从本角色对局学，Roy要求的是认真检验问题，不是要求证明假设正确。若证据反驳原建议或与旧知识冲突，必须写出质疑、证据、旧知识ID、替代结论及建议，交ops→watcher→Roy；不静默忽略，也不将未经验证的观点硬写成事实。

## 原要求与逐项验收

{
  "schema": "learning-request-v1",
  "authorized_by": "Roy",
  "goal": "experience-live",
  "character": "silent",
  "original_batch": "20261016-050119-fix-batch",
  "worktree": ".worktrees/silent-boss-calibration",
  "thread_id": "01a1415e-a511-7131-be7c-a2dc691c847f",
  "learner_home": "/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex1/learner",
  "original_log": {
    "path": "learner/runs/20261016-050122-21c48aea-19f1-459a-b67e-e18af997b998-silent-boss-calibration.jsonl",
    "sha256": "5c4e88bbbedae97ebfa74d7b2345377ce72f2b3bc079d400ef7e17318ffc37dc"
  },
  "id": "roy-20261017-human-pace-h0",
  "parent_request_id": "roy-20261017-human-pace",
  "revision": 1,
  "authorization": "Roy 2026-10-17 09:49 CST via Claude, approved plan 54e36d0830ab640130557b62a078b25954912ff4; original ops received; H0 co-highest with silent-0332, H1 original watcher, H2+ unassigned.",
  "input": {
    "path": "paper/materials/20261017-human-pace-h0/learner-input-r1.md",
    "sha256": "982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54"
  },
  "requirements": [
    "h0-target-boss-mechanism-evidence",
    "h0-frozen-inputs-and-residual-diagnosis",
    "h0-evidence-backed-model-repair",
    "h0-fixed-split-recalibration-and-gates",
    "h0-live-experience-source-consumer",
    "h0-limitations-and-objections"
  ],
  "phase": "H0",
  "watcher_owner": "01a13dcd-83d4-7c63-b233-f93cf878ecf4",
  "priority": "Roy-20261017-H0-cohighest-with-silent-0332",
  "priority_via_existing_reconcile_before_ordinary_proposals": true,
  "co_priority_requests": [
    "silent-0332"
  ],
  "linked_parent_requests": [
    "roy-20261017-human-pace"
  ],
  "prior_completed_request": "roy-20261016-global-build-g1a",
  "frozen_manifest_sha256": "7bdcf916f6ff77e5ff1d88a58662a51a9b97aac4db380552470d2e66105cdb84"
}

## 已冻结的补充输入

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


## 上一阶段进度

初次接续，复用原报告并补剩余验收。

## 执行与交付

1. 核实原工作树、原报告及当前live差异；只在本工作树中开发，保留历史。需要时安全合入当前main，不能覆盖知识刷新。每项要求给出证据、方法、结果、限制；复用已验材料，不重跑全量历史或已通过测试。
2. 按原要求做实际计算、对照及证据核查。没有证据的判断保留未知；认真查完仍缺证时说明具体缺什么及下一步，用questioned/blocked回报，不能用“报告已交”关闭。
3. 学到的支持结论、限定结论或反证结论写进本角色experience.json，带证据局号、适用条件和置信度；去重合并已有经验。涉及出牌/药水/SL/终局的结论同时经learner/code_proposals.py登记或关联已有代码提案，遵守原并行所有权。
4. 实现已授权的必要适配；固定自测通过后合live，登记版本、decision-log和双通知，运维确认上线及ledger shipped。源码测试用现有沙箱入口；只有数据改动不造源码测试。不推送、不运行play、不重启对局、不读游戏二进制或凭据，不改ops prompt。
5. 保存实际消费者读取经验的回放或自然局证据。固定回放不冒充自然采用/胜率改善。回执至少含request_id、revision、character、experience_version、kind=fixed-consumer或natural-consumer、status=passed及evidence数组（每项{path,sha256}，保存实际探针输入/输出）；不能只手写passed。自然局效果仍另记待观察。
6. 报告和中间结果放在本工作树learner/runs下；不要修改notes/learning-requests、ops/codex-ops/learn.json或通知确认，注册/确认由ops和watcher负责。有充分证据的已授权修正可继续上线并通知，不因有异议一律等待用户批准。

最终用一个JSON代码块回报，保持strategy-proposal既有格式(task,character,fixes,merged,tests,code_proposals,implementation_domains,proposal_results,report)，并附learning_result：
- request_id、revision、input_sha256：逐字对应本次冻结输入。
- outcome：complete / continue / questioned / blocked；complete必须每项已进入live经验并有消费者读回证据。
- coverage：以requirements中每个ID为key，value是实际live经验引用数组，每项{id,sha256}。sha256算法为Python json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()的SHA256。
- consumer_receipt：{path,sha256}，指向上述真实消费者回执。
- questions：数组；每项含claim（原建议/旧知识）、finding（不同意见/冲突）、evidence（局号及材料）、recommendation，尽可能给existing_entry_ids。
- checkpoint：仅做完一阶段时，写具体新增产物、SHA、未完项及可执行下一步，outcome=continue。重复没有新增进度会自动报阻塞。
- reason：questioned/blocked的具体原因；不要把排队或退出0当已完成。

merged仅填实际live祖先的完整40位提交；无法合入就如实blocked并给ops固定源提交和错误。正确的否定/限定结论同样是学习成果，但必须入库且把异议通知Roy。不得伪造receipt或确认用户已收到。
