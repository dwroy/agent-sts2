# 静默敏捷、毒与痊愈药水已见药效和实际结算核验

角色silent；新证据A10，历史支持进阶见historical-mechanism-summary.json。其他角色及未观察交互保持等价。
来源任务experience-update；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
当前运行源码记录049dff24+dirty，完整dirty树未取得；先核当前live实现和三项既有postmortem提案90a4a4981be3c760/2a6df9ebca080b2d/16f7cf00059df9a0去重，不因经验文字变化推断源码错误。
原帧505条、原始字节偏移、决策/药水/SL/计划子集及逐房抽取都留本scratch。支持/反例语义沿经验条目，动作/持有不自动扩支持；失败不是机制反例。
账本：silent-0276,silent-0278,silent-0240；经验：silent-dexterity-potion-card-block,silent-poison-potion-observed-application,silent-cure-all-energy-draw

## 旧记录和新证据
- silent-dexterity-potion-card-block：旧：敏捷药实饮建2敏捷，已有挡不补。机制：后续牌挡加敏后核脆弱，换战撤；步法/口红/吸取另分源。搭配：多挡重复收益，不定喝留门槛。决定胜负的战斗：56支持/0反例，单药整战胜因未控（n=56）。典型案例：QHK1XQ928TTM族母饮后仍被吸取；CNKR125PFHJ5 A10 F23T2实饮2敏、T3口红到3、普通步法到5、T4升级步法到8，来源不混；最后赢战38→2，不等药必保整战。 新：敏捷药实饮建2敏捷，已有挡不补。机制：后续牌挡加敏后核脆弱，换战撤；步法/口红/吸取另分源。搭配：多挡重复收益，不定喝留门槛。决定胜负的战斗：57支持/0反例，单药整战胜因未控（n=57）。典型案例：QHK1XQ928TTM族母饮后仍被吸取；Z91JN3S3PQX2 A10 F12T1实饮2敏，后续牌挡加2、已有挡不补，能力药另生成并实打余像、每牌1挡另计；后战需重建，不能当常驻全局敏捷。；支持57/反例0，证据局C48LLXBGKXQ9,1HC609GTLGN3,R0HEV5E3QT6G,KAY522KT5NXR,CSBR5CRDWQNB,F9PP859XZ3RJ,9YBKCNBFP0X5,1LMBFGSMCWKU,ZE8F192FKX24,75X1BARMNZ03,8CFMW9SAGFWQ,2L1BNN9ZJEFU,53FLQ68CETW0,ENKYQMS9W4ZD,Z6CFLDR3N4SB,VLV17NUSFS61,2PVLGRBGUX9S,HMVJKM56S4Q8,PJ2LL9KU7FHD,0NZXA12NLDMH,PU80F84P6HPN,L704TLETMZBM,KUZVERN40NGK,ZVYUL2YP3518,VPW8YH7A4QFM,HUVEPWQAHWFU,UMVLWER4CD98,TKXQ6L4N9A6U,2Y27VAYZDA02,W7BHM8U02RKG,01H1533KSS5C,5PM6JAQG6FNQ,KV0JHNJCKXLS,TXZ6RVMQA09D,WQZVENQ7DTRP,1913SE84AXQF,Q6M2Y34MWKRE,NHA2KW0RB7VP,RC61MFQM63Y6,BTSRF7JL1W1Y,XTSV1U9JD34T,9Z9H2EXKLF3T,MTQ0EUBJ3R6T,KFRDELW2TH2P,PD9AYQVMLQW6,L2TSFU62Z57Z,K2JAGKVJAWZJ,NEWRFAYKTQHR,9R916WW0V65N,T0DGVABPV60U,H1T1F8ML9FUE,AD3QSC3P41JU,BJLTVSYXCSGS,Y5H4CFAQ2WTG,QHK1XQ928TTM,CNKR125PFHJ5,Z91JN3S3PQX2；反例局；账本silent-0276。
- silent-poison-potion-observed-application：旧：毒药先加毒，饮用当步不扣本体HP。机制：36局144饮，常态127饮加6、头骨15饮加7、制品2饮阻毒耗1层；组合外不推。搭配：须活到实结，持牌伤/自损先核，不定喝留门槛。决定胜负的战斗：36支持/0反例，单药整战未控（n=36）。典型案例：79UCJ0K6R9C1先自死未结毒；PF90JTU0UZ5M A10同瓶五饮均加6、饮用不扣HP，末异螨3→9毒、25血不变，结束扣9至16仍死；五饮含SL撤回，不是五瓶新奖励。 新：毒药先加毒，饮用当步不扣本体HP。机制：37局145饮，常态128饮加6、头骨15饮加7、制品2饮阻毒耗1层；组合外不推。搭配：须活到实结，当前挡与截止另核，不定喝留门槛。决定胜负的战斗：37支持/0反例，单药整战未控（n=37）。典型案例：79UCJ0K6R9C1先自死未结毒；Z91JN3S3PQX2 A10沙虫T12实饮毒0→6、当步不扣血，随后实结6＋5合11，T13敌仍45、沙坑归零；无早喝的受控整战胜果。；支持37/反例0，证据局10GPK5XGHCK3,ARKQLHG6RS4W,2SU6XN2AEJRD,Z6CFLDR3N4SB,VLV17NUSFS61,HMVJKM56S4Q8,25226ZFLNR1J,JMH5C51RLN4E,9TG1RP5LFAAK,JQPT83P8KDSZ,L9SGRBB5R698,4ANT8D00TP72,5X2GHKJ89PN1,BVF22RSFVBS9,ZVYUL2YP3518,TU3XB4CAEDAW,QNTW139MGECA,87LCSDR5P3DL,KQQELQSZ382Z,7ZUC4VPMDS41,2Y27VAYZDA02,TDLBRNA0R05B,2K4H3JEJHRSB,61E2QS63Y9WU,YF0LXT1QSTGG,YQL8RZ8BWN1E,XTSV1U9JD34T,7X0W3U8TVA2A,KFRDELW2TH2P,GXNKW8X1XYJP,K2JAGKVJAWZJ,79UCJ0K6R9C1,T0DGVABPV60U,4XLZURXMD872,QHK1XQ928TTM,PF90JTU0UZ5M,Z91JN3S3PQX2；反例局；账本silent-0278。
- silent-cure-all-energy-draw：旧：痊愈药水在已见饮用后加1能量并抽2牌，HP不变，不能按名字计回血。机制：8局14次实用均能量+1、手牌数+2、HP增量0；含SL但支持按局去重，未见满手等边界不外推。搭配：实际抽入牌与当前费用/弃牌重新核，局部候选改善不当整场胜率，不定喝药时机。决定胜负的战斗：8支持/0反例，独立用药胜因未控（n=8）。典型案例：VLZ6CCT8AQ0A A10 F45 T1为67血不变、1→2能量、手1→3，随后生存者弃神化、末战仍败；T082DRCUHRRD A0 F6 T1为64血不变、3→4能量、手7→9。 新：痊愈药水在已见饮用后加1能量并抽2牌，HP不变，不能按名字计回血。机制：9局15次实用均能量+1、手牌数+2、HP增量0；含SL但支持按局去重，未见满手等边界不外推。搭配：实际抽入牌与当前费用/弃牌重新核，局部候选改善不当整场胜率，不定喝药时机。决定胜负的战斗：9支持/0反例，独立用药胜因未控（n=9）。典型案例：VLZ6CCT8AQ0A实饮加能换手，不是回复；Z91JN3S3PQX2 A10 F28T1痊愈实饮加1能抽2、HP不变并重算选线；消亡粉末/抱抱/滚石同时在战，不把整战胜或净清70全归这瓶，不定时点。；支持9/反例0，证据局T082DRCUHRRD,10GPK5XGHCK3,VN7RQJMJEFMX,VLV17NUSFS61,UMVLWER4CD98,P5HT1272P5SB,YLYLZWHA0GKU,VLZ6CCT8AQ0A,Z91JN3S3PQX2；反例局；账本silent-0240。

