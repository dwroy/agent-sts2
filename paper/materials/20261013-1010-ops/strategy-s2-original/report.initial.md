# 静默猎手策略批次回报

本批十个已领取提案均逐项复核并保留 **waiting**。没有足够证据支持新的策略参数；部分机制已有实际live源码子项，但未验证原提案要求的完整消费者或后继链，不能登记整个提案duplicate/implemented。

批次：20261013-094149-s2-strategy-proposal。工作树：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-094149-s2。

完整base/当前HEAD：`3b8e42b099c13017d5cdb48da41aba9338b8b097`。开工git status为空，普通任务按要求merge main，返回Already up to date。本批根learn.json行task=strategy-proposal、character=silent、reason=proposal，proposal_ids恰十项；没有research_request、implementation_request或proposal_repair。根notes/strategy-research-silent.json绑定其他批次，专题条件不匹配，因此保留本批原队列任务，没有转成专题或领取别的id。

运维交付提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-094149-s2/learner/runs/20261013-094202-strategy-proposal/proposal.md`。机器回报同目录report.json。证据、账本、层/回合、原/预期行为、反例、验证和缺数据逐项见proposal.md；原十份Markdown以原字节保存在各id.original.md。

## 证据与结论

本批派发十锚点与runs.jsonl逐项匹配，全部SILENT；原提案另外引用的SADL3CGYTGSR、1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP、K3676LU8B0UH也先核角色才读取。没有把SL尝试当独立局，没有拿其他角色知识作结论。

15个相关局的原始选中记录共21758行：states9815、decisions9448、sl-attempts78、jev-prompts2325、run-plans77、run-config15；fight-plans本段0。这里的0只指该日志文件没有这些run字段记录，不指没有计划；run-plans77条已独立核对。所有选中行的原行号、字节offset、原字节SHA与logs源seek读回一致，见selected-raw-manifest.json。按源局归属过滤了rg因知识文本引用局号产生的误匹配；初次raw文件保留作诊断，结论使用selected-raw与summary的本局记录。

已完成24项固定原日志断言，另逐次核九局42次狡诈饮药，结果见evidence-verification.json、evidence-verification.log、cunning-verified-transitions.json。这是日志数值验证，没有执行生产源码测试，也没有证明新策略收益。

- KEN：七饮、F12/F16实回27/29、六赢战损0/3/0/37/6/0与六次空药boss入口吻合；不把SL恢复当路线回复，不把用药零损当不用药也零损。
- TXZ：F48第二/第三尝试T6原线实损3/扣36、替线0/扣27；首boss末4HP接第二房开场4→0，没有可操作帧。不能以第一场胜率代替连续通关。
- WQ：同指纹T9的13损/24伤与22损/39伤同时保留；T7同伤24多损4、行动末沙坑多1是必要反例，禁止凭这一败局拟统一血价。
- 狡诈：九局42饮，添3/2/0分别37/2/3次；所有新增刀升级、基础6，饮药本步各耗瓶且HP/能量/敌状态不变。完整保留/穿插收益尚未证明。
- Q6/1913：普通无挡紧勒逐牌HP链103→95→85→85→83→80；弃牌选择完成才触发。实际休息、锻造、胜战退出HP与下一场入口分账；已建毒雾但下一轮前阵亡的场面不计未来收益。
- NHA：旧线14挡损1跨轮净扣8、替线8挡损7净扣24；下一轮抱抱先生自动扣4单列。首次油灯负面观测仍是有限分支，null计数不能当剩余次数。

原109局相关汇总仅作为原提案背景，本批未重新研究全历史、未声称全历史统计或量化父项完成。样本都是发现/固定核验集，没有新独立时间留出胜局，未拟合阈值、通关率或因果收益。

## 已有live子项与范围

只读捕获live提交：`e8773abf3a4dcf395eab3f9495dac045ae819eaa`。实际祖先查询与blob/SHA见source-provenance.json；12源码路径分别保存base/live的.txt原件。

| 有限子项 | 捕获live的实际引入源码祖先 | 本批限制 |
| --- | --- | --- |
| 狡诈确定生成/手位、限定王室猛毒四血开场 | c09762601e54bfc1ef7a1a8ee50e3285a4fd1e5c | 主动保留/复合触发、未知开场组合及完整收益未验 |
| 普通无挡紧勒、精确切击七手、SL资源/候选快照 | a8b1f8be153fe4f3a34146117546c2178f2e446b | 不覆盖升级/叠层/重放，也不代表完整候选实际执行 |
| 限定弱/力量下蟹朝向 | f2c7cc1a7288893bceae0f0b20304a2b1fae5f57 | 现场A10数据库与已证组合，未推广其他取整 |
| 两boss目标与样本资源接续 | e1a467e18a0dfa8d99046a24ff4c0e1af59278c8 | 未校准连战，不代替后继反事实或新SL阈值 |

部分整个文件在本base与捕获live不同，**没有声称整树或整个模块相同**；独立核过狡诈确定生成分支、紧勒逐牌分支字节相同，限定开场、蟹朝向、两个SL比较模块及double-boss-start文件相同。子段SHA见source-slice-verification.json。

现行SL快照明确execution=unverified、actual_turn_result=null；候选预测、首次派发与跨抽/弃/生成重规划后的完整实际执行必须分别核实。既有容量固定测试的内容不当作本批执行成功，也不当实盘胜线。原15ea等源码来源不直接替代live祖先认证，十项宽提案因此均不登记duplicate/implemented。

## 十项处置

| id | 状态 | 具体缺口 |
| --- | --- | --- |
| silent-proposal-08eaa60bcc449852 | waiting | 同入口/牌组/路线的不饮、早饮、留boss完整后继 |
| silent-proposal-92920295a648b540 | waiting | 同牌序连续通关对照及SL重规划完整执行归属 |
| silent-proposal-a327449c331efbc1 | waiting | 同抽序完整后继及独立存活验证，保留延时反例 |
| silent-proposal-a099e89437e942bb | waiting | 计划妥当主动保留跨轮、复合饮药触发、完整消费者后继收益 |
| silent-proposal-47910f82a1fdd98f | waiting | 未知回血/复活组合相位及留药/SL完整后继 |
| silent-proposal-f1374df72d8e6a25 | waiting | 同休息/锻造与后继动作下的早饮/留药整战对照 |
| silent-proposal-38a49e6c97f31eea | waiting | 升级/叠层/重放、致死逐击/反伤复活中间帧、联合消费者验收 |
| silent-proposal-ef0e38a5dbd3bc07 | waiting | 受控换线/用药/休息完整后继及能力收益归属 |
| silent-proposal-7f820c02d39bfaea | waiting | 跨重规划完整执行归属、受控后继和独立存活验证 |
| silent-proposal-04b6b430759815ed | waiting | 油灯首次吸收/前序负面/重规划/SL完整链及未观察负面组合 |

下一步沿原id/owner等新增本角色完局或完整消费者证据再审，不扩领当前队列，不关闭量化或指定学习入库父请求。本批没有新异议或反证要求强行支持原假设；原提案中的反例与未证范围继续保留。

## 记录、验证与上线

根账本只经`python3 /home/dw/Projects/agent-sts2/learner/ledger.py update`给31个本角色既有id追加本提案/报告和原代码提案链接。输入ledger-updates.json、原CLI输出ledger-update.log、独立回读ledger-link-verification.json保存本目录。没有新账本id、新提案id或改写原提案；现有claim/status/version保持，不把记录链接当经验入库或shipped。

没有源码、知识数据或行为改动；HEAD保持完整base，工作树干净。fixes=[]、merged=null、无新增提交、无live合入、无eval版本或规则上线通知。implementation_domains=[]表示本批没有新实现，code_proposals列真实已领取十id。

撤源码失败/恢复通过：不适用，没有改源码；tsc/vitest/cases均null，没有执行，也未借用历史成功。没有提交，因此提交前gitleaks门槛不适用；材料的独立密钥扫描结果保存gitleaks.log、gitleaks.json与completion-verification.json。所有扫描输出使用redact，不读凭据或.env。

本批独立源码、知识零差异、身份、报告JSON十项齐全、Markdown原SHA、代码提案链接和密钥扫描最终核验见completion-verification.json。没有启动play、LLM、模拟池、联网、推送、杀进程或派下级agent。原只读日志不变；所有新增研究材料限本批scratch，根账本例外只走CLI。

读取与分析中的失败/初稿/更正见diagnostic-history.md；相关宿主工具原输出保留，本批不将分析器错误写成生产bug。
