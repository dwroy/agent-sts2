import copy
import hashlib
import json
from pathlib import Path
import re

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
INPUT = ROOT / 'paper/materials/silent/20261012-core-candidate-decklists/inputs'
records = json.loads((OUT / 'evidence-records.json').read_text())
by_id = {row['ref']['id']: row for row in records}
manifest = json.loads((INPUT.parent / 'registration-input-manifest.json').read_text())
templates = json.loads((INPUT / 'historical-construction-templates.json').read_text())['candidates']


def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def group(cards):
    groups = {}
    for card in cards:
        raw = {k: v for k, v in card.items() if k != 'index'}
        key = json.dumps(raw, ensure_ascii=False, sort_keys=True)
        if key not in groups:
            groups[key] = dict(card_id=card['card_id'], name=card['name'], upgraded=card['upgraded'],
                               count=0, observed_cost=card.get('energy_cost'),
                               card_type=card.get('card_type'), observed_text=card.get('resolved_rules_text'),
                               original_indices=[], raw=raw, upgrade_proven_necessary=None)
        groups[key]['count'] += 1
        groups[key]['original_indices'].append(card['index'])
    return list(groups.values())


def pile_count(rows):
    count = 0
    for row in rows:
        match = re.search(r'\*(\d+)\s*(?:\[|$)', row['line'])
        count += int(match[1]) if match else 1
    return count


def snapshot(ref_id):
    state = by_id[ref_id]['row']['state']
    combat = state['agent_view']['combat']
    piles = {k: pile_count(combat.get(k, [])) for k in ['draw', 'discard', 'exhaust']}
    piles['hand'] = len(state['combat']['hand'])
    return dict(evidence=ref_id, floor=state['run']['floor'], turn=state['turn'],
                permanent_deck_size=len(state['run']['deck']),
                observed_piles=piles, active_pool=piles['hand'] + piles['draw'] + piles['discard'],
                hp=state['combat']['player']['current_hp'], energy=state['combat']['player']['energy'],
                block=state['combat']['player']['block'],
                powers=state['combat']['player']['powers'],
                limitations='按分组牌堆文本的*数量展开；手+抽+弃为此帧实际池，含临时生成/状态。不能用永久N减能力数倒推。')


specs = [
    dict(id='P-LLY', family='P', title='毒源、触媒、余像/步法防御', ref='H-E014', end='H-E015', summary='H-E013',
         core=['NOXIOUS_FUMES', 'ACCELERANT', 'OUTBREAK', 'DEADLY_POISON', 'FOOTWORK', 'AFTERIMAGE', 'MIRAGE'],
         remove='STRIKE_SILENT', add='MIRAGE', key='ACCELERANT', extra='NOXIOUS_FUMES',
         target_reason='用一个同牌组已观察蜃景替换一打击，检验已有毒后的防御是否抵偿消耗牌增加和即时攻击减少；未证净收益。',
         required_relic=None, outcome='A8首试末boss胜；不是A10或该替换方案已验证', damage_lower=460),
    dict(id='D-K367', family='D', title='三步法、多张格挡、毒与撕咬输出', ref='H-E032', end='H-E033', summary='H-E031',
         core=['FOOTWORK', 'DASH', 'LEG_SWEEP', 'BACKFLIP', 'NOXIOUS_FUMES', 'DEADLY_POISON', 'POISONED_STAB', 'MAUL'],
         remove='SERPENT_FORM', add='BACKFLIP', key='FOOTWORK', extra='LEG_SWEEP',
         target_reason='群蛇形态该局未施放，替成同牌组已见后空翻作为待验多挡方案；未施放不证明应删，替换也未验证。',
         required_relic=None, outcome='A1首试判死、第二试胜；低血与SL依赖保留', damage_lower=503),
    dict(id='S-2SU', family='S', title='斗篷供刀、幻影首刀、步法防御', ref='H-E050', end='H-E051', summary='H-E049',
         core=['CLOAK_AND_DAGGER', 'PHANTOM_BLADES', 'FOOTWORK'],
         remove='STRIKE_SILENT', add='CLOAK_AND_DAGGER', key='PHANTOM_BLADES', extra='BACKFLIP',
         target_reason='用第三张同型斗篷替换一打击，作为增加供刀与格挡的待验分支；不预支生成刀、不把第三张配比称最优。',
         required_relic=None, outcome='A6首试末boss胜；混有三毒雾、其他输出与21遗物', damage_lower=481),
    dict(id='R-TINGSHA', family='R', title='工具/下注弃牌、铜钹附加伤害', ref='H-E542', end='H-E057', summary='H-E055',
         core=['TOOLS_OF_THE_TRADE', 'CALCULATED_GAMBLE', 'SURVIVOR'],
         remove='STRIKE_SILENT', add='BACKFLIP', key='TOOLS_OF_THE_TRADE', extra='CALCULATED_GAMBLE',
         target_reason='以已有后空翻替最后一打击，检验后继挡/抽入与攻击损失；铜钹仍必需，未证明抽牌本身有铜钹收益。',
         required_relic='TINGSHA', outcome='A4首试末boss胜；实际还有毒、敏捷、遗物与药水', damage_lower=527),
    dict(id='R-BANDAGES', family='R', title='爆发、杂技、下注、结实绷带', ref='H-E062', end='H-E063', summary='H-E061',
         core=['BURST', 'ACROBATICS', 'CALCULATED_GAMBLE', 'ADRENALINE'],
         remove='STRIKE_SILENT', add='BACKFLIP', key='ACROBATICS', extra='CALCULATED_GAMBLE',
         target_reason='用第四张后空翻替一打击，测试防御/过牌与稀释的冲突；只组出完整待验牌表，不声称能修复末战失败。',
         required_relic='TOUGH_BANDAGES', outcome='A10第三试仍死；只验证T3局部6+27挡', damage_lower=169),
]


