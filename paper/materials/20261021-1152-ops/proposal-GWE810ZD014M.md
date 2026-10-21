# GWE810ZD014M 静默猎手A10代码提案

来源任务：postmortem；本批目录：/home/dw/Projects/agent-sts2/learner/runs/20261021-111306-e35f946f-318e-40c4-b79a-93cc27f607e0-postmortem。实现任务：strategy-proposal（CLI登记后待原调度器派发，本复盘不启动实现会话）。

关联账本：silent-0348, silent-0023, silent-0119。仅本角色A10证据，不借其他角色或未观察进阶。授权：Roy-2026-10-07-learning；本任务只记录，不修改源码/规则。

证据与观察：


## GWE810ZD014M（A10，静默猎手，第39层，死于组装师 FABRICATOR／噪音机器人 NOISEBOT／守护机器人 GUARDBOT／戳刺机器人 STABBOT／电击机器人 ZAPBOT：39/76血带毒药水进场，T7仅3血5挡对12＋13＝25攻击，完整需损20、存活差18血，本体终态32/155血）



- [清掉旧机器人以后仍需核新召唤；打法（Jev出牌）] 组装师 FABRICATOR活着时继续补体；T5已只剩本体56血，原题明确提示FABRICATE_MOVE后新增个体未纳入rollout，随后T6又见20血噪音机器人 NOISEBOT与18血戳刺机器人 STABBOT，T7再有守护 GUARDBOT和电击 ZAPBOT。不能把T5旧体清空或3/8模拟胜当作整战已覆盖；新增数量、固定概率和唯一杀序仍未知。（之前学过：silent-0348，S1.exp-backlog1）

- [后建余像的逐牌挡只能支付后续当前威胁；打法（Jev出牌）] T6以4血建立余像 AFTERIMAGE／触媒 ACCELERANT／毒雾+ NOXIOUS_FUMES，最终11挡仍损1。T7余像五次手动出牌带来可见1点一档的累计挡，末5挡、3血；Jev先集中电击机器人 ZAPBOT使其退场，仍有戳刺12与本体13攻击。不能把已建三能力当作额外血量或整场可存活证明。（之前学过：silent-0023，S1.exp199）

- [空药栏新增敏捷不会追补已经取得的挡；打法（代码兜底用药、Jev此前出牌）] 末回合Jev预算耗尽（原错误human-pace budget exhausted: Jev），代码兜底先打击 STRIKE_SILENT噪音机器人 NOISEBOT，再向该体饮毒药水 POISON_POTION。药槽由最后一瓶到空时腰带扣 BELT_BUCKLE令敏捷0→2，但格挡仍5，不能把空槽2敏加到先前已出的牌上。该药确实饮用，不是丢弃；噪音体当时4血／旧3毒，结束后退场而两攻击者仍在，不从未执行换目标分支声称可赢。（之前见过：silent-0119）



- [记录] 大脑实际Codex：早取毒雾、紧勒 STRANGLE、弹跳药瓶 BOUNCING_FLASK、余像、触媒，后补后空翻、毒雾升级；F31买腰带扣 BELT_BUCKLE及技能药水 SKILL_POTION，以空药栏敏捷支持毒防是当时理由。F33知识恶魔 KNOWLEDGE_DEMON虽胜却78→2，进入F34事件时已62血；F35咬人卷轴 SCROLL_OF_BITING胜62→46且max78→76，F36战斗好伙伴 BATTLE_FRIEND_V1胜46→46，F38虔诚雕刻师 DEVOTED_SCULPTOR胜46→39并耗槽1格挡药水 BLOCK_POTION，F39才39血携槽0毒药开战。F34原话“接受首轮接管换持续能量，走零精英双火线保血备战连王。”，未到未来营火；低语耳环 WHISPERING_EARRING接管T1，不把该段自动动作算作Jev选线。最后一次休息题F32即时hp_after_heal=78/78，F33实到78，后续伤害逐段见资源表。 j74190 F39T5完整题给结束回合与未建模毒药直饮两候选；Jev0.64选plan1，chosen=end_turn且completed，但题面已明确召唤未覆盖。后继实见新增机器人，不能把3/8短窗胜当自然胜。j74198 F39T7完整单步题无answers而有预算耗尽error；精确decision_id=187d91d6-5ab0-44ba-8d25-a3a91a6efdda回执是代码打击噪音、completed；下一decision才代码喝毒药，原流没有第二个相同请求不能补一条Jev错误。T7局部实序是电击先退、噪音后毒退，戳刺／本体／守护存活；全局同类新体不能靠index强认持续身份。



