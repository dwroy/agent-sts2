# Issue #4：Silent 精英模拟悲观偏差核查

结论：原52战统计可以重现，但尚不足以校准死亡概率或调整权重。本轮定位了比总残差更早的输入/选线差异：原日志牌堆被提取流程剥离；一场棱柱因战内升级身份扣不掉手牌而凭空多出六张抽牌；PHROG与BYRDONIS合成开场带入原T1未见能力。它们是可固定复现的表示缺口，不是已证明的悲观偏差因果解释。四份候选提案全部waiting，先由原ops安排有界固定核验。

## 身份、授权与完整性

- 唯一父问题：silent-elite-simulation-pessimism-20261021；issue=4；batch=issue-4-elite-calibration-20261021-104312。原issue仍OPEN，报告不能关闭父项。
- 本WT基线994cbfb26a7fe27ea491f87c6200f8b44a1db8d5，与输入base一致。原审计source66ff0722c53ce4606ee86a8d4374baf680231a42；其回放源码/知识固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。771份运行时/知识SHA逐一与该Git blob相符；不归档/展开整仓。
- 输入manifest SHA256=a51a989ddff82b615e3185c06f7f6d3bb8bc97abddfebe26ed43795b956ee011。全部99项路径、字节、SHA匹配，含53完整回放、7个敏感性原件、pilot、所有冻结输入及issue原文/原授权；不是只读三个分组或汇总。详input-verification.json。
- 原授权原件25ae2141a16fa4fc61c48d00943240a0a5fb3340bd6627d663c2d17606a34d25，问题注册冻结a71b80e35fe362a4abdd80cb66968095dc7d69b9d6c6c95cf4afaae5d9344f71；两者与issue描述绑定。没有新建同题学习要求、续批或agent。
- 按已知索引有界seek核回2345条状态、1546条动作、4条SL，合83,614,970字节；每条offset/bytes/SHA在source-index.jsonl。未遍历共享大日志、未查询/重建DB。106条入房/可行动帧逐字SHA相符；去掉原agent_view后其余内容和冻结帧完全相同。
- 所有计算nice19/ionice3，单Python进程，需Git读blob时最多再一子进程。本轮未执行MC、真实模型、网络、play、生产刷新、paper_dataset、tsc/vitest/full，也未改源码/知识/账本/配置/STOP/live/其他WT，未提交/上线。未修改或声称本原生会话档位生效。模型/账号/沙箱保持原样。

## 分母与条件

40局全部Silent A10，42份冻结run-config（含2份重启）覆盖40局且全部V5，29个不同config commit；dirty明细留run-inventory.json。run-config原行没有给出offset，本轮不扫描该共享日志；配置身份为冻结元数据已核，不冒称42原行重新seek核过。19局brain_source=codex、21局unknown（其中18局有精英）；未知不偷换成纯Codex战绩，不删除诊断样本。其brain原题原文无已知offset，本轮只复核冻结身份元数据，不扫描brain日志补证明。

33局有53场精英，另7局没有精英仍在run-inventory.json，不计作精英胜负。剔除34XTHUP4433X F24/fight13首试结局未知后52场、33个独立局ID、实死4场（7.6923%），合成均值30.2885%；实净损27.2308、模拟38.1190，差+10.8882 HP。模拟种子、回合、SL都是同局条件重复，不作独立实战或置信区间。这里描述的是已选择并实际进入精英的条件分布，不是所有路线/候选牌泛化概率。

34X F24原T2 predicted_death后回合重置，4条SL均实际reload成功；首试未执行到死亡，最终死不能倒记首死，全部尝试保留。BXU0CKWKH2RU F46 SOUL_NEXUS真实开场helper Error:no solve保留，合成仍可算。两组共同可用且未删失为51战、仍33局，实死4/51，合成30.8824%、真实开场17.4632%；净损误差+10.4969→+3.9737。不能把52战分母替换成51而不说明。

