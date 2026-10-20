"""Recheck frozen requests/results only. Does not call Nova, simulate, or read live logs."""
import gzip
import hashlib
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIELDS = ('death_rate', 'hp_loss', 'damage_per_turn', 'turns', 'losing_enemy_hp_fraction')

def read(name):
    return json.load(gzip.open(HERE / 'frozen' / (name + '.json.gz'), 'rt'))

def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()

def same_cells(shown, raw):
    if len(shown) != len(raw):
        return False
    for actual, value in zip(shown, raw):
        if actual is None or value is None:
            if actual is not None or value is not None:
                return False
            continue
        for index, expected in enumerate((value['mean'], value['se'], value['n'])):
            if actual[index] is None or expected is None:
                if actual[index] is not None or expected is not None:
                    return False
            elif index == 2 or expected == 0:
                if actual[index] != expected:
                    return False
            else:
                digits = 5 if index == 0 else 3
                tolerance = .50001 * 10 ** (math.floor(math.log10(abs(expected))) - digits + 1)
                if abs(actual[index] - expected) > tolerance:
                    return False
    return True

def audit(request, table, choice):
    bodies = {k: json.loads(v) for k, v in request['questions']['pick']['criteria'].items()}
    assert all(v['columns'] == list(FIELDS) for v in bodies.values())
    targets = request['state']['targets']
    def tid(index):
        return targets[index]['id'] if isinstance(index, int) else index
    rows = {key: {tid(row['target']): row for row in body['A_vs_skip']} for key, body in bodies.items()}
    originals = {(row['option_id'], row['target_id']): row for row in table['immediate']}
    mismatches = []
    for key, rs in rows.items():
        for target, row in rs.items():
            expected = [originals[key, target]['paired_delta'][metric] for metric in FIELDS]
            if not same_cells(row['delta'], expected):
                mismatches.append([key, target, 'A_delta'])
            equal = [i for i, metric in enumerate(FIELDS) if all(originals[k, target]['metrics'][metric] is not None for k in bodies)
                     and len({originals[k, target]['metrics'][metric]['mean'] for k in bodies}) == 1]
            if row.get('equal_option_means', []) != equal:
                mismatches.append([key, target, 'equal_option_means'])
        for core in bodies[key]['B_progress']:
            for shown in core['results']:
                original = next(r for r in table['long_term'] if r['direction_id'] == core['direction'] and r['combo_id'] == core['core'] and r['target_id'] == tid(shown['target']))
                for shown_key, raw_key in [('result', 'metrics'), ('vs_current_deck', 'paired_delta')]:
                    if not same_cells(shown[shown_key], [original[raw_key][metric] for metric in FIELDS]):
                        mismatches.append([key, core['core'], tid(shown['target']), shown_key])
    current = [t['id'] for t in targets if t['kind'] == 'current']
    elites = [t['id'] for t in targets if t['kind'] == 'elite']
    assert len(current) == 1 and elites
    def diagnose(boss_weight):
        weights = {current[0]: boss_weight, **{t: (1-boss_weight)/len(elites) for t in elites}}
        weights = {t:w for t,w in weights.items() if w > 0}
        summaries = {}
        all_loss = all(originals[k, t]['metrics']['death_rate'] is not None and originals[k, t]['metrics']['death_rate']['mean'] == 1 for k in bodies for t in weights)
        for key, rs in rows.items():
            totals = {}
            for i, metric in enumerate(FIELDS):
                values = [(w, rs[t]['delta'][i]) for t, w in weights.items()]
                totals[metric] = None if any(v is None for _, v in values) else {
                    'mean': sum(w*v[0] for w,v in values),
                    'se_upper_bound': None if any(v[1] is None for _,v in values) else sum(w*v[1] for w,v in values),
                    'n_min': min(v[2] for _,v in values)}
            order_fields = [('death_rate', 1), ('hp_loss', 1)]
            if all_loss:
                order_fields.append(('losing_enemy_hp_fraction', 1))
            order_fields.append(('damage_per_turn', -1))
            known = all(totals[m] is not None for m,_ in order_fields)
            score = [round(sign*totals[m]['mean'], 10) for m,sign in order_fields] if known else None
            summaries[key] = {'aggregates': totals, 'score': score}
        complete = all(v['score'] is not None for v in summaries.values())
        # Unknown options are never assigned zero or dropped to manufacture an overall rank.
        best = [k for k,v in summaries.items() if v['score'] == min(s['score'] for s in summaries.values())] if complete else None
        strong, dominated = [], []
        chosen = summaries[choice]['aggregates']
        comparable = 0
        for key, summary in summaries.items():
            if key == choice:
                continue
            better = summary['aggregates']
            ms = ('death_rate','hp_loss','damage_per_turn')
            if any(chosen[m] is None or better[m] is None for m in ms):
                continue
            comparable += 1
            oriented = {m: (-1 if m == 'damage_per_turn' else 1)*(better[m]['mean']-chosen[m]['mean']) for m in ms}
            if all(v <= 1e-10 for v in oriented.values()) and any(v < -1e-10 for v in oriented.values()):
                dominated.append(key)
            if all(better[m]['se_upper_bound'] is not None and chosen[m]['se_upper_bound'] is not None
                   and oriented[m]+1.96*(better[m]['se_upper_bound']+chosen[m]['se_upper_bound']) < 0 for m in ('death_rate','hp_loss')) and oriented['damage_per_turn'] < 0:
                strong.append(key)
        return {'best':best, 'chosen_is_best':None if best is None else choice in best,
                'all_options_complete':complete, 'comparable_alternatives':comparable,
                'strong_conflicts':strong,'mean_dominated_by':dominated,'options':summaries}
    wire = len(compact({'model':'typesafe/jev-1.14', **request}))
    assert wire <= 24000 and not mismatches, {"wire":wire,"mismatches":mismatches}
    return {'choice':choice,'wire_bytes':wire, 'display_mismatches':mismatches,
            'B_numeric_in_criteria':sum(len(c['results']) for v in bodies.values() for c in v['B_progress']),
            'B_full_numeric':sum(any(v is not None for v in row['metrics'].values()) for row in table['long_term']),
            'B_cache':table['telemetry'].get('long_term_cache'),
            'primary':diagnose(.5),'boss_only':diagnose(1),
            'sensitivity':{str(w):diagnose(w)['best'] for w in (0,.25,.5,.75,1)}}

