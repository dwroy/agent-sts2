import collections
import fcntl
import hashlib
import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'))
C=json.load(open(O/'changes.json'))
U=json.load(open(O/'update-summary.json'))
S=json.load(open(O/'slice-summary.json'))
M=json.load(open(O/'ledger-map.json'))
ME={x['id']:x for x in json.load(open(O/'mechanism-evidence.json'))}
P=json.load(open(O/'code-proposals-results.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
V=json.load(open(O/'verification.json'))
source=(O/'source-commit.txt').read_text().strip()
L=json.load(open(O/'ledger-results.json'))
T=json.load(open(O/'test-results.json'))
LIVE=json.load(open(O/'live-merge.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title=f'## 2026-10-09 静默猎手 第一百三十九次增量：1 局 A10（version {U["version"]}，分支 exp-silent，{source[:8]}）'
lines=[title,'','### 来源','',
 f'- 记录时间{stamp}。根notes/lessons.md:8810起54G5683J0E5S完整小节分段只读，未见本节后续勘误；run-1009-2016-54G5683J0E5S.md为last_seen日期来源。runs.jsonl:659为SILENT/A10/F44败，没有角色跳过。',
 '- 开工exp-silent干净，git merge --no-edit main成功，无冲突，合后基线dc0f5774b。已读README、最新STATE、近期决定、学习协议、代码提案闭环、首次构建与最后两次增量方法、学习账本说明。独立完成，无下级agent；只修改本树silent经验、指定scratch、授权根记录/CLI。',
 f'- 全引擎silent学习观察截至{A["cutoff"]}：{len(R)}完局/{len(A["fights"])}独立战斗房/{sum(f["death"] for f in A["fights"])}实死，分阶{dict(sorted(collections.Counter(r["ascension"] for r in R.values()).items()))}。旧177局只进数字和历史机制验证，不是纯Codex爬塔战绩；其他角色、无character旧局、未完局及切点后局排除。',
 '- decisions/brain/计划/SL按run id用rg；states和reasoning按决策窗二分seek流读并复核state.run.character_id。新局639决策/670状态/10计划/3 SL，48真实脑调用均Codex；DeepSeek推理窗0。运行eaf3ac162+dirty的完整dirty源码未知，不当当前源码相同。',
 '- 口径沿用上一节：同房首COMBAT入口HP−最后真实退出HP为战内净损，包含回复/自损/上限变化，不是敌毛伤；SL同房一场，判死截断不是实死。走廊只Monster，Unknown另算。入口档<25%、[25%,40%)、[40%,60%)、≥60%；REST/SHOP/普通EVENT按入口档关联下一更高层首战，Ancient排除，HEAL后战去重，房/局/节点/动作分母分别列。',
 '- 上一节177局七数组、血档、节点转移、HEAL和SL逐项全等：'+str(json.load(open(O/'baseline-check.json')))+'。没有未解释的基线不一致。historical-mechanism-notes.txt按标题/角色/截止局筛读，历史全部178局日志重新分析；audit.json保留全量数字和来源局。',
 f'- {V["new_original_records"]}条新局原始字节偏移/SHA复核，历史典型案例{V["historical_original_records"]}帧另二分seek与states原件相等，角色/证据/公式共{V["checks"]}项核验通过。参数动作分母{V["parameter_summary"]}。步法净增分布2:749、3:394、1:9、6:22；1的历史帧有TENDER，6为同帧净变化，不当单卡普通参数6。主题支持局数不是每句公式独立实验，正常败局不自动作机制反例。',
 f'- 增1、改18（加证据18、只改数字0）、退0；active{U["before"]["active"]}→{U["after"]["active"]}，正文{U["before"]["chars"]}→{U["after"]["chars"]}字。未达55000压缩线；无预算合并/退役，不改60000测试预算。',
 '', '### 对照数据检查的主题','', '| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for c in C:
    e=c['after'];me=ME[e['id']]
    lines.append(f'| {e["id"]} | 支持/反例{e["n_support"]}/{e["n_contradict"]}；分阶{me["by_asc"]}；账本{",".join(M[e["id"]])} | {e["lesson"]} |')
lines+=['','路线血量分档：n为独立战斗房，局为不同run，死率=实死/n，掉血中位只含赢战。各阶分开、零样本保留audit.json；以下非零格。','', '| 进阶/幕/房间/入口档 | 数据（房/局/死、死率、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['bands']:
    if b['n']:lines.append(f'| A{b["asc"]}/{b["act"]}/{b["type"]}/{b["band"]} | {b["n"]}/{b["runs"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 观察，非安全血线 |')
lines+=['','低血选不同节点的历史观察按同阶/幕/入口档对照；一个后战可关联多个前节点，节点死亡率不是独立战死亡率。休息/商店/普通问号后下一战的数据混有不同牌组/敌人/可选路线，不能称改路线必然更好。','', '| 进阶/幕/节点/入口档 | 数据（节点/去重战/死、比例、活损中位） | 结论 |','| --- | --- | --- |']
for b in A['transfers']:
    if b['n']:lines.append(f'| A{b["asc"]}/{b["act"]}/{b["screen"]}/{b["band"]} | {b["n"]}/{b["unique_fights"]}/{b["deaths"]}；{100*b["deaths"]/b["n"]:.2f}%；{b["median_win"]} | 后战关联，非干预因果 |')
lines+=['','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
for screen in ['REST','SHOP','EVENT']:
    b=next(b for b in A['transfers'] if (b['asc'],b['act'],b['screen'],b['band'])==(10,3,screen,'40–60%'))
    cases=[f'{x["run"]} F{x["floor"]}→F{x["next_floor"]}' for x in b['cases'][-3:]]
    lines.append(f'| A10三幕低血节点对照/{screen} | 40–60%入口{b["n"]}节点/{b["unique_fights"]}后战/{b["deaths"]}死，活损中位{b["median_win"]}；案例{cases} | 同档未匹配牌组/敌人，不外推选择因果 |')
for r in json.load(open(O/'rest-summary.json')):lines.append(f'| A{r["asc"]} HEAL | {r["runs"]}局/{r["rests"]}独立火/{r["heal"]}次HEAL，实回{sum(r["gains"])}，去重{r["nexts"]}后战/{r["deaths"]}死，活损中位{r["median"]} | 即时缓冲不保证后战 |')
for r in json.load(open(O/'sl-summary.json')):lines.append(f'| A{r["asc"]} SL | 多次尝试{r["fights"]}场/{r["attempts"]}试/{r["wins"]}次赢 | 同场尝试相关，判死不是实死 |')
lines+=['| 新局SL | F17/F33/F44各attempt1、won/won/died、无reload | 3条跟踪不是3次SL；不添不存在的重打胜果 |',
 '| 新局血药链 | F35 66/75→54/73；F37 54→48耗铜液；F39事件48→37；F40回21到58；F42巨斧58→15耗赌徒/敏捷两药；F43回21到36，F44死亡 | 赢战血价保留，未到F46商店/F47火不预支 |',
 '| 药水/回复 | 实得12、实饮12、弃0、SL恢复0；HEAL七次各21=147，锻造3次，跨幕19+32、果汁5、再生15分账 | 净损不当敌毛伤，不拟喝留门槛 |',
 '| 组装师/判死 | F44T2五轮8/8存活，实际T3另两敌17+15−8=24需损、21血归零、存活至少差4；主怪86/155 | 新召唤/高电压/脆弱均核现场，不由局部推演当必活；修后胜果未知 |',
 '| boss模拟对照 | F16墨影65血模型96.2%/约13轮/活损中位33，实F17 11轮净损19；知识恶魔56血模型5%/约16.5轮/活损46，实际喝果汁后12轮净损22（含+5回） | 条件不同，不从22对46归纯模型误差；未到实验体，0%不当必死 |',
 '| 路线投影 | F8新路线F13投影64、实到火前24/后45，期间F9锻造并又改线；F28新投影F32 46，实际火前35/后56 | 预测节点/时点/已执行选择必须一致，无旧路线实走对照 |','',
 '历史SL对照原始explore/sl_explore、draws和动作全文见sl-draw-comparison.json；同抽前缀不等完整同盘。170场原SL标签另加TD1跨进程恢复重建1场，共171场/56获胜尝试，与分阶汇总一致。TD1缺原SL第二次落盘，沿上一节用状态/决策时窗重建，不称成功reload。','',
 '| 局/阶/层 | 尝试/赢次/共同记录前缀 | 赢试与首试的首动作差异 | 结论 |','| --- | --- | --- | --- |']
for x in json.load(open(O/'sl-draw-comparison.json')):
    changes=[str(dict(attempt=w['attempt'],before=w['before'],after=w['after'])) for w in x['wins']]
    lines.append(f'| {x["run"]}/A{x["asc"]}/F{x["floor"]} | {len(x["attempts"])}/{len(x["wins"])}/{x["shared_recorded_prefix"]} | {"；".join(changes) if changes else "无赢次；完整尝试另存"} | 观察，动作/药时/后抽同时变化，非单因果 |')
lines+=['','### 经验库自己带偏或写了没被执行的地方','',
 '- 48真实脑请求均Codex，DeepSeek推理窗0；没有DeepSeek引用条目的原话，未证实脑推理明确引用具体经验ID，不造经验诱导因果。',
 '- F1 d3原话：“三火一精英，后期商店补强，保留飞靴应对后幕。”F43脑理由中文译意为“回到36血，立即存活优先于升级，继续无精英路线并在商店找成长或保护药水”（d618）。回血实际兑现，后店未访问，未定其路线错误。',
 '- F42T1原计划报当轮损0且含敏捷药，但深谋远虑回顶后方案被打断；实际敏捷T2才喝，T1承受18。F44T1原计划“深谋远虑→防御→迷雾+→蜃景”被回顶防御打断，实际改双迷雾/精密，蜃景未施放。未执行完整线不当预测已兑现。',
 '- F44T2 chosen_order原文“戳刺机器人 > 组装师”是模拟后续策略，实际两张目标牌都打组装师；不把文字当先杀承诺，不称戳刺优先已赢。F42T6护栏预测省14血同时少14伤/7毒，原线未实打，不由后败认定替换错误。','',
 '### 机制推理','', '| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
names={'silent-deck-burst-observation':'能力兑现与HP护栏取舍（观察）','silent-strength-weak-observation':'力量/敏捷/临时减力','silent-frail-card-block':'脆弱逐牌折减','silent-act-transition-missing-hp-heal':'跨幕缺失HP回复','silent-zapbot-high-voltage-growth':'电击高电压（观察）','silent-axebot-stock-phase-budget':'巨斧库存与阶段预算','silent-fabricator-living-summon-observation':'组装师活体召唤（观察）'}
mechanisms=[]
for c in C:
    e=c['after']
    if '机制：' not in e['lesson']:continue
    head,rest=e['lesson'].split('决定胜负的战斗：',1);budget,case=rest.split('典型案例：',1)
    name=e.get('name',names.get(e['id'],e['id']));mechanisms.append(name)
    lines.append(f'| {name} | {head} | {e["n_support"]}/{e["n_contradict"]}；分阶{ME[e["id"]]["by_asc"]}；{budget} | {case} | {e["id"]} |')
lines+=['','机制按[0,20]和现场数值解释，案例数字不是固定跨阶常量；路线/休息/构筑观察保留[8,20]。新召唤仅A3/A10两局，不推生成分布；高电压7局主题支持中连续增长仅历史6局，本局只一步。单项整场因果未隔离均标观察/未控，没有高阶反例迫使策略上限或退役。','',
 '### 新增','', '- silent-fabricator-living-summon-observation：2支持/0反例、med、[0,20]，证据10GPK5XGHCK3 A3与54G5683J0E5S A10；关联已有silent-0348，不另造重复账本。','', '### 更新','']
for c in C:
    if c['before']:
        b,e=c['before'],c['after']
        lines.append(f'- {e["id"]}：支持{b["n_support"]}→{e["n_support"]}，追加54G5683J0E5S；正文{len(b["lesson"])}→{len(e["lesson"])}字，置信度{b["confidence"]}→{e["confidence"]}；反例及asc保持。')
lines+=['','### 退役','', '- 无；本任务没有已修机制、反例多于支持或预算合并。','', '### 和手写知识及代码冲突','',
 '- 改了的手写知识：无。silent其他8份JSON按来源/生成时点/角色、模型事实和低信任边界核对，metadata/SHA见other-knowledge.json；未发现需改成新数据的手写规则。生成统计/校准有旧切点，与本次178局数字不混，不由模拟0%证必死；未覆盖后台刷新。',
 '- common monster-db里A10组装师155、戳刺基伤12、电击基伤15与本局现场相合。AXEBOT旧A10初HP仅1样本84，本局77及后体93/96属新的随机实体观察；沿现场读数、不把旧样本写成固定上限，common不由本任务修改。',
 '- 当前rollout-live.ts:831/832仅装ILLUSION_MOVE活体召唤，rollout.ts:2320消费已传summons；缺组装师攻击召唤。临时减力、敏捷、脆弱已有模型，本次固定实盘提案核一致性，不把所有差或死亡归一个缺口。本任务未改任何打法源码。',
 '- 三份CLI提案'+','.join(P)+'覆盖全部19变更active条目，source_task=experience-update、experience明确关联、target_task=strategy-proposal，实际领域combat/potion/sl/terminal/structure；原模型缺口silent-0347另关联召唤提案，全部pending，未冒标implemented/shipped。','',
 '### 代码问题（不给 DS）','',
 '- 纯模型问题silent-0347已由复盘登记：组装师活体攻击召唤缺接线。本次仅关联独立strategy-proposal；经验保存的是实盘招式/实体/数值，不向大脑塞源码bug。无本任务新增纯基础设施bug。',
 '- 初稿蜃景案例曾把单卡16挡对尖啸后18攻的差2当整轮损2；核完整后继动作发现T9实际零净损，提交前改为只记单卡16及后继挡另账。该初稿补丁历史保留，不计游戏bug。SL原170场标签与既有171场口径差是TD1跨进程重建，已按旧基线解释并保留原标签。',
 '- 完整dirty运行源码、永久实体ID、毒杀/补召唤内部帧、巨斧恢复满血中间帧、末击/过量、完整洗牌后同抽、未选目标/牌序/药时/构筑/路线/休息整场反事实、未访F46/F47及三幕boss、旧每轮boss时钟两比值均缺数据，不用预训练知识补。','',
 '### 测试','',
 f'- 原bash agent/tools/test-sandbox.sh，TMPDIR指定scratch、PATH本机node、SANDBOX_WORKERS=1，固定数据/原排除名单：tsc {T["tsc"]}；vitest {T["files"]}文件/{T["cases"]}用例/退出{T["vitest"]}，重跑{T["retried"]}。完整外部套件由调度器按完成事件补跑。',
 '- JSON合法、diff --check、gitleaks staged、check-experience missing=[]均0；ledger.py check '+str(L['check'])+'。账本新增无，proposed '+','.join(L['proposed'])+'，退役无；旧claim/首证/prior/历史保持，实际shipped由运维核。',
 '- 锁内live结果：'+LIVE['result']+'；刷新'+str(LIVE.get('refresh'))+'；合前'+str(LIVE.get('pre'))+'；实际合入'+str(LIVE.get('merged'))+'；合后测试'+str(LIVE.get('tests'))+'。']
for x in LIVE.get('conflicts',[]):lines.append('- '+x)
for x in LIVE.get('overlap_conflicts',[]):lines.append('- 刷新知识重叠：'+x)
if not LIVE.get('merged'):lines.append('- 按任务遇冲突停止，不硬解/覆盖刷新、不造上线记录/eval版本；源提交、账本、提案及原失败证据交调用方/运维兜底。')
lines+=['','### 切片大小','', '- 固定种子20260929，截止内state.run.character_id=silent最高两阶A9/A10、六界面各20状态，共240配对，单遍水库采样且各池足20，新局入池。CHARACTER=silent调用官方knowledge-slice.ts，前后只替经验；其他common/silent 12份JSON包括outcome快照逐字节一致。样本池/时间戳与逐片正文保留。','', '| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对差中位 |','| --- | --- | --- | --- |']
for s in S['rows']:lines.append(f'| {s["sample"]} | {s["before_median"]}/{s["before_max"]} | {s["after_median"]}/{s["after_max"]} | {s["paired_median"]} |')
lines+=['', f'- 整体中位{S["before_median"]}→{S["after_median"]}（{S["median_growth"]:+}字），配对差中位{S["paired_median"]}；最大{S["before_max"]}→{S["after_max"]}，单片差范围{S["delta_range"]}。',
 f'- active{U["after"]["active"]}、总字符{U["after"]["chars"]}，置信度{U["after"]["confidence"]}；A8 {U["after"]["by_asc"]["8"]}，A9 {U["after"]["by_asc"]["9"]}，A10 {U["after"]["by_asc"]["10"]}。需要Dai定：无。','', '全部原件、前后经验/切片、基线/公式/历史SL、CLI/提案、测试、合入预检与报告保存在'+str(O)+'。','']
body='\n'.join(lines)
result=dict(task='experience-update',version=U['version'],commit=source,merged=LIVE.get('merged'),added=U['added'],updated=U['updated'],retired=0,active=U['after']['active'],mechanisms=mechanisms,tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger={k:L[k] for k in ['added','proposed','retired','check']},code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'changelog-section.md').write_text(body)
(O/'changelog-title.txt').write_text(title+'\n')
(O/'report.md').write_text(body+'\n```json\n'+json.dumps(result,ensure_ascii=False,indent=2)+'\n```\n')
(O/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
if '--append' in sys.argv:
    assert T['tsc']==T['vitest']==L['check']==0
    scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=body,text=True,capture_output=True)
    (O/'gitleaks-changelog.log').write_text(scan.stdout+scan.stderr);assert scan.returncode==0
    path=ROOT/'paper/materials/experience-changelog-silent.md'
    with path.open('a+b') as h:
        fcntl.flock(h,fcntl.LOCK_EX);h.seek(0);prefix=h.read();assert title.encode() not in prefix
        addition=('\n'+body).encode();h.seek(0,2);h.write(addition);h.flush()
    (O/'changelog-append.json').write_text(json.dumps(dict(file=str(path),before_bytes=len(prefix),before_sha256=hashlib.sha256(prefix).hexdigest(),added_bytes=len(addition),added_sha256=hashlib.sha256(addition).hexdigest(),title=title),ensure_ascii=False,indent=2)+'\n')
print('报告/章节',len(body),'字，源',source,'实际合入',LIVE.get('merged'))
