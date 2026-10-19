---
title: Silent 出牌小脑记忆第三轮数值入条目
model.codex: gpt-6.1-sol
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：Silent 出牌小脑记忆第三轮

你是离线 Silent 学习者，任务 v6-reflex-distill-r3，请求 roy-20261019-v6，批次 {{batch}}，工作树 {{worktree}}，日志 {{logs_dir}}。这是待派发模板；模板合入不代表已获本轮启动指令。调度者在核心构筑卡第二轮结束、核验并冻结输入后，另行确认一次性 codex1 / gpt-6.1-sol / xhigh / 240 分钟启动。不要自行派发或续跑。

先读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/v6-plan.md 第 3.3、5、9.2 节，以及冻结的 agent/src/v6/ 格式、predicate、draft 校验器和 agent/src/reflex/jev/predicate-context.ts。源码提供格式和运行时字段约束，不提供游戏结论。只研究 applies_to=combat_line、按实际出牌方案计算的条目；拿牌、商店、休息和药水条目不在本轮。

报告、抽取、计算程序、审计和被拒候选只写 {{scratch}}；草稿只写本工作树 knowledge/characters/silent/pending/v6-reflex-distill-r3-{{batch}}/。不修改第二轮或核心构筑卡任务的产物，不写正式知识。

## 输入冻结与逐项对账

先读 {{evidence}}，核对 task/request_id/batch/character=silent、字节边界和 SHA256。必须包含：第二轮 reflex 草稿及其审计；第二轮 scratch 的原始观察、统计表、计算口径与程序；全量已结束 Silent 局和正式 experience.json；已结束且已验收的核心构筑卡第二轮草稿、组合 ID 和指标口径；当前 predicate/运行时字段实现。清单不全、组合第二轮尚未结束或冻结文件变化时停止依赖部分，写清缺项，不读取在途文件或自行续派。

第二轮基线为 85 条出牌枚举、37,902 回合观察，观察数值没有进入 signal。这些数字只作对账起点，必须用冻结材料复核，不能当成本轮样本数。核对第二轮全部条目、全部统计行与正式经验实际 ID（预期244），逐行注明继承、改算、排除或未知及原因，不删行缩小分母。scratch 数值须追到原始日志的局号/层/回合、时间或偏移范围与 SHA；未核回的汇总不直接成为 signal。

可用 data/logdb 只读查询加速，但须核对原日志来源和冻结边界，不能重建共享库。全量已结束 Silent 局都进入 inventory，保留坏 JSON、缺失、右删失和排除数。不得用最终牌组回填历史手牌、用执行结果倒填决策时字段，或将其他角色证据算作 Silent 验证。首试按第一条 predicted_death 截断，与 including_sl 分列；SL 重试不成为独立局。版本、进阶和模型保留来源及敏感性检查，采用冻结计划当前要求的统计口径，不擅自推断缺失分层。

## 将观察数值真正交给消费者

