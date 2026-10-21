"""Fixed-cohort audit, never an API caller or a counterfactual outcome estimate."""
import collections
import gzip
import importlib.util
import json
import math
from pathlib import Path
import statistics

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
spec = importlib.util.spec_from_file_location('opening_value', ROOT / 'knowledge/builders/opening_value.py')
ov = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ov)


def read_gzip(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def percentiles(values):
    values = sorted(values)
    return {'n': len(values), **({k: values[min(len(values)-1, math.ceil(p*len(values))-1)]
        for k, p in [('p50', .5), ('p90', .9), ('max', 1)]} if values else {})}


def pearson(x, y):
    if len(x) < 3:
        return None
    mx, my = statistics.mean(x), statistics.mean(y)
    xx, yy = sum((v-mx)**2 for v in x), sum((v-my)**2 for v in y)
    return sum((a-mx)*(b-my) for a,b in zip(x,y)) / math.sqrt(xx*yy) if xx*yy else None


def ranks(values):
    positions = collections.defaultdict(list)
    for i, v in enumerate(sorted(values)):
        positions[v].append(i)
    return [statistics.mean(positions[v]) for v in values]


def correlation(x, y):
    return {'n': len(x), 'pearson': pearson(x,y), 'spearman': pearson(ranks(x),ranks(y))}


def cohort(rows):
    best = lambda r: max(o['saved_hp'] for o in r['table']['options'] if o['known'])
    chosen = lambda r: next(o for o in r['table']['options'] if o['id'] == r['brain_choice'])
    return {'n': len(rows), 'runs': len({r['run'] for r in rows}),
        'known_options': sum(o['known'] for r in rows for o in r['table']['options']),
        'total_options': sum(len(r['table']['options']) for r in rows),
        'brain_matches_mean_best': sum(abs(chosen(r)['saved_hp']-best(r)) < 1e-8 for r in rows),
        'brain_skip': sum(r['brain_choice']=='skip' for r in rows),
        'mean_best_includes_skip': sum(abs(best(r)) < 1e-8 for r in rows),
        'all_four_mean_tie': sum(max(o['saved_hp'] for o in r['table']['options'])-min(o['saved_hp'] for o in r['table']['options']) < 1e-8 for r in rows),
        'tiers': dict(collections.Counter(o['tier'] for r in rows for o in r['table']['options'])),
        'B_nonempty_questions': sum(any(c['bosses'] for c in r['table']['cores']) for r in rows),
        'B_core_rows': dict(collections.Counter('known' if c['bosses'] else ';'.join(c['unknown']) for r in rows for c in r['table']['cores'])),
        'prepare_ms': percentiles([r['foreground_ms'] for r in rows]),
        'value_ms': percentiles([r['value_ms'] for r in rows]),
        'packing_ms': percentiles([r['packing_ms'] for r in rows]),
        'replay_setup_ms_separate': percentiles([r['setup_ms'] for r in rows]),
        'request_bytes': percentiles([r['bytes'] for r in rows])}


def main():
    groups = {name: [read_gzip(p) for p in sorted((HERE/directory).glob('*.json.gz'))]
              for name,directory in [('R408_R409','results'),('R404_R406','results-extra')]}
    rows = groups['R408_R409'] + groups['R404_R406']
    all_questions = sum([read_gzip(HERE/d/'questions.json.gz') for d in ['frozen','frozen-extra']], [])
    qmap = {q['key']: q for q in all_questions}
    report = {'schema':'card-value-v2-audit-v1', 'cohorts':{name:cohort(v) for name,v in groups.items()},
              'combined':cohort(rows), 'per_run':{rid:cohort([r for r in rows if r['run']==rid]) for rid in sorted({r['run'] for r in rows})}}
    requests = [r for r in rows if 'jev' in r]
    valid = [r for r in requests if r['jev'].get('validated')]
    cases = []
    for r in valid:
        opts = {o['id']:o for o in r['table']['options']}
        j = opts[r['jev']['validated']['choice']]
        b = opts[r['brain_choice']]
        best = max(o['saved_hp'] for o in opts.values())
        leaders = [o for o in opts.values() if abs(o['saved_hp']-best)<1e-8]
        cases.append({'key':r['key'], 'brain':b['id'], 'jev':j['id'], 'best':[o['id'] for o in leaders],
                      'brain_saved_hp':b['saved_hp'], 'jev_saved_hp':j['saved_hp'], 'regret':best-j['saved_hp'],
                      'error_separated':all(best-j['saved_hp'] > o['error']+j['error'] for o in leaders),
                      'confidence':r['jev']['validated'].get('confidence'),
                      'options':[{k:o[k] for k in ['id','card','saved_hp','error','tier','rank']} for o in opts.values()]})
    disagreements = [c for c in cases if c['brain']!=c['jev']]
    report['nova'] = {'attempts':len(requests), 'valid':len(valid),
        'errors':[{'key':r['key'], 'error':r['jev'].get('error')} for r in requests if not r['jev'].get('validated')],
        'mean_best_agreement':sum(c['regret']<1e-8 for c in cases),
        'below_mean_best':sum(c['regret']>=1e-8 for c in cases),
        'error_separated_inversions':sum(c['error_separated'] for c in cases),
        'brain_agreement':sum(c['brain']==c['jev'] for c in cases),
        'jev_skip':sum(c['jev']=='skip' for c in cases), 'brain_skip':sum(c['brain']=='skip' for c in cases),
        'disagreements':{'n':len(disagreements), 'jev_higher_predicted_mean':sum(c['jev_saved_hp']-c['brain_saved_hp']>1e-8 for c in disagreements),
                         'brain_higher_predicted_mean':sum(c['brain_saved_hp']-c['jev_saved_hp']>1e-8 for c in disagreements),
                         'tied':sum(abs(c['brain_saved_hp']-c['jev_saved_hp'])<=1e-8 for c in disagreements)},
        'confidence':percentiles([c['confidence'] for c in cases if isinstance(c['confidence'],(int,float))]),
        'prepare_ms':percentiles([r['foreground_ms'] for r in valid]),
        'jev_wall_ms':percentiles([r['jev_wall_ms'] for r in valid]),
        'bytes':percentiles([r['bytes'] for r in valid]), 'cases':cases}

    model = json.loads((ROOT/'knowledge/characters/silent/opening-value.json').read_text())
    opening_rows = ROOT/'.cache/v2/openings.jsonl'
    if opening_rows.exists():
        with opening_rows.open() as source:
            observed = [json.loads(line) for line in source]
    else:
        observed = read_gzip(HERE/'frozen/chronological-opening-rows.json.gz')
    rids = {r['run'] for r in rows}
    # No run in this chronological check was eligible for the training/calibration/test split.
    actual = [f for f in observed if f['run'] in rids and f['ts'] >= model['training_cutoff']]
    predictions = []
    for f in actual:
        x = ov.features(f['input'], f['encounter'], f['kind'], model['features'])
        p = {k:ov.predict(v,x) for k,v in model['models'].items()}
        p['hp_loss'] = max(0,min(f['input']['hp'],p['hp_loss']))
        p['turns'] = max(1,p['turns'])
        predictions.append(p)
    report['chronological_actual_opening_validation'] = {'metrics':ov.errors(actual,predictions),
        'HP_prediction_vs_actual':correlation([p['hp_loss'] for p in predictions],[f['hp_loss'] for f in actual]),
        'description':'Actual opening deck/HP/enemy, NOT the reward counterfactual or a candidate-ranking test.'}
    linked, omissions = [], []
    for r in rows:
        q = qmap[r['key']]
        ts = q['frame'].get('observed_ts') or q['frame']['ts']
        act = int(str(q['frame']['state']['run']['act_id']))+1
        candidates = sorted([f for f in actual if f['run']==r['run'] and f['ts']>ts and f['input']['floor']>r['floor'] and f['input']['act']==act],key=lambda f:f['ts'])
        if not candidates:
            omissions.append({'key':r['key'],'reason':'no_later_first_attempt_fight_in_same_act_within_frozen_prefix'})
            continue
        f = candidates[0]
        o = next(o for o in r['table']['options'] if o['id']==r['brain_choice'])
        matching = next((t for t in o['targets'] if t['id']==f['encounter']),None)
        linked.append({'key':r['key'],'run':r['run'],'brain':r['brain_choice'],'next_fight':f['key'],
                       'next_kind':f['kind'],'next_actual_loss':f['hp_loss'],'next_win':f['win'],
                       'chosen_current_act_saved_HP':o['saved_hp'],'chosen_mean_rank':o['rank'],
                       'next_target_predicted_loss':matching['hp_loss'] if matching else None,
                       'caveats':'Observed historical policy; future state/HP/deck/path changes, repeated overlapping outcomes and survival confounding.'})
    matched = [r for r in linked if r['next_target_predicted_loss'] is not None]
    report['observational_reward_signal'] = {'linked_questions':len(linked),'unique_next_fights':len({tuple(r['next_fight']) for r in linked}),
        'omissions':omissions, 'chosen_saved_HP_vs_next_actual_loss':correlation([r['chosen_current_act_saved_HP'] for r in linked],[r['next_actual_loss'] for r in linked]),
        'chosen_mean_rank_vs_next_actual_loss':correlation([r['chosen_mean_rank'] for r in linked],[r['next_actual_loss'] for r in linked]),
        'reward_predicted_target_loss_vs_next_actual_loss':correlation([r['next_target_predicted_loss'] for r in matched],[r['next_actual_loss'] for r in matched]),
        'rows':linked,'limitation':'Descriptive only. Only the taken option has an outcome; the same fight can follow several rewards. No causal card-effect or counterfactual ranking validation.'}
    (HERE/'analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    with gzip.open(HERE/'frozen/chronological-opening-rows.json.gz','wt') as dest:
        json.dump(actual,dest,ensure_ascii=False,separators=(',',':'))
    summary = {k:v for k,v in report.items() if k not in ['per_run','observational_reward_signal','nova']}
    summary['nova']={k:v for k,v in report['nova'].items() if k!='cases'}
    summary['observational_reward_signal']={k:v for k,v in report['observational_reward_signal'].items() if k not in ['rows','omissions']}
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
