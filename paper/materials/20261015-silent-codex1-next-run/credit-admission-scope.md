# 主线 codex1 credits 准入范围差异

Roy 已明确允许本次主线使用 codex1 的 credits；此处不重复请求付费授权。需要核清的是“范围只有主线 brain-home”是否允许修改当前代码中的运行闸。当前尚未改 selector 或额度保护。

实际 account/read 身份与原 codex1 一致；目录无 AGENTS.md/AGENTS.override.md，Sol6.1/xhigh/default 检查通过。account/rateLimits/read 33.405 秒后成功，周额度100%，credits43894.4592665，ordinaryUsageAllowed=false，rate_limit_reached，spendControlReached=false，重置2026-10-20T04:58:44Z。原 CodexUsageGuard.start()/beforeCall() 在该真实读数上拒绝使用。

最小功能方案：保留所有默认禁止 credits 的行为，只为本仓库主线 Silent、所选 codex1 home 及本次明确授权增加显式 paid-credit 准入。其他角色、其他space、ops/learner 均保持。新进程才读取；当前 HLAW 不热载、不续接、不改变旧问题/加密线程。余额耗尽、不可读及真正 spend-control 拒绝仍拦截；不兑换重置券、不修改模型、普通服务档或候选/样本。

固定验收应覆盖：默认模式仍拒绝100%/credits消费；主线显式模式在正余额时允许；缺失/零/负余额拒绝；spend-control及credits depleted拒绝；额度读取失败保持required保护；重置后可用普通额度保持；Regent/其他root/home/角色均不启用；原运行进程不变。源码变更必须走原工作树、自测、精确live和唯一宿主检查链。本文是具体待定方案，不是已实施或已发布。
