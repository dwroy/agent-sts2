"""Assemble this batch's evidence-backed candidates; no shared writes or publication."""
import collections
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
RUN_DIR = OUT.parent
WT = RUN_DIR.parents[2]
BATCH = '20261024-181311-strategy-proposal'
BASE = '33733c9dd031d1c69be1985918a7001dca051fe8'
MANIFEST_SHA = '453b5f28d9030a8c4b9fba8834308e2d609773c7e410e9d67fff292155f076d1'
PLAN = 'issue51-whole-run-blade-003-20261024'
PLAYBOOK = 'silent-whole-run-blade-003'
OWN_RUN = '9R916WW0V65N'
STAMP = subprocess.check_output(['date', '-Is'], text=True).strip()


def read(path):
    return json.loads(Path(path).read_text())


def save(name, value):
    path = OUT / name
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    return str(path)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


actions = read(OUT / 'own-action-observations.json')
by_offset = {a['decision_offset']: a for a in actions}
raw_audit = read(OUT / 'raw-seek-audit.json')
raw_refs = {(a['stream'], a['offset']): a for a in raw_audit}
old = {e['id']: e for e in read(OUT / 'baseline-experience.json')['entries']}
old_rk = {e['id']: e for e in read(OUT / 'baseline-reflex.json')['entries']}
old_strategy = {e['id']: e for e in read(OUT / 'baseline-strategy-entries.json')['entries']}
external_root = ROOT / 'knowledge/external/sts2fun/builds-v1'
external_arch = read(external_root / 'archetypes.json')
external_timeline = read(external_root / 'timeline.json')
external_combinations = read(external_root / 'combinations.json')
external_matchups = read(external_root / 'matchups.json')
versions = ['v0.107', 'v0.108', 'v0.109', 'v0.110', 'v0.111']
ext_manifest = read(external_root / 'manifest.json')
examples = [e for path in sorted((OUT / 'external-pages').glob('pair-*.json'))
            for pair in read(path)['rows'] for e in pair['examples']]

global_limits = [
    'external:sts2fun，自选上传；独立玩家数未知。独立上传记录不是独立玩家，代表配对亦非随机样本。',
    '外部仅v0.111作为当前方向参照；v0.107—v0.110逐项另列，机制变更对照未知，不合并版本。自有游戏版本unknown。',
    '终局簇6只作离线定位。现有牌文、真实已持牌、当前能力与合法动作才可作在线条件；未使用archetype触发。',
    '外部完整指全部记录节点；缺真实初始/战前快照、战斗逐回合、药水时机和事件题文。拿牌还原、前节点HP及正block计数均为代理。',
    '自有仅冻结506、11个SHA一致分片和六流原切点；DuckDB内存、threads=2，未同步共享logdb、未读外部原库。',
    '自有A10无重试证据4局、重试/预判必死3局、A6重试1局分列，均0胜；缺同簇自有赢家。未见重试证据不等于证实无SL。',
    '9R916WW0V65N首次预判必死截止在F48；该战最终三试过，F49六试败。重试不是独立局，跨尝试净损和药水重复列表不作单次资源成本。',
    '自有act_end_snapshots只按幕字段取最后记录；9R首幕项实际是F17开战69血，不是战后42血。与外部幕末还原的HP/牌数不能直接作同时间点比较。',
    '观察动作的单步变化不证明改顺序或拿牌会改善整战；无合法原Plan、完整逐候选结果或留出回放，rk仅描述tag，不含HP/胜率收益信号。',
    '现行策略trigger只编码题型与幕；正文的实际持牌/敌人/能力条件仍须消费方逐项核，不把正文条件当自动匹配已通过。',
    '真实新情境2、旧知识情境更新4；六个新文字投影ID和六个窄条件rk投影ID不计十二条新知识。正式发布/工具读回/自然查询/采用/收益均0。',
]


def ext_ev(file, statistic, value, n, version='v0.111', role='support', unit='runs'):
    return {'type': 'external_aggregate', 'source': 'external:sts2fun',
            'url': 'https://sts2.fun/static/sts2_public.db.zst', 'version': version,
            'dataset_sha256': '1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5',
            'downloaded_at': '2026-10-21',
            'license': '公开FAQ未发现明确再分发许可；署名聚合统计，原库不再分发。',
            'filters': {'character': 'silent', 'ascension': 10,
                        'criteria': "SILENT, ascension=10,n_players=1,is_valid=1,was_abandoned=0,has_modifiers=0; "
                                    'frozen final-deck cluster6; ' + statistic},
            'statistic': {'name': statistic, 'value': value, 'unit': unit},
            'denominator': {'unit': 'runs', 'n': n}, 'design': 'observational',
            'limitations': [global_limits[0], global_limits[1], global_limits[2],
                            '终局还原/赢家选择/深度匹配有混杂；非拿牌/启动顺序的因果收益。'],
            'ref': f'knowledge/external/sts2fun/builds-v1/{file};sha256={ext_manifest["files"][file]["sha256"]};cluster=6;version={version}',
            'role': role}


