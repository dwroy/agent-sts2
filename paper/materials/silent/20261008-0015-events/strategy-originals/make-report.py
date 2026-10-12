import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
batch = json.loads((HERE / 'batch.json').read_text())
items = json.loads((HERE / 'dispatched-proposals.json').read_text())
proof = json.loads((HERE / 'live-source-proof.json').read_text())
date = (HERE / 'date-final.txt').read_text().strip()
base = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()

details = {
    'silent-proposal-89354805ee4d7e77': {
        'evidence': 'VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1；states275564/275565、275679/275680/275687/275688、275722/275731/275732。',
        'reason': '神化手牌升级成立，state.agent_view.combat.draw/discard/exhaust亦有聚合牌堆文本；不能沿用“729帧均无牌堆”的旧理由。729帧中631帧含draw，4761条draw记录均只有card_ids/keywords/line/mods，没有逐卡dynamic_values或稳定实例。完整传播仍缺未知升级/附魔及同回合抽弃/后续牌的复合输入；当前applyUpgrade也未覆盖所需所有模型字段。升级勒紧子项已经上线，不能据此宣布整项神化完成。',
        'counterexample': 'F45持有而未施放，不能预支升级；F35神化后改变目标，37→52伤不能全部归因升级。',
        'next': '补逐卡升级前后dynamic_values与附魔信息，冻结手牌、各堆和抽弃选择输入，验证F43同序51伤/13损、后续已覆盖牌升级、未知保留未知和场外deck不变。',
    },
    'silent-proposal-f2bfceddb1898dca': {
        'evidence': 'VLZ6CCT8AQ0A A10 F43 T1—T5、F44休息、F45 T1/T4/T5；decisions269748/269754/269770。',
        'reason': '成熟度展示子项已有实际live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5。调整随机药水MC先行、非药候选预算或药价仍缺同总预算、同盘、固定随机输入的受控结果与候选稳定性曲线；神化未完整传播，不能将其漏算归为预算收益。',
        'counterexample': 'F45 T4未实打高伤候选，全败并列不能证明多8伤优于少18血损；F17/F33首试胜，也不支持一律弃用模拟。',
        'next': '保存完整调用及固定随机种子，在相同总预算比较当前算法和分阶段方案，记录耗时、样本、退化和模型覆盖，再评价目标/药价。',
    },
    'silent-proposal-283a164780d11e69': {
        'evidence': 'VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1；与89354805ee4d7e77共享0237/0238，经验silent-apotheosis-combat-upgrades。',
        'reason': '同一神化缺口的经验链接，不能把经验发布或升级勒紧子项当完整源码实现。聚合牌堆确实存在，缺口是未知升级/附魔及抽弃后的完整模型输入和字段传播；与89354805ee4d7e77合并后续实现，不重复造新提案。',
        'counterexample': '持有神化不等于施放；四个赢战与F45死战起始资源、敌人与抽序不同。',
        'next': '沿0237/0238专属实现链补相同固定夹具与逐卡动态值，保留两份来源任务/经验链接。',
    },
    'silent-proposal-ebbfe3b97548756d': {
        'evidence': 'VLZ6CCT8AQ0A A10 F43 T1/T3/T4/T5、F44休息、F45 T3/T5；states275679/275680/275752/275754及全局资源链。',
        'reason': '14账本/15经验的复合请求中，升级勒紧有实际源码5e80e683daa08ae2569733b3b541cb523d7fe861，尖啸和成熟度亦有局部实现；神化完整传播和持续输出/资源共同冻结的调用仍不齐。逐项经验支持不能代替整个复合模型的验证，不能据局部提交关闭整项。',
        'counterexample': 'F45有两张雾但未建立，覆甲末轮已0；32血20挡对减力后59仍差7，不能把持有能力或开场覆甲预支为末轮收益。',
        'next': '先沿神化专属链补完整输入，再用F43毒结算与F45四段减力/属性/资源固定组合验证；路线与休息只保留观察。',
    },
    'silent-proposal-e5b87be50f28f311': {
        'evidence': '8JRE1C4H4Z2W A10 F33首试/第三试T2、第二试T5、末试T11，F17 T6；decisions270216/270282指纹完全相同，270264含护栏替换。',
        'reason': '本批确认同指纹原答/SL替换事实，但历史日志缺跨Jev原答、HP护栏、SL替换、实际前缀及重规划的统一候选标识和完整冻结调用。抽牌/选择重规划后原候选差额不能直接作为实际收益；缺这种全过程配对数据和另一完整线结果，不调整探索/成长规则。审计请求仍开放，不能凭已有文本理由声称完整审计已实现。',
        'counterexample': '首/三试T2多7伤付12血且均T7判死；末试T2防御换线省3血少10伤虽延到T11仍败，不能认定所有保血或所有探索均错。',
        'next': '新增对局保存五阶段统一候选ID、相同起点数值与实际前缀/重规划终止标记，按run分组复核；规则变更另需完整离线线路及后置同角色验证。',
    },
    'silent-proposal-49632bc4878fb597': {
        'evidence': 'CA5KE8GFJ9X2 A10 F13 T1/T3/T5；states273268/273269确认2血10挡对14攻击、敌力8且有弱。',
        'reason': '两次加压后的力量0→4→8、喷水11→15→19及弱后11/14可从原帧确认。该提案还覆盖敏捷与独立成长的组合验证；本局未取得步法，不能填入不存在的敏捷实测。现有分项接线不是该四路径共同冻结调用的实盘证明，本批没有补足此复合输入。',
        'counterexample': '虚弱没有取消下次加压；计划中的步法未取得，不能用另一角色样本或预训练知识补敏捷。',
        'next': '取得本角色同范围敏捷与敌成长/弱共存的逐牌原帧，并冻结实际调用，逐路径比较现场和推演，不拟合统一攻防权重。',
    },
    'silent-proposal-66532328a585941f': {
        'evidence': '5PM6JAQG6FNQ A10 F39第二次T2及F33 T1/T2；逐局帧641→642（states274379→274380），玩家29血、失落35血均不变，能量5→4。',
        'reason': 'F39无毒目标上咕嘟冒泡消耗1能而不建立毒可核，F33建立成长并赢也可核；两战敌人、资源及启动条件不同。缺同起始血量/构筑/抽序下不同启动顺序的整场对照和收益函数，不拟合构筑或启动优先级，也不把持有/计划当已建立。',
        'counterexample': '同局F33已有雾3/触媒1/群蛇4并赢，与F39死亡场不是受控替换。',
        'next': '记录相同资源与抽序下实际建立时点、逐轮兑现和完整结局；缺反事实时只保留事实，不改变构筑权重。',
    },
    'silent-proposal-43a76a31ba7bdcfa': {
        'evidence': '61E2QS63Y9WU A10 F17 T5吸取、T6双防御、T7胜；states273506/273507显示−2敏捷、两防御合6挡及17毒。',
        'reason': '吸取、负敏捷和毒的分项实盘成立，但本局首试60血七轮胜。缺同起始血量/构筑/完整抽序下可救活的另一SL线路，不能用首试胜或其他不同局失败调整本条SL范围/换线偏好。',
        'counterexample': '本局已首试获胜，不能把其分项机制支持误作必须读档的依据。',
        'next': '保留分项事实；仅当本角色出现可配对的完整SL线路和已知抽序时重验范围或选择偏好。',
    },
    'silent-proposal-5264153a4a4b0e5c': {
        'evidence': '61E2QS63Y9WU A10 F23 T4/T5；states273594/273595及后轮保存帧，T4幻象14→2仍有15攻击，本体毒后余41。',
        'reason': '本体线47伤/损15及两次航行增长可核，另一focus幻象39伤零损只是候选，未完整实打。旧召唤源码不足以证明A10召唤/航行/复活完整组合及目标排序收益；本批仍缺该组合完整冻结调用和另一目标序后续证据，保留所有目标与现有排名。',
        'counterexample': 'T4本体线输出兑现但幻象未退场；不能把未打的零损候选当整场胜线或强制首杀依据。',
        'next': '补A10召唤/航行/复活前后逐实体状态及移动表，冻结完整前缀；目标排序改变另需受控后续结果。',
    },
    'silent-proposal-e0275838dbb45d18': {
        'evidence': 'DUZUBAJ3A8GP A10 F30 T5/T6；逐局帧612—622（原states275013—275023），账本0046/0128。',
        'reason': '普通尖啸逐击临时−6、次轮恢复并继续独立增长已实现。本批重新提取原帧，与旧哈希一致；固定重放得到当轮14攻击、次轮力量4/攻击22。c7578f37608526591edd86041cee5a28c3894fee为实际live源码祖先，相关五个现用源文件与核验时live逐字节一致，不重复实现或发布。',
        'counterexample': '减力只在本轮有效，T6恢复及成长后16挡不足22攻击；现有实现不证明整场能赢。',
        'next': '保持现有临时减力/恢复/独立成长行为与全部合法选择；未知升级组合继续沿原模型。',
        'commit': 'c7578f37608526591edd86041cee5a28c3894fee',
    },
}
assert set(details) == set(batch['proposal_ids']) == set(items)
assert all(p['original_sha256_now'] == p['proposal_sha256'] for p in items.values())
results = []
short_reasons = {
    'silent-proposal-89354805ee4d7e77': '有聚合牌堆；缺未知升级/附魔的逐卡动态值及抽弃后的完整传播输入。',
    'silent-proposal-f2bfceddb1898dca': '缺同总预算、同盘固定随机输入的MC对照及神化完整覆盖后的结果。',
    'silent-proposal-283a164780d11e69': '神化经验链接；同89354805缺逐卡动态值和完整抽弃传播输入。',
    'silent-proposal-ebbfe3b97548756d': '升级勒紧等子项已有实现；缺神化及持续输出/资源的完整复合调用验证。',
    'silent-proposal-e5b87be50f28f311': '缺原答/护栏/SL/实际前缀/重规划统一候选标识与全过程配对调用。',
    'silent-proposal-49632bc4878fb597': '本局未取得步法；缺敏捷、弱和独立成长共同冻结的本角色调用。',
    'silent-proposal-66532328a585941f': '缺同血量、构筑及抽序下不同启动顺序的完整对照。',
    'silent-proposal-43a76a31ba7bdcfa': '首试已胜；缺同资源及完整抽序下可救活的另一SL线路。',
    'silent-proposal-5264153a4a4b0e5c': '缺A10召唤/航行/复活完整组合输入及另一目标序后续实打。',
    'silent-proposal-e0275838dbb45d18': '临时尖啸恢复及独立成长已有live实现；本局固定重放通过。',
}
for ident in batch['proposal_ids']:
    d = details[ident]
    row = {'id': ident, 'state': 'duplicate' if 'commit' in d else 'waiting', 'reason': short_reasons[ident]}
    if 'commit' in d:
        row['commit'] = d['commit']
    results.append(row)
