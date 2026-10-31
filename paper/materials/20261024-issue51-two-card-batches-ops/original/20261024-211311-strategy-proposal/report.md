# B道单牌候选：20261024-211311-strategy-proposal

20张牌逐卡处置：8个新情境、9个同情境备选映射、3张仅统计并跳过动作候选；交付8文字/8描述rk。尖啸、蛇咬两卡自有A10重试/判死首次奖励拿/不拿各达100独立局；20卡外部取得牌次比较达100代理门，不能当奖励拿牌验证。另6情境自有比较稀疏；rk tag被现拿牌消费者排除。正式发布/生产读回/自然采用均0，科学父保持。

本批身份已核：learn.json external_source/绑定与冻结manifest一致；work_spec 5420字节 / 4edd81635666908bdaa83c7d39afe9fdbf4bebf23a14206fa952287a3984c360；HEAD=e63adb6def663297efa42cd52c4d7bfe7db23636，未变。三manifest及129产物共132叶原SHA通过；11授权只读分片导出前后大小/SHA通过。输入绑定、契约与源核验分别见scratch/binding-audit.json、contract-audit.json、input-audit.json、shards-audit.json。没有改请求/登记、源码、正式知识、main/live或共享统计。

## 范围、选择与分母

冻结work_spec正文与本轮指令要求文字/rk同产，但JSON的paired_outputs_required=false；本批按更明确的正文同产，保留冲突，没有改冻输入。没有重开旧双Boss/幕Boss/毒刀任务。

本绑定没有旧卡批的完整逐牌奖励备选聚合；没有借旧批授权读取它们作为新证据。按当前冻结decision-fields cards_gained的v0.111真实取得牌次从高到低排序，显式标为选卡代理；按build/幕/rooms的互斥格加牌次，不把重叠格的distinct_uploaded_runs相加。只保留实际自有奖励中经已选expect原ID和牌文确认的牌。旧improved/top25的25张（含原4跳项）与正式FOOTWORK/BLADE_DANCE单牌条目排除；前批材料仅用于去重，旧统计没有成为新证据。CLUMSY无真实卡奖ID确认，跳过排序项。20张依排名如下。

|序|牌原ID|v0.111取得牌次代理|本批处置|自有宽条件100局门|
|---:|---|---:|---|---|
|1|PIERCING_WAIL|1159|new|过|
|2|PREPARED|1056|new|未过|
|3|CLOAK_AND_DAGGER|902|new|未过|
|4|DEFLECT|802|merged-into-new-context|未过|
|5|LEG_SWEEP|726|new|未过|
|6|SNAKEBITE|684|new|过|
|7|ADRENALINE|647|new|未过|
|8|HIDDEN_DAGGERS|582|new|未过|
|9|DODGE_AND_ROLL|548|merged-into-new-context|未过|
|10|CALCULATED_GAMBLE|536|merged-into-new-context|未过|
|11|UNTOUCHABLE|495|statistics-only/skip-action-candidate|未过|
|12|EXPOSE|486|statistics-only/skip-action-candidate|未过|
|13|ESCAPE_PLAN|472|statistics-only/skip-action-candidate|未过|
|14|RICOCHET|454|merged-into-new-context|未过|
|15|ECHOING_SLASH|447|new|未过|
|16|ACROBATICS|436|merged-into-new-context|未过|
|17|DAGGER_THROW|428|merged-into-new-context|未过|
|18|DASH|409|merged-into-new-context|未过|
|19|AFTERIMAGE|387|merged-into-new-context|未过|
|20|BACKSTAB|350|merged-into-new-context|未过|

逐卡真实备选、当时HP/已持副本/此前牌组代理、文本变体、版本原分母和跳项原因见card-dispositions.json与card-statistics.json。9个伴随卡映射归入同8情境，不算新增或旧成果复用。3个跳项仍有真实方向统计，不把缺机制/未来目标补成结论。

## 八个情境及逐条证据

