"""Offline combat supplement for #24/#30; aggregate output only.

Uses the existing read-only external database and immutable logdb shards. No
players-table reads, raw exports, network access, production imports or writes.
"""
import argparse
import collections as C
import csv
import datetime
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import random
import re
import statistics

from sts2fun_stats import connect, quantile, write_csv, write_json

FILTER = "character='SILENT' AND ascension=10 AND n_players=1 AND is_valid=1 AND was_abandoned=0 AND has_modifiers=0 AND patch_major='v0.111'"
TABLES = {'frames', 'decisions', 'runs_raw', 'sl_attempts', 'run_config'}


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def freeze_logdb(source, target):
    """Pin immutable shards under the reader lock; never sync the shared DB."""
    if (target/'snapshot.json').exists():
        raise ValueError('Refusing to replace an existing frozen snapshot')
    target.mkdir(parents=True, exist_ok=True)
    rows = []
    with (source/'read.lock').open('rb') as lock:
        fcntl.flock(lock, fcntl.LOCK_SH)
        metadata = json.loads((source/'manifest.json').read_text())
        for table in sorted(TABLES):
            (target/table).mkdir(exist_ok=True)
            for path in sorted((source/table).glob('*.parquet')):
                dest = target/table/path.name
                os.link(path, dest)
                rows.append(dict(path=f'{table}/{path.name}', bytes=dest.stat().st_size, sha256=sha(dest)))
    sources = {k: {x: y for x, y in v.items() if x != 'shards'}
               for k, v in metadata['sources'].items() if v.get('table') in TABLES}
    write_json(target/'snapshot.json', dict(frozen_at=datetime.datetime.now().astimezone().isoformat(),
               files=rows, logdb_updated=metadata['updated'], raw_source_receipts=sources,
               raw_hash_basis='Logdb sync head SHA1 and byte offsets inherited; full raw-log SHA not recomputed. Frozen parquet SHA256 verified.'))


def composition(ids):
    return '+'.join(sorted(x.removeprefix('MONSTER.') for x in ids))


def external(db):
    fights, mapping, audit, builds = [], C.defaultdict(set), C.Counter(), C.Counter()
    con = connect(db)
    sql = 'SELECT player_id,win,raw_json FROM runs WHERE ' + FILTER + ' ORDER BY id'
    for ordinal, (pid, win, raw) in enumerate(con.execute(sql)):
        if type(pid) is not int:
            raise ValueError('Non-integer external player key')
        data = json.loads(raw)
        audit['runs'] += 1
        audit['wins'] += bool(win)
        builds[str(data.get('build_id'))] += 1
        for act, points in enumerate(data['map_point_history'], 1):
            for point in points:
                rooms = point.get('rooms', [])
                combat = [r for r in rooms if r.get('room_type') in ('monster', 'elite', 'boss')]
                for room in combat:
                    ids, eid = room.get('monster_ids'), room.get('model_id')
                    if ids and isinstance(eid, str):
                        mapping[act, room['room_type'], composition(ids)].add(eid)
                if not combat:
                    continue
                audit['combat_points'] += 1
                stats = point.get('player_stats', [])
                if len(rooms) != 1 or len(combat) != 1 or len(stats) != 1:
                    audit['multi_room_or_non_solo_points_excluded'] += 1
                    continue
                room, stat = combat[0], stats[0]
                eid = room.get('model_id')
                if not isinstance(eid, str):
                    audit['missing_encounter_excluded'] += 1
                    continue
                turns, damage, heal, hp = (room.get('turns_taken'), stat.get('damage_taken'),
                                          stat.get('hp_healed'), stat.get('current_hp'))
                turns = turns if number(turns) and turns > 0 else None
                damage = damage if number(damage) and damage >= 0 else None
                heal = heal if number(heal) and heal >= 0 else None
                fights.append(dict(run=ordinal, unit=pid, act=act, kind=room['room_type'], eid=eid,
                                   turns=turns, death=(hp <= 0) if number(hp) else None,
                                   gross_damage=damage, point_net=damage-heal if damage is not None and heal is not None else None,
                                   entry_hp=None, deck_size=None))
    con.close()
    audit['players'] = len({f['unit'] for f in fights})
    audit['fights'] = len(fights)
    return fights, mapping, dict(audit), dict(builds)


