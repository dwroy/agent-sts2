"""Allowlist-only replay and full-run projection; no gameplay interpretation."""
import collections
import gzip
import hashlib
import hmac
import json
import os
from pathlib import Path
import re

try:
    from .spire_codex_download import load, save, sha, stamp, locked
except ImportError:
    from spire_codex_download import load, save, sha, stamp, locked

VERSION = 'spire-codex-projection-v1'
DENIED = re.compile(r'player|username|steam|discord|account|email|token|seed|run_hash|harmony|platform|wall_clock|start_time', re.I)
COMMON = 's ms floor act'.split()
FIELDS = {
    'header': 'replay_version run_schema_version build_id character ascension starting_max_hp game_mode player_count reloads starting_deck starting_relics relics potions',
    'end': 'terminal_reason run_time floors is_game_over hp max_hp final_deck final_relics capture_status',
    'combat_start': 'combat_id attempt_id encounter enemies allies',
    'combat_end': 'combat_id attempt_id result turns rounds hp_lost_total',
    'resume': 'reloads combat_id hp gold deck_size relics potions',
    'remap': 'cards exact ambiguous',
    'turn': 'combat_id attempt_id n round side energy hand enemies',
    'end_turn': 'n round side',
    'play': 'c id up target auto play_index play_count turn deck_c target_cid cost_paid cost_value stars_paid stars_value result_pile',
    'draw': 'c id turn_start deck_c', 'discard': 'c id deck_c',
    'exhaust': 'c id ethereal deck_c', 'generate': 'c id',
    'draw_order': 'order_c order_deck_c', 'shuffle': 'n_draw order_c',
    'flush': 'flushed_c retained_c',
    'intent': 'src src_cid id at intents dmg hits', 'move': 'src src_cid id intents',
    'energy': 'src n d energy max carry',
    'hit': 'src dst dmg blocked killed card dst_cid dmg_type atk',
    'block': 'src n left reason card',
    'power': 'src id n amount tgt tgt_cid',
    'power_lost': 'id n amount tgt tgt_cid dead',
    'power_negated': 'src id n_intended card tgt tgt_cid',
    'hp': 'dst d hp src', 'max_hp': 'dst dst_cid d max_hp hp',
    'death': 'tgt tgt_cid removal_prevented killed_by',
    'spawn': 'cid id slot hp max_hp side', 'attack': 'atk src src_cid hits',
    'decision': 'decision_id decision_type source event_id page_index page_key n_presented n_selectable options',
    'outcome': 'decision_id decision_type outcome option_index option_id',
    'pick': 'decision_id decision_type n_picked selector cards',
    'resolve': 'decision_id reward_kind gold',
    'acquire': 'decision_id source c id option_index',
    'transform': 'decision_id option_index from_c from_id to_c to_id',
    'rest': 'option decision_id option_index',
    'event_proceed': 'event_id page_index',
    'potion_start': 'id target', 'potion_used': 'id target', 'potion_got': 'id',
    'potion_discarded': 'id slot',
    'deck': 'cards', 'relic': 'decision_id id', 'relic_counter': 'id n',
    'upgrade': 'c id', 'downgrade': 'c id from_up up',
    'afflict': 'c deck_c id affliction amount amount_total',
    'unafflict': 'c deck_c id affliction amount',
    'enchant': 'c id enchantment amount amount_total pile',
    'act': 'name', 'map': 'gen boss ancient ancient_coord boss_coord nodes',
    'room': 'kind room_type depth point_type coord id', 'room_exit': 'kind depth',
    'map_room': '', 'gold': 'gold',
    'shop': 'gold removal_cost removal_stocked cards relics potions',
    'buy': 'kind slot id cost_current cost_resource gold_on_hand',
}
# Nested objects have their own finite schema; unknown nested keys never pass through.
NESTED = {
    'cards': 'c id up added_floor option_index slot cost stocked sale pool enchantment amount from to',
    'starting_deck': 'c id up added_floor enchantment amount',
    'final_deck': 'c id up added_floor enchantment amount',
    'hand': 'c id up cost',
    'enemies': 'i cid id hp max_hp block intents dmg hits powers',
    'allies': 'i cid id hp max_hp block powers',
    'powers': 'id amount',
    'relics': 'id slot cost stocked sale', 'potions': 'id slot cost stocked sale',
    'options': 'option_index option_kind option_id label desc grants_relic grants_card presented selectable c id up cost cards relics potions',
    'nodes': 'coord kind children',
}


