# 静默策略学习批次核验报告

记录时间：2026-10-23T12:27:50+08:00。

结论：十项原提案全部保留waiting。本批核实既有局部实现与原始证据，没有证据支持新增策略数值或改变预算/护栏/SL规则；没有源码提交或合入，不把局部已覆盖冒称原宽项duplicate。

## 身份、基线与边界

批次`20261023-110001-strategy-proposal`，工作树`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-110001`。初始HEAD为`4d27513beba43b10e147a066d288e3ddf1bf05ad`，初始git status干净。按普通批次要求合main，快进至完整base `7d0821a0dc746766ea5aaab24bc7f931d1888332`；没有合并冲突。最终HEAD保持该base。

根learn.json对应行task=strategy-proposal、character=silent、reason=proposal，proposal_ids正好十项，无research_request/implementation_request。旧deck-size根请求绑定其他批次与工作树，不适用于本批；未读取其他专题work_spec，未代写请求或调度状态。

仅读取本批六个Silent局、各自原提案/账本及现有实现。原题面内含旧历史聚合/经验文字，保留为原请求文本，不计作本批机制证据或额外本角色验证。没有外部数据、其他角色经验或预训练游戏事实入账。未启动子agent、联网、play、模型调用或知识刷新。未核本会话原生turn_context，报告不宣称档位已由原生回执证实。

## 完局身份与机械覆盖

`run-identities.json`保留runs原行offset/bytes/SHA及字节截点；六局角色均SILENT、A10、有ended、victory=false。

| 局号 | 结束层 | decisions | states | Jev原行 | 完整题面精读 | sl-attempts | run-plans |
|---|---:|---:|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 45 | 699 | 729 | 136 | 6 | 2 | 8 |
| 8JRE1C4H4Z2W | 33 | 659 | 676 | 139 | 4 | 7 | 6 |
| CA5KE8GFJ9X2 | 13 | 265 | 282 | 58 | 1 | 0 | 2 |
| 5PM6JAQG6FNQ | 39 | 638 | 660 | 92 | 1 | 7 | 7 |
| 61E2QS63Y9WU | 28 | 443 | 462 | 70 | 2 | 7 | 4 |
| DUZUBAJ3A8GP | 30 | 602 | 623 | 84 | 1 | 6 | 6 |

先运行指定evidence_summary入口，再运行指定V6/Jev四流提证命令；另经共用extract_evidence入口提取states、sl-attempts、run-plans。摘要仅作定位；没有把最后五条当全覆盖。

逐题清单见`question-coverage.json`：579条Jev原行中完整精读15条，其余564条仅机械提取、身份关联、字段检查，逐条标明未精读原因。不能由已提取或本局结局推出其余问题正确/错误。`questions/<原Jev行号>.json`保存相关完整原row、决策和后继窗口；`*-review.json`不删请求中的候选。原始大state没有整份灌入上下文。

## 冻结切点与完整性

两份evidence-manifest保留每流完整source_size/source_sha256、无效/截断行计数、身份缺口与所选原行ref。不同入口按各自启动时冻结，不能混成同一时刻。选题及关联决策/状态的原bytes通过seek(offset)重读并核SHA，不仅信摘要或提取副本。

| 流 | source_size（bytes） | 冻结SHA256 | 无效行/不完整行 |
|---|---:|---|---|
| v6-build | 64735263 | `7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9` | 0/0 |
| jev-prompts | 2938955371 | `8082140b3540e33ce4978ea034afccfe3577a5f5f5c57139be926257268e5762` | 1/0 |
| decisions | 4190808295 | `9406d378894ee8165d65a6ef4ca25650c4202234e72319ad2b9b0c9b95e5988e` | 2/0 |
| run-config | 2879195 | `384f8961196430d0558c70bd2d0b97c404a351d93b5d47d9905909bbc7569586` | 0/0 |
| states | 16412308574 | `acb74d3d1ddd6b0cba0755dd8790c6b31d839b433f7c1f85b3f59305334d98fd` | 2/0 |
| sl-attempts | 58083903 | `90fce2019e3eea97b6e74afc89691c970e46ff34881653c4e289124325eed9ae` | 0/0 |
| run-plans | 11418695 | `b5612d0fd90e45c40d1a0f72ee43f98ad963aab7fbb8d16c673451ee597fbd60` | 0/0 |

