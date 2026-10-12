import collections,json
from pathlib import Path
O=Path(__file__).parent.resolve();A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};C=json.load(open(O/'changes.json'));U=json.load(open(O/'update-summary.json'));M={m['entry']:m for m in json.load(open(O/'mechanism-evidence.json'))};P=json.load(open(O/'code-proposals-results.json'));L=json.load(open(O/'ledger-map.json'));S=json.load(open(O/'slice-summary.json'));N='E6DYYXRX7GVE'
source=(O/'source-commit.txt').read_text().strip();merge=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else {'merged':None,'result':'待锁内预检'};tests=json.load(open(O/'test-results.json'));ledger=json.load(open(O/'ledger-results.json')) if (O/'ledger-results.json').exists() else {'added':json.load(open(O/'ledger-added.json')),'proposed':list(dict.fromkeys(i for ids in L.values() for i in ids)),'retired':[],'check':None}
title=f'2026-10-09 静默猎手 第一百二十七次增量：1 局 A10（version 2026-10-09.16，分支 exp-silent，{source[:8]}）';(O/'changelog-title.txt').write_text(title+'\n');stamp=(O/'record-time.txt').read_text().strip()
lines=['## '+title,'','### 来源','',f'- 记录时间{stamp}。根notes/lessons.md:7631静默小节及run-1009-1003-E6DYYXRX7GVE.md日期，未见目标勘误；runs.jsonl:645核SILENT/A10/F45败、运行5ff4270d+dirty。完整dirty运行源码未记录，引用当前只读live源码只作接线核验，不冒充运行树。目标没有跨角色跳过；last_seen取run-1009日期。',
'- 开工exp-silent干净，git merge --no-edit main为无冲突合并cf68262b。已读README/最新STATE/decision-log末尾、学习协议/代码提案闭环、首次构建与最近两批方法、账本README；独立工作，不派agent、不联网、不运行play，抽数nice19单进程、固定测试单worker，不跑boss模拟池。',
f'- 全引擎silent学习观察截至{A["cutoff"]}，{len(R)}已结束局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧163局用于数字/机制复核，不冒称纯Codex爬塔战绩；无character旧局、其他角色、进行中及切点后局均排除。',
'- 新局按run id rg抽706决策/41脑/5SL/9计划；states/reasoning按01:22:36.636Z—02:03:12.336Z字节二分seek流式抽752状态/0推理，核state.run.character_id。1472原记录按复盘offset/length/SHA逐一回日志核验，另四数组全等，共1476原记录检查；总2593原字节/角色/参数/历史核验通过。实际脑为Codex，ds_*仅兼容字段。',
'- 口径沿上一节：战内净损=同房首COMBAT入口HP−末次退出HP，含自损/回复而非敌毛伤；SL同房一场，首试判死截断不算实死。Monster才是走廊，Unknown另算，F38事件战不混走廊；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient；多节点可关联同战，HEAL后战再去重，房/节点/动作/局分母分列，未列组合n=0。',
f'- 旧163局逐局重新analyze，七数组、血档房/局/损/死、节点转移、回血及SL全部同口径对齐：{json.load(open(O/"baseline-check.json"))}。历史全部本角色已结束复盘按机制关键词流式筛读，参数明细mechanism-evidence.json；泛主题支持数不是每个公式独立隔离样本。',
f'- 新增1、更新15（加证据15、只改数字0）、退役0；active193→{U["active"]}，正文51853→{U["chars"]}字符，低于55000压缩线/60000预算，无预算合并/退役/压缩。仅改silent/experience.json，不改其他角色或打法源码。',
'', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];m=M[e['id']];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}支持/反例；分阶{m["asc"]}；账本{",".join(L[e["id"]])} | {e["lesson"]} |')
lines+=['','新局独立战斗房（SL一房，F33首试只末观察另列；战斗退出后的回复包含在首末净损）。','', '| 层/幕/房型 | 首帧敌人 | HP进→末出/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run']==N:lines.append(f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines+=['','- 资源链：F42首50→敌伤后18→带骨肉回12到30，故净损20、实际承伤32；F43羽毛21至51＋HEAL17至68，F44无损血，F45满68仍死。三次主动HEAL21/21/17共59；取得羽毛之后七次到火15/18/18/18/10/21/21共121，五次锻造不另回血。F7尚无羽毛，到火26不回，不能混入羽毛七次。',
'- F12再生5/4/3/2实回14、承伤1/0/13/0共14，净9→9；同帧回复与敌伤会合，不能用可见HP正增量之和当毛回复。独立新得9瓶、实际饮10次，含同毒瓶SL前后复用，无购药/丢弃；F33首试8→70及原瓶恢复不是回血或新取得，首试已饮34毒未结算。',
'- F45初254，开场节日拉炮9→245；六轮敌净扣48/11/26/15/33/72共205，加开场9共214，末余40。末72=匕首雨+28＋打击12＋小刀4＋已结毒28；剩27毒不重复扣。六轮HP68/50/32/32/10/3/0，末完整需损17而实HP扣3被死亡截断，存活至少需18、差15。双毒雾/五敏/生成刀均实际建立，群蛇+/疯狂科学均未打。',
'', '分阶、幕、房型全部非空入口血档（赢战净损中位，死亡分开）。','', '| 进阶/幕/房型/血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','非战节点入口血档关联下一更高层首战；同战可被多个节点关联，死亡率按节点，不当独立局率。','', '| 进阶/幕/节点/血档 | 节点/独立后战 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','| 进阶/完局 | 独立营火/回血动作/锻造动作 | 实回HP | 去重回血后战/实死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for b in json.load(open(O/'rest-summary.json')):lines.append(f'| A{b["asc"]}/{b["runs"]} | {b["rests"]}/{b["heal"]}/{b["smith"]} | {sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}/{b["deaths"]/b["nexts"]:.2%} | {b["median"]} |')
lines+=['','- 动作包括同房重做，不能相加当独立火。低血路线仅观察：C48LLXBGKXQ9地道虫70→32后转无精英路；NTMAU4XZ2NN2 F11损17后添火，F12到66但下一走廊损23、精英43血死；本局F28以44血改线多火并锻造，F29羽毛回至62，旧路未走。不同牌组/节点/敌人/可选路线未控，不从死亡差或投影差认定改线因果，未来火也不预支。',
'', 'SL同房多试对照（跟踪单试获胜不算实际重打）。','', '| 进阶 | 重打房 | 记录尝试 | 赢尝试 |','| --- | --- | --- | --- |']
for b in json.load(open(O/'sl-summary.json')):lines.append(f'| A{b["asc"]} | {b["fights"]} | {b["attempts"]} | {b["wins"]} |')
groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
comparison=[]
for (run,floor),xs in groups.items():
 if max(x['attempt'] for x in xs)<=1:continue
 comparison.append({'run':run,'floor':floor,'asc':R[run]['ascension'],'wins':sum(x['result']=='won' for x in xs),'attempts':[{'attempt':x['attempt'],'result':x['result'],'explore':x['explore'],'draws':x['draws']} for x in xs],'limitation':'保留实录，不默认整场同抽；多个牌序/时点与洗牌后变化不作单因胜果。'})
(O/'sl-comparisons.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
lines+=['','- 全部多试场explore/draws/赢尝试保留sl-comparisons.json。本局F17/F22/F24是跟踪单试won而未读档，F45无SL；真正重打仅F33一房两试1赢。初始70血同瓶和七手相同，已记录前33抽牌顺序相同，但对应轮次不同且T8洗牌后未控。赢的那次T1把致命毒药换后空翻+，T2护栏双防御，T4毒雾/生存者、T6冲刺、T7防御/萎靡及多个后段亦变；T14毒收44、3血赢。不是只换一个护栏或药时点的实验，不将后续随机性归固定胜招，见new-sl-comparison.json。',
'', '### 经验库自己带偏或写了没被执行的地方','',
'- 41次实际脑均Codex，reasoning窗口0；只记录整份prefix SHA/字符，没有可核逐条知识引用原话，不证明某条经验诱导了错选。下面为真实模型理由与兑现差异。',
'- F43原话：“Heal to full before the mandatory elite; upgrading leaves inadequate survival margin. Preserve the route with fewer fights before recovery.” 休息实际51→68兑现17，羽毛另21；满血F45死不能证明理由来自某经验或此次没照做，锻造线未实打。',
'- F34原话：“稳定四能启动能力，三营火保血避连精英。”为复盘转录译义；鹿角终战确4能且加入三晕眩，群蛇+/疯狂科学却六轮未施放，未建增益不记胜因。F45毒瓶选线数值未知/effect not simulated，与已学6毒事实存在接线范围差，独立提案核源码，不冒称新bug或早喝必胜。',
'- F33第2次T2 HP guard原话含“hp -13 … more than 8 HP … hp -3 … instead”；实70→67、379→367兑现替线。取消隐秘匕首原后缀未执行，题面少8伤非实整轮少8，3血整场胜不能仅归这一护栏。',
'', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names={'silent-deck-burst-observation':'未施放能力/生成后缀观察','silent-strength-weak-observation':'力量/敏捷及现场倍率','silent-footwork-block':'步法逐牌格挡','silent-noxious-fumes-growth':'毒雾轮初叠毒','silent-piercing-wail-temporary-strength':'尖啸临时减力','silent-malaise-x-debuff':'萎靡X减益','silent-eternal-feather-rest-arrival-heal':'羽毛到火截断回复','silent-regen-potion-decay-heal':'再生衰减回复','silent-poison-potion-observed-application':'毒药施毒/实际结算','silent-knowledge-demon-healing-sl-observation':'恶魔回血/重打资源观察','silent-knowledge-demon-sloth-replay-observation':'懒惰牌额/药与毒收尾','silent-captains-wheel-third-turn':'舵盘第三轮挡','silent-deadly-poison-application':'致命毒药施毒','silent-infinite-blades-start-turn-shiv':'无尽刀刃轮初生成'}
for c in C:
 e=c['after']
 if e['id'] not in names:continue
 m=M[e['id']];main,case=e['lesson'].split('典型案例：');lines.append(f'| {names[e["id"]]} | {main} | {e["n_support"]}/{e["n_contradict"]}；分阶{m["asc"]}；参数{m["actions_or_rooms"]}动作/房、{m["parameter_runs"]}局（分母按来源，不当每公式隔离样本） | {case} | {e["id"]} |')
lines+=['','- 完整evidence/contradicting与支持分阶在changes.json/experience.json/mechanism-evidence.json；新机制[0,20]，既有统计/策略范围保持（A8适用等见下）；懒惰仅A10观察，不外推其他等级。战斗失败不当机制反例；没有早建能力/早喝/留药/原护栏整场受控胜果，只陈述已建立层数、实挡/实伤/实际恢复。',
'- 参数抽取沿旧口径只收completed出牌；F45T5生存者结果pending (unstable)，进入弃牌界面时已给13挡，单独seek原帧验证，不能因completed表没有此动作就写未施放。无尽刀刃历史12局76已完成施放全部核建1层，最早F9PP859XZ3RJ A4 F6T1；泛力量/构筑主题不是160/159个单公式对照实验。',
'', '### 新增','', '- silent-infinite-blades-start-turn-shiv：card:INFINITE_BLADES/中文名无尽刀刃，[0,20]，12支持/0反例，high；12局76已完成施放与本局四轮生成/直伤，关联新账本silent-0333。','', '### 更新','']
for c in C:
 if c['before'] is not None:lines.append(f'- {c["id"]}：{c["before"]["n_support"]}→{c["after"]["n_support"]}支持，追加{N}、更新数字/近例；证据去重、反例与适用范围保持。')
lines+=['','### 退役','', '- 无。同类只保留既有条目，生成刀为此前缺失的具体card条目；不把代码已会的实盘机制当“已修bug”退役。',
'', '### 和手写知识及代码冲突','', '- 手写知识改动：无。silent其他八份JSON逐份核SHA与上一批完全相同；各自生成截止/模型分母、双boss适用范围另核，未见与本局矛盾的手写知识，不以本次完局净损替代模型校准或覆盖刷新。见other-knowledge.json。',
'- 当前只读live reflex/combat-plan.ts:3135仅双boss上下文observedPoison；reflex/card-model.ts:1618有该值才生成毒瓶模型。普通层F33/F45已观察6毒却未接入，是使用范围差异，交独立strategy-proposal；本任务不直接改打法源码，不改铁甲。完整dirty运行树未知，不断言当前行号对应完整当局源码。',
f'- 四份经验来源代码提案{",".join(P)}，source_task=experience-update、target_task=strategy-proposal，覆盖16新改active经验；domains combat/potion/sl/terminal。普通楼层药效为候选规则接线变更，其余先核已有实现/边界；Roy授权已引用，均pending，不称implemented/shipped。复盘75bcaaf827438b5c/b0f2de4891312928原提案历史保持。',
'', '### 代码问题（不给 DS）','', '- 没有核实新纯bug。F45T4初题损21而萎靡后修为22，独立原因未定位；完整dirty源码、F33首试末结/退出、混合回血下逐源毛伤、永久敌ID、完整最优执行比例、护栏原线/早喝/改线实打、旧boss时钟/费用与未访F46—F49资源均缺，不补造事实或新bug。',
'- 初稿未执行的羽毛八次142、毒药当步180血已用实帧纠为七次121/170，update-draft-v1.py保留；首次update/verify因前置统计尚未生成而FileNotFoundError，随后按完成后顺序重跑。验证又先因pending生存者不在completed表而StopIteration、再因尚未获羽毛F7混入与再生/敌伤同帧错计失败；四份verify失败日志及update失败均留存，最终2593核验过。错误初稿/错误口径未发布；没有丢弃失败历史。',
'', '### 测试','', f'- 原bash agent/tools/test-sandbox.sh；TMPDIR本scratch、PATH本机node、SANDBOX_WORKERS=1，nice19固定数据/固定排除。tsc退出{tests["tsc"]}、vitest {tests["files"]}文件/{tests["cases"]}例/退出{tests["vitest"]}，测试重跑{tests["rerun"]}。未改预算/测试/排除，完整沙箱外套件由调度器续跑。',
'- JSON合法、原帧数值/角色/asc/evidence及未改条目核验；check-experience missing=[]退出0，ledger.py check退出0，diff --check/gitleaks通过，原日志保留。',
f'- 账本新增{",".join(ledger["added"])}；proposed {",".join(ledger["proposed"])}；退役无；check退出{ledger["check"]}。旧claim、首证、prior、状态/版本历史保持，只CLI追加，本次不标accepted/shipped；实际上线由运维按完成事件核实。',
f'- live锁内结果：{merge["result"]}；合前{merge.get("pre")}，刷新{merge.get("refresh")}，实际合入{merge.get("merged")}，合后沙箱{merge.get("tests")}。']
lines+=['- '+x for x in merge.get('conflicts',[])];lines+=['- 不同刷新数据重叠：'+x for x in merge.get('overlap_conflicts',[])]
if merge.get('merged') is None:lines.append('- 未合入，待调用方/运维兜底；按任务冲突或重叠停止，不覆盖刷新/并行记录，不造本批eval上线版本，不发实际规则上线双通知，不停对局。')
lines+=['','### 切片大小','', '- 固定种子20260929，从截至本局silent状态抽最高两阶A9/A10各20状态×6界面，共240配对，各池足20；按state.run.character_id隔离。官方knowledge-slice.ts用CHARACTER=silent，冻结common与其他silent知识，仅切前后experience，原时间戳/池大小留sample-manifest。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"]} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["paired_median"]} |')
lines+=['',f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["after_median"]-S["before_median"]:+}字），配对差中位{S["paired_median"]}，最大{S["before_max"]}→{S["after_max"]}；单片差{S["diff_min"]}至{S["diff_max"]}。',f'- active {U["active"]}，正文{U["chars"]}字符，置信度{U["confidence"]}；A8 {U["applicable"]["8"]}，A9 {U["applicable"]["9"]}，A10 {U["applicable"]["10"]}。无合并/压缩/退役，需要Roy定：无。', '',f'全部原件、偏移、旧基线复算、机制/SL参数、初稿/失败、CLI、切片/测试/合入预检和报告保留{O}。','']
text='\n'.join(lines);(O/'changelog-section.md').write_text(text);(O/'report.md').write_text(text)
result={'task':'experience-update','version':'2026-10-09.16','commit':source,'merged':merge.get('merged'),'added':1,'updated':15,'retired':0,'active':194,'mechanisms':list(names.values()),'tests':{'tsc':tests['tsc'],'vitest':tests['vitest'],'cases':tests['cases']},'ledger':ledger,'code_proposals':P,'implementation_domains':['combat','potion','sl','terminal'],'report':str(O/'report.md')};(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(title,'报告',len(text),'字符')
