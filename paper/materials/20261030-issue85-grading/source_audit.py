"""Read original evidence without changing source trees, archives, logs, or runtime."""
import hashlib
import json
import re
import sys
import tarfile
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parent
CACHE = Path('.artifacts/issue85/source-cache').resolve()
SOURCES = {}
CONTENT = {}
ARCHIVES = {}
WINDOWS = {}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def rel(path):
    return str(Path(path).resolve().relative_to(ROOT))


def source(path):
    path = str(path)
    if path.startswith(str(ROOT) + '/'):
        path = path[len(str(ROOT)) + 1:]
    if path in CONTENT:
        return CONTENT[path], SOURCES[path]
    target = ROOT / path
    if not target.resolve().is_relative_to(ROOT):
        raise ValueError('source outside repository')
    if target.is_file():
        raw = target.read_bytes()
        meta = {'path': path, 'bytes': len(raw), 'sha256': sha(raw), 'storage': 'original'}
    else:
        batch = re.search(r'codex-strategy-silent-(\d{8}-\d{6})/', path)
        if not batch:
            return None, {'path': path, 'status': 'missing'}
        manifest_path = ROOT / 'ops/codex-ops/retention/archives' / (batch[1] + '-strategy-proposal.manifest.json')
        if not manifest_path.is_file():
            return None, {'path': path, 'status': 'missing_no_retention_manifest'}
        manifest = json.loads(manifest_path.read_text())
        file = next((f for f in manifest['files'] if f['path'] == path), None)
        if not file:
            return None, {'path': path, 'status': 'missing_not_in_manifest'}
        archive_path = ROOT / manifest['archive']
        if manifest['archive'] not in ARCHIVES:
            if sha(archive_path.read_bytes()) != manifest['archive_sha256']:
                raise ValueError('retention archive hash mismatch')
            ARCHIVES[manifest['archive']] = tarfile.open(archive_path, 'r:gz')
        archive = ARCHIVES[manifest['archive']]
        member = archive.getmember(path)
        if not member.isfile():
            raise ValueError('archive reference is not a regular file')
        raw = archive.extractfile(member).read()
        if sha(raw) != file['sha256'] or len(raw) != file['bytes']:
            raise ValueError('retention member mismatch')
        meta = {'path': path, 'bytes': len(raw), 'sha256': sha(raw), 'storage': 'verified_retention_member',
                'archive': manifest['archive'], 'archive_sha256': manifest['archive_sha256'],
                'manifest': rel(manifest_path), 'manifest_sha256': sha(manifest_path.read_bytes())}
    CONTENT[path] = raw
    SOURCES[path] = meta
    # Only declared evidence objects are cached. Original archives and trees remain untouched.
    cache_path = CACHE / (sha(path.encode()) + Path(path).suffix)
    cache_path.write_bytes(raw)
    meta['local_cache'] = str(cache_path.relative_to(Path.cwd()))
    return raw, meta


def window(path, offset, length, expected):
    path = path.removeprefix(str(ROOT) + '/')
    key = (path, int(offset), int(length), expected)
    if key in WINDOWS:
        return WINDOWS[key]
    result = {'path': path, 'offset': int(offset), 'length': int(length), 'expected_sha256': expected}
    target = ROOT / path
    if not target.resolve().is_relative_to(ROOT) or not target.is_file():
        result['status'] = 'missing_or_outside_repository'
    else:
        with target.open('rb') as stream:
            stream.seek(int(offset))
            raw = stream.read(int(length))
        result.update(sha256=sha(raw), status='verified' if len(raw) == int(length) and sha(raw) == expected else 'mismatch')
        if result['status'] == 'mismatch':
            raise ValueError(f'original window changed: {path}@{offset}')
    WINDOWS[key] = result
    return result


def nested_windows(value):
    found = []
    if isinstance(value, dict):
        p = value.get('path', value.get('source_path', value.get('source')))
        if not p and value.get('stream') in ('states', 'decisions', 'sl-attempts'):
            p = 'logs/' + value['stream'] + '.jsonl'
        offset = value.get('offset', value.get('off'))
        length = value.get('length', value.get('bytes', value.get('len')))
        if isinstance(p, str) and ('logs/' in p or p.endswith('.csv')) and offset is not None and length is not None and 'sha256' in value:
            found.append(window(p, offset, length, value['sha256']))
        if all(k in value for k in ('decision_off', 'decision_bytes', 'decision_sha256')):
            found.append(window('logs/decisions.jsonl', value['decision_off'], value['decision_bytes'], value['decision_sha256']))
        for v in value.values():
            found.extend(nested_windows(v))
    elif isinstance(value, list):
        for v in value:
            found.extend(nested_windows(v))
    return found


