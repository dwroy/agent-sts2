# #27 第二批最终交接

新增5条外部观察性策略，保留首批3条。已提交并合入main，尚未发布live、尚无自然大脑读回。

- source: `f96a13606d8bac8adc281c7c66ccda338d0e7903`
- main: `3f6421432d5c6b35b1668bc1a47be3d41ddbcc26`
- live_commit: null；只读运行上下文 `fdae435795f41d771da6df3457eb890e50d8ffeb` 不含本批发布声明。
- 正式策略文件SHA: `75ada83263bc907c20d691f4a31d424184dcf0b7efd290748f3385eae5bc8808`
- ledger: silent-0571–silent-0575，仅proposed，0新增自有支持局。
- 93个精确文件在原ops/live-merge.lock内cherry-pick，逐字节核同。共享记录与live知识刷新保持原样；见integration.json。
- 原工作树和实际main两次固定消费者均通过：8条解析、逐条正反/未知/角色隔离、五类题目、3条/4096B预算；最大兼容块4062B。gitleaks完整最终暂存差异0泄漏。
- 共享账本575项结构检查0问题；用冻结局清单做全量来源检查的3条并行新局引用失败原样保留，交ops用其授权当前输入核验。

main_merged=true；live_published=false；natural_brain_readback=false。第27号请求及科学父保持开放。发布、release_id/decision-log/双通知、原异议链转达与自然命中由原ops接续；本批没有新对局/模拟/API/在线请求或实验，也不续派。

逐文件SHA在changed-files.json，全部结果原件SHA在artifact-shas.json；完整字段见result.json。以下是随源提交保留的内容审计说明。

---

# #27 第二批：外部观察性大脑策略

本批新增 5 条 Silent 文字策略，保留首批 3 条原文、ID、版本与各自 n=1 的边界。新内容全部来源 `external:sts2fun`，confidence 0.36–0.40，自有支持局数均为 0。没有修改 experience.json、消费者或出牌/药水/SL/终局规则。主请求是 `github-issue-27-brain-strategies-20261022`，本批是 `issue-27-brain-strategies-batch2-20261022-224403`。

这是随内容提交保存的审计报告。最终 source/main 提交、精确集成回执、逐文件 SHA 与状态以原任务结果目录的 `result.json`、`report.md`、`integration.json` 为准。live 发布与发布后首个自然大脑问题的 ID/version 读回交原 ops；本报告及固定回放不代替这两项，不关闭 #27 或任何科学父要求。

## 输入和覆盖

输入 SHA：`350d668bdbaa133aa04e9e314dfde3dd63fc2730cc633a044325c22c8169a5f0`。65 份冻结文件的字节数和 SHA 全部通过；runs 快照和 446 局已结束 Silent inventory 的 SHA 另核。`files.path` 原件未修改，没有换用更新后的主目录知识。冻结缺失项为空。

覆盖表详见 `coverage.json`：

| 来源 | 实际覆盖 | 未覆盖或限制 |
| --- | --- | --- |
| 自有局清单 | 446 个独立已结束 Silent 局的清单、进阶元数据 | 不是 446 局打法已精读或已验证 |
| #16 冻结数据集 | 11735 条、410 局的元数据与未知值计数；五种问题各一个事实题面作固定回放 | 不使用旧大脑答案/理由为知识；接受答案不等执行；无新增自有结果聚合 |
| 首批自有条目 | 保留 3 条，每条独立 n=1 | 本轮没有重读其原始窗口，不增加分母、不提升可信度 |
| 外部 v0.111.0 | Silent A10 单人、有效、非弃局、无 modifiers，1739 局/98 玩家；选定表行单独留分母 | 自选上传、重复玩家/机会、当前局面混杂；不是本系统局 |
| 奖励屏幕 | 第二幕 7821，第三幕 4411 | 屏幕不是候选槽或独立局；两幕不作因果前后比较 |
| 刀刃之舞第一幕 | 原始 1054 槽/83 玩家；玩家/幕匹配 983 槽/49 玩家 | 两估计量重叠，不能相加；普通/升级未分；不提供独立局分母 |
| 知识恶魔、实验体 | 分别 360 场/360 局/68 玩家、501 场/501 局/70 玩家 | 外部 SL 未知、上传尝试且死亡截断；gross_damage 非净损 |
| spire-codex | 冻结库/来源可供参考 | 本批没有从机械参考推出新打法，不填假局号/层数或统计分母 |

