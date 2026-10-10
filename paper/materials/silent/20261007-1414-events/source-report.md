## 修 bug 回报

- 合并基线：main → e2c935ba3e6770ea09d4ed60f345d6bbb840eb83
- 修复：13:31 sl-any-draw语义测试真实时钟污染 — 3d6340e00f3ca05dd526012ccede35268b65eda8 — 测试 agent/tests/sl-any-draw.test.ts:keeps the unmodelled-card reason after a simulated wall-clock pause；keeps a deadline-truncated bound uncertain with a controlled advancing clock — 去掉修复时失败：是（2失败，恢复13通过）
- 已被别人修掉的：裸JSON解析6f86ff6b；autoplay热交接71b835a3；历史日志回调ccd8bb8e；其他136项见already-fixed.md。
- 没修的：缓存/mod超时根因 — 证据不足；boss模拟性能 — 太大；策略及专项新功能 — 策略类/独立批次；13:52新增旧usage测试契约与0226 — 队列明确交下一批，本批预检冲突后停止。
- 测试：tsc 0；vitest 227文件/2408用例/0；无失败重跑。
- 合入：未合入（26处冲突）；live9项知识刷新已保存859adf45d78925c4b9f4c5bba040e70cb61a2423，合后测试未运行。
- 需要 Roy 定的事：保血、留药、boss时钟校准、路线/休息、小偷优先、A10第二boss、无色估值；已授权的专项由专用批次处理。
