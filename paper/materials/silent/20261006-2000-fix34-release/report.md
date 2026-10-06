## 修 bug 回报

- 合并基线：main → 01af526d73206033a97ac62f0a25a9ad851248e1
- 修复（每条一行）：单行动题重复折减现场虚弱伤害（silent-0191；VLV17NUSFS61 F37第2次T5、5X2GHKJ89PN1 F48第6次T6） — c39102521f91e1e95b886935cf27cc8c23d0bf65 — 测试 agent/tests/silent-single-action-weak.test.ts:VLV F37 attempt 2 T5: Poisoned Stab reports the observed four damage, not three — 去掉修复时失败：是（撤源码6失败/2通过，恢复8通过）
- 已被别人修掉的：122项及逐项提交见[核对清单](/home/dw/Projects/agent-sts2/learner/runs/20261006-194303-fix-batch/already-fixed.md)；重复扣挡 — 779c9548；herdr竞态 — 526b71cc；预算截止 — 9889436c；boss-clock测试隔离 — 38e95b24。
- 没修的：永冻首次触发 — 太大、边界证据不足；mod超时根因、Codex缓存实测 — 证据不足；boss模拟性能 — 太大；其余打法项 — 策略类。
- 测试：源及合后tsc退出码0；vitest均206文件/2221用例/退出码0，首轮通过、无重跑；gitleaks退出码0。
- 合入：2be2e791a8aaf7d2bfe185e6cf7f31a3bf657c51（代码合并97d59449fabbd64af48c6eb911ade843298efa81，S1.fix34；运维交接已落盘，完整沙箱外补测待调度器）。
- 需要 Dai 定的事：保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息回血或锻造、小偷优先、A10第三幕第二boss、无色牌估值。

```json
{
  "task": "fix-batch",
  "base": "01af526d73206033a97ac62f0a25a9ad851248e1",
  "fixes": [
    {
      "item": "单行动题重复折减现场虚弱伤害（silent-0191；VLV17NUSFS61 F37第2次T5、5X2GHKJ89PN1 F48第6次T6）",
      "commit": "c39102521f91e1e95b886935cf27cc8c23d0bf65",
      "test": "agent/tests/silent-single-action-weak.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "永冻首次能力7挡未进入模型（silent-0172）",
      "reason": "太大、证据不足：公开状态无首次触发字段，跨帧、续行、重启及SL重置跟踪需专项验证；现有PJ2LL9KU7FHD F17第三次T4、25226ZFLNR1J F29 T1仅证首次7挡。"
    },
    {
      "item": "mod选牌屏及其他屏幕请求超时自愈",
      "reason": "证据不足：未定位mod内部根因，已定位的旧事件和覆盖层重复提问已有修复。"
    },
    {
      "item": "Codex大脑缓存命中偏低及实测对比",
      "reason": "证据不足：离线任务不能调用真实LLM或网络，缺少受控实测。"
    },
    {
      "item": "boss整场模拟耗时、样本不足及CPU争用",
      "reason": "太大：需独立固定性能基准及跨模拟器定位，已定位的硬截止问题已修。"
    },
    {
      "item": "保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第三幕第二boss、无色牌估值",
      "reason": "策略类：本批不改，交Dai及独立策略任务。"
    }
  ],
  "merged": "2be2e791a8aaf7d2bfe185e6cf7f31a3bf657c51",
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2221
  }
}
```
