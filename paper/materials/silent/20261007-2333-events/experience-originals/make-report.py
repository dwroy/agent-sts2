import collections,json,re,statistics,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));H=json.load(open(O/'historical-facts.json'));RR=json.load(open(O/'rest-summary.json'));SL=json.load(open(O/'sl-summary.json'));R=json.load(open(O/'run-metadata.json'));M=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else {'merged':None,'reason':'待合入'}
commit=sys.argv[1];stamp=sys.argv[2];title=f'## 2026-10-07 静默猎手 第八十二次增量：2 局 A10（version 2026-10-07.28，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
result=[]
def put(s=''):result.append(s)
def table(headers,rows):
 put('| '+' | '.join(headers)+' |');put('| '+' | '.join(['---']*len(headers))+' |')
 for row in rows:put('| '+' | '.join(str(v).replace('|','／').replace('\n',' ') for v in row)+' |')
 put()
def tests(path):
 text=path.read_text();fs=[int(n) for n in re.findall(r'Test Files\s+(\d+) passed',text)];cs=[int(n) for n in re.findall(r'Tests\s+(\d+) passed',text)];rc=int(path.with_suffix('.rc').read_text());return dict(tsc=0 if ' RUN  ' in text else rc,vitest=rc,files=sum(fs),cases=sum(cs))
log=O/('test-source-final.log' if (O/'test-source-final.rc').exists() else 'test-source.log');TEST=tests(log);(O/'test-result.json').write_text(json.dumps(TEST)+'\n')
B=json.load(open(O/'slice-before.json'));Z=json.load(open(O/'slice-after.json'));bd={r['sample']:r for r in B};zz={r['sample']:r for r in Z};bs=[s for r in B for s in r['sizes']];zs=[s for r in Z for s in r['sizes']];deltas=[z-b for k in bd for b,z in zip(bd[k]['sizes'],zz[k]['sizes'])];SIZES=dict(before_median=statistics.median(bs),after_median=statistics.median(zs),median_delta=statistics.median(zs)-statistics.median(bs),paired_median=statistics.median(deltas),paired_max=max(deltas),before_max=max(bs),after_max=max(zs));(O/'slice-summary.json').write_text(json.dumps(SIZES)+'\n')
put(title);put();put('### 来源');put();put(f'- 记录时间{stamp}。只合并TXZ6RVMQA09D与WQZVENQ7DTRP静默猎手A10复盘及WQ死亡先后/时间勘误（根notes/lessons.md:5534、5540）。runs.jsonl确认均SILENT，F49/F33败、code=f17e15ca+dirty／31914e4b+dirty；结束13:14:06.991Z／13:55:26.934Z，last_seen取run-1007-2114/2155文件名。无角色跳过，dirty树不复原。')
put('- 开工工作区干净，git merge --no-edit main成功；读README/最新STATE/决定末尾/学习和代码提案协议、铁甲首次构建方法及最近两节方法、本角色最后两次增量。自己执行、无下级agent；所有临时文件仅本批scratch，数据/工具nice19单进程，不跑boss模拟池。')
put('- 按局号抽762/766决策、46/31脑请求、6/9 SL、9/4 run-plans；状态按时间二分seek后验run_id与state.run.character_id，共840/798帧。DeepSeek各时间窗0，实际脑均Codex；兼容ds_*字段不当引擎来源，未编造DS引用。偏移/原片段与失败初稿保留。')
put(f'- 全引擎学习观察截至{A["cutoff"]}，107完局，A0—A10局数'+ '/'.join(str(sum(r['ascension']==a for r in R)) for a in range(11))+f'；{len(A["fights"])}房{sum(r["death"] for r in A["fights"])}实死，A10 {sum(r["asc"]==10 for r in A["fights"])}房。107局均有本角色复盘，无本次仅数字局；其他角色/无character旧局/进行中/切点后排除，全引擎证据不代纯Codex爬塔成绩。')
put('- 沿前节口径：首COMBAT HP减同房最终尝试退出HP，负回复保留、实死单列；训练假人非死亡也非已证实击杀胜利。Monster走廊与Unknown问号战分开；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血档关联下一更高层第一战，Ancient排除、多源可同战、回血后战去重；判死截断不补尚存毒/攻击，SL多试不是多局。F49无出牌战斗仍以状态计入，未沿自动death_fight错误归因。')
put('- 旧105局逐局重算，七数组、血档/节点转移/回血与真正SL逐行一致，baseline-check.json保留；无口径差异。统计旧值不因本局死亡重新定义。')
put(f'- 开工{C["before"]["active"]} active/{C["before"]["chars"]}字<55000；新增1、更新19（加证据19、只数字0）、退役0；定稿{C["after"]["active"]} active/{C["after"]["chars"]}字。短写旧逐局案例、保留公式和边界；不合并独立条目、不改预算，旧全文在before/changes。机制[0,20]，路线/休息/构筑[8,20]，A7/A9/A10狡诈药观察的容量分支仅A10，不外推未观察组合。')
put('- TXZ五次营火回血102、事件休21/茶49、幕间24/40、五轮书实际3/16与SL93分账；14独立获药、16饮、0弃、SL复原2瓶另列。F48原房入口60到最终4净差56，不与末次56到4的52或多试累计混记；F49开场4到0，敌未攻击。WQ四火实际93、两餐券30、梨子10、幕间27与SL234分账；9独立获药24饮0弃，15复原药另列；F25赢损64、F28赢损21、F30赢损17共同接到56/80 boss入口。缺提前用药/留药/改线完整胜对照。')
put();put('### 对照数据检查的主题');put()
rows=[]
for c in C['entries']:
 e=c['after'];h=H[e['id']];data=f'支持{e["n_support"]}/反例{e["n_contradict"]}；各阶{h["asc_support"]}'
 if e['id']=='silent-cunning-potion-shiv-capacity':data+='；9局42饮，37次添3/2次添2/3次添0，新增刀均升级/基础6，容量不足仅WQ'
 rows.append([e.get('name',e['id'])+'（'+e['id']+'）',data,e['lesson'].split('。机制：')[0].split('。典型案例：')[0]])
