# 本批复现入口

所有命令以 nice -n 19 运行，TMPDIR 指向本批 scratch；Node PATH 使用 ~/.local/node/bin；不调用真实 LLM。

1. 用 character_extract.extract(logs, db, scratch/dataset) 冻结全部已结束 SILENT A0–A10；原日志只读。
2. previous-live-trust.json 来自实际 live，cached-trust.json 来自上一未发布候选。运行 prepare-pinned.py 恢复原固定模型并核验210项输入SHA；运行 audit-sources.py 校验964个开场及新26条来源。
3. 在 scratch/pinned-model/agent 运行：

```bash
node --import tsx tools/boss-sim/backtest.ts --character silent \
  --game-data /home/dw/Projects/agent-sts2/data/game-data.json \
  --in "$TMPDIR/dataset/fights.jsonl" --out-dir "$TMPDIR/pinned-results" \
  --samples 200 --seed 1 --starts t1,pre --no-rollout --keys "$TMPDIR/replay-identifiers.json"
node --import tsx tools/boss-sim/audit-calibration-board.ts \
  "$TMPDIR/dataset/fights.jsonl" "$TMPDIR/opening-audit.json" \
  "$TMPDIR/first-hit-identifiers.json" "$TMPDIR/model-input-audit.json"
```

4. 运行 finish-pinned.py，经指定 refresh-silent.py 入口附带 --dataset / --results / --provenance 生成新结果，并校验切点、调参、Platt不变和双幂等跳过；不在当前变化的生产模型上重新拟合。
5. Python校准固定夹具12项、test-dispatch-fixtures.py调度8项；agent/ 原 bash tools/test-sandbox.sh（SANDBOX_WORKERS=1）。
6. prepare-records.py 经根目录 ledger.py CLI 登记 fight/proposed；发布锁检查、测试原文及最终状态见本批 closeout。

本批没有直接运行未附固定来源的全量当前模型回放；这是遵守任务“固定模型版本、新样本只延伸验证”的必要参数补充。缓存输入与原始行号相等、两控制战四起点完全复现（仅耗时不同）后才复用387场结果。
