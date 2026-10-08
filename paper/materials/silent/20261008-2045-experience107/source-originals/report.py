import collections
import hashlib
import json
import statistics
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load((O/'changes.json').open())
A=json.load((O/'audit.json').open())
H={r['id']:r for r in json.load((O/'historical-mechanism-summary.json').open())}
R=json.load((O/'run-metadata.json').open())
SL=json.load((O/'sl-summary.json').open())
REST=json.load((O/'rest-summary.json').open())
V=json.load((O/'slice-summary.json').open())
M=json.load((O/'ledger-map.json').open())
PIDS=json.load((O/'proposal-ids.json').open())
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
commit=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
heading=(O/'changelog-heading.txt').read_text().strip() if (O/'changelog-heading.txt').exists() else '2026-10-08 静默猎手 第一百零七次增量：1 局 A10（version 2026-10-08.24，分支 exp-silent，待提交）'
ledger=json.load((O/'ledger-results.json').open()) if (O/'ledger-results.json').exists() else dict(added=[],proposed=[],retired=[])
merge=json.load((O/'live-merge.json').open()) if (O/'live-merge.json').exists() else dict(merged=None,result='合入流程待完成')
test=(O/'test-source.rc').read_text().strip() if (O/'test-source.rc').exists() else '运行中'
checks=json.load((O/'test-results.json').open()) if (O/'test-results.json').exists() else None
rows=['## '+heading,'','### 来源','',
'- 记录时间'+stamp+'。只读根notes/lessons.md:6020的CNKR125PFHJ5静默小节和20:03名称勘误；runs.jsonl:622为SILENT/A10、F33败，无角色跳过。运行c70efc8c+dirty完整源码未记录。',
'- exp-silent开工干净，main无冲突合入09a5ee40；先读README、最新STATE、最近决定、学习协议/代码提案、首次构建和末两节方法、静默105/106节及账本README。独立执行，不派agent，不联网，不运行play或boss模拟池，不改打法源码及其他角色。所有临时产物只在本批scratch，数据nice19单进程、沙箱1worker。',
'- 按run id抽取399决策、30脑请求、5计划、3首试记录与Jev题面；states/reasoning按决策UTC窗二分字节seek流读、核state.run.character_id和run_id，得到416帧，窗2026-10-08T11:15:42.785Z—11:38:44.123Z。脑请求均Codex，DeepSeek实际0；兼容ds_*字段不作引擎证据，reasoning窗内0行。',
'- 截至2026-10-08T11:38:44.123Z，全引擎学习观察141静默完局、2055独立战斗房、131实际死，分阶'+str(dict(sorted(collections.Counter(r['ascension'] for r in R).items())))+'。除新局外140局只进数字/历史验证；排除缺character旧铁甲、其他角色、进行中及切点之后的局，不称纯Codex爬塔战绩。',
'- 口径沿上一节：首COMBAT入房HP减同房末次尝试退出HP；战内全部HP变化/负损保留，实际死亡单列，判死截断不当实死。Monster走廊与Unknown问号分开。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入血关联下一更高层首战、排Ancient；多源可重复，回血后战去重。独立营火/动作分列，SL同房多试计一房。',
'- 同口径重新分析全部141局：旧140局七数组逐行、所有血档/节点后战、休息与SL汇总完全一致，baseline-check无漂移；新局35项独立状态断言通过，597段本角色主题复盘及各条历史支持/反例、分阶、实际动作/遭遇交叉检索。仅持有或出牌出现不扩大完整结论的支持。',
'- 历史141局逐帧检索水银沙漏，只有本局在F29胜后至F30/F33战持有。原复盘F26水银及棱柱171→171可能抵消说法与日志不符：F26 chest/relic expect=TUNING_FORK，F29奖励11:35:53.563Z才领取MERCURY_HOURGLASS，11:35:53.729Z首次持有。F29战内无该遗物，不能当其内部抵消/阻挡证据；只读复盘原文不改，更正进入本节、新经验和0309的CLI claim历史。活力火花中文名称按节后勘误用。',
'- 新增1、更新19（19加证据、0只改数字）、退役0；active183→184，正文49620→'+str(C['after']['chars'])+'字符，未触55000压缩线/60000预算，无预算压缩、合并或退役。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
mechanisms=[]
for c in C['entries']:
    e=c['after']; hist=H[e['id']]
    rows.append('| '+e['id']+' | 支持'+str(e['n_support'])+'/反例'+str(e['n_contradict'])+'，分阶'+str(hist['by_asc'])+'；新证CNKR125PFHJ5，账本'+M[e['id']]+' | '+e['lesson'].replace('|','／')+' |')
rows += ['', '- 本局13场入口/出口均有帧，前12胜末场死；净损包括所有战内变化、不写作毛伤。原始完整数字与退出验证见各run/analysis及audit；以下保留新局资源链。','', '| 层/房型/敌人 | 首帧HP→退出HP/max | 净损/实际死 |','| --- | --- | --- |']
for f in A['fights']:
    if f['run']=='CNKR125PFHJ5':rows.append('| F'+str(f['floor'])+'/'+f['type']+'/'+','.join(f['enemies'])+' | '+str(f['hp'])+'→'+str(f['last_hp'])+'/'+str(f['max_hp'])+' | '+str(f['loss'])+'/'+str(int(f['death']))+' |')
rows += ['', '- F15事件39→31、F16休息31→52、异鱼胜33后跨幕回29到62；F19/21/23三胜损4/20/36到2。F24事件消耗毒药换10上限、2→12/80，属于事件成本，不计战斗实饮。F25/28两休到36/60，F29棱柱胜耗23且实饮癫狂、F30胜再耗8后奖励幽灵，F32休息29→53。9瓶取得=7实饮+1事件消耗+1幽灵未饮，无弃药/SL恢复；药水真实持有价未知，不从表未载入0推成本0。',
'- 路线与血量：各进阶/幕/房型/入血档独立统计n房/证据局数、死亡率、活局净损中位。其他角色不纳入；不同节点/构筑和后战不同，所有表都是观察，不能推出改线因果或固定安全线。','', '| 进阶/幕/房型/入血 | 房/局 | 死/房及比例 | 活损中位 |','| --- | --- | --- | --- |']
for x in A['bands']:
    if x['n']:rows.append('| A'+str(x['asc'])+'/幕'+str(x['act'])+'/'+x['type']+'/'+x['band']+' | '+str(x['n'])+'/'+str(x['runs'])+' | '+str(x['deaths'])+'/'+str(x['n'])+'='+format(100*x['deaths']/x['n'],'.2f')+'% | '+str(x['median_win'])+' |')
rows+=['','| 进阶/幕/入节点/入血 | 源节点/去重后战 | 对应死亡/节点及比例 | 活损中位 |','| --- | --- | --- | --- |']
for x in A['transfers']:
    if x['n']:rows.append('| A'+str(x['asc'])+'/幕'+str(x['act'])+'/'+x['screen']+'/'+x['band']+' | '+str(x['n'])+'/'+str(x['unique_fights'])+' | '+str(x['deaths'])+'/'+str(x['n'])+'='+format(100*x['deaths']/x['n'],'.2f')+'% | '+str(x['median_win'])+' |')
rows+=['','- 低血不同节点仅观察：A10二幕<25%入REST、SHOP、EVENT按上表分源，同后战可对应多个源；本局12血F25回血、F24升上限两节点都影响下场。历史QHK低血休后问号胜仍耗19，UZ低血商店/事件后15入精英死，SY0低血商店/事件后F30净回血并胜；没有同资源替线完整对照，不能由死亡率排序推出商店优于营火。','','| 进阶 | 完局 | 独立火/回血动作/其他动作 | 实回HP | 去重后战/死/活损中位 | 真正SL多试房/试次/赢次 |','| --- | --- | --- | --- | --- | --- |']
for rest,sl in zip(REST,SL):
    rows.append('| A'+str(rest['asc'])+' | '+str(rest['runs'])+' | '+str(rest['rests'])+'/'+str(rest['heal'])+'/'+str(rest['smith'])+' | '+str(sum(rest['gains']))+' | '+str(rest['nexts'])+'/'+str(rest['deaths'])+'/'+str(rest['median'])+' | '+str(sl['fights'])+'/'+str(sl['attempts'])+'/'+str(sl['wins'])+' |')
rows+=['', '- A10 575独立火但577动作，401回血/176其他；其他动作包含同火重复，不等独立火。新局7火、4回血合93/3锻造，下一战按去重增加3场/1死。新局F17/F30/F33三个SL记录均attempt1，前两胜、末死，没有多次重打，不存在本局同抽序天然对照。',
'- 历史SL对照复核：A10真正多试仍101房454试30赢。沙虫全进阶14房58试7赢（A10 11房，A0/A1/A6各1房），本局仅单试，原重打统计不变。H1T1F8ML9FUE延沙坑后毒胜，但药/抽弃等同变；4XLZURXMD872六败延沙坑仍被攻击杀。上批QHK双蟹同盘T3直19+毒28同净进度47、朝向变使14→20损血，另有后续变化，不能强归整战胜败；UZ千足虫四败后试首轮同扣38而少损5、抽弃目标同变。原逐次explore/draws保留，不把模拟胜样本冒作实打或多个证据局。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 实际DeepSeek请求/推理0，没有可引的DeepSeek误用条目原话。Codex答案/knowledge元信息及Jev问题随原日志保留；未记录引用具体经验id导致决策的因果链。以下只列可核计划与实到差异。',
'- F1原话“前三战补强，商店备药；精英后四火保血升级”；F18原话“四升级强化毒防，三火单精英保血”。实际二幕三胜到2血、三次休息后53血入沙虫仍截止死；取得两步法/药瓶与升级毒雾/触媒不等当时收益全建立，沙虫余像+未打。原计划需要后空翻/杂技而未取得，不把愿望当实际抽牌。',
'- F23跳牌原答的中文释义是“现有伤害和毒已足”，英文原文随原日志保留；末boss直到T6才触媒，33毒实结96仍缺121；只支持输出截止检查，没有提前出牌/替卡/喝幽灵的整场对照，不能把此句定为构筑因果错误。',
'- 沙虫T5方案题8样本4胜、Jev选逃离→升级药瓶，实盘下轮截止死；不是实证50%胜率。T6单动作题每次end_turn lethal=false，防御后明确hp_after_enemy_turn=12，实态归零。原“危险”回答也不补漏掉的截止事实。','',
'### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C['entries']:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    rationale=e['lesson'].split('机制：',1)[1].split('决定胜负的战斗：',1)[0]
    example=e['lesson'].split('典型案例：',1)[1]
    names={'silent-strength-weak-observation':'力量与敏捷','silent-insatiable-dual-clock':'沙坑独立截止','silent-deck-burst-observation':'能力建立与输出兑现','silent-infested-prism-tainted-skill-cost':'活力火花与污染','silent-act-transition-missing-hp-heal':'跨幕回复','silent-frail-card-block':'脆弱牌挡'}
    name=names.get(e['id']) or e.get('name') or e['scope']
    summary=e['lesson'].split('机制：',1)[0]
    mechanisms.append(dict(name=name,summary=summary,n=e['n_support'],contradict=e['n_contradict'],case='CNKR125PFHJ5',entry=e['id']))
    rows.append('| '+name+' | '+rationale+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；'+str(H[e['id']]['by_asc'])+' | '+example+' | '+e['id']+' |')
rows += ['', '- 每条典型数字来自本角色原帧，不由预训练补机制；单卡/遗物的独立整战胜因没有受控组件移除对照，“决定胜负”只列可核局部窗口和战果。沙漏支持1局而非两局，棱柱未持有不作反例；未观察的全敌/所有轮净伤、幽灵与沙坑交互均保持未知。','', '### 新增','']
for c in C['entries']:
    if c['action']=='added':rows.append('- '+c['id']+'：'+c['after']['lesson']+' 账本'+M[c['id']]+'，支持1/反例0、low、机制范围[0,20]，只核A10。')
rows += ['','### 更新','']
for c in C['entries']:
    if c['action']=='updated':
        rows.append('- '+c['id']+'：支持'+str(c['before']['n_support'])+'→'+str(c['after']['n_support'])+'、反例'+str(c['after']['n_contradict'])+'；追加CNKR125PFHJ5证据并改典型案例/对应汇总数字，账本'+M[c['id']]+'。')
rows += ['', '### 退役','', '- 无。未发现反例超过支持/新高阶反驳或本次实际代码修复，没有预算压缩；所有旧退役历史保留。','', '### 和手写知识及代码冲突','',
'- 核对silent另外8份JSON的来源/字段、有限证据与SHA，other-knowledge.json保存；均是生成统计/模型或boss-trust/double-boss证据数据，无需改的手写攻略。不同生成切点、净损口径不当机制反例，本局未到双boss，不据此重拟4局有限终局价值。改了的手写知识：无。',
'- 原复盘只读，但实际持有顺序更正已写0309 claim与本条经验；不把“棱柱抵消沙漏”的未记录过程塞进知识。当前card-model/turn-solver对随机毒与combat单动作截止的接线问题按原复盘提案分别处理，完整dirty运行树未保存，不冒认当前源码等于运行源码。',
'- 本批三项代码提案'+','.join(PIDS)+'，source_task=experience-update、target_task=strategy-proposal，实际domains combat/potion/sl/terminal；20改动条目均关联自己的经验/账本/角色证据、旧新行为、时间留出、限制、验证/影响及回退。已授权规则调整仍要求实证，缺数据不强喝、不强制SL。提案pending，经验发布不标代码implemented/shipped。',
'','### 代码问题（不给 DS）','',
'- 纯bug0308单动作截止漏接和0295随机施毒伪确定斩杀repeat保留在原复盘、修复队列和原代码提案，不新增纯bug经验；本任务不改打法源码。',
'- 本批初稿把虱虫T2未实打防御的估算写成案例，交叉原动作核对后更正为T3三敏脆弱防御牌面6、整步0→13，额外7缺独立触发帧，不全归牌挡；初稿experience-draft-first/changes-first/slice-after-first及最终核验保留。复盘沙漏获取时间的实证更正见来源和0309追加历史，不改原稿。',
'- 缺完整dirty源码、部分独立0血/毛伤、毒补层独立时点、音叉分步触发及沙漏组件移除、幽灵实饮/沙坑交互、替构筑/抽序/路线/休息/留药的整场反事实、boss时钟估伤/比值和三幕资源。本局不能补这些游戏事实。',
'','### 测试','',
'- 原沙箱入口bash agent/tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19/1worker、固定数据；source退出码'+test+'。CHARACTER仅切片工具设silent，测试沿原固定默认角色，不改测试/预算/排除名单。具体tsc/vitest文件/用例/重跑统计见test-results.json及原日志；调度器另补外部完整套件，不冒报通过。',
'- JSON/唯一id/合法scope/中文名/12位角色证据/置信度/last_seen/预算/240配对切片校验通过；旧140局基线完全一致、35独立原帧数字断言通过；check-experience退出0、missing=[]。gitleaks及git diff --check原结果随scratch保留。',
'- 学习账本仅CLI：新增'+str(ledger['added'])+'；proposed '+','.join(ledger['proposed'])+'；退役'+str(ledger['retired'])+'；ledger.py check结果见原日志。19个账本来源覆盖20条经验（0007同时关联毒药和药瓶）；0309仅实证更正claim，首证/prior保留，纯bug0295/0308不因经验发布改状态。实际数据shipped交运维核实live完成事件。',
'- live锁内结果：'+merge['result']+'；刷新'+str(merge.get('refresh'))+'；合前'+str(merge.get('pre'))+'；实际合入'+str(merge.get('merged'))+'。']
if checks:rows.append('- 自测实际汇总：tsc退出'+str(checks['tsc'])+'；vitest '+str(checks['files'])+'文件/'+str(checks['cases'])+'用例/退出'+str(checks['vitest'])+'，完整入口没有重跑；末次文字修正另做经验定向1文件10例退出0。')
for line in merge.get('conflicts',[]):rows.append('- '+line)
if merge.get('merged') is None:rows.append('- 未实际合入，不造上线记录/eval版本/Roy通知；保留刷新、来源、失败日志及工作树，完成事件交运维兜底，不停对局。')
rows += ['', '### 切片大小','', '- 固定种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，240配对。manifest保存池/时间/唯一帧，不足有放回补足单列；CHARACTER=silent运行官方knowledge-slice.ts，前后冻结相同common/silent/outcome，只换经验。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for p in V['pairs']:rows.append('| '+p['sample']+' | '+str(p['before_median'])+'/'+str(p['before_max'])+' | '+str(p['after_median'])+'/'+str(p['after_max'])+' | '+str(p['paired_median'])+' |')
rows += ['', '- 整体中位'+str(V['before_median'])+'→'+str(V['after_median'])+'、涨'+str(V['median_change'])+'字；配对差中位'+str(V['paired_median'])+'，最大'+str(V['before_max'])+'→'+str(V['after_max'])+'、单片最多增'+str(V['max_change'])+'。',
'- active184/正文'+str(C['after']['chars'])+'；置信度'+str(C['after']['confidence'])+'；'+ '，'.join('A'+asc+'适用'+str(C['after']['asc'][asc]['entries'])+'条/'+str(C['after']['asc'][asc]['chars'])+'字' for asc in ['8','9','10'])+'。新增/更新范围均沿机制或原策略/统计进阶，低阶背景不作A10因果；无预算合并/退役/压缩，需Dai定：无。','', '原帧/复算/机制/提案/CLI/测试/切片/合入回执：'+str(O)+'；报告时间'+stamp+'。','']
text='\n'.join(rows)
(O/'report.md').write_text(text)
(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
if sys.argv[1:] == ['append']:
    target=ROOT/'paper/materials/experience-changelog-silent.md'
    old=target.read_bytes()
    assert ('## '+heading).encode() not in old, '本节已存在，拒绝重复追加'
    with target.open('a') as h:h.write('\n'+text)
    new=target.read_bytes()
    assert new[:len(old)]==old
    (O/'changelog-append.json').write_text(json.dumps(dict(file=str(target),before_bytes=len(old),before_sha256=hashlib.sha256(old).hexdigest(),appended_bytes=len(new)-len(old),prefix_unchanged=True),ensure_ascii=False,indent=2)+'\n')
print('报告生成',len(text),'字，',len(mechanisms),'个机制')
