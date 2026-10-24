# 毒相关ID簇1构筑剧本（scratch候选）

ID: silent-external-poison-build-playbook-c1；source=external:sts2fun；Silent A10/v0.111；采集2026-10-21。formal_publication=pending；consumer_readback=pending；own_support_runs=[]。

这是1个新流派候选，以下8项是同一剧本的观察段落，不拆成8条新增。全部方向均为观察关联/代理。完整来源、输入SHA、原分母、反例节点见 poison-playbook-candidate.json 和 source-ledger.json。

## 命名与适用

核完8簇后选择簇1：高权重四ID含显式POISON文本，且代表轨迹记录同组ID的多种取得顺序。仅为毒相关ID组的操作名称；未获牌效/机制文本，不证明唯一毒流、纯毒打法或簇5不是毒相关。

当前已观察到上述ID时可阅读本剧本。事后簇号、终局牌组和胜负不能当当前触发器。正文前缀条件不能完整由现有strategy schema表达，故仅knowledge草稿，不扩schema、不生成可执行触发器。

## 核心搭配、拿牌顺序与转向

可观察的候选核心为 BOUNCING_FLASK、ACCELERANT、DEADLY_POISON、SNAKEBITE。这里“核心”指终局统计权重与共现，不是已证实互相增益或必须拿齐。BACKFLIP/LEG_SWEEP的正向共现也只供比较备选，不从名称推断抽牌/防御机制。

代表胜例既有幕1节点2 DEADLY_POISON→节点3 NOXIOUS_FUMES（页0），也有节点3 SNAKEBITE→4 DEADLY_POISON→幕2节点22 ACCELERANT（页2），还有前5节点无四核心、节点20 BOUNCING_FLASK→35 ACCELERANT的后转向胜例（页1）。页3负例节点6已得前三质心ID仍在节点9终止。当前题目可比较已得牌、真实选项及资源后保留方向；不能从这些事后轨迹估计“现在转向”的收益。

## 各幕目标和补救

幕1：把已记录核心获取前缀和沿途资源一起看。页0双方节点2/3都得DEADLY_POISON/NOXIOUS_FUMES，胜例节点6所得LEG_SWEEP/DASH、11治疗21、14治疗25，负例节点6受伤21、8受伤15、11治疗21后仍在15结束。不能把分歧归因于某张牌或一次休息；资源继续恶化时应在当前实际候选中重新比较补强/休息，而非把“已拿毒牌”当完成准备。没有安全HP阈值。

幕2：胜者幕末六核心与正block副本仅提供3→4、8→9的事后参照，六核心包含NEUTRALIZE，不是毒牌张数要求。页4胜例INFESTED_PRISMS受伤60、末HP9，随后节点29治疗24、31治疗15、32治疗27并最终胜；对应负例受伤43、末HP8，下一节点受伤10/治疗2终止。页7负例该精英只受伤7仍在幕Boss死，故不能据精英单次代价独断准备充分。补救只能列当前可见选项；收益和最佳路线unknown。

幕3：先核当前Boss原ID和已记录/实际给出的后场安排，逐场核真实资源，不用终局牌组替代战前牌组。页8负例TEST_SUBJECT前节点80、受伤80后结束；页5胜例AEONGLASS受伤97但治疗34后末HP29。高HP和单次受伤均不能单独决定胜负。未知后场、药水和攻防覆盖保持unknown。

## 短观察（方向、幅度、样本、范围）

### core-identity

毒相关ID可作构筑候选标签，不以终局簇号锁定当前打法。 簇1终局DEADLY_POISON 130/223=58.30%，SNAKEBITE 142/223=63.68%；整局胜42/223=18.83%。

范围：Silent A10/v0.111单人有效非弃局无modifier上传记录；终局描述代理，无牌效或因果判断。

证据/反例：页2 projection-67064be025992be3 节点3,4 outcome=1; 页2 projection-b47197e675bcc56b 节点3,5,8 outcome=0

### core-pair-direction

