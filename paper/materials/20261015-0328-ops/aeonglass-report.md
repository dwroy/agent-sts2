# Silent / AEONGLASS B4：rejected（20261014-232958-fix-batch）

本批拒绝上线。原始日志证实的力量增量校正可通过机制夹具，但验证集打穿偏差变差；原基准验收rc1。候选独立分支保留，未合live，未建eval版本。另有全boss回放覆盖不足及两对原runner错误，不把部分校准当完整结论。

## 身份、授权与源码

不可变dispatch_base `1e4be6b85e2d19e7e4dde8f0b5846846e06b250e`；实际候选源 `75951fd0eb883ff51cd0c94bd28b3db361279d47`。evidence key `32ed1e652c72defdf637dd1a95339cdbdfbd93238b18b06176f5c244c5af5ecd`，证据SHA256 `0648294fea0c7cd89bbbbe8fbb7b8753d142c3d970ebf43274c7166d14aee89c`。先保存副本，再核character=silent /boss=AEONGLASS /mode=b4 /key，复算一致。Roy 2026-10-07 12:11/12:35、fix-queue-v4 B4/B5及docs/boss-sim.md §13/14已授权。

开工树干净、HEAD=dispatch_base；接入live快进到8035f8223f0a5e9c7caea4971a5f547a6f9b8901，仅3份记录，保护源码不变，没有换base。原生启动请求实际核到gpt-6.1-sol/xhigh（runtime-model.json）。只用本角色日志和本独占树，不读其他角色知识、key/.env/游戏包，不联网、不play、不安装依赖、不改ops prompt。

## 数据、字节证据及SL截尾

冻结294已结束Silent局、1285boss尝试、524可用实际结局（383胜/141死）。759预测死亡尝试及另1兼缺T1的预测死亡截尾，不当实际死亡；另1实际结局缺T1排除校准。sources/fights/turns、run/SL前缀SHA与原偏移均留档。固定原107tune keys/切点；val415→417，新两场同时进入两侧。没有已结束A11样本，不把当前进阶当A11经验。

AEONGLASS39实际场=18胜/21死，10tune/29val。2145原状态帧核字节偏移/长度/SHA；全部524开场T1核角色/进阶/哈希，SL结局核原行偏移/哈希。原始场数表如下；末轮无后帧等使可比指标n减少，实际n以per-turn输出为准，不补缺数。详见raw-frame-audit.jsonl、all-openings-byte-check.json、sl-byte-audit.jsonl、trigger-audit.json。

| 回合 | tune | val |
|---|---:|---:|
| 1 | 10 | 29 |
| 2 | 9 | 29 |
| 3 | 9 | 29 |
| 4 | 9 | 29 |
| 5 | 9 | 28 |
| 6 | 9 | 26 |
| 7 | 9 | 23 |
| 8 | 8 | 17 |
| 9 | 6 | 14 |
| 10 | 6 | 11 |
| 11 | 5 | 5 |
| 12 | 3 | 2 |
| 13 | 0 | 2 |
| 14 | 0 | 0 |
| 15 | 0 | 0 |
| 16 | 0 | 0 |

## 本角色tune证实的最小校正

24次已完成加大力度转换：A0只观察前两次力量增量3/4；A1/5/6/7观察前三次3/4/5；A10只观察前两次4/5。原整场表是固定增量。代表证据K3676LU8B0UH F48 T3→4/T6→7/T9→10、25226ZFLNR1J F48 T3→4/T6→7、LRN0HPZ0FZS1 F48 T3→4/T6→7。A10 T3前原偏移7383814181、长度47503、SHA e3929a67da22f5b78a60f1b1f248836c029c900b408c6928f4e7c5df2150462f，完成后力量0→4；全部前后帧在新增intensity.json固定夹具/tune-intensity-transitions.json。初稿A0第三次外推5已撤，原草稿和账本update留史。

只改boss-sim.ts/rollout.ts；rollout-live.ts不变。fightAeonglassStrength只在Silent、已见进阶、新鲜T1且有AEONGLASS的slimInput附加。只有fullFightState初始化intensityUses，只在fullFight应用意图及整场lookahead读取。五回合不读，即使字段999也相同；铁甲/未知进阶/中途起点用旧表。未知后续次数退回原表，已校正前序的累积状态仍影响后续轨迹；没有复制铁甲经验或改实盘solver。

## 固定配对回放与不完整边界

每个数值起点200样本，t1/pre，seed=1+原全输入非空行索引*101，分片保留原行索引；最多30回合/策略节点1500和其他参数保持，未在val调参。base取dispatch_base、head取已提交候选。冻结common/Silent知识、game-data、原runner，paired-model-input-diff.json仅两处允许源不同。esbuild仅转译原runner；4条TSX控制和6条重复去耗时后语义逐字段相同（transpilation-replay-check.json/base-duplicate-check.json）。

