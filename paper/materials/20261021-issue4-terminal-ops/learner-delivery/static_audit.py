"""Bounded original-byte verification and static comparison; never runs a simulator."""
import collections
import csv
import gzip
import hashlib
import json
import pathlib
import re
import statistics
import subprocess

ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
OUT = pathlib.Path(__file__).resolve().parent
AUDIT = ROOT / 'paper/materials/2026-10-21-v6-elite-bias-audit'
MANIFEST = ROOT / '.artifacts/ops-github-issues-adoption-20261021/issue-4-inputs.json'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def load(p):
    return json.load(gzip.open(p, 'rt') if str(p).endswith('.gz') else open(p))


def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


def avg(values):
    return statistics.mean(values) if values else None


manifest = load(MANIFEST)
verified = []
for entry in manifest['files']:
    p = pathlib.Path(entry['path'])
    b = p.read_bytes()
    actual = {'bytes': len(b), 'sha256': sha(b)}
    verified.append({**entry, 'actual': actual, 'matched': actual['bytes'] == entry['bytes'] and actual['sha256'] == entry['sha256']})
assert all(e['matched'] for e in verified)
save('input-verification.json', {'input': str(MANIFEST), 'input_sha256': sha(MANIFEST.read_bytes()), 'files': verified})
rows = load(AUDIT / 'prepared-inputs.json.gz')
original_inputs = {r['id']: r for r in load(AUDIT / 'inputs.json.gz')}
frames = load(AUDIT / 'compact-frames.json')
actions = load(AUDIT / 'actions.json')
cohort = load(AUDIT / 'cohort.json')
configs = load(AUDIT / 'configs.json')
csvrows = {r['id']: r for r in csv.DictReader(open(AUDIT / 'per-fight.csv'))}
replays = {r['id']: load(AUDIT / 'replay' / (r['id'] + '.json')) for r in rows}
assert set(csvrows) == set(replays) == set(original_inputs)

# Read only exact indexed regions; no shared-log iteration or database access.
raw_index = []
states = {}
with open(ROOT / 'logs/states.jsonl', 'rb') as handle:
    for f in frames:
        handle.seek(f['off'])
        b = handle.read(f['len'])
        assert len(b) == f['len'] and b.endswith(b'\n')
        record = json.loads(b)
        state = record['state']
        assert state['run_id'] == f['run_id']
        assert state.get('turn') == f['turn'] and state.get('screen') == f['screen']
        assert (state.get('run') or {}).get('current_hp') == f['hp']
        if f['is_combat']:
            player = (state.get('combat') or {}).get('player') or {}
            assert player.get('current_hp') == f['player_hp']
            assert player.get('energy') == f['energy']
            assert player.get('cards_played_this_turn') == f['cards_played']
        states[f['off']] = state
        raw_index.append({'kind': 'state', 'run_id': f['run_id'], 'fight_no': f['fight_no'], 'turn': f['turn'], 'path': 'logs/states.jsonl', 'offset': f['off'], 'bytes': len(b), 'sha256': sha(b), 'timestamp': record['ts']})
index_by_off = {e['offset']: e for e in raw_index}
for row in rows:
    for field, state_field in [('state_source', 'state'), ('ready_source', 'ready_state')]:
        ref = row[field]
        assert index_by_off[ref['offset']]['sha256'] == ref['sha256']
        assert index_by_off[ref['offset']]['bytes'] == ref['bytes']
        assert {k:v for k,v in states[ref['offset']].items() if k != 'agent_view'} == row[state_field]
    assert all(row[k] == v for k, v in original_inputs[row['id']].items())
decision_records = {}
with open(ROOT / 'logs/decisions.jsonl', 'rb') as handle:
    for a in actions:
        handle.seek(a['off'])
        b = handle.readline(262144)
        assert b.endswith(b'\n')
        record = json.loads(b)
        assert record['run_id'] == a['run_id'] and record['turn'] == a['turn']
        chosen = record.get('chosen') or {}
        assert chosen.get('action') == a['action']
        decision_records[a['off']] = record
        raw_index.append({'kind': 'decision', 'run_id': a['run_id'], 'fight_no': a['fight_no'], 'turn': a['turn'], 'path': 'logs/decisions.jsonl', 'offset': a['off'], 'bytes': len(b), 'sha256': sha(b), 'timestamp': record['ts']})
