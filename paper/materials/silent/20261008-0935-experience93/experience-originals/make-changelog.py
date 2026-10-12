import collections,json,statistics,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();N='ZTRGYYMLR8SC';U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries'];A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
source=sys.argv[1] if len(sys.argv)>1 else '待提交';stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title='## 2026-10-08 静默猎手 第九十三次增量：1 局 A10（version 2026-10-08.10，分支 exp-silent，'+source[:8]+'）'
L=[title,'']
def para(s):L.extend([s,''])
def section(s):para('### '+s)
def clean(s):return str(s).replace('|','/').replace('\n',' ')
def table(head,rows):
 L.append('| '+' | '.join(head)+' |');L.append('| '+' | '.join(['---']*len(head))+' |')
 L.extend('| '+' | '.join(clean(c) for c in r)+' |' for r in rows);L.append('')
section('来源')
para('- 记录时间'+stamp+'；根notes/lessons.md:5685起ZTRGYYMLR8SC A10/F17，标题第二项静默猎手，无勘误；唯一局报run-1008-0822-ZTRGYYMLR8SC.md。runs.jsonl:604的character=SILENT，未跳过。运行aa1e2136+dirty完整源码未留，不以当前树冒认。')
para('- exp开工干净，git merge --no-edit main无冲突快进f60e6668；已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法与最后两节、账本README。独立完成，不派下级；抽取/复算均nice19单进程，固定测试单worker。临时文件仅本批scratch，不联网、不安装依赖、不跑play或boss模拟池。')
para('- 按run id重抽594决策、16实际Codex脑、6 SL摘要、3计划及Jev原题；states按UTC窗seek再核run_id/character_id，共607帧。DeepSeek窗0，兼容ds_*不是DS回答。首末决策2026-10-07T23:44:59.858Z—2026-10-08T00:21:56.238Z，偏移/原文保留。')
para('- 全引擎学习观察截至2026-10-08T00:21:56.238Z共123静默完局，A0—A10局数7/3/2/1/4/1/11/7/1/3/83，1787房/113实死。排除其他角色、缺character旧局、进行中及切点后局，不代替纯Codex爬塔成绩。全部历史主题复盘按本角色抽取，原日志切片重新执行逐局分析；无未读复盘只进数字的新局。')
para('- 口径沿第92节：第一COMBAT入房HP减同房最终尝试退出HP；开场回复、负净损保留、实死单列。Monster走廊、Unknown问号战另列，训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除、多源可同战；回血后战去重，独立营火和动作数分列。')
para('- 旧122局七数组逐行、全部血档/节点转移/实回复/SL重算一致，无偏差。新局7房6胜1实死；boss前五判死截断不补未执行结算、不算五次实死或六局，整房首次68→末0损68。')
para('- 新增1、更新9（9条加证据、0条只改数字）、退役0；active168→169，正文51442→51016，high101/med43/low25。开工未超55000、不改60000预算。同scope机制并回原条目，重复案例压短，旧全文及全部证据/反例保留before/changes；未跨角色搬知识。')
section('对照数据检查的主题')
rows=[]
for c in C:
 e=c['after'];asc=dict(collections.Counter(R[n]['ascension'] for n in e['evidence']))
 rows.append([c['id'],f'支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{asc}；新证'+','.join(c['new_runs']),e['lesson']])
