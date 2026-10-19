# Silent 核心构筑卡（多组合）冻结审计草稿

本轮审计完成：P/D/S/R 四张 candidate 核心卡、14 个具名候选组合。完成仅指本批冻结审计和草稿交付，不表示正式入库、live 上线、消费者读回、W2 或 W2.2 生成器完成，也不关闭父要求。

请求 roy-20261019-v6；任务 v6-build-cores；批次 v6-build-cores-20261019-1838；角色 silent。只写本任务 scratch、指定 pending 及已授权账本 CLI 追加；不开局、不跑 play、在线调用或 Boss 模拟，不改生产代码/正式知识/参数/调度/STOP，不提交、不合入、不恢复 live 或 Regent。未另派模型或续批。

冻结清单 [v6-build-cores-20261019-1838.inputs-pinned.json](/home/dw/Projects/agent-sts2/ops/codex-ops/learner/v6-build-cores-20261019-1838.inputs-pinned.json)，实测 232,758 字节，SHA256 `3797119b9ef820567daee002693de5fd2af8b799e94a0d53b8ea2e09388f1940`。645/645 个精确路径在开始及结束核验字节和 SHA 均一致，缺失/变化均为0，未用稀疏工作树缺文件代原件不存在。固定源码提交 `6e39eb2dc18d748b0c124d8f79de6be5328798ef`，原 git diff --binary 为空，来源记录见 [source-provenance.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/source-provenance.json)。要求的 gpt-6.1-sol/xhigh/240分钟属于派发授权；本轮未查原生 turn_context/请求回执，不额外声称档位已经核实生效。

库存覆盖全部372个已结束Silent局，正式 experience.json 实测244条，逐对象原文、原证据、canonical SHA、原账本ID及层/回合记录保存在 [experience-append-proposals.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/experience-append-proposals.json)。覆盖为 linked14 / unrelated131 / unknown98 / disputed1；退役条目保留身份，不重新激活。全部 IDs 原样进入 [validation-context.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/validation-context.json)：244 experienceIds、4 directionIds、372 runIds、13个冻结9.2实际 reflexIds；没有删减分母。

全量状态抽取解析246,766条，逐时牌组变化11,050次。2条坏JSON按源偏移/SHA保留，未修补为有效证据。最终重读核验262,073个不同原始段、9,124,263,036字节，包含全部状态以及复用的SL/结束记录/run-config/脑元数据原行，均未越7个冻结日志字节上限；见 [raw-evidence-final-verification.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/raw-evidence-final-verification.json)。整日志前缀SHA没有测，不能把这些提取段SHA冒充前缀SHA。

组合定义分三层：同时持有只是组装见证；单牌实际贡献须有出牌计数、手牌变化、能力/毒/挡/刀/实弃收益等原始状态；生效见证还须这些贡献在同一战斗/尝试的窗口内成立。记录的是最早可核见证，不把缺帧中的真实首次当已知，也不由最终牌组回填前期。D另需双步法同手见证及两次实建；毒雾须跨到后轮；R各弃牌组件必须在对应出牌计数下完成实际手牌移除和遗物兼容收益，工具另有后轮零出牌时的实弃见证。

下表是跨分层的库存计数，用于核覆盖，不是可比较胜率或策略因果。P/D/S/R和多个组合的局集合可以重叠，不相加为独立总样本。精确进阶/code含dirty/全部记录引擎/accepted来源/完整config提交集合的统计在机器文件中分账；旧accepted缺失保留unknown，不宣称全部纯Codex。

| 组合 | 曾持有局 | 首试生效局 | 含SL生效局 | 这些生效局首试/最终通关 |
|---|---:|---:|---:|---:|
| P-toxin-footwork | 49 | 27 | 40 | 2 / 4 |
| P-fumes-footwork | 41 | 22 | 29 | 1 / 1 |
| P-flask-afterimage | 7 | 4 | 4 | 0 / 0 |
| P-flask-footwork | 23 | 11 | 11 | 0 / 2 |
| P-mixed-defense | 6 | 2 | 2 | 0 / 0 |
| D-toxin-backflip | 37 | 9 | 11 | 2 / 2 |
| D-fumes-backflip | 25 | 4 | 6 | 1 / 1 |
| D-flask-sweep | 8 | 0 | 1 | 0 / 0 |
| S-dance-accuracy | 5 | 2 | 2 | 0 / 0 |
| S-cloak-phantom | 9 | 1 | 3 | 0 / 0 |
| S-dance-afterimage | 2 | 2 | 2 | 0 / 0 |
| R-acro-tingsha | 2 | 2 | 2 | 0 / 0 |
| R-tools-tingsha | 3 | 2 | 2 | 1 / 1 |
| R-acro-bandages | 2 | 2 | 2 | 0 / 0 |

