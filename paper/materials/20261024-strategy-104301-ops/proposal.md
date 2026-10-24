# 预算只算根节点时保留单动作选择

本批：20261024-104301-strategy-proposal；角色Silent；证据仅A10。沿用账本silent-0581及原代码提案silent-proposal-146784d761377d66，不新建重复ID。来源postmortem，当前实现任务strategy-proposal。适用授权Roy-2026-10-07-learning。

本批普通任务无proposal_ids/proposal_repair、research_request或implementation_request；旧牌组大小专题属于另一批，未承接。原HEAD d15cbeaf018ba39d7403666306e7d70e4d865807，按要求快进main后基线01f574021dc4507c45da69302d02c466db05820b，只有交接文档差异。

证据W546CNAWY3RG F21第四试T4：d509980 Jev选择斗篷整线但只确认首个动作；d509981 Jev预算错误后代码选择刀刃之舞；d509982、983在零预算下沿原单动作退化完成打击及后空翻。s529386是4HP/15挡/0能量，四张普通SHIV各0费4牌面伤害、playable=true。d509984仍输出“only line: end turn”，预算0、completed，未再询问Jev；s529387为T5/1HP。s529391末T5死亡。原字节逐seek验证见focused-original-rows.jsonl；每行保留source/source_size/offset/bytes/SHA。正式本批提证另有两个manifest，不覆盖旧切点。

完整前置题058fa4a8-2bc7-4ab1-9804-1776d1432ab0与830ef79f-48e7-4e88-bab8-740d798b0b31已读request及answers/error，原Jev行85683、85684，精确decisions关联509980、509981；不以question_id、正文或邻近时间认局。第一题plan1/0.95，selection_dispatch只证斗篷completed；第二题error.message=human-pace budget exhausted: Jev、无answers，代码回退只证刀刃completed。后继单动作选取不算Jev继续采用整线，whole_plan_executed=null仍未知。完整原行保存focused-jev-originals.jsonl。

旧代码根节点先evaluate，预算为0即截断。只有best.outcome.dies才进入既有planCombatPerCard，因此仍存活的根节点空过绕过退化保护。本次固定原帧已在基线重现nodes=1/truncated=true/timedOut=true/plans=[空步骤]，新增测试因此失败。

新行为限定Silent A10、存在决策预算、timedOut、truncated、nodes=1且唯一计划为空步骤：复用已有planCombatPerCard。保留所有现有单动作选项、分数、锁牌、身份和执行闸，不新增机制、不改预算、不扩大搜索、不直接命令打完四刀。真正只剩结束回合时仍可结束。其余角色、未观察进阶及已有致死退化路径等价；这不是新架构。

反例和限制：牌可因锁牌或其他副作用不宜打出；因此不采用“零费就全部自动打”的规则。显式blocked_by_hook负控保留不能打。Ironclad A10和Silent A11控制仍走旧根节点结果。独立分母只有1局，SL四试不算四局；16只是四张牌面的和，原局未打出，不当真实伤害或修后获胜。斗篷模型已有0461缺口独立保留，本次不修、不归因整场败局。运行源码因run-config ENOBUFS缺SHA；固定当前基线重现不回填历史SHA。

验证：原帧固定JSON，不依赖刷新知识或调用模型/网络；负控撤本补丁应失败，恢复后通过；实际planCombatTurn→过期resolve→gate链必须仍提供合法小刀。检查无新增搜索节点，既有human-pace-reuse保持。沙箱总检查按tools/test-sandbox.sh执行；共享node_modules只读导致Vite配置默认打包无法启动时，使用--configLoader runner，不改固定排除名单。所有失败原日志保留。测试/提交/live状态以report.md最终回执为准。

样本及时间切分：本局为诊断与回归夹具，不拟合权重或阈值。后续新完局才是自然验证，未验证收益。回退：只回退本项源码提交，保留原失败、夹具、账本、提案及原日志；不回滚并行知识刷新。本次正式知识未写，未来经验入库和消费者采用另验。

自然对照补充：同场第四试T3，s529381余1能量，手中蛇咬费用2、毒性爆发费用3均playable=false；d509979在entry_budget_ms=3912.8000630005263时合理结束，后继到T4。此对照说明只看到“only line=end turn”不足以判错；本项要求另核超时/根节点覆盖与合法动作。该对照和缺陷在同局内，不增加独立分母。
