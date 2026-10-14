# 静默猎手策略提案处置报告

批次 20261014-171302-strategy-proposal；base=db549666c849e0506694ad75c290185b209c7ddd。

10个原ID全部处理，全部waiting。无源码、知识、任务模板改动，无源码提交、合入、发布号、规则通知或shipped；tsc/vitest/撤源码红绿未运行。本报告不关闭父提案或学习入库要求。

## 身份与范围

对应learn.json为strategy-proposal/silent/reason=proposal，工作树完全匹配，带10个proposal_ids；无research_request、implementation_request、proposal_repair。普通专题文件绑定20261010-150327，不匹配本批；未读其work_spec/manifest，未转专题。开工git status干净，git merge --no-edit main返回Already up to date，HEAD保持base。

十派发锚点均runs.character=SILENT；1LMB=A4、9YT=A7、10GPK=A3，其余锚点A10。ff1原提案另链接UJ0K3G10609Y，核SILENT/A10后只读该项证据，不冒充派发锚点。只读silent基线经验2026-10-13.8中的18个原提案条目及关联19账本条目，不把其全史支持数当本批复验样本。

## 冻结证据

共用extract_evidence.py按显式身份提取，各流冻结source_size。全14636行offset/bytes/SHA、原body和身份读回一致，states全SILENT。10份原Markdown逐SHA匹配。来源invalid/incomplete及各局计数在manifest，复验evidence-verification.json。

| 流 | source_size字节 | 所选行数 |
|---|---:|---:|
| states | 12754253252 | 7230 |
| decisions | 1379831771 | 6936 |
| sl-attempts | 39116213 | 58 |
| run-config | 1680904 | 11 |
| run-plans | 7717922 | 52 |
| brain | 505246098 | 338 |
| runs | 327918 | 11 |
| fight-plans | 2233957 | 0 |

fight-plans在此截点选到0行，仅说明此次未选到，不断言原日志缺失。brain实际选338行，不照搬旧报告计数或冒称全历史。

## 已核事实、反例与限制

facts.json保存28个材料断言：两次毒药水当步加6且不扣HP/不改玩家；79末2HP/7挡/三感染各3先死，敌仍8HP/10毒；升级零毒蜃景16挡不变且耗1；三候选局部共省10血少24伤。这些是材料断言，不是生产代码测试。

79 F14T3空过0损/0伤与进攻0损/19伤的5轮实赢均0/8，尾端约76%仍是估计，未执行进攻无整场结果。K2首试毒药水后判死、SL恢复原瓶和62HP，次试未喝该瓶仍胜，反对“加6就必须早喝”。缺受控早晚喝/留药/目标/替代构筑结果，不拟持有价、护栏/SL阈值、固定目标或未来固定覆甲。

已有resource_chain消费者回放ZTRG12尝试（6胜房+6同族）、K2 18尝试、79 7场；赢战也留血价。净HP、回复、SL恢复和缺出口分列，死亡净损受剩余HP截顶，不当完整入伤。材料转换首轮combat=null失败及首局资源初稿保留；修正空值与按已有CLI的started_at/attempt>1格式输入，不改源。

## 既有候选消费者

| 局 | 决策 | 片段 | 可核相邻区间/未知 | 可核整轮/未知 | 完整候选实果 |
|---|---:|---:|---:|---:|---:|
| ZTRGYYMLR8SC | 594 | 130 | 388/206 | 69/39 | 0 |
| K2JAGKVJAWZJ | 720 | 138 | 138/582 | 25/97 | 0 |
| 79UCJ0K6R9C1 | 235 | 78 | 0/235 | 0/42 | 0 |

三份有界消费者exit0仅核已有工具消费固定日志，不代tsc/vitest或完整候选因果。K2原完整输入exit1：285853/285888两条REST map/route-change元数据无decision_id，原err/零输出保留；另存auditable输入排除两条元数据并保持源行号，防跨缺口连接。79未满足相邻上下文条件，保留unknown不补尝试号。摘要初轮误读status的KeyError与改按实际schema计数的记录均保留。

## 已有源码子范围

13个文件核实际live祖先、源码SHA及工作树=提交；12个base/live同字节，card-model仅两条Roy→Dai署名注释差异，见source-coverage.json及card-model-base-live.patch。首次diff命令失败单存，改读两blob比较；不改源码。以下祖先只证明已有子范围，不能整项duplicate：

