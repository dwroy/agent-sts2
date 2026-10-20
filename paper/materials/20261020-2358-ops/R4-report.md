本轮完成了冻结窗口内382个已结束Silent局的奖励机会盘点和可复现观察审计，但没有可以交付给消费者的拿牌条目。严格草稿v6-reflex-draft-v1为0条；complete=false、audit_complete=true，原学习父要求保持未完成。3个可识别估计全部保留在pending审计及拒绝项中，95%区间均跨0，而且缺少可如实关联的正式source_experience；没有为通过格式借用无关经验ID。未提交、未合入、未发布、未运行游戏、模型或模拟。

输入清单SHA256为 `915fb8eba10e5de59d33f38e9e7b05c4aa7ab9289f8ab810907c6e655eee79e8`；源码提交 `ab1f2561832b2909233bc55e52842f1bf726e5a0`，tree `760b957550ab19beec32894fcee217bc3fe020ac`，git diff --binary为空。启动清单原始SHA/字节边界已核；全部额外正式核心/词表、三轮草稿与相关scratch审计逐SHA核回，原始状态/决策/SL窗口在分析前封存。只纳入原局目/配置前缀允许的结束窗口；后续追加和在途内容没有进入样本。完整清单见inputs/manifest.json。启动清单缺task、character显式字段，已核任务文件与配置/结束记录；未给source_manifest_sha所指文件的路径，保留该元数据限制，不把自建清单冒称原发布清单。原生首turn_context已按字节回核为gpt-6.1-sol/high，线程 `01a159e0-b0ee-76f3-87e7-30049edd441c`；没有切账号、home或共享配置。

原冻结局目共863条：382条已核Silent、480条其他角色、1条角色未知。NTV8PC4ZNPMQ（2026-09-24）没有可定位原状态，明确记未知，不把它当Silent或Ironclad。382局的251,470个状态、239,833个决策、2,303条SL记录进入冻结证据流；原日志仍是证据来源，压缩投影和每条引用保留原偏移/长度/SHA。全部382局逐局列在run-inventory.json，零机会局也保留。

共发现5,317个奖励形态机会，5,120个能证明战斗后且恰三选一。153个缺直接战斗→奖励连续来源、44个非三选一均单列；事件、商店、特殊选择或不明来源不混入。全部候选共有15,995条身份×机会记录，其中15,360条进入条件登记、635条来源不合格或未知。原始候选及升级、完整拿前牌组及升级、HP、遗物与可见计数、当前Boss、原选择及实际成功回执、后续战斗、版本/进阶、首试/SL和全部排除原因都在inventory.jsonl；没有用最终牌组或后续抽牌倒填。所有奖励动作都找到了原状态指纹，未匹配命令为0。

首试口径为4,711个奖励机会，含SL口径为5,120个；两者不相加。首试在每局第一次predicted_death的ended_at/ts截断；缺先前判死但已出现reload的情况使用可证更早边界并注明保守未知。5,317−4,711=606个机会被首试主口径排除；按原因计数197个来源/三选一排除、433个位于截尾之后，二者交叠24个，不能把原因数当互斥分母。两组完整库存计数与逐机会结果删失见counts.json和opportunity-metric-dispositions.jsonl，SL重试从未增加独立run_id。

设计在读取结果前写入design.md。条件为实际候选身份/升级＋拿前具名牌组身份/升级类型集合及总数＋幕；每个all/any绑定同一张牌。初拟宽张数区间在结果读取前收窄成上述实际牌组条件，防止早期样本泛化到不相同牌组；不因后来区间跨0再调整。14,564个选择前条件族×3个指标，共43,692次尝试均保留，未按结果筛条件。predicate最多128节点，超限条件保留拒绝，不擅扩格式。下一精英无权威来源、组合结果缓存不存在时始终未知；没有新增私有字段。

