"""Reviewed, producer-specific source closures; unknown bytes never widen a closure.

The declarations pin the reviewed bytes as well as the explicit dependency edges.
In particular, an opaque import/path/subprocess change needs a new engineering
declaration. There is no runtime discovery fallback or automatic re-admission.
"""
import argparse
import ast
import json
from pathlib import Path
import re
import sys

from learning_runtime_store import checked_file, packed, sha

SCHEMA = "fixed-method-closure-v2"
DECLARATIONS = "ops/fixed-producer-dependencies.json"
RUNTIME = Path(__file__).resolve().parents[1]


def local_imports(path, raw, available, module_only=False, declared=(), functions=()):
    """Audit static edges without importing or running the inspected producer."""
    if path.endswith('.py'):
        tree = ast.parse(raw, filename=path)
        names = []
        def nodes(node):
            yield node
            if module_only and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name not in functions:
                return
            if module_only and isinstance(node, ast.ClassDef):
                return
            for child in ast.iter_child_nodes(node):
                yield from nodes(child)
        for node in nodes(tree):
            if isinstance(node, ast.Import):
                names.extend(a.name for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                names.append(node.module)
        result = set()
        for module in names:
            if module.split('.')[0] in sys.stdlib_module_names:
                continue
            suffix = module.replace('.', '/') + '.py'
            # Include every declared resolution of an ambiguous local module.
            found = {p for p in available if p == suffix or p.endswith('/' + suffix)}
            if found:
                sibling = str(Path(path).parent / suffix)
                if sibling in found:
                    result.add(sibling)
                elif len(found) == 1:
                    result.update(found)
                elif len(found.intersection(declared)) == 1:
                    result.update(found.intersection(declared))
                else:
                    raise ValueError('ambiguous static import needs explicit resolution: ' + path + ':' + module)
            elif module not in ('duckdb',):
                raise ValueError('undeclared Python import: ' + path + ':' + module)
        return result
    if path.endswith(('.ts', '.mts', '.js', '.mjs')):
        # All opaque calls are pinned by the reviewed source digest below.
        refs = re.findall(r'''(?:from\s*|import\s*\(|require\s*\(|import\s*)["'](\.[^"']+)["']''', raw.decode())
        found = set()
        for ref in refs:
            base = Path(path).parent / ref
            parts = []
            for part in base.parts:
                if part == '..':
                    if not parts:
                        raise ValueError('source import leaves repository')
                    parts.pop()
                elif part != '.':
                    parts.append(part)
            name = '/'.join(parts)
            candidates = [name, re.sub(r'\.m?js$', '.ts', name), re.sub(r'\.mjs$', '.mts', name), name + '.ts', name + '/index.ts']
            chosen = next((p for p in candidates if p in available), None)
            if chosen is None:
                raise ValueError('undeclared local TS import: ' + path + ':' + ref)
            found.add(chosen)
        return found
    return set()


def opaque_sites(path, raw):
    """Every opaque import/IO/child call must have a reviewed site declaration."""
    if path.endswith('.py'):
        selected = {'__import__', 'import_module', 'spec_from_file_location', 'exec', 'eval', 'compile', 'run', 'Popen',
                    'call', 'check_call', 'check_output', 'execv', 'execve', 'execvpe', 'execl', 'execvp', 'system', 'popen',
                    'open', 'read_text', 'read_bytes', 'glob', 'rglob'}
        return sorted({sha(ast.dump(node, include_attributes=False).encode())
                       for node in ast.walk(ast.parse(raw)) if isinstance(node, ast.Call)
                       and (node.func.id if isinstance(node.func, ast.Name) else node.func.attr
                            if isinstance(node.func, ast.Attribute) else '') in selected})
    if path.endswith(('.ts', '.mts', '.js', '.mjs', '.sh')):
        # A whole-file opaque declaration covers shell/TS runtime file access;
        # literal TS module edges are additionally resolved statically.
        return [sha(raw)]
    return []


def manifest(code_root, producer, runtime_root=None):
    code_root, runtime_root = Path(code_root).resolve(), Path(runtime_root or RUNTIME).resolve()
    declaration = json.loads(checked_file(runtime_root, runtime_root / DECLARATIONS))
    if declaration.get('schema') != SCHEMA or producer not in declaration.get('producers', {}):
        raise ValueError('unknown fixed producer closure')
    selected = declaration['producers'][producer]
    nodes = {**declaration['common'], **selected['inputs']}
    if producer == 'silent-boss-calibration':
        # These are genuine reads in the existing calibration fingerprint, not
        # a fallback for unresolved imports. A new leaf needs explicit review.
        actual = {str(p.relative_to(code_root)) for p in (code_root / 'agent/src').rglob('*.ts')}
        actual.update(str(p.relative_to(code_root)) for p in (code_root / 'agent/tools/boss-sim').iterdir()
                      if p.suffix in ('.ts', '.py') and not p.name.startswith('test_'))
        if any('code:' + name not in nodes for name in actual):
            raise ValueError('calibration source read family needs explicit dependency declaration')
    files = {}
    for identity, reviewed in sorted(nodes.items()):
        scope, name = identity.split(':', 1)
        if scope not in ('code', 'runtime') or Path(name).is_absolute() or '..' in Path(name).parts:
            raise ValueError('invalid fixed method source identity')
        root = code_root if scope == 'code' else runtime_root
        raw = checked_file(root, root / name)
        digest = sha(raw)
        if digest != reviewed['sha256']:
            raise ValueError('fixed dependency needs engineering declaration: ' + identity)
        # Review records include static, dynamic, subprocess and text-read edges.
        if reviewed.get('opaque_sites') != opaque_sites(name, raw):
            raise ValueError('opaque dependency site needs explicit declaration: ' + identity)
        dependencies = reviewed['dependencies']
        if not isinstance(dependencies, list) or any(d not in nodes for d in dependencies):
            raise ValueError('incomplete fixed dependency declaration: ' + identity)
        available = {key.split(':', 1)[1] for key in nodes}
        declared = {d.split(':', 1)[1] for d in dependencies}
        imports = set() if reviewed.get('scan') == 'text' else local_imports(name, raw, available, reviewed.get('scan') == 'module', declared, reviewed.get('functions', ()))
        if not imports.issubset(declared):
            raise ValueError('undeclared static dependency: ' + identity)
        files[identity] = digest
    return dict(schema=SCHEMA, producer=producer, inputs=files,
                declaration=selected['contract'],
                edges={key: value['dependencies'] for key, value in sorted(nodes.items())})


def method(code_root, producer, runtime_root=None):
    return sha(packed(manifest(code_root, producer, runtime_root)).encode())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--code-root', type=Path, required=True)
    parser.add_argument('--runtime-root', type=Path, default=RUNTIME)
    parser.add_argument('--producer', required=True)
    args = parser.parse_args()
    value = manifest(args.code_root, args.producer, args.runtime_root)
    print(packed(dict(method_sha256=sha(packed(value).encode()), manifest=value)))
