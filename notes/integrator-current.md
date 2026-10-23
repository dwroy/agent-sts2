state: clear-ok
issue: 42
updated_at: 2026-10-24T00:03:44+08:00

# 集成员当前交接

本文件是集成员接续入口；每轮结束前刷新开头状态、issue、时间和以下三项内容。`state` 只是总结标记，`clear-ok` 不表示队列清空或所有验收完成。是否允许清上下文还须核客观信号与主管准入，不能只读该标记。

## 本轮接续

进行中的事: #20分钟子项和#42工具余项均已定向核验合main交原ops。#42重基于3c86ce747，tree a2bd2f0513a1ab72e316f5267a06c3d124d6c0e4，tsc0/9文件174过，保R420完整提示和来源证据；材料paper/materials/20261024-issue42-tools-integrator/。
在等谁: 原ops先核#42两叶与当前live组合的唯一完整检查/发布，再#35新R420十二叶；旧full已lost-no-final-result不可复用。#20待同版kit安装/一分钟入口及一小时、一天下游核验。#51两批已启用等原生启动，#27正式ACK兼容阻塞未变。
下一步: #42工具余项实际准入→35→50→28→37→20父。当前review其余均受前置发布/最终组合约束，不启动重复full，不改live或清上下文；等原ops回执后按序继续。

## 当前任务与顺序

- #20一分钟派单器＋空闲感知和交接保护已定向合main交原ops，来源评论6368947281；真实一小时/一天观察待核。任务边界清理保持shadow；集成员不改cron或生产控制。
- 原顺序：已核收 #20 学习 tab 子类 → #20 一分钟节拍子项 → #42 工具余项 → #35 → #50 → #28 → #37 → #20 父功能。#42 父合同已关闭，未合工具候选的处置单独保留；#49 新小修正已由原ops发布V6-R420，最终组合须保其合同。#39、#43 随 #20 父功能最终组合核收。
- 当前 #20 为 `status:review`，独立分钟子项已核但父仍待依赖；其余积压 #50、#28、#37、#39、#43 均有依赖。已完成的独立核验见 `paper/materials/20261023-review-backlog/review.json` 与本轮读回；不重复旧测试或提前关闭。

## 已完成与接续位置

- #42额外工具候选已在最新main重基核验并合main：两叶tree a2bd2f0513a1ab72e316f5267a06c3d124d6c0e4，tsc0、9文件174过及真实夹具消费者产物，保#49新提示、evidence/provenance与有界保护。材料paper/materials/20261024-issue42-tools-integrator/；待原ops唯一完整检查及实际发布，不能把旧12叶#35树称为包含该修正。下面22:30记录仅历史。

- #20分钟子项：公共da1e3bd（11叶），kit8940977/tree77ee8bc；隔离树e6136139bd基于931e1525。定向核验与输入哈希材料paper/materials/20261024-issue20-minute-integrator/；首个Vitest参数不兼容和重定向失败保留，修正后通过。默认shadow，真/new未启用。

- #51入口：源码 `97289805831237cf9140db5384e9597d12af84c1`，21叶默认disabled/空计划，原#48配置/冻结别名未动；独立tsc0、15文件199过。材料 `paper/materials/20261023-issue51-external-source-integrator/`。仅基础设施合main，交原ops实际部署/冻结/启动；owner:learner、科学父与下游真实验收保持。

- #20 学习 tab 恢复子类：宿主 main 三叶 `a3b15e510fe9`；八旧 tab 实际回收独立核收记录 `be9c6483ef7d` / `paper/materials/20261023-issue20-recovery-acceptance/receipt.json`。pC5 缺原 birth、pCC awaiting_review 保留；父功能仍在 #37 后。
- #42 父合同已由主管按学习 R414／工具 R418 关闭；这不等于以下额外候选已合。工具候选：工作树 `.worktrees/integrator42-tools-20261023-2238`，提交 `056a4f7af03ff13d4f5936e913b53c6ea5242218`，树 `72fb99e743860a3657c742e625446cf487a618d6`，基于 `4adb2a704`，两叶；tsc0、9文件174过，补验2文件42过与前者重叠不累加。2633输入前后核同；保 #49 完整 evidence/provenance 与真实 rk。材料 `paper/materials/20261023-issue42-tools-integrator/`；旧树字段更正、超长证据首败、稀疏夹具及错误 cwd 原失败均保留。该旧候选已于本轮重基定向核验合main，实际live仍待ops；旧树结果与新树分账。
- #50：`c72ff7845533`，十叶在旧当前树预检与已审一致；原定向117过＋1环境失败，补 cache 后该项通过；父 #35 未上线，等顺序及最终组合。材料 `paper/materials/20261023-issue50-repair-review/`。
- #28：`7087caea9ee4`，原定向87过，旧 cache 环境首败保留；默认开关关闭，85条原 reflex 保留，真实收益/启用/A-B 尚待。材料 `paper/materials/20261022-issue28-integrator-review/`。
- #37：`9e8f900dde2d`，两实现叶原定向96过；最终组合保 main 共享 card-option 测试里的 #41/#44 修复。材料 `paper/materials/20261023-issue37-r418-preflight/`。
- #43 本轮：2026-10-23 22:56 六叶核同且 main 均缺，证据 `.artifacts/issue43-resume-20261023-2256/verification.json`；原30项及真实 `.mts` 正负控见 `paper/materials/20261022-issue20-integrator-r5/`。无新补交，不重复测试、不单独关闭。
- #20 父：公共 `e1204dcf9250` / kit `7e5a408f`，原 tsc0、Python102＋边界4过；上次预检冲突 report.py、run.sh、decision-log，必须保已发布 learner_tabs、codex/lib。材料 `paper/materials/20261023-issue20-tick-integrator/`。#43 六叶原定向30过随父核收。
- #39：六启动实现/回归叶逐 blob 同已审 e1204dcf，原23项隔离检查可复用，但尚未合 main。最新独立回读 #39 评论6367608617；本轮证据 `.artifacts/issue39-resume-20261023-2246/`。最终组合重算盘点行为环境消费者，保原失败；等 #37→#20最终full及 ops实际 pin、自然局 source/run-config，不能拿一分钟子项或 #33 启动补丁替代。

