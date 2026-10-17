# H0/r1：机制与源码阶段，验证尚待接续

请求 roy-20261017-human-pace-h0/revision1；input SHA 982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54，manifest SHA 7bdcf916f6ff77e5ff1d88a58662a51a9b97aac4db380552470d2e66105cdb84。原 owner/thread 01a1415e-a511-7131-be7c-a2dc691c847f/batch050119；本批095852，原生gpt-6.1-sol/xhigh/default、240分钟，实际启动/实收原件见evidence/start-receipt.json及actual-runtime-readback.json。不是Roy ACK。

本阶段交付：六目标原始来源、逐回合诊断、一项有证据的A2窄修、原固定107调参缓存及9条限定经验；481验证未运行，不能签发新trust或关闭H0。计算计划与实际耗时见phase-execution-corrected.json。单批结束不关闭0332、human-pace宽父或G1a旧父；G1a完成历史不改。

## 输入与分母

只用cut以内已结束SILENT A0–A10：333局，六目标923尝试/178不同局，617仅预测死亡的截断试次，306真实结局。SL身份、局号/层/attempt/turn/进阶、实际遗物/状态、先行run-config源码与数据版本见all-target-attempts-summary.jsonl；923事件+188配置共1111原偏移无缺失。每Boss/局只一个真实结局，SL不增加独立分母。最后结束时间2026-10-17T01:47:33.841Z。states cut=13795215424、decisions=2151985895、runs=355475字节，其他cut见extraction-summary。原sl.jsonl缺失，已有更早冻结sl-attempts cut的来源与补索引明列，不热换本输入。

14,124端点原始path/offset/len/SHA在all-target-frame-sources.jsonl，哈希628,826,219字节，原日志仍只读；24诊断战原帧454份另在本任务scratch/raw、203命令窗口在scratch/windows（未复制整个仓库）。输入bounds为元数据/尾段SHA，不冒称全前缀SHA；个别dirty版本仅是观测，未伪造当时原子运行树。

## 旧固定校准、当前生产和新对象

R366旧对象7e1193/107调参/460验证/70生产输入差保留；本轮冻结校准21仍7e1193，107/481，artifact995fbdbd，model a16714b6349b4d4c79bbc91c3875c979607f80da1e619b59f5a0a82e45210a5a。新源基于冻结live99737be9fdb9c2ea92089d768947c49b49b62382，原210叶中live73、main103差异，另65个源码导入闭包；冻结各叶不是历史全树原子快照。未重复旧107/460或旧full；因真实源码/数据输入改变，先冻结new-object-plan后才算新107。

新修对象 model 86f9bd67047925fb362f00ff35672535e65953cd75c38957ed502023aa4e0115，artifact b655d0ee43da138ec0861870c36bd444132a6713e6ab3f6378e74c3cf64c78c0，base54e36上的两源码叶覆盖冻结live闭包；277旧原型输入移除纯helper模块后为276叶。V1原型缓存b60fe332a73a8a8aabb2793c86c21b47efe39c5b06da8fae1a428f0115d5769b与首轮架构失败均原样留存；纯函数原文移入既有adapter，调用点/算术/RNG未变，9意图、8隔离组及B2/B3构造输出逐对象相等，复用214个已算调参行，未再跑107模拟。固定200次/seed1+原588全行序号*101，B2=T1、B3=pre，切点2026-10-06T02:46:11.648000、107keys/481keys不移动。验证标签未参与模型选择，未更改criteria或leak口径。

## 六目标旧四闸与缺口

阈值原样：min_fights10，Brier≤整体1.25倍，胜率差≤0.15，leak∈[0.7,1.3]。下表是旧固定校准21，不是新对象/当前线上可信表。六项数量均距10缺0；质量失败不能用承诺再加若干局代替，需多少额外独立结局未知。Queen、Knowledge各1来源no solve剔除而不补零。

|Boss|B2/B3有效n|Brier B2/B3|预测/实际 B2；B3|leak B2/B3|失败 B2；B3|新验证|
|---|---:|---|---|---|---|---|
|TEST_SUBJECT|29/29|0.1849/0.1771|0.351/0.207；0.321/0.207|3.669/3.538|brier,leak；brier,leak|待481keys|
|AEONGLASS|35/35|0.1879/0.2001|0.692/0.514；0.693/0.514|3.979/4.078|brier,gap,leak；brier,gap,leak|待481keys|
|QUEEN|31/31|0.2294/0.2183|0.719/0.419；0.689/0.419|1.048/1.165|brier,gap；brier,gap|待481keys|
|KAISER_CRAB|46/46|0.1595/0.1848|0.695/0.63；0.71/0.63|1.308/1.327|brier,leak；brier,leak|待481keys|
|KNOWLEDGE_DEMON|45/45|0.1022/0.0898|0.746/0.844；0.757/0.844|1.337/1.375|leak；leak|待481keys|
|THE_INSATIABLE|46/46|0.1381/0.1609|0.706/0.674；0.706/0.674|1.303/1.348|leak；brier,leak|待481keys|

## 首次分歧与机制修正

24战203窗口中179可回放、178净HP相符、24 no solve未知。17旧last已在掉血后，旧leak可少计，不能将换标签当过闸。净HP还含持牌/回合初末效应，不是纯敌伤。首次净损差仅UJ0K3G10609Y A10 F48a6T2实际70→65、模拟11；组合挡顺序未隔离，不据此改0332/turn-solver。

