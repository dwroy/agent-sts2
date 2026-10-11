# 静默核心组合与核心牌的实际输出专题

唯一请求 `roy-20261010-silent-core-output-value`。Roy 原话：“提问：如何让核心组合/核心牌能产生较多的输出？”这是学习目标，运维不指定具体牌、流派、机制、公式、参数或阈值。直接回答怎样把已有或正在形成的核心兑现成更多实际伤害，同时保持足够生存与资源；不能只把出牌次数、面板数值或花完能量当成输出已经提高。

经现有 `strategy-proposal` 纯研究通道执行；根请求 `notes/strategy-research-core-output-silent.json`。先核对 learn.json 中实际登记的 request、batch、worktree、dispatch_base、spec/input SHA 与宿主回执。十个派发局号只是入口锚点，范围为 input-manifest.json 冻结的全部已结束静默局。关联历史核心构筑、牌组规模、能量利用与核心循环研究；它们都是历史学习者产出，回查证据、去重，不重派旧专题，也不把旧候选默认当成稳定高输出组合。

## 必须交付的章节

1. **damage_realization**：从本角色实盘自己识别核心及输出形式，追踪相关行动到敌方真实伤害/血量变化。区分意图、面板、实际结算、延后收益与未能兑现的量；不可核实的归因明确未知。给支持与失败的具体局面，解释为什么有组件却没有足够输出，不能从共现直接推断因果。
2. **startup_and_scaling**：研究核心何时具备、何时可用、何时首次实际发挥作用，成型及后续增益所需的资源与时间。比较开战、战斗中及下一场启动，明确收益来得及兑现的条件；由证据确定关键瓶颈与替代/过渡，不能预设组件或强制固定回合顺序。
3. **sustained_output**：区分当前回合爆发与整场累计实际伤害，追踪核心后续继续输出、重复触发或失效的过程。按已观察的敌人/boss、阶段和目标情况说明适用范围，说明哪些结论只有局部验证；不以重复使用次数替代伤害，不把尚未发生的下一回合收益计为当下输出。
4. **resource_survival_tradeoffs**：结合可核实的能量、可用手牌、行动及其他资源消耗和生存代价，分析为输出投入的成本与被迫中断的原因。纳入过早死亡、能量有余却无有效输出、组件齐备仍失败等反例；具体机制只取自日志。高伤害共现并不证明整局胜率提升，也不能忽略转场或下一 boss 的重新启动成本。
5. **construction_execution_guidance**：提出少量能被大脑使用的有条件指导，分别说明构筑目标、当前缺口、选择/过渡/转型条件和当下执行窗口；每条建议都有支持、反例和未知范围。核对已上线核心经验及此前能量/循环候选，保留新增指导价值，不机械按每张牌拆条。先给 Roy 可读的简洁答案，再给证据与经验入库候选/账本映射。
6. **counterexamples**：结论支持及反例给出局号、层、回合/决策、原始字节偏移与 SHA、独立局分母。所有冻结局都参与筛查或明确排除理由，包含早死与组件具备但未兑现的局；单局重复 SL 不能当独立样本。固定局面验证、自然观察、未做的反事实与待验证假设分别标明，不冒造收益对照。
7. **limitations**：按进阶、真实版本和实际成功大脑来源分层；主战绩保持纯 Codex，首试与 SL 最终分别列。A10 未验证的整局稳定性明确缺证，不用低阶胜局或重复 SL 包装。给后续自然对局如何核实大脑读取、实际采用、输出收益和阶段通过情况的观测项，失败、冲突与结论更正留痕。

## 冻结输入、验收与经验沉淀

- 只按 input-manifest.json 的固定日志完整行截止字节、局号清单和冻结材料流式提取；不纳入正在进行的局。执行命令加 nice，最多四进程。原大日志完整前缀 SHA 没有计算时写未知，对实际引用的摘录保存命令、原字节范围及 SHA。缺失/不完整复盘见索引，原始对局仍可核对。
- 不把历史报告当未经复核的机制真值；所有新增结论仍需本角色原证据。按 `eval/brain_source.py` 核实实际成功大脑来源，不把 requested engine、旧 deepseek 计数或 token 计数当作纯 Codex 证明。
- 所有冻结局精确分入 covered_runs 或带具体理由的 exclusions，二者不交叉、不重复，并集与输入相同；evidence_runs 为实际支持结论的 covered_runs 子集。不能把十个锚点冒称全历史分析。
- 保持纯报告：HEAD 等于完整 dispatch_base，源码/知识工作树干净；fixes=[]、merged=null、未运行测试填 null，不造版本或 shipped。不修改运维 prompt、模型强度、凭据、其他角色、对局参数或服务，不运行 play/在线大脑，不接管其他活任务。
- 新知识通过既有 ledger CLI 留痕，与已存在经验关联去重；需要代码改变时仅经 code_proposals CLI 提交有证据的提案。本批不直接写经验库或合代码。实质报告验收后由现有 experience-update 沉淀；实际 live 合入、版本/双通知、消费者读取、自然对局采用和效果分别核实，报告完成不冒称经验已生效。
- 按既有论文留痕保存输入切点/提取命令、支持/反例/弃用、结论变化、失败/测试原日志及后续上线证据。学习 session 放在 ops 同一 herdr space 的新 tab，显示实际输出，完成确认后自动关闭。

最终标准 JSON 必须保留 task=strategy-proposal、character=silent、实际 batch、request_id、input_sha256、完整 40 位 base、全部派发 runs、fixes/skipped/merged/tests/code_proposals/implementation_domains/proposal_results/report，并带 research_complete=true、上述七项 coverage=true、covered_runs/exclusions/evidence_runs、非空 objective_conclusions 和 limitations。report 为本批 scratch 内真实 report.md 绝对路径；tests={"tsc":null,"vitest":null,"cases":null}。首份实质报告与后续经验入库分别向 Roy 回报。
