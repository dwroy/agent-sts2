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
