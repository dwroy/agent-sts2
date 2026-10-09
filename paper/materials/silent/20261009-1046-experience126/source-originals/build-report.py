import collections
import json
from pathlib import Path

O=Path(__file__).parent.resolve()
A=json.load(open(O/'audit.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
C=json.load(open(O/'changes.json'))
U=json.load(open(O/'update-summary.json'))
M={m['entry']:m for m in json.load(open(O/'mechanism-evidence.json'))}
P=json.load(open(O/'code-proposals-results.json'))
L=json.load(open(O/'ledger-map.json'))
S=json.load(open(O/'slice-summary.json'))
N='NTMAU4XZ2NN2'
source=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
merge=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else {'merged':None,'result':'待锁内预检'}
tests=json.load(open(O/'test-results.json')) if (O/'test-results.json').exists() else {'tsc':None,'vitest':None,'files':None,'cases':None,'rerun':False}
ledger=json.load(open(O/'ledger-results.json')) if (O/'ledger-results.json').exists() else {'added':[],'proposed':list(dict.fromkeys(i for ids in L.values() for i in ids)),'retired':[],'check':None}
title=f'2026-10-09 静默猎手 第一百二十六次增量：1 局 A10（version 2026-10-09.15，分支 exp-silent，{source[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
stamp=(O/'record-time.txt').read_text().strip()
lines=['## '+title,'','### 来源','',
 f'- 记录时间{stamp}。根notes/lessons.md:7582静默猎手小节和run-1009-0917-NTMAU4XZ2NN2.md日期；无勘误。runs.jsonl:644核SILENT/A10/F14败，57a7f485+dirty；完整dirty源码未记录，不把当前源码当当局完整树。目标局未跨角色跳过，last_seen取run-1009日期。',
 '- exp-silent开工干净，git merge --no-edit main快进9f7cceaf→177c13ac，无冲突；README、最新STATE、decision-log末尾、学习协议/代码提案闭环、首次构建及最后两次增量方法、账本README已读。独立完成，不派agent、不联网、不运行play；数据工具nice19单进程，固定测试单worker，无boss模拟池。',
 f'- 全引擎本角色学习观察截至{A["cutoff"]}，{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧162局只进数字与历史机制复核，不冒称纯Codex爬塔成绩；无character旧铁甲、其他角色、进行中/切点后局排除。',
 f'- 按run id rg抽214决策/13脑/0SL/2计划；states/reasoning按01:07:30.954Z—01:17:25.811Z二分字节seek流式抽220帧/0推理，核state.run.character_id及局号。原复盘状态、决策、计划436条原字节seek全等，本批合计{json.load(open(O/"verification.json"))["checks"]}项原字节/参数/证据核验通过；实际大脑13次全Codex，ds_*是兼容字段，无DS引用原文证据。',
 '- 口径沿上一节：同房首COMBAT入口HP−末次退出HP，含自损/回复而非敌毛伤；SL一房一场，判死截断不算实死。Monster才是走廊，Unknown另算，F11确为问号战；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient；多节点可关联同战，HEAL后战再去重。房/节点/动作/局数分开，未列组合n=0。',
 f'- 旧162局全部子集重新analyze/audit；七数组、血档房/局/损/死、节点、回血及SL全部一致，无口径漂移：{json.load(open(O/"baseline-check.json"))}。全部已结束silent复盘流式筛出667段相关机制历史；九条证据角色/进阶/状态核验，参数动作完整保留mechanism-evidence.json，主题总支持不等每条公式隔离分母。',
 f'- 新增0、更新9（加证据9、只改数字0）、退役0；active193→193，正文51769→{U["chars"]}字符，低于55000压缩线/60000预算。无预算合并/退役/压缩，未改范围和置信度规则。初稿错误和失败日志保留，不提交未经核验的案例。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];m=M[e['id']]
 lines.append(f'| {e["id"]} | {e["n_support"]}支持/{e["n_contradict"]}反例；分阶{m["asc"]}；账本{",".join(L[e["id"]])} | {e["lesson"]} |')
lines+=['','新局独立战斗房：末场实死，前五退出后推进/奖励证实实胜。','', '| 层/幕/房型 | 首帧敌人 | HP进→出/净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run']==N:lines.append(f'| F{f["floor"]}/幕{f["act"]}/{f["type"]} | {",".join(f["enemies"])} | {f["hp"]}→{f["last_hp"]}/{f["loss"]} | {"是" if f["death"] else "否"} |')
lines+=['','- 两次休息F9 41→62、F12 45→66，共42；六战净损5/8/2/17/23/43共98，56＋42−98=0。实得两瓶、实际饮两瓶、丢弃/购药0、终场空药，无SL恢复或药水回血。F4建2力量、F8饮虚弱，未取得计划中的步法/毒雾/触媒，无实际能力牌施放，力量未跨战。',
 '- F14本体T6死生四虫20/18/22/19共79血，145总需求=66＋79，已兑现截断扣119，末余26；同种敌按本局不同maxHP核，永久实体GUID未知。T9两感染6＋攻9−挡8=7，15→8；T10三感染9＋毒后幸存攻击11−挡5=15，8血实死，毒结束1血虫、另一虫8→4，仍余22/4。不把本体退场当整战赢或新增虫血当本体回复，不把−7剩HP当损7。',
 '', '分阶/幕/房型所有非空入口血档；房与局分母分列，活损是赢战净HP消耗。','', '| 进阶/幕/房型/血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','非战节点入口血档关联下一更高层首战；同战可被多个节点关联，死亡按节点，不能当独立局率。','', '| 进阶/幕/节点/血档 | 节点/独立后战 | 实死/率 | 活损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
 if b['n']:lines.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines+=['','| 进阶/完局 | 独立营火/回血动作/锻造动作 | 实回HP | 去重回血后战/实死/率 | 活损中位 |','| --- | --- | --- | --- | --- |']
for b in json.load(open(O/'rest-summary.json')):
 lines.append(f'| A{b["asc"]}/{b["runs"]} | {b["rests"]}/{b["heal"]}/{b["smith"]} | {sum(b["gains"])} | {b["nexts"]}/{b["deaths"]}/{b["deaths"]/b["nexts"]:.2%} | {b["median"]} |')
lines+=['','- 独立火按局/层去重；动作含同房重做，故不能将两动作列相加当独立火数。低血选不同节点的死亡差只为观察，未控牌组/抽牌/下一敌/可选路线。新局F11改线增加营火，实到精英43比新投影63/p75 58少20/15；旧线42没实走，不能说改线只赚1血或无效。历史silent如C48LLXBGKXQ9地道虫70→32后改无精英路，与新局高血时添营火均是实际选择，不能冒充同盘路线因果对照。',
 '', 'SL重打沿同房/记录尝试/赢尝试口径；本局没有SL，未增加新的胜负配对经验。','', '| 进阶 | 重打房 | 记录尝试 | 赢尝试 |','| --- | --- | --- | --- |']
for b in json.load(open(O/'sl-summary.json')):lines.append(f'| A{b["asc"]} | {b["fights"]} | {b["attempts"]} | {b["wins"]} |')
groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
comparison=[]
for (run,floor),xs in groups.items():
 if max(x['attempt'] for x in xs)<=1:continue
 comparison.append({'run':run,'floor':floor,'asc':R[run]['ascension'],'attempts':[{'attempt':x['attempt'],'result':x['result'],'explore':x['explore'],'draws':x['draws']} for x in xs],'wins':sum(x['result']=='won' for x in xs),'limitation':'draws/explore保留实际记录，不默认整场相同抽牌；有多处变动或回放偏离不作单因胜果。'})
(O/'sl-comparisons.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
lines+=['','- 所有多试房的赢家/输家、explore和draws逐项留sl-comparisons.json；字段是实录，不默认为整场同抽牌。已有PBUBM0LRTEDD女王第三试T9胜26血空药，多处选择和抽牌变化，下一boss仍六败；VAC6Z1PZ1QJG女王六试同67血两药仍零赢，第4/5试回放T1不一致停止。赢家改变什么与后续随机性分账，不由本局无SL改触发规则。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 13次大脑实际都是Codex，reasoning窗口0；记录只有整份知识prefix_sha/chars，没有可核的逐条引用原话，不能证明某经验导致死亡。以下是模型理由/计划与实际兑现差异。',
 '- F9原文：“Healing provides a strong elite buffer while two upcoming question rooms unlock power access before the elite and boss.” 实回到62，但后问号战损17、另一火回21、走廊损23，末精英43血；没有实际取得/施放计划能力，不把计划当增益已建立。',
 '- F12原文：“Heal to 66 HP: a forced elite follows the hallway with no intervening recovery or shop, and we have no potions.” 回血确实照做，下一走廊66→43再进精英死，不是没执行；休息/留药另一线未实打。',
 '- F14T1五轮8样本0赢0死、尾端估计97%后追加空过，实整战死亡；这不是97%实际胜率或已定位知识因果。F14T2护栏省题面10血并多节点伤10，但取消三小刀，原线只推演到生成节点，不能称三小刀整轮零伤。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names={'silent-deck-burst-observation':'长战/生成资源观察','silent-strength-weak-observation':'力量逐击与现场增益','silent-gorget-plating':'覆甲按剩层给挡','silent-toric-toughness-delayed-block':'坚韧即时及两轮延迟挡','silent-infection-end-turn-block':'感染先耗挡再验毒杀','silent-deadly-poison-application':'施毒与已结算毒分账','silent-poisoned-stab-components':'刺击直伤/毒结算/幸存攻击'}
for c in C:
 e=c['after']
 if e['id'] not in names:continue
 m=M[e['id']];main,case=e['lesson'].split('典型案例：')
 lines.append(f'| {names[e["id"]]} | {main} | {e["n_support"]}/{e["n_contradict"]}；分阶{m["asc"]}；参数明细{m["actions_or_rooms"]}动作/房、{m["parameter_runs"]}局（泛主题非每公式隔离样本） | {case} | {e["id"]} |')
lines+=['','- 每条完整evidence/contradicting在experience与changes.json；机制[0,20]、统计/构筑[8,20]保持。没有将战斗失败当机制反例；覆甲完整减层触发、另牌序/留药整战胜果未知，局部效果和末轮预算已核，整场单因未控。环新局已附魔，不能沿上一节“普通牌”文字把7全归敏捷，本次改成未附魔基础5、附魔增量另核。',
 '', '### 新增','', '- 无。','', '### 更新','']
for c in C:lines.append(f'- {c["id"]}：{c["before"]["n_support"]}→{c["after"]["n_support"]}支持，追加{N}，更新数字与已核近例；原范围、反例、其他条目保持。')
lines+=['','### 退役','', '- 无。本次保留实盘机制，不将代码已有计算误作“机制已修”的差错条目退役。',
 '', '### 和手写知识及代码冲突','',
 '- 手写知识改动：无。silent其他八份JSON逐份核SHA、来源截止/遭遇或模型分母，与上一节完全相同；room-costs、monster-records、outcome-stats和校准模型按自身口径，不用本次163完局净HP表强行覆盖，无手写攻略冲突，见other-knowledge.json。',
 '- 当前只读combat-plan.ts:3269打印leastLoss.outcome.hpAfter，与8−15=−7一致；:4311附近的护栏按现行条件替换，不从生成节点未执行原线认定纯bug。未改打法源码、未改变其他角色；缺完整dirty当局树，不宣称当前源码就是当局完整实现。',
 f'- 两份提案{",".join(P)}，source_task=experience-update、target_task=strategy-proposal，覆盖9相关active经验、9账本；domains combat/potion/terminal，pending，不称implemented/shipped。复盘原提案0e79fdad2031a599/b995b7d123aba963保持历史；本次补本来源经验的独立链。',
 '', '### 代码问题（不给 DS）','',
 '- 没有证实新纯bug。缺完整dirty源码、永久敌ID/末击毛伤、原护栏线/早施毒/留药/改线另一方案整场实打、完整方案贯彻比例、未访F15—F17实盘资源、boss旧时钟/实际血价、Jev缓存及实付费用。终局负7为正确HP预算，保留感染实盘数据不造漏算bug。',
 '- 首次verify在拟写的F14T3刺击找不到实打，纠正为F8T4与F14T8原帧，experience-draft-v1.json/verify-first-failure.log保留，错误初稿未提交/未入根复盘或经验发布。登记首次漏载0020账本导致KeyError，补show来源后只续未成功CLI，register-first-failure.log留史，无重复support写入。',
 '', '### 测试','',
 f'- 原bash agent/tools/test-sandbox.sh，TMPDIR本scratch，PATH本机node，SANDBOX_WORKERS=1、nice19，固定数据/固定排除；tsc退出{tests["tsc"]}，vitest {tests["files"]}文件/{tests["cases"]}例/退出{tests["vitest"]}，重跑{tests["rerun"]}。未改预算/排除/测试，完整外部套件交调度器。',
 '- JSON合法、n/证据角色/asc/scope/name和未改条目等价核验；check-experience missing=[]/退出0，diff --check/gitleaks退出码见原日志。',
 f'- 学习账本新增无；proposed {",".join(ledger["proposed"])}；退役无；ledger.py check退出{ledger["check"]}。首证/prior/claim/原证据/旧版本保持，不改accepted或shipped，实际数据上线由运维核完成事件。',
 f'- live锁内结果：{merge["result"]}；合前{merge.get("pre")}，刷新{merge.get("refresh")}，实际合入{merge.get("merged")}，合后沙箱{merge.get("tests")}。']
lines += ['- '+x for x in merge.get('conflicts',[])]
if merge.get('merged') is None:lines.append('- 未合入，待调用方/运维兜底；按任务冲突即停，不覆盖刷新/并行记录，不新增上线eval版本，不发实际规则变更双通知，不停对局。')
lines+=['','### 切片大小','', '- 固定种子20260929，从截至本局silent状态抽最高两阶A9/A10各20状态×6界面，共240配对，各池足20。官方knowledge-slice.ts用CHARACTER=silent；冻结common/silent其他知识，只切前后experience，sample-manifest保存各池/原时间戳。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"]} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["paired_median"]} |')
lines+=[ '', f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["after_median"]-S["before_median"]:+}字），配对差中位{S["paired_median"]}，最大{S["before_max"]}→{S["after_max"]}；单片差{S["diff_min"]}至{S["diff_max"]}。',
 f'- active {U["active"]}，正文{U["chars"]}字符，置信度{U["confidence"]}；A8 {U["applicable"]["8"]}，A9 {U["applicable"]["9"]}，A10 {U["applicable"]["10"]}。无合并/退役/压缩，需要Dai定：无。', '', f'全部子集/偏移、旧基线复算、原帧机制、初稿/失败、CLI提案、切片/测试/合入预检和报告保留{O}。','']
text='\n'.join(lines)
(O/'changelog-section.md').write_text(text)
(O/'report.md').write_text(text)
result={'task':'experience-update','version':'2026-10-09.15','commit':source,'merged':merge.get('merged'),'added':0,'updated':9,'retired':0,'active':193,'mechanisms':list(names.values()),'tests':{'tsc':tests['tsc'],'vitest':tests['vitest'],'cases':tests['cases']},'ledger':ledger,'code_proposals':P,'implementation_domains':['combat','potion','terminal'],'report':str(O/'report.md')}
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(title,'；报告',len(text),'字符')
