# 决策点默认知识摘要（#81，默认关闭）

R1交付 `27036eae5` 已随 R457 采用，默认关闭。兼容后继基于实际组合 `858425f165e273c8db18c23964780936c3c8928b`，保留 #78/#72/#71 与 schema4。Roy 经 [#81/6433218107](https://github.com/dwroy/agent-sts2/issues/81#issuecomment-6433218107) 授权：本后继和 #80 显式分类都完成并集成后，ops 直接开启，再按原口径观察自然5局，无须再次请示。开发树不改生产开关、不启动对局；源码采用、分类发布、实际开启与自然收益分别核收。

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

按显示 priority 降序、条件特异性、原 confidence、ID 稳定排序。每条先保完整条目；过大时提供有界消费投影，保 ID、原 confidence、正文/条件/分母/限制/反证摘录及证据计数。小预算保有正文摘要入口；所有有损字段在 `partial_fields`，字段内截断给 `partial_json_text`，同时列 `truncated/omitted_fields`。整页带 total_matches/returned/omitted/truncated。优先级低的完整条目在总预算满时省略，不裁掉原问题。

与 #78 保持同一原则和全文片段协议：完整存储不改，显示预算不靠升高 24KB 绕过；最近引用指原数组末项，不推定日期或证据强弱；优先保反证，再选末项与最大外部分母，分母不相加。摘要省略不能当作没有反证。

启用时大脑获得只读 `kb_decision_context`，摘要的 `full_document` 给出精确取回参数：

```json
{"detail":"full","document_id":"原条目ID","document_offset":0}
```

工具同样按绑定 K1、当前角色、进阶及本题正式动态条件匹配。兼容策略用 `source:"strategy_observation"`，独立契约可用 `source:"decision_context"`，不提供时 ID 必须唯一。按 `next_document_offset` 续取到 null，拼接 `json_fragment` 后解析；每片带 `representation:full_document_fragment`、原文 SHA、K1、对应实际文档 path/SHA、总片数与 `encoding:concatenated-json`，小于 24KB。固定测试对中文、emoji、引号、反斜线及换行逐片无损重建。工具不接受文件路径、任意查询或写入参数。

## 审阅后接续

1. 原集成员核兼容后继的实际组合、完整检查与 ROOT/LIVE 叶映射，保 schema4 与各共享差量，不重放 R457 原发布。
2. #80 显式分类已发布并经原集成员核收，新 K 为 `K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46`（[#80/6433391076](https://github.com/dwroy/agent-sts2/issues/80#issuecomment-6433391076)）。只改元数据，不改正文/置信度；对旧 K7bb 的 topic 新条目仍为0是正确保留 unknown。
3. 两项都完成并集成后，ops 按已有 Roy 授权直接启用，不再重复请示。实际行为发布编号归原 ops 分配，本分支不造编号。
4. 按原两报告口径核自然5局的 run-config 开关/预算、摘要 K1/SHA/ID/字节、匹配/缺失/裁剪及实际大脑请求，再核采用；离线141题读回不代自然送达或收益。50局各阶段指标仍由 #80 原负责人闭环。

回退时原 ops 在获准的自然启动点关闭开关，后续请求不再附默认摘要及其取回工具，策略查询继续使用本后继已采用的路由/排序；原 K1、候选、原始证据与历史不删除。已经运行的进程不热切参数，不由开发树改 live/STOP/PAUSE。
