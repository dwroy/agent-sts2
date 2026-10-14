import json
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
BASE = 'f99d9d0ea2cff14c827c3ac7f689d8048675d8e1'
dispatch = json.loads((OUT / 'dispatch.json').read_text())
assigned = json.loads((OUT / 'assigned-proposals.json').read_text())
ledger = json.loads((OUT / 'ledger-before.json').read_text())
consumer = json.loads((OUT / 'consumer-summary.json').read_text())
time = (OUT / 'report-time.txt').read_text().strip()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == BASE

reviews = [
    ('神化升级传播与实际施放身份',
     'VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1',
     's275564→275565能量7→5，普通手牌升级；d269706/s275679→275680施放后，T2 s275687显示后续抽牌升级。四次派发在F35/36/37/43，F45未派发神化且s275731→275732被弃。当前参考消费者在施放前后均actual_cast_this_fight=null，不能把手牌消失当持久施放证明。',
     'F43实际仍损57；F45没有施放，与前场敌人、资源不同，不能以胜败定必打优先级。',
     '缺实际施放跨抽牌、选择、药水、SL、换战及会话接续的持续身份；扑击减费、反射弃牌触发、猎杀者延迟抽牌与升级传播联动尚未由本批冻结生产调用验证。',
     '保持已有已观察升级表及未知边界；后续用原帧验证持续施放身份和附加机制联动，不增加神化固定分或必打规则。'),
    ('三骑士药水与推演预算',
     'VLZ6CCT8AQ0A，F43/F44资源接续；F45 T1/T4/T5',
     'd269748记录随机药水1/12样本与退化推演，d269754换成12样本也只是另一问；d269770低损候选13损/24伤，对未选攻击候选31损/32伤。d269779/s275754为32血20挡、四段攻击14+11+34=59，下一帧死亡；三敌仍存活，毒结算前连枷24，结算后21。',
     'F17/F33首试胜与F45退化题不同；没有同一总预算下的配对实验，707毫秒不能确定新预算或留药价。',
     '缺同起点、同模型覆盖、同总预算、同固定随机池的分阶段MC配对及候选稳定性曲线；缺神化等覆盖补齐后的同题对照。',
     '保留现有MC预算、药水持有价、护栏和目标规则；先冻结随机池、生产调用输入、覆盖与逐阶段样本，再比较收益随预算变化。'),
    ('神化经验来源链',
     'VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1',
     '与第一项共享同一实盘升级证据，独立关联silent-apotheosis-combat-upgrades经验来源。已核原Markdown SHA，完整提案范围仍超出升级表与候选事实子项。',
     '同一个机制的两条来源链不是两个独立样本；不能仅以语义重复登记duplicate。',
     '独立经验链仍缺实际施放持续身份、SL/换战/接续消费者，以及减费、弃牌触发、延迟抽牌与升级传播的配对验收。',
     '沿原两个id保留来源链，待共同完整实现通过后再引用同一个实际live源码提交去重。'),
    ('十五条机制及持续资源分账',
     'VLZ6CCT8AQ0A，F43 T1—5、F45 T1/T3/T5；F44回血节点',
     '本批核对升级后手牌、触媒层数及四段减力。F45末轮实际为32血20挡对59攻击，连枷毒2在普通触媒1下结2+1，三敌均未退场；不能把当轮减力当永久成长抑制。所需十五条经验与全部原账本已核。',
     '持有两张毒雾不代表本战已建立；休息及前场胜利也不提供另一构筑、路线或留药的受控收益。各子机制不能共用综合支持局数。',
     '缺十五条机制逐路完整冻结生产输入、升级联动、状态期限和资源/路线消费者验收；既有子公式、文本及经验版本不足以关闭整组。',
     '保留现场属性与已有机制；按逐条机制/进阶/源数分开固定校准，任何权重和资源策略变更需另有同盘证据。'),
    ('SL、HP护栏与实际执行审计',
     '8JRE1C4H4Z2W，F33首/第三试T2、第二试T5、末试T11；F17 T6',
     'd270216/d270282起点fingerprint相同，后者SL候选原0/24死亡、替换5/24，不是并列死率。d270219/s276211→276212实际47→44，d270285/s276277→276278实际47→32；替换多12血价、多7本轮扣伤。末s276433→276434为5血22挡对37攻，实际损5截断，完整算术未挡15；毒后敌130存活。',
     '两试均未得完整胜利后继；末试防御延长存活仍败，反对一律撤护栏或一律保血。旧日志无结构化hp_guard不等于没有发生文本护栏。',
     '候选、单步派发、观测区间及整轮端点已有子审计；缺抽牌/选择/药水/SL后整条候选持续归属、未执行原线及独立完整后继。',
     '保留原护栏、SL探索、血价和终局规则；逐阶段与实际派发分列，完整候选收益保持未知，不把净HP归因到候选。'),
    ('力量、敏捷、虚弱与成长分源',
     'CA5KE8GFJ9X2，F13 T1—5',
     'd267376/s273257力量4且弱后喷水11；d267385/s273268力量8、弱后14。T5玩家2血10挡，下一帧死亡；末荆棘后蚌16存活。原帧支持虚弱降低当前攻击而没有关闭下一次加压。',
     '本局没有取得或建立计划中的步法，不能由此补正敏捷路径。旧属性公式准确也不能证明四条复合路径全部验收。',
     '缺本角色同一冻结生产调用下力量、正负敏捷、逐击虚弱和独立成长四路复合校准；本局没有正敏捷实证。',
     '保留当前公式，不增加统一保血/输出权重；分别用角色证据冻结四路，再验联合状态。'),
    ('构筑持有、启动与实际建立',
     '5PM6JAQG6FNQ，F39第二试T2；对照范围F33已建立能力',
     'd268455/s274379→274380向无毒THE_LOST派发BUBBLE_BUBBLE：能量5→4，HP29不变，敌无毒且本体35不变；原毒雾未建立条件得到核实。',
     'F33已建立能力并胜，但敌人和资源不同；不提供同起点提前施毒、另一启动序或选牌的因果收益。',
     '缺同HP、牌组、药水和完整抽序下另一启动/构筑顺序的整场对照及可复现收益函数，不能拟合启动或构筑阈值。',
     '持有/计划/本战已建立继续分账；保留选项与现有构筑行为，后续比较完整启动线，不规定必先启毒。'),
    ('族母吸取、负敏捷、毒与SL',
     '61E2QS63Y9WU，F17 T5/T6',
     'd267611/s273503玩家力量2；下一轮敏捷−2、力量0且敌力量2。T6 d267615/s273507两防御各3，尖啸后敌暂时−4力、攻击17；毒17在普通触媒1下继续17+16。当前状态与临时减力必须分源。',
     'F17首试七轮获胜不证明另一局同抽重打能获胜；没有另一个同资源完整SL后继。',
     '缺A10吸取/负敏捷/毒与历史移动模型的完整冻结生产验收，以及同资源、同完整抽序的另一完整SL线路。',
     '保留SL范围与阈值，分别校准吸取、临时减力恢复、毒结算，整战换线价值保持未知。'),
    ('墨影召唤与各实体成长',
     '61E2QS63Y9WU，F23 T4/T5',
     'd267698/s273595幻象2血、力量3、弱后15攻击，本体51血/力量3；T4玩家25→10。T5 d267702/s273599幻象0、本体21，两者力量6，符合本体线没有提前移除幻象攻击的观察。',
     '原另一focus39伤零损候选未执行；单轮候选不能证明完整战斗目标顺序。enemy_id是类型，重复类型不能充当实例身份。',
     '缺A10召唤、航行及复生联动的完整冻结生产调用与另一focus完整后继，召唤子项不能登记整个提案duplicate。',
     '保留全部focus选项与并列，不强制首杀；分别冻结召唤、实体成长、移除与完整目标后继。'),
    ('熟睡甲虫醒来、眩晕与成长',
     'DUZUBAJ3A8GP，F30四试T4—6',
     '四试T4均醒来18攻；T5尖啸后甲虫−4力/14攻（第二试−10力/8攻，不能混合），末试T6 d269077/s275022甲虫力量4、22攻击、43血，玩家1血后死亡。T4末试敌79与首试82，玩家净损4与2。',
     '末试T4多扣3敌血、多损2玩家血，四试均败且同局相关，不能拟合固定杀序或输出血价。',
     '缺当前A10睡眠、伤害唤醒、眩晕和成长完整冻结消费者验收，以及同抽换序的完整后继。',
     '按当前进阶与状态期限分别验证；保留杀序、血价及终局规则，不预估未观察换线胜率。'),
]
assert len(reviews) == len(dispatch['proposal_ids']) == 10
results = []
proposal = [f'# 静默猎手本批十项策略提案处置\n\n时间：{time}。batch：20261014-084222-strategy-proposal。base：{BASE}。',
            '本批仅消费已领取的十个id，未创建新id。全部waiting，缺口及来源链保持；没有源码、知识、规则或版本改动。下列原帧均通过offset/bytes/SHA256和JSON正文读回。']
