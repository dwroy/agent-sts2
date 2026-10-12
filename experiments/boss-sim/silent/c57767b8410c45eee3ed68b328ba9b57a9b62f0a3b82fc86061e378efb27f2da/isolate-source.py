"""Keep historical scratch untouched; verify the identical committed source in a complete hidden snapshot."""
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
out = HERE / '.source-check'
assert not out.exists()
out.mkdir()
trees = ['agent/src', 'agent/tests', 'agent/tools', 'agent/package.json', 'agent/tsconfig.json',
         'agent/tsconfig.test.json', 'agent/vitest.config.ts', 'learner', 'eval', 'ops', 'knowledge']
archive = subprocess.run(['git', 'archive', 'HEAD', *trees], cwd=ROOT, check=True, capture_output=True)
with tarfile.open(fileobj=io.BytesIO(archive.stdout)) as tar:
    for member in tar.getmembers():
        assert not member.issym() and not member.islnk()
    tar.extractall(out, filter='data')
(out / 'agent/node_modules').symlink_to(ROOT / 'agent/node_modules', target_is_directory=True)
(out / 'third_party').symlink_to(ROOT / 'third_party', target_is_directory=True)
shutil.copyfile(ROOT / 'knowledge/characters/silent/boss-trust.json', out / 'knowledge/characters/silent/boss-trust.json')
names = subprocess.check_output(['git', 'ls-files', '--', *trees], cwd=ROOT, text=True).splitlines()
verified = {}
for name in names:
    assert hashlib.sha256((ROOT / name).read_bytes()).digest() == hashlib.sha256((out / name).read_bytes()).digest(), name
    verified[name] = hashlib.sha256((out / name).read_bytes()).hexdigest()
(HERE / 'source-snapshot-integrity.json').write_text(json.dumps({'base': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
    'verified_files': [{'path': name, 'sha256': value} for name, value in verified.items()], 'old_scratch_preserved': True, 'scope': 'Same committed code and fixtures; untracked partial historical trees absent.'}, indent=1)+'\n')
print(json.dumps({'snapshot': str(out), 'verified_files': len(verified)}))
