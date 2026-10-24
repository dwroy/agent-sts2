"""Write the reviewable scratch report and the single canonical final JSON."""
import hashlib
import json
import subprocess
from pathlib import Path

P = Path(__file__).resolve().parent
R = P.parent
ROOT = Path('/home/dw/Projects/agent-sts2')
BASE = 'f6361397f0d96b8dd20d9e108e0b69261396dfbd'
BATCH = '20261024-233359-strategy-proposal'
PLAN = 'issue51-remaining-build-003-20261024-r56-stock'
MSHA = '3f34a874aa09f82bc6a0365147a8bf5008dd3749402fb122eb04bfba834bcca1'
at = subprocess.check_output(['date', '--iso-8601=seconds'], text=True).strip()
mapping = json.loads((P / 'scenario-mapping.json').read_text())
counts = json.loads((P / 'decision-output-counts.json').read_text())
counts['fully_executable_playbooks'] = 0
(P / 'decision-output-counts.json').write_text(json.dumps(counts, ensure_ascii=False, indent=2) + '\n')
versions = json.loads((P / 'version-ledger.json').read_text())
coverage = json.loads((P / 'coverage.json').read_text())

playbook = '''# 簇5：有前置条件的施毒增幅与防护——全程描述性剧本候选

id: silent-c5-conditional-poison-defense-playbook
source: mixed
formal_publication: pending
consumer_readback: pending

本名来自本批核到的牌文与时序，不来自数字5：咕嘟冒泡要求敌方已有毒，触媒原文额外触发中毒，蜃景按已有毒总量给挡；有些赢家走持续施毒，有些走混合攻击/防护。这里只确认候选的共同问题是“怎样先建立可用毒源并撑到兑现”，没有证明簇5是单一玩法。NOXIOUS_FUMES在外部质心与轨迹中频繁出现，但本批没有核其原牌文，不补写该牌机制。与簇1旧毒剧本、簇6刀剧本分开；不重做它们，也不将簇号装入当前触发器。

## 证据与边界

external:sts2fun；公开地址 https://sts2.fun/static/sts2_public.db.zst；采集2026-10-21；数据库SHA 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5；代表输入SHA dfde8d6ec66f58fca63ca30d45d86d47c2d822e807e9f77f65cb3c4c65268eda。范围Silent A10、valid、singleplayer、未弃局、无modifier。许可未找到明确再分发授权，只用署名派生投影/聚合，不分发原库或玩家标识。v0.111簇5有238条上传/79胜；逐版本分母见version-ledger.json。模型实际通读pair 0/3/5/7/9的完整10条轨迹，共448节点，一对一页保留完整节点。其余五对只程序保存、未用于本结论。

自有为原506名单中的FZT053H9PSC5（A10、无重试证据、最终胜）及ATP5MCMJDMQY（A10、无重试证据、F17实际败），版本均unknown。所有快照/战斗/问题/计划四section的语义字段逐条读完，原有界页保留全部字段；阅读视图以继承字段和牌组多重集压缩重复，未逐字阅读所有off/ts或原生prompt。两局分母与外部上传不合并。无重试证据不证明未SL。winner的61条计划投影语义为空，路线从问题理由通读；理由和预测不是事实。winner终局GAME_OVER显示HP=0但胜利true，末战post_hp=26，不能据此发明死亡/复活机制。

## 第一幕：先区分来源与条件，资源循环另记

早期只有基础牌时，迷雾/蛇咬/猎杀者是不同用途，不能以“毒簇”压成固定拿牌令（c5-1）。只有迷雾这一已记毒源时，蜃景的按毒给挡仍有建立条件；同屏切割与过牌应分别比较（c5-2）。ATP在F2拿迷雾、F3拿切割，F6实购步法/匕首雨/投掷匕首/尖啸及遗物药水，F7升级迷雾，F8战用赌徒后46→45；F11精英用两药45→37，F12休到58；F14战58→53，F15取咕嘟冒泡，F16升级步法，F17带再生药53血进场仍败。药水变化与治疗、购买、消耗分别保留，不把末败归任何单牌，也不把前三场低掉血当安全阈值。

FZT的起点不同：F1加基础牌与遗物，F2后空翻+、F3猎杀者、F4匕首雨、F5偏折+；F5战55→27。F6买致命毒药+/尖啸+及药，F7休27→48，F8精英用两药48→48，F9休点因既有资源变60后升级中和，F11商店买步法与格挡药，F12战用药60→60，F13升级步法，F14拿触媒，F15早有准备+，F16升级带毒刺击，F17真实净损70→22。这里的胜战也有48点资源价；不与ATP当同起点对照。F17奖励选毒性爆发+是c5-4，目标为比较高费直接群毒/立即触发与其他启动路径，未核实际每次施放贡献。

## 第二幕：延迟防护与再添输出分别比较

FZT F18记录HP恢复至60，F19两敌战60→60、两回合后拿闪躲翻滚+（c5-6）；F21事件取得杂技+，F22战60→51，F23战51→31。F24买迷雾+，F25进火已49后升级触媒，F27进火67后升级带毒刺击。治疗来自记录资源变化，不把它全称休息选择。F28精英67→54后拿残影+（c5-5），F29进火70升级匕首雨，F30拿第二步法+，F31战70→63后拿第三步法+，F32进火70升级生存者，F33 Boss70→50。持有步法不等于每场已建立；残影保挡和翻滚下回合挡不全记当回合收益。

外部pair0失败代表b048在首Boss后仅8HP，经幕初恢复53仍在节点19、20连续掉28与12，节点24止；其持泡泡/毒源/防护也未获胜。pair7失败d0c早期已有泡泡、毒雾、蛇咬，仍终局失败；不能由签名齐备保证资源预算。反过来，pair7赢家3c88节点2得NOXIOUS_FUMES、7得泡泡、15得触媒，随后持续补给/防护并胜；不是证明这些选择的效果。

## 第三幕：当前已有组件不能预支下一场的建立

FZT F33拿肾上腺素+，F34后HP66，F35战66→66；F36买天选+，F37拿第二早有准备+，F38跳牌，F39事件换奖励后选余像+（c5-7）。这只核牌文“固有、每打牌1挡”，没有核所有开场手牌或施放回合，不能按未来连打预记挡。之后F42战70→64、F45战70→60、F46战60→39，足以反对已建立稳定免损的想象；F47休点/遗物链到63后升级防御，F48首记录70进场、23离场，F49首记录48进场、末战post_hp26，最终victory=true。仅记录实际端点，不把差额当某药或某遗物的已核机制，不开新Boss专题。

外部赢家8073节点35才取得泡泡、42才取得NOXIOUS_FUMES，已有触媒却首幕/二幕多次低HP；1498没有终局NOXIOUS_FUMES也胜，251a没有触媒也胜，8558没有泡泡也胜。故前三ID不是早期必须集齐的触发条件。外部全体还原合格赢家中三ID齐30/77，未观察齐47/77（另2赢家重建排除）；自有A10无重试证据仅1/29胜且该赢家从未齐三ID，齐备的3/29全是失败。重试/预判组28/100齐备、0/100最终胜，单列而非新独立首试。所有这些是事后相关，不能推出凑齐更差/更好。

## 七个局部情境与正式消费缺口

c5-1迷雾用途分拆（同ID更新）、c5-2蜃景前置（新）、c5-3泡泡前置（同ID更新）、c5-4毒性爆发费用/直接触发（新）、c5-5残影跨回合（同ID更新）、c5-6翻滚时窗（同ID更新）、c5-7余像建立（同ID更新）。每条都有对应rk描述标签；不提供hp/probability/contrast数值信号，不扩schema、不启#28、不运行模拟/Jev/游戏。逐条牌文、条件、样本和路径见candidates/与scenario-mapping.json。

完整可执行剧本=0；全程描述性候选=1。七段正式策略消费者、七rk消费者、原题回放、正式knowledge/剧本整体消费者、自然查询、实际采用与收益均pending。泡泡原例是事件内selection/add，当前格式检查只构造支持的奖励题DTO；未证事件内选牌会自然读取同条策略。不得把本次格式通过写成真实生产读回。正式发布仍须原发布锁、账本、生产读取与后续自然窗口；本批只写scratch、HEAD不变，科学父不关闭。
'''
(P / 'playbook.md').write_text(playbook)

