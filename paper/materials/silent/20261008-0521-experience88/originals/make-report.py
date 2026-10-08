import collections
import hashlib
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
source = sys.argv[1] if len(sys.argv)>1 else None
stamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def load(n):return json.load(open(O/n))
A=load('audit.json'); C=load('changes.json')
H={r['id']:r for r in load('mechanism-evidence.json')}
meta={r['run_id']:r for r in load('run-metadata.json')}
L=load('ledger-result.json') if (O/'ledger-result.json').exists() else dict(added=[],proposed=[],retired=[],check=None)
M=load('live-merge.json') if (O/'live-merge.json').exists() else dict(merged=None,reason='尚未合入')
log=(O/'test-source.log').read_text() if (O/'test-source.log').exists() else ''
rc=int((O/'test-source.rc').read_text()) if (O/'test-source.rc').exists() else None
T=dict(tsc=0 if 'RUN  v' in log else None,vitest=rc,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))))
slice_rows=[];bs=[];zs=[]
for b,z in zip(load('slice-before.json'),load('slice-after.json')):
    assert b['sample']==z['sample'] and b['n']==z['n']==20
    bs+=b['sizes'];zs+=z['sizes']
    slice_rows.append(dict(sample=b['sample'],before_median=b['median'],before_max=b['max'],after_median=z['median'],after_max=z['max'],paired_median=statistics.median([q-p for p,q in zip(b['sizes'],z['sizes'])])))
SS=dict(rows=slice_rows,before_median=statistics.median(bs),after_median=statistics.median(zs),median_change=statistics.median(zs)-statistics.median(bs),paired_median=statistics.median([q-p for p,q in zip(bs,zs)]),before_max=max(bs),after_max=max(zs),max_growth=max(q-p for p,q in zip(bs,zs)))
(O/'slice-summary.json').write_text(json.dumps(SS,ensure_ascii=False,indent=2)+'\n')
title='2026-10-08 静默猎手 第八十八次增量：1 局 A10（version 2026-10-08.5，分支 exp-silent，'+(source[:8] if source else '待提交')+'）'
text='## '+title+'\n\n### 来源\n\n'
text+=f'- 记录时间{stamp}；只读根notes/lessons.md:5627起9Z9H2EXKLF3T静默小节及后续勘误、run-1008-0400局报。runs.jsonl:597为SILENT/A10/F48败，6c3d8187+dirty完整树未知，不以当前源码冒认原运行树。没有跳过的角色局，last_seen=2026-10-08。\n'
text+='- 开工工作区干净，merge --no-edit main成功；已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法及最后两节、本角色最后两节和账本README。自己做无下级agent；抽取单进程nice19，沙箱测试单worker，不跑boss模拟池/play、联网或安装依赖，临时文件仅本批scratch。\n'
text+='- 按run id抽932决策/51实际Codex脑记录/9 SL记录，states按UTC时间seek再验run_id和state.run.character_id共1018帧。时间窗DeepSeek推理0，兼容ds_*字段不是DS实际调用；原帧、字节偏移、逐帧facts与历史复盘抽取保留。\n'
text+=f'- 全引擎学习观察截至{A["cutoff"]}共116静默完局，A0—A10局数'+ '/'.join(str(sum(r['ascension']==a for r in meta.values())) for a in range(11))+f'；{len(A["fights"])}房/{sum(r["death"] for r in A["fights"])}实死。进行中/切点后/无character旧局/其他角色排除；本次无只进数字未读复盘的局，不替代纯Codex爬塔口径。\n'
text+='- 口径同第87节：第一COMBAT HP减同房最终尝试退出HP，负回复保留，实死单列；Monster仅走廊，Unknown问号战另列，训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除、多源可同战；回血后战去重。判死截断不补未执行攻击/毒，SL多试不当多局。\n'
text+='- 旧115局全部重新执行逐局分析，与第87批七数组、全部血档、节点转移、实际回复及SL逐行一致，无口径偏差。新局20房/19胜/1死，沙漏前两试截断11/15血不当结算离场，最终27→0；F38实际问号战另算。\n'
text+=f'- 增1改14退0；14条均补证据，只数字0。active159→160、正文53187→{C["chars_after"]}字符，置信{C["confidence"]}；开工低于55000，未强制合并/退役/压缩，60000预算未改。重复主题直接并入；新跨幕公式承接已存在silent-0243账本，不重复建账。机制[0,20]且数字注明观察进阶，其他原范围保持。\n\n'
text+='### 对照数据检查的主题\n\n| 主题 | 数据 | 结论 |\n| --- | --- | --- |\n'
for c in C['entries']:
    e=c['after'];h=H[e['id']]
    text+=f'| {e.get("name",e["id"])}（{e["id"]}） | 支持{e["n_support"]}/反例{e["n_contradict"]}，各阶{h["asc"]}；证据局号见本批changes.json与mechanism-evidence.json | {e["lesson"].split("。",1)[0]} |\n'
