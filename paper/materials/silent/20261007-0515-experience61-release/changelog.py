import hashlib, json, re, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));R=json.load(open(O/'rest-summary.json'));SL=json.load(open(O/'sl-summary.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));M=json.load(open(O/'live-merge.json'))
commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def tests(name):
    t=(O/name).read_text();return sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),sum(map(int,re.findall(r'Tests\s+(\d+) passed',t)))
st=tests('test-source.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log') if M['merged'] else None
rows=['## '+title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5246的8R5CXD5C8PW8及04:55:17有效勘误；F6火焰目标ID按SLUDGE_SPINNER、仪式按T2开场已显示9，不写成玩家T2出牌过程中建立。runs.character=SILENT、A10、F35败，没有跳过；唯一run-1007-0436局报定位，last_seen=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main快进d3bd6326无冲突；已读README、最新STATE、decision-log末尾、学习协议、铁甲首次构建及末两节方法、静默第59/60节。独立执行、无下级agent，抽取/复算nice19单进程、不跑boss模拟池。',
'- 截止本局结束2026-10-06T20:36:22.482Z，共75静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/35局。旧1163房64实死＋新14房1实死＝1177房65实死；A10三十五局463房35死。MCCK2602T1SR仅进数字；无character旧局/进行中/后续局不计，没有借用其他角色知识。',
'- 原日志按12位id rg分流653 decisions/35实际Codex请求/6 run-plans/4 SL行；states按时间seek流式抽671本局静默帧，首字节8100723526、末8123353959，653决策observed_ts/指纹全部匹配；同窗DeepSeek0、ds_*是兼容字段。代码e8a6fb71+dirty不冒称可完整复原。原片段/历史只读链接/分析脚本/全部数据在learner/runs/20261007-045607-experience-update。',
'- 口径沿第60节：净损＝首COMBAT帧HP−同房最终尝试末结算HP，死亡单列、回复负值保留；Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后战按run/floor去重，TD1重启仍一房；读档回复不算回血、未派发结束不补毒/未来伤。',
'- 新局部分首COMBAT在小血瓶补2之前，复盘则用开始操作HP：F35房间60→补2到62→死，统计净损60、操作战损62；F25首41→补2到43→15，统计26、操作战损28；F23首56→补2到58→41，统计15、操作战损17；F28首36→补2到38→28，统计8、操作战损10。不是改口径或日志不一致，数字与纯战损分账。缩放仪F17另回25、F33另回22不归营火；SL判死未结算与末实死分开。',
'- 旧74局逐局重新运行原始日志片段分析，七数组逐行、各进阶血档/节点/回血/SL与上一节全部一致：fights1163→1177、nexts1092→1108、rests518→526、cards26623→26979、ends7348→7449、attempts453→457、growth2347→2347。240段静默历史机制复盘重新过滤；新增灵体更早实际施放为0，不把敌方无实体当玩家灵体先验。',
f'- 开工131 active/50163字<55000，无强制开工压缩；14补证更新以新案例合并重复叙述，旧完整文字保存在experience-before.json、逐项长度见更新表。新增1、更新14（全补证、纯数字0）、退役0，active132/{C["chars"]}字，高63中40低29。60000预算不改。',
'- potion:*与general:potion逐对象保持，其他旧药水/药瓶/喝药/留药/药栏分句逐字校验，新证据只非药水部分，无新增或加强用药规则；机制[0,20]、统计/观察沿原[8,20]，没有新高阶反例要求缩进阶或退役。机制事实与已实现代码分账。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
topics=[
('角色/旧基线','75静默局；旧74局七数组及各格重算一致，新14房1死','只静默、房/尝试/判死/实死分账'),
('灵体保护','T2的15/T3的24攻击施放后均显示1；5挡零损/0挡损1；前三轮扣45、损1','保护兑现，不等零损/能力已建/仪式停止'),
('步法/未启动','知识恶魔两试T2均实建2敏、已有9挡不涨；重打T3防御7、27攻损20；死亡战群蛇/步法0次','到手、支付和后续攻防分核，无早铺能力实打胜局'),
('仪式/萎靡','T2开场仪式9、T3/4力9/18；T4升级X3各4、18→14、33→21，后力23/32/41','减力/弱与成长并存，不外推优先级'),
('脆弱/虚弱/死亡截断','T6持羞耻/疑虑，T7牌挡19→13、直伤16→11；42−13需29、6血差23，实归零只扣6','逐牌取整；补6挡仍缺17血，不定单咒败因'),
('收场条件及兑现','F30花156购买/F32升级；知识恶魔重打T6空堆实扣75，304→229，本轮净扣92损12；雕刻师T3非空不可','已兑现75与另一战0分别核，不归整战转胜单因'),
('铜鳞片','雕刻师T2—T7各反3共18，T2全挡亦反3，末12毒＋3反伤使44→29','牌伤/毒/反伤分账，不预支未攻击'),
('蜡烛/侧步','F29添火HP28不变、后基础4能量，侧步另次轮+1使雕刻师T3/T7为5','额外能量不等能力已支付，无營火優先級'),
('巨兽重打','两试69/70、T8均清本体；首T10的41爆炸对24血14挡差3未结束；重打T9的28对13实损15、余17胜','本体归零不是战斗已结束，抽序/行动同变'),
('知识恶魔重打','两试70/70；首T13的8＋7=15判死、97血28毒未结算；末T14毒收12、余20胜','初31抽序同、到手轮/防御及后续动作不同，净扣不当毛需伤'),
('HP护栏','F8预计省18血/少19伤和4毒，F17首试T2省5/少7伤和6毒，实际替线当轮0/7损兑现','合省23/少26仅局部预测，原线整场代价未实打'),
('路线/营火/遗物回血','八火三回血各21合63，F16火23→44/缩放仪到69，F32锻造48/缩放仪到70；F34新路线后第一走廊死','未来火/商店删咒未执行，避精英不定安全'),
('投影/模拟','F11预测下火39/p75 25实23；F24预测下火31/p75 22实15；F32模拟boss入70实70，首败重打过','赢样本/抵达不保证通关，无逐轮silent时钟校准'),
('最优线/药水事实','原答最优84/91=92.31%、扣两护栏82/91=90.11%；独立取7瓶显式用8次、SL恢复不重复取得','完整重问/SL后原线执行率未知，药水仅事实'),
]
for t in topics:rows.append('| '+' | '.join(t).replace('營火優先級','营火优先级')+' |')
rows+=['','死亡率以战斗房为分母、局数另列，活损中位排除实死并保留负回复；A0—A9各格与第60节一致，所有格/局号/损值保存在audit.json。A10全部非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['asc']==10 and r['n']:rows.append(f'| {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
rows+=['','源节点按入血关联下一战，多源可指同战；节点关联率不当选择的因果效果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活場净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['asc']==10 and r['n']:rows.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
rows+=['','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 真正重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for a in range(11):
    r=R[a];s=SL[a];f=[x for x in A['fights'] if x['asc']==a]
    rows.append(f'| A{a} | {r["runs"]} | {len(f)}/{sum(x["death"] for x in f)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
rows+=['','- 历史真正重打71场311次24赢，A10为38场170次12赢；本局两场4次2赢。巨兽初抽序26/25项不同、clean各25，到手轮亦不同；知识恶魔初31项相同但到手轮不同，SL第二探索到T3、两次防御及后续抽牌/出牌共同变化。explore/sl_attempt和每次动作完整保留sl-comparison.json，未结束毒不补未来伤。',
'- 低血不同节点旧例逐数据核：MGA0CZDDKC0P A10 REST22→43后Monster损17活，4D4J8USKCPAV REST1→22后损1活；D4LJ9QMGFB8Q EVENT13、BVF22RSFVBS9 EVENT21后走廊死。新局F27火15→36后下一走廊净损8活，F34事件60血后下一走廊死；敌/构筑/遗物/回血混杂，不规定哪个节点更好。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 35次实际大脑请求全部Codex、DeepSeek0，没有直接引用经验id却反向执行的原话。F34原话“灵体保护启动；走单精英线，商店删咒补药。”；run-plan释义“利用灵体安全建立群蛇形态、毒和敏捷”。灵体减伤已兑现、步法/群蛇未建立、商店与新增营火未抵达，不能倒算本版已生效或认定能力未建必定可避免。',
'- 雕刻师T3有无实体仍零挡，原话“Jev chose plan 3/3 (end turn) with confidence 0.88; code rank 3”（中文：Jev以0.88选结束回合、代码排序第三）；五轮推演1/8赢、另两线0/8。实际损1而防御候选题面零损，只是抽样选择差别，无替线整战实胜。知识恶魔重打T6收场75已实打，而死亡战收场非空不可，不把持有75伤当随时可用。',
'- F8/F17护栏替线局部保血兑现却撤掉输出和当轮施毒；两种局部题面合省23血、少26伤，并非受控整场收益。未确认老错repeat，不归纯bug。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for e in json.load(open(O/'mechanism-facts.json')):
    lesson=e['lesson'];reason=lesson.split('机制：',1)[1].split('搭配：',1)[0].rstrip('。') if '机制：' in lesson else lesson.split('。')[0]
    case=lesson.split('典型案例：',1)[-1];asc='、'.join(f'A{k}:{v}局' for k,v in e['asc'].items())
    rows.append(f'| {e["scope"]} | {reason} | {e["support"]}/{e["contradict"]}；{asc} | {case} | {e["id"]} |')
rows+=['','- 完整12位支持/反例名单在experience.json及mechanism-facts.json。所有旧局原始状态/动作已重抽，步法/萎靡支持局均有实打；灵体只本局、只已见玩家单击减伤窗口，不把敌方无实体或其他伤源当证据。综合支持不代表每个子公式在每局独立验证；机制成立的败局不当反例，未隔离整战胜因者明确写观察；药水只原有事实、无用药规则。',
'','### 新增','','- silent-apparition-player-intangible：card:APPARITION/灵体/[0,20]/low，一局支持零反例；1费/无实体1/消耗，5挡盖1及零挡掉1、保护不停止仪式，也不证明早铺能力转胜。关联已登记silent-0206，首证本局/A10/prior=unknown保持，无重复add。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['rows']:rows.append(f'| {r["id"]} | {r["before_n"]}→{r["after_n"]} | {r["before_chars"]}→{r["after_chars"]} | 补本局非药水支持，压短同主题案例/同步数字 |')
rows+=['','- 14条全部补证，纯数字0；无合并条目/退役。压短条目与长度均如上表，旧完整案例归档。收场5支持为high、疑虑2为med、蜡烛4支持原文规则且无反例为high；蜡烛旧句n=2与字段3不一致，随本局支持统一到4，不额外计数字更新。',
'','### 退役','','- 无。没有新反例多过支持或active纯代码缺口；机制真实与模型已经实现分账。',
'','### 和手写知识及代码冲突','','- 静默其他六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，无手写知识需改/删，不新建。逐文件hash/字段/生成切点留other-knowledge.json；outcome-stats A10为35局，与本节完局数一致；room-costs为75局、截至本局F34的20:35:08.398Z且用MAP→下一MAP，和本节净损口径不同；monster-records截至20:36:20.118Z有1178开窗/A10为464，而本节1177房/A10为463，差1仍是TD1 F17同房重启，不当新独立房或数据无效、不覆盖刷新。',
'- common雕刻师A10血172、仪式9、猛烈攻击基础15与本局现场一致，力量与弱化后攻击分核。fight-value/gates仍两局40战223行、仅题面事实，无数据证明整表无效；六文件未改，不覆盖刷新。代码手写规则定向检索未发现明确冲突，代码不改；铁甲/其他角色经验及行为保持。',
'','### 代码问题（不给 DS）','','- 无新确定纯bug。F33重打T6题面扣74/损12，实际收场本体75、全轮含毒/荆棘净扣92/损12且后加侧步；短段分项差额根因未核，不直接列缺陷。F35 T2抽牌断点后续全轮多伤另核；T7 least-loss −23与6−29一致。',
'- 离线初稿更正保留转录和draft-corrections.md：runs.character旧值null须排除；SL draws.clean是整数不能len；抽牌堆字段在agent_view.combat.draw而非combat.draw_pile。校正后全部断言通过，非生产源码或自测失败，不抹旧历史。',
'- 未记录：原线/替构筑/路线/休息/早铺能力受控整战结果、SL与重问后完整原线执行率、恶魔各次独立毛回血、推演分项根因、逐轮boss时钟需/估伤和可活轮、三幕boss实到/实打与Jev缓存命中；不补造。',
'','### 测试','',f'- 源固定沙箱tsc0/vitest0、{st[0]}文件/{st[1]}用例；'+(f'合后tsc0/vitest0、{lt[0]}文件/{lt[1]}用例。' if lt else '未合入，合后未测试。')+('首轮通过，无失败/超时重跑。' if not M.get('test_first_rc') else '合后重跑情况见live-merge.json。')+'固定数据/nice19/固定排除入口保持，完整沙箱外套件交调度器。',
f'- JSON、证据角色/12位id/n/范围/预算/旧基线/653指纹/逐帧机制/旧药水分句/git diff --check/gitleaks通过。源{commit}只改静默experience.json，英文提交含版本/增1改14退0及Co-Authored-By。',
'- 只经learner/ledger.py/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖15条经验；新增/退役无、check0，first_run/prior/claim/旧version/repeat保持，不写accepted/shipped。未纳入条目不动；主目录本节/账本只追加不提交。',
'','### 切片大小','', '- 固定种子20260929，截至本局54,458帧静默原始状态池，按state.run.character_id=SILENT抽最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对；真实界面独立抽20。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只换experience、其他知识/结果表固定，样本manifest/逐片输出保留，不冒充V4全部前缀。',
'','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:rows.append(f'| {r["sample"].replace("sample-","")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["delta"]} |')
rows+=['',f'- 配对增量中位{S["median_delta"]}、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active131→132、50163→{C["chars"]}字，高63中40低29；'+ '、'.join(f'A{a} {r["entries"]}条{r["chars"]}字' for a,r in C['applicable'].items())+'。需要Dai定：无。',
'',f'本节收尾：源{commit}，实际live合入{M["merged"]}，上线登记{M.get("release_commit")}/eval {M.get("eval_version")}；刷新{M.get("refresh_commit")}、合前{M.get("base")}，其他知识blob保持，知识不同blob冲突0。无源码/生成器/手写知识/其他角色/新用药规则改动、不重建；主目录本节/账本由调用方提交。运维交接learner/runs/20261007-045607-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后仅CLI登记18项shipped，完整外部交调度器；不停对局、不运行play、不推送。','']
text='\n'.join(rows).replace('活場','活场')
path=ROOT/'paper/materials/experience-changelog-silent.md';old=path.read_bytes()
assert ('## '+title) not in old.decode()
(O/'changelog-before.json').write_text(json.dumps(dict(bytes=len(old),sha256=hashlib.sha256(old).hexdigest()))+'\n')
(O/'changelog-section.md').write_text(text)
with path.open('a') as h:h.write('\n'+text)
assert path.read_bytes()[:len(old)]==old
print('第61节只追加，旧文逐字保持',len(text))
