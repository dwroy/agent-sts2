# 静默沙虫 B4 核实与拒绝回报：20261008-044244

本批 **rejected**，未形成可由本角色原局证据支持的新校正。没有候选源码，before/after 均使用不可变 dispatch base `a73ce7ccbcfd09a9f9679dc4bddaf3dacb56b253`。原版验收 exit=1，理由 `no bias entered/approached its fixed standard`；实盘求解和五回合隔离逐字节通过。没有合入 live，没有 eval 版本，也没有可信名单或知识规则变更。

## 授权与不可变输入

适用 Roy 2026-10-07 12:11/12:35 授权、根目录 `notes/fix-queue-v4.md` 的「B4 / B5 纳入标准流程」及 `docs/boss-sim.md` §13/14。本批是 B4，不以验证集挑选策略或扩展 B5 排序试验。已先读 README、最新 STATE、decision-log 末尾、学习协议和授权原节；启动时工作树干净，HEAD/live 同为 dispatch base，`git merge live` 已为最新。证据文件是调度输入，机制结论只从 silent 原局核实。

- character/boss/mode：`silent / THE_INSATIABLE / b4`。
- evidence_key：`010652ecf447bc280eac0162adfbe26531eb3f7a5c9aaff70d718dee251f306f`；删除 key/dispatch_base 后按原算法重算一致。
- 原证据字节 SHA256：`04ba2f4490363bca6b94484643484003867014f17e5c5c578917306d5f3afc84`；副本为档案内 `trigger-evidence.json`，原文件完成前再次核对。
- dataset/source/turn/split SHA256：`5222a49f5c8edbb3f4007711185c04460fd2c65b135b6907bab96b98775398c6` / `e834edfcc3c1ba837e9806f214aec17d29b1a9432359a68b3b115a13ee5e85ad` / `191a0b70b1142f81d49bebba2e80697c36e840d26558b0e6597d34e35d5f495c` / `b5e97f2ce03dc1418c467847144c010e9f05b98f4f83f72e71df1e7dcc590e59`。
- 模型及全输入指纹：`33e12f31fa61a8b29358c69f997f413921a29dab2d044d53293562d9022956e5`，逐文件哈希见 `provenance.json`。使用已有 `data/game-data.json` 缓存，文件时间 2026-10-04 20:23:30 CST；不读取游戏包或网络知识。

## 冻结扩充和 SL 口径

原 character_extract 从只读日志冻结 117 场已结束 silent 局，535 次 boss 尝试。215 次具有可用 T1 与实际结局（156 won / 59 died）；318 次普通 predicted_death、1 次同时缺 T1 的 predicted_death 都是截尾，不当死亡；另 1 次实际结局因缺 T1 排除。原始全局元数据前缀只留在 scratch；归档选择本角色元数据并保留原字节偏移、长度和哈希，不读取其他角色知识。

原 tune keys 107 条和切点 `2026-10-06T02:46:11.648000` 完整保持；原 val 73 条加 35 条新数据成为 108 条。同局全部 SL 尝试仍同侧，新增局只进入 val。Platt 只在 tune 拟合；其中 K3676LU8B0UH F48 尝试2在 T1/pre 均原样返回 `board: Error: no solve`，所以有效 tune 各 106 条，未补造预测。430 条结果覆盖全部 215×2 起点，包括上述两个原错误。

沙虫 50 次尝试：33 次 predicted_death 截尾，17 次实际结局（12 win / 5 death），tune 9 / val 8。下面仅列实际结局；所有 50 次、触发局号和完整原行 SHA 见 `target-attempts.json`、`target-audit.json`、`target-frames.jsonl`、`dataset/sources.jsonl`。