with open(ROOT / 'logs/sl-attempts.jsonl', 'rb') as handle:
    for sl in load(AUDIT / 'sl-attempts.json'):
        handle.seek(sl['off'])
        b = handle.read(sl['len'])
        record = json.loads(b)
        assert record['run_id'] == sl['run_id']
        raw_index.append({'kind': 'sl', 'run_id': sl['run_id'], 'floor': sl['floor'], 'turn': sl['turns'], 'path': 'logs/sl-attempts.jsonl', 'offset': sl['off'], 'bytes': len(b), 'sha256': sha(b)})
with open(OUT / 'source-index.jsonl', 'w') as handle:
    for ref in raw_index:
        handle.write(json.dumps(ref, ensure_ascii=False) + '\n')

# SHA inventory gives a frozen working tree, not necessarily all bytes in HEAD.
source = load(AUDIT / 'source-input.json')
specs = [source['head'] + ':' + e['path'] for e in source['files']]
batch = subprocess.run(['git', 'cat-file', '--batch'], input=('\n'.join(specs) + '\n').encode(), stdout=subprocess.PIPE, check=True).stdout
pos = 0
source_check = []
source_bytes = {}
for e in source['files']:
    end = batch.index(b'\n', pos)
    header = batch[pos:end].decode()
    pos = end + 1
    if header.endswith(' missing'):
        source_check.append({**e, 'git_status': 'missing'})
        continue
    blob, typ, length = header.split()
    b = batch[pos:pos + int(length)]
    pos += int(length) + 1
    same = sha(b) == e['sha256']
    source_check.append({**e, 'blob': blob, 'git_sha256': sha(b), 'git_status': 'matched' if same else 'different_working_bytes_unknown'})
    if same:
        source_bytes[e['path']] = b
save('source-snapshot-check.json', {'head': source['head'], 'files': source_check})
excerpt_terms = {
    'agent/src/sim/boss-start.ts': ['FIGHT_START_RELICS', 'isRandomPotion', 'const potions =', 'options: { drawFirst', 'const byTurn', 'const onTurn1', 'const fightsAt', 'OUR_DEBUFFS'],
    'agent/tools/boss-sim/backtest-board.ts': ['hasPiles', 'piles: hasPiles', 'const at = left.findIndex'],
    'agent/src/v6/card-results-input.ts': ['prepareElite', 'const models ='],
    'agent/src/knowledge/monster-db.ts': ['function mergeMonsterRecords', 'encounters: isObject(records'],
    'agent/tools/logdb/extract.py': ['def parse_state_line'],
    'agent/src/sim/boss-sim.ts': ['hpLoss: died', 'incomingByTurn: records', 'blockByTurn: records', 'lossByTurn: records', 'dmgByTurn: records'],
    'agent/src/reflex/rollout.ts': ['function sampledDrawPile', 'if (!top || top.length', 'first = policy', 'const drawing = fullFight'],
}
excerpt = ['# 冻结源码有界对照', '', '只用于解释测量/表示；不执行源码，不由代码断言游戏机制。', '']
for path, terms in excerpt_terms.items():
    b = source_bytes.get(path)
    if b is None:
        # The backtest helper is outside the original 771-file inventory.
        b = subprocess.check_output(['git', 'show', source['head'] + ':' + path])
        label = 'Git HEAD 对照，原运行时清单未覆盖此 helper；不是额外冻结证明'
    else:
        label = '原清单 SHA 与 Git blob 一致'
    lines = b.decode().splitlines()
    ix = set()
    for i, line in enumerate(lines):
        if any(term in line for term in terms):
            ix.update(range(max(0, i - 2), min(len(lines), i + 6)))
    excerpt += [f'## {path}', '', f'{label}；SHA256 `{sha(b)}`；commit `{source["head"]}`。', '', '```text']
    excerpt += [f'{i + 1}: {lines[i]}' for i in sorted(ix)]
    excerpt += ['```', '']