所有场均固定实战入场HP/牌组，不补未来拿牌；SOUL_NEXUS入房73到首个可行动75的2HP差记录为入场与就绪边界差异，原因未核，不把其算共同52组“开场HP全同”的反例。历史每局动态知识原字节仍unknown；本轮验证的是审计后时点快照与原实战的比较，不是历史同版本校准。40局起止、逐场历史提交、入场HP/牌组/升级/药栏、首试/SL均有完整清单。

## 全部精英结果与反例

| 精英 | 首试场/独立局 | 实死 | 合成死亡率 | 实开场死亡率 | 实战净损→合成损 |
|---|---:|---:|---:|---:|---:|
| BYGONE_EFFIGY | 9/9 | 2 | 19.10% | 8.68% | 37.33→38.60 |
| BYRDONIS | 3/3 | 0 | 73.96% | 27.08% | 22.33→39.84 |
| DECIMILLIPEDE三段 | 4/4 | 2 | 33.59% | 44.53% | 52.00→55.24 |
| ENTOMANCER | 3/3 | 0 | 5.21% | 4.17% | 20.00→30.97 |
| INFESTED_PRISM | 3/3 | 0 | 67.71% | 59.38% | 21.33→43.26 |
| PHANTASMAL_GARDENER×4 | 9/9 | 0 | 15.28% | 13.89% | 26.44→31.40 |
| PHROG_PARASITE | 7/7 | 0 | 67.41% | 17.41% | 18.43→51.59 |
| SKULKING_COLONY | 6/6 | 0 | 7.29% | 2.08% | 18.33→22.95 |
| SOUL_NEXUS | 1/1 | 0 | 0.00% | unknown | 20.00→50.84 |
| TERROR_EEL | 7/7 | 0 | 25.00% | 14.73% | 26.29→34.18 |

ENTOMANCER另有1删失场未计表中首试；SOUL_NEXUS真实开场unknown。DECIMILLIPEDE实死2/4高于模拟33.59%，旧日雕像实死2/9也高于模拟19.10%；不支持统一“所有敌人都悲观”的规则。四个实死原件为2Q6ZYZ6JHM0M F8、MRJ4E5HL3ZA9 F8（BYGONE），S5GZG328S1LN F28、U6JELGQTBMHN F28（三段虫）。原合成全死而实赢4场全部保留。

重点13场全部如下，逐场T1精确原字节引用在fight-review.md相同id及fight-inventory.json；另外40场也逐一有去向，无跳过no-solve、低残差或难例。这里的同组低残差主要指死亡率；BXU F15与76VED F30的合成掉血残差仍分别约+30.13/+30.09，不能称所有指标低误差。

| 局/层/战 | 实净损 | 合成死亡率→实开场死亡率 | 最早可定位分歧/反例 |
|---|---:|---:|---|
| JKDUL0AL0TW6-f9-fight4 | 26 | 65.62%→3.12% | T1抽数与开场能力；低残差反例也有同缺口 |
| 25MFNPAE37R2-f28-fight14 | 24 | 100.00%→100.00% | T1策略集合；后续阶段未有动作匹配 |
| BXU0CKWKH2RU-f15-fight6 | 24 | 3.12%→0.00% | T1抽数与开场能力；低残差反例也有同缺口 |
| W9610N90MMCT-f15-fight10 | 16 | 100.00%→25.00% | T1抽数与开场能力；低残差反例也有同缺口 |
| 0NMF36KX3F7Y-f9-fight5 | 36 | 100.00%→56.25% | T1抽数与开场能力；低残差反例也有同缺口 |
| U6JELGQTBMHN-f8-fight5 | 9 | 78.13%→6.25% | T1抽数与开场能力；低残差反例也有同缺口 |
| 9W38TRGPJW9Q-f8-fight4 | 15 | 21.88%→0.00% | T1抽数与开场能力；低残差反例也有同缺口 |
| ET1QAZCV8GUP-f9-fight4 | 4 | 68.75%→0.00% | T1抽数与开场能力；低残差反例也有同缺口 |
| ET1QAZCV8GUP-f31-fight11 | 22 | 93.75%→75.00% | T1牌身份：7+27对原7+21；策略也不同 |
| MPWMW6P91U0B-f11-fight5 | 25 | 100.00%→56.25% | T1抽数与开场能力；低残差反例也有同缺口 |
| 76VEDXJJ2PFL-f30-fight15 | 18 | 9.38%→3.12% | 同组低死亡残差；换真实开场掉血48.09→54.78反而增加 |
| 2XCG8LXUZLRE-f9-fight5 | 35 | 78.12%→34.37% | T1抽数与开场能力；低残差反例也有同缺口 |
| MEQ6ETDCEEE9-f13-fight6 | 6 | 78.13%→21.88% | T1抽数与开场能力；低残差反例也有同缺口 |