def resolve_mapping(mapping, act, monsters, room):
    """Require a unique model ID in this cohort, without guessing weak/strong IDs.

    Unknown-map fights may be ordinary combats, but are never promoted to an
    elite/boss by their monster names. This remains an empirical mapping, not a
    native encounter ID observation.
    """
    kind = {'hallway': 'monster', 'unknown_room': 'monster', 'elite': 'elite', 'boss': 'boss'}.get(room)
    candidates = mapping.get((act, kind, monsters), set()) if kind else set()
    return (next(iter(candidates)) if len(candidates) == 1 else None), kind, len(candidates)


def outcomes(segments, sl):
    """Keep actual terminal death separate from a pre-emptive SL failure proxy."""
    segments = sorted(segments, key=lambda f: f['fight_no'])
    sl = sorted(sl, key=lambda f: (str(f['ts']), f['off']))
    first, last = segments[0], segments[-1]
    terminal = [s for s in sl if s['result'] in ('won', 'died')]
    final_result = terminal[-1]['result'] if terminal else last['outcome']
    # A trailing predicted-death/unfinished record establishes no final outcome.
    if sl and sl[-1]['result'] not in ('won', 'died'):
        final_result = None
    death = final_result == 'died' if final_result in ('won', 'died') else None
    opening = [s for s in sl if s['attempt'] == 1]
    if sl:
        value = {s['result'] for s in opening}
        first_result = next(iter(value)) if len(value) == 1 else None
    else:
        first_result = first['outcome'] if len(segments) == 1 else None
    first_failure = (first_result != 'won') if first_result in ('won', 'died', 'predicted_death') else None
    # Reloads can split, omit or merge frame segments. The SL log explicitly
    # records the last turn of each attempt, so its terminal row can supply
    # final-attempt turns, but never use a merged segment's maximum turn.
    clean = len(segments) == 1 and not sl and death is not None and first.get('first_turn') == 1
    turns = last['turns'] if clean else None
    if sl and terminal and death is not None:
        t = terminal[-1].get('turns')
        turns = t if number(t) and t > 0 else None
    return dict(death=death, first_failure=first_failure,
                predicted_first=first_result == 'predicted_death', sl=bool(sl),
                segments=len(segments), turns=turns,
                net_hp=last['net_hp_loss'] if clean else None,
                entry_hp=first['entry_hp'] if first.get('first_turn') == 1 else None,
                max_hp=first['max_hp'], deck_size=first['deck_size'] if first.get('first_turn') == 1 else None)


