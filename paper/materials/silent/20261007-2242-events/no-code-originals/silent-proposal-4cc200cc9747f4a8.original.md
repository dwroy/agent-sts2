# D3：区分首Boss已败、本幕已结束和当前Boss身份

角色 silent；实际观察 A10；来源任务 ascension-audit；实现任务 strategy-proposal；领域 structure/terminal/combat；账本 silent-0228；授权 Roy-2026-10-07-learning。这是游戏结构提案，不作为纯基础设施修复派发。

证据：JMH5C51RLN4E states.jsonl L243532/offset见本任务audit-data.json为F48 REWARD，in_combat=false、act_id="2"、boss_id=TEST_SUBJECT_BOSS；L243533实际MAP指向第二Boss r15c3；L243534 F49 T1实际敌人AEONGLASS，boss_id仍TEST_SUBJECT_BOSS。9TG1RP5LFAAK L244372—244374同样F48奖励→第二Boss节点→F49女王与聚合体，boss_id仍TEST_SUBJECT_BOSS。此处不能将run.boss_id当已观察当前敌人身份。与A9 G403VCZ3BH1B F48实际GAME_OVER胜利对照，两种结构不同。

仍在live b0f41f039b136e69485027ecbf9042c23170b4ab的假设：agent/src/sim/build-sim-facts.ts:437、:444—446仅按[17,33,48]且不在战斗判断actBossDefeated；因此两个F48奖励/地图状态都得到true。:474—478的解释是「本幕boss已经打完；下一幕boss要到下一幕开始才知道」。agent/src/brain/build-facts.ts:20、:44、:48、:52在F49得floors_to_act_boss=null并沿用TEST_SUBJECT_BOSS；doubleBossPreparation :76（其门控在knowledge/double-boss.ts:61）仅在F48之前提供两战说明。agent/src/memory/run-plan.ts:138亦直接复制boss_id。

影响证据边界：本批两个F48奖励均为空、只自动proceed和跟随已定路线，F49仅战斗，没有触发有用的构筑题或新run-plan题；所以这里只证明状态语义/条件函数与原始观察不符，没有证明遗漏选项、错误出牌或可转胜。保留模拟跳过是合理的：第二场实际身份在入场前未公开，不应借修复为首Boss再模拟一次。

拟议行为：提供角色/effect/幕与实际图节点门控的阶段事实，如first_boss_defeated、observed_remaining_boss_nodes、act_complete（尚无F49胜局则该字段未知）；F48战后明确「首Boss已败、还有一个已显示Boss节点，身份未知」，保留本局余资源。进入F49后，当前战斗身份从已观察enemies/已测遭遇映射得出（AEONGLASS或QUEEN），另存run.boss_id的原始值及stale标记；不能在F48提前猜本局后Boss。不得仅按ascension>=10外推新等级，不在GAME_OVER前声称整局通关。

拟合方法：结构条件无需数值拟合。最早JMH作为复现/设计，较晚9TG用另一实际Boss作为时间留出；A9 G403作为单Boss反例。后续新A10完局继续留出验证，所有SL属于同一run。不估计新药水价、第二Boss概率或回血机制，不借旧报告替代原始核证。

固定验证建议：用实际F48奖励/地图及F49入场帧检查上述字段和解释，撤变更应重现旧字段；A9 F48胜利与本角色幕1/2的已有含义保持。没有证据的角色和等级保持原行为。验证不得启动对局、不需要新增依赖。预期只减少错误阶段/身份事实，无胜率承诺。

缺失：F49胜利后终局结构、F48非空奖励是否存在、第二Boss身份何时公开的更多帧、未见角色/effect边界。本批不足以删原模拟防护或规定打法。回退：独立撤新增阶段/身份事实，保留0163及已有连续模拟；报告/账本/提案历史保留。本次不改源码、不提交游戏代码、不造eval版本，实际实现由后续策略任务完成，不再向Roy申请同一授权。