for id, (title, evidence, supported, counter, reason, next_step) in zip(dispatch['proposal_ids'], reviews):
    item = assigned[id]
    results.append({'id': id, 'state': 'waiting', 'reason': reason})
    proposal.append(f'## {id}：{title}\n\n账本：{", ".join(item["ledger"])}。角色silent，观察A10。来源任务：{item["source_task"]}；实现任务strategy-proposal。\n\n证据：{evidence}。{supported}\n\n反例与限制：{counter}\n\n处置：waiting。{reason}\n\n预期行为及验证：{next_step}\n\n拟合/时间切分：不拟合新常数；六局均为已经使用的发现/核验样本，不称独立盲测。新后置完局及受控冻结对照须按run_id分组，SL次数不扩独立分母。\n\n回退：本批没有策略源码可回退；保留原日志、提案、账本及失败材料，后续实际实现以自身live源码commit回退。原提案副本：{id}.md。')
(OUT / 'proposal.md').write_text('\n\n'.join(proposal) + '\n')

rows = consumer['results']
table = ['| 局号 | 状态帧 | 决策原行 | 消费决策 | 整轮端点 | 未知轮窗 |',
         '|---|---:|---:|---:|---:|---:|']
for r in rows:
    original = next(x for x in json.loads((OUT / 'facts.json').read_text())['runs'] if x['run_id'] == r['run'])['decisions']
    table.append(f'| {r["run"]} | {r["states"]} | {original} | {r["decisions"]} | {r["observed_turns"]} | {r["unknown_turns"]} |')
