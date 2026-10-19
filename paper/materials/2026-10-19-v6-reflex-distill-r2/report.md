# 第二轮出牌小脑记忆：模板与一次性派发

模板提交 `509fa794015348e5117ec002616013659b3d5825` 已进入 main。模板只描述任务与证据要求，不写游戏知识：使用扩充后的 32 个条件字段，仅处理按出牌方案计算的 `combat_line`；覆盖冻结的全部 372 个已结束 Silent 局及 244 条经验转换状态；观察统计保留独立局分母、误差、反例和限制，不作因果断言；追加 `cores` / `combos` 关联。输出仅限学习批次 scratch 和 Silent 的 `pending/`，不修改正式知识，不派子任务。

Roy 授权的手动派发已执行 **一次**。命令由 `learner/run.ts` 发起，账号 `codex1`，模型 `gpt-6.1-sol`，`xhigh`，240 分钟，在 `.worktrees/v6-reflex-distill-r2-20261019` 运行。Herdr pane `wJ:p1G0`；run `20261019-191321-36f2fdf6-0f25-4cf0-a330-b92cbd315341-v6-reflex-distill-r2`；线程 `01a153dd-c08a-7532-b716-200ac1204f73`。原生 `turn_context` 已核实模型、档位与 cwd，见 [派发回执](dispatch-receipt.json)。一次性启动目录守卫阻止重复启动，未重发请求。

678 份输入和日志字节截止固定在 [inputs-frozen.json](inputs-frozen.json)，SHA256 `a2597441d19f5472b91d45ca7a6f9fa7dcf55026cdfde38de8aec8af11acc271`。历史文件沿用上一批已固定字节，新增当前格式、字段审计及任务；不把尚在运行的构筑学习输出冒充最终正式知识。当前 13 个正式知识文件与派发前 SHA 完全一致，见 [检查结果](formal-knowledge-check.json)。本次交付表示模板与派发完成，学习结果、入库和消费者读回另行验收；本记录没有关闭学习父要求。

验证：模板 dry-run 成功，原件 [dry-run.txt](dry-run.txt)；任务及材料 gitleaks 零发现。模板、材料属于文档数据，没有运行对局或新增 Jev/DeepSeek 请求。`ops/STOP` 保留。

## W8 冻结题请求路径核查

之前唯一一次真实请求发生于 2026-10-19 17:54:22.281 CST，走项目 `JevClient` → `agent/src/reflex/jev/nova.ts` 的 `novaJevFetch` → **POST `https://llm-proxy.tapsvc.com/api/alpha/decisions`**，模型 **`typesafe/jev-1.14`**，Decisions 协议。HTTP 200，输入 25,599 / 输出 99 token，876 ms，选方案 8、可信度 0.92；只请求，未执行动作。`maxRetries=0`，没有自费 Key 回退，也没有为此次核查重发请求。密钥由公司 Nova 环境从文件提供，未打印、落盘或提交密钥。

已提交原始回执：`paper/materials/2026-10-19-v6-w8/request-receipt.json`；验证脚本同目录 `verify-frozen.mts`，限制 Nova origin、Decisions 路径及单次 transport。请求字节 SHA256 `790400425e1f9d207619d226105cd4b301230252fc8c757d083876a55107447a`。本次仅核对既有回执，没有读取密钥内容。

回收边界：模板已进入 main，学习者仍运行；现无 `.worktrees/live` 的发布回执，不能伪造 `worktree_retention.py complete` 的 main/live 双重验收，保留工作树和原始日志供原调度器后续登记。
