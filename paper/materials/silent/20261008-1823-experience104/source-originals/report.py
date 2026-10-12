import collections, fcntl, json, re, subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
def read(name):return json.load((O/(name+'.json')).open())
S=read('update-summary');A=read('audit');C=read('changes')['entries'];M=read('ledger-map');H=read('historical-mechanism-summary')
V=read('slice-summary');P=read('code-proposal-ids');L=read('ledger-results');merge=read('live-merge')
commit=(O/'source-commit.txt').read_text().strip()
now=subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],text=True,capture_output=True,check=True).stdout.strip()
title='## 2026-10-08 静默猎手 第一百零四次增量：1 局 A10（version 2026-10-08.21，分支 exp-silent，'+commit[:8]+'）'
test=(O/'test-source.log').read_text();files=sum(int(x) for x in re.findall(r'Test Files\s+(\d+) passed',test));cases=sum(int(x) for x in re.findall(r'Tests\s+(\d+) passed',test))
for name in ['test-source','ledger-check','check-experience','gitleaks-source']:assert (O/(name+'.rc')).read_text().strip()=='0',name
assert files and cases
checks=len(read('numbers-checked'))+len(read('extra-numbers-checked'))
lines=[title,'','### 来源','',
 '- 记录时间'+now+'。只读notes/lessons.md:5794 SY0WMJNNVRLM静默小节，按5809的17:46:21勘误：F31退出三段归零已记录，缺的是毒/反伤内部结算及前中归零先后；runs.jsonl:617确认SILENT/A10/F33败，未跳过。运行650a6a84+dirty完整源码未记录。',
 '- exp-silent起始干净；git merge --no-edit main无冲突快进6961f7a5。读README、最新STATE、最近决定、学习协议/代码提案闭环、首次构建和末两节方法、静默第102/103节及账本README。独立完成，不派agent、不联网、不改打法源码、不运行play或boss模拟池，所有临时文件仅本批scratch，数据/工具nice19单进程、沙箱1worker。',
 '- 按run id重新rg抽636决策、37实际Codex脑请求、10条SL；states按首末决策UTC 08:31:21.932Z—09:05:54.173Z字节seek流式读取、核state.run.character_id/run_id，共722帧，偏移见states-offsets。与复盘原722帧在去掉抽取器附加_line/_offset后逐帧完全一致；DeepSeek时间窗0行，不把兼容字段当实际回答。',
 '- 全引擎学习观察截至'+A['cutoff']+'共136静默完局，分阶'+str(dict(collections.Counter(r['ascension'] for r in read('run-metadata'))))+'；1994独立战斗房/'+str(sum(f['death'] for f in A['fights']))+'实际死。其余135局只进数字/历史验证，排除缺character旧铁甲、其他角色、进行中及切点后局；不称纯Codex爬塔战績。',
 '- 沿上一节口径：首COMBAT入房HP减同房末次尝试退出HP，开场失血/负净损保留、实际死单列。Monster走廊与Unknown问号战分开；入血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入房血关联下一更高层首战、排Ancient，多源可同战；回血后战去重。独立营火与动作数分列，同房SL计一战，判死截断不计实际死。',
 '- 旧135局七数组逐行、血档/节点后战、休息和SL重算一致，无聚合基线漂移；本批独立实帧40项加历史药水/同盘27项共'+str(checks)+'项通过。506段历史静默主题复盘与136局日志交叉检索，支持/反例名单、分阶、实际动作/遭遇见historical-mechanism-summary，仅持有/出现不当整条结论支持。',
 '- 再生旧条目文字16局23饮、证据15局；旧切点实际completed实饮17局24次，遗漏PD9AYQVMLQW6和BJLTVSYXCSGS的支持计数/旧数字未全更新。独立核全部25次建5层后，加这两旧局及新局成为18支持/25饮，反例0。旧总数组一致，此处是经验文字/证据集合漂移，不能称旧日志变动。',
 f'- 新增{S["added"]}、更新{S["updated"]}（16加证据、0只改数字）、退役0；active{S["before"]["active"]}→{S["after"]["active"]}，正文{S["before"]["chars"]}→{S["after"]["chars"]}字，净增72；置信度{S["after"]["confidence"]}。未触55000强制压缩线，16条案例替换/压缩净减366字，新增两条438字；逐项长度见下，未改60000测试预算。',
 '','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c,h in zip(C,H):
    e=c['after'];lines.append('| '+e['id']+' | 支持'+str(e['n_support'])+'/反例'+str(e['n_contradict'])+'；分阶'+str(h['by_asc'])+'；新增证据'+','.join(c['new_runs'])+' | '+e['lesson']+' |')
lines += [
 '| 正路径资源守恒 | 初56+六火154+跨幕44−事件7/6−十二胜房净损171=70，末boss70→0 | 胜房含再生净增6，不当敌毛伤；七次SL血药恢复不叠治疗 |',
 '| 药水资源链 | 八独立瓶=奖励7/商店1，七饮瓶/一丢；实饮14次，镣铐恢复2/幽灵恢复5 | 重试不当新瓶；第6试T1原答幽灵被重播结束替代，实际仍T4饮 |',
 '| HP护栏方案/执行 | F9T2原题损15扣12、替题损5扣0；实际防御/后空翻重问补中和/带毒刺击，损2扣12；全战53→12 | 题面省10少12不等实际少12伤，未执行原线不能证明省13血的因果 |',
 '| 异螨SL同盘对照 | 三试各17血同镣铐/共有22张记录前缀；第2/3试26张记录同序、T4完整combat同9血3能五手/敌39与23各5毒；第二先杀攻击者零损却下一轮判死，第三集中非攻击者使毒退/弱攻击者付6血到3后T5胜 | 两场七试一赢（旧MTQ四败）；多目标改变，归完整线路对照，不归运气/单牌，不推固定目标序 |',
 '| 沙虫SL同盘对照 | 六试同70血幽灵/同首抽，首五T7判死，末T3抽后重问实损8延T9仍败；六次T4幽灵无攻击，T5各损24 | 没有赢的那次，不称改线已获胜；六次仅一局、一个独立战房 |',
 '| 末轮生存与整场 | T9逃离1→3、结束沙坑2；11血7挡对30，完整需损23、严格存活至少差13，敌剩179 | 13仅当轮存活缺口，不当整战获胜差；实际扣11为HP截断 |',
 '| 路线与低血 | F19/20两赢走廊58→47→17，F21问号三试最后17→3；F25/27两火回复后F30再生净增6，F31损24后F32再回24 | 赢的前战也计血药，问号不保证安全；没有替路线/改营火受控结局 |',
 '| 低血不同节点对比 | A10二幕<25%入节点：REST23源/5死21.74%，SHOP5源/1死20%，EVENT14源/4死28.57%；SY F24商店3血离、F25火3→39再F30战净增6，同一后战多源；MTQ F22商店8血离下一F23损8实际死 | 中间回血/药物/构筑和选路混杂，多源不独立；本局不是商店优于休息，未选路线无因果对照 |',
 '| 有限模拟边界 | F32满血沙虫552样本0.18%胜、平均敌剩158.2844；实际末T9敌179仍败，前三选项各1200样本0胜 | 未有同政策/抽序配对，单局不能校准概率或把显示0%当精确必死 |',
 '| 进阶 | 新局A10；机制[0,20]，路线/休息/构筑沿[8,20]，异螨仅A10策略[10,20]，新牌只验证升级版A10 | 无新高阶反驳，不推普通版/未见组合和等级的打法 |',
 '', '旧基线逐行重算：','','| 数组 | 旧135局 | 加一局后 | 核对 |','| --- | --- | --- | --- |']
for name,r in read('baseline-check').items():lines.append(f'| {name} | {r["before"]} | {r["after"]} | 旧行完全一致 |')
lines += ['','各进阶/幕/房型/入血档（n为房数，局数单列；损血中位仅存活房，负净损保留）：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','休息/商店/普通事件入血关联下一战（多源可同战，不当独立局或路线因果）：','','| 进阶 | 幕 | 节点 | 血档 | 节点/去重战 | 死亡/比例 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','逐阶休息与后战：','','| 进阶 | 局 | 独立火 | 回血动作/实回 | 非回血动作 | 去重后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in read('rest-summary'):lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["smith"]} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
lines += ['','真正重打（max attempt>1，多次不当多独立局）：','','| 进阶 | 重打场 | 尝试 | 赢的尝试 |','| --- | --- | --- | --- |']
for r in read('sl-summary'):lines.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
lines += ['','- 沙虫原12重打场46试7赢，本局加入后13场52试7赢；异螨当前语义支持两局、两场七试1赢，其他只进数字的遭遇不冒充目标/毒素结论支持。低血改路线数据包含真实已改节点及后段成本，没有未选路线实打，故全部路线/休息关系写观察。',
 '','### 经验库自己带偏或写了没被执行的地方','',
 '- DeepSeek时间窗0行，实际脑37请求均Codex，43条Codex决策含6条已保存计划执行。没有可核“DeepSeek逐字引经验却反向执行”的原话，不虚构。F18 Codex原话“眼可免费换掉烂手；三火单精英路线保血。”免费换手须满足整轮未出牌的现场限制，不当任意时点已兑现。',
 '- F32计划中文释义“满血进场，启动力量、步法、触媒，保留必需逃离，把幽灵用于危险攻击”；boss六试未打力量牌、T4均非攻击时饮幽灵。前战4力量和已取得牌不当boss已建收益；未取得的毒雾/尖啸不预支，也不因缺组件称构筑必错。',
 '- F9护栏替题扣0伤后来因抽牌重问仍实扣12，不把方案字段当最终执行。F21第二试当轮零损却下一轮判死，胜试当轮多损6反而完整胜，不能只看当轮剩血。沙虫末试延两轮仍敗，未有延后用药/强制启动的受控整战胜线。',
 '','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c,h in zip(C,H):
    e=c['after'];text=e['lesson']
    if '机制：' not in text:continue
    conclusion=text.split('机制：')[0].rstrip('。');reason=text.split('机制：')[1].split('搭配：')[0].rstrip('。');typical=text.split('典型案例：')[1]
    lines.append('| '+conclusion+' | '+reason+'；局部算术/时点与整场单因分账 | '+str(e['n_support'])+'/'+str(e['n_contradict'])+'，分阶'+str(h['by_asc'])+'，适用'+str(e['asc'])+' | '+typical+' | '+e['id']+' |')
    mechanisms.append(dict(id=e['id'],conclusion=conclusion,n=e['n_support'],typical=typical))
lines += ['','- 力量逐击/敏捷逐牌、施毒和触媒结算、爆发重放、冰晶/臂甲一次挡与再生/反伤分源核。缺组件移除/时点替换整场对照不写因该牌获胜；胜败均能支持局部算术，沙虫六试只计一局。灵体APPARITION的原条目仅一局卡牌机制，与新药水不同scope，不向旧卡牌条目添加喝药证据或重复其用法。',
 '','### 新增','']
for c in C:
    if c['before'] is None:
        e=c['after'];lines.append('- '+e['id']+'：'+e['scope']+'，'+str(e['n_support'])+'支持/0反例，'+e['confidence']+'；账本'+','.join(M[e['id']])+'；'+','.join(e['evidence'])+'。')
lines += ['','### 更新','']
for c in C:
    if c['before'] is None:continue
    b,e=c['before'],c['after'];lines.append('- '+e['id']+f'：支持{b["n_support"]}→{e["n_support"]}，反例不变；正文{len(b["lesson"])}→{len(e["lesson"])}字；账本'+','.join(M[e['id']])+'。')
lines += ['','### 退役','','- 无；没有反例超过支持或新高阶推翻，本任务未修机制源码，旧退役记录保留。',
 '','### 和手写知识及代码冲突','',
 '- silent其余8份JSON核字段、元数据、限制和相关数据，SHA见other-knowledge。均生成统计/模型或有限double-boss，无需改的手写攻略；历史生成切点不当冲突。double-boss仍明确仅4局/胜0/不判必死或触发SL，本局未抵达三幕，不重拟。改了的手写知识：无。其他角色文件未改。',
 '- 当前参考card-model.ts:512已接APPARITION无实体、:860读取EnemyStrength，但没有GHOST_IN_A_JAR数值模型；combat-plan.ts:523起明示boss药成本0，题面却未量化幽灵效果。HP护栏:576—583含8血容差；本次只验证方案/重问/执行取舍，不凭该规则人定而拒绝提案，也不认定省13血因果。源码手写知识本任务未改、完整dirty源码未知。',
 '- run-journal.ts:205手写boss提示“HP先到时逃离不加回合”：若指沙坑数值，与末T9实际1→3不符；若指本轮HP死亡后的可活轮，则与本局一致。独立SL提案需分清沙坑延长与实际生存，源码文字本次未改。',
 '- 本批CLI代码提案'+','.join(P)+'，source_task=experience-update/target_task=strategy-proposal，涉及combat/potion/sl/terminal；18新改active均有自身经验/账本/角色/进阶/局层回合/反例/旧新行为/拟合切分/验证限制/回退链接。前四初稿保留，最后补充提案更正共有抽牌22张及荆棘后敌血12；不登记implemented/shipped。',
 '','### 代码问题（不给 DS）','',
 '- 未发现新的纯控制器bug。幽灵题面本来声明未模拟，不把建模缺口冒报协议bug；当前力量模型已有通用读取，是否缺接线由独立策略任务验证。boss有限样本全败、抽牌后实损变化不当模拟必错。',
 '- 临时补核初稿误以敌index随退场保持，随后漏计荆棘3，把胜试后敌血写15而非12；同时误将首试只有22张抽序补齐到24。三个原失败日志保留verify-extra-initial/verify-extra/verify-extra-second；按真实存活列表/属性/抽序校正后27项通过，补充提案和全部相关账本注释明确更正，原四Markdown/JSON/队列指纹保留。不是游戏控制器缺陷。',
 '- 原帧比对初稿没排除复盘包装的_line/_offset而失败，source-frame-initial-failure保留；去掉附加元数据后722原帧一致。临时药槽探查误用slot_index的KeyError另存potion-initial-failure，按实际index字段重新抽得奖励7/商店1/SL恢复7，原偏移保存。上述临时脚本错误都未修改控制器。本轮提案更正不改变经验文字/支持局数/胜负或建议。',
 '- 缺完整dirty源码、部分结算内部先后/毛伤/持久同ID实例、SL截断真实出口、未执行原方案、延后用药/提前力量/替路线/改锻造/组件移除整场受控结局、boss时钟估伤；不足保留当前策略，不补预训练知识，所有初稿和失败历史保存。',
 '','### 测试','',
 f'- agent/bash tools/test-sandbox.sh，TMPDIR本批目录、PATH本机node、nice19/1worker，tsc退出0，vitest{files}文件/{cases}用例/退出0，首次通过无重跑。固定排除名单/预算未改，外部完整套件由调度器补跑，本任务不冒报。',
 '- JSON/唯一id/scope中文名/角色/12位证据/置信度/日期/预算及240配对切片通过；旧135局基线完全一致，67项独立数字/同盘检查通过；check-experience退出0/missing=[]、gitleaks源退出0、diff --check0。',
 '- 账本只经CLI：新增无；proposed '+','.join(L['proposed'])+'；退役无；ledger.py check退出0。首证/prior/claim/旧历史和版本保留，实际shipped交运维核live，经验上线不冒称策略代码实现。',
 '- live流程：'+merge['result']+'；刷新提交'+str(merge.get('refresh'))+'；合前'+str(merge.get('pre'))+'；实际合入'+str(merge.get('merged'))+'。']
if merge.get('conflicts'):lines += ['- '+x for x in merge['conflicts']]
if not merge.get('merged'):lines += ['- 按任务遇冲突停下，不硬解/覆盖，保留刷新数据与源提交，完成事件交运维兜底。未实际上线不造decision/eval/Roy通知，不停对局。']
else:lines += ['- 实际合入后的沙箱测试、唯一版本及上线通知见live-merge回执；账本shipped仍交运维核验。']
lines += ['','### 切片大小','',
 '- 固定种子20260929；从截至切点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对。manifest记池/时间/唯一帧，有放回补足单列；CHARACTER=silent调用官方knowledge-slice.ts，前后冻结相同common/silent/outcome，仅换经验。',
 '','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for r in V['by_sample']:lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
lines += ['',f'- 整体中位{V["before_median"]}→{V["after_median"]}，变化{V["median_growth"]}字；配对差中位{V["paired_median"]}，最大{V["before_max"]}→{V["after_max"]}，单片最多增{V["max_growth"]}。',
 f'- active{S["after"]["active"]}/正文{S["after"]["chars"]}；high109/med45/low24；A8适用166条/44761字、A9适用167条/45045字、A10适用175条/47948字。无合并/退役，更新案例净压缩366字、新条目438字，需Roy定：无。',
 '', '原帧/复算/机制/提案/CLI/测试/切片/合入回执：'+str(O.resolve())+'；报告时间'+now+'。','']
report='\n'.join(lines).replace('战績','战绩').replace('仍敗','仍败')
(O/'report.md').write_text(report);(O/'changelog-title.txt').write_text(title+'\n')
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a+') as f:
    fcntl.flock(f,fcntl.LOCK_EX);f.seek(0);old=f.read();assert title not in old
    f.seek(0,2);f.write('\n'+report);f.flush()
result=dict(task='experience-update',version=S['version'],commit=commit,merged=merge.get('merged'),added=S['added'],updated=S['updated'],retired=0,active=S['after']['active'],mechanisms=[x['id'] for x in mechanisms],tests=dict(tsc=0,vitest=0,cases=cases),ledger=dict(**L,check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal'],report=str((O/'report.md').resolve()))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'mechanisms-report.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
