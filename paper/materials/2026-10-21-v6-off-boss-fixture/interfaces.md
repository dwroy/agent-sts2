# P4 off 六例：精确运输接口

- Source：`88b51030b906700aa30ea2e8f79eb10be2b623bb`。
- Source tree：`5c97360ba5805d6b0b4e1ffb67f5088e568000ef`。
- 原失败联合 tree：`5628371e35d26465df06514f7f4384c269fd1182`。
- 最小 patch：[checks/minimal-source.patch](checks/minimal-source.patch)，SHA256 `4844612ec3c7b4934cc0170fdcfcb97f3e342ff55f7bfcfc151abcc293b6c70b`。
- 两叶 manifest：[checks/source-manifest.json](checks/source-manifest.json)，SHA256 `1ce2366e320f985e1b169a3bee77898215eca04209a8db85a49e9798c0c4b4c4`。

| 路径 | 前像 SHA256 | 后像 SHA256 |
|---|---|---|
| `agent/tests/v6-off-equivalence.test.ts` | `f5a7988c73513e828740f83bf18ed1e14428182cc671cc0d58a55ca8ce5946f3` | `ab6779c1382b522fd76e1a6c44b61bbfee86918b5d85de028502394123c01a1d` |
| `agent/tests/fixtures/v6-off-boss-clock.json` | 新增 | `5c460f5a0ada2b8f79b03bf7f95201630678fa394a1a4067ff41e78e0602cb07` |

只运输这两叶 patch；父 `6473cbc394069ca026045a8026c8752afd07eb29`、整支、正式知识、生产配置不属于本次交付。fixture 位于已忽略的 fixtures 目录，集成时须显式保留新增叶。

失败联合输入已存在 `knowledge/monster-db.ts` 的 `setMonsterDbForTests` 与 `sim/boss-clock.ts` 的 `setUnblockedSharesForTests`，没有额外生产依赖。原 golden 和断言不动。ordinary-close 仍等待原 014301 正式来源，由 ops 单点协调，不复制实现或带入本补丁。

来源检查为同失败组合上的 tsc0、4 文件 75 例通过、两源 gitleaks0；完整联合检查待 ops，未合 main/live。具体字节、数据来源、动作语义和失败原件见 [报告](report.md)。
