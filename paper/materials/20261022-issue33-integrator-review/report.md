# #33 技术核验：来源审计缺陷，退回补缺

核验时间：2026-10-22 07:34 CST。交付提交 `276f3089c413b129e67362e3c84eae23baae993f`；隔离核验基线 `5373a858aad0e30689f064247dbcde6978cb9de8` 已含独立通过的 #20/#26。本次不合入功能、不进入 waiting-release；生产与自然首局验收未执行。

## 阻断项

`agent/src/brain/tools/agent-knowledge.ts` 为各工具硬编码来源文件清单，与实际渲染器依赖不一致。通过真实 ToolHost 的固定查询，返回正文变化而 `sources`（包括 SHA）不变，违背 issue 要求的来源与回放审计。

1. `kb_old_knowledge({source:"jev_hints",keyword:"sandpit-zero"})` 实际读取 `jev-hints.json`，包装器却查找不存在的 `jev-hints.md`，只返回攻略及手册的来源。隔离副本仅修改提示正文后，工具正文变化，ToolHost 日志的来源清单与哈希保持不变。原渲染器见 `knowledge/render/old-knowledge.ts` 与 `data.ts` 的 `KNOWLEDGE_FILES.jevHints`。
2. `kb_stats({table:"fights",act:1})` 实际使用合并后的公共怪物库及本角色 `monster-records.json`；包装器只列出 `room-costs.json` 和 `outcome-stats.json`。隔离副本修改战绩计数后，表格变化，而来源清单与哈希保持不变。渲染器见 `knowledge/render/stats-text.ts` 的 `renderFightRecords`。

复现只改 `.artifacts/` 内复制的固定数据，未写知识库、未调用模型、未启动对局。已执行原始探针及下列可移植探针，两次摘要一致；全文输出、ToolHost 审计与原件留在忽略目录。公开摘要见 `provenance-summary.json`，可运行探针见 `provenance-repro.mts`。

```bash
# 在仓库根运行；保留原输出，复跑时指定一个新的 STS2_REVIEW_OUTPUT。
nice -n 19 node --import ./.worktrees/integrator-33-20261022/agent/node_modules/tsx/dist/loader.mjs paper/materials/20261022-issue33-integrator-review/provenance-repro.mts
```

## 已核实与检查边界

- 实读生产路由、隔离 Codex/dsh、工具挂载、预算收尾与日志实现；专项固定测试包含 #26 六工具实际 MCP 挂载及角色/进阶隔离。4 文件、23 项通过。
- 37 个交付执行文件与 4 个 #26 依赖叶子的 SHA 均与交付提交一致。23 份开发日志核压缩前后 SHA/字节数，并展开扫描通过；5 份开发安全扫描回执核 SHA。2111 个核验输入在检查与复现后保持不变。
- 独立外部统计重建与 tsc 通过。发现并复现上述阻断后，主动向本任务已核 PID 的 Vitest 发送 SIGTERM，全量运行退出 143，259.82 秒；原件保留，未计为通过，无遗留检查进程。开发者先前全量运行仍含缺少固定文件的一项失败，后续分项复核不能写成一次完整全绿。
- 独立专项日志、全量中断日志、类型/重建日志与清单见 `evidence.json` 及压缩原件；不得以专项通过代替全量通过或生产准入。

## 补缺验收

按工具及实际选择器记录真实读取的来源、版本及 SHA；审查原文与动态填值依赖，避免只修文件后缀后仍漏记战绩/公共资料。不得拿无关文件的 SHA 代替实际内容来源。补上固定回归：单独修改提示或战绩副本，返回和来源 SHA 均应相应变化，ToolHost 日志应保留同一份准确来源。提交精确补交，再跑独立完整 tsc + Vitest 并保留失败/中断原件。

#20/#26 已独立核验并合 main，维持 waiting-release，#33 的返修不撤销工具层结论；#26 的生产挂载及本功能自然首局验收仍待修复后沿原 ops 流程进行。无新实验或额外对局门槛。