rows.extend([
['赢战资源链','F2/3/4/6/11/14净损13/7/0/5/20/6合51；三火各21合63；56−51+63=68','未来火堆不当现有血；F10才取餐券、此前两店不补回血；替路线未执行'],
['三次HP护栏','F11T3损25扣26→损20扣18；首bossT10局部损15扣12→损12扣3；末T13损2扣7→损0扣0，实4血/敌73不变；候选省10/少24傷','符合现行规则，boss两次容许差0；候选局部省血不累计成整场已得；原线整战反事实缺失'],
['同族六试','均68/70、铁心+瓶装潜能，前五T15/10/14/14/14判死，末T14实死；末T7/T9退两信徒，T7损19，14轮扣266/324余58','第2试目标/洗牌/喝药时点同变，不能定统一目标、单动作胜因或运气'],
['获药/饮药/SL恢复','独立取得7瓶/饮7瓶/弃0；动作17饮中10来自恢复原两瓶；五次SL净HP恢复66/64/66/66/62另计','恢复不是新获药或事件/战内回复；无晚喝铁心胜线，不改时点门槛'],
['末轮完整威胁','4血/6挡对13攻需损7，实际只扣剩4；严格存活差4、神官仍58','hpAfter−3不是只损3；未记录毛伤/未来毒不补，不报少算伤害bug'],
['预测与实际','F1固定投影boss70、实68；F16仅32样本不足300；时钟未校准；末前三轮扣75、14轮扣266','47是脑引用估计，不当上限；324/14=23.14是事后窗口算术、266/324=82.10%不是校准预测比'],
['进阶','机制[0,20]；同族策略[10,20]、A0背景；综合路线/休息/构筑仍[8,20]，数据分阶','没有扩大适用进阶；旧低阶上限与退役状态保持']])
table(['主题','数据','结论'],rows)
para('旧基线七数组复算：')
table(['数组','旧','新','旧行一致'],[[k,r['before'],r['after'],'是'] for k,r in json.load(open(O/'baseline-check.json')).items()])
para('各进阶/幕/房型非空血档（房/独立局；活损中位；完整病例audit.json）：')
table(['进阶','幕','房型','血档','房/局','实死/率','活损中位'],[[f'A{r["asc"]}',r['act'],r['type'],r['band'],f'{r["n"]}/{r["runs"]}',f'{r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}%',r['median_win']] for r in A['bands'] if r['n']])
para('源节点后下一首战（按源血档；普通EVENT/REST/SHOP，多源同战不当独立战；死亡率以源节点为分母）：')
table(['进阶','幕','源界面','源血档','节点/独立后战','指向实死/率','活损中位'],[[f'A{r["asc"]}',r['act'],r['screen'],r['band'],f'{r["n"]}/{r["unique_fights"]}',f'{r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}%',r['median_win']] for r in A['transfers'] if r['n']])
para('- 低血异节点仅观察：A10二幕<25%源REST16/16后战4死、活损中位11；SHOP4/4后战1死、中位0；EVENT12节点/10独立后战4节点指向实死、中位3.5。本局只到一幕不改旧数；源血/房型/构筑/用药未控，不能判改商店或问号因果更好。')
para('分阶休息（回血动作与独立营火分开；后战去重）：')
table(['进阶/局','独立火','回血/锻造动作','实回HP','去重后战/实死','活损中位'],[[f'A{r["asc"]}/{r["runs"]}',r['rests'],f'{r["heal"]}/{r["smith"]}',sum(r['gains']),f'{r["nexts"]}/{r["deaths"]}',r['median']] for r in json.load(open(O/'rest-summary.json'))])
para('分阶真正多次SL（同一局/同房为一场，至少一条attempt>1）：')
table(['进阶','场','尝试','赢的尝试'],[[f'A{r["asc"]}',r['fights'],r['attempts'],r['wins']] for r in json.load(open(O/'sl-summary.json'))])
para('- 同族条目七证据场31试3赢，真正重打六场30试2赢；A0一局背景、A10六局。全历史另有A4 1LMBFGSMCWKU单试胜，仅机制背景、不并A10打法证据。S9UZAK0JP0C0赢次T4清信徒/T10余29，BTSRF7JL1W1Y赢次T3/T6退信徒、T13余23；后续抽牌/生成/目标/防御同变，不定单项胜因。完整逐场explore/draws留audit及原SL摘要。')
para('本局同族逐试（前五截断、末次实死；表中末态是最后决策前，末次实际退出0另外核）：')
table(['试次','末回合','结果','末决策HP/挡','敌剩HP合计'],[[r['attempt'],r['turns'],r['result'],f'{r["terminal"]["hp"]}/{r["terminal"]["block"]}',sum(e['hp'] for e in r['terminal']['enemies'])] for r in json.load(open(O/N/'analysis.json'))['attempts']])
section('经验库自己带偏或写了没被执行的地方')
para('- DeepSeek推理0、16脑均Codex，无DS引用原话；未找到逐条引用足以证明经验致错。F16原话：“Heal to 68 HP: the Kin commonly costs 47 HP, and this deck lacks defensive scaling. One upgrade provides less reliable protection.”（译：回到68血，同族通常耗47，本构筑缺防御成长，单次升级保护更不可靠）。最终净损68，47是估计不是实际或上限。')
para('- F7原话：“Use AoE to eliminate followers before their strength escalates.”（译：在信徒力量增长前用群伤消灭它们）；F16：“Existing AoE handles groups.”（译：现有群伤能处理群体）。末试信徒T7/T9才退，T7实损19，群伤/一次升级/68血没有保证及时退场；六败也不能证明构筑必输或另一目标必胜。')
para('- 拟议步法/毒雾未取得、F11刀扇和前战力量药不继承到boss。13条SL重放不是13次新Jev判断；三护栏局部候选省10/少24伤不当整场实得。')
section('机制推理')
mechs=['silent-strength-weak-observation','silent-frail-card-block','silent-piercing-wail-temporary-strength','silent-heart-of-iron-plating','silent-fan-of-knives-capacity','silent-tingsha-discard-damage','silent-deck-burst-observation'];rows=[]
for eid in mechs:
 e=next(c['after'] for c in C if c['id']==eid);txt=e['lesson'];asc=dict(collections.Counter(R[n]['ascension'] for n in e['evidence']))
 rows.append([e.get('name') or eid,txt.split('机制：',1)[1].split('决定胜负的战斗：')[0],f'{e["n_support"]}/{e["n_contradict"]}；{asc}',txt.split('典型案例：',1)[1],eid])
