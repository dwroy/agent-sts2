"""Retain refresh receipts/logs and bound the full failed diagnostic working set."""
import datetime as dt
from pathlib import Path

import learner_retention as r
import worktree_retention as w
from retention_metrics import bytes_under


def identity(path):
    stat = path.stat()
    return dict(bytes=stat.st_size, mtime_ns=stat.st_mtime_ns, inode=stat.st_ino, device=stat.st_dev)


def sweep(root, directory, apply=False, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    result = dict(results=[], retained={}, retained_bytes={})
    if apply:
        try:
            r.require_host_process_view()
        except (OSError, ValueError) as error:
            result['retained'][str(error)] = 1
            return result
    for parent in sorted((directory / 'v6-refresh').glob('*')):
        try:
            r.safe_path(root, parent)
            with r.locks([parent / 'refresh.lock', directory / 'learn.lock', root / 'ops/live-merge.lock']):
                rows = []
                for path in sorted(parent.glob('refresh-*')):
                    try:
                        r.safe_path(root, path)
                        if not path.is_dir() or not (path / 'receipt.json').is_file():
                            raise ValueError('active or unknown refresh completion')
                        receipt = r.load(r.safe_path(root, path / 'receipt.json'))
                        if (receipt.get('schema') != 'v6-refresh-receipt-v1' or receipt.get('directory') != str(path)
                                or receipt.get('character') != parent.name or receipt.get('status') not in ('published', 'failed')):
                            raise ValueError('refresh completion identity unknown')
                        ended = dt.datetime.fromisoformat(receipt['ended_at'].replace('Z', '+00:00'))
                        if ended.tzinfo is None:
                            raise ValueError('refresh completion time has no timezone')
                        rows.append((ended, path, receipt))
                    except (OSError, ValueError, KeyError, TypeError) as error:
                        reason = str(error)
                        result['retained'][reason] = result['retained'].get(reason, 0) + 1
                        result['retained_bytes'][reason] = result['retained_bytes'].get(reason, 0) + bytes_under(path)
                failures = sorted((row for row in rows if row[2]['status'] == 'failed'), reverse=True)
                keep = {path for ended, path, _ in failures[:20] if (now - ended).total_seconds() <= 7 * 86400}
                for _, path, receipt in rows:
                    try:
                        files = r.files_under(root, path)
                        reason = 'recent failed refresh' if path in keep else None
                        if w.active(path):
                            reason = 'active refresh process'
                        if reason:
                            result['retained'][reason] = result['retained'].get(reason, 0) + 1
                            result['retained_bytes'][reason] = result['retained_bytes'].get(reason, 0) + sum(p.stat().st_size for p in files)
                            continue
                        copies = [p for p in files if p != path / 'receipt.json' and p.suffix not in ('.stdout', '.stderr')]
                        if not copies:
                            continue
                        records = [dict(path=str(p.relative_to(path)), **identity(p)) for p in copies]
                        if apply:
                            receipt['storage_cleanup'] = dict(at=r.stamp(), state='prepared', files=records,
                                policy='published intermediates; failed full diagnostics latest 20 and at most 7 days')
                            r.atomic(path / 'receipt.json', receipt)
                            # The worker owns the same refresh/learn/publication locks until deletion ends.
                            if w.active(path) or any(identity(path / row['path']) != {k: v for k, v in row.items() if k != 'path'} for row in records):
                                raise ValueError('refresh inputs changed before deletion')
                            for row in records:
                                (path / row['path']).unlink()
                            for subdir in sorted((p for p in path.rglob('*') if p.is_dir()), reverse=True):
                                if not any(subdir.iterdir()):
                                    subdir.rmdir()
                            receipt['storage_cleanup']['state'] = 'completed'
                            r.atomic(path / 'receipt.json', receipt)
                        result['results'].append(dict(directory=str(path.relative_to(root)), state='compacted' if apply else 'eligible',
                                                      bytes=sum(row['bytes'] for row in records)))
                    except (OSError, ValueError, KeyError, TypeError) as error:
                        reason = str(error)
                        result['retained'][reason] = result['retained'].get(reason, 0) + 1
                        result['retained_bytes'][reason] = result['retained_bytes'].get(reason, 0) + bytes_under(path)
        except (OSError, ValueError, KeyError, TypeError) as error:
            reason = str(error)
            result['retained'][reason] = result['retained'].get(reason, 0) + 1
    return result