完整组合同步持有、生效、未生效、失败和排除原因有14×372=5,208对，见 [combo-run-witnesses.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/combo-run-witnesses.json)。另3个未入卡候选也各有372局见证，共1,116对，见 [rejected-run-witnesses.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/rejected-run-witnesses.json)。未见完整生效的R升级下注候选保留为缺证，不能推断无效。原17候选、初版分段/候选统计、超8MiB候选和失败生成记录全部保留。

common在本批仅指至少两独立局观察到该具名组合生效；单独立局使用observed_case，不表示常选、稳定通关或升级必要。每张牌的作用、角色、升级限制、组合反向引用与原局/层/回合均在卡中。没有去件/替代配对、全牌池穷举或可比DPR排名，因此四方向的must_pick_minimal、max_cards、max_dpr共12项逐项missing，不为了凑齐类型编造牌表。

第6节全部27个observed槽、各Boss到达/通过/比例、每牌每幕供给及simulation槽均按格式保留。pending文件内有410个曾持有层；所有冻结层的完整指标格共8,260个，含7,850个未成型格，保存于 [full-metric-strata.jsonl](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/full-metric-strata.jsonl)。未成型格保留全库存分母，表现/Boss胜率n=0时value=null，不写0胜率。[full-strata-denominators.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/full-strata-denominators.json) 明列每层run_ids，不为入口大小删除统计层或上下文。

实际统计采样单位为独立run。连续指标先局内汇总，再跨局中位与p25/p75；同局SL不增n，含SL每层连续表现取时间最早的合格生效尝试，其他尝试全部留证。startup分布按每局最早见证提供。n<10均标small_sample；n<3中位数SE未知；其他中位SE用固定种子20261019、400次独立局bootstrap，只重采样固定数据，不做游戏模拟。比例附插件SE及 [rate-wilson-intervals.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/rate-wilson-intervals.json) 的Wilson95区间，边界零SE不表示确定。逐回合样本、原字节SHA、选择/排除口径在 [metric-samples.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/metric-samples.json)。

first在整局首条predicted_death（或更早实死）截断，判死不冒称实死；按每个完整回合的结束时间过滤，不能因战斗后端稍晚于cut丢掉之前回合。including_sl使用最终记录，SL不是独立新局。各Boss仅统计生效前/中已成立且入口仍持有的同局实际到达/通过。F48→F49按同局接续，不乘两个单战概率；含SL可恢复资源，不冒称未经恢复连续战。只有本冻结实战观察到F49结构的进阶有连战分母，低阶F48单王结束不记连战失败。

DPR是启动后完整就绪回合的敌HP净推进，包含全牌组/毒/药/遗物等所有来源且受余血截断，不是本组合归因伤害；终结、换相、重复敌ID、回血和缺就绪边界排除。Boss/精英/普通及1–3/4–6/7+段分开，峰值仅指可见完整回合最高推进。格挡为快照正增量下界，HP是无可见回血的首尾净掉血（含自损），内部同帧伤疗/挡消耗未知。真实AoE归因和累计启动抽牌不可识别，保持null；启动能量只报告必需贡献牌现场显示费用之和，不宣称最低启动预算。

持有凑齐率与生效率分列，见 [holding-and-activation-rates.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/holding-and-activation-rates.json)。每牌按幕出现率的分母是有实际可见奖励/在售牌供给的run-act，表示该幕至少出现一次，不等每次供给概率、购买可行性、抽中概率或凑齐预测；起始牌与缺幕见证有明确限制。牌组规模范围和逐层变化原样保存，没有把阶段/敌人/资源混杂的差异写因果。药水摘要使用、reload.ok与关键遗物共现另见 [resource-observations.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/resource-observations.json)；没有去药/去遗物/禁SL的配对反事实，依赖字段保持unknown。路线精英数、休息与升级最优需求、血线/规模阈值缺证，fits中明确未知。

R三个组合分别带铜钹或绷带条件；cards格式不能编码遗物门槛，必须连同fits.situations读取。两遗物功能不同，不能因共享卡合并方向。linked_reflex仅引用冻结9.2真实ID作同局上下文索引，不将描述tag当组合效应；后续清单外产物没有补入。没有运行新模拟，全部simulation=[]，旧boss-trust/double-boss模型样本不计实战。

全量经验逐条追加cores/combos字段提案只在 [experience-append-proposals.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/experience-append-proposals.json)，linked的{core,combo}与核心/组合linked_experience双向一致；unrelated逐条写该原对象与本轮牌池未建立直接关系的理由，不表示对象无用。unknown保留遭遇/计划/资源/模型边界或缺具体组合交集；未把旧9.1跨方向检索索引升级为协同证明。原条目全部保留，不宣称244条历史机制逐动作重新验证。

只读入口实际命令、工作目录、exit code、stdout/stderr和草稿/context/校验器SHA见 [validation-final-v4.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/validation-final-v4.json)；最终退出0，stdout.ok=true，publication=false。最终draft 8,194,860字节，小于8MiB。首个完整候选8,474,631字节超限86,023字节，先报告并保留原件；只精简重复内联证据和方法文字，全量原见证/统计格仍在scratch，没有修改校验器。初稿校验和失败记录也保留。格式通过不证明游戏知识正确或消费者已能使用。

