# 静默 boss 校准刷新 20261011-182952

Roy授权新功能定期刷新；使用已有工具和上批同模型缓存，无生产代码改动。

- 开工status干净，git merge --no-edit main无冲突；base.txt固定基线。
- previous-live-trust.json取自实际live；cached-trust.json仅复用此前候选的固定模型结果，不充作已发布。
- nice19既有logdb venv运行extract.py --character silent --ascension 0 1 2 3 4 5 6 7 8 9 10，只读日志和索引。
- prepare-pinned.py核旧档及210输入SHA，恢复已发布模型；新增战和2控制战保留完整数据行号/seed1/200样本回放。
- pinned-model/agent内运行node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --keys ../../replay-identifiers.json --out-dir ../../pinned-results --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。
- audit-calibration-board.ts及audit-sources.py核monster-db进阶来源、原始状态offset/length/SHA/角色/完整资源和代码来源。
- finish-pinned.py和seal-artifact.py调用任务指定refresh-silent.py命令，附加--dataset/--results/--provenance固定模型输入；live --previous冻结切点，验证延伸，Platt一致性断言，内容指纹目录只新建。
- 固定Python12、调度8及原sandbox含tsc；nice19、最多4进程、TMPDIR位于本批scratch/tmp，不调用真实LLM或安装依赖。
- 锁内核实live后再合入；已有他人MERGE_HEAD时保留现场，来源/候选/合入/发布分别记录。
- 仅根ledger.py追加fight/proposed和来源提交；没有新combat/potion/sl/terminal/structure提案，实际shipped由运维登记。
- 一次只读shell调用在执行前遇到其他树临时目录消失引起的bubblewrap glob扫描失败；原错误见本会话工具输出，重试成功，无文件变更。
