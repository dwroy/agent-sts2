import collections, fcntl, hashlib, json, re, statistics, subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
clock=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
C=json.load(open(O/'changes.json'))['entries'];S=json.load(open(O/'update-summary.json'));A=json.load(open(O/'audit.json'))
M=json.load(open(O/'live-merge.json'));R=json.load(open(O/'run-metadata.json'));MAP=json.load(open(O/'ledger-map.json'))
title=(O/'changelog-title.txt').read_text().strip();commit=(O/'source-commit.txt').read_text().strip()
proposals=json.load(open(O/'code-proposal-ids.json'));added=json.load(open(O/'ledger-added.json'));proposed=json.load(open(O/'ledger-proposed.json'))
slice=json.load(open(O/'slice-summary.json'));before=json.load(open(O/'slice-before.json'));after=json.load(open(O/'slice-after.json'))
test=(O/'test-source.log').read_text();files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',test)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',test)))
assert files==248 and cases==2608 and (O/'test-source.rc').read_text().strip()=='0'
mechanisms=[]
names={'silent-strength-weak-observation':'力量/敏捷与逐段来源','silent-deck-burst-observation':'实际启动与输出窗口','silent-act-transition-missing-hp-heal':'跨幕缺血回复','silent-ceremonial-beast-threshold-growth-sl':'仪式兽阈值与后段成长'}
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    mechanisms.append(dict(id=e['id'],name=names.get(e['id'],e.get('name',e['id'])),conclusion=e['lesson'].split('机制：')[0].rstrip('。'),reason=e['lesson'].split('机制：')[1].split('搭配：')[0].rstrip('。'),case=e['lesson'].split('典型案例：')[1],n=e['n_support'],contradict=e['n_contradict'],asc=e['asc']))
(O/'mechanisms-summary.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
lines=[title,'','### 来源','',
 f'- 记录时间{clock}。只并入79UCJ0K6R9C1/NEWRFAYKTQHR两节静默猎手复盘；runs.jsonl:606/607均SILENT/A10，未跳过。run-1008-0934/run-1008-1009局报日期为2026-10-08；按10:13:32的休息出处及10:14:07的护喉甲/蛇之戒指/百年积木名称勘误。',
 '- exp开工干净，git merge --no-edit main无冲突快进769eed12；独立完成、未派下级。已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法及最近两节、账本README；只改本角色经验，所有抽取/复算nice19、无联网/安装依赖/play或boss模拟池。',
 '- 新两局按run id重抽235/658决策、14/30实际Codex脑日志、0/10 SL摘要、1/6计划及Jev原题；states按UTC窗seek并核state.run.character_id=SILENT，243/675帧。DeepSeek推理窗均0；DeepSeek任务栏及ds_*是兼容名，不能冒称DeepSeek在本两局引用经验。',
 '- 新局切窗2026-10-08T01:22:05.327Z—01:33:59.091Z、01:39:07.178Z—02:09:41.113Z；states字节起9081820992/9088102061，末9088064548/9109566646，完整偏移JSON与原文留本批目录。运行f8947651+dirty/cecc8317+dirty完整dirty源码未保存，当前源码只作覆盖审计。',
 '- 全引擎学习观察截至2026-10-08T02:09:41.113Z共126个静默完局，A0—A10为7/3/2/1/4/1/11/7/1/3/86；1827战斗房、116实死。不代替纯Codex爬塔成绩；排除缺character的旧铁甲局、其他角色、进行中和切点后局。其余124局只用本角色历史主题验证/重算数字，未把未指定的新复盘并入。',
 '- 口径沿第94节：第一COMBAT入房HP减同房最终尝试退出HP；开场回复/负净损保留，实死单列。Monster走廊、Unknown问号战另列；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除，多源可同战；回血后战去重，独立营火/动作数分别计。',
 '- 旧124局七数组逐行、所有血档/节点转移/实回复及SL重算一致，无数字偏差。新两局7/16房，各只有1次实死；NEWRFAYKTQHR前六次判死SL不补未执行末结算、不当六次实死/独立局。',
 f'- 新增3、更新20（20条加证据、0条只改数字）、退役0；active170→173，正文50180→50115；high104/med43/low26。开工未过55000，同主题并回原条目，压短重复案例；不改60000测试预算，旧全文/证据/反例保留before/changes。原机制中的规则及案例仍可从before和历史日志追溯。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
ev={r['id']:r for r in S['evidence']}
for c in C:
    e=c['after'];k=e['id'];m=ev[k]
    lines.append(f'| {k} | 支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{m["by_asc"]}；新证{",".join(c["new_runs"])} | {e["lesson"]} |')
lines += [
 '| 79UC赢战资源链 | F2/3/4/6/8/12净损0/0/0/9/40/19合68；雕像敌伤55−再生15=净40；三火各21合63；56−68+63=51进末精英 | 净损不能直接称敌伤；未来商店/营火不预支，替线未知 |',
 '| NEWR赢战资源链 | 一幕九走廊合损54、boss损23；F7事件实回19、F16火21、跨幕回40；二幕四走廊合损46、蜂群最终损26，三火合63 | F28赢损26到8，F29回21后29进棱柱；药水/SL恢复与真实回复分账 |',
 '| 药水与SL恢复 | 79UC新获4/饮4/弃0/SL0；NEWR新获12/原始18饮/最终路径12饮/弃0，6次SL恢复165HP及原瓶6 | 恢复不是新获药或回血；不把随机药生成能力带到后战，无早喝/留药胜因 |',
 '| 棱柱同手局部对照 | 首/第三/末T2同28HP、151敌血4毒、2力量及五同牌；原3损/30扣，末SL8损/23扣；两候选24/24模拟死 | 删毒并先蜃景少7挡/少7实伤/多损5；后轮同变，不能说单步导致整场败，也非Jev/HP护栏替换 |',
 '| 历石与毒联合上界 | 蜂群首/次T7敌57/59HP，当前代码hit52和毒13/22分别不足、合65/74；前三判死未结；末52HP/9毒/8HP零挡实赢 | 当前mayDie单源判断缺口留0287纯bug记录；真实赢只记末试，不反算历石精确值 |',
 '| 感染末轮 | 79UC T11手三感染9、2HP/7挡先死，虫仍8HP/10毒；T10两感染6后敌18攻失11 | 严格存活差1HP，毒非即时伤，未执行敌攻击不补入实伤；原题已预测T6/T10感染，不报全面漏算 |',
 '| 短推演与构筑启动 | 79UC T3三案均0/8实赢，空过后T3—5本体45不变；T7才首次毒，累计101/144余43；NEWR末四轮57/171余114 | 估计76%非实赢，0赢样本非必死；持牌/预期/前战能力不等本场实际建立 |',
 '| 進阶 | 机制[0,20]；路线/休息/构筑[8,20]保持，各阶数字单列；未观察升级/叠层/反事实未知 | 未扩大低阶策略或迁移角色知识，失败局可支持限定机制而不证明打法因果 |',
 '', '旧基线七数组复算：','', '| 数组 | 旧 | 新 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
lines += ['', '各进阶/幕/战斗房型非空入血档；完整病例与逐房净损见audit.json：','', '| 进阶 | 幕 | 房型 | 血档 | 房/独立局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]:.2%} | {r["median_win"]} |')
lines += ['', '休息/商店/普通问号事件按源节点入血关联下一战，源节点数可重复对应同战，不据此作路线因果：','', '| 进阶 | 幕 | 源节点 | 血档 | 节点/后战去重 | 实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]:.2%} | {r["median_win"]} |')
lines += ['', '各阶休息与SL多次尝试：','', '| 进阶 | 完局 | 独立火/回血动作/实回HP | 回血后战/实死/活损中位 | 真正重打场/尝试/已赢 |','| --- | --- | --- | --- | --- |']
rs=json.load(open(O/'rest-summary.json'));sl=json.load(open(O/'sl-summary.json'))
for r,q in zip(rs,sl):lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {q["fights"]}/{q["attempts"]}/{q["wins"]} |')
lines += ['', '低血不同节点对照仅观察：A10二幕<25%时REST 18节点/5死、SHOP 4/1死、EVENT 12/4死；构筑、层数、进场回血与怪不同，不能把5/18对1/4作休息或改线因果。NEWR F12及F21改线有原计划/实际路径，但旧线未打；79UC未改线，未到F15—17。A8仅1局、A9仅3局，完整分阶表保留，不能套A10风险率。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 本两局无DeepSeek问答，实际Codex脑44次调用；兼容字段不算引条目。brain.knowledge和题面完整留档，未找到能够独立确认“某条经验错误直接导致败局”的因果链。',
 '- 79UC F1原话“先战斗补输出，双商店强化，四营火支撑两精英。”实际F14前只三火、51HP，不是投影70HP。F13回复到51的动作完成，之后仍败，不写回血没执行或路线一定错误。',
 '- NEWR F18原话“士兵强化毒防；双商店、单精英路线降低风险。”F21原话“Upgraded poison improves consistent damage and Mirage defense. Reroute through immediate post-elite healing and another shop for defensive preparation.”随后实际改两精英路线。中文译意：升级毒支持持续输出与蜃景，精英后回血并去店；实回血/购药完成而最后仍败，替线未打，不写计划已经保证安全。',
 '- 蜃景收益的经验在原SL线中未兑现：末试Jev0.76仍选先毒后蜃景，SL改先蜃景并删毒；11→4挡和30→23实扣已核。后问0.96结束，原线整场未执行；这给0079的已有repeat和0135的局部差额补来源，不新增“Jev忽略知识”结论。',
 '- 79UC T3空过被Jev0.89实际选择，短推演各0/8实赢；尾端估计不当获胜对照。能力在牌组但尚未打出、毒药水加毒但未结算、前场生成毒雾/余像未带入棱柱，均写明实际时点。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for m in mechanisms:
    distribution=ev[m['id']]['by_asc']
    lines.append(f'| {m["name"]} | {m["conclusion"]}；{m["reason"]}；搭配与整战限制见条目 | {m["n"]}/{m["contradict"]}，证据分阶{distribution}；适用{m["asc"]} | {m["case"]} | {m["id"]} |')
lines += ['', '- 感染11局含A4最早牌文，10局32次已执行结束；精确“玩家先死阻断毒”仅79UC末轮隔离，其余免减伤未知。历石只1局、两场真实结束胜，不反算52常量。坚韧之环6局24次施放/建立2次，临时敏撤后仍11的快照证据是ZVYUL2YP3518，不将其写成所有组合皆验证。',
 '- 毒/力量/敏捷/能力局部机制与整局胜因分账。蜂群四试末次赢，前两次联合结束上界没执行，不把读档误认抽牌运气；棱柱四试均败，只有同手T2即时差额受控，后轮和洗牌不受控。',
 '', '### 新增','']
for c in C:
    if c['before'] is None:
        e=c['after'];lines.append(f'- {e["id"]}（{e["scope"]}、{e["confidence"]}、支持{e["n_support"]}/反例0）：{e["lesson"]}；账本{",".join(MAP[c["id"]])}。')
lines += ['', '### 更新','']
for c in C:
    if c['before']:
        b=c['before'];e=c['after'];lines.append(f'- {c["id"]}：支持{b["n_support"]}→{e["n_support"]}，反例{b["n_contradict"]}→{e["n_contradict"]}；新证{",".join(c["new_runs"])}；正文{len(b["lesson"])}→{len(e["lesson"])}字，账本{",".join(MAP[c["id"]])}。')
lines += ['', '- 更新20条全部追加本角色新证据，无只改数字条目；统计/次数同时重算。未单独腾位或退役，重复逐局叙述在同条目压缩，完整旧文/案例/反例留before/changes；正文净减65字。',
 '', '### 退役','', '- 无。未以源码当前存在某个分支就退役真实机制事实；没有已实现代码提案或新shipped登记。',
 '', '### 和手写知识及代码冲突','',
 '- 本角色其他知识文件8份核对并存SHA/元数据（other-knowledge.json）；均为生成统计/模型或限定观测的double-boss/boss-trust，没有手写攻略/手册要改。生成数据的较早切点不当事实反例，double-boss仅4局/未校准/不判必死限制保持；本两局未实到F48/F49，不据此重拟终局HP/药水价值。改了的手写知识：无。',
 '- 当前源码judge.ts:1333 mayDie仍只检查hit或poison单源够不够；与NEWR F28前两试的共同结束可能有冲突，原纯bug0287保留observed，专门提案关联0288。感染T6/T10原题已计伤，不报整体缺机制的新bug。其他卡牌/药水分支覆盖、坚韧之环快照、SL饱和即时差额由独立策略任务检查现有live祖先，未验证保持原行为。',
 '- 本批五个CLI记录（四主题加一次领域更正）：'+','.join(proposals)+'。来源experience-update、实现strategy-proposal；账本、经验、run/floor/turn、反例/未知、当前/拟议行为、固定验证及回退均在提案。初始infection误把末轮死亡时点列terminal，追加e6f9cb57更正为combat/potion，原稿/JSON/队列保持。实际实现范围combat/potion/sl；没有终局价值/structure改动。',
 '', '### 代码问题（不给 DS）','',
 '- 新纯bug只有复盘已登记的silent-0287：历石和毒联合上界在mayDie未相加。本任务不改打法源码，不另重复建bug；当前52常量不作为本局独立机制伤害，未执行末结算不写已赢。',
 '- 缺dirty完整源码、前三蜂群/前三棱柱退出及末结算、未走路线、提前喝药/另目标/原SL线整场反事实、历石独立实伤和触发先后、环升级/重放/叠层、F32/F33与F48/F49资源；全败有限模拟不改必死边界。原初稿、领域更正、脚本/CLI、失败/冲突日志与工作树全部保留。',
 '', '### 测试','',
 '- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19，默认4workers；tsc0、vitest0，247文件2597例加paths单fork1文件11例，合248文件2608例。主阶段245.87秒，首次通过，无失败重跑/限时诊断。完整沙箱外套件待实际合入后调度器补跑，此次未合入不冒报完整检查。',
 '- JSON/字段/角色局号/支持反例/置信度/scope中文名/预算、旧124局逐行基线、药水逐饮、感染终轮和棱柱同手、固定240配对切片、check-experience missing=[]/0、gitleaks源0/刷新0及diff --check通过。经验预算测试自身读铁甲文件，本角色额外由validation.json独立校验，未改测试。',
 '- 学习账本只经CLI：新增'+','.join(added)+'；proposed '+','.join(proposed)+'；退役无；ledger.py check退出0、289条/0问题。首证/prior/原claim/repeat与旧上线历史保留，实际shipped由运维核验。0287只关联提案、不转proposed；0289先登记observed供提案校验，源提交后转proposed。',
 f'- live实际合入：{M["merged"]}；锁内刷新提交{M["refresh"]}、合前{M["pre"]}；刷新知识重叠为空。整分支预检20处并行记录冲突，按任务停止、不实际合并/硬解，保留刷新及原notes/fight-value-backtest-silent.md未提交改动。合后测试未执行，不造上线decision/eval版本或Roy规则通知。源码提交{commit}及完成事件交运维兜底。',
 '']
lines += ['- '+x for x in M.get('conflicts',[])]
lines += ['', '### 切片大小','', '- 固定种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对；sample-manifest.json记录池与时点。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome数据，切片前后只换经验，未联网。',
 '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对增量中位 |','| --- | --- | --- | --- |']
for b,a in zip(before,after):lines.append(f'| {b["sample"]} | {b["median"]}/{b["max"]} | {a["median"]}/{a["max"]} | {statistics.median(y-x for x,y in zip(b["sizes"],a["sizes"]))} |')
lines += ['', f'- 整体切片中位{slice["before_median"]}→{slice["after_median"]}、增{slice["median_change"]}字；配对差额中位+{slice["paired_median_change"]}；最大{slice["before_max"]}→{slice["after_max"]}，单切片最多增{slice["max_increase"]}字。',
 '- active173/正文50115，high104/med43/low26；A8适用162条46155字、A9适用163条46439字、A10适用170条49023字。需要Roy定：无；合入受并行记录冲突阻塞，由运维按源提交兜底，不需要新增知识审批。',
 '', f'本批原帧/复算/机制/提案/CLI/测试/切片/合入冲突回执：{O.resolve()}；报告时间{clock}。','']
text='\n'.join(lines)
(O/'changelog-addition.md').write_text(text)
completion=dict(task='experience-update',version=S['version'],commit=commit,merged=M['merged'],added=S['added'],updated=S['updated'],retired=S['retired'],active=S['after']['active'],mechanisms=[m['name'] for m in mechanisms],tests=dict(tsc=0,vitest=0,cases=cases),ledger=dict(added=added,proposed=proposed,retired=[],check=0),code_proposals=proposals,implementation_domains=['combat','potion','sl'],report=str((O/'report.md').resolve()))
(O/'completion.json').write_text(json.dumps(completion,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text('# 经验库更新报告\n\n'+text+'\n```json\n'+json.dumps(completion,ensure_ascii=False,indent=2)+'\n```\n')
changelog=ROOT/'paper/materials/experience-changelog-silent.md'
with changelog.open('a+b') as h:
    fcntl.flock(h,fcntl.LOCK_EX);h.seek(0);existing=h.read()
    assert title.encode() not in existing,'本节已经追加，停止重复写'
    h.seek(0,2);h.write(('\n' if not existing.endswith(b'\n') else '').encode()+text.encode());h.flush()
    (O/'changelog-append-receipt.json').write_text(json.dumps(dict(old_bytes=len(existing),old_sha256=hashlib.sha256(existing).hexdigest(),appended_bytes=len(text.encode()),title=title),ensure_ascii=False,indent=2)+'\n')
print('报告与第95节追加完成',files,cases,'机制',len(mechanisms),'字符',len(text))
