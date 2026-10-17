# 本批十项策略提案核证与处置

批次 `20261017-211302-s2-strategy-proposal`；base `ee90797b418e628fcda95dd759e692ccfbac9145`；角色silent。结论：十项均waiting，本批无新增源码/知识修改、提交、live合入或行为版本。已有窄实现不等于宽提案完成；没有新受控证据时不改SL、终局HP价值、出牌权重或路线/保药阈值。

## 派发和证据边界

从根learn.json只读取本批：task=strategy-proposal、character=silent、reason=proposal、state=running、工作树一致，正好十个proposal_ids；无proposal_repair/research_request/implementation_request，不承接其他批次专题。本树初始干净，git merge --no-edit main返回Already up to date；HEAD维持base。仅处理派发十项，不选其他队列项目。

五个派发局号：NHA2KW0RB7VP, P74C04AEPL1F, G33HU22H2543, RC61MFQM63Y6, BTSRF7JL1W1Y。runs.jsonl逐局均SILENT/A10，均于2026-10-07结束；未混入其他角色知识。五局旧数据不能冒称本轮新增独立验证局。没有读取游戏二进制、key或.env，没有网络、play、推送、下级agent或生产模拟。

通过本树learner/extract_evidence.py冻结八流；逐条封套包含source/line/offset/bytes/SHA和严格身份。总计6606行，全部逐offset重新读取原日志、比较原字节SHA及JSON正文。各流cutoff和输出SHA详见evidence/evidence-manifest.json；原日志只读。

| 流 | 本批行数 | 源字节截点 |
| --- | ---: | ---: |
| states | 3238 | 14059548850 |
| decisions | 3138 | 2345216230 |
| sl-attempts | 31 | 46244708 |
| run-config | 5 | 1986443 |
| run-plans | 26 | 9048778 |
| brain | 163 | 769790775 |
| runs | 5 | 362905 |
| fight-plans | 0 | 2233957 |

fight-plans在该截点选中0行，只说明此cutoff/身份选择没有匹配行，不断言原日志缺失。run-plans按原run字段正确选到26行。states/decisions/brain源流分别有2个解析无效行，提取器记录并跳过；本批封套核证不代表全源日志完整。没有复用旧截点为零的初稿或覆盖旧报告。

## 当前源码与实际部署身份

本批对13个相关源码叶保存base与live快照的blob/SHA/字节数，见source-readback.json。只读live快照为`b23506b242de724d2ab9c066927ddb0d70d3f706`；此为磁盘提交，不作为原局dirty树或当前已加载运行树的证明。

实核base/live祖先：投斧首牌e784dd9f043bf87c29109573f48975f9903280d3；普通生存者单弃bf423c173d3be348a4ad714e1d26516df619ff41；弃牌手牌快照4b0823f519f1b724d6cff2b1cd50b74146dc4a9d；当轮SL资源5604982e13890e0e2bc8bf8246272e8267321c0b；候选对比c769739b97389fdc978b6515b83a38e3cd900f67；修复后集成a8b1f8be153fe4f3a34146117546c2178f2e446b。

原弃牌提示稿5d7f9e6a21c1485b8c34c11c4dafd220f98c3c56不是base/live祖先，不能拿它作部署提交。当前selection.ts提供discard_plan剩余动作/条件预测，silent-discard-facts.ts只提供当前保留手牌快照，明确不推演弃牌触发和后续结果；单弃求解器只对唯一余牌给确定取消，未知选择继续重读。SL resource/candidate比较仍明确标模型预测与execution=unverified；这些事实不证明完整后继或自然策略收益。

## 验证、口径与限制

evidence-verification.json最终28项材料核证通过，含原始封套、关键实帧差额和源码运输身份；这是只读材料核验，不是生产tsc/vitest或候选整战验收。combat-timelines.json保存91个可见战斗片段及3238状态的原始分段，state-timeline.jsonl保留逐帧摘要。原始分段从首入房帧开始，可能含开场HP/敌伤变化，且复活/重附着使净差不是累计伤害；关键结论以明确可操作原帧及决策指纹核，不直接以分段首末差替代实打伤害。判死截断末轮也不算敌方动作已执行。

