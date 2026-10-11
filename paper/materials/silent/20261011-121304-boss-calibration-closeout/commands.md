# 本批复现与边界

任务为 Roy 已授权静默 boss 校准定期刷新，fix-batch 仅为调度通道。

1. 开工 git status --short 为空；git merge --no-edit main 返回 Already up to date。base.txt 保存固定起点。
2. previous-live-trust.json 为 live 原字节快照；cached-trust.json 为上一批未发布候选，仅复用相同模型的可验证模拟结果，不替代发布触发基准。
3. nice19 既有 logdb-venv 运行 agent/tools/boss-sim/extract.py --character silent --ascension 0 1 2 3 4 5 6 7 8 9 10；logs、db 使用任务指定路径，输出本 scratch/dataset/fights.jsonl。
4. prepare-pinned.py 核实旧内容指纹目录的两个 SHA 清单，恢复发布模型 7e1193cef9467416bc10c8e344a49f4fd98390c7，核全部 210 项输入；旧数据逐对象相同后，只重放新增战斗与两个控制战。
5. 在 pinned-model/agent 运行 nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --out-dir ../../pinned-results --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。
6. audit-calibration-board.ts、audit-sources.py 分别核 boss 数值来源及静默原始开场 offset/len/SHA；seal-artifact.py 逐项核完整开场 state 与原帧一致。
7. finish-pinned.py 和 seal-artifact.py 调用任务指定 refresh-silent.py，附加 --dataset、--results、--provenance 固定模型与模拟数据。未用当前变化后的模型重新拟合。--previous 使用 live 原字节及指定 live 路径，两种幂等检查保留。
8. Python12校准固定夹具、原8项调度夹具；调度包装仅创建各 feature 的临时工作树目录，不改断言或生产源码。agent/ 原 bash tools/test-sandbox.sh 含 tsc。PATH 加 ~/.local/node/bin，TMPDIR 为本 scratch/tmp，工作进程 nice19。
9. 指纹目录只新增不覆盖；CLI 只记 fight/proposed 与来源提交；精确暂存文件快照经 gitleaks 后提交。
10. check-live.py 在根 ops/live-merge.lock 内核合并现场；他人 MERGE_HEAD 存在时保留现场。若解除，按保存刷新（含新增数据）、重叠检查、预检、固定源合入、合后测试、唯一版本和通知流程继续。

本批不改生产代码、策略阈值、其他角色数据或其他队列，不运行 play、真实 LLM、联网、安装依赖、停对局或推送。完整外部检查交实际发布后的调度器。
