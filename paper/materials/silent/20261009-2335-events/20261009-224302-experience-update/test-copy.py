import hashlib
import json
import shutil
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
EXP=O.parents[2]
COPY=O/'test-checkout'
COPY.mkdir(exist_ok=True)
files=subprocess.check_output(['git','ls-files','-z'],cwd=EXP).decode().split('\0')
manifest=[]
for name in files:
    if not name:continue
    if name.startswith('third_party/') or name=='.gitmodules':continue
    if not (name.startswith(('agent/','learner/','eval/','ops/','docs/')) or name in ['README.md','AGENTS.md','.gitignore','package.json']):continue
    if name.endswith('.env') or Path(name).name=='.env':continue
    source=EXP/name
    if not source.is_file():continue
    dest=COPY/name;dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,dest)
    shutil.copymode(source,dest)
    digest=hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest==hashlib.sha256(dest.read_bytes()).hexdigest()
    manifest.append(dict(file=name,sha256=digest))
for name in ['knowledge','logs','data','notes','paper','third_party','.git']:
    dest=COPY/name
    if not dest.exists():dest.symlink_to(EXP/name,target_is_directory=(EXP/name).is_dir())
node=COPY/'agent/node_modules'
if not node.exists():node.symlink_to((EXP/'agent/node_modules').resolve(),target_is_directory=True)
(O/'test-copy-manifest.json').write_text(json.dumps(dict(files=manifest,linked=['knowledge','logs','data','notes','paper','third_party','.git','agent/node_modules'],excluded='仅忽略的历史learner/runs输出不进入源码扫描；跟踪代码逐字节相同，experience/其他知识为同文件，只读测试。'),ensure_ascii=False,indent=2)+'\n')
print('隔离测试副本',len(manifest),'跟踪源码/任务文件SHA一致，原排除脚本字节一致')
