# 静默 A10 候选执行审计

`audit-selection.ts` 是离线工具，不接游戏、不读知识库、不改在线策略。依据 MTQ0EUBJ3R6T F11T1/F23T3、KFRDELW2TH2P F12T1/F33T6，关联原回答、护栏或 SL 后的候选、动作接口回执与后续选牌/重问。账本 silent-0125、silent-0079、silent-0418；原提案 silent-proposal-f54e8de2381c1250、silent-proposal-f915ec544ab94b6e。

输入是一个冻结 JSON 对象：`run` 为已从 runs.jsonl 核实的本局记录，`decisions` 为该局按 observed_ts 排列、具有唯一 decision_id 的动作记录数组，`states` 为该局的原始状态记录数组。只接受 silent A10；所有记录必须属于同一局。可以保留 `_line` 和 `_source_sha256` 追溯原日志。路线变更等没有 decision_id 的元数据行须在准备输入时单独记录排除原因；工具不会静默跳过。

在项目根目录运行，输入和输出均应放任务 scratch：

```sh
export PATH="$HOME/.local/node/bin:$PATH"
nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs \
  learner/audit-selection.ts <冻结输入.json> > <审计输出.json>
```

每个战斗选线问题生成一个 segment，保持原 decision_id。后续同层、同回合、同 SL 尝试/重载次数的动作分别记录；新问题、跨回合/房间/尝试和结束回合请求都是明确边界。选牌事件另列。状态仅在 observed_ts 和 fingerprint 唯一匹配，且层、回合、屏幕一致时关联；缺失、重复或不一致均留空。

`predicted_final_rollout_best` 只比较同一道题里有推演且文字唯一匹配的最终候选，保留全部并列 best；没有这些条件则为 null。SL replacement 优先于可能仍记录原线的旧 journal。原 `rollout_best_chosen` 原样保留。候选 facts 包含原题中的毒、持续增益及推演文本，不解析自然语言来补造数值。

`completed_response` 是单动作接口回执，`queued_unconfirmed` 不证明动作效果。`actual_full_candidate_result` 与 `actual_rollout_best` 均为 null：这个工具提供追溯链，不认证整个候选已经完整执行，也不把整轮净扣归给某个中途被重问替换的候选。没有调整护栏、SL排序、药水持有价或终局规则；其他角色不进入此审计。

`observed_intervals` 按全部输入决策列出相邻观测区间，包含手牌、玩家能力、敌人当前及最大HP和能力的原帧快照。依据 YF0LXT1QSTGG A10 F48 T3—T5（silent-0021/0027/0028/0085；原提案 silent-proposal-a46bdb7fe711d79a），可分别查看手里持有毒雾、触媒实际建2但敌人零毒、阶段HP从4变212、以及敏捷5变6时既有23挡不变。它不从卡名推机制，不合计跨阶段伤害，不把敌人index当跨帧实体身份。

连接后帧要求 `_line` 为相邻原始决策行号、同层同SL尝试/重载次数、观测时间严格递增、两端状态唯一且一致匹配；跨轮只接受结束回合请求后的下一轮。新问题、选牌、下一轮分别标边界；缺行、跨尝试、时间或状态不明时 `after=null` 并列原因。行号应保留原日志位置，不能对过滤后的数组重新编号。相邻已落盘决策也不能排除未落盘动作，`actual_action_effect` 始终为null；pending回执和完整候选执行仍保持原来的未知结论。这是离线审计增量，未证明自然采用、最优选线或胜率提升。

`actions[].observed_interval` 依据 8JRE1C4H4Z2W F33 T1/T2/T4/T5 的原帧补充连续决策间观测（silent-0021、silent-0079、silent-0125；原提案 silent-proposal-e5b87be50f28f311）。只有原始决策 `_line` 连续、层与 SL 尝试/重载均已知且一致、两个状态各自唯一匹配、观测时间递增，才记录后端点、玩家净 HP 差和能力列表变化。允许同回合的选牌/重问，或结束回合后的下一回合；其余边界为 unknown。准备输入时必须保留真实原日志行号，不为过滤后的数组重新编号。

能力列表中“未列出”用 null 表示，不伪造零层；缺列表或重复能力 ID 不作比较。敌方只对名单不变且类型各唯一的端点记录 HP/能力变化，索引变化保留前后值；同类重复、召唤或减员时敌方比较留空。`enemy_id` 不是稳定实例 ID，唯一类型比较也不保证中间没有替换。后端点可能属于重问的新候选，观测区间不跨过去执行它。

