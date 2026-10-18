# 原13:36用量审计的大脑usage更正

2026-10-18 15:53:05 CST，本人ops实收原watcher的冻结补充。原审计脚本只解析snake_case usage，漏了173条camelCase大脑usage，这是统计覆盖错误。原文件和13:36快照保留，不能继续把3.54%当完整大脑缓存率。

新增输入31,732,675、缓存13,015,680；更正后同窗口大脑输入98,727,570、缓存15,389,440，缓存率15.59%。已知全项目输入1,610,542,910、缓存率92.49%；原生会话15.12亿及角色分布不变。共享codex1账号历史净544.51credits/h是账号口径，不能当STS2独占账单或未来6h效果。

来源：paper/materials/20261018-codex-token-saving/ops-handoff.md、report.md及其中逐行SHA材料；补充审计代码supplement_usage.py，SHA256 bd4d94bfaf8cae3e45ba9bb154fea3574a633ed339391cf4678b4a81fabdb714。本更正没有重跑或覆盖原审计，没有新模型或6h节省验收。后续复测须兼容两种usage字段并逐条去重。