材料脚本失败原件均保留：首次身份检查误把SILENT与silent作大小写敏感比较；verify首稿把唯一余牌窗口错放285411/285413，复读后纠正为285414/285415；第二稿错误预期原5d7为实际祖先，修正为记录其非祖先身份并核a8b1集成；第三稿误写不存在的sim/whole-fight.ts，按实际文件改为sim/boss-sim.ts。原日志、原稿.txt与各轮失败log保留，最终完整核验另存complete.log，未将这些材料错误当生产缺陷或测试失败。

本批没有源码变动，故没有撤源码失败/恢复通过实验，没有运行tsc/vitest/sandbox，三项tests均null；没有gitleaks提交扫描、git commit、decision上线记录或eval版本，因为没有提交或上线。tracked-diff.patch为空，最终git状态另见completion-check.json。经验/账本原claim、首证、prior、支持/反例、status与version保持；只经根ledger.py追加本批报告/提案的追溯链接和note，不新增支持证据、不新建重复proposal id、不标shipped。原队列waiting状态由调度器消费最终proposal_results登记，不直接修改learn.json/队列。

## 口径异议与交接

RC原提案中“首末同为五轮24/24”不能当受控预算：原decisions279021为3轮2样本，279197为5轮24样本；即时同指纹差额仍成立。这与队列已有“首末题预算不同”的waiting限制一致，不能为了支持规则修改而抹去。关联silent-0079及第7/9项；本报告显式交ops沿既有ops→watcher→Roy链呈报此限制，不代填其他角色送达/已知回执，不把排队算送达。本批无已绑定的学习入库父request，不自行编辑根请求或造通知ACK。

十项宽提案保持待新证据，不因报告结束关闭父要求、不声称经验已入库、大脑已采用或胜率改善。若后续获得同预算/同抽序整战对照或完整分支轨迹，按下列逐项缺口复派；无需重复写旧复盘。

## 逐项处置

## 1. silent-proposal-9952ee8e8df9a0fe

来源任务：experience-update → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-resources.md`；登记SHA `4641badee4b0dfb956e91f12e20e20a5ecbc5c31905f8e0c84da1429de4d9800`，本批实读匹配。
账本：silent-0019, silent-0020, silent-0065, silent-0264, silent-0079。
证据位置：NHA2KW0RB7VP F33 T1，六次；F24—33连续资源。

核证与反例：原线14挡/损1/扣敌8，替线8挡/损7/扣敌24；多16输出同时多损6HP。开场原帧283390为28HP，283391完成开场才为30HP；不能把开场变化算作出牌净损。首末六试无同条件整战胜线。

处置：**waiting**。当轮候选资源差额已有实现；缺同抽序、同预算整战后继及受控路线、保药对照，不能据此修改SL门槛或终局HP价格。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 2. silent-proposal-47be799a87af03be

来源任务：postmortem → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-011301-postmortem/proposal-discard-plan.md`；登记SHA `25870eb9a6d5482193ebe5f06d7071794e13bc8a43f293d8bcdfb7700377b6e1`，本批实读匹配。
账本：silent-0205。
证据位置：P74C04AEPL1F F23第4次T3；第1/3次作为反例。

核证与反例：decisions278542—278546：生存者后弃精确切击，再规划为紧勒打丝/毒雾。states284817为1HP/16挡，对石16＋卵8；284821石眩晕而卵2HP仍活，玩家死亡。选择帧的精确切击7伤依赖手牌，不能当作替代完整线的固定伤害。首试及第三试的目标与卵存活状态不同。

处置：**waiting**。计划提示和保留手牌快照已有实现；缺各合法弃牌分支的动态牌面、弃牌触发、目标及续步剩血核证，不能强制保留某牌或宣称替线必胜。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 3. silent-proposal-3a5274da3c42672a

