import hashlib, json, re, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'));SL=json.load(open(O/'sl-summary.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));M=json.load(open(O/'live-merge.json'))
commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def tests(name):
    t=(O/name).read_text();return sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),sum(map(int,re.findall(r'Tests\s+(\d+) passed',t)))
st=tests('test-source.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log') if M['merged'] else None
offsets=json.load(open(O/'new-state-offsets.json'))
base=json.load(open(O/'baseline-check.json'))
rows=['## '+title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5259的QNTW139MGECA及05:21:37勘误、05:24:41机制补记；埋地中文名按BURROWED_POWER更正，0057/0125当前登记S1.exp61不倒算该版已在本局加载。runs.character=SILENT、A10、F28败，无跳过；唯一run-1007-0503-QNTW139MGECA.md定位，last_seen=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main由3da1a93c快进e546d864，无冲突；已读README/最新STATE/decision-log末尾/学习协议、铁甲首次和末两节方法、静默第60/61节。独立执行、无下级agent；抽取复算nice19单进程、不跑boss模拟池。',
'- 截至QNTW139MGECA结束2026-10-06T21:03:12.594Z，76静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/36局。旧1177房65实死加新12房1实死＝1189房66实死，A10三十六局475房36死。MCCK2602T1SR仅进数字；无character旧局/进行中/后续局排除，不借用其他角色经验。',
f'- 原日志按12位局号rg分流476 decisions/33实际Codex请求/6 run-plans/1 SL行；states按时间seek流式抽487静默帧，首字节{offsets["first"]}、末帧起点{offsets["last"]}，476个observed_ts/指纹全匹配。同窗DeepSeek0、ds_*仅兼容字段；98d2d508+dirty不冒称完整复原。本节脚本、原始新片段及历史只读链接均在learner/runs/20261007-052654-experience-update。',
'- 口径沿第61节：净损＝首COMBAT帧HP−同房最终尝试末结算HP，实死单列、回复负值保留；Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后按run/floor去重，TD1 F17重启仍一房；读档回血与实际休息分账，未结算毒/未来能力不补。',
'- 本局四次休息21/21/23/23合88；羽毛到火12/12/15另39、吃蛋增当前及最大血7、换幕17→65均单列，不能都归为休息收益。末轮6血面对完整需损16，实际死亡截断只扣6；−10为预计余血，不是10点攻击。',
'- 先逐局重新执行旧75局原始片段分析：七数组逐行、全部血档/源节点/回血/SL与上一节一致。'+ '、'.join(f'{k}{v["before"]}→{v["after"]}' for k,v in base.items())+'。静默历史机制复盘重新过滤，原始状态按enemy_id回查地道虫，不依赖复盘中文命名；所有数据/局号/损值及机制名单留audit.json和机制文件。',
f'- 开工active132/48258字<55000，不需强制开工压缩；补证更新11条，以同主题新案例压短重复叙述，不合并/退役。增1改11（全补证、纯数字0）退0，active133/{C["chars"]}字，高64中40低29；不改60000预算。',
'- potion:*和general:potion对象保持，其他旧药水/药瓶/喝药/留药/药栏句逐字保留；新证据仅非药水部分，无新用药规则。机制[0,20]，统计/构筑观察沿[8,20]；新埋地机制A0/A2/A9/A10已见，同公式按现场进阶基伤占位，不扩充未见交互。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
topics=[
('角色/旧基线','76静默局；旧75局七数组/血档/源节点/回血/SL逐行对上，新12房1死','独立局与房/尝试/判死/实死分账'),
('污染与能力','棱柱T3非凡技艺/步法建1力3敏不加污染；T5三技能污染0→6→12→18、攻15→21→27→33、24挡损9','能力/技能分核，第三挡相对两张省2，不一概禁技能'),
('力敏与挡','仪式兽T2先防御5再步法2敏，生存者10合15盖15；T8双防御7合14盖14；棱柱3敏三挡各8多9','敏捷不追补旧挡，多牌收益逐张核'),
('力量与实际伤害','棱柱T9六攻击合61，1力多6；先扣22挡、再扣39血、毒3后仍余2','原始攻击/穿挡/毒伤分账，不据差2判另线必胜'),
('临时减力','棱柱T4尖啸力−2→−8、两技能6污染、8挡盖8零损；T5恢复−2而火花6','减当前威胁不永久抵销成长'),
('萎靡与阶段','仪式兽T4普通X3减4→1力、24→15攻、加3弱、零挡损15；T5直伤179→149清阈值160/旧力，后段力4/8','减益不提供挡，清力只当前阶段、后段仍威胁'),
('埋地清盾','全76局按TUNNELER扫描，7局7次非致死清盾均埋地消失/转眩晕；A0:1/A2:1/A9:2/A10:3，零反例','首次证据回溯LRN0HPZ0FZS1，未触发不是反例'),
('羽毛与休息','旧7局55次到火加本局3次＝8局58次；公式min(缺口,3×⌊牌组/5⌋)全对，本局到火39、休息88','到火/动作/换幕与最大血收益分账'),
('群蛇/爆发观察','群蛇全局0次；T5未选群蛇题面损15/五轮8死，实选三挡损9/样本5死；T1护栏省3血多8伤且撤爆发机会','持有/未执行不预支，单轮优势不定整战胜因'),
('路线/血量','F7取消后段精英，一幕无精英boss仍损56；F18预计F27入55实22，问号F22损36、事件F25失7；羽毛+休息后60进棱柱死','低血改线及高血进场仍有混杂，不定安全线或节点优劣因果'),
('SL对照','本局仅仪式兽attempt1首试胜一行、重打0；历史真重打仍71场311次24赢/A10 38场170次12赢','首胜不加重打分母；历史同初序/到手轮与动作分别核'),
('模拟/时钟','F16回血选项448样本、入73、原胜率0.404/校准0.6132、赢损中位64/约12轮，实损56/12轮；调用超时未满请求','赢样本不保证结果，无silent逐轮时钟需/估伤/存活轮校准'),
('最优标记/药水事实','原答标最优103/106=97.17%，有效布尔103/105=98.10%；扣护栏102/106=96.23%；独立取8/显式用8','完整原线执行率未记录，药水仅事实不补证/规则'),
]
for t in topics:rows.append('| '+' | '.join(t)+' |')
rows+=['','死亡率分母为战斗房，局数另列；活损中位排除实死并保留负回复。A0—A9各格与第61节完全一致；全部格和局号可由audit.json复算。A10全部非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['asc']==10 and r['n']:rows.append(f'| {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
rows+=['','源节点以入血档关联下一战，多源可指同战；不是节点选择的因果效果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['asc']==10 and r['n']:rows.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
rows+=['','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 真正重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for a in range(11):
    r=R[a];s=SL[a];f=[x for x in A['fights'] if x['asc']==a]
    rows.append(f'| A{a} | {r["runs"]} | {len(f)}/{sum(x["death"] for x in f)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
rows+=['',
'- 全历史真正重打逐场每次explore/sl_attempt/抽序/到手轮/局部动作留sl-comparison.json。上一局巨兽初序26/25不同、两试一赢，知识恶魔初31项同但到手轮/防御/收场等多项同变、两试一赢；仍不命名单牌转胜。本局没有重打对照，不新增boss/精英SL打法规则。',
'- 低血不同节点旧例重核：MGA0CZDDKC0P A10 REST22→43后Monster损17活，4D4J8USKCPAV REST1→22后损1活；D4LJ9QMGFB8Q EVENT13与BVF22RSFVBS9 EVENT21后走廊死。本局F9低血11休到32后损14活，而F25事件29→22后羽毛/回血到60仍精英死；敌/构筑/回复及间隔混杂，未选路线未实打，只观察。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 实际33次大脑请求均Codex、DeepSeek0，未见直接引用经验id却反向执行的原话；不倒算S1.exp61或本版已在本局加载。F21选群蛇原话“Free enhanced Strikes, Shivs, and cycling support frequent Serpent Form triggers, adding sustained damage this deck needs for bosses and later acts.”（中文：免费强化打击、小刀与过牌支持群蛇频繁触发、提供持续输出）；实际整局群蛇0次，F22 T2/T7及F28 T5到手不等建立。F18原话“五张零费强化打击补输出，右线少战多恢复”；牌已生效但三费能力未建，未选线结果未知，不认定能力本身无效或早建必胜。',
'- F1路线原话“先商店补强，营火保障血量，后期打一精英兼顾成长与安全。”；F7/F12改线后一幕无精英、boss损56；F27实际回血37→60仍死下一强制精英，未选锻造/路线没有受控实打，不列重复策略错误。',
'- 棱柱T1护栏原选打击→爆发→萎靡题面扣9/损16，替线突然一拳→打击→萎靡扣17/损13且兑现；原/替五轮均0/8赢，撤掉爆发机会后的整战代价没有对照，不当纯bug或repeat。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for e in json.load(open(O/'mechanism-facts.json')):
    lesson=e['lesson'];reason=lesson.split('机制：',1)[1].split('搭配：',1)[0].rstrip('。');case=lesson.split('典型案例：',1)[-1]
    asc='、'.join(f'A{k}:{v}局' for k,v in e['asc'].items())
    rows.append(f'| {e["scope"]} | {reason} | {e["support"]}/{e["contradict"]}；{asc} | {case} | {e["id"]} |')
rows+=['',
'- 12位支持/反例名单见experience.json和mechanism-facts.json。卡牌支持全部有实际施放；新局487帧/476指纹、污染/力敏/临时减力/萎靡/死亡截断逐帧断言通过。地道虫按全76局状态找7次，未清盾/已击杀不冒作反例；羽毛8局58次公式全对。综合n不表示每个子公式每局都独立验证，机制成立的败局不是反例；整战胜因未隔离者写观察，不写喝药规则。',
'','### 新增','',
'- silent-tunneler-burrow-block-stun：hallway:TUNNELER/[0,20]/high，七支持零反例，A0一局/A2一局/A9两局/A10三局；五次攻击削盾、一次移除格挡、一次直接伤害，仅核敌反应。埋地盾归零后即使未掉本体血也取消当前攻击；典型LRN0HPZ0FZS1 A0清7挡取消17攻、VPW A10不掉血取消15攻、本局清20挡取消23攻。复用既有silent-0207，不重复add；首证从F4Q/A9更正为LRN/A0，prior=yes保持并补更早正确执行依据。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['rows']:rows.append(f'| {r["id"]} | {r["before_n"]}→{r["after_n"]} | {r["before_chars"]}→{r["after_chars"]} | 补本局非药水支持、替换重复案例/同步数字 |')
rows+=['',
'- 11条全加证据，纯数字0、无合并条目/退役；压短项目及长度如表，旧完整内容留experience-before.json。羽毛旧字段n=7而句内“决定胜负n=6”不同步，本轮统一到8局/58次；规则公式不变，不额外记数字更新。',
'','### 退役','','- 无。没有新增反例多于支持或由代码修掉的active机制缺口；本轮均实际游戏事实/观察，不将模型已实现的真实机制退役。',
'','### 和手写知识及代码冲突','',
'- 静默其他六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，没有手写知识需改/删，不新建。hash/字段/生成切点留other-knowledge.json；outcome-stats A10为36局，与本节一致；room-costs 76局至21:01:40.231Z按MAP→下一MAP，与本节净损口径不同。monster-records至21:03:10.410Z为1190开窗/A10 476，而本节1189房/A10 475，差1仍TD1 F17同房重启，不当新独立房或整表无效，不覆盖刷新。',
'- common按现场核：仪式兽A10血262、PLOW阈值160/横冲基础20，地道虫下方基础26加现场−3力为23/弱后17；棱柱基础刺击17、−2力为15，污染N逐击叠加。共同事实仅校验，不增加静默支持局数。fight-value/gates仍2局40战223行，仅题面事实，没有证据证明整表无效。代码手写文本定向检索未发现与本次新增结论相反的明确规则，代码不改；其他角色行为保持。',
'','### 代码问题（不给 DS）','',
'- 没有新确定纯bug。棱柱T6初题扣20、实际再加6毒合26来自重问后动作；T8初短段预计28与完整攻击30有2差额，分项来源未记录；不把不同口径当模拟缺陷。末least-loss −10与6−(24−8)一致，实际归零截断只扣6。',
'- 离线初稿事实校验原预期地道虫3触发，全历史实际7，facts.log/事实初稿及draft-corrections.md保留；补记按rationale中文筛13局遗漏LRN/ZZMY/HMV/PU80四局。当前原日志SL行1、仪式兽attempt1首试胜，与复盘称0行不符，来源差额未定位；不增加真正重打分母。首证勘误经账本CLI追加，不改只读复盘。均不是生产源码或自测失败。初稿7846a661及初始源/合后测试原件保留；定稿不把七次全归攻击触发，五攻击/一移盾/一直接伤害，并重新测试源/合后。',
'- 未记录：护栏原线/提前群蛇/替构筑/路线/休息的受控整场结果、抽牌重问后最优整条原线执行率、T8短段2伤根因、boss逐轮需/估傷/可活轮、二幕及三幕boss实到与实打、Jev缓存，不补造。',
'','### 测试','',
f'- 源固定沙箱tsc0/vitest0、{st[0]}文件/{st[1]}用例；'+(f'合后tsc0/vitest0、{lt[0]}文件/{lt[1]}用例。' if lt else '未合入、合后未测试。')+('初稿源/合后首轮均通过；操作来源复核后修订机制文字，定稿源/合后各重新测试一轮并通过，无测试失败或超时重跑。' if not M.get('test_first_rc') else '合后首次失败与重跑保留live-merge.json和日志。')+'固定数据/nice19/固定排除入口保持，完整沙箱外套件交调度器。',
f'- JSON/证据角色/12位id/n/范围/预算/旧基线/476指纹/机制/药水分句/git diff --check/gitleaks通过。源{commit}仅改静默experience.json，英文提交写版本/增1改11退0并带Co-Authored-By。',
'- 仅learner/ledger.py/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖12经验条目；新增/退役无、check0。0207补四个更早支持并更正first_run/asc/prior_note/claim，prior=yes及原登记历史保持；其他旧first_run/prior/claim/版本/repeat保持。不写accepted/shipped，未并入条目不动。主目录本节/账本仅追加，不提交。',
'','### 切片大小','',
'- 固定种子20260929，从截至本局54,945帧静默原始状态池按state.run.character_id=SILENT抽最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对，真实界面独立抽样。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只换experience、其他知识/结果表固定；manifest及逐片原文保留，不冒充V4完整前缀。',
'','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:rows.append(f'| {r["sample"].replace("sample-","")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["delta"]} |')
rows+=['',f'- 配对增量中位{S["median_delta"]}、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active132→133、48258→{C["chars"]}字，高64中40低29；'+'、'.join(f'A{a} {r["entries"]}条{r["chars"]}字' for a,r in C['applicable'].items())+'。需要Roy定：无。',
'',f'本节收尾：源{commit}，实际live合入{M["merged"]}，上线登记{M.get("release_commit")}/eval {M.get("eval_version")}；刷新{M.get("refresh_commit")}、合前{M.get("base")}，知识冲突{len(M.get("conflicting_overlap",[]))}，其他知识blob保持。无源码/生成器/手写知识/其他角色/新用药规则改动，不重建；主目录本节/账本由调用方提交。运维交接learner/runs/20261007-052654-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后CLI登记15项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。','']
text='\n'.join(rows).replace('估傷','估伤')
path=ROOT/'paper/materials/experience-changelog-silent.md';old=path.read_bytes()
assert ('## '+title) not in old.decode()
(O/'changelog-before.json').write_text(json.dumps(dict(bytes=len(old),sha256=hashlib.sha256(old).hexdigest()))+'\n')
(O/'changelog-section.md').write_text(text)
with path.open('a') as h:h.write('\n'+text)
assert path.read_bytes()[:len(old)]==old
print('第62节只追加，旧文逐字保持',len(text))
