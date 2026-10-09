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
ME = {x['entry']: x for x in json.load(open(O / 'mechanism-evidence.json'))}
M = json.load(open(O / 'ledger-map.json'))
P = json.load(open(O / 'code-proposals-results.json'))
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
source = (O / 'source-commit.txt').read_text().strip() if (O / 'source-commit.txt').exists() else '待提交'
L = json.load(open(O / 'ledger-results.json')) if (O / 'ledger-results.json').exists() else dict(added=[], proposed=list(dict.fromkeys(i for v in M.values() for i in v)), retired=[], check=None)
LIVE = json.load(open(O / 'live-merge.json')) if (O / 'live-merge.json').exists() else dict(merged=None, result='待源测试/提交后锁内预检')
T = json.load(open(O / 'test-results.json')) if (O / 'test-results.json').exists() else dict(tsc=None, vitest=None, files=0, cases=0, retried=False)
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
title = '## 2026-10-09 静默猎手 第一百三十七次增量：1 局 A10（version 2026-10-09.26，分支 exp-silent，' + source[:8] + '）'
lines = [title, '', '### 来源', '',
    '- 记录时间' + stamp + '。只读根notes/lessons.md:8652起HNX4A2WBC34W整节及run-1009-1851-HNX4A2WBC34W.md；无本局后续勘误。runs.jsonl:656核SILENT/A10/F48/victory=false、code=5957f0563+dirty，未到F49；没有角色跳过，last_seen据run-1009文件名。',
    '- exp-silent开工干净，git merge --no-edit main快进至0d7e63242，无冲突。先读README、最新STATE、近期decision-log、学习协议、代码提案闭环、首次构建与最近两次增量/账本方法；独立完成，不派下级agent。仅本树silent/experience.json、指定scratch、根变更记录追加和两种CLI队列；不联网、不运行play、不推送、不改源码/运维prompt/其他角色知识。抽数单进程nice19，测试单worker。',
    f'- 全引擎silent学习观察截止{A["cutoff"]}，共{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(x["death"] for x in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧174局只进数字和历史机制验证，不是纯Codex爬塔成绩；其他角色、无character旧局、进行中与切点后局排除。',
    '- 决策/脑/SL/计划按局号rg；states/reasoning按时窗二分seek流读，复核state.run.character_id。新局850决策、9计划、7 SL；复盘原抽取912状态与其余记录共1779条按原字节偏移/SHA全部核验，范围包括首决策前状态。49真实脑请求均Codex、DeepSeek推理窗0；不以兼容ds字段冒称DeepSeek引用。原完整dirty源码未记录。',
    '- 口径同上一节：同房第一COMBAT入口HP−最后真实退出HP是战内净损，包含回血/自损/上限变化，不等敌毛伤；SL同房一场，判死截断不作实死。走廊仅Monster，Unknown另列；入口血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按节点入口血档关联下一更高层首战，Ancient排除；HEAL后战去重，局/房/节点/动作分母分开。',
    '- 先重算上一节174局，七数组、血档、节点、HEAL与SL逐项全等：' + str(json.load(open(O / 'baseline-check.json'))) + '。没有基线数字不一致。历史静默复盘流式按标题/角色/截止局筛读，保存在historical-mechanism-notes.txt；全参数与局号在audit.json。',
    '- 1369项角色/证据/主题参数核验通过；historical-parameter-audit.json另核支持范围步法1152次/101局、毒雾1015次/84局、触媒527次/60局、余像310次/36局。步法净差1的9次均有同帧TENDER1，卡牌增益与净属性变化分源；已见重放/多张叠层不当单次普通牌参数。主题支持局数不是每个公式或每条分句的独立因果样本，正常败局不当机制反例。',
    f'- 增0、改{U["updated"]}（加证据{U["evidence"]}、只改数字0）、退0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字。未达55000压缩线，不改60000预算；无预算合并/退役，同主题新案例替换与压短见更新表，原细节和初稿保留。',
    '', '### 对照数据检查的主题', '', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for c in C:
    e = c['after']; m = ME[e['id']]
    lines.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{m["asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')

lines += ['', '各阶路线血档：n是独立战斗房，局为不同run，死亡率=实死/n，活损中位只含胜战。零样本格在audit.json，这里只列非零格；不同路线的跨局关联不当改线因果。', '',
    '| 进阶/幕/房间/入口血档 | 数据（房/局/死、死亡率、活损中位） | 结论 |', '| --- | --- | --- |']
for b in A['bands']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 血档观察、非安全阈值 |')
lines += ['', 'REST/SHOP/普通EVENT入口血档与下一战：n是节点，同一后战可有多个前节点；节点死率不当独立后战胜率，也不当回血/改线干预效果。', '',
    '| 进阶/幕/节点/入口血档 | 数据（节点/去重战/死、比例、活损中位） | 结论 |', '| --- | --- | --- |']
for b in A['transfers']:
    if b['n']:
        lines.append(f'| A{b["asc"]}/{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 后战关联、非路线干预 |')
lines += ['', '| 主题 | 数据 | 结论 |', '| --- | --- | --- |']
for r in json.load(open(O / 'rest-summary.json')):
    lines.append(f'| A{r["asc"]} HEAL | {r["runs"]}局/{r["rests"]}独立火/{r["heal"]}HEAL，实回{sum(r["gains"])}；去重{r["nexts"]}后战/{r["deaths"]}死，活损中位{r["median"]} | 即时缓冲不等整场胜因 |')
for r in json.load(open(O / 'sl-summary.json')):
    lines.append(f'| A{r["asc"]} SL | 真正多尝试{r["fights"]}场/{r["attempts"]}试/{r["wins"]}次赢 | 同房相关，判死不是已实死 |')
for r in json.load(open(O / 'sl-draw-comparison.json')):
    lines.append(f'| HNX4A2WBC34W F{r["floor"]} SL抽序 | {r["attempts"]}试/{r["wins"]}赢；记录干净前缀共同{r["shared_recorded_prefix"]}张，入口指纹一致 | F33两试T6洗牌后顺序未控；F48各尝试抽入回合与T5/T6洗牌时点不同，不把相同牌序当全场同资源 |')
lines += ['| 本局HP护栏 | F14T4损24→14/伤25→8；F33首T3损20→10/伤15同、−4力/4弱变实−2/2；T5损12→1/伤21→6，建3敏而无新毒 | 题面差合31省血/32少伤，原线未实打；五轮两线各4/8死不等整场等价 |',
    '| 本局药水与回血 | 独立取得12瓶（9奖励/3商店），SL恢复5实例；17次实饮、0弃药，终局空栏；八HEAL回178、两SMITH不回；跨幕回32/44 | 取得、恢复与实饮不混，未知早喝/留药胜负不拟门槛 |',
    '| 沙虫转胜 | 两试58/75同速度入口；首T11敌106/9毒、12血3挡对33判死；重打T10敌8/11毒结束，19血不变 | 药时、萎靡投入、出牌与后续抽序同时变，不把转胜归取消护栏或仅挪药 |',
    '| 沙漏三败 | 三次78/95两药，前两T7判死，末T8实死；末T7三刀15加毒87合扣102、实损36；T8毒84后敌余130，静态需32而实际裁剪只扣2 | 毒实伤与生存预算分账；预计30的差2未归因，未知抽牌不判全空间无解 |',
    '| 三幕资源追溯 | F35耗6/F36耗19/F39耗37至1，F40回22至23，F43耗15至8；F44回22/F45上限及HP各+20/F47回28至78 | 大脑三火两店避精英计划已执行，仍未过首boss；无另路线/删牌/升级整场胜果 |',
    '', '### 经验库自己带偏或写了没被执行的地方', '',
    '- 49真实脑请求均Codex，DeepSeek推理窗0，没有DeepSeek引用条目的原话；不以兼容ds字段造经验诱导。',
    '- F34/d319180实际原话：“面具免费启动核心能力；三火两店避精英备连王。”F47按回血至78/95执行，三次均此资源入首boss，不归为大脑忘记连王，也不由死亡本身证明同一老错重犯。',
    '- d319433 Jev0.99选择毒药+/刀刃/两毒药，d319435 Jev0.96继续毒药/两刀；代码d319438已提示“ending now kills by what the mod\'s lethal flag does not count”。末T7仍真实损36，已有凋萎提醒不能当完全漏算。',
    '- d319441–319444末轮least-loss先抽牌再重规划，原话含“drawing first for a kill or block the hand does not have”和“keeps the most HP (-30)”。末帧静态32的差2待固定输入核验，死亡裁剪不是完整损失观测；没有未执行弃牌/少小刀胜果。',
    '- F14/F33三次HP护栏替换的即时取舍已验证，未执行原线不记实际救血；没有本批确认的同一关键错误repeat。账本沿support追加，独立提案核持续收益和全败模拟并列差额。',
    '', '### 机制推理', '', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |', '| --- | --- | --- | --- | --- |']
mechanisms = []
for c in C:
    e = c['after']
    if '机制：' not in e['lesson']:
        continue
    conclusion, rest = e['lesson'].split('机制：', 1)
    formula, rest = rest.split('搭配：', 1)
    pair, rest = rest.split('决定胜负的战斗：', 1)
    budget, case = rest.split('典型案例：', 1)
    m = ME[e['id']]
    name = e.get('name', {'silent-strength-weak-observation': '力量/敏捷与敌成长', 'silent-deck-burst-observation': '护栏与持续收益（观察）', 'silent-act-transition-missing-hp-heal': '跨幕回复', 'silent-aeonglass-artifact-growth-sl': '沙漏成长与SL（观察）', 'silent-insatiable-dual-clock': '沙虫双预算（观察）', 'silent-bygone-effigy-wake-strength': '雕像苏醒与力量'}.get(e['id'], e['id']))
    lines.append(f'| {name} | {conclusion}机制：{formula}搭配：{pair} | {e["n_support"]}/{e["n_contradict"]}；分阶{m["asc"]}；{budget} | {case} | {e["id"]} |')
    mechanisms.append(name)
lines += ['', '机制范围保留[0,20]，公式只按现场已见条件及带进阶占位符解释；路线/休息/构筑统计观察保留[8,20]。低阶案例不当A10安全线，本批没有被反驳需退役的低阶策略。单项整场因果未隔离均明说观察/未控，正常败局不作机制反例。',
    '', '### 新增', '', '- 无；同主题并入已有条目。', '', '### 更新', '']
for c in C:
    b, e = c['before'], c['after']
    lines.append(f'- {e["id"]}：支持{b["n_support"]}→{e["n_support"]}，追加HNX4A2WBC34W与核实案例；正文{len(b["lesson"])}→{len(e["lesson"])}字，asc/反例保持。')
lines += ['', '### 退役', '', '- 无；没有反例超过支持、已修机制或预算合并。', '', '### 和手写知识及代码冲突', '',
    '- 改了的手写知识：无。silent其他八份JSON按各自样本/生成时点、机制参数和低信任限制核对，未见需要覆盖的手写规则；生成的掉血统计、校准与单局预测不混本次175局实数，也不当0胜率必死。metadata/SHA见other-knowledge.json，未覆盖后台刷新。',
    '- 当前源码combat-plan.ts:1518读取凋萎持牌惩罚、:2945读取Tender，:4620为HP护栏理由。与已知持牌风险并不冲突；T8预计30与静态32缺同盘结算序/完整dirty源码，暂不登记纯bug。本任务不改任何打法源码。',
    '- 三份CLI提案' + ','.join(P) + '覆盖全部20变更active条目，source_task=experience-update且experience明确关联，target_task=strategy-proposal，涉及combat/potion/sl/terminal/structure；pending，无实际源码实现commit，不登记implemented/shipped。',
    '', '### 代码问题（不给 DS）', '',
    '- 新纯基础设施bug：无。持牌伤预算、护栏持续取舍、SL和终局资源属于独立学习策略提案，缺证保留行为；不会把死亡裁剪误判成游戏计算仅扣2。',
    '- 初始核验把328249结算后帧当T7末7挡帧、把327907饮药前帧当加5敏帧，断言失败；按原偏移改为328248/327908后通过。verify-new-v1.py与失败日志保留。初稿T7毒补量误归抽牌，实际三张毒药7/5/5，已按原决策与帧改正，未提交该初稿。',
    '- 参数校验初稿把不可打的WITHER当play_card主题，失败后改核持牌相关end_turn原帧，validate-v1.py/log保留。补核三次痊愈+1能/+2手牌/HP不变，毒药水首末加6而第二次只耗制品；verification-extra.json保存。',
    '- 未记录完整dirty源码、内部逐击/过量与部分归零帧、未选出牌/药时/构筑/路线/休息整战反事实、完整洗牌后同抽序、F49实盘、T8差2归因与旧时钟两比值。未知保留，不用预训练知识填。',
    '', '### 测试', '',
    f'- 原bash agent/tools/test-sandbox.sh，TMPDIR指定scratch、PATH本机node、SANDBOX_WORKERS=1，固定数据/固定排除名单。tsc {T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}；失败重跑{T["retried"]}。最终两处案例/分源文字精确化后，同沙箱入口经验/路径补验记录{T.get("final_check")}；外部完整套件由调度器按完成事件补跑。',
    '- JSON合法、diff --check、gitleaks staged、check-experience missing=[]均0；ledger.py check ' + str(L['check']) + '。新增账本无；proposed ' + ','.join(L['proposed']) + '；退役无。仅CLI追加，保留旧claim/首证/prior/状态历史/版本；实际合入后shipped由运维核登记。',
    '- 锁内live结果：' + LIVE['result'] + '；刷新' + str(LIVE.get('refresh')) + '；合前' + str(LIVE.get('pre')) + '；实际合入' + str(LIVE.get('merged')) + '；合后测试' + str(LIVE.get('tests')) + '。']
for conflict in LIVE.get('conflicts', []):
    lines.append('- ' + conflict)
for conflict in LIVE.get('overlap_conflicts', []):
    lines.append('- 刷新知识重叠：' + conflict)
if not LIVE.get('merged'):
    lines.append('- 未实际合入；遇冲突按任务停止，不硬解、不覆盖刷新、不造上线/eval版本；源提交、报告和原失败证据交运维兜底。')
lines += ['', '### 切片大小', '',
    '- 固定种子20260929，以单遍水库采样从截止内state.run.character_id=silent最高两阶A9/A10六界面各抽20状态，共240配对，样本池均足20；新增局入池。CHARACTER=silent官方knowledge-slice.ts，仅替换经验；common/silent其他12个JSON及outcome快照前后逐字节一致。按上一节同样本配对口径，采样实现由全量池一次抽样改为流式固定种子，以避免积存所有大状态；不是沿用旧样本。sample-manifest.json保留池数/时间戳。', '',
    '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |', '| --- | --- | --- | --- |']
for r in S['rows']:
    lines.append(f'| {r["sample"]} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["paired_median"]} |')
lines += ['', f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_growth"]:+}字），配对差中位{S["paired_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片差范围{S["delta_range"]}。',
    f'- active{U["after"]["active"]}，总字符{U["after"]["chars"]}，置信度{U["after"]["confidence"]}；A8 {U["after"]["by_asc"]["8"]}，A9 {U["after"]["by_asc"]["9"]}，A10 {U["after"]["by_asc"]["10"]}。需要Dai定：无。',
    '', '全部原抽取/偏移、历史基线/参数/复盘筛读、前后经验/切片、CLI、提案、测试和合入预检/失败原件保存在' + str(O) + '。', '']
body = '\n'.join(lines)
(O / 'changelog-section.md').write_text(body)
(O / 'changelog-title.txt').write_text(title + '\n')
result = dict(task='experience-update', version=U['version'], commit=source, merged=LIVE.get('merged'), added=0, updated=20, retired=0, active=198, mechanisms=mechanisms, tests=dict(tsc=T['tsc'], vitest=T['vitest'], cases=T['cases']), ledger={k: L[k] for k in ['added', 'proposed', 'retired', 'check']}, code_proposals=P, implementation_domains=['combat', 'potion', 'sl', 'terminal', 'structure'], report=str(O / 'report.md'))
(O / 'report.md').write_text(body + '\n```json\n' + json.dumps(result, ensure_ascii=False, indent=2) + '\n```\n')
(O / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
if '--append' in sys.argv:
    assert source != '待提交' and T['tsc'] == T['vitest'] == L['check'] == 0
    path = ROOT / 'paper/materials/experience-changelog-silent.md'
    with path.open('a+b') as h:
        fcntl.flock(h, fcntl.LOCK_EX)
        h.seek(0); prefix = h.read()
        assert title.encode() not in prefix
        addition = ('\n' + body).encode()
        h.seek(0, 2); h.write(addition); h.flush()
    (O / 'changelog-append.json').write_text(json.dumps(dict(file=str(path), before_bytes=len(prefix), before_sha256=hashlib.sha256(prefix).hexdigest(), added_bytes=len(addition), added_sha256=hashlib.sha256(addition).hexdigest(), title=title), ensure_ascii=False, indent=2) + '\n')
print('报告/章节', len(body), '字；源提交', source, '；实际合入', LIVE.get('merged'))
