# 静默策略提案逐项复核

批次：20261013-023513-strategy-proposal。角色：silent；六局均为A10。
基线：301ec89a8dc0cb2902e09918b5fe1ba62865c89a；开工git status干净，git merge --no-edit main返回Already up to date。
本批有10个proposal_ids，reason=proposal，没有research_request、implementation_request或proposal_repair；根专题绑定另一批次，保持本批普通队列职责。未读取其他角色知识，未领取额外提案。
已逐项核对原队列、保存的Markdown及SHA、既有账本和本角色原日志。所有原提案原文未改；本文件是本轮补充处置。

本轮结论：10项完整提案均waiting。现有子项保留并列事实与全部选项；没有找到由这批证据支持且尚未实现、可独立验证的新策略改动。不创建重复提案id，不用无关等待条件阻止确定性事实：已有事实子项已明确列出真实源码祖先；尚未观察的来源/组合仍未知。

## 1. 感染棱柱技能污染

提案：silent-proposal-c20b5139dd0dff71；原来源：experience-update；实现任务：strategy-proposal。
账本：silent-0168。
证据局/层/回合：DUZUBAJ3A8GP F27 T4—T6。
本批核验：T4污染0→3→6；T5火花6、污染0→6→12→18；T6轮初污染0。T4/T5实损3/9；同一场战斗，不将回合或技能数当独立局。
反例与未知：技能仍可带来毒与格挡；这组实损不能证明所有技能亏损。
旧行为/已有实现：turn-solver.ts:2034、2819已有当前火花累加及污染攻击修正；rollout.ts:2378已有移动表火花增长。
本轮处置：waiting。缺技能收益、火花增长与污染清除联合预测的独立校准，及相同抽序/资源下完整替线执行记录；现有实损不能拟合技能惩罚或证明完整提案已实现。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 2. 失落／遗忘抢夺返还

提案：silent-proposal-ae9e692d680e3819；原来源：experience-update；实现任务：strategy-proposal。
账本：silent-0183、silent-0005。
证据局/层/回合：5PM6JAQG6FNQ F39 首试T4—T6、末试T4。
本批核验：首试T4力量−4、敏捷−4；两步法后敏捷0，失落毒死后力量0；T6遗忘再抢使敏捷−2。末试毒杀失落仍死亡。
反例与未知：两次均失败，无固定击杀序的完整赢局；遗忘死后返敏在本批没有观察。
旧行为/已有实现：现场负属性与当前牌面能读到；未将通用负属性公式当作逐来源死亡返还实现。
本轮处置：waiting。缺遗忘死亡返敏、同属性多来源抢夺、临时属性混合返还的连续相邻事件及稳定实体身份；不能补一般来源模型或固定击杀序。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 3. 下水道蚌加压与当前进阶

提案：silent-proposal-52f1e1bd2e7db0ed；原来源：experience-update；实现任务：strategy-proposal。
账本：silent-0231。
证据局/层/回合：CA5KE8GFJ9X2 F13 T1—T5。
本批核验：T1/T3/T5力量0/4/8、喷水11/15/19；轮初覆甲9/9/8/7/6。T5弱后14攻击，2血10挡不足。
反例与未知：覆甲层数随回合下降与伤害同时发生，不足隔离完整减层条件。
旧行为/已有实现：monster-db.ts:711、843读取当前进阶观测，不设五样本攻击/HP门槛；room-costs.ts:47保留房间五样本门槛。
本轮处置：waiting。当前进阶首样本子项已存在；缺覆甲减层独立触发和叠加来源事件，历史实际移动表输入亦未冻结，不能认证整项成长/覆甲联合重放。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 4. 电击机器人逐实体成长

提案：silent-proposal-6dd8bbff876be528；原来源：experience-update；实现任务：strategy-proposal。
账本：silent-0233、silent-0209。
证据局/层/回合：5PM6JAQG6FNQ F38 T3—T4。
本批核验：同23上限电击T3/T4力量2→4、攻击17→19，高电压均2；T3实承伤，T4群伤后才退场。
反例与未知：另杀序候选没有完整执行；不能据预测省27血断言后场获胜。
旧行为/已有实现：rollout.ts:525将HIGH_VOLTAGE_POWER列入成长，:2364逐敌累加；新召唤由spawnedEnemy初始化。
本轮处置：waiting。缺同种电击新旧并存或替换的稳定实例身份与连续召唤事件；现有单实体2→4不覆盖全部计数不继承分支，不能关闭整项。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 5. 沙虫原答、护栏及SL分账

