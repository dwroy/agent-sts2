# #20 集成核验：要求补交

公共来源 `fdab9aeb91aba3457ea2d06ed475c22b300c9a63`；私有 kit `f1cc7285de2f14aeea33cebb8e6eba4ce618af01`。

**影响 live 启动：是。** 本轮不能准入 main，未开始集成员完整检查，未碰生产。

## 复现与原因

`ops/launch_runtime.py` 的 `behavior_key()` 只识别部分前缀/精确名；`selection()` 因而继承父环境的 `SIM_ADAPTIVE=off`、`SIM_FAILURE_EXIT=off`、`S_BUILD_RANK=on`、`S_READINESS=on`。同一判定也用于 `launch_settings()`，这些非秘密行为配置显式登记时又触发 ValueError，无法随受检 live 正式发布。

这些是实际消费者：`agent/src/core/config.ts` 第40、47、56、64行读取对应变量，控制 Silent 的排名信息、失败退出、模拟与 readiness 策略。固定 fixture 只在仓库内临时 Git 中 pin，并核返回的启动环境；不读真实凭据、不连接游戏、不运行 play。

开发原有启动测试10项独立通过；新增3项得到1失败（四个变量泄漏）、2错误（SIM/S 显式配置被拒绝），退出1。先在隔离合并现场复现，再中止仅本角色创建的候选合并、恢复精确来源提交后独立复现，原两份日志均保留。候选现已无 merge、tracked 干净；不覆盖主检出并行记录。源开发 decision-log 仍保留在原提交及 `.artifacts/integrator-20-20261022/source-decision-log.patch`。

复现（在仓库根目录，`REVIEW_WORKTREE` 可指向任意包含本交付的隔离工作树；TMPDIR 必须是本仓库内已有目录）：

```sh
TMPDIR="$PWD/.artifacts/integrator-20-20261022/tmp" REVIEW_WORKTREE="$PWD/.worktrees/integrator-20-20261022" PYTHONDONTWRITEBYTECODE=1 nice -n 19 python3 -B paper/materials/20261022-issue20-integrator-review/test_launch_behavior_boundary.py
```

## 补交与后续

按实际行为环境消费者审计完整集合，父进程不得注入未发布覆盖；允许非秘密覆盖在受检配置中明确发布，并保留凭据/账号/实例绑定边界及既有默认策略。新增正反固定回归，不以只扩充本反例四个名字代替消费者盘点。

重任务与 area/lease 实现本轮做过源码核查；开发的全检结果仍只是开发证据，不当作本角色通过，也未据此启用生产队列。其余原自然派发、停滞通知、首局读回与生命周期待办继续保留。

#37 与 #20 交叉修改 `agent/tests/v6-card-option-loop.test.ts`，先 #37 后 #20；后者补交沿最新 main/先合结果变基并补必要定向，再进入一次真实完整检查。现窗口 #33→#35→#28→#37 保持，本轮未新增 full 进程或机器队列租约。首次 main 合入前仍须与原 ops 协调下一局准入、正式 live 协议发布/pin/安全接续；当前不触发这些生产步骤。
