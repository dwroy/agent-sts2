"""Freeze actual Git/source observations around the unchanged production experience consumer."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

OUT=Path(__file__).resolve().parent
SOURCES=['agent/src/knowledge/files.ts','agent/src/knowledge/experience.ts','agent/src/knowledge/render/data.ts','agent/src/knowledge/render/experience-text.ts','agent/src/reflex/rollout.ts','agent/src/reflex/rollout-live.ts']

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def save(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def git(root,*args):return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()
def snapshot(root):
    return {'root':str(root),'head':git(root,'rev-parse','HEAD'),'tree':git(root,'rev-parse','HEAD^{tree}'),'experience_sha256':sha(root/'knowledge/characters/silent/experience.json'),'source_files':[{'path':p,'sha256':sha(root/p)} for p in SOURCES]}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,required=True);parser.add_argument('--label',required=True);parser.add_argument('--expected-head');parser.add_argument('--expected',type=Path);args=parser.parse_args()
    root=args.root.resolve();label=args.label
    assert '/' not in label and label not in ['.','..']
    command_path=OUT/f'{label}-command.json';assert not command_path.exists(),'Preserve the previous actual probe; use a new label.'
    observation=snapshot(root)
    if args.expected_head:assert observation['head']==args.expected_head
    observation['at']=dt.datetime.now(dt.timezone.utc).isoformat()
    observation_path=OUT/f'{label}-observation-before.json';save(observation_path,observation)
    payload=json.loads((args.expected or OUT/'candidate-experience-objects.json').read_text())
    payload.update(request_id='roy-20261017-human-pace-h0',revision=1,input_sha256='982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54',expected_head=observation['head'],expected_tree=observation['tree'],observation_file=str(observation_path),observation_sha256=sha(observation_path))
    input_path=OUT/f'{label}-input.json';save(input_path,payload)
    output_path=OUT/f'{label}-output.json';guard_path=OUT/f'{label}-read-guard.json';log_path=OUT/f'{label}.log'
    argv=['nice','-n','19','node','--import',str(root/'agent/node_modules/tsx/dist/loader.mjs'),'--import',str(OUT/'input-read-guard.mjs'),str(OUT/'consumer-v2.mts'),str(root),str(input_path),str(output_path)]
    env={**os.environ,'PATH':str(Path.home()/'.local/node/bin')+':'+os.environ['PATH'],'TMPDIR':str(OUT),'CHARACTER':'silent','H0_READ_GUARD_OUT':str(guard_path)}
    with log_path.open('w') as handle:result=subprocess.run(argv,cwd=root,env=env,stdout=handle,stderr=subprocess.STDOUT)
    after=snapshot(root);save(OUT/f'{label}-observation-after.json',after)
    command={'argv':argv,'cwd':str(root),'exit':result.returncode,'observation_before':str(observation_path),'observation_after':str(OUT/f'{label}-observation-after.json'),'original_consumer_failure_retained':'candidate-consumer.log: Node spawnSync git EPERM after status0; business assertions unchanged in consumer-v2.mts'}
    save(command_path,command)
    if result.returncode:return result.returncode
    assert {k:v for k,v in observation.items() if k!='at'}==after,'Git, experience or source changed during consumer readback'
    output=json.loads(output_path.read_text());assert output['status']=='passed' and len(output['checks'])==len(payload['entries'])==10
    for item in output['checks']:
        digest=hashlib.sha256(json.dumps(item['entry'],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();assert digest==item['sha256']
    guard=json.loads(guard_path.read_text())
    assert any(r['path']==str(root/'knowledge/characters/silent/experience.json') and r['status']=='read' and r['sha256']==after['experience_sha256'] for r in guard)
    print(json.dumps({'status':'passed','root':str(root),'head':after['head'],'tree':after['tree'],'experience_version':output['experience_version'],'entries':len(output['checks']),'input':str(input_path),'output':str(output_path),'command':str(command_path)}))
    return 0

if __name__=='__main__':sys.exit(main())