treatment是成功拿该候选，control是同样提供该身份/升级却成功选别张或跳过。精确调整变量为拿前完整牌组多重集、遗物及可见计数（缺计数用unknown独立编码）、进阶、幕、当前Boss/未知、五层区间与HP比例四分位。全部版本/进阶合并为主口径，保留来源并按版本/进阶另算。两组均有样本的层才进入固定效应差值；无对照机会完整列出。没有按随后存活、成型或遇到的敌人匹配；选择其他候选、路线/药水和后续改牌仍是混杂。

结果固定为执行后第一场实际战斗。hp_loss=首战斗帧HP−明确终止/同房首个非战斗帧HP，单位hp，是净变化，包含窗口内自伤、喝药和自动回血；不是纯敌人伤害。死亡按真实终止HP记录，不剔除败战。turns要求从T1开始、观察回合连续且终止可核，单位turns；更少可能更快获胜或更早死亡。缺下一战、缺终止、越首判死边界分别删失，未结束或未知不填0。damage_per_turn全部未知，因为没有可信逐伤害分子和真实分母；没有用敌起终HP猜伤害。后续改牌与用药只登记不筛掉有利/不利结果。

层固定效应估计为sum((T−层均值T)*(Y−层均值Y))/Sxx，等价按n_take*n_not_take/(层总n)加权的层内差。按run_id聚类，CR1=G/(G−1)*(N−1)/(N−H−1)，逐局score、层均值/权重、分子/分母和所有个体残差完整保存在每份pending审计。95%区间使用冻结contrastInterval，df=G−1；confidence使用contrastConfidence，是依赖估计与聚类假设的近似t覆盖分数，不是因果概率、校准率或胜率。单局、无支持、剩余自由度不足、聚类误差非正均记未知，不造SE。

43,692次尝试中，43,668次无同候选共同支持，18次剩余自由度不可识别，2次不足两独立局，1次聚类误差为0而无法导出，3次可识别。无真实伤害观测的条件属于“无可用于该指标的共同支持”，详细原因为damage分子/分母未知，不能解读为牌无效。含SL敏感性也只有3个可识别估计，均保留在sensitivity-all-conditions.json；按版本/进阶及逐局删除都保留无支持状态，不用敏感性替代主结果。

下列两张表分单位展示全部已识别结果。条件均为第一幕、13张、类型集合ASCENDERS_BANE/DEFEND_SILENT/NEUTRALIZE/STRIKE_SILENT/SURVIVOR且均未升级；精确多重集分配、遗物、进阶、Boss等进一步分层。不是所有13张牌组的单卡评价。

|候选|指标/单位|条件频率|拿/未拿/独立局|调整后拿−未拿|SE|95%区间|confidence|
|---|---|---|---|---|---|---|---|
|PREDATOR 普通|hp_loss / hp|27/4711|2/2/4|+0.5|0.5|[-1.091223, 2.091223]|0.608997781|

|候选|指标/单位|条件频率|拿/未拿/独立局|调整后拿−未拿|SE|95%区间|confidence|
|---|---|---|---|---|---|---|---|
|PREDATOR 普通|turns / turns|27/4711|2/2/4|+0.5|0.5|[-1.091223, 2.091223]|0.608997781|
|DAGGER_THROW 普通|turns / turns|21/4711|2/2/4|0|1|[-3.182446, 3.182446]|0|

damage_per_turn（hp_per_turn）没有可识别估计，保持未知。排序使用条件频率×绝对观察差、单位分别排序；0是已识别的零差，未知从未补0。PREDATOR的27个同条件完整结果仅4个处于两组共同支持，另外23个保留无对照；DAGGER_THROW为21中4个、17个无对照。PREDATOR控制选择为BACKSTAB和DAGGER_SPRAY各1；DAGGER_THROW控制为PREDATOR和DEADLY_POISON各1。后者4个窗口中2个有实际用药，是剩余混杂。各估计都没有死亡，但这不是筛选条件。三个指标记录合并只有7个不重复奖励机会、7个独立局，不能把重复指标样本相加。

