import collections, hashlib, json, re, statistics, subprocess, sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))
A=json.load(open(O/'audit.json'))
R=json.load(open(O/'run-metadata.json'))
K={r['run_id']:r for r in R}
F=json.load(open(O/'baseline-check.json'))
SL=json.load(open(O/'sl-summary.json'))
REST=json.load(open(O/'rest-summary.json'))
ids=json.load(open(O/'proposal-ids.json'))
source=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else None
live=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else dict(merged=None,reason='待源自测与提交后执行')
test=json.load(open(O/'test-summary.json')) if (O/'test-summary.json').exists() else dict(tsc=None,vitest=None,files=None,cases=None)
ledger=json.load(open(O/'ledger-result.json')) if (O/'ledger-result.json').exists() else dict(added=json.load(open(O/'ledger-added.json')),proposed=[],retired=[],check=None)
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip()
title=f'## {stamp[:10]} 静默猎手 第九十二次增量：2 局 A10（version {C["version"]}，分支 {branch}，{source[:8] if source else "待提交"}）'

def table(headers,rows):
    def cell(x):return str(x).replace('|','／').replace('\n',' ')
    return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(cell(x) for x in row)+' |' for row in rows])+'\n\n'

s=title+'\n\n### 来源\n\n'
s+=f'- 记录时间 {stamp}；根 notes/lessons.md:5664 的 PD9AYQVMLQW6 与5675的L2TSFU62Z57Z，均静默猎手A10；按07:25/07:54勘误采用三只外骨骼虫、持牌致死定位、F35T8已有毒结束，以及缩小甲虫/毛绒伏地虫中文名。两局runs.jsonl:602/603均character=SILENT，未跳过。独立完成，无下级agent。\n'
s+='- exp开工干净，git merge --no-edit main无冲突成功；已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法与最后两节、本角色最后两节、账本README。抽取/复算单进程nice19，固定沙箱单worker；不联网、不安装依赖、不跑play或boss模拟池。\n'
s+='- 按run id重抽PD9的1017决策/55实际Codex脑/11 SL摘要、L2的442决策/17脑/6 SL摘要；states按UTC窗seek再核run_id及state.run.character_id，分别1125/447帧。DeepSeek窗口各0，最后记录早于这两局，兼容ds_*不当DeepSeek调用；两个run笔记为空，不补写正文。旧局沿用保留的原日志切片，重新执行全部逐局分析，不沿用旧汇总结果。完整dirty源码未记录，不以当前源码冒认运行树。\n'
counts='/'.join(str(sum(r['ascension']==a for r in R)) for a in range(11))
s+=f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，A0—A10局数{counts}，{len(A["fights"])}房/{sum(r["death"] for r in A["fights"])}实死；仅本角色已结束局。排除其他角色、缺character的旧局、进行中及切点后局；不代替纯Codex爬塔成绩。历史主题复盘按本角色/截止点抽取并用全部原帧复核，无额外只进数字未读复盘的新局。\n'
s+='- 口径沿第91节：第一COMBAT入房HP减同房最终尝试退出HP；开场回复/负净损保留，实死单列。Monster才是走廊，Unknown问号战另列、训练假人不算实死；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除、多源可指同战；回血后战去重、独立火堆与动作数分列。\n'
s+='- 旧120局七数组逐行、全部血档/源节点转移、实回复与SL重算一致，无口径偏差。PD9新增21房20胜1实死，L2新增6房5胜1实死；两末战各五次判死截断不补未执行结算，不记成十次实际死亡，六次尝试不当六局。PD9 F49整房10→0损10，L2 F17整房65→0损65。\n'
s+=f'- 新增1、更新20（20条加证据、0条只改数字）、退役0；active{C["active_before"]}→{C["active_after"]}，正文{C["chars_before"]}→{C["chars_after"]}，置信{C["confidence"]}。开工未超过55000，未改60000测试预算。重复案例压短、机制并回原scope，旧全文/所有证据反例留experience-before.json/changes.json，无合并退役。\n\n'
s+='### 对照数据检查的主题\n\n'
topics=[]
for c in C['entries']:
    e=c['after']
    asc=dict(collections.Counter(str(K[n]['ascension']) for n in e['evidence']))
    case=e['lesson'].split('典型案例：')[-1]
    conclusion=e['lesson'].split('机制：')[0]+' '+case if '机制：' in e['lesson'] else e['lesson']
    topics.append([e.get('name') or e['id'],f'支持{e["n_support"]}/反例{e["n_contradict"]}；分阶{asc}；新证据'+','.join(c['new_runs']),conclusion])
