"""Reuse calibration outputs and verify bounded Silent resource handoffs; never simulate."""
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path('/home/dw/Projects/agent-sts2')
HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2]
OLD = ROOT / 'learner/runs/20261016-050122-21c48aea-19f1-459a-b67e-e18af997b998-silent-boss-calibration'
PRIOR = ROOT / 'learner/runs/20261007-130409-silent-double-boss'
RUNS = ['JMH5C51RLN4E', '9TG1RP5LFAAK', 'ZVYUL2YP3518', 'TDLBRNA0R05B',
        '64VJC5XT2AT2', '7S8HCC0M6G9W']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(name, data):
    path = HERE / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def ref(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': sha(data)}


def resource(row):
    state = row['state']
    run = state['run']
    player = (state.get('combat') or {}).get('player') or {}
    deck = collections.Counter((c['card_id'], bool(c.get('upgraded'))) for c in run.get('deck', []))
    return {'ts': row['ts'], 'floor': run.get('floor'), 'screen': state.get('screen'),
            'in_combat': state.get('in_combat'), 'turn': state.get('turn'),
            'hp': run.get('current_hp'), 'max_hp': run.get('max_hp'),
            'combat_hp': player.get('current_hp'), 'block': player.get('block'),
            'energy': player.get('energy'), 'gold': run.get('gold'),
            'cards_played_this_turn': player.get('cards_played_this_turn'),
            'action_readiness': (state.get('combat') or {}).get('action_readiness'),
            'deck': [{'card_id': k[0], 'upgraded': k[1], 'count': n} for k, n in sorted(deck.items())],
            'potions': [{'slot': p.get('index'), 'id': p.get('potion_id')} for p in run.get('potions', [])],
            'relics': [{'id': r.get('relic_id'), 'stack': r.get('stack'), 'is_melted': r.get('is_melted')} for r in run.get('relics', [])],
            'powers': player.get('powers'),
            'enemies': [{'id': e.get('enemy_id'), 'hp': e.get('current_hp')} for e in (state.get('combat') or {}).get('enemies', [])],
            'next_boss_metadata': run.get('boss_id')}


def main():
    aliases = {'CRUSHER+ROCKET': 'KAISER_CRAB',
               'KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST': 'THE_KIN',
               'QUEEN+TORCH_HEAD_AMALGAM': 'QUEEN'}
    trust = json.loads((WORK / 'knowledge/characters/silent/boss-trust.json').read_text())
    fights = [json.loads(s) for s in (OLD / 'dataset/fights.jsonl').open()]
    sources = [json.loads(s) for s in (OLD / 'dataset/sources.jsonl').open()]
    results = [json.loads(s) for s in (OLD / 'results.jsonl').open()]
    for item in fights + sources:
        item['canonical_boss'] = aliases.get(item.get('encounter'), item.get('encounter'))
    val = set(trust['split']['val'])
    good = {start: {r['key'] for r in results if r['start'] == start and 'sim' in r} for start in ['t1', 'pre']}
    provenance = json.loads((OLD / 'provenance.json').read_text())
    production_delta = json.loads((OLD / 'live-model-changes.json').read_text())
    assert len(production_delta) == 70
    assert len(trust['split']['tune']) == 107 and len(val) == 460
    per_boss = {}
    for boss, metrics in trust['bosses'].items():
        mine = [f for f in fights if f['canonical_boss'] == boss and f['key'] in val]
        stages = sorted({f['act'] for f in fights if f['canonical_boss'] == boss})
        row = {'acts_observed': stages, 'scope': 'act3/final' if 3 in stages else 'earlier-act appendix',
               'validation_actual_attempts': len(mine), 'validation_distinct_runs': len({f['run_id'] for f in mine}),
               'first_attempts': sum(f['attempt'] == 1 for f in mine),
               'sl_retries': sum(f['attempt'] > 1 for f in mine),
               'floors': dict(collections.Counter(str(f['floor']) for f in mine)),
               'exclusions_all_splits': dict(collections.Counter(f['excluded'] for f in sources if f.get('canonical_boss') == boss and f.get('excluded'))),
               'metrics': {}}
        for start in ['t1', 'pre']:
            usable = [f for f in mine if f['key'] in good[start]]
            m = metrics[start]
            assert len(usable) == m['n'], (boss, start, len(usable), m['n'])
            row['metrics']['b2' if start == 't1' else 'b3'] = dict(m,
                trusted=not m['failed'], distinct_runs=len({f['run_id'] for f in usable}),
                attempt_count_deficit=max(0, 10 - m['n']),
                independent_run_count_deficit=max(0, 10 - len({f['run_id'] for f in usable})),
                quality_gap='no finite added-sample count guarantees quality gates' if m['failed'] else None)
        per_boss[boss] = row
    audit = {'object': 'R366 / S1.boss-calibration20 fixed model, not current production calibration',
             'cutoff': json.loads((OLD / 'dataset/extraction.json').read_text())['snapshot_ended_max'],
             'model_commit': provenance['simulator_base'], 'model_sha256': provenance['model_sha256'],
             'split': trust['split'], 'criteria': trust['criteria'], 'overall': trust['overall'],
             'stage_metrics': trust['stage_metrics'], 'residuals': trust['residuals'],
             'original_production_input_differences': production_delta, 'bosses': per_boss,
             'source_artifacts': [ref(OLD / p) for p in ['dataset/fights.jsonl', 'dataset/sources.jsonl', 'results.jsonl', 'provenance.json', 'dataset/extraction.json', 'live-model-changes.json', 'report.json']],
             'method': 'Read saved outputs only; no simulation, Platt refit, cut movement or trust publication.'}
    save('calibration-readback.json', audit)
    identity = [f for f in sources if f.get('act') == 3]
    save('act3-attempt-identities.json', identity)
    selected = {}
    original_refs = []
    for filename in ['runs.jsonl', 'sl-attempts.jsonl']:
        path = ROOT / 'logs' / filename
        prefix_path = HERE / filename.replace('.jsonl', '-prefix.json')
        frozen_prefix = json.loads(prefix_path.read_text()) if prefix_path.exists() else None
        limit = frozen_prefix['complete_prefix_bytes'] if frozen_prefix else path.stat().st_size
        digest = hashlib.sha256()
        off = 0
        with path.open('rb') as handle:
            while off < limit:
                data = handle.readline(limit - off)
                if not data.endswith(b'\n'):
                    break
                digest.update(data)
                row = json.loads(data)
                if row.get('run_id') in RUNS:
                    original_refs.append({'path': str(path), 'offset': off, 'bytes': len(data), 'sha256': sha(data), 'row': row})
                    if filename == 'runs.jsonl':
                        assert str(row.get('character')).lower() == 'silent'
                        assert row.get('ended')
                        selected[row['run_id']] = row
                off += len(data)
        if frozen_prefix:
            assert off == limit and digest.hexdigest() == frozen_prefix['sha256'], 'frozen log prefix changed'
        else:
            save(filename.replace('.jsonl', '-prefix.json'), {'path': str(path), 'complete_prefix_bytes': off, 'sha256': digest.hexdigest(), 'captured_at': dt.datetime.now(dt.timezone.utc).isoformat()})
    assert set(selected) == set(RUNS)
    if (HERE / 'run-and-sl-evidence.json').exists():
        assert json.loads((HERE / 'run-and-sl-evidence.json').read_text()) == original_refs
    else:
        save('run-and-sl-evidence.json', original_refs)
    sys.path.insert(0, str(WORK / 'agent/tools/logdb'))
    import query
    import sync
    with sync.read_lock(str(ROOT / 'data/logdb'), shared=True):
        con = query.connect(str(ROOT / 'data/logdb'), threads=1)
        rows = con.execute('SELECT off,len,run_id,floor,screen,turn,in_combat FROM frames WHERE run_id IN (SELECT unnest(?::VARCHAR[])) AND floor IN (48,49) ORDER BY run_id,off', [RUNS]).fetchall()
        con.close()
    by_run = collections.defaultdict(list)
    for off, size, run, floor, screen, turn, combat in rows:
        by_run[run].append({'off': off, 'len': size, 'floor': floor, 'screen': screen, 'turn': turn, 'in_combat': combat})
    paths = ROOT / 'logs/states.jsonl'
    contracts = []
    with paths.open('rb') as handle:
        for run in RUNS:
            frames = by_run[run]
            first49 = next(f for f in frames if f['floor'] == 49)
            before = [f for f in frames if f['floor'] == 48 and f['off'] < first49['off']]
            exits = [f for f in before if not f['in_combat']]
            last_combat = [f for f in before if f['in_combat']][-1]
            exit_frame = exits[-1] if exits else None
            # First actionable F49 T1, without treating a later SL reset as a new run.
            ready = []
            for f in frames:
                if f['floor'] != 49 or f['screen'] != 'COMBAT' or f['turn'] != 1:
                    continue
                handle.seek(f['off']); data = handle.read(f['len']); raw = json.loads(data)
                if ((raw['state'].get('combat') or {}).get('action_readiness') or {}).get('can_use_combat_actions'):
                    ready.append(f)
                    break
            chosen = {'first_exit': exit_frame, 'first_last_combat': last_combat, 'second_entry': first49, 'second_first_actionable': ready[0] if ready else None}
            observations = {}
            for label, frame in chosen.items():
                if frame is None:
                    observations[label] = None
                    continue
                handle.seek(frame['off']); data = handle.read(frame['len']); raw = json.loads(data)
                assert raw['state']['run']['character_id'] == 'SILENT'
                rel = f'raw/{run}-{label}.json'
                (HERE / 'raw').mkdir(exist_ok=True)
                (HERE / rel).write_bytes(data)
                observations[label] = dict(resource(raw), source={'path': str(paths), 'offset': frame['off'], 'bytes': frame['len'], 'sha256': sha(data), 'frozen_path': str(HERE / rel)})
            events = [r['row'] for r in original_refs if r['path'].endswith('sl-attempts.jsonl') and r['row']['run_id'] == run and r['row'].get('floor') in [48,49]]
            exit48, entry49 = observations['first_exit'], observations['second_first_actionable']
            compare = {}
            if exit48 and entry49:
                compare = {key: {'equal': exit48[key] == entry49[key], 'before': exit48[key], 'after': entry49[key]} for key in ['hp','max_hp','potions','deck','relics','gold']}
            old_powers = (observations['first_last_combat'] or {}).get('powers') or []
            new_powers = (observations['second_entry'] or {}).get('powers') or []
            disappeared = [p for p in old_powers if p.get('power_id') not in {q.get('power_id') for q in new_powers}]
            contracts.append({'run': run, 'ascension': selected[run]['ascension'], 'run_ended': selected[run]['ended'], 'observations': observations,
                              'attempts': events, 'comparison': compare, 'observed_expiring_powers': disappeared,
                              'limitation': 'Endpoint observations; first actionable means first indexed ready snapshot, not a certified untouched opening. Opening/reward triggers can change HP/deck/potions/powers. No unobserved transition, trigger order or charge state inferred.'})
    save('continuous-resource-contract.json', {'schema': 'silent-continuous-boss-evidence-v1', 'character': 'silent', 'ascension': 10,
         'scope': 'Observed F48 victory -> F49 only; six already-studied ended runs, not independent calibration or general two-battle API',
         'resource_names': ['hp','max_hp','deck','potions','relics','gold','block','energy','powers'],
         'contract': {
             'hp': {'status': 'observed', 'rule': 'Use actual post-victory and next actionable HP separately; no generic act-transition heal inferred.'},
             'max_hp_deck_relics_potions': {'status': 'conditional', 'rule': 'Carry actual persistent state, account separately for rewards and opening triggers; use the per-run snapshots, never refill consumed potions.'},
             'combat_state': {'status': 'bounded', 'rule': 'Previous combat powers/piles are not a confirmed persistent resource. Listed disappearance is evidence only for observed powers; new opening triggers require current-state observation.'},
             'next_identity': {'status': 'observed-only', 'rule': 'Read actual F49 combat enemy; prior act boss metadata alone is insufficient.'},
             'joint_win_probability': {'status': 'unknown', 'value': None, 'reason': 'No calibrated joint endpoint distribution; mean exit HP and four-run double-boss curve do not establish joint win probability.'},
             'unknowns': ['Unobserved revive/charge state', 'Unobserved card/relic/potion opening effects', 'Unseen boss order distribution', 'Independent production-model joint outcome calibration', 'Other ascensions and characters']},
         'runs': contracts, 'prior_materials': [ref(PRIOR / 'report.md'), ref(WORK / 'knowledge/characters/silent/double-boss.json')],
         'method': 'Reuse existing six-run observations; audit raw indexed bytes. No model/API, no new simulation.'})
    print(json.dumps({'bosses': len(per_boss), 'act3_bosses': [b for b,r in per_boss.items() if 3 in r['acts_observed']], 'contract_runs': len(contracts), 'frames_indexed': len(rows), 'simulations_run': 0}))


if __name__ == '__main__':
    main()
