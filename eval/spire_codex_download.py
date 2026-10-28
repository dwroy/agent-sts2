"""Serial, resumable public-API intake. Raw files/state are never learner inputs."""
import contextlib
import datetime as dt
import email.utils
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.parse

BASE = 'https://spire-codex.com'
DEFAULT_ROOT = Path('data/external/spire-codex')


def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()


def save(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    with tmp.open('w') as f:
        json.dump(value, f, ensure_ascii=False, sort_keys=True)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def load(path, default=None):
    return json.loads(Path(path).read_text()) if Path(path).exists() else default


@contextlib.contextmanager
def locked(root):
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    with (root / 'intake.lock').open('a') as f:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def public_url(url):
    url = urllib.parse.urljoin(BASE, url)
    p = urllib.parse.urlsplit(url)
    if p.scheme != 'https' or p.netloc != 'spire-codex.com' or p.fragment:
        raise ValueError('only the documented public API/export origin is allowed')
    if not (p.path.startswith('/api/') or p.path.startswith('/exports/')) and p.path != '/openapi.json':
        raise ValueError('page mirroring is not allowed')
    return url


def retry_delay(value, attempt):
    try:
        return max(1, float(value))
    except (ValueError, TypeError):
        try:
            return max(1, email.utils.parsedate_to_datetime(value).timestamp() - time.time())
        except (ValueError, TypeError):
            return min(60, 2 ** (attempt + 1))


class Client:
    """Caller holds intake.lock, including the persisted per-root rate limiter."""
    def __init__(self, root):
        self.root = Path(root)

    def request(self, url, body, headers=None):
        url = public_url(url)
        last = load(self.root / 'rate.json', {'time': 0})['time']
        # Current keyless allowance is 15/minute (developers page, 2026-10-28).
        time.sleep(max(0, last + 4.1 - time.time()))
        save(self.root / 'rate.json', {'time': time.time()})
        head = Path(str(body) + '.headers')
        args = ['curl', '--silent', '--show-error', '--connect-timeout', '30',
                '--max-time', '3600', '--speed-limit', '1024', '--speed-time', '60',
                '--user-agent', 'agent-sts2-research/1.0 (documented public API)',
                '--header', 'Accept-Encoding: identity', '--dump-header', str(head),
                '--output', str(body), '--write-out', '%{http_code}']
        for k, v in (headers or {}).items():
            args += ['--header', f'{k}: {v}']
        # curl stderr/URLs may contain raw run identifiers. Keep them out of reports.
        r = subprocess.run(args + [url], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        blocks = head.read_text().strip().split('\n\n') if head.exists() else []
        h = {}
        for line in (blocks[-1].splitlines() if blocks else []):
            if ':' in line:
                k, v = line.split(':', 1)
                h[k.lower()] = v.strip()
        return int(r.stdout or 0), h, r.returncode

    def download(self, url, dest, expected_sha=None, expected_bytes=None, refresh=False):
        url, dest = public_url(url), Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        receipt_path = Path(str(dest) + '.receipt.json')
        old = load(receipt_path)
        if dest.exists() and old and old['url'] == url and sha(dest) == old['sha256']:
            if (expected_sha is None or old['sha256'] == expected_sha) and (expected_bytes is None or dest.stat().st_size == expected_bytes):
                if not refresh:
                    return old
            else:
                old = None
        else:
            old = None
        part = Path(str(dest) + '.part')
        state_path = Path(str(part) + '.json')
        state = load(state_path, {})
        binding = {'url': url, 'expected_sha256': expected_sha, 'expected_bytes': expected_bytes}
        if any(state.get(k) != v for k, v in binding.items()):
            part.unlink(missing_ok=True)
            state = dict(binding)
        chunk = Path(str(dest) + '.chunk')
        for attempt in range(6):
            offset = part.stat().st_size if part.exists() else 0
            # Resume only when the object is pinned by a digest or an HTTP validator.
            if offset and not (expected_sha or state.get('validator')):
                part.unlink()
                offset = 0
            headers = {'Range': f'bytes={offset}-'} if offset else {}
            if not offset and old and refresh:
                if old.get('etag'):
                    headers['If-None-Match'] = old['etag']
                elif old.get('last_modified'):
                    headers['If-Modified-Since'] = old['last_modified']
            if offset and state.get('validator'):
                headers['If-Range'] = state['validator']
            status, h, rc = self.request(url, chunk, headers)
            if status == 304 and old and not rc:
                old['checked_at'] = stamp()
                save(receipt_path, old)
                chunk.unlink(missing_ok=True)
                return old
            if status in (301, 302, 303, 307, 308):
                # No unbounded curl redirects or off-origin requests.
                url = public_url(h['location'])
                state = dict(binding)
                part.unlink(missing_ok=True)
                continue
            if status == 206:
                m = re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)', h.get('content-range', ''))
                if not m or int(m[1]) != offset:
                    raise ValueError('invalid resume Content-Range')
                state['total'] = int(m[3])
                mode = 'ab'
            elif status == 200:
                mode = 'wb'
                state['total'] = int(h['content-length']) if h.get('content-length') else None
            elif status == 416 and expected_sha and part.exists() and sha(part) == expected_sha:
                mode = None
            else:
                if status not in (0, 408, 429, 500, 502, 503, 504):
                    raise ValueError(f'public API HTTP {status}; raw response retained locally')
                time.sleep(retry_delay(h.get('retry-after'), attempt))
                continue
            state['validator'] = h.get('etag') or h.get('last-modified') or state.get('validator')
            if mode == 'wb':
                os.replace(chunk, part)
            elif mode:
                with part.open(mode) as f, chunk.open('rb') as src:
                    for b in iter(lambda: src.read(1024 * 1024), b''):
                        f.write(b)
                    f.flush()
                    os.fsync(f.fileno())
            save(state_path, state)
            total = expected_bytes if expected_bytes is not None else state.get('total')
            if rc or (total is not None and part.stat().st_size != total):
                time.sleep(retry_delay(None, attempt))
                continue
            digest = sha(part)
            if expected_sha and digest != expected_sha:
                raise ValueError('manifest SHA mismatch; partial retained for inspection')
            os.replace(part, dest)
            receipt = dict(binding, downloaded_at=stamp(), bytes=dest.stat().st_size,
                           sha256=digest, resolved_url=url, manifest_verified=expected_sha is not None,
                           etag=h.get('etag'), last_modified=h.get('last-modified'))
            save(receipt_path, receipt)
            chunk.unlink(missing_ok=True)
            state_path.unlink(missing_ok=True)
            return receipt
        raise ValueError('download retry budget exhausted; resumable state retained')

    def json(self, url, tag):
        # Metadata is refreshed each scan, while immutable snapshots remain addressable.
        dest = self.root / 'raw' / 'metadata' / f'{tag}-{time.time_ns()}.json'
        self.download(url, dest)
        return load(dest), sha(dest)


def metadata_row(row):
    # Private download index. No player object or player identifier is retained.
    keys = ('run_hash', 'character', 'ascension', 'build_id', 'win', 'was_abandoned')
    return {k: row.get(k) for k in keys}


def sync(root, versions=None, max_pages=None, export_versions=('v0.111.0',)):
    root = Path(root)
    with locked(root):
        client = Client(root)
        manifest, manifest_sha = client.json(BASE + '/api/exports/runs/manifest', 'manifest')
        available = manifest['versions']
        index_path = root / 'private-index.json'
        index = load(index_path, {'schema': 1, 'runs': {}, 'scans': {}})
        index['manifest_sha256'] = manifest_sha
        for version in export_versions:
            entry = available[version]
            if not re.fullmatch(r'[a-zA-Z0-9.-]+', version):
                raise ValueError('invalid version')
            dest = root / 'raw' / 'exports' / f'{version}-{entry["sha256"]}.jsonl.gz'
            client.download(entry['url'], dest, entry['sha256'], entry['bytes'])
            index.setdefault('exports', {})[version] = str(dest.relative_to(root))
            save(index_path, index)
        # A durable cycle prevents a budgeted resume from restarting earlier builds.
        # A final unfiltered sweep discovers builds newer than the daily manifest.
        # It is subject to the same cap/splitting checks, never silently truncated.
        versions = versions or list(available) + [None]
        cycle = index.get('cycle')
        if not cycle or cycle['versions'] != versions or cycle['complete']:
            cycle = dict(versions=versions, complete=False, next=0, id=stamp(),
                         shards=[{'version': v, 'win': None, 'page': 1} for v in versions])
            index['cycle'] = cycle
            save(index_path, index)
        pages = 0
        while cycle['next'] < len(cycle['shards']):
            scan = cycle['shards'][cycle['next']]
            version = scan['version']
            while True:
                if max_pages is not None and pages >= max_pages:
                    save(index_path, index)
                    return {'complete': False, 'reason': 'page budget', 'runs_downloaded': len(index['runs'])}
                page = scan['page']
                params = dict(character='SILENT', ascension=10, page=page, limit=100)
                if version is not None:
                    params['build_id'] = version
                if scan['win'] is not None:
                    params['win'] = scan['win']
                data, page_sha = client.json(BASE + '/api/replays?' + urllib.parse.urlencode(params), 'list')
                pages += 1
                rows = data['runs']
                if data.get('total', 0) >= 10000:
                    if scan['win'] is not None:
                        raise ValueError('build/win shard reaches API 10000 cap; intake incomplete')
                    cycle['shards'][cycle['next']:cycle['next'] + 1] = [
                        dict(version=version, win=w, page=1) for w in ('true', 'false')]
                    save(index_path, index)
                    break
                if page > 101:
                    raise ValueError('pagination did not terminate')
                scan.update(last_page_sha256=page_sha, total=data.get('total'), updated_at=stamp())
                if not rows:
                    scan.update(complete=True, completed_at=stamp())
                    cycle['next'] += 1
                    save(index_path, index)
                    break
                for row in rows:
                    meta = metadata_row(row)
                    if meta['character'] != 'SILENT' or meta['ascension'] != 10 or (version is not None and meta['build_id'] != version):
                        raise ValueError('API returned out-of-cohort replay')
                    if meta['win'] not in (0, 1, False, True):
                        raise ValueError('missing replay result')
                    if scan['win'] is not None and bool(meta['win']) != (scan['win'] == 'true'):
                        raise ValueError('API did not honor win shard; intake incomplete')
                    key = meta['run_hash']
                    if not isinstance(key, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,128}', key):
                        raise ValueError('invalid raw run hash')
                    dest = root / 'raw' / 'replays' / f'{key}.ndjson'
                    prior = index['runs'].get(key)
                    if prior and prior.get('checked_cycle') == cycle['id'] and dest.exists() and sha(dest) == prior['sha256']:
                        receipt = {'sha256': prior['sha256']}
                    else:
                        receipt = client.download(f'{BASE}/api/runs/{key}/replay', dest, refresh=True)
                    index['runs'][key] = dict(meta, path=str(dest.relative_to(root)), sha256=receipt['sha256'], checked_cycle=cycle['id'])
                    # Per-run commit: restarting an interrupted page reuses verified files.
                    save(index_path, index)
                scan['page'] = page + 1
                save(index_path, index)
        cycle.update(complete=True, completed_at=stamp())
        save(index_path, index)
        return {'complete': True, 'runs_downloaded': len(index['runs']), 'versions': versions}
