import collections, hashlib, json, statistics, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
W=O.parents[2]
OLD=W/'learner/runs/20261009-054302-experience-update'
A=json.load(open(O/'audit.json'))
U=json.load(open(O/'update-summary.json'))
C=json.load(open(O/'changes.json'))['entries']
H={r['id']:r for r in json.load(open(O/'historical-mechanism-summary.json'))}
R=json.load(open(O/'run-metadata.json'))
RM={r['run_id']:r for r in R}
P=json.load(open(O/'proposal-ids.json'))
M=json.load(open(O/'ledger-map.json'))
T=json.load(open(O/'test-results.json'))
L=json.load(open(O/'ledger-results.json'))
Z=json.load(open(O/'live-merge.json'))
source=(O/'source-commit.txt').read_text().strip()
heading=(O/'changelog-heading.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
names={
    'silent-deck-burst-observation':'组件兑现与护栏取舍（观察）',
    'silent-strength-weak-observation':'力量、敏捷与现场易伤',
    'silent-afterimage-per-card-block':'余像建立后的逐牌挡',
    'silent-gorget-plating':'护喉甲覆甲耗尽',
    'silent-mirage-poison-card-block':'蜃景毒总量与真实挡',
    'silent-deadly-poison-application':'直接施毒与剩血截断',
    'silent-bouncing-flask-poison':'随机施毒分配与母体进度',
    'silent-noxious-fumes-growth':'持续补毒与直接毒组合',
    'silent-slumbering-beetle-wake-growth':'甲虫醒后成长与同伴退场',
    'silent-act-transition-missing-hp-heal':'跨幕缺血回复分源'}
F=[dict(name=names[c['id']],id=c['id'],support=c['after']['n_support'],contradict=c['after']['n_contradict'],example='KSX97DF5H3NY') for c in C if c['id'] in names]
(O/'mechanisms.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
before=json.load(open(O/'slice-before.json'))
after=json.load(open(O/'slice-after.json'))
bs=[];ass=[];ds=[];rows=[]
for b,a in zip(before,after):
    assert b['sample']==a['sample'] and b['n']==a['n']==20
    diffs=[y-x for x,y in zip(b['sizes'],a['sizes'])]
    bs+=b['sizes'];ass+=a['sizes'];ds+=diffs
    rows.append(dict(sample=b['sample'],before_median=b['median'],before_max=b['max'],after_median=a['median'],after_max=a['max'],paired_median=statistics.median(diffs)))
sl=dict(before_median=statistics.median(bs),after_median=statistics.median(ass),median_change=statistics.median(ass)-statistics.median(bs),paired_median=statistics.median(ds),before_max=max(bs),after_max=max(ass),max_growth=max(ds),min_change=min(ds),rows=rows)
(O/'slice-summary.json').write_text(json.dumps(sl,ensure_ascii=False,indent=2)+'\n')
for phase in ['before','after']:
    expected=(O/'experience-before.json').read_bytes() if phase=='before' else (W/'knowledge/characters/silent/experience.json').read_bytes()
    assert expected==(O/f'slice-knowledge-{phase}/characters/silent/experience.json').read_bytes()

lines=[heading,'','### 来源','',
    f'- 记录时间{stamp}。只读根notes/lessons.md:7038的KSX97DF5H3NY静默小节，未见该小节后续勘误；runs确认SILENT/A10/F31败、3cadc990+dirty，完整dirty源码未记录。唯一局报run-1009-0519-KSX97DF5H3NY.md，last_seen=2026-10-09。',
    '- 开工exp-silent干净，git merge --no-edit main无冲突。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建和最近两次静默增量、账本方法已读；独立完成、不派agent。未运行play/模拟池，数据脚本nice19顺序跑，测试单worker。',
    f'- 全引擎静默学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。旧155局只进数字和机制验证；排缺character旧铁甲、其他角色/进行中/切点后局，不称纯Codex爬塔成绩。',
    '- 按局号rg抽517决策、30脑、6SL、5计划；states/reasoning按2026-10-08T20:53:39.783Z—21:18:53.395Z二分字节seek流读，544帧核run_id与character_id。真实DeepSeek和同窗reasoning均0，脑实际全Codex；ds_*兼容字段不当DeepSeek意见。原行、偏移、源前经验保留scratch。',
    '- 同房首COMBAT入口HP−末次退出HP，含回复/自损，不等敌毛伤；SL同房一场，前三判死截断不是实死/离场零损。走廊仅Monster，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient，多个节点可关联同战；回血后战另去重。',
    '- 旧155局原始只读子集重新运行analyze/audit；七数组、旧血档房/局/损/死、节点转移/回血/SL逐行相等，无口径漂移。'+json.dumps(json.load(open(O/'baseline-check.json')),ensure_ascii=False),
    f'- 新增0、更新12（12加证据、0只改数字）、退役0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}。低于55000压缩线和60000预算，无预算合并/退役/压缩，旧典型案例全文/证据/反例保留before/changes。',
    '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after']
    lines+=[f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{H[e["id"]]["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |']
lines+=['','新局逐房资源链，入口→奖励取药前离场；净损含回复/自损，末战只计最后一次实际死亡。','', '| 层/幕/房型 | 敌人首帧 | HP入口→出口/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run']=='KSX97DF5H3NY':lines+=[f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |']
lines+=['',
    '- 前15赢房净损179，战外回复142＝两枕头火36+36、事件20+25、跨幕25，56+142−179=19；末战19→0。F7/12/16锻造不回血；F22毒药交长者换灯笼是事件交换，非饮用或丢弃；SL恢复6/1/5→19另账、不加最终路径消耗。',
    '- 药水实获10＝失物盒1/奖励6/买1/事件2，实饮9、交出1、弃0、SL恢复瓶0。F5攻击/F21技能的动作result为pending(unstable)但原槽随后实空；不能只计completed的7饮。audit沿旧completed动作索引以保持基线，实际消费另核槽位；技能/攻击药生成牌不计新瓶。再生在满血建5层，回合边界无HP净增，缺中间毛伤/回复，不能推出该瓶留到末战能赢。',
    '- F8五轮需[90,83,71,33,22]、净扣[7,12,38,11,22]、损[6,10,15,8,0]；F17九轮需[262,251,225,190,157,119,97,62,21]、净扣[11,26,35,33,38,22,35,41,21]、损[0,4,6,0,0,12,9,0,0]，末21血24毒只计21。F30八轮需[178,148,127,89,89,50,38,6]、净扣[30,21,38,0,39,12,32,6]、损[0,0,0,2,12,12,9,0]；T4先破16盾但本体HP89不变，不把盾损记本体进度。',
    '- F31末次母体需[127,82,55,50,34]、净扣[45,27,5,16,8]、玩家损[0,8,0,10,1]。T2孵化三卵52总血变三幼虫64，净增12不算负伤害；T3总毒实结11但母体只5；末轮结束前1血13挡对45完整预算需损32，存活至少差32HP，实际死亡只扣剩1。终敌26+15+8=49；缺逐击致死者，不用死亡后攻击标签倒算。',
    '', '分阶/幕/房型全非空血档；n为独立房，存活净损中位排实死。','',
    '| 进阶/幕/房型/入口血档 | 房数/局数 | 实死/死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:lines+=[f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines+=['','休息/商店/普通事件入口血关联下一更高层战；关联节点可重复指向同战。','',
    '| 进阶/幕/节点/入口血档 | 节点数/独立后战 | 后战实死/关联死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:lines+=[f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines+=['','低血不同节点只作观察，未见同条件全路线受控比较。以下同A10二幕入口25–40%，构筑、房间和后续回血不同，不定改线实际更好：','']
for screen in ['REST','SHOP','EVENT']:
    cases=[x for x in A['nexts'] if RM[x['run']]['ascension']==10 and x['act']==2 and x['band']=='25–40%' and x['screen']==screen]
    example=next((x for x in cases if x['run']=='KSX97DF5H3NY'),cases[0] if cases else None)
    if example:lines+=[f'- {screen} {len(cases)}节点：{example["run"]} F{example["floor"]}入口{example["entry_hp"]}→节点末{example["exit_hp"]}，下一F{example["next_floor"]}/{example["next_type"]}净损{example["next_loss"]}，实死{example["next_death"]}。']
lines+=['','各阶回血后去重后战；非HEAL包含SMITH等动作。','',
    '| 进阶/完局数 | 独立火/HEAL/非HEAL动作 | 实回HP | 后战/实死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):
    lines+=[f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"]:.2f}% | {r["median"]} |']
lines+=['','真正SL按同房多次尝试；截断/实死分开，新局F31四试0赢。','', '| 进阶 | 重打场/尝试/实际赢 |','| --- | --- |']
for r in json.load(open(O/'sl-summary.json')):lines+=[f'| A{r["asc"]} | {r["fights"]}/{r["attempts"]}/{r["wins"]} |']
groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
multi=[dict(run=k[0],floor=k[1],asc=RM[k[0]]['ascension'],attempts=v,winners=[x['attempt'] for x in v if x['result']=='won'],limitation='抽牌/探索/重放原字段保留，目标、随机分配或后继同变不自动定因果。') for k,v in groups.items() if max(x['attempt'] for x in v)>1]
(O/'sl-comparisons.json').write_text(json.dumps(multi,ensure_ascii=False,indent=2)+'\n')
of={(x['run'],x['floor']) for x in A['fights'] if 'OVICOPTER' in x['enemies']}
om=[x for x in multi if (x['run'],x['floor']) in of]
lines+=[f'- 直飞产卵虫真正重打{len(om)}场/{sum(len(x["attempts"]) for x in om)}试/{sum(len(x["winners"]) for x in om)}赢；全角色每场多次尝试的实际赢家/explore/draws/reload已保存sl-comparisons.json，不把未记录后段抽序当不同。',
    '- KSX97DF5H3NY前30抽序四次相同：首试先串刺母体扣52，后试先打击再串刺扣45，但费用/后继同变；第三试T2改打卵较第二试多损6、少一幼虫，T4改中和目标零损而T5仍判死；第四试T4候选文字拟省致命，弃牌重问后实际仍打致命，仅中和目标改变。第2—4试药瓶母体均只获3，落毒与敌数不相同，无单一动作胜因。G8NHLL09DLBX随机落子体母体余9而死，CNKR125PFHJ5药瓶没给母体、T5未结束但T6毒杀获胜，不能把药瓶分配错误写成整战必败。',
    '', '### 经验库自己带偏或写了没被执行的地方','',
    '- 实际DeepSeek0，无DeepSeek引用条目后相反执行的真实原话，不由死亡推定经验误导。Codex F29原话“Two forced fights precede the next campfire”，实际选HEAL回54，但随后两战35净损/空药资源仍不足；开局want中的FOOTWORK/ACCELERANT始终未得，不把计划写成已建。',
    '- Jev第2—4试T3题面母体44血/10毒、24/24赢，实际母体50血/4毒且T5失败；这是随机施毒代码题面带偏，与经验正文早已“不保证指定目标”一致。总毒11和蜃景11挡确实兑现，未兑现的是指定目标进度，纯bug0295保持原repeat。',
    '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
    e=c['after']
    if e['id'] not in names:continue
    main,case=e['lesson'].split('典型案例：',1)
    lines+=[f'| {names[e["id"]]} | {main} | {e["n_support"]}/{e["n_contradict"]}；分阶{H[e["id"]]["by_asc"]}；适用{e["asc"]}；完整局号见experience/historical-mechanism-summary | {case} | {e["id"]} |']
lines+=['','- 全历史834段静默主题复盘已按局号流式筛选，156局实际动作/遭遇重新计算；每条支持分阶、动作局与反例保留historical-mechanism-summary。旧支持沿已核语义，实际出现集合只作检索、不扩完整机制分母。原帧38项通过，玩家无敏捷，不增加步法证据；余像/覆甲/蜃景/毒与敌成长分源，不由共现定单卡整战胜因。',
    '', '### 新增','', '- 无，同一件事并已有scope，不新建重复单局条目。','', '### 更新','']
for c in C:lines+=[f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加KSX97DF5H3NY和近例/数字；asc/反例保持；账本{",".join(M[c["id"]])}。']
lines+=['','### 退役','', '- 无。无高阶反驳/反例多于支持或本批源码修复，不为预算退役。','',
    '### 和手写知识及代码冲突','',
    '- 无独立silent手写攻略，其余8份JSON逐份核来源/口径/切点，与上一批SHA相等，无须改手写知识。room-costs为旧切点MAP房分母，monster-records为尝试遭遇，outcome-stats为旧切点分阶观察，fight-value/gates为固定模型而非本156局净损表；不同分母不当冲突。double-boss本局未到，boss-trust固定切分与失败限制保持，不用本局结局推翻模型或重建。',
    '- 当前turn-solver.ts:2284随机施毒仍调用:2536最高HP+挡，与多敌指定目标进度实盘不一致；:1921在建立前按已有余像触发，:2345再建层，本局余像时序与此一致；:1965蜃景无修正条件按当前活敌毒总量动态补挡，实11一致。代码手写内容只核对、不修改。三独立提案'+','.join(P)+'；source_task=experience-update/target_task=strategy-proposal，12变更active全部直接关联experience/账本/本角色证据，domains combat/potion/sl/terminal/structure。均pending，不冒称源码implemented。',
    '', '### 代码问题（不给 DS）','',
    '- 0295纯bug同根因repeat已有队列，不造重复经验或新bug，不改其observed；本局选线而非自动combat/lethal，不重写旧自动斩杀保证历史。F8護栏是合规取舍，原线未执行，不把后续死亡当阈值错误或许诺原线必胜。',
    '- 缺完整dirty源码、孵化个体持久身份/全部击杀/致死内部时序、前三次SL退出结算、再生中间回复及敌毛伤、F32/F33实到HP、boss时钟比、完整执行最优率、药水持有价/留药/换路线/早建能力的受控整场反事实与实际订阅费用，均保留未知。',
    '', '### 测试','',
    f'- 原bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1；CHARACTER只给知识工具，测试不设。tsc={T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，未重跑，经验测试前后SHA相等。固定排除/数据/预算保持，完整外部套件交调度器。',
    '- JSON合法、其他条目逐项等价、scope/name/角色/evidence/n/asc检查、旧155局七数组/血档/节点/回血/SL及原帧核验通过；check-experience missing=[]/退出0；git diff --check/gitleaks0，ledger.py check0。',
    '- 账本新增[]，提交后proposed '+','.join(L['proposed'])+'；退役[]。原claim/首证/prior/support/repeat/旧版本历史保持；实际合入后的数据shipped由运维据完成事件登记，源码提案pending沿独立任务。',
    '- live锁内结果：'+Z['result']+'；刷新'+str(Z.get('refresh'))+'；合前'+str(Z.get('pre'))+'；实际合入'+str(Z.get('merged'))+'。']
if Z.get('conflicts'):lines+=['- '+x for x in Z['conflicts']]
if Z.get('overlap_conflicts'):lines+=['- 不同知识重叠：'+','.join(Z['overlap_conflicts'])]
if not Z.get('merged'):lines+=['- 按任务有冲突即停止，不硬解、不覆盖刷新/并行记录；未合入，待调用方与运维完成事件兜底，未造eval上线版本或发实际规则上线双通知，未停止对局。']
lines+=['','### 切片大小','',
    '- 固定种子20260929，截止前SILENT状态最高两阶A9/A10，各阶各界面20状态×6界面=240配对。manifest保留池/时间戳，同阶同界面不足才有放回，未跨角色。CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其他知识，仅替换经验。','',
    '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in rows:lines+=[f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |']
lines+=[f'- 整体中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字），配对差中位{sl["paired_median"]}；最大{sl["before_max"]}→{sl["after_max"]}，单片最少{sl["min_change"]}、最多增加{sl["max_growth"]}。',
    f'- active{U["after"]["active"]}、正文{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。无压缩/合并/退役，需要Roy定：无。','',
    '原始子集、字节偏移、复算、核验、提案/CLI、固定切片、测试、合入预检及报告保存'+str(O)+'。','']
section='\n'.join(lines)
(O/'changelog-section.md').write_text(section)
(O/'report.md').write_text(section)
print('报告/追加小节',len(section),'字；切片',json.dumps(sl,ensure_ascii=False))