提案：silent-proposal-578e415a259e6835；原来源：experience-update；实现任务：strategy-proposal。
账本：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016。
证据局/层/回合：8JRE1C4H4Z2W F33 首/三试T2、第二试T5、末试T11。
本批核验：首/三试T2指纹相同：实损3→15、敌本体扣10→17；多12血换7扣血。末试已建能力仍未覆盖37攻击。
反例与未知：末试防御换线延长战斗仍败；不能将所有保血或所有舍挡认定错误。F17抽牌重规划不把候选省血当实付省血。
旧行为/已有实现：候选审计be69855995737d6f381adb10bf248964832da24b；护栏审计f1542578594462e9f9f4e175488795fc480a8a13；派发回执fdaf787a372880b0438e73bcac7e6d2168b038ed，均为实际live祖先。
本轮处置：waiting。原答/护栏/SL候选与单动作回执已有；缺跨抽弃牌重规划完整执行归属、中间事件完整性及能力累计收益链，不能把单次派发记为整轮完成。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 6. 实验体全败SL资源代价

提案：silent-proposal-c0767768bf6a7ab1；原来源：postmortem；实现任务：strategy-proposal。
账本：silent-0079。
证据局/层/回合：YF0LXT1QSTGG F48 第二/三试T1、第四试T5；F33第二试反例。
本批核验：第二/三试T1指纹相同，实损0→9、扣敌45→38；少7扣血多9血价。候选未来损失封顶不抹掉这两个差值。
反例与未知：F33第二次SL获胜；F48第四试T5弃牌后切回防御，候选未整轮执行。第六试恢复续步仍败。
旧行为/已有实现：候选资源比较5604982e13890e0e2bc8bf8246272e8267321c0b；单动作回执fdaf787a372880b0438e73bcac7e6d2168b038ed；两者明示实际整轮未知。
本轮处置：waiting。缺覆盖重放/弃牌后的完整执行证明及相同资源、随机输入下完整获胜替线；不能拟合探索禁止条件或血价系数。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 7. 实验体分阶段毒与能力兑现

提案：silent-proposal-a46bdb7fe711d79a；原来源：postmortem；实现任务：strategy-proposal。
账本：silent-0021、silent-0027、silent-0028、silent-0085。
证据局/层/回合：YF0LXT1QSTGG F48 末试T3—T5。
本批核验：T4新阶段212、旧毒/力量0；T5已建触媒2而当前毒0。先获得的5敏捷产生23挡，后增6敏捷不倒补已生成挡。
反例与未知：前五试有毒雾/余像已建立仍败；不能把未启毒当唯一败因或制定必先能力。
旧行为/已有实现：aad2700abed6dff1d66e87fb36aaa6fedb39adf3已提供持有/当前阶段/已建能力/当前毒事实，并把已兑现毒伤保留null。
本轮处置：waiting。当前帧事实已有；缺跨阶段逐伤害来源事件与跨抽弃牌候选完整执行链，不能认证累计能力收益或改候选排序。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 8. 双蟹零胜并列的SL血价

提案：silent-proposal-1044224808015e5c；原来源：postmortem；实现任务：strategy-proposal。
账本：silent-0079。
证据局/层/回合：XP2SL33HT0D9 F33 首/二试T3、首/末试T1。
本批核验：T3同指纹实损9→14、扣血24→27；T1同指纹实损2→10、扣血25→34，换线同时带力量成长。
反例与未知：末试T2零损、T3损4；不能仅按挡牌数或当轮总输出判断朝向/减力收益。所有六试仍败，六试只计一局。
旧行为/已有实现：5604982e13890e0e2bc8bf8246272e8267321c0b已有预测资源差；现有SL保留B2/五轮有限样本比较。
本轮处置：waiting。缺相同资源与随机输入下完整受控替线、独立后移验证和可获胜反例；B2零胜并列不足启用固定低当轮损血优先或全局血价常数。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 9. 双蟹朝向、临减与轮初挡

