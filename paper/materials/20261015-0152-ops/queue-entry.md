## 2026-10-15 01:58:35 CST 原R348纸鹤整线固定夹具执行成本（普通infra接续，非新游戏研究）

- [ ] **infra-paper-krane-recorded-line-timeout**：原 `20261014-214302-strategy-proposal` source0f86964c8 的 `agent/tests/silent-paper-krane.test.ts` 第77行两固定整线（state399969/400002）在R348/treefe9ed完整宿主唯一失败为各15s超时，其余4735过2skip；原组合35+2及本树正式定向2项均在原时限/断言通过。`fixedInput` 第55行经 `inputFor`/`planCombatTurn` 做完整枚举只为取solveTap输入，再进行原六步 `replaySteps`；这是读到的夹具建立路径，不证明CPU争用单因或生产模型错误。
- 沿既有普通fix-batch队列核验固定输入建立成本/重复求解并作等价工程优化；保两原真实帧/六步结果、旧新HP损失10/19对8/16、伤害/药成本、describePlan/生产接线及全部角色/进阶/未知组合边界断言。不得增加15s时限、删/skip失败项、放松断言或改生产worker/样本/预算/牌值/规则；不热改R3/量化冻结输入或为纸鹤机制另派同题。原full rc1/首轮超时与补验scope均保留，直到实际等价源码、自测、部署及新树验收。回执 `paper/materials/20261015-0152-ops/R348-deployment-acceptance.json`。
