import json,os,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';source=sys.argv[1];branch=sys.argv[2];result=dict(source=source,branch=branch,merged=None,refresh=None,before=None,after_test=None)
def git(*args,check=True):
 p=subprocess.run(['git','-C',str(LIVE),*args],text=True,capture_output=True)
 if check and p.returncode:raise RuntimeError(p.stdout+p.stderr)
 return p

def save(reason):
 result['reason']=reason;(O/'live-merge.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(reason,flush=True)
try:
 while subprocess.run(['pgrep','-f','knowledge/builders/buil[d]-'],stdout=subprocess.DEVNULL).returncode==0:
  subprocess.run(['sleep','10'],check=True)
 result['before']=git('rev-parse','HEAD').stdout.strip()
 staged=git('diff','--cached','--name-only').stdout.splitlines()
 if staged:save('live已有并行暂存，停止避免提交无关文件：'+','.join(staged));sys.exit(0)
 git('add','--','notes/fight-value-backtest.md','knowledge')
 staged=git('diff','--cached','--name-only').stdout.splitlines()
 if staged:
  diff=git('diff','--cached','--binary').stdout
  scan=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=diff,text=True,capture_output=True)
  (O/'gitleaks-live-refresh.log').write_text(scan.stdout+scan.stderr)
  if scan.returncode:save('live刷新扫描未通过，原数据保留');sys.exit(0)
  git('commit','-m','Refresh knowledge data','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
  result['refresh']=git('rev-parse','HEAD').stdout.strip()
 result['before']=git('rev-parse','HEAD').stdout.strip();base=git('merge-base',result['before'],source).stdout.strip();result['base']=base
 parent=git('rev-parse',source+'^').stdout.strip();result['source_parent']=parent
 right=set(git('diff','--name-only',parent,source).stdout.splitlines());result['task_change_paths']=sorted(right)
 def oid(commit,path):return git('rev-parse',commit+':'+path,check=False).stdout.strip()
 overlap=[p for p in sorted(right) if (p.startswith('knowledge/') or p=='notes/fight-value-backtest.md') and oid(result['before'],p) not in [oid(parent,p),oid(source,p)]]
 result['knowledge_overlap']=overlap
 if overlap:save('锁内发现并行刷新知识与本分支不同blob重叠，按任务停止、不覆盖：'+','.join(overlap));sys.exit(0)
 tree=git('merge-tree','--write-tree','--messages',result['before'],source,check=False);(O/'merge-tree-locked.txt').write_text(tree.stdout+tree.stderr)
 if tree.returncode:
  lines=tree.stdout.splitlines();result['precheck_conflicts']=[s for s in lines if s.startswith('CONFLICT')]
  save('锁内合并预检冲突，按任务停止、不硬解');sys.exit(0)
 p=git('merge','--no-edit',branch,'-m',"Merge branch '"+branch+"' into live\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>",check=False);(O/'merge-live.log').write_text(p.stdout+p.stderr)
 if p.returncode:
  git('merge','--abort',check=False);save('实际合并冲突已中止，保留刷新与并行数据');sys.exit(0)
 result['merged']=git('rev-parse','HEAD').stdout.strip();save('已实际合入，开始原沙箱入口测试')
 env=dict(os.environ,TMPDIR=str(O),PATH=str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],SANDBOX_WORKERS='1',NODE_COMPILE_CACHE=str(O/'node-compile-cache'),npm_config_cache=str(O/'npm-cache'))
 with (O/'test-live.log').open('w') as h:p=subprocess.run(['bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=env,stdout=h,stderr=subprocess.STDOUT)
 result['after_test']=p.returncode;(O/'test-live.rc').write_text(str(p.returncode)+'\n')
 if p.returncode:
  with (O/'test-live-retry.log').open('w') as h:p=subprocess.run(['bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=env,stdout=h,stderr=subprocess.STDOUT)
  result['after_test_retry']=p.returncode
  if p.returncode:
   git('reset','--hard',result['before']);result['rolled_back']=result['merged'];result['merged']=None;save('合后原入口测试两次失败，已回退至刷新后提交');sys.exit(0)
 subprocess.run(['python3',str(O/'publish.py'),source,result['merged']],check=True)
 result['publication']=json.load(open(O/'publication.json'))
 save('实际合入且合后原沙箱测试通过；唯一版本、上线记录和双通知已登记')
except Exception as e:
 save('合入流程受阻：'+str(e));sys.exit(1)
