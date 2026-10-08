# silent / AEONGLASS B5 校正验收：rejected

批次 `20261008-071204-fix-batch`。冻结扩充和复核已完成；没有可证实的 fullFight 源码校正候选，B5 原准入标准未通过，保留独立分支与档案。未合 live，未新增 eval 版本。此报告不是已上线修复或实盘胜率提升。

不可变 dispatch_base `c1dd721fe682910095768eb4007cb836b6991152`；无候选，所以验收 head 与 fixes.commit 同为该基准。初始工作树干净、合 live 为 Already up to date，启动前保护源码无变化。证据 key `4129cbd40c4d414f11ffb12be6c126e14e6455df45540cf8c25ae2c18e7ccc9c`，按调度器原 JSON 序列化重算一致；证据文件 SHA256 `203343dc53c1d7cc8062b114165fdb64dcd2ca2f69dd40a6d13261488472ee78`。

授权为 Roy 2026-10-07 12:11/12:35、根目录 notes/fix-queue-v4.md「B4 / B5 纳入标准流程」和 docs/boss-sim.md §13/14 及自动批次原准入流程。授权是执行方法，不提供游戏机制；下列事实全部从本角色日志复核。

冻结截止 `2026-10-07T23:10:58.949Z`，实际结局且有首回合帧共224场。原107个 tune keys、UTC切点 `2026-10-06T02:46:11.648000` 和原93个 val keys逐项不动；新11局24场全部进val，共117场。角色均显式SILENT，F49独立记战；实际结算尝试的胜率不等于初试胜率或SL后的整局胜率。

AEONGLASS有17场实际结局（12败5胜），10 tune / 7 val，52次 predicted_death 是SL截尾，不当成实死。原14个逐回合键全部保留。各回合原始字节偏移、长度、SHA256、血量、敌意图/状态和SL实际结局在 `evidence-audit.json`、`raw-turn-audit.jsonl.gz`、`dataset/sources.jsonl`、`aeonglass-sl.jsonl`。原日志逐回合覆盖为 `{"tune": {"1": 10, "2": 9, "3": 9, "4": 9, "5": 9, "6": 9, "7": 9, "8": 8, "9": 6, "10": 6, "11": 5, "12": 3, "13": 0}, "val": {"1": 7, "2": 7, "3": 7, "4": 7, "5": 7, "6": 7, "7": 7, "8": 5, "9": 4, "10": 4, "11": 2, "12": 0, "13": 0}, "censored": {"1": 52, "2": 47, "3": 47, "4": 47, "5": 46, "6": 43, "7": 42, "8": 34, "9": 25, "10": 24, "11": 14, "12": 5, "13": 5}}`。

原偏移二次回读已核实1319段状态及86段runs/SL记录，长度和SHA256全部一致；状态角色全部SILENT，见raw-source-readback.json。触发文件13个整局死亡标签及最近20局3个标签逐项匹配，但标签不等于13场实际沙漏败：TXZ6RVMQA09D F48第3次沙漏尝试获胜，F49 TEST_SUBJECT死亡且缺可用首回合帧。保留原触发归因，未扩范围修改调度/归因源码，交运维核实；此口径差异不改变验证不足的结论。

所有起点200样本，seed=1+原始 fights.jsonl 行索引×101，t1/pre，整体Platt只在tune拟合。boss数值沿原已授权common模型/按进阶规范化，不把继承模型当作本批新增机制。base与after使用完全相同的来源、切分、实际结局、逐回合覆盖及源码。after独立重放目标17场；其他boss仅在相同源码/固定输入/原始行索引seed按键验证后复用before结果，证明在 after/reuse-proof.json。

全量 before/after 各 `448` 个起点结果，键集合一致 `True`，去掉时钟元信息后的逐键结果一致 `True`。不能求解的输入自然保留在errors，不补数字。例如K3676LU8B0UH两个起点no solve用原TS runner复核相同（original-error-equivalence.json），保留结局与缺失覆盖。

| 起点 | 成功验证场数 | before Brier | after Brier | before预测/实际 | after预测/实际 | before打穿比 | after打穿比 | 打穿回合覆盖 |
|---|---:|---:|---:|---|---|---:|---:|---:|
| t1 | 7 | 0.2805 | 0.2805 | 0.658/0.286 | 0.658/0.286 | 3.504 | 3.504 | 40 |
| pre | 7 | 0.2724 | 0.2724 | 0.652/0.286 | 0.652/0.286 | 3.707 | 3.707 | 40 |

| 起点 | 全体成功验证场数 | before整体Brier | after整体Brier | 变化 |
|---|---:|---:|---:|---:|
| t1 | 117 | 0.1135 | 0.1135 | 0.0000 |
| pre | 117 | 0.1128 | 0.1128 | 0.0000 |

