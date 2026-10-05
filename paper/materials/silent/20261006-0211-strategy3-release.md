# 策略批次 20261006-014301 运维核实

- 2026-10-06 02:14 strategy-done exit0。源1dab14da481fe7951d9020dba52ad0ebebb1029b，live实际合入eba51d369487f199b29c2d1b06fdf43d3077c9b4，发布f75162d80cf20fc2f62cd4846dd415118c275cad，固定树5aec56f0d3536c2aede3e83a775d2ef1e635659f；全部为live祖先，S1.strategy3唯一且指向实际合入。
- 来源：learner/runs/20261006-014301-strategy-proposal/proposal.md、report.json、handoff-ops.md；9YT51CK8RC39 SILENT A7/F17，第3与6次/T5，silent-0135（关联0079/0080）。本批三条原learner proposed只作归档，实际shipped另经CLI登记。
- 学习者实现：为已列长程并列组补充即时净损血差额、参考排名及同值并列，仍由Jev选择；学到的事实与分析见原提案，不自行添加游戏知识。其他待定策略保持原提案的证据不足状态；不宣称整场替代胜负，铁甲行为等价。
- 源与合后固定沙箱tsc0、各183文件2048例，撤生产接线exit1（1失败/5通过），恢复exit0（6通过）。检查摘要及原日志SHA256：{"live-suite": {"cases": 2048, "files": 183, "sha256": "8a8c8a21be1cc2ef0ff17d135cbf4f99f69904b91b990067406b4e3a69d26cf6"}, "source-suite": {"cases": 2048, "files": 183, "sha256": "7b8daf547ecbd2b106c0b37c87f6cac99b58e3af69a17eccd06e130eada7055a"}}。初夹具错误/校正和最终只读status校正保留原日志，不冒作源码回退。
- 调度器完成时状态：{"checks_live_head": null, "checks_pending": true, "checks_rc": null, "checks_tree": null, "merged": "eba51d369487f199b29c2d1b06fdf43d3077c9b4", "state": "done"}；完整外部检查结果交后续learner-checks，不等待、不重复派发或提前声明通过。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 137 item(s), 0 problem(s)。
- 之后机械同步固定已测发布至main，保留main最新复盘、论文表及历史；不修改live的在线刷新或运行进程。

- 2026-10-06 02:16 完成：原三条learner proposed归档fbf721092da2bdd8a9a9d2bb85b10e161efd125c，main固定发布集成4a4cbca35dec26ebda9aa1a7c965283bfaf082a2；991项源码/测试blob等同已测发布、2072项其他main文件保留，双方decision-log与七项刷新保持。经learner/ledger.py/by=ops追加唯一silent-0135 shipped/S1.strategy3；first_run=9YT51CK8RC39、prior=partly、原evidence保持，0079/0080未更新。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 138 item(s), 0 problem(s)，静默学习曲线已刷新。完整外部检查仍交后续事件；本轮没有重复合live、创建新版本、改游戏知识或停止进程。

## 2026-10-06 02:31 完整外部检查确认（02:26事件）

调度器固定发布 `f75162d80cf20fc2f62cd4846dd415118c275cad` / 树 `5aec56f0d3536c2aede3e83a775d2ef1e635659f`，完整 tsc + vitest exit0；234文件、2856例通过、2例跳过（共2858）。main/live祖先及fallback映射均核对，checks_pending=false。日志 `ops/codex-ops/learner/20261006-014301-strategy-proposal.fallback-5aec56f0d3536c2aede3e83a775d2ef1e635659f.checks.log`，60368字节，SHA256 `a9c28746866a9452c9f4450f58d0bd783a1080ec9aa3d1f5f55b7d0ba2623386`。

```text
Test Files  234 passed (234)
Tests  2856 passed | 2 skipped (2858)
Start at  02:09:05
Duration  540.61s (transform 7.47s, setup 13.16s, import 32.53s, tests 1002.81s, environment 24ms)
```

02:11登记的S1.strategy3和0135 shipped保持，完整补测待办关闭；原夹具失败/撤接线失败历史保留。此结果不替代经验第28批的独立完整检查。
