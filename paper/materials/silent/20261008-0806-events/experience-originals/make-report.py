import json,collections,hashlib,re,subprocess,statistics
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));V=json.load(open(O/'verification.json'));M=json.load(open(O/'mechanism-evidence.json'));SL=json.load(open(O/'sl-summary.json'));RE=json.load(open(O/'rest-summary.json'));S=json.load(open(O/'slice-summary.json'));B=json.load(open(O/'baseline-check.json'));P=json.load(open(O/'proposal-ids.json'));L=json.load(open(O/'ledger-result.json'));mapping=json.load(open(O/'ledger-map.json'))
source=(O/'source-commit.txt').read_text().strip();merge=json.load(open(O/'live-merge.json'));stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
log=(O/'test-source.log').read_text();files=sum(int(n) for n in re.findall(r'Test Files\s+(\d+) passed',log));cases=sum(int(n) for n in re.findall(r'(?m)^\s*Tests\s+(\d+) passed',log));assert (O/'test-source.rc').read_text().strip()=='0'
title=f'## 2026-10-08 静默猎手 第九十一次增量：1 局 A10（version 2026-10-08.8，分支 exp-silent，{source[:8]}）'
(O/'section-title.txt').write_text(title+'\n')
lines=[title,'','### 来源','',f'- 记录时间{stamp}；只读根notes/lessons.md:5658起GXNKW8X1XYJP静默A10/F45败及唯一局报run-1008-0615-GXNKW8X1XYJP.md，无本局勘误。runs.jsonl:601角色SILENT，未跳过；运行b1714285+dirty完整源码未留，不以当前树冒认。',
'- 开工exp工作区干净，git merge --no-edit main成功快进bfaf979e；已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法及最后两次增量、本角色最后两节和账本README。独立完成；抽取/核对均nice19单进程，固定测试单worker，不联网、不安装依赖、不跑play/模拟池，临时文件仅本批scratch。',
'- 按run id重抽649决策、48实际Codex脑、7 SL摘要、10 run-plans；states按UTC窗seek并核run_id/character_id，共673帧；DeepSeek推理0，兼容ds_*字段不当DS调用。字节偏移与原文留本批，全部历史120局仅本角色。',
f"- 全引擎学习观察截至{A['cutoff']}共120静默完局，A0—A10局数7/3/2/1/4/1/11/7/1/3/80；1753房/110实死。排除进行中、切点后、缺character的旧局及其他角色；历史已读本角色复盘随数字重核，不替代纯Codex战绩口径。",
'- 口径沿第90节：第一COMBAT入房HP减同房最终尝试退出HP；小血瓶造成的入房/可操作差额、负净损均保留，实死单列。Monster仅走廊、Unknown另列，训练假人不当实死；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战、Ancient排除，多源可同战，回血后战去重；独立营火和动作数分列。',
'- 旧119局七数组逐行、全部血档/源节点转移、实回血与SL重算一致。新局15房14胜1实死、19尝试窗口：14胜/4判死截断/1实死；F17首试和F45前三试不补未执行结算，不计额外实死。F45整房首次5→末0损5、末次可操作7→0损7分列。',
f"- 新增2、更新12（12条加证据，0条只改数字）、退役0；active165→167，正文52792→52766，置信{V['confidence']}。开工未超55000、未改60000测试预算；相同机制并回原条目，重写压短案例但保留全部旧证据/反例与旧全文changes.json。",'', '### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for m,c in zip(M,C['entries']):
    lesson=c['after']['lesson'].split('。')[0]
    lines.append(f"| {m['id']} | 支持{m['support']}/反例{m['contradict']}；分阶{m['asc']}；新证据{','.join(c['new_runs'])} | {lesson} |")
lines += [
'| 赢战资源链 | F35/38/40入房97→84→66→41净耗56；F42休41→71；F44入71补73胜后5、净耗66/可操作耗68；F45入5补7 | 未来营火/投影不是现有生存量；替路线未执行、无因果对照 |',
'| 同手T2两线 | 第2/末试2血、3敏/1力/3覆甲、敌84/84/77、同五牌；T3实3血/0带挡/敌218对13血/7带挡/敌226，死亡模拟22/24对23/24 | 翻滚线多保10血带7挡少扣8，两线均败，不能判更高整战胜率 |',
'| 末战结算 | 13血、23牌/带挡、2覆甲对17+12+11=40，完整需损15、hpAfter−2；末实死，连枷/幽灵/魔法余38/76/67、毒16/2/2 | 与当前least-loss剩血语义一致，不报少算伤害bug；未建触媒不加额外毒触发 |',
'| 已建毒赢战 | F33 T3触媒+2，T5毒29→26扣84；T6毒31三结90，另轮初抱抱7使107→10；七轮可操作57→54、损3胜 | 97净扣不全记毒；证明机制兑现而非单卡受控整战胜因 |',
'| 获药/饮药/恢复 | 独立新获10瓶、主动饮13次、精灵自动消耗4次、主动弃药0；四次SL恢复7旧药槽次；五次休息114、小血瓶12、幕间54/12、果实31分账 | 复活与SL恢复不当新获/营火回复；未用毒药的F44替线整战结果未知 |',
'| 抑制守恒 | 8局，A5/6/7各1、A10五局；原COMBAT手牌加agent_view draw/discard/exhaust逐基ID升级/普通计数前后守恒 | 排除只靠同名混合副本判断降级；SL物理牌身份仍需唯一配对，未知保守断序 |',
'| 进阶 | 低阶三骑士原条目asc[5,7]不扩大；新复活血价观察只A10 asc[10,20]；机制类[0,20]而文字保留已见等级 | 不拿A5胜局推A10固定打法或另一击杀序 |',
'| 低血异节点观察 | A10二幕源血<25%：REST16节点/16后战4死、活损中位11；SHOP4/4后战1死、中位0；EVENT12/10独立后战4节点指向死战、中位3.5 | REST/SHOP源节点后战死亡率均25%，EVENT按源节点33.33%；后战房型/构筑/用药不同，不能判改商店或问号因果更好 |',
'| 模拟与路线投影 | F16升级424样本胜42.45%/赢损中位23/约11轮，实重打9轮损34；回血40.09%/57血未实走；F28=280/F32=96样本不报比较胜率；F42精英投影54/p7543、实入5 | 赢样本不当败样本预测；换线/构筑/用药同时变，旧silent boss时钟尚无校准 |',
'','旧基线七数组复算：','','| 数组 | 旧 | 新 | 旧行一致 |','| --- | --- | --- | --- |']
for name,r in B.items():lines.append(f"| {name} | {r['before']} | {r['after']} | 是 |")
lines+=['','各进阶/幕/房型非空血档（房/独立局；活损中位；完整病例audit.json）：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:lines.append(f"| A{r['asc']} | {r['act']} | {r['type']} | {r['band']} | {r['n']}/{r['runs']} | {r['deaths']}/{100*r['deaths']/r['n']:.2f}% | {r['median_win']} |")
lines+=['','非战斗源节点下一场（源节点入房血档，多源可指同战，不混去重后战分母）：','','| 进阶 | 幕 | 源界面 | 血档 | 源节点/独立战 | 后战实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:lines.append(f"| A{r['asc']} | {r['act']} | {r['screen']} | {r['band']} | {r['n']}/{r['unique_fights']} | {r['deaths']}/{100*r['deaths']/r['n']:.2f}% | {r['median_win']} |")
lines+=['','营火动作与实际回血：','','| 进阶 | 局 | 独立火 | 回血动作/实际回复 | 其他动作 | 去重后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
lines.insert(len(lines)-4,'- 低血不同节点典型观察：JQPT83P8KDSZ A10二幕F22/F23事件和F24营火均以<25%源血关联F25实死（整房净损34）；HUVEPWQAHWFU A10二幕F20低血商店后F21战净损0、F22低血商店后F25战净损22且活。多源同战不能重复当独立胜负，牌组/后战敌人不同，没有同局替路线完整对照。')
lines.insert(len(lines)-4,'')
for r in RE:lines.append(f"| A{r['asc']} | {r['runs']} | {r['rests']} | {r['heal']}/{sum(r['gains'])} | {r['smith']} | {r['nexts']}/{r['deaths']} | {r['median']} |")
lines+=['','SL真正多次尝试按场去重：','','| 进阶 | 重打场 | 尝试数 | 赢的尝试 |','| --- | --- | --- | --- |']
for r in SL:lines.append(f"| A{r['asc']} | {r['fights']} | {r['attempts']} | {r['wins']} |")
lines+=['','- 本局真正重打F17一场2试1赢，F45一场4试0赢；F33仅一试胜，不把单试SL摘要当重打。同手T2只核局部血价，族母转胜同时改变药水时点/能力/抽牌/防御，完整同抽胜因未控。逐场explore/draws、sl_attempt及动作留analysis.json/audit.json。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- DeepSeek推理0、48脑记录均Codex，无DS引用条目原话可报；未发现逐条引用足以证明经验致错。F34原话“最大生命强化双王续航，双火单精英保血。”，F42换早精英题面54/p7543，实入5；前序赢战血价未被这句计划保证。',
'- 第2/末试T2 Jev原选双毒，“confidence 0.99”；末次代码SL替换翻滚，下一续步实际是翻滚。原答、代码替换、真实后战分开，不能用原rank或有限死亡样本声称原线必死/替线能赢。silent-0079仅已有少挡换输出血价的repeat，本局早于S1.exp90刷新，不冒称该版本上线后复犯。',
'- 触媒持有未兑现：F33实建升级2层后胜，F45末T3触媒未建；本局不能从赢战反推末战先打触媒即胜，抑制的未打牌文本也不换算实际少伤。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for m,c in zip(M,C['entries']):
    e=c['after'];text=e['lesson']
    if '机制：' not in text:continue
    reason=text.split('机制：',1)[1].split('决定胜负的战斗：',1)[0];case=text.split('典型案例：',1)[1]
    lines.append(f"| {e.get('name',e['id'])} | {reason} | {m['support']}/{m['contradict']}，分阶{m['asc']} | {case} | {e['id']} |")
lines += [f"\n- 全史{V['history']}；完整动作/前后帧historical-power-deltas.json，动作分母不当条目支持局数。步法五次净+1伴柔嫩、毒雾一次+6伴重放，不改基础规则。",
'- 三药逐饮全核：敏捷44局64饮均+2、铁心16局26饮均覆甲+7且旧挡不变；毒30局122饮，105饮+6、头骨4局15饮+7、制品2局2饮阻毒，无即时本体伤。完整减层、药水时点胜因和未见组合保持未知。',
'- 14支持局/21对跨幕同上限边界重核缺失HP80%向下取整；抑制8局前后版本守恒支持A5/6/7/A10，首证ZE8F192FKX24的prior保留，仅说明已有现场普通文本读取，不冒充全机制先验。',
'- 三份提案'+','.join(P)+'均source_task=experience-update，关联本次条目/账本/证据，target_task=strategy-proposal；实际领域combat/potion/sl/terminal/structure，仅登记待独立实现，不冒认implemented/shipped。',
'','### 新增','']
for c in C['entries']:
    if c['before']:continue
    e=c['after'];lines.append(f"- {e['id']}（{e['scope']}、asc{e['asc']}、{e['n_support']}/0、{e['confidence']}）：{e['lesson']}")
lines += ['','### 更新','','| 条目 | 支持前→后 | 字符前→后 | 新证据 |','| --- | --- | --- | --- |']
for c in C['entries']:
    b,e=c['before'],c['after']
    if b:lines.append(f"| {e['id']} | {b['n_support']}→{e['n_support']} | {len(b['lesson'])}→{len(e['lesson'])} | {','.join(c['new_runs'])} |")
compressed=[c['id'] for c in C['entries'] if c['before'] and len(c['after']['lesson'])<len(c['before']['lesson'])]
lines += ['','- 十二条均补本局证据，原证据/反例、原进阶范围未删改；压短重复累计案例：'+','.join(compressed)+'。旧全文留changes.json/experience-before.json，无合并退役。',
'','### 退役','','- 无；无反例多于支持或已修纯bug型经验。',
'','### 和手写知识及代码冲突','',
'- 八个其他静默JSON已核元数据/用途/截止点与哈希；room-costs为MAP首末口径，monster-records战内/战后分列，其余生成统计/独立校准或既有双boss四局参数，异步切点不当事实冲突。本局未到F49，无新双boss参数；无手写攻略/手册需改删，八文件哈希保持other-knowledge.json，未读写其他角色知识。',
'- 源码手写知识未改。抑制牌堆改标被SL抽序当插入/离堆，是当前draws.ts升级键整堆差分的记录冲突；旧复盘silent-0279保留observed及原修复提案，新经验仅真实版本数据，独立strategy-proposal核实现。现场能力/血价的输入覆盖须由独立任务核等价，不能仅凭更新知识文字报代码缺陷。',
'','### 代码问题（不给 DS）','',
'- 纯SL身份bug不写进经验：四次T2四普通键假inserted，旧+键残差截前缀19/18/19/18；同基ID混合副本/洗牌/真新卡同时变化时仍须唯一配对，否则保守断序。未证明修后可赢。',
'- 本次核对脚本首次只读COMBAT.hand、未读取agent_view牌堆，守恒筛选得空；失败/初稿日志保留，改为手牌及draw/discard/exhaust全区后8局守恒通过。未写入错误经验，也不是游戏bug或tsc/vitest失败。',
'- 缺失dirty完整源码、完整毛伤/召唤身份/末击事件、判死截断出口、复活瞬时帧、重打入房触发前帧、最终实线最优比例、替路线/提前药水/未执行线整场反事实、旧boss时钟与未到三幕boss实盘，均保持未知。',
'','### 测试','',
f'- 源原入口bash tools/test-sandbox.sh，TMPDIR本批/PATH含~/.local/node/bin/SANDBOX_WORKERS=1/nice19；tsc0、vitest0，{files}文件/{cases}通过例；完整入口无重跑，额外定向诊断1文件/10例通过。完整外部仅由实际合入后调度器补，不冒报完整套件通过。',
'- JSON、字段/角色/局号/反例/预算、旧119局逐行基线、同盘两线/末结算、8局抑制守恒、21跨幕边界、三药全史、240固定配对切片、check-experience missing=[]/0、gitleaks0和diff --check通过。',
'- 学习账本只经CLI：新增无；改proposed '+','.join(L['proposed'])+'；退役无，ledger.py check0。原first_run/prior/claim/repeat及旧上线历史保留；0279纯bug仍observed，学习者不标accepted/shipped。',
f"- live实际合入：{merge['merged']}；刷新：{merge.get('refresh')}；合前：{merge.get('before')}；合后测试：{merge.get('after_test')}；结果：{merge.get('reason')}。"]
for conflict in merge.get('precheck_conflicts',[]):lines.append('- '+conflict)
lines += ['','### 切片大小','',
'- 种子20260929，从截止点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对，各格20独立时点；池/时点留sample-manifest.json。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome快照；新池before不混旧批中位，V4整份前缀另报本阶总字数。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f"| {r['sample'].replace('sample-','')} | {r['before_median']}/{r['before_max']} | {r['after_median']}/{r['after_max']} | {r['paired_median']} |")
lines += ['',f"- 整体中位{S['before_median']}→{S['after_median']}（+{S['median_delta']}字），配对增量中位{S['paired_median']}、单片最多增{S['max_delta']}，最大{S['before_max']}→{S['after_max']}。active167/正文52766，置信{V['confidence']}；A8/A9/A10适用{V['asc']}。需要Dai定：无。合入受阻则按真实结果交运维续办，保留原件，不冒报上线。",'',f'原帧/脚本/初稿/失败/机制/提案/账本/测试/切片/合入回执：{O}；报告时间{stamp}。']
section='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(section)
report=dict(task='experience-update',version=C['version'],commit=source,merged=merge['merged'],added=len(C['added']),updated=len(C['updated']),retired=0,active=C['active_after'],mechanisms=[m['id'] for m,c in zip(M,C['entries']) if '机制：' in c['after']['lesson']],tests=dict(tsc=0,vitest=0,cases=cases),ledger=dict(added=[],proposed=L['proposed'],retired=[],check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');(O/'report.md').write_text(section+'\n```json\n'+json.dumps(report,ensure_ascii=False,indent=2)+'\n```\n');print('报告已保存',files,cases,title)
