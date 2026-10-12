# 本批静默猎手提案消费与证据核验

记录时间：2026-10-12T21:13:07+08:00（先执行date）。批次：20261012-210134-s2-strategy-proposal。base：e859c259ff4514fc4d84a00e7a55ebe8a5f2f357。

本批仅处理已领取的10个原id。reason=proposal、character=silent、worktree完全匹配，无research_request/implementation_request；普通专题文件绑定另一批，未承接该专题。开工git status干净，git merge --no-edit main为Already up to date。未另选fix-queue或新增代码提案id。

结果：一个限定取整提案已有live实现，记duplicate；九个完整提案waiting。没有新增生产源码、知识、提交、合入、版本或shipped。所有判断只用本角色原始对局；16个相关局号在runs.jsonl唯一且角色为SILENT，其中15局有本批原始帧核验，K367仅核身份和原提案来源，不重报该历史帧结论。

## 共同方法、边界与回退

逐份原Markdown校SHA；账本最终用官方fold，只处理25条相关silent账本。用既有偏移索引回读只读logs的原始字节，核局号/角色/哈希后才计算。主索引3352状态、3746决策，28项关键断言；额外容量125条原记录、42饮与底值52条原记录、26观测，去重总计7222条、126157021字节。以上是证据核验数量，不是独立对局或生产测试数。

原源码dirty树无法复原，历史预测据当时原题面；当前源码只证明现有消费者。六局resource_chain直接消费原帧，另108项候选/容量/开场断言通过；本次未传SL事件时间，因此restart检测不代表SL事件全量闭合，缺出口/未分类仍未知。没有重新全历史拟合，也没有采用其他角色知识。

原局用于发现与固定回放；同局多次SL归一组，不当独立样本。当前证据不足的价值/胜率参数不拟合；后续必须以独立局、时间前后划分训练和留出，不把本次回放称后移实战验证。只核现有实现的有限边界，不把缺证变成已验证规则。

当前源码已提供的诊断/局部公式保持；本批无新上线，无须回退live或增加规则通知。将来若有新证据实现单项规则，按独立提交、固定红绿、原沙箱检查与live流程发布；回退仅撤该实际提交，保留原证据和并行记录。旧取整修复若需回退，应由运维回退实际源ec29ea34b的限定变更；本批没有部署它。

## silent-proposal-08eaa60bcc449852 — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md（本批按登记SHA保存原字节）。

证据与账本：KEN58SH9SLZ6 A10 F3T2/F4T1/F5T2/F11T1–2/F15T1；F5 states280255→280285：53→16；F15 states280347→280381：46→46、两药变空；F12/F16真实回复26→53、46→75。账本 silent-0019/0020。

原规则、现状与反例：赢战净损与药栏变化可由当前 resource_chain 分列，SL重启与正常回复分开。已喝两药的零损胜战不证明不喝也零损。

处置：缺同入口不饮药或留药到boss的完整后继对照；不能由F15零损校准持药价。

预期行为及验证：保留原持药规则；未来同入口完整后继中核实际耗药、退出HP、恢复与boss入口，按独立局和时间留出验证。

## silent-proposal-92920295a648b540 — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md（本批按登记SHA保存原字节）。

证据与账本：TXZ6RVMQA09D A10 F48第二/三次T6，states281479→281484、281535→281539；F49 states281563–281566。账本 silent-0228/0255。

原规则、现状与反例：原线损3/扣36，替线损0/扣27；首胜4血，后场开局4→0。后轮抽牌与生成牌不同，三次尝试只是一局。已有连续boss目标及开场子项，不应重做。

处置：缺相同抽序及后续动作受控的连续通关对照；少损3同时少伤9不能用于校准SL或终局权重。

预期行为及验证：保留连战目标与严格SL判据；新增独立局需记录首胜出口、后战开场后可操作资源及两战最终结局。

## silent-proposal-a327449c331efbc1 — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md（本批按登记SHA保存原字节）。

证据与账本：WQZVENQ7DTRP A10 F33第二/三次T9，states282075→282079、282144→282148，同指纹；T7原282066→282072、末试282330→282336。账本 silent-0079/0018。

原规则、现状与反例：T9原线损13/扣24，替线损22/扣39。反例T7原线损0/扣24，替线损4/扣24，动作后沙坑4→5。当前候选比较保留HP、伤害、沙坑及未知抽牌，并明确不是实得收益。

处置：缺完整受控后继和独立后移胜负样本；不能把9血换15伤拟成阈值，付4血延长沙坑的反例也不支持一律保血。

预期行为及验证：保持探索门槛；未来同时检验血量与沙坑边界、实际击杀推进和完整后继。

## silent-proposal-a099e89437e942bb — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md（本批按登记SHA保存原字节）。

证据与账本：02HB4L0C3C67、4D4J8USKCPAV、F4QKG4J1AJJZ、JLN5SK17W4FQ、LS8035TB32P3、NB8KCF6HRGVF、S9UZAK0JP0C0、SADL3CGYTGSR、WQZVENQ7DTRP；42次逐饮的进阶/层/回合见capacity-history-observations.json。重点WQ A10 F33第五/六次T11；账本 silent-0030/0257/0258。

原规则、现状与反例：本次重新核原字节：37次添3、2次添2、3次满手添0；新增升级小刀基础6，耗瓶与HP/能量分账。容量和同轮出刀穿插已有6403fdcdadc803a092beb5165a068e22bf51c412实际live祖先。

处置：容量42饮已核，但缺计划妥当跨轮保留选择、饮药复合触发及完整后继验证；不能用同轮生成子项关闭宽提案。

预期行为及验证：保留现容量模型与未知组合说明；用完整保留/饮药/重规划/实际续步链核消费，再用独立整战检验收益。

