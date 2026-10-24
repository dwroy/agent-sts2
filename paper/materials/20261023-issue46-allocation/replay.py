#!/usr/bin/env python3
"""Replay frozen dispatch metadata only; no runtime state, models or checkouts."""
import datetime as dt
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root / 'ops'))
import proposal_dispatch as policy

frozen = json.loads(Path(__file__).with_name('traffic-replay.json').read_text())
state = {'batches': {}}
kept = deferred = 0
for row in frozen['batches']:
    if row['class'] != 'waiting-only':
        continue
    batch = row['batch']
    stamp = batch.removesuffix('-strategy-proposal')
    at = dt.datetime.strptime(batch[:15], '%Y%m%d-%H%M%S').replace(
        tzinfo=dt.timezone(dt.timedelta(hours=8))).timestamp()
    count = row['finished_runs_at_dispatch']
    if policy.waiting_round(state, 'silent', count, stamp, at):
        policy.record_waiting_round(state, 'silent', count, stamp, at, batch)
        kept += 1
    else:
        deferred += 1
assert kept == frozen['waiting_only_kept']
assert deferred == frozen['waiting_only_deferred']
print(json.dumps({'waiting_kept': kept, 'waiting_deferred': deferred,
                  'estimated_total': frozen['original_allocations'] - deferred}))
