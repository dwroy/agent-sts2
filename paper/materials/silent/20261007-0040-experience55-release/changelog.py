import json,re,collections,statistics,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];RUN='ZVYUL2YP3518';A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));M=json.load(open(O/'mechanisms.json'));S=json.load(open(O/'slice-summary.json'));L=json.load(open(O/'ledger-result.json'));rests=json.load(open(O/'rest-summary.json'));sls=json.load(open(O/'sl-summary.json'));R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))};es={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']};title=(O/'changelog-title.txt').read_text().strip();commit=(O/'commit.txt').read_text().strip();stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def tests(path):
 s=(O/path).read_text();return dict(files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',s))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',s))))
t=tests('test-source-final.log');assert (O/'test-source-final.rc').read_text().strip()=='0' and t['cases']==2245
lines=['## '+title,'','### 来源','',
f'- 记录时间{stamp}。notes/lessons.md:5177的ZVYUL2YP3518及00:00:18勘误、notes/run-1006-2334-ZVYUL2YP3518.md，只读；runs.character=SILENT、A10/F49败，无跳过。last_seen按run-1006文件名为2026-10-06，版本按今天2026-10-07.1。',
'- exp-silent开工干净，git merge --no-edit main从4cf918b6快进87a9618f，无冲突。已读README、最新STATE、decision-log尾、学习协议、首次构建及最近两节方法；其他角色只取方法格式，不移植游戏知识。独立执行、未派下级agent；nice19单进程抽数，不跑boss模拟池。',
'- 截至2026-10-06T15:34:08.977Z，67静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/27局；1040旧房56实死+新19房1实死=1059房57实死，A10二十七局345房27实死。MCCK2602T1SR只进统计，不引用该局复盘机制；后续/进行中/无character旧局不计。',
'- 全67局decisions/brain/run-plans/sl-attempts按12位局号rg分流，states/deepseek按时间二分seek流读并核state.run.character_id及run_id。新1110决策、46原始大脑日志（44决策调用+2独立review，均Codex）、8计划、10原始SL行、1147状态；状态首末字节7884775196—7932051127，同窗DeepSeek0。兼容deepseek_calls=44及ds_*不当真实DeepSeek调用。开局code=6ac57ea6+dirty，不声称恢复dirty代码树。',
'- 旧66局七数组和所有血档/源节点/回血/SL逐行重算一致：fights1040→1059,nexts974→997,rests469→478,cards23673→24312,ends6515→6666,attempts408→418,growth2255→2347。baseline-check.json与summarize.py保留断言、旧截止点及全部局号；没有旧数字口径失配。',
'- 净损=首COMBAT帧HP−同房最终尝试末结算HP，回复分来源、负值保留、实死另计。Monster走廊和Unknown问号战分开；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后战按run/floor去重，TD1同房重启合一房。五次判死未派发末轮不补毒/攻击/死亡。',
'- 抽数补充：新F21/F22在地图expect.node.type均Unknown，不能塞进走廊；F43迷失/遗忘Monster战80→67净损13，复盘“其余战斗”省略此行，汇总仍含。按勘误PARAFRIGHT/THE_OBSCURA/TURRET_OPERATOR；F24首COMBAT只有THE_OBSCURA，后召唤PARAFRIGHT不当又一房。末GAME_OVER实验体#C64与战前#C63稳定ID同TEST_SUBJECT，不另计。',
'- 原审计cards只计completed结果，保持旧口径；净化/生存者在选择题前返回pending，需查随后同轮稳定COMBAT确认。补两条末试机制投影，不混进旧cards数组。初稿按completed找生存者发生StopIteration；初稿脚本/日志保留，修按稳定后帧，非生产代码失败。',
'- 開工126 active/55756字>55000，先核n=1/low条目：28条均为独立scope事项，无可合并的同scope重复，未强并或丢机制；压缩同族、毒药、女王、精准、音叉5条冗长旧例，共1196字至54560，全部原文在experience-before.json/compression.json。再补新局：新增0、更新21（21补证、0纯数字）、退役0；active126/56138字，高58中41低27。总预算60000不改。',
'- potion:*及general:potion完全不动；其他旧喝药/留药/药水分句逐字断言保持，新证据只写非药水部分，不新增或加强用药规则。机制[0,20]、路线/休息/构筑[8,20]、同族策略[10,20]保持。',
'- 所有脚本、重新抽的分流、完整数字和旧经验保存在learner/runs/20261007-000343-experience-update/。','', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
topics=[
('基线/角色','旧66局七数组及全部分档/节点/回血/SL一致；新19房1死、67局1059房57死','不混角色、房与尝试分账'),
('技能激怒/能力','末实验体T1步法/刀扇、T3毒雾/精准不加敌力；T4净化3→6，T5四技能6→18、意图42→45','技能防毒收益与加力同时核；能力不等同技能'),
('敏捷逐牌','末T1石头1+步法3=4而17旧挡不补；T5偏折8/翻9/生存者12多12，T8两斗篷各10多8','建敏非直接格挡，牌面/被动分核'),
('临时敏捷','末T6预判+使4→8，防御13/斗篷14加钗7=34盖33零损；T7回4','只本回合增量，不写成永久8敏'),
('阶段清毒','末T5敌29/19毒/18力，结束到新212/3毒/0力且玩家4敏/1触媒/3毒雾/4精准/刀扇留','19毒37潜力仅截扣29，旧毒不进新阶段'),
('毒雾+触媒','新阶段T6/7/8轮初3/4/5毒，分别结束扣5/7/9；总敌损23/23/42=88','补毒/重复结算分别算，尚余124/212非输出已完成'),
('尖啸/敌力','末T7普通−6力：44→20，22挡零损；T8恢复55对27需28，13血差15','当轮减24不代表后轮关攻'),
('精准/消耗伤','末T8三小刀牌文8、各实扣9，共27=24攻击+3遗忘之魂；毒另9','能力较基础三刀加12、遗物加3分别核，不归刀扇单因'),
('音叉/钗/锚','末T7偏折牌面8、音叉9→10补7，挡7→22；T1钗7+锚10=17，后轮仅起7','牌挡/计数被动与开场底挡不能混或跨轮预支'),
('永恒羽毛','支持子集7局55到火均符合min(缺血,3×floor(牌组/5))；新八到火回124，F47四十张42→66','到火回复与休息108分账，不为回血加牌或预支未到火'),
('石头开场','支持子集8局80持有后房首帧均1敏，新增F43/44/48/49四房','后建步法/预判不归遗物多给'),
('蜡烛添火','新F32的0→5、F42的1→6各加5且HP不变；其余三锻造四回血不续火','实际额外能量/已续火与规划分核，无动作优先级'),
('致命毒药','全27支持局均有completed施放；新F8 T3含毒药+的替代全线实际8伤/19损','施毒不是即时HP伤，线伤不全归单卡'),
('女王/同族','新同族首试70→16九轮324；女王82→50十轮630，芝士1回复前实损33、净32','两战首试赢，不加真正SL赢；无另目标顺序对照'),
('构筑实际兑现','终40张四打击五防御、贪婪/进阶之灾、8升级、无商店移除；两场毒与小刀能力均建','取得/建立/足额输出分账，失败不全归牌数或一次弃牌'),
('SL对照','实验体1场六次0赢，五读档成功恢复T1，clean40同序、仅前7张同到手轮','生成/抽牌时点/后洗牌/用药与行动同变，无赢次或单因胜线'),
('SL血价','第3/4次T5护栏题面省9血多4伤，后均靠毒清段0损；末次护栏被SL撤回也0损','原线未实打，题面差不当实际整战收益；不新定禁技能规则'),
('六次末帧','末HP/挡依次15/17,10/16,13/26,13/39,11/16,13/27；需损15/17/14/16/39/28，末实归零只扣13','前五次未结算毒和敌攻击不补；末完整需损28、缺15血'),
('路线与血池','二幕无精英仍F22问号56→4、F24走廊29→21含复活；女王82→50直接后场六败','避精英/多未来火不是当前安全；本局没有受控替路线'),
('休息动作','九火四回血41→70/43→70/39→75/66→82合108，三锻造两添火；A10后战98/16死','实际加血和替锻造因果分开，节点/动作/房分母不同'),
('路线估值','F2同族投影/实到70；F35/37/39/43/44/46女王投影65/66/67/70/82/82对实际82；第二boss无投影','保留当时状态条件，不倒造缺失第二场/逐节点估值'),
('休息模拟','九次32/32/32/88/72/128/208/224/160样本均<300，无胜率/赢样本损/轮数','无估值字段不补造时钟或输出安全线'),
('药水事实','独立取得13、显式17使用加被动精灵1、弃0、末空，五读档恢复同瓶','只事实、不进新用药建议或新增药水证据')]
lines += ['| '+' | '.join(x)+' |' for x in topics]
lines += ['', '死亡率分母为房，独立局单列；活场净损中位排除实死、含回复负值。A0—A9所有血档/节点格与第54节一致，完整分进阶非空格与逐房损值在audit.json。A10全部非空格：','', '| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','源节点以入血关联下一更高层第一战，多源可指同战；不当节点的因果死亡率。A10全部非空格：','', '| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','按进阶分开的独立局/战斗/营火/真正重打：','', '| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 重打场/尝试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for r,sl in zip(rests,sls):
 f=[x for x in A['fights'] if x['asc']==r['asc']];lines.append(f'| A{r["asc"]} | {r["runs"]} | {len(f)}/{sum(x["death"] for x in f)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {sl["fights"]}/{sl["attempts"]}/{sl["wins"]} |')
lines += ['',f'- 真正重打全历史{sum(x["fights"] for x in sls)}场/{sum(x["attempts"] for x in sls)}尝试/{sum(x["wins"] for x in sls)}赢；新增实验体1场6次0赢。第54节该句残留未展开的模板表达式，此处按各进阶行复算旧62场279次19赢→新63场285次19赢，不把模板当原有数字。',
'- 低血不同节点观察：MGA0CZDDKC0P A10 F7 REST22→43后Monster损17活；4D4J8USKCPAV A10 F13 REST1→22后Monster损1活；D4LJ9QMGFB8Q A10 F21 EVENT13不变后Monster死；BVF22RSFVBS9 A10 F21/22 EVENT21不变后F23死；新ZVYUL2YP3518 A10低血F9走廊13→7活后F11事件到16、F12羽毛到28再锻造，F24低血战靠复活存活。敌/构筑/回复不同，只观察，不推低血选某节点必优。','', '### 经验库自己带偏或写了没被执行的地方','',
'- 实际大脑均Codex、DeepSeek0；没有直接引用经验id反向执行的原话，不倒算本次经验对已结束局生效。',
'- F18路线原话“额外能量助毒与防御，三营火可续燃”（14:44:22.322Z）；F34“钗稳住启动，双商店三营火补强，仅打一精英。”（15:03:34.132Z）。两次添火与钗确实兑现，但避精英的二幕仍问号战56→4、复活，前场满血女王过关后仍50血后场六败；未走原路线不判必然错。',
'- F38取触媒/15:07:47.933Z及F45第二毒雾/净化/15:16:23.078Z的理由中文释义为毒放大、加强双boss毒成长与长战抽牌一致性。F48复审/15:19:23.778Z明确输出缺口“未知而非零”。毒雾/触媒已建且实际触发，第二段仍124血，不能把已建立倒算足额整战输出；无替构筑受控赢例。',
'- 末试T5原Jev选生存者；护栏要换打击，但日志又写“SL explore … playing 生存者 instead of 打击”（中文：探索改回生存者），随后选择弃打击、清第一段且零损。护栏原答与最终实打分账，不称本次省9血。F8原先制/毒药+/毒雾题面25损10伤换为毒药+/尖啸/毒雾19损8伤，实际替代全轮19损8伤；整战仍损57。全局四护栏说明、三次改变下一步、一次被SL撤回；没有原线整战代价或重复可避错误的证据。','', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[
('力/敏与技能激怒','力逐击、敏逐挡牌，技能加敌激怒层数力量而能力不加；毒结束阶段可取消本轮攻击，但尚未结算不预支','silent-strength-weak-observation'),
('步法常驻敏捷','普通/升级建2/3，基础挡加敏后逐牌修正，已有挡不补，玩家能力跨敌阶段留','silent-footwork-block'),
('毒药施毒','普通/升级5/7毒先增层不扣血，结算与技能副作用/制品/剩血分核','silent-deadly-poison-application'),
('毒雾补毒','普通/升级2/3层等轮初补；触媒每触发减1，新阶段旧毒清但能力留','silent-noxious-fumes-growth'),
('触媒重复触发','k层至多k+1次逐次减1，不乘层、不施初毒；19+18潜力37截清29，新毒另算','silent-accelerant-triggers'),
('实验体阶段/SL','先111、再212、后313按A10；六次都仅过首段，技能激怒/阶段重置/多击增长分核','silent-test-subject-phase-reset'),
('临时减力','普通尖啸−6作用于每击，四击少24；次轮恢复、五击威胁独立核','silent-piercing-wail-temporary-strength'),
('预判临时敏捷','普通/升级2/4，次轮撤临时部分；步法常驻及牌挡另计','silent-anticipate-temporary-dexterity'),
('精准逐刀','普通/升级4/6加每刀实打攻击，力量/目标减伤/剩血和消耗伤另核','silent-accuracy-shiv-scaling'),
('遗忘之魂消耗伤','单敌消耗步额外1，三刀额外3；尖啸/羽化的伤不归攻击牌本体','silent-forgotten-soul-exhaust-damage'),
('刀扇/手牌容量','建立群伤，生成4/5受容量；本局实伤只有单敌，不外推多敌总伤','silent-fan-of-knives-capacity'),
('音叉技能计数','9→10额外7，与偏折8分开；不跨轮预支未触发被动挡','silent-tuning-fork-skill-block'),
('钗与锚底挡','钗轮初7，锚仅首轮10；敏捷不加到这两项，后轮只起7','silent-sai-start-block'),
('石头开场敏捷','持有后首帧1敏，收益须后续挡牌兑现，不归步法后加敏于遗物','silent-smooth-stone-opening-dexterity'),
('羽毛营火回复','到火min(缺血,3×floor(牌组/5))，本局8次124与休息108分开，无为回血加牌因果','silent-eternal-feather-rest-arrival-heal'),
('蜡烛充能/能量','正充能轮初额外1能；添火+5，正1→6本局首次补证，休息/锻造不续火','silent-pumpkin-candle-charge-energy'),
('同族观察','毒/牌挡/血池核实际结算，首试赢与SL胜分开，无统一先杀因果','silent-kin-poison-sl-observation'),
('女王观察','两种杀序历史均有赢例，爪牙死不关本体成长；前场实损与后场血量重核','silent-queen-poison-main-target'),
('构筑兑现观察','持有/建立/触发/足额输出分开，敌换阶段清毒改变当期伤害，非单组件整战胜因','silent-deck-burst-observation')]
for name,reason,id in mechanisms:
 e=es[id];counter=dict(collections.Counter(R[r]['ascension'] for r in e['evidence']));asc='、'.join(f'A{a}:{n}局' for a,n in sorted(counter.items()));case=e['lesson'].split(RUN)[-1] if RUN in e['lesson'] else '见本节对应主题/构筑案例'
 lines.append('| '+' | '.join([name,reason,f'{e["n_support"]}/{e["n_contradict"]}；{asc}',RUN+' A10 '+case,id])+' |')
lines += ['','- 完整12位支持/反例名单在experience.json及mechanism-entries.json，进阶为支持局所在进阶；综合n不表示每个子公式均由每局独立验证，更不表示受控整战胜因。全67局日志重抽、219段历史机制复盘落盘，八张牌既有+新支持局均有实际施放；净化/生存者的pending通过后帧确认。四类被动/回复与卡牌分别验证；药水只作事实、无用药规则。','', '### 新增','','- 无。同事项并入原牌/遗物/敌人/综合条目，不复制单局条目。','', '### 更新','', '| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for x in C['details']:lines.append(f'| {x["id"]} | {x["before_n"]}→{x["after_n"]} | {x["before_chars"]}→{x["after_chars"]} | 新局非药水补证、当前数字/案例压短 |')
lines += ['','- 5条开工压缩及原文在compression.json。女王旧四个首试赢例加新局后为五个首试赢例；同族为5场21尝试2赢，真正重打4场20次1赢，原三场18次0赢文字压缩时补上旧S9获胜统计。刀扇支持9局实施20次；甲虫/石虫未为仅遭遇的新局盲补机制证据。','', '### 退役','','- 无。没有相反结论多于支持；真实机制条目不因代码实现就当作纯bug退役。','', '### 和手写知识及代码冲突','','- 静默其余六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均为生成数据，无手写攻略需改/删，不新建。来源元数据及blob在本批other-knowledge.json；生成截止点不同不当内容反例，room-costs是MAP→下一MAP、TD1同房重启分段，本文首COMBAT→最终结算一房。monster-records旧1041与本文旧1040的差异沿前节同房口径，不覆盖刷新数据。fight-value及gates仍仅历史2局，outcome-stats明确观察。',
'- common实验体A10首111/二212/三313、第二段基础11每击与本局一致；common跨角色事实不计静默支持局。源码不改，已有技能激怒/牌面/临时减力/阶段模型不作为本次修复。无本角色手写知识冲突需改；铁甲行为与知识保持。','', '### 代码问题（不给 DS）','','- 本局新纯bug为空。F8护栏同线19损/8伤、末T5毒清段0损29扣、least-loss−15=13−28均核对；末T7方案dmg19对整轮23差4尚未定因，T8三刀题27对三刀行动27相同，含后毒才36，统计范围不混。合规护栏/SL探索不冒作纯bug或新repeat。',
'- 纯抽数初稿StopIteration来自completed过滤丢了pending选择牌，后稳定帧确认两牌；原初稿/日志保留，不是生产代码失败，不给DS。F24的0血过渡后精灵回复不是实死；F49五次末轮未派发不补结算。',
'- 未记录：原方案/替路线/替构筑/替休息的受控整战代价，三虫末两目标退场独立先后，SL/护栏/重抽后实际完整最优线执行比例，完整逐节点及第二boss血量投影、时钟每轮需/估/可活轮/实打估值比、Jev缓存命中；不补造。','', '### 测试','',
f'- 源定稿bash agent/tools/test-sandbox.sh：tsc0、vitest{t["files"]}文件/{t["cases"]}用例/退出0，固定数据、nice19、固定排除名单保持。初轮同样通过；复核女王“旧四首试赢”应为“新五首试赢”后最终完整重跑通过，非超时或失败重跑；两次原日志都保留。合后自测见本节收尾，完整沙箱外套件交调度器。',
f'- JSON合法、预算/12位局号/角色/n/置信度/范围/旧药水分句/旧基线校验通过；git diff --check、gitleaks0。源{commit}只改静默experience.json，英文提交写版本/增0改21退0、Co-Authored-By。',
'- 账本仅learner/ledger.py update/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖21经验条目；新增/退役无，check0。既有首证/先验/claim/旧version/repeat保持，不写accepted/shipped，交运维确认实际合入后登记；主目录本节/账本只追加不提交。','', '### 切片大小','','- 固定种子20260929，截至本局最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对，按state.run.character_id=SILENT过滤。官方knowledge-slice.ts、CHARACTER=silent/setExperienceForTests，只变experience，其他知识/结果表固定；sample-manifest、改前/后原输出均落盘，不当V4全部知识前缀大小。','', '| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"].removeprefix("sample-")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta"]} |')
lines += ['',f'- 240配对增量中位{S["median_delta"]}，单片最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active126→126、55756→56138字，高58中41低27；A8 119条52862字、A9 120条53161字、A10 121条53741字。需要Roy定：无。']
text='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(text)
assert title not in (ROOT/'paper/materials/experience-changelog-silent.md').read_text()
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a') as f:f.write('\n'+text)
print('已追加单节',title,len(text),'字')
