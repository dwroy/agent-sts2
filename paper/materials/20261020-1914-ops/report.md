# 三局静默猎手复盘与原始证据报告

核验时间：2026-10-20T19:07:22+08:00。来源任务postmortem；全程独立，未派子agent。只追加lessons／经CLI记账与提案，未改游戏代码、未提交、未推送、未运行play。

三局均在runs.jsonl:859—861中以SILENT、A10、ended明确结束，victory=false；追加前无对应标题，本批无跳过。README、最新STATE-2026-10-19、decision-log尾部、学习协议、账本说明、代码提案闭环及三份run笔记已读。STATE保留历史停点，以本批原始ended/run-config确认实际身份，不从历史停点臆断缺流。

提证命令按任务原文执行：evidence_summary.py与extract_evidence.py（streams v6-build jev-prompts decisions run-config）；三局resource_chain.py各执行一次。提证器默认共享不可变对象输出的位置原样留在manifest，不手改或清理它。其余临时文件仅在本任务目录。

## 结局、计数与数字核验

|局号|结束层／末试|决策／状态／run-plans|Jev低信心／原答最优比例|代码首次决定轮／全部轮|
|---|---|---|---|---|
|T749HZSY80X6|F33 T4：3血8挡对28激光，末敌159／126|621／643／127|35／131/162|26/109|
|KYJMB7ELM6FN|F28 T3：7血5挡对14，末敌59|492／505／93|25／132/148|15/80|
|JWJLSQXDKUA2|F33 T6：5血7挡对24，末敌152，沙坑仍1|614／642／110|9／82/95|27/97|

3条经验×3局均已追加。T749新增单动作目标朝向接线bug silent-0535；已有经验按support补证，不冒称同一失误重犯。更新silent-0019（三局）、silent-0278（T749/KYJ）、silent-0079（KYJ）、silent-0021／0018（JWJ）。新mechanic条目无：机制段只增加对已知机制的本角色实证，不将未隔离组合包装成新定律。

全部进场／退出HP、maxHP、带槽药水、UTC、状态行和SL截断详见三份resource-table.md及lessons。全部赢战保留：T749 16胜＋3截断＋1实际亡；KYJ 12胜＋3截断＋1亡；JWJ 14胜＋3截断＋1亡。首帧均T1但可能已发生轮初自动效果，SL截断均无退出帧。每轮需清HP池、可见伤害下限、确认新增HP下限、玩家净耗见三份turn-table.md及turn-audit.json，后者保留同类身份冲突／缺死亡帧。下限0不代表总伤害为0。

药水：T749普通补给9＋新战石头5，实际use20次（含SL恢复的石头3＋毒药3）；KYJ补给8、use11（毒药SL恢复3）；JWJ补给10、use10；三局无discard_potion。SL回复只单列重置，净HP变化不是毛攻击伤害。每瓶获得／饮用楼层回合、槽、状态与决策索引已写入各节。

追加后重新按原始offset seek，核对关键末帧HP／格挡／敌HP／意图与SHA，见numeric-check.json；并重新rg复盘标题和131/162、132/148、82/95。与日志一致，无需勘误。lessons-before.json记录原前缀大小/SHA，追加后逐字前缀一致；每局只执行一次cat >> heredoc，没有改旧内容。

## 冻结切点与身份关联

