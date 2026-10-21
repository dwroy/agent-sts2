#!/usr/bin/env python3
"""Bounded reference refresh on the existing ops cadence; never changes live or launches play."""
import argparse
import fcntl
import importlib.util
import json
from pathlib import Path
import os
import re


def playing():
    for directory in Path('/proc').glob('[0-9]*'):
        try:
            if directory.stat().st_uid != os.getuid():
                continue
            argv = (directory / 'cmdline').read_bytes().split(b'\0')
            if b'play' in argv and any(b'src/index.ts' in arg or b'/index.js' in arg for arg in argv):
                return True
        except (OSError, ValueError):
            continue
    return False


def tick(root):
    directory = root / 'data/external/open-book'
    pending = directory / 'pending'
    if not pending.exists():
        return {'status': 'empty'}
    with (directory / 'refresh.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'status': 'busy'}
        spec = importlib.util.spec_from_file_location('open_book_builder', root / 'knowledge/builders/build-open-book.py')
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        receipts = directory / 'receipts' / builder.REV
        receipts.mkdir(parents=True, exist_ok=True)
        # Filter completed requests before limiting the batch, so the first 256 cannot starve later IDs.
        requests = []
        for path in sorted(pending.glob('*.json')):
            if (receipts / path.name).exists() or path.is_symlink():
                continue
            try:
                if path.stat().st_size > 1024:
                    raise ValueError('oversized')
                row = json.loads(path.read_text())
                kind, ident = row.get('kind'), row.get('id')
                if (row.get('schema') != 'open-book-missing-v1' or kind not in builder.KINDS or
                        not isinstance(ident, str) or not re.fullmatch(r'[A-Z][A-Z0-9_]{0,99}', ident) or
                        path.name != f'{kind}-{ident}.json' or row.get('game_version') != builder.VERSION):
                    raise ValueError('invalid request')
                requests.append((path, row))
            except (ValueError, OSError, AttributeError):
                builder.save(receipts / path.name, {'status': 'invalid-request', 'source_revision': builder.REV})
            if len(requests) == 256:
                break
        if not requests:
            return {'status': 'empty-or-already-checked'}
        if playing():
            return {'status': 'deferred-playing', 'pending': len(requests)}
        # Reviewed snapshot only. Missing files may be fetched once, under the builder's download lock.
        # This ignored overlay is read after atomic replacement; no writes to a live/main checkout's knowledge.
        output = directory / 'catalog/knowledge'
        entries = builder.build(root, network=True, output=output)
        indexed = {(row['kind'], row['id']) for row in entries}
        found = 0
        for path, row in requests:
            present = (row['kind'], row['id']) in indexed
            found += present
            builder.save(receipts / path.name, {**row, 'status': 'available' if present else 'unresolved-in-reviewed-snapshot',
                'source_revision': builder.REV, 'catalog': 'data/external/open-book/catalog/knowledge',
                'retry': '新来源/版本需许可核验；收据按 revision 分目录。未找到不能算补齐。'})
        return {'status': 'checked', 'checked': len(requests), 'available': found, 'unresolved': len(requests) - found}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('command', choices=['tick'])
    args = parser.parse_args()
    print(json.dumps(tick(args.root.resolve())))
