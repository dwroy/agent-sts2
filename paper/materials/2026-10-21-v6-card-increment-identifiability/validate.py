"""Targeted fixed-data checks; deliberately does not invoke the game or full suite."""
import argparse
import collections
import hashlib
import json
import random
import study as s


def baseline():
    ov, legacy, original, _, _, train = s.load()
    names = original['features']
    X = [ov.features(r['input'],r['encounter'],r['kind'],names) for r in train]
    m = legacy.GBM('l2',trees=150,depth=3,min_leaf=20,seed=7)
    m.fit(X,[r['hp_loss'] for r in train],names)
    exported = m.export()
    result = {'exact_original_hp_model_match':exported==original['models']['hp_loss'],
              'training_fights':len(train),'training_runs':len({r['run'] for r in train}),
              'features':len(names),'trees':len(exported['trees'])}
    s.write(s.HERE/'checks/baseline-training.json',result)
    assert result['exact_original_hp_model_match'], result
    print(json.dumps(result),flush=True)


def final():
    from analyze import distribution
    ov, _, original, questions, _, train = s.load()
    expected_runs = sorted({r['run'] for r in train})
    fight_counts = collections.Counter(r['run'] for r in train)
    baseline_receipt = s.read(s.HERE/'checks/baseline-training.json')
    assert baseline_receipt['exact_original_hp_model_match']
    assert not s.read(s.HERE/'checks/original-replay.json')['mismatches']
    assert distribution([1.]*20)['stable95']=='positive'
    assert distribution([-1.]*20)['stable95']=='negative'
    assert distribution([1.]*10+[-1.]*10)['stable95']=='unresolved'
    assert distribution([0.]*20)['stable95']=='unresolved'
    values = collections.defaultdict(list)
    for i in range(1,21):
        rep = s.read(s.HERE/f'bootstrap/replicate-{i:02}.json.gz')
        rng = random.Random(120000+i)
        assert rep['run_draw']==[rng.choice(expected_runs) for _ in expected_runs]
        assert rep['unique_runs']==len(set(rep['run_draw']))
        assert rep['fights_including_duplicates']==sum(fight_counts[r] for r in rep['run_draw'])
        assert len(rep['model']['trees'])==150 and rep['model']['lr']==.08
        assert len(rep['delta'])==len({(d['key'],d['id']) for d in rep['delta']})==438
        assert rep['feature_sha256']==hashlib.sha256(json.dumps(original['features']).encode()).hexdigest()
        for d in rep['delta']:
            values[d['key'],d['id']].append(d['delta'])
    candidates = s.read(s.HERE/'candidate-results.json.gz')
    qs = s.read(s.HERE/'question-results.json.gz')
    assert len(candidates)==438 and len(qs)==146
    for c in candidates:
        assert c['stability']==distribution(values[c['question_id'],c['id']])
        assert abs(sum(c['support']['shapley'].values())-c['original_delta'])<1e-7
    assert len({q['question_id'] for q in qs})==len(questions)
    assert len({q['run'] for q in qs})==10
    for q in qs:
        assert len(q['robust_winners']) <= 1
        assert not q['robust_winners'] or q['robust_winners']==q['original_winners']
        expected = [i for i in q['pairwise'] if q['original_winners']==[i] and
                    all(d['stable95']=='positive' for d in q['pairwise'][i].values())]
        assert q['robust_winners']==expected
        assert not q['boss_already_passed'] or q['boss_passed'] is None
        assert len(q['remaining_keys'])==len({tuple(k) for k in q['remaining_keys']})
        assert not q['remaining_complete'] or not q['missing_remaining_fights']
        assert not q['missing_next_opening'] or q['next_loss'] is None
        for option in q['pairwise']:
            for rival in q['pairwise'][option]:
                v = [0.]*20 if option=='skip' else values[q['question_id'],option]
                w = [0.]*20 if rival=='skip' else values[q['question_id'],rival]
                assert q['pairwise'][option][rival]==distribution([a-b for a,b in zip(v,w)])
    summary=s.read(s.HERE/'summary.json')
    for key in ['by_act','by_floor_band','by_card_type','by_deck_band']:
        assert sum(g['candidates'] for g in summary[key].values())==438
        assert sum(sum(g['stable95'].values()) for g in summary[key].values())==438
    assert summary['questions']['robust_winners']==sum(bool(q['robust_winners']) for q in qs)
    assert summary['outcome_coverage']['unique_next_fights']==len({tuple(q['next_fight']) for q in qs if q['next_fight']})
    result={'status':'passed','replicates':20,'candidates':438,'questions':146,'held_out_runs':10,
        'checks':['exact baseline model reproduction','438 original TypeScript delta replays',
         'cluster draws and multiplicities','fixed vocabulary/hyperparameters','sign/quantile edge cases',
         'all candidate intervals and option pairwise intervals','Shapley completeness',
         'unique question/fight denominators and missingness gates']}
    s.write(s.HERE/'checks/targeted-validation.json',result)
    print(json.dumps(result),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('phase',choices=['baseline','final'])
    args=p.parse_args()
    baseline() if args.phase=='baseline' else final()
