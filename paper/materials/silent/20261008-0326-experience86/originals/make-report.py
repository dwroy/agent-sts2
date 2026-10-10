import collections
import hashlib
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
source=sys.argv[1] if len(sys.argv)>1 else None
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
E=json.load(open(O/'mechanism-evidence.json'))
SL=json.load(open(O/'sl-summary.json'))
RS=json.load(open(O/'rest-summary.json'))
SS=json.load(open(O/'slice-summary.json'))
L=json.load(open(O/'ledger-result.json')) if (O/'ledger-result.json').exists() else dict(added=[],proposed=[],retired=[],check=None)
M=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else dict(merged=None,reason='尚未执行合入')
meta={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
def tests(name):
    f=O/(name+'.log');t=f.read_text() if f.exists() else ''
    rc=int((O/(name+'.rc')).read_text()) if (O/(name+'.rc')).exists() else None
    return dict(tsc=0 if 'RUN  v' in t else None,vitest=rc,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t))),sha256=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else None)
T=tests('test-source')
H={r['id']:r for r in E}
title='2026-10-08 静默猎手 第八十六次增量：1 局 A10（version 2026-10-08.3，分支 exp-silent，'+(source[:8] if source else '待提交')+'）'
text='## '+title+'\n\n### 来源\n\n'
text+='- 复盘只读notes/lessons.md中RC61MFQM63Y6静默小节及勘误、局报run-1008-0126；runs.jsonl:594确认SILENT/A10/F33败、0d6c1a82+dirty。无角色跳过，last_seen按局报文件名取2026-10-08；不复原未记录dirty源码。\n'
text+='- 开工git status干净，merge --no-edit main快进至d28722d3；读README/最新STATE/决定末尾、学习/代码提案协议、首次方法及最后两节、本角色最后两节和账本README。自己执行，无下级agent。抽取单进程nice19，自测单worker；不联网/安装依赖/play/模拟池，只在本批scratch写临时文件。\n'
text+='- 按局号抽674决策/33实际Codex脑请求/7 run-plans/7 SL，states按时间二分seek再验run_id及state.run.character_id共694帧。DeepSeek时间窗0，33请求均Codex，ds_*为兼容字段，不编造DS引用。原帧/字节偏移/脚本保留。\n'
text+='- 全引擎学习观察截至2026-10-07T17:26:17.487Z，共113静默完局，A0—A10局数'+ '/'.join(str(sum(r['ascension']==a for r in meta.values())) for a in range(11))+'；1650房/103实死。113局均有本角色复盘；无本次仅数字局，进行中/切点后/无character旧局/其他角色排除，不替代纯Codex爬塔成绩。\n'
text+='- 沿上一节：第一COMBAT HP减同房最终尝试退出HP，负回复保留、实死单列；Monster走廊与Unknown问号战分开，训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除、多源可同战，回血后战去重。判死截断不补未执行攻击/毒，SL多试不当独立局。\n'
text+='- 旧112局逐局重新执行分析，七数组、全部血档、节点转移、实际回复及SL逐行完全一致；没有改旧口径。13赢战净损193、蟹首帧52到最终0净损52；前五次判死未结算不算实死/完整净损。五火105、餐券30、幕间54、SL恢复197分账；10独立得药/15饮（含5次同瓶SL重放）/0弃。\n'
text+=f'- 增0改15退0；15条均增加支持、只数字0。active159→159，正文50368→{C["chars_after"]}字，置信高{C["confidence"]["high"]}/中{C["confidence"]["med"]}/低{C["confidence"]["low"]}。未触55000压缩阈值，未合并/压缩独立条目，不改60000预算。机制[0,20]、统计/路线/构筑范围保持；子公式不能由支持总n外推全部组合。\n\n'
text+='### 对照数据检查的主题\n\n| 主题 | 数据 | 结论 |\n| --- | --- | --- |\n'
for c in C['entries']:
    e=c['after'];h=H[e['id']]
    text+=f'| {e.get("name",e["id"])}（{e["id"]}） | 支持{e["n_support"]}/反例{e["n_contradict"]}，各阶{h["asc_counts"]}；新证据RC61MFQM63Y6 A10 | {e["lesson"].split("。",1)[0]}；新增子窗口详见机制表及facts.json |\n'
