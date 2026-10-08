import collections
import fcntl
import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
def read(name):return json.load((O/(name+'.json')).open())
S=read('update-summary');A=read('audit');C=read('changes')['entries'];M=read('ledger-map')
V=read('slice-summary');P=read('code-proposal-ids');L=read('ledger-results');H=read('historical-mechanism-summary')
commit=(O/'source-commit.txt').read_text().strip();merge=read('live-merge')
now=subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],text=True,capture_output=True,check=True).stdout.strip()
title='## 2026-10-08 静默猎手 第一百零三次增量：2 局 A10（version 2026-10-08.20，分支 exp-silent，'+commit[:8]+'）'
test=(O/'test-source.log').read_text()
files=sum(int(x) for x in re.findall(r'Test Files\s+(\d+) passed',test));cases=sum(int(x) for x in re.findall(r'Tests\s+(\d+) passed',test))
assert (O/'test-source.rc').read_text().strip()=='0'
assert (O/'ledger-check.rc').read_text().strip()=='0'
assert files and cases
lines=[title,'','### 来源','',
 '- 记录时间'+now+'。只读notes/lessons.md:5775 BJLTVSYXCSGS及5786 Y5H4CFAQ2WTG静默小节，BJL按16:34:57勘误认0079为已学过/S1.exp97及repeat，晚于开局的S1.exp101不冒称已生效；runs615/616均SILENT/A10，未跳过。',
 '- exp-silent开工干净，git merge --no-edit main无冲突快进638fec62；先读README、最新STATE、近期决定、学习协议/提案闭环、首次构建与铁甲末两节的方法及静默第101/102节、账本README。只独立操作本角色，不派agent、不联网、不改打法源码、不运行play或模拟池。',
 '- 新局按run id rg抽594/496决策、43/32实际Codex脑请求、8/3 SL记录，states按UTC窗07:23:56.113Z—07:57:48.143Z及08:02:43.596Z—08:26:07.074Z二分seek后流读并核state.run.character_id/run_id，628/517帧；偏移/日志子集保留本批目录。Y5独立抽帧与复盘原517帧逐帧相同；两窗DeepSeek推理均0，兼容ds_*不当实际DeepSeek回答。',
 '- 全引擎学习观察截至'+A['cutoff']+'共135静默完局，分阶'+str(dict(collections.Counter(r['ascension'] for r in read('run-metadata'))))+'；1981战斗房/125实际死，其余133局只进数字/历史验证。排除缺character旧铁甲、其他角色、进行中和切点后局，不称纯Codex爬塔战绩。',
 '- 沿上一节口径：首COMBAT入房HP减同房末次尝试退出HP，开场失血/负净损保留，实际死亡单列；Monster走廊与Unknown问号战分开；入血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入血关联下一更高层首战、排Ancient，同战多源可重复；回血后战去重。独立营火/动作数分列，同房SL计一战，判死截断不计实际死。',
 '- 旧133局七数组逐行、全部血档/节点后战、休息回复与SL均重新计算一致，没有基线漂移。独立实帧31项及补充8项共39项通过，历史499段本角色主题复盘与135局日志检索交叉核验，支持与反例完整名单/分阶/动作/遭遇见historical-mechanism-summary；仅出现/持有不当整条机制支持。',
 f'- 新增0、更新22（22加证据、0只改数字）、退役0；active176→176，正文49201→48968字（压缩233），high108/med44/low24。未触55000强制压缩线，逐条旧/新文字与长度保留changes.json，未改60000测试预算。',
 '','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,h in zip(C,H):
 e=c['after'];lines.append('| '+e['id']+' | 支持'+str(e['n_support'])+'/反例'+str(e['n_contradict'])+'；分阶'+str(h['by_asc'])+'；新证'+','.join(c['new_runs'])+' | '+e['lesson']+' |')
lines += [
 '| 正路径资源守恒 | BJL初56+五火111+跨幕104+草莓7−17赢房229−事件37=12、末损12；Y5初56+四火84+事件25+餐券15+跨幕41−14赢房162=59、末损59 | 净损不等敌毛伤，SL恢复不叠回复 |',
 '| 药水独立瓶/实饮 | BJL13瓶=奖励6/商店5/事件2，11饮/1丢/1事件交换，0恢复药；Y5八瓶全部奖励/八饮/零购弃交换恢复 | 所有前战资源支出保留，不把计划带药当持有 |',
 '| 同盘SL对照 | BJL F42三试同12/83空药、T2首手/能量/敌HP/铁棒3相同，前两试15挡但毒退方柱损7，末22挡/三敌32攻损10，三试0赢 | 目标/顺序/触媒共同变，多挡不等少损；无赢的那次，不归运气；首试原线也判死，不声称保留原答必胜 |',
 '| 有限模拟与实际 | BJL F32休息512样本0胜/4轮/平均敌剩349.502，实蟹61→9/T6胜；F42原题24/24赢未执行且近似旧线已失败 | 策略/抽序/增益未受控，不由单局重拟胜率或倒推构筑必败 |',
 '| 路线条件与问号 | BJL原F40火改问号、新火F43未到，主动事件战20→21后巨斧21→12、F42败；Y5 F27预测精英67含F29回血，后实际锻造−21/餐券+15，精英实61 | 问号/手链不等已回血，替路线/休息结局未知，观察不当因果 |',
 '| 进阶 | 本两局A10；机制沿[0,20]，路线/休息/构筑沿[8,20]；跨幕只有已见A9/A10公式 | 没有高阶反驳或新退役，未观察数值/策略不外推 |',
 '', '旧基线逐行重算：','','| 数组 | 旧133局 | 加两局后 | 核对 |','| --- | --- | --- | --- |']
for name,r in read('baseline-check').items():lines.append(f'| {name} | {r["before"]} | {r["after"]} | 旧行完全一致 |')
lines += ['','各进阶/幕/房型/入血档（n为房数，局数单列，死亡单列，掉血中位仅存活房）：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
 if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','休息/商店/普通事件按入房HP关联下一战（多源可同战，不当独立局或路线因果）：','','| 进阶 | 幕 | 节点 | 血档 | 节点/去重战 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
 if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','逐阶休息与后战：','','| 进阶 | 局 | 独立火 | 回血动作/实回 | 非回血动作 | 去重后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in read('rest-summary'):
 lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["smith"]} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
lines += ['','真正重打（max attempt>1，一场多次不当多独立局）：','','| 进阶 | 重打场 | 尝试 | 赢的尝试 |','| --- | --- | --- | --- |']
for r in read('sl-summary'):lines.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
lines += ['','全部135局的boss/构装体重打汇总与经验自身支持集区分：','','| 敌 | 房/局 | 实死 | 重打场/次/赢次 |','| --- | --- | --- | --- |']
for r in read('boss-sl-comparison'):lines.append(f'| {r["enemy"]} | {r["rooms"]}/{r["runs"]} | {r["deaths"]} | {r["multi"]}/{r["attempts"]}/{r["wins"]} |')
lines += ['','- 蟹全部135局共11重打场/58次/2赢；当前经验19支持局子集为10场/52次/2赢，沿已核支持口径，不把额外仅进数字的局冒充语义支持。沙虫全样本12场46次7赢与原口径相同，新Y5没有重载。',
 '','### 经验库自己带偏或写了没被执行的地方','',
 '- 两窗DeepSeek0，实际脑均Codex；没有可核“DeepSeek逐字引条目却反向执行”的原话，不发明引用。Codex BJL F18原话“零费打击补输出省能量，三营火避精英保血”，F37理由原意译“用一次药瓶处理boss人工制品，再补毒给触媒和蜃景”；末战两次T3弃药瓶，未实际用它剥制品，不能把构筑预期当执行收益。',
 '- Y5路线原话“四营火保障升级与血线，后期单精英获取成长。”“额外过牌稳定毒防启动，左路多问号营火保血。”四次休息已实补84且F32选择回血，但F31问号实战耗6；不称忘记休息。计划想要毒雾/步法/触媒，本局未取得，不能以缺组件认定选牌错误。',
 '- BJL F42末试SL换线保留0079已学后repeat；原Jev题面24/24赢未执行、旧近似线已判死，不能认定原选可赢或多挡无代价。Y5计算下注入口是代码bug，末战SL对未知抽牌不能证明必死的限制本身正确，不把未重载归成另一个失误。',
 '','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c,h in zip(C,H):
 e=c['after'];text=e['lesson']
 if '机制：' not in text:continue
 conclusion=text.split('机制：')[0].rstrip('。')
 reasoning=text.split('机制：')[1].split('搭配：')[0].rstrip('。')
 typical=text.split('典型案例：')[1]
 lines.append('| '+conclusion+' | '+reasoning+'；局部机制与整场单因分账 | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'，分阶'+str(h['by_asc'])+'，适用'+str(e['asc'])+' | '+typical+' | '+e['id']+' |')
 mechanisms.append(dict(id=e['id'],conclusion=conclusion,n=e['n_support'],typical=typical))
lines += ['','- 力量/敏捷、毒雾/触媒/蜃景、敌制品/减力和轮初遗物逐源核。说不清整战因果的写观察；同房重试不是多局，胜利与败局均可支持局部算术，缺受控组件移除不写“因该牌赢”。支持/反例原名单完整保留，没有新反例。',
 '','### 新增','','- 无，同主题并已有条目。','','### 更新','']
for c in C:
 b,e=c['before'],c['after'];lines.append('- '+e['id']+f'：支持{b["n_support"]}→{e["n_support"]}，反例不变；正文{len(b["lesson"])}→{len(e["lesson"])}字；账本'+','.join(M[e['id']])+'。')
lines += ['','### 退役','','- 无；无反例超过支持、无新高阶推翻，本任务未修打法源码。旧退休历史保持。',
 '','### 和手写知识及代码冲突','',
 '- silent其余8份JSON逐项核字段/元数据/内容，SHA与限制见other-knowledge.json；均为生成统计/模型或有限boss-trust/double-boss，无需改的手写攻略。旧生成切点不当反例；double-boss仅4局、实际胜0且明确不能判必死/触发SL，本两局未到双boss，不重拟。改了的手写知识：无。',
 '- 当前源码turn-solver.ts:3615的drawsCards只认draw/drawsUntil，card-model.ts已有drawDiscardedHand，和Y5可打0费计算下注却未重抽的事实冲突；沿复盘purebug silent-0300及既有postmortem提案，不放DS经验、不冒认新游戏机制。完整dirty源码未保存，不把当前树当实际运行树。',
 '- 本批CLI代码提案：'+','.join(P)+'；source_task=experience-update/target_task=strategy-proposal，实际combat/potion/sl/terminal。22变更均有experience链接、账本、角色/进阶/局层回合、支持/反例、旧/新行为、时间留出方法、限制、固定验证、预期边界和回退；未登记implemented/shipped。',
 '','### 代码问题（不给 DS）','',
 '- Y5计算下注抽牌识别缺口已有0300与postmortem独立strategy-proposal，保留其observed，不作为经验库新错/游戏知识。BJL末轮模型需损6/现场8根因未记录，不仅凭差额报新bug；两套完整模拟的政策/抽序与实际未逐项受控，不由0胜反推整体模型bug。',
 '- 临时核验初稿把Y5状态数预期写成518，实际独立抽帧/复盘均517，原失败保留verify-initial-failure.log，按原帧纠正后31项通过；补充核验初稿误认弃牌动作名/标签，按实际selection/choose与select_deck_card纠正后另8项通过，两份StopIteration原日志保留。都不是控制器错误，无源码改动。',
 '- 缺完整dirty源码、BJL前两次末轮退出、换体/召唤中间全序、SL实际最优比例/受控整场、留药/更早火/替路线/组件移除胜局及boss时钟；失败稿、工作树、原日志保留，策略任务不得补预训练知识。',
 '','### 测试','',
 f'- 原入口agent/bash tools/test-sandbox.sh，TMPDIR本批目录、PATH本机node、nice19/固定1worker。tsc退出0；vitest合计{files}文件/{cases}用例/退出0，首次通过，无重跑。固定排除名单未变，沙箱外完整套件由调度器补跑，不冒报。',
 '- JSON/唯一id/scope中文名/角色/12位证据/置信度/日期/预算及240配对切片通过；旧133局审计完全一致、39项独立实帧通过；check-experience退出0/missing=[]，gitleaks源0、diff --check0。',
 '- 账本仅CLI：新增无；proposed '+','.join(L['proposed'])+'；退役无；ledger.py check退出0。首证/prior/claim/旧版本及原support/repeat历史保持，实际shipped交运维核live，经验发布不冒认策略代码实现。',
 '- live流程：'+merge['result']+'；刷新提交'+str(merge.get('refresh'))+'；合前'+str(merge.get('pre'))+'；实际合入'+str(merge.get('merged'))+'。']
if merge.get('conflicts'):
 lines+=['- '+x for x in merge['conflicts']]
if not merge.get('merged'):
 lines+=['- 合入受阻按任务停下，保留刷新数据和源提交，不硬解/覆盖；未实际上线，不造decision/eval/Roy通知，完成事件交运维兜底，不停对局。']
lines+=['','### 切片大小','',
 '- 固定种子20260929，从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP，共240配对；池/时间/唯一帧在manifest，小池有放回标记。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome，仅换经验，不把main合并或跨批样本变化当文字增量。',
 '','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in V['by_sample']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
lines += ['',f'- 整体中位{V["before_median"]}→{V["after_median"]}，涨{V["median_growth"]}字；配对差中位{V["paired_median"]}，最大{V["before_max"]}→{V["after_max"]}，单片最多增{V["max_growth"]}。',
 '- active176/正文48968；high108/med44/low24；A8适用164条/44642字、A9适用165条/44926字、A10适用173条/47876字。未合并/退役，22条替换/压缩案例净减233字，不改预算。需要Dai定：无。',
 '', '原帧/复算/机制/提案/账本CLI/测试/切片/合入回执：'+str(O.resolve())+'；报告时间'+now+'。','']
report='\n'.join(lines)
(O/'report.md').write_text(report)
(O/'changelog-title.txt').write_text(title+'\n')
changelog=ROOT/'paper/materials/experience-changelog-silent.md'
with changelog.open('a+') as f:
 fcntl.flock(f,fcntl.LOCK_EX);f.seek(0);old=f.read()
 assert title not in old
 f.seek(0,2);f.write('\n'+report);f.flush()
result=dict(task='experience-update',version=S['version'],commit=commit,merged=merge.get('merged'),added=0,updated=22,retired=0,active=176,mechanisms=[x['id'] for x in mechanisms],tests=dict(tsc=0,vitest=0,cases=cases),ledger=dict(**L,check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'mechanisms-report.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
