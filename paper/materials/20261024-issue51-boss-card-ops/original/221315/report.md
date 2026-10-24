# 单牌第3单元：固定20卡候选报告

生成时间：2026-10-24T22:28:16+08:00

固定20卡完成逐项处置，形成7个新情境、3个同ID更新，knowledge/文字策略/rk各10个描述性候选；统计比较均未达每组100独立样本，正式发布、生产读回、自然采用与收益均为0。

本报告只交 scratch 候选，不是完整流派剧本，也不是正式效果发布。processed 仅表示候选已落盘。三份更新保留旧ID和旧证据，不把旧内容计为新增；正式发布、生产工具读回、自然查询、实际采用/收益与 #51 科学父均未完成。

## 冻结身份与范围

- learn.json 本批 external_source、external_binding、work_spec 与 HEAD 均一致；HEAD 保持 dispatch_base。
- manifest SHA：`9ec61e3afd7010fcd0c12c61b4e1c49f825bcdf67f3d5d28bf9da24438152e5e`；work_spec SHA：`db37b2f16b9a2e02a1b144bec202b8643a196db5acb885844234de2f4d16f5cd`。
- #54 三manifest和129数据叶共132件全部大小/SHA核同；自有11个冻结parquet同样核同。共158个去重输入核验见 `scratch/input-verification.json`。
- 仅units[1]；与units[0]、211311的20卡及固定exclude表不交叉。旧090927的排除依据沿冻结selection表，未重新学习其产物。
- 自有查询先过滤506名单，DuckDB内存数据库、threads=2、显式分片名单和原切点；排除Z2、KF9、BP9及后续局。未读外部原库或玩家标识，未下载、未同步logdb、未复制完整状态流。
- 最新STATE仍含历史停点；本任务以冻结work_spec与本批登记为授权，不据历史摘要改变生产状态。
- 模型/effort/tier仅有启动请求信息，本次未独立核原生回执，实际档位不作已生效声明；未调整账号、配置、权限或派发新模型。

## 计数与读取覆盖

- 7新情境 + 3同ID更新 = 10；逐字节复用0、别名0。三个渠道各10候选，共30个对象，不计为30个情境。
- 每组100独立样本的比较：0。不是把取得牌次当局数凑门槛；20卡都保留统计行，数字效果比较跳过，描述性牌文/备选候选继续交付。
- 自有506局均有奖励记录：6,861条记录，6,798条有可解析criteria、63条缺criteria。63条不当作未提供目标牌，也不算拒选；目标卡族可识别1,822条。原始决策唯一字节窗合计637,467,565字节；每条offset/bytes/SHA在`raw-read-ledger.json`。
- 汇总的选择来自记录的chosen动作，未逐条重建6,861次dispatch。候选所引32个唯一决策、21个独立局另核原result均completed；32个先前frame均按原切点seek并哈希。
- all/retry/act统计只作描述；独立选择比较按每局首次出现该卡族去重，并分别列进阶/重试证据/版本unknown。卡族汇总包含升级版本仅供覆盖计数；原升级名和牌文不丢，`variant-coverage.json`另分升级曝光。正文引用基础牌文；rk新增分支限定card.upgraded=false。
- 实际模型读取：逐卡通读20张基础牌文、32条样例的真实备选/选择摘要及10条最终候选正文；部分先前牌组投影抽核。未逐字通读全部原始JSON、其余1790条目标决策、外部代表完整时间线或自有整局四section，不声称完整剧本。
- 外部代表完整时间线读取0；本批没有借赢家代表补机制。自有整局四section读取0；不声称整局剧本或完整回放。

## 20张牌逐项处置

以下为自有A10可识别卡族的记录奖励机会；独立局为该卡出现局并集，不与其他卡相加。拿/其他是记录动作；不是因果样本。每张的全部进阶/幕/重试细分及首次机会独立分母见`summary.json`。

