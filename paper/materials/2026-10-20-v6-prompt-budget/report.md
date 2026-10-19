# V6 题面体积故障修复

记录时间：2026-10-20 02:44:07 CST。源码 `2ade5de3f`，共用接口见 `interfaces.md`。真实候选请求发生在源码提交前，基线与 uncommitted 标记保留在回执，不把它们冒称为此提交的精确验收。本记录是候选验证；最终 live 读回复验另记，当前不表示可移除 STOP。

大脑原请求正文 179,790,098 字符，超过 Codex 服务 1,048,576 字符限制；拿牌原 Nova 请求 6,955,048 字节，真实 HTTP 400 原因 `max_tokens_exceeded`，提供方没有返回数值上限。正式 Silent R2 文件 7,903,933 字节、4 方向/17 组合，SHA256 `377920574ce7859f5e39dd01aad495947140226777e742251ac850004ae0cbe6`，与当时 live 文件逐字节一致。

已统一大脑幕初/重规划、拿牌、选药、商店/休息的精简组合摘要，保留主口径指标及各自 n、数值投影条目；不再给模型发送完整 metrics。Jev state 上限 16,000 UTF-8 字节、总请求 24,000 字节，大脑 V6 部分 64,000 JSON 字符，均为保守应用上限。按方向权重及组合期望排序后确定性裁剪，保留合法回答键，并在题面和审计日志记录截断。完整指标按内容哈希落审计旁文件，不从日志丢失。

候选真实请求（只请求、不执行动作）：拿牌 3/3 Nova HTTP 200、有效答案；选药 3/3 HTTP 200、有效逐槽答案。拿牌 Jev 0.60–1.71 秒，选药 0.39–2.75 秒；工厂/投影沿用正式生产接口，强制兜底均生成合法意图但未执行。大脑 `gpt-6.1-sol` / `xhigh`、生产 prefix=off 成功，V6 正文 63,715 字符、完整 BrainRequest 68,303 字符，76.83 秒。最终 live 烟测将改用生产 `ensureDirectionPlan` 全链路复验，补含路线、药水候选与实际答案校验上下文。

候选烟测工具曾将 W7 REST Jev 和 W6 辅助选药路径同时开启，错误期待辅助 potionJev 字段，三道拿牌通过后工具以 `production_prompt_missing` 停止；未构成运行时代码故障。纠正工具配置后独立三道选药通过。工具输出目录有一次重用：保留原拿牌 console 原件，选药结果为后写独立采样，不能把后写 results.json 说成原拿牌回执。最终 live 工具采用全新目录。

未知率：旧 metricSnapshot 20,000 节点上限拒绝真实 R2 的 8/17 组合（最高 21,434 节点），已在保留深度/数组/字符串限制下提高到有界 50,000。固定提供方—消费方测试确认 17/17 已知组合不被降成 unknown。真实冻结投影仍全部 unknown：一次 F8 诊断 384 行，formation_known=120、p≥5%=20、formation_unknown=264、budget_remaining_unknown=240；无已选路线，入口 HP 缺失。旧包仅一组合指标，但正式 R2 回退匹配存在，不能把全未知只归因于 1/17。此项已转 watcher，未修改 sim 或补造游戏知识，不宣称质量验收通过。

只读追查补充（2026-10-20 02:49:10 CST）：上述 reason 计数相互重叠。`by_combo` 显示 256/384 行 combo_id=null，其中 240 行预算占位、16 行未观测连续 Boss 对；实际带正式组合 ID 的 128 行中，120 行 formation 已知、8 行未知。因此不能将 264 条 formation_unknown 全解释为机会/供给数据缺失。当前已处理的四个 P 组合均准确匹配正式 ID，8/17 消费拒绝另由固定测试修复；其他方向在本次冷预算下尚未处理，不是已证实的匹配失败。simulations=0，reason 无 simulation_failed，不能称模拟器执行后失败。