每条文字策略完整见strategy-candidates.json，均≤1200 UTF-8字节，trigger只用card_reward与幕；正文约束候选出现和现场牌文，不使用archetype、未来终局牌组、簇号、胜负或后来资源触发。自有版本unknown/外部版本逐项分账。以下外部方向只描述取得记录的终局关联，不能解释为二幕拿某牌更强。

### silent-lane-b-wail-duration

奖励出现尖啸且牌文仍为1费、所有敌人本回合失6力量时，把本回合窗口与可持续防护分开比较。VPW8YH7A4QFM在31/70血、未持此牌时拿尖啸；已有2张、34/80血时改拿余像；两次均非胜局证据，不设必拿或固定副本数。
自有A10/版本unknown首次同牌奖励，重试/判死组拿2/120、不拿1/106终胜，差+0.72pp；双方达100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+7.09pp（158/431 vs 131/443牌次）；不是拿/不拿收益。

无重试证据分层另账：拿1/32、不拿2/31终胜，差-3.33pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-wail-duration / silent-rk-lane-b-wail-duration。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-draw-discard-budget

奖励出现早有准备时，按现场牌文比较0费抽1弃1与杂技1费抽3弃1、投掷匕首1费9伤抽1弃1；分别核已有抽弃来源和备选，不把0费当作无条件增牌。U8K28UUGYP3U在52/70血拿早有准备；VPW8YH7A4QFM在43/70血改拿突然一拳。
自有A10/版本unknown首次同牌奖励，重试/判死组拿0/9、不拿2/217终胜，差-0.92pp；样本稀疏，未达双方100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+14.66pp（164/370 vs 132/445牌次）；不是拿/不拿收益。

无重试证据分层另账：拿0/3、不拿2/62终胜，差-3.23pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-draw-discard-budget / silent-rk-lane-b-draw-discard-budget。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-block-time-and-shiv

奖励比较斗篷与匕首、偏折、闪躲翻滚时，按当前牌文分别记1费6挡加1刀、0费4挡、1费本回合4挡及下回合4挡；后者不能全算即时挡，生成刀也仍需实际打出。CRK2HNYKSCZC在39/70血拿斗篷；U8K28UUGYP3U已持1张、52/70血时同屏选偏折。
自有A10/版本unknown首次同牌奖励，重试/判死组拿0/64、不拿2/160终胜，差-1.25pp；样本稀疏，未达双方100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+8.95pp（88/224 vs 162/534牌次）；不是拿/不拿收益。

无重试证据分层另账：拿0/16、不拿3/48终胜，差-6.25pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-block-time-and-shiv / silent-rk-lane-b-block-time-and-shiv。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-two-cost-defense

奖励出现扫腿或冲刺时，先核2费能否与现有出牌配合，再比较扫腿2虚弱11挡与冲刺10挡10伤的不同用途，不因相同费用或更高挡数设固定先后。VPW8YH7A4QFM在43/70血从扫腿、先制打击、后空翻中拿扫腿；QNTW139MGECA在51/70血选致命毒药而非扫腿。
自有A10/版本unknown首次同牌奖励，重试/判死组拿1/99、不拿0/25终胜，差+1.01pp；样本稀疏，未达双方100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+8.24pp（114/247 vs 127/335牌次）；不是拿/不拿收益。

无重试证据分层另账：拿1/22、不拿1/9终胜，差-6.57pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-two-cost-defense / silent-rk-lane-b-two-cost-defense。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-retained-source-budget

奖励出现蛇咬且仍为2费保留施7毒时，结合已持副本、实际费用和防护缺口比较新增毒源与同屏防护及跳过，不把保留当已完成防护或当回合已伤害。U8K28UUGYP3U在12/70血且已有1斗篷时仍拿蛇咬；VPW8YH7A4QFM在24/80血面对蛇咬等选择跳过；两局均败。
自有A10/版本unknown首次同牌奖励，重试/判死组拿1/113、不拿1/116终胜，差+0.02pp；双方达100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+5.32pp（36/107 vs 147/519牌次）；不是拿/不拿收益。

