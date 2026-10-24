# #27 首批 Silent 大脑文字策略

本批正式内容为 `knowledge/characters/silent/strategy-entries.json` 的三条 v1.0.0 备战策略；来源均为 own，design=observational。三条各只计一个独立 Silent 局，不声称拿牌因果收益、自然采用或胜率改善。源提交、实际 main 合入和逐文件 SHA 以原任务目录的 `result.json`、`integration.json` 为最终回执；本文是源提交时的内容审计。

任务：`github-issue-27-brain-strategies-20261022` / issue 27 / `issue-27-brain-strategies-task` / `issue-27-brain-strategies-20261022-1010` / silent。原结果目录：`/home/dw/Projects/agent-sts2/learner/runs/20261022-184754-e08ce39d-b6e8-490b-9b69-c66a8f59dd38-issue-27-brain-strategies-task`。只此一批，无下级模型、模型 API、MC、模拟、对局、新实验或联网。

## 覆盖与缺口

| 证据层 | 实际覆盖 | 独立分母与未知/排除 |
| --- | --- | --- |
| 冻结输入 | manifest 身份、52 files + runs snapshot + inventory 共54项 SHA/实际字节数核同 | files.path 始终取冻结副本，未替换为随后主目录文件；input SHA 见 input-verification.json |
| 已结束 Silent 清单 | 434个独立局；#16数据集11735行/410局，机械统计五类题型与null | 24个完局不在数据集；不称不存在原证据，名单见 coverage.json；不遍读所有原始状态 |
| 自有 Boss 原帧 | 3局4窗口、196帧：FETDVL1P59B9 F17首试、VGNDNGPFYRE3 F17首试、YZQEEDWQ6AY6 F33首试及第6试 | 3独立战斗；第6试不增加局数。首次帝王蟹在第一次判死处截断；SL末试另列 |
| 原日志定位 | 现存只读DuckDB索引、threads=1、no sync；只按精确局号/offset/bytes读取，逐段SHA，共210条引用 | states/sl整流未哈希，stream_sha256=null；逐段均≤manifest冻结上限，不混入新增字节 |
| 公开sts2fun | 冻结#24中v0.111/Silent/A10的三张牌第一幕选择表、跳牌屏幕与牌组规模表选定行 | 同版本全cohort1739局/98玩家不是每表通用分母；候选槽/屏幕/局/玩家按external-review各行分账，其他版本仅看cohort元数据 |
| 公开spire-codex | #25 v0.111.0、revision 4f52f5a53597e4fdc6cf130f7ebe2cdd35236101；同族两部件、墨影、知识恶魔参考条目 | 机械参考不是玩家/对局样本，独立实盘分母0；URL/下载日/版本/原文件SHA/许可与Required Notice完整保留于external-review |
| 未读或不采用 | 其余原始战斗、其他角色、模拟估计、旧大脑理由、最终牌组聚类作选择时信息、冻结上限后字节 | outcome中boss_pass未知536行、remaining_hp_loss未知4868行、final_floor未知47行；不补零、不回填最终牌组 |

上表独立分母不能相加。数据集只作覆盖和固定题面来源：接受答案不等实际执行、后续掉血不是该选择的因果效果。三条正式策略只用原帧和原SL记录支持。自有历史源码SHA可从冻结#16元数据定位，完整历史dirty树和游戏版本未在本批重建；不拿当前源码代替历史版本。

manifest列缺 `agent/src/brain/tools/knowledge-tools.ts`；实际#33路径为 `agent-knowledge.ts`，冻结输入及当前工作树中均存在。所需原始证据均可由冻结副本和精确索引取得，没有因稀疏检出缺失而声称证据不存在，也无需展开历史整库。

## 内容与查重

| ID（均1.0.0） | 策略边界 | 自有证据 | 账本 |
| --- | --- | --- | --- |
| silent-brain-kin-priest-exit-window | 备战时核神官击杀与存活窗口；不把三敌初始血池当必须逐点打掉的总门槛；不定杀序 | FETDVL1P59B9 F17首试，53→3胜；T7神官16/25毒、信徒55/62后奖励出口 | silent-0568 proposed |
| silent-brain-vantom-two-stage-preparation | 分看滑溜早段与耗尽后推进，并支付早期血价；不据毒层算实伤或早段低伤否定整个方向 | VGNDNGPFYRE3 F17首试，183→180→177，后续133/74/11；55→17胜，第三轮净损25 | silent-0569 proposed |
| silent-brain-crab-surviving-part-budget | 备战保留单侧退场后的残敌生存/输出缺口；满血或一侧退场不等整战已够 | YZQEEDWQ6AY6 F33首试77血到T11判死SL；第6试单侧退场后仍88血99挡12力，终局敌85、玩家0 | silent-0570 proposed |

只触发act_plan/rest/shop，并限当前幕Boss原始ID和备战楼层（第一幕≤16，第二幕18–32）。无普通card_reward条目，不把combat_line改名拿牌策略。证据中的数值限已观察A10；格式没有进阶触发器，所以条目内明确其他进阶不套用数值。confidence .62–.65为学习者定性的观察可信度，不是胜率、收益估计或校准概率。反事实、低进阶适用值及收益均未知。