来源任务：postmortem → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-011301-postmortem/proposal-group-resource.md`；登记SHA `6ae654a5dabe769d49545bf1f10fb61e82539939c4cca5acfa20e518cf19cf05`，本批实读匹配。
账本：silent-0039, silent-0196, silent-0013, silent-0180, silent-0224, silent-0227, silent-0027, silent-0011, silent-0006。
证据位置：P74C04AEPL1F F17 T1—9、F22 T1—6、F23 T1/3。

核证与反例：F22实盘53→9，T2/T4损20/24，下一F23仍9HP；主怪15HP/12毒的最后归零中间帧缺失。F23局部完整挡住石攻击后眩晕与卵继续攻击同时成立。原提案另含滑溜下火焰、毒、复活和一次翻倍，不能以一处已有模型覆盖全部联合消费。

处置：**waiting**。缺F22主怪最后归零中间帧，以及药水、复活、逐敌结算接下一战的联合消费者核证；本批未定位新增确定源码差额。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 4. silent-proposal-bc4b92d590f2c4ce

来源任务：experience-update → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-014012-experience-update/proposal-replay.md`；登记SHA `d99922d67f03f38fdf7a3df2a604a1be63a3d0bf1b98f3f2f4d6d42e58f29725`，本批实读匹配。
账本：silent-0092, silent-0023, silent-0021, silent-0057, silent-0205, silent-0079, silent-0266。
证据位置：G33HU22H2543 F48 T1/T8；P74C04AEPL1F F23第4次T3。

核证与反例：G33 decisions277909余像先与闪亮先候选分别18/10挡、75/107伤，原首牌身份缺口已有e784源码。P74弃牌后重新规划已实际发生；这些不能证明跨重规划的整条原线完整兑现，亦不能将已建立能力层数当作未支付的未来收益。

处置：**waiting**。投斧首牌身份与弃牌事实已有live祖先实现；跨重规划完整实线归属、余像累计收益与动态弃牌联合验证仍缺，不能把局部修复记为宽提案duplicate。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 5. silent-proposal-f52fbbab4dccc3b4

来源任务：experience-update → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-014012-experience-update/proposal-resources.md`；登记SHA `f6212ce1983f6d534fde0e56f7d3151fd4cb248a5413e4abdfdd9125421ed630`，本批实读匹配。
账本：silent-0019, silent-0020, silent-0090, silent-0069, silent-0039, silent-0064。
证据位置：G33HU22H2543 F31 T1—8、F33 T1—9、F48 T1—8；P74C04AEPL1F F22—23。

核证与反例：G33两场赢战83→46、76→17；P74 F22赢战53→9后空药接F23。含召唤/复活的敌HP净差不等完整需伤；SL恢复和实际休息/药水/幕间回复分别记录。原始分段净值见combat-timelines，不能将复活净增加当负伤害或把被截断轮当已执行败局。

处置：**waiting**。缺逐来源连续资源账的联合在线消费者验收，以及同条件路线、休息、SL和留药的受控后继，不能新增路线禁令、留药阈值或HP权重。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 6. silent-proposal-10f37c0edd3d24a6

来源任务：experience-update → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-014012-experience-update/proposal-mechanisms.md`；登记SHA `705dcdc07bf49426c7a645ce77875e8526cccca1e059eb1561472617611b8e52`，本批实读匹配。
账本：silent-0006, silent-0011, silent-0027, silent-0046, silent-0013, silent-0180, silent-0196, silent-0255, silent-0198, silent-0204, silent-0069。
证据位置：G33HU22H2543 F48 T4/T7—8、F38/39/45开场；P74C04AEPL1F F17 T1—9、F22 T4—5、F23 T1/3。

核证与反例：run-config已保存五局完整源码commit与dirty_files；dirty项主要为当时生成知识。知道commit不等于复原dirty知识/移动表字节。多来源毒结算、临时减力、牌挡/被动挡/一次翻倍及开场净值必须逐项区分，不能以死亡反推组件机制全部错误。

处置：**waiting**。原运行源码提交已知，但dirty知识和移动表字节未完整恢复；缺多组件联合回放及独立校准，本批未发现可隔离的新源码修正。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 7. silent-proposal-3f82387e2e179703

