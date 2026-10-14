import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
WORKTREE = OUT.parents[2]
DISPATCH = json.loads((OUT / 'dispatch.json').read_text())
PROPOSALS = json.loads((OUT / 'claimed-proposals.json').read_text())
LIVE = json.loads((OUT / 'live-source-verification.json').read_text())
TIME = subprocess.run(['date', '-Is'], capture_output=True, text=True, check=True).stdout.strip()
BASE = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=WORKTREE, capture_output=True, text=True, check=True).stdout.strip()
assert BASE == LIVE['base']

reviews = [
    ('08eaa60bcc449852', '赢战耗药与下一战结转',
     'KEN58SH9SLZ6 A10 F3 T2/F4 T1/F5 T2/F11 T1、T2/F15 T1共7次饮用；六赢战净损0/3/0/37/6/0合46。F12回复26→53、上限76→81；F16回复46→75、上限81→86。',
     '七次饮用及两次真实回复已按原帧核验；缺同资源、同牌序的未饮用或留药到boss完整对照，无法校准持药价格或固定留药阈值。',
     '保留当前用药价值；验证7次动作及回复分账。后续需以较早独立局拟合、较晚新局验证完整资源链，SL按同局归组。'),
    ('92920295a648b540', 'SL首胜与连续通关',
     'TXZ6RVMQA09D A10 F48第二/三试T6均48血、敌460血；完整当轮损3/0、敌净扣36/27。第三试T10首boss赢后4血，F49从4血到0血，未到可操作帧。',
     'TX三试已核；T6少损3也少扣9，后续生成/抽序改变，首胜4血后开场死亡。缺保持后轮条件的连续通关替线，不能据此改SL资格或终局权重。',
     '现有连战与候选比较继续使用；校验首战、后战、SL恢复分别结算。需要同抽序完整后继及时间留出胜负对照。'),
    ('a327449c331efbc1', '沙虫双截止与SL血价',
     'WQZVENQ7DTRP A10 F33第二/三试T9同指纹，26血、敌184血；原线13损/24净扣，替线22损/39净扣。第二/六试T7同扣24，损0/4，结束前沙坑4/5、次轮3/4。',
     'WQ同盘T9多15输出付9血，T7付4血延长沙坑一轮；六试均未通关。缺两条截止边界的完整受控后继和独立胜局，无法拟固定血伤交换阈值或探索筛选。',
     '保留当前探索与严格必死判断；现有比较已列血价、毒与沙坑预测。下一证据需同时保留攻击截止/沙坑截止和完整续轮。'),
    ('a099e89437e942bb', '狡诈容量、出刀穿插与保留',
     '本提案9局42饮逐次回原日志：37次添3、2次添2、3次添0；新增均小刀升级/基础伤6，饮用当步HP与能量不变、药槽消耗。WQZVENQ7DTRP F33第五/六试T11连续饮用2/0/0与3/2/0。',
     '狡诈3/2/0生成、每步手位和饮用/出刀穿插模拟已有live祖先6403fdcdadc803a092beb5165a068e22bf51c412；原要求还缺完整穿插派发、跨轮计划妥当保留和SL恢复的消费者证据，不能将整个宽项登记duplicate。',
     '生成公式保持；固定已有夹具核容量/力量/虚弱，完整消费者验收须经过饮用→新手牌重读→出刀→再饮及存档恢复，收益仍待整战证据。'),
    ('47910f82a1fdd98f', '开场血价、连战与SL资源',
     'TXZ6RVMQA09D A10 F43/45/46/48从70/52/62/60到首个可操作66/48/58/56；F49从4到0、无可操作帧。WQ F33 T9血价差9及T7沙坑差1分别保留。',
     '无血瓶开场4血和连战接续已有live祖先e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a；宽要求缺SL血价、留药、路线预算的受控后继，以及小血瓶/回血/复活未知组合顺序。',
     '现有已观察分支保持；未来固定组合分别核开场资源与SL恢复，不从4血死亡外推未知组合、路线权重或放宽SL。'),
    ('f1374df72d8e6a25', '退出价值与持续/临时药价',
     'Q6M2Y34MWKRE A10 F2实际56→44，敏捷T3才喝；F7休36→57，F8赢后2，F9 T2死亡。1913SE84AXQF A10 F24锻造40→40、F28休40→61、F29赢61→46、F31入口46。',
     'Q6早喝敏捷双防御为未完整执行候选；实线F8退出2血，1913路线将预计回血改锻造，条件不同。缺隔离机制误差、同预算完整后继及未用/早用/留药的受控对照。',
     '保留药价和终局阈值；评估必须分清候选预测/实际退出/后继入口及持续/临时效应，不能将未来营火记为已回血。'),
    ('38a49e6c97f31eea', '紧勒与多机制分源',
     'Q6M2Y34MWKRE A10 F8 T4紧勒103→95，突然一拳95→85，生存者弃牌完成85→83，再结3毒到80；1913SE84AXQF A10 F31 T4中段重接25、旧毒/力量不沿用，20血承受攻击后死亡。',
     '普通无挡紧勒已有live祖先5c7105ff0294466da8319f2934beda05c6040794；再生/临时敏捷有既有模型。原多机制要求仍缺再生、荆棘、增益、重接等联合消费者重放及隔离机制误差后的整战验证。',
     '已证普通紧勒保持；当前只核原始Q6逐牌链及1913兑现时点。新组合/升级/重放按其自身已证范围，不借本批普通样本外推。'),
    ('ef0e38a5dbd3bc07', '精英胜后连续血价和实际回复',
     '1913SE84AXQF A10 F24锻造不回血，F28实际回21，F29赢战又损15，F31入口46；Q6M2Y34MWKRE A10 F7回21，F8精英胜损55至2，F9走廊死。',
     '实际休息/锻造/胜战损血链已核，但缺另选营火、前序事件血价、早用药或改路线的完整受控结果；两败不能拟路线血价、未来营火保障或能力终局权重。',
     '沿实际动作传递HP和药栏，保持现值。后续需独立局、同路线条件的完整节点序列和预算校准，未到营火及未兑现能力保留未知。'),
    ('7f820c02d39bfaea', '死亡饱和的SL即时代价',
     'NHA2KW0RB7VP A10 F33第一/第五/第六试T1同30血、两敌合408；原线1损/敌净扣8，替线与重放7损/敌净扣24，次轮两侧都活，六试全败。净扣含抱抱先生次轮自动伤，不能全算牌伤。',
     'NHA替线多16净扣付6血、两敌均活、六试全败；现有live候选/资源比较已记录预测差额。缺独立成对后继胜负与同预算饱和排序校准，不能把局部差额当探索收益。',
     '保留生产探索门槛；分列即时损血、敌本体/毒、实际击杀和续轮，把第五与第六试重放视为同局数值复现。'),
    ('04b6b430759815ed', '油灯首次消费与动态子公式',
     'K3676LU8B0UH A1 F30 T2/F38 T1带毒刺击4→8；SADL3CGYTGSR A7 F45 T1毒药5→10；NHA2KW0RB7VP A10多个首毒和六次蟹首萎靡，共三局17直接窗口。NHA持有油灯501帧字段恒同、stack=null。',
     '三局17窗口支持已观察首次放大；油灯字段不表示是否已消费，缺跨动作/新战/SL追踪及未见负面组合的消费者验证。精确切击5/6手和蟹朝向分别已有live祖先8b9bacbebb20eaaa1133a9945da6c7abfcda745d、ec29ea34b919344b707e57ba472ea210f9c39d62，不代表油灯及能力兑现整项完成。',
     '保留未证分支，不将每次施毒翻倍。后续需明确首次消费身份、目标制品、X值/升级、重放和SL恢复的完整固定输入；其他组合仍未知。'),
]
assert {'silent-proposal-' + r[0] for r in reviews} == set(DISPATCH['proposal_ids'])
results = [{'id': 'silent-proposal-' + r[0], 'state': 'waiting', 'reason': r[3]} for r in reviews]
REPORT = {'task': 'strategy-proposal', 'character': 'silent', 'batch': '20261014-080351-strategy-proposal',
          'base': BASE, 'runs': DISPATCH['runs'], 'fixes': [], 'skipped': DISPATCH['proposal_ids'],
          'merged': None, 'tests': {'tsc': None, 'vitest': None, 'cases': None},
          'code_proposals': DISPATCH['proposal_ids'], 'implementation_domains': [],
          'proposal_results': results, 'report': str(OUT / 'report.md')}
