import collections,json,re,statistics,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));M=json.load(open(O/'mechanism-evidence.json'));R=json.load(open(O/'run-metadata.json'));V=json.load(open(O/'verification.json'));S=json.load(open(O/'slice-summary.json'));P=json.load(open(O/'proposal-ids.json'));MAP=json.load(open(O/'ledger-map.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip();branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip();commit=(O/'source-commit.txt').read_text().strip() if (O/'source-commit.txt').exists() else '待提交';merge=json.load(open(O/'live-merge.json')) if (O/'live-merge.json').exists() else {'merged':None,'reason':'待源测试及锁内预检'};ledger=json.load(open(O/'ledger-result.json')) if (O/'ledger-result.json').exists() else dict(added=json.load(open(O/'ledger-added.json')),proposed=[],retired=[],check=0)
title=f'## {stamp[:10]} 静默猎手 第九十次增量：1 局 A10（version 2026-10-08.7，分支 {branch}，{commit[:8]}）';(O/'section-title.txt').write_text(title+'\n')
lines=[title,'','### 来源','',f'- 记录时间{stamp}；只读根notes/lessons.md:5649起KFRDELW2TH2P静默A10/F33败及05:53勘误（T6的35毒改36毒）。runs.jsonl:600角色SILENT，未跳过角色；对局a73ce7cc+dirty完整源码未留，不能以当前源码冒认原运行树。',
'- 开工exp工作区干净，git merge --no-edit main成功快进454cd844。已读README、最新STATE、决定末尾、学习协议/代码提案闭环、首次方法及最后两节、本角色最后两节、账本README；自己完成无下级agent。单进程nice19抽数/单worker固定测试，不联网、不安装依赖、不跑play或boss模拟池。临时文件仅本批scratch。',
'- 按run id重新抽587决策、35实际Codex脑记录、8 SL摘要及6 run-plans；states按UTC时间窗seek再核run_id/state.run.character_id，620帧，DeepSeek推理0。源字节偏移、587逐帧决策与动作前后状态保留，兼容ds_*不当DS调用。',
f'- 全引擎学习观察截至{A["cutoff"]}共{len(R)}静默完局，A0—A10局数'+ '/'.join(str(sum(r['ascension']==i for r in R)) for i in range(11))+f'；{len(A["fights"])}房/{sum(r["death"] for r in A["fights"])}实死。进行中、切点后、没有character的旧局及其他角色排除；无只进数字未读复盘的局，不替代纯Codex战绩口径。',
'- 沿用第89节：第一COMBAT HP减同房最终尝试退出HP；开场回血带来的负净损保留、实死单列。Monster仅走廊、Unknown问号战另列；训练假人不当实死。血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源节点入血关联下一更高层首战，Ancient排除、多源可同战；回血后战去重；营火数按独立层，动作/回血次数另列。',
'- 旧118局逐局重新执行分析，七数组、全部血档/节点转移/实回血/SL与上一节逐行一致，无口径偏差。新局15房14胜/1实死：F33五次判死截断不补未执行攻击/毒/退出帧，不算五次实际死亡；整房首次36→末0损36与末试可操作38→0损38分列。',
f'- 新增4、更新9（9条补证据，0条只改数字）、退役0；active161→165，正文52376→52792，置信{C["confidence"]}。开工未超过55000、未改60000预算；重复主题并入原条目。七条更新压短累计案例，前后全文及全部证据/反例保留changes.json/experience-before.json，没有合并退役。',
'','### 对照数据检查的主题','','| 主题 | 数据 | 结论 |','| --- | --- | --- |']
byid={m['id']:m for m in M}
for c in C['entries']:
 e=c['after'];m=byid[e['id']];lines.append(f'| {e.get("name",e["id"])} | 支持{m["support"]}/反例{m["contradict"]}；分阶{m["asc"]}；新证据'+','.join(c['new_runs'])+' | '+e['lesson'].split('。')[0]+' |')
lines += [
'| 连续赢战资源 | F29休44→65；F30入65补2胜27、F31入27补2胜15；入房净耗38+12=50，实际可操作耗40+14=54 | 两赢战是末战38可操作血的前序资源链，不能只复盘最后一次死亡 |',
'| 实得/饮用/弃药/SL | 独立得4、实饮13（敏捷1/铁心6/毒6）、弃狡诈1；五次SL恢复145 HP和10原药槽次；六火126、幕间38/小血瓶20分账 | 重复读档不当新获得或路线回血；提前喝/留药整战反事实未知 |',
'| 同盘T6SL | 首/第三试15血/228敌/36毒/3覆甲，同首张斗篷后第二斗篷换致命毒药，牌挡12→6、净扣83→93、实损6→12 | 代码探索多10伤同时多6损，没有实胜线；不是Jev原选 |',
'| 懒惰与奇巧 | 六次T7均手上技法/防御/刺击满3牌，奇巧爆发尚1能仍locked，无增益；Jev六置信0.10/0.08/0.14/0.06/0.10/0.04 | 本牌7挡有效，目标收益未兑现；不推另一对象能赢 |',
'| 最终存活/输出 | 末9 HP、12牌挡+2覆甲对12×3=36，完整需损22、实际截9、严格存活差14；初399+已回血30=429，累计扣355后敌74 | 不用初399替代完整需伤，不预支余41毒或未施放爆发 |',
'| 路线投影 | F18所选F24火39/实25、F29火50/实44、F32火49/实15、F33入70/实36；F7改线后节点房型改变 | 事件、构筑、药水亦变，非随机路线/回血对锻造对照，不归因单一算法 |',
'| 模拟/时钟 | F16回血整场1000样本胜40%、赢损中位35/约7轮，实6轮胜可操作损25；F32胜6%、赢损中位32/约10轮，六试T7止、实38→0残74；旧silent时钟未校准 | 赢样本不替代败样本预测；不以单局校准概率/旧时钟 |',
'','旧基线七数组复算：','','| 数组 | 旧 | 新 | 旧行一致 |','| --- | --- | --- | --- |']
for k,v in json.load(open(O/'baseline-check.json')).items():lines.append(f'| {k} | {v["before"]} | {v["after"]} | 是 |')
lines += ['','各进阶/幕/房型非空血档（房/独立局；活损中位；完整病例audit.json）：','','| 进阶 | 幕 | 房型 | 血档 | 房/局 | 实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
 if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','非战斗源节点下一场（源节点进房血档，多个源节点可指同战，不能与去重后战数混用）：','','| 进阶 | 幕 | 源节点 | 血档 | 源/去重后战 | 实死/率 | 活损中位 |','| --- | --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
 if r['n']:lines.append(f'| A{r["asc"]} | {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{100*r["deaths"]/r["n"]:.2f}% | {r["median_win"]} |')
lines += ['','营火动作与实际回血（独立火数与动作数分列）：','','| 进阶 | 局 | 独立火/回血/锻造动作 | 实回HP | 去重后战/死 | 活损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in json.load(open(O/'rest-summary.json')):lines.append(f'| A{r["asc"]} | {r["runs"]} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]} | {r["median"]} |')
lines += ['','SL真正多次尝试按场去重：','','| 进阶 | 重打场 | 尝试数 | 赢的尝试 |','| --- | --- | --- | --- |']
for r in json.load(open(O/'sl-summary.json')):lines.append(f'| A{r["asc"]} | {r["fights"]} | {r["attempts"]} | {r["wins"]} |')
lines += ['','本局F33六试均未赢，前五试判死中断/末实死；历史知识恶魔4场16试2赢，转胜两场后段行动/抽牌亦变。同抽的T6对照只确定局部血价，不冒认完整同抽胜因；各场attempt/explore/draws及逐回合动作留audit.json和本局analysis.json/facts.json。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 时间窗DeepSeek0，35实际脑记录全部Codex，没有DS引用条目原话可报，也未发现能由逐条引用确定的经验致错。F18原话“额外能量支撑毒防，三火零精英路线保命补强。”，实走三火、无精英仍先支付两赢战50净血；构筑未取计划中的步法/尖啸，未来组件不当已建立。',
'- T5诅咒原估值片段“SLOTH 0 (0.0 cards a turn)”与“2.5 cards/turn (0.0 auto)”是历史平均条件，不是后段爆发/小刀序列无血价实证；六次奇巧选爆发、T7锁牌是未兑现观察，没有其他诅咒整场反事实。',
'- F12T1护栏原候选由预测损12/扣19换成损0/扣12，但斗篷生成小刀后实际重问改线，最终损6/净扣14。未执行完候选线，不能记实省12或把0对6当同线模型误算。护栏/SL追踪原提案保留，未改源码。',
'','### 机制推理','','| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
for c in C['entries']:
 e=c['after'];m=byid[e['id']]
 if e['id'] in ['silent-route-hp-observation','silent-rest-buffer-observation']:continue
 lesson=e['lesson'];mechanism=lesson.split('机制：',1)[1].split('决定胜负的战斗：')[0].rstrip('。');case=lesson.split('典型案例：',1)[1]
 lines.append(f'| {e.get("name",e["id"])} | {mechanism} | {m["support"]}/{m["contradict"]}，分阶{m["asc"]} | {case} | {e["id"]} |')
lines += ['',f'- 全史395个本角色机制复盘段按角色/截止点提取；所有旧动作/轮末帧重新核。触媒51局433实打，建1/2各280/153；爆发16局85实打，建1/2各63/22；步法72局741实打，净增2/3/1各491/245/5，五次+1与柔嫩并发分开，不修改基础值。动作分母不是条目支持局数。机制完整支持/反例run id及进阶在mechanism-evidence.json；原帧在audit.json/facts.json/historical-power-deltas.json。',
'- 三药全史逐饮：敏捷44局64饮均+2/旧挡不变；铁心16局26饮均覆甲+7/旧挡不变；毒29局118饮都不即时扣本体，105饮加6、11饮加7（头骨3局）、2饮制品阻挡。分支不是无修饰剂量反例，未来未见组合仍未知。药水时点与完整覆甲减层条件未隔离，不规定固定喝/留阈值。',
f'- 跨幕{len(next(m["evidence"] for m in M if m["id"]=="silent-act-transition-missing-hp-heal"))}支持局/{V["transitions"]}对同上限边界核⌊缺失HP×80%⌋全吻合，只观察A9/A10。末结毒和HP生存窗决定当前是否终结，仍不能将单项局部收益写成整场受控胜因。',
'- 三份提案'+','.join(P)+'均source_task=experience-update、experience ids及账本关联齐全，target_task=strategy-proposal，领域combat/potion/sl/terminal/structure；只登记pending，不冒认implemented/shipped。',
'','### 新增','']
for c in C['entries']:
 if c['before']:continue
 e=c['after'];lines.append(f'- {e["id"]}（{e["scope"]}、{e["name"]}、asc{e["asc"]}、{e["n_support"]}/0、{e["confidence"]}）：'+e['lesson'])
lines+=['','### 更新','','| 条目 | 支持前→后 | 字符前→后 | 新证据 |','| --- | --- | --- | --- |']
for c in C['entries']:
 if not c['before']:continue
 b,e=c['before'],c['after'];lines.append(f'| {e["id"]} | {b["n_support"]}→{e["n_support"]} | {len(b["lesson"])}→{len(e["lesson"])} | '+','.join(c['new_runs'])+' |')
lines += ['','九条均补本局证据；七条压短累计案例，旧全文保留、证据及反例未删、已有进阶范围未扩大。新懒惰/奇巧策略限A10，具体药水有本角色完整历史支持，不搬其他角色知识。',
'','### 退役','','- 无；没有反例多于支持或已修bug型经验条目。',
'','### 和手写知识及代码冲突','','- 八个其他静默知识JSON核元数据/用途/切点与哈希，均为生成统计/独立校准或既有双boss四局观察数据，无手写攻略/手册需要改删；room-costs为MAP首末口径，monster-records战内/战后分列，异步不同截止点不当事实冲突。本局未到F49，double-boss无新参数。八文件哈希保持，记录other-knowledge.json；无其他角色知识读写。',
'- 本局实际毒药+6而恶魔候选标未知，以及奇巧选择未显示剩余额度/可打序列，是已核范围覆盖/上下文提案，代码中的手写知识本任务不改；当前独立实现有无等价由strategy-proposal核，不将经验数据发布当源码实现。',
'','### 代码问题（不给 DS）','','- 未定位新的纯bug；0245懒惰防御重放计数旧修复与本次三手动牌耗尽限额分开。复盘两份SL/护栏、奇巧/药水提案保留，本次补experience-update三份来源链，不冒报修复。',
'- 原dirty树、完整毛伤/部分末击、前五试末结算、完整实线最优比例、替路线/提前饮药/换奇巧/其他诅咒/完整护栏线的整战反事实、旧boss时钟和Jev缓存命中未记录，保持未知。',
'- 提案辅助脚本首次SyntaxError未执行CLI，原失败proposals-first-failure.log保留；改括号后CLI成功，不算游戏bug或测试失败。',
'','### 测试','']
test=(O/'test-source.log').read_text();counts=re.findall(r'Test Files\s+(\d+) passed',test);cases=re.findall(r'Tests\s+(\d+) passed',test);rc=int((O/'test-source.rc').read_text()) if (O/'test-source.rc').exists() else None
lines += [f'- 源原入口bash tools/test-sandbox.sh，TMPDIR本批/PATH含~/.local/node/bin/SANDBOX_WORKERS=1/nice19；tsc '+('0' if 'RUN ' in test else '待结果')+f'、vitest {rc}，'+str(sum(map(int,counts)))+'文件/'+str(sum(map(int,cases)))+'通过例；'+('无重跑' if not (O/'test-source-retry.log').exists() else '首轮失败后原入口完整重跑一次，失败历史保留')+'。完整外部由实际合入后调度器补，不冒报完整套件通过。',
'- JSON、字段/角色/局号/反例/预算、旧118局逐行基线、六试奇巧/同盘T6/末毒85、19跨幕转换、三药全史、240固定切片、check-experience missing=[]/0、gitleaks0、diff --check通过。',
'- 学习账本只经CLI：新增'+','.join(ledger['added'])+'；改proposed '+','.join(ledger['proposed'])+'；退役无，ledger.py check 0；保留原首证/prior/claim/repeat及旧上线，学习者不标accepted/shipped。',
f'- live实际合入：{merge.get("merged")}；刷新：{merge.get("refresh")}；合前：{merge.get("before")}；合后测试：{merge.get("after_test")}；结果：{merge.get("reason")}。']
lines += ['- '+r for r in merge.get('precheck_conflicts',[])]
lines += ['','### 切片大小','','- 种子20260929，从截止点state.run.character_id=SILENT最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP共240配对，每格20独立时刻；池/时点留sample-manifest.json。CHARACTER=silent调用官方knowledge-slice.ts，前后冻结同一common/silent/outcome快照。新池抽样，不把旧批中位当本批before；V4整份前缀另报本阶总字数。','','| 进阶/界面 | 改前中位/最大 | 改后中位/最大 | 配对增量中位 |','| --- | --- | --- | --- |']
for b,e in zip(json.load(open(O/'slice-before.json')),json.load(open(O/'slice-after.json'))):
 assert b['sample']==e['sample'];delta=statistics.median(y-x for x,y in zip(b['sizes'],e['sizes']));lines.append(f'| {e["sample"].replace("sample-", "")} | {b["median"]}/{b["max"]} | {e["median"]}/{e["max"]} | {delta} |')
lines += ['',f'- 整体中位{S["median_before"]}→{S["median_after"]}（{S["median_change"]}字），配对增量中位{S["paired_median"]}，单片最多增{S["max_growth"]}、最大{S["max_before"]}→{S["max_after"]}。active165/正文52792，置信{C["confidence"]}；A8适用{C["by_asc"]["8"]}，A9适用{C["by_asc"]["9"]}，A10适用{C["by_asc"]["10"]}。需要Roy定：无；如合入记录冲突交运维据真实结果续办，不冒报上线。',
'',f'原帧/脚本/初稿/失败/机制/提案/账本/测试/切片/合入回执均在{O}；报告时间{stamp}。']
text='\n'.join(lines)+'\n';(O/'changelog-section.md').write_text(text);(O/('report.md' if commit!='待提交' else 'report-draft.md')).write_text('# 经验库更新报告\n\n'+text)
print('报告',len(lines),'行；测试',rc,'；合入',merge.get('merged'))
