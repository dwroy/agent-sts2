# 静默猎手策略提案批次报告

记录时间：2026-10-14T16:29:24+08:00

十个已派发 id 均 waiting。证据可支持即时资源与计划边界的核对，但尚不能支持这十个综合提案的完整行为修改或验收。fixes=[]，merged=null；没有源码、知识、任务模板、版本表或运维 prompt 改动，没有生产测试成功声明。

## 身份与基线

batch=20261014-161301-strategy-proposal，task=strategy-proposal，character=silent，reason=proposal。根 learn.json 本行有十个 proposal_ids，没有 research_request、implementation_request、proposal_repair；实际工作树与题面相同。普通专题请求文件属于另一批，故不承接专题，不读取另一 work_spec 代替本批身份。完整派发行已保存在 batch.json；十个原Markdown的源路径/SHA均与专用队列一致，副本及队列快照在本目录。

开工 git status --short 为空。按普通提案要求 git merge --no-edit main 返回 Already up to date，base/HEAD=46993bc280403cccc4c021e31a43d53dbe562d77；不快进之后的 main。最终需读回同一HEAD与干净工作树，scratch属于既有忽略目录。平台未提供本会话实际原生请求模型/推理强度查询接口，本报告不把仓库默认值当运行身份核验、不改账户/权限/模型参数。未派下级agent，未联网、未运行play。

## 五局实盘范围

| 局号 | 角色/进阶 | 状态 | 决策 | SL记录 | 计划 | 运行身份 |
|---|---|---:|---:|---:|---:|---|
| NHA2KW0RB7VP | SILENT/A10 | 602 | 584 | 7 | 5 | b8ca9311+dirty |
| P74C04AEPL1F | SILENT/A10 | 410 | 395 | 5 | 3 | fd4c8e52+dirty |
| G33HU22H2543 | SILENT/A10 | 879 | 850 | 8 | 6 | 710dc4dc+dirty |
| RC61MFQM63Y6 | SILENT/A10 | 694 | 674 | 7 | 7 | 0d6c1a82+dirty |
| BTSRF7JL1W1Y | SILENT/A10 | 653 | 635 | 4 | 5 | 6ad5584f+dirty |

仅筛选并解析这五个局号，runs.jsonl及每个状态角色均核为SILENT/A10。共3238状态、3138决策、31SL、26计划、5runs、5config，合计6443原始行。run-plans按真实run字段提取。manifest.json记录各源读取上界；*-index.jsonl逐行记录原行号、byte offset/length/SHA和冻结偏移；verify-evidence.py已逐项seek原日志重新读回6443条原字节，全部与冻结副本相等。角色知识未混用；没有重算原提案109/112/113局或73局等历史统计，不将其数值冒充本批新验证。

五个config均声明dirty，记录的commit仍保留，dirty_files均为当时知识/记录叶。当前提交通用源码不能替代当时完整知识与运行依赖快照。后续概率校准须先取得对应输入/抽样/模型绑定，不能把旧dirty运行冒称已用当前模型实打。

## 本批核证和行为限制

- NHA2KW0RB7VP F33第1/6试T1同指纹：30→29与30→23；末挡14/8，敌总HP净减少8/24。第5次277248、277250及第6次重放显示SL覆盖Jev原线。支持“多16输出伴随多6HP代价”，不能证明保血线整战更优或新SL门槛。F24/F27/F32实休分别18→42、21→45、4→28；未来营火不当已经回复。
- RC61MFQM63Y6 F33第1/6试T1同指纹52血：两线都实际喝槽0药，挡16/12、HP损4/8、净扣敌30/23；触媒1层及3毒结后剩1确见。第3试T4 states285414→285415生存者/打击变空手，火箭57保持。当前唯一单弃修正已有live实现；尚不能规定“必先能力”或从24/24全死得出即时等价。
- P74C04AEPL1F F23第4试T3：1血、16挡、2能；四个弃牌项为紧勒、毒雾+、精确切击、贪婪；实际弃slot2精确切击后重规划。石16加卵8，末卵经毒剩2仍杀1血，石眩晕并不代表其他敌攻击停止。当前函数对四项只作手牌投影；本批读回slot2投影与下一原帧实际手牌一致，没有四个动态后继的剩血模拟，也没有保留精确的实打胜线。
- 同局F17火焰182→181/滑溜8→7；12毒在滑溜下180→178，清空后T8/T9为44→21。F22寄生0→21复活；T2/T4实损20/24，53→9赢接F23；主怪最后归零帧仍缺。这些实帧不足联合验收全部召唤/触媒/一次翻倍/用药条件，更不能由净差拟新药价或杀序。
- G33HU22H2543 F48首试闪亮实际先施放，后余像只建1层、药后才2层；末试T8挡0→5→10→12，12HP对31攻击，末敌29/148仍在。实际零血截断为净损12，显示攻击减当时挡为19、至少需额外8血才能活的算术与实扣分列；没有去组件或另一首牌线的整战实果。
- BTSRF7JL1W1Y F31睡层3/2/1/消失、T3/T4力量2/4已核。279852原选投掷匕首后被抽弃重规划成279854防御与两小刀朝石；两题均有3/4存活/获胜样本文字，但题面/后继不同。末T4为14HP、5牌挡、1覆甲，对甲虫22攻击，零血、甲虫余13。该战sl_attempt真实为null，不补成1；case-windows.json相应attempt=1查询为空，不以空查询称无日志，正式核验使用原行号。单次死亡不是概率或权重失配的证明。

