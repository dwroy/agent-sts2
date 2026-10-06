import collections,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];RUN='VPW8YH7A4QFM';A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));S=json.load(open(O/'slice-summary.json'));L=json.load(open(O/'ledger-result.json'));rests=json.load(open(O/'rest-summary.json'));sls=json.load(open(O/'sl-summary.json'));R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))};E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']};title=(O/'changelog-title.txt').read_text().strip();commit=(O/'commit.txt').read_text().strip();stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
txt=(O/'test-source-final.log').read_text();files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',txt)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',txt)));assert (O/'test-source-final.rc').read_text().strip()=='0' and files and cases
lines=['## '+title,'','### 来源','',f'- 记录时间{stamp}。只读notes/lessons.md:5186的VPW8YH7A4QFM及01:01:00勘误、notes/run-1007-0019-VPW8YH7A4QFM.md。runs.character=SILENT、A10/F39败，无跳过；last_seen取run-1007文件名为2026-10-07，版本2026-10-07.2。',
'- exp-silent开工干净，git merge --no-edit main从7c37095a快进fa573292，无冲突。已读README、最新STATE、decision-log尾、学习协议、铁甲首次构建与末两节方法、静默第54/55节；其他角色只取格式，不移植知识。独立执行，无下级agent；nice19单进程抽数，不跑boss模拟池。',
'- 截至2026-10-06T16:19:04.288Z共68静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/28局；旧67局1059房57死＋新17房1死＝1076房58实死，A10二十八局362房28死。MCCK2602T1SR仅进数字；截止点后/进行中/缺character旧局不计。',
'- 全68局decisions/brain/run-plans/sl-attempts按12位局号rg分流；states/deepseek按时间二分seek流读并核state.run.character_id/run_id。新686决策、49原始大脑调用均Codex、8计划、2原始SL行（两场首试boss胜）、707状态，字节7932106706—7957370828；同窗DeepSeek0。deepseek_calls=49与ds_*为兼容字段，不当实际DeepSeek请求；开局3caa860b+dirty，不声称恢复dirty树。',
'- 旧67局七数组、全部血档/源节点/回血/SL逐行重算一致：fights1059→1076,nexts997→1013,rests478→485,cards24312→24652,ends6666→6765,attempts418→420,growth2347→2347。baseline-check.json/summarize.py留断言，无旧口径失配。',
'- 沿第55节：净损＝首COMBAT帧HP−同房最终尝试末结算HP，回复来源/负值/实死分列，Monster走廊与Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后战按run/floor去重，TD1同房重启合一房。',
'- 复盘操作首帧与本节首COMBAT口径的差异已查明：F28首70→43净损27，操作72→43损29（开场小血瓶＋2）；F35首68→38净损30，操作70→38损32（小血瓶＋2）；F38首80→47净损33，操作78→47损31；F39首47→0净损47，操作45→0损45（后两场王室猛毒＋小血瓶组合各−2）。完整血池汇总用原首帧，不静默切换到操作帧。',
'- 按勘误利齿之眼ID=EYE_WITH_TEETH，不能用CHOMPS。F14首稳定帧只有雾菇，后续两次出现6血利齿之眼；需78/49/29/19、扣35/20/16/19合90、新增6+6，损0/1/0/0，不造缺失。',
'- 开工126 active/56138字>55000；27条n=1/low均为独立scope事项，无同scope重复可并。先压巨兽/冒泡/沙漏/收场4条旧例1160字至54978；原文、压后文和数字留experience-before.json/compression.json。本批新增1、更新14（11補证、0只数字、3仅压缩）、退役0，active127/56154字，高59中40低28，60000预算保持。',
'- potion:*与general:potion完全不动，其他旧含“药”分句逐字断言保留；新证据仅非药水部分，不新增/加强喝药规则。机制[0,20]、路线/休息/构筑[8,20]保持；本局未得步法、不为步法补证。',
'- 脚本/重新抽的原始分流/完整数字/221段历史机制复盘/前后切片全部留learner/runs/20261007-010232-experience-update。抽数初稿把原始powers列表当审计字典、另把首行动同戳前帧误设为严格早于动作，原脚本与失败日志保留，修为分别识别列表/字典与同戳行动前状态；不改变生产代码或统计口径。','', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
topics=[
('角色/基线','旧67局全部七数组/血档/节点/回血/SL一致；新17房1死','只合静默，房和尝试分账'),
('力/敏/敌成长','死亡战无玩家力/永久敏；电击2→4力令17→19，预判2敏脆弱下防御3→5','力逐击、敏逐牌；被动挡不归敏捷'),
('余像','F39 T4建立0挡、后五牌各1＋斗篷4＝9；T5五触发5＋生存者6＝11，对25损14','被动/卡牌分核，真实触发非整场保证'),
('触媒/本体输出','T3电击8血4毒、触媒2截清8并取消19攻击；本体119→116仅流星锤3','当前爪牙斩杀与本体成长分别验收'),
('尖啸','T4两张各−6、三敌12/13/17→0/1/5，合42→6；9挡零损，次轮负力恢复','当轮36减伤非永久关攻'),
('预判','T6实建2敏/2临时层；已有3→4为余像1，防御4→10＝5牌挡＋1余像','敏仅多2牌挡；整轮5余像＋5防御不足5血对21'),
('爆发','T3普通1层、后空翻重放5+5使5→15，层清、重抽重问','已重复与未继续的原线分账'),
('毒雾/未建组件','墨影T1建3、十一轮胜；F39毒雾+/神化/毒性爆发/2力2敏模板全战未施放','旧战输出和持有不预支新战能力'),
('王室猛毒组合','一局两场、67旧局无该遗物；F38出牌前80→78、F39的47→45','仅组合净−2观察，缺独立结算/顺序不拆公式'),
('收场条件','F39 T1抽堆33、牌面60而playable=false，0抽牌/0伤；原ZZMY空堆56斩36、8CF非空0伤、SAD过牌仍非空','空堆条件保持，构筑/评分纯bug分开'),
('召唤/终轮','本体六轮扣36/0/3/11/0/0合50、余105；T3原电击清后T4新22血；T6毒杀/同ID召唤无中间帧','新增血不当负伤，末轮完整全敌实伤未知不倒算'),
('构筑','终40张五打击四防御/贪婪/进阶之灾、3升级，无步法；三牌能力未打','取得/建立/足额输出分账，牌数非单独败因'),
('路线','F32回满后蟹损57、三幕活盾/炮操作损32、茶回42后雕刻师操作损31、下场阵亡','避精英/未来双火不保证到火前安全，无替线因果'),
('营火','七火五回血39/39/33/39/37合187、两锻造；A10 173火110回血2635、去重后战103/16死','回复已兑现与后战关联分开，16/103=15.53%非回血因果'),
('低血不同节点','MGA A10 F7 REST22→43后Monster损17活；4D4 A10 F13 REST1→22后损1活；D4L A10 EVENT13后走廊死；BVF EVENT21后走廊死','敌/构筑/回复不同，只观察，不定安全线或必优节点'),
('SL对照','新局无读档；两boss首试赢；全历史真正重打63场285次19赢，A10 30场144次7赢','本局不增重打分母/自然对照或单项胜因'),
('墨影/蟹','F17首79→59十一轮扣183；F33首80→23十轮扣428','首试过关不归单牌受控胜因'),
('千足虫复活','F25初需146、总扣271，T4/6/7/8/9各新增25；80→31十一轮','初始146不能充当全战需伤'),
('模拟对实打','蟹T1 plan1有70样本、损中位41/T9，实损57/T10，损比1.39/轮比1.11','多16血/1轮观察，不替代未记录的逐轮时钟或当纯bug'),
('路线投影','F8/13/16投影墨影70/80/79，对实79为−9/+1/0；蟹投影80实80；女王投影1/76但未到','当时条件/未到分账，不补造女王实到'),
('护栏/最优线','护栏0替换；rollout真96/假1/null3，有效96/97=98.97%；末战6真1null，有效6/6','null不当最好，重抽后未走原线不算完整执行'),
('药水事实','独立取得14/显式使用14/弃0/末空','只事实，不加药水条目证据或用药规则'),
('旧条压缩','巨兽16/冒泡12/沙漏10支持局、证据与范围均不变','仅压重复叙述，完整旧数/原文归档')]
lines += ['| '+' | '.join(x)+' |' for x in topics]
lines+=['','死亡率分母为房，独立局另列，活场净损中位排除实死并保留回复负值。A0—A9血档/源节点与第55节逐行不变，完整分进阶非空格、所有局号/损值在audit.json；本次A10全部非空格：','', '| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','源界面按入血关联下一更高层第一战，多源可指同战，不当节点的因果死亡率；A10非空格：','', '| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','按进阶单列局数/房/营火/真正重打；A10非回血63＝60锻造＋三添火，A8帐篷一火可多动作：','', '| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 重打场/尝试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for r,s in zip(rests,sls):
 fs=[x for x in A['fights'] if x['asc']==r['asc']];lines.append(f'| A{r["asc"]} | {r["runs"]} | {len(fs)}/{sum(x["death"] for x in fs)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','### 经验库自己带偏或写了没被执行的地方','',
'- 实际大脑49次Codex、DeepSeek0；没有直接引用经验id反向执行的原话，不倒算本次版本对已结束局生效，复盘先验保持开局S1.exp53。',
'- F25收场理由原话“Grand Finale substantially improves paired boss simulations; three Backflips, Escape Plan, and Burst provide draw control to enable its payoff.”（16:02:53.262Z；中文：配对模拟改善、三后空翻/逃脱计划/爆发提供过牌控制）。F39实际33张抽堆、收场不可打/0伤，已有空堆机制条目未保证实际窗口；没有不取/删牌的受控整战，不登记策略repeat。',
'- F34原话“神化强化全牌；避精英，双营火保命。”（16:13:21.047Z）。神化进入牌组但死亡战未施放，避精英仍两走廊后死、下一火未到，不把规划当已兑现防御。',
'- F37原话“Full healing protects the three-fight stretch before resting; Blood Vial and Royal Pillow help offset Royal Venom’s recurring cost.”（16:16:17.632Z；中文：回满认为能支撑火前三战、血瓶/枕头抵持续成本）。实际茶回42、两开场净损4、第二战死，无独立遗物结算/替路线实打，既不否定实际回血也不承诺三场安全。',
'- T3原话“Jev chose plan 2/2 (触媒+) with confidence 0.82; code rank 2”（16:18:09.493Z）；题面8/8赢未兑现，但电击毒杀/零损真实，本体余105，不把模拟保证当现实。前题原线含两次后空翻，实重放一次技能已得10挡，重抽重问后未走的第二次不补算；HP护栏0次，无其代价。','', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[
('力/敏/敌成长','力逐击、敏逐挡牌后逐牌修脆弱；被动余像不归敏，临时负力撤回后敌成长仍生效','silent-strength-weak-observation','F39 T4三敌42→6，T5电击2→4力、17→19；T6临时2敏只使防御3→5'),
('余像逐牌','建立本身0，后续每出牌1；脆弱只折牌挡，多牌触发真实，仍须对攻击总量','silent-afterimage-per-card-block','T4五触发5＋斗篷4＝9，T5五触发5＋生存者6＝11，对25损14'),
('触媒毒窗口','k层至多k+1次、每次减1/剩血截断；现有毒先结算杀爪牙取消攻击，不等本体已毒或永停召唤','silent-accelerant-triggers','T3电击8血4毒建2层截清8取消19攻击，15挡盖12；本体只扣3，T4新电击22'),
('尖啸临时减力','普通/升级6/8每击，双普通合12使三目标各12/13/17→0/1/5，36减伤仅当轮','silent-piercing-wail-temporary-strength','T4合42→6，9挡零损；T5负力撤回/电击成长'),
('预判临时敏捷','建2/4敏不补旧挡，须后续卡牌兑现；余像被动加挡分列，死亡无下轮不补恢复','silent-anticipate-temporary-dexterity','T6建2，防御脆弱3→5、实际4→10含余像1；末5血10挡对21差6'),
('爆发技能重放','普通下一技能额外一次，同轮次数消耗；每次基础挡实际累加，重抽重问后未执行原线另列','silent-burst-next-skills-replay','T3后空翻5+5使5→15、爆发1→0；再触媒毒杀电击零损'),
('毒雾启动','普通/升级建2/3后下玩家轮补毒；持有/未建、新战重新建均不预支','silent-noxious-fumes-growth','墨影T1实建3十一轮胜；组装师T4在手未打，全战无本能力'),
('收场空堆条件','零费不免空堆条件；基础60随力/目标改变，可打条件先于潜在群伤，过牌设想不是现窗口','silent-grand-finale-empty-draw','F39 T1抽堆33、牌面60不可打、0伤；ZZMYZ5UBCG72 A2空堆56斩36'),
('构筑/本体输出观察','取得/建立/触发/足额输出分核，召唤新增血不当倒算伤害；没有替牌/目标受控胜因','silent-deck-burst-observation','六轮本体36/0/3/11/0/0合50仍105，T3保血但未建毒雾等，40张不是单独败因'),
('王室猛毒＋小血瓶组合观察','仅前后帧确认逐场净−2；缺独立中间帧，不能推出各遗物数值/顺序或选择胜因','silent-royal-poison-blood-vial-opening-net','F38出牌前80→78，F39的47→45；两场一局，67旧局未持有')]
for name,reason,ident,case in mechanisms:
 e=E[ident];counter=collections.Counter(R[r]['ascension'] for r in e['evidence']);asc='、'.join(f'A{a}:{n}局' for a,n in sorted(counter.items()));lines.append('| '+' | '.join([name,reason,f'{e["n_support"]}/{e["n_contradict"]}；{asc}',RUN+' A10 '+case,ident])+' |')
lines+=['','- 完整12位支持/反例名单在experience.json和mechanism-entries.json，67旧局＋新局全量重抽；六张机制牌所有支持局均有实际施放断言，旧典型机制按历史复盘核对。综合n不是每个子公式均被每局独立验证，也不是受控整场胜因；失败但公式成立不是公式反例。无新用药规则。','', '### 新增','', '- silent-royal-poison-blood-vial-opening-net：relic:ROYAL_POISON／王室猛毒，[0,20]/low，1支持局、0反例，2开场组合净−2窗口；并入既有复盘观察账本silent-0198，first_run=本局/prior=unknown保持，不重复新增发现。','', '### 更新','', '| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for x in C['rows']:lines.append(f'| {x["id"]} | {x["before_n"]}→{x["after_n"]} | {x["before_chars"]}→{x["after_chars"]} | '+('本局非药水补证/机制与当前数字' if x['id'] in C['support'] else '仅压缩旧例，证据不变')+' |')
lines+=['','- 开工四条共节省1160字，原文/压后文/完整数字在compression.json；收场同时补证，另三条仅压缩。本批无同scope低置信合并。恢复构筑旧含“毒药”整分句，药水分句逐字断言通过；原拦截日志update-second.log保持。随补证把力量、触媒、尖啸、预判、毒雾文字中旧n同步为实际局数，不计成另一个数字条目。收场4局规则无反例按规则门槛转high。','', '### 退役','', '- 无。未有反例多于支持；真实已观察机制供构筑使用，与纯bug修复记录分开，不因已有模型实现就删规则。','', '### 和手写知识及代码冲突','',
'- 静默其余六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均为生成数据，无手写攻略需改/删，不新建。各blob/字段/来源在other-knowledge.json；room-costs为MAP→下一MAP与本文首COMBAT→末结算不同，生成截止点不同，不覆盖刷新数据；fight-value/gates仅旧历史样本，outcome-stats注明观察。',
'- common怪物数值与新日志核：组装师初155、蟹火箭209/碾碎219、墨影183、千足虫48/46/52；共有事实不当静默证据。华丽收场空堆机制文本已上线，但只读当前live选择评分入口selection.ts:205→card-model.ts:1492没有该条件；记代码冲突、留独立0197，不在本任务改源码或把它写成DS规则。铁甲知识/行为保持。','', '### 代码问题（不给 DS）','',
'- 新识别收场战内生成评分漏空堆条件：F39 T1“华丽收场 scores 60 vs 猎杀者 15”，实际抽33、生成牌不可打、0伤；既有收场机制条目不等评分入口已处理。更早Y6GM2CHWJBEY A0同类首证已由复盘登记silent-0197/prior=no，本批保留observed、不改队列/源码。没有改选猎杀者实打，不把15当实际少伤或承诺修复转胜。',
'- F39 T2题面20损对实22差2、T5整线dmg22对全敌38差16原因未核定，不新报确定bug；least-loss−6=5−11、实际归零仅扣5是截断。T6同ID戳刺毒杀/新召无中间帧，不补独立毒伤或全轮总伤。',
'- 抽数原powers列表/字典和同戳前帧断言初稿失败、update在机制断言未完成前拦截，以及旧含药分句拦截均保留原脚本/日志，修正后通过；不当生产代码失败。测试初轮提前启动读了压缩稿，原日志保留，随后在已固定定稿重跑，不以混合稿测试作提交凭据。',
'- 未记录：替路线/构筑/休息/目标的受控整战胜负、F39终轮个体毒/召唤内部顺序、两遗物独立结算、重抽后完整最优线执行率、女王实到/完整逐节点投影、boss时钟逐轮需/估/可活轮、Jev缓存命中；不补造。','', '### 测试','',
f'- 源定稿bash agent/tools/test-sandbox.sh：tsc0、vitest{files}文件/{cases}用例/退出0；nice19、固定数据/排除名单保持。初轮提前启动读压缩稿，已留test-source-initial.log/rc；定稿重跑通过，非超时失败重跑。合后固定沙箱见本节收尾，完整沙箱外套件交调度器。',
f'- JSON合法、12位局号/角色/n/范围/预算/药水分句/旧基线断言及git diff --check、gitleaks0。源{commit}仅静默experience.json，英文提交写版本/增1改14退0，带Co-Authored-By。',
'- 仅learner/ledger.py/by=learner:experience-update把'+','.join(L['proposed'])+'改proposed，覆盖15个经验条目；账本新增/退役无，check0。首证/先验/claim/旧版本/repeat保持，0198本局/unknown及0197 A0/no保持；不写accepted/shipped，交运维核实际合入后登记。主目录变更节/账本只追加不提交。','', '### 切片大小','',
'- 固定种子20260929，截至本局最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对，核state.run.character_id=SILENT。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只替换experience，其他知识/结果表固定；sample-manifest和前后输出归档，不当V4完整前缀大小。提前一次改后切片读压缩稿、结果另存compression-only；报告只用最终定稿配对。','', '| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"].removeprefix("sample-")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta"]} |')
lines+=['',f'- 240配对增量中位{S["median_delta"]}、单片最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}、最大{S["before_max"]}→{S["after_max"]}字。active126→127、56138→56154字，高59中40低28；A8 120条52878字、A9 121条53177字、A10 122条53757字。需要Dai定：无。']
text='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(text)
assert title not in (ROOT/'paper/materials/experience-changelog-silent.md').read_text()
subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/'changelog-section.md')],stdout=(O/'gitleaks-changelog.log').open('w'),stderr=subprocess.STDOUT,check=True)
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a') as f:f.write('\n'+text)
print('已追加单节',title,len(text),'字')
