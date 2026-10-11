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
