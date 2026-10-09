# 首Boss已败与本幕结束、当前Boss身份仍需区分

关联账本 silent-0228；domains=["structure", "terminal", "combat"]。

实际JMH5C51RLN4E F48 T13 REWARD states L243532 @7443348142、MAP L243533 @7443380878，当前act_id=2、尚有row15第二Boss；F49 T1 L243534 @7443430835 enemies=AEONGLASS，run.boss_id仍TEST_SUBJECT_BOSS。9TG1RP5LFAAK F48 T16 REWARD L244372 @7473583198、MAP L244373 @7473619437，F49 T1 L244374 @7473672603 enemies=TORCH_HEAD_AMALGAM/QUEEN，run.boss_id同样未更新。两局F48实际胜后资源进入同幕F49，最后GAME_OVER实际败。

当前 agent/src/sim/build-sim-facts.ts:444—447把!in_combat且floor=48判actBossDefeated，:475说明“本幕boss已经打完；下一幕boss…”。agent/src/brain/build-facts.ts:44/48静态[17,33,48]令F49距离为null，:52复制stale首Boss身份；memory/run-plan.ts:138也复制它。本轮真实帧代入这些现有谓词的静态结果另见static-facts-evaluation.json。药水题面combat-plan.ts:500已经把实际Boss写this fight，本轮没有把它误报成同一null错误。

新行为：仅对自己核证的silent实际A10+LEVEL_10第三幕，区分已赢首战/仍有同幕后战/实际终局。F48战后已知第二节点而身份未见时，说明“第一Boss已败，后战仍在同幕，身份未知”，保留跳过stale首Boss模拟；F49实际开战再从活敌ID识别当前遭遇，通用事实/工作记忆更新当前Boss和距离0。不从F48等级或地图猜隐藏后Boss，不在未知状态恢复过期模拟；终局以实际GAME_OVER/is_victory确认。既有首战continuation/药水值及SL门槛保持。

影响：事实语义与实际连战一致，减少将“第一Boss死”误作“幕结束”的可能。实际构筑或决策损害未知：两次F48奖励均空，没有非空选牌题，不能据静态字段宣称致败。现有专门准备提示在F48前有效，不能宣称所有事实都错。原提案silent-proposal-4cc200cc9747f4a8仍pending；沿原队列交后续策略任务，不造重复实现或shipped。

反例/验证：A9 G403 F48胜后真实GAME_OVER，A10未到F48的八局、其他角色及未观察进阶不得改变；F48 reward/map两帧显示同幕继续，未知后Boss不命名或模拟；F49沙漏/女王真实开战帧引用实际敌人，不能仍写实验体；两次F48空奖励只验证字段，不证明产品行为改善。候选在固定帧验通过后按原完整自测流程上线；回退限新增阶段/身份解析与事实显示，保留已有连续资源约束，不动SL判据。本轮只写提案。

## 范围、方法、授权与边界

来源任务 ascension-audit（本轮scratch /home/dw/Projects/agent-sts2/.worktrees/ascension-audit-silent-a10-3/learner/runs/20261007-184218-ascension-audit），实现任务 strategy-proposal。角色仅silent，实际已观察A10；A9三局只作独立核验过的对照。固定live 70c8352bc9ea84d18f9bc0f82244b0e1f76405e8。使用已有授权 Roy-2026-10-07-learning，授权不是游戏证据。

证据来自本轮独立流式提取，18125条所选原字节记录逐偏移/SHA核对。前五/后五按整局结束时间分组，SL尝试始终归原局；两条真正触达F49均在前五，后五无F49验证。没有重新拟合参数；本报告是结构约束和源码静态核对。未来需要新已结束同角色局作独立留出，不能把同一局的SL拆进训练和验证。两条不同进场血量/牌组不能当受控药水或休息比较。

已观察资源链包括此前胜出战斗、各次尝试、HEAL/SMITH、羽毛到火、跨幕回复、实际用药/弃药/取得和SL重置。首次/最后可见帧是观察边界；未知因果及未走到的层不补推。F49胜后、其他组合、全部药水/复活/遗物交互以及实际决策损害未知。

后续验证只使用保存的固定状态与来源局证据；A9、其他角色、未观察等级行为保持等价。候选源码按既有沙箱自测/live流程另任务处理；本任务没有执行游戏模拟、修改策略或发布版本。
