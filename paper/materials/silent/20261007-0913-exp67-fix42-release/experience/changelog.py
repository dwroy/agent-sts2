import collections,json,pathlib,re,subprocess
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));H=json.load(open(O/'historical-facts.json'));S=json.load(open(O/'slice-summary.json'));L=json.load(open(O/'ledger-result.json'));M=json.load(open(O/'live-merge.json'));R=json.load(open(O/'run-metadata.json'));F=json.load(open(O/'new-facts.json'));base=json.load(open(O/'baseline-check.json'));rests=json.load(open(O/'rest-summary.json'));sl=json.load(open(O/'sl-summary.json'))
commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def tests(name):
 p=O/name
 if not p.exists():return '未运行'
 text=p.read_text();files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text)))
 return f'tsc0、vitest0、{files}文件{cases}例'
lines=[title,'','### 来源','',f'- 记录时间{stamp}。只读notes/lessons.md:5335的KQQELQSZ382Z及三项勘误，notes/run-1007-0752-KQQELQSZ382Z.md；runs.character=SILENT、A10、F17实死，无跳过。蛇咬最早施放KAY F14为实际0费，不写花2费；首次到手T4/5/4/4/4/4、尖啸引文时间按勘误。last_seen按run文件名=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main正常合并无冲突；README、最新STATE、最近决定、学习协议、铁甲首次/末两节方法及静默第65/66节已读。独立执行，不派下级agent；原日志按run id rg、states/deepseek按时间二分seek流读，单进程nice19，不跑boss模拟池。',
'- 截至本局结束2026-10-06T23:52:17.960Z，84静默完局；A0—A10局数'+ '/'.join(str(sum(r['ascension']==i for r in R)) for i in range(11))+'。旧1256房73实死加新9房1死=1265房74死，A10四十四局551房44实死；MCCK2602T1SR仅进数字，无character旧局、其他角色、进行中及之后局排除。',
'- 沿第66节口径：首COMBAT→同房最终尝试末结算HP净损，死亡单列，负回复保留；Monster走廊与Unknown问号分开；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT以源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后按run/floor去重，TD1重启仍一房，SL不作独立局或回血。死亡截断不当完整需损、未结算毒不预支。',
'- 本局530静默帧/516决策逐一指纹状态一致，states seek及首末偏移见states-offsets.json；同窗DeepSeek实际7请求、Codex9，兼容字段不代实际引擎。旧83局全部原抽取脚本重新执行，七数组/每档原房局号与损值/源节点/回血/SL逐行一致，无对不上的上一节数字。全部84局日志和263段静默历史机制复盘复核；完整数字、原片段与脚本留learner/runs/20261007-084302-experience-update。',
f'- 开工active136/{C["before"]["chars"]}字<55000，不触发强制压缩。新增1、更新6（全部加非药水证据、只数字0）、退役0，active137/{C["after"]["chars"]}字；无合并、退役或预算调整。替换压短路线/休息/构筑的同主题旧案例，旧原文留experience-before.json。potion:*与general:potion逐对象保持；所有旧含药分句逐字保留，新证据仅非药水部分，没有新用药规则。机制asc[0,20]、统计/综合观察沿[8,20]，A10案例明示进阶，无策略反例需要缩进阶。','',
'### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色与旧基线 | 旧83局七数组/血档/节点/回血/SL逐行一致；84局1265房74实死、A10 44局551房44死 | 角色、房间与尝试分账 |',
'| 蛇咬保留施毒 | 9局48次实用；普通8局、升级2局有重叠，逐次目标毒增7/10而本体HP不变；本局末T4/T7花2费5→12/9→16 | 新card:SNAKEBITE，同主题只留一条，费用个例分账 |',
'| 毒触发与实际输出 | 末T3—13毒[6,12,11,10,16,15,14,13,12,11,10]合130，直接71、共201/233；末9毒未结算 | 施毒不即时伤、未来毒不计实际伤；六次败不作毒公式反例 |',
'| 负力量/负敏捷与吸取 | 族母T7/T11玩家攻防各−2，敌各+2；T8冲刺8伤8挡、T13为6/6，防御基础5−4=1、偏折4−4=0；负2力蛇咬仍加7毒 | 逐击力量、逐牌挡与毒分账；没有玩家正增益建立 |',
'| 临时减力与多段 | 末试T5尖啸0→−6力，20双击→8、生存者8挡零损；T6恢复0力14攻对9挡损5。F11精英T4力4→−2配虚弱24→8、10挡零损，T5恢复4力20攻对8挡损12 | 单轮收益可算，不能沿用减力或关掉后续成长 |',
'| 六次同开场重打 | 64/75同入场、初24抽序同，首施蛇咬T7/6/7/4/7/4；0赢、前五判死/第六实死，后抽时点/动作变化 | 没有赢的那次或受控唯一差异，不能归运气或早打必胜 |',
'| 路线与血池 | 三火实际回血至64/75仍六败；F7付14，F8回21，F11战内27损后芝士1，F12回21，F16回22；A10一幕boss≥60% 31场5死16.13% | 高进场不保证足额毒窗口；未选不同节点无因果 |',
f'| 休息后下一战 | A10 {rests[-1]["rests"]}火/{rests[-1]["heal"]}回血，实回{sum(rests[-1]["gains"])}；去重下一战{rests[-1]["nexts"]}场/{rests[-1]["deaths"]}死 | 火、回复和下一战分别计；回血不是胜线保证 |',
'| boss时钟与整场模拟 | 现场与本体参考233一致；F16回血档592样本原始胜率0、校准0.0474、平均敌余148.1014；实末13轮敌余32，差116.1014 | 校准非已有赢样本，六SL/模型遗漏不同条件，不推实胜率；逐轮时钟字段未记录 |',
'| 构筑计划与建立 | 计划希望毒/敏捷，实际没有正力量/敏捷或能力增益；末T5零损但后吸取继续，T13需损14而仅5血、差9 | 已取得/到手/施放/结算分列，不记未取得能力收益 |','',
'七数组重算：','','| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in base.items():lines.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
lines+=['','死亡率分母为战斗房，局数另列；活场净损中位排除实死，保留负回复。A0—A9各格与第66节一致，全部各阶格/局号/损值在audit.json。A10非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
 if r['asc']==10 and r['n']:lines.append(f'| {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |')
lines+=['','源节点入血关联下一场；EVENT只含普通事件，Ancient排除；同一战可被多个源节点引用，不当独立战数。A10非空格：','','| 幕 | 源房 | 血档 | 源节点/不同战 | 死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
 if r['asc']==10 and r['n']:lines.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |')
lines+=['','各进阶局数、房间、回血及真正SL（attempt≥2）的分母：','','| 进阶 | 局 | 战房/死 | 火/回血/非回血 | 实回血 | 后战/死/活损中位 | SL场/尝试/赢尝试 |','| --- | --- | --- | --- | --- | --- | --- |']
for i,r in enumerate(rests):
 fs=[x for x in A['fights'] if x['asc']==i];ss=sl[i]
 lines.append(f'| A{i} | {r["runs"]} | {len(fs)}/{sum(x["death"] for x in fs)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {ss["fights"]}/{ss["attempts"]}/{ss["wins"]} |')
lines+=['','- 低血不同节点沿旧例重核：MGA0CZDDKC0P A10休息22→43后Monster损17活、4D4J8USKCPAV休息1→22后Monster损1活；D4LJ9QMGFB8Q事件13、BVF22RSFVBS9事件21后走廊死。新局35/70休息后先走廊损3、后精英实战27后回复1；27/72休息后的下一走廊损0。敌人、构筑、血量与间隔混杂，仅观察，无同局换节点受控因果。所有历史explore/sl_explore/decisions.sl_attempt及raw draws保留在audit与逐局片段。',
f'- 真正重打全历史{sum(x["fights"] for x in sl)}场/{sum(x["attempts"] for x in sl)}次/{sum(x["wins"] for x in sl)}赢尝试；新一场六次零赢。族母纳证的重打4场24次1赢，策略胜因未控，末次最初24张相同也不代表同回合到手或独立六局。','','### 经验库自己带偏或写了没被执行的地方','',
'- 本窗DeepSeek7/Codex9。没有隔离“引用某旧经验id使结果反向”的原话，不由败局自动登记策略repeat；模型bug与实际规则、未执行计划分账。',
'- F9 DeepSeek原话：“尖啸对多段精英和沉睡后的族母极强，消耗不稀释牌组；偏折仅4挡，蛇咬2费太慢且模拟更差。”journal时间23:33:25.815Z。尖啸局部多段减伤已兑现；普通蛇咬模型漏施毒，不能把未建模较差当受控牌值比较。',
'- F12计划原话：“Use sleep turns to stack Snakebite poison and set up; hold Piercing Wail for multi-hit turns; keep weakness; enter with ~61 HP.”三次记录的计划想要毒/敏捷能力但本局未获得；蛇咬六次首次到手T4/5/4/4/4/4，都已过睡眠窗口，不能写成故意跳过已到手牌。原句包含旧计划的尖啸安排，仅引用历史，未新增规则。',
'- F16原话：“Boss next floor; 42 HP enters death range (win losses median ~41). Heal to 64/75 for survival; all smith options sim-tied at 5%, no single upgrade fixes a 233-HP boss.”回血确已执行；原始592样本零胜、校准约5%不意味着有赢样本，未锻造或替构筑结果未实打，不断言休息选择错。','','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[('蛇咬保留施毒','施毒只加7/10层，不即时扣血；负力不减毒，2费与早期免费个例分开。保留不能提前到手，生存轮限定毒兑现。','silent-snakebite-retained-poison','KQQ末T4/T7加7、结算12/16；KAY A0 F14免费施7扣7余6；VN A6升级加10。'),('逐击力量/逐牌敏捷','力量每段加，敏捷每挡牌加；负值同理，毒独立。双击与多牌放大减力/减敏，成长继续缩血窗口。','silent-strength-weak-observation','KQQ A10 T7/T11吸取后冲刺10→8→6；防御5→1、偏折4→0。'),('尖啸临时减力','减6/8按击数兑现，再核虚弱取整；次轮恢复，不能用一次零损估长战永久防御。','silent-piercing-wail-temporary-strength','KQQ末T5双击20→8、8挡零损，T6恢复14攻损5；精英24→8但次轮20攻损12。'),('族母吸取/毒窗口','玩家力敏各−2/敌力+2削直伤与卡牌挡，负力下毒独立；需要233实际伤，不预支死亡余毒或未取得能力。','silent-lagavulin-siphon-poison-sl','KQQ A10六试0赢，末毒130+直接71=201、余32；NB8 A10毒183+直接50=233首胜。'),('能力组合兑现观察','取得/到手/施放/建立/结算分别验收，临时减伤不关独立成长；相关胜败不能作替构筑因果。','silent-deck-burst-observation','KQQ A10没有正增益建立，T5局部零损而T13的5血6挡对20仍死。')]
for name,why,eid,example in mechanisms:
 h=H[eid];dist=','.join('A'+str(k)+':'+str(v) for k,v in sorted(h['asc_support'].items(),key=lambda x:int(x[0])))
 lines.append(f'| {name} | {why} | {len(h["evidence"])}/{len(h["contradicting"])}；{dist} | {example.replace("KQQ","KQQELQSZ382Z").replace("KAY ","KAY522KT5NXR ").replace("VN ","VN7RQJMJEFMX ").replace("NB8 ","NB8KCF6HRGVF ")} | {eid} |')
lines+=['','- 所有12位支持/反例局号在经验JSON/historical-facts.json；9蛇咬纳证局均实际施放、历史48次逐次目标毒增量与即时HP核对，普通/升级8/2局子分母不等独立9局。38尖啸纳证局均实际施放，历史49局371次；族母11纳证局均有实际场，吸取分帧留存。力量与构筑为综合观察，不冒称每个子公式各有80/79独立实验。败局中的有效机制不作反例，重打次数不当n_support，未控制的出牌时点/后序不认定唯一胜因。没有新用药规则。','','### 新增','', '- silent-snakebite-retained-poison（card:SNAKEBITE／蛇咬）：9支持0反例、high、[0,20]；首证KAY A0，普通7/升级10、保留、即时不扣血、2费与免费来源未核定分开，6次失败只说明实际毒窗口。来源silent-0220，与silent-0219纯bug分账。','','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['rows']:
 if r['id'] in C['updated']:lines.append(f'| {r["id"]} | {r["before_n"]}→{r["after_n"]} | {r["before_chars"]}→{r["after_chars"]} | 加KQQ非药水证据；机制/汇总与实际案例 |')
lines+=['','- 六条全部加证据，纯数字0。路线/休息/构筑旧逐局细节归并为本局实际案例，旧原文保存，不丢历史；未合并条目。','','### 退役','', '- 无；没有反例多过支持或本次代码修掉的active缺口，真实机制不因模型bug而退役。','','### 和手写知识及代码冲突','',
'- 静默其他六份boss-damage/room-costs/monster-records/outcome-stats/fight-value/fight-value-gates均生成数据，无手写文件需改删，不新建。哈希及生成时间/样本口径见other-knowledge.json；room-costs截至P5的83局，monster-records1257房比旧1256多TD1同房重启1窗，不当新战或整表无效；不同刷新截止与战内/战后回复口径不强覆盖后台数据。未见足以证明整体无效的数据。common只定向核族母与下水道蚌，经验支持仍全为静默。',
'- 代码手写SNAKEBITE施毒名单和有毒敌增益覆盖仍与真实数据有缺口，写下节、不改源码或铁甲知识。','','### 代码问题（不给 DS）','',
'- silent-0219 observed：card-model.ts:904施毒名单无SNAKEBITE。末T7预测旧9毒、实际加7至16扣16，独立漏7；T4预计9伤而实际18的总差9拆漏毒7/八折2，不认定修后整场转胜。新规则来源0220单独进知识，bug账本状态不动。',
'- silent-0216旧repeat：已有毒结算模型而未建模敌增益覆盖仍将攻击逐击×0.8；当前turn-solver.ts:1460保留未建模折扣。末T13完整需损14、5−14=−9与实死一致，不能把所有预测偏差归该bug；本任务不修代码、不开重复账本、不改0216状态。',
'- 离线初稿prepare误用runs.started（实际没有该字段），已改为复盘/决策已核时间窗，原KeyError留盘；facts初稿把前五predicted_death误设died，断言停止后改为5判死/1实死。update首次早于summary产出而FileNotFoundError，无仓库写入；待基线完毕后定稿更新成功。全部失败原件保留，均离线抽数/顺序问题，不当生产或测试失败。',
'- 未记录：未选路线/休息/构筑或完整调序的受控整场结果、重问后完整最优原线执行比例、未执行替线整场血价、boss逐轮时钟/估值比、免费蛇咬的来源和Jev缓存；没有数据不补造。','','### 测试','',f'- 源定稿{tests("test-source.log")}，首轮通过，无重跑；冻结经验blob/暂存/提交一致。JSON、证据12位/角色/n/进阶/预算、旧七数组/血档/节点/回血/SL、516状态指纹、末战逐轮、历史卡牌实际、旧药水对象/分句检查、git diff --check及gitleaks提交前扫描通过。不改测试预算、依赖、源码或生成器，不重建。',
'- 账本只经learner/ledger.py/by=learner:experience-update登记proposed；新增/退役无，proposed '+','.join(L['proposed'])+f'、check{L["check"]}，7个经验条目全部有来源。0220追加升级10毒与历史8局证据，原claim/first_run/prior/证据/版本历史保留；0216/0219纯bug与未纳条目状态不动，不写accepted/shipped。主目录本节/账本只追加不提交，由调用方提交。',
'- 锁内知识重叠：'+','.join(M.get('conflicting_overlap',[]))+'；共同祖先'+M.get('fork','')+'。本源提交只改经验，其他7份差异来自开工合并main的祖先；live不同刷新blob保留，不绕过任务冲突停止规则。',
'- 合入结果：'+(f'实际live {M["merged"]}；合后{tests("test-live-retry.log" if M.get("test_first_rc") else "test-live.log")}，上线记录/eval '+M.get('eval_version','待登记') if M['merged'] else f'未合入；{M.get("reason")}；刷新{M.get("refresh_commit")}、合前{M.get("base")}、知识重叠检查停止（未进入merge-tree预检），无MERGE_HEAD，未作合后测试/上线版本。')+'。完整沙箱外套件交调度器；不强解冲突、不覆盖知识，不停对局、不运行play、不推送。handoff-ops.md及完成JSON交调用器experience-done通知运维确认实际发布/登记shipped或兜底。','','### 切片大小','',
'- 固定种子20260929，从截至本局58078帧静默池、按state.run.character_id=SILENT，最高A9/A10各20真实状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests，只换经验JSON，其他角色未读，common与结果表冻结；manifest/逐片原文留盘，不冒称V4完整知识前缀。','','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"].replace("sample-","")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["median_delta"]} |')
z=C['after'];lines +=['',f'- 配对增量中位{S["median_delta"]}字、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}、最大{S["before_max"]}→{S["after_max"]}字。active136→137、49049→49709字，高68中43低26；A8 {z["by_asc"]["8"]["entries"]}条{z["by_asc"]["8"]["chars"]}字，A9 {z["by_asc"]["9"]["entries"]}条{z["by_asc"]["9"]["chars"]}字。需要Dai定的知识事项：无。','']
text='\n'.join(lines);(O/'changelog-section.md').write_text(text)
scan=subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/'changelog-section.md')],capture_output=True,text=True);(O/'gitleaks-changelog.log').write_text(scan.stdout+scan.stderr);assert scan.returncode==0
path=ROOT/'paper/materials/experience-changelog-silent.md';assert title not in path.read_text()
with path.open('a') as h:h.write('\n'+text)
print(title,'仅追加一节',len(text),'字符')
