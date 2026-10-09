# 静默 AEONGLASS B4：20261009-180724-fix-batch

本批结果为 **rejected**。候选源和固定机制夹具保留在独立分支；未合 live、未建 eval 版本、未登记 accepted/shipped。真实机制偏差仍归 mechanic 条目 silent-0236，不改记 bug-infra。

不可变 dispatch_base：`2e037b7bfb7ed1a2bf3f8599736bd9846fb3e328`；实际候选源：`436f338f11601fe89d5ef6c8445692706c7d797b`。初始工作树干净，保存 HEAD 后合 live 为 Already up to date，起始 live 与 dispatch_base 一致。完成时再次核对原证据：character=silent、boss=AEONGLASS、mode=b4、证据指纹 `31b945d5ed7d9926026e8a6668b42ac677fd9638358c2942763ace6c8dc12646`；SHA256 `0ccf2fd2a5e1474a0e77fab405908a71eb30de3ea154ad1dc79cad52ae81a153`，副本和 SHA 保存在本批临时目录。

授权来自 Roy 2026-10-07 12:11/12:35、根目录 notes/fix-queue-v4.md「B4 / B5 纳入标准流程」及 docs/boss-sim.md §13/14。读取 README、最新 STATE、decision-log 末尾和学习协议后，只从本角色原日志重新核实；未读游戏包、其他角色知识、key/.env，未联网、安装依赖、运行 play、停对局/调度或改运维 prompt。

## 原日志与结局口径

冻结抽取 174 个静默完局、817 次 boss 尝试、323 场可用实际战斗（232 胜/91 死）。AEONGLASS 为 98 次尝试，其中 25 场有实际结局（11 胜/14 死），73 次 predicted_death 是 SL 截尾，不能当真实败局。最终 runs 汇总的 AEONGLASS 死亡为 15 局；TXZ6RVMQA09D 的实际 won 尝试与最终局汇总死亡均按原记录保留，不互相改写。触发累计死亡局号和 recent20/A10 条件已重核，详见 trigger-deaths-audit.json。

原状态按只读 logs/states.jsonl 的字节偏移、长度和 SHA256 留存：raw-turn-audit.json 覆盖目标全部 98 次尝试的逐回合首末状态，raw/ 保存 1670 个原帧。sl-byte-audit.json 与 raw-sl-attempts.jsonl 保存 98 条原始 SL 行；opening-byte-audit.json 重读并核对全部 323 场 T1 状态与角色。sources.jsonl/fights.jsonl/turns.jsonl 和日志快照保留。

实际目标战斗逐回合场数（独立于模拟是否继续存活）：T1–T13 = 25、24、24、24、23、23、21、17、14、13、8、4、1。K3676LU8B0UH:48:2:6525158984 的 T1/pre 两行仍为原 board: Error: no solve；不虚构输出，不缩小分母隐藏缺失。

## Tune 证据与源码范围

9 次 tune 战斗的 24 个清洁招式边界证明三项偏差：力量增益逐次 +1；已有与新生成凋萎的持牌伤随招式阶段每次 +3；A10 每次新增 2 张，其他已观察进阶新增 1 张。LRN0HPZ0FZS1 F48 T3→4 的 offset 6335886227→6335935009：力量 0→3、3 伤凋萎升级为 6 伤并新增 1 张；T6→7 力量 3→7、凋萎 6→9。25226ZFLNR1J A10 F48 T3→4 的 offset 7383814181→7383861684：力量 0→4、1 张 3 伤变成 3 张 6 伤；T6→7 的 7384538079→7384584619：力量 4→9、5 张 6 伤变成 7 张 9 伤。

排除仍有临时减力量状态的边界；原字段、牌堆分组文本、哈希与核算见 mechanic-tune-evidence-withers.json 和 tune-mechanic-base-candidate-audit.json。可构建开局基准输入的边界中，固定力量增益有 13 处不符、新增数有 2 处不符；3 个边界对应保留的 no-solve 开局输入，但原回合状态证据仍完整。验证集不用于机制选择或策略调参。

