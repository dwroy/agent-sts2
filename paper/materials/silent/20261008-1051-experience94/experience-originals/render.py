import collections, fcntl, json, re, statistics, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve(); ROOT=Path('/home/dw/Projects/agent-sts2')
def read(name):return json.load(open(O/name))
source=(O/'source-commit.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
M=read('update-summary.json'); C=read('changes.json')['entries']; A=read('audit.json')
tests=read('test-summary.json'); merge=read('live-merge.json'); slices=read('slice-summary.json')
lids=read('ledger-ids.json'); pids=read('proposal-ids.json')
title=f'## 2026-10-08 静默猎手 第九十四次增量：1 局 A10（version 2026-10-08.11，分支 exp-silent，{source[:8]}）'
rows=[]
def add(s=''):rows.append(s)
def table(headers,data):
 add('| '+' | '.join(headers)+' |');add('| '+' | '.join('---' for h in headers)+' |')
 for r in data:add('| '+' | '.join(str(x).replace('|','／').replace('\n',' ') for x in r)+' |')
 add()
add(title);add();add('### 来源');add()
add(f'- 记录时间{stamp}；notes/lessons.md:5692起K2JAGKVJAWZJ，标题第二项静默猎手，按10:09:47勘误使用末组34牌/16升级；runs.jsonl:605确认SILENT/A10/F46失败，未跳过。唯一局报run-1008-0917-K2JAGKVJAWZJ.md。运行6fd495cc+dirty，完整dirty源码未留，当前树不冒認原源码。')
add('- exp开工干净，git merge --no-edit main无冲突快进8c548874；已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法及最后两节、账本README。独立完成，无下级agent。所有抽取/复算nice19单进程，固定测试单worker；临时文件仅本批scratch，不联网/安装依赖/play或boss模拟池。')
add('- 按run id重抽722决策、48条实际Codex脑日志/48调用（71次Codex决策含计划复用）、3 SL摘要、7计划及Jev原题；states按UTC窗二分seek并核run_id/character_id，814帧，DeepSeek推理0。首末决策2026-10-08T00:27:15.532Z—01:17:20.209Z；原帧、字节偏移、动作前后与原题保留。')
add('- 全引擎学习观察截至2026-10-08T01:17:20.209Z为124静默完局，A0—A10局数7/3/2/1/4/1/11/7/1/3/84；1804房、114实死。排除其他角色、缺character旧局、进行中和切点后局，不代替纯Codex爬塔成绩；其他局只用于本角色既有机制验证与分阶数字，不加入未指定新复盘。')
add('- 口径沿第93节：第一COMBAT入房HP减同房最终尝试退出HP；开场回复/负净损保留，实死单列。Monster走廊、Unknown问号战另列，训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除，多源可同战；回血后战去重。独立营火与动作数分列。')
add('- 旧123局七数组逐行、全部血档/节点转移/实回复/SL重算一致，无偏差。新局17房16胜1实死；蟹首试判死截断不记实际死亡，整房首次62→最终28净损34，SL恢复52血与原瓶不当新资源。')
add(f'- 新增1、更新15（15条加证据、0条只改数字）、退役0；active169→170，正文51016→{M["after"]["chars"]}，high102/med43/low25。开工未超55000，不改60000测试预算；同主题并回原条目，压短重复案例，旧全文/证据/反例保留before与changes。')
add();add('### 对照数据检查的主题');add()
ev={r['id']:r for r in M['evidence']}
table(['主题','数据','结论'],[(c['id'],f'支持{c["after"]["n_support"]}/反例{c["after"]["n_contradict"]}；分阶{ev[c["id"]]["by_asc"]}；新证'+','.join(c['new_runs']),c['after']['lesson']) for c in C]+[
 ('胜战与末战资源链','F31满75两药胜→40空药；F32+22；蟹首试最后10判死、第二试28胜且原瓶；F35/38/39损24/8/11至42；F42+27、F43−10、F44+27得86/91','实际已回血与赢战消耗分账；无前战少损、替路线或留药整战胜局，不归单因'),
 ('蟹SL同抽对照','两试同62血与原毒瓶，首29张顺序及归属回合完全相同；首T1施毒火箭、次改爪，之后目标/减力/暗影也变，T5洗牌断共同抽序','赢线T11余28且未喝毒；可确认同初抽改线获胜，不能只归首轮目标、未喝药或全部归运气'),
 ('三骑士后段威胁','初108/97/89合294；T1—4净损0/0/2/0；T5/T6损39/26；T8末毒杀魔法；末两敌43/84','前段零损、临时减力与高进场血不能代表后段减员；没有受控换focus胜线'),
 ('末轮完整损失','13血20挡、12×2+12合36；挡后两次穿透16，钨合金棍各少1需损14；实扣剩13归零，严格需再2血','hpAfter−1不是只损1；未执行末击全量不倒补，完整需损另用逐击算术'),
 ('蜃景与模型提示','首T1升级版0毒0敏耗1能、16挡不变；Jev0.11选择额外方案，原题标MIRAGE+未建模/lasting value 10；T6普通8毒+2敏加10挡','未来价值不是已得挡；单轮换牌整战未执行，不能说换那1能就胜；交独立提案核升级分支'),
 ('进阶','机制[0,20]；路线/休息/构筑仍[8,20]；旧三骑士仍[5,7]，A10两例仅背景，当前A10新事实同时并general:deck/plan；跨幕公式只核A9/A10','没有扩大低阶策略适用，未观察进阶保持边界；失败局也能支持条件化机制观察')])
add('旧基线七数组复算：');add()
table(['数组','旧','新','旧行一致'],[(k,v['before'],v['after'],'是') for k,v in read('baseline-check.json').items()])
add('各进阶/幕/房型非空血档（完整病例、局号与逐房净损保存在audit.json）：');add()
table(['进阶','幕','房型','血档','房/独立局','实死/率','活损中位'],[(f'A{r["asc"]}',r['act'],r['type'],r['band'],f'{r["n"]}/{r["runs"]}',f'{r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}%',r['median_win']) for r in A['bands'] if r['n']])
add('源节点按入血关联下一战（事件不含先古、不同节点可关联同一战；仅观察）：');add()
table(['进阶','幕','节点','血档','节点/去重后战','后战实死/率','后战活损中位'],[(f'A{r["asc"]}',r['act'],r['screen'],r['band'],f'{r["n"]}/{r["unique_fights"]}',f'{r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}%',r['median_win']) for r in A['transfers'] if r['n']])
add('低血改路对照是不同实盘场景，HP/构筑/事件/敌种同时不同，没有随机分配或同seed两条完整路线胜线；不把分档死亡率解释为选某节点会导致改善。具体源节点/病例保留audit.json的transfers.cases。');add()
table(['进阶','局','独立火','回血动作/其他动作','实际回复','去重后战/死亡','活损中位'],[(f'A{r["asc"]}',r['runs'],r['rests'],f'{r["heal"]}/{r["smith"]}',sum(r['gains']),f'{r["nexts"]}/{r["deaths"]}',r['median']) for r in read('rest-summary.json')])
add('其他动作来自原脚本的smith栏，不一律解释为锻造；A10 471独立营火对应473已完成选择动作（323回血、150其他），不是473营火。');add()
table(['进阶','真正重打场','尝试','赢尝试'],[(f'A{r["asc"]}',r['fights'],r['attempts'],r['wins']) for r in read('sl-summary.json')])
add('SL按一局同一层为一场；判死/退出与实死分列。首抽受控长度以draws.order/turns为准，首试未执行的终轮不补。全史的各场探索、胜试与失败试差异保留attempts.explore/turns，不能从汇总胜率推出单动作因果。');add()
add('### 经验库自己带偏或写了没被执行的地方');add()
add('- DeepSeek推理0、48实际脑日志均Codex，无DS引用原话，不能证明某条经验导致本局错误。F45商店原话“Mirage converts stacked poison into strong defense.”（译：蜃景把叠毒转成强防御）；实战首T1未叠毒便用蜃景+，0挡，T6才有毒兑现10挡。原题同时标升级版未建模与未来lasting value 10；由Jev0.11选择，并非DS执行，没有单动作整场反事实。')
add('- F32脑原话“Heal to 62 HP before the mandatory crab boss.”（译：强制蟹boss前回到62血）；F44“Heal to 86 HP before the mandatory elite; preserve the final campfire’s flexibility and a larger health buffer for consecutive bosses.”（译：强制精英前回86，保留最后营火弹性和连续boss血池）。实际已经回血、承认强制精英与连boss；86血仍死，不能记成未回血或错误认为还有跨幕回复。')
add('- 原手牌牌组持有毒雾+/暗影+不等末战已建立；前战能力换战重置。当前三骑士低阶经验asc[5,7]不出现在A10切片，不能指控该条高阶未执行；A10资源/成长新事实通过deck/plan与相关卡牌条目下发。');add()
add('### 机制推理');add()
mechanisms=[c for c in C if c['after']['scope'].split(':')[0] in ['card','relic','potion'] or c['id'] in ['silent-strength-weak-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']]
table(['机制','推理','证据（支持/反例局数、进阶）','典型案例','进了哪个条目'],[(c['after'].get('name',c['id']),c['after']['lesson'].split('机制：',1)[-1].split('决定胜负的战斗：')[0],f'{c["after"]["n_support"]}/{c["after"]["n_contradict"]}；{ev[c["id"]]["by_asc"]}',c['after']['lesson'].split('典型案例：')[-1],c['id']) for c in mechanisms])
add('- 完整支持/反例run id、分阶与进阶范围见update-summary.json，原动作前后见historical-mechanisms.json。成功施放全史池：蜃景27局/130动作、爆发17局/88动作、尖啸70局/567动作、暗影18局/127动作（池不等条目支持局数；按实际输出复核已登记支持）。词义是局部机制，不宣称单卡决定整场因果；说不清单项因果的仍标观察。')
add('- 全史敏捷47局69饮均+2，铁心18局34饮均+7且旧挡不变，毒31局123饮条件分支106/15/2；来源与原帧逐项核，不把恢复瓶算新获药、不从持有牌推已建增益。')
add('- 钨合金棍全史持有后结束回合3局224动作，单敌且无覆甲/可见回血且结算未死亡的窄场景：A3 11处、旧A10 1处与逐次穿挡减1吻合；新局多敌T3/T5/T6数值与逐次减损一致，F43事件文案11实扣10。未隔离移除遗物、全伤源、所有攻击顺序，不写普遍因果或更广组合。T7可见幽灵9攻/0挡却净损6，完整内部来源缺帧，保留未解释的2点差，不强行用于拟合或报纯bug。')
add('- 三组提案及两份数字/来源勘误'+','.join(pids)+'均source_task=experience-update、target_task=strategy-proposal，关联全部16经验/账本/原帧；领域combat/potion/sl/terminal，源码未改、阈值保持，不冒认implemented/shipped。原resources初稿SHA与16挡原文保留，以corrected提案的F27T2零即时挡为准；provenance-correction将71拆为48脑日志/调用与71含计划复用的脑决策，不影响支持局数。');add()
add('### 新增');add()
for c in C:
 if c['before'] is None:add('- '+c['id']+'（'+c['after']['scope']+'、asc'+str(c['after']['asc'])+'、3/0、med）：'+c['after']['lesson'])
add();add('### 更新');add()
table(['条目','支持前→后','字符前→后','新证据'],[(c['id'],f'{c["before"]["n_support"]}→{c["after"]["n_support"]}',f'{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}',','.join(c['new_runs'])) for c in C if c['before']])
add('- 压短重复案例：'+','.join(c['id'] for c in C if c['before'] and len(c['after']['lesson'])<len(c['before']['lesson']))+'；未合并其他id或删原证据/反例。三骑士支持4→5符合n≥5、无反例，med→high；asc仍[5,7]，A10案例仅作背景。');add()
add('### 退役');add();add('- 无。钨合金棍为实盘数值观察，不是旧求解器bug0177；事实有局号，不因模型覆盖而丢实盘数据。');add()
add('### 和手写知识及代码冲突');add()
add('- 其他八个静默JSON核用途、切点、生成来源及SHA256，other-knowledge.json留证；没有手写攻略/手册需改删。monster-records、room-costs、outcome-stats的旧统计与新截至口径不同，不当单场安全保证；boss-damage/信任独立训练验证切分与double-boss四局未校准局限保持。本任务不重拟生成数据，也不动其他角色知识。')
add('- 当前经验普通蜃景机制与首轮升级版零毒实测一致；Jev题面升级分支未建模/未来价值不等已得挡，交独立提案核当前源码覆盖。钨合金棍旧纯bug0177与事实0178分开，复用0178台账；旧手写源码本任务不改，完整dirty源码缺失不能断言当前入口造成本局。');add()
add('### 代码问题（不给 DS）');add()
add('- 无本批新纯bug。升级蜃景未覆盖、原题future value、末轮预测−1与实际13血归零都不自动当bug或修后可赢；对照仅确认实际时点/完整需损，独立策略任务核重复/未知。')
add('- 辅助初稿曾把蟹第二试T3普通扫腿28挡写成升级36，把F27T2铁心前后0挡误记16；原帧复核纠正为普通28、药前后0挡且覆甲0→7，再冻结经验和最终切片。原update.log/脚本工具记录与原resources提案SHA保留，更正提案登记替代旧资源提案这一处数字，账本0178/0277链完整；错误未进入经验源提交，不是游戏或测试失败。')
add('- 缺完整dirty源码、SL首试退出终轮结算、T5洗牌后共同抽序、部分敌内部攻击/减损来源、末战替focus/首轮换牌/药水时点/另一构筑整场胜线，保持未知；有限全败模拟不改SL必死边界。');add()
add('### 测试');add()
add(f'- 原入口bash tools/test-sandbox.sh；TMPDIR本批、PATH含本机node、SANDBOX_WORKERS=1、nice19；tsc{tests["tsc"]}、vitest{tests["vitest"]}，{tests["files"]}文件/{tests["cases"]}通过例。全量首轮通过，主阶段876.89秒；因首轮长时间未返回结果，额外300秒有界诊断重跑exit124，原件保留，不当源码失败或全量通过。最终冻结经验另有定向1文件10例0。完整沙箱外检查由调度器在实际合入后补，不冒报完整套件。')
add('- JSON、字段/角色/局号/证据/预算、旧123局逐行基线、逐饮药/末轮完整威胁、固定240配对切片、check-experience missing=[]/0、gitleaks0和diff --check通过。')
add('- 学习账本仅CLI：新增[]；改proposed '+','.join(lids)+'；退役[]；ledger.py check 0。钨合金棍复用原observed 0178，无新编号；原首证/prior/claim/repeat/上线历史保留，学习者不标accepted/shipped。')
add(f'- live实际合入：{merge["merged"]}；刷新：{merge.get("refresh")}；合前：{merge.get("before")}；合后测试：{merge.get("after_test")}；结果：{merge.get("reason")}。')
for conflict in merge.get('precheck_conflicts',[]):add('- '+conflict)
add();add('### 切片大小');add()
add('- 固定种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对、每格20独立时点；sample-manifest.json有池与时点。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome数据；本次before来自新池，不混上一批中位。');add()
table(['进阶/界面','改前中位/最大','改后中位/最大','配对增量中位'],[(r['sample'],f'{r["before_median"]}/{r["before_max"]}',f'{r["after_median"]}/{r["after_max"]}',r['paired_median_change']) for r in slices['rows']])
add('- 整体切片：'+str(slices['overall'])+'。')
add(f'- active170/正文{M["after"]["chars"]}，high102/med43/low25；A8适用159条{M["after"]["by_asc"]["8"]["chars"]}字、A9 160条{M["after"]["by_asc"]["9"]["chars"]}字、A10 167条{M["after"]["by_asc"]["10"]["chars"]}字。需要Dai定：无。')
add();add('原帧/脚本/初稿/机制/提案/账本/测试/切片/合入回执：'+str(O)+'；报告时间'+stamp+'。')
section='\n'.join(rows)+'\n'
(O/'changelog-addition.md').write_text(section)
path=ROOT/'paper/materials/experience-changelog-silent.md'
with path.open('a+') as h:
 fcntl.flock(h,fcntl.LOCK_EX);h.seek(0)
 assert title not in h.read(),'重复标题，停止追加'
 h.write('\n'+section);h.flush()
(O/'report.md').write_text(section)
result=dict(task='experience-update',version=M['version'],commit=source,merged=merge['merged'],added=1,updated=15,retired=0,active=170,
 mechanisms=[c['after'].get('name',c['id']) for c in mechanisms],tests={k:tests[k] for k in ['tsc','vitest','cases']},
 ledger=dict(added=[],proposed=lids,retired=[],check=0),code_proposals=pids,implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(title)
