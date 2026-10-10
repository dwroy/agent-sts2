import collections,hashlib,json,os,re,statistics,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');N='JBX9JLH46KVN'
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));U=json.load(open(O/'update-summary.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
T=json.load(open(O/'test-results.json'));L=json.load(open(O/'ledger-results.json'));P=json.load(open(O/'code-proposals-results.json'));M=json.load(open(O/'ledger-map.json'));V=json.load(open(O/'verification.json'));SL=json.load(open(O/'sl-comparisons.json'));Z=json.load(open(O/'slice-summary.json'));B=json.load(open(O/'baseline-check.json'));Q=json.load(open(O/'mechanism-evidence.json'));MERGE=json.load(open(O/'live-merge.json'))
source=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
names={
'silent-deck-burst-observation':'能力拥有与实际兑现观察','silent-strength-weak-observation':'力量/敏捷与现场倍率','silent-footwork-block':'步法敏捷与多张牌挡','silent-accelerant-triggers':'触媒逐次毒结算','silent-outbreak-immediate-poison':'毒爆即时毒与结束毒','silent-test-subject-phase-reset':'实验体技能激怒成本','silent-wither-end-turn-loss':'凋萎/格挡与毒胜持牌伤','silent-aeonglass-artifact-growth-sl':'沙漏制品/敌成长与重打观察','silent-mirage-poison-card-block':'蜃景实时毒量与敏捷牌挡','silent-act-transition-missing-hp-heal':'跨幕缺失血回复','silent-poison-potion-observed-application':'毒药施层与实结','silent-double-boss-resource-handoff':'连续boss资源/能力交接观察','silent-alchemize-potion-resource-observation':'炼制施放/入槽与产物兑现','silent-dodge-and-roll-delayed-block':'翻滚当前挡与未来挡','silent-scroll-paper-cuts-unblocked':'卷轴漏击降上限'}
esc=lambda x:str(x).replace('|','\\|').replace('\n',' ')
lines=[title,'','### 来源','',f'- 记录时间{(O/"record-time.txt").read_text().strip()}。只读根notes/lessons.md:7791目标静默小节及run-1009-1131-JBX9JLH46KVN.md，未见目标勘误；runs.jsonl:647核SILENT/A10/F49败、运行d5f290f4+dirty。完整dirty源码未记录，当前live行号只定位接线。没有跨角色跳过。last_seen取run-1009日期。',
'- 开工exp-silent干净，git merge --no-edit main无冲突快进6c02085a9；提交前再次无冲突快进5eb1292c7，仅复盘/运维记录变化，代码/知识与已测树一致。已读README、最新STATE、decision-log末尾、学习协议、提案闭环、铁甲首次/最后两节方法和静默最近两批、账本README。自己做、不派agent、不联网、不运行play；nice19单进程抽数、固定单worker测试、不跑boss模拟池。',
f'- 全引擎silent学习观察截至{A["cutoff"]}：{len(R)}已结束局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死，分阶{dict(collections.Counter(r["ascension"] for r in R.values()))}。旧165局只做数字/机制复核，不冒称纯Codex爬塔战绩。无character旧局、其他角色、进行中和切点后局排除。',
'- run id流式rg抽979决策/16SL/9计划；states和reasoning按决策时间窗二分字节seek流读1079状态/0推理，核state.run.character_id。2087原件偏移/SHA及抽取全等检查通过，2121项复盘原帧和1089项参数/角色核验通过；47真实决策脑为Codex，ds兼容字段不当DeepSeek引用。独立run-plan请求另计，不混进脑决策分母。',
'- 口径沿上一节：同房首COMBAT HP−末次退出HP是战内净损，含回复/自损/上限变化，不当敌毛伤；SL同房一场，判死截断不当实死。Monster才算走廊，Unknown另算。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient；同战可接多个节点，HEAL后战另去重。房/局/节点/动作分母分开，未列组合n=0。',
f'- 旧165局重新逐局analyze后，七数组、血档房/局/损/死、节点转移、回血及SL均与上一批全等：{B}。流式筛读全部本角色截止内复盘，703段历史机制文字留historical-mechanism-notes.txt；历史实打参数见mechanism-evidence.json。主题支持局数不是逐公式单因实验。',
f'- 新增0、更新17（加证据17、只改数字0）、退役0；active196→196，正文52099→{U["chars"]}字符。低于55000压缩线和60000预算；无合并/预算压缩/退役，案例改写净减405字符。只改silent/experience.json，不改打法源码和其他角色。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}支持/反例；分阶{dict(collections.Counter(R[r]["ascension"] for r in e["evidence"]))}；账本{",".join(M[e["id"]])} | {esc(e["lesson"])} |')
lines+=['','新局22独立战斗房（SL同房一场，末次真实退出或死亡计净损）。','','| 层/幕/房型 | 首帧敌人 | HP进→出/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run']==N:lines.append(f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines+=['','- 最终路径资源闭合：初56＋六火166＋两次跨幕34/56＋F9后上限/当前血同增10−F5事件8−F31事件18−22房净损296=0。F35/36/38/39/43/45/46七房净损26/2/4/3/14/34/1合84；避精英仍耗血，不能把避精英当无伤路线。F48五试同78血两药，末试赢8空药直接接F49；F49六试均8空药。31个尝试窗口的完整资源链如下。','',(O/'resource-table.md').read_text().strip(),'',
'- 药水按全部尝试实际动作：非SL入槽25=奖励9+商店2+炼制14，SL恢复8另列；实饮32、丢0、终留0，25+8−32−1次未饮药的SL清除=0。炼制完成16而非16瓶新增：14次空槽添瓶、F38T1/F43T1满槽未增/未换；旧五局27加本局16为43次施放，净添合41次。动作前后HP未变不代表敌力不变。完整25次非SL入槽去向如下。','',(O/'potion-table.md').read_text().strip(),'',
'- F48末T8生存者→毒爆清177、45→17损28与题面吻合；未打防守候选清57损12，少输出120/题面少损16，不能称实省16或必胜。两线连战模拟0%均未校准，原1200次首战胜后全败、防守881次首战胜后全败；不是实盘必死。三次HP护栏题面合少损38/少伤103，后续牌/抽弃又变，不当真实反事实。',
'- F49末T1四技能各加3敌力至12，T2后空翻至15、翻滚至18；能力触媒/敏捷药不加敌力。实际末8血17挡对25完整需损8，存活至少差1血；敌第一阶段尚86，后阶段未观察。不能把least-loss抽牌前39伤后缀当实际贯彻，实际T2攻击只有回响10+打击6。',
'- 路线/休息预测：F8/F9点预测40/61，实际32/53，各少8，F5实付8但无另一条路线实打，不单因归模型。F17入口53吻合、估净损10/9轮而实16/9轮；F33休息后入口58吻合、估39/7轮而实49/8轮。后段四次B2样本80/72/144/104不足300，不冒报可用0%或旧boss时钟。',
'','全部非空分阶/幕/房型入口血档：赢房净损中位，实死单列。','','| 进阶/幕/房型/血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for x in A['bands']:
 if x['n']:lines.append(f'| A{x["asc"]}/幕{x["act"]}/{x["type"]}/{x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{x["deaths"]/x["n"]:.2%} | {x["median_win"]} |')
lines+=['','非战斗节点入口血关联后战（节点次数为分母，同场可接多节点，不当路线干预因果）。','','| 进阶/幕/节点/血档 | 节点/独立后战 | 后战死/率 | 活损中位 |','| --- | --- | --- | --- |']
for x in A['transfers']:
 if x['n']:lines.append(f'| A{x["asc"]}/幕{x["act"]}/{x["screen"]}/{x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{x["deaths"]/x["n"]:.2%} | {x["median_win"]} |')
lines+=['','主动回血及后战汇总：','','| 进阶 | 完局/独立火 | HEAL/其他休息动作 | 实回HP | 去重后战/死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in json.load(open(O/'rest-summary.json')):lines.append(f'| A{x["asc"]} | {x["runs"]}/{x["rests"]} | {x["heal"]}/{x["smith"]} | {sum(x["gains"])} | {x["nexts"]}/{x["deaths"]}/{x["deaths"]/x["nexts"]:.2%} | {x["median"]} |')
lines+=['','- 低血节点走法可观察比较，节点/后战分母不同；角色A10无精英新局三幕仍七战损84，XZUJR08FW801二幕问号两胜耗41、5血四试败，NTMAU4XZ2NN2低血休息到66后走廊耗23再精英败。人物构筑、怪物与入口血混杂，没有相同状态另一路线实打；不称改路线实际必然更好，不定统一安全血线。',
'','SL重打分阶汇总（只有attempt>1的同房分组）。','','| 进阶 | 重打房 | 尝试 | 实胜尝试 |','| --- | --- | --- | --- |']
for x in json.load(open(O/'sl-summary.json')):lines.append(f'| A{x["asc"]} | {x["fights"]} | {x["attempts"]} | {x["wins"]} |')
lines+=['','| 本局房 | 重打房/尝试/赢 | 共同记录抽序前缀 | 改了什么/限制 |','| --- | --- | --- | --- |',
'| F48沙漏 | 1/5/1 | 前32张 | 前四T10/T11判死未真实退出；第5T9胜，能力/出牌/毒火饮用回合/炼制产物及抽弃多处变化。末实6敏/触媒2、未打毒雾；T8毒爆清177，T9凋萎损9。不能把胜归一项，也不把首战胜当连战赢。 |',
'| F49实验体 | 1/6/0 | 前16张 | 六次均8空药，前五T2判死截断、末T2实死；第三/四试T1敏捷药实飲，第五未饮被SL清除，末T2饮；末T1结束被SL换炼制，T2延后挡未兑现。没有赢的一次，不虚构胜法或“只是运气”。 |',
'- 全部attempt/explore/draws与SL explore决策、实际chosen逐步明细留sl-comparisons.json；同抽序前缀不证明后续随机药/全部抽弃固定。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 本局实际Codex，reasoning窗0；没有可核的DeepSeek逐条经验引用原话，不能证明经验诱导错选。下面列真实理由与兑现差。',
'- F34 d311646：“增能支持毒爆，走商店四火避精英备连王。”实际三幕避精英、四火中三次HEAL，仍七房净损84；没有未选线胜果。F47 d311860：“Heal to 78/78 before consecutive bosses. Pillow-enhanced recovery provides far more survival and second-boss reserves than any single upgrade.”（译：连boss前回满，枕头回血比一次升级提供更多缓冲。）确实42→78，说明大脑有备战，不称忘第二场。',
'- 首战胜后p2875：“Only 8 HP and no potions remain; no recovery nodes precede the second boss.”（译：仅8血空药，第二boss前没有恢复节点。）首战能力清零、六试入口8均核实；建议存在不保证执行器生成同胜保血候选。',
'- F49末T1 d312209：“Jev chose plan 2/2 (potion 敏捷药水); plan 1 (end turn) is as good or better on every axis, playing it with confidence 0.18; code rank 1”。actual chosen=end_turn，不是一次饮药；T2 d312214才实饮，旧后空翻8挡未增加。d312208原结束由SL explore改为炼制，0费仍加3敌力，不能把Jev原选和实际执行混为一线。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c,q in zip(C,Q):
 e=c['after']
 if e['id'] not in names:continue
 text,case=e['lesson'].split('典型案例：',1);lines.append(f'| {names[e["id"]]} | {esc(text)} | {e["n_support"]}/{e["n_contradict"]}；{q["asc"]}；参数{q["actions_or_rooms"]}动作/房/{q["parameter_runs"]}局，非逐公式隔离分母 | {esc(case)} | {e["id"]} |')
lines+=['','- 机制保持[0,20]，只有现场数值/已观察进阶被证实；路线/休息/构筑既有适用范围保持，连续boss只A10。失败不当机制反例，未施放/换战能力/未到下一轮/未飲药不当已伤已挡，未知整战单因写观察。',
'','### 新增','','- 无，同主题并入既有条目。','', '### 更新','']
for c in C:lines.append(f'- {c["id"]}：{c["before"]["n_support"]}→{c["after"]["n_support"]}，追加{N}与已核案例/数字；反例、适用范围保持。')
lines+=['','### 退役','','- 无，没有新反例多于支持或对应已修机制条目；纯搜索缺口留独立修复链。',
'','### 和手写知识及代码冲突','',
'- 手写知识改动：无。silent另八份JSON逐份核SHA/字段、生成统计分母与截止、双boss仅本角色已观察A10；没有本局直接反驳的手写规则。模拟表有自身校准/限制，本局观察不当新的模拟拟合或覆盖刷新，文件核验留other-knowledge.json。',
'- 当前只读live turn-solver.ts:3839仍在winsFight提前返回、combat-plan.ts:3298/3301取无药胜线自动执行；F48T9遗漏可防凋萎的同胜候选沿silent-0271已有链。现有连战价值不能比较未生成候选；不重新开已处理持牌致死判断的silent-0213。无完整dirty源码，本任务不改打法源码或铁甲规则。',
f'- 三份source_task=experience-update/target_task=strategy-proposal代码提案{",".join(P)}覆盖17变更active条目，涉及combat/potion/sl/terminal；均pending，不称implemented/shipped。两份原复盘提案和观察历史保持。资源搜索先核固定帧，机制/满槽/技能/药水时点先核现有等价实现；无整战证据不拟新药价/SL/终局参数。',
'','### 代码问题（不给 DS）','',
'- 纯bug silent-0271已有观察/修复队列，本任务只关联新经验来源提案，不重复新建bug或改队列。满槽两次炼制、技能加力/敏捷时点属于实盘机制与策略验收，不能直接归纯基础设施错误。',
'- 初稿数字在提交前纠正：毒药7→13且敌512血不变，卷轴22挡对24攻，七房净损84；炼制16次施放仅14入槽、旧27分母一致。初稿update-draft-v1.py和draft-corrections.md保持。首次串行验证在agent/用了仓库相对scratch路径，重定向失败未启动测试，改绝对路径成功；失败命令记录保留，不当代码测试失败。最后补共同抽序前缀后重跑改后切片，原初版切片保留。',
'- 缺完整dirty运行树、前四F48/前五F49退出及实际死亡、毒末击独立毛伤、永久敌ID、完整最优线执行率、护栏/早喝/保药/保血候选/路线/构筑整战对照、实验体后阶段及旧boss时钟/实付费用；不补造数据。',
'','### 测试','',
f'- 原bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1、nice19固定数据/固定排除。tsc退出{T["tsc"]}、vitest {T["files"]}文件/{T["cases"]}例/退出{T["vitest"]}；重跑{T.get("rerun",False)}。未改预算/测试/排除；合后完整套件由调度器沙箱外续验。',
f'- JSON合法、diff --check、gitleaks、check-experience missing=[]退出0；ledger.py check退出{L["check"]}。账本新增无，proposed {",".join(L["proposed"])}，退役无。只CLI追加，旧claim/prior/首证/证据/版本历史保持，不标accepted/shipped；运维据实际完成事件登记。',
f'- live锁内结果：{MERGE["result"]}；刷新{MERGE.get("refresh")}，合前{MERGE.get("pre")}，实际合入{MERGE.get("merged")}，合后沙箱{MERGE.get("tests_retry",MERGE.get("tests"))}。']
for x in MERGE.get('conflicts',[]):lines.append('- '+x)
if not MERGE.get('merged'):lines.append('- 按任务冲突/重叠停止，不实际合并或硬解，不覆盖刷新数据。未合入，待调用方/运维据本批原件兜底；不造eval版本或发实际上线通知，不停对局。')
else:lines.append(f'- 唯一上线版本{MERGE.get("eval_version")}，发布{MERGE.get("publication")}；Roy根目录双通知已追加。实际数据shipped由运维据完成事件核实，源码提案仍pending。')
lines+=['','### 切片大小','',
'- 固定种子20260929，从截止内state.run.character_id=silent的最高两阶A9/A10各20状态×6界面，共240配对，各池足20。官方knowledge-slice.ts用CHARACTER=silent，仅替换经验，其他common/silent数据逐字节核保持、outcome快照注入相同；池/时间戳和原输出留sample-manifest及slice-*。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for x in Z['rows']:lines.append(f'| {x["sample"]} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["paired_median"]} |')
lines += ['',f'- 整体中位{Z["before_median"]}→{Z["after_median"]}（{Z["after_median"]-Z["before_median"]:+}字），配对差中位{Z["paired_median"]:+}，最大{Z["before_max"]}→{Z["after_max"]}，单片差{Z["diff_min"]}至{Z["diff_max"]}。',
f'- active{U["active"]}/正文{U["chars"]}字符；置信度{U["confidence"]}；A8 {U["applicable"]["8"]}，A9 {U["applicable"]["9"]}，A10 {U["applicable"]["10"]}。无合并/预算压缩/退役，未知整战因果保留限制；需要Roy定：无。',
'',f'全部原件/偏移、旧基线复算、参数/SL明细、初稿/失败、CLI/提案、切片/测试/合入预检和报告留{O}。','']
section='\n'.join(lines);(O/'changelog-section.md').write_text(section)
report='# JBX9JLH46KVN 静默经验更新报告\n\n'+section
result={'task':'experience-update','version':'2026-10-09.18','commit':source,'merged':MERGE.get('merged'),'added':0,'updated':17,'retired':0,'active':196,'mechanisms':list(names.values()),'tests':{'tsc':T['tsc'],'vitest':T['vitest'],'cases':T['cases']},'ledger':L,'code_proposals':P,'implementation_domains':['combat','potion','sl','terminal'],'report':str(O/'report.md')}
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'report.md').write_text(report+'\n```json\n'+json.dumps(result,ensure_ascii=False)+'\n```\n')
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=section,text=True,capture_output=True);(O/'gitleaks-changelog.log').write_text(scan.stdout+scan.stderr);assert scan.returncode==0
path=ROOT/'paper/materials/experience-changelog-silent.md';old=path.read_bytes();assert title.encode() not in old
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();(O/'changelog-append-time.txt').write_text(stamp+'\n')
fd=os.open(path,os.O_WRONLY|os.O_APPEND)
try:os.write(fd,('\n'+section).encode());os.fsync(fd)
finally:os.close(fd)
new=path.read_bytes();assert new[:len(old)]==old and ('\n'+section).encode() in new[len(old):] and new.count(title.encode())==1
(O/'changelog-append.json').write_text(json.dumps({'previous_bytes':len(old),'previous_sha256':hashlib.sha256(old).hexdigest(),'added_bytes':len(new)-len(old),'own_bytes':len(('\n'+section).encode()),'title':title,'prefix_identical':True},ensure_ascii=False,indent=2)+'\n')
print('报告与变更记录仅追加完成',result)
