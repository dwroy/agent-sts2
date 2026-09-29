# V4 M2 构筑事实回放（2026-09-30）

- 题目：`targets.jsonl`，从 jev-sts2-dsh/experiments/dsh/data/dataset.jsonl（只读）取 20 个真实构筑问题：选牌 4、商店一次决策 4、休息一次决策 4、事件 4、选牌屏 4（升级、删牌、加牌、附魔各 1），9 局，09-28/29 的 A8/A9。
- 题面：`tools/build-facts-replay.ts` 从日志（states/decisions/run-plans，只读）重放这 9 局的本局记忆、路线计划、整局计划和记住的地图，在每题的决策状态上按对局循环的方式重新出题。
  - old = v4 0c82444（本次改动前，`git archive` 到临时目录跑同一个工具）；
  - new = 本分支改动后（9b51322）。
  两边用同一份日志、同一份知识数据、同一份复盘快照；old 和 new 的差别只有本次改动（选项事实、deck_profile、统计口径说明、memory.knowledge 不再重复统计行、全量知识前缀里那句说明）。
- 提问：`tools/brain-replay.ts --engine deepseek --knowledge full`（KNOWLEDGE_PREFIX=full，DeepSeek 配置取自 jev-sts2-v3/.env，只读，key 不打印不落盘），每题每边一次。没有调用 Claude。
- 结果：`summary.md`（compare.py 生成）；两边各自的逐题表在 old/summary.md、new/summary.md；原始回答和推理在 */results.jsonl、*/brain-*.jsonl、*/deepseek-reasoning-*.jsonl（不提交）。
