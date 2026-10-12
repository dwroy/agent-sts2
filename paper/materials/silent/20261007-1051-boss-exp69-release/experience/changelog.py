import collections,hashlib,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');DEST=ROOT/'paper/materials/experience-changelog-silent.md';C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));L=json.load(open(O/'ledger-result.json'));H=json.load(open(O/'historical-facts.json'));M=json.load(open(O/'live-merge.json'));Z=json.load(open(O/'slice-summary.json'));title=(O/'changelog-title.txt').read_text().strip();stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
raw=(O/'test-source.log').read_text();clean=re.sub(r'\x1b\[[0-9;]*m','',raw);files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',clean)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',clean)));assert (O/'test-source.rc').read_text().strip()=='0' and files and cases
T=dict(tsc=0,vitest=0,files=files,cases=cases,rerun=(O/'test-source-first.log').exists());(O/'tests.json').write_text(json.dumps(T,ensure_ascii=False,indent=2)+'\n')
lines=['\n## '+title,'','### 来源','',f'- 记录时间{stamp}。只读notes/lessons.md:5360的7ZUC4VPMDS41及09:28:21三项勘误、notes/run-1007-0903-7ZUC4VPMDS41.md。runs.character=SILENT、A10、F17败，无跳过；last_seen按run文件名=2026-10-07。代码自主派发43条/30轮、非结束16轮及合SL37/23轮按勘误；毒/肌肉两瓶是战后奖励，0216在本局结束后才上线S1.fix42，不倒算成修后重犯。',
'- 开工exp-silent干净，git merge --no-edit main无冲突；README、最新STATE、决定末尾、学习协议、首次构建与最后两次增量的方法已读。独立执行、不派agent，不运行play或boss模拟池；抽取/工具单进程nice19，沙箱测试沿固定四线程入口。原日志按12位run id rg、states/deepseek按时间二分seek流读。',
'- 截至本局结束2026-10-07T01:03:26.984Z，86静默完局；A0—A10局数7/3/2/1/4/1/11/7/1/3/46。旧1284房75实死，加新8房1死＝1292房76死；A10 46局578房46实死。MCCK2602T1SR仍只进数字；无character旧局、其他角色、进行中与以后结束局排除。',
'- 口径沿第68节：首COMBAT→同房最终尝试末结算HP净损，死亡单列、负回复保留；Monster走廊与Unknown问号分开；入场HP/max HP分<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT以源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后下一战按run/floor去重，TD1重启仍一房，SL不作独立局或回血。死亡剩血截断不当完整需损，未结算毒不预支。cards/ends数组沿completed限定，pending派发的真实兑现另按原始前后帧核，不改旧分母。',
'- 按局号新抽550 decisions、18 brain、2 run-plans、6 sl-attempts；states二分seek流抽565静默帧，逐条ts/observed_ts与550决策一致；同窗deepseek-reasoning 0，大脑实际18次全Codex。新局六试逐轮需伤/已扣/实损与复盘原数组全相同，死亡8血5挡对25需20、差12，毒结算后敌剩50；f0c9dfbf+dirty不复原成干净源码。',
'- 旧85局原抽取/分析脚本全部重新执行，七数组/每档房与局号及损值/节点转移/回血/SL逐行一致，无对不上的上一节数字。重核207段静默历史机制复盘、全部86局日志；历史带毒刺击实际51局948次，20纳证局均实用；历史昏眩有16局56个一牌后阻牌帧，先纳入两局明确原复盘和典型窗口，不将其他层数/不同阻牌原因推为同一规则。完整脚本、原片段、偏移、基线、卡牌与切片留learner/runs/20261007-101303-experience-update。',
f'- 开工{C["old_active"]} active/{C["old_chars"]}字<55000，不触发强制压缩。新增1、更新6（全补非药水证据、纯数字0）、退役0，active{C["active"]}/{C["chars"]}字。力量/毒刺/路线/休息旧案例压短，完整旧文留experience-before.json；无条目合并或退役。potion:*与general:potion逐对象保持，其他旧含药句逐字保留，无新喝药规则。机制[0,20]，路线/休息/构筑观察沿[8,20]，没有新的进阶策略反例。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色/旧基线 | 85局旧七数组与血档、转移、回血、SL逐行一致；86局1292房76实死 | 局、房、尝试分别计 |',
'| 昏眩1层 | LRN0 A0 T8防御后5挡、余牌blocked，T11斗篷+的两小刀也blocked；新A10末T14防御后2能量四牌blocked | 一牌窗口不能预支余能，不定另一首牌胜因 |',
'| 横冲阈值/后段成长 | 新末T6 172→162→156、160阈值清8力并眩晕；取消28攻，后T9/T12再建4/8、T14跺地25 | 清阶段非击杀；低阶150不能套本场 |',
'| 力量/虚弱 | 后段跺地17+8=25；T9碾碎19→虚弱14，11挡后损3 | 临时减伤不抹后续加力，没有玩家正力/敏建立 |',
'| 毒刺/毒结算 | T9直6另施3，T9—11扣3+2+1=6；T13再施3，整战已结算毒17、死帧余7未兑 | 攻击/施毒/已结算分账，不把未来毒当实伤 |',
'| SL同盘局部对照 | 首/第三次T4同60血、敌218、3能量同手；删防御均扣20，5挡损13→0挡损18；两模型校准0.003 | 多付5血是真实局部代价；后续也变，不认单张牌整战因果 |',
'| 六次实际结果 | 均70/70敌262，前五predicted_death T14/13/12/10/13，末T14 died；真正重打全史76场334次26赢、A10 43场193次14赢 | 新场6次0赢，无赢次改法或运气胜因可归纳 |',
'| 路线/实际回血 | F6改无精英，F8事件49→70实回21，F16营火52→70实回18、题面21截断；A10高血一幕boss33房6死18.18% | 未走旧线/锻造无受控比较；回血兑现不保证过关 |',
'| 构筑/长战兑现 | 末24张全未升级、无正力敏或持续能力建立，T1五能量扣30；跨阶段后还需156，T7—14扣106、余50，T12扣0 | 已持有/到手/启动/结算及单牌限制一起验收 |',
'| 整场模拟/时钟 | F16回血712样本原始0胜、校准0.0474、约10轮余113.8596；实际末14轮余50 | 零赢样本校准不当实胜率，非同条件误差；逐轮时钟及赢损中位未记录 |',
'','七数组重算：','','| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for name,x in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {name} | {x["before"]} | {x["after"]} | 是 |')
lines+=['','A0—A9各格与第68节一致；完整各阶分母、房局号/损值在audit.json。死亡率以房为分母，活场净损中位排除实死并保留负回复。A10所有非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','A10源节点到下一实战（源入血档、多源可同战、Ancient排除）：','','| 幕 | 源房 | 血档 | 源节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','各进阶分母（SL不当独立局）：','','| 进阶 | 局 | 战房/死 | 火/回血/非回血 | 实回血 | 后战/死/活损中位 | SL场/尝试/赢尝试 |','| --- | --- | --- | --- | --- | --- | --- |']
rests=json.load(open(O/'rest-summary.json'));sl=json.load(open(O/'sl-summary.json'))
for r,s in zip(rests,sl):
 f=[x for x in A['fights'] if x['asc']==r['asc']];lines.append(f'| A{r["asc"]} | {r["runs"]} | {len(f)}/{sum(x["death"] for x in f)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','- 低血不同节点旧例重新核：MGA0CZDDKC0P A10休息22→43后Monster损17活、4D4J8USKCPAV休息1→22后Monster损1活；D4LJ9QMGFB8Q事件13、BVF22RSFVBS9事件21后走廊死。新局改无精英并实际回满仍boss六败，不是低血节点受控交换；敌人、构筑、入血和间隔混杂，仅观察。全历史explore/sl_explore/decisions.sl_attempt、draws及逐次结果留audit/逐局片段；仪式兽纳证重打5场26次1赢（LRN0 A0第二次赢，其他四场各6次0赢），新场没有赢的那次，不把六试当六局或定运气因果。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 本窗实际18次大脑全Codex，同窗DeepSeek推理0；没有隔离“明确引用某经验id使结论反向”的原话，不因最终失败登记已证可避的策略repeat。兼容字段DeepSeek不代实际引擎；保留原话仅用于引证。',
'- F1原话“早店补强，后置精英前后配营火，保血备战首领。”（00:36:54.458Z）；F6原话“Trade seven HP for substantial gold, then visit the shop for scaling and defense; avoid the elite with this underpowered deck.”后来改无精英线并买牌，没有实到步法/毒雾，计划组件不计实际成长。',
'- F14原话“Dash adds repeatable damage and stronger block; defensive value matters more than Expose’s slightly better simulated remaining boss HP.”（00:45:17.036Z）；冲刺取得并兑现10伤10挡，但T12实际扣0，T14一牌窗只有5挡；没有暴露替构筑整战对照，不能判取牌本身错误。',
'- F16原话“Heal to 70 HP. The imminent boss demands a larger survival buffer; healing also improves simulated boss remaining HP more than any upgrade.”（00:46:25.114Z）；52→70确实执行，零胜模拟校准不是赢样本，未实打升级档不判休息错误。',
'- 已学SL血价仍被探索覆盖：首/第3次T4 Jev都选含防御，第三00:53:43.440Z探索删防御，00:53:52.819Z又将所选复制＋防御改结束；当轮多付5血、不多打伤，silent-0079原repeat保留，另一时点/后续全战变化不全部归一张防御。完整原话/原答在journal-quotes.json与原decisions。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[
('昏眩1层','一牌后阻牌，余能/生成小刀不增加实际可打次数；当轮挡和输出来自实际首牌，不定另一首牌胜因。','silent-ceremonial-beast-ringing-one-card','LRN0HPZ0FZS1 A0 T11斗篷+6挡后小刀blocked；7ZUC4VPMDS41 A10末T14 8血5挡/2能量，对25需20差12。'),
('逐击力量/逐牌敏捷与虚弱','力量按攻击段、敏捷按牌挡兑现，弱逐击取整，局部减伤不消掉后续独立加力。','silent-strength-weak-observation','7ZUC4VPMDS41 A10后段力量4/8，跺地17+8=25；T9弱19→14而11挡仍损3。'),
('毒刺/毒结算','直伤与施毒分列，结算减1；可活轮数限定兑现，死亡余毒不计实伤。','silent-poisoned-stab-components','7ZUC4VPMDS41 A10末T9直6另施3，T9—11扣6；全战毒17、余7未兑。'),
('横冲阈值/后段再成长','跨160清旧力并取消当轮攻击，仍有156血需兑现；后段再加力，清阶段不能作胜利或永久减伤。','silent-ceremonial-beast-threshold-growth-sl','7ZUC4VPMDS41 A10 T6 172→156清8力取消28攻，后扣106仍余50；QNTW139MGECA A10首试12轮扣262胜。'),
('能力组合兑现观察','取得/到手/建立/触发与生存轮数分别核；无实到成长不能预支，开场爆发及未来毒不能当每轮输出。','silent-deck-burst-observation','7ZUC4VPMDS41 A10末无正力敏/能力建立、24张未升级，T1扣30、T12扣0，死余50。')]
for name,reason,eid,example in mechanisms:
 x=H[eid];asc=','.join(f'A{k}:{v}' for k,v in x['asc_support'].items());lines.append(f'| {name} | {reason} | {len(x["evidence"])}/{len(x["contradicting"])}；{asc} | {example} | {eid} |')
