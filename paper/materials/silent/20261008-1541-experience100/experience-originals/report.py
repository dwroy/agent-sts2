import collections
import json
import re
import subprocess
from pathlib import Path

O = Path(__file__).parent
N = 'H1T1F8ML9FUE'
now = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
A = json.load((O/'audit.json').open())
U = json.load((O/'update-summary.json').open())
C = json.load((O/'changes.json').open())['entries']
R = json.load((O/'run-metadata.json').open())
M = json.load((O/'ledger-map.json').open())
size = json.load((O/'slice-summary.json').open())
props = json.load((O/'code-proposal-ids.json').open())
live = json.load((O/'live-merge.json').open())
commit = (O/'source-commit.txt').read_text().strip()
title = (O/'changelog-title.txt').read_text().strip()
proposed = json.load((O/'ledger-proposed.json').open())
rc = int((O/'test-source.rc').read_text())
test_path = O/'test-source-retry.log' if (O/'test-source-retry.log').exists() else O/'test-source.log'
test = test_path.read_text()
files = sum(int(x) for x in re.findall(r'Test Files\s+(\d+) passed',test))
cases = sum(int(x) for x in re.findall(r'Tests\s+(\d+) passed',test))
assert rc == 0 and files > 0 and cases > 0
b,z = U['before'],U['after']
confidence = z['confidence']
T = ['## '+title,'','### 来源','',
f'- 记录时间{now}。只读复盘notes/lessons.md:5754起H1T1F8ML9FUE静默小节及14:39:06勘误；run-1008-1411-H1T1F8ML9FUE.md已生成100行并补读。runs.jsonl:612确认SILENT/A10/F48败，未跳过；完整1a0adbaa+dirty运行源码未保存，不冒认当前树等同开局树。',
'- exp起始干净，git merge --no-edit main无冲突快进ff64c9a8；已读README、最新STATE/决定末尾、学习协议/代码提案闭环、首次构建方法与最后两节格式、silent最后两节及账本README。独立完成，无下级agent；临时文件仅本批scratch，抽取/复算nice19单进程、固定沙箱测试1worker，不联网/安装依赖/运行play/boss模拟池。',
'- run id重抽844决策、49实际Codex脑请求、9SL记录及run-plans/Jev题；states按UTC 2026-10-08T05:29:08.557Z—06:10:52.521Z seek并核角色，930帧，首/末字节9242785639/9276925680；DeepSeek推理窗0行，不将兼容ds_*字段视为DeepSeek实际回答。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，分阶{dict(collections.Counter(r["ascension"] for r in R))}；{len(A["fights"])}战斗房/{sum(r["death"] for r in A["fights"])}实死。其余130局只进数字/历史验证，排除缺character旧铁甲、其他角色、进行中及切点后局；不是纯Codex爬塔战绩。',
'- 口径沿第99节：首COMBAT入房HP减同房最终尝试退出HP，负净损和开场回复保留，实死单列；Monster走廊与Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT源节点入血关联下一更高层首战，Ancient排除，多源可同战，回血后战去重。独立营火与回血/其他动作分别计。',
'- 旧130局七数组逐行、全部血档/节点后战、休息回复及SL完全一致；敏捷药旧50局77饮复算一致，新51局79饮均+2且旧挡不变。本局12项独立帧检查通过；资源初核把SL标签预设为dead/reload而断言失败，原标签实际F17 won、predicted_death/died，按原字段和退出帧重核通过，失败记录保留，不修改日志或统计口径。',
f'- 新增0、更新17（17加证据、0只改数字）、退役0；active{b["active"]}→{z["active"]}，正文{b["chars"]}→{z["chars"]}字，high{confidence["high"]}/med{confidence["med"]}/low{confidence["low"]}。未过55000，无强制合并/退役；17条更新去旧重复叙述、合计压短631字，逐条前后全文与证据/反例保留，不改60000预算。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,ev in zip(C,U['evidence']):
    e = c['after']
    T.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{ev["by_asc"]}；新证{N} | {e["lesson"]} |')
T.extend([
'| 赢战与实回复 | 21赢战净损233；八休息162、先古52+33共回复247；事件实损18、末战52；56+247−233−18−52=0 | SL恢复不叠入正路径，净损不是敌人毛伤 |',
'| 血药资源接续 | F40胜50→29；火→48；F43胜→34；火→53；F45胜→33；F46无损；末火→52；空药进沙漏败、F49未到 | 实际保血仍可败，无替路线/锻造受控胜线，不定安全血线 |',
'| 药水来源/去处 | 独立15=普通奖励10/事件购2/商店2/事件获1；13饮/1主动弃敏捷/1事件换狡诈，SL无新增瓶或额外饮用 | 弃药与交换不计饮，无留药对照，保留持有价值参数 |',
'| SL同盘局部对照 | 沙虫两试一赢，首试T6弃唯一逃离、T7沙坑1判死；沙漏六试0赢；T2保血线损18→15但伤2→0，T3零毒蜃景替防御同伤12、损0→3，T4另一线同损30、伤60→83 | 沙虫换序与抽牌混杂；沙漏无赢的那次，不能归运气、累加成整场反事实或把六试当六独立局 |',
'| 机制与已兑现 | F45T5蜃景+五毒脆弱下重放：两次3牌挡+两次1余像=8；群蛇合8先扣4盾后4本体；最终19挡对28损9 | 局部机制有效仍不等覆盖全部威胁，零毒沙漏不能沿用8挡 |',
'| 预测与实到 | F29回血投影F33为68、实45，末F32题已更新45；F47休息投影52且兑现；沙漏末T4初报33/60，60实伤兑现、需损实际36，重读least-loss已报余−2 | 随实际行动更新与修模分账，不称全程未判死；修后整战胜负未知 |',
'| 进阶 | 本局A10；机制沿原[0,20]，route/rest/deck观察沿原[8,20]；支持与反例逐阶列出 | 低阶证据不当A10策略独立验证，未见反例多过支持或高阶推翻，不退役 |',
'','旧基线七数组逐行复算：','','| 数组 | 旧130局 | 加新局后 | 核对 |','| --- | --- | --- | --- |'])
for k,v in json.load((O/'baseline-check.json').open()).items():
    T.append(f'| {k} | {v["before"]} | {v["after"]} | 旧行完全一致 |')
T.extend(['','各阶/幕/战斗房型/入血档；死亡单列，掉血中位只计存活房：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |'])
for r in A['bands']:
    if r['n']:
        T.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T.extend(['','节点后下一更高层首战：源节点入血分档，EVENT排除Ancient，多源可同后战：','','| 进阶 | 幕 | 源节点 | 血档 | 源/去重战/局 | 后战死/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |'])
for r in A['transfers']:
    if r['n']:
        T.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]}/{len({c["run"] for c in r["cases"]})} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T.extend(['','实完成休息回复与去重后战：','','| 进阶/局 | 独立火 | 回血/其他动作 | 实回 | 后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |'])