rows += [['旧基线','七数组/血档/节点/真实回复/SL逐行一致','先对旧105局再加两局，无差异'],['无动作死亡与连战','TXZ F48末试won、F49无COMBAT决策4→0、敌111/111；未执行22攻击','首胜不是通关，自动报告bug0254不给大脑'],['沙虫死亡先后','末T11沙坑1/9HP/9挡/27攻/25毒；末81→56、HP9→0','18血价/缺9只是条件攻击计算，实际先致死来源未知'],['SL同指纹','WQ第2/3试T9指纹相同、实扣24/损13→39/22；末T7逃离同扣24、多4损、沙坑4→5','攻击/延时收益与血价都留，不据0模拟胜率认同安全'],['路线与回血','WQ投F25/28/30/33进场77/42.5/66.5/80，实80/31/34/56；营火封顶21不是文字24','敌遭遇/精英血价/餐券/上限/换线分列，未走线无因果'],['力量/药后临时','TXZ药后临时3力次轮撤、沙漏同未弱EBB力9→15与35→41','毒与力量分源，未观察实验体成长不当死因']]
table(['主题','数据','结论'],rows)
put('七数组复算：');put();table(['数组','改前','改后','旧行一致'],[[k,v['before'],v['after'],'是'] for k,v in json.load(open(O/'baseline-check.json')).items()])
put('A8/A9/A10非空战房血档（房/独立局、实死、活损中位）；A0—A7每格旧值一致，完整行在audit.json：');put()
table(['进阶','幕','房型','血档','房/局','死/率','活损中位'],[[f'A{r["asc"]}',r['act'],r['type'],r['band'],f'{r["n"]}/{r["runs"]}',f'{r["deaths"]}/{r["deaths"]/r["n"]:.2%}',r['median_win']] for r in A['bands'] if r['asc']>=8 and r['n']])
put('A10源节点入血档到下一实战，多源可同战，其他进阶完整行在audit.json/transfers：');put()
table(['幕','源房','血档','节点/不同战','死/率','活损中位'],[[r['act'],r['screen'],r['band'],f'{r["n"]}/{r["unique_fights"]}',f'{r["deaths"]}/{r["deaths"]/r["n"]:.2%}',r['median_win']] for r in A['transfers'] if r['asc']==10 and r['n']])
put('营火/真正SL逐阶分母：');put()
table(['进阶','局','火/回血次数','实回HP','去重后战/实死/活损中位','重打场/尝试/赢次'],[[f'A{r["asc"]}',r['runs'],f'{r["rests"]}/{r["heal"]}',sum(r['gains']),f'{r["nexts"]}/{r["deaths"]}/{r["median"]}',f'{sl["fights"]}/{sl["attempts"]}/{sl["wins"]}'] for r,sl in zip(RR,SL)])
put('- 营火按节点、回血/非回血按动作；帐篷可同火兼做，不能把动作数直接相加。活损中位不把训练假人称已证实击杀胜利。')
put('- 低血不同路线仍是观察：MGA0CZDDKC0P休22→43后走廊损17活，D4LJ9QMGFB8Q事件13后走廊死，敌/牌/间隔不同；WQ原路线有必经精英，回血/后来精英不能记作新错误，无另一整条实打线。训练假人未击杀不塞SL won。')
put('- 本次重打两场9试1首boss胜，连战最终0赢；TXZ两次判死、第三次T6少3血/少9伤后T10赢，但后轮也变，F49未重打。WQ五次判死/末实死、六试0赢；第二试无新换线、后四试有explore，不编造第五换线。历史沙漏真正重打12场57试3赢、沙虫11场44试6赢；胜次后抽/动作也变，不能归单步或运气，原始sl-attempts在各run目录。')
put();put('### 经验库自己带偏或写了没被执行的地方');put()
put('- DeepSeek实际0，实际大脑Codex，未见显式经验ID引用，不能称DS引用导致失败。TXZ F1原话“四火保血，两次精英前均可休整，早店补伤害”；F48复审原话译意“王室猛毒使4血下下一战入口致死，若五轮书临界应查有用奖励回血”，实际空奖励无恢复，系统已认风险，不登记漏认連战repeat。')
put('- WQ F18原话“额外抽牌稳定启动，单精英三火三店补强防御”；F32原理由译意“沙虫需时间施毒、铺防御与逃离，单次升级不抵24即时血”。实际步法已兑现，计划触媒/蜃景/余像没有取得，不把计划当增益。无反事实不能因最终败认休息选择错误。')
put('- WQ T9两次Jev原答均侧步+逃离+防御，第三试代码原话“the best untried line ... rollout does not see dying more often”改成飞镖+侧步+逃离，实多损9、实多伤15；两线1200模拟胜0仍血价不同。滿手续喝的原题写“将?(数值未知)张小刀+...”“效果未模拟”；真实2/0/0与3/2/0及瓶消耗保留，不虚构提前饮用胜例。完整原话见journal-quotes.json、decisions.jsonl、jev-prompts.jsonl。')
put();put('### 机制推理');put()
mechanisms=[]
for c in C['entries']:
 e=c['after'];lesson=e['lesson']
 if '。机制：' not in lesson:continue
 mech=lesson.split('。机制：')[1].split('。搭配：')[0];pair=lesson.split('。搭配：')[1].split('。决定胜负的战斗：')[0];case=lesson.split('。典型案例：')[1];h=H[e['id']]
 mechanisms.append(dict(id=e['id'],name=e.get('name',e['id']),conclusion=lesson.split('。机制：')[0],n=e['n_support'],case=case,mechanism=mech,pairing=pair))
