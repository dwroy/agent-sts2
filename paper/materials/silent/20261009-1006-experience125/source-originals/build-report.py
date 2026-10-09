import collections
import json
import re
from pathlib import Path

O = Path(__file__).parent.resolve()
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
C = json.load(open(O/'changes.json'))
U = json.load(open(O/'update-summary.json'))
M = json.load(open(O/'mechanism-evidence.json'))
P = json.load(open(O/'code-proposals-results.json'))
slice_summary = json.load(open(O/'slice-summary.json'))
ledger_map = json.load(open(O/'ledger-map.json'))
source = (O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
merge = json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else {'merged':None,'result':'待测试完成后锁内预检'}
tests = json.load(open(O/'test-results.json')) if (O/'test-results.json').exists() else {'tsc':None,'vitest':None,'files':None,'cases':None,'rerun':False}
stamp = (O/'record-time.txt').read_text().strip()
title = f'2026-10-09 静默猎手 第一百二十五次增量：2 局 A10（version 2026-10-09.14，分支 exp-silent，{source[:8]}）'
lines = ['## '+title,'','### 来源','',
 f'- 记录时间{stamp}。只读根notes/lessons.md:7383、7530两节静默复盘及run-1009-0852-VAC6Z1PZ1QJG.md、run-1009-0902-NG1FBJTSRLHS.md日期；两节后无勘误。runs.jsonl:642/643均SILENT/A10，分别F48/F9敗，代码bb728531+dirty/57a7f485+dirty；完整dirty树未记录，不用当前源码冒充当局树。目标局无跨角色跳过，last_seen取run-1009日期。'.replace('敗','败'),
 '- exp-silent开工干净，git merge --no-edit main快进7339da35→3e7c6dab，无冲突；README、最新STATE、decision-log末尾、学习协议/代码提案闭环、首次构建及最后两次静默增量方法、账本README已读。独立完成，不派agent、不联网、不运行play；数据/工具nice19单进程，固定测试单worker，无boss模拟池。',
 f'- 全引擎本角色学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧160局只进数字与历史机制复核，不冒称纯Codex爬塔成绩；无character旧铁甲、其他角色、进行中/切点后局排除。',
 '- 按run id rg抽1185/121决策、9/0条SL、7/1计划，states/reasoning二分字节seek按决策时间窗流式抽1212/128帧，逐帧核silent及局号。两局状态与复盘原件全等，决策/状态按原偏移逐条seek；24项关键机制核验通过。大脑全Codex、窗口内reasoning/DeepSeek均0；ds_*兼容名不证明DS调用。VAC全run脑记录52条、决策窗口51条，首条event/choose为23:52:30.004Z，早于首决策23:52:30.008Z四毫秒；NG原脑9条，不将不同窗口计数当错误。',
 '- 口径沿上一节：同房首COMBAT入口HP−末次退出HP，含自损/回复而非敌毛伤；SL一房一场，判死截断不算实死。Monster才是走廊，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient；多节点可以关联同战，HEAL后战再去重。房/节点/动作/局数分开，未列组合n=0。',
 f'- 旧160局原抽取子集重新analyze/audit；七数组、血档房/局/损/死、节点、回血及SL全部对上，无口径漂移：{json.load(open(O/"baseline-check.json"))}。机制全部复盘关键词复核662段，16条证据角色/进阶/首状态全核；具体参数子分母另列，支持总局数不等每个公式验证局数。',
 '- 新增0、更新16（加证据16、只改数字0）、退役0；active193→193，正文51884→51769字符，低于55000压缩线/60000预算。无预算合并/退役/压缩；替换近例前的完整正文/证据保留before/changes/原历史。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];m=next(m for m in M if m['entry']==e['id'])
    lines.append(f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{m["asc"]}；账本{",".join(ledger_map[e["id"]])} | {e["lesson"]} |')
lines += ['', '新局独立战斗房：同房SL只计一次，退出死亡单列。','', '| 局/层/幕/房型 | 首帧敌人 | HP进→出/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run'] not in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']:continue
    lines.append(f'| {f["run"]}/F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines += ['', '- VAC21场前序实胜，F33火箭/碾碎爪75→7虽赢损68，跨幕补56另账；七次真实休息159、跨幕18/56、吃蛋与草莓各7、问号入房七次各5及事件扣血分账。F47丢毒药后休息到67并由邮箱补再生/攻击。实得21瓶、饮30次＝前序18＋女王六试各2、明确弃1/购1；五次SL恢复同两药不算十瓶新得。末试再生已回15，女王末轮毒21及荆棘只使182→152；8血14挡对45完整需31，存活至少差24。毒/荆棘后死亡意图30不覆盖出牌前45。',
 '- NG五场前序实胜，前四零损，F4吃蛋56→63/上限70→77，F7锻造不回，F8双小啃兽63→45损18后45血进F9实死；F5得痊愈/F6T1饮、F8得安瓿/F9T1饮，共得2/饮2/弃0/购0，无SL。F9五轮可见扣血42/25/6/18/13合104、毒4/3/6/5/4合22已包含其中，132−104=28；末12血10挡对25完整需15，存活至少差4。',
 '', '分阶/幕/房型全部非空血档；n为独立房，赢战净损含自损/回血。','', '| 进阶/幕/房型/入口血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
    if not b['n']:continue
    lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines += ['', '非战节点入口血档与下一更高层首战关联；同战可被多个节点关联，以下死亡按节点，不当独立局死亡率。','', '| 进阶/幕/节点/血档 | 节点/独立后战 | 死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
    if not b['n']:continue
    lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines += ['', '| 进阶/完局 | 独立营火/回血动作/锻造动作 | 实回HP | 去重回血后战/实死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for b in json.load(open(O/'rest-summary.json')):
    lines.append(f'| A{b["asc"]}/{b["runs"]} | {b["rests"]}/{b["heal"]}/{b["smith"]} | {sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}/{b["deaths"]/b["nexts"]:.2%} | {b["median"]} |')
lines += ['', '低血不同节点只有观察，未随机化牌组/下一敌/抽牌与可选路线，不能从节点间死亡差推出改线更好。NG F7后至强制精英没有插入恢复环节；VAC F25转店线比营火线投影少23进场HP，实际F32到火52回75，后F33胜损68，未实走另一线。',
 '', 'SL多次重打按独立房/记录尝试/赢尝试统计；仅有预演但未实读档的房不算。','', '| 进阶 | 重打房 | 记录尝试 | 赢尝试 |','| --- | --- | --- | --- |']
for b in json.load(open(O/'sl-summary.json')):
    lines.append(f'| A{b["asc"]} | {b["fights"]} | {b["attempts"]} | {b["wins"]} |')
lines += ['', '- VAC女王六试同67/84及再生/攻击药，五次T12判死SL、末T12实死，0/6赢。第3试实去T9药瓶；第4/5试回放T1盘面不一致停止，没有补造目标回合偏离。第6试T4实换升级药瓶/后空翻/手法，后续抽牌不同仍败。两相关条目自己的证据集合分别11房57试3赢、10房57试1赢，不和全A10所有敌的121房548试37赢混作同一分母。历史获胜如PBUBM0LRTEDD第三试T9胜26空药，多处选择/抽牌变化，不能归为延后药或固定顺序单因；下一boss六败。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 两局实际大脑都是Codex，DeepSeek/reasoning窗口0，原整份知识只记录prefix_sha/chars，未保存可核的逐条引用；没有证据证明某条经验文本导致选择错误。以下是原理由与执行不符，不能冒称已定位知识因果。',
 '- NG F7原文：“Current health supports the next elite; healing now wastes most of Pillow’s recovery.”（译：当前血量支持下一精英，回血会浪费枕头大部分回复。）实际63不回，F8赢损18后F9 45进场死；两个选项模拟boss入口同77且均零赢，不作回血浪费证明，缺休息线实打，支持0020观察、不记重犯。',
 '- VAC F40原文：“Afterimage’s innate upgrade ensures early passive defense in this large deck, improving both consecutive bosses and bypassing Frail.”（译：余像固有升级确保大牌组早期被动防御、改善两boss并绕过脆弱。）末试到F48T8才实际施放，不能把固有/持有当T1已建立或提前建必胜。',
 '- VAC F47原文：“Healing to 67 HP is essential for consecutive bosses. Replace the modest poison potion to receive both Mailbox potions.”（译：连boss需要补到67，替掉毒药接邮箱两药。）确实执行弃药/回血/两药，但六试仍败、未抵达F49，无留药受控胜果；不是没有照做，不拟弃药阈值。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names = {
 'silent-strength-weak-observation':'力量逐击/弱与成长',
 'silent-noxious-fumes-growth':'毒雾轮初累积',
 'silent-frail-card-block':'脆弱逐张取整',
 'silent-afterimage-per-card-block':'余像逐牌被动挡',
 'silent-piercing-wail-temporary-strength':'尖啸临时减力',
 'silent-queen-poison-main-target':'女王后段减益/成长',
 'silent-anticipate-temporary-dexterity':'预判临时敏捷',
 'silent-haze-group-poison-weak':'迷雾毒与弱分源',
 'silent-cure-all-energy-draw':'痊愈加能抽牌',
 'silent-regen-potion-decay-heal':'再生衰减回复',
 'silent-toric-toughness-delayed-block':'坚韧即时/延后挡',
 'silent-bygone-effigy-wake-strength':'雕像苏醒十力预算',
 'silent-deck-burst-observation':'构筑实际兑现观察'
}
mechanisms=[]
for c in C:
    e=c['after']
    if e['id'] not in names:continue
    m=next(m for m in M if m['entry']==e['id'])
    lesson=e['lesson'];main=lesson.split('典型案例：')[0];case=lesson.split('典型案例：')[-1]
    lines.append(f'| {names[e["id"]]} | {main} | {e["n_support"]}/{e["n_contradict"]}；{m["asc"]}；参数明细{m["observed_actions_or_rooms"]}动作/房、{m["observation_runs"]}局，按来源类型分母 | {case} | {e["id"]} |')
    mechanisms.append(names[e['id']])
lines += ['', '- 每条的完整evidence/contradicting见experience.json及changes.json，支持按局、反例为与机制结论相反的局，未把整战失败当机制反例。局部效果和眼前必死预算由原帧核；早开能力/提前杀敌/留药的整战因果没有受控数据，均写观察或明确未控。机制[0,20]、变进阶招式用已有common占位，策略[8,20]/女王SL[10,20]范围保持，无跨角色借证。',
 '', '### 新增','', '- 无。', '', '### 更新','']
for c in C:
    e=c['after'];new=[r for r in e['evidence'] if r not in c['before']['evidence']]
    lines.append(f'- {e["id"]}：{c["before"]["n_support"]}→{e["n_support"]}支持，新增证据{",".join(new)}；更新数字和近例，范围/反例/其余条目等价。')
lines += ['', '### 退役','', '- 无；没有参数机制已被代码修掉需退役的差错条目，本次更新的是实盘机制，不因其在代码中已有计算便删除观察。',
 '', '### 和手写知识及代码冲突','', '- silent无独立手写攻略。其他八份JSON的SHA/来源/口径逐份核，与上一批相同；room-costs旧MAP分母、monster-records按尝试遭遇、outcome-stats旧截止、fight-value/gates模型校准与本次162完局净HP表区分，boss-trust/double-boss仍保留来源切分和未观察边界。无需要改/删的冲突，不重建生成数据，见other-knowledge.json。',
 '- 源码只读定位：agent/src/reflex/combat-plan.ts:3269打印leastLoss.outcome.hpAfter，-23/-3对应两局正确末轮预算；不登记伪纯bug。已有机制/回放是否实现由独立strategy-proposal核当前live祖先源码去重；没有在本经验任务改打法或手写源码知识。',
 f'- 三份专用提案{",".join(P)}，source_task=experience-update、target_task=strategy-proposal，覆盖16相关active经验/18账本/本角色证据；domains combat/potion/sl/terminal，均pending，不称implemented/shipped。复盘原三提案和纯bug0332保留，不重复其修复记录。',
 '', '### 代码问题（不给 DS）','', '- F47双boss“missing successful first-fight resources”沿复盘新bug-infra silent-0332及silent-proposal-0b28f52e415d80d1：continuationInput要求first.won/resources/正HP，调用方在成功首战后接续；缺触发种子及完整首战末帧，不能分辨resources缺失还是HP非正。不把失败接口写成游戏机制，不伪造满血/空药资源。',
 '- 缺完整dirty树、女王前五SL末轮退出结算、部分退场末击/多段攻击与荆棘独立命中、原护栏线/另一击杀序/提前能力/留药/休息整战反事实、实际完整执行最优比例、部分推演差额来源、F49与NG未到boss资源、时钟需要/估计及实打/时钟比、Jev缓存和实际费用，均保留未知。',
 '- 探索核验初稿误把turns.end死亡帧当出牌前帧，改为原s318072及s317932对应动作；原失败verify-new.log/verify-new-2.log保留，最终24项通过，不从错误中间视图修改产品代码。提案登记脚本初按JSON解析CLI纯文本id失败，原register.log保留；恢复时只续提案、去重首个id，无重复证据更新。',
 '', '### 测试','',
 f'- 原bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1，固定数据/固定排除，tsc退出{tests["tsc"]}，vitest {tests["files"]}文件/{tests["cases"]}例/退出{tests["vitest"]}；重跑{tests["rerun"]}。未改测试预算/排除名单；完整外部套件交调度器。',
 '- JSON合法、n/evidence/角色/asc/scope/name和未改条目等价核验通过；check-experience missing=[]/退出0、diff --check/gitleaks0，ledger.py check见完成记录。',
 '- 账本新增无；提交后proposed '+','.join(dict.fromkeys(i for ids in ledger_map.values() for i in ids))+'；退役无。首证/prior/claim/历史support/repeat/旧版本保留，0332未并入经验保持observed；实际shipped交运维据完成事件登记，代码提案pending。',
 f'- live锁内结果：{merge["result"]}；合前{merge.get("pre")}，刷新{merge.get("refresh")}，实际合入{merge.get("merged")}；合后沙箱{merge.get("tests")}。']
for conflict in merge.get('conflicts',[]):lines.append('- '+conflict)
for path in merge.get('overlap_conflicts',[]):lines.append('- 知识重叠冲突：'+path)
if merge.get('merged') is None:
    lines.append('- 未合入，待调用方/运维据完成事件兜底；按任务遇冲突停，不覆盖刷新/并行记录，不造eval上线版本，不发实际规则变更双通知，不停对局。')
lines += ['', '### 切片大小','', '- 固定种子20260929，截止前silent最高两阶A9/A10，每阶每界面20状态×6，共240配对；各池均足20，无补抽。官方knowledge-slice.ts用CHARACTER=silent、冻结common/silent其他知识、前后只换experience；sample-manifest保留时间戳及池数。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for x in slice_summary['rows']:
    lines.append(f'| {x["sample"]} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["paired_median"]} |')
lines += ['', f'- 整体中位{slice_summary["before_median"]}→{slice_summary["after_median"]}（{slice_summary["after_median"]-slice_summary["before_median"]:+}字），配对差中位{slice_summary["paired_median"]}，最大{slice_summary["before_max"]}→{slice_summary["after_max"]}；单片差{slice_summary["diff_min"]}至{slice_summary["diff_max"]}。',
 f'- active193，正文51769字符，置信度{U["confidence"]}；A8 {U["applicable"]["8"]}，A9 {U["applicable"]["9"]}，A10 {U["applicable"]["10"]}。无预算合并/退役/压缩；需要Dai定：无。',
 '', f'原子集/偏移、复算、初稿和失败、参数核验、提案/CLI、切片、测试、合入预检与完整报告保留{O}。','']
(O/'changelog-section.md').write_text('\n'.join(lines))
(O/'report.md').write_text('\n'.join(lines))
(O/'changelog-title.txt').write_text(title+'\n')
(O/'mechanism-names.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print('报告',len(lines),'行；标题',title)
