state: clear-ok
issue: 50
updated_at: 2026-10-23T23:11:39+08:00

# 集成员当前交接

本文件是集成员接续入口；每轮结束前刷新开头状态、issue、时间和以下三项内容。`state` 只是总结标记，`clear-ok` 不表示队列清空或所有验收完成。是否允许清上下文还须核客观信号与主管准入，不能只读该标记。

## 本轮接续

- **进行中的事**：按 #20、#50 优先核对完成。#20 现为 in-progress，尚无一分钟/任务边界子项新交付；#50 的十个产品叶在当前 main 合并预览逐 blob 同已审修补，未启动新测试/full、未合产品或发布。原环境失败保留。
- **在等谁**：原 issue-20 开发交付；原 ops 核回 #35 唯一 full 的真实结果并完成实际发布。#35 状态文件仍写 running，但原 PID 已消失、日志为 0、未见 full JSON，结果未知，不能宣称通过或盲重跑。#42 父合同已由主管核收关闭，另存的未合工具候选仍须保留并核后续处置。
- **下一步**：收到 #20 子项后沿原合同做定向核验；先核 #35 原检查收据，不另开 full。#50 最终组合保留 #49 新批准的小修正，并重新核必要消费者；#28→#37→#20 父与 #39/#43 仍沿原依赖。完整证据见 `paper/materials/20261023-integrator-priority-readback/review.json`。

## 当前任务与顺序

- 原 issue-20 开发会话正在做独立一分钟派单器＋空闲感知；新增任务边界清上下文合同见 #20 评论 6367705371。尚未收到开发交付。交付后只做定向核验，再交 ops；不代开发实现、不改 cron。
- 原顺序：已核收 #20 学习 tab 子类 → #20 一分钟节拍子项 → #42 工具余项 → #35 → #50 → #28 → #37 → #20 父功能。#42 父合同已关闭，未合工具候选的处置单独保留；#49 新小修正尚在开发，最终组合须保其合同。#39、#43 随 #20 父功能最终组合核收。
- 当前 #20 已转 `status:in-progress`；其余积压 #50、#28、#37、#39、#43 均有依赖。已完成的独立核验见 `paper/materials/20261023-review-backlog/review.json` 与本轮读回；不重复旧测试或提前关闭。

## 已完成与接续位置

- #20 学习 tab 恢复子类：宿主 main 三叶 `a3b15e510fe9`；八旧 tab 实际回收独立核收记录 `be9c6483ef7d` / `paper/materials/20261023-issue20-recovery-acceptance/receipt.json`。pC5 缺原 birth、pCC awaiting_review 保留；父功能仍在 #37 后。
- #42 父合同已由主管按学习 R414／工具 R418 关闭；这不等于以下额外候选已合。工具候选：工作树 `.worktrees/integrator42-tools-20261023-2238`，提交 `056a4f7af03ff13d4f5936e913b53c6ea5242218`，树 `72fb99e743860a3657c742e625446cf487a618d6`，基于 `4adb2a704`，两叶；tsc0、9文件174过，补验2文件42过与前者重叠不累加。2633输入前后核同；保 #49 完整 evidence/provenance 与真实 rk。材料 `paper/materials/20261023-issue42-tools-integrator/`；旧树字段更正、超长证据首败、稀疏夹具及错误 cwd 原失败均保留。尚未合产品 main/live；新基线已有变化，后续重基须重新核差异及必要消费者，不能把旧结果称为新组合全绿。
- #50：`c72ff7845533`，十叶在旧当前树预检与已审一致；原定向117过＋1环境失败，补 cache 后该项通过；父 #35 未上线，等顺序及最终组合。材料 `paper/materials/20261023-issue50-repair-review/`。
- #28：`7087caea9ee4`，原定向87过，旧 cache 环境首败保留；默认开关关闭，85条原 reflex 保留，真实收益/启用/A-B 尚待。材料 `paper/materials/20261022-issue28-integrator-review/`。
- #37：`9e8f900dde2d`，两实现叶原定向96过；最终组合保 main 共享 card-option 测试里的 #41/#44 修复。材料 `paper/materials/20261023-issue37-r418-preflight/`。
- #43 本轮：2026-10-23 22:56 六叶核同且 main 均缺，证据 `.artifacts/issue43-resume-20261023-2256/verification.json`；原30项及真实 `.mts` 正负控见 `paper/materials/20261022-issue20-integrator-r5/`。无新补交，不重复测试、不单独关闭。
- #20 父：公共 `e1204dcf9250` / kit `7e5a408f`，原 tsc0、Python102＋边界4过；上次预检冲突 report.py、run.sh、decision-log，必须保已发布 learner_tabs、codex/lib。材料 `paper/materials/20261023-issue20-tick-integrator/`。#43 六叶原定向30过随父核收。
- #39：六启动实现/回归叶逐 blob 同已审 e1204dcf，原23项隔离检查可复用，但尚未合 main。最新独立回读 #39 评论6367608617；本轮证据 `.artifacts/issue39-resume-20261023-2246/`。最终组合重算盘点行为环境消费者，保原失败；等 #37→#20最终full及 ops实际 pin、自然局 source/run-config，不能拿一分钟子项或 #33 启动补丁替代。

