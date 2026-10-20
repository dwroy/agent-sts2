# Silent 策略提案证据复核报告

记录时间：2026-10-20T22:27:57+08:00。

十项均waiting；未修改源码、任务模板、知识、参数或对局规则，没有提交、live合入、发布号或shipped登记。逐项原因、账本、局/层/回合、反例和验证方案见proposal.md；机器处置见proposal_results.json。

## 身份与基线

本批20261020-221302-s2-strategy-proposal的根learn.json行已核，task=strategy-proposal、character=silent、reason=proposal、三个runs与工作树及十个proposal_ids相符；没有research_request/implementation_request/proposal_repair。dispatch-row.json保存本次行。根notes/strategy-research-silent.json仍绑定20261010旧专题，不套用纯研究或另一个实现请求。

开工git status干净；git merge --no-edit main返回Already up to date；report.base及HEAD为260ad020f83b7cb49eda94ec80f942fbe20f354b。已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环及留存说明。独立完成，未派下级agent；未改模型、账号、home、配置或权限。未核本学习者原生turn_context/请求回执，不冒称high已实测生效；历史对局run-config的high不代本线程回执。

十份派发登记及角色、账本已读。五份postmortem原路径存在；其余五份从本仓旧014302批次留存精确Markdown找回，只复制至本批scratch，未重建旧树或整仓。八份SHA核同；两份不相符，完整存档正文及两稿仅标题/账本/经验链接差异均已读。recovered-proposals.json保存出处、bytes、实际及登记SHA。冲突未自行关闭：
- silent-proposal-4c28c13316c0d88e：登记`b096eae70881445df69a6168d01c8608795224c702ad1df437b0d2452de53608`；留存`961cc57d5de58d33d5ba6a33034422fe6e1650439708f72c3d25c8c93386a1d0`。
- silent-proposal-51d8fe5060c677e8：登记`d929cd8cebf26e362413ee7d964a308f25ed72602b9de9c159cb8e693c0e5504`；留存`c9b3432cce46597cd191f56ce148f924b3c9e9ec7452c1e4acd6e219b4048d39`。

## 结束身份及冻结原证据

runs.jsonl原615/616/617行均显式SILENT/A10且ended非空：BJL于2026-10-08T07:57:48.143Z F42败，Y5于08:26:07.074Z F33败，SY0于09:05:54.173Z F33败。run-identity.json保留完整原行及offset/bytes/SHA和切点。本批只以这三局作证，不以题面中引用的历史局或跨角色内容增加分母。

指定根evidence_summary、指定V6四流extract、默认八流extract均完成退出0。实际读取两个manifest，公共四流切点、输出SHA一致。摘要先作入口，不把最后五条当全覆盖；原始字节仍按ref回读。下表每个SHA为冻结前缀，逐行offset/bytes/SHA、source_size及显式run/fingerprint身份、精确decision_ref均保存在evidence行中：

| 流 | 冻结字节 | BJL/Y5/SY0匹配行 | 无效/截断 | 前缀SHA256 |
|---|---:|---|---|---|
|states|14739056835|628/517/722|2/0|`91767a2eea3d4060e1c3e974ba64a0cf9f46354ded41debd59973ad4bc9aa276`|
|decisions|2983439710|594/496/636|2/0|`37f72dcbc1624be0e1900df3c40fd320aca83adf4f0d8dabcebd397474a966ef`|
|sl-attempts|49998928|8/3/10|0/0|`f28a3774181b06126f9fee783a3db3358be4fb1c388524f85b874cd27b55e6f2`|
|run-config|2246610|1/1/1|0/0|`2ced07d4fc81a2fdd344c8dcd13a21e09a668f28c84d3a27b0ed3d0dabdbbd4e`|
|run-plans|10128883|9/6/7|0/0|`492f34d9bf56f8925c63818f9ccd731973a38b967d8c1fc4f84efecbc74c546f`|
|brain|1121393444|43/32/37|2/0|`03443d41809ed73f423fb8626c3c84e66e2c12daf3ea36ad0960e01bb1de4b17`|
|v6-build|64635703|0/0/0|0/0|`ae5195b62f5b7f5e623fc42228d13112113f1bfab34b8477cb288b9b9eee603b`|
|jev-prompts|2190268130|111/74/175|1/0|`820bb013c4ba4caf8cfcab5562a6cef705ed8603032ded9b9039fbda3a14e1ca`|

