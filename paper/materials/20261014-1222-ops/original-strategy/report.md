# 本批策略提案核验报告

本批10个原提案全部waiting；机制支持和已实现子功能分别记录，证据未支持新的选择权重或整项完成。没有源码/知识修改、提交、live合入、eval版本或shipped登记。

完整base：`8ae20b998c2bdbebefae82a72dbcd0883d457312`。首次git merge --no-edit main因沙箱准备扫描遇到并行目录消失而未执行；同权限重试返回Already up to date，无冲突。
本批reason=proposal，有proposal_ids、没有research_request/implementation_request，与手动专题绑定条件不符，因此保持普通队列消费身份。没有读取其他专题替代本批任务。
README、最新根STATE-2026-10-12、decision-log末尾、学习协议及代码提案协议已读取；不派下级、不联网、不运行play、不读凭据或游戏二进制。

## 证据与边界

从根只读日志冻结六局4062条states、3941条decisions、38条sl-attempts、6条run-config、6条runs，共8053原行。evidence-manifest.json及各index记录原文件、物理行、字节offset/length与SHA；verify_evidence.py验证冻结字节和31项观测断言，四组同指纹实际窗口均一致。它们是数据核验，不是源码测试。
六局都是实际A10，run-config均dirty；dirty记录只有知识/观测数据等，并没有把当时移动表逐字落在这些配置行中。配置的prefix/system SHA不是完整DB快照，不以当前知识或源码复原当时运行树。
本角色经验库只读取所派25条，不将其历史支持数、[0,20]范围或未重新核实的新局当本批验证结果；未读其他角色知识。

| 对照位置 | 原/替实际窗口净损 | 原/替敌本体净扣 | 解释边界 |
| --- | --- | --- | --- |
| 8JRE F33首/三试T2 | 3 / 15 | 10 / 17 | 多12血多7敌净扣；预测0/24与5/24死亡不同 |
| YF F48二/三试T1 | 0 / 9 | 45 / 38 | 多9血少7敌净扣；不是预测0/10和54/36 |
| XP F33首/二试T3 | 9 / 14 | 24 / 27 | 多5血多3敌净扣 |
| XP F33首/末试T1 | 2 / 10 | 25 / 34 | 多8血多9敌净扣；成长另计 |

全部是相同起始指纹的实际观测区间；不认证跨续问整候选执行、不归因整战胜败，不将一个存档的六尝试当六个独立局。具体原行、端点与期望值见verified-evidence.json。

## 已有消费者读回

在agent目录用node --import tsx运行既有auditSelectionExecution，输入仅本批固定日志，不读取刷新知识、不调模型或网络。初次在项目根运行找不到tsx包，原错误保存在consumer-readback-initial-error.log；同时修正scratch导入相对路径。恢复后的运行exit0，这是离线读回，不是tsc/vitest或新源码验收。
完整CA5K和DUZU输入被原校验器拒绝，因为4条map/route-change元记录没有decision_id。保留拒绝记录和原行，不造身份；有界读回仅排除CA5K:267143及DUZU:268789/268818/268864。其他四局直接通过原校验。

| 局号 | 有界动作行 | 候选段 | 轮窗口 | 可核轮端点 | 仍未知轮窗口 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DUZUBAJ3A8GP | 599 | 77 | 96 | 28 | 68 |
| 5PM6JAQG6FNQ | 638 | 83 | 101 | 25 | 76 |
| CA5KE8GFJ9X2 | 264 | 41 | 46 | 0 | 46 |
| 8JRE1C4H4Z2W | 659 | 113 | 111 | 44 | 67 |
| YF0LXT1QSTGG | 1065 | 204 | 160 | 54 | 106 |
| XP2SL33HT0D9 | 712 | 123 | 122 | 35 | 87 |

合计3937动作、641候选段、1353相邻可核观测区间、636轮窗口，其中186轮端点与原连续HP路径可核、450轮窗口仍未知。完整候选结果字段全部null：这是消费者按设计保留的认证限制，不能推断原局没有任何完整方案实际执行，更不能据0虚构失败或实现成功。CA5K缺明确尝试号导致连接保持未知；不把缺号补成第一次。
原/替预测、单动作回执、观测端点、整个轮窗口与候选全执行是不同验收项。本批只新增本批读回材料，没有扩展生产审计接口或宣称自然大脑已消费。

## 实际live子功能与提交范围

只读固定live提交：`30569977308fe1bbc688053029c3c6ec84d323ba`；17个所读源码路径的引入与最新路径提交均核实际live祖先。source-live-audit.json保存完整40位提交、git blob与SHA256。
其中12路径base/live已提交blob逐字相同；turn-solver、combat-plan、rollout、rollout-live、passive-pieces五路径不同，差异保存*.base-live.patch，不将两树泛称等价或用本树运行证明整个live生产组合。

| 已有子功能 | 已核live祖先源码提交 | 本批确认范围 |
| --- | --- | --- |
| 候选选择审计/SL资源预测 | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 预测与未确认执行分列；selection-audit后续9d8278702dbc581b5015ba7ec9a70dc0fb94cccb也为祖先 |
| 单动作派发回执 | fdaf787a372880b0438e73bcac7e6d2168b038ed | 一个回执不证明整条方案执行 |
| 分阶段当前事实 | aad2700abed6dff1d66e87fb36aaa6fedb39adf3 | 持有/已建/当前毒分列，未兑现量null |
| 分阶段结束参考 | 1d57f9d0dbbb63603e9ce9768e74cb2021478464 | 本阶段结束参考，不证明后继阶段胜负 |
| 离线执行段/端点/终态/整轮 | 02c4e13ac8e159b82ee35a965ac788a0a029ce5a、dc0e6080cb20c508d94c006648cc3edf0188d306、83512ddcd2c70fd9b983dc38524ff25c8970c1d3、e75438488df159b2e8e9d3458cf219b39aadd933 | 固定输入已实际读回；原行缺身份、变更名单和完整候选归属继续未知 |