topics += [
['血药接续','PD9 F47 37→58；F48赢58→10、两槽空；F49六次原样10进、前五判死/末实死','同幕第二boss无跨幕回复；首战赢/能力齐不等于续战资源齐，不推留药必胜'],
['赢战血价','PD9 F35 57→10损47；F37两药守10，F39到9；L2 F9损22、F14损20并饮两药','败局原因须连同前序胜战资源，净HP下降不是敌人毛伤'],
['药水分源','PD9独立入槽17、主动饮14、弃2、事件交1；L2独立获5、主动饮10，其中血清6来自五次SL恢复','重复药槽恢复不当新药；未执行喝/留药反事实未知'],
['回复分源','PD9六次休息各21共126、跨幕44/52；L2两火42、事件20、五次SL恢复299HP/5旧药槽','SL恢复不是治疗；PD9 F19再生净增1含伤疗叠加，不称实际总回1'],
['HP护栏/SL天然对照','L2第2试T2损5/扣30；第3—6试撤回护栏后损15/扣44；后四试T3抽后实损7/扣16','T2局部省10少14只在第2试实际兑现，五次候选不累加；无胜次，后续抽牌/动作改变'],
['有限推演','PD9 F48选线五轮0/6死、0/6赢；F49首题8/8死、末T7候选24/24死而实线重问到T10','饱和/截断/零胜和必死分开，后续实线不是固定原线复放'],
['末战血伤缺口','PD9 3血、32挡对24持牌+23攻击需损15、严格存活差13、敌244；L2 17血0挡对17攻归零、差1、敌113','攻击单项不可脱离持牌伤；存活一轮不等于整场能赢'],
['路线/投影','PD9 F16/32/47投影54/65/58与实入相同；更早路线/构筑变；L2 F8预计F13火42/实23，后续精英强制','只记同节点及实际路径；改线、事件/构筑/药水并发，不判替路线因果更好'],
['概率与时钟','PD9异鱼408样本96.81%/赢损中位34/约11轮，对实12轮损39；恶魔360样本69.72%/赢损47/约10轮，对实13轮损60；L2 F15事件1000样本0%/约10轮/余107.201，末8轮余113','赢样本不预测败样本；PD9 F47连续312样本0%未校准，不用新两局调时钟或必死阈值'],
['进阶','新机制asc[0,20]，数值保留已见进阶/占位符；路线/休息/构筑统计asc[8,20]且分阶；低阶旧策略范围未扩','A10仪式兽阈值160不能套低阶150；各角色、各进阶不混分母'],
]
low=[r for r in A['transfers'] if r['asc']==10 and r['band']=='<25%' and r['n']]
topics.append(['低血异节点比较','；'.join(f'幕{b["act"]}/{b["screen"]}：{b["n"]}节点/{b["unique_fights"]}后战，指向实死{b["deaths"]}/{b["n"]}、活损中位{b["median_win"]}' for b in low),'观察：PD9 F36商店源10血→F37走廊两药后净损0；F40营火源9血→F46问号战净损14，中间F42还回血21。敌人、房型、后续回复与用药不相同，不能判商店比营火因果更优；各进阶完整表另列。'])
s+=table(['主题','数据','结论'],topics)
s+='旧基线七数组复算：\n\n'+table(['数组','旧','新','逐行一致'],[[k,v['before'],v['after'],'是'] for k,v in F.items()])
s+='各进阶/幕/房型非空血档（房/独立局；存活房净损中位；全部病例audit.json）：\n\n'
s+=table(['进阶','幕','房型','血档','房/局','实死/率','活损中位'],[[f'A{b["asc"]}',b['act'],b['type'],b['band'],f'{b["n"]}/{b["runs"]}',f'{b["deaths"]}/{100*b["deaths"]/b["n"]:.2f}%',b['median_win']] for b in A['bands'] if b['n']])
s+='源节点到下一战（源节点入血分档，多源可同战、按源节点死亡率，全部病例audit.json）：\n\n'
s+=table(['进阶','幕','源节点','血档','节点/独立后战','指向实死/率','活损中位'],[[f'A{b["asc"]}',b['act'],b['screen'],b['band'],f'{b["n"]}/{b["unique_fights"]}',f'{b["deaths"]}/{100*b["deaths"]/b["n"]:.2f}%',b['median_win']] for b in A['transfers'] if b['n']])
s+='实休息与回血后下一战去重：\n\n'+table(['进阶/局数','独立火','回血/锻造动作','实回HP','去重后战/实死率','活损中位'],[[f'A{b["asc"]}/{b["runs"]}',b['rests'],f'{b["heal"]}/{b["smith"]}',sum(b['gains']),f'{b["nexts"]}/{b["deaths"]}/{100*b["deaths"]/b["nexts"]:.2f}%' if b['nexts'] else '0',b['median']] for b in REST])
s+='真正多次SL房：\n\n'+table(['进阶','多次重打场','尝试','赢的尝试'],[[f'A{b["asc"]}',b['fights'],b['attempts'],b['wins']] for b in SL])
slboss=json.load(open(O/'sl-boss-summary.json'))
s+=table(['boss/进阶','重打场','尝试','赢'],[[f'{boss}/A{a}',b['fights'],b['attempts'],b['wins']] for boss,allrow in slboss.items() for a,b in allrow['by_asc'].items()])
s+='- A10低血异节点只是观察：源血<25%的REST/SHOP/EVENT分幕表已重算；各节点后战房型、构筑、药水不同，不能判改商店/问号或回血必然更好。PD9无精英路径仍首战耗48后续死；L2避一精英后仍走另一精英，避免计划文字不冒认避免实线。\n\n'
s+='### 经验库自己带偏或写了没被执行的地方\n\n'
s+='- 两局DeepSeek推理均0，72脑记录全Codex；没有DeepSeek引用某条经验的原话，不补造引用或把兼容ds字段称DS。未见可用逐条引用证据证明经验导致错误。\n'
s+='- PD9 F47原话“Heal to 58 HP. With no potions and consecutive bosses, guaranteed health outweighs upgrading one card in this 42-card deck.”（decision284404）；F48战后原话“First boss defeated; next boss unknown. At 10 HP without potions or healing nodes, prioritize immediate protection and free draw.”（run-plans2634）。实际已按连战准备，不再记路线老错或幕末误判bug，但首战耗48仍留下真实续战缺口。\n'
s+='- L2 F11计划要补步法/毒源，终组实际无能力/毒源；F12/13已承认后续精英强制。F17末T6 Jev0.94选结束，题面打击/侧步有同样零损及7伤/后轮能量，但三候选1200样本均0赢、替线没完整实打，不判补打就赢。第3—6试T2护栏被SL撤回，原候选省血不能记实际省血；T3抽后实扣16而原候选扣0，决策窗口分开。\n\n'
s+='### 机制推理\n\n'
mechanisms=[]
for c in C['entries']:
    e=c['after'];text=e['lesson']
    if '机制：' not in text:continue
    reasoning=text.split('机制：',1)[1].split('决定胜负的战斗：',1)[0]
    case=text.split('典型案例：',1)[1]
    asc=dict(collections.Counter(str(K[n]['ascension']) for n in e['evidence']))
    mechanisms.append(dict(id=e['id'],name=e.get('name') or e['id'],conclusion=text.split('机制：')[0],reasoning=reasoning,n=e['n_support'],contradict=e['n_contradict'],asc=asc,case=case))
