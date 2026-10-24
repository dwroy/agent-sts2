# #36 五弹窗与原异常批次接续核验

时间：2026-10-25T06:01:59+08:00；核验基线 main 3d8f517dbec37233b69ae53146231badbb32571f。接原评论6388880074和ops04:04原件，不重启已可恢复停止的#20/#36开发会话。

五个原pane当前均无配额换模模态、原agent为done、ANSI composer判空且未见排队follow-up。完整session/turn/prompt及原生context逐项核同，五份native均仅原一个task_started，实际模型gpt-6.1-sol/high、service_tier=null，无原生error/abort；前台PID与birth、短名、pane/cwd及中文学习标题保持。当前屏幕SHA与ops04:04所报SHA不同，只核本次状态，不宣称两次屏幕逐字一致，也未亲见历史按键；历史Keep current model选择由ops原回执承担。历史hold屏幕未保存正文，人工草稿身份仍未知。

| 原批次 | 原pane | 当前批次/运输状态 | 恢复入口范围 |
| --- | --- | --- | --- |
| 20261025-021310-postmortem（登记key 20261025-021310） | w1H:pF4 | awaiting_review / rc空；原75 | 支持复盘；本轮只读预检rc0 |
| 20261025-024302-fix-batch | w1H:pF8 | awaiting_review / rc空；原75 | 不支持修复批 |
| 20261025-024302-s2-strategy-proposal | w1H:pF7 | awaiting_review / rc空；原75 | 不支持策略批 |
| 20261025-024302-strategy-proposal | w1H:pF6 | awaiting_review / rc空；原75 | 不支持策略批 |
| 20261025-031302-strategy-proposal | w1H:pF9 | awaiting_review / rc空；原75 | 不支持策略批 |

五份TUI与deferral的SHA均与04:00独立核验逐字相同。原120秒hold→75→defer的结论保持，五个原监督PID/birth已退，原native仍保留；learn未finished、无tui_recovery，TUI仍retirement_authorized=false。原learner-tabs.json未见这五批event，五个规范tab-retirement文件均不存在；不是已seal、已回收或科学完成。新自然记录范围仍17 TUI/17 launcher、6 hold/1 resumed。011301原106764ms有界恢复仍成立，无新自然异常事件。

原复盘回执SHA 130648492824e4dc20fcaa951d9b86679e188ed184ae9e44dcddd7b3994d3e70。本轮从主运行根仅执行 `recover-completed ROOT DIR 20261025-021310 ORIGINAL_SHA` 默认只读入口，实得eligible-for-identity-check/apply=false/finish_authorized=false/retirement_authorized=false；原生SHA 8370cfda38bf87e024d9ff866d023fac0605bd3cb441326906ec9634da68c6ea。预检前后原TUI/native/output/deferral及原登记不变。未加--apply，不借该入口处理其他四批。

主运行根的issue_session/issue_session_support/learner_tui/learner_tabs和guarded codex-ops-learn完成模块实际可导入，共27个项目运行模块均与HEAD一致，26个与复用full输入相同。另一个eval/brain_source.py是已提交5cd435c4b的统计缓存接口差异，原件和差异补丁另存；不冒称当前所有依赖与旧full相同或实际apply成功。原始import读回另含本次核验脚本自身，分类产物明确将它排除出27运行模块，原始读回不改写。当前27模块导入成功只证主根导入，不证native进程加载或live恢复入口。

#36的17运行/测试叶仍全部与HEAD及原full冻结输入相同，八TS套件281项过；复用679文件6628过/0败/2跳、tsc0及原full SHA dc8596bddcef8112b5d5522c543e1647896ebf29377d5becbcf8a319d8ea9bd9。本轮新full0，不重复检查或将旧full推广到#60 R448兼容候选。对局视图原pane w1H:pBA标题现为“对局大脑 · E6JPL2W7HUTD”，与最新run-config原行一致，较RR2自然更名；本轮未启动游戏/视图。屏幕和样本gitleaks0。

下一步交原ops：复盘批可沿docs/codex-ops.md主根部署合同及上述原SHA，执行前重新核fresh身份/输入/租约/源码和账号原归属，按原受控恢复事务留真实recovery、finish及后续seal/调度回收证据；本角色预检不替代执行。其他四批先给原身份下合法处置方案或受审查支持入口，不改task、不借复盘入口、不重放/手填完成；保原父要求、树、输出和旧75。若人工草稿验收仍无自然原件则明确待验，旧三75已显式退役不重开旧合同。

材料：dialog-and-recovery-readback、retirement-journal-readback、natural-hold-readback、natural-branch-inventory、main-recovery-deployment-readback及classification、imported-source-difference.patch、full-coverage、game-view；raw屏幕只留忽略目录.artifacts/integrator36-dialog-20261025-0558/。#36继续开放，未修改源码/live/STOP/生产知识/账号配置/原批状态、其他角色ACK或科学父。#27兼容/000402缺log与#60原兼容候选失败均保留原责任链。

公开回执：https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6390080177，远端逐字读回。原ops w1H:p8一行提醒rc0/agent_prompted，只证投递、不代已读或ACK。review队列43/39/36/20，原角色/运行等待保持；本角色无在途检查或发布。
