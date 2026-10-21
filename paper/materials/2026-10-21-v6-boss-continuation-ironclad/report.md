# CEN 续局资源修复：铁甲唯一失败的原题反证

2026-10-21；原 owner 为 codex1 / v6-w8，同一 CEN 纯 bug 任务续接。原 ops full1 与输入保存在 `original-ops-full1/`。本次没有新学习、模拟批次或模型请求。

结论：原铁甲断言依赖两次 HP=0 的虚假胜利。保留 f993 的生产死亡优先修复，只增加原题逐样本死亡断言并更新首选断言。本项明确改变该铁甲原题的 `rollout_best`，不能记为铁甲逐字节等价；没有修改排序公式、阈值、时间预算或知识。它是模拟终局记账修正，不是开发者新增打法经验。

## 原失败与受测边界

ops 在 R409 `cf4aff4ceebd958ad70b1512cc886c45bd8092aa` 加 f993 三叶的真实组合，固定 tree `377e290c4f74b2df7877748fb2f936e885322b4e`，2395 输入 SHA `aca3e839cd7e2a9982246971fc6fcc4dd4eedf933aee90b765131450ec20a869`，tsc0/full1：629 文件 628 过 1 败，5962 例过 1 败 2 跳。唯一失败为 inferno-planner.test.ts:170，旧期望血墙+、上勾拳+；实际防御、上勾拳+、打击。full SHA `9a0b2ddd10a1bc4cdaea37c89a6650f26a992a908954802f31b52b708f312936`。没有归因为资源争用或超时。

原题为 A8ENYFR4ZWKG F33T6，34 HP、INFERNO_POWER=18、知识恶魔；测试自身固定 v4 历史知识、时钟和 5 回合×8 样本，不读取运行日志或热知识。`frozen/refs.json` 锁定题面、牌面与求值器 SHA；`frozen/a8en-f33-t6.json` 保留原题。历史记录里的实战 Jev 选择本来是防御、上勾拳+、打击；这只作原始来源，不作为新修复收益或新实战验收。

## 唯一改变的两个样本

相同捕获输入、种子和后续出法，分别用旧 guard 与 f993 guard 回放。两首选候选各 8 样本的完整资源/求值轨迹在 `diagnostics/*-samples.json.gz`；程序逐字段核对仅下面两条记录的 `won/died` 改变，其余记录相同。六条候选的汇总在 `checks/counterexample.json`，其它五条的样本汇总相同。

| 血墙+、上勾拳+ 的种子 | 第 2 回合后 HP | 第 3 回合出法 | 求值器既有结果 | 旧 rollout 记录 | 修复后记录 |
| --- | ---: | --- | --- | --- | --- |
| 15264880351131 | 1 | 突破 | hpLoss=1、hpAfter=0、敌 HP=0、winsFight=true、dies=true | won=true、died=false、HP=0 | won=false、died=true、HP=0 |
| 15264880351132 | 1 | 耸肩无视、突破 | hpLoss=1、hpAfter=0、敌 HP=0、winsFight=true、dies=true | won=true、died=false、HP=0 | won=false、died=true、HP=0 |

既有固定牌面与 CardModel 已包含突破的扣血；不手写或更新知识。这里不是下一回合 Inferno 扣血，而是打出收尾牌当回合扣到 0 HP。原 rollout 的 `!won && (o.dies || player.hp <= 0)` 隐藏了求值器已经返回的死亡；f993 保留 `o.dies || player.hp <= 0` 并取消该样本的胜利，与 CEN 反伤收尾是同一个记账缺陷的另一条路径。原 CEN 回归还覆盖仙药复活；本样本没有被漏掉的复活。

## 为什么首选改变

| 候选 | 胜场旧→新 /8 | 死亡旧→新 /8 | 原始平均失血旧→新 | 排名值旧→新 |
| --- | --- | --- | --- | --- |
| 防御、上勾拳+、打击 | 5→5 | 3→3 | 28.5→28.5 | -43.5→-43.5 |
| 上勾拳+、打击 | 2→2 | 6→6 | 30.375→30.375 | -60.375→-60.375 |
| 防御、打击、上勾拳+ | 5→5 | 3→3 | 28.75→28.75 | -43.75→-43.75 |
| 血墙+、上勾拳+ | 7→5 | 1→3 | 32→32 | -37→-47 |
| 打击、上勾拳+ | 2→2 | 6→6 | 30.625→30.625 | -60.625→-60.625 |
| 血墙+、打击 | 0→0 | 8→8 | 34→34 | -74→-74 |

原公式 `-hpLoss - 40*(1-winProb)` 不变：血墙行去掉两次假胜后为 -47，防御行 -43.5，因此首选翻转有完整数值解释。5/8 只是冻结模拟样本，不能据此宣称实战胜率提高、动作已实际执行或整场收益。这里改变的是 ask 题内的推荐标记。

## 最小修改与检查

新增来源只有 `agent/tests/inferno-planner.test.ts`：通过既有 rolloutTap 捕获实际输入，保留原两份 Inferno 比一份死亡更多的断言；锁定两候选 5 胜/3 死与失血顺序；逐样本断言收尾前 HP=1、收尾后敌 HP=0 且我方 HP=0、won=false/died=true；所有成功样本 HP>0；最后锁定新的 `rollout_best`。未删掉死亡比较、未放宽 timeout 或阈值。

`diagnostics/checks.json` 与原日志：新断言在旧 guard 下 1 红（实际 7 胜/1 死）；f993 下 tsc0，9 文件 138 例通过。nice19/ionice3、单 worker、主盘短 TMPDIR；没有自行跑 full。`compare.py`、`samples.py` 是本树临时诊断脚本，只加输出/资源捕获并在 finally 恢复生产与测试文件，不随工程运输。首次 stderr 捕获草稿、旧期望红灯、ops 原 full1 均保留，没有覆写失败。

只向 ops 交单叶 `checks/minimal-source.patch`，必须与原 f993 三叶组成实际 live 联合输入；不运输验证父、整分支、P4、预测器或 805。main/live/当前局/STOP 未动，下一次完整验收与发布仍归 ops 原单点窗口。0332 科学父不关闭。