s+=table(['机制','推理','证据（支持/反例局数、进阶）','典型案例','进了哪个条目'],[[m['name'],m['reasoning'],f'{m["n"]}/{m["contradict"]}；{m["asc"]}',m['case'],m['id']] for m in mechanisms])
power=json.load(open(O/'historical-power-deltas.json'))
s+='- 能力全史重新核动作数（不当支持局数）：'+str({k:{a:b for a,b in v.items() if a!='rows'} for k,v in power.items()})+'。步法五次净+1伴柔嫩、毒雾一次+6伴重放、余像一次+2等同帧来源须分开，不改基础规则；原动作/前后帧全部保留。\n'
s+='- 全史敏捷46局68饮均+2，速度37局46饮+5，铜液17局21饮均荆棘+3且敌HP当步不变；末次L2全挡三击反9实帧验证反伤按击，旧磨蚀/铜质鳞片属于不同来源，不当铜液证据。毒药水原30局122饮的条件分支复核但本批没新饮毒药，不修改该条目。\n'
s+='- L2荆棘实由流动铜液建立，未施放磨蚀、未持铜质鳞片，不增加那两条支持局数。复盘原silent-0044的共性触发补证原件保留，不改其claim/状态；铜液来源另建本批专属账本。\n'
s+='- 支持与反例列表、进阶及账本逐项见mechanism-evidence.json/ledger-map.json；三个提案'+','.join(ids)+'均source_task=experience-update、target_task=strategy-proposal，关联本批条目/账本/原帧。领域combat/potion/sl/terminal/structure，保持现有阈值、只待独立实现，不冒认implemented/shipped。\n\n'
s+='### 新增\n\n'
for c in C['entries']:
    if not c['before']:
        e=c['after'];s+=f'- {e["id"]}（{e["scope"]}、{e.get("name")}、asc{e["asc"]}、{e["n_support"]}/{e["n_contradict"]}、{e["confidence"]}）：{e["lesson"]}\n'
