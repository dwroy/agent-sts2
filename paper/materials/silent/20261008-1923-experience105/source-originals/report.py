import collections,json,re,statistics,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
U=json.load((O/'update-summary.json').open());C=json.load((O/'changes.json').open())['entries'];M=json.load((O/'ledger-map.json').open())
A=json.load((O/'audit.json').open());R=json.load((O/'run-metadata.json').open());H=json.load((O/'historical-mechanism-summary.json').open());H={r['id']:r for r in H}
SL=json.load((O/'sl-summary.json').open());REST=json.load((O/'rest-summary.json').open());S=json.load((O/'slice-summary.json').open())
commit=(O/'source-commit.txt').read_text().strip();heading='## 2026-10-08 静默猎手 第一百零五次增量：1 局 A10（version 2026-10-08.22，分支 exp-silent，'+commit[:8]+'）'
P=json.load((O/'code-proposal-ids.json').open());L=json.load((O/'ledger-results.json').open());live=json.load((O/'live-merge.json').open()) if (O/'live-merge.json').exists() else dict(merged=None,result='尚未进入合入流程')
log=(O/'test-source-final.log').read_text() if (O/'test-source-final.log').exists() else (O/'test-source.log').read_text()
files=[int(x) for x in re.findall(r'Test Files\s+(\d+) passed',log)];cases=[int(x) for x in re.findall(r'Tests\s+(\d+) passed',log)]
rc=int((O/'test-source-final.rc').read_text()) if (O/'test-source-final.rc').exists() else int((O/'test-source.rc').read_text())
assert rc==0 and len(files)==len(cases)==2
tests=dict(tsc=0,vitest=0,files=sum(files),cases=sum(cases))
sections=[heading+'\n','### 来源\n',f'- 记录时间{now}。只读notes/lessons.md:5812的4XLZURXMD872静默小节，标题/节后勘误定位复核；runs.jsonl:618为SILENT/A10/F33败，无跳过。运行187c025a+dirty完整源码未记录，不把当前源码当对局完整源码。',
'- exp-silent开工干净；git merge --no-edit main无冲突快进36f5c0df。先读README、最新STATE、近期决定、学习协议/代码提案闭环、首次构建与最近增量方法、静默第103/104节及账本README。独立操作、不派agent、不联网、不改打法源码、不运行play或模拟池；所有临时产物仅本批scratch，抽取单进程nice19，沙箱1worker。',
'- 重新按run id抽591决策、33实际Codex脑请求、11 SL、6计划；states按首末决策UTC09:10:44.742Z—09:40:05.808Z二分seek流读并核state.run.character_id/run_id，610帧，与复盘原610帧逐帧一致。字节偏移/原子集保存；DeepSeek该窗0条，兼容ds_*不当实际DeepSeek回答。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}；{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实际死。其余136局只进数字/历史验证；排除缺character旧铁甲、其他角色、进行中及切点后局，不称纯Codex爬塔战绩。',
'- 沿上一节口径：首COMBAT入房HP减同房末次尝试退出HP，开场失血/负净损保留、实际死单列；Monster走廊与Unknown问号战分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT入血关联下一更高层首战，排Ancient，同战多源可重复，回血后战去重。独立营火与动作数分列；同房SL计一战、判死截断不计实际死。',
'- 旧136局七数组逐行、所有血档/节点后战、休息与SL复算一致，无聚合漂移。独立实帧34项通过，毒药132个实饮逐一核不即时扣HP和毒/制品变化；543段历史静默主题复盘及137局日志交叉核验。支持/反例完整名单、分阶、实际动作/遭遇在historical-mechanism-summary，持有/出现不当整条机制支持。',
'- 旧毒药条目写32局124饮，但同旧切点实为33局125饮，漏T0DGVABPV60U A10 F28T7常态加6的一饮；不是日志基线改变。补该历史证据再加新局7饮后为34局132饮：常态115、头骨15、制品阻毒2。旧文字与差额及逐饮帧保留poison-potion-checks；没有仅凭差额退役有效机制。',
f'- 新增{U["added"]}、更新{U["updated"]}（14加证据、0只改数字）、退役0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字。未触55000压缩线，不改60000预算；同主题合已有条目，新主题可可及蟾蜍自然对照各一条，无合并或强制压缩。逐条旧/新见changes。',
'\n### 对照数据检查的主题\n','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];h=H[e['id']]
    sections.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}，分阶{h["by_asc"]}；新证{",".join(c["new_runs"])} | {e["lesson"]} |')
sections += ['\n按进阶、幕、房间类型和入血档；n为独立房，死亡率按房，活损中位仅未实际死房（原掉血名单和局号可复算audit.json）：\n','| 进阶/幕/房型/血档 | 房数/局数 | 实际死亡/率 | 活房净损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
    if b['n']:sections.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["n"]}={100*b["deaths"]/b["n"]:.2f}% | {b["median_win"]} |')
