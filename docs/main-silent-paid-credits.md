# 主线 Silent 的 codex1 credits 准入

Roy 2026-10-15 12:34 明确批准修改原 usage guard 的这一限定范围。

原规则在普通额度不允许、周窗口满或余额下降时停止 Codex。新增显式
`main-silent-codex1-20261015` 模式只允许本机主检出
`/home/dw/Projects/agent-sts2` 的 `.worktrees/live`、Silent、指定
`ops/codex-ops/accounts/codex1/brain` 登录目录使用已有 credits。
`ops/run.sh` 每次启动先清除继承的开关，只在实际 main/live/selector 匹配时设置；
配置再核实际源码树、workspace、角色和 brain home，未匹配的角色、space、
ops 与学习者保持默认禁止 credits。运行中进程不重新读取 selector。

获准模式仍要求可读的计划和额度窗口、明确未触发 spend-control，以及
`hasCredits=true` 且有限正余额。普通额度满和正常余额下降不再单独阻断；
零、负、缺失或无效余额、个人消费上限和其他拒绝类型仍阻断。额度读取失败
强制等待；只有该模式将只读额度 RPC 的超时从20秒设为90秒，以容纳已实测
27–34秒的宿主启动延迟。原调用频率和模型请求预算保持。

模式名称写入真实 run-config 的 usage 状态，额度/余额读数继续落盘。
不请求 reset-credit、不兑换重置券，不改模型、服务档、候选、样本或游戏规则。
新 home 只在源码发布与宿主验收完成后由主 ops 更新 selector；下一个自然
控制器启动生效，当前 HLAWCGM3KHVB 不受控接续、不重启。

回退：将主线 selector 恢复原 brain home，后续启动不设置 paid 开关；或撤销本次
限定准入源码发布。既有进程、失败和账号预检记录保留，不回写历史。
