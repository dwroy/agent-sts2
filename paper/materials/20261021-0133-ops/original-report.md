# 静默猎手策略提案核验报告

记录时间：2026-10-21T01:26:52+08:00，写前已运行date。本批十项均waiting，无生产源码/知识修改，无新增提交/live合入/版本。fixes=[]、merged=null；测试三字段均null。报告及提案是证据不足的逐项处置，不是发布、下一局消费、自然收益或父学习要求完成。

## 身份与范围

base=0a84a8fe2d5763c8df8c280739bc9049390d7776，开工git status --short为空，git merge --no-edit main返回Already up to date。dispatch.json保存实际根learn.json本批行：task=strategy-proposal、character=silent、reason=proposal、worktree精确匹配、十个proposal_ids；无research_request/implementation_request/proposal_repair。普通专题入口绑定旧批，不满足本批条件，因此不承接专题、不读另一专题代替；只消费这十项，不扩展整队列。

已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案协议。STATE的历史停局与decision-log后续恢复保留各自时间，不接管运维。独立工作、未派子agent、未联网、未运行play、未改账号/共用模型配置。未独立取得本线程原生turn_context回执，不冒报运行档位已核生效。

十局runs.jsonl逐offset/bytes/SHA读回，角色原值SILENT、规范化silent，均ended非空。三局A9、七局A10；G403VCZ3BH1B原victory=true，其余false。保留历史脑计数和dirty源码身份，不据此重算纯Codex战绩或SL独立胜率。

|局号|进阶|结束UTC|层/胜|决策/状态/Jev|完整读题|
|---|---:|---|---|---|---:|
|RC61MFQM63Y6|10|2026-10-07T17:26:17.487Z|33/False|674/694/147|2|
|XTSV1U9JD34T|10|2026-10-07T19:05:16.706Z|49/False|775/810/219|2|
|BTSRF7JL1W1Y|10|2026-10-07T18:15:04.461Z|31/False|635/653/139|1|
|9Z9H2EXKLF3T|10|2026-10-07T19:59:55.152Z|48/False|932/1018/281|1|
|HMVJKM56S4Q8|9|2026-10-05T19:20:10.364Z|33/False|642/664/187|0|
|F4QKG4J1AJJZ|9|2026-10-05T20:04:35.380Z|38/False|703/728/167|0|
|G403VCZ3BH1B|9|2026-10-05T20:51:26.103Z|48/True|635/654/153|0|
|25226ZFLNR1J|10|2026-10-05T21:59:18.953Z|48/False|862/889/184|0|
|JLN5SK17W4FQ|10|2026-10-05T22:55:20.454Z|33/False|790/810/147|0|
|JMH5C51RLN4E|10|2026-10-05T23:55:07.273Z|49/False|853/880/322|0|


## 冻结和覆盖

先运行指定根evidence_summary.py，再运行指定本树extract_evidence.py四流与默认八流；均自然退出0。摘要只作初始事实索引。实际读取两份manifest、本角色原始行及保留原提案，不把最后五条当完整覆盖。

|目录|流|冻结字节切点|冻结前缀SHA256|选中行|
|---|---|---:|---|---:|
|v6-evidence|v6-build|64655258|3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234|0|
|v6-evidence|jev-prompts|2222895598|dab4fc8cb2ef2255fd77b83c094f2472a31992ab49ab2aadaaf0d1602c88b3fb|1946|
|v6-evidence|decisions|3038096469|741ba4c11374ec0e84491f125ff0dacff74aa66d1a3d028e799ac8d781568aed|7501|
|v6-evidence|run-config|2276751|7fcfd71260bbeac8ce3e0062e108b99757f22928520e320bc52018842b05decb|11|
|evidence|states|14807991076|5bb303bfb7c687785e213ef148c4fca454ff300a1d72c7b2b0b3a877765994dd|7800|
|evidence|decisions|3038151647|1bd8e5edaf53bf2a8a2673bb6601d8f3d65cf6463be7b5234b06eea760638476|7501|
|evidence|sl-attempts|50351258|d46caf29efef9ba9069f001cfbede33733e2389e78334f6c674cb9fc66636c9a|77|
|evidence|run-config|2282780|112badd202fc0d66205c25a304b3917d450364a7a948f1cfdc2f91a979da59c3|11|
|evidence|run-plans|10163740|d5bb12e94bf72cc4b3ef6e64461efea40a8fb6baddc04a98ba40691fbb59514c|70|
|evidence|brain|1135825543|bea17fe6c88edc1f20328ddc0b5033352d2019d2eb821ada6e748dd46877707f|412|
|evidence|v6-build|64655258|3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234|0|
|evidence|jev-prompts|2222895598|dab4fc8cb2ef2255fd77b83c094f2472a31992ab49ab2aadaaf0d1602c88b3fb|1946|