(OUT / 'proposal-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
(OUT / 'report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2) + '\n')

lines = ['# 本批十项提案逐项复核', '', f'核验时间：{TIME}。', '',
         '角色：静默猎手。来源任务和原Markdown保持，独立实现任务为strategy-proposal/20261014-080351-strategy-proposal。仅处理dispatch.json的10个原ID；未新增提案ID或领取其他队列。', '',
         f'普通队列身份核对通过；research_request/implementation_request均缺省。起始HEAD为f4a6d1a347effe33b353d12ad3938ee67b3f2d5b，按任务合main后base为{BASE}。无专题身份，不套用纯研究。', '',
         '方法：先核runs.jsonl角色，再按冻结历史offset读取原states/decisions并逐SHA读回。六关键局3346状态/3189决策；9局42饮、三局17油灯窗口独立回原日志。SL尝试归同一个run，不把局部同盘样本当独立胜率样本。既有学习账本/经验只作追溯，当前JSON的新增历史未重新核验或借用为新规则。', '',
         '本批没有足够新增证据支持策略参数修改。所有处置waiting。已实现源码子项可核，但原整项缺口保持。假设、支持和反例如下；未执行候选、未到节点及未控制后继均记未知。', '']
for suffix, title, evidence, reason, expected in reviews:
    ident = 'silent-proposal-' + suffix
    original = PROPOSALS[ident]
    lines += [f'## {ident}：{title}', '',
              '既有账本：' + '、'.join(original['ledger']) + '。', '',
              '原Markdown：' + original['proposal'] + '；SHA256=' + original['proposal_sha256'] + '，原字节副本为' + ident + '.original.md。', '',
              '证据、支持与反例：' + evidence, '',
              '本批结论/未知：' + reason, '',
              '旧规则保留；预期行为及验证：' + expected, '',
              '拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。', '',
              '处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。', '']
lines += ['## 实际live祖先的既有源码子项', '', f'只读核验live快照：{LIVE["live_head"]}。', '',
          '|子项|实际祖先源码commit|', '|---|---|']
for source in LIVE['sources']:
    lines.append('|' + source['scope'] + '|' + source['commit'] + '|')
lines += ['', '完整文件blob/祖先判断见live-source-verification.json；base与该live快照的这些源差异仅Roy/Dai注释文字，见base-live-source-diff.patch。这七个子项没有被冒报为本批实现或整个宽项duplicate。', '',
          '## 验证与交付', '',
          '原日志唯一3394状态行、3189决策行、29条SL行SHA读回通过；另17油灯直接窗口回原帧通过。九个当轮成对观测、KEN六赢战合46净损、7饮和2实际回复、Q6/1913资源链断言通过。以上为证据材料核验，未运行或声称源码tsc/vitest通过。', '',
          '分析初稿访问无chosen的诊断决策行出现KeyError；原analysis-first-failure.stderr保留。恢复为跳过无动作诊断行后原同一帧与相同断言通过。初稿将沙坑从玩家powers读取，实际在敌方powers；最终记录明确结束前4/5与次轮3/4，不将缺字段当不存在。原帧和旧日志未改。', '',
          '源码撤掉失败/恢复通过：本批未改源码，不适用。tsc=null，vitest=null，cases=null。无需live合入、版本或shipped登记；未推送、未运行play。31个原账本只经根目录ledger.py追加本批提案/报告追溯，不改旧claim/status/version/evidence。无新学习条目或代码提案ID。', '',
          '材料：dispatch.json、claimed-proposals.json、all-authorized-runs.json、source-references.json、raw-readback-verification.json、paired-turn-observations.json、resource-chains.json、ken-drinks.json、cunning-observations.json、lamp-window-verification.json、lamp-field-observation.json、live-source-verification.json、proposal-results.json及report.json。', '',
          '根要求、原经验入库和消费者收益仍沿各自既有任务验收；本批处置不会关闭它们。', '']
(OUT / 'proposal.md').write_text('\n'.join(lines))

report = [f'# 静默策略批次回报：20261014-080351-strategy-proposal', '', f'时间：{TIME}。', '',
          '本批10个派发ID全部waiting；无新源码、提交、合入或版本。已核实的既有子项分别列真实live祖先，完整要求仍待相应证据。', '',
          f'base：`{BASE}`。', '',
          f'提案和逐项证据/层/回合/账本：[proposal.md]({OUT / "proposal.md"})。', '',
          '本角色六关键局3346状态、3189决策；九局42狡诈饮用和三局17油灯窗口均按原日志核验。6局为KEN/TXZ/WQZ及原派发提案自身的1913/Q6/NHA；额外历史仅使用这些提案明确指定的silent局号，未扩展选题。十个派发锚点不冒称全历史覆盖。', '',
          '|原提案ID|处置及具体缺口|', '|---|---|']
report += ['|' + r['id'] + '|waiting：' + r['reason'] + '|' for r in results]
report += ['', '未进行新源码撤除/恢复测试，tsc/vitest/cases均null。材料分析初稿KeyError与纠正日志保留，最终材料核验通过；材料核验不替代代码测试或整战收益验证。', '',
           f'实际live只读快照`{LIVE["live_head"]}`，7个已发布源码子项的40位祖先见live-source-verification.json。未将旧实现登记成本批fix或宽项duplicate。', '',
           '31个关联原账本使用ledger.py追加追溯链接；原claim/status/version/evidence保持。无新提案登记或shipped操作。根要求和消费者读回/收益验收保持待办。', '',
           '完整JSON见report.json。扫描、账本CLI结果与最终干净状态见completion-validation.json。', '']
(OUT / 'report.md').write_text('\n'.join(report))

ledger_ids = sorted({i for p in PROPOSALS.values() for i in p['ledger']})
updates = []
for ident in ledger_ids:
    related = [r for r in results if ident in PROPOSALS[r['id']]['ledger']]
    updates.append({'id': ident, 'by': 'learner:strategy-proposal',
                    'where': {'proposal': [str(OUT / 'proposal.md'), str(OUT / 'report.md')]},
                    'note': '20261014-080351-strategy-proposal按已派发原ID复核：' +
                            '；'.join(r['id'] + '=waiting（' + r['reason'] + '）' for r in related) +
                            '。无源码/合入/版本，旧状态及首证保持；固定帧支持、反例与缺口见本批报告。'})
(OUT / 'ledger-updates.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in updates))
print(json.dumps({'base': BASE, 'proposal_results': len(results), 'ledger_updates': len(updates),
                  'report': str(OUT / 'report.md')}, ensure_ascii=False))