def pseudonym(salt, kind, value):
    return kind + '_' + hmac.new(salt, (kind + ':' + str(value)).encode(), hashlib.sha256).hexdigest()


def salt_for(root):
    path = Path(root) / 'private-salt'
    if not path.exists():
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write(os.urandom(32))
            f.flush()
            os.fsync(f.fileno())
    salt = path.read_bytes()
    if len(salt) != 32:
        raise ValueError('invalid projection salt; preserve original identity')
    return salt


def safe_value(key, value):
    if isinstance(value, dict):
        keys = NESTED.get(key, '').split()
        return {k: safe_value(k, value[k]) for k in keys if k in value}
    if isinstance(value, list):
        return [safe_value(key, x) for x in value]
    if value is None or isinstance(value, (str, bool, int, float)):
        return value
    raise ValueError('invalid JSON value')


def event_projection(event):
    t = event.get('t')
    if t not in FIELDS:
        return None
    return dict(t=t, **{k: safe_value(k, event[k]) for k in COMMON + FIELDS[t].split() if k in event})


def forbidden_values(value, found=None):
    found = set() if found is None else found
    if isinstance(value, dict):
        for k, v in value.items():
            if DENIED.search(k) and isinstance(v, str) and v:
                found.add(v)
            forbidden_values(v, found)
    elif isinstance(value, list):
        for v in value:
            forbidden_values(v, found)
    return found


def redact(value, secrets):
    if isinstance(value, str):
        for secret in secrets:
            if value == secret:
                return '[REDACTED]'
            if len(secret) >= 4:
                value = value.replace(secret, '[REDACTED]')
        return value
    if isinstance(value, list):
        return [redact(x, secrets) for x in value]
    if isinstance(value, dict):
        return {k: redact(v, secrets) for k, v in value.items()}
    return value