| 卡ID | 全进阶机会 | A10机会 | A10独立局 | 拿/其他机会 | 处置 |
|---|---:|---:|---:|---:|---|
| PINPOINT | 195 | 174 | 147 | 9/165 | 新增描述候选；效果比较跳过 |
| TRACKING | 90 | 77 | 69 | 6/71 | 新增描述候选；效果比较跳过 |
| ANTICIPATE | 551 | 502 | 309 | 63/439 | 新增描述候选；效果比较跳过 |
| NIGHTMARE | 92 | 82 | 75 | 14/68 | 新增描述候选；效果比较跳过 |
| SPEEDSTER | 216 | 193 | 146 | 2/191 | 新增描述候选；效果比较跳过 |
| STRANGLE | 205 | 185 | 150 | 20/165 | 新增描述候选；效果比较跳过 |
| PANACHE | 1 | 1 | 1 | 1/0 | 新增描述候选；效果比较跳过 |
| STORM_OF_STEEL | 78 | 67 | 62 | 3/64 | 同ID更新；效果比较跳过 |
| MASTER_PLANNER | 101 | 93 | 88 | 20/73 | 同ID更新；效果比较跳过 |
| MURDER | 76 | 63 | 61 | 0/63 | 新增描述候选；效果比较跳过 |
| SHADOW_STEP | 79 | 64 | 62 | 2/62 | 新增描述候选；效果比较跳过 |
| ULTIMATE_DEFEND | 1 | 1 | 1 | 1/0 | 新增描述候选；效果比较跳过 |
| CORROSIVE_WAVE | 89 | 79 | 76 | 4/75 | 新增描述候选；效果比较跳过 |
| MEMENTO_MORI | 187 | 163 | 140 | 30/133 | 同ID更新；效果比较跳过 |
| GRAND_FINALE | 91 | 80 | 75 | 8/72 | 新增描述候选；效果比较跳过 |
| SHRUG_IT_OFF | 7 | 7 | 7 | 7/0 | 新增描述候选；效果比较跳过 |
| ARMAMENTS | 5 | 5 | 5 | 2/3 | 同ID更新；效果比较跳过 |
| UNMOVABLE | 3 | 2 | 2 | 2/0 | 新增描述候选；效果比较跳过 |
| HEADBUTT | 10 | 9 | 9 | 3/6 | 同ID更新；效果比较跳过 |
| BATTLE_TRANCE | 3 | 2 | 2 | 2/0 | 同ID更新；效果比较跳过 |

PANACHE、ULTIMATE_DEFEND、SHRUG_IT_OFF、UNMOVABLE、BATTLE_TRANCE没有A10拒选样例；MURDER没有A10实选样例。这里保留真实单侧观察，不伪造另一臂。ARMAMENTS与HEADBUTT的基础牌、升级牌文不同，正文和引用按基础版本，不把升级文本替换成基础效果。

## 情境、幅度、样本与去向

### silent-b003-skill-count-price

奖励出现精密瞄准时，按原文3费15伤、每已打1张技能减1费，比较当前牌组能提供的技能与同屏杂技、咕嘟冒泡或跳过；牌组有技能不等于战斗当回合已经打出技能，不预支减费。
本批样本：2个已完成的记录选择/2个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-skill-count-price`；rk=`silent-rk-b003-skill-count-price`；三个渠道formal_publication/consumer_readback均pending。
- PINPOINT：0NZXA12NLDMH F4，retry_or_predicted_death，先前HP代理39/70、牌组15张；备选[杂技 / 精密瞄准 / 咕嘟冒泡 / skip]，记录选择精密瞄准，最终败（只作结果）；decision off=591635229 bytes=9145 SHA=e4ed6fc8202c22803d9663ac529127977891394e169d7c78d22cf9891aa7ae3f。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- PINPOINT：25226ZFLNR1J F12，retry_or_predicted_death，先前HP代理35/70、牌组19张；备选[早有准备 / 精密瞄准 / 斗篷与匕首 / skip]，记录选择斗篷与匕首，最终败（只作结果）；decision off=561069037 bytes=6817 SHA=b5541667ab241f9680cd93ec1f0a68918ddbe800ec0dfa2cab8910e59406fec9。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b003-weak-target-amplification

奖励出现跟踪时，原文2费、处于虚弱的敌人受攻击伤害增加50%；先核当前已持的施加虚弱来源、攻击用途与启动费用，再与夜魇、华丽收场或跳过比较。未证实目标有虚弱时，不把50%加成预算进攻击伤害。
本批样本：2个已完成的记录选择/2个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-weak-target-amplification`；rk=`silent-rk-b003-weak-target-amplification`；三个渠道formal_publication/consumer_readback均pending。
- TRACKING：MCT1GPTL8D35 F17，retry_or_predicted_death，先前HP代理28/70、牌组21张；备选[跟踪 / 夜魇 / 华丽收场 / skip]，记录选择跟踪，最终败（只作结果）；decision off=664987309 bytes=4657 SHA=fb13b5858aa34ff7e9870ca7af953d818eb434633d1b5eda62e561a4554d8d66。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- TRACKING：0NZXA12NLDMH F17，retry_or_predicted_death，先前HP代理3/70、牌组21张；备选[暗影步 / 跟踪 / 钢铁风暴 / skip]，记录选择钢铁风暴，最终败（只作结果）；decision off=592270051 bytes=4202 SHA=ddec0d90db6fefb89ad0568260a48404942c2a85160ba1adee07dbdb0fd47191。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b003-card-count-trigger