原始 states/brain/decisions 流未扫描、未整流哈希；没有新原始对局片段进入策略证据。因此没有越冻结字节上限，也没有把新局或别的角色计入支持。`evidence-refs.jsonl` 保存选定外部 CSV 行的路径、快照 SHA、行号、offset/bytes 和片段 SHA。外部数据集本体没有重下载；数据库 SHA 使用已冻结 #24 来源回执，未声称本轮重新计算了 13GB 数据库。

按用户给出的存储接口恢复了精确基线 `3094a78988ba513cfa4d286ef5be28b746fa4ee8` 的 #24 report.md 和 brain_comparison.csv，逐 blob/字节/SHA 对照；它们是补充历史语境，不替换冻结输入，也不作为正式条目的自有支持。原件及限定见 `supplemental-git-context.json`。

## 正式内容与处置

| 新 ID（均为 1.0.0） | 内容 | 账本 |
| --- | --- | --- |
| silent-brain-act2-reward-skip-comparison | 第二幕把跳过纳入逐项比较；2198/7821=28.10%，不设配额 | silent-0571 |
| silent-brain-act3-reward-skip-comparison | 第三幕同类比较；1704/4411=38.63%，不推跳过收益 | silent-0572 |
| silent-brain-act1-blade-dance-choice-context | 遇到刀刃之舞按当前用途比较；原始胜率差与调整差不提供必拿理由 | silent-0573 |
| silent-brain-knowledge-demon-external-tail-budget | 备战知识恶魔保留尾部风险；外部总受伤 p90=51，不是安全 HP 线 | silent-0574 |
| silent-brain-test-subject-external-tail-budget | 实验体同类提示；外部 p90=62，不覆盖未知后场 | silent-0575 |

刀刃之舞在 #24 历史表中自有拿取频率 22/189=11.64%，外部 411/1054=38.99%，但该分歧并不说明本系统拿错。外部原始拿/不拿胜率差约 +5.20pp，玩家/幕匹配调整后约 +0.27pp，区间 −7.93 至 +5.86pp。两者是不同估计量，不能把差别标成机制反证，也不能把频率差转成应补拿的比例。正式策略只用冻结外部表，source 保持 external，自有旧汇总不解锁更高 confidence。

触发器没有进阶/版本/奖励候选字段；条目文字显式限定仅 A10/v0.111.0 的定量参考，刀刃之舞未出现时不给具体选择建议。事实未知的幕号/Boss/楼层均按现有消费者不匹配。没有以新增架构字段扩大本批。独立分母、未知收益、牌组/玩家选择偏差、外部许可限制保留在正式 evidence 和 sidecar。

查重扫描了冻结正式库、经验和账本的相关 ID/结论：8 条经验、22 条账本相关命中主要是机制或校准边界，不能算本批拿牌收益支持，也没有在所读范围内发现与新结论冲突的自有证据。未读历史不宣称已无冲突。致命毒药/步法及 #24 最大分歧牌的固定优先级、固定休息线、最终牌组推出幕初方向等未发布，理由与候选保留在 `entry-dispositions.json`。原三项异议逐字保留，新增进展/限制见 `questions.json`；原 ops→watcher→Roy 转达与 ACK 均未由本角色代填。