notice = '''[learner] #51/#56 本批候选数量及限制，待原ops转主管；本文件不是已发送/已读回执。

冻结要求原文：“每个单元目标5～10条有区别情境→做法；新建/同ID更新/逐字节复用/统计行/别名分账，不拆泛句凑数。少于3条必须报主管原文、数目、缺口与下一步；3～4也未达5条，不冒达标。”

本批7个局部配对情境=2新建+5同ID补充；真实新增只有2，少于3，不能称新增达到5条。rk为5新标签+2同ID更新。旧统计/逐字节复用/别名均不计新情境。整单元有7个不同讨论窗口，但其中5项与已发布主题重叠，已复用原ID并保留全部证据和confidence。缺口是该冻结簇的可辨新决策情境有限，非等字段而整批waiting。

另外，自有唯一A10无重试证据赢家不含外部前三ID完整bundle，3个齐bundle的同层组均败；外部也有不齐组件赢家。这反对“质心三ID=必要成型或胜利保证”，不证明任何牌有害。新反例作为counterevidence保留；2条旧unassessed顶层追加明确失败反例后改为conflict，confidence不变，旧附件不删。

下一步：原ops验收这7对真实候选并沿已有发布链处理可发布段落；逐项保留原题回放/事件内选牌消费者/整体knowledge消费者缺口。不得为了凑5条新建而扩大数据、重复簇1/6/4/7或自派下一单元。所有交付与科学父状态仍pending。正式转发、watcher收到、Roy知悉均未由本学习者代填。
'''
(P / 'supervisor-notice.md').write_text(notice)

