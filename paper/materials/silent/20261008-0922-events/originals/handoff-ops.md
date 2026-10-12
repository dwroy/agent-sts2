# 实际发布交接

源码、合入和发布均已核实；学习账本只通过CLI记proposed，运维核发布后追加shipped。原早期失败/串行参考留存，不是游戏代码失败，也未用于拟合。完整外部检查交调度器。

```json
{
  "task": "fix-batch",
  "base": "54d5f6f42841b6e78ebe884d50bc9524960c257c",
  "merged": "96aeaf636a2b806c435db89673590f8229b22b58",
  "published_commit": "f89476513e37ba1bfe269f820f5147740adb5a67",
  "published_tree": "4a24dcd1a118a0b388310f2b44a93fddb4e9ca5b",
  "version": "S1.boss-calibration4",
  "commits": [
    "9d96afd014700b629c37fea0d05be766490fb3da",
    "96aeaf636a2b806c435db89673590f8229b22b58",
    "f89476513e37ba1bfe269f820f5147740adb5a67"
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261008-064306-silent-boss-calibration/report.md"
}
```

账本：silent-0283；kind=fight、status=proposed。只有静默boss-trust及新指纹档案/报告入源码，其他角色/游戏策略阈值未改；原刷新提交及所有检查SHA/日志见live-publication.json。