来源任务：postmortem → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-014304-postmortem/proposal-sl-power-cost.md`；登记SHA `8bdf5f3c4ef752be9a4d494397f8214fc58e524f6a8c682c1a3be41bb791eab3`，本批实读匹配。
账本：silent-0079, silent-0027, silent-0065, silent-0080, silent-0088。
证据位置：RC61MFQM63Y6 F33首/末次T1；第三次T4；末次T3—4。

核证与反例：decisions279021/279197指纹相同，首/末实挡16/12、损4/8、扣敌30/23，同瓶药均实际使用。首题原文为3轮2样本，末题5轮24样本；原提案将两者概括为五轮24/24的口径不能沿用作等预算配对。第三次T4生存者前states285414仅生存者/打击，285415手空、45HP/7挡，57激光判死但未结算。

处置：**waiting**。同指纹即时差额已核，但首次/末次推演预算不同；缺同预算整战、累计能力收益及独立验证，不能由全败饱和添加固定保血或先能力规则。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 8. silent-proposal-aee21084c991abd3

来源任务：postmortem → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261008-024302-postmortem/proposal-awake-beetle-validation.md`；登记SHA `b5cb54be4191c956c90c7604bd5180350c139bb8c2bab3e035f8104277186d78`，本批实读匹配。
账本：silent-0128。
证据位置：BTSRF7JL1W1Y F31 T1—4；F17已施放步法反例。

核证与反例：decisions279852抽牌前最佳线与279854抽弃后防御/两刀打石线不是同一完整线路；后者4样本3胜1死，实T4甲虫22攻击对5牌挡＋1覆甲，14HP实际归零、敌13HP。需损16、存活至少还差3HP；一次死亡不能证明75%概率错误。

处置：**waiting**。抽弃后已换线；缺最终执行线对应的逐样本轨迹与独立校准，单局3/4样本线死亡一次不足修改概率权重或强制先杀甲虫。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 9. silent-proposal-df37594e9b12debf

来源任务：experience-update → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-024302-experience-update/proposal-replay.md`；登记SHA `cee2c39a9643248c6df74fbaade8613c2b9fb8fb57952fa060311b7edb98fc44`，本批实读匹配。
账本：silent-0021, silent-0027, silent-0057, silent-0065, silent-0079, silent-0176, silent-0205, silent-0268。
证据位置：RC61MFQM63Y6 F17 T11、F33第3次T4/首末T1；BTSRF7JL1W1Y F31 T2重复证据。

核证与反例：普通生存者唯一余牌取消已由bf423源码实现；真实后继攻击没有派发，不能继续计转向或伤害。RC F17末轮呼唤自损须与毒终结分账；旧0205弃牌选择观察不等于0268独立根因。没有完整整战受控对照可估能力优先级。

处置：**waiting**。普通生存者唯一后继取消已有live祖先修复；跨选择整线归属、累计能力与呼唤自损的联合消费者仍未验收，不能把局部实现冒作整项完成。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 10. silent-proposal-42e81c83b2e1e56b

来源任务：experience-update → strategy-proposal；角色仅silent，直接证据进阶A10。
原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-024302-experience-update/proposal-resources.md`；登记SHA `9c9880e7b14f3e685556000992e98c20627afc63b12e7b1a359a82367c6a0a01`，本批实读匹配。
账本：silent-0019, silent-0020。
证据位置：RC61MFQM63Y6 F24/F27/F32休息及F33 T1—4。

核证与反例：states285249→285250为20→41，285260→285261为41→62，285311→285312为31→52，三次各21合63。三火确已兑现，但F33仍六试未赢；五次SL各恢复原瓶药不等新得药，也没有同条件锻造/另路线/留药的完整实打胜局。

处置：**waiting**。三次休息合63及52HP实际入口已核；缺同条件路线、休息、后战对照和逐来源消费者验收，不能据此调整终局血价或路线规则。

旧/新行为及预期：保留现行行为与全部合法候选；本批没有足够数据定义新增生产规则，无参数拟合和胜率改善估计。下一步只在上述缺口补齐后验证。固定回归只能验证该状态，整战收益需后置独立静默局并按原局分组；同局SL不拆成独立样本。没有改动需要回退，现有历史和失败材料保留。

