import json, re, collections, subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));S=json.load(open(O/'slice-summary.json'))
E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));B=json.load(open(O/'experience-before.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};by={x['id']:x for x in E['entries']};old={x['id']:x for x in B['entries']}
commit=(O/'commit.txt').read_text().strip();title=f'2026-10-07 静默猎手 第六十三次增量：2 局 A10（version {C["version"]}，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def tests(name):
    text=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text))))
T=tests('test-source.log')
lines=['## '+title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5272的HSX4HYATB4E2与紧后勘误（有效日期按date=06:25:04，原标题两次时间勘误保留）及WYB0NCD6W83J；营火合223、沙漏末T7撕咬24/中和4、暴露清挡清制品首证53FLQ68CETW0，均按勘误。两局runs.character=SILENT、A10，F48/F15败，无跳过；run-1007局报定位，last_seen=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main由9bf7de2c快进33e4e5ad，无冲突；已读README/最新STATE/最近决定/学习协议、铁甲首次及末两节的方法、静默第61/62节。独立执行、无下级agent；单进程nice19抽数、不跑boss模拟池。',
'- 截至WYB0NCD6W83J结束2026-10-06T22:05:33.373Z，78静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/38局；旧1189房66实死加新28房2实死＝1217房68实死，A10三十八局503房38死。MCCK2602T1SR仅进数字；无character旧局、其他角色、进行中与后续局排除。',
'- 按12位局号rg分流新927/222 decisions、49/14实际Codex请求、run-plans和13/0原始SL行；states按上一节末字节8137440636之后seek流读，1013/231静默帧，1149决策observed_ts/指纹全一致。对应DeepSeek时间窗二分seek均0条，兼容ds字段不冒称DeepSeek调用；代码09ac8004+dirty/e33ca6e0+dirty不声称完整复原。首末偏移、原始片段、全历史机制摘录249段、原行动/SL分帧及脚本均留learner/runs/20261007-063003-experience-update。',
'- 口径沿第62节：首COMBAT→同房最终尝试末结算HP净损，实死单列、负回复保留；Monster走廊与Unknown问号分开；入血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后战按run/floor去重，读档不算回血、未派发结束不补毒。新HSX F31实际为Unknown产卵虫45→7，不算Monster；F43三构装体实际Monster、两尝试只一房。',
'- 先逐局重执行旧76局原始片段分析，七数组、全部血档/源节点/回血/SL与上一节逐行一致。首轮attempts仅TD1同房重启因误用通用模板而不同，恢复该局专用原抽取脚本后对上；其余六数组及其他局原先全一致。完整初稿审计112MB、失败断言/更正/重跑保留，非生产代码或自测失败。',
'- 开工active133/47737字<55000，无强制压缩；新增2、更新19（19加证据，纯数字0）、退役0，active135/49258字，高65中41低29。没有合并退役；步法/暴露/律动/沙漏/沙虫/路线/休息/构筑用新汇总压短重复案例，其余同主题追加证据，长度见更新表；60000预算不改。',
'- potion:*及general:potion逐对象保持；其他旧药水/喝药/留药/药栏分句逐字保持，爆发旧复制药水事实保留。新证据仅非药水部分，无新增或加强用药规则。机制[0,20]，综合路线/休息/构筑沿[8,20]；未出现需缩进阶的新策略反例，机制成立的败局不计反例。','',
'### 对照数据检查的主题','',
'| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色与旧基线 | 旧76局七数组/血档/节点/回血/SL逐行一致；新21+7房、2实死 | 只静默，房/尝试/判死/实死分账 |',
'| 暴露与制品 | HSX沙漏首T2药瓶消3制品无毒；第二先暴露33挡/3制品同时清0并施2易伤，再建9毒、498→483；历史53FLQ两次33挡/2制品→0/0、6易伤 | 清除子机制2局，不拆重放内部过程，顺序局部优势不等全场赢 |',
'| 胆小与减员 | 全历史22局存在非致死命中后补胆小6/7挡的分帧，A0/1/2/3/4/6/7/9/10各2/2/2/1/1/2/3/1/8；21场过1死 | 盾与毒/实际退场分账，不设固定目标序 |',
'| 花园死亡轮 | WYB T1扣12/T3扣18仍四只，T5首杀；T8毒只扣余4取消21攻，另11攻对10挡杀1血 | 当轮净伤不是减少攻击源，剩血截断不把5毒全扣 |',
'| 应急按钮 | WYB F13 T3补30/禁挡2，T4毒杀蚌损1；F15 T6已有6+30=36盖33，T7防御0挡损22至1，T8两牌各5仍死 | 当轮挡和后轮卡牌禁挡分别核，1局两战胜败各1，未控时机因果 |',
'| 力量与共享撕咬 | HSX T1我方1力，撕咬首两段6合12，普通共享增2后第二两段8合16；末T7撕咬24/中和4 | 1力四段多4伤，共享成长不是只改本牌，手中未打不计 |',
'| 敏捷/重放/余像 | 首沙漏4敏防御9；末2敏，T7防御两次各7、余像五次各1，共19 | 敏捷逐挡牌，重放再次兑现，余像按施放数非攻击段数 |',
'| 临时减力与成长 | 末T5双尖啸4→−2→−8力、26→8攻；2挡另6凋萎损12；T6恢复4、T7长9 | 临时减力不永久关成长，不把凋萎混为攻击 |',
'| 律动残余与凋萎 | 六试T1零挡对26均39→19；末26+18−19=25，限损20仍超过2血，实际归零 | 限损/剩血截断不同，不能称仅受2伤或安全低血线 |',
'| 滚石实建立 | 仪式兽T3—9轮初5/10/15/20/25/30/31合136；沙虫胜试T2—8轮初5/10/15/20/25/30/35合140，另开场9与行动及毒192共341；沙漏0次 | 回本取决已建立与活到的轮初，未施放贡献0 |',
'| 触媒/直接施毒 | HSX沙虫前二T2/胜试T6建；沙漏首T6/第三T5建，末次未建13毒只扣13；WYB末毒5截扣4 | 晚建不追补旧轮，层数/次数/剩血分账 |',
'| SL重打对照 | 新3场11试2赢；沙虫三试初28项同序，构装体初24/29不同，沙漏首末39项同但到手轮/动作变 | 有局部行动对照，缺单项与运气胜因；全历史74场322试26赢/A10 41场181试14赢 |',
'| 饱和模拟换线血价 | 沙漏第二/第四T4同19血445敌血，旧三防御损2扣7、换线损16扣48；当题均24/24模拟死 | 多付14血多伤41有实际血价、下轮3血判死，代码替换非Jev自选 |',
'| 路线与未来boss模拟 | WYB66/70进花园仍死，F14的未来boss60血模拟0.397/0.6089未抵达；HSX F9改火实F12入69、旧线预测44未实打 | boss模拟不当下一精英胜率，未选路线没有因果收益25 |',
'| 休息与构筑 | HSX十回血合223、无锻造、终39张两升级；WYB两火一锻造/一回21、事件另10、终21张十基础牌一升级 | 实际回复/遗物/事件/升级分账，不由死局定替构筑或休息必胜 |',
'']
lines+=['七数组复算数量：','', '| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
lines+=['','死亡率分母为战斗房，局数另列；活损中位排除实死、保留负回复。A0—A9各格与第62节完全一致，全部各阶格/局号/损值在audit.json。A10非空格：','','| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['bands']:
    if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["type"]} | {x["band"]} | {x["n"]}/{x["runs"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','源入血关联下一战、多源可指同战，描述观察而非节点选择效果：','','| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for x in A['transfers']:
    if x['asc']==10 and x['n']:lines.append(f'| {x["act"]} | {x["screen"]} | {x["band"]} | {x["n"]}/{x["unique_fights"]} | {x["deaths"]}/{100*x["deaths"]/x["n"]:.2f}% | {x["median_win"]} |')
lines+=['','各进阶恢复与SL（各阶独立局数）：','','| 进阶 | 局 | 火/回血/非回血动作 | 回血合 | 回血后不同战/死/活损中位 | 真重打场/试/赢 |','| --- | --- | --- | --- | --- | --- |']
rs=json.load(open(O/'rest-summary.json'));ss=json.load(open(O/'sl-summary.json'))
for x,y in zip(rs,ss):lines.append(f'| A{x["asc"]} | {x["runs"]} | {x["rests"]}/{x["heal"]}/{x["smith"]} | {sum(x["gains"])} | {x["nexts"]}/{x["deaths"]}/{x["median"]} | {y["fights"]}/{y["attempts"]}/{y["wins"]} |')
lines+=['','沙虫经验条目仅已作该结论证据的11局32试8赢/真重打7场28试4赢；全历史实际13局34试10赢，两局未给该机制补证，仅进数字。沙漏13局56试3赢/真重打11场54试2赢，A10五场30试0赢。SL初抽序按draws.order/clean核，抽到回合按draws.turns核；生成/重抽/弃牌和后续动作未全部控制。完整explore与sl_attempt逐回合保留，不将判死未结算算实损或未来毒。','',
'### 经验库自己带偏或写了没被执行的地方','',
'- 两窗DeepSeek0条，实际大脑全Codex；brain.knowledge仅条目ID/摘要，未见能隔离“引用某条经验导致失败”的推理链，不把失败自动登记repeat。以下是计划与实际差异。',
'- HSX F18 journal原话：“可可加速滚石启动，走早店三火单精英线。”实际滚石在仪式兽/沙虫建立并扣136/140，在六次沙漏均未建立。F47理由原话：“survival buffer outweighs any single upgrade and buys time to establish scaling.”回血13→39兑现，滚石未来收益未兑现，不由无升级推未选线必胜。',
'- WYB F1 journal原话：“前期战斗补输出，商店强化，三火保障后期精英与首领血量。”实际仅抵两火、F16第三火未达，66血进精英死。F8计划妥当保留应急应对巨兽的计划，死亡战计划妥当0次建立、boss未达；不把持有当保留已兑现。',
'- HSX沙漏首T2先药瓶只消制品而无毒，支持旧制品阻减益；后暴露同一步可清全制品，旧暴露条目“清挡/制品未验证”已更新为两局分帧实证。0073原易伤结论保持，0208登记清除子机制，不凭未执行序认定另线赢。','',
'### 机制推理','',
'| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
groups=[
('力量/共享成长',['silent-strength-weak-observation','silent-maul-shared-growth'],'力量每段加1，普通撕咬共享增2使随后两段收益增4；挡/剩血另核','HSX4HYATB4E2 A10沙漏T1两刀12/16合28，末未打不计'),
('敏捷/爆发/余像',['silent-footwork-block','silent-burst-next-skills-replay','silent-afterimage-per-card-block'],'敏捷逐挡牌、重复技能再次兑现敏捷与余像；余像按次数非段数，19挡仍不足','HSX4HYATB4E2 A10末T7防御7×2+余像5=19、2血仍死'),
('暴露清挡/清制品',['silent-expose-vulnerable'],'清除无需逐层试毒；已验证清挡清制品2局0反例，随后实建毒不等整战赢','53FLQ68CETW0 A6 T5重放暴露+33挡/2制品→0/0；HSX4HYATB4E2 A10 T2普通33/3→0/0'),
('临时减力/敌成长',['silent-piercing-wail-temporary-strength'],'双减6当轮降力12、次轮撤回；独立成长继续，状态失血另核','HSX4HYATB4E2 A10末T5攻击26→8/另6凋萎，T7长9力仍26'),
('滚石轮初成长',['silent-rolling-boulder-start-growth'],'按现场层数后加5，k次理论5k+5k(k−1)/2，实际受剩血/挡截断；未建0','HSX4HYATB4E2 A10仪式兽7轮初实136、沙虫7轮初140，六次沙漏0'),
('限损/凋萎',['silent-beating-remnant-loss-cap','silent-wither-end-turn-loss'],'攻击减挡加持牌伤，再核20单轮上限与剩血；限损不回血，致死先后未知','HSX4HYATB4E2 A10末T7完整25→限20仍超过2血，实归零'),
('胆小盾/毒与退场',['silent-gardener-skittish-shield'],'非致死命中后补现场6/7盾；挡阻后续攻击而已结算毒可扣尽剩血，实际退场才取消行动','T082DRCUHRRD A0 F8 T1刺击31→25/挡6；WYB0NCD6W83J A10 T8毒4取消21攻仍死'),
('应急卡牌禁挡',['silent-panic-button-card-block-lock'],'先补30且保留旧挡、禁挡2→1→消失；在阻卡牌挡的实见时点下一轮防御0，不推被动或时机规则','WYB0NCD6W83J A10 F15 T6挡36零损，T7挡0损22、T8恢复10仍死'),
('施毒/触媒与截断',['silent-deadly-poison-application','silent-bouncing-flask-poison','silent-accelerant-triggers'],'施毒不立即扣血、制品阻挡另核，触媒按实际建立后额外触发，剩血截断不计未发生毒','HSX4HYATB4E2 A10末沙漏触媒未建13毒扣13；WYB0NCD6W83J末5毒只扣4')]
for name,ids,reason,case in groups:
    evidence=[]
    for id in ids:
        e=by[id];counts=dict(sorted(collections.Counter(R[r]['ascension'] for r in e['evidence']).items()));evidence.append(f'{id}: {e["n_support"]}/{e["n_contradict"]}，'+','.join(f'A{k}:{v}' for k,v in counts.items()))
    lines.append(f'| {name} | {reason} | '+ '<br>'.join(evidence)+f' | {case} | '+','.join(ids)+' |')
lines+=['','全部12位支持/反例局在experience.json，逐动作前后帧在mechanism-actions.json/gardener-actions.json；各子机制局数分别写，不把综合支持数当每个公式都独立验证。只有相关性、缺单组件整战对照的写观察；机制成立的败局非反例，药水仅保留原事实，不写使用规则。','',
'### 新增','',
'- silent-gardener-skittish-shield：elite:PHANTASMAL_GARDENER/[0,20]/high，22支持/0反例；胆小盾、毒剩血截断与退场分核，不写固定击杀序。0209支持本次打法观察，0211覆盖历史机制；首证由R0追加更正更早T082/A0/prior=yes，旧首证和先验历史保留。',
'- silent-panic-button-card-block-lock：card:PANIC_BUTTON/应急按钮/[0,20]/low，1支持/0反例，合并0210牌值与0212机制到同一条；禁挡时点及一胜一败实证，不定不用/早用必胜。','',
'### 更新','', '| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for id in C['updated']:lines.append(f'| {id} | {old[id]["n_support"]}→{by[id]["n_support"]} | {len(old[id]["lesson"])}→{len(by[id]["lesson"])} | 补非药水证据/同步数字及同主题案例 |')
lines+=['','19条全加证据，纯数字0；暴露增加53FLQ及HSX两局，其余仅本次一或两局。无需开工强制压缩，没有合并退役。旧完整文字留experience-before.json，逐项长度如表。','',
'### 退役','', '- 无。没有新反例多于支持或代码已修的active缺口；事实机制与已建模代码分账。','',
'### 和手写知识及代码冲突','',
'- 静默其他六份boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，无手写知识需改/删，不新建；字段/切点/hash留other-knowledge.json。当前基线生成于旧76局/A10三十六局，较本节滞后两局，不把切点差当矛盾，不覆盖后台刷新。monster-records旧1190开窗对本节旧1189房差1沿TD1同房重启；room-costs以MAP→下一MAP核，不同于战斗净损；fight-value/gates仍2局40战223行，没有整表无效证据。',
'- common花园胆小层数已记录6/7，但汇总description固定写1；本条仅以本角色分帧6/7为证据，不用描述覆盖现场，不改common。沙漏A10血535/33挡、成长及现场制品3与日志核；代码里的手写规则定向检索未见相反的明确知识，代码不改、其他角色等价。','',
'### 代码问题（不给 DS）','',
'- 无新增确定纯bug。HSX第四沙漏T4短题预计40、完整行动及毒净扣48，额外8根因未记录；完整轮口径不能直接列模拟缺陷。WYB末least-loss预计0且毒杀取消21后仍1伤缺口，实际归零，不认定漏毒。护栏两局0次替换，SL换线另列。',
'- 离线初稿错误及更正保留：TD1专用抽取口径、指纹字段实际名fingerprint、沙虫初序三试各28而非32项；尝试统计11支持局32试8赢不变。初稿经验/切片/第一轮测试原件保留，定稿重测是文字复核，不是测试失败或超时。',
'- 未记录：替构筑/目标/路线/休息/未取蘑菇/按钮改时机的受控整场结果，SL/抽牌重问后的完整原线执行率、沙漏T4额外8根因、boss逐轮需要/估伤/可活轮及实打估值比、WYB boss实到与HSX第二boss实打、Jev缓存；不补造。','',
'### 测试','',
f'- 定稿源固定沙箱tsc0/vitest0，{T["files"]}文件/{T["cases"]}用例；初稿源同入口原件留initial-test-source.log，初序字数修正后重跑定稿，不因失败/超时重跑。合后结果见本节收尾，完整沙箱外套件交调度器。',
'- JSON、角色/12位id/n/范围/预算、旧基线七数组、1149指纹、机制/SL/药水分句、git diff --check/gitleaks通过；未改测试。源仅改静默experience.json，英文提交含2026-10-07.9/增2改19退0并带Co-Authored-By。学习账本只CLI/by=learner:experience-update改proposed，覆盖全部21条经验，不写accepted/shipped；未纳入条目不动，详情ledger-result.json及收尾。主目录本节/账本仅追加不提交。','',
'### 切片大小','',
'- 固定种子20260929，截至本次56189帧静默状态池，按state.run.character_id=SILENT抽最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对、真实界面分别抽20。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests；只换experience、其他结果表冻结。manifest/逐片原文保留，不冒称V4全部知识前缀。','','| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for x in S['rows']:lines.append(f'| {x["sample"].removeprefix("sample-")} | {x["before_median"]}/{x["before_max"]} | {x["after_median"]}/{x["after_max"]} | {x["median_delta"]} |')
lines+=['',f'- 配对增量中位{S["median_delta"]}、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active133→135、47737→49258字，高65中41低29；A8 128条46151字，A9 129条46450字，A10 130条47030字。需要Dai定：无。','']
(O/'changelog-section.md').write_text('\n'.join(lines))
print(title,T)
