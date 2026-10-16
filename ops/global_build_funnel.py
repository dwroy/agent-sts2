#!/usr/bin/env python3
"""Idempotent completed-run hook; archive every fixed ten V5 runs, without a timer or model."""
import argparse
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

CODE_ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('funnel_eval', CODE_ROOT / 'eval/global_build_funnel.py')
funnel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(funnel)


def jsonl(path):
    if not path.exists():
        return []
    result = []
    with path.open('rb') as handle:
        for raw in handle:
            if not raw.endswith(b'\n'):
                break
            result.append(json.loads(raw))
    return result


def quick_cohort(root):
    configs = {}
    for row in jsonl(root / 'logs/run-config.jsonl'):
        configs.setdefault(row.get('run_id'), row)
    result = {}
    for row in jsonl(root / 'logs/runs.jsonl'):
        rid = row.get('run_id')
        cfg = configs.get(rid, {})
        commit = (cfg.get('code') or {}).get('commit')
        if rid in funnel.EXCLUDED or cfg.get('character') != 'SILENT' or cfg.get('ascension') != 10 or not commit:
            continue
        if funnel.ancestor(funnel.V5_ROOT, commit):
            result[rid] = row
    return result


def next_boundary(count, last):
    """Never merge a partial tail, and never advance on a failed/incomplete archive."""
    return (last + 10) if count >= last + 10 else None


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')


def store_state(state_file, value):
    temporary = state_file.with_suffix('.tmp')
    write_json(temporary, value)
    os.replace(temporary, state_file)


def append_decision(root, state):
    """Repair an interrupted record step without re-exporting or duplicating a completed archive."""
    archive = root / state['archive']
    data = json.loads((archive / 'funnel.json').read_text())
    marker = f"G1c-archive:{state['archive']}"
    log = root / 'paper/materials/decision-log.md'
    if log.exists() and marker in log.read_text():
        return
    date = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
    line = f"\n- {date} watcher G1c 每10完局漏斗归档：Silent A10 V5描述性局集合到{state['last_completed_boundary']}局，新增边界{data['cadence_boundaries']}；含最终/ops首试、逐Boss、幕路上存活、死因及未知。证据 {state['archive']}/funnel.json；不声称原生来源门槛或因果收益。[{marker}]\n"
    with log.open('a') as handle:
        handle.write(line)


def freeze(root, target):
    sys.path.insert(0, str(CODE_ROOT / 'agent/tools/logdb'))
    import query
    import sync as logsync
    db = str(root / 'data/logdb')
    logsync.be_gentle()
    logsync.sync(str(root / 'logs'), db, quiet=True, wait=False)
    exports = {}
    with logsync.read_lock(db, shared=True):
        con = query.connect(db, threads=2)
        manifest = (Path(db) / 'manifest.json').read_bytes()
        (target / 'logdb-manifest.json').write_bytes(manifest)
        for table, sql in [
            ('runs-since-20261012', "SELECT r.*, c.commit AS cfg_commit FROM runs r LEFT JOIN (SELECT run_id,commit FROM run_config QUALIFY row_number() OVER (PARTITION BY run_id ORDER BY off)=1) c USING(run_id) WHERE r.character='SILENT' AND r.ascension=10 AND r.finished AND r.started >= TIMESTAMP '2026-10-12 00:00:00' ORDER BY r.started,r.run_id"),
            ('run_config', "SELECT * FROM run_config WHERE character='SILENT' AND ascension=10 ORDER BY off"),
            ('fights', "SELECT * FROM fights WHERE character='SILENT' AND ascension=10 AND first_ts >= TIMESTAMP '2026-10-12 00:00:00' ORDER BY run_id,fight_no"),
            ('floors', "SELECT * FROM floors WHERE ascension=10 AND first_ts >= TIMESTAMP '2026-10-12 00:00:00' ORDER BY run_id,floor"),
            ('sl_attempts', "SELECT * FROM sl_attempts WHERE ts >= TIMESTAMP '2026-10-12 00:00:00' ORDER BY run_id,ts,off")]:
            value = query.run_query(con, sql, max_rows=1000000, timeout=60)
            if value.get('error') or value.get('truncated'):
                raise ValueError(f'incomplete {table} export')
            path = target / f'{table}.json'
            write_json(path, value)
            exports[table] = {'sql': sql, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'rows': value['row_count']}
        con.close()
    write_json(target / 'input-manifest.json', {'logdb_manifest_sha256': hashlib.sha256(manifest).hexdigest(), 'exports': exports})


def run(root, character):
    if character.lower() != 'silent':
        return {'status': 'other_character_unchanged'}
    state_dir = root / 'ops/codex-ops/global-build-funnel'
    state_dir.mkdir(parents=True, exist_ok=True)
    with (state_dir / 'cadence.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'status': 'existing_worker_owns_cadence'}
        state_file = state_dir / 'state.json'
        state = json.loads(state_file.read_text()) if state_file.exists() else {'last_completed_boundary': 0}
        if state.get('archive') and not state.get('decision_notified', False):
            append_decision(root, state)
            state['decision_notified'] = True
            store_state(state_file, state)
        last = state['last_completed_boundary']
        quick = quick_cohort(root)
        if next_boundary(len(quick), last) is None:
            return {'status': 'waiting_for_ten', 'count': len(quick), 'last': last}
        materials = root / 'paper/materials'
        materials.mkdir(parents=True, exist_ok=True)
        day = subprocess.check_output(['date', '+%Y%m%d-%H%M%S'], text=True).strip()
        scratch = Path(tempfile.mkdtemp(prefix=f'{day}-global-build-g1c-incomplete-', dir=materials))
        # Incomplete exports and failed archives remain as evidence, never successful cadence state.
        freeze(root, scratch)
        versions = json.loads((CODE_ROOT / 'eval/versions.json').read_text())['versions']
        data = funnel.from_exports(scratch, versions)
        complete = len(data['per_run']) // 10 * 10
        if complete < last + 10:
            write_json(scratch / 'waiting.json', {'status': 'database_not_yet_caught_up', 'quick_count': len(quick), 'exported': len(data['per_run'])})
            return {'status': 'database_not_yet_caught_up', 'archive': str(scratch)}
        archive = materials / f'{day}-global-build-g1c-through-{complete:06d}'
        data['cadence_boundaries'] = list(range(last+10, complete+1, 10))
        data['input_manifest_sha256'] = hashlib.sha256((scratch / 'input-manifest.json').read_bytes()).hexdigest()
        write_json(scratch / 'funnel.json', data)
        (scratch / 'funnel.md').write_text(funnel.markdown(data))
        scratch.rename(archive)
        new_state = {'last_completed_boundary': complete, 'archive': str(archive.relative_to(root)),
                     'decision_notified': False, 'run_ids_through_boundary': [r['run_id'] for r in data['per_run'][:complete]]}
        store_state(state_file, new_state)
        append_decision(root, new_state)
        new_state['decision_notified'] = True
        store_state(state_file, new_state)
        return {'status': 'archived', **new_state}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=str(CODE_ROOT))
    parser.add_argument('--character', required=True)
    args = parser.parse_args()
    print(json.dumps(run(Path(args.root).resolve(), args.character), ensure_ascii=False))


if __name__ == '__main__':
    main()
