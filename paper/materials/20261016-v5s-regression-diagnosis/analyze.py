#!/usr/bin/env python3
"""Describe logged V5-S exposure and outcomes. No replay, policy fitting, simulation or model calls."""
import bisect
import collections as C
import csv
import datetime as dt
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics as S
import subprocess

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]


def obj(x):
    return x if isinstance(x, dict) else {}


def load(name):
    directory = 'inputs-lean' if (BASE / 'inputs-lean/manifest.json').exists() else 'inputs'
    with gzip.open(BASE / directory / f'{name}.jsonl.gz', 'rt') as stream:
        yield from map(json.loads, stream)


def stamp(text):
    return dt.datetime.fromisoformat(text.replace('Z', '+00:00')).replace(tzinfo=dt.timezone.utc).timestamp() if text else None


def dist(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x))
    if not xs:
        return {'n': 0, 'mean': None, 'median': None, 'p25': None, 'p75': None}
    def q(p):
        at = (len(xs) - 1) * p
        return xs[math.floor(at)] + (xs[math.ceil(at)] - xs[math.floor(at)]) * (at % 1)
    return {'n': len(xs), 'mean': S.fmean(xs), 'median': q(.5), 'p25': q(.25), 'p75': q(.75)}


def ratio(n, d):
    return {'n': n, 'd': d, 'rate': n / d if d else None}


def score(rows):
    xs = [(r['p_chosen'], r['first_completed_win']) for r in rows
          if isinstance(r.get('p_chosen'), (int, float)) and r.get('first_completed_win') in (0, 1)]
    if not xs:
        return {'n': 0}
    rate = S.fmean(y for _, y in xs)
    return {'n': len(xs), 'mean_prediction': S.fmean(p for p, _ in xs), 'first_completed_win_rate': rate,
            'brier': S.fmean((p - y) ** 2 for p, y in xs), 'constant_baseline_brier': rate * (1 - rate),
            'bias': S.fmean(p - y for p, y in xs), 'definition': 'First attempt completed win; confirmed SL abandonment is a non-completion, not an observed death.'}


def csvout(name, rows):
    keys = list(dict.fromkeys(k for row in rows for k in row))
    with (BASE / name).open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list, tuple)) else v for k, v in row.items()})