def own_ev(floor, detail):
    return {'type': 'own', 'run': OWN_RUN, 'floor': floor,
            'ref': str(OUT / 'evidence-statistics.json') + '#' + detail}


specs = [
    {'key': 'B1', 'slug': 'formation', 'id': 'silent-brain-blade-flexible-formation-review',
     'disposition': 'new', 'experience': ['silent-core-shiv-defense-observation'],
     'questions': ['act_plan', 'card_reward'], 'acts': [1, 2, 3],
     'text': '已有刀源时，按当前已持牌分别比较增伤、群伤、防护与过牌，不以刀扇＋精准＋刀舞齐全作成型或安全前提。外部v0.111终局还原一致赢家中，仅25/101观察到这三牌齐全，76/101未观察到；首幕齐全7/101。自有A10无重试证据0/4齐全，重试层1/3到F45齐全而仍败，不能把缺三牌当败因。\n范围：Silent A10；外部还原与自有首次观察均为时序代理，非固定拿牌排序。自有版本unknown，旧版本机制未知另账。',
     'evidence': [ext_ev('timeline.json', 'winner_descriptive_bundle_observed', 25, 101), own_ev(45, 'formation')],
     'rk': [], 'gap': '整局/奖励的功能分工与成型判断没有对应的原combat_line候选动作；不能将统计簇或三牌缺口改造成可执行rk。待合法拿牌/规划消费者与原输入。'},
    {'key': 'B2', 'slug': 'fan-setup', 'id': 'silent-fan-of-knives-capacity',
     'disposition': 'update', 'experience': ['silent-fan-of-knives-capacity'],
     'questions': ['fight_plan'], 'acts': [3],
     'text': '本战已持刀扇时，比较2费启动、实际手位和随后合法出刀，不把产刀直接算成已伤害；普通牌文产4刀。9R916WW0V65N有4次单步施放（1局，含重试），均建立1层群伤并添4刀；F48三次及F45一次，后者整战仍掉20血。外部v0.111所选代表终局刀扇为胜6/10、负1/10，配对有赢家选择偏差。\n范围：Silent A10，实测自有版本unknown；rk仅收窄到当前实验体，未验证拥挤手牌或升级数量，不从这4次定安全启动顺序。',
     'evidence': [own_ev(48, 'fan_setup'), ext_ev('representative-timelines.json', 'selected_winner_terminal_fan', 6, 10),
                  ext_ev('representative-timelines.json', 'selected_loser_terminal_fan', 1, 10)],
     'rk': ['silent-rk-blade-fan-setup-test-subject']},
    {'key': 'B3', 'slug': 'accuracy-realization', 'id': 'silent-accuracy-shiv-scaling',
     'disposition': 'update', 'experience': ['silent-accuracy-shiv-scaling', 'silent-phantom-blades-first-shiv'],
     'questions': ['fight_plan'], 'acts': [3],
     'text': '已持精准与可打小刀时，比较付1费后再出刀与即时攻防，按当前敌能力核实伤。9R916WW0V65N四次带既有小刀施放使牌面4→8或5→9（12次施放中8次当步无刀，均仅1局）。F48末试T12实验体有无实体1：三张群伤9小刀各实扣1，共3并补3余像挡；不能按27伤算斩杀。\n范围：Silent A10、自有版本unknown、含SL。外部v0.111精准＋刀扇终局匹配胜24/63、负27/63，差-4.76pp、q=1，保留反向而非拿牌收益；其他敌人/阶段不外推。',
     'evidence': [own_ev(42, 'accuracy'), own_ev(48, 'intangible'),
                  ext_ev('combinations.json', 'matched_winner_accuracy_fan_terminal', 24, 63),
                  ext_ev('combinations.json', 'matched_loser_accuracy_fan_terminal', 27, 63)],
     'rk': ['silent-rk-blade-accuracy-held-shivs', 'silent-rk-blade-intangible-shivs']},
    {'key': 'B4', 'slug': 'cloak-defense', 'id': 'silent-core-shiv-defense-observation',
     'disposition': 'update', 'experience': ['silent-core-shiv-defense-observation'],
     'questions': ['fight_plan'], 'acts': [3],
     'text': '已持斗篷与匕首且当前需要挡时，把其实际格挡与生成刀后继分别和其他合法线比较，不把刀源＋增益当防御已够。9R916WW0V65N F42机甲骑士三次斗篷，挡7→16、23→34、1→13，分别添1/2/2刀，当前攻击30/45/50，均仍有缺口；整战68→37（1局3次机会）。外部v0.111赢家幕1/2正block牌副本代理均8.09/9.63，各n=101。\n范围：Silent A10、自有版本unknown；代理不是防御质量、所需张数或安全线，能力/遗物附挡另源，未证明改出牌可挽回31血。',
     'evidence': [own_ev(42, 'cloak_defense'),
                  ext_ev('timeline.json', 'winner_checkpoint1_positive_block_card_copies_proxy_mean', 8.089108910891088, 101, unit='cards'),
                  ext_ev('timeline.json', 'winner_checkpoint2_positive_block_card_copies_proxy_mean', 9.633663366336634, 101, unit='cards')],
     'rk': ['silent-rk-blade-cloak-mecha-defense']},
    {'key': 'B5', 'slug': 'afterimage-generated', 'id': 'silent-afterimage-per-card-block',
     'disposition': 'update', 'experience': ['silent-afterimage-per-card-block'],
     'questions': ['fight_plan'], 'acts': [3],
     'text': '余像已建时，备战把生成动作与后续实出刀分别记挡；刀舞产三刀不等于已打三刀。9R916WW0V65N F48两次刀舞添三刀而当步各只+1挡；F49未建余像的刀舞添三刀、当步+0挡。F48末试T12随后三刀各再+1挡，但仍有敌36攻，不能把生成当四次已出牌。\n范围：Silent A10、自有版本unknown，1局3次刀舞、含SL/不同敌阶段，不是有无余像的整战因果对照；仅已建能力与实际合法后继，不预支抽到但未建立的余像。',
     'evidence': [own_ev(48, 'afterimage_generation'), own_ev(49, 'afterimage_generation')],
     'rk': ['silent-rk-blade-afterimage-generation']},
    {'key': 'B6', 'slug': 'no-draw', 'id': 'silent-brain-blade-no-draw-backflip-review',
     'disposition': 'new', 'experience': ['silent-core-shiv-defense-observation'],
     'questions': ['fight_plan'], 'acts': [3],
     'text': '刀牌备战中若本轮已显示不可抽牌且手有后空翻，按实际格挡比较它和其他合法防护，勿把“抽2”当仍可找刀/能力。9R916WW0V65N F48末试T6，NO_DRAW_POWER=1下后空翻牌文14挡抽2，手8→7且其余牌逐项相同，挡2→17（牌挡14＋已建余像1）。本局另11次无该能力的后空翻手牌净+1；只有1个独立局。\n范围：Silent A10、版本unknown、实验体已观察窗口；单步事实且稀疏，不认证抽牌锁的一般机制、原因、解除时机或整战收益。',
     'evidence': [own_ev(48, 'no_draw')],
     'rk': ['silent-rk-blade-no-draw-backflip']},
]