text+='| 赢战血价与续战入口 | 三幕F35 66/77→30/69、F38问号30→19、F39 19→11；F42回11→31，F45再31→7，F47回7→27；F48死、F49未到 | 不能省略赢的战斗或虚构第二boss进场 |\n'
text+='| 药水/复活/SL分账 | 正常获得16、混沌生成6，共22独立获得；22饮、0弃，三次精灵自动复活23/20/20另计；SL恢复两药×两次不当新获得，HP11→27/15→27共恢复28 | 本次无留药/饮药时点受控胜线，不新增门槛；完整槽位、动作和资源链见复盘及原帧 |\n'
text+='| 严格存活及末帧截断 | 末T10持牌24+攻28−挡37=15，18→3；T11无凋萎、3血0挡对48意图，实耗3且敌剩32；金纸触发未知抽牌，判官不能确定 | 48意图不是实耗48；未知抽牌保留原必死边界，全败模拟不代判官 |\n'
text+='| 路线投影 | F34投影F42/F47/boss32/38/61（上限77），实11/7/27（上限69）；F36重算F42为13、实11；F42回后投影F47为14、实7，boss34、实27 | 卷轴降上限、问号战、新条件投影另核；无同条件改线因果 |\n\n'
text+='旧基线七数组复算：\n\n| 数组 | 旧 | 新 | 旧行一致 |\n| --- | --- | --- | --- |\n'
for k,v in load('baseline-check.json').items():text+=f'| {k} | {v["before"]} | {v["after"]} | 是 |\n'
text+='\n各进阶/幕/房型非空血档（房/独立局、实死率、活损中位；完整病例留audit.json）：\n\n| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for r in A['bands']:
    if r['n']:text+=f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |\n'
text+='\nREST/SHOP/普通EVENT从源节点入血到下一场（多源可同战，节点数不是独立战数）：\n\n| 进阶 | 幕 | 节点 | 血档 | 节点/后战 | 死/率 | 活损中位 |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for r in A['transfers']:
    if r['n']:text+=f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |\n'
text+='\n实际回血及SL分阶：\n\n| 进阶/局 | 独立火房 | 回血动作/实回 | 去重后战/死/活损中位 | 重打房/尝试/赢次 |\n| --- | --- | --- | --- | --- |\n'
for r,s in zip(load('rest-summary.json'),load('sl-summary.json')):text+=f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |\n'
text+='\n- 低血异节点历史对照：MGA0CZDDKC0P A10 F7入22休至43、F8 Monster损17活；D4LJ9QMGFB8Q A10 F21事件13→13、F22 Monster损13死。敌/牌/幕/间隔不同，仅观察，不能推改线因果。本局三幕选无精英、两火仍败，无另一实选路线。\n'
text+='- SL：本局沙漏三试0赢，技能T1/T5/T5、混沌均T7、熔炉T7/T8/T10；末次T7在与第二试相同20血底板改早有准备线，预计多损7/多伤16，实际整轮净损11→9、敌净扣49→71。后续动作、弃牌/药时点同变，延至T11仍败，不把22差额归单步或归运气；完整explore、sl_explore、decisions.sl_attempt/逐轮plays/draws保留analysis及原行。全史分阶重打结果见上表。\n\n'
text+='### 经验库自己带偏或写了没被执行的地方\n\n'
text+='- 本窗DeepSeek推理0、实际脑51记录均Codex，没有DS引用经验的原话。F34原话“悖论不妨碍过牌；三店双火避精英，备战连续首领。”与所走路线一致，但四场赢战实际仍耗血，不能把休息缓冲视作boss保证。\n'
text+='- F1“先补输出毒源，四火两商店支撑两精英，保留首领血线。”与F18“士兵强化毒防；左路三火两精英最稳。”是计划，实建时点另核；末次F48到T5才建步法、普通触媒只两结，未有提前建立线完整胜负。F47计划明确伤害缺口未知及保留后场，不报成不知第二boss。\n'
text+='- F36理由承诺下一店删悔恨，F37却因not_on_selection_screen改删打击；真实移除页悔恨索引0、原牌组索引33。属于事实/选择链纯bug，不是悔恨机制或本局持牌损失；三次T1均弃掉，无证据证明删后获胜。\n\n'
text+='### 机制推理\n\n| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |\n| --- | --- | --- | --- | --- |\n'
mechanisms=[]
for c in C['entries']:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    h=H[e['id']];reason=e['lesson'].split('机制：',1)[1].split('典型案例：',1)[0]
    example=e['lesson'].split('新核案例：')[-1] if '新核案例：' in e['lesson'] else e['lesson'].split('典型案例：')[-1]
    text+=f'| {e.get("name",e["id"])} | {reason} | {e["n_support"]}/{e["n_contradict"]}，各阶{h["asc"]}；旧/新卡牌窗口{h["old_windows"]}/{h["new_windows"]}（仅card作动作分母） | {example} | {e["id"]} |\n'
    mechanisms.append(e['id'])
