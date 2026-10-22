"""Verify publication facts against exact CSV fragments and ledger CLI readbacks."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
refs = {r['id']: r for r in map(json.loads, (HERE / 'evidence-refs.jsonl').read_text().splitlines())}
entries = json.loads((ROOT / 'knowledge/characters/silent/strategy-entries.json').read_text())['entries']
new = json.loads((HERE / 'proposed-entries.json').read_text())
ledger = {r['entry_id']: r for r in json.loads((HERE / 'ledger-ids.json').read_text())}
checked = []
for e in new:
    assert e == next(x for x in entries if x['id'] == e['id'])
    assert e['confidence'] <= 0.49 and e['source'] == 'external:sts2fun'
    own = []
    for ev in e['evidence']:
        assert ev['type'] == 'external_aggregate' and not {'run', 'floor'} & ev.keys()
        ref = refs[ev['ref'].split('#')[1]]
        with Path(ref['path']).open('rb') as handle:
            handle.seek(ref['offset'])
            b = handle.read(ref['bytes'])
        assert hashlib.sha256(b).hexdigest() == ref['sha256']
        assert float(ref['row'][ev['statistic']['name']]) == ev['statistic']['value']
        key = 'matched_offers' if ev['statistic']['name'] == 'player_act_adjusted_difference' else (
            'offered' if ev['denominator']['unit'] == 'offers' else (
                'screens' if ev['denominator']['unit'] == 'rewards' else 'gross_damage_n'))
        assert int(ref['row'][key]) == ev['denominator']['n']
        if ev['statistic']['name'] == 'gross_damage_p90':
            assert 'interval' not in ev
            assert ref['row']['gross_damage_unknown'] == '0'
            assert ref['row']['gross_damage_n'] == ref['row']['independent_runs']
        own.append({'ref': ev['ref'], 'statistic': ev['statistic'], 'denominator': ev['denominator'], 'sha_verified': True})
    shown = json.loads((HERE / ledger[e['id']]['show']).read_text())
    assert shown['evidence_summary']['own_runs'] == shown['evidence_summary']['own_support_runs'] == 0
    assert len(shown['evidence_summary']['external']) == len(e['evidence'])
    assert all(ev.get('role') != 'contradict' for ev in shown['evidence'])
    assert [{k: v for k, v in ev.items() if k != 'added'} for ev in shown['evidence']] == e['evidence']
    checked.append({'id': e['id'], 'ledger_id': shown['id'], 'own_runs': 0, 'own_support_runs': 0,
                    'confidence': e['confidence'], 'fragments': own})
result = {'passed': True, 'new_entries': checked, 'semantic_conflict': 'No contradiction identified in scoped dedup; unreviewed historical evidence not assessed.',
          'causal_effect': None, 'whole_shared_ledger_provenance': 'Not validated beyond frozen inventory; shape-only CLI check passed, frozen-runs check retained with 3 later-run references.'}
(HERE / 'content-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'passed': True, 'new_entries': len(checked), 'external_statistics': sum(len(e['evidence']) for e in new), 'new_own_support_runs': 0}))
