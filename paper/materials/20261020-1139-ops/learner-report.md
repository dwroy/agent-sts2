# 两局静默猎手复盘与机械提证报告

记录时间：2026-10-20 11:37（北京时间，写前已运行date；具体工具回执保留）。任务：20261020-111330-a854916e-42b3-454d-bf4b-60f5ee0c579f-postmortem；角色silent；仅记录/提案，无源码更改、提交、推送、开局或下级agent。

两局均在runs.jsonl找到唯一结束记录，character=SILENT、A10、F17、victory=false；写前lessons没有同名标题。两节已各通过一次cat追加，原文件前缀SHA不变，verification.json确认正文与已核初稿逐字一致。初稿发现的F8击杀顺序及天选ID问题在追加前修正；追加后未发现需勘误的数字。

MWMR855QHTWR：三次59/70血进同族；前两次T6判死截断，末T8以9血21挡对信徒14＋8×2攻击死亡，结毒后两信徒29/47、神官106/199。主要补silent-0005、0418、0278；敌增力另补0012。没有新增纯bug；末态残毒药不证早饮必胜。

T12TSEMGUU7F：首试首帧34血、首次就绪36血，后三试直接36血入口；前三试T8/T7/T8判死，末T8以6血0挡对行动前9攻击死亡，18毒后敌29/221。前置F9精英赢但63→4、F12精英赢但25→1，不能省去赢战血价。新bug silent-0533：普通撕碎对仅中毒目标实扣15，卡牌模型只读10且known=true；新机制silent-0534只限这一隔离窗口。其余支持0020、0209、0011、0046、0211、0259。

## 冻结、原文与身份

按要求先启evidence_summary.py和四流extract_evidence.py，另启两次resource_chain.py；随后只按局号过滤/字节seek读取原始日志。提证脚本默认对象库位于ops，超出本任务临时写入边界，因此使用其已有--object-store参数，明确存到任务目录objects，其余参数保持原要求。没有更改提证源码。

- evidence-summary.json是有限索引，SHA为3e079ededdb0dcb4115e24b38398b1999d058da2c35424172e7bd1b37e49dec8；不是完整机制证据。
- v6-evidence/evidence-manifest.json保存v6-build、jev-prompts、decisions、run-config冻结切点、全流SHA、异常/身份缺口与输出SHA，实际已读。
- raw-manifest.json与*.raw.jsonl另保存states、run-plans、sl-attempts、runs、fight-plans的冻结切点及逐行path/offset/bytes/SHA。没有将states全流或所有本局帧输出到模型上下文；脚本完整流式筛选，模型只看必要帧和结构化窗口。
- audit_refs.py按原日志offset/bytes重新读取并核对SHA及原对象：145条V6、201条Jev、709条decisions、4条run-config、753条states、108条run-plans、7条SL、2条runs，全部一致。coverage.json保存结果。这个机械读回分母不等于完整题面的人类语义覆盖。
- 两条流本批所选原行身份均有显式run_id（Jev还含fingerprint.run及精确decision_ref）。只用这些归属；未用正文提及、相近时间、相似question_id归局。V6方向question_id不是动作ID，未强造动作关联；非战斗UUID只在与decisions.decision_id完全相等时建立关联。
- 全局历史流有Jev无效JSON1行、decisions无效JSON2行；manifest保留原偏移及SHA。历史未归属decision行、unknown_identity、unmatched_decision_id不猜配成本批，也不解释为本批零缺失。
- deepseek-window-manifest.json冻结按两局首末决策时间窗筛选：两窗均无行，源最后时间仍在更早日期。不能把旧DeepSeek推理套入Codex局；兼容deepseek字段中的实际引擎另核为Codex。
- fight-plans按显式身份无匹配，保留缺失；不存在可借用的本批整场计划流。没有跨角色借证。

## V6各字段的含义和缺失

MWMR匹配29行：act1、replan22、card_pick1、shop4、rest1；6道非战斗选择都known=0而转大脑，jev_answer全部null。V6原行1的entries=[]、unknown={count:0,total:0}与brain_request_failed同时存在，不能解释为模型已知全部；拿牌/商店/休息的空entries表示门槛回退，不是收益0。原行6为known0/4、27为known0/14，均有v6_unknown_to_brain。第一段run-config没有V6字段，后两次重启显式on；不能把整个跨重启局称单一V6版本，或据历史缺流补成off/on。

T12匹配116行：act2、replan97、card_pick6、shop8、rest3；17道非战斗选择都known=0而转脑，jev_answer全部null。原行30的369条entries有327 unknown；检查首entry具体win、paired_delta、availability、direction_value等全null，保持unknown。该条只读了头部与首entry，不把一条已知样例或聚合计数称全表语义验收。原行31明记prompt_truncated:359382:63483:64000:chars，题面完整性因此受限；它不是传入方向脑的完整原题/原答证据。两局后段run-config的reflex均off，V6 mode on不证明所有子模块已启用。

