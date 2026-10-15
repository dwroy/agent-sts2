"""Freeze whitelisted runtime fields using logdb offsets; never scan raw production streams."""
import hashlib
import importlib.util
import json
from pathlib import Path
from datetime import datetime

ROOT = Path('/home/dw/Projects/agent-sts2')
INPUT = ROOT / 'paper/materials/20261015-v5-s-completion'
OUT = ROOT / 'paper/materials/20261015-s-decision-eval/frozen-runtime'
OUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('report', ROOT / '.worktrees/s-decision-eval-20261015/eval/s_decision.py')
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


def write(name, value):
    path = OUT / name
    assert not path.exists(), 'frozen output already exists: ' + name
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def load(name):
    path = INPUT / name
    return report.exported_rows(json.loads(path.read_bytes()))


configs = []
with (ROOT / 'logs/run-config.jsonl').open('rb') as handle:
    for row in load('runtime-config-index.json'):
        if row['run_id'] not in ('W1YY8PEWGUF9', 'X7REGM0RUNSA'):
            continue
        handle.seek(row['off']); raw = handle.read(row['len']); value = json.loads(raw)
        assert value['run_id'] == row['run_id'] and value['character'] == 'SILENT'
        configs.append({'run_id': value['run_id'], 'ts': value['ts'], 'character': value['character'],
                        'code': value['code'], 'loop': value['loop'], 'process': value['process'],
                        'source': {'path': 'logs/run-config.jsonl', 'offset': row['off'], 'bytes': row['len'], 'sha256': hashlib.sha256(raw).hexdigest()}})
