# 本批复现

本批20261011-024306-silent-boss-calibration属于Roy已授权新功能定期刷新，fix-batch仅为调度通道。

1. 开工工作树干净，git merge --no-edit main返回Already up to date；base见base.txt。
2. 保存live静默boss-trust原字节、refresh与split；新增35个实际boss结局，触发20次阈值。
3. 使用项目data/logdb-venv/bin/python、nice19，以现有character_extract.extract全量冻结已结束SILENT局。未读取其他角色知识。
4. prepare-pinned.py核上一候选指纹、210项固定输入SHA，保持7e1193cef模型和107调参keys/UTC切点。首次提前读取提取结果报FileNotFoundError/exit1；原脚本/日志保留，提取完成后续跑成功。
5. pinned-model/agent中node --import tsx tools/boss-sim/backtest.ts --character silent --in <dataset/fights.jsonl> --out-dir <pinned-results> --keys <replay-identifiers.json> --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。全量行号和逐战种子保持，仅两个控制战和8S9RNHFU5XF1/F17新增缓存外战重放。
6. audit-calibration-board.ts核399开场来源，audit-sources.py核978原始offset/len/SHA与角色、进阶；全部399可用完整开场状态与原日志相等。
7. finish-pinned.py调用用户指定refresh-silent.py，额外传--dataset/--results/--provenance，--previous指向live原字节快照。固定切点、调参、Platt/选择不变；重复指纹与更新previous阈值跳过不启子进程。
8. 原12个Python校准、8个调度固定夹具；agent/原bash tools/test-sandbox.sh含tsc。PATH增加~/.local/node/bin，TMPDIR仅本scratch/tmp，nice19，进程上限4，不调用LLM。
9. 原件存新experiments/boss-sim/silent/<内容指纹>目录，不覆盖旧目录。只经根ledger.py追加fight/proposed及来源提交。
10. check-live.py持根ops/live-merge.lock检查。若有他人未完成合并，保留索引/刷新，不启动自己的合并；最终回执如实给出source、实际合入/固定发布树/版本。无新发布不建空eval版本；完整外部检查交实际发布后调度器。

仅静默校准数据、报告与审计记录；不修其他队列、不改费用/药水/保血/目标/SL阈值，不安装、不联网、不运行play或推送。