for r in json.load((O/'rest-summary.json').open()):
    T.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
T.extend(['','静默历史多次重打（按局/房去重，日志尝试不当实死）：','','| 进阶 | 重打场 | 记录尝试 | 赢次 |','| --- | --- | --- | --- |'])
for r in json.load((O/'sl-summary.json').open()):
    T.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
T.extend(['','### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek窗0行，49实际脑请求均Codex，无可核“DeepSeek逐字引条目却反向执行”的原话，不补引述。Codex F18原话“持续能量强化毒防，走双商店三营火路线避精英。”，F34原话“亮片重放强化毒防，双商店三营火避精英。”；末火确选休息，不登记成无视双boss或末火升级。',
'- 已有蜃景条目写零毒零敏0挡，实际SL第4试T3仍把防御换蜃景：同伤12、多损3；没有脑/模型逐字引用经验的记录，不称故意违背。已有沙坑经验下首试T6仍弃唯一逃离，沿silent-0117 repeat保留；第2试确胜，但没有保留后完全相同抽牌的受控胜线。',
'- 脑多次想要灵动步法但未取得，末沙漏无持续敏捷，持有毒雾/触媒与晚建能力不当即时输出；F45实8挡的蜃景重放不能套给零毒沙漏。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |'])
mechanisms,short = [],[]
for c,ev in zip(C,U['evidence']):
    e = c['after']
    if '机制：' not in e['lesson']:
        continue
    names = {'general:plan':'力量与敏捷','general:rest':'跨幕回复','general:deck':'能力兑现与资源','boss:AEONGLASS':'永世沙漏','boss:THE_INSATIABLE':'无厌沙虫','hallway:SCROLL_OF_BITING':'咬人卷轴'}
    name = e.get('name',names.get(e['scope'],e['scope']))
    inference = e['lesson'].split('机制：',1)[1].split('搭配：',1)[0]
    example = e['lesson'].split('典型案例：',1)[1]
    T.append(f'| {name} | {inference}局部算术与整战胜因分账 | {e["n_support"]}/{e["n_contradict"]}；分阶{ev["by_asc"]}；适用{e["asc"]} | {example} | {e["id"]} |')
    mechanisms.append(name)
    short.append(f'{name} — {e["lesson"].split("。",1)[0]} — {e["n_support"]}支持/{e["n_contradict"]}反例 — {N}')
