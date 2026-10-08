import collections,hashlib,json,re,subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='T0DGVABPV60U'
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries'];R=json.load(open(O/'run-metadata.json'))
commit=(O/'source-commit.txt').read_text().strip();title=f'## 2026-10-08 静默猎手 第九十七次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{commit[:8]}）'
assert title==(O/'changelog-title.txt').read_text().strip()
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
size=json.load(open(O/'slice-summary.json'));props=json.load(open(O/'code-proposal-ids.json'));mapping=json.load(open(O/'ledger-map.json'));live=json.load(open(O/'live-merge.json'))
conf=U['after']['confidence'];b=U['before'];z=U['after'];baseline=json.load(open(O/'baseline-check.json'))
text=[title,'','### 来源','',
f'- 记录时间{now}。唯一新增复盘notes/lessons.md:5729起T0DGVABPV60U静默猎手小节，本批读取时无附加勘误；run-1008-1217-T0DGVABPV60U.md日期2026-10-08。runs.jsonl:609为SILENT/A10/F48失败，未跳过。运行261af56e+dirty完整dirty源码未保存，不能拿当前源码复原原场。',
'- exp开工干净，git merge --no-edit main无冲突快进ffd9060e。已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法和silent最近两节、账本README；独立完成，无下级agent。scratch只在本任务指定目录，nice19单进程抽取与固定最多4worker测试，不联网、安装依赖、运行play或boss模拟池。',
'- 新局按局号重抽1071决策、46条实际Codex脑请求、12条SL、10条计划与Jev原题；states按UTC 2026-10-08T03:22:28.647Z—04:17:36.086Z字节seek，逐帧核state.run.character_id=SILENT，共1116帧。states首/末偏移9166263581/9207996695；DeepSeek推理窗0行。ds_*与deepseek_calls为兼容字段，不把Codex理由归给DeepSeek。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，A0—A10为'+ '/'.join(str(sum(r['ascension']==i for r in R)) for i in range(11))+f'；{len(A["fights"])}战斗房/{sum(f["death"] for f in A["fights"])}实死。只并入指定新复盘，其余127局用于重算数字/历史机制验证，不代替纯Codex爬塔战绩；排除缺character旧铁甲、其他角色、进行中和切点后局。',
'- 口径沿第96节：第一COMBAT入房HP减同房最终尝试退出HP，开场回复/负净损保留，实死另列；Monster走廊、Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT源节点入血关联下一更高层首战，Ancient排除、多源可同战，回复后战去重。独立营火数与回复/其他动作数分列，可能同火多动作，不假设相加等房数。',
'- 旧127局七数组逐行、全部血档/节点后战、实回复与SL复算一致，未发现分母偏差。实验体原13支持局55试5赢、真正重打12场54试4赢；加入新6败后14支持局61试5赢、真正重打13场60试4赢。支持局与所有打过该boss的局分母不混用。',
f'- 新增{U["added"]}、更新{U["updated"]}（15加证据、0只改数字）、退役0；active{b["active"]}→{z["active"]}，正文{b["chars"]}→{z["chars"]}，high{conf["high"]}/med{conf["med"]}/low{conf["low"]}。开工未过55000，无强制腾位；本次更新压短重复案例，具体条目字数见更新节，旧全文/证据/反例保存在before/changes，不改60000预算。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,ev in zip(C,U['evidence']):
    e=c['after'];text.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{ev["by_asc"]}；本批证据'+','.join(c['new_runs'])+' | '+e['lesson']+' |')
text+=[
'| 赢战资源链 | F5走廊49→14；F7/9/12回满70；F28精英39→1、F29回22；F33沙虫41→13、跨幕回58；F45猫头鹰63→51、F46精英51→13、F47枕头火回55 | 赢战也会消耗下一战资源；另线/另一锻造结局未知 |',
'| 实验体同盘SL | 六試0赢，五次判死截断、末T5实死；首/末T2同38血/敌86/同手，扫腿首试零损、SL换速行者末损12；净扣23→43伴狡诈提前 | 没有赢的那次，不把血价/输出差归单步整战因果或运气；维持真正必死边界 |',
'| 护栏与炼制 | 第3/5试T4同38血/敌197/同手，原候选损17→10，另重问21→10；实前试损5无药、后试损15且补血清 | 后续抽弃同变，10血差非炼制单牌价；取舍只1局，持药不等生存/胜率 |',
'| 药水/SL | 独立18瓶含第5试生成1瓶随后SL撤销，最终路径17瓶；原22饮/撤销5/最终17；主动弃0/事件交换0；五次读档恢复55及原狡诈 | 恢复不算新获/回复，判死截断不补末结算；五局炼制27次全部净添1瓶、动作HP不变 |',
'| 回复与末伤 | 猫头鹰再生实回15、失血27、净损12；末boss16HP0挡/覆甲0对11×4，棍后完整需40、实死扣余16 | 净损非敌总伤；严格存活至少差25，不承诺补25转胜 |',
'| 再生子分母 | 16局23饮为实建5层动作集合；整条经验保留原支持集并加新局为15支持局 | PD9AYQVMLQW6 F19T1只进已建5层饮用数字，本批不把单建层帧补作完整衰减/回血整条支持；不是反例 |',
'| 投影与实走 | F16锻造档族母投影54/实54；F32火档沙虫投影41/实41、536样本0.93%实际胜；F40条件投影boss−9按1截断/实55，F46才获枕头；F47投影55/实55、联合360配对0胜 | 时点/未来休息/遗物/后战消耗同变，低模拟胜率非必死，不补不存在的第三阶段/F49实盘 |',
'','旧基线七数组复算：','','| 数组 | 旧 | 新 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in baseline.items():text.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
text+=['','各阶/幕/房型非空血档；房/独立局分列，掉血为活战最终净损，实死单列：','','| 进阶 | 幕 | 房型 | 入血档 | 房/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:text.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
text+=['','休息/商店/普通事件源节点的下一战；同战可关联多节点，独立后战列去重，死亡率以源节点为分母：','','| 进阶 | 幕 | 源节点 | 入血档 | 源/独立后战 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:text.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
text+=['','已完成回复动作及其去重后战：','','| 进阶/局 | 独立营火 | 回血/其他动作 | 实回 | 后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):text.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
text+=['','SL多次尝试按一场而非多局，实赢次数与判死/实死分开：','','| 进阶 | 重打场 | 尝试 | 实赢次数 |','| --- | --- | --- | --- |']
for r in json.load(open(O/'sl-summary.json')):text.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
text+=['','- 新局只有F48真正重打，一场六试0赢；其余SL跟踪房只首试赢，不当重打实验。全局工具27窗口＝21胜/5判死截断/1实死，房数22；五次中断出口及未执行结算不补伤害/死亡。没有赢的那次，不可把换线效果归运气或证明原线可赢。',
'- 低血走不同节点的历史分档如表；牌组、药水、进阶和各时点投影同变，只报告观察，不认路线因果。新局F28赢至1实际接火；九次回血仍败不证明锻造更好，改线反事实未实走。','',
'### 经验库自己带偏或写了没被执行的地方','',
'- 新局DeepSeek窗0行，46条脑请求全Codex；无可核的“DeepSeek引用经验却反向执行”原话，不补引述。Codex F1原话“普通战触发钓鱼竿，四火两店补强，晚期单精英。”，F34“铁棒联动零费攻击；少走廊，单精英前购物。”。路线、三幕商店与休息实际执行，未走替线不判计划本可赢。',
'- F22购炼制原话“Alchemize provides renewable combat resources and final-boss potions. Use existing potions before playing it; skip marginal cards and expensive removal.”。译意为持续补战斗/终局药、先饮腾槽；实际四次补药，F48第3试护栏却省去炼制；第5试SL恢复后血清未饮即判死。存在计划未在该轮兑现，不说改护栏一定救命。',
'- F48末T2 Jev两次原选扫腿，SL换速行者线后原话“every untried line dies more often in the rollout; the pick is known to fail”；同盘少挡的实际血价12已核，但狡诈与后续抽弃也变，不把未执行原答当同线误差。末T4原15挡到实20含新增敏捷2与换升级3，分开而非全归遗物。',
'- F44构筑原话“Persistent scaling, synergistic cycling, shiv-supported Dexterity, and potions strengthen both bosses.”。译意为成长/过牌/小刀敏捷和药水备两boss；持三步法、磨蚀与想要清单不等已建/已得，末T5八敏无挡牌、滚石25未触发，不能由持有替补实际收益。','',
'### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[];short=[]
for c,ev in zip(C,U['evidence']):
    e=c['after'];s=e['lesson']
    if '机制：' not in s:continue
    reasoning=s.split('机制：',1)[1].split('。搭配：',1)[0]
    case=s.split('典型案例：',1)[-1]
    if e['id']=='silent-speedster-draw-damage':reasoning+='；两次真实抽牌额外4伤，但不能预支未知抽牌或把偏折当攻击'
    if e['id']=='silent-rolling-boulder-start-growth':reasoning+='；此局实际只跨第一阶段，二阶段剩104死，25层未触发，第三阶段未到，不用模型636推实需DPT'
    if e['id'] in ['silent-footwork-block','silent-helical-dart-shiv-dexterity']:reasoning+='；末轮无后继挡牌时8敏不能兑现，完整40伤超过16血，局部模型修正不等可赢'
    name=e.get('name',e['scope']);text.append(f'| {name} | {reasoning}；本轮/可活轮收益与整战单因分开 | {e["n_support"]}/{e["n_contradict"]}；实证分阶{ev["by_asc"]}；适用{e["asc"]} | {case} | {e["id"]} |')
    mechanisms.append(e['id']);short.append(name+' — '+s.split('。',1)[0]+f' — {e["n_support"]}支持/{e["n_contradict"]}反例 — '+N)
text+=['','- 历史全部本角色复盘/日志已筛检；各条保留原支持/反例并补新局，螺线两局101动作和炼制五局27动作逐次核验。能力建立/持有、永久/临时敏捷、卡牌/被动挡、触发/攻击、完整需损/死亡实扣、回复/净损分源。正文保留公式和典型案例，详细数据留mechanism-actions/historical-*、new-checkpoints和SL对照。单因胜负未受控的明确写观察。','',
'### 新增','']
for c in C:
    if c['before'] is None:text.append('- '+c['id']+'：'+c['after']['lesson']+'；账本'+','.join(mapping[c['id']])+'。')
text+=['','### 更新','']
for c in C:
    if c['before']:text.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字；账本'+','.join(mapping[c['id']])+'。')
text+=['','### 退役','','- 无。游戏机制/真实数据与纯模型缺陷分账；部分代码消费不等整个机制已修，螺线仍无同线新增/次轮清除覆盖证明，没有因已见入口敏捷就退役。','',
'### 和手写知识及代码冲突','',
'- 核对silent其他8份JSON，SHA/元数据留other-knowledge.json；均为生成统计/模型或有界double-boss/boss-trust观察，无手写攻略需改。旧切点统计不当新数据反例，double-boss仅4局/未校准/不判必死的限制保留；本局未到F49，不给交接条目加支持或重新拟合。改了的手写知识：无。',
'- 复盘只读live5925a43d定位：combat-plan.ts:2883只读入口敏捷、:2896遗物入口无螺线，turn-solver.ts:2433无小刀增敏/:2013只显式牌增敏，rollout.ts:1325临时敏捷列表遗漏HELICAL_DART_POWER/:2645据列表撤回。开工合后exp及当前live三个文件rg也无这两个ID；定位只证明当前缺口，完整运行dirty树未知。原纯bug0293留修复记录，不把源码定位给DS。',
'- 专用CLI：'+','.join(props)+'；source_task=experience-update、target_task=strategy-proposal，实际涉及combat/potion/sl/terminal，未改打法源码、无structure实现。不登记implemented/shipped；既有postmortem提案、失败日志及其他并行记录保留。','',
'### 代码问题（不给 DS）','',
'- 仅沿用复盘silent-0293螺线同线新增敏捷与跨轮清除，不重复建bug；旧0104/0105机制实证不等模型已覆盖。缺重放/自动出牌、完整dirty源码、五次SL出口/未执行结算、原线整战胜利、未知随机药/未来抽牌、第三阶段/F49实盘。护栏10记录/最终9次与原答/SL/重问分开，证据不足不调参数或冒称修复转胜。','',
'### 测试','']
logs=[(O/'test-source.log').read_text()]
if (O/'test-source-retry.log').exists():logs.append((O/'test-source-retry.log').read_text())
final=logs[-1];files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',final)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',final)))
rc=int((O/('test-source-retry.rc' if len(logs)>1 else 'test-source.rc')).read_text());assert rc==0
text.append(f'- 规定入口agent/bash tools/test-sandbox.sh，PATH本机node、TMPDIR本批scratch、nice19、固定最多4workers；tsc退出0、vitest文件{files}/用例{cases}/退出0。'+('首轮未通过，按任务重跑一次后通过，首轮及重跑日志/退出码保留；失败原因见测试原文。' if len(logs)>1 else '首次通过，无重跑。')+'排除名单未改，沙箱外完整套件交调度器，不冒报。')
text.append('- JSON、字段/scope中文名/局号角色/支持反例/置信度/日期/预算、旧127局七数组与血档基线、药水逐饮、螺线101动作/炼制27动作、240配对切片、check-experience missing=[]退出0、gitleaks源退出0和git diff --check全部通过。')
added=json.load(open(O/'ledger-added.json'));proposed=json.load(open(O/'ledger-proposed.json'));check=int((O/'ledger-check-final.rc').read_text());assert check==0
text.append('- 学习账本仅CLI：新增'+','.join(added)+'；改proposed '+','.join(proposed)+'；退役无；ledger.py check退出0。纯bug0293仍observed，原claim/首证/prior/支持/重犯与旧上线历史保留；shipped只交运维据实际合入登记，不把经验数据发布当策略实现。')
text.append(f'- live合入：{live.get("merged")}；刷新提交{live.get("refresh")}，合前{live.get("pre")}；{live["result"]}。')
if live.get('merged') is None:text.append('- 未实际合入，不造上线decision/eval版本或Roy规则通知；源提交和完成事件交运维兜底，知识刷新及所有并行记录保留，不硬解冲突、不停对局、不运行play。')
for line in live.get('conflicts',[]):text.append('- '+line)
text+=['','### 切片大小','',
'- 固定种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对；manifest记录池/时刻/唯一帧数。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome，仅更换经验，临时文件都在本任务scratch。','',
'| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in size['by_sample']:text.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
text.append(f'\n- 整体中位{size["before_median"]}→{size["after_median"]}，涨幅{size["median_growth"]}字；配对差中位{size["paired_median"]}，最大{size["before_max"]}→{size["after_max"]}，单片最多增{size["max_growth"]}。')
text.append(f'- active{z["active"]}/正文{z["chars"]}，high{conf["high"]}/med{conf["med"]}/low{conf["low"]}；'+ '、'.join(f'A{a}适用{z["asc"][str(a)]["entries"]}条/{z["asc"][str(a)]["chars"]}字' for a in [8,9,10])+'。无合并/退役，压短重复案例见更新逐条字数，预算不改。需要Dai定：无；合入受阻据实交运维兜底。')
text.append('\n本批原帧/复算/机制/CLI/提案/测试/切片/合入回执：'+str(O)+'；报告时间'+now+'。')
out='\n'.join(text)+'\n';(O/'changelog-addition.md').write_text(out);(O/'report.md').write_text(out)
completion=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=U['added'],updated=U['updated'],retired=0,active=z['active'],mechanisms=mechanisms,tests=dict(tsc=0,vitest=rc,cases=cases),ledger=dict(added=added,proposed=proposed,retired=[],check=check),code_proposals=props,implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
(O/'completion.json').write_text(json.dumps(completion,ensure_ascii=False,indent=2)+'\n');(O/'mechanism-short.json').write_text(json.dumps(short,ensure_ascii=False,indent=2)+'\n')
print('报告',len(out),'字；测试',completion['tests'],'合入',completion['merged'])
