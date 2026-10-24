# Silent 奖励拿牌前缀代理：冻结外部候选报告

本批 `20261024-081200-strategy-proposal` 已完成工作单元 `external-reward-prefix-outcomes-001` 的观察性候选提炼。只写本目录；HEAD 保持 `18cb44317dd7529b34829250a14509ee2ca826f7`。来源 `external:sts2fun`，本系统 `runs=[]`，无源码修改、正式知识发布、合入或消费者读回。科学父 #51 保持开放。

## 输入与可重现性

启动前核对主运行根 `ops/codex-ops/learn.json` 的本批 external_source、external_binding、dispatch_base；manifest 5461 字节，SHA256 `cdd7b01edcd6beba1957ebed33c713c8847a625003caa7bd14628fabbf719744`，work_spec 1701 字节，SHA256 `5f1ea490215e423df4ffcfded69f29e3cc2217fa1bccd0f36a04e314997eb27d`。17 个引用（work_spec、9份contract、SQL、导出回执、5版聚合）逐一核字节与SHA，加manifest共18项通过。完整清单见 [input-verification.json](input-verification.json)。输入直接从绑定 project_root 路径只读，无需展开工作树副本。

原地址 https://sts2.fun/static/sts2_public.db.zst ，下载/数据集采集日期 2026-10-21；数据库SHA256 `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`。导出回执日期2026-10-24；这不是另一次数据采集日期。查询 `ops-safe-choices-combats-v1` 明确限定 SILENT、A10、单人、valid、非abandoned、无modifiers、指定patch_major；不证明玩家身份、作者类型或完全无模组。许可在本批输入中未核实，保持未知限制。未读数据库、逐玩家资料、外部新下载或原本系统逐局日志。

## 统计口径

- 前缀仅按记录节点顺序累加此前已拿奖励牌；同节点候选共用节点前前缀，节点选择处理后才累加。缺初始牌组、删牌/变形、事件/商店和升级，始终称“奖励拿牌前缀代理”。
- 分别按幕索引+候选牌+前缀张数，或幕索引+候选牌+前缀含某牌配对拿/不拿。两类是分开的边际分层，**没有同时控制张数和含牌条件**；不能宣称牌组匹配或匹配反事实。display_act=act_index+1仅用于报告，不补全局楼层。
- 局胜率=组内最终胜局去重数/该组独立上传局数；机会加权局胜率=来自最终胜局的选择机会/全部选择机会。两种差值分别计算，不能互换。一次上传可以跨拿/不拿组、前缀和幕；玩家独立性未知，组间不独立。
- 后续Boss到达率=后续同幕或更晚幕出现Boss的选择机会/该组全部选择机会。没有独立Boss到达局数，不能换成局分母；更不是Boss胜率、当前Boss通过率或双Boss连战成功率。
- 各cell原输入已用独立上传局数>=10过滤，仅原两侧均存在时配对；单侧缺失记unknown，绝不补零。该机械筛选不是confidence门、置信下界或因果验收。
- 所有五版分别统计，不合并v0.111与旧版；同版分组也不累加成独立局数。预定优先牌来自冻结分歧context的3张牌，context旧自有频率仅作优先级，不作mixed支持。
- 代表格按两侧独立上传局数的较小值降序、前缀字面顺序破同分选定；未按差值或显著性选格。全部配对和反方向行均保存，未计算p值、区间、因果收益或安全线。

## 全量覆盖

| 版本 | 独立上传局总量 | 张数表cell / 配对层 | 含牌表cell / 配对层 | 多room节点未归属 |
|---|---:|---:|---:|---:|
| v0.107 | 2932 | 3444 / 867 | 23541 / 6059 | 377 |
| v0.108 | 683 | 1167 / 167 | 7640 / 867 | 104 |
| v0.109 | 583 | 1030 / 138 | 7090 / 687 | 87 |
| v0.110 | 411 | 672 / 60 | 4193 / 207 | 51 |
| v0.111 | 1739 | 2641 / 616 | 18653 / 4515 | 248 |

