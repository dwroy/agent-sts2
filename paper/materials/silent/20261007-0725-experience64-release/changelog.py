import json,pathlib,statistics,collections,subprocess,re
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));by={e['id']:e for e in E['entries']}
before=json.load(open(O/'slice-before.json'));after=json.load(open(O/'slice-after.json'));bs=[x for r in before for x in r['sizes']];zs=[x for r in after for x in r['sizes']];delta=[z-b for z,b in zip(zs,bs)]
summary=dict(median_delta=statistics.median(delta),max_delta=max(delta),before_median=statistics.median(bs),after_median=statistics.median(zs),before_max=max(bs),after_max=max(zs),rows=[dict(sample=b['sample'],before_median=b['median'],before_max=b['max'],after_median=z['median'],after_max=z['max'],delta=statistics.median([y-x for x,y in zip(b['sizes'],z['sizes'])])) for b,z in zip(before,after)])
(O/'slice-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
commit=(O/'commit.txt').read_text().strip();stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();title=f'## 2026-10-07 静默猎手 第六十四次增量：2 局 A10（version 2026-10-07.10，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
lines=[title,'','### 来源','',f'- 记录时间{stamp}。只读notes/lessons.md:5292的87LCSDR5P3DL与:5298的TKXQ6L4N9A6U，按06:57:20敌ID及06:59:20上线历史勘误；SEAPUNK/TOADPOLE为日志ID，S1.exp62早于本两局，S1.exp63晚于两局结束。runs.character均SILENT、A10、F9/F22败，无跳过；唯一run-1007-0616/0636局报定位，last_seen=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main从50de6fef快进b8894feb，无冲突；已读README、最新STATE、最近决定、学习协议、铁甲首次及末两节方法、静默第62/63节。独立执行、不派下级agent，单进程nice19抽取，不跑boss模拟池。',
'- 截至TKXQ6L4N9A6U结束2026-10-06T22:36:13.588Z，80静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/40局；旧1217房68实死加新6+10房2实死＝1233房70实死，A10四十局519房40死。MCCK2602T1SR仅进数字；旧无character局、其他角色、进行中与后续局排除。',
'- 原日志按12位局号rg分流173/367 decisions、10/22实际Codex请求、2/3 run-plans、36/92 Jev题和0/2原始SL行。states分别从8182710891及8187004536按时间seek流读179/378静默帧，540决策observed_ts/指纹逐条一致。DeepSeek同窗seek流读0条，ds_*仅兼容字段；e33ca6e0+dirty不冒称完整复原。抽取、原片段、全历史机制复盘、分帧、检验与切片原文全部在learner/runs/20261007-070019-experience-update。',
'- 沿第63节口径：首COMBAT→同房最终尝试末结算HP净损，死亡单列，负回复保留；Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT以源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后按run/floor去重，TD1重启仍一房，读档与休息分账，未派发结束不补毒。',
'- 先重执行旧78局各自原抽取脚本；七数组、全部血档/源节点/回血/SL逐行一致。新87LC F4净回14是已发生回复，不改名负伤害；TKX F15首53→末55净回2，但增血5与战损3分账。本体250/回血30/真实伤280与999999999残壳分账，死亡余血截断不当完整需损。',
'- 开工135 active/49258字<55000，无强制压缩；新增1、更新8（全加证据、纯数字0）、退役0，active136/49920字，高66中41低29。路线/休息/构筑/步法/巨兽用新汇总替换重复案例，其余同主题补证；无条目合并，预算60000不改。potion:*和general:potion逐对象保持，其他旧含药分句逐字保持，不加药水证据或使用规则。机制[0,20]，统计/构筑沿[8,20]；未见需缩进阶的新策略反例，机制成立的败局不计反例。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色/旧基线 | 旧78局七数组及血档/节点/回血/SL逐行一致，新16房2死；总80局1233房70死 | 只静默，局/房/尝试/判死/实死分别计 |',
'| 敏捷与脆弱 | 87LC F8当前7挡、脆弱实5，36攻损31；F9生存者8+2敏=10挡。TKX异螨T4斗篷6后建立3敏、不追补；T5双防御8+8盖13 | 敏捷逐张卡牌挡，先有挡不追补；末伤仍另核 |',
'| 力量/虚弱/减力 | 87LC雕像10力、25攻弱后18，2血10挡仍差6血。TKX尖啸T2力0/3→−6/−3、首15→9，5挡损4；T3恢复0/3，6+18对10损14 | 减当前攻击不停止下一轮成长；我方打击9来自木偶，不称3力量 |',
'| 毒雾轮初 | 87LC雕像T3建立后先死，无下一轮补2；TKX T1建3，T2毒3/6、T3为5/8，末11/14未结算 | 建立、轮初补毒、已扣血与尚存毒分账 |',
'| 毒素付费/持牌伤 | 全80局实际16局51次TOXIC施放，每次能量减1、牌面5伤；加C48最早牌面共17支持。CSBR留1张2挡损3、留2张0挡损10后毒杀；TKX末2张、7血0挡先死 | 当前已见5伤可被挡扣；支付离手与末回合敌毒次序分别核，不写固定动作优先级 |',
'| 群蛇/构筑 | TKX取升级群蛇后F19/F21/F22三战实际施放0、收益0；87LC20张0升级、TKX28张4升级，均十基础牌与两负担 | 实际建立才有收益；缺早建/替构筑的受控整场，不以相关性定败因 |',
'| 巨兽本体/自爆 | TKX F17本体250净扣、两次回15故真实伤280；T10毒27按剩18截断清本体，T11自爆44弱后33、10挡损23，79→25整战损54 | 本体死亡不等过关，残壳防御仍需实际兑现 |',
'| 路线/回复 | 87LC F7回21后44→2、雕像仅2进；TKX F20回25到81、问号地道虫损54后改线，下一问号27血死、F24火未到 | 问号血价和未来回复分别核，不定安全线或未走路线优劣因果 |',
'| SL重打 | 新两局0真正重打；TKX仅F17首胜/F22首败attempt1两行；全历史仍74场322试26赢、A10 41场181试14赢 | 首试行不增重打分母，没有新同抽牌对照或固定打法规则 |',
'| 时钟/整场模拟 | TKX F16巨兽872样本、校准88%、赢损中位60/约12轮；实11轮含自爆损54。87LC未来仪式兽1000样本校准5%、约8轮、敌剩163但未抵达 | 赢样本中位不保证下一场；时钟每轮估伤/估损/存活轮为空，不能以整场轮数补造 |',
'| 未清盾 | TKX地道虫埋地37挡→26、最终仍26挡，毒杀本体；历史七次非致死清盾取消攻击机制不变 | 未清零不是反例，不为旧清盾条目虚加证据或规定清盾优先级 |',
'','七数组重算：','','| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for k,x in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {k} | {x["before"]} | {x["after"]} | 是 |')
lines+=['','死亡率分母为战斗房，局数另列；活场净损排除实死、保留负回复。A0—A9各格与第63节一致；全部各阶格/局号/损值在audit.json。A10全部非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{x["deaths"]/x["n"]:.2%} | {x["median_win"]} |')
lines+=['','源节点按入血关联下一战，多源可指同战；是观察，不是节点选择的因果效果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
 if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{x["deaths"]/x["n"]:.2%} | {x["median_win"]} |')
lines+=['','各进阶独立局数、恢复与SL：','','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合 | 回血后战/死/活损中位 | 真重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
SL=json.load(open(O/'sl-summary.json'))
for x in json.load(open(O/'rest-summary.json')):
 a=x['asc'];f=[f for f in A['fights'] if f['asc']==a];s=SL[a];lines.append(f'| A{a} | {x["runs"]} | {len(f)}/{sum(f["death"] for f in f)} | {x["rests"]}/{x["heal"]}/{x["smith"]} | {sum(x["gains"])} | {x["nexts"]}/{x["deaths"]}/{x["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','- 全历史真正重打每次explore/draws/sl_attempt仍在audit.json.attempts与各局analysis.json、decisions.jsonl；旧SL逐行重算一致。新两局无多次尝试，不新增boss/精英SL结论。低血不同节点旧例同口径重核：MGA0CZDDKC0P A10 REST22→43后Monster损17活、4D4J8USKCPAV REST1→22后损1活，D4LJ9QMGFB8Q EVENT13与BVF22RSFVBS9 EVENT21后走廊死；本两局回复也未保住之后的战斗。敌/构筑/间隔/最大血/回复混杂，只观察；未走线没有实打。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 同窗DeepSeek0，实际32请求均Codex；没有可隔离“推理引用某经验id导致反向执行”的原话，不由败局自动写repeat，既有账本上线历史按06:59勘误。TKX F18 journal原话：“眼泪补启动能量；双商店单精英路线补强防御。”计划列毒与群蛇主轴，之后群蛇0次；F22已建毒雾/步法是真的，未建6伤收益不预支，不认定强行早建必胜。',
'- 87LC F1 journal原话：“四火一精英，先整备再挑战，商店删咒保启动。”商店在F14、未到，受伤未删；F7回血21兑现、F8走廊损42，保留必经F9精英路线。TKX F21改线投影F24到火27、新F28精英65，对旧线17/41；F22先死，未来火未兑付。不把预测更好当实测赢，也没有确认同项策略repeat。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[('敏捷/脆弱','基础挡加现场敏捷后按脆弱逐牌取整；不追补旧挡，多张重复收益仍需付费与存活','silent-footwork-block','87LCSDR5P3DL A10 F8当前7实际5挡损31；TKXQ6L4N9A6U A10异螨T4旧6挡不追补、T5双8盖13'),('力量/虚弱','力量逐段增伤，虚弱逐段取整；敌成长与我方遗物固定增伤分开，局部公式不当整战因果','silent-strength-weak-observation','87LCSDR5P3DL A10雕像10力25→18攻、2血10挡仍死；TKXQ6L4N9A6U木偶打击9无我方力量'),('临时减力','当轮减6/8，次轮撤回，独立成长继续；当前非攻击敌不虚算省伤','silent-piercing-wail-temporary-strength','TKXQ6L4N9A6U A10 T2首15→9/另一只塞状态，T3恢复后6+18对10损14'),('毒雾轮初','建s层不即时补毒，已结算减1后下一玩家轮补s，未活到该轮不兑现','silent-noxious-fumes-growth','87LCSDR5P3DL雕像T3晚建无下一轮；TKXQ6L4N9A6U建3后毒3/6→5/8，末11/14未结算'),('毒素付费/末伤','已见1费离手与每张5伤；先核挡和持牌代价，玩家先死则敌毒未结算，替线未控','silent-toxic-paid-exhaust-end-turn-loss','T082DRCUHRRD A0能量5→4→3两张离手；TKXQ6L4N9A6U A10两张需10杀7血，敌毒原样'),('巨兽自爆','本体需伤、回血、残壳当轮攻击与格挡分开；本体清零之后仍付自爆，不拟合未隔离成长公式','silent-giant-explosion-window','TKXQ6L4N9A6U A10 F17净扣250/真实伤280，T11的44弱后33、10挡损23过关'),('未建能力观察','未支付不触发；费用/抽序/可活轮共同约束，持有群蛇不计每牌6伤','silent-deck-burst-observation','TKXQ6L4N9A6U A10三场群蛇0次；末3敏双防御有效但下一轮持毒素先死')]
for name,why,eid,case in mechanisms:
 e=by[eid];dist=collections.Counter(R[r]['ascension'] for r in e['evidence']);d='、'.join(f'A{a}:{n}' for a,n in sorted(dist.items()));lines.append(f'| {name} | {why} | {e["n_support"]}/{e["n_contradict"]}；{d} | {case} | {eid} |')
lines+=['','- 全部12位evidence/contradicting见experience.json；全80局历史机制复盘与原日志施放重新核，FOOTWORK/NOXIOUS_FUMES/PIERCING_WAIL实际出现52/44/48局，旧条目未纳入的局不因持有或仅相关性自动补证。TOXIC17局中16局51次付费，另C48最早牌面；持牌末伤/先死顺序的子证据由CSBR和TKX单列，不把17当每个公式17次独立实验。SERPENT_FORM历史7局有施放，本局0次不算触发反例；地道虫未清盾不算反例。缺组件或整战替代对照的写观察，不写药水规则。',
'','### 新增','','- silent-toxic-paid-exhaust-end-turn-loss：card:TOXIC/毒素/[0,20]/high，17支持0反例；付费消耗、末伤5、格挡扣减与敌毒先后分别核。复用复盘silent-0214（first_run=C48LLXBGKXQ9/A0、prior=yes）及旧0059的持牌与毒终结顺序，历史付费首证T082；不重复add、不把0213纯bug放入经验。',
'','### 更新','','| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for x in C['details']:lines.append(f'| {x["id"]} | {x["n_before"]}→{x["n_after"]} | {x["chars_before"]}→{x["chars_after"]} | 补非药水证据/同步数字及同主题案例 |')
lines+=['','- 8条全补证，纯数字0；无条目合并，旧完整文字留experience-before.json。逐局细节压成一句，完整数字留本节及分帧文件。','', '### 退役','','- 无。没有反例多于支持或代码修掉的active缺口；真实机制不因代码已建模而退役。',
'','### 和手写知识及代码冲突','','- 静默其他六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，没有手写知识需改删，不新建。hash/字段/切点留other-knowledge.json；room-costs 80局按MAP→MAP核，与战斗净损口径不同；outcome-stats A10四十局与本节一致。monster-records至22:36:11.840Z为1234开窗/A10 520，对本节1233房/519差1仍TD1同房重启，不当新独立房或整表无效。fight-value/gates的不同采样口径不当全量战斗统计，未发现整表无效证据；不覆盖后台刷新。',
'- common只定向核对巨兽A10本体250/残壳占位、雕像苏醒和现场10力、MYTE力及毒素卡面，不增其他角色证据。当前代码仍可由毒终结设winsFight而把heldPenalty/incomingRaw置0，combat-plan毒杀分支早于mod致死分歧，冲突见0213；这是纯bug，本任务不改源码、不变更其他角色。未发现本轮结论对应的相反手写静默知识。',
'','### 代码问题（不给 DS）','','- 已由复盘登记silent-0213：TKX F22 T6 combat/lethal称预计消耗0/7血，实际两毒素完整需损10、先致死7血，敌6/1血、11/14毒未动。turn-solver.ts:2901/2916/2939与combat-plan.ts:3278/3300为复盘当时只读live定位；当前代码定向核对相同胜利分支，不冒称dirty本局源码逐字复原。原修复提案交修复批次，未实打替代整场，不声称修后必胜；0213不动，仍由独立修复流程处理。',
'- 87LC F8 T3预计扣8/损31，完整实际扣10/损31；重问结束题4毒与34→30吻合，差2独立根因未记录，不列确定纯bug。离线初稿runs.character有null时报错、facts初稿误用started字段时报错；修正过滤和改取首决策时间后均通过，原初稿/失败日志保留，未改生产代码、不当自测失败。',
'- 未记录：早建群蛇/支付或格挡毒素/另一目标序/替路线/锻造的受控整场结果，抽牌及重问后完整最优原线执行比例、87LC差2伤根因、胖地精退场中间帧、boss逐轮估伤/估损/存活轮及实打估值比、未抵boss实打和Jev缓存；不补造。',
'','### 测试','','- 源固定沙箱结果见收尾，JSON/12位证据角色/n/范围/预算、旧七数组/全部血档节点回血SL、540指纹、毒素付费/死亡帧及旧含药分句校验通过。git diff --check/gitleaks提交前扫描，未改测试，完整沙箱外套件交调度器。英文源提交只改静默experience.json，写版本2026-10-07.10/增1改8退0并带Co-Authored-By。',
'- 学习账本只经learner/ledger.py/by=learner:experience-update改proposed；全部9个新增/更新经验的去向、提交及本节标题见ledger-result.json和收尾，不写accepted/shipped。旧first_run/prior/claim/证据/repeat/版本及0213独立状态保持，未纳入条目不动。主目录本节与账本仅追加，不提交。',
'','### 切片大小','','- 固定种子20260929，从截至本两局56746帧静默原始状态池，按state.run.character_id=SILENT抽最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对，真实界面分别抽样。官方knowledge-slice.ts、CHARACTER=silent/setExperienceForTests；只换experience，其他结果表/common冻结；manifest和逐片原文留盘，不冒充V4完整知识前缀。','','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in summary['rows']:lines.append(f'| {x["sample"].removeprefix("sample-")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["delta"]} |')
lines+=[f'','- 配对增量中位'+str(summary['median_delta'])+'、最大增量'+str(summary['max_delta'])+f'；总体中位{summary["before_median"]}→{summary["after_median"]}，最大{summary["before_max"]}→{summary["after_max"]}字。active135→136、49258→49920字，高66中41低29；A8 129条46813字、A9 130条47112字、A10 131条47692字。需要Dai定：无。']
text='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(text)
target=ROOT/'paper/materials/experience-changelog-silent.md';prior=target.read_bytes();(O/'changelog-before.sha256').write_text(__import__('hashlib').sha256(prior).hexdigest()+'\n')
assert title not in prior.decode()
with target.open('a') as f:f.write('\n'+text)
assert target.read_bytes().startswith(prior)
print('只追加第64节',len(text),'字；切片',summary['median_delta'],summary['before_max'],summary['after_max'])
