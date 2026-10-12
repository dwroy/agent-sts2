原探索失败保留：

- 早期逐脑决策脚本直接索引chosen，在路线变更行遇KeyError: chosen；后续analyze.py统一使用get纠正，只影响离线脚本。
- 早期账本时点核对直接把ledger.read_rows元素当字典，遇AttributeError: tuple object has no attribute get；随后按(line, row)解包并完成ledger-at-start.json。
- 两次源码探索用旧目录名reflex/potion-values.ts及brain/map.ts等，rg报路径不存在；随后在src/knowledge、src/hand/screens、src/sim找到当前路径。
- 一次只读命令被沙箱启动时的并行临时目录消失阻断：ripgrep unreadable glob scan failed；未读到日志、未改文件，改为后续同类核验。
- 草稿曾误写SL证据sl1250，追加前核对原件为sl1373，已在草稿修正；原探索输出保留在调用历史。

- 首轮核验脚本把缺失sl_reloads的路线变更行也参加排序，None与整数比较失败；又因临时inspect.py遮蔽标准库inspect而打印原抽取结果。已将脚本保留为inspect_raw.py，核验只统计有该字段的行；失败stdout/stderr分别保留verification-first.out／err和verification-before.err。

- 追加后首次grep的内联字段打印脚本有括号不配对的SyntaxError，没有改正式复盘；改存grep_verify.py后重跑通过。完整原帧seek核验先已1055项全过，本次同样关键数字再次通过。
