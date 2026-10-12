import collections
import datetime as dt
import json
import math
from pathlib import Path

P = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
def read(name): return json.loads((P/name).read_text())
def wilson(k, n):
    z = 1.959963984540054
    center = (k/n + z*z/(2*n))/(1+z*z/n)
    radius = z*math.sqrt(k/n*(1-k/n)/n+z*z/(4*n*n))/(1+z*z/n)
    return {'k': k, 'n': n, 'p': k/n, 'wilson95': [center-radius, center+radius]}
def rate(x):
    return f"{x['k']}/{x['n']} = {100*x['p']:.1f}% [{100*x['wilson95'][0]:.1f}, {100*x['wilson95'][1]:.1f}]"
rows = read('sample-table.json')
stats = read('statistics.json')
exp = read('experience-timeline.json')
groups = collections.defaultdict(list)
for row in rows:
    groups[(row['start_version'], row['config_sha'], row['brain_source']['source'])].append(row)
config_groups = []
for (version, config, engine), rr in groups.items():
    config_groups.append({'start_version': version, 'config_sha': config, 'actual_engine': engine,
        'run_ids': [r['run_id'] for r in rr], 'n': len(rr),
        **{key: wilson(sum(r[key] for r in rr), len(rr)) for key in ['reach33', 'reach48', 'act2_road_death']}})
(P/'actual-config-groups.json').write_text(json.dumps(config_groups, ensure_ascii=False, indent=2)+'\n')
publication = read('publication.json') if (P/'publication.json').exists() else {'state': 'not_merged'}
text = '''# 静默猎手 A10 回退排查 — 2026-10-08

结论：冻结样本不能支持把近期下降归因于 S1.double-boss1，原38/45分组可精确复现为早八小时的完局时间切点。正确启动源码的 Codex-only 到F48为10/50→6/27，到F33为24/50→15/27；较低段已经出现在exp62至double上线前。宽区间、种子与同步配置/经验变化仍允许较大正负影响，不据“不显著”归为正常波动。本批核查五项范围，不撤double、fix45、bullet-time、sloth或历史经验，也不扩展打法优化。

发现并只修一项直接可证的实验协议问题：非boss Silent Jev药水上下文混入硬编码铁甲A8/A9统计。最早已核C48LLXBGKXQ9 A0 F2T1、本窗口MGA0CZDDKC0P A10 F2T1即存在，故不是近期新增回归。12353条A10请求中5454条包含它，分别一幕2359、二幕1991、三幕1104。移除Silent的data字段，保留原note、本角色经验、计划、候选、评分、药水血价和SL；铁甲/未知/其他角色等价。来源违规直接可证；对选择和胜率的因果影响未知。

## 冻结、口径和可还原性

统计截止2026-10-08T01:05:21Z（北京时间09:05:21）。83个已结束的独立Silent A10局；K2JAGKVJAWZJ未结束，排除。实际接受的脑回答判定77 Codex-only、5 DeepSeek、1 mixed、0 unknown；默认战绩只用77。SL按同run_id合并为一局，另列尝试/重载与首试，禁止把重复回合当独立样本。终局F33/F48定义实际到达层数，二幕路上死亡指第二幕且<33，包含精英；hallway/unknown另列。

run-config的process.started、源码commit、dirty清单、config_sha及实际brain.jsonl回答共同分组，不用完局时间或标签推上线。85份配置/进程日志对应83局，JMH5C51RLN4E和TD1HVGS7H6LB重启过源码（首/尾均在double前）。启动dirty清单无agent源码；源码提交/树可还原，历史完整dirty知识树不可还原。35局脑prefix哈希局内变化，不能把启动经验当全局每题版本；完整脑system-prefix正文未保存，只能核实际脑payload和Jev原题。sample-table.json保留完整配置/源码/引擎，source-tree-manifest.json保存八个相关历史树及逐blob校验，历史源码以.ts.txt保存原字节，避免把证据副本误当可执行项目源码。

已实际运行eval/metrics.py --character silent --ascension 10 --group-by version及config，--no-sync --no-calibration --until上述切点，使用冻结DB/日志及项目strength-sources原工具导出的固定集合。原tsx IPC受沙箱EPERM失败保留；用node --import tsx/loader执行同一导出工具后两次metrics成功。metrics的结束源码标签分组是原始输出，下面按实际启动配置/祖先纠正；两种不混用。数据库/日志冻结清单见freeze-manifest.json；51637帧偏移、49887决策偏移、1074战斗、2476层、2488脑记录、12353Jev原题及85控制台原件保留。

## 实际分组的比例与限制

括号为Wilson 95%区间，单位%。观察者10/38→7/45、21/38→19/45精确对应ended<2026-10-06T22:11Z，即北京时间10-07 06:11，早于所述14:11八小时；且结束时间不是暴露时间。S1.double-boss1源e1a467e18a0dfa8d99046a24ff4c0e1af59278c8，实际live合并ac076f8a71f101de62d5345fa6b4fca248fd928c（13:59），14:11为登记；第一实际启动暴露DUZUBAJ3A8GP在14:25。祖先与正确启动时间分组均为全样本56/27、Codex50/27。

|群体/阶段|F33|F48|二幕路上死亡|首试F48|
|---|---|---|---|---|
'''
for cohort in ['all', 'codex', 'deepseek', 'mixed']:
    for phase, group in stats[cohort]['ancestry'].items():
        if group['n']:
            text += f"|{cohort}/{phase}|"+'|'.join(rate(group[k]) for k in ['reach33','reach48','act2_road_death','first_reach48'])+'|\n'
