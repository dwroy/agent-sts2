---
title: Silent 拿牌小脑记忆第四轮观察对照
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：以牌组状态为单位的拿牌观察对照

你是离线 Silent 学习者，任务 v6-reflex-distill-r4，请求 roy-20261020-v6-reflex-card-pick，批次 {{batch}}，工作树 {{worktree}}，日志 {{logs_dir}}。模板本身不派发、不续派；只由 ops 按已授权流程启动。本轮只研究战斗胜利后的三选一奖励，applies_to=card_pick。不研究出牌、商店、休息、事件拿牌或药水，不把旧出牌标签直接改名发布。

先读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/v6-plan.md 第 5、12 节，以及冻结源码 agent/src/v6/{formats,predicate,card-pick-reflex,contrast-statistics,draft,knowledge}.ts 和 card-reward-scope.ts。严格格式和运行时来源以该次冻结源码为准，不擅自扩字段。源码与模板只有任务要求和工程约束，不是游戏知识或效应先验。

只将报告、抽取程序、审计、拒绝项和复现统计写入 {{scratch}}；草稿只写本工作树 knowledge/characters/silent/pending/v6-reflex-distill-r4-{{batch}}/。不改正式知识、代码、第二/三轮产物、共享日志或账本；不提交、不合入、不发布。交付后由 ops 沿学习要求闭环复核实际格式、正式发布与消费者读回；批次完成不等于父要求关闭或实战收益成立。

## 冻结输入和机会分母

先核 {{evidence}} 的 task/request_id/batch/character、路径、字节边界和 SHA256。输入包括全部已结束 Silent 局的奖励与战斗证据、正式 experience.json、已核验的小脑记忆前轮草稿及 scratch 审计、已核验的正式核心构筑卡/组合 ID、当前格式和消费者。只读 data/logdb 可以加速，但必须追到原日志，不重建共享库，不读取在途未冻结窗口。缺少候选列表、执行回执、拿牌前牌组或结果窗口时逐项记未知，不能用最终牌组、后续抽牌或中文说明倒填。

为全部已结束局及全部候选奖励机会建立 inventory，记录角色、局号、层/幕、奖励来源和三选一证明、候选牌及升级、拿牌前完整牌组及升级、HP、遗物及可见计数、已知当前 Boss、原选择与实际成功执行、后续战斗窗口、首试/SL、版本、进阶、排除或删失原因。只纳入能证明战斗胜利后奖励三选一的机会；事件、商店、特殊选择或来源未知不混入。全部代码版本和进阶合并为主口径，保留来源和敏感性检查。SL 重试不增加独立局数；首试按第一次 predicted_death 截断，including_sl 单列且不冒充首试。

## 对照设计与条件

1. 每条以“拿牌前牌组状态 + 被提供的候选身份/升级”为条件。predicate 每个 OR 分支都要约束候选 card.id，以及真实 player.deck/player.deck_size 或 combos.items 的牌组/组合条件；不要交单卡孤立胜率。牌组 any/all 绑定的是同一张牌，不能把两张牌的身份与升级拼接。条件还可用实际层、幕、HP、遗物、组合进度和明确当前 Boss。参考 cardPickPredicateFacts 的 sources/unavailable；精英池不能当成下一只精英，尚无权威下一精英身份就写未知，不补造字段。缺组合结果缓存也保持未知。
2. treatment 为实际成功拿取该候选；control 为同样提供该候选、在可比拿牌前状态中未拿它的机会（选择别张或跳过）。不是“所有未见过这张牌的牌组”，也不是拿后牌组与拿前牌组直接相减。列出基线定义、匹配/分层/调整变量、重叠覆盖、被排除的无对照机会、选择其他候选的构成和剩余混杂。只用选择前信息分组，不以随后是否存活或是否凑齐筛有利样本。
3. 结果只能是实际后续战斗观察。预先明确窗口、掉血/回合/每回合伤害的定义与单位、死亡/未结束/缺日志的删失处理、药水/SL 处理，以及不能比较的情况。signal.value 统一为“拿候选减同条件未拿”的调整后差值；负掉血表示观察到更少掉血，较少回合可能是更快获胜或更早死亡，不能一律称更强。没有真实伤害分母时不从敌人起终 HP 猜伤害。
4. 全部设计写 design=observational。只能说关联或观察差异，不宣称因果、反事实收益或“拿这张必然少掉血”。单局、无共同支持、不可识别对照/误差保留未知及原因，不能捏造 se=0、样本量或区间。