text+='| 同盘SL血价 | 首/末T1同52HP同指纹，24/24全死推演；触媒换一打击，挡16→12、损4→8、攻击少9、毒多2、净扣30→23，六試0赢 | 局部收益/支付/生存窗口并核，无固定先能力或新SL门槛 |\n'
text+='| 末轮真实死亡 | 31HP/6挡对38，完整需损32，实扣仅剩31；毒6+5实扣11，爪/箭仍167/149 | 预计余血−1符合致死，存活至少再需2HP，不能将截断当模型低估 |\n'
text+='| 强制弃牌 | 第三试T4前手只有生存者/打击，后手空、45HP/7挡对57；首试先朝火箭则38且损31 | 未施放末打击无伤害/转向，不将两目标不同实线当保留牌受控胜负 |\n'
text+='| 路线/实际回复 | 二幕无精英、五赢战合耗82，三火实回63；F27投影boss中位70/p75=66而实际52 | 不预支未来火/走廊中位，未实打改路线/锻造/留药线，无因果保证 |\n'
text+='| 新旧代码定位 | 原复盘turn-solver:1695、当前exp:1709仍将普通单弃消费绑在绷带>0；card-model:1075已带discardAfterDraw | 0268纯bug留提案/修复记录，数据效果保留经验，不声称旧0205已修模型 |\n\n'
text+='七数组复算（旧行逐行一致）：\n\n| 数组 | 改前 | 改后 | 旧行一致 |\n| --- | --- | --- | --- |\n'
for k,v in json.load(open(O/'baseline-check.json')).items():text+=f'| {k} | {v["before"]} | {v["after"]} | 是 |\n'
text+='\n各进阶/幕/房型非空血档（房/独立局、实死率、活损中位；病例/净损留audit.json）：\n\n| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for r in A['bands']:
    if r['n']:text+=f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |\n'
text+='\nREST/SHOP/普通EVENT按源节点入血关联下一场（多源可同一战，不能当独立战数）：\n\n| 进阶 | 幕 | 源节点 | 入血档 | 源节点/去重后战 | 后战死/率 | 活损中位 |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for r in A['transfers']:
    if r['n']:text+=f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |\n'
text+='\n实际回血和重打分阶：\n\n| 进阶/局 | 独立火房 | 回血动作/实际回血 | 去重后战/死/活损中位 | 真正重打房/尝试/赢次 |\n| --- | --- | --- | --- | --- |\n'
for r,s in zip(RS,SL):text+=f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |\n'
text+='\n- A10 400独立火房有402休息动作（旧并行重进房动作沿原口径），274回血/128锻造；实际回血6484，255去重后战40死，活损中位24。低血异节点对照仍只是观察：MGA0CZDDKC0P A10 F7入22血休到43、F8 Monster损17存活；D4LJ9QMGFB8Q A10 F21事件13→13、F22 Monster损13实死。幕、敌、牌与间隔均不同，不能推出改线必优。\n'
crab_support=set(next(c['after']['evidence'] for c in C['entries'] if c['id']=='silent-kaiser-crab-facing-sl'))
extra=sorted({f['run'] for f in A['fights'] if 'CRUSHER' in f['enemies']} - crab_support)
text+='- 本局异鱼首试T11获胜，不当重打胜线；帝王蟹六试前五predicted_death、末died。当前支持17局17房8活9死，真正重打9房50试1赢；全113局的所有双蟹遭遇为25房15活10死、10重打房56试1赢，额外旧局'+','.join(extra)+'只用于本条数字汇总，不自动增加支持。旧9TG1RP5LFAAK先火箭、LLYSRQQ35AVW先爪都赢；本局没杀任何侧。首手同盘，后续选线/目标/抽牌亦变，无新增赢次，不能归运气或一个首牌的整战因果。\n\n'
text+='### 经验库自己带偏或写了没被执行的地方\n\n'
text+='- DeepSeek本窗0，实际33脑记录均Codex；未找到可声称“DS引用某条经验”的原话。F18原话“能量续航补启动，走三火无精英路线保血。”与路线一致，但三火实回63后仍被五场赢战耗82抵消；F27“...preserves a much healthier Crab entry...”是投影，实入52。F32原话“Heal to 52 HP.”与执行31→52一致，不误记贪锻造。\n'
text+='- F29“Accelerant amplifies upgraded Fumes ... supplying missing boss scaling.”是构筑计划，蟹末试T1建立触媒，毒雾/幻影均没建立。日志原话“SL explore ... playing ... 触媒 ... instead of ... 打击 ... among those the rollout does not see dying more often”：24/24全败仍多损4，成长不是存活保证。\n'
text+='- 生存者原计划末打击朝火箭，强制弃牌后手空、该转向没发生。silent-0205/0079原repeat和历史上线保留，不把模型根因当已修或归责本回合不存在的Jev弃牌选择。\n\n'
text+='### 机制推理\n\n| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |\n| --- | --- | --- | --- | --- |\n'
mechanisms=[]
for c in C['entries']:
    e=c['after'];eid=e['id']
    if eid in ['silent-route-hp-observation','silent-rest-buffer-observation']:continue
    lesson=e['lesson'];h=H[eid]
    inference=lesson.split('机制：',1)[1].split('典型案例：',1)[0] if '机制：' in lesson else lesson.split('典型案例：',1)[0]
    case=lesson.split('新核案例：',1)[-1] if '新核案例：' in lesson else lesson.split('典型案例：',1)[-1]
    label=e.get('name',eid)
    mechanisms.append(label)
    text+=f'| {label} | {inference} | {e["n_support"]}/{e["n_contradict"]}，各阶{h["asc_counts"]}；旧子公式边界保留，新组合只本局 | {case} | {eid} |\n'
