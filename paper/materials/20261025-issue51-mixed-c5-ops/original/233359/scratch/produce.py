"""Assemble this frozen, descriptive batch; never write a production library."""
import collections
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
RUN = OUT.parent
BATCH = '20261024-233359-strategy-proposal'
PLAN = 'issue51-remaining-build-003-20261024-r56-stock'
BASE = 'f6361397f0d96b8dd20d9e108e0b69261396dfbd'
MANIFEST_SHA = '3f34a874aa09f82bc6a0365147a8bf5008dd3749402fb122eb04bfba834bcca1'
URL = 'https://sts2.fun/static/sts2_public.db.zst'
DATA_SHA = '1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5'
REP_SHA = 'dfde8d6ec66f58fca63ca30d45d86d47c2d822e807e9f77f65cb3c4c65268eda'
REP_PATH = 'knowledge/external/sts2fun/builds-v1/representative-timelines.json'
LICENSE = 'No explicit dataset redistribution license found on public FAQ; aggregate statistics with attribution only; no raw redistribution.'


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def own_rows(run, section):
    return [row for path in sorted((OUT / 'own-pages').glob(f'{run}-{section}-*'))
            for row in json.loads(path.read_text())['rows']]


old_strategy_path = ROOT / 'knowledge/characters/silent/strategy-entries.json'
old_rk_path = ROOT / 'knowledge/characters/silent/reflex.json'
old_strategies = {e['id']: e for e in json.loads(old_strategy_path.read_text())['entries']}
old_rks = {e['id']: e for e in json.loads(old_rk_path.read_text())['entries']}
examples = [e for n in [0, 3, 5, 7, 9]
            for e in json.loads((OUT / f'external-pages/pair-{n:02d}.json').read_text())['rows'][0]['examples']]
assert len(examples) == 10 and sum(e['win'] for e in examples) == 5
assert len({e['example'] for e in examples}) == 10
raw_audit = json.loads((OUT / 'raw-seek-audit.json').read_text())
scope = json.loads((ROOT / 'paper/materials/20261024-issue56-stock-ops/contracts/own-506-scope.json').read_text())
allowed_runs = {r['run_id'] if isinstance(r, dict) else r for r in scope['runs']}