奖励出现紧勒或神气制胜时，分开比较触发对象和门槛：紧勒1费8伤，本回合每出1牌使该敌人失2HP；神气制胜0费，每回合出五牌才全体10伤。按现有牌组核后续出牌能力，和真实备选/跳过比较，不把持有牌数当已出牌数。
本批样本：3个已完成的记录选择/3个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-card-count-trigger`；rk=`silent-rk-b003-card-count-trigger`；三个渠道formal_publication/consumer_readback均pending。
- STRANGLE：UJ0K3G10609Y F37，retry_or_predicted_death，先前HP代理27/86、牌组31张；备选[独门技术 / 战术大师+ / 紧勒 / skip]，记录选择紧勒，最终败（只作结果）；decision off=585427993 bytes=9509 SHA=49d85e998762c17fb48d78ee81919cdd7812599fd03a8952edfdc84339a9a7f9。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- STRANGLE：JMH5C51RLN4E F19，retry_or_predicted_death，先前HP代理43/70、牌组21张；备选[紧勒 / 早有准备 / 蛇咬 / skip]，记录选择skip，最终败（只作结果）；decision off=566903877 bytes=7565 SHA=f62ba5f5ea95cc10cc5a57166f820414054765dc77f9f2206db4a64a5dc23ff8。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- PANACHE：L6745E2ND5CT F45，retry_or_predicted_death，先前HP代理49/81、牌组53张；备选[炸弹 / 偏折 / 神气制胜 / skip]，记录选择神气制胜，最终败（只作结果）；decision off=1053866132 bytes=7002 SHA=141c08ec019dd828df9b28ef3178317bb507a8559684453376dbf5c82c494524。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b003-defense-activation

奖励遇预判、究极防御、耸肩无视或坚定不移时，区分0费仅本回合2敏捷、1费11挡、1费8挡抽1、2费建立后每回合第一次卡牌格挡翻倍。按现有格挡牌、费用和抽牌用途比较备选；敏捷与翻倍均不能当无条件即时格挡，未实核关键词/顺序不补数。
本批样本：5个已完成的记录选择/5个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-defense-activation`；rk=`silent-rk-b003-defense-activation`；三个渠道formal_publication/consumer_readback均pending。
- ANTICIPATE：MCCK2602T1SR F5，no_retry_evidence，先前HP代理49/61、牌组15张；备选[触不可及 / 预判 / 连续反弹 / skip]，记录选择预判，最终败（只作结果）；decision off=583283944 bytes=9452 SHA=91fcdf1f49ccd1939554c9ba1c5fdd94411ea3aff9f9a433459f1e88879e5f94。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- ANTICIPATE：25226ZFLNR1J F29，retry_or_predicted_death，先前HP代理44/70、牌组27张；备选[刀刃之舞 / 猎杀者 / 预判 / skip]，记录选择skip，最终败（只作结果）；decision off=561806381 bytes=6781 SHA=498b8fc3c173eb355c647c50476ace3efd01364037800d6f162a54f9cb71b189。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- ULTIMATE_DEFEND：L6745E2ND5CT F37，retry_or_predicted_death，先前HP代理1/77、牌组38张；备选[究极防御 / 猎杀者+ / 致命毒药 / skip]，记录选择究极防御，最终败（只作结果）；decision off=1052669757 bytes=95022 SHA=5d4b05291a87e5f7e484e13eb68547fdfec2a212f095ed2f7e859752403a4839。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- SHRUG_IT_OFF：JMH5C51RLN4E F22，retry_or_predicted_death，先前HP代理26/70、牌组24张；备选[耸肩无视 / 余烬 / 全身撞击 / skip]，记录选择耸肩无视，最终败（只作结果）；decision off=567108309 bytes=6773 SHA=a11a77763b880bea710a7dc98754bba72e55a93cd369fb23f702efc199b75abf。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- UNMOVABLE：P2M3DFJ4DEZ3 F29，retry_or_predicted_death，先前HP代理39/70、牌组27张；备选[烙印 / 焚烧 / 坚定不移 / skip]，记录选择坚定不移，最终败（只作结果）；decision off=797379659 bytes=7351 SHA=fb43ab29b62b88578e5434e3bba9bf581f23285fd463f6c5cadc0f6240f1324b。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b003-next-turn-copy-or-attack

