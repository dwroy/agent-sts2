# 本批复现

本批为 Roy 已授权新功能的定期刷新，fix-batch仅为调度通道。

1. git status --short为空，git merge --no-edit main返回Already up to date。固定base见base.txt。
2. 读取live的refresh/split，保存previous-live-trust.json。新增42次实际结局，满足20次门槛。
3. nice19既有logdb-venv运行extract.py --character silent --ascension 0 1 2 3 4 5 6 7 8 9 10，--logs/--db为任务指定绝对路径，--out本scratch/dataset/fights.jsonl。
4. prepare-pinned.py验证旧缓存全部SHA、恢复已发布7e1193cef模型及210个输入SHA。首次误在提取完成前准备，缺文件exit1保留；待提取exit0后重试通过。
5. pinned-model/agent中运行nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --out-dir ../../pinned-results --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。
6. audit-calibration-board.ts和audit-sources.py核角色、开场offset/len/SHA及按进阶monster-db；另逐对象核406场完整开场state等于原始日志。
7. finish-pinned.py调用refresh-silent.py，任务指定参数加--dataset、--results、--provenance以固定已发布模型；--previous为live原字节快照。再次用指定live路径和输出路径调用入口，核内容幂等。切点、107调参keys、Platt/模型选择保持。
8. Python12校准固定夹具、调度8夹具、agent/原tools/test-sandbox.sh含tsc，PATH加~/.local/node/bin，TMPDIR为本scratch，全程nice19、单任务最多4进程。
9. 保存新指纹目录、完整来源及报告；CLI只登记fight/proposed及来源提交。gitleaks扫描精确暂存快照后提交。
10. 持根ops/live-merge.lock复核。若他人未完成合并保持现场；否则完整保存刷新/重叠/预检/合入/合后测试/唯一版本流程。完整外部检查交调度器。

没有生产代码、策略阈值、其他角色数据或其他队列修复。不运行play、不调用真实LLM、不联网、不装依赖、不停对局、不推送。