(OUT / 'source-excerpts.md').write_text('\n'.join(excerpt))

config_by_run = collections.defaultdict(list)
for c in configs:
    config_by_run[c['record']['run_id']].append(c)
run_inventory = []
for r in cohort:
    brain = json.loads(r['brain_source'])
    cc = config_by_run[r['run_id']]
    assert cc and all(c['record']['construction']['architecture'] == 'V5' for c in cc)
    assert r['character'] == 'SILENT' and r['ascension'] == '10'
    run_inventory.append({'run_id': r['run_id'], 'start_ts': r['start_ts'], 'end_ts': r['end_ts'], 'character': 'silent', 'ascension': 10,
        'elite_fights': sum(x['fight']['run_id'] == r['run_id'] for x in rows), 'cohort_code_versions': r['code_versions_all'],
        'brain_source': brain['source'], 'brain_eligible': brain['eligible'], 'unresolved_questions': brain['unresolved_questions'],
        'configs': [{'sha256': c['sha256'], 'ts': c['record']['ts'], 'restart': c['record']['restart'], 'commit': c['record']['code']['commit'],
            'dirty': c['record']['code']['dirty'], 'dirty_files': c['record']['code']['dirty_files'], 'architecture': c['record']['construction']['architecture']} for c in cc],
        'config_original_offset': None, 'historical_dynamic_knowledge_bytes': 'unknown', 'status': 'no_elite_retained' if not any(x['fight']['run_id'] == r['run_id'] for x in rows) else 'inventoried'})
save('run-inventory.json', run_inventory)


def metric(r, variant, key):
    return r[variant].get('metrics', {}).get('metrics', {}).get(key, {}).get('mean')


def incoming(solver):
    return sum(a['damage'] * a['hits'] for e in solver['enemies'] for a in e.get('attacks', []))


def state_projection(s):
    c = s.get('combat') or {}
    return {'hp': (c.get('player') or {}).get('current_hp', (s.get('run') or {}).get('current_hp')), 'block': (c.get('player') or {}).get('block'),
        'energy': (c.get('player') or {}).get('energy'), 'hand': [{'id': x['card_id'], 'upgraded': x.get('upgraded')} for x in c.get('hand', [])],
        'powers': (c.get('player') or {}).get('powers'), 'enemies': [{'index': e['index'], 'id': e['enemy_id'], 'hp': e['current_hp'], 'max_hp': e['max_hp'],
            'alive': e['is_alive'], 'block': e['block'], 'powers': e['powers'], 'move': e.get('move_id'), 'intents': e.get('intents')} for e in c.get('enemies', [])]}


def pile_projection(s):
    view = (s.get('agent_view') or {}).get('combat') or {}
    result = {}
    for pile in ['draw','discard','exhaust']:
        entries = view.get(pile)
        if not isinstance(entries,list):
            result[pile] = None
            continue
        result[pile] = []
        for entry in entries:
            line = entry.get('line','')
            count_match = re.search(r'^[^\[：:]*?\*(\d+)\s*\[',line)
            count = int(count_match[1]) if count_match else 1
            upgraded = bool(re.search(r'^[^\[*：:]*?\+\s*(?:\*\d+\s*)?\[',line))
            result[pile].append({'card_ids':entry.get('card_ids'),'line':line,'count':count,'upgraded':upgraded,'mods':entry.get('mods',[])})
    return result