奖励出现夜魇或暗影步时，分开核延迟回报和当前代价：夜魇3费消耗、下回合加所选牌3复制品；暗影步1费弃全手、下回合攻击翻倍。现有牌组只给潜在目标，不证明未来手牌；与融入暗影、萎靡、必备工具等本题备选和跳过比较，不预支复制或倍伤。
本批样本：4个已完成的记录选择/4个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-next-turn-copy-or-attack`；rk=`silent-rk-b003-next-turn-copy-or-attack`；三个渠道formal_publication/consumer_readback均pending。
- NIGHTMARE：9TG1RP5LFAAK F33，retry_or_predicted_death，先前HP代理28/70、牌组28张；备选[刀刃陷阱 / 夜魇 / 华丽收场 / skip]，记录选择夜魇，最终败（只作结果）；decision off=571283175 bytes=4133 SHA=eb73ae3f275e7b3f99cdc0a4ae3cac5e6617125ab87dcae680dcbfc8ba42cbb5。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- NIGHTMARE：JMH5C51RLN4E F33，retry_or_predicted_death，先前HP代理49/70、牌组28张；备选[夜魇 / 融入暗影 / 腐蚀波 / skip]，记录选择融入暗影，最终败（只作结果）；decision off=568149539 bytes=3983 SHA=a4ab6ba3c55e498b713eec3efb8527662013a6f8ce4bb591a74f517201834a76。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- SHADOW_STEP：L704TLETMZBM F44，retry_or_predicted_death，先前HP代理9/76、牌组38张；备选[暗影步 / 萎靡 / 爆发 / skip]，记录选择暗影步，最终败（只作结果）；decision off=614124133 bytes=8447 SHA=07118c326bfd14d08fd874390a4f71833e120ef66c6f6e00c0ebd6605cc74ff8。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- SHADOW_STEP：25226ZFLNR1J F17，retry_or_predicted_death，先前HP代理22/70、牌组22张；备选[暗影步 / 必备工具 / 计划妥当 / skip]，记录选择必备工具，最终败（只作结果）；decision off=561344409 bytes=3941 SHA=b1eacfe807b025965ca4cfe741ea2c9d83c2c9579f658008da69da27bf385738。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b003-draw-event-window

奖励出现速行者或腐蚀波时，按现有抽牌来源比较触发时窗：速行者2费建立后，回合进行中每抽1牌全体2伤；腐蚀波1费，打出后仅本回合每抽1牌全体2毒。与同屏即时牌、跟踪或跳过比较，不把回合初抽牌或尚未发生的抽牌算已兑现；附加重放须另核。
本批样本：4个已完成的记录选择/4个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-draw-event-window`；rk=`silent-rk-b003-draw-event-window`；三个渠道formal_publication/consumer_readback均pending。
- SPEEDSTER：E5L15SK6ZHZB F35，retry_or_predicted_death，先前HP代理43/76、牌组33张；备选[投掷匕首 / 刀刃之舞 / 速行者 / skip]，记录选择速行者，最终败（只作结果）；decision off=1282408149 bytes=36787 SHA=065321d9db069c0b6bac45f59bce148bba4803d63f9f00fed2fb2ea033254fbb。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- SPEEDSTER：MGA0CZDDKC0P F13，retry_or_predicted_death，先前HP代理10/70、牌组23张；备选[致命毒药 / 侧步 / 速行者 / skip]，记录选择致命毒药，最终败（只作结果）；decision off=560015250 bytes=8641 SHA=7d72519aa02e3b3bf1db5fd1f088afb16989794b62f9c71d9c1c5915a782f4aa。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- CORROSIVE_WAVE：D4LJ9QMGFB8Q F17，retry_or_predicted_death，先前HP代理19/76、牌组22张；备选[钢铁风暴 / 腐蚀波 / 华丽收场 / skip]，记录选择腐蚀波，最终败（只作结果）；decision off=591127411 bytes=4680 SHA=abc51c18c3ed80748bba64545aee0bdd58f88ca3a435d204b673cbf9f894efe7。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- CORROSIVE_WAVE：JMH5C51RLN4E F17，retry_or_predicted_death，先前HP代理46/70、牌组20张；备选[腐蚀波 / 融入暗影 / 计划妥当 / skip]，记录选择计划妥当，最终败（只作结果）；decision off=566770265 bytes=4044 SHA=ef8792de8100fa700209d89fea2c03273cace902124eff653a6eacd625a92968。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b003-draw-count-versus-empty-pile

