import collections,json
from pathlib import Path
O=Path(__file__).parent.resolve();A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};C=json.load(open(O/'changes.json'));U=json.load(open(O/'update-summary.json'));M={m['entry']:m for m in json.load(open(O/'mechanism-evidence.json'))};P=json.load(open(O/'code-proposals-results.json'));L=json.load(open(O/'ledger-map.json'));S=json.load(open(O/'slice-summary.json'));N='XZUJR08FW801'
source=(O/'source-commit.txt').read_text().strip();merge=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else {'merged':None,'result':'待锁内预检'};tests=json.load(open(O/'test-results.json'));ledger=json.load(open(O/'ledger-results.json')) if (O/'ledger-results.json').exists() else {'added':[],'proposed':list(dict.fromkeys(i for ids in L.values() for i in ids)),'retired':[],'check':None}
title=f'2026-10-09 静默猎手 第一百二十八次增量：1 局 A10（version 2026-10-09.17，分支 exp-silent，{source[:8]}）';(O/'changelog-title.txt').write_text(title+'\n');stamp=(O/'record-time.txt').read_text().strip()
lines=['## '+title,'','### 来源','',f'- 记录时间{stamp}。只读根notes/lessons.md:7715目标静默小节，未见目标勘误；日期取run-1009-1032-XZUJR08FW801.md。runs.jsonl:646核SILENT/A10/F29败、运行9a7dc931+dirty；完整dirty源码未记录，当前只读live仅定位接线，不当运行树。目标未跨角色跳过。',
'- 开工exp-silent工作区干净，git merge --no-edit main无冲突合并6568c2c2；提交前再次按main更新记录基线（结果见baseline-refresh.log），agent/knowledge/learner源码及本次经验与已测树一致。README、最新STATE、最近decision-log、学习协议、代码提案闭环、首次构建及最后两批方法、账本README已读。自己做、不派agent、不联网、不运行play；抽数nice19单进程、固定测试单worker，不跑boss模拟池。',
f'- 全引擎静默学习观察截至{A["cutoff"]}：{len(R)}已结束局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧164局用于数字/机制复核，不冒称纯Codex爬塔战绩；无character旧铁甲、其他角色、进行中与切点后局排除。',
'- run id rg抽471决策/28脑/6SL/4计划；states/reasoning按02:08:11.694Z—02:32:16.597Z二分字节seek流式抽493状态/0推理，核state.run.character_id。978项原件偏移/SHA/抽取全等及1002项参数/角色/条目核验均过。28请求全部Codex，ds_*只兼容字段，无DeepSeek引用证据。',
'- 口径沿上一节：同房首COMBAT入口HP−末次退出HP为战内净损，含自损/回复，不当敌毛伤；SL同房一场，前三判死退出截断不当实际死亡。Monster才是走廊，Unknown另算。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient，同战可关联多个节点，HEAL后战再去重。房/局/节点/动作分母分开，未列组合n=0。',
f'- 旧164局重新analyze/audit，七数组、血档房/局/损/死、节点、回血与SL同口径完全一致：{json.load(open(O/"baseline-check.json"))}。历史静默复盘流式筛681段机制，并细读五个相关历史局；参数明细mechanism-evidence.json，泛主题支持数不是逐公式独立实验。',
f'- 新增2、更新15（加证据15、只改数字0）、退役0；active194→{U["active"]}，正文51982→{U["chars"]}字符。低于55000压缩线/60000预算；无合并/压缩/退役。只改silent/experience.json，未改打法源码或其他角色。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];m=M[e['id']];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}支持/反例；分阶{m["asc"]}；账本{",".join(L[e["id"]])} | {e["lesson"]} |')
lines+=['','新局14独立战斗房（SL一房，只最后一次实际退出计净损/死亡）。','','| 层/幕/房型 | 开场敌人 | HP进→出/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run']==N:lines.append(f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines+=['','- 最终资源账：56＋两火42＋转幕49−事件11−赢房131−末房5=0。F25/F27是问号赢战，46→23→5，不混走廊；F24/F26/F28不回血，F29四试都是5血原两药。独立入栏9、实际饮5、丢2、终留2；液态记忆动作pending但后续选牌/空槽证实饮用，completed参数表只收4饮，不能称全局只喝4。',
'- 末T2中和使幻象17→12攻，原怪8，合20；两防御10＋当前3覆甲，完整需损7，5血至少差3才能存活，实际死亡截断扣5。原怪已有6毒结73→67、剩5毒不重复扣，幻象19经中和到15。独立覆甲结束/攻击逐击帧缺失，不把需损7冒报实收7。',
'- 墨影F17休息题估赢局损中位36，实44，比1.22；T1明晰整线估中位27，实44，比1.63，模拟约T9结束实T10。不同题不合并为旧boss时钟；未实到二幕boss、F30后及双boss资源均未知。','',
'全部分阶/幕/房型的非空入口血档（赢房净损中位，死亡单列）。','','| 进阶/幕/房型/血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','非战节点入口血档关联后战，按节点计率、同战可被多节点关联，不当独立局率。','','| 进阶/幕/节点/血档 | 节点/独立后战 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','| 进阶/完局 | 独立火/回血动作/锻造动作 | 实回HP | 去重回血后战/实死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for b in json.load(open(O/'rest-summary.json')):lines.append(f'| A{b["asc"]}/{b["runs"]} | {b["rests"]}/{b["heal"]}/{b["smith"]} | {sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}/{b["deaths"]/b["nexts"]:.2%} | {b["median"]} |')
lines+=['','- 营火动作含同房重做，不与独立火相加。低血改线比较是观察：NTMAU4XZ2NN2损17后添火回66，下一走廊损23再43血精英死；E6DYYXRX7GVE F28添火旧路未走、最后回满仍精英死；XZUJR08FW801无精英/两店但F24锻造后两问号耗41、下一走廊死。节点可用性、构筑/敌人/资源均未控，无低血另线实打胜果，不推固定安全血线。','',
'SL同房多试对照（单试跟踪won不当实际读档）。','','| 进阶 | 重打房 | 记录尝试 | 赢尝试 |','| --- | --- | --- | --- |']
for b in json.load(open(O/'sl-summary.json')):lines.append(f'| A{b["asc"]} | {b["fights"]} | {b["attempts"]} | {b["wins"]} |')
groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
comparison=[]
for (run,floor),xs in groups.items():
 if max(x['attempt'] for x in xs)<=1:continue
 comparison.append({'run':run,'floor':floor,'asc':R[run]['ascension'],'wins':sum(x['result']=='won' for x in xs),'attempts':[{'attempt':x['attempt'],'result':x['result'],'explore':x['explore'],'draws':x['draws']} for x in xs],'limitation':'保留已录抽牌/explore，不默认整战同抽；牌序/重問/洗牌变化不作单因胜果。'})
(O/'sl-comparisons.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
lines+=['','- 全部156重打房的explore/draws/赢尝试保留sl-comparisons.json，历史155房与上一批记录对应；新F29一房4试0赢。F17/F27单试won未读档。F29四试起5血同双药，前三T2拦住未结；第3试T1实省致命毒药，最后重新执行第2试攻击/施毒/双刀线，T2least-loss双防御/毒雾/中和仍死。候选保护/双喝未执行，后缀与抽牌有变化，不称完整同抽单变量或所有分支无解。',
'- 历史赢次复核：E6DYYXRX7GVE恶魔第二试3血赢，T1后空翻、T2护栏双防御、多个后段亦变，T14毒47收44，不能只归护栏；LRN0HPZ0FZS1仪式兽第二试T1升级雾、结120毒获胜，其他选线亦变；既有共同抽序记录的局按记录长度核，不把洗牌后随机结果归必胜顺序。未据本批新增其他boss/精英策略或SL触发阈值。','',
'### 经验库自己带偏或写了没被执行的地方','',
'- 28次真实脑全部Codex、推理窗0条；无可核的逐条经验引用原话，不能证明经验诱导错选。以下是实际模型理由和兑现差。',
'- F18原话“克隆毒雾补成长，双店安全线补防御”。F19草蜢离场带走升级雾、奖励改拿普通雾，F24仍46血，不能把原计划升级成长当后段实有。',
'- F24原话“Free Shadowmeld improves defense while preserving energy for Skewer and escapes. Take the safer route and heal at the final fire.”（译：零费暗影保留能量并改善防御，走安全路在末火回血。）实际锻造兑现，无回血；F25/F27赢但耗41，尚未到末火即死，休息替线未实打。',
'- F28原话“Take two Foul Potions for the mandatory hallways. Their supported outcomes favor them over gambling on one rare potion.”（译：为强制走廊拿两污浊，已有结果优于赌罕见药。）题面两种丢药的boss估值均0/约3轮未区分完整药栏；本局两药均未饮，数量不当已经续命。',
'- F29第2试原候选64%含暗影/防御/饮药却未打：升级隐秘匕首误建抽2、实际弃两张再加两刀后重问攻击线；不称64%方案贯彻后死，不从单局推全部差额由一个bug造成。','',
'### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names={'silent-deck-burst-observation':'未兑现能力/生成后缀观察','silent-strength-weak-observation':'力量/敏捷与现场倍率','silent-noxious-fumes-growth':'毒雾轮初累积','silent-gorget-plating':'覆甲按当前剩层预算','silent-shadowmeld-new-block-double':'暗影新增挡翻倍','silent-slumbering-beetle-wake-growth':'甲虫醒后力量成长','silent-bowlbug-rock-full-block-stun':'石虫自身全挡眩晕','silent-dark-shackles-temporary-strength':'镣铐临时减力','silent-act-transition-missing-hp-heal':'跨幕缺失血80%回复','silent-obscura-summon-growth':'胧光召唤/存活攻击者','silent-vantom-slippery-growth':'滑溜限伤与力量成长','silent-mr-struggles-turn-start-damage':'抱抱先生轮初群伤','silent-deadly-poison-application':'致命毒药施层与实结','silent-foul-potion-slot-replacement-observation':'低血换药兑现观察','silent-weak-potion-hatching-window-observation':'卵变体虚弱窗口观察'}
mechanisms=[]
for c in C:
 e=c['after']
 if e['id'] not in names:continue
 name=names[e['id']];text=e['lesson'];case=text.split('典型案例：',1)[1];reason=text.split('典型案例：',1)[0];m=M[e['id']]
 lines.append(f'| {name} | {reason} | {e["n_support"]}/{e["n_contradict"]}；{m["asc"]}；参数{m["actions_or_rooms"]}动作/房、{m["parameter_runs"]}局（主题非逐公式分母） | {case} | {e["id"]} |')
 mechanisms.append(f'{name} — {text.split("。",1)[0]} — {e["n_support"]}支持/{e["n_contradict"]}反例 — {N}')
lines+=['','- 机制保持[0,20]；跨幕公式文字明确只在A9/A10核实、不补低阶数字；路线/构筑既有[8,20]，单局换药策略[10,20]。支持/反例完整局号在experience/changes及参数表；失败不当机制反例，尚存层数/未饮药/候选不当实伤/回复，不用预训练补机制。','', '### 新增','']
for c in C:
 if c['before'] is None:
  e=c['after'];lines.append(f'- {e["id"]}：{e["scope"]}/中文名{e["name"]}，{e["asc"]}，1支持/0反例、low；复盘既有账本{",".join(L[e["id"]])}，没有重复登记新id。')
lines+=['','### 更新','']
for c in C:
 if c['before'] is not None:lines.append(f'- {c["id"]}：{c["before"]["n_support"]}→{c["after"]["n_support"]}，加{N}与已核近例/数字；证据去重、适用范围和反例保持。')
lines+=['','### 退役','','- 无；未见新反例多于支持或对应新修机制。纯升级模型bug留独立修复链，不塞经验。','', '### 和手写知识及代码冲突','','- 手写知识改动：无。其他八份silent JSON逐份核SHA与上一批相同，生成统计/模型分母、自有截止和双boss适用范围另核；无手写规则被本局反驳，不用单局净损替代校准或覆盖并行刷新。见other-knowledge.json。',
'- 当前只读live card-model.ts:921/929/1109与turn-solver.ts:1312对隐秘匕首升级仍有普通版条件缺口，代码问题沿silent-0334独立提案；普通0153/S1.fix26修复不当升级覆盖。完整dirty运行源码未知，本任务不改源码。',
f'- 四份经验来源代码提案{",".join(P)}，source_task=experience-update、target_task=strategy-proposal；涉及combat/potion/sl/terminal/structure，覆盖17新改active条目。前三份原提案保留，第四份更正力量案例仅限末段、F23曾1力；全部pending，不冒称implemented/shipped。原复盘提案历史保持。','',
'### 代码问题（不给 DS）','',
'- 新定位升级隐秘匕首沿复盘silent-0334，最早已核A6 ENKYQMS9W4ZD F19T2；本批未新建bug账本或改修复队列。F24模拟288低于300门槛不给数值是保护边界，不造新bug；F25T4/F27T3损差单因未控。',
'- 本批初次update误把dynamic_values当字典，移除未用计数后修正，失败日志保留；核验先误把pending液态记忆排除的completed表当全饮数，再漏其他楼层镣铐施放，最后把末段无玩家力敏扩大为全局，均在提交前用原帧更正。F23T2有1力，仅F25/F27/F29无玩家力敏；初稿切片及三次verify失败、提案原件/更正均留存，最终978原件＋1002参数/角色核验通过。',
'- 完整dirty源码、前三SL退出/毒结算、独立覆甲与攻击逐击、永久敌GUID、完整最优线贯彻比例、早喝/留药/改线/休息替线整战、污浊实际剂量、未到后续房资源、旧boss时钟/实际费用等缺数据，保留限制。','',
'### 测试','',f'- 原bash agent/tools/test-sandbox.sh，TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1、nice19固定数据/固定排除。tsc退出{tests["tsc"]}；vitest {tests["files"]}文件/{tests["cases"]}例/退出{tests["vitest"]}；重跑{tests["rerun"]}。不改预算/测试/排除，合后完整沙箱外套件由调度器续验。',
f'- JSON合法、diff --check/gitleaks及check-experience通过；ledger.py check退出{ledger["check"]}。账本新增无；proposed {",".join(ledger["proposed"])}；退役无。旧claim/prior/首证/版本历史保持，只CLI追加，不标accepted/shipped，实际live数据由运维据完成事件登记。',
f'- live锁内结果：{merge.get("result","合后测试进行中")}；刷新{merge.get("refresh")}，合前{merge.get("pre")}，实际合入{merge.get("merged")}，合后沙箱{merge.get("tests")}。']
if merge.get('conflicts'):lines += ['- '+s for s in merge['conflicts']]
if not merge.get('merged'):lines+=['- 未合入，待调用方/运维按本批原件兜底；按任务冲突/重叠停止，不覆盖刷新/并行记录，不造eval版本，不发实际上线通知，不停对局。']
lines+=['','### 切片大小','','- 固定种子20260929，从截止内state.run.character_id=silent的最高两阶A9/A10各20状态×6界面，共240配对；各池足20。官方knowledge-slice.ts加CHARACTER=silent，冻结common和其他silent数据，仅换experience；池/时间戳留sample-manifest。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
lines += ['',f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["after_median"]-S["before_median"]:+}字），配对差中位{S["paired_median"]}，最大{S["before_max"]}→{S["after_max"]}；单片差{S["diff_min"]}至{S["diff_max"]}。',f'- active {U["active"]}、总正文{U["chars"]}字符，置信度{U["confidence"]}；A8 {U["applicable"]["8"]}，A9 {U["applicable"]["9"]}，A10 {U["applicable"]["10"]}。无合并/压缩/退役；需要Dai定：无。', '', '全部原件/偏移、基线复算、机制/SL参数、初稿/失败、CLI/提案、切片/测试/合入预检及报告留'+str(O)+'。']
text='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(text)
result={'task':'experience-update','version':'2026-10-09.17','commit':source,'merged':merge.get('merged'),'added':2,'updated':15,'retired':0,'active':196,'mechanisms':mechanisms,'tests':{'tsc':tests['tsc'],'vitest':tests['vitest'],'cases':tests['cases']},'ledger':ledger,'code_proposals':P,'implementation_domains':['combat','potion','sl','terminal','structure'],'report':str(O/'report.md')}
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text(text+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
print('报告与第128节已生成',len(text),'字符')
