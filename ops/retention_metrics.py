"""Persist reason/byte trends and deduplicate alerts in the existing supervisor inbox."""
import datetime as dt
import os
from pathlib import Path
import shutil


def bytes_under(path):
    total = 0
    if path.is_symlink() or not path.is_dir():
        return 0
    for parent, dirs, files in os.walk(path, followlinks=False):
        dirs[:] = [d for d in dirs if not (Path(parent) / d).is_symlink()]
        for name in files:
            item = Path(parent) / name
            if not item.is_symlink():
                total += item.stat().st_size
    return total


def batch_scope(root, directory, bid, batch, r):
    tree = r.safe_path(root, batch.get('worktree') or root)
    manifest = directory / 'retention/archives' / (bid + '.manifest.json')
    if manifest.is_file():
        return r.safe_path(root, r.load(manifest)['scratch'])
    report = r.read_report(str(directory / 'learner' / (bid + '.out'))) or {}
    if isinstance(report.get('report'), str):
        scratch = r.safe_path(root, report['report']).parent
        if scratch.parent == tree / 'learner/runs':
            return scratch
    legacy = root / 'learner/runs' / bid
    if tree.name in ('exp', 'exp-' + str(batch.get('character'))) and legacy.is_dir():
        return r.safe_path(root, legacy)
    return tree / 'learner/runs'


def summarize(root, directory, result, apply, r, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    result['retained_summary'] = {reason: dict(batches=count, bytes=result['retained_bytes'].get(reason, 0))
                                  for reason, count in result['retained'].items()}
    result['available_bytes'] = shutil.disk_usage(root).free
    if not apply:
        return
    history = directory / 'retention/backlog-trends.json'
    previous = r.load(history) if history.exists() else {}
    current, alerts = {}, []
    for reason, row in result['retained_summary'].items():
        old = previous.get('reasons', {}).get(reason, {})
        start = old.get('since', now.isoformat()) if row['bytes'] >= old.get('bytes', 0) else now.isoformat()
        grew = row['bytes'] > old.get('start_bytes', row['bytes'])
        current[reason] = dict(bytes=row['bytes'], since=start,
                               start_bytes=old.get('start_bytes', row['bytes']) if start == old.get('since') else row['bytes'])
        if grew and (now - dt.datetime.fromisoformat(start)).total_seconds() >= 86400:
            alerts.append('retained bytes growing for 24h: ' + reason)
    if result['available_bytes'] < 150_000_000_000:
        alerts.append('main disk free below 150GB')
    last = previous.get('last_alert_at')
    if alerts and (not last or (now - dt.datetime.fromisoformat(last)).total_seconds() >= 86400
                   or alerts != previous.get('alerts')):
        inbox = directory / 'inbox-claude.md'
        with inbox.open('a') as stream:
            stream.write('\n- ' + now.isoformat() + ' [retention #76] ' + '; '.join(alerts)
                         + '; see retention/last-sweep.json (counts/bytes/free).\n')
        last = now.isoformat()
    result['alerts'] = alerts
    r.atomic(history, dict(at=now.isoformat(), reasons=current, alerts=alerts, last_alert_at=last))