# Each tuple is one decision context, not a split of a generic sentence.
specs = [
    ('c5-1', 'HAZE', 'ATP5MCMJDMQY', 2, 'reward/card',
     'silent-brain-haze-external-prefix-context', None,
     '仅有初始牌组时，迷雾与蛇咬/猎杀者按群体控制、单体施毒和直接攻击分别比较。原牌文均2费：迷雾全体4毒1虚弱，蛇咬保留7毒，猎杀者15伤及下回合抽2；不能只按毒层数排先后。ATP5MCMJDMQY F2一次机会拿迷雾、后继入组；F3战52→49，F17仍终败。',
     '范围：Silent A10、幕1、现场有该备选且牌文同；自有版本unknown，1局1机会，无选择因果收益。',
     'Compare group poison and Weak with retained single target poison', 1),
    ('c5-2', 'MIRAGE', 'ATP5MCMJDMQY', 3, 'reward/card',
     'silent-brain-c5-mirage-needs-established-poison', None,
     '当前只记录到迷雾这一施毒来源时，蜃景应与切割、独门技术的即时用途比较，先核能否在需要挡的回合建立毒。原文蜃景1费、按全体毒层总和给挡并消耗；切割0费6伤。ATP5MCMJDMQY F3一次机会选切割，蜃景未拿；不能把牌组有迷雾算成战中已有毒。F5两敌战49→46，终局仍败，不证明切割优于蜃景。',
     '范围：Silent A10、幕1奖励且牌文同；此前快照为牌组代理，版本unknown、1局1机会，无战中起手或伤害反事实。',
     'Check established poison before valuing Mirage block', 1),
    ('c5-3', 'BUBBLE_BUBBLE', 'ATP5MCMJDMQY', 15, 'selection/add',
     'silent-brain-bubble-bubble-external-prefix-context', None,
     '补充当下条件：已有迷雾+与弹跳药瓶+时，咕嘟冒泡与本题直接防护/过牌比较；原文1费、仅敌方已有中毒才再给9毒，不把它当无条件起毒。ATP5MCMJDMQY F15一次五选一选咕嘟冒泡，后继入组；F17带该牌53血进场仍实际败。',
     '本补充范围：Silent A10、幕1实际提供该牌的奖励/事件选牌；自有版本unknown，1局1机会；不把旧v0.107关联移作v0.111效果。',
     'Require an existing poison source before conditional poison growth', 1),
    ('c5-4', 'OUTBREAK', 'FZT053H9PSC5', 17, 'reward/card',
     'silent-brain-c5-outbreak-immediate-trigger-budget', None,
     '已有触媒、致命毒药+、带毒刺击+及偏折+时，毒性爆发+可与涂毒、钢铁风暴+比较直接群体施毒/立即触发与另一种启动代价。原文3费全体12毒并立即触发；涂毒2费须攻击造成未格挡伤害才施1毒。FZT053H9PSC5 F17一次奖励选择前者，F19两敌战60→60、2回合；后续F23仍51→31，不能从赢家或一次零损证明固定优先级。',
     '范围：Silent A10、幕1末奖励/幕2构筑且现场牌文同；此前牌组为代理、版本unknown、1局1机会；实际出牌次序和单牌贡献未核。',
     'Compare immediate group poison with setup cost and available defense', 1),
    ('c5-5', 'BLUR', 'FZT053H9PSC5', 28, 'reward/card',
     'silent-brain-blur-external-prefix-context', None,
     '补充幕2：已有灵动步法+、偏折+及施毒牌时，残影+与再添带毒刺击/铭记死亡+比较跨回合防护用途；原文1费8挡、下一回合开始挡不消失，不等于以后每回合都会保挡。FZT053H9PSC5 F28一次机会拿残影+，F30战70→70、F31战70→63；只有1局，不能把零损归这张牌。',
     '本补充范围：Silent A10、幕2奖励且现场牌文同；自有版本unknown，此前牌组代理；旧幕1负关联保留，无新收益估计。',
     'Compare retaining block with adding another damage card', 2),
    ('c5-6', 'DODGE_AND_ROLL', 'FZT053H9PSC5', 19, 'reward/card',
     'silent-brain-lane-b-block-time-and-shiv', 'silent-rk-lane-b-block-time-and-shiv',
     '补充已有触媒/毒性爆发+的幕2情境：闪躲翻滚+1费本回合6挡、下回合6挡，与同屏2费冲刺10挡10伤/猎杀者+20伤抽2分别核费用和时间。FZT053H9PSC5 F19一次机会选翻滚，后继入组；下一战60→51，不能将两次6挡全记即时或认为已覆盖高费启动。',
     '本补充范围：Silent A10、幕2且现场牌文同；自有版本unknown、1局1机会；旧比较及稀疏限制原样保留。',
     'Compare current block with delayed block and generated cards', 2),
    ('c5-7', 'AFTERIMAGE', 'FZT053H9PSC5', 39, 'reward/card',
     'silent-brain-lane-b-burst-versus-setup', 'silent-rk-lane-b-burst-versus-setup',
     '补充已有早有准备+/杂技+及施毒牌时，余像+与刀扇+/涂毒+比较启动和触发来源。原文余像+1费固有、每打牌得1挡；另两项各2费、分别改小刀并添5刀/未格挡攻击施2毒。FZT053H9PSC5 F39一次选余像+，F42战70→64；不能把未来连打当当前已得挡，固有也不等于已建立。',
     '本补充范围：Silent A10、幕3奖励且牌文同；此前牌组代理、自有版本unknown、1局1机会；无单牌收益或固定拿牌排序。',
     'Compare one use resources with recurring setup', 3),
]

