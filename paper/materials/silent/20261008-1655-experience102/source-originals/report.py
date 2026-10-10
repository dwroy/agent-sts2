import collections
import json
import re
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
N = '9DAS5L8YM1CN'
now = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
A = json.load((O / 'audit.json').open())
U = json.load((O / 'update-summary.json').open())
C = json.load((O / 'changes.json').open())['entries']
R = json.load((O / 'run-metadata.json').open())
M = json.load((O / 'ledger-map.json').open())
H = json.load((O / 'historical-mechanism-summary.json').open())
size = json.load((O / 'slice-summary.json').open())
props = json.load((O / 'code-proposal-ids.json').open())
draft = '--draft' in sys.argv
live = json.load((O / 'live-merge.json').open()) if (O / 'live-merge.json').exists() else dict(merged=None, result='尚未进入锁内合入脚本，等待锁与刷新完成')
if not draft:
    assert (O / 'live-merge.json').exists()
commit = (O / 'source-commit.txt').read_text().strip()
title = (O / 'changelog-title.txt').read_text().strip()
proposed = json.load((O / 'ledger-proposed.json').open())
assert int((O / 'test-source.rc').read_text()) == 0
test = (O / ('test-source-retry.log' if (O / 'test-source-retry.log').exists() else 'test-source.log')).read_text()
files = sum(int(x) for x in re.findall(r'Test Files\s+(\d+) passed', test))
cases = sum(int(x) for x in re.findall(r'Tests\s+(\d+) passed', test))
assert files and cases
b, z = U['before'], U['after']
T = ['## ' + title, '', '### 来源', '',
     f'- 记录时间{now}。只读notes/lessons.md:5769起9DAS5L8YM1CN静默小节及三条经验/机制长记录，暂无其后勘误；runs.jsonl:614确认SILENT/A10/F23败，未跳过。运行7f0c04dd+dirty完整源码未保存，不冒认当前树等同运行树。',
     '- exp起始干净；git merge --no-edit main无冲突完成。先读README、最新STATE/决定末尾、学习协议/代码提案闭环、首次构建及最近两节方法、silent最近两节和账本README。独立完成，不派agent；只在本批scratch存临时文件，抽数/工具nice19单进程，沙箱固定1worker，不联网/安装依赖/启动对局/跑boss模拟池。',
     '- 按run id重抽387决策、22实际Codex脑请求、6SL记录、6run-plan及Jev题；states按UTC 2026-10-08T06:58:55.728Z—07:19:01.986Z字节seek并核state.run.character_id，396帧。起止字节见9DAS5L8YM1CN/states-offsets.json。独立重抽与复盘原帧逐帧一致，35项实帧核验通过。DeepSeek推理时间窗0行，ds_*兼容字段不当实际DeepSeek回答。',
     f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，分阶{dict(collections.Counter(r["ascension"] for r in R))}；{len(A["fights"])}战斗房/{sum(f["death"] for f in A["fights"])}实死。其余132局只进数字/历史验证；排除缺character旧铁甲、其他角色、进行中与切点后局，不称纯Codex爬塔战绩。',
     '- 沿第101节口径：首COMBAT入房HP减同房最终尝试退出HP，开场失血及负净损保留，实际死亡单列；Monster走廊与Unknown问号战分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入血关联下一更高层首战，Ancient排除，多源可同战；回血后战去重。独立营火与动作数分列，同房重打计一战。前三次判死截断不记三次实死。',
     '- 旧132局七数组逐行、全部血档/节点后战、休息回复及SL复算一致，没有基线漂移。沿旧审计cards/ends/potions动作数组只收completed；本局癫狂之触为pending (unstable)，但相邻帧药槽1确消耗，另由numbers-checked按8次真实饮用计入资源链，不能用主数组7项作为实饮总数。此限制不改变旧数组口径，也不改游戏代码。',
     f'- 新增0、更新16（16加证据、0只改数字）、退役0；active{b["active"]}→{z["active"]}，lesson正文{b["chars"]}→{z["chars"]}字，high{z["confidence"]["high"]}/med{z["confidence"]["med"]}/low{z["confidence"]["low"]}。未触55000强制压缩线；案例替换/去重复净减少{b["chars"]-z["chars"]}字，完整支持与反例保存changes.json，不改60000测试预算。',
     '', '### 对照数据检查的主题', '', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for c, ev in zip(C, U['evidence']):
    e = c['after']
    T.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{ev["by_asc"]}；新证{N} | {e["lesson"]} |')
T.extend([
    '| 正路径净HP守恒 | 十赢房损202、末房2→0；初56+事件21+三营火94+跨幕33−202−2=0 | 净损不是敌人毛伤，SL恢复不叠入回复 |',
    '| 药水资源链 | 独立5瓶均奖励，实饮8次（虚弱1/癫狂之触1/稳定1/狡诈1/速度4），0购/0弃；速度SL恢复3次，HP均2→2 | 恢复药不是新瓶，稳定血清建保留2不回血 |',
    '| 到营火前连续血价 | 改无精英后投影F21/22/23入口38/28/18，实38/25/2；前两战损13/23，F23死，F24未到 | 已避精英仍须付走廊血价，无替路线受控胜线，不定安全血线 |',
    '| SL同盘对照 | 猎人四试同2血/速度药/首手，T1均31、T2均14直伤；前三判死读档、末实际死，0赢 | 没有赢的那次或改线收益，不能归运气；四试不是四独立局 |',
    '| 当轮存活与整场分账 | 末T2力量−4/敏1，12挡对虚弱14攻完整需损2，严格存活至少差1血，敌仍81/126 | 这一血差只指当轮存活，不能称整场胜利差 |',
    '| 预测与实际 | 扭动虫首题三轮后0/4完成却估胜约99%，实T8赢损52；F16回血模拟10.81%胜，实70→28/T11赢 | 有限推演不保证剩余血量，低模拟胜率不等实盘必败 |',
    '| 进阶与数据界限 | 新局A10，机制沿[0,20]、路线/休息/构筑观察沿原[8,20]，跨幕公式仅已见A9/A10 | 低阶不当高阶策略独立证据；无新反驳，不退役，不外推未见数值 |',
    '', '旧基线七数组逐行复算：', '', '| 数组 | 旧132局 | 加新局后 | 核对 |', '| --- | --- | --- | --- |'])
for key, value in json.load((O / 'baseline-check.json').open()).items():
    T.append(f'| {key} | {value["before"]} | {value["after"]} | 旧行完全一致 |')
T.extend(['', '各阶/幕/战斗房型/首帧入血档；死亡单列，掉血中位仅存活房：', '', '| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死亡/比例 | 活损中位 |', '| --- | --- | --- | --- | --- | --- | --- |'])
for row in A['bands']:
    if row['n']:
        T.append(f'| A{row["asc"]} | {row["act"]} | {row["type"]} | {row["band"]} | {row["n"]}/{row["runs"]} | {row["deaths"]}/{100*row["deaths"]/row["n"]:.2f}% | {row["median_win"]} |')
T.extend(['', '非战斗节点按源节点入血关联后战（普通EVENT含未实际发生战斗的问号；多源/唯一战分列）：', '', '| 进阶 | 幕 | 源节点 | 入血档 | 源数/唯一后战 | 后战实死/比例 | 活损中位 |', '| --- | --- | --- | --- | --- | --- | --- |'])
for row in A['transfers']:
    if row['n']:
        T.append(f'| A{row["asc"]} | {row["act"]} | {row["screen"]} | {row["band"]} | {row["n"]}/{row["unique_fights"]} | {row["deaths"]}/{100*row["deaths"]/row["n"]:.2f}% | {row["median_win"]} |')
T.extend(['', '营火/实回复分阶（动作数与独立火数可不同，不把读档恢复计回复）：', '', '| 进阶 | 局 | 独立火 | 回血动作 | 实回 | 去重后战/实死 | 活损中位 |', '| --- | --- | --- | --- | --- | --- | --- |'])
for row in json.load((O / 'rest-summary.json').open()):
    T.append(f'| A{row["asc"]} | {row["runs"]} | {row["rests"]} | {row["heal"]} | {sum(row["gains"])} | {row["nexts"]}/{row["deaths"]} | {row["median"]} |')
T.extend(['', '只列有真正多次尝试的战房，attempt1胜不算SL：', '', '| 进阶 | 重打战房 | 尝试 | 赢的尝试 |', '| --- | --- | --- | --- |'])
for row in json.load((O / 'sl-summary.json').open()):
    T.append(f'| A{row["asc"]} | {row["fights"]} | {row["attempts"]} | {row["wins"]} |')
T.extend(['', '本局逐房资源：', '', '| 层/类型 | 敌人 | 入/出HP | 净损 | 实死 |', '| --- | --- | --- | --- | --- |'])
for f in [f for f in A['fights'] if f['run'] == N]:
    T.append(f'| F{f["floor"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}/{f["last_hp"]} | {f["loss"]} | {f["death"]} |')
T.extend(['', '### 经验库自己带偏或写了没被执行的地方', '',
    '- DeepSeek时间窗0行、22实际脑请求均Codex，没有可核的“DeepSeek逐字引条目却反向执行”原话，不补引述。Codex在F19已改避精英并留F24营火，不能称忘记回血或没有避精英。',
    '- F17取磨蚀理由译意“杂技和生存者可弃磨蚀来免费建立增益”，但本局首次实建在F22T5付3能，未见弃磨蚀。F22计划译意“用速度药与最大防护过必经战，弃磨蚀、用手上技法弃昂贵技能变免费”，F23无相应弃牌动作；这只说明计划收益未兑现，不否认历史实见弃磨蚀机制。',
    '- F23已正确计柔嫩并判死；三次SL均同线、相同药收益，没有新的可存活反例。F22喝狡诈实赢仍2血，F24枕头回血是未实现条件，不把到火后的回复加入F23生存资源。',
    '', '### 机制推理', '', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |'])
mechanisms = []
for c, ev in zip(C, U['evidence']):
    e = c['after']
    if '机制：' not in e['lesson']:
        continue
    conclusion = e['lesson'].split('机制：')[0].rstrip('。')
    reasoning = e['lesson'].split('机制：', 1)[1].split('搭配：')[0].rstrip('。')
    case = e['lesson'].split('典型案例：', 1)[1]
    T.append(f'| {conclusion} | {reasoning}；局部算术与整战胜因分账 | {e["n_support"]}/{e["n_contradict"]}，分阶{ev["by_asc"]}，适用{e["asc"]} | {case} | {e["id"]} |')
    mechanisms.append(conclusion)
T.extend(['', '- 历史432段静默主题复盘与133局日志用于交叉核验；historical-mechanism-summary保存全部支持/反例、分阶、动作与遭遇集合，出现/持有不是整条支持。速度药支持集39局的逐饮敏捷+5独立核验；狡诈10局43饮容量逐次核验（38次添3，2次八手添2，3次满手添0）。未知整战因果写观察，不补丝虫末击毒/反伤内部全序。',
    '', '### 新增', '', '- 无，同主题并已有条目。', '', '### 更新', ''])
for c in C:
    T.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字；账本' + ','.join(M[c['id']]) + '。')
T.extend(['', '### 退役', '', '- 无；没有反例超过支持、高阶推翻或本任务源码修复。游戏知识与局部已建模事实分别核，保留原反例和退休历史。',
    '', '### 和手写知识及代码冲突', '',
    '- silent其余8份JSON逐项核字段/元数据和内容，SHA见other-knowledge.json：生成统计/模型、有限double-boss及boss-trust，未发现需改的手写攻略；旧统计切点不当本局反例。double-boss明确只有4局、实际胜0、模拟未校准且不能判必死/触发SL；本局未到双boss、无受控通关样本，不重拟合。改了的手写知识：无。',
    '- 狡诈确定生成未进入方案比较、普通紧勒后续逐牌2仍漏算，沿原0256/0260纯模型缺口repeat保留；本任务不改打法源码，事实分别并0258/0261经验。当前代码无这两项完整接线，不把其他角色或疯狂科学定制模板搬来。运行dirty树不完整，提案要求实现前核最新live。',
    '- 专用代码提案CLI：' + ','.join(props) + '；source_task=experience-update、target_task=strategy-proposal，实际combat/potion/sl/terminal，不涉structure。16变更均有experience链接及账本/证据/层回合，包含旧/新行为、反例、按局时间分组、缺数据、验证、预期边界和回退，未登记implemented/shipped。',
    '', '### 代码问题（不给 DS）', '',
    '- 无新增纯bug；狡诈模型、紧勒触发是旧缺口重复实证。完整dirty源码、前三次SL实际致死结算、丝虫毒/反伤末击、提前狡诈/改弃牌/替路线完整胜局、时钟校准均缺失。提案交独立strategy-proposal；不把未知反事实写成修后必胜。',
    '- 临时核验初稿误用了state.potions及is_upgraded路径，KeyError原日志保留；改按实盘state.run.potions与upgraded后35项通过。仅临时抽数核验脚本修正，不登记为游戏控制器bug，不修改任务/测试预算。',
    '', '### 测试', '',
    f'- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批目录、PATH本机node、nice19、固定1worker；tsc退出0，vitest文件{files}/用例{cases}/退出0。' + ('首次后重跑一次通过，失败原日志保留。' if (O / 'test-source-retry.log').exists() else '首次通过，无重跑。') + '固定排除名单未改，沙箱外完整套件由调度器补跑，不冒报。',
    '- JSON/唯一id/scope中文名/角色/证据局号/置信度/日期/预算及240配对切片校验通过；旧132局七数组/血档/节点/休息/SL复算一致；35项独立实帧通过；check-experience退出0、missing=[]；gitleaks源退出0、git diff --check通过。',
    '- 账本只经CLI：新增无；proposed ' + ','.join(proposed) + '；退役无；ledger.py check退出0。首证/prior/claim及原support/repeat和旧版本历史保持，实际shipped交运维核live，经验数据发布不当策略代码实现。',
    f'- live合入：{live["merged"]}；刷新提交{live.get("refresh")}，合前{live.get("pre")}；{live["result"]}。'])
if live['merged'] is None:
    T.append('- 按任务合入冲突/知识重叠/占用即停，保留刷新和源提交，不硬解覆盖；未实际上线，不造decision/eval/Roy通知，交完成事件由运维兜底，不停对局。')
    T.extend('- ' + line for line in live.get('conflicts', live.get('overlap_conflicts', [])))
else:
    T.append('- 合后原沙箱入口退出0；源码未改不用重建；decision/eval版本及授权双通知见publication.json；账本shipped由运维确认。')
T.extend(['', '### 切片大小', '',
    '- 固定种子20260929，从截至切点、state.run.character_id=SILENT的最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对。manifest记池、唯一帧与时间，小池有放回补足标记；CHARACTER=silent调用官方knowledge-slice.ts，冻结相同common/silent/outcome，仅换经验。',
    '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |', '| --- | --- | --- | --- |'])
for row in size['by_sample']:
    T.append(f'| {row["sample"]} | {row["before_median"]}/{row["before_max"]} | {row["after_median"]}/{row["after_max"]} | {row["paired_median"]} |')
T.extend(['', f'- 整体中位{size["before_median"]}→{size["after_median"]}，涨{size["median_growth"]}字；配对差中位{size["paired_median"]}，最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。',
    f'- active{z["active"]}/正文{z["chars"]}；high{z["confidence"]["high"]}/med{z["confidence"]["med"]}/low{z["confidence"]["low"]}；' + '、'.join(f'A{asc}适用{v["entries"]}条/{v["chars"]}字' for asc, v in z['asc'].items()) + '。未合并/退役、不改预算；需要Roy定：无，合入受阻交运维兜底。',
    '', f'原帧/复算/机制/提案/CLI/测试/切片/合入回执：{O.resolve()}；报告时间{now}。', ''])
section = '\n'.join(T)
(O / ('changelog-draft.md' if draft else 'changelog-section.md')).write_text(section)
f = ROOT / 'paper/materials/experience-changelog-silent.md'
if not draft:
    assert '\n## ' + title not in f.read_text()
    with f.open('a') as h:
        h.write('\n' + section)
basename = 'report-draft' if draft else 'report'
report = dict(task='experience-update', version=U['version'], commit=commit, merged=live['merged'], added=0, updated=len(C), retired=0, active=z['active'], mechanisms=mechanisms, tests=dict(tsc=0, vitest=0, cases=cases), ledger=dict(added=[], proposed=proposed, retired=[], check=0), code_proposals=props, implementation_domains=['combat', 'potion', 'sl', 'terminal'], report=str((O / (basename + '.md')).resolve()))
(O / (basename + '.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(O / (basename + '.md')).write_text(section + '\n```json\n' + json.dumps(report, ensure_ascii=False) + '\n```\n')
print('草稿已保存、未追加根记录；' if draft else '已追加第102节，报告已保存；', files, '文件', cases, '用例；', live['result'])
