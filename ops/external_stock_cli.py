#!/usr/bin/env python3
"""Register cached anonymous stock once, or read a single bound complete window."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import sys

import external_stock as stock
import external_stock_source as data
from strategy_research_jobs import digest


def ref(root, name):
    path = Path(name)
    if path.is_absolute() or '..' in path.parts or not (root / path).resolve().is_relative_to(root):
        raise ValueError('source reference must stay in project')
    if (root / path).stat().st_size > data.MAX_SOURCE_BYTES:
        raise ValueError('source file exceeds byte bound before read')
    raw = (root / path).read_bytes()
    return dict(path=str(path), sha256=digest(raw), bytes=len(raw))


def prepare(args):
    root = args.root.resolve()
    control_path = root / stock.CONTROL
    if control_path.exists():
        raise ValueError('existing control/hold retained; review it instead of reinitializing')
    # Only the established sanitized cache may be imported; no DB or arbitrary gzip.
    for name in (args.cache_receipt, args.cache):
        if not str(name).startswith('data/external/'):
            raise ValueError('requires existing data/external safe projection cache')
    if Path(args.cache).name != 'runs.json.gz' or Path(args.cache_receipt).name != 'receipt.json':
        raise ValueError('only the existing safe-cache pair is accepted; raw databases are not inputs')
    state_dir = stock.directory(root)
    state_dir.mkdir(parents=True, exist_ok=True)
    with (state_dir / 'learn.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if control_path.exists():
            raise ValueError('existing control retained')
        import publication_gate
        import external_learning_policy
        if publication_gate.learners_held(root, state_dir) or not external_learning_policy.external_disk_allowed(root):
            raise ValueError('original publication/disk admission holds stock registration')
        package_ref = ref(root, args.package_manifest)
        contracts = [ref(root, p) for p in args.contract]
        imported = data.import_catalog(root, package_ref, contracts, str(state_dir.relative_to(root) / 'external-stock/source'),
            receipt_ref=ref(root, args.cache_receipt), cache_ref=ref(root, args.cache),
            own_index_ref=ref(root, args.own_index) if (root / args.own_index).exists() else None)
        original_plans = stock.legacy_plans(root)
        legacy = stock.legacy_reservations(root, json.loads(data.artifact(root, imported)), original_plans)
        legacy_ref = data.immutable(root, str(state_dir.relative_to(root) / 'external-stock/source/legacy-scope.json'), data.canonical(legacy))
        cfg = dict(schema=data.SCHEMA, character='silent', enabled=True, hold=False, task_type=data.TASK,
            catalog=imported, target_records=40, ready_floor=3, max_input_bytes=256000, context_input_bytes=128000,
            max_page_bytes=24000, blocked_records=[dict(key=k, reason='original declared A window; read status unknown') for k in legacy['reserved_keys']],
            failure_gaps=[], legacy_plans=original_plans, legacy_scope=legacy_ref)
        # Data/operations registration only: no Git, model, source checks, tick or game.
        stock.durable_json(control_path, cfg)
    return dict(state='registered', catalog=imported, next='original natural learn tick', workers_started=0)


def read(args):
    from strategy_external_jobs import bound, source, queue
    root = args.root.resolve()
    directory = stock.directory(root)
    cfg = stock.control(root)
    if not cfg['enabled'] or cfg['hold']:
        raise ValueError('stock reading held')
    state = json.loads((directory / 'learn.json').read_bytes())
    original = state['batches'][args.batch]
    batch = bound(str(root), str(directory), args.batch, 'silent', original['worktree'], args.plan)
    plan = next(p for p in queue(root)['plans'] if p['plan_id'] == args.plan)
    binding, _ = source(root, plan)
    if any(batch['external_binding'].get(k) != v for k, v in binding.items()):
        raise ValueError('reader original binding differs')
    return stock.page(root, args.batch, batch, args.key)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--state-dir', type=Path)
    sub = parser.add_subparsers(dest='action', required=True)
    init = sub.add_parser('prepare')
    init.add_argument('--package-manifest', default='knowledge/external/sts2fun/builds-v1/manifest.json')
    init.add_argument('--cache-receipt', required=True)
    init.add_argument('--cache', required=True)
    init.add_argument('--contract', action='append', required=True)
    init.add_argument('--own-index', default='knowledge/characters/silent/build-statistics-v1/run-index.json')
    status = sub.add_parser('status')
    status.add_argument('--details', action='store_true')
    reader = sub.add_parser('read')
    reader.add_argument('--batch', required=True); reader.add_argument('--plan', required=True); reader.add_argument('--key', required=True)
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    root = args.root.resolve()
    if args.state_dir:
        directory = args.state_dir.resolve()
        if not directory.is_relative_to(root):
            raise ValueError('state directory outside project')
        os.environ['CODEX_OPS_DIR'] = str(directory)
    if args.action == 'prepare':
        print(json.dumps(prepare(args), ensure_ascii=False))
    elif args.action == 'read':
        sys.stdout.buffer.write(read(args))
    else:
        # Status is a read-only projection saved by the last original tick/callback.
        value = json.loads((stock.directory(root) / 'external-stock/status.json').read_bytes())
        if not args.details:
            value.pop('coverage', None)
        print(json.dumps(value, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, IndexError, StopIteration) as error:
        sys.stderr.write(str(error) + '\n')
        raise SystemExit(1)
