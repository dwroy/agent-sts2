# 整局构筑研究存储与本地查询（#72）

`build-research-v1` 保存学习者的完整观察和研究候选。存储发布后可由 `kb_build_research` 查询；它始终不是已验证可执行规则。`verified_complete_playbook=false`、`validation_status=unverified`、`confidence≤0.49` 是格式强约束。原科学比较门、反证、低可信和学习父要求保持；没有 Jev predicate、MC 参数或执行开关消费者。开发夹具只在临时目录运行。

## 文档与原候选

角色文档固定为 `characters/<角色>/build-research.json`，不支持任意路径：

```json
{"schema":"build-research-v1","character":"silent","entries":[]}
```

每个研究条目采用以下字段。所有来源和正文由原学习 owner 核实，开发不填游戏事实。

| 字段 | 合同 |
| --- | --- |
| `id`, `revision`, `title` | 稳定研究 ID、显式修订和标题，非空字符串，各最多200字符；正文变化必须换修订，旧 K1/修订不改写 |
| `scope` | `{character,ascensions,game_version}`；进阶是精确非空列表，未知游戏版本必须为 `null`，不从证据版本推定适用版本 |
| `source` | `own`、`mixed` 或 `external:名称`；来源明细独立保留 |
| `status`, `validation_status`, `verified_complete_playbook` | `candidate` 或 `retired`；固定 `unverified` 和 `false` |
| `confidence`, `evidence_status` | 数字0–0.49；`aligned/conflict/unassessed`，有明确反证必须为 `conflict` |
| `sources` | 非空来源列表，见下文；不同来源、版本、分母不相加 |
| `evidence` | 非空 `{id,source_id,role,ref,observation,limitations}` 列表；role 为 `support/contradict/unassessed`，source_id 必须存在；不编造本系统局号或 floor=0 |
| `phases` | 1–24个有序阶段，保原顺序，格式见下文；phase ID 不重复 |
| `limitations`, `unknowns` | 字符串列表；limitations 至少一项；缺手牌、战前/场间/药水/可执行DTO等原缺口不得删除 |
| `original` | `{sha256,content}`，content 为原候选完整 UTF-8 文本字符串，SHA256须逐字节一致；保留原字段、历史pending身份和来源引用，不能称历史对象已回写 |
| `references` | 已发片段的归档引用列表，允许空；格式见下文 |
| `attachments` | 可选原件归档列表，最多24项；`{id,media_type,sha256,content}`，id最多80字符，content为完整原UTF-8文本，SHA逐字节校验。media_type为application/json、text/markdown或text/plain，JSON须可解析。旧原件不可删除/替换 |

来源项包含 `id,source,game_version,sha256,sample,filters,limitations`。`sample={n,unit,players}`，n/players未知为null、已知必须为正整数，unit 保留原口径，例如 uploads，不能当独立自然局。外部项另必填 `url,downloaded_at,license,design:"observational"`，真实日期为YYYY-MM-DD；不填 runs。自有项 `source:"own"` 并填真实 `runs`（12位大写局号），不纳外部上传为本系统验证。外部许可限制必须原样记录，不编造许可结论。

阶段项为 `{id,stage,acts,goals,evidence_ids,content}`。id/stage最多40字符；acts 为已核幕号列表1–3，未知为 `[]`；goals 为显式检索词，未知为 `[]`，不会从叙述推断。evidence_ids 是非空有效证据引用。content 为原阶段对象或原文字，完整保存条件、取得顺序、转向理由、检查点、前后阶段、资源连续性和终局准备。原对象没有某字段就保留缺口，不补因果或数字。阶段标签和目录不是可执行触发器。

`references` 每项为 `{path,type,id,parent_id?,sha256,content}`。path 必须为本角色已存在文档；type/id/parent_id须在该文档有同类型身份；content 是核过的片段归档 JSON，sha256 是 `classificationDigest(content)`。引用是可验证归档副本，不是随 latest 漂移的指针；片段将来修订时旧研究仍能还原旧引用。原阶段里的 strategy_ids/rk_ids 属于原文，不因此自动声明已发布。未知或未发布片段继续保留原文中的身份与限制，不伪造有效引用。

原册引用的完整轨迹、相邻资源检查点、字段可用性表、来源账本或原页可保存在attachments，以固定附件ID寻址。原文中的历史路径原样归档，但工具绝不打开该路径；原owner把所需引用原件连同SHA纳入同一合法候选后，才可按 `artifact` 与JSON pointer只读取得。仅有外部路径字符串不冒已归档原件。完整轨迹仍是观察投影，不是已核可执行历史DTO；node/floor、HP代理、药水/SL/玩家独立性等原未知保持。