def json_lines(path):
    with Path(path).open('rb') as raw:
        compressed = raw.read(2) == b'\x1f\x8b'
    opener = gzip.open if compressed else open
    with opener(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def replay_bundle(events, meta, salt, source_sha):
    events = list(events)
    headers = [x for x in events if x.get('t') == 'header']
    if not headers:
        raise ValueError('missing replay header')
    header = headers[0]
    if header.get('character') != 'SILENT' or header.get('ascension') != 10 or header.get('player_count', 1) != 1:
        raise ValueError('replay is outside solo SILENT A10 cohort')
    if header.get('build_id') != meta['build_id']:
        raise ValueError('replay/index build mismatch')
    rid = pseudonym(salt, 'run', meta['run_hash'])
    secrets = forbidden_values(events) | forbidden_values(meta)
    seed = header.get('seed')
    rows, fights = [], []
    active, turn, segment = None, None, 0
    unknown = collections.Counter()
    boundary_pending = False
    prefix_missing = header.get('s') != 0 or header.get('floor', 0) > 0
    observed = {}
    resumed = set()
    after_reload = bool(header.get('reloads', 0))
    for line, raw in enumerate(events, 1):
        e = event_projection(raw)
        if e is None:
            unknown['unsupported_events'] += 1
            continue
        t = e['t']
        if t == 'resume':
            after_reload = True
            if e.get('combat_id'):
                resumed.add(e['combat_id'])
        if t in ('resume', 'remap', 'header') and (line > 1 or t != 'header'):
            segment += 1
            if active is not None:
                active['boundary_seen'] = True
                if t in ('resume', 'header'):
                    active['closed_by_boundary'] = True
                    active = None
                    turn = None
            boundary_pending = True
        if t == 'combat_start':
            if active is not None:
                active['missing_end'] = True
            aid = e.get('attempt_id')
            cid = e.get('combat_id')
            identity = (cid, e.get('floor'), e.get('act'))
            prior = observed.get(identity)
            valid_aid = type(aid) is int and aid >= 0
            if not cid or not valid_aid:
                kind = 'unknown'
            elif prior is not None:
                kind = 'retry' if aid != prior['attempt_id'] or cid in resumed else 'unknown'
            elif prefix_missing or cid in resumed:
                kind = 'unknown'
            else:
                kind = 'first'
            active = dict(run_id=rid, combat_key=f'{rid}:{line}', combat_id=e.get('combat_id'),
                          attempt_id=aid, attempt_kind=kind, encounter=e.get('encounter'),
                          observed_attempt_ordinal=(prior['observed_attempt_ordinal'] + 1) if prior else 1,
                          after_run_reload=after_reload,
                          floor=e.get('floor'), act=e.get('act'), segment=segment,
                          start_line=line, end_line=None, result=None, turns=None, hp_lost=None,
                          boundary_before=boundary_pending, boundary_seen=False, missing_end=False)
            fights.append(active)
            observed[identity] = active
            resumed.discard(cid)
            boundary_pending = False
            turn = None
        if t == 'turn' and e.get('side') == 'player':
            turn = e.get('n')
        if t == 'play' and e.get('turn') is not None:
            turn = e['turn']
        row = dict(run_id=rid, line=line, segment=segment,
                   combat_key=active['combat_key'] if active else None, turn=turn, event=e)
        rows.append(row)
        if t == 'combat_end' and active is not None:
            if e.get('combat_id') != active['combat_id'] or e.get('attempt_id') != active['attempt_id']:
                active['identity_mismatch'] = True
            else:
                active.update(end_line=line, result=e.get('result'), turns=e.get('turns'), hp_lost=e.get('hp_lost_total'))
            active = None
            turn = None
    for fight in fights:
        fight['missing_end'] = fight['end_line'] is None
        # Interrupted first attempts remain in the denominator with unknown results.
        fight['default_eligible'] = fight['attempt_kind'] == 'first' and not fight.get('identity_mismatch', False)
    end = next((x for x in reversed(rows) if x['event']['t'] == 'end'), None)
    end = end['event'] if end else {}
    run = dict(run_id=rid, seed_id=pseudonym(salt, 'seed', seed) if seed else None,
               source='external:spire-codex', source_sha256=source_sha, projection_version=VERSION,
               build_id=meta['build_id'], character='SILENT', ascension=10, win=bool(meta['win']),
               was_abandoned=meta.get('was_abandoned'), capture_status=end.get('capture_status'),
               terminal_reason=end.get('terminal_reason'),
               prefix_missing=prefix_missing,
               final_deck=end.get('final_deck'), final_relics=end.get('final_relics'),
               unknown_event_counts=dict(unknown))
    # Even allowlisted game text cannot echo identifiers from raw player fields.
    return redact(dict(schema=VERSION, run=run, combats=fights, events=rows), secrets)


def export_run(raw, salt, source_sha):
    players = raw.get('players', [])
    if len(players) != 1 or raw.get('ascension') != 10:
        return None
    p = players[0]
    if p.get('character') not in ('SILENT', 'CHARACTER.SILENT'):
        return None
    key = raw.get('run_hash')
    if not key:
        raise ValueError('export has no deduplication identity')
    # Full game JSON and replay schemas deliberately use different allowlists.
    card_fields = ('id', 'current_upgrade_level', 'floor_added_to_deck', 'enchantment', 'enchantment_amount')
    deck = [{k: safe_value(k, c[k]) for k in card_fields if k in c} for c in p.get('deck', [])]
    relics = [{'id': r['id']} for r in p.get('relics', []) if isinstance(r, dict) and 'id' in r]
    history = []
    stat_fields = 'current_gold current_hp damage_taken gold_gained gold_lost gold_spent gold_stolen hp_healed max_hp max_hp_gained max_hp_lost'.split()
    card_lists = 'cards_gained cards_removed cards_transformed cards_upgraded'.split()
    for act_no, points in enumerate(raw.get('map_point_history', []), 1):
        for point_no, point in enumerate(points, 1):
            stats = point.get('player_stats', [])
            if len(stats) != 1:
                raise ValueError('solo export contains ambiguous node stats')
            stat = stats[0]
            safe_stat = {k: stat[k] for k in stat_fields if k in stat}
            for name in card_lists:
                if name in stat:
                    safe_stat[name] = [{k: c[k] for k in card_fields if k in c} for c in stat[name]]
            safe_stat['card_choices'] = [dict(card={k: c.get('card', {}).get(k) for k in card_fields if k in c.get('card', {})},
                                                   was_picked=c.get('was_picked')) for c in stat.get('card_choices', [])]
            for name in ('potion_choices', 'relic_choices'):
                safe_stat[name] = [{k: c[k] for k in ('choice', 'was_picked') if k in c} for c in stat.get(name, [])]
            history.append(dict(act=act_no, node=point_no, map_point_type=point.get('map_point_type'),
                                rooms=[{k: r[k] for k in ('model_id', 'room_type', 'turns_taken') if k in r} for r in point.get('rooms', [])],
                                stats=safe_stat))
    result = dict(run_id=pseudonym(salt, 'run', key), source='external:spire-codex',
                  source_sha256=source_sha, projection_version=VERSION,
                  build_id=raw.get('build_id'), character='SILENT', ascension=10,
                  win=raw.get('win'), was_abandoned=raw.get('was_abandoned'), game_mode=raw.get('game_mode'),
                  history=history, final_deck=deck, final_relics=relics,
                  seed_id=pseudonym(salt, 'seed', raw['seed']) if raw.get('seed') else None)
    return redact(result, forbidden_values(raw))


def project(root):
    root = Path(root)
    with locked(root):
        salt = salt_for(root)
        index = load(root / 'private-index.json')
        if index is None:
            raise ValueError('download index is required')
        cache = root / 'cache'
        cache.mkdir(exist_ok=True)
        projected, included, exclusions = 0, 0, collections.Counter()
        for meta in index['runs'].values():
            path = root / meta['path']
            if sha(path) != meta['sha256']:
                raise ValueError('raw replay digest mismatch')
            rid = pseudonym(salt, 'run', meta['run_hash'])
            out = cache / 'replays' / f'{rid}.json'
            old = load(out)
            if old and old.get('schema') == VERSION and old['run']['source_sha256'] == meta['sha256']:
                included += 1
                continue
            events = list(json_lines(path))
            header = next((e for e in events if e.get('t') == 'header'), {})
            if header.get('player_count', 1) != 1:
                exclusions['multiplayer_not_projected'] += 1
                continue
            save(out, replay_bundle(events, meta, salt, meta['sha256']))
            projected += 1
            included += 1
        exports = {}
        for version, relative in index.get('exports', {}).items():
            path = root / relative
            receipt = load(Path(str(path) + '.receipt.json'))
            digest = sha(path)
            if not receipt or not receipt['manifest_verified'] or digest != receipt['sha256']:
                raise ValueError('export manifest verification is required')
            out = cache / 'exports' / f'{version}-{digest}.jsonl'
            out.parent.mkdir(exist_ok=True)
            n, seen = 0, set()
            if not out.exists():
                tmp = out.with_suffix('.tmp')
                with tmp.open('w') as f:
                    for raw in json_lines(path):
                        row = export_run(raw, salt, digest)
                        if row is not None and row['run_id'] not in seen:
                            if row['build_id'] != version:
                                raise ValueError('export build differs from manifest version')
                            seen.add(row['run_id'])
                            f.write(json.dumps(row, ensure_ascii=False) + '\n')
                            n += 1
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp, out)
            else:
                n = sum(1 for _ in json_lines(out))
            exports[version] = dict(path=str(out.relative_to(cache)), sha256=sha(out), runs=n)
        receipt = dict(schema=VERSION, created_at=stamp(), contains_player_identifiers=False,
                       new_replays=projected, replay_count=included, raw_replay_count=len(index['runs']),
                       exclusions=dict(exclusions), exports=exports,
                       salt_id=hashlib.sha256(salt).hexdigest())
        save(cache / 'projection.json', receipt)
        return receipt
