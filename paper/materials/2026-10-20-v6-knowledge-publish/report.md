# Silent V6 R2 知识发布复核

请求 `roy-20261019-v6`；批次 `v6-knowledge-publish-r2-20261019-234603`；input SHA256 `c42a77029667ba80985149b0044aa7d34f6502696c0ef0a27db098796a32a1a0`。只采用封口R2；不读取在途R3、重新拟合、运行模拟或请求模型，不执行游戏动作。

正式4个candidate方向、17组合；34条经验追加cores/combos。既有19条reflex与7枚举原字节保留。244经验的ID、顺序、正文、状态、置信度、证据及其他字段不变，全部逐条有去向，不缩小validation-context。1条经验关联待定。

main_merged=True；source_commit=6d1c869484b42ae21620116ef2733668337c42cc；main_commit=6d1c869484b42ae21620116ef2733668337c42cc。live_synced=false，live_commit=null；自然对局采用与收益未知，父要求不关闭。

## 冻结来源

- `/home/dw/Projects/agent-sts2/.worktrees/v6-build-cores-r2-20261019/knowledge/characters/silent/pending/v6-build-cores-v6-build-cores-r2-20261019-2135/draft.json`：`df7ba9e3235e853c2f3a3843ff55ef13421238d36f0ba716b9981aa9ed5eb235`。
- `/home/dw/Projects/agent-sts2/.worktrees/v6-reflex-distill-r2-20261019/knowledge/characters/silent/pending/v6-reflex-distill-r2-v6-reflex-distill-r2-20261019-1913/draft.json`：`1b2e1ebf63de20f826a890bf13dcce293328003ee97bc5af5271e60c9a8b3b36`。

19份清单输入的SHA/字节数均一致，角色Silent，R2批次已结束；原结果引用的17件核心证据/关联材料及4件reflex材料另核SHA。见inputs.json、input-verification.json、evidence-closure-sha256.json。核心原独立验收仅抽查11原段，不冒称其全量重验；本批实际范围另列。

## 转换与逐项去向

| 对象 | 发布/保留 | 排除及限制 |
|---|---|---|
| build-cores | 抽取原draft.cores的build-cores-v1，4方向/17组合 | 只显式待定7处尚未发布reflex检索关联及1经验的对应检索关联；数值和证据不改 |
| reflex/词表 | 现有reflex-file-v1的19条与reflex-vocab-v1的7枚举保持字节 | 66 reflex/14枚举沿既有逐项理由pending，不因核心卡发布自动扩大验收子集 |
| experience | 34条仅合并cores/combos；其余字段和顺序全等 | 原35 linked中的silent-berserker-growth-sl-observation缺既有代码提案链，保留原经验，该关联pending |

publication-decisions.json逐项列4核心、17组合、85 reflex、21词表、7处pending reflex关联与1条pending经验关联。原linked_reflex涉及的4个未发布ID完整保存在冻结原稿和core-sidecar-reference.json，不静默删历史。缺链经验的核心/组合反向检索关联同步pending，避免悬空或单向伪闭环。原覆盖35 linked/130 unrelated/78 unknown/1 disputed原文保留，正式关联34；full-experience-coverage.json保留244条原core/reflex状态、理由、拟议及实际去向。

正式核心文件采用紧凑UTF-8 JSON以满足加载器8 MiB上限；首次indent=2超限失败不用于发布，不删指标。除显式检索关联外，原ID、candidate身份、组合类型、作用证据、置信度、scope、predicate、反例、未知及全部统计保持一致。experience-structural-diff.json证明原ID/顺序及非关联字段全等。

## 证据与数值

design=observational。372冻结Silent局，每个组合的first/including_sl各372独立局；12,648见证行逐组合/尝试与raw_counts及来源局集合对账。20,670统计指针回原statistic-index/full的精确范围及SHA，n、单位、value、SE、分位数、分布、小样本标识逐项相同；未重新拟合。紧缩前完整证据、方法、删失、反例与负向对照留在原sidecar，正式JSON指针保持对应。

本轮原日志实际重读5,481段、196,026,337字节，覆盖核心显式观察和全部组合持有/生效/逐牌见证、19条reflex和7枚举全观察。6,900处正式观察全部定位Silent局/层/回合与原段SHA，无分母删减。20个无回合的楼层型引用补用原冻结R1逐帧索引，其SHA匹配R2 manifest。整日志前缀SHA未知；未声称本轮全量重验8.4GB输入或重做研究。

