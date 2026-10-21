# CEN1Z8HEU7NM 连战非正 HP 异常

本次确认是 rollout 的终局判定错误。11 个冻结失败封套使用各自原始种子均可复现：solver 已给出 `dies=true / winsFight=false`，但反伤使最后一个敌人倒下，rollout 把 `allDown()` 当作胜利，再用 `!won` 屏蔽死亡，产生 `won=true / died=false / hp≤0`。第二战资源守卫正确拒绝了这个矛盾状态。

修复只改变 `agent/src/reflex/rollout.ts` 的胜死优先关系：先应用 solver 已结算的 HP 和自动复活，再判定死亡；死亡样本不能获胜或进入第二战。没有补血、截成零、放宽第二战资源校验、调整预算或改知识。修后 11 个原样本全部正常返回首战失败，未触发 `ContinuationSampleError`，也未尝试第二战。它们的回合数及负 HP 与原始计算一致。

## 来源与边界

- 指派：Claude 2026-10-21 08:4x，原文要求以 CEN1Z8HEU7NM 的 `states.jsonl` 帧复现 R409 `missing successful first-fight resources: nonpositive-hp`；修复与回归测试后交 ops 串行完整检查、局终发布。本次 owner 为既有 codex1 / v6-w8 会话 `01a15382-761a-76a2-922d-271169b2463c`，没有新派模型或学习批次。
- 工作树：`.worktrees/v6-boss-continuation-hp-20261021`，基线为实际 R409 `cf4aff4ceebd958ad70b1512cc886c45bd8092aa`。
- 11 个封套来自 `logs/sim-failures/b6ddac7edc547c659ee8c4a54ae448099b18053926eb17e8c1f9e67b2948ab5a/`；原文件、V8 payload 的 SHA 及来源题见 `evidence/sources.json`，原封套压缩保存在同目录。
- `evidence/frames-manifest.json` 固定 `states.jsonl` 截止字节 15056782758，只扫描其末尾 64 MiB，命中该局 640 行。11 题均与原始状态规范化内容完全相同；对应原始 JSONL 行、偏移、长度、原字节 SHA 和时间均已保留。未声称扫描全部 15 GB 状态日志。
- 固定 console 前缀为 337258 字节，SHA `91d60f413d0031a408b9346f28f26a442d1ec0ca088d201a03318e88ef86c650`。其中 41 行含该错误，包含 note/wait 的重复输出，不能当成 41 次独立模拟，也不是整局总数。

## 冻结回放

完整逐题记录见 `checks/replay.json`。运行的是单进程 `fightSample`，使用封套中的实际输入、plan、seed、maxTurns、scripts、order，不经工厂、worker、existing-wait 缓存、模型或 live。种子相同不代表封套相同，各题输入分别冻结。

| 层 | 题型 | 种子 | 原首战终局 HP | 修后首战 |
| --- | --- | ---: | ---: | --- |
| 35 | reward/card | 1797734085 | -27 | 失败，不续接 |
| 39 | reward/card | 46797397 | -25 | 失败，不续接 |
| 40 | shop/plan | 46797397 | -25 | 失败，不续接 |
| 40 | selection/remove | 46797397 | -25 | 失败，不续接 |
| 42 | rest/plan | 2373876564 | -3 | 失败，不续接 |
| 43 | reward/card | 2156925123 | -16 | 失败，不续接 |
| 44 | shop/plan | 2950019043 | -32 | 失败，不续接 |
| 46 | event/choose，两个封套 | 2373876564 | -11 / -11 | 失败，不续接 |
| 48 | combat/plan，两个封套 | 1580782644 | -12 / -12 | 失败，不续接 |

例：F35 样本最后一回合起始 HP=5，solver 结算 HP=-27、`dies=true`；敌人剩余 15 HP、反伤 15。旧代码先把敌人标为倒下而设 `won=true`，随后 `!won && (...)` 得出 `died=false`。这已足以解释非正 HP 的成功资源；无需改变资源捕获或缓存。

该问题不要求 R409 新缓存参与。静态核对 R406 `4528a751f…`、R408 `150890f8…` 与 R409，三者都有相同的旧终局判断，见 `evidence/terminal-history.json`。这只是源代码归因，没有重放三个历史版本或证明前几局未出现的原因。

## 验证

- 原生产代码红灯：新增测试当时 14 例中 12 败、2 过；包含 11 个原异常和一个同时致死边界。原失败日志 `checks/red.log` 未覆盖。
- 最终回归增加零 HP 边界：11 个真实样本、负 HP / 零 HP、玩家存活的反伤胜利，以及自动复活消耗一次，共 15 例。复活先结算，成功存活的原行为保留。
- 最终 `npx tsc -p tsconfig.json --noEmit` 退出 0；8 文件 133 例通过，包含 rollout、boss-sim、连战诊断/worker 失败处理、Silent lethal continuation 和 margin attribution。精确命令、退出码与原日志见 `checks/final-checks.json`、`checks/related-final.log`。全部 nice 19、ionice 3、单 worker、主盘短 TMPDIR；未运行 full。
- 11 个修后单样本回放耗时 47.95–287.52 ms，中位 84.98 ms；这是纯样本重放，不能当作真实单题端到端等待改善，也未据此宣称每题约 7 秒等待已在线消失。
- 精确三叶源码、压缩原件以及解压/V8 解码后的数据均扫描；结果见 `checks/scan-receipt.json`。完整实际 live 组合检查和自然消费者读回仍由 ops 接续。

## 交付

生产只改一叶，附一个固定测试及一个冻结输入文件，精确 source/base/tree、前后 SHA/blob 在 `checks/source-manifest.json`，运输仅用 `checks/minimal-source.patch`。不运输验证父、整 main、P4、805、知识或配置。基线之外若有非重叠 live 漂移应保留；冲突由 ops 核精确 hunk。

本任务没有启动对局、真实模型/API 请求、学习批次或完整检查，没有修改 live/STOP/Regent/正式知识。按 ops 已原生预留的队列，正式源齐后由 ops 锁内冻结届时实际 live 与最新知识，运行单次完整检查，成功后沿已授权局终边界发布并登记版本。工程修复不关闭 0332 等科学父要求。