rows = []
for m in mapping:
    c = json.loads(Path(m['path']).read_text())
    rows.append(f"| {m['context_id']} | {m['strategy_disposition']} | {m['rk_disposition']} | {c['own_support_runs'][0]} F{c['strategy_entry']['evidence'][-3]['floor']} | {c['external_terminal_counts']['1']}/5 对 {c['external_terminal_counts']['0']}/5 |")
version_table = '\n'.join(f"| {v['version']} | {v['n']} | {v['wins']} | {100*v['win_rate']:.2f}% |" for v in versions['external_cluster5'])
report = f'''# strategy-proposal / Silent / 簇5冻结批报告

时间：{at}。batch={BATCH}；external_source={PLAN}；HEAD/base={BASE}。

完成7个局部文字策略/rk配对候选：**真实新增情境2，同ID更新5**。rk新增描述标签5、同ID更新2；新增双方100门比较0。完整可执行剧本0，全程描述性候选1。正式发布、生产读回、自然消费/采用/收益均0；科学父保持开放。仅scratch和本报告/result.json落盘，无源码、正式库、共享统计、main/live或请求/调度登记修改，无新模型/MC/Jev/游戏/full。

## 身份、契约与输入

先读README、最新STATE-2026-10-19、decision-log末尾和学习协议第9节。STATE旧停点与后续恢复记录并存，以本批冻结授权处理，不操作运行循环。learn.json本批external_source/external_binding、工作树、dispatch_base核同；manifest 12291字节/SHA {MSHA}，work_spec 5191字节/SHA b02d5010c51d8175149e1b8985c48e4d39bef58ee15eef2a3d97bc671d94af08。#54三manifest及129产物共132叶全部大小/SHA核同；额外合同/选择合计147个去重文件校验记录见scratch/identity-and-input-check.json。#27/#42文字合同、#28来源/回放边界、#55冻结格式已读，已发布114策略/160rk只用于去重，其SHA与逐ID处理见dedup-audit.json。没有读取旧候选作为新证据。

外部来源external:sts2fun，采集2026-10-21，URL https://sts2.fun/static/sts2_public.db.zst，数据库SHA 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5。许可未找到明确再分发授权，只用署名脱敏派生材料；没有下载、读原库或外部玩家标识。自有只用原506名单中的两个同簇完整投影及8次有界原始决策行seek，逐行off/bytes/SHA与截止见raw-seek-audit.json；0次Parquet查询，未读/同步共享logdb或复制17GB状态流，也没有扩大冻结切点。

## 语义与覆盖

簇号仅定位。原文已核泡泡“已有中毒才给9毒”、触媒“额外触发1次”、蜃景“按全体毒层给挡并消耗”，结合完整时序，将本候选描述为有前置条件的施毒增幅与防护多路径；并不认证簇5单一玩法或#55测试几何可部署。毒雾原牌文本批未核，未从预训练或既有策略补写其机制。触发只沿现有题型/幕与正文条件，无archetype新增。

程序保存10对20条外部轨迹页，模型实际通读且用于结论的固定子集是pair 0/3/5/7/9：5胜5败、10条完整轨迹/448节点，完整节点数组未截断；另外5对只缓存、未作结论证据。自有FZT053H9PSC5四section为147快照/24战/286问题/61计划，ATP5MCMJDMQY为53/7/96/4；模型按完整语义delta视图通读，未逐字读所有off/ts或全原生prompt，原始有界页保留完整记录。winner计划投影语义全null、路线问题理由可读；终局胜利true且GAME_OVER HP0与末战post_hp26并存，不补机制。程序覆盖、实际阅读与未读项分别列coverage.json。

自有两个完整局均A10/no_retry_evidence/版本unknown；无重试证据不证明没有SL。全部原簇5自有142局的原分层保留：A10无重试29/1胜、重试或判死100/0胜，其他进阶逐项见version-ledger.json；不是把142局都当模型通读或本批支持。自有与外部不混分母，runs=[]是外部调度身份，own_support_runs另列两局。

## 逐情境处置

| 情境 | 文字处置 | rk处置 | 本批自有独立证据 | 外部所选赢家/失败终局持牌 |
| --- | --- | --- | --- | --- |
{chr(10).join(rows)}

每项本批为1局1次选择机会，正文含一句方向、具体牌文幅度/或已观测资源变化、样本与适用范围；不是单牌因果效应。原拿牌/不拿牌统计只保留，不提升为新比较。所有实际策略/rk ID及绝对路径见scenario-mapping.json；每个candidates/c5-N.json都含配对条目、原选择完成/后继、当前HP、此前牌组代理、旧条目和formal_publication=pending/consumer_readback=pending。旧策略全部证据和confidence保持，新增明确失败反例的2项unassessed→conflict已写dedup-audit和supervisor-notice，不清除旧conflict。

真实新增仅2，未称新增达到5；5项为同ID补充。为保守满足“少于3条必须报主管”边界，主管原文、真实数量、去重缺口和下一步已落scratch/supervisor-notice.md，待原ops转送，未冒称已送达/主管已读。当前新建非0，不触发连续两批新增0；不猜未冻结的历史计数基线，不自行扩大范围或派下一单元。

## 版本、统计和反向结果

| 外部原版本组 | 簇5上传分母 | 最终胜 | 原观察胜率 |
| --- | --- | --- | --- |
{version_table}

未找到机制跨版本不变对照，因此不自行合池，新情境只用v0.111方向对照；原v0.107等major行含的历史小build合并是冻结数据本身的口径，保留原build分母而不新解释为机制等价。v0.111质心前三ID组合在52对深度配对中赢家31/52、失败18/52，差+25pp，但q=.7922、未过多重检验，两边不足100；仅事后关联，不是拿牌收益。外部合格赢家三ID齐30/77，另47未齐、2重建排除；自有A10无重试组唯一赢家未齐、齐的3局均败。外部所选泡泡持牌反向4/5对5/5、毒性爆发1/5对2/5、蜃景3/5对3/5，全部保留，不因赢家选择压成正向策略。外部上传独立玩家数未知，不累加重叠cell为独立局。源数据、按版本分层、反例及限制在source-ledger/version-ledger/external-combination-contrast中可核。

## 候选检查和消费者缺口

7文字通过当前parseStrategyLibrary，7rk通过validateReflexEntry；7组构造的固定正负DTO与题型筛选通过。没有原题context回放、生产工具读回或自然消费。tsx CLI首次因沙箱IPC EPERM不能启动，改用node --import既有tsx loader成功；一条构造fixture最初误用旧条目的首幕而非该补充实际幕，已改为题前实际幕后全部通过；没有把环境或fixture失败记为生产代码失败。见candidate-format-validation.json与validate-candidates.ts。未改源码，tsc/vitest/cases按任务均null，不开full。

逐项缺口：7策略正式发布/工具读回pending；7rk正式消费者pending；7原题回放pending；整体knowledge/剧本消费者pending；泡泡selection/add事件内读回未支持核证，固定检查只覆盖奖励题DTO；自然查询/实际采用/收益pending；#28开关和两臂保持，科学父开放。已有发布流程由原owner接续，本批不合main/live、不写正式账本/ACK。requested模型/档位不是实测；本批未核原生tier、usage/耗时回执，实际保持unknown，不用启动文字代证明。

唯一最终JSON如下，原字节同时保存result.json；生成后再解析两处并核等同。

'''

