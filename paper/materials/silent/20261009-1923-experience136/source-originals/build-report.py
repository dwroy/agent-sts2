import collections
import fcntl
import hashlib
import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
N='R6WDLYS19ZTY'
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
U=json.load(open(O/'update-summary.json'))
S=json.load(open(O/'slice-summary.json'))
ME={x['entry']:x for x in json.load(open(O/'mechanism-evidence.json'))}
M=json.load(open(O/'ledger-map.json'))
P=json.load(open(O/'code-proposals-results.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
source=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交'
L=json.load(open(O/'ledger-results.json')) if (O/'ledger-results.json').exists() else dict(added=[],proposed=list(dict.fromkeys(i for v in M.values() for i in v)),retired=[],check=None)
LIVE=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else dict(merged=None,result='待源测试/提交后锁内预检')
T=json.load(open(O/'test-results.json')) if (O/'test-results.json').exists() else dict(tsc=None,vitest=None,files=0,cases=0,retried=False)
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title='## 2026-10-09 静默猎手 第一百三十六次增量：1 局 A10（version 2026-10-09.25，分支 exp-silent，'+source[:8]+'）'
lines=[title,'','### 来源','',
    '- 记录时间'+stamp+'。只读根notes/lessons.md:8544起R6WDLYS19ZTY整节、8648起两条勘误及run-1009-1754-R6WDLYS19ZTY.md。runs.jsonl:655核SILENT/A10/F42/victory=false、code=c308b61e1+dirty；没有角色跳过，last_seen据run-1009文件名。第二步法F39事件已普通，不能把建2归抑制；偏折按战内普通基础4加5敏=9挡。旧复盘/原勘误/原账本证据保留。',
    '- exp-silent开工干净，git merge --no-edit main成功至8c059e7a5，无冲突。已读项目约定、最新STATE、近期决策、学习协议、代码提案闭环、首次构建/最近两次增量及账本方法；独立完成，不派下级agent。只改本树silent/experience.json；根变更记录仅追加，账本/专用提案队列只经CLI。抽数单进程nice19、测试单worker，不联网、不运行play、不读二进制或key、不改运维prompt。',
    f'- 全引擎silent学习观察截止{A["cutoff"]}，共{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(x["death"] for x in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧173局只进数字/历史机制验证，不是纯Codex爬塔成绩；其他角色、无character旧局、进行中和切点后局排除。',
    '- 决策/脑/SL/计划按run id rg，states/reasoning按时窗二分seek流读，每帧复核角色。本局827决策、843状态、41实际脑请求全Codex、8计划、7 SL；DeepSeek推理窗0。1726条新局原始字节偏移全部相等；历史神气两配对4原帧另seek核实；1064项角色/证据/主题参数核验通过。兼容ds字段不冒称DeepSeek原话，完整dirty源码未记录。',
    '- 口径同上一节：同房第一COMBAT入口HP−最后真实退出HP是战内净损，含回复/自损/上限变化、不等敌毛伤；SL同房一场，判死截断不作实死。走廊仅Monster、Unknown另列；入口血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按入口血档关联下一更高层首战，Ancient排除；HEAL后战去重，局/房/节点/动作分母分别列。',
    '- 先复算上一节173局，七数组、各血档、节点、HEAL与SL统计逐项全等：'+str(json.load(open(O/'baseline-check.json')))+'。没有基线数字不一致。历史静默相关复盘131?行的实际筛选计数见下项，完整参数/局号见audit.json；主题支持局不是每个公式的独立因果分母。',
    '- historical-mechanism-notes.txt保存131?行不是计量口径，实际筛读为1321条相关原文；完整原记录仍只读保留。Panache历史4局20次建立、筛得37个总计第五张候选，严格确认A6/A9/A10三局相符配对；建立当轮/自动计数偏移/限伤等未隔离候选不记确证反例，也不把总出牌计数当保证触发。',
    f'- 增{U["added"]}、改{U["updated"]}（加证据{U["evidence"]}、只改数字0）、退0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字。未达55000压缩线、不改60000预算；无预算合并或退役，案例压短的条目/字数见更新表，完整细节保存在原记录与scratch。其他角色文件未改。',
    '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];m=ME[e['id']]
    lines.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{m["asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
lines+=['','路线与HP分档：各进阶分别列，n为独立战斗房、局为不同run、死率=实死/n，活损中位只含胜战；全部零样本格保留在audit.json，这里仅列非零格。不由跨局不同选路的相关性声称改线更好。','', '| 进阶/幕/房间/入口血档 | 数据（房/局/死、死亡率、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['bands']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 血档观察、非安全阈值 |')
lines+=['','休息、商店与普通事件后下一战按节点入口HP分档；n是节点，去重战是独立后战，同一战可有多个前节点，死/n不能当独立战胜率或回血因果。','', '| 进阶/幕/节点/入口血档 | 数据（节点/去重战/死、比例、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['transfers']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 后战关联、非路线干预 |')
lines+=['','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):
    lines.append(f'| A{r["asc"]} HEAL | {r["runs"]}局/{r["rests"]}独立火/{r["heal"]}HEAL，回{sum(r["gains"])}血，去重后战{r["nexts"]}、死{r["deaths"]}、活损中位{r["median"]} | 实得血与未到火分账；不是HEAL胜因 |')
for r in json.load(open(O/'sl-summary.json')):
    lines.append(f'| A{r["asc"]}真重打 | {r["fights"]}场/{r["attempts"]}试/{r["wins"]}赢 | SL跟踪首试不等已重打，尝试相关 |')
for r in json.load(open(O/'sl-comparisons.json')):
    if r['run']==N:
        lines.append(f'| {N} F{r["floor"]}重打 | {r["attempts"]}试/{r["wins"]}赢，共同抽牌前缀{r["common_draw_prefix"]}张；逐轮/explore见sl-comparisons.json | 同前缀不等完整同抽，不归单因 |')
lines+=['','本局F17前两试T13判死、第三试T10自爆后12血胜；T5改防御多留8血、少6进度，后序也变。F33同44血力量药四试一赢，末T9/T10毒先消攻击、末1血胜；此前三次判死退出缺帧，不作实死。F42无本场SL。路线F11改避精英后F16投影35/实32，F29回66并投影F33到61/实44；不同路线未配对，不把误差都归护栏或营火。F40后到精英无岔路、尚未到后战预测不作兑现。','',
    '### 经验库自己带偏或写了没被执行的地方','',
    '- 本局41条真实脑请求均Codex，DeepSeek推理窗0，没有DeepSeek引用经验条目的原话；不以ds兼容字段推经验诱导。',
    '- F40 Codex原话：“Healing restores only five HP. Haze+ strengthens group poison and extends Weak, improving mandatory-elite survival and both boss fights.” 实际57/62锻造迷雾，到必经三骑士被抑制成普通4毒/1弱；无法兑现后面boss增强的承诺。但缺另一升级/回血整场对照，不认定脑题选择本身为纯bug。',
    '- F30T1 Jev0.98原选毒性爆发+切割，代码HP护栏替为切割+后翻+尖啸；T7 Jev0.74爆发又替结束。原rationale全文在verification.json，题面省血8/18、少伤19/22；不是Jev照护栏线的独立选择，实际贯彻比例未知，不写“模型全执行最优”。',
    '- F42T5神气已建10且切割第五张实际群伤，源码消费未搜到PANACHE；经验只留实盘触发，代码缺口同步独立提案。末least-loss“(-6)”是预计剩余HP36−42，不是只损6，未将已正确预算误认bug。','',
    '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    conclusion,rest=e['lesson'].split('机制：',1)
    formula,rest=rest.split('搭配：',1)
    pair,rest=rest.split('决定胜负的战斗：',1)
    budget,case=rest.split('典型案例：',1)
    m=ME[e['id']]
    lines.append(f'| {e.get("name",e["id"])} | {conclusion}机制：{formula}搭配：{pair} | {e["n_support"]}/{e["n_contradict"]}；分阶{m["asc"]}；{budget} | {case} | {e["id"]} |')
    mechanisms.append(e.get('name',e['id']))
lines+=['','机制保留/采用[0,20]并标已见范围、随进阶变化按占位符读；低阶胜例不外推高阶安全线。三骑士原[5,7]策略条目本次改[10,20]，A10三场同主题皆败、只记窗口观察；A5/A6/A7背景证据保留，不宣称低阶反例。未证明整战因果的均标观察/未控；正常败局不当机制反例。','',
    '### 新增','']
for c in C:
    if c['before'] is None:lines.append('- '+c['id']+'：card:PANACHE，神气制胜，3支持/0确证反例、med；A6/A9历史配对与A10新局，未核候选边界全部留限制。')
lines+=['','### 更新','']
for c in C:
    if c['before'] is not None:
        b,e=c['before'],c['after']
        lines.append(f'- {c["id"]}：{b["n_support"]}→{e["n_support"]}，追加R6支持、核数字/案例；正文{len(b["lesson"])}→{len(e["lesson"])}字，asc {b["asc"]}→{e["asc"]}，反例保持。')
lines+=['','### 退役','','- 无；没有反例超过支持、已修机制或预算合并。','',
    '### 和手写知识及代码冲突','',
    '- 改了的手写知识：无。silent其余八份JSON均是各自样本/生成时点的数据，未发现需覆盖的手写规则；历史掉血、预测与校准范围不当本批174局实数或必死证明。metadata/SHA见other-knowledge.json；不覆盖后台刷新。',
    '- 当前live只读确认combat-plan.ts:2854玩家输入及2920能力映射、turn-solver逐能力/逐牌消费未搜到PANACHE接线；已建立机制的消费缺口进入combat/structure提案。本任务不改打法源码。',
    '- 三份CLI提案'+','.join(P)+'覆盖全部18新/改条目，source_task=experience-update且experience明确关联、target_task=strategy-proposal，涉及combat/potion/sl/terminal/structure；pending，无实际源码实现commit，不登记implemented/shipped。','',
    '### 代码问题（不给 DS）','',
    '- 新纯基础设施bug：无；神气群伤模型消费是本角色机制提案。HP护栏取舍、SL策略与药水判断不误归纯bug。完整dirty源码、部分逐击归零/过量、未选线/留药/升级/路线整战反事实、未到F43/F48/F49、boss时钟两比值和实付费用均未记录。',
    '- 分析器首次把boss:KAISER_CRAB当实体ID，校验失败并把蟹重打误列0；已按本角色原帧CRUSHER/ROCKET别名重算为证据范围12场62试3赢，校验通过。validate-v1.py/log与update-v1.py/json保留，未提交错误初稿；不登记为游戏代码bug。首次apply_patch未命中目标行也保留工具失败记录。',
    '- 一次读取单行大型states JSON导致输出超限；随后只按字段/字节偏移核验，源日志/初始失败不覆盖。未用输出截断部分作为缺失机制的事实。','',
    '### 测试','',
    f'- bash agent/tools/test-sandbox.sh，PATH本机node、TMPDIR仅scratch、SANDBOX_WORKERS=1，固定数据/固定排除；tsc {T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}，首轮完整通过；另启同入口verbose诊断重复，当前出口{T.get("diagnostic_exit")}（None为未退出），不是首轮失败；外部完整套件由调度器据完成事件补跑，不冒称完成。',
    '- JSON合法、diff --check、gitleaks staged、check-experience missing=[]均0；ledger.py check '+str(L['check'])+'。新增账本'+str(L['added'])+'，proposed '+','.join(L['proposed'])+'，退役无。只CLI追加、保留旧claim/首证/prior/状态和版本历史；shipped交实际合入后的运维核登记。',
    '- 锁内live结果：'+LIVE['result']+'；刷新'+str(LIVE.get('refresh'))+'；合前'+str(LIVE.get('pre'))+'；实际合入'+str(LIVE.get('merged'))+'；合后测试'+str(LIVE.get('tests'))+'。']
for x in LIVE.get('conflicts',[]):lines.append('- '+x)
for x in LIVE.get('overlap_conflicts',[]):lines.append('- 刷新数据重叠：'+x)
if not LIVE.get('merged'):lines.append('- 未实际合入；按任务遇冲突停止，不硬解、不覆盖刷新、不造上线/eval版本，源提交、报告与原冲突证据交运维兜底。')
lines+=['','### 切片大小','',
    '- 固定种子20260929，截止内state.run.character_id=silent最高两阶A9/A10按六界面各抽20、共240配对，池均足20。CHARACTER=silent官方knowledge-slice.ts，仅替换经验；common/silent其他12个JSON含outcome快照逐字节一致。新增局入池，改前/后同样本；样本池/时间戳见sample-manifest.json。','',
    '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
lines+=[f'',f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["after_median"]-S["before_median"]:+}字），配对差中位{S["paired_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片差{S["diff_min"]}至{S["diff_max"]}。',
    f'- active{U["after"]["active"]}，总字符{U["after"]["chars"]}；置信度{U["after"]["confidence"]}；A8 {U["after"]["by_asc"]["8"]}，A9 {U["after"]["by_asc"]["9"]}，A10 {U["after"]["by_asc"]["10"]}。需要Dai定：无。',
    '', '全部脚本、原抽取/偏移、基线重算、机制/SL参数、账本/提案CLI、前后经验/切片、测试与合入预检/失败原件保存在'+str(O)+'。','']
body='\n'.join(lines).replace('历史静默相关复盘131?行的实际筛选计数见下项','历史静默相关复盘筛读见下项').replace('historical-mechanism-notes.txt保存131?行不是计量口径，实际筛读为1321条相关原文','historical-mechanism-notes.txt保存1321条相关原文')
(O/'changelog-section.md').write_text(body)
(O/'changelog-title.txt').write_text(title+'\n')
result=dict(task='experience-update',version=U['version'],commit=source,merged=LIVE.get('merged'),added=U['added'],updated=U['updated'],retired=0,active=U['after']['active'],mechanisms=mechanisms,tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger={k:L[k] for k in ['added','proposed','retired','check']},code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'report.md').write_text(body+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if '--append' in sys.argv:
    assert source!='待提交' and T['tsc']==T['vitest']==L['check']==0
    path=ROOT/'paper/materials/experience-changelog-silent.md'
    with path.open('a+b') as h:
        fcntl.flock(h,fcntl.LOCK_EX)
        h.seek(0);prefix=h.read();assert title.encode() not in prefix
        addition=('\n'+body).encode();h.seek(0,2);h.write(addition);h.flush()
    (O/'changelog-append.json').write_text(json.dumps(dict(file=str(path),before_bytes=len(prefix),before_sha256=hashlib.sha256(prefix).hexdigest(),added_bytes=len(addition),added_sha256=hashlib.sha256(addition).hexdigest(),title=title),ensure_ascii=False,indent=2)+'\n')
print('报告/章节',len(body),'字；',source,LIVE.get('merged'))