后续日志继续追加造成切点不同；两个切点均保留，不覆盖旧报告或零行初稿。每条evidence保存source_size、原始offset/bytes/SHA及identity；原始身份仅用显式run_id/state.run_id/fingerprint.run或经原decisions核对的精确decision_id，不用正文提及、时间邻近、question_id字符串相似推所属局。时间只在已核同局内定位窗口。

V6源在冻结前缀确实存在、623行，但十局各自均no_match。run-config历史11行（JMH含重启）均无V6字段，on/off未知，不能记显式off。不存在本批可读V6 entries/jev_answer/fallback/unknown记录，这四项均不可观测，不填业务0；Jev request/answers/error是另一条流，不能相互代替。

Jev共1946条显式run归属，1946条都有request，1933条有非空answers，13条非空error；均call=ask。已对1946条按原源seek重新核SHA，1941条能精确连接本批decisions，另5条为JMH明确run_id的503失败请求，无匹配decision，保持该缺口，不借相邻成功行补执行。JMH的322条Jev日志与终局jev_calls309不混成成功调用分母；详jev-field-audit.json。13条错误只做字段/身份机械核验，本批未逐份阅读全文或归因其整场后果。

完整读题6条，涵盖4局；其余1940条仅机械索引，question-coverage.json逐题保留引用、题键、answers/error存在性、reviewed=false与未读原因。其余6局只核角色/终局与跨幕端点，完整Jev读题0；未宣称全十局所有问题、所有机制及全部115/116局历史覆盖。未扩提三项原支持局7X0W3U8TVA2A/MTQ0EUBJ3R6T，保留waiting，不以相似题代证。

全局冻结前缀缺口：states有2条invalid、3353条unknown_identity；默认decisions有2条invalid、1934条unknown_identity、1416条unmatched_decision_id（专项早截点1413）；brain有2条invalid；Jev有1条invalid；各流incomplete_lines=0。缺口不属于已确定本批成功/失败分母；manifest中的gap_refs是有限例子，不能当完整未知清单。对象视图/宿主封存状态沿原manifest保留，本批不代宿主验收。

## 六题原文、实际动作与后果

|Jev原行|decision_id|决策原行|offset / bytes|Jev原行SHA256|
|---:|---|---:|---|---|
|29259|0e35d53f-869c-4e52-938a-e51a37f30cc3|278930|420641811 / 21180|52162e48616856a7ba971fccdb53ba8c21a1d2ea8a7f7219d54887b6b9fd30ed|
|29260|1518201d-a071-417f-988c-68b93913b4fe|278933|420662991 / 12352|b2566d39a21c898d0a3010cafce1f7e56943158bad52487460173c86c998481f|
|29480|895ecd5e-3d2a-4915-8774-a7194aa3db51|279846|424293672 / 18454|965eb7e37bc6523c0f5337d2477a4cb184ba38a6e9383960a96df4f82d689a07|
|29682|fd78839e-8f93-4b35-9382-69a5c1258501|280550|426802142 / 10463|aaf1eeb531068f7f7ed6f648db50550e90198573f140e7b8094c6c33d539d1aa|
|29703|5787f501-2c1d-4c21-88a9-6d7452297f43|280637|427114353 / 7037|ad7b7865881d17e73a63919a7691ca9afcf49e5ed19a57c0baa3a844c22d0a7c|
|29984|96daa796-8173-4db1-b222-c81d696622cc|281568|431387840 / 15601|ad6b3ddd52f8c0ad6a4934f6d74cb823012cdd540f0ba3090411147d0c21788a|


六条完整request包含state、instructions及全部选项，answers/error、fingerprint与精确decision_id均实读。question-*.json保留原日志字节，reviewed-questions.evidence.jsonl保留身份出处；24条同窗口续步原decisions按源seek核SHA，保存followup-decisions.evidence.jsonl。七个锚点决策（含毒胜自动结束）另存reviewed-decisions.evidence.jsonl。66条必要状态原源seek/SHA复核，selected-states.evidence.jsonl保留完整row，state-windows.json仅作结构投影。没有将整份states灌入上下文。

24条续步的chosen/result已核，均单动作completed；gate_reject与selection_dispatch字段均缺失，不写false或伪造全线成功。动作、局部状态、整轮后果分层保留，不能用一个completed推出整方案执行。选中六题本身均有答案、无非空error，但全批仍有上述13条错误。

