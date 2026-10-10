## 修 bug 回报

- 合并基线：main → 9f09e2b648a456a82ece6a7847c874863b25acd1
- 修复（每条一行）：boss-clock历史测试未隔离自动刷新知识表 — 38e95b24efafb862fc09b1fd026626acf481c47d — 测试 agent/tests/boss-clock.test.ts:ERPH Waterfall Giant: the eruption caps the fight at ~T10; F14 still short；新增隔离检查 — 去掉修复时失败：是（固定3599ab0a输入2失败；恢复34通过）
- 已被别人修掉的：121项逐条提交见[核对清单](/home/dw/Projects/agent-sts2/learner/runs/20261006-175455-fix-batch/already-fixed.md)；毒伤上限 — 08481537；钨棍逐次减损 — 4367250b；士兵翻倍消费 — 19e41a26；预算硬截止 — 9889436c。
- 没修的：永冻首次触发 — 太大；mod超时根因、Codex缓存实测 — 证据不足；boss模拟性能 — 太大；其余打法项 — 策略类。
- 测试：源及合后tsc退出码0；纯测试修复vitest各203文件/2195例/退出码0，含既有提案源及最终合后各204文件/2203例/退出码0；无超时重跑，初稿夹具/复现装载错误保留。gitleaks通过；沙箱外完整检查待调度器。
- 合入：live fc17d02d464c803162f551f08dba97a09d91f7c7；纯测试先发布59c9a75a35645fd79383fcfef4870c784b508540，再单独合入既有蜡烛提案9a865dbe→633f33127d3c12473e998d71aca88d7af04cb89d/S1.strategy7，运维交接已落盘，0186保持proposed。
- 需要 Roy 定的事：保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息回血或锻造、小偷优先、A10第三幕第二boss、无色牌估值。

```json
{
  "task": "fix-batch",
  "base": "9f09e2b648a456a82ece6a7847c874863b25acd1",
  "fixes": [
    {
      "item": "boss-clock历史测试未隔离自动刷新知识表",
      "commit": "38e95b24efafb862fc09b1fd026626acf481c47d",
      "test": "agent/tests/boss-clock.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "永冻首次能力7挡未进入模型（silent-0172）",
      "reason": "太大：当前仍无PERMAFROST接线，公开状态没有首次能力已触发字段，需要跨帧、续行、重启和SL重置跟踪；重复及重放证据未验证"
    },
    {
      "item": "mod选牌屏及其他屏幕请求超时自愈",
      "reason": "证据不足：离线固定响应无法确认mod内部超时根因"
    },
    {
      "item": "Codex大脑缓存命中偏低及实测对比",
      "reason": "证据不足：缺少在线受控实测，本任务禁止实际LLM与网络"
    },
    {
      "item": "boss整场模拟耗时、样本不足及CPU争用",
      "reason": "太大：需要独立性能基准和跨模拟器定位；已定位的预算硬截止已修"
    },
    {
      "item": "保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第二boss、无色牌估值",
      "reason": "策略类：本任务不改，交Roy及独立策略任务；蜡烛已提交事实提案仅按队列授权另行合入"
    }
  ],
  "merged": "fc17d02d464c803162f551f08dba97a09d91f7c7",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2203
  }
}
```
