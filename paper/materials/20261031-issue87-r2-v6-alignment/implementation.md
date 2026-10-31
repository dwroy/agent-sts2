# #87 r2 + 扩大 A 对齐工程交付

按 [87/6544738837](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6544738837) 批准的 A 执行，方案固定 `02f05876`。本次与 r2 合成一个工程 HEAD，原 r1 `70040a92` 固定引用不动。最终合并批 full、ROOT/LIVE 安装、方法准入、例外撤销及自然行为/效果由原集成与 ops/学习者接续，本报告不代其回执。顺序：#87 r1 → #83 r5 → 本次 → #86 A1。

## 交付内容

1. 12 个生产文件逐字节恢复批准的 LIVE blobs，3 个生产模块撤出；[前后 blob 表](blob-table.md)、[完整 SHA256](alignment-byte-check.json)。撤出三模块和两项直接模块测试的原字节，以及调整前的共享测试，全部按 blob/SHA 留在 [历史原件清单](withdrawn-805/manifest.json)，扩展名 .txt，既非生产模块也不再被测试收集。未整个回滚 805；loop/card-pick/construction-safety 与 r1 相同，未夹带超时改动。物理 LIVE 目标字节已只读核同，未修改 LIVE，目标对 LIVE 行为零变化。
2. r2 档案每 Boss 的强制一行加入已正式发布的机制事实，额外已发布事实仅在预算内展示；保留完整原文、触发条件、版本、限定窗口、反证和 digest 在审计与原知识工具里。事实和策略正文消费分账，不扩大策略置信度或曝光额度。固定来源 `K1-0924d4ea26809fc410f7fbbfa0e22ce2b5bf60091686bbefb62db2b7bcf0be30`，strategy document SHA `6f754afa0856ebfdf719a5bea1b101d6ccf2dcf36ae599c45cc854b7f30eb3f1`，详见 [源清单](published-source-manifest.json)。F32 的帝王蟹行同时显示获批的死亡后力量/格挡事实与充能事实；不是开发者补的 Boss 知识。
3. O 分开写首试与含重试：旧 monster-records 没有首试标志时明确 `O首试unknown`；含重试赢数来自原 producer 的 `turns_won.n=len(won)`、分母 `n_outcome_known`，不倒推四舍五入胜率。未来 K1 boss_profile 的首试保留其自身窗口/版本，死亡、预测中止、未知分列；不跨窗相减。当前六行含重试依次 36/54、43/54、40/57、20/44、13/37、9/37。详见 [计数合同](o-counter-contract.json)。
4. 声明按真实依赖重算，移除三文件及其入边；保留入口、工具链固定根与原动态 IO 合同，校准仍 fingerprint 整个 agent/src 及原 boss-sim 工具族。补全已有四个实际读取叶在校准入口的直接 read-family 边（它们原本已是传递节点，没有新增读取或扩范围），没有改校验器来放过缺叶。工程声明不是生产准入票。

## 闭包重算

| 方法 | main159c 节点 | r1 节点 | 扩大前 r2 节点 | 本次节点 | 本树工程方法 SHA256 |
| --- | --- | --- | --- | --- | --- |
| v6-history | 306 | 311 | 311 | 308 | `dcf84f0c2230500cae60d8d5877f7380f7ef779602ed492a4d820a67785d932c` |
| silent-boss-calibration | 400 | 405 | 405 | 402 | `e3b6ee7780407f772ab07a4cfeb4da1ca3939ac1900090f58a273aaa045a06aa` |

两个方法都相对 r1 减少三生产节点；相对 main 净加二，是 r1 的五新增节点与本次撤三的组合。其他 11 producer 的方法身份与 main 相同。前后输入、边、contract、方法 SHA 和新增/删除/变化节点完整见 [closure-recalculation.json](closure-recalculation.json)，生成核查脚本原件 [rebuild-closures.py.txt](rebuild-closures.py.txt)。v6-history 的实际入口/动态合同未缩小；Silent 校准 read family 据真实源码撤三、对既有读取补直接边。

#77 的 validation 改动随 main159c 保留，未回滚；由其部署回执核实际 LIVE。#83 r5 的 rollout 两叶及任何其他先行采用差量，由集成员归并到适用组合并重新计算声明，不能用本树方法 SHA 覆盖先行发布的新字节、复用旧票或套五项例外放过其他失败。

## 三题完整前后题面