stats = {'source': 'external:sts2fun + own (separate denominators)', 'input_manifest_sha256': MANIFEST_SHA,
         'formal_publication': 'pending', 'consumer_readback': 'pending',
         'external': {'version_mechanism_alignment': 'unknown; no pooling',
                      'versions': [], 'selected_representatives': [],
                      'combination_family': read(OUT / 'external-combination-audit.json')['per_version_c6'],
                      'matched_accuracy_fan': [], 'bosses_v111': []},
         'own': {'game_version': 'unknown', 'strata': read(OUT / 'own-c6-strata.json'),
                 'source_runs': list({a['run_id'] for a in actions}),
                 'own_supported_effects': 'mechanical observations and feasibility only; no causal outcome effect'},
         'formation': {'external_v111': next(x for x in external_timeline['rows'] if x['cluster'] == 6 and x['version'] == 'v0.111'),
                       'own_c6': read(OUT / 'own-c6-timeline.json')},
         'limitations': global_limits}
for v in versions:
    ar = next(x for x in external_arch['rows'] if x['cluster'] == 6 and x['version'] == v)
    tl = next(x for x in external_timeline['rows'] if x['cluster'] == 6 and x['version'] == v)
    stats['external']['versions'].append({'version': v, 'collected_at': '2026-10-21',
                                          'n': ar['n'], 'wins': ar['wins'], 'core_cards': ar['core_cards'],
                                          'formation': tl['formation'], 'sha256': ext_manifest['files']['timeline.json']['sha256']})
    stats['external']['matched_accuracy_fan'] += [x for x in external_combinations['rows']
                                                  if x['cluster'] == 6 and x['version'] == v
                                                  and x['items'] == ['card:ACCURACY', 'card:FAN_OF_KNIVES']]
for e in examples:
    stats['external']['selected_representatives'].append({'example': e['example'], 'version': e['version'],
                                                         'win': e['win'], 'nodes': len(e['timeline']),
                                                         'safe_projection_sha256': e['safe_projection_sha256'],
                                                         'quality': e['quality'],
                                                         'terminal_card_presence': {c: c in e['terminal_deck'] for c in ['ACCURACY', 'FAN_OF_KNIVES', 'BLADE_DANCE', 'AFTERIMAGE', 'CLOAK_AND_DAGGER', 'BACKFLIP']}})
