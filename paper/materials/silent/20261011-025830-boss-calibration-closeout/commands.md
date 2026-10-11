# 本批复现

任务20261011-025830-silent-boss-calibration为Roy已授权新功能定期刷新，fix-batch仅为调度通道。

1. 开工git status干净；git -c core.hooksPath=/dev/null merge --no-edit main为Already up to date，base见base.txt。
2. 保存实际live静默boss-trust原字节，读取refresh、split；新增36实际boss结局，达到20次阈值。
3. nice19项目data/logdb-venv/bin/python调用既有character_extract.extract，冻结全量已结束SILENT A0–A10；未读取铁甲角色知识。
4. prepare-pinned.py验证上一候选全部manifest、210个固定模型输入SHA，恢复已发布模型7e1193cef到本scratch/pinned-model。保持107调参keys和UTC切点。
5. pinned-model/agent内运行nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --out-dir ../../pinned-results --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。仅重放两个控制战和缓存外新战，全量行号/种子不变。
6. 第一次重放相对路径多一级，读keys时报ENOENT/exit1，未产生模拟结果；修正后重跑，初始log/exit移回scratch并保留为pinned-replay-path-failure.*。
7. 原audit-calibration-board.ts核开场monster-db来源；audit-sources.py核原始offset/len/SHA、SILENT及进阶；全部可用完整开场state与日志相等。
8. finish-pinned.py调用用户指定refresh-silent.py入口，额外传--dataset/--results/--provenance，--previous用实际live原字节快照。固定切点/调参/模型/Platt保持，仅扩展验证。同内容与更新previous后的门槛跳过均无拟合/模拟子进程。
9. 原12个Python固定夹具、8个调度固定夹具；agent/原bash tools/test-sandbox.sh含tsc，PATH增加~/.local/node/bin，TMPDIR为本scratch/tmp，nice19、每后台任务最多4进程，不调用LLM。
10. 新内容指纹目录保存到experiments/boss-sim/silent，不覆盖历史；仅根ledger.py CLI追加fight/proposed和来源提交。
11. 持根ops/live-merge.lock核实际live。如有他人MERGE_HEAD/未解索引则保留并记录，禁止将别人的未完成合并算成本批合入或回退。可合入时按保存刷新、重叠检查、预检、合入、合后测试、唯一版本流程发布。完整外部检查交调度器。

不修其他队列，不改策略阈值，不安装、不联网、不读取凭据或游戏二进制、不运行play、不停局、不推送。
