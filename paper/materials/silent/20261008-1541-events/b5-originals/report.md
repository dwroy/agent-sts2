# 静默／女王 B5 校正批次 20261008-112135：rejected

本批没有合格源码候选。冻结女王实际结局 15 场，调参 8 场、验证 7 场（3 胜 4 败），距离原 B5/B2 准入的至少 10 场还差 3 场。同 base 配对不声称校正收益；原验收拒绝，无 live 合入、无版本、无可信名单修改。

Roy 2026-10-07 12:11/12:35、notes/fix-queue-v4.md B4/B5 标准流程与 docs/boss-sim.md §13/14 已授权本批核实和验收。不可变证据 key/SHA256：`5f73178b469f5f5abe6117d96f8df4a8d3c13b3201263c2413f5ce7f1e2d2267` / `6661d598df1747524ca8eb5d65dfdb64f8078e9dcfd351f50ed36ce693f6c77f`；dispatch_base、source head 均为 `261af56e0022cc0012b80870bd3f52bd121d45c2`。启动工作树干净，live 与该 base 相同，合 live 返回 already up to date。之后没有改动生产源码或验收工具。

原根目录 ledger CLI 登记 rejected：`silent-0298`；kind=fight，触发局/回合和局号来源在请求与回执。独立分支 `boss-sim-silent-queen-20261008-112135` 保留，不把 rejected 写成 shipped。运维/调度完成通道复核验收并管理十场新实际战斗和新校准冷却，本报告不冒报后续事件。

## 冻结输入与实际结局

冻结 127 个已结束 SILENT 局、582 个 boss 尝试、233 个可用开场（169 won、64 died）。348 次 predicted_death（含一场同时缺开场）与另 1 次缺首回合手牌排除。原调参 107 个 keys 和 UTC 切点 2026-10-06T02:46:11.648000 不变，验证 113→126；13 个新增开场只进 val，没有整局/牌组跨两侧。

女王 54 个 SL 尝试：39 predicted_death 截尾、8 won、7 died；所有 15 个实际结局均可用。原触发小集 13 场新增 PD9AYQVMLQW6 F48 won、9R916WW0V65N F49 died，两场同时进入配对两侧且仅进验证。F49 独立，不把 F48 胜当通关。39 次截尾 end_hp=null，不根据最后仍有血的帧推断死局。

实际胜败由原 SL/结束证据核实；原提取器对 died 取 end_hp=0，对 won 取最后日志帧、SL 上报、同楼层后续帧中已知血量的最小值，保留战后治疗和漏末帧的边界。queen-terminal-hp-audit.json 同列原末帧/上报/提取器端点；13/15 的提取器端点与 SL 上报相同，未手工替换另外两场。

原 states/decisions/SL 的字节 off、len、SHA256 与哈希核验留存 queen-states.compact.json（632 帧）、queen-decisions.inventory.json（622 行）、queen-sl-byte-audit.json（54 行）、queen-censor-source-integrity.json（54 个开场原字节核验）。触发 7 个死亡局、最近 20 局中的 3 个死亡局和 evidence key 均按原角色日志复算，见 trigger-audit.json。

## 同数据、同源配对验收

使用原 backtest.ts，每起点 200 样本，seed=1+fights 原始行号×101，t1/pre。基准全量 466 行；after 女王原入口另重放 30 行，其他 boss 436 行按键与固定模型 SHA 核对后复用当次基准。复用不是沿用旧小集档案。仅墙钟 sim.ms 不参与语义比较；所有差异留存 pair-integrity.json：0 项。

基准由已完成原串行前缀 276 行（138 场）与原 runner --keys 的两组剩余 48/47 场串行重放拼成。两组键互斥、补齐全部 233 场；各调用保留完整 fights 文件，选择发生在原 runner 内，原行索引 seed 不变。before-partition.receipt.json / before-assembly.receipt.json 保存分区、固定前缀原字节 SHA 和完整输出 SHA。原整批串行记录单独保留、不假称其提前完成；旧等待协调器的输出路径与日志 inode 改名映射在 history.json，未向对局/调度或重放进程发送信号。

dataset SHA256=`6f1fec4aaff48d37f82ad491fce44359031e94771382f2f48bd5dd981cfe3482`，sources SHA256=`4473d51a2ba21061f95098f52e32cc38e414b3bb6312ae88dc5c8ca148c548e3`，turns SHA256=`49ee3b6a44ce6732cd7d2d92df38d2577dda70fcf3fe2a58bdec3f8a5e71cec5`。before/after split、数据、结局和逐回合覆盖相同；两份 trust.py 自然拟合整个 tune 的全局映射，验证不拟合。模拟失败原行保留，不补造概率。

