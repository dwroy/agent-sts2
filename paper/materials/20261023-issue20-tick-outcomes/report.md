# #20 tick 预期等待分类补交

依据 [Claude 第1点](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6344092778)。本次只处理派单器正常等待被记为 error、导致原调度器反复打印 tick failed 的问题。#42 uncertain 已由 ops 结清，本次没有操作生产 journal。

公共分支父提交 `380083709f49a06871be39b5c7f0c65e3a6ab5ac`；上游 kit 从 `26130354b86fbdbb4a1baddda07a770b0b9d6fd5` 更新为 `7e5a408f641f30a442eef06f81e933adda194daf`，已推送并读回远端同 SHA。

| 条件 | tick 结果 | 退出码及处理 |
| --- | --- | --- |
| 回收明确返回 retained / waiting-worktree | retained | 0，保留 pending，下轮再判，不写故障收件箱 |
| 提醒接收方缺席、忙碌或不可输入 | queued | 0，保留 pending，恢复后只送一次 |
| 动作前生命周期可重试锁忙、宿主或项目派单锁忙 | queued | 0，不执行该轮动作，下轮重试 |
| 超时、API/配置/账本损坏、异常回执、动作不确定 | failed | 非零，保留原不确定状态，按原通知规则写收件箱，不自动重发 |

事件内部 pending/sending/uncertain/done 协议未迁移；旧 errors 历史保留，不能单因历史记录令新 tick 失败。真实长期停滞仍沿原 watchdog 阈值升级。真实动作异常新增主管单行通知，以事件标识去重；看门狗沿原通知身份。主管收件箱追加不确定仍失败，不伪装排队。项目级异常用独立 `<原state文件stem>-failures.json` 保存故障通知回执，避免改写损坏的主 journal；项目配置未能读取时沿原 registry 收件箱兜底。dry-run 不写状态或通知。

改动文件：kit `board.py`、`README.md`、新增 `test_outcomes.py`，以及 `test_board.py`、`test_watchdog.py`、`test_project_contract.py` 三处结果断言；公共仓库只改工作流说明和本次材料、decision-log。原调度 shell 无需修改：预期等待的退出码恢复为 0 后不会进入 tick failed 分支。

验证均为 nice 19、固定夹具、无真实游戏/模型调用：

- 生产 `agent/` tsc：`PATH` 含 `~/.local/node/bin`，`./node_modules/.bin/tsc -p tsconfig.json --noEmit`，退出 0，见 `tsc.log`。
- 相关定向 `python3 -m unittest test_outcomes test_board test_watchdog test_claude_inbox test_project_contract test_release_order`：最终 102/102，见 `kit-final.log`；此前 100 项通过见 `kit-targeted.log`。覆盖连续等待不报错、条件恢复只执行一次、锁忙无动作、超时及未知/非对象回执、坏 journal 保留、异常去重、dry-run、历史 errors 和已结清事件夹具。
- 初次 100 项运行有 1 个旧断言仍期待 error，99 过/1 败；按新协议改为 failed 后通过。首次失败只有会话工具回执，未保存原始日志，不将其记成通过。
- kit 源码 gitleaks 退出 0，见 `kit-scan.log`。公共 staged diff、材料和外发正文亦经发前扫描；不运行完整 Vitest。

影响 live 启动：否（本次增量）；父 #20 启动发布交付仍为是。未改生产 kit 安装/登记/开关、live/STOP、运维 prompt、真实收件箱、#42 journal 或其他会话。当前结果是源码与固定测试验证，尚未声称生产刷屏已消失；精确版本部署和真实下一 tick 读回由原集成员/ops 流程完成。#37→#20 合入顺序、冲突处理、最终组合完整检查和原真实采用验收均保留，不另抢窗口，不以本次定向绿替代。