def own(snapshot, views, paper_runs):
    import duckdb
    manifest = json.loads((snapshot/'snapshot.json').read_text())
    expected = {r['path'] for r in manifest['files']}
    found = {str(p.relative_to(snapshot)) for t in TABLES for p in (snapshot/t).glob('*.parquet')}
    if expected != found:
        raise ValueError('Frozen shard file set mismatch')
    for row in manifest['files']:
        p = snapshot/row['path']
        if p.stat().st_size != row['bytes'] or sha(p) != row['sha256']:
            raise ValueError('Frozen shard hash mismatch: ' + row['path'])
    con = duckdb.connect(config={'threads': 1, 'memory_limit': '512MB'})
    text = views.read_text().split('-- ---------------------------------------------------------------- turns')[0]
    text = '\n'.join(line for line in text.splitlines() if not (
        (m := re.match(r'CREATE OR REPLACE VIEW (\w+) AS SELECT \* FROM read_parquet', line))
        and m[1] not in TABLES))
    con.execute(text.replace('${DB}', str(snapshot.resolve()).replace("'", "''")))

    def records(sql):
        cursor = con.execute(sql)
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    runs = records("SELECT run_id,code,ended,victory FROM runs_raw WHERE character='SILENT' AND ascension=10")
    eligible = {r['run_id'] for r in runs}
    if len(eligible) != len(runs):
        raise ValueError('Repeated completed run rows need explicit resolution')
    with paper_runs.open(newline='') as f:
        paper = {r['run_id']: r for r in csv.DictReader(f)
                 if r['character'] == 'SILENT' and r['ascension'] == '10' and r['finished'] == '1'}
    paper_audit = dict(paper_finished_silent_a10=len(paper), shared_finished_runs=len(eligible & paper.keys()),
                       logdb_finished_missing_in_paper=len(eligible-paper.keys()),
                       paper_finished_outside_frozen_logdb=len(paper.keys()-eligible),
                       shared_victory_disagreements=sum(bool(r['victory']) != (paper[r['run_id']]['victory'] == '1')
                           for r in runs if r['run_id'] in paper))
    fights = records("SELECT f.run_id,f.fight_no,f.act,f.floor,f.encounter,f.room,f.entry_hp,f.max_hp,f.turns,f.outcome,f.net_hp_loss,f.deck_size,f.first_ts,s.turn AS first_turn FROM fights f JOIN frames s ON s.off=f.first_off WHERE f.character='SILENT' AND f.ascension=10 ORDER BY f.first_off")
    attempts = records('SELECT run_id,floor,encounter,attempt,result,turns,ts,off FROM sl_attempts')
    sl_by = C.defaultdict(list)
    for row in attempts:
        if row['run_id'] in eligible:
            sl_by[row['run_id'], row['floor'], row['encounter']].append(row)
    groups = C.defaultdict(list)
    for row in fights:
        if row['run_id'] in eligible:
            groups[row['run_id'], row['act'], row['floor'], row['encounter']].append(row)
    units = {r['run_id']: n for n, r in enumerate(runs)}
    result, audit = [], C.Counter()
    times = []
    for (run, act, floor, monster), segments in groups.items():
        sl = sl_by.get((run, floor, monster), [])
        values = outcomes(segments, sl)
        times.extend(str(s['first_ts']) for s in segments)
        result.append(dict(run=units[run], unit=units[run], act=act, monsters=monster,
                           room=segments[0]['room'], **values))
        audit['observed_segments'] += len(segments)
        audit['sl_events'] += bool(sl)
        audit['multiple_segments'] += len(segments) > 1
        audit['predicted_first_failures'] += values['predicted_first']
        audit['unknown_final'] += values['death'] is None
        audit['unknown_first_failure'] += values['first_failure'] is None
        audit['entry_not_observed_at_turn_one'] += segments[0]['first_turn'] != 1
        audit['terminal_sl_turns_observed'] += bool(sl) and values['turns'] is not None
    audit['sl_records_unmatched_exact_fight'] = sum(len(rs) for (run, floor, monster), rs in sl_by.items()
        if not any(key[0] == run and key[2] == floor and key[3] == monster for key in groups))
    audit.update(finished_runs=len(runs), runs_with_fights=len({r['run'] for r in result}), encounters=len(result), **paper_audit)
    version_rows = []
    for code in sorted({str(r['code']) for r in runs}):
        rs = [r for r in runs if str(r['code']) == code]
        version_rows.append(dict(code=code, runs=len(rs), wins=sum(bool(r['victory']) for r in rs),
                                 first_end=min(str(r['ended']) for r in rs), last_end=max(str(r['ended']) for r in rs),
                                 game_patch='unknown'))
    audit['first_combat_ts'] = min(times)
    audit['last_combat_ts'] = max(times)
    con.close()
    return result, dict(audit), version_rows, manifest


def distribution(rows, key):
    known = [r for r in rows if number(r.get(key)) or isinstance(r.get(key), bool)]
    values = [r[key] for r in known]
    result = {key+'_n': len(values), key+'_unknown': len(rows)-len(values),
            key+'_independent_runs': len({r['run'] for r in known if 'run' in r}),
            key+'_independent_units': len({r['unit'] for r in known if 'unit' in r}),
            key+'_mean': statistics.mean(values) if values else None,
            key+'_p25': quantile(values, .25), key+'_median': quantile(values, .5),
            key+'_p75': quantile(values, .75), key+'_p90': quantile(values, .9)}
    if key in ('death', 'first_failure'):
        result[key+'_events'] = sum(values)
    return result


def cluster_ci(rows, key, reps=1000):
    units = C.defaultdict(lambda: [0, 0])
    for r in rows:
        v = r.get(key)
        if number(v) or isinstance(v, bool):
            units[r['unit']][0] += v
            units[r['unit']][1] += 1
    keys = sorted(units)
    if len(keys) < 2:
        return [None, None]
    rng = random.Random(240030)
    values = []
    for _ in range(reps):
        draw = C.Counter(rng.choices(keys, k=len(keys)))
        values.append(sum(draw[k]*units[k][0] for k in draw)/sum(draw[k]*units[k][1] for k in draw))
    return [quantile(values, .025), quantile(values, .975)]


