# 本批复现入口

本批为Roy授权的静默boss固定模型定期刷新，不是纯bug任务。
全部临时产物位于本批scratch；模拟/测试nice -n 19，使用已有依赖，无真实LLM。

1. character_extract.extract(logs, db, scratch/dataset)只冻结已结束SILENT A0–A10。
2. prepare-pinned.py恢复live固定模型7e1193cef并校验210项输入，核缓存与新提取前缀一致。
3. pinned-model/agent内执行backtest.ts --character silent --samples 200 --seed 1 --starts t1,pre --no-rollout --keys <scratch>/replay-identifiers.json；全量数据行号保持，仅两控制战和新战重放。
4. 同树audit-calibration-board.ts核全部开场来源；audit-sources.py核原始状态offset/len/SHA与本角色进阶。
5. finish-pinned.py调用指定refresh-silent.py --scratch <scratch> --logs <root>/logs --db <root>/data/logdb --game-data <root>/data/game-data.json --previous <scratch>/previous-live-trust.json --out knowledge/characters/silent/boss-trust.json --report paper/materials/silent/boss-sim-calibration.md；额外传--dataset、--results、--provenance保持旧模型和拟合输入不变。previous为本批开始实际live原字节，锁内复核未变。幂等两路径均不启子进程。
6. Python12校准固定夹具、调度8固定夹具、agent/tools/test-sandbox.sh；第一次沙箱工具启动在执行shell前因并行工作树glob消失失败，原错误单独保留，未改测试命令后重试。
7. 经根目录ledger.py add/update仅登记fight/proposed和来源提交；原live-merge.lock下查刷新/重叠/预检/合入/测试/版本。若有他人未完成合并，保持其现场并报告阻塞。
