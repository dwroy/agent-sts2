"""Check delivery provenance and unchanged admission gates; no simulations or fitting."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2]
OUT = WORK / 'learner/runs/20261016-global-build-g1a-r1'


def main():
    checks = {}
    refs = json.loads((HERE / 'run-and-sl-evidence.json').read_text())
    with (Path('/home/dw/Projects/agent-sts2/logs/states.jsonl')).open('rb') as states:
        contract = json.loads((HERE / 'continuous-resource-contract.json').read_text())
        for run in contract['runs']:
            for observation in run['observations'].values():
                assert observation is not None
                s = observation['source']
                states.seek(s['offset']); data = states.read(s['bytes'])
                assert hashlib.sha256(data).hexdigest() == s['sha256']
                assert data == Path(s['frozen_path']).read_bytes()
                assert json.loads(data)['state']['run']['character_id'] == 'SILENT'
                assert json.loads(data)['state']['run']['ascension'] == 10
                checks['raw_state_sha'] = checks.get('raw_state_sha', 0) + 1
            assert run['comparison']['max_hp']['equal'] and run['comparison']['deck']['equal']
            assert all(e['id'] for e in run['observations']['second_entry']['enemies'])
            assert any(e.get('result') == 'won' and e.get('floor') == 48 for e in run['attempts'])
        assert contract['contract']['joint_win_probability']['value'] is None
    for s in refs:
        with Path(s['path']).open('rb') as handle:
            handle.seek(s['offset']); data = handle.read(s['bytes'])
        assert hashlib.sha256(data).hexdigest() == s['sha256']
        assert json.loads(data) == s['row']
    checks['run_sl_raw_sha'] = len(refs)
    audit = json.loads((HERE / 'calibration-readback.json').read_text())
    for row in audit['bosses'].values():
        for use, overall in [('b2','t1'),('b3','pre')]:
            r = row['metrics'][use]
            failed = []
            if r['n'] < 10: failed.append('n')
            if r['brier'] > audit['overall'][overall]['brier'] * 1.25: failed.append('brier')
            if abs(r['mean_pred'] - r['actual_win']) > 0.15: failed.append('gap')
            if r['leak_ratio'] is None or not 0.7 <= r['leak_ratio'] <= 1.3: failed.append('leak')
            assert failed == r['failed'], (use, failed, r['failed'])
    checks['unchanged_four_gate_rows'] = 24
    before = json.loads((OUT / 'before.json').read_text())
    after = json.loads((WORK / 'knowledge/characters/silent/experience.json').read_text())
    ids = json.loads((HERE / 'experience-links.json').read_text())['entries']
    old = {e['id']: e for e in before['entries']}
    new = {e['id']: e for e in after['entries']}
    assert len(new) == len(old) + 4
    assert {i for i in new if new[i] != old.get(i)} == set(ids)
    for ident in ids:
        assert new[ident]['status'] == 'active'
        if ident != 'silent-double-boss-resource-handoff': assert new[ident]['asc'] == [10,10]
    old_handoff, new_handoff = dict(old['silent-double-boss-resource-handoff']), dict(new['silent-double-boss-resource-handoff'])
    del old_handoff['lesson']; del new_handoff['lesson']
    assert old_handoff == new_handoff
    checks['unchanged_other_entries'] = len(old) - 1
    checks['changed_entries'] = ids
    checks['simulations_run'] = 0
    (OUT / 'validation.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(checks,ensure_ascii=False))


if __name__ == '__main__':
    main()
