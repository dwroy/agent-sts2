# 静默沙虫 B4：范围外取帧偏差，拒绝发布

2026-10-09 05:48:15 CST；批次 `20261009-041301-fix-batch`。本批 **rejected**。独立原日志核实了取帧偏差；修正需要修改 `agent/tools/boss-sim/character_extract.py`，超出本批只准三个 fullFight 模拟源文件的范围。255 个实际可行动回合的攻击向量与现有模型一致，没有形成限定范围的新校正。未修改源码、未合入 live、未建 eval 版本。

## 授权与固定基准

已读 README、最新 STATE、decision-log 末尾、学习协议、根目录 fix-queue-v4「B4 / B5 纳入标准流程」原节及 docs/boss-sim.md 的方法与门槛。适用 Roy 2026-10-07 12:11/12:35 授权，不另请审批。启动时工作树干净，初始 HEAD/live/不可变 dispatch_base 同为 `473a38a1a8d133f0a811f8a3c8ff454ae6363984`；`git merge live` 已为最新，未替换基准。只用 silent 原日志学习。

character/boss/mode 为 `silent/THE_INSATIABLE/b4`；证据键 `ebc0af98fece070bb1cd4a6bb42d8712ecb6be6104230cbdecb1bf5ee5c7e329` 已按原调度算法删除 key/dispatch_base 后重算相等。原件副本 SHA256 `47c5f0364bf8ad1513b2876b198c383b61dd0780f8cc70dacdd2bc93e260d49c`，完成前再次核对原件不变。数值来源及逐文件哈希见 provenance.json；只读取本角色与既有 common 模型。

## 原字节、SL 与逐回合覆盖

冻结 153 个已结束 SILENT 局、705 次 boss 尝试，281 场实际结局可用（202 win/79 death）；423 次 predicted_death 是截尾，另1次实际结局缺T1手牌排除。沙虫76次尝试：30场实际（20 win/10 death）、46次截尾。原 tune107及切点 `2026-10-06T02:46:11.648000` 全保持；val174，和本次触发证据一致。目标 tune9/val21。全部对局与 SL 尝试按原局分账，终回合打穿未知时保持未知。

独立复核703条开场源哈希、3147张目标COMBAT帧、10个实际死亡终局。触发 logged_keys/death_runs 和原日志一致；GAME_OVER 的 SILENT/HP0/is_victory=false 与 SL died/end_hp0 一致。终前帧HP可能仍大于0，不能把 predicted_death 截尾当死或用终局总损血倒推敌方打穿。原 off/len/SHA 在 target-frames.jsonl、sources.jsonl、death-terminals.json；覆盖见 turn-coverage.json。

沙虫全体T1–T13实际场数：30, 30, 30, 28, 28, 27, 24, 23, 16, 11, 6, 1, 1。验证回合对应场数：21, 21, 21, 19, 19, 19, 17, 16, 12, 8, 4, 1, 1。模拟 perTurn 最多原 runner 的前16回合；相同逐回合覆盖同时进入两侧。

## 可证实偏差与范围限制

十组三帧夹具均保留原行全文和 off/len/SHA：9R916WW0V65N F33 T2/T3/T5可行动→次回合HP变化4/10/9；SY0WMJNNVRLM实际尝试6 F33 T2/T3/T5/T6为4/8/24/10；新增 HEMND3SMQYB8实际won尝试1 F33 T2/T3/T5为2/12/3。末COMBAT observed 帧已不可行动、snapshot_stable=false且扣血，末帧→次回合差均0，原提取器因此记录 enemy leak=0。阶段差值只作诊断，不替代仍须归因开始损失/回血的正式敌方打穿估计。

包括截尾尝试共发现30个相同阶段现象；可用实际结局只采用上述10组夹具。原源码、提取器、trust及验收规则保持；不把验证残差用于调防守参数。本批是B4，未重新开展B5策略/排序参数试验。255个实际可行动回合的现有 enemyTable 攻击伤害/次数核对无失配，但这不是所有牌/遗物/未知机制都正确的证明。没有新增模拟字段，铁甲及其他角色源行为保持等价。

## 相同输入配对与自然验收

全部boss重新重放，281场×T1/pre=562起点，各200样本，seed=1+冻结完整fights原始零基行索引×101。560个成功；K3676LU8B0UH F48尝试2的T1/pre原错误 `board: Error: no solve` 原样保留。没有新预测补数。176个TS输入逐一与dispatch_base的git blob一致，采用已有esbuild逐文件转译，源无改动；独立原Node/TSX对ZZMY的T1/pre各200样本复跑，全部非耗时结构与数值相等。

