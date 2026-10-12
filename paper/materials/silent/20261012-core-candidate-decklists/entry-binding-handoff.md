# 候选牌表报告入口绑定接续（只补执行入口）

请求：roy-20261012-concrete-core-decklists；父项：roy-20261011-silent-core-cycle-quantitative-learning。Roy 已授权报告学习；主 ops 已完成去重及材料冻结，当前 actual_batch=null，尚无学习者启动。本文件只描述执行入口和验收，不提供任何牌表或游戏判断。

固定任务：paper/materials/silent/20261012-core-candidate-decklists/task.md，SHA256 `436e46aee5d46231bd5e3df3f823591ae63221f50839dad31fcd63afee2f3ab7`。
冻结材料：paper/materials/silent/20261012-core-candidate-decklists/input-manifest.json，SHA256 `fac03bfc31e88dbc828fc1c3c70bf126718c5297c127d6dc84ffdede19d63963`。31份原学习者报告/计算/候选/覆盖及相邻要求，按 manifest 的 role 继承；原任务文档仅作上下文，实际执行范围以此次冻结 task 为准。

已核原owner：历史核心报告和195/201/204局研究已有报告；量化原批20261011-221722为done，接续20261012-024317保留failed和部分源码上线记录。131301两个策略批仍在原工作树运行，与本新增报告无相同request ID；当前两策略槽均占用。不得抢占、续开旧done或复派旧失败来承载本项。

现有入口缺口（源码核对及实际broker exit2见 paper/materials/20261012-1325-ops/dispatch-attempt.json）：
- ops/codex-ops-actions.sh:223–228 仅接收两个旧request ID或已结束局ID，拒绝本新ID。
- ops/strategy_research_jobs.py:REQUEST_PATHS 只有三项旧研究；ops/strategy_implementation_jobs.py / ops/learner_jobs.py:dispatch_write 只认旧量化父项与旧接续。
- ops/codex-ops-learner.sh:18–29 未注册本ID；原全历史core_build_jobs限定旧请求/全历史验收；ops-assist明确不是学习者，不适用于生成牌表。

请开发会话在原策略学习入口补一个报告型请求绑定，交付以下行为：
1. 保持唯一request ID与上述冻结SHA，挂原量化父项；复用learn.lock、原策略槽位/冷却及owner工作树规则。忙时持久pending，下一空槽仅认领一次；重复调用返回同一实际批次，不新增同内容任务。保留旧队列、租约、失败历史，不改旧任务或输入。
2. 使用原学习者runner、默认模型/强度/超时、原隔离home/沙箱和key预检，不扩大权限或借用只读辅助。准备独立批次工作树，注册actual batch、owner绝对路径、源码基线与任务/输入SHA之后才启动模型；原默认超时作为有界上限照实写回执。不开新调度器，不启动play。
3. 本子项只读既有报告和本角色证据，报告与新必要的固定离线计算产物留在其scratch；复用已过结果，仅计算冻结task要求的新明确问题。后台nice19、至多4进程，未知字段不补游戏常识，不重扫全部历史/重跑已过全套。此次不改生产源码/经验/规则/运维prompt。
4. 完成时沿原队列送回主ops：request/parent/actual batch/输入SHA/owner/退出码、报告绝对路径和SHA、候选牌表/对照/证据索引各自路径和SHA、已验证/局部/缺证限制。验收以task五项交付的实质或明确缺证为准；queued、rc0或文件存在不能替代报告完成。保留失败原件，不自动关闭父项、旧失败或P1/P2全部需求。
5. 先回填实际启动与输入绑定；最终完成由ops核实并向Roy提供中文便览及报告路径。入口源按原开发/学习者自测和main/live流程，不新增学习内容审核。

这是一次具体的新补充交付，不能修改旧报告的结论、候选、原冻结SHA、源码提交或失败历史。相邻P1/P2及watcher最近5局消费审计归入本子项验收映射，后来的原子补充单独留SHA，不另派重复全历史研究。
