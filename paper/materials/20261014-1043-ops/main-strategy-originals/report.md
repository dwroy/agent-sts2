# 静默策略批次报告：20261014-100836-strategy-proposal

时间：2026-10-14T10:24:15+08:00。

10个原提案全部完成本轮核验，处置均waiting。没有新源码/知识修改、提交、合入或行为版本，fixes=[]、merged=null。

base：`935059cc107780c1e4c9f8846ea84a5b123a3ffb`。逐项局号、层、回合、账本、反例、预期行为与验证方法见[proposal.md](/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-100836/learner/runs/20261014-100853-strategy-proposal/proposal.md)；逐项处置见proposal-results.json。

完整提取15局的9815状态、9448决策、78条SL记录，19341原行逐offset/bytes/SHA读回相同。10局派发锚点与5局原提案补证分列，实际范围不冒称全历史。26个已有经验引用均找到；9局42狡诈饮用重新按原帧验证，添刀3/2/0分别37/2/3次。油灯三局17窗口支持首次放大，静态遗物字段无法判已消费。

现有audit-selection消费者：12个A10完整输入中7个返回0、5个因合计6条map/route-change缺decision_id拒绝；拒绝原件保留。只按原物理行分割11个连续合法片段，不补ID、不跨缺行续链。共18个合法输入返回0，6819动作、1387题段，2378相邻观测端点/4441未知；1168整轮窗口含374可核端点/794未知。完整候选结果保持null，是尚未认证归属，不能解释为未执行或没有任何方案完成。A1/A7/A9三局不改A10消费者门禁，仅核原提案指定历史机制。

固定材料检查25项通过；包括TX少损3同时少扣9、WQ付9血多15净扣与付4血延长沙坑、NHA付6血多16净扣、KEN七实饮/两真实回复、TX首胜4→下场0、Q6紧勒逐牌与毒分源。这些是原材料核验，不是生产源码测试或独立胜率验证。

当前已发布源码七子项的完整40位commit、实际live祖先及source/base/live blob见live-source-verification.json。只读live快照为`9c18d0bbe4dc9017f1297b5757410d7123347a72`；部分文件source/base/live blob不同，不泛称全部等价；宽提案缺口仍保留，不把旧子项登记成本批implemented/duplicate。

|原提案|处置与具体缺口|
|---|---|
|silent-proposal-08eaa60bcc449852|waiting：七次饮用与两次真实回复已核；缺同资源、同牌序的不饮用或留药到boss完整对照，无法校准持药价格。|
|silent-proposal-92920295a648b540|waiting：三试资源链已核；缺保持后轮牌序与资源条件的连续通关替线，不能据局部保血改SL资格或终局权重。|
|silent-proposal-a327449c331efbc1|waiting：T9付9血多15净扣、T7付4血延长沙坑已核；缺两条截止边界的完整受控后继及独立胜局，不能拟固定血伤阈值。|
|silent-proposal-a099e89437e942bb|waiting：3/2/0生成及逐步手位已有live实现6403fdcdadc803a092beb5165a068e22bf51c412；缺完整穿插派发、跨轮保留与SL恢复的消费者验证，整项继续waiting。|
|silent-proposal-47910f82a1fdd98f|waiting：开场扣4及连战接续已有live实现e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a；宽项缺SL血价、留药、路线预算的受控后继及未知回血/复活组合顺序。|
|silent-proposal-f1374df72d8e6a25|waiting：Q6早喝候选未完整执行，1913营火条件改变；缺隔离机制误差、同预算完整后继与未用/早用/留药对照，不能改药价或终局权重。|
|silent-proposal-38a49e6c97f31eea|waiting：普通无挡紧勒已有live实现5c7105ff0294466da8319f2934beda05c6040794；多机制宽项仍缺联合消费者重放、来源拆分及隔离机制误差后的整战验证。|
|silent-proposal-ef0e38a5dbd3bc07|waiting：实际休息、锻造与胜战损血链已核；缺另选营火、前序事件血价、早用药或换路线的完整受控结果，不能校准路线血价与能力终局权重。|
|silent-proposal-7f820c02d39bfaea|waiting：多16净扣付6血、两敌均活且六试败已核；现有预测比较已实现，缺独立成对后继胜负及同预算饱和排序校准，不能改探索门槛。|
|silent-proposal-04b6b430759815ed|waiting：精确切击与蟹朝向分别已有live祖先8b9bacbebb20eaaa1133a9945da6c7abfcda745d、ec29ea34b919344b707e57ba472ea210f9c39d62；油灯首次消费跨动作/新战/SL追踪和能力完整后继仍未验证，宽项waiting。|

没有源码修改，tsc/vitest/cases固定为null；未做撤源码失败与恢复通过，不冒造测试成功、合入或发布号。没有新增代码提案ID；code_proposals沿用本批10个原CLI ID，domains说明审计涉及范围。31个关联原账本只经根ledger.py追加本轮追溯链接，不改claim/status/version/evidence，不标shipped，队列最终状态由调度器消费proposal_results。

初稿与失败保留：初次抽样打印非战斗combat=null出现TypeError；固定数值初稿误把首COMBAT当完成开场结算、TX F43实际70/70断言失败，已改以ready=true可操作帧及F49终态核验，没有改原证据。油灯静态字段帧数初稿误写289，已按实际提取501修正，初稿保留。5个完整输入的consumer拒绝和分段恢复各有独立回执。

消费者六执行文件在base与上述live快照的blob完全相同，各最后源码提交均为该live祖先；见consumer-source-verification.json。实际消费者返回0只验证它在这些输入上的读取范围，不等同完整候选执行或策略收益。

原生thread `01a1382b-908b-78c1-9062-c57d901ff509`的turn_context实际为gpt-6.1-sol/xhigh、workspace-write、approval never；模板high不代表实际已切换。未降低强度、未新建模型会话、未派下级。session-identity.json保存所读元数据，未读取凭据。

经验库沉淀、自然消费者采用与策略收益不在本报告中冒称完成；无新反证改写旧知识，无规则上线通知或eval版本。所有缺数据保留待新局重派，原宽要求保持。最终JSON见report.json，完成核验见completion-validation.json。
