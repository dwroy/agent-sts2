# #33 技术核验通过，main 已集成，待 ops 上线验收

核验时间：2026-10-22T08:44:23+08:00。原交付 `276f3089c413b129e67362e3c84eae23baae993f`，补交 `ad5f37ae638153fe966a3b5b2d945eb8fa400717`；独立核验基线 `bba8f71923a47f3164ce7a4474ad81f7e6dfbfd0`，main 集成 `d3751e979f7e71717c8c12d309db28b2ac7256bd`。本结论只覆盖这份精确代码组合；转 waiting-release，实际 live 组合与自然首局尚未验收。

## 原阻断的独立复验

继续使用上一轮真实 ToolHost 的固定查询，仅修改隔离知识副本，不改源知识、不调用模型、不启动对局。

1. `kb_old_knowledge({source:"jev_hints",keyword:"sandpit-zero"})`：修改 jev-hints.json 后，正文与来源 SHA 均变化，审计包含实际读取的提示、Boss 与怪物资料；所有文件 SHA 与返回时的复制字节一致。
2. `kb_stats({table:"fights",act:1})`：修改 monster-records.json 后，正文与该来源 SHA 均变化，审计同时包含 monster-db.json 和 monster-records.json；ToolHost 日志的完整输出、字节数、来源与实际工具返回一致。

补交把来源记录放到单次查询上下文，按实际选择器及动态填值依赖抓取读取字节和 SHA，避免同大小/同时间戳缓存漏报；catalog 兼容视图和单条经验哈希明确标记其表示。普通对局查询缓存不扩大变更。新增 16 项固定回归涵盖原阻断、选择器、动态依赖、缓存、并发、catalog 和铁甲原查询等价，已包含在本次独立完整检查中。

摘要见 provenance-summary.json；探针见 provenance-repro.mts。在仓库根保留该候选工作树时可用其 agent/node_modules 的 tsx loader 运行；复跑必须指定新的 STS2_REVIEW_OUTPUT，保留原件。

## 完整检查与证据核对

- 独立 tsc、外部统计重建检查均退出 0；Vitest 一次完整运行退出 0：653 文件、6165 通过、2 跳过、0 失败。fork 单 worker、无文件并行，nice 19，未超过 4 个检查进程。
- 检查前后 2113 个固定输入 SHA 一致，历史 issue29/results.jsonl 在启动前按基线原字节补齐。未把失败后分项重跑算成一次完整通过。
- 原交付与补交最终 46 个执行文件、#26 的 4 个依赖叶子均与精确来源一致。31 份开发日志归档展开，29 个带原始日志描述的回执核对压缩前后 SHA/字节数；展开后 gitleaks 通过。
- main 合入后，100 个交付路径与测试树一致；2107 个非运行记录输入仍一致。排除的运行记录逐项写在 evidence.json，不作为已冻结的生产输入。源提交没有修改游戏知识。
- 合入沿 ops/live-merge.lock，先备份实例绑定，合并后恢复并校验 SHA 与权限一致。没有触碰 live、STOP、调度服务或共用配置。
- 首次合入脚本在隔离候选的稀疏索引检查处停止，尚未合 main，绑定恢复校验成功。确认提交树、2113 个输入和文件字节均未改变后，仅恢复未物化冷路径的 skip-worktree 索引标记，另存续跑回执后完成合入；原失败脚本日志和 integration.json 保留，未重写。
- 原轮阻断报告、独立退出 143 原件以及开发者早期含失败的原件全部保留，不改写为通过。上一轮材料仍在 paper/materials/20261022-issue33-integrator-review/。

生产路由、Codex/dsh 隔离、14 类只读工具（含 #26 六类）、完整工具输出审计、预算耗尽后的同引擎带已得信息收尾、错误和无最终答案路径已按原链实读。Codex/dsh 的自然生产身份、实际工具挂载、调用预算和返回完整性，仍须 ops 对实际 live 精确组合及首局读回。首批自然运行的前缀/预算遗漏、调用率、时延、完成/兜底，以及 DS thinking 无工具和文本工具调用等各自分账；不增加已取消的 A/B、额外试验或对局要求，不代填角色 ACK。

日志压缩原件、输入清单及安全扫描结果见 evidence.json；完整 Vitest JSON 与原始回执保留在 .artifacts/integrator-33-fix-20261022/。本次 main 全检不替代不同 live 组合的准入。
