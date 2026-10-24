# #37 两项验证返工

依据 [6382635563](https://github.com/dwroy/agent-sts2/issues/37#issuecomment-6382635563)，从原冻结树 `a0736855cb204bf579b264b40441db3936192eee` 的 2763 份输入逐 SHA 复制到本开发树隔离 fixture，复现同名两败。原检查树未改；原 full 的 13 败中 11 项为集成员 threads/chdir 检查器问题，继续分账，不归开发回归。本轮 **full=0、检查锁获取=0**，不占 #20 窗口。

## 原因与修正

1. `external-strategy-evidence.test.ts` 原测试读取持续更新的 published 库，把检索出的外部条目也按“自有记录字节完全相同”检查。外部条目按既有合同增加 `evidence_summary`/`limitation_notice`，不能套用该断言。现用固定、明确标为格式验收的自有数据及既有外部聚合 fixture，分别验证自有条目完整 JSON 字节不变、外部/混合条目的全部原字段不变、非因果/外部分母限制提示存在。重复本系统帧仍只算一个局：混合例自有独立局数 2、支持局数 1，外部奖励屏幕分母独立保持 13307，不相加。另核检索不修改输入及 conflict 状态保留。生产库、证据提示及分母计算均未改。

2. `run-plan-merge.test.ts` 在原实际 profile 仍从 `support.ts` 启动旧回环 socket Mod 服务；共享 `oneshot-support.ts` 的 `scriptedDeepSeek` 已换为 `fixture-http.ts`，安装了只允许已登记 fixture origin 的 fetch。诊断实录显示 **0 decisions、0 请求体、3 errors**，三次 `/state` 均因 `unregistered fixture origin: http://127.0.0.1:<临时端口>` 失败，触发 circuit breaker，尚未进入模型请求/计划合并。因此不修改计数为 0。现从同一个 `oneshot-support.ts` 导出并使用 Mod/DeepSeek 共用的封闭 fixture server，避免两种传输夹具混用。原 `deepseekCalls===1`、两种回答格式下实际 route/计划合并及请求 `run_plan_task` 断言全保留，新增 `stats.errors===0` 和实际 `bodies.length===1`。实际 DeepSeekClient、loop 与计划合并实现不变。

主线开发测试此前已直接使用 `fixture-http.ts`，但原实际 profile 保留了旧游戏测试文件与较新的共享助手。集成时必须同时取本次三测试文件的完整字节：`external-strategy-evidence.test.ts`、`run-plan-merge.test.ts`、`oneshot-support.ts`，不可只刷新共享助手或只看 main 的测试结果。三文件 SHA 见 [verification.json](verification.json)。

## 验证

- 原两项同名定向：0 过/2 败；诊断插桩保留失败，定位状态读取错误后去除插桩，不提交诊断代码。原始 `baseline.json`、`diagnostic.json`、`client-diagnostic.json` 均留存。
- 原冻结 profile 加三文件补丁后，forks/单 worker/不并行文件运行 `run-plan-merge.test.ts` + `paths.test.ts`：**30 过、0 败、无筛选或跳过**。11 项路径测试保持原代码并在正确池下全部通过。
- 单独 threads/单 worker 运行 `external-strategy-evidence.test.ts`：**43 过、0 败、无筛选或跳过**，包含 ledger→检索→prompt/tool 路径与新证据分账用例。该文件使用 threads 是为了 Python 子进程运行时仍满足任务最多两个进程；其不调用 chdir。前一批 forks 使用 manager＋一个子进程。两批串行、nice19，不能把这项局部 threads 配方用于含 chdir 的完整测试。
- 开发 production tsc/noEmit 退出 0。原 1417 依赖、原 owner 2763 输入前后 SHA 核同；隔离副本仅上述三个测试文件变化，知识输入全部保持冻结字节。

执行命令（在隔离 profile/agent，PATH 加既有 Node，无安装依赖）：

```bash
nice -n 19 node node_modules/vitest/vitest.mjs run --pool=forks --maxWorkers=1 --no-file-parallelism \
  tests/run-plan-merge.test.ts tests/paths.test.ts
nice -n 19 node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1 --no-file-parallelism \
  tests/external-strategy-evidence.test.ts
```

这是两个串行定向批次，不冒称同次三文件或完整组合通过。原 full 的 6585 过/13 败/2 跳、原 forks 诊断的 69 过/2 败及 index 字节变化原因未定全部保持原范围，原件 SHA 在 verification 中独立核同。

## 交接边界

本次无运行源码、知识或配置行为改动，无发布号，不动 live/STOP、其他会话、原检查树或旧 publisher。按 #20 实际窗口释放后由集成员协调下一检查；重新冻结当时 live/宿主，保留 R430–R433、刀刃新版/新增四条及后续自然知识刷新，不用本次旧冻结知识覆盖生产。九叶未发布、首自然局 Jev 无开卷/无调用错误、091302 source=null/原 failed/净12/.2 排除、通知 ACK/自然采用、24h 和其他科学父均继续由原 owner 处理。