机制：触媒 ACCELERANT在T5建1，余像 AFTERIMAGE及毒雾+ NOXIOUS_FUMES在T6建1／3。T7翻越撑击 FLICK_FLACK后挡1，中和+ NEUTRALIZE后2、两打击后3／4、兜底打击后5；腰带扣空槽后敏捷2而挡仍5。终态戳刺8→3、本体37→32、守护8→3，均与3＋2两次毒结算合5相符；噪音被药追加后退场。中毒加层、实际已扣与召唤新增分账，不预支未执行替药目标的胜负。





原始证据：GWE810ZD014M-raw-index.json逐条offset/bytes/SHA；完整阅读Jev原题行[74190, 74198]，精确decision_id与chosen/result/gate_reject/selection_dispatch及后继索引见question-receipts.json。覆盖与未读逐项见coverage.json；resources.json与resources.md含所有胜战/SL窗口和逐槽变化。完整题面存在不等于采用，单步completed不等于整线执行，短窗样本不是自然收益。

旧行为/边界：原日志与本节记录的已展示候选、原选择、护栏/SL或期限兜底；run-config V6 on/四brain/reflex off，v6-build无匹配。本局历史code=current，精确commit因ENOBUFS未知，不能以当前live代码伪造旧源码。当前只读参照5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532，原差异live-source.diff保留。

拟验证的新行为：保留FABRICATE_MOVE后增援未覆盖的显式限制，用本局T5→T7已见新体核当前模拟消费缺口；对T7预算耗尽的单步兜底建立同一帧固定回放，逐候选核目标、已存毒和仍会出手的敌人，以及腰带扣空槽敏捷不追补旧挡。新增数量/概率及另一用药目标能否存活均未知；先验证模型与调用，再由独立学习者决定是否做局部修正，不指定固定首杀或盲目早喝。

反例与限制：没有本局未执行分支的实盘胜负对照；包括赢战净血在内的资源链并非敌人总伤害。SL重载不计新样本/新药/回血。已有模型低可信、未建模、动作过渡态与未读问题保留；不同尝试/抽弃/能力启动时点变化不归单因。CEN的既有nonpositive错误与当前死亡优先代码分列，本提案不重复冒称已实现。

拟合方法与样本/时间切分：本提案不拟新参数，不训练。先将上述本局原题/原状态/原尝试固定为诊断夹具；校准与自然效应必须用后续独立已结束Silent局，按局及时间留出，本批和SL尝试不同时充当训练/验证或独立支持。没有受控反事实前，保留现行规则。

验证：逐帧复原合法性、能量、手牌、玩家HP/挡、敌体/阶段/毒与药槽；复核当轮预测窗口和实际端点，失败、无解、截断、未建模分别保留。若独立strategy-proposal实施代码，按原沙箱tsc/Vitest入口固定数据自测、集成前知识冲突检查、实际live源码祖先与消费者读回核验；无关角色及未观察阶保持等价，不用未知数字调参。

预期影响：提高本批证据指向的局部状态/决策归属可核性；不承诺通关、留药收益或自然胜率提升。

回退：本复盘无行为变更可回退；将来只逆转该实现的窄代码/角色条件，保留全部原日志、账本、复盘、失败夹具与反证。

状态：证据已记录，待独立strategy-proposal验证；implemented_commit未填，不登记implemented/shipped。