T.append('\n- 历史433段静默复盘与全部本角色日志按切点/角色复核，支持/反例局号完整保留。mechanism-actions及historical-mechanism-summary保存实际动作/出现局，动作集合不当整条结论支持集；说不清整战因果的保留观察，不把未来结算或单能力当胜因。')
T.extend(['','### 新增','','- 无，同主题并已有条目。','','### 更新',''])
for c in C:
    a,e = c['before'],c['after']
    T.append(f'- {e["id"]}：支持{a["n_support"]}→{e["n_support"]}、反例不变；正文{len(a["lesson"])}→{len(e["lesson"])}字；账本'+','.join(M[e['id']])+'。')
T.extend(['','### 退役','','- 无，未改打法源码。凋萎缓存纯bug未修；已有局部消费不等整条游戏机制可退役，反例/历史完整保留。',
'','### 和手写知识及代码冲突','',
'- silent其他8份JSON均已核对，元数据/SHA见other-knowledge.json；为生成统计/模型或有界double-boss/boss-trust观察，无手写攻略需改。旧切点不是新数据反例；double-boss四局未校准/不能判必死限制保持，本局F49未到，不重拟模型。改了的手写知识：无。',
'- 当前exp fight-plays.ts:38/48—51与combat-plan.ts:1518—1529只从手牌抬凋萎缓存；本局弃牌区已显示6伤、手空却仍3，与新生凋萎实伤冲突。纯bug沿silent-0297及原PM提案，不塞源码定位给DS；当前源码定位不冒认完整dirty运行树。',
'- 提案专用CLI：'+','.join(props)+'；source_task=experience-update、target_task=strategy-proposal，实际combat/potion/sl/terminal，不涉structure。每项含旧/新行为、证据层回合/反例、账本、按局/房与时间验证、缺数据、预期和回退，未登记implemented/shipped。',
'','### 代码问题（不给 DS）','',
'- 新凋萎缓存缺口0297只留修复与独立提案，不重复建bug或冒认重放累计0199/整场校正0236已覆盖。首试额外门槛预报差额尚未完整归因；缺完整dirty源码、前五SL退出/未结算、重复ID持久身份/召唤退场毛伤、留药/换线/休息/修模受控整场结局、F49资源及完整boss时钟，证据不足保留旧参数。',
'','### 测试','',
f'- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19、固定1worker；tsc退出0、vitest文件{files}/用例{cases}/退出0。'+('重跑一次通过，首轮原件保留。' if (O/'test-source-retry.log').exists() else '首次通过，无重跑。')+'固定排除名单未改，完整沙箱外套件交调度器，不冒报。',
'- JSON/字段/scope中文名/角色局号/支持反例/置信度/日期/预算、旧130局基线、独立实帧及资源核验、240配对切片、check-experience missing=[]/0、gitleaks源0、git diff --check通过。初核SL标签断言失败原件保留、修正后通过。',
'- 账本仅CLI：新增无；proposed '+','.join(proposed)+'；退役无；ledger.py check0。首证/prior/claim/support/repeat及旧上线历史保持，0297纯bug未改成经验proposed；shipped由运维核实际live，不将经验发布当策略实现。',
f'- live合入：{live.get("merged")}；刷新提交{live.get("refresh")}；合前{live.get("pre")}；{live["result"]}。'])
if live.get('merged') is None:
    T.append('- 按任务合并冲突停止，不硬解/覆盖刷新，不造上线decision/eval/Roy通知；源提交及完成事件交运维兜底，不停对局、不运行play。')
for conflict in live.get('conflicts',[]):
    T.append('- '+conflict)
T.extend(['','### 切片大小','',
'- 固定种子20260929，从截至切点states中state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对。manifest记录池/时刻/唯一帧，小池有放回补足标记；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome，仅换经验。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |'])
for r in size['by_sample']:
    T.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
T.append(f'\n- 整体中位{size["before_median"]}→{size["after_median"]}、涨{size["median_growth"]}字；配对差中位{size["paired_median"]}，最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。')
T.append(f'- active{z["active"]}/正文{z["chars"]}；high{confidence["high"]}/med{confidence["med"]}/low{confidence["low"]}；'+'、'.join(f'A{a}适用{z["asc"][str(a)]["entries"]}条/{z["asc"][str(a)]["chars"]}字' for a in [8,9,10])+'。未合并/退役，不改预算；需要Dai定：无，合入受阻交运维兜底。')
T.append('\n原帧/复算/机制/提案/CLI/测试/切片/合入回执：'+str(O.resolve())+'；报告时间'+now+'。')
out = '\n'.join(T)+'\n'
(O/'changelog-addition.md').write_text(out)
(O/'report.md').write_text(out)
completion = dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=0,updated=17,retired=0,active=z['active'],mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=cases),ledger=dict(added=[],proposed=proposed,retired=[],check=0),code_proposals=props,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'completion.json').write_text(json.dumps(completion,ensure_ascii=False,indent=2)+'\n')
(O/'mechanism-short.json').write_text(json.dumps(short,ensure_ascii=False,indent=2)+'\n')
print('报告',len(out),'字；测试',files,cases,'；合入',completion['merged'])
