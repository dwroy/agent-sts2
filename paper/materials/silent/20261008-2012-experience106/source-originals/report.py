import collections
import json
import re
import subprocess
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load((O/'changes.json').open())['entries']
A = json.load((O/'audit.json').open())
R = {r['run_id']:r for r in json.load((O/'run-metadata.json').open())}
U = json.load((O/'update-summary.json').open())
S = json.load((O/'slice-summary.json').open())
M = json.load((O/'ledger-map.json').open())
L = json.load((O/'ledger-results.json').open())
commit = (O/'source-commit.txt').read_text().strip()
heading = (O/'changelog-heading.txt').read_text().strip()
now = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
live = json.load((O/'live-merge.json').open())
test = json.load((O/'test-results.json').open())
proposals = json.load((O/'code-proposal-ids.json').open())
parts = [heading,'','### 来源','',
    '- 记录时间'+now+'。只读根notes/lessons.md:5863/5927/5977的QHK1XQ928TTM、UZ1T7AH49WMB、7BNC8QX746YP静默小节，节后19:38资源范围/时间勘误按实写内容用；runs.jsonl三局均SILENT/A10，终层33/25/14、均败，无跳过。新三局34/24/14脑请求共72，实际均Codex、DeepSeek0，ds_*兼容字段不当实际DeepSeek推理。运行dirty完整源码未记录。',
    '- exp-silent开工干净；main无冲突快进至06d00cb6164908b28993e8e7e62db3475d169c1b。读README、最新STATE、近期决定、学习协议/代码提案闭环、首次构建及最近增量方法、静默104/105节和账本README。独立操作、不派agent、不联网、不运行play/模拟池、不改打法源码及其他角色知识；临时文件仅本批scratch，抽取单进程nice19，沙箱1worker。',
    '- 按局号流抽decisions/brain/sl-attempts/run-plans/jev-prompts，states与reasoning按决策UTC窗二分字节seek后流读并核state.run.character_id及run_id。新三局各746/406/152决策、767/422/159帧，原行/偏移及子集保留。49项独立数字核验通过，额外历史逐饮139瓶毒药逐一核不即时扣HP及毒/制品变化。',
    '- 全引擎学习观察截至2026-10-08T11:10:45.196Z，共140静默完局，分阶'+str(dict(sorted(collections.Counter(r['ascension'] for r in R.values()).items())))+'；2042独立战斗房/130实际死。除新三局外137局仅进数字/历史验证；排缺character旧铁甲、其他角色、进行中和切点后局，不称纯Codex爬塔战绩。',
    '- 沿上节口径：首COMBAT入房HP减同房末次尝试退出HP；开场失血/负净损保留，实际死亡单列；Monster走廊与Unknown问号分开。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入血关联下一更高层首战，排Ancient；多源可重复，回血后战去重。独立营火与动作数分列；SL截断不当实际死、同房多试计一房。',
    '- 旧137局七数组逐行、所有血档/节点后战、休息和SL汇总复算一致，无聚合漂移；582段历史静默主题复盘及140局日志交叉核验。持有/动作出现不当整条结论支持；完整支持/反例局号、分阶、动作/遭遇集合见historical-mechanism-summary。',
    '- 历史新机制扩证：彩虹32次/3局，最早XTSV1U9JD34T F45T3早于复盘所列GXN，ledger0305只CLI追加首证/说明更正，原行保留；祭品16次/2局，最早UMVLWER4CD98早于QHK，ledger0306同样补更早首证，prior unknown及旧claim保持；雕像27局均睡/醒/十力序列，首证Y6GM2CHWJBEY保持。反例0只指机制观测，不把局部收益当单因整战胜负。',
    f'- 新增3、更新23（23加证据、0只改数字）、退役0；active180→183，正文49403→{U["after"]["chars"]}字，未触55000压缩线或60000预算。重复主题合已有条目、三新机制各一条，无预算压缩或强制退役；逐条旧/新与长度见changes及下面更新列表。',
    '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after']
    asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence']))
    parts.append(f'| {e["id"]} | 支持{e["n_support"]}/反例{e["n_contradict"]}，分阶{asc}；新证'+','.join(c['new_runs'])+' | '+e['lesson'].replace('|','／')+' |')
