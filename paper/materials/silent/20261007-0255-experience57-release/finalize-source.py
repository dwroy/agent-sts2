import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];EXP=ROOT/'.worktrees/exp';P='knowledge/characters/silent/experience.json';C=json.load(open(O/'changes.json'))
assert (O/'test-source-final.rc').read_text().strip()=='0'
def git(*args):return subprocess.check_output(['git','-C',str(EXP),*args],text=True).strip()
if git('hash-object',P)!=(O/'tested-source-blob.txt').read_text().strip():
    (O/'test-source-final.log').rename(O/'test-source-pre-number-fix.log')
    (O/'test-source-final.rc').rename(O/'test-source-pre-number-fix.rc')
    (O/'tested-source-blob.txt').rename(O/'tested-source-pre-number-fix-blob.txt')
    (O/'tested-source-blob.txt').write_text(git('hash-object',P)+'\n')
    with (O/'test-source-final.log').open('w') as h:
        result=subprocess.run(['bash','agent/tools/test-sandbox.sh'],cwd=EXP,stdout=h,stderr=subprocess.STDOUT)
    (O/'test-source-final.rc').write_text(str(result.returncode)+'\n')
    assert result.returncode==0
    C=json.load(open(O/'changes.json'))
assert git('hash-object',P)==(O/'tested-source-blob.txt').read_text().strip()
assert len(C['updated'])==19 and C['only_numbers']==1

assert not git('diff','--cached','--name-only')
assert git('diff','--name-only').splitlines()==[P]
assert not git('ls-files','--others','--exclude-standard')
git('diff','--check');json.load(open(EXP/P));git('add',P);patch=O/'source-staged.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-source-staged.log').open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Update Silent experience 2026-10-07.3: add 1, update 19, retire 0','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>');commit=git('rev-parse','HEAD');(O/'commit.txt').write_text(commit+'\n');assert not git('status','--short')
subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
title=f'2026-10-07 静默猎手 第五十七次增量：2 局 A10（version 2026-10-07.3，分支 exp-silent，{commit[:8]}）';(O/'changelog-title.txt').write_text(title+'\n')
for name in ['ledger-update','changelog']:
 with (O/(name+'-run.log')).open('w') as h:subprocess.run(['nice','-n','19','python3',str(O/(name+'.py'))],stdout=h,stderr=subprocess.STDOUT,check=True)
with (O/'gitleaks-changelog.log').open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/'changelog-section.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
print('源提交、账本、变更记录完成',commit,flush=True)
