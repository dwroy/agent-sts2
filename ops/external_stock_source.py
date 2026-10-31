"""Normalize already cached #54 allowlisted projections; never opens the raw DB."""
from collections import Counter
import gzip
import json
import math
from pathlib import Path
import re

from strategy_backfill_jobs import artifact
from strategy_research_jobs import digest

SCHEMA = "external-stock-v1"
TASK = "whole-run"
SOURCE = "external:sts2fun"
VERSIONS = {"v0." + str(n) for n in range(107, 112)}
COLUMNS = ['node', 'act', 'node_in_act', 'rooms_kind_id_turns', 'hp_end', 'max_hp_end', 'damage', 'healed',
           'gold_spent', 'card_choices_id_picked', 'gained', 'removed', 'transformed', 'upgraded',
           'relic_picks', 'bought_relics', 'removed_relics', 'partial_projection']
MAX_SOURCE_BYTES = 128 * 1024 * 1024


def canonical(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n').encode()


def fingerprint(value):
    return digest(canonical(value))


def record_key(row):
    # Content identity is independent of export paths, dataset re-downloads and plan names.
    return fingerprint([SOURCE, 'silent', 10, row['version'], row['content_sha256'], row['window'], TASK])


def validate_record(row):
    if (set(row) != {'content_sha256', 'version', 'build', 'win', 'cluster', 'window', 'timeline', 'terminal_deck', 'terminal_relics'}
            or not re.fullmatch('[a-f0-9]{64}', str(row['content_sha256'])) or row['version'] not in VERSIONS
            or row['build'] is not None and (not isinstance(row['build'], str) or not re.fullmatch(re.escape(row['version']) + r'[.]\d+', row['build']))
            or type(row['win']) is not int or row['win'] not in (0, 1)
            or row['cluster'] is not None and (type(row['cluster']) is not int or not 0 <= row['cluster'] <= 100)
            or not isinstance(row['timeline'], list) or not row['timeline'] or len(row['timeline']) > 200
            or row['window'] != [1, len(row['timeline'])]
            or any(not isinstance(p, list) or len(p) != len(COLUMNS) or p[0] != i + 1
                   or type(p[1]) is not int or not 1 <= p[1] <= 4 for i, p in enumerate(row['timeline']))):
        raise ValueError('invalid complete anonymous trajectory')
    # Allow only data fields from the established projection, including model IDs.
    def model_id(value):
        if not isinstance(value, str) or not re.fullmatch(r'[A-Z][A-Z0-9_.]*', value):
            raise ValueError('invalid projected model ID')
    def numeric(value):
        if value is not None and (type(value) not in (int, float) or not math.isfinite(value)):
            raise ValueError('invalid projected number')
    if not isinstance(row['terminal_deck'], dict) or not isinstance(row['terminal_relics'], list):
        raise ValueError('invalid terminal projection')
    for ident, n in row['terminal_deck'].items():
        model_id(ident)
        if type(n) is not int or not 1 <= n <= 1000:
            raise ValueError('invalid projected card count')
    for ident in row['terminal_relics']:
        model_id(ident)
    for point in row['timeline']:
        if type(point[2]) is not int or point[2] < 1 or type(point[17]) is not bool:
            raise ValueError('invalid node coordinates')
        for value in point[4:9]:
            numeric(value)
        for room in point[3]:
            if not isinstance(room, list) or len(room) != 3 or room[0] not in ('event', 'monster', 'elite', 'boss', 'shop', 'treasure', 'rest_site', 'ancient', 'unknown'):
                raise ValueError('invalid projected room')
            if room[1] is not None:
                model_id(room[1])
            numeric(room[2])
        for choice in point[9]:
            if not isinstance(choice, list) or len(choice) != 2 or type(choice[1]) is not bool:
                raise ValueError('invalid projected choice')
            model_id(choice[0])
        for index in (10, 11, 13, 14, 15, 16):
            for ident in point[index]:
                model_id(ident)
        for transform in point[12]:
            if not isinstance(transform, dict) or set(transform) != {'old', 'new'}:
                raise ValueError('invalid projected transform')
            for ident in transform.values():
                if ident is not None:
                    model_id(ident)
    return row


def representatives(data):
    for group in data['clusters']:
        for pair in group['pairs']:
            for example in pair['examples']:
                yield validate_record(dict(content_sha256=example['safe_projection_sha256'], version=example['version'],
                    build=example.get('build'), win=example['win'], cluster=group['cluster'], window=[1, len(example['timeline'])],
                    timeline=example['timeline'], terminal_deck=example['terminal_deck'], terminal_relics=example['terminal_relics']))


def cached_records(root, receipt_ref, cache_ref, package):
    """Consume only the exact, pre-existing sanitized cache; no SQLite fallback."""
    if Path(cache_ref['path']).name != 'runs.json.gz' or Path(receipt_ref['path']).name != 'receipt.json':
        raise ValueError('only the existing safe-cache pair is accepted; raw databases are not inputs')
    if Path(root, cache_ref['path']).stat().st_size > MAX_SOURCE_BYTES:
        raise ValueError('safe cache exceeds byte bound before read')
    receipt = json.loads(artifact(root, receipt_ref))
    compressed = artifact(root, cache_ref)
    if (len(compressed) > MAX_SOURCE_BYTES or receipt['cache_sha256'] != digest(compressed)
            or receipt['input']['database']['sha256'] != package['provenance']['database_sha256']
            or receipt['input']['query_sha256'] != package['query_sha256']
            or receipt['input']['projection_code_sha256'] != package['projection_code_sha256']):
        raise ValueError('safe cache differs from frozen #54 source')
    import io
    with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:
        raw = stream.read(MAX_SOURCE_BYTES + 1)
    if len(raw) > MAX_SOURCE_BYTES:
        raise ValueError('safe projection exceeds import byte bound')
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) > 50000:
        raise ValueError('safe projection exceeds import record bound')
    model = package['model']
    expected = Counter(); observed_builds = Counter()
    seen = set()
    for value in rows:
        expected[value['version']] += 1
        observed_builds[value['version'], str(value['build'])] += 1
        if set(value) != {'version', 'build', 'win', 'deck', 'relics', 'nodes', 'content_sha256'}:
            raise ValueError('cache is not the original safe projection')
        if any(set(item) != {'id', 'added'} for item in value['deck'] + value['relics']):
            raise ValueError('cache contains non-projected card/relic fields')
        for point in value['nodes']:
            if (set(point) - {'node', 'act', 'point', 'hp', 'max_hp', 'damage', 'healed', 'gold_spent', 'rooms',
                    'choices', 'gained', 'removed', 'upgraded', 'transformed', 'relic_picks', 'bought_relics', 'removed_relics', 'partial'}
                    or any(set(r) != {'kind', 'id', 'turns'} for r in point['rooms'])
                    or any(set(c) != {'id', 'picked'} for c in point['choices'])):
                raise ValueError('cache contains non-projected node fields')
        if fingerprint({k: v for k, v in value.items() if k != 'content_sha256'}) != value['content_sha256']:
            raise ValueError('projection content hash differs')
        if value['content_sha256'] in seen:
            continue
        seen.add(value['content_sha256'])
        cards = dict(Counter(c['id'] for c in value['deck']))
        vector = {c: w for c, w in model['vocabulary'].items() if c in cards}
        norm = math.sqrt(sum(w * w for w in vector.values()))
        cluster = max(range(len(model['centers'])), key=lambda i: (sum(w / norm * model['centers'][i].get(c, 0)
                      for c, w in sorted(vector.items())), -i)) if norm else None
        timeline = [[p['node'], p['act'], p['point'], [[r['kind'], r['id'], r['turns']] for r in p['rooms']],
                     p['hp'], p['max_hp'], p['damage'], p['healed'], p['gold_spent'],
                     [[c['id'], c['picked']] for c in p['choices']], p['gained'], p['removed'], p['transformed'],
                     p['upgraded'], p['relic_picks'], p['bought_relics'], p['removed_relics'], p.get('partial', False)]
                    for p in value['nodes']]
        # Empty projections cannot count as complete trajectories.
        if timeline:
            yield validate_record(dict(content_sha256=value['content_sha256'], version=value['version'],
                  build=value['build'] if isinstance(value['build'], str) and re.fullmatch(re.escape(value['version']) + r'[.]\d+', value['build']) else None, win=value['win'],
                  cluster=cluster, window=[1, len(timeline)], timeline=timeline, terminal_deck=cards,
                  terminal_relics=[r['id'] for r in value['relics']]))
    if dict(expected) != {v: c['n'] for v, c in package['cohorts'].items()}:
        raise ValueError('safe cache cohort denominators differ')
    for version, cohort in package['cohorts'].items():
        if cohort.get('builds') and {b: n for (v, b), n in observed_builds.items() if v == version} != cohort['builds']:
            raise ValueError('safe cache build denominators differ')