核心共现有正反向，搭配只作探索性候选，不下固定三件套命令。 ACCELERANT+BOUNCING_FLASK胜8/27、负6/27，出现率差+7.41pp/q=.877；BOUNCING_FLASK+DEADLY_POISON 6/27对6/27，0pp；ACCELERANT+DEADLY_POISON 8/27对11/27，-11.11pp/q=1。BACKFLIP+LEG_SWEEP 13/27对5/27，+29.63pp/q=.792。

范围：同簇同版本、末幕相同且终止节点差≤3的无放回配对；终局共现代理，不是胜率增益，双方均<100。

证据/反例：页6 projection-66f51e61b86f3029 节点24,30,31,49 outcome=1; 页3 projection-59420de19fd0b489 节点2,3,6,9 outcome=0; 页2 projection-67064be025992be3 节点36,39,49 outcome=1

### order-and-pivot

按当前已得前缀保留转向余地，早拿多张核心不构成成型或安全证明。 前5节点至少两种四核心ID：胜7/10、负5/10，出现率差+20pp；平均种数双方同为1.6，差0；首5节点零核心的胜例1/10。

范围：20条选定代表轨迹，记录拿牌/所得/变形前缀代理；非完整牌组，不输出最佳拿牌顺序或转向时点。

证据/反例：页1 projection-6f1a785fb54b4210 节点1,5,20,21,23,35,49 outcome=1; 页3 projection-59420de19fd0b489 节点2,3,4,6,9 outcome=0

### act-checkpoints

幕末参照同时看已得核心和防护代理，缺三件套不等于应继续强追。 41条终局还原一致胜例：幕1/2末六核心副本中位3→4，正block副本代理8→9；前三质心牌组合仅8/41观察到成型，33/41未成，另1/42胜例排除。

范围：只描述事后已观察下一幕且终局还原一致的胜例；六核心包含NEUTRALIZE，不能读成毒牌数或通过门槛。

证据/反例：页0 projection-40ed0656498ebe5e 节点17,33,36,49 outcome=1; 页3 projection-59420de19fd0b489 节点6,9 outcome=0

### failure-and-remedy

拿到核心后仍要重看沿途资源；受伤、治疗和休息分别记账，补救收益未知。 代表负例终止幕1/2/3为5/10、4/10、1/10；INFESTED_PRISMS记录总受伤胜均18.9(n=10)、负均30.4(n=5)，差-11.5HP；胜例受伤最大60仍后续胜。

范围：选择性代表轨迹；精英暴露分母不同、整局结局含未来信息，仅资源消耗代理，不能指定更安全路线或某张补牌因果收益。

证据/反例：页4 projection-92f2215255e10258 节点24,25 outcome=0; 页6 projection-2b90dbf512a7fd29 节点28,29,30 outcome=0; 页4 projection-f9ea71f22071a180 节点25,29,30,31,32,49 outcome=1; 页7 projection-4b3d02ee3f2115c0 节点27,33 outcome=0

### boss-preparation

Boss准备分开核前节点HP与本节点代价，不从通过代理承诺安全。 KAISER_CRAB通过代理21/31=67.74%，总受伤均37.29HP；KNOWLEDGE_DEMON 22/27=81.48%，均22.78HP，相差13.74pp/14.51HP，组别有重叠且非等价比较。

范围：簇1/v0.111上传Boss记录；真实入场与净损失全缺，不排名克制；同场景指向已有Boss ID。

证据/反例：页3 projection-adacc9b017954650 节点32,33 outcome=1; 页0 projection-40ed0656498ebe5e 节点32,33 outcome=1; 页7 projection-4b3d02ee3f2115c0 节点32,33 outcome=0

### sequential-boss-preparation

已记录连Boss路径要给后场保留审查项，前场通过不能代后场完成。 AEONGLASS→QUEEN后场终止3/9、终局胜6/9；QUEEN→AEONGLASS后场终止3/14、终局胜11/14；后场前节点HP均37.44/48.21，仅量级代理。

范围：簇1/v0.111的已观察第三幕路径；按路径原分母分列，不累计或推断最佳顺序，未知后场不作已失败。

证据/反例：页3 projection-adacc9b017954650 节点47,48,49 outcome=1; 页0 projection-40ed0656498ebe5e 节点47,48,49 outcome=1; 页8 projection-b38c65acc7c26588 节点47,48 outcome=0

