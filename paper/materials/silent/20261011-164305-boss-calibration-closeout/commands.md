# 20261011-164305 静默 boss 定期校准

本批沿用已授权新功能与既有工具，不修其他队列。

- 开工 git status 干净，合main仅decision-log末尾追加冲突；保存冲突原件并保留双方行，固定沙箱及暂存gitleaks通过后提交。
- previous-live-trust.json 为live原字节，cached-trust.json为上批候选；触发始终相对实际live。
- extract.py --character silent --ascension 0 1 2 3 4 5 6 7 8 9 10 --out <scratch>/dataset/fights.jsonl，使用既有logdb venv，只读日志和数据库。
- prepare-pinned.py核旧档SHA，恢复live模型，核全部210输入。新验证战与两场控制战用原完整数据行号、seed1、200样本重放，历史结果仅严格核对后复用。
- 模型回放：pinned-model/agent内 nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --keys ../../replay-identifiers.json --out-dir ../../pinned-results --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data <root>/data/game-data.json。
- audit-calibration-board.ts、audit-sources.py及seal-artifact.py核按进阶数值、原始offset/len/SHA、完整state及版本来源。
- finish-pinned.py、seal-artifact.py调用任务指定refresh-silent.py及live --previous，附加 --dataset、--results、--provenance固定旧模型与输入。只延伸验证，107调参keys、切点、Platt、模型选择保持；保存新内容指纹目录，旧档不覆盖。
- 原sandbox含tsc，固定Python12例和调度8例；PATH使用本机Node，TMPDIR在scratch/tmp，nice19且不超过4进程；不调用真实LLM、不安装依赖。
- 账本只经根ledger.py CLI记fight/proposed及source commit，shipped交运维核实际发布。
- live在根ops/live-merge.lock内核实，若已有他人MERGE_HEAD，保留现场。解除后继续锁内保存刷新含新增文件、重叠检查、预检、固定源合入、合后测试、唯一版本登记。
- 实际运行记录和退出码同目录保存，完成结果result.json。