1. 对每个第二轮 tag 和 scratch 数值逐项判断是否能用现有运行时 predicate 匹配实际出牌方案。使用已扩充字段的真实绑定语义；多敌人、多牌采用有界 any/all，不能取第一个实体代表全部。缺字段写来源和限制，不假设、不补零、不从中文叙述猜数量。
2. 能计算的掉血或胜率观察量必须进入可通过严格校验的 reflex-entry-v1.signal：kind=hp/win、value、unit=hp/probability 和可识别的 se。不能只把数值留在 scratch、只写 metrics，或在 label_en 中藏数字而仍交付 tag。条目的信号须说明是条件下的实际结果还是组间观察差；没有可识别对照时不得写成某出法的增益、因果或候选反事实。
3. 每个数值同步提供 design="observational"、method、单位、结果窗口、分组/对照、过滤与删失、n、独立局数、回合/动作数、分子分母、误差及其计算方法。signal.value/se 与该口径逐字对账；样本计数写入格式允许的 evidence/metrics，完整口径写 draft.metrics 与 scratch 的 signal-audit 表，并用 reflex_id 关联。当前 signal 严格格式若不允许 n/design/method，禁止私加字段或改源码；明确列出消费者可读字段与 sidecar 元数据，报告这一格式限制，不能声称 n 和口径已经在 signal 对象内。置信度不冒充样本误差，n_support/n_contradict 不冒充独立局数。
4. 同局观察的相关性采用按独立局聚类的误差或区间，说明方法和抽样单位；单局或不可识别误差保留未知及原因，不写 se=0。若严格 numeric signal 可省略 se，则省略并在审计中说明；不为了通过校验捏造误差。每条至少有可核原始证据，保留反例；来源、design、n 与误差必须可从消费者字段或明确关联的审计记录追溯。
5. 无法量化时才使用冻结词表的有证据档位/枚举，明确为什么不能计算，不能把所有已有数值重新降成 tag。不得自行给枚举定数值分数。label_en 不超过12个英文词；迁移、样本回合多或格式通过不自动提升可信度。
6. 条目按“条件出现频率 × 绝对观察效应”排序，同时给效应符号、频率分子/分母、窗口、独立局数和误差；分别列出全历史与近期目标窗口，不能挑有利窗口。效应/频率未知的优先级为未知并单列原因，不补0。该排序只用于研究优先级，不宣称因果效益。
7. 每条关联冻结核心构筑卡第二轮的 cores/combos。cores 使用 direction ID，combos 使用真实组合 ID，并说明条件与组合的适用关联及证据。没有对应组合可空并写原因，不能发明 ID、把在途草稿当正式知识，或将仅方向关联说成组合关联。保留 source_experience 的原经验来源及第二轮条目映射。

## 交付和固定验收

产出严格 v6-reflex-draft-v1，字段以冻结源码为准。entries 只允许 combat_line；正式经验逐条 coverage，status=converted/partial/text_only/disputed，保留理由、反证和未转换项。提交第二轮→第三轮对照表：原 entry ID、原 tag、原 scratch 行及 SHA、第三轮 signal、n/独立局数、误差、design/method、cores/combos、转换状态和原因。必须列出 numeric/tag/unknown 数量、可量化却仍为 tag 的逐项原因；不能只报“校验通过”。原85条和全部统计行均需去向可对账。

按冻结全部正式经验、方向和局号生成 validation-context.json，运行当前 knowledge/builders/validate-v6.ts 的 reflex 严格校验，保存命令、输入/输出 SHA、stdout、exit code。另用固定抽取数据检查 signal 与统计表的值/误差/分母相符、未知不补零、组合引用存在。每个数值抽查原日志；完整验收列明已核范围和未核范围，不把程序成功当作科学有效。失败候选保留 scratch/rejected，修订追加 changes.jsonl，不覆盖失败记录或删反例迎合格式。

中文 report.md、result.json、全部覆盖/转换表、signal-audit、排序表、口径与复现程序写 scratch，草稿写 pending。result 至少包含 task、request_id、batch、character、input_sha256、complete、status、covered_runs、covered_experience_ids、counts、limitations、disagreements、artifacts[{path,sha256}]、report、continuation、merged=false、published=false。异议列旧结论、新证据、影响与未知，交 ops→watcher→Roy，不代确认。

本轮 simulation off；不启动 boss-sim 或模拟池，不用模拟替代观察。所有计算 nice、最多四进程，不安装依赖。不改代码、正式知识、共享账本、参数、运维 prompt、调度或共用配置；不提交或合入，不开局、不运行 play、不恢复 live/Regent、不移除 STOP、不调用在线模型、不读游戏二进制、不派学习批次。complete 只表示本轮审计结束，未满足数值入条目、元数据或组合关联的要求必须保持未完成并写后续项，不能宣称知识发布或收益证实。
