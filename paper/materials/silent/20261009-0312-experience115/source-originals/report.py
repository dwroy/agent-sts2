import collections,hashlib,json,re,statistics,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));M=json.load(open(O/'ledger-map.json'));H=json.load(open(O/'historical-mechanism-summary.json'));SS=json.load(open(O/'slice-summary.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
date=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
commit=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待自测提交'
heading=f'2026-10-09 静默猎手 第一百一十五次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{commit[:8]}）'
(O/'changelog-heading.txt').write_text(heading+'\n')
live=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else dict(merged=None,result='尚未执行锁内合入')
tests={}
if (O/'test-source.rc').exists():
 rc=int((O/'test-source.rc').read_text());text=(O/'test-source.log').read_text()
 files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text)))
 tests=dict(tsc=0 if 'RUN  v' in text else rc,vitest=rc,files=files,cases=cases,retried=False)
 (O/'test-results.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2)+'\n')
mechanism_ids=['silent-strength-weak-observation','silent-frail-card-block','silent-footwork-block','silent-noxious-fumes-growth','silent-wither-end-turn-loss','silent-snakebite-retained-poison','silent-mad-science-custom-strangle','silent-unmovable-first-card-block','silent-act-transition-missing-hp-heal','silent-double-boss-resource-handoff','silent-deck-burst-observation']
lines=['## '+heading,'','### 来源','',f'- 记录时间{date}；根notes/lessons.md:6661静默猎手P2M3DFJ4DEZ3，节末无另列勘误。runs.jsonl:631核SILENT/A10/F49败，代码3541bc54+dirty，完整dirty源码未知；run-1009-0142局报0字节，不补自动报告。',
'- exp-silent开工干净，git merge --no-edit main无冲突快进至5a6b08fb；自行执行、不派agent，未联网/play/模拟池。仅修改silent experience.json，根变更记录仅追加、本任务账本/提案只经CLI；scratch仅本任务目录，抽取nice19单进程。',
f'- 局号抽取1247决策/51脑/14SL/7计划，states/reasoning按时间窗二分字节seek；1367帧核run_id/character_id=SILENT。决策窗口2026-10-08T16:36:27.865Z—17:42:10.878Z，首观察16:35:48.757Z。脑全Codex、DeepSeek推理0，旧ds字段不当实际引擎。',
f'- 全引擎学习观察截至{A["cutoff"]}：{len(R)}静默完局、{len(A["fights"])}独立房、{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。其余149局只进数字/历史核验，排缺character旧铁甲、其他角色、进行中与切点后局，不称纯Codex爬塔成绩。',
'- 口径同前：战内净损=首COMBAT入房HP−同房末次退出HP，含回复/自损/负值，不是敌毛伤；SL同房只计一房，判死截断不作实死或零掉血。仅Monster走廊，Unknown问号另列；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient；多节点可重复关联，回血后战去重，营火房/动作分列。',
'- 旧149局七数组逐行复算完全相等：fights2155/nexts2053/rests930/cards48581/ends13844/attempts886/growth4287；旧血档、节点转移、休息和SL摘要全部对齐，baseline-check.json。新局20独立房/30COMBAT窗，其中SL统计14行含首试入账，按同房真正多试归组；F48/F49各六试，截断不补未执行结算。35关键核验、753段静默复盘历史检索和卡牌实际动作/遭遇集合交叉核验；原数据保存在本scratch。',
f'- 新增{U["added"]}、更新{U["updated"]}（14加证据、0只改数字）、退役0；active{U["active_before"]}→{U["active"]}，正文{U["chars_before"]}→{U["chars"]}字符。没有预算合并、退役或仅为预算压缩；同scope替换典型案例、旧全文留experience-before.json及changes.json；低于55000压缩线/60000预算。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];hist=next(x for x in H if x['id']==e['id']);n=e['lesson'].split('典型案例：')
 lines.append('| '+e['id']+' | '+str(e['n_support'])+'支持/'+str(e['n_contradict'])+'反例；分阶'+str(hist['by_asc'])+'；账本'+','.join(M[e['id']])+' | '+e['lesson']+' |')
lines+=['| 药水与读档分账 | 14瓶真实新获（8奖励/4商店/2事件）、24次实际饮用/0弃；21次completed、3次待选牌但槽已实空，按实帧计饮；F48同两瓶六试共12饮，五次恢复不是10瓶新获；F49全空 | 不据无留药胜线改变饮用时点或持有价；potion-accounting.json及复盘逐槽/帧可复算 |','','血量路线口径：以下每格按进阶/幕/真实房型分列，n为独立房、支持局不重复；死亡率以实际GAME_OVER计，存活净损中位不含死亡，含回复/自损。无另一节点同盘面实打，不作路线因果。','', '| 进阶/幕/房型/入血档 | 房数/局数 | 实死/死亡率 | 存活净损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','非战斗节点按节点入口血量关联下一更高层首战；同场可被多节点关联，分母是节点、另列去重后战数。回血/商店/事件后资源变化混杂，不按本表设硬路线阈值。','', '| 进阶/幕/节点/入口血档 | 节点数/去重后战 | 后战实死/节点死亡率 | 存活后战净损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','| 进阶 | 完局 | 独立营火/回血动作 | 实回总HP | 去重后战/实死/死亡率 | 存活后战净损中位 |','| --- | --- | --- | --- | --- | --- |']
for b in json.load(open(O/'rest-summary.json')):
 lines.append(f'| A{b["asc"]} | {b["runs"]} | {b["rests"]}/{b["heal"]} | {sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}/{b["deaths"]/b["nexts"]:.2%} | {b["median"]} |' if b['nexts'] else f'| A{b["asc"]} | {b["runs"]} | {b["rests"]}/{b["heal"]} | {sum(b["gains"])} | 0/0/未知 | 未知 |')
lines+=['','SL同场多试表：按attempt>1识别真正重打，attempts行数与实战COMBAT窗口另分，非独立局；赢次只认result=won。','', '| 进阶 | 多试房 | 尝试行 | 赢次 |','| --- | --- | --- | --- |']
for b in json.load(open(O/'sl-summary.json')):lines.append(f'| A{b["asc"]} | {b["fights"]} | {b["attempts"]} | {b["wins"]} |')
lines+=['','本局SL对照：F48六试1赢，前五T11判死，第六T10胜；F49六试0赢，前五T5/T5/T5/T6/T11判死，末T5实死。SL原始14行的单次普通胜出/重打结果分账，不误算14次独立战斗。F48末T5换扫腿/冒泡比同底板旧T5实多损16、多清12，后序也变，无单因胜果；F49第5试聚合体T7后退场仍T11败，无赢次/固定目标顺序。原手、抽牌、explore/sl_explore、实际出牌、弃牌与恢复见逐局analysis及原始JSONL，完整逐轮数据保留复盘，不入知识前缀。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 本局DeepSeek推理0，没有其引用经验id的原话；题面已写连王、计划已保血留药，不能从败局反推经验误导或忘了第二boss。实际Codex记录与执行分开。',
'- d301364原话：“三营火保血，前期补强，再挑战后期精英。”d301646：“零费打击补输出，营火前置避险，补毒与过牌。”d301876：“额外抽牌加速启动；少打精英，留金补强双王。”本局实际F42精英/F43问号战合损44且耗攻击药，未走路线未知。',
'- p2796中文释义是早建步法/坚定不移、移制品、弃凋萎、保血和药面对第二boss。群蛇F47升级后全局未打/未建，不算每牌6伤已执行；将0057的“计划/持有不等实际输出”并入deck，不给SERPENT_FORM机制条目增加未施放支持。',
'- d302596计划生存者后中和，d302598却以0.23信心弃中和；原3损未兑现，实际36攻对24挡损12。先弃牌/重算后实际效果才记给出牌，原“学过普通弃牌”不证明执行后缀正确。纯bug0268沿旧队列。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for ident in mechanism_ids:
 e=next(c['after'] for c in C if c['id']==ident);hist=next(x for x in H if x['id']==ident);parts=e['lesson'].split('典型案例：')
 lines.append('| '+ident+' | '+parts[0]+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；支持分阶'+str(hist['by_asc'])+'；适用'+str(e['asc'])+' | '+parts[-1]+' | '+ident+' |')
lines+=['','- 全历史触发核验见historical-trigger-checks.json：步法948动作/86局，普通净2 642次、升级净3 279次、华彩净6 22次，另5次净1；后五次逐原帧核TENDER1、牌面2敏和同步−1力，净+1不是步法基础反例（VLV17NUSFS61两次、HSX4HYATB4E2/8JRE1C4H4Z2W/NHA2KW0RB7VP各一次），留historical-exceptions.json。毒雾848动作/73局，普通2 399次、升级3 448次、重放6一次；不把重放算新基础值。',
'- 疯狂科学31实际动作/7局分四模板，专长只A7/A10两局；坚定不移9次实建仅本局1支持，无早局可比。蛇咬116实际动作/13支持，升级分支与普通分账。持有/动作自动集合不当整战胜因或增加置信度，未见叠层/其他增益顺序保留未知。',
'- 新首卡倍率的21支持“先按总倍率再最终取整”这组推理，而不是先脆弱截10再翻20；只推广已观察基础6/8敏/普通能力1层/脆弱组合，不推所有来源。既有26不补、下一轮21尚未兑现；6HP需损6实死，只差1血能活该轮，不等于后战能赢。',
'','### 新增','', '- silent-unmovable-first-card-block：普通首卡翻倍、已有挡不补、跨轮额度及脆弱组合；1支持/0反例、low、机制asc[0,20]，只核A10数值和时点，账本0321。',
'','### 更新','']
for c in C:
 if c['kind']=='updated':lines.append('- '+c['id']+f'：支持{c["before"]["n_support"]}→{c["after"]["n_support"]}、追加P2M3DFJ4DEZ3；'+','.join(M[c['id']])+'。')
lines+=['','### 退役','', '- 无；未修源码、没有反例超支持或高阶推翻。旧退役记录、旧案例全文与支持/反例不丢，不改预算。',
'','### 和手写知识及代码冲突','',
'- 其余8份silent JSON核字段/来源/校准口径及SHA，other-knowledge.json：均生成、模型或结果数据，没有独立手写攻略；预测/不同切点不是实盘机制反例，无需修改。double-boss记录F48/F49与本局一致，boss-trust指纹与预测范围另核，不冒报实盘校准提升。',
'- 经验中的升级蛇咬10毒与普通1层坚定不移同线新建，当前复盘所核模型不一致；只登记独立strategy-proposal。0319/0320/0268纯bug不塞机制正文；无关角色和现有正确路径不改。',
'- 四提案'+','.join(json.load(open(O/'proposal-ids.json')))+'；source_task=experience-update/target_task=strategy-proposal，15相关active各有experience/本角色证据/层轮/账本；domains combat/potion/sl/terminal/structure，均pending，不称源码implemented/shipped。',
'','### 代码问题（不给 DS）','',
'- 0319升级蛇咬模型仍仅接未升级7毒，A6 VN7RQJMJEFMX F17T3已实加10；本局女王T3候选把蛇咬+列未建模，实加10且后来弃中和，净清/损差不能全归一个根因。0320同线能力→防御预计14实28，完整原线损39→25；末试随后新增凋萎全轮损34不当同一原线反例。0268普通单弃依绷带补挡才消费、弃掉原后缀中和使少9减伤，旧repeat留史。',
'- 完整dirty源码、未选路线、留药/早喝/换线整场胜利反事实、前五次截断退出帧/未执行结算、凋萎内部全序、silent时钟及实际最优执行比例缺证，维持原规则。',
'- 本scratch首次验证把空药槽数组误判为持有药，断言失败；原verify-initial.py/log保留，改按occupied核验后35项通过，不改游戏知识来绕断言。药水核验初次仅按completed计饮导致断言失败，原potion-accounting-initial.log留史；三次待选牌的药槽已实空，按状态补到24次，未改经验结论。',
'','### 测试','',
'- 原bash agent/tools/test-sandbox.sh入口，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1、nice19，固定数据/排除/预算不变；'+(f'tsc {tests["tsc"]}，vitest {tests["files"]}文件/{tests["cases"]}用例/退出{tests["vitest"]}，未重跑。' if tests else '运行中，待最终记录。')+'沙箱外完整套件交调度器，未冒报通过。',
'- JSON合法；15变更字段、角色证据/n/name/scope与未改条目逐项等价；旧149局同口径复算、35关键实帧、历史机制例外复核通过。check-experience missing=[]退出0；git diff --check通过；gitleaks结果见gitleaks-source.log。',
'- 账本新增[]，改proposed '+','.join(dict.fromkeys(l for ls in M.values() for l in ls))+'，退役[]；提交后CLI登记，ledger.py check结果见日志。原claim/首证/prior/版本和support/repeat留史；只有运维核实际合入后标shipped。',
f'- live锁内结果：{live["result"]}；刷新{live.get("refresh")}；合前{live.get("pre")}；合入{live.get("merged")}。']
for v in live.get('conflicts',[]):lines.append('- '+v)
for v in live.get('overlap_conflicts',[]):lines.append('- 刷新知识重叠：'+v)
if not live.get('merged'):lines+=['- 未实际合入，不造eval上线版本或规则双通知；源提交/刷新/预检原件保留交运维兜底，不停对局。']
lines+=['','### 切片大小','',
'- 固定种子20260929，从截至切点SILENT状态取最高两阶A9/A10，各界面20状态×6界面=240配对。manifest记录池/时间戳，同阶同界面不足才有放回；CHARACTER=silent调用官方knowledge-slice.ts，冻结common/silent其余知识及统计，只换experience。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for v in SS['rows']:lines.append(f'| {v["sample"]} | {v["before_median"]}/{v["before_max"]} | {v["after_median"]}/{v["after_max"]} | {v["paired_median"]} |')
lines+=['',f'- 整体中位{SS["before_median"]}→{SS["after_median"]}（{SS["after_median"]-SS["before_median"]:+}字），配对差中位{SS["paired_median"]}；最大{SS["before_max"]}→{SS["after_max"]}，单片最多增加{SS["increase_max"]}、最少变化{SS["decrease_min"]}。',
f'- active{U["active"]}，正文{U["chars"]}字符，置信度{U["confidence"]}；A8 {U["asc"]["8"]}；A9 {U["asc"]["9"]}；A10 {U["asc"]["10"]}。无需预算压缩/合并/退役；需要Dai定：无。','']
body='\n'.join(lines)
(O/'changelog-section.md').write_text(body)
(O/'report.md').write_text('# 经验库更新报告\n\n'+body)
if sys.argv[1:] == ['append']:
 assert commit!='待自测提交' and tests.get('vitest')==0
 path=ROOT/'paper/materials/experience-changelog-silent.md'
 old=path.read_bytes();addition=('\n'+body).encode()
 assert ('## '+heading).encode() not in old
 with path.open('ab') as f:f.write(addition)
 new=path.read_bytes();assert new==old+addition
 (O/'changelog-append.json').write_text(json.dumps(dict(old_bytes=len(old),added_bytes=len(addition),old_sha256=hashlib.sha256(old).hexdigest(),addition_sha256=hashlib.sha256(addition).hexdigest(),new_sha256=hashlib.sha256(new).hexdigest()),indent=2)+'\n')
 print('只追加本节',len(addition),'字节')
else:print('报告/本节初稿保存',len(body),'字符')
