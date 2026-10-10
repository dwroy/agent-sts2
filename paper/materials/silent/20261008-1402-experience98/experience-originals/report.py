import collections,json,re,subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='G8NHLL09DLBX'
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries'];R=json.load(open(O/'run-metadata.json'))
commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
size=json.load(open(O/'slice-summary.json'));props=json.load(open(O/'code-proposal-ids.json'));mapping=json.load(open(O/'ledger-map.json'));live=json.load(open(O/'live-merge.json'))
conf=U['after']['confidence'];b=U['before'];z=U['after'];baseline=json.load(open(O/'baseline-check.json'))
offset=json.load(open(O/N/'states-offsets.json'))
T=[title,'','### 来源','',
f'- 记录时间{now}。新增复盘notes/lessons.md:5735起G8NHLL09DLBX静默小节及13:30:57勘误；run-1008-1257-G8NHLL09DLBX.md日期2026-10-08。runs.jsonl:610为SILENT/A10/F24败，未跳过。运行d61bf0ec+dirty完整dirty源码未保存；复盘只读live5925a43d定位不等运行源码逐字重放。',
'- exp开工干净，git merge --no-edit main无冲突快进4eefc18f。已读README、最新STATE/决定末尾、学习协议/代码提案闭环、首次构建方法及silent最近两节、账本README；独立完成，无下级agent。临时文件仅本批scratch，抽取/复算nice19单进程、测试固定最多4workers，不联网/安装依赖/运行play/boss模拟池。',
f'- 按run id重抽726决策、25条实际Codex脑日志、6条SL、run-plans及Jev原题；states按UTC 2026-10-08T04:22:39.090Z—04:56:54.518Z seek并逐帧核角色，共747帧，首/末字节偏移{offset["first"]}/{offset["last"]}；DeepSeek推理窗0行。兼容ds_*和deepseek_calls不当DeepSeek实际回答。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，A0—A10为'+ '/'.join(str(sum(r['ascension']==i for r in R)) for i in range(11))+f'；{len(A["fights"])}战斗房/{sum(f["death"] for f in A["fights"])}实死。其余128局只进数字/历史验证，排除缺character旧铁甲、其他角色、进行中及切点后局，不代替纯Codex爬塔战绩。',
'- 口径沿第97节：首COMBAT入房HP减同房最终尝试退出HP，开场回复/负净损保留，实死另列；Monster走廊与Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT源节点入血关联下一更高层首战，Ancient排除，多源可同战，回血后战去重。营火数和回血/其他动作数分别计，同火可多动作。',
'- 旧128局七数组逐行、全部血档/节点后战、实回复及SL完全一致。机制核验初稿按completed过滤遗漏两次pending(unstable)生存者：后继帧已实给挡，现单独补查，原失败verify-initial.log保留；不改旧统计数组。速度全历史39局53次实饮加5，与整条经验支持38局分开：T0DGVABPV60U仅计本次加层数字，不凭单动作补作整条临时量兑现/撤回支持，不是反例。',
'- 巨兽原支持20局内SL日志38试17赢、真正重打7场25试4赢；新支持21局内记录42试18赢、真正重打8场29试5赢。仅支持集内记录，不混全体见过巨兽的分母；没有SL记录不补造。新产卵虫同场两试0赢、一判死截断/一实死。',
f'- 新增0、更新12（12加证据、0只改数字）、退役0；active{b["active"]}→{z["active"]}，正文{b["chars"]}→{z["chars"]}字，high{conf["high"]}/med{conf["med"]}/low{conf["low"]}。未过55000，无强制压缩/合并/退役；更新里压短旧重复案例，逐条字数如下，before/changes保留旧全文、证据与反例，不改60000预算。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,ev in zip(C,U['evidence']):
    e=c['after'];T.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{ev["by_asc"]}；新证G8NHLL09DLBX | {e["lesson"]} |')
T += [
'| 赢战资源链 | F16回32到76；F17巨兽胜76→1；跨幕回60至61；F19胜61→54/F20胜54→52；F22商店补药未回血，F23胜52→22耗两药，F24两试22空药进场 | 后置营火未到，未走替线/保药整战结果未知，资源链是观察 |',
'| 巨兽SL | 四试均76及原速度入场，前三T16/21/20判死、末T15赢；末本体8毒结束后仍付42−9=33自爆血价，34→1 | 可复算局部机制；换线、药时点与后继抽牌同变，无单因胜线或运气结论 |',
'| 产卵虫SL | 首T1建步法、末试未建；末五轮母体实扣15/20/41/27/20合123、132→9；两试0赢，首T5结算未执行 | 不把余毒当已伤、初始全活体HP和当完整需伤或未执行线当赢次 |',
'| 随机毒收尾 | 末T5母体29血20毒，药瓶实际三个幼虫各+3，母体不加毒，结算母体9且玩家死 | 多敌随机毒不能指定落点保证母体斩杀；纯代码定位不给DS |',
'| SL勘误 | 13探索＝10 replay/2 replacement/1 avoid未替换；实际reload4，恢复72/74/61/12合219和三次原速度瓶 | 重放不是换线，恢复不是回复/新药 |',
'| 药水 | 独立取得9＝初始2/奖励6/商店1，原use12含巨兽三次撤销，最终路径9饮；主动弃0/交换0/战内随机补0；末战两次空药 | 无受控留药、换线整战胜例，不拟喝留药或持有价 |',
'| 速度/荆棘 | F23T2刺击荆棘先失5，饮后5敏、偏折9，对25另损16，全轮21；次轮临时层消失 | 5敏不是5即时挡，后继挡不补此前HP |',
'| 步法同场 | 首试2敏后空翻7+生存者10合17，末无步法只有生存者8、对17损9 | 逐牌增量支持，后空翻/毒/攻击同时改变，差9不全归敏捷 |',
'| 尖啸与后轮 | 末T3三幼虫各5→0/母体8→2，合23→2；T4负力撤回、易伤下三幼虫各7，9挡损10 | 临时减力不当常驻防御，敌4力后续来源独立过程未知 |',
'| 路线投影 | F18二幕投影F19/20/23/24为61/51/41/31，实61/54/52/22；F24落后9。F16回血档投影boss76、实76，base44不是入场HP | 新遗物/未来休息/时点分账，不从未走另一线或低模拟胜率推必死 |',
'','旧基线七数组复算：','','| 数组 | 旧 | 新 | 旧行一致 |','| --- | --- | --- | --- |']
for key,value in baseline.items():T.append(f'| {key} | {value["before"]} | {value["after"]} | 是 |')
T += ['','各进阶/幕/房型非空血档；房/独立局分列，活损为最终退出净损、实死单列：','','| 进阶 | 幕 | 房型 | 入血档 | 房/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:T.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T += ['','休息/商店/普通事件源节点的下一战；同战可关联多节点，死亡率以源节点为分母：','','| 进阶 | 幕 | 源节点 | 入血档 | 源/独立后战/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:T.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]}/{len({x["run"] for x in r["cases"]})} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
T += ['','已完成回复动作及其去重后战：','','| 进阶/局 | 独立营火 | 回血/其他动作 | 实回 | 后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):T.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
T += ['','SL多次尝试按一场而非多局，实赢次数与判死/实死分开：','','| 进阶 | 重打场 | 尝试 | 实赢次数 |','| --- | --- | --- | --- |']
for r in json.load(open(O/'sl-summary.json')):T.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
T += ['','- 新局两场真正重打共6试1赢，四个判死截断、一实死、一实赢。巨兽第3试T5换串刺题面损同4/伤12→14；末试T10换后空翻题面损同13/伤同11，后续抽牌重问加中和后实损6，差7不归一次换线。产卵虫没有赢的那次，后续牌/目标/毒随机分配不同，不归运气或宣称原线可赢。',
'- 历史低血走不同节点的分档如表，局数/房数分别报告；牌组、药水、进阶与节点选择混杂。只记观察，没有同一局另一线路的完整实打结局。F22商店补两牌和药仍后战耗血，不能推商店无用或保药必胜。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek窗0行，25条实际脑请求全Codex，无可核的“DeepSeek引用经验却反向执行”原话，不补引述。F1脑路线原话“商店补强，营火后打一精英，三火保留巨兽自爆血量。”；三火与巨兽最终自爆保护实际兑现，F18计划后段营火尚未到达就死，不能把未来火当已有缓冲。',
'- 原弹跳药瓶条目已写“多敌分配不保证均匀，施毒动作不即时扣血”。本局仍出现母体未杀而自动斩杀执行；未记录Jev或脑逐字引用该条目，不能称模型读到后故意违背。此次将指定目标收尾的不确定写明确，源码根因留独立提案。',
'- F24末试T1步法有牌却改打击，全场未建立；T3/T4候选focus及原答不等完整杀序执行，必备工具先出后抽牌重问。末T4幼虫focus另一候选预计损8、伤36未完整实打，不能以比实际损10少2推出转胜。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[];short=[]
for c,ev in zip(C,U['evidence']):
    e=c['after'];s=e['lesson']
    if '机制：' not in s:continue
    reasoning=s.split('机制：',1)[1].split('。搭配：',1)[0];case=s.split('典型案例：',1)[-1]
    if e['id']=='silent-giant-explosion-window':reasoning+='；34−(42−9)=1说明本轮弱化/挡兑现；击杀本体仍要付33自爆血价，提前结束与整场换线因果未控'
    if e['id']=='silent-bouncing-flask-poison':reasoning+='；132母体五轮实扣123尚差9，9随机毒并非必落母体，不能预支成收尾'
    name=e.get('name',e['scope']);T.append(f'| {name} | {reasoning}；单项整战因果未控 | {e["n_support"]}/{e["n_contradict"]}；实证分阶{ev["by_asc"]}；适用{e["asc"]} | {case} | {e["id"]} |')
    mechanisms.append(e['id']);short.append(name+' — '+s.split('。',1)[0]+f' — {e["n_support"]}支持/{e["n_contradict"]}反例 — '+N)
T += ['','- 历史全部本角色复盘和日志已按角色筛检，保留原支持/反例，新增仅该局。完成动作和pending后继真实帧、力量/敏捷、永久/临时量、施毒/毒伤、荆棘自损/敌攻击、实际建立/仅持有分别核。39局53速度饮只作加层数字，不等整条38支持；详细动作/原帧/SL探索与血档在mechanism-actions、historical-potions、new-checkpoints、sl-explore及audit，未知交互不补因果。',
'','### 新增','','- 无。同主题并已有条目，不新增单局重复结论。',
'','### 更新','']
for c in C:T.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字；账本'+','.join(mapping[c['id']])+'。')
T += ['','### 退役','','- 无。未改打法源码，实际游戏数据与纯代码缺陷分账；部分代码消费不等整条机制已修，不能因持牌/某成功局退役。',
'','### 和手写知识及代码冲突','',
'- 核对silent其他8份JSON，SHA/元数据保存other-knowledge.json；为生成统计/模型及有界double-boss/boss-trust观察，无手写攻略需改。旧切点统计不当新数据反例，double-boss的4局未校准/不能判必死限制保留；本局未到F49，不补交接证据或重拟模型。改了的手写知识：无。',
'- 当前exp只读turn-solver.ts:2284随机施毒调用randomVictim、:2536选择最高HP加挡，未证明最坏随机毒分配；复盘原帧单步核对winsFight=true与实盘母体余9冲突。源码定位不给DS，游戏随机落点/实际毒伤保留在药瓶条目。本任务不修出牌源码，原运行dirty完整源码未知。',
'- 专用CLI：'+','.join(props)+'；source_task=experience-update、target_task=strategy-proposal，实际涉及combat/potion/sl，不涉及terminal/structure。提案保留旧/新行为、证据层回合/反例、账本与时间分组、缺数据、验证/预期及回退；原postmortem提案不覆盖，未登记implemented/shipped。',
'','### 代码问题（不给 DS）','',
'- 只沿用复盘纯bug silent-0295随机毒伪确定斩杀，不重复建bug或因0008旧毒模型适配视为已修。原单步核对仅隔离施毒/当轮评估，未重建整场。完整dirty源码、四处SL截断出口/末结算、毒与回复独立毛伤、重复ID持久身份、死亡首击/剩余攻击、F25后实盘及受控替代整战均缺失；不改护栏/喝留药/SL参数或终局权重，不承诺修后能赢。',
'','### 测试','']
log=(O/'test-source.log').read_text();retry=(O/'test-source-retry.log')
if retry.exists():log=retry.read_text()
files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
rc=int((O/('test-source-retry.rc' if retry.exists() else 'test-source.rc')).read_text());assert rc==0
T.append(f'- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19、固定最多4workers；tsc退出0、vitest文件{files}/用例{cases}/退出0。'+('首次未过、按任务重跑一次通过，原日志保留。' if retry.exists() else '首次通过，无重跑。')+'排除名单未改，完整沙箱外套件交调度器，不冒报。')
T.append('- JSON/字段/scope中文名/证据局号角色/支持反例/置信度/日期/预算，旧128局七数组及血档/后战/回复/SL基线、747新帧核验/13SL勘误、240配对切片、check-experience missing=[]退出0、gitleaks源退出0、git diff --check通过；初始生存者过滤核验失败原件保留，后继真实帧补查后通过。')
added=json.load(open(O/'ledger-added.json'));proposed=json.load(open(O/'ledger-proposed.json'));check=int((O/'ledger-check-final.rc').read_text());assert check==0
T.append('- 学习账本仅CLI：新增无；proposed '+','.join(proposed)+'；退役无；ledger.py check退出0。保留首证/prior/claim/support/repeat及旧上线历史；纯bug0295未转经验proposed，不把经验发布当策略实现；shipped交运维根据实际live登记。')
T.append(f'- live合入：{live.get("merged")}；刷新提交{live.get("refresh")}，合前{live.get("pre")}；{live["result"]}。')
if live.get('merged') is None:T.append('- 未实际合入，按任务遇冲突停止，不硬解/覆盖刷新，不造上线decision/eval版本或Roy规则变更通知；源提交/完成事件交运维兜底。对局不停，不运行play。')
for line in live.get('conflicts',[]):T.append('- '+line)
T += ['','### 切片大小','',
'- 固定种子20260929，从截至切点states中state.run.character_id=SILENT最高两个进阶A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对；manifest记录池/时刻/唯一帧数，小池保留有放回补足标记。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome，只换经验。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in size['by_sample']:T.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
T.append(f'\n- 整体中位{size["before_median"]}→{size["after_median"]}，涨幅{size["median_growth"]}字；配对差中位{size["paired_median"]}，最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。')
T.append(f'- active{z["active"]}/正文{z["chars"]}，high{conf["high"]}/med{conf["med"]}/low{conf["low"]}；'+'、'.join(f'A{a}适用{z["asc"][str(a)]["entries"]}条/{z["asc"][str(a)]["chars"]}字' for a in [8,9,10])+'。合并/退役无，更新压短旧案例逐条见上，不改预算。需要Roy定：无；若合入受阻据实交运维兜底。')
T.append('\n本批原帧/复算/机制/CLI/提案/测试/切片/合入回执：'+str(O)+'；报告时间'+now+'。')
out='\n'.join(T)+'\n';(O/'changelog-addition.md').write_text(out);(O/'report.md').write_text(out)
completion=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=0,updated=12,retired=0,active=z['active'],mechanisms=mechanisms,tests=dict(tsc=0,vitest=rc,cases=cases),ledger=dict(added=added,proposed=proposed,retired=[],check=check),code_proposals=props,implementation_domains=['combat','potion','sl'],report=str(O/'report.md'))
(O/'completion.json').write_text(json.dumps(completion,ensure_ascii=False,indent=2)+'\n');(O/'mechanism-short.json').write_text(json.dumps(short,ensure_ascii=False,indent=2)+'\n')
print('报告',len(out),'字；测试',completion['tests'],'合入',completion['merged'])
