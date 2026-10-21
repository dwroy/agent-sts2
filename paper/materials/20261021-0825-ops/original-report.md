# 本批策略证据与处置报告

本批无新增源码、参数、正式知识或live合入；十个复合提案均waiting，已在live的子项单列。提证和报告不代替学习入库、自然消费或收益验收。

时间：2026-10-21T07:59:24+08:00。task=strategy-proposal，character=silent，batch=20261021-074301-s2-strategy-proposal。base/final HEAD=9e4093ade80a237115147c0cd44b6f83c2efe367。开始git status干净，git merge --no-edit main返回Already up to date。learn.json对应task/角色/worktree/十ID已核，无research_request/implementation_request；只核普通专题文件绑定旧20261010批次，未读取work_spec，不套纯研究身份。README、最新STATE-2026-10-19、decision-log末尾、学习协议和代码提案闭环已读；历史停点与后续运维记录按时间保留，不操作服务。

十锚点均在runs.jsonl有SILENT及非空ended：SADL为A7、F4Q为A9，其余八局A10，均未胜。原提案额外1913SE84AXQF/Q6M2Y34MWKRE/NHA2KW0RB7VP为A10、K3676LU8B0UH为A1，亦核角色/结束，不扩入最终runs或混作A10分母。runs-verification.json保留14局原行及offset/bytes/SHA。十份原文SHA核同，缺失旧exp路径的六份从原留存相同SHA副本恢复到本批scratch，出处见proposal-recovery.json；原Markdown、根请求与done父项不改。原31账本用正式fold读取，快照ledger-snapshot.json，原shipped状态不倒改。

## 冻结提证与身份

先调用根evidence_summary.py，随后执行指定四流extract_evidence.py与14局七流提证。摘要是事实索引，不以最后五条冒充完整覆盖。

| 流 | 冻结字节 | 本批匹配行 | 源前缀SHA256 |
|---|---:|---:|---|
| v6-build | 64678849 | 0 | f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da |
| jev-prompts | 2312669008 | 1838 | b44bbf3ff002ee422c32d72635e0576c73e1af08ea47a8360b110e36d4875999 |
| decisions | 3180432950 | 6982 | dc3cfaa5dad631683717484ab0ac3e1daccf40d2c6a14c69fe2994244724813b |
| run-config | 2355118 | 10 | 534288b50b7745fead3f8c4fa5dd006f6bbfa1054bacfd14cd19255de0b6e451 |

新七流evidence/evidence-manifest.json：9257个state、8900个decision、72条SL、14条config、74条run-plan、463条brain、14条runs。states冻结15026120985字节，SHA6dd9d51889b98f027aa62a6a51ba00f3af78687636afd8f7a99bdd4d4ec873a3。模型只读必要窗口及投影，不输出全state流。初步分析复用原061302-s2冻结提证缓存并核输出SHA；新提证完成后current-analysis/重新从本批提证计算。旧/新切点与报告均保留，未覆盖旧零行或补填cutoff。

七道题保留旧冻结原引用并回源核SHA；本批三题另与新Jev逐SHA核同，额外四题与新14局decisions逐SHA核同。全部新提证输出SHA已核，见extraction-output-verification.json；所用4584个唯一原始范围（包含全题机械身份索引引用；不表示全题模型已读）已seek原日志核长度/SHA和未越原source_size，见raw-byte-verification.json，另附NHA首试原始窗口。逐行run_id/fingerprint.run或decisions精确decision_id建立身份；正文提及/时间邻近/question_id相似均不建立所属局，时间仅在身份已核的同局内定位前后状态。

指定decisions全源2坏行/unknown_identity1934/unmatched_decision_id1452，Jev全源1坏行；新states全源2坏行/unknown_identity3389，brain全源2坏行；未见冻结截断行。全源缺口不擅自归本批、不当零样本。content回执pending_host_seal=true/deferred_errno18表示宿主封存待补，不冒认已宿主封存；本地文件、输出SHA与原范围校验分列。

