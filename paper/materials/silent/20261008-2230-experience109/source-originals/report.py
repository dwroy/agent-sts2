import collections
import json
import re
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
def read(n):return json.load((O/(n+'.json')).open())
A=read('audit');C=read('changes')['entries'];U=read('update-summary');V=read('slice-summary');M=read('ledger-map');H={e['id']:e for e in read('historical-mechanism-summary')}
commit=(O/'source-commit.txt').read_text().strip()
heading=(O/'changelog-heading.txt').read_text().strip()
live=read('live-merge') if (O/'live-merge.json').exists() else dict(merged=None,result='尚未执行合入')
ledger=read('ledger-results')
testfile='test-source-retry.log' if (O/'test-source-retry.rc').exists() else 'test-source.log'
rc=int((O/testfile.replace('.log','.rc')).read_text())
log=(O/testfile).read_text()
tests=dict(tsc=0 if ' RUN ' in log else rc,vitest=rc,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))),rerun=testfile!='test-source.log')
(O/'test-results.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2)+'\n')
mechanisms=[]
names={'silent-strength-weak-observation':'力量与敏捷','silent-deck-burst-observation':'能力与收益兑现','silent-lagavulin-siphon-poison-sl':'族母吸取','silent-gardener-skittish-shield':'胆小补盾','silent-ceremonial-beast-threshold-growth-sl':'仪式兽阶段阈值','silent-ceremonial-beast-ringing-one-card':'仪式兽昏眩'}
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    conclusion=e['lesson'].split('机制：')[0]
    mechanisms.append((e.get('name') or names.get(e['id'],e['id']),conclusion,f'{e["n_support"]}支持/{e["n_contradict"]}反例',','.join(c['new_runs'])))
result=dict(task='experience-update',version=U['version'],commit=commit,merged=live.get('merged'),added=U['added'],updated=U['updated'],retired=U['retired'],active=U['active'],mechanisms=[' — '.join(m) for m in mechanisms],tests={k:tests[k] for k in ['tsc','vitest','cases']},ledger={**ledger,'check':int((O/'ledger-check-final.rc').read_text())},code_proposals=read('proposal-ids'),implementation_domains=['combat','potion','sl','structure'],report=str(O/'report.md'))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
now=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
lines=['## '+heading,'','### 来源','',f'- 记录时间{now}。只读根notes/lessons.md:6125/6180的2H311EAD34GD与WZL2AMEY85S7静默小节；按第一局21:05账本标签勘误，不把事后上线称为本局已使用。runs.jsonl:624/625均SILENT/A10/F17败，没有角色跳过；两局完整dirty运行源码未记录。','- exp-silent开工干净，git merge --no-edit main无冲突完成；已读README、最新STATE、decision-log近期决定、学习协议/代码提案、首次构建/末两节方法和静默107/108节、账本README。独立执行，不派agent、不联网、不运行play/模拟池、不改打法源码/其他角色；scratch限定本任务，抽数据nice19单进程，沙箱1worker。',
'- 新局按局号抽647/381决策、16/15脑请求、各6条SL，states/reasoning以决策UTC窗二分字节seek流读，核run_id与state.run.character_id；窗12:11:49.529Z—12:37:00.893Z和12:42:02.476Z—13:16:41.806Z。脑均Codex，DeepSeek实际推理0；旧ds_*字段不证引擎。逐局文件/偏移/原帧保存在本批目录。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(A["runs"])}静默完局、{len(A["fights"])}独立战斗房、{sum(f["death"] for f in A["fights"])}实际死，分阶'+str(dict(collections.Counter(r['ascension'] for r in read('run-metadata'))))+'；除新两局外142局只进数字/历史验证。排其他角色/缺character旧铁甲/进行中/切点之后，不称纯Codex爬塔战绩。',
'- 口径沿上一节：战内净损=首COMBAT入口HP−同房最后尝试退出HP，含自损/回复/负损，不作敌毛伤；实际死亡单列，SL判死截断不当实死。Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口血关联下一更高层首战、排Ancient，多节点可重复关联；回血后战去重，营火房与动作分列。SL同房六次计一房/一局。',
'- 旧142局七数组逐行、全部血档/节点后战/回血/SL复算一致，原2066房/132死可重现；baseline-check保留。本两局16房及SL局部盘面/实结、末轮死亡需求/毒/反伤等23项断言通过，657段静默主题复盘与全日志验证；动作/持有出现不自动扩大整条支持数。',
'- 历史数字更正：铁心原19支持局35饮的子集可重现，但全角色历史还有SY0WMJNNVRLM A10 F14T1一饮：33血0挡/无覆甲→33血0挡/覆甲7。本次补该漏计支持，再加新局六饮，21局42饮全部覆甲+7/旧挡不变，非改口径。光滑石头91房首帧均1敏；步法897动作中五净增1窗口带TENDER1且同帧力量−1，属于建立2与已见柔嫩削1叠加，非牌文本反例；原帧留footwork-history-special-frames。',
f'- 新增0、更新15（15加证据、0只改数字）、退役0；active185→185，正文50213→{U["chars"]}字，低于55000压缩线/60000预算；没有预算合并/压缩/退役，旧退役历史保持。','','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];h=H[e['id']]
    lines.append('| '+e['id']+' | 支持'+str(e['n_support'])+'/反例'+str(e['n_contradict'])+'；分阶'+str(h['by_asc'])+'；账本'+','.join(M[e['id']])+' | '+e['lesson'].replace('|','/')+' |')
lines+=['','以下按进阶/幕/实际房型/入口血档列下一战；n为独立房，同局可贡献多房，死亡率=实死房/n，活战净损中位包含负值。','', '| 进阶 | 幕 | 房型 | 血档 | 房数/局数 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['bands']:
    if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["type"]} | {b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','REST/SHOP/EVENT按入口血档关联后首战；同一战多源可重复，不是节点因果比较。','', '| 进阶 | 幕 | 节点 | 血档 | 节点数/去重后战 | 实死/率 | 活战净损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for b in A['transfers']:
    if b['n']:lines.append(f'| A{b["asc"]} | {b["act"]} | {b["screen"]} | {b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["deaths"]/b["n"]*100:.2f}% | {b["median_win"]} |')
lines+=['','| 进阶 | 局数 | 独立火/回血动作 | 实回HP | 去重回血后战/死 | 活战净损中位 | SL多试房/尝试/赢次 |','| --- | --- | --- | --- | --- | --- | --- |']
sl={s['asc']:s for s in read('sl-summary')}
for r in read('rest-summary'):
    s=sl[r['asc']];lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
lines+=['','本次关键资源链：两局四火各回21共84，获胜战分别净耗82/91，事件耗6/9，56＋84−82−6＝52、56＋84−91−9＝40进boss。2H311EAD34GD精英55→4耗51，休息4→25、后走廊25→14，再休息14→35、胜战损4后31→52；入场铁心/迅捷两药。WZL2AMEY85S7 F6胜45→2耗43，F7回2→23并避精英，变牌付9到14、F9回到35、F12再到56；F13/14虽胜仍耗23/14，F16只19→40、空药进boss。改变路线的两条已走实况构筑/敌人不同，没有同资源替线整场结局，不立安全血线或因果更好。','',
'SL实盘对照：族母六试0赢，前五T13/14/13/14/12判死读档，末T12实际死；第4/5次T4完整同手/52血/3敏/6覆甲，撤防御实扣25→31、多6伤，实损1→9、多8；五轮均0/24死、整战B2均0/1200。仪式兽六试0赢，前五T8/8/7/8/8判死，末T8实死；第1/3次T4同手/20血/敌216/4力/7毒，撤防御实扣28→34、多6，实损13→18、多5；B2均0、第三次各1200，五轮24/24死。后继动作/抽牌亦变，截断动作不补结算，局部血价可比较，整场胜因/运气未隔离，不定探索门槛。','支持集合内历史重打汇总：'+json.dumps(read('boss-sl-history'),ensure_ascii=False)+'；胜次逐回合保留原复盘/日志，不把新两局六次当独立构筑样本，也不由公式支持数当过关数。','','### 经验库自己带偏或写了没被执行的地方','',
'- 实际DeepSeek请求/推理0，无DeepSeek引用条目原话；Codex/Jev题面与答复保留，未记录具体经验id造成选择的因果链。',
'- 族母局三次计划想要毒雾/致命毒药，实际21牌无任何施毒牌；奖励/商店没有提供这些毒牌，不称拒买可得牌。F1路线原话“双商店四营火，夹火单精英，稳拿首领额外遗物。”四火双店已走、精英胜仍损51；boss未过，额外遗物未兑现。睡期步法建立不取消后段吸取。',
'- 仪式兽路线原话“普通战触发钓鱼竿，营火商店强化后挑战晚期精英。”F6损43后确已F7改避精英；avoid毒雾后第三张由付9血变防御随机得到，不是主动再拿奖励。F12题面HEAL后boss输入70/模拟88%，实际后两走廊损37、boss40，不把愿望当实到或由单次差额判模拟bug。',
'- 族母第5试rationale先写HP guard换为防御，随后“SL explore (T4, the 8th latest question before attempt 4\'s death on T14)”再撤防御；仪式兽第3试写“among those B2 rates no worse”。原模型并列不能证明即时血价相等。相关中文释义与引号中的原话分开，不把SL改线归Jev原选。','','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    h=H[e['id']];reason=e['lesson'].split('机制：',1)[1].split('决定胜负的战斗：',1)[0];case=e['lesson'].split('典型案例：',1)[-1]
    lines.append('| '+(e.get('name') or e['id'])+' | '+reason+' | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'；'+str(h['by_asc'])+' | '+case+' | '+e['id']+' |')
lines+=['','机制/触发沿实盘公式，数值由现场层数/已观察进阶核，跨牌推论放general:plan/deck，具体组件放对应card/relic/potion；策略/统计原范围不变。支持局数不是组件使整场必胜的因果样本；无组件移除/纯时点替线完整对照，胜败均保留，只有相关性写观察。',
'族母末T12需削233本体，实际154仍欠79；每吸取降低后续直伤/牌挡，不能用早3敏两挡16替末8。仪式兽末需削262，8轮153（行动75/毒63/荆棘15）仍欠109；毒跨160可取消当轮攻击，仍不能取消后段17跺地/单牌限制。末11血或8血被截断到0，完整需损17/9及存活缺7/2血是不同预算，不当差7/2伤斩杀。','','### 新增','','- 无，同主题并入已有条目。','','### 更新','']
for c in C:
    lines.append('- '+c['id']+'：支持'+str(c['before']['n_support'])+'→'+str(c['after']['n_support'])+'、反例'+str(c['after']['n_contradict'])+'；加证据'+','.join(c['new_runs'])+'；更新案例/汇总，账本'+','.join(M[c['id']])+'。')
lines+=['','### 退役','','- 无。本任务没有代码修复上线、反例超支持或高阶推翻；旧retired保留，无预算合并/压缩。','','### 和手写知识及代码冲突','',
'- 核对静默其他8份JSON的结构/用途/证据与SHA（other-knowledge），均为生成模型、统计或boss-trust/double-boss证据；不同切点/统计口径不当机制反例。本两局未到二三幕或双boss，不据其败局改终局模型。需修改的手写知识：无。',
'- 不改源码手写知识。参考sl/explore.ts:1506允许B2不劣的未试线，combat-plan.ts:4063一带探索调用可替换护栏结果，已观察符合既定取舍，不指控新纯bug。完整dirty运行树未知，不称参考源码与当时全部等价。单牌、覆甲、真实战损/药槽和未知未来组件交独立提案核当前实现，正确模型保持等价。',
'- 三代码提案'+','.join(result['code_proposals'])+'；source_task=experience-update、target_task=strategy-proposal，实际domains combat/potion/sl/structure。15变更经验均有id/本角色证据/账本/旧新行为/时间切分/限制/验证/影响/回退。本任务未实现打法源码，不标implemented/shipped；证据不足保持现规则、由独立任务记录waiting，不因“人定规则”拒绝已有授权的数据提案。','','### 代码问题（不给 DS）','',
'- 无新增纯bug。末仪式兽实际生存者8挡、余牌被hook阻止，与当前单牌限制一致；末毒跨阈值取消攻击实际保8血，不据mod未计毒的lethal字段认定模型错。',
'- 数据限制：完整dirty源码、前五次SL未执行退出/结算、部分独立归零/过量及毛伤、共帧内部时点、完整实际执行最优比例、替代构筑/路线/药时点/纯换一牌的整战反事实、未到二三幕与F48/F49资源、时钟所需/估计及比值、Jev缓存和实际费用均未知，不由预训练补。',
'- 原帧校验初稿把combat/plan续问误当combat/plan-choice首题而比较到已消费的手牌，修正精确label后完整同盘一致；铁心初稿按原支持集合假设41饮/20局，发现SY历史漏计后改42/21。两份失败日志原件保留，均未改测试、预算或运行代码。历史步法五净增1帧按已记录柔嫩解释，原数据保留。','','### 测试','',
f'- 原入口bash agent/tools/test-sandbox.sh，TMPDIR本批scratch、PATH本机node、nice19/SANDBOX_WORKERS=1；固定数据，不设CHARACTER，切片设silent。tsc退出{tests["tsc"]}；vitest{tests["files"]}文件/{tests["cases"]}用例/退出{tests["vitest"]}，'+('重跑一次，原日志保留。' if tests['rerun'] else '未重跑。')+'不改预算/排除名单，不冒报沙箱外完整套件通过。',
'- JSON/唯一id/scope/中文名/12位本角色证据/置信度/last_seen/60000预算/240配对切片通过；check-experience missing=[]/退出0，ledger.py check退出'+str(result['ledger']['check'])+'；gitleaks和git diff --check结果随本批保留。',
'- 账本仅CLI：新增[]；proposed '+','.join(ledger['proposed'])+'；retired[]。'+str(len(ledger['proposed']))+'账本来源覆盖15经验；0079两boss的原repeat保留，0277只追加历史缺支持，首证/prior/旧claim/旧状态/旧版本不改。实际数据shipped交运维据live完成事件核实，三独立代码提案不冒称实现。',
'- live锁内结果：'+live['result']+'；刷新'+str(live.get('refresh'))+'；合前'+str(live.get('pre'))+'；实际合入'+str(live.get('merged'))+'。']
if live.get('conflicts'):lines+=['- '+c for c in live['conflicts']]
if live.get('merged'):
    lines.append('- 合后沙箱tsc/vitest退出'+str(live.get('tests_retry',live.get('tests')))+'；发布'+str(live.get('publication'))+'；eval版本'+str(live.get('eval_version'))+'；具体原日志及上线/Roy双通知见publication。')
else:lines.append('- 未实际合入，不造上线/eval版本/Roy规则通知；保留刷新/预检/失败日志/源提交，按任务停于冲突，交调用方和运维兜底，不停对局。')
lines+=['','### 切片大小','',
'- 固定种子20260929、截至切点state.run.character_id=SILENT的最高两阶A9/A10，各20状态×6界面，共240前后配对；manifest保存池/时间/唯一帧，不足有放回单列。CHARACTER=silent调用官方knowledge-slice.ts，common/silent/outcome冻结同一份，只换experience。',
'','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for p in V['pairs']:lines.append(f'| {p["sample"]} | {p["before_median"]}/{p["before_max"]} | {p["after_median"]}/{p["after_max"]} | {p["paired_median"]} |')
lines+=['',f'- 整体中位{V["before_median"]}→{V["after_median"]}、涨{V["median_change"]}字；配对差中位{V["paired_median"]}，最大{V["before_max"]}→{V["after_max"]}、单片最多增{V["max_change"]}。',
f'- active185/正文{U["chars"]}字符；置信度'+str(U['confidence'])+'；A8适用'+str(U['asc']['8'])+'；A9适用'+str(U['asc']['9'])+'；A10适用'+str(U['asc']['10'])+'。没有压缩、预算变更或需Roy定的规则；合入受阻由现行运维兜底流程处理。','', '原帧/数字/历史/提案/CLI/测试/切片/合入回执：'+str(O)+'；报告时间'+now+'。','']
section='\n'.join(lines)
(O/'changelog-section.md').write_text(section)
summary=['## 经验库更新回报',f'- 版本：{U["old_version"]} → {U["version"]}；提交：{commit}（分支 exp-silent）；合入：'+str(live.get('merged') or '未合入'),f'- 条数：新增0、更新15（加证据15、只改数字0）、退役0；active185→185，正文{U["chars"]}字符；A8 172条/{U["asc"]["8"]["chars"]}字符，A9 173条/{U["asc"]["9"]["chars"]}字符','- 机制推理：']
summary+=['  - '+' — '.join(m) for m in mechanisms]
summary+=['- 改了的手写知识：无',f'- 测试：tsc {tests["tsc"]}；vitest {tests["files"]}文件/{tests["cases"]}用例/{tests["vitest"]}；'+('重跑一次' if tests['rerun'] else '未重跑'),f'- 切片大小：中位涨{V["median_change"]}字；最大{V["after_max"]}字','- 学习账本：新增无；改成proposed '+','.join(ledger['proposed'])+'；退役无；ledger.py check退出'+str(result['ledger']['check']),'- 需要Roy定的事：无','', '```json',json.dumps(result,ensure_ascii=False),'```','',section]
(O/'report.md').write_text('\n'.join(summary))
if '--append' in sys.argv:
    path=ROOT/'paper/materials/experience-changelog-silent.md'
    with path.open('r+') as f:
        content=f.read()
        assert '\n## '+heading not in content,'本节已经追加，拒绝重复'
        f.seek(0,2);offset=f.tell();f.write('\n'+section)
    (O/'changelog-append.json').write_text(json.dumps(dict(path=str(path),offset=offset,chars=len(section)+1,heading=heading),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