只修改 agent/src/reflex/rollout.ts 和 rollout-live.ts。专用字段 fightAeonglassIntensity 只为 SILENT/AEONGLASS 的已观察进阶 0/1/5/6/7/10 生成；仅 fullFight 初始化与递增次数、更新力量、已有/新生成凋萎和模拟前瞻。两处 lookaheadOf 调用均受 fullFight 条件保护。铁甲及其他角色、其他 boss、未观察进阶保持等价；原实盘求解器、五回合策略、原测试与调度/验收工具未改。

固定新夹具来自上述原字节证据；撤回两个候选源码的原新测试实际 17 失败/11 通过，恢复后 28 通过，日志不改写。额外检查夸大专用字段也不会改变实盘 solver/五回合输出，铁甲不生成字段。提交级隔离另由 dispatch_base 的固定 runner 执行。

## 冻结配对与校准

触发档案原 321 场及其逐回合行与行索引保持，扩充为相同的 323 场：107 tune 不变、val 214→216，UTC 切点 2026-10-06T02:46:11.648000 不变；新增 R6WDLYS19ZTY:17:3:10205045580 和 R6WDLYS19ZTY:33:4:10217862105 仅进入两侧 val。目标 boss 为 10 tune/15 val，其中 tune 有 1 场保留的构建错误。

两侧使用相同的触发校准数值模型。原 provenance 的每个源/数值文件均从可核对的历史输入重建并验证 SHA；数值源码与 dispatch_base 完全相同，知识数据钉触发档案字节。其后的 live 刷新差异及探索结果独立保留，未混用旧样本与新模型。before/after 均 200 样本、T1/pre、seed=1+完整数据原行索引×101；Platt 全局校准只在 tune 拟合，各侧重新生成 trust.py 的完整静默档案。

基准重放目标全部 25 场、4 场其他 boss 控制及 2 场新增验证，共 62 行；候选目标全部 25 场重放共 50 行。其他 boss 的原始样本只有在数值输入、状态、行索引与 seed 一致，并通过控制重放逐项相等（只排除计时 ms）后才复用。before/after 各完整 646 行、原构建错误相同。全 boss 的整体 T1/pre 校准/Brier 均重新计算，不将目标子集与旧小集比较。

fights SHA256 `6cc01860360d2c9d2c385b0283db7ac97e586eed11302c236ee3a26b090ae37a`；sources SHA256 `77c87c495fb23e6755ec9cae62553a34a910335b5f54ad15697eb53233e7ba41`；turns SHA256 `390477a687ba8b68f2c3e8452a8e4d988d0f9961fa060898a31f30ed7214ab12`。完整配对、输入来源及复用核对见 frozen-numerical-reuse-proof.json、baseline-control-replay-checks.json、after-result-reuse-proof.json、paired-data-proof.json 和 paired-outcome-turn-coverage.json。

| 起点 | 验证场数 before/after | Brier before→after | 平均预测胜率 before→after / 实际 | 打穿比 before→after | 配对打穿回合 before/after |
|---|---:|---:|---:|---:|---:|
| t1 | 15/15 | 0.1617→0.1834 | 0.684→0.606 / 0.533 | 3.625→3.927 | 79/79 |
| pre | 15/15 | 0.152→0.168 | 0.688→0.616 / 0.533 | 3.468→3.754 | 79/79 |

| 整体起点 | 验证场数 before/after | Brier before→after |
|---|---:|---:|
| t1 | 216/216 | 0.1158→0.117 |
| pre | 216/216 | 0.1164→0.1176 |

逐回合来袭/打穿/血量及场数见 before/after-tune/val-t1/pre-per-turn.json/.log；turn-state-simulation-comparison.jsonl 逐局回合关联原意图、状态、牌堆、首末字节证据和两侧模拟。记录模拟继续存活率与可配对回合，未补齐或改造截尾。

原始逐回合覆盖在两侧完全相同，T2–T7 打穿指标也均为 79 个局回合；模拟晚期可配对覆盖有 3 行减少：PD9AYQVMLQW6 F49 T1/pre 在候选不再覆盖 T8，RMNXHZKV716Y F48 T1 不再覆盖 T13。此限制原样留存，不能把模拟全场逐回合覆盖称为一致，也未截短基准或补造候选样本来对齐。