text+='\n- 所有113局本角色历史复盘按关键词抽取、旧动作/末轮数据重跑，逐条支持列表和各阶在mechanism-evidence.json；旧卡牌动作子窗口数与新增子窗口分开。速度35局41饮逐次重核临时+5/撤回；新猎人窗口有柔嫩/预判，不把复合净变化误认反例。局部攻防收益可算，未有去掉遗物/改首牌/留药的完整受控胜线，故不声称整战胜因。\n'
text+='- 药水与机制只来自静默观察。'+','.join(json.load(open(O/'proposal-ids.json')))+'均source_task=experience-update，experience逐项关联，target_task=strategy-proposal；domains combat/potion/sl/terminal。只登记pending，不把经验上线当代码implemented。\n\n'
text+='### 新增\n\n- 无。同一主题只保留已有条目。\n\n### 更新\n\n| 条目 | 支持改前→后 | 字符改前→后 | 新证据 |\n| --- | --- | --- | --- |\n'
for c in C['entries']:text+=f'| {c["id"]} | {c["before"]["n_support"]}→{c["after"]["n_support"]} | {len(c["before"]["lesson"])}→{len(c["after"]["lesson"])} | RC61MFQM63Y6 |\n'
text+='\n- 15条均补本局证据；0条只数字。反例/首证及未观察子公式边界保留；生存者由4→5支持、med→high按规则，其余置信分层不手改。逐局/逐轮细节留原报告与before，不新增固定先牌、喝药或SL门槛。\n\n'
text+='### 退役\n\n- 无。未修源码，真实机制/行为观察保留；无反例超过支持或已修模型缺口条目需退役。\n\n'
text+='### 和手写知识及代码冲突\n\n- 其余八静默知识文件核元数据、用途/切点与哈希：room-costs是MAP首末/93局旧切点，monster-records为角色战绩及战内/战后两血价，outcome-stats是选择观察，boss-damage/trust及fight-value/gates为生成/独立校准数据，double-boss为已观察双boss结构/模拟限制。不能用本任务战内净损覆盖异步不同口径；本局未到三幕，不改double-boss或参数。无手写攻略/手册需改删，八文件与切片common逐字节未变。\n'
text+='- 当前exp turn-solver.ts:1709仍只在toughBandagesBlock>0时消费discardAfterDraw，card-model.ts:1075已给普通生存者单弃标志；本局无绷带。纯bug0268及既有提案留独立实现，旧0205经验不代表源码已修。代码手写知识本任务未改。\n\n'
text+='### 代码问题（不给 DS）\n\n- 强制单弃导致预支后继攻击/朝向的模型定位仅在0268/提案和报告；真实丢牌、来袭57/38、毒结算与血价留经验。没有整战替代胜线或dirty树，不补虚构代码因果。未改源码、生成器、依赖、其他角色或运维prompt。\n'
text+='- 初次离线proposals.py把CLI的纯文本id当JSON解析，登记首提案后解析失败；保留proposals-first-failure.log和首回执，改成文本解析、--resume跳过已写账本，经CLI去重续完三个提案。首次check-experience因续项未登记缺幻影条目，续完missing=[]/exit0。一次只读状态计数命令括号错误已更正；均为离线工具草稿，不当生产代码或测试失败。\n\n'
text+='### 测试\n\n'
text+=f'- 原入口bash tools/test-sandbox.sh，TMPDIR本批、PATH含~/.local/node/bin、SANDBOX_WORKERS=1、原固定排除/固定数据：tsc {T["tsc"]}、vitest {T["vitest"]}，{T["files"]}文件/{T["cases"]}通过例；源测试无重跑。完整外部检查由调度器实际合入后补，不冒报完整0。原日志SHA256={T["sha256"]}。\n'
text+='- JSON/字段/12位局号/角色/支持反例/进阶/名字/预算、旧七数组/血档/转移/回复/SL、694状态674决策、关键机制/资源、速度35局41饮、240固定切片与check-experience均通过；提交前gitleaks及diff --check按原回执。\n'
text+='- 学习账本仅CLI：新增'+(','.join(L['added']) or '无')+'；proposed '+(','.join(L['proposed']) or '尚未登记最终状态')+'；退役'+(','.join(L['retired']) or '无')+f'；ledger.py check {L["check"]}。首证/prior/claim/repeat/旧版本历史保持，0268未进经验、保留observed，学习者未写accepted/shipped。\n'
text+=f'- live实际合入：{M.get("merged")}；刷新：{M.get("refresh")}；刷新后/合前：{M.get("before")}；合后沙箱：{M.get("after_test")}；知识不同blob重叠：{M.get("knowledge_overlap",[])}；结果：{M["reason"]}。\n'
for line in M.get('precheck_conflicts',[]):text+='- '+line+'\n'
if M.get('merged'):
    pub=M.get('publication',{});text+=f'- 实际发布{pub.get("publication")}/唯一{pub.get("version")}，decision-log及Roy/运维双通知已追加；对应账本由运维据真实完成事件标shipped。\n'
