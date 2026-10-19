# W3 B 与生产请求工厂接入

这是 W5 原报告的后续集成记录，保留原报告和各轮检查原件。B 基线为 10936edd35db2b3b6f56cebc82d9dcba3de67482；共用工厂已合 main a92e8b37f（交接记录13a06c1e4）；本轮正式检查结果见 checks/formal/，以最终结果为准。

消费边界为 `agent/src/v6/projection-input.ts`：每个 run/角色/进阶只读加载一次本角色历史包、正式核心卡或过渡模板、support、Boss trust、双 Boss 配置与知识；生产请求交 W3 的 `createV6ProjectionFactory(snapshot).create(situation)`。不在消费端推导历史知识，不写 sim 文件。off 和战斗入口不读取这些文件。缺包、无方向或工厂不可用时返回 null，拿牌题保留 unknown，不跨角色回退。

实际奖励索引映射 `card<index>`，添加牌的副本数沿 `permanentCardGain`。每次请求读取最新方向概率和临时组合；幕初存下新答案后重新生成 pick 表。`asOf` 在本次进程首次观察该局时固定，历史包替换在同一局不生效，重启或新局才加载新快照。

路线使用既有选定路径和房间成本模型，签名包含本局、楼层、HP、路径与成本。始终显式传 route，包括空路径；缺目标的进场 HP 保持 unknown，不能退回历史 HP 冒充当前路线预测。当前只提供已选择的本幕路线；未提供同样本 Boss 出场资源回调，跨 Boss 的后续路线保持 unknown。T5 仍要求既有提供方给出可校准的危险线；本消费层不另造阈值。

pick 跨方向比较直接读取 `pick_direction_comparisons`，只消费相对当前最大脑概率方向、已知质量为 1 的 `joint_paired_delta{mean,se,n}`。缺配对值或不完整/非有限质量保持 unknown，不用边际误差合成配对误差。正式引擎的同种子连战固定数据测试覆盖 T3、第二次新评估的 T2 和缺质量分支；同一次轮询不增加连续证据次数。

前台与空闲预计算共用同一 `V6ProjectionEngine` 和 runner/pool。前台先 invalidate 并等待 `acquireForeground`，然后开始独立 compute 预算，finally release；等待在途空闲任务不扣新的 5000ms 计算窗口。空闲计算只由循环原有等待边界驱动，窗口限于现有等待时间，不另启 timer 或后台池。Jev 的 5000ms 单独计，战斗预留沿原实现。

投影结果写 `v6-build.jsonl`，可选 `stage=projection` 与触发/答案/大脑等待分开统计；默认 off 不新增文件。正式 W3 生产包仍仅有 1 个组合指标，既有回放未知 100%、缓存 0。本次固定合同测试不能当成生产投影质量或自然收益验收。

工厂正式合入前，通过仅用于测试的路径映射，只读导入 watcher 工作树的冻结接口；消费端的 2 文件 / 7 项固定测试通过（8.30s）。覆盖本角色快照固定、新局重新读取、缺包与 off 零读取、实际奖励牌组改动、空路线 unknown、路线签名变化、独立计算预算及前台 lease。该预检未复制或修改提供方代码，不替代正式 main 提交上的集成检查。首次预检因配置文件路径错误失败，原件与修正后的成功结果分别保留，不改写失败记录。

同一只读路径映射的拿牌与方向提供方预检另有 2 文件 / 20 项通过（10.71s），覆盖 Nova choice 候选格式、拿牌路由与 off 等价、正式配对输出到 T2/T3 的消费链。原件为 `.artifacts/v6-factory-preview-consumers.log`；最终验收仍以工厂合入后的正式集成测试与全检为准。

W9 合入 main `f7218dbc9` 后，W5 已在该版本上变基，原 W5 提交重放为 `d19ea4b66`，工厂消费接线保留在本工作树。拿牌、方向提供方、生产输入、计算运行时与大脑日志的联合只读预检为 5 文件 / 41 项通过（8.57s，退出 0），原件 `.artifacts/v6-factory-preview-after-w9.log`。该结果仍使用提供方工作树的只读路径映射，不能替代工厂正式合入后的 tsc、完整 Vitest 与 gitleaks。

生产 runtime 现向 W7 开放 context(env, "pick") → {factory, situation} 与 evaluateRequest(env, request)，后者共用前台 lease 和独立计算预算；完整消费例子、拒绝选项和未知数据处理合同见 interfaces.md。
