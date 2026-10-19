# W7 商店/休息统一摘要复验

2026-10-20。本轮复用共用摘要及限额函数，没有另做 W7 摘要。商店/休息 Jev 保持未启用；只有本地固定题构造，没有模型请求、游戏动作、密钥读取或正式知识修改。ops 的真实请求烟测与启用另行处理。

## 当前结果

独立工作树 `.worktrees/v6-w7-prompt-budget-20261020` 首次变基到 main `e208023e3dcfeafffb4cc8ae2bff0ddb674751c3`，随后在 `791923bdba29b7d8ffce806c3c9cd17bf5aebd8d` 通过完整检查，合入前再变基到 `ee90bb8224e791b87587f13a5d0891377d07f705`。后一次变化仅含记录、台账和论文数据，agent/learner/eval/knowledge 的 Git 树完全相同，ops 仅收件箱 Markdown 变化；新增测试 SHA 也未变。基线包含 `a29c9f48e` 的未知原因与 `c6f77ba1b` 的逐项最小详情修复。W7 生产入口 `agent/src/hand/screens/v6-room.ts` 已在上游接入 `compactCombo`、`boundedV6Jev` 和 `promptBudgetLabels`，本轮只增加回归测试、严格测量与交付材料。

测量为 UTF-8 紧凑 JSON，调用参数口径 `{model:"typesafe/jev-1.14",state,questions}`；不包含 SDK 的传输封装。

| 题型 | 选项详情 | state 字节 | 完整调用参数字节 | 完整投影审计条目 |
| --- | ---: | ---: | ---: | ---: |
| 商店 | 28/28 | 21,118 | 22,617 | 952/952 |
| 休息 | 7/7 | 7,575 | 8,053 | 238/238 |
| shop：合成已知/未知混合 | 28/28 | 20,449 | 21,948 | 952/952 |
| rest：合成已知/未知混合 | 7/7 | 7,672 | 8,150 | 238/238 |

state 上限 **22,000 字节**，完整调用参数上限 **24,000 字节**，两题均通过。每项均校验事实/身份、组合/方向/目标身份、加权连战与当前 Boss 的比较、可得性、Wk/W0 状态和未知原因。没有被置空的选项，也没有用 0 填补未知比较。前两行无投影表，比较值、已知质量和可得性均为未知；未把历史指标当作当前胜率。另两行向同一库存固定题注入格式专用的合成投影表：已知比较保留 mean/se/n 和档位，最后一项的部分目标质量保持 0.25、delta 为 null，未重新归一化或补零。合成值不是对游戏结果的估计。共用函数的已知/未知混合比较测试一并执行。

题面只含精简指标。17 个组合的完整 metrics 仍在审计数据中，回归测试逐份读回内容寻址快照并核 SHA256。完整选项、后续删牌/升级、休息药水槽位回答与合法兜底保持可用。

原始未限额题面的调用参数为商店 7,860,812 字节、休息 7,239,392 字节，原结果已复制保存在 `size-original-unbounded.json`。首次限额后 17 项商店详情丢失的阻塞报告保存在 `blocked-report-de52.md`，相应测量及中断日志不改写。最终变基后的结果见 `size-integration.json` 和 `size-integration-mixed.json`，与前次 `size-final.json`、`size-final-mixed.json` 一致；每个选项的布尔校验与库存、源码、知识文件 SHA 可追溯。

## 测量边界

使用历史 Ironclad A9 库存固定题，仅在测量进程内把角色/进阶改为 Silent A10 以加载正式 17 组合文件。不是自然 Silent 房间的线上测量；未知组未提供投影表，混合组仅注入合成投影表；均不使用生产投影表，不声明 Nova 接受或投影效果。正式 `build-cores.json` 为 7,903,933 字节，SHA256 `377920574ce7859f5e39dd01aad495947140226777e742251ac850004ae0cbe6`。源码与输入 SHA 在测量前后未变。

重跑（工作树根目录）：

```sh
PATH="$HOME/.local/node/bin:$PATH" nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs paper/materials/2026-10-20-v6-w7-prompt-budget/measure.mjs . paper/materials/2026-10-20-v6-w7-prompt-budget/size-user-rerun.json
```

脚本禁止 fetch，逐项详情、28 项数量、合法键或体积检查失败即非零退出。开关只对该进程设置。相同命令末尾增加 `mixed` 可重跑混合比较组；使用新的输出文件名，脚本拒绝覆盖既有测量。

## 检查

- 类型检查 `npx tsc -p tsconfig.json --noEmit`：两次均 exit 0，见 `tsc-c6f77ba.log`、变基后的 `tsc-recheck.log`。
- 定向测试 3 文件 / 51 项通过，见 `targeted-c6f77ba-2.log`；含五角色关闭开关时题面/动作字节等价、生产工厂、超时/取消、真实 17 组合与 28 项混合比较合同，以及新增完整审计/后续动作测试。
- 首次完整 vitest：593 文件通过、1 文件失败；5,690 项通过、1 项失败、2 项跳过，exit 1，见 `vitest-c6f77ba.log`。唯一失败是原有 `ops-autoplay-console.test.ts:116` 没在退出前尾随到 `next run decision`。该文件随后单独复验 7/7 通过（`ops-console-recheck.log`）。保留原始失败，不把单独通过算作全量通过。
- 第二次完整 vitest：**594 文件、5,691 项通过、2 项既有跳过，exit 0**，见 `vitest-full-recheck.log`，耗时 1,317.21 秒；命令为 `nice -n 19 npx vitest run --maxWorkers=1`。期间未修改执行代码或测试。
- gitleaks 8.30.1：新增测试及当前材料分别扫描，均 exit 0 / 0 泄露，见 `gitleaks-latest-test.json`、`gitleaks-latest-materials.json`；最终暂存差异扫描也为 exit 0 / 0 泄露，见 `gitleaks-staged.json`。原始日志末尾空行按字节保留，不为排版检查改写。

早先断言误差字段必须显式 null 的失败、详情丢失时的中断和临时局部省略实验均保留，不计入最终通过结果。`targeted-c6f77ba.log` 另保留一个超长合成药水名称触发的边界：每个名称重复 2,000 次四字中文时，题面达到 79,104 字节；共用函数的最小事实不递归裁剪此类异常库存名称。本次新增 UTF-8 题目测试改为正常库存名称、长 question.instructions，验证说明文字的受支持裁剪路径，未修改共用生产函数。该异常名称边界不属于本次真实 28 项固定题验收，交共用函数负责人后续跟进。

## 交付与后续

完整检查已通过；此提交用于快进合入 main，提交号在最终回报与 decision-log 登记。此次无新的对局行为，不分配发布号，不修改 live，不开启商店/休息开关。等待 ops 的真实 Jev 请求烟测和 Claude 的启用通知。工作树保留至实际 live 发布回执后，按原调度器流程登记回收，不伪造 live 合入证明。
