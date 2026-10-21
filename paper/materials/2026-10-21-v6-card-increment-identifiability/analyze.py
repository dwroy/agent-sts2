"""Descriptive audit of fixed reward questions and run-cluster bootstraps."""
import argparse
import collections
import gzip
import itertools
import math
import json
import random
import statistics
import study as s


def quantile(values, p):
    a = sorted(values)
    x = (len(a)-1)*p
    lo = math.floor(x)
    hi = math.ceil(x)
    return a[lo]*(hi-x)+a[hi]*(x-lo) if lo != hi else a[lo]


def distribution(a):
    pos = sum(x > s.EPS for x in a)
    neg = sum(x < -s.EPS for x in a)
    interval = [quantile(a, p) for p in [.025, .05, .5, .95, .975]]
    return {'positive': pos, 'negative': neg, 'zero': len(a)-pos-neg,
            'quantiles_025_05_50_95_975': interval,
            'stable95': 'positive' if pos >= 19 and interval[0] > s.EPS else 'negative' if neg >= 19 and interval[-1] < -s.EPS else 'unresolved',
            'stable90': 'positive' if pos >= 19 and interval[1] > s.EPS else 'negative' if neg >= 19 and interval[-2] < -s.EPS else 'unresolved',
            'unanimous': 'positive' if pos == len(a) else 'negative' if neg == len(a) else 'unresolved'}


def counts(rows):
    return {'candidates': len(rows), 'questions': len({r['question_id'] for r in rows}),
            'runs': len({r['run'] for r in rows}),
            'stable95': dict(collections.Counter(r['stability']['stable95'] for r in rows)),
            'stable90': dict(collections.Counter(r['stability']['stable90'] for r in rows)),
            'unanimous': dict(collections.Counter(r['stability']['unanimous'] for r in rows)),
            'original_positive': sum(r['original_delta'] > s.EPS for r in rows),
            'original_negative': sum(r['original_delta'] < -s.EPS for r in rows),
            'original_zero': sum(abs(r['original_delta']) <= s.EPS for r in rows)}


def grouped(rows, field):
    groups = collections.defaultdict(list)
    for r in rows:
        groups[str(r[field])].append(r)
    return {k: counts(v) for k, v in sorted(groups.items())}


def pearson(x, y):
    if len(x) < 3:
        return None
    mx, my = statistics.mean(x), statistics.mean(y)
    dx, dy = sum((a-mx)**2 for a in x), sum((b-my)**2 for b in y)
    return sum((a-mx)*(b-my) for a,b in zip(x,y))/math.sqrt(dx*dy) if dx*dy > 1e-20 else None


def ranks(x):
    idx = sorted(range(len(x)), key=lambda i: x[i])
    out = [0]*len(x)
    start = 0
    while start < len(x):
        end = start+1
        while end < len(x) and x[idx[end]] == x[idx[start]]:
            end += 1
        for i in idx[start:end]:
            out[i] = (start+end-1)/2
        start = end
    return out


def association(rows, x, y):
    rows = [r for r in rows if r.get(x) is not None and r.get(y) is not None]
    blocks = collections.defaultdict(list)
    for r in rows:
        blocks[r['run']].append(r)
    def corr(rs):
        return pearson([r[x] for r in rs], [r[y] for r in rs])
    per_run = [{x: statistics.mean(r[x] for r in block), y: statistics.mean(r[y] for r in block)} for block in blocks.values()]
    rng = random.Random(912)
    keys = sorted(blocks)
    draws = []
    for _ in range(2000 if len(keys)>=3 else 0):
        rs = [r for k in rng.choices(keys, k=len(keys)) for r in blocks[k]] if keys else []
        v = corr(rs)
        if v is not None:
            draws.append(v)
    return {'questions': len(rows), 'runs': len(blocks), 'pearson_question_weighted': corr(rows),
            'spearman_question_weighted': pearson(ranks([r[x] for r in rows]), ranks([r[y] for r in rows])),
            'pearson_run_means': corr(per_run), 'cluster_bootstrap_valid': len(draws),
            'cluster_bootstrap_95': [quantile(draws,.025),quantile(draws,.975)] if draws else None}


