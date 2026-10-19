# 静默猎手本批策略处置

批次：20261019-081302-s2-strategy-proposal。基线：`df21d3b4d79e996050cd4fdbb06931fc6a14c4fc`。

结论：10项原提案均保留waiting；本批没有足以支持新策略参数的完整对照，也没有整项等价实现的验收。未改生产源码、知识、任务模板、提案原文、账本或队列；未提交、合入、发布或登记shipped。铁甲及其他角色行为保持原状。不是专题纯研究完成回执，不关闭原学习父要求。

## 派发和输入

根learn.json对应行task/character/worktree及10个proposal_ids均匹配，无proposal_repair、research_request或implementation_request。普通专题请求仍绑定20261010旧批，不满足本批条件，未借该请求扩大选题。开工工作树干净；`git merge --no-edit main`返回Already up to date，HEAD未移动。

初始材料为本批摘要和10份原提案；原Markdown全部存在且SHA与队列add行吻合，原字节副本保存为各id的.original.md。只读原提案所关联账本，保持既有shipped/proposed状态，无新增发现故不重复CLI追加或创建提案id。queue-snapshot.json及ledger-snapshot.json保存核对输入。

提案另引1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP、K3676LU8B0UH、SADL3CGYTGSR，本批仅为这10项补核其原证据，不领取新项。共15个去重局在共用extract_evidence入口的runs流各有1条、角色均为SILENT；派发10锚点保持不扩写。完整原109局路线统计本轮没有重算，不冒称新验证全历史。

## 原始窗口核对

先用共用extract_evidence.py提取runs/sl-attempts，evidence/evidence-manifest.json记录source_size、逐局计数及内容SHA；0条SL只表示该流截点没有选中该局记录，不推断别的流缺失。摘要保留原截点，不以之后追加日志覆盖。

audit_windows.py仅在脚本内流式分析相关状态/决策、使用共用run_identity拒绝冲突身份；states-selected.jsonl为压缩事实索引，模型只读取关键结构化窗口。window-manifest.json记录两个源文件大小、扫描终点、逐局计数及输出SHA。summarize_windows.py按索引offset/bytes重新读取并逐行核SHA，保存197条原始状态于verified-windows.evidence.jsonl；capacity-lamp.evidence.jsonl补存容量/油灯关键原帧。所有实际窗口均保留原source、line、offset、bytes、SHA，未用正文提及归属替代身份。

- KEN58SH9SLZ6 A10：F3T2、F4T1、F5T2、F11T1/T2、F15T1两瓶，7次药栏实际减少；对应原states 280206/207、280232/233、280262/263、280313/314、280315/316、280348/349、280354/355。F12/F16真实回复与Boss多次存档恢复分账；没有未饮/留药完整对照。
- TXZ6RVMQA09D A10 F48T6：第二次states281479—281484，48→45血、敌460→424；第三次281535—281539，48→48血、敌460→433。局部差额是省3血且少9伤；后轮不同，不当因果改善。第三次F48T10到奖励4血，F49T1 states281565/281566为4→0，敌111仍在、没有下一可操作帧；不能把首战胜当连续通关。
- WQZVENQ7DTRP A10 F33：T9第二/三次states282075—282079与282144—282148，26→13/4血、敌184→160/145，核13损24伤与22损39伤。末次T7 282330—282336付4血而沙坑延长，反例约束保留，不得据T9一律禁止多付血。六次尝试仍按1局计，未有同抽序完整获胜对照。
- 同局F33T11：states282292—282296手数8→10→10→10，对应2/0/0；282352—282357手数5→8→10→10，对应3/2/0；固定18次饮用窗口均保存，不把生成数量当完整用药胜因。
- Q6M2Y34MWKRE A10 F8T4：282887—282892，敌103→95→85→83→80，紧勒后攻击及技能各兑现2失血、三毒分列。F8T8赢后2血，F9T2 states282918—282921实到0。1913SE84AXQF F17退出14、幕间到58、F31入口46及药栏见critical-windows.json；休息/锻造与事件条件变动不当同条件模型误差。
- NHA2KW0RB7VP A10 F33T1：首线states283391—283397，30→29、两敌总408→400；第五次283478—283483为30→23、408→384，第六次重放283502—283507同值。跨轮自动扣血不能全算出牌伤。原decisions277248/277250及277272/277274可见弃牌后重新提问，初案与实际完整方案须分开。
- 油灯：NHA F17T1 283146/283147普通毒药实际建10毒；F33T1 283394/283395建立−2力量/2弱；K367 A1 F30T2 217009/217010施毒0→8；SAD A7 F45T1 232562/232563施毒0→10。三局持有帧分别501/385/398，其可见遗物对象均只有index/id/name/description/stack/is_melted，未暴露首次消费状态。局部放大已观察，不等于任意题面都可恢复尚未消费；不外推零X、其他负面、叠层或恢复顺序。

## 逐项处置

