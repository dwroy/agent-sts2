# 静默猎手策略提案证据核验报告

记录时间：2026-10-13T02:24:15+08:00；批次：20261013-021302-s2-strategy-proposal。

十项均waiting。现有源码已经覆盖若干候选/持牌/药水/巨兽诊断，原完整提案的实际兑现链、反事实后继或排序验证仍缺失；本批没有新增策略实现、知识更新、提交或live合入。完整逐项清单位于proposal.md和proposal_results.json。

## 身份与基线

开工工作树干净；HEAD/base完整40位为`17111a11e2870392a7cb11f57d64fb5865ddf9bf`。本批learn.json的task=strategy-proposal、character=silent、reason=proposal、worktree与本树一致，proposal_ids恰为十项，无research_request/implementation_request/proposal_repair。根普通专题候选只绑定20261010-150327，保持普通提案范围；没有读取另一专题、领取其他项或派下级agent。按要求执行git merge --no-edit main，结果Already up to date；未改HEAD。

runs.jsonl六行唯一：751=583、KV=584、YQL=585、L9=535、PU=540、KEN=586，均SILENT/A10。历史code为79bee0fc+dirty、70c8352b+dirty、b0b0e679+dirty、4fb81b17+dirty、0581ecb3+dirty、f9db52c1+dirty；当前代码是实现定位，不能重建这些dirty树。没有核实本原生模型运行身份，亦未宣称切换模型/配置已消费。

## 冻结材料及独立复算

为避免扫描12GB状态日志，复用上批raw-input-manifest的原偏移定位，逐行重新seek到根logs原文件、核原SHA256与精确run_id，再保存原字节到本批。没有把上批passed或结论作为本批核验结果。4071决策、4167状态、43条SL、6配置、21计划共8308原行逐字节一致；4167状态全部逐帧核SILENT/A10。run-plans为模型计划，不当已取得牌/已兑现游戏事实。十份原提案逐SHA与队列匹配；六局原复盘在根notes/lessons.md逐原字节找到，原勘误保留。只提取本批16个关联账本和silent经验的12个链接项，当前版本2026-10-13.1；未读其他角色知识、扩展到后续局或复做历史统计。

|局号|决策|状态|SL行|配置|计划|
|---|---:|---:|---:|---:|---:|
|751FN9QM9MHQ|615|624|6|1|2|
|KV0JHNJCKXLS|669|686|7|1|5|
|YQL8RZ8BWN1E|571|582|6|1|3|
|L9SGRBB5R698|635|653|6|1|3|
|PU80F84P6HPN|1033|1064|12|1|5|
|KEN58SH9SLZ6|548|558|6|1|3|

SL物理行数不是独立局数，KV含F16、PU含F17/F28。旧PU复盘中的13条与当前精确命中12条差异原样保留，本批不补造原行；已在原报告通知范围内，不重复改历史。

六组首次题指纹、从同轮到下一轮的净资源差独立断言通过：

|局/层/回合|尝试对|实净损|敌净削|
|---|---|---|---|
|751/F17/T2|1→3|13→18|9→18|
|751/F17/T7|2→4|13→23|12→18|
|751/F17/T13|1→6|8→2|17→11|
|KEN/F17/T10|4→5|15→21|2→4|
|KEN/F17/T5|4→6|7→5|1→2|
|KV/F33/T5|4→5|0→0|36→29|

净削含实际已结毒/反伤，不全部称牌伤或毛伤；后继抽序、出牌/能力建立也变，以上不是整场单因胜率。KEN T5省2血却把步法从T5推迟T9，states280701/280702才0→2敏，构成只保血恒优的反例；T10多6血只多2实伤也不够拟统一探索门槛。KV删毒没有当轮保血收益，T6动作不同；273451续问不能替代273450首次题配对。