V6六条短原行完整阅读：1、6、27、31、40、143。其余139行只机械验证原字节、读取头部/字段计数；其中行30另读首entry。未逐项阅读全部构筑评估表，因为本次目标是两局关键死因及资源链，且完整科学验收不在本次完成范围。具体原始引用全部在coverage.json。不能把fallback=null解释为采用成功，不能把entries存在或题面存在解释为执行/收益。

## Jev完整题面覆盖与后果

MWMR匹配95条Jev日志，94条有answers、1条有error；T12匹配106条、106条有answers、没有error字段。以下六题逐一读取完整request（含state、全部选项与指令）、answers/error，并核decisions chosen/result/gate_reject/selection_dispatch与后继states。请求原字节SHA及身份引用见后附表/coverage.json，完整选中原行另存question-j*.json。

1. MWMR，Jev:70519 → d442074，精确decision_id=ab64b372-0637-457f-b37c-d09431a0ecf8。首领第2试T3，有end_turn计划、技能药及三个毒药目标；error=human-pace budget exhausted: Jev，无answers。代码chosen=end_turn，result完成；gate_reject字段缺失；selection_dispatch为单动作返回、state_effect_verified=false，不能当整线审计成功。s457433→457434实54→35损19，与该题当轮模型一致。后续仍到T6判死读档，不把error当Jev主动选错。
2. MWMR，Jev:70542 → d442124，decision_id=1b04f929-0597-4be5-be4a-fff07be4a179。末试T8技能药三选一本能反应/杂技/隐秘匕首，选杂技信心0.01；chosen=选择1、result完成，gate/dispatch字段缺失。随后s457484拿到杂技，d442125实打，进入抽弃重问，不将生成候选直接当整线输出。
3. MWMR，Jev:70546 → d442128，decision_id=f8d06ee5-2369-4176-bf80-4fca30710664。全八个弃牌候选及原后继22挡/损8/伤17可见，选标明移除后继的生存者，信心0.29；chosen=选择3、result完成，gate/dispatch缺失。s457488实际手牌无生存者，后续防御+/手上技法实得21挡，原22挡预测失效。
4. MWMR，Jev:70549 → d442131，decision_id=f59a0f30-761e-4df3-a924-8ec9365d79e9。三种毒药目标及结束四选，结尾明确lethal；选end_turn信心0.08，同时survival选择lethal。result完成，gate/dispatch缺失。s457490→457491死亡，神官111→106、信徒32→29。题面存在不表示喝药或有收益；留药并非已经证明可避失误。
5. T12，Jev:70576 → d442261，decision_id=aabf09ff-320c-48f4-ae10-3e0d2116520d。F9T6两条完整候选：三攻击击杀一只/当轮损10、双防御带毒刺击不击杀/损12；后者5轮8样本全胜。选plan2信心0.92，result完成、无gate_reject，dispatch只证明首防御已返回；d442262/442263续步与s457644—457647实完成双防御＋刺击，16→4、血池28→19。未选plan1没有实盘后果，不称它更优或必胜。
6. T12，Jev:70655 → d442497，decision_id=b3fe7551-5373-4621-9f33-2eda88da99e1。末试T7无色药三选震荡波SHOCKWAVE/天选ANOINTED/撕碎REND，原题明确本轮免费、0能量、即将净受22。选撕碎信心0.35，chosen=选择2、result完成，gate/dispatch缺失。s457893出现普通免费REND，d442498实打，s457894直扣15；之后独立17毒、玩家掉22至6。没有其他生成选择的实际后继，不能称换震荡波可赢。

完整题面未读：MWMR余91条、T12余104条，共195条。逐题run_id/decision_id/ref已列coverage.json的jev_requests_not_fully_read。它们只用于机械身份、字段计数或必要候选/资源窗口，不认证全题阅读；未完整读的原因是本次按关键死亡链选取有限题面，不能以末五条或六题代替全批覆盖。其他关键大脑题仅核所引用的理由/选项及HP参考，未完整阅读所有非战斗候选表。机械取证并不完成V6发布验收、下一局消费、自然采用或收益验证。

## 资源链、数字与代码定位

每场含胜战的HP/maxHP/带槽药水、入口/出口时间及原行、SL窗口与逐回合需清/可见扣下限/缺归零/净HP变化均已追加lessons；详细结构在两份*-resources.json、metrics.json、turn-audit.json。每个入口/出口都从原日志按偏移核回。末次GAME_OVER和胜战REWARD核实际出口，前面SL截断不当实际死亡。净HP变化包含开场/再生/自伤，不能当敌人总伤害。辅助ID+最大HP仅限本场可见唯一体，无永久UID时不补造个体身份。