## silent-proposal-47910f82a1fdd98f — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md（本批按登记SHA保存原字节）。

证据与账本：TXZ6RVMQA09D A10 F43/45/46/48/49开场70→66、52→48、62→58、60→56、4→0；WQZVENQ7DTRP F33T7/T9同上。账本 silent-0018/0019/0020/0021/0025/0079/0198/0228/0255。

原规则、现状与反例：五个开场帧均未出牌。e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a已实现限定新战斗4血开场，实际T1和SL恢复盘面不重复扣；未知遗物或自动复活组合保留未建模。

处置：缺未知回复/复活组合的中间相位，以及SL血价和留药的完整后继；不能把有限开场子项当作全部资源策略完成。

预期行为及验证：保留开场边界和已有连战规则；后续补可追溯触发顺序、消耗复活与完整连战结果，不预支未来能力。

## silent-proposal-f1374df72d8e6a25 — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md（本批按登记SHA保存原字节）。

证据与账本：Q6M2Y34MWKRE A10 F2T1/T3、F7/F8T1–8/F9T2；1913SE84AXQF A10 F24/F28/F29/F31。账本 silent-0019/0020/0050/0253。

原规则、现状与反例：Q6休息36→57、骇鳗胜57→2、F9死亡；F2早饮双挡候选未完整实打，不能当作已获得12血。1913 F24锻造、F28回21、F29损15、F31入口46，路线条件改变。

处置：缺同入口早饮/留药及相同营火条件的完整后继；当前观测不足调整高血护栏、药价或终局权重。

预期行为及验证：只核实际资源链，区分持续/临时药效及未执行候选；后续独立局验证完整出口与后战需求。

## silent-proposal-38a49e6c97f31eea — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md（本批按登记SHA保存原字节）。

证据与账本：Q6M2Y34MWKRE A10 F8T4 states282887–282892：敌103/95/85/85/83/80；Y6GM2CHWJBEY A0 F4T1（原提案明确历史支持）；1913SE84AXQF A10 F31T2–4。账本 silent-0006/0011/0025/0044/0050/0064/0133/0253/0259/0261/0262。

原规则、现状与反例：普通紧勒5c7105ff0294466da8319f2934beda05c6040794与重接清旧毒/力0970bc0d112718d45c8ebf86ff7f84e0f36a7498均为live祖先。死亡端点不说明内部每击顺序，复活抵消后的净伤不等总伤。

处置：宽机制包仍缺致死轮逐击中间相位、复活/反伤和阈值/SL组合验证；不能由紧勒和重接子项关闭整包。

预期行为及验证：保留已证分支；补完整逐击/复活/消耗事件再验证组合，不据整战失败修改未观察规则。

## silent-proposal-ef0e38a5dbd3bc07 — waiting

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md（本批按登记SHA保存原字节）。

证据与账本：Q6M2Y34MWKRE A10 F7回血/F8胜后2血/F9T2死；1913SE84AXQF A10 F24锻造/F28回血/F29胜后46/F31入口46。账本 silent-0019/0020/0021。

原规则、现状与反例：当前resource_chain重算六局，保留restart_observed、missing_exit与unclassified，不把预测营火或未触发能力当实得。不同动作条件下的路线投影不能称同条件误差。

处置：缺同入口换线、休息/锻造和用药的完整后继对照；两条败局资源链不足校准统一路线或终局门槛。

预期行为及验证：保留原权重，未来按实际动作与相同前提比较完整资源链及后战结局。

## silent-proposal-cfecb5580938873d — duplicate

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-back-attack-rounding.md（本批按登记SHA保存原字节）。

证据与账本：NHA2KW0RB7VP A10 F33T2六对原帧：已有力量−2/虚弱1，碾碎爪转向1→2；15挡29→22、16挡29→23。JLN5SK17W4FQ/S9UZAK0JP0C0 F33T2无减益4/6、T7力量3下7/10，S9T7弱1下5/7；LS8035TB32P3 F33T2缩小2/4作排除。账本 silent-0263/0264/0265。

原规则、现状与反例：旧floor(shown×1.5)在显示1时少算1。源ec29ea34b919344b707e57ba472ea210f9c39d62已保留弱后分数，最后按朝向取整，限定Silent/A10/本招、已观察力量与增益、两体存活及可追溯本阶非估计base4；数据库n=1即可启用。未知组合不外推。

处置：限定取整提案已有实际live祖先源码ec29ea34b919344b707e57ba472ea210f9c39d62；当前原帧固定回放10项通过，专用源码/测试/证据文件与原提交一致。旧waiting为当时合入冲突，现按真实部署更新为duplicate。

预期行为及验证：本批不重复实现或发布；当前测试含六次转向、15/16挡出口、正力量虚弱、未观察角色/等级/增益/缺库反例及后续模拟轮清标记。未证明胜率改善。

## silent-proposal-7f820c02d39bfaea — waiting

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md（本批按登记SHA保存原字节）。

证据与账本：NHA2KW0RB7VP A10 F33第1/5/6次T1，states283391→283397、283478→283483、283502→283507；decisions277248/277250/277272/277274。账本 silent-0079。

原规则、现状与反例：原线14挡/损1/跨轮净扣8，替线8挡/损7/净扣24，均未击杀；精确切击被弃后重规划，候选不等完整实打。抱抱先生后轮自动扣血另计。已有候选比较与派发审计，但全死样本不证明血价相同。

处置：缺同抽序受控完整后继、可追溯击杀/存活推进与独立胜负样本；不能由多付6血、多16净伤确定SL筛选门槛。

预期行为及验证：保留探索门槛与预测/实际分列；取整修复不等于SL选择已验证。