def walk(value, path=''):
    yield path, value
    for k, v in (value.items() if isinstance(value, dict) else enumerate(value) if isinstance(value, list) else []):
        yield from walk(v, path + '/' + str(k).replace('~', '~0').replace('/', '~1'))


def semantic_records(value, selector, evidence):
    """Match existing explicit identities; return original JSON pointers for review."""
    candidates = [(p, v) for p, v in walk(value) if isinstance(v, dict)]
    identity = [(p, v) for p, v in candidates if v.get('id') == selector]
    if identity:
        return identity
    if selector == 'winner_first_recorded_shockwave' and 'winner_shockwave_first_recorded_act3' in value:
        return [('/winner_shockwave_first_recorded_act3', value['winner_shockwave_first_recorded_act3'])]
    if selector == 'loser_first_recorded_shockwave' and 'loser_shockwave_first_recorded_before_act3' in value:
        return [('/loser_shockwave_first_recorded_before_act3', value['loser_shockwave_first_recorded_before_act3'])]
    if selector == 'questions.pick.criteria':
        return [(p, v) for p, v in candidates if p.endswith('/questions/pick/criteria')]
    off = re.fullmatch(r'decision_off=(\d+)', selector)
    if off:
        return [(p, v) for p, v in candidates if any(v.get(k) == int(off[1]) for k in ('off', 'decision_off', 'decision_offset'))]
    visit = re.fullmatch(r'visit=([0-9A-Z]{12}):(\d+)', selector)
    run = visit[1] if visit else evidence.get('run')
    floor = int(visit[2]) if visit else evidence.get('floor')
    if run:
        hits = [(p, v) for p, v in candidates if run in (v.get('run'), v.get('run_id')) and (v.get('floor') == floor or v.get('floor') is None)]
        if hits:
            return hits
    if re.fullmatch(r'[A-Z0-9]{12}', selector):
        return [(p, v) for p, v in candidates if selector in (v.get('run'), v.get('run_id'))]
    if '@v0.' in selector:
        title, version = selector.split('@')
        return [(p, v) for p, v in candidates if v.get('build_id') == version and title in json.dumps(v.get('value', ''), ensure_ascii=False)]
    pairs = dict(re.findall(r'(version|cluster|boss)=([^,]+)', selector))
    if pairs:
        return [(p, v) for p, v in candidates if all(str(v.get(k)) == x for k, x in pairs.items())]
    return []


def pointer(value, selector):
    """Resolve real JSON pointers and common named-row paths without guessing data."""
    if not selector:
        return value, ''
    value_path = ''
    for key in selector.lstrip('/').split('/'):
        key = key.replace('~1', '/').replace('~0', '~')
        if isinstance(value, list):
            if key.isdigit() and int(key) < len(value):
                index = int(key)
            else:
                indexes = [i for i, v in enumerate(value) if isinstance(v, dict) and key in [v.get(k) for k in ('id', 'card', 'ref_id', 'name')]]
                if len(indexes) != 1:
                    raise KeyError(key)
                index = indexes[0]
            value = value[index]
            value_path += '/' + str(index)
        elif isinstance(value, dict) and key in value:
            value = value[key]
            value_path += '/' + key
        else:
            raise KeyError(key)
    return value, value_path


