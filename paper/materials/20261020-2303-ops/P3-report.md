# V6-W8 P3 交付

Claude 22:4x / Roy 授权、docs/v6-plan.md 第 12 节（0ee818a8f）下完成对照式奖励选牌小脑格式、独立消费器及 R4 模板。正式源 ab1f2561832b2909233bc55e52842f1bf726e5a0，11 叶；尚未合 main/live，完整检查待 ops 单点窗口。没有派学习、改正式知识、请求模型、运行游戏或修改任何生产开关。

条目以实际拿牌前牌组和候选为共同条件，记录拿牌相对同候选未拿的观察差值、基线、两组样本、独立局数及聚类 t 区间。confidence 从差值、误差及局数计算。只在 V6_REFLEX=on 且区间不含 0 时进入原奖励选牌题；正负方向都保留，不把观察差异写成因果收益。缺字段保持 unknown。详细合同见 interfaces.md。

检查均在本功能树、nice19/ionice3、主盘短 TMPDIR、单 worker 下完成：

| 检查 | 实际结果 / 原件 |
| --- | --- |
| TypeScript | tsc-frozen.exit=0 |
| 最终定向 | targeted-frozen.exit=0；6 文件 / 103 例；7.62 秒 |
| 题面构造 | 两条有符号对照；6,895 字节；同测试原始输出 |
| 源扫描 | gitleaks-frozen.exit=0 |
| 完整检查 | 未启动，交 ops 排唯一窗口 |
| main / live / 学习派发 | 均未进行 |

命令是 `npx tsc -p tsconfig.json --noEmit`，以及 `npx vitest run tests/v6-reflex-contrast.test.ts tests/v6-card-pick-reflex.test.ts tests/v6-card-pick.test.ts tests/v6-formats.test.ts tests/v6-draft.test.ts tests/v6-predicate-context.test.ts --maxWorkers=1`。PATH 加 ~/.local/node/bin。冻结源及 1,527 个当前存在的相关源码/测试/配置文件 SHA 见 checks/fixed-inputs.json；这不是完整测试输入验收声明。

原失败不覆盖：targeted-1 是测试期望空 reflex 数组，但现有有界题面会省略空数组；改为断言字段不存在。targeted-3/4 是新草稿固定上下文遗漏词表证据局 FIXTURE_RUN；补齐固定上下文后通过。所有日志和退出码保留在 checks/，最终生产源没有为适配这两项改变过滤行为。

唯一生产题面挂接文件 card-pick.ts 只替换 reflex 组装，未改 A/B 指标、严格来源门、方向搭车、权重、预算、模拟输入或安全门。当前正式知识未包含本轮对照条目，部署消费代码不会生成游戏知识。R4 模板要求学习者产出可核验 pending 草稿并给出所有未识别/反例，后续发布与实际采用仍须闭环。

接续：ops 核 11 叶与必要现有接口后排完整检查，并可按模板派 R4；不得把本定向或模板完成当学习/正式发布完成。W8 继续 P4 回执和增量刷新排查，不查询 P0 在途 full。