def change(cards, remove=None, add=None):
    cards = copy.deepcopy(cards)
    if remove:
        index = next(i for i, c in enumerate(cards) if c['card_id'] == remove)
        del cards[index]
    if add:
        template = next(c for c in cards if c['card_id'] == add)
        cards.append(copy.deepcopy(template))
    for i, card in enumerate(cards):
        card['index'] = i
    return cards


candidates = []
comparisons = []
md = ['# 具体候选牌表便览', '',
      '五套历史实例与五套组装待验方案。这里的总张数是原样实例或单次替换的结果，不是最佳牌数。', '',
      '“+”严格保留原永久牌组的升级；附魔另列原文。没有证据证明这些升级都是必要条件。战斗内临时升级/生成牌不倒写永久表。', '']
for spec in specs:
    ref = by_id[spec['ref']]
    state = ref['row']['state']
    run = state['run']
    summary = by_id[spec['summary']]['row']
    base_cards = copy.deepcopy(run['deck'])
    target_cards = change(base_cards, spec['remove'], spec['add'])
    versions = [
        ('original', '真实历史原牌组', base_cards, []),
        ('candidate', '组装待验候选，未模拟/未实战', target_cards,
         [dict(remove=spec['remove'], add=spec['add'], count=1)]),
        ('minus_key', '候选少一关键组件', change(target_cards, remove=spec['key']),
         [dict(remove=spec['key'], count=1)]),
        ('plus_support', '候选加一补强待验', change(target_cards, add=spec['extra']),
         [dict(add=spec['extra'], count=1)]),
        ('minus_existing', '候选去一防御待验', change(target_cards, remove='DEFEND_SILENT'),
         [dict(remove='DEFEND_SILENT', count=1)]),
    ]
    template = next(t for t in templates if t['id'] == spec['family'])
    family_formation = next((r for r in records if r['ref']['id'] == f"formation-{spec['family']}-{state['run_id']}"), None)
    grouped = group(base_cards)
    for card in grouped:
        card['role'] = '核心组件（作用限正文证据）' if card['card_id'] in spec['core'] else '历史过渡/补充；边际价值未隔离'
        if card['card_id'] in ['SERPENT_FORM', 'TACTICIAN', 'REFLEX']:
            card['role'] = '历史持有；不作为已验证完整核心收益'
        if card['card_type'] in ['Curse', 'Status']:
            card['role'] = '历史残留，原样保留；不把删除收益预设为正'
    candidate = dict(id=spec['id'], family=spec['family'], title=spec['title'], character='silent',
                     run_id=state['run_id'], ascension=run['ascension'], source=ref['ref'],
                     evidence_type='历史原帧+冻结旧报告复用', validation=spec['outcome'],
                     total_cards=len(base_cards), cards=grouped, core_ids=spec['core'],
                     ledger_ids=template['template']['ledger_ids'] + [dict(P='silent-0352', D='silent-0353', S='silent-0354', R='silent-0355')[spec['family']]],
                     first_inventory_signature=family_formation['ref'] if family_formation else None,
                     required_relic_for_named_branch=spec['required_relic'],
                     other_relics_proven_necessary=None, required_potions=None,
                     historical_relics=[dict(id=r['relic_id'], name=r['name'], stack=r.get('stack')) for r in run['relics']],
                     historical_held_potions=[dict(id=p['potion_id'], name=p['name']) for p in run['potions'] if p.get('occupied')],
                     potions_reported_used=summary['summary']['potions'],
                     historical_resources=dict(frame_hp=run['current_hp'], max_hp=run['max_hp'], gold=run['gold'],
                                               max_energy=run['max_energy'], current_energy=state['combat']['player']['energy']),
                     historical_result=dict(attempt=summary['attempt'], result=summary['result'], turns=summary['turns'],
                                            end_hp_summary=summary['end_hp'], visible_effective_damage_lower_bound=spec['damage_lower'],
                                            damage_is_complete=False, summary_ref=spec['summary']),
                     snapshots=[snapshot(spec['ref']), snapshot(spec['end'])],
                     target_reason=spec['target_reason'],
                     upgrade_policy='仅复制原样升级，不推升级优先级或最低升级要求；新加牌从本表同ID第一条复制，具体版本逐张列出。',
                     variants=[])
    if spec['id'] == 'R-BANDAGES':
        candidate['snapshots'].append(snapshot('O-E06-7860441192'))
    for version, label, cards, delta in versions:
        variant = dict(id=spec['id'] + '-' + version, label=label, base=spec['id'] + ('-original' if version == 'candidate' else '-candidate'),
                       historical=version == 'original', cards=group(cards), total_cards=len(cards), changes=delta,
                       missing_acquisition=delta if version != 'original' else [], simulation_result=None)
        if version == 'original':
            variant['base'] = None
        candidate['variants'].append(variant)
        comparisons.append(dict(candidate_id=spec['id'], variant_id=variant['id'], variant=version,
                                total_cards=len(cards), same_state_paired_simulation=False, samples=None,
                                startup_distribution=None, complete_combinations=None, effective_damage=None,
                                block=None, actual_hp_loss=None, kill_turn=None, potion_use=None,
                                hp_entry=None, hp_exit=None, boss_pass=None,
                                reason='冻结结果没有这份精确牌表五臂同状态对照；完整核心归属/反事实资源轨迹不够。历史原样结果另列，不能移植到改表。'))
    candidates.append(candidate)
    md += [f"## {spec['id']}：{spec['title']}", '',
           f"原样：{state['run_id']}，A{run['ascension']} F{run['floor']} T{state['turn']}，{len(base_cards)}张；{spec['outcome']}。证据 `{spec['ref']}` / `{spec['summary']}`。", '',
           '核心便览：' + '、'.join(f"{c['name']}×{c['count']}" for c in grouped if c['card_id'] in spec['core']) + '。', '',
           '目标候选：' + spec['target_reason'] + f" 总计{len(target_cards)}张，新增牌未在该历史时点持有；获得/移除成本未知。", '',
           f"分支必需遗物：{spec['required_relic'] or '未证明特定遗物为必要条件'}；历史喝药：{'；'.join(summary['summary']['potions']) or '摘要无喝药记录'}。其他遗物与持药见JSON，不能当不需要。", '',
           '| 卡名 | ID | 原样张数 | 目标候选张数 | 原样角色 | 升级/附魔要求 |',
           '|---|---|---:|---:|---|---|']
    target_grouped = group(target_cards)
    for card in grouped:
        matching = next((c for c in target_grouped if c['raw'] == card['raw']), None)
        observed = '保留升级；必要性未证' if card['upgraded'] else '原样未升级；升级收益未证'
        if 'enchantment' in json.dumps(card['raw']).lower():
            observed += '；附魔原字段见JSON'
        md.append(f"| {card['name']} | `{card['card_id']}` | {card['count']} | {matching['count'] if matching else 0} | {card['role']} | {observed} |")
    md += ['', '历史完整遗物：' + '、'.join(f"{r['name']}（{r['id']}）" for r in candidate['historical_relics']) + '。', '',
           '原样持药：' + ('、'.join(f"{r['name']}（{r['id']}）" for r in candidate['historical_held_potions']) or '该帧为空') + '。', '',
           '比较五臂：' + '；'.join(f"{v['label']} {v['total_cards']}张" for v in candidate['variants']) + '。全部变体完整展开在JSON，未知结果不填零。', '']
