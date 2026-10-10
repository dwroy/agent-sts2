import collections,json,statistics,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='KEN58SH9SLZ6';C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));H=json.load(open(O/'historical-facts.json'));R=json.load(open(O/'rest-summary.json'));SL=json.load(open(O/'sl-summary.json'));P=json.load(open(O/'proposal-ids.json'));L=json.load(open(O/'ledger-result.json'));T=json.load(open(O/'tests.json'));M=json.load(open(O/'live-merge.json'));timestamp=subprocess.check_output(['date','-Iseconds'],text=True).strip();commit=(O/'source-commit.txt').read_text().strip();E={e['id']:e for e in json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'))['entries']};title=f'2026-10-07 静默猎手 第八十一次增量：1 局 A10（version 2026-10-07.27，分支 exp-silent，{commit[:8]}）';s=['## '+title,'','### 来源','',
 f'- 记录时间{timestamp}。只合并KEN58SH9SLZ6静默猎手A10复盘（根notes/lessons.md:5524）及21:02:19勘误，runs确认SILENT/A10/F17败、f9db52c1+dirty，结束2026-10-07T12:23:25.134Z。无角色跳过；last_seen取run-1007-2023-KEN58SH9SLZ6.md。548决策/558状态/6 SL/3 run-plans；18原始脑请求全Codex，17实际计费回答与21职责记录分开，F16早一次模型过载失败、accepted=false且usage=0，DeepSeek时间窗0。dirty树不复原，兼容ds字段不当实际引擎。',
 '- 开工工作区干净，git merge --no-edit main从4b6396bd快进04a271c1无冲突；读README/最新STATE/决定末尾/学习和代码提案协议、首次构建方法及两份变更记录最近两节。独立执行，无下级agent；按局号抽取，状态/推理以时间二分seek后验run_id和character_id，偏移落盘。旧104局切片逐局nice19单进程重跑，七数组/房档/节点转移/回血/SL完全一致。全部临时文件仅本批scratch，不跑boss模拟池。',
 '- 汇总截至2026-10-07T12:23:25.134Z：105静默完局，A0—A10为7/3/2/1/4/1/11/7/1/3/65局；1536房95实死，A10为822房65实死。105局均有本角色复盘，无新增仅数字局；历史仅数字证据不擅补机制支持。其他角色、无character旧局、进行中及切点后排除；全引擎学习观察不替代纯Codex爬塔成绩。',
 '- 沿上一节口径：首COMBAT HP减同房最终尝试退出结算HP，死亡单列/负回复保留；Monster走廊与Unknown问号战分开。入血/max HP分<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT关联下一更高层第一战，Ancient排除、多源可同战、回血后战去重。判死截断不补攻击或毒，六试是一场一局，只有末试实死。',
 '- 六赢战F2/F3/F4/F5/F11/F15净损0/3/0/37/6/0合46；F5的25为前序赢战最大单轮净损，含SL的最大已结算单轮损是首试异鱼T7的26。两火加湿器实回27+29=56/上限各+5，事件回6+10=16、潜水付7、SL恢复348另列；独立获药7/use7/弃0，boss六试均75/86空栏，不把零损喝药当未喝也零损。',
 f'- 开工154 active/48612字<55000；新增1、更新10（补证据10/只数字0）、退役0，定稿155 active/48539字。折扇旧多局叙述压短并保留A4组合边界，其他更新典型案例；未合并独立条目，未改测试预算。旧全文在experience-before.json/changes.json。机制[0,20]、路线/休息/构筑[8,20]、异鱼SL[10,20]；无新进阶外推。',
 '- 新速度药条目核32局38饮；基本使用首证C48/A0，在任何本条学习前已实际先药后防御，prior=yes。旧0091仅A4脆弱组合首证/unknown保持，不倒改其首证或先验。仪式的一般成长合进力量综合条目，未给未遇到的雕刻师专属条目加KEN证据。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for eid in C['updated']+C['added']:
 e=E[eid];s.append(f'| {e.get("name",eid)}（{eid}） | 支持{e["n_support"]}/反例{e["n_contradict"]}；各阶{H[eid]["asc_support"]} | {e["lesson"].split("机制：")[0].split("典型案例：")[0]} |')
s += ['| 旧基线 | 七数组/血档/节点/回复/SL逐行一致 | 先对旧104局再添新局，无口径差异 |',
 '| 速度期限 | 32局38次即时+5；35次次轮净撤5，另3次有独立步法/口红/预判变化，38次速度层均消失 | 子公式分母与局数分开，未见反例；不定喝药/留药门槛 |',
 '| 仪式分源 | 全史43局154存活对齐结束窗：145次仅仪式、9次含临时减力恢复；2死亡截断窗不完成成长 | 临时恢复不是仪式数变大；101条综合证据中41局支持此子公式，UJ0K3G10609Y/U8K28UUGYP3U只校验背景、不擅添综合证据 |',
 '| 同盘SL | 第4/5试T10扣2→4、损15→21；第4/末T5省2血却步法T5→T9 | 双向代价都留，后续也变、不认单步整战胜因或只保血恒优 |',
 '| 药水与入口 | 7获/7饮/0弃/六次空栏75/86；六赢战净损46 | 缺未饮用/留到boss整战对照，沿现价值与饮用规则 |',
 '| 构筑兑现 | 21牌全未升级、仅迷雾/刺击毒，计划三张未到手；末四轮扣85/13轮扣186、余35 | 能力分数/存毒/未来计划不当实挡与实伤 |',
 '| 路线投影 | 初计划F5入口44对实际53、F6问号40对实际16；F5已换线，后有事件与上限变化；F16即刻回血档投75/实75 | 后段非原路线等价误差，未走精英62不填实际0，不判改线/休息错误 |',
 '', '七数组复算：','', '| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():s.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
s += ['', 'A8/A9/A10非空战房血档，活损保留负值；A0—A7每格与旧值相同，完整数据在audit.json：','', '| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
 if r['asc']<8 or not r['n']:continue
 s.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]:.2%} | {r["median_win"]} |')
s += ['', 'A10源节点入血档到下一实战，多源可同战；其他进阶完整行在audit.json/transfers：','', '| 幕 | 源房 | 血档 | 源节点/不同战 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
 if r['asc']!=10 or not r['n']:continue
 s.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]:.2%} | {r["median_win"]} |')
