import json
from pathlib import Path

OUT = Path(__file__).parent
batch = json.loads((OUT / 'batch.json').read_text())
items = json.loads((OUT / 'dispatched-proposals.json').read_text())
proof = json.loads((OUT / 'final-live-ancestry.json').read_text())
when = (OUT / 'record-time.txt').read_text().strip()
phase_commit = '6f2b90a311644960fcfd1e2b7a4ce96fb41d65b4'
reference_commit = '45161a51c2c6b7e4a499b13cf749c4108193bbf5'

reasons = {
    'silent-proposal-4cc200cc9747f4a8': ('duplicate',
        '阶段事实已由既有源码6f2b90a3实现；本轮末核该40位源码提交为实际live祖先。F48首Boss已败、本幕未结束、F49当前敌人与过期raw boss id已分列；没有新增源码或再次上线。', phase_commit),
    'silent-proposal-89354805ee4d7e77': ('waiting',
        'VLZ F35/F43的手牌升级与同牌序51伤/13损证据成立；重新对照原日志的729个状态帧均无战内piles。缺可冻结的各堆卡实例/升级状态、完整确定抽牌输入及未知升级/附魔差值，无法验证整项同方案和后续抽牌传播。保留神化未建模，不因未施放而增加必打规则。', None),
    'silent-proposal-f2bfceddb1898dca': ('waiting',
        '成熟度展示子项已有实际live祖先45161a51；改变MC先行/最低非药预算、药价或目标偏好仍缺同总预算同盘随机样本的受控比较、神化覆盖修复后的结果和另一focus完整实打，不能从707ms单题或未实打高伤线拟合参数。', None),
    'silent-proposal-283a164780d11e69': ('waiting',
        '与89354805ee4d7e77属于同一神化缺口的经验链接；同样缺战内牌堆/确定抽牌复合输入和未知升级差值。两份提案不是两份源码实现，经验已发布也不能代替实际live源码。', None),
    'silent-proposal-ebbfe3b97548756d': ('waiting',
        '复合提案覆盖14账本/15经验；当前升级勒紧子项已有实现，但神化传播仍未实现，且缺逐击属性、持续毒、成长与资源共同冻结的完整调用输入/源码对照。路线、休息、focus无同盘完整反事实，已有单个机制不能证明整个提案完成。', None),
    'silent-proposal-7ef28c3cb0160972': ('duplicate',
        '8局14次饮用核得HP增0、能量+1、手牌+2；已有CURE_ALL模型9f0babde及覆盖/MC样本用时/并列展示45161a51均为实际live祖先，固定模型调用一致。满手、时机和预算变更缺对照，保留原行为，按原提案允许的一致模型处置为重复实现。', reference_commit),
    'silent-proposal-e5b87be50f28f311': ('waiting',
        '8JRE同指纹首/三试T2实打多12血换7伤已记录；原日志缺Jev原答→HP护栏→SL替换→实际派发及重规划的统一候选标识和完整原始调用输入。不能由理由文本补造机器阶段链；也缺另一完整胜线，不改既有探索/护栏选择。', None),
    'silent-proposal-49632bc4878fb597': ('waiting',
        'CA5 F13 T5支持弱没有取消独立成长；本轮核32个相关原帧。缺力量、敏捷、弱与独立成长四路径同时冻结的实际调用输入/源码对照，未取得的步法不能当敏捷样本；不凭子项提交证明复合经验全部实现。', None),
    'silent-proposal-66532328a585941f': ('waiting',
        '5PM F39 T2向无毒失落打冒泡零效果的原帧已核；缺同起始HP/构筑/抽序下不同启动顺序的整场胜负对照及可复现收益函数，不能以持有组件或另一个F33胜局拟合启动阈值。', None),
    'silent-proposal-43a76a31ba7bdcfa': ('waiting',
        '61E F17 T5/T6吸取、负敏捷和毒的原帧已核；缺同起始HP/构筑/完整已知抽序下可救活的另一完整SL线路。本局首试胜不能支持调整SL范围、阈值或换线偏好。', None),
}
locations = {
    'silent-proposal-4cc200cc9747f4a8': 'JMH5C51RLN4E A10 F48 T13胜后奖励/地图→F49 T1；9TG1RP5LFAAK A10 F48 T16胜后奖励/地图→F49 T1。',
    'silent-proposal-89354805ee4d7e77': 'VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1。',
    'silent-proposal-f2bfceddb1898dca': 'VLZ6CCT8AQ0A A10 F43 T1—T5、F44休息、F45 T1/T4/T5。',
    'silent-proposal-283a164780d11e69': 'VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1。',
    'silent-proposal-ebbfe3b97548756d': 'VLZ6CCT8AQ0A A10 F43 T1/T3/T4/T5、F44休息、F45 T3/T5及全局资源链。',
    'silent-proposal-7ef28c3cb0160972': 'T082DRCUHRRD A0 F6 T1及F33 T1；10GPK5XGHCK3 A3 F3 T2；VN7RQJMJEFMX A6 F37 T1；VLV17NUSFS61 A7 F39 T1；UMVLWER4CD98 A10 F48 T2（含SL同局重复）；P5HT1272P5SB A10 F8 T1；YLYLZWHA0GKU A10 F39 T1；VLZ6CCT8AQ0A A10 F45 T1。逐次14条见cure-history-verified.json。',
    'silent-proposal-e5b87be50f28f311': '8JRE1C4H4Z2W A10 F33首/三试T2、第二试T5、末试T11，以及F17 T6。',
    'silent-proposal-49632bc4878fb597': 'CA5KE8GFJ9X2 A10 F13 T1—T5，关键T5。',
    'silent-proposal-66532328a585941f': '5PM6JAQG6FNQ A10 F39末次T2；F33建立组件后胜利作为不同局面的限制。',
    'silent-proposal-43a76a31ba7bdcfa': '61E2QS63Y9WU A10 F17 T5吸取、T6负敏捷/毒；首试获胜不是SL对照。',
}

