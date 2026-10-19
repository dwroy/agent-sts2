---
title: Silent 出牌小脑记忆第二轮观察性量化
model.codex: gpt-6.1-sol
effort.codex: xhigh
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：Silent 出牌小脑记忆第二轮

你是离线 Silent 学习者，任务 v6-reflex-distill-r2，请求 roy-20261019-v6，批次 {{batch}}。Roy 已批准本次一次性手动派发 gpt-6.1-sol / xhigh、240 分钟；原因是全量证据量化与条件转换。工作树 {{worktree}}，日志 {{logs_dir}}。先读 README.md、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md、docs/v6-plan.md 第 3.2、5、9.2 节，agent/src/v6/ 下格式、predicate 与 draft 校验实现，以及 agent/src/reflex/jev/predicate-context.ts。这些是格式与架构要求，不是游戏知识。

报告、计算程序、原始抽取、审计与结果只写 {{scratch}}；草稿只写本工作树 knowledge/characters/silent/pending/v6-reflex-distill-r2-{{batch}}/。本次只研究 applies_to=combat_line、按出牌方案计算的条目。拿牌、商店、休息和药水购买/使用条目的计算由其他任务按牌组和组合负责，不在本批新增；原经验仍须逐条覆盖并说明不属于本批的原因。不得改其他任务的产物。

## 冻结输入

先读 {{evidence}}，核对 request_id、task、character=silent、batch，计算清单 SHA256，核对 files 的字节数和 SHA。按清单的精确路径读取，不能用稀疏工作树副本替换主检出冻结文件。清单包含本角色全部已结束局、正式 experience.json、方向目录、第一轮草稿/报告/缺字段审计、W1.1(2) 的运行时字段与来源审计。核对全部经验实际数量和 id（计划为244），不删条目缩分母。可引用冻结的方向/组合草稿；未冻结或仍在写的 v6-build-cores 产物不混入，不等它完成。

全部已结束 Silent 局都进入 inventory 和适用性审计，不能只选成功局、典型局或第一轮抽样。日志读取不得越过 log_byte_limits；每个抽取保存文件、偏移范围、局号/层/回合、SHA、命令。没有测过的整日志 SHA 明确未知。允许 data/logdb 只读查询加速，但必须核对其原始日志来源、run_id、时间/字节边界和冻结清单；不能确认的行排除并写原因。不得重建或改写共享 logdb。冻结文件变化停止并报告，不读后续字节或新产物。

首试 first 按首条 predicted_death 截断，与 including_sl 分开；同局多次 SL 不作为独立局。按进阶、代码/模型版本和引擎分层；缺失的层/回合/版本/SL 身份保留未知。不能用最终牌组回填历史手牌或牌组，不能用模拟值冒充实测，不跨角色混证据。

## 条件与量化