## 当前基线与完整检查

- 本轮#49产品受测基线 main `50722d45459f6136c2871aecc3904cd2dc5099dd`，受测树 `8d09a0cf2890fe0dd6847917b887116fd1561c0b`；前述 #42 候选基线较旧。
- 较早 ops 唯一 full 已完成：tsc0、6513过/2跳过，`paper/materials/20261023-fix-211302-ultrafast-ops/transaction.json` 阶段 `main-published-notified-await-idle-native-resume`，原 failed/rc0 保留。不是 #42/#20 未合源码的 full。下一窗口先重读事务和进程实际状态，不能因旧 PID 存在推定仍在测试。
- #35旧R419唯一full：原ops已核lost-no-final-result，PID/子进程、tool session均无，未留full JSON或退出码；原件paper/materials/20261023-r420-natural-ops/issue35-loss-receipt.json，旧running不改写。新R420净12叶树438155cb0cc73dc9b90cdeb6275c1f74a6beebd7已准备，未full、未发布；必须单独受监督核验，不借旧结果背书。
- #49原ops已登记V6-R420：`902206965e0698253fab1f9a135c9666bdd1ed3b`，状态published-registered-readback-notified-admission-released（23:39:17）；证据 `paper/materials/20261023-issue49-efficiency-ops/publication-state.json`。约14秒目标仍待后续自然窗口，不能由发布完成代验；后续组合再核实际live和最新知识。

## 权限与保留项

- #27 通知去重（Claude 2026-10-23）：状态没变不再写主管收件箱；仅需 Roy 裁决或状态变化时写一行，细节留在原 issue。已有投递及拒绝原件保留，不将重复提醒当新核收要求。

- 集成员只核验、合 main、协调唯一 full；不派开发、不碰生产或会话配置。发布交原 ops。新工作用独立树，主检出只集成；保留共享脏记录，push 仅 Windows ssh 包装器。
- 每轮结束先查 review 队列，按顺序继续可推进项；全部有依赖才停，并说明等谁/什么。
- 按 #20 评论6367705371/6367774091：先 dry-run 一天，只记“会不会清”及依据，主管对照实际状态核准后才开启真清。`in-flight` 或同 issue、声明缺失/过旧均不清；heavy lease、本角色启动的完整检查/发布进程、交接时间或最近5分钟 issue 状态变化与声明矛盾时，以客观信号为准、不清。已发生压缩，交给派单器在获准阶段核阈值与交接更新；不自行给自己发 /new。不得把 clear-ok 当作跳过一天 dry-run 的授权。
- 上线后由原验收链核一天内 /new 与压缩次数、每轮开头上下文大小；清后问“刚才做什么”或重复已完成工作记误判进 digest，误判多时收紧。不开新 pane，不使用 /fast 或 /ultrafast，不改共享配置。
- #27 正式角色 ACK 仍受原 CLI 来源兼容阻塞；23:13核收16项原文（含000402原日志缺失）、67引用及32投递窗，原rc2拒绝保留；实读/转达不等于正式ACK，科学父保留。#46原24h窗口、#47自然验收等仍由原角色沿原 issue 读回。
- 全部历史与详细审查见 `handoff/integrator-20261022-codex3.md`；重启先读本文件、AGENTS/架构/工作流，再读对应 issue 最新评论。摘要与原件冲突时查原件，不自行消除待办。

当前等待：原ops核#42两叶实际组合/唯一完整检查与发布，然后#35新R420组合；20分钟子项一小时/一天读回、51原生启动各沿原链。review其余50/28/37/20父/39/43均受前置约束，暂不越序。