| 起点 | 女王验证 n / 打穿回合 | before→after Brier | 预测→实际胜率（两侧） | 打穿比 before→after | 整体验证 Brier before→after |
|---|---|---|---|---|---|
| t1 | 7 / 30 | 0.2812→0.2812 | 0.787→0.429 | 0.919→0.919 | 0.1182→0.1182 |
| pre | 7 / 30 | 0.2843→0.2843 | 0.757→0.429 | 1.036→1.036 | 0.1155→0.1155 |

原 trust.py 的女王 T1 失败项：`['n', 'brier', 'gap']`；可信 B2：`['KAISER_CRAB', 'CEREMONIAL_BEAST', 'KNOWLEDGE_DEMON', 'LAGAVULIN_MATRIARCH', 'SOUL_FYSH', 'WATERFALL_GIANT']`。原 immutable acceptance.py rc=1，拒绝原因 `['B5 has not met original B2 trust admission', 'no bias entered/approached its fixed standard']`，strict improvement=`[]`。

原验收从 dispatch_base 提取固定 runner，对同 base 的实盘 solver/五回合 14 个固定输入逐字节重放：passed=True，SHA256=`1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`，保护源码差异 `[]`。没有候选字段、没有需证明的实盘/五回合读路径新增，铁甲源码和行为保持同 base 等价。

逐回合原 per-turn.py 的两侧 tune/val、t1/pre 八份 JSON 和日志完整归档；实盘第一/最后帧状态与意图另存 queen-turn-boundaries.json，不把不同 SL 尝试拼成一条预测序列。

## 调参侧机制与模拟策略

35 个敌人/招式/已观察进阶组的攻击反解固定在 fixed-hit-mechanic-fixtures.json。ZZMYZ5UBCG72 A2 持有 PAPER_KRANE，原自身 relic 文本和攻击支持其弱化倍率 .6，其他条件按现有 .75 公式核对；初稿统一 .75 的冲突保留 tune-hit-inversion.json。扣除 PIERCING_WAIL_POWER 临时力量恢复后，26 次 Burn Bright 转换均净增 1，原 before/after 字节证据与未调整 +7/+9 数据均保留。

现有整场模型固定攻击/力量推进存在进一步核对方向；本批只保存本角色、已观察条件证据，没有把它推到未知进阶、共享五回合或铁甲，也没有以单局概率偏差证明机制因果。无生产机制夹具/候选撤码红绿对照；不伪称 fails_without_fix=true。

只在原 tune keys 探索原 runner 支持的 QUEEN threat=1/2；各 8 场×两个起点×200 样本。全局映射和 whole-run 3-fold OOF 都只使用 tune；未以验证选择参数，release_selection=null。两个加强 threat 的试验都降低打穿比，但 T1/pre 的女王 OOF Brier 均比 base 更差，因此没有形成合格源码候选。214 个调参起点完成后的初次分析与完整回放后的分析分别保留，不覆盖早期结果。

| threat | 起点 | tune 女王 n | 原始 Brier | 女王 tune OOF Brier | 全体 tune OOF Brier | 打穿比 |
|---|---|---|---|---|---|---|
| 0 | t1 | 8 | 0.2972 | 0.162084966070571 | 0.11263481033515307 | 1.495 |
| 0 | pre | 8 | 0.2636 | 0.18470183762907433 | 0.1147161420369817 | 1.526 |
| 1 | t1 | 8 | 0.3072 | 0.16415091481986657 | 0.11279325263007342 | 1.477 |
| 1 | pre | 8 | 0.2759 | 0.1854680222527302 | 0.11478624594294377 | 1.484 |
| 2 | t1 | 8 | 0.3129 | 0.16506666819214266 | 0.11284815800172031 | 1.468 |
| 2 | pre | 8 | 0.2771 | 0.18544729558725964 | 0.11477165906428544 | 1.441 |

## 实盘整场预测与 B2 排序覆盖

原实盘预测覆盖 8 个实际尝试、39 回合；历史 chosen-line Brier=0.082550。历史 T1 7 场，预测 .470714、实际 .285714、Brier .134228；第一可用预测按场 8 条 Brier .117449。历史模型版本、样本 150–1200 和超时记录均保留，不能替代本批固定 200 样本校准。39 个回合中 19 个选择首线，35 个在两个配对 SE 内。各场首个预测平均校准差 .0035，是模型分歧，不是实盘胜率收益，不跨回合相加。

