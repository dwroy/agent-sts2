import collections
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
source=sys.argv[1] if len(sys.argv)>1 else None
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
def load(n):return json.load(open(O/n))
A=load('audit.json');C=load('changes.json');S=load('slice-summary.json');H={r['id']:r for r in load('mechanism-evidence.json')}
RS=load('rest-summary.json');SL=load('sl-summary.json');meta={r['run_id']:r for r in load('run-metadata.json')}
L=load('ledger-result.json') if (O/'ledger-result.json').exists() else dict(added=[],proposed=[],retired=[],check=None)
M=load('live-merge.json') if (O/'live-merge.json').exists() else dict(merged=None,reason='尚未合入')
log=(O/'test-source.log').read_text() if (O/'test-source.log').exists() else ''
rc=int((O/'test-source.rc').read_text()) if (O/'test-source.rc').exists() else None
T=dict(tsc=0 if 'RUN  v' in log else None,vitest=rc,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))))
title='2026-10-08 静默猎手 第八十七次增量：2 局 A10（version 2026-10-08.4，分支 exp-silent，'+(source[:8] if source else '待提交')+'）'
text='## '+title+'\n\n### 来源\n\n'
text+=f'- 记录时间{stamp}。只读根notes/lessons.md:5615/5621两节BTSRF7JL1W1Y、XTSV1U9JD34T及后续勘误；局报run-1008-0215/run-1008-0305，last_seen=2026-10-08。runs.jsonl:595/596均SILENT、A10，F31/F49败，无角色跳过。原code=6ad5584f+dirty/03f4ffe0+dirty完整树未知，不以当前源码冒充原运行树。\n'
text+='- 开工工作区干净，git merge --no-edit main成功；读README、最新STATE/决定末尾、学习协议/代码提案闭环、首次方法及最后两节、本角色最后两节、账本README。自己做，无下级agent；所有抽取单进程nice19，测试单worker，不跑boss模拟池/play、联网或安装依赖；临时文件仅本批scratch。\n'
text+='- 按run id抽635/775决策、28/49实际Codex脑记录、4/10 SL记录；states按UTC时间二分seek再验run_id及state.run.character_id，共653/810帧。两窗deepseek-reasoning均0；ds_*及runs.deepseek_calls是兼容字段，不编造DS引用。原行/字节偏移、逐帧facts和历史复盘抽取保留。\n'
text+=f'- 全引擎学习观察截至{A["cutoff"]}，共115静默完局，A0—A10局数'+ '/'.join(str(sum(r['ascension']==a for r in meta.values())) for a in range(11))+f'；{len(A["fights"])}房/{sum(r["death"] for r in A["fights"])}实死。115局均有本角色复盘，无本次仅数字局；进行中/切点后/无character旧局/其他角色排除，不替代纯Codex爬塔战绩。\n'
text+='- 口径同前：第一COMBAT HP减同房最终尝试退出HP，战内回复保留为负净损，实死单列；Monster仅走廊，Unknown问号战另列，训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除、多源可同战；回血后战去重，未执行的攻击/毒不补算，SL多试不当多局。\n'
text+='- 重新执行旧113局逐局分析，并和第86批七数组、全部血档、节点转移、实际回复及SL逐行比对，全一致，无口径不一致。新增B同族四试末胜70→23、末走廊42→0；X恶魔两试末胜58→24、沙漏97→23、女王23→0。判死截断不算实死或完整净损。\n'
text+=f'- 新增0、更新21（均加证据，0条只数字）、退役0；active159→159，正文51598→{C["chars_after"]}字，置信{C["confidence"]}。开工未到55000，无预算强制合并/压缩，未改60000测试预算。同scope条目直接并入，钳子改为双局总结保留旧案例与新剩挡实帧，未退役独立条目；进阶范围保持。机制[0,20]、高阶策略只沿各条已观察范围。\n\n'
text+='### 对照数据检查的主题\n\n| 主题 | 数据 | 结论 |\n| --- | --- | --- |\n'
for c in C['entries']:
    e=c['after'];h=H[e['id']];fresh=[r for r in e['evidence'] if r not in c['before']['evidence']]
    text+=f'| {e.get("name",e["id"])}（{e["id"]}） | 支持{e["n_support"]}/反例{e["n_contradict"]}，各阶{h["asc"]}；新证据{",".join(fresh)} | {e["lesson"].split("。",1)[0]} |\n'