这些是观测净变化，不是卡牌因果、完整入伤或候选收益；pending/拒绝回执原样保留，`causal_action_result`、`full_candidate_result` 始终 null。末局缺少匹配的下一决策或终态战斗端点时保持 unknown，不能补造死亡截断前的完整伤害。本增量不等于原宽提案全部完成，不校准策略阈值，也不接在线选择器。

依据 GXNKW8X1XYJP F45 第二/末次 T2—T3（silent-0019/0079；原提案 silent-proposal-5a95725089f53cd8），动作端点现保留原帧 `run.potions`，没有药栏时为 null。连续、同尝试且可核的观测区间另列 `potion_slot_changes`：只有两端都提供完整、唯一且一致的槽索引/占用状态，才记录同槽药物 ID 的变化；缺槽、重复槽或占用与 ID 矛盾时为 null。药物未变化时为空数组。

F45 T2结束到T3的精灵槽1由有药变空，下一轮分别3/13血、0/7挡；其原帧 usage=Automatic 单独保留，不改记主动喝药。末次T3 `use_potion` 槽0的毒药请求、期望身份和后帧空槽另列在 `logged_potion_request`。这只是已记录请求与观测，pending/拒绝/身份不符不变成已验证生效。变化来源始终 null；原字段不认证逐击复活顺序、完整入伤或整条候选。跨 SL 尝试/缺原行的区间保持 unknown，不能把恢复药栏记作新获。此增量是原提案的药槽观测子项，路线/休息、逐击复活来源、完整候选归属与整战反事实仍待验证。

`observed_actions` 保留全部输入决策的动作与观测，包括没有 `plan-choice` 的代码结束回合。依据 8JRE1C4H4Z2W F33 第六次 T11（decisions 270441→270442、states 276433→276434；silent-0079、silent-0021），`terminal_observation` 专门关联结束回合后尝试号变空的 `run/finalize`。要求原始决策和状态行号各自连续、结束回合回执 completed、同局同层同回合和相同已知重载次数、唯一状态匹配、结束时间等于已核 runs 记录且该局失败、前帧 COMBAT 正血与后帧 GAME_OVER 零血。普通观测区间的尝试号检查保持原样；缺任一条件留 unknown。

该终局端点实际玩家 5→0，敌人 154→130；结算前显示攻击37、当前挡22，其差15仅放 `displayed_attack_reference`。它不把零血截断的实扣5冒充完整入伤，也不把显示算式15冒充已观测伤害。缺意图总伤字段时算式留空；敌人同名单、唯一类型、相同最大血时才比较HP端点，索引变化另列，不认证实例身份；结束页清理能力不当作能力到期。`actual_uncapped_damage`、`causal_action_result`、`full_candidate_result` 始终为 null。本子项只补终局审计，原提案其他范围和策略效果仍须独立验收。

`observed_turns` 根据 9Z9H2EXKLF3T A10 F48 第二/三试 T7—T10 汇总同层、同轮、同尝试的全部已记录动作与重问（原提案 silent-proposal-8f62129d7da70b94；账本 silent-0079、silent-0021）。窗口开始须有连续原决策与匹配状态证明前轮结束到本轮开场，结束须有本轮结束请求至下轮或已核终态端点。任一中间决策缺行、跨尝试或状态匹配不唯一时整轮结果留 unknown；输入首行不冒认回合开场。敌人净HP只在全部决策端点的名单、唯一类型和最大HP一致时比较。

该局 T7 两试开场玩家均20、敌393，下一轮分别玩家9/11、敌344/322，窗口净变化为玩家−11/−9、敌−49/−71。原单题/SL预测8/15血价和42/58输出留在对应题目，不能替换成整轮实值。T10保留开场题预测余血16、下一步重问 least-loss 的原文本余血−9和实际18→3，不将不同题目的预测拼成同一候选误差。

连续原始状态路径可单列中间HP与药栏快照；第三试 T8实际11→0→20、整轮净+9，敌322→269。恢复20和净变化+9分别呈现，零血不能反推出未截断的完整伤害，也不自动判定某瓶药或某一步的因果。缺中间状态时路径留空，已核端点仍可保留。`actual_uncapped_hp_loss`、`actual_full_candidate_result`、`causal_candidate_result` 始终为null；T11终态结束时间与已核runs不一致仍保持未知。这是离线证据消费者增量；不修改在线动作、SL门槛、游戏规则或经验库，不证明策略收益。