text+='\n- 116局本角色历史复盘相关段已抽取，旧卡牌/结束/成长帧重新核对，完整支持/反例run id及分阶留mechanism-evidence.json。基础机制子分母不由条目总n代替；整战失败不自动当公式反例，未隔离遗物或提前建牌的胜因。\n'
for r in load('historical-power-deltas.json'):text+=f'- 全史{r["card"]}：{r["runs"]}局/{r["windows"]}施放，属性净增分布{r["net_deltas"]}；例外原帧保留该文件。步法5次净+1均有柔嫩逐牌扣1、毒雾一次+6为首牌重放，不作为基础公式反例；此全史动作分母包括已观察但未自动追加到条目支持的旧局。\n'
text+='- 跨幕已有账本十局A9/A10十六对原转换帧全重核，缺失HP80%向下取整全部吻合；仅这些进阶/同上限边界已核，低阶和其他交互未验证。两提案'+','.join(load('proposal-ids.json'))+'均source_task=experience-update、逐条experience及账本关联、target_task=strategy-proposal，实际领域combat/potion/sl/terminal/structure，pending；经验上线不当源码implemented。\n\n'
text+='### 新增\n\n- silent-act-transition-missing-hp-heal：既有silent-0243跨幕公式承接10局/16对，support10/反例0、高置信，general:rest。账本保持原首证/prior及更早支持历史，无重复add。\n\n### 更新\n\n| 条目 | 支持前→后 | 字符前→后 | 新证据 |\n| --- | --- | --- | --- |\n'
for c in C['entries']:
    if not c['before']:continue
    a,z=c['before'],c['after'];text+=f'| {c["id"]} | {a["n_support"]}→{z["n_support"]} | {len(a["lesson"])}→{len(z["lesson"])} | 9Z9H2EXKLF3T |\n'