text += '\n|Codex实际连续阶段|F33|F48|二幕路上死亡|\n|---|---|---|---|\n'
for phase, group in read('early-decline.json')['groups']['codex'].items():
    text += f'|{phase}|'+ '|'.join(rate(group[k]) for k in ['reach33','reach48','act2_road_death'])+'|\n'
text += '''
Codex post−pre Newcombe95差值：F33 +7.6个百分点[-15.1,+29.0]；F48 +2.2[-15.2,+22.7]；二幕路死+4.2[-13.1,+24.5]；首试F48 −3.2[-18.8,+16.3]。首试F33 19/50→14/27；SL尝试行290→168、重载168→102，这些不是额外独立局。版本样本通常1–2局，无法拆出某版本独立效果；exp62切点是事后定位，不做预注册因果检验，不认为较低段必由exp62引起。未知/混合dirty知识及种子差未控制，需未来独立局而非用“不显著”盖过bug。

## double-boss：调用、题面与资源链

逐源码核doubleBossFor限定silent、A10、act_id+1=3、LEVEL_10；prep要求F<48，firstDoubleBoss在F48。buildFacts/B3准备、两战连续估值、F48终局/药水保留及F48/F49毒药水范围均在对应门控内，缺continuation时通用路径等价。brain实际payload共103个double标记，全在第三幕，一二幕0；未发现三幕规则泄漏至早期题面/权重的证据。没有完整历史dirty prefix，不能据此保证所有未知prompt全文都无影响。

Codex精英数均值一幕0.84→0.889、二幕0.34→0.444（以全局为分母，生存长度混杂）。入二幕33→21局，平均HP63.06→63.00、最大HP比例85.59%→86.54%、牌数23.70→24.76、药水0.727→0.714。一幕休息HEAL110/SMITH50→HEAL53/SMITH32/DIG1；二幕HEAL55/SMITH29/KINDLE2→HEAL42/SMITH10。卡奖励take/skip一幕346/25→194/15，二幕140/38→90/27；为题数、重复SL另存，不推固定路线优劣。二幕赢走廊战128战/33局平均损12.523→89战/21局12.539；药水行80→52，可能包含同库存的重打，不能当独立耗药量。route-build-resources.json及route-predictions.json保留决策/预测、220路线计划、2291到达节点与41先死记录。

上线后六局二幕路死的赢战耗损链（HP按实际观察顺序，不能声称缺某耗损就能转胜）：

|局号|入二幕HP/药水|主要耗损及死亡|
|---|---|---|
|DUZUBAJ3A8GP|64/0|F19地道虫64→30，F22卵孵者45→33，F27棱柱82→26，F29千足虫68→21，F30甲虫/盛碗虫死|
|1913SE84AXQF|58/1|F19 58→44，F23盗贼44→40，F29啃咬者61→46，F31千足虫精英46→0|
|P74C04AEPL1F|61/0|F19外骨骼61→61，F21盗贼61→53，F22墨影53→9，F23盛碗虫9→0|
|BTSRF7JL1W1Y|60/0|F30蟾蜍70→42，F31甲虫42→0；T2旧生存者后继计划被弃，与0268一致|
|7X0W3U8TVA2A|61/1|F22螨54→51，F30蟾蜍70→67，F31千足虫精英67→0；旧重接/生存者限制|
|MTQ0EUBJ3R6T|59/1|F19盗贼59→46，F20地道虫46→8，F23螨死；四试同药库存不能累计作八瓶|

所有16局二幕路死（含DeepSeek/mixed）全链在resource-chains.json，含SL和休息偏移。熟睡甲虫+盛碗虫组合死亡实际五局：BVF22RSFVBS9 F23、2Y27VAYZDA02 F22、2K4H3JEJHRSB F23（均double前）、DUZUBAJ3A8GP F30及BTSRF7JL1W1Y F31（后）；另P74 F23只有盛碗虫。原“四次”只是待核线索，与本冻结83局不一致，原件beetle-bowl-deaths.json另列，不把遇敌次数或战败直接判回归。

## Codex-only：答题失败、恢复与实际执行

按真正启动配置，fallback_configured46局1350脑行：Codex成功1242、DeepSeek108（5纯DeepSeek+1mixed均另列）；Codex调用1254行1241answered、11error、2stalled，13个内部失败/重试涉及event/plan3、event/choose7、reward/card1、map/statue-potion2。fallback_disabled自2Y27VAYZDA02启动2026-10-07T01:07:33.369Z（09:07），37局1138脑行：1137成功Codex、1失败；调用1137answered/1failed。配置实禁用早于V4.codex-only1源码正式部署三局：按该源码部署分段另外是49/34局、1462/1026脑行（Codex1354/1025、DeepSeek108/0）。两种边界都保存，主取消兜底比较用真实配置，不能用上线登记代替实际配置。历史deepseek_calls不是实际引擎，例如纯Codex PD9AYQVMLQW6计54、L2TSFU62Z57Z17、ZTRGYYMLR8SC16，按接受回答证据判定，不能作脑代答。

唯一取消后失败KEN58SH9SLZ6 F16 rest/plan，qid muy1x7l6-2556865-17，12:07:50.390Z overloaded。等待自12:07:44.108Z，7行pause/heartbeat/resume；同题Codex12:09:11.679Z成功，12:09:11.681Z choose_rest_option=0完成，下一帧12:09:11.910Z HP46/81→75/86。失败窗口无dispatch，Jev/代码脑替答0；原帧、错误、答案、执行及wait保留。取消前纯DeepSeek局由Codex可用性preflight切换，独立排除；内部调用错误不等已经用DeepSeek接管。常规求解出牌、路线follow、一次脑回答中的后续休息执行、forced选择是执行角色，不当脑替答。审计边界是所冻83局，不承诺未记录的历史行为。

## 同期出牌修复、执行闸和预测

八个历史源码树及10个固定测试文件114例审计通过，重点如下：

|发布|实际上线/本样本核查|判断与限制|
|---|---|---|
|S1.fix45|CALTROPS/HAZE共19启动暴露局；73次实际出牌，逐动作completed|旧0229/0234修复；DUZU F27T4/T5迷雾旧预测毒2/7与实际8/13直接旧错，不以整战结果倒推回归|
|S1.mirage-poison1|12启动暴露，22次实际施放completed|普通MIRAGE现毒量兑现范围；未观测升级/组合不外推|
|S1.sloth-replay1|8启动暴露，二幕走廊0 SLOTH_POWER帧|无本范围实际触发样本，不能证明二幕退化/正常|
|S1.bullet-time1|仅2个已完局启动暴露，两局均第一幕结束，0实际BULLET_TIME出牌|没有二幕样本，暂不能评效果；不回退|
|毒0174/0213/0216|逐源核per-hit cap、持牌伤先于毒终结、POISON模型覆盖；固定测试保留|修复已存在，不把新战败当旧错复发；另有0271终结分支挡候选限制仍待既有独立任务|

控制台原件85/85匹配。三次实际执行闸拒绝：V0383V5S9BCQ F9T3（double前，不可打card_index3）；VLZ6CCT8AQ0A F31T2（蛇咬后0能量/免费技能额度消耗，计划不能全执行，安全end）；NHA2KW0RB7VP F30T2（迷雾不可打后重规划存活）。gate-evidence.json保留所有对应原帧/原决策及console行。未发现solver崩溃；正常采样不足提示、mod暂时timeout、Jev常规执行不得合称“求解失败”。并非已经证明费用/重规划全正确；VLZ完整免费技能费用传播未充分隔离，保留待证，不补未知机制。三次均直接观察FREE_SKILL_POWER1；NHA F30T2先毒素3→2能量、免费防御耗额度，后迷雾牌面0→2，打击后仅1能量，原线继续失败。V038 F9T3已是上线前同型；gate-cost-chains.json保留逐步费用/能量，fix45原diff只施毒/荆棘，与费用路径无直接改动。

标准calibration抽4214终局计划窗，4196有损血对齐/18缺末结局；连续SL同层同回合混合先剔除。Codex二幕走廊非重复SL回合：pre488行469在±2内(96.1%)，post309行300在±2内(97.1%)，平均绝对误差0.334→0.191。回合同局相关、方案抽样、重规划/提前终止会影响可比性，不作为独立统计检验或“没有bug”的证明。最大差的六帧原件保存：BTS F31T2预测4/实际14是生存者后继弃牌旧0268；VLZ F31T2预测0/实际15为执行未全线；DUZU F30T1预测11/实际16抽牌重规划分支不同；TXZ F31T3预测11/实际14召唤敌序未隔离；9Z9 F19T4预测8/实际11随机咕嘟；pre P5HT F23T2预测0/实际12。只前三项能落实执行差，未知机制不新填，不声称可转胜。

## 经验exp70→90及后续：实际blob和题面

exp69作为基线139 active，到exp90为165，新增26、无移除/退役；exp91/92后续另列增3至168。调查期间exp93在09:40登记上线（blob f58ff5b7725e16da3c8e680e2372538a0b796a0e、169 active），在冻结窗口外，无本样本启动暴露，post-freeze-experience.json另存，不替代任何旧题面。实际21次发布，74并入75、77/78并入79，无单独暴露版本。335新增/改写记录涉及114id，前后原文、所有自己的证据局号均存experience-changes.json；证据ID均存在于本项目Silent日志，无跨角色证据ID。并未以当前经验代替过去题面，也未据ID存在就保证每句机制完全正确。

实际Jev12353题中8814有本调查经验scope，335历史变体中73种（36id）有全文精确匹配。279个原文样例成功连接原答题及动作；code rank1 138、其他排名90、无rank51，经验因果均unknown。未匹配262变体不能判未暴露：占位渲染/相关性过滤/脑系统正文缺失会阻止匹配。general路线、营火、构筑变体在Jev无全文匹配，在脑payload/启动prefix仅能确认版本哈希，不能恢复系统全文及精确撤条目反事实；这些明确未证，不以统计暗推权重改坏。

可核二幕对照：exp75猎人柔嫩变体WQZVENQ7DTRP F28T2 Jev选rank4，与代码排序不同、执行completed；同局F28T1 rank1，只有1候选。exp75棱柱变体F25T2 Jev选rank5，HP guard改为plan2后执行，说明必须区分Jev回答和实际决策。exp85盛碗虫变体9Z9H2EXKLF3T F29T1 rank1、T3 rank2；exp87同scope KFRDELW2TH2P F21T1 rank6。exp71余像8JRE1C4H4Z2W F19T1 rank1、T3 rank2；exp71步法F28T1 rank1。它们证明历史原文实际暴露、排序相同/不同与执行，不证明是新增经验造成变化。experience-decision-audit.json逐变体保存可核原题、答案、执行、排序和未证项。

|发布|commit|experience blob|active|新增|改写|退役|
|---|---|---|---|---|---|---|
'''
for version in exp:
    text += f"|{version['name']}|{version['commit']}|{version['blob']}|{version['active']}|{len(version['new']) if version['name']!='S1.exp69' else '基线'}|{len(version['changed'])}|{len(version['retired'])}|\n"
