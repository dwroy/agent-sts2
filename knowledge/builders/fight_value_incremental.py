"""Resumable original fight reducer; only the provisional EOF suffix is replaced."""
from collections import Counter, defaultdict
import hashlib
import json
import os
from pathlib import Path
import codecs

from incremental_evidence import implementation, token
from legacy_incremental import context, pack, unpack


def digest(path):
    sha = hashlib.sha256()
    with Path(path).open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            sha.update(block)
    return sha.hexdigest()


def extract(module, states, runs, rows_path, character, game):
    cache = context(states)
    if cache is None:
        return None
    stream = cache.ready(states)
    info = cache.index.metadata(stream)
    stamp = cache.index.directory / ('fight-rows-' + token(str(Path(rows_path).resolve())) + '.json')
    identity = token([cache.code, implementation(__file__, module.__file__, module.bmd.__file__), character, game])
    old, reason = None, 'cold'
    try:
        old = json.loads(stamp.read_text())
        if not isinstance(old, dict):
            raise ValueError('invalid checkpoint envelope')
        if old.get('checkpoint_sha256') != token({k:v for k,v in old.items() if k != 'checkpoint_sha256'}):
            reason = 'damaged_checkpoint'
        elif old['identity'] != identity:
            reason = 'implementation_or_scope_changed'
        elif old['source_generation'] != info['generation']:
            reason = info['rebuild_reason']
        elif old['source_size'] > info['source_size']:
            reason = 'truncated'
        elif any(runs.get(rid) != value for rid, value in old['runs'].items()):
            reason = 'completed_run_revised'
        elif any(rid in runs for rid in old['unresolved_runs']):
            reason = 'late_run_outcome'
        elif digest(rows_path) != old['output_sha256']:
            reason = 'rows_changed'
        else:
            reason = None
    except (OSError, ValueError, KeyError, TypeError):
        reason = 'missing_or_damaged_checkpoint'
    if reason:
        old = None
    path = Path(rows_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + f'.{os.getpid()}.tmp')
    previous_observe = module.bmd.observe_combat
    module.bmd.observe_combat = module._observe(previous_observe)
    try:
        with temporary.open('w', encoding='utf8') as out:
            if old:
                # The training table is small; copy its stable prefix, never raw logs.
                with path.open('rb') as source:
                    left = old['stable_bytes']
                    decoder = codecs.getincrementaldecoder('utf8')()
                    while left:
                        block = source.read(min(left, 1024 * 1024))
                        if not block:
                            raise ValueError('training rows truncated')
                        out.write(decoder.decode(block))
                        left -= len(block)
                    out.write(decoder.decode(b'', final=True))
            builder = module.RowBuilder(runs, out, character)
            unresolved = set(old['unresolved_runs']) if old else set()
            commit = builder.commit
            def observe_commit(fight):
                if fight.outcome is None and fight.run_id not in runs:
                    unresolved.add(fight.run_id)
                commit(fight)
            builder.commit = observe_commit
            if old:
                builder.open, pending = unpack(old['carry'], module.bmd.Fight)
                builder.await_map = defaultdict(list, pending)
                builder.rows, builder.fights = old['rows'], old['fights']
                builder.by_asc = Counter(dict(unpack(old['by_asc'])))
            offset = old['source_size'] if old else 0
            refs = (ref for ref, _rid, _reason in cache.index.references(stream, start_offset=offset))
            processed = 0
            # Keep the original cross-run closing order and malformed-line policy.
            for raw in cache.raw(states, refs):
                processed += 1
                for screen, entry in module.bmd.iter_entries(states, [raw]):
                    builder.feed(screen, entry)
            out.flush()
            checkpoint = dict(identity=identity, source_size=info['source_size'], stable_bytes=out.tell(),
                              source_generation=info['generation'],
                              carry=pack((builder.open, dict(builder.await_map))), rows=builder.rows,
                              fights=builder.fights, by_asc=pack(list(builder.by_asc.items())),
                              runs=runs, unresolved_runs=sorted(unresolved))
            # finish() materializes the legacy EOF result without mutating the
            # resumable carry. Next append discards only this provisional suffix.
            builder.finish()
        os.replace(temporary, path)
        checkpoint['output_sha256'] = digest(path)
        checkpoint['checkpoint_sha256'] = token(checkpoint)
        checkpoint_path = stamp.with_suffix('.tmp')
        checkpoint_path.write_text(json.dumps(checkpoint))
        os.replace(checkpoint_path, stamp)
        cache.timings.append(dict(name='fight-value:append', processed_frames=processed,
                                  from_offset=offset, source_size=info['source_size'], rebuild_reason=reason,
                                  stable_bytes=checkpoint['stable_bytes']))
        return builder
    finally:
        module.bmd.observe_combat = previous_observe
        temporary.unlink(missing_ok=True)


def training_due(stamp, runs, outputs, every=10, idle=False, force=False):
    """No model mutation until a whole fit succeeds. Count unique completed runs."""
    if every < 1:
        raise ValueError('training interval must be positive')
    try:
        previous = json.loads(Path(stamp).read_text())
        intact = previous['outputs'] == {str(p): digest(p) for p in outputs}
    except (OSError, ValueError, KeyError, TypeError):
        previous, intact = {}, False
    pending = sorted(set(runs) - set(previous.get('runs', [])))
    due = force or not intact or len(pending) >= every or (idle and bool(pending))
    return due, dict(pending_runs=pending, every=every, idle=idle, previous_complete=intact)


def trained(stamp, runs, outputs):
    path = Path(stamp)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(dict(runs=sorted(runs), outputs={str(p): digest(p) for p in outputs})))
    os.replace(temporary, path)
