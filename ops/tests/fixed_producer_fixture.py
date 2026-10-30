"""Install reviewed production leaves into isolated, fixed-evidence fixtures."""
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]


def install(root, producer='outcome'):
    declaration = json.loads((ROOT / 'ops/fixed-producer-dependencies.json').read_text())
    names = {**declaration['common'], **declaration['producers'][producer]['inputs']}
    for identity in names:
        name = identity.split(':', 1)[1]
        path = Path(root) / name
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, path)
    path = Path(root) / 'ops/fixed-producer-dependencies.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / 'ops/fixed-producer-dependencies.json', path)


def review(root, name):
    """An explicit synthetic engineering declaration, never production admission."""
    from learning_runtime_store import sha
    path = Path(root) / 'ops/fixed-producer-dependencies.json'
    declaration = json.loads(path.read_text())
    for group in [declaration['common'], *(p['inputs'] for p in declaration['producers'].values())]:
        for identity, node in group.items():
            if identity.split(':', 1)[1] == name:
                node['sha256'] = sha((Path(root) / name).read_bytes())
    path.write_text(json.dumps(declaration) + '\n')