|源流|冻结bytes|原始前缀SHA256／本批数量|
|---|---|---|
|v6-build|64622743|d9d6b2891dc95f42d8081c74fe22fe1cf73eea92d323ba2c08b7943a70f58c54；{'T749HZSY80X6': 97, 'KYJMB7ELM6FN': 75, 'JWJLSQXDKUA2': 88}|
|jev-prompts|2181673141|bc7b6d70b2cdccdf3943d9be85511be62155797836c15dfb84989d67ac1f81cb；{'T749HZSY80X6': 191, 'KYJMB7ELM6FN': 190, 'JWJLSQXDKUA2': 106}|
|decisions|2967844963|8d339ded386f895656fc2f166ac65e8a3a61dd837781720da98d1dec37f45c25；{'T749HZSY80X6': 621, 'KYJMB7ELM6FN': 492, 'JWJLSQXDKUA2': 614}|
|run-config|2240582|80ac2f7d9030022fa59a5f5861eccfea3a9423e873bb3ddac6d9d7c921406d40；{'T749HZSY80X6': 1, 'KYJMB7ELM6FN': 1, 'JWJLSQXDKUA2': 1}|
|states|14718684631|逐原行SHA保存于selected文件与verified-refs.json；{'T749HZSY80X6': 643, 'KYJMB7ELM6FN': 505, 'JWJLSQXDKUA2': 642}|
|run-plans|10120201|逐原行SHA保存于selected文件与verified-refs.json；{'T749HZSY80X6': 127, 'KYJMB7ELM6FN': 93, 'JWJLSQXDKUA2': 110}|
|brain|1117125269|逐原行SHA保存于selected文件与verified-refs.json；{'T749HZSY80X6': 61, 'KYJMB7ELM6FN': 45, 'JWJLSQXDKUA2': 52}|
|sl-attempts|49894916|逐原行SHA保存于selected文件与verified-refs.json；{'T749HZSY80X6': 10, 'KYJMB7ELM6FN': 5, 'JWJLSQXDKUA2': 7}|
|fight-plans|2233957|逐原行SHA保存于selected文件与verified-refs.json；{'T749HZSY80X6': 0, 'KYJMB7ELM6FN': 0, 'JWJLSQXDKUA2': 0}|
|runs|390048|逐原行SHA保存于selected文件与verified-refs.json；{'T749HZSY80X6': 1, 'KYJMB7ELM6FN': 1, 'JWJLSQXDKUA2': 1}|

仅显式run_id（包括state.run_id／fingerprint.run）或由decisions原行核对的精确decision_id关联。Jev提证manifest保存decision_identity_source和每行identity.decision_ref；没有用正文提及、时间邻近或question_id相似字符串认领局号。deepseek-reasoning仅按任务允许的首末决策窗取旧流，在361MB原文件完整流式扫描后本批三窗均无匹配，见deepseek-window-manifest.json；旧文件缺本批内容不等于没有推理。fight-plans显式局号均无匹配。

按原始offset/bytes重新读取并校验：{'states.selected.jsonl': 1790, 'decisions.selected.jsonl': 1727, 'run-plans.selected.jsonl': 330, 'brain.selected.jsonl': 158, 'sl-attempts.selected.jsonl': 22, 'run-config.selected.jsonl': 3, 'runs.selected.jsonl': 3, 'v6-build.evidence.jsonl': 4, 'jev-prompts.evidence.jsonl': 7}；SHA不符0。全部所用源行、冻结切点与SHA见verified-refs.json；Jev5道完整题和2个错误行另有原始JSON留存，v6-evidence保留提证视图。

## 实际题面覆盖与未读边界

完整读Jev request全部state／questions／answers：T749 j71097；KYJ j71283（T2小刀／结束／未模拟毒药）、j71286（T3中和）、j71287（T3毒药）；JWJ j71393（T5三整线）。首次显示截断的j71393已按state和三个criteria分别补齐，保留原始定量模型、combat_memory和错误边界；巨大的decision_evidence审计体未逐项阅读。

逐问题核了本批相关decisions chosen/result：T749 d444201—444204与s459660—459664；KYJ d444694的原答plan2和chosen=end_turn／selection_audit.sl_delta、d444695—444699与s460165—460172；JWJ d445307—445316与s460806—460817。所选单动作题gate_reject与selection_dispatch未记录；JWJ整线首动作selection_dispatch仅completed、whole_plan_executed=null、state_effect_verified=false，完整执行由后继state另核。T749/JWJ原始error各1：预算耗尽分别j71009→d444002、j71337→d444990，代码兜底回执和后继状态保留，不能计为Jev成功采用。

