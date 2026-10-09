import collections
import fcntl
import hashlib
import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
A = json.load(open(O / 'audit.json'))
C = json.load(open(O / 'changes.json'))
U = json.load(open(O / 'update-summary.json'))
S = json.load(open(O / 'slice-summary.json'))
M = json.load(open(O / 'ledger-map.json'))
ME = {x['entry']:x for x in json.load(open(O / 'mechanism-evidence.json'))}
P = json.load(open(O / 'code-proposals-results.json'))
R = {r['run_id']:r for r in json.load(open(O / 'run-metadata.json'))}
source = (O / 'source-commit.txt').read_text().strip()
L = json.load(open(O / 'ledger-results.json'))
T = json.load(open(O / 'test-results.json'))
LIVE = json.load(open(O / 'live-merge.json'))
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
title = f'## 2026-10-09 静默猎手 第一百三十八次增量：2 局 A10（version {U["version"]}，分支 exp-silent，{source[:8]}）'
lines = [title, '', '### 来源', '',
    f'- 记录时间{stamp}。根notes/lessons.md:8706起HXCY44VD9QWU、8761起N8A2W8LH39N0整节已按行号分段只读；截至本次没有这两节后续勘误。runs.jsonl:657/658均SILENT/A10，分别F17/F15败；无角色跳过。last_seen依据run-1009-1915-HXCY44VD9QWU.md及run-1009-1932-N8A2W8LH39N0.md文件日期。',
    '- exp-silent开工干净，git merge --no-edit main成功至1aecdd948，无冲突。已读README、最新STATE、近期决定、学习协议、代码提案闭环、首次构建和最近增量方法、学习账本说明。独立完成，未派下级agent；只改本树silent经验、指定scratch及授权的根变更记录/CLI队列。',
    f'- 全引擎silent学习观察截至{A["cutoff"]}，共{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(x["death"] for x in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧175局只进数字和历史机制验证，不是纯Codex爬塔战绩；无character旧局、其他角色、未完局和切点后局排除。',
    '- decisions/brain/SL/计划按run id用rg抽取；states/reasoning按决策时间窗二分seek流读，每帧复核state.run.character_id。两局分别370/248决策、375/255状态、2/2计划、6/0 SL。18/14真实脑请求均Codex，DeepSeek推理窗各0，不以兼容ds字段造原话。原运行d6a39489f+dirty/29cd6a323+dirty未完整复原。',
    '- 口径沿用上一节：同房首COMBAT入口HP−最后真实退出HP是战内净损，包含回复、自伤和上限变化，不等敌方毛伤；SL同房一场，判死截断不计实死。走廊仅Monster，Unknown另列；入口档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT入口档关联下一更高层首战，Ancient排除；回血后的同场后战去重，节点/动作/战斗/局分母分别列。',
    '- 先重算上一节175局，七数组、血档、节点转移、HEAL与SL逐项相等：'+str(json.load(open(O/'baseline-check.json')))+'。无基线数字不一致。历史相关静默复盘按标题/角色/截止局流式筛读，共801段保存在historical-mechanism-notes.txt；全参数和局号在audit.json。',
    '- 新局1258条原始字节偏移/SHA全部核实；949项角色/证据/参数核验通过。果增力历史A4两局的四原帧另按时间二分seek对上logs/states.jsonl原件。主题支持局数不是每句公式的独立因果样本，正常败局不自动计机制反例。',
    '- 历史参数另验震荡波10次/2局、毒雾1016次/85局、坚韧41次/10局、毒药768次/44局；毒雾净增2/3分别475/540次，另1LMBFGSMCWKU F45首牌带投斧单步净建6，内部重放缺帧，不当单次升级常量6。坚韧41次均建2额度；仪式兽23局45次相邻原帧清横冲均跨现场阈值。完整动作/候选及被动来源限制见historical-parameter-audit.json。',
    f'- 增1、改{U["updated"]}（加证据{U["evidence"]}、只改数字0）、退0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字。未达55000压缩线，未改60000预算；同主题并原条目，无预算合并/退役。',
    '', '### 对照数据检查的主题', '', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for c in C:
    e=c['after']; me=ME[e['id']]
    lines.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{me["asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
lines += ['', '路线血量分档按进阶分别列：n为独立战斗房，局为不同run，死亡率=实死/n，活损中位只含获胜战。零样本在audit.json保留，以下列非零格；跨局选路不是受控改线实验。', '',
    '| 进阶/幕/房间/入口血档 | 数据（房/局/死、死率、活损中位） | 结论 |', '| --- | --- | --- |']
for b in A['bands']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 观察，非安全血线 |')
lines += ['', '休息/商店/普通问号节点按入口档关联下一战；一个后战可对应多个前节点，节点死亡率不当独立后战死亡率或路线干预效果。', '',
    '| 进阶/幕/节点/入口血档 | 数据（节点/去重战/死、比例、活损中位） | 结论 |', '| --- | --- | --- |']
for b in A['transfers']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 后战关联，非干预因果 |')
lines += ['', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):
    lines.append(f'| A{r["asc"]} HEAL | {r["runs"]}局/{r["rests"]}独立火/{r["heal"]}HEAL，实回{sum(r["gains"])}；去重{r["nexts"]}后战/{r["deaths"]}死，活损中位{r["median"]} | 即时缓冲不等整战胜因 |')
for r in json.load(open(O/'sl-summary.json')):
    lines.append(f'| A{r["asc"]} SL | 真正多尝试{r["fights"]}场/{r["attempts"]}试/{r["wins"]}次赢 | 同场尝试相关，判死不计实死 |')
sl=json.load(open(O/'sl-draw-comparison.json'))
lines += [f'| HX仪式兽SL | 1场6试0赢，记录共同前缀{sl["shared_recorded_prefix"]}张；前五T7/5/6/7/6判死，末T8真死；explore与重放/偏离全文另存 | 同抽前缀不等弃牌/轮次/洗牌后状态相同，不拟不存在的赢线 |',
    '| 新局资源链 | HX异鸟68→19、雕像40→8；两HEAL+42到boss29血空药；N8雕像70→1、三HEAL+62、异鸟43→2、藤蔓2→2却耗两药、后战死 | 赢战不省略，未访问火不预支；无可行替线受控比较 |',
    '| 药水事实 | HX取得2/实饮2/弃0/SL新增0，N8取得4/实饮4/弃0/SL恢复0；use_potion动作与槽变化逐项核 | 本场生成能力不当下战常驻能力，没有留药/另一随机选项胜负对照 |',
    '| 仪式兽阈值 | 末T6直伤24+结毒9=33，190→157，跨现场160清8力/横冲、1血不变；T8旧7毒后敌116 | 两题33与9不叠成42；取消当前攻不保证后段存活 |',
    '| 坚韧延迟与终局 | N8 F12T7即时5，T8/T9各5且额度1→消失；F15T2未打此牌，T3船夹板已无挡，22攻击对2血0挡 | 已施放才兑现，缺挡不能直接推出另一出牌整场能赢 |',
    '', '### 经验库自己带偏或写了没被执行的地方', '',
    '- 两局32真实脑请求均Codex，DeepSeek推理窗0；没有DeepSeek引用条目的原话，也未证实脑推理明确引用具体经验ID，不造经验诱导因果。',
    '- HX d5原话：“三处营火保障血量，商店补群伤防御，稳取两只精英。”后来的plan写avoid，实际route-follow仍到F15；两次回血已执行，但六次29血空药boss仍败。计划变化不冒作已完成换线；另一可行路线未控。',
    '- N8 d3原话：“早店兑现432金币，四营火支撑两精英。”只到三火，第四火之前死。F9改elites=avoid未重排路线，实际到F12；不能把计划愿望当已经避精英，也不能由死亡倒推四火计划必错。',
    '- N8 F12T7坚韧在原题scaling_gained=none，实有两次轮初挡；经验已记录该机制而当前推演未接线。只有普通牌/实额度已核，不把整场短程差异或F15死亡全归此缺口。',
    '', '### 机制推理', '', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |']
mechanisms=[]
names={'silent-deck-burst-observation':'能力建立与跨战资源（观察）','silent-strength-weak-observation':'力量/敏捷与敌成长','silent-ceremonial-beast-threshold-growth-sl':'仪式兽阈值/SL','silent-ceremonial-beast-ringing-one-card':'仪式兽昏眩一牌','silent-byrdonis-strength-multihit-observation':'异鸟逐击增力','silent-bygone-effigy-wake-strength':'雕像苏醒十力','silent-jaxfruit-strength-vulnerable-observation':'闪光贾克斯果增力与易伤（观察）'}
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    head,rest=e['lesson'].split('决定胜负的战斗：',1);budget,case=rest.split('典型案例：',1)
    name=e.get('name',names.get(e['id'],e['id']));mechanisms.append(name)
    lines.append(f'| {name} | {head} | {e["n_support"]}/{e["n_contradict"]}；分阶{ME[e["id"]]["asc"]}；{budget} | {case} | {e["id"]} |')
lines += ['', '机制条目按[0,20]及现场数值/带进阶占位符；路线、休息、构筑观察按[8,20]。低阶支持不当A10安全线，没有高阶反驳需降低上限的策略；单项整场胜因未隔离均标观察/未控。', '', '### 新增', '']
for c in C:
    if c['before'] is None:lines.append(f'- {c["id"]}：3支持/0反例、med、[0,20]；A4两局与A10本局支持果增力观察，关联原silent-0345；无另造重复条目。')
lines += ['', '### 更新', '']
for c in C:
    if c['before']:
        b,e=c['before'],c['after'];new=[n for n in e['evidence'] if n not in b['evidence']]
        lines.append(f'- {e["id"]}：支持{b["n_support"]}→{e["n_support"]}，证据追加{",".join(new)}；正文{len(b["lesson"])}→{len(e["lesson"])}字，置信度{b["confidence"]}→{e["confidence"]}；反例及asc保持。')
lines += ['', '### 退役', '', '- 无；没有反例多过支持或本次已修的机制，未作预算合并。', '', '### 和手写知识及代码冲突', '',
    '- 改了的手写知识：无。silent其他8份JSON已核角色、来源/生成时点、机制参数和低信任边界，未发现需覆盖的手写规则。outcome-stats、room-costs、校准数据有各自旧切点；预测值不当本次177局实数或必死证明。metadata/SHA见other-knowledge.json；未覆盖并行刷新。common monster-db已核相关敌HP、招式与按进阶值，A10兽262/雕像132/异鸟90与本局相符，数值不同阶段读现场。',
    '- 当前card-model.ts:852只取即时Block；rollout.ts:1948能力接线无TORIC_TOUGHNESS_POWER，两次额度未载入，:2599初始化单次nextTurnBlock、:1764消耗清零。combat-plan.ts:4740已有RINGING_POWER单牌上限，昏眩不是新bug。只读定位，本任务未改打法源码。',
    '- 三份专用CLI提案'+','.join(P)+'覆盖全部14变更active条目，source_task=experience-update、experience明确关联、target_task=strategy-proposal；涉及combat/potion/sl/terminal/structure。纯模型缺口silent-0344也关联延迟挡提案，未冒作经验文字或标implemented/shipped。',
    '', '### 代码问题（不给 DS）', '',
    '- 已有复盘新模型bug silent-0344：坚韧之环两次轮初挡缺少推演接线，关联独立strategy-proposal；保留observed，不把修复已完成当成事实。无本任务新增纯基础设施bug，未改源码。',
    '- 核验初稿把run-plans的run字段按run_id取，KeyError；后把blocked_by_hook当顶级布尔字段而非unplayable_reason，断言失败。均按原始字段修正后核验通过；verify-sources-v1/v2及失败日志保留，没有把抽取错误当游戏bug。',
    '- 缺完整dirty运行源码、前五SL独立出口、部分末击归零/过量、完整洗牌后同抽序、未选首牌/留药/路线/构筑/休息的受控整战反事实、未访节点资源和旧boss时钟比值；不以预训练知识填空。',
    '', '### 测试', '',
    f'- 原bash agent/tools/test-sandbox.sh、TMPDIR指定scratch、PATH本机node、SANDBOX_WORKERS=1、固定数据及排除名单；tsc {T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；重跑{T["retried"]}。沙箱外完整套件由调度器按完成事件补跑。',
    '- JSON合法、diff --check、gitleaks staged、check-experience missing=[]均退出0；ledger.py check '+str(L['check'])+'。新增账本无；改proposed '+','.join(L['proposed'])+'；退役无；保留旧claim/first_run/prior及历史。实际shipped由运维核实。',
    '- 锁内live结果：'+LIVE['result']+'；刷新'+str(LIVE.get('refresh'))+'；合前'+str(LIVE.get('pre'))+'；实际合入'+str(LIVE.get('merged'))+'；合后测试'+str(LIVE.get('tests'))+'。']
for conflict in LIVE.get('conflicts',[]):lines.append('- '+conflict)
for conflict in LIVE.get('overlap_conflicts',[]):lines.append('- 刷新知识重叠：'+conflict)
if not LIVE.get('merged'):lines.append('- 按任务遇冲突停止，不硬解/覆盖刷新，不造上线记录/eval版本；源提交、账本与提案及全部失败证据交调用方/运维兜底。')
lines += ['', '### 切片大小', '',
    '- 固定种子20260929，从截止内state.run.character_id=silent最高两进阶A9/A10按六界面单遍水库采样，各20状态，共240配对，池均足20。新局入池；CHARACTER=silent调用官方knowledge-slice.ts，前后仅替经验；其他12份common/silent JSON含outcome快照逐字节一致。样本时间戳/池数在sample-manifest.json，逐状态完整切片另存。', '',
    '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |', '| --- | --- | --- | --- |']
for s in S['rows']:lines.append(f'| {s["sample"]} | {s["before_median"]}/{s["before_max"]} | {s["after_median"]}/{s["after_max"]} | {s["paired_median"]} |')
lines += ['', f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_growth"]:+}字），配对差中位{S["paired_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片差范围{S["delta_range"]}。',
    f'- active{U["after"]["active"]}、总字符{U["after"]["chars"]}，置信度{U["after"]["confidence"]}；A8 {U["after"]["by_asc"]["8"]}，A9 {U["after"]["by_asc"]["9"]}，A10 {U["after"]["by_asc"]["10"]}。预算内，无需Dai另定。',
    '', '全部原始抽取/偏移、历史基线/机制、前后经验/切片、CLI和提案、测试及合入预检原件保存于'+str(O)+'。', '']
body='\n'.join(lines)
result=dict(task='experience-update',version=U['version'],commit=source,merged=LIVE.get('merged'),added=U['added'],updated=U['updated'],retired=0,active=U['after']['active'],mechanisms=mechanisms,tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger={k:L[k] for k in ['added','proposed','retired','check']},code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'changelog-section.md').write_text(body)
(O/'changelog-title.txt').write_text(title+'\n')
(O/'report.md').write_text(body+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if '--append' in sys.argv:
    assert T['tsc']==T['vitest']==L['check']==0
    scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=body,text=True,capture_output=True)
    (O/'gitleaks-changelog.log').write_text(scan.stdout+scan.stderr)
    assert scan.returncode==0
    path=ROOT/'paper/materials/experience-changelog-silent.md'
    with path.open('a+b') as h:
        fcntl.flock(h,fcntl.LOCK_EX);h.seek(0);prefix=h.read()
        assert title.encode() not in prefix
        addition=('\n'+body).encode();h.seek(0,2);h.write(addition);h.flush()
    (O/'changelog-append.json').write_text(json.dumps(dict(file=str(path),before_bytes=len(prefix),before_sha256=hashlib.sha256(prefix).hexdigest(),added_bytes=len(addition),added_sha256=hashlib.sha256(addition).hexdigest(),title=title),ensure_ascii=False,indent=2)+'\n')
print('报告/章节',len(body),'字；源提交',source,'；实际合入',LIVE.get('merged'))
