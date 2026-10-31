#!/usr/bin/env python3
"""Reconstruct the failed frozen validation profile; never modify its source tree.

This is an offline evidence recipe, not a deployment or full-test entrypoint.
Run baseline first, then repair, then the documented directed checks.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args, data=None):
    return subprocess.check_output(['git', '-C', str(root), *args], input=data)


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def safe_path(root, name):
    path = root / name
    if Path(name).is_absolute() or '..' in Path(name).parts or path.is_symlink():
        raise ValueError('unsafe profile input')
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('profile input escapes root')
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['baseline', 'repair'])
    parser.add_argument('--repository', type=Path, required=True)
    parser.add_argument('--materials', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    args = parser.parse_args()
    repo, materials, dest = args.repository.resolve(), args.materials.resolve(), args.destination.absolute()
    # The destination must be a new local evidence fixture, never an ops/live worktree.
    if '.artifacts' not in dest.parts or not dest.is_relative_to(Path(__file__).resolve().parents[3]):
        raise ValueError('destination must be in this development checkout .artifacts')
    assembly = json.loads((materials / 'assembly.json').read_text())
    inputs = json.loads((materials / 'inputs-before.json').read_text())
    source = Path(assembly['worktree'])
    record = dest.parent / 'reconstruction.json'
    if args.mode == 'baseline':
        dest.mkdir(parents=True, exist_ok=False)
        # Separate refs/index, shared immutable objects only. Baseline HEAD is the
        # original game baseline, reproducing the host-closure mismatch exactly.
        subprocess.run(['git', 'init', '-q', str(dest)], check=True)
        (dest / '.git/info/exclude').write_text('agent/node_modules\n**/__pycache__/\n')
        objects = git(repo, 'rev-parse', '--path-format=absolute', '--git-path', 'objects').decode().strip()
        (dest / '.git/objects/info/alternates').write_text(objects + '\n')
        git(dest, 'update-ref', 'HEAD', assembly['live_base'])
        git(dest, 'read-tree', 'HEAD')
        for row in inputs:
            data = safe_path(source, row['path']).read_bytes()
            if sha(data) != row['sha256']:
                raise ValueError('frozen source drift: ' + row['path'])
            target = safe_path(dest, row['path'])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            target.chmod((source / row['path']).stat().st_mode & 0o777)
        (dest / 'agent/node_modules').symlink_to((source / 'agent/node_modules').resolve(), target_is_directory=True)
        save(record, dict(destination=str(dest), frozen_materials=str(materials),
                          copied_inputs=len(inputs), host_source=assembly['host_source_head'],
                          baseline_head=assembly['live_base'], product_tree=assembly['prepared_tree']))
    else:
        previous = json.loads(record.read_text())
        if previous['destination'] != str(dest) or previous['frozen_materials'] != str(materials):
            raise ValueError('reconstruction identity mismatch')
        if 'validation_snapshot' in previous:
            raise ValueError('repair already completed; retain original snapshot')
        # The host tests need both non-test helper modules and the real project's
        # board fixture. Both are committed at the original frozen host source.
        additions = []
        for name in ['.agents/board.yaml', 'agent/tests/herdr-workspace-fixture.ts']:
            target = safe_path(dest, name)
            if target.exists():
                raise ValueError('missing-fixture precondition changed: ' + name)
            data = git(repo, 'show', assembly['host_source_head'] + ':' + name)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            additions.append(dict(path=name, source=assembly['host_source_head'], sha256=sha(data)))
        test = 'agent/tests/brain-claude.test.ts'
        original = (dest / test).read_bytes()
        patched = (Path(__file__).resolve().parents[3] / test).read_bytes()
        if original.replace(b'import { join } from "node:path";', b'import { join, relative } from "node:path";').replace(
                b'    const missing = await checkClaudeBin(join(dir, "no-such-claude"));',
                b'    // checkClaudeBin runs in tmpdir(); keep this controlled missing path short so\n'
                b'    // its bounded diagnostic retains ENOENT even under a long TMPDIR.\n'
                b'    const missing = await checkClaudeBin(`./${relative(tmpdir(), join(dir, "no-such-claude"))}`);') != patched:
            raise ValueError('unexpected diagnostic-test delta')
        (dest / test).write_bytes(patched)
        # HEAD must describe the effective game + deployed-host validation input.
        # Keep this validation-only anchor separate from the nine deployable leaves.
        git(dest, 'add', '-A', '--', 'agent', 'ops', 'learner', 'eval', 'knowledge', 'docs', 'paper', '.agents')
        tree = git(dest, 'write-tree').decode().strip()
        commit = git(dest, 'commit-tree', tree, '-p', assembly['live_base'], data=(
            b'Freeze effective issue37 validation inputs; not a publication\n\n'
            b'Co-Authored-By: Codex GPT-6 <noreply@openai.com>\n')).decode().strip()
        git(dest, 'update-ref', 'HEAD', commit)
        git(dest, 'reset', '--mixed', '-q', commit)
        save(record, {**previous, 'fixture_additions': additions,
                      'test_delta': dict(path=test, before_sha256=sha(original), after_sha256=sha(patched)),
                      'validation_snapshot': commit, 'validation_tree': tree,
                      'validation_only_not_a_product_release': True,
                      'original_product_tree_preserved': assembly['prepared_tree']})


if __name__ == '__main__':
    main()