text+='| 严格存活差额 | B末14血、5牌挡+1覆甲对22，需损16、实耗14、至少再需3血；X末1血6挡对16，需损10、实耗1、至少再需10血 | 截断扣血不当模拟低估，不将least-loss预计余血−9误读成需损9 |\n'
text+='| 用药/恢复分源 | B获5/饮5/弃0，无SL复药；X获9/饮15/弃0，6次来自同瓶SL恢复。幽灵六次均T1用 | 同瓶重放不当新得；无用药时点受控胜线，不新增喝药/留药门槛 |\n'
text+='| 赢战资源与未到节点 | B F30赢仍70→42、耗明晰，F31死而F32未到；X F48赢仍97→23，F49无恢复 | 未到营火/能力/复制品均不能预支，事件变动不当同条件路线残差 |\n\n'
text+='旧基线七数组复算：\n\n| 数组 | 改前 | 改后 | 旧行一致 |\n| --- | --- | --- | --- |\n'
for k,v in load('baseline-check.json').items():text+=f'| {k} | {v["before"]} | {v["after"]} | 是 |\n'
text+='\n各进阶/幕/房型非空血档（房/独立局、实死率、活损中位；完整逐房病例留audit.json）：\n\n| 进阶 | 幕 | 房型 | 血档 | 房/局 | 死/率 | 活损中位 |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for r in A['bands']:
    if r['n']:text+=f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |\n'
text+='\nREST/SHOP/普通EVENT从源节点入血到下一场（多源可同战，源节点数不是独立战数）：\n\n| 进阶 | 幕 | 节点 | 入血档 | 节点/后战 | 死/率 | 活损中位 |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for r in A['transfers']:
    if r['n']:text+=f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{r["deaths"]/r["n"]*100:.2f}% | {r["median_win"]} |\n'
text+='\n真实回血/SL按进阶分列：\n\n| 进阶/局 | 独立火房 | 回血动作/实回 | 去重后战/死/活损中位 | 重打房/尝试/赢次 |\n| --- | --- | --- | --- | --- |\n'
for r,s in zip(RS,SL):text+=f'| A{r["asc"]}/{r["runs"]} | {r["rests"]} | {r["heal"]}/{sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {s["fights"]}/{s["attempts"]}/{s["wins"]} |\n'
text+='\n- 低血异节点历史对照：MGA0CZDDKC0P A10 F7入22休至43、F8 Monster损17活；D4LJ9QMGFB8Q A10 F21事件13→13、F22 Monster损13死。敌/牌/幕/间隔不同，仍仅观察，无改线因果。本批B F25锻造后有事件补10、F32未到；X有五轮书两次20及蘑菇20，不能把投影和实到差全部当战损误差。\n'
text+='- SL实盘：B同族前三次判死、第四次T3/T6退信徒、T13胜；与前试后续抽牌/防御/目标同变，不将胜归T2单动作。X恶魔第二试T1工具/T4较早建触媒毒雾、T10胜，后续亦变；女王六试0赢，第二/四试T3换猎杀者净扣31对药瓶32、损22一致，T4挡9与6都不足16，无赢次、不能归胜运气。全史分阶重打数见上表，逐次explore/draws/sl_attempt与真实动作留audit/analysis。\n\n'
text+='### 经验库自己带偏或写了没被执行的地方\n\n'
text+='- 两窗DeepSeek为0，77条实际brain均Codex，未找到DS引用经验的原话。B F18“可可助开场铺能力，走双店低战损路线。”与双店路线一致，但F30仍耗28、后火未到；F25投影后存在事件补10，不称同条件预测失败。\n'
text+='- X F34“持续加能支撑毒防，四火避精英备战连王。”确有四火路线，但耳环接管首轮，3剩余能量配不可打进阶之灾不能主动启动。F48后整局计划已知道只剩23血/无恢复，不重复报旧单boss事实缺口。\n'
text+='- B T2原候选安排生存者后突然一拳，“损4”未兑现、实损14；原3/3推演不是实际执行胜线。X末T4夜魇复制防御没有活到次轮，NIGHTMARE_POWER3不等已获得三次挡。未来增益和未执行替代线不写成因果。\n\n'
text+='### 机制推理\n\n| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |\n| --- | --- | --- | --- | --- |\n'
mechanisms=[]
for c in C['entries']:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    h=H[e['id']];ex=e['lesson'].split('本批案例：')[-1]
    reasoning=e['lesson'].split('机制：',1)[1].split('典型案例：',1)[0]
    text+=f'| {e.get("name",e["id"])} | {reasoning} | {e["n_support"]}/{e["n_contradict"]}，各阶{h["asc"]}；旧/新施放窗口{h["old_windows"]}/{h["new_windows"]}（非card不作动作分母） | {ex} | {e["id"]} |\n'
    mechanisms.append(e['id'])