全局流的无效行和未知身份保留在manifest，不能因未关联本批而当作不存在；没有把正文提及、时间邻近或相似question_id建立为本局身份。run-plans按原字段run核归属，33条本批匹配为当前截点事实；没有复用旧零行初稿或覆盖旧报告。未收到要求复核的具体旧source-size，因此没有冒造旧截点结论。

V6四流提取产物的共享对象回执有`pending_host_seal=true/deferred_errno=18`，如实保留；本批原字节和摘要SHA可核，不宣称宿主封存已完成。

## V6与Jev语义分账

六局v6-build均no_match，冻结流共682条、本批零匹配；没有本批V6原row可供读取，entries/jev_answer/fallback/unknown均为未观测/不适用，不能写成已观测零事件。六条run-config均存在，但不含v6字段；历史缺V6匹配与配置未登记分列，无法由此核定明确off/on。

Jev 579条均有request/answers字段，没有error字段；这只是本冻结切点的日志字段统计，不能证明请求从未出错或题目正确。精读15题都有答案，逐题核代码chosen/result和后继状态。全部3306条本批decisions没有gate_reject和selection_dispatch字段；历史字段缺失不等于零拒绝或完整执行成功。当前源码的selection_dispatch存在，不会逆写到旧局。具体计数见`stream-semantics-counts.json`。

完整题面只证明发送内容；Jev选项、代码护栏、SL替换、单动作接口completed、pending以及原始后继状态分别记。本文没有把候选中的未来毒/成长/杀序当实打，没有把HP损失封顶当死亡样本并列，没有把本批提证当新发布、下一局消费或自然收益。

## 已精读问题与原始追溯

下表均完整读题、答案，按精确decision_id核decisions。每个原行的offset/bytes/SHA、冻结切点、identity及decision_ref均在相应questions文件与coverage中保留。

| Jev原行 | 局/层/回合 | 精确decision_id | decisions原行 | 题面及执行核验 |
|---|---|---|---:|---|
| 26715 | CA5KE8GFJ9X2 F13 T1 | `4d2edeea-9070-486d-90ab-7824c3aae24e` | 267361 | CA5 F13 T1低血3入场，原答plan3；杂技pending与选牌后重问分列，下一轮HP2，不将前整候选当完整执行。 |
| 26754 | 61E2QS63Y9WU F17 T4 | `5ac4f6fd-bdad-4d3b-8884-ad5fdffefaa6` | 267605 | 61E F17T4选plan1；155→104、60→56；T6出现敏捷−2且防御仅3，持续毒与属性分列。 |
| 26768 | 61E2QS63Y9WU F23 T2 | `61a5f47d-5ac0-4c6d-b2ac-f1bad6ccca1f` | 267686 | 61E F23T2选plan2；原有幻象21/主怪105，实后继玩家49→45、主怪87，两敌T3各力3；复现/退场全周期未核。 |
| 26872 | 5PM6JAQG6FNQ F39 T2 | `f944c606-e935-45f4-8968-e844bab41fac` | 268417 | 5PM F39 T2负力敏各2，选plan1先后空翻；重问后本轮29→19，非原候选预测13损；T3才见毒雾3。 |
| 26944 | DUZUBAJ3A8GP F30 T2 | `7e432247-4137-42fb-850b-155839f73f4b` | 268969 | DUZ F30T2选plan1先杀石虫；下一轮我仍5、甲虫仍89且睡2→1/覆甲18→17。减员后index重排，不把索引当稳定身份。 |
| 27063 | VLZ6CCT8AQ0A F35 T1 | `21d9d2a5-8f60-4caa-816d-98cb2542d0d5` | 269598 | plan11含神化、原预测37伤/损19；先派发神化，实见能量7→5和手牌升级；后继目标变化不能只归神化。 |
| 27083 | VLZ6CCT8AQ0A F43 T1 | `f1233b3d-ee2c-4c00-ab16-d6aafe1dcb68` | 269706 | plan1含神化，43伤/损14且unmodelled；先派发神化，随后重新提问。 |
| 27084 | VLZ6CCT8AQ0A F43 T1 | `1255c12e-9a86-457f-8d27-77861f95b4d6` | 269707 | 升级后plan1为51伤/损13；states275680→275687敌254→203、我90→77一致。 |
| 27093 | VLZ6CCT8AQ0A F45 T1 | `04b5c1fd-fc69-4e01-9c6b-c2417cd16d31` | 269748 | plan4不含神化；MC 1/12、707ms，horizon1/samples1/best null，题面明确fallback而非确定死亡。 |
| 27094 | VLZ6CCT8AQ0A F45 T1 | `1bb372a9-4fce-4c82-b60f-70d23e4be75d` | 269754 | 选p0且代码use_potion槽0；MC12/12只为局部样本。states275728→275730能量1→2、HP67不变，实际抽牌后按真实牌继续。 |
| 27100 | VLZ6CCT8AQ0A F45 T4 | `b058661c-0e8d-49f0-873a-057b31ed4fde` | 269770 | 选plan1猎杀者+尖啸，预测24伤/损13；states275745→275748核敌总HP205→181、我45→32。31损/32伤攻击候选未实打。 |
| 27175 | 8JRE1C4H4Z2W F33 T2 | `bc75ba70-96d4-46c3-b83a-5b2a240adab3` | 270216 | 首试T2原答plan1；326→316敌血，我47→44；原题rollout8样本，与第三试24样本分列。 |
| 27190 | 8JRE1C4H4Z2W F33 T5 | `ffea0d1f-020e-4db2-92e4-b81495fa68cc` | 270263 | 第二试T5先选后空翻+尖啸+冒泡；抽牌后重问，不能把这次整候选当已执行。 |
| 27191 | 8JRE1C4H4Z2W F33 T5 | `27125175-ab43-41fe-98a5-6a28c59c6299` | 270264 | 重问选plan4逃离+冒泡，HP护栏换plan6尖啸+逃离；预测损16/4、伤43/25，后继实损4/扣25。 |
| 27194 | 8JRE1C4H4Z2W F33 T2 | `a0a63fc0-828b-477c-9705-72c7e45ee4c3` | 270282 | 第三试T2原答plan1，SL换plan2；同题原/换0/24与5/24死亡，完整本轮实扣10/17、实损3/15，差12血/7伤。 |

