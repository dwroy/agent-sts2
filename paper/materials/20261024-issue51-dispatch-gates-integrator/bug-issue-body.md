[watcher]

#51 停派 P1 的普通经验通道已由 ops 恢复；外部首两计划仍未实际派发。现有 shared.priority_hold 把不可派的旧校准/进阶审计标记当成可派高优先任务，真实普通任务结束后仍会误挡外部学习及 #48 回刷。Roy 本轮要求先协调此 P1 门修和唯一检查，再接 #28。

原始复现与恢复：[ops 评论 6373258583](https://github.com/dwroy/agent-sts2/issues/51#issuecomment-6373258583)。原件：paper/materials/20261024-issue51-dispatch-p1-ops/external-false-ready-reproducer.json；集成员固定副本只读补验：paper/materials/20261024-issue51-dispatch-gates-integrator/read-only-reproducer.json。

问题位置：

- ops/strategy_backfill_jobs.py::priority_hold 无条件采用 calibration_ready 与 ascension_audits queued/running/launching；ops/strategy_external_jobs.py 复用此门。
- ops/learner_jobs.py::calibration_job 在 requested_feature 的专用树/重试等实际派发门前设置 calibration_ready。现场校准专树不存在。
- ops/ascension_audit.py::dispatch 会保留 queued 请求，直到目标进阶有已结束对局证据；现场 silent:A11 为 queued，而 A11 已结束局数 0。
- 空活动批次隔离副本：仅校准标记 true，仅 queued 审计 true，两者 true，空标记 false；普通 writer 等待仍应 true。探针不改生产 state、不启模型。

修复与验收：

1. 沿原调度器共享或复用实际可派性判定，避免 priority_hold 与真正启动条件漂移；不可派的 deferred 校准/审计需求保留请求、失败、证据、重试及身份，不能通过删需求、假 done、自动造树或绕过原锁来放行。
2. 保留普通复盘/经验/修复/已批准研究优先；普通 writer 因锁或树暂不可用仍保优先，真实活动/launching heavy、原重试/lease 和两个策略槽不退化。不得以本修复放宽所有其他 pending learning_requests 或其他正常工作。
3. 固定数据负控：缺专树的 due 校准、无目标进阶已结束证据的 queued 审计，在没有其他真实高优先任务时不误挡外部及回刷。正控：实际可派的校准/审计、普通任务等待 writer、真实活动批次仍挡；后续补齐进阶证据可自然恢复原需求，无需重建请求。
4. 核两消费者原 source/freeze、未消费 unit、native 绑定及两个槽合同；不得顺手改变 #51 冻结计划、#48 原配置、科学验收或生产派发权限。
5. 原代码沿 #48/#51：a163d8897d、d23925417f。按正常看板的一 issue 一新会话/独立工作树交付；开发者做 tsc 和相关 Python/Vitest 固定定向检查，完整检查由集成员与 ops 统一安排，开发端不另起 full。

检查/发布顺序：P1 候选先经集成员核验、冻结源码与实际依赖/知识，协调原唯一完整检查窗口；#28 R423 净组合 b30925f714d0ee4ac0b4f26ed10bd3d8037eb603 的新 full 仍为 0，等 P1 窗口释放。不同输入组合不能借用已完成的 main full；不得重复或并发启动 full。宿主调度器交原 ops 沿实际部署合同发布，不整体复制 main 到对局 live；随后 #28 实际发布与读回 → #37 → #20 父（含 #39/#43）。

本 issue 仅修调度门。#51/#48 的真实外部派发、学习入库、live 经验/消费者读回及科学父要求继续开放。