无重试证据分层另账：拿1/33、不拿1/38终胜，差+0.40pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-retained-source-budget / silent-rk-lane-b-retained-source-budget。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-burst-versus-setup

奖励出现肾上腺素或余像时，按现场牌文分开核0费加1能量抽2且消耗的单次资源，与1费建立每次出牌加1挡的后续回报；结合当前牌组，不预支未来连打。P5HT1272P5SB在34/77血、已有冲刺时拿肾上腺素；VPW8YH7A4QFM在二幕23/80血同屏选毒性爆发而非肾上腺素。
自有A10/版本unknown首次同牌奖励，重试/判死组拿0/41、不拿0/6终胜，差+0.00pp；样本稀疏，未达双方100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+30.51pp（113/160 vs 69/172牌次）；不是拿/不拿收益。

无重试证据分层另账：拿2/6、不拿0/3终胜，差+33.33pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-burst-versus-setup / silent-rk-lane-b-burst-versus-setup。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-discard-payload

奖励出现隐秘匕首或计算下注时，分别核弃2后加2刀、与弃全部再等量抽牌且消耗的手牌代价，不能只按0费或刀数比较；奖励时没有未来战斗手牌，不能承诺可兑现。QNTW139MGECA在11/70血、已有2投掷匕首时拿隐秘匕首；NB8KCF6HRGVF在14/70血面对隐秘匕首、战术大师、斗篷时跳过。
自有A10/版本unknown首次同牌奖励，重试/判死组拿0/38、不拿0/74终胜，差+0.00pp；样本稀疏，未达双方100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联+5.54pp（78/186 vs 111/305牌次）；不是拿/不拿收益。

无重试证据分层另账：拿0/9、不拿0/29终胜，差+0.00pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-discard-payload / silent-rk-lane-b-discard-payload。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

### silent-lane-b-attack-target-and-time

奖励比较回响斩击、连续反弹或背刺时，分别核现场牌文的群体10伤且击杀才重复、随机3伤4次、以及固有0费11伤并消耗；不预设击杀链、随机目标或奇巧效果。NB8KCF6HRGVF在54/70血从回响、反弹、带毒刺击中拿回响，下一层已持1张时改拿突然一拳。
自有A10/版本unknown首次同牌奖励，重试/判死组拿0/76、不拿0/34终胜，差+0.00pp；样本稀疏，未达双方100局。
范围：仅Silent A10奖励且现场牌文吻合；牌组为此前快照代理，SL与无重试、版本及外部取得统计分账，无固定拿牌命令。

外部v0.111 幕2 vs 幕1取得牌次的终胜关联-0.05pp（34/110 vs 100/323牌次）；不是拿/不拿收益。

无重试证据分层另账：拿1/21、不拿0/10终胜，差+4.76pp；不补进重试组，也不把无证据当没有SL。
配对：silent-brain-lane-b-attack-target-and-time / silent-rk-lane-b-attack-target-and-time。formal_publication=pending；consumer_readback=pending。适用范围和反向结果、采集日期、输入SHA、各版本统计原行及当前信息可得性在knowledge-candidates.json对应ID和来源账本保留。

## 统计处理与局限

自有范围严格为授权506局；A10与其他进阶、retry_or_predicted_death与no_retry_evidence分别统计，版本均unknown；其他角色不入。使用内存DuckDB、threads=2和授权显式parquet名单，先join506名单再聚合，并截在原六流截止以内；实际只查询decisions/frames两类。没有init/sync共享logdb，没有复制全量状态流，没有扩大切点。Z2手动局、KF9末态缺失、BP9及后续局均不入。