save('candidate-decklists.json', dict(character='silent', request_id=manifest['request_id'], candidates=candidates,
                                    historical_examples=5, assembled_targets=5, simulated_targets=0,
                                    policy='供Roy审阅的具体实例与待验替换；非上线选牌规则、最佳N或通杀承诺'))
(OUT / 'candidate-decklists.md').write_text('\n'.join(md) + '\n')
save('candidate-comparison-gaps.json', comparisons)

selected = json.loads((OUT / 'selected-consumption-records.json').read_text())
native_comparisons = []
table = ['# 复用的同题配对模拟结果', '',
         '仅复用冻结题面数字，没有新跑模拟。这些是各自当时的牌组、资源投影和模型，不能当五套历史候选的同状态反事实。完整组合均未知。', '',
         '| 局/层 | 选项 | 样本/胜样本 | 损血均值 | 与skip配对损血差±均值SE | 格挡均值 | 完整轨迹/总样本 |',
         '|---|---|---:|---:|---:|---:|---:|']
for selected_row in selected:
    audit, brain = selected_row['audit'], selected_row['brain']
    options = {}
    for key, text in brain['options'].items():
        option = json.loads(text)
        facts = option.get('quantitative_fight')
        if not facts:
            continue
        assert facts == audit['quantitative_options'][key]
        options[key] = dict(card=option.get('card'), in_deck=option.get('in_deck'), card_text=option.get('text'),
                            facts=facts, boss_sim_text=option.get('boss_sim'), tied=option.get('boss_sim_win_tied_with', []))
        paired = facts['paired_hp_loss_difference']
        core = facts.get('core_window', {})
        table.append(f"| {audit['run_id']}/F{audit['floor']} | {option.get('card')} | {facts['samples']}/{facts['turns_won_only']['n']} | {facts['hp_loss']['mean']:.3f} | {paired['mean']:+.3f} ± {paired['meanSe']:.3f} | {facts.get('block_gained', {}).get('mean', 0):.3f} | {core.get('valid')}/{facts['samples']} |")
    native_comparisons.append(dict(run_id=audit['run_id'], floor=audit['floor'],
                                   source=dict(path='logs/brain.jsonl', offset=audit['brain_offset'], bytes=selected_row['bytes'], sha256=audit['brain_sha256']),
                                   answer=brain['answer'], accepted=brain['accepted'],
                                   facts=brain['payload']['facts'], permanent_deck=brain['payload']['deck'],
                                   options=options, new_simulation=False,
                                   limits='相同题面说明同样本/策略；本冻结审计没有完整逐样本随机身份和全部预算输入，不能独立重建配对轨迹。保留已记录配对差，不用聚合均值自行造配对SE。'))
