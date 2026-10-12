import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
items = json.loads((HERE / 'dispatched-proposals.json').read_text())
ledger = json.loads((HERE / 'ledger-snapshot.json').read_text())
base = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
live = subprocess.check_output(['git', '-C', str(ROOT / '.worktrees/live'), 'rev-parse', 'HEAD'], text=True).strip()
details = [
    ('神化升级传播', 'VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1；states275564/275565、275679/275680/275687/275688、275722/275731/275732；decisions269706/269707/269748。',
     '已核7→5能量、突然一拳9伤/1弱→11伤/2弱、勒紧4→6、尖啸6→8，场外deck不变。631帧有抽牌堆聚合文本，4761个聚合条目均无逐卡dynamic_values；缺未知升级/附魔的逐卡转换及抽弃后的完整传播验证。当前源码只有forge手牌升级路径，未找到APOTHEOSIS接线；不能只把known改true当完整实现。',
     'F35/F36/F37/F43打出神化赢，F43仍损57；F45未打而败，敌人、资源和抽序不同，不构成胜负因果对照。',
     '沿原提案冻结F35开发帧、F43同牌序验收帧与F45未知覆盖帧；补已覆盖逐卡转换、未知覆盖标记、后续抽弃状态和场外deck不变验证。未知升级与完整传播未完成时保留缺口；不增加必打神化规则。'),
    ('三骑士血价与随机药水预算', 'VLZ6CCT8AQ0A，F43 T1—T5、F44休息、F45 T1/T4/T5；decisions269748/269754/269770。',
     '模拟成熟度展示已有live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5；缺同总预算、同盘固定随机输入的MC对照、样本收益/候选稳定性曲线，且神化完整传播未覆盖。不能据单次707ms和1/12样本拟合预算、药价或目标规则。',
     'T4攻击候选32伤/31损未实打，少损线实24伤/13损；全败参考并列不证明多8伤优于少18血价。F17/F33首试胜，不支持一律弃用推演。',
     '补同总预算、同进程条件、固定随机输入对照，记录用时、轮数、样本、best可比较性与覆盖缺口；先分离神化漏算，再评价MC分阶段。保留原预算、药价和所有目标选项。'),
    ('神化经验实现链接', 'VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1；同89354805；经验silent-apotheosis-combat-upgrades。',
     '与89354805共享silent-0237/0238的源码缺口；经验文本上线与升级勒紧子项均不等于神化完整传播。缺逐卡未知升级/附魔输入和跨抽弃传播验收，沿原实现链等待，不重复造提案。',
     '牌组持有与本战施放不同；四个赢战和F45死战条件不同，经验支持局数不能当独立受控样本。',
     '复用89354805的固定夹具与后续验证，保留postmortem和experience-update两份来源/经验链接。'),
    ('攻防、持续资源复合核验', 'VLZ6CCT8AQ0A，F43 T1/T3/T4/T5、F44休息、F45 T3/T5；states275679/275680/275752/275754及原资源链。',
     '升级勒紧子项已有live源码5e80e683daa08ae2569733b3b541cb523d7fe861；14账本/15经验的整体请求仍缺神化完整传播与持续输出/资源共同冻结的复合验收。局部源码祖先不能关闭全部请求；原本已上线的机制和版本保持。',
     'F45两雾持有而未建立，覆甲末轮为0；32HP+20挡对减力后59仍差7。单轮减力和开场资源不能预支为后轮存活。',
     '神化沿专属链处理；固定F43三次毒结算与F45逐击减力、敏捷、普通/升级勒紧、覆甲和资源期限逐项核验，不拟合统一路线或休息阈值。'),
    ('Jev、护栏与SL全过程审计', '8JRE1C4H4Z2W，F33首/第三试T2、第二试T5、末试T11，另F17 T6；decisions270216/270282/270264。',
     '原答同fingerprint已核，第三试多损12血只多7当轮伤。缺原答→HP护栏→SL替换→实际前缀→抽弃/重规划的统一候选身份与完整配对记录，不能用候选省血当实际收益；本批固定日志未补齐该链。新增敌HP审计源码3f69541b5d3259dac94d3395bfe3da47936b4de9仅覆盖血量口径，不覆盖整个决策审计。',
     '末试T2防御替换省3血少10伤、延至T11仍败；不支持一律禁止防御替换。原答0/24与替换5/24死亡不能写成相同死亡率；都封顶47损也不等于都24/24死亡。',
     '先以固定帧补统一候选/尝试/观测身份及重规划边界，再分列预测和完整/部分执行。策略阈值需后续独立同角色验证，当前保持护栏和SL规则。'),
    ('当前属性、虚弱与独立成长', 'CA5KE8GFJ9X2，F13 T1/T3/T5；账本silent-0005/0231。',
     '加压力量0→4→8、无弱喷水11→15→19及虚弱后11/14可核；该局计划步法未取得，不能补敏捷收益。缺四条属性/减益/成长路径共同冻结的本角色调用与完整源码对照；未核出需要新增统一攻防权重的证据。',
     '临时虚弱不取消下一次加压，T5两血10挡仍不足14攻击。单条步法或成长源码不能证明整个复合请求。',
     '冻结实际有据的独立路径；出现同局可配对的敏捷、虚弱和成长复合输入再验证整体，避免从计划取得组件补事实。'),
    ('持有与实际启动分账', '5PM6JAQG6FNQ，F39末试T2，另F33已建立能力的胜场。',
     '重新核原帧：F39向无毒目标打冒泡，能量5→4、玩家29HP及敌状态不变。缺同血量、构筑、抽序下不同启动顺序的完整结局与可复现收益函数；不能据未兑现组件拟合构筑/启动权重。',
     'F33已建雾3/触媒1/群蛇4并赢，与F39不同敌人/资源；不能将跨房间比较当受控替换。',
     '后续记录能力建立时点、每轮真实兑现、当前资源和完整结局；有配对证据才评价启动权重，现有选项保留。'),
    ('吸取、负敏捷与毒/SL', '61E2QS63Y9WU，F17 T5吸取、T6双防御、T7首试胜；states273506/273507。',
     '负敏捷−2、两防御各3共6挡及17毒成立；本局60HP首试七轮胜。缺相同起始资源和完整抽序下另一可救活SL线路，不能用首试胜调整SL范围/换线偏好。',
     '本局已经首试胜，其他局不同资源的失败不提供本局必须读档的证据。',
     '保留分项事实；待完整已知抽序和可配对SL线路核实后重验偏好，不改变现有必死判定。'),
    ('胧光怪召唤、成长与退场', '61E2QS63Y9WU，F23 T4/T5；states273594/273595及后续状态。',
     'T4本体线47伤/15损兑现，幻象14→2仍可攻击；另一focus幻象39伤/零损只为未实打候选。缺A10召唤/航行/复活完整组合调用及另一目标序后续实打。3f69541b已有敌HP审计不能证明召唤/复活模拟和目标排序全部完成。',
     '本体输出兑现不等于幻象退场；未打零损候选不等于整场胜线，不强制首杀。',
     '补当前进阶移动表和前后逐实体身份/血量/成长，冻结完整前缀；相同推演值并列，保留全部目标，目标排序收益另需后续对照。'),
    ('熟睡甲虫唤醒、成长与血价', 'DUZUBAJ3A8GP，F30 T1—T6、四次尝试；states275013/275018/275023。',
     '睡3/2/1、T4醒、T5尖啸、T6恢复成长至4力/22攻击可核，四试均败；c7578f37608526591edd86041cee5a28c3894fee已有当前进阶后轮伤害子项。缺同抽同资源的另一完整获胜线及睡眠/眩晕/醒来组合验收，不能以全败样本拟合少挡换伤的血价。',
     '末试T4比首试多扣3敌血却多损2玩家血；当前减力不能关闭后续成长，T6只剩1血16挡仍死。',
     '按当前进阶单独冻结睡眠/实际失血唤醒/眩晕/成长；待完整可配对线路再评价血价和排序。已完成局部恢复不当作整个请求implemented。'),
]
assert len(details) == len(items) == 10
results = []
lines = ['# 本批静默猎手代码提案逐项核验', '',
         '任务：20261008-004303-strategy-proposal；调度batch：20261008-004302-strategy-proposal；来源六局均已由runs.jsonl核实SILENT A10。',
         f'合入main后的base：`{base}`。核验live：`{live}`。merge配置live；本次无新增源码，不执行上线流程。', '',
         '本批十份保存的原提案SHA256全部与专用队列一致；只消费本batch的proposal_ids，无proposal_repair。原提案分别复制为本目录`<id>.original.md`。账本、原经验和历史复盘只核对及补本次链接，不重写复盘。', '',
         '本次原始日志重新抽取3432状态帧、3306决策；六局逐字节SHA256与前次保存证据一致，未发现本批来源新增帧。VLZ抽牌堆聚合信息存在，不能写成“没有牌堆”；缺逐卡动态值/实例和未知升级交互的完整输入。核验脚本及evidence-verification.json保存确定性原帧断言，属于证据校验，不是生产tsc/vitest或源码红绿测试。', '',
         '无新策略权重拟合；六局按run_id计样本，重打不扩独立样本数。F35/F43等帧已用于发现和复核，不冒称盲测。若以后拟合阈值或改变目标/SL规则，须按结束时间另取后续独立静默局验证。未知或未观察进阶保持现状；本次所有角色代码等价。', '']