lines+=['','- 全部12位支持/反例局号见experience.json及historical-facts.json；毒刺20纳证局均核实际施放，历史51局948次为completed动作分母，不是每个子公式的独立实验数。力量/构筑82/81局是综合观察，胜败不当机制反例，六重打不当六份支持。昏眩16局检索结果完整保留，条目两份支持限定1层与明确案例，不从中推任意层数或统一首牌策略；药水只作为本局已发生事实，不提出规则。',
'','### 新增','',
'- silent-ceremonial-beast-ringing-one-card（boss:CEREMONIAL_BEAST）：2支持0反例、med、[0,20]，首证LRN0HPZ0FZS1/A0与本局/A10；一牌后阻后续牌与生成小刀，余能不预支。来源已有silent-0222、prior=yes不改；没有新账本id。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for x in C['diff']:lines.append(f'| {x["id"]} | {x["n_before"]}→{x["n_after"]} | {x["chars_before"]}→{x["chars_after"]} | 补本局非药水证据、机制/案例或统计重算 |')
lines+=['','- 六条全部补证，纯数字0；力量/毒刺/路线/休息旧案例压短，仪式兽补局部SL血价与阶段后缺口，构筑补单牌窗与未实到成长。旧药句逐字保留、药水对象不动，完整旧文留盘，没有合并条目。',
'','### 退役','','- 无；没有反例多过支持，真实机制不因执行层已处理而退役；本批没有代码修复或残留未修机制条目要退役。',
'','### 和手写知识及代码冲突','',
'- 静默另六份boss-damage/room-costs/monster-records/outcome-stats/fight-value/fight-value-gates均为生成数据，无手写文件要改删。逐文件哈希/元数据在other-knowledge.json；boss表仪式兽17房、按各进阶场数/赢数与全部原房重算一致（纳证15房与总遇17分开）。room-costs 86局，outcome A10 46局一致；monster-records1293窗比本次去重1292房多TD1同房重启1，窗口/净损/战后回复等不同口径不当内容失效。未见需覆盖的数据，不新建手写文件，common仅定向核仪式兽招式/阈值。',
'- 当前combat-plan.ts:81已将POISON_POWER声明已建模；:4707已有昏眩单牌cap，与实际1层窗口相符。经验记录真实机制给规划，不写成未修执行器bug。boss-clock.ts:93的固定“T6起每三轮”与本局跨阶段后T8/T11/T14昏眩不同；这里只登记时点冲突，不改手写代码、不以旧角色局号或用药文字作为静默证据。',
'','### 代码问题（不给 DS）','',
'- silent-0216历史repeat原样保留：本局末T11冲刺实际10＋旧1毒=11，题面8＋1=9少2；本局结束时旧覆盖声明尚未修，09:21:09/S1.fix42才上线。开工源码名单已补POISON_POWER，不称生产仍漏或修后重犯；turn-solver.ts:1460保留通用未知增益八折分支，本任务不修、不重复登记bug或改0216状态。',
'- 离线facts初稿用result完全等于“pending (unstable)”而漏掉冒号后说明，初报0条；改用startswith后逐帧确认31条pending后有状态改变，原0及更正留facts.log。cards/ends旧completed数组保持，勘误三条实际派发原帧单独核。属于离线筛选错误，不当生产或测试失败。',
'- 未记录：前五判死末轮完整实扣/实损、未选路线/构筑/锻造/昏眩另一首牌及模型修后受控整战胜负、抽牌重问和SL覆盖后完整最优线实际执行比例、逐轮boss时钟与赢样本损血中位、Jev缓存。不补造、不从原答最优189/195推完全执行率。',
'','### 测试','',
f'- 源固定沙箱tsc0、vitest0、{files}文件{cases}例；'+('高负载失败后按要求完整重跑一次通过，初次原日志保留。' if T['rerun'] else '首轮通过，无失败/超时重跑。')+'JSON、证据12位/角色/n/进阶/预算、旧七数组/血档/节点/回血/SL、550状态匹配、六试逐轮、卡牌实际、旧药对象/分句、git diff --check及提交前gitleaks通过。不改测试预算、依赖、源码或生成器。',
'- 只经learner/ledger.py/by=learner:experience-update，proposed '+','.join(L['proposed'])+'；新增/退役无、check0。七个新增/更新经验都有对应来源，0030追加本局毒刺support，原claim/first_run/asc/prior/证据/repeat及版本历史保持；0222 prior=yes承认已有能力。0216纯bug和未纳复盘项状态不动，不写accepted/shipped。主目录本节及账本只追加不提交，由调用方提交。',
f'- live合入结果：{M.get("reason","实际合入且合后固定沙箱通过")}；刷新提交{M.get("refresh_commit")}，合前{M.get("base",M.get("initial_head"))}，实际合入{M.get("merged")}，合后测试{M.get("test_rc")}。'+('不同知识blob重叠：'+','.join(M['conflicting_overlap'])+'；按任务第8节停止、不覆盖、不硬解。' if M.get('conflicting_overlap') else '')+'原锁等待与只读预检见live-merge.json、readonly-preflight.json；两次45秒锁等待退出1，未进入锁内写入或保存合前点；'+('上线'+M['eval_version']+'，发布提交'+M['release_commit']+'。' if M.get('eval_version') else '未上线本批eval版本。')+'handoff-ops.md与完成JSON交调用器experience-done通知运维核实际发布/登记shipped或兜底，完整沙箱外套件交调度器。不停对局、不运行play、不推送。',
'','### 切片大小','',
'- 固定种子20260929，从截至本局states抽state.run.character_id=SILENT的最高A9/A10，每阶20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只换经验JSON；common与静默其他结果表冻结，完整manifest/原切片留盘，不读取其他角色或冒称V4整份前缀。',
'','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in Z['rows']:lines.append(f'| {x["sample"].replace("sample-","")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta_median"]} |')
lines+=['',f'- 配对增量中位{Z["delta_median"]}字、最大增量{Z["delta_max"]}；总体中位{Z["before_median"]}→{Z["after_median"]}、最大{Z["before_max"]}→{Z["after_max"]}字。active138→139、49357→49583字，高68中45低26；A8 132条46476字、A9 133条46775字。需要Roy定的知识事项：无。','']
section='\n'.join(lines);(O/'changelog-section.md').write_text(section)
old=DEST.read_bytes();assert ('## '+title).encode() not in old
(O/'changelog-prefix.json').write_text(json.dumps(dict(bytes=len(old),sha256=hashlib.sha256(old).hexdigest()))+'\n')
with DEST.open('a') as h:h.write(section)
assert DEST.read_bytes()[:len(old)]==old
print('已追加第69节',len(section),'字符；源测试',T)
