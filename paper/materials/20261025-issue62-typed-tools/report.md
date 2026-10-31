# #62 类型表与 tools 工程交付

开发基线 `32c6b922a07963227ff86fd0b27d85014cd5f769`，独立分支/树 `issue-62-knowledge-typed-tools`。仅隔离数据与固定测试；未开局、未改 live/STOP、生产 DB/控制、其他会话或知识内容。运行按 nice19，测试单 worker；最终实际 main/ROOT/LIVE 组合完整检查由集成员按评论6392991760原唯一窗口串行接收，#60真实候选与自然局并行，不作为本项前置。

## 结果与合同

- schema 2 追加八类 business_items 与经验、策略、rk、core、combo、旧 direction、vocab、fact 字段/约束/索引；共享原修订、候选、K1、发布、证据和运行绑定。原文保持完整，子原 ID/父关系、证据/反证和来源独立存储。v1升级事务回填所有已有修订，失败原子回滚；不重学、不改 K1、不抹原失败。
- 保留三个旧工具名称和参数，原开卷实体工具接索引，运行绑定时另开放核心/组合/词表工具。真实 ToolDef→参数校验→固定参数 SQL→原动态条件→≤24KB/稳定分页。角色/进阶/K1不由模型选；无任意 SQL。单字/双字中文 grams、FTS5、角色内明确别名关系索引；无匹配返回绑定版本的空结果，不换库。
- 静态召回缓存按 K1、角色、进阶及结构化过滤隔离；解析缓存16MiB、召回缓存8MiB（按序列化大小计，并非 RSS 上限），每进程最多8个绑定连接。HP/牌组、经验 relevance、策略 trigger/流派与 rk 构筑筛选仍每题计算。core/combo预存明确摘要，完整 metrics 保留在原 JSON；来源/证据不截断，过大单条明确 skipped，next_offset可继续。
- 多主题只来自明确 topics；没有标注就未知，不从中文描述、ID或格式推知识。核心 status=candidate 不升级为已验证。统计继续 DuckDB。

完整 schema/映射、tools 示例、边界及升级/回退见 `docs/knowledge-typed-tools.md`、`docs/knowledge-runtime.md`。`agent/tools/knowledge-typed-audit.ts` 可从冻结已发布源重现隔离核验、索引计划、冷进程/冷工具与热 P95；要求全新隔离目录，拒绝复用现有运行库，并在结束核源码 SHA 未变。

## 覆盖与差异

冻结的扩覆盖检查输入仅本树基线 `knowledge/` 白名单文件，原路径/叶SHA、逐类型全部原ID/父ID/原文SHA、关系和证据计数在 `delivery/coverage.json`。这是基线Git来源的隔离投影范围，不冒称当前生产DB已迁全11文档。未读取 ignored overlay、pending、原局日志或游戏二进制。

| 类型 | 角色 | 条数 |
|---|---|---:|
| experience | ironclad / regent / silent | 232 / 8 / 245 |
| strategy | silent | 116 |
| reflex | silent | 165 |
| core / combo | silent | 4 / 17 |
| vocab | silent | 101 |
| fact | common / silent | 974 / 100 |
| direction | 当前正式源无此文件；固定夹具覆盖旧合同 | 0 |

上述基线11文档，类型条目原文逐条等价；共享经验0条，固定合法公共夹具及公共事实查询另验。流派几何原件保留 documents/snapshot，不当作正式流派知识。暂未覆盖的原模型/统计、原攻略和附件见合同表；未发布材料始终排除。

