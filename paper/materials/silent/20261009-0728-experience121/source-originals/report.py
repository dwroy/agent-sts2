import collections, json, statistics, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
W=O.parents[2]
A=json.load(open(O/'audit.json'))
U=json.load(open(O/'update-summary.json'))
C=json.load(open(O/'changes.json'))['entries']
H={r['id']:r for r in json.load(open(O/'historical-mechanism-summary.json'))}
R=json.load(open(O/'run-metadata.json'))
RM={r['run_id']:r for r in R}
M=json.load(open(O/'ledger-map.json'))
P=json.load(open(O/'proposal-ids.json'))
T=json.load(open(O/'test-results.json'))
L=json.load(open(O/'ledger-results.json'))
Z=json.load(open(O/'live-merge.json'))
V=json.load(open(O/'verified.json'))
source=(O/'source-commit.txt').read_text().strip()
heading=(O/'changelog-heading.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
names={'silent-deck-burst-observation':'长战兑现与护栏重问（观察）','silent-footwork-block':'敏捷逐张卡牌格挡','silent-strength-weak-observation':'力量、虚弱与敌方成长','silent-piercing-wail-temporary-strength':'尖啸临时减力','silent-wither-end-turn-loss':'凋萎持牌伤','silent-aeonglass-artifact-growth-sl':'沙漏成长与同首抽重打（观察）','silent-snakebite-retained-poison':'蛇咬升级施毒','silent-deadly-poison-application':'致命毒药施毒和结算','silent-poison-potion-observed-application':'毒药水与人工制品','silent-act-transition-missing-hp-heal':'跨幕缺血回复'}
F=[dict(name=names[c['id']],id=c['id'],support=c['after']['n_support'],contradict=c['after']['n_contradict'],example='SV2GP9NX4HQD') for c in C if c['id'] in names]
(O/'mechanisms.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
b=json.load(open(O/'slice-before.json'));a=json.load(open(O/'slice-after.json'))
bs=[];ass=[];ds=[];rows=[]
for x,y in zip(b,a):
    assert x['sample']==y['sample'] and x['n']==y['n']==20
    diffs=[v-u for u,v in zip(x['sizes'],y['sizes'])]
    bs+=x['sizes'];ass+=y['sizes'];ds+=diffs
    rows.append(dict(sample=x['sample'],before_median=x['median'],before_max=x['max'],after_median=y['median'],after_max=y['max'],paired_median=statistics.median(diffs)))
sl=dict(before_median=statistics.median(bs),after_median=statistics.median(ass),median_change=statistics.median(ass)-statistics.median(bs),paired_median=statistics.median(ds),before_max=max(bs),after_max=max(ass),max_growth=max(ds),min_change=min(ds),rows=rows)
(O/'slice-summary.json').write_text(json.dumps(sl,ensure_ascii=False,indent=2)+'\n')
lines=[heading,'','### 来源','',
 f'- 记录时间{stamp}。只读根notes/lessons.md:7107的SV2GP9NX4HQD静默小节及07:00:46勘误，补ECHOING_SLASH/POUNCE标识，数值不变。runs.jsonl:638为SILENT/A10/F48败、52aa3fcc+dirty；完整dirty源码未记录。唯一局报run-1009-0636-SV2GP9NX4HQD.md，last_seen取run-1009日期。目标局无跨角色跳过。',
 '- exp-silent开工干净，git merge --no-edit main快进至6f76a2e7、无冲突。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建和最近两次静默增量方法、账本README已读；独立完成，不派agent。不联网、不运行play或boss模拟池，数据脚本nice19、单进程，测试单worker。',
 f'- 全引擎静默学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。旧156局只进数字和机制验证；缺character旧铁甲、其他角色、进行中和切点后局排除，不称纯Codex爬塔成绩。',
 '- 按局号rg抽1108决策、46脑、9SL、8计划；states/reasoning按2026-10-08T21:24:14.805Z—22:35:53.178Z二分字节seek流读，1244状态逐帧核run_id/character_id。真实DeepSeek及同窗reasoning均0，实际脑全Codex，ds_*仅兼容字段。原行/偏移/experience-before和失败初稿保留scratch。',
 '- 口径同上一批：同房首COMBAT入口HP−末次退出HP，含回复/自损、不等敌毛伤；SL一房算一场，判死截断不是实际死亡。走廊只Monster，Unknown另算；入口血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient，多节点可以关联同战；HEAL后战另去重。',
 '- 旧156局原始只读子集重新运行analyze/audit；七数组、血档房/局/损/死、节点转移、回血和SL逐行相等，无口径漂移。'+json.dumps(json.load(open(O/'baseline-check.json')),ensure_ascii=False),
 f'- 新增0、更新12（12加证据、0只改数字）、退役0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}。低于55000压缩线/60000预算，无预算合并或退役，压短的案例/全部旧证据保留before/changes。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after']
    lines+=[f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{H[e["id"]]["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |']
lines+=['','新局逐房资源链；入口→奖励取药前出口，净损含回复/自损、死亡单列。','', '| 层/幕/房型 | 首帧敌人 | HP入口→出口/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run']=='SV2GP9NX4HQD':lines+=[f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |']
lines+=['',
 '- F33原始74/81进房、血瓶后76→9，转幕缺72实回57至66；F43原始74进、血瓶后76、T7精灵被动9→0→24、T8实赢24，净损50不等毛伤，复活24不是主动饮药。F44回24至48、F45/46赢后46、F47回24至70、沙漏血瓶启动72但无复活；F49未到。首试70入口、后五试72为SL恢复，不把恢复算自然回血。',
 '- 六火HEAL各24合144；六SMITH不回血；跨幕F17的28/81→70回42、F33的9/81→66回57，草莓/星图/吃蛋/事件/再生/小血瓶/精灵分源。获13物理瓶＝F1两瓶+奖励10+商店1；主动不同瓶12、精灵被动1，use动作22＝终战前10+末战原两瓶SL复用12。五次恢复两瓶非新获；discard和事件交出均0。',
 '- 沙漏末試十轮本体需[535,472,465,396,369,352,296,265,231,198]、扣[63,7,69,27,17,56,31,34,33,52]、净血损[13,5,0,2,0,0,36,15,0,1]；前三轮139、合389仍缺146，同期扣尽需53.5/轮仅事后预算。末T10回响/音乐盒净扣20至178、毒32再至146；实际死帧只扣剩1，30+12−21=21是完整需损及存活差额。',
 '- 11条显式护栏替换在7个层/试/轮，同一T2重问不能重复算省血；逐题合计省113/少74与每轮末比较省71/少38都不是整战实收益。第5试T8替线实损6/扣19，第6试同轮另有牌/毒/重问损15/扣34且后序不同，原线未打，无整战受控收益。silent时钟伤害估计、血价、可活轮与差均null，F47模拟128样本不足300、F44未校准连战0%不作必死或实盘胜率。',
 '', '分阶/幕/房型全部非空入口血档；n为独立房，局数另列，存活净损中位排实死。','',
 '| 进阶/幕/房型/血档 | 房数/局数 | 实死/率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:lines+=[f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines+=['','休息/商店/普通事件入口血关联后战；节点可重复指向同战，未关联者不计。','',
 '| 进阶/幕/节点/血档 | 节点数/独立后战 | 后战实死/关联率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:lines+=[f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines+=['','低血走不同节点只作观察；同A10二幕25–40%但构筑/后战/回血不同，没有全路线受控对照：','']
for screen in ['REST','SHOP','EVENT']:
    cases=[x for x in A['nexts'] if RM[x['run']]['ascension']==10 and x['act']==2 and x['band']=='25–40%' and x['screen']==screen]
    example=next((x for x in cases if x['run']=='KSX97DF5H3NY'),cases[0] if cases else None)
    if example:lines+=[f'- {screen} {len(cases)}节点：{example["run"]} F{example["floor"]}入口{example["entry_hp"]}→节点末{example["exit_hp"]}，下F{example["next_floor"]}/{example["next_type"]}损{example["next_loss"]}、死{example["next_death"]}，不定哪个节点因果更优。']
lines+=['','各进阶回血后战去重；非HEAL包含其他火堆动作。','',
 '| 进阶/局数 | 独立火/HEAL/非HEAL动作 | 实回 | 后战/死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):lines+=[f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"]:.2f}% | {r["median"]} |']
lines+=['','真正SL同房多试；截断和实际结局分开。','', '| 进阶 | 重打场/尝试/实际赢 |','| --- | --- |']
for r in json.load(open(O/'sl-summary.json')):lines+=[f'| A{r["asc"]} | {r["fights"]}/{r["attempts"]}/{r["wins"]} |']
groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
multi=[dict(run=k[0],floor=k[1],asc=RM[k[0]]['ascension'],attempts=v,wins=sum(x['result']=='won' for x in v)) for k,v in groups.items() if max(x['attempt'] for x in v)>1]
(O/'sl-comparisons.json').write_text(json.dumps(multi,ensure_ascii=False,indent=2)+'\n')
lines+=['','- 全历史重打各试的explore/退出/前抽序已保存sl-comparisons；旧胜局原受控限制保留。新局六试前35抽序相同不推广未见后序；首/三/四试T2毒各+6，第2/5/6试T1毒均剥最后1制品而无毒，技能均选残影。卡序/药时点同时变化，六试0赢不能归因于运气或一次换线。旧沙漏17重打场84试4赢，A10 11场60试2赢；P2M3DFJ4DEZ3末试胜与同底板局部损血/后序同时变化，不能当一次动作独立胜因。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 本局真实DeepSeek及其推理0条，无其引用经验后相反执行的原话。Codex确说“四营火分隔两精英，早商店补伤害，保血备战同族。”和“音乐盒补持续输出，四火单精英保连王资源。”，实际前两boss赢、骑士赢仍耗精灵，末战失败不证明这些文本误导，也不声称计划持续输出已达到时钟预算。',
 '- 当前候选仍把升级蛇咬列未建模，而实T6加10毒；这是0319既有覆盖差，不是经验要求未执行。原线54伤与换线整轮56包含重问/遗物/不同出牌，不直接报同线模型误差。HP护栏兑现部分保血线但没有整战反事实；无已证策略重犯标签。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
    e=c['after']
    if e['id'] not in names:continue
    reasoning,case=e['lesson'].split('典型案例：',1)
    lines+=[f'| {names[e["id"]]} | {reasoning} | {e["n_support"]}/{e["n_contradict"]}；分阶{H[e["id"]]["by_asc"]}；适用{e["asc"]}；完整evidence/contradicting见经验/历史核验 | {case} | {e["id"]} |']
lines+=['','- 按全部本角色复盘主题、157局实际动作/遭遇复核支持/反例和分阶；旧支持沿已核语义，出现集合只检索、不扩大支持分母。新原帧55项通过，毒施加/制品/毒结/敏捷/减力/凋萎/血药分源；未建毒雾、触媒、余像不加这三牌证据，没有独立控制整战胜因的只写观察。',
 '', '### 新增','', '- 无；同一件事并已有条目。','', '### 更新','']
for c in C:lines+=[f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加SV2GP9NX4HQD和近例/数字；asc/反例保持；账本{",".join(M[c["id"]])}。']
lines+=['','### 退役','', '- 无；无反例多于支持、高阶推翻或本任务源码修复，不为预算退役。','',
 '### 和手写知识及代码冲突','',
 '- 无独立silent手写攻略；其余8份JSON逐份核来源/切点/口径和SHA，与上批相同，无需改手写知识。room-costs旧MAP房分母、monster-records尝试遭遇、outcome-stats旧切点分阶，fight-value/gates固定模型不当本157局净损表；不同分母不当数据冲突。double-boss本局未到F49，boss-trust固定切分/失败限制保持，不重建。核验详情other-knowledge.json。',
 '- 当前card-model.ts:938—942只接未升级蛇咬7毒，实际升级10毒仍覆盖不足，与silent-0319已有纯bug/提案核去重。combat-plan.ts:596全候选minLoss定界、:599—600筛替代池，与“只省1血”的替线不矛盾，不据此断言8点护栏失效。代码手写知识只核对、不修改。三独立提案'+','.join(P)+'；source_task=experience-update、target_task=strategy-proposal，12变更active全关联experience/账本/本角色证据，实际domains combat/potion/sl/terminal/structure；均pending，无源码implemented/shipped。',
 '', '### 代码问题（不给 DS）','',
 '- 没有新纯bug；0319旧升级蛇咬覆盖差仅关联独立提案、不改其状态，不把代码定位单列DS经验。凋萎理由简写、重读least-loss−2与−20差原因未定位，没有固定同线回放不笼统归旧缓存bug；代码护栏属于当前合规规则取舍，不由局败重写阈值。',
 '- 缺完整dirty运行树、前五试最终结算与离场HP、逐击毛伤/致死内部次序、护栏原线整场收益、隔离用药/构筑/路线的受控整场反事实、F49实到资源/实战、完整实际最优执行率、silent时钟比、Jev缓存/实际费用和Codex实际费用，均留未知。',
 '- 验证初稿误把dynamic_values列表当字典报TypeError，随后把六饮毒全当+6的断言失败；两份失败脚本/日志保留。修正按原列表和现场制品核验三施毒/三阻毒，55项通过；这些是本任务抽取错误，不改产品源码或旧汇总。',
 '', '### 测试','',
 f'- bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1；CHARACTER只给知识工具。tsc={T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，重跑{T["rerun"]}；经验测试前后SHA相等，固定数据/排除名单/预算不改，完整外部套件交调度器。',
 '- JSON合法、scope/name/n/evidence/角色/asc与未改条目等价、旧156局七数组/血档/节点/回血/SL与新关键实帧通过；check-experience missing=[]退出0，git diff --check/gitleaks0、ledger.py check0。',
 '- 账本新增[]、提交后proposed '+','.join(L['proposed'])+'、退役[]；首证/prior/claim/support/repeat/旧版本历史保持，actual数据shipped交运维据完成事件，三个源码提案pending。',
 '- live锁内：'+Z['result']+'；刷新'+str(Z.get('refresh'))+'；合前'+str(Z.get('pre'))+'；实际合入'+str(Z.get('merged'))+'。']
if Z.get('conflicts'):lines+=['- '+x for x in Z['conflicts']]
if Z.get('overlap_conflicts'):lines+=['- 不同知识重叠：'+','.join(Z['overlap_conflicts'])]
if not Z.get('merged'):lines+=['- 按任务冲突即停，不硬解或覆盖刷新/并行记录；未合入，待调用方与运维完成事件兜底。未造eval上线版本或实际规则上线双通知，不停对局。']
lines+=['','### 切片大小','',
 '- 固定种子20260929，截止前silent状态最高两阶A9/A10、各阶每界面20×6界面=240配对，manifest留池/时间戳，不足才同阶同界面有放回。本轮各池均足20；CHARACTER=silent调用官方knowledge-slice.ts，common/silent其他知识冻结，前后只替换经验。','',
 '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in rows:lines+=[f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |']
lines+=[f'- 整体中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字），配对差中位{sl["paired_median"]}；最大{sl["before_max"]}→{sl["after_max"]}；单片最少{sl["min_change"]}、最多增加{sl["max_growth"]}。',
 f'- active{U["after"]["active"]}，正文{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。无预算合并/退役/压缩，需要Roy定：无。','',
 '原始子集/偏移、复算、核验、提案/CLI、切片、测试、合入预检/失败、报告全部保留'+str(O)+'。','']
section='\n'.join(lines).replace('末試','末试')
(O/'changelog-section.md').write_text(section)
(O/'report.md').write_text(section)
result=dict(task='experience-update',version='2026-10-09.10',commit=source,merged=Z.get('merged'),added=0,updated=12,retired=0,active=192,mechanisms=[f['name'] for f in F],tests={k:T[k] for k in ['tsc','vitest','cases']},ledger=dict(**L,check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('报告小节',len(section),'字；切片',sl['median_change'],sl['after_max'])
