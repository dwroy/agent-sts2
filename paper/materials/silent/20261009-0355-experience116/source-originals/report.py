import collections
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
A = json.load(open(O / 'audit.json'))
C = json.load(open(O / 'changes.json'))['entries']
U = json.load(open(O / 'update-summary.json'))
M = json.load(open(O / 'ledger-map.json'))
H = {x['id']: x for x in json.load(open(O / 'historical-mechanism-summary.json'))}
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
SS = json.load(open(O / 'slice-summary.json'))
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
commit = (O / 'source-commit.txt').read_text().strip() if (O / 'source-commit.txt').exists() else '待自测提交'
heading = f'2026-10-09 静默猎手 第一百一十六次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{commit[:8]}）'
(O / 'changelog-heading.txt').write_text(heading + '\n')
live = json.load(open(O / 'live-merge.json')) if (O / 'live-merge.json').exists() else dict(merged=None, result='待自测提交后锁内合入')
tests = json.load(open(O / 'test-results.json')) if (O / 'test-results.json').exists() else {}
mechanisms = ['silent-strength-weak-observation', 'silent-footwork-block', 'silent-noxious-fumes-growth', 'silent-apotheosis-combat-upgrades', 'silent-shadowmeld-new-block-double', 'silent-snecko-skull-poison-application', 'silent-test-subject-phase-reset', 'silent-royal-poison-blood-vial-opening-net', 'silent-stone-humidifier-rest-growth', 'silent-act-transition-missing-hp-heal', 'silent-double-boss-resource-handoff', 'silent-dexterity-potion-card-block', 'silent-deck-burst-observation']
lines = ['## ' + heading, '', '### 来源', '',
    f'- 记录时间{stamp}。只读根notes/lessons.md:6743静默猎手PBUBM0LRTEDD整节及末尾机制/限制，未见本局后续勘误；runs.jsonl:632核SILENT/A10/F49败、code8149e4ca+dirty，完整dirty源码未知。',
    '- 开工exp-silent干净，git merge --no-edit main无冲突得到e1bc04c5；版本2026-10-09.4→.5。README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建与两份变更记录最近更新方法及账本README均已读。自行执行，不派agent、不联网/play/模拟池、不改打法源码或其他角色。',
    '- 按局号抽934决策、48脑（47决策脑＋1独立run-plan）、13SL原行、8计划；states/reasoning按决策时间窗二分字节seek流读，963帧全部核run_id与state.run.character_id=SILENT。窗口2026-10-08T17:47:13.009Z—18:37:20.557Z，首observed_ts17:46:40.423Z；全部脑Codex，DeepSeek推理0，ds_*兼容字段不当实际DeepSeek调用。原始子集、偏移与脚本留本scratch。',
    f'- 全引擎学习观察截至{A["cutoff"]}，{len(R)}静默完局、{len(A["fights"])}独立房、{sum(x["death"] for x in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。其余150局只进数字/历史机制验证；排缺character旧铁甲、其他角色、进行中及切点后局，不称纯Codex爬塔成绩。',
    '- 口径同上一节：同房首COMBAT入房HP−末次退出HP，含开场遗物/回复/自损，不是敌毛伤；SL同房只计一场，判死截断不算实死或零掉血。仅Monster走廊，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT以入口血关联下一更高层首战、排Ancient，多节点可重复关联；休息后战去重，营火房/动作分列。',
    '- 旧150局逐行复算七数组完全相等：fights2175/nexts2076/rests938/cards49271/ends14030/attempts900/growth4287；全部旧血档、节点转移、回血/SL摘要一致。新增20独立房，28战斗尝试窗；13SL结果行含17/31普通首试胜，真正多试是33/48/49。32项关键原帧核验通过，772段静默历史复盘与全历史实际动作/遭遇集合核验。',
    '- 入房口径与末试口径分列：F48首帧114、开场/重试110、最终26，因此同房净损88，复盘末试110→26是84；F49首入26、开场/重试22、最终0，因此同房净损26、末试22。没有旧数字漂移；不把末次尝试的首帧替代全房首帧。',
    f'- 新增0、更新17（17加证据、0只改数字）、退役0；active190→190，正文{U["chars_before"]}→{U["chars"]}字符。无预算合并/退役或单为预算压缩；同scope替换案例、旧全文留experience-before.json/changes.json，证据/反例保留，低于55000压缩线及60000预算。',
    '', '### 对照数据检查的主题', '', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for c in C:
    e = c['after']
    lines.append('| ' + e['id'] + ' | ' + str(e['n_support']) + '支持/' + str(e['n_contradict']) + '反例；分阶' + str(H[e['id']]['by_asc']) + '；账本' + ','.join(M[e['id']]) + ' | ' + e['lesson'] + ' |')
lines += ['| 药水真实新获与恢复 | 新获14、饮19、弃0；F33原能力药重复饮1次、F48同两瓶三试重复饮4次，其余原14瓶各饮一次。F49空药六试 | 没有留药整场胜线，不改药水持有价/喝药时点；复盘逐槽帧号与本scratch原始动作/状态可复算 |',
    '', '血量与路线观察：以下n是独立房，局数另列；死亡只认实GAME_OVER，存活净损中位含自损/回复、排死亡。所有进阶只用静默数据，不以跨局路线差异定因果。', '',
    '| 进阶/幕/房型/入口血档 | 房数/局数 | 实死/死亡率 | 存活净损中位 |', '| --- | --- | --- | --- |']
for b in A['bands']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines += ['', '非战斗节点入口血关联下一更高层首战，多个节点可关联同战；分母是节点，另列去重后战。回复、商店、事件效果和路线可选性均混杂，不由比例拟血线。', '',
    '| 进阶/幕/节点/入口血档 | 节点数/去重后战 | 后战实死/节点死亡率 | 存活后战净损中位 |', '| --- | --- | --- | --- |']
for b in A['transfers']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines += ['', '| 进阶 | 完局 | 独立营火/回血动作 | 实回总HP | 去重后战/实死/死亡率 | 存活后战净损中位 |', '| --- | --- | --- | --- | --- | --- |']
for b in json.load(open(O / 'rest-summary.json')):
    ratio = f'{b["deaths"]/b["nexts"]:.2%}' if b['nexts'] else '未知'
    lines.append(f'| A{b["asc"]} | {b["runs"]} | {b["rests"]}/{b["heal"]} | {sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}/{ratio} | {b["median"]} |')
lines += ['', '真正SL多试按同房max(attempt)>1识别；尝试结果行不是独立局，赢次只认won，predicted_death截断不算实死。', '', '| 进阶 | 多试房 | 尝试结果行 | 赢次 |', '| --- | --- | --- | --- |']
for b in json.load(open(O / 'sl-summary.json')):
    lines.append(f'| A{b["asc"]} | {b["fights"]} | {b["attempts"]} | {b["wins"]} |')
lines += ['', '- 本局F33两试一赢、F48三试一赢、F49六试零赢。沙虫胜试T1同净清29但T2净清31→39、损10→0，后续也变；女王赢次预知T2→T5/中和+→生存者并弃步法，后续目标/牌序也变，不归单一喝药时点或运气。F49第三/第四T1同22开局，完整实线22挡清9损1对0挡清0损18，实际多损17少清9；两线都败、不宣称旧候选必胜。原手/抽牌/探索/重问见逐局analysis、SL和decision子集。',
    '- 路线低血对照沿旧同角色观察保留：本局F27掉至14后F28回血、F30/31战后F32再回，未选节点无实打；三幕F38满回后F40锻造、F42满旧上限回血增5、F47满回114。与P2M3DFJ4DEZ3低血避险/华夫饼或HEMND3SMQYB8零精英三火相比，卡组/遗物/战斗不同，仅观察，不写改线必优。',
    '', '### 经验库自己带偏或写了没被执行的地方', '',
    '- DeepSeek推理0，无引用经验id的真实推理原话；全部实际脑Codex。不能从败局反推经验单条误导或大脑忘了第二boss。',
    '- d302614原话：“双精英五营火，兼顾奖励、关键升级与加湿器成长。”d303186：“神化强化全牌组，三火路线保血备战连王。”p2804/2805已明剩血剩药、无恢复和能力重置；F48实际胜26空药，F49仍败，是交接支持而非忘连战。计划触媒/首份购物计划扭曲漏斗未实际取得，不计已建立。',
    '- d303505原话：“playing 灵动步法+ instead of 融入暗影+, 灵动步法+, 后空翻+, 尖啸+”；d303506：“playing end turn instead of 融入暗影+, 后空翻+, 尖啸+”。实际仅神化/步法0挡损18，而第三试实22挡损1。候选均24/24死不表示即时血价消失，原四牌候选未完整受控实打，不据此定旧线必胜。',
    '', '### 机制推理', '', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |']
for ident in mechanisms:
    e = next(c['after'] for c in C if c['id'] == ident)
    parts = e['lesson'].split('典型案例：')
    lines.append('| ' + ident + ' | ' + parts[0] + ' | ' + str(e['n_support']) + '/' + str(e['n_contradict']) + '；支持分阶' + str(H[ident]['by_asc']) + '；适用' + str(e['asc']) + ' | ' + parts[-1] + ' | ' + ident + ' |')
lines += ['', '- 全历史9次神化，普通VLZ6CCT8AQ0A四次实费2、新PBUBM0LRTEDD五次实费1；支持局各1、升级组合只新1局，不把9动作当9支持局。步法/雾/暗影与敏捷药的全历史动作/净增分布留historical-trigger-checks.json；敏捷药逐次+2且原挡不变，步法旧净+1例的TENDER来源保留上一节已核边界，不作基础反例。',
    '- 神化升级与暗影/敏捷22挡直接局部收益可核，胜负因果未控；技能激怒3按技能逐张给敌3力、能力不加，弱/易伤与挡单列。T3需损27只扣剩3不能把实际扣3当完整血价，雾6层未来收益未执行。加湿器满旧上限增5是本局新增边界，旧四支持局不冒称满血也已验证。',
    '', '### 新增', '', '- 无；升级神化并入已有card:APOTHEOSIS，满血加湿器边界并入已有relic:STONE_HUMIDIFIER，同事不另建重复条目。', '', '### 更新', '']
for c in C:
    lines.append('- ' + c['id'] + f'：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，追加PBUBM0LRTEDD与案例/数字；账本' + ','.join(M[c['id']]) + '。')
lines += ['', '### 退役', '', '- 无；未修源码、没有反例超支持或高阶推翻。女王新增胜次是旧失败统计增量，既有结论仍为“不定固定顺序/单因”，更新集合为9场51试1赢、42判死，非机制反例；旧8场48試零赢可复算，原案例/证据不丢。',
    '', '### 和手写知识及代码冲突', '',
    '- 其余8份silent JSON核字段/来源/生成与SHA，other-knowledge.json；没有独立手写攻略。double-boss支持连续49层端点，其余结果/房损/模型/门槛按各自切点、首试/重试和校准口径保留，预测不当实盘事实或新增机制反例；无需修改手写知识。',
    '- 升级神化同线14挡预测与22实挡不一致，当前源码普通分支修复不涵盖已升级1费；只登记独立strategy-proposal，不改源码。四新提案' + ','.join(json.load(open(O / 'proposal-ids.json'))) + '，source_task=experience-update/target_task=strategy-proposal，17变更active各有experience/账本/本角色层轮证据，domains combat/potion/sl/terminal/structure，全部pending，不冒称implemented/shipped。',
    '', '### 代码问题（不给 DS）', '',
    '- silent-0322升级神化仍被!upgraded/cost2门槛排除，F49末T1同线少报8挡；损11预测对损1实盘还含敌攻击预算差，不全归神化。普通silent-0237/S1.apotheosis1已修分账，纯bug不塞知识正文。旧0079重复的SL饱和选线沿原队列，代码提案要求先核模型与真实完整前缀，不改变必死定义。',
    '- 完整dirty源码、未选路线/留药/另一牌序整场胜线、SL截断后结算、部分退场0HP中间帧、silent时钟和F49条件化投影、实际最优执行比例、实付费用缺数据，保留原行为。',
    '- 本scratch初稿把带毒刺击动态字段读作Poison而非PoisonPower，StopIteration原日志/初稿保留；毒雾核验初稿误要求全局都升级3，实盘普通2/升级3并存，改按现场PoisonPerTurn核且末试两升级单独3→6，不改经验机制来绕验证。女王SL初稿错误从另一条经验证据集合过滤得39试，改为独立取完整9支持局，复得51试/42判死/1赢；错误初稿保留。',
    '', '### 测试', '',
    '- 原bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1、nice19，固定数据/排除/预算保持；' + (f'tsc {tests["tsc"]}，vitest {tests["files"]}文件/{tests["cases"]}用例/退出{tests["vitest"]}；重跑={tests.get("retried", False)}。' if tests else '运行中，待最终记录。') + '沙箱外完整套件交调度器，不冒报通过。',
    '- JSON合法、17条变更与其余逐项等价，角色/evidence/n/中文name/scope/asc保留、32关键原帧及旧150局复算通过；check-experience missing=[]退出0，ledger.py check0，git diff --check与gitleaks-source0。',
    '- 账本新增[]；提交后改proposed ' + ','.join(dict.fromkeys(l for ls in M.values() for l in ls)) + '；退役[]。旧claim/首证/prior/版本/support/repeat保留，未并入的observed和0322纯bug状态保持，只有运维据实际live完成事件登记shipped。',
    f'- live锁内结果：{live["result"]}；刷新{live.get("refresh")}；合前{live.get("pre")}；合入{live.get("merged")}。']
for value in live.get('conflicts', []) + live.get('overlap_conflicts', []):
    lines.append('- ' + value)
if not live.get('merged'):
    lines.append('- 未实际合入时不造eval上线版本或规则双通知，保留源/刷新/预检原件交运维兜底；不停对局。')
lines += ['', '### 切片大小', '',
    '- 固定种子20260929，从截至切点SILENT状态最高两阶A9/A10各20状态×6界面，共240配对。sample-manifest记录池/时间戳，不足同阶同界面才有放回；CHARACTER=silent调用官方knowledge-slice.ts，common/silent其余知识及统计冻结同份，只换experience。', '',
    '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |', '| --- | --- | --- | --- |']
for b in SS['rows']:
    lines.append(f'| {b["sample"]} | {b["before_median"]}/{b["before_max"]} | {b["after_median"]}/{b["after_max"]} | {b["paired_median"]} |')
lines += ['', f'- 整体中位{SS["before_median"]}→{SS["after_median"]}（{SS["after_median"]-SS["before_median"]:+}字），配对差中位{SS["paired_median"]}；最大{SS["before_max"]}→{SS["after_max"]}，单片最多增加{SS["increase_max"]}、最少变化{SS["decrease_min"]}。',
    f'- active{U["active"]}，正文{U["chars"]}字符，置信度{U["confidence"]}；A8 {U["asc"]["8"]}；A9 {U["asc"]["9"]}；A10 {U["asc"]["10"]}。无预算压缩/合并/退役，未改测试预算；需要Dai定：无。', '', '原始证据、复算、核验/失败初稿、提案/CLI、切片、测试和合入回执均留' + str(O) + '。', '']
body = '\n'.join(lines)
(O / 'changelog-section.md').write_text(body)
(O / 'report.md').write_text('# 经验库更新报告\n\n' + body)
(O / 'mechanism-ids.json').write_text(json.dumps(mechanisms, ensure_ascii=False, indent=2) + '\n')
if sys.argv[1:] == ['append']:
    assert commit != '待自测提交' and tests.get('tsc') == tests.get('vitest') == 0
    path = ROOT / 'paper/materials/experience-changelog-silent.md'
    old = path.read_bytes()
    addition = ('\n' + body).encode()
    assert ('## ' + heading).encode() not in old
    with path.open('ab') as f:
        f.write(addition)
    assert path.read_bytes() == old + addition
    (O / 'changelog-append.json').write_text(json.dumps(dict(old_bytes=len(old), added_bytes=len(addition), old_sha256=hashlib.sha256(old).hexdigest(), addition_sha256=hashlib.sha256(addition).hexdigest()), indent=2) + '\n')
    print('仅追加本节', len(addition), '字节')
else:
    print('报告初稿保存', len(body), '字符')