交付前接集成员新增评论6393306971：#60当前已发布源已从旧116策略版推进至 **K1-fa912eafff5ba568bd3000f269fcd58438f377bf3a856d28908662b8af910ea0**，父为 `K1-b781414619186e1bda2f20b7c6fe76ec46e8e04bf50f922774b9e66778f7da38`。另对这两个**真实不可变快照**校验全部manifest叶SHA，在全新隔离库做旧版导入、真实v1形状回填、新候选增量、旧/新运行绑定、原文/反证/关系读回及回退保留。当前源为8文档、Silent策略124条；旧116及其余7文档逐字未变，不把116硬报当前总数。逐源/类型/原ID/父ID清单、原发布回执SHA及新增8个 mixed 策略的7 conflict/1 unassessed、0.45可信度、全部原字段与50次工具回放见 `current-release-readback.json`。这不重放生产发布或迁移。

当前正式DB的8文档**尚无**两份open-book与几何文档，因而当前发布范围的fact=0；不能以基线11文件的隔离成功冒称事实已生产迁移。新类型投影会从当前所有修订回填；新覆盖的事实/几何源仍须原owner核准实际已发布字节后显式extend，旧K1不补未绑定内容。升级/新局前须单列核这三文档的取舍、工具可用性和必要切换顺序，不能静默退回Git。原生产指针仅用只读 `current` 观察，未修改生产库。

有意变化：SQLite开卷按公共+当前角色隔离，铁甲不再读旧加载器固定附带的静默专属100条。铁甲经验数据、规则、参数、执行未改；其自然工具使用及行为影响交ops核收，不能称所有角色行为绝对等价。

旧 K1 的原文档集合保持原样，缺实体事实时不默补 Git。显式 `extend --base 原版 --knowledge 已发布冻结源` 只增加缺失文档，经原候选/CAS/幂等发布，忽略基线已有文件，不能用旧Git覆盖新runtime经验。

## 检查与时延

生产类型检查与两CLI专项严格类型检查通过；最终定向7文件87项全部通过（`targeted-delivery.log`、`tool-tsc-delivery.log`）。固定用例覆盖：逐类型新建及v1升级、DDL/发布失败原子性、幂等、备份恢复、嵌套combo/vocab证据保护、kind+ID/维度+ID碰撞、显式多主题不复制、角色排除/公共来源、中文/别名/无匹配、参数拒绝、121个不适用候选后的分页、HP动态重判、旧新局/回退/重启、独立进程与并发只读事务、旧源扩覆盖不覆盖新内容。没有执行生产学习、模型或游戏。

规定 sandbox 以 `SANDBOX_WORKERS=1 bash tools/test-sandbox.sh` 执行，首轮生产tsc0、635文件5884项通过；唯一 `check-imports` 失败为稀疏树缺基线已跟踪的 `paper/materials/issue29-brain-speed/results.jsonl`。从**原基线32c6b922**取原blob恢复，211076字节、SHA256=`8d83deb7c85a8b7ceb92da9ffb195f13edf4fa2876f9be5692ec8d2ded1c23ef`，未改源码或断言。随后用同脚本选择该受影响文件：生产tsc0、threads imports1过，再执行原末步fork paths+imports两文件12项全过/rc0。首轮rc1/失败及恢复回执均保留（`sandbox.log`、`fixture-restore.json`、`sandbox-fixture-recheck.log`）；没有将首轮改写为整套rc0，也没有用旧版本结果替代新源码。除恢复同一Git夹具外，已通过635文件的输入未变，未另重开整套长检查。最终实际部署组合的完整回归仍由原集成员接。

最终测量以 `delivery/{source-manifest,real-performance,scaled-performance}.json` 为准。每个真实工具100次顺序热调用；万条精确查询100次、宽相关查询30次。DB列是同类型固定SQL首100条的独立计时，完整tool列包含真实ToolHost、召回、动态判断、来源/证据/输出序列化及审计。静态缓存命中不冒充DB执行；不同统计均单列。新进程是独立Node+tsx启动至首工具返回，未清OS文件缓存；cold_tool是清只读连接缓存后的首调用，均不含LLM/网络。

