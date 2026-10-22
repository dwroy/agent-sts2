# #42 策略库外部聚合证据合同

基线 `de9d926cd9fb8b9e3b3daa66756058cf2d2cb133`；开发分支 `issue-42-task`。本次是基础设施候选，交集成员完整检查/合 main、ops 后续发布；未合 main/live，未改 STOP 或大脑选项/决策逻辑。

## 合同与实现

- 保留已有自有策略格式，增加 `external_aggregate` 严格对象；来源、URL、版本、数据集SHA、下载日期、角色/进阶/筛选、统计量、分母、observational、局限与许可必填，区间可选。外部 run/floor 一律拒绝，包含伪造局号和 floor=0。策略自有局号须12位大写字母/数字、floor≥1；原账本自有 floor 可选等历史行为保持。
- 单来源 source 为 own 或 external:名称，多来源为 mixed；明确 aligned/conflict/unassessed。反证强制 conflict，追加更新按折叠后的全部证据检查，保留双方；只有外部支持（自有仅反证也算）confidence≤0.49。有自有支持只是允许更高赋值，不自动提级。
- `learner/ledger.py` 支持 add/update/show/find/check；纯外部不填写 first_run/asc/prior_runs。自有独立局与外部分母分列，不把外部计入本系统验证/repeat。策略 TS 校验、JSON Schema 与账本 Python 合同同步；源码说明需要人工识别语义冲突。
- 兼容题面和生产 `kb_strategies` 都使用真实检索结果，显示来源、独立分母与局限。含外部条目派生 summary，覆盖输入中的同名元数据，不叠加可能重叠的外部分母。旧正式自有策略检索后的 JSON 字节一致；铁甲角色读取路径不变。
- 协议第9节、策略说明、账本说明及实际 #27 学习任务模板同步。没有向正式策略库、经验库或真实学习账本加入游戏建议。

## #24 固定示例贯通

`agent/tests/external-strategy-data/external-strategy.json` 为非生产格式示例，直接引用已有 `knowledge/external/sts2fun/silent-a10.json` 中 v0.111、act=1、skip 表：1456/13307，rate=0.10941609679116254，原 player-cluster 区间。示例仅描述原统计，不推导拿牌/跳过建议。输入文件 SHA256：`88eef1cd8b875ab27d47c3abc39335f271705672b53bd71a0f4b30286168ac07`；数据集SHA、下载日期、筛选与许可保留原件口径，无在线抓取。

独立临时账本 add→show→去掉账本 added 审计字段→parse→真实 retrieve/apply→userMessage 及实际 ToolHost/kb_strategies 均通过。`e2e.json` 与 `prompt.txt` 是实际输出，ledger ID 仅临时夹具，不是真实学习登记。自有验证0局，外部分母13307个奖励屏幕；最终题面策略块1966字节≤4096。固定不匹配与铁甲隔离通过。不代表 live 自然命中、采用或收益，不关闭 #27 学习父要求。

## 定向验证

所有执行以 nice 19 串行进行；Vitest 使用 threads、1 worker、no-file-parallelism，外部 Python CLI 测试单独执行以控制进程数。未运行完整 Vitest，完整检查由集成员接续。未安装依赖。

| 检查 | 命令（仓库根或注明 agent/） | 结果/原件 |
| --- | --- | --- |
| 生产类型 | `nice -n 19 node agent/node_modules/typescript/bin/tsc -p agent/tsconfig.json --noEmit` | exit 0，tsc.out（成功无输出） |
| 策略合同/预算/兼容/贯通 | agent/：`nice -n 19 node node_modules/vitest/vitest.mjs run tests/strategy-entries.test.ts tests/external-strategy-evidence.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism` | 2文件48通过，vitest-final.out |
| 元数据与生产工具回归 | agent/：同上入口，文件 `learning-ledger-metadata.test.ts brain-agent-mode.test.ts`，按元数据更正/工具选择器两个名称过滤（精确命令见 checks.json） | 2通过/14按名称过滤，metadata-tools.out |
| 新外部账本CLI | `nice -n 19 python3 agent/tests/external_strategy_ledger_test.py` | 3通过，python-external.out |
| 原账本/学习曲线 | `nice -n 19 python3 agent/tests/learning_ledger_test.py` | 4通过，python-ledger-regression.out |

测试覆盖每个必填字段、错误类型、伪造run/floor、纯外部可信度越限、混合分账、反证不能解锁高可信或伪装一致、追加后保留冲突、不把外部填成 first_run/asc、原自有库字节不变、无区间未知。共享合同测试样本同时供 TS 与 Python 使用；策略 source 一致性/自有必须正楼层属于策略规则，原账本自有可选楼层规则不迁移。开发期间原夹具和断言失败保留在 development-notes.md 与 vitest-first-failure.out，未抹除。

## 接续与回退

集成员需核候选、完整 tsc+Vitest 及上述独立 Python 测试，再按现有流程合 main。ops 发布前按原锁核 live 知识刷新，分配实际行为版本；本候选不分配 release_id。#27 第二批应在本合同实际合入后沿原 owner 派发并自行提炼内容。

若部署后需回退，应同时回退本合同源码并保留/撤回后续新增的外部策略发布叶子；不能只换旧校验器让整库失效。真实账本追加历史保留，用 CLI 追加更正，不重写历史。本工作树仍活动且未实际 main/live 发布，不登记 complete 或自行回收。
