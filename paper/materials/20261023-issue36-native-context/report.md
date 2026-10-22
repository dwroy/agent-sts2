# #36 原生启动上下文辨别与四会话只读对账

依据 [ops 6349675684](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6349675684)，沿原开发分支 `6ec71c313` 修协议，未改 live 或发布顺序。R416 已由原 ops 发布的事实不代本修复上线；原完整 6123 绿不覆盖新增源码。

## 协议

真实 Codex 0.163 首题顺序是 session_meta → task_started → developer 消息 → 一个两段 input_text 的 user response_item（本 cwd 的 AGENTS 包装与 environment_context）→ world_state → 同 cwd/turn 的 turn_context → 原派发提示 user response_item。旧 NativeBatch 将第一个 user item 当作未知人类输入，后续正确 marker 也不能解除 foreign。

`learner/lib/herdr.ts` 现在只在首个待绑定回合、已知 session/cwd、未见 turn_context/原提示时暂存这一精确结构；随后须同 cwd/turn 的 context 确认，再由原 marker 与完整正文 SHA 接受任务。上下文本身不能接受或完成批次。原回执增加版本化前缀 SHA/turn/cwd，Python 从原生文件独立重建并核同。其他形状/额外段落、event_user、错 cwd/turn、缺 context、重复、提示之后或续轮的同形消息，以及原提示前的工具/助手输出仍拒绝；未知输入不能靠后续 marker 洗掉。原一次性 marker、完整 SHA、native turn、草稿、lease/PID/前台/cwd/名字与75退场门保持。已有无前缀的旧回执继续沿原核验，resume 入口仅初始化原 session/cwd 身份供同合同核验，未重启任何实际线程。

测试新增纯协议与只读对账反例，并经固定 bootstrap → 原提示 → 完成 → 退场的完整 mock transport 核保存的前缀证明；原审查 ownership 测试文件未修改。公开夹具只用虚构说明，不发布真实会话的系统/AGENTS正文、账号标识或私有路径。

## 只读对账入口及四个原会话

新增 `learner/reconcile-tui.ts`，用法在 `agent/` 下：`nice -n 19 node --import tsx ../learner/reconcile-tui.ts --receipt <原回执> --native <原生JSONL>`。它核原 submitted/完整身份/32字符名/一次性提示 SHA，从有界只读快照完整行重建实际接受；只打印来源 SHA 和观察结果，不连接 herdr、不写原回执、不发送、不授权退场或 finish。退出0仅表示原任务在该快照已接受，不能作为生命周期成功码。没有把观察结果写成新的完成回执。

对四个 `20261023-032433` 原 fix/主策略/复盘/s2策略，先核原档案提交证明，再冻结各自原生文件快照，用最终 CLI 对账，四个均0；独立 Python 只调用纯 native verifier 重建同一 bindings/前缀，全部通过，原 archived receipt SHA不变。`four-session-audit.json` 有逐批 session/turn/原提示SHA/来源快照SHA/前缀SHA。两个快照已有 native task_complete，另外两个仍open；**全部未核产物/当前退场或原 finish，不称批次完成**。

原件差异保留：fix 的原 current-tui 档案（及本轮只读当前回执）仍是 submitted、没有 result，另三批是75/stopped=false，bindings均为空；不将早期“均75”摘要回填为四份相同终态。原75、空bindings、监督/租约和原件均未写改；后续由原 ops 按实际身份、产物、监督及退场门处理。模型已消费原任务，不能重送、重派或开相同模型。只读对账不恢复已退出的 launcher，也不代修原监督退出码/summary交接。

## 核验与边界

同一四份真实前缀：原HEAD 4/4复现 accepted=false/foreign=true，修后4/4 accepted=true/foreign=false；原失败与同字节输入SHA保留。最终 tsc0，定向9文件/112项通过；Python23有独立日志，已被Vitest一个包装入口包含，不重复加算。全部nice19、单线程worker、文件/检查串行。20输入SHA、命令/原件SHA、初轮与最终绿见 `checks.json`；本地首次复放 harness 的cwd路径错误发生在复放前，修正后完成原红/新绿，原件保留。未跑full，完整组合与兼容由原集成员沿原队列核验。

运行差量为 `learner/lib/herdr.ts`、`ops/learner_tui.py` 及两份只读审计入口文件；测试改动四份，另有文档和本材料/decision-log。未修改 main/live/STOP/hosting/账号/普通服务档/权限，未改变游戏知识或决策规则、未分号、未运行 play、新模型/提示、重排原批或关闭其他会话。自然直播/TUI与四批最终完成、学习/科学父继续开放。

交付末次自查补充：原 `6a5d049f0` 后另补原生接受时的即时回执检查点；初次/明确续接的绑定被原生确认后立即 fsync `native-accepted`、session/turn/bindings/前缀，模型尚在工作时也可读到证明，不等结束或重试。完整mock回归在 native task_complete 之前读回该状态及 retirement_authorized=false，最终9文件/112项和tsc仍通过；此前受测日志另名保留。交集成时须同时取协议提交及此检查点后续提交，不能只取最后一枚。
