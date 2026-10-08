import collections,json,re,statistics,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));U=json.load(open(O/'update-summary.json'));C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'));H={h['id']:h for h in json.load(open(O/'historical-mechanism-summary.json'))};R=json.load(open(O/'rest-summary.json'));SL=json.load(open(O/'sl-summary.json'));B=json.load(open(O/'baseline-check.json'));meta=json.load(open(O/'run-metadata.json'));proposals=json.load(open(O/'proposal-ids.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
commit=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
heading=f'2026-10-09 静默猎手 第一百一十四次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{commit[:8]}）'
(O/'changelog-heading.txt').write_text(heading+'\n')
log=(O/'test-source.log').read_text();rc=int((O/'test-source.rc').read_text()) if (O/'test-source.rc').exists() else None
files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
tests=dict(tsc=0 if 'RUN  v' in log else None,vitest=rc,files=files,cases=cases)
(O/'test-results.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2)+'\n')
lines=['## '+heading,'','### 来源','',f'- 记录时间{stamp}；只读根notes/lessons.md:6590的HEMND3SMQYB8静默猎手复盘，按节末补记的机制与限制，未有后续本局勘误。runs.jsonl:630核SILENT/A10/F49败；code72499093+dirty，完整dirty源码未记录。本局brain47条全部Codex，ds_*只是兼容字段，不称DeepSeek实答。','- 已读README、最新STATE/decision-log末尾、学习协议/代码提案、首次构建方法、静默112/113两节和账本README。exp-silent开工干净，git merge --no-edit main无冲突快进至be91476364dfd0ec57baa5f7494b7dc752e40864；本任务独立执行，未派agent、不联网/play/模拟池、不改打法源码或其他角色。',f'- 按局号提取850决策、47大脑请求、9SL、8版run-plan；states/reasoning按决策窗二分字节seek流式读，966帧核run_id与state.run.character_id=SILENT；时间窗2026-10-08T15:49:35.503Z—16:31:21.905Z，DeepSeek推理0。偏移、原始子集和脚本留{O}。',f'- 全引擎学习观察截至{A["cutoff"]}，{len(A["runs"])}静默完局、{len(A["fights"])}独立房、{sum(r["death"] for r in A["fights"])}实死；分阶{dict(collections.Counter(r["ascension"] for r in meta))}。其他148局只进数字/历史核验；排缺character旧铁甲、其他角色、进行中及切点后局，不称纯Codex爬塔战绩。','- 口径同前：战内净损=首COMBAT入口HP−同房最后尝试退出HP，含回复/自损/负值，不等敌毛伤；SL同房只计一房、判死截断不当实死。Monster才走廊、Unknown问号另列；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient；多节点可重复关联，回血后战去重、营火房/动作分列。', '- 旧148局七数组逐行复算一致：'+ '/'.join(k+str(v['before']) for k,v in B.items())+'，全部旧血档、节点转移、回血和SL摘要相等，未有原数字漂移。本局21独立房/26尝试窗，前五次女王T2判死截断不作实死/零战损，末试T4实死；58关键原帧校验通过。',f'- 新增1、更新22（22加证据、0只改数字）、退役0；active188→189，正文51768→{U["chars"]}字符。无预算合并/退役；压缩silent-queen-poison-window-sl-observation逐局重复说明，六个旧案例完整原文留changes.json与本节末附录，支持/反例不丢。低于55000压缩线/60000预算，不改测试预算。','','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];h=H[e['id']]
 lines.append('| '+e['id']+' | '+str(e['n_support'])+'支持/'+str(e['n_contradict'])+'反例；进阶'+str(h['by_asc'])+'；账本'+','.join(M[e['id']])+' | '+e['lesson'].replace('|','／')+' |')
lines+=['','以下n为独立房、同局可多房；死亡率=实际死亡房/n，活战净损中位含负数，各进阶分开。','','| 进阶 | 幕 | 房型 | 血档 | 房/局数 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
 if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |')
lines+=['','非战斗节点按入口血关联下一战；不是改线随机实验。Unknown实开战在上表，不开战不记零伤。','','| 进阶 | 幕 | 前节点 | 血档 | 关联/去重后战 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
 if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |')
lines+=['','| 进阶/局数 | 独立营火 | 回血动作/实回 | 去重后战/死 | 活战净损中位 | 真重打房/试/赢 |','| --- | --- | --- | --- | --- | --- |']
for r,z in zip(R,SL):lines.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} | {z["fights"]}/{z["attempts"]}/{z["wins"]} |')
lines+=['','- 低血改线只有观察：新局三幕选三火零精英、F47回满仍在第二boss死；未走线路没有实盘。旧M0GY0A4M2F7H避精英29进boss仍六败，旧R3AJCGQGGMR4沙虫第二试胜伴随药/后序变化；跨局构筑、敌人和进场不同，不能称改路线更好有因果证明。','- 本局F17/F33/F48均首试赢，F49同场6试0赢；没有赢的那次。前五T2判死，末试T1改抽弃/目标/敏捷药至T2等共同变化，T1损16→11、T2末9→10，T3毒雾线再损9至1；无法拆为唯一胜因或运气。SL替代4次，换手后的原后缀未执行。全部历史A10真正重打109房489试33赢按SL结果计，相关尝试不是独立局。','','本局逐房资源（入→最后尝试出，药物回血已包含，不计敌毛伤）：','','| 层/房型 | HP/max | 净损 | 结局 |','| --- | --- | --- | --- |']
for r in A['fights']:
 if r['run']=='HEMND3SMQYB8':lines.append(f'| F{r["floor"]}/{r["type"]} | {r["hp"]}→{r["last_hp"]}/{r["max_hp"]} | {r["loss"]} | {"实死" if r["death"] else "胜"} |')
lines+=['','- 六回血实回21/21/21/21/21/16共121，三升级无回血；跨幕44→64回20、15→59回44，均⌊缺血×80%⌋。F30损37到11、F32回21进沙虫32胜15；F39再生回15/敌攻损21使39→33净损6。F48净损45、胜25，仅剩混沌无补给，F49直接同25入。女王五次恢复9→25及同一混沌，不当累计回血80/新获5瓶。','- 常规新获9瓶/丢弃1/实际饮用25；终战混沌在六试各生成火焰+敏捷，12次瓶出现是同瓶SL分支，不并入永久新获9瓶。末试火焰换向聚合体、敏捷到T2；无另一饮用时点整场胜果，不定留药价/喝留规则。','- 末試女王四轮需清630/566/536/533，净清64/30/3/32合129，末余501；HP损11/4/9/1。T3少防御代价6只比较同题：未实打防御线不能当真省6或胜线。T4完整19−11=8伤、现1血只扣1死亡，至少9HP可按原线活，存活差8。','','### 经验库自己带偏或写了没被执行的地方','','- DeepSeek推理0，无其引用具体经验id的原话；本局已上线题面提醒两战，不能从后续失败反推误认终战或经验单条导致选择。以下引真实决策原话，执行与计划分别核。']
D=[json.loads(l) for l in (O/'HEMND3SMQYB8/decisions.jsonl').open()]
for floor in [1,16,34,47]:
 for d in D:
  if d['floor']==floor and d['decider']=='codex' and any(w in d['rationale'] for w in ['planned','Healing','Rest','休息']):
   lines.append('- F'+str(floor)+' 原话：'+json.dumps(d['rationale'],ensure_ascii=False));break
for n in [301206,301332,301349,301351]:
 d=D[n-300509];lines.append('- d'+str(n)+' 原话：'+json.dumps(d['rationale'],ensure_ascii=False))
lines+=['- F48T3原计划计算下注+后续药瓶/防御/普通触媒不在新手，实际重算紧勒+/冒泡/触媒+；F49末T1替代中旧肾上腺素/中和/紧勒/扫腿也落空。只把实打当伤挡，旧“学过全弃”不代表升级模型已接线。T3毒雾在两方案五轮24/24死时被选，仍付实际血价，不称已落实更安全。','','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C:
 e=c['after']
 if '机制：' not in e['lesson']:continue
 h=H[e['id']];case=e['lesson'].split('典型案例：')[-1];reason=e['lesson'].split('典型案例：')[0]
 mechanisms.append(e['id']);lines.append('| '+e['id']+' | '+reason+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；'+str(h['by_asc'])+' | '+case+' | '+e['id']+' |')
lines+=['','- 机制支持是局部公式/触发，不能把条目high当单组件整战致胜或新子集多局验证。全部历史角色复盘726主题段与日志交叉核；动作/持有集合只定位，不自动加入整条支持。未发现新机制反例；观察没有受控因果的明确写观察。','- 历史步法926动作，921单增2/3、五TENDER复合窗口净敏增1且力量同时−1，非单卡反例；毒雾832动作，831单建2/3、一复制窗口实建6。触媒472动作建1/2，敏捷药58局92飲全部增2、再生20局27飲全部增5；毒与持牌/被动挡分源。完整异常前后帧留historical-trigger-checks。','- 升级全弃历史6支持局32次：A0一局6次、A3一局3次、A6一局6次、A10三局17次；每次自身先离手后等量抽并见消耗区。保留跨轮只核HEMND F48T2→T3，不把32次施放当32局或跨轮保留32次。原首证R0HE/prior partly保持，新多4局追加support。升级紧勒失血3只新局1局，普通2和升级3子集不混置信。','- 沙漏T3实净清79=紧勒初攻10+后两牌失血6+已结毒63；T4净清183=爆发即发90+轮末毒81+直伤12。六轮535/6=89.17只为实盘均值，不造silent未校准boss时钟预测；下一战能力重建，末仅129/4=32.25且未杀任何目标。','','### 新增','','- silent-calculated-gamble-upgraded-hand-reset：6支持/0反例，card:CALCULATED_GAMBLE、中文名计算下注、机制asc[0,20]，32次全弃/重抽/消耗；账本silent-0318，bug0317分账。','','### 更新','']
for c in C:
 if c['kind']=='updated':lines.append('- '+c['id']+'：支持'+str(c['before']['n_support'])+'→'+str(c['after']['n_support'])+'，反例不变；追加HEMND3SMQYB8与案例/数字，账本'+','.join(M[c['id']])+'。')
lines+=['','### 退役','','- 无。本任务未修源码、无反例超支持或高阶推翻；旧退役记录保持。压缩女王旧逐局叙述但不合并scope、不丢证据，预算不用改。','','### 和手写知识及代码冲突','','- 其余8份silent JSON核字段、生成/校准来源及SHA，记录other-knowledge.json：为boss/房间/模型/结果数据，模型预测/不同切点不当实盘机制反例。无需修改的手写知识，无新增攻略、其他角色不动。','- 中文全弃边界与升级CALCULATED_GAMBLE模型仍保留原手不一致；凋萎弃牌已6伤而新生缓存仍3、普通紧勒漏后牌失血沿既有bug链。只登记独立strategy-proposal，不在本任务改打法源码；正确现有模型保持。', '- 四提案'+','.join(proposals)+'，source_task=experience-update/target_task=strategy-proposal，23相关active各有experience/本角色证据/层/轮/账本；domains combat/potion/sl/terminal/structure。均pending，不称源码implemented/shipped。','','### 代码问题（不给 DS）','','- 0317升级全弃纯bug和0297凋萎缓存/0260普通紧勒旧bug只留这里及提案，不写进DS机制正文。F48T3原报43伤7挡、实际全弃重算净清79/损3；F48T4原报损18、实完整损21，晚重算不能证明真省3。F49末T4推演损7/完整8差1未定位为新bug。','- 完整dirty源码、未选路线/更早喝药/替代首boss与女王整场胜线、前五判死后未执行结算、凋萎内部全序/部分末击、实际最优执行比例和silent时钟校准缺数据；保留原行为和限制，不补预训练玩法。','- 本scratch历史验证初稿错误从combat.exhaust_pile/combat.exhaust读取，实际摘要在agent_view.combat.exhaust、card_ids分组；四次KeyError初稿日志全部保留，改scratch验证器后32动作原帧通过；追加消耗核验初稿未区分普通/升级而断言失败，改按升级摘要计数后32次均实增1，日志/初稿保留，不改生产代码或经验机制。','','### 测试','',f'- 原bash agent/tools/test-sandbox.sh入口，TMPDIR本scratch、PATH本机node、nice19/SANDBOX_WORKERS=1、固定数据，固定排除和预算不变；tsc {tests["tsc"]}，vitest {files}文件/{cases}用例/退出{rc}。沙箱外完整套件由调度器续验，不冒报通过。','- JSON合法；23变更字段/角色证据/n/中文name/scope和未改条目逐项等价；58新局关键核验与旧148局同口径复算通过；check-experience missing=[]退出0、git diff --check/gitleaks源扫描0。']
if (O/'ledger-results.json').exists():
 l=json.load(open(O/'ledger-results.json'));lines.append('- 账本新增'+str(l['added'])+'；改proposed '+','.join(l['proposed'])+'；退役'+str(l['retired'])+'；ledger.py check退出0。首证/prior/原claim/版本/support/repeat和未纳入观察保持，只有运维据实际live登记shipped。')
if (O/'live-merge.json').exists():
 v=json.load(open(O/'live-merge.json'));lines+=['- live锁内：'+v['result']+'；刷新'+str(v.get('refresh'))+'；合前'+str(v.get('pre'))+'；合入'+str(v.get('merged'))+'。',*['- '+x for x in v.get('conflicts',[])]]
 if not v.get('merged'):lines.append('- 按冲突指令停止，未实际合入，不造eval上线版本或规则通知；刷新/源提交/预检原件保留交运维兜底，不停对局。')
lines+=['','### 切片大小','','- 固定种子20260929、截至切点SILENT状态最高两阶A9/A10各20状态×6界面共240配对；同阶同界面不足仅有放回、不跨角色。manifest记池/时间戳，CHARACTER=silent调用官方knowledge-slice.ts；common和silent其他知识/统计冻结同份，只换experience。','','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
a=json.load(open(O/'slice-before.json'));b=json.load(open(O/'slice-after.json'))
for x,y in zip(a,b):lines.append(f'| {x["sample"]} | {x["median"]}/{x["max"]} | {y["median"]}/{y["max"]} | {statistics.median([q-p for p,q in zip(x["sizes"],y["sizes"])])} |')
z=json.load(open(O/'slice-summary.json'));lines +=['',f'- 整体中位{z["before_median"]}→{z["after_median"]}（{z["median_change"]:+}字），配对差中位{z["paired_median"]}；最大{z["before_max"]}→{z["after_max"]}，单片最多增加{z["max_increase"]}、减少{-z["max_decrease"]}字。',f'- active{U["active"]}，正文{U["chars"]}字符，置信度{U["confidence"]}；A8适用{U["asc"]["8"]}；A9适用{U["asc"]["9"]}；A10适用{U["asc"]["10"]}。压缩仅女王条目，未合并或退役，无预算变更；需要Dai定：无。','','压缩前女王六案例原文（完整明细留记录，不下发）：',next(c['before']['lesson'] for c in C if c['id']=='silent-queen-poison-window-sl-observation'),'',f'原始证据、提案/CLI、复算、核验/失败初稿、切片、测试和合入回执均留{O}。','']
section='\n'.join(lines);(O/'changelog-section.md').write_text(section);(O/'report.md').write_text(section);(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print('报告',len(section),'字，测试',tests)