s+='\n### 更新\n\n'+table(['条目','支持前→后','字符前→后','新证据'],[[c['id'],f'{c["before"]["n_support"]}→{c["after"]["n_support"]}',f'{len(c["before"]["lesson"])}→{len(c["after"]["lesson"])}',','.join(c['new_runs'])] for c in C['entries'] if c['before']])
compressed=[c['id'] for c in C['entries'] if c['before'] and len(c['after']['lesson'])<len(c['before']['lesson'])]
s+='- 二十条均补本角色证据，原进阶/证据/反例完整保留；压短条目：'+','.join(compressed)+'。旧全文保存在changes.json/experience-before.json；昏眩支持3→4且原文为规则无反例，按口径med→high。未合并或删历史。\n\n'
s+='### 退役\n\n- 无；未发现反例多于支持或已修纯bug型经验。\n\n'
s+='### 和手写知识及代码冲突\n\n'
s+='- 八个其他静默JSON逐项核用途/元数据/切点及哈希，other-knowledge.json留证；没有手写攻略/手册需改删。room-costs为MAP边界、monster-records分别战内/战后口径，异步切点不当事实矛盾。double-boss.json明确独立四局/8192模拟及未校准限制，新增后续实战不伪装已重新拟合参数；PD9再证同幕F48→49原血药接续，不与其结构矛盾。未改这八文件。\n'
s+='- 代码手写知识本任务不改。普通生存者无绷带不消费强制弃牌属于已在队列的旧模型根因；本批真实弃一张凋萎后的24持牌伤/完整15需损保留，修复由已有独立strategy-proposal。幕末角色知识已知道还有boss，不造误判。当前机制/追踪入口覆盖由三个提案核，文字更新不当源码已修。\n\n'
s+='### 代码问题（不给 DS）\n\n'
s+='- silent-0268仅旧bug复现，保留首证53FLQ68CETW0与本局repeat；模型−1来自三张36伤在32挡下持牌先致死、略去敌击，实际强制弃一张后仍活过持牌阶段再受敌击，完整余血算术−12，实际仅剩3归零。预测差11不当实际额外损11，更不称修后能赢。不上纯bug新经验、不重复编号。\n'
s+='- 本批辅助核验首次把规范字段blocked_by_hook误按原枚举BlockedByHook断言而失败；原失败log保留，读原帧确认normalized/raw/preventer后改核规范字段，固定终局原帧通过。不是游戏bug或tsc/vitest失败。\n'
s+='- 缺完整dirty源码、完整逐击毛伤/部分末击顺序、前五次SL出口结算、另一条完整路线/药水时点/护栏/昏眩首牌/击杀序胜线、旧时钟/最终实线最优比例及Jev缓存命中，保持未知。\n\n'
s+='### 测试\n\n'
s+=f'- 源原入口bash tools/test-sandbox.sh，TMPDIR本批/PATH含~/.local/node/bin、SANDBOX_WORKERS=1、nice19；tsc {test["tsc"]}、vitest {test["vitest"]}，{test["files"]}文件/{test["cases"]}通过例。完整外部由实际合入后调度器补，不冒报完整套件通过。\n'
s+='- JSON、角色/局号/字段/预算、旧120局逐行基线、19机制主题/逐饮、27新增房与两场各六次SL末结算、固定240切片、check-experience missing=[]/0及gitleaks/diff校验详见本批原日志；测试状态以test-summary.json为准。\n'
s+=f'- 学习账本只经CLI：新增{ledger["added"]}；改proposed {ledger["proposed"]}；退役{ledger["retired"]}；ledger.py check {ledger["check"]}。旧first_run/prior/claim/repeat与版本/上线历史保持，学习者不标accepted/shipped；纯bug0268不改状态。\n'
s+=f'- live实际合入：{live.get("merged")}；刷新：{live.get("refresh")}；合前：{live.get("before")}；合后测试：{live.get("after_test")}；结果：{live.get("reason")}。\n'
for conflict in live.get('precheck_conflicts',[]):s+='- '+conflict+'\n'
s+='\n### 切片大小\n\n'
s+='- 种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对，每格20独立时点。池/时点见sample-manifest.json；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome快照；新池before不混旧批中位，V4整份前缀另报本阶字符总数。\n\n'
if (O/'slice-before.json').exists() and (O/'slice-after.json').exists():
    before=json.load(open(O/'slice-before.json'));after=json.load(open(O/'slice-after.json'))
    rows=[];bs=[];zs=[];deltas=[]
    for b,z in zip(before,after):
        assert b['sample']==z['sample']
        delta=[a-c for a,c in zip(z['sizes'],b['sizes'])]
        rows.append([b['sample'][7:],f'{b["median"]}/{b["max"]}',f'{z["median"]}/{z["max"]}',statistics.median(delta)])
        bs+=b['sizes'];zs+=z['sizes'];deltas+=delta
    slice_summary=dict(before_median=statistics.median(bs),after_median=statistics.median(zs),median_change=statistics.median(zs)-statistics.median(bs),paired_median_change=statistics.median(deltas),before_max=max(bs),after_max=max(zs),max_increase=max(deltas))
    (O/'slice-summary.json').write_text(json.dumps(slice_summary,ensure_ascii=False,indent=2)+'\n')
    s+=table(['进阶/界面','改前中位/最大','改后中位/最大','配对增量中位'],rows)
    s+='- 整体切片：'+str(slice_summary)+'。\n'