3个估计均不能解释为拿牌更强或更弱；区间包括0且独立局只有4。完整正向、负向、零层差、个体反向贡献和原始所有结果都保留在pending/audits，没有隐藏反例。逐局删除、小样本、选择偏差、频繁条件/多重比较、信息性删失、HP分位内残余差、其他候选组成、路线/药水/版本和后续行为均限制解释。没有任何因果或实战收益主张。

PREDATOR和DAGGER_THROW都不在冻结正式core的card_pool中，也没有真实对应的正式card作用域经验，因此cores/combos保持空并写原因，source_experience不能借用无关ID。冻结schema要求source_experience非空；第一次严格CLI按此拒绝了3条，失败草稿及输出全部保留。按签名贡献定义，零总体差的支持/反向计数也都是0，不编造支持。最后严格草稿为空，已识别数值仍完整存在rejected/statistical-candidates.json各自signal及pending审计。这个格式通过只证明诚实的空交付，不证明学到有效拿牌建议。

冻结正式85条与前三轮13/85/85条总计268个来源行逐条保留去向，全部是combat_line，不能改名发给card_pick。244条正式经验完整覆盖：243 text_only、1 disputed（原退役身份），converted/partial均0；未删原行缩分母，也未宣称旧战斗机制被本轮反证。正式核心4方向、17组合仅作真实ID查询，未把在途或scratch组合当正式关联。

最终校验：knowledge/builders/validate-v6.ts reflex严格CLI退出0；10项统计固定/复现检查通过；93项原生检查通过，包含42,699条原证据边界/SHA核对、5,323个奖励帧与冻结postCombatCardReward口径一致、原生value/SE/n/区间/confidence和全分母频率对账、candidate与deck同匹配、同一物理牌身份/升级绑定、缺/错字段未知、OR每支锚定、真实ID和坏ID闸。固定环境下off/shadow不发、跨0不发、正负两方向都能发；正负显著数值仅合成软件fixture，绝不当游戏证据。首次fixture误写空source数组的正确拒绝已保留，修正只改scratch合成输入。没有消费者/生产测试补丁。

命令、输入SHA、stdout、stderr和退出码见check-receipts-final.json，早期失败见validation-preliminary-receipt.json和rejected/native-fixture-first。未改agent/learner/eval/ops/knowledge/builders中的生产脚本，故未跑整仓tsc/vitest；本轮所需的固定统计与消费者检查已执行。离线读取不是live读回，更不是自然采用或收益。

异议原文在disagreements.json和learning-notice-proposal.json，须由原ops→watcher→Roy转达；本任务写权限限scratch/pending，未写共享收件箱/账本、未代填ACK、不声称已送达。原要求roy-20261020-v6-reflex-card-pick继续开放。下一步是保留当前行为并在原请求下等待真实同条件新机会；正式来源/发布/消费者读回由ops沿原流程处理。不自动派发、续批或启动模拟。

复现先校验已封存inputs/manifest.json及其文件SHA，再运行build_inventory.py、statistics.py和run_checks.py final；不要把freeze.py重新运行的时间戳清单当同一输入。统计每局贡献与所有反例自包含在pending审计；即使scratch过程副本回收，也可沿原日志偏移/SHA核验。完整命令见reproduction.md。

主要交付：report.md、result.json、inputs/manifest.json、run-inventory.json、inventory.jsonl/tsv、opportunity-metric-dispositions.jsonl、candidate-dispositions.json、candidate-attempts.json/tsv、condition-families.json、experience-coverage-detail.json/tsv、prior-entry-dispositions.json/tsv、ranking.json/md、contrast-samples.json、sensitivity-all-conditions.json、disagreements.json、learning-notice-proposal.json；草稿与3份完整统计审计在指定pending。result.artifacts逐项给SHA，不包含自身哈希；result.sha256单独封结果。