## V6与Jev完整覆盖/未读范围

10局v6-build均no_match，无相关原行可读；entries/jev_answer/fallback/unknown四类不能解释成各观察到0事件、采用或收益。10条历史run-config原行均无V6字段（config-v6-check.json），故开关未登记/未知，不写显式off或on；历史缺流和无匹配含义不同。提证不证明V6发布、下一局消费或自然收益。

本批Jev匹配1838行，机械统计均有request/answers、error字段0行；字段计数不证明全部成功采用。完整核读本批3题及原提案额外4题，共7题；其余本批1835题未完整模型阅读，逐题身份、原引用与未读原因见question-coverage.json。额外仅这四道精确有界补证，不声称额外四局Jev全流覆盖。全量提取不等于全题已读。

| decision原行 | 局/层/回合 | 完整核读与实际后果 |
|---|---|---|
|275383|TXZ F48第3试T6|完整六候选/plan6原答，SL改冒泡+羽化；首动作completed，状态核整轮及F49。|
|275960|WQ F33第3试T9|完整五牌线+三药选项，原答plan2；SL改飞镖，completed，核实血价。|
|276139|WQ F33第6试T7|完整四牌线+三药选项，原答plan4；SL改逃离，completed，核弃牌与沙坑。|
|276585|Q6 F2T1|完整五候选/plan4原答，confidence0.29；原线实际12损，早饮候选未整战实打。|
|276676|Q6 F8T4|完整五候选/plan1原答，completed；紧勒技能弃牌完成才扣血，预测19/实际23。|
|277248|NHA F33第5试T1弃牌前|完整十候选/plan5原答；SL改plan1式线；首动作pending (unstable)，后继确证进入弃牌。|
|277250|NHA同轮弃牌后|完整七候选/plan4原答仍为斗篷；整场模拟unavailable（5s内无样本）；SL avoid再次改回响，completed。|

七题error均缺字段、fallback=false；gate_reject与selection_dispatch均未落字段，不能称所有闸均通过。原答、SL覆盖、chosen首动作、result及后继states分列；NHA pending不改写成completed。277248首次输出截断的plan2/plan3已补读，未用截断原文验收。275342/275894/277272/277274仅核decision及状态/原答关联，未称这些题完整已读。旧题内嵌其他角色药水统计只保留本角色原题污染，不作为本角色证据或学习结论。

## 原始状态的支持、反例与未知

TXZ第2/3试T6同48HP/敌460，原线45HP/敌424、替线48HP/敌433，即少损3亦少伤9。后继手牌不同，第三试首胜4血、F49从4到0且敌方未攻击；不能据首胜宣称连战改善或用低可信0%放宽必死/SL。

WQ第2/3试T9同26HP/敌184，原线13/160、替线4/145，付9血多打15；第6试T7沙坑4→5、结算后4，付4血且同扣24，约束“一律保血”。全败/同死亡比例不等于同真实代价；缺可分离影响的完整后继，攻击/沙坑内部先致死顺序未知。

九局42饮狡诈重核37次添3、2次添2、3次添0；新增均升级SHIV/基础Damage6；WQ满手续饮仍耗瓶且当步HP/能量不变（cunning-check.json及current-analysis/cunning-transitions.json）。42饮不是42独立局。仅定位WQ一次计划妥当建立，不由容量与保留快照推完整穿插/恢复策略已验收。

1913 F24锻造40→40/F28休息40→61/F29胜后46及F31入口46并死；Q6事件44→36、F5/F6零损留药为反例，休息36→57、F8胜后2/F9死。Q6早饮候选当轮0损/五轮4.9，原答攻击线实际12损，没有早饮整战实打。Q6紧勒103→95→85→85（选择未完成）→83→80，玩家34→33；普通无挡机制已有源码，不冒称升级/叠层/再生/荆棘等全部联合完成。原109/70局总体分母本轮未复算。