这些提交只作既有子功能链接，不是本批fixes/merged，不以其中任一个标整项duplicate/implemented。当前进阶HP/攻击首样本路径及ROOM_COST_MIN_N=5已静态读回，没有新增房间成本或怪物固定值。

## 逐项处置与交付

逐项原文SHA、角色/进阶、证据局/层/回合、账本、反例、旧/拟行为、缺数据、验证和回退全部在`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-114302/learner/runs/20261014-114326-strategy-proposal/proposal.md`。
- silent-proposal-c20b5139dd0dff71：waiting。机制帧证充分；缺该局原在线dirty A10移动表的完整冻结调用输入、火花增长/弱/勒紧/选择/污染联合生产回放及少技能替线完整后继。现有通用路径不能认证本提案全部条件。
- silent-proposal-ae9e692d680e3819：waiting。失落返4力量端点充分；缺遗忘死亡返敏、力量/敏捷其他来源与每次抢夺隔离、返还后同轮续牌的连续链。不能凭负属性公式标整项duplicate或补一个通用死亡返还公式。
- silent-proposal-52f1e1bd2e7db0ed：waiting。当前进阶首样本读取子功能已有；原dirty移动表没有逐字冻结副本，加压/弱/覆甲/荆棘联合生产回放及覆甲完整减层条件尚缺。局部代码存在不关闭整项。
- silent-proposal-6dd8bbff876be528：waiting。17→19增长有帧证；缺同类更替连续身份、冻结召唤输入与原在线A10移动表，不能认证新实体不继承旧实体成长或确定杀序。
- silent-proposal-578e415a259e6835：waiting。预测/单派发/整轮端点子功能已读回；缺跨重规划完整候选归属、逐来源累计能力收益以及SL恢复/回血/实际喝药的联合分账，不能以局部审计关闭综合要求。
- silent-proposal-c0767768bf6a7ab1：waiting。原/替窗口0/9与45/38已核；T1完整开场和跨续问候选全执行未认证，缺同起点/抽序/预算的独立完整尝试，不能拟惩罚系数或禁止SL。
- silent-proposal-a46bdb7fe711d79a：waiting。阶段清旧毒/力、零毒触媒及后得敏不倒补帧证充分；缺逐来源累计毒/挡收益、完整阶段后继及跨重规划候选归属，不能把当前组件快照当完整运转。
- silent-proposal-1044224808015e5c：waiting。两组5/8实际血价有证；缺完整候选执行归属、永久成长净贡献及独立后置A10双蟹同预算整战对照，不能确定新的并列血价权重。
- silent-proposal-7cbc6005db712ba9：waiting。朝向/临时减力/轮初14挡子机制可核；额外格挡来源隔离、混合意图及未知条件的联合候选消费者验收未完成，不能标整项duplicate或修改能力权重。
- silent-proposal-c59f592f1427a67e：waiting。多个预测/派发/端点/整轮子功能已在live；仍缺全组件联合消费者验收、跨续问完整候选归属、逐来源累计收益及SL恢复资源分账。完整规则或整项duplicate都没有充分依据。

没有足够依据关闭综合原ID；已确认机制不误报为机制本身缺证。等待项保留原ID/来源/领取关系，不新增重复提案、不改原Markdown或队列状态；由宿主消费proposal_results续接。
源提案金刚杵→silent-0016旧笔误已与当前账本护喉甲区分；decision-log已记录此前通知核验，不重写历史、不重复发通知或代填角色确认。未发现本批新的游戏机制反证。
只经根ledger.py update追加本批30个既有账本的by/where.proposal/note链接，旧claim/status/version/first_run/evidence保持；不新增经验、不降级旧shipped、不冒标本综合要求已上线。CLI输入/输出与读回另存本目录。

## 验证、失败与未上线

本批没有修改agent/learner/eval/ops/knowledge/builders的受控源码，也没有提交：撤源码失败/恢复通过、tsc、vitest、cases均不适用，最终tests三个字段都是null。未运行test-sandbox.sh，不借既有历史绿替本批自测。
保留启动沙箱准备错误、首次tsx路径错误、两个完整消费者输入拒绝；恢复后的有界读回与31条原帧核验不是生产红绿测试，也不是完整SL后继或联合消费者实现验收。
未合入live，merge=live流程仅在有经证实现时执行；本批merged=null、fixes=[]、无版本、无shipped、无实际上线双通知。没有停止对局、运行play、改运维prompt或推送。
工作树HEAD保持完整base；过程文件均在忽略的本批learner/runs目录，根记录仅由授权CLI追加。最终完整JSON在report.json。

最终核验：8053条原日志均按原offset/length逐SHA读回；30条所属CLI追加逐物理行核实各出现一次，字段只有id/by/where/note；原10提案正文与SHA保持。ledger.py check退出0、469项0问题；report_links无错误。gitleaks退出0，扫描194.05 MB无泄漏。HEAD仍为8ae20b998c2bdbebefae82a72dbcd0883d457312，当前工作树git status为空。最终回执见pre-record-audit.json、ledger-readback.json与ledger-check.log。
