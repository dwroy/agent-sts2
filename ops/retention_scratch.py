"""Reversible done-batch storage policy; never grants publication or checkout acceptance."""
import json
import re
from pathlib import Path


LOG_SUFFIXES = {'.log', '.out', '.err', '.stdout', '.stderr'}


def done_admission(root, directory, state, bid, r):
    batch = state.get('batches', {}).get(bid, {})
    if not r.BATCH.fullmatch(bid) or batch.get('state') != 'done' or batch.get('rc') != 0:
        raise ValueError('only successful done scratch may be compacted independently')
    tree = r.safe_path(root, batch.get('worktree') or root)
    if tree != root and tree.parent != root / '.worktrees':
        raise ValueError('foreign runtime/worktree retained')
    if any(b.get('state') in ('running', 'awaiting_review') and Path(b.get('worktree') or root) == tree
           for b in state.get('batches', {}).values()):
        raise ValueError('active shared owner retained')
    import worktree_retention as w
    if tree != root and tree.name not in ('exp', 'exp-' + str(batch.get('character'))):
        w.checked_tree(root, tree.name)
        w.instance_guard(root, tree)
    if tree != root and tree.name not in ('exp', 'exp-' + str(batch.get('character'))) and w.active(tree):
        raise ValueError('active process cwd or program reference retained')
    if (tree / '.git').exists():
        if r.git(tree, 'status', '--porcelain', '--untracked-files=all'):
            raise ValueError('dirty/uncommitted worktree retained')
    report = r.read_report(str(directory / 'learner' / (bid + '.out'))) or {}
    task = batch.get('learner_task', batch.get('task', 'postmortem'))
    candidates = []
    if report.get('report') and report.get('task', task) == task:
        candidate = r.safe_path(root, report['report']).parent
        if candidate.parent == tree / 'learner/runs' and r.SCRATCH.fullmatch(candidate.name) and candidate.is_dir():
            candidates.append(candidate)
    # Older reports did not include a scratch path. Bind it to the original launch,
    # task/cwd and batch registration instead of guessing from a directory timestamp.
    if not candidates:
        roots = [tree / 'learner/runs']
        if task == 'experience-update' and tree.name in ('exp', 'exp-' + str(batch.get('character'))):
            roots.append(root / 'learner/runs')
        events = {p for folder in roots for p in folder.glob('*.jsonl')}
        # The canonical launch stream can live in ROOT while scratch lives in its checkout.
        for suffix in ('.out', '.err'):
            output = r.safe_path(root, directory / 'learner' / (bid + suffix))
            if output.is_file():
                with output.open('rb') as stream:
                    stream.seek(max(0, output.stat().st_size - 2 * 1024 * 1024))
                    text = stream.read().decode('utf8', errors='replace')
                events.update(Path(match) for match in re.findall(r'(?:日志[：:]\s*|日志 )(\S+\.jsonl)', text))
        for event in sorted(events):
            r.safe_path(root, event)
            if r.secret_name(event) or not event.is_file():
                continue
            with event.open('rb') as stream:
                line = stream.readline(131073)
            if len(line) > 131072:
                continue
            try:
                launch = json.loads(line)
            except (ValueError, UnicodeError):
                continue
            if not isinstance(launch, dict) or launch.get('type') != 'learner_launch':
                continue
            params = launch.get('params', {})
            if not isinstance(params, dict) or not isinstance(params.get('scratch'), str):
                continue
            scratch = r.safe_path(root, params.get('scratch', event.with_suffix('')))
            if (launch.get('type') == 'learner_launch' and launch.get('cwd') == str(tree)
                    and launch.get('task') == task and params.get('scratch') == str(scratch)
                    and scratch.parent in (tree / 'learner/runs', root / 'learner/runs')
                    and event.stem == scratch.name and params.get('character', batch.get('character')) == batch.get('character')
                    and params.get('worktree', str(tree)) == str(tree)
                    and (params.get('batch') == bid or scratch.name.startswith(bid + '-') or scratch.name == bid)
                    and r.SCRATCH.fullmatch(scratch.name) and scratch.is_dir()):
                candidates.append(scratch)
    if len(set(candidates)) != 1:
        raise ValueError('scratch ownership not bound to original report or launch')
    scratch = r.safe_path(root, candidates[0])
    if w.active(scratch):
        raise ValueError('active process cwd or program reference retained')
    if not isinstance(batch.get('character'), str) or not r.re.fullmatch('[a-z][a-z0-9_]*', batch['character']):
        raise ValueError('character binding missing')
    return batch, tree, scratch, dict(kind='done-process-storage', task=task,
        original_batch_state='done', no_acceptance_claim=True, retire_checkout=False, compact_scratch=True)


def consumers(root, directory, bid, batch, tree, scratch, r):
    """Ask current consumers first, then pin every referenced original tree file."""
    tuis = sorted((directory / 'learner').glob('*' + bid + '*.tui.json'))
    if batch.get('external_source') or batch.get('backfill_source') or tuis:
        try:
            if batch.get('external_source') or batch.get('backfill_source'):
                from strategy_backfill_jobs import retired
                retired(bid, batch, directory, read_only=True)
            else:
                from learner_tui import verified_code
                for tui in tuis:
                    verified_code(tui, directory / 'learner' / (bid + '.out'), batch['rc'], persist_output=False)
        except (OSError, ValueError, KeyError, TypeError, RuntimeError, IndexError, AttributeError) as error:
            raise ValueError('runtime proof incompatible with reclamation: ' + type(error).__name__) from error
    protected = set()

    def visit(value, key=None):
        if isinstance(value, dict):
            for k, item in value.items():
                visit(item, k)
        elif isinstance(value, list):
            for item in value:
                visit(item, key)
        elif isinstance(value, str) and key in ('path', 'log', 'rollout', 'original_log'):
            path = Path(value) if Path(value).is_absolute() else root / value
            if path.is_relative_to(tree):
                path = r.safe_path(root, path)
                if r.secret_name(path) or not path.is_file():
                    raise ValueError('runtime proof reference missing or unsafe')
                protected.add(str(path.relative_to(root)))

    folder = directory / 'learner'
    receipts = sorted(set(folder.glob('*' + bid + '*.json')))
    for receipt in receipts:
        r.safe_path(root, receipt)
        if r.secret_name(receipt):
            raise ValueError('unsafe runtime proof receipt')
        visit(r.load(receipt))
    files = r.files_under(root, scratch)
    protected.update(str(p.relative_to(root)) for p in files if p.suffix in LOG_SUFFIXES
                     or (p.suffix == '.jsonl' and any(word in p.name.lower() for word in ('usage', 'token', 'accounting', 'native'))))
    return sorted(protected)