def main():
    freeze = json.loads((BASE / 'freeze.json').read_bytes())
    runs = {r['run_id']: r for r in freeze['runs']}
    versions = json.loads((BASE / 'versions.original.json').read_bytes())
    if not isinstance(versions, list):
        versions = versions['versions']
    versions = [r for r in versions if r.get('release_id') in [f'V5-R{n}' for n in range(350, 371)]]
    ancestors = {}
    for r in runs.values():
        for config in r['configurations']:
            commit = obj(config.get('code')).get('commit')
            if commit and commit not in ancestors:
                history = subprocess.check_output(['git', 'rev-list', commit], cwd=ROOT, text=True)
                ancestors[commit] = set(history.splitlines())

    def cfg(rid, time=None):
        cs = runs[rid]['configurations']
        if time:
            eligible = [c for c in cs if stamp(c['ts']) <= stamp(time)]
            return eligible[-1] if eligible else cs[0] if cs else {}
        return cs[0] if cs else {}

    def has(config, release):
        commit = obj(config.get('code')).get('commit')
        v = next(r for r in versions if r['release_id'] == f'V5-R{release}')
        return v['commit'] in ancestors.get(commit, set())

    def epoch(rid, time=None):
        config = cfg(rid, time)
        if runs[rid]['cohort'] == 'pre': return 'pre'
        if has(config, 369): return 'R369+'
        if has(config, 366): return 'R366_before_R369'
        if has(config, 362): return 'R362_before_R366'
        return 'P1P3_before_R362'

    fights = list(load('fights'))
    bosses = [f for f in fights if f['room'] == 'boss']
    bossmap = {(f['run_id'], f['floor']): f for f in bosses}
    assert len(bossmap) == len(bosses), 'Do not merge distinct encounters silently.'
    sl = list(load('sl'))
    slmap = C.defaultdict(list)
    for row in sl:
        if row.get('fight_kind') == 'boss':
            slmap[(row['run_id'], row['floor'])].append(row)
    for rows in slmap.values(): rows.sort(key=lambda r: (r.get('attempt', 0), r.get('ts', '')))

    brains = list(load('brains'))
    brain_reason = C.defaultdict(list)
    for b in brains:
        if b.get('accepted') is True:
            reason = obj(b.get('answer')).get('reason')
            if isinstance(reason, str): brain_reason[(b['run_id'], b.get('label'), reason)].append(b)

    def linked_brain(d):
        reason = obj(d.get('deepseek')).get('reason')
        bs = brain_reason.get((d['run_id'], d.get('label'), reason), [])
        if not bs: return None
        b = min(bs, key=lambda b: abs(stamp(b['ts']) - stamp(d['ts'])))
        return b if abs(stamp(b['ts']) - stamp(d['ts'])) < 600 else None

    first_b2 = {}
    jev, p2, choices, c1, c2, p3, trust = [], [], [], [], [], [], []
    seen_c1, seen_c2, seen_decisions = set(), set(), set()
    brain_links = C.Counter()
    total_decisions = 0
    for d in load('decisions'):
        total_decisions += 1
        rid, floor = d['run_id'], d.get('floor')
        group = runs[rid]['cohort']
        label = d.get('label', '')
        identity = d.get('decision_id') or d['_source']['off']
        if identity in seen_decisions: continue
        seen_decisions.add(identity)
        sim = obj(d.get('boss_sim'))
        boss = bossmap.get((rid, floor))
        base = {'cohort': group, 'epoch': epoch(rid, d['ts']), 'run_id': rid, 'floor': floor, 'ts': d['ts'],
                'label': label, 'source_off': d['_source']['off'], 'source_len': d['_source']['len'], 'source_sha256': d['_source']['sha256']}
        answer = obj(obj(d.get('answers')).get('plan'))
        answer_key = answer.get('choice')
        b2 = sim.get('available') is True and isinstance(sim.get('lines'), dict)
        if boss and b2 and d.get('turn') == 1 and d.get('sl_attempt') in (None, 1) and (rid, floor) not in first_b2:
            line = obj(obj(sim.get('lines')).get(answer_key))
            best = obj(obj(sim.get('lines')).get(sim.get('best')))
            first_b2[(rid, floor)] = {**base, 'turn': 1, 'sl_attempt': d.get('sl_attempt'), 'chosen': answer_key,
                'p_chosen': line.get('cal'), 'p_chosen_raw': line.get('win'), 'p_best': best.get('cal'),
                'low_trust': sim.get('low_trust'), 'boss': sim.get('boss'), 'best': sim.get('best'),
                'samples': sim.get('samples'), 'objective': sim.get('objective'), 'legacy_rollout_best': obj(d.get('rollout')).get('best')}
        if boss and label.startswith('combat/plan-choice') and d.get('decider') == 'jev':
            roll = obj(d.get('rollout'))
            exact = roll.get('best')
            tied = roll.get('tied') or ([exact] if exact else [])
            if isinstance(answer_key, str) and isinstance(exact, str):
                jev.append({**base, 'turn': d.get('turn'), 'attempt': d.get('sl_attempt'), 'answer_key': answer_key,
                    'code_best': exact, 'exact_best': answer_key == exact, 'in_best_group': answer_key in tied,
                    'sim_best': sim.get('best'), 'low_trust': sim.get('low_trust'), 'B2_available': b2,
                    'first_attempt': d.get('sl_attempt') in (None, 1), 'fight_final_outcome': boss['outcome'],
                    'p_selected': obj(obj(sim.get('lines')).get(answer_key)).get('cal'),
                    'p_code_best': obj(obj(sim.get('lines')).get(exact)).get('cal'),
                    'result_completed': str(d.get('result', '')).startswith('completed'),
                    'later_resolver_may_override': any(t in str(d.get('rationale', '')).lower() for t in ('hp guard', 'playing plan', 'explor', 'deviation', 'replay'))})
        if b2:
            trust.append({**base, 'lane': 'b2', 'actual_boss_room': bool(boss), 'boss': sim.get('boss'), 'low': sim.get('low_trust') is True})
        read = obj(sim.get('readiness'))
        rank = obj(sim.get('build_ranking'))
        if read:
            trust.append({**base, 'lane': 'b3', 'actual_boss_room': False, 'boss': sim.get('boss'),
                          'low': bool(obj(read.get('trust')).get('bossTrustReason')),
                          'ranking_eligible': obj(read.get('trust')).get('rankingEligible')})
        selection = obj(rank.get('selection'))
        if rank.get('status') == 'produced':
            p2.append({**base, 'mode': rank.get('mode'), 'delivered': rank.get('delivered'),
                'deviated': selection.get('deviated'), 'target_pending': selection.get('target_pending'),
                'reason_present': bool(selection.get('ranking_override_reason')), 'choice': selection.get('choice'),
                'candidates': len(rank.get('candidates') or []), 'best_group': rank.get('best_group'),
                'candidate_keys': selection.get('candidate_keys'), 'low_trust': rank.get('low_trust'),
                'reason': selection.get('ranking_override_reason'), 'scope': selection.get('scope')})
        if label in ('rest/plan', 'reward/card') and d.get('decider') in ('codex', 'deepseek', 'deepseek (for codex)'):
            b = linked_brain(d)
            brain_links['total'] += 1
            brain_links['matched_exact_reason_and_label'] += b is not None
            facts = obj((b or {}).get('payload_facts'))
            delivered = isinstance(facts.get('boss_readiness'), str) and facts['boss_readiness'].startswith('当前牌组Boss模拟胜率') if b else None
            hp = obj(d.get('fingerprint_metadata')).get('hp')
            maxhp = obj(d.get('fingerprint_metadata')).get('max_hp')
            choice = obj(d.get('deepseek')).get('choice')
            if choice is None:
                choice = next((v.get('choice') for v in obj(d.get('answers')).values() if isinstance(v, dict) and v.get('choice') is not None), None)
            choices.append({**base, 'choice': choice, 'P1_delivered_to_accepted_brain': delivered,
                            'brain_source_off': obj((b or {}).get('_source')).get('off'), 'hp': hp, 'max_hp': maxhp,
                            'hp_fraction': hp / maxhp if isinstance(hp, (int, float)) and isinstance(maxhp, (int, float)) and maxhp > 0 else None,
                            'config_P1': obj(cfg(rid, d['ts']).get('loop')).get('s_readiness')})
        sr = obj(sim.get('s_ranking'))
        if sr:
            p3.append({**base, 'used': sr.get('used'), 'mode': sr.get('mode'), 'reason': sr.get('reason'),
                       'old_best': sr.get('old_best'), 'new_best': sr.get('best'),
                       'best_changed': sr.get('used') is True and sr.get('old_best') is not None and sr.get('best') is not None and sr['old_best'] != sr['best'],
                       'candidate_keys': sr.get('candidate_keys'), 'actual_boss_room': bool(boss)})
        completion = obj(sim.get('completion'))
        if completion and (boss or label in ('reward/card', 'shop/open', 'shop/buy', 'shop/plan', 'rest/choose', 'rest/plan',
                'selection/upgrade', 'selection/remove', 'selection/transform', 'selection/add', 'event/plan', 'event/choose')):
            ident = (rid, completion.get('attempt_id') or d['_source']['off'])
            if ident not in seen_c1:
                seen_c1.add(ident)
                c1.append({**base, 'lane': 'b2' if label.startswith('combat/') else 'b3', 'actual_boss_room': bool(boss),
                           'status': completion.get('status'), 'failure': completion.get('failure'), 'samples': sim.get('samples', completion.get('samples')),
                           'key': completion.get('key'), 'reasons': completion.get('reasons'), 'error': sim.get('error', sim.get('reason'))})
        adaptive = obj(sim.get('adaptive'))
        if adaptive:
            lane = adaptive.get('lane') or ('b2' if label.startswith('combat/') else 'b3')
            ident = (rid, lane, adaptive.get('input_key') or d['_source']['off'])
            if ident not in seen_c2:
                seen_c2.add(ident)
                candidates = adaptive.get('candidates') or []
                elimination_entries = [x for round in adaptive.get('rounds', []) for x in round.get('eliminated', [])]
                assert all(isinstance(x, str) or isinstance(x, dict) and isinstance(x.get('key'), str) for x in elimination_entries)
                eliminated = {x if isinstance(x, str) else x['key'] for x in elimination_entries}
                c2.append({**base, 'lane': lane, 'mode': adaptive.get('mode'), 'status': adaptive.get('status'),
                           'actual_boss_room': bool(boss), 'input_key': adaptive.get('input_key'),
                           'eliminated_candidates': len(eliminated), 'eliminated': sorted(eliminated),
                           'candidate_count': len(candidates), 'early_stopped_candidates': sum(isinstance(c.get('samples'), int) and c['samples'] < (adaptive.get('rule') or {}).get('requested', 0) for c in candidates),
                           'work': adaptive.get('work'), 'comparison': adaptive.get('production_comparison')})

    boss_rows = []
    for f in bosses:
        rid = f['run_id']; key = (rid, f['floor'])
        attempts = slmap[key]
        first = next((r for r in attempts if r.get('attempt') == 1), None)
        result = first.get('result') if first else None
        reloaded = obj(first.get('reload')).get('ok') if first else None
        first_win = 1 if result == 'won' else 0 if result == 'died' or result == 'predicted_death' and (reloaded is True or any(r.get('attempt', 0) > 1 for r in attempts)) else None
        t1 = first_b2.get(key, {})
        boss_rows.append({'cohort': runs[rid]['cohort'], 'epoch': epoch(rid, f['first_ts']), 'run_id': rid, 'floor': f['floor'],
            'encounter': f['encounter'], 'final_outcome': f['outcome'], 'first_result': result, 'first_completed_win': first_win,
            'first_observed_death': result == 'died', 'confirmed_first_SL_exit': result == 'predicted_death' and first_win == 0,
            'entry_hp': f['entry_hp'], 'max_hp': f['max_hp'], 'hp_fraction': f['entry_hp'] / f['max_hp'] if f['max_hp'] else None,
            'deck_size': f['deck_size'], 'first_frame_off': f['first_off'], 'first_ts': f['first_ts'],
            'attempts_logged': len(attempts), 'max_attempt': max((r.get('attempt', 0) for r in attempts), default=None),
            'p_chosen': t1.get('p_chosen'), 'p_chosen_raw': t1.get('p_chosen_raw'), 'p_best': t1.get('p_best'),
            'low_trust': t1.get('low_trust'), 't1_prediction': t1,
            'first_attempt_source': first.get('_source') if first else None})

    run_rows = []
    for rid, r in runs.items():
        final = r['finished']; f = next((f for f in reversed(fights) if f['run_id'] == rid and f['outcome'] == 'died'), None)
        run_rows.append({'cohort': r['cohort'], 'epoch': epoch(rid), 'run_id': rid, 'started': r['started'],
            'ended': final['ended'], 'victory': final['victory'], 'floor': final['floor'], 'death_fight': final.get('death_fight'),
            'death_room': f['room'] if f else None, 'death_encounter': f['encounter'] if f else None,
            'brain_source': r['brain_source']['source'], 'engine_eligible': r['brain_source']['eligible'],
            'config_count': len(r['configurations']), 'loop': obj(cfg(rid).get('loop')),
            'knowledge_prefix_sha': obj(cfg(rid).get('knowledge')).get('prefix_sha'),
            'experience_version': obj(cfg(rid).get('knowledge')).get('experience_version')})

    release_rows = []
    for v in versions:
        if int(v['release_id'].split('-R')[1]) < 354: continue
        affected = [r for r in run_rows if any(v['commit'] in ancestors.get(obj(c.get('code')).get('commit'), set()) for c in runs[r['run_id']]['configurations'])]
        matching_configs = [(r['run_id'], c) for r in affected for c in runs[r['run_id']]['configurations']
                            if v['commit'] in ancestors.get(obj(c.get('code')).get('commit'), set())]
        first = min(matching_configs, key=lambda pair: pair[1]['ts']) if matching_configs else None
        release_rows.append({**v, 'first_frozen_process_run': first[0] if first else None, 'first_frozen_process_start': first[1]['ts'] if first else None,
                             'affected_finished_runs': len(affected), 'affected_run_ids': [r['run_id'] for r in affected]})

    summaries = {}
    groupings = [('cohort', g) for g in ('pre', 'post')] + [('epoch', g) for g in ('P1P3_before_R362', 'R362_before_R366', 'R366_before_R369', 'R369+')]
    for field, group in groupings:
        rr = [r for r in run_rows if r[field] == group]; br = [r for r in boss_rows if r[field] == group]
        jj = [r for r in jev if r[field] == group]; pp = [r for r in p2 if r[field] == group]; cc = [r for r in choices if r[field] == group]
        summaries[group] = {'runs': len(rr), 'victories': sum(r['victory'] for r in rr),
            'run_deaths': dict(C.Counter(r['death_room'] for r in rr if not r['victory'])),
            'boss_final': ratio(sum(r['final_outcome'] == 'won' for r in br), len(br)),
            'boss_by_floor': {str(f): {'final': ratio(sum(r['final_outcome'] == 'won' for r in br if r['floor'] == f), sum(r['floor'] == f for r in br)),
                'entry_hp': dist([r['entry_hp'] for r in br if r['floor'] == f]), 'hp_fraction': dist([r['hp_fraction'] for r in br if r['floor'] == f]),
                'deck_size': dist([r['deck_size'] for r in br if r['floor'] == f]),
                'first_results': dict(C.Counter(r['first_result'] for r in br if r['floor'] == f))} for f in (17,33,48,49)},
            'first_results': dict(C.Counter(r['first_result'] for r in br)), 'prediction_score': score(br),
            'prediction_trusted_score': score([r for r in br if r['low_trust'] is False]),
            'prediction_actual_death_only_score': score([r for r in br if r['first_result'] in ('won', 'died')]),
            'jev_exact_first': ratio(sum(r['exact_best'] for r in jj if r['first_attempt']), sum(r['first_attempt'] for r in jj)),
            'jev_exact_all': ratio(sum(r['exact_best'] for r in jj), len(jj)),
            'jev_best_group_all': ratio(sum(r['in_best_group'] for r in jj), len(jj)),
            'P2_valid_choices': sum(type(r['deviated']) is bool for r in pp),
            'P2_best_group': ratio(sum(r['deviated'] is False for r in pp), sum(type(r['deviated']) is bool for r in pp)),
            'P2_missing_reason': sum(r['deviated'] is True and not r['reason_present'] for r in pp if r['mode'] == 'on'),
            'P2_by_mode': {m: {'best_group': ratio(sum(r['deviated'] is False for r in pp if r['mode'] == m),sum(type(r['deviated']) is bool for r in pp if r['mode'] == m)), 'choices': sum(r['mode'] == m for r in pp)} for m in ('shadow','on')},
            'choices': {label: {'choices': dict(C.Counter(str(r['choice']) for r in cc if r['label'] == label)),
                'P1_received': sum(r['P1_delivered_to_accepted_brain'] is True for r in cc if r['label'] == label),
                'unlinked': sum(r['P1_delivered_to_accepted_brain'] is None for r in cc if r['label'] == label)} for label in ('rest/plan','reward/card')},
            'C1': dict(C.Counter((r['status'] or 'unknown') for r in c1 if r[field] == group)),
            'C2_on': {'computations': sum(r[field] == group and r['mode'] == 'on' for r in c2),
                'with_elimination': sum(r[field] == group and r['mode'] == 'on' and r['eliminated_candidates'] > 0 for r in c2),
                'eliminated_candidates': sum(r['eliminated_candidates'] for r in c2 if r[field] == group and r['mode'] == 'on')},
            'P3': {'observed': sum(r[field] == group for r in p3), 'used': sum(r[field] == group and r['used'] is True for r in p3),
                'best_changed': sum(r[field] == group and r['best_changed'] for r in p3),
                'fallback_reasons': dict(C.Counter(r['reason'] for r in p3 if r[field] == group and r['used'] is not True))},
            'low_trust': {lane: ratio(sum(r['low'] for r in trust if r[field] == group and r['lane'] == lane),sum(r[field] == group and r['lane'] == lane for r in trust)) for lane in ('b2','b3')}}

    for name, rows in [('runs.csv', run_rows), ('bosses.csv', boss_rows), ('jev.csv', jev), ('p2.csv', p2), ('P1-choices.csv', choices),
                       ('C1.csv', c1), ('C2.csv', c2), ('P3.csv', p3), ('trust.csv', trust), ('releases.csv', release_rows)]: csvout(name, rows)
    result = {'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'cutoff': freeze['at'], 'summaries': summaries,
              'brain_choice_links': dict(brain_links), 'single_sided_fisher_pre_higher_win_rate': math.comb(25,3) / math.comb(49,3),
              'engine_sensitivity': {g: {'runs': sum(r['cohort'] == g and r['engine_eligible'] for r in run_rows),
                   'wins': sum(r['cohort'] == g and r['engine_eligible'] and r['victory'] for r in run_rows),
                   'boss_final': ratio(sum(r['final_outcome'] == 'won' for r in boss_rows if r['cohort'] == g and runs[r['run_id']]['brain_source']['eligible']),sum(r['cohort'] == g and runs[r['run_id']]['brain_source']['eligible'] for r in boss_rows))} for g in ('pre','post')},
              'descriptive_only': True, 'first_attempt_limits': 'Predicted-death SL exits are recorded separately from observed deaths. Binary first-completion labels require a confirmed reload or later logged attempt. Strict observed-only scores are selection biased and separately shown.',
              'counterfactual_limits': 'No unchosen action outcome, C2 full-run comparison in on mode, mechanism discovery, or causal attribution is invented.'}
    (BASE / 'analysis.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'cohort': {k: {a:v for a,v in s.items() if a in ('runs','victories','boss_final','run_deaths','prediction_score','P2_best_group','P3','C1','C2_on','low_trust','choices','jev_exact_all')} for k,s in summaries.items()},'brain_links':dict(brain_links)},ensure_ascii=False))


if __name__ == '__main__':
    main()
