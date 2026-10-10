import collections
import fcntl
import hashlib
import json
import os
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
sl=json.load(open(O/'slice-summary.json'))
source=(O/'source-commit.txt').read_text().strip()
heading=(O/'changelog-heading.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
names={
    'silent-deck-burst-observation':'长战输出与后续生存（观察）',
    'silent-strength-weak-observation':'力量逐段与已建属性',
    'silent-poisoned-stab-components':'刺击施毒、实结与回复',
    'silent-giant-explosion-window':'巨兽本体与自爆分阶段',
    'silent-terror-eel-vigor-vulnerable':'骇鳗活力、易伤与阈值',
    'silent-gardener-skittish-shield':'胆小盾、直伤与毒退场',
}
mechanisms=[dict(name=names[c['id']],id=c['id'],support=c['after']['n_support'],contradict=c['after']['n_contradict'],example='SDY5T9XCSQN2') for c in C if c['id'] in names]
(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
def cell(value):
    return str(value).replace('|','／').replace('\n',' ')
def rate(d,n):
    return f'{100*d/n:.2f}%' if n else '无样本'
lines=[heading,'','### 来源','',
    f'- 记录时间{stamp}。只读根notes/lessons.md:7332的SDY5T9XCSQN2静默猎手小节和run-1009-0747-SDY5T9XCSQN2.md日期；小节后未发现勘误。runs.jsonl:641确认SILENT/A10/F17败、cfa8112d+dirty；完整dirty源码/知识未记录，不把当前live源码当当局完整树。无跨角色跳过，last_seen取run-1009日期。',
    '- exp-silent开工干净，git merge --no-edit main快进6c5a3f61→a8301bda，无冲突；README、最新STATE、decision-log末尾、学习协议、代码提案闭环、首次构建和最近两次增量方法、账本README已读。独立完成，不派agent、不联网、不运行play。数据脚本nice19/单进程，沙箱测试单worker，无boss模拟池。',
    f'- 全引擎本角色学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。旧159局只进数字与机制复核，不冒称纯Codex爬塔成绩；缺character旧铁甲、其他角色、进行中与切点后局排除。',
    '- 按run id rg抽644决策/17脑/6SL/2计划；states/reasoning按2026-10-08T23:20:26.637Z—23:47:30.633Z二分字节seek流式抽取，652帧核state.run.character_id及局号，与复盘原帧全等。复盘原件32项（包含所有原偏移逐条seek）及本局机制14项通过；脑全Codex，DeepSeek及同窗reasoning0，兼容ds_*不作实际引擎调用证据。',
    '- 口径同上一批：同房首COMBAT入口HP−末次退出HP，包含自损/回复，不等敌毛伤；SL一房一场，判死截断非实死。Monster才是走廊，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient；多节点可关联同战，HEAL后战再去重。房数/节点数/动作数/局数分别写，未列血档组合n=0。',
    '- 旧159局原抽取子集重跑analyze/audit，七数组、血档房/局/损/死、节点、回血及SL全部对上，无口径漂移：'+cell(json.load(open(O/'baseline-check.json'))),
    f'- 新增0、更新8（加证据8、只改数字0）、退役0；active{U["before"]["entries"]}→{U["after"]["entries"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字符，低于55000压缩线/60000预算。本次未预算合并、退役或压缩；替换近例前的完整正文、evidence/contradicting保留before/changes/历史。',
    '','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after']
    lines += [f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{H[e["id"]]["by_asc"]}；账本{",".join(M[e["id"]])} | {cell(e["lesson"])} |']
lines += ['','按进阶/幕/房型/入口血档；n是独立战斗房，赢战净损中位包含自损/恢复。','','| 进阶/幕/房型/入口血档 | 房/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:
        lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{rate(r["deaths"],r["n"])} | {r["median_win"]} |']
lines += ['','节点入口血档→下一更高层战斗，n为节点数；同一战可能由多个节点指向，不当独立对照。','','| 进阶/幕/节点/入口血档 | 节点/独立后战 | 死/率 | 活损中位 |','| --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:
        lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{rate(r["deaths"],r["n"])} | {r["median_win"]} |']
lines += ['','- 低血不同节点的结果只作观察：卡组、强制路线和节点后的战斗不同，不把组间死亡率当改路线因果。本局F9另一线亦通精英，只把精英提早至F12；选F9/F11回血后F13仍必经。各阶尤其A8仅1局/A9仅3局，未观察分支不外推。']
for screen in ['REST','SHOP','EVENT']:
    cases=[x for x in A['nexts'] if RM[x['run']]['ascension']==10 and x['act']==2 and x['band']=='25–40%' and x['screen']==screen]
    if cases:
        x=cases[0]
        lines += [f'- A10二幕25–40%入口{screen}共{len(cases)}节点例：{x["run"]} F{x["floor"]} {x["entry_hp"]}→{x["exit_hp"]}，后F{x["next_floor"]}/{x["next_type"]}损{x["next_loss"]}、死{x["next_death"]}；其他节点全例在audit.json，不据非配对比较拟安全血线。']
lines += ['','各阶HEAL后战独立去重；非HEAL包含其他火动作，A8同火多动作不当多座火。','','| 进阶/局数 | 独立火/HEAL/非HEAL动作 | 实回 | 后战/死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):
    lines += [f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{rate(r["deaths"],r["nexts"])} | {r["median"]} |']
lines += ['','SL一房多试；实际赢、实际死、判死读档截断分开。','','| 进阶 | 重打场/尝试/实际赢 |','| --- | --- |']
for r in json.load(open(O/'sl-summary.json')):
    lines += [f'| A{r["asc"]} | {r["fights"]}/{r["attempts"]}/{r["wins"]} |']
groups=collections.defaultdict(list)
for x in A['attempts']:
    groups[(x['run'],x['floor'])].append(x)
multi=[dict(run=k[0],floor=k[1],asc=RM[k[0]]['ascension'],attempts=v,wins=sum(x['result']=='won' for x in v)) for k,v in groups.items() if max(x['attempt'] for x in v)>1]
(O/'sl-comparisons.json').write_text(json.dumps(multi,ensure_ascii=False,indent=2)+'\n')
lines += ['','- 全历史每场的实际赢家、失败回合/末血、explore/reference/deviation及原始draws完整保留sl-comparisons.json；保留旧C48LLXBGKXQ9本体早四轮自爆少12的两试1赢观察、QHK1XQ928TTM负力量仍毒杀胜例、P2M3DFJ4DEZ3女王前两败末赢的喝药时点/后序混杂。没有重打赢例的新局不增加胜因或运气判断。',
    '- 新局一场六试0赢，六试所记录首20张抽序完全相同，不代表之后抽牌相同。结束回合16/16/15/16/16/15，末帧HP8/11/11/11/6/0；前五次无最终结算/退出帧，末次实死。第2试只有second权重，第三至六试均参考2、在T10/T2/T5/T4实际偏离；T5以打击换防御多付5血/题面多6伤，末血11→6但后序亦有差，不能单因归胜负。四试结束本体未过自爆，不计四赢。',
    '','### 经验库自己带偏或写了没被执行的地方','',
    '- 实际DeepSeek及其推理0条，无其引用经验后相反执行的原话。Codex开场原话“两精英四营火，兼顾遗物、升级与巨兽自爆血线。”；实际满血骇鳗仍损66，后续回血及换避可选精英均执行，F13仍必经，不按结果败倒推拒绝回血/改线重犯。',
    '- F16原话“Pantograph already provides 65 HP; resting adds only five. Upgrade Sucker Punch for sustained weakness, explosion protection, and strong simulated boss performance.”进场65兑现，但低可信B2估计不等整场保证；当时实HP40，缩放仪25只进boss触发。计划步法/毒雾/触媒未取得，boss无能力/敏捷，不当已建防御引擎。无引用经验误导的已证因果。',
    '- SL占位残血指标0250仍重复，代码输入/统计缺口与已学分阶段经验分账；本局未证明Jev认为本体归零等胜。第五试血价取舍补0079 repeat，不因“rollout未更常死”认为省挡无代价。',
    '','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
    e=c['after']
    if e['id'] in names:
        reasoning,case=e['lesson'].split('典型案例：',1)
        lines += [f'| {names[e["id"]]} | {cell(reasoning)} | {e["n_support"]}/{e["n_contradict"]}；分阶{H[e["id"]]["by_asc"]}；适用{e["asc"]}；完整局号见experience/historical-mechanism-summary | {cell(case)} | {e["id"]} |']
formulas=json.load(open(O/'historical-formula-checks.json'))
lines += [f'- {len(R)}局实盘动作/遭遇与881段静默历史主题复核；机制evidence的综合支持局数不等于每个子参数均验证该局数。其他角色未混入；历史出现集合只用于检索。基础刺击{formulas[1]["actions"]}次的毒量{formulas[1]["base_poison"]}符合普通3/升级4；修饰/制品/触媒/阶段另核，尚存毒不当已伤。',
    f'- 力量药历史{formulas[0]["runs"]}局/{formulas[0]["drinks"]}实飲，建力差分布{formulas[0]["strength_delta"]}；饰品等共现来源另核，不以全部饮药窗口证明“只建2力”或早饮胜因。本局建2力已逐帧独立核；敏捷/能力没有建立，不为未取得步法/毒雾等加新证据。巨兽末試T2—15蒸汽20→59逐轮+3，三次回复按相邻帧及毒余额收支核15，独立先后内部帧未知。',
    '','### 新增','','- 无，同一件事并已有条目。','', '### 更新','']
for c in C:
    e=c['after']
    lines += [f'- {e["id"]}：支持{c["before"]["n_support"]}→{e["n_support"]}，加SDY5T9XCSQN2、近例和数字；asc/反例保持；账本{",".join(M[e["id"]])}。']
lines += ['','### 退役','','- 无，没有反例多于支持或本任务源码已修机制；同题没有新增重复条目。',
    '','### 和手写知识及代码冲突','',
    '- 无独立silent手写攻略；其他8份JSON逐份核SHA/来源/切点/口径，与上一批相同。room-costs旧MAP分母、monster-records按尝试遭遇、outcome-stats旧截止、fight-value/gates固定模型不当本160局净损表；不同分母不作数据矛盾，不重建生成数据。double-boss/boss-trust未观察限制保持；核验见other-knowledge.json。无需改手写知识。',
    '- 当前live sl/explore.ts:896汇总HP、:913用于同回合排序，未区分占位阶段，与巨兽分阶段经验不一致，0250旧项不新造纯bug。F13护栏依据包括零损plan9，替线损5符合8宽限，不当错误触发。代码手写知识和打法源码本任务不改。',
    '- 三独立提案'+','.join(P)+'；source_task=experience-update、target_task=strategy-proposal，8变更active都关联经验/账本/本角色证据；实际领域combat/potion/sl/terminal，均pending，不称implemented/shipped。旧postmortem的e972b5909856ce15/466419f5023c7533保留，独立任务先按当前live祖先源码去重。',
    '','### 代码问题（不给 DS）','',
    '- 无新纯bug；0250的占位残血排序污染仍待独立任务，四条占位值相同，不认字段单独选错路径。末least-loss报损13对现场需损24，模型中间结果/原因未隔离，保留差异而不凭单数造新bug。精确切击题面已标手数/修正未验证，输出差不直接增纯bug。',
    '- 缺完整dirty树、前五试最终结算、部分末击/过量及毒回复独立时序、完整实际最优执行比例、原线/留药/改线/更早击杀兼活过自爆整战反事实、后幕资源、silent时钟估值/比值、Jev缓存和实际Jev/Codex费用，均保留未知。',
    '- 更新初稿将末试T14误写“两刺击、1→7毒”，提交前依据原件纠正为刺击+打击、2→5毒；update-initial.py保留，正式条目/提案按实帧38→26、结5毒与回复15到36。没有由初稿错误修改产品源码或旧统计。',
    '','### 测试','',
    f'- bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1，固定数据/原排除名单；tsc退出{T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，重跑{T["rerun"]}。CHARACTER=silent只给知识工具；60000预算及测试不改，完整外部套件交调度器。',
    '- JSON合法；n/evidence/角色/asc/scope/name及未改条目等价核验通过；check-experience missing=[]/退出0，diff --check/gitleaks0，ledger.py check0。',
    '- 账本新增无；提交后proposed '+','.join(L['proposed'])+'；退役无。首证/prior/claim和support/repeat/旧版本历史保持，0250仅原提案关联不改状态；实际数据shipped交运维据完成事件，源码提案均pending。',
    f'- live锁内结果：{Z.get("result")}；保存刷新{Z.get("refresh")}，合前{Z.get("pre")}，实际合入{Z.get("merged")}；合后测试{Z.get("tests")}。']
for conflict in Z.get('conflicts',[]):
    lines += ['- '+conflict]
if not Z.get('merged'):
    lines += ['- 合入预检发现冲突，按任务停止，不实际合并、硬解或覆盖刷新/并行记录。未合入，待调用方/运维完成事件兜底；未造eval上线版本或规则实际双通知，不停对局。']
lines += ['','### 切片大小','',
    '- 固定种子20260929，截止前silent最高两阶A9/A10、各阶每界面20×6=240配对；manifest保留池/时间戳，各池足20。CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其他知识，前后只替换经验。',
    '','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
b=json.load(open(O/'slice-before.json'));a=json.load(open(O/'slice-after.json'))
for x,y in zip(b,a):
    assert x['sample']==y['sample']
    diff=[v-u for u,v in zip(x['sizes'],y['sizes'])]
    lines += [f'| {x["sample"]} | {x["median"]}/{x["max"]} | {y["median"]}/{y["max"]} | {statistics.median(diff)} |']
lines += [f'- 整体中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_increase"]:+}字），配对差中位{sl["paired_median"]}，最大{sl["before_max"]}→{sl["after_max"]}；单片差{sl["min_difference"]}至{sl["max_difference"]}。',
    f'- active{U["after"]["entries"]}，正文{U["after"]["chars"]}字符，置信度{U["confidence"]}；A8 {U["by_asc"]["8"]}；A9 {U["by_asc"]["9"]}；A10 {U["by_asc"]["10"]}。无预算合并/退役/压缩，需要Roy定：无。',
    '',f'原始子集/偏移、复算/初稿、核验、提案/CLI、切片、测试、合入预检/结果和完整报告保留{O}。','']
section='\n'.join(lines)
(O/'changelog-section.md').write_text(section)
merge_label=Z.get('merged') or ('未合入（锁内预检'+str(len(Z.get('conflicts',[])))+'处历史记录/数据冲突；保留刷新，待调用方/运维兜底）')
short=['## 经验库更新回报','',
    f'- 版本：{U["old_version"]} → {U["version"]}；提交：{source}（分支 exp-silent）；合入：{merge_label}',
    f'- 条数：新增0、更新8（加证据8、只改数字0）、退役0；active193→193，正文51,884字符；A8适用180条/48,238字，A9适用181条/48,522字。',
    '- 机制推理：']
for c in C:
    e=c['after']
    if e['id'] in names:
        short += [f'  - {names[e["id"]]} — {e["lesson"].split("机制：")[0]} — 支持{e["n_support"]}/反例{e["n_contradict"]}局 — SDY5T9XCSQN2。']
short += ['- 改了的手写知识：无。',
    f'- 测试：tsc退出{T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；'+('重跑一次。' if T['rerun'] else '未重跑。'),
    f'- 切片大小：中位{sl["median_increase"]:+}字，最大{sl["after_max"]}字。',
    '- 学习账本：新增无；改成 proposed '+','.join(L['proposed'])+'；退役无；`ledger.py check`退出0。',
    '- 需要 Roy 定的事：无。','']
result=dict(task='experience-update',version=U['version'],commit=source,merged=Z.get('merged'),added=0,updated=8,retired=0,active=193,mechanisms=[x['name'] for x in mechanisms],tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=dict(added=L['added'],proposed=L['proposed'],retired=L['retired'],check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text('\n'.join(short)+'\n```json\n'+json.dumps(result,ensure_ascii=False)+'\n```\n\n'+section)
scan_text=section+'\n'+(O/'report.md').read_text()+'\n'+'\n'.join(p.read_text() for p in sorted(O.glob('proposal-*.md'))+sorted(O.glob('proposal-*.json')))
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=scan_text,text=True,capture_output=True)
(O/'gitleaks-final-records.log').write_text(scan.stdout+scan.stderr)
assert scan.returncode==0
path=ROOT/'paper/materials/experience-changelog-silent.md'
with path.open('a+b') as f:
    fcntl.flock(f,fcntl.LOCK_EX)
    f.seek(0);old=f.read();assert heading.encode() not in old
    offset=len(old);f.seek(0,2);f.write(('\n'+section).encode());f.flush();os.fsync(f.fileno())
    f.seek(0);new=f.read();assert new[:offset]==old
(O/'changelog-append.json').write_text(json.dumps(dict(before_size=offset,before_sha256=hashlib.sha256(old).hexdigest(),bytes_added=len(new)-offset,heading=heading),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