stats['external']['bosses_v111'] = [{'boss': x['boss'], 'act': x['act'],
                                    'n': x['distinct_uploaded_runs'], 'passed_proxy': x['wins_proxy'],
                                    'unknown': x['unknown'], 'previous_hp_proxy': x['hp_previous_node_end_proxy'],
                                    'true_entry_snapshot_missing_n': x['snapshot']['true_entry_snapshot_missing_n']}
                                   for x in external_matchups['rows'] if x['cluster'] == 6 and x['version'] == 'v0.111']


def compact_action(a):
    b, c = a['before'], a['after']
    card = b['hand'][a['chosen']['card_index']]
    assert card['card_id'] == a['card_id'] and b['turn'] == c['turn'] == a['turn']
    assert c['player']['cards_played_this_turn'] - b['player']['cards_played_this_turn'] == 1
    return {'run_id': a['run_id'], 'floor': a['floor'], 'turn': a['turn'], 'card_id': a['card_id'],
            'decision_offset': a['decision_offset'], 'before_offset': a['before_offset'], 'after_offset': a['after_offset'],
            'rules_text': card['resolved_rules_text'], 'cost': card['energy_cost'],
            'hp': [b['player']['current_hp'], c['player']['current_hp']],
            'block': [b['player']['block'], c['player']['block']],
            'energy': [b['player']['energy'], c['player']['energy']],
            'hand_size': [len(b['hand']), len(c['hand'])],
            'shivs': [sum(x['card_id'] == 'SHIV' for x in h) for h in [b['hand'], c['hand']]],
            'shiv_texts': [[x['resolved_rules_text'] for x in h if x['card_id'] == 'SHIV'] for h in [b['hand'], c['hand']]],
            'powers': [[{'id': p['power_id'], 'amount': p['amount']} for p in pl['powers']] for pl in [b['player'], c['player']]],
            'enemies': [[{'id': e['enemy_id'], 'hp': e['current_hp'], 'block': e['block'], 'powers': e['powers'], 'intents': e['intents']} for e in f['enemies']] for f in [b, c]]}


offset_groups = {
    'fan_setup': [a['decision_offset'] for a in actions if a['card_id'] == 'FAN_OF_KNIVES'],
    'accuracy': [a['decision_offset'] for a in actions if a['card_id'] == 'ACCURACY'],
    'intangible': [749836173, 749837665, 749839140],
    'cloak_defense': [748413770, 748520452, 748561779],
    'afterimage_generation': [749120876, 749829597, 750287960],
    'no_draw': [749750194],
}
for key, offsets in offset_groups.items():
    stats[key] = {'independent_runs': len({by_offset[k]['run_id'] for k in offsets}),
                  'opportunities': len(offsets), 'source': 'own', 'game_version': 'unknown',
                  'ascension': 10, 'attempt_scope': 'retry_or_predicted_death',
                  'actions': [compact_action(by_offset[k]) for k in offsets],
                  'effects_causal': False}
stats['intangible']['counterexamples_other_phase'] = [compact_action(a) for a in actions if a['card_id'] == 'SHIV' and a['turn'] == 6]
stats['no_draw']['other_backflip_opportunities'] = [compact_action(a) for a in actions if a['card_id'] == 'BACKFLIP' and a['decision_offset'] != 749750194]
save('evidence-statistics.json', stats)

strategy_entries = []
for s in specs:
    sources = {e['source'] if e['type'] == 'external_aggregate' else 'own' for e in s['evidence']}
    source = next(iter(sources)) if len(sources) == 1 else 'mixed'
    assert len(s['text'].encode()) <= 1200, (s['key'], len(s['text'].encode()))
    strategy_entries.append({'id': s['id'], 'version': '1.0.0',
                             'trigger': {'question_types': s['questions'], 'acts': s['acts']},
                             'strategy': s['text'], 'evidence': s['evidence'], 'source': source,
                             'confidence': 0.35, **({'evidence_status': 'unassessed'} if source == 'mixed' else {}),
                             'playbook_id': PLAYBOOK, 'section': s['key'],
                             'formal_publication': 'pending', 'consumer_readback': 'pending',
                             'knowledge_disposition': s['disposition'], 'existing_experience_ids': s['experience']})
save('strategy-candidates.json', {'schema': 'brain-strategies-v1', 'character': 'silent', 'entries': strategy_entries})


def eq(field, value):
    return {'op': 'eq', 'field': field, 'value': value}


def positive(field):
    return {'op': 'gt', 'field': field, 'value': 0}


def both(*args):
    return {'op': 'and', 'args': list(args)}


def hand(cid):
    return {'op': 'any', 'field': 'player.hand', 'arg': both(eq('card.id', cid), eq('card.can_play', True))}


def enemy(cid, *conditions):
    return {'op': 'any', 'field': 'enemies.items',
            'arg': both(eq('enemy.id', cid), eq('enemy.alive', True), *conditions)}