| 局号 | A | 尝试 | 分账 | 实际结局 | T1 原字节偏移 | 原记录回合数 |
| --- | --- | --- | --- | --- | --- | --- |
| C48LLXBGKXQ9 | 0 | 6 | tune | died | 6290069057 | 11 |
| LRN0HPZ0FZS1 | 0 | 1 | tune | won | 6321077933 | 8 |
| R0HEV5E3QT6G | 0 | 1 | tune | won | 6408273290 | 8 |
| XYYQYBRM2A01 | 1 | 6 | tune | died | 6498907170 | 10 |
| ZZMYZ5UBCG72 | 2 | 1 | tune | won | 6563846917 | 5 |
| ENKYQMS9W4ZD | 6 | 2 | tune | won | 6989150587 | 6 |
| 2SU6XN2AEJRD | 6 | 1 | tune | won | 7012074482 | 8 |
| 2PVLGRBGUX9S | 7 | 1 | tune | won | 7184252130 | 9 |
| 25226ZFLNR1J | 10 | 1 | tune | won | 7364061163 | 11 |
| 4ANT8D00TP72 | 10 | 3 | val | won | 7677948192 | 9 |
| XBD8Z9XLPCPN | 10 | 6 | val | died | 7701123253 | 3 |
| HUVEPWQAHWFU | 10 | 2 | val | won | 8016054163 | 10 |
| HSX4HYATB4E2 | 10 | 3 | val | won | 8153522974 | 8 |
| MCT1GPTL8D35 | 10 | 2 | val | won | 8343504348 | 9 |
| 8JRE1C4H4Z2W | 10 | 6 | val | died | 8513681143 | 11 |
| YF0LXT1QSTGG | 10 | 2 | val | won | 8535458972 | 8 |
| WQZVENQ7DTRP | 10 | 6 | val | died | 8710865169 | 11 |

五次实际死亡 C48LLXBGKXQ9、XYYQYBRM2A01、XBD8Z9XLPCPN、8JRE1C4H4Z2W、WQZVENQ7DTRP 均为 F33/尝试6。末个 combat 帧 HP 分别为 2/2/13/5/9，随后原 `GAME_OVER` 均角色 SILENT、HP0、is_victory=false，且 SL died/end_hp0 一致。实际结局可验证，终回合敌方打穿量不能由这些 terminal 总损失倒推，保持未知并排除；证据偏移、原行哈希和 SL 结局保存在 `actual-death-terminals.json`。

完成前独立按原偏移重读核对全部引用：535 个本角色 source 行、2330 个沙虫帧及实际死亡 terminal，共 2868 个引用/2818 个唯一原行，116223920 字节，长度和 SHA256 全部匹配；原日志继续追加没有改变冻结证据，回执见 `checks/raw-byte-verification.json`。

## B4 逐回合核实与限制

17 场实际沙虫有 145 个回合开场：T1–T11 场数依次为 17,17,17,16,16,15,14,14,9,6,4。包括截尾尝试在内，核对 2330 帧角色、意图、状态、牌堆和实际决策索引。

现有 enemyTable 在 145 个回合（含非攻击回合）的显示伤害/次数与原局一致，0 不匹配；17 场 T2 均沙坑4、手牌加抽牌堆的逃离3/弃牌堆3；111 次相邻回合的最后帧→下个开场沙坑变化均为 -1。原始固定夹具与比较详见 `mechanism-fixtures.json`、`table-comparison.json`。逃离牌代价的已有显示记录与现有 special 一致，但没有证据证明每一种卡牌传播路径都正确；不推广至未观察状态，也不复制铁甲经验。

验证逐回合 T1 回放如下，单元格顺序为实盘/模拟。模拟仍战斗比例、回合样本范围和终局不完整量均保留原 per-turn.py 口径；T1 未输出模拟敌血不是补零。

| T | 实盘场数 | 来袭 | 打穿血量 | HP减少 | 敌HP | 模拟仍战斗 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 8 | 0.0/0.0 | 0.0/0.0 | 0.0/0.0 | 339.9/缺 | 1.0 |
| 2 | 8 | 17.2/17.9 | 5.6/5.7 | 5.6/5.7 | 306.2/308.3 | 1.0 |
| 3 | 8 | 29.0/29.6 | 10.4/16.8 | 10.8/15.9 | 288.6/292.8 | 1.0 |
| 4 | 7 | 0.0/0.0 | 0.0/0.0 | 0.0/0.0 | 265.3/270.9 | 1.0 |
| 5 | 7 | 23.1/22.9 | 4.1/8.6 | 4.1/8.5 | 235.7/244.9 | 1.0 |
| 6 | 7 | 23.1/22.6 | 5.0/8.0 | 5.0/7.8 | 205.0/217.9 | 0.9 |
| 7 | 7 | 30.1/31.1 | 13.3/16.9 | 13.3/16.0 | 159.4/189.1 | 0.8 |
| 8 | 7 | 0.0/0.0 | 0.0/0.0 | 0.0/0.0 | 112.7/156.4 | 0.4 |
| 9 | 5 | 28.4/26.2 | 4.0/12.6 | 2.4/12.5 | 102.6/153.6 | 0.4 |
| 10 | 3 | 30.0/27.8 | 8.0/18.0 | 5.3/18.0 | 129.3/158.0 | 0.1 |
| 11 | 1 | 37.0/37.0 | 缺/缺 | 5.0/27.0 | 166.0/167.5 | 0.0 |

