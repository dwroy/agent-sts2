#!/usr/bin/env python3
"""Export frozen logdb rows and SHA-bound raw decision/brain/SL projections, using two query threads."""
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query
import sync


def clean(x):
    if isinstance(x, (dt.datetime, dt.date)):
        return x.isoformat()
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [clean(v) for v in x]
    return x


def dump(path, rows):
    with path.open('xb') as raw, gzip.GzipFile(fileobj=raw, mode='wb', mtime=0) as stream:
        for row in rows:
            stream.write((json.dumps(clean(row), ensure_ascii=False, separators=(',', ':')) + '\n').encode())


def main():
    freeze = json.loads((BASE / 'freeze.json').read_bytes())
    ids = freeze['pre_runs'] + freeze['post_runs']
    assert all(r.isalnum() for r in ids)
    clause = ','.join("'" + r + "'" for r in ids)
    source = freeze['sources']
    out = BASE / 'inputs'
    out.mkdir(exist_ok=True)
    assert not (out / 'manifest.json').exists(), 'Preserve the frozen export.'
    statements = {
        'fights': f'SELECT * FROM fights WHERE run_id IN ({clause}) AND last_off < {source["states"]["complete_prefix_bytes"]} ORDER BY run_id,first_off',
        'frames': f'SELECT off,len,ts,observed_ts,observed,run_id,screen,in_combat,turn,floor,hp,max_hp,deck_size,deck,relics,potions,player_hp,enemies,incoming,go_victory,go_floor,map_node,boss_id FROM frames WHERE run_id IN ({clause}) AND off+len <= {source["states"]["complete_prefix_bytes"]} ORDER BY off',
        'decisions-index': f'SELECT off,len,run_id,label,floor,turn,ts FROM decisions WHERE run_id IN ({clause}) AND off+len <= {source["decisions"]["complete_prefix_bytes"]} ORDER BY off',
        'brain-index': f"SELECT off,len,run_id,label,ts FROM llm_calls_raw WHERE src='brain' AND run_id IN ({clause}) AND off+len <= {source['brain']['complete_prefix_bytes']} ORDER BY off",
        'sl-index': f'SELECT off,len,run_id,floor,attempt,result FROM sl_attempts WHERE run_id IN ({clause}) AND off+len <= {source["sl-attempts"]["complete_prefix_bytes"]} ORDER BY off',
    }
    queried = {}
    with sync.read_lock(str(ROOT / 'data/logdb'), shared=True):
        con = query.connect(str(ROOT / 'data/logdb'), threads=2)
        for name, sql in statements.items():
            cursor = con.execute(sql)
            columns = [d[0] for d in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            queried[name] = rows
            dump(out / f'{name}.jsonl.gz', rows)
            print(json.dumps({'table': name, 'rows': len(rows)}), flush=True)
        con.close()
    kept = {}
    for name, index, filename in [('decisions', 'decisions-index', 'decisions.jsonl'),
                                   ('brains', 'brain-index', 'brain.jsonl'), ('sl', 'sl-index', 'sl-attempts.jsonl')]:
        result = []
        with (ROOT / 'logs' / filename).open('rb') as stream:
            for ref in queried[index]:
                stream.seek(ref['off'])
                raw = stream.read(ref['len'])
                row = json.loads(raw)
                actual_run = row.get('run_id')
                if not actual_run and isinstance(row.get('fingerprint'), str):
                    actual_run = json.loads(row['fingerprint']).get('run')
                assert actual_run == ref['run_id'], (name, ref)
                binding = {'path': f'logs/{filename}', 'off': ref['off'], 'len': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
                if name == 'decisions':
                    keys = ('ts', 'observed_ts', 'run_id', 'decision_id', 'mode', 'screen', 'floor', 'turn', 'label', 'decider',
                            'chosen', 'answers', 'rationale', 'result', 'sl_attempt', 'sl_reloads', 'rollout', 'reasked', 'deepseek',
                            'action', 'fallback', 'escalation', 'timing', 'usage', 'latency_ms', 'boss_sim', 'questions')
                    projected = {k: row.get(k) for k in keys if k in row}
                    sim = projected.get('boss_sim')
                    if isinstance(sim, dict):
                        projected['boss_sim'] = {k: v for k, v in sim.items() if k not in ('construction', 'global_build')}
                    fingerprint = json.loads(row['fingerprint']) if isinstance(row.get('fingerprint'), str) else {}
                    projected['fingerprint_metadata'] = {k: v for k, v in fingerprint.items() if k in ('run', 'floor', 'turn', 'hp', 'max_hp', 'gold', 'act', 'boss')}
                elif name == 'brains':
                    keys = ('ts', 'run_id', 'question_id', 'label', 'engine', 'model', 'effort', 'accepted', 'error', 'problems',
                            'answer', 'reasks', 'attempts', 'fallback', 'fallback_from')
                    projected = {k: row.get(k) for k in keys if k in row}
                    payload = row.get('payload') or {}
                    facts = payload.get('facts') or {} if isinstance(payload, dict) else {}
                    projected['payload_facts'] = {k: facts[k] for k in ('boss_readiness', 'build_ranking', 'boss_sim', 'boss_relative_margin') if k in facts}
                    projected['payload_fact_keys'] = list(facts)
                    projected['options'] = row.get('options')
                else:
                    projected = {k: v for k, v in row.items() if k != 'summary'}
                    projected['summary'] = row.get('summary')
                projected['run_id'] = actual_run
                projected['_source'] = binding
                result.append(projected)
        dump(out / f'{name}.jsonl.gz', result)
        kept[name] = len(result)
    counts = {}
    for run in freeze['runs']:
        rid = run['run_id']
        n = sum(r['run_id'] == rid for r in queried['decisions-index'])
        counts[rid] = {'indexed_decisions': n, 'finished_summary_decisions': run['finished'].get('decisions'),
                       'equal': n == run['finished'].get('decisions')}
    manifest = {'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'freeze_sha256': hashlib.sha256((BASE / 'freeze.json').read_bytes()).hexdigest(),
                'queries': statements, 'query_threads': 2, 'raw_projection_rows': kept, 'decision_coverage': counts,
                'all_decision_counts_match': all(v['equal'] for v in counts.values()),
                'files': [{'path': str(p.relative_to(BASE)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('*.gz'))],
                'limits': 'Frozen table exports are reproducible inputs. Brain/decision/SL originals retain SHA-bound offsets; no predictions recomputed, no model calls. Fight view can merge SL attempts: first-attempt outcomes are separately resolved from sl-attempts, never inferred from this view alone.'}
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'counts': kept, 'all_decision_counts_match': manifest['all_decision_counts_match']}))


if __name__ == '__main__':
    main()
