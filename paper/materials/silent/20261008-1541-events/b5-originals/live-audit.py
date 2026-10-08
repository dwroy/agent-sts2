import collections
import json
import statistics
from pathlib import Path

S = Path(__file__).resolve().parent
fights = {r['key']: r for r in map(json.loads, (S / 'dataset/fights.jsonl').read_text().splitlines())}
turns = {r['key']: {t[0]: t for t in r['turns']} for r in map(json.loads, (S / 'dataset/turns.jsonl').read_text().splitlines())}
decisions = json.loads((S / 'queen-boss-decisions.json').read_text())
seen, items, skipped = set(), [], []
for row in decisions:
    d = row['raw']; b = d['boss_sim']; turn = d.get('turn'); key = row['key']
    # Keep attempts separate. Censored SL attempts never inherit a later retry's actual outcome.
    if (key, turn) in seen:
        continue
    if not b.get('available'):
        skipped.append({'key': key, 'turn': turn, 'off': row['off'], 'reason': b.get('reason')})
        continue
    choice = (d.get('answers', {}).get('plan') or {}).get('choice')
    if choice not in b.get('lines', {}):
        skipped.append({'key': key, 'turn': turn, 'off': row['off'], 'reason': 'selected plan absent from boss_sim lines'})
        continue
    seen.add((key, turn))
    lines = b['lines']; chosen = lines[choice]; best_key = (b.get('ranked') or [None])[0]
    best = lines.get(best_key) or {}; fight = fights[key]; logged_turn = turns[key].get(turn)
    diff, se = chosen.get('d'), chosen.get('se')
    items.append({'key': key, 'side': row['side'], 'run': fight['run_id'], 'floor': fight['floor'], 'turn': turn,
        'off': row['off'], 'len': row['len'], 'sha256': row['sha256'], 'code': fight['code'],
        'actual_won': fight['outcome'] == 'won', 'outcome': fight['outcome'], 'chosen': choice, 'top': best_key,
        'pred': chosen['cal'], 'top_pred': best.get('cal'), 'raw_paired_diff': diff, 'raw_paired_se': se,
        'exact_top': choice == best_key, 'within_2se': diff is not None and se is not None and diff >= -2*se,
        'cal_gap': best['cal'] - chosen['cal'] if 'cal' in best else None,
        'samples': b.get('samples'), 'timed_out': b.get('timed_out'), 'low_trust': b.get('low_trust'),
        'won_loss_pred': chosen.get('won_loss'), 'actual_loss': logged_turn[1]-fight['end_hp'] if logged_turn else None,
        'seed': 7, 'seed_provenance': 'committed boss-lines.ts BOSS_LINES_SEED default; original log does not record seed or per-sample outcomes'})

def summarize(mine):
    if not mine:
        return None
    p = [r['pred'] for r in mine]; y = [int(r['actual_won']) for r in mine]
    gains = [r['cal_gap'] for r in mine if r['cal_gap'] is not None]
    return {'n': len(mine), 'attempts': len({r['key'] for r in mine}), 'mean_pred': statistics.fmean(p),
        'actual_win': statistics.fmean(y), 'brier': statistics.fmean((a-b)**2 for a,b in zip(p,y)),
        'exact_top': sum(r['exact_top'] for r in mine), 'within_2se': sum(r['within_2se'] for r in mine),
        'mean_cal_gap': statistics.fmean(gains) if gains else None,
        'mean_raw_gap': -statistics.fmean(r['raw_paired_diff'] for r in mine if r['raw_paired_diff'] is not None),
        'sample_min': min(r['samples'] for r in mine), 'sample_max': max(r['samples'] for r in mine)}

first = {}
for r in items:
    first.setdefault(r['key'], r)
out = {'character': 'silent', 'boss': 'QUEEN', 'method': 'first available chosen-line record per turn, partitioned by actual attempt offsets',
    'actual_attempts': len([r for r in fights.values() if r['encounter'] == 'QUEEN+TORCH_HEAD_AMALGAM']),
    'missing_t1_attempts': [r['key'] for r in fights.values() if r['encounter'] == 'QUEEN+TORCH_HEAD_AMALGAM' and (r['key'], 1) not in seen],
    'all_turns': summarize(items), 't1': summarize([r for r in items if r['turn'] == 1]), 'first_available_per_attempt': summarize(list(first.values())),
    'by_split': {side: {'all_turns': summarize([r for r in items if r['side'] == side]), 't1': summarize([r for r in items if r['side'] == side and r['turn'] == 1])} for side in ['tune','val']},
    'potential_limits': 'Historical paired d/se measure model disagreement, not observed alternative victories. No sum across turns. Pair seeds/outcomes not directly present in old decision records. Fresh fixed-input ranking replay is separate.',
    'items': items, 'skipped': skipped}
(S / 'live-audit.json').write_text(json.dumps(out, ensure_ascii=False, indent=1)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ('items','skipped')}, ensure_ascii=False))
