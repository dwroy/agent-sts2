import fcntl, hashlib, json, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');W=O.parents[2]
source=(O/'source-commit.txt').read_text().strip();T=json.load(open(O/'test-results.json'))
L=json.load(open(O/'ledger-results.json'));Z=json.load(open(O/'live-merge.json'))
U=json.load(open(O/'update-summary.json'));E=json.load(open(W/'knowledge/characters/silent/experience.json'))
P=json.load(open(O/'proposal-ids.json'));F=json.load(open(O/'mechanisms.json'))
assert T['tsc']==T['vitest']==0 and T['snapshot_unchanged']
assert int((O/'ledger-final-check.rc').read_text())==0
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()==source
assert subprocess.check_output(['git','show',source+':knowledge/characters/silent/experience.json'],cwd=W)==(W/'knowledge/characters/silent/experience.json').read_bytes()
assert subprocess.check_output(['git','status','--porcelain'],cwd=W,text=True).strip()==''
heading=(O/'changelog-heading.txt').read_text().strip();section=(O/'changelog-section.md').read_bytes()
target=ROOT/'paper/materials/experience-changelog-silent.md'
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
assert source[:8] in heading and '待提交' not in heading
scan=subprocess.run(['nice','-n','19','gitleaks','stdin','--redact','--no-banner'],input=section,capture_output=True)
(O/'gitleaks-records-final.log').write_bytes(scan.stdout+scan.stderr)
assert scan.returncode==0
receipt=O/'changelog-append.json'
assert not receipt.exists(),'完成回执已存在，停止避免重复追加'
with target.open('a+b') as h:
    fcntl.flock(h,fcntl.LOCK_EX);h.seek(0);before=h.read()
    assert heading.encode() not in before
    addition=(b'\n' if before.endswith(b'\n') else b'\n\n')+section
    h.seek(0,2);h.write(addition);h.flush();h.seek(0);after=h.read()
    assert after[:len(before)]==before and after[len(before):]==addition
    value=dict(time=stamp,heading=heading,before_bytes=len(before),after_bytes=len(after),before_sha256=hashlib.sha256(before).hexdigest(),after_sha256=hashlib.sha256(after).hexdigest(),section_sha256=hashlib.sha256(section).hexdigest(),preserved_prefix=True)
    receipt.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
result=dict(task='experience-update',version=E['version'],commit=source,merged=Z.get('merged'),added=U['added'],updated=U['updated'],retired=U['retired'],active=U['after']['active'],mechanisms=[x['name'] for x in F],tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=dict(added=L['added'],proposed=L['proposed'],retired=L['retired'],check=0),code_proposals=P,implementation_domains=['combat','potion','sl','terminal','structure'],report=str(O/'report.md'))
(O/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
