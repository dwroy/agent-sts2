#!/usr/bin/env python3
"""Check the new summary against original frozen results and physical SL bytes."""
import csv
import gzip
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OLD = ROOT/'paper/materials/20261016-v5s-regression-diagnosis'


def main():
    summary = json.loads((HERE/'summary.json').read_text())
    old = json.loads((OLD/'SL-recovery.json').read_text())
    for original in old:
        current = next(s for s in summary['groups'] if s['cohort'] == original['cohort'] and str(s['floor']) == str(original['floor']))
        assert current['initial_noncompletion'] == original['initial_noncompletion']
        assert current['rescued'] == original['rescued_after_initial_noncompletion']
    sl = [json.loads(line) for line in gzip.open(HERE/'inputs/sl.original.jsonl.gz', 'rt')]
    freeze = json.loads((OLD/'freeze.json').read_text())
    with (ROOT/freeze['sources']['sl-attempts']['path']).open('rb') as stream:
        for row in sl:
            ref = row['_source']
            assert ref['off'] + ref['len'] <= freeze['sources']['sl-attempts']['complete_prefix_bytes']
            stream.seek(ref['off'])
            raw = stream.read(ref['len'])
            assert hashlib.sha256(raw).hexdigest() == ref['sha256']
            assert json.loads(raw) == {k: v for k, v in row.items() if k != '_source'}
    attempts = list(csv.DictReader((HERE/'attempts.csv').open()))
    assert len(attempts) == 212
    assert len({(a['run_id'], a['floor']) for a in attempts}) == 98
    assert all(a['start_frame_off'] for a in attempts)
    uncertain = json.loads((HERE/'death-without-certain-verdict.json').read_text())
    assert len(uncertain) == 4
    assert all(row['judge_reason'].startswith('not certain:') for row in uncertain)
    transitions = json.loads((HERE/'resource-transitions.json').read_text())
    assert len(transitions) == 11
    assert all(row['F48_win_hp'] == row['F49_entry_hp'] for row in transitions)
    pure_post = [r for r in transitions if r['cohort'] == 'post' and r['run_id'] != 'HLAWCGM3KHVB']
    assert sorted(r['F49_entry_hp'] for r in pure_post) == [3, 4, 6, 11]
    coverage = json.loads((HERE/'coverage-audit.json').read_text())
    assert coverage['frames'] == 5201 and coverage['r364_matches'] == 0
    pounce = [json.loads(line) for line in gzip.open(HERE/'inputs/pounce-hands.jsonl.gz', 'rt')]
    assert len(pounce) == 44 and all(r['card']['upgraded'] is False for r in pounce)
    assert not any(row.get('earring_held_frames') for row in coverage['by_run'].values())
    result = dict(rc=0, original_physical_SL_rows_verified=len(sl), boss_attempts=212, unique_bosses=98,
                  all_ten_rescue_groups_match_original=True, all_attempts_have_observed_boundary_frames=True,
                  saved_uncertain_verdicts=4, actual_F48_F49_boundaries=11, pure_post_F49_hp=[3,4,6,11],
                  R364_observed_Pounce_occurrences=44, R364_predicate_matches=0,
                  limits='Checks describe original observations and code predicates; no counterfactual win, full-policy execution, model calibration or 0332 fix proof.')
    (HERE/'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
