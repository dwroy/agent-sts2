# 20261011-191305 静默 boss 校准刷新

Roy授权新功能，非bug-infra，不修其他队列或改策略阈值。

- 开工工作树干净；git merge --no-edit main，decision-log单处追加冲突机械保留双方，其他合并保持。
- 使用任务指定scratch、既有logdb venv、nice19/单worker，无网络/真实LLM/play。
- extract.py --character silent --ascension 0 1 2 3 4 5 6 7 8 9 10，日志及数据库只读。
- 复用上批prepare-pinned/finish-pinned/audit-sources/seal-artifact流程；固定live原模型210输入SHA、107调参keys和UTC切点。
- backtest.ts --character silent --in ../../dataset/fights.jsonl --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout：两控制战及新增战，使用完整数据行号。
- refresh-silent.py任务指定命令附加--dataset/--results/--provenance，保持固定模型；不拿当前源码重拟合。
- 新战SL died原事件与下一GAME_OVER/HP0双核，offset/len/SHA记录new-outcome-audit.json。
- Python校准12及原调度8固定夹具；沙箱原入口tsc+vitest，不改测试或排除名单。
- 合main前gitleaks完整staged扫描两处命中均是相同证据JSON的SHA256，逐字节重算证明后仅本次扫描精确指纹排除；原扫描/错误保留，不改变生产扫描规则。
- 根账本只经ledger.py追加fight/proposed和来源；shipped由运维确认。