text += '\n## 局部修正、测试与发布\n\n'
text += '账本silent-0285由root CLI登记；proposal-provenance.md/json保存证据/边界/回退。提案仅在实际源码成为live祖先后标implemented，shipped留运维核实。验证为MGA0 F2T1原帧的四项固定来源测试：初稿1红3绿、修后4绿、撤生产源码原字节1红3绿、恢复原字节4绿，SHA与检查树在red-green.json；铁甲/未知/其他角色上下文等价，本角色经验保留。\n\n'
text += '第一次原sandbox：tsc0，246文件2596例过、1例导入检查失败（247文件2597例总计），原因是调查历史源码片段置于learner目录被当项目源码扫描。历史副本改扩展名.ts.txt，原字节/SHA不变，不改断言/排除名单。后续检查和实际发布信息如下（仅实际执行）：\n\n```json\n'+json.dumps(publication,ensure_ascii=False,indent=2)+'\n```\n'
text += '\n回退只逆向本批jev-experience.ts角色门控，保留刷新和并行改动；不整体退版本。胜率收益未知，后续独立局才可估计。不在本批修0268/0271/0273、不做boss校准、B4/B5或打法优化。\n'
text += '\n## 独立局明细：纳入/单列与配置\n\n下面全部83局；codex纳入默认战绩，deepseek/mixed只原始单列。时间是真正process.started UTC，版本按启动commit祖先，config是完整SHA。full sample-table.json保留所有配置、重启和未知dirty限制。\n\n|run_id|启动UTC|源码|启动版本|配置SHA|实际脑|F33/F48|double暴露|\n|---|---|---|---|---|---|---|---|\n'
for r in rows:
    text += f"|{r['run_id']}|{r['start_process']['started']}|{r['start_commit']}|{r['start_version']}|{r['config_sha']}|{r['brain_source']['source']}|{int(r['reach33'])}/{int(r['reach48'])}|{int(r['exposures']['S1.double-boss1'])}|\n"