源树及集成前main正式文件均缺失。冻结244条经验按相关Boss/机制检索，账本按相关claim核对，并用共享根ledger CLI查 `silent-brain-`，返回0条。本批保留既有经验/账本关联（0012/0009、0224/0227、0161/0021），不继承其20/22等支持分母。新增三条是带触发条件的备战表述，不宣称发现新机制。仅经共享根 `learner/ledger.py add/show` 登记与读回三个proposed；未手改账本，未标shipped，`experience.json`字节不变。

`entry-dispositions.json`保留五类不发布候选及原因：外部单卡排名、外部Boss固定计划、同族固定杀序、墨影单卡优先级、帝王蟹“回血是错误”。公开统计可使用，但选择相关性不是因果收益；本批选用的聚合/机械参考缺逐局ID和精确全局楼层，保留aggregate/参考命名空间，不伪造本系统局号或floor=0满足schema。外部候选不能通过只接受12位本系统局号的ledger CLI，明确保留该限制，不绕过校验。

未改消费者/格式/运行规则，没有直接出牌、药水、SL或终局算法变更，故implementation_domains=[]、code_proposals=[]；也不为本内容批次扩张架构。不同意见与缺证逐项保留在questions.json，待原ops→watcher→Roy实际转达；未代任何角色ACK。

## 固定自测与消费者

`fixed-consumer.mts`使用真实新库和实际 `parseStrategyLibrary`、`StrategyEntries.apply`、`retrieveStrategies`、`userMessage`、#33 `buildKnowledgeTools(...).kb_strategies.run()`，没有mock游戏后果或模型调用。分别执行源树基线e5729bb602ce2701f79fb6d133180c9a1cfad940与实际main 05186c64222c9ad6621de3c2d25b25b1e0eb187f的消费者，两次最终退出0；五个消费者源文件SHA核同。每条正例、5种错配/未知必要事实、普通拿牌/战斗题排除及4个其他角色隔离均通过。

| 路径/固定题 | 实际结果 |
| --- | --- |
| #33工具查询 | 各真实正例返回相应ID/version/source/evidence及完整库SHA；输出2180/2260/2559B。本机实际run()调用，不是MCP传输或模型主动查询验收 |
| 兼容检索注入 | 各真实正例block为1607/1687/1855B；保持原最多3条/整块4096B。用真实内容的重叠fixture实际留下2条2992B；压缩元数据fixture为3条2654B；过大整条跳过且原题不变 |
| 五题回放 | 冻结#16的card_reward无命中且prompt等字节；携start幕初任务的event命中同族；rest/shop命中墨影；act_plan命中帝王蟹。保留dataset ID、事实转换输入、工具输出、prompt原文、字节与SHA |

#33工具本身沿现有12项/24000B边界，不假称其使用兼容路径的3条/4096B限制。本批每题只命中1条，两条路径的ID/version/source/evidence实际一致。旧五题replay工具要求fixture-*占位ID，不适合真实库；本批改为调用同一实际消费者，并保留五题冻结出处。结果原件在source-consumer-final/和main-consumer-final/，摘要也随本提交保存。

失败不覆盖：初版`.ts`被tsx按CJS处理，top-level await失败；改用`.mts`后，Node子进程git探针在沙箱报spawnSync EPERM，遂由外层核Git身份并向只读探针传入准确commit，消费者源文件逐项SHA仍在探针内核。初次固定题面转换漏带plan_trigger，已保留旧输出，最终转换保留start/act；event真实命中同族。原始stderr/stdout、失败稿及最终commands/exit_code均保留于原任务目录。不是生产代码失败。

本批只改知识数据和paper审计记录/离线回放脚本，未改agent/learner/eval/ops或knowledge/builders生产代码；依现行数据提交规则不重跑全量tsc/vitest，不安装依赖。提交前gitleaks目录扫描与待提交补丁扫描结果由原任务tests.json及扫描原件记录。

## 后续与回退

源提交可依授权在原 `ops/live-merge.lock` 下仅集成本任务精确文件到main，保留并行知识刷新和共享账本。主目录只用于集成；不推送。实际source/main回执以result.json为准，不能从本文“可集成”认定已合。

live发布由原ops接续，live_commit当前未知；本批未碰.worktrees/live、STOP、decider、REFLEX、方向开关或Regent暂停状态。ops需核实际live祖先、分配唯一release_id并追加decision-log/双通知；之后等发布后首个自然大脑问题的真实查询/命中ID/version/source/evidence。main_merged、live_published、natural_brain_readback三项分开；固定回放不关闭#27，也不证明收益。

回退仅撤销本任务新增策略文件（或反向精确内容提交的该文件增量）；保留审计、原日志、账本和之后并行知识。无experience.json迁移，其他角色库未改。本批结束不续派，完成事件由原启动器交ops；学习父要求、争议和科学父保持开放。