results = []
for ident in batch['proposal_ids']:
    state, reason, commit = reasons[ident]
    row = {'id': ident, 'state': state, 'reason': reason}
    if commit:
        assert proof['commits'][commit]['live_ancestor']
        row['commit'] = commit
    results.append(row)
assert len(results) == len(batch['proposal_ids']) == 10

proposal = [
    '# 静默猎手策略提案逐项核证与处置', '',
    f'记录时间：{when}（先执行date）。角色silent；授权Roy-2026-10-07-learning。来源任务依各原提案，当前实现任务strategy-proposal。', '',
    f'实际调度batch为{batch["batch_id"]}；任务指定scratch尾号221304，按指定路径保存。无proposal_repair。本轮只消费该batch的10个id，原文逐项读完并核对SHA256全部一致。', '',
    '10个指定来源局和4个派发提案额外来源局全部经runs.jsonl核为SILENT；额外局仅用于派发id自身的证据。未使用其他角色知识，未新增机制常数或权重。', '',
    '本轮没有新增源码。阶段事实与痊愈药水在末核时已有实际live祖先，列duplicate；其余8项列waiting，保留原行为和所有旧提案。没有将已发布经验、未合入源码或局部子机制算作整项实现。', '',
    '拟合与切分：本批只核已保存的发现/回归样本，不拟合药价、输出/保血权重、SL阈值或启动顺序。SL重试按run分组，不扩大独立局数；本次核证不是盲测，后续独立同角色完局才可作时间后移验证。', '',
    '共用事实限制：仅核本角色实际状态与动作；怪物HP/伤害保持当前进阶数据库原逻辑与首样本口径，房间代价5样本门槛未改。选择、预算和参考排名不变。', '',
]
for row in results:
    ident = row['id']; item = items[ident]
    proposal += [f'## {ident}', '',
        f'来源任务：{item["source_task"]}；实现任务：strategy-proposal；原请求领域：{", ".join(item["domains"])}。', '',
        f'账本：{", ".join(item["ledger"])}。原经验：{", ".join(item.get("experience", [])) or "原提案未指定经验id"}。', '',
        f'证据局号/层/回合：{locations[ident]}', '',
        f'完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案]({ident}.original.md)。本轮仅追加处置，不重写历史复盘。', '',
        f'本轮处置：{row["state"]}。{row["reason"]}', '',
    ]
    if row.get('commit'):
        proposal += [f'实际live祖先源码commit：`{row["commit"]}`。', '']
    proposal += ['预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。', '',
        '回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。', '']
(OUT / 'proposal.md').write_text('\n'.join(proposal))

report = {
    'task': 'strategy-proposal', 'base': proof['base'], 'runs': batch['runs'],
    'fixes': [], 'skipped': [x['id'] for x in results if x['state'] == 'waiting'],
    'merged': None, 'tests': {'tsc': None, 'vitest': 0, 'cases': 25},
    'code_proposals': batch['proposal_ids'], 'implementation_domains': [],
    'proposal_results': results, 'report': str(OUT / 'report.md'),
}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(OUT / 'proposal-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')