全源states有3335条unknown_identity；decisions有1934条unknown_identity、1398条unmatched_decision_id；无效JSON的原定位保留在manifest，身份未知不分配给本批。无截断只描述当前冻结前缀，不证明每次历史尝试无缺帧。run-plans按run身份；其他流run_id/state.run_id/fingerprint.run必须相容；Jev与decisions精确decision_id及题目、答案、fingerprint逐对象相同。正文提及、时间近邻、question_id相似均不建立所属局。时间及fingerprint只在已定所属局内匹配唯一输入state。

本次v6-build文件存在但三局均no_match；前批冻结时missing是另一切点事实，不覆盖旧报告。没有本批entries/jev_answer/fallback/unknown原行，四项均不可观察，不填零、不拿旧Jev答案代替。三份run-config无V6字段，显式on/off未知；均Jev enabled=true/context=v1。Jev 360条均有request/answers，没有记录error字段；字段存在不等执行成功。decisions 1726条中gate_reject/selection_dispatch均未记录，不能记成0次拒绝或已派发；chosen/result和后继states另核。

不可变视图content仍有pending_host_seal=true/deferred_errno=18，表示宿主封存待办；本地原字节核同不冒称宿主封口完成。提证不证明本批正式发布、下一局消费或自然收益。

## 完整读题覆盖及后果

本批机械校验全部360条Jev及1726条decisions，模型完整审阅8题（BJL1、Y5 1、SY0 6），其余352题仅定位/身份/字段校验，未逐题全文审阅；question-coverage.json逐条保存未读理由。八题完整request/state/questions全部候选、答案、元数据与decision均保留raw-readback/原字节；SY0末试后两题对前题相同state字段逐对象比对后复用阅读，全部变化字段/候选/答案另读。脚本扫描/回读不等模型读过全局。

| Jev源行 | 局/层/回合 | 精确decision_id | decision源行 | 输入state源行 | Jev offset/bytes/SHA256 |
|---:|---|---|---:|---:|---|
|32634|BJLTVSYXCSGS/F39T1|f7051944-6524-4753-8ede-b4f9c4359331|293243|300484|469325383/25654/`a571abb9552d3bebe598d72e234ff5efe737ed25c89a2c718f2e089ba1841c36`|
|32726|Y5H4CFAQ2WTG/F33T1|1e2411d9-5a67-4e1a-82fa-57243fadba02|293805|301068|470500523/10993/`20e4d289b3ecd84d25556a5879cb8d2255e73f4afc634def4c32f860bfa99368`|
|32771|SY0WMJNNVRLM/F9T2|f03c2744-854f-450b-8ae9-9109f5b59c8e|293969|301239|470990816/14990/`783942e1a00cea54326807a1109edf61841e46548093b20bd1584a2677330266`|
|32772|SY0WMJNNVRLM/F9T2|187bcf77-722c-4174-929b-6f58a3456688|293971|301241|471005806/10197/`4f9e2b45c0f978ea785404a78632298befd9d1740e9ae2ce820b2d77aabb034d`|
|32773|SY0WMJNNVRLM/F9T2|093d5644-9569-41a5-8d79-8c850c5bf297|293973|301243|471016003/8758/`95eda36e356e8432483b0463a3da51dc7533b3c8b53af5b3d5f4fffc9cbb2f34`|
|32903|SY0WMJNNVRLM/F33T3|0ca692fd-a370-40a6-abd2-6ef531785308|294461|301801|472944686/19086/`affd5c492840d12f46421d6ec7eca9b03414a7e26e1dd24a8762afba0e433ee2`|
|32904|SY0WMJNNVRLM/F33T3|6592aa03-3cdb-423a-9469-8b853a2622e6|294463|301803|472963772/15205/`c3ba5939b81ab518ccc432dbfb4395431f42dbf3d15a7b9a8cd6bb643c72f2ba`|
|32905|SY0WMJNNVRLM/F33T3|00847b39-1109-4a49-806f-1fec8a674868|294465|301805|472978977/15209/`14f92b220f25ae726b288a27dc537307a60459ce17a85375df466c0a6e03bb80`|

