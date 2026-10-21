# #15：拿牌 v2 数值进入大脑奖励选牌题

## 范围与来源

在 main `fc18ef37d6f1b4887e5007a81a0d278e795fd` 上按 #1 方向 2 实现；只给既有大脑选牌题增加事实，不变更选牌决策者、出牌、REFLEX 或模型训练。发布和首局自然读回交 ops，本文不代表已上线。

候选源码来自 `3ef4f16ac`，研究材料来自 `11a80b1e2`。移植 `opening-value.ts`、`opening_value.py` 及候选固定测试；冻结沿用 Silent 模型 `opening-value.json`，没有重新抽取或训练。

- 模型文件 SHA256：`ffdad3f470594916715bdd6859c406afeb20525cd230877cec524423c956483e`。
- 模型 ID：`41a8ec79809b23d50f7d914c531566643603b060b3b7b5799cf191b8b47b83ec`。
- 候选支持分母：训练 3535 场/260 局、校准 665 场/52 局、测试 806 场/68 局；按局划分，TS 固定测试核对分组不相交及 Python 导出预测一致性。
- #12 的单牌增量可辨识性研究独立进行；[其交付摘要](https://github.com/dwroy/agent-sts2/issues/12#issuecomment-6307460551)区分候选符号稳定和整题排序稳定。本补充冻结原模型，不宣称通过因果或单牌价值验证，不实现 #16 混合委派门。

## 实现

仅 `V6_BUILD=on`、`V6_CARD_DECIDER=brain`、Silent 且直接观察到同房间战斗→奖励、恰有三张候选和合法跳过时启用。恢复进程时只由原状态日志重建战斗来源。其他角色、off/shadow、事件选牌和来源缺失保留原题面。

每个原选项（含 skip）在原 facts 内增加 `card_value_v2`：

- `act_hp_saved`：按剩余路线战斗数计算，相对跳过本幕预计少掉血；`error_scale` 保留候选的累计整场留出误差尺度。
- `boss`：本幕 Boss 预计掉血、相对跳过少掉血、胜率、胜率变化。胜率变化由同模型加牌预测减原牌组预测，概率单位为 0–1。
- `cores`：最多两个被该选项推进的已发布组合，含推进张数、还差几张及未满足条件；`more_cores` 提示省略数量。没有推进则为空。
- 未知输入显式为 null/unknown；未见过的可见 Boss 不替换为其他 Boss。

上下文只补模型 ID、剩余战斗计数与路线来源，以及中文说明，含原句“增量多在误差范围内，仅供参考”。模型原有 rank/tier 只留审计表，题面不展示；不按预测重排候选，不设强制拿牌/跳过线。原大脑请求、答案解析、fallback 保留。

运行时按 run 冻结模型和已发布组合快照，缓存键覆盖牌组、候选、HP/资源、楼层、路线和模型。纯本地树预测，不增加 API 请求或模拟任务；计算预算 450 ms，失效、异常或预算用尽均省略补充。完整结果追加到与 runPlanLog 同目录的 `v6-card-value.jsonl`。

整场误差不是单牌增量置信区间；预测使用当前 HP/资源，不预测沿路存活，观察数据含历史选牌混杂。组合缺牌数和条件不证明组合成型或收益。没有把跨角色数据并入 Silent 验证。

## #3 共享 builder 协调