### jev-hp-budget

Jev可参考分场受伤与治疗的观察范围；可承受净损和安全HP预算保持unknown。 AEONGLASS记录总受伤0–97HP(n=45)，治疗0–40HP；胜例前节点92、本节点受伤97/治疗34/末HP29，另一负例TEST_SUBJECT前节点80/受伤80/末HP0；不是可共用血线。

范围：仅附观察先验，不接求解器、不设阈值、不改出牌/药水/SL/终局规则；当前真HP、牌组及药水仍需本系统现场信息。

证据/反例：页5 projection-9a01895b898a7417 节点47,48,49 outcome=1; 页8 projection-b38c65acc7c26588 节点47,48 outcome=0

## Boss和连Boss准备 / Jev HP预算

十二个Boss单元的分母、通过代理、前节点HP、总受伤/治疗范围逐项保存在aggregate-statistics.json；不同Boss样本有重叠，不能相加成独立局。已记录路径按原有序前缀分九组，不推断实际计划长度或最优Boss顺序。

所选20条代表轨迹中，10条胜例均观察到两场幕3 Boss，唯一到幕3的负例在首场终止；没有代表轨迹后场败例。后场终止3/9、3/14只来自路径聚合，不能伪造代表负例或以首场败例冒后场反证。

给Jev的本批可用信息仅为观察范围提示：前节点末HP代理、记录总受伤和治疗、各自分母、未知战前/场间快照。不生成可执行HP预算，不给允许损失上限，不把gross_damage均值/最大值减当前HP当安全判定；safe_hp_threshold=unknown，jev_allowable_net_loss=unknown。没有更改出牌、药水、SL或终局规则，因此本批无代码提案。

## 去重和原证据保留

同场景只指向下列已有ID，原策略、证据、可信度与触发条件原样保存在dedup-existing.json。这里的引用不算本批新证据或再次读回；新外部簇统计与旧本系统证据分账。

- silent-brain-kin-priest-exit-window
- silent-brain-vantom-two-stage-preparation
- silent-brain-crab-surviving-part-budget
- silent-brain-knowledge-demon-external-tail-budget
- silent-brain-test-subject-external-tail-budget
- silent-brain-act1-deadly-poison-prefix-context
- silent-brain-bouncing-flask-external-prefix-context
- silent-brain-accelerant-external-prefix-context

已有DEADLY_POISON/ACCELERANT单牌拿牌关联偏负仍保留；本剧本没有把“终局属于该簇”改写成应拿这些牌。已有BOUNCING_FLASK正向幅度与本批终局组合差不可相互验证。自有Boss机制只用于去重，不用本批缺回合的外部数据核准或否定。

## 缺证和局部waiting

| 子项 | 处置 | 仍可用代理 / 缺口 |
|---|---|---|
| 核心语义/机制贡献 | 部分完成；具体机制waiting | 原ID权重、出现率、已得顺序可描述；无牌效/版本机制文本 |
| 最优拿牌顺序/最佳转向时点 | waiting | 记录顺序代理可读；未观察反事实或当前完整牌组 |
| 幕1/2末资源参照 | processed | 胜例事后还原、六核心/正block副本代理；不能用作门槛 |
| Boss/连Boss准备 | partial | 前节点HP/有序访问前缀/通过代理；真战前、场间、药水均缺 |
| Jev安全阈值、可承受净损 | waiting | 可给受伤/治疗范围；无经验证净损及反事实，阈值unknown |
| 跨版本机制合并 | waiting | 五版本原分母保留；无“未改”证据，不合并 |
| 正式发布、消费者读回、自然采用 | pending | 候选未发布，不关闭#51/#54科学父 |

来源URL https://sts2.fun/static/sts2_public.db.zst；数据库SHA 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5；输入manifest SHA 9056a6ad671d68fd8f423d3e4ac3a72de55514597bfd1e90186a135b0ef0757f。公开FAQ未见明确数据再分发许可，仅署名脱敏派生统计；本系统支持局数0，上传行/内容去重数不是独立玩家数。