(HERE / 'proposal_results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')

intro = f'''# 静默猎手策略提案与逐项处置

记录时间：{date}（已先执行date）。实际调度batch为20261007-234302-strategy-proposal，指定scratch为20261007-234303-strategy-proposal；无proposal_repair。只读取本batch派发的10个ID，逐项核角色、账本、Markdown和SHA256；原Markdown的10个指纹均一致，原文完整保存于本目录。

角色silent；六个指定来源局经runs.jsonl和每帧character_id/ascension核为SILENT A10。重新提取3432帧，CA5/61E2/5PM/DUZ四局与旧证据SHA256一致；核证文件见evidence-manifest.json、selected-state-facts.json、selected-decisions.json、verify.log。没有读其他角色知识，也没有用未派发提案扩展学习范围。

本次没有新增源码或知识规则：1项duplicate、9项waiting。授权Roy-2026-10-07-learning只提供修改权限，不提供游戏事实。当前基线为`{base}`；开工干净，git merge --no-edit main无冲突。本次没有源码提交、没有live合入、没有eval版本，也没有标shipped。原合法选项、并列排名、药水/SL/终局价值与所有角色行为保持等价；怪物当前进阶数据库首样本口径、房间代价5样本门槛不变。

历史勘误：准确路径是state.agent_view.combat.draw/discard/exhaust。VLZ共729帧，其中631帧含draw聚合文本，4761条draw记录无dynamic_values/稳定实例，只有card_ids、keywords、line、mods。旧报告“没有战内牌堆”过宽；本次修正理由但保留原报告和此前CLI勘误，不再重复写历史复盘。已观察的升级数值和升级勒紧源码不被否认；不将尚未覆盖的完整神化传播冒称已实现。

拟合与切分：只作保存样本内的事实核对，不拟合护栏、药价、预算、SL、启动或目标权重。SL尝试按run分组，不扩独立样本；新局才可作时间后置验证。本批六个来源局均为既有发现样本，不能假称盲测。没有规则需回退；已有实现沿其原提交/发布回退方法，不回退并行知识刷新。

## 固定验证

existing.test.ts只读本目录重新提取的DUZ固定原帧，屏蔽全部知识文件读取，固定怪物移动表、种子/时钟；没有网络或LLM。测试3例通过：T5/T6临时尖啸恢复加独立成长、T4逐击荆棘、T6死亡轮毒与荆棘分账。所用五源文件与live `{proof['live']}`逐字节相同，三项相关源提交祖先校验exit0，见live-source-proof.json。后两例只帮助核结算边界，不给本批其他ID冒称完整实现。

没有新源码，所以撤源码失败/恢复通过不适用，未撤旧live祖先代码，未冒报新红绿；tsc和原tools/test-sandbox.sh本轮未运行。vitest仅上述固定3例exit0，不能称完整套件通过。没有源码提交或上线，因此不重复合入或制造版本；运维仍需依据真实旧祖先核登记duplicate。

本目录gitleaks扫描exit0，约169MB产物无泄露；见gitleaks.log/rc。未推送、未运行play、未停止对局、未修改运维prompt、日志或key/.env。

'''
sections = []
for ident in batch['proposal_ids']:
    p = items[ident]
    d = details[ident]
    state = 'duplicate' if 'commit' in d else 'waiting'
    sections.append(f'''## {ident}

来源任务：{p['source_task']}；实现任务：strategy-proposal；原请求领域：{', '.join(p['domains'])}。
账本：{', '.join(p['ledger'])}。经验：{', '.join(p.get('experience', [])) or '原提案未指定经验ID'}。
证据局号/层/回合：{d['evidence']}
旧规则/拟实现行为、原验证与回退：[保存的原提案]({ident}.original.md)。原summary：{p['summary']}

本次处置：**{state}**。{d['reason']}
反例/边界：{d['counterexample']}
预期行为与下一次验证：{d['next']}不承诺整场胜率，不强制未实打顺序。
''' + (f"\n实际live祖先源码commit：`{d['commit']}`。\n" if 'commit' in d else '\n未新增代码：保留原行为和原提案，待上述具体数据齐备再派；没有可登记的本项实际live源码commit。\n'))
proposal = intro + '\n'.join(sections)
(HERE / 'proposal.md').write_text(proposal)
report = {
    'task': 'strategy-proposal', 'base': base, 'runs': batch['runs'], 'fixes': [],
    'skipped': [r['id'] for r in results if r['state'] == 'waiting'],
    'merged': None, 'tests': {'tsc': None, 'vitest': 0, 'cases': 3},
    'code_proposals': batch['proposal_ids'], 'implementation_domains': [],
    'proposal_results': results, 'report': str(HERE / 'report.md'),
}
(HERE / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(HERE / 'report.md').write_text('# 静默猎手策略学习回报\n\n'
    + f'本批无源码改动：1项已有实现duplicate、9项waiting。完整40位base `{base}`；fixes=[]；merged=null；没有本任务提交/上线版本。工作树保持干净。\n\n'
    + f'运维提案路径：`{HERE / "proposal.md"}`。最终JSON见本目录report.json。\n\n'
    + proposal + '\n账本只经根learner/ledger.py追加本次核证/提案链接，不改原claim、first_run、prior、support/repeat计数或已有shipped版本；0237未实现缺口为proposed。未新增代码提案：本次复用10个既有CLI ID，不以重复登记制造已实现状态。\n')

updates = []
ledger_to_ids = {}
for ident in batch['proposal_ids']:
    for ledger in items[ident]['ledger']:
        ledger_to_ids.setdefault(ledger, []).append(ident)
for ledger, ids in ledger_to_ids.items():
    row = {'id': ledger, 'by': 'learner:strategy-proposal',
           'where': {'proposal': [str(HERE / 'proposal.md')]},
           'note': '20261007-234302派发核证：' + ', '.join(ids) +
                   '；处置详见提案/report，1duplicate/9waiting，无新源码或上线；保留旧首证/先验/支持/重复及shipment历史。'}
    if ledger == 'silent-0237':
        row['status'] = 'proposed'
        row['note'] += ' 本批复核VLZ729帧，631帧含agent_view.combat.draw聚合文本，不沿用完全无牌堆的旧理由；4761条draw无逐卡dynamic_values/实例，完整未知升级/附魔及抽弃传播仍待补数据。'
    updates.append(row)
(HERE / 'ledger-update.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in updates))
print(json.dumps({'base': base, 'dispositions': len(results), 'duplicate': 1, 'waiting': 9,
                  'ledger_updates': len(updates), 'report': report['report']}, ensure_ascii=False))
