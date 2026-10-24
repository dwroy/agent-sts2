#!/usr/bin/env python3
"""Read allocation receipts in an explicit time window without changing runtime state."""
import argparse
from collections import Counter
import datetime as dt
import json
from pathlib import Path


def timestamp(value):
    parsed = dt.datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        raise ValueError('timestamp must include a timezone')
    return parsed.astimezone(dt.timezone.utc)


def category(name):
    for prefix, kind in (('codex-strategy-', 'strategy-proposal'), ('codex-fix-', 'fix-batch'),
                         ('ascension-audit-', 'ascension-audit'), ('boss-sim-', 'boss-sim'),
                         ('issue-', 'issue'), ('ops-', 'ops'), ('integrator', 'integrator')):
        if name.startswith(prefix):
            return kind
    return 'other'


def report(directory, since, until):
    if since >= until:
        raise ValueError('since must precede until')
    allocations = directory / 'retention/allocations'
    if not allocations.is_dir() or allocations.is_symlink():
        raise ValueError('original allocation receipt directory is unavailable')
    rows, errors = [], []
    for path in sorted(allocations.glob('*.json')):
        try:
            if path.is_symlink():
                raise ValueError('linked allocation receipt retained')
            item = json.loads(path.read_text())
            at = timestamp(item['at'])
            if (item.get('schema') != 'workspace-allocation-v1'
                    or item.get('state') not in ('allocating', 'allocated', 'allocation_failed')
                    or not isinstance(item.get('worktree'), str)
                    or Path(item['worktree']).name != path.stem):
                raise ValueError('unrecognized allocation receipt')
            if since <= at < until:
                rows.append({'workspace': path.stem, 'at': at.isoformat(), 'category': category(path.stem),
                             'state': item['state'], 'base': item.get('base'),
                             'failed_checkout_reclaimed': item.get('failed_checkout_reclaimed')})
        except (OSError, TypeError, ValueError, KeyError):
            # Do not expose raw receipts, exception text or private runtime paths.
            errors.append(path.name)
    allocated = [row for row in rows if row['state'] == 'allocated']
    return {'schema': 'worktree-allocation-report-v1', 'since': since.isoformat(), 'until': until.isoformat(),
            'hours': (until - since).total_seconds() / 3600,
            'complete': not errors, 'invalid_receipts': errors, 'attempts': len(rows),
            'allocated': len(allocated), 'by_category': dict(sorted(Counter(row['category'] for row in allocated).items())),
            'by_state': dict(sorted(Counter(row['state'] for row in rows).items())), 'receipts': rows,
            'scope': 'original allocator receipts; restored checkouts and legacy unreceipted trees excluded'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--state-dir', type=Path)
    parser.add_argument('--since', required=True, type=timestamp)
    parser.add_argument('--until', type=timestamp, default=dt.datetime.now(dt.timezone.utc))
    args = parser.parse_args()
    root = args.root.resolve()
    directory = args.state_dir or root / 'ops/codex-ops'
    try:
        result = report(directory, args.since, args.until)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result['complete'] else 1
    except (OSError, ValueError) as error:
        print(json.dumps({'complete': False, 'error': str(error)}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