fact-checks.json中38项原帧/算术断言通过。首次事实脚本把BTS弃牌option_index预期误写为4，实际原决策是2；37过1败的fact-checks-first-failed.json及初稿facts-first-source.txt保留，纠正槽号后38过。首次资源脚本rest/choose前缀不匹配真实rest/plan导致零条，纠正为原rest动作后重新生成resource-observations.json；没有把零结果说成原日志缺失。初始路径探测sl.jsonl/两个不存在源码文件的shell失败亦不当生产故障或测试红绿。

## 当前live的已实现子范围

冻结核验live HEAD=c268cf3a5b1a299c2da52edeb5748ace5ea2a566。source-audit.json列16源码叶、完整40位来源commit、实际live祖先检查与Git blob/SHA；11叶完全相同，5叶仅Roy→Dai注释署名差异（逐字节替换后相等），不声称这5叶blob相同。

投斧首牌身份、唯一单弃、弃牌快照、SL候选/资源/最终选择日志的实际live祖先源码包括a8b1f8be153fe4f3a34146117546c2178f2e446b；选择入口还有66283dd9982bdd7f480da7a4d9bfefea0572a9ac。执行审计/观测/整轮/终局消费者分别核到6f3f783941270ac182237c46068097ff67e85907、8698c581dac6c7e957f50a381586960a6d0c9b57、9b87d54f097d84521152e6cca8d6072af8140394、04921bd785ac6838066522f91ea0bb6ab95cb6a1，均为该live实际祖先。subfeature-readback.json以本批P74原帧读回四个保留手牌投影、G33原帧读回不同首牌key；不加载刷新知识、不请求模型/网络。这是既有子功能验证，没有本批实现commit；任何一项宽提案均未被这些子功能完全覆盖，不标duplicate/implemented。

## 原执行审计消费者读回

使用本工作树既有learner/lib/selection-execution.ts，其与冻结live消费者blob相同。原始行号、时间、指纹、房间、SL身份保留：

| 局号 | 整体输入 | 已核动作 | 候选片段 | 可连观测区间/总数 | 整轮端点/总组 |
|---|---|---:|---:|---:|---:|
| NHA2KW0RB7VP | 接受 | 584 | 105 | 160/584 | 20/96 |
| G33HU22H2543 | 接受 | 850 | 107 | 310/850 | 50/140 |
| P74C04AEPL1F | 拒绝，按缺口分段 | 394 | 58 | 82/394 | 13/73 |
| RC61MFQM63Y6 | 接受 | 674 | 135 | 242/674 | 29/105 |
| BTSRF7JL1W1Y | 接受 | 635 | 98 | 238/635 | 36/98 |

P74全输入按既有门禁失败：原decisions:278271 map/route-change无decision_id。该行及失败原件保存在P74C04AEPL1F-full.json；按缺口切为2段后仅核394有效动作，不删除它再跨接。其余四局整体输入接受。合计3137有效动作、503候选片段、1032可连/2105未知观测区间，512回合分组中148有可核端点、364未知；全部actual_full_candidate_result=null。端点净HP、恢复路径和候选预测分账，既不能说全无实际执行，也不能认证整条候选收益或拟SL/药水/路线门槛。未采用候选没有反事实实果。

## 十项处置与台账

完整逐项证据、账本、反例、拟合/验证/回退在本目录proposal.md；机器处置在result.json的proposal_results。十个id全部waiting，理由均具体到缺失输入。已有id沿用，不另建重复提案，不改原提案Markdown/专用队列历史。原账本通过根ledger.py update只追加by/where/note，将32个相关静默账本项关联本批报告；不改claim、首证、prior、evidence、version和旧status，不标shipped。精确CLI输入及结果在ledger-updates.json/ledger-update.log，最终读回另存ledger-readback.json。没有新规则异议或与旧经验相反的实帧结论，不重复制造旧通知；等待状态由完成回报交ops沿原队列保留，不冒称watcher/Roy已读。

## 测试、合入和后续

无源码改动：tsc/vitest/cases全部null，未运行生产测试，撤源码失败/恢复通过不适用；38事实核验和既有函数读回不是生产测试门禁或新源码红绿。未提交、不推送、不合live、不增eval版本、不登记shipped、不发实际上线双通知。gitleaks结果及最终HEAD/工作树检查存于本目录收尾回执。若后续取得足够的冻结动态分支、对应模型/抽序或完整消费者实线，在这十个原id下重派；本报告不关闭相关宽提案或任何量化学习父要求。

proposal绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-161301/learner/runs/20261014-161323-strategy-proposal/proposal.md

report绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-161301/learner/runs/20261014-161323-strategy-proposal/report.md
