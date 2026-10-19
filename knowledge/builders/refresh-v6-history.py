#!/usr/bin/env python3
"""After-run mechanical freeze -> existing metrics CLI -> existing history CLI.

Only v6-history.json is published: it contains the validated metrics, so readers
cannot observe a new history paired with old metrics. Audit reports stay in ops.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'learner'))
from evidence_identity import scan, run_identity, identities
from history_boundary import timestamp, after_run_end

STREAMS = ('runs', 'states', 'sl-attempts', 'decisions')


def now():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def descriptor(path):
    sha, size = hashlib.sha256(), 0
    with Path(path).open('rb') as handle:
        for part in iter(lambda: handle.read(1024 * 1024), b''):
            sha.update(part)
            size += len(part)
    return dict(path=str(Path(path).resolve()), bytes=size, sha256=sha.hexdigest())


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False) + '\n')
    return descriptor(path)


def strict_rows(path, limit, info, on_gap=None):
    for row, ref in scan(path, limit, info, on_gap=on_gap):
        if len(set(identities(row).values())) > 1:
            raise ValueError(f'conflicting explicit run fields: {ref}')
        yield row, ref
    if info.get('status') == 'missing' or info['incomplete_lines'] or (info['invalid_lines'] and on_gap is None):
        raise ValueError(f'incomplete frozen source: {path}; {info}')


def freeze(root, character, directory, cutoff, receipt):
    logs = root / 'logs'
    limits = {s + '.jsonl': (logs / (s + '.jsonl')).stat().st_size if (logs / (s + '.jsonl')).exists() else None for s in STREAMS}
    receipt['log_byte_limits'] = limits
    receipt['sources'] = {}
    exclusions = directory / 'excluded-source-rows.jsonl'
    exclusions.write_bytes(b'')
    exclusion_sha = hashlib.sha256()
    exclusion_counts = Counter()
    receipt['source_exclusions'] = dict(descriptor(exclusions), count=0, counts_by_stream={})

    def record_gap(ref):
        # A partial frozen tail still fails. Valid rows require the observed run-end proof.
        if ref['reason'] not in ('invalid_json', 'frame_after_run_end', 'decision_after_run_end'):
            return
        entry = dict(ref, byte_range=dict(start=ref['offset'], end_exclusive=ref['offset'] + ref['bytes']))
        data = (json.dumps(entry, ensure_ascii=False, allow_nan=False) + '\n').encode()
        with exclusions.open('ab') as out:
            out.write(data)
        exclusion_sha.update(data)
        exclusion_counts[Path(ref['source']).stem] += 1
        manifest = receipt['source_exclusions']
        manifest.update(bytes=manifest['bytes'] + len(data), sha256=exclusion_sha.hexdigest(),
                        count=sum(exclusion_counts.values()), counts_by_stream=dict(exclusion_counts))

    runs, summaries, entries = {}, defaultdict(list), {}
    excluded = Counter()
    info = receipt['sources']['runs'] = {}
    for row, ref in strict_rows(logs / 'runs.jsonl', limits['runs.jsonl'], info, record_gap):
        if not isinstance(row, dict) or str(row.get('character', '')).lower() != character or not row.get('ended'):
            continue
        ended = timestamp(row['ended'])
        if ended > cutoff:
            continue
        rid = run_identity(row)
        if not rid:
            raise ValueError('conflicting/missing ended run identity')
        if type(row.get('ascension')) is not int or type(row.get('victory')) is not bool:
            excluded['unknown_run_ascension_or_outcome'] += 1
            continue
        if rid in runs and runs[rid]['row'] != row:
            raise ValueError('conflicting ended run records')
        runs[rid] = dict(row=row, source=ref, ended=ended)
    if not runs:
        raise ValueError('no complete own ended run evidence; keep previous history')
    info = receipt['sources']['sl-attempts'] = {}
    for row, ref in strict_rows(logs / 'sl-attempts.jsonl', limits['sl-attempts.jsonl'], info, record_gap):
        rid = run_identity(row)
        if rid not in runs:
            continue
        if timestamp(row['ts']) > runs[rid]['ended']:
            raise ValueError('SL summary after its recorded run end')
        summaries[rid].append(dict(row=row, source=ref))
    coverage = []
    for rid, run in runs.items():
        stops = []
        for item in summaries[rid]:
            s = item['row']
            if s.get('result') in ('predicted_death', 'died') or s.get('reload'):
                stops.append(dict(ts=timestamp(s.get('ended_at', s['ts'])), floor=s['floor'], result=s['result']))
            if type(s.get('attempt')) is int and s['attempt'] > 1:
                stops.append(dict(ts=timestamp(s.get('started_at', s['ts'])), floor=s['floor'], result='retry_start'))
        stop = min(stops, key=lambda s: s['ts']) if stops else None
        coverage.append(dict(run_id=rid, ended=run['ended'], ascension=run['row']['ascension'], first_stop=stop,
                             first_trial_final_victory=run['row']['victory'] and stop is None,
                             final_including_sl_victory=run['row']['victory']))
    frames = directory / 'frames.jsonl'
    refs = directory / 'frame-sources.jsonl'
    info = receipt['sources']['states'] = {}
    with frames.open('w') as out, refs.open('w') as raw_refs:
        for row, ref in strict_rows(logs / 'states.jsonl', limits['states.jsonl'], info, record_gap):
            rid = run_identity(row)
            if rid not in runs:
                continue
            s = row.get('state') or {}
            r = s.get('run') or {}
            if str(r.get('character_id', '')).lower() != character:
                raise ValueError('state character mismatch')
            ts = timestamp(row['ts'])
            if ts > runs[rid]['ended']:
                excluded['frame_after_run_end'] += 1
                record_gap(dict(ref, reason='frame_after_run_end', run_id=rid, ts=ts, run_ended=runs[rid]['ended']))
                continue
            try:
                deck = [{'id': c['card_id'], 'upgraded': c['upgraded']} for c in r['deck']]
                if (any(not isinstance(c['id'], str) or type(c['upgraded']) is not bool for c in deck)
                    or any(type(r.get(k)) not in (int, float) for k in ('current_hp', 'max_hp', 'gold'))
                    or type(r.get('floor')) is not int or not isinstance(r.get('act_id'), (str, int))
                    or not isinstance(s.get('screen'), str)):
                    raise ValueError('incomplete frame')
            except (KeyError, TypeError, ValueError):
                excluded['incomplete_frame'] += 1
                continue
            frame = dict(run_id=rid, ts=ts, floor=r['floor'], act_id=str(r['act_id']), screen=s['screen'],
                         hp=r['current_hp'], max_hp=r['max_hp'], gold=r['gold'], deck=deck)
            for key in ('in_combat', 'turn'):
                if key in s:
                    frame[key] = s[key]
            if r.get('boss_id'):
                frame['boss_id'] = r['boss_id']
            out.write(json.dumps(frame) + '\n')
            raw_refs.write(json.dumps(dict(run_id=rid, source=ref)) + '\n')
            for i, item in enumerate(summaries[rid]):
                a = item['row']
                if (a.get('fight_kind') == 'boss' and a.get('floor') == frame['floor'] and frame.get('in_combat') and frame.get('turn') == 1
                    and timestamp(a['started_at']) <= ts <= timestamp(a['ended_at'])):
                    key = (rid, i)
                    if key not in entries or ts < entries[key]['ts']:
                        entries[key] = dict(ts=ts, hp=frame['hp'], max_hp=frame['max_hp'])
    info = receipt['sources']['decisions'] = {}
    # Validate the decision prefix too: the existing combo CLI reopens the same frozen cuts.
    for row, ref in strict_rows(logs / 'decisions.jsonl', limits['decisions.jsonl'], info, record_gap):
        rid = run_identity(row)
        if rid in runs and after_run_end(row, runs[rid]['ended']):
            excluded['decision_after_run_end'] += 1
            record_gap(dict(ref, reason='decision_after_run_end', run_id=rid,
                            ts=timestamp(row['ts']), run_ended=runs[rid]['ended']))
    fights = []
    for rid, items in summaries.items():
        for i, item in enumerate(items):
            s = item['row']
            if s.get('fight_kind') != 'boss':
                continue
            fights.append(dict(run_id=rid, ascension=runs[rid]['row']['ascension'], floor=s['floor'],
                               boss=s['encounter'], attempt=s['attempt'], started_at=timestamp(s['started_at']),
                               ended_at=timestamp(s['ended_at']), result=s['result'], entry=entries.get((rid, i))))
    receipt['excluded'] = dict(excluded)
    receipt['ended_runs'] = sorted(runs)
    receipt['run_sources'] = {rid: run['source'] for rid, run in runs.items()}
    receipt['frame_sources'] = descriptor(refs)
    receipt['fight_sources'] = write(directory / 'fight-sources.json', dict(summaries))
    opportunities_path = root / 'knowledge/characters' / character / 'construction-opportunities.json'
    original = opportunities_path.read_bytes()
    receipt['opportunities_source'] = descriptor(opportunities_path)
    if hashlib.sha256(original).hexdigest() != receipt['opportunities_source']['sha256']:
        raise ValueError('opportunities changed during freeze')
    opportunities = json.loads(original)
    if opportunities['character'] != character or timestamp(opportunities['cutoff']) > cutoff:
        raise ValueError('opportunities scope/cutoff mismatch')
    # Preserve the real opportunity observations and metadata; the original history CLI filters first attempts.
    opportunities['rows'] = [o for o in opportunities['rows'] if o['run'] in runs and timestamp(o['ts']) <= runs[o['run']]['ended']]
    inputs = dict(coverage=write(directory / 'coverage.json', coverage), frames=descriptor(frames),
                  fights=write(directory / 'fights.json', fights),
                  opportunities=write(directory / 'opportunities.json', opportunities), combo_metrics=None)
    receipt['limitations'] = ['first stop uses recorded SL only; unlogged retries remain unknown',
                              'sparse/missing frames and activation evidence are never filled',
                              'complete malformed rows are excluded with raw byte ranges/SHA; missing evidence remains unknown',
                              'frames and decisions strictly after the observed run end are excluded with raw byte ranges/SHA; no grace period',
                              'no simulation, trust calibration or knowledge publication']
    return inputs, limits


def refresh(root, ops_root, character, run_command=None):
    root, ops_root = Path(root).resolve(), Path(ops_root).resolve()
    if character != 'silent':
        return dict(status='unchanged_other_character', character=character), 0
    parent = ops_root / 'ops/codex-ops/v6-refresh' / character
    parent.mkdir(parents=True, exist_ok=True)
    directory = Path(tempfile.mkdtemp(prefix='refresh-', dir=parent))
    receipt = dict(schema='v6-refresh-receipt-v1', character=character, started_at=now(), steps=[],
                   published=None, production_consumption=None, directory=str(directory))
    runner = run_command or subprocess.run
    node = shutil.which('node', path=str(Path.home() / '.local/node/bin') + os.pathsep + os.environ.get('PATH', ''))
    check = root / 'knowledge/builders/check-v6-refresh.mts'
    child_env = dict(os.environ, PATH=(str(Path(node).parent) + os.pathsep if node else '') + os.environ.get('PATH', ''))

    def command(name, argv):
        step = dict(name=name, argv=list(map(str, argv)), started_at=now(), exit_code=None)
        receipt['steps'].append(step)
        try:
            with (directory / (name + '.stdout')).open('wb') as out, (directory / (name + '.stderr')).open('wb') as err:
                result = runner(step['argv'], cwd=root / 'agent', stdout=out, stderr=err, env=child_env)
            step['exit_code'] = result.returncode
        except Exception as error:
            step['spawn_error'] = f'{type(error).__name__}: {error}'
            raise
        finally:
            step.update(ended_at=now(), stdout=descriptor(directory / (name + '.stdout')),
                        stderr=descriptor(directory / (name + '.stderr')))
        if result.returncode:
            raise RuntimeError(f'{name} failed with exit {result.returncode}')

    try:
        if node is None:
            raise ValueError('node unavailable; do not install dependencies')
        # Use the existing publication lock, shared with main/live integration.
        with (ops_root / 'ops/live-merge.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            own = root / 'knowledge/characters' / character
            if own.resolve() != root / 'knowledge/characters' / character or any((own / name).is_symlink() for name in ('build-cores.json', 'v6-history.json', 'construction-opportunities.json')):
                raise ValueError('redirected character knowledge path')
            inputs, limits = freeze(root, character, directory, receipt['started_at'], receipt)
            log_manifest = directory / 'logs.json'
            write(log_manifest, dict(log_byte_limits=limits, source_exclusions=receipt['source_exclusions']))
            spec = root / 'knowledge/characters' / character / 'build-cores.json'
            has_cores = False
            if spec.exists():
                if spec.stat().st_size > 8 * 1024 * 1024:
                    raise ValueError('core source exceeds production size limit')
                frozen_spec = directory / 'build-cores.json'
                receipt['spec_source'] = descriptor(spec)
                frozen_spec.write_bytes(spec.read_bytes())
                receipt['spec'] = descriptor(frozen_spec)
                if receipt['spec']['sha256'] != receipt['spec_source']['sha256']:
                    raise ValueError('core source changed during freeze')
                command('validate-cores', [node, '--import', 'tsx', check, 'cores', frozen_spec, character])
                has_cores = bool(json.loads(frozen_spec.read_bytes())['entries'])
            if has_cores:
                combo = directory / 'combo-metrics.json'
                argv = [sys.executable, root / 'knowledge/builders/build-combo-metrics.py', '--logs', root / 'logs',
                        '--spec', frozen_spec, '--character', character, '--manifest', log_manifest,
                        '--simulation', 'off', '--output', combo]
                for rid in receipt['ended_runs']:
                    argv += ['--run', rid]
                command('combo-metrics', argv)
                inputs['combo_metrics'] = descriptor(combo)
            else:
                receipt['combo_metrics'] = dict(status='unavailable', reason='no formal build-core entries; runtime construction adapter retained',
                                                exit_code=None)
            manifest = directory / 'history-inputs.json'
            receipt['manifest'] = write(manifest, dict(schema='v6-history-inputs-v1', character=character,
                                                      cutoff=receipt['started_at'], inputs=inputs))
            output = directory / 'v6-history.json'
            command('v6-history', [sys.executable, root / 'knowledge/builders/build-v6-history.py',
                                   '--manifest', manifest, '--out', output])
            command('validate-history', [node, '--import', 'tsx', check, 'history', output, character])
            # The original CLI validates schema/hash/scope and seals the output before returning success.
            pack = json.loads(output.read_bytes())
            if pack['schema'] != 'v6-frozen-history-v1' or pack['data']['character'] != character or pack['data']['cutoff'] != receipt['started_at']:
                raise ValueError('history output scope mismatch')
            # Detect modifications to frozen prefixes; appended future rows are deliberately ignored.
            # Exclusions were already recorded in full; the second scan checks every raw byte, including gaps.
            for stream, before in receipt['sources'].items():
                after = {}
                for _row, _ref in strict_rows(root / 'logs' / (stream + '.jsonl'), before['source_size'], after, on_gap=lambda _gap: None):
                    pass
                if after['source_sha256'] != before['source_sha256']:
                    raise ValueError('frozen source changed: ' + stream)
            receipt['output'] = descriptor(output)
            target = root / 'knowledge/characters' / character / 'v6-history.json'
            receipt['previous'] = descriptor(target) if target.exists() else None
            if target.exists():
                previous = directory / 'previous-v6-history.json'
                previous.write_bytes(target.read_bytes())
                receipt['rollback_copy'] = descriptor(previous)
            fd, temporary = tempfile.mkstemp(prefix='.v6-history-', dir=target.parent)
            try:
                with os.fdopen(fd, 'wb') as out:
                    out.write(output.read_bytes())
                    out.flush()
                    os.fsync(out.fileno())
                    os.fchmod(out.fileno(), 0o644)
                os.replace(temporary, target)
            finally:
                Path(temporary).unlink(missing_ok=True)
            receipt.update(status='published', published=dict(path=str(target), sha256=receipt['output']['sha256'], at=now()))
        code = 0
    except Exception as error:
        receipt.update(status='failed', error=f'{type(error).__name__}: {error}')
        code = 1
    receipt.update(ended_at=now(), exit_code=code)
    write(directory / 'receipt.json', receipt)
    if code:
        queue = ops_root / 'ops/codex-ops/queue'
        queue.mkdir(parents=True, exist_ok=True)
        event = queue / f'{time.time_ns()}-knowledge-refresh-failed.md'
        temporary = event.with_name('.' + event.name)
        temporary.write_text(f'V6 history refresh failed ({character}); previous packet retained. {receipt["error"]}\nReceipt: {directory / "receipt.json"}\n')
        os.replace(temporary, event)
    return receipt, code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--ops-root', type=Path, required=True)
    parser.add_argument('--character', required=True, choices=['silent', 'ironclad', 'regent', 'defect', 'necrobinder'])
    args = parser.parse_args()
    receipt, code = refresh(args.root, args.ops_root, args.character)
    print(json.dumps(receipt, ensure_ascii=False))
    return code


if __name__ == '__main__':
    raise SystemExit(main())