账本：尚未登记，本初版报告保留该状态。先CLI查重，再仅追加proposed；没有shipped或既有条目状态改写。CLI实际命令、输入及返回见 [ledger-receipt.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/ledger-receipt.json)。本批描述性组装/生效统计不增加出牌、药水、判死/SL或终局执行规则，因此code_proposals=[]、implementation_domains=[]，未派任何实现任务。

三项异议单列 [disagreements.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/disagreements.json)：持有签名不能直接替代实际生效；四种类型/理想升级字段的要求不能充当牌表证据；R遗物条件在现cards格式中缺可执行承载。保留prior、新证据、影响和未知，供原ops→watcher→Roy转达；本批未写收件箱、未代填确认，不把排队当已送达。旧退役条目单独保留disputed身份。

限制全部逐项写在limitations.json及draft.limitations。尤其是严格单计数/单移除出牌识别会漏掉多牌同时变化/重放、缺帧和未记录内部步骤；全成型覆盖只指本冻结范围内按已声明操作定义可核的全量集合，不证明隐藏区间所有真实成型均已识别。7,213个原始可见片段只作抽取边界，不能当独立战斗或独立局；945片段无直接战斗类型，112事件战斗单列，未用预训练怪物分类补齐。

未完成事项只列续跑清单，本次不自动续批：如Roy另行授权，补重放/多牌同变及缺帧的启动识别、升级/去件/规模和药水遗物配对实战；W2.2可复用本批extract_all.py、combinations.py、build_draft.py、complete_audit.py及全量见证口径开发生成器，仍须独立实现/验收；评估R遗物条件及未知升级重要性的格式承载；原ops→watcher→Roy转达异议并沿原父要求处理。没有新的模型派发或恢复运行。

主要产物（全部过程原件和逐文件SHA在artifacts.json；报告自身SHA由该清单给出，避免自引用）：

| 路径 | SHA256 |
|---|---|
| [draft.json](/home/dw/Projects/agent-sts2/.worktrees/v6-build-cores-20261019/knowledge/characters/silent/pending/v6-build-cores-v6-build-cores-20261019-1838/draft.json) | `8fcdcd5eb8be6c5caa4c7dd872748666e050e2f9b70777d4385aa852aa1e0cbb` |
| [validation-context.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/validation-context.json) | `fcb6e6601b240c1ec6cbc377fd25d18ebdaf2e467355edace9b3ac65e1ca2525` |
| [validation-context-provenance.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/validation-context-provenance.json) | `9464bbdc9b74645deed29c518ec024aa5f7679a988a7ed80733e9763fed77a56` |
| [validation-final-v4.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/validation-final-v4.json) | `9ac0e1f58aeb5e1a63a7e10394d4f06bfaa962ec2aa15b62406e0f423eaabb20` |
| [input-final-verification.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/input-final-verification.json) | `9133d7cb5aedd29d32fd0193ae7ec364a3a2e08dfe4c8db380086ac08a74341f` |
| [raw-evidence-final-verification.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/raw-evidence-final-verification.json) | `fe4558714d44d659ba88c9e9803004df3d6bb16bbd09c7390f2bccda215f3c9f` |
| [internal-audit.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/internal-audit.json) | `d9d2fc68218613f11607989a701643b5755da677c227480c86dbebf3abc5cd28` |
| [experience-append-proposals.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/experience-append-proposals.json) | `0f2564e0ca6ee0b57b370ead3eeef2f3bee97f8388ef8491c0fc32233754e4ea` |
| [combo-run-witnesses.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/combo-run-witnesses.json) | `b6f3ad2f34706910595ce96ca468864e90864293e3260b78934329fb94c6f9e0` |
| [full-metric-strata.jsonl](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/full-metric-strata.jsonl) | `ea5ad257d82642580ad90ea2a031792a6fc236352457bb24269b6dd065f425c0` |
| [metric-samples.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/metric-samples.json) | `f5dddd028272836e11a6851347aca9d841d646580ba13edecfd862eccc271ea6` |
| [holding-and-activation-rates.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/holding-and-activation-rates.json) | `f34acb02426b047298d6ccf6cb59b1b79a98c6704e19fd8684c2a37b60eed61a` |
| [resource-observations.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/resource-observations.json) | `9e735972127941757fc5fd123f09529f297d25b8ff4ed77605e7a0c6cc77bbcc` |
| [changes.jsonl](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/changes.jsonl) | `f5e0261cda8efcbb2605e6fc04182edbd391fb030ac78e5a52eb5ed6bd420ee2` |

机器回报：[result.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/result.json)。完整产物SHA：[artifacts.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/artifacts.json)。复现和命令退出记录：[commands.json](/home/dw/Projects/agent-sts2/learner/runs/20261019-185235-1e8a0895-970a-415b-996e-bd619c383056-v6-build-cores/commands.json)。