parts += ['', '按进阶、幕、房型与入血档；房/局分列，活损中位仅未实际死房，原掉血名单/局号可由audit.json复算：','', '| 进阶/幕/房型/血档 | 房数/局数 | 实死/率 | 活房净损中位 |','| --- | --- | --- | --- |']
for b in A['bands']:
    if b['n']:
        parts.append(f'| A{b["asc"]}/幕{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]} | {b["deaths"]}/{b["n"]}={100*b["deaths"]/b["n"]:.2f}% | {b["median_win"]} |')
parts += ['', '普通节点入血关联下一场（多源可指同战，不能当独立局或随机路线实验）：','', '| 进阶/幕/节点/入血档 | 源节点/去重后战 | 实死/源节点率 | 活后战净损中位 |','| --- | --- | --- | --- |']
for b in A['transfers']:
    if b['n']:
        parts.append(f'| A{b["asc"]}/幕{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]} | {b["deaths"]}/{b["n"]}={100*b["deaths"]/b["n"]:.2f}% | {b["median_win"]} |')
parts += ['', '- 低血不同节点只作观察：A10二幕<25%入REST 27节点/27后战、7死、活损中位16.5；SHOP 6/6、2死、中位0；EVENT 17源/13后战、6个源对应死、中位1。QHK F25回血10→31后胧光胜净损16，F29回15→36后问号胜耗19，末营火17→38后boss死；UZ F21低血商店/后两事件未回血，均关联F25千足虫15入死；SY0WMJNNVRLM低血商店/事件后同F30净回血−6并胜。进场、路线、构筑和后战不同，无同资源替线对照，不推出商店比休息好或因果改线规则。',
    '', '| 进阶 | 完局 | 独立火/回血动作/其他动作 | 实回HP | 去重后战/死/活损中位 | 真正SL多试房/试次/赢次 |','| --- | --- | --- | --- | --- | --- |']
rests=json.load((O/'rest-summary.json').open())
sls=json.load((O/'sl-summary.json').open())
for r,s in zip(rests,sls):
    parts.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |')