## 最早分歧及归因边界

1. 原件到冻结输入：53/53原T1都有agent_view.combat.draw/discard/exhaust；extract.py调用parse_state_line主动切掉agent_view，prepare.py同样。成功的52场真实开场全部piles:deck-minus-hand。第一处可定位差异在回放输入构造之前，而不是抽到哪张后的策略。51场ID/升级多重集恰好相等，不能把剥离视图说成每场数值一定变，也不能称完整牌面等价；分组牌堆本身无抽序，未来抽序unknown。parse_state_line与backtest helper在原771源码/知识清单之外，本轮Git cf337有界代码对照与冻结结果吻合，但原helper运行时叶字节未知；原始字段丢失和34对28的事实不依赖该源码同一性推断。

2. ET1QAZCV8GUP F31T1：原常驻牌28、实际手7、原抽21、弃/耗0。手7均升级，但常驻deck仅其中LEG_SWEEP已升级。helper用ID+upgraded扣手，只扣掉它，得到抽27，加手7变34；STRIKE与SHADOWMELD战内升级也未正确表示。完整原视图有这些身份。此为同输入声明被直接反证；修复后的死亡率/方向未知，不能由0.75反推修正幅度。精确来源见下原件锚点与proposal-input-fidelity.md。

3. 开场敌人能力：七PHROG原可行动T1仅INFESTED_POWER4；合成还带MANGLE_POWER10、STRANGLE_POWER2。三BYRDONIS原仅TERRITORIAL_POWER1，合成另MANGLE_POWER5。源码使用common首见分子、Silent encounter分母，并只在见过该power的进阶内筛选，再跨进阶估计到A10；A10对应首见字段为空。component-findings.json静态复现选择条件，未借公共其他角色数据作为本角色游戏事实。STRANGLE原文本令敌逐牌失血，移除可能反而更悲观；不能将额外能力统称敌人伤害被抬高。后续阶段/意图仍需同动作前缀回归，不能从初始incoming52场相同排除。

4. 实战开场与起手：53场全部蛇戒，51场合成首抽比原手数少2；48场5→7、2场7→9、1场6→8，另2Q6ZYZ6JHM0M F8与79421JK2WBA9 F14持BOOMING_CONCH两场5→9、差4（共48个七手、4个九手、1个八手）。这是覆盖候选，但53场无无戒实战负控，不能仅由手数把所有差额无条件归蛇戒，海螺叠加条件也未隔离。45场3能7手的原描述与这份细分不冲突。遗物/药/敌HP/具体手牌同时换时不能称单因果。

5. 药水表示：合成仅排CHOICE/DRAW，不是全部不用药。实战MPW F11T1喝POWER并实打生成ABRASIVE；合成无对应随机来源，真实开场helper有来源但不保证同生成、同后继。0NMF实T1喝SHIP，冻结真实开场样本0到T7才喝。无药BXU F15低残差与无药76VED F8高残差同时保留。跨战药价与不喝反事实仍unknown，沿c514既有提案不重复登记。

6. 后续策略：用coreWindow.byCard.firstPlay只能证明T1首用ID集合，不证明顺序/次数完整匹配。25MF F28原T1是DEFLECT、FLICK_FLACK、MALAISE；32个真实开场模拟T1都额外FOOTWORK，最迟T1选线集合已经分歧。0NMF首轮实际POISONED_STAB/SHIP与样本集合也不同。BXU F15低残差样本32/32集合相同，仍不能当整战策略等价。340个首试回合的实帧投影/实际动作与32样本逐轮序列全部对齐到turn-alignment.jsonl；没有缺失的模拟全动作/能力轨迹就不能进一步指明哪一步执行机制错。