else:
    s+='- 配对切片尚在验证，最终数值以slice-summary.json为准。\n'
s+=f'- active{C["active_after"]}/正文{C["chars_after"]}，置信{C["confidence"]}；A8/A9/A10适用{C["applicable"]}。需要Roy定：无。合入受阻按真实结果交运维续办，保留全部证据/失败/原稿，不冒报上线。\n\n'
s+='原帧/脚本/初稿/失败/机制/提案/账本/测试/切片/合入回执：'+str(O)+'；报告时间'+stamp+'。\n'
(O/'changelog-section.md').write_text(s)
(O/'section-title.txt').write_text(title+'\n')
(O/'mechanisms-summary.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
report='# 静默猎手经验更新报告\n\n'+s
(O/'report.md').write_text(report)
if '--append' in sys.argv:
    assert source and test['vitest']==0 and ledger['check']==0
    path=ROOT/'paper/materials/experience-changelog-silent.md'
    initial=path.read_bytes()
    assert title.encode() not in initial
    with path.open('ab') as h:h.write(('\n'+s).encode())
    assert path.read_bytes()[:len(initial)]==initial
    (O/'changelog-append-proof.json').write_text(json.dumps(dict(path=str(path),original_bytes=len(initial),original_sha256=hashlib.sha256(initial).hexdigest(),append_bytes=len(('\n'+s).encode()),prefix_preserved=True),ensure_ascii=False,indent=2)+'\n')
print('报告已保存',len(s.splitlines()),'行；',source,live.get('merged'))
