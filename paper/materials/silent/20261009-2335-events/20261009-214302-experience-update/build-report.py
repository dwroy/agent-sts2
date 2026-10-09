import collections
import fcntl
import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
U=json.load(open(O/'update-summary.json'))
S=json.load(open(O/'slice-summary.json'))
M=json.load(open(O/'ledger-map.json'))
ME={e['id']:e for e in json.load(open(O/'mechanism-evidence.json'))}
P=json.load(open(O/'code-proposals-results.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
V=json.load(open(O/'verification.json'))
T=json.load(open(O/'test-results.json'))
L=json.load(open(O/'ledger-results.json'))
LIVE=json.load(open(O/'live-merge.json'))
source=(O/'source-commit.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title=f'## 2026-10-09 静默猎手 第一百四十次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{source[:8]}）'
lines=[title,'','### 来源','',
 f'- 记录时间{stamp}。根notes/lessons.md:8895起9663Y88TYK73完整小节分段只读，未见勘误。runs.jsonl:660为SILENT/A10/F46败；last_seen取run-1009-2104-9663Y88TYK73.md，无角色跳过。',
 '- 开工exp-silent工作区干净，git merge --no-edit main已是最新，基线7ecf496c；已读README、最新STATE、最近决定、学习协议、代码提案闭环、铁甲首次构建和最后两节方法及静默最后两节，未用其他角色数字或知识。独立完成，不派下级agent。',
 f'- 全引擎silent学习观察截至{A["cutoff"]}：{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死；分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧178局只进汇总和历史机制验证，不是纯Codex爬塔成绩；无character旧局/其他角色/未完局/切点后局排除。',
 '- 按run id用rg抽新局718决策、44脑调用、8计划、6 SL、198 Jev题；states按决策UTC时间窗2026-10-09T12:21:59.630Z—13:04:10.045Z二分seek流读743帧并核角色。deepseek-reasoning同窗0条；44脑调用均Codex，runs.deepseek_calls是旧字段，未当DeepSeek真实调用。运行6e8de8ea4+dirty的完整源码未知。',
 '- 口径同上一节：首COMBAT入口HP减最后真实退出HP为战内净损，含开场遗物、自伤、回血和上限变化，不当敌毛伤；SL同房一场，判死不是实死。走廊只Monster，问号战Unknown另算；血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按入口档关联下一更高层首战，Ancient排除；节点/独立房/局/HEAL动作分母分别列。',
 '- 上一节178局七数组、血档、节点后战、HEAL及SL逐项全等：'+str(json.load(open(O/'baseline-check.json')))+'；没有未解释的基线不一致。全部179局日志重跑分析，815段相关静默历史复盘摘录保留historical-mechanism-notes.txt。',
 f'- 新局原始记录{V["new_original_records"]}条按字节偏移/SHA重新回读全等，证据角色/公式{V["checks"]}项通过；历史参数动作分母{V["parameter_summary"]}。支持局是主题支持，不能当每句公式独立实验；普通败局不是机制反例。completed play_card动作表排除pending选择中动作，历史动作计数是下界；生存者0→13另核原始CARD_SELECTION相邻帧。',
 f'- 新增0、更新13（13加证据、0只改数字）、退役0；active200→200，正文{U["before"]["chars"]}→{U["after"]["chars"]}字。未达55000压缩线，无预算合并/退役，不改60000预算。','',
 '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];me=ME[e['id']]
    lines.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{me["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
lines+=['','历史机制动作净变化的完整分布见parameter-distributions.json；以下保留分母。净变化可混有重放/遗物/敌反应，不把整帧变化当单次普通参数，也不把混源变化自动列成公式反例。','', '| 主题 | completed动作/局数 | 净变化分布 |','| --- | --- | --- |']
for ident,row in json.load(open(O/'parameter-distributions.json')).items():
    lines.append(f'| {ident} | {row["actions"]}/{row["runs"]} | {row["observed_delta_distribution"]} |')
lines+=['','路线血量分档：n为独立战斗房，局为不同run，死率=实死/n，掉血中位只含赢战；进阶分开，零格保留audit.json。','', '| 进阶/幕/房间/入口档 | 数据（房/局/死、比例、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['bands']:
    if b['n']:lines.append(f'| A{b["asc"]}/{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 观察，非安全血线 |')
lines+=['','低血不同节点按同阶/幕/入口档对照；一个后战可能关联多个节点，未匹配敌人/牌组/路线，比例不是独立干预效果。','', '| 进阶/幕/节点/入口档 | 数据（节点/去重战/死、比例、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['transfers']:
    if b['n']:lines.append(f'| A{b["asc"]}/{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 观察，非改线因果 |')
lines+=['','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for screen in ['REST','SHOP','EVENT']:
    b=next(b for b in A['transfers'] if (b['asc'],b['act'],b['screen'],b['band'])==(10,3,screen,'<25%'))
    cases=[f'{x["run"]} F{x["floor"]}→F{x["next_floor"]}' for x in b['cases'][-3:]]
    lines.append(f'| A10三幕<25%/{screen} | {b["n"]}节点/{b["unique_fights"]}后战/{b["deaths"]}死，活损中位{b["median_win"]}；案例{cases} | 历史不同节点仅观察，未控牌组/敌人 |')
for r in json.load(open(O/'rest-summary.json')):
    lines.append(f'| A{r["asc"]} HEAL | {r["runs"]}局/{r["rests"]}独立火/{r["heal"]}HEAL，实回{sum(r["gains"])}；去重{r["nexts"]}后战/{r["deaths"]}死，活损中位{r["median"]} | 入口动作与节点分母不同，即时缓冲不保证下战 |')
for r in json.load(open(O/'sl-summary.json')):
    lines.append(f'| A{r["asc"]} SL | 多次尝试{r["fights"]}场/{r["attempts"]}试/{r["wins"]}次赢 | 同场相关，不添独立证据局数 |')
lines+=['| 新局资源链 | F43 70→66→19；F44枕头休19→55；F45 55→51→9耗复制；F46首战9→5，末试5→0 | 两场胜战成本保留；F47火与boss回血未到，不预支 |',
 '| 回复/药物 | 七次HEAL回21+17+15+21+21+21+36=152；锻造F7/9/42；跨幕各32、茶31分账；实得13瓶、饮19、弃0，其中F46四试八饮为两实得瓶加六恢复饮 | SL恢复既非新得药也非普通回血；没有早喝/留药整场胜果 |',
 '| 新局SL | F17/F33首次赢；F46三次T4判死、末T3实死，四试零赢。前两试前两轮同线；第三试T1探索夜魇复制防御，末试T2放弃早有准备，随后抽弃改变 | 不声称全场同抽；探索死亡估计0.583→0.833是模型分数，不能当替线胜率因果 |',
 '| 攻防实值 | 末F46T3已有弱的12攻，减6力后8；脆弱防御3、5血需损5；两药令21→33毒，82→49后敌仍活 | 低报2血属于独立模型bug，当前毒输出不等防守已付 |',
 '| boss投影 | F32相同牌组HEAL方案投影入场69、400样本胜率59.5%、赢损中位49/7轮；F33实69、首次7轮胜、净损40 | 单结果差−9不证校准；旧boss时钟及未到三幕boss实到资源未知 |','',
 '历史SL完整explore/sl_explore、记录draws与实际动作保留sl-draw-comparison.json；171场原记录组加TD1跨进程重建1场，共172场/56获胜尝试。TD1第二试缺原SL标签，沿上一节状态/决策窗重建，未冒称完整同抽或成功reload。','',
 '| 局/阶/层 | 尝试/赢次/共同记录前缀 | 赢试相对首试首动作差异 | 结论 |','| --- | --- | --- | --- |']
for x in json.load(open(O/'sl-draw-comparison.json')):
    changes=[str(dict(attempt=w['attempt'],before=w['before'],after=w['after'])) for w in x['wins']]
    lines.append(f'| {x["run"]}/A{x["asc"]}/F{x["floor"]} | {len(x["attempts"])}/{len(x["wins"])}/{x["shared_recorded_prefix"]} | {"；".join(changes) if changes else "无赢次；完整尝试另存"} | 观察；动作/药时/后抽可同变，非单因果 |')
lines+=['','### 经验库自己带偏或写了没被执行的地方','',
 '- 44真实脑调用均Codex，DeepSeek推理窗0；未发现明确引用经验ID的原话，不编造经验诱导因果。',
 '- F34大脑原话“额外能量支持夜魇毒链，走三火单精英保血。”F39茶事件原理由中文释义“满血提供精英缓冲，之后每场4血代价优于立即付11血拿不确定遗物”；实际两赢战仍使血量70→19、55→9。F44休息理由中文释义“回到55，锻造有在最终休息前死亡的风险，保血保药准备连续boss”；回血兑现而boss未到，另线整战未控。',
 '- F36保留F21买的毒药理由为配触媒+；F46四试均未建立触媒/余像，前三试T4才喝两毒后敌67/67/61血，不能把未结36毒当扣血。末试T3实结33后敌49仍攻杀；流电附加8伤能力未打，不计已建收益。',
 '- 末次完整候选原报损3、余2、扣敌33；实执行尖啸/两打击/防御后需损5，新增两药多兑现12扣敌HP，但没有改善攻击/挡。这是实帧与模型差，不能归因给毒药或声称另一候选必胜。','',
 '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms=[]
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    mechanisms.append(e.get('name') or e['id'])
    main,case=e['lesson'].split('典型案例：',1)
    lines.append(f'| {e.get("name") or e["id"]} | {main} | {e["n_support"]}/{e["n_contradict"]}；分阶{ME[e["id"]]["by_asc"]} | {case} | {e["id"]} |')
lines+=['','机制范围[0,20]，实例数字带真实进阶/现场条件，不拟跨阶固定怪数值；路线/休息/构筑观察[8,20]。未见高阶机制反例，不把败局改成反例；整战因果未隔离明确写观察或未控。','',
 '### 新增','', '- 无，同主题并入既有条目。','', '### 更新','']
for c in C:
    a,b=c['before'],c['after']
    lines.append(f'- {c["id"]}：支持{a["n_support"]}→{b["n_support"]}，追加9663Y88TYK73；正文{len(a["lesson"])}→{len(b["lesson"])}字；置信度{a["confidence"]}→{b["confidence"]}，反例/asc保持。')
lines+=['','### 退役','', '- 无，无新已修机制/过量反例/预算合并。','',
 '### 和手写知识及代码冲突','',
 '- 改了的手写知识：无。silent其他8份JSON核来源、角色、模型低信任/旧切点与机制边界，SHA/metadata见other-knowledge.json。生成统计切点旧、room-costs以MAP段净损，与本次首COMBAT到实际退出不同口径；未把有限模拟存活率当必死，也未覆盖刷新。double-boss已有A10 F48/F49实证，本局计划列双boss但未到，不新增现场结构事实。',
 '- common monster-db的A10入口HP电球头158、狂战士281、灵魂枢纽254、沙虫341与本局相符，力量/减益后的攻击读现场，未修改common。',
 '- 当前turn-solver.ts:2684—2692将临时减力直接加已弱显示意图，12−6=6而实际8；源码问题另提，不向经验写函数/代码bug。王室开战扣血、存档恢复、临时敏捷/余像/毒结算按实盘分源，本任务未改打法源码。',
 '- 三份CLI提案'+','.join(P)+'覆盖13变更active条目，source_task=experience-update、experience显式关联、target_task=strategy-proposal；领域combat/potion/sl/terminal/structure。原bug silent-0349另关联减力提案；全部pending，未冒标implemented/shipped。','',
 '### 代码问题（不给 DS）','',
 '- 已有复盘新纯计算bug silent-0349：已弱显示意图直接减力量低报2血，独立strategy-proposal处理；保留数据和原失败证据，不冒称已修或本局可转胜。无本任务新增游戏源码bug。',
 '- 原件核验v1过早依赖尚未生成audit.json失败；v2移除无用依赖后1717条全等。公式核验v1假设所有三挡牌进入completed动作表，因生存者是pending选择中动作而失败；v2按原CARD_SELECTION 0→13及两防御13→23→33核实，1165项通过。原脚本/错误日志均保留，不当游戏bug。',
 '- 首次提交命令在启动前遇到bubblewrap扫描并行工作树.codex已消失的竞态；原错误保留commit-command-startup-failure.log，重试同命令提交成功，不计测试失败或游戏bug。',
 '- 完整dirty源码、前三次SL实际退出、完整洗牌同抽、逐击毛伤/部分末击归零、提前喝毒/安全建立能力/未选牌序/路线/休息整战对照、未访F47与三幕boss/旧时钟均未知；不靠预训练知识补。','',
 '### 测试','',
 f'- 原bash agent/tools/test-sandbox.sh、TMPDIR指定scratch、PATH本机node、SANDBOX_WORKERS=1；tsc {T["tsc"]}，vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}，重跑{T["retried"]}；未改排除名单，外部完整套件由调度器补跑。',
 '- JSON、diff --check、gitleaks staged、check-experience missing=[]均0；ledger.py check '+str(L['check'])+'。新增无，proposed '+','.join(L['proposed'])+'，退役无，旧claim/first_run/prior保留；shipped由运维核实际发布。',
 '- 锁内live结果：'+LIVE['result']+'；刷新'+str(LIVE.get('refresh'))+'；合前'+str(LIVE.get('pre'))+'；实际合入'+str(LIVE.get('merged'))+'；合后测试'+str(LIVE.get('tests'))+'。']
for x in LIVE.get('conflicts',[]):lines.append('- '+x)
for x in LIVE.get('overlap_conflicts',[]):lines.append('- 知识重叠：'+x)
if not LIVE.get('merged'):lines.append('- 按任务遇冲突停止，不硬解/覆盖刷新、不造上线记录或eval版本；源提交、账本、提案与预检证据交调用方/运维兜底。')
lines+=['','### 切片大小','',
 '- 固定种子20260929，截止内state.run.character_id=silent最高两阶A9/A10、六界面各20状态，共240配对，单遍水库采样且池各足20。CHARACTER=silent调用官方knowledge-slice.ts，前后仅替经验；其他12份common/silent JSON逐字节一致。样本时间戳/池数、完整切片另存。','',
 '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for s in S['rows']:lines.append(f'| {s["sample"]} | {s["before_median"]}/{s["before_max"]} | {s["after_median"]}/{s["after_max"]} | {s["paired_median"]} |')
lines += ['',f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_growth"]:+}字），配对差中位{S["paired_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片差范围{S["delta_range"]}。',
 f'- active{U["after"]["active"]}、总字符{U["after"]["chars"]}，置信度{U["after"]["confidence"]}；A8 {U["after"]["by_asc"]["8"]}，A9 {U["after"]["by_asc"]["9"]}，A10 {U["after"]["by_asc"]["10"]}。需要Dai定：无；合入冲突按既有运维兜底流程。',
 '', '全部原件/失败日志/脚本/前后经验与切片/统计/CLI/提案/测试/合入预检保存在'+str(O)+'。','']
section='\n'.join(lines)
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=section,text=True,capture_output=True)
(O/'gitleaks-report.log').write_text(scan.stdout+scan.stderr)
assert scan.returncode==0
(O/'changelog-section.md').write_text(section)
(O/'changelog-title.txt').write_text(title+'\n')
result=dict(task='experience-update',version=U['version'],commit=source,merged=LIVE.get('merged'),added=0,updated=13,retired=0,active=200,mechanisms=mechanisms,tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=L,code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'report.md').write_text(section+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
log=ROOT/'paper/materials/experience-changelog-silent.md'
with log.open('a+b') as h:
    fcntl.flock(h.fileno(),fcntl.LOCK_EX)
    h.seek(0);before=h.read()
    assert title.encode() not in before
    h.seek(0,2);addition=('\n'+section).encode();h.write(addition);h.flush()
    h.seek(0);after=h.read();assert after[:len(before)]==before
    (O/'changelog-append.json').write_text(json.dumps(dict(bytes=len(addition),before_bytes=len(before),prefix_sha256=hashlib.sha256(before).hexdigest(),prefix_preserved=True),indent=2)+'\n')
print('报告保存及根变更记录单次追加完成',title)