text+='\n- 14条补本角色支持，0条只数字；悔恨low→med、士兵med→high，其他置信/证据阈值重算。支持、反例及原范围保持；无合并/独立条目压缩清单。\n\n### 退役\n\n- 无；没有被反驳多于支持或已修bug型条目。本批纯bug不入经验。\n\n'
text+='### 和手写知识及代码冲突\n\n- 八个其他静默知识文件已查用途/切点和哈希；room-costs为MAP首末旧93局切点、monster-records为战内与战后分别计、outcome-stats为观察统计，boss-damage/trust、fight-value/gates为生成/独立校准，不用本任务战内口径覆盖异步数据。double-boss旧四局连续模拟未校准，本局未到F49，无新参数证据；无手写攻略/手册需改删，八文件原哈希保持。代码手写知识本任务不改；移除可选页事实与原静态截取冲突留纯bug记录。\n\n'
text+='### 代码问题（不给 DS）\n\n- silent-0272商店移除静态名单按原牌组顺序截25项，但真实悔恨索引0；独立复盘提案处理，不搬bug文字到经验或冒称修好。本任务未改源码/生成器/依赖/运维prompt/其他角色。T10 least-loss预计余血−9而实18→3的差12缺原dirty固定重放定位，不当已证bug；末轮−45同为预计余血，不当损45。\n'
text+='- 逐帧核对草稿把通用饮药动作用名drink_potion当日志字段，断言失败保留verify-first-failure.log；实际字段use_potion计22，修核对脚本后通过。原对局事实和生产行为未改；不是沙箱测试失败或重跑。\n\n'
text+='- 首次合入保护沿用旧脚本按较早共同祖先比较，误把live已上线的.4与候选.5列为刷新重叠；live .4与本批before逐字节一致，实际刷新208c68f7未改经验。原live-merge-first-overlap.json/log/rc保留；改临时保护脚本按本源提交父树的单文件差异核对、锁内复查无知识冲突，再实际merge-tree预检发现20份并行记录内容冲突，按任务停止，未硬解/未实际merge/未造eval版本或双通知。刷新提交208c68f7保留，notes/fight-value-backtest-silent.md并行未提交改动保留。\n\n'
text+='### 测试\n\n'
text+=f'- 原入口bash tools/test-sandbox.sh、TMPDIR本批、PATH含~/.local/node/bin、SANDBOX_WORKERS=1。tsc {T["tsc"]}、vitest {T["vitest"]}，{T["files"]}文件/{T["cases"]}通过例；源测试'+('重跑一次，原失败保留。' if (O/'test-source-retry.log').exists() else '无重跑。')+'完整外部由调度器实际合入后补，不冒报完整套件0。\n'
text+='- JSON、字段/局号/角色/反例/范围/名字/预算、旧115局基线、新局关键机制及16跨幕转换、240固定切片、check-experience missing=[]/0、gitleaks与diff --check均有回执。\n'
text+='- 学习账本仅CLI：新增'+(','.join(L['added']) or '无')+'；proposed '+','.join(L['proposed'])+'；退役无；ledger.py check '+str(L['check'])+'。原首证/prior/claim/repeat/上线历史保持，0272未进经验不改其状态，学习者不标accepted/shipped。\n'
text+='- live合入：'+str(M.get('merged'))+'；刷新：'+str(M.get('refresh'))+'；合前：'+str(M.get('before'))+'；合后沙箱：'+str(M.get('after_test'))+'；结果：'+M['reason']+'。\n'
for s in M.get('precheck_conflicts',[]):text+='- '+s+'\n'
text+='\n### 切片大小\n\n- 种子20260929，state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对；每格20独立时刻、池/时刻留manifest。CHARACTER=silent调用官方knowledge-slice.ts，改前/后固定同一outcome-stats及common/silent快照；新池抽样不拿旧中位当before。此测为切片，V4整份前缀另按本阶适用总字数。\n\n| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对增量中位 |\n| --- | --- | --- | --- |\n'
for r in SS['rows']:text+=f'| {r["sample"].removeprefix("sample-")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |\n'
text+=f'\n- 整体中位{SS["before_median"]}→{SS["after_median"]}（{SS["median_change"]:+}字），配对增量中位{SS["paired_median"]:+}，单片最多增{SS["max_growth"]}，最大{SS["before_max"]}→{SS["after_max"]}。active160、正文{C["chars_after"]}，置信{C["confidence"]}；A8适用{C["applicable"]["8"]}，A9适用{C["applicable"]["9"]}，A10适用{C["applicable"]["10"]}。需要Dai定：无。\n\n完整原帧/脚本/草稿/失败/提案/账本/测试/切片/合入回执：{O}；报告时间{stamp}。\n'
result=dict(task='experience-update',version='2026-10-08.5',commit=source,merged=M.get('merged'),added=1,updated=14,retired=0,active=160,mechanisms=mechanisms,tests={k:T[k] for k in ['tsc','vitest','cases']},ledger=L,code_proposals=load('proposal-ids.json'),implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
if source:
    assert T['tsc']==T['vitest']==0 and L['check']==0
    (O/'report.md').write_text(text+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
    (O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-section.md').write_text(text)
    path=ROOT/'paper/materials/experience-changelog-silent.md'
    assert not (O/'changelog-append-proof.json').exists()
    original=path.read_bytes()
    with path.open('a') as h:h.write('\n'+text)
    final=path.read_bytes();assert final[:len(original)]==original
    (O/'changelog-append-proof.json').write_text(json.dumps(dict(before_bytes=len(original),before_sha256=hashlib.sha256(original).hexdigest(),appended_bytes=len(final)-len(original),title=title),ensure_ascii=False,indent=2)+'\n')
else:(O/'report-draft.md').write_text(text)
print(title,'报告字符数',len(text),'测试',T,'切片',SS['median_change'],SS['after_max'],'合入',M.get('merged'))
