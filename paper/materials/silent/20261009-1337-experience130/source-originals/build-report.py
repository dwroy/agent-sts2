import collections,hashlib,json,os,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
def read(name):return json.load(open(O/name))
A=read('audit.json');C=read('changes.json');U=read('update-summary.json');Z=read('slice-summary.json');Q=read('mechanism-evidence.json');R=read('run-metadata.json');P=read('code-proposals-results.json');MAPPING=read('ledger-map.json')
source=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
MERGE=read('live-merge.json') if (O/'live-merge.json').exists() else dict(merged=None,result='待源测试及提交')
T=read('test-results.json') if (O/'test-results.json').exists() else dict(tsc=0,vitest=None,files=None,cases=None,rerun=False)
L=read('ledger-results.json') if (O/'ledger-results.json').exists() else dict(added=[],proposed=[],retired=[],check=None)
names={
 'silent-deck-burst-observation':'候选、能力与最终执行（观察）','silent-strength-weak-observation':'力量逐击/敏捷逐牌与虚弱','silent-footwork-block':'步法敏捷兑现时点','silent-noxious-fumes-growth':'毒雾轮初补毒','silent-frail-card-block':'脆弱逐牌挡与首卡消费','silent-orichalcum-zero-block':'奥利哈钢零挡末挡','silent-wither-end-turn-loss':'凋萎持牌伤与毒胜','silent-aeonglass-artifact-growth-sl':'沙漏制品/敌成长与SL（观察）','silent-queen-poison-main-target':'女王三减益/魂缚与目标（观察）','silent-queen-poison-window-sl-observation':'女王同抽重打（观察）','silent-mad-science-custom-strangle':'科学现场定制力敏','silent-paels-legion-card-block-double':'佩尔首张牌挡翻倍','silent-bronze-scales-per-hit-thorns':'铜质鳞片逐击反伤','silent-eternal-feather-rest-arrival-heal':'羽毛到火回复','silent-stone-humidifier-rest-growth':'加湿器HEAL增上限','silent-double-boss-resource-handoff':'连战实际血药接续（观察）','silent-ghost-in-a-jar-current-turn':'幽灵当轮无实体','silent-petrified-toad-opening-rock':'新战石头与SL恢复','silent-act-transition-missing-hp-heal':'跨幕缺血回复','silent-poison-potion-observed-application':'毒药实施毒与实结算'}
