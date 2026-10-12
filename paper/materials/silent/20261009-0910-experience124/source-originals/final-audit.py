import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
W=O.parents[2]
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
result=json.load(open(O/'report.json'))
merge=json.load(open(O/'live-merge.json'))
append=json.load(open(O/'changelog-append.json'))
source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip()
assert source==result['commit']
assert subprocess.check_output(['git','status','--porcelain'],cwd=W,text=True)==''
assert subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',source],cwd=W,text=True).splitlines()==['knowledge/characters/silent/experience.json']
experience=(W/'knowledge/characters/silent/experience.json').read_bytes()
assert subprocess.check_output(['git','show',source+':knowledge/characters/silent/experience.json'],cwd=W)==experience
after=json.loads(experience);before=json.load(open(O/'experience-before.json'))
old={e['id']:e for e in before['entries']}
changes=[e for e in after['entries'] if old[e['id']]!=e]
assert len(changes)==result['updated']==8
active=[e for e in after['entries'] if e['status']=='active']
assert len(active)==result['active']==193
assert sum(len(e['lesson']) for e in active)==51884
live_head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=LIVE,text=True).strip()
ancestor=subprocess.run(['git','merge-base','--is-ancestor',source,live_head],cwd=LIVE).returncode==0
if merge['merged'] is None:
    assert not ancestor
    assert subprocess.check_output(['git','rev-parse','HEAD:knowledge/characters/silent/experience.json'],cwd=LIVE,text=True).strip()==subprocess.check_output(['git','rev-parse',merge['pre']+':knowledge/characters/silent/experience.json'],cwd=LIVE,text=True).strip()
else:
    assert ancestor and merge['tests']==0
changelog=(ROOT/'paper/materials/experience-changelog-silent.md').read_bytes()
prefix=append['before_size']
assert hashlib.sha256(changelog[:prefix]).hexdigest()==append['before_sha256']
section=(O/'changelog-section.md').read_bytes()
assert changelog[prefix:prefix+append['bytes_added']]==b'\n'+section
assert changelog.count(append['heading'].encode())==1
checks=[['python3',str(ROOT/'learner/ledger.py'),'check'],['python3',str(ROOT/'learner/code_proposals.py'),'check-experience','--character','silent','--before',str(O/'experience-before.json'),'--after',str(W/'knowledge/characters/silent/experience.json')]]
for i,command in enumerate(checks):
    check=subprocess.run(command,cwd=W,text=True,capture_output=True)
    (O/('final-cli-'+str(i)+'.log')).write_text(check.stdout+check.stderr)
    assert check.returncode==0
audit=dict(source=source,source_clean=True,only_experience=True,changed=8,active=len(active),chars=51884,live=live_head,actual_live_ancestor=ancestor,merged=merge['merged'],changelog_append_only=True,ledger=0,code_proposals=0,gitleaks=0)
(O/'final-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(audit,ensure_ascii=False))