提案：silent-proposal-7cbc6005db712ba9；原来源：postmortem；实现任务：strategy-proposal。
账本：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242。
证据局/层/回合：XP2SL33HT0D9 F33 末试T2—T5。
本批核验：六试T2轮初14挡；末试镣铐0→−9力、4→0攻击，T3恢复0；T4激光57→38→28。这些是分开的观察贡献。
反例与未知：4敏捷脆弱下偏折/防御各6挡仍实损22/11；后取得力量不能倒算先前命中。轮初14不能当每轮挡。
旧行为/已有实现：当前现场意图、临时力量、朝向与生成格挡已有局部模型；未把只读条件参考或固定帧当联合候选收益证明。
本轮处置：waiting。缺联合候选收益、额外触发来源隔离及混合意图缺值的明确语义，不能认证整项机制包或改优先级/持续价值权重。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 10. 宽机制包与SL兑现分账

提案：silent-proposal-c59f592f1427a67e；原来源：experience-update；实现任务：strategy-proposal。
账本：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242。
证据局/层/回合：YF0LXT1QSTGG F48 第二/三试T1、末试T4—T5；XP2SL33HT0D9 F33 首/二试T3、末试T2—T5。
本批核验：以上三组SL血价与临时减力/轮初挡/阶段毒/后取得敏捷均由本批原帧核验；SL恢复、路线回血、药水使用分开。
反例与未知：同存档尝试相关，组件各自支持局数不能合成整包胜因；没有留药/替线受控赢局。
旧行为/已有实现：上述五个实际live祖先已提供候选、护栏、单动作回执与阶段现场事实；都是宽提案子项。
本轮处置：waiting。缺完整累计收益、跨重规划因果归属和恢复资源全链；局部事实及单次消费者字段不能认证完整包、量化父项或自然采用效果。
预期后续行为与验证：保留原候选与选线；冻结该局的原始观测、实际动作和实际当前进阶输入，核验上述缺口。若改变策略，按独立局作发现/后移验证；同存档尝试不跨训练和验证集合，不要求未知结论必须成立。新增源码须撤源码失败/恢复通过并执行原沙箱入口。
拟合与回退：本轮不拟合阈值或血价权重，未发布代码，回退不适用；后续实际变更单独提交并以真实live源码commit回退。

## 范围与材料

全部原文见original-proposal-01.md至10.md；SHA与专用队列历史见proposal-queue-history.json、proposal-queue-folded.json。
runs-matching.json记录六局角色/进阶/运行code；六局运行均带dirty，本轮未复原历史dirty树，不将当前源码当历史实际加载输入。
原字节材料见各run-states/decisions/run-plans/sl-attempts.jsonl及raw-evidence-manifest.json；本轮并未分析全历史知识，仅核本批六局。
证据核验：8074条按原偏移/字节/SHA逐项全等；30项机械断言通过（verified-evidence.json）。这些不是tsc/vitest、撤源码红绿或策略效果测试。
状态4062、决策3941、计划33、SL38；3941/3941决策observed_ts回连原帧。每项断言引用本批原文件行号，原proposal中的大日志行号另保留。
初次run-plans抽取使用run_id得0条，核原字段run后补齐33条；初始manifest留raw-evidence-manifest.initial.json。首次探索combat=None导致只读摘要失败，修正为筛in_combat后重读；无状态/源码变更。5PM两个楼层的尝试编号初稿全局递增，保留normalized-5PM6JAQG6FNQ.initial.json，正式材料按楼层从1计。
源码核验切点live=f791ed9ea8f462723d371eda8c88fce2393c60f0，五个子项源码commit均为其祖先。11路径本批/实际live提交/工作文件SHA见source-ancestry.json；四共享文件字节差异仅Roy→Dai署名替换，其余七路径全等。不将动态live差异当本批源码变更或冒造合入。
第一次源码探针要求全部路径全等，在combat-plan.ts终止；保留实际diff与SHA，修正为逐路径核查，并确认上述四差异仅署名替换。
启动器PID下未获得可读的原生模型实参，runtime-model-observation.json记录限制；不能据默认设置声明实际模型/强度已切换。
本轮没有新的机制异议、反证或旧知识冲突；原提案既有反例全部保留。没有关闭学习入库/量化父要求，亦不冒称经验入库或自然采用。

## 验证、登记与交付