## 最终机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261017-211302-s2-strategy-proposal",
  "base": "ee90797b418e628fcda95dd759e692ccfbac9145",
  "runs": [
    "NHA2KW0RB7VP",
    "P74C04AEPL1F",
    "G33HU22H2543",
    "RC61MFQM63Y6",
    "BTSRF7JL1W1Y"
  ],
  "fixes": [],
  "skipped": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "code_proposals": [
    "silent-proposal-9952ee8e8df9a0fe",
    "silent-proposal-47be799a87af03be",
    "silent-proposal-3a5274da3c42672a",
    "silent-proposal-bc4b92d590f2c4ce",
    "silent-proposal-f52fbbab4dccc3b4",
    "silent-proposal-10f37c0edd3d24a6",
    "silent-proposal-3f82387e2e179703",
    "silent-proposal-aee21084c991abd3",
    "silent-proposal-df37594e9b12debf",
    "silent-proposal-42e81c83b2e1e56b"
  ],
  "implementation_domains": [],
  "proposal_results": [
    {
      "id": "silent-proposal-9952ee8e8df9a0fe",
      "state": "waiting",
      "reason": "当轮候选资源差额已有实现；缺同抽序、同预算整战后继及受控路线、保药对照，不能据此修改SL门槛或终局HP价格。"
    },
    {
      "id": "silent-proposal-47be799a87af03be",
      "state": "waiting",
      "reason": "计划提示和保留手牌快照已有实现；缺各合法弃牌分支的动态牌面、弃牌触发、目标及续步剩血核证，不能强制保留某牌或宣称替线必胜。"
    },
    {
      "id": "silent-proposal-3a5274da3c42672a",
      "state": "waiting",
      "reason": "缺F22主怪最后归零中间帧，以及药水、复活、逐敌结算接下一战的联合消费者核证；本批未定位新增确定源码差额。"
    },
    {
      "id": "silent-proposal-bc4b92d590f2c4ce",
      "state": "waiting",
      "reason": "投斧首牌身份与弃牌事实已有live祖先实现；跨重规划完整实线归属、余像累计收益与动态弃牌联合验证仍缺，不能把局部修复记为宽提案duplicate。"
    },
    {
      "id": "silent-proposal-f52fbbab4dccc3b4",
      "state": "waiting",
      "reason": "缺逐来源连续资源账的联合在线消费者验收，以及同条件路线、休息、SL和留药的受控后继，不能新增路线禁令、留药阈值或HP权重。"
    },
    {
      "id": "silent-proposal-10f37c0edd3d24a6",
      "state": "waiting",
      "reason": "原运行源码提交已知，但dirty知识和移动表字节未完整恢复；缺多组件联合回放及独立校准，本批未发现可隔离的新源码修正。"
    },
    {
      "id": "silent-proposal-3f82387e2e179703",
      "state": "waiting",
      "reason": "同指纹即时差额已核，但首次/末次推演预算不同；缺同预算整战、累计能力收益及独立验证，不能由全败饱和添加固定保血或先能力规则。"
    },
    {
      "id": "silent-proposal-aee21084c991abd3",
      "state": "waiting",
      "reason": "抽弃后已换线；缺最终执行线对应的逐样本轨迹与独立校准，单局3/4样本线死亡一次不足修改概率权重或强制先杀甲虫。"
    },
    {
      "id": "silent-proposal-df37594e9b12debf",
      "state": "waiting",
      "reason": "普通生存者唯一后继取消已有live祖先修复；跨选择整线归属、累计能力与呼唤自损的联合消费者仍未验收，不能把局部实现冒作整项完成。"
    },
    {
      "id": "silent-proposal-42e81c83b2e1e56b",
      "state": "waiting",
      "reason": "三次休息合63及52HP实际入口已核；缺同条件路线、休息、后战对照和逐来源消费者验收，不能据此调整终局血价或路线规则。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261017-211302-s2/learner/runs/20261017-211308-467e97fd-f41e-4362-9f55-3492813e96f4-strategy-proposal/report.md"
}
```