奖励比较谋杀或华丽收场时，分开核本战累计抽牌与抽牌堆为空：谋杀3费1基础伤、每已抽1牌加1伤；华丽收场0费全体60伤但空抽牌堆才能打。奖励时的牌组大小不能代战斗牌堆状态；和腐蚀波、夜魇或跳过比较，不预支累计或可打性。
本批样本：3个已完成的记录选择/3个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：new-candidate；strategy=`silent-brain-b003-draw-count-versus-empty-pile`；rk=`silent-rk-b003-draw-count-versus-empty-pile`；三个渠道formal_publication/consumer_readback均pending。
- MURDER：JQPT83P8KDSZ F17，retry_or_predicted_death，先前HP代理1/70、牌组20张；备选[华丽收场 / 腐蚀波 / 谋杀 / skip]，记录选择skip，最终败（只作结果）；decision off=574242644 bytes=4207 SHA=e31e46cd58460cc5974e5ee88da3942f4de3a1cd1a9138a96738b295c3106b3e。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- GRAND_FINALE：VPW8YH7A4QFM F25，no_retry_evidence，先前HP代理31/80、牌组32张；备选[铭记死亡 / 残影+ / 华丽收场 / skip]，记录选择华丽收场，最终败（只作结果）；decision off=624137478 bytes=9010 SHA=6333558b15611724e6d744cf12f1dff0ff5369eb58d32a80224759798f0eaf30。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- GRAND_FINALE：9TG1RP5LFAAK F33，retry_or_predicted_death，先前HP代理28/70、牌组28张；备选[刀刃陷阱 / 夜魇 / 华丽收场 / skip]，记录选择夜魇，最终败（只作结果）；decision off=571283175 bytes=4133 SHA=eb73ae3f275e7b3f99cdc0a4ae3cac5e6617125ab87dcae680dcbfc8ba42cbb5。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-lane-b-discard-payload

奖励出现隐秘匕首、计算下注、钢铁风暴或铭记死亡时，分别核弃2加2刀、弃全手等量抽且消耗、1费弃全手每弃1加1刀、1费9伤且本回合每已弃1牌加4伤。把保留手牌的机会代价和真实备选/跳过一起比较，不能把生成刀当已出刀、未来弃牌当已弃牌。
本批样本：4个已完成的记录选择/3个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：same-id-update；strategy=`silent-brain-lane-b-discard-payload`；rk=`silent-rk-lane-b-discard-payload`；三个渠道formal_publication/consumer_readback均pending。
- STORM_OF_STEEL：0NZXA12NLDMH F17，retry_or_predicted_death，先前HP代理3/70、牌组21张；备选[暗影步 / 跟踪 / 钢铁风暴 / skip]，记录选择钢铁风暴，最终败（只作结果）；decision off=592270051 bytes=4202 SHA=ddec0d90db6fefb89ad0568260a48404942c2a85160ba1adee07dbdb0fd47191。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- STORM_OF_STEEL：25226ZFLNR1J F33，retry_or_predicted_death，先前HP代理1/70、牌组28张；备选[计划妥当 / 群蛇形态 / 钢铁风暴 / skip]，记录选择计划妥当，最终败（只作结果）；decision off=562116320 bytes=3972 SHA=4f009ffcedd5c5a8504f800a6a3aba289c3c2c51680371a32036b3fc8870393a。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- MEMENTO_MORI：MGA0CZDDKC0P F8，retry_or_predicted_death，先前HP代理26/70、牌组19张；备选[尖啸 / 飞镖 / 铭记死亡 / skip]，记录选择铭记死亡，最终败（只作结果）；decision off=559778837 bytes=8596 SHA=350d06ac93a80a151980d52d3900be7fb3089712db52ca22ff22721b3225a7b0。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- MEMENTO_MORI：25226ZFLNR1J F35，retry_or_predicted_death，先前HP代理34/64、牌组29张；备选[铭记死亡 / 迷雾 / 串刺 / skip]，记录选择迷雾，最终败（只作结果）；decision off=562195241 bytes=8849 SHA=433f12d2c0072f21db91cf4b521877572b05324220076f4272f708571194eff2。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b002-explicit-keyword-resource-boundary

奖励遇战术大师、本能反应、手上技法或谋划专家时，仅按已核原文分清得能、抽牌与赋予奇巧，不补奇巧定义。新增谋划专家2费、技能打出后该牌得奇巧；武装1费5挡、升级手中1牌，须另核手中合格目标和升级文本。与实际备选/跳过比较，不能把两种改牌效果视为等价。
本批样本：4个已完成的记录选择/4个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：same-id-update；strategy=`silent-brain-b002-explicit-keyword-resource-boundary`；rk=`silent-rk-b002-explicit-keyword-resource-boundary`；三个渠道formal_publication/consumer_readback均pending。
- MASTER_PLANNER：4ANT8D00TP72 F33，retry_or_predicted_death，先前HP代理6/70、牌组33张；备选[腐蚀波 / 刀刃陷阱 / 谋划专家 / skip]，记录选择谋划专家，最终败（只作结果）；decision off=596055416 bytes=4337 SHA=053fd817b69473e1fbad6d0a57a85ad5f043c6fa79991766d9145a95fb1729fe。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- MASTER_PLANNER：L9SGRBB5R698 F14，retry_or_predicted_death，先前HP代理27/60、牌组18张；备选[速行者 / 谋划专家 / 连续反弹 / skip]，记录选择连续反弹，最终败（只作结果）；decision off=588630986 bytes=9152 SHA=ac38c90676f013b30b24081c2778562f66c39700833ec20f765758934eb96f2d。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- ARMAMENTS：7X58G3LSHZ3U F23，retry_or_predicted_death，先前HP代理24/70、牌组26张；备选[愤怒 / 坚毅 / 武装 / skip]，记录选择武装，最终败（只作结果）；decision off=1998416819 bytes=270903 SHA=6bc71d8d1ea807d042f1cad696eabb21629cae562902fcd28adb21f37f0abc62。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- ARMAMENTS：KYJMB7ELM6FN F22，retry_or_predicted_death，先前HP代理29/70、牌组24张；备选[武装 / 头槌+ / 飞剑回旋镖+ / skip]，记录选择头槌+，最终败（只作结果）；decision off=2928357625 bytes=308549 SHA=3a53d04d625244f78842be7a7f87b259f62d89cf5dc1a85823700b61598fcc06。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

