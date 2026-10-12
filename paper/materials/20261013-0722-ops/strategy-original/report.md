# 20261013-070543-strategy-proposal 回报

记录时间：2026-10-13T07:15:07+08:00。角色silent，普通十项提案消费批次。完成证据复核和逐项处置，十项均waiting，学习父要求继续保留。
base=`5cf8cce3cb1465aac2f3a910cc5352696549d8da`；开工树干净，按任务普通流程fast-forward main后以此作为完整基线；本批无research/implementation绑定，未领取其他提案。

实核六局均SILENT/A10，保存8293原记录的来源行/offset/bytes/SHA；逐局复盘、十份原Markdown、16项官方fold账本与相关silent经验已核。日志定位复用既有索引，本批回读原logs逐条核字节，不宣称全历史重扫。
冻结材料：evidence-manifest.json、paired-evidence.json、demon-evidence.json、potion-transitions.json、attempt-summaries.json、751-potion-question.json；详细提案和验证方法见[proposal.md](proposal.md)。

可核实结论：751 T2/T7换线多付5/10血，KEN T10多付6血仅多2伤；KEN T5省2却将步法延到T9；KV0删毒和攻击没有当轮保血收益；YQL残壳毒增加未改变血挡/来袭。相反取舍、相关SL尝试及未执行反事实均保留，未由这些数据拟统一权重或许诺转胜。
已有诊断祖先与源码SHA见source-manifest.json，13份限定源码核验，五份不等仅Roy→Dai注释文字；source-difference-classification.json及原patch保存。actual_turn=null、单步回执和旧参考原始占位血排序的限制明确，因此整项不记duplicate或implemented。

| 提案id | 账本 | 本批处置 |
|---|---|---|
| silent-proposal-366288801d9150d9 | silent-0079、silent-0176 | 751 F17 T2/T7同指纹实付5/10血已核；现有成本预测及单步派发不是抽弃续问后的完整回合分账，缺受控整战后继，不能定探索门槛。 |
| silent-proposal-85929bdfc8a3fc1b | silent-0019、silent-0021、silent-0005、silent-0007、silent-0129、silent-0176 | 751 F13 T3整战无药plan5仍8/8胜仅为模型；已有持牌保守损血及未知持有价值诊断，缺实际无药/留药整战及重问后的收益归属。 |
| silent-proposal-efd9f83ee9e1a6dc | silent-0079、silent-0176 | 751六次异鱼尝试均失败；既有候选预测/单步回执不覆盖完整actual_turn，缺同后继整战及按独立局时间切分的验证，不能拟统一血价。 |
| silent-proposal-131042659448ae74 | silent-0019、silent-0020、silent-0021、silent-0005、silent-0006、silent-0007、silent-0046、silent-0129、silent-0176 | 力量/敏捷/毒/荆棘/呼唤分项已有证据和限定诊断；没有实际无药/留药完整对照，抽弃重问后联合收益尚不能归属，不能据分项关闭整项。 |
| silent-proposal-990f054036609447 | silent-0102、silent-0019、silent-0020 | KV0 F33 T5删毒净扣36→29且两线零损，T1删攻击28→14也未省血；敌回血和毒同帧，缺完整来源拆账及保持后继一致的整战对照。 |
| silent-proposal-e18d3f18e6cac2a0 | silent-0017、silent-0250、silent-0011、silent-0027、silent-0046 | 巨兽阶段和占位血解释已在live；同轮参考仍按原始占位血排序，缺改变排序的完整受控后继及独立验证，不能把展示子项当整项实现。 |
| silent-proposal-9733bb80f445aeae | silent-0017、silent-0019、silent-0020、silent-0250 | YQL F17 T10残壳毒2→8、血26/挡13/来袭41不变已核；缺提前喝/不喝/留药及阶段排序改动的整战对照，不能拟药水/终局权重。 |
| silent-proposal-c51468c5e8ba6668 | silent-0019 | KEN七次耗药及六次75/86空栏入口已核；随机选牌、发光水重问后的整轮兑现没有完整结构化归属，缺F15不喝或留到boss的完整支线。 |
| silent-proposal-86a7db08d1a31976 | silent-0079、silent-0021、silent-0125、silent-0005、silent-0176 | KEN F17 T10多付6血仅多2伤、T5省2但步法延T9已核；后轮动作/抽序亦变，缺受控能力后继及独立后期局验证，不定统一血价或关闭探索。 |
| silent-proposal-e282a9131b99129a | silent-0021、silent-0079、silent-0125、silent-0176 | 已有持牌、候选和首次派发诊断，但actual_turn仍null；KEN同盘差额不等于完整受控反事实，缺续问执行链、同后继整战和独立后期验证。 |

源码提交：无。合入提交：null。版本：无。fixes=[]。撤源码失败/恢复通过：未执行（无实现）。tsc/vitest/cases均null，未借用历史测试或把证据算术当生产自测。工作树保持干净，scratch属忽略路径。
账本仅经根ledger.py update追加本报告/提案链接与waiting理由，by=learner:strategy-proposal，不回写原经验、first_run、prior、claim、status、version或shipped，不造新提案id。根队列状态由完成事件按proposal_results消费，本任务不手改队列。

原件/失败：首次采集因states.run_id的真实嵌套schema误用外层而停止，原脚本与失败说明保留，修正后全部SHA回读成功；辅助schema读取首帧combat=null也曾TypeError，未改日志/生产。早期尝试了不存在的core/loop、sl/summary、potion-choice路径，随后用rg定位真实文件，本报告仅引用真实路径。ledger-before初稿手动fold另存initial，正式结果使用根ledger官方fold；不混称初稿为正式账本。
本批没有新规则实际上线，故无eval或双上线通知；缺数据结果通过本报告交原ops消费，不关闭量化父要求、不填写其他角色通知ACK。

补充验证原件：boss入口复核首次按COMBAT/T1离开再进入计数，751得12个片段而断言六次失败；改按原SL started_at/ended_at每次取首T1。后续临时验证器手填易伤药ID错误，再逐条原帧核到VULNERABLE_POTION后更正；verification-initial-failure.txt、verify-evidence-potion-id-initial.py.txt及stderr保持。错误没有写进生产/知识/账本，不作游戏反证。

最终限定核验：evidence-verification.json确认8293原记录字节SHA、按六个真实尝试窗口核18个boss入口及巨兽六个50/50/47/50/50/41自爆；这是原证据复核，tsc/vitest/cases仍null。16条本批ledger CLI实际追加原行/行号/SHA已收存ledger-cli-rows.json，逐条只含by/where/note和CLI自动op/ts；没有改状态或游戏结论。final-verification.json核十个proposal_results齐全、官方report_links无错、完整base和干净树。
补充失败：先取占位出现帧曾把ABOUT_TO_BLOW_MOVE/Stun的null伤害当0，断言失败；后依据原帧限定EXPLODE_MOVE/DeathBlow整数伤害接续成功。初稿/完整stderr、未生成最终证据文件时追加器FileNotFoundError及原因见verification-initial-failure.txt与phase-initial/failure材料。没有据中间帧改游戏知识或模型。
交运维提案路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-070543/learner/runs/20261013-070600-strategy-proposal/proposal.md。材料初扫148.48MB/0发现；最终扫描回执见gitleaks-final.log/json。