新固定排序输入覆盖 8 个首次可用点、69 个同尝试/回合原状态候选，以原 fingerprint 精确匹配。仅 2/8 组能重构全部原选项；缺任意选项即跳过，不缩选项宣称收益。原记录缺 seed/逐样本 outcomes，重放使用原默认 seed=7、200 配对样本、无墙钟截断、原 compareLines 与两 SE 并列后存活 HP 中位数口径。

VLV17NUSFS61 F48 T1（tune）最佳 plan4、原选 plan5，差 .005、配对 SE .005，仅 1 个“最佳胜而原选败”的样本，仍是胜率并列；XTSV1U9JD34T F49 T2（val）原选 plan3 和最佳 plan1 的胜败/血量完全并列。其余 6 组原选项缺失逐项归档，不能得出整体验证排序收益。

## 原检查、失败历史与保存路径

原入口 `nice -n 19 bash tools/test-sandbox.sh`，PATH 加 ~/.local/node/bin，TMPDIR 为本批目录，SANDBOX_WORKERS=1；tsc=0、vitest=0、固定测试 2608 例，原总 rc=0。固定排除名单未改，不安装依赖，不运行 play，不停对局/调度，不联网或读取游戏包、key/.env。外部完整检查沿调度器原通道，本批不冒报。

全部初稿失败保留 history.json、各原日志、tool-failures.original.jsonl/index.json：extraction wrapper cutoff 字段错误退出 1；初次根目录 tsx 调用模块缺失退出 1；排序时间过滤初稿/不完整选项/精确生成方案尝试保留；报告括号笔误退出 1；排序回执变量遮蔽 wrapper 退出 1（原重放 rc=0）；沙箱启动扫描撞并行临时文件消失，命令未启动、只读重试后成功。没有改弱调度/验收/断言，也没有扩范围。

原验收：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261008-112135/learner/runs/20261008-112138-boss-sim-batch/acceptance.json`；原检查：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261008-112135/learner/runs/20261008-112138-boss-sim-batch/test-sandbox.original.log`。固定完整档案：`experiments/boss-sim/silent/99bff6635a8f502f58e11b0ae9de3c3775da20cb9f66c124040fc6def4b94d09`，manifest SHA256=`2302794640c8049e3b05d760399a3660f4a7c855f6e13393571cb43ea4c952c8`，184 个文件。sources/fights/turns、split、两侧 provenance/results/trust、tune 试验、原字节审计、隔离输出、失败历史和固定角色/公共模型输入均保留；旧目录未覆盖。

最终回报：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261008-112135/learner/runs/20261008-112138-boss-sim-batch/report.md` / `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-queen-20261008-112135/learner/runs/20261008-112138-boss-sim-batch/report.json`；源码 commit=`261af56e0022cc0012b80870bd3f52bd121d45c2`，无候选则沿原 base 回报，merged=null、version=""。升级小结仅追加自己工作树 notes/silent-climb-report.md 引用。

首次覆盖验收原 rc=1、原因 overall validation coverage mismatch；临时 finalize helper 误读未完成的旧串行输出。该版本的 helper、两侧档案、逐回合文件和验收均以 coverage-path-initial 名保存。仅修正临时输入路径指向已验证的 466 行基准后，原 trust/per-turn/acceptance 再跑，整体 n=126、女王 n=7/30 个打穿回合完全一致，原验收仍 rc=1，最终拒绝原因 B5 has not met original B2 trust admission / no bias entered/approached its fixed standard。

提交前对本批188个暂存文件原blob运行gitleaks，初次rc=1的两项均为已按不可变触发元数据复算的 evidence.key SHA256（evidence.original.json/startup.json 的精确行），不是认证材料；原扫描完整保留。仅对这两个文件的该精确64位值作临时扫描例外，默认其他规则保持，重扫rc=0、无其余发现。原扫描、核实、临时配置、范围和回执见本批 gitleaks.initial.json / gitleaks.false-positive.json / gitleaks.exact-evidence.toml / gitleaks-scope.json / gitleaks.receipt.json；未改项目验收或调度工具。

完成复核：独立记录提交 b3b3098b0f9b864ca3b72bcbc6eb62937147a24f（仅档案与记录）；尾部两组原进程实际收集退出码均为0，补记 before-tail-0/1.exit-collected.json，不改原快照回执。证据文件SHA、dispatch_base、原验收工具SHA、两侧trust SHA/覆盖/指标和保护源码等价再次核实，见 completion-verification.json。
