import fcntl
import hashlib
import json
import os
from pathlib import Path

O=Path(__file__).parent.resolve()
target=Path('/home/dw/Projects/agent-sts2/paper/materials/experience-changelog-silent.md')
before=json.load(open(O/'changelog-before.json'))
title=(O/'changelog-title.txt').read_text().strip()
section=(O/'changelog-section.md').read_text()
assert section.startswith('## '+title+'\n')
with target.open('a+b') as h:
    fcntl.flock(h,fcntl.LOCK_EX)
    h.seek(0)
    existing=h.read()
    assert hashlib.sha256(existing[:before['bytes']]).hexdigest()==before['sha256'], '历史前缀改变，停止'
    assert ('## '+title).encode() not in existing, '本节已存在，停止防止重复'
    start=len(existing)
    addition=('\n'+section).encode()
    h.seek(0,os.SEEK_END)
    h.write(addition)
    h.flush()
    os.fsync(h.fileno())
    h.seek(0)
    after=h.read()
    assert after[:start]==existing
    assert after[start:]==addition
    assert after.count(('## '+title).encode())==1
(O/'changelog-append.json').write_text(json.dumps({'file':str(target),'bytes_before':start,'added_bytes':len(addition),'sha256_before':hashlib.sha256(existing).hexdigest(),'sha256_after':hashlib.sha256(after).hexdigest(),'title':title,'prefix_preserved':True,'sections_added':1},ensure_ascii=False,indent=2)+'\n')
print('只追加一节，历史前缀保持，根仓库未提交')