7. 阶段：25MF F28及ET1 F31都可见棱柱VITAL_SPARK从3到6、意图按原帧前进；但自由策略、药、毒及资源已不同，冻结汇总没有同动作逐步能力轨迹，不能把棱柱高残差直接定为阶段伤害参数错误。76VED F30同组低死亡残差，改实开场平均掉血反增6.69，尤其不能只调到低死亡率。

8. 测量：原净HP与帧采样累计伤害相差0.4808HP，仍解释不了约10.9差；原累计伤害残差+10.4075。另核得两个端点缺口：ET1 F9最后COMBAT42HP到首个非战斗39HP；2XCG F9从25到19。原净损分别4/35，按入场到退出为7/41；52战退出口径均值27.4038、残差+10.7151（仍悲观）。这9HP的事件/治疗归属unknown，若把它算累计损伤也须注明是跨边界净差而非完整事件总伤；未改原审计数值。死亡hpLoss按入场血和复活容量封顶，death_rate=1及hpLoss满血不是两项独立异常。死亡提前截断，不能用平均回合少说明策略好。治疗、尸体/召唤与净敌HP伤害口径不同，turn-alignment保留原敌人逐体投影，不把总敌HP突变归武断输出错误。

## 原敏感性结果、候选与下一步

七Eel旧实验全部核原件并保留：基线25%/34.183HP；只换首抽19.196%/31.491；只换能量不变；damageScale1为23.214%/33.790；真实开场禁随机药15.625%/30.045，含随机药14.732%/29.504。76VED F8原无药、48HP、7轮实赢净损29，合成81.25%、首抽单改84.375%、权重单改78.125%，是反对“一补抽/换权重就够”的固定反例。本轮未新增样本，也未将敏感性结果当新的实战分母。

四份scratch候选见proposal-drafts.json及各Markdown：输入保真、开场能力条件、蛇戒/药水表示、同前缀策略/阶段对齐。状态均waiting：待原ops原单点安排固定复现，不登记队列/账本，不启动任何模拟。每份带角色/进阶/版本、证据局层回合、旧/拟新行为、负控、按run独立时间后留出、消费者、误差/回退与预算。

优先顺序：先0MC恢复53个原T1输入与身份守恒；再最多8个窗口×3实际动作=24个确定转移，遇到无法识别抽序/随机后继即unknown停止。两个步骤各单进程、nice19/ionice3，分别10/15分钟预算，不跑full。之后若原ops确需量化，候选上限8窗×2输入×4固定旧seed=64样本、30轮/1500节点、单项一比较；本轮没有启动或新增许可。所有53场已阅，不能事后称某低残差场是盲留出；真正留出须后续未读独立Silent A10新局，至少8局是收集下限而非精度通过门槛。

棱柱阶段沿silent-proposal-e76e895381da5bfc，药水收益沿silent-proposal-c51468c5e8ba6668，删失/SL沿silent-proposal-da9575b27ac37dbb。普通紧勒接线沿04cbbf6b3a547aea/1b9e29122364fa68，其implemented/duplicate不等于本开场选择问题完成。0332接续诊断沿ecbd4b68c5fad954（原文件不可用，未读取其他WT补写）；CEN成功死亡优先/资源接续纯bug、P4、拿牌预测器都不替本issue因果核查或消费者验收。去重索引保留原提案身份和逐条队列SHA，本轮没有新正式ID。

## 异议、交付与开放状态

disagreements.json有三项明确prior/finding/evidence/affected_ids/next_step：D1纠正“真实开场保留原可用牌堆”的方法声明；D2限定“同种子配对故不影响”的外推，拒绝把它当候选增量已校准；D3纠正两场损血的终点定义，保留原数值并列退出口径。逐假设支持/反证/未知见hypotheses.json。其余新缺口不强行包装成对原审计的反对：原审计本来就没有认定单一机制根因。