rk_defs = [
    ('B2', specs[1]['rk'][0], 'FAN_OF_KNIVES', [749174603, 749266987, 749767963],
     'Fan setup creates knives before their actual attacks',
     [enemy('TEST_SUBJECT')]),
    ('B3', specs[2]['rk'][0], 'ACCURACY', [749176085, 749380353],
     'Accuracy changes held knife text before actual damage',
     [enemy('TEST_SUBJECT'), hand('SHIV')]),
    ('B3', specs[2]['rk'][1], 'SHIV', [749836173, 749837665, 749839140],
     'Intangible limited observed knives despite larger previews',
     [enemy('TEST_SUBJECT', positive('enemy.powers.INTANGIBLE_POWER'))]),
    ('B4', specs[3]['rk'][0], 'CLOAK_AND_DAGGER', [748413770, 748520452, 748561779],
     'Cloak provides block and knives with remaining defense gaps',
     [enemy('MECHA_KNIGHT')]),
    ('B5', specs[4]['rk'][0], 'BLADE_DANCE', [749120876, 749829597],
     'Generated knives have not yet earned play-trigger block',
     [enemy('TEST_SUBJECT'), positive('player.powers.AFTERIMAGE_POWER')]),
    ('B6', specs[5]['rk'][0], 'BACKFLIP', [749750194],
     'Block remains observed while draw is locked',
     [enemy('TEST_SUBJECT'), positive('player.powers.NO_DRAW_POWER'), hand('SHIV')]),
]
rk_entries, vocab, metrics, status, validation_cases = [], [], [], [], []
mapping = []
for s in specs:
    mapping.append({'context_id': s['key'], 'disposition': s['disposition'], 'strategy_id': s['id'],
                    'strategy_path': str(OUT / 'strategy-candidates.json'),
                    'strategy_pointer': '/entries/' + str(specs.index(s)),
                    'existing_experience_ids': s['experience'],
                    'existing_reflex_ids': {'B2': ['silent-r2-card-fan-of-knives'],
                                           'B3': ['silent-r2-card-accuracy', 'silent-r2-card-phantom-blades']}.get(s['key'], []),
                    'rk_ids': s['rk'], 'rk_path': str(OUT / 'rk-draft.json') if s['rk'] else None,
                    'paired_state': 'candidate_pair' if s['rk'] else 'waiting',
                    'paired_gap': s.get('gap'), 'formal_publication': 'pending', 'consumer_readback': 'pending',
                    'current_information': '仅现场持牌、牌文、费用、合法动作、敌人及能力；终局标签/未来牌组/胜负不进入触发。',
                    'source_refs': s['evidence'], 'source_relation': 'unassessed across own unknown version and external v0.111',
                    'limits': global_limits})
for key, rid, cid, offsets, label, conditions in rk_defs:
    s = next(s for s in specs if s['key'] == key)
    tag = rid + '-observed'
    observations = [dict(t) for t in {tuple(sorted({'run_id': by_offset[k]['run_id'],
                     'floor': by_offset[k]['floor'], 'turn': by_offset[k]['turn']}.items())) for k in offsets}]
    observations.sort(key=lambda x: (x['run_id'], x['floor'], x['turn']))
    sources = []
    for k in offsets:
        a = by_offset[k]
        for stream, off in [('decisions', k), ('states', a['before_offset']), ('states', a['after_offset'])]:
            ref = raw_refs[(stream, off)]
            path = str(Path(ref['copy']).relative_to(WT))
            source = {'source': 'own', 'path': path, 'sha256': ref['sha256'], 'game_version': 'unknown',
                      'retrieved_at': '2026-10-24', 'sample': {'runs': 1, 'players': None,
                      'selection': f'Frozen506 {OWN_RUN} A10; raw row {stream} offset={off}; includes retry observations; one run only'}}
            if source not in sources:
                sources.append(source)
    entry = {'schema': 'reflex-entry-v1', 'id': rid, 'version': 1, 'applies_to': 'combat_line',
             'predicate': both(eq('act', 3), hand(cid), *conditions,
                    {'op': 'any', 'field': 'option.actions', 'arg': both(eq('action.kind', 'card'), eq('card.id', cid))}),
             'signal': {'kind': 'tag', 'value': tag, 'unit': 'label'}, 'label_en': label,
             'evidence': {'observations': observations, 'n_support': 1, 'n_contradict': 0},
             'confidence': 0.35, 'scope': {'character': 'silent', 'ascensions': [10]},
             'directions': [], 'cores': [], 'combos': [], 'source_experience': s['experience'], 'sources': sources}
    rk_entries.append(entry)
    vocab.append({'id': tag, 'label_en': label, 'evidence': observations})
    metrics.append({'reflex_id': rid, 'n': 1, 'method': '单局动作机械观察；机会=' + str(len(offsets)) + '，SL/阶段不增独立局；无选择因果收益。',
                    'design': 'observational', 'effect_size': None, 'se': None,
                    'frequency': {'n': len(offsets), 'total': len(offsets)}, 'evidence': observations})
    status.append({'id': rid, 'formal_publication': 'pending', 'consumer_readback': 'pending',
                   'source': 'own', 'game_version': 'unknown', 'independent_runs': 1,
                   'observed_opportunities': len(offsets), 'descriptive_tag_only': True,
                   'current_condition_action': '仅对有原Plan的候选评估该实际动作；tag不是选择命令或收益。',
                   'stop_line': '当前敌人/能力、持牌、费用或动作未知则不匹配；禁止用未建能力、未来终局牌组或预览代替实伤。',
                   'replay': 'waiting: 原状态/单个已执行动作齐；缺完整合法原Plan、原逐候选结果矩阵及留出回放。',
                   'sibling_strategy': s['id'], 'source_offsets': offsets,
                   'external_direction_is_not_combat_mechanism_evidence': True})
    a = by_offset[offsets[0]]
    validation_cases.append({'id': rid, 'state': raw_refs[('states', a['before_offset'])]['copy'],
                              'state_sha256': raw_refs[('states', a['before_offset'])]['sha256'],
                              'decision': raw_refs[('decisions', offsets[0])]['copy'],
                              'decision_sha256': raw_refs[('decisions', offsets[0])]['sha256'],
                              'run_id': OWN_RUN, 'floor': a['floor'], 'turn': a['turn'],
                              'original_plan': None, 'candidate_outcomes': None})

