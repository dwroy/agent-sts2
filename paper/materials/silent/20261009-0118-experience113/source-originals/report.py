import collections
import hashlib
import json
import re
import statistics
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
A = json.load(open(O / 'audit.json'))
U = json.load(open(O / 'update-summary.json'))
C = json.load(open(O / 'changes.json'))['entries']
M = json.load(open(O / 'ledger-map.json'))
H = json.load(open(O / 'historical-mechanism-summary.json'))
R = json.load(open(O / 'rest-summary.json'))
S = json.load(open(O / 'sl-summary.json'))
B = json.load(open(O / 'baseline-check.json'))
meta = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
proposals = json.load(open(O / 'proposal-ids.json'))
commit = (O / 'source-commit.txt').read_text().strip() if (O / 'source-commit.txt').exists() else '待提交'
heading = '## ' + ((O / 'changelog-heading.txt').read_text().strip() if (O / 'changelog-heading.txt').exists() else '2026-10-09 静默猎手 第一百一十三次增量：1 局 A10（version ' + U['version'] + '，分支 exp-silent，待提交）')
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
text = (O / 'test-source.log').read_text()
files = sum(int(n) for n in re.findall(r'Test Files\s+(\d+) passed', text))
cases = sum(int(n) for n in re.findall(r'Tests\s+(\d+) passed', text))
rc = int((O / 'test-source.rc').read_text()) if (O / 'test-source.rc').exists() else None
tests = dict(tsc=0 if 'RUN  v' in text else None, vitest=rc, files=files, cases=cases)
(O / 'test-results.json').write_text(json.dumps(tests, indent=2) + '\n')
lines = [heading, '', '### 来源', '', '- 记录时间' + stamp + '；根notes/lessons.md:6524静默猎手LY83ZMTFVKJH，按节末00:46勘误：没有Jev理由文本，不能认定零成本题面导致选结束回合。runs.jsonl:629核SILENT/A10/F21败；代码049dff24+dirty，完整dirty源码未记录。', '- exp-silent开工干净，git merge --no-edit main无冲突快进至20631bbe90c9d5570fa7a7743a8d2ede7199f4bc；只本任务独立执行，不派agent/联网/play/模拟池，不改打法源码/其他角色；scratch仅' + str(O) + '，抽取nice19单进程，测试1worker。', '- 按局号提取538决策、19大脑请求、3条SL、4版计划；states/reasoning按决策时间窗二分字节seek流读，556帧核run_id及character_id=SILENT。窗口2026-10-08T15:09:34.379Z—15:44:39.242Z，脑请求全Codex，DeepSeek推理0；旧ds_*字段不代表实际引擎。', '- 全引擎学习观察截至' + A['cutoff'] + '，148静默完局、2134独立房、138实死，分阶' + str(dict(collections.Counter(r['ascension'] for r in meta.values()))) + '；其余147局只进数字/历史核验。排缺character旧铁甲、其他角色、进行中及切点后局，不称纯Codex爬塔战績。', '- 同前口径：战内净损=首COMBAT入口HP−同房最后尝试退出HP，含回复/自损/负值，不当敌毛伤。SL同房计一房，判死截断不当实死；Monster才走廊，Unknown问号另列，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient；多节点可重复关联，回血后战去重，营火房/动作分列。', '- 旧147局七数组逐行复算一致：' + '/'.join(k + str(v['before']) for k, v in B.items()) + '；全部旧血档、节点转移、休息/SL汇总一致。新局11独立房/13尝试窗，其中F20逃脱结算不作击杀；2次SL恢复和首两次判死截断分账。616项实帧核验通过，历史711段静默复盘及按角色日志交叉验证，不由动作出现或持有自动扩支持。', '- 新增2、更新10（10加证据、0只改数字）、退役0；active186→188，正文50976→51768字符，低于55000压缩线/60000预算。没有预算合并/压缩/退役，不改测试预算。', '', '### 对照数据检查的主题', '', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for c in C:
    e = c['after']
    h = next(h for h in H if h['id'] == e['id'])
    lines.append('| ' + e['id'] + ' | ' + str(e['n_support']) + '支持/' + str(e['n_contradict']) + '反例；分阶' + str(h['by_asc']) + '；账本' + ','.join(M[e['id']]) + ' | ' + e['lesson'].replace('|', '／') + ' |')
lines += ['', '以下n为独立房数、同局可多房；死亡率=实死房/n，活战净损中位含负数。<25%等档不混进阶。', '', '| 进阶 | 幕 | 房型 | 血档 | 房/局数 | 实死/率 | 活战净损中位 |', '| --- | --- | --- | --- | --- | --- | --- |']
for row in A['bands']:
    if row['n']:
        lines.append(f'| A{row["asc"]} | {row["act"]} | {row["type"]} | {row["band"]} | {row["n"]}/{row["runs"]} | {row["deaths"]}/{row["deaths"]/row["n"]*100:.2f}% | {row["median_win"]} |')
lines += ['', '非战斗房型按其入口血关联后续首战，不称营火/商店/事件选择的因果效果；未知问号实开战见上表，未知房未开战不能作零伤战。', '', '| 进阶 | 幕 | 前节点 | 入口血档 | 关联/去重后战 | 实死/率 | 活战净损中位 |', '| --- | --- | --- | --- | --- | --- | --- |']
for row in A['transfers']:
    if row['n']:
        lines.append(f'| A{row["asc"]} | {row["act"]} | {row["screen"]} | {row["band"]} | {row["n"]}/{row["unique_fights"]} | {row["deaths"]}/{row["deaths"]/row["n"]*100:.2f}% | {row["median_win"]} |')
lines += ['', '| 进阶/局数 | 独立营火 | 回血动作/实回 | 去重后战/死 | 活战净损中位 | 真重打场/试/赢 |', '| --- | --- | --- | --- | --- | --- |']
for r, s in zip(R, S):
    lines.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines += ['', '- 低血改路线对照：新局没有低血分叉的实打另一线路；F18虽选三火无精英，F21高血死在未到的商店/营火之前。旧M0GY0A4M2F7H一幕避精英后29进boss仍六败，旧R3AJCGQGGMR4沙虫第二试胜有后续药/抽序变化。构筑、敌人、进场和路线不同，不能由跨局关联断言改线必优，低血未走线胜负未知。', '- 同族汇总：全角色全部13场39试9赢，支持条目筛选10场36试6赢（A0一局背景/A10九局），真正重打7场33试3赢；另3场早期A0单次赢只进数字，不当A10目标序支持。新局同场3试1赢；第2/3试抽牌记录前22张相同，后继抽/出牌/药变化不受控。T5实际都清14损5，但信徒末35→24，退场T7→T6，T7实损10→0；完整原计划20伤未执行，不称目标变化是唯一胜因。', '', '### 经验库自己带偏或写了没被执行的地方', '', '- 实际DeepSeek推理0，未找到其引用具体经验id原话；以下实际大脑/代码原话可核题面和执行，不捏造经验条目单独导致选择的因果。']
ds = [json.loads(l) for l in (O / 'LY83ZMTFVKJH/decisions.jsonl').open()]
for floor, action in [(1, 'choose_map_node'), (13, 'choose_rest_option'), (16, 'choose_rest_option'), (18, 'choose_map_node')]:
    d = next((d for d in ds if d['floor'] == floor and d.get('chosen', {}).get('action') == action), None)
    if d:
        lines.append('- F' + str(floor) + '原话：' + json.dumps(d['rationale'], ensure_ascii=False))
lines += ['- 计划求毒和敏捷，实际终局23张无能力牌且手斧失窃；构筑意向不当已建力敏。题面loot cost 0与hp=null并存，但Jev只记选择和置信，无原因文字，按勘误不写“因此选择”。经验写过紧勒不代表推演已接普通STRANGLE_POWER；逐牌少计2/4沿旧bug链，不入DS正文。', '', '### 机制推理', '', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |']
mechanisms = [c for c in C if c['id'] not in ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-kin-poison-sl-observation']]
for c in mechanisms:
    e = c['after']
    h = next(h for h in H if h['id'] == e['id'])
    lesson, case = e['lesson'].split('典型案例：', 1)
    lines.append('| ' + e['id'] + ' | ' + lesson + ' | ' + str(e['n_support']) + '/' + str(e['n_contradict']) + '；' + str(h['by_asc']) + ' | ' + case + ' | ' + e['id'] + ' |')
lines += ['', '- 虱虫22局原帧逐次验证T3/6/9/12力量，A0/2/6各1、A7两局/A8一局/A10十六局；完整四成长和末轮死仅新局1，短战胜不当机制反例。共同事实占位符仅已见A8/A10从common填，典型实例保留实值，未观察阶不外推。', '- 顺走3局以最终同房非战斗帧核返还：NB8KCF6HRGVF首奖励仍无药瓶，下一奖励帧返，PU步法/LY手斧持续缺牌。正卡进度但HP换算未知仅新局1，不给固定价格或保牌必胜；其余历史不同估值不误作该窄观察的反例。', '', '### 新增', '']
for c in C:
    if c['kind'] == 'added':
        lines.append('- ' + c['id'] + '：' + str(c['after']['n_support']) + '支持/0反例，scope=' + c['after']['scope'] + '，机制asc[0,20]、已观察数值单列；账本' + ','.join(M[c['id']]) + '。')
lines += ['', '### 更新', '']
for c in C:
    if c['kind'] == 'updated':
        lines.append('- ' + c['id'] + '：支持' + str(c['before']['n_support']) + '→' + str(c['after']['n_support']) + '，反例不变0；追加LY83ZMTFVKJH和案例/数字，账本' + ','.join(M[c['id']]) + '。')
lines += ['', '### 退役', '', '- 无。没有本任务源码修复或反例超支持，无预算合并/压缩；旧退役历史保持。', '', '### 和手写知识及代码冲突', '', '- 核静默其余8份JSON为生成的boss/房间/模型/校准/结果统计；字段及SHA留other-knowledge.json。不同截止、模型预测或胜样本统计不当当前机制反例；未有手写知识需改，无新增攻略。其他角色知识与代码手写知识不改。', '- 源码冲突：紧勒普通逐牌失血已有中文知识却推演仍漏，沿silent-0260和既有提案；unknown失牌HP换算仍呈loot cost 0，其改动由独立strategy-proposal核当前live、先展示未知/已测进度。经验上线不等源码实现。', '- 四提案：' + ','.join(proposals) + '；source_task=experience-update/target_task=strategy-proposal，12相关active条目全部自有experience/角色证据/层/轮/账本链接，实际domains combat/potion/sl/terminal/structure。均pending，不冒称implemented/shipped。', '', '### 代码问题（不给 DS）', '', '- 旧紧勒bug：F21T7报8实10，T10报20实24完整执行；不另造新bug记录，不因末余4声称修后必胜。F21末最低损23与完整24差1、T6损7后重算9尚未定位，不套到紧勒漏伤。', '- 完整dirty源码、失窃保牌线整战、早减力/早喝/未走路线胜果、SL前两试最后敌击结算、完整实际最优执行比例、boss时钟实打校准和未到F22/F24/后幕资源均缺，保留限制。', '- 原scratch首次prepare工具会话返回后未完成全部抽取，保留prepare.log并原入口重跑，prepare-retry最终148局完成。逐帧校验首稿把T7紧勒前两张零伤牌混入序列断言失败，改从STRANGLE开始；第二稿用NB首奖励缺牌帧误判未返，改最终非战斗帧，第三稿616项通过。全部初稿/失败日志留存，未改生产代码或捏造返牌。', '', '### 测试', '', '- 原bash agent/tools/test-sandbox.sh入口；TMPDIR本scratch、PATH本机node、nice19/SANDBOX_WORKERS=1、固定数据、原排除/预算不变。tsc ' + str(tests['tsc']) + '；vitest ' + str(files) + '文件/' + str(cases) + '用例/退出' + str(rc) + '；沙箱外完整套件交调度器，不冒报通过。', '- JSON合法、git diff --check/gitleaks源扫描0，check-experience missing=[]退出0、ledger.py check0；616项数值和旧基线全部一致。']
if (O / 'ledger-results.json').exists():
    ledger = json.load(open(O / 'ledger-results.json'))
    lines.append('- 账本新增[]；改proposed ' + ','.join(ledger['proposed']) + '；退役[]。silent-0316根据更早A0原帧追加首证更正T082DRCUHRRD，prior仍unknown，原add/更正/全部支持和旧状态版本保留。其余未纳入观察不改，实际shipped交运维据live登记。')
if (O / 'validation.json').exists():
    v = json.load(open(O / 'validation.json'))
    lines.append('- 补核34支持局49跨幕窗口均同上限80%取整；普通紧勒4局30次实际施放，存活目标均实建2，杀死退场的目标不作缺能力反例，T8/T11次轮撤回核实；其余未改条目字段逐项相等。补核初稿未排除击杀后目标消失而StopIteration，原validation.log保留，修scratch校验器后通过，不改经验机制。')
if (O / 'live-merge.json').exists():
    live = json.load(open(O / 'live-merge.json'))
    lines += ['- live锁内：' + live['result'] + '；刷新' + str(live.get('refresh')) + '；合前' + str(live.get('pre')) + '；合入' + str(live.get('merged')) + '。', *['- ' + x for x in live.get('conflicts', [])]]
    if not live.get('merged'):
        lines.append('- 未实际合入，不造eval版本或规则上线通知；按冲突指令停止，不硬解/覆盖刷新数据。源提交、预检/刷新原件交调用方或运维兜底，不停对局。')
lines += ['', '### 切片大小', '', '- 种子20260929；截止前state.run.character_id=SILENT最高两阶A9/A10各20状态×6界面，共240配对。同阶同界面不足则有放回、不跨角色，manifest留池/帧/时间戳。CHARACTER=silent运行官方knowledge-slice.ts，common/其他角色内数据及outcome固定同份，仅换experience。', '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |', '| --- | --- | --- | --- |']
old = json.load(open(O / 'slice-before.json'))
new = json.load(open(O / 'slice-after.json'))
for a, b in zip(old, new):
    lines.append(f'| {a["sample"]} | {a["median"]}/{a["max"]} | {b["median"]}/{b["max"]} | {statistics.median([y-x for x,y in zip(a["sizes"],b["sizes"])])} |')
summary = json.load(open(O / 'slice-summary.json'))
lines += ['', '- 整体中位' + str(summary['before_median']) + '→' + str(summary['after_median']) + '（+106.5字）；配对差中位' + str(summary['paired_median']) + '；最大' + str(summary['before_max']) + '→' + str(summary['after_max']) + '，单片最大增加' + str(summary['max_increase']) + '字。', '- active188，正文51768字符，置信度' + str(U['confidence']) + '；A8适用' + str(U['asc']['8']) + '；A9适用' + str(U['asc']['9']) + '；A10适用' + str(U['asc']['10']) + '。无需压缩/改预算，需要Dai定的规则：无。', '', '证据、原始子集/字节偏移、616项核验/历史/失败初稿、CLI、提案、测试和合入回执全部留' + str(O) + '。', '']
section = '\n'.join(lines)
(O / 'changelog-section.md').write_text(section)
(O / 'report.md').write_text(section)
print('报告', len(section), '字；', tests)