所有版本/进阶仍作来源合并，正式适用scope保持Silent A10。first/including_sl、A10模拟与共同进阶偏移回归、原始来源计数、收缩前/方向值/收缩后全部保留。simulation n=0/value=null及原因不变；不可识别回归、AoE、累计抽牌、升级必要性、资源因果及缺帧均不补零。最小/最多牌/最高DPR是有限候选的描述性类型，无全局最优或因果收益结论。

R2原85条全为tag、0个可直接发布数值signal，本批保留同一19标签子集。原metrics的design、n、频率分母、误差方法、effect_size=null、SE=null经published-reflex-audit.json按ID关联，不私扩严格signal，不把数值降级成tag。拿牌/商店/休息/药水保持第3.2节组合期望公式，不迁入单牌统计。

## 固定校验与消费者

原validate-v6-build-cores.ts、validate-v6.ts reflex均exit=0；完整原244经验/372局context按原字节保留。命令、stdout/stderr及SHA见fixed-validation.json。check-experience首轮exit=1指出单条缺链，显式待定该关联后原CLI exit=0、missing=[]；初始失败原件保留。

实际loadV6Knowledge的三正式格式均loaded，缺文件不回退、另四角色不读Silent私有数据。directionSummaries→directionTask在A10读到P/D/S/R及17组合，题面metrics SHA与正式值相同；新投影全部unknown。v6Directions及createV6ProjectionFactory在原A10状态读到17组合与真实冻结history，只建共享请求，无prepare/供给MC/投影引擎/战斗模拟调用，不冒称实际屏幕消费者。

loadCombatEntries→combatEntryAudit→projectCombatDecision从19份已核原状态和显式固定方案读回：predicate=true时展示实际tag、confidence、支持/反例计数及文件来源SHA；false/unknown不误挂，超出进阶不挂。3个R遗物前提用固定正/负/缺失上下文验证三值逻辑，此为格式探针而非新实战证据。真实入口、固定输入、输出和SHA见probe.mts、probe-inputs-selected.json及*-consumer-readback.json。

当前源码基线未合W5实际拿牌、W7商店/休息屏幕接入；共享请求可读不替代这些屏幕题面成功。药水无本批发布reflex，不伪造正例。文件可加载、固定题面包含、自然采用分别记录；无收益主张。

规定原沙箱入口 `nice -n 19 bash tools/test-sandbox.sh --configLoader native`，固定排除名单未改；最终exit=1：生产tsc退出0，Vitest526文件/4747项通过、7文件/15项失败及3错误，耗时730.91秒；失败逐项为spawnSync/tsx IPC EPERM、Vite临时目录EROFS和3个本地HTTP监听EPERM导致的超时，paths尾段因set-e未执行。脚本先执行生产tsc再Vitest，完整记录在sandbox.log，最终结果及需ops补测范围见validation.json。未改源码，不将其他会话/早先全量通过冒称本批通过。gitleaks对精确数据、暂存差异及审计材料留完整回执。

## 闭环和限制

源基线、空的初始git diff --binary及SHA保留，不做完整仓库副本。main合前重核四叶子及同期源码；只快进本批精确提交，不覆盖其他学习者数据。不重建live、改STOP、开局、恢复Regent或分配发布号。

既有账本silent-0525–0528、0529只经CLI查重/补出处，不填shipped；没有改变原经验正文或执行规则。原真实task link不在提案CLI白名单的注册失败保留，本批不冒用experience-update，缺链关联pending。code_proposals=[]、implementation_domains=[]。原六项核心异议逐字附disagreements.json，原reflex异议/角色ACK待定保留，不代填。

保留R1摘要P42/D11与见证P44/D12冲突、旧W2.2 CLI null-range失败、重建过程副本原SHA未知等原限制；不借发布关闭。首次审计脚本只识别path忽略source别名、未补无回合层型来源，以及首个工厂探针选A0而核心仅A10的失败回执均保留；更正审计取源方式和固定探针选择，不改游戏数据或格式门槛。

下一步由原ops核实际main/live文件SHA，从live路径固定读回，沿原live-merge.lock同步及核真实行为发布号，并补外部完整tsc/vitest。原owner处理单条缺链关联、66 reflex/14枚举、W5/W7依赖和原CLI/通知兼容；本批不自行派发或续跑。父要求待实际范围逐项验收，不把排队、报告、main发布或可加载当成上线/收益。