for (ident, item), (title, evidence, reason, counterexample, validation) in zip(items.items(), details):
    results.append({'id': ident, 'state': 'waiting', 'reason': reason})
    lines += [f'## {ident}：{title}', '',
              f'来源任务：{item["source_task"]}；实现任务：strategy-proposal。领域：{", ".join(item["domains"])}。',
              f'既有学习账本：{", ".join(item["ledger"])}；原经验：{", ".join(item.get("experience", [])) or "原提案未指定"}。',
              f'证据局号/层/回合：{evidence}',
              f'旧规则、完整拟实现行为、原验证和回退：[{ident}.original.md]({ident}.original.md)。', '',
              f'本次处置：waiting。{reason}',
              f'反例/限制：{counterexample}',
              f'下一次预期行为与验证：{validation}',
              '预期影响限于原提案范围，不承诺整场转胜；本次保留现有行为，无生产代码可回退。后续实现需逐项源码提交、固定撤码失败/恢复通过、原沙箱检查和实际live祖先证明，实际改变行为后按原流程加版本并双通知Roy。', '']
(HERE / 'proposal.md').write_text('\n'.join(lines) + '\n')
(HERE / 'proposal_results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
report = {'task': 'strategy-proposal', 'base': base, 'runs': list(json.loads((HERE / 'batch.json').read_text())['batch']['runs']),
          'fixes': [], 'skipped': [{'id': r['id'], 'reason': r['reason']} for r in results],
          'merged': None, 'tests': {'tsc': None, 'vitest': None, 'cases': 0},
          'code_proposals': list(items), 'implementation_domains': [],
          'proposal_results': results, 'report': str(HERE / 'report.md')}
(HERE / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
updates = []
for ident, entry in sorted(ledger.items()):
    linked = [i for i, p in items.items() if ident in p['ledger']]
    row = {'id': ident, 'by': 'learner:strategy-proposal',
           'where': {'proposal': [str(HERE / 'proposal.md'), str(HERE / 'report.md')]},
           'note': '20261008-004303策略核验；关联' + ','.join(linked) + '均waiting。六局原始证据哈希与前次一致；具体缺数据和已有局部live源码证明见proposal.md。无新增源码/上线，不新增support/repeat，不改首证、claim、既有版本或shipped历史。'}
    if entry['status'] != 'shipped':
        row['status'] = 'proposed'
    updates.append(row)
(HERE / 'ledger-update-input.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in updates))
summary = ['# 策略学习回报', '', '本批10个派发提案全部waiting，具体缺数据逐项保留在proposal.md和proposal_results.json；没有新增源码、提交、合入、eval版本或shipped登记。', '',
           f'完整base：`{base}`；调度batch：20261008-004302-strategy-proposal；报告目录任务：20261008-004303-strategy-proposal。',
           '开工工作树干净；git merge --no-edit main成功无冲突；最终HEAD保持base。', '',
           '提案/证据/层/回合/账本：见[proposal.md](proposal.md)的十个专属段。六局raw SHA256逐局与前次一致；3432帧/3306决策重新核验通过；十份原Markdown哈希匹配。原经验只从knowledge/characters/silent读取，未改知识数据或历史复盘。', '',
           '已有局部源码live祖先：升级勒紧5e80e683daa08ae2569733b3b541cb523d7fe861、模拟成熟度45161a51c2c6b7e4a499b13cf749c4108193bbf5、敌HP审计3f69541b5d3259dac94d3395bfe3da47936b4de9、当前进阶后轮伤害c7578f37608526591edd86041cee5a28c3894fee。它们不足以证明本批任一整体提案完成，因此不登记duplicate/implemented。实际祖先检查均exit0，保存在partial-source-proofs.json。', '',
           '撤源码失败/恢复通过：未执行，本批无源码实现。tsc/vitest：未执行，最终JSON为null；cases=0，不冒报测试成功。Python证据断言exit0另列于evidence-verification.log/rc；未调LLM、网络或游戏。无提交，未执行提交前gitleaks；临时资料全在指定scratch。', '',
           '学习账本：仅经根learner/ledger.py追加本次核验/提案链接，by=learner:strategy-proposal；未上线条目保持proposed，既有shipped状态不降级，不重复添加support/repeat。专用提案复用10个既有CLI ID，未重复add；本任务不自行resolve队列，调度器消费proposal_results后保留waiting待新局。', '',
           'merge=live配置已确认，本次无源码变更依无改动流程merged=null；未触碰live、未停对局/运行play/推送。proposal.md与report.md路径交运维，原件、缺数据、失败/初稿均保留。', '',
           '```json', json.dumps(report, ensure_ascii=False, indent=2), '```', '']
(HERE / 'report.md').write_text('\n'.join(summary))
print(json.dumps({'base': base, 'proposals': len(results), 'waiting': len(results), 'ledger_updates': len(updates), 'report': str(HERE / 'report.md')}, ensure_ascii=False))