destinations = [{'kind': 'knowledge', 'id': 'silent-c5-conditional-poison-defense-playbook', 'path': str(P / 'playbook.md')}]
for m in mapping:
    destinations.append({'kind': 'merged-into' if m['strategy_disposition'] == 'same-id-update' else 'strategy',
                         'id': m['strategy_id'], 'path': m['path']})
    destinations.append({'kind': 'merged-into' if m['rk_disposition'] == 'same-id-update' else 'rk',
                         'id': m['rk_id'], 'path': m['path']})
result = {
    'task': 'strategy-proposal', 'character': 'silent', 'batch': BATCH, 'base': BASE,
    'runs': [], 'own_support_runs': ['FZT053H9PSC5', 'ATP5MCMJDMQY'],
    'code_proposals': [], 'implementation_domains': [], 'proposal_results': [], 'fixes': [],
    'source_commit': None, 'merged': None, 'tests': {'tsc': None, 'vitest': None, 'cases': None},
    'report': str(R / 'report.md'), 'external_source': PLAN, 'input_sha256': MSHA,
    'reason': '冻结身份与132叶SHA通过；簇5交付7对局部候选（2新情境、5同ID更新）及1份全程描述性剧本；新增双方100门比较0。正式发布、消费者读回、原题回放与自然收益均pending，HEAD保持基线。',
    'decision_output_counts': counts,
    'scenario_mapping': str(P / 'scenario-mapping.json'), 'coverage': str(P / 'coverage.json'),
    'source_ledger': str(P / 'source-ledger.json'), 'supervisor_notice': str(P / 'supervisor-notice.md'),
    'formal_publication': 'pending', 'consumer_readback': 'pending',
    'external_results': [{'id': 'external-remaining-build-003-r56-stock', 'state': 'processed',
                          'destinations': destinations,
                          'reason': '已落盘7个真实文字/rk配对情境：2新建、5同ID补充；rk为5新标签、2同ID更新。完整通读10条外部代表448节点及2份自有四section语义投影，8个原始决策行均有界核SHA。全部新比较未达双方100；真实新增少于3的原文、缺口及下一步已写主管通知草稿，未冒送达。完整可执行剧本和正式消费者/回放仍缺证，均保留pending；不扩范围、不改正式库。'}],
}
raw = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
(R / 'result.json').write_text(raw)
(R / 'report.md').write_text(report + '```json\n' + raw + '```\n')
assert json.loads((R / 'report.md').read_text().split('```json\n')[-1].split('```')[0]) == json.loads((R / 'result.json').read_text())
assert (R / 'report.md').read_bytes().split(b'```json\n')[-1].split(b'```')[0] == (R / 'result.json').read_bytes()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == BASE
print(json.dumps({'report': str(R / 'report.md'), 'result': str(R / 'result.json'),
                  'result_sha256': hashlib.sha256(raw.encode()).hexdigest(), 'identical_json': True,
                  'candidate_destinations': len(destinations), 'head_unchanged': True}, ensure_ascii=False, indent=2))
