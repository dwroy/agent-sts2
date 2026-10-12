import json
import os
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
source=(O/'commit.txt').read_text().strip()
os.environ['TMPDIR']=str(O)
os.environ['PATH']=str(Path.home()/'.local/node/bin')+':'+os.environ['PATH']
os.environ.pop('CHARACTER',None)
os.environ['SANDBOX_WORKERS']='1'
M=dict(source_commit=source,branch='exp-silent',merged=None,test_rc=None)

def run(*args,check=True):
    p=subprocess.run(['git',*args],cwd=LIVE,capture_output=True,text=True)
    if check and p.returncode:raise RuntimeError(p.stdout+p.stderr)
    return p

def git(*args):return run(*args).stdout.strip()
def save():(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
def stop(reason):
    M['reason']=reason;save();print(reason,flush=True);raise SystemExit(3)
def blob(ref,path):return git('rev-parse',ref+':'+path)
def scan(name,patch):
    p=O/(name+'.patch');p.write_text(patch+'\n')
    with (O/('gitleaks-'+name+'.log')).open('w') as h:
        subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(p)],stdout=h,stderr=subprocess.STDOUT,check=True)

assert (O/'test-source.rc').read_text().strip()=='0'
assert git('rev-parse','exp-silent')==source
assert git('rev-parse',source+':knowledge/characters/silent/experience.json')==(O/'source-tested-blob.txt').read_text().strip(), '源提交须与最终已测经验blob一致'
assert json.load(open(O/'ledger-result.json'))['check']==0, '须先完成账本登记'
M['initial_head']=git('rev-parse','HEAD')
if run('rev-parse','-q','--verify','MERGE_HEAD',check=False).returncode==0:stop('live已有未完成合并，停止')
if git('diff','--cached','--name-only'):stop('live已有他人暂存改动，停止')
fork=git('merge-base','HEAD',source)
incoming=set(git('diff','--name-only',fork,source,'--','knowledge').splitlines())
M.update(fork=fork,incoming=sorted(incoming),refresh=git('diff','--name-only','--','knowledge','notes/fight-value-backtest.md').splitlines())
git('add','notes/fight-value-backtest.md','knowledge')
if git('diff','--cached','--name-only'):
    scan('live-refresh',git('diff','--cached','--binary'))
    git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Refresh knowledge data','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
    M['refresh_commit']=git('rev-parse','HEAD')
M['base']=git('rev-parse','HEAD')
changed=set(git('diff','--name-only',fork,'HEAD','--','knowledge').splitlines())
overlap=incoming&changed
experience='knowledge/characters/silent/experience.json'
tested=git('hash-object',str(O/'experience-before.json'))
identical={p for p in overlap if blob('HEAD',p)==blob(source,p)}
predecessor={p for p in overlap if p==experience and blob('HEAD',p)==tested}
conflicting=overlap-identical-predecessor
M.update(overlap=sorted(overlap),identical_overlap=sorted(identical),tested_predecessor_overlap=sorted(predecessor),conflicting_overlap=sorted(conflicting));save()
if conflicting:stop('知识刷新与本分支不同blob重叠，停止、不覆盖')
if git('diff','--name-only','--','knowledge','notes/fight-value-backtest.md'):stop('后台刷新仍在写，停止')
M['knowledge_before']=git('ls-tree','-r','HEAD','knowledge')
preview=run('merge-tree','--write-tree','HEAD',source,check=False)
(O/'merge-tree-locked.txt').write_text(preview.stdout+preview.stderr)
M['preflight_rc']=preview.returncode;save()
if preview.returncode:stop('锁内预检有冲突，停止、不覆盖任何刷新或记录数据')
tree=preview.stdout.splitlines()[0]
assert blob(tree,experience)==blob(source,experience)
scan('live-preview',git('diff','--binary','HEAD',tree))
p=run('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','merge','--no-edit','exp-silent',check=False)
(O/'git-merge-live.log').write_text(p.stdout+p.stderr)
if p.returncode:
    if run('rev-parse','-q','--verify','MERGE_HEAD',check=False).returncode==0:git('merge','--abort')
    stop('实际合并受阻，已中止并保留刷新数据')
if len(git('rev-list','--parents','-n','1','HEAD').split())>2:
    git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','--amend','--no-edit','--trailer','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M['merged']=git('rev-parse','HEAD');save()
print('实际合入',M['merged'],'开始合后固定沙箱测试',flush=True)
with (O/'test-live.log').open('w') as h:
    p=subprocess.run(['bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',stdout=h,stderr=subprocess.STDOUT)
M['test_first_rc']=p.returncode;save()
if p.returncode:
    with (O/'test-live-retry.log').open('w') as h:
        p=subprocess.run(['bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',stdout=h,stderr=subprocess.STDOUT)
M['test_rc']=p.returncode;save()
if p.returncode:
    git('reset','--merge',M['base']);M['rolled_back_from']=M['merged'];M['merged']=None;stop('合后测试重跑仍失败，回退合前并保留刷新数据')
assert blob('HEAD',experience)==blob(source,experience)
before={r.split('\t')[1]:r.split()[2] for r in M['knowledge_before'].splitlines()}
after={r.split('\t')[1]:r.split()[2] for r in git('ls-tree','-r','HEAD','knowledge').splitlines()}
assert all(after[p]==v for p,v in before.items() if p not in incoming or p in identical)
M['untouched_knowledge_blobs_preserved']=True;save()
print('合后固定沙箱通过、其他知识blob保持',flush=True)
with (O/'publish.log').open('w') as h:
    subprocess.run(['nice','-n','19','python3',str(O/'publish.py')],stdout=h,stderr=subprocess.STDOUT,check=True)