1. BJL F39T1：J32634有10个完整候选，Jev选plan7，概率1、confidence1；该线预计10损/33进度。D293243的HP guard改plan1预计0损，实际先步法，随后打击、复制药、防御+，D293243—247均completed。S300484—489实建2敏/复制1，挡0→20，下一轮仍21HP。原plan7未执行；题面“药水表未加载”真实存在，不证明应赋何种持有价或留药获胜。
2. Y5 F33T1：D293799—803弃牌动作返回pending/unstable，不能当各已即时结算；D293804确认后S301063—068敌341→326。J32726完整三候选选plan3/.89；D293805—809暴露、刺杀、中和、匕首雨、打击均completed，S301068—073敌326→259、67进度与先五弃15分账。T2药水前后S301077—078能量0→2；缺保留启毒的整战对照，不改换牌偏好。
3. SY0 F9T2：J32771原plan3/.93为15损12伤，D293969护栏改plan1为5损0伤。防御、后空翻后S301241新抽中和/带毒刺击，J32772另选plan1/.91，J32773选结束/.86。D293969—973均completed；S301239—244实际53→51、敌67→55（行动9、结毒3）。原完整攻击线未执行，不能宣称护栏因果省13血。
4. SY0 F33末试T3：J32903选plan2/.88，D294461.sl_explore改plan3：原18损7伤/五轮死16/24，换后21损0伤/22/24；低可信B2三线各1200样本全0胜。D294462后空翻后抽防御/中和，J32904选plan1/.46、J32905结束/.24；D294463—465实际跟随新题completed。S301800—806实66→58、挡15对弱后23、敌296→290（中和3/荆棘3）、沙坑4→3。实际8损属于重问后新线，不是原21损同线模型误差；未证强制力量或禁止探索可赢。

各题completed只证明单步接口结果。gate_reject与selection_dispatch缺字段的限制适用于上述八题；SL在rationale/sl_explore的替换不能改写成Jev自行选择。题面内历史经验原文只作题面组成，本批不重新验证其历史样本、跨角色统计或适用范围。

## 局部机制、资源和消费者

51个局部state窗口原字节重读，模型查看有界HP/挡/能量、手牌、逐实体HP/力/毒及后继。BJL F39普通步法2敏与复制防御20已核；SY0 S301520—521/F30先扣12而玩家得4力/目标1力，S301547—550/F31同样建立，后突然一拳12、中和7。仅确认这些场景，不推广普通版、重放或叠层。当前card-model动态StrengthPower/EnemyStrength入口已存在，不能冒报通用加力漏接线。

room-boundaries.json是房首末观察而非原子结算全序：BJL F33 61→9、F34 68、F35 68→28、F37 28→20、F38事件20→21、F39 21→12，F40/41仍12，F42末归0，F43无本局state；赢的战斗也计入，不预支未到营火。Y5 F19 59→20、F24 20→45、F25 45→25、F27 25→46、F28入店61、F29仍61、F30 61→44、F31 44→38、F32 38→59、F33归0。SY0 F19—21为58→47→17→3，F30 64→70、F31 70→46、F32 46→70、F33归0。净HP不是敌人毛伤；本批不重算旧整局瓶数/回血总数或将SL恢复当治疗/新药。

D293222换路线result明确no game action，且新旧F43投影均耗尽；不能据相同最终值宣称整条路径等价。当前route-projection明示未来营火按回血/锻造不回血，route-map显示两分支，但缺原联合输入、逐时点消费者和未走路线实际结局，仍不足整项duplicate。brain共43/32/37、run-plans共9/6/7只冻结定位，未逐份完整读题，不从计划文本断言已经执行或采用。

SL原行21条都保留并回读SHA，但模型未通读全部summary/turns。BJL F42前两次result=predicted_death/发生恢复、末次died；SY0 F33前五次predicted_death、末次died。提前读档不等已经发生敌方回合，不按尝试当独立局。宽机制13项/11项联合顺序、F42完整旧候选、F21同盘多目标逐步后继、保药与改路线的整战反事实均未完成，不把局部验证写成全项覆盖。

source-audit.json保存本基线五个源码叶的blob/SHA、实际live=048a9713bd4be09ad5f6d3f6131e8b729f51aece及祖先回执。幽灵药水observedGhostInAJar门仅Silent A10且当前无实体未建立时启用，原题所有候选仍保留；66283dd9982bdd7f480da7a4d9bfefea0572a9ac是实际live祖先（exit0）。这不是宽机制提案全部完成或自然收益。

