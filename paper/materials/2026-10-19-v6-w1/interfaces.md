# V6-W1：格式、开关与日志接口

请求 `roy-20261019-v6`。依据 main `5930a733b` 的计划第 9 节及 9.1 节。W1 只提供基础接口；W3–W8 接入前，没有方向评估、方向脑、Jev 拿牌/选药或 reflex 消费。`V6_BUILD=on` 也不会使尚未实现的消费者生效，配置明确记录 `admission=interfaces_only, delivered=false`。

## 格式与单位

代码在 `agent/src/v6/`，不增加依赖。`schema.ts` 是严格 JSON 校验器：不转换类型、不补默认值、不接受未知字段或原型键，限制字符串/数组/深度/大小；各导出校验返回 `{ok,value}` 或 `{ok:false,issues}`，不改输入。固定例子均为 TEST/FIXTURE 标识，不是游戏知识。

| 格式 / 入口（formats.ts） | 合同 |
|---|---|
| direction-weights-v1 / validateDirectionWeights | 完整角色方向目录、概率 [0,1] 且总和 1±0.01；覆盖列表只接受对应方向已有组件或本局已出现牌；药水 ID/类别必须在调用方目录中；路线交给原题校验回调，休息 heal/smith/auto，复查层严格大于当前层；reason≤500 字符 |
| potion-direction-v1 / validatePotionDirection | potion、must/prefer/normal/avoid、可选 current_boss/joint/elite 目标、简短 reason |
| projection-entry-v1 / validateProjectionEntry | 选项×方向×目标；win、paired_delta、输局 Boss 剩血、赢局己方剩血、回合、连战胜率/差、take/skip 可得率、加权本幕/连战差、牌组张数差、核心首次打出回合、五档枚举、方向角色、可信度、reflex_ids；未知是 null/unknown，不能省成 0 |
| reflex-entry-v1 / validateReflexEntry | id/version、五种 applies_to、受限 predicate、hp/win/tag signal、≤12 英文词 label、证据局/层/可选回合与支持/反对计数、confidence、角色与进阶范围、可选 directions、非空 source_experience |
| reflex-vocab-v1 / validateReflexVocab | 角色与五个固定维度 enemy_threat/card_role/line_tempo/resource_cost/potion_category；成员 id、短英文标签、证据；不填写任何真实分类 |
| direction-card-v1 / validateDirectionCard | id/name/status/scope；core 保留模板 requirements 的 id/any/card或relic/upgraded/count/distinct 并加证据；support/conflict；act1_end/act2_end/pre_f48 组件数量/优先级/升级删牌序；matchups 实际胜负与独立局号、可空投影和可信度；pivot_signals、failure_modes、正反证据与 confidence |

概率及胜率统一用 **0–1 的比例**，配对差用 −1–1；题面百分比转换留给消费者。估计值带 `{value,se,n}`，配对差带 `{mean,se,n}`，n≥1；回合单独使用回合单位。hp signal 用血量点数，win signal 用 probability，tag 用 label。投影档位的实际计算属于 W3，本次只校验枚举及未知一致性，不拿未完成的阈值计算冒充已交付。

方向卡 matchups 的 wins+losses 必须等于不重复的 runs 长度；这些是该条目明示口径，不能把 SL 尝试混成独立局。首试/含 SL 的证据与更细分母由 W2 学习者和正式化任务给出，W1 不推断。

## Predicate 公布的 DTO

`predicate.ts` 导出 PREDICATE_FIELDS、validatePredicate、evaluatePredicate、matchesPredicate。可引用：

- enemy.intent_type、enemy.hits、enemy.total_damage；enemy.powers.<安全ID>。
- player.hp、player.block、player.energy；player.powers.<安全ID>。
- option.turn.damage/block/hp_loss/energy_left/cards_drawn。
- card.tags、potion.tags；act、floor；direction_weights.<安全ID>。

只允许 and/or/not、exists、eq/ne/lt/lte/gt/gte，tags 另允许 contains。数字比较要求有限数字，字符串只接受 eq/ne，tags 只接受 contains。最多 128 节点、12 层，and/or 每组 1–32 个参数；动态 ID 拒绝 __proto__/prototype/constructor，不走原型链。不解析代码或任意原始 mod 路径。