text+='\n- 115局本角色历史复盘抽取384相关段；旧动作、结束帧及成长记录重新运行，完整条目支持/反例和分阶、旧/新卡牌子窗口见mechanism-evidence.json。黑暗镣铐5支持局32施放（普通24/升级8），基础机制和组合子分母分别计。整战失败不自动当机制反例；局部差额能计算，不声称去掉遗物/提前能力/改药时点就能赢。\n'
text+='- 额外重核全史能力层变化：步法66局699次，净敏捷+2/+3分别464/230次、另5次净+1均有柔嫩逐牌扣1；毒雾56局610次，+2/+3分别284/325次、另一次+6为1LMBFGSMCWKU F45T1投斧首牌重放；触媒42局353次全部实建+1/+2（227/126次）。净增量与基础能力值分源，异常组合原帧保留historical-power-deltas.json，不将混合效果当基础公式反例或外推新组合。\n'
text+='- 三份提案'+','.join(load('proposal-ids.json'))+'均source_task=experience-update、experience逐条关联、target_task=strategy-proposal，domains combat/potion/sl/terminal。只登记pending，不将经验合入当源码implemented。\n\n'
text+='### 新增\n\n- 无。\n\n### 更新\n\n| 条目 | 支持前→后 | 字符前→后 | 新证据 |\n| --- | --- | --- | --- |\n'
for c in C['entries']:
    a,z=c['before'],c['after'];text+=f'| {c["id"]} | {a["n_support"]}→{z["n_support"]} | {len(a["lesson"])}→{len(z["lesson"])} | '+','.join(r for r in z['evidence'] if r not in a['evidence'])+' |\n'