蛇咬retain来源e2103b3a9b5fdd524508fa28e5dd64ec7f63eb46不是实际live祖先（exit1）。live独立log -S定位为eae56f79040d9c13c099160ec7d3f964510b0fd3的窄运输；另存该提交祖先及leaf字节核验，不把原来源整支main已存在说成整支上线。三份历史run-config均dirty，缺当时刷新的完整知识字节，当前源码不能假装完整复原历史运行联合输入。

## 逐项处置与交接

- `silent-proposal-a25e259862a1fd3e`：waiting。已核BJL F33—42出口HP/max及F39实际用药；缺保留原路线、提早休息或留药至后战的同资源完整后继，不能拟持有价或终局血线。
- `silent-proposal-fab06d987903ee52`：waiting。Y5 F33T1弃五牌及后续67进度可核；缺保留启毒与原爆发在相同抽序、药时点下的整战配对，不能强制改首轮换牌或启毒权重。
- `silent-proposal-54f7ee6b632cab26`：waiting。Y5 F29首末61HP及当前营火回血/锻造展示可核；缺原投影完整输入版本到实际路线/休息消费者的配对，局部展示不等整个条件追踪实现。
- `silent-proposal-00a6a10b15a62b38`：waiting。BJL F39步法和复制防御局部兑现已核；缺13项机制的联合入口、结算中间帧及消费者配对，本批没有定位新的窄范围可复现数值错误。
- `silent-proposal-b643d5b644ec7c64`：waiting。BJL F42两次predicted_death与末次实死分列；缺原候选同抽序完整执行后继及整战校准，有限模拟高胜或全败均不足以改变SL判据。
- `silent-proposal-dce02af8d115b477`：waiting。两局赢场损血、回复及未到营火保留；缺替代路线/留药的受控后战结局和联合终局消费者，不能由资源不足拟新终局或药水常数。
- `silent-proposal-6ce31508b40aa87f`：waiting。SY0 F9护栏与F33末试SL替换后均发生抽牌重问；原候选整线未受控执行，不能将旧预测15/21损与新线实损2/8相减视为收益。
- `silent-proposal-ca596a0c614d90c6`：waiting。SY0 F30/F31双向4/1力量与现有动态入口可核；缺同资源启动/不启动的完整后继和消费者追踪，不能由boss未施放强制加启动奖励。
- `silent-proposal-4c28c13316c0d88e`：waiting。十一项机制的联合传播/结算与消费者尚未逐项认证；幽灵药水窄门已有live祖先、蛇咬窄运输已有live来源，均不覆盖整项。留存稿SHA与登记SHA失配，保留冲突待原件/补证。
- `silent-proposal-51d8fe5060c677e8`：waiting。SY0 F21胜到3HP的资源出口及末战失败可核；目标/多步行动/抽牌共同变化，缺原候选受控整战后继；留存稿SHA与登记SHA不符。

没有新增游戏结论，不add重复经验/提案；本批只经根ledger.py追加原账本的proposal/report链接和审计note，不改旧claim/evidence/status/version，原shipped经验不降回proposed，也不把代码提案标shipped。执行输入/CLI返回和物理追加回读另存本目录；proposal_results交原调度器处置，等待项及学习父要求继续开放。

无生产源码改动，撤源码失败/恢复通过、tsc/vitest/cases均不适用未运行，tests固定null；字节校验不是生产测试。无提交、合入或实际上线规则变化，不造版本或虚假双通知。gitleaks对本批材料首次扫描退出0/no leaks found，最终写入完成后再核材料；不运行play、不推送、不改运维prompt或回收自身树。

运维交接：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-221302-s2/learner/runs/20261020-221334-176d4f70-d428-46e6-8e18-38145660fc9d-strategy-proposal/proposal.md；完整报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-221302-s2/learner/runs/20261020-221334-176d4f70-d428-46e6-8e18-38145660fc9d-strategy-proposal/report.md；最终机器回报：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-221302-s2/learner/runs/20261020-221334-176d4f70-d428-46e6-8e18-38145660fc9d-strategy-proposal/result.json。落盘不等收件人已读、消费者采用、自然收益或父要求完成。

最终机械核验：31条根账本元数据追加与物理原行读回一致，未含status/claim/evidence/version；ledger check退出0。2302个原字节段回读、两个manifest的全部产物SHA及公共流切点/产物一致性通过。材料最终gitleaks退出0/no leaks found。10项结果覆盖无遗漏，8/360题的审阅边界保留；源码差异为空、工作树干净、HEAD等于完整base。tsc/vitest/cases仍未运行，均null。
