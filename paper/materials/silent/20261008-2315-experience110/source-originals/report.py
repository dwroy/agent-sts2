import collections,fcntl,hashlib,json,re,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
def read(n):return json.load(open(O/(n+'.json')))
A=read('audit');C=read('changes')['entries'];U=read('update-summary');V=read('slice-summary');M=read('ledger-map');H={e['id']:e for e in read('historical-mechanism-summary')};N=read('numbers-checked');commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip();live=read('live-merge') if (O/'live-merge.json').exists() else dict(merged=None,result='尚未执行合入');ledger=read('ledger-results')
log=(O/'test-source.log').read_text();rc=int((O/'test-source.rc').read_text());tests=dict(tsc=0 if ' RUN ' in log else rc,vitest=rc,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))));assert tests['vitest']==tests['tsc']==0;assert int((O/'test-experience-final.rc').read_text())==0
(O/'test-results.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2)+'\n')
names={'silent-strength-weak-observation':'力量与敏捷','silent-frail-card-block':'脆弱逐张牌挡','silent-deck-burst-observation':'能力启动与收益兑现','silent-insatiable-dual-clock':'沙坑与攻击双截止','silent-kin-poison-sl-observation':'同族真实输出与战耗','silent-act-transition-missing-hp-heal':'跨幕按缺失HP回复','silent-axebot-stock-phase-budget':'库存分阶段需求'}
mechanisms=[]
for c in C:
 e=c['after']
 if '机制：' in e['lesson']:mechanisms.append(' — '.join([e.get('name') or names.get(e['id'],e['id']),e['lesson'].split('机制：')[0],str(e['n_support'])+'支持/'+str(e['n_contradict'])+'反例','R3AJCGQGGMR4']))
result=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=U['added'],updated=U['updated'],retired=U['retired'],active=U['active'],mechanisms=mechanisms,tests={k:tests[k] for k in ['tsc','vitest','cases']},ledger={**ledger,'check':int((O/'ledger-check-final.rc').read_text())},code_proposals=read('proposal-ids'),implementation_domains=['combat','potion','sl','structure'],report=str(O/'report.md'))
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines=['## '+heading,'','### 来源','',f'- 记录时间{now}。只读根notes/lessons.md:6232静默猎手R3AJCGQGGMR4复盘，并按节后两条勘误：T1后净9中3与毒一致，另6来源未知，不归三刃回旋镖；第一次勘误的实际date为22:42:33而非标题误录22:42:27。runs.jsonl:626核SILENT/A10/F45败，无角色跳过。运行11d759cf+dirty完整树未记录。',
'- exp-silent开工git status干净，git merge --no-edit main无冲突快进至b328ab06；读取README、最新STATE、decision-log末尾、学习协议/代码提案、首次构建/末两节方法、静默108/109节及账本README。独立执行，不派agent，不联网/不运行play或boss模拟池，不改打法源码/其他角色知识。临时文件只在本任务scratch，抽取nice19单进程，固定沙箱1worker。',
'- 按局号抽668决策、45大脑请求、7 SL记录、10计划及Jev题面；states/deepseek-reasoning按UTC窗二分字节seek流读，697状态核run_id及state.run.character_id=SILENT。窗2026-10-08T13:21:45.131Z—14:04:10.328Z；45脑请求均Codex，DeepSeek实际请求/推理0，兼容ds_*名称不证引擎。原始抽取、偏移及逐房明细保留。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(A["runs"])}静默完局、{len(A["fights"])}独立战斗房、{sum(f["death"] for f in A["fights"])}实际死；分阶'+str(dict(collections.Counter(r['ascension'] for r in read('run-metadata'))))+'。除本局外144局只进数字/历史验证；排缺character旧铁甲、其他角色、进行中及切点后局，不称纯Codex爬塔战绩。',
'- 口径沿上一节：战内净损=第一COMBAT入口HP−同房最后尝试退出HP，包含战内回复/自损/负净损，不作敌毛伤；实际死亡单列，SL判死截断不当实死。走廊仅Monster，Unknown问号另列；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient；多源可重复，回血后战去重，营火房与动作分列。SL同房两试只计一房。',
'- 旧144局七数组（2082房/1984节点后战/900休息动作/47111牌动作/13410结束回合/859尝试/3865同族帧）、全部血档/节点转移/休息与SL复算逐行一致，无原统计漂移。新19房/20尝试窗口（其中一个判死截断）、131原帧及历史断言通过；673段静默主题复盘与145局日志交叉复核；动作/持有出现不自动扩大整条支持。',
'- 历史新增核验：13库存局全部逐帧见三阶段不同上限，无固定增长倍率；跨轮新毒帧不反推内部结算。光滑石头旧十支持局91房可重现，新局F29取得后8房，应11局99房，不是初稿按整局十九房推110；经验已修、补CLI勘误，原失败日志/原四提案及补充提案全部保留。首证/prior/旧claim不改。',
f'- 新增{U["added"]}、更新{U["updated"]}（{U["updated"]}加证据、0只改数字）、退役0；active{U["active_before"]}→{U["active"]}，正文{U["chars_before"]}→{U["chars"]}字符。低于55000压缩线与60000预算，无合并/退役/压缩，测试预算不改。','','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
 e=c['after'];lines.append('| '+e['id']+' | '+str(e['n_support'])+'支持/'+str(e['n_contradict'])+'反例；分阶'+str(H[e['id']]['by_asc'])+'；账本'+','.join(M[e['id']])+' | '+e['lesson'].replace('|','/')+' |')
lines+=['','分阶/幕/房型/入口血档的下一战，房数为独立战斗房，同局可多房；死亡率=实死/n，活战净损中位保留负值。','', '| 进阶 | 幕 | 房型 | 血档 | 房数/局数 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['bands']:
 if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["type"]} | {b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','REST/SHOP/普通EVENT按节点入口血档关联下一战，多节点可关联同一战，不作节点因果实验。','', '| 进阶 | 幕 | 节点 | 血档 | 节点数/去重后战 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['transfers']:
 if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["screen"]} | {b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','| 进阶 | 局数 | 独立火/回血动作 | 实回HP | 去重回血后战/实死 | 活战净损中位 | SL多试房/尝试/赢次 |','| --- | --- | --- | --- | --- | --- | --- |'];sl={s['asc']:s for s in read('sl-summary')}
for r in read('rest-summary'):
 s=sl[r['asc']];lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','本局全部独立房：','', '| 层/房型 | 首末HP | 净损 | 实死 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run']=='R3AJCGQGGMR4':lines.append(f'| F{f["floor"]}/{f["type"]} | {f["hp"]}→{f["last_hp"]} | {f["loss"]} | {f["death"]} |')
lines+=['','- 完整血链：18胜净耗346；七到火羽毛12/12/18/18/18/21/24共123，五HEAL23/14/23/22/22共104，两锻造不回血；吃蛋+7、跨幕+55/+59、事件−6，56＋123＋104＋7＋55＋59−6−346=52，才是F45入口。SL首试15→61及狡诈恢复单列，不作回血/新获药。',
'- 无精英三幕仍胜F37 52→32、F39 32→8、F43 51→6，前两战药已饮；F40羽毛8→29再HEAL到51，下一火前投影35/p75 23，实到6；F44羽毛6→30再HEAL到52实到巨斧。A10三幕Monster≥60%入口84房/35局、3死、活损中位18，低血三档另见表；高入口不意味着胜战零耗。',
'- 本局F21确改更早到火线，代价F29必经精英；未走的原路线无实盘结局。历史各节点/血档比较是相关性，构筑、敌人和可选路线不同；本局未来F48/F49及条件75血未到，不推出改线/留药/锻造一定更好。',
'- SL：本局仅沙虫一场重打、两试一赢；所有静默沙虫真正重打15场60试8赢。同盘T3同手/抽牌/弃牌序，SL撤投掷匕首使294→252的42实伤改为294→262的32，均52→27损25；第2试随后药提前T4、T5防御、T6弱化/逃离、T7触媒/逃离护栏同变后3血胜。首试T6判死退出结算缺帧，不算实死；不能把整线转胜归撤刀、早喝或仅保留T5逃离，也未隔离后继运气。',
'- 药水12瓶净新获、13次实饮（含SL恢复后同瓶狡诈第二饮）、零弃药，F22攻击药/F45赌徒动作pending但有后续选牌帧实效。audit.potions仅索引completed动作，两个pending不计该检索索引；不把其索引数当实际饮用总数。无留药/单饮用时点完整胜负对照，不新增喝留阈值。',
'- 巨斧库存13局：','', '| 局号/进阶/层 | 库存2上限 | 库存1上限 | 无库存上限 | 实死 |','| --- | --- | --- | --- | --- |']
for h in read('stock-history'):lines.append('| '+h['run']+'/A'+str(h['asc'])+'/F'+str(h['floor'])+' | '+str(h['stages']['2'])+' | '+str(h['stages']['1'])+' | '+str(h['stages']['0'])+' | '+str(h['death'])+' |')
lines+=['','### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek推理/请求0，没有DeepSeek引经验id的原话；实际Codex题面及答案保留，未建立具体经验id导致决策的因果链。',
'- F16原话“Master Planner’s cost reduction enables affordable setup and a lasting discard-defense engine.”（谋划专家减费帮助启动与持续弃牌防御）；F45虽后来实建谋划专家，余像到死未打，步法T7才建，不能把构筑持有当全场逐牌挡。',
'- F40回血原话“Healing protects the next campfire and enables later upgrades.”（回血保护到下一营火并允许后续升级）；HEAL即时51兑现，但到火前投影35/p75 23实际6。模型概率与单局差额不直接判bug，未来回血也不当已到。',
'- 首试沙虫原Jev计划投掷匕首→匕首雨→逃离，强制弃牌却弃掉唯一在手逃离，续计划被重算。F45八道选线均选推演最优/并列最优；T5 7/8后续样本赢而实盘仍需第三台99并死，不能把败局简单称低信心误选或把所有误差归库存缺口。','','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
 e=c['after']
 if '机制：' not in e['lesson']:continue
 reason=e['lesson'].split('机制：',1)[1].split('决定胜负的战斗：',1)[0];case=e['lesson'].split('典型案例：',1)[-1];lines.append('| '+(e.get('name') or names.get(e['id'],e['id']))+' | '+reason+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；'+str(H[e['id']]['by_asc'])+' | '+case+' | '+e['id']+' |')
lines+=['','巨斧本体77+90+99=266，按恢复新生校正逐轮清血[39,50,3,39,34,2,12]合179，余87；恢复中间零血/过量帧缺，不称毛伤。触媒2额外配新5毒只结5+4+3=12，旧27毒不继承。末26攻−12挡需损14，而9血只能截断扣9；至少还差6血存活，不是差6伤斩杀。F33第2试81血先打击12，36毒配触媒两次可清剩69，逃离延长后3血胜；未结算的首试35毒不预支。',
'机制支持不是单组件整战因果：力量/敏捷、毒/减益及遗物触发据真帧，构筑、路线、药时点/目标序只有观察。13库存支持针对三阶段HP预算；只有本局恢复当步有明确清旧毒帧，历史第一帧已补新毒时不推出内部先后。机制asc[0,20]并注明已见进阶，策略范围保留原值（同族策略A10，构筑统计A8+）；不把A0固定数值搬至A10。','','### 新增','',
'- silent-axebot-stock-phase-budget：hallway:AXEBOT，13支持/0反例，high，[0,20]；账本silent-0312，首证LRN0HPZ0FZS1 A0、prior yes保持。本角色过去已经处理三台，只是本次补齐库/账本与完整需求。','','### 更新','']
for c in C:
 if c['kind']=='updated':lines.append('- '+c['id']+'：支持'+str(c['before']['n_support'])+'→'+str(c['after']['n_support'])+'；反例'+str(c['after']['n_contradict'])+'；加R3AJCGQGGMR4，更新案例/汇总；账本'+','.join(M[c['id']])+'。')
lines+=['','### 退役','','- 无。无本任务代码修复、反例超支持或高阶推翻；旧retired历史保留，无预算合并/压缩。','','### 和手写知识及代码冲突','',
'- 核静默其他8份JSON的用途/来源字段/证据与SHA，均为生成统计/模型/证据：boss-damage、boss-trust、double-boss、fight-value、fight-value-gates、monster-records、outcome-stats、room-costs。不同截止点/模型预测不是机制反例；未到双boss不据本局改终局参数。需要修改的手写知识：无。',
'- 纯源码手写知识不改。复盘只读参考9949a5de rollout.ts:1690仍沿旧maxHp恢复、:3196按库存乘旧上限低报余需；这是silent-0311已经登记的纯bug，不进入DS经验。经验只保留实见阶段事实/资源预算，独立stock提案先核当前live和原postmortem提案去重。当前正确机制保持等价，完整dirty树不等当前参考源码。',
'- 四初始代码提案及一光滑石头勘误补充：'+','.join(result['code_proposals'])+'。source_task=experience-update、target_task=strategy-proposal，实际domains combat/potion/sl/structure；18新改经验均有关联证据/账本/实现任务。未实现源码，不标implemented/shipped；原四稿110房错误已由补充提案纠正，原稿/CLI不覆写。','','### 代码问题（不给 DS）','',
'- 无新增纯bug；现有silent-0311库存恢复模型缺口仍observed、原postmortem提案保留，本任务不更新其为proposed或声称修复。旧当前上限77×3=231对实266少35，不能据此归因所有预测差额、或承诺补模整场转胜。',
'- 数据限制：完整dirty运行树；首试沙虫T6未派发退出结算；部分独立归零/过量及毛伤、同帧内部时点/多敌独立死亡序；恢复数值分布/误差归因份额；完整实际执行最优比例；单保逃离/单药时点/替路线构筑整场反事实；未到F46—F49资源；时钟估计及比值、Jev缓存/实际费用。不得预训练补。',
'- 原帧验证初稿按全局19房误计石头，独立逐房获取层核后改新8/总99；第一次失败及错误记录保留。第二草稿精确label漏掉+ potion后缀而找不到SL首题，修成plan-choice前缀后131断言通过，不把续步当首题。未改测试预算或排除名单。','','### 测试','',
f'- 原入口bash agent/tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19/SANDBOX_WORKERS=1，固定数据；tsc {tests["tsc"]}，vitest {tests["files"]}文件/{tests["cases"]}用例/退出{tests["vitest"]}，完整入口未因失败重跑。石头数字纠正后另跑experience.test.ts，退出0（用例数见固定日志）；没有改代码或人为缩小入口排除清单。不冒报沙箱外完整套件通过。',
'- JSON/唯一id/scope/中文名/本角色12位局号/支持反例数/置信度/last_seen/预算/240配对切片通过，原帧及历史131断言通过；check-experience missing=[]/退出0；ledger.py check退出'+str(result['ledger']['check'])+'；gitleaks stdin/redact及git diff --check均0，原日志保留。',
'- 账本只经CLI：新增[]；proposed '+','.join(ledger['proposed'])+'；retired[]。18账本覆盖18经验，首证/prior/claim/原support/repeat及旧状态/版本历史保持；0312补11旧局支持、0311纯bug不动。实际数据shipped由运维核live完成事件登记，五提案均未实现。',
'- live锁内：'+live['result']+'；刷新'+str(live.get('refresh'))+'；合前'+str(live.get('pre'))+'；实际合入'+str(live.get('merged'))+'。']
if live.get('conflicts'):lines+=['- '+x for x in live['conflicts']]
if live.get('knowledge_overlap'):lines.append('- 刷新知识重叠：'+str(live['knowledge_overlap']))
if live.get('merged'):lines.append('- 合后沙箱退出'+str(live.get('tests_retry',live.get('tests')))+'；发布/eval/Roy双通知见publication回执。')
else:lines.append('- 未实际合入，不创建上线/eval版本或Roy规则上线通知；保留刷新、预检、失败现场/日志/源提交，按用户冲突流程停止，交调用方和运维兜底，不停对局。')
lines+=['','### 切片大小','',
'- 固定种子20260929，从截至切点SILENT状态抽最高两阶A9/A10各20状态×6界面，共240前后配对；manifest留池/时间/唯一帧及不足有放回标志。CHARACTER=silent调用官方knowledge-slice.ts，common/silent/outcome冻结同份，只换experience。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for p in V['pairs']:lines.append(f'| {p["sample"]} | {p["before_median"]}/{p["before_max"]} | {p["after_median"]}/{p["after_max"]} | {p["paired_median"]} |')
lines+=['',f'- 整体中位{V["before_median"]}→{V["after_median"]}、涨{V["median_change"]}字；配对差中位{V["paired_median"]}；最大{V["before_max"]}→{V["after_max"]}；单片最大增加{V["max_change"]}。',
f'- active{U["active"]}，正文{U["chars"]}字符，置信度'+str(U['confidence'])+'；A8适用'+str(U['asc']['8'])+'；A9适用'+str(U['asc']['9'])+'；A10适用'+str(U['asc']['10'])+'。无需压缩/合并/预算调整，无需要Roy定的规则。','', '证据/脚本/切片/提案/CLI/测试/失败日志/合入回执：'+str(O)+'；报告时间'+now+'。','']
section='\n'.join(lines);(O/'changelog-section.md').write_text(section);(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
summary=['## 经验库更新回报',f'- 版本：{U["old_version"]} → {U["version"]}；提交：{commit}（分支 exp-silent）；合入：'+str(live.get('merged') or '未合入'),f'- 条数：新增1、更新17（加证据17、只改数字0）、退役0；active185→186；正文{U["chars"]}字符，A8 {U["asc"]["8"]["entries"]}条/{U["asc"]["8"]["chars"]}字符，A9 {U["asc"]["9"]["entries"]}条/{U["asc"]["9"]["chars"]}字符','- 机制推理：']
summary+=['  - '+m for m in mechanisms];summary+=['- 改了的手写知识：无',f'- 测试：tsc 退出{tests["tsc"]}；vitest {tests["files"]}文件/{tests["cases"]}用例/退出{tests["vitest"]}；数字勘误后补跑经验测试退出0',f'- 切片大小：中位涨{V["median_change"]}字，最大{V["after_max"]}字','- 学习账本：新增无；改成proposed '+','.join(ledger['proposed'])+'；退役无；ledger.py check退出'+str(result['ledger']['check']),'- 需要Roy定的事：无'+('；合入冲突按任务停止，待调用方/运维兜底。' if not live.get('merged') else ''),'','```json',json.dumps(result,ensure_ascii=False),'```','',section]
(O/'report.md').write_text('\n'.join(summary))
if '--append' in sys.argv:
 path=ROOT/'paper/materials/experience-changelog-silent.md'
 with path.open('a+') as f:
  fcntl.flock(f,fcntl.LOCK_EX);f.seek(0);assert not any(line.rstrip()=='## '+heading for line in f),'本节已存在，拒绝重复';f.seek(0,2);offset=f.tell();f.write('\n'+section);f.flush()
 (O/'changelog-append.json').write_text(json.dumps(dict(path=str(path),offset=offset,chars=len(section)+1,sha256=hashlib.sha256(('\n'+section).encode()).hexdigest(),heading=heading),ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['mechanisms','ledger']},ensure_ascii=False))