text = [
    '# 静默猎手策略学习回报', '',
    f'记录时间：{when}（先date）。结果：10项全部处理，2项duplicate、8项waiting；新增源码0，fixes=[]，本轮merged=null。', '',
    f'开工工作树干净，原HEAD为5e80e683daa08ae2569733b3b541cb523d7fe861；git merge --no-edit main无冲突。合后完整base/最终HEAD：`{proof["base"]}`。报告产物均在指定scratch，git status保持干净。', '',
    f'本轮末核实际live：`{proof["live"]}`。阶段源码`{phase_commit}`及药水/覆盖源码`{reference_commit}`、`9f0babde8915d770a4313ebcaeb22259cb024d38`均为真实祖先，详见final-live-ancestry.json。已有阶段源码来源203653策略任务，本轮没有新增实现或合入。', '',
    '上线时间线与边界：初核阶段源码尚非live祖先，合入预演发现21处版本/记录冲突，保存live-preflight.json/txt，未执行实际merge或改live。随后运维并行合入既有阶段源码，末核祖先证明成立，才将该id处置为duplicate；本轮没有发起合入、增加eval版本或双通知规则变更。当前live祖先证明不等于声称运维合后完整检查已完成。', '',
    '旧22:02决策日志把阶段源码写成41位（末尾多7）；实际git rev-parse所得40位为上文commit。本轮按实际源码核证，旧历史不改。首次批号读取按scratch尾号221304未找到，实际派发batch为221303，batch.json保存准确id。', '',
    '原始证据核验：6个F48奖励/地图→F49帧按字节offset重读原states.jsonl并比对；VLZ729个保存状态帧逐个按原offset比对，全部一致且无piles，神化耗2能、手牌已观察升级、永久deck未变。8局14次CURE_ALL从保存的本角色状态/决策切片重核，均HP增0、能+1、手牌+2；支持按8局计，不将SL扩大为独立局。另核CA5 32、61E 6、5PM 11、8JRE 54个相关原帧，见waiting-evidence-verification.json。', '',
    '验证：已有固定夹具silent-boss-phase.test.ts与silent-simulation-reference.test.ts合计2文件25例，vitest退出0，无LLM/网络调用。CURE_ALL模型另以固定调用核3项断言，node --import tsx退出0。初次tsx CLI因沙箱listen(Unix pipe) EPERM退出1，日志保留；改用无CLI IPC的Node import后通过，未改生产代码或测试入口。', '',
    '撤源码失败/恢复通过：本轮无新增源码，故不适用，未冒报红绿验证。完整tsc与tools/test-sandbox.sh：本轮无源码提交，未运行，tsc=null；25例是已有固定回归，不称完整套件通过。旧阶段源码的既有红绿/沙箱历史留在原报告，不算本轮测试。', '',
    '初稿与失败：只读ledger.fold初稿错误、首次批号查找、旧41位commit核对、等待证据文件名假设错误、tsx IPC失败均保留或写明；更正后核验通过。未改logs、原复盘、原提案、知识、账本状态、运维prompt或其他角色行为。无新增依赖、play、推送、联网或进程停止。', '',
    '记录与登记：10项原提案已由专用CLI登记，原id/来源任务/证据/账本/Markdown指纹全部保留；本轮未提出新规则、未追加重复提案或账本状态，不标shipped。消费结果由完成事件沿已有队列处理。implementation_domains=[]表示本轮没有实际实现领域，不表示原请求没有领域。', '',
    f'交运维路径：`{OUT / "proposal.md"}`；完整结果：`{OUT / "report.json"}`。', '',
]
for row in results:
    text += [f'## {row["id"]}：{row["state"]}', '',
        f'账本：{", ".join(items[row["id"]]["ledger"])}。证据：{locations[row["id"]]}', '', row['reason'], '']
    if row.get('commit'):
        text += [f'实际live祖先源码：`{row["commit"]}`。', '']
text += ['## 最终JSON', '', '```json', json.dumps(report, ensure_ascii=False, indent=2), '```', '']
(OUT / 'report.md').write_text('\n'.join(text))
print(json.dumps({'base': report['base'], 'duplicate': 2, 'waiting': 8, 'report': report['report']}, ensure_ascii=False))