1. 使用当前严格 reflex-entry-v1、reflex-vocab-v1 和 predicate 求值器。对第一轮32项缺字段逐项复核：enemy.id/hp/move_id、enemies.alive；card.id/upgraded/cost/can_play；option.actions；player.hand/piles/deck/relics/relic_counters；potion.id/usable/slots；turn；option.future；sl.attempt；history.first_predicted_death/resource_handoff；player.max_hp；room.kind；rest.options；shop.stock/prices；player.gold；option.kind/model_version/trust/complete_line。字段进入白名单不代表历史记录或当前 DTO 必然有值，以冻结源码和实际证据为准。字段取不到写来源/原因，不假设、不补零、不从中文叙述猜数量或身份。
2. 明确标量 enemy/card 的绑定语义。多实体条件使用源码允许的有界 any/all 与 collection/alias；不得把第一只敌人或第一张牌当作全体，不添加自由代码、字符串条件或求值器不支持的字段。option.actions 等方案字段按实际出牌序列分析。缺方案、未来预测、历史或版本字段的证据保留缺失，不把执行结果倒填成决策时已知。
3. 从全部冻结历史中计算条件成立时不同实际出法的观察性数值，例如到下一回合的实际掉血和实际伤害。明确定义起止状态、回合/动作窗口、出法分组、对照组、过滤、右删失、治疗/过量伤害等处理；不能把两个不相邻快照的净血差叫完整实际伤害。无法识别的量保留未知。仅有执行方案的观察结果不能冒充未执行候选的配对反事实。允许观察性关联，不声称因果或保证收益。
4. 每个数值保存 n、独立局数、回合/动作观察数、分子分母、method、单位、effect_size、se 或不确定性区间及其方法，附正反证据局号/层/回合和抽取 SHA。同局回合相关性须说明，误差优先按独立局聚类计算；样本少标出，不能用回合数冒充独立局数。首试/含SL、进阶、版本分别呈现。signal.value/se 与 metrics 对应，不可量化时仅用有证据的词表枚举或保留文字原因。
5. 优先级按近期 A10 条件出现频率 × 绝对观察效应排序，另保存效应符号、条件出现次数/分母、窗口、独立局数与不确定性。全历史用于证据审计，不只分析近期。不能量化的优先级为未知，单列缺失原因，不以0冒充。保留低频、高损失和反例，不只选支持旧经验的数据。
6. 每个 combat_line 条目增加 cores/combos 关联。cores 引用冻结 build-core 的 direction id；正式构筑稿未出时可关联冻结方向目录。combos 仅引用冻结输入中实际存在的组合 id；没有组合草稿时可省略或空数组，并在关联提案中写原因，不编造组合。source_experience 保留原经验来源。不可量化用词表枚举，label_en 不超过12个英文词，可信度不能因迁移格式自行提高。

## 交付与校验

交付严格 v6-reflex-draft-v1：{schema,character,vocab,reflex,coverage,metrics,missing_fields,limitations}，各子字段以源码为准。reflex={schema:"reflex-file-v1",character:"silent",entries:[reflex-entry-v1]}，所有 entries 只允许 combat_line。coverage 对冻结全部经验逐条给 experience_id、status=converted/partial/text_only/disputed、reflex_ids、directions、reason；不属于本批也必须覆盖。metrics 保存 reflex_id、n、method、design="observational"（只有真实配对证据才可paired）、effect_size、se、frequency={n,total}、evidence。严格 schema 不容纳的聚类误差、分组对照、频率排序、cores/combos 关联提案与未转换原因另存 scratch 的审计表，不能删减证据来迎合格式。

生成 {{scratch}}/validation-context.json，严格 {character:"silent",experienceIds:[实测全部正式经验id],directionIds:[冻结目录全部方向id],runIds:[全部冻结局号]}。记录提取程序、输入 SHA、context SHA。运行只读校验：

```sh
(cd {{worktree}}/agent && nice -n 10 node --import tsx ../knowledge/builders/validate-v6.ts reflex 实际draft.json绝对路径 {{scratch}}/validation-context.json)
```

保存 exit code、stdout、输入和输出 SHA。超8MiB写限制，不修改校验器。失败候选连同原件留 scratch/rejected；不能删反例或经验让校验通过。每次口径/候选变化追加 {{scratch}}/changes.jsonl，保留旧新、时间、理由和证据。

本次产出严格限 scratch/pending，不改代码、正式知识、共享账本、参数、调度、运维 prompt 或配置，不提交、不合入、不恢复 live/Regent、不移除 STOP，不开局、不跑 play、不调用在线模型、不启动模拟或新学习批次、不读游戏二进制。所有分析 nice，单进程优先且最多四进程；不得安装依赖。新结论可用 learner/ledger.py 只读查重，登记请求与代码提案写 scratch，供 ops 后续按学习要求/代码提案闭环登记，不自行写共享账本或标 shipped。异议列旧结论、新证据、影响与未知，交 ops→watcher→Roy，不代填确认。

中文 report.md、result.json、全量转换表、计算口径/可复现命令、排序表和字段可用性矩阵写 scratch；草稿与引用 SHA 明确。result.json 至少含 task、request_id、batch、character、input_sha256、complete、status、covered_runs、covered_experience_ids、counts、limitations、disagreements、artifacts[{path,sha256}]、report、continuation、merged=false、published=false。complete 只表示本轮审计结束；未完成写续跑清单，不能说知识已上线或收益已证实。停止后由调度者决定续批，不自行再次派发。