| 真实数据工具 / 输入 | DB热P95 ms | 完整tool热P95 ms | 首tool ms | 新进程至首结果 ms |
|---|---:|---:|---:|---:|
| experience relevant | 1.89 | 1.59 | 37.27 | 412.82 |
| experience 启动 | 0.54 | 0.86 | 2.17 | 245.04 |
| strategies * | 0.59 | 0.56 | 4.70 | 238.71 |
| reflex * | 1.53 | 1.32 | 9.56 | 244.21 |
| open-book ABUNDANCE | 0.58 | 0.14 | 4.07 | 237.54 |
| cores * | 3.32 | 0.37 | 4.67 | 248.68 |
| combos * | 4.20 | 0.77 | 4.71 | 255.10 |
| vocab * | 1.28 | 0.59 | 3.48 | 266.49 |
| 万条合成经验：精确ID | 0.18 | 0.09 | 1.75 | 244.29 |
| 万条合成经验：relevant | 1.79 | 14.56 | 167.90 | 503.13 |

真实及放大库所测热P95均低于50ms；冷宽查询没有此保证，万条首调用仍168ms。变更过滤组合导致召回缓存未命中时须重新检索，不能将热值外推为所有新题的上界。实际自然局总延时和采用尚待ops。索引计划逐项保存在对应结果，使用business_order、release_entries、item_terms/grams/FTS等固定索引；没有以DB首100条耗时代完整tool。

首轮真实组合tool热P95约102ms，保留在 `audit-v2/real-performance.json`；组合大段metrics的传输是瓶颈，后补tool_payload后改善。万条旧OFFSET内部分页过慢，本会话仅核PID/birth/argv/cwd后停止自己的隔离审计，原库/结果保留，见 `audit-v2-abort.json`。改索引游标后万条宽查询仍233–465ms，原 `audit-v3`/`audit-v4`结果保留；最终增加有界的版本静态召回缓存，未缓存动态适用性。旧值不被删除或冒称最终通过。

早期开发也保留：SQL列占位数失败（修为匹配实际字段）、审计按裸ID误报三个跨类别实体（修为kind+ID）、两次工具专项tsc命令缺必要配置/Node类型的失败、最初根目录tsx导入失败及正确agent目录重跑。它们不是生产事故或游戏知识反证；日志/差异原件保留，最终检查只覆盖交付源码。

最新发布源的补充回放首次使用了不符合原标签合同的 `event` 夹具，按原题型规则被筛空；改为 `event/probe` 后8条实际ToolDef正例、旧版/错幕负例、逐原字段等价全部通过，50次热P95最大0.441ms。只修材料中的回放标签，不改生产筛选。首稿、失败log和修后原件均保留。

## 接收、上线与回退

1. 集成员鲜核届时实际main/ROOT/LIVE、#59差量、依赖和此源叶SHA，固定最终组合，沿原唯一窗口完整回归；本树sandbox和旧#60/#59结果不代新组合全绿。
2. 原ops在publication-admission自然边界，核旧writer/在途事务及一致性backup后，沿原 `init` 升级本实例库；独立核原K1、所有已有修订/候选/ID/证据/运行绑定及类型回填。不重新导入或发布已完成的#60迁移。
3. 原ops按确实已发布源决定是否 `extend` 新覆盖文件。旧局保旧K1，新局选新K1；核真实学习候选→类型投影→原事务发布→生产ToolDef正负例→自然局版本/工具证据。源码、库schema、K1、控制SHA与角色/进阶分别登记；不把固定回放当自然采用或收益。
4. 数据回退用原rollback，保留新候选/历史/旧局。若源码退回只认schema1的#60代码，保存整个schema2现场，将升级前一致性备份恢复到**新目录**，沿自然边界核writer/控制后切换；不能用旧代码直接打开schema2或覆盖活动原库。

runtime负责人为原ops；游戏知识/自然采用/效果由原学习与运行责任链继续。开发树/分支/原会话保留供返工，不关issue、不调用retention complete或删除现场。工程接收后按#59原授权核空闲释放；未完成运行/科学父要求保持开放。