### silent-b002-skill-discount-and-draw-lock

奖励遇猛扑或子弹时间仍分别核下一技能减费与全手减费禁抽；新增战斗专注0费抽3后本回合禁抽，头槌1费9伤并从弃牌堆放1牌到抽牌堆顶。按已有抽牌牌比较顺序和真实备选/跳过；放到堆顶不等于已入手，不能把禁抽后的后续抽牌算兑现。
本批样本：3个已完成的记录选择/3个独立A10局；只支持原牌文/真实备选存在，不证明采取此检查有收益。
适用范围：Silent A10卡奖、正文指定牌出现且现场牌文相同；当前牌组/HP为决策前最近帧代理，版本unknown；不预支未来手牌、触发或胜负。
处置：same-id-update；strategy=`silent-brain-b002-skill-discount-and-draw-lock`；rk=`silent-rk-b002-skill-discount-and-draw-lock`；三个渠道formal_publication/consumer_readback均pending。
- HEADBUTT：8AGEGLG40SV3 F22，no_retry_evidence，先前HP代理25/70、牌组31张；备选[飞剑回旋镖 / 双重打击 / 头槌 / skip]，记录选择头槌，最终败（只作结果）；decision off=1290170701 bytes=35474 SHA=9183b0ab56d0d7b39da3834634fd7d4dadb469b2d3083120df98c50eb305a902。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- HEADBUTT：NB8KCF6HRGVF F23，no_retry_evidence，先前HP代理6/77、牌组19张；备选[闪电霹雳 / 头槌 / 战栗 / skip]，记录选择skip，最终败（只作结果）；decision off=602096179 bytes=8371 SHA=c5bb76bc72dd973e5247819ca42502709cb6105ad014763898d5012f4705ae21。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。
- BATTLE_TRANCE：JMH5C51RLN4E F22，retry_or_predicted_death，先前HP代理26/70、牌组25张；备选[战斗专注 / 欺凌 / 撕裂 / skip]，记录选择战斗专注，最终败（只作结果）；decision off=567116436 bytes=6874 SHA=176f873a8942dabbbaf54ad41872ef3da3ce81b0b10fbb4509c5e32516162104。完整牌组/卡文和frame SHA见`scenario-examples.json`、`prior-frames.json`。

## 去重与旧材料

同场景更新：弃牌代价沿`silent-brain-lane-b-discard-payload`；关键词边界沿`silent-brain-b002-explicit-keyword-resource-boundary`；抽牌限制沿`silent-brain-b002-skill-discount-and-draw-lock`。对应knowledge/rk同ID更新，旧证据保留在候选并单存`prior-entries.json`；旧证据不计本批新读取或新情境。其余7条的具体时窗/对象/门槛没有同场景条目，说明在`deduplication.json`。正式库、旧产物、请求和登记均未修改。

## 外部版本分账

来源统一external:sts2fun；2026-10-21采集，原URL及数据库SHA见source-ledger。五组原上传分母分别2932/683/583/411/1739，v0.107含1058+1874两个build、v0.109含451+132、v0.110含12+399；子build原分母与行引用保留。没有机制未改的实际对照，保持未知，不合并为同一推断组。

下表每格为最终赢家中的取得牌次/全部取得牌次，仅为外部方向描述，可能同局重复；不能当拿/不拿，也不把各cell的distinct_uploaded_runs相加为独立局。原cell完整保留在`external-cells.json`；逐build和原行号见`external-descriptive.json`。

