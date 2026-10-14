# 策略学习回报

记录时间：2026-10-14T15:53:54+08:00。

本批十项原提案全部waiting；已有live诊断覆盖部分事实，但原要求的完整候选/后继反事实和独立校准未满足。没有源码变更，fixes=[]，merged=null。base=f8d306514e2a8afafeac591d38773b92807f2518。

## 派发与范围

批次20261014-154303-strategy-proposal，task=strategy-proposal，character=silent，reason=proposal，工作树与宿主本题一致，六个派发runs集合精确一致。无专题或实施绑定，不领取其他队列项。README、最新STATE-2026-10-12、decision-log末尾、learning-protocol及learning-code-proposals已读。

本界面无原生会话/请求模型核验工具，因此不声称已核模型或改变运行配置；不派下级agent。没有联网、LLM调用、play、依赖安装、游戏二进制读取、账户/密钥或运维prompt修改。

## 原始证据与保存

冻结runs 6、run-config 6、SL 43、run-plans 21、decisions 4071、states 4167，共8314原行。每行保留source_line/offset/bytes/SHA256；verify.py逐原日志seek重读全部字节，与冻结材料相等。六局runs.jsonl和每个原状态均核实SILENT A10，各局决策数量与runs相等。run-plans按真实run字段提取，未漏记为0。

| 局号 | 决策 | 状态 | SL | 原对局源码 |
|---|---:|---:|---:|---|
| 751FN9QM9MHQ | 615 | 624 | 6 | 79bee0fc11793a410218ae50ca43e41474eec19e+dirty |
| KV0JHNJCKXLS | 669 | 686 | 7 | 70c8352bc9ea84d18f9bc0f82244b0e1f76405e8+dirty |
| YQL8RZ8BWN1E | 571 | 582 | 6 | b0b0e679dbab626af188fec8bb180af74e319e71+dirty |
| L9SGRBB5R698 | 635 | 653 | 6 | 4fb81b17d099018d348942677bfe31dca333a4b1+dirty |
| PU80F84P6HPN | 1033 | 1064 | 12 | 0581ecb38e0379fdad01307e4966d9da629d76b4+dirty |
| KEN58SH9SLZ6 | 548 | 558 | 6 | f9db52c1ed7af16d019e32528953e5ffcc8e08f0+dirty |

原配置code/dirty身份保持，不把本批HEAD冒作历史实际执行树。4071原决策包含六条没有decision_id的map/route-change元数据，原行243739、246622、272938、273191、273668、274207；全部保留，消费者按这些缺口拆段，原始行号不重编。