table(['机制','推理','证据（支持/反例局数、进阶）','典型案例','进了哪个条目'],[[m['name'],m['mechanism']+'。搭配：'+m['pairing'],f'{m["n"]}/{next(c["after"]["n_contradict"] for c in C["entries"] if c["id"]==m["id"])}；{H[m["id"]]["asc_support"]}',m['case'],m['id']] for m in mechanisms])
put('- 各子公式分母分别保存：王室无小血瓶4血仅新一局五场、组合2血旧一局两场；狡诈生成9局42饮，而容量不足仅本局末六饮；持牌/技能/牌挡/被动挡与全局胜因不能混为同一分母。未观察结算全序、未知回血/复活组合保持未知，未将整战失败当机制反例。')
put('- 专用提案CLI：'+','.join(json.load(open(O/'proposal-ids.json')))+'；source_task=experience-update、target_task=strategy-proposal、domains=combat/potion/sl/terminal，三份分别核狡诈容量、机制分源、连战/SL资源。只pending，不冒称implemented/shipped，实际规则变更留独立任务。')
put();put('### 新增');put()
for c in C['entries']:
 if c['before'] is None:
  e=c['after'];put(f'- {e["id"]}：{e["scope"]}，{e["name"]}，[0,20]，9支持/0反例、high。基本生成首证SADL/A7、prior=yes；0257满手分支首证WQ/A10/prior=unknown保持，0256纯模型bug仍observed。')
