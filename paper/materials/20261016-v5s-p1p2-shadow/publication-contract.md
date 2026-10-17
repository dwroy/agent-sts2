# P1/P2 shadow窄发布契约

依据Roy2026-10-16 19:16明确决定与诊断492a87d0b。原父roy-20261016-global-build，原watcher/codex1 owner保留。独立WT codex-v5s-p1p2-shadow-20261016，base5bda85450459a16912dec7882ccc3e480a06c23d，精确四叶见source-checks/checks.json。

生产只改agent/src/core/config.ts两默认值on→shadow，保显式环境模式解析语义。原ops须在实际发布时核启动环境/脚本无S_READINESS或S_BUILD_RANK显式on覆盖；不要改账号/home/model/prompt。下一自然启动生效，不热改现局或重启。

旧规则：Silent P1默认on，适用题面送准备度；P2默认on，送排序表并校验偏离理由。
新规则：默认均shadow，保原B3计算/准备度和排序组/S反事实日志，不送上述P1/P2增量题面或要求偏离理由。既有B3胜率/HP资料、P1/P2显式off/shadow/on解析能力、C1出口、C2完成/自适应、P2/P3 S排序shadow、SL/药价和其他角色等价。无新增模型、知识机制或on门槛声明。

固定验收：默认双shadow的整段decision JSON与两者off相同；readiness/build_ranking mode=shadow且delivered=false；shadow_s_ranking保留；每个合法选项的真实AnswerSpec无需ranking_override_reason；Ironclad默认等价；原显式on的题面/理由重问仍按既有测试运行。类型检查0、五文件36固定题0；源唯一full另见原日志/终局json，未通过不称全绿。

请原ops按实际source提交只窄合四叶，保所有并行知识/记录/index和历史署名。行为号在原live锁核实际行为提交后单独分配，不预造编号；发布后先date，在根notes/for-roy.md和ops/inbox-dev.md逐旧/新/依据证据/预期/回退双写，并追加decision。

预期：去掉P1/P2新增题面及理由消费对构筑选择的影响，现有计算/日志继续；不承诺胜率改善。回退：原锁只恢复本次两个默认值，经固定自测、独立回退记录/实际编号与精确树宿主，保其余刷新。未经Roy/Claude新指示不自行回退。

新实际组合沿原ops唯一宿主通道作精确树完整tsc+Vitest；不重复已测未变源full，不借旧树绿，不把启动/源定向绿当结果。后续只用已部署每10完局固定分段漏斗观察，按实际run-config记录P1/P2模式和版本段，不新开自然监听、A/B或其他阶段。任务2已完成离线报告/设计main10e5e3e10，不要求ops实施设计或扩大原0332。