table(['机制','推理','证据（支持/反例局数、进阶）','典型案例','进了哪个条目'],rows)
para('- 完整支持/反例局号及分阶在update-summary.json。反例0是条件化机制/观察的证据分类，不表示没有失败局；铜钹七次1伤保留条件/未知因果，不提出普遍固定3规则。')
para('- 全史动作池重核：尖啸69局561成功施放、脆弱挡牌93局843动作、刀扇16局27动作；已登记55/22/10支持局均落入动作池，不把每个动作自动加支持。铁心17局33飲均+7且旧挡不变；力量药41局58饮均+2、各战重建。铜钹7局107单弃、100次3/七次Vantom滑溜同现1，不外推随机分布、多弃或其他减伤。')
para('- 两份提案'+','.join(json.load(open(O/'proposal-ids.json')))+'均source_task=experience-update，关联条目/账本/原帧，target_task=strategy-proposal；实际领域combat/potion/sl/terminal，只登记独立实现链，不冒称implemented/shipped。')
section('新增')
for c in C:
 if c['before'] is None:para('- '+c['id']+'（'+c['after']['scope']+'、asc[0,20]、7/0、high）：'+c['after']['lesson'])
section('更新')
table(['条目','支持前→后','字符前→后','新证据'],[[c['id'],f'{c["before"]["n_support"]}→{c["after"]["n_support"]}',f'{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}',','.join(c['new_runs'])] for c in C if c['before']])
shortened=[c['id'] for c in C if c['before'] and len(c['after']['lesson'])<len(c['before']['lesson'])]
para('- 九条均补本局证据，原证据/反例与asc未删改。压短重复案例：'+','.join(shortened)+'；旧全文留before/changes，无合并退役。')
section('退役');para('- 无。')
section('和手写知识及代码冲突')
para('- 其余八个静默JSON核生成来源/截止点/用途/哈希，无手写攻略或手册要改删。room-costs截至10-07 04:49Z/93局为MAP口径；fight-value/门控截至05:02Z、64局780战，仅事实参考；outcome-stats截至13:06Z。monster-records旧同族A10五房三胜、初始总血324与新局一致。异步切点/不同口径不当冲突，旧均值不当单场保证，不在此任务改生成脚本。')
para('- boss-damage尚无同族校准，boss-trust保留独立训练验证切分；double-boss四局/0胜的局限保持，本局只到一幕不重拟。八文件哈希在other-knowledge.json。未读写其他角色知识。')
para('- 源码手写知识未改；三次护栏方向符合现行规则，dirty源码缺失不能冒认当前代码导致本局失利。事实/执行追踪覆盖交独立strategy-proposal，不由统计相关性添固定出牌/喝药/SL规则。')
section('代码问题（不给 DS）')
para('- 无本批新增纯bug证据。138首段/结束代码战斗决定覆盖97尝试回合；43代码续步/167 Jev续步另计，不按decider=code把413当自主决定。')
para('- 缺完整dirty源码、前五退出结算、末轮毛伤/未结毒、boss校准时钟、固定原线/替路线/晚喝铁心整战结果，均未知；有限模拟全败不补必死证据。辅助报告两次写入的工具语法错误留draft-write-error.txt，未触及经验/根记录，不是游戏或测试失败。')
section('测试')
if (O/'test-summary.json').exists():
 t=json.load(open(O/'test-summary.json'));para(f'- 源原入口bash tools/test-sandbox.sh，TMPDIR本批/PATH含本机node/SANDBOX_WORKERS=1/nice19；tsc{t["tsc"]}、vitest{t["vitest"]}，{t["files"]}文件/{t["cases"]}例。'+t.get('note',''))