sections += ['\n非战节点入血关联下一战；n为源节点，每一源独立计，同战多源另列去重房数，不是改路线的因果估计：\n','| 进阶/幕/节点/入血档 | 源节点/去重后战 | 实际死亡/率 | 活后战净损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
    if b['n']:sections.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["n"]}={100*b["deaths"]/b["n"]:.2f}% | {b["median_win"]} |')
sections += ['\n营火回复与SL全进阶观察，火为去重节点，回血/锻造为动作数（可重复操作，不强行相加成节点数）：\n','| 进阶/局数 | 火/回血动作/锻造动作/实回 | 去重回血后战/死/率/活损中位 | 重打场/尝试/赢 |','| --- | --- | --- | --- |']
for r,s in zip(REST,SL):
    sections.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{100*r["deaths"]/r["nexts"]:.2f}%/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
sections += ['\n- 新局低血实际路线：F24在20/70回血到41；F28在36/70回血到57；后三场Monster实损34/8/13后仅2，F32回血到23。没有该牌组同血药改走双精英或另一路线的整场对照，低血后节点的死亡率仅观察，不能宣称改线因果更好。',
'- 蟾蜍一场两试1赢：T2原手/能量/25攻击相同，胜试换手三抽后11挡、损2，首试结束损13；但T1多匕首雨8伤、入轮敌111/103及后续抽时均变，不把整场胜归换手或运气。两场历史只有单试won，不算重打对照。沙虫全历史14场58试7赢，本局六试0赢，没有赢的那次；SL explore和续问单列，不把Jev原答当实际最终动作。',
'\n### 经验库自己带偏或写了没被执行的地方\n',
'- 实际脑33请求全部Codex，DeepSeek0，无可核“DeepSeek逐字引条目却反向执行”的原话，不发明。F18 Codex原话：“可可免费启动能力，早店补防，三火避精英。”这是计划；boss六试T1有7能但没能力手牌，全战没建毒雾/谋划专家/速行者。前三试普通爆发当轮仍有层，不泛称全无增益。',
'- F28原话：“Heal to 57 HP before three consecutive hallways. No upgrade compensates for the immediate survival buffer; the elite route risks exhaustion.” F32原话：“Heal to 23 HP before the forced boss. No single upgrade compensates for entering at 2 HP; poison needs survival time.” 两个即时回复都执行并兑现，不改成忘记休息/声称承诺必胜。F28同分支投影F32=24/F33=45，实2/23各低22；单次投影差不证明已上线规则再次失效。',
'- F31首试Jev0.76选结束；参考换手/结束均损13、扣8、五轮8/8死。重试执行后续问并实胜，23/24死仍非精确必死；T1已变，不称模拟被单因素反例推翻。复盘0019/0021/0239本批只support，不添repeat、不覆盖原claim/首证/prior。',
'\n### 机制推理\n','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C:
    e=c['after'];text=e['lesson']
    if '机制：' not in text:continue
    conclusion,rest=text.split('机制：',1);why=rest.split('搭配：',1)[0];example=text.split('典型案例：',1)[1]
    sections.append(f'| {conclusion} | {why}局部算术/时点与整战单因分账；只有相关性的保留观察。 | {e["n_support"]}/{e["n_contradict"]}，分阶{H[e["id"]]["by_asc"]}，适用{e["asc"]} | {example} | {e["id"]} |')
    mechanisms.append(dict(id=e['id'],conclusion=conclusion,n=e['n_support'],case='4XLZURXMD872'))
sections += ['\n### 新增\n']
for c in C:
    if c['before'] is None:sections.append(f'- {c["id"]}：{c["after"]["scope"]}；支持{c["after"]["n_support"]}，反例{c["after"]["n_contradict"]}；账本{",".join(M[c["id"]])}。'+('20局首轮实际能量观察；额外来源未全隔离，不由总7/8/9能反推每个来源。' if 'cocoa' in c['id'] else '单场天然重打、局部11血差与整战多因素分开。'))
sections += ['\n### 更新\n']
for c in C:
    if c['before']:sections.append(f'- {c["id"]}：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}，反例不变；正文{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}字；账本{",".join(M[c["id"]])}。')
sections += ['\n### 退役\n','- 无；无反例超过支持、无新高阶推翻，未修打法源码；原退役历史保持。',
'\n### 和手写知识及代码冲突\n','- 核对silent其余8份JSON字段/来源/内容，SHA和切点见other-knowledge。均为生成统计/模型或有限boss-trust/double-boss，无需要改的手写攻略；生成切点/不同净损口径与本批首COMBAT→出口口径分开，不把旧生成统计当反例。本局未到双boss，不重拟4局/0实际胜的有限模型。改了的手写知识：无。',
'- 当前源码card-model.ts:1618仅在observedPoison提供时建毒药模型，combat-plan.ts:3135当前只由已观察双boss传该参数；本局题面数值未知/效果未模拟且喝后重问。这是待独立策略任务核对的建模覆盖，完整dirty源码缺失，不判新纯bug。当前计算下注/least-loss及有限参考范围已有实现，本局不新增“漏重抽”bug，也不覆盖0239既有上线。',
f'- 本批提案{",".join(P)}；source_task=experience-update、target_task=strategy-proposal，实际combat/potion/sl/terminal，16变更全部有experience链接、证据局层回合、账本、旧/新行为、样本/时间留出、反例、限制/验证和回退。未登记implemented/shipped；经验数据发布不代表策略代码已实现。',
'\n### 代码问题（不给 DS）\n','- 没有新控制器纯bug。末沙虫least-loss报HP−8，与31攻击/23HP对应；首全败参考、重试实胜不是完整模型输入配对错误的充分证据。未执行护栏/不同药时点/强制能力/改路线与营火/组件移除整场结局均未知。',
'- 临时实帧核验初稿把十五胜房损血误加为312，原16房逐项实际和为212；verify-initial-failure保留，按实帧纠正为56+147+39−7−212=23后34项过。没有改控制器。首测试显式CHARACTER=silent使默认角色固定测试环境改变，原全套失败日志/退出码保留；重跑只恢复固定测试默认环境，不改测试、排除名单或数据。',
'- 缺完整dirty源码、部分归零/毒结算/召唤/同ID持久身份与毛伤、SL截断出口、未执行方案整场、boss时钟构筑估伤/需估比、三幕/F48→F49数据；策略提案证据不足保留现行为。失败日志/初稿/工作树保留。',
'\n### 测试\n',f'- 最终原入口agent/bash tools/test-sandbox.sh，TMPDIR本批目录、PATH本机node、nice19/1worker，tsc退出0，vitest{tests["files"]}文件/{tests["cases"]}用例/退出0。首轮日志/非零退出保留test-source，最终恢复固定测试默认CHARACTER后完整重跑test-source-final；没有改测试/预算/固定排除名单。完整沙箱外套件由调度器补跑，不冒报。',
'- JSON/唯一id/合法scope中文名/12位角色证据/置信度/日期/预算和240配对切片检查通过；旧136局基线完全一致、34原帧断言及132实饮逐个核验通过。check-experience退出0/missing=[]、gitleaks源0、diff --check0。',
f'- 账本只CLI：新增{",".join(L["added"])}；proposed {",".join(L["proposed"])}；退役无；ledger.py check退出0。首证/prior/claim/旧状态和版本保留历史，实际shipped交运维核live，不冒称策略代码实现。',
f'- live流程：{live["result"]}；刷新{live.get("refresh")}；合前{live.get("pre")}；实际合入{live.get("merged")}。']
sections += ['- '+x for x in live.get('conflicts',[])]
if not live.get('merged'):sections += ['- 按任务遇冲突停止，不硬解或覆盖；源提交和刷新保留，完成事件交运维兜底。未实际上线不造decision/eval/Roy通知，不停对局。']
sections += ['\n### 切片大小\n','- 固定种子20260929；从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对。manifest记池/时间/唯一帧，有放回补足另记；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结相同common/silent/outcome，仅换经验。','\n| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for s in S['pairs']:sections.append(f'| {s["sample"]} | {s["before_median"]}/{s["before_max"]} | {s["after_median"]}/{s["after_max"]} | {s["paired_median"]} |')
sections += [f'\n- 整体中位{S["before_median"]}→{S["after_median"]}，涨{S["median_change"]}字；配对差中位{S["paired_median"]}，最大{S["before_max"]}→{S["after_max"]}，单片最多增{S["max_change"]}。',f'- active{U["after"]["active"]}/正文{U["after"]["chars"]}；置信度{U["after"]["confidence"]}；A8适用{U["after"]["asc"]["8"]["entries"]}条/{U["after"]["asc"]["8"]["chars"]}字、A9适用{U["after"]["asc"]["9"]["entries"]}条/{U["after"]["asc"]["9"]["chars"]}字、A10适用{U["after"]["asc"]["10"]["entries"]}条/{U["after"]["asc"]["10"]["chars"]}字。无合并/退役，未超预算；需Roy定：无。',f'\n原帧/复算/机制/提案/CLI/测试/切片/合入回执：{O.resolve()}；报告时间{now}。\n']
body='\n'.join(sections)
(O/'changelog-section.md').write_text(body)
(O/'report.md').write_text(body)
result=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=U['added'],updated=U['updated'],retired=0,active=U['after']['active'],mechanisms=[m['id'] for m in mechanisms],tests=dict(tsc=0,vitest=0,cases=tests['cases']),ledger=dict(added=L['added'],proposed=L['proposed'],retired=[],check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
if '--append' in __import__('sys').argv:
    dst=ROOT/'paper/materials/experience-changelog-silent.md'
    assert heading not in dst.read_text()
    with dst.open('a') as h:h.write('\n\n'+body)
print(json.dumps(result,ensure_ascii=False))
