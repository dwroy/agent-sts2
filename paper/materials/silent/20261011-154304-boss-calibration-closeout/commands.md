# 20261011-154304 静默校准刷新

任务性质：Roy 已授权的新功能校准刷新；fix-batch 仅为调度通道。

- 开工 git status 为空；合 main 仅 decision-log 追加冲突，完整保留双方记录。测试及精确暂存扫描通过后提交，SHA 见 merge-main-commit.txt。
- previous-live-trust.json 保存实际 live 原字节，cached-trust.json 为上批未发布候选。触发基准仍为实际 live，相对 live 新增47个实际结局，相对候选新增2个。
- 原 extract.py 使用既有 logdb-venv，按 SILENT、ended、A0–A10 全量提取；输出错误地指定目录，工具实际写入该目录的父级。本批将六个原产物原样移入 scratch/dataset，保留第一次模型准备的缺文件错误。
- prepare-pinned.py 核旧归档SHA清单，恢复固定模型 7e1193cef9467416bc10c8e344a49f4fd98390c7，核210项输入。只重放新增战斗及两个控制战，旧战结果严格匹配后复用。
- 在 pinned-model/agent 执行 nice19 node --import tsx tools/boss-sim/backtest.ts --character silent --in ../../dataset/fights.jsonl --out-dir ../../pinned-results --keys ../../replay-identifiers.json --samples 200 --seed 1 --starts t1,pre --no-rollout --game-data /home/dw/Projects/agent-sts2/data/game-data.json。保留完整输入行号以固定随机种子。
- audit-calibration-board.ts 核按进阶数值来源；audit-sources.py / seal-artifact.py 核来源原始偏移、长度、SHA及完整开场state。
- finish-pinned.py / seal-artifact.py 使用任务指定 refresh-silent.py 及 live --previous，附加 --dataset、--results、--provenance 固定模型输入。当前源码与固定模型有70个输入差异，不能用当前模型重放后冒称原实验连续验证。
- 原 bash tools/test-sandbox.sh 含tsc；Python12校准固定夹具；原8项调度固定夹具，包装仅补夹具所需临时工作树目录。PATH 加本机Node，TMPDIR位于scratch/tmp，所有重计算使用nice19，不调用真实LLM。
- 保留首轮沙箱失败：导入检查扫描了未隐藏的临时暂存副本。只将临时扫描目录改为既有隐藏约定后重跑原入口；不修改生产源码、测试或排除名单。
- 合main的首次gitleaks扫描命中4条已有假密钥测试文本，核实具体测试上下文后仅忽略其精确指纹重扫；原报告均保留。校准候选另行完整扫描。
- 新内容指纹目录只新增；旧目录、失败记录和报告保留。只经根目录 ledger.py 记fight/proposed及来源提交，不记shipped。
- check-live.py 持根ops/live-merge.lock核实；他人MERGE_HEAD存在时保留现场。若解除，必须继续锁内保存知识刷新（含新增文件）、重叠检查、预检、合固定源、合后自测、唯一版本及通知流程。

本批不修改费用、药水、保血、目标、SL策略阈值或其他角色数据，不修其他队列，不运行play、联网、安装依赖、停对局或推送。完整外部检查交实际发布后的调度器。