else:para('- 原沙箱入口仍运行，本稿不声称通过；最终以退出码/日志为准。')
para('- JSON、字段/角色/证据/预算、旧122局七数组逐行、终局完整威胁、全史药水/弃牌、固定240配对切片、check-experience missing=[]/0、gitleaks0和diff --check通过。')
para('- 账本仅CLI：新增'+','.join(json.load(open(O/'ledger-added.json')))+'；本批关联'+','.join(json.load(open(O/'ledger-ids.json')))+'；源提交后追加commit/changelog并改proposed，旧首证/prior/claim/repeat/上线历史保持，不标accepted/shipped。')
if (O/'live-merge.json').exists():
 m=json.load(open(O/'live-merge.json'));para('- live实际合入：'+str(m.get('merged'))+'；刷新：'+str(m.get('refresh'))+'；合前：'+str(m.get('before'))+'；合后测试：'+str(m.get('after_test'))+'；结果：'+m['reason']+'。')
 for c in m.get('precheck_conflicts',[]):para('- '+c)
else:para('- 合入未执行；最终以锁内刷新/知识重叠检查/合并预检/实际合后测试结果为准。')
section('切片大小')
para('- 固定种子20260929，截至切点state.run.character_id=SILENT最高A9/A10，每阶20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对，每格20独立时点。池/时点sample-manifest.json；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome数据，不混旧批中位。')
if (O/'slice-summary.json').exists():
 s=json.load(open(O/'slice-summary.json'));table(['进阶/界面','改前中位/最大','改后中位/最大','配对增量中位'],[[r['sample'],f'{r["before_median"]}/{r["before_max"]}',f'{r["after_median"]}/{r["after_max"]}',r['paired_median']] for r in s['rows']]);para('- 整体切片：'+str(s['overall'])+'。')
para('- active169/正文51016，high101/med43/low25；A8适用158条47012字、A9 159条47296字、A10 166条49880字。需要Roy定：无。受阻据实交运维续办，保留失败/原稿/日志/工作树，不冒报上线。')
para('原帧/脚本/初稿/机制/提案/账本/测试/切片/合入回执：'+str(O)+'；报告时间'+stamp+'。')
(O/'changelog-section.md').write_text('\n'.join(L));(O/'changelog-title.txt').write_text(title+'\n');print('本节',len(L),'行',len('\n'.join(L)),'字符')
