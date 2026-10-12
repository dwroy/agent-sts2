# silent / AEONGLASS B4，20261007-153133-fix-batch：rejected

本批已完成冻结配对重放、原沙箱和固定验收。候选验证打穿比恶化，正式自动验收拒绝；候选只保留独立分支，未合 live，未建 eval 版本。实际模型遗漏登记为根账本 silent-0236 / mechanic / rejected。初稿、原失败日志、字节证据和两侧校准数据全部保留。

## 授权、基准和证据

Roy 2026-10-07 12:11/12:35 的 B4/B5 标准流程授权，见根目录 notes/fix-queue-v4.md「B4 / B5 纳入标准流程」及 docs/boss-sim.md §13/14。本批不再申请审批。启动工作树干净，先保存 HEAD，再合 live（Already up to date）。初始 HEAD/live/不可变 dispatch_base 同为 9895471c588b0afc31bc94cea6f15dd73de75f2b。

启动器证据原件为 /home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261007-153133-fix-batch.boss-evidence.json；读取前已保存副本及 SHA256 daedf843497fc77c8b12ba1e4b1f2bde3fe73fc6ae5747e1003afc22c4da3a37。核实 character=silent、boss=AEONGLASS、mode=b4、key=4306841dfc278360a3c9ce964a5f681f8a5af39d05160b81372662bef6acf2ee。触发原账 13 场实际结局、10 败/3 胜、43 次 SL 截断；逐回合原日志存在。13 个结局键和触发 logged_keys 与本角色原日志逐项一致，见 trigger-verification.json；证据时间键采用 SL ended_at，不能用开场 first_ts 替代。

## 实结局、SL 截断及冻结切分

固定提取截止已结束静默局 2026-10-07T06:57:27.794Z：97 局、428 次 boss 尝试，178 场有实际结局且有首回合手牌帧，132 胜/46 败；250 次 predicted_death 截断不记实际败局，其中1次另缺首回合手牌帧。完整 SL/reload、原始 states byte offset/len/SHA256、代码版本、局/场/回合与排除原因保留在 dataset/sources.jsonl、runs-snapshot.jsonl、sl-snapshot.jsonl 和 extraction.json。

保留触发的 tune 107 keys 与切点 2026-10-06T02:46:11.648000；原 val 53 加18场新实际结局，val=71，新数据只进 val。两侧使用同一178场扩充数据，不能把候选与触发时旧160场小集比较。fights SHA256 为 22fb8a050308d523a2fe716c3980ad08264f75690c43deb3c5ddfe759357ce20，turns 为 c6e83c507ae5e4f68805fe7ab4e938534c002f7df87f078f45abf326b07a8217，sources 为 7593a871b6c267fce4a8002cd16730ec84bb4778287150c29fb0fcd8e4901786，split 为 d7b5565a104098d52d4ccfc2b1064f9c3e3d91d92dbb21ccd71d3503c12a8662。

AEONGLASS tune 10 场、val3场。K3676LU8B0UH/F48 原 solver 报 no solve，两侧原错误保留、不补预测；因此目标模拟成功 tune9、val3。3场 val 均 A10 实际败局（DPYF2BAA3DKT T7、UMVLWER4CD98 T11、HSX4HYATB4E2 T7）。全部13场117个原回合；逐回合场数及有模拟样本的场数在 paired-target-turn-coverage.json，每个回合对照见 paired-target-turn-diagnostics.jsonl。打穿固定比较 T2–7，排除未实观测的终局漏血，目标验证两侧16个相同的局/回合。

数据以有实际结局的尝试为条件，存在 SL 截断选择偏差，不等于初试胜率、整局通关率或 F48→F49 联合清关率。共同 monster-db 沿基准开场规范化，不把已有模型当作新增静默机制证据；没有读其他角色知识。

## 可证实遗漏与候选范围

只用 tune 的9场24个实际增强边界核实：已观察 A0/1/5/6/7，增强后力量增量依次3、4、5，新增1张凋萎；A10 的25226ZFLNR1J/F48 T3→4、T6→7 增量4、5，分别新增2张。已有凋萎从3伤升级6伤、再9伤，新生成凋萎跟随当前增强伤害。边界原始卡牌中文、数量、力量、HP、字节/hash 逐项在 tune-buff-boundary-evidence.json；这与基准固定4力量/1张/新牌3伤不同。已有 silent-0024 的 shipped 历史保持；silent-0236 指整场模型遗漏，不倒记旧经验没学会。

候选源提交 be703ec1a5fa544ae7fb28745bae80f0e254d452 只改 agent/src/reflex/rollout.ts 和 rollout-live.ts，新增固定机制夹具 agent/tests/boss-sim-silent-aeonglass.test.ts。新 metadata 只附于 SILENT/AEONGLASS/已观察进阶0/1/5/6/7/10；力量计数、持牌伤升级及新状态牌只在 fullFight 路径读取。其他角色、其他 boss、未观察进阶保持基准行为，五回合和实盘 solver 不读新字段，具体读取证明见 field-isolation.md、field-reads.txt、scope-audit.json。新增中途计数继承只依据已有三轮循环；超过 tune 已观察的增强次数没有独立验证，不声称可靠。

