import collections
import fcntl
import hashlib
import json
import statistics
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
A = json.load(open(O / 'audit.json'))
U = json.load(open(O / 'update-summary.json'))
C = json.load(open(O / 'changes.json'))['entries']
H = {r['id']: r for r in json.load(open(O / 'historical-mechanism-summary.json'))}
R = json.load(open(O / 'run-metadata.json'))
RM = {r['run_id']: r for r in R}
M = json.load(open(O / 'ledger-map.json'))
P = json.load(open(O / 'proposal-ids.json'))
T = json.load(open(O / 'test-results.json'))
L = json.load(open(O / 'ledger-results.json'))
Z = json.load(open(O / 'live-merge.json'))
source = (O / 'source-commit.txt').read_text().strip()
heading = (O / 'changelog-heading.txt').read_text().strip()
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
names = {
    'silent-deck-burst-observation': '长战组件兑现（观察）',
    'silent-strength-weak-observation': '力量/敏捷与敌成长',
    'silent-lagavulin-siphon-poison-sl': '族母吸取与SL血价（观察）',
    'silent-deadly-poison-application': '致命毒药施毒与实结',
    'silent-haze-group-poison-weak': '迷雾群毒与虚弱',
    'silent-poisoned-stab-components': '刺击直伤与施毒',
    'silent-replay-effect-counter-observation': '重放效果与手动计数',
}
F = [dict(name=names[c['id']], id=c['id'], support=c['after']['n_support'], contradict=c['after']['n_contradict'], example='CSLHFCBSC1UM') for c in C if c['id'] in names]
(O / 'mechanisms.json').write_text(json.dumps(F, ensure_ascii=False, indent=2) + '\n')
b = json.load(open(O / 'slice-before.json'))
a = json.load(open(O / 'slice-after.json'))
bs, az, ds, rows = [], [], [], []
for x, y in zip(b, a):
    assert x['sample'] == y['sample'] and x['n'] == y['n'] == 20
    diffs = [v - u for u, v in zip(x['sizes'], y['sizes'])]
    bs += x['sizes']; az += y['sizes']; ds += diffs
    rows.append(dict(sample=x['sample'], before_median=x['median'], before_max=x['max'], after_median=y['median'], after_max=y['max'], paired_median=statistics.median(diffs)))