inventory = []
alignments = []
for row in rows:
    id = row['id']; r = replays[id]; f = row['fight']; obs = row['observed']; key = (f['run_id'], f['fight_no'])
    assert r['fight'] == f and r['observed'] == obs
    assert f['character'] == 'SILENT' and f['ascension'] == 10
    assert row['ready_state']['run']['floor'] == f['floor']
    assert row['ready_state']['run']['character_id'] == 'SILENT'
    assert row['ready_state']['run']['ascension'] == 10
    assert len(row['state']['run']['deck']) == f['deck_size']
    ff = [x for x in frames if (x['run_id'], x['fight_no']) == key]
    boundary = row['turn_resets'][0] if row['turn_resets'] else float('inf')
    first_frames = [x for x in ff if x['is_combat'] and x['off'] < boundary]
    aa = [x for x in actions if (x['run_id'], x['fight_no']) == key]
    start = row['state_source']; ready = row['ready_source']
    ready_projection = state_projection(row['ready_state'])
    original_piles = pile_projection(states[ready['offset']])
    hp = [x['player_hp'] for x in first_frames if x['player_hp'] is not None]
    gross = sum(max(0, a-b) for a,b in zip(hp, hp[1:])) + (hp[-1] if obs['outcome'] == 'died' else 0)
    healing = sum(max(0,b-a) for a,b in zip(hp,hp[1:]))
    assert gross == obs['sampled_combat_hp_decreases'] and healing == obs['sampled_healing']
    assert obs['censored_first_attempt'] == bool(row['turn_resets'])
    if not obs['censored_first_attempt']:
        close_state = states[row['close']['off']]
        close_hp = state_projection(close_state)['hp']
        assert close_hp == f['post_hp']
    else:
        close_hp = None
    synthetic = r['synthetic']['opening']; actual = r['actual-opening'].get('opening')
    pile_comparison = {'raw_agent_view_present': 'agent_view' in states[ready['offset']], 'frozen_agent_view_present': 'agent_view' in row['ready_state'],
        'original_piles': original_piles, 'frozen_label': r['actual-opening'].get('labels'), 'order': 'unknown: grouped pile lines do not establish draw order'}
    if actual:
        for pile in ['draw','discard']:
            raw_count = collections.Counter()
            for e in original_piles[pile] or []:
                if e['card_ids']:raw_count[(e['card_ids'][0],e['upgraded'])] += e['count']
            sim_count = collections.Counter((c['cardId'],c['upgraded']) for c in actual['piles'][pile])
            pile_comparison[pile+'_multiset_equal'] = raw_count == sim_count
            pile_comparison[pile+'_raw_size'] = sum(raw_count.values())
            pile_comparison[pile+'_sim_size'] = sum(sim_count.values())
            pile_comparison[pile+'_raw_minus_sim'] = {str(k):v for k,v in (raw_count-sim_count).items()}
            pile_comparison[pile+'_sim_minus_raw'] = {str(k):v for k,v in (sim_count-raw_count).items()}
    variants = {}
    for v in ['synthetic', 'actual-opening']:
        z = r[v]; opening = z.get('opening'); samples = z.get('samples', [])
        if z['status'] == 'computed':
            assert len(samples) == 32 and all(not s['capped'] and not s['timeUp'] for s in samples)
            assert abs(avg([bool(s['died']) for s in samples]) - metric(r,v,'death_rate')) < 1e-12
            assert abs(avg([s['hpLoss'] for s in samples]) - metric(r,v,'hp_loss')) < 1e-10
            assert abs(float(csvrows[id][v+'_death_rate']) - metric(r,v,'death_rate')) < 1e-12
        variants[v] = {'status': z['status'], 'error': z.get('error'), 'death_rate': metric(r,v,'death_rate'), 'hp_loss': metric(r,v,'hp_loss'),
            'turns': metric(r,v,'turns'), 'samples': len(samples), 'draw_first': opening.get('options',{}).get('drawFirst',0) if opening else None,
            'initial_hand': [c['cardId'] for c in opening['solver']['hand'] if c['type'] != 'Potion'] if opening else None,
            'represented_potions': [c['cardId'] for c in opening['solver']['hand'] if c['type'] == 'Potion'] if opening else None,
            'random_potions': opening.get('randomPotions',[]) if opening else None, 'labels': z.get('labels'),
            'initial_incoming': incoming(opening['solver']) if opening else None, 'enemy_hp': sum(e['hp'] for e in opening['solver']['enemies']) if opening else None}
    diffs = {'hand_count': [synthetic['options'].get('drawFirst',0), len(ready_projection['hand'])],
        'energy': [synthetic['solver']['player']['energy'], ready_projection['energy']],
        'enemy_hp': [sum(e['hp'] for e in synthetic['solver']['enemies']),sum(e['hp'] for e in ready_projection['enemies'])],
        'incoming': [incoming(synthetic['solver']),incoming(actual['solver']) if actual else None],
        'player_hp': [synthetic['solver']['player']['hp'],ready_projection['hp']]}
    if actual:
        diffs['solver_enemy_fields_different'] = [{ 'index': s['index'], 'fields': [k for k in set(s)|set(a) if s.get(k) != a.get(k)]}
            for s,a in zip(synthetic['solver']['enemies'],actual['solver']['enemies']) if s != a]
    power_diff = []
    raw_enemies = {e['index']:e for e in ready_projection['enemies']}
    for e in synthetic['enemies']:
        raw = raw_enemies.get(e['index'])
        actual_powers = {p['power_id']:p['amount'] for p in raw['powers']} if raw else {}
        sim_powers = e.get('powers',{})
        power_diff.append({'index':e['index'],'id':e['id'],'synthetic':sim_powers,'observed':actual_powers,
            'only_synthetic':{k:v for k,v in sim_powers.items() if k not in actual_powers},
            'only_observed':{k:v for k,v in actual_powers.items() if k not in sim_powers}})
    diffs['powers'] = power_diff
    actual_t1 = [a for a in aa if a['turn']==1 and a['ts'] < (row['sl'][0]['ended_at'] if row['sl'] else '9999')]
    actual_t1_set = sorted({a['card_id'] if a['action']=='play_card' else 'POTION:'+a['potion_id'] for a in actual_t1 if a['action'] in ['play_card','use_potion']})
    policy_comparison = {'observed_T1_unique_ids':actual_t1_set, 'action_offsets':[a['off'] for a in actual_t1], 'variants':{}}
    for v in ['synthetic','actual-opening']:
        comparison=[]
        for i,s in enumerate(r[v].get('samples',[])):
            ids=sorted({k.rsplit(':',1)[0] if k.startswith('POTION:') else k for k,x in s.get('coreWindow',{}).get('byCard',{}).items() if x.get('firstPlay')==1})
            comparison.append({'sample_index':i,'T1_unique_ids':ids,'same_id_set':ids==actual_t1_set})
        policy_comparison['variants'][v]=comparison
    cfgs = [c for c in config_by_run[f['run_id']] if c['record']['ts'] <= f['first_ts'][:23]+'Z']
    cfg = (cfgs or config_by_run[f['run_id']])[ -1 ]
    ri = {'id': id, 'run_id': f['run_id'], 'fight_no': f['fight_no'], 'floor': f['floor'], 'act': f['act'], 'character': 'silent', 'ascension': 10,
        'encounter': f['encounter'], 'historical_commit': cfg['record']['code']['commit'], 'historical_dirty': cfg['record']['code']['dirty'],
        'historical_config_sha256': cfg['sha256'], 'architecture': 'V5', 'replay_source': source['head'],
        'state_source': start, 'ready_source': ready, 'close_source': index_by_off[row['close']['off']] if row['close'] else None,
        'first_attempt_last_source': index_by_off[row['first_attempt_last']['off']], 'sl_count': len(row['sl']), 'turn_resets': row['turn_resets'],
        'observed': obs, 'close_hp': close_hp, 'entry_hp': f['entry_hp'], 'max_hp': f['max_hp'], 'deck': r['entry_deck'],
        'entry_to_close_hp_loss': f['entry_hp']-close_hp if close_hp is not None else None,
        'close_minus_frozen_last_hp':close_hp-obs['first_attempt_end_hp'] if close_hp is not None else None,
        'relics': f['relics'], 'potions_in': f['potions_in'], 'ready': ready_projection, 'opening_differences': diffs, 'variants': variants,
        'raw_frames_verified': len(ff), 'raw_decisions_verified': len(aa), 'earliest_localizable_difference': {'boundary': 'T1_before_policy', 'evidence': ready,
            'finding': 'synthetic draw count differs from observed ready hand' if diffs['hand_count'][0] != diffs['hand_count'][1] else 'check component projections'},
        'later_mechanism_attribution': 'unknown: actions/draw order and full simulator state trajectory not frozen; aggregates do not establish matched transitions',
        'historical_dynamic_knowledge': 'unknown', 'counterfactual_successors': 'unknown', 'draw_order': 'unknown',
        'disposition': 'excluded_first_attempt_unknown' if obs['censored_first_attempt'] else 'observed_and_static_replay_verified',
        'actual_opening_unknown': r['actual-opening']['status'] != 'computed', 'pile_comparison':pile_comparison, 'T1_policy_comparison':policy_comparison}
    inventory.append(ri)
    for t in sorted({x['turn'] for x in first_frames if x['turn'] is not None}):
        tf = [x for x in first_frames if x['turn'] == t]
        # Record the actual actions and both per-turn series without claiming action matching.
        turnsamples = {}
        for v in ['synthetic','actual-opening']:
            ss = [s for s in r[v].get('samples',[]) if len(s.get('lossByTurn',[])) >= t]
            turnsamples[v] = {'surviving_record_count':len(ss), 'sample_indices_with_record':[i for i,s in enumerate(r[v].get('samples',[])) if len(s.get('lossByTurn',[]))>=t]}
            for field in ['lossByTurn','dmgByTurn','incomingByTurn','enemyHpByTurn','blockByTurn']:
                turnsamples[v][field] = [s[field][t-1] for s in ss if len(s.get(field,[]))>=t]
        ta = [a for a in aa if a['turn']==t and a['ts'] < (row['sl'][0]['ended_at'] if row['sl'] else '9999')]
        alignments.append({'id':id,'turn':t,'first_attempt_censored':obs['censored_first_attempt'],
            'observed_first':state_projection(states[tf[0]['off']]),'observed_last':state_projection(states[tf[-1]['off']]),
            'first_source':index_by_off[tf[0]['off']],'last_source':index_by_off[tf[-1]['off']],
            'actual_actions':[{'action':a['action'],'card_id':a['card_id'],'potion_id':a['potion_id'],'offset':a['off']} for a in ta],
            'frozen_simulator_series':turnsamples,'comparison_status':'descriptive_only_policy_and_draw_not_matched'})