| 卡 | v0.107 | v0.108 | v0.109 | v0.110 | v0.111 |
|---|---:|---:|---:|---:|---:|
| PINPOINT | 71/276 | 19/67 | 20/85 | 10/40 | 47/141 |
| TRACKING | 184/344 | 29/65 | 27/44 | 13/30 | 55/134 |
| ANTICIPATE | 65/246 | 22/75 | 21/64 | 17/43 | 46/128 |
| NIGHTMARE | 57/113 | 14/39 | 11/24 | 5/11 | 39/102 |
| SPEEDSTER | 65/202 | 10/45 | 19/50 | 6/25 | 33/96 |
| STRANGLE | 59/219 | 15/52 | 10/33 | 7/30 | 35/90 |
| PANACHE | 50/98 | 11/22 | 10/17 | 8/15 | 34/72 |
| STORM_OF_STEEL | 41/116 | 13/29 | 9/23 | 5/13 | 15/57 |
| MASTER_PLANNER | 38/144 | 2/25 | 5/20 | 6/17 | 16/53 |
| MURDER | 32/100 | 9/21 | 8/18 | 7/16 | 19/53 |
| SHADOW_STEP | 32/121 | 5/30 | 4/21 | 5/6 | 18/51 |
| ULTIMATE_DEFEND | 43/95 | 13/28 | 16/32 | 6/10 | 20/51 |
| CORROSIVE_WAVE | 45/115 | 12/28 | 13/30 | 4/10 | 21/48 |
| MEMENTO_MORI | 17/89 | 3/30 | 12/30 | 9/18 | 11/35 |
| GRAND_FINALE | 4/23 | 4/7 | 2/6 | 4/7 | 5/17 |
| SHRUG_IT_OFF | 12/21 | 3/5 | 1/3 | 5/7 | 5/14 |
| ARMAMENTS | 7/18 | 0/1 | 3/3 | 0/1 | 4/13 |
| UNMOVABLE | 4/12 | 0/2 | 2/2 | 2/3 | 6/13 |
| HEADBUTT | 0/9 | 0/1 | 1/1 | 1/4 | 6/12 |
| BATTLE_TRANCE | 5/9 | 1/2 | 0/0 | 0/0 | 6/11 |

每条策略的external_aggregate只附v0.111取得牌次的终胜比例作为背景，不称它支持游戏机制或拿牌效果；这是与自有文本观察并列的mixed/unassessed，而不是版本对齐。未发现明确牌文冲突；缺实测不能写aligned。旧版本所有原行和低/反向结果均保留。

## 反例、稀疏与当前信息边界

- 铭记死亡：A10每局首次机会，重试/判死层2/23拿牌局终胜，对照1/90，观察差+7.58pp；无重试证据层0/5对2/22，差-9.09pp。符号相反且样本远不足100，不能汇总成拿牌排序或因果增益。
- 预判：A10无重试证据层首机会0/10对2/52；速行者同层拿组0局。多数牌的实选样例最终失败，本报告仍完整保留，没有从赢家选择过滤成正向结论。
- 真实备选可以支持“应核哪个条件”，但不能证明本次选择正确、下一战安全或新规则收益。奖励信息不能给出未来同手卡、抽牌堆空时点、当回合技能数、五牌计数、复制目标兑现或挡伤。
- 最近帧可能在claim_reward之前，属于当前牌组/资源代理；只接受不晚于决策observed_ts的原帧，未把后继终局牌组、簇号或胜负用作触发。
- 依赖全手牌/同回合时序的具体求解、奇巧/重放定义、非基础版升级数值及战斗结算未在本批验证。缺少这些字段不会整批waiting，但对应具体效果条目不发布。
- 未提供可用的跨版本机制变更对照；本系统游戏版本仍unknown。外部本批无新玩家级数据，不能估玩家独立数。许可未明，只保存署名聚合，未重分发原库。

## 交付与检查

- `scratch/knowledge-candidates.json`、`strategy-candidates.json`、`rk-candidates.json`、`rk-vocab-candidates.json`：候选数据。
- `coverage.json`、`context-mapping.json`、`publication-state.json`：逐卡/逐情境处置和pending状态。
- `source-ledger.json`、`input-verification.json`、`raw-read-ledger.json`、`frame-read-ledger.json`、`evidence-audit.json`：来源与读取范围。
- `summary.json`、`variant-coverage.json`、`external-cells.json`、`external-descriptive.json`：可核统计。
- 用现行parseStrategyLibrary、reflexFile和vocab校验器检查10策略/10rk/10词表标签；仅内存替换验证与原库合并后的100策略合法。不是正式消费者读回，不跑游戏、模型、MC或Jev。
- 无源码/正式知识修改，不跑tsc/vitest/full；tests三项均null。HEAD/diff边界、报告JSON逐字一致性和gitleaks结果见`final-validation.json`。
- 没有新发布、production kb_strategies/kb_reflex读回、Jev固定回放、自然查询、实际采用或收益。rk tag只描述比较维度，不能算出hp/win收益；不启#28开关/两臂/A-B，不关闭科学父，不自行开下一单元。