save('reused-native-comparisons.json', native_comparisons)
(OUT / 'reused-native-comparisons.md').write_text('\n'.join(table) + '\n')

audit = json.loads((INPUT / 'brain-simulator-audit-20261012-132617.json').read_text())
assert len(audit['rows']) == audit['count'] == 71
assert sum(row['sim_status'] == 'numeric' for row in audit['rows']) == 54
assert sum(bool(row['core_window_options']) for row in audit['rows']) == 51
assert all(q.get('complete_combinations') is None for row in audit['rows'] for q in row['quantitative_options'].values())
assert all(c['combinations']['discardBandages'] == {} for row in audit['rows'] for c in row['core_window_options'].values())
save('consumption-audit-mapping.json', dict(
    source='brain-simulator-audit-20261012-132617.json', total=71, numeric=54, insufficient=11, skipped_after_act=6,
    full_knowledge=71, core_window_present=51, complete_combo_numeric=0,
    by_run=audit['by_run'], reason_word_counts=dict(simulation=19, dilution=11, core_metrics=0),
    status=dict(stored='冻结材料和原题面已核', presented='71份full，54题数字，51题核心字段',
                cited='理由词面19/11/0；不推断内部理解', executed='原选择事实71/71完成匹配', effect='没有本五套候选的自然采用或收益证据'),
    ownership=dict(P0='仅映射既有资料传递范围，不代修或重派', P1='本报告给具体候选/原样资源/缺指标；父任务继续归属与配对接口', P2='报告完成不等入库、采用或效果完成')))