751 F13 T3有药plan2损8/伤26，严格无药plan5损8/伤16；五轮均模型8/8赢，存活终结均值2.3/2.9。plan3虽本轮不喝，后继7/8喝药。实际states278403/278404耗肌肉药建立5力量；严格无药和留药boss未执行，缺表收费0不等持有价已证0。751 F17 T7实际生存者经pending选弃牌后剩一呼唤，27挡抵27攻击仍损6，敌净削4含毒1/荆棘3；不能把未决弃牌保守预测当新纯bug或猜弃哪张。

KEN七次饮药以逐槽位原帧断言通过：F3T2攻击、F4T1稳定、F5T2速度、F11T1虚弱、F11T2攻击、F15T1发光、F15T1技能。攻击/技能药进入选牌，发光水后另问；中位候选不证明整线执行。六次boss入口75/86空药栏，不证明任一瓶留到boss的价值。

YQL F17 T10 states280160/280161：毒2→8、HP26、挡13、来袭41、占位血均未变；新增6毒不是减伤6，26+13−41=-2与死亡截断0分开。L9/PU/YQL原SL保留占位血，anchor引用与其所在尝试区分。PU第五试F17胜是实际另一整战支线，不证明新参考排序有效。没有从牌层、计划、模型赢样本或同局相关SL补出未观察游戏事实。

## 已有源码范围

实际live冻结HEAD：`3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee`。14条相关源码逐blob/工作文件核一致并保存.txt，5条既有实现提交均核真实live祖先，证据见source-ancestry.json、known-implementation-ancestors.json：

- `9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`：持牌/pending拆项。
- `c4670f4f416c7d93e192e889c5080e7e4e0e733f`：持有价值未知与无药整战参考。
- `66283dd9982bdd7f480da7a4d9bfefea0572a9ac`：SL候选/资源分账。
- `40168f4a903ae1d8c48bd03006f8fea19fd3aa3c`：巨兽当前阶段与毒药实录展示。
- `b01edf46b4b619f217d070a196e161df9fe716a0`：巨兽阶段/最终资源等当前源码定位。

selection_audit.actual_turn、selection_dispatch.actual_turn、candidate_comparison.actual_turn_result、actual_held_hp_loss仍为null；派发回执state_effect_verified=false、whole_plan_executed=null。hand/loop只核首次派发回执，不补整轮归属。原提案要求的完整兑现链未实现，不能据已有子提交把整项标duplicate。巨兽body_hp=0等展示已存在，enemyHpLeft/anchorRank仍用原占位血作为旧同轮平局排序；替换排序需要完整后继验证。local/live已有差异只为Roy/Dai注释替换，local-live-source.patch保存，未覆盖现有差异。

## 逐项结果

### silent-proposal-366288801d9150d9

来源：postmortem → strategy-proposal；角色silent/A10；领域：sl, combat。

账本：silent-0079, silent-0176。证据：751FN9QM9MHQ F17 T2/T7/T13；decisions272434/272575、272531/272652；sl945—950。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md`；SHA256：`0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524`，原文完整保存在本批*.original.md。

处置：**waiting**。751 F17 T2/T7/T13实损13→18、13→23、8→2与敌净削9→18、12→18、17→11已复算。已有候选资源/B2诊断，实际整轮字段仍空；缺确定弃牌后全轮分账、SL覆盖与续问归属及保持后继不变的整战验证，不能拟额外血价门槛。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-85929bdfc8a3fc1b

来源：postmortem → strategy-proposal；角色silent/A10；领域：combat, potion。

账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。证据：751FN9QM9MHQ F13 T3、F17 T7/T13/T17；decision272361；states278403/278404、278500—278505。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md`；SHA256：`d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68`，原文完整保存在本批*.original.md。

处置：**waiting**。751 F13 T3有药plan2与严格无药plan5均模型8/8赢、损8，但没有实际无药整战或留药boss支线；plan3后继7/8喝药。未知持有价和持牌来源已有展示，缺实际分支及弃牌后毒/荆棘/药水的联合兑现核验，不能给持有价填0。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-efd9f83ee9e1a6dc