1. RC F23T3：Jev29259答plan1，首先预判；278931饮速度、278932斗篷。states285222—285225显示敏捷0→1→6→5、挡0→12。生成小刀后29260重新问，原答plan3（刺击→防御→打击→小刀），实际278933—278937按该续线执行；285226—285230挡12→21→25，末HP37不变，次轮临时属性消失。原首题预测22挡/损2并非完整实线，次题预测新增13挡与最终25相符。小刀文本零直伤但第三攻击后挡+4，与折扇来源分账；实敌87→81再毒到71，不能把题面dmg16当已发生净扣16。尚未验证所有组合或未执行替线更优。
2. BTS F31T2：Jev29480答plan1，题面黑暗镣铐/中和/防御/生存者/突然一拳，预计13伤/损4/杀丝。279846—279850实际只到生存者后结束，286158—286163中石虫16→7、甲虫18→13，防御5加生存者8建立13；最后唯一突然一拳随强制弃牌消失、未攻击丝虫。次轮HP35→21，石虫眩晕、丝虫仍5、甲虫40。该原局窄单弃问题已有live源码，不能重复当新遗漏，也不能把石虫眩晕等同整轮零损。
3. XTS F49T1：Jev29682在无药线预计损10与未模拟幽灵选项之间答p1（.51）；280550实际饮槽1，286897→286898建立INTANGIBLE1、攻击26→1；286899仍23HP、钳子带10挡。题面持有价0来自药水表未加载，并非学得零价值。早用当轮确实零损，缺延后整场对照，不能规定晚喝。当前窄幽灵模型已有live祖先，不能由历史未模拟推当前仍未实现。
4. XTS末次F49T4：Jev29703在触不可及/投掷匕首/防御中选card2，280637实际select_deck_card2，286984—286985建立NIGHTMARE3，280638防御后6挡/1HP/0能量；280639结束后286987 GAME_OVER。复制没有到下一轮兑现；不存在本批已核替换复制对象后能活的完整后继，不能推出固定禁用夜魇或新终局权重。
5. 9Z F48T10：Jev29984答plan1，原题预计50挡/损2。281568只先偏折+，288000实18挡且其余牌面倍率已撤；281569改为code least-loss喝熔炉，rationale预测剩−9，不能把后续当原Jev计划整线未经重算执行。288001—288004熔炉后偏折9/防御10，挡18→27→37；两张凋萎各12加攻击28共52，288005实18→3，敌198→112；288006T11仍3HP。原题预测不是收益；现已有一次性倍率窄实现，缺原dirty模型重建与当前入口同条件失配复现，不新增策略。
6. XTS F48T8接续（无Jev题）：280547 code/lethal直接end_turn；286893为32血/0挡/5能量、有凋萎9及可打挡牌；286894胜后23，286895 MAP23，286896 F49实入23。该次胜战血价与后战资源接续已核，当前已有毒胜继续找保血候选的live窄实现。未重建该宽项全部弃牌/接管/终局组合，不整项结案。

原Jev题面包含旧potion_experience的A8/A9历史统计，属于历史请求实际发出的文字。未核其角色/来源，不计Silent知识、证据或分母；未读或搬用其他角色知识库。题面其他局号与经验文本不建立本批所属局。

## 跨幕资源与既有源码

act-transitions.json逐原帧保存十局16对F17→18/F33→34，最大HP前后不变；全部满足实回floor(当时缺失HP×80%)。其中9Z为24/70→60/70、23/77→66/77。16对不是16独立局，不外推其他进阶/未观察交互；端点吻合不证明路线收益、休息替线、持药价值或原116局消费者联合校准完成。没有把SL恢复当真实回复或药水新获得；本轮不重新计算原115/116全史统计。

source-audit.json冻结只读实际live=4528a751f17e341a97e7ff70295ec9fba0c947e9；本树与live的card-model/combat-plan/turn-solver/rollout-live/sl-explore五叶逐SHA同字节。五个窄源码提交均实际live祖先：

- 96f17377a331e50ea5b6a3fe8d2b605932ed1bd4：已观察一层幽灵。
- bf423c173d3be348a4ad714e1d26516df619ff41：普通生存者强制弃牌与绷带解耦。
- 222445a9bb6bf56cb4f3ceea2cc8b20fba54128f：毒胜前保血候选。
- 19e41a26648542b7ad0bce4e70b55f30be532d49：士兵牌挡倍率一次消费。
- d65609ff2bc98ec5ec2e06b558159aba89d93032：幻影首刀伤害。

这些是已有代码出处，不是本批新实现/合入；也不能由相同源码或旧测试回执宣称本批当前测试通过、每个组合已验收或宽父完成。没有新发现的可复现遗漏需要改生产源码，不以缺胜率为由拒绝所有诊断工作。

## 逐项处置与交付

