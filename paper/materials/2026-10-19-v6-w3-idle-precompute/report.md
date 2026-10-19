# V6-W3 空闲预计算

新增调用方驱动的 `V6IdlePrecomputer`，不注册计时器或轮询。W5 可在现有幕切换、路线移动和动画边界调用 schedule/runIdle，对 skip 基线复用既有 engine.precompute 与缓存；本模块不接管大脑题型和触发。

- schedule 固定数据快照、清空选项，只保留最后一个待算上下文；函数/供给 provider 使用原有不可变依赖契约。
- runIdle 需要显式 isIdle、相同 contextDigest、足够覆盖原有计算预算的 available_ms；foreground lease 或已有活跃任务时不启动。off 无模拟。
- acquireForeground 在调用方的同一模拟池上等待正在进行的有界预计算后给出幂等 release；等待发生在新前台计算预算开始之前，不挤占独立 5000ms。不承诺中止已提交的模拟任务。
- 运行中被新状态替代时结果标 discarded，原缓存仍由完整上下文 key 隔离；invalidate 清除排队任务。无新游戏动作、模型调用或后台服务。

3 个固定测试覆盖空闲窗口、并发前台串行化、快照/最后任务合并、在途失效、off/过期不计算、异常后恢复。最终联合检查另记。

## 联合验收

联合树基线 f7580b3f5，tsc与完整vitest通过；精确agent树 5e8b261e816a4b92cbf63f275d2473d0a3e749a2，完整统计见runtime报告。功能代码SHA与联合受测树一致；默认off且既有等价测试通过，gitleaks暂存0发现。
