# W7 商店/休息统一摘要接入复验

2026-10-20。本轮仅本地构造题面与固定数据测试，没有模型请求、游戏动作或生产开关修改。商店/休息 Jev 不启用，继续等 Claude 通知。

## 接入与当前停点

- 正式来源 `ee32129ca`，接口 `a91667f46`，交付 `f51168b4e`。该提交已经将 `agent/src/hand/screens/v6-room.ts` 接入共用的 `compactCombo`、`boundedV6Jev`、`promptBudgetLabels`，W7 不重复实现。
- 独立工作树 `.worktrees/v6-w7-prompt-budget-20261020`，已变基到 main `de52e1f2c58bb88f649570cb76083cb29cc52b38`。
- 阻塞：共用限额函数在当前商店固定题中将 **17/28 个选项详情置为 null**，只保留合法键；剩下 11 项才有数值投影。休息 7 项均有详情。体积通过不能视为商店条目完整性通过，不能据此启用。
- 已向 Claude 请求协调共用函数负责人：保留各合法选项的最小事实与比较，再调整可选内容的限额顺序。等待统一接口修复后重测、完整检查与合入。
- 当前没有本轮提交或合入。新增固定测试与测量材料保留；生产源码与正式知识没有本轮修改。

## 同一库存快照、同一正式核心卡数据的体积比较

UTF-8 紧凑 JSON；完整调用参数口径为 `{model:"typesafe/jev-1.14",state,questions}`，不包含 SDK 传输封装。

| 题型 | 旧完整调用参数字节 | 新 state 字节 | 新完整调用参数字节 | 合法选项 | 完整投影审计条目 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 商店 | 7,860,812 | 15,741 | 17,240 | 28/28 键保留；17 项详情 null | 952/952 保留 |
| 休息 | 7,239,392 | 15,110 | 15,588 | 7/7 键与详情保留 | 238/238 保留 |

state 上限 16,000 字节，完整调用参数上限 24,000 字节。两个题面均在上限内，并带 `prompt_budget` 截断计数；商店的部分可比较内容仍丢失，不能称通过字段完整验收。17 个组合的完整 metrics 仍留在审计条目中，题面只使用摘要。无投影表的缺失值继续保持 `null`，没有补零。

数据文件 `knowledge/characters/silent/build-cores.json` 为 7,903,933 字节，SHA256 `377920574ce7859f5e39dd01aad495947140226777e742251ac850004ae0cbe6`，与旧测量相同。旧测量保留在 `.worktrees/v6-w7-20261019/paper/materials/2026-10-20-v6-w7-prompt-audit/`。

限制：这次使用历史 Ironclad A9 库存固定样本，仅在进程内把角色/进阶改为 Silent A10，以加载当前正式核心卡；不是自然 Silent 商店/休息题面，也没有提供生产投影表。`size-option-detail-audit.json` 留有正式 main 基线、源码与库存 SHA、完整字段体积、截断计数与被置空的选项键；`size-before-option-compaction.json` 是同源第一次测量，结果一致。`size-dependency.json` 保留旧依赖结果，不改写。

## 固定数据验证

新增测试不读正式核心卡，临时目录中使用合成 core 和重复的合成证据，覆盖：

- 商店和休息截断后保留全部合法选项，并逐项验证实际 action；删牌、升级的后续选择继续保留。
- 未知胜率、样本和误差保持未知；已知指标保留分母，未测误差不补零。
- 完整审计条目数量、unknown 计数、截断标签不丢失；内容寻址快照 SHA 与完整原指标读回一致。
- 长 UTF-8 药水槽位题保留槽位键；缺失或非法回答走兜底，合法回答只丢弃被选中的实际槽位。

检查：

- `PATH="$HOME/.local/node/bin:$PATH" nice -n 19 npx tsc -p tsconfig.json --noEmit`：exit 0，`tsc-dependency.log`。
- `npx vitest run tests/v6-room-prompt-budget.test.ts tests/v6-room.test.ts tests/v6-prompt-summary.test.ts --maxWorkers=1`：3 文件 / 49 项通过，`targeted-dependency-2.log`。
- 首次定向检查的两项失败来自新增断言把摘要省略的未知 `se` 要求为显式 `null`；断言改为校验未知且不补零，生产代码未改。原失败日志 `targeted-dependency.log` 保留。
- gitleaks 8.30.1：新增测试及材料分别扫描，均 exit 0 / 0 泄露，见 `gitleaks-test.json`、`gitleaks-materials.json`。
- 正式 main 基线的定向检查：3 文件 / 49 项通过，14.57 秒，见 `targeted-main.log`。
- 完整 vitest 在发现详情丢失后中断，exit 130，保留 `vitest-before-option-compaction-interrupted.log`，不称完整检查通过；统一修复后重跑。
- 最终材料 gitleaks 8.30.1 扫描 exit 0 / 0 泄露，见 `gitleaks-main-materials.json`、`gitleaks-main-materials.log`。新增测试沿先前扫描 0 泄露，之后未改。
- 为定位体积瓶颈临时尝试了 W7 投影省略未知可选字段，两次测量 `size-compact-attempt*.json` 仍有选项详情丢失。该临时源码已全部撤回，当前生产源码与 main 一致；这些文件不作为交付结果。

重跑测量（工作树根目录）：

```sh
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs paper/materials/2026-10-20-v6-w7-prompt-budget/measure.mjs . paper/materials/2026-10-20-v6-w7-prompt-budget/size-final.json
```

脚本禁止 `fetch`，只给当前测量进程设置开关，不执行 `play` 或动作，不读取密钥，不修改正式知识。
