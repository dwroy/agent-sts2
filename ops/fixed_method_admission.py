"""Method admission inside the existing publication gate; no independent writer."""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys

from fixed_producer_methods import DECLARATIONS
from learning_runtime import capture
from learning_runtime_store import atomic, checked_file, packed, sha

SCHEMA = 'fixed-method-publication-v1'
CHECKS = {'root-tsc', 'runtime-tsc', 'live-tsc', 'host', 'consumers', 'full'}


def live_root(root):
    return Path(root) / '.worktrees/live'


def head(root):
    return subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True, timeout=15).strip()


def producers(chosen):
    return sorted(set(chosen.get('refresh', [])) | ({'silent-boss-calibration'} if 'silent-boss-calibration' in chosen.get('entries', []) else set()))


def inputs(code, runtime, names):
    # Load the actual inspected verifier, including after a ROOT deployment.
    # An already-imported pre-deployment Python module cannot attest its successor.
    result = {}
    for name in names:
        source = runtime if name == 'silent-boss-calibration' else code
        command = [sys.executable, str(Path(runtime) / 'ops/fixed_producer_methods.py'),
                   '--code-root', str(source), '--runtime-root', str(runtime), '--producer', name]
        response = subprocess.run(command, capture_output=True, check=True, timeout=60)
        body = json.loads(response.stdout)
        if body['method_sha256'] != sha(packed(body['manifest']).encode()):
            raise ValueError('installed method verifier returned an invalid digest')
        result[name] = body['manifest']
    return result


def snapshots(root, manifests):
    result = {}
    for body in manifests.values():
        for key in body['inputs']:
            scope, name = key.split(':', 1)
            # Calibration executes ROOT's producer rather than LIVE's copy.
            source = Path(root) if scope == 'runtime' or body['producer'] == 'silent-boss-calibration' else live_root(root)
            identity = ('runtime' if source == Path(root) else 'code') + ':' + name
            path = source / name
            result[identity] = sha(checked_file(source, path)) if path.exists() else None
    return result


def checked_evidence(root, path, runtime_source, code_source, manifests):
    raw = checked_file(root, path)
    evidence = json.loads(raw)
    if (evidence.get('exit_code') != 0 or evidence.get('error')
            or set(evidence.get('checks', {})) != CHECKS
            or any(v != 'passed' for v in evidence['checks'].values())
            or evidence.get('full_runs') != 1):
        raise ValueError('successful final engineering combination required')
    assembly = evidence['assembly']
    if Path(assembly['root']).resolve() != runtime_source or Path(assembly['runtime']).resolve() != code_source:
        raise ValueError('method sources differ from tested ROOT/LIVE views')
    if assembly['candidate'] != evidence['job']['candidate']:
        raise ValueError('engineering candidate identity mismatch')
    if assembly.get('live_commit') != head(live_root(root)) or Path(assembly.get('live', '')).resolve() != live_root(root).resolve():
        raise ValueError('actual LIVE baseline differs from final checked combination')
    for body in manifests.values():
        for identity, digest in body['inputs'].items():
            scope, name = identity.split(':', 1)
            key = 'root_inputs' if scope == 'runtime' or body['producer'] == 'silent-boss-calibration' else 'runtime_inputs'
            if assembly[key]['files'].get(name, {}).get('sha256') != digest:
                raise ValueError('method input absent from final checked combination: ' + identity)
    for identity, digest in snapshots(root, manifests).items():
        scope, name = identity.split(':', 1)
        if scope == 'code':
            old = assembly['live_before']['files'].get(name)
            if (old.get('sha256') if old else None) != digest:
                raise ValueError('actual LIVE method preimage differs from final checked combination: ' + name)
    registry_sha = sha(checked_file(runtime_source, runtime_source / DECLARATIONS))
    if assembly['root_inputs']['files'].get(DECLARATIONS, {}).get('sha256') != registry_sha:
        raise ValueError('method declaration differs from final checked combination')
    return dict(path=str(path), sha256=sha(raw), candidate=assembly['candidate'], declarations_sha256=registry_sha)


def prepare(root, dest, runtime_source, code_source, evidence_path):
    """Read-only preparation after the original final engineering check."""
    root, runtime_source, code_source = map(lambda p: Path(p).resolve(), (root, runtime_source, code_source))
    chosen = capture(root, dest)
    names = producers(chosen) if chosen.get('enabled') else []
    if not names:
        raise ValueError('no enabled fixed methods to admit')
    after = inputs(code_source, runtime_source, names)
    evidence = checked_evidence(root, evidence_path, runtime_source, code_source, after)
    return dict(schema=SCHEMA, root=str(root), control_sha256=chosen['control_sha256'],
                root_head=head(root), live_head=head(live_root(root)), before=snapshots(root, after),
                after=after, methods={p: sha(packed(m).encode()) for p, m in after.items()}, evidence=evidence)


def transaction_path(dest, marker):
    return Path(dest) / 'fixed-method-publications' / (marker.get('fixed_method_transaction', marker['token']) + '.json')