def structural():
    ov, _, original, questions, results, train = s.load()
    items = s.cases(ov, original, questions, results)
    names = original['features']
    hp = original['models']['hp_loss']
    split = collections.Counter()
    def walk(t):
        if isinstance(t, list):
            split[names[t[0]]] += 1
            walk(t[2]); walk(t[3])
    for t in hp['trees']:
        walk(t)
    support = collections.defaultdict(set)
    fights = collections.Counter()
    for r in train:
        for card in {ov.card_key(c) for c in r['input']['deck']}:
            support[card].add(r['run']); fights[card] += 1
    group_names = ['size', 'totals', 'means', 'identity']
    groups = [[i for i,n in enumerate(names) if (n == 'deck:count' if g == 'size' else
                n.startswith('deck:') and n != 'deck:count' if g == 'totals' else
                n.startswith('per_card:') if g == 'means' else n.startswith('card:'))] for g in group_names]
    explained = []
    for c in items:
        # Exact four-group Shapley decomposition of the clamped model delta.
        values = {}
        for mask in range(16):
            indices = [i for g in range(4) if mask & (1 << g) for i in groups[g]]
            def hybrid(x0, x1):
                x = x0.copy()
                for i in indices:
                    x[i] = x1[i]
                return x
            values[mask] = s.delta(ov, hp, c, hybrid)
        phi = []
        for g in range(4):
            value = 0
            for mask in range(16):
                if mask & (1 << g):
                    continue
                k = mask.bit_count()
                weight = math.factorial(k)*math.factorial(3-k)/math.factorial(4)
                value += weight*(values[mask | (1 << g)]-values[mask])
            phi.append(value)
        assert abs(sum(phi)-c['original_delta']) < 1e-7
        card = ov.card_key(c['offer'])
        explained.append({'question_id': c['key'], 'id': c['id'], 'card_id': card,
            'train_runs_with_card': len(support[card]), 'train_fights_with_card': fights[card],
            'identity_in_vocabulary': 'card:'+card in names, 'identity_split_count': split['card:'+card],
            'shapley': dict(zip(group_names,phi)), 'delta': c['original_delta']})
    s.write(s.HERE/'structure.json.gz', {'split_counts': dict(split), 'feature_groups': dict(zip(group_names,map(len,groups))), 'candidates': explained})
    print('structure complete',len(explained), flush=True)


