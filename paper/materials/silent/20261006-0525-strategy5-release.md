# 已测策略观察的运维兜底上线

- 2026-10-06 05:31 固定学习者源307c538c6e66110635a852093aeba30b20212243，实际live代码合入d2febb8fef4387fb0fb035f3d525737dbd8fe583，固定发布21cd1ef1bb45628318f38176deb4fefb129a4223 / 树aa98e6e9fab2310cb2b9e8db98d39f6e1e4d1e59，唯一eval S1.strategy5。按04:41 strategy-done / 04:48 manual原交接，在05:25占锁批次完整检查结案后一次非阻塞取锁完成；此前preflight24、锁忙75等记录保留。未编辑策略源码或另设审核。
- 原提案及交接：learner/runs/20261006-041302-strategy-proposal/proposal.md、handoff-ops.md。仅转录学习者来源：2SU6XN2AEJRD SILENT A6 F12 T1及F15/F21/F36/F43事件、HMVJKM56S4Q8 SILENT A9 F31 T1；增加活动星图进房回血题面观察，原选项和数值投影保持、铁甲等价。未上线提案之外的数值路线修正或其他策略。
- 原源码固定沙箱tsc0 / 189文件2074例，撤源码5失败1通过 / 恢复6通过；本轮合后tsc0 / 190文件2094例、入口exit0，使用独立TMPDIR。原夹具失败历史保留，未借其他批次完整结果。
- live合前提交自动刷新07d9986c7afb601b2fa9cb4162d5f353085a0e8d，7项知识与其余源码/记录逐blob保留；只合三条源码/固定测试路径和双方decision-log历史。main同步d2dd403b66b9b2e16584740c1632d5f9c026e247，全部1012源码/测试blob与已测固定发布一致，其他2109项main blob保持；保留最新A9报告、复盘、台账和论文记录。未覆盖未提交后台文件，不停止对局/调度、不运行play。
- 仅经ledger.py/by=ops给silent-0148追加一次shipped/S1.strategy5，first_run=2SU6XN2AEJRD/A6、prior=partly及全部claim/evidence/repeat保持，0147/0019/0020和其他条目不重置。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 149 item(s), 0 problem(s)。仅从暂存账本快照刷新静默学习曲线，其他未提交账本和成本表不混入提交。
- 完整外部测试尚未完成，下一步通过白名单learner-recheck 20261006-041302-strategy-proposal请求；以调度器新learner-checks事件核实固定树，不提前报完整通过。

校验：

```json
{
  "merged_sandbox": {
    "path": "/tmp/sts2-0525-live-sandbox.log",
    "bytes": 491,
    "sha256": "56fc2bded6e21df203ab3f998f60f54c8cf9cdb5e90f775d949bd8d3c8216792"
  },
  "learning_curve_sha256": "eac93ec3e4017aab98fbd5f101be95eebcd12af13a1ec21fe354abb2dc836b81"
}
```