text+='\n- 21条均补本角色证据，0条只数字；置信按证据阈值重算，证据、反例、原范围和首证历史保留。钳子低→中、女王SL观察中→高；其他机制边界不以总支持n外推所有组合。\n\n### 退役\n\n- 无；没有证据反驳多于支持或已修bug类经验需退役，纯bug仍留修复记录。\n\n'
text+='### 和手写知识及代码冲突\n\n'
text+='- 核对其余八个静默知识文件元数据、用途、切点与哈希：room-costs为MAP首末旧切点、monster-records含战内/战后口径、outcome-stats为选择观察，boss-damage/trust与fight-value/gates为生成或独立校准；不能拿本任务战内净损覆盖异步不同口径。double-boss旧四局模拟值不是实盘胜率，本次连王事实一致、新模拟价值尚未知，不改参数。无手写攻略/手册需改删，八文件原哈希保持。\n'
text+='- 生存者普通单弃消费与绷带收益耦合（0268）及毒胜提前停止搜索漏保血候选（0271）由独立任务实现；代码手写知识本任务不改，前者不以旧0205经验上线冒称源码已修，后者不与0213存活结算混作同根因。\n\n'
text+='### 代码问题（不给 DS）\n\n'
text+='- 0268普通生存者是旧重复；0271存活情况下毒胜早停漏防御候选是新纯bug。当前代码定位及修复建议只留账本/独立提案，经验仅保留弃牌的实际效果与9血价/连战入口，不宣称本可通关。原dirty树、替代整战/接管完整动作/完整毛伤及截断尝试退出结算缺失，全部保持未知。\n'
text+='- 离线首个ledger find读取未带--json而被当JSON解析失败，原输出保留，随后用fold --json正确核对。逐帧验证初稿把夜魇选择前帧当建立帧、把敌列表固定为错误顺序，两次断言失败原件保留；改用选择后防御前帧、按敌id比较，实际机制和原日志未改。这些是验证草稿问题，不当生产bug或自测失败。未改源码/生成器/依赖/其他角色/运维prompt。\n\n'
text+='- 开测前在agent/用根目录相对路径读两个回执及JSON检查，出现路径不存在；原工具回显保存preflight-cwd-error.log，随后在工作树根目录读取及JSON检查通过。测试脚本本身在agent/按原入口运行，此路径错误不当测试失败或重跑。\n\n'
text+='### 测试\n\n'
text+=f'- 原入口bash tools/test-sandbox.sh，TMPDIR本批、PATH含~/.local/node/bin、SANDBOX_WORKERS=1；固定数据/原排除名单。tsc {T["tsc"]}、vitest {T["vitest"]}，{T["files"]}文件/{T["cases"]}通过例；'+('有重跑，原失败完整保留。' if (O/'test-source-retry.log').exists() else '源测试无重跑。')+'完整外部由调度器实际合入后补，不冒报完整套件0。\n'
text+='- JSON合法、字段/局号/角色/支持反例/范围/名字/预算、旧七数组/血档/转移/回复/SL、两局关键实帧、240固定切片及check-experience missing=[]/0均通过；gitleaks提交前扫描和diff --check原回执保留。\n'
text+='- 学习账本仅CLI：新增'+(','.join(L['added']) or '无')+'；proposed '+','.join(L['proposed'])+'；退役无；ledger.py check '+str(L['check'])+'。首证/prior/原claim/repeat/历史上线保持，0268/0271未入经验，本任务不改其状态，学习者不标accepted/shipped。\n'
text+='- live合入：'+str(M.get('merged'))+'；刷新：'+str(M.get('refresh'))+'；合前：'+str(M.get('before'))+'；合后沙箱：'+str(M.get('after_test'))+'；知识重叠：'+str(M.get('knowledge_overlap',[]))+'；结果：'+M['reason']+'。\n'
for s in M.get('precheck_conflicts',[]):text+='- '+s+'\n'
text+='\n### 切片大小\n\n'
text+='- 种子20260929，从截止点state.run.character_id=SILENT抽最高A9/A10各20×COMBAT/REWARD/MAP/EVENT/REST/SHOP=240配对，每格20个独立时刻；manifest保留池/时刻。CHARACTER=silent调用官方knowledge-slice.ts，setter固定改前/后experience和同一outcome-stats，其他common/silent快照一致。新池抽样，旧批中位不直接当before；本测为切片而非V4整份前缀。\n\n| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对增量中位 |\n| --- | --- | --- | --- |\n'
for r in S['rows']:text+=f'| {r["sample"].removeprefix("sample-")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |\n'
text+=f'\n- 整体中位{S["before_median"]}→{S["after_median"]}（+{S["median_change"]}字），配对增量中位+{S["paired_median"]}，单片最多增{S["max_growth"]}，最大{S["before_max"]}→{S["after_max"]}。active159、正文{C["chars_after"]}，置信{C["confidence"]}；A8适用{C["applicable"]["8"]}，A9适用{C["applicable"]["9"]}，A10适用{C["applicable"]["10"]}。需要Dai定：无。\n\n完整原帧/抽取/草稿/失败/提案/账本/测试/切片/合入回执：{O}；报告时间{stamp}。\n'
result=dict(task='experience-update',version='2026-10-08.4',commit=source,merged=M.get('merged'),added=0,updated=21,retired=0,active=159,mechanisms=mechanisms,tests={k:T[k] for k in ['tsc','vitest','cases']},ledger=L,code_proposals=load('proposal-ids.json'),implementation_domains=['combat','potion','sl','terminal'],report=str(O/'report.md'))
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
else:
    (O/'report-draft.md').write_text(text)
print(title,'报告字数',len(text),'测试',T,'合入',M.get('merged'))