## 数值必须进入 signal

新增对照信号严格采用冻结 contrastSignalSchema：kind=contrast；metric=hp_loss/turns/damage_per_turn；单位分别 hp/turns/hp_per_turn；value、严格正 se；baseline 的 treatment=take_candidate、control=same_offer_not_taken，以及 definition、outcome_window、adjustment。n.take/n.not_take 是真实奖励机会数，n.clusters 是两组联合的独立局数，不能拿动作数或回合数冒充。

误差按 run_id 聚类，采用有解释的按局聚类估计，保留计算程序、每局贡献和有限样本修正。signal.uncertainty.method=run_cluster_t、cluster=run_id；interval 为 value ± t 分位数 × se，level 至少 .95（最多 .99），独立局自由度为 n.clusters-1。冻结 contrastInterval 可生成同口径区间，contrastConfidence(value,se,n.clusters) 生成条目顶层 confidence，禁止固定写 .5/.8/.95。该 confidence 是近似 t 统计覆盖分数，依赖估计与聚类假设，不是因果概率、校准成功率或游戏胜率。至少两个独立局且误差可识别；局数少、选择偏差、频繁试条件和多重比较都列限制，保留反例与反方向结果。

每条 signal.audit 指向完整统计审计文件并给 SHA256；审计须随草稿保存在 pending，不能仅引用会回收的 scratch 临时文件。审计必须含原始局/层/时间或偏移、输入 SHA、纳入/排除机会、两组/独立局计数、结果分子分母、匹配和误差复现、全部反例。evidence.observations 给可核原证据，覆盖多局；完整独立局清单保存在审计，不用少量示例冒充完整分母。draft.metrics 的 effect_size/se/design/n 必须与 signal 对账，n=take+not_take；frequency 单独记条件命中/全部合格奖励机会分母。

条目保留 source_experience 的真实来源，关联已冻结且核实的 cores（direction ID）和 combos（真实组合 ID）；没有对应项可留空并说明原因，不造 ID，不把在途方向或 scratch 当正式关联。label_en 最多 12 个英文词，不藏数值或因果措辞。不能量化的结论留在审计/拒绝表，不为迎合新消费端制造数值标签。

## 排序、验收和交付

产出 v6-reflex-draft-v1，reflex 只含本轮 card_pick 对照条目，词表仍用严格 reflex-vocab-v1。全部正式经验逐条 coverage=converted/partial/text_only/disputed，说明哪些旧出牌经验不适用本任务，不删原行缩小分母。全部历史机会、已有条目和新候选都有纳入/排除/未知去向。按“条件出现频率 × 绝对观察差值”排序，附单位、符号、两组 n、独立局数、区间、范围和局限；不同单位分表，未知不补 0。保留区间跨 0 的已识别估计作审计，消费者只发区间严格不含 0 的匹配条目，不能据此只报告显著结果而隐藏全部尝试。

用冻结正式经验/方向/局号生成 validation-context.json，运行 knowledge/builders/validate-v6.ts 的 reflex 严格校验，保存命令、SHA、stdout、退出码。用固定数据验证统计可复现、value/se/n/区间/confidence 对账、candidate 与 deck 同时匹配、错误/缺字段未知、关联 ID 存在、V6_REFLEX=off/shadow 不发送、跨 0 不发送、正负两方向均能发送。只用注入固定环境，不运行游戏或真实模型请求；需要消费者测试补丁时写提案交开发，不自行改代码。

中文 report.md、result.json、inventory、逐经验 coverage、全部候选/拒绝/反例、排序表、审计及复现程序写 scratch，草稿写 pending。result 至少列 task/request_id/batch/character、input_sha256、complete/status、covered_runs/experience_ids、两组机会/局数与全部排除数、counts、limitations/disagreements、artifacts[{path,sha256}]、report、continuation、merged=false、published=false。异议和与旧结论冲突须明确交 ops→watcher→Roy，不能代 ACK；证据不足就保持未完成并列下一步。

本轮 simulation off，不启动 boss-sim、模拟池、在线模型或学习续批；不以模拟代替观察。计算 nice19、最多两进程，不安装依赖。不开局、不运行 play、不碰 live/STOP/Regent、共享配置或游戏二进制。模板只定义研究与交付要求，不提供任何游戏知识或预设效应数值。
