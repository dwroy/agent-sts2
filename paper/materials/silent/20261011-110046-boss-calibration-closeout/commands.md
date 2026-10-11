# 本批复现

本批为 Roy 已授权新功能的定期刷新，fix-batch 仅为完成事件通道。

1. 初始工作树干净。合 main 仅 decision-log 双方追加行冲突，保存原冲突并保留双方内容；main 同步提交前运行原沙箱测试与精确暂存快照 gitleaks。
2. 保存实际 live 的 Silent boss-trust 原字节，核 refresh/split：新增39次实际结局，达到20次门槛。
3. nice19、既有 logdb-venv 提取已结束 SILENT A0–A10 全量。首次启动受沙箱glob扫描错误阻断；原件 extract-launch-failure.txt 保留，同一命令重试完成。
4. prepare-pinned.py 核前候选 completed/audit manifest、恢复已发布模型7e1193cef，核210项输入SHA；401历史战/回合完全相同，107调参 keys/UTC切点固定。
5. pinned-model/agent 内运行 nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --out-dir ../../pinned-results --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。两个控制战和缓存外两场；保留完整行号。
6. audit-calibration-board.ts、audit-sources.py 核monster-db数值进阶来源、日志offset/len/SHA/严格角色和进阶；另逐对象核403场实际开场所有资源。
7. finish-pinned.py 调用指定 refresh-silent.py，额外传 --dataset、--results、--provenance，--previous 使用live原字节快照。保持原模型而非默认改用当前生产源码。核切点、调参keys、Platt/选择全等；两种幂等跳过无拟合/模拟子进程。
8. Python12校准固定夹具、调度8固定夹具和 agent/ bash tools/test-sandbox.sh（原排除表，包含tsc）。PATH加入~/.local/node/bin，TMPDIR在本scratch/tmp，均nice19，每后台任务最多4进程。
9. 新指纹目录保存 experiments/boss-sim/silent/，不覆盖旧目录；CLI只追加fight/proposed及来源提交，不造bug-infra或shipped。
10. 持根ops/live-merge.lock复核实际live。若有他人未完成合并，保持现场并回报；否则完成保存刷新、检查重叠、预检、合入固定源、合后测试、唯一版本登记。完整外部检查交调度器。

不修改生产源码、测试排除表、策略阈值或其他队列。不调用真实LLM，不安装依赖、不联网、不读凭据/游戏二进制、不运行play、不停对局、不推送。

为保持main合并检查期间知识文件不变，finish-pinned先输出scratch/candidate-boss-trust.json和generated-report.md；检查通过后核completed哈希，再逐字节同步本工作树指定知识/报告路径。

main合并整体diff --check报exit2，仅main带入的两份原始进程回执尾随空格；逐blob确认除decision-log外全部暂存内容与MERGE_HEAD一致，保留原件。decision-log定向检查通过。初次受阻与后续核验日志均留存，非代码或测试失败。