开工前已在 [#3 评论](https://github.com/dwroy/agent-sts2/issues/3#issuecomment-6307167520) 留下最小范围。`build-fight-value.py` 只在 `main(argv=None)` 开头增加以下四行：

```python
args_in = sys.argv[1:] if argv is None else argv
if args_in and args_in[0] in ("opening-extract", "opening-train"):
    import opening_value
    return opening_value.main(sys.modules[__name__], args_in)
```

它调用独立模块，原 extract/train/all/rollout-report/folds 路径不变。P4 集成应局部合并这四行并保留其缓存/检查点改动，禁止整文件覆盖；本提交不夹带 P4。

## 验证

检查于 2026-10-21 执行，命令均 nice 19。原始输出归档在 [checks/](checks/)，包含早期回放测试适配失败、修正后的通过输出和两次广域回归中断，旧输出未覆盖。

| 检查 | 结果 | 原始记录 |
| --- | --- | --- |
| `npx tsc -p tsconfig.json --noEmit` 等价的本地 node/tsc 直调；沙箱脚本亦先执行 tsc | 退出 0 | `checks/tsc.log`（成功静默） |
| `vitest run tests/opening-value.test.ts --pool=threads --maxWorkers=1 --reporter=verbose` | 3/3，0.70 s，退出 0 | `checks/opening-value-final.log` |
| `vitest run tests/v6-card-value.test.ts --pool=threads --maxWorkers=1 --reporter=verbose` | 5/5，5.08 s，退出 0 | `checks/card-value-final.log` |
| `vitest run tests/v6-brain-card-value-loop.test.ts --pool=threads --maxWorkers=1 --reporter=verbose` | 6/6，8.19 s，退出 0 | `checks/loop-final.log` |
| Python `unittest` opening builder | 3/3，退出 0 | `checks/python-opening.log` |
| 新 `opening-extract --help` 与旧 builder `--help` | 均退出 0，未启动抽取或训练 | `checks/opening-help.log`、`checks/legacy-help.log` |
| unrestricted vitest / 仓库固定沙箱清单 | 均主动中断退出 143；后者已输出 1417 条通过、未见失败，无最终汇总 | `checks/full-vitest.log`、`checks/sandbox-attempt-1.log` 与两份 interruption 记录 |

广域测试的单 worker 仍留下多个 esbuild 子进程，超过本任务 ≤2 进程限制，因此仅按已核实主 PID 停止，确认子进程随之退出；不能把中断计作通过。最终三项新功能测试逐文件退出，共 14 项通过；完整 vitest 与原固定排除项交 ops 在允许的资源窗口补验。源码与说明文档的 `git diff --cached --check` 通过；原始测试日志保留末尾空行，排除其空白告警，不改写证据。

两局首次冷载入预测与全准备耗时（含模型/组合载入、完整审计追加、紧凑事实 JSON 打包；同次回放与 off 对照计算题面字节差）：

| 固定回放 | 预测 ms | 完整准备 ms | 题面增加 UTF-8 字节 |
| --- | ---: | ---: | ---: |
| `T0TP8S9MMU9Q` F2 | 214.81 | 216.66 | 1594 |
| `RBMEQGXPE9Z2` F3 | 183.65 | 185.34 | 1591 |

这是固定数据回放性能，不替代首局自然读回。

真实循环回放采用固定局 `T0TP8S9MMU9Q` F2、`RBMEQGXPE9Z2` F3：本地 HTTP fixture → 实际 runLoop → 原 brain adapter → 捕获大脑题面 → 执行 skip。两局均为一次大脑请求、零 Jev 请求，保留原循环必需的 Boss 评估，与 off 对照模拟调用次数相等。剥去新增字段后逐项等于原问题；仅归一化原 Boss 模拟的墙钟耗时文字。大脑固定选择 skip，证明预测不会覆盖答案。

缺模型、损坏模型、超时及无战斗来源四种回放，题面均与 off 对照一致；另测其他角色、off/shadow/Jev 不进入路径，缓存失效、未观察牌/Boss、0 ms 预算、模型导出一致性等。

## ops 待完成验收

1. watcher/Claude 验收后，ops 先补齐完整 tsc + vitest（保留原失败/中断）；再由 ops 按局终挂 STOP 的原流程冻结最新 live/知识并精确合入本提交；与 #3 局部合并 builder，保留最新知识。保持 CARD=brain、REFLEX=off。
2. ops 在原发布锁中核 live SHA、分配 `release_id`，登记 `eval/versions.json`、decision-log 及规则变更双通知；本开发树不预分配版本，不动 live/STOP。
3. 首个自然战后奖励核实大脑实际题面含三张候选及 skip 的补充，`v6-card-value.jsonl` 与同局/楼层/模型一致，无报错、无额外 Jev 请求；核实际准备耗时和题面字节。自然读回前不关闭 #15。
4. 回退本提交即可恢复原奖励题；模型缺失或预算失败也会自动保留原题。回退只交 ops 沿原上线流程操作。