## 最终机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-221315-strategy-proposal",
  "base": "522197cfb8b29eea4d640032532731642a223a0d",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/report.md",
  "external_source": "issue51-single-card-003-20261024-r56",
  "input_sha256": "9ec61e3afd7010fcd0c12c61b4e1c49f825bcdf67f3d5d28bf9da24438152e5e",
  "external_results": [
    {
      "id": "external-single-card-003-r56",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-b003-skill-count-price",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-skill-count-price",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-skill-count-price",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b003-weak-target-amplification",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-weak-target-amplification",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-weak-target-amplification",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b003-card-count-trigger",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-card-count-trigger",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-card-count-trigger",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b003-defense-activation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-defense-activation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-defense-activation",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b003-next-turn-copy-or-attack",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-next-turn-copy-or-attack",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-next-turn-copy-or-attack",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b003-draw-event-window",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-draw-event-window",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-draw-event-window",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b003-draw-count-versus-empty-pile",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b003-draw-count-versus-empty-pile",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b003-draw-count-versus-empty-pile",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-lane-b-discard-payload",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-lane-b-discard-payload",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-lane-b-discard-payload",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b002-explicit-keyword-resource-boundary",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-explicit-keyword-resource-boundary",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-explicit-keyword-resource-boundary",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-b002-skill-discount-and-draw-lock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-skill-discount-and-draw-lock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-skill-discount-and-draw-lock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/rk-candidates.json"
        }
      ],
      "reason": "固定20卡完成逐项处置，形成7个新情境、3个同ID更新，knowledge/文字策略/rk各10个描述性候选；统计比较均未达每组100独立样本，正式发布、生产读回、自然采用与收益均为0。"
    }
  ],
  "reason": "固定20卡完成逐项处置，形成7个新情境、3个同ID更新，knowledge/文字策略/rk各10个描述性候选；统计比较均未达每组100独立样本，正式发布、生产读回、自然采用与收益均为0。",
  "source": "mixed",
  "source_commit": null,
  "own_support_runs": [
    "0NZXA12NLDMH",
    "25226ZFLNR1J",
    "4ANT8D00TP72",
    "7X58G3LSHZ3U",
    "8AGEGLG40SV3",
    "9TG1RP5LFAAK",
    "D4LJ9QMGFB8Q",
    "E5L15SK6ZHZB",
    "JMH5C51RLN4E",
    "JQPT83P8KDSZ",
    "KYJMB7ELM6FN",
    "L6745E2ND5CT",
    "L704TLETMZBM",
    "L9SGRBB5R698",
    "MCCK2602T1SR",
    "MCT1GPTL8D35",
    "MGA0CZDDKC0P",
    "NB8KCF6HRGVF",
    "P2M3DFJ4DEZ3",
    "UJ0K3G10609Y",
    "VPW8YH7A4QFM"
  ],
  "decision_output_counts": {
    "new_contexts": 7,
    "same_id_updates": 3,
    "byte_reuses": 0,
    "aliases": 0,
    "total_contexts": 10,
    "cards_covered": 20,
    "card_statistical_rows": 20,
    "comparisons_meeting_100_per_group": 0,
    "knowledge_candidates": 10,
    "strategy_candidates": 10,
    "rk_candidates": 10,
    "formal_publications": 0,
    "production_readbacks": 0,
    "natural_queries_verified": 0,
    "actual_adoptions_verified": 0,
    "benefit_measurements": 0
  },
  "card_dispositions": {
    "PINPOINT": "candidate",
    "TRACKING": "candidate",
    "ANTICIPATE": "candidate",
    "NIGHTMARE": "candidate",
    "SPEEDSTER": "candidate",
    "STRANGLE": "candidate",
    "PANACHE": "candidate",
    "STORM_OF_STEEL": "same-id-update",
    "MASTER_PLANNER": "same-id-update",
    "MURDER": "candidate",
    "SHADOW_STEP": "candidate",
    "ULTIMATE_DEFEND": "candidate",
    "CORROSIVE_WAVE": "candidate",
    "MEMENTO_MORI": "same-id-update",
    "GRAND_FINALE": "candidate",
    "SHRUG_IT_OFF": "candidate",
    "ARMAMENTS": "same-id-update",
    "UNMOVABLE": "candidate",
    "HEADBUTT": "same-id-update",
    "BATTLE_TRANCE": "same-id-update"
  },
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/coverage.json",
  "mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/context-mapping.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221315/learner/runs/20261024-221830-0de2de74-ace1-47b7-a489-6b6b7534b6b7-strategy-proposal/scratch/source-ledger.json",
  "formal_publication": "pending",
  "consumer_readback": "pending"
}
```