def map_ref(evidence):
    ref = evidence.get('ref', '')
    result = {'original_ref': ref, 'type': evidence.get('type', 'own'), 'role': evidence.get('role', 'unspecified')}
    if evidence.get('run'):
        result['run'] = evidence['run']
    direct = re.search(r'logs/([\w-]+\.jsonl)@(\d+)\+(\d+)', ref)
    expected = re.search(r'(?<![\w_])sha256[=:]([a-f0-9]{64})', ref, re.I)
    if direct and expected:
        result.update(status='mapped_original_window', windows=[window('logs/' + direct[1], direct[2], direct[3], expected[1])])
        return result
    path_match = re.search(r'(?:/home/dw/Projects/agent-sts2/)?(?:paper/|knowledge/|\.worktrees/)[^#;\s]+', ref)
    if not path_match:
        result['status'] = 'no_path'
        return result
    path = path_match[0]
    raw, meta = source(path)
    result['source'] = meta
    if raw is None:
        result['status'] = 'source_missing'
        return result
    selector = ref.split('#', 1)[1].split(';', 1)[0] if '#' in ref else ''
    result['selector'] = selector
    if path.endswith('.jsonl'):
        selected = [(i, json.loads(line)) for i, line in enumerate(raw.splitlines()) if line.strip()]
        selected = [(i, v) for i, v in selected if not selector or selector in [v.get(k) for k in ('id', 'ref_id')]]
        result.update(status='mapped_index_record' if selected else 'file_mapped_selector_unresolved',
                      record_lines=[i + 1 for i, v in selected], windows=[w for i, v in selected for w in nested_windows(v)])
        for i, v in selected:
            if str(v.get('path', '')).endswith('.csv') and 'snapshot_sha256' in v:
                snapshot, snapshot_meta = source(v['path'])
                assert snapshot is not None and snapshot_meta['sha256'] == v['snapshot_sha256']
    else:
        value = json.loads(raw)
        try:
            selected, actual_pointer = pointer(value, selector)
            result.update(status='mapped_json_pointer', resolved_pointer=actual_pointer, windows=nested_windows(selected))
        except KeyError:
            hits = semantic_records(value, selector, evidence)
            result.update(status='mapped_explicit_identity' if hits else 'file_mapped_selector_requires_semantic_audit',
                          resolved_pointers=[p for p, v in hits], windows=[w for p, v in hits for w in nested_windows(v)])
    return result


def main():
    raw, meta = source('paper/materials/20261030-issue81-injection-audit-ops/bound-strategy-document.json')
    assert meta['sha256'] == '780224842c5325657ea95bd98062d1fded979b5b6c3378ea501cebecc7fba0f8'
    entries = json.loads(raw)['entries']
    result = []
    for index, e in enumerate(entries):
        if 'full_review_evidence' in e:
            f = e['full_review_evidence']
            raw, meta = source(f['index_path'])
            assert meta['sha256'] == f['index_sha256']
            wanted = set(f['reference_ids'])
            refs = []
            for line_no, line in enumerate(raw.splitlines(), 1):
                v = json.loads(line)
                rid = v.get('id', v.get('ref_id'))
                if rid in wanted:
                    refs.append({'reference_id': rid, 'index': meta, 'line': line_no, 'record_sha256': sha(line),
                                 'windows': nested_windows(v), 'status': 'mapped_frozen_index_record'})
            assert {x['reference_id'] for x in refs} == wanted
            candidate = e['formal_publication']['source_candidate_file']
            raw, meta = source(candidate)
            assert meta['sha256'] == e['formal_publication']['source_candidate_sha256']
            original = next(v for v in json.loads(raw)['entries'] if v['id'] == e['id'])
            assert original == e['review_observation']
            result.append({'index': index, 'id': e['id'], 'candidate_source': meta, 'evidence': refs, 'candidate_exact_match': True})
        else:
            result.append({'index': index, 'id': e['id'], 'evidence': [map_ref(ev) for ev in e['evidence']]})
    supplemental = []
    for path in [
        '.worktrees/codex-strategy-silent-20261024-144312/learner/runs/20261024-144358-1acdc3a2-8329-4d87-845c-80d1778a1ab6-strategy-proposal/scratch/context-statistics.json',
        '.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/context-statistics.json',
        '.worktrees/codex-strategy-silent-20261024-154311/learner/runs/20261024-154405-88073fe8-19ea-495d-ae90-2a1696c9b015-strategy-proposal/scratch/route-candidate.json',
        '.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/context-statistics.json',
    ]:
        raw, meta = source(path)
        assert raw is not None
        supplemental.append(meta)
    (OUT / 'supplemental-sources.json').write_text(json.dumps(supplemental, ensure_ascii=False, indent=2) + '\n')
    report = {'schema': 'issue85-source-map-v1', 'bound_document': meta, 'entries': result,
              'sources': list(SOURCES.values()), 'windows': list(WINDOWS.values()),
              'no_runtime_mutations': True}
    # Correct the bound document identity independently of the last mapped candidate.
    report['bound_document'] = SOURCES['paper/materials/20261030-issue81-injection-audit-ops/bound-strategy-document.json']
    (OUT / 'source-map.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'entries': len(result), 'sources': len(SOURCES), 'windows': len(WINDOWS),
                      'unmapped_entries': [e['id'] for e in result if not any(x['status'].startswith('mapped') or x['status'].startswith('file_mapped') for x in e['evidence'])]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
