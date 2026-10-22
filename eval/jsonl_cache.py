"""Disposable append-only cost facts; original byte prefixes remain authoritative."""
import hashlib
import json
from pathlib import Path
import sqlite3


def project(path, row):
    if path.parent.name == 'runs' and path.parent.parent.name == 'learner':
        # Cost attribution reads launch and summary receipts, never streamed text.
        return row if row.get('type') in ('learner_launch', 'learner_summary') else {}
    if path.name in ('brain.jsonl', 'jev-prompts.jsonl'):
        keys = ('engine','run_id','question_id','ts','usage','latency_ms','request_id',
                'decision_id','call','input_tokens','output_tokens','label','accepted','error','problems')
        result = {k:row[k] for k in keys if k in row}
        for key in ('input','inputTokens','cacheRead','cached_input_tokens','cachedInputTokens',
                    'cache_hit_tokens','cacheHitTokens','cache_read_input_tokens','cacheCreation',
                    'cache_write_input_tokens','cacheWriteInputTokens','cacheWriteTokens',
                    'cache_creation_input_tokens','output','outputTokens','reasoning',
                    'reasoning_output_tokens','reasoningOutputTokens','reasoning_tokens','reasoningTokens'):
            if key in row:
                result[key] = row[key]
        if path.name == 'brain.jsonl':
            answer = row.get('answer')
            result['answer'] = None if answer is None else {
                'route':bool(answer.get('route')),
                'run_plan':{} if isinstance(answer.get('run_plan'),dict) else None
            } if isinstance(answer, dict) else True
        return result
    if path.name.startswith('rollout-'):
        payload = row.get('payload') or {}
        if payload.get('type') != 'token_count':
            return {}
        return {k:row[k] for k in ('timestamp','ts','payload') if k in row}
    if isinstance(row.get('message'), dict):
        return {**{k:row[k] for k in ('type','timestamp','requestId','uuid') if k in row},
                'message':{k:row['message'][k] for k in ('usage','id') if k in row['message']}}
    return row


class JsonlCache:
    def __init__(self, directory, revision, projector=None):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(directory / 'facts.sqlite', timeout=60)
        self.db.execute('CREATE TABLE IF NOT EXISTS sources (path TEXT PRIMARY KEY, revision TEXT, end INTEGER, sha TEXT, bad INTEGER)')
        if 'lines' not in {r[1] for r in self.db.execute('PRAGMA table_info(sources)')}:
            self.db.execute('ALTER TABLE sources ADD COLUMN lines INTEGER NOT NULL DEFAULT 0')
        self.db.execute('CREATE TABLE IF NOT EXISTS facts (path TEXT, off INTEGER, body TEXT, sha TEXT, PRIMARY KEY(path,off))')
        self.revision = revision
        self.projector = projector or (lambda path, row, ref: project(path, row))
        self.decoded = self.reused = 0

    def close(self):
        self.db.close()

    def rows(self, path, limit):
        name, digest = str(path.resolve()), hashlib.sha256()
        old = self.db.execute('SELECT revision,end,sha,bad,lines FROM sources WHERE path=?', (name,)).fetchone()
        start, bad, number = 0, 0, 0
        with path.open('rb') as source:
            if old and old[0] == self.revision and old[1] <= limit:
                left = old[1]
                while left:
                    part = source.read(min(left, 4*1024*1024))
                    if not part:
                        break
                    digest.update(part); left -= len(part)
                if not left and digest.hexdigest() == old[2]:
                    start, bad, number = old[1], old[3], old[4]
            if not start:
                digest = hashlib.sha256()
            source.seek(start)
            with self.db:
                if not start:
                    self.db.execute('DELETE FROM facts WHERE path=?', (name,))
                end = start
                while end < limit:
                    off = source.tell()
                    raw = source.readline(limit-off)
                    if not raw or not raw.endswith(b'\n'):
                        break
                    digest.update(raw); end += len(raw); self.decoded += 1; number += 1
                    try:
                        row = json.loads(raw)
                    except (ValueError, UnicodeError):
                        bad += 1
                        continue
                    if not isinstance(row, dict):
                        continue
                    ref = dict(offset=off, bytes=len(raw), line=number,
                               sha256=hashlib.sha256(raw).hexdigest())
                    body = json.dumps(self.projector(path,row,ref), separators=(',',':'))
                    self.db.execute('INSERT INTO facts VALUES (?,?,?,?)', (name,off,body,hashlib.sha256(body.encode()).hexdigest()))
                self.db.execute('INSERT OR REPLACE INTO sources VALUES (?,?,?,?,?,?)',
                                (name,self.revision,end,digest.hexdigest(),bad,number))
        result = []
        for off,body,sha in self.db.execute('SELECT off,body,sha FROM facts WHERE path=? ORDER BY off', (name,)):
            if hashlib.sha256(body.encode()).hexdigest() != sha:
                with self.db:
                    self.db.execute('DELETE FROM sources WHERE path=?', (name,))
                return self.rows(path,limit)
            try:
                result.append(json.loads(body))
            except ValueError:
                with self.db:
                    self.db.execute('DELETE FROM sources WHERE path=?', (name,))
                return self.rows(path,limit)
            self.reused += int(off < start)
        return result, bad
