# Silent / QUEEN B4：20261014-072459-fix-batch

**rejected；没有合入 live，没有行为版本。** 草稿存在真实机制反例，原检查未通过，全 boss 基准重放不完整。源候选未提交，工作源码恢复 `19b02dcc884825226c193ac1616f0c397f38fae9`；独立分支保留源码 patch、全部失败历史与数据。本报告不把局部数字变好当作校正成立。

## 派发、范围与来源

证据 `character=silent / boss=QUEEN / mode=b4 / key=c22a058c9ef2c6dafa5a1f294ffc8b34fab7311cc3c39ea9abbd74b087c2d8dd`，不可变 dispatch base 为 `19b02dcc884825226c193ac1616f0c397f38fae9`；启动干净、启动 live 同 base、合 live 返回 Already up to date，见 startup.json。证据原件与副本 SHA256 均为 `8b8584c5e6b46bec20ac860333e9776c00bb9e99df6eccf12230ec743d0b18c1`。实际原生启动命令为 gpt-6.1-sol / xhigh，见 runtime-model.json。文档授权不作为机制证据。

原已发布档案的模拟源是 `7e1193cef9467416bc10c8e344a49f4fd98390c7`，不是 dispatch base；它的 Queen T1 n24/Brier0.2534/预测0.711/实胜0.375 只说明触发原因，不作为本批 before。没有拿旧502场结果与新506场结果比较。只读本角色原日志、common及Silent冻结输入，没有复制铁甲经验。

冻结到 2026-10-13T23:18:06.860Z：285 个已结束 Silent 局，1249 次 boss 尝试，506 场有实际结局且取得首回合（367 won、139 died）；全体完成局最高 A10。派发 ascension=11 不提供 A11 机制或校准证据。原107 tune keys、UTC切点2026-10-06T02:46:11.648000保留；399 val，新增 LKC9YXKZWTKR F17/33/48/49 四场均只进 val。角色、boss、SL尝试分账；F48胜不算整局胜，F49为独立战。

Queen 136 次尝试：33 实际结局（14 won / 19 died），103 predicted_death 为截尾，未作实死；实际8 tune / 25 val。33个触发 logged keys 全核实。864个回合有1719个去重首末原帧；字节偏移、长度、SHA、意图、来袭、HP、格挡、powers见 queen-evidence.json / queen-turn-state-summary.jsonl；SL/runs结算原始行与哈希见 queen-outcome-integrity.json。T1—T10的实际场数为33/33/32/28/25/22/21/17/15/10；验证场数25/25/24/21/18/16/15/12/11/7。完整逐回合及截尾分母见 queen-turn-denominators.json。

## 已核实局部偏差与反证

- ZVYUL2YP3518 F48 T3—T9、EEVP0QTLMSX9 F48 T3—T6：火炬力量逐回合增长，后者日志T6为3；真实帧整场探针中基准至T6仍0，V3为3。该局部缺失可复现，不等于整份草稿正确或跨进阶可推广。
- PD9AYQVMLQW6 F48 T3/T8/T9：该局 PAPER_KRANE 原文本及 Weak 条件支持0.6倍率；初稿123/126意图匹配、3个反例完整保留，按该局文本处理后126/126匹配。A10 Beam8×3、Tackle3/4基础16、Off4×5、Execution18已存在于冻结表，不把重复硬编码称作新发现。
- **BSXYMFKN0VJ5 F48 T6—T7反证**：火炬中毒死亡后，原T7 Queen力量2。当前基准已有 ENRAGE_MOVE.strength=2；同原帧固定seed探针基准下一回合为2，V3为4，死亡钩子与原招式重复计算。先前“死亡后力量完全缺失”说法已显式撤回。见 real-frame-probe.json、real-frame-counterevidence.json；v2探针还记录了我方HP/格挡与阶段，snap为策略出牌后、敌方行动前，loss为整回合量。策略与实盘出牌不同，不能把全部掉血差归因于一个机制。

上述反证已追加根目录账本 `silent-0464`，并在最终完成回报中交ops→watcher→Roy；不声称其他角色已确认或已送达。

## 草稿隔离及原检查

仅试改 rollout.ts / rollout-live.ts，未改 boss-sim.ts 或其他实盘源。V1/V2顶层字段会进入实盘memo序列化，废弃；V3改整场准备专用 fightRelics.silentQueen，仅Silent A10 Queen触发。普通 boardRolloutInput及实盘rollout后缀与base字节相同；未提交V3的手工基准runner也得到同样234874字节、SHA `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`。这些是隔离诊断，不是提交或发布资格。其他角色等价，不复制其私有知识。

新增12项固定玩具夹具：实际撤两源7失败/5通过，恢复12通过；初稿时钟失败及各版结果保留。但其 ENRAGE力量设为0，不能验证真实表力量2下的死亡补丁；真实帧反例优先。patch SHA为 `4a2502f3b7610ad4d3957557add6349f834097f784416cc2748b6621a113aecc`，原件见 proposal-v3/。

