# 本批复现

任务 20261011-032502-silent-boss-calibration 为 Roy 已授权新功能的定期刷新；fix-batch 只是完成事件通道。

1. `git status --short` 为空；`git merge --no-edit main` 返回 Already up to date。固定基线见 base.txt。
2. 保存实际 live 静默 boss-trust.json 原字节，核 refresh 和固定 split。已结束 SILENT 日志新增 37 次实际 boss 结局，达到 20 次门槛。
3. 使用 nice19 和既有 data/logdb-venv/bin/python 调用 character_extract.extract，冻结全部已结束 SILENT A0–A10；数据在本 scratch/dataset。TMPDIR 指向 scratch/tmp。
4. prepare-pinned.py 核上一候选 completed/audit manifest，恢复已发布模型 7e1193cef 到本 scratch/pinned-model，逐项校验 210 个输入 SHA。400 场旧数据及回合全等，保持 107 个调参 keys、UTC 切点和全部行号。
5. pinned-model/agent 内执行 nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --out-dir ../../pinned-results --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。重放两个控制战和缓存外 L38NLY1XJ7VU F17 第二试。
6. 同一固定模型 audit-calibration-board.ts 核 monster-db 开场/攻击进阶来源；audit-sources.py 核原日志 offset/len/SHA、严格角色和进阶；所有 401 个完整开场 state 与原始日志逐对象相等。
7. finish-pinned.py 调用指定 refresh-silent.py，额外传 --dataset、--results、--provenance；--previous 使用 live 原字节快照。这样保持已发布模型，避免默认入口改用当前源码重新拟合实验。107 调参 keys、切点、Platt、模型选择保持，新样本仅延伸验证。核验完整产物幂等跳过、更新 previous 后不足阈值跳过，均无模拟/拟合子进程。
8. 原 12 个 Python 校准固定夹具、8 个调度固定夹具；agent/ 原 bash tools/test-sandbox.sh 含 tsc，PATH 加 ~/.local/node/bin，TMPDIR 为 scratch/tmp，nice19，每后台任务最多四进程。不调用真实 LLM。
9. 新内容指纹目录保存到 experiments/boss-sim/silent，保留所有旧目录；本批账本仅通过根 learner/ledger.py CLI 追加 fight/proposed 和固定来源提交。
10. 持根 ops/live-merge.lock 核实 live。若存在他人 MERGE_HEAD/未解索引，保留现场并记录；无本批合入可回退。可发布时按保存知识刷新（含新增文件）、检查重叠、预检、合入固定源、合后测试、登记唯一版本的流程继续。完整外部检查交调度器。

只读摘要脚本最初误取 provenance 字段造成 AttributeError，未改变数据；更正为 source 后验证通过。说明见 inspection-failure.txt。生产源码、测试排除名单和策略阈值保持，不修其他队列，不安装依赖、不联网、不读凭据/游戏二进制、不运行 play、不停局、不推送。
