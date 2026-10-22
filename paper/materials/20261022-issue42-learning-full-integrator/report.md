# #42 学习侧唯一完整检查通过

2026-10-22T21:47:48+08:00。执行主管 [6341672283](https://github.com/dwroy/agent-sts2/issues/42#issuecomment-6341672283) 与原 ops [6341754443](https://github.com/dwroy/agent-sts2/issues/42#issuecomment-6341754443) 的拆分裁决。源 `2c2d9f1aa8027f59afc1969514a697559419a069`，main 基线 `59cc1bb75eb77e347768139af31e4bac19f99acf`，学习侧受测树 `e6e9b2934d254db429b5e0abbf4643c741000606`。

本轮仅交外部聚合证据类型、账本 CLI/校验、策略检索/题面兼容、schema、协议与 #27 实际任务模板。`agent-knowledge.ts` 保持基线原字节，#42 工具消费者源码与专属断言不在本候选。main 原来已有的 #33/#26 宽源码没有回退，也不据此声明它们已 live。源提交会作为合并父保留，但源祖先关系不等于延期叶已合入；延期工具 patch、源码 blob、原组合测试和断言见 deferred/。

- tsc 退出0；无文件或名称过滤的完整 Vitest 656文件、6218过/2跳/0败，退出0；随后独立外部账本 Python 3例通过，退出0，与桥接测试分账。命令、起止、PID、退出码见 checks.json。nice19、forks 单 worker、无文件并行。
- 2595个枚举输入前后逐项字节/SHA相同，暂存树未变。清单覆盖 driver 列明的代码/测试/配置/知识路径，不宣称整个环境闭包，也未套用 #40 旧 full 复用授权。
- 首轮广树真实完整失败：656文件、6214过/4败/2跳，原件 full-first/。三项桥接是临时账本 fixture 漏复制新增 external_evidence.py；仅补一行复制且保原断言。另一项是稀疏树未展开原有 issue29 固定 JSONL，按 index 原字节展开，无数据改写。失败四文件定向5项通过后才续跑，诊断与日志保留。
- 广树第二轮因新拆分裁决中止，退出143，原件 full-second/ 与 full-second-cancellation.json；首个学习树检查又因发布依赖预检发现 #24 固定数据不在 live 而中止，退出143，原件 full-learning/ 与 full-learning-cancellation.json。这两次是主动取消，不计通过，不计产品失败；原 runner 标记/原日志未改写，无 inputs-after 不倒填。
- 最终学习树将现有 #24 冻结聚合的 provenance、列名及 v0.111/act1 唯一行原样放入测试 fixture，来源 Git blob/原文件 SHA/fixture SHA见 fixed-fixture-origin.json；未重新推导统计或加入正式游戏知识。外部分母13307，本系统验证0局，CLI登记→读回→真实检索→题面保留来源/非因果局限及4096B上限；原自有库字节兼容、混合分账、反证 conflict 与 act 隔离均保留。ToolHost 专属断言明确延期，不计入本轮。
- watchdog 单叶与 R413 窄源326d5636f原字节同，仅子进程 timeout 5→10秒与启动错误透传，原断言保留；该补丁现在随本次 main full 覆盖，不合窄 live 整树。

## 精确交付与原 ops 发布门

delivery.json 列出16个非记录叶的旧/新 blob、mode、字节数及SHA。相对预检的实际 live0073e0ed，其中 watchdog 测试已相同，实际15叶有差异；预检不代发布时冻结。外部聚合固定例已自带测试 fixture，学习源码不依赖 agent-knowledge/query-sources/external-stats-tools。协议文件同时带上 main 已存在且获授权的第9节，再追加本次9.1；#27任务模板在当前 live 不存在，是显式新增叶，不能假称旧 live 已有。

检查期间 main 到 `4c36be00e4d3bc9cb9e6b5c6de7271964840511b`，仅16个论文生成数据/学习与完成记录/决策追加路径变动，清单 main-drift.json；agent/ops/learner/knowledge/eval/tools未变。相关账本/ordinary-close/派发/学习曲线测试用固定临时根，不读取这些生产记录；决策日志只追加且保主管新裁决。最终 main 集成保留并行记录及根日志既有未提交历史编辑；这些编辑含插入、删除与替换，原字节保留在工作副本，不代入本次提交。索引仅在当前已提交日志上加候选新增尾部，工作副本仅在原字节后加同一尾部，预检SHA见 integration-preflight.json。原L短锁中绑定 backup/restore/verify；不把旧 full 说成在新 main 运行，不为纯记录变化重跑。受测后只追加本材料、决策日志与交接。

本回执为学习侧 main 精确候选的完整检查，不是另一棵 live 组合的完整检查。交原 ops 按实际 R413/最新知识、精确预像、绑定、原 K→L 与自然开局边界核组合；禁止整 main 覆盖 live、重放旧脚本或夹带 #42 工具叶。ops 决定其精确发布组合所需检查并登记实际 release。main 绿不代已发布，本角色未碰生产。

#42 学习侧实际 live 并核账本/检索消费者后，原 ops 即沿 #27 原请求/队列冻结新外部输入派第二批，不等待工具余项。正式研究 task CLI/ACK兼容阻塞、自然消费、科学父与异议证据保留，不代他角色确认，不关闭 issue。

新顺序：#42学习侧 → 完整#33+#26（含R413启动补丁）→ #42工具剩余 → #35 → #28 → #37 → #36，#37→#20不变；同一发布在途。R413单叶启动补丁尚未实际 live；原生session因 config.toml service_tier 隔离后退exec的反证保留，启动变量登记不代 session 恢复或原生成功回执，旧真实session历史不改写。#20/#43输入漏记阻塞与heavy off保留。