limits = [
    '外部为自选上传的观察数据，玩家标识未读，独立玩家数与玩家间依赖未知；不声称因果收益。',
    '五对代表按早期相近代理选择，不是随机样本或同起点反事实；终局持牌仅事后关联，不能触发当前策略。',
    '自有A10/no_retry_evidence与重试或预判必死、其他进阶分别统计；自有版本unknown不补为v0.111。',
    '自身牌文/原选择可核，完整当前牌组采用该题前最近快照代理；实际手牌、启动回合与不拿反事实未核。',
    '无跨版本机制不变对照，五个版本各自分账；正block牌副本只是防护代理，非安全阈值。',
    '每项本批自有1局1机会，全部比较未达双方100；旧达标比较只保留，不计本批新增达标。',
]
strategies = []
rks = []
mapping = []
ledger = []
(OUT / 'candidates').mkdir(exist_ok=True)
for key, card, run, floor, label, sid, old_rkid, body, scope_text, english, act in specs:
    assert run in allowed_runs
    raw_path = OUT / f'raw/{run}-F{floor}-{label.replace("/", "-")}.json'
    raw = json.loads(raw_path.read_text())
    q = next(x for x in own_rows(run, 'questions') if x['floor'] == floor and x['label'] == label)
    prior = [x for x in own_rows(run, 'snapshots') if x['ts'] <= q['ts']]
    prior = max(prior, key=lambda x: (x['ts'], x['off']))
    # The choice fingerprint supplies exact HP; deck comes from a prior projection.
    fp = json.loads(raw['fingerprint'])
    after = next(x for x in own_rows(run, 'snapshots')
                 if x['ts'] > q['ts'] and card in [c.rstrip('+') for c in x['deck']]) if card != 'MIRAGE' else None
    counts = {str(win): sum(card in e['terminal_deck'] for e in examples if e['win'] == win) for win in [1, 0]}
    ext = []
    for win in [1, 0]:
        ext.append({
            'type': 'external_aggregate', 'source': 'external:sts2fun', 'url': URL,
            'version': 'v0.111', 'dataset_sha256': DATA_SHA, 'downloaded_at': '2026-10-21',
            'license': LICENSE,
            'filters': {'character': 'silent', 'ascension': 10,
                        'criteria': f'valid, singleplayer, non-abandoned, no modifiers; frozen final-deck cluster=5; pairs 0,3,5,7,9; outcome={win}; terminal card={card}; selected representative subset, not current state'},
            'statistic': {'name': 'selected_representative_terminal_card_presence_context_only',
                          'value': counts[str(win)] / 5, 'unit': 'proportion'},
            'denominator': {'unit': 'runs', 'n': 5}, 'design': 'observational',
            'limitations': limits[:3], 'ref': REP_PATH + f'#cluster=5,pairs=0,3,5,7,9,outcome={win};input_sha256={REP_SHA}',
            'role': 'support' if win else 'contradict',
        })
    own_ev = {'type': 'own', 'run': run, 'floor': floor,
              'ref': str(raw_path.relative_to(ROOT)) + '#questions.pick.criteria;completed action; SHA256=' + sha(raw_path), 'role': 'support'}
    old = old_strategies.get(sid)
    if old:
        entry = copy.deepcopy(old)
        entry['version'] = old['version'] + '-c5-r1'
        entry['strategy'] += '\n' + body + '\n' + scope_text
        if act not in entry['trigger'].get('acts', []):
            entry['trigger']['acts'] = sorted(set(entry['trigger'].get('acts', [])) | {act})
        entry['evidence'] += [own_ev] + ext
        entry['source'] = 'mixed'
        entry['evidence_status'] = 'conflict'
        # Preserve all original evidence, confidence and qualifiers.
        assert entry['confidence'] == old['confidence']
    else:
        entry = {'id': sid, 'version': '2026-10-24-c5-r1',
                 'trigger': {'question_types': ['card_reward'], 'acts': [act]},
                 'strategy': body + '\n' + scope_text, 'evidence': [own_ev] + ext,
                 'source': 'mixed', 'confidence': 0.25, 'evidence_status': 'conflict'}
    entry['formal_publication'] = 'pending'
    entry['consumer_readback'] = 'pending'
    if card == 'OUTBREAK':
        entry['trigger']['acts'] = [1, 2]
    assert len(entry['strategy'].encode()) <= 1200, (sid, len(entry['strategy'].encode()))
    assert len(entry['evidence']) <= 20
    rkid = old_rkid or 'silent-rk-c5-' + key
    rk = copy.deepcopy(old_rks[old_rkid]) if old_rkid else {
        'schema': 'reflex-entry-v1', 'id': rkid, 'version': 1, 'applies_to': 'card_pick',
        'predicate': {'op': 'and', 'args': [
            {'op': 'eq', 'field': 'card.id', 'value': card},
            {'op': 'eq', 'field': 'act', 'value': act}]},
        'signal': {'kind': 'tag', 'value': rkid + '-review', 'unit': 'label'},
        'label_en': english, 'evidence': {'observations': [], 'n_support': 0, 'n_contradict': 0},
        'confidence': 0.25, 'scope': {'character': 'silent', 'ascensions': [10]},
        'directions': [], 'cores': [], 'combos': [], 'source_experience': [], 'sources': [],
    }
    if old_rkid:
        rk['version'] += 1
    if card == 'OUTBREAK':
        rk['predicate']['args'][1] = {'op': 'or', 'args': [
            {'op': 'eq', 'field': 'act', 'value': 1},
            {'op': 'eq', 'field': 'act', 'value': 2}]}
    obs = {'run_id': run, 'floor': floor}
    if obs not in rk['evidence']['observations']:
        rk['evidence']['observations'].append(obs)
        rk['evidence']['n_support'] += 1
    if sid not in rk['source_experience']:
        rk['source_experience'].append(sid)
    rk['sources'].extend([
        {'source': 'own', 'path': str(raw_path.relative_to(ROOT)), 'sha256': sha(raw_path),
         'game_version': 'unknown', 'retrieved_at': '2026-10-24',
         'sample': {'runs': 1, 'players': None, 'selection': f'A10/no_retry_evidence; {run} F{floor}; 1 choice opportunity, card text and completed choice only; no estimated advantage'}},
        {'source': 'external:sts2fun', 'path': REP_PATH, 'sha256': REP_SHA,
         'game_version': 'v0.111', 'retrieved_at': '2026-10-21', 'url': URL, 'license': LICENSE,
         'sample': {'runs': 10, 'players': None,
                    'selection': f'five selected representative pairs 0,3,5,7,9; terminal {card}: winners {counts["1"]}/5, failures {counts["0"]}/5; descriptive, not an effect or trigger'}},
    ])
    candidate = {
        'id': key, 'candidate_card_id': card, 'formal_publication': 'pending', 'consumer_readback': 'pending',
        'source': 'mixed', 'own_support_runs': [run], 'strategy_entry': entry, 'rk_entry': rk,
        'disposition': 'same-id-update' if old else 'new-context',
        'rk_disposition': 'same-id-update' if old_rkid else 'new-description-tag',
        'current_information': {'exact_hp': fp['hp'], 'max_hp': fp['maxHp'],
                                'prior_deck_proxy': prior, 'card_text_and_options': str(raw_path.relative_to(ROOT)),
                                'future_facts_used_as_trigger': False},
        'observed_followup': after, 'external_terminal_counts': counts,
        'opportunity_denominator': {'own_independent_runs': 1, 'own_choice_opportunities': 1,
                                    'external_winner_uploads': 5, 'external_failure_uploads': 5,
                                    'independent_players': None, 'pooled': False},
        'comparative_effect': None, 'both_groups_at_least_100_new': False,
        'limits': limits, 'production_replay': 'pending; no captured original consumer context',
        'old_content': copy.deepcopy(old), 'old_content_sha256': hashlib.sha256(json.dumps(old, ensure_ascii=False, sort_keys=True).encode()).hexdigest() if old else None,
    }
    path = OUT / f'candidates/{key}.json'
    write(path, candidate)
    mapping.append({'context_id': key, 'strategy_id': sid, 'rk_id': rkid, 'path': str(path),
                    'strategy_disposition': candidate['disposition'], 'rk_disposition': candidate['rk_disposition'],
                    'own_support_runs': [run], 'new_both100': False,
                    'formal_publication': 'pending', 'consumer_readback': 'pending'})
    ledger.append({'context_id': key, 'source': 'mixed', 'own_version': 'unknown', 'external_version': 'v0.111',
                   'external_downloaded_at': '2026-10-21', 'input_manifest_sha256': MANIFEST_SHA,
                   'external_projection_sha256': REP_SHA, 'own_original_row': next(x for x in raw_audit if x['path'] == str(raw_path)),
                   'own_independent_runs': [run], 'own_choice_opportunities': 1,
                   'external_by_outcome': {'winner': {'n': 5, 'present': counts['1']}, 'failure': {'n': 5, 'present': counts['0']}},
                   'independent_players': None, 'versions_pooled': False, 'mechanism_change_comparison': 'unknown',
                   'formal_publication': 'pending', 'consumer_readback': 'pending', 'limitations': limits})
    strategies.append(entry)
    rks.append(rk)

