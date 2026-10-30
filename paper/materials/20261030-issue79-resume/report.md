# #79 原链恢复与当前 main 交付

按 [主管恢复指示](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6523733863)，在原线程、原树恢复。开始核到实际 ROOT 的分支、HEAD 与 main 均为 `1b7c652cbd5ef2355687e1e159fccacb2a73da06`，晚于指示中的 `9dbb37b5`。原交付 `e08a2365b42c60df59899fb2feff04cb9771a909` 保留在本分支历史及 `issue-79-original-e08a2365b`，旧材料和请求不重写。

将固定 main 合入原分支，store 自动合并，唯一冲突是 decision-log 追加；保留 main 原字节全文，再接回原 #79 追加行。[合并核验](merge-verification.json) 逐字确认 store 等于 main 加原 #79 审计变换，保留 schema5、research、null-confidence；其余 auditor/helper/test 仍与原交付逐字相同。没有把 main 后续代码整文件覆盖回旧版。执行源码仍仅三个生产叶和一个固定测试叶，新增 approval.ts 必须随实际知识 CLI 的 store.ts 配套安装，学习 helper 为 ROOT 注入叶。

当前 main 的 #84 工程声明另须配套一叶 `ops/fixed-producer-dependencies.json`：既有 Silent 校准指纹真实读取整个 agent/src，新增模块未声明时原检查先红 `calibration source read family needs explicit dependency declaration`。已审新 approval.ts 的两条静态边、整文件 opaque SHA，更新 store SHA/边及原 refresh-silent 的真实读族边；只改 silent-boss-calibration 这一个 producer，不重排无关动态边。实际原检查的 13 个闭包全部通过、其余 12 个方法 SHA 不变（含 outcome），见 [声明核验](declaration-verification.json)。这仅是工程闭包声明，未执行生产校准或写控制/方法准入；原集成仍需给最终 ROOT/LIVE 组合冻结和同发布事务的方法材料，不用本地指纹代生产准入。

#78 已经实际上线并关闭，当前 main 也包含后续 #85 消费者。旧报告中的“等待 #78”是旧时点状态。本轮当前源码的定向与类型检查、沙箱终态和 source SHA 见 [checks.json](checks.json)；原 10/26 检查与失败不改写，不借旧绿证明本轮。

生产与知识 CLI tsc 通过，首轮 7 文件 69 项通过；单 worker 沙箱 655 文件中 654 过、1 败，6072 项过、1 败。唯一失败在运营 SQLite 的固定校准夹具，store 源 SHA 与旧工程声明不符，原件保留。最终声明上重跑该入口、本项三文件及导入检查共 5 文件 34 项全过（含原 Python 20 项），补 paths 11 项全过；另有方法准入 Python 24 项全过。复验首次因本开发从仓库根目录启动，使原 wrapper 的 ../ops 路径失配，改在 agent/ 下执行后通过；没有改运行源码或原断言。源码四叶开测前后 SHA 核同，声明后补时点、首败/cwd失败及冷夹具恢复均明列；不冒首轮沙箱全绿或原集成的实际组合 full。

## 原批与工具读回

[原批重放](original-replay.json) 继续用原 182334 candidate/approval/report/result/产物，核其 SHA 前后不变。固定 3f 审计函数仍复现 Markdown 解析错误和分类未批准错误，新审计通过。只在本树隔离库从原 K533 文档生成 seed，内存映射 base，候选 ID 和知识文档不改；同 ID 完成重试只有一个完成事件。隔离版本与夹具 code 不冒实际发布。

[当前工具回执](consumer-summary.json) 使用新增策略原声明的 card_reward、act1、SNAKEBITE 计数条件，当前实际 ToolDef 返回新增 ID：投影 10935B、全文单包 16975B，均 ≤24000B；全文每个原候选字段精确保留，支持/反证/限制/trigger/confidence 不丢。既有 `presentStrategy` 添加的 evidence_summary/limitation_notice 另行核验。缺触发牌与铁甲两负例均返回 0。历史 helper 使用的 initial/空牌组是非适用上下文，当前工具合法返回 0，不将它称为新的 24KB 故障。原始工具响应、源码与输入指针保留在本树 `.artifacts/issue79/resume-20261030/consumer/`，汇总带 raw SHA。

历史 helper 首次因稀疏策略未展开而找不到，恢复 e08 原 Git blob 后执行；新探针首轮错误地将附带两项既有呈现字段的全文与纯存储对象要求键集完全相等，修正为核每个原字段并独立核两项新增字段。两次准备问题及原脚本/日志 SHA 见 [准备历史](probe-preparation-history.json)，没有改运行源码或旧报告凑绿。

## 当前真实受理阻碍

生产原 batch 仍 `awaiting_review/knowledge_pending`，DB 原候选仍 submitted，未实际发布。纯只读检查的 current 为 `K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec`；相对原 K533，原候选涉及的四个对象已被并行更新，#73 纯函数按原合同拒绝 `continuation object conflict`，无写事务或受理回执。

| 对象 | 原候选修改 | 当前 K1 相对原 base 的修改 |
| --- | --- | --- |
| silent-route-hp-observation | version/strategy/evidence/batch_supplements/prior_texts | confidence/formal_publication、grading 等分级字段 |
| silent-brain-poison-footwork-realization-review | version/strategy/evidence/batch_supplements/prior_texts | confidence/formal_publication、grading 等分级字段 |
| silent-class-a10-continuity-route-hp-observation | target/evidence/rationale | target |
| silent-class-stock001-c1-poison-resource-realization | target/evidence/rationale | target |

各方精确对象 SHA 见 consumer-summary，顶层字段分账见 [conflict-fields.json](conflict-fields.json)。字段不同不自动授权拼接同一对象；本开发不改 #73 冲突门、不覆盖当前分级或刷新分类 SHA 来跳过来源批准。实际发布前需原知识 owner 依据原候选与当前版本给合法审阅处置，保留原 candidate/report/approval。此运行缺口已经 [交 #79](https://github.com/dwroy/agent-sts2/issues/79#issuecomment-6524105605)，不能以本工程或隔离读回冒原批完成。

用户给的 204303 守卫原件已核 SHA 并保存在 [preflight.json](preflight.json) 中：原记录显示 ROOT `.agents/board.yaml` 脏改、`source/knowledge changes require engineering delivery`、operational_pending/awaiting_review 保留。[主管 20/6524090002](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6524090002) 及本轮用户明确指定：交集成员按当前 board 字节独立登记，再由 ops 重走原运营入口；**不作为 #79 返工**。这是独立运营入库守卫，不是本项 Markdown 解析或分类来源错误。本开发未清 ROOT 脏改、重放该批或跳过 guard。

## 后续与边界

本次新固定请求替代旧 r1 的交付位置，旧请求仅保留，不盲目重放。原集成按 #20 指定学习吞吐顺序核实际 ROOT/LIVE/CLI 映射与唯一组合 full，工程不等 #69/#71。原 ops 在原知识 owner 处理四处冲突后，以原 182334 ID、原来源/native/runtime 绑定走合法受理；实际执行时重新核 current，不使用本次读回时点当 CAS。

实际 K1、新增 ID 的生产工具返回和 #65/#77 wrapper 监督/真实终态继续分别验收；不伪造完成或重开模型。未写 main/live/STOP、生产库/控制/其他会话，不运行 play，不分行为号。回退只反向本项三生产源码叶及配套工程声明相对受测 main 的精确差量，保当前 schema5、K1、旧失败、报告与原科学来源；不通过代码回退撤销知识。原 #51 等仍开放的学习父要求保持，已由主管关闭的 #60/#73 不因历史引用自动重开。