目标39场两侧78起点均尝试；K3676LU8B0UH一对原board:no solve，保留错误，不造数值。目标数值为38场/76起点/9tune/29val，验证结局与逐回合覆盖一致。其他boss485输入逐键证实新字段不存在、不增加RNG；已有511条非目标baseline行在after原样复用，其中54G5683J0E5S的一对同样board:no solve。

预期1048条，两侧589条已有、585条数值、4条同源board错误，459条明确error:未完成，无模拟数字。coverage.json/paired-final-checks.json逐键列明。原生任务240分钟边界不能容纳剩余MC，停止仅自身回放工具会话72254，rc130，保留部分行和原日志；不触碰对局/调度。

原trust.py从固定107tune中实际只有106可数值起点，分别自然拟合整体Platt，整体校准不完整。以下目标Brier/gap受部分整体拟合影响，只是当前不完整档案值；打穿是同29验证场/152回合直接配对，候选变差。未与旧小集比较。

| 起点 | val n前/后 | 打穿比前→后 | 平均预测前→后 | Brier前→后 | 打穿回合前/后 |
|---|---:|---:|---|---:|---:|
| t1 | 29/29 | 3.623 → 3.667 | 0.686 → 0.683（实际 0.517） | 0.1739 → 0.1725 | 152/152 |
| pre | 29/29 | 3.711 → 3.753 | 0.703 → 0.698（实际 0.517） | 0.1824 → 0.1811 | 152/152 |

自然trust仍标AEONGLASS brier/gap/leak全失败，未进入trusted_b2/trusted_b3。部分整体T1 Brier0.1140→0.1137(n187)、pre0.1200→0.1198(n186)，不能证明全417验证覆盖达标。final-incomplete/留两份自然trust/results/provenance与8份t1/pre×tune/val逐回合json/txt；没有手写可信名单。

逐回合来袭/打穿/HP损失/敌HP/仍战比例全部保留。T1-val T7实际来袭28.6，模拟31.0→31.9；实际打穿3.2，模拟11.3→12.1；实际HP损失10.7，模拟11.8→12.5。候选修正部分真实力量序列却加大原整场高估；不得以此扩改实盘或补别的未知机制。

## 原验收与检查历史

先提交候选，再以dispatch_base原acceptance.py和其固定isolation.ts执行；最终`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261014-232958/learner/runs/20261014-233007-boss-sim-batch/acceptance.json`，rc1，原理由t1 leak worsened、pre leak worsened、no bias entered/approached its fixed standard。未改门槛/调度器/保护断言；除此之外459缺失/4board错误仍为独立限制。

实盘solver及五回合输出逐字节一致，SHA `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`，isolation.passed=true。撤候选源码3失败/2过，恢复5过。原bash tools/test-sandbox.sh独立无MC争用，PATH加原node、TMPDIR本scratch、nice19/SANDBOX_WORKERS2：TSC0/Vitest0、406文件3907项通过，sandbox-source-v2-isolated.log/.exit。源gitleaks0，检查通过后才源提交。

failure-history.json保留所有初稿/失败：相对game-data路径rc1、TS7旧API缺失rc1、时钟初夹具1失败、顶部夹具被老测试收集失败、四worker全套8失败(7超时/1归档导入扫描)、v2有MC争用1超时、自身各次暂停rc130、初次不完整验收rc1、最终验收rc1；另保留本报告初稿把board错误误算数值后被断言截住的失败。没有覆盖旧失败或将暂停当绿。

## 反证、拒绝账本及后续

触发清单含TXZ6RVMQA09D，但原SL/状态是F48 AEONGLASS第三试won/end_hp4，F49 TEST_SUBJECT第一试died/end_hp0；runs.death_fight仍写永世沙漏。实际AEONGLASS死亡21而非22，最低累计条件仍满足。原证据不改；questions.json/txz-outcome-conflict-frames.jsonl保留原SHA与冲突，交原ops完成通道→watcher→Roy；未把排队/报告当送达，未代填ACK。

根目录ledger CLI silent-0482由proposed追加rejected，kind=mechanic、真实局/层/回合/源/数据/验收路径俱在，shipped未填。未合live、未加eval版本、未写实际上线通知、未碰其他角色知识或root并行笔记。候选分支全部保留；原调度器负责复核及十场新战斗/新校准冷却，本会话未启动后续对局/批次，也不冒称后续完成。

新唯一归档`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261014-232958/experiments/boss-sim/silent/03944b9bf7d4c81ea0e60ed401786907c036d997dc80fe1856590831bf6f4f03`；report.json是fix-batch完成通道。升级小结引用本报告，没有A11可信度升级。

归档记录gitleaks首次rc1，仅3个已逐值核实的证据/文件SHA256误报；临时精确文件/行指纹放行后rc0，未关闭规则，原报告与证明留scratch。论文报告/小结/decision-log单独扫描rc0。
