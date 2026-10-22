"""Independent #43 replay. Only one Vitest consumer is real; full runners are mocks."""
import hashlib, json, os
from pathlib import Path
import subprocess, sys, tempfile
W=Path(os.environ['REVIEW_WORKTREE']).resolve()
O=Path(os.environ['REVIEW_OUTPUT']).resolve(); O.mkdir(parents=True,exist_ok=False)
assert O.is_relative_to(W)
(O/'tmp').mkdir(); tempfile.tempdir=str(O/'tmp')
sys.path.insert(0,str(W/'ops/tests'))
from test_release_order import ReleaseOrder
import release_plan as plan
result={'source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip(),
        'full_commands_mocked':True,'actual_vitest_scope':'one imported-module.test.ts','cases':{}}
def fixture():
 c=ReleaseOrder('test_untracked_runtime_cannot_hide_outside_tree_fingerprint');c.setUp();return c
c=fixture()
try:
 (c.root/'agent/node_modules').symlink_to((W/'agent/node_modules').resolve(),target_is_directory=True)
 wrapper='agent/tests/imported-module.test.ts'
 (c.root/wrapper).write_text('import {it,expect} from "vitest";\nimport {fixed} from "./runtime-helper.mts";\nit("uses actual module",()=>expect(fixed).toBe(1));\n')
 c.git('add',wrapper);c.manifest=c.make_plan();v=json.loads(c.manifest.read_text())
 v['deliveries'][wrapper]={'value':plan.file_value(c.root,wrapper),'preimage':None};c.manifest.write_text(json.dumps(v))
 module=c.root/'agent/tests/runtime-helper.mts';module.write_text('export const fixed = 1;\n');module.chmod(0o644)
 def real(label):
  with (O/(label+'.log')).open('wb') as log:
   return subprocess.run(['nice','-n','19','node',str(W/'agent/node_modules/vitest/vitest.mjs'),'run','tests/imported-module.test.ts','--pool=forks','--maxWorkers=1','--no-file-parallelism'],cwd=c.root/'agent',stdout=log,stderr=subprocess.STDOUT,timeout=45,env={**os.environ,'NO_COLOR':'1'}).returncode
 before=real('consumer-before');sha1=hashlib.sha256(module.read_bytes()).hexdigest()
 try:plan.inventory(c.root);rejected=False
 except ValueError as e:rejected='untracked' in str(e)
 first=c.check();(O/'module-present-initial.json').write_bytes(c.first.read_bytes())
 module.write_text('export const fixed = 2;\n');after=real('consumer-after')
 result['cases']['original_module_present']={'consumer_before_rc':before,'consumer_after_rc':after,'inventory_rejected':rejected,'initial_gate_rc':first,'mock_command_count':len(c.calls),'before_sha256':sha1,'after_sha256':hashlib.sha256(module.read_bytes()).hexdigest()}
 assert before==0 and after==1 and rejected and first==1 and not c.calls
finally:c.doCleanups()
for kind in ('exact','data'):
 c=fixture()
 try:
  assert c.check()==0
  original=c.first.read_bytes(); count=len(c.calls)
  (O/(kind+'-synthetic-origin.json')).write_bytes(original)
  if kind=='data':c.rebase_data()
  (c.root/'agent/tests/runtime-helper.mts').write_text('export const fixed = 2;\n')
  output=c.root/'.state/rejected.json';rc=c.check(output,reuse=c.first);v=json.loads(output.read_text())
  (O/(kind+'-rejected.json')).write_bytes(output.read_bytes())
  row={'gate_rc':rc,'state':v['state'],'mode':v.get('mode'),'extra_mock_commands':len(c.calls)-count,'original_unchanged':c.first.read_bytes()==original}
  result['cases'][kind]=row
  assert rc==1 and row['state']=='failed-retain-original' and row['mode'] is None and row['extra_mock_commands']==0 and row['original_unchanged']
 finally:c.doCleanups()
(O/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
