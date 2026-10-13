## 复盘回报

- 已追加：DWW8GX3UQCQM（A10，第33层，沙虫 THE_INSATIABLE 沙坑归零阵亡，末敌仍18血）。
- 新的纯 bug：无；复现已有项：
  - DWW8GX3UQCQM：单动作末题漏报沙坑截止 — .worktrees/live/agent/src/reflex/combat.ts:100（fix-queue-v4已有，silent-0308）。
- 写成「未记录」的项：DWW8GX3UQCQM：完整dirty运行树、部分归零帧／多卵内部杀序、完整候选执行比例、替线／改构筑／用药的受控整战、未饮毒药实量、谋划专家独立收益、初题推演差异根因、有效boss时钟与实打比值、Jev缓存和实付账单。
- 学习账本：DWW8GX3UQCQM：新增无；更新 silent-0005、silent-0006、silent-0018、silent-0020、silent-0027、silent-0064、silent-0265、silent-0308、silent-0352、silent-0445（老错silent-0308）；`ledger.py check`退出码0。
- 代码提案：
  - F33T7／silent-0308、0018：silent-proposal-a234d05e459d0cc0，沙坑题面及末瓶药边界；实现任务strategy-proposal。药水实量与替线胜负缺证，保留未知。
  - F27→F33／silent-0020、0352及关联机制：silent-proposal-23ba365f0febbde4，毒防兑现与跨战资源核证；实现任务strategy-proposal。缺合法替线整战数据，保留现有排序与权重。

```json
{
  "task": "postmortem",
  "appended": [
    "DWW8GX3UQCQM"
  ],
  "skipped": [],
  "bugs": [
    {
      "run": "DWW8GX3UQCQM",
      "where": "agent/src/reflex/combat.ts:100",
      "what": "单动作末题漏接沙坑1截止，把攻击后余2误报为完整回合非致命；silent-0308及fix-queue-v4已有。",
      "new": false
    }
  ],
  "ledger": {
    "added": [],
    "updated": [
      "silent-0005",
      "silent-0006",
      "silent-0018",
      "silent-0020",
      "silent-0027",
      "silent-0064",
      "silent-0265",
      "silent-0308",
      "silent-0352",
      "silent-0445"
    ],
    "repeats": [
      "silent-0308"
    ],
    "check": 0
  },
  "code_proposals": [
    "silent-proposal-a234d05e459d0cc0",
    "silent-proposal-23ba365f0febbde4"
  ],
  "implementation_domains": [
    "combat",
    "potion",
    "sl",
    "terminal"
  ],
  "report": "/home/dw/Projects/agent-sts2/learner/runs/20261013-191302-postmortem/report.md"
}
```