NHA首试14挡、30→29、敌合计408→400；第5/6试8挡、30→23、敌408→384，多损6、多净扣16。跨轮净扣含轮初自动伤，不能全归回响。首题预测列精确切击，实际生存者弃掉它后重发题、再次由SL覆盖；不拿首题1/21预测当完整实际输出。六试均败，重放不增加独立结果。F24/F27/F32实际休息、F28事件付5/F30胜后4/F33开场30分账，不据零精英、多营火保证后续安全。

油灯156个限定牌型转换定位原17类直接窗口（11毒窗、F33六次X1萎靡）及额外F19一候选；18不是独立局数或对原17的自动修正。触发前后快照相同且无消费位；缺首次消费跨动作/重读/新战/SL恢复的可靠生产状态链。不按持有、回合号或毒量猜首次，不无条件翻倍；其他子公式未逐项联合验收，仍保留未知。

## 十项原提案处置

| 原提案ID | 原账本ID | 证据及本轮处置 |
|---|---|---|
| silent-proposal-92920295a648b540 | silent-0228,silent-0255 | TXZ6RVMQA09D A10 F48 第2/3试T6；states281480—281484/281536—281539，F48/F49 281563—281566。 TXZ同盘T6少损3亦少伤9、首胜4血后F49归零已核；缺保持后继抽序/生成牌的完整两战配对及独立校准。 |
| silent-proposal-a327449c331efbc1 | silent-0079,silent-0018 | WQZVENQ7DTRP A10 F33 第2/3试T9/第6试T7；decisions275894/275960/276139，states282075—282079/282144—282148/282330—282336。 WQ付9血换15伤与付4血延长沙坑的相反边界已核；差额审计已有live源码，缺可分离血价/沙坑/毒影响的受控后继，不能改探索排序。 |
| silent-proposal-a099e89437e942bb | silent-0030,silent-0257,silent-0258 | 原文九Silent局；WQ F33第5/6试T11 282292—282296/282352—282357；第5试T8计划妥当建立276089。 九局42饮的3/2/0容量已核且容量子实现已在live；保留、跨选择重规划、穿插出刀至SL恢复的完整联合验收未齐。 |
| silent-proposal-47910f82a1fdd98f | silent-0018,silent-0019,silent-0020,silent-0021,silent-0025,silent-0079,silent-0198,silent-0228,silent-0255 | TXZ F49 4→0（281565/281566），WQ F33 T9/T7；原105局总体统计本轮不重算。 TXZ四血续战入口与WQ双向血价已核，开场和差额子实现已在live；缺连续替线、持药价值和真实资源结转的联合校准。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019,silent-0020,silent-0050,silent-0253 | 1913SE84AXQF A10 F24/F28/F29/F31，Q6M2Y34MWKRE A10 F2T1/F5—9；完整题276585。 Q6早饮完整题及1913/Q6实际资源链已核；早饮候选未实打完整后继，缺早饮/留药配对及退出价值时间留出验证。 |
| silent-proposal-38a49e6c97f31eea | silent-0006,silent-0011,silent-0025,silent-0044,silent-0050,silent-0064,silent-0133,silent-0253,silent-0259,silent-0261,silent-0262 | Q6 A10 F8T4 完整题276676；states282887—282892：103→95→85→85→83→80，玩家34→33。 Q6普通紧勒19预测/23实际链已核且已有live子实现；再生封顶、临时药、荆棘反杀、重接、成长及SL各分支尚未完成联合固定验收。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019,silent-0020,silent-0021 | 1913 F24 40→40/F28 40→61/F29 61→46/F31入口46；Q6 F3 44→36/F7 36→57/F8退出2/F9死。 1913锻造不回血/实际休息与Q6胜后2血接下战死亡已核；原109局统计分母未重算，缺事件、休息及路线替线的同条件后继。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | NHA2KW0RB7VP A10 F33 第5试T1 277248/277250；首试283391—283397/第5试283478—283483/第6试283502—283507。 NHA弃牌前后两道完整原题及SL再次覆盖已核，实线多损6、多净扣16；缺同预算完整后继配对和独立时间留出，不能拟合饱和SL筛选门槛。 |
| silent-proposal-04b6b430759815ed | silent-0005,silent-0006,silent-0021,silent-0011,silent-0065,silent-0264,silent-0079,silent-0133,silent-0169,silent-0189,silent-0013,silent-0053,silent-0162,silent-0265 | NHA A10 F17T1/F33六试T1；K3676LU8B0UH A1 F30T2/F38T1；SADL3CGYTGSR A7 F45T1/F48T2。 三局油灯原17类窗口与额外F19候选已定位，快照无消费字段；缺首次消费跨动作/重读/换战/SL恢复的可靠状态链及其余子公式联合验收。 |
| silent-proposal-9952ee8e8df9a0fe | silent-0019,silent-0020,silent-0065,silent-0264,silent-0079 | NHA A10 F24 18→42/F25末21/F27→45/F28→40/F30末4/F32→28/F33可操作30；首/第5/6试T1同盘。 NHA两题覆盖、实际血价及二幕资源链已核；缺未走路线、保留药水和同抽整战对照，旧70局统计分母未重算，不改SL或终局门槛。 |