无生产源码/知识改动、提交或合入；fixes=[]，merged=null。tsc/vitest/cases均null，未运行源码测试；撤源码失败/恢复通过不适用，没有游戏版本、shipped或规则上线通知。
仅通过根目录learner/ledger.py update向30个既有账本追加本轮报告/提案链接和处置说明，不改原claim/status/version，不新增重复证据或账本id。CLI输入/输出保存在ledger-update.jsonl及ledger-update.stdout/stderr。
交运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-023513/learner/runs/20261013-023532-strategy-proposal/proposal.md。报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-023513/learner/runs/20261013-023532-strategy-proposal/report.md。每个派发id的具体waiting理由见result.json；保留待新局重派，已有子项不冒记整项duplicate/implemented。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261013-023513-strategy-proposal",
  "base": "301ec89a8dc0cb2902e09918b5fe1ba62865c89a",
  "runs": [
    "DUZUBAJ3A8GP",
    "5PM6JAQG6FNQ",
    "CA5KE8GFJ9X2",
    "8JRE1C4H4Z2W",
    "YF0LXT1QSTGG",
    "XP2SL33HT0D9"
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
    "silent-proposal-c20b5139dd0dff71",
    "silent-proposal-ae9e692d680e3819",
    "silent-proposal-52f1e1bd2e7db0ed",
    "silent-proposal-6dd8bbff876be528",
    "silent-proposal-578e415a259e6835",
    "silent-proposal-c0767768bf6a7ab1",
    "silent-proposal-a46bdb7fe711d79a",
    "silent-proposal-1044224808015e5c",
    "silent-proposal-7cbc6005db712ba9",
    "silent-proposal-c59f592f1427a67e"
  ],
  "implementation_domains": [],
  "proposal_results": [
    {
      "id": "silent-proposal-c20b5139dd0dff71",
      "state": "waiting",
      "reason": "缺技能收益、火花增长与污染清除联合预测的独立校准，及相同抽序/资源下完整替线执行记录；现有实损不能拟合技能惩罚或证明完整提案已实现。"
    },
    {
      "id": "silent-proposal-ae9e692d680e3819",
      "state": "waiting",
      "reason": "缺遗忘死亡返敏、同属性多来源抢夺、临时属性混合返还的连续相邻事件及稳定实体身份；不能补一般来源模型或固定击杀序。"
    },
    {
      "id": "silent-proposal-52f1e1bd2e7db0ed",
      "state": "waiting",
      "reason": "当前进阶首样本子项已存在；缺覆甲减层独立触发和叠加来源事件，历史实际移动表输入亦未冻结，不能认证整项成长/覆甲联合重放。"
    },
    {
      "id": "silent-proposal-6dd8bbff876be528",
      "state": "waiting",
      "reason": "缺同种电击新旧并存或替换的稳定实例身份与连续召唤事件；现有单实体2→4不覆盖全部计数不继承分支，不能关闭整项。"
    },
    {
      "id": "silent-proposal-578e415a259e6835",
      "state": "waiting",
      "reason": "原答/护栏/SL候选与单动作回执已有；缺跨抽弃牌重规划完整执行归属、中间事件完整性及能力累计收益链，不能把单次派发记为整轮完成。"
    },
    {
      "id": "silent-proposal-c0767768bf6a7ab1",
      "state": "waiting",
      "reason": "缺覆盖重放/弃牌后的完整执行证明及相同资源、随机输入下完整获胜替线；不能拟合探索禁止条件或血价系数。"
    },
    {
      "id": "silent-proposal-a46bdb7fe711d79a",
      "state": "waiting",
      "reason": "当前帧事实已有；缺跨阶段逐伤害来源事件与跨抽弃牌候选完整执行链，不能认证累计能力收益或改候选排序。"
    },
    {
      "id": "silent-proposal-1044224808015e5c",
      "state": "waiting",
      "reason": "缺相同资源与随机输入下完整受控替线、独立后移验证和可获胜反例；B2零胜并列不足启用固定低当轮损血优先或全局血价常数。"
    },
    {
      "id": "silent-proposal-7cbc6005db712ba9",
      "state": "waiting",
      "reason": "缺联合候选收益、额外触发来源隔离及混合意图缺值的明确语义，不能认证整项机制包或改优先级/持续价值权重。"
    },
    {
      "id": "silent-proposal-c59f592f1427a67e",
      "state": "waiting",
      "reason": "缺完整累计收益、跨重规划因果归属和恢复资源全链；局部事实及单次消费者字段不能认证完整包、量化父项或自然采用效果。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-023513/learner/runs/20261013-023532-strategy-proposal/report.md"
}
```

最终验收：HEAD保持完整base、git status空、git diff base空；10项结果完整且均waiting，30条根CLI追加已读回、未改变claim/status/version/evidence。gitleaks dir退出0，扫描163.92MB、无密钥发现（gitleaks.stderr/gitleaks.json）。工作树干净，未提交、未合入、无新版本或shipped。