def aggregate(rows, source, scope, act, kind, eid):
    row = dict(source=source, scope=scope, act=act, kind=kind, encounter_id=eid,
               fights=len(rows), independent_runs=len({r['run'] for r in rows}),
               independent_players=len({r['unit'] for r in rows}) if source == 'external' else None,
               version='v0.111' if source == 'external' else 'mixed-code/game-patch-unknown',
               sl_policy='unknown; uploaded attempt only' if source == 'external'
                         else 'final recorded attempt; predicted first failure separate')
    keys = ('turns', 'death', 'gross_damage', 'point_net') if source == 'external' else ('turns', 'death', 'first_failure', 'net_hp', 'entry_hp', 'deck_size')
    for key in keys:
        row.update(distribution(rows, key))
        if key in ('turns', 'death', 'first_failure'):
            row[key+'_cluster_ci'] = cluster_ci(rows, key)
    if source == 'own':
        row['sl_events'] = sum(r['sl'] for r in rows)
        row['predicted_first_failures'] = sum(r['predicted_first'] for r in rows)
    return row


def summarize(human, ours, mapping):
    mapping_rows, match_audit = [], C.Counter()
    for r in ours:
        eid, kind, n = resolve_mapping(mapping, r['act'], r['monsters'], r['room'])
        r.update(eid=eid, kind=kind)
        match_audit['unique_empirical_mapping' if eid else 'ambiguous_mapping' if n > 1 else 'unmapped'] += 1
    own_groups = C.defaultdict(list)
    for r in ours:
        own_groups[r['act'], r['kind'], r['monsters'], r['room']].append(r)
    for (act, kind, monsters, room), rs in sorted(own_groups.items(), key=lambda x: str(x[0])):
        ids = sorted(mapping.get((act, kind, monsters), set()))
        mapping_rows.append(dict(act=act, kind=kind, own_room=room, monster_composition=monsters,
                                 external_candidates=ids, candidate_count=len(ids), own_fights=len(rs),
                                 mapping_status='unique_empirical' if len(ids) == 1 else 'ambiguous' if ids else 'unmapped',
                                 native_encounter_id_observed=False))
    rows, comparison = [], []
    grouped = {name: C.defaultdict(list) for name in ('external', 'own')}
    for source, fs in [('external', human), ('own', ours)]:
        for r in fs:
            if r['eid']:
                grouped[source][r['act'], r['kind'], r['eid']].append(r)
        for (act, kind, eid), rs in sorted(grouped[source].items()):
            rows.append(aggregate(rs, source, 'encounter', act, kind, eid))
    common = set(grouped['external']) & set(grouped['own'])
    for act, kind, eid in sorted(common):
        hs, os = grouped['external'][act, kind, eid], grouped['own'][act, kind, eid]
        row = dict(act=act, kind=kind, encounter_id=eid, mapping='unique_empirical_not_native',
                   external_fights=len(hs), external_runs=len({r['run'] for r in hs}),
                   external_players=len({r['unit'] for r in hs}), own_fights=len(os), own_runs=len({r['run'] for r in os}),
                   own_sl_events=sum(r['sl'] for r in os), damage_difference=None,
                   external_version='v0.111', own_version='mixed-code/game-patch-unknown',
                   external_sl_policy='unknown; uploaded attempt only',
                   own_sl_policy='final recorded attempt; predicted first failure separate',
                   damage_comparability='unknown: external total damage / own endpoint net HP; no common gross counter')
        for key in ('turns', 'death'):
            h, o = distribution(hs, key), distribution(os, key)
            row.update({'external_'+k: v for k, v in h.items()})
            row.update({'own_'+k: v for k, v in o.items()})
            # A descriptive difference, not a causal estimate or matched-state effect.
            row[key+'_difference'] = o[key+'_mean']-h[key+'_mean'] if h[key+'_n'] and o[key+'_n'] else None
            row['external_'+key+'_cluster_ci'] = cluster_ci(hs, key)
            row['own_'+key+'_cluster_ci'] = cluster_ci(os, key)
        comparison.append(row)
    for source, fs in [('external', human), ('own', ours)]:
        for act in (1, 2, 3):
            for kind in ('monster', 'elite', 'boss'):
                rs = [r for r in fs if r['act'] == act and r['kind'] == kind and r['eid'] and (act, kind, r['eid']) in common]
                if rs:
                    rows.append(aggregate(rs, source, 'matched_pool_different_encounter_mix', act, kind, 'ALL_MATCHED'))
    strata = []
    for key in sorted(common):
        for hp_band in ('0-.5', '.5-1', 'unknown'):
            for deck_band in ('<=15', '16-25', '>25', 'unknown'):
                rs = []
                for r in grouped['own'][key]:
                    hp = 'unknown' if not number(r['entry_hp']) or not number(r['max_hp']) or r['max_hp'] <= 0 else ('0-.5' if r['entry_hp']/r['max_hp'] <= .5 else '.5-1')
                    deck = 'unknown' if not number(r['deck_size']) else '<=15' if r['deck_size'] <= 15 else '16-25' if r['deck_size'] <= 25 else '>25'
                    if hp == hp_band and deck == deck_band:
                        rs.append(r)
                if rs:
                    strata.append(dict(act=key[0], kind=key[1], encounter_id=key[2], entry_hp_fraction=hp_band,
                                       entry_deck_size=deck_band, fights=len(rs), runs=len({r['run'] for r in rs}),
                                       **distribution(rs, 'death'), **distribution(rs, 'turns'), **distribution(rs, 'net_hp'),
                                       external_same_stratum=None, reason='External pre-combat HP/deck size not observed'))
    return rows, comparison, strata, mapping_rows, dict(match_audit)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db', type=Path, required=True)
    p.add_argument('--snapshot', type=Path, required=True)
    p.add_argument('--freeze-from', type=Path, help='Pin a NEW snapshot from this existing logdb, without syncing it')
    p.add_argument('--views', type=Path, default=Path('agent/tools/logdb/views.sql'))
    p.add_argument('--original-provenance', type=Path, default=Path('paper/materials/2026-10-21-sts2fun-stats/provenance.json'))
    p.add_argument('--paper-runs', type=Path, default=Path('paper/data/runs.csv'))
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    a.output.mkdir(parents=True, exist_ok=True)
    original = json.loads(a.original_provenance.read_text())
    if a.freeze_from:
        freeze_logdb(a.freeze_from, a.snapshot)
    # Hash the 13 GB source once when acquiring it; do not re-read it on every
    # analysis. Its identity is inherited explicitly, not falsely re-verified.
    if a.db.stat().st_size != original['database_bytes']:
        raise ValueError('External database size differs from acquisition receipt')
    humans, mapping, ha, builds = external(a.db)
    print('external', ha, flush=True)
    ours, oa, versions, snapshot_manifest = own(a.snapshot, a.views, a.paper_runs)
    print('own', oa, flush=True)
    rows, comparisons, strata, mappings, ma = summarize(humans, ours, mapping)
    for name, rs in [('combat_distribution', rows), ('same_encounter_comparison', comparisons),
                     ('own_entry_strata', strata), ('encounter_mapping', mappings), ('own_versions', versions)]:
        columns = list(dict.fromkeys(k for r in rs for k in r))
        write_csv(a.output/(name+'.csv'), [{k: r.get(k) for k in columns} for r in rs])
    write_json(a.output/'summary.json', dict(external=ha, external_builds=builds, own=oa, mapping=ma,
               shared_encounter_groups=len(comparisons), external_matched_fights=sum(r['external_fights'] for r in comparisons),
               own_matched_fights=sum(r['own_fights'] for r in comparisons),
               bootstrap=dict(reps=1000, seed=240030, external_unit='player', own_unit='run', estimand='fight-weighted mean/rate'),
               strict_native_id_comparisons=0, interpretation='Empirical unique roster mapping; native own encounter ID absent. No causal diagnosis.'))
    write_json(a.output/'provenance.json', dict(source='external:sts2fun + own:frozen-logdb (separate denominators)',
               generated_at=datetime.datetime.now().astimezone().isoformat(), external_filter=FILTER,
               own_filter='completed runs_raw: character=SILENT, ascension=10; frozen window only',
               external_database_bytes=a.db.stat().st_size, external_database_sha256=original['database_sha256'],
               external_sha_basis='Inherited acquisition SHA; size checked; no new full hash',
               original_provenance_sha256=sha(a.original_provenance), source_url=original['url'], license=original['license'],
               downloaded_at=original['downloaded_at'], compressed_sha256=original['compressed_sha256'],
               script_sha256=sha(__file__), shared_stats_script_sha256=sha(Path(__file__).with_name('sts2fun_stats.py')),
               views_sha256=sha(a.views), extractor_source_sha256=sha(a.views.with_name('extract.py')),
               paper_runs_sha256=sha(a.paper_runs), own_snapshot=snapshot_manifest,
               privacy='No players-table reads; integer player IDs only in memory; no player/run records serialized'))
    write_json(a.output/'manifest.json', {p.name: sha(p) for p in sorted(a.output.iterdir())
               if p.suffix in ('.csv', '.json') and p.name != 'manifest.json'})
    print('finished', ma, 'matched groups', len(comparisons), flush=True)


if __name__ == '__main__':
    main()
