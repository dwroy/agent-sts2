import fcntl
import hashlib
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent
target = Path('/home/dw/Projects/agent-sts2/paper/materials/experience-changelog-silent.md')
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
section = (O / 'changelog-section.md').read_bytes()
heading = (O / 'changelog-heading.txt').read_text().strip().encode()
with target.open('a+b') as f:
    fcntl.flock(f, fcntl.LOCK_EX)
    f.seek(0)
    before = f.read()
    assert heading not in before, '本节已存在，停止防重复'
    f.seek(0, 2)
    addition = b'\n' + section
    f.write(addition)
    f.flush()
    f.seek(0)
    after = f.read()
    assert after == before + addition
receipt = dict(ts=stamp, target=str(target), before_bytes=len(before), after_bytes=len(after), added_bytes=len(addition), before_sha256=hashlib.sha256(before).hexdigest(), added_sha256=hashlib.sha256(addition).hexdigest(), prefix_preserved=True, heading=heading.decode())
(O / 'changelog-append.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(receipt, ensure_ascii=False))
