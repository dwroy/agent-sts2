# 本批复现入口

本批是Roy授权的静默boss固定模型校准刷新，经fix-batch通道回报。
临时产物全部位于当前scratch；离线提取/回放/测试使用nice -n 19，无真实LLM或联网。

1. 干净工作树运行`git merge --no-edit main`，结果Already up to date，基线见base.txt。
2. 读取实际live的boss-trust.json并留原字节previous-live-trust.json；cadence核实新增29次实际结局。
3. 项目现有data/logdb-venv/bin/python调用character_extract.extract(logs, db, scratch/dataset, ascensions=range(11))，冻结已结束SILENT A0–A10。
4. `prepare-pinned.py`恢复previous中的固定模型7e1193cef，核实210输入SHA及缓存开场/回合前缀不变。
5. 在pinned-model/agent运行`node --import tsx tools/boss-sim/backtest.ts --character silent --game-data <root>/data/game-data.json --in <scratch>/dataset/fights.jsonl --out-dir <scratch>/pinned-results --samples 200 --seed 1 --starts t1,pre --no-rollout --keys <scratch>/replay-identifiers.json`，2控制场和2新场重放，保留全量原始行号。
6. 同一固定树运行`audit-calibration-board.ts`核393个开场数值来源；`audit-sources.py`核967个原始开场offset/len/SHA、严格角色与进阶，并补run-config版本来源。
7. `finish-pinned.py`调用指定`refresh-silent.py --scratch <scratch> --logs <root>/logs --db <root>/data/logdb --game-data <root>/data/game-data.json --previous <scratch>/previous-live-trust.json --out <worktree>/knowledge/characters/silent/boss-trust.json --report <worktree>/paper/materials/silent/boss-sim-calibration.md`。
   额外传`--dataset <scratch>/dataset --results <scratch>/results.jsonl --provenance <scratch>/provenance.json`，沿既有流程固定模型；不调用默认的当前源码全量重放，因为当前生产树69项输入已不同。previous是实际live原字节，在发布锁内复核未变。Platt和选择结果逐项等价，新增仅验证；双幂等路径均不启动子进程。
8. agent/内使用既有venv跑`python -m unittest discover -s tools/boss-sim -p test_silent_calibration.py -v`；`test-dispatch-fixtures.py`运行既有8个调度固定夹具；`bash tools/test-sandbox.sh`内含tsc和原固定排除vitest。PATH加~/.local/node/bin，TMPDIR=scratch。
9. `record-candidate.py`保存新内容指纹目录，不覆盖旧目录；经根目录ledger.py CLI只登记fight/proposed。`check-live.py`持根ops/live-merge.lock核现场，有其他会话未完成合并时不写live；最终源提交后复核。
10. 候选及最终暂存内容分别经gitleaks目录扫描；提交带Co-Authored-By，经ledger CLI追加来源提交，完整外部检查交实际合入后的调度器。

本批没有新增生产代码或策略规则，不进行伪造的撤码bug红绿检查，不登记新代码提案或shipped。
