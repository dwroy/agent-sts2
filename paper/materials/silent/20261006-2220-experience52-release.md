# 静默经验第52批上线记录

2026-10-06 22:24，处理22:20 experience-done 20261006-215635-experience-update。

- 学习者来源L704TLETMZBM SILENT A10/F48及21:54:40复盘勘误；源810fd2b4c41720994d8de15df554947ec34ec514→实际live 7e59494c399356373673b715c4cb853ff0851e80→固定发布6ac57ea6b407befa1e613cdb8d3e0be4880c3852/树cc8237e02317256fc7631a61f9275d51089f7f01，唯一S1.exp52指向实际合入。
- 沿学习者产出：经验.26→.27新增1、更新9（均补证，纯数字0）、退役0，active124→125、59995→55756字；压缩7条5165字，旧数字及证据完整保留。A8 118/52352、A9 119/52651、A10 120/53359条/字。
- 源与合后首轮tsc0/vitest0，各207文件2227例通过，无失败重跑；完整外部检查待本批learner-checks。240配对切片中位增量−918.5，整体中位3613→2761、最大7145→6212；本批64局采样池与上批不同，依本批配对结果记录。
- 七份自动知识刷新提交b98f5d7dfa22c2a7504805897134a42e51305b04在合并前保留，无知识重叠，其他知识blob不变；源只改silent/experience.json，无源码或生成器改动。main随后机械集成固定发布。
- 原第52节42984字节、10行proposed、回报与自测日志按原字节归档，SHA256见manifest.json；大审计文件原97900533字节保留任务目录，audit-origin.json记录路径和SHA256，不重复复制。
- 台账复用既有ID，其中0194为绷带机制；独立0193模型bug仍observed，已在修复队列，此批经验未修模型，不登记该bug shipped。/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 194 item(s), 0 problem(s)，随后仅CLI/by=ops登记本批10项shipped，原首证/先验/claim/证据/repeat及历史保持。
- 无新纯bug或Roy待定；后台产出和对局继续。