## 现有消费者实际读回与限制

使用当前现有`learner/audit-selection.ts`，固定输入为8JRE的659条决策、676条状态，answers只经唯一精确decision_id关联原Jev行，保留原行号和SHA，未排除任何本局决策。入口退出0、stderr为空，得到113个选线segment、659个动作、111个轮窗口。输入、输出、准备记录及读回均在本目录。这是一次现有离线消费者执行，不是新增代码测试、live自然消费或收益。

核回F33首/第三试T2的整轮端点分别−3/−15 HP及敌−10/−17 HP；F17T6原候选在投掷匕首后的选牌/重问处终止。F33末试T11终局端点5→0是截断净损5；显示攻击37减挡22=15只是显示算式，不等于实观未截断入伤。结束回合前后敌154→130是该区间−24；整轮从166→130是−36，两者不混写。`actual_full_candidate_result`/因果归属仍保持null。

只读实际live在取证时为`f3fb25b73be7f170f46b240353995b9fe73596a6`。`existing-source-readback.json`保存八路径SHA与真实live祖先源码提交；神化表、card-model/turn-solver及三审计模块和离线消费者与工作树核同，hand/loop不相同（live存在后续工程变更），不拿main树整体冒充生产。

已有局部源码示例：神化表`a46239a29c3109ff9f69224ad77128d9929d3e9a`、候选审计`9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`、单动作派发审计`fdaf787a372880b0438e73bcac7e6d2168b038ed`、离线消费者`a32050fbce4c2863f640468c2dbf378fc9157074`，均核为取证live祖先。这只证明这些已有子项，不为十原宽项填implemented/duplicate。原selection-execution文档也明确子项不等于原宽提案全部完成。

## 原文缺失、逐项处置与继续条件

三份原Markdown可读且SHA完全一致，七份不可读。已查原路径、主树同名文件、Git跟踪路径和retention相关manifest；找到的旧170245压缩副本是verified-evidence/ledger-source，并非所需七份Markdown，不能拿它们或摘要冒作原文。未改其他工作树、未整包恢复源码。预期SHA与路径逐项见proposal-original-readback.json。后续需原owner恢复对应准确字节或提供经核验的正式修复链接；本批不代写原提案。

逐项证据、账本、旧/新行为边界、反例、验证与回退见`proposal.md`。所有waiting处置如下：

- `silent-proposal-89354805ee4d7e77`：本批F35/F43直接升级对已被live的局部神化实现覆盖；弱/脆弱、重放/自动出牌与未知升级仍被源码明确保留unknown。本批没有这些组合的独立原帧及跨重问/SL完整校准，不能扩为完整实现或登记duplicate。