每项原文SHA、账本、窗口、反例、预期/验证/切分与回退见同目录*.original.md、proposal.md和proposal-results.json。确定机制bug无需独立胜局才能修，本批未定位新的确定bug或可安全完成的独立源码变更。没有新参数或策略，不扩展到未领取ID/其他角色。

## 已有子实现与本轮交付

实际live只读HEAD=cf4aff4ceebd958ad70b1512cc886c45bd8092aa；7相关生产叶与本树逐SHA相同。以下提交重新核为实际live祖先（source-audit.json）：

- 6403fdcdadc803a092beb5165a068e22bf51c412：Model observed Silent Cunning Potion generation and hand capacity。
- 0e4fe4df89a06682468e0e4716c12126e76369d5：Log Silent SL Sandpit resource comparisons。
- 1698adc96ba434a46942321e0237b70657e625b2：Complete Silent SL resource comparison audit。
- e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a：Model observed Silent opening HP loss in continuous fights。
- 5c7105ff0294466da8319f2934beda05c6040794：Model observed ordinary Strangle losses for Silent。
- f2c7cc1a7288893bceae0f0b20304a2b1fae5f57：Replay tested Silent Crusher facing rounding on current live。

这些只证明已有子实现，不给十个父提案整项duplicate/implemented。未新建代码提案或伪造implemented_commit；code_proposals沿用十个真实CLI ID，implementation_domains=[]表示本轮无新增实现。

本轮仅ignored scratch及授权账本CLI记录，无源码提交/live合并/eval版本/shipped。无源码修改，未运行tsc/vitest、没有撤源码失败/恢复通过，tests均null；材料校验不作代码测试。无规则上线，不写虚假的decision-log上线记录/双通知。HEAD保持base，追踪树干净；交付proposal.md、report.md、result.json，不关闭学习父要求。

未派子agent、联网、调LLM或运行play，未改账号/模型配置/权限。没有本会话原生turn_context/请求回执，不声称high已核生效。失败保留：初次队列历史输出超预算，随后按十ID折叠重读；一次定位不存在的strangle文件失败后核实际路径；首次报告生成工具代码语法失败，未写文件，随后修正重跑。旧失败/切点/初稿不删，不将未读题、未知身份/后果或宿主待封存记已完成。

本批核验记录仅经根learner/ledger.py add登记silent-0551（proposed，by=learner:strategy-proposal），CLI show回读保存在ledger-readback.json；原十提案及31个原账本状态不改，未标shipped。
