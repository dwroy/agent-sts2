# 决策点知识注入（#81，源码缺省关闭，生产已显式开启）

R1 `27036eae5` 随R457采用，格式兼容/路线/通用排序R2 `a6e6c205a` 已随 **V6-R458** 上线；生产ops已在自然局显式on/8000，首五局已交报告（[#81/6445032772](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6445032772)）。当前完整条目后继基于实际main `f11183c49b34595f220758ecad672d1f7514cacd`，只改注入打包，不改排序、触发、正文、置信度、K1或生产配置。主管要求见 [#81/6445099611](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6445099611)：保持8000B，用开启后133原题离线复核；完整三条放不下则报实测分布，由主管决定预算，不由开发加大。

## 开关与送达

`BRAIN_DECISION_KNOWLEDGE=on|off` 默认 `off`。`BRAIN_DECISION_KNOWLEDGE_BYTES` 默认 **8000**，接受 **2048–24000** 的整数字节预算；无效配置拒绝启动。配置随进程冻结，启用时写入 `run-config.brain.decision_knowledge`。现有整题、查询、作答预算不变。

启用后，Silent 的生产知识工具模式在 `Brain.request` 给题面增加 `decision_knowledge`，Codex 与 DeepSeek 共用。它是上下文，不消耗工具调用。原题、候选、状态与答案格式不裁剪；预算约束整个摘要 JSON 的 UTF-8 序列化，包含来源、条件和元数据。原 router 的 payload 日志保存实际摘要，不能把生成摘要当作模型实际采用。

关闭或历史配置未设置时，不作默认注入、不加取回工具；固定测试比较关闭与未配置的请求字节。Ironclad 即使开关为 on 也保持原请求。本后继获准的策略工具路由/排序单独生效，不能把“关闭注入”等同整份工具题面与 R457 字节不变。

| 题目入口 | 触发 |
| --- | --- |
| `reward/card`、`selection/add` | 选牌；战斗内 selection 不注入构筑观察 |
| `shop/*` | 商店；现场删牌服务 available/enough_gold 且未 used 时同时查删牌 |
| `selection/upgrade`、`selection/remove` | 升级、删牌 |
| `run-plan` 的 start/act；普通题携带 `run_plan_task.trigger` | 开局、幕复核；hp_drop/周期复核不冒作幕初 |
| `map/act-start`、`event/act-plan` | 幕复核 |
| `fight-plan` 的 `fight_state.fight=boss` | Boss入场；精英/普通战不匹配 |
| `map/route`、`map/route-plan`、`map/route-review` | 路线 |
| `rest/*` | 营火；现场启用 SMITH 时同时查升级 |
| `event/*` | 事件；仅提供契约已有的相关上下文能力 |

升级/删牌一次题只认题中具名候选；不把货架牌当可删牌，不用全文描述、历史或牌组里的任意 ID 冒作当前提供。未进入大脑的 Jev/代码决策不在本改动范围内，既有出牌执行不变。`用药` 是契约保留触发，不额外创建药水或战斗请求。

## 与 #80 对齐的最小发布契约

新叶固定为 `characters/silent/decision-context.json`：

```json
{"schema":"decision-context-v1","character":"silent","status":"published","entries":[]}
```

它沿原 K1 candidate/validate/publish/rollback 链存储，与其他知识文档一起参与 manifest、快照、完整性及历史保留，无 SQLite schema 迁移。开发不创建正式知识叶、不转换或发布候选。

另兼容同一 K1 的 `strategy-entries.json` 已发布观察提示：`formal_publication` 须带非空批准者、HTTPS 授权、授权/原候选 SHA、`observation_only=true` 和保留原候选标记，`review_observation` 须保条件/分母/反例/限制。仅独立 review-only 文件、pending 或缺发布证明不自动注入。字段来自已发布修订，不据 ID、日期或文字猜是否批准。

兼容读取沿正式 trigger、角色及精确进阶 scope 匹配，投影逐项保 `review_observation.conditions/denominators/counterexamples/limitations/conflicts_with` 或明确标识片段。`applicability=formal_trigger_only`、`condition_evaluation=not_evaluated` 表明原文额外条件没有求值；原候选内历史 `review-only` 身份仍保留，批准观察提示不等于批准机器规则。全文按同 K1 精确 ID 无损取回，不把显示摘要写回知识。

纯路线题接为 `map_route`。原策略可显式声明该题型；对历史观察格式，仅原已发布 `review_observation.triggers` 明确包含“路线”才兼容此类型，正式 acts/floor/Boss/deck 等门继续成立。普通 act_plan、营火观察、未批准草稿不会因此扩大成路线经验。topic 仍只认显式分类，unknown 不因上述路由或正文含“路线”而进入 climb_route；#80 知识维护方按原来源补齐并发布分类。

策略通用排序在合法场景内先区分已批准观察、普通知识、显式 pending，再对已批准观察按当前计划主场景、题型范围窄度及当前牌组与原结构化 core_card_ids 的明确交集排序，之后沿原条件特异性、confidence、ID。交集只是相关性，不是成型阈值或卡牌价值；不改 confidence、不按批次前缀/日期/ID置顶。`kb_strategies`、默认观察注入和相关线索共用该排序，分页仍在动态筛选之后。

独立 `decision-context-v1` 契约的每个条目保留 #80 的 `id/dimension/triggers/conditions/summary/rule_candidate/confidence/denominators/evidence_refs/counterexamples/limitations/conflicts_with` 概念；新增 `status=active|retired`、显示 `priority=0..100` 与 `review_origin`。`details` 可保存各维的结构化表、分幕检查点、HP 目标或取舍内容，消费者不生成数值、排名或规则。

| 内容 | 正式契约 |
| --- | --- |
| ID | 1–160 字符的 ASCII 字母、数字、`_ . : -`，文档内唯一 |
| `triggers` | `选牌/商店/升级/删牌/开局/幕复核/Boss入场/路线/营火/事件/用药` 的非空去重数组 |
| `conditions` | 必需 `character:"silent"`、`ascensions:[整数]`；可选 `acts/floors/game_versions/bosses/candidate_ids/deck_cards/archetype/observed`，拒绝未知键 |
| `deck_cards` | `[{id,min}]`，实际牌组必须满足全部最小计数 |
| `archetype` | `{model_sha256,version,clusters}`，复用既有固定 SHA 的当前牌组几何；三个字段全部精确匹配，不等于已成型或流派收益 |
| `observed` | `[{path,equals}]`；只读当前 `payload.facts/fight_state/run_state/run_plan_task/run_brief` 或 `state.run/combat` 的显式路径，数组下标可用；未知字段不成立，所有条件合取 |
| `denominators` | 非空 JSON 对象/数组，保留来源的分层与独立单位；不求和或转成收益分 |
| `evidence_refs` | 非空已解析对象数组；`own_run` 带 run_id、floor>0、offset≥0、length>0、sha256、support/contradict；`external_aggregate` 带 external 来源、HTTPS URL、版本、下载日、冻结 SHA、筛选、单位及正整数 n、support/contradict |
| `counterexamples/conflicts_with/limitations` | 前两项为原内容数组（原对象可包成一项），局限为非空文本数组；不因发生冲突而删掉反证 |
| `review_origin` | `{schema:"issue80-review-candidates-v1",id,sha256,conditions}`，保留原候选 ID、文件 SHA 与原始条件全文 |

`observed` 是精确值比较，数组保序、对象键序不影响相等；不解释自然语言，不执行脚本，不访问路径外的历史/记忆/文件。缺失实际游戏版本、牌组、流派几何或其他受限事实就不匹配；不从外部资料的版本推定当前游戏版本。Boss入场按当前敌人 ID 或精确组合 `A+B` 查，不用旧 act_boss 时钟代当前遭遇。其他题的 Boss 过滤使用当前题面/原状态明确的 act_boss。

**#80 原 `review-only` 文件及其混合文字条件不能直接当 `decision-context-v1` 机器条件契约。** 审阅通过后，由知识负责人解析来源引用、保留原条件、逐条写出获准的机器条件。历史节点簇不等于当前牌组几何；原 visible-state signature、文字前提或其他未知条件没有已审定等价转换时保持候选，不删条件求匹配。这里的 `priority` 只控制显示顺序，不是卡牌价值；无合格优先级证据可以仅发布关联提示，不能由开发者补出选牌表。

发布更新不能删除已有条目、来源、分母、反证、局限和冲突；退休保留原件。机器条件、触发与原审阅来源变动拒绝原 ID 更新，需要经知识负责人审阅另立 ID、退休旧条目。源码接收和 K1 发布仍是两项独立验收。

## 有界投影与完整取回

沿已有通用排序取一个连续前缀，最多4条，实际N由**整个JSON信封的UTF-8字节预算**决定。每条 `representation=complete_decision_view`，完整复制原结论（summary/rule_candidate）、适用条件、分母和样本数、全部原反例、限制及冲突；策略观察另保正式trigger/scope与原review-only状态（有该字段时）。必需字段不截字、不挑统计行、不合分母。原始证据索引、归档引用和其他非消费字段不重复塞入视图，完整原JSON仍由 `full_document` 无损取回；“完整消费视图”不等于整份原JSON。

余项放在 `references:[{id,title,source}]`，标题只作导航：取原name/summary/strategy第一句，最多120个转义JSON字节，缩短以省略号标识。source标明原文类型，按ID及source使用 `kb_decision_context` 取回。参考项没有条件或统计片段，不冒完整条目。优先条目过大时停止完整前缀，不跳过它将后项提到前面，不改排序来凑条数；若第一条也放不下，完整条目为0，保ID导航，向主管报告该限制。

`complete_entries/returned` 只数完整消费视图，`fragment_entries` 固定0，`reference_only_count` 单列导航数；`omitted` 是未展开正文数，包含reference-only项。`omitted_references` 是连导航都不能列出的数，`truncated` 只指索引确有省略，不能用它推完整条目数。极大候选集先去标题、仍超限才从末尾省索引并计数；133原题没有索引丢失。原题、选项及状态均不裁剪。

源码预算缺省仍8000，配置区间2048–24000不变；不保证8000能放3条。开启后133题离线实测完整条目0/1/2分别15/43/75题，15题第一条为原event-bridge观察，其原分母单字段已9829B。至少匹配3条的107题，前三条连同余项ID导航需9239–34408B，p50=20961B；不通过裁分母或临时扩预算凑三条。原始前后对照与统计见 `paper/materials/20261027-issue81-complete-injection/`。本后继不改变 `kb_strategies` 等工具既有投影，仅改变默认注入。

启用时大脑获得只读 `kb_decision_context`，摘要的 `full_document` 给出精确取回参数：

```json
{"detail":"full","document_id":"原条目ID","document_offset":0}
```

工具同样按绑定 K1、当前角色、进阶及本题正式动态条件匹配。兼容策略用 `source:"strategy_observation"`，独立契约可用 `source:"decision_context"`，不提供时 ID 必须唯一。按 `next_document_offset` 续取到 null，拼接 `json_fragment` 后解析；每片带 `representation:full_document_fragment`、原文 SHA、K1、对应实际文档 path/SHA、总片数与 `encoding:concatenated-json`，小于 24KB。固定测试对中文、emoji、引号、反斜线及换行逐片无损重建。工具不接受文件路径、任意查询或写入参数。

## 后继交付与运行边界

1. 原集成员核本后继单个ROOT/LIVE运行叶 `agent/src/brain/decision-knowledge.ts` 的实际组合及必要完整检查；保R458/schema4/其余共享源码，不重放R2四叶发布。
2. K072分类已核收、正文不变；现有生产on/8000配置和知识版本由ops保管。本树不修改生产配置、开局或执行发布。
3. 133题为已完成自然五局的固定payload反事实复核，不代本后继的自然读回、采用或收益。完整三条全部放不下的实测分布交主管决定，本次不改8000或24000配置上限，不新增实验局。
4. 后续报告分数完整消费条目、片段、仅ID导航和索引丢失，不能把参考ID计作完整正文，也不能把原始引用档案未展开计作条件被裁。原五局/0次全文取回/旧失败保留，#80长期父要求继续由原owner验收。

格式回退为恢复R458的本源叶；若ops需关闭整个注入，仍在自然启动点关闭开关，不热切在途局。原K1、知识正文、候选、证据和历史保持。开发树不改live/STOP/PAUSE或其他会话。