- `silent-proposal-f2bfceddb1898dca`：F45T1核到药水MC 1/12、707ms及horizon=1降级；后问12/12也已核。缺同起点、同随机池、同总预算的受控配对和候选稳定性曲线，且神化仍有覆盖边界；不据单题修改MC预算、留药或杀序。

- `silent-proposal-283a164780d11e69`：原Markdown缺失，无法核78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637对应的完整要求；另一神化提案不能代原文，已有局部live源码也不足登记整项duplicate。

- `silent-proposal-ebbfe3b97548756d`：原Markdown缺失，无法核08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2完整十五子项。已有题面/账本列表只定位范围，缺攻防、触发、持续资源与战斗/路线/休息消费者逐项联合校准。

- `silent-proposal-e5b87be50f28f311`：已成功读回本局659决策/676状态及原答、护栏、SL替换、能力出现和终局端点；已有模块明确只完成原宽提案子项。跨抽牌/选牌/重问的完整候选归属仍为null，缺替换前后能力/减益、时钟和模型误差的联合校准及原线完整反事实，不能以审计工具存在关闭原宽项或改SL/护栏阈值。

- `silent-proposal-49632bc4878fb597`：原Markdown缺失（预期aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2）；CA5 F13仅补核低血入场、抽牌重问与后继，未构成正负力敏、逐击虚弱、蚌成长的完整联合校准，不能增加统一攻防权重。

- `silent-proposal-66532328a585941f`：原Markdown缺失（预期56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831）；5PM F39T2抽牌后已发生重问，T3才见毒雾3，候选13损与观测10损不能直接归某线。缺同抽序启动顺序的整场配对，不补固定启动权重。

- `silent-proposal-43a76a31ba7bdcfa`：原Markdown缺失（预期f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c）；61E F17T4→T6核到负敏捷和毒的独立状态，但没有同资源完整SL替代线路，不能据此扩大SL范围或规定毒胜线。

- `silent-proposal-5264153a4a4b0e5c`：原Markdown缺失（预期b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02）；61E F23T2→T3确认双敌与各自力量3，缺幻象死亡复现、航行及主怪死亡退场的本批全周期校准和另一杀序实打对照，不强制首杀。

- `silent-proposal-bddfa690a84e03d0`：原Markdown缺失（预期b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780）；DUZ F30T2→T3核睡层2→1及索引重排，尚不能覆盖睡眠/唤醒/眩晕/成长全周期与同抽换序整场结果，不从推演胜率加固定杀序。

## 提交、账本、验证与未完成项

无新源码/知识/参数，fixes=[]、merged=null；没有git源码提交、新eval版本或shipped登记，也没有发规则变更双通知。既有十个CLI提案ID和账本关联原样沿用，不创建重复ID，不降级既有shipped账本、不重复写历史复盘。无新增知识主张，因此未新增/改写学习账本。普通完成只回传proposal_results，未手改共享队列或关闭任何研究父要求。

无源码变更，tsc/vitest/cases固定为null；撤源码失败/恢复通过不适用，没有冒造测试成功。执行过的摘要、提证、原字节SHA核验和只读消费者与正式代码测试分账。初次gitleaks对本批目录扫描退出0、报告零条发现；定稿后另存最终扫描回执。未推送、合live、停局、改运维prompt或运行play。

保留失败与初稿：早期索引命令遇缺decision_id的元数据行而KeyError；改为只用真实ID建索引后成功，原decision提取未改。早期只读定位误猜了几个不存在的源码路径，已定位实际文件；不会据路径缺失认定功能缺失。个别终端输出发生截断，已按具体题面/候选分段重新读完，原文件完整保留。window-facts.json仅辅助选取字段（label未纳入该初稿快照为null），不代原row；报告的label和状态判断沿原bundle及现有消费者。

未完成：七原文恢复、十宽提案剩余联合校准、未精读564题、神化未知组合、受控MC预算实验、完整SL/目标序反事实、正式知识入库/live消费/自然收益，均不因本报告完成而关闭。

运维入口：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-110001/learner/runs/20261023-120145-576bf282-eea3-4e0c-a7a5-32c9d472dd60-strategy-proposal/proposal.md`；报告：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261023-110001/learner/runs/20261023-120145-576bf282-eea3-4e0c-a7a5-32c9d472dd60-strategy-proposal/report.md`。