## 基准验收与失败历史

验收执行的是 dispatch_base 原 acceptance.py（acceptance-base.py，SHA256 `130dd7d6f3ec718ccc6d193895155c35727ecb1d23aeb591736d88419235b81a`），head 固定为已提交源 436f338f11601fe89d5ef6c8445692706c7d797b；原工具/阈值不改。acceptance.exit=1，reasons=["t1 brier worsened", "t1 leak worsened", "pre brier worsened", "pre leak worsened"]，improved=["t1:gap", "pre:gap"]。

实盘/五回合提交级隔离：{"passed": true, "base": "2e037b7bfb7ed1a2bf3f8599736bd9846fb3e328", "head": "436f338f11601fe89d5ef6c8445692706c7d797b", "output_sha256": "1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0", "candidate_sha256": "1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0", "shared_changes": ["agent/src/reflex/rollout-live.ts", "agent/src/reflex/rollout.ts", "agent/tests/boss-sim-silent-aeonglass.test.ts", "agent/tests/fixtures/silent-aeonglass-intensity.json"], "runner": "/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch/acceptance/source-2e037b7bfb7ed1a2bf3f8599736bd9846fb3e328/agent/tools/boss-sim/isolation.ts", "outputs": ["/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch/acceptance/before.isolation.json", "/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch/acceptance/after.isolation.json"]}

原 bash tools/test-sandbox.sh 在 agent/，PATH 加 ~/.local/node/bin、TMPDIR 固定本批目录、SANDBOX_WORKERS=1、nice 19。最终 source 检查 tsc=0/vitest=0，251 文件 2644 例与 paths 1 文件 11 例全过，共 252 文件 2655 例。首轮 tsc=0/vitest=1（2643 过/1 失败）是本批孤立源码归档 .ts 被原 check-imports 识别为可执行模块：保留 sandbox-source.log/exit，改归档扩展名为 .ts.snapshot 后原 check-imports 和完整原入口重跑通过。没有修改检查脚本、排除名单或断言。

其他初稿失败全部保留：冻结脚本首轮 hyphen 模块 import 失败；首次 replay 相对路径错误 rc1；随后最新知识模型探索被本任务中断 rc130（原始部分结果与日志不混入最终数据）；输入哈希辅助脚本路径/no-solve 处理失败和中断 rc130；首轮机制测试只有非确定性 budgetNeedMs 比较失败，固定 now 后通过；力量单项初稿撤码 16 红/恢复 27 绿；最终三项机制撤码 17 红/恢复 28 绿。所有初稿源码、rc、日志和哈希见 failure-history-manifest.json、archival-source-renames.json 与本批目录。

gitleaks 指定 4 个源/夹具文件扫描 rc0；文件 SHA 与提交一致。记录首轮扫描 rc1 是报告用 ASCII key 标签标注公开的任务证据摘要，被 generic-api-key 误报；该值与不可变 evidence 一致，不是凭据。保留原告警和记录快照，仅把标签改为“证据指纹”而保留值，未改扫描规则；修订记录的扫描另存 records-gitleaks-v2.log/json/exit。使用本机全局 Git 身份，实际源 commit 带 Co-Authored-By: Codex GPT-6。原沙箱受固定环境限制的完整外部检查由调度通道处理，本批未冒称排除的测试已执行。

## 回报与后续

经根目录 ledger CLI 追加 silent-0236/rejected，关联实际源、局/回合证据、原检查、配对数据和此验收路径。旧 rejected/be703ec1 历史及本批 proposed 均保留。因门槛未通过，本批不持发布锁、不改 live、不建版本、不通知为已上线。回退候选可将两个模拟源恢复到 dispatch_base；live 没有本批代码，无需回退线上。新数据只能沿调度的十场新战斗/新校准冷却继续，不能用本验证集修策略或改阈值。

正式报告：/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/paper/materials/silent/boss-sim-b4-aeonglass-20261009-180724-fix-batch.md
最终回报：/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch/report.md、/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch/report.json
验收：/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch/acceptance.json
全部固定输入、数值来源、结果和历史：/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261009-180724/learner/runs/20261009-180732-boss-sim-batch
