import fcntl
import hashlib
import json
import os
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
target = Path('/home/dw/Projects/agent-sts2/paper/materials/experience-changelog-silent.md')
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
section = (O / 'changelog-section.md').read_bytes()
title = (O / 'changelog-title.txt').read_text().strip().encode()
scan = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'], input=section, capture_output=True)
(O / 'gitleaks-report.log').write_bytes(scan.stdout + scan.stderr)
assert scan.returncode == 0
with target.open('r+b') as h:
    fcntl.flock(h, fcntl.LOCK_EX)
    before = h.read()
    assert title not in before, '本节已存在，禁止重复追加'
    headings = [line for line in before.decode().splitlines() if line.startswith('## ') and '静默猎手' in line]
    assert '第一百四十次增量' in headings[-1], '上一节改变，停止以免重复编号'
    addition = (b'\n' if before.endswith(b'\n') else b'\n\n') + section
    h.seek(0, os.SEEK_END)
    assert h.write(addition) == len(addition)
    h.flush()
    os.fsync(h.fileno())
    h.seek(0)
    after = h.read()
    assert after[:len(before)] == before
    assert after[len(before):] == addition
    assert after.count(title) == 1
    result = dict(time=stamp, path=str(target), before_bytes=len(before), after_bytes=len(after), before_sha256=hashlib.sha256(before).hexdigest(), after_sha256=hashlib.sha256(after).hexdigest(), original_prefix_preserved=True, sections_added=1)
(O / 'changelog-append.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('变更记录仅追加一节，原前缀逐字节保持，未在根仓库提交')