## 证据、旧规则、新行为与限制
Z91JN3S3PQX2 A10 F12T1敏捷药实加2敏、已有挡不补；能力药生成余像后确实打出。F28T1痊愈加1能抽2、HP不变，按实际新手重算，不把消亡粉末与自动伤混算药伤。F33T12毒药实饮0→6毒、当步敌HP不变，末T12结6/T13结5合11，最后敌45，没到T14；F33T3格挡药14→26另+12，供旧复盘提案复核。
取得9瓶药和1药水形状石头，use_potion实际10次、弃置0/SL恢复0；石头由石化蟾蜍补槽并投出，不叫弃药。
旧规则：已有效果模型或未知描述不能代表真实新药池，现行喝/留阈值没有本局受控验证。
新行为：核敏捷/毒/痊愈药效是否与本角色历史及新帧一致，正确保持，偏差才改；生成牌须实际打出才计能力。无早喝毒/留消亡粉末的同盘整战胜负，不拟新饮药价值或购买优先级，不补未知药池。

## 样本切分、验证、预期影响及回退
历史146静默局截至2026-10-08T14:33:59.374Z用于复算/兼容核验；本局截至15:04:43.085Z为较晚发现样本，后续本角色完局才算独立时间留出。SL同房不独立计局；不跨角色、不用预训练/游戏二进制补事实。未拟合血线、药价、终局/探索参数。
固定日志s306993—307494、d299919/299945护栏、F33T13及所有历史兼容帧自测，原test-sandbox入口和预算不变。预期改善模型/判死与资源展示的可追溯性，不保证转胜。回退独立源码commit至其父版，保留经验/账本/原始失败记录；实际源码live祖先才登记implemented。
本任务只登记pending，不改打法源码，不称implemented/shipped；实现者证据不足明确waiting原因。实际上线先date并双通知Roy，其他角色保持等价。
