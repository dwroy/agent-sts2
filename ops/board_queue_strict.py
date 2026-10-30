#!/usr/bin/env python3
"""Strict project checks under delegated K; no knowledge/data drift exceptions."""
import copy
import json
from pathlib import Path

import board_queue_checks as checks
from board_queue_custody import digest, load
from board_queue_pin import local, sha


def context(record, recovery=False):
    row = load(record)
    if row['phase'] != 'awaiting-adoption' and not (recovery and row['phase'] == 'failed'):
        raise ValueError('custody is not ready for strict adoption')
    directory = Path(record).parent
    result = json.loads((directory / 'result.json').read_text())
    value = json.loads((directory / 'sts2-context.json').read_text())
    evidence = result.get('evidence', {})
    if (result.get('schema') != 'mas-check-result-v1'
            or digest(value['job']) != row['job_sha256'] or result.get('job') != row['job_sha256']
            or result.get('candidate') != row['candidate'] or result.get('outcome') != 'passed'
            or value.get('full_runs') != 1 or set(result.get('checks', {})) != set(checks.NAMES)
            or any(v != 'passed' for v in result['checks'].values())
            or evidence.get('full_runs') != 1 or evidence.get('assembly') != value['assembly']
            or not (directory / 'full.once').is_file()
            or sha((directory / 'vitest-result.json').read_bytes()) != evidence.get('vitest', {}).get('sha256')):
        raise ValueError('original single full and all checks must pass')
    # The worker's FD numbers are retired. Actual borrowed K is checked by the
    # custody server and publication gate; never treat stale integers as leases.
    value.pop('custody', None)
    return value


def before(record, descriptors):
    value = context(record)
    with checks.delegated_io(descriptors):
        checks.verify_after(value, expected_main=value['job']['candidate'])
        live = Path(value['assembly']['live'])
        entries = checks.git(live, 'ls-files', '--stage', '-z').decode()
    return dict(schema='sts2-custody-strict-v1', job=digest(value['job']),
                candidate=value['job']['candidate'], live_entries=entries,
                context_sha256=sha((Path(record).parent / 'sts2-context.json').read_bytes()))


def after(record, receipt, descriptors, recovery=False):
    value = context(record, recovery=recovery)
    if (receipt.get('schema') != 'sts2-custody-strict-v1' or receipt.get('job') != digest(value['job'])
            or receipt.get('candidate') != value['job']['candidate']
            or receipt.get('context_sha256') != sha((Path(record).parent / 'sts2-context.json').read_bytes())):
        raise ValueError('strict pre-deployment receipt rebound')
    assembly = value['assembly']
    live = Path(assembly['live'])
    expected = copy.deepcopy(assembly['live_before'])
    targets = {row['path']: row['postimage'] for row in assembly['deployment']}
    expected['files'].update(targets)
    with checks.delegated_io(descriptors):
        current = checks.snapshot(live, assembly.get('fixture_scopes', {}).get('live', ()))
        if current['files'] != expected['files'] or current['flags'] != expected['flags']:
            raise ValueError('strict installed LIVE bytes/modes/flags differ')
        changed = set(filter(None, checks.git(live, 'diff', '--name-only', '-z', expected['head'], 'HEAD').decode().split('\0')))
        if changed - targets.keys():
            raise ValueError('LIVE history changed outside the exact deployment map')
        old_entries = {entry.partition('\t')[2]: entry.partition('\t')[0]
                       for entry in receipt['live_entries'].split('\0') if entry}
        actual_entries = checks.git(live, 'ls-files', '--stage', '-z').decode()
        wanted = dict(old_entries)
        for name, image in targets.items():
            if image is None:
                wanted.pop(name, None)
            else:
                blob = checks.text(live, 'hash-object', '--', name)
                wanted[name] = ('100755' if image['mode'] & 0o111 else '100644') + ' ' + blob + ' 0'
        actual = {entry.partition('\t')[2]: entry.partition('\t')[0]
                  for entry in actual_entries.split('\0') if entry}
        if actual != wanted:
            raise ValueError('strict LIVE index differs from exact deployment map')
        # Only metadata already independently verified above may advance.
        expected.update({name: current[name] for name in ('head', 'tree', 'entries')})
        value['assembly']['live_before'] = expected
        checks.verify_after(value, expected_main=value['job']['candidate'])
    return dict(schema='sts2-custody-installed-v1', job=digest(value['job']),
                candidate=value['job']['candidate'], live=current, strict_sha256=digest(receipt))
