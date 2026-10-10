"""Commit retained original logs and verify the complete immutable evidence chain."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-001303-boss-calibration-closeout'

def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()

def write(name,value):
    (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=1)+'\n')

assert (HERE/'archive-sandbox.exit').read_text().strip() == '0'
assert (HERE/'source-gitleaks.exit').read_text().strip() == '0'
source = (HERE/'source-commit.txt').read_text().strip()
assert git('rev-parse','HEAD') == source
log = (HERE/'archive-sandbox.log').read_text()
files = sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log)))
cases = sum(map(int,re.findall(r'Tests\s+(\d+) passed',log)))
assert files == 265 and cases == 2681 and not re.search(r'(?:Test Files|Tests).*\d+ failed',log)
timestamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
(HERE/'archive-date.log').write_text(timestamp+'\n')
receipt = json.loads((HERE/'index-archive-integrity.json').read_text())
receipt.update({'date':timestamp,'source_sandbox':{'tsc':0,'vitest':0,'files':265,'cases':2681},
                'archive_sandbox':{'tsc':0,'vitest':0,'files':files,'cases':cases},
                'reason':'The first candidate commit omitted 13 ignored .log files. This append-only evidence commit includes the unchanged originals; all 85 manifest references have matching staged bytes.'})
write('archive-seal-receipt.json',receipt)
for name in ['archive-seal-receipt.json','archive-sandbox.log','archive-sandbox.exit','archive-date.log','complete-archive.py']:
    shutil.copyfile(HERE/name,CLOSEOUT/name)
with (ROOT/'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f'\n- {timestamp} {HERE.name}归档补全：候选源{source}已提交；13份被默认忽略的原始日志显式纳入，85项manifest引用逐字节SHA核验通过；第二次提交前原固定沙箱tsc0、{files}文件{cases}例通过。纯证据封存，不改校准数值/生产代码/策略/版本，silent-0393仍proposed；实际live合入和发布树仍为空，原未完成合并阻塞保持。\n')
subprocess.run(['git','add','-f','--',str(CLOSEOUT.relative_to(ROOT)), 'paper/materials/decision-log.md'],cwd=ROOT,check=True)
paths = git('diff','--cached','--name-only').splitlines()
artifact = (HERE/'artifact.txt').read_text().strip()
assert all(p == 'paper/materials/decision-log.md' or p.startswith(('experiments/boss-sim/silent/'+artifact+'/',str(CLOSEOUT.relative_to(ROOT))+'/')) for p in paths)
scan = HERE/'scan-archive'; scan.mkdir()
for name in paths:
    dest = scan/name; dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(subprocess.check_output(['git','show',':'+name],cwd=ROOT))
with (HERE/'archive-gitleaks.log').open('w') as out:
    r = subprocess.run(['nice','-n','19','gitleaks','dir',str(scan),'--redact','--no-banner','--report-format','json',
                        '--report-path',str(HERE/'archive-gitleaks.json')],stdout=out,stderr=subprocess.STDOUT)
(HERE/'archive-gitleaks.exit').write_text(str(r.returncode)+'\n'); assert r.returncode == 0
# Preserve original test output, including the runner's final blank line.
subprocess.run(['git','diff','--cached','--check','--','.',
                ':(exclude)**/source-sandbox.log',':(exclude)**/archive-sandbox.log'],cwd=ROOT,check=True)
r = subprocess.run(['git','commit','-m',
    'Preserve complete Silent calibration evidence logs\n\n'
    'Include the 13 unchanged originals referenced by the candidate manifests.\n'
    'Verify all 85 references and repeat the required precommit sandbox checks.\n\n'
    'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'],cwd=ROOT,capture_output=True,text=True)
(HERE/'archive-commit.log').write_text(r.stdout+r.stderr); assert r.returncode == 0,r.stderr
commit,tree = git('rev-parse','HEAD'),git('rev-parse','HEAD^{tree}')
(HERE/'archive-commit.txt').write_text(commit+'\n')
with (HERE/'check-live-archive.log').open('w') as out:
    check = subprocess.run(['python3',str(HERE/'check-live.py'),source],stdout=out,stderr=subprocess.STDOUT)
(HERE/'check-live-archive.exit').write_text(str(check.returncode)+'\n')
state = json.loads((HERE/'live-release-state.json').read_text())
assert state.get('blocked'), 'Live is now available: continue the authorized publication workflow'
assert state['merged'] is None
timestamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
update = {'id':'silent-0393','by':'learner:fix-batch','status':'proposed','where':{'commits':[commit]},
          'note':f'{HERE.name}追加证据封存{commit}，候选数据源{source}；85项manifest引用完整可取且SHA一致，两次固定沙箱均265文件2681例/tsc通过，密钥扫描通过。锁内live仍有他人未完成合并，未发布/无新版本；仅proposed。'}
write('ledger-archive-update.json',update)
r = subprocess.run(['python3',str(PROJECT/'learner/ledger.py'),'update'],input=json.dumps(update,ensure_ascii=False),capture_output=True,text=True)
(HERE/'ledger-archive-update.log').write_text(r.stdout+r.stderr); assert r.returncode == 0,r.stderr
with (HERE/'ledger-archive-check.log').open('w') as out:
    r = subprocess.run(['python3',str(PROJECT/'learner/ledger.py'),'check'],stdout=out,stderr=subprocess.STDOUT)
(HERE/'ledger-archive-check.exit').write_text(str(r.returncode)+'\n'); assert r.returncode == 0
result = json.loads((HERE/'result.json').read_text())
result.update({'commits':[source,commit],'completion_commit':commit,'completion_tree':tree,'observed_live':state,
               'archive_integrity':receipt})
result['tests'].update({'archive_sandbox':{'tsc':0,'vitest':0,'files':files,'cases':cases},'archive_gitleaks':0})
write('result.json',result)
with (HERE/'report.md').open('a') as out:
    out.write(f'\n## 完整归档回执\n\n{timestamp}：候选源{source}；原件封存提交{commit}、最终候选树{tree}。13份默认忽略日志以原字节显式加入，85项manifest引用已核。第二次提交前固定沙箱tsc/vitest0、{files}文件{cases}例及gitleaks0，原首轮检查保持。再次锁内live={state["initial_live"]}、他人MERGE_HEAD={state.get("pending_merge_head")}、{len(state.get("conflict_paths",[]))}冲突，实际合入/固定发布树/新版本均null；silent-0393已CLI关联两提交并保持proposed。\n')
assert not git('status','--porcelain')
write('final-verification.json',{'source':source,'commits':[source,commit],'completion_tree':tree,'worktree_clean':True,
                               'merged':None,'release_tree':None,'version':None,'ledger':['silent-0393'],'tests':result['tests']})
print(json.dumps({'source':source,'archive_commit':commit,'completion_tree':tree,'merged':None,'ledger':['silent-0393']},ensure_ascii=False))