T3/T5/T9 等回合的打穿和敌血残差存在，但来袭向量核实没有新失配。模拟策略与实际决策、抽牌路径及战斗持续时间不同，不能据平均残差把某个策略改动称为已证实机制修复。未发现限定三文件 fullFight 分支中的可证实新校正，保留现状；没有新增字段，无扩范围。tune/val/all 的 T1/pre 六套逐回合固定表分别在 `per-turn-*.json/.txt`，验证不参与选参数。

## 相同数据配对重放与信任档案

所有 boss 都按该源重新重放，200 样本，seed=1+完整 frozen fights 原行索引×101，T1/pre，原 `--no-rollout` 基线策略。没有用触发时 5 场小集与本轮 8 场混比。两侧 split、dataset/source、验证结局、逐回合覆盖和全部原样本相同。

原串行 TSX 回放先完成 35 场固定前缀；余 180 场用原 backtest 源的 esbuild 编译镜像及 3 个 worker 完成，初始串行副本保留作冗余历史。174 个编译输入逐一与 dispatch base 的 git blob 哈希校验，未修改 driver。原始 TSX 与编译结果交集 204 条的完整输出除运行耗时外一致；C48 的 T1/pre 各 200 样本另由原 TSX 和编译执行独立重复一致。对应 `compiled-baseline-manifest.json`、`original-compiled-comparison.json`、两个 `repeat-proof.json` 和原始结果均存档。

无候选时两侧均 base，相同键的原样本可据 source/key 核实复用；`paired-reuse-proof.json` 明示复用，没有假称第二个不同模型或策略。before/after results 原字节 SHA 均 `3971840e94b370999cc5628ccc36dd32f4c52a5a743624746e6cc1c1be425e45`。原 trust.py 分别运行生成两份 silent 档案，字节 SHA 均 `2503d4ec41aaa89d790cc602d3253add3bdcf806fe12efa603727d39190af31e`。

| 沙虫起点 | 验证n | Brier before/after | 预测/实际胜率 | 打穿比 before/after | 打穿覆盖回合 | 自然失败项 |
| --- | --- | --- | --- | --- | --- | --- |
| t1 | 8 | 0.1243/0.1243 | 0.593/0.625 | 1.446/1.446 | 43 | n,leak |
| pre | 8 | 0.1228/0.1228 | 0.587/0.625 | 1.463/1.463 | 43 | n,leak |

胜率差绝对值 T1=.032、pre=.038，均未变化。档案的 missing=2 指距离 10 场门槛还差 2 场，并非此 boss 丢了两个预测。整体验证 n=108，T1 Brier .1165、pre .1145，两侧增加0；整体 tune Platt T1 a=2.0809/b=.4492/c=0，pre a=2.2726/b=.5041/c=0。沙虫继续自然处于 low trust（n/leak），未手写可信名单。

## 不可变验收和检查

验收源从 `a73ce7ccbcfd09a9f9679dc4bddaf3dacb56b253:agent/tools/boss-sim/acceptance.py` 提取为 `acceptance-base.py`，SHA `130dd7d6f3ec718ccc6d193895155c35727ecb1d23aeb591736d88419235b81a` 与基准原件一致。使用任务原参数、原 evidence 路径、base=head=dispatch base、固定 before/after 档案及 scratch，未改调度器、验收断言或 runner。