原231305 `playbook-candidate.json` 可直接保留完整原文为 original.content；五个 phases 的每个原对象原样作为对应 content。sources/evidence、显式阶段标签和已发片段由原 owner 对照原 source-ledger/映射核填；缺的字段留 unknown 或等待核源，不靠开发推断。原七个整体候选逐一处理，复用原产物，不为格式重新派学习，也不批量晋级。输入与冻结 SHA 见 [#72来源清单](../paper/materials/20261026-issue72-build-research/source-inventory.json)。清单中的片段存在性属于记录所指的历史 K1，发布前仍核实际当前基线。

## K1 发布与兼容

继续使用 `knowledge-candidate-v1`，files中只放实际变动的完整角色文档字符串，其余文档继承精确 base。不允许删条目、原来源、支持/反证、unknown、原文阶段和归档引用；不静默改 scope。可追加原观察、补证及新修订；更正已有观察须保旧内容和反证/限制，由原 owner 处理。

原完成回调仍核 batch/HEAD/只读权限、原生来源消费和冻结产物。外部报告沿原 `kind:knowledge`，destination指向scratch中的**实际完整研究条目**，其 JSON 必须与候选中的条目一致；不只交早期原候选后在runtime候选中未经核实转换。`auditApprovedChanges` 继续拒绝没有原实际产物的增量。已跑批次不热换合同，不改源调度、账号或网络层。

schema4只新增 `research_terms/research_grams`；正文、历史K1、旧经验/策略/rk、分类及运行绑定不重写。幕/阶段/目标使用显式索引预筛并复核同一原阶段，短词使用grams，长词用原FTS。研究不进入 business_items 的 strategy/reflex 类型。新 reader 对 schema3 保持旧工具读取，schema4 才公布研究工具；schema1/2仍需原owner迁移，不隐式落到文件库。schema3→4在原唯一writer自然边界用同一KnowledgeStore事务升级，失败整笔回滚；只读消费者不升级。

ops切换前先用原CLI做 SQLite 一致备份，冻结源码/原K1/绑定/成员/SHA，隔离验证后再按原部署合同部署源码和迁移。既有局继续原K1；新增文档只在下一合法绑定可见。数据回退沿原rollback切旧K1，已有绑定保持；schema4历史表不降级。若回退到只认schema3的旧源码，须在自然边界从升级前一致备份恢复到新目录、核原绑定及已发布后续研究并保留原库，再按原恢复合同切换，不能用旧源码直接打开schema4后称兼容。不得覆库或删候选/旧证据。

新writer首次可写open会按原KnowledgeStore合同自动迁移，因此不能只先换ROOT写者而把LIVE留在schema3-only旧reader。原ops沿原事务/对局自然结算边界完成一致备份、匹配ROOT/LIVE读写源码、唯一writer升级及新局绑定；核旧可写进程已结算，不热换其在途代码/批次。新reader对schema3可读，部署配套读者后再由单一写者升级；原K1身份与原批次绑定均不重绑。

## 大脑工具

只有Silent绑定SQLite快照且schema≥4时，`buildKnowledgeTools` 公布 `kb_build_research`；其他角色的工具目录保持。底层存储按角色隔离，其他角色不被此项自动启用研究消费。动态工具定义、MCP、API和提示能力目录都取同一个 ToolDef。没有新增网络、SQL、路径或角色覆写输入。初始plan/后续plan复用不改，不要求每题查询或重写计划。

1. `{"query":"*","act":2,"game_version":"实际版本"}` 检索研究目录；可给 `stage/goal`（同阶段显式匹配）、语义关键词、limit/offset。角色/精确进阶固定为实际工具上下文。未知版本保留unknown，显式异版本不返回；未给版本时请求版本明确为unknown，不能说版本匹配。幕/阶段/目标未标注不证明不相关，可去掉筛选检索原文。
2. `{"query":"*","id":"目录返回的ID","page_offset":0}` 获取结构页，`next_page_offset` 续到null。按ID仍受角色/进阶/所给版本限制。每页保留全阶段目录及previous/next，证据与限制不被静默裁掉。
3. `sections` 的每项带JSON pointer、part/parts、`encoding:"concatenated-json"`、json_fragment。同pointer按part拼接后JSON解析，可精确恢复该值；数组的每项独立pointer，空数组本身也是一个值。所有字段（包括original原字节文本、来源、反证、limitations和unknowns）都可继续取得。每页≤24000 UTF-8字节；超长单字段继续分片，不跳过条目。`partial_document_follow_pages` 明示未取得全文，不以最后一页单独冒已读全。
4. 定位内容可用 `{"query":"*","id":"研究ID","pointer":"/phases/2"}`，或 `{"query":"*","id":"研究ID","artifact":"trajectories","pointer":"/cases/19"}`。pointer只在已绑定研究JSON或所选JSON附件内解析RFC6901成员，不解释路径、SQL、URL或表达式。`pointer:"/sources"`、`/limitations`、`/unknowns`可补取上下文。附件目录每页给ID/媒体类型/SHA；JSON附件可继续取其字段可用性表、指定轨迹、阶段/相邻节点。选段仍用同样24KB分页，输出`selection.scope=selected_section`及`selected_section_only_not_complete_evidence`，不把选段完成冒全文或全部证据已读。正文/轨迹的科学解释由学习者负责。

检索是候选召回，`condition_evaluation=not_evaluated`。返回身份、查询/计划采用、实际动作和收益分别留证，现有只统计strategy/rk/experience的旧报表不自动把新工具算作其中一种。自然研究查询可直接在原 `brain.jsonl.tool_calls` 核完整输入/输出/ID/K1/耗时；未查询或未取得完整页保持未知，不为验收开新游戏或模型。

工程组合通过后，ops与原知识owner复用一个合法真实整体候选：核源→scratch归档研究条目/候选→原合法发布→当前生产ToolDef完整分页读回及负例→下一正常局按需查询/原plan证据。重复同候选ID核只有一次发布，回退核旧绑定。开发临时SQLite绿不代此运行闭环，也不关闭#48/#50/#51或胜率父要求。

后继053954（#72评论6404052804）的整册/20轨迹/808节点及DTO缺口沿同一合同接，原核源回执单列，不热改原学习树或在途候选；原#60四情境补证继续原CAS修复/发布链，不等待此类型。附件只进本地runtime与忽略的格式探针目录，原外部数据及轨迹正文不提交公开Git；许可原文和不再分发限制一并保留。
