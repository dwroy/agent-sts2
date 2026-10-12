import collections
import fcntl
import hashlib
import json
import statistics
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'))
U=json.load(open(O/'update-summary.json'))
C=json.load(open(O/'changes.json'))['entries']
H={r['id']:r for r in json.load(open(O/'historical-mechanism-summary.json'))}
R=json.load(open(O/'run-metadata.json'));RM={r['run_id']:r for r in R}
M=json.load(open(O/'ledger-map.json'))
P=json.load(open(O/'proposal-ids.json'))
T=json.load(open(O/'test-results.json'))
L=json.load(open(O/'ledger-results.json'))
Z=json.load(open(O/'live-merge.json'))
source=(O/'source-commit.txt').read_text().strip()
heading=(O/'changelog-heading.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
names={
    'silent-deck-burst-observation':'长战组件兑现（观察）',
    'silent-footwork-block':'步法敏捷逐张牌挡',
    'silent-strength-weak-observation':'力量/敏捷与仪式成长',
    'silent-bouncing-flask-poison':'随机毒分配与逐敌进度',
    'silent-deadly-poison-application':'致命毒药施毒与实结',
    'silent-poisoned-stab-components':'刺击直伤、毒杀与取消攻击',
    'silent-fortifier-existing-block-triple':'固化三倍已有挡',
    'silent-dodge-and-roll-delayed-block':'翻滚当前挡与延后挡',
}
F=[dict(name=names[c['id']],id=c['id'],support=c['after']['n_support'],contradict=c['after']['n_contradict'],example='RZ6YAC7K89NM') for c in C if c['id'] in names]
(O/'mechanisms.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
before=json.load(open(O/'slice-before.json'));after=json.load(open(O/'slice-after.json'))
bs=[];az=[];ds=[];rows=[]
for x,y in zip(before,after):
    assert x['sample']==y['sample'] and x['n']==y['n']==20
    diffs=[v-u for u,v in zip(x['sizes'],y['sizes'])]
    bs+=x['sizes'];az+=y['sizes'];ds+=diffs
    rows.append(dict(sample=x['sample'],before_median=x['median'],before_max=x['max'],after_median=y['median'],after_max=y['max'],paired_median=statistics.median(diffs)))
sl=dict(before_median=statistics.median(bs),after_median=statistics.median(az),median_change=statistics.median(az)-statistics.median(bs),paired_median=statistics.median(ds),before_max=max(bs),after_max=max(az),max_growth=max(ds),min_change=min(ds),rows=rows)
(O/'slice-summary.json').write_text(json.dumps(sl,ensure_ascii=False,indent=2)+'\n')
lines=[heading,'','### 来源','',
    f'- 记录时间{stamp}。只读根notes/lessons.md:7278的RZ6YAC7K89NM静默小节及唯一局报run-1009-0715-RZ6YAC7K89NM.md；本节后无新勘误。runs.jsonl:640为SILENT/A10/F12败、cfa8112d+dirty。run-config脏列表只有7份知识数据，无源码文件，但完整开局脏数据未保存。last_seen取run-1009日期；目标局无跨角色跳过。',
    '- exp-silent开工干净，git merge --no-edit main从229e0a0d快进至2b367bb8，无冲突。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建和最近两次静默增量方法、账本README已读；独立完成，不派agent。数据脚本nice19/单进程，无网络、play或boss模拟池；固定测试单worker。',
    f'- 全引擎本角色学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。旧158局只进数字与机制验证，缺character旧铁甲/其他角色/进行中/切点后局排除，不称纯Codex爬塔成绩。',
    '- 按局号rg抽208决策/12脑/0SL/3计划；states/reasoning按2026-10-08T23:06:44.894Z—23:15:32.987Z二分字节seek流式抽取，216状态逐帧核run_id/character_id，和复盘原帧全等。493项原数据/字节seek及17项本局机制核验通过；实际脑全Codex、DeepSeek和同窗reasoning0，兼容ds_*不作引擎证据。',
    '- 口径同上一批：同房首COMBAT入口HP−末次退出HP，含自损/回复，不等敌毛伤；SL一房一场，判死截断不是实死。Monster才是走廊，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient；多节点可以关联同战，HEAL后战再去重。',
    '- 旧158局原抽取子集重跑analyze/audit；七数组、血档房/局/损/死、节点、回血和SL全部对上，无口径漂移。'+json.dumps(json.load(open(O/'baseline-check.json')),ensure_ascii=False),
    f'- 新增1、更新9（加证据9、只改数字0）、退役0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字符。低于55000压缩线/60000预算；未为预算合并、退役或压缩。只替换近例，旧完整正文/证据均保留before/changes/历史。固化另补旧局P2M3DFJ4DEZ3的已核实饮。',
    '','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];lines += [f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{H[e["id"]]["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |']
lines += ['','新局七个独立战斗房：入口→退出，净损含自损/回复；最后只一次实际死亡。','','| 层/幕/房型 | 首帧敌人 | HP入口→出口/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run']=='RZ6YAC7K89NM':lines += [f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |']
lines += ['','- 六胜净损6/7/5/8/13/29共68，初56+唯一F7休息21−68=F12进9；含最后死亡损9共77、终血0。F3得虚弱/F4T1饮、F5购固化/F6T3饮、F6得能力/F8T1饮并取临时步法、F9得预知/F12T1饮并取回响斩击；新得4/饮4/弃0、无战回血/复活/SL恢复。F9得餐券，F10宝箱/F11事件均不回血，未到F13火/F15商店及后幕，不预支遗物或未来回血。',
    '- F12逐轮轮初需清[91,59,47,23]，实净扣[32,12,24,17]共85余6；玩家净损[0,1,4,4]，末损4是死亡封顶。T3刺击到钙化6血7毒，毒结清掉并取消13攻，潮湿9−5=4损；T4打击/切割使潮湿23→11，5毒再到6，15−9=完整6损，存活至少7血、现4差3。least-loss−2是剩血4−6，不是只损2；无本局SL。',
    '- F6新增三只8血炸弹的出现/退出与本体血分账，不把净总HP变化当卡牌毛伤或主怪回血。T1护栏题面9损21伤→0损9伤，替线实际兑现，原线未执行、不记整场省9；F9T2五轮8/8赢仍整战损29，另线全盘代价未记录。F12T1五轮3/8赢5/8死、非确定斩杀，总32吻合但逐敌各差6。',
    '- 本局Jev34次、24选线中原答最优22/24，固定战斗方案21/23；护栏替换1次后题面可辨23/24，不当完整实际执行最优率。36战斗回合、13无Jev选线；随机药后重问、抽弃与续步另账。F7投影48进精英而实38，差10对应F8实损13对普通房估3，只是条件差、不拟校准参数；boss模拟17%/投影62含未来两火，本局未到boss，时钟实打/比值未知。',
    '','分阶/幕/房型全部非空血档；房数、独立局数和实际死亡分列，存活净损排实死。','','| 进阶/幕/房型/血档 | 房数/局数 | 实死/率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines += ['','休息/商店/普通事件入口血关联后战，节点可以重复指同战，未关联者不计。','','| 进阶/幕/节点/血档 | 节点数/独立后战 | 后战实死/关联率 | 存活净损中位 |','| --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines += ['','低血不同节点仅观察：同A10二幕25–40%但构筑/后战/回复不同，不能定改线实际更优。']
for screen in ['REST','SHOP','EVENT']:
    cases=[x for x in A['nexts'] if RM[x['run']]['ascension']==10 and x['act']==2 and x['band']=='25–40%' and x['screen']==screen]
    x=next((x for x in cases if x['run']=='KSX97DF5H3NY'),cases[0] if cases else None)
    if x:lines += [f'- {screen} {len(cases)}节点：{x["run"]} F{x["floor"]}入口{x["entry_hp"]}→节点末{x["exit_hp"]}，后F{x["next_floor"]}/{x["next_type"]}损{x["next_loss"]}、死{x["next_death"]}。']
lines += ['','各阶HEAL后独立战去重；非HEAL包括其他火动作，旧A8同火多动作不误作独立火。','','| 进阶/局数 | 独立火/HEAL/非HEAL动作 | 实回 | 后战/死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):lines += [f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"]:.2f}% | {r["median"]} |']
lines += ['','SL同房多试，判死截断与实际赢/死分开；新局0条、旧汇总不变。','','| 进阶 | 重打场/尝试/实际赢 |','| --- | --- |']
for r in json.load(open(O/'sl-summary.json')):lines += [f'| A{r["asc"]} | {r["fights"]}/{r["attempts"]}/{r["wins"]} |']
groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
multi=[dict(run=k[0],floor=k[1],asc=RM[k[0]]['ascension'],attempts=v,wins=sum(x['result']=='won' for x in v)) for k,v in groups.items() if max(x['attempt'] for x in v)>1]
(O/'sl-comparisons.json').write_text(json.dumps(multi,ensure_ascii=False,indent=2)+'\n')
lines += ['','- 全历史多试的实际赢家、explore/sl_explore、退出及记录抽序保存sl-comparisons/逐局原件。旧QHK1XQ928TTM负力下毒杀胜例、P2M3DFJ4DEZ3女王前两败末胜的药时点/后序混杂、CSLHFCBSC1UM六败同盘多损5多扣9的局部对照限制均保持；新局无重打赢家改变项，不新增运气或一次换线因果。',
    '','### 经验库自己带偏或写了没被执行的地方','',
    '- 实际DeepSeek与其推理0条，无其引用经验后相反执行的原话。Codex开场原文“先商店补输出，营火后打一精英，末段购物备战。”；F7确实回血，F8/F9仍耗血药且F12败。F11计划先过强制走廊再去火/商店，但未走到；这不是已证明经验误导、拒绝已有恢复或改线重犯。',
    '- 计划要步法/毒雾/触媒，能力药步法只在F8临时建立，F9永久步法在F12T3手中未打；不能把未施牌当已建，也不能仅由未打反推能力应优先。0295分配缺口repeat属于旧代码定位，本轮不是伪保证斩杀重犯。护栏替线兑现但无原线整战胜果，不列纯bug。',
    '','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
    e=c['after']
    if e['id'] not in names:continue
    reasoning,case=e['lesson'].split('典型案例：',1)
    lines += [f'| {names[e["id"]]} | {reasoning} | {e["n_support"]}/{e["n_contradict"]}；分阶{H[e["id"]]["by_asc"]}；适用{e["asc"]}；完整evidence/contradicting见经验和historical-mechanism-summary | {case} | {e["id"]} |']
ritual=json.load(open(O/'ritual-history.json'))
for enemy in sorted({x['enemy'] for x in ritual}):
    r=[x for x in ritual if x['enemy']==enemy];rs={x['run'] for x in r}
    lines += [f'- 仪式子公式{enemy}：{len(rs)}局/{len(r)}个完整相邻结束窗口符合力增=现场仪式层，层数{sorted({x["ritual"] for x in r})}、分阶{dict(collections.Counter(RM[n]["ascension"] for n in rs))}；全局号/窗口见ritual-history.json。综合力量条目的155支持不等于每个子参数均验证155局；本局2/6不套雕刻师9。']
lines += ['- 159局实际动作/遭遇与869段本角色历史主题复核；旧支持按已核语义，出现集合只检索，不当整条机制支持分母。翻滚20局97实际动作均直接核正延后层/当步挡；修饰另列，未观察组合不外推。18局25次固化全部B→3B。毒牌模板基础与修饰后显示分开；整战单因未控写观察。',
    '','### 新增','']
for c in C:
    if c['before'] is None:lines += [f'- {c["id"]}：{c["after"]["scope"]}，支持{c["after"]["n_support"]}/反例0、high、机制[0,20]；只核实已建延后挡边界，不外推所有倍率/重复分支；账本{",".join(M[c["id"]])}。']
lines += ['','### 更新','']
for c in C:
    if c['before']:
        added=[r for r in c['after']['evidence'] if r not in c['before']['evidence']]
        lines += [f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加{",".join(added)}及近例/数字，asc/反例保持；账本{",".join(M[c["id"]])}。']
lines += ['','### 退役','','- 无；无反例多于支持、高阶推翻或本任务源码修复。','',
    '### 和手写知识及代码冲突','',
    '- 无独立silent手写攻略；其余8份JSON逐份核来源/切点/口径及SHA，与上一批全相同，无需改。room-costs旧MAP房分母、monster-records尝试遭遇、outcome-stats旧切点、fight-value/gates固定训练数据不当159局净损统计；不同分母不作冲突。本局未到boss/双boss，double-boss/boss-trust原验证限制保持。核验见other-knowledge.json。',
    '- 当前reflex/turn-solver.ts:2284/:2536以最高HP+挡选随机毒目标，施毒不变即时HP；随机毒与随机直伤不能凭同总伤验证逐敌收尾。reflex/combat-plan.ts:596起护栏比较即时hpLoss，:3269显示hpAfter，−2为4−6。这些手写代码本任务只读，0295纯bug仍observed。三提案'+','.join(P)+'全部source_task=experience-update、target_task=strategy-proposal，10个变更active均关联经验/账本/本角色局；实际domains combat/potion/terminal，均pending，无源码implemented/shipped。',
    '','### 代码问题（不给 DS）','',
    '- 无新纯bug；0295旧逐敌分配缺口只提案关联，真实随机毒数据进卡牌条目。符合现行护栏规则的取舍不判纯bug；mod致死提示忽略钙化毒杀/珊瑚毒斩杀的窗口不另造缺陷，实际代码预测一致。',
    '- 缺完整开局dirty知识数据、逐击毛伤/过量与炸弹部分归零内部全序、完整实际执行最优比例、护栏原线/随机毒另分配/留药/换路线整战反事实、药水表加载原因、未到后幕/boss资源、boss时钟实打/比值、Jev缓存和实际费用、Codex实际费用，均保留未知。',
    '- 核验初稿误把F6T2第一张攻击后的s315961当T1结束，断言净扣15对9失败；原脚本/日志保留，改正确T2轮初s315960后17项通过。首稿翻滚案例从旧账本带入1NZ但本轮直接支持集合无该局，最终换61E实际5/5窗口；固化发现旧P2M未列证据后补账本/经验，未把18局25饮写成17局。探索错误路径brain/combat-plan.ts不存在，已按reflex正确路径只读核验；均未改产品源码或旧基线。',
    '- 沙箱首跑tsc0、vitest只显示RUN约7分钟，被本任务提前中断，exit130且无用例结果；随后读上一批原日志确认相同入口耗时881.69秒、仅末尾汇总，首跑中断不能当代码失败。原日志/status保留，重跑同一入口并按实际结果登记。Node线程通信诊断初稿因ES模块里require报错，改import后worker-ok；不改测试源码或排除名单。',
    '','### 测试','',
    f'- bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1；tsc={T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，重跑{T["rerun"]}。固定数据/排除名单/60000预算不改，完整外部套件交调度器。',
    '- JSON合法；scope/name/n/evidence/角色/asc与未改条目等价核验；旧158局七数组/血档/节点/回血/SL及新真实帧通过。check-experience missing=[]退出0，git diff --check/gitleaks0，ledger.py check0。',
    '- 账本新增'+','.join(L['added'])+'（提交后proposed）；旧项proposed '+','.join(L['proposed'])+'；退役无。首证/prior/claim/support/repeat/旧版本历史保持，实际数据shipped交运维据完成事件；0295只提案关联，三源码提案pending。',
    '- live锁内：'+Z['result']+'；刷新'+str(Z.get('refresh'))+'；合前'+str(Z.get('pre'))+'；实际合入'+str(Z.get('merged'))+'。']
if Z.get('conflicts'):lines += ['- '+x for x in Z['conflicts']]
if Z.get('overlap_conflicts'):lines += ['- 不同知识重叠：'+','.join(Z['overlap_conflicts'])]
if not Z.get('merged'):lines += ['- 按任务冲突即停，不硬解、实际合并或覆盖刷新/并行记录；未合入，待调用方/运维完成事件兜底。未造eval上线版本或实际规则双通知，不停对局。']
else:lines += ['- 合后沙箱通过，上线decision/eval及运维通知按实际版本登记；对应账本不由本任务标shipped。']
lines += ['','### 切片大小','',
    '- 固定种子20260929，截止前silent最高两阶A9/A10、各阶每界面20×6=240配对；manifest保留池/时间戳，各池足20。CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其他知识，前后只替换经验。','','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in rows:lines += [f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |']
lines += [f'- 整体中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字），配对差中位{sl["paired_median"]}，最大{sl["before_max"]}→{sl["after_max"]}；单片最少{sl["min_change"]}、最多增加{sl["max_growth"]}。',
    f'- active{U["after"]["active"]}，正文{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。无预算合并/退役/压缩，需要Roy定：无。','',
    '原始子集/偏移、复算/初稿失败、核验、提案/CLI、切片、测试、合入预检/结果、完整报告全部保留'+str(O)+'。','']
section='\n'.join(lines)
(O/'changelog-section.md').write_text(section)
short=['## 经验库更新回报',
    f'- 版本：2026-10-09.11 → 2026-10-09.12；提交：{source}（分支 exp-silent）；合入：'+(Z.get('merged') or f'未合入（锁内预检发现{len(Z.get("conflicts",[]))}处历史记录/数据冲突，live保持{Z.get("pre")[:8]}，待调用方/运维兜底）'),
    '- 条数：新增1、更新9（加证据9、只改数字0）、退役0；active192→193，正文51606→51873字；A8适用180条/48227字，A9适用181条/48511字。',
    '- 机制推理：']
for c in C:
    e=c['after']
    if e['id'] in names:short += [f'  - {names[e["id"]]} — {e["lesson"].split("机制：")[0]} — 支持{e["n_support"]}/反例{e["n_contradict"]}局 — RZ6YAC7K89NM。']
short += ['- 改了的手写知识：无。',
    f'- 测试：tsc退出{T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；'+('重跑一次；首跑提前中断130，无用例结果。' if T['rerun'] else '未重跑。'),
    f'- 切片大小：中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字）；最大{sl["after_max"]}字。',
    '- 学习账本：新增'+','.join(L['added'])+'；改成proposed '+','.join(L['proposed'])+'；退役无；ledger.py check退出0。',
    '- 需要 Roy 定的事：无。','']
result=dict(task='experience-update',version='2026-10-09.12',commit=source,merged=Z.get('merged'),added=1,updated=9,retired=0,active=193,mechanisms=[x['name'] for x in F],tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=dict(added=L['added'],proposed=L['proposed'],retired=L['retired'],check=0),code_proposals=P,implementation_domains=['combat','potion','terminal'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text('\n'.join(short)+'\n```json\n'+json.dumps(result,ensure_ascii=False)+'\n```\n\n'+section)
path=ROOT/'paper/materials/experience-changelog-silent.md'
with path.open('a+b') as f:
    fcntl.flock(f,fcntl.LOCK_EX)
    f.seek(0);old=f.read();assert heading.encode() not in old
    offset=len(old);f.seek(0,2);f.write(('\n'+section).encode());f.flush()
    f.seek(0);new=f.read();assert new[:offset]==old
(O/'changelog-append.json').write_text(json.dumps(dict(before_size=offset,before_sha256=hashlib.sha256(old).hexdigest(),bytes_added=len(new)-offset,heading=heading),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