固定夹具撤回真实候选源码后4失败/2通过（mechanism-base-red-v2.log、rc=1），恢复后6通过（mechanism-candidate-green-v2.log、rc=0）。不可变基准 isolation runner 已预检实盘 solver/五回合逐字节相同，SHA256 1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0；正式验收已再次执行。调度器、trust、acceptance 和旧断言未修改。

tune 的残余偏差也已留档：T7 敌方HP实录326.5，基准406.8、候选413.7；来袭实录23.2，基准27.0、候选28.1；打穿实录9.7，基准8.4、候选14.9。这些条件于仍在战斗的轨迹均值显示，已证实的机制遗漏不足以解释整场预测差异，不能据此臆补其他机制。逐回合意图/力量/HP与字节证据在 paired-target-turn-diagnostics.jsonl；模拟未输出的状态/我方逐样本HP均不补造。

## 原始配对指标（不代替整体校准）

| 起点 | n/实际胜率 | 原始 Brier before→after | 原始平均胜率 | 打穿比 | 打穿模拟均值/实录均值 |
|---|---|---|---|---|---|
| t1 | 3 / 0 | .1697→.0024 | .327→.037 | 2.171→2.741 | 7.60→9.59 / 3.50 |
| pre | 3 / 0 | .1137→.0018 | .273→.030 | 2.298→2.752 | 8.04→9.63 / 3.50 |

机制夹具改正并不保证整场模拟策略和实盘轨迹相符。打穿固定标准为 .7–1.3；候选的 T1/pre 超标距离扩大。不能据三场验证重新调模拟策略、伤害、药水或校准门槛。本批为B4，没有执行B5搜索或B2策略排序，更没有手写 trusted 名单。全 boss 的整体映射已由原 trust.py 在同一 tune 上分别拟合，正式指标另列。

## 正式配对整体校准及验收

before-trust.json 与 after-trust.json 都由 dispatch_base 未修改的 trust.py 在同一178场扩充数据上自然生成；整体映射分别只拟合同一107个 tune keys，未在 val 调参。两侧 split、dataset/source/turn SHA、实结局、模拟成功覆盖及验证逐回合漏血覆盖一致。

| 起点 | 整体验证 n | 整体校准 Brier before→after | 目标 n | 目标校准 Brier | 校准平均胜率/实际 | 打穿比 | 漏血回合 |
|---|---|---|---|---|---|---|---|
| t1 | 71→71 | 0.1228→0.1141 | 3→3 | 0.564→0.3912 | 0.707→0.598 / 0.0 | 2.171→2.741 | 16→16 |
| pre | 71→71 | 0.1157→0.1052 | 3→3 | 0.5622→0.3581 | 0.7→0.569 / 0.0 | 2.298→2.752 | 16→16 |

固定原验收返回 rc=1 / accepted=false，原因：`t1 leak worsened; pre leak worsened; no bias entered/approached its fixed standard`。原准入标准、近标准改善条件和全局Brier限制原样执行；达到固定准入条件的改善项为空，不能抵消另一项恶化。目标仍低可信；trusted_b2/b3 名单未手写，也没有发布这两份档案到 live。

正式隔离再次通过：不可变基准 runner 对两边 solver/五回合输出逐字节一致，输出SHA256 `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`。完整执行参数和返回值在 acceptance-command.json、acceptance.log、acceptance.rc 和 acceptance.json。

两侧各356行（178场×2起点），同一 no-solve 的2行原错误保留。330个非目标行按固定源范围与逐键SHA复用；166个重复基准行除计时外完全一致。完整按键结果与覆盖证明在 paired-replay-verification.json，最终 before-paired/results-0.jsonl 和 after-paired/results-0.jsonl 是验收校准输入。

## 检查与失败历史

第一次原沙箱 tsc=0、vitest=1，2416过/1失败，原因是临时可见基准源码副本被既有 import 扫描器遍历到 dangling logs 链接；原日志 sandbox-source.log/rc=1 保留。将副本和分析脚本移至本临时目录已有隐目录 .replay-sources/.analysis 后，入口、checker、排除名单和旧测试原封不动。第二次原 nice19 bash tools/test-sandbox.sh，PATH 加 ~/.local/node/bin，TMPDIR 为本批目录，SANDBOX_WORKERS=2：tsc=0、vitest=0，230文件2417例及 paths 11例，共2428通过；见 sandbox-source-v2.log/rc=0。源文件提交前指定文件 gitleaks --redact 扫描 CLEAN/rc=0，已测、扫描与提交SHA一致。