fights, attempts = load('runtime-fights.json'), load('runtime-attempts.json')
computations, calls, predictions, overrides, raw_refs, excluded = [], [], [], [], [], []
prediction_seen = set()
with (ROOT / 'logs/decisions.jsonl').open('rb') as handle:
    for row in load('runtime-decision-index.json'):
        possible = [c for c in configs if c['run_id'] == row['run_id'] and report.instant(c['ts']) <= report.instant(row['ts'])]
        if not possible:
            excluded.append({'offset': row['off'], 'reason': 'before frozen native R341/C1 configuration'})
            continue
        config = max(possible, key=lambda c: report.instant(c['ts']))
        handle.seek(row['off']); raw = handle.read(row['len']); value = json.loads(raw)
        assert value['run_id'] == row['run_id'] and report.instant(value['ts']) == report.instant(row['ts'])
        cohort = 'R341-native-pre-S' if row['run_id'] == 'W1YY8PEWGUF9' else 'C1-C2-shadow-R351'
        source = {'path': 'logs/decisions.jsonl', 'offset': row['off'], 'bytes': row['len'], 'sha256': hashlib.sha256(raw).hexdigest()}
        raw_refs.append(source)
        common = {'character': 'SILENT', 'run_id': row['run_id'], 'cohort': cohort, 'ts': value['ts'],
                  'floor': row['floor'], 'native_commit': config['code']['commit'], 'source': source}
        sim = value.get('boss_sim') or {}
        completion = sim.get('completion') or {}
        if sim and (completion.get('required') is True or sim.get('available') is True and sim.get('requested') == 600):
            computations.append({**common, 'attempt_id': completion.get('attempt_id') or value['decision_id'],
                                 'question_id': value['decision_id'], 'required': True, 'lane': 'b2' if sim.get('available') is True else 'b3',
                                 'status': completion.get('status') or ('complete' if sim.get('samples') == sim.get('requested') else 'unknown'),
                                 'elapsed_ms': sim.get('ms'), 'samples': sim.get('samples'), 'requested': sim.get('requested'),
                                 'required_binding': 'original mandatory source ancestor plus600 B2 target' if not completion else 'original completion.required'})
        if (row.get('latency_jev_ms') or 0) > 0 and row.get('reused_answer') is False and row.get('no_jev') is False:
            usage = value.get('usage') or {}
            calls.append({**common, 'call_id': value['decision_id'], 'provider': 'jev', 'request_ids': value.get('request_ids'),
                          'input_tokens': usage.get('input_tokens') if value.get('decider') == 'jev' else None,
                          'output_tokens': usage.get('output_tokens') if value.get('decider') == 'jev' else None,
                          'latency_ms': row['latency_jev_ms']})
        if sim.get('available') is True and row.get('turn') == 1:
            same = [a for a in attempts if a['run_id'] == row['run_id'] and a['floor'] == row['floor']]
            matched = [a for a in same if report.instant(a['started_at']) <= report.instant(row['ts']) <= report.instant(a['ended_at'])]
            attempt = matched[0]['attempt'] if len(matched) == 1 else 1 if not same else None
            choice = (value.get('answers') or {}).get('plan', {}).get('choice')
            line = (sim.get('lines') or {}).get(choice) or {}
            audit = value.get('selection_audit') or {}
            intended = (audit.get('answer') or {}).get('planned_steps')
            executed = (audit.get('after_sl') or {}).get('planned_steps')
            dispatched = value.get('selection_dispatch') or {}
            outcome = report.link_outcome({**row, 'attempt': attempt}, fights, attempts)
            unique = (row['run_id'], row['floor'], attempt)
            encounter = [f for f in fights if f['run_id'] == row['run_id'] and f['floor'] == row['floor']]
            valid_boss = len(encounter) == 1 and sim.get('boss') in encounter[0]['monsters']
            if (unique not in prediction_seen and valid_boss and attempt is not None and intended and intended == executed
                    and dispatched.get('returned_status') == 'completed' and report.number(line.get('cal'))):
                prediction_seen.add(unique)
                predictions.append({**common, 'prediction_id': value['decision_id'], 'boss': sim['boss'], 'ascension': encounter[0]['ascension'],
                                    'attempt': attempt, 'probability': line['cal'], 'binding': 'exact_boss_attempt', 'outcome': outcome['outcome'],
                                    'outcome_binding': outcome, 'selected_plan': choice,
                                    'scope': 'earliest recorded T1 selected conditional-model plan with completed first action; whole-plan execution remains unknown'})
        ranking = sim.get('build_ranking') or {}
        if ranking:
            selection = ranking.get('selection') or {}
            overrides.append({**common, 'question_id': value['decision_id'], 'mode': ranking.get('mode'), 'boss': sim.get('boss'),
                              'ascension': sim.get('asc'), 'deviated': selection.get('deviated'), 'target_pending': selection.get('target_pending'),
                              'reason': selection.get('ranking_override_reason'), 'outcome': None, 'outcome_binding': None})
refs = [write('native-config-bindings.json', configs), write('decision-byte-refs.json', raw_refs), write('fights.json', fights),
        write('attempts.json', attempts), write('excluded.json', excluded)]
for name in ('runtime-config-index.json', 'runtime-decision-index.json', 'runtime-fights.json', 'runtime-attempts.json'):
    path = INPUT / name
    refs.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
value = {'schema': 's-decision-runtime-v1', 'at': datetime.now().astimezone().isoformat(), 'source_refs': refs,
         'coverage': {'complete': False, 'runs': ['W1YY8PEWGUF9', 'X7REGM0RUNSA'], 'decision_rows': len(raw_refs),
                      'baseline': 'W1 resumed native R341 ancestors at10:27UTC and11:40UTC; earlier run rows excluded',
                      'current': 'X7 completed R351 C1/C2-shadow only; no P1/P3/P2 new natural consumer yet',
                      'calls': 'decision-call records; request_ids retained. Failed requests without a decision may be absent',
                      'predictions': 'earliest available T1 selected-plan model probability per exact actual Boss attempt; whole-plan execution not claimed'},
         'cohorts': ['R341-native-pre-S', 'C1-C2-shadow-R351'], 'computations': computations, 'jev_calls': calls,
         'predictions': predictions, 'overrides': overrides}
write('runtime.json', value)
print(json.dumps({'decisions': len(raw_refs), 'computations': len(computations), 'jev_records': len(calls), 'predictions': len(predictions), 'overrides': len(overrides)}))