共14,183个配对层、41,705个单侧层；这两个数字是条件层数量，不是独立样本数。原低支持排除数逐版、逐表保留于 [cohort-inventory.json](cohort-inventory.json)。每行拿/不拿独立上传局数、机会数、最终胜局数、胜局机会数及Boss到达机会数、两种胜率差及Boss到达差均见 [all-paired-comparisons.csv](all-paired-comparisons.csv)。逐行可用原JSON pointer和SHA核回。[unpaired-strata.json](unpaired-strata.json) 保存缺侧原因。其他牌仅完成机械比较，不冒称本批已逐条形成语义策略。

## 第一幕：三张优先牌的独立版本对照

以下均为每版每牌最大双侧支持的**张数**格，差值=拿−不拿，单位百分点；Boss列始终使用机会分母。全部其他格和第2/3幕的代表格、正负方向数量、缺格在 [priority-card-audit.json](priority-card-audit.json) 中（90个版×牌×幕×表位置，包含零配对位置）。

| 版本 | 牌 | 前缀张数 | 拿：胜局/上传局 | 不拿：胜局/上传局 | 胜率差pp | 拿/不拿机会数 | 拿Boss到达/机会 | 不拿Boss到达/机会 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| v0.107 | BLADE_DANCE | 0 | 31/115 | 32/165 | +7.56 | 115/166 | 90/115 | 132/166 |
| v0.107 | DEADLY_POISON | 0 | 30/102 | 39/194 | +9.31 | 102/197 | 81/102 | 167/197 |
| v0.107 | FOOTWORK | 3 | 24/82 | 8/37 | +7.65 | 82/38 | 69/82 | 32/38 |
| v0.108 | BLADE_DANCE | 0 | 9/25 | 6/39 | +20.62 | 25/39 | 24/25 | 32/39 |
| v0.108 | DEADLY_POISON | 0 | 9/32 | 7/35 | +8.12 | 32/35 | 26/32 | 29/35 |
| v0.108 | FOOTWORK | unknown | — | — | — | — | — | — |
| v0.109 | BLADE_DANCE | 0 | 7/27 | 7/26 | -1.00 | 27/26 | 26/27 | 22/26 |
| v0.109 | DEADLY_POISON | 2 | 5/23 | 16/51 | -9.63 | 23/52 | 15/23 | 46/52 |
| v0.109 | FOOTWORK | 5 | 11/17 | 4/10 | +24.71 | 17/10 | 17/17 | 9/10 |
| v0.110 | BLADE_DANCE | 1 | 6/17 | 7/36 | +15.85 | 17/38 | 17/17 | 29/38 |
| v0.110 | DEADLY_POISON | 0 | 4/19 | 8/29 | -6.53 | 19/29 | 16/19 | 25/29 |
| v0.110 | FOOTWORK | unknown | — | — | — | — | — | — |
| v0.111 | BLADE_DANCE | 0 | 25/88 | 23/91 | +3.13 | 88/92 | 75/88 | 76/92 |
| v0.111 | DEADLY_POISON | 0 | 20/77 | 47/123 | -12.24 | 77/124 | 62/77 | 108/124 |
| v0.111 | FOOTWORK | 5 | 11/40 | 9/19 | -19.87 | 40/19 | 39/40 | 19/19 |

## 候选与反例

三个条目写入 [strategy-candidates.json](strategy-candidates.json)，每条 formal_publication=pending、consumer_readback=pending；外部低可信分档0.30是编辑判断，不是概率或置信下界。每条两个v0.111第一幕代表格，各自两侧的局胜率、机会加权胜率及后续Boss到达率共12条外部证据；详尽分子、分母和pointer在 [featured-observations.json](featured-observations.json)。