def summarize():
    ov, _, original, questions, results, train = s.load()
    items = s.cases(ov, original, questions, results)
    reps = [s.read(s.HERE/f'bootstrap/replicate-{i:02}.json.gz') for i in range(1,21)]
    assert [r['cluster_seed'] for r in reps] == list(range(120001,120021))
    samples = collections.defaultdict(list)
    for rep in reps:
        assert len(rep['run_draw']) == 260 and len(rep['delta']) == 438
        for v in rep['delta']:
            samples[v['key'],v['id']].append(v['delta'])
    structure = s.read(s.HERE/'structure.json.gz')
    support = {(c['question_id'],c['id']):c for c in structure['candidates']}
    cs = []
    by_question = collections.defaultdict(list)
    for c in items:
        cid = c['key'], c['id']
        d = {k:c[k] for k in ['run','floor','act','id','card','card_type','brain','deck_n','copies','original_delta']}
        d.update(question_id=c['key'],stability=distribution(samples[cid]),
            floor_band=f"{(c['floor']//10)*10:02}-{(c['floor']//10)*10+9:02}",
            deck_band='<=20' if c['deck_n'] <= 20 else '21-30' if c['deck_n'] <= 30 else '>30',
            support=support[cid])
        cs.append(d); by_question[c['key']].append(d)
    rows = s.read(s.MATERIALS/'frozen/chronological-opening-rows.json.gz')
    combat_inventory = {}
    act_inventory = {}
    victories = {}
    last_combat = {}
    episodes = collections.Counter()
    for folder in ['frozen','frozen-extra']:
        for line in gzip.decompress((s.MATERIALS/folder/'states.jsonl.gz').read_bytes()).splitlines():
            frame = json.loads(line)
            st = frame.get('state') or {}
            run = st.get('run') or {}
            if st.get('run_id') and run.get('act_id') is not None:
                ak=(st['run_id'],int(str(run['act_id']))+1)
                act_inventory[ak]=min(act_inventory.get(ak,frame['ts']),frame['ts'])
            if (st.get('game_over') or {}).get('is_victory'):
                victories[st.get('run_id')]=frame['ts']
            if st.get('in_combat') and st.get('run_id') and run.get('floor') is not None:
                key = (st['run_id'],str(run['act_id']),run['floor'])
                combat_inventory[key] = min(combat_inventory.get(key,frame['ts']),frame['ts'])
                if last_combat.get(st['run_id']) != key:
                    episodes[key] += 1
                last_combat[st['run_id']] = key
            else:
                last_combat[st.get('run_id')] = None
    assert not any(n>1 for n in episodes.values()), 'Multi-episode combat requires separate censoring'
    qstats = []
    for q in sorted(questions,key=lambda q:q['key']):
        candidates = by_question[q['key']]
        ids = [r['id'] for r in candidates]+['skip']
        vals = {r['id']:samples[q['key'],r['id']] for r in candidates}; vals['skip']=[0.]*20
        orig = {r['id']:r['original_delta'] for r in candidates}; orig['skip']=0.
        best = max(orig.values())
        winners = [i for i in ids if abs(orig[i]-best)<=s.EPS]
        # A robust winner requires its pairwise 95% interval to exclude every rival.
        pairwise = {i:{j:distribution([a-b for a,b in zip(vals[i],vals[j])]) for j in ids if j!=i} for i in ids}
        bootstrap_robust = [i for i in ids if all(d['stable95']=='positive' for d in pairwise[i].values())]
        robust = [i for i in bootstrap_robust if winners==[i]]
        win_rates = {i:sum(all(v >= vals[j][b]-s.EPS for j in ids) for b,v in enumerate(vals[i]))/20 for i in ids}
        act = candidates[0]['act']
        future = sorted([r for r in rows if r['run']==q['run'] and r['ts']>q['decision']['ts']],key=lambda r:r['ts'])
        nxt = future[0] if future else None
        observed_future = sorted([(ts,k) for k,ts in combat_inventory.items() if k[0]==q['run'] and ts>q['decision']['ts']])
        missed_next = bool(observed_future and (nxt is None or observed_future[0][0] < nxt['ts']) and (nxt is None or list(observed_future[0][1]) != nxt['key']))
        if missed_next:
            nxt = None
        remaining = [r for r in future if r['input']['act']==act]
        # A single won boss encounter does not itself prove the act has ended.
        dead = any(r['win']==0 for r in remaining)
        advanced = any(r['input']['act']>act for r in future) or any(rid==q['run'] and a>act and ts>q['decision']['ts'] for (rid,a),ts in act_inventory.items())
        victory = victories.get(q['run'],'')>q['decision']['ts']
        endpoint = bool(dead or advanced or victory)
        extracted = {tuple(r['key']) for r in remaining}
        missing = [list(k) for ts,k in observed_future if int(k[1])+1==act and k not in extracted]
        complete = endpoint and not missing
        already_passed = any(r['run']==q['run'] and r['input']['act']==act and r['kind']=='boss' and r['win']==1 and r['ended']<=q['decision']['ts'] for r in rows)
        passed = int(advanced or victory) if endpoint and not already_passed else None
        chosen = q['brain_choice']
        chosen_c = next((r for r in candidates if r['id']==chosen),None)
        qstats.append({'question_id':q['key'],'run':q['run'],'floor':q['floor'],'act':act,'brain':chosen,
            'original_winners':winners,'robust_winners':robust,'bootstrap_robust_winners':bootstrap_robust,'winner_rates':win_rates,
            'pairwise':pairwise, 'brain_in_original_best':chosen in winners,'brain_is_robust_best':chosen in robust,
            'brain_rank_original':1+sum(v>orig[chosen]+s.EPS for v in orig.values()),
            'original_regret':best-orig[chosen],
            'any_stable_candidate':any(r['stability']['stable95']!='unresolved' for r in candidates),
            'any_stable_positive':any(r['stability']['stable95']=='positive' for r in candidates),
            'all_stable_negative':all(r['stability']['stable95']=='negative' for r in candidates),
            'chosen_delta':orig[chosen], 'chosen_median':quantile(vals[chosen],.5),
            'chosen_status':chosen_c['stability']['stable95'] if chosen_c else 'skip',
            'next_fight':nxt['key'] if nxt else None,'next_loss':nxt['hp_loss'] if nxt else None,
            'next_same_act':nxt['input']['act']==act if nxt else None,
            'missing_next_opening':missed_next,'missing_remaining_fights':missing,'act_endpoint_observed':endpoint,
            'remaining_keys':[r['key'] for r in remaining],
            'observed_remaining_loss':sum(r['hp_loss'] for r in remaining),
            'remaining_complete':complete,'remaining_loss':sum(r['hp_loss'] for r in remaining) if complete else None,
            'boss_passed':passed,'boss_already_passed':already_passed,'run_act':f"{q['run']}/act{act}"})
    associations = {}
    subsets = {'all':qstats,'any_stable': [q for q in qstats if q['any_stable_candidate']],
        'robust_winner': [q for q in qstats if q['robust_winners']],
        'chosen_stable_non_skip':[q for q in qstats if q['chosen_status'] in ('positive','negative')]}
    for label, qs in subsets.items():
        associations[label] = {y:association(qs,'chosen_median',y) for y in ['next_loss','remaining_loss','boss_passed']}
    rank_associations={label:{y:association(qs,'original_regret',y) for y in ['next_loss','remaining_loss','boss_passed']}
                       for label,qs in subsets.items()}
    rank_groups={}
    for label,pred in [('stable_question_brain_point_best',lambda q:q['any_stable_candidate'] and q['brain_in_original_best']),
        ('stable_question_brain_other',lambda q:q['any_stable_candidate'] and not q['brain_in_original_best']),
        ('robust_best_matches_brain',lambda q:bool(q['robust_winners']) and q['brain_is_robust_best']),
        ('robust_best_differs_brain',lambda q:bool(q['robust_winners']) and not q['brain_is_robust_best'])]:
        subset=[q for q in qstats if pred(q)]
        rank_groups[label]={'questions':len(subset),'runs':len({q['run'] for q in subset}),
            'unique_next_fights':len({tuple(q['next_fight']) for q in subset if q['next_fight']}),
            'unique_run_acts':len({q['run_act'] for q in subset}),
            **{y:{'n':sum(q[y] is not None for q in subset),
                'mean':statistics.mean(q[y] for q in subset if q[y] is not None) if any(q[y] is not None for q in subset) else None}
               for y in ['next_loss','remaining_loss','boss_passed']}}
    outcomes = {}
    for label in ['positive','negative','unresolved','skip']:
        qs = [q for q in qstats if q['chosen_status']==label]
        outcomes[label] = {'questions':len(qs),'runs':len({q['run'] for q in qs}),
            'unique_next_fights':len({tuple(q['next_fight']) for q in qs if q['next_fight']}),
            'unique_run_acts':len({q['run_act'] for q in qs}),
            **{f'{y}_n':sum(q[y] is not None for q in qs) for y in ['next_loss','remaining_loss','boss_passed']},
            **{f'{y}_mean':statistics.mean(q[y] for q in qs if q[y] is not None) if any(q[y] is not None for q in qs) else None for y in ['next_loss','remaining_loss','boss_passed']}}
    summary = {'candidate_counts':counts(cs), 'by_act':grouped(cs,'act'),'by_floor_band':grouped(cs,'floor_band'),
        'by_card_type':grouped(cs,'card_type'),'by_deck_band':grouped(cs,'deck_band'),
        'questions':{'total':len(qstats),'runs':len({q['run'] for q in qstats}),
          **{k:sum(bool(q[k]) for q in qstats) for k in ['any_stable_candidate','any_stable_positive','all_stable_negative','robust_winners','brain_in_original_best','brain_is_robust_best']},
          'original_skip_best_including_ties':sum('skip' in q['original_winners'] for q in qstats),
          'original_unique_skip_best':sum(q['original_winners']==['skip'] for q in qstats),
          'all_four_tied':sum(len(q['original_winners'])==4 for q in qstats),
          'robust_skip_best':sum(q['robust_winners']==['skip'] for q in qstats),
          'robust_card_best':sum(bool(q['robust_winners']) and q['robust_winners']!=['skip'] for q in qstats)},
        'outcome_coverage':{'question_next_fight':sum(q['next_fight'] is not None for q in qstats),
          'unique_next_fights':len({tuple(q['next_fight']) for q in qstats if q['next_fight']}),
          'remaining_complete_questions':sum(q['remaining_complete'] for q in qstats),
          'boss_already_passed_questions':sum(q['boss_already_passed'] for q in qstats),
          'boss_outcome_questions':sum(q['boss_passed'] is not None for q in qstats),
          'observed_combat_keys':len(combat_inventory),
          'same_floor_multi_episode_keys':sum(n>1 for n in episodes.values()),
          'unique_run_acts':len({q['run_act'] for q in qstats}),
          'source_fights':len(rows),'source_runs':len({r['run'] for r in rows})},
        'outcomes_by_chosen_stability':outcomes,'associations':associations,
        'rank_agreement_outcomes':rank_groups,'rank_regret_associations':rank_associations,
        'identity':{'candidate_in_vocabulary':sum(c['identity_in_vocabulary'] for c in structure['candidates']),
          'candidate_identity_used':sum(c['identity_split_count']>0 for c in structure['candidates']),
          'train_runs_support_quantiles':[quantile([c['train_runs_with_card'] for c in structure['candidates']],p) for p in [0,.25,.5,.75,1]],
          'identity_features':sum(n.startswith('card:') for n in original['features']),
          'identity_splits':sum(v for k,v in structure['split_counts'].items() if k.startswith('card:'))},
        'shapley':{},'selection_mixing':{}}
    for label,pred in [('all',lambda c:True),('negative',lambda c:c['delta'] < -s.EPS),('positive',lambda c:c['delta']>s.EPS)]:
        subset = [c for c in structure['candidates'] if pred(c)]
        summary['shapley'][label]={'candidates':len(subset),'sum_delta':sum(c['delta'] for c in subset),
           'sum_contribution':{g:sum(c['shapley'][g] for c in subset) for g in ['size','totals','means','identity']}}
    for group in ['act','floor_band','card_type','deck_band']:
        summary['selection_mixing'][group]={}
        for value in sorted({str(c[group]) for c in cs}):
            groupcs=[c for c in cs if str(c[group])==value]
            qids={c['question_id'] for c in groupcs}
            groupqs=[q for q in qstats if q['question_id'] in qids]
            summary['selection_mixing'][group][value]={'candidates':len(groupcs),'questions':len(groupqs),
                'skip_in_original_best':sum('skip' in q['original_winners'] for q in groupqs),
                'brain_skip':sum(q['brain']=='skip' for q in groupqs),
                'chosen_candidates':sum(c['brain']==c['id'] for c in groupcs),
                'mean_original_delta':statistics.mean(c['original_delta'] for c in groupcs)}
    summary['training_ascensions'] = dict(collections.Counter(str(r['input']['ascension']) for r in train))
    summary['evaluation_ascensions'] = dict(collections.Counter(str(q['frame']['state']['run']['ascension']) for q in questions))
    summary['training_observational_support'] = {}
    for act, band in itertools.product([1,2,3],['<=20','21-30','>30']):
        subset = [r for r in train if r['input']['act']==act and
            ('<=20' if len(r['input']['deck'])<=20 else '21-30' if len(r['input']['deck'])<=30 else '>30')==band]
        if subset:
            summary['training_observational_support'][f'act{act}/{band}']={
                'fights':len(subset),'runs':len({r['run'] for r in subset}),
                'mean_hp_loss':statistics.mean(r['hp_loss'] for r in subset),
                'mean_floor':statistics.mean(r['input']['floor'] for r in subset),
                'mean_opening_hp':statistics.mean(r['input']['hp'] for r in subset)}
    summary['question_groups']={}
    for field in ['act','run']:
        summary['question_groups'][field]={}
        for value in sorted({str(q[field]) for q in qstats}):
            subset=[q for q in qstats if str(q[field])==value]
            summary['question_groups'][field][value]={'questions':len(subset),
                **{k:sum(bool(q[k]) for q in subset) for k in ['any_stable_candidate','any_stable_positive','all_stable_negative','robust_winners','brain_is_robust_best']}}
    s.write(s.HERE/'candidate-results.json.gz',cs)
    s.write(s.HERE/'question-results.json.gz',qstats)
    s.write(s.HERE/'summary.json',summary)
    print('summary complete',summary['candidate_counts'],summary['questions'],flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('phase',choices=['structure','summarize'])
    args=parser.parse_args()
    structural() if args.phase=='structure' else summarize()