宿主仍须沿既有CLI登记提案/异议并实际ops→watcher→Roy告知，保留各角色实际回执；本轮未写通知、未发issue、未ACK。issue评论排队或他人ACK不代本学习者已收到或Roy已知。ops发公开issue前再扫正文；issue-comment-draft.md仅放可公开结论，不含账号/内部主机信息。当前CARDbrain/REFLEXoff、P2移出均保持，本轮没有检改开关。

tests=null；merged=false；published=false。可复现的是静态字节核对、统计、输入差异与有限首轮集合分歧；机制因果贡献、校准参数、拿牌排名、自然采用和实战收益均未验收。父要求/issue继续开放，后续须实际知识发布、live祖先、内容SHA与消费者读回，再按原各角色通知回执验收；不能以本报告或CEN子修复完成关闭。

## 原件锚点与产物

- ET1QAZCV8GUP-f31-fight11（Silent A10/F31/T1可行动），logs/states.jsonl offset=14296044731 bytes=40115 SHA256=385cfbe3b57c560e59604cf56839725c288fe49c4b85e2a0551eea1614416ca2
- JKDUL0AL0TW6-f9-fight4（Silent A10/F9/T1可行动），logs/states.jsonl offset=13797057638 bytes=31823 SHA256=aefb730b443d16f7938accc8e8a396dc2f58baaaccd0674fdcfd1bcec6d20763
- BXU0CKWKH2RU-f15-fight6（Silent A10/F15/T1可行动），logs/states.jsonl offset=13982412226 bytes=31630 SHA256=bf0e4a71065bc5800dd13a5a6955b26e4333583753e2d828346a889a331e0c1c
- MPWMW6P91U0B-f11-fight5（Silent A10/F11/T1可行动），logs/states.jsonl offset=14382639873 bytes=29189 SHA256=d3a29762ec8b7f9ebe94d70425992a75d2449dd28b5ccf36dc8b3e2b8c533cd9
- 0NMF36KX3F7Y-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14114959665 bytes=30299 SHA256=6b4e898c22862a17b71e43fad9bb43c2d99adf05967d21c55ddbdbeb60db6719
- 25MFNPAE37R2-f28-fight14（Silent A10/F28/T1可行动），logs/states.jsonl offset=13872752851 bytes=35206 SHA256=2b384a1972b88a20e5e11485250b3264f0907bfcfba657623c07d7dc3866af13
- 76VEDXJJ2PFL-f30-fight15（Silent A10/F30/T1可行动），logs/states.jsonl offset=14478276210 bytes=40823 SHA256=83cc8cc3e7dd509dd2fa63e373d3bde02fe11120ecfc673673c22e022b4f61c2
- 76VEDXJJ2PFL-f8-fight5（Silent A10/F8/T1可行动），logs/states.jsonl offset=14467283240 bytes=28062 SHA256=45675a04d54de92ca8264c8fef0118abfa65781dbddba4f3e4454ecaa49a459d
- 34XTHUP4433X-f24-fight13（Silent A10/F24/T1可行动），logs/states.jsonl offset=14562951292 bytes=40294 SHA256=187f515433d44b5abe0fee5d8102375f88a05e3dc602d91fc3be2828a3f1b5d9
- BXU0CKWKH2RU-f46-fight20（Silent A10/F46/T1可行动），logs/states.jsonl offset=14012534173 bytes=50808 SHA256=dc49286a1fb96b8148c8e320e6e2fb1446d9dae763ed666ad228537c285a943e

全部53场人读核查见[fight-review.md](fight-review.md)，机器完整清单[fight-inventory.json](fight-inventory.json)与CSV；全部40局见run-inventory.json；原件SHA/source-index.jsonl、input-verification.json、source-snapshot-check.json；统计static-summary.json、340回合turn-alignment.jsonl；代码解释source-excerpts.md、component-findings.json；提案/异议各有JSON及Markdown。result.json与artifact-index.json给最终产物哈希。原99件保持原路径，不重复展开历史仓库。gitleaks及最终WT核验回执在final-checks.json与扫描原件；任何误报按精确公开局号局部处理，原失败保留。
