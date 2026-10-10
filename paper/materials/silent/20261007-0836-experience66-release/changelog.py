import collections, hashlib, json, re, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));by={e['id']:e for e in E['entries']}
S=json.load(open(O/'slice-summary.json'));M=json.load(open(O/'mechanisms.json'))
commit=(O/'commit.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title=f'## 2026-10-07 静默猎手 第六十六次增量：1 局 A10（version 2026-10-07.12，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
lines=[title,'','### 来源','',f'- 记录时间{stamp}。只读notes/lessons.md:5329的P5HT1272P5SB及完整记录，无紧后本局勘误。runs.character=SILENT、A10、F25败，无跳过；notes/run-1007-0723-P5HT1272P5SB.md定位，last_seen=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main正常合并，无冲突；已读README、最新STATE、最近决定、学习协议、铁甲首次/末两节方法及静默第64/65节。独立执行，不派下级agent；抽取与工具单进程nice19，不跑boss模拟池。',
'- 截至P5HT1272P5SB结束2026-10-06T23:23:38.170Z，83静默完局；A0—A10分别7/3/2/1/4/1/11/7/1/3/43局。旧1244房72实死加新12房1实死＝1256房73实死，A10四十三局542房43死。MCCK2602T1SR仍仅进数字；无character旧局、其他角色、进行中与后续局排除。',
'- 原日志按12位run id的rg分流409 decisions、25实际Codex请求、4 run-plans、325984输入/3979输出Jev tokens与1原始SL行；states从8206441331按时间seek流读423静默帧，首偏移8206471787、末8219053527，409决策observed_ts/指纹一致。同窗deepseek-reasoning按时间二分seek抽0条，兼容ds字段不当实际DeepSeek调用；1a89c2d4+dirty不冒称完整源码复原。原片段、抽取脚本、历史复算、机制分帧与完整切片留learner/runs/20261007-075642-experience-update。',
'- 口径沿第65节：首COMBAT→同房最终尝试末结算HP净损，死亡单列、負回复保留；Monster走廊与Unknown问号分开；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后按run/floor去重，TD1重启仍一房。未结算毒不预支，死亡余血截断不当完整需损，读档不作回血。'.replace('負','负'),
'- 先重执行旧82局原抽取脚本：七数组、全部血档/源节点/回血/SL逐行一致，无对不上的上一节数字。新局四场逐轮需/扣/损数组重核一致；F25主怪129与幻象21×4毛血213，实扣主怪106/幻象69、余38，完整需损13而仅3血、实际死亡扣3。',
f'- 开工136 active/49822字<55000，无强制压缩；新增0、更新12（全加证据、只数字0）、退役0，active136/{C["after"]["chars"]}字。无合并/退役；覆甲、力量、召唤等同主题旧案例压短，旧完整文本留experience-before.json。potion:*与general:potion逐对象保持，其他旧含药分句逐字保持，新证据仅非药水部分，无新用药规则。机制[0,20]，路线/休息/构筑统计沿[8,20]；A10实例标进阶、幻象基伤用有进阶占位符。无需缩进阶的新策略反例；机制成立的败局不当反例。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色与旧基线 | 旧82局七数组/血档/节点/回血/SL逐行一致；83局1256房73死、A10 43局542房43死 | 不混角色、房与尝试分账 |',
'| 逐牌敏捷 | F17 T15双防御/后空翻各8共24、基础15增9，对36损12；F25 T7同三牌24挡零损、实伤0 | 多张牌放大实际格挡，不代替击杀 |',
'| 力量/虚弱 | 神官0/3/6/9力三击9/18/27/36；胧光T8主怪20经虚弱15、0挡损15，起航后敌3→6→9力 | 逐段加力/取整与独立成长分开 |',
'| 旧含药事实归属 | 4D4J8USKCPAV A10 F3 T1实际5力量/5临时增益；旧力量条目压缩后含药句丢失局号，容易贴到新案例 | 保留原分句逐字，补回已在evidence内的局号；不加药水证据或使用规则 |',
'| 覆甲 | F25 T4剩1，防御8+覆甲1对14损5；T5起0 | 后段不预支开场4，完整减层触发条件未隔离 |',
'| 夜魇复制与磨蚀叠加 | F19 T1选磨蚀+，T2三复制品逐张施放、敏捷1→2→3→4/荆棘6→12→18→24，能量仍3；F25 T1先施步法才选夜魇、实际选富足，T2三复制品未用 | 同局有效复制与未兑付复制分别核，不外推费用继承或替对象胜线 |',
'| 磨蚀与毒分账 | F25 T8富足生成后才施磨蚀+，实建1敏/6荆棘；动作后本体40→31含6荆棘/3毒；末幻象21→15含6荆棘、玩家仍死 | 生成不等施放，反伤有效不等先于致死避免死亡 |',
'| 勒紧 | F25 T9防御9→13实得13挡、26攻需损13而3血差10；HSX F31 T2先5挡+爆发双9=23，对17零损 | 专属防御增量4/双次8真实，模型漏挡另归纯bug |',
'| 探寻任务 | F14已成富足，F25 T8选磨蚀+后实际施放；T2三富足复制品未施 | 任务进度、生成、建立分别算 |',
'| 暴露消耗 | F24升级预览后文无消耗，F25 T2实际暴露+仍3易伤/消耗、全战无第二次；历史10纳证局皆实际施放 | 升级不计可复用收益；清制品子证据仍2局 |',
'| 召唤复活 | F25三次清幻象后T4/5/9各回21；毛血129+21×4=213、实伤175、余38，幻象力9攻击26 | 主怪伤/幻象伤/新增血分账；8局胧光+1局雾菇观察，不转移起航规则 |',
'| 路线与即时血量 | F22付10、F23损12、F24锻造后40/77，F25 Unknown损40实死；A10二幕问号40–60%三房一死33.33%、活场损中位37.5 | 非安全线、无替路线实打，未来火不抵当前战损 |',
'| 休息回复 | 本局4火1回血/3锻造，仅F12回23；F24未选回血即时63，实际选锻造40、F27未到、boss77仅投影 | 现场回血与未执行方案/未来营火分账，不定统一血线 |',
'| SL与时钟 | 新1行仅F17首试获胜，无重打/读档；全历史74场322试26赢，A10 41场181试14赢不变。F16/F24整场模拟56/288样本均不足300、未给胜率；boss每轮时钟字段未记录 | 本次无新同抽牌重打或固定boss/精英经验，样本不足不作0胜率 |',
'| 构筑与实际输出 | 29张/4永久升级、十基础牌仍在；实际夜魇复制对象不同，T7防御能力兑现但输出0，末本体23 | 替构筑/复制对象与整战胜因未受控，写观察 |',
'','七数组重算：','','| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for key,v in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {key} | {v["before"]} | {v["after"]} | 是 |')
lines+=['','死亡率以战斗房为分母；活场净损中位排除实死、保留负回复。A0—A9各格与第65节一致，全部各阶格/局号/损值在audit.json。A10全部非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
    if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','源节点以源入血关联下一战、多源可指同战，观察不作节点选择因果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
    if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','各进阶独立局数、回复与SL：','','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合 | 回血后战/死/活损中位 | 真重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
rest=json.load(open(O/'rest-summary.json'));sl=json.load(open(O/'sl-summary.json'))
for rr,ss in zip(rest,sl):
    fs=[f for f in A['fights'] if f['asc']==rr['asc']]
    lines.append(f'| A{rr["asc"]} | {rr["runs"]} | {len(fs)}/{sum(f["death"] for f in fs)} | {rr["rests"]}/{rr["heal"]}/{rr["smith"]} | {sum(rr["gains"])} | {rr["nexts"]}/{rr["deaths"]}/{rr["median"]} | {ss["fights"]}/{ss["attempts"]}/{ss["wins"]} |')
lines+=['','- 低血不同节点沿旧例重新核对：MGA0CZDDKC0P A10休息22→43后Monster损17活、4D4J8USKCPAV休息1→22后Monster损1活；D4LJ9QMGFB8Q事件13、BVF22RSFVBS9事件21后走廊死。本局F12回23后四扭动虫损3活、F24锻造后问号损40死。敌人/构筑/血量/间隔/回复混杂，仅观察；无同局回血与锻造/替路线实打对照。全部旧SL explore/sl_explore/draws/sl_attempt原文与逐回合仍在audit.json及各局analysis/decisions，不为首试行增加重打分母。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 同窗DeepSeek0，25请求实际Codex；没有可隔离“引用某经验id导致反向执行”的原话，不由败局自动登记策略repeat。大脑题面事实错误和未执行计划分别列，原话见journal-quotes.json。',
'- F24原话：“Expose becomes reusable, improving sustained attack damage and removing shields. Another camp is reachable without forced combat, making this a good upgrade window.”升级暴露仍消耗，路线下一问号实际开战并死，后续营火未到；只能确认评价用了错误预览，不证明另一选项能转胜。',
'- F18原话：“可可免维护，首轮铺能力；四火避精英稳成长。”F17选牌原话：“Nightmare offers powerful scaling by copying Footwork+ or Adrenaline. Existing draw supports finding combinations; prioritize its cost-reduction upgrade.”F25先施步法再选夜魇时步法已离手，实际复制富足、T2未用三复制品；同局F19复制磨蚀+并施三张确实兑现，不写夜魇完全未用或恒定无效。',
'- F1原话：“Five question rooms unlock repeatable upgraded-power selection; strong long-term scaling outweighs the temporary dead draw.”已见普通富足消耗；本次有夜魇复制可扩来源，但不是原任务奖励本身可无限复用。数据口径不把此前DOWSING任务认知问题自动计新策略repeat。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for m in M:
    e=by[m['id']];dist=collections.Counter(R[r]['ascension'] for r in e['evidence'])
    proof=f'{e["n_support"]}/{e["n_contradict"]}；'+','.join(f'A{a}:{n}' for a,n in sorted(dist.items()))
    lines.append(f'| {m["name"]} | {m["infer"]} | {proof} | {m["case"]} | {m["id"]} |')
lines+=['','- 全部12位evidence/contradicting在经验JSON与historical-facts.json，支持/反例进阶逐项计；综合支持数不冒称每个子公式均有同数独立实验。全部83局日志及261段本角色历史机制复盘复核。步法49纳证局均实际施放，历史53局569次；磨蚀2纳证局均实际施放，历史6局11次；勒紧3纳证局均实际施放，历史3局11次；暴露10纳证局均实际施放，历史22局228次且纳证牌面保留消耗。其余持有或仅相关局不虚加证据；夜魇原过渡动作由选择完成后3层及次轮三张验收，不把pending标签当未建立。',
'- 覆甲5局有实际覆甲末结算，夜魇2局有已建3层状态，探寻3局分别可核任务与富足；胧光8局与雾菇1局的召唤观察分开，不移用加力规则。本局败战的敏捷/荆棘/勒紧收益真实，败局不是机制反例；单卡整战胜因、未选复制对象或原线均未受控，不写因果。没有新增喝药规则。',
'','### 新增','','- 无；同一主题并入已有条目，两项纯bug不新建经验。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['rows']:lines.append(f'| {r["id"]} | {r["before_n"]}→{r["after_n"]} | {r["before_chars"]}→{r["after_chars"]} | 补非药水证据/同主题汇总与案例 |')
compressed=[f'{r["id"]} −{r["before_chars"]-r["after_chars"]}字' for r in C['rows'] if r['before_chars']>r['after_chars']]
lines+=['','- 12条全加证据，纯数字0；勒紧另补历史HSX4HYATB4E2实际双防御机制证据。压短的条目：'+ '；'.join(compressed)+'。未合并/退役；旧文字留experience-before.json，完整逐轮数字留分帧与本节。力量旧文字78支持却全角n=76的元数据同步为79；旧含药句逐字保留，原状态核回4D4J8USKCPAV并补归属，不与新P5或QNTW混读。两种计数不再混用。',
'','### 退役','','- 无；没有反例多过支持或本轮由代码修掉的active缺口，已知真实机制不因模型已接入而退役。',
'','### 和手写知识及代码冲突','',
'- 静默其他六份boss-damage/room-costs/monster-records/outcome-stats/fight-value/fight-value-gates均为生成数据，无手写知识需改删、不新建。哈希与元数据见other-knowledge.json；截至开工room-costs82局、outcome-stats A10四十二局仍上节切点，不与本节83局新切点混读。monster-records截至22:57:48.502Z开窗1245/A10 531，较旧82局1244房/530仍多TD1同房重启1窗；不当本轮新房或整表无效。fight-value/gates为2局40战223行采样，不当全量房统计；未见数据证明文件整体无效，不覆盖后台刷新。',
'- common定向核神官三击基础3、寄生惧魔A10基础17、胧光主怪A10凝视11/硬化7与起航、异鸟三击；只有本角色日志作为经验支持。当前手写源码升级预览依rules_text漏消耗、FASTEN未接同方案后续防御，与观察有冲突，列下节；本任务不改代码/铁甲知识。',
'','### 代码问题（不给 DS）','',
'- silent-0217独立observed：oneshot.ts:324取带关键词的升级前全文，:340依无“消耗”的rules_text渲染后文，:343直接对照；F24实际据可复用评价，F25暴露+仍消耗。首证KAY522KT5NXR A0 F44/F47，当时未升级暴露，不能写为其大脑误用；旧0066易伤模型缺口分账。',
'- silent-0218独立observed：card-model.ts:932—935的能力回退固定价值且known，未接FASTEN；turn-solver.ts:1925后续挡未加本方案勒紧。P5 F25 T9原线余血−14、实13挡后重读余血−10，少4挡；首证HSX4HYATB4E2 A10 F31 T2同线先5挡再双9实23，预15/损2、实损0。4挡修正仍不足救3血对26，不宣称修复转胜。只读当前源码，不冒称复原开局dirty版本；两bug仍交独立修复流程，本任务不改状态。',
'- 离线facts初稿漏pending实际能力动作触发断言，第二稿把选择前下一帧当已建3层触发KeyError；改为选择完成后稳定状态验收，通过全部423帧/409指纹、复制、荆棘叠加与双防御核对。历史脚本初稿误用FOGSHROOM、实际ID为FOGMOG，修正后全部支持对上；首次冻结哈希误在agent子目录用knowledge相对路径退出128，改git -C后正确冻结，源码未由该命令改变。全部初稿失败及更正留盘，仅离线工具问题，不当生产bug或沙箱测试失败。',
'- 未记录：未选复制对象/构筑/休息/路线的受控整场结果，抽牌重问后完整原最优线实际执行比例、护栏替代整场代价、boss逐轮时钟与实打估值比、未到二幕boss与F27营火结果、Jev缓存。没有数据不补造。',
'','### 测试','',
'- 源与合后固定沙箱tsc/vitest最终数见收尾。JSON合法、12位证据/角色/n/进阶/预算、旧七数组/血档/节点/回血/SL逐行、409指纹、四场逐轮数组、历史实际施放与pending兑现、药水对象/旧分句核验通过，git diff --check/gitleaks提交前扫描通过；不改测试预算。英文源提交仅静默experience.json，version2026-10-07.12/增0改12退0，带Co-Authored-By。',
'- 账本只经learner/ledger.py/by=learner:experience-update改proposed，全部12经验条目的来源与去向见ledger-result.json及收尾，不写accepted/shipped；旧first_run/prior/claim/证据/repeat/版本历史及0217/0218独立状态保持，未纳条目不动。主目录本节/账本只追加、不提交。',
'','### 切片大小','',
'- 固定种子20260929，从截至本局57548帧静默池、按state.run.character_id=SILENT，抽最高A9/A10每界面各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对，均真实界面。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests；只切换experience，其他结果表/common冻结。manifest与逐片原文留盘，n/置信度影响排序，不冒充V4完整知识前缀。','','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"].removeprefix("sample-")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta"]} |')
z=C['after'];b=C['before']
lines+=['',f'- 配对增量中位{S["median_delta"]}字、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active{b["active"]}→{z["active"]}、{b["chars"]}→{z["chars"]}字，高{z["confidence"]["high"]}中{z["confidence"]["med"]}低{z["confidence"]["low"]}；'+ '，'.join(f'A{a} {v["entries"]}条{v["chars"]}字' for a,v in z['by_asc'].items())+'。需要Roy定：无。']
text='\n'.join(lines)+'\n'
(O/'changelog-section.md').write_text(text)
f=ROOT/'paper/materials/experience-changelog-silent.md';prior=f.read_bytes()
(O/'changelog-before.sha256').write_text(hashlib.sha256(prior).hexdigest()+'\n')
assert title not in prior.decode() and '第六十六次增量' not in prior.decode().split('## ')[-1]
with (O/'gitleaks-changelog.log').open('w') as h:
    subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/'changelog-section.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
with f.open('a') as h:h.write('\n'+text)
assert f.read_bytes().startswith(prior)
print('只追加第66节',len(text),'字')