sl = dict(before_median=statistics.median(bs), after_median=statistics.median(az), median_change=statistics.median(az)-statistics.median(bs), paired_median=statistics.median(ds), before_max=max(bs), after_max=max(az), max_growth=max(ds), min_change=min(ds), rows=rows)
(O / 'slice-summary.json').write_text(json.dumps(sl, ensure_ascii=False, indent=2) + '\n')
lines = [heading, '', '### 来源', '',
    f'- 记录时间{stamp}。根notes/lessons.md:7215的CSLHFCBSC1UM静默小节与局报run-1009-0701-CSLHFCBSC1UM.md只读；本小节后无新勘误。runs.jsonl:639为SILENT/A10/F17败，3d05e954+dirty，完整dirty源码未记录。last_seen取笔记run-1009日期，无跨角色跳过。',
    '- exp-silent开工干净，git merge --no-edit main快进7c1d9b20→baa45e19，无冲突。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建和最近两次静默增量方法、账本README已读，独立完成。数据脚本nice19，不联网、不运行play或boss模拟池；沙箱固定测试单worker。',
    f'- 全引擎本角色学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}。旧157局只进数字和机制核验，缺character的旧局/其他角色/进行中/切点后局排除，不称纯Codex爬塔成绩。',
    '- 按局号rg抽468决策/16脑/6SL/2计划；states/reasoning按2026-10-08T22:40:47.195Z—23:01:33.472Z二分字节seek流式抽取，480状态逐帧核run_id/character_id，并与复盘原帧全等。实际脑16次全Codex，DeepSeek及同窗reasoning0，ds_*兼容字段不作引擎证据。',
    '- 口径沿上一批：同房首COMBAT入口HP−末次退出HP，包含自损/回复，不等毛伤；SL同房一场，判死截断不是实死。走廊只Monster，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient；多节点可关联同战，HEAL后战再去重。',
    '- 旧157局原始只读子集重新运行analyze/audit；七数组、血档房/局/损/死、节点转移、回血、SL逐项对上，无口径漂移。' + json.dumps(json.load(open(O / 'baseline-check.json')), ensure_ascii=False),
    f'- 新增0、更新9（加证据9、只改数字0）、退役0；active192→192，正文51439→{U["after"]["chars"]}字符。低于55000压缩线/60000预算，无预算合并/退役；只替换九条近例，旧完整案例与证据保留before/changes/历史。',
    '', '### 对照数据检查的主题', '', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for c in C:
    e = c['after']
    lines += [f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{H[e["id"]]["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |']
lines += ['', '新局独立房资源：入口→退出，净损含自损/回复，末战只一次实际死亡。', '', '| 层/幕/房型 | 首帧敌人 | HP入口→出口/净损 | 实死 |', '| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run'] == 'CSLHFCBSC1UM':
        lines += [f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |']
lines += ['',
    '- 九胜净损55，初56−55＋三次实回21=64；F7以39血锻造致命毒药不回血，F8问号战到33，F9回54、F11赢到41、F12赢零损补明耀、F13回62、F14饮明耀零损、F15赢损19到43、F16回64。获5瓶/饮5/弃0/复活0；开槽与补药分账。五次SL恢复2/8/8/5/8→64空药，不当自然回血或新获药。未到二/三幕，无F48/F49资源证据。',
    '- 族母233本体/12初挡，六试无已见回血。首五截断末敌31/60/67/63/63，末试真实毒结后56。首试十轮净扣202含末轮0（毒未结），末试扣177含末毒16；清233需23.3/轮为事后预算，不是当时校准时钟。末T10 10血6挡对25完整需损19，需至少20血存活、差10；实死帧仅扣剩10，不把预测剩−9写成只损9。',
    '- 末试逐轮净扣[3,33,21,4,14,20,20,29,17,16]、净损[0,16,0,0,0,11,15,12,0,10]。毒/破挡/本体伤分列；T6含弱17、同無弱SLASH T2的21→T10的25才对应敌力0→4。T4后空翻重问实际改全挡，不拿原线完整10伤与实际4直接算模型误差。',
    '- 原题78道Jev战斗选线70道rollout_best_chosen=true，boss50道43真；这是原答字段，完整实际执行最优率未记录。HP护栏0，已发生护栏代价0，三个明确SL替换第4T2/第5T5/第6T3另账。第三试explore.deviation声称按回答、未证明确新候选，不凭元数据虚构替线。',
    '', '分阶/幕/房型全部非空血档；房数、独立局数与实际死亡分列，存活净损排实死。', '', '| 进阶/幕/房型/血档 | 房数/局数 | 实死/率 | 存活净损中位 |', '| --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:
        lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["type"]}/{r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines += ['', '休息/商店/普通事件入口血关联后战；节点可以重复指向同战，未关联者不计。', '', '| 进阶/幕/节点/血档 | 节点数/独立后战 | 后战实死/关联率 | 存活净损中位 |', '| --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:
        lines += [f'| A{r["asc"]}/幕{r["act"]}/{r["screen"]}/{r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |']
lines += ['', '低血不同节点仅观察，同A10二幕25–40%但构筑/后战/回血不同，不能定改线实际更优：', '']
for screen in ['REST', 'SHOP', 'EVENT']:
    cases = [x for x in A['nexts'] if RM[x['run']]['ascension'] == 10 and x['act'] == 2 and x['band'] == '25–40%' and x['screen'] == screen]
    example = next((x for x in cases if x['run'] == 'KSX97DF5H3NY'), cases[0] if cases else None)
    if example:
        lines += [f'- {screen} {len(cases)}节点：{example["run"]} F{example["floor"]}入口{example["entry_hp"]}→节点末{example["exit_hp"]}，后F{example["next_floor"]}/{example["next_type"]}损{example["next_loss"]}、死{example["next_death"]}。']
lines += ['', '各阶回血后独立战去重，非HEAL包含其他火堆动作（旧A8一局有多动作，不把动作数当独立火数）。', '', '| 进阶/局数 | 独立火/HEAL/非HEAL动作 | 实回 | 后战/死/率 | 活损中位 |', '| --- | --- | --- | --- | --- |']
for r in json.load(open(O / 'rest-summary.json')):
    lines += [f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"]:.2f}% | {r["median"]} |']
lines += ['', 'SL同房多试，判死截断与实际赢/死分开：', '', '| 进阶 | 重打场/尝试/实际赢 |', '| --- | --- |']
for r in json.load(open(O / 'sl-summary.json')):
    lines += [f'| A{r["asc"]} | {r["fights"]}/{r["attempts"]}/{r["wins"]} |']
groups = collections.defaultdict(list)
for x in A['attempts']: groups[(x['run'], x['floor'])].append(x)
multi = [dict(run=k[0], floor=k[1], asc=RM[k[0]]['ascension'], attempts=v, wins=sum(x['result'] == 'won' for x in v)) for k, v in groups.items() if max(x['attempt'] for x in v) > 1]
(O / 'sl-comparisons.json').write_text(json.dumps(multi, ensure_ascii=False, indent=2) + '\n')
lines += ['',
    '- 全历史多试的实际赢家、explore/sl_explore、退出与记录抽序保留sl-comparisons/逐局原件。族母真正SL全阶8场44试2赢、A10 6场32试1赢；旧QHK1XQ928TTM负力下毒杀是胜例，新六试全败支持同一机制，不算机制反例。旧胜场后序/组件混杂限制保留，不追加未验证运气因果。',
    '- 新局第4T2对首T2指纹完全一致，少挡换伤实际损16→21、净扣33→42；saturated/tied及各0%无赢样本不等同样安全。第6T3反向损5→0、扣32→21（原线未实际执行，替线兑现）；第5T5替线实少4伤/损仍0。六试0赢，无赢家改变项可归纳，不定哪线整场更优。',
    '', '### 经验库自己带偏或写了没被执行的地方', '',
    '- 实际DeepSeek与推理0条，没有其引用条目后相反执行的原话。Codex开局原文“四火保障恢复升级，两次精英积累遗物，前期战斗补强。”；计划要步法/毒雾/触媒而未得到，不能把计划写成已建，也不称未拿到就是拒拿错误。',
    '- F9计划改避精英但已选两次均必经，未证可避免路线重犯；0019/0030是support。0079第4T2少挡换伤记repeat，第三试元数据不够不能造重复。原答最优字段与SL替代后实盘不同，不能说实际始终照最优；没有原线整战胜果，不把合规探索当纯bug。',
    '', '### 机制推理', '', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |']
for c in C:
    e = c['after']
    if e['id'] not in names: continue
    reasoning, case = e['lesson'].split('典型案例：', 1)
    lines += [f'| {names[e["id"]]} | {reasoning} | {e["n_support"]}/{e["n_contradict"]}；分阶{H[e["id"]]["by_asc"]}；适用{e["asc"]}；完整局号见experience和historical-mechanism-summary | {case} | {e["id"]} |']
lines += ['', '- 全部本角色复盘862主题段与158局实际动作/遭遇重新核验；旧支持沿已核语义，出现集合只作检索，不把共现当整个机制支持。族母20证据局94个相邻轮完整−2力/−2敏/+2敌力窗口匹配；三牌660/202/525次实际动作的基础施毒各5或7/4或6/3或4吻合，修饰后显示值和制品/重放等组合另账，详情historical-formula-checks.json。23项关键核验＋13项补充核验通过，480新抽帧与复盘原帧全等；玩家未建立永久正力量/敏捷及计划能力，不给未建牌增证。整战单因未控制者写观察。',
    '', '### 新增', '', '- 无，同事并已有条目。', '', '### 更新', '']
for c in C:
    lines += [f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，加CSLHFCBSC1UM/近例/数字，asc/反例保持；账本{",".join(M[c["id"]])}。']
lines += ['', '### 退役', '', '- 无，无反例多于支持、高阶推翻或本任务源码修复。', '', '### 和手写知识及代码冲突', '',
    '- 无独立silent手写攻略，其余8份JSON逐份核来源/切点/口径并核SHA，与上批相同，无手写知识要改。room-costs旧MAP分母、monster-records尝试遭遇、outcome-stats旧切点、fight-value/gates固定模型不当本158局净损统计；不同分母不作数据冲突。本局未到双boss，double-boss/boss-trust限制保持，不重建。核验见other-knowledge.json。',
    '- 当前combat-plan.ts:3269输出hpAfter；本局−9就是10−19，不是只损9。sl/explore.ts:1000起饱和逻辑与未试探索存在血价/进度审计需求，代码手写知识本任务不改。三独立提案' + ','.join(P) + '，source_task=experience-update、target_task=strategy-proposal，九变更active均关联experience/账本/本角色证据；实际领域combat/potion/sl/terminal，均pending，无源码implemented/shipped。',
    '', '### 代码问题（不给 DS）', '',
    '- 无新纯bug；本任务不改打法源码。重复牌实际效果与手动计数需分账，SL探索取舍是规则核验提案，不笼统定基础设施bug。',
    '- 缺完整dirty运行树、前五试最终结算/退出血、逐击毛伤/过量与部分归零/内部致死顺序、原线/留药/改线/构筑整战受控反事实、后续幕资源、完整实际最优执行比例、silent时钟估值/比值、Jev缓存和实际费用、Codex实际费用，均保留未知。',
    '- 补充验证初稿把cards_played_this_turn取在combat层而不是player层，断言None失败；原脚本/失败日志保留，改按原player字段后13项通过。原explore有四处deviation但第三试未证实际候选替换，最终报告仍只三个明确替换。抽取验证错误不改产品源码或旧汇总。',
    '- 历史公式核验初稿误用current_value当基础毒量，致命毒药出现6/8断言失败；原初稿和日志保留。改核base_value后660次普通/升级基础5/7吻合，修饰后显示与当步实际差另列，不误记机制反例；另外迷雾202次基础4/6与刺击525次基础3/4均吻合。',
    '', '### 测试', '',
    f'- bash agent/tools/test-sandbox.sh，TMPDIR本scratch，PATH本机node，SANDBOX_WORKERS=1；CHARACTER只给知识工具。tsc={T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，重跑{T["rerun"]}；固定数据/排除名单/60000预算和experience测试SHA不改，完整外部套件交调度器。',
    '- JSON合法，scope/name/n/evidence/角色/asc、未改条目等价、旧157局统计一致、新关键帧均通过；check-experience missing=[]退出0，diff --check/gitleaks0，ledger.py check0。',
    '- 账本新增[]；提交后proposed ' + ','.join(L['proposed']) + '；退役[]。首证/prior/claim/support/repeat/旧版本历史保持，实际数据shipped交运维按完成事件，三源码提案pending。',
    '- live锁内：' + Z['result'] + '；刷新' + str(Z.get('refresh')) + '；合前' + str(Z.get('pre')) + '；实际合入' + str(Z.get('merged')) + '。']
if Z.get('conflicts'): lines += ['- ' + x for x in Z['conflicts']]
if Z.get('overlap_conflicts'): lines += ['- 不同知识重叠：' + ','.join(Z['overlap_conflicts'])]
if not Z.get('merged'):
    lines += ['- 合入预检冲突按任务停止，不实际合并、硬解或覆盖刷新/并行记录；未合入，待调用方/运维完成事件兜底。未造eval上线版本或规则实际双通知，不停对局。']
lines += ['', '### 切片大小', '',
    '- 固定种子20260929，从截止前silent状态最高两阶A9/A10各阶每界面20×6=240配对，manifest保留池/时间戳；各池均足20。CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其他知识，前后只替换经验。', '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |', '| --- | --- | --- | --- |']
for r in rows:
    lines += [f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |']
lines += [f'- 整体中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字），配对差中位{sl["paired_median"]}，最大{sl["before_max"]}→{sl["after_max"]}；单片最少{sl["min_change"]}、最多增加{sl["max_growth"]}。',
    f'- active192，正文{U["after"]["chars"]}字符，置信度{U["after"]["confidence"]}；A8 {U["after"]["applicable"]["8"]}；A9 {U["after"]["applicable"]["9"]}；A10 {U["after"]["applicable"]["10"]}。没有预算合并/退役，需要Roy定：无。', '',
    '原始子集/偏移、复算/初稿失败、核验、提案/CLI、切片、测试、合入预检/结果、报告全部保留' + str(O) + '。', '']
section = '\n'.join(lines).replace('同無弱', '同无弱').replace('同事并已有', '同一件事并已有')
(O / 'changelog-section.md').write_text(section)
short = ['## 经验库更新回报',
    f'- 版本：2026-10-09.10 → 2026-10-09.11；提交：{source}（分支 exp-silent）；合入：' + (Z.get('merged') or '未合入（live预检冲突，待调用方/运维兜底）'),
    '- 条数：新增0、更新9（加证据9、只改数字0）、退役0；active192→192，正文51439→51606字；A8适用179条/47960字，A9适用180条/48244字。',
    '- 机制推理：']
for c in C:
    e = c['after']
    if e['id'] in names:
        short += [f'  - {names[e["id"]]} — {e["lesson"].split("机制：")[0]} — 支持{e["n_support"]}/反例{e["n_contradict"]}局 — CSLHFCBSC1UM。']
short += ['- 改了的手写知识：无。',
    f'- 测试：tsc退出{T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；' + ('重跑过。' if T['rerun'] else '未重跑。'),
    f'- 切片大小：中位{sl["before_median"]}→{sl["after_median"]}（{sl["median_change"]:+}字）；最大{sl["after_max"]}字。',
    '- 学习账本：新增无；改成proposed ' + ','.join(L['proposed']) + '；退役无；ledger.py check退出0。',
    '- 需要 Roy 定的事：无。', '']
result = dict(task='experience-update', version='2026-10-09.11', commit=source, merged=Z.get('merged'), added=0, updated=9, retired=0, active=192, mechanisms=[r['name'] for r in F], tests=dict(tsc=T['tsc'], vitest=T['vitest'], cases=T['cases']), ledger=dict(added=L['added'], proposed=L['proposed'], retired=L['retired'], check=0), code_proposals=P, implementation_domains=['combat', 'potion', 'sl', 'terminal'], report=str(O / 'report.md'))
(O / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(O / 'report.md').write_text('\n'.join(short) + '\n```json\n' + json.dumps(result, ensure_ascii=False) + '\n```\n\n' + section)
path = ROOT / 'paper/materials/experience-changelog-silent.md'
with path.open('a+b') as f:
    fcntl.flock(f, fcntl.LOCK_EX)
    f.seek(0); before = f.read()
    assert heading.encode() not in before
    offset = len(before)
    f.seek(0, 2); f.write(('\n' + section).encode()); f.flush()
    f.seek(0); after = f.read()
    assert after[:offset] == before
(O / 'changelog-append.json').write_text(json.dumps(dict(before_size=offset, before_sha256=hashlib.sha256(before).hexdigest(), bytes_added=len(after)-offset, heading=heading), ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