触发旧档案与启动冻结模型的指纹不同，十个共享知识输入SHA已变化（仅核对文件指纹，没有由旧档案增加机制）；详见trigger-current-model-comparison.json。本批因此重放所有boss、不复用旧数值结果。触发T1 Brier/整体Brier为0.1643/0.1143，本批同输入两侧为0.1651/0.1155，二者不能作为候选前后改进比较。

没有可证实的限定范围源码候选，故before/after显式采用同base、同固定输入和同原样本复用，paired-result-audit.json保留依据。原trust.py分别运行生成两份档案，SHA `d3ac121ecc347b0442fd3e03f0e15bebe6441c83614b4f20bc395939ff7912b0` 相同；split/dataset/source/结局/逐回合覆盖相同，整体Platt只在tune拟合。没有把旧小验证集与本批大集混比，也没有手写可信名单。

| 起点 | 目标验证n | Brier 前/后 | 预测/实际胜率 | 打穿比 前/后 | 打穿回合 | 整体Brier 前/后 |
| --- | --- | --- | --- | --- | --- | --- |
| t1 | 21 | 0.1651 / 0.1651 | 0.659 / 0.619 | 1.497 / 1.497 | 111 | 0.1155 / 0.1155 |
| pre | 21 | 0.1893 / 0.1893 | 0.687 / 0.619 | 1.522 / 1.522 | 111 | 0.1161 / 0.1161 |

基准commit的acceptance.py SHA `130dd7d6f3ec718ccc6d193895155c35727ecb1d23aeb591736d88419235b81a`，原固定runner与门槛未修改；base=head为dispatch_base。原验收exit1，原因 `['no bias entered/approached its fixed standard']`，improved=[]。14组实盘solver/五回合输出逐字节隔离通过，SHA `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`。两侧没有偏差严格改善，自然拒绝发布。未形成源码候选，撤候选真红/恢复绿为N/A，`fails_without_fix=false`，不能借原门槛拒绝声称代码修复通过。

## 检查、失败历史与记录

原 `bash tools/test-sandbox.sh` 在agent执行，PATH加本机Node、TMPDIR固定本批scratch、SANDBOX_WORKERS=1、nice19；原排除名单未改。实际tsc0/vitest0/2627例，日志 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261009-041301/learner/runs/20261009-041305-boss-sim-batch/sandbox.log`。这不是沙箱外完整检查。初稿失败原样保留：不存在的replay.ts读命令、初始计数断言混入169张CARD_SELECTION帧、ledger请求草稿的Python字段索引TypeError（未执行CLI）、最近死亡核对初稿直接用英文id比显示名（最终按本角色档案名称核对五局一致）；分析公式初稿误写shrink字面量，但本次无该分支观测，之后改用源码导出的既有常量。原数据/结果和勘误见history。没有修改产品规则。

gitleaks针对指定本批文件运行；初次唯一命中是原证据JSON的公开SHA证据键，已按调度算法和精确文件/行重算证明，保留原redacted结果，只精确fingerprint排除该公开哈希，通用检测规则不变。最终指定暂存内容扫描exit0；初次暂存扫描四个命中全部按原调度算法、文件/行/匹配列逐一证明是同一个公开证据SHA，只排除这四个精确fingerprint。原exit1、redacted结果、证明和确认exit0均保存于gitleaks-staged-*，通用规则未改。

根目录ledger CLI对已有真实fight条目 `silent-0303` 追加本批rejected及HEM三个回合repeat证据；旧claim/首证/全部状态历史保留，不造重复bug-infra或shipped。实际CLI/退出码/show/check均归档。自己的升级小结追加本报告引用；根目录并行小结、运维prompt、对局和调度均未改。

独立分支保留。归档 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261009-041301/experiments/boss-sim/silent/5c66c9257ff717b134000b3a56b37e97b0f5eb823078380f16d275796c97c978`，完整sources/fights/turns、split/provenance/results、两份trust、原字节/夹具、固定数值输入、基准runner/验收、原沙箱/失败历史均保留，旧目录不覆盖。另存基准全部boss-sim工具及原隔离夹具的git blob与SHA；归档清单初稿误用不存在的backtest-worker.ts，exit1保留在history，之后按实际基准树枚举修正，原运行/数据不受影响。最终原字节复核3890个引用、155887626字节全部通过，触发证据仍同字节，见final-raw-byte-verification.json。源码零改动无需回滚。需要独立扩范围修取帧；本批交原fix-batch完成通道，让调度器复核rejected并进入十场新实际战斗及新校准冷却，不等后续事件才交回报。

验收：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261009-041301/learner/runs/20261009-041305-boss-sim-batch/acceptance.json`。最终回报：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261009-041301/learner/runs/20261009-041305-boss-sim-batch/report.md`、`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261009-041301/learner/runs/20261009-041305-boss-sim-batch/report.json`。