save('fight-inventory.json',inventory)
with open(OUT/'turn-alignment.jsonl','w') as h:
    for x in alignments:h.write(json.dumps(x,ensure_ascii=False)+'\n')
with open(OUT/'fight-inventory.csv','w') as h:
    fields=['id','character','ascension','act','floor','encounter','historical_commit','historical_dirty','entry_hp','deck_size','hand_count','draw_first',
        'outcome','censored','sl_count','synthetic_death_rate','actual_opening_death_rate','actual_opening_status','ready_offset','ready_bytes','ready_sha256','disposition']
    w=csv.DictWriter(h,fieldnames=fields);w.writeheader()
    for x in inventory:
        w.writerow({**{k:x[k] for k in ['id','character','ascension','act','floor','encounter','historical_commit','historical_dirty','entry_hp','sl_count','disposition']},
            'deck_size':len(x['deck']),'hand_count':len(x['ready']['hand']),'draw_first':x['variants']['synthetic']['draw_first'],
            'outcome':x['observed']['outcome'],'censored':x['observed']['censored_first_attempt'],'synthetic_death_rate':x['variants']['synthetic']['death_rate'],
            'actual_opening_death_rate':x['variants']['actual-opening']['death_rate'],'actual_opening_status':x['variants']['actual-opening']['status'],
            **{'ready_'+k:x['ready_source'][v] for k,v in [('offset','offset'),('bytes','bytes'),('sha256','sha256')]}})