write(OUT / 'strategy-entries.json', {'schema': 'brain-strategies-v1', 'character': 'silent', 'entries': strategies})
write(OUT / 'reflex.json', {'schema': 'reflex-file-v1', 'character': 'silent', 'entries': rks})
write(OUT / 'scenario-mapping.json', mapping)
write(OUT / 'source-ledger.json', ledger)
write(OUT / 'dedup-audit.json', {
    'published_strategy_library': {'path': str(old_strategy_path), 'sha256': sha(old_strategy_path), 'entries': len(old_strategies)},
    'published_rk_library': {'path': str(old_rk_path), 'sha256': sha(old_rk_path), 'entries': len(old_rks)},
    'basis': 'Only published libraries used for deduplication. Old candidate/statistical rows do not count as new contexts.',
    'mapping': mapping, 'confidence_changes': [],
    'status_changes': [{'id': e['id'], 'old': old_strategies[e['id']].get('evidence_status'), 'new': e['evidence_status'],
                        'reason': 'new selected external failure counterexamples explicitly retained; old evidence kept'}
                       for e in strategies if e['id'] in old_strategies and old_strategies[e['id']].get('evidence_status') != e['evidence_status']],
})

versions = json.loads((OUT / 'archetypes-c5.json').read_text())
comb_rows = json.loads((ROOT / 'knowledge/external/sts2fun/builds-v1/combinations.json').read_text())['rows']
comb_rows = [r for r in comb_rows if r['cluster'] == 5 and sorted(r['items']) == ['card:ACCELERANT', 'card:BUBBLE_BUBBLE']]
write(OUT / 'version-ledger.json', {'versions_pooled': False, 'mechanism_equivalence': 'unknown',
                                   'external_cluster5': versions, 'conditional_growth_combination': comb_rows,
                                   'original_global_cohorts_with_build_denominators': json.loads((ROOT / 'knowledge/external/sts2fun/builds-v1/manifest.json').read_text())['cohorts'],
                                   'within_cluster_per_build_denominators': 'not supplied; do not substitute global cohort denominators',
                                   'own_cluster5_strata': json.loads((OUT / 'own-archetypes-c5.json').read_text()),
                                   'limits': limits})