5 条账本只经共享根 `learner/ledger.py` CLI 一次追加 proposed，未填 first_run/asc/prior_runs。show/find 读回证据逐项相等，own_runs/own_support_runs 均为 0，外部分母分开。用冻结 runs 检查共享 575 项时，3 条并行记录引用冻结清单之外的 `0VBCQS9V0N87`，原 rc1 保留；`LEDGER_RUNS=none` 的结构 check 为 575 项/0 问题，只证明结构。没有越界读新局、替换清单或更改他人记录。`ledger-commands.json` 保留原命令/退出码，原 ops 后续核全量来源。

## 固定自测与实际消费者

`check_consumers.mts` 调用本树真实 `parseStrategyLibrary`、`StrategyEntries.apply`、`userMessage` 与 #33 `buildKnowledgeTools(...).kb_strategies.run`，不是旧测试样例或模拟大脑选择。测试原件为 `consumer-check.*` 和 `consumer-output/`。

- 真实 8 条库解析；首批三条逐条 JSON 内容相等。
- 每条正例可完整读回；错误幕号、错误题型、所需事实未知，以及 Ironclad/Regent 均不读取相应条目。
- 五种冻结历史问题题面实际回放，保留 dataset ID、压缩快照 SHA、解压偏移和片段 SHA；只把题面 boss 映射为运行时 act_boss，不改写游戏结果。
- 工具和兼容检索路径分别核 ID/version/source/evidence 与派生分账相等。兼容块实际为 1607–4062B；新刀刃条目 4062B，仅余 34B，不应无复测增加其注入元数据。工具返回约 2180–6682B，使用现有 24KB 工具边界。
- 人工只放宽触发器的压力夹具检查最多 3 条和 4096B；真实内容同场候选超预算时完整跳过，不截断证据。短文字夹具恰为 3 条；1200B 文字夹具受字节预算只取 1 条。压力夹具不发布。
- `verify_content.py` 核 5 条/6 个外部统计量与精确行片段、分母、账本 show 完全相等；p90 无置信区间，保持缺失。

最初从根目录用裸 `--import tsx` 的包解析失败 rc1，尚未执行自测；改用已有 agent/node_modules 内 loader 后通过，没有安装依赖或放宽沙箱。账本登记包装脚本最初误把 CLI 空格分隔 ID 当多行，发生在一次成功追加之后；改为只读回已有收据，未重复 add。两次包装器失败及全账本冻结清单失败原件都保留。

未改 agent/、learner/、eval/、ops/ 或 knowledge/builders/ 的代码；本批仅数据和 paper 审计脚本，按现行规则未重跑全量 tsc/vitest。全部计算 nice，单进程顺序执行；无对局、在线 API、MC、模型调用、模拟、在线请求或新实验。源码基线、逐文件 SHA 及其与当时 main 一致的消费者叶子见 `source-baseline.json`；内容补丁为 `candidate.patch`。

## 交接

提交前对精确暂存差异做 gitleaks；原始输出随材料保留。原锁内只精确集成本批策略文件与审计目录，保护共享根现有脏记录和其他知识刷新；实际执行或阻塞由最终 `integration.json` 记录。主目录不开发，不推送，不碰 live、STOP、decider、REFLEX 或 Regent。

原 ops 接续：核 main/source 精确叶子及 SHA，按唯一发布通道发 live、统一登记 release_id/decision-log 与双通知，再等首个自然大脑问题真实命中相关 ID/version/source/evidence。固定回放只证明可读，不证明自然采用或收益，不多开局、不做 A/B。本次不是续批授权。

回退：在原发布锁内只删除本批新增五个 ID，保留首批三条及其证据、其他刷新和后续内容；发布前叶子是本批父提交中的 strategy-entries.json，SHA `9df3740b4254daade365a4c3cf48b25b2d840e9f656bcda50e64735a79b3d95e`。若有后续刷新，不整文件覆盖。账本与研究证据不删除，运维 CLI 追加回退状态。
