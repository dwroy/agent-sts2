## 修 bug 回报

- 合并基线：main → 384d194dae6d23eb9290fb3bb8586a6dd6f0935f
- 修复（每条一行）：SL判官遗漏毒伤触发阈值眩晕（silent-0195；KUZVERN40NGK F17第3次T5／第5次T6／末次T6-T7） — f6ff3a9ce42337972b19ee227b2d51432e929f50 — 测试 agent/tests/silent-sl-poison-stun.test.ts:F17 attempt6-turn6 — 去掉修复时失败：是（5失败3通过；恢复8通过）
- 已被别人修掉的：未知眩晕后继模型 — 631f9485；Inferno测试竞态 — 195869aa；其余123项逐项提交见 /home/dw/Projects/agent-sts2/learner/runs/20261006-225909-fix-batch/already-fixed.md。
- 没修的：永冻首次能力格挡 — 太大、证据不足；mod超时及Codex缓存实测 — 证据不足；boss模拟性能 — 太大；策略项 — 策略类。详见 skipped.json。
- 测试：源及合后 tsc 退出码0；vitest 209文件 / 2245用例 / 退出码0，无超时重跑；完整沙箱外套件待调度器补跑。
- 合入：06b52ef8f3b19d288044acc91ca895fd29a53a7f（S1.fix37；账本保持proposed，误写占位符已追加勘误；运维交接 /home/dw/Projects/agent-sts2/learner/runs/20261006-225909-fix-batch/handoff-ops.md）。
- 需要 Dai 定的事：保血、留药、boss时钟校准、路线预估、休息点选择、小偷优先、A10第三幕第二boss、无色牌估值、全死排序／巨兽拖延、SL范围、懒惰估值。

```json
{
  "task": "fix-batch",
  "base": "384d194dae6d23eb9290fb3bb8586a6dd6f0935f",
  "fixes": [
    {
      "item": "SL判官遗漏毒伤触发阈值眩晕（silent-0195；KUZVERN40NGK F17第3次T5／第5次T6／末次T6-T7）",
      "commit": "f6ff3a9ce42337972b19ee227b2d51432e929f50",
      "test": "agent/tests/silent-sl-poison-stun.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "永冻首次能力7挡未进入模型（silent-0172）",
      "reason": "太大、证据不足：已核PJ2LL9KU7FHD F17第三次T4原帧0→7挡，触发前后relic.stack均null且无已使用字段；玩家仅本回合总牌/攻击/技能计数，无整战能力计数。跨帧、续行、进程恢复和SL重置需专项跟踪及固定验证；重复/重放触发未验证，交开发会话处理。"
    },
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
  "merged": "06b52ef8f3b19d288044acc91ca895fd29a53a7f",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2245
  }
}
```
