import json,os,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';source,branch=sys.argv[1:3];result=dict(source=source,branch=branch,merged=None,refresh=None,before=None,after_test=None)
def git(*args,check=True):
 p=subprocess.run(['git','-C',str(LIVE),*args],text=True,capture_output=True)
 if check and p.returncode:raise RuntimeError(p.stdout+p.stderr)
 return p

def save(reason):
 result['reason']=reason;(O/'live-merge.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(reason,flush=True)
try:
 while subprocess.run(['pgrep','-f','knowledge/builders/buil[d]-'],stdout=subprocess.DEVNULL).returncode==0:
  print('等待后台知识刷新结束',flush=True);subprocess.run(['sleep','10'],check=True)
 if git('diff','--cached','--name-only').stdout.strip():save('live已有并行暂存，停止避免提交无关文件');sys.exit(0)
 result['before']=git('rev-parse','HEAD').stdout.strip();git('add','--','notes/fight-value-backtest.md','knowledge')
 if git('diff','--cached','--name-only').stdout.strip():
  p=subprocess.run(['gitleaks','stdin','--no-banner','--redact'],input=git('diff','--cached','--binary').stdout,text=True,capture_output=True);(O/'gitleaks-live-refresh.log').write_text(p.stdout+p.stderr)
  if p.returncode:save('刷新补丁gitleaks失败，保留数据停止');sys.exit(0)
  p=git('commit','-m','Refresh knowledge data','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>');(O/'refresh-commit.log').write_text(p.stdout+p.stderr);result['refresh']=git('rev-parse','HEAD').stdout.strip()
 result['before']=git('rev-parse','HEAD').stdout.strip();parent=git('rev-parse',source+'^').stdout.strip();result['source_parent']=parent;right=git('diff','--name-only',parent,source).stdout.splitlines();result['task_change_paths']=right
 def oid(commit,path):return git('rev-parse',commit+':'+path,check=False).stdout.strip()
 overlap=[p for p in right if p.startswith('knowledge/') and oid(result['before'],p) not in [oid(parent,p),oid(source,p)]];result['knowledge_overlap']=overlap
 if overlap:save('刷新知识与本次修改不同blob重叠，按任务停止、不覆盖：'+','.join(overlap));sys.exit(0)
 p=git('merge-tree','--write-tree','--messages',result['before'],source,check=False);(O/'merge-tree-locked.txt').write_text(p.stdout+p.stderr)
 if p.returncode:
  result['precheck_conflicts']=[s for s in p.stdout.splitlines() if s.startswith('CONFLICT')];save('锁内合并预检冲突，按任务停止、不硬解');sys.exit(0)
 p=git('merge','--no-edit',branch,'-m',"Merge branch '"+branch+"' into live\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>",check=False);(O/'merge-live.log').write_text(p.stdout+p.stderr)
 if p.returncode:
  git('merge','--abort',check=False);save('实际合并受阻，已中止，保留刷新与并行数据');sys.exit(0)
 result['merged']=git('rev-parse','HEAD').stdout.strip();save('已实际合入，开始原沙箱入口测试')
 env=dict(os.environ,TMPDIR=str(O),PATH=str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],SANDBOX_WORKERS='1',NODE_COMPILE_CACHE=str(O/'node-compile-cache'),npm_config_cache=str(O/'npm-cache'))
 with (O/'test-live.log').open('w') as h:p=subprocess.run(['bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=env,stdout=h,stderr=subprocess.STDOUT)
 result['after_test']=p.returncode;(O/'test-live.rc').write_text(str(p.returncode)+'\n')
 if p.returncode:
  result['failed_merge']=result['merged'];p=git('reset','--merge',result['before'],check=False);(O/'rollback.log').write_text(p.stdout+p.stderr)
  if p.returncode:save('合后测试失败；保留并行变更的回退受阻，交运维续办');sys.exit(1)
  result['merged']=None;save('合后测试失败，已回退刷新后提交，保留本地并行差异');sys.exit(0)
 subprocess.run(['python3',str(O/'publish.py'),source,result['merged']],check=True);result['publication']=json.load(open(O/'publication.json'));save('已实际合入、合后沙箱通过，唯一版本/上线记录/双通知已登记')
except Exception as e:
 save('合入流程受阻：'+str(e));sys.exit(1)