1. `silent-brain-act1-blade-dance-choice-context`：复用现有ID，候选版本1.1.0。前缀0张的局胜率差+3.13pp，含LEADING_STRIKE的差−0.52pp；张数格7正1负、含牌格23正11负。应保留按现场用途比较的策略，不能由某个分组差决定必拿。旧条目证据只冻结作去重/后续合并保留参考，没有重新验证旧玩家统计或并入本批样本。
2. `silent-brain-act1-deadly-poison-prefix-context`：前缀0张差−12.24pp，7个可配对张数格全部负；但含SNAKEBITE时13/35对33/117，差+8.94pp，25个含牌格9正16负。只能要求条件比较，不能推出禁拿、构筑机制或因果负收益。旧版本代表张数格v0.107/v0.108方向为正，v0.109/v0.110为负，不能跨版汇总成统一效果。
3. `silent-brain-act1-footwork-prefix-context`：前缀5张11/40对9/19，差−19.87pp，含CLOAK_AND_DAGGER为8/44对6/16，差−19.32pp；其余张数格3正2负、含牌格6正4负。这限制了从高拿牌频率推必拿的论断；没有证明牌无用。第2/3幕和旧版仍存在正负差异，不能外推固定牌值。

这些正负格存在重叠、重复比较和选择混杂，格数不能当投票或独立重复验证；缺少随机/充分调整反事实，差值本身既不是策略因果效应，也不能量化在本系统的收益。

## 契约、去重、未完成事项

- 已核冻结 #27/#42 大脑策略与外部证据合同、schema，及 #28 rk来源/回放合同、学习请求和代码提案合同。基线8条策略ID逐项检查，BLADE_DANCE合并既有场景，其他2条为新候选；没有把卡奖候选复写成Boss/skip策略。证据与条件见 [dedup-and-gaps.json](dedup-and-gaps.json)。
- 外部/本系统分账：本批没有核自有逐局证据，runs=[]、own支持0；不能作mixed或声称与自有统计一致。旧BLADE_DANCE原始条目仅归档为后续合并参考，保留其独立出处和旧数值，不用本批数据覆盖。无从已核自有结果得出的新冲突结论。
- catalog未提供本任务所需且可核的牌类型映射；未从牌名猜伤害、毒、组合或技能机制。
- 本批是card-picks工作规格；无逐回合/动作/意图/共同随机种子的候选结果，不产出rk动作规则。无双Boss队列及两战资源状态，后续Boss到达不能满足#50双Boss准备度；这是此输入的明确缺口，不等待其他项、不关闭#50。
- 完整证据候选每条约21KB，超过当前查询4096字节封包上限；仅schema通过不等于可消费。后续正式发布需在保留完整审计的前提下做单条证据与正文压缩/拆分设计，核派生摘要后字节预算、实际发布锁、正式学习账本、消费者读回以及自然采用。不得直接将本文件称已上线。
- 原ops→watcher→Roy需传达上述条件反向、非因果与证据封包限制；本批只保存报告与账本，尚无实际通知/接收/ACK回执，不代填。正式发布pending、消费者读回pending、自然采用unknown、收益unknown、科学父open。

## 验证和交付

冻结输入18项SHA/字节通过；5版全部保留cell的计数界限、唯一分组键及比率算术通过；3条候选通过冻结JSON Schema、每条<=20 evidence和1200字节正文限制。结果见 [analysis-checks.json](analysis-checks.json)。只产出离线分析材料，tsc/vitest/cases均null。HEAD前后核同，git tracked diff为空；未提交、未合入main/live、未写正式账本或调度/注册文件。

复现命令：`nice -n 10 python3 /home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-081200/learner/runs/20261024-081206-0e654611-e0a4-4f31-86dd-e86b3bfe5c54-strategy-proposal/analyze.py`。该脚本只读冻结输入并写本scratch；输入变动会断言退出。

[source-ledger.jsonl](source-ledger.jsonl) 有15条牌×版本记录，逐条保存来源SHA、独立cohort总量、子组分子分母、反方向计数及缺口，均pending。它是scratch来源账本，不冒充正式学习ledger。

原生服务档位未核实（登记observed_service_tier=null），不据请求ultrafast宣称已采用；本批不估算tokens、费用或耗时，留给原启动/usage回执统计。

唯一unit处置：`external-reward-prefix-outcomes-001` = processed，真实去向为3条strategy候选（其中1条merged-into既有ID）。processed只表示候选落盘，以上科学/发布缺口全部保留。