## 当前基线与完整检查

- 本轮产品预览基线 main `8678e21c0e097972c0af7cb1df3cadfa0816b092`；前述 #42 候选基线较旧。
- 较早 ops 唯一 full 已完成：tsc0、6513过/2跳过，`paper/materials/20261023-fix-211302-ultrafast-ops/transaction.json` 阶段 `main-published-notified-await-idle-native-resume`，原 failed/rc0 保留。不是 #42/#20 未合源码的 full。下一窗口先重读事务和进程实际状态，不能因旧 PID 存在推定仍在测试。
- #35 后续唯一 full：状态文件 `paper/materials/20261023-ops-backlog-readback/issue35-check-state.json` 仍记 running/tsc0；本轮原 PID 3144467 不存在、日志空、未见 full JSON，结果未知。等原 ops 对账，不复用较早 full 为它背书、不另开重复 full。
- 最近实际 game live 核值 `5ac042189bc8708528a902b4cbb52403d1e4c96c` / V6-R419；后续组合必须重新核实际 live 与最新知识数据，不能把该旧值当当前保证。

## 权限与保留项

- 集成员只核验、合 main、协调唯一 full；不派开发、不碰生产或会话配置。发布交原 ops。新工作用独立树，主检出只集成；保留共享脏记录，push 仅 Windows ssh 包装器。
- 每轮结束先查 review 队列，按顺序继续可推进项；全部有依赖才停，并说明等谁/什么。
- 按 #20 评论6367705371/6367774091：先 dry-run 一天，只记“会不会清”及依据，主管对照实际状态核准后才开启真清。`in-flight` 或同 issue、声明缺失/过旧均不清；heavy lease、本角色启动的完整检查/发布进程、交接时间或最近5分钟 issue 状态变化与声明矛盾时，以客观信号为准、不清。已发生压缩，交给派单器在获准阶段核阈值与交接更新；不自行给自己发 /new。不得把 clear-ok 当作跳过一天 dry-run 的授权。
- 上线后由原验收链核一天内 /new 与压缩次数、每轮开头上下文大小；清后问“刚才做什么”或重复已完成工作记误判进 digest，误判多时收紧。不开新 pane，不使用 /fast 或 /ultrafast，不改共享配置。
- #27 正式角色 ACK 仍受原 CLI 白名单兼容阻塞；已读/转达不等于正式 ACK，15原异议、67引用与科学父保留。#46原24h窗口、#47自然验收等仍由原角色沿原 issue 读回。
- 全部历史与详细审查见 `handoff/integrator-20261022-codex3.md`；重启先读本文件、AGENTS/架构/工作流，再读对应 issue 最新评论。摘要与原件冲突时查原件，不自行消除待办。

当前等待：原 issue-20 开发交付，以及原 ops 核回 #35 检查结果与实际发布；#50 保留待最终组合。