十原提案的角色、runs、账本id、Markdown及SHA见queue-selected.json/ledger-selected.json/*.original.md；本批没有将旧历史支持集合冒称重新全历史核验。

## 事实核验与现有消费者

64项材料断言通过，详见verification.json/facts.json；这些是原帧身份、端点净差、槽位及算术核验，不是生产源码测试或受控整战策略收益。

- 751FN9QM9MHQ F17 T2 第1/3试：同指纹，玩家净损13→18、敌净扣9→18；原状态278479→278483/278620→278623。

- 751FN9QM9MHQ F17 T7 第2/4试：同指纹，玩家净损13→23、敌净扣12→18；原状态278576→278581/278697→278702。

- 751FN9QM9MHQ F17 T13 第1/6试：同指纹，玩家净损8→2、敌净扣17→11；原状态278528→278532/278865→278869。

- KV0JHNJCKXLS F33 T5 第4/5试：同指纹，玩家净损0→0、敌净扣36→29；原状态279460→279465/279511→279515。

- KV0JHNJCKXLS F33 T1 第1/6试：同指纹，玩家净损0→0、敌净扣28→14；原状态279298→279309/279535→279545。

- KEN58SH9SLZ6 F17 T10 第4/5试：同指纹，玩家净损15→21、敌净扣2→4；原状态280588→280592/280651→280655。

- KEN58SH9SLZ6 F17 T5 第4/6试：同指纹，玩家净损7→5、敌净扣1→2；原状态280567→280572/280684→280689。

KEN末试T5后未见敏捷，T9后才见2；T5省2血不等于能力收益保留。七次实际喝药槽位前potion_id及后occupied=false全部核过，六试boss均75/86空药。

YQL本体六试在T12/T12/T11/T12/T12/T9结束；末T10原状态280160/280161毒2→8而26血、13挡、41自爆未变，26+13−41=−2与实死截断0分开。PU第五试巨兽胜线原记录保留，不当新排序反事实。

用现有live离线消费者实际源码消费本批冻结输入，consumer.log最终退出0。只751全输入接受，其余五局全输入因六条无decision_id元数据明确拒绝；按原缺口拆成有界连续段后接受，共4065动作、861选线片段、2336相邻观测区间、415整轮端点、362未知轮。所有actual_full_candidate_result仍null，完整候选认证为0。

KV同盘T1/T5原帧净差已独立核验，但消费者完整轮开场/结尾未认证；不把这两种口径混称已认证完整候选。药水随机选牌/续问、毛伤回血归属、完整后继及留药反事实仍未知。

## 既有源码核对

只读核对捕获live HEAD 4d55ff9b4e2d6ed9cb701712ab63dba76ac67dac，14相关源码的实际工作文件字节等于捕获live Git blob。12个路径本批base与live逐字相等；explore.ts/combat-plan.ts两个路径仅Roy→Dai文本替换不同，该差异如实保留。离线消费者核心及JSON依赖无知识读取或在线游戏动作。

| 源码路径 | 实际live祖先源码commit | 本批base/live字节相等 |
|---|---|---|
| agent/src/reflex/silent-sl-resource-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 是 |
| agent/src/reflex/silent-sl-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 是 |
| agent/src/reflex/silent-selection-audit.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 是 |
| agent/src/reflex/silent-held-loss.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 是 |
| agent/src/reflex/silent-potion-reference.ts | c4670f4f416c7d93e192e889c5080e7e4e0e733f | 是 |
| agent/src/reflex/silent-giant-potion.ts | 40168f4a903ae1d8c48bd03006f8fea19fd3aa3c | 是 |
| agent/src/sl/attempts.ts | b01edf46b4b619f217d070a196e161df9fe716a0 | 是 |
| agent/src/sl/explore.ts | b01edf46b4b619f217d070a196e161df9fe716a0 | 否；仅Roy→Dai |
| agent/src/reflex/combat-plan.ts | e94c677b18aaa5d2f8ff86120b3fc535a32cce48 | 否；仅Roy→Dai |
| learner/audit-selection.ts | 02c4e13ac8e159b82ee35a965ac788a0a029ce5a | 是 |
| learner/lib/selection-execution.ts | e75438488df159b2e8e9d3458cf219b39aadd933 | 是 |
| learner/lib/selection-observation.ts | dc0e6080cb20c508d94c006648cc3edf0188d306 | 是 |
| learner/lib/selection-terminal.ts | 83512ddcd2c70fd9b983dc38524ff25c8970c1d3 | 是 |
| learner/lib/selection-turn.ts | e75438488df159b2e8e9d3458cf219b39aadd933 | 是 |

这些提交证明部分诊断已部署：current_turn_prediction/candidate_forecast、held_loss_prediction、potion_value_reference、giant_blast_current、selection_audit及离线观测链。它们显式保持execution=unverified、actual_turn=null或actual_full_candidate_result=null；不能用局部已实现来关原宽项。不给十项填写duplicate/implemented_commit，不登记shipped。

## 逐项处置

完整证据局号/层/回合、账本、反例、期望行为与验证方法逐id列于proposal.md。

- silent-proposal-366288801d9150d9：waiting；预测资源与B2差已有live子诊断；缺跨抽弃、续问的完整候选执行归属、固定其余后继的整战对照和独立后期校准，不能拟额外失血准入阈值。

- silent-proposal-85929bdfc8a3fc1b：waiting；保守持牌项、未知持有价和同题无药参考已有；缺F13不喝或留到F17的完整支线及重问后的毒/荆棘/弃牌实际归属，不能校准药价或改弃牌规则。

- silent-proposal-efd9f83ee9e1a6dc：waiting；原经验对应局部成本充分且预测诊断已有；完整实际资源归属、受控整战与独立验证仍缺，不能以子诊断关闭原经验提案。

- silent-proposal-131042659448ae74：waiting；资源及能力预测、保守持牌和无药参考已有；缺跨重问完整执行、逐轮能力/毒/荆棘归属及无药/留药跨战支线的联合验证，整项仍未完成。

- silent-proposal-990f054036609447：waiting；两组同盘端点净差充分；缺敌回血/毛伤的完整来源与候选末端认证、受控完整后继及路线/休息未执行支线，不能拟SL或回血门槛。

- silent-proposal-e18d3f18e6cac2a0：waiting；巨兽阶段、占位血解释和一次饮毒限制已有live子诊断；修改参考排序仍缺受控完整后继、最终资源适用校准和独立验证，不能把展示子项判整项duplicate。

- silent-proposal-9733bb80f445aeae：waiting；残壳收益限制与阶段已有展示；缺提前喝/不喝/留药及新参考排序的受控整战对照，不能认证跨战药值或策略收益。

- silent-proposal-c51468c5e8ba6668：waiting；七次耗药与boss入口充分；缺随机选牌/重问后完整候选净收益、F15不喝及留药到boss的受控支线，不能校准跨战预算。

- silent-proposal-86a7db08d1a31976：waiting；T10局部血价和T5能力延迟充分；缺完整伤源/能力归属、固定后继整战及独立校准，不能收窄更差B2探索或调整HP护栏。

- silent-proposal-e282a9131b99129a：waiting；双向局部取舍充分但六试相关；缺完整后继反事实、能力兑现归属和独立后期校准，不能由子诊断关闭原经验提案或拟统一血价。

## 记录、验证和上线状态

仅经根目录learner/ledger.py update补16个已有silent账本的本批note/by/where.proposal追溯；不改变既有claim/status/version/first_run/evidence，已shipped历史不降级，不新增游戏知识或重复提案id。原十proposal_ids在最终code_proposals/proposal_results逐项保留，队列状态交原调度器处理。

没有生产源码/知识修改，无源码提交或合入、无eval版本、无Roy规则上线双通知。撤源码失败/恢复通过不适用，tsc/vitest/cases均null，没有调用生产测试入口，不借旧绿结果填本批成功。既有消费者exit0与64材料核验仅按上节限定口径报告。

## 保留的失败与限制

初版freeze使用宽局号文本匹配，把别局正文提及本批局号的行也匹配进来，遇到其中一条非本批损坏JSON退出1。freeze.log.first-failed.txt、首次decisions匹配材料及部分初稿完整保留；随后改为真实run_id/run字段精确过滤，本批选中8314原行全部解析/原字节核验通过，没有改原日志。此为本批材料提取器失败，不是生产源码红绿。

五局全输入消费者拒绝及六个缺口原件保留；按有界输入消费成功没有抹除这些失败。没有新策略拟合；没有后期独立局或受控完整后继，相关SL不能拆训练/验证。没有认证留药、路线、休息、HP护栏或更差B2探索策略收益，经验入库/自然消费者采用不由本批报告冒称完成。

proposal.md、report.md、result.json与全部原材料留本批learner/runs内；保留现场由原启动器/运维按验收流程处理，本模型不删除自身工作树。

最终读回：16条CLI新增物理行各出现一次，旧claim/status/version/first_run未变（ledger-receipt.json）。本批派发身份保持，git status --porcelain为空、HEAD仍等于上述base。gitleaks --no-git --redact退出0，扫描约695.88 MB，no leaks found；无源码提交。