- 7e5cd982d40054e751bb0096e403e3cf7cf50ba0：同族快照明确不做实体/实际退场追踪。
- 05cd292c6f01bb31e406473d3a9843e659d62b93：候选阶段审计仍actual_turn=null。
- 9b87d54f097d84521152e6cca8d6072af8140394：离线执行/整轮审计仍完整候选结果null。
- d2afe7f39a512c89ae3576056ae86e95bcf05e60：升级蜃景零毒窄范围。
- 8bb53d6342b7e9a2adf96de231b53c36eaa943de：Demon完整修饰组合的毒药水模型。
- 1e4526cf8ddb971543e2d5f197ec75bc7a2c0cd7：另一套Crab组合的施毒当步事实。
- 3fe6251b746cebe816b9db3c0d8aa9d6090bec0a：路线仍保留hpOnArrival比例。

## 合入阻塞

只读git merge-tree --write-tree对live c268cf3a5b1a299c2da52edeb5748ace5ea2a566与base返回1，18项冲突。未实际merge，未提交live刷新、未覆盖活动知识或并行记录。完整预检如下：

- CONFLICT (content): Merge conflict in notes/fix-queue-v4.md
- CONFLICT (content): Merge conflict in notes/lessons.md
- CONFLICT (modify/delete): notes/strategy-v5-dpr-health-20261013-dispatch.json deleted in c268cf3a5b1a299c2da52edeb5748ace5ea2a566 and modified in db549666c849e0506694ad75c290185b209c7ddd.  Version db549666c849e0506694ad75c290185b209c7ddd of notes/strategy-v5-dpr-health-20261013-dispatch.json left in tree.
- CONFLICT (content): Merge conflict in ops/inbox-dev.md
- CONFLICT (content): Merge conflict in paper/data/README.md
- CONFLICT (content): Merge conflict in paper/data/commits.csv
- CONFLICT (content): Merge conflict in paper/data/cost-curve-silent.csv
- CONFLICT (content): Merge conflict in paper/data/cost-silent.csv
- CONFLICT (content): Merge conflict in paper/data/cost-sources.json
- CONFLICT (content): Merge conflict in paper/data/cost-unattributed.csv
- CONFLICT (content): Merge conflict in paper/data/decisions_by_label.csv
- CONFLICT (content): Merge conflict in paper/data/learning-curve-silent.csv
- CONFLICT (content): Merge conflict in paper/data/runs.csv
- CONFLICT (content): Merge conflict in paper/data/summary.json
- CONFLICT (content): Merge conflict in paper/data/verification.json
- CONFLICT (modify/delete): paper/materials/20261014-v5-boss-revalidation/ops-binding.json deleted in c268cf3a5b1a299c2da52edeb5748ace5ea2a566 and modified in db549666c849e0506694ad75c290185b209c7ddd.  Version db549666c849e0506694ad75c290185b209c7ddd of paper/materials/20261014-v5-boss-revalidation/ops-binding.json left in tree.
- CONFLICT (content): Merge conflict in paper/materials/decision-log.md
- CONFLICT (content): Merge conflict in paper/materials/learning/ledger.jsonl

## 逐项结果

