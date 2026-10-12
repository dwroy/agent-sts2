"""Assemble immutable replay results and exact source provenance, retaining original runs."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
SCRATCH = Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-075131-silent-boss-calibration')
BASE = 'ff571cf0049ca3581588f453f8df630af4451b36'
sys.path.insert(0, str(ROOT / 'agent/tools/boss-sim'))
spec = importlib.util.spec_from_file_location('refresh_silent', ROOT / 'agent/tools/boss-sim/refresh-silent.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main():
    fights = load(SCRATCH / 'dataset/fights.jsonl')
    expected = {(r['key'], start) for r in fights for start in ('t1', 'pre')}
    original_files = [SCRATCH / f'results/results-{s}.jsonl' for s in (0, 1)]
    corrected_files = [SCRATCH / f'corrected-results/results-{s}.jsonl' for s in (0, 1)]
    original = [r for p in original_files for r in load(p)]
    corrected = [r for p in corrected_files for r in load(p)]
    keys = json.loads((SCRATCH / 'corrected-keys.json').read_text())
    replacement = {(key, start) for key in keys for start in ('t1', 'pre')}
    assert len(original) == len(expected) and {(r['key'], r['start']) for r in original} == expected
    assert len(corrected) == len(replacement) and {(r['key'], r['start']) for r in corrected} == replacement
    rows = [r for r in original if r['key'] not in keys] + corrected
    by_pair = {(r['key'], r['start']): r for r in rows}
    assert len(by_pair) == len(expected)
    final = [by_pair[(r['key'], start)] for r in fights for start in ('t1', 'pre')]
    audit = json.loads((SCRATCH / 'opening-audit.json').read_text())
    audit_by_key = {r['key']: r for r in audit}
    fight_by_key = {r['key']: r for r in fights}
    error_attribution = []
    for r in final:
        # Add complete provenance from the audited, identical input; leave raw original files unchanged.
        r['bossSource'] = audit_by_key[r['key']]['source']
        if r.get('character') is None:
            # The initial runner omitted the tag only in its board-error branch. Require the exact
            # strictly extracted fight, not a missing-character legacy inference or successful forecast.
            f = fight_by_key[r['key']]
            assert not r.get('sim') and r.get('error') == 'board: Error: no solve'
            assert r['run'] == f['run_id'] and r['asc'] == f['asc'] and r['floor'] == f['floor']
            assert f['character'] == 'silent' and f['t1']['state']['run']['character_id'] == 'SILENT'
            error_attribution.append({'key': r['key'], 'start': r['start'],
                                      'source': 'exact frozen fight + raw T1 run.character_id=SILENT; error branch omitted the original output tag'})
            r['character'] = f['character']
    assert all(r['character'] == 'silent' for r in final)
    assert all(r['sim']['samples'] == 200 for r in final if r.get('sim'))
    (SCRATCH / 'final-results.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in final))
    inputs = module.model_fingerprint(ROOT, Path('/home/dw/Projects/agent-sts2/data/game-data.json'))
    policy_files = [p for p in inputs if p.startswith('agent/src/') and p not in {
        'agent/src/sim/boss-sim.ts', 'agent/src/sim/boss-trust.ts', 'agent/src/sim/boss-lines.ts',
        'agent/src/sim/build-sim.ts', 'agent/src/sim/build-sim-facts.ts'}]
    for p in policy_files:
        baseline = subprocess.check_output(['git', 'show', BASE + ':' + p], cwd=ROOT)
        assert hashlib.sha256(baseline).hexdigest() == inputs[p], p
    assert not any('/ironclad/' in p for p in inputs)
    a10_keys = {r['key'] for r in fights if r['asc'] == 10}
    parts = [part for r in audit if r['key'] in a10_keys for part in r['source']]
    definitions = next(r for r in json.loads((SCRATCH / 'model-input-audit.json').read_text()) if r['asc'] == 10)
    attacks = [(m['id'], d) for m in definitions['monsters'] for d in m['moves'] if d['damage']]
    estimates = [{'enemy': mon, **move} for mon, move in attacks if move['damage']['estimated']]
    provenance = {
        'simulator_base': BASE,
        'model_sha256': hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest(),
        'input_files': inputs, 'samples': 200, 'seed': 1, 'seed_formula': '1 + original fight row index * 101',
        'method': 'existing B1.5 policy, best order, t1 + pre/redeal, no rollout; default settings unchanged',
        'normalization': 'existing syntheticBossStart first-hit formula, DB nearest ascension HP/damage, actual opening powers/resources',
        'original_results': {str(p): sha(p) for p in original_files},
        'corrected_results': {str(p): sha(p) for p in corrected_files},
        'assembly': {'original_pairs': len(original), 'unchanged_fights': len(fights) - len(keys), 'corrected_fights': len(keys),
                     'rule': 'opening audit identifies changed first-hit inputs; replace all t1/pre pairs for those keys, original indexes/seeds retained'},
        'original_error_role_attribution': error_attribution,
        'opening_audit_sha256': sha(SCRATCH / 'opening-audit.json'),
        'opening_source_integrity_sha256': sha(SCRATCH / 'opening-source-integrity.json'),
        'model_input_audit_sha256': sha(SCRATCH / 'model-input-audit.json'),
        'censored_actual_hp_audit_sha256': sha(SCRATCH / 'censor-hp-audit.json'),
        'final_results_sha256': sha(SCRATCH / 'final-results.jsonl'),
        'boss_input_scope': {'A10_fights': len(a10_keys), 'A10_opening_parts': len(parts),
                             'A10_exact_hp_parts': sum(p['hpAsc'] == '10' for p in parts),
                             'A10_attack_definitions': len(attacks), 'A10_nearest_A9_definitions': estimates},
    }
    (SCRATCH / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps({'pairs': len(final), 'errors': [r['key'] + ':' + r['start'] for r in final if not r.get('sim')],
                      'corrections': len(keys), 'model_sha256': provenance['model_sha256']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