完整读V6原行v312／405／482的门回退以及JWJ v481失败。全部260行只做有限字段计数：构筑门回退30／26／30，known=0且entries为空；全部jev_answer=null；另有方向trigger非空entries，其内容未逐条完整科学验收。V6 mode=on不保证采用；run-config reflex=off与战斗题combat_memory的边界分别记，不能把config某开关推广成所有V6功能关闭。

未完整阅读题面的其余Jev原行：T749 190、KYJ 187、JWJ 105（含只读错误字段的行）；每一个问题的decision_id、精确原行、offset/bytes/SHA、身份来源、已读字段与未读原因全列coverage.json。原因是本批只对影响上述三条经验及资源、死亡的关键问题做完整题验收；未对其他全部候选／focus／kill_orders作策略因果评价。不能把末五条当完整覆盖，也不能把脚本解析答案当模型已经读完所有原题。

保留历史缺口：Jev全流invalid_json=1（原行53166），decisions全流invalid_json=2（373494／373505）；无冻结尾截断。decisions提证身份缺口unknown_identity=1934、unmatched_decision_id=1395，未猜归本批；V6/Jev本批匹配没有因此补出未知收益。方向脑brain_request_failed和prompt_truncated原值保留，partial_samples不当完整请求完成。

未记录项：三局完整敌人毛伤、缺帧时完整每轮伤害、未选方案整线代价／胜负、全部候选的执行成功率、Jev缓存命中、旧式boss时钟需要／估计及实打／估值比、原生turn_context档位回执；KYJ未到二幕boss的实打自然缺失。HP护栏可见替换0、可见代价0，只针对记录可核部分，SL探索不并入。

## 代码提案与验收

|CLI id|账本／局号|实现任务与状态|
|---|---|---|
|silent-proposal-84af8bc877ca131f|silent-0535／T749HZSY80X6|strategy-proposal，pending；/home/dw/Projects/agent-sts2/learner/runs/20261020-184316-10058ea4-8e6c-46ac-aeb3-11dae3ca6204-postmortem/single-action-facing.md|
|silent-proposal-ce8d3cbcc56604ab|silent-0278,silent-0079／T749HZSY80X6,KYJMB7ELM6FN|strategy-proposal，pending；/home/dw/Projects/agent-sts2/learner/runs/20261020-184316-10058ea4-8e6c-46ac-aeb3-11dae3ca6204-postmortem/toad-poison-saturated-audit.md|
|silent-proposal-b52ddf471792f647|silent-0018,silent-0021／JWJLSQXDKUA2|strategy-proposal，pending；/home/dw/Projects/agent-sts2/learner/runs/20261020-184316-10058ea4-8e6c-46ac-aeb3-11dae3ca6204-postmortem/sandworm-dual-terminal-audit.md|

三份提案Markdown／JSON仅在本任务目录，CLI读回及注册SHA验证见proposal-readback.json。第一项有窄事实接线依据；其余配对策略／药水时点／权重数据不足，明确保留当前行为，等独立实现任务固定回放后再处理。没有实际live祖先源码提交可登记，本批没有implemented或shipped声明，不生成发布号。proposal中selected_dispatch一处为selection_dispatch的文书简称，实际字段始终以原JSON为准，已登记原稿不改写。

ledger.py find --run三次已读回：{'T749HZSY80X6': ['silent-0019', 'silent-0278', 'silent-0535'], 'KYJMB7ELM6FN': ['silent-0019', 'silent-0079', 'silent-0278'], 'JWJLSQXDKUA2': ['silent-0018', 'silent-0019', 'silent-0021']}；ledger.py check退出码0。新bug以observed入账，未更改旧条目状态。CLI登记代码提案自动追加账本去处／实现任务链接。

本次是记录任务，没有生产代码改动，因此按任务规则未跑tsc/vitest。本提证不证明正式发布、下一局实际消费或自然收益；科学父要求不因复盘／入队而关闭。