来源：experience-update → strategy-proposal；角色silent/A10；领域：sl, combat。

账本：silent-0079, silent-0176。证据：751FN9QM9MHQ F17 T2/T7/T13；sl945—950；同上配对题。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md`；SHA256：`0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006`，原文完整保存在本批*.original.md。

处置：**waiting**。751已有live祖先66283dd9982bdd7f480da7a4d9bfefea0572a9ac的SL预测分账及9d8278702dbc581b5015ba7ec9a70dc0fb94cccb的持牌/pending子项。未覆盖原提案要求的整轮实际结果与确定弃牌后分账；六次相关SL没有完整受控胜线，不能登记整项duplicate或改探索门槛。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-131042659448ae74

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, potion。

账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。证据：751FN9QM9MHQ F13 T3、F17 T7；states278403/278404、278500—278505。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md`；SHA256：`b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951`，原文完整保存在本批*.original.md。

处置：**waiting**。751 F13肌肉药实际建立5力量、F17 T7全挡后持一呼唤仍损6已核；敏捷/毒/荆棘/呼唤/药价各自预测不能替代联合实际结果。缺同题无药实战、选择与重问完整归属，保留饮药、护栏与弃牌规则。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-990f054036609447

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, sl。

账本：silent-0102, silent-0019, silent-0020。证据：KV0JHNJCKXLS F33 T5/T6；decisions273400/273450/273451；sl955/956。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md`；SHA256：`c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053`，原文完整保存在本批*.original.md。

处置：**waiting**。KV F33 T5首次题273400/273450同指纹，删毒药后两线均零损、敌净削36→29；T6动作也变。缺跨续问的毒/敌回血毛净伤分账及相同后继的整战，不能将少输出称为保血收益或定SL阈值。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-e18d3f18e6cac2a0

来源：postmortem → strategy-proposal；角色silent/A10；领域：combat, potion, sl, terminal。

账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。证据：L9SGRBB5R698 F17 T14、PU80F84P6HPN F17 T17、YQL8RZ8BWN1E F17 T10/T13；sl679/682、715/716、958—963；anchor引用另列。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md`；SHA256：`3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821`，原文完整保存在本批*.original.md。

处置：**waiting**。L9 F17 T14、PU F17 T17、YQL F17 T13的SL占位血原行已核；巨兽阶段/末态资源展示已有live实现。anchorRank仍用原始占位血作同轮排序，归零会改变旧平局选择；缺新参考路径完整受控后继与独立验证，PU第五试胜不证明新排序有效。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-9733bb80f445aeae

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, potion, sl, terminal。

账本：silent-0017, silent-0019, silent-0020, silent-0250。证据：YQL8RZ8BWN1E F17 T10；L9/PU F17；states280160/280161；decision274087。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md`；SHA256：`c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382`，原文完整保存在本批*.original.md。

处置：**waiting**。YQL F17 T10 states280160→280161只有毒2→8，HP26、挡13、来袭41不变；已有40168f4a903ae1d8c48bd03006f8fea19fd3aa3c展示此实录。缺提前用药/不喝/留药的整战及改参考排序的受控验证，不能把新增6毒当减伤或持有价值。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-c51468c5e8ba6668

来源：postmortem → strategy-proposal；角色silent/A10；领域：potion。

账本：silent-0019。证据：KEN58SH9SLZ6 F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1；states280206/207、280232/233、280262/263、280313/314、280315/316、280348/349、280354/355。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md`；SHA256：`168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469`，原文完整保存在本批*.original.md。

处置：**waiting**。KEN七次实际饮药逐槽位已核；攻击/技能药进入选择，发光水后重问，原候选中位例不保证实际选牌。缺逐候选与整轮实际效果归属、F15不喝及任一药留到boss的完整对照，保留持有价值与跨战预算。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-86a7db08d1a31976

来源：postmortem → strategy-proposal；角色silent/A10；领域：combat, sl。

