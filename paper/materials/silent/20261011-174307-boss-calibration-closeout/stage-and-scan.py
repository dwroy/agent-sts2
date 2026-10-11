"""Stage only this batch and scan an exact copy of the staged blobs."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
assert (HERE / 'source-sandbox.exit').read_text().strip() == '0'
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
paths = ['knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md',
         'paper/materials/decision-log.md', 'experiments/boss-sim/silent/' + trust['refresh']['artifact'],
         'paper/materials/silent/20261011-174307-boss-calibration-closeout']
subprocess.run(['git', 'add', '--force', '--', *paths], cwd=ROOT, check=True)
names = subprocess.check_output(['git', 'diff', '--cached', '--name-only', '-z'], cwd=ROOT).decode().split('\0')
names = [name for name in names if name]
assert all(name in paths or any(name.startswith(p + '/') for p in paths[-2:]) for name in names)
scan = HERE / '.scan-staged-source'
assert not scan.exists()
scan.mkdir()
manifest = {}
for name in names:
    raw = subprocess.check_output(['git', 'show', ':' + name], cwd=ROOT)
    target = scan / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    manifest[name] = hashlib.sha256(raw).hexdigest()
(HERE / 'staged-scan-manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
with (HERE / 'source-gitleaks.log').open('w') as handle:
    result = subprocess.run(['gitleaks', 'dir', str(scan), '--redact', '--no-banner',
                             '--report-format', 'json', '--report-path', str(HERE / 'source-gitleaks.json')],
                            cwd=ROOT, stdout=handle, stderr=subprocess.STDOUT)
(HERE / 'source-gitleaks.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, 'Retain the original scanner result and investigate before committing.'
print(json.dumps({'staged_files': len(names), 'gitleaks': result.returncode}))
