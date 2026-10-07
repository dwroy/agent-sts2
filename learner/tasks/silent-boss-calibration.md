---
title: Roy 授权的静默 boss 模拟校准
effort.codex: xhigh
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.base_branch: main
default.merge: live
default.merge_dir: {{project_root}}/.worktrees/live
---
# 本批任务：独立实现静默 boss 模拟校准

本任务已经 Roy 明确授权，是独立的新功能批次。只完成本任务，不修其他队列 bug（包括 silent-0213），不要因 fix-batch 通道名称而换回纯 bug 任务。没有需要再次向 Roy 请示的校准方式；缺数据时保留低可信并量化不足。

定期批次：若 live 已有静默 `boss-trust.json`，先读取其 `refresh` 和固定 `split`；用 `nice -n 19 {{project_root}}/data/logdb-venv/bin/python agent/tools/boss-sim/refresh-silent.py --scratch {{scratch}} --logs {{logs_dir}} --db {{project_root}}/data/logdb --game-data {{project_root}}/data/game-data.json --previous {{merge_dir}}/knowledge/characters/silent/boss-trust.json --out knowledge/characters/silent/boss-trust.json --report paper/materials/silent/boss-sim-calibration.md`。使用已有 venv（不安装依赖），首次不传 `--previous`。新样本只延伸验证，切点和调参 keys 不移动；保存新内容指纹目录到 `experiments/boss-sim/silent/`，旧目录不覆盖。若实际不足升阶/20次结局事件则报告幂等跳过，勿另拟合或发布空版本。最终仍按本任务测试/live/台账流程完成，任务性质是授权新功能的校准刷新。

- 独占工作树：{{worktree}}
- 根目录：{{project_root}}
- 本角色：{{character}}；日志只读：{{logs_dir}}
- 所有临时产物：{{scratch}}
- 开工先 git status 确认干净，再 git merge --no-edit {{base_branch}}
- 合入方式：{{merge}}；目标：{{merge_dir}}

先在独占工作树确认干净并合main，读docs/boss-sim.md的B1.5及§6/§8、agent/tools/boss-sim/和experiments/boss-sim/已有流程；对照notes/fix-queue-v4.md最后“静默猎手 boss 模拟校准”节。只依据已结束的SILENT对局日志；不要补人写的机制或打法，也不要拿铁甲对局数据或校准参数混进静默样本。允许复用用户指定的既有boss模型代码和校准方法，铁甲行为／数据保持等价。

1. 提取静默全部A0–A10 boss战，含SL重打。按run.character严格筛选；约160场是任务估计，报告实际提取数、局号／boss／层／尝试／回合／版本与排除原因。跨进阶合并；boss血量、伤害、出招按monster-db按进阶数值输入，缺记录取最近一级；我方开场血量／牌组／遗物／药水取实际状态。保留来源和SL口径。
2. 时间切分：早约2/3调参、晚约1/3验证，验证覆盖后期代码版本。boss侧沿用铁甲阶段已有boss模型，仅重新拟合静默整体Platt“模拟胜率→实际胜率”；B2按第1回合起、B3按战前分别评估。固定切点、数据和模型版本，不用验证集调参。
3. 看A0–4、A5–9、A10残差；若有系统偏差，校准可加进阶项，仍用整体模型，不拆成单独进阶校准。A10独立报告，用户指出其最终boss后还有F49、数值部分由A9估：核对本角色日志后记录适用范围，偏差明显时A10先保持低信度。
4. 逐boss沿原准入标准：验证≥10场，校准Brier≤整体1.25倍，预测与实际胜率差≤15个百分点，被打穿的血模拟/日志比0.7–1.3。按B2/B3原标准出表；只让达标项进入knowledge/characters/silent/boss-trust.json，trust.py支持--character silent。不达标写明实际场数、还差多少场以及失败指标；不能只满足数量就标可信，不降低门槛。
5. 做定期重跑，例如升阶或新增20场boss战；保证阈值触发、幂等、版本／来源／旧报告留存与新达标自动入名单，明确多久／何种事件执行。只同步静默数据，不能覆盖其他角色或刷新中的知识。后台最多4进程并加nice，不停对局、不运行play、不调用真实LLM测试。
6. 结果写工作树内paper/materials/silent/boss-sim-calibration.md，保留提取／切分／拟合／残差／可信表与完整来源清单和不足场数。按学习台账正确kind及证据登记，不冒造bug-infra；仅CLI追加proposed和来源提交，shipped由运维确认实际发布后登记。记录哪些是Roy架构要求，哪些结论从静默对局得出。
7. 用固定数据覆盖角色隔离、切分／Platt／进阶残差、阈值／不足样本、B2/B3消费与定期刷新；先沙箱tsc+vitest通过，按下节锁内流程保存知识刷新、检查重叠、预检、合live、自测、登记decision-log和eval版本，失败保留原检查记录并按流程回退。不更改费用／药水／保血／目标／SL等策略阈值。

完成时沿现有fix-batch最终JSON协议回报task=fix-batch、fixes中明确item为“Roy已授权新功能：静默boss模拟校准”，逐项给源码、实际代码合入、固定发布树、版本、测试与账本id；它只是调度通道名，不把新功能冒标bug。无法完成的部分写明证据／样本／权限／合入阻塞，不虚构通过或把请求延期成等待Roy批准。自测通过就自行上线，不另设审核；完整外部检查交调度器。

## 测试、提交与 live 流程

遵守仓库 AGENTS.md、学习协议和 notes/ops-handoff.md 中的 live 流程；学习者自测后自行合入，不另设审核。只在上述独占工作树、scratch、经 CLI 追加的根目录学习账本和下面指定的锁内 live 路径写入。不要直接编辑根目录 notes/、ops/ 或其他会话的工作树。Roy 已授权在本工作树写论文报告、专用校准数据与实现代码。

每次提交前先在 agent/ 运行 bash tools/test-sandbox.sh（含 tsc）；PATH 加 ~/.local/node/bin，TMPDIR 指向 scratch；Python 校准测试也使用固定夹具。key 文件、.env、游戏二进制、Git hooks/config 均不可读改；不要 npm install，不调用真实 LLM，不推送，不停对局，不运行 play。后台任务 nice，最多 4 进程。使用全局 Git 身份，提交前 gitleaks，提交带 Co-Authored-By。

merge=live 时持有根目录 ops/live-merge.lock，等待刷新结束，先保存 live 中刷新知识（含新增数据文件），查双方改动重叠、预检，再合入自己的源码分支；记下合入前提交。合后 sandbox 测试通过、必要时按本角色重建并再次测试后登记发布。若失败，保留日志并回退本次代码合入，保留原刷新。date 后追加 decision-log；改变对局行为时写唯一 eval 版本。实际源码／合入／发布树、来源证据与台账交给运维，自己只经 learner/ledger.py 写 proposed，不冒标 shipped 或 bug-infra。

最后使用 fix-batch 回报 JSON，包含 base、fixes（item 明确“Roy 已授权新功能：静默 boss 模拟校准”、commit、test、fails_without_fix）、skipped、merged、tests；另给具体 boss 可信表、不足场数、A10 残差、定期刷新入口、报告路径、全部提交和固定发布树。task 字段保持 fix-batch 是为了接入现有完成事件与完整外部检查；任务性质仍是新功能。