逐回合来袭、打穿、血损、敌HP、仍在打的样本比例及其配对场数分别在 before/after 的 per-turn-t1/pre-tune/val.json与.md；数字只比较日志和仍在打的模拟覆盖，不能从未覆盖的回合补机制。未用旧小验证集作before。验证T1来袭日志/模拟同为26，但日志打穿0、模拟T1/pre为6.1/5.8；T9/T10原日志各4场，可比模拟覆盖各2场，不能当4场完整模拟。这里证实了聚合偏差，尚不能把不同后续动作、SL选择和缺失覆盖拆成某条机制错误；不据聚合均值强改fullFight。

固定调参灵敏度仅试 --boss-threat AEONGLASS=1（原工具支持的数学策略旋钮），10个tune键、原行索引seed、200样本，未读val选参数；整体参数仍只在tune拟合。没有形成可证实机制修正，也没有采纳参数改动。

| 起点 | 基准tune目标Brier | 试验tune目标Brier | 基准tune打穿比 | 试验tune打穿比 |
|---|---:|---:|---:|---:|
| t1 | 0.2802 | 0.2782 | 1.107 | 1.084 |
| pre | 0.2678 | 0.2655 | 1.204 | 1.18 |

B2潜在收益用预先按SHA256键选定的3个tune T1盘面、每条200样本、原行号配对seed、原rankLines的2个配对标准误并列与胜局血损次序；仅代码前5条及匹配的Jev线。2盘匹配并完成配对，均无额外排序收益；1盘旧Jev序列不可匹配，记缺失，不换近似线。原始solver输入、每样本结局、配对差、SE和并列在b2-fixed-inputs.json / b2-potential.json.gz。属于模型潜力，不是反事实实盘胜利，不逐回合求和。

历史实盘T1预测另行审计：11场有实际结局且可匹配选择线，历史校准Brier0.171903818；其中未超时7场0.097420714。不同历史代码/映射、只在SL重试运行及超时选择偏差在live-predictions-summary.json保留；不能与本批固定配对档案直接比较。

验收使用dispatch_base提取的原 acceptance.py（SHA256 `130dd7d6f3ec718ccc6d193895155c35727ecb1d23aeb591736d88419235b81a`），保护源码/旧断言/原门槛未改。固定原isolation.ts对两个同base快照的实盘solver、五回合输出逐字节一致，包含SILENT与IRONCLAD控制；隔离 SHA256 `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`。本批没有新增模拟字段或跨角色整场变化。

最终验收 `accepted=false`：`["B5 has not met original B2 trust admission", "no bias entered/approached its fixed standard"]`。B5的n≥10与原Brier/gap/leak同时准入、至少一项进入/接近标准的条件不能由相同基准且当前验证不足通过。trusted_b2由原trust.py自然生成，未手改名单。验收原件 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261008-071204/learner/runs/20261008-071208-boss-sim-batch/acceptance.json`，输入哈希、完整结果和隔离输出在同目录。

首次原沙箱检查tsc0/vitest1：244文件通过/1失败，2586例通过/1失败。失败是临时运行副本的未用日志链接被导入扫描遍历（runtime/logs/logs ENOENT）；移除此临时链接后原单例复验0。原测试源码、断言及固定排除名单未改。外层状态写入器KeyError、初始索引hardlink EXDEV、初稿key序列化、早期中断重放、B2路径及原runner key文件路径失败原件保留在history/；初稿import错误保留实际诊断与未记录rc的限制，见failure-history.json。失败不能改写为绿。

调整临时布局后的最终原沙箱整套入口返回 `0`；具体tsc/vitest和例数以 test-sandbox-final.log / test-sandbox-final-rc.json 为准。这是沙箱固定入口，不声称运行了被固定排除的外部完整套件。没有代码候选，所以撤源码红/恢复绿机制用例不适用；fixed-mechanism-observations.json只保留观测，不伪称新增断言。

固定档案 `experiments/boss-sim/silent/fd6970694ac1c8188c6ceef109d314a421e6ef6ac32f7b4c7c00b27fd5eadd43`。sources/fights/turns、split/provenance/results、两份trust、原来源哈希、源码包、全部失败历史及封存manifest同时保留；旧档案目录未覆盖。学习账本仅经根目录CLI登记 `silent-0281` observed→rejected，关联DPYF/9Z9H/PD9的局回合、数据与本验收路径；没有shipped或版本。own-worktree notes/silent-climb-report.md已引用。本批不合live、不申请新版本；调度完成事件再复核验收与账本，并按10场新实际战斗且新校准冷却。

提交前扫描补充：gitleaks初扫主档案rc=1、11条generic-api-key命中；报告/decision-log/升级小结各rc=0。命中只涉及本派发证据可重算的正确SHA256及保留的错误compact初稿SHA256，逐条文件哈希/定位已核实。临时配置只精确匹配这两个非秘密hash并继承所有默认规则，主档案复扫rc=0，未改boss-sim门槛或原失败历史。扫描原件、精确配置和核实证明封存在 `experiments/boss-sim/silent/1b398a5f51a9e3a76eb98736412cdc9266809c0de4297e57c031e1f40901e07f`；主数据档案manifest保持原字节。最终补充文件/记录扫描原回执在 `/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-aeonglass-20261008-071204/learner/runs/20261008-071208-boss-sim-batch/gitleaks`。