covered_exp = sorted({e for s in specs for e in s['experience']})
draft = {'schema': 'v6-reflex-draft-v1', 'character': 'silent',
         'vocab': {'schema': 'reflex-vocab-v1', 'character': 'silent',
                   'dimensions': {'enemy_threat': [], 'card_role': [], 'line_tempo': vocab,
                                  'resource_cost': [], 'potion_category': []}},
         'reflex': {'schema': 'reflex-file-v1', 'character': 'silent', 'entries': rk_entries},
         'coverage': [{'experience_id': e, 'status': 'partial',
                       'reflex_ids': [x['id'] for x in rk_entries if e in x['source_experience']],
                       'directions': [], 'reason': '本批同情境合并/窄条件描述tag候选；原正式经验保留，不重算旧分母、不覆盖原机制。'} for e in covered_exp],
         'metrics': metrics, 'missing_fields': [], 'limitations': global_limits + [
             'Plan与完整逐候选结果缺口在replay-inventory.json逐项保留；此处missing_fields不虚构模型DTO已有字段缺失。']}
save('rk-draft.json', draft)
isolated = OUT / 'isolated-knowledge/characters/silent'
isolated.mkdir(parents=True, exist_ok=True)
for name, value in [('reflex.json', draft['reflex']), ('reflex-vocab.json', draft['vocab']),
                    ('strategy-entries.json', {'schema': 'brain-strategies-v1', 'character': 'silent', 'entries': strategy_entries})]:
    (isolated / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
save('validation-context.json', {'character': 'silent', 'experienceIds': covered_exp,
                                 'directionIds': [], 'runIds': list(read(ROOT / 'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json')['runs'][i]['run_id'] for i in range(506))})
save('publication-status.json', status)
save('scenario-mapping.json', mapping)
save('paired_output_map.json', [{'context_id': m['context_id'], 'strategy_id': m['strategy_id'],
                                'strategy_path': m['strategy_path'], 'rk_ids': m['rk_ids'], 'rk_path': m['rk_path'],
                                'state': m['paired_state'], 'reason': m['paired_gap'],
                                'shared_evidence': [s for s in m['source_refs'] if s['type'] == 'own'],
                                'additional_text_only_evidence': [s for s in m['source_refs'] if s['type'] == 'external_aggregate'],
                                'formal_publication': 'pending', 'consumer_readback': 'pending'} for m in mapping])
save('replay-inventory.json', {'cases': validation_cases, 'selection': 'Exploratory derivation examples; no held-out evaluation',
                              'legal_capture': False, 'plan_count': 0, 'outcome_matrix_count': 0,
                              'model_calls': 0, 'replay_count': 0, 'enable_authorized': False,
                              'gaps': ['原Plan不是已执行chosen动作；不从chosen伪造Plan。',
                                       '缺原逐候选同种子结果/模拟器SHA/独立留出；本批不启MC/Jev/A-B。']})

dedup = []
for s in specs:
    dedup.append({'context': s['key'], 'knowledge_disposition': s['disposition'],
                  'text_id': s['id'], 'new_consumer_projection_id': s['id'] not in old_strategy,
                  'existing_experience_ids': s['experience'],
                  'baseline_experience_rows': [old[e] for e in s['experience']],
                  'reason': '同机制情境更新，来源和边界分别保留；新消费者投影不计新增学习。' if s['disposition'] == 'update'
                            else '当前具体成型审查/抽牌锁情境未有同场景正式策略；保留相关旧经验作条件与边界。'})
save('dedup-audit.json', {'baseline_commit': BASE, 'contexts': dedup,
                         'unchanged_related_card_strategies': [e for e in old_strategy.values()
                          if any(k in e['id'] for k in ['blade','accuracy','fan','afterimage','backflip'])],
                         'unchanged_related_rk': [old_rk[e] for e in ['silent-r2-card-fan-of-knives','silent-r2-card-accuracy','silent-r2-card-phantom-blades']],
                         'byte_reuse_count': 0, 'aliases': 0, 'formal_files_changed': False})

page_inventory = []
for path in sorted((OUT / 'external-pages').glob('*.json')):
    page = read(path)
    page_inventory.append({'path': str(path), 'sha256': digest(path), 'offset': page['offset'],
                           'returned_pairs': len(page['rows']), 'model_read': True,
                           'examples': [{'example': e['example'], 'nodes_read': len(e['timeline'])} for p in page['rows'] for e in p['examples']]})
own_coverage = []
for run in ['9ZERN492CSHX', OWN_RUN]:
    counts = {}
    for section in ['snapshots', 'fights', 'questions', 'plans']:
        pages = sorted((OUT / 'own-pages').glob(f'{run}-{section}-*.json'))
        counts[section] = {'records': sum(len(read(p)['rows']) for p in pages), 'pages': len(pages),
                           'program_coverage': 'all', 'model_read': 'all projected fields',
                           'lossless_view': run == OWN_RUN}
    own_coverage.append({'run_id': run, 'sections': counts, 'game_version': 'unknown',
                         'ascension': 10, 'attempt_scope': 'no_retry_evidence' if run != OWN_RUN else 'retry_or_predicted_death'})
coverage = {'frozen_manifests': 3, 'frozen_artifacts': 129, 'frozen_total_leaves': 132,
            'own_shards_verified': 11, 'external_pairs': 10, 'external_trajectories': 20,
            'external_nodes': sum(len(e['timeline']) for e in examples), 'external_pages': page_inventory,
            'own_complete_games': own_coverage, 'own_projected_records': 512,
            'raw_rows_v2': len(raw_audit), 'raw_action_pairs_program_checked': len(actions),
            'raw_action_details_model_read': '精准12、刀扇4、刀舞3、后空翻12、SHIV7次结果摘要均打印阅读，另抽核斗篷6、余像3；六条rk原手牌/敌人/能力条件均抽核。未通读全部原始行的全字段。',
            'unread': ['外部其他簇的代表整局与原库未读。', '自有簇6其余六局只读分层聚合，未称完整通读。',
                       '506其余局只用于准入名单，不算完整复盘。', '未读取任何未冻结后续数据。'],
            'full_playbook_claim': '整局投影覆盖已核；只是候选剧本，不是已验收完整消费者/收益闭环。',
            'own_same_cluster_winner': 'missing: frozen c6 eight runs all lost',
            'raw_full_prompt_scope': 'questions是原投影；7份原奖励题额外核全选项，不能代表所有原生prompt已读。'}
save('coverage.json', coverage)
source_ledger = {'batch': BATCH, 'base': BASE, 'input_manifest_sha256': MANIFEST_SHA,
                 'source_commit': None, 'source_commit_note': '本批无源码提交；base仅派发身份。',
                 'external_source': PLAN, 'external': {'source': 'external:sts2fun',
                  'url': 'https://sts2.fun/static/sts2_public.db.zst', 'downloaded_at': '2026-10-21',
                  'database_sha256': ext_ev('timeline.json','unused',1,1)['dataset_sha256'],
                  'artifact_sha256': ext_manifest['files'], 'versions_pooled': False,
                  'mechanism_change_comparison': 'unknown', 'independent_players': None,
                  'license': 'FAQ未发现明确再分发许可；只写署名聚合与授权匿名摘录。'},
                 'own': {'scope_sha256': 'da915311f233ba0c350f5278a630a61fee1ab9540c520d407f6227e9c87e3478',
                         'manifest_sha256': 'a078c592dabf5909473f59967334ccd7ae24166f9f1e74e7140a062282e72e64',
                         'eligible_runs': 506, 'reviewed_full_runs': ['9ZERN492CSHX', OWN_RUN],
                         'game_version': 'unknown', 'raw_seek_audit': str(OUT / 'raw-seek-audit.json')},
                 'claims': [{'context': s['key'], 'source': strategy_entries[i]['source'],
                             'evidence': s['evidence'], 'own_action_offsets': offset_groups.get({'B1': 'formation', 'B2': 'fan_setup', 'B3': 'accuracy', 'B4': 'cloak_defense', 'B5': 'afterimage_generation', 'B6': 'no_draw'}[s['key']], []) + (offset_groups['intangible'] if s['key'] == 'B3' else []),
                             'formal_publication': 'pending', 'consumer_readback': 'pending',
                             'independent_own_support_runs': [OWN_RUN], 'limitations': global_limits} for i,s in enumerate(specs)],
                 'shared_ledger_written': False, 'formal_publication': 'pending', 'consumer_readback': 'pending'}
save('source-ledger.json', source_ledger)

counts = {'contexts': 6, 'real_new_contexts': 2, 'updated_existing_contexts': 4,
          'byte_identical_reuse': 0, 'aliases': 0, 'new_strategy_projection_ids': 6,
          'text_candidates': 6, 'rk_candidates': 6, 'paired_contexts': 5, 'paired_candidates': 6,
          'rk_waiting_contexts': 1, 'numeric_effect_rk': 0,
          'format_consumable_text_candidates': 6, 'format_consumable_rk_candidates': 6,
          'executable_rk_with_original_plan_and_replay': 0,
          'comparison_groups_both_at_least_100': 0,
          'external_descriptive_winner_checkpoint_n': 101,
          'external_matched_comparison_n_each': 63,
          'formal_publications': 0, 'production_consumer_readbacks': 0, 'natural_queries': 0,
          'actual_adoptions': 0, 'benefits_validated': 0, 'scientific_parent_closed': False,
          'previous_batch_real_new_contexts': 4, 'consecutive_zero_new_batches': 0}
save('decision-output-counts.json', counts)
playbook = '# 刀流整局候选剧本：已持牌分工与启动兑现\n\n'
playbook += f'身份：{PLAYBOOK}；batch={BATCH}；base={BASE}。formal_publication=pending；consumer_readback=pending。\n\n'
playbook += '刀语义由实际原牌文与动作核实：刀舞添加三张SHIV，精准使SHIV牌面增加4，刀扇使小刀攻击所有敌人并添四刀。簇6只定位这组代表，不定义所有刀流或成型条件。原输入三包132叶/11片SHA均同；全读20外部轨迹772节点及两自有局四section512条投影。\n\n'
playbook += '第一幕以实际牌文和当下可用功能比较，不追尚未出现的三件套。外部首幕赢家只有7/101记录三件套齐；两局外部赢家完全未终局保留精准、三局未保留刀舞，不能拿“赢家终局有牌”反推固定顺序。9ZERN492CSHX只有斗篷而未有精准/刀舞/刀扇，F7回血39→60后仍F8雕像败；此反例不支持安全血线。\n\n'
playbook += '第二幕同时核输出与可用防护/过牌。外部赢家正block副本代理从首幕8.09到次幕9.63（各101）只供方向对照，不设目标张数。9R916WW0V65N首幕主要是免费打击/苦无/步法/余像，F29才买斗篷，F33才拿刀扇，不能用最终簇倒称全程刀舞核心。外部赢家bd278在N40移除刀舞后仍胜，其他候选用途不可按标签否决。\n\n'
playbook += '第三幕分别预算能力费、已建增益、生成刀、实出刀与实际敌人阶段。9R末段F42机甲68→37且两药耗尽，F43制造机37→1，F44回23、F45斧头23→3；F46补三药、F47回25，F48首预判必死后二次重载到第三试过，最终12血空药进F49女王＋火炬头，六试败。F48净损13只是合并记录视图，不是首试成本；药水重复恢复不记新获得。\n\n'
playbook += 'Boss只写当前已显示能力下的窄条件：实验体无实体时9伤三刀实际各1，另核余像挡；不可抽牌时后空翻仍可提供已见14＋1挡而不抽牌。当前实际敌人与地图目标分别读；外部Boss延续率和前节点HP是代理，没有逐回合机制，不产出其余Boss固定对策。\n\n'
for s in specs:
    playbook += f'## {s["key"]} {s["id"]}\n\n{s["text"]}\n\n'
    playbook += f'处置={s["disposition"]}；既有经验={", ".join(s["experience"])}；'
    playbook += 'formal_publication=pending；consumer_readback=pending。\n\n'
    playbook += ('rk：' + ', '.join(s['rk']) if s['rk'] else 'rk waiting：' + s['gap']) + '\n\n'
playbook += '## 适用与停线\n\n' + '\n'.join('- ' + x for x in global_limits) + '\n'
playbook += '\n原完整统计、反向匹配、输入SHA与逐情境映射见同目录evidence-statistics.json、source-ledger.json、scenario-mapping.json和paired_output_map.json。完整程序保存不替代模型阅读：覆盖分账见coverage.json。\n'
(OUT / 'playbook.md').write_text(playbook)
print(json.dumps({'counts': counts, 'strategy_bytes': {e['id']: len(e['strategy'].encode()) for e in strategy_entries},
                  'rk_entries': len(rk_entries), 'covered_experience_ids': covered_exp}, ensure_ascii=False))
