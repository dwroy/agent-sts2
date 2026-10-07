# 经验与代码提案闭环（Roy 2026-10-07）

出牌、药水、SL、终局价值经验必须同时有代码提案；结构审计的不一致也要有提案。此要求适用于新任务，旧批次原产出和历史保留，不倒记成功或自动回退。提案由学习者从本角色对局核实；调度器只派发、验链接和保存状态。

提案 Markdown 放任务 scratch（完整历史保留）。至少写角色/已观察进阶、证据局号/层/回合、账本 id、反例、旧规则/新行为、拟合方法与样本/时间切分、缺数据、验证/预期影响、回退、来源任务及实现任务。涉及规则更改可引用既有授权 `Roy-2026-10-07-learning`，不把授权当成游戏事实。证据不足写限制、保留原行为。

先用 `learner/ledger.py add/update` 记学习账本，随后准备一个 JSON 对象：

```json
{"character":"silent","ledger":["silent-NNNN"],"runs":["ABCDEFGHIJKL"],"source_task":"experience-update","target_task":"strategy-proposal","domains":["combat","potion","sl","terminal"],"summary":"学习者自己的具体提案","proposal":"/项目/learner/runs/任务/proposal.md","experience":["经验条目id"],"rule_changes":true,"authorization":"Roy-2026-10-07-learning"}
```

只填实际涉及的 domains；结构审计用 `structure`，经验更新必须带关联 experience ids。执行 `python3 <project_root>/learner/code_proposals.py add --character <角色> < proposal-item.json`。CLI 校验角色局号与账本来源、保存 Markdown 路径/指纹，在账本追加提案和任务链接；队列 `paper/materials/learning/code-proposals.jsonl` 只由这个 CLI/机械调度追加，不手改、不覆盖。写入范围是本流程明确授权的专用记录例外。

同一提案重复登记去重。已在 live 实现的提案可加 `implemented_commit`，CLI 必须验证它是实际 live 祖先才登记 implemented；该队列状态不代替学习账本的 shipped，仍由运维核实际版本。其他提案 pending，调度器在普通策略工作树空闲时自动派 strategy-proposal，关联 batch/证据/账本；不把游戏规则误派成纯基础设施 bug。

经验提交前保存 before.json，并运行 `python3 <project_root>/learner/code_proposals.py check-experience --character <角色> --before before.json --after <worktree>/knowledge/characters/<角色>/experience.json`，退出0。新/变更的相关 active 条目必须有自己的提案链接；这是机械内容分类与追溯检查，不替学习者判断机制。完成事件还会核实际 source commit 的前后经验，不只信回报。没有提案链的产出保留并派独立学习者补链；不静默判成功，也不让运维补游戏知识。

所有相关任务最终 JSON 加 `code_proposals`（CLI id列表）与 `implementation_domains`；不涉及这些领域可以为空。消费队列的策略任务还要给每个派来的id一个 `proposal_results`：`implemented`（实际live源码commit）、`duplicate`（已有实际live实现commit）、`waiting`（具体证据不足/待新局原因）。任务先查当前 batch 的 `proposal_ids` / `proposal_repair`，逐项处理。未改源码可保存报告并回报 `fixes=[]`、`merged=null`、完整40位base；机械核工作树未变后正常记处置，**不冒造合入或版本**。waiting保留，新增本角色完局后重派；失败/丢失保存原日志、冷却重试，三次耗尽待运维续派。补链任务也保存请求和重试，不靠再写一次已有复盘。

规则变更实际上线后先 `date`，项目根目录 `notes/for-dai.md` 与 `ops/inbox-dev.md` 同时追加通知 Roy，逐项旧规则、新规则、证据/账本/任务、预期影响、回退方法。自测/上线按原 live 流程，gitleaks、原沙箱入口、合前知识刷新/预检、合后测试和唯一版本均保持。无关角色行为保持等价，不改运维 prompt，不推送、不运行 play。
