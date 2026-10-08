import collections, hashlib, json, statistics, subprocess, sys
from pathlib import Path

O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
load=lambda name:json.load(open(O/name))
A=load('audit.json');U=load('update-summary.json');C=load('changes.json')['entries']
H={x['id']:x for x in load('historical-mechanism-summary.json')}
M=load('ledger-map.json');L=load('ledger-results.json');P=load('proposal-ids.json')
V=load('live-merge.json');SS=load('slice-summary.json');T=load('test-results.json')
R=load('run-metadata.json');B=load('baseline-check.json');RE=load('rest-summary.json');SL=load('sl-summary.json')
RUN='Z91JN3S3PQX2';heading=(O/'changelog-heading.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
D=[json.loads(x) for x in (O/RUN/'decisions.jsonl').open()]
S=[json.loads(x) for x in (O/RUN/'states.jsonl').open()]
brain=[json.loads(x) for x in (O/RUN/'brain.jsonl').open()]
cases=[f for f in A['fights'] if f['run']==RUN]
lines=['## '+heading,'','### 来源','',
'- 记录时间'+stamp+'；只读根notes/lessons.md:6442的静默猎手Z91JN3S3PQX2复盘，节后无本局勘误。runs.jsonl:628核SILENT/A10/F33败，无角色跳过。运行049dff24+dirty，完整dirty源码未记录。',
'- exp-silent开工git status干净，git merge --no-edit main无冲突，基线'+(O/'base-commit.txt').read_text().strip()+'。已读README、最新STATE/decision-log末尾、学习协议/代码提案、首次构建及静默110/111两节方法、账本README。独立执行，无派agent/联网/play/boss模拟池；临时文件仅本scratch，抽取nice19单进程，沙箱固定1worker。',
f'- 按局号抽{len(D)}决策、{len(brain)}大脑请求及2条SL记录；states/reasoning按决策UTC窗二分字节seek流读，{len(S)}状态逐帧核run_id及state.run.character_id=SILENT。窗2026-10-08T14:39:12.021Z—15:04:43.085Z；31脑请求全Codex，DeepSeek实际推理0，兼容ds_*名称不证引擎。原始子集/字节偏移留scratch。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局、{len(A["fights"])}独立房、{sum(f["death"] for f in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R).items()))}；除本局外146局只进数字/历史验证。排缺character旧铁甲、其他角色、进行中及切点后局；不称纯Codex爬塔战绩。',
'- 沿前节口径：战内净损=首COMBAT入口HP−同房最后尝试退出HP，含自损、回复、战后同房芝士回复/负净损，不作敌毛伤；实际死亡单列，SL判死截断不当实死。走廊只Monster，Unknown问号战另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient；多节点可重复关联，回血后战去重，营火房与动作分列。SL同房多试只计一房。',
'- 旧146局七数组、全部血档/节点转移/回血与SL逐行复算一致：'+ '/'.join(str(B[k]['before'])+{'fights':'房','nexts':'节点后战','rests':'休息动作','cards':'牌动作','ends':'结束轮','attempts':'尝试','growth':'同族帧'}[k] for k in B)+'，无原统计漂移。本局13房、2条单次SL记录，无实际重打/恢复。新增状态和数字973项校验通过；历史147局主题复盘/全部按角色原帧交叉核验，实际动作和持有不自动扩大整条支持。',
'- 资源饮用采用后续真实槽位/牌/增益：审计通用动作表只收completed，本局9条；POWER_POTION一条pending动作后槽位确已消耗、选择余像并实打，额外记实际饮用，实投饮共10。旧七数组未重定义；该差异不是少饮一瓶、不是SL恢复。',
f'- 新增0、更新15（15加证据、0只改数字）、退役0；active{U["active_before"]}→{U["active"]}，正文{U["chars_before"]}→{U["chars"]}字符，低于55000压缩线及60000预算。无预算合并/压缩/退役，不改测试预算。钨棍/沙坑新组合并入原钨棍和双截止条目，支持子集1局单列。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];lines.append('| '+e['id']+' | '+str(e['n_support'])+'支持/'+str(e['n_contradict'])+'反例；分阶'+str(H[e['id']]['by_asc'])+'；账本'+','.join(M[e['id']])+' | '+e['lesson']+' |')
lines+=['','以下按进阶/幕/实际房型/首战入口血档列战斗；n是独立房、同局可多房，死亡率=实际死亡房/n，存活净损中位含负值。','','| 进阶 | 幕 | 房型 | 血档 | 房数/局数 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['bands']:
    if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["type"]} | {b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','非战节点按入口血关联下一更高层首战，同战可被多个节点引用；分母不是改线随机实验。问号实际战在Unknown；普通EVENT排Ancient。','','| 进阶 | 幕 | 节点 | 入口血档 | 节点数/独立后战/局数 | 实死/率 | 活后战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['transfers']:
    if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["screen"]} | {b["band"]} | {b["n"]}/{b["unique_fights"]}/{len({x["run"] for x in b["cases"]})} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','| 进阶 | 局数 | 独立营火/回血动作/其他动作 | 实回 | 去重后战/实死 | 活后战净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in RE:lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
lines+=['','SL只在同房多次尝试时计重打房；实赢与判死截断分开，相关尝试不作独立局。','','| 进阶 | 重打房 | 尝试 | 赢次 |','| --- | --- | --- | --- |']
for r in SL:lines.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
lines+=['','本局sl-attempts两条分别F17单次胜/F33单次实死，沒有读档或同盘胜次。已有沙虫支持内真正重打15房60试8赢保持；R3AJCGQGGMR4 A10第二次T7实逃离延长1→2，敌69/毒36、普通触媒额外1结算后3血胜，首试最后15血不足攻击24且敌94；药时点与后序也变，不把一个改动当整线胜因。缺失首试未执行结算不补写运气或整场血价。','',
'本局逐房实资源：','','| 层 | 房型/敌人 | 进场HP/上限→退出HP | 净损 | 实死 |','| --- | --- | --- | --- | --- |']
for f in cases:lines.append(f'| F{f["floor"]} | {f["type"]}/'+','.join(f['enemies'])+f' | {f["hp"]}/{f["max_hp"]}→{f["last_hp"]} | {f["loss"]} | {f["death"]} |')
lines+=['','十二胜战净耗95，五回血21/22/23/23/24共113，事件F5/F20/F22另付14/10/5共29，F17→18跨幕33/76→67/76另回34，56−95+113−29+34=79进沙虫。芝士取得后十胜各上限/当前+1已包含在净损，不重复加；巨兽净损42内含末+1，攻击实损43。三锻造F7/F13/F29无即时回复，未来营火不预支。',
'取得9瓶药加1药水形状石头，实际投饮10、弃置0/SL恢复0。能力药F12T1生成余像并实打；敏捷同轮另建2敏。异鱼油F15T1实建1力1敏，步法另3敏。熔炉F19/安瓿F21/消亡粉末与痊愈F28T1实饮，后者+1能抽2无HP变化；混合自动伤不全归药。F30石化蟾蜍补石头且use_potion投出；F33T3格挡14→26，T12毒0→6并随后结6＋5=11，末敌45。未试早饮/保药没有整场因果。',
'巨兽250本体在退場时被999999999自爆占位取代，不把血差作需近十亿伤。T11虚弱44→33，两防御各8合16，49→32再芝士+1。沙虫需清341、实际净清296余45，13轮净清[33,17,8,17,14,7,16,9,26,26,32,62,29]；T10—13轮初滚石10/15/20/25合70，抱抱10/11/12/13合46，T13窗口另含此前6毒；下一轮滚石30/抱抱14未发生。',
'F33T5/T11护栏题面合省22血、少26即时伤，实际分别75→72/18→17，完整原线未执行；T11双方五轮均8/8死、低信任B2整场估值不可用，不填胜率0。T6三逃离续3却损16，T7建敏损24；T13只有8挡、17血对26双击，仅攻击钨棍预算需16可余1，但沙坑归零实0、挡仍8，敌50→45結5毒。没有独立攻击结算帧，不称先损16再扣1。','',
'### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek实际推理/请求0，无其引用经验id的原话；Codex/Jev题面保留，未记录具体经验条目单独导致选择的因果链。']
for floor in [7,13,29,32]:
    d=next(x for x in D if x['floor']==floor and x['label']=='rest/plan')
    lines.append('- F'+str(floor)+'实际原话：'+json.dumps(d['rationale'],ensure_ascii=False)+'。')
lines+=['- F13的“faster kills”描述升级预期，但F33T3滚石在手未打、T9才实建；没有提前支付3费能力仍能续沙坑的整场实盘。F29说“amplified by Burst”，不能预支未打出的爆发。F32实际79兑现，但血量并不延沙坑；不把模拟胜样本损耗中位强贴失败样本。',
'- 判官原话“not certain: only the Sandpit makes it lethal (无厌沙虫\'s Sandpit at 1: the enemy turn takes it to 0 and eats us whatever the HP), but Tungsten Rod may cut what it takes (never logged with the Sandpit)”；当时组合未观察，新账本0313/prior unknown，不能写成已知规则重犯或纯接口bug。','',
'### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
labels={'silent-footwork-block':'灵动步法/敏捷牌挡','silent-strength-weak-observation':'力量与虚弱覆盖','silent-deck-burst-observation':'能力启动与收益兑现','silent-afterimage-per-card-block':'余像逐牌被动挡','silent-rolling-boulder-start-growth':'滚石轮初增长','silent-mr-struggles-turn-start-damage':'抱抱先生轮初伤','silent-tungsten-rod-hp-loss-observation':'钨棍逐击/沙坑特殊截止','silent-insatiable-dual-clock':'沙坑与攻击双截止','silent-piercing-wail-temporary-strength':'尖啸临时降力','silent-act-transition-missing-hp-heal':'跨幕按缺血回复','silent-dexterity-potion-card-block':'敏捷药2敏','silent-poison-potion-observed-application':'毒药施毒与实结','silent-cure-all-energy-draw':'痊愈加能/抽牌'}
for c in C:
    e=c['after'];s=e['lesson']
    if e['id'] not in labels:continue
    lines.append('| '+labels[e['id']]+' | '+s.split('机制：')[1].split('决定胜负的战斗：')[0]+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；'+str(H[e['id']]['by_asc'])+('；沙坑组合单独1/0 A10' if 'tungsten' in e['id'] else '')+' | '+s.split('典型案例：')[1]+' | '+e['id']+' |')
lines+=['','机制支持是局部公式/触发，不是单组件整场胜因：历史919步法动作中914单增2/3、5次TENDER同时在场净敏+1且力量−1；余像266次中265单建1、1次复制实建2；尖啸527次中507单减6/8，其余20窗口分制品耗层、爆发重放降12、激怒同窗净减3。26复合窗口逐个核验留mechanism-exceptions-checked，不当无干扰单卡反例；不从净变化倒推内部因果。滚石61实建动作均5/10；敏捷药57局85饮都+2；毒药37局145饮按普通/头骨/制品分账；痊愈9局15饮均能+1/HP不变，抽牌原日志另核。',
'历史33支持局48对同上限跨幕全部实回⌊缺失HP×0.8⌋，沙虫SL 15房/60试/8赢重核一致。13窗口要清341平均26.23，实清296平均22.77仍差45；这只是实盘净清预算，不冒作boss时钟工具需要/估计轮数或提前能力胜因。',
'钨棍总体5支持，但钨棍+沙坑组合只有本局1支持/0反例，先验unknown，不能把条目high当此组合多局高置信；攻击顺序缺帧限制明确。机制asc[0,20]、数字与已见进阶在文本/表单列；路线/构筑统计保持原A8+范围。没有未选路线、提前能力或护栏原线整场对照，不拟血线/药价/终局或探索参数。','',
'### 新增','','- 无。同主题证据并入原条目，0313新组合来源保留首证和prior。','',
'### 更新','']
for c in C:lines.append('- '+c['id']+'：支持'+str(c['before']['n_support'])+'→'+str(c['after']['n_support'])+'，反例'+str(c['after']['n_contradict'])+'，追加Z91JN3S3PQX2/更新案例与数字；账本'+','.join(M[c['id']])+'。')
lines+=['','### 退役','','- 无。无本任务源码修复、反例超支持或新增高阶推翻；旧retired历史保持，无预算合并/压缩。','',
'### 和手写知识及代码冲突','',
'- 核静默其他8份JSON：boss-damage/boss-trust/double-boss/fight-value/fight-value-gates/monster-records/outcome-stats/room-costs，均为生成统计、模型、证据；来源/字段/SHA留other-knowledge。不同截止/赢样本预测不等实盘机制矛盾。没有需改写的手写知识，不新增攻略；本局未到三幕/连续boss。',
'- 不改源码手写知识/打法源码。本次新钨棍沙坑组合并非旧判官承认未知时的纯bug；独立strategy-proposal依据已见A10窄组合验当前live，其他防死增益/未观察进阶/其他角色保持等价。现有药效/能力模型若正确保持；缺受控胜负不定新饮药/HP阈值。',
'- 四提案'+','.join(P)+'；source_task=experience-update，target_task=strategy-proposal，15改经验全部有自身experience链接和本角色局号/层/轮/账本。实际domains combat/potion/sl/structure，无terminal参数。已注册Markdown/JSON原件保持，不冒称implemented/shipped。','',
'### 代码问题（不给 DS）','',
'- 无新增纯bug、无源码修复。现有护栏按其即时规则运行，低信任整场估值不可用不是胜率0；新沙坑交互来自本局，不用未知顺序写假修复。完整dirty源码、独立末击/过量伤/沙虫末轮攻击结算、完整实际最优执行比例、逐下一房arrival/boss时钟实打比、未选方案整场胜负、未到三幕/连续boss、Jev缓存与实际费用均未记录。',
'- 本scratch原核验初稿因通用审计只收completed少数pending饮药而失败，随后补后续槽位/选牌/实打核验；第二稿把空槽仍占列表误当长度减少且忽略选择帧，改为槽位id消失及下一选择完成帧，最终973项通过。初稿/两次失败日志均保留。跨幕历史初稿误以boss末MAP已改变的act_id判跨幕而得0帧，改用首COMBAT的幕id后33局48对全部吻合，原0帧初稿保留；未改生产代码或伪造药瓶。','',
'### 测试','',
'- 报告首稿生成因字符串列表误加一元+出现TypeError，首轮扫描缺输入未执行；仅修本scratch生成器，原report-prepare.log及report-scan-initial-failure保留，修后报告gitleaks退出0。',
f'- 原入口bash agent/tools/test-sandbox.sh；TMPDIR本scratch、PATH本机node、nice19/SANDBOX_WORKERS=1、固定数据。tsc {T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；'+('曾重跑，首轮失败原件保留。' if T.get('retry') else '未因失败重跑。')+'固定排除/预算不变，沙箱外完整套件交调度器，不冒报通过。',
'- JSON合法、唯一id/已有scope/中文name、证据12位本角色局号/支持反例数字、预算、原帧和历史复合窗口/240前后切片通过。check-experience missing=[]退出0，ledger.py check退出0，gitleaks/redact与git diff --check退出0。',
'- 账本只CLI：新增[]；改proposed '+','.join(L['proposed'])+'；retired[]。首证/prior/claim/support/repeat、旧状态/版本和未纳入观察保持，实际shipped交运维据live完成事件核。',
'- 刷新九项知识数据已提交，未暂存的notes/fight-value-backtest-silent.md并行记录保持；刷新路径与本分支知识改动无重叠。',
'- live锁内：'+V['result']+'；刷新'+str(V.get('refresh'))+'；合前'+str(V.get('pre'))+'；实际合入'+str(V.get('merged'))+'。']
for conflict in V.get('conflicts',[]):lines.append('- '+conflict)
lines+=['- '+('未实际合入；不造eval上线版本/规则上线通知。按用户冲突指令停止，保留刷新、源提交及预检，交调用方/运维兜底；不停对局。' if not V.get('merged') else '合后沙箱通过，唯一eval版本和上线/双通知记录见live发布回执，代码提案仍未实现。'),'','### 切片大小','',
'- 固定种子20260929，从截止前SILENT状态取最高两阶A9/A10各20状态×6界面，共240配对。manifest留池/时间戳/唯一帧数，池不足仅同阶同界面有放回，不跨角色；CHARACTER=silent调用官方knowledge-slice.ts，common/角色其他数据与outcome前后冻结同份，仅换experience。','',
'| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in SS['rows']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
s=SS['overall'];lines+=['',f'- 整体中位{s["before_median"]}→{s["after_median"]}（{s["median_change"]:+}字）；配对差中位{s["paired_median"]}；最大{s["before_max"]}→{s["after_max"]}，单片最大增加{s["max_increase"]}字。',
f'- active{U["active"]}，正文{U["chars"]}字符，置信度{U["confidence"]}；A8适用{U["asc"]["8"]}；A9适用{U["asc"]["9"]}；A10适用{U["asc"]["10"]}。无需压缩/合并/预算调整，需要Dai定的规则：无。','',
'证据、脚本、提案、CLI、测试、原失败日志/初稿、合入回执及报告：'+str(O)+'。']
section='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(section);(O/'report.md').write_text(section)
if '--append' in sys.argv:
    path=ROOT/'paper/materials/experience-changelog-silent.md';before=path.read_bytes();assert ('## '+heading).encode() not in before
    with path.open('ab') as f:f.write(('\n'+section).encode())
    after=path.read_bytes();assert after[:len(before)]==before
    (O/'changelog-append.json').write_text(json.dumps(dict(before_bytes=len(before),before_sha256=hashlib.sha256(before).hexdigest(),added_bytes=len(after)-len(before),heading=heading),ensure_ascii=False,indent=2)+'\n')
result=dict(task='experience-update',version=U['version'],commit=(O/'source-commit.txt').read_text().strip(),merged=V['merged'],added=U['added'],updated=U['updated'],retired=U['retired'],active=U['active'],mechanisms=list(labels.values()),tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=dict(**L,check=0),code_proposals=P,implementation_domains=['combat','potion','sl','structure'],report=str(O/'report.md'))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('生成报告',len(section),'字符，追加', '--append' in sys.argv)
