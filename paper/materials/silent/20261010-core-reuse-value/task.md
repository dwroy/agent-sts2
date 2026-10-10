# 静默能量利用与核心牌循环专题

请求 `roy-20261010-silent-core-reuse-value`。Roy 原话：“提问，如何让费重复发挥价值，让核心组合/核心牌能更多的打出来？”经本次澄清，Roy 选择“两者都研究：能量利用与核心牌循环”。这是研究目标，运维不提供具体机制、牌、组合、公式或阈值。

采用现有请求绑定的 strategy-proposal 纯研究通道，根请求为 `notes/strategy-research-core-reuse-silent.json`。先核对本批 learn.json 的 research_request、请求的 batch/worktree、task/spec/input SHA 与宿主注册回执。派发局号只是入口锚点，研究范围是 input-manifest.json 冻结的全部已结束静默局。旧核心构筑专题和牌组规模专题均已完成，本次关联其有证据的发现，不重派旧任务、不改写旧回报。

## 必须交付的章节

1. **energy_value**：直接回答能量如何更有效地产生收益。由本角色实盘识别能量的获得、实际支出、未用及可核实的多次利用过程；关联每次行动的真实伤害、生存和资源变化，区分当下收益与后续持续收益。无法从日志核实的机制或归因明确留未知。不能以“费用花完”“多打几张”本身作为已经有效的证明。
2. **core_reuse**：直接回答核心牌/组合怎样更多次发挥作用。由学习者自己从证据确定关键组件与运行机制，追踪实际持有、抽到、可用、首次打出、再次打出和真实效果；对只需要建立一次、持续发挥作用或确有重复使用的情况分别根据实盘解释。分析未能重复发挥价值的真实瓶颈，区分战斗内循环与下一场/下个 boss 的启动。具体辅助条件与失效条件从本角色证据提炼，禁止用预训练知识补齐。
3. **construction_execution_guidance**：给大脑可用的少量有条件建议，同时覆盖构筑选择与当前回合执行。说明目前缺口、观察到的替代/过渡、资源与生存代价、选择或转型条件；与现有四类核心候选及牌组规模研究核对去重。既有候选不默认通杀。不要只给抽牌次数表或未经证据支持的循环口号。
4. **counterexamples**：每条结论均给支持与反例的局号、层、回合/决策、原字节偏移与 SHA，以及独立局分母。纳入早死局及组件已具备但未发挥作用的局。区分真实观察、固定局面验证、未做的反事实和待验证假设；不同资源/阶段的共现不当成因果证明。
5. **limitations**：按已观察进阶、实际版本和实际成功大脑来源分层，主口径纯 Codex，首试与 SL 最终分别列，同局反复尝试不当独立样本。回答哪些收益已有证据、哪些只是预期，以及后续如何从自然对局验证实际采用、资源收益和阶段通过情况。未知、失败和结论更正留痕，不用低阶成绩包装 A10 稳定性。

## 冻结输入与记录

- `runs` 清单覆盖全部冻结的已结束本角色局；`log_byte_limits` 是各日志完整行的截止字节。只按这个固定切点和这些局号流式提取，不纳入正在进行的局。执行命令加 nice、最多四进程。原始大日志完整前缀没有计算 SHA 时明确未知，对实际引用的摘录保存命令、原字节偏移、SHA 与支持/反例，不冒造全日志哈希。
- 冻结输入包括既有核心报告、牌组规模报告和静默经验快照；它们是学习者历史产出，仍需回查原证据，不把旧假设升级成事实。材料与论文明细、失败、排除及结论变化保存在本批 scratch。
- 首段简洁回答 Roy 的问题，随后给可复算证据、可用指导及限制。所有冻结局必须分入 covered_runs 或带具体原因的 exclusions，两者不交叉、无重复且并集精确覆盖输入。evidence_runs 为实际支持结论的 covered_runs 子集。不能把十个入口锚点冒称全历史分析。
- 本批保持纯研究：HEAD 等于独立登记的完整 dispatch_base，工作树保持干净，fixes=[]、merged=null、未执行测试为 null，不提交源码/知识、不造版本或 shipped。需要规则实现时，通过原 code_proposals CLI 登记真实提案。
- 确有证据的新知识只经原 ledger CLI 登记，与旧条目关联并去重；给出少量经验入库候选及账本映射，数量由独立指导价值决定，不机械按牌或组合拆条。报告验收后交现有 experience-update 沉淀，实际 live 合入、版本、双通知、消费者读取与自然对局效果分别核实。本次报告不冒称已入库或大脑已采用。

最终标准 JSON 必须保留 task=strategy-proposal、character=silent、实际 batch、request_id、input_sha256、完整40位 base、全部派发 runs、fixes/skipped/merged/tests/code_proposals/implementation_domains/proposal_results/report，并带 research_complete=true、上述五项 coverage=true、covered_runs/exclusions/evidence_runs、非空 objective_conclusions 和 limitations。report 为本批 scratch 的真实 report.md 绝对路径，tests={"tsc":null,"vitest":null,"cases":null}。

不修改运维 prompt、模型强度、凭据、其他角色、对局参数或服务，不运行 play/在线调用大脑，不领取其他活任务。首份实质报告和后续经验入库分别向 Roy 回报。