coverage = {
    'external_program_saved_pairs': list(range(10)), 'external_model_fully_read_pairs': [0, 3, 5, 7, 9],
    'external_model_complete_trajectories': 10,
    'external_saved_but_model_unread_pairs_excluded_from_claims': [1, 2, 4, 6, 8],
    'external_selected_node_counts': [{'example': e['example'], 'win': e['win'], 'nodes': len(e['timeline']),
                                       'safe_projection_sha256': e['safe_projection_sha256']} for e in examples],
    'own_model_reading': {run: {sec: len(own_rows(run, sec)) for sec in ['snapshots', 'fights', 'questions', 'plans']}
                         for run in ['FZT053H9PSC5', 'ATP5MCMJDMQY']},
    'reading_method': 'All selected external nodes read as complete arrays. Own semantic fields read in delta view; repeated fields inherited, deck order omitted but multiset complete; full unabridged bounded pages retained. Raw offsets/timestamps program verified and eight exact referenced decision rows SHA checked. No claim to reading all original native prompts or 17GB state stream.',
    'own_plan_gap': 'FZT053H9PSC5 all 61 projected plan records have null semantic plan fields; route text is available in question rationales. Intended route and simulated resource estimates are not actual outcomes.',
    'outcome_gap': 'FZT053H9PSC5 final_victory=true and terminal game-over hp=0; last fight post_hp=26. Do not interpret the game-over HP as actual combat death or invent terminal mechanics.',
    'all_other_own_representatives': 'unread; only cohort aggregates retained',
    'raw_database_or_external_identifiers_read': False, 'parquet_queries': 0,
    'trigger_future_leakage': False, 'archetype_trigger_added': False,
}
write(OUT / 'coverage.json', coverage)
counts = {'new_decision_contexts': 2, 'same_id_strategy_updates': 5,
          'strategy_candidates_total': 7, 'new_rk_tags': 5, 'same_id_rk_updates': 2,
          'rk_candidates_total': 7, 'new_paired_contexts': 2, 'updated_paired_contexts': 5,
          'byte_identical_reuse': 0, 'aliases': 0, 'new_comparisons_both_groups_at_least_100': 0,
          'descriptive_playbook_candidates': 1, 'causally_validated_playbooks': 0,
          'formal_published_this_batch': 0, 'production_consumer_readback_this_batch': 0,
          'natural_queries_this_batch': 0, 'actual_adoption_this_batch': 0, 'benefit_estimates': 0,
          'scientific_parent_closed': False}
write(OUT / 'decision-output-counts.json', counts)
print(json.dumps({'counts': counts, 'strategy_text_bytes': {e['id']: len(e['strategy'].encode()) for e in strategies},
                  'external_selected_nodes': sum(len(e['timeline']) for e in examples)}, ensure_ascii=False, indent=2))