可复现的 W3 位置：`agent/src/sim/v6-request-factory.ts` 为空 steps 路线补 `route_target_not_projected`/hp=null；`v6-targets.ts:74` 在有匹配显式路线空 HP 时直接返回 unknown，并且 current 目标的 currentRouteHp=null 也直接返回，不进入后面的同角色同进阶历史中位数回退。`v6-projection.ts:210` 的 rowErrors 收集 `unknown_opening_entry_hp_or_empirical_sample`/`target_preparation_failed` 后只 push、未在输出行读取，`unknown_reasons` 因而漏了准备失败细节。建议 watcher 在保持明确死亡/显式失效路线语义的前提下补“无路线”历史回退，传播准备失败原因，并对供给 deadline、摘要哈希、准备、真实 runner 分段计时；先缓存/筛选再评估。此处只读，不修改 sim 边界，也不根据缺失补造概率。

完整检查首轮为 590 文件，588 文件通过、2 文件失败；5659 测试通过、3 处旧集中表断言失败、2 跳过。三处已按集中 direction_evaluation 的正式数值语义更新（b2094118d、9e09a5c55、73d26c13c），定向 5/5 与 tsc 通过，完整重跑中；保留原失败输出，后续完整重跑及最终 main/live 复验另补回执。未改 live、STOP、Regent、对局、知识或运维 prompt。

分段只读复现（2026-10-20 02:55:40 CST，独立随机采样不替换原样本数值）：工厂 124.74ms、投影 4545.81ms；8 次供给 resolve 共 4416.19ms，92 次 prepare 共 34.24ms 且全部返回空，simulations=0。前六个本幕 Boss 的形成概率均低于 5%，连续 Boss 条目开始达到阈值后因准备失败无法模拟；随后供给 deadline 耗尽。此轮 formation_known=112、formation_unknown=272（240 预算占位、16 未观测对占位，与真实组合未知相互重叠），不得回填成首轮 120/264。该诊断工具误复用旧 results.json 路径，原首轮 console 与本轮独立拷贝均保留；不把后写结果冒称首轮原件。详见 .artifacts/prompt-budget/unknown-stages/summary.json 与 results.json。

变基记录（2026-10-20 02:56:45 CST）：最新 main 3abb94cf0 相对原检查基线只新增运维记录，正在全检的 1,442 个源码/测试/配置/R2 输入逐项 SHA256 不变。修复源码 2ade5de3f 重放为 4fdc28914；定向断言最终提交 73d26c13c 重放为 a11514966。运行中的全检保留启动原提交及新基线映射，不改写历史回执。

最终联合检查（2026-10-20 03:11:03 CST）：基于 main 46f4d15ab（含 watcher 历史坏行修复），定向 8 文件/112 项通过，tsc0、完整 vitest 591 passed (591); tests 5663 passed | 2 skipped (5665)、gitleaks0；1443 个受测输入前后 SHA256 不变。原失败及 R2/R3 主动中止的原输出独立保存于 checks-prior，未覆盖成成功。R2 因发现每选项投影可能被清空而停止，已修为各选项至少保留一条优先方向最佳组合投影；R3 因 watcher 源码合入而停止，R4 包含最新联合源码。候选真实请求早于此项保留补强，不能替代最终 live 精确版本验收。

全检后变基（2026-10-20 03:11:19 CST）：main 500cc7f6d 仅比联合基线新增运维记录，1443 个受测输入逐项 SHA 不变；源码补强 658d83da9 重放为 673f255bb，见 post-check-rebase.json。未重复未变源码全检。

最终源码定位（2026-10-20 03:11:43 CST）：原 2ade5de3f 在最新记录基线重放为 ee32129ca，逐选项保留补强为 673f255bb。原候选请求/故障原因/分段诊断的精简原件已复制到 candidate-evidence（清单含原路径与 SHA），避免工作树回收后仅留下无法访问的路径。未知质量验收和 live 真实请求尚未完成。
