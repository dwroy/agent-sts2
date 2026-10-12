## 修 bug 回报

- 合并基线：main → cf31d63c8a96795f263fcb5dc9dabb44617b0cbf
- 修复：无新增纯bug修复。
- 已被别人修掉的：旧130项 — 逐项提交见[already-fixed.json](/home/dw/Projects/agent-sts2/learner/runs/20261007-104302-fix-batch/already-fixed.json)；其中herdr注册表竞态 — 526b71cc。
- 已被别人修掉的：毒杀漏算持牌伤 — 2e6fa2e5；中毒触发攻击八折 — ffa23c2f；升级预览漏关键词 — 62ee292c；勒紧漏挡 — 1912b5e0；蛇咬漏毒 — 06bb4617。五项均已在基线/live，账本均shipped。
- 没修的：mod超时根因、缓存实测 — 证据不足；boss模拟性能 — 太大；策略项 — 策略类；boss校准、Codex-only大脑 — 独立功能任务，本批不混入。
- 测试：tsc退出码0；vitest 220文件 / 2331用例 / 退出码0，首轮通过，无重跑。
- 合入：未合入（无新增修复）。既有135项已在所核live 0061f599；live独立功能差异导致空批自动核验返回null，已写[运维交接](/home/dw/Projects/agent-sts2/learner/runs/20261007-104302-fix-batch/handoff-ops.md)，需据无新增产出结案。
- 需要Roy定的事：原保血、留药、全死排序/巨兽拖延、SL范围、路线、休息、目标优先及估值策略；已授权的两项独立功能继续按专用任务执行。

```json
{"task":"fix-batch","base":"cf31d63c8a96795f263fcb5dc9dabb44617b0cbf","fixes":[],"skipped":[{"item":"mod超时根因、Codex缓存实测","reason":"证据不足"},{"item":"boss模拟性能","reason":"太大，需独立性能专项"},{"item":"保血、留药、全死排序、SL范围、时钟、路线、休息、目标优先、A10第二boss及估值","reason":"策略类"},{"item":"静默boss校准、Codex-only大脑","reason":"独立功能任务，不混入纯bug批"}],"merged":null,"tests":{"tsc":0,"vitest":0,"cases":2331}}
```