以下为原 F1/F32/F35 输入通过真实消息、任务和 schema 构造器生成的完整六份题面，零模型/游戏调用。前像为改造前的原始历史完整题面；后像是 r2 本次题面。r1 完整 after 原件继续在 `70040a92:paper/materials/20261031-issue87-boss-target-implementation/full-prompts-final/`，可对 r1→r2 另行逐字比较；本次不是在历史上已发送新知识的声明。

| 原题 | 完整 before | 完整 after | 档案 B | 整题增量 B | warm p95 ms |
| --- | --- | --- | --- | --- | --- |
| F1 / 48LJUVW34AHT | [before](full-prompts-final/opening.before.json) | [after](full-prompts-final/opening.after.json) | 1492 | 2031 | 0.269 |
| F32 / TBFLR466YFJG | [before](full-prompts-final/act2_before_boss.before.json) | [after](full-prompts-final/act2_before_boss.after.json) | 1492 | 2013 | 0.302 |
| F35 / 8CHJ5W30Q7Z8 | [before](full-prompts-final/act3_revealed.before.json) | [after](full-prompts-final/act3_revealed.after.json) | 1482 | 1996 | 0.480 |

每题 100 次温投影，档案 ≤1500 B；原系统短 SHA/长度、选项、memory、tools 保持冻结，模拟事实除已批准的 S 目标字段外一致。完整 [report.json](full-prompts-final/report.json) 保留事实原文、触发范围、O 两口径及各自版本。六份最终消息与扩大修改前相同字节，见 [prompt-byte-identity.json](prompt-byte-identity.json)；耗时字段另记。固定投影耗时不代生产决策延迟或自然收益。

## 检查及保留的失败记录

- 生产 tsc、报告 CLI+learner 的隔离 tsc 均通过；34 文件 387 项定向 Vitest 全通过，nice19、单 worker、无文件并发；相对导入检查通过。
- 固定 producer 全 24 项通过：13 个真实闭包及哈希、静态边、opaque、校准新增读取、ROOT 校验器隔离、缺叶拒绝等原门保持。
- brain 的 off/shadow/on×shop/rest 6 固定探针：options null、无 v6Room、prepare 同对象早退、provider 调用 0；jev/on 正对照 gate 可开。不是生产 trace，也不把 admission 常量当禁用门。
- 旧断言第一轮 19 失败与补充消费者 2 失败保留，修正的是本次已撤接口/未部署合同；未改 12 个目标源字节、未扩测试排除，#19 等后来独立修正保留。一次从根目录启动导致 child tsx 找不到，保留原环境失败并从 agent/ 原依赖目录复验通过，无安装。
- r1 原 full 的 6118/6119、rc1 不改写；唯一 sparse issue29 fixture 缺失已恢复 `b84d95c5185941eec143cbcf2966d5770309cca5` 原字节（完整 blob 以 validation/fixture 记录为准），本轮再次核同并通过实际导入检查。扩大前 r2 定向 8 文件 136 过也保留为基线。**最终 full 使用主管指定的合并批组合检查，不另起本单 full。**

[validation.json](validation.json) 列全部检查、来源与 SHA；[checks/](checks/) 保留通过和必要失败日志。没有执行 play、修改 live/STOP/共享配置、改变分号、关闭其他会话或清理研究。

## 集成交接与尚待回执

集成员交付前必须对当时 main→最终规范候选做完整映射、runtime 不越差量、cold ≤4MiB 三项原门预检，并核与 #83 r5 两 rollout 叶、#86 A1 的交集。生产候选的本次精确范围为上述 15 叶加 r2 两叶 `brain/boss-dossier.ts`、`knowledge/boss-planning-data.ts`；三撤出路径在 LIVE 已不存在，须作为 ROOT-only 撤出，不把不存在路径列入 LIVE 安装列表。运行声明 `ops/fixed-producer-dependencies.json` 做语义归并，材料/测试/报告归 ROOT。

本树还包含原 r1 与 main159c 已批准内容，不能把它们误计成 r2 的新增 runtime 范围。规范化后以实际安装图和真实完整差量为准，所有登记随该规范 HEAD 采用，不手动 tick/submit/full。工程候选交集成员预检后再发最终 issue/inbox 回执；归并改变适用字节时新 HEAD/方法与相应组合检查另核，不借用本树票。

五项窄例外仍保留，需实际合入部署后 ops 方法门无需例外的完整回执，再由主管明确撤销；本报告不宣称已撤销或已生产采用。10 局行为与 30 局首试科学父项继续开放。
