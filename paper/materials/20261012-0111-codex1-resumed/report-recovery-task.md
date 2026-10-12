# 缺失旧局报告的受控宿主补收

2026-10-12 01:45:05 CST，原交接待办N1ZEBMHZM4KC。主ops已通过broker核procs无play/autoplay/report，mod为同局SILENT/A10 GAME_OVER、defeat/F21；原终态22:32:28，runs.jsonl仍0行。原父loop的TERM trap跳过report，不能把恢复片段83决策当整局。

请求开发为现有broker添加受控 report-run <12位run_id>，调用原report.py正常收尾（含对应角色刷新），不是另建对局/调度器。无任意路径/脚本/环境注入。请求前后核目标同局完整原段与恢复段、已结束事实；拒绝活play/autoplay/report、不同mod局或无可证终态。按run_id幂等核runs.jsonl已有记录，重复请求只返回已有回执，不重复刷新派发或改胜负。保留知识刷新锁、已有租约及LLM_DRAIN/PAUSE约束。

特别核ops/report.py:386-388的code取最新console逻辑：本局最后真实运行源码为65e3d10a9+dirty；纯补收不能创建另一个console或把后来live提交写成历史运行代码。收据记录原/恢复两段console、日志字节范围/SHA、既有记录数、产出路径、完整退出码及刷新结果。先在固定临时fixture测整局聚合/重复调用/未结束/活进程/不匹配拒绝，不用真实游戏作测试。

入口实际上线且下一wake的broker加载后，主ops经该动作补收，核完整记录一次，再经autoplay-start恢复并核新brain隔离home。缺此动作期间主ops不绕过沙箱直接运行会触发宿主刷新/派发的report.py，不新开局替代补收。授权沿原ops日常恢复与本次llm-resumed，不需要Roy重新决定配置或策略。