|提案|原账本|本批处置|
|---|---|---|
|silent-proposal-03754e1265894000|silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253|waiting：RC F23T3完整两题与25挡/零损已核；F17、F29、F33其余毒雾/幻影/脆弱窗口及八组件生产联合回放未齐，不能由该局部窗口关闭整项。|
|silent-proposal-ab055ef7dfbb44e5|silent-0140,silent-0069,silent-0005,silent-0206|waiting：XTS F49T1一层无实体已由live祖先96f17377a331e50ea5b6a3fe8d2b605932ed1bd4实现；T4复制防御标记后当轮死亡已核，缺其他复制对象与延后饮用的同条件完整后继，宽提案仍等待。|
|silent-proposal-0129c465c6f5bd79|silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271|waiting：BTS F31T2强制弃唯一后继已核；普通单弃bf423c173d3be348a4ad714e1d26516df619ff41、毒胜保血222445a9bb6bf56cb4f3ceea2cc8b20fba54128f均为live祖先；抽弃绑定、耳环接管中间动作及复制后继未联合验收。|
|silent-proposal-abe9d5d0be109a9f|silent-0019,silent-0020|waiting：XTS F48T8胜后32→23且23入F49已核；缺原115局资源表与路线/休息消费者联合校准及受控干预后继，不新拟合血线或药价。|
|silent-proposal-f16527e59b5cc1e0|silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241|waiting：BTS镣铐16→7、石虫下轮眩晕且整轮损14，XTS幽灵/钳子窗口已核；其余期限、常驻能力分源及多增益组合未完整生产回放，不扩展整体公式。|
|silent-proposal-7a8e9ccb7e646538|silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221|waiting：9Z F48T10原题50挡，首张后least-loss重规划，实37挡/损15；一次性倍率已有live祖先19e41a26648542b7ad0bce4e70b55f30be532d49。缺原dirty输入、逐击事件与当前模型失配复现，不能把历史题面差额直接当当前bug。|
|silent-proposal-cd9f76184de6e29a|silent-0019,silent-0020,silent-0243|waiting：十局A9/A10十六对跨幕端点符合既有80%缺血回复观察；缺原116局资源消费者联合校准及同条件路线干预收益对照，不将端点吻合当路线价值验证。|
|silent-proposal-292f6731bdb9b669|silent-0087,silent-0020|waiting：原支持局7X0W3U8TVA2A不在本批；本轮未扩提其F31原始窗口，不能用本批其他药水/毒窗口代证头骨组合7毒、持有价或饮药时点。|
|silent-proposal-0802f69b28d25079|silent-0079,silent-0019,silent-0044,silent-0080,silent-0253,silent-0011,silent-0214,silent-0189,silent-0046,silent-0222,silent-0243,silent-0262|waiting：原支持局MTQ0EUBJ3R6T不在本批；四次SL完整固定输入及独立A10留出验证未补齐，不用9Z类似全败模型替代原同盘血价证据。|
|silent-proposal-763a4b9d9f17b815|silent-0005,silent-0006,silent-0011,silent-0013,silent-0044,silent-0046,silent-0053,silent-0080,silent-0087,silent-0189,silent-0214,silent-0222,silent-0235,silent-0253|waiting：原支持局7X0W3U8TVA2A、MTQ0EUBJ3R6T均不在本批；十四组件、昏眩合法窗口及生产联合回放未齐，本批RC/XTS/BTS不能代替这两个原局。|


原提案恢复：三份原路径仍存在，七份从既有record-staging的original-bounded-reports.tar.gz.unpacked保留材料精确读取；原exp工作树已不存在。十份均匹配原proposal_sha256，详proposal-readback.json。未修改原文、根请求、旧done状态或专用队列；原支持局不在本批的三项仍保留其原证据身份。

新增silent-0540只经根learner/ledger.py add登记、show --json实际读回，status=proposed、by=learner:strategy-proposal。它是本批核验元记录，沿用十个原CLI代码提案id与原ledger链接；没有新游戏规则、经验条目或重复代码提案。原账本shipped状态未降级、不新标shipped、不关闭父要求或代ops/watcher/Roy确认。

无源码/正式知识改动，未运行撤源码红绿、tsc/vitest/cases和提交前gitleaks，不填0。没有commit、merge、eval版本或实际上线双通知；工作树保持干净、HEAD保持base，source.diff.patch为空。仅scratch分析脚本/报告及授权根账本有写入。没有源码可回退；旧实现、失败日志和证据均保留。

过程限制原样保留：一次schema探查对非战斗combat=None列keys报TypeError，随后用实际combat窗口核combat.hand；两次Jev全索引校验初稿分别错误假定每条decision有decision_id、每条显式run请求必有decision，报KeyError，修正后明确保存5个缺决策请求而非补链。均为scratch分析假设错误，无生产修改或日志改写。部分工具输出被展示预算裁切，关键六题完整原请求均在独立调用内完整读到；被裁切的后继窗口另以紧凑原字段补读。全文覆盖只认六题，不升称所有错误题面已读。

交运维：本目录proposal.md、report.md、result.json；两份manifest、逐题coverage、原提案SHA、原始问题/决策/状态及live祖先审计均已保存。各waiting缺口见表；后续原调度器按新证据重派。本批未发送外部消息，未将通知排队当已送达。
