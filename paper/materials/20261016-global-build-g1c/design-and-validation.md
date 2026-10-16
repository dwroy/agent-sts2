# G1c 设计与固定导出验收

G1c 只读日志，改变评估/运维归档，不改变游戏行为。隔离工作树 `.worktrees/global-build-g1c-20261016`；沿批准50e2da099输入，代码集成后交原ops发布和接收。

`eval/global_build_funnel.py` 读取固定logdb导出，保留原V5 Silent A10描述性集合及W1排除，开局提交按Git祖先分发布和S阶段；实际配置SHA、开关和局中配置变化单列。40旧局仍分10/10/10/10；不足10的尾段独立保留，修正原脚本把不足5局尾段并入上段的问题。最终含SL和整局首试同时给出固定层漏斗代理、实际Boss逐场率、幕路上到达、死因及逐局身份。

首试停止沿eval.metrics.first_attempt的最早predicted_death定义。与旧ops快照共享24个已结束局的首试floor/victory逐项一致；旧snapshot的passed_act1/2字段有差异，明细保留于ops-snapshot-agreement.json，旧字段未覆盖或倒改。本工具的过Boss指标按实际房间/精确遭遇与SL首试绑定；同Boss重试合并，F48/F49是两场。每场首试与整局首试分别表示，后者在此前首次失败处停止，不借SL到达的后场充数。unknown不作败局或零：没有Boss房间但已实际跨幕可推出到达，计推得项；最终死房间未知时，不能宣称死在Boss前。

`ops/global_build_funnel.py` 接在现有report.py局末事件；独立nice19子进程，最多2个DuckDB线程，持独立非阻塞cadence锁。每局先查小型runs/config记录，未满下个10局不导出、不跑模型。满10才增量同步一次、持共享读取锁冻结SQL/manifest/SHA，归档到paper/materials/<时间>-global-build-g1c-through-N；固定10局块和尾段全部保留。首次部署可以一次回填既有完整10局边界，此后按下个边界触发。归档成功后才推进state；失败目录保留且不推进。归档成功、decision-log写入被中断时，下一原局末事件只补台账，靠唯一archive标记防重，不再导出。没有新定时器、prompt、模型调用或开局动作；其他角色不启动该钩子。

13项固定检查覆盖尾段、Boss身份/连战、SL截点、未知、缺失首试、跨幕帧、时间时区、初始代码、截断导出、十局节奏及台账中断恢复。初次Vitest不支持--minWorkers而未开始套件；错误原件保留。修正前full因源码核对发现上述缺失Boss/中断边界而由本人仅停止自己测试进程，rc143保留，不能报通过。reviewed-checks是修正后源码的独立完整验证，精确文件SHA随启动冻结，未出结果前不称绿。

最终全检、源码提交、原ops例行钩子实际接入与一次真实归档读回仍待验收，不因固定报表已生成就关闭G1c。输入与首次输出保留在G1b/inputs、fixed-funnel.*；修正后输出另存fixed-funnel-reviewed.*。
