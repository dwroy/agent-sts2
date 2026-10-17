#!/usr/bin/env python3
"""Reproduce calibration-file comparisons and provenance for the static analysis only."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]


def main():
    frozen=json.loads((BASE/'freeze.json').read_bytes())
    versions=json.loads((BASE/'versions.original.json').read_bytes())
    if not isinstance(versions,list):versions=versions['versions']
    commits={'first_P1P3_process':next(r for r in frozen['runs'] if r['cohort']=='post')['configurations'][0]['code']['commit']}
    commits.update({r['release_id']:r['commit'] for r in versions if r.get('release_id') in ('V5-R362','V5-R366')})
    rows=[]
    for label,commit in commits.items():
        raw=subprocess.check_output(['git','show',commit+':knowledge/characters/silent/boss-trust.json'],cwd=ROOT)
        data=json.loads(raw)
        rows.append({'version':label,'commit':commit,'sha256':hashlib.sha256(raw).hexdigest(),
            **{k:data.get(k) for k in ('source','criteria','low_trust_b2','low_confidence_b3','ascension_low','stage_low')},
            'platt':{k:v.get('platt') for k,v in data.get('overall',{}).items()}})
    (BASE/'calibration-version-data.json').write_text(json.dumps({'records':rows,'all_platt_equal':all(r['platt']==rows[0]['platt'] for r in rows),
        'consumer_load':'boss-trust.ts fillTrust at module load and character changes; publication time alone is not adoption.'},ensure_ascii=False,indent=2)+'\n')
    refs=['agent/src/sim/boss-trust.ts','agent/src/sim/boss-readiness.ts','agent/src/sim/build-ranking-choice.ts',
        'agent/src/sim/s-combat-rank.ts','agent/src/sim/boss-lines.ts','agent/src/reflex/rollout-live.ts',
        'paper/materials/20261015-1730-ops/calibration-readback.json',
        'paper/materials/20261016-0625-ops/calibration-readback.json',
        'paper/materials/20261016-1145-ops/module-health-byte-readback.json',
        'paper/materials/20261016-1703-ops/postmortem-readback.json',
        'paper/materials/20261016-global-build-g1b/report.md']
    evidence=[]
    for name in refs:
        p=ROOT/name
        if p.exists():evidence.append({'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    (BASE/'source-provenance.json').write_text(json.dumps({'at':dt.datetime.now(dt.timezone.utc).isoformat(),
        'scope':'Existing producer semantics and original learner/ops findings only; no new gameplay mechanism inference',
        'references':evidence},ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':main()