| 原提案 | 原账本 | 原证据局 | 本批waiting理由 |
|---|---|---|---|
| silent-proposal-08eaa60bcc449852 | silent-0019, silent-0020 | KEN58SH9SLZ6 | KEN七次实饮可复现；缺F15不饮、提前饮及留药到Boss的同预算完整后继，无法校准持药价格。 |
| silent-proposal-92920295a648b540 | silent-0228, silent-0255 | TXZ6RVMQA09D | TXZ F48 T6省3血同时少9伤，后续抽序改变；首战余4血后F49开场死亡，缺固定后继的两战配对校准与完整生产审计。 |
| silent-proposal-a327449c331efbc1 | silent-0079, silent-0018 | WQZVENQ7DTRP | WQ同盘9血换15伤及付4血延沙坑均已复核；缺同抽序完整后继、跨弃牌重问到最终执行的联合夹具及独立排序验证。 |
| silent-proposal-a099e89437e942bb | silent-0030, silent-0257, silent-0258 | 02HB4L0C3C67, 4D4J8USKCPAV, F4QKG4J1AJJZ, JLN5SK17W4FQ, LS8035TB32P3, NB8KCF6HRGVF, S9UZAK0JP0C0, SADL3CGYTGSR, WQZVENQ7DTRP | 狡诈生成/容量源码6403fdcd已为live祖先，局部2/0/0、3/2/0均吻合；仍缺保留容量、跨动作重读、SL恢复与最终派发的联合验收，不能整项登记duplicate。 |
| silent-proposal-47910f82a1fdd98f | silent-0018, silent-0019, silent-0020, silent-0021, silent-0025, silent-0079, silent-0198, silent-0228, silent-0255 | TXZ6RVMQA09D, WQZVENQ7DTRP | 4血开场窄实现e8b4bb32已为live祖先；缺连战后继、SL双向血价及持药价值的联合校准，旧小血瓶组合内部顺序仍未知。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019, silent-0020, silent-0050, silent-0253 | 1913SE84AXQF, Q6M2Y34MWKRE | 1913与Q6实际资源链可复现；早喝候选缺同预算整战后继，锻造改变路线条件，不能据入口资源拟合新终局曲线。 |
| silent-proposal-38a49e6c97f31eea | silent-0006, silent-0011, silent-0025, silent-0044, silent-0050, silent-0064, silent-0133, silent-0253, silent-0259, silent-0261, silent-0262 | 1913SE84AXQF, Q6M2Y34MWKRE | 普通紧勒子实现5c7105ff已为live祖先；缺弃磨蚀、自动效果、增益分源、再生时点与恢复后继的完整联合覆盖，不能将子公式修复当整项完成。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019, silent-0020, silent-0021 | 1913SE84AXQF, Q6M2Y34MWKRE | 1913 F31入口46、Q6 F9入口2可复核；缺另一事件、路线或休息选择的完整配对结果，原109局统计本批未重算，相关性不足证明改线收益。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | NHA2KW0RB7VP | NHA第五/六次重放可复现1至7损血与跨轮敌净扣8至24；缺跨弃牌重问完整计划归属、同预算排序与独立后继，重放不是独立支持。 |
| silent-proposal-04b6b430759815ed | silent-0005, silent-0006, silent-0021, silent-0011, silent-0065, silent-0264, silent-0079, silent-0133, silent-0169, silent-0189, silent-0013, silent-0053, silent-0162, silent-0265 | NHA2KW0RB7VP, K3676LU8B0UH, SADL3CGYTGSR | 油灯三局局部首次放大可复核；所见1284个持有帧的遗物对象均无首次消费状态字段，缺跨动作、新战与SL恢复的联合状态验证，不从持有或轮数猜测可用性。 |

每项旧行为均维持当前生产规则；预期新行为以各.original.md中的原请求为准，本轮没有重新定义权重或阈值。待补验证分别为同预算完整后继/时间后移独立局、跨弃牌重问到真实派发的完整身份链、保留容量及SL恢复状态链、油灯首次消费状态。不得随机拆同局SL作训练/验证，不用rollout次数代独立局。没有完整反事实时只保留已知局部算术和未知项，不声称原线或替线可赢。

## 已有实现与生产消费者边界

只读实际live HEAD `9f4245511181c6228cf63dc44700ea28ccf35730`并用merge-base核源码祖先：

- `6403fdcdadc803a092beb5165a068e22bf51c412`狡诈生成/手位，为base与live祖先；原分支`15ea09ad75a421d4bd65a820c187c8ee188186c8`两边均非祖先，不能沿用旧分支作为上线凭据。card-model.ts:1879、turn-solver.ts:2304及combat-plan.ts:4108已接入局部模型；silent-cunning.test.ts有容量/穿插/后轮检查，尚不等于跨动作重读+保留容量+SL恢复+最终派发联合验收。
- `5c7105ff0294466da8319f2934beda05c6040794`普通紧勒为base与live祖先；card-model.ts:1283、turn-solver.ts:2040及combat-plan.ts:161已接入观察分支，不重报该子公式漏接线。整项增益/弃磨蚀/再生/恢复消费者覆盖仍缺。
- `e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`开场扣血为base与live祖先；silent-opening.ts按已观察角色/进阶/遗物组合限定，silent-opening.test.ts已有4→0与接续测试，不把它当整项药价/SL血价完成。
- explore.ts:1552/1564仍比较B2 notWorse或rollout deathShare；本轮未依据饱和值构造新血价门槛。未找到可证明跨恢复首次消费状态等价的油灯消费者。

source-audit.json保存以上祖先布尔结果及8个实现/测试文件SHA。检查既有测试源码仅用于确认覆盖范围，本批没有执行测试，不冒称原测试在当前会话成功。

## 交付与限制

源码撤掉失败/恢复通过：不适用，无源码改动，不制造突变测试；tsc/vitest/cases均null。没有新增代码提交、merge提交、版本号、shipped或规则上线通知。代码/知识/账本保持原状，无需回退；如未来独立实现，仍按原提案以单项提交、固定数据及恢复后继联合夹具验证，实际上线才登记版本与双通知。

最终工作树HEAD等于base且git status/diff为空；纯报告和证据位于本批忽略的learner/runs目录。报告完成仅代表本批10项已处置，不代表经验新增入库、消费者自然采用、整项代码完成或收益验证。