def summarize(rr,v):
    usable=[r for r in rr if not r['observed']['censored_first_attempt'] and r[v]['status']=='computed']
    return {'fights':len(usable),'independent_run_ids':sorted({r['fight']['run_id'] for r in usable}),
        'deaths':sum(r['observed']['outcome']=='died' for r in usable),'observed_rate':avg([r['observed']['outcome']=='died' for r in usable]),
        'sim_rate':avg([metric(r,v,'death_rate') for r in usable]),'observed_loss':avg([r['observed']['net_hp_loss'] for r in usable]),
        'sim_loss':avg([metric(r,v,'hp_loss') for r in usable]),'gross_loss':avg([r['observed']['sampled_combat_hp_decreases'] for r in usable])}


rr=list(replays.values())
paired=[r for r in rr if r['actual-opening']['status']=='computed']
summary={'input_files':len(verified),'cohort_runs':len(cohort),'runs_with_elites':len({r['fight']['run_id'] for r in rows}), 'fights':len(rows),
    'states_verified':len(frames),'decisions_verified':len(actions),'sl_records_verified':4,'bounded_raw_bytes':sum(r['bytes'] for r in raw_index),
    'run_brain_source_counts':dict(collections.Counter(r['brain_source'] for r in run_inventory)),
    'configs':len(configs),'config_commit_count':len({c['record']['code']['commit'] for c in configs}),
    'source_snapshot_statuses':dict(collections.Counter(r['git_status'] for r in source_check)),
    'variants':{v:summarize(rr,v) for v in ['synthetic','actual-opening']},'paired':{v:summarize(paired,v) for v in ['synthetic','actual-opening']},
    'by_encounter':{e:{v:summarize([r for r in rr if r['fight']['encounter']==e],v) for v in ['synthetic','actual-opening']} for e in sorted({r['fight']['encounter'] for r in rows})},
    'excluded':[r['id'] for r in inventory if r['observed']['censored_first_attempt']], 'actual_opening_unknown':[r['id'] for r in inventory if r['actual_opening_unknown']],
    'opening_difference_counts':{k:sum(r['opening_differences'][k][0]!=r['opening_differences'][k][1] for r in inventory if r['opening_differences'][k][1] is not None) for k in ['hand_count','energy','enemy_hp','incoming','player_hp']},
    'hand_counts':dict(collections.Counter(len(r['ready']['hand']) for r in inventory)),
    'opening_hand_count_gaps':dict(collections.Counter(r['opening_differences']['hand_count'][1]-r['opening_differences']['hand_count'][0] for r in inventory)),
    'endpoint_discrepancies':[{'id':r['id'],'frozen_loss':r['observed']['net_hp_loss'],'entry_to_close_loss':r['entry_to_close_hp_loss'],
        'last_source':r['first_attempt_last_source'],'close_source':r['close_source']} for r in inventory if r['entry_to_close_hp_loss'] is not None and r['entry_to_close_hp_loss']!=r['observed']['net_hp_loss']],
    'entry_to_close_loss_mean':avg([r['entry_to_close_hp_loss'] for r in inventory if r['entry_to_close_hp_loss'] is not None]),
    'discarded_agent_view':sum(r['pile_comparison']['raw_agent_view_present'] and not r['pile_comparison']['frozen_agent_view_present'] for r in inventory),
    'draw_multiset_mismatches':[r['id'] for r in inventory if r['pile_comparison'].get('draw_multiset_equal') is False],
    'turns_inventoried':len(alignments), 'new_mc':0}
save('static-summary.json',summary)
(OUT/'worktree-start.diff').write_bytes(subprocess.check_output(['git','diff','--binary']))
print(json.dumps({k:v for k,v in summary.items() if k not in ['by_encounter','variants','paired']},ensure_ascii=False))