def main():
    prepared, tables, answers = read('prepared-r2'), read('tables-r2'), read('answers-r2')
    runtime, runtime_answers = read('runtime-results'), read('runtime-answers')
    rows = []
    for label, requests, responses in [('r2',prepared,answers),('runtime',runtime,runtime_answers)]:
        for req, answer in zip(requests,responses):
            assert req['key'] == answer['key'] and answer['ok']
            if label == 'r2':
                assert hashlib.sha256(compact(req['request'])).hexdigest() == req['sha256'] == answer['request_sha256']
                table = next(t['table'] for t in tables if t['key'] == req['key'])
            else:
                table = req['table']
            row = audit(req['request'], table, answer['answers']['pick']['choice'])
            row.update(key=req['key'],batch=label,source=req.get('source','R408_production_runtime'),jev_ms=answer['elapsed_ms'],confidence=answer['answers']['pick']['confidence'])
            if label == 'runtime':
                row.update(preparation_and_format_ms=req['total_ms'],runtime_ms=req['runtime_ms'],format_ms=req['format_ms'],known=req['known'])
            rows.append(row)
    original = json.loads((HERE/'frozen/original-results.json').read_text())
    for row in rows[:12]:
        prior = next(x for x in original if row['key'] == f"{x['run']}-f{x['floor']}")
        assert set(prior['sensitivity']['0.5']['best']) == set(row['primary']['best'])
    summary = {'requests':len(rows),'situations':14,'success':16,'http_400':0,'timeout':0,
               'R407':{'questions':12,'matches_primary':sum(r['primary']['chosen_is_best'] is True for r in rows[:12]),
                       'strong_conflicts':sum(bool(r['primary']['strong_conflicts']) for r in rows[:12])},
               'strong_conflicts_all':sum(bool(r['primary']['strong_conflicts']) for r in rows),
               'primary_not_fully_rankable':[r['batch']+':'+r['key'] for r in rows if not r['primary']['all_options_complete']],
               'wire_max_bytes':max(r['wire_bytes'] for r in rows),'jev_ms_min':min(r['jev_ms'] for r in rows),'jev_ms_max':max(r['jev_ms'] for r in rows),
               'display_mismatches':sum(len(r['display_mismatches']) for r in rows)}
    for name,value in [('analysis-results.json',rows),('analysis-summary.json',summary)]:
        (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    for r in rows:
        print(r['batch'],r['key'],r['choice'],'best',r['primary']['best'],'boss',r['boss_only']['best'],'strong',r['primary']['strong_conflicts'],'mean_dominated',r['primary']['mean_dominated_by'])

if __name__ == '__main__':
    main()