put();put('### 更新');put();table(['条目','支持局数','字符改前→后','新证据'],[[c['id'],f'{c["before"]["n_support"]}→{c["after"]["n_support"]}',f'{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}',','.join(n for n in c['after']['evidence'] if n not in c['before']['evidence'])] for c in C['entries'] if c['before']])
put('- 19条均补证据、0只改数字；旧支持/反例全部保留。王室1→2 low→med，新增狡诈high，其余置信度档不变。短写旧典型案例但保留公式、跨进阶/组合边界和原始历史，无独立条目合并。')
put();put('### 退役');put();put('- 无。本任务未修源码机制；已有模型与事实机制共存，未保留纯源码告警为active知识，也不把首战胜/后战死当毒/挡公式反例。')
put();put('### 和手写知识及代码冲突');put()
put('- 本角色其余八文件逐项核哈希/元数据（other-knowledge.json），无手写知识需改删。七生成表切点/口径不同：room-costs止04:49:44Z、93局且MAP净损；monster-records止05:17:55Z/1383房，boss-damage轮初/威胁不等本任务首末净损；outcome-stats较新切点仍早于两局结束，选择结局与战斗净损分开。不覆写异步刷新或按同盘六败改可信度。double-boss四训练局/未校准/样本外限制仍成立，TXZ新入口分支进入提案、缺新模拟训练不伪重建曲线。')
put('- 当前card-model.ts:1556—1558缺狡诈确定模型、combat-plan.ts:3159/3844提供未模拟饮用，保留复盘0256来源和本批提案；现有步法/毒雾/触媒/临时减力等先核实际实现等价，未在本任务改手写代码。SL全敗候选并非同安全，独立任务验收当轮血价/沙坑收益与后续窗口，不按未试或最长存活单排，也不凭单局拟合阈值。')
put();put('### 代码问题（不给 DS）');put()
put('- 新纯统计bug0254（TXZ无COMBAT决策开场死被漏、death_fight误归F48）留observed及原修复队列，不加入经验或改原日志；0256纯药水模型缺口仍observed，0257真实容量进入经验/提案。未改源码/生成器/依赖/运维prompt，其他角色未读为证据、未改。')
put('- 离线初稿把药栏index/动作option_index误用slot/potion_slot，已按真实schema改并保留初稿错误日志；另先验查询误滤engine/旧标签，最终用decider与combat/plan-choice+potion核同指纹。首次测试组合命令在agent目录误用根相对路径，数据预检未执行、原入口正常启动；补最终两boss累计SL分母后按定稿复测，两份日志保留，不把路径错误当代码测试失败。')
put();put('### 测试');put()
put(f'- 原入口bash tools/test-sandbox.sh、固定排除/固定数据：定稿tsc {TEST["tsc"]}，vitest {TEST["vitest"]}，{TEST["files"]}文件/{TEST["cases"]}例；日志{log.name}/rc。初轮日志保留；若初轮也通过，第二轮仅因随后补最终两个boss累计SL分母而复测，不称超时失败。外部完整套件由调度器据实际合入另补。')
put('- JSON/字段/60k预算、12位局号及角色/支持反例数、旧七数组/血档/节点/回复/SL、新1638状态1528决策、五开场/无动作死亡、9局42饮/升级基础6/满手消耗、同指纹血价、能力毒/分源挡/死亡勘误、固定切片、check-experience missing=[]、diff --check/gitleaks均通过。')
if (O/'ledger-result.json').exists():
 L=json.load(open(O/'ledger-result.json'));put('- 学习账本仅CLI：新增'+','.join(L['added'])+'；proposed '+','.join(L['proposed'])+'；退役无；check '+str(L['check'])+'。只追加来源/源提交/本节，首证/先验/claim/旧support/repeat/version与历史保持，未accepted/shipped。')
put(f'- live实际合入：{M.get("merged")}；刷新：{M.get("refresh")}；刷新后/合前：{M.get("before")}；合后沙箱：{M.get("after_test")}；知识重叠：{M.get("knowledge_overlap",[])}；结果：{M["reason"]}。')
for line in M.get('precheck_conflicts',[]):put('- '+line)
if not M.get('merged'):put('- 未实际合入，无新eval版本/上线记录/双通知，不冒标shipped。按任务冲突停止，完成事件交运维兜底，源提交/刷新/初稿/失败历史均保留；根本节只追加、交调用方提交。')
put();put('### 切片大小');put()
put('- 固定种子20260929，从截至本切点state.run.character_id=SILENT原始状态抽最高A9/A10各20×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对，CHARACTER=silent调用官方knowledge-slice.ts；common和其他静默知识冻结、池/样本/时刻见sample-manifest.json。不是V4整份前缀，加入新局抽池变化，比较只用本批配对。')
put();table(['进阶/界面','改前中位/最大（字）','改后中位/最大（字）','配对增量中位'],[[k.removeprefix('sample-'),f'{bd[k]["median"]}/{bd[k]["max"]}',f'{zz[k]["median"]}/{zz[k]["max"]}',statistics.median([z-b for b,z in zip(bd[k]['sizes'],zz[k]['sizes'])])] for k in bd])
put(f'- 整体中位{SIZES["before_median"]}→{SIZES["after_median"]}（{SIZES["median_delta"]:+}字），配对增量中位{SIZES["paired_median"]}、最大增量{SIZES["paired_max"]}；最大{SIZES["before_max"]}→{SIZES["after_max"]}字。active {C["before"]["active"]}→{C["after"]["active"]}、正文{C["before"]["chars"]}→{C["after"]["chars"]}；置信度{C["after"]["confidence"]}；A8适用{C["after"]["asc"]["8"]}、A9适用{C["after"]["asc"]["9"]}、A10适用{C["after"]["asc"]["10"]}。需要Dai定的知识事项：无。')
section='\n'.join(result)+'\n';(O/'changelog-section.md').write_text(section);(O/'mechanisms.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n');(O/'report.md').write_text(section)
print(title);print(TEST);print(SIZES)
