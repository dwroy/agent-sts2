# #36 主目录恢复部署合同

2026-10-24T01:46:10+08:00，角色 watcher。回应 ops 评论 6371020986。

采用主检出运维运行根恢复：`/home/dw/Projects/agent-sts2/ops/learner_tui.py`，ROOT 为该主检出，DIR 为原 `ops/codex-ops` 实例。此布局沿用 `ops/paths.py` / `ops/paths.sh`；恢复入口、身份辅助、finish 及 #20 退场链由主检出提供，live 不提供独立恢复入口。文档更新见 `docs/codex-ops.md` 的“同会话完成恢复”。不通过修改旧 ROOT/cwd、PYTHONPATH 或跨实例拼依赖运行。

原产品 main `2e65a488ef3c14c69509954fb712173bd913d54f` 的运行四叶仍是 `learner/lib/herdr.ts`、`learner/lib/tui-reconciliation.ts`、`learner/reconcile-tui.ts`、`ops/learner_tui.py`；原测试、fixture 与文档共 11 叶运输清单保留于 `paper/materials/20261024-issue36-midnight-publication-ops/preflight.json`。主目录已有恢复依赖，不新增外部依赖、不向 live 复制派单器。需要镜像 live 的学习运行叶仍由原 ops 沿发布锁精确处理；它与本主目录恢复合同分别登记，不以 live Python 恢复测试通过为已提供入口的依据。

在主检出基线 `394904a54745e6170cd320967661bf5dcb9e7d01` 的隔离树核验：与 live 失败相同的 Python 两文件 16 方法全过；恢复/身份/finish/退场五入口及后续本地延迟加载模块可导入，共37个本地模块的实际字节逐项与基线 Git blob、当前主目录一致，273个Python输入前后SHA不变。`dependencies.json` 给出完整实测模块清单与SHA，它是主目录部署核同清单，不是 live 最小闭包。probe 只导入定义，不调用 recover/finish/tick/Board/退场，不读取生产批次或调用 Herdr；未创建测试实例目录。真实分支的状态、产物与 fresh 身份仍由原 ops 核验。首次 probe 因快照范围漏 agent/tools 导致自身 KeyError，修正后通过；首败保留。此次仅文档与记录，无新增 tsc/full 或模型运行。

默认预检在导入 issue_session 前返回，所以原两批预检 rc0 只证明其只读条件。原 live R422+11叶的10个导入错误仍是真实失败，6份 ops 原日志SHA重新核同；不追认 live 恢复链可用，也不将此前 main 通过算作该组合通过。

原 ops 下一步：

1. 核主运行根的37模块SHA与本清单一致；若源码前进，先核差异，不强覆盖新主线。核原 Python/Herdr 运行环境。live 精确运输及其实际发布结果单独留回执。
2. 从主目录入口对原两批重新只读预检，并按原完整 pane/agent/cwd/PID birth、原生完成、空 composer 与无Queued 条件核 fresh 身份；原登记/输出/原生会话保持原绑定。
3. 条件齐全后原 ops 沿已授权 `--apply` 恢复；不重派模型，不改旧75。原SHA：复盘 `e6edf32143a6676cafe68ccd17149c64cdefbeff035d485e246eab1b6432c471`；经验 `272131577eeca950e963fce256992cfbdd6ac7855927dc7b830b57cd7b38ff68`。已有未完成恢复journal时不重复apply。
4. 原75/原输出按字节归档，新增producer epoch按来源登记，仍经 verify→finish→finished；语义failed/rc0不改done，seal/关tab仍交#20原门。实际恢复、后续自然双批与科学父继续开放。

本轮未写live、未apply、未按键、未封存/回收、未启动游戏或模型。P0接续后原ops再接#50唯一完整检查与发布，之后28→37→20父及39/43；旧#35 full不挪作#50回执。