notes = {
    'C48LLXBGKXQ9': 'A0 F33第6试T11，3敏后两防御+偏折共26挡，2HP对32仍败；持续收益不等足够生存。',
    'LRN0HPZ0FZS1': 'A0 F48T3翻越撑击+单动作重放，敌377→353、挡13→15；实际重复不等多次支付，最终败。',
    'T082DRCUHRRD': 'P签名F37首次实持；F48败，不能用标签预支启动或终局通过。',
    '1HC609GTLGN3': 'D签名F21首次实持；终止F22，成型不保证走到终局。',
    'KAY522KT5NXR': 'A0 F48第一次判死，第二试混合P/S/流星锤胜；不独立归因刀或回返。',
    'K3676LU8B0UH': 'D完整34张历史基线，A1 F48第二试胜；群蛇形态未施放不作主轴。',
    'CSBR5CRDWQNB': 'A2 F33小刀候选六次失败，最终4轮死；分支组件不保证跨boss。',
    'ZZMYZ5UBCG72': 'P低阶A2 F33/F48首试胜；实际能力与降费证据，不移植为所有遗物情境。',
    '1LMBFGSMCWKU': 'R铜钹33张历史基线，A4F48首试胜；开场回血与战后回血同净差分开。',
    '2SU6XN2AEJRD': 'S49张历史基线，A6F48首试胜；幻影T5建立，首个summary手动刀T9。',
    '4Y94N8RDPGPM': 'A7复制目标为蛇咬/毒药；T10→T12实际21新增毒/54总实扣非单源；不作单步法夜魇代理。',
    'LLYSRQQ35AVW': 'P41张历史基线，A8F48首试胜；余像T3、触媒T4、毒雾T5建立。',
    '25226ZFLNR1J': 'A10P/D/R混合仍F48败；小提琴封抽下后空翻仍有10挡，不能整牌作废。',
    'UJ0K3G10609Y': '冻结P/S成型与夜魇代理撤回反例；A10F48失败，持有夜魇不证明复制步法。',
    'L704TLETMZBM': 'R绷带41张A10基线；T3实际弃牌补6+27挡，第三试仍死；有限组件可计不等全套闭合。',
    'P5HT1272P5SB': 'A10F25T1步法先打后已不在选择内，实际复制富足，后继未施；F19另目标不能等价。',
    'YF0LXT1QSTGG': 'A10P/S；沙虫两次启动顺序不同，F48实验体六败，未证明早建因果。',
    'KV0JHNJCKXLS': 'A10F33第6试T1封抽仍有挡/产能；旧8样本一轮增删对照全截断并列。',
    'XTSV1U9JD34T': 'A10F49复制未等到次轮，末1HP/6挡对16；下一轮愿望不付当轮代价。',
    'J8PHG72DGD90': 'A10F33末试T13已生两刀但SLOTH额度阻止；不能计26已兑现伤。',
    'HNX4A2WBC34W': 'A10F48T7/T8已结毒87/84仍130敌血而死；输出和生存同时验。',
    '54G5683J0E5S': 'A10F33真实复制步法，T6三副本未施；T7/T9累计+9敏，仍非永久单步法代理。',
    '49HL2N70CHMU': 'A10F48→F49同36张，72→24→26→败；资源接续与重新启动不能由单boss胜代替。',
    'N1ZEBMHZM4KC': '11题消费审计，3有数字/7不足/1跳过；9拿2跳，末23张F21败，不作厚度败因。',
    'C7GNN3DDFUFY': '13题消费审计，F9拿早有准备；本题全胜率并列，绷带题面缺口、完整轨迹169/1000。',
    'F6XY4QJMS5RC': '16题消费审计，F11拿下注但模型损血差+4.684；模型/理由/实战收益不同层。',
    'CMS8QL9E3C5U': '11题消费审计，F11拿工具；0.2%模型胜率不能当核心完成，末24张F23败。',
    'PUY011SBWSSU': '20题消费审计，F46逃脱计划对skip344样本连战均0胜；有首步法字段但完整组合未知。',
}
coverage = []
for row in manifest['runs']:
    run_id = row['run_id']
    refs = [r['ref']['id'] for r in records if r['ref']['run_id'] == run_id]
    coverage.append(dict(run_id=run_id, ascension=row['ascension'], covered=True,
                         scope='限定原字节及冻结报告复用' if refs else '冻结最近五局逐题消费/执行事实复用',
                         raw_refs=refs, conclusion_used=notes[run_id],
                         audit_rows=sum(x['run_id'] == run_id for x in audit['rows']),
                         whole_history_reanalyzed=False))
assert len(coverage) == 28
save('run-coverage.json', coverage)
save('startup-and-pools.json', [dict(candidate=c['id'], snapshots=c['snapshots']) for c in candidates])
print('ASSEMBLED', len(candidates), 'historical decks;', sum(len(c['variants']) for c in candidates), 'full variants;', len(native_comparisons), 'reused comparisons;', len(coverage), 'covered runs')
print('POOL_COUNTS', [(c['id'], [(s['turn'], s['observed_piles'], s['active_pool']) for s in c['snapshots']]) for c in candidates])
