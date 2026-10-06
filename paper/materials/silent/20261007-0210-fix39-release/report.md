## 修 bug 回报
- 合并基线：main → 1ad74473cf57b59da149661ea116fcae0803d497
- 修复（每条一行）：永冻首次能力漏7挡（0172；25226ZFLNR1J F29 T1、PJ2LL9KU7FHD F17第3次T4） — 157d635cd9e9880d7396e76a15594c6e7f0b0253 — 测试 agent/tests/silent-permafrost.test.ts:PJ2 F17 attempt 3 T4: Phantom Blades and two potion-adjusted Defends give 21 Block and zero loss — 去掉修复时失败：是（6失败；恢复12通过）
- 已被别人修掉的：127项 — 已修，逐条提交见[核查清单](/home/dw/Projects/agent-sts2/learner/runs/20261007-014302-fix-batch/already-fixed.md)
- 没修的：mod超时自愈、Codex缓存实测 — 证据不足；boss模拟性能 — 太大；策略项 — 策略类
- 测试：源码及live各tsc退出码0；vitest 211文件/2266用例/退出码0，首轮通过
- 合入：da3250d3646a0530b0febe14e8a1a18766567e76；发布ebd920b46668fc63babae6a79359d926d3c620ad / S1.fix39；0172待运维登记shipped
- 需要 Dai 定的事：保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第三幕第二boss、无色牌估值、懒惰平均出牌估值

```json
{
  "task": "fix-batch",
  "base": "1ad74473cf57b59da149661ea116fcae0803d497",
  "fixes": [
    {
      "item": "永冻首次能力7挡未进入模型（silent-0172）",
      "commit": "157d635cd9e9880d7396e76a15594c6e7f0b0253",
      "test": "agent/tests/silent-permafrost.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "mod选牌屏及其他屏幕请求超时自愈",
      "reason": "证据不足：原队列只给请求超时、自愈现象，未定位mod内部根因；旧事件及CARDS_VIEW重复提问已修。"
    },
    {
      "item": "Codex大脑缓存命中偏低及实测对比",
      "reason": "证据不足：离线任务不可调用真实LLM或网络，尚无受控实测证据；会话隔离误拒子项已修。"
    },
    {
      "item": "boss整场模拟耗时、样本不足及CPU争用",
      "reason": "太大：需独立固定性能基准与跨模拟器定位；已证实的02:40/03:00硬截止和单调时钟传播已修9889436c。"
    },
    {
      "item": "保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第三幕第二boss、无色牌估值、懒惰平均出牌估值",
      "reason": "策略类：本任务不改，交Dai及独立策略任务；已有事实与机制修复保留。"
    }
  ],
  "merged": "da3250d3646a0530b0febe14e8a1a18766567e76",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2266
  }
}
```
