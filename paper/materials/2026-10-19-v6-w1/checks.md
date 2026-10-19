# W1 验收

- 类型检查通过（退出 0）；完整 vitest 560 文件、5357 项通过、2 项原有跳过，208.66 秒；专项 3 文件/38 项通过。命令、固定源文件 SHA 与输出副本（仅去掉末尾空行；原始输出保留在工作树 .artifacts）见 checks.json、vitest-full.txt、vitest-targeted.txt、tsc.txt。
- 测试只用固定数据，未调用模型/游戏/在线 API，未安装依赖。原测试文件/5319 通过加 38 项本次测试；既有 2 项跳过未改。
- 旧基线从 W0 78933a38d 运行时代码独立采集（运行时代码与初始 main 18e9ab630 一致），采集源码留 baseline-capture.test.ts.txt，结果留 baseline-capture-result.txt；12 项 SHA 在 agent/tests/v6-off-baseline.json。没有用 W1 输出倒填期望值。
- 三个角色各在未设置/显式 off/off 但子项全请求三种模式下，固定休息/奖励/商店题面的 JSON 与解析动作逐字节哈希相同；run-config 含 config_sha 同样相同。固定历史题 relabel 角色且知识路径强制缺文件，只证明此架构路径及关闭分支；不声称覆盖每一种可能游戏状态或角色知识。
- 首次对照失败原件仍在工作树 .artifacts：曾在工作树根运行，导致 Vitest 未加载 agent 配置；之后 agent cwd 对照只剩 run-config 的不同绝对 prompt_log 路径。固定 DECISION_LOG 路径并在旧 W0 重采期望后通过。没有改正式运行逻辑去迁就夹具，也没有把失败报告覆盖为成功。
- strict schema 六类均有正反例；predicate 越白名单、原型路径、非法类型/深度拒绝；三值逻辑未知不被 not 变成命中。角色交错读取、缺文件、角色目录/文件跨域链接、scope/引用/重复 ID、日志 off 不建目录、非法行与写失败均有固定测试。
- 本包只增基础接口和可选 run-config 字段，不改变对局行为，不分配 release_id；正式知识未写。安全扫描及集成见 decision-log 与交付记录。

## 回收限制

现有 ops/worktree_retention.py complete 的 acceptance 强制要求 source/main/live 三个完整 SHA 并核实际 live，尚无 main-only 模式。本次明确不得重建 live，故不能伪造 live SHA 或把 main 冒充 live。合入后用真实 source/main 请求 complete、live 留空，由工具保留；回执放 ops/codex-ops/retention/v6-w0-w1-main-only.json。此处保留工作树等既有工具支持/调度处理，学习者工作树运行中必须保留。没有改运维工具扩大本包范围。