- silent-proposal-43fe170707574455：waiting。账本 silent-0021,silent-0012,silent-0046。ZTRGYYMLR8SC A10 F17 T1/T5/T7/T9/T14；首三轮75/初血324是原提案诊断，退场仅首次可见帧，不补零HP帧。 同族当前血池/暂减力快照已有；跨帧同族信徒实体身份、缺退场帧的实际击杀时点和构筑组件兑现链未证。新增追踪实施被当前18个live历史记录冲突阻塞。
- silent-proposal-3f5a665dca133a8c：waiting。账本 silent-0125。ZTRGYYMLR8SC A10 F11T3 d285301、F17首试T10 d285405、末试T13 d285745。两候选预测25/26→20/18、15/12→12/3、2/7→0/0。 三次局部候选省10血少24伤不是整场实得。缺原候选完整执行与受控整场反事实，现有阶段审计/动作回执/端点只覆盖子项；18个live历史记录冲突阻止补追踪。
- silent-proposal-0b8ef30de463f317：waiting。账本 silent-0013,silent-0277。ZTRGYYMLR8SC A10 F6T3、F11T1、F14T1、F17六次及末T2—T14。原提案的新获7瓶与17饮动作分账，SL恢复不是新增。 仍缺实际取得/饮用/SL恢复至药水消费者的联合校核及晚喝/留药整战对照，不能拟持有价或时点。现有缺表标识和覆甲分源不覆盖整项；合入预检18冲突。
- silent-proposal-5367449b857450a7：waiting。账本 silent-0012,silent-0013,silent-0046,silent-0149,silent-0277,silent-0284。七个原提案证据局；ZTRG F17末T5暂减力/次轮恢复、T14脆弱；ULP4TN1GNHMK F17铜钹减1与滑溜同现，限伤因果未隔离。A4/A7证据不混成A10策略训练集。 待核临时减力、脆弱、覆甲、铜钹随机/滑溜限伤和刀扇容量的完整组合生产调用；固定3附伤和未来固定覆甲不由本批证实，不能整包duplicate；合入预检18冲突。
- silent-proposal-9b8890c2649a2734：waiting。账本 silent-0012,silent-0019,silent-0020,silent-0021,silent-0125。ZTRGYYMLR8SC A10 F11T3/F17T10/T13三取舍；六个F17尝试进68/70。六胜房净损51，三休回63，56−51+63=68。 缺护栏原线、晚喝铁心及未走路线同条件整场结果，以及SL/休息/药栏连续消费者来源。现有端点与同族快照不覆盖宽资源父项；合入预检18冲突。
- silent-proposal-645ff7b72e0b9991：waiting。账本 silent-0010,silent-0106,silent-0021,silent-0286。K2JAGKVJAWZJ A10 F46T1 s293158→293159蜃景+耗1且16挡不变；79UCJ0K6R9C1 F14T3 d286684空过0损0伤且5轮实赢0/8；F14T11感染先死。 零毒升级蜃景与感染先结算已有子范围；仍缺短推演尾端贡献到完整候选实际执行的校核及替代整战胜线，不能把0/8实赢或局部收益当胜率因果；合入预检18冲突。
- silent-proposal-68ef2857229d1287：waiting。账本 silent-0278,silent-0286。K2JAGKVJAWZJ A10 F33首试T10 d286255/s292940→292941毒42→48、敌HP54不变；79UCJ0K6R9C1 A10 F14T11 d286715—286716/s293463—293465毒4→10、敌HP8不变且玩家先死。 K2 F33T10及79 F14T11当步加6已原帧复核，但现有Demon/另一套Crab条件不覆盖这两套完整组合。题面/短推演入口与感染死亡先于毒的固定联合验证未实施；新增覆盖被18个live记录冲突阻塞，未见加量/阻毒组合和时点收益继续未知。
- silent-proposal-9edfef7a6b2873c2：waiting。账本 silent-0020,silent-0019,silent-0021。K2JAGKVJAWZJ A10 F31/F32/F33/F34/F36/F38/F42—F46，共18尝试；79UCJ0K6R9C1 A10 F8/F9/F11—F14，共7战。K2旧预测75/实86与79预测70/实51方向相反，不拟统一修正。 两局资源链已回放，投影高低差均保留；原计划仍存比例，缺计划时逐节点HP/maxHP、成本/休息假设与同节点独立回放，不能按当前上限重解释旧投影；合入预检18冲突。
- silent-proposal-ff1d168227e369e0：waiting。账本 silent-0010,silent-0012,silent-0013,silent-0046,silent-0077,silent-0115,silent-0178。K2JAGKVJAWZJ A10 F46T1/T2/T6/T7/T9；10GPK5XGHCK3 A3 F17T5；原提案明确链接UJ0K3G10609Y A10 F33T7/F48T6/T8，核角色后仅作该项边界回读。 升级蜃景零毒子项已有；升级正毒、爆发重放与暗影组合缺隔离调用证据，三骑士T7额外2损完整伤源仍未知，不拟统一修正；合入预检18冲突。
- silent-proposal-c64bdd50a949d16f：waiting。账本 silent-0021,silent-0243,silent-0276,silent-0277,silent-0278。K2JAGKVJAWZJ A10 F15T2、F17→18、F27T2、F33首T10→SL恢复/末次胜28、F33→34、F45换瓶、F46死亡。 铁心当步建7不补旧挡、毒饮用非即时伤害与SL恢复分账可核；提前能力/换瓶/早晚喝的整战反事实及持续资源消费者验证不足，不能推广终局阈值；合入预检18冲突。

## 记录与交付

只经根ledger.py追加where/note/by追溯，不改claim/first_run/prior/evidence/status/version，不重复计支持、不新造代码提案ID。waiting交原调度器按缺口/新完局接续，18冲突交ops原集成流程处理；未自行修改队列、根请求或他人材料。

tests为tsc=null、vitest=null、cases=null。没有撤源码失败/恢复通过，没有本批源码提交或合入；无提交前gitleaks/源码测试成功声明，无eval版本或规则双通知。失败和原件均保留。

提案文件：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-171302/learner/runs/20261014-171321-strategy-proposal/proposal.md。报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-171302/learner/runs/20261014-171321-strategy-proposal/report.md。

账本执行读回：首轮CLI exit2，where.report字段非法、零行写入，原输入/err/out及验证失败保留；改用where.proposal存两材料路径后CLI exit0，19条纯追溯追加按原物理行/SHA逐项读回，未修改状态、首证、游戏结论或支持计数。工作树最终干净，HEAD仍为完整base。最终确认见final-verification.json。