按原入口 bash tools/test-sandbox.sh、指定TMPDIR、PATH及nice执行，V3稳定源码下tsc通过，vitest 380文件3651项中3648过/3失败。失败包括快照相对导入、旧排序一致性断言（xmk1-f33-t3-cut card_index0/6）及原15秒调度用例超时。保留字节并将快照改.snapshot后，导入和调度原断言补跑通过；旧排序用例在原120秒上限的线程/单fork补跑均超时，撤回到基准亦超时。原paths单fork11过，合计实际执行3662个不同测试。没有改旧断言、延时或排除表；没有把基准也超时改写成候选全绿。最初混合源码全套另存并标superseded，不作稳定候选通过依据。source-sandbox*.log、source-supplement.v3.log、source-rollout_fork.v3.log、base-check-original-budget.log、checks-summary.json及所有rc均保留。源码gitleaks为0。

## 冻结重放与不完整档案

全部以同506场及其sources/turns/split重放，200样本、原始全数据行索引seed=1+index×101、t1/pre，原策略/顺序/数值不调。整体映射由原trust.py只在tune拟合，两端有效tune均106（另1场原board无解）。冻结common/Silent JSON与game-data；256项输入逐SHA通过。已有工作池只改变调度，编译不改算法；363个基准重叠记录除ms外逐值相同。新增TEST_SUBJECT场两起点的V3负对照也逐值相同。

**本批没有完成全量基准重放。** 冻结于 2026-10-14T09:45:10.432486+08:00：需要1012条(key,start)，实际310条、缺702条；Queen基准22/66，V3原始66/66（其中1场两起点board无解，未补数字）。比较仅纳入相同key/start的310条；V3尚无基准配对的行只留原始结果。全boss结果、缺行名单、原始prefix SHA、每键来源与逐回合比较见 comparison/coverage.json / raw-prefix-manifest.json / queen-turn-comparison.jsonl。没有以重放顺序形成的小样本推断完整Queen或整体校准质量，后续追加行不改变本冻结比较。

正式 before/after 两份自然trust.py档案均使用唯一可验收源base，完全相同，source中明确coverage不完整；无合格候选时不伪造V3源码commit。shadow-after另外标uncommitted、source_commit=null及真实两源码SHA，只是被拒草稿诊断。以下右列为这个草稿，不能当正式after或发布评估；Queen当前仅3场成功验证预测，均为实际败局，选择偏差很大：

| 起点 | 整体验证 n | 基准整体 Brier | Queen n / 实胜率 | 基准 Queen Brier / 预测 | 基准打穿比 | V3 Queen Brier / 预测 / 打穿比 |
|---|---:|---:|---:|---:|---:|---:|
| t1 | 49 | 0.137 | 3 / 0.0 | 0.6022 / 0.77 | 0.875 | 0.2483 / 0.49 / 1.037 |
| pre | 47 | 0.1565 | 3 / 0.0 | 0.6603 / 0.812 | 0.781 | 0.2826 / 0.53 / 0.971 |

右列局部数字变好也没有进入原n/Brier/gap标准；全量整体Brier≤0.005条件未证。没有调验证集、没有手写trusted名单、没有写消费者知识。B5策略搜索与B2排序潜在收益不属于本次mode=b4，未开展。

数据SHA：fights `1ee68393e382ee8928c7e5041ac043486358b08474bf265fbcdabd699e6eb392`；sources `c432d29232a8f1b093827951695a77baff912d4d81ce1674556560c0e6e514bd`；turns `2ae46e86348695569194e392929588369a335b7f9c3af83453f5115457a5f69e`。原始元数据全前缀SHA与原偏移保留，永久副本的runs/SL只筛本角色已结束局。

## 原验收、账本与交回

原基准acceptance.py工具未改；base/head均为不可变dispatch base。正式回执 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261014-072459/learner/runs/20261014-072507-boss-sim-batch/acceptance.json`，rc=1，理由 `no bias entered/approached its fixed standard`；固定runner实盘/五回合隔离通过。早期因Queen覆盖缺失而失败的 acceptance-initial.json 另存，未覆盖。没有提交未过检查或被反证的源码，只提交记录和数据；final fixes.commit用base作无候选标记，fails_without_fix=false不冒称已有有效修复。

永久档案 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261014-072459/experiments/boss-sim/silent/b4-queen-20261014-072459-fix-batch-rejected`，完整清单 manifest.json；固定输入压缩保存原SHA，可由BASE+各版patch/源快照恢复，不覆盖旧目录。临时现场 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261014-072459/learner/runs/20261014-072507-boss-sim-batch` 保留；根目录账本只经CLI追加rejected，kind=fight。无main/live合入、无eval版本、无shipped、无外部完整检查通过宣称。后续由原调度器复算验收/账本并进入原新战斗及校准冷却，不另起后台批次。采集过程中并行工作树消失导致的sandbox glob启动失败另记，不作代码失败。已启动但冻结点后仍写入的本批离线重放只作保留现场，不进入本回执。

升级小结见 [ascension-boss-sim-review-20261014-072459.md](ascension-boss-sim-review-20261014-072459.md)。

数据gitleaks默认规则首扫的5处档案及1处报告误报，均逐行核为同一公开派发证据指纹；原redacted报告和rc1保留。复扫配置仅精确允许该64位指纹，继承所有默认规则，不排除目录、不关闭规则；见gitleaks-false-positive-audit.json及gitleaks-evidence-digest.toml快照。源码原扫0与数据复扫分开记，不把初扫改成0。