账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。证据：KEN58SH9SLZ6 F17 T5/T9/T10；decisions274484/274601、274505/274568；states280701/280702；sl967—969。原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md`；SHA256：`10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6`，原文完整保存在本批*.original.md。

处置：**waiting**。KEN F17 T10第4/5试同指纹多损6仅多净削2；T5第4/6试省2血却将步法T5延至T9，且续问追加小刀。缺能力后继受控收益及独立时间留出验证，不能拟统一6血/2伤门槛或只保血排序。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

### silent-proposal-e282a9131b99129a

来源：experience-update → strategy-proposal；角色silent/A10；领域：combat, sl。

账本：silent-0021, silent-0079, silent-0125, silent-0176。证据：KEN58SH9SLZ6 F17 T5/T9/T10；同上一项配对题、sl与能力建立原帧。原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md`；SHA256：`a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872`，原文完整保存在本批*.original.md。

处置：**waiting**。KEN已有持牌、SL候选及首次派发诊断，actual_turn/actual_turn_result仍空。T5能力延迟与T10持牌血价均属一局相关SL，缺完整动作/选择归属、固定其他后继的整战与后期独立局，不能把已有子项报完整implemented/duplicate。

预期行为与验证：已有诊断保留；后续先从冻结题/原答/最终派发/选择/续问/末态建立可审计的兑现链，不猜未执行动作。策略变更须比较同一随机输入、保持其他后继一致的整战，并按独立局开始时间切分调参与后期验证；本局相关SL不拆成独立样本。证据不足时保持原排序及合法选项。当前无新提交；未来实际实现的回退以独立源码提交为单位，保留本批与旧失败材料。

## 验证、限制与交付

本批没有生产源码差异，scratch中的recheck-evidence.py仅做材料读取与断言，不是策略实现。未运行生产tsc/vitest/沙箱套件或撤源码对照；tests={tsc:null,vitest:null,cases:null}，不借旧通过记录冒报本批测试。fixes=[]、merged=null；没有新行为版本、release_id、shipped或大脑已采用声明；跳过空live合入。铁甲战士与其他角色行为无变化。

初轮材料脚本误识别run-plans局号字段、次轮误识别状态嵌套、一次源码路径定位错误和apply_patch写失败，原失败输出/修正前脚本保存在analysis-failures.txt及evidence-recheck-failed.log、recheck-evidence.before-fix.txt；修正后最终脚本exit0，原日志与历史材料均未改写。这些是材料分析错误，不是生产测试。所有结论局限六局/A10；相关SL不能当独立样本，未执行支线与后继因果保持未知。

只经根learner/ledger.py update补16个原账本的本批报告/提案路径与说明，保留原claim/status/version/effect，不新增重复经验或提案，不手改专用队列/根请求/旧done，不代运维标shipped。十个原CLI id沿原队列保持waiting，proposal_results由宿主消费；量化/入库父要求不据本报告关闭。没有新异议或与原知识冲突的新结论，已知限制与原复盘勘误全部保留。

提案绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-021302-s2/learner/runs/20261013-021319-strategy-proposal/proposal.md

报告绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-021302-s2/learner/runs/20261013-021319-strategy-proposal/report.md

原字节/角色/指纹/资源证据：raw-input-manifest.json、run-identity.json、postmortem-manifest.json、evidence-verification.json。最终JSON：result.json。账本CLI原输入与真实回执另存；最终HEAD保持base、工作树干净。

最终验收：材料gitleaks扫描exit0且报告为空，未发现密钥；16条账本CLI真实追加行的原偏移/字节SHA已保存ledger-cli-rows.json，全部只改where/note并保留旧claim/status/version。十项结果覆盖派发集合、HEAD=base、git status为空与tracked diff为空已核，见final-verification.json。阶段/药水/能力时点补充断言见supplemental-verification.json；这些仍是材料核验，不计生产源码测试或实际收益验证。
