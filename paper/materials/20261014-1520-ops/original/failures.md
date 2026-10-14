本批辅助失败保留：

- 沙箱构建遇其它工作树回收造成的 .codex 路径消失，原权限下再次运行成功；没有提权。
- 一次临时here-document结尾误放重定向，引发SyntaxError，后续独立detail.py已正常完成。
- evidence_tables首次把answers.plan对象当字典键，TypeError；evidence_tables.failed.txt及corrected.txt保留；首次source保留为evidence_tables.failed.py。
- 路线辅助摘要首次假设所有brain都有options，KeyError；随后按存在字段读取完成，未修改原脑日志。
- 数字核证首次把含null的rollout_best_chosen计数与布尔计数相等，断言失败；fact-check.failed.txt保留，修为只认bool后60断言通过。
- 以上是本任务素材脚本/沙箱预检失败，不是游戏代码失败，不冒作tsc/vitest验收。草稿曾按原帧改正T8毒爆算式及HEAL总增154，尚未追加时已修正，无已发布勘误。