report = f'''# 本批策略学习报告

时间：{time}。角色silent，batch=20261014-084222-strategy-proposal。

结论：十个已领取提案逐项waiting。已核实的机制子实现及诊断审计保留，尚无充分证据改神化优先级、MC预算、药水持有价、HP护栏、SL范围、focus或构筑/终局权重。本批没有源码或知识改动、没有提交、没有合入或版本，不声称shipped、经验入库、策略收益或胜率提升。

## 身份及基线

根learn.json对应本批task=strategy-proposal、character=silent、reason=proposal，工作树与派发完全一致，proposal_ids为本文十个id；没有research_request或implementation_request。只核普通专题请求，其running/batch仍绑定20261010批次，因此不套用专题，不读其他专题。开工git status干净；git merge --no-edit main返回Already up to date。report.base={BASE}，保持该HEAD及跟踪工作树零差异。

原派发与原提案保存dispatch.json、assigned-proposals.json、proposal-history.jsonl及十份Markdown副本；全部角色与SHA匹配。原账本只读本批涉及26个silent id，官方fold保存ledger-before.json；本批只经根ledger.py补note/where追溯，保留原claim、证据、status及version，不重写复盘，不新增机制或提案id，不标shipped。

## 原始证据覆盖

六局runs.jsonl均为SILENT A10，全部原决策数量与局报相符，均败；不把29条SL记录当29个独立样本。完整冻结并逐offset/bytes/SHA256/JSON正文读回：3432状态、3306决策、29条SL、6条配置、6条runs，共6779行。完整计数见extraction-summary.json，源定位见各*-locators.jsonl及proof.log。

{chr(10).join(table)}

五条map/route-change记录没有原decision_id，保存于facts.json的missing_decision_identity；分别CA一条、61一条、DU三条。原行保留，消费者显式排除，没有补造id。3301个消费决策、476个题目片段、859个相邻观测区间、121个整轮端点及413个未知轮窗来自既有auditSelectionExecution，不是476个完整候选执行或独立实验。CA的attempt未知，使该严格消费者不认证观测区间；不等于CA原状态没有机制证据。整轮端点只给净HP/敌血观测，不能归因候选、SL替换或药水。

## 已有源码与消费者边界

只读核对live HEAD=65763022bbb3a5571671e8fab4ae0c92c52b2fd5，12个相关源码路径的最近实际live祖先提交、工作树和committed字节见existing-source-proof.json。9个路径与base逐字相同，card-model/turn-solver/rollout另3个差异仅历史Roy/Dai注释拼写，原diff保存*.live-difference.patch，两checkout均保持原字节。现有神化升级表源码a11dd870b09f3f1b67fcb5d6c08af6573fd809e0、神化候选事实3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17、单步派发bade647f9fe4c9103b40e2f26b26296692ad24b7、整轮/执行审计9b87d54f097d84521152e6cca8d6072af8140394均已证实际live祖先，只有子范围，不足以把十个宽提案登记duplicate。

本批实际运行既有消费者（node --import本地tsx loader，无网络/LLM/知识刷新输入）：consumers.mjs读取六个冻结输入；结果保存六份*-consumer-output.json、consumer-summary.json及consumer.log。实际返回exit0。输出完整候选结果为null是该消费者明确的保守语义，不能当“已统计没有候选完成”，也不能按它构造策略效果。四个VLZ神化帧的参考消费者施放前后均actual_cast_this_fight=null；已观测实打升级成立，但不能称生产持续施放身份已实现。

## 十项处置

详proposal.md，逐项含证据局/层/回合、全部原账本id、反例、下一步验证与回退。原提案Markdown与SHA均保存，未改原文。

''' + '\n\n'.join(f'- {r["id"]}：waiting。{r["reason"]}' for r in results) + '''

## 验证、失败材料与上线口径

未改生产源码，因此tsc=null、vitest=null、cases=null；没有撤源码红/恢复绿实验，消费者核验exit0不是生产测试成功。没有源码提交、merged=null、fixes=[]，没有eval版本或规则通知，也不执行live合入及play。Gitleaks及最终工作树/账本/原文核验将保存在final-checks.json。

保留第一次同权限shell构建的bubblewrap .codex ENOENT失败，其后同命令重试成功，未换权限。证据抽取初稿将state的run_id误按顶层取值得到states={}；原extraction.log和extraction-initial-summary.json保留，修正为state.run_id后单独重抽3432帧并全部原字节读回，不将初稿零帧当证据不足。一次读取测试文件路径误用src目录，原错误保持；实际文件在agent/tests，未改输入/源码或降低消费者校验。

缺数据范围具体到每个原id；未执行候选、完整抽序、历史dirty模型、受控预算和完整后继未知。保留本批大材料和原始失败，交原调度器等待新增证据，不自行清理仍未闭环的研究。

运维交付路径：proposal.md及report.md为本批scratch中的真实绝对路径；没有源码待登记shipped。
'''
(OUT / 'report.md').write_text(report)
result = {'task': 'strategy-proposal', 'character': 'silent', 'batch': '20261014-084222-strategy-proposal',
          'base': BASE, 'runs': dispatch['runs'], 'fixes': [], 'skipped': dispatch['proposal_ids'],
          'merged': None, 'tests': {'tsc': None, 'vitest': None, 'cases': None},
          'code_proposals': dispatch['proposal_ids'], 'implementation_domains': [],
          'proposal_results': results, 'report': str(OUT / 'report.md')}
(OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
changes = []
for id in sorted(ledger):
    related = [r for r in results if id in assigned[r['id']]['ledger']]
    change = {'id': id, 'by': 'learner:strategy-proposal',
              'where': {'proposal': [str(OUT / 'proposal.md'), str(OUT / 'report.md')]},
              'note': '20261014-084222本批六局原字节核验，相关原提案全部waiting；已有子源码/端点不关闭宽项。'
                      + ' '.join(r['id'] + '：' + r['reason'] for r in related)
                      + ' 无源码/合入/版本，tests三项null，原claim/证据/状态/version保持。'}
    changes.append(change)
(OUT / 'ledger-updates.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in changes))
print(json.dumps({'base': BASE, 'proposal_results': len(results), 'ledger_updates': len(changes),
                  'report': str(OUT / 'report.md')}, ensure_ascii=False))