def esc(s):return str(s).replace('|','／').replace('\n',' ')
title=f'## 2026-10-09 静默猎手 第一百三十次增量：1 局 A10（version 2026-10-09.19，分支 exp-silent，{source[:8]}）'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
(O/'report-time.txt').write_text(stamp+'\n')
lines=[title,'','### 来源','',
 f'- 记录时间{stamp}。只读根notes/lessons.md:7909静默小节及run-1009-1232-RMNXHZKV716Y.md对应复盘，未见目标勘误；runs.jsonl:648为SILENT/A10/F49败、6519b8909+dirty。完整dirty运行源码未保存；当前源码只定位，未冒充运行树。目标局没有跨角色跳过，last_seen取run-1009日期。',
 '- 开工exp-silent干净，git merge --no-edit main无冲突快进79467949e。README、最新STATE、decision-log末尾、学习协议、提案闭环、首次构建/最近两批方法、账本README已读。自己做、不派agent、不联网、不运行play；nice19单进程抽数、原沙箱固定数据单worker，不跑boss模拟池。',
 f'- 全引擎silent学习观察截止{A["cutoff"]}：167已结束局/2416独立战斗房/157实际死；分阶{dict(collections.Counter(r["ascension"] for r in R))}。旧166局只做数字/机制验证；不冒称纯Codex爬塔战绩。无character旧铁甲、其他角色、进行中与切点后局排除。',
 '- 按run id rg抽981决策/51脑记录/11SL/9计划；states/reasoning二分字节seek时间窗03:35:24.633Z—04:32:36.657Z抽1059状态/0推理，核state.run.character_id。2064项原字节偏移/SHA及抽取全等通过，1164项参数/角色/条目验证通过。脑记录51含一条run-plan、实际决策脑50次均Codex；ds兼容字段不是DeepSeek引用。',
 '- 口径同前：同房首COMBAT入口HP−末次退出HP为战内净损，含自损/回复；SL同房一场，判死截断不计实际死亡。Monster才算走廊，Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient，同战可接多节点，HEAL后战另去重。房/局/节点/动作分母分开，未列组合n=0。',
 '- 旧166局全部重新逐局analyze/audit，七数组、血档/节点、回血及SL均全等：'+esc(read('baseline-check.json'))+'。流式筛读截止内静默历史复盘713段机制，逐条证据进阶/参数留mechanism-evidence.json。主题支持局数不是逐公式受控实验；遗物所列战房数不是触发次数。',
 f'- 新增0、更新22（加证据22、只改数字0）、退役0；active196→196，正文51694→{U["chars"]}字符。低于55000压缩线及60000预算；没有合并/预算压缩/退役，案例改写净减297。只改silent/experience.json；其他角色与打法源码未改。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,q in zip(C,Q):
    e=c['after'];lines.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{q["asc"]}；账本{",".join(MAPPING[e["id"]])} | {esc(e["lesson"])} |')
lines+=['','新局22独立房：SL同房一场、末次真实退出或实际死亡计净损。','','| 层/幕/房型 | 首帧敌人 | HP入→出/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
    if f['run']=='RMNXHZKV716Y':lines.append(f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines+=['','- 三幕走廊实耗44、问号挑战0和雕刻师获胜52分开；九次火堆六HEAL净回176、三锻造不另回，八次到火羽毛另回114（F8无羽毛回复），两者分开。两跨幕16/85→71回55、31/90→78回47。七次SL从存档恢复：两次F48回100并各复两药、五次F49回13并各复一石，不能当回血/新获药。',
 '- F48最后T13敌32血62毒足够收尾，仍有15持牌伤、6末挡，实22→13后胜；535/13≈41.15为已观察每轮净HP进度，不含敌挡/过量，不作时钟估值。F49末T4玩家1血0挡、末6挡对19需损13，存活至少差13血；实际血损只到0。两敌残349/133，没有达成击杀顺序实证。',
 '- 用药22选择：18条completed成功、3条pending后帧证实药槽消耗、1条not dispatched排除，真实成功21=普通15+投石6。旧audit动作抽取仍只含completed以保证历史一致（本局18）；新增pending-potion-evidence.json保存三条后帧，不把原口径18称全实际21。毒药42证据局168次completed中本局3次均已实饮，无这项漏计。',
 '', '全阶非空房间入口血档，活房净损中位与实死分列。','', '| 进阶/幕/房型/血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for x in A['bands']:
    if x['n']:lines.append(f'| A{x["asc"]}/幕{x["act"]}/{x["type"]}/{x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{x["deaths"]/x["n"]:.2%} | {x["median_win"]} |')
lines+=['','非战斗节点入口血关联下一战：节点作分母，可多个节点关联同战，不作改线干预因果。','','| 进阶/幕/节点/血档 | 节点/独立后战 | 死/率 | 活损中位 |','| --- | --- | --- | --- |']
for x in A['transfers']:
    if x['n']:lines.append(f'| A{x["asc"]}/幕{x["act"]}/{x["screen"]}/{x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{x["deaths"]/x["n"]:.2%} | {x["median_win"]} |')
lines+=['','主动HEAL及后战（独立火与动作次数不同，其他动作可含同火再选择）。','','| 进阶 | 完局/独立火 | HEAL/其他动作 | 实回HP | 去重后战/死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in read('rest-summary.json'):lines.append(f'| A{x["asc"]} | {x["runs"]}/{x["rests"]} | {x["heal"]}/{x["smith"]} | {sum(x["gains"])} | {x["nexts"]}/{x["deaths"]}/{x["deaths"]/x["nexts"]:.2%} | {x["median"]} |')
lines+=['','- 低血走不同节点仅观察比较：XZUJR08FW801问号两胜46→23→5后走廊败；NTMAU4XZ2NN2低血休息到66、走廊再耗23后精英败；本局三幕避精英仍损96，末火满100后双王败。构筑/敌人/入口不同，未走另一条线无实打，不称改路线必然更好或拟安全血线。',
 '', 'SL分阶汇总：attempt>1的同房分组，真实won尝试单列。','','| 进阶 | 重打房 | 尝试 | 赢的尝试 |','| --- | --- | --- | --- |']
for x in read('sl-summary.json'):lines.append(f'| A{x["asc"]} | {x["fights"]} | {x["attempts"]} | {x["wins"]} |')
lines+=['','| 本局房 | 场/试/赢 | 相同抽序前缀 | 差异与限制 |','| --- | --- | --- | --- |',
 '| F48沙漏 | 1/3/1 | 前33张 | 同100血毒/幽灵，前两T11判死截断、第3T13赢；第2试护栏后重问，第三重放又截断候选，幽灵饮药9/10/10轮与后序同变。两份意图预算28/58不是实际已掉血；胜因不能归单牌或药时点。 |',
 '| F49女王 | 1/6/0 | 前20张 | 同13血石头，前五T3/4/4/2/4判死截断，末T4实死；牌序/能力时点、目标/护栏与SL同变。无赢的一次、无实际击杀序配对，不虚构胜法或把失败归运气。 |',
 '- 完整draws/explore与sl_attempt决策留sl-comparisons.json。same_prefix草稿曾误迭代draws对象五个键，已更正为order数组前33/20；原脚本/日志保留，不当游戏bug。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 本局实际Codex、DeepSeek推理窗0，没有逐条经验引用原话可证明经验诱导错误；以下只列真实理由及实际兑现。',
 '- d312746：“悖论无副作用，三火避精英，经商补毒敏。”三幕确避精英、三火实际两HEAL，走廊/问号仍损96；另一条路线未实打。p2881—2883要求保第二场HP，有连战备战意识。',
 '- p2884：“Only the unknown second boss remains: 13 HP, no carried potions, no healing rooms.”译：仅剩未知第二boss、13血、无携带药与回血房。F48出口13空药兑现；F49开场石头是新产物，不反驳“无携带药”。',
 '- d313188/313190：“no end-of-turn block, Regen or Buffer the flag leaves out”。预计损10及实11→1已计奥利哈钢6挡，错在注记解释；不是实值漏算、没有11次额外用药，不认作败因。',
 '- 四护栏题面省血合52，前三经过抽弃重问/SL重放未完整执行；首女王T2实损2而撤毒雾/科学。想拿触媒不等拿到，未打能力不等已有增益，不能把候选/计划当真实收益。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c,q in zip(C,Q):
    e=c['after']
    if e['id'] in names:
        text,case=e['lesson'].split('典型案例：',1);lines.append(f'| {names[e["id"]]} | {esc(text)} | {e["n_support"]}/{e["n_contradict"]}；{q["asc"]}；参数{q["actions_or_rooms"]}个completed动作/房、{q["parameter_runs"]}局；不当逐公式隔离分母 | {esc(case)} | {e["id"]} |')
lines+=['','- 机制保留[0,20]，数值仅已观察条件；策略/统计保留既有适用范围、连战只A10。失败不自动作机制反例；不拿泛主题局数充单因证明。科学/步法没有即时牌挡，收益须活到后续挡牌窗口；末女王只1血而需要13损，无挡牌兑现新敏捷，解释局部能力为何未救活而不声称禁用能力会赢。',
 '', '### 新增','','- 无，同主题并入已有条目。','', '### 更新','']
for c in C:lines.append(f'- {c["id"]}：{c["before"]["n_support"]}→{c["after"]["n_support"]}，补RMNXHZKV716Y证据及核实案例；原适用范围/反例保持。')
lines+=['','### 退役','','- 无，没有新反例多于支持、对应规则被本批代码修复或重复条目须退役。',
 '', '### 和手写知识及代码冲突','',
 '- 手写知识改动：无。silent另外八份JSON核字段/生成样本和时间/自身统计与模拟口径，没有本局直接反驳的手写规则；老生成数据不当新截止全样本，不覆盖刷新。SHA与核验留other-knowledge.json。',
 '- 当前turn-solver.ts:2975已把遗物末挡放blockAtEnd，:3083的endTurnGuards漏列奥利哈钢，与本局正确损血/错误注记吻合；沿原复盘silent-0338专用提案，不把已计6挡退役成“规则修好了”、不重复写bug。本文不改打法源码/运维prompt。',
 '- 四份source_task=experience-update、target_task=strategy-proposal提案'+','.join(P)+'覆盖22变更active条目，涉及combat/potion/sl/terminal；均pending。护栏/能力时点/药水及实际交接先核live等价性，只有真实live祖先源码commit才可声称implemented/duplicate；本批不冒称代码实现或账本shipped。',
 '', '### 代码问题（不给 DS）','',
 '- 新纯bug诊断漏项已有复盘silent-0338及proposal-diagnostic.md链，其他观察保留已核游戏数据。52题面省血不是实得血、满血首boss耗87不是一个错误造成，不把机制支持加作repeat。',
 '- 抽取验证首稿把audit completed用药18当真实成功21而断言失败，已以三条pending后帧核实补充说明；保持旧数组口径，原脚本及失败日志留存。SL前缀草稿对象键误读已更正33/20，初稿保留。',
 '- 缺完整dirty源码、七次判死的真实致死结算、逐击毛伤/过量、原护栏线/保药/早饮/改路线/构筑整场反事实、永久敌GUID、boss时钟/实付脑费用。有限全败模拟不证所有打法必死，未知不补。',
 '', '### 测试','',
 f'- 原bash agent/tools/test-sandbox.sh，TMPDIR本任务scratch、PATH本机node、SANDBOX_WORKERS=1，固定排除和固定数据；tsc {T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}，重跑{T["rerun"]}。未改预算/测试，完整外部检查由调度器续验。',
 f'- JSON合法、diff --check、gitleaks、check-experience missing=[]退出0；ledger.py check {L["check"]}。账本新增无，proposed {",".join(L["proposed"])}，退役无；只CLI追加，旧claim/首证/prior/版本/历史保持，实际shipped由运维核完成事件登记。',
 f'- 锁内live结果：{MERGE["result"]}；刷新{MERGE.get("refresh")}、合前{MERGE.get("pre")}、实际合入{MERGE.get("merged")}，合后沙箱{MERGE.get("tests_retry",MERGE.get("tests"))}。']
for x in MERGE.get('conflicts',[]):lines.append('- '+x)
for x in MERGE.get('overlap_conflicts',[]):lines.append('- 刷新知识交叠：'+x)
if not MERGE.get('merged'):lines.append('- 未实际合入，待调用方/运维据原件兜底；冲突不硬解、不覆盖刷新，不造上线版本/通知，不停对局。')
else:lines.append(f'- 唯一上线版本{MERGE.get("eval_version")}、发布{MERGE.get("publication")}；Roy双通知已经追加；原记录/知识刷新保持。')
lines+=['','### 切片大小','',
 '- 固定20260929种子，以截止内state.run.character_id=silent的最高两阶A9/A10，各20状态×六种界面共240配对。各池均足20，官方knowledge-slice.ts加CHARACTER=silent，只替换经验；其他common/silent逐字节相等，outcome快照注入相同。样本/时间戳和输出留sample-manifest/slice-*。',
 '', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for x in Z['rows']:lines.append(f'| {x["sample"]} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["paired_median"]} |')
lines+=['',f'- 整体中位{Z["before_median"]}→{Z["after_median"]}（{Z["after_median"]-Z["before_median"]:+}字），配对差中位{Z["paired_median"]:+}；最大{Z["before_max"]}→{Z["after_max"]}，单片差{Z["diff_min"]}至{Z["diff_max"]}。',
 f'- active196/正文{U["chars"]}字符；置信度{U["confidence"]}；A8 {U["applicable"]["8"]}，A9 {U["applicable"]["9"]}，A10 {U["applicable"]["10"]}。没有预算压缩/合并/退役；需要Roy定：无。','',f'原件/偏移/失败/初稿、复算/参数/SL、CLI/提案、切片/测试/合入预检及报告留{O}。','']
section='\n'.join(lines);(O/'changelog-section.md').write_text(section)
result=dict(task='experience-update',version='2026-10-09.19',commit=source,merged=MERGE.get('merged'),added=0,updated=22,retired=0,active=196,mechanisms=list(names.values()),tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=L,code_proposals=P,implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'report.md').write_text('# RMNXHZKV716Y 静默经验更新报告\n\n'+section+'\n```json\n'+json.dumps(result,ensure_ascii=False)+'\n```\n')
if '--append' in sys.argv:
    assert source!='待提交' and T['vitest']==0 and L['check']==0
    scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=section,text=True,capture_output=True);(O/'gitleaks-changelog.log').write_text(scan.stdout+scan.stderr);assert scan.returncode==0
    path=ROOT/'paper/materials/experience-changelog-silent.md';old=path.read_bytes();assert title.encode() not in old
    stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();(O/'changelog-append-time.txt').write_text(stamp+'\n');body=('\n'+section).encode();fd=os.open(path,os.O_WRONLY|os.O_APPEND)
    try:os.write(fd,body);os.fsync(fd)
    finally:os.close(fd)
    new=path.read_bytes();assert new[:len(old)]==old and new.count(title.encode())==1
    (O/'changelog-append.json').write_text(json.dumps(dict(previous_bytes=len(old),previous_sha256=hashlib.sha256(old).hexdigest(),own_bytes=len(body),prefix_identical=True,title=title),ensure_ascii=False,indent=2)+'\n')
print('报告完成；追加', '--append' in sys.argv)