def start(root, dest, marker, ticket_path, resume=False):
    """Called only while publication_gate.writing owns the original K/L locks."""
    chosen = capture(root, dest)
    path = transaction_path(dest, marker)
    if not path.exists() and (not chosen.get('enabled') or not producers(chosen)):
        return None
    if ticket_path is None:
        raise ValueError('fixed methods require same-publication engineering admission material')
    raw = checked_file(root, ticket_path)
    ticket = json.loads(raw)
    if ticket.get('schema') != SCHEMA or ticket.get('root') != str(Path(root).resolve()):
        raise ValueError('foreign fixed method publication')
    path = transaction_path(dest, marker)
    if path.exists():
        saved = json.loads(checked_file(root, path))
        if saved['ticket_sha256'] != sha(raw) or saved['owner'] != marker['owner']:
            raise ValueError('original fixed method transaction changed')
        if not resume:
            raise ValueError('original deployment may have run; inspect and use explicit installed-only resume')
        return saved
    if resume:
        raise ValueError('no original fixed method transaction to resume')
    if (chosen['control_sha256'] != ticket['control_sha256'] or head(root) != ticket['root_head']
            or head(live_root(root)) != ticket['live_head'] or snapshots(root, ticket['after']) != ticket['before']
            or set(ticket['methods']) != set(producers(chosen))):
        raise ValueError('fixed method deployment preimage changed')
    evidence = ticket['evidence']
    if sha(checked_file(root, evidence['path'])) != evidence['sha256']:
        raise ValueError('original engineering check receipt changed')
    checked = json.loads(checked_file(root, evidence['path']))
    w, g = Path(checked['assembly']['root']).resolve(), Path(checked['assembly']['runtime']).resolve()
    if (checked_evidence(root, evidence['path'], w, g, ticket['after']) != evidence
            or inputs(g, w, ticket['methods']) != ticket['after']
            or ticket['methods'] != {p: sha(packed(m).encode()) for p, m in ticket['after'].items()}):
        raise ValueError('fixed method ticket is not the final checked declaration')
    control_path = Path(dest) / 'learning-runtime.json'
    old = checked_file(root, control_path)
    control = json.loads(old)
    control['methods'].update(ticket['methods'])
    saved = dict(schema=SCHEMA, owner=marker['owner'], ticket_sha256=sha(raw), ticket=ticket,
                 before_control=old.decode(), after_control=packed(control) + '\n', phase='prepared')
    atomic(path, (packed(saved) + '\n').encode())
    return saved


def finish(root, dest, marker, saved):
    if saved is None:
        return
    ticket = saved['ticket']
    actual = inputs(live_root(root), Path(root), ticket['methods'])
    if actual != ticket['after'] or sha(checked_file(root, Path(root) / DECLARATIONS)) != ticket['evidence']['declarations_sha256']:
        raise ValueError('installed methods differ from the final tested combination')
    if sha(checked_file(root, ticket['evidence']['path'])) != ticket['evidence']['sha256']:
        raise ValueError('engineering evidence changed during publication')
    path = transaction_path(dest, marker)
    control_path = Path(dest) / 'learning-runtime.json'
    current = checked_file(root, control_path)
    before, after = saved['before_control'].encode(), saved['after_control'].encode()
    if current not in (before, after):
        raise ValueError('fixed method control CAS conflict; retain publication')
    if saved['phase'] == 'admitted':
        if current != after:
            raise ValueError('admitted control changed; retain original receipt')
        return
    if current == before:
        atomic(control_path, after)
    saved.update(phase='admitted', actual_root_head=head(root), actual_live_head=head(live_root(root)),
                 control_sha256=sha(after), completed_at=datetime.now(timezone.utc).isoformat())
    atomic(path, (packed(saved) + '\n').encode())


def verify_release(root, dest, marker):
    if marker['phase'] != 'publishing':
        return
    chosen = capture(root, dest)
    if not marker.get('fixed_methods_required') and (not chosen.get('enabled') or not producers(chosen)):
        return
    path = transaction_path(dest, marker)
    saved = json.loads(checked_file(root, path))
    if saved.get('phase') != 'admitted' or chosen['control_sha256'] != saved['control_sha256']:
        raise ValueError('same-publication method admission incomplete; retain marker')
    actual = inputs(live_root(root), Path(root), producers(chosen))
    if actual != saved['ticket']['after'] or any(chosen['methods'].get(p) != sha(packed(m).encode()) for p, m in actual.items()):
        raise ValueError('installed/admitted method changed before release')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--state-dir', type=Path)
    parser.add_argument('--runtime-source', type=Path, required=True)
    parser.add_argument('--code-source', type=Path, required=True)
    parser.add_argument('--engineering-receipt', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    from publication_gate import directory
    result = prepare(root, directory(root, args.state_dir), args.runtime_source, args.code_source, args.engineering_receipt)
    output = args.output if args.output.is_absolute() else root / args.output
    output.relative_to(root)
    if output.exists():
        if checked_file(root, output) != (packed(result) + '\n').encode():
            raise ValueError('original method ticket retained; prepare a new identity')
    else:
        atomic(output, (packed(result) + '\n').encode())
    print(packed(dict(prepared=True, path=str(output), methods=result['methods'])))