text += '\n## 启动版本分组（Codex-only）\n\n每组均独立局，区间Wilson95，组内实际不同配置继续在下一表拆分。\n\n|启动版本|n|F33|F48|二幕路死|\n|---|---|---|---|---|\n'
for name, g in stats['codex']['versions'].items():
    text += f'|{name}|{g["n"]}|'+ '|'.join(rate(g[k]) for k in ['reach33','reach48','act2_road_death'])+'|\n'
text += '\n## 实际启动版本×配置×引擎分组\n\nconfig完整字段见sample-table.json，group全局号见actual-config-groups.json；与metrics-config原始标签输出区别已说明。\n\n|启动版本|配置SHA|实际引擎|n|F33|F48|二幕路死|\n|---|---|---|---|---|---|---|\n'
for g in config_groups:
    text += f"|{g['start_version']}|{g['config_sha']}|{g['actual_engine']}|{g['n']}|"+'|'.join(rate(g[k]) for k in ['reach33','reach48','act2_road_death'])+'|\n'
text += '\n## 稳定行为配置分段\n\n去除日志路径和生成elites_date，保留完整脑/求解/SL/路线/知识模式参数得到两个行为配置。差异仅brain fallback deepseek→null及删除deepseek引擎定义；Codex gpt-6.1-sol/high、session设置、Jev jev-latest/v1、SL与其他参数相同。配置取消的真正首次启动是2Y27VAYZDA02的09:07，早于代码部署三局。知识prefix/源码仍另轴，不把两配置效果当随机分组。\n\n|行为配置|引擎|n|F33|F48|二幕路死|\n|---|---|---|---|---|---|\n'
for group in read('behavioral-config-groups.json'):
    text += f"|{group['fingerprint']}|{group['actual_engine']}|{group['n']}|"+'|'.join(rate(group[k]) for k in ['reach33','reach48','act2_road_death'])+'|\n'
    for name, split in group['split_double'].items():
        text += f"|{group['fingerprint']}/{name}|{group['actual_engine']}|{split['n']}|"+'|'.join(rate(split[k]) for k in ['reach33','reach48','act2_road_death'])+'|\n'