程序读取6873条原奖励行，12条相同run/floor/实质选项去重，6861机会；52个选择仍无法确认而不进拿/不拿比较。逐条原始seek有offset/bytes/SHA/cutoff，16个选定资源帧亦单独seek审计。snapshot为同run/floor、时间戳不晚于decision的最后记录REWARD状态，仍可能陈旧；当时题面的in_deck、费用、牌文、备选与HP才是当前信息，不把快照叫原子战前状态。没有将历史outcome_stats、模拟分数或大脑理由当作新知识。

各卡每局仅取首次实际遇到该牌的可判选择奖励，拿与不拿两臂互斥，单卡独立分母可查真实run_ids。它是first observed offer规则，未保证局内真实首次；终局是记录视图，重试组并非首次尝试胜负，不把一次局内多次选择当多独立局。所有资源/副本更细组比宽组更稀疏。尖啸重试组+0.72pp而无重试组−3.33pp，蛇咬+0.02pp而无重试+0.40pp；样本与混杂不支持固定拿牌排序。其余卡的负向/零差与极稀疏正向均在原表保留。

20卡都有≥100取得牌次/侧的外部宽代理统计：18卡v0.111幕1/2，DAGGER_THROW用v0.111幕1与幕2–3，BACKSTAB退到v0.107幕1与幕2–3（349/129牌次）。不把这20卡说成100独立上传局或奖励拿/不拿比较；外部各组独立局并集未知，玩家独立性也未知。BACKSTAB较早版本不外推其机制到v0.111，正反版本原分母与异质性保留。没有机制未改的实际对照，五版本均未合池；未知没有导致整批停产。

## 消费者、去重与待办

已核冻结#27/#42文字策略证据与#28来源/回放合同、#55检索合同和正式75文字/115rk去重基线。8个新ID不覆盖旧ID；例如斗篷/余像已有combat_line或备战经验，但本批仅奖励选择比较，旧条目和其原证据全部保留，不将这类范围变化计作旧ID更新。无铁甲行为变化。

文字：现有parseStrategyLibrary接受8条，当前只在scratch；未写正式库，生产kb_strategies不扫描scratch，正式生产工具读回0。knowledge：8段统计/上下文笔记为同8情境，没有另算8个新增成果，当前没有正式knowledge消费者或完整剧本交付。rk：8个reflex-entry-v1 card_pick tag和8个对应词表成员格式通过，但cardPickReflex明确只收contrast，排除tag；因此rk当前实际拿牌消费者缺失，不能报告已读回/已采用或比较效果。两个≥100局宽组也没有补出所需校准HP/turns/damage_per_turn对照、SE、run-cluster t区间或模型版本。

没有运行模型、MC、Jev、游戏、两臂/A-B、full或强制tick；没有启#28开关、扩schema或改触发模型。生产消费者读回、自然查询、采用、收益和科学父都保持pending，候选processed不关闭父。交原ops按原锁串行去重，确认哪些稀疏/统计候选可发布；本学习者不发布、不等代码/full，也不自行开下一单元。未写正式学习账本，来源账本仅scratch。

## 覆盖与核验

程序覆盖132叶SHA、11冻结分片、6873奖励原行；模型通读2页外部完整胜负配对（c1 offset0及c2 offset0），共4例/120节点，另通读16个自有奖励完整事实投影和20卡牌文摘要。所有外部代表只经manifest核SHA的有界reader一对一页读取，完整节点不截断。其余156外部代表与506局四section未通读；不声称完整流派剧本，程序保存不冒模型通读。c1赢家第一幕取得蛇咬后仍有后续损血，c2赢家首幕Boss末7HP/二幕Boss末19HP；两对失败代表分别15/7节点终止，取得或最终含这些牌均不保证生存。记录序号不是floor、节点末HP不是真实入场快照。

现有解析器校验：8策略、8rk、8词表；每rk已检查正例true/异牌false/缺字段unknown。这仅格式和本地谓词检查，未称生产工具、回放或自然消费。未改生产代码或提交，tsc/vitest/cases均null；gitleaks结果另存security-scan.json。HEAD最终仍为dispatch_base，git diff --binary空。

