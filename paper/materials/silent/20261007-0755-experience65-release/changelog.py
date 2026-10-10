import json,collections,subprocess,hashlib
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));by={e['id']:e for e in E['entries']};S=json.load(open(O/'slice-summary.json'))
commit=(O/'commit.txt').read_text().strip();stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();title=f'## 2026-10-07 静默猎手 第六十五次增量：2 局 A10（version 2026-10-07.11，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
lines=[title,'','### 来源','',f'- 记录时间{stamp}。只读notes/lessons.md:5311的02HB4L0C3C67、:5317的T3FW7R2R2306及随后勘误；中毒已建模仍折扣bug首证按K3676LU8B0UH A1，C48尚未建毒模型不当首证，勘误时间按date实际07:28:01。两局runs.character均SILENT、A10、F12/F8败，无跳过；run-1007局报对应日期2026-10-07，last_seen取此日期。',
'- 开工exp-silent干净，从e9acfb0c经git merge --no-edit main快进3b3711c5，无冲突。先读README、最新STATE、最近决定、学习协议，以及铁甲首次/末两节的方法和静默第63/64节。独立执行，无下级agent；抽取单进程nice19，不跑boss模拟池。',
'- 截至T3FW7R2R2306结束2026-10-06T22:57:51.524Z，82静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/42局。旧1233房70实死加新6+5房2实死＝1244房72实死；A10四十二局530房42死。MCCK2602T1SR仍仅进数字；旧无character局、其他角色、进行中及后续局排除。',
'- 新日志按12位run id的rg分流211/154 decisions、12/8实际Codex请求、2/1 run-plans、42/24 Jev题、0/0原始SL行；states从8196141439后seek时间流读221/158静默帧，365条决策observed_ts/指纹全一致。DeepSeek同窗seek0条，ds字段为兼容名称，不冒称DeepSeek实际调用；e33ca6e0+dirty/98df162d+dirty不冒称完整源码复原。全部原片段、偏移、脚本、复算/分帧/历史机制259段及切片原文在learner/runs/20261007-073027-experience-update。',
'- 沿第64节：首COMBAT→同房最终尝试末结算HP净损，死亡单列，负回复保留；Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战、Ancient排除、多源可指同战；回血后按run/floor去重，TD1同房重启仍一房。读档不作回血，死亡余血截断不作完整需损，未结算毒不预支。',
'- 先重执行旧80局各自原抽取脚本；七数组、全部血档/源节点/回血/SL与第64节逐行一致，无对不上的数字。新02HB首火前四Monster共损46，问号海洋混混另损6；T3 F3问号小啃兽零损，与F5实际Monster藤蔓分账。两局死亡完整需损12/17，实际按余6/16截断。',
f'- 开工136 active/49920字<55000，无强制压缩。新增0、更新7（全加证据、纯数字0）、退役0；active136/{C["after_chars"]}字，高66中41低29。骇鳗、异鸟、路线、休息用同主题汇总替换重复案例，其他条目补证；无合并退役，预算60000不改。potion:*与general:potion逐对象保持，其他旧含药分句逐字保留，新增证据仅非药水部分，不加药水规则。机制沿[0,20]、策略统计沿[8,20]，未出现需缩进阶的策略反例；成立机制下的败局不当反例。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色/旧基线 | 旧80局七数组及血档/节点/回血/SL逐行一致；新11房2死，合82局1244房72死 | 角色、局、房、尝试、实死分账 |',
'| 营火前走廊与问号 | 02HB F2/F4/F5/F6 Monster损0/2/29/15合46，F3问号另6；56→4首火前合52，预计F7到44实4 | 延后精英与更多营火不抹掉到火前的战损，替路线未实打 |',
'| 休息与事件血价 | 02HB两火各21合42，潜水付7/重抽移除付3合10，骇鳗入36；T3唯一火40→61 | 实回、实支、未来投影分开，不定拒事件或锻造必胜 |',
'| 飞靴与保留精英 | T3 F2改F6普通战为问号附魔，F7飞靴避精英分支投影F9为61/p75 58，保留线投影32/22；实际F8 61→0、靴余3，F9未到 | 已改线与后来未使用机会分核，没实打跳线不宣称因果更优 |',
'| 骇鳗阈值/活力/易伤 | T3轮活力6将18→24，中和弱后18、10挡损8；T6敌96→72跨75取消12攻，T7施99易伤，T8无活力18→27、15挡完整需损12杀6血 | 眩晕只取消当前攻击，后段剩血与威胁仍计 |',
'| 敌力量与逐段虚弱 | 02HB佣兵同招力量0/2/4显示8×2/10×2/12×2；T3异鸟力量0—5、啄击15/21/27，T4弱后5×3=15 | 力量每段放大，虚弱逐段取整，当前减伤不关闭后续成长 |',
'| 毒雾实际收益 | T3异鸟T1建2，T2—6实毒2/3/4/5/6合20，攻击57，总77仍缺13；末毒5未再结算。藤蔓T2建、T3—6各2/3/4/5并过关 | 毒真实成长，未发生毒不预支，持有/建立/兑现分账 |',
'| 护栏局部对照 | T3异鸟T1原线预计损14/伤15，改线损6/伤9并保留毒雾，实兑现；原线推演结束6/8对改线2/8，整场原线未实打 | 省当轮8血少6伤，不证明保血净赚8或原线能赢；不是纯bug |',
'| 构筑与足额击杀 | 两局终17张0升级，没有计划中的步法；02HB未取得毒雾，骇鳗八轮伤114缺36；T3取得且T1建毒雾，六轮77仍缺13 | 未取得成长0收益，已建成长也须核可活轮，缺受控替构筑因果 |',
'| SL与时钟 | 两局0 SL行/读档；历史真正重打74场322试26赢、A10 41场181试14赢不变。未来boss均1000样本原胜率0/校准0.0474，投影血55/45及58，均未抵boss | 无新同抽牌重打经验，不把未来boss模拟当下一精英胜率；每轮时钟未记录 |',
'| 中毒攻击折扣纯bug | T3 F8 T3/4/5预测14/10/17、实际18/13/23，少4/3/6；K367 A1更早毒已正确结算但双打击各6折4、整伤23预测19 | 真实数字保留，错误模型声明仅代码问题，不给DS新规则 |',
'','七数组重算：','','| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
lines+=['','死亡率分母为战斗房、局数另列；活场净损中位排除实死，保留负回复。A0—A9全部格与上一节一致，完整各阶格/局号/损值见audit.json。A10全部非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for b in A['bands']:
 if b['asc']==10 and b['n']:lines.append(f'| {b["act"]} | {b["type"]} | {b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{100*b["deaths"]/b["n"]:.2f}% | {b["median_win"]} |')
lines+=['','源节点以源入血关联下一战，多源可指同战；是观察，不是节点选择效果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for b in A['transfers']:
 if b['asc']==10 and b['n']:lines.append(f'| {b["act"]} | {b["screen"]} | {b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{100*b["deaths"]/b["n"]:.2f}% | {b["median_win"]} |')
lines+=['','各进阶独立局数、回复与SL：','','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合 | 回血后战/死/活损中位 | 真重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for a,r in enumerate(json.load(open(O/'rest-summary.json'))):
 sl=json.load(open(O/'sl-summary.json'))[a];ff=[f for f in A['fights'] if f['asc']==a];lines.append(f'| A{a} | {r["runs"]} | {len(ff)}/{sum(f["death"] for f in ff)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {sl["fights"]}/{sl["attempts"]}/{sl["wins"]} |')
lines+=['','- 低血不同节点沿旧例重核：MGA0CZDDKC0P A10休息22→43后Monster损17活、4D4J8USKCPAV休息1→22后Monster损1活，D4LJ9QMGFB8Q事件13与BVF22RSFVBS9事件21后走廊死；本次02HB两低血火指同场精英死，T3休息后精英死。敌人、构筑、节点间隔和回复混杂，不由这些观察推出休息/事件/改线优劣因果。旧SL原始explore/sl_attempt/draws与逐回合仍在audit.json及各局analysis/decisions；新局无重打，不新增固定boss/精英SL规则。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 同窗DeepSeek0条，实际20请求全Codex；brain.knowledge仅经验摘要/ID，没有可隔离“引用某条经验导致反向执行”的原话，不由败局自动写repeat。以下只列计划与执行差异，原话全文及时间见journal-quotes.json。',
'- 02HB F1路线原话：“四火保血与升级，延后精英待构筑成形，商店补强巨兽战。”首火前损52、两火实回42、终0升级，商店F15未到。F11休息原话：“Heal to 36 HP. At 15 HP without potions before a forced elite, immediate survival outweighs any single upgrade.”当下36兑现，未来boss45投影未兑现；不把未到boss当当前生命。',
'- T3 F1原话：“四战补输出，两次飞靴串双精英四营火，末段商店备战。”F7原话：“Heal to 61 HP before the potionless elite; keep the immediate post-elite rest and preserve Boots for later flexibility.”61兑现但精英后营火未到，靴3次未用；F2确实先改过路线，不写从未改线。原话含药只作日志引用，不写用药建议。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[('力量/虚弱','每段加力量再逐段核虚弱取整；敌力量增长、我方固定遗物增伤与最终血价分账','silent-strength-weak-observation','02HB4L0C3C67 A10佣兵同招两击16/20/24；T3FW7R2R2306 T4三击21弱后15'),('毒雾轮初','建2后旧毒结算减1、下轮补2，单结算净增1；活到的实际结算才计伤，敌加力缩短可活轮','silent-noxious-fumes-growth','T3FW7R2R2306 A10异鸟T2—6毒共20、直接57、90血仍13，藤蔓同能力过关'),('骇鳗阈值/活力/易伤','跨75取消当前12攻，之后99易伤放大18→27；8轮需150而仅伤114，单次眩晕不完成击杀','silent-terror-eel-vigor-vulnerable','02HB4L0C3C67 A10 T6保6血、T8 15挡仍需损12，敌余36'),('异鸟力量/多段','每段基伤加现场力量再核虚弱；无攻击的防御轮仍见加力，触发条件未隔离','silent-byrdonis-strength-multihit-observation','T3FW7R2R2306 A10力0—5，T6啄击27、10挡需损17杀16血；4D4J8USKCPAV同六轮增长而过关'),('能力建立/保血观察','未得/未建0收益；已建毒仍须足额击杀，局部省血与少伤相伴，没有原线整战对照','silent-deck-burst-observation','02HB4L0C3C67无步法/毒雾末缺36；T3FW7R2R2306护栏保毒雾、省8少6仍T6死')]
for name,infer,i,case in mechanisms:
 e=by[i];dist=collections.Counter(R[r]['ascension'] for r in e['evidence']);proof=f'{e["n_support"]}/{e["n_contradict"]}；'+','.join(f'A{a}:{n}' for a,n in sorted(dist.items()));lines.append(f'| {name} | {infer} | {proof} | {case} | {i} |')
lines+=['','- 全部12位evidence/contradicting见experience.json。全部82局日志及259段本角色机制复盘复核；40个已纳毒雾支持局均有施放，全历史45局444次，未纳局不因持有或相关性自动补证。骇鳗6证据房5过1死、异鸟8房7过1死；成长成立的败局非反例。78/77综合支持数不冒称每个子公式都有同数独立实验，单组件与整战替代缺对照只写观察；本两局无我方力量/敏捷能力，不给敏捷条目虚加证据。薬仅保留原事实，不推使用规则。'.replace('薬','药'),
'','### 新增','','- 无。全部主题并入已有条目，同一件事仍一条；中毒折扣纯bug不新建经验。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['rows']:lines.append(f'| {r["id"]} | {r["n_before"]}→{r["n_after"]} | {r["chars_before"]}→{r["chars_after"]} | 补非药水证据/同主题汇总与案例 |')
lines+=['','- 7条全加证据、纯数字0；骇鳗253字、异鸟56字、路线5字、休息5字重复叙述压缩，未合并条目/退役，历史完整旧文本留experience-before.json。',
'','### 退役','','- 无。无反例多过支持或本轮已修代码缺口；事实机制不因代码已建模而退役。',
'','### 和手写知识及代码冲突','',
'- 静默其他六份boss-damage/room-costs/monster-records/outcome-stats/fight-value/fight-value-gates均为生成数据，无手写知识需改删、不新建。各hash/切点/元数据见other-knowledge.json；room-costs 82局按MAP→MAP口径不同，outcome-stats A10四十二局与本节一致。monster-records至22:57:48.502Z为1245开窗/A10 531，对本节1244房/530差1仍TD1同房重启，不当独立新房或整表无效。fight-value/gates采样口径不当全量统计，未见数据证明整表无效，不覆盖刷新。',
'- common定向核骇鳗A10基伤18/150血与A0/A1基伤16，异鸟A7基伤3/A10基伤4、三击，佣兵A10同招基伤8×2，数据见common-facts-check.json；角色证据只静默。源码手写MODELLED_ENEMY_POWERS漏中毒与实际毒模型冲突，列下节，不改代码/其他角色；未见相反手写静默打法知识。',
'','### 代码问题（不给 DS）','',
'- 复盘已登记silent-0216：POISON_POWER已读进毒结算但MODELLED_ENEMY_POWERS未列，unmodelledEnemyPowers判未知、turn-solver逐击乘0.8。本分支定向只读combat-plan.ts:80/:135/:739/:793与turn-solver.ts:1460仍同结构；行号不冒称复原dirty开局。T3同线少4/3/6，按勘误历史首证K3676LU8B0UH A1 F15 T1，F17 T2毒11正确、两打击6各折4，实23预测19。C48尚无毒模型不当本bug首证。0216保持独立observed，本任务不改源码或队列，不保证解除折扣能转胜。',
'- facts初稿对无chosen的日志行直接索引触发KeyError，改为可选读取后全部指纹、眩晕、死亡帧、力量/毒层断言通过；原失败facts-initial.log保留。仅离线抽取脚本错误，不当生产bug或自测失败。',
'- 未记录：护栏原线、替路线、拒事件、未选锻造/选牌/目标序的受控整场结果，抽牌/重问后完整原最优线执行比例、boss逐轮估伤/估损/可活轮与实打比、未抵boss结果及Jev缓存。没有这些数据就不补造。',
'','### 测试','',
'- 源固定沙箱结果见收尾；JSON合法、证据角色/12位/n/进阶/预算、旧七数组及血档/节点/回血/SL、365指纹、新阈值与死亡帧、历史毒雾实际施放与药水对象/旧分句校验通过。git diff --check/gitleaks提交前扫描通过，不改测试预算。英文源提交仅静默experience.json，版本2026-10-07.11/增0改7退0，带Co-Authored-By。',
'- 账本只经learner/ledger.py/by=learner:experience-update改proposed，7个经验条目的来源/去向/提交/本节见ledger-result.json及收尾。不写accepted/shipped；旧first_run/prior/claim/证据/repeat/版本历史与0216独立状态保持，未纳条目不动。主目录本节与账本只追加、不提交。',
'','### 切片大小','',
'- 固定种子20260929，从截至两局57125帧静默状态池按state.run.character_id=SILENT，抽最高A9/A10每界面各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对，均真实界面。官方knowledge-slice.ts、CHARACTER=silent/setExperienceForTests；仅切换experience，其他知识/结果表冻结，manifest和逐片原文留盘。n变化的排序也可改变入选条目，不冒充V4完整前缀。','','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"].removeprefix("sample-")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta"]} |')
lines += ['',f'- 配对增量中位{S["median_delta"]}字、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active136→136、49920→49822字，高66中41低29；A8 129条46715字、A9 130条47014字、A10 131条47594字。需要Roy定：无。']
text='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(text);f=ROOT/'paper/materials/experience-changelog-silent.md';prior=f.read_bytes();(O/'changelog-before.sha256').write_text(hashlib.sha256(prior).hexdigest()+'\n');assert title not in prior.decode()
with f.open('a') as h:h.write('\n'+text)
assert f.read_bytes().startswith(prior);print('仅追加第65节',len(text),'字')
