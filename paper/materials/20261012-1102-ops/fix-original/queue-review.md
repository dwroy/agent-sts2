# 本批队列核对

基线 e572f8c96d167cab93e101457ac98c0d2f6fb6af；最新核对live b21feab62ef5e8afa7f05c7a3c05609e6b14a091。
原队列完整快照 queue-snapshot.md；与上一批的增量 queue-delta.diff 仅具名卡接续说明和本次测试新项。
历史来源156项重新核祖先；main机械整合但原源非祖先的10项同时比较当前路径，并核其实际分支实现；完整表 queue-commits.json。
缓存签名原源8fbb441eb在本批期间由原运维链等价整合为1db39f635/live b21feab62，非本批修复，不重复提交。

## 当前代码核实
- codex-usage.ts:489 recoverCreditBaseline要求窗口推进与两次稳定完整采样，保护条件仍在。
- codex-ops-learn.py:run_ascension只用实际ascension；ascension_audit.observe消费这个选择器。
- proposal_dispatch.py:experience_audit仅豁免显式blocked且完全无产出，其他来源审计保持。
- multi-character.test.ts:prefixFixture使用固定缺表/有表目录。
- core_build_jobs.py:notify保留stdout/stderr及幂等回执；历史rc2不能证明未发，未重发通知。
- learner_check_continuation.py:validate绑定batch/source/tree/原日志SHA；coverage保留已过及失败用例。
- strategy_implementation_jobs.py已识别CONTINUATION并经allow_waiting读取原提案。
- boss-sim.ts:continuationInput已有分支/seed/资源诊断；无触发样本，未改正HP资源契约。
- ops/codex/lib.ts已含git-push-main注册与SHA验证；只核源码，没有执行推送。

## 留原链处理
游戏机制、出牌/药水/SL/终局/路线/休息提案继续独立strategy-proposal；不引入开发者游戏知识。
具名卡其他入口及跨局未知闭环仍是原专用功能未完成；事件子项42c920f34已实际上线。
目录消失上游创建/删除者、旧通知rc2根因、调度公平性和mod短暂超时仍缺数据。
全漏斗、学习优先级、统一资源价值、F33归因、B4/B5及缓存性能专项保留原任务。
本批只新增rollout-live-best-test-determinism的测试修复；未改共享队列或提案状态。