text += '\n## 证据与失败原件索引\n\n任务目录：'+str(P)+'。阶段报告stage-1.md/stage-2.md；冻结freeze-manifest.json；版本version-timeline.json；样本sample-table/statistics/actual-config-groups/behavioral-config-groups/observer-cutpoint-audit；源码source-tree-manifest/source-diff-manifest/double-boss-call-sites/archive-renames；brain-audit/engine-audit/engine-audit-by-config；resource-chains/route-build-resources；combat-nonrepeat-summary/gate-evidence/related-bugs；经验experience-timeline/changes/exact-exposure/decision-audit/post-freeze-experience；跨角色cross-character-provenance/contamination-counts；固定原帧agent/tests/silent-potion-provenance-evidence.json；原件scratch/raw-cases、scratch/console、scratch/frozen-logs、scratch/frozen-db。\n\n已捕获的初稿/撤源码红、首sandbox失败、首次冻结跨设备错误、metrics IPC错误、分析脚本初稿错误保留；临时交互shell错误的单独stderr缺失如实列error-inventory.md，不伪作游戏bug或已过检查；source-sandbox*.log/live-sandbox.log与publication.json写真实最终结果。大原始states/decisions只读，通过冻结偏移+SHA引用并对关键帧保存原字节。\n'
(P/'report.md').write_text(text)
print('Report draft saved', len(text), 'chars;', len(config_groups), 'actual config groups')
