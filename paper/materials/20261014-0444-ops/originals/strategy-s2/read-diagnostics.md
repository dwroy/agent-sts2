# 只读证据提取诊断原回显与恢复

首次query.py从本树查缺失派生库，工具原回显（复制保存）：
`{"error": "no log database at /home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-041302-s2/data/logdb: run tools/logdb/sync.py first"}`
退出1。未执行sync；后显式指向根目录已有派生库并保持--no-sync，poison-offset-query.json记录17行完整索引、exit0。

首次跨幕筛选用act_id+1，实际仍在F17/F33旧层且未回复；evidence-audit.initial.log与act-transitions.initial-act-id-screen.json保留16对零匹配。修正为F17→18、F33→34实际楼层接续后16对全匹配，并另读回32原帧，run.current_hp/max_hp与索引一致。初次敌HP字段hp为null，改为current_hp后重提取；初稿evidence-frames.initial-field-extraction.json保留。没有由这两项提取问题创造游戏反证。

只读检索agent/src/logdb、agent/src/hand/mod/parse.ts及agent/src/reflex/potion-values.ts时路径不存在；后来用实际agent/tools/logdb、原状态字段与当前生产源码核实。上述问题均为本批证据提取/定位过程，不是生产测试失败。无tsc、vitest或撤源码对照执行。
