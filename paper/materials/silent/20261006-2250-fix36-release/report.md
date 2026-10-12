## 修 bug 回报

- 合并基线：main → b9d0fb62a779ab876b0159abc80ace487942c3b4
- 修复（每条一行）：结实绷带弃牌格挡未接入方案推演（silent-0193；L704TLETMZBM F48末次T3/T4） — 3a4c5626434efc909122483769468bba953d63c1 — 测试 agent/tests/silent-tough-bandages.test.ts:F48 final T4: Dagger Throw and Survivor discard twice for eighteen Block and six HP loss — 去掉修复时失败：是（8 失败、2 通过；恢复 10 通过）
- 已被别人修掉的：124 项已修，逐项提交见 [/home/dw/Projects/agent-sts2/learner/runs/20261006-221304-fix-batch/already-fixed.md](/home/dw/Projects/agent-sts2/learner/runs/20261006-221304-fix-batch/already-fixed.md)。
- 没修的：永冻首次能力7挡 — 太大、证据不足；mod超时自愈和Codex缓存实测 — 证据不足；boss模拟性能 — 太大；策略项 — 策略类。详细理由见 [/home/dw/Projects/agent-sts2/learner/runs/20261006-221304-fix-batch/skipped.json](/home/dw/Projects/agent-sts2/learner/runs/20261006-221304-fix-batch/skipped.json)。
- 测试：源与live各 tsc 退出码 0；vitest 208 文件 / 2237 用例 / 退出码 0。初稿 silent-hidden-daggers 回归已修正并重跑通过，原失败保留；无高负载超时重跑，完整外部套件待调度器补跑。
- 合入：8aead9fa447e76f6a36bdf0a5d5214ccc5aeb522（S1.fix36；运维交接 /home/dw/Projects/agent-sts2/learner/runs/20261006-221304-fix-batch/handoff-ops.md）
- 需要 Roy 定的事：保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第三幕第二boss、无色牌及懒惰平均出牌估值。

```json
{
  "task": "fix-batch",
  "base": "b9d0fb62a779ab876b0159abc80ace487942c3b4",
  "fixes": [
    {
      "item": "结实绷带弃牌格挡未接入方案推演（silent-0193；L704TLETMZBM F48末次T3/T4）",
      "commit": "3a4c5626434efc909122483769468bba953d63c1",
      "test": "agent/tests/silent-tough-bandages.test.ts",
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
      "reason": "策略类：本任务不改，交Roy及独立策略任务；已有事实与机制修复保留。"
    }
  ],
  "merged": "8aead9fa447e76f6a36bdf0a5d5214ccc5aeb522",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2237
  }
}
```