第一次固定机制夹具将 enemyPart 误当作仅敌招伤害，候选2失败/2通过；改为由完整 loss 减攻击意图比较持牌伤。第一次撤码因 cwd 路径错误未实际撤码，原运行不冒报 base red；随后真实撤码 v1 3失败/1通过，v2 4失败/2通过，各次原日志保留。触发键初稿 first_ts 与 SL ended_at 混淆、未使用 import 错误、scope no-solve 和 shell quote 错误、raw diagnostic import 错误、ledger source update 初次缺 body id 的 rc=2 都留存，不改写原失败。详见 failures-index.json。

基准整集最早进程启动于源码改动前，额外三分片（含后段固定键分片）从同批固定 git archive 基准运行，各使用完整输入及 --keys，因此原行号 seed 不变。原始行逐项校验，重复重放只忽略 sim.ms，其他预测/样本/逐回合值必须一致。候选非目标165场可按元数据关闭的源码证明和逐键哈希复用基准330行；目标13场两侧各独立重放26行。完整覆盖、重复一致性、结局/逐回合校验和复用证明见最终 paired-replay-verification.json。

批次期间 live 另有并行 turn-solver.ts 改动（检查点 b0f41f039b136e69485027ecbf9042c23170b4ab），未替换 dispatch_base，也不拿旧候选宣称当前 live 组合通过。正式拒绝后，只留独立分支、mechanic rejected 账本和本报告，不合 live、不造 eval 版本；调度器按原完成通道复核并进入10场新战斗且新校准的冷却。

根目录 ledger CLI 已追加 silent-0236 rejected，附实际源提交、局/回合、固定验收路径、指标、数据与拒绝原因；CLI原件/结果及最终条目见 ledger-rejected.json、ledger-rejected.result、ledger-final-item.json。此前 proposed 与所有失败原行保持，未登记 accepted/shipped。下一批须等新数据与新校准；本批不越界修实盘策略、不用 val 改准入门槛。

## 留档路径

本批完整数据与失败历史：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133/learner/runs/20261007-153136-boss-sim-batch`。正式报告：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133/paper/materials/silent/boss-sim-b4-aeonglass-20261007-153133-fix-batch.md`。固定两侧档案：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133/learner/runs/20261007-153136-boss-sim-batch/before-trust.json`、`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133/learner/runs/20261007-153136-boss-sim-batch/after-trust.json`；固定验收：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261007-153133/learner/runs/20261007-153136-boss-sim-batch/acceptance.json`。分支 `boss-sim-silent-aeonglass-20261007-153133` 保留实际源提交 `be703ec1a5fa544ae7fb28745bae80f0e254d452`；本小结仅在自己的 notes/silent-climb-report.md 追加引用，不覆盖根目录并行笔记。

固定数据默认 gitleaks 扫描 rc=1 的两条 generic-api-key 命中均为公开证据摘要；按调度器 ops/boss_sim_jobs.py 的 digest 公式复算完整输入，与 dispatch/trigger 的 key 完全相同。分类原件在 gitleaks-fixed-data-classification.json，原 rc/日志保留，未加忽略规则或改扫描门槛；候选源码扫描实际 CLEAN/rc=0。最终记录提交前的指定文件扫描与分类另存，不将 rc=1 改写成0。

配对汇总曾因3个起点未完成而 fail closed（paired-assembly-incomplete-v1.log/rc=1）；补齐后 v2 全356行通过，原覆盖断言未改。rejected CLI 的首稿 where.tests 不在原账本 schema，rc=2/未写入；将同一检查路径保留在 note 后原 CLI 写入成功，首稿和返回值留存，未修改台账工具。

逐回合诊断的 raw_start 标签初稿会把最后一个该回合 observed 帧误称作起点，已保留原件并改为 raw_frame、明确其阶段；canonical 来袭/HP/打穿指标始终来自同一冻结 turns.jsonl，trust/验收输入未改变。状态牌数量另由 tune 原始意图 StatusCard 的1/2标签直接确认，四条字节/hash原件见 tune-intent-status-proofs.json，不靠混合自己出牌造成的数量变化推断。

永久归档：`experiments/boss-sim/silent/20261007-153133-b4-aeonglass-rejected/`；冻结数据与失败历史打包附逐文件 SHA256，旧目录不覆盖。

归档逐文件字节与 SHA256 已复核（189项，内层固定基准215文件）；最终 gitleaks 扫描解包内容和待提交记录，rc=1/7条均为同一公开证据摘要，未发现凭据；保留原脱敏报告、rc与逐项分类。初次归档扫描准备误把 SILENT 目录自身的缺尾斜杠判为非本角色，未读凭据或其他角色文件，失败原件另存。

最早整集单进程仍在冗余重放（交回前记录275/356行），不冒报其完整成功或rc=0；验收只使用已闭合分片汇成的全356行配对结果，原行号seed、200样本及重复内容已核对。该进程输出的历史快照另计，不写入冻结校准文件；未停对局或调度器。

两侧原固定 `data/game-data.json` 内容另存永久归档的 `frozen-game-data.json`，SHA256 8973610b44d41683ecc414299006df99decaf82e9017b9bf4ebb89c216268a69 与两侧 provenance 一致；不覆盖已冻结的历史 tar。
