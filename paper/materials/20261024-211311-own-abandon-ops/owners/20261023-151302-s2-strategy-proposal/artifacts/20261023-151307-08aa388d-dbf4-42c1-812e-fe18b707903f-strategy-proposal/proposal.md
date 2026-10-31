# Silent A10：蜡烛当前1充能的添火条件参考

本批20261023-151302-s2-strategy-proposal，只消费派发的十项id，完整清单见assigned-proposals.json。此实现对应silent-proposal-167b20d3b7105257，来源postmortem 20261009-044301，账本silent-0328，关联silent-0185/0186；授权Roy-2026-10-07-learning。其他九项分别保留处置，不扩展到队列外任务。

旧行为：silentCandleRestFacts只有输入0的KINDLE→5参考；输入1返回null，limits仍称所有正充能未验证。当前V6休息题提前返回，原事实只接旧入口；本次还把条件事实送入V6 options事实，模拟state/changes/unknown_reason不改，不产生能量/胜率数值。新行为仅在Silent A10且当前整数充能1、有启用KINDLE及未熔化蜡烛时给KINDLE→6。HEAL/SMITH仍保持当前充能；未知值、其他正量、未知/其他进阶仍null。说明文字追加实际证据，原HP、选项、模拟、路线、优先级及其他角色保持原逻辑。

原始证据：J8PHG72DGD90 F29，战斗回合不适用。decisions原行304744，decision_id=5c16285a-2258-4dcf-9b3b-d6b79936da3c，offset808480543/bytes38472/SHA cde6a943cd9f797968cb468a1c976c736664bd09a7d25879a093b0830182b1b0；chosen=choose_rest_option index2，expect=KINDLE，result=completed。states原行312605 offset9720737278/26201/SHA6f5590cb60fd2c7ea586c54882847dd3ee1bad1acebb3e8d16d97a5b3913ea6e；312606 offset9720763479/24908/SHAaed4e6f30487e0eb64b52bb71c2cce8a0d0389bdab8919835fed33b568ee88d1；实际stack1→6，50/74HP及28张牌组保持。312607离开营火后仍6。精确身份均来自run_id/state.run_id/fingerprint.run，无正文或时间猜配。冻结切点及整流SHA见evidence/evidence-manifest.json与v6-evidence/evidence-manifest.json。

方法：1局1动作前后核验，不拟新策略参数，不将旧经验提及的其他局计成本批支持。固定原帧作功能测试，后续新局留出；没有营火替代选择的同抽序整战对照。

反例/限制：0→5旧分支不支持任意n+5；输入2/3/6和其他进阶继续未知。添火没有回血，当前HP投影/boss_sim没有模拟续火或沿路消耗，不将模拟基线当添火胜率。J8本局最终败于F33，机制记录不证明优先添火能提高胜率。其他宽提案的机制、替线、药价和SL参数不据此变更。

验证：固定原始REST帧分别通过普通/oneshot真实planRest题面读回6、全部选项与HP参考不变，缺遗物/熔化/不可用动作/其他角色及未知stack有原边界测试，新增其他进阶输入1仍未知。旧源码+新测试应在1→6处失败；恢复源码通过。V6真实planRest题面固定输入也需读回6、HEAL仍1、KINDLE resources_after=null及unknown_reason保留，合法选择仍可派发；其他进阶不加入V6事实。最终版同时撤两源码文件时3项失败，恢复结果见candle-final-source-restored.log。早期V6测试漏完整probabilities而触发既有fallback的首败保留，补齐固定答案后复核，不改产品fallback。完整沙箱检查及实际live集成状态另见report.md，未发生的发布/测试不自报成功。

预期影响：大脑能收到已观察条件参考，不承诺改变其自然选择或收益。回退仅撤本源码提交；恢复输入1的null和旧说明，保留原证据、账本及提案。只有实合live祖先后才将原id报implemented，shipped交ops核实，不创建重复提案id。