原任务保持gpt-6.1-sol/high与fast wrapper请求的文字不能证明实际采用；本批未核原生回执，实际档位/周额度未知，未改账号/home/config/权限。使用量与耗时不估算。旧连续零计数不改写，本批实际新情境8，原科学父不关闭。

## 最终结果（与result.json及最终回复同字节）

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-211311-strategy-proposal",
  "base": "e63adb6def663297efa42cd52c4d7bfe7db23636",
  "runs": [],
  "own_support_runs": [
    "CRK2HNYKSCZC",
    "NB8KCF6HRGVF",
    "P5HT1272P5SB",
    "QNTW139MGECA",
    "U8K28UUGYP3U",
    "VPW8YH7A4QFM"
  ],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/report.md",
  "external_source": "issue51-single-card-lane-b-001-20261024",
  "input_sha256": "6866fd337da77e3ff6c643ec2a2c9711c6210f0bec86975991d0c6dd3d5afa6d",
  "reason": "20张牌逐卡处置：8个新情境、9个同情境备选映射、3张仅统计并跳过动作候选；交付8文字/8描述rk。尖啸、蛇咬两卡自有A10重试/判死首次奖励拿/不拿各达100独立局；20卡外部取得牌次比较达100代理门，不能当奖励拿牌验证。另6情境自有比较稀疏；rk tag被现拿牌消费者排除。正式发布/生产读回/自然采用均0，科学父保持。",
  "decision_output_counts": {
    "cards_selected": 20,
    "new_contexts": 8,
    "same_id_updates": 0,
    "byte_reused_contexts": 0,
    "old_reused_contexts": 0,
    "companion_card_mappings_not_new_contexts": 9,
    "statistics_only_cards": 3,
    "strategy_candidates": 8,
    "rk_candidates": 8,
    "rk_vocabulary_members_not_new_contexts": 8,
    "knowledge_contexts_same_eight": 8,
    "cards_with_100_independent_own_runs_each_arm": 2,
    "cards_with_100_external_acquisition_proxy_each_arm": 20,
    "external_v0111_direct_act1_act2_gate_cards": 18,
    "external_v0111_wider_act2_3_gate_cards": 1,
    "external_v0107_wider_proxy_fallback_cards": 1,
    "new_contexts_with_100_own_run_gate": 2,
    "remaining_sparse_new_contexts": 6,
    "formally_published": 0,
    "production_consumer_readbacks": 0,
    "natural_queries": 0,
    "natural_adoptions": 0,
    "causal_benefit_demonstrations": 0
  },
  "artifacts": {
    "dispositions": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/card-dispositions.json",
    "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/scenario-mapping.json",
    "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/coverage.json",
    "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/source-ledger.json",
    "statistics": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/card-statistics.json",
    "external_directional_comparisons": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/external-directional-comparisons.json",
    "rk_consumer_status": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-status.json",
    "validation": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/format-validation.json"
  },
  "external_results": [
    {
      "id": "external-single-card-lane-b-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-lane-b-001-card-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-wail-duration",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-draw-discard-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-block-time-and-shiv",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-two-cost-defense",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-retained-source-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-burst-versus-setup",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-discard-payload",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-attack-target-and-time",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-wail-duration",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-draw-discard-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-block-time-and-shiv",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-two-cost-defense",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-retained-source-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-burst-versus-setup",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-discard-payload",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-attack-target-and-time",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-211311/learner/runs/20261024-211411-8325fedc-02a5-4da6-8812-ced6019575ac-strategy-proposal/scratch/rk-candidates.json"
        }
      ],
      "reason": "本批候选及8对文字/rk已真实落盘；仅候选processed。EXPOSE、ESCAPE_PLAN、UNTOUCHABLE子项缺目标/抽牌条件或奇巧兑现证据，仅保统计，无动作候选去向；逐卡处置和缺口见card-dispositions.json。全部正式发布与消费者读回pending；HEAD保持dispatch_base。"
    }
  ]
}
```