14 组基准固定实盘 solver/五回合输出逐字节相同，SHA `1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0`；保护源码和三个允许文件均未改。验收 `accepted=false`、`improved=[]`、exit1，原因是没有任何偏差严格改善或进入/接近固定标准。其他角色和铁甲源行为保持等价。没有候选撤码红/恢复绿，属于 N/A，`fails_without_fix=false`。

原 `bash tools/test-sandbox.sh` 在 agent 中运行，PATH 加本机 Node，TMPDIR 固定本批 scratch，SANDBOX_WORKERS=1，nice19；没有改固定排除名单。当前实际回执：tsc=0、vitest=0、cases=2586、status=passed on original rerun，原日志/退出码见档案 `checks/` 与 scratch `sandbox.log`。不宣称完成沙箱外完整检查。

指定归档文件的 gitleaks 首扫 exit1/三处命中均为同一个公开的 dispatch evidence SHA256；独立重算、逐个文件行和命中列核实一致，只以这三条精确 fingerprint 排除该公开哈希。首次 redacted 结果、退出码和核实脚本/证明保留；原通用检测规则未改，精确排除后复扫 exit0/no leaks found。记录/小结的最终指定文件扫描回执另在 `checks/`。

初稿/失败全部保留：audit-target-v1 未展开压缩 card_ids，随后修解析；compare-tables-v1 相对路径错误、v2 缺 silent 专有 move-model，最终按已有 common fallback 核对；provenance 初稿导入连字符模块失败；compile-baseline-v1 native TS7 API 不可用，最终用既有 esbuild；K3676 F48 两条 no-solve 原样保留；原版 acceptance exit1 为实际拒绝结果。它们是核对工具草稿/原源运行历史，没有候选源码测试失败被抹掉，也没有撤掉门槛换通过。

首次原沙箱检查实际 tsc0/vitest1：244 文件中 243 通过、1 失败，2575 用例中 2574 通过、1 失败，1032.93秒。唯一失败是 check-imports 将 scratch 的失败草稿 `compare-tables-v2.ts` 当作 learner 可执行源码扫描，发现不存在的 silent/move-model.json 导入。该草稿按原字节改存 `compare-tables-v2.ts.failed.txt`，SHA `df0b0026e97fd746efe594af147c7a89af999f9d532b2f8452415d97170526ed`，原 .ts 副本在档案 history 中仍保留。随后再次运行相同原入口；没有修改任何检查规则、排除列表、调度/验收源码或断言。首次原日志/rc 在 `checks/sandbox-first.*`，保存字节证明在 `checks/draft-preservation.json`。

## 台账、归档和交回

根目录 `learner/ledger.py` CLI 已创建真实 kind=fight 条目 `silent-0275` 并更新 rejected，局/回合含 C48 F33 T2/T11、4ANT8D00TP72 F33 T2/T6，原字节偏移/长度/SHA 写入证据。CLI 请求、响应、折叠快照均存档；不登记 bug-infra、proposed/accepted/shipped 或版本。

不可覆盖的新档案目录：`experiments/boss-sim/silent/c4b92e27cec33be28b9e04850a7320b6c96556c03357654cd624c5c0c76652eb/`。含 sources/fights/turns、split/provenance、两侧 results/trust、逐回合表、固定机制夹具、原局审计、基准 runner、验收输入/回执、所有草稿失败和检查。大体积编译镜像及已有 game-data 缓存保留在 scratch，SHA/编译清单归档；按清单和原源可复现。冗余串行回放状态由 `history/serial-status.json` 另记，未替换冻结 canonical 结果或配对依据。

验收完整路径：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-044244/learner/runs/20261008-044249-boss-sim-batch/acceptance.json`。最终回报：`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-044244/learner/runs/20261008-044249-boss-sim-batch/report.md`、`/home/dw/Projects/agent-sts2/.worktrees/boss-sim-silent-the_insatiable-20261008-044244/learner/runs/20261008-044249-boss-sim-batch/report.json`。独立分支保留，不合 live、不创建 eval 版本、不修改根目录并行小结、运维 prompt 或可信档案。自己的 `notes/silent-climb-report.md` 只追加本报告引用。完成事件交原 fix-batch 通道，后续十场新实际 boss 战斗及新校准冷却由调度器负责，本批不启动对局或另一批次。