|Boss|尝试/独立局|命令窗口/可回放/净损相符/缺失|首次机制结论或具体缺口|
|---|---|---|---|
|TEST_SUBJECT|182/39|42/38/37/4|未隔离可修招式错误；Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.|
|AEONGLASS|179/47|31/30/30/1|未隔离可修招式错误；Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.|
|QUEEN|166/42|27/22/22/5|Silent A2 Paper Krane Amalgam only; nine frozen intent endpoints / one tuning run；Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.|
|KAISER_CRAB|154/60|38/36/36/2|未隔离可修招式错误；Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.|
|KNOWLEDGE_DEMON|105/61|37/26/26/11|未隔离可修招式错误；Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.|
|THE_INSATIABLE|137/57|28/27/27/1|未隔离可修招式错误；Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.|

证据支持的唯一窄修：ZZMYZ5UBCG72 A2 F48首试T2–T7，纸鹤原文40%，聚合体四招六已见力量/易伤上下文的9意图端点。旧后续已生效Weak乘0.75；限定有效未熔纸鹤、SILENT/A2、相同基数/命中及六上下文改0.6。TACKLE2:18→10；BEAM(0力+易伤)7×3、(-3力+易伤)4×3；TACKLE3(1力+易伤)13、(4力+易伤)16；TACKLE4(2力+易伤)14。仍1独立局，非9局；A10、新施Weak、其他力量/怪物、遗物缺失/熔化和其他角色保持旧路。当前意图、未来命中次数/阶段、面对朝向、整战策略与抽牌没有因这个固定probe全部验证。静态per-hit审计为TEST_SUBJECT 0/82、AEONGLASS 0/50、QUEEN 9/61、KAISER_CRAB 99/116、KNOWLEDGE_DEMON 0/60、THE_INSATIABLE 0/46；该简化审计未输入Facing，帝王蟹首项实际敌ID为CRUSHER，不把99差异直接判敌招错或改其倍率。逐Boss招式ID与原帧见table-audit-merged.json，阶段/命中数/朝向及完整轨迹仍待隔离。

源码仅rollout.ts未来已有Weak选择与rollout-live.ts真实board适配；现有结构断言不改，新测试8例。原原型类型导入违反架构，首轮完整sandbox=1/4275通过，第二轮保留同入口与断言。失败编译/无手牌adapter/旧consumer Node Git EPERM原件保留。旧历史副本1076文件SHA复核、20他角色知识仅opaque inode/metadata原位rename；未读其内容，测试结束恢复原路径，未删历史。

## 调参残差、未完成校准与下一步

每端107keys候选/106成功；K3676LU8B0UH:48:2:6525158984两起点no solve原件保留。只修中的ZZMYZ5UBCG72调参key变化，验证key受此窄修直接影响0；但整个新生产对象相较7e1193已变，不能沿用旧验证预测。B2该key原始0.13→0.16、B3 0.23→0.28只是一个固定输入的条件模拟，不是自然胜率。

|起点|训练Platt a/b/c|训练A0–4 n/预测差/Brier/leak|训练A5–9|训练A10|
|---|---|---|---|---|
|t1|{"a": 2.029, "b": 0.4301, "c": 0.0}|38/+0.004/0.1327/1.238|52/-0.015/0.0879/1.196|16/+0.039/0.138/1.399|
|pre|{"a": 2.2191, "b": 0.4802, "c": 0.0}|38/+0.006/0.1319/1.301|52/-0.014/0.0914/1.263|16/+0.030/0.1387/1.434|

完整分组机器表在tuning-fit.json，上表为训练内残差而非新验证认证。旧验证仅A10（479可用总体），A0–4/A5–9各0、距每组10各缺10；旧A10预测差B2约+0.037/B3+0.040。新481验证尚未启动，所有修后逐Boss Brier/gap/leak和A10验证残差unknown。旧F49验证31独立场，B2/B3 Brier 0.1821/0.1622、预测0.464/0.421对实际0.161、leak 2.704/2.814，距数量门槛缺0但质量不达。A10包含F49的单Boss/双Boss范围沿旧表分列；F49联合率仍unknown，不用均值HP替代。

下一步同owner/thread原H0/r1用repaired-v2-compiled冻结对象、validation-keys.json及原588行种子，至多4个nice19预编译Node进程只算481验证keys。tuning-fit与214结果已冻结，不重拟合验证、不再算旧107/旧full；保持原Platt选择、四闸、B2/B3起点。所得结果经原流程形成新的内容指纹目录与完整completed，再判断是否发布trust；没过继续low-trust。H1部分采样预算、实际上线组合的新刷新叶、自然效果另核，本full对象不能认证它们。

## 经验、提案、限制与责任

经验候选2026-10-17.h0-r1：9对象，6个Boss限制、纸鹤旧条目补窄修、固定生产边界、测量时点边界。每条canonical SHA见candidate-experience-objects.json；实际live/消费者结果必须以之后真实publication与consumer receipt为准，本阶段源报告不先冒称上线。账本silent-0500 mechanic、0501 fight，经CLI proposed；初稿手工误加193/162/161/31，已CLI追加203/179/178/24勘误，原add/提案/失败保留。未冒造bug-infra或shipped。

提案6ddd086196022f15为纸鹤窄修；a6cf9f726a971b59为保留的旧计数稿、7b0badc658e4fb1b为修正稿和剩余assay限制，未隔离机制不冒实现。implemented只在真实live源码祖先存在后CLI登记。Roy架构授权是原固定split/四闸/先证据再修改、自测自行live；40%窄修、时点疑点与未知从Silent实际日志学得，并非Roy提供事实。

questions.json原文列3项异议：高比值非招式因果证明、旧纸鹤经验/后续模型不一致、净损差不关闭0332。实际通知沿授权根双追加交ops→watcher→Roy，不代ACK；自然消费和收益待观察。通用连续Boss接口、H1预算/排序、0332及宽父保持原owner责任。
