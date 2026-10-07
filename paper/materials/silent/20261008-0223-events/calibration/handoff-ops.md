# 实际发布交接

源码、合入和发布均已核实；学习账本只通过CLI记proposed，运维核发布后追加shipped。原早期失败/串行参考留存，不是游戏代码失败，也未用于拟合。完整外部检查交调度器。

```json
{
  "task": "fix-batch",
  "base": "270d8dd577f1380419c6dcd0b9bbf12e9a99f59b",
  "merged": "e6cd55b01bf0f1c8635154f4d842a49de0c7e71c",
  "published_commit": "03f4ffe017f886f9ee92be50911a318f5f90f4bd",
  "published_tree": "edca1e8e2761c6cdbf406578c2ac7b51fb9f4a51",
  "version": "S1.boss-calibration3",
  "commits": [
    "918e99d84739f9c73f713d2290b89e12062c5231",
    "e6cd55b01bf0f1c8635154f4d842a49de0c7e71c",
    "03f4ffe017f886f9ee92be50911a318f5f90f4bd"
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261007-232530-silent-boss-calibration/report.md"
}
```

账本：silent-0269；kind=fight、status=proposed。只有静默boss-trust及新指纹档案/报告入源码，其他角色/游戏策略阈值未改；原刷新提交及所有检查SHA/日志见live-publication.json。
