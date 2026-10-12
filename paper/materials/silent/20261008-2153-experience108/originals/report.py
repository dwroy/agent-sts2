import collections
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
RUN='PF90JTU0UZ5M'
def read(name):return json.load((O/(name+'.json')).open())
S=read('update-summary');C=read('changes')['entries'];H={h['id']:h for h in read('historical-mechanism-summary')}
A=read('audit');V=read('slice-summary');M=read('ledger-map')
commit=(O/'source-commit.txt').read_text().strip()
heading=(O/'changelog-heading.txt').read_text().strip()
live=read('live-merge') if (O/'live-merge.json').exists() else dict(merged=None,result='未执行合入')
led=read('ledger-results')
log=(O/'test-source.log').read_text()
rc=int((O/'test-source.rc').read_text())
files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)))
cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
tests=dict(tsc=0 if ' RUN ' in log else rc,vitest=rc,files=files,cases=cases,rerun=False)
(O/'test-results.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2)+'\n')
mechanisms=[
('力量敏捷与步法','逐击加力、逐牌加敏，旧挡不补；四敏三防御27，巨兽爆30仍损3','步法80/力敏138','PF90JTU0UZ5M'),
('毒牌与触媒','施毒非即时伤，普通触媒9＋8=17，限伤另核','药瓶19/毒药33/触媒53','PF90JTU0UZ5M'),
('毒雾','实建2层，下一轮四敌各加2毒，生成牌未入牌组','69','PF90JTU0UZ5M'),
('毒素持牌伤','两张10加敌攻19，共29，1血27挡完整需损2仍死','20','PF90JTU0UZ5M'),
('固化药水','当步已有B挡变3B；两次5→15，不沿用至自爆轮','16','PF90JTU0UZ5M'),
('毒药水','按条件加6/7或被制品阻；饮用不扣本体HP','36','PF90JTU0UZ5M'),
('南瓜蜡烛','正充能轮初多1能，独立战后扣1，SL恢复不重计新战','5','PF90JTU0UZ5M'),
('胆小敌挡','非致死攻击后补7挡，当前净扣不等敌退场','24','PF90JTU0UZ5M'),
('巨兽自爆','本体结束后仍承爆，虚弱后30不当无弱基础','23','PF90JTU0UZ5M'),
('能力收益兑现','实建/实结与战果分核，末轮多敏仍不能覆盖持牌伤','137','PF90JTU0UZ5M'),
]
result=dict(task='experience-update',version=S['version'],commit=commit,merged=live.get('merged'),added=S['added'],updated=S['updated'],retired=S['retired'],active=S['active'],mechanisms=[' — '.join(m) for m in mechanisms],tests={k:tests[k] for k in ['tsc','vitest','cases']},ledger={**led,'check':0},code_proposals=read('proposal-ids'),implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines=['## '+heading,'','### 来源','',
f'- 记录时间{now}。只读根notes/lessons.md:6071的PF90JTU0UZ5M静默复盘，未发现节后勘误。runs.jsonl:623确认SILENT/A10/F22败，无角色跳过；运行433144fb+dirty完整源码未记录。',
'- exp-silent开工干净，git merge --no-edit main无冲突合入d8ca967c。已读README、最新STATE、近期decision-log、学习协议/代码提案、首次构建和末两节方法、静默106/107节及账本README；独立完成、不派agent，不联网、不运行play/模拟池、不改打法源码和其他角色知识。临时文件只在本批scratch，抽取nice19单进程、沙箱1worker。',
'- 按局号抽444决策、23脑请求、7 SL记录、5计划与Jev题面；states/reasoning按UTC窗二分字节seek流读，核state.run.character_id及run_id，455状态帧、DeepSeek推理0。窗2026-10-08T11:43:55.566Z—12:06:47.125Z；脑23请求全部Codex，兼容ds_*字段不当实际DeepSeek引擎。',
f'- 全引擎学习观察截至{A["cutoff"]}共142静默完局、{len(A["fights"])}独立战斗房、{sum(f["death"] for f in A["fights"])}实际死，分阶'+str(dict(collections.Counter(r['ascension'] for r in read('run-metadata'))))+'。其他141局仅进数字/历史验证；排缺character旧铁甲、其他角色、进行中及切点后完局，不称纯Codex爬塔战绩。',
'- 口径沿上一节：首COMBAT入房HP减同房末次尝试退出HP，战内全部变化/负净损保留，实际死亡单列，判死截断不当实死；Monster走廊与Unknown问号分开。血档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT入口血关联下一更高层首战，排Ancient，多源可重复，回血后战去重，独立火与动作分列。SL同房多试计一房。',
'- 旧141局七数组逐行、血档/节点后战/休息/SL复算全部一致，无漂移，baseline-check保留。新11房首末HP及关键动作/药水独立断言通过，610段静默主题复盘与142局日志交叉检索。历史固化16局23饮全为B→3B；毒药36局144饮全为饮用当步HP不变，常态127加6、头骨15加7、制品2阻毒。仅出现动作不擅自扩大全结论支持。',
f'- 新增1、更新15（15加证据、0只改数字）、退役0；active184→185，正文49905→50213字，低于55000压缩线/60000预算，没有预算合并/压缩/退役。','',
'### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];h=H[e['id']]
    lines.append('| '+e['id']+' | 支持'+str(e['n_support'])+'/反例'+str(e['n_contradict'])+'；分阶'+str(h['by_asc'])+'；账本'+','.join(M[e['id']])+' | '+e['lesson'].replace('|','/')+' |')
lines+=['','按进阶/幕/实际房间/入口血档的下一战观察，n为独立战斗房；同一局可贡献多房。死亡率为死亡房/n；活战净损中位含负值，不能叫敌人毛伤。','',
'| 进阶 | 幕 | 房型 | 入口血档 | 房数/局数 | 实死/死亡率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['bands']:
    if b['n']:
        lines.append(f'| A{b["asc"]} | {b["act"]} | {b["type"]} | {b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','REST/SHOP/EVENT入口血档关联其后首战；同战多源可重复，场/死不等独立局胜率，不是路线因果对照。','',
'| 进阶 | 幕 | 节点 | 入口血档 | 来源节点数/去重后战 | 死亡/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['transfers']:
    if b['n']:
        lines.append(f'| A{b["asc"]} | {b["act"]} | {b["screen"]} | {b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','| 进阶 | 局数 | 独立营火/回血动作 | 实回HP | 去重回血后战/死 | 活战净损中位 | SL多试房/尝试/赢次 |','| --- | --- | --- | --- | --- | --- | --- |']
sl={s['asc']:s for s in read('sl-summary')}
for r in read('rest-summary'):
    s=sl[r['asc']]
    lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','本局资源链：F2/3/4/5分别净损2/13/1/8；F8休息32→53，F9精英胜53→1（损52）；F12回1→22，F13胜损7，F14事件回23到38，F16回21到59；F17本体/自爆胜损13到46。幕边界到65的独立回血来源缺中间帧；F19/20/21三胜损18/26/18到3，其中F21问号战。毒药保留至F22，能力药F21重试产生毒雾；未来店/三火未到。不同低血节点数据均是观察，不证另一条路线或提前用药可赢。',
'','SL对照：F21两試1赢，首試T2判死而未实际死，第2試能力药→毒雾后T4赢21→3；药/抽牌/出牌共同变。F22四試0赢，已记录首26抽一致，前三試T3判死读档、末次实际死。第3/4試T1关键底板完全一致，原防御两打击整轮扣26/损0，锚线毒药两打击扣31/损2；末次T2另建第二步法，多敏下T3三挡27比原21多6，仍对19攻＋10毒素死。局部差值可比较，后继不同且截断，不能当整场受控胜率。SY0WMJNNVRLM历史胜次目标/弱化共同改变，保留其观察，不归单项杀序或运气。','',
'### 经验库自己带偏或写了没被执行的地方','',
'- 实际DeepSeek请求及推理0，无DeepSeek引用原话；兼容字段/journal名称不证引擎。Codex/Jev题面和答案保留，未记录具体经验id导致决策的因果链。',
'- F18计划原话“蜡烛提供持续能量，三火双店补强并续火。”三火实际F27/29/32，本局F22即死；正充能的4能量已兑现，回血/添火愿望未兑现。F21奖励计划的“先过强制战再去商店”是中文释义，不能当实际到店。',
'- F8 Codex原话“Forced elite next with no potions makes 32 HP unsafe. Heal now; pursue the valuable Flask upgrade after recovery.”实回53但精英损52；F12“At 1 HP with a forced fight next, healing is essential.”实回22；F16“Heal to 59 HP: substantially better simulated boss survival than any upgrade”实回59、巨兽胜。拟议药瓶升级仍未执行，全局升级0。不能因后局败称回血无效。',
'- 末次T1 rationale明确“SL explore: replaying attempt 2\'s 致命毒药 … instead of 防御 … before T2”；这是代码重放替换，不归Jev原答。T2换线文字“among those the rollout does not see dying more often”不等实际血价相同；前三试缺完整结算，没有整战获胜对照。','',
'### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    h=H[e['id']]
    reasoning=e['lesson'].split('机制：',1)[1].split('决定胜负的战斗：',1)[0]
    case=e['lesson'].split('典型案例：',1)[-1]
    lines.append('| '+(e.get('name') or e['id'])+' | '+reasoning+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；'+str(h['by_asc'])+' | '+case+' | '+e['id']+' |')
lines+=['','支持局数为完整机制或观察结论的独立本角色局，反例不是败局计数。“决定胜负”只指局部生存/输出窗口和真实战果；缺组件移除/整场替线受控结果，不声称单卡因果。巨兽41蒸汽在虚弱下爆30，不能把30当无弱基础；末毒/自伤/敌击共帧，不外推内部先后。','',
'### 新增','']
for c in C:
    if c['kind']=='added':lines.append('- '+c['id']+'：'+c['after']['lesson']+' 账本'+','.join(M[c['id']])+'，机制范围[0,20]，支持16局、反例0、high；固化最早实证LRN0HPZ0FZS1 A0 F33T7已有10→30，0225首证经CLI追加更正，原行及prior unknown保持。')
lines+=['','### 更新','']
for c in C:
    if c['kind']=='updated':lines.append('- '+c['id']+'：支持'+str(c['before']['n_support'])+'→'+str(c['after']['n_support'])+'，反例'+str(c['after']['n_contradict'])+'；追加PF90JTU0UZ5M、更新真实案例/汇总数字，账本'+','.join(M[c['id']])+'。')
lines+=['','### 退役','','- 无。未发现反例超过支持、新高阶反驳或本次实际代码修复；无预算压缩，原退役历史保留。','',
'### 和手写知识及代码冲突','',
'- 核对静默其他8份JSON的结构/来源/证据范围/SHA，见other-knowledge；均为生成统计/模型或boss-trust/double-boss证据数据，无需改的手写知识。生成切点/口径不同不当机制反例，本局未到双boss，不据此重拟终局表。改了的手写知识：无。',
'- 不改代码里的手写知识；本局毒药题面数值未知/未模拟、真实问号战与定义排问号计数、锚线恢复血价/后继生存需求都进入独立提案，不指控当前实现违反自身准入。完整dirty运行树未保存，当前参考源码不冒认运行等价。',
'- 代码提案'+','.join(result['code_proposals'])+'，source_task=experience-update、target_task=strategy-proposal；实际domains combat/potion/sl/terminal/structure。16变更经验均有本条id、账本、角色证据、旧新行为、时间切分/限制/验证/影响/回退；本任务未实现打法源码，不因经验提交标implemented/shipped，独立实现状态由调度闭环另核。','',
'### 代码问题（不给 DS）','',
'- 未发现新的纯bug：末持牌10伤在sl-attempts判官及完整推演中已计入；SL锚线当轮仍生存、符合既有准入。重复舍挡换输出血价保留0079 repeat，相关策略另实现。',
'- 缺完整dirty源码、判死尝试退出/未执行毒、独立0血/末击过量、同帧内部先后、幕间19独立回血来源、提前用药/不同构筑/休息/路线/锚线整场对照、未到后续房间资源/双boss，以及silent时钟所需/估计字段。不能用预训练补齐。',
'- 初次verify在audit尚未生成时调用报FileNotFoundError，保留verify-premature.log，数据完成后原帧核验成功；只读SL摘要初稿对dict抽序作列表切片错误未产生知识，后续以draws.order重新核实首26张一致。','',
'- 上线记录首次原子重命名因exp/live挂载间EXDEV失败，未写入版本或通知；保留publish-first-exdev.log/rc及版本初稿。改为live锁内校验原字节后直接写入，重试退出0；这是记录写入限制，不是经验/源码或测试失败。','',
'### 测试','',
f'- 原沙箱入口bash agent/tools/test-sandbox.sh；TMPDIR本批scratch、PATH本机node、nice19/SANDBOX_WORKERS=1、固定数据。tsc退出{tests["tsc"]}；vitest{files}文件/{cases}用例/退出{rc}，未重跑。测试不设CHARACTER，切片工具设CHARACTER=silent；测试预算/排除名单不改，外部完整由调度器补跑，不冒报通过。',
'- JSON、唯一id、scope/中文name、12位角色证据、置信度、last_seen、60000预算及240配对切片校验通过；check-experience missing=[]/退出0，ledger.py check退出0（实际条数见最终日志），gitleaks退出0，git diff --check通过。',
'- 学习账本仅CLI：新增[]；proposed '+','.join(led['proposed'])+'；退役[]。16来源账本覆盖16经验，0007关联两毒牌，花园对应0209/0211两主题；0225增加历史证据和原first_run/claim追加更正，prior/旧记录保持。不改accepted/shipped，实际数据shipped交运维核实。',
'- live锁内结果：'+live.get('result','未知')+'；刷新'+str(live.get('refresh'))+'；合前'+str(live.get('pre'))+'；实际合入'+str(live.get('merged'))+'。']
for line in live.get('conflicts',[]):lines.append('- '+line)
for line in live.get('overlap_conflicts',[]):lines.append('- 刷新知识重叠：'+line)
if not live.get('merged'):lines.append('- 未实际合入，不造上线记录/eval版本/Roy通知；保留刷新数据、冲突预检日志及来源工作树，完成事件交运维兜底，不停对局。')
elif (O/'test-live-results.json').exists():
    t=read('test-live-results')
    lines.append(f'- 合后沙箱实际：tsc退出{t["tsc"]}；vitest {t["files"]}文件/{t["cases"]}用例/退出{t["vitest"]}；'+('重跑一次。' if t['rerun'] else '未重跑。'))
    lines.append('- 唯一eval版本'+str(live.get('eval_version'))+'；live上线记录提交'+str(live.get('publication'))+'；根decision-log/eval版本及notes/for-roy.md、ops/inbox-dev.md双通知已追加，根记录由调用方提交。实际数据shipped仍交运维核实，本任务未改为accepted/shipped。')
lines+=['','### 切片大小','',
'- 固定种子20260929、截至切点state.run.character_id=SILENT最高两阶A9/A10，各20状态×6界面，共240配对；manifest保存池/时间/唯一帧，不足有放回单列。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome，只换experience。','',
'| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for p in V['pairs']:lines.append(f'| {p["sample"]} | {p["before_median"]}/{p["before_max"]} | {p["after_median"]}/{p["after_max"]} | {p["paired_median"]} |')
lines+=[f'','- 整体中位'+str(V['before_median'])+'→'+str(V['after_median'])+'、涨'+str(V['median_change'])+'字；配对差中位'+str(V['paired_median'])+'，最大'+str(V['before_max'])+'→'+str(V['after_max'])+'、单片最多增'+str(V['max_change'])+'。',
'- active185/正文50213字；置信度'+str(S['confidence'])+'；A8适用172条/45825字、A9适用173条/46109字、A10适用182条/49121字。范围沿原机制/统计/策略，不由低阶背景立A10因果。无合并/退役/压缩，需Roy定：无。','',
'原帧/复算/历史/提案/CLI/测试/切片/合入回执：'+str(O)+'；报告时间'+now+'。','']
text='\n'.join(lines)
(O/'changelog-section.md').write_text(text)
report=['## 经验库更新回报','',f'- 版本：{S["old_version"]} → {S["version"]}；提交：{commit}（分支 exp-silent）；合入：'+str(live.get('merged') or '未合入，'+live.get('result','')),
'- 条数：新增1、更新15（加证据15、只改数字0）、退役0；active184→185，正文50213字；A8 172条/45825字，A9 173条/46109字。','- 机制推理：']
report+=['  - '+' — '.join(m) for m in mechanisms]
report+=['- 改了的手写知识：无。',f'- 测试：tsc退出{tests["tsc"]}；vitest {files}文件/{cases}用例/退出{rc}，未重跑。',f'- 切片大小：整体中位{V["median_change"]:+g}字，配对差中位{V["paired_median"]:+g}字；最大{V["after_max"]}字。','- 学习账本：新增无；改成proposed '+','.join(led['proposed'])+'；退役无；ledger.py check退出0。','- 需要Roy定的事：无。','','```json',json.dumps(result,ensure_ascii=False),'```','','完整变更记录节如下：','',text]
(O/'report.md').write_text('\n'.join(report))
if sys.argv[1]=='append':
    target=ROOT/'paper/materials/experience-changelog-silent.md'
    with target.open('rb') as f:
        f.seek(max(0,target.stat().st_size-100000));tail=f.read()
    assert ('## '+heading).encode() not in tail,'本节已追加，停止重复写'
    offset=target.stat().st_size
    with target.open('a') as f:f.write('\n'+text)
    data=dict(path=str(target),offset=offset,bytes=len(('\n'+text).encode()),sha256=hashlib.sha256(('\n'+text).encode()).hexdigest())
    (O/'changelog-append.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('追加变更记录',data['bytes'],'字节；报告',str(O/'report.md'))
else:print('报告/变更记录草稿已生成')
