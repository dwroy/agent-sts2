#!/usr/bin/env python3
"""Inventory already deployed interfaces and frozen natural consumer records; no simulation."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
BASE = '50e2da099a5e1745878070ea960f3160324f2217'
FILES = ['knowledge/characters/silent/double-boss.json', 'agent/src/sim/double-boss-start.ts',
         'agent/src/sim/boss-sim.ts', 'agent/src/sim/build-sim.ts',
         'agent/src/sim/build-sim-facts.ts', 'agent/src/sim/boss-margin.ts',
         'agent/tests/silent-double-boss.test.ts']


def main():
    sources = []
    for name in FILES:
        raw = subprocess.check_output(['git', '-C', str(ROOT), 'show', f'{BASE}:{name}'])
        sources.append({'path': name, 'commit': BASE, 'sha256': hashlib.sha256(raw).hexdigest()})
    inputs = ROOT / 'paper/materials/20261016-global-build-g1b/inputs'
    consumers = []
    with gzip.open(inputs / 'decisions.jsonl.gz', 'rt') as handle:
        for line in handle:
            row = json.loads(line)
            sim = row['boss_sim']
            if sim.get('objective') != 'F48_F49_continuous':
                continue
            margin = (((sim.get('quantitative') or {}).get('base') or {}).get('boss_relative_margin') or {})
            consumers.append({'run_id': row['run_id'], 'floor': row['floor'], 'turn': row.get('turn'),
                              'source': row['_source'], 'decision_id': row.get('decision_id'),
                              'completion': sim.get('completion'), 'result': row.get('result'),
                              'objective': sim['objective'], 'calibration': sim.get('calibration'),
                              'base_win_raw': (sim.get('base') or {}).get('win'),
                              'base_win_cal_field': (sim.get('base') or {}).get('win_cal'),
                              's_status': margin.get('status'), 's_ranking_eligible': margin.get('rankingEligible'),
                              'build_ranking_mode': (sim.get('build_ranking') or {}).get('mode')})
    result = {'schema': 'global-build-g1a-existing-interface-audit-v1', 'source_commit': BASE, 'sources': sources,
              'input_manifest_sha256': hashlib.sha256((inputs / 'manifest.json').read_bytes()).hexdigest(),
              'frozen_continuous_consumers': consumers,
              'scope': 'existing ranking-bearing rows only; excludes computation failures and nonranking rows; not whole health',
              'baseline_only': True, 'new_phase_natural_gate_claimed': False,
              'resource_contract': {'implementation': 'continuationInput / fightSample / withDoubleBossStart',
                                    'per_sample_hp_not_mean': True, 'spent_slot_and_revive_not_restored': True,
                                    'nonpositive_or_missing_first_resources': 'throw; original C1 failure exit applies; no fabricated sample',
                                    'unmodelled_mechanisms': 'unknown; original learner contract pending'},
              'continuous_s': 'unknown: current boss-margin excludes sequence samples; do not combine single-fight S or impute zero',
              'calibration': 'existing two-fight joint outcomes are raw and low trust; single-fight Platt must not be reused',
              'model_0332_parent': 'unchanged and open; guarded nonpositive-winning-HP failures not fixed by this audit'}
    (HERE / 'existing-interface-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({'rows': len(consumers), 'runs': sorted({r['run_id'] for r in consumers}),
                      's_statuses': sorted({str(r['s_status']) for r in consumers})}))


if __name__ == '__main__':
    main()
