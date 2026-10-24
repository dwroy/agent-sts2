#!/usr/bin/env python3
"""Extract complete observed offer sets, including unchosen cards, from one character's brain log.

This is an observational supply table, not a learned strategy or a game drop-rate specification.
Duplicate room/offer identities are counted once; costs that cannot be read are never filled with zero.
"""
from refresh_publish import replace as publish_replace
import argparse
import bisect
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path


def state_lookup(root, character):
    """Index only; read matching original bytes lazily to recover explicit upgrade flags/prices."""
    if not (root / 'data/logdb/frames').is_dir():
        return {}
    try:
        import duckdb
        db = duckdb.connect(config={'threads': 1})
        rows = db.execute("SELECT run_id, floor, coalesce(observed_ts,ts) AS seen_at, off, len FROM read_parquet(?, union_by_name=true) WHERE lower(character)=? AND screen IN ('REWARD','SHOP') ORDER BY seen_at,off",
                          [str(root / 'data/logdb/frames/*.parquet'), character]).fetchall()
        db.close()
        grouped = {}
        for run, floor, ts, off, size in rows:
            grouped.setdefault((run, floor), []).append((ts.isoformat(timespec='milliseconds')+'Z', off, size))
        return grouped
    except (ImportError, OSError):
        return {}


def read_json(value):
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError):
        return {}


def extract(root, logs, character, cutoff=None, prepared=None, lines=None):
    if prepared is None:
        from legacy_incremental import context
        cache = context(logs / "brain.jsonl")
        if cache:
            return cache.construction(root, logs, character, cutoff, extract, state_lookup)
    if prepared is None:
        runs = {}
        with (logs / 'runs.jsonl').open() as handle:
            for line in handle:
                row = json.loads(line)
                if str(row.get('character', '')).lower() == character:
                    runs[row['run_id']] = row
        catalog = json.loads((root / 'data/game-data.json').read_text())['collections']['cards']
        names = {c['name']: c['id'] for c in catalog if c.get('name')}
        names.update({c['id']: c['id'] for c in catalog})
    else:
        runs, names, frames = prepared
    rows, seen, visits = [], set(), set()
    excluded = {'incomplete_offers': 0, 'repeat_shop_visit': 0, 'unknown_upgrade': 0}
    if prepared is None:
        frames = state_lookup(root, character)
    source = logs / 'brain.jsonl'
    limit = source.stat().st_size
    digest = hashlib.sha256()
    with source.open('rb') as handle:
        def original_lines():
            while handle.tell() < limit:
                offset = handle.tell()
                raw = handle.readline()
                if not raw.endswith(b'\n') or handle.tell() > limit:
                    return
                yield offset, raw
        for offset, raw in (original_lines() if lines is None else lines):
            digest.update(raw)
            try:
                row = json.loads(raw)
            except ValueError:
                continue
            run = runs.get(row.get('run_id'))
            if not run or row.get('label') not in ('reward/card', 'shop/plan', 'shop/buy'):
                continue
            if row.get('engine') != 'codex' or row.get('accepted') is not True or (cutoff and row.get('ts', '') >= cutoff):
                continue
            facts = read_json(read_json(row.get('payload')).get('facts'))
            act, floor = facts.get('act'), facts.get('floor')
            if not isinstance(act, int) or not isinstance(floor, int):
                continue
            kind = 'reward' if row['label'] == 'reward/card' else 'shop'
            original, original_source = {}, None
            candidates = frames.get((row['run_id'], floor), [])
            end = bisect.bisect_right(candidates, (row['ts'], float('inf'), float('inf')))
            for _, off, size in reversed(candidates[max(0, end-5):end]):
                with (logs / 'states.jsonl').open('rb') as states:
                    states.seek(off)
                    raw_state = states.read(size)
                try:
                    s = json.loads(raw_state)['state']
                except (ValueError, KeyError):
                    continue
                entries = (s.get('reward') or {}).get('card_options', []) if kind == 'reward' else (s.get('shop') or {}).get('cards', [])
                if entries:
                    original = {str(c.get('index', i)): c for i, c in enumerate(entries)}
                    original_source = {'path': 'states.jsonl', 'offset': off, 'bytes': size, 'sha256': hashlib.sha256(raw_state).hexdigest()}
                    break
            offers, incomplete = [], False
            for key, value in (row.get('options') or {}).items():
                item = read_json(value)
                if kind == 'shop' and not key.startswith('buy_card'):
                    continue
                name = item.get('card') or item.get('buy') or item.get('name')
                if not isinstance(name, str) or name == 'skip':
                    continue
                ident = names.get(name.rstrip('+'))
                price = 0 if kind == 'reward' else item.get('price')
                if not ident or not isinstance(price, (int, float)) or isinstance(price, bool) or price < 0:
                    incomplete = True
                    continue
                index = key.removeprefix('buy_card').removeprefix('card')
                observed = original.get(index, {})
                upgraded = observed.get('upgraded') if observed.get('card_id') == ident else item.get('upgraded')
                if not isinstance(upgraded, bool):
                    incomplete = True
                    excluded['unknown_upgrade'] += 1
                    continue
                offers.append({'id': ident, 'upgraded': upgraded, 'price': price})
            if incomplete:
                excluded['incomplete_offers'] += 1
                continue
            if not offers:
                continue
            visit = (row['run_id'], act, floor, kind)
            if kind == 'shop' and visit in visits:
                excluded['repeat_shop_visit'] += 1
                continue
            visits.add(visit)
            offers.sort(key=lambda o: (o['id'], o['upgraded'], o['price']))
            token = json.dumps([row['run_id'], act, floor, kind, offers], sort_keys=True)
            ident = hashlib.sha256(token.encode()).hexdigest()[:24]
            if ident in seen:
                continue
            seen.add(ident)
            rows.append({'id': ident, 'run': row['run_id'], 'ts': row['ts'], 'act': act,
                         'ascension': run['ascension'], 'floor': floor, 'kind': kind, 'offers': offers,
                         'source': {'offset': offset, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()},
                         'state_source': original_source})
    return {'schema': 'construction-opportunities-v1', 'character': character,
            'generated': datetime.now(timezone.utc).isoformat(), 'cutoff': cutoff or max((r['ts'] for r in rows), default=''),
            'digest': hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest(),
            'source_digest': digest.hexdigest(), 'source_bytes': limit, 'rows': rows, 'excluded': excluded,
            'limitations': ['只含本角色实际Codex可读题面；缺失题面、隐藏供给、未访路线和未解锁来源未知。',
                            '历史路线/存活/策略存在选择偏差；不是游戏真实掉率。',
                            '按局/幕/层/来源/完整选项去重，SL重复不增加样本；同层同组选项的独立再奖励可能被合并。',
                            'reward/shop分层；目前不外推事件、遗物、金币增长或跨来源相关性。']}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument('--logs', type=Path)
    p.add_argument('--character', required=True, choices=['silent', 'regent', 'ironclad', 'defect', 'necrobinder'])
    p.add_argument('--cutoff')
    p.add_argument('--out', type=Path)
    args = p.parse_args()
    output = args.out or args.root / 'knowledge/characters' / args.character / 'construction-opportunities.json'
    result = extract(args.root, args.logs or args.root / 'logs', args.character, args.cutoff)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    publish_replace(temporary, output)
    print(json.dumps({'path': str(output), 'opportunities': len(result['rows']), 'digest': result['digest']}))