def immutable(root, relative, raw):
    path = (Path(root) / relative)
    if not path.resolve().is_relative_to(Path(root).resolve()) or path.is_symlink():
        raise ValueError('stock artifact outside project')
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if path.read_bytes() != raw:
            raise ValueError('immutable stock artifact differs')
    else:
        import os
        with path.open('xb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
    return {'path': relative, 'sha256': digest(raw), 'bytes': len(raw)}


def import_catalog(root, package_ref, contracts, destination, *, receipt_ref=None, cache_ref=None, own_index_ref=None):
    """One data registration, then the original tick maintains all successor plans."""
    package_manifest = json.loads(artifact(root, package_ref))
    base = Path(package_ref['path']).parent
    refs = {name: dict(path=str(base / name), **ref) for name, ref in package_manifest['files'].items()}
    package = json.loads(artifact(root, refs['archetypes.json']))
    examples = json.loads(artifact(root, refs['representative-timelines.json']))
    if (package.get('source') != SOURCE or package.get('character') != 'silent' or package.get('ascension') != 10
            or package.get('player_identifiers_read') is not False or package.get('design') != 'observational'
            or examples.get('provenance') != package.get('provenance') or examples.get('columns') != COLUMNS):
        raise ValueError('stock requires original anonymous Silent A10 #54 package')
    frozen_contracts = []
    for ref in contracts:
        raw = artifact(root, ref)
        frozen_contracts.append(immutable(root, str(Path(destination) / 'contracts' / (digest(raw) + Path(ref['path']).suffix)), raw))
    if not contracts:
        raise ValueError('stock requires publication contracts')
    excluded = {record_key(r) for r in representatives(examples)}
    records = list(cached_records(root, receipt_ref, cache_ref, package)) if receipt_ref and cache_ref else list(representatives(examples))
    indexed = {}
    for row in records:
        key = record_key(row)
        if key in indexed:
            continue
        ref = immutable(root, str(Path(destination) / 'records' / (key + '.json')), canonical(row))
        indexed[key] = dict(key=key, artifact=ref, version=row['version'], build=row['build'], cluster=row['cluster'], win=row['win'],
                            last_act=row['timeline'][-1][1], nodes=len(row['timeline']), content_sha256=row['content_sha256'],
                            legacy_reserved=key in excluded)
    failure_gap = None
    if own_index_ref:
        own = json.loads(artifact(root, own_index_ref))
        if (own.get('source') != 'self:agent-sts2' or own.get('character') != 'silent'
                or own.get('external_pin', {}).get('manifest_sha256') != package_ref['sha256']
                or own.get('external_pin', {}).get('model_sha256') != package['model']['sha256']):
            raise ValueError('own failure summary is not aligned to this observed cluster model')
        failures = Counter(r['cluster'] for r in own['rows'] if r.get('ascension') == 10 and r.get('victory') is False
                           and type(r.get('cluster')) is int)
        summary = dict(source='self:agent-sts2', evidence=own_index_ref, game_version=own.get('game_version', 'unknown'),
            attempt_scope='inherited own index; retries/first attempts are not combined into win-rate estimates',
            external_denominator_contribution=0, observed_failures_by_cluster=dict(failures),
            limitations='Only prioritizes unallocated windows. Own game version may be unknown; not a same-version effect estimate.')
        failure_gap = immutable(root, str(Path(destination) / 'own-failure-summary.json'), canonical(summary))
    catalog = dict(schema=SCHEMA, source=SOURCE, character='silent', ascension=10, task_type=TASK,
        package_manifest=package_ref, projection_inputs=[r for r in (receipt_ref, cache_ref) if r],
        provenance={**package['provenance'], 'query_version': 'issue71-existing-safe-projection-v1'},
        columns=COLUMNS, failure_gap=failure_gap, limitations=package['limitations'], contracts=frozen_contracts, cohorts=package['cohorts'],
        records=sorted(indexed.values(), key=lambda r: r['key']),
        legacy_policy='All original #54 representative windows reserved; never inferred read from processed. Other legacy A scopes require explicit seed.')
    return immutable(root, str(Path(destination) / 'catalog.json'), canonical(catalog))
