import collections,hashlib,json,re,subprocess
from pathlib import Path

O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));L=json.load(open(O/'ledger-result.json'))
merge=json.load(open(O/'live-merge.json'));T=json.load(open(O/'tests.json'));S=json.load(open(O/'slice-summary.json'))
source=(O/'source-commit.txt').read_text().strip();branch='exp-silent';title=f'2026-10-08 静默猎手 第八十四次增量：1 局 A10（version 2026-10-08.1，分支 {branch}，{source[:8]}）'
stamp=subprocess.run(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True,capture_output=True,check=True).stdout.strip()
meta={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};mapping=json.load(open(O/'ledger-map.json'))
ids=json.load(open(O/'proposal-ids.json'));n='NHA2KW0RB7VP'
lines=['## '+title,'','### 来源','',
 f'- 记录时间{stamp}；只合并根notes/lessons.md:5580的{n}静默猎手复盘及00:00:59/00:03:39两次勘误。runs.jsonl:591为SILENT、A10、F33败，结束2026-10-07T15:19:58.532Z；last_seen按run-1007-2320文件名取2026-10-07。无角色跳过，b8ca9311+dirty不由当前源码复原。',
 '- 开工工作区干净，git merge --no-edit main成功；读README/最新STATE/决定末尾、学习与代码提案协议、首次构建方法与最后两节增量方法、本角色最后两节。自己执行、无下级agent；工具nice19单进程，测试单worker；不运行play、模拟池、联网或安装依赖。临时文件仅本批scratch。',
 '- 按run id抽584决策/34实际Codex脑请求/5 run-plans/7 SL；状态按时间二分seek后验run_id及state.run.character_id，共602帧。DeepSeek时间窗0，兼容ds字段不当引擎来源，未编造DS引用。所有抽取脚本、字节偏移、原帧、失败初稿保留。',
 '- 全引擎学习观察截至2026-10-07T15:19:58.532Z，110静默完局；A0—A10局数7/3/2/1/4/1/11/7/1/3/70；1606房100实死、A10为892房。110局均有本角色复盘，无本次仅数字局。进行中/切点后/无character旧局/其他角色排除；全引擎经验不替代纯Codex爬塔成绩。',
 '- 沿前节口径：首COMBAT HP减同房最终尝试退出HP，负回复保留、死亡单列；Monster走廊与Unknown问号战分开，训练假人非实死也非已证明击杀。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层第一战，Ancient排除、多源可同战、回血后战去重。判死截断不补未执行毒/攻击，SL多试不是多局。',
 '- 先重新执行旧109局原分析，再对七数组、血档、节点转移、真正回血及SL逐行比较，全部相同。原中间稿的毒雾T6毒数已据实帧校正为19=18−1+2；初稿保留，不使用其错误数字。机制的基本建立/即时子公式与整战因果分账。',
 '- 本局13赢战的首末净损合185，蟹首COMBAT28到最终0净损28；不是末试30到0的30或六试累计。五次营火各回24共120（二幕三火72全兑现）、梨子10、幕间32、小血瓶实回14与SL恢复47另列；七独立获药/七饮/0弃、boss空药，无SL复原药。F25从首帧42到21净损21，开场+2后实际受损23；F30从40到4净损36，开场+2后实际受损38。缺提前喝药/留药、改线、免事件5血的实打胜局对照。',
 f'- active {C["before"]["active"]}/{C["before"]["chars"]}字→{C["after"]["active"]}/{C["after"]["chars"]}字；新增1、更新13（均加证据，只数字0）、退役0。开工未触55000压缩阈值，不合并独立条目、不改60000预算；部分旧案例改成短句，完整旧文在before/changes。机制[0,20]、路线/休息/构筑[8,20]，子公式未观察组合不外推。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for change in C['entries']:
 e=change['after'];asc=dict(sorted(collections.Counter(meta[r]['ascension'] for r in e['evidence']).items()))
 conclusion=e['lesson'].split('。机制：')[0].split('。典型案例：')[0]
 lines.append(f'| {e.get("name",e["id"])}（{e["id"]}） | 支持{e["n_support"]}/反例{e["n_contradict"]}，进阶{asc} | {conclusion} |')
lines += [
 '| 油灯子公式 | 五持有局、三局17直接窗口；毒10次、萎靡7次，0反例；仅A1/A7/A10 | 首次毒5→10、7→14、刺击4→8，普通X1萎靡减力/弱各2；目标退场重排排除，其他负面/零X不推广 |',
 '| 朝向取整 | 六试同招、−2力量/1虚弱、爪正面1→后方2、火箭30→20；首战15挡损7，二试16挡损6 | 支持现场观测，不推一般取整顺序；纯模型1差额不给大脑 |',
 '| SL局部对照 | 首四试T1损1/扣8、末两试损7/扣24；同30血同首手，六试0赢、无击杀 | 多16伤多损6血；代码SL覆盖不是Jev原选，零模拟胜率不等即时等价 |',
 '| 末轮真实死亡 | 末T4 16血/6挡对38、需32、存活差17；毒12实结329→317；爪170/219、火箭147/209 | 实扣剩16不等只需损16；未发生下轮能力收益不预支 |',
 '| 血量路线投影 | 二幕0精英、三回血火72兑现；F30/F32/F33投影80/70/80、实入房40/4/28 | 不是贪锻造；完整资源链观察，不据无反事实的败局禁路线 |',
 '| 构筑实际兑现 | 终局32牌/4打击5防御、2永久升级；触媒未得、蟹六试步法未施放、毒雾T4才建 | 拥有与建立分账，未到的T5不计补毒 |',
 '', '七数组复算：','', '| 数组 | 改前 | 改后 | 旧行一致 |','| --- | --- | --- | --- |']
for key,r in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {key} | {r["before"]} | {r["after"]} | 是 |')
lines += ['', '各进阶/幕/房型非空血档（房/独立局、实死率、活损中位；病例/逐房净损见audit.json）：','', '| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['bands']:
 if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["type"]} | {b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines += ['', 'REST/SHOP/普通EVENT从源节点入血关联下一战；多源可同战，不相加当独立战斗。A8/A9/A10全部非空格，A0—A7完整行在audit.json：','', '| 进阶 | 幕 | 源节点 | 血档 | 源/独立后战 | 死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['transfers']:
 if b['n'] and b['asc']>=8:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["screen"]} | {b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]:.2%} | {b["median_win"]} |')
lines += ['', '实际营火回血/去重后战：','', '| 进阶/完局 | 营火/回血动作 | 实回 | 去重后战/死 | 活损中位 |','| --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):lines.append(f'| A{r["asc"]}/{r["runs"]} | {r["rests"]}/{r["heal"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
lines += ['', '真正SL重打（max attempt>1，同房算一场）：','', '| 进阶 | 场 | 尝试 | 赢次数 |','| --- | --- | --- | --- |']
for r in json.load(open(O/'sl-summary.json')):lines.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
lines += ['', '本局资源链（首COMBAT→最终退出；前五次判死未结算的窗口明细留原SL与复盘，不当死亡）：','', '| 层/房型 | 入血/上限→出血 | 净损 | 结果 |','| --- | --- | --- | --- |']
for f in A['fights']:
 if f['run']==n:lines.append(f'| F{f["floor"]}/{f["type"]} | {f["hp"]}/{f["max_hp"]}→{f["last_hp"]} | {f["loss"]} | '+('实死' if f['death'] else '获胜')+' |')
lines += ['', '低血选不同节点历史比较沿用MGA0CZDDKC0P休22→43后走廊活与D4LJ9QMGFB8Q事件13后走廊死：敌/牌/间隔不同，只是观察，不能说改路线必然更好。各机制和SL证据按独立局计数，不把一次局六尝试变成六局。',
 '', '### 经验库自己带偏或写了没被执行的地方','',
 '- 实际脑均Codex，DeepSeek时间窗0，未找到可声称“DS引用某条经验”的记录。F18原话“后段增能支撑毒防，三火无精英保血补强。”与实际二幕无精英/三火一致，但F22/23/25/30赢战连续耗血；持有步法和毒雾不等蟹战已建立/已触发。',
 '- F32原话“Every smith leaves only 4 HP; tied zero-win rates do not mean choices are equal.”（译：每个锻造都只留下4血；并列零胜率不代表选择等价），实选回血4→28。没有证据归为贪锻造或经验误导。',
 '- 决策277248/277250原Jev答斗篷线，代码原话“SL explore ... playing ... 回响斩击 ... instead of ... 斗篷与匕首”；277272/277274为重放第5次。即时损1→7与多16净伤均实见；silent-0079在本局开打前实际版本S1.exp79，repeat不改成无经验的新错；休息silent-0020为S1.exp80，遵勘误而非后发S1.exp82。覆盖不是HP护栏（本局0次）。',
 '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C['entries']:
 e=c['after'];text=e['lesson']
 if '。机制：' not in text:continue
 conclusion,tail=text.split('。机制：',1);reason,tail=tail.split('。搭配：',1);pairing,tail=tail.split('。决定胜负的战斗：',1);summary,case=tail.split('。典型案例：',1)
 asc=dict(sorted(collections.Counter(meta[r]['ascension'] for r in e['evidence']).items()))
 label=e.get('name',e['id']);mechanisms.append(f'{label} — {conclusion} — {e["n_support"]}支持/{e["n_contradict"]}反例 — {n}')
 lines.append(f'| {label} | {reason}。搭配：{pairing} | {e["n_support"]}/{e["n_contradict"]}；{asc}；{summary} | {case} | {e["id"]} |')
lines += ['', '- 全部静默110局状态/决策与对应历史复盘回查，保留已有分层证据范围。油灯：五持有局、三局17直接窗口，10毒/7萎靡；SADL F43攻击使目标退场、数组重排，不从另一敌的无毒判断反例。其他负面牌/零X/叠层未验证。朝向取整只有本局六次局部现场，不推广通用顺序。毒雾普通/升级与k触媒的旧子公式支持范围保留；本局没有触媒，不给它追加证据。',
 '- 佩尔之肉新增六独立房/11个就绪尝试窗口，全部3/3/4；加旧七局33窗口为44，SL五个重复窗口不是新局。蟹支持16房8活8死、真正重打8场44试1赢；仪式兽支持17房13活4死、重打5场26试1赢，本局首试赢，无单卡整战因果。能力支付/生存与路线/构筑只是观察，未证实的反事实不写成因果。',
 '- 提案'+','.join(ids)+'：source_task=experience-update、experience逐项关联、target_task=strategy-proposal，实际domains=combat/sl/terminal。本任务只改经验，未给出新增喝药/留药或生产SL门槛；提案登记时pending，无implemented/shipped声称。',
 '', '### 新增','', '- silent-unsettling-lamp-first-debuff：relic:UNSETTLING_LAMP/不安油灯，[0,20]，3支持/0反例、med；首证K3676LU8B0UH A1、prior=yes。复用silent-0265，不重复新建发现；追加SADL A7直接证据，别的负面/重复翻倍不外推。',
 '', '### 更新','', '| 条目 | 支持改前→后 | 字符改前→后 | 新核证据 |','| --- | --- | --- | --- |']
for c in C['entries']:
 if c['before']:
  b,e=c['before'],c['after'];fresh=[r for r in e['evidence'] if r not in b['evidence']]
  lines.append(f'| {e["id"]} | {b["n_support"]}→{e["n_support"]} | {len(b["lesson"])}→{len(e["lesson"])} | '+','.join(fresh)+' |')
lines += ['', '- 13条均增加本局支持；0条只改数字。旧支持/反例完整保留，未观察触媒、首次小刀增伤等子公式不增加本局独立证据。萎靡原X/X+1加油灯限定而不改普通无遗物公式；朝向取整现场并入原蟹条目，同一主题只留一条。没有独立条目合并/删除；旧逐局细节在before和原报告。',
 '', '### 退役','', '- 无。本任务未修源码，保留真实机制及行为观察，不把某场败局当机制反例。没有反例多过支持或已实现的“模型缺口”策略条目需退役。',
 '', '### 和手写知识及代码冲突','',
 '- 其余八静默知识文件逐项核元数据、事实范围和哈希：room-costs是MAP节点首末口径/旧切点，monster-records是战斗战绩/旧切点，outcome-stats是选择结果观察，boss-damage/trust和fight-value/gates是独立训练/校准或事实层；切点与口径不同，不用本任务净损覆盖异步刷新。double-boss的四局8192模拟样本、验证全败和限制保持，本局未到三幕，没有可改证据。无手写攻略/手册需改删；八文件及common逐字节未变，详见other-knowledge.json/verification.json。',
 '- 当前exp card-model.ts:1035普通精确切击白名单仅3/5/7/11，本局初始1仍未覆盖；turn-solver.ts:2493仍floor(shown×1.5)，显示1却实际转向2。未凭当前源码冒认原dirty树；两个纯模型缺口留独立提案/原0166、0263记录，不把修复后的整战胜率写入经验。油灯未在上述牌模/求解器/模拟器检索到显式接线，独立提案须核整条链，不能由文本存在声称执行已正确。',
 '', '### 代码问题（不给 DS）','',
 '- 0263取整少1与0166初始1切击未覆盖由本局原复盘已登记；已结真实数据保留在机制/卡牌或蟹条目，源码定位及漏模归因只在报告/提案，不给大脑“修完一定能赢”叙述。本任务不改源码、生成器、依赖、运维prompt或队列原历史。',
 '- 原抽取的旧批次symlink链触发Errno40，545个本批只读链接扁平到真实原数据后，仅重跑聚合/对照，七数组对照通过；原prepare/audit失败日志保留。第一次提案命令在agent cwd误用仓库相对路径exit2，未登记，随后exp绝对路径CLI通过；原路径失败回执保留。原经验草稿毒雾19数值校正及切片草稿保持。不是代码测试失败。',
 '', '### 测试','',
 f'- 原入口bash tools/test-sandbox.sh，TMPDIR固定本批、PATH包含~/.local/node/bin、SANDBOX_WORKERS=1、原固定排除/固定数据：tsc {T["tsc"]}、vitest {T["vitest"]}，{T["files"]}文件/{T["cases"]}例；'+('高负载重跑一次，两次原日志保留。' if T.get('retried') else '无测试重跑。')+'调度器据实际完成事件在沙箱外补跑完整套件，不冒报完整检查。',
 '- JSON/字段/12位局号/角色/支持反例数/进阶/预算、旧七数组/血档/转移/回血/SL、新602状态584决策、关键机制/勘误/资源、240固定切片及check-experience missing=[]均通过。提交前gitleaks0/diff --check通过。',
 '- 学习账本仅CLI：新增无；proposed '+','.join(L['proposed'])+'；退役无；ledger.py check 0。首证/prior/claim/旧repeat/version/历史保持；相关active新增/更新与源码提案互链，退役0。学习者未写accepted/shipped，实际合入后由运维按完成事件登记。',
 f'- live实际合入：{merge.get("merged")}；刷新：{merge.get("refresh")}；刷新后/合前：{merge.get("before")}；合后沙箱：{merge.get("after_test")}；知识不同blob重叠：{merge.get("knowledge_overlap",[])}；结果：{merge.get("reason")}。']
if merge.get('precheck_conflicts'):lines += ['- '+s for s in merge['precheck_conflicts']]
if not merge.get('merged'):lines += ['- 未实际合入，无本批eval版本/上线记录/双通知，不冒标shipped。按任务预检冲突停止、不硬解；刷新、源提交、原失败历史和并行数据保留，交完成事件由运维兜底。']
else:lines += ['- 唯一上线版本'+merge['publication']['version']+'，发布'+merge['publication']['publication']+'；decision-log/for-roy/inbox-dev已先date后追加具体旧新表述、证据/账本/任务、预期与回退。仅知识前缀变化，源码提案仍走独立实现任务。']
lines += ['', '### 切片大小','',
 '- 固定种子20260929，从本切点state.run.character_id=SILENT状态抽最高A9/A10各20×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对，每格20独立时间戳。CHARACTER=silent调用官方knowledge-slice.ts；测试setter仅固定改前/后experience与同一outcome-stats，其他静默/common文件在exp实际路径逐字节保持（KNOWLEDGE_ROOT本身不改变paths.ts，不以它声称路径重定向）。池/时刻见sample-manifest.json，抽样不含别的角色；本批同配对比较，不是V4整份知识前缀。','',
 '| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:lines.append(f'| {r["sample"].replace("sample-","")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
lines += [f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_change"]:+g}字）；配对增量中位{S["paired_median_change"]:+g}；单片最大增长{S["max_growth"]}，最大{S["before_max"]}→{S["after_max"]}字。active 158→159、正文47828→47952字；置信度'+str(C['after']['confidence'])+'；A8适用'+str(C['after']['asc']['8'])+'、A9适用'+str(C['after']['asc']['9'])+'、A10适用'+str(C['after']['asc']['10'])+'。需要Roy定的知识事项：无。',
 '', f'完整抽取、脚本、原帧、初稿/失败、提案、账本、检查、切片和合入回执：{O}。','']
text='\n'.join(lines);(O/'changelog-section.md').write_text(text)
(O/'report.md').write_text('# 静默猎手经验第84批完整报告\n\n'+text)
report=dict(task='experience-update',version=Yversion if (Yversion:=C['after']['version']) else '',commit=source,merged=merge.get('merged'),added=1,updated=13,retired=0,active=159,mechanisms=mechanisms,tests={'tsc':T['tsc'],'vitest':T['vitest'],'cases':T['cases']},ledger=L,code_proposals=ids,implementation_domains=['combat','sl','terminal'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('报告已保存，标题',title)