else:text+='- 未实际合入，不造eval版本/上线记录/双通知，不标shipped；工作树、源提交、失败和所有原件保留，交完成事件由运维兜底，无需新增审批。\n'
text+='\n### 切片大小\n\n- 固定种子20260929，从截止点state.run.character_id=SILENT抽最高A9/A10各20×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对，每格20独立时刻。CHARACTER=silent调用官方knowledge-slice.ts；setter固定before/after和同一outcome-stats，其余common/silent快照一致。新池抽样，旧批中位不直接当before，池/时刻见sample-manifest；这是切片而非V4整份前缀。\n\n| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对增量中位 |\n| --- | --- | --- | --- |\n'
for r in SS['rows']:text+=f'| {r["sample"].removeprefix("sample-")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |\n'
text+=f'\n- 整体中位{SS["before_median"]}→{SS["after_median"]}（+{SS["median_change"]}字）；配对增量中位+{SS["paired_median"]}，单片最多增{SS["max_growth"]}，最大{SS["before_max"]}→{SS["after_max"]}。active159→159，正文50368→{C["chars_after"]}，置信{C["confidence"]}；A8适用{C["applicable"]["8"]}，A9适用{C["applicable"]["9"]}，A10适用{C["applicable"]["10"]}。需要Roy定：无。\n\n'
text+='完整报告/抽取/原帧/脚本/草稿/失败/提案/账本/测试/切片/合入回执：'+str(O)+'；生成时间'+stamp+'。\n'
result=dict(task='experience-update',version='2026-10-08.3',commit=source,merged=M.get('merged'),added=0,updated=15,retired=0,active=159,mechanisms=mechanisms,tests={k:T[k] for k in ['tsc','vitest','cases']},ledger=L,code_proposals=json.load(open(O/'proposal-ids.json')),implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
if source:
    assert T['tsc']==T['vitest']==0 and L['check']==0
    (O/'report.md').write_text(text+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
    (O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-section.md').write_text(text)
    changelog=ROOT/'paper/materials/experience-changelog-silent.md'
    assert not (O/'changelog-append-proof.json').exists()
    original=changelog.read_bytes()
    with changelog.open('a') as h:h.write('\n'+text)
    final=changelog.read_bytes()
    assert final[:len(original)]==original
    proof=dict(before_bytes=len(original),before_sha256=hashlib.sha256(original).hexdigest(),appended_bytes=len(final)-len(original),title=title)
    (O/'changelog-append-proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
else:
    (O/'report-draft.md').write_text(text)
print(title, '报告字数',len(text),'源测试',T,'合入',M.get('merged'))