求值返回 true/false/null；缺失或类型错误比较为 null，not(null) 仍是 null；exists 为显式存在判断。matchesPredicate 只有 true 才命中。白名单是消费者需构造的 DTO 合同，原始状态到 DTO 的映射留待对应 W3–W8，不能从白名单存在推断已有消费。

## 开关与 run-config

`config.ts:v6Config(env)` 不改变全局配置；所有新消费者默认关闭。只有 V6_BUILD 非 off 时，`eye/run-config.ts` 在原 run-config.jsonl 行及 config_sha 中加入 v6；off 时不增加字段，不改变原哈希。

| 环境项 | 默认值 |
|---|---|
| V6_BUILD / V6_REFLEX | off / off（各允许 off, shadow, on） |
| V6_CARD_DECIDER / V6_POTION_DECIDER / V6_SHOP_DECIDER / V6_REST_DECIDER | brain（另可请求 jev） |
| V6_SAMPLES_PICK / V6_SAMPLES_ACT / V6_DIRECTION_MIN_WEIGHT | 20 / 100 / 0.10 |
| V6_WIN_CERTAIN_WIN / V6_WIN_FAVORED / V6_WIN_EVEN / V6_WIN_UNFAVORED | .95 / .70 / .30 / .05 |
| V6_DELTA_MUCH_SE / V6_DELTA_BETTER_SE / V6_DELTA_MUCH_MIN | 2 / 1 / .05 |
| V6_T1_CORE_MIN / V6_T2_SE / V6_T2_MIN_DELTA / V6_T2_CONSECUTIVE / V6_T3_WEIGHT_MAX | .30 / 2 / .05 / 2 / .20 |
| V6_T6_UNKNOWN_MAX / V6_T6_FALLBACKS | .50 / 2 |
| V6_BRAIN_SOFT_CAP / V6_BRAIN_MS / V6_ACT_MS / V6_PICK_MS / V6_JEV_MS | 15 / 90000 / 60000 / 5000 / 1000 |

T3 复用 T2 差值门槛；T4 读方向卡要求/转向信号；T5 沿用现有路线危险线；T7 取通过校验的大脑复查层，不造第二套阈值。非法模式/非有限数字/范围/整数/次序错误回默认值，invalid 仅记录项名，不写原始环境内容。W1 不设置任何线上环境开关。

## 角色加载与日志骨架

`knowledge.ts:loadV6Knowledge(knowledgeDir, character)` 必须显式给角色，不读全局默认角色、不缓存、没有其他角色或 common 回退。读取：

- characters/<角色>/direction-cards.json：`{schema:"direction-cards-v1",character,entries:[direction-card-v1...]}`。
- characters/<角色>/reflex-vocab.json：单个 reflex-vocab-v1。
- characters/<角色>/reflex.json：`{schema:"reflex-file-v1",character,entries:[reflex-entry-v1...]}`。

结果 loaded/missing/invalid 分开，缺文件明确“无此知识”；无有效角色拒绝加载。校验文件角色、条目 scope、重复 ID、reflex 方向/标签引用；文件与角色目录不允许符号链接跳到其他角色，JSON 文件≤8MiB。不会创建或修补知识文件。正式格式消费者和学习者 CLI 入口是后续工作，不在本包。

`log.ts:V6BuildLog` 默认路径 logs/v6-build.jsonl，懒创建；off 时连目录也不创建。行格式 v6-build-log-v1：时间、局/角色/题 ID、题型、shadow/on、投影条目、Jev 答案（可空）、兜底（可空）、耗时、缓存命中/未命中、降级、未知计数、触发/合并/跳过。严格字段与模式/计数/未知校验，限制行大小，拒绝明显凭据形态；写失败返回状态，不改变动作。W1 没有题目调用此日志；真实每题写入在 W3–W8 接入。

## 停点

W0 未改游戏知识或模拟数值；H2 原始模拟败局与实际胜局的差异仍需学习者对回合核证，详见 W0 报告。W1 无 Roy 决策阻塞。W2/W3 等待 Claude 新指派。STOP 保留、live 不重建、Regent 不恢复，原中断校准不续跑。9.1 的一次性学习独立运行，草稿不能称正式入库或消费者已读回。