s += ['', '营火/真正SL逐阶分母：','', '| 进阶 | 局数 | 实火/回血次数 | 实回HP | 去重后战/实死/活损中位 | 重打场/尝试/赢次 |','| --- | --- | --- | --- | --- | --- |']
for r,q in zip(R,SL):s.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {q["fights"]}/{q["attempts"]}/{q["wins"]} |')
s += ['', '- 低血路线比较：MGA0CZDDKC0P休息22→43后走廊损17活，D4LJ9QMGFB8Q低血事件后13血进走廊死；敌人/构筑/间隔不同，只有观察。KEN F5 16/70后绕精英，F11问号仍损6，但没有未走线的结果，不认改线实际更优的因果。',
 '- 同场SL：A10异鱼真正重打3场16试1赢，2Y27四试末胜，751/KEN各六败。KEN首/二/三/四/五/末为T12/T13/T15/T15/T13/T13截断或死；首五末HP5/4/8/7/3，恢复348，不补全程净损；末75→0。3/4/5/6试新换线点T7/T6/T10/T5，省6血少9伤/省6血少8伤/多6血多2伤/省2血延步法，第二试无新explore.deviation。原始sl-attempts、同指纹decisions与逐帧在本批KEN目录。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- DeepSeek时间窗0，无DS显式经验ID引文，不编造引用。实际Codex原话F1「前期补强并积攒金币，休息后挑战后段精英。」；F5后已经改无精英线，不能把初计划未执行当经验错误。21职责记录、18请求与17实际回答不是同一分母。完整原话在KEN/journal-quotes.json。',
 '- F7原话引用（原文）：“Footwork strengthens seven block cards, supports future poison scaling, and offers lasting defensive value.”（译意：步法改善七张挡牌、支持未来毒成长。）末试确实直到T9才建立，T8防御仍5；计划毒雾/毒药/触媒未取得，不能把“未来”当已有。无显式证据说明大脑误引具体旧条目，能力未兑现与构筑缺组件分开。',
 '- F16原话引用（原文）：“Recover 29 HP and gain maximum health before the boss; this survival buffer outweighs Haze’s small, uncertain simulated win-rate advantage.”真实46/81→75/86兑现29，末仍败，缺另一锻造整战对照，不能据败否定休息。早一次rest/plan因模型容量过载没有答案，accepted=false且usage=0，保留18原始请求和17实答差异。',
 '- 本局开始前0019/0079/0021已有S1.exp76（19:10）上线史；后续提案曾把折叠status改proposed，不把它倒认未学。S1.exp79晚于本局终局，不倒算本局使用.25/.26。第4/5试T10原答同方案，代码SL覆写引出实际新增6血/2伤；T5相反省血/延能力只反驳固定单向偏好。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for eid in C['updated']+C['added']:
 if eid in ['silent-route-hp-observation','silent-rest-buffer-observation','silent-fysh-resource-sl-observation']:continue
 e=E[eid];text=e['lesson'];reason=text.split('机制：',1)[1].split('决定胜负的战斗：',1)[0] if '机制：' in text else '观察，整战因果未控';case=text.split('典型案例：',1)[1];s.append(f'| {e.get("name",eid)} | {reason} | {e["n_support"]}/{e["n_contradict"]}；{H[eid]["asc_support"]} | {case} | {eid} |')
s += ['', '- 公式支持局不等全部子公式同一分母。仪式43局/154存活对齐轮支持力量增量=仪式量+临时降力恢复，9轮恢复分别为尖啸6/12、镣铐9、镣铐药7；两死亡截断力量不再长，不当反例。综合条目101支持中41局支持仪式子项；另两已核仅保留背景。典型8R5CXD5C8PW8雕刻师T4力14→23仍每轮+9；KEN钙化T2→3力0→2。完整筛选/初始11异常/最终解释在ritual-*.json。',
 '- 32局38饮速度药中35轮净撤5，53FL F15同轮步法+2、G403 F28口红+1、DPY F27预判另撤2解释其余3轮；速度层38次均消失，不把别源变化当反例或恒定+5。折扇余像叠加只有旧A4一局，KEN仅新增基本第三攻击4挡支持。',
 '- 专用提案CLI：'+','.join(P)+'；source_task=experience-update、target_task=strategy-proposal，分别核机制公式、SL双向血价与能力时点、跨战耗药资源；domains combat/potion/sl。只pending，未implemented/shipped。',
 '', '### 新增','', '- silent-speed-potion-temporary-dexterity：potion:SPEED_POTION，速度药水，[0,20]，32支持/0反例、high；普通临时5敏/期限及脆弱兑现分源。基本用法账本0253与旧0091脆弱组合独立，前者prior=yes、后者unknown保持。',
 '', '### 更新','', '| 条目 | 支持局数 | 字符改前→后 | 新证据 |','| --- | --- | --- | --- |']
for x in C['entries']:
 if x['before'] is not None:s.append(f'| {x["id"]} | {x["before"]["n_support"]}→{x["after"]["n_support"]} | {len(x["before"]["lesson"])}→{len(x["after"]["lesson"])} | KEN58SH9SLZ6 |')
s += ['', '- 10条均补本局证据、0只改数字；旧支持/反例集合保留。折扇原规则4支持且无反例，med→high；新增速度high，其余分档不变。折扇较长逐局叙述压短，其余更新典型案例/去重复，未退役或合并独立条目。',
 '', '### 退役','', '- 无。本任务不修源码机制，经验保留已观察事实；没有将整战死亡误作机制反例。',
 '', '### 和手写知识及代码冲突','',
 '- 本角色其余八份知识全部核哈希/元数据（other-knowledge.json）。七生成表保留异步切点和口径：room-costs止04:49:44Z/93局、MAP净损；monster-records止05:17:55Z/1383房；boss-damage按轮初及显示威胁，与首末战后净损不同，不覆盖成不等口径值。outcome-stats具有较新切点也保留其选择结局口径，模型可信度不由同场六败改系数。double-boss仅旧四个F49证据，KEN F17不更新。无手写知识需改删，其他角色未读未改。',
 '- 本树agent/src/reflex/card-model.ts:1047已读取步法动态敏捷，:1221速度药仍注STS1估计，现32局实盘支持已见5/期限；注释来源与数据已核事实分开，交独立机制提案核代码等价，不在本任务改源码手写知识。agent/src/sl/explore.ts:1507—1508更差未试线回退符合现规则，非纯bug；同指纹实际血价已保留，缺整战反事实不直接收窄阈值。',
 '', '### 代码问题（不给 DS）','',
 '- 本复盘无新纯bug；旧0250为其他局SL指标工具问题，未改状态或加入经验。未修改源码/生成器/依赖/运维prompt，不读游戏二进制、不运行play、不推送。',
 '- 离线查询初次用错sim路径、验证初稿误取顶层potions及旧combat/choose标签；均已按真实run.potions与combat/plan-choice修正，verify-first/second.log保留，不当游戏bug或代码自测失败。速度首次completed-only及初始仪式异常数据保留；最终覆盖排队动作检查并区分临时恢复/死亡截断。',
 '', '### 测试','',
 f'- 原入口bash tools/test-sandbox.sh（SANDBOX_WORKERS=1、固定排除/固定数据）：tsc {T["tsc"]}，vitest {T["vitest"]}，{T["files"]}文件/{T["cases"]}例，重跑{T.get("retries",0)}次。原日志/rc在test-source.log/rc。外部完整套件由调度器据实际合入另补，沙箱排除不冒称全套。',
 '- JSON/字段顺序/60k预算、12位局号/角色/支持反例数、旧七数组/血档/节点/回复/SL、548决策558帧/六次入口/两组同指纹代价/力量仪式/步法速度/毒/折扇/呼唤/冻结切片、diff --check/gitleaks及check-experience通过，missing=[]。',
 '- 附加诊断：正式测试暂未结束时，曾以CHARACTER=silent单跑experience.test.ts，导致固定铁甲切片的2断言失败（1文件/10例中8通过）；恢复默认配置后10/10、exit0。test-experience-diagnostic/fixture日志与rc保留，这是诊断配置不匹配，不当本次静默数据失败；正式入口配置未改、未重复整套。',
 '- 学习账本仅CLI：新增'+','.join(L['added'])+'；proposed '+','.join(L['proposed'])+f'；退役无；check {L["check"]}。首证/先验/claim/旧support/repeat/version/全部历史保留，未accepted/shipped。',
 f'- live实际合入：{M.get("merged")}；刷新提交：{M.get("refresh")}；刷新后/合前：{M.get("before")}；合后沙箱：{M.get("after_test")}；知识重叠：{M.get("knowledge_overlap",[])}；结果：{M.get("reason") or "待合入"}。']
for c in M.get('precheck_conflicts',[]):s.append('- '+c)
if not M.get('merged'):s.append('- 未实际合入，无新eval版本/上线记录/双通知，不冒标shipped。任务要求冲突停止，源提交/刷新/失败/初稿均保留，完成事件交运维兜底；根目录本节只追加，交调用方提交。')
s += ['', '### 切片大小','', '- 固定种子20260929，从截至本切点state.run.character_id=SILENT的原始状态抽最高A9/A10各20×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对。CHARACTER=silent调用官方knowledge-slice.ts，common与其他静默知识冻结，池/样本/时刻在sample-manifest.json。不是V4整份前缀。抽池加入新局，所以A10商店样本与上节略不同，比较只用本批同一240状态。',
 '', '| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
b=json.load(open(O/'slice-before.json'));a=json.load(open(O/'slice-after.json'));before=[v for r in b for v in r['sizes']];after=[v for r in a for v in r['sizes']];delta=[y-x for x,y in zip(before,after)]
for x,y in zip(b,a):s.append(f'| {x["sample"].removeprefix("sample-")} | {x["median"]}/{x["max"]} | {y["median"]}/{y["max"]} | {statistics.median([v-u for u,v in zip(x["sizes"],y["sizes"])])} |')
s += ['',f'- 整体中位{statistics.median(before)}→{statistics.median(after)}（{statistics.median(after)-statistics.median(before):+g}字），配对增量中位{statistics.median(delta)}、最大增量{max(delta)}；最大{max(before)}→{max(after)}。active154→155、正文48612→48539，高84/中45/低26；A8适用147条45345字、A9适用148条45629字、A10适用151条46738字。新增并更新后总字符减少73，未改预算。需要Roy定的知识事项：无。']
text='\n'.join(s)+'\n';(O/'changelog-section.md').write_text(text);(O/'report.md').write_text(text);(O/'changelog-title.txt').write_text(title+'\n')
result=dict(task='experience-update',version='2026-10-07.27',commit=commit,merged=M.get('merged'),added=1,updated=10,retired=0,active=155,mechanisms=['步法逐牌敏捷','力量与仪式分源','速度药水临时敏捷','折扇第三攻击被动挡','迷雾施毒与虚弱','带毒刺击双组件','呼唤持牌生命代价','能力实际兑现观察'],tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=L,code_proposals=P,implementation_domains=['combat','potion','sl'],report=str((O/'report.md').resolve()))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(title)
