# 本批复现入口

本批是Roy授权静默boss固定模型校准刷新，经fix-batch通道回报。临时文件均在本目录。

1. 干净工作树执行`git merge --no-edit main`；仅decision-log追加冲突，保留双方全部历史，经原沙箱/gitleaks通过后提交。初始父见base.txt、main-incoming.txt，合并提交见merge-main-commit.txt。
2. 读取实际live静默boss-trust并保存previous-live-trust.json原字节；保存工作树上一候选cached-trust.json。cadence检查新增31次实际结局、最高A10，达到20次阈值。
3. 既有`data/logdb-venv/bin/python`调用`character_extract.extract(logs, db, scratch/dataset, ascensions=range(11))`，冻结已结束SILENT A0–A10；不更新LogDB。
4. `prepare-pinned.py`恢复已发布模型7e1193cef并核210输入SHA、缓存所有开场/回合一致。仅复制agent/src、boss-sim工具、common和静默数据，不读取铁甲角色知识。
5. 在pinned-model/agent运行`node --import tsx tools/boss-sim/backtest.ts --character silent --game-data <root>/data/game-data.json --in <scratch>/dataset/fights.jsonl --out-dir <scratch>/pinned-results --samples 200 --seed 1 --starts t1,pre --no-rollout --keys <scratch>/replay-identifiers.json`。保留全量原行号，重放两控制和两新战。
6. 同一固定模型运行`audit-calibration-board.ts`核开场按进阶数值来源；`audit-sources.py`核原始offset/len/SHA、严格SILENT/进阶及run-config版本来源。
7. `finish-pinned.py`调用指定`refresh-silent.py --scratch <scratch> --logs <root>/logs --db <root>/data/logdb --game-data <root>/data/game-data.json --previous <scratch>/previous-live-trust.json --out <worktree>/knowledge/characters/silent/boss-trust.json --report <worktree>/paper/materials/silent/boss-sim-calibration.md`。增加`--dataset <scratch>/dataset --results <scratch>/results.jsonl --provenance <scratch>/provenance.json`以保持固定模型。previous是实际live原字节且锁内复核；当前生产69项输入已不同，不混入该实验。
8. 既有venv执行`python -m unittest discover -s tools/boss-sim -p test_silent_calibration.py -v`；`test-dispatch-fixtures.py`运行8项固定调度夹具；每次提交前在agent/执行原`bash tools/test-sandbox.sh`（含tsc），保持固定排除名单。PATH加~/.local/node/bin，TMPDIR本scratch。所有后台命令nice -n 19，每任务不超过4进程。
9. `record-candidate.py`封存新内容指纹目录并经根目录`learner/ledger.py add`仅登记fight/proposed。`check-live.py <固定源码commit>`持根ops/live-merge.lock核现场；发现他人未完成合并就保留现场，不代其解冲突。
10. `closeout.py`封存报告、原始测试日志、来源和阻塞。暂存所有artifact/closeout文件（含默认忽略日志），逐SHA核实暂存树；用gitleaks扫描精确暂存副本后提交，带Co-Authored-By。经ledger CLI追加固定来源提交；最终result.json如实给实际合入/发布树/版本。完整外部检查由调度器在实际发布后补跑。

生产代码与策略阈值无变化；没有新策略经验需要独立代码提案，code_proposals与implementation_domains为空。不运行play或真实LLM，不联网、不安装依赖、不推送、不停对局。

首轮源码sandbox的check-imports.test.ts在递归遍历scratch时与其他测试临时目录删除发生竞态（sl-gaps-Abs7WO/stat ENOENT，2669通过/1失败），保留source-sandbox-attempt1.log/.exit。复跑仅将TMPDIR设为本scratch/.test-tmp；原导入检查已有跳过点前缀目录的规则，不修改任何测试/源码/固定排除名单。最终结果另存source-sandbox.log/.exit。