parts += ['', '- 营火其他动作包含同火重复动作；A10 568独立火但570动作，397回血/173其他，不能把173全当173独立火。SL表只有真正多试房，单次跟踪获胜另列、不扩大重打分母；判死截断不算实际死，赢次不作独立局。',
    '- 本批天然对照：QHK蜂群两试1赢，首T2祭品实耗6、重试未打；T1毒雾/无色药及抽弃同变，不只归省6血。双蟹六试0赢，第3/6试T3同盘均直扣19＋已结毒28＝净进度47，朝向使14→20损血，多6，T5截断变T4实死；两线24/24死不抹血价，也不立固定目标。UZ千足虫四试0赢，后三试首轮同净扣38却少损5血，但抽弃/目标同变、无段死/重接；最后6血13挡对34需损21、存活差16。7BNC无SL。更多旧重打动作/抽牌差异保留逐局analysis及attempts/explore/draws，不把同房多试当独立证据局。',
    '', '### 经验库自己带偏或写了没被执行的地方','',
    '- 实际DeepSeek推理0，不能编造“DeepSeek引某条目”原话；Codex full-prefix元信息、答案及question_id保存brain-answers.json，实际引经验id的因果链未记录。以下只列可核的计划/执行差异，不判知识库已因果带偏。',
    '- QHK原话“黄金印补足能量；双商店三营火保血。”；之后精英/走廊/问号胜线仍耗24/16/19，F29所选回血boss投影57、实际38；不能把计划保证当实到血，未有另一条路线整场。',
    '- UZ原话“免费强化打击配余像，走早商店与安全营火线。”；实际F19/20共耗52，F25入口15且F27营火尚未到，两毒雾两触媒没有已结毒。未来计划和已发生资源分列，不认定手链购买必错。',
    '- 7BNC原话“两精英均有休息缓冲，早期商店补强，保住首领战血量。”；实际异鸟耗36、营火只回21到31、雕像死。F14T2原单牌参考1/8后又实打冲刺，原短线胜样本已不对应实线；没有“不追加冲刺”的完整胜次。',
    '', '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:
        continue
    rationale=e['lesson'].split('机制：',1)[1].split('决定胜负的战斗：',1)[0]
    example=e['lesson'].split('典型案例：',1)[-1]
    summary=e['lesson'].split('机制：',1)[0]
    asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence']))
    parts.append(f'| {e.get("name",e["scope"])} | {rationale} | {e["n_support"]}/{e["n_contradict"]}；{asc} | {example} | {e["id"]} |')
    mechanisms.append(dict(id=e['id'],mechanism=e.get('name',e['scope']),conclusion=summary,support=e['n_support'],case=c['new_runs'][-1]))
parts += ['', '- 支持局数是独立run，重复触发/SL不扩n；每个机制的原始effect、层/回合/UTC见audit与history-*。力量/敏捷、毒、被动挡与自损分源，机制成立不证明单因素胜因。彩虹缺某类回合、无毒触媒、毒雾建后即死都是适用条件边界，不是触发机制反例。没有观察到因果的路线/抽牌/组件胜利比较明确写观察。',
    '', '### 新增','']
for c in C:
    if c['kind']=='added':
        e=c['after'];parts.append(f'- {e["id"]}：{e["scope"]}；支持{e["n_support"]}/反例{e["n_contradict"]}，账本'+','.join(M[e['id']])+'。完整典型案例及限制见机制表。')
parts += ['', '### 更新','']
for c in C:
    if c['kind']=='updated':
        b,e=c['before'],c['after'];parts.append(f'- {e["id"]}：支持{b["n_support"]}→{e["n_support"]}、反例不变；正文{len(b["lesson"])}→{len(e["lesson"])}字；账本'+','.join(M[e['id']])+'。')
parts += ['', '### 退役','', '- 无；无新高阶反驳、无反例超过支持，无此次已修打法机制；旧退役历史保留。',
    '', '### 和手写知识及代码冲突','',
    '- 核对silent其他8份JSON的来源/字段/内容及SHA，other-knowledge保留切点；均为生成统计/模型或boss-trust/double-boss有限证据文件，无需改的手写攻略。不同生成切点/统计净损口径不当本批首COMBAT→出口的反例；本批未到双boss，不以三局重新拟合4局有限终局模型。改了的手写知识：无。',
    '- 当前agent/src/reflex/card-model.ts:1618只在observedPoison有观测量时构建毒药效应，combat-plan.ts:3135参数只从已观察双boss传递；本批题面毒药数值未知/未模拟，与实际施毒分列，待独立提案验证覆盖，不判当前模型和dirty运行树一致。当前HP护栏最小8宽限下6点损差未替换，符合现规则，不报纯bug；前缀排名与实际重问/SL覆盖的比较也不当“代码强打冲刺”。',
    '- 本批三代码提案'+','.join(proposals)+'，source_task=experience-update、target_task=strategy-proposal，实际combat/potion/sl/terminal；26改动均有自己的experience/账本/证据链接、旧/新行为、分阶和时间留出、缺数据、验证/影响及回退。队列pending，不登记implemented/shipped；经验发布与策略代码实现分开。',
    '', '### 代码问题（不给 DS）','',
    '- 没有新控制器纯bug。抽取核验初稿误用audit直接completed药水子集核全部实饮，漏QHK9/UZ2个随机药pending选择阶段；改按原动作及资源帧分账，直接13/8加pending9/2才是22/10。通用药效已完成子集仍留原口径以复算历史，不把pending当失败。另一初稿把双蟹47净进度当直伤，按原帧分为直19＋已结毒28；两失败日志保留verify-initial-failure/verify-second-failure，未改控制器。',
    '- 仍缺完整dirty源码、部分独立归零/召唤/同ID持久身份及毛伤、SL截断出口、未执行留药/路线/营火/组件移除/原短线的完整结局、boss时钟估伤与未抵达二三幕资源。没有用预训练补机制，没有从有限全败推确定必死或统一杀序。',
    '', '### 测试','',
    f'- 原沙箱入口agent/bash tools/test-sandbox.sh：TMPDIR本批scratch、PATH本机node、nice19/1worker；tsc退出{test["tsc"]}，vitest {test["files"]}文件/{test["cases"]}用例/退出{test["vitest"]}；'+('没有重跑。' if not test.get('retry') else '高负载首轮失败后原入口完整重跑，失败日志保留。')+'测试用固定数据，不改测试/预算/排除名单。调度器另补沙箱外完整套件，不冒报外部通过。',
    '- JSON/唯一id/合法scope/中文名/12位角色证据/置信度/last_seen/预算及240配对切片校验过；旧137局基线完全一致、49独立原帧断言和139毒药逐饮验证通过；check-experience退出0/missing=[]，gitleaks源0，git diff --check0。',
    '- 账本只CLI：新增无；proposed '+','.join(L['proposed'])+'；退役无；ledger.py check退出0。原claim/prior/证据/状态/版本历史保留，0305/0306首证的日志更正另追加而不覆盖。实际数据shipped交运维按live完成事件核实。',
    '- live锁内结果：'+live['result']+'；刷新'+str(live.get('refresh'))+'；合前'+str(live.get('pre'))+'；实际合入'+str(live.get('merged'))+'。']
for x in live.get('conflicts',[]):
    parts.append('- '+x)
if not live.get('merged'):
    parts.append('- 按任务冲突停止，不硬解或覆盖；源提交与刷新保留，完成事件交运维兜底。未实际上线不造decision/eval/Roy通知，不停对局。')
else:
    parts.append('- 合后原沙箱检查通过；版本/decision和通知回执见live-publication.json；代码提案继续独立策略闭环。')
parts += ['', '### 切片大小','', '- 固定种子20260929，截至切点state.run.character_id=SILENT最高A9/A10每界面20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对；manifest记录池/时间/唯一帧及不足时有放回补足。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结相同common/silent/outcome，仅换经验。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in S['pairs']:
    parts.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
parts += ['',f'- 整体中位{S["before_median"]}→{S["after_median"]}，涨{S["median_change"]}字；配对差中位{S["paired_median"]}，最大{S["before_max"]}→{S["after_max"]}，单片最多增{S["max_change"]}。',
    f'- active{U["after"]["active"]}/正文{U["after"]["chars"]}；置信度{U["after"]["confidence"]}；'+','.join('A'+a+'适用'+str(v['entries'])+'条/'+str(v['chars'])+'字' for a,v in U['after']['by_asc'].items())+'。未做预算压缩/合并退役，未超预算。需Dai定：无。',
    '', '原帧/复算/机制/提案/CLI/测试/切片/合入回执：'+str(O.resolve())+'；报告时间'+now+'。','']
report='\n'.join(parts)
(O/'report.md').write_text(report)
(O/'mechanism-report.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
result=dict(task='experience-update',version='2026-10-08.23',commit=commit,merged=live.get('merged'),added=3,updated=23,retired=0,active=183,mechanisms=[r['id'] for r in mechanisms],tests=dict(tsc=test['tsc'],vitest=test['vitest'],cases=test['cases']),ledger=dict(**L,check=0),code_proposals=proposals,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('报告生成',len(report),'字；',len(mechanisms),'个机制。')