新bug代码对照：.worktrees/live/agent/src/reflex/card-model.ts:910、1168；turn-solver.ts的通用伤害路径未接REND目标额外伤害。source-commit.txt、source-sha.txt与source-diff.patch冻结当前代码参照；只取两个必要源码叶，未归档全仓。固定原帧读回得到damage10/knowntrue，未做完整求解或线上行为修复；首次tsx CLI受沙箱IPC限制EPERM失败，后用node --import同一脚本成功，失败保留。无代码提交，本任务不跑生产tsc/vitest；后续实现任务须按原要求测试和上线。

复查关键数字已直接回原帧：MWMR入口59、末9/21、三敌29/47/106；T12入口34与就绪36、后三入口36、末6/0、敌29、撕碎91→76。verification.json确认旧lessons前缀未改、两节各唯一、内容与核验初稿一致。没有追加后勘误。

## 账本、提案和未记录

MWMR更新silent-0005、0418、0278、0012，均support；T12新增silent-0533（bug-infra）、0534（mechanic），observed、prior=unknown；更新silent-0209、0020、0011、0046、0211、0259，均support。保留旧claim/first_run/prior/status/version；不把单局失败当同一可避错误repeat。find回读分别确认本局4项/8项；ledger.py check为534项、0问题、退出0。随后CLI提案链接只追加where/note，没有提升为implemented或shipped。

- MWMR：silent-proposal-6f6eb897c8450b80，proposal-MWMR855QHTWR.md/.json，postmortem→strategy-proposal，combat/potion/terminal。原规则保留，待独立任务核现有实线归因消费者，未证在线规则须改。
- T12：silent-proposal-afa703f560808b8f，proposal-T12TSEMGUU7F.md/.json，同一任务链和领域。拟仅修普通REND单毒/无修正签名漏算及未知标记；升级、多负面、其他角色/阶/修正没有验证，禁止扩推；不承诺修正获胜。

两项只登记pending，不把队列登记称派发完成、模型已接单、已实现、已上线或自然收益。无implemented_commit字段。

写成“未记录”的项：两局独立毛伤、未执行替线的整战后果、完整原候选执行比例、旧式boss时钟需要/估计及实打/估值字段、Jev缓存命中、原生请求实际推理档位；MWMR另缺剔除长暂停的活跃操作用时；T12另缺其他路线投影、同ID多体永久身份/完整逐体击杀序。V6完整方向原题与原答、截断部分、全表已知采用/自然收益保留未知。无缺失补零、跨角色借证或正式发布声明。

## 冻结切点与六题原文定位

|流|冻结字节切点|全流SHA256|
|---|---:|---|
|v6-build|26020938|eae674703b2497dc5d606eb614914b329985ca473a91c6a59ee32656a530802f|
|jev-prompts|1859040035|6ddefc613eeefcc58fe49ce9274d8f63dd099caa58d251d266d67efbc6913202|
|decisions|2801708891|e63ac6a57bd0c0ee5ba9bb30ab934963ccc4d702eb2c60a588a72fa3900b0c23|
|run-config|2199999|ab206150d4a9651bb18bf39dc9bd5834e4e3f2a73282f7797fae02d2e4e80430|

|Jev原行|局号|原字节offset|bytes|原行SHA256|精确decision_id|
|---:|---|---:|---:|---|---|
|70519|MWMR855QHTWR|1818680881|198366|f0b1cc904c531067594ff84b78aaab43773150e41cfc75860878ea8428476832|ab64b372-0637-457f-b37c-d09431a0ecf8|
|70542|MWMR855QHTWR|1827644094|5069|7486a80d4df04c96d4690f17c6e345649973a3d6cb658003c8222351bc9ed7b4|1b04f929-0597-4be5-be4a-fff07be4a179|
|70546|MWMR855QHTWR|1828721677|7461|90d9c50d3382cd7a0b0415fcbc5b0bae79045d53b027a669c848c957314a7a12|f8d06ee5-2369-4176-bf80-4fca30710664|
|70549|MWMR855QHTWR|1828756745|9638|dd90304b20ffa4aee34b04e1d1c28a36cd6699110652caf66c687a2ceac13f01|f59a0f30-761e-4df3-a924-8ec9365d79e9|
|70576|T12TSEMGUU7F|1832709829|136518|741784e4292102255617770836e5393fc8a17a93c4eb2d1290a1fdc2cd6570b5|aabf09ff-320c-48f4-ae10-3e0d2116520d|
|70655|T12TSEMGUU7F|1859034902|5133|e9056e8cef690516e4638cbbfb9a7376172849ad6a2b46231ef5e28f0368ded8|b3fe7551-5373-4621-9f33-2eda88da99e1|
